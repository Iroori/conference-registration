import React from 'react';
import type { PaymentStatus } from '../types';

interface ErrorBannerProps {
  message: string;
  onRetry?: () => void;
}

export const ErrorBanner = ({ message, onRetry }: ErrorBannerProps) => (
  <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4">
    <svg className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
    </svg>
    <div className="flex-1">
      <p className="text-sm font-medium text-red-800">{message}</p>
    </div>
    {onRetry && (
      <button onClick={onRetry} className="text-xs font-medium text-red-600 underline hover:text-red-800">
        Retry
      </button>
    )}
  </div>
);

interface LoadingSpinnerProps {
  label?: string;
  size?: 'sm' | 'md';
}

export const LoadingSpinner = ({ label, size = 'md' }: LoadingSpinnerProps) => (
  <div className="flex items-center gap-2">
    <svg
      className={`animate-spin text-gold ${size === 'sm' ? 'h-4 w-4' : 'h-5 w-5'}`}
      fill="none" viewBox="0 0 24 24"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
    {label && <span className="text-sm text-ink-muted">{label}</span>}
  </div>
);

const STATUS_MAP: Record<PaymentStatus, { label: string; classes: string }> = {
  COMPLETED: { label: 'Completed',  classes: 'bg-gold-soft text-gold border-gold-soft' },
  PENDING:   { label: 'Pending',    classes: 'bg-amber-50 text-amber-700 border-amber-200' },
  CANCELLED: { label: 'Cancelled',  classes: 'bg-red-50 text-red-700 border-red-200' },
  FAILED:    { label: 'Failed',     classes: 'bg-slate-100 text-slate-500 border-slate-200' },
};

export const StatusPill = ({ status }: { status: PaymentStatus }) => {
  const { label, classes } = STATUS_MAP[status];
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium tracking-wide ${classes}`}>
      {label}
    </span>
  );
};

export const formatKRW = (amount: number) =>
  new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(amount);

export const SectionLabel = ({ children }: { children: React.ReactNode }) => (
  <p className="mb-3 label-section">{children}</p>
);

interface StepProgressProps {
  currentStep: number;
  stepLabels: string[];
}

export const StepProgress = ({ currentStep, stepLabels }: StepProgressProps) => (
  <div className="flex items-center gap-1">
    {stepLabels.map((label, i) => {
      const stepNum = i + 1;
      const isDone = stepNum < currentStep;
      const isCur = stepNum === currentStep;
      return (
        <React.Fragment key={stepNum}>
          <div className="flex items-center gap-1.5">
            <div
              className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-semibold transition-all ${
                isDone ? 'bg-gold text-navy' :
                isCur  ? 'bg-white text-navy' :
                         'border border-white/30 text-white/50'
              }`}
            >
              {isDone ? (
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
              ) : stepNum}
            </div>
            <span className={`hidden text-[10px] uppercase tracking-[0.1em] sm:inline ${isCur || isDone ? 'text-gold' : 'text-white/50'}`}>
              {label}
            </span>
          </div>
          {i < stepLabels.length - 1 && (
            <div className={`mx-1 h-px w-4 ${isDone ? 'bg-gold' : 'bg-white/20'}`} />
          )}
        </React.Fragment>
      );
    })}
  </div>
);
