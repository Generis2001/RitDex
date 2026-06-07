// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title WrappedRITUAL — ERC-20 deployed on Sepolia / Base Sepolia
///        Users claim this after locking RITUAL on Ritual Chain (via relayer signature).
///        Users burn this to bridge back to Ritual Chain.
contract WrappedRITUAL {
    string public constant name     = "Wrapped RITUAL";
    string public constant symbol   = "wRITUAL";
    uint8  public constant decimals = 18;

    address public immutable relayer;
    uint256 public totalSupply;
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;
    mapping(bytes32 => bool) public claimed;

    uint256 private _burnNonce;

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
    event Claimed(bytes32 indexed lockId, address indexed recipient, uint256 amount);
    event BurnedForBridge(bytes32 indexed burnId, address indexed user, uint256 amount, address ritualChainRecipient);

    constructor(address _relayer) {
        relayer = _relayer;
    }

    // ── ERC-20 ───────────────────────────────────────────────────────────────

    function transfer(address to, uint256 amount) external returns (bool) {
        _transfer(msg.sender, to, amount);
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        uint256 allowed = allowance[from][msg.sender];
        if (allowed != type(uint256).max) allowance[from][msg.sender] = allowed - amount;
        _transfer(from, to, amount);
        return true;
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }

    // ── Bridge ───────────────────────────────────────────────────────────────

    /// @notice Claim wRITUAL on this chain using a relayer-signed voucher from a Ritual Chain lock
    function claim(bytes32 lockId, address recipient, uint256 amount, bytes calldata sig) external {
        require(!claimed[lockId], "already claimed");

        bytes32 msgHash = keccak256(abi.encodePacked(lockId, recipient, amount, uint256(block.chainid)));
        address signer = _recover(msgHash, sig);
        require(signer == relayer, "invalid signature");

        claimed[lockId] = true;
        _mint(recipient, amount);
        emit Claimed(lockId, recipient, amount);
    }

    /// @notice Burn wRITUAL to trigger release of RITUAL on Ritual Chain
    function burn(uint256 amount, address ritualChainRecipient) external returns (bytes32 burnId) {
        require(amount > 0, "zero amount");
        require(ritualChainRecipient != address(0), "zero recipient");

        burnId = keccak256(abi.encodePacked(msg.sender, amount, ritualChainRecipient, block.chainid, _burnNonce++));
        _burn(msg.sender, amount);
        emit BurnedForBridge(burnId, msg.sender, amount, ritualChainRecipient);
    }

    // ── Internal ─────────────────────────────────────────────────────────────

    function _transfer(address from, address to, uint256 amount) internal {
        require(balanceOf[from] >= amount, "insufficient balance");
        balanceOf[from] -= amount;
        balanceOf[to]   += amount;
        emit Transfer(from, to, amount);
    }

    function _mint(address to, uint256 amount) internal {
        totalSupply      += amount;
        balanceOf[to]    += amount;
        emit Transfer(address(0), to, amount);
    }

    function _burn(address from, uint256 amount) internal {
        require(balanceOf[from] >= amount, "insufficient balance");
        totalSupply      -= amount;
        balanceOf[from]  -= amount;
        emit Transfer(from, address(0), amount);
    }

    function _recover(bytes32 hash, bytes calldata sig) internal pure returns (address) {
        require(sig.length == 65, "bad sig length");
        bytes32 ethHash = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", hash));
        bytes32 r;
        bytes32 s;
        uint8 v;
        assembly {
            r := calldataload(sig.offset)
            s := calldataload(add(sig.offset, 32))
            v := byte(0, calldataload(add(sig.offset, 64)))
        }
        return ecrecover(ethHash, v, r, s);
    }
}
