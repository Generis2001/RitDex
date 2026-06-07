'use client';

import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { ritualChain } from './chain';

export const wagmiConfig = getDefaultConfig({
  appName: 'Ritswap',
  projectId: process.env.NEXT_PUBLIC_WC_PROJECT_ID ?? 'ritswap-demo',
  chains: [ritualChain],
  ssr: true,
});
