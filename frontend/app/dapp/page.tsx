'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAccount } from 'wagmi';
import { formatEther, parseEther } from 'viem';
import { TxSuccessModal } from '@/components/TxSuccessModal';
import { useRitAgent } from '@/hooks/useRitAgent';
import { useRitualBalance } from '@/hooks/useContracts';
import { EXPLORER_URL } from '@/lib/chain';

const DATA_FEEDS = [
  {
    id: 'eth-price',
    label: 'ETH Price',
    url: 'https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd',
    extract: (body: string) => {
      try { return `$${JSON.parse(body)?.ethereum?.usd?.toLocaleString()}`; } catch { return body.slice(0, 80); }
    },
  },
  {
    id: 'btc-price',
    label: 'BTC Price',
    url: 'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd',
    extract: (body: string) => {
      try { return `$${JSON.parse(body)?.bitcoin?.usd?.toLocaleString()}`; } catch { return body.slice(0, 80); }
    },
  },
  {
    id: 'eth-gas',
    label: 'ETH Gas',
    url: 'https://api.etherscan.io/api?module=gastracker&action=gasoracle',
    extract: (body: string) => {
      try { const d = JSON.parse(body)?.result; return `${d?.SafeGasPrice} / ${d?.ProposeGasPrice} / ${d?.FastGasPrice} gwei`; } catch { return body.slice(0, 80); }
    },
  },
] as const;

type FeedId = (typeof DATA_FEEDS)[number]['id'];
type FetchState = 'idle' | 'fetching' | 'pending' | 'settled' | 'error';

interface FetchRecord {
  id: string;
  feedLabel: string;
  hash: `0x${string}`;
  state: FetchState;
  value?: string;
  error?: string;
  timestamp: number;
}

