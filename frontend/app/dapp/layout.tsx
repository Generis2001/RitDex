'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAccount } from 'wagmi';
import { formatUnits } from 'viem';
import { ChainGuard } from '@/components/ChainGuard';
import { useRitualBalance } from '@/hooks/useContracts';

const tabs = [
  { href: '/dapp',        label: 'RitAgent',  tagline: 'channel your path through the dark', icon: '⚡' },
  { href: '/dapp/pool',   label: 'Ritpool',   tagline: 'immerse yourself',                   icon: '◈' },
  { href: '/dapp/stake',  label: 'Ritstake',  tagline: 'sow your seed',                      icon: '✦' },
];

function RitualBalancePill() {
  const { isConnected } = useAccount();
  const { getBalance } = useRitualBalance();
  const [balance, setBalance] = useState<bigint | null>(null);
  const getBalanceRef = useRef(getBalance);
  getBalanceRef.current = getBalance;

  useEffect(() => {
    if (!isConnected) { setBalance(null); return; }
    const refresh = async () => {
      try { setBalance(await getBalanceRef.current()); } catch { /* not connected */ }
    };
    refresh();
    const id = setInterval(refresh, 10_000);
    return () => clearInterval(id);
  }, [isConnected]);

  if (!isConnected || balance === null) return null;

  return (
    <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-ritual-green/10 border border-ritual-green/20 text-xs font-mono text-ritual-green">
      <span className="w-1.5 h-1.5 rounded-full bg-ritual-green animate-pulse" />
      {parseFloat(formatUnits(balance, 18)).toLocaleString(undefined, { maximumFractionDigits: 2 })} RITUAL
    </div>
  );
}

export default function DappLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <ChainGuard>
      <div className="min-h-screen mesh-bg grain">
        {/* ── Top nav ─── */}
        <nav className="sticky top-0 z-30 border-b border-gray-800 bg-black/70 backdrop-blur-sm">
          <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
            <button
              onClick={() => router.push('/')}
              className="font-display text-white text-xl tracking-tight hover:text-ritual-green transition-colors"
            >
              RitDex
            </button>

            {/* Tab strip */}
            <div className="hidden sm:flex items-center gap-1">
              {tabs.map((t) => {
                const active = pathname === t.href;
                return (
                  <Link
                    key={t.href}
                    href={t.href}
                    className={`flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-lg transition-colors duration-150
                      ${active
                        ? 'text-ritual-green bg-ritual-green/10 border border-ritual-green/30'
                        : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/50'}`}
                  >
                    <span>{t.icon}</span>
                    {t.label}
                  </Link>
                );
              })}
            </div>

            <div className="flex items-center gap-3">
              <RitualBalancePill />
              <a
                href="http://explorer.ritualfoundation.org/"
                target="_blank"
                rel="noopener noreferrer"
                className="hidden sm:flex items-center gap-1 text-xs text-gray-500 hover:text-ritual-green transition-colors"
              >
                Explorer ↗
              </a>
              <ConnectButton showBalance={false} chainStatus="icon" accountStatus="address" />
            </div>
          </div>

          {/* Mobile tab strip */}
          <div className="sm:hidden flex border-t border-gray-800">
            {tabs.map((t) => {
              const active = pathname === t.href;
              return (
                <Link
                  key={t.href}
                  href={t.href}
                  className={`flex-1 flex flex-col items-center py-2 text-xs font-semibold transition-colors
                    ${active ? 'text-ritual-green border-b-2 border-ritual-green' : 'text-gray-500'}`}
                >
                  <span className="text-base mb-0.5">{t.icon}</span>
                  {t.label}
                </Link>
              );
            })}
          </div>
        </nav>

        {/* ── Page content ─── */}
        <div className="max-w-5xl mx-auto px-4 py-8">
          {(() => {
            const tab = tabs.find((t) => t.href === pathname);
            return tab ? (
              <p className="text-center text-xs text-gray-500 italic mb-6 tracking-widest uppercase">
                {tab.tagline}
              </p>
            ) : null;
          })()}
          {children}
        </div>
      </div>
    </ChainGuard>
  );
}
