'use client';

import { useCallback } from 'react';
import { usePublicClient, useWalletClient, useAccount } from 'wagmi';
import type { Address } from 'viem';
import { ERC20_ABI, RITPOOL_ABI, RITBRIDGE_ABI, RITSTAKE_ABI } from '@/lib/abi';
import { RITUAL_TOKEN, RITPOOL_ADDRESS, RITSTAKE_ADDRESS, RITBRIDGE_ADDRESS } from '@/lib/addresses';

// ── Generic write helper ──────────────────────────────────────────────────────
export function useContractWrite() {
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();

  const write = useCallback(async ({
    address, abi, functionName, args = [], value, gas = 600_000n,
  }: {
    address: Address;
    abi: readonly object[];
    functionName: string;
    args?: unknown[];
    value?: bigint;
    gas?: bigint;
  }): Promise<`0x${string}`> => {
    if (!walletClient) throw new Error('Wallet not connected');
    const { encodeFunctionData } = await import('viem');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = encodeFunctionData({ abi: abi as any, functionName, args: args as any });
    const hash = await walletClient.sendTransaction({ to: address, data, value, gas });
    await publicClient!.waitForTransactionReceipt({ hash });
    return hash;
  }, [walletClient, publicClient]);

  return { write };
}

// ── Native RITUAL balance (gas token on Ritual Chain) ────────────────────────
export function useRitualBalance() {
  const { address: userAddress } = useAccount();
  const publicClient = usePublicClient();

  const getBalance = useCallback(async (): Promise<bigint> => {
    if (!userAddress || !publicClient) return 0n;
    return await publicClient.getBalance({ address: userAddress });
  }, [userAddress, publicClient]);

  return { getBalance };
}

// ── RitPool (native RITUAL) ───────────────────────────────────────────────────
export function useRitPool() {
  const { write } = useContractWrite();
  const { address: userAddress } = useAccount();
  const publicClient = usePublicClient();

  const deposit = useCallback(async (amount: bigint): Promise<`0x${string}`> => {
    return write({ address: RITPOOL_ADDRESS, abi: RITPOOL_ABI, functionName: 'deposit', args: [], value: amount });
  }, [write]);

  const withdraw = useCallback(async (shareAmount: bigint): Promise<`0x${string}`> => {
    return write({ address: RITPOOL_ADDRESS, abi: RITPOOL_ABI, functionName: 'withdraw', args: [shareAmount] });
  }, [write]);

  const getUserInfo = useCallback(async (): Promise<{ userShares: bigint; ritualValue: bigint }> => {
    if (!userAddress || !publicClient) return { userShares: 0n, ritualValue: 0n };
    const result = await publicClient.readContract({
      address: RITPOOL_ADDRESS, abi: RITPOOL_ABI, functionName: 'getUserInfo', args: [userAddress],
    }) as [bigint, bigint];
    return { userShares: result[0], ritualValue: result[1] };
  }, [userAddress, publicClient]);

  const getPoolStats = useCallback(async (): Promise<{ totalShares: bigint; totalRitual: bigint }> => {
    if (!publicClient) return { totalShares: 0n, totalRitual: 0n };
    const [ts, tr] = await Promise.all([
      publicClient.readContract({ address: RITPOOL_ADDRESS, abi: RITPOOL_ABI, functionName: 'totalShares', args: [] }) as Promise<bigint>,
      publicClient.readContract({ address: RITPOOL_ADDRESS, abi: RITPOOL_ABI, functionName: 'totalRitual', args: [] }) as Promise<bigint>,
    ]);
    return { totalShares: ts, totalRitual: tr };
  }, [publicClient]);

  return { deposit, withdraw, getUserInfo, getPoolStats };
}

// ── RitBridge ─────────────────────────────────────────────────────────────────
export function useRitBridge() {
  const { write } = useContractWrite();
  const { address: userAddress } = useAccount();
  const publicClient = usePublicClient();

  const ensureAllowance = useCallback(async (spender: Address, amount: bigint) => {
    if (!userAddress) throw new Error('No wallet');
    const current = await publicClient!.readContract({
      address: RITUAL_TOKEN, abi: ERC20_ABI, functionName: 'allowance', args: [userAddress, spender],
    }) as bigint;
    if (current < amount) {
      const { maxUint256 } = await import('viem');
      await write({ address: RITUAL_TOKEN, abi: ERC20_ABI, functionName: 'approve', args: [spender, maxUint256] });
    }
  }, [userAddress, publicClient, write]);

  const lock = useCallback(async (amount: bigint, destChainId: number, recipient: Address): Promise<`0x${string}`> => {
    await ensureAllowance(RITBRIDGE_ADDRESS, amount);
    return write({
      address: RITBRIDGE_ADDRESS,
      abi: RITBRIDGE_ABI,
      functionName: 'lock',
      args: [amount, BigInt(destChainId), recipient],
    });
  }, [ensureAllowance, write]);

  return { lock };
}

// ── RitStake (native RITUAL) ──────────────────────────────────────────────────
export function useRitStake() {
  const { write } = useContractWrite();
  const { address: userAddress } = useAccount();
  const publicClient = usePublicClient();

  const stake = useCallback(async (amount: bigint): Promise<`0x${string}`> => {
    return write({ address: RITSTAKE_ADDRESS, abi: RITSTAKE_ABI, functionName: 'stake', args: [], value: amount });
  }, [write]);

  const unstake = useCallback(async (amount: bigint): Promise<`0x${string}`> => {
    return write({ address: RITSTAKE_ADDRESS, abi: RITSTAKE_ABI, functionName: 'unstake', args: [amount] });
  }, [write]);

  const claimReward = useCallback(async (): Promise<`0x${string}`> => {
    return write({ address: RITSTAKE_ADDRESS, abi: RITSTAKE_ABI, functionName: 'claimReward', args: [] });
  }, [write]);

  const getStakeInfo = useCallback(async (): Promise<{ amount: bigint; pending: bigint }> => {
    if (!userAddress || !publicClient) return { amount: 0n, pending: 0n };
    const result = await publicClient.readContract({
      address: RITSTAKE_ADDRESS, abi: RITSTAKE_ABI, functionName: 'getStakeInfo', args: [userAddress],
    }) as [bigint, bigint];
    return { amount: result[0], pending: result[1] };
  }, [userAddress, publicClient]);

  return { stake, unstake, claimReward, getStakeInfo };
}
