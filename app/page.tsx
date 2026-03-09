'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { formatEther } from 'viem';
import {
  useAccount,
  useConnect,
  useDisconnect,
  useReadContract,
  useSwitchChain,
  useWaitForTransactionReceipt,
  useWriteContract,
} from 'wagmi';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const GRID_SIZE = 10;
const TILE_COUNT = GRID_SIZE * GRID_SIZE;
const IMAGE_ID = 'camel';
const POLKADOT_HUB_TESTNET_CHAIN_ID = 420420417;

const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_DOTTIC_CONTRACT_ADDRESS as `0x${string}` | undefined;

if (!CONTRACT_ADDRESS) {
  throw new Error('Missing NEXT_PUBLIC_DOTTIC_CONTRACT_ADDRESS');
}

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
    inputs: [{ internalType: 'string', name: 'guess', type: 'string' }],
    name: 'guessSolution',
    outputs: [],
    stateMutability: 'payable',
    type: 'function',
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

  const {
    data: txHash,
    error: writeError,
    isPending: isWritePending,
    writeContract,
  } = useWriteContract();

  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  useEffect(() => {
    if (writeError) {
      const message =
        'shortMessage' in writeError && typeof writeError.shortMessage === 'string'
          ? writeError.shortMessage
          : writeError.message;
      setStatus(message || 'Transaction failed.');
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

  useEffect(() => {
    if (isConfirmed) {
      setStatus('Transaction confirmed. Grid refreshed.');
      setRefreshNonce((value) => value + 1);
      refetchOpenedCount();
      refetchOpenThreshold();
      refetchContractBalance();
      refetchSolvedByGuess();
      refetchGameEnded();
    }
  }, [
    isConfirmed,
    refetchContractBalance,
    refetchGameEnded,
    refetchOpenedCount,
    refetchOpenThreshold,
    refetchSolvedByGuess,
  ]);

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
  const priceLabel = actionPrice !== undefined ? `${formatEther(actionPrice)} PAS` : 'Loading...';
  const progressLabel = revealAllTiles ? `${TILE_COUNT} / ${TILE_COUNT}` : `${openedCountNumber} / ${TILE_COUNT}`;
  const thresholdLabel = `${openThresholdNumber} / ${TILE_COUNT}`;
  const balanceLabel = contractBalance !== undefined ? `${formatEther(contractBalance)} PAS` : 'Loading...';

  const tileSrc = (tileId: number) =>
    `/.netlify/functions/get-tile?imageId=${IMAGE_ID}&tileId=${tileId}&contract=${CONTRACT_ADDRESS.toLowerCase()}&revealed=${revealAllTiles ? 1 : 0}&v=${refreshNonce}`;

  const ensurePolkadotChain = async () => {
    if (connectedChainId === POLKADOT_HUB_TESTNET_CHAIN_ID) return true;
    try {
      setStatus('Confirm network switch to Polkadot Hub TestNet in your wallet.');
      const switchedChain = await switchChainAsync({ chainId: POLKADOT_HUB_TESTNET_CHAIN_ID });
      if (switchedChain.id !== POLKADOT_HUB_TESTNET_CHAIN_ID) {
        setStatus('Wrong chain selected. Switch to Polkadot Hub TestNet and retry.');
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
      chainId: POLKADOT_HUB_TESTNET_CHAIN_ID,
      address: CONTRACT_ADDRESS,
      abi: ABI,
      functionName: 'openPixel',
      args: [BigInt(tileId)],
      value: actionPrice,
    });
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

    writeContract({
      chainId: POLKADOT_HUB_TESTNET_CHAIN_ID,
      address: CONTRACT_ADDRESS,
      abi: ABI,
      functionName: 'guessSolution',
      args: [value],
      value: actionPrice,
    });
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
      chainId: POLKADOT_HUB_TESTNET_CHAIN_ID,
      address: CONTRACT_ADDRESS,
      abi: ABI,
      functionName: 'finalizeByLuck',
    });
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
                  onChange={(event) => setGuess(event.target.value)}
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
                disabled={isBusy || !isConnected || revealAllTiles}
                title={`Open tile ${tileId}`}
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
                  {tileId}
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
