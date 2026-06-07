'use client';

import { useEffect } from 'react';
import { EXPLORER_URL } from '@/lib/chain';

interface Props {
  txHash: string;
  action: string;
  onClose: () => void;
}

export function TxSuccessModal({ txHash, action, onClose }: Props) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const explorerUrl = `${EXPLORER_URL}/tx/${txHash}`;
  const short = `${txHash.slice(0, 10)}…${txHash.slice(-8)}`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Transaction successful"
    >
      {/* backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      {/* card */}
      <div className="relative z-10 w-full max-w-md bg-ritual-elevated border border-gray-700 rounded-xl shadow-card p-8 text-center">
        {/* glow ring */}
        <div className="absolute inset-0 rounded-xl pointer-events-none border border-ritual-green/30 shadow-glow-green" />

        {/* icon */}
        <div className="mx-auto w-16 h-16 rounded-full bg-ritual-green/10 border border-ritual-green/30 flex items-center justify-center mb-5 text-ritual-green text-3xl animate-pulse-green">
          ✓
        </div>

        <h2 className="font-display text-xl text-gray-100 mb-1">Transaction Confirmed</h2>
        <p className="text-sm text-gray-400 mb-4">{action} submitted successfully on Ritual Chain.</p>

        {/* tx hash */}
        <div className="bg-ritual-surface rounded-lg px-4 py-3 mb-6 font-mono text-xs text-gray-400 break-all">
          {short}
        </div>

        <div className="flex flex-col gap-3">
          <a
            href={explorerUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-3 rounded-lg border border-ritual-green text-ritual-green font-semibold text-sm
                       hover:bg-ritual-green/10 transition-colors duration-150 glow-green"
          >
            ↗ Navigate to Explorer to View Tx
          </a>
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-lg border border-gray-700 text-gray-400 text-sm
                       hover:border-gray-600 transition-colors duration-150"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
