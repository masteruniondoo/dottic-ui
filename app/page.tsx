'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { formatEther } from 'viem';
import {
  useAccount,
  useReadContract,
  useReadContracts,
  useWriteContract,
  useWaitForTransactionReceipt,
} from 'wagmi';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

const CONTRACT_ADDRESS = '0xBE4D1F87b57bA9780a837348e39f6b39693A3F94' as const;

const ABI = [
  {
    inputs: [
      { internalType: 'uint256', name: '_actionPrice', type: 'uint256' },
      { internalType: 'bytes32', name: '_solutionHash', type: 'bytes32' },
    ],
    stateMutability: 'nonpayable',
    type: 'constructor',
  },
  { inputs: [], name: 'AnswerDoesNotMatchHash', type: 'error' },
  { inputs: [], name: 'EmptyGuess', type: 'error' },
  { inputs: [], name: 'GameAlreadyEnded', type: 'error' },
  { inputs: [], name: 'GameNotEnded', type: 'error' },
  { inputs: [], name: 'GuessTooShort', type: 'error' },
  { inputs: [], name: 'InvalidPixelId', type: 'error' },
  { inputs: [], name: 'MustOpenPixelFirst', type: 'error' },
  { inputs: [], name: 'NoEligibleOpeners', type: 'error' },
  { inputs: [], name: 'NotOwner', type: 'error' },
  { inputs: [], name: 'PixelAlreadyOpened', type: 'error' },
  { inputs: [], name: 'ThresholdNotReached', type: 'error' },
  { inputs: [], name: 'WrongPayment', type: 'error' },
  {
    anonymous: false,
    inputs: [{ indexed: false, internalType: 'string', name: 'answer', type: 'string' }],
    name: 'AnswerRevealed',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'address', name: 'winner', type: 'address' },
      { indexed: false, internalType: 'uint256', name: 'amount', type: 'uint256' },
      { indexed: false, internalType: 'string', name: 'guess', type: 'string' },
    ],
    name: 'GameWonByGuess',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'address', name: 'winner', type: 'address' },
      { indexed: false, internalType: 'uint256', name: 'amount', type: 'uint256' },
    ],
    name: 'GameWonByLuck',
    type: 'event',
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
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'address', name: 'player', type: 'address' },
      { indexed: true, internalType: 'uint256', name: 'pixelId', type: 'uint256' },
      { indexed: false, internalType: 'uint256', name: 'openedCount', type: 'uint256' },
    ],
    name: 'PixelOpened',
    type: 'event',
  },
  { stateMutability: 'payable', type: 'fallback' },
  {
    inputs: [],
    name: 'ACTION_PRICE',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'GRID_HEIGHT',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'GRID_WIDTH',
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
    name: 'OWNER',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'SOLUTION_HASH',
    outputs: [{ internalType: 'bytes32', name: '', type: 'bytes32' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'TOTAL_PIXELS',
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
    inputs: [{ internalType: 'uint256', name: 'x', type: 'uint256' }, { internalType: 'uint256', name: 'y', type: 'uint256' }],
    name: 'coordinatesToPixelId',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'pure',
    type: 'function',
  },
  { inputs: [], name: 'finalizeByLuck', outputs: [], stateMutability: 'nonpayable', type: 'function' },
  {
    inputs: [],
    name: 'gameEnded',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'getOpeners',
    outputs: [{ internalType: 'address[]', name: '', type: 'address[]' }],
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
    inputs: [{ internalType: 'address', name: '', type: 'address' }],
    name: 'isOpener',
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
    inputs: [],
    name: 'openedCount',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'openerCount',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
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
    inputs: [{ internalType: 'address', name: '', type: 'address' }],
    name: 'pixelsOpenedByPlayer',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'string', name: 'answer', type: 'string' }],
    name: 'revealAnswer',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'revealedAnswer',
    outputs: [{ internalType: 'string', name: '', type: 'string' }],
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
    name: 'winner',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  { stateMutability: 'payable', type: 'receive' },
] as const;