export default function RitAgentPage() {
  const { isConnected } = useAccount();
  const { fetchURL, getWalletInfo, depositWallet, withdrawWallet, pollSettlement } = useRitAgent();
  const { getBalance } = useRitualBalance();

  const [selectedFeed, setSelectedFeed] = useState<FeedId>('eth-price');
  const [walletBalance, setWalletBalance] = useState(0n);    // RitualWallet native balance
  const [nativeBalance, setNativeBalance] = useState(0n);   // main wallet native RITUAL
  const [lockUntil, setLockUntil] = useState(0n);
  const [depositAmt, setDepositAmt] = useState('0.05');
  const [withdrawAmt, setWithdrawAmt] = useState('');
  const [depositing, setDepositing] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);
  const [fetchState, setFetchState] = useState<FetchState>('idle');
  const [error, setError] = useState('');
  const [records, setRecords] = useState<FetchRecord[]>([]);
  const [successTx, setSuccessTx] = useState<{ hash: string; action: string } | null>(null);
  const [showWithdraw, setShowWithdraw] = useState(false);

  // Refs so interval always calls the latest version without re-registering
  const getWalletInfoRef = useRef(getWalletInfo);
  const getBalanceRef    = useRef(getBalance);
  getWalletInfoRef.current = getWalletInfo;
  getBalanceRef.current    = getBalance;

  const loadWallet = useCallback(async () => {
    try {
      const [info, native] = await Promise.all([
        getWalletInfoRef.current(),
        getBalanceRef.current(),
      ]);
      setWalletBalance(info.balance);
      setLockUntil(info.lockUntil);
      setNativeBalance(native);
    } catch { /* not connected yet */ }
  }, []); // stable — reads current values via refs

  useEffect(() => {
    if (!isConnected) {
      setWalletBalance(0n);
      setNativeBalance(0n);
      return;
    }
    loadWallet();
    const id = setInterval(loadWallet, 10_000);
    return () => clearInterval(id);
  }, [isConnected, loadWallet]);

  const handleDeposit = async () => {
    setDepositing(true);
    try {
      await depositWallet(depositAmt);
      await loadWallet();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Deposit failed');
    } finally { setDepositing(false); }
  };

  const handleWithdraw = async () => {
    if (!withdrawAmt) return;
    setWithdrawing(true);
    try {
      await withdrawWallet(withdrawAmt);
      setWithdrawAmt('');
      await loadWallet();
      setSuccessTx({ hash: '', action: `Withdrew ${withdrawAmt} RITUAL from RitualWallet` });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Withdraw failed');
    } finally { setWithdrawing(false); }
  };

  const handleFetch = async () => {
    const feed = DATA_FEEDS.find((f) => f.id === selectedFeed)!;
    setError(''); setFetchState('fetching');

    const recordId = `${Date.now()}`;
    const partial: FetchRecord = {
      id: recordId, feedLabel: feed.label,
      hash: '0x' as `0x${string}`, state: 'fetching', timestamp: Date.now(),
    };
    setRecords((r) => [partial, ...r.slice(0, 9)]);

    try {
      const { hash, result, settled } = await fetchURL(feed.url);
      setSuccessTx({ hash, action: `Ritual HTTP: fetched ${feed.label} on-chain` });

      if (settled && result) {
        const value = result.errorMessage ? `Error: ${result.errorMessage}` : feed.extract(result.body);
        setFetchState('settled');
        setRecords((r) => r.map((x) => x.id === recordId ? { ...x, hash, state: 'settled', value } : x));
      } else {
        setFetchState('pending');
        setRecords((r) => r.map((x) => x.id === recordId ? { ...x, hash, state: 'pending' } : x));
        pollSettlement(hash).then(({ result: r2, settled: s2 }) => {
          const value = s2 && r2
            ? (r2.errorMessage ? `Error: ${r2.errorMessage}` : feed.extract(r2.body))
            : 'Settlement timed out';
          setFetchState(s2 ? 'settled' : 'error');
          setRecords((rr) => rr.map((x) => x.id === recordId ? { ...x, state: s2 ? 'settled' : 'error', value } : x));
          loadWallet();
        });
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed';
      setError(msg); setFetchState('error');
      setRecords((r) => r.map((x) => x.id === recordId ? { ...x, state: 'error', error: msg } : x));
    }
  };

  const balanceF   = parseFloat(formatEther(walletBalance));
  const nativeF    = parseFloat(formatEther(nativeBalance));
  const hasBalance = walletBalance >= parseEther('0.005');
  const lockExpired = lockUntil === 0n || lockUntil < BigInt(Math.floor(Date.now() / 1000));

  return (
    <div className="flex flex-col items-center gap-6">
      {/* ── RITUAL balances card ── */}
      <div className="w-full max-w-lg bg-ritual-elevated border border-gray-800 rounded-xl p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-300">Your RITUAL Balances</h3>
          <a
            href="https://faucet.ritualfoundation.org/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-gray-500 hover:text-ritual-green transition-colors"
          >
            Faucet ↗
          </a>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-ritual-surface rounded-lg p-3">
            <div className="text-xs text-gray-500 mb-1">Wallet (native)</div>
            <div className="font-mono text-sm text-gray-200">
              {nativeF.toLocaleString(undefined, { maximumFractionDigits: 4 })}
            </div>
            <div className="text-xs text-gray-600">RITUAL</div>
          </div>
          <div className="bg-ritual-surface rounded-lg p-3">
            <div className="text-xs text-gray-500 mb-1">RitualWallet (native)</div>
            <div className={`font-mono text-sm ${hasBalance ? 'text-ritual-green' : 'text-yellow-400'}`}>
              {balanceF.toLocaleString(undefined, { maximumFractionDigits: 4 })}
            </div>
            <div className="text-xs text-gray-600">RITUAL · for TEE fees</div>
          </div>
        </div>
      </div>

      {/* ── Main RitAgent card ── */}
      <div className="w-full max-w-lg bg-ritual-elevated border border-gray-800 rounded-xl shadow-card p-6 relative">
        <div className="absolute inset-0 rounded-xl pointer-events-none border border-ritual-green/10" />

        <h2 className="font-display text-lg text-gray-100 mb-0.5">RitAgent</h2>
        <p className="text-xs text-gray-500 italic mb-5">on-chain HTTP via Ritual TEE precompile</p>

        {/* RitualWallet deposit / withdraw */}
        <div className={`mb-5 px-4 py-3 rounded-lg border ${hasBalance ? 'border-ritual-green/20 bg-ritual-green/5' : 'border-yellow-500/20 bg-yellow-500/5'}`}>
          <div className="flex items-center justify-between mb-2">
            <div>
              <div className="text-xs text-gray-500 mb-0.5">RitualWallet balance</div>
              <div className={`font-mono font-semibold text-sm ${hasBalance ? 'text-ritual-green' : 'text-yellow-400'}`}>
                {balanceF.toFixed(4)} RITUAL
              </div>
            </div>
            {walletBalance > 0n && (
              <button
                onClick={() => setShowWithdraw((v) => !v)}
                className="text-xs text-gray-500 hover:text-gray-300 transition-colors border border-gray-700 rounded px-2 py-1"
              >
                {showWithdraw ? 'Cancel' : 'Withdraw'}
              </button>
            )}
          </div>

          {showWithdraw ? (
            <div className="flex items-center gap-2 mt-2">
              <input
                type="number" step="0.001" min="0.001"
                placeholder="Amount to withdraw"
                value={withdrawAmt}
                onChange={(e) => setWithdrawAmt(e.target.value)}
                className="flex-1 bg-ritual-surface border border-gray-700 rounded px-2 py-1 text-xs text-gray-200"
              />
              <button
                onClick={() => setWithdrawAmt(formatEther(walletBalance))}
                className="text-xs text-ritual-green hover:underline"
              >Max</button>
              <button
                onClick={handleWithdraw}
                disabled={!isConnected || withdrawing || !withdrawAmt || !lockExpired}
                className="px-3 py-1.5 border border-gray-600 text-gray-300 text-xs font-semibold rounded-lg
                           hover:bg-gray-700/50 transition-colors disabled:opacity-40"
                title={!lockExpired ? 'Lock period has not expired yet' : ''}
              >
                {withdrawing ? '…' : 'Withdraw'}
              </button>
            </div>
          ) : !hasBalance ? (
            <div className="flex items-center gap-2 mt-2">
              <input
                type="number" step="0.01" min="0.01" value={depositAmt}
                onChange={(e) => setDepositAmt(e.target.value)}
                className="w-20 bg-ritual-surface border border-gray-700 rounded px-2 py-1 text-xs text-gray-200 text-center"
              />
              <button
                onClick={handleDeposit}
                disabled={!isConnected || depositing}
                className="px-3 py-1.5 border border-yellow-500/50 text-yellow-400 text-xs font-semibold rounded-lg
                           hover:bg-yellow-500/10 transition-colors disabled:opacity-40"
              >
                {depositing ? '…' : 'Deposit RITUAL'}
              </button>
            </div>
          ) : null}
        </div>

        {/* Data feed selector */}
        <div className="mb-5">
          <label className="text-xs text-gray-500 uppercase tracking-wider mb-2 block">Data Feed</label>
          <div className="flex gap-2 flex-wrap">
            {DATA_FEEDS.map((f) => (
              <button
                key={f.id}
                onClick={() => setSelectedFeed(f.id as FeedId)}
                className={`px-3 py-1.5 rounded-lg text-sm font-semibold border transition-colors
                  ${selectedFeed === f.id
                    ? 'border-ritual-green text-ritual-green bg-ritual-green/10'
                    : 'border-gray-700 text-gray-400 hover:border-gray-500'}`}
              >
                {f.label}
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-600 mt-2 font-mono truncate">
            {DATA_FEEDS.find((f) => f.id === selectedFeed)?.url}
          </p>
        </div>

        {error && (
          <div className="mb-4 px-3 py-2 bg-red-500/10 border border-red-500/30 rounded-lg text-xs text-red-400">
            {error}
          </div>
        )}

        <button
          onClick={handleFetch}
          disabled={!isConnected || fetchState === 'fetching' || !hasBalance}
          className="w-full py-3.5 rounded-lg border border-ritual-green text-ritual-green font-semibold
                     hover:bg-ritual-green/10 glow-green transition-all disabled:opacity-40"
        >
          {!isConnected ? 'Connect Wallet'
            : !hasBalance ? 'Deposit RITUAL to RitualWallet first'
            : fetchState === 'fetching' ? 'Submitting to Ritual Chain…'
            : fetchState === 'pending' ? 'Waiting for TEE settlement…'
            : '⚡ Fetch On-Chain via TEE'}
        </button>

        <p className="text-center text-xs text-gray-600 mt-3">
          Powered by Ritual HTTP precompile (0x0801) · TEE-verified execution
        </p>
      </div>

      {/* Fetch history */}
      {records.length > 0 && (
        <div className="w-full max-w-lg bg-ritual-elevated border border-gray-800 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-gray-300 mb-3">On-Chain Fetch History</h3>
          <div className="space-y-2">
            {records.map((rec) => (
              <div key={rec.id} className="bg-ritual-surface rounded-lg px-4 py-3 flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className={`w-2 h-2 rounded-full flex-shrink-0
                      ${rec.state === 'settled' ? 'bg-ritual-green'
                      : rec.state === 'pending' ? 'bg-yellow-400 animate-pulse'
                      : rec.state === 'fetching' ? 'bg-blue-400 animate-pulse'
                      : 'bg-red-500'}`} />
                    <span className="text-xs font-semibold text-gray-300">{rec.feedLabel}</span>
                    <span className="text-xs text-gray-600">
                      {new Date(rec.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  {rec.value && (
                    <p className="text-sm font-mono text-ritual-green truncate">{rec.value}</p>
                  )}
                  {rec.state === 'pending' && (
                    <p className="text-xs text-yellow-400">TEE settling…</p>
                  )}
                  {rec.error && (
                    <p className="text-xs text-red-400 truncate">{rec.error}</p>
                  )}
                </div>
                {rec.hash && rec.hash !== '0x' && (
                  <a
                    href={`${EXPLORER_URL}/tx/${rec.hash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-gray-600 hover:text-ritual-green transition-colors flex-shrink-0"
                  >
                    ↗ Tx
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Info panel */}
      <div className="w-full max-w-lg bg-ritual-elevated border border-gray-800 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-gray-300 mb-2">How It Works</h3>
        <ol className="text-xs text-gray-500 space-y-1.5 list-decimal list-inside">
          <li>Your wallet sends a tx to Ritual's HTTP precompile (0x0801) on-chain</li>
          <li>A TEE-verified executor picks up the job and performs the HTTP request off-chain</li>
          <li>The result is settled back on-chain in the transaction receipt (spcCalls)</li>
          <li>RitualWallet covers the executor fee — no separate gas needed</li>
        </ol>
        <p className="text-xs text-gray-600 mt-3">
          This is native to Ritual Chain. No oracle contract, no Chainlink, no centralized feed — the HTTP call itself is part of the transaction.
        </p>
      </div>

      {successTx && (
        <TxSuccessModal txHash={successTx.hash} action={successTx.action} onClose={() => setSuccessTx(null)} />
      )}
    </div>
  );
}
