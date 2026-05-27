'use client';

import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/cn';
import type { OfframpStep } from '@/types/stellaramp';

export interface TimelineStage {
  id: OfframpStep;
  label: string;
  description: string;
  estimatedSeconds: number;
}

const DEFAULT_STAGES: TimelineStage[] = [
  { id: 'initiating',          label: 'Initiating',            description: 'Preparing transaction details',          estimatedSeconds: 5  },
  { id: 'awaiting-signature',  label: 'Awaiting Signature',    description: 'Approve in your wallet',                 estimatedSeconds: 30 },
  { id: 'submitting',          label: 'Submitting',            description: 'Broadcasting to Stellar network',        estimatedSeconds: 10 },
  { id: 'processing',          label: 'Bridge Transfer',       description: 'Allbridge processing on Base chain',     estimatedSeconds: 120 },
  { id: 'settling',            label: 'Fiat Payout',           description: 'Paycrest settling to bank account',      estimatedSeconds: 60 },
  { id: 'success',             label: 'Complete',              description: 'Funds sent to your bank',                estimatedSeconds: 0  },
];

const ACTIVE_STEPS: OfframpStep[] = [
  'initiating', 'awaiting-signature', 'submitting', 'processing', 'settling', 'success',
];

interface TransactionTimelineProps {
  step: OfframpStep;
  errorMessage?: string;
  stages?: TimelineStage[];
  /** Poll interval in ms for simulated real-time updates (default 1000) */
  pollInterval?: number;
}

function useStageCountdown(step: OfframpStep, stages: TimelineStage[]): number {
  const [remaining, setRemaining] = useState(0);
  const prevStep = useRef<OfframpStep | null>(null);

  useEffect(() => {
    const stage = stages.find((s) => s.id === step);
    const eta = stage?.estimatedSeconds ?? 0;

    if (step === prevStep.current) return;
    prevStep.current = step;
    setRemaining(eta);
    if (eta === 0) return;

    const id = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) { clearInterval(id); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [step, stages]);

  return remaining;
}

function formatEta(seconds: number): string {
  if (seconds <= 0) return '';
  if (seconds < 60) return `~${seconds}s`;
  return `~${Math.ceil(seconds / 60)}m`;
}

export function TransactionTimeline({
  step,
  errorMessage,
  stages = DEFAULT_STAGES,
  pollInterval = 1000,
}: TransactionTimelineProps) {
  const eta = useStageCountdown(step, stages);
  const isError = step === 'error';
  const isSuccess = step === 'success';
  const isTerminal = isError || isSuccess;

  const activeIdx = ACTIVE_STEPS.indexOf(step);

  return (
    <div
      role="region"
      aria-label="Transaction timeline"
      aria-live="polite"
      className="w-full space-y-1"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <p className="text-[10px] text-[#777777] tracking-[0.2em] uppercase">Transaction Progress</p>
        {!isTerminal && eta > 0 && (
          <span className="text-[10px] text-[#c9a962] tracking-widest tabular-nums">
            {formatEta(eta)} remaining
          </span>
        )}
        {isError && (
          <span className="text-[10px] text-red-400 tracking-widest uppercase">Failed</span>
        )}
        {isSuccess && (
          <span className="text-[10px] text-green-400 tracking-widest uppercase">Complete</span>
        )}
      </div>

      {/* Stage list */}
      <div className="relative">
        {/* Vertical connector line */}
        <div className="absolute left-[7px] top-3 bottom-3 w-px bg-[#222222]" aria-hidden="true" />

        <div className="space-y-0">
          {stages.map((stage, idx) => {
            const stageActiveIdx = ACTIVE_STEPS.indexOf(stage.id);
            const isCompleted = !isError && activeIdx > stageActiveIdx;
            const isActive = !isError && activeIdx === stageActiveIdx;
            const isPending = isError ? false : activeIdx < stageActiveIdx;
            const isErrorStage = isError && stageActiveIdx === activeIdx;

            return (
              <div
                key={stage.id}
                className={cn(
                  'relative flex items-start gap-3 px-3 py-2 transition-all duration-300',
                  isActive && 'bg-[#c9a962]/5 border-l-2 border-[#c9a962] -ml-px',
                  isErrorStage && 'bg-red-500/5 border-l-2 border-red-500 -ml-px',
                  !isActive && !isErrorStage && 'border-l-2 border-transparent -ml-px'
                )}
              >
                {/* Stage dot */}
                <div className="relative z-10 mt-0.5 flex-shrink-0 flex items-center justify-center w-3.5 h-3.5">
                  {isCompleted ? (
                    <div className="w-3 h-3 rounded-full bg-green-500 flex items-center justify-center">
                      <svg className="w-2 h-2 text-white" fill="none" viewBox="0 0 8 8">
                        <path stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" d="M1.5 4l1.5 1.5 3-3" />
                      </svg>
                    </div>
                  ) : isActive ? (
                    <div className="w-3 h-3 rounded-full bg-[#c9a962] animate-pulse" />
                  ) : isErrorStage ? (
                    <div className="w-3 h-3 rounded-full bg-red-500" />
                  ) : (
                    <div className="w-3 h-3 rounded-full bg-[#2a2a2a] border border-[#333333]" />
                  )}
                </div>

                {/* Stage content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={cn(
                        'text-[10px] tracking-[0.1em] uppercase font-semibold',
                        isCompleted && 'text-green-500/70',
                        isActive && 'text-white',
                        isErrorStage && 'text-red-400',
                        isPending && 'text-[#444444]'
                      )}
                    >
                      {stage.label}
                    </span>
                    {isPending && stage.estimatedSeconds > 0 && (
                      <span className="text-[9px] text-[#444444] tabular-nums flex-shrink-0">
                        {formatEta(stage.estimatedSeconds)}
                      </span>
                    )}
                  </div>
                  {(isActive || isErrorStage) && (
                    <p className="text-[10px] text-[#777777] mt-0.5 leading-relaxed">
                      {isErrorStage && errorMessage ? errorMessage : stage.description}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Error detail box */}
      {isError && errorMessage && (
        <div className="mt-2 p-3 bg-red-500/10 border border-red-500/20">
          <p className="text-[10px] text-red-400 font-mono break-words leading-relaxed">
            {errorMessage}
          </p>
        </div>
      )}
    </div>
  );
}
