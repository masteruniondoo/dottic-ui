'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { decodeEventLog, formatEther } from 'viem';
import {
  useAccount,
  useConnect,
  useDisconnect,
  useReadContract,
  useReadContracts,
  useSwitchChain,
  useWaitForTransactionReceipt,
  useWriteContract,
} from 'wagmi';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { polkadotHub } from '@/lib/wagmi';

const GRID_SIZE = 10;
const TILE_COUNT = GRID_SIZE * GRID_SIZE;
const IMAGE_ID = 'camel';
const POLKADOT_HUB_CHAIN_ID = polkadotHub.id;

const CONTRACT_ADDRESS_ENV = process.env.NEXT_PUBLIC_DOTTIC_CONTRACT_ADDRESS;

if (!CONTRACT_ADDRESS_ENV) {
  throw new Error('Missing NEXT_PUBLIC_DOTTIC_CONTRACT_ADDRESS');
}

const CONTRACT_ADDRESS = CONTRACT_ADDRESS_ENV as `0x${string}`;
const CONTRACT_ADDRESS_LOWER = CONTRACT_ADDRESS.toLowerCase();

const ABI = [
  {
    inputs: [],
    name: 'ACTION_PRICE',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'openedCount',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'OPEN_THRESHOLD',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'contractBalance',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'solvedByGuess',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'gameEnded',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'uint256', name: 'pixelId', type: 'uint256' }],
    name: 'openPixel',
    outputs: [],
    stateMutability: 'payable',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    name: 'pixelOpened',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'string', name: 'guess', type: 'string' }],
    name: 'guessSolution',
    outputs: [],
    stateMutability: 'payable',
    type: 'function',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'address', name: 'player', type: 'address' },
      { indexed: false, internalType: 'string', name: 'guess', type: 'string' },
      { indexed: false, internalType: 'bool', name: 'correct', type: 'bool' },
    ],
    name: 'GuessSubmitted',
    type: 'event',
  },
  {
    inputs: [],
    name: 'finalizeByLuck',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
] as const;

function getTileId(row: number, col: number) {
  return row * GRID_SIZE + col;
}

