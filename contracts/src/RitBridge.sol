// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IERC20 {
    function transferFrom(address, address, uint256) external returns (bool);
    function transfer(address, uint256) external returns (bool);
}

/// @title RitBridge — lock RITUAL on Ritual Chain, release via relayer signature
contract RitBridge {
    IERC20 public immutable ritual;
    address public immutable relayer;
    uint256 private _nonce;

    mapping(bytes32 => bool) public released;

    event Locked(
        bytes32 indexed lockId,
        address indexed sender,
        address indexed recipient,
        uint256 amount,
        uint256 destChainId,
        uint256 nonce
    );
    event Released(bytes32 indexed claimId, address indexed recipient, uint256 amount);

    constructor(address _ritual, address _relayer) {
        ritual = IERC20(_ritual);
        relayer = _relayer;
    }

    /// @notice Lock RITUAL on Ritual Chain to bridge to a destination chain
    function lock(uint256 amount, uint256 destChainId, address recipient) external returns (bytes32 lockId) {
        require(amount > 0, "zero amount");
        require(destChainId == 11155111 || destChainId == 84532, "unsupported dest");
        require(recipient != address(0), "zero recipient");

        uint256 n = _nonce++;
        lockId = keccak256(abi.encodePacked(msg.sender, recipient, amount, destChainId, n, block.chainid));

        require(ritual.transferFrom(msg.sender, address(this), amount), "transfer failed");
        emit Locked(lockId, msg.sender, recipient, amount, destChainId, n);
    }

    /// @notice Release RITUAL back to a user when they burn wRITUAL on a dest chain (relayer call)
    function release(bytes32 claimId, address recipient, uint256 amount, bytes calldata sig) external {
        require(!released[claimId], "already released");

        bytes32 msgHash = keccak256(abi.encodePacked(claimId, recipient, amount, uint256(block.chainid)));
        address signer = _recover(msgHash, sig);
        require(signer == relayer, "invalid signature");

        released[claimId] = true;
        require(ritual.transfer(recipient, amount), "transfer failed");
        emit Released(claimId, recipient, amount);
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