function shortAddress(address?: string) {
  if (!address) return '—';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function PixelTile({
  id,
  opened,
  disabled,
  onClick,
}: {
  id: number;
  opened: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <motion.button
      whileHover={{ scale: disabled ? 1 : 1.03 }}
      whileTap={{ scale: disabled ? 1 : 0.97 }}
      className={[
        'aspect-square rounded-2xl border text-xs font-medium shadow-sm transition-all',
        opened
          ? 'border-neutral-300 bg-neutral-100 text-neutral-500'
          : 'border-neutral-800 bg-neutral-900 text-white hover:bg-neutral-800',
        disabled ? 'cursor-not-allowed opacity-70' : 'cursor-pointer',
      ].join(' ')}
      onClick={onClick}
      disabled={disabled}
      title={opened ? `Pixel ${id} already opened` : `Open pixel ${id}`}
    >
      {opened ? 'OPEN' : id}
    </motion.button>
  );
}

export default function DotticPuzzlePage() {
  const { address, isConnected } = useAccount();
  const [guess, setGuess] = useState('');
  const [statusText, setStatusText] = useState('Connect your wallet and start opening pixels.');

  const { data: actionPrice, refetch: refetchActionPrice } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: ABI,
    functionName: 'ACTION_PRICE',
  });

  const { data: gridWidth } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: ABI,
    functionName: 'GRID_WIDTH',
  });

  const { data: gridHeight } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: ABI,
    functionName: 'GRID_HEIGHT',
  });

  const { data: totalPixels, refetch: refetchTotalPixels } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: ABI,
    functionName: 'TOTAL_PIXELS',
  });

  const { data: openThreshold, refetch: refetchThreshold } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: ABI,
    functionName: 'OPEN_THRESHOLD',
  });

  const { data: openedCount, refetch: refetchOpenedCount } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: ABI,
    functionName: 'openedCount',
  });

  const { data: gameEnded, refetch: refetchGameEnded } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: ABI,
    functionName: 'gameEnded',
  });

  const { data: contractBalance, refetch: refetchContractBalance } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: ABI,
    functionName: 'contractBalance',
  });

  const { data: openerCount, refetch: refetchOpenerCount } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: ABI,
    functionName: 'openerCount',
  });

  const { data: solvedByGuess, refetch: refetchSolvedByGuess } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: ABI,
    functionName: 'solvedByGuess',
  });

  const { data: winner, refetch: refetchWinner } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: ABI,
    functionName: 'winner',
  });

  const { data: revealedAnswer, refetch: refetchRevealedAnswer } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: ABI,
    functionName: 'revealedAnswer',
  });

  const { data: isOpener, refetch: refetchIsOpener } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: ABI,
    functionName: 'isOpener',
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  const { data: myOpenedCount, refetch: refetchMyOpenedCount } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: ABI,
    functionName: 'pixelsOpenedByPlayer',
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  const pixelIds = useMemo(() => {
    const count = Number(totalPixels ?? 100n);
    return Array.from({ length: count }, (_, i) => i);
  }, [totalPixels]);

  const { data: pixelStates, refetch: refetchPixelStates } = useReadContracts({
    contracts: pixelIds.map((pixelId) => ({
      address: CONTRACT_ADDRESS,
      abi: ABI,
      functionName: 'pixelOpened',
      args: [BigInt(pixelId)],
    })),
    query: {
      enabled: pixelIds.length > 0,
    },
  });

  const openedMap = useMemo(() => {
    return pixelIds.reduce<Record<number, boolean>>((acc, pixelId, idx) => {
      acc[pixelId] = Boolean(pixelStates?.[idx]?.result);
      return acc;
    }, {});
  }, [pixelIds, pixelStates]);

  const columns = Number(gridWidth ?? 10n);
  const rows = Number(gridHeight ?? 10n);

  const progressPercent = useMemo(() => {
    if (!totalPixels || Number(totalPixels) === 0) return 0;
    return (Number(openedCount ?? 0n) / Number(totalPixels)) * 100;
  }, [openedCount, totalPixels]);

  const actionCostLabel = actionPrice ? `${formatEther(actionPrice)} DOT` : '—';
  const prizeLabel = contractBalance ? `${formatEther(contractBalance)} DOT` : '—';

  const {
    data: writeHash,
    error: writeError,
    isPending: isWritePending,
    writeContract,
    reset,
  } = useWriteContract();

  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash: writeHash,
  });

  useEffect(() => {
    if (writeError) {
      setStatusText(writeError.shortMessage || writeError.message || 'Transaction failed.');
    }
  }, [writeError]);

  useEffect(() => {
    if (isWritePending) {
      setStatusText('Waiting for wallet confirmation...');
    }
  }, [isWritePending]);

  useEffect(() => {
    if (isConfirming) {
      setStatusText('Transaction submitted. Waiting for confirmation...');
    }
  }, [isConfirming]);

  useEffect(() => {
    if (isConfirmed) {
      setStatusText('Transaction confirmed. Puzzle state updated.');
      Promise.all([
        refetchActionPrice(),
        refetchTotalPixels(),
        refetchThreshold(),
        refetchOpenedCount(),
        refetchGameEnded(),
        refetchContractBalance(),
        refetchOpenerCount(),
        refetchSolvedByGuess(),
        refetchWinner(),
        refetchRevealedAnswer(),
        refetchPixelStates(),
        refetchIsOpener(),
        refetchMyOpenedCount(),
      ]);
      reset();
    }
  }, [
    isConfirmed,
    refetchActionPrice,
    refetchContractBalance,
    refetchGameEnded,
    refetchIsOpener,
    refetchMyOpenedCount,
    refetchOpenedCount,
    refetchOpenerCount,
    refetchPixelStates,
    refetchRevealedAnswer,
    refetchSolvedByGuess,
    refetchThreshold,
    refetchTotalPixels,
    refetchWinner,
    reset,
  ]);

  const handleOpenPixel = (pixelId: number) => {
    if (!actionPrice) {
      setStatusText('Action price is still loading.');
      return;
    }

    writeContract({
      address: CONTRACT_ADDRESS,
      abi: ABI,
      functionName: 'openPixel',
      args: [BigInt(pixelId)],
      value: actionPrice,
    });
  };

  const handleGuess = () => {
    if (!guess.trim()) {
      setStatusText('Please enter a guess first.');
      return;
    }
    if (!actionPrice) {
      setStatusText('Action price is still loading.');
      return;
    }

    writeContract({
      address: CONTRACT_ADDRESS,
      abi: ABI,
      functionName: 'guessSolution',
      args: [guess.trim()],
      value: actionPrice,
    });
  };

  const handleFinalizeByLuck = () => {
    writeContract({
      address: CONTRACT_ADDRESS,
      abi: ABI,
      functionName: 'finalizeByLuck',
    });
  };

  return (
    <div className="min-h-screen bg-white text-neutral-950">
      <div className="mx-auto max-w-7xl px-4 py-8 md:px-6 lg:px-8">
        <div className="mb-8 grid gap-4 lg:grid-cols-[1.5fr_1fr]">
          <Card className="rounded-3xl border-neutral-200 shadow-sm">
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-3xl font-semibold tracking-tight">Dottic Puzzle</CardTitle>
                  <p className="mt-2 max-w-2xl text-sm text-neutral-600">
                    Open pixels, uncover the image, and submit your best guess on Polkadot Hub testnet.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary" className="rounded-full px-3 py-1 text-xs">
                    Contract {shortAddress(CONTRACT_ADDRESS)}
                  </Badge>
                  <Badge variant="secondary" className="rounded-full px-3 py-1 text-xs">
                    {isConnected ? `Wallet ${shortAddress(address)}` : 'Wallet not connected'}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <StatCard label="Action price" value={actionCostLabel} />
                <StatCard label="Prize pool" value={prizeLabel} />
                <StatCard label="Opened pixels" value={`${openedCount?.toString() ?? '0'} / ${totalPixels?.toString() ?? '100'}`} />
                <StatCard label="Threshold" value={openThreshold?.toString() ?? '—'} />
              </div>

              <div className="mt-6">
                <div className="mb-2 flex items-center justify-between text-sm text-neutral-600">
                  <span>Reveal progress</span>
                  <span>{progressPercent.toFixed(0)}%</span>
                </div>
                <div className="h-3 overflow-hidden rounded-full bg-neutral-100">
                  <motion.div
                    className="h-full rounded-full bg-neutral-900"
                    initial={{ width: 0 }}
                    animate={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-3xl border-neutral-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-xl font-semibold">Game state</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <InfoRow label="Grid" value={`${columns} × ${rows}`} />
              <InfoRow label="Ended" value={gameEnded ? 'Yes' : 'No'} />
              <InfoRow label="Solved by guess" value={solvedByGuess ? 'Yes' : 'No'} />
              <InfoRow label="Unique openers" value={openerCount?.toString() ?? '0'} />
              <InfoRow label="You are opener" value={isOpener ? 'Yes' : 'No'} />
              <InfoRow label="Your opened pixels" value={myOpenedCount?.toString() ?? '0'} />
              <InfoRow label="Winner" value={winner ? shortAddress(winner) : '—'} />
              <InfoRow label="Revealed answer" value={revealedAnswer || 'Not revealed yet'} />
              <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4 text-neutral-700">
                {statusText}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
          <Card className="rounded-3xl border-neutral-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-xl font-semibold">Puzzle grid</CardTitle>
            </CardHeader>
            <CardContent>
              <div
                className="grid gap-2"
                style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
              >
                {pixelIds.map((pixelId) => {
                  const alreadyOpened = openedMap[pixelId];
                  const disabled = !isConnected || !!gameEnded || alreadyOpened || isWritePending || isConfirming;
                  return (
                    <PixelTile
                      key={pixelId}
                      id={pixelId}
                      opened={alreadyOpened}
                      disabled={disabled}
                      onClick={() => handleOpenPixel(pixelId)}
                    />
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card className="rounded-3xl border-neutral-200 shadow-sm">
              <CardHeader>
                <CardTitle className="text-xl font-semibold">Submit a guess</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Input
                  value={guess}
                  onChange={(e) => setGuess(e.target.value)}
                  placeholder="Type your answer"
                  className="h-12 rounded-2xl border-neutral-300"
                />
                <Button
                  onClick={handleGuess}
                  disabled={!isConnected || !!gameEnded || isWritePending || isConfirming}
                  className="h-12 w-full rounded-2xl"
                >
                  Guess and pay {actionCostLabel}
                </Button>
                <p className="text-xs leading-5 text-neutral-500">
                  The contract requires payment for each guess. Only players who opened at least one pixel are eligible to participate.
                </p>
              </CardContent>
            </Card>

            <Card className="rounded-3xl border-neutral-200 shadow-sm">
              <CardHeader>
                <CardTitle className="text-xl font-semibold">Finalize by luck</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button
                  variant="outline"
                  onClick={handleFinalizeByLuck}
                  disabled={!isConnected || !!gameEnded || Number(openedCount ?? 0n) < Number(openThreshold ?? 0n) || isWritePending || isConfirming}
                  className="h-12 w-full rounded-2xl"
                >
                  Finalize lottery flow
                </Button>
                <p className="text-xs leading-5 text-neutral-500">
                  This becomes available only after the open threshold is reached and the game has not already ended.
                </p>
              </CardContent>
            </Card>

            <Card className="rounded-3xl border-neutral-200 shadow-sm">
              <CardHeader>
                <CardTitle className="text-xl font-semibold">Integration notes</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-neutral-600">
                <p>Use Wagmi + Viem in your app layout and add Polkadot Hub testnet to your chain config.</p>
                <p>Replace the contract address constant whenever you redeploy.</p>
                <p>This page already reads live state and writes transactions for opening pixels, guessing, and finalizing.</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-neutral-200 p-4">
      <div className="text-xs uppercase tracking-wide text-neutral-500">{label}</div>
      <div className="mt-2 text-2xl font-semibold tracking-tight">{value}</div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-neutral-100 pb-2">
      <span className="text-neutral-500">{label}</span>
      <span className="max-w-[60%] text-right font-medium text-neutral-900">{value}</span>
    </div>
  );
}
