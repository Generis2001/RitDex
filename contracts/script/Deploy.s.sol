// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";
import {MockERC20} from "../src/MockERC20.sol";
import {RitswapAMM} from "../src/RitswapAMM.sol";
import {RitswapStaking} from "../src/RitswapStaking.sol";

/// @notice Deploys: RITUAL token, 4 secondary tokens, AMM, Staking.
///         Seeds initial liquidity and reward tokens.
contract DeployRitswap is Script {
    function run() external {
        vm.startBroadcast();
        address deployer = msg.sender;

        // ── 1. Deploy token contracts ──────────────────────────────────────────
        MockERC20 ritual = new MockERC20("Ritual", "RITUAL", 18);
        MockERC20 sepEth = new MockERC20("Sepolia ETH", "sepETH", 18);
        MockERC20 baseEth = new MockERC20("Base ETH", "baseETH", 18);
        MockERC20 usdt = new MockERC20("Tether USD", "USDT", 6);
        MockERC20 usdc = new MockERC20("USD Coin", "USDC", 6);

        console.log("RITUAL deployed to:", address(ritual));
        console.log("sepETH deployed to:", address(sepEth));
        console.log("baseETH deployed to:", address(baseEth));
        console.log("USDT deployed to:", address(usdt));
        console.log("USDC deployed to:", address(usdc));

        // ── 2. Mint initial supply to deployer ────────────────────────────────
        uint256 large = 10_000_000 ether;
        ritual.mint(deployer, large);
        sepEth.mint(deployer, large);
        baseEth.mint(deployer, large);
        usdt.mint(deployer, large / 1e12); // 6 decimals
        usdc.mint(deployer, large / 1e12);

        // ── 3. Deploy AMM ─────────────────────────────────────────────────────
        RitswapAMM amm = new RitswapAMM(address(ritual));
        console.log("RitswapAMM deployed to:", address(amm));

        // ── 4. Deploy Staking ─────────────────────────────────────────────────
        RitswapStaking staking = new RitswapStaking(address(ritual));
        console.log("RitswapStaking deployed to:", address(staking));

        // ── 5. Add staking pools ───────────────────────────────────────────────
        staking.addPool(address(ritual));
        staking.addPool(address(sepEth));
        staking.addPool(address(baseEth));
        staking.addPool(address(usdt));
        staking.addPool(address(usdc));

        // ── 6. Seed AMM with initial liquidity (1 RITUAL : 0.0005 ETH price peg for ETH pairs) ──
        uint256 ritualLiq = 100_000 ether;
        uint256 ethLiq    = 50 ether;
        uint256 stableLiq = 100_000; // 6-decimal stables

        ritual.approve(address(amm), type(uint256).max);
        sepEth.approve(address(amm), type(uint256).max);
        baseEth.approve(address(amm), type(uint256).max);
        usdt.approve(address(amm), type(uint256).max);
        usdc.approve(address(amm), type(uint256).max);

        amm.addLiquidity(address(sepEth), ritualLiq, ethLiq, 0);
        amm.addLiquidity(address(baseEth), ritualLiq, ethLiq, 0);
        amm.addLiquidity(address(usdt), ritualLiq, stableLiq, 0);
        amm.addLiquidity(address(usdc), ritualLiq, stableLiq, 0);

        // ── 7. Fund staking contract with RITUAL rewards ──────────────────────
        ritual.transfer(address(staking), 500_000 ether);

        vm.stopBroadcast();

        console.log("=== Deployment Complete ===");
        console.log("RITUAL:          ", address(ritual));
        console.log("sepETH:          ", address(sepEth));
        console.log("baseETH:         ", address(baseEth));
        console.log("USDT:            ", address(usdt));
        console.log("USDC:            ", address(usdc));
        console.log("RitswapAMM:      ", address(amm));
        console.log("RitswapStaking:  ", address(staking));
    }
}
