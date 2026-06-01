import { useMemo } from 'react';
import { useConferenceOptions, useRegistrationPeriods } from '../hooks/useRegistration';
import { ErrorBanner, LoadingSpinner, SectionLabel, formatKRW } from './Shared';
import type {
  MemberType,
  ConferenceOption,
  RegistrationTierKey,
  RegistrationCategory,
  RegistrationPeriods,
  AccompanyingPersonInfo,
} from '../types';
import {
  programOptionIds,
  DECLINE_LABELS,
  isAccompanyingOption,
  REGISTRATION_CATEGORIES,
  REG_TIER_CONFIG,
} from '../types';

interface StepAdditionalOptionsProps {
  memberType: MemberType;
  selectedTier: RegistrationTierKey;
  selectedCategory: RegistrationCategory | null;
  selectedRegOptionId: string | null;
  quantities: Record<string, number>;
  onQuantityChange: (optionId: string, qty: number) => void;
  accompanyingPersons: AccompanyingPersonInfo[];
  onAccompanyingChange: (persons: AccompanyingPersonInfo[]) => void;
  waitlistedOptionIds: string[];
  onWaitlistChange: (ids: string[]) => void;
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

interface CheckRowProps {
  checked: boolean;
  label: string;
  disabled?: boolean;
  onToggle: () => void;
}

const CheckRow = ({ checked, label, disabled, onToggle }: CheckRowProps) => (
  <button
    type="button"
    onClick={onToggle}
    disabled={disabled}
    className={`flex w-full items-start gap-2.5 text-left ${
      disabled ? 'cursor-not-allowed' : ''
    }`}
  >
    <span
      className={`mt-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded border transition ${
        checked ? 'bg-gold border-gold' : 'border-slate-300 bg-white'
      }`}
      aria-hidden="true"
    >
      {checked && (
        <svg className="h-2.5 w-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      )}
    </span>
    <span className="text-xs leading-relaxed text-ink-muted">{label}</span>
  </button>
);

export const StepAdditionalOptions = ({
  memberType,
  selectedTier,
  selectedCategory,
  selectedRegOptionId,
  quantities,
  onQuantityChange,
  accompanyingPersons,
  onAccompanyingChange,
  waitlistedOptionIds,
  onWaitlistChange,
  onNext,
  onBack,
}: StepAdditionalOptionsProps) => {
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

  // Additional options WITHOUT technical tours (technical tours are on a separate step)
  const programOptions: ConferenceOption[] = useMemo(() => {
    if (!options) return [];
    const hiddenIds =
      memberType === 'YOUNG_ENGINEER' ? new Set(['OPT-GALA-DINNER']) : new Set<string>();
    // Exclude technical tours from programOptionIds
    const tourSet = new Set<string>(['OPT-TECH-TOUR-1', 'OPT-TECH-TOUR-2', 'OPT-TECH-TOUR-3']);
    return programOptionIds(selectedTier)
      .filter((id) => !hiddenIds.has(id) && !tourSet.has(id))
      .map((id) => options.find((o) => o.id === id))
      .filter((o): o is ConferenceOption => o !== undefined);
  }, [options, selectedTier, memberType]);

  const isSelected = (id: string) => (quantities[id] ?? 0) > 0;
  const isWaitlisted = (id: string) => waitlistedOptionIds.includes(id);

  const selectedOptions = programOptions.filter((o) => isSelected(o.id));
  const selectedCount = selectedOptions.length;

  // Accompanying Person Option
  const accompOption = programOptions.find((o) => isAccompanyingOption(o.id));
  const accompQty = accompOption ? (quantities[accompOption.id] ?? 0) : 0;

  const subtotal = useMemo(() => {
    return selectedOptions.reduce((sum, o) => {
      if (isWaitlisted(o.id)) return sum; // Waitlisted option is 0 KRW
      const qty = quantities[o.id] ?? 1;
      return sum + o.price * qty;
    }, 0);
  }, [selectedOptions, waitlistedOptionIds, quantities]);

  const grandTotal = registrationPrice + subtotal;

  const accompanyingNameMissing = useMemo(() => {
    if (accompQty === 0) return false;
    if (accompanyingPersons.length !== accompQty) return true;
    return accompanyingPersons.some(
      (p) => p.firstName.trim() === '' || p.lastName.trim() === ''
    );
  }, [accompQty, accompanyingPersons]);

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
        <SectionLabel>Additional Programs (Optional)</SectionLabel>
        <p className="text-xs text-ink-muted mb-5 leading-relaxed">
          These programs are optional — you may continue without selecting any. All fees are shown in KRW.
        </p>

        <div className="space-y-3">
          {programOptions.map((opt) => {
            const selected = isSelected(opt.id);
            const waitlisted = isWaitlisted(opt.id);
            const isSoldOut = opt.available === false;
            const declineLabel = DECLINE_LABELS[opt.id];
            const isAccomp = isAccompanyingOption(opt.id);
            const attendLabel = opt.description || opt.nameEn;

            const handleToggleCheckbox = (checked: boolean) => {
              if (checked) {
                onQuantityChange(opt.id, 1);
              } else {
                onQuantityChange(opt.id, 0);
                onWaitlistChange(waitlistedOptionIds.filter((id) => id !== opt.id));
              }
            };

            const handleToggleWaitlist = (checked: boolean) => {
              if (checked) {
                onQuantityChange(opt.id, 1);
                if (!waitlistedOptionIds.includes(opt.id)) {
                  onWaitlistChange([...waitlistedOptionIds, opt.id]);
                }
              } else {
                onQuantityChange(opt.id, 0);
                onWaitlistChange(waitlistedOptionIds.filter((id) => id !== opt.id));
              }
            };

            return (
              <div
                key={opt.id}
                className={`rounded-xl border p-4 transition ${
                  selected
                    ? 'border-gold-soft bg-gold-tint ring-1 ring-gold-soft'
                    : isSoldOut && !selected
                    ? 'border-slate-100 bg-slate-50'
                    : 'border-slate-200 bg-white'
                }`}
              >
                {/* Header */}
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <p className="text-sm font-semibold text-ink">{opt.nameEn}</p>
                    {isSoldOut && (
                      <span className="rounded bg-red-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-red-500 animate-pulse">
                        Sold Out
                      </span>
                    )}
                    {waitlisted && (
                      <span className="rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-amber-600">
                        Waitlisted (0 KRW)
                      </span>
                    )}
                  </div>
                  <p
                    className={`flex-shrink-0 text-sm font-semibold ${
                      selected ? 'text-gold' : 'text-ink-muted'
                    }`}
                  >
                    {waitlisted ? '0 KRW' : opt.isFree ? 'Free' : formatKRW(opt.price)}
                  </p>
                </div>

                {/* Accompanying Person Quantity and Name Fields */}
                {isAccomp ? (
                  <div className="mt-4 space-y-4">
                    <div className="flex items-center gap-3">
                      <label className="text-xs font-semibold text-ink-muted">Quantity</label>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            const newQty = Math.max(0, accompQty - 1);
                            onQuantityChange(opt.id, newQty);
                            const newPersons = [...accompanyingPersons];
                            while (newPersons.length > newQty) newPersons.pop();
                            onAccompanyingChange(newPersons);
                          }}
                          className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-ink hover:bg-slate-50 font-bold"
                        >
                          -
                        </button>
                        <span className="text-sm font-semibold text-ink w-8 text-center">{accompQty}</span>
                        <button
                          type="button"
                          onClick={() => {
                            const newQty = accompQty + 1;
                            onQuantityChange(opt.id, newQty);
                            const newPersons = [...accompanyingPersons];
                            while (newPersons.length < newQty) {
                              newPersons.push({ firstName: '', lastName: '' });
                            }
                            onAccompanyingChange(newPersons);
                          }}
                          className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-ink hover:bg-slate-50 font-bold"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    {accompQty > 0 && (
                      <div className="space-y-3">
                        <p className="text-xs font-semibold text-ink-muted">Accompanying Person Names</p>
                        {Array.from({ length: accompQty }).map((_, idx) => {
                          const person = accompanyingPersons[idx] || { firstName: '', lastName: '' };
                          return (
                            <div key={idx} className="flex gap-2">
                              <input
                                type="text"
                                required
                                value={person.firstName}
                                onChange={(e) => {
                                  const updated = [...accompanyingPersons];
                                  if (!updated[idx]) updated[idx] = { firstName: '', lastName: '' };
                                  updated[idx].firstName = e.target.value;
                                  onAccompanyingChange(updated);
                                }}
                                className="input-base flex-1"
                                placeholder={`First Name #${idx + 1}`}
                              />
                              <input
                                type="text"
                                required
                                value={person.lastName}
                                onChange={(e) => {
                                  const updated = [...accompanyingPersons];
                                  if (!updated[idx]) updated[idx] = { firstName: '', lastName: '' };
                                  updated[idx].lastName = e.target.value;
                                  onAccompanyingChange(updated);
                                }}
                                className="input-base flex-1"
                                placeholder={`Last Name #${idx + 1}`}
                              />
                            </div>
                          );
                        })}
                        {accompanyingNameMissing && (
                          <p className="text-[11px] text-red-500">
                            Please enter first and last names for all accompanying persons.
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  /* Standard Options (Welcome Reception, Gala Dinner, YE Program) */
                  <div className="mt-3 space-y-2">
                    {isSoldOut ? (
                      /* If sold out, show waitlist option */
                      <CheckRow
                        checked={waitlisted}
                        label="All spots have been filled. Please add me to the waitlist."
                        onToggle={() => handleToggleWaitlist(!waitlisted)}
                      />
                    ) : (
                      /* If available, standard checkboxes */
                      <>
                        <CheckRow
                          checked={selected}
                          label={attendLabel}
                          onToggle={() => handleToggleCheckbox(!selected)}
                        />
                        {declineLabel && (
                          <CheckRow
                            checked={!selected}
                            label={declineLabel}
                            onToggle={() => handleToggleCheckbox(false)}
                          />
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Right sidebar */}
      <div className="order-first lg:order-none sticky top-0 z-20 lg:top-6 lg:self-start bg-gold-tint p-6 flex flex-col max-h-screen lg:max-h-[calc(100vh-3rem)] overflow-y-auto">
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

        {/* Programs Selected section */}
        <SectionLabel>Programs Selected</SectionLabel>
        {selectedCount === 0 ? (
          <p className="text-xs text-ink-faint mb-4">No additional programs selected.</p>
        ) : (
          <div className="mb-4 space-y-2">
            <div className="flex justify-between text-[11px] text-ink-faint">
              <span>Items checked</span>
              <span>{selectedCount} count</span>
            </div>
            {selectedOptions.map((o) => (
              <div key={o.id} className="flex justify-between text-xs">
                <span className="text-ink-muted truncate pr-2">
                  {o.nameEn} {isWaitlisted(o.id) && '(Waitlisted)'}
                </span>
                <span className="flex-shrink-0 font-medium text-ink">
                  {isWaitlisted(o.id) ? '0 KRW' : o.isFree ? 'Free' : formatKRW(o.price * (quantities[o.id] ?? 1))}
                </span>
              </div>
            ))}
            {accompQty > 0 && accompanyingPersons.length > 0 && (
              <div className="space-y-1 mt-1 border-t border-slate-100 pt-1">
                <span className="text-[10px] text-ink-faint block">Accompanying persons:</span>
                {accompanyingPersons.map((p, idx) => (
                  <div key={idx} className="flex justify-between text-[11px] text-ink-muted pl-2">
                    <span>- {p.firstName} {p.lastName}</span>
                  </div>
                ))}
              </div>
            )}
            <div className="border-t border-gold-soft pt-2 flex justify-between items-baseline">
              <span className="text-[11px] text-ink-faint">Programs subtotal</span>
              <span className="text-sm font-semibold text-ink">{formatKRW(subtotal)}</span>
            </div>
          </div>
        )}

        {/* Grand total */}
        <div className="mb-4 rounded-lg border border-gold-soft bg-white p-4 flex justify-between items-baseline">
          <span className="label-section">TOTAL</span>
          <span className="amount-total">{formatKRW(grandTotal)}</span>
        </div>

        <div className="mt-auto space-y-2">
          <button onClick={onNext} disabled={accompanyingNameMissing} className="btn-primary">
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
