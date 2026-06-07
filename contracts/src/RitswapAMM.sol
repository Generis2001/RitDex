// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./MockERC20.sol";

/// @title RitswapAMM
/// @notice Constant-product AMM (x*y=k) for swapping between RITUAL and secondary tokens.
///         Supports: add/remove liquidity, swap tokenIn → RITUAL, swap RITUAL → tokenOut.
///         Secondary tokens: SepoliaETH, BaseETH, USDT, USDC (any MockERC20).
///         LP shares tracked per (user, token) pair.
contract RitswapAMM {
    address public immutable ritual;   // RITUAL token address
    uint256 public constant FEE_BPS = 30; // 0.30% swap fee

    struct Pool {
        uint256 ritualReserve;
        uint256 tokenReserve;
        uint256 totalShares;
    }

    // token => Pool
    mapping(address => Pool) public pools;
    // user => token => LP shares
    mapping(address => mapping(address => uint256)) public shares;

    // ─── Events ───────────────────────────────────────────────────────────────
    event LiquidityAdded(
        address indexed provider,
        address indexed token,
        uint256 ritualAmount,
        uint256 tokenAmount,
        uint256 sharesIssued,
        bytes32 indexed txHash
    );

    event LiquidityRemoved(
        address indexed provider,
        address indexed token,
        uint256 ritualOut,
        uint256 tokenOut,
        uint256 sharesBurned,
        bytes32 indexed txHash
    );

    event Swap(
        address indexed user,
        address indexed tokenIn,
        address indexed tokenOut,
        uint256 amountIn,
        uint256 amountOut,
        bytes32 txHash
    );

    // ─── Errors ───────────────────────────────────────────────────────────────
    error ZeroAmount();
    error InsufficientLiquidity();
    error InsufficientShares();
    error SlippageExceeded();
    error InvalidToken();

    constructor(address _ritual) {
        ritual = _ritual;
    }

    // ─── Liquidity ────────────────────────────────────────────────────────────

    /// @notice Add liquidity to a RITUAL/token pool.
    /// @param token Secondary token address.
    /// @param ritualAmount Amount of RITUAL to deposit.
    /// @param tokenAmount Amount of secondary token to deposit.
    /// @param minShares Minimum LP shares to receive (slippage guard).
    function addLiquidity(
        address token,
        uint256 ritualAmount,
        uint256 tokenAmount,
        uint256 minShares
    ) external returns (uint256 sharesIssued) {
        if (ritualAmount == 0 || tokenAmount == 0) revert ZeroAmount();

        Pool storage pool = pools[token];

        if (pool.totalShares == 0) {
            // First deposit — shares = sqrt(ritualAmount * tokenAmount)
            sharesIssued = _sqrt(ritualAmount * tokenAmount);
        } else {
            // Proportional to existing pool
            uint256 sharesByRitual = (ritualAmount * pool.totalShares) / pool.ritualReserve;
            uint256 sharesByToken = (tokenAmount * pool.totalShares) / pool.tokenReserve;
            sharesIssued = sharesByRitual < sharesByToken ? sharesByRitual : sharesByToken;
        }

        if (sharesIssued < minShares) revert SlippageExceeded();

        // Pull tokens
        MockERC20(ritual).transferFrom(msg.sender, address(this), ritualAmount);
        MockERC20(token).transferFrom(msg.sender, address(this), tokenAmount);

        pool.ritualReserve += ritualAmount;
        pool.tokenReserve += tokenAmount;
        pool.totalShares += sharesIssued;
        shares[msg.sender][token] += sharesIssued;

        emit LiquidityAdded(msg.sender, token, ritualAmount, tokenAmount, sharesIssued, blockhash(block.number - 1));
    }

    /// @notice Remove liquidity from a RITUAL/token pool.
    /// @param token Secondary token address.
    /// @param shareAmount LP shares to burn.
    /// @param minRitual Minimum RITUAL to receive (slippage guard).
    /// @param minToken Minimum secondary token to receive (slippage guard).
    function removeLiquidity(
        address token,
        uint256 shareAmount,
        uint256 minRitual,
        uint256 minToken
    ) external returns (uint256 ritualOut, uint256 tokenOut) {
        Pool storage pool = pools[token];
        if (shareAmount == 0) revert ZeroAmount();
        if (shares[msg.sender][token] < shareAmount) revert InsufficientShares();
        if (pool.totalShares == 0) revert InsufficientLiquidity();

        ritualOut = (shareAmount * pool.ritualReserve) / pool.totalShares;
        tokenOut = (shareAmount * pool.tokenReserve) / pool.totalShares;

        if (ritualOut < minRitual) revert SlippageExceeded();
        if (tokenOut < minToken) revert SlippageExceeded();

        pool.ritualReserve -= ritualOut;
        pool.tokenReserve -= tokenOut;
        pool.totalShares -= shareAmount;
        shares[msg.sender][token] -= shareAmount;

        MockERC20(ritual).transfer(msg.sender, ritualOut);
        MockERC20(token).transfer(msg.sender, tokenOut);

        emit LiquidityRemoved(msg.sender, token, ritualOut, tokenOut, shareAmount, blockhash(block.number - 1));
    }

    // ─── Swap ─────────────────────────────────────────────────────────────────

    /// @notice Swap secondary token → RITUAL.
    function swapTokenToRitual(
        address token,
        uint256 amountIn,
        uint256 minAmountOut
    ) external returns (uint256 amountOut) {
        if (amountIn == 0) revert ZeroAmount();
        Pool storage pool = pools[token];
        if (pool.ritualReserve == 0 || pool.tokenReserve == 0) revert InsufficientLiquidity();

        amountOut = _getAmountOut(amountIn, pool.tokenReserve, pool.ritualReserve);
        if (amountOut < minAmountOut) revert SlippageExceeded();

        MockERC20(token).transferFrom(msg.sender, address(this), amountIn);
        MockERC20(ritual).transfer(msg.sender, amountOut);

        pool.tokenReserve += amountIn;
        pool.ritualReserve -= amountOut;

        emit Swap(msg.sender, token, ritual, amountIn, amountOut, blockhash(block.number - 1));
    }

    /// @notice Swap RITUAL → secondary token.
    function swapRitualToToken(
        address token,
        uint256 amountIn,
        uint256 minAmountOut
    ) external returns (uint256 amountOut) {
        if (amountIn == 0) revert ZeroAmount();
        Pool storage pool = pools[token];
        if (pool.ritualReserve == 0 || pool.tokenReserve == 0) revert InsufficientLiquidity();

        amountOut = _getAmountOut(amountIn, pool.ritualReserve, pool.tokenReserve);
        if (amountOut < minAmountOut) revert SlippageExceeded();

        MockERC20(ritual).transferFrom(msg.sender, address(this), amountIn);
        MockERC20(token).transfer(msg.sender, amountOut);

        pool.ritualReserve += amountIn;
        pool.tokenReserve -= amountOut;

        emit Swap(msg.sender, ritual, token, amountIn, amountOut, blockhash(block.number - 1));
    }

    // ─── Views ────────────────────────────────────────────────────────────────

    /// @notice Quote how much output you'd receive for a given input (no fee deducted for display — shows net after fee).
    function getAmountOut(address tokenIn, uint256 amountIn, address tokenOut) external view returns (uint256) {
        Pool storage pool;
        uint256 rIn;
        uint256 rOut;

        if (tokenIn == ritual) {
            pool = pools[tokenOut];
            rIn = pool.ritualReserve;
            rOut = pool.tokenReserve;
        } else {
            pool = pools[tokenIn];
            rIn = pool.tokenReserve;
            rOut = pool.ritualReserve;
        }
        if (rIn == 0 || rOut == 0) return 0;
        return _getAmountOut(amountIn, rIn, rOut);
    }

    function getUserShares(address user, address token) external view returns (uint256) {
        return shares[user][token];
    }

    function getPool(address token) external view returns (uint256 ritualReserve, uint256 tokenReserve, uint256 totalShares) {
        Pool storage p = pools[token];
        return (p.ritualReserve, p.tokenReserve, p.totalShares);
    }

    // ─── Internal ────────────────────────────────────────────────────────────

    /// @dev Constant-product formula with 0.30% fee applied to input.
    function _getAmountOut(uint256 amountIn, uint256 reserveIn, uint256 reserveOut) internal pure returns (uint256) {
        uint256 amountInWithFee = amountIn * (10000 - FEE_BPS);
        return (amountInWithFee * reserveOut) / (reserveIn * 10000 + amountInWithFee);
    }

    /// @dev Integer square root (Babylonian method).
    function _sqrt(uint256 x) internal pure returns (uint256 y) {
        if (x == 0) return 0;
        uint256 z = (x + 1) / 2;
        y = x;
        while (z < y) {
            y = z;
            z = (x / z + z) / 2;
        }
    }
}
