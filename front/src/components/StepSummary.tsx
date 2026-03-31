import { useMemo } from 'react';
import { useConferenceOptions } from '../hooks/useRegistration';
import { useAuth } from '../context/AuthContext';
import { LoadingSpinner, MemberTypePill, SectionLabel, formatKRW } from './Shared';
import type { MemberType, RegistrationTierKey } from '../types';
import { REG_TIER_CONFIG, ADDITIONAL_OPTION_IDS, INVITATION_OPTION_ID } from '../types';

interface StepSummaryProps {
  memberType: MemberType;
  selectedTier: RegistrationTierKey;
  additionalQuantities: Record<string, number>;
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
  additionalQuantities,
  needsInvitationLetter,
  onEditPackage,
  onEditAddons,
  onEditInvitation,
  onNext,
  onBack,
}: StepSummaryProps) => {
  const { user } = useAuth();
  const { data: options, isLoading } = useConferenceOptions(memberType);

  const regOption = useMemo(() => {
    const optId = REG_TIER_CONFIG[selectedTier].optionIds[memberType];
    return options?.find((o) => o.id === optId);
  }, [options, selectedTier, memberType]);

  const additionalSelected = useMemo(() => {
    if (!options) return [];
    return (ADDITIONAL_OPTION_IDS as readonly string[])
      .map((id) => {
        const opt = options.find((o) => o.id === id);
        const qty = additionalQuantities[id] ?? 0;
        if (!opt || qty === 0) return null;
        return { opt, qty };
      })
      .filter((x): x is { opt: typeof options[0]; qty: number } => x !== null);
  }, [options, additionalQuantities]);

  const invitationOption = useMemo(
    () => options?.find((o) => o.id === INVITATION_OPTION_ID),
    [options]
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
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Registrant</p>
            </div>
            <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-xs">
              {[
                ['Name', user.nameEn],
                ['Affiliation', user.affiliation],
                ['Position', user.position],
                ['Email', user.email],
              ].map(([label, val]) => (
                <div key={label} className="flex justify-between">
                  <span className="text-slate-400">{label}</span>
                  <span className="font-medium text-slate-700">{val}</span>
                </div>
              ))}
              <div className="col-span-2 flex items-center justify-between">
                <span className="text-slate-400">Member Type</span>
                <MemberTypePill type={memberType} />
              </div>
            </div>
          </div>
        )}

        {/* Registration Package */}
        <div className="rounded-xl border border-teal-100 bg-white p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Registration Package
            </p>
            <button
              onClick={onEditPackage}
              className="text-xs font-medium text-teal-600 hover:text-teal-700 transition"
            >
              Edit
            </button>
          </div>
          {regOption ? (
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-800">{regOption.nameEn}</p>
                <p className="text-xs text-slate-400 mt-0.5">{regOption.description}</p>
                <p className="text-xs text-teal-600 mt-1 font-medium">
                  {REG_TIER_CONFIG[selectedTier].label} · Deadline: {REG_TIER_CONFIG[selectedTier].deadline}
                </p>
              </div>
              <p className="flex-shrink-0 text-sm font-bold text-slate-700">
                {formatKRW(regOption.price)}
              </p>
            </div>
          ) : (
            <p className="text-xs text-slate-400">No package selected</p>
          )}
        </div>

        {/* Additional Programs */}
        <div className="rounded-xl border border-slate-100 bg-white p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Additional Programs
            </p>
            <button
              onClick={onEditAddons}
              className="text-xs font-medium text-teal-600 hover:text-teal-700 transition"
            >
              Edit
            </button>
          </div>
          {additionalSelected.length === 0 ? (
            <p className="text-xs text-slate-400">No additional programs selected.</p>
          ) : (
            <div className="space-y-2">
              {additionalSelected.map(({ opt, qty }) => (
                <div key={opt.id} className="flex items-start justify-between gap-3 text-xs">
                  <div>
                    <p className="font-medium text-slate-700">{opt.nameEn}</p>
                    <p className="text-slate-400 mt-0.5">{opt.description}</p>
                  </div>
                  <div className="flex-shrink-0 text-right">
                    <p className="font-semibold text-slate-700">
                      {opt.isFree ? 'Free' : formatKRW(opt.price * qty)}
                    </p>
                    <p className="text-slate-400">{qty} × {opt.isFree ? 'Free' : formatKRW(opt.price)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Invitation Letter */}
        <div className="rounded-xl border border-slate-100 bg-white p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Invitation Letter
            </p>
            <button
              onClick={onEditInvitation}
              className="text-xs font-medium text-teal-600 hover:text-teal-700 transition"
            >
              Edit
            </button>
          </div>
          {needsInvitationLetter ? (
            <div className="flex items-center justify-between text-xs">
              <div>
                <p className="font-medium text-slate-700">Official Invitation Letter (Visa)</p>
                <p className="text-slate-400 mt-0.5">Issued within 5 business days of payment</p>
              </div>
              <p className="font-bold text-teal-600">Free</p>
            </div>
          ) : (
            <p className="text-xs text-slate-400">Not requested.</p>
          )}
        </div>
      </div>

      {/* Right sidebar — price breakdown */}
      <div className="bg-teal-50/40 p-6 flex flex-col">
        <SectionLabel>Payment Breakdown</SectionLabel>

        <div className="mb-5 space-y-2.5">
          {/* Registration */}
          <div className="flex justify-between text-xs">
            <span className="text-slate-500">
              {REG_TIER_CONFIG[selectedTier].label}
            </span>
            <span className="font-medium text-slate-700">{formatKRW(pricing.regPrice)}</span>
          </div>

          {/* Add-ons */}
          {additionalSelected.map(({ opt, qty }) => (
            <div key={opt.id} className="flex justify-between text-xs">
              <span className="text-slate-500">{opt.nameEn} × {qty}</span>
              <span className="font-medium text-slate-700">
                {opt.isFree ? 'Free' : formatKRW(opt.price * qty)}
              </span>
            </div>
          ))}

          {/* Invitation letter */}
          {needsInvitationLetter && (
            <div className="flex justify-between text-xs">
              <span className="text-slate-500">Invitation Letter</span>
              <span className="font-medium text-teal-600">Free</span>
            </div>
          )}

          <div className="border-t border-slate-200 pt-2 space-y-1.5">
            <div className="flex justify-between text-xs text-slate-400">
              <span>Subtotal</span>
              <span>{formatKRW(pricing.subtotal)}</span>
            </div>
            <div className="flex justify-between text-xs text-slate-400">
              <span>VAT (10%)</span>
              <span>{formatKRW(pricing.tax)}</span>
            </div>
            <div className="flex justify-between pt-1">
              <span className="text-sm font-semibold text-slate-800">Total</span>
              <span className="text-base font-bold text-teal-600">{formatKRW(pricing.total)}</span>
            </div>
          </div>
        </div>

        <div className="mt-auto space-y-2">
          <button onClick={onNext} className="btn-primary">
            Proceed to Payment
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
