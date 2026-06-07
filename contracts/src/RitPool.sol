// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {MockERC20} from "./MockERC20.sol";

interface IERC20 {
    function transferFrom(address, address, uint256) external returns (bool);
    function transfer(address, uint256) external returns (bool);
    function balanceOf(address) external view returns (uint256);
}

/// @title RitPool — single-asset RITUAL liquidity vault
contract RitPool {
    IERC20 public immutable ritual;

    mapping(address => uint256) public shares;
    uint256 public totalShares;

    event Deposited(address indexed user, uint256 ritualAmount, uint256 sharesIssued);
    event Withdrawn(address indexed user, uint256 ritualAmount, uint256 sharesBurned);

    constructor(address _ritual) {
        ritual = IERC20(_ritual);
    }

    function deposit(uint256 amount) external returns (uint256 sharesIssued) {
        require(amount > 0, "zero amount");
        uint256 poolBalance = ritual.balanceOf(address(this));

        if (totalShares == 0 || poolBalance == 0) {
            sharesIssued = amount;
        } else {
            sharesIssued = (amount * totalShares) / poolBalance;
        }
        require(sharesIssued > 0, "zero shares");

        shares[msg.sender] += sharesIssued;
        totalShares += sharesIssued;

        require(ritual.transferFrom(msg.sender, address(this), amount), "transfer failed");
        emit Deposited(msg.sender, amount, sharesIssued);
    }

    function withdraw(uint256 shareAmount) external returns (uint256 ritualOut) {
        require(shareAmount > 0 && shares[msg.sender] >= shareAmount, "insufficient shares");
        uint256 poolBalance = ritual.balanceOf(address(this));

        ritualOut = (shareAmount * poolBalance) / totalShares;
        require(ritualOut > 0, "zero out");

        shares[msg.sender] -= shareAmount;
        totalShares -= shareAmount;

        require(ritual.transfer(msg.sender, ritualOut), "transfer failed");
        emit Withdrawn(msg.sender, ritualOut, shareAmount);
    }

    function getUserInfo(address user) external view returns (uint256 userShares, uint256 ritualValue) {
        userShares = shares[user];
        uint256 poolBalance = ritual.balanceOf(address(this));
        ritualValue = totalShares > 0 ? (userShares * poolBalance) / totalShares : 0;
    }

    function totalRitual() external view returns (uint256) {
        return ritual.balanceOf(address(this));
    }
}
