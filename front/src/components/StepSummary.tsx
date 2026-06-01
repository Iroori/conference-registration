import { useMemo } from 'react';
import { useConferenceOptions } from '../hooks/useRegistration';
import { useAuth } from '../context/AuthContext';
import { LoadingSpinner, MemberTypePill, SectionLabel, formatKRW } from './Shared';
import type {
  MemberType,
  RegistrationTierKey,
  ConferenceOption,
  AccompanyingPersonInfo,
  ExhibitorBadgeInfo,
} from '../types';
import { REG_TIER_CONFIG, INVITATION_OPTION_ID, isAccompanyingOption, TECH_TOUR_OPTION_IDS } from '../types';

interface StepSummaryProps {
  memberType: MemberType;
  selectedTier: RegistrationTierKey;
  selectedRegOptionId: string | null;
  additionalQuantities: Record<string, number>;
  accompanyingPersons: AccompanyingPersonInfo[];
  exhibitorBadges: ExhibitorBadgeInfo[];
  waitlistedOptionIds: string[];
  iabseId: string;
  birthDate: string;
  needsInvitationLetter: boolean;
  onEditPackage: () => void;
  onEditAddons: () => void;
  onEditTours: () => void;
  onEditInvitation: () => void;
  onNext: () => void;
  onBack: () => void;
}

