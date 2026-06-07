'use client';

import { usePublicClient, useWalletClient, useAccount } from 'wagmi';
import { maxUint256 } from 'viem';
import type { Address } from 'viem';
import { ERC20_ABI, RITPOOL_ABI, RITBRIDGE_ABI, STAKING_ABI } from '@/lib/abi';
import { RITUAL_TOKEN, STAKING_ADDRESS, RITPOOL_ADDRESS, RITBRIDGE_ADDRESS } from '@/lib/addresses';

// ── Generic write helper ──────────────────────────────────────────────────────
export function useContractWrite() {
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();

  async function write({
    address, abi, functionName, args = [], value, gas = 600_000n,
  }: {
    address: Address;
    abi: readonly object[];
    functionName: string;
    args?: unknown[];
    value?: bigint;
    gas?: bigint;
  }): Promise<`0x${string}`> {
    if (!walletClient) throw new Error('Wallet not connected');
    const { encodeFunctionData } = await import('viem');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = encodeFunctionData({ abi: abi as any, functionName, args: args as any });
    const hash = await walletClient.sendTransaction({ to: address, data, value, gas });
    await publicClient!.waitForTransactionReceipt({ hash });
    return hash;
  }

  return { write };
}

// ── Approve helper ────────────────────────────────────────────────────────────
export function useApprove() {
  const { write } = useContractWrite();
  const { address: userAddress } = useAccount();
  const publicClient = usePublicClient();

  async function ensureAllowance(token: Address, spender: Address, amount: bigint) {
    if (!userAddress) throw new Error('No wallet');
    const current = await publicClient!.readContract({
      address: token, abi: ERC20_ABI, functionName: 'allowance', args: [userAddress, spender],
    }) as bigint;
    if (current < amount) {
      await write({ address: token, abi: ERC20_ABI, functionName: 'approve', args: [spender, maxUint256] });
    }
  }

  return { ensureAllowance };
}

// ── RITUAL balance ────────────────────────────────────────────────────────────
export function useRitualBalance() {
  const { address: userAddress } = useAccount();
  const publicClient = usePublicClient();

  async function getBalance(): Promise<bigint> {
    if (!userAddress) return 0n;
    return await publicClient!.readContract({
      address: RITUAL_TOKEN, abi: ERC20_ABI, functionName: 'balanceOf', args: [userAddress],
    }) as bigint;
  }

  return { getBalance };
}

// ── Faucet (mint test RITUAL) ─────────────────────────────────────────────────
export function useFaucet() {
  const { write } = useContractWrite();
  const { address: userAddress } = useAccount();

  async function mintRitual(amount: bigint): Promise<`0x${string}`> {
    if (!userAddress) throw new Error('No wallet');
    return write({ address: RITUAL_TOKEN, abi: ERC20_ABI, functionName: 'mint', args: [userAddress, amount] });
  }

  return { mintRitual };
}

// ── RitPool ───────────────────────────────────────────────────────────────────
export function useRitPool() {
  const { write } = useContractWrite();
  const { ensureAllowance } = useApprove();
  const { address: userAddress } = useAccount();
  const publicClient = usePublicClient();

  async function deposit(amount: bigint): Promise<`0x${string}`> {
    await ensureAllowance(RITUAL_TOKEN, RITPOOL_ADDRESS, amount);
    return write({ address: RITPOOL_ADDRESS, abi: RITPOOL_ABI, functionName: 'deposit', args: [amount] });
  }

  async function withdraw(shareAmount: bigint): Promise<`0x${string}`> {
    return write({ address: RITPOOL_ADDRESS, abi: RITPOOL_ABI, functionName: 'withdraw', args: [shareAmount] });
  }

  async function getUserInfo(): Promise<{ userShares: bigint; ritualValue: bigint }> {
    if (!userAddress) return { userShares: 0n, ritualValue: 0n };
    const result = await publicClient!.readContract({
      address: RITPOOL_ADDRESS, abi: RITPOOL_ABI, functionName: 'getUserInfo', args: [userAddress],
    }) as [bigint, bigint];
    return { userShares: result[0], ritualValue: result[1] };
  }

  async function getPoolStats(): Promise<{ totalShares: bigint; totalRitual: bigint }> {
    const [ts, tr] = await Promise.all([
      publicClient!.readContract({ address: RITPOOL_ADDRESS, abi: RITPOOL_ABI, functionName: 'totalShares', args: [] }) as Promise<bigint>,
      publicClient!.readContract({ address: RITPOOL_ADDRESS, abi: RITPOOL_ABI, functionName: 'totalRitual', args: [] }) as Promise<bigint>,
    ]);
    return { totalShares: ts, totalRitual: tr };
  }

  return { deposit, withdraw, getUserInfo, getPoolStats };
}

// ── RitBridge ─────────────────────────────────────────────────────────────────
export function useRitBridge() {
  const { write } = useContractWrite();
  const { ensureAllowance } = useApprove();

  async function lock(amount: bigint, destChainId: number, recipient: Address): Promise<`0x${string}`> {
    await ensureAllowance(RITUAL_TOKEN, RITBRIDGE_ADDRESS, amount);
    return write({
      address: RITBRIDGE_ADDRESS,
      abi: RITBRIDGE_ABI,
      functionName: 'lock',
      args: [amount, BigInt(destChainId), recipient],
    });
  }

  return { lock };
}

// ── Ritstake (RITUAL pool only) ───────────────────────────────────────────────
export function useRitStake() {
  const { write } = useContractWrite();
  const { ensureAllowance } = useApprove();
  const { address: userAddress } = useAccount();
  const publicClient = usePublicClient();

  async function stake(amount: bigint): Promise<`0x${string}`> {
    await ensureAllowance(RITUAL_TOKEN, STAKING_ADDRESS, amount);
    return write({ address: STAKING_ADDRESS, abi: STAKING_ABI, functionName: 'stake', args: [RITUAL_TOKEN, amount] });
  }

  async function unstake(amount: bigint): Promise<`0x${string}`> {
    return write({ address: STAKING_ADDRESS, abi: STAKING_ABI, functionName: 'unstake', args: [RITUAL_TOKEN, amount] });
  }

  async function claimReward(): Promise<`0x${string}`> {
    return write({ address: STAKING_ADDRESS, abi: STAKING_ABI, functionName: 'claimReward', args: [RITUAL_TOKEN] });
  }

  async function getStakeInfo(): Promise<{ amount: bigint; pending: bigint }> {
    if (!userAddress) return { amount: 0n, pending: 0n };
    const result = await publicClient!.readContract({
      address: STAKING_ADDRESS, abi: STAKING_ABI, functionName: 'getStakeInfo', args: [RITUAL_TOKEN, userAddress],
    }) as [bigint, bigint];
    return { amount: result[0], pending: result[1] };
  }

  return { stake, unstake, claimReward, getStakeInfo };
}
