'use client';

import { useAccount, useSwitchChain } from 'wagmi';
import { ritualChain } from '@/lib/chain';

export function ChainGuard({ children }: { children: React.ReactNode }) {
  const { chain, isConnected } = useAccount();
  const { switchChain, isPending } = useSwitchChain();

  if (isConnected && chain?.id !== ritualChain.id) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="text-center max-w-sm p-8 bg-ritual-elevated border border-gray-700 rounded-xl">
          <div className="text-4xl mb-4">⛓</div>
          <h2 className="font-display text-xl text-gray-100 mb-2">Wrong Network</h2>
          <p className="text-sm text-gray-400 mb-6">
            Ritswap runs on Ritual Chain (ID 1979). Switch networks to continue.
          </p>
          <button
            onClick={() => switchChain({ chainId: ritualChain.id })}
            disabled={isPending}
            className="px-6 py-2.5 border border-ritual-green text-ritual-green rounded-lg text-sm font-semibold
                       hover:bg-ritual-green/10 transition-colors duration-150 disabled:opacity-50"
          >
            {isPending ? 'Switching…' : 'Switch to Ritual Chain'}
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
