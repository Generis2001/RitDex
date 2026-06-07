// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";
import {MockERC20} from "../src/MockERC20.sol";
import {RitswapAMM} from "../src/RitswapAMM.sol";
import {RitswapStaking} from "../src/RitswapStaking.sol";

contract SeedDeploy is Script {
    address constant RITUAL  = 0xB046A6CDe2990b9ddc7F13b311b5731dA722ca2B;
    address constant SEP_ETH = 0x093090B4eB9E82fb92fb4A80Af0517B322799548;
    address constant BASE_ETH= 0x00BC5cc3C2d4c85f2eA362ADB7a4ea261162F90B;
    address constant USDT    = 0x31107dbFfD05918160e37E147a23E6B641319235;
    address constant USDC    = 0x134594a2e3C2c3C550BD6981642B923b88ff6E9D;
    address constant AMM     = 0x5B4A641Fd1C2E67205d9d4947bcBD63EEDddD5Ab;
    address constant STAKING = 0x620eBbf0F0d7acE2202Db95fd6ee0BB42F9510A6;

    function run() external {
        vm.startBroadcast();

        MockERC20 ritual  = MockERC20(RITUAL);
        MockERC20 sepEth  = MockERC20(SEP_ETH);
        MockERC20 baseEth = MockERC20(BASE_ETH);
        MockERC20 usdt    = MockERC20(USDT);
        MockERC20 usdc    = MockERC20(USDC);
        RitswapAMM amm    = RitswapAMM(AMM);
        RitswapStaking staking = RitswapStaking(STAKING);

        // All staking pools already added — skip addPool calls

        // Approve AMM for all tokens
        ritual.approve(AMM, type(uint256).max);
        sepEth.approve(AMM, type(uint256).max);
        baseEth.approve(AMM, type(uint256).max);
        usdt.approve(AMM, type(uint256).max);
        usdc.approve(AMM, type(uint256).max);

        // Seed liquidity
        uint256 ritualLiq = 100_000 ether;
        uint256 ethLiq    = 50 ether;
        uint256 stableLiq = 100_000; // 6-decimal stables

        amm.addLiquidity(SEP_ETH,  ritualLiq, ethLiq,    0);
        amm.addLiquidity(BASE_ETH, ritualLiq, ethLiq,    0);
        amm.addLiquidity(USDT,     ritualLiq, stableLiq, 0);
        amm.addLiquidity(USDC,     ritualLiq, stableLiq, 0);

        // Fund staking with RITUAL rewards
        ritual.transfer(STAKING, 500_000 ether);

        vm.stopBroadcast();
        console.log("Seeding complete.");
    }
}
