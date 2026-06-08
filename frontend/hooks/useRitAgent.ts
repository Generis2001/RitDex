'use client';

import { usePublicClient, useWalletClient, useAccount } from 'wagmi';
import { encodeAbiParameters, decodeAbiParameters, parseEther, formatEther, toHex } from 'viem';
import type { Address, Hex } from 'viem';

// ── Ritual precompile constants ───────────────────────────────────────────────
export const HTTP_PRECOMPILE  = '0x0000000000000000000000000000000000000801' as const;
export const RITUAL_WALLET    = '0x532F0dF0896F353d8C3DD8cc134e8129DA2a3948' as const;
export const TEE_REGISTRY     = '0x9644e8562cE0Fe12b4deeC4163c064A8862Bf47F' as const;
const HTTP_CALL_CAPABILITY    = 0; // Capability.HTTP_CALL

// ── 13-field HTTP request ABI (from ritual-dapp-http skill) ──────────────────
const HTTP_REQUEST_ABI = [
  { type: 'address'  }, // executor
  { type: 'bytes[]'  }, // encryptedSecrets
  { type: 'uint256'  }, // ttl
  { type: 'bytes[]'  }, // secretSignatures
  { type: 'bytes'    }, // userPublicKey
  { type: 'string'   }, // url
  { type: 'uint8'    }, // method (1=GET)
  { type: 'string[]' }, // headerKeys
  { type: 'string[]' }, // headerValues
  { type: 'bytes'    }, // body
  { type: 'uint256'  }, // dkmsKeyIndex
  { type: 'uint8'    }, // dkmsKeyFormat
  { type: 'bool'     }, // piiEnabled
] as const;

// ── 5-field HTTP response ABI ─────────────────────────────────────────────────
const HTTP_RESPONSE_ABI = [
  { type: 'uint16'   }, // statusCode
  { type: 'string[]' }, // headerKeys
  { type: 'string[]' }, // headerValues
  { type: 'bytes'    }, // body
  { type: 'string'   }, // errorMessage
] as const;

