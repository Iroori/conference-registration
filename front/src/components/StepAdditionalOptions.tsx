import { useMemo } from 'react';
import { useConferenceOptions } from '../hooks/useRegistration';
import { ErrorBanner, LoadingSpinner, SectionLabel, formatKRW } from './Shared';
import type { MemberType, ConferenceOption } from '../types';
import { ADDITIONAL_OPTION_IDS } from '../types';

interface StepAdditionalOptionsProps {
  memberType: MemberType;
  quantities: Record<string, number>;
  onQuantityChange: (optionId: string, qty: number) => void;
  onNext: () => void;
  onBack: () => void;
}

const MAX_QTY = 10;

const QuantityStepper = ({
  value,
  min = 0,
  max = MAX_QTY,
  onChange,
  disabled,
}: {
  value: number;
  min?: number;
  max?: number;
  onChange: (v: number) => void;
  disabled?: boolean;
}) => (
  <div className="flex items-center gap-1">
    <button
      type="button"
      onClick={() => onChange(Math.max(min, value - 1))}
      disabled={disabled || value <= min}
      className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
    >
      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14" />
      </svg>
    </button>
    <span className="w-7 text-center text-sm font-semibold text-slate-700">{value}</span>
    <button
      type="button"
      onClick={() => onChange(Math.min(max, value + 1))}
      disabled={disabled || value >= max}
      className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
    >
      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14M5 12h14" />
      </svg>
    </button>
  </div>
);

export const StepAdditionalOptions = ({
  memberType,
  quantities,
  onQuantityChange,
  onNext,
  onBack,
}: StepAdditionalOptionsProps) => {
  const { data: options, isLoading, error, refetch } = useConferenceOptions(memberType);

  const additionalOptions: ConferenceOption[] = useMemo(() => {
    if (!options) return [];
    return (ADDITIONAL_OPTION_IDS as readonly string[])
      .map((id) => options.find((o) => o.id === id))
      .filter((o): o is ConferenceOption => o !== undefined);
  }, [options]);

  const subtotal = useMemo(() =>
    additionalOptions.reduce((sum, o) => sum + o.price * (quantities[o.id] ?? 0), 0),
    [additionalOptions, quantities]
  );

  const selectedCount = Object.values(quantities).filter((q) => q > 0).length;

  if (isLoading) {
    return (
      <div className="flex min-h-[300px] items-center justify-center">
        <LoadingSpinner label="Loading programs…" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <ErrorBanner message="Failed to load additional options." onRetry={() => refetch()} />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-0 lg:grid-cols-[1fr_300px]">
      {/* Left — options list */}
      <div className="border-b border-slate-100 p-6 lg:border-b-0 lg:border-r">
        <SectionLabel>Additional Programs</SectionLabel>
        <p className="text-xs text-slate-400 mb-5">
          Select additional programs and social events. Use the +/- buttons to choose quantity.
          All options are optional.
        </p>

        {additionalOptions.length === 0 ? (
          <p className="text-sm text-slate-400 py-8 text-center">
            No additional programs available for your registration type.
          </p>
        ) : (
          <div className="space-y-3">
            {additionalOptions.map((opt) => {
              const qty = quantities[opt.id] ?? 0;
              const isSoldOut = opt.available === false;
              const remainingCapacity =
                opt.maxCapacity != null ? opt.maxCapacity - (opt.currentCount ?? 0) : null;
              const effectiveMax = remainingCapacity != null
                ? Math.min(MAX_QTY, remainingCapacity)
                : MAX_QTY;
              const isSelected = qty > 0;

              return (
                <div
                  key={opt.id}
                  className={`rounded-xl border p-4 transition ${
                    isSelected
                      ? 'border-teal-300 bg-teal-50/60 ring-1 ring-teal-200'
                      : isSoldOut
                      ? 'border-slate-100 bg-slate-50 opacity-50'
                      : 'border-slate-200 bg-white'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-0.5">
                        <p className={`text-sm font-semibold ${isSelected ? 'text-teal-800' : 'text-slate-800'}`}>
                          {opt.nameEn}
                        </p>
                        {isSoldOut && (
                          <span className="rounded bg-red-50 px-1.5 py-0.5 text-[10px] font-semibold text-red-500">
                            Sold Out
                          </span>
                        )}
                        {!isSoldOut && remainingCapacity != null && (
                          <span className="rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-600">
                            {remainingCapacity} spots left
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 leading-relaxed">{opt.description}</p>
                      {isSelected && (
                        <p className="text-xs font-medium text-teal-600 mt-1.5">
                          Subtotal: {formatKRW(opt.price * qty)}
                        </p>
                      )}
                    </div>
                    <div className="flex-shrink-0 flex flex-col items-end gap-2">
                      <p className={`text-sm font-bold ${isSelected ? 'text-teal-600' : 'text-slate-600'}`}>
                        {opt.isFree ? 'Free' : `${formatKRW(opt.price)} / person`}
                      </p>
                      <QuantityStepper
                        value={qty}
                        max={effectiveMax}
                        onChange={(v) => onQuantityChange(opt.id, v)}
                        disabled={isSoldOut}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Right sidebar */}
      <div className="bg-teal-50/40 p-6 flex flex-col">
        <SectionLabel>Programs Selected</SectionLabel>

        {selectedCount === 0 ? (
          <p className="text-xs text-slate-400 mb-4">No additional programs selected.</p>
        ) : (
          <div className="mb-4 space-y-2">
            {additionalOptions
              .filter((o) => (quantities[o.id] ?? 0) > 0)
              .map((o) => (
                <div key={o.id} className="flex justify-between text-xs">
                  <span className="text-slate-500 truncate pr-2">
                    {o.nameEn} × {quantities[o.id]}
                  </span>
                  <span className="flex-shrink-0 font-medium text-slate-700">
                    {o.isFree ? 'Free' : formatKRW(o.price * (quantities[o.id] ?? 0))}
                  </span>
                </div>
              ))}
            <div className="border-t border-slate-200 pt-2 flex justify-between text-sm">
              <span className="font-semibold text-slate-700">Programs subtotal</span>
              <span className="font-bold text-teal-600">{formatKRW(subtotal)}</span>
            </div>
          </div>
        )}

        <p className="text-[11px] text-slate-400 mb-6">
          Additional charges will be combined with your registration fee on the summary screen.
        </p>

        <div className="mt-auto space-y-2">
          <button onClick={onNext} className="btn-primary">
            Continue to Invitation Letter
          </button>
          <button
            onClick={onBack}
            className="w-full rounded-lg border border-slate-200 py-2 text-sm text-slate-500 transition hover:bg-slate-50"
          >
            Back
          </button>
        </div>
      </div>
    </div>
  );
};