export const StepSummary = ({
  memberType,
  selectedTier,
  selectedRegOptionId,
  additionalQuantities,
  accompanyingPersons,
  exhibitorBadges,
  waitlistedOptionIds,
  iabseId,
  birthDate,
  needsInvitationLetter,
  onEditPackage,
  onEditAddons,
  onEditTours,
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

  const isWaitlisted = (id: string) => waitlistedOptionIds.includes(id);

  // Group options to display in Summary
  const tourSet = new Set<string>(TECH_TOUR_OPTION_IDS);

  const additionalSelected = useMemo(() => {
    if (!options) return [] as { opt: ConferenceOption; qty: number }[];
    return Object.entries(additionalQuantities)
      .filter(([id, qty]) => qty > 0 && id !== selectedRegOptionId && !tourSet.has(id))
      .map(([id, qty]) => {
        const opt = options.find((o) => o.id === id);
        return opt ? { opt, qty } : null;
      })
      .filter((x): x is { opt: ConferenceOption; qty: number } => x !== null);
  }, [options, additionalQuantities, selectedRegOptionId]);

  const selectedTour = useMemo(() => {
    if (!options) return null;
    const tourId = TECH_TOUR_OPTION_IDS.find((id) => (additionalQuantities[id] ?? 0) > 0);
    return tourId ? options.find((o) => o.id === tourId) : null;
  }, [options, additionalQuantities]);

  const invitationOption = useMemo(
    () => options?.find((o) => o.id === INVITATION_OPTION_ID),
    [options]
  );

  const pricing = useMemo(() => {
    const regPrice = regOption ? regOption.price * (selectedCategory === 'EXHIBITOR' ? exhibitorQuantity : 1) : 0;
    const addonsPrice = additionalSelected.reduce((s, { opt, qty }) => {
      if (isWaitlisted(opt.id)) return s; // Waitlisted option is 0 KRW
      return s + opt.price * qty;
    }, 0);
    const tourPrice = selectedTour && !isWaitlisted(selectedTour.id) ? selectedTour.price : 0;
    const invPrice = needsInvitationLetter && invitationOption && !invitationOption.isFree
      ? invitationOption.price
      : 0;
    const subtotal = regPrice + addonsPrice + tourPrice + invPrice;
    return { regPrice, addonsPrice, tourPrice, subtotal, tax: 0, total: subtotal };
  }, [regOption, additionalSelected, selectedTour, needsInvitationLetter, invitationOption, waitlistedOptionIds]);

  const exhibitorQuantity = additionalQuantities[selectedRegOptionId || ''] ?? 1;
  const selectedCategory = selectedRegOptionId ? (selectedRegOptionId.includes('EXH') ? 'EXHIBITOR' : memberType) : null;

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
              <p className="label-section text-sm">Personal Details</p>
            </div>
            <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
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
              {iabseId && (
                <div className="flex justify-between">
                  <span className="text-ink-faint">IABSE ID</span>
                  <span className="font-semibold text-gold">{iabseId}</span>
                </div>
              )}
              {birthDate && (
                <div className="flex justify-between">
                  <span className="text-ink-faint">Date of Birth</span>
                  <span className="font-medium text-ink">{birthDate}</span>
                </div>
              )}
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
            <p className="label-section text-sm">Registration Category</p>
            <button
              onClick={onEditPackage}
              className="text-xs font-semibold uppercase tracking-[0.1em] text-gold hover:text-gold-hover transition"
            >
              Edit
            </button>
          </div>
          {regOption ? (
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-base font-semibold text-ink">{regOption.nameEn}</p>
                  <p className="text-sm text-gold mt-1 font-semibold uppercase tracking-[0.1em]">
                    {REG_TIER_CONFIG[selectedTier].label} {selectedCategory === 'EXHIBITOR' && `· Qty: ${exhibitorQuantity}`}
                  </p>
                </div>
                <p className="flex-shrink-0 text-base font-semibold text-ink">
                  {formatKRW(regOption.price * (selectedCategory === 'EXHIBITOR' ? exhibitorQuantity : 1))}
                </p>
              </div>

              {selectedCategory === 'EXHIBITOR' && exhibitorBadges.length > 0 && (
                <div className="bg-slate-50 rounded-lg p-3 space-y-1.5 border border-slate-100">
                  <p className="text-xs font-semibold text-ink-muted">Exhibitor Names:</p>
                  {exhibitorBadges.map((badge, idx) => (
                    <p key={idx} className="text-xs text-ink pl-2 font-medium">
                      - {badge.firstName} {badge.lastName}
                    </p>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-ink-faint">No category selected</p>
          )}
        </div>

        {/* Additional Programs */}
        <div className="rounded-xl border border-slate-100 bg-white p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="label-section text-sm">Additional Programs</p>
            <button
              onClick={onEditAddons}
              className="text-xs font-semibold uppercase tracking-[0.1em] text-gold hover:text-gold-hover transition"
            >
              Edit
            </button>
          </div>
          {additionalSelected.length === 0 ? (
            <p className="text-sm text-ink-faint">No additional programs selected.</p>
          ) : (
            <div className="space-y-4">
              {additionalSelected.map(({ opt, qty }) => (
                <div key={opt.id} className="flex items-start justify-between gap-3 text-sm border-b border-slate-50 pb-3 last:border-0 last:pb-0">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-ink">{opt.nameEn}</p>
                      {isWaitlisted(opt.id) && (
                        <span className="rounded bg-amber-50 px-1.5 py-0.5 text-[9px] font-semibold text-amber-600 uppercase tracking-wider">
                          Waitlisted
                        </span>
                      )}
                    </div>
                    {opt.description && (
                      <p className="text-ink-faint mt-0.5 text-xs">{opt.description}</p>
                    )}
                    {isAccompanyingOption(opt.id) && accompanyingPersons.length > 0 && (
                      <div className="bg-slate-50/80 rounded p-2.5 mt-2 space-y-1 text-xs border border-slate-100/50">
                        <p className="font-semibold text-ink-muted">Accompanying Persons ({accompanyingPersons.length}):</p>
                        {accompanyingPersons.map((p, pidx) => (
                          <p key={pidx} className="font-medium text-ink pl-1.5">
                            - {p.firstName} {p.lastName}
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex-shrink-0 text-right">
                    <p className="font-semibold text-ink">
                      {isWaitlisted(opt.id) ? '0 KRW' : opt.isFree ? 'Free' : formatKRW(opt.price * qty)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Technical Tour */}
        <div className="rounded-xl border border-slate-100 bg-white p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="label-section text-sm">Technical Tour</p>
            <button
              onClick={onEditTours}
              className="text-xs font-semibold uppercase tracking-[0.1em] text-gold hover:text-gold-hover transition"
            >
              Edit
            </button>
          </div>
          {selectedTour ? (
            <div className="flex items-start justify-between gap-3 text-sm">
              <div>
                <p className="font-semibold text-ink">{selectedTour.nameEn}</p>
                <p className="text-xs text-ink-faint mt-0.5 whitespace-pre-line">{selectedTour.description}</p>
              </div>
              <p className="font-semibold text-ink flex-shrink-0">{formatKRW(selectedTour.price)}</p>
            </div>
          ) : (
            <p className="text-sm text-ink-faint">Not requested.</p>
          )}
        </div>

        {/* Invitation Letter */}
        <div className="rounded-xl border border-slate-100 bg-white p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="label-section text-sm">Invitation Letter</p>
            <button
              onClick={onEditInvitation}
              className="text-xs font-semibold uppercase tracking-[0.1em] text-gold hover:text-gold-hover transition"
            >
              Edit
            </button>
          </div>
          {needsInvitationLetter ? (
            <div className="flex items-center justify-between text-sm">
              <div>
                <p className="font-medium text-ink">Official Invitation Letter (Visa)</p>
                <p className="text-ink-faint mt-0.5">Issued within 5 business days of payment</p>
              </div>
              <p className="font-semibold text-gold">Free</p>
            </div>
          ) : (
            <p className="text-sm text-ink-faint">Not requested.</p>
          )}
        </div>
      </div>

      {/* Right sidebar — price breakdown */}
      <div className="bg-gold-tint p-6 flex flex-col">
        <SectionLabel>Payment Breakdown</SectionLabel>

        <div className="mb-5 space-y-2.5">
          <div className="flex justify-between text-sm">
            <span className="text-ink-muted truncate pr-2">
              {REG_TIER_CONFIG[selectedTier].label} {selectedCategory === 'EXHIBITOR' && `(×${exhibitorQuantity})`}
            </span>
            <span className="font-medium text-ink">{formatKRW(pricing.regPrice)}</span>
          </div>

          {additionalSelected.map(({ opt, qty }) => (
            <div key={opt.id} className="flex justify-between text-sm">
              <span className="text-ink-muted truncate pr-2">
                {opt.nameEn} {qty > 1 ? ` × ${qty}` : ''} {isWaitlisted(opt.id) && '(Waitlisted)'}
              </span>
              <span className="font-medium text-ink">
                {isWaitlisted(opt.id) ? '0 KRW' : opt.isFree ? 'Free' : formatKRW(opt.price * qty)}
              </span>
            </div>
          ))}

          {selectedTour && (
            <div className="flex justify-between text-sm">
              <span className="text-ink-muted truncate pr-2">{selectedTour.nameEn}</span>
              <span className="font-medium text-ink">{formatKRW(selectedTour.price)}</span>
            </div>
          )}

          {needsInvitationLetter && (
            <div className="flex justify-between text-sm">
              <span className="text-ink-muted">Invitation Letter</span>
              <span className="font-medium text-gold">Free</span>
            </div>
          )}

          <div className="border-t border-gold-soft pt-2 space-y-1.5">
            <div className="flex justify-between items-baseline pt-1">
              <span className="label-section text-sm">Total</span>
              <span className="amount-total">{formatKRW(pricing.total)}</span>
            </div>
          </div>
        </div>

        <div className="mt-auto space-y-2">
          <button onClick={onNext} className="btn-primary">
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