export default function Page() {
  type GuessFeedback = { kind: 'error' | 'success'; text: string } | null;

  const { address, isConnected, chainId: connectedChainId } = useAccount();
  const { connect, connectors, isPending: isConnectPending } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChainAsync, isPending: isSwitchPending } = useSwitchChain();

  const { data: actionPrice } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: ABI,
    functionName: 'ACTION_PRICE',
  });

  const { data: openedCount, refetch: refetchOpenedCount } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: ABI,
    functionName: 'openedCount',
  });

  const { data: openThreshold, refetch: refetchOpenThreshold } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: ABI,
    functionName: 'OPEN_THRESHOLD',
  });

  const { data: contractBalance, refetch: refetchContractBalance } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: ABI,
    functionName: 'contractBalance',
  });

  const { data: solvedByGuess, refetch: refetchSolvedByGuess } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: ABI,
    functionName: 'solvedByGuess',
  });

  const { data: gameEnded, refetch: refetchGameEnded } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: ABI,
    functionName: 'gameEnded',
  });

  const [guess, setGuess] = useState('');
  const [status, setStatus] = useState('Connect wallet to start opening tiles.');
  const [refreshNonce, setRefreshNonce] = useState(0);
  const [pendingAction, setPendingAction] = useState<'open' | 'guess' | 'finalize' | null>(null);
  const [guessFeedback, setGuessFeedback] = useState<GuessFeedback>(null);

  const {
    data: txHash,
    error: writeError,
    isPending: isWritePending,
    writeContract,
  } = useWriteContract();

  const { data: txReceipt, isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  useEffect(() => {
    if (writeError) {
      const message =
        'shortMessage' in writeError && typeof writeError.shortMessage === 'string'
          ? writeError.shortMessage
          : writeError.message;
      setStatus(message || 'Transaction failed.');
      setPendingAction(null);
    }
  }, [writeError]);

  useEffect(() => {
    if (isWritePending) {
      setStatus('Waiting for wallet confirmation...');
    }
  }, [isWritePending]);

  useEffect(() => {
    if (isConfirming) {
      setStatus('Transaction submitted. Waiting for confirmation...');
    }
  }, [isConfirming]);

  const isBusy = isConnectPending || isSwitchPending || isWritePending || isConfirming;
  const connector = connectors[0];

  const tiles = useMemo(() => {
    const result: number[] = [];
    for (let row = 0; row < GRID_SIZE; row += 1) {
      for (let col = 0; col < GRID_SIZE; col += 1) {
        result.push(getTileId(row, col));
      }
    }
    return result;
  }, []);

  const revealAllTiles = Boolean(solvedByGuess || gameEnded);
  const openedCountNumber = Number(openedCount ?? 0);
  const openThresholdNumber = Number(openThreshold ?? 70);
  const canFinalizeByLuck = !revealAllTiles && openedCountNumber >= openThresholdNumber;
  const priceLabel = actionPrice !== undefined ? `${formatEther(actionPrice)} DOT` : 'Loading...';
  const progressLabel = revealAllTiles ? `${TILE_COUNT} / ${TILE_COUNT}` : `${openedCountNumber} / ${TILE_COUNT}`;
  const thresholdLabel = `${openThresholdNumber} / ${TILE_COUNT}`;
  const balanceLabel = contractBalance !== undefined ? `${formatEther(contractBalance)} DOT` : 'Loading...';

  const tileSrc = (tileId: number) =>
    `/.netlify/functions/get-tile?imageId=${IMAGE_ID}&tileId=${tileId}&contract=${CONTRACT_ADDRESS_LOWER}&revealed=${revealAllTiles ? 1 : 0}&v=${refreshNonce}`;

  const { data: tileOpenedResults, refetch: refetchTileOpened } = useReadContracts({
    contracts: tiles.map((tileId) => ({
      address: CONTRACT_ADDRESS,
      abi: ABI,
      functionName: 'pixelOpened',
      args: [BigInt(tileId)],
    })),
    query: {
      enabled: tiles.length > 0,
    },
  });

  const openedTileMap = useMemo(() => {
    return tiles.reduce<Record<number, boolean>>((acc, tileId, index) => {
      acc[tileId] = Boolean(tileOpenedResults?.[index]?.result);
      return acc;
    }, {});
  }, [tileOpenedResults, tiles]);

  useEffect(() => {
    if (!isConfirmed) return;

    const syncState = async () => {
      setRefreshNonce((value) => value + 1);

      await Promise.all([
        refetchOpenedCount(),
        refetchOpenThreshold(),
        refetchContractBalance(),
        refetchGameEnded(),
        refetchTileOpened(),
      ]);

      const solvedResult = await refetchSolvedByGuess();
      const solvedNow = Boolean(solvedResult.data);

      if (pendingAction === 'guess') {
        setGuess('');

        if (txReceipt?.status === 'reverted') {
          setGuessFeedback({ kind: 'error', text: 'Incorrect guess. Try again.' });
          setPendingAction(null);
          return;
        }

        let guessWasCorrect: boolean | null = null;

        for (const log of txReceipt?.logs ?? []) {
          try {
            const decoded = decodeEventLog({
              abi: ABI,
              data: log.data,
              topics: log.topics,
            });

            if (decoded.eventName === 'GuessSubmitted') {
              guessWasCorrect = Boolean(decoded.args.correct);
              break;
            }
          } catch {
            // Ignore non-matching logs.
          }
        }

        if (guessWasCorrect === false) {
          setGuessFeedback({ kind: 'error', text: 'Incorrect guess. Try again.' });
        } else if (guessWasCorrect === true || solvedNow) {
          setGuessFeedback({ kind: 'success', text: 'Correct guess. All tiles are revealed.' });
        } else {
          setGuessFeedback({ kind: 'error', text: 'Incorrect guess. Try again.' });
        }
      } else {
        setStatus('Transaction confirmed. Grid refreshed.');
      }

      setPendingAction(null);
    };

    void syncState();
  }, [
    isConfirmed,
    pendingAction,
    txReceipt,
    refetchContractBalance,
    refetchGameEnded,
    refetchOpenedCount,
    refetchOpenThreshold,
    refetchSolvedByGuess,
    refetchTileOpened,
  ]);

  const ensurePolkadotChain = async () => {
    if (connectedChainId === POLKADOT_HUB_CHAIN_ID) return true;
    try {
      setStatus('Confirm network switch to Polkadot Hub in your wallet.');
      const switchedChain = await switchChainAsync({ chainId: POLKADOT_HUB_CHAIN_ID });
      if (switchedChain.id !== POLKADOT_HUB_CHAIN_ID) {
        setStatus('Wrong chain selected. Switch to Polkadot Hub and retry.');
        return false;
      }
      return true;
    } catch {
      setStatus('Network switch was cancelled. Please switch network and retry.');
      return false;
    }
  };

  const handleOpenPixel = async (tileId: number) => {
    if (revealAllTiles) {
      setStatus('Game is finished. All tiles are revealed.');
      return;
    }
    if (openedTileMap[tileId]) {
      setStatus(`Tile ${tileId} is already opened.`);
      return;
    }
    if (!isConnected) {
      setStatus('Connect wallet first.');
      return;
    }
    if (!actionPrice) {
      setStatus('Action price is still loading.');
      return;
    }

    const isRightChain = await ensurePolkadotChain();
    if (!isRightChain) return;

    writeContract({
      chainId: POLKADOT_HUB_CHAIN_ID,
      address: CONTRACT_ADDRESS,
      abi: ABI,
      functionName: 'openPixel',
      args: [BigInt(tileId)],
      value: actionPrice,
    });
    setPendingAction('open');
  };

  const handleGuessSolution = async () => {
    if (revealAllTiles) {
      setStatus('Game is already finished.');
      return;
    }
    const value = guess.trim();
    if (!value) {
      setStatus('Enter a guess before submitting.');
      return;
    }
    if (!isConnected) {
      setStatus('Connect wallet first.');
      return;
    }
    if (!actionPrice) {
      setStatus('Action price is still loading.');
      return;
    }

    const isRightChain = await ensurePolkadotChain();
    if (!isRightChain) return;

    setGuessFeedback(null);
    writeContract({
      chainId: POLKADOT_HUB_CHAIN_ID,
      address: CONTRACT_ADDRESS,
      abi: ABI,
      functionName: 'guessSolution',
      args: [value],
      value: actionPrice,
    });
    setPendingAction('guess');
  };

  const handleFinalizeByLuck = async () => {
    if (revealAllTiles) {
      setStatus('Game is already finished.');
      return;
    }
    if (!isConnected) {
      setStatus('Connect wallet first.');
      return;
    }
    if (!canFinalizeByLuck) {
      setStatus(`Finalize by luck is available after ${openThresholdNumber} opened tiles.`);
      return;
    }

    const isRightChain = await ensurePolkadotChain();
    if (!isRightChain) return;

    writeContract({
      chainId: POLKADOT_HUB_CHAIN_ID,
      address: CONTRACT_ADDRESS,
      abi: ABI,
      functionName: 'finalizeByLuck',
    });
    setPendingAction('finalize');
  };

  return (
    <main className="min-h-screen bg-white text-neutral-900">
      <div className="mx-auto max-w-6xl px-4 py-6 md:px-6">
        <header className="mb-6 flex flex-wrap items-center justify-end gap-3">
          <div className="flex items-center gap-2">
            {isConnected ? (
              <Button
                variant="outline"
                onClick={() => disconnect()}
                disabled={isBusy}
                className="border-violet-800 text-violet-900 hover:bg-violet-100"
              >
                Disconnect {address ? `${address.slice(0, 6)}...${address.slice(-4)}` : ''}
              </Button>
            ) : (
              <Button
                onClick={() => connector && connect({ connector })}
                disabled={!connector || isBusy}
                className="bg-violet-800 text-white hover:bg-violet-700"
              >
                {isConnectPending ? 'Connecting...' : 'Connect Wallet'}
              </Button>
            )}
          </div>
        </header>

        <section className="mb-4 grid gap-3 lg:grid-cols-[auto_1fr]">
          <div className="flex items-center justify-center p-3">
            <Image
              src="/Logo.png"
              alt="DOTTIC logo"
              width={120}
              height={120}
              className="h-[120px] w-[120px] rounded-md object-contain"
              priority
            />
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            <div className="rounded-xl border border-violet-800/70 bg-white p-3">
              <div className="text-xs text-violet-800/70">Game Balance</div>
              <div className="font-medium">{balanceLabel}</div>
            </div>
            <div className="rounded-xl border border-violet-800/70 bg-white p-3">
              <div className="text-xs text-violet-800/70">Action Price</div>
              <div className="font-medium">{priceLabel}</div>
            </div>
            <div className="rounded-xl border border-violet-800/70 bg-white p-3">
              <div className="text-xs text-violet-800/70">Opened</div>
              <div className="font-medium">{progressLabel}</div>
              <div className="mt-1 text-[11px] text-violet-800/70">
                At {thresholdLabel} opened, winner will be selected by luck and the full image is revealed.
              </div>
            </div>
            <div className="rounded-xl border border-violet-800/70 bg-white p-3">
              <div className="mb-2 text-xs text-violet-800/70">Guess the image</div>
              <div className="flex gap-2">
                <Input
                  value={guess}
                  onChange={(event) => {
                    setGuess(event.target.value);
                    if (guessFeedback) setGuessFeedback(null);
                  }}
                  placeholder={canFinalizeByLuck ? 'Finalize phase reached' : 'Type your guess'}
                  disabled={isBusy || canFinalizeByLuck}
                  className="h-9 border-violet-800/70 text-sm focus-visible:ring-violet-700/40"
                />
                <Button
                  onClick={canFinalizeByLuck ? handleFinalizeByLuck : handleGuessSolution}
                  disabled={isBusy || revealAllTiles}
                  className="h-9 bg-violet-800 px-3 text-xs text-white hover:bg-violet-700"
                >
                  {canFinalizeByLuck ? 'Finalize by luck' : 'Submit'}
                </Button>
              </div>
              {guessFeedback ? (
                <div
                  className={`mt-2 rounded-md border px-2 py-1 text-xs ${
                    guessFeedback.kind === 'error'
                      ? 'border-red-200 bg-red-50 text-red-700'
                      : 'border-emerald-200 bg-emerald-50 text-emerald-700'
                  }`}
                >
                  {guessFeedback.text}
                </div>
              ) : null}
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-violet-800/70 bg-white p-3">
          <div className="mb-2 text-sm font-medium">Board (10x10)</div>
          <div className="grid grid-cols-10 gap-1">
            {tiles.map((tileId) => (
              <button
                key={tileId}
                type="button"
                className="relative overflow-hidden rounded border border-violet-800/70 bg-white"
                onClick={() => handleOpenPixel(tileId)}
                disabled={isBusy || !isConnected || revealAllTiles || openedTileMap[tileId]}
                title={openedTileMap[tileId] ? `Tile ${tileId} is already opened` : `Open tile ${tileId}`}
              >
                <Image
                  src={tileSrc(tileId)}
                  alt={`Tile ${tileId}`}
                  width={96}
                  height={96}
                  className="aspect-square w-full object-cover"
                  unoptimized
                />
                <span className="pointer-events-none absolute left-1 top-1 rounded bg-black/60 px-1 text-[10px] text-white">
                  {openedTileMap[tileId] || revealAllTiles ? 'OPENED' : tileId}
                </span>
              </button>
            ))}
          </div>
        </section>

        <section className="mt-4 rounded-xl border border-violet-800/70 bg-white p-3 text-sm text-violet-900">
          {status}
        </section>
      </div>
    </main>
  );
}
