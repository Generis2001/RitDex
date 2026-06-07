// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";
import {RitPool} from "../src/RitPool.sol";
import {RitBridge} from "../src/RitBridge.sol";

contract DeployRitDex is Script {
    // Existing RITUAL token on Ritual Chain (deployed earlier)
    address constant RITUAL  = 0xB046A6CDe2990b9ddc7F13b311b5731dA722ca2B;
    // Existing staking contract — RITUAL pool (index 0) is already live
    address constant STAKING = 0x620eBbf0F0d7acE2202Db95fd6ee0BB42F9510A6;

    function run() external {
        vm.startBroadcast();
        address deployer = msg.sender;

        // ── 1. Deploy RitPool ──────────────────────────────────────────────────
        RitPool pool = new RitPool(RITUAL);
        console.log("RitPool deployed to:", address(pool));

        // ── 2. Deploy RitBridge (relayer = deployer) ───────────────────────────
        RitBridge bridge = new RitBridge(RITUAL, deployer);
        console.log("RitBridge deployed to:", address(bridge));

        vm.stopBroadcast();

        console.log("=== RitDex Ritual Chain Deployment Complete ===");
        console.log("RITUAL token:   ", RITUAL);
        console.log("RitswapStaking: ", STAKING);
        console.log("RitPool:        ", address(pool));
        console.log("RitBridge:      ", address(bridge));
    }
}
