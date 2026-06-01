import { useMemo } from 'react';
import { useConferenceOptions, useRegistrationPeriods } from '../hooks/useRegistration';
import { ErrorBanner, LoadingSpinner, SectionLabel, formatKRW } from './Shared';
import type {
  MemberType,
  ConferenceOption,
  RegistrationTierKey,
  RegistrationCategory,
  RegistrationPeriods,
} from '../types';
import {
  TECH_TOUR_OPTION_IDS,
  REGISTRATION_CATEGORIES,
  REG_TIER_CONFIG,
} from '../types';

interface StepTechnicalTourProps {
  memberType: MemberType;
  selectedTier: RegistrationTierKey;
  selectedCategory: RegistrationCategory | null;
  selectedRegOptionId: string | null;
  quantities: Record<string, number>;
  onQuantityChange: (optionId: string, qty: number) => void;
  waitlistedOptionIds: string[];
  onNext: () => void;
  onBack: () => void;
}

function deadlineLabel(periods: RegistrationPeriods | undefined, tier: RegistrationTierKey): string {
  const p =
    tier === 'PRE_REGISTRATION'
      ? periods?.preRegistration
      : tier === 'EARLY_BIRD'
      ? periods?.earlyBird
      : periods?.regular;
  if (!p?.endDate) return 'TBD';
  const d = new Date(p.endDate + 'T00:00:00');
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long' });
}

