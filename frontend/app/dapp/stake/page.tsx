'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAccount } from 'wagmi';
import { formatUnits, parseUnits } from 'viem';
import { TxSuccessModal } from '@/components/TxSuccessModal';
import { useRitStake, useRitualBalance } from '@/hooks/useContracts';

export default function RitstakePage() {
  const { isConnected } = useAccount();
  const { stake, unstake, claimReward, getStakeInfo } = useRitStake();
  const { getBalance } = useRitualBalance();

  const [stakeAmt, setStakeAmt] = useState('');
  const [unstakeAmt, setUnstakeAmt] = useState('');
  const [staked, setStaked] = useState(0n);
  const [pending, setPending] = useState(0n);
  const [walletBalance, setWalletBalance] = useState(0n);
  const [loading, setLoading] = useState<'stake' | 'unstake' | 'claim' | null>(null);
  const [error, setError] = useState('');
  const [successTx, setSuccessTx] = useState<{ hash: string; action: string } | null>(null);

  // Refs so interval always calls the latest version without re-registering
  const getStakeInfoRef = useRef(getStakeInfo);
  const getBalanceRef   = useRef(getBalance);
  getStakeInfoRef.current = getStakeInfo;
  getBalanceRef.current   = getBalance;

  const load = useCallback(async () => {
    try {
      const [info, bal] = await Promise.all([
        getStakeInfoRef.current(),
        getBalanceRef.current(),
      ]);
      setStaked(info.amount);
      setPending(info.pending);
      setWalletBalance(bal);
    } catch { /* rpc not ready */ }
  }, []); // stable — reads current values via refs

  useEffect(() => {
    if (!isConnected) {
      setStaked(0n);
      setPending(0n);
      setWalletBalance(0n);
      return;
    }
    load();
    const id = setInterval(load, 10_000);
    return () => clearInterval(id);
  }, [isConnected, load]);

  const handleStake = async () => {
    if (!stakeAmt) return;
    setLoading('stake'); setError('');
    try {
      const hash = await stake(parseUnits(stakeAmt, 18));
      setSuccessTx({ hash, action: `Staked ${stakeAmt} RITUAL` });
      setStakeAmt('');
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Stake failed');
    } finally { setLoading(null); }
  };

  const handleUnstake = async () => {
    if (!unstakeAmt) return;
    setLoading('unstake'); setError('');
    try {
      const hash = await unstake(parseUnits(unstakeAmt, 18));
      setSuccessTx({ hash, action: `Unstaked ${unstakeAmt} RITUAL + rewards` });
      setUnstakeAmt('');
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Unstake failed');
    } finally { setLoading(null); }
  };

  const handleClaim = async () => {
    setLoading('claim'); setError('');
    try {
      const hash = await claimReward();
      setSuccessTx({ hash, action: `Claimed ${pendingF.toFixed(6)} RITUAL rewards` });
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Claim failed');
    } finally { setLoading(null); }
  };

  const stakedF  = parseFloat(formatUnits(staked, 18));
  const pendingF = parseFloat(formatUnits(pending, 18));
  const balanceF = parseFloat(formatUnits(walletBalance, 18));

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="w-full max-w-md text-center">
        <h2 className="font-display text-2xl text-gray-100 mb-1">Ritstake</h2>
        <p className="text-xs text-gray-600 mt-1">Stake RITUAL. Earn RITUAL rewards every block (~350ms).</p>
      </div>

      <div className="w-full max-w-md bg-ritual-elevated border border-gray-800 rounded-xl p-5 relative">
        <div className="absolute inset-0 rounded-xl pointer-events-none border border-ritual-green/10" />

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-5">
          <div className="bg-ritual-surface rounded-lg p-3 text-center">
            <div className="text-xs text-gray-500 mb-1">Wallet</div>
            <div className="font-mono text-sm text-gray-300">
              {balanceF.toLocaleString(undefined, { maximumFractionDigits: 2 })}
            </div>
            <div className="text-xs text-gray-600">RITUAL</div>
          </div>
          <div className="bg-ritual-surface rounded-lg p-3 text-center">
            <div className="text-xs text-gray-500 mb-1">Staked</div>
            <div className="font-mono text-sm text-gray-200">
              {stakedF.toLocaleString(undefined, { maximumFractionDigits: 4 })}
            </div>
            <div className="text-xs text-gray-600">RITUAL</div>
          </div>
          <div className="bg-ritual-surface rounded-lg p-3 text-center">
            <div className="text-xs text-gray-500 mb-1">Pending</div>
            <div className="font-mono text-sm text-ritual-green">{pendingF.toFixed(6)}</div>
            <div className="text-xs text-gray-600">RITUAL</div>
          </div>
        </div>

        {/* Stake row */}
        <div className="flex gap-2 mb-3">
          <div className="flex-1">
            <div className="flex justify-between mb-1">
              <span className="text-xs text-gray-500 uppercase tracking-wider">Stake RITUAL</span>
              <button
                onClick={() => setStakeAmt(formatUnits(walletBalance, 18))}
                className="text-xs text-ritual-green hover:underline"
              >
                Max ({balanceF.toFixed(2)})
              </button>
            </div>
            <input
              type="number" min="0" placeholder="0.00" value={stakeAmt}
              onChange={(e) => setStakeAmt(e.target.value)}
              className="w-full bg-ritual-surface border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-gray-200
                         focus:outline-none focus:border-ritual-green/50 transition-colors"
            />
          </div>
          <button
            onClick={handleStake}
            disabled={!isConnected || loading !== null || !stakeAmt || walletBalance === 0n}
            className="self-end px-5 py-2.5 border border-ritual-green text-ritual-green text-sm font-semibold rounded-lg
                       hover:bg-ritual-green/10 transition-colors disabled:opacity-40"
          >
            {loading === 'stake' ? '…' : 'Stake'}
          </button>
        </div>

        {/* Unstake row — only visible when staked */}
        {staked > 0n && (
          <div className="flex gap-2 mb-3">
            <div className="flex-1">
              <div className="flex justify-between mb-1">
                <span className="text-xs text-gray-500 uppercase tracking-wider">Unstake RITUAL</span>
                <button
                  onClick={() => setUnstakeAmt(formatUnits(staked, 18))}
                  className="text-xs text-ritual-green hover:underline"
                >
                  Max ({stakedF.toFixed(4)})
                </button>
              </div>
              <input
                type="number" min="0" placeholder="0.00" value={unstakeAmt}
                onChange={(e) => setUnstakeAmt(e.target.value)}
                className="w-full bg-ritual-surface border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-gray-200
                           focus:outline-none focus:border-ritual-green/50 transition-colors"
              />
            </div>
            <button
              onClick={handleUnstake}
              disabled={!isConnected || loading !== null || !unstakeAmt}
              className="self-end px-5 py-2.5 border border-gray-700 text-gray-400 text-sm font-semibold rounded-lg
                         hover:border-gray-500 transition-colors disabled:opacity-40"
            >
              {loading === 'unstake' ? '…' : 'Unstake'}
            </button>
          </div>
        )}

        {/* Claim row */}
        {pending > 0n && (
          <button
            onClick={handleClaim}
            disabled={!isConnected || loading !== null}
            className="w-full py-2.5 border border-dashed border-yellow-500/50 text-yellow-400 text-sm
                       rounded-lg hover:bg-yellow-500/10 transition-colors disabled:opacity-40 mb-3"
          >
            {loading === 'claim' ? 'Claiming…' : `Claim ${pendingF.toFixed(6)} RITUAL`}
          </button>
        )}

        {/* Faucet link */}
        <a
          href="https://faucet.ritualfoundation.org/"
          target="_blank"
          rel="noopener noreferrer"
          className="block w-full py-2 text-xs text-center text-gray-500 hover:text-ritual-green transition-colors"
        >
          Get RITUAL from faucet ↗
        </a>

        {error && (
          <div className="mt-3 px-3 py-2 bg-red-500/10 border border-red-500/30 rounded-lg text-xs text-red-400">
            {error}
          </div>
        )}
      </div>

      <div className="w-full max-w-md bg-ritual-elevated border border-gray-800 rounded-xl p-5 text-center">
        <p className="text-xs text-gray-500">
          Rewards accumulate every block (~350ms on Ritual Chain). Unstaking claims all pending rewards automatically.
          Native RITUAL rewards are funded from the protocol treasury.
        </p>
      </div>

      {successTx && (
        <TxSuccessModal txHash={successTx.hash} action={successTx.action} onClose={() => setSuccessTx(null)} />
      )}
    </div>
  );
}
