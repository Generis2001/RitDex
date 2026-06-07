'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAccount } from 'wagmi';
import { formatUnits, parseUnits } from 'viem';
import { TxSuccessModal } from '@/components/TxSuccessModal';
import { useRitPool, useRitualBalance } from '@/hooks/useContracts';

type Mode = 'deposit' | 'withdraw';

export default function RitpoolPage() {
  const { isConnected } = useAccount();
  const { deposit, withdraw, getUserInfo, getPoolStats } = useRitPool();
  const { getBalance } = useRitualBalance();

  const [mode, setMode] = useState<Mode>('deposit');
  const [amount, setAmount] = useState('');
  const [walletBalance, setWalletBalance] = useState(0n);
  const [userShares, setUserShares] = useState(0n);
  const [ritualValue, setRitualValue] = useState(0n);
  const [totalRitual, setTotalRitual] = useState(0n);
  const [totalShares, setTotalShares] = useState(0n);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successTx, setSuccessTx] = useState<{ hash: string; action: string } | null>(null);

  // Refs so interval always calls the latest version without re-registering
  const getBalanceRef   = useRef(getBalance);
  const getUserInfoRef  = useRef(getUserInfo);
  const getPoolStatsRef = useRef(getPoolStats);
  getBalanceRef.current   = getBalance;
  getUserInfoRef.current  = getUserInfo;
  getPoolStatsRef.current = getPoolStats;

  const load = useCallback(async () => {
    try {
      const [bal, info, stats] = await Promise.all([
        getBalanceRef.current(),
        getUserInfoRef.current(),
        getPoolStatsRef.current(),
      ]);
      setWalletBalance(bal);
      setUserShares(info.userShares);
      setRitualValue(info.ritualValue);
      setTotalRitual(stats.totalRitual);
      setTotalShares(stats.totalShares);
    } catch { /* rpc not ready */ }
  }, []); // stable — reads current values via refs

  useEffect(() => {
    if (!isConnected) {
      setWalletBalance(0n);
      setUserShares(0n);
      setRitualValue(0n);
      setTotalRitual(0n);
      setTotalShares(0n);
      return;
    }
    load();
    const id = setInterval(load, 10_000);
    return () => clearInterval(id);
  }, [isConnected, load]);

  const sharePercent = totalShares > 0n
    ? (Number((userShares * 10000n) / totalShares) / 100).toFixed(2)
    : '0.00';

  const handleDeposit = async () => {
    if (!amount) return;
    setError(''); setLoading(true);
    try {
      const hash = await deposit(parseUnits(amount, 18));
      setSuccessTx({ hash, action: `Added ${amount} RITUAL to Ritpool` });
      setAmount('');
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed');
    } finally { setLoading(false); }
  };

  const handleWithdraw = async () => {
    if (!amount) return;
    setError(''); setLoading(true);
    try {
      const hash = await withdraw(parseUnits(amount, 18));
      setSuccessTx({ hash, action: `Removed ${amount} pool shares from Ritpool` });
      setAmount('');
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed');
    } finally { setLoading(false); }
  };

  const walletF  = parseFloat(formatUnits(walletBalance, 18));
  const sharesF  = parseFloat(formatUnits(userShares, 18));
  const valueF   = parseFloat(formatUnits(ritualValue, 18));
  const poolF    = parseFloat(formatUnits(totalRitual, 18));

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="w-full max-w-lg bg-ritual-elevated border border-gray-800 rounded-xl shadow-card p-6 relative">
        <div className="absolute inset-0 rounded-xl pointer-events-none border border-ritual-green/10" />

        <div className="flex items-center justify-between mb-1">
          <h2 className="font-display text-lg text-gray-100">Ritpool</h2>
          <a
            href="https://faucet.ritualfoundation.org/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-gray-500 hover:text-ritual-green transition-colors"
          >
            Get RITUAL ↗
          </a>
        </div>
        <p className="text-xs text-gray-500 italic mb-5">single-asset RITUAL liquidity vault</p>

        {/* Pool stats */}
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div className="bg-ritual-surface rounded-lg p-3">
            <div className="text-xs text-gray-500 mb-1">Wallet Balance</div>
            <div className="font-mono text-sm text-gray-200">
              {walletF.toLocaleString(undefined, { maximumFractionDigits: 4 })}
            </div>
            <div className="text-xs text-gray-600">RITUAL</div>
          </div>
          <div className="bg-ritual-surface rounded-lg p-3">
            <div className="text-xs text-gray-500 mb-1">Pool Total</div>
            <div className="font-mono text-sm text-ritual-green">
              {poolF.toLocaleString(undefined, { maximumFractionDigits: 4 })}
            </div>
            <div className="text-xs text-gray-600">RITUAL</div>
          </div>
        </div>

        {userShares > 0n && (
          <div className="grid grid-cols-2 gap-3 mb-5">
            <div className="bg-ritual-surface rounded-lg p-3">
              <div className="text-xs text-gray-500 mb-1">Your Shares</div>
              <div className="font-mono text-sm text-gray-200">{sharesF.toFixed(4)}</div>
              <div className="text-xs text-gray-600">shares · {sharePercent}% of pool</div>
            </div>
            <div className="bg-ritual-surface rounded-lg p-3">
              <div className="text-xs text-gray-500 mb-1">Your Value</div>
              <div className="font-mono text-sm text-ritual-green">{valueF.toFixed(4)}</div>
              <div className="text-xs text-gray-600">RITUAL redeemable</div>
            </div>
          </div>
        )}

        {userShares === 0n && <div className="mb-5" />}

        {/* Mode toggle */}
        <div className="flex bg-ritual-surface rounded-lg p-1 mb-5 gap-1">
          {(['deposit', 'withdraw'] as Mode[]).map((m) => (
            <button
              key={m}
              onClick={() => { setMode(m); setAmount(''); setError(''); }}
              className={`flex-1 py-2 rounded-md text-sm font-semibold capitalize transition-colors
                ${mode === m ? 'bg-ritual-elevated text-ritual-green border border-ritual-green/30' : 'text-gray-500 hover:text-gray-300'}`}
            >
              {m === 'deposit' ? '+ Add RITUAL' : '− Remove RITUAL'}
            </button>
          ))}
        </div>

        {/* Amount input */}
        <div className="mb-5">
          <div className="flex justify-between mb-1">
            <label className="text-xs text-gray-500 uppercase tracking-wider">
              {mode === 'deposit' ? 'Amount to deposit' : 'Shares to redeem'}
            </label>
            <button
              onClick={() => {
                if (mode === 'deposit') setAmount(formatUnits(walletBalance, 18));
                else setAmount(formatUnits(userShares, 18));
              }}
              className="text-xs text-ritual-green hover:underline"
            >
              Max ({mode === 'deposit'
                ? `${walletF.toFixed(4)} RITUAL`
                : `${sharesF.toFixed(4)} shares`})
            </button>
          </div>
          <input
            type="number"
            min="0"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full bg-ritual-surface border border-gray-700 rounded-lg px-4 py-3 text-gray-200
                       focus:outline-none focus:border-ritual-green/50 transition-colors"
          />
          {mode === 'withdraw' && userShares > 0n && (
            <p className="text-xs text-gray-600 mt-1.5">
              Redeeming {sharesF > 0 && amount ? ((parseFloat(amount) / sharesF) * valueF).toFixed(4) : '—'} RITUAL
            </p>
          )}
        </div>

        {error && (
          <div className="mb-4 px-3 py-2 bg-red-500/10 border border-red-500/30 rounded-lg text-xs text-red-400">
            {error}
          </div>
        )}

        <button
          onClick={mode === 'deposit' ? handleDeposit : handleWithdraw}
          disabled={!isConnected || loading || !amount || (mode === 'withdraw' && userShares === 0n)}
          className="w-full py-3.5 rounded-lg border border-ritual-green text-ritual-green font-semibold
                     hover:bg-ritual-green/10 glow-green transition-all disabled:opacity-40"
        >
          {!isConnected ? 'Connect Wallet'
            : loading ? 'Processing…'
            : mode === 'deposit' ? 'Add to Pool'
            : 'Remove from Pool'}
        </button>
      </div>

      <div className="w-full max-w-lg bg-ritual-elevated border border-gray-800 rounded-xl p-5 text-center">
        <p className="text-xs text-gray-500">
          Ritpool holds a single-asset native RITUAL reserve. Shares represent a pro-rata claim on the pool.
          Deposits and withdrawals are instant. Pool value grows as yield is added by the protocol.
        </p>
      </div>

      {successTx && (
        <TxSuccessModal txHash={successTx.hash} action={successTx.action} onClose={() => setSuccessTx(null)} />
      )}
    </div>
  );
}