export const StepTechnicalTour = ({
  memberType,
  selectedTier,
  selectedCategory,
  selectedRegOptionId,
  quantities,
  onQuantityChange,
  waitlistedOptionIds,
  onNext,
  onBack,
}: StepTechnicalTourProps) => {
  const { data: options, isLoading, error, refetch } = useConferenceOptions(memberType);
  const { data: periods } = useRegistrationPeriods();
  const tierCfg = REG_TIER_CONFIG[selectedTier];

  const registrationOption = useMemo(
    () => (selectedRegOptionId ? options?.find((o) => o.id === selectedRegOptionId) : undefined),
    [options, selectedRegOptionId]
  );
  const registrationPrice = registrationOption?.price ?? 0;
  const categoryLabel = selectedCategory
    ? REGISTRATION_CATEGORIES.find((c) => c.key === selectedCategory)?.label
    : null;

  // Fetch only the technical tour options
  const tourOptions = useMemo(() => {
    if (!options) return [];
    return TECH_TOUR_OPTION_IDS.map((id) => options.find((o) => o.id === id))
      .filter((o): o is ConferenceOption => o !== undefined);
  }, [options]);

  const activeTourId = useMemo(() => {
    const found = TECH_TOUR_OPTION_IDS.find((id) => (quantities[id] ?? 0) > 0);
    return found || 'NONE';
  }, [quantities]);

  const handleSelectTour = (tourId: string) => {
    // Reset all tour options to 0
    TECH_TOUR_OPTION_IDS.forEach((id) => {
      onQuantityChange(id, id === tourId ? 1 : 0);
    });
  };

  // Pricing calculation
  const selectedTourOption = useMemo(() => {
    return tourOptions.find((o) => o.id === activeTourId);
  }, [tourOptions, activeTourId]);

  const tourPrice = selectedTourOption ? selectedTourOption.price : 0;

  // Other additional programs currently checked (for sidebar subtotal)
  const additionalOptionsPrice = useMemo(() => {
    if (!options) return 0;
    // Get all options checked in quantities except registration and technical tours
    const tourSet = new Set<string>(TECH_TOUR_OPTION_IDS);
    let sum = 0;
    Object.entries(quantities).forEach(([id, qty]) => {
      if (qty > 0 && id !== selectedRegOptionId && !tourSet.has(id)) {
        const opt = options.find((o) => o.id === id);
        if (opt && !waitlistedOptionIds.includes(id)) {
          sum += opt.price * qty;
        }
      }
    });
    return sum;
  }, [options, quantities, selectedRegOptionId, waitlistedOptionIds]);

  const grandTotal = registrationPrice + additionalOptionsPrice + tourPrice;

  if (isLoading) {
    return (
      <div className="flex min-h-[300px] items-center justify-center">
        <LoadingSpinner label="Loading technical tours…" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <ErrorBanner message="Failed to load technical tours." onRetry={() => refetch()} />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-0 lg:grid-cols-[1fr_300px]">
      {/* Left — technical tours list */}
      <div className="border-b border-slate-100 p-6 lg:border-b-0 lg:border-r">
        <SectionLabel>Technical Tours (Optional)</SectionLabel>
        <p className="text-xs text-ink-muted mb-5 leading-relaxed">
          Select one of the technical tours scheduled for 19th September 2026. These are optional, and you can only select one. All fees are shown in KRW.
        </p>

        <div className="space-y-3">
          {/* None option */}
          <button
            type="button"
            onClick={() => handleSelectTour('NONE')}
            className={`w-full text-left rounded-xl border p-4 transition ${
              activeTourId === 'NONE'
                ? 'border-gold-soft bg-gold-tint ring-1 ring-gold-soft'
                : 'border-slate-200 bg-white hover:border-gold/40'
            }`}
          >
            <div className="flex items-center gap-3">
              <span
                className={`flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full border transition ${
                  activeTourId === 'NONE' ? 'border-gold' : 'border-slate-300'
                }`}
              >
                {activeTourId === 'NONE' && <span className="h-2 w-2 rounded-full bg-gold" />}
              </span>
              <div>
                <p className="text-sm font-semibold text-ink">I will not attend the Technical Tour</p>
                <p className="text-[11px] text-ink-faint mt-0.5">Select if you do not wish to participate in any technical tour.</p>
              </div>
            </div>
          </button>

          {/* Tour options */}
          {tourOptions.map((opt) => {
            const selected = activeTourId === opt.id;
            const isSoldOut = opt.available === false;
            const isDisabled = isSoldOut;

            return (
              <button
                key={opt.id}
                type="button"
                disabled={isDisabled}
                onClick={() => handleSelectTour(opt.id)}
                className={`w-full text-left rounded-xl border p-4 transition ${
                  selected
                    ? 'border-gold-soft bg-gold-tint ring-1 ring-gold-soft'
                    : isDisabled
                    ? 'border-slate-100 bg-slate-50 opacity-60 cursor-not-allowed'
                    : 'border-slate-200 bg-white hover:border-gold/40'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <span
                      className={`mt-1 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full border transition ${
                        selected ? 'border-gold' : 'border-slate-300'
                      }`}
                    >
                      {selected && <span className="h-2 w-2 rounded-full bg-gold" />}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-ink truncate">{opt.nameEn}</p>
                      <p className="text-[11px] text-ink-muted mt-1 leading-relaxed whitespace-pre-line">
                        {opt.description}
                      </p>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className={`text-sm font-semibold ${selected ? 'text-gold' : 'text-ink-muted'}`}>
                      {formatKRW(opt.price)}
                    </p>
                    {isSoldOut && (
                      <span className="inline-block mt-1 rounded bg-red-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-red-500">
                        Sold Out
                      </span>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Right sidebar */}
      <div className="sticky top-0 z-20 lg:top-6 lg:self-start bg-gold-tint p-6 flex flex-col max-h-screen lg:max-h-[calc(100vh-3rem)] overflow-y-auto">
        {/* Registration section */}
        <SectionLabel>Registration</SectionLabel>
        <div className="mb-4 rounded-lg border border-slate-200 bg-white p-4">
          {categoryLabel ? (
            <div>
              <p className="text-sm font-semibold text-gold">{categoryLabel}</p>
              <p className="text-xs text-ink-faint mt-0.5">
                {tierCfg.label} · Deadline {deadlineLabel(periods, selectedTier)}
              </p>
              <div className="mt-2 flex justify-between items-baseline">
                <span className="text-[11px] text-ink-faint">Registration fee</span>
                <span className="text-sm font-semibold text-ink">{formatKRW(registrationPrice)}</span>
              </div>
            </div>
          ) : (
            <p className="text-xs text-ink-faint">No category selected.</p>
          )}
        </div>

        {/* Selected Tour section */}
        <SectionLabel>Selected Tour</SectionLabel>
        <div className="mb-4 rounded-lg border border-slate-200 bg-white p-4">
          {selectedTourOption ? (
            <div>
              <p className="text-sm font-semibold text-gold truncate">{selectedTourOption.nameEn}</p>
              <div className="mt-2 flex justify-between items-baseline">
                <span className="text-[11px] text-ink-faint">Tour fee</span>
                <span className="text-sm font-semibold text-ink">{formatKRW(tourPrice)}</span>
              </div>
            </div>
          ) : (
            <p className="text-xs text-ink-faint">No tour selected.</p>
          )}
        </div>

        {/* Grand total */}
        <div className="mb-4 rounded-lg border border-gold-soft bg-white p-4 flex justify-between items-baseline">
          <span className="label-section">TOTAL</span>
          <span className="amount-total">{formatKRW(grandTotal)}</span>
        </div>

        <div className="mt-auto space-y-2">
          <button onClick={onNext} className="btn-primary">
            Continue
          </button>
          <button
            onClick={onBack}
            className="w-full rounded-lg border border-slate-200 py-2 text-sm text-ink-muted transition hover:bg-slate-50"
          >
            Back
          </button>
        </div>
      </div>
    </div>
  );
};
