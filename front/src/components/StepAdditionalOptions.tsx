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

  const isSelected = (id: string) => (quantities[id] ?? 0) > 0;

  const subtotal = useMemo(() =>
    additionalOptions.reduce((sum, o) => sum + (isSelected(o.id) ? o.price : 0), 0),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [additionalOptions, quantities]
  );

  const selectedCount = additionalOptions.filter((o) => isSelected(o.id)).length;

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
              const selected = isSelected(opt.id);
              const isSoldOut = opt.available === false;
              const toggle = () => {
                if (isSoldOut) return;
                onQuantityChange(opt.id, selected ? 0 : 1);
              };

              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={toggle}
                  disabled={isSoldOut}
                  className={`w-full text-left rounded-xl border p-4 transition ${
                    selected
                      ? 'border-teal-300 bg-teal-50/60 ring-1 ring-teal-200'
                      : isSoldOut
                      ? 'border-slate-100 bg-slate-50 opacity-50 cursor-not-allowed'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      {/* checkbox indicator */}
                      <span
                        className={`mt-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded border transition ${
                          selected ? 'bg-teal-500 border-teal-500' : 'border-slate-300 bg-white'
                        }`}
                        aria-hidden="true"
                      >
                        {selected && (
                          <svg className="h-2.5 w-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </span>
                      <p className={`text-sm font-semibold truncate ${selected ? 'text-teal-800' : 'text-slate-800'}`}>
                        {opt.nameEn}
                      </p>
                      {isSoldOut && (
                        <span className="rounded bg-red-50 px-1.5 py-0.5 text-[10px] font-semibold text-red-500">
                          Sold Out
                        </span>
                      )}
                    </div>
                    <p className={`flex-shrink-0 text-sm font-bold ${selected ? 'text-teal-600' : 'text-slate-600'}`}>
                      {opt.isFree ? 'Free' : `${formatKRW(opt.price)} / person`}
                    </p>
                  </div>
                </button>
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
              .filter((o) => isSelected(o.id))
              .map((o) => (
                <div key={o.id} className="flex justify-between text-xs">
                  <span className="text-slate-500 truncate pr-2">{o.nameEn}</span>
                  <span className="flex-shrink-0 font-medium text-slate-700">
                    {o.isFree ? 'Free' : formatKRW(o.price)}
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
            Continue to registration
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
