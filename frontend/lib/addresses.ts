import type { Address } from 'viem';

export const RITUAL_TOKEN      = (process.env.NEXT_PUBLIC_RITUAL_TOKEN           ?? '0x0000000000000000000000000000000000000000') as Address;
export const RITPOOL_ADDRESS   = '0xddaCfDBb2C597D08263DAdde21a7324A663D3311' as Address;
export const RITSTAKE_ADDRESS  = '0xA9be9D40ddfC0d083f98C2b04b5954738612D43f' as Address;
export const RITBRIDGE_ADDRESS = (process.env.NEXT_PUBLIC_RITBRIDGE_ADDRESS      ?? '0x0000000000000000000000000000000000000000') as Address;

export const SEPOLIA_CHAIN_ID      = 11155111;
export const BASE_SEPOLIA_CHAIN_ID = 84532;

export const DEST_CHAINS = [
  {
    chainId: SEPOLIA_CHAIN_ID,
    name: 'Sepolia',
    rpcUrl: 'https://rpc.sepolia.org',
    wrappedRitual: (process.env.NEXT_PUBLIC_SEPOLIA_WRAPPED_RITUAL ?? '') as Address,
  },
  {
    chainId: BASE_SEPOLIA_CHAIN_ID,
    name: 'Base Sepolia',
    rpcUrl: 'https://sepolia.base.org',
    wrappedRitual: (process.env.NEXT_PUBLIC_BASE_SEPOLIA_WRAPPED_RITUAL ?? '') as Address,
  },
] as const;

export const RITUAL_META = {
  address: RITUAL_TOKEN,
  symbol: 'RITUAL',
  name: 'Ritual',
  decimals: 18,
  color: '#19D184',
} as const;
