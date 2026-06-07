// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./MockERC20.sol";

/// @title RitswapStaking
/// @notice Stake RITUAL or any secondary token (SepoliaETH, BaseETH, USDT, USDC).
///         Rewards are issued in RITUAL at a configurable rate per block.
///         Each supported token has its own staking pool.
contract RitswapStaking {
    address public immutable rewardToken; // RITUAL — reward currency
    address public owner;

    /// @notice Reward rate per block per pool (in wei, denominated in RITUAL).
    uint256 public rewardRatePerBlock = 0.0001 ether;

    struct StakeInfo {
        uint256 amount;        // staked amount
        uint256 rewardDebt;    // reward already accounted for
        uint256 pendingReward; // accrued but unclaimed reward
        uint256 stakedAt;      // block number when staked / last updated
    }

    struct PoolInfo {
        address token;           // staked token address
        uint256 totalStaked;     // total tokens staked in pool
        uint256 accRitualPerShare; // accumulated RITUAL per share (scaled 1e12)
        uint256 lastRewardBlock; // last block rewards were distributed
    }

    PoolInfo[] public pools;
    // poolId => user => StakeInfo
    mapping(uint256 => mapping(address => StakeInfo)) public stakeInfo;
    // token => poolId (for lookup)
    mapping(address => uint256) public tokenToPool;
    mapping(address => bool) public poolExists;

    // ─── Events ───────────────────────────────────────────────────────────────
    event PoolAdded(uint256 indexed poolId, address indexed token);

    event Staked(
        address indexed user,
        uint256 indexed poolId,
        address indexed token,
        uint256 amount,
        bytes32 txHash
    );

    event Unstaked(
        address indexed user,
        uint256 indexed poolId,
        address indexed token,
        uint256 amount,
        uint256 reward,
        bytes32 txHash
    );

    event RewardClaimed(
        address indexed user,
        uint256 indexed poolId,
        uint256 reward,
        bytes32 txHash
    );

    // ─── Errors ───────────────────────────────────────────────────────────────
    error ZeroAmount();
    error PoolNotFound();
    error InsufficientStake();
    error NotOwner();

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    constructor(address _rewardToken) {
        rewardToken = _rewardToken;
        owner = msg.sender;
    }

    // ─── Admin ────────────────────────────────────────────────────────────────

    /// @notice Add a staking pool for a given token. Called during deployment for each supported token.
    function addPool(address token) external onlyOwner returns (uint256 poolId) {
        require(!poolExists[token], "pool exists");
        poolId = pools.length;
        pools.push(PoolInfo({
            token: token,
            totalStaked: 0,
            accRitualPerShare: 0,
            lastRewardBlock: block.number
        }));
        tokenToPool[token] = poolId;
        poolExists[token] = true;
        emit PoolAdded(poolId, token);
    }

    function setRewardRate(uint256 rate) external onlyOwner {
        _updateAll();
        rewardRatePerBlock = rate;
    }

    // ─── Staking ─────────────────────────────────────────────────────────────

    /// @notice Stake tokens into a pool.
    /// @param token Token to stake.
    /// @param amount Amount to stake.
    function stake(address token, uint256 amount) external {
        if (amount == 0) revert ZeroAmount();
        if (!poolExists[token]) revert PoolNotFound();

        uint256 poolId = tokenToPool[token];
        _updatePool(poolId);

        PoolInfo storage pool = pools[poolId];
        StakeInfo storage info = stakeInfo[poolId][msg.sender];

        // Harvest pending reward
        if (info.amount > 0) {
            uint256 pending = (info.amount * pool.accRitualPerShare / 1e12) - info.rewardDebt;
            info.pendingReward += pending;
        }

        MockERC20(token).transferFrom(msg.sender, address(this), amount);
        info.amount += amount;
        pool.totalStaked += amount;
        info.stakedAt = block.number;
        info.rewardDebt = info.amount * pool.accRitualPerShare / 1e12;

        emit Staked(msg.sender, poolId, token, amount, blockhash(block.number - 1));
    }

    /// @notice Unstake tokens and claim all rewards.
    /// @param token Token to unstake.
    /// @param amount Amount to unstake.
    function unstake(address token, uint256 amount) external {
        if (!poolExists[token]) revert PoolNotFound();
        uint256 poolId = tokenToPool[token];
        _updatePool(poolId);

        PoolInfo storage pool = pools[poolId];
        StakeInfo storage info = stakeInfo[poolId][msg.sender];

        if (info.amount < amount) revert InsufficientStake();

        uint256 pending = (info.amount * pool.accRitualPerShare / 1e12) - info.rewardDebt + info.pendingReward;

        info.amount -= amount;
        pool.totalStaked -= amount;
        info.pendingReward = 0;
        info.rewardDebt = info.amount * pool.accRitualPerShare / 1e12;

        MockERC20(token).transfer(msg.sender, amount);
        if (pending > 0) {
            MockERC20(rewardToken).transfer(msg.sender, pending);
        }

        emit Unstaked(msg.sender, poolId, token, amount, pending, blockhash(block.number - 1));
    }

    /// @notice Claim accrued RITUAL rewards without unstaking.
    function claimReward(address token) external {
        if (!poolExists[token]) revert PoolNotFound();
        uint256 poolId = tokenToPool[token];
        _updatePool(poolId);

        PoolInfo storage pool = pools[poolId];
        StakeInfo storage info = stakeInfo[poolId][msg.sender];

        uint256 pending = (info.amount * pool.accRitualPerShare / 1e12) - info.rewardDebt + info.pendingReward;
        if (pending > 0) {
            info.pendingReward = 0;
            info.rewardDebt = info.amount * pool.accRitualPerShare / 1e12;
            MockERC20(rewardToken).transfer(msg.sender, pending);
            emit RewardClaimed(msg.sender, poolId, pending, blockhash(block.number - 1));
        }
    }

    // ─── Views ────────────────────────────────────────────────────────────────

    function pendingReward(address token, address user) external view returns (uint256) {
        if (!poolExists[token]) return 0;
        uint256 poolId = tokenToPool[token];
        PoolInfo storage pool = pools[poolId];
        StakeInfo storage info = stakeInfo[poolId][user];
        if (info.amount == 0) return info.pendingReward;

        uint256 accPerShare = pool.accRitualPerShare;
        if (block.number > pool.lastRewardBlock && pool.totalStaked > 0) {
            uint256 blocks = block.number - pool.lastRewardBlock;
            uint256 reward = blocks * rewardRatePerBlock;
            accPerShare += (reward * 1e12) / pool.totalStaked;
        }
        return (info.amount * accPerShare / 1e12) - info.rewardDebt + info.pendingReward;
    }

    function getStakeInfo(address token, address user) external view returns (uint256 amount, uint256 pending) {
        if (!poolExists[token]) return (0, 0);
        uint256 poolId = tokenToPool[token];
        amount = stakeInfo[poolId][user].amount;
        pending = this.pendingReward(token, user);
    }

    function poolCount() external view returns (uint256) {
        return pools.length;
    }

    // ─── Internal ────────────────────────────────────────────────────────────

    function _updatePool(uint256 poolId) internal {
        PoolInfo storage pool = pools[poolId];
        if (block.number <= pool.lastRewardBlock) return;
        if (pool.totalStaked == 0) {
            pool.lastRewardBlock = block.number;
            return;
        }
        uint256 blocks = block.number - pool.lastRewardBlock;
        uint256 reward = blocks * rewardRatePerBlock;
        pool.accRitualPerShare += (reward * 1e12) / pool.totalStaked;
        pool.lastRewardBlock = block.number;
    }

    function _updateAll() internal {
        for (uint256 i = 0; i < pools.length; i++) {
            _updatePool(i);
        }
    }
}
