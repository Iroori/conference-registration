import { useMemo } from 'react';
import { useConferenceOptions } from '../hooks/useRegistration';
import { ErrorBanner, LoadingSpinner, SectionLabel, formatKRW } from './Shared';
import type {
  MemberType,
  ConferenceOption,
  RegistrationTierKey,
  AccompanyingPersonInfo,
} from '../types';
import { programOptionIds, DECLINE_LABELS, isAccompanyingOption } from '../types';

interface StepAdditionalOptionsProps {
  memberType: MemberType;
  selectedTier: RegistrationTierKey;
  quantities: Record<string, number>;
  onQuantityChange: (optionId: string, qty: number) => void;
  accompanyingPerson: AccompanyingPersonInfo;
  onAccompanyingChange: (info: AccompanyingPersonInfo) => void;
  onNext: () => void;
  onBack: () => void;
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
  quantities,
  onQuantityChange,
  accompanyingPerson,
  onAccompanyingChange,
  onNext,
  onBack,
}: StepAdditionalOptionsProps) => {
  const { data: options, isLoading, error, refetch } = useConferenceOptions(memberType);

  const programOptions: ConferenceOption[] = useMemo(() => {
    if (!options) return [];
    return programOptionIds(memberType, selectedTier)
      .map((id) => options.find((o) => o.id === id))
      .filter((o): o is ConferenceOption => o !== undefined);
  }, [options, memberType, selectedTier]);

  const isSelected = (id: string) => (quantities[id] ?? 0) > 0;

  const selectedOptions = programOptions.filter((o) => isSelected(o.id));
  const selectedCount = selectedOptions.length;
  const subtotal = selectedOptions.reduce((sum, o) => sum + o.price, 0);

  const accompanyingSelected = programOptions.some(
    (o) => isAccompanyingOption(o.id) && isSelected(o.id)
  );
  const accompanyingNameMissing =
    accompanyingSelected &&
    (accompanyingPerson.lastName.trim() === '' ||
      accompanyingPerson.firstName.trim() === '');

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
          These programs are optional — you may continue without selecting any.
          Each checked item counts as one ticket. All fees are shown in KRW.
        </p>

        <div className="space-y-3">
          {programOptions.map((opt) => {
            const selected = isSelected(opt.id);
            const isSoldOut = opt.available === false;
            const isTbd = !opt.isFree && opt.price === 0;
            const isDisabled = isSoldOut || isTbd;
            const declineLabel = DECLINE_LABELS[opt.id];
            const isAccomp = isAccompanyingOption(opt.id);
            const attendLabel = opt.description || opt.nameEn;

            const setSelected = (v: boolean) => {
              if (isDisabled) return;
              onQuantityChange(opt.id, v ? 1 : 0);
            };

            return (
              <div
                key={opt.id}
                className={`rounded-xl border p-4 transition ${
                  selected
                    ? 'border-gold-soft bg-gold-tint ring-1 ring-gold-soft'
                    : isDisabled
                    ? 'border-slate-100 bg-slate-50'
                    : 'border-slate-200 bg-white'
                }`}
              >
                {/* Header */}
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <p className="text-sm font-semibold text-ink">{opt.nameEn}</p>
                    {isSoldOut && (
                      <span className="rounded bg-red-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-red-500">
                        Sold Out
                      </span>
                    )}
                    {isTbd && (
                      <span className="rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-amber-600">
                        Price TBA
                      </span>
                    )}
                  </div>
                  <p
                    className={`flex-shrink-0 text-sm font-semibold ${
                      selected ? 'text-gold' : 'text-ink-muted'
                    }`}
                  >
                    {opt.isFree ? 'Free' : isTbd ? 'TBA' : formatKRW(opt.price)}
                  </p>
                </div>

                {/* Sold-out notice — capacity numbers are not disclosed */}
                {isSoldOut && (
                  <p className="mt-1.5 text-[11px] text-red-500">
                    This program has reached full capacity and is no longer available.
                  </p>
                )}
                {isTbd && (
                  <p className="mt-1.5 text-[11px] text-amber-600">
                    The fee for this tour will be announced soon.
                  </p>
                )}

                {/* Controls */}
                <div className="mt-3 space-y-2">
                  <CheckRow
                    checked={selected}
                    label={attendLabel}
                    disabled={isDisabled}
                    onToggle={() => setSelected(!selected)}
                  />
                  {declineLabel && (
                    <CheckRow
                      checked={!selected}
                      label={declineLabel}
                      disabled={isDisabled}
                      onToggle={() => setSelected(false)}
                    />
                  )}
                </div>

                {/* Accompanying person name fields */}
                {isAccomp && selected && (
                  <div className="mt-3 grid grid-cols-2 gap-3 rounded-lg border border-gold-soft bg-white p-3">
                    <div>
                      <label className="label-section mb-1 block">Last Name</label>
                      <input
                        type="text"
                        className="input-base"
                        value={accompanyingPerson.lastName}
                        placeholder="Last name"
                        onChange={(e) =>
                          onAccompanyingChange({
                            ...accompanyingPerson,
                            lastName: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div>
                      <label className="label-section mb-1 block">First Name</label>
                      <input
                        type="text"
                        className="input-base"
                        value={accompanyingPerson.firstName}
                        placeholder="First name"
                        onChange={(e) =>
                          onAccompanyingChange({
                            ...accompanyingPerson,
                            firstName: e.target.value,
                          })
                        }
                      />
                    </div>
                    {accompanyingNameMissing && (
                      <p className="col-span-2 text-[11px] text-red-500">
                        Please enter the accompanying person's last and first name.
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Right sidebar */}
      <div className="bg-gold-tint p-6 flex flex-col">
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
                <span className="text-ink-muted truncate pr-2">{o.nameEn}</span>
                <span className="flex-shrink-0 font-medium text-ink">
                  {o.isFree ? 'Free' : formatKRW(o.price)}
                </span>
              </div>
            ))}
            {accompanyingSelected &&
              (accompanyingPerson.firstName || accompanyingPerson.lastName) && (
                <div className="flex justify-between text-[11px] text-ink-faint">
                  <span>Accompanying person</span>
                  <span className="text-ink-muted">
                    {accompanyingPerson.firstName} {accompanyingPerson.lastName}
                  </span>
                </div>
              )}
            <div className="border-t border-gold-soft pt-2 flex justify-between items-baseline">
              <span className="label-section">Programs subtotal</span>
              <span className="amount-total">{formatKRW(subtotal)}</span>
            </div>
          </div>
        )}

        <p className="text-[11px] text-ink-faint mb-6 leading-relaxed">
          Additional charges will be combined with your registration fee on the
          summary screen.
        </p>

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
