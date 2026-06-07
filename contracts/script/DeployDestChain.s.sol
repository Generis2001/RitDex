// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";
import {WrappedRITUAL} from "../src/WrappedRITUAL.sol";

/// @notice Deploy WrappedRITUAL on Sepolia (11155111) or Base Sepolia (84532).
///         Run with --rpc-url https://rpc.sepolia.org or https://sepolia.base.org
contract DeployDestChain is Script {
    // Deployer wallet = relayer address (same key used for signing claims)
    function run() external {
        vm.startBroadcast();
        address deployer = msg.sender;

        WrappedRITUAL wRitual = new WrappedRITUAL(deployer);
        console.log("WrappedRITUAL deployed to:", address(wRitual));
        console.log("Relayer/owner:            ", deployer);
        console.log("Chain ID:                 ", block.chainid);

        vm.stopBroadcast();
    }
}
