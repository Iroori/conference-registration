import { useMemo } from 'react';
import { useConferenceOptions } from '../hooks/useRegistration';
import { useAuth } from '../context/AuthContext';
import { LoadingSpinner, MemberTypePill, SectionLabel, formatKRW } from './Shared';
import type {
  MemberType,
  RegistrationTierKey,
  ConferenceOption,
  AccompanyingPersonInfo,
} from '../types';
import { REG_TIER_CONFIG, INVITATION_OPTION_ID, isAccompanyingOption } from '../types';

interface StepSummaryProps {
  memberType: MemberType;
  selectedTier: RegistrationTierKey;
  selectedRegOptionId: string | null;
  additionalQuantities: Record<string, number>;
  accompanyingPerson: AccompanyingPersonInfo;
  needsInvitationLetter: boolean;
  onEditPackage: () => void;
  onEditAddons: () => void;
  onEditInvitation: () => void;
  onNext: () => void;
  onBack: () => void;
}

export const StepSummary = ({
  memberType,
  selectedTier,
  selectedRegOptionId,
  additionalQuantities,
  accompanyingPerson,
  needsInvitationLetter,
  onEditPackage,
  onEditAddons,
  onEditInvitation,
  onNext,
  onBack,
}: StepSummaryProps) => {
  const { user } = useAuth();
  const { data: options, isLoading } = useConferenceOptions(memberType);

  const regOption = useMemo(
    () => options?.find((o) => o.id === selectedRegOptionId),
    [options, selectedRegOptionId]
  );

  const additionalSelected = useMemo(() => {
    if (!options) return [] as { opt: ConferenceOption; qty: number }[];
    return Object.entries(additionalQuantities)
      .filter(([, qty]) => qty > 0)
      .map(([id, qty]) => {
        const opt = options.find((o) => o.id === id);
        return opt ? { opt, qty } : null;
      })
      .filter((x): x is { opt: ConferenceOption; qty: number } => x !== null);
  }, [options, additionalQuantities]);

  const invitationOption = useMemo(
    () => options?.find((o) => o.id === INVITATION_OPTION_ID),
    [options]
  );

  const hasAccompanying = additionalSelected.some(({ opt }) =>
    isAccompanyingOption(opt.id)
  );

  const pricing = useMemo(() => {
    const regPrice = regOption?.price ?? 0;
    const addonsPrice = additionalSelected.reduce((s, { opt, qty }) => s + opt.price * qty, 0);
    const invPrice = needsInvitationLetter && invitationOption && !invitationOption.isFree
      ? invitationOption.price
      : 0;
    const subtotal = regPrice + addonsPrice + invPrice;
    const tax = Math.round(subtotal * 0.1);
    return { regPrice, addonsPrice, subtotal, tax, total: subtotal + tax };
  }, [regOption, additionalSelected, needsInvitationLetter, invitationOption]);

  if (isLoading) {
    return (
      <div className="flex min-h-[300px] items-center justify-center">
        <LoadingSpinner label="Loading summary…" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-0 lg:grid-cols-[1fr_300px]">
      {/* Left — summary sections */}
      <div className="border-b border-slate-100 p-6 lg:border-b-0 lg:border-r space-y-6">
        <SectionLabel>Registration Summary</SectionLabel>

        {/* Registrant Info */}
        {user && (
          <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="label-section">Personal Details</p>
            </div>
            <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-xs">
              {[
                ['Name', `${user.firstName} ${user.lastName}`],
                ['Affiliation', user.affiliation],
                ['Position', user.position],
                ['Email', user.email],
              ].map(([label, val]) => (
                <div key={label} className="flex justify-between">
                  <span className="text-ink-faint">{label}</span>
                  <span className="font-medium text-ink">{val}</span>
                </div>
              ))}
              <div className="col-span-2 flex items-center justify-between">
                <span className="text-ink-faint">Member Type</span>
                <MemberTypePill type={memberType} />
              </div>
            </div>
          </div>
        )}

        {/* Registration Package */}
        <div className="rounded-xl border border-gold-soft bg-white p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="label-section">Registration Category</p>
            <button
              onClick={onEditPackage}
              className="text-[10px] font-semibold uppercase tracking-[0.1em] text-gold hover:text-gold-hover transition"
            >
              Edit
            </button>
          </div>
          {regOption ? (
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-ink">{regOption.nameEn}</p>
                <p className="text-xs text-gold mt-1 font-semibold uppercase tracking-[0.1em]">
                  {REG_TIER_CONFIG[selectedTier].label}
                </p>
              </div>
              <p className="flex-shrink-0 text-sm font-semibold text-ink">
                {formatKRW(regOption.price)}
              </p>
            </div>
          ) : (
            <p className="text-xs text-ink-faint">No category selected</p>
          )}
        </div>

        {/* Additional Programs */}
        <div className="rounded-xl border border-slate-100 bg-white p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="label-section">Additional Programs</p>
            <button
              onClick={onEditAddons}
              className="text-[10px] font-semibold uppercase tracking-[0.1em] text-gold hover:text-gold-hover transition"
            >
              Edit
            </button>
          </div>
          {additionalSelected.length === 0 ? (
            <p className="text-xs text-ink-faint">No additional programs selected.</p>
          ) : (
            <div className="space-y-2">
              {additionalSelected.map(({ opt, qty }) => (
                <div key={opt.id} className="flex items-start justify-between gap-3 text-xs">
                  <div>
                    <p className="font-medium text-ink">{opt.nameEn}</p>
                    {opt.description && (
                      <p className="text-ink-faint mt-0.5">{opt.description}</p>
                    )}
                    {isAccompanyingOption(opt.id) && (
                      <p className="text-ink-muted mt-0.5">
                        Accompanying person:{' '}
                        <span className="font-medium text-ink">
                          {accompanyingPerson.firstName} {accompanyingPerson.lastName}
                        </span>
                      </p>
                    )}
                  </div>
                  <div className="flex-shrink-0 text-right">
                    <p className="font-semibold text-ink">
                      {opt.isFree ? 'Free' : formatKRW(opt.price * qty)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Invitation Letter */}
        <div className="rounded-xl border border-slate-100 bg-white p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="label-section">Invitation Letter</p>
            <button
              onClick={onEditInvitation}
              className="text-[10px] font-semibold uppercase tracking-[0.1em] text-gold hover:text-gold-hover transition"
            >
              Edit
            </button>
          </div>
          {needsInvitationLetter ? (
            <div className="flex items-center justify-between text-xs">
              <div>
                <p className="font-medium text-ink">Official Invitation Letter (Visa)</p>
                <p className="text-ink-faint mt-0.5">Issued within 5 business days of payment</p>
              </div>
              <p className="font-semibold text-gold">Free</p>
            </div>
          ) : (
            <p className="text-xs text-ink-faint">Not requested.</p>
          )}
        </div>
      </div>

      {/* Right sidebar — price breakdown */}
      <div className="bg-gold-tint p-6 flex flex-col">
        <SectionLabel>Payment Breakdown</SectionLabel>

        <div className="mb-5 space-y-2.5">
          <div className="flex justify-between text-xs">
            <span className="text-ink-muted">{REG_TIER_CONFIG[selectedTier].label}</span>
            <span className="font-medium text-ink">{formatKRW(pricing.regPrice)}</span>
          </div>

          {additionalSelected.map(({ opt, qty }) => (
            <div key={opt.id} className="flex justify-between text-xs">
              <span className="text-ink-muted">
                {opt.nameEn}
                {qty > 1 ? ` × ${qty}` : ''}
              </span>
              <span className="font-medium text-ink">
                {opt.isFree ? 'Free' : formatKRW(opt.price * qty)}
              </span>
            </div>
          ))}

          {needsInvitationLetter && (
            <div className="flex justify-between text-xs">
              <span className="text-ink-muted">Invitation Letter</span>
              <span className="font-medium text-gold">Free</span>
            </div>
          )}

          <div className="border-t border-gold-soft pt-2 space-y-1.5">
            <div className="flex justify-between text-xs text-ink-faint">
              <span>Subtotal</span>
              <span>{formatKRW(pricing.subtotal)}</span>
            </div>
            <div className="flex justify-between text-xs text-ink-faint">
              <span>VAT (10%)</span>
              <span>{formatKRW(pricing.tax)}</span>
            </div>
            <div className="flex justify-between items-baseline pt-1">
              <span className="label-section">Total</span>
              <span className="amount-total">{formatKRW(pricing.total)}</span>
            </div>
          </div>
        </div>

        <div className="mt-auto space-y-2">
          <button onClick={onNext} disabled={hasAccompanying && (
            accompanyingPerson.lastName.trim() === '' ||
            accompanyingPerson.firstName.trim() === ''
          )} className="btn-primary">
            Proceed to Payment
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