// ── TEE registry ABI ──────────────────────────────────────────────────────────
const TEE_REGISTRY_ABI = [
  {
    inputs: [{ name: 'capability', type: 'uint8' }, { name: 'checkValidity', type: 'bool' }],
    name: 'getServicesByCapability',
    outputs: [{
      type: 'tuple[]',
      components: [
        {
          name: 'node', type: 'tuple', components: [
            { name: 'paymentAddress', type: 'address' },
            { name: 'teeAddress', type: 'address' },
            { name: 'teeType', type: 'uint8' },
            { name: 'publicKey', type: 'bytes' },
            { name: 'endpoint', type: 'string' },
            { name: 'certPubKeyHash', type: 'bytes32' },
            { name: 'capability', type: 'uint8' },
          ],
        },
        { name: 'isValid', type: 'bool' },
        { name: 'workloadId', type: 'bytes32' },
      ],
    }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

const RITUAL_WALLET_ABI = [
  { name: 'balanceOf', type: 'function', stateMutability: 'view',    inputs: [{ name: 'user', type: 'address' }], outputs: [{ type: 'uint256' }] },
  { name: 'lockUntil', type: 'function', stateMutability: 'view',    inputs: [{ name: 'user', type: 'address' }], outputs: [{ type: 'uint256' }] },
  { name: 'deposit',   type: 'function', stateMutability: 'payable', inputs: [{ name: 'lockDuration', type: 'uint256' }], outputs: [] },
  { name: 'withdraw',  type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'amount', type: 'uint256' }], outputs: [] },
] as const;

// ── Encode a simple GET request ───────────────────────────────────────────────
function encodeGetRequest(executor: Address, url: string, ttl = 100n): Hex {
  return encodeAbiParameters(HTTP_REQUEST_ABI as any, [
    executor,
    [],
    ttl,
    [],
    '0x',
    url,
    1,           // GET
    ['Accept'],
    ['application/json'],
    '0x',
    0n,
    0,
    false,
  ]) as Hex;
}

// ── Decode settled HTTP response from spcCalls ────────────────────────────────
export function decodeHTTPResult(raw: Hex): {
  statusCode: number;
  body: string;
  errorMessage: string;
} | null {
  try {
    const [, actualOutput] = decodeAbiParameters([{ type: 'bytes' }, { type: 'bytes' }], raw);
    if ((actualOutput as Hex) === '0x') return null;
    const [statusCode, , , body, errorMessage] = decodeAbiParameters(HTTP_RESPONSE_ABI as any, actualOutput as Hex);
    const bodyStr = Buffer.from((body as Hex).slice(2), 'hex').toString('utf8');
    return { statusCode: Number(statusCode), body: bodyStr, errorMessage: errorMessage as string };
  } catch {
    return null;
  }
}

// ── Main hook ─────────────────────────────────────────────────────────────────
export function useRitAgent() {
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const { address } = useAccount();

  async function getExecutor(): Promise<Address> {
    const services = await publicClient!.readContract({
      address: TEE_REGISTRY, abi: TEE_REGISTRY_ABI,
      functionName: 'getServicesByCapability',
      args: [HTTP_CALL_CAPABILITY, true],
    }) as any[];
    if (!services.length) throw new Error('No HTTP executors registered on Ritual Chain');
    return services[0].node.teeAddress as Address;
  }

  async function getWalletInfo(): Promise<{ balance: bigint; lockUntil: bigint; currentBlock: bigint }> {
    if (!address) return { balance: 0n, lockUntil: 0n, currentBlock: 0n };
    const [balance, lockUntil, currentBlock] = await Promise.all([
      publicClient!.readContract({ address: RITUAL_WALLET, abi: RITUAL_WALLET_ABI, functionName: 'balanceOf', args: [address] }) as Promise<bigint>,
      publicClient!.readContract({ address: RITUAL_WALLET, abi: RITUAL_WALLET_ABI, functionName: 'lockUntil', args: [address] }) as Promise<bigint>,
      publicClient!.getBlockNumber(),
    ]);
    return { balance, lockUntil, currentBlock };
  }

  // Lock duration: ~7 days at 350 ms/block on Ritual Chain
  const LOCK_DURATION = 1_728_000n;

  async function depositWallet(amountEther: string): Promise<void> {
    if (!walletClient || !address) throw new Error('Wallet not connected');
    const { encodeFunctionData } = await import('viem');
    const data = encodeFunctionData({ abi: RITUAL_WALLET_ABI as any, functionName: 'deposit', args: [LOCK_DURATION] });
    const hash = await walletClient.sendTransaction({
      to: RITUAL_WALLET,
      data,
      value: parseEther(amountEther),
    });
    await publicClient!.waitForTransactionReceipt({ hash });
  }

  async function withdrawWallet(amountEther: string): Promise<void> {
    if (!walletClient || !address) throw new Error('Wallet not connected');
    const { encodeFunctionData } = await import('viem');
    const data = encodeFunctionData({ abi: RITUAL_WALLET_ABI as any, functionName: 'withdraw', args: [parseEther(amountEther)] });
    const hash = await walletClient.sendTransaction({
      to: RITUAL_WALLET,
      data,
      gas: 200_000n,
    });
    await publicClient!.waitForTransactionReceipt({ hash });
  }

  // Fetch external data via Ritual HTTP precompile
  async function fetchURL(url: string): Promise<{
    hash: `0x${string}`;
    result: { statusCode: number; body: string; errorMessage: string } | null;
    settled: boolean;
  }> {
    if (!walletClient || !address) throw new Error('Wallet not connected');

    const { balance } = await getWalletInfo();
    if (balance < parseEther('0.005')) {
      throw new Error(`RitualWallet balance too low (${formatEther(balance)} RITUAL). Deposit at least 0.01 native RITUAL to pay executor fees.`);
    }

    const executor = await getExecutor();
    const data = encodeGetRequest(executor, url);

    const hash = await walletClient.sendTransaction({
      to: HTTP_PRECOMPILE,
      data,
      maxFeePerGas: 30_000_000_000n,
      maxPriorityFeePerGas: 2_000_000_000n,
      gas: 2_000_000n,
    });

    const receipt = await publicClient!.waitForTransactionReceipt({ hash });

    // Read spcCalls from Ritual receipt extension
    const ritReceipt = receipt as any;
    const spcCalls: any[] = ritReceipt?.spcCalls ?? [];

    if (spcCalls.length === 0) {
      return { hash, result: null, settled: false };
    }

    const raw = (spcCalls[0]?.output ?? spcCalls[0]) as Hex;
    const result = decodeHTTPResult(raw);

    return { hash, result, settled: result !== null };
  }

  // Poll for settlement if the first receipt came back without spcCalls
  async function pollSettlement(hash: `0x${string}`, timeoutMs = 60_000): Promise<{
    result: { statusCode: number; body: string; errorMessage: string } | null;
    settled: boolean;
  }> {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      await new Promise((r) => setTimeout(r, 3_000));
      const receipt = await publicClient!.getTransactionReceipt({ hash });
      const spcCalls: any[] = (receipt as any)?.spcCalls ?? [];
      if (spcCalls.length > 0) {
        const raw = (spcCalls[0]?.output ?? spcCalls[0]) as Hex;
        const result = decodeHTTPResult(raw);
        if (result) return { result, settled: true };
      }
    }
    return { result: null, settled: false };
  }

  return { fetchURL, getExecutor, getWalletInfo, depositWallet, withdrawWallet, pollSettlement };
}
