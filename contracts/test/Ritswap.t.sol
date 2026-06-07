// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {MockERC20} from "../src/MockERC20.sol";
import {RitswapAMM} from "../src/RitswapAMM.sol";
import {RitswapStaking} from "../src/RitswapStaking.sol";

contract RitswapTest is Test {
    MockERC20 ritual;
    MockERC20 token;
    RitswapAMM amm;
    RitswapStaking staking;

    address alice = makeAddr("alice");
    address bob   = makeAddr("bob");

    function setUp() public {
        ritual = new MockERC20("Ritual", "RITUAL", 18);
        token  = new MockERC20("sepETH", "sepETH", 18);
        amm    = new RitswapAMM(address(ritual));
        staking = new RitswapStaking(address(ritual));
        staking.addPool(address(ritual));
        staking.addPool(address(token));

        // Seed AMM with initial liquidity from deployer
        ritual.mint(address(this), 1_000_000 ether);
        token.mint(address(this), 1_000_000 ether);
        ritual.approve(address(amm), type(uint256).max);
        token.approve(address(amm), type(uint256).max);
        amm.addLiquidity(address(token), 100_000 ether, 50_000 ether, 0);

        // Fund users
        ritual.mint(alice, 10_000 ether);
        token.mint(alice, 10_000 ether);
        ritual.mint(bob, 10_000 ether);

        // Fund staking contract with reward RITUAL
        ritual.mint(address(staking), 1_000_000 ether);
    }

    // ── AMM Tests ─────────────────────────────────────────────────────────────

    function test_addLiquidity() public {
        vm.startPrank(alice);
        ritual.approve(address(amm), 1000 ether);
        token.approve(address(amm), 500 ether);
        uint256 s = amm.addLiquidity(address(token), 1000 ether, 500 ether, 0);
        assertGt(s, 0, "shares issued");
        vm.stopPrank();
    }

    function test_removeLiquidity() public {
        vm.startPrank(alice);
        ritual.approve(address(amm), 1000 ether);
        token.approve(address(amm), 500 ether);
        uint256 s = amm.addLiquidity(address(token), 1000 ether, 500 ether, 0);
        (uint256 rOut, uint256 tOut) = amm.removeLiquidity(address(token), s, 0, 0);
        assertGt(rOut, 0);
        assertGt(tOut, 0);
        vm.stopPrank();
    }

    function test_swapTokenToRitual() public {
        vm.startPrank(alice);
        token.approve(address(amm), 100 ether);
        uint256 out = amm.swapTokenToRitual(address(token), 100 ether, 0);
        assertGt(out, 0, "received ritual");
        vm.stopPrank();
    }

    function test_swapRitualToToken() public {
        vm.startPrank(alice);
        ritual.approve(address(amm), 100 ether);
        uint256 out = amm.swapRitualToToken(address(token), 100 ether, 0);
        assertGt(out, 0, "received token");
        vm.stopPrank();
    }

    function test_getAmountOut() public view {
        uint256 q = amm.getAmountOut(address(token), 1 ether, address(ritual));
        assertGt(q, 0);
    }

    // ── Staking Tests ─────────────────────────────────────────────────────────

    function test_stakeAndUnstake() public {
        vm.startPrank(alice);
        ritual.approve(address(staking), 500 ether);
        staking.stake(address(ritual), 500 ether);

        (uint256 amount,) = staking.getStakeInfo(address(ritual), alice);
        assertEq(amount, 500 ether);

        // advance blocks
        vm.roll(block.number + 100);

        uint256 pending = staking.pendingReward(address(ritual), alice);
        assertGt(pending, 0);

        staking.unstake(address(ritual), 500 ether);
        assertGt(ritual.balanceOf(alice), 10_000 ether, "received rewards");
        vm.stopPrank();
    }

    function test_claimReward() public {
        vm.startPrank(bob);
        ritual.approve(address(staking), 200 ether);
        staking.stake(address(ritual), 200 ether);
        vm.roll(block.number + 50);
        uint256 balBefore = ritual.balanceOf(bob);
        staking.claimReward(address(ritual));
        assertGt(ritual.balanceOf(bob), balBefore);
        vm.stopPrank();
    }
}
