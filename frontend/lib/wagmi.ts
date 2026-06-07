'use client';

import { http } from 'wagmi';
import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { ritualChain } from './chain';

const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL ?? 'https://rpc.ritualfoundation.org';

export const wagmiConfig = getDefaultConfig({
  appName: 'RitDex',
  projectId: process.env.NEXT_PUBLIC_WC_PROJECT_ID ?? 'ritswap-demo',
  chains: [ritualChain],
  transports: {
    [ritualChain.id]: http(RPC_URL),
  },
  ssr: true,
});
