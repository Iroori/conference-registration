import { useMemo } from 'react';
import { useConferenceOptions, useRegistrationPeriods } from '../hooks/useRegistration';
import { useAuth } from '../context/AuthContext';
import { ErrorBanner, LoadingSpinner, MemberTypePill, SectionLabel, formatKRW } from './Shared';
import type { MemberType, RegistrationTierKey, RegistrationPeriods } from '../types';
import { REG_TIER_CONFIG } from '../types';

interface StepRegistrationTypeProps {
  memberType: MemberType;
  selectedTier: RegistrationTierKey | null;
  onSelect: (tier: RegistrationTierKey, optionId: string) => void;
  onNext: () => void;
}

function parseDate(s: string | null | undefined): Date | null {
  return s ? new Date(s + 'T23:59:59') : null;
}

/** 서버에서 받은 기간 기반으로 현재 활성 티어 판정 */
function getCurrentTier(periods?: RegistrationPeriods): RegistrationTierKey {
  const today = new Date();
  const preEnd = parseDate(periods?.preRegistration.endDate);
  const earlyEnd = parseDate(periods?.earlyBird.endDate);
  if (preEnd && today <= preEnd) return 'PRE_REGISTRATION';
  if (earlyEnd && today <= earlyEnd) return 'EARLY_BIRD';
  return 'REGULAR';
}

function deadlineLabel(p: { endDate: string | null }): string {
  if (!p.endDate) return 'TBD';
  const d = new Date(p.endDate + 'T00:00:00');
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

const MEMBER_TYPE_LABELS: Record<MemberType, string> = {
  MEMBER:          'IABSE Member',
  NON_MEMBER:      'Non-Member',
  NON_MEMBER_PLUS: 'Non-Member Plus',
  YOUNG_ENGINEER:  'Young Engineer (< 36)',
};

const TIER_ORDER: RegistrationTierKey[] = ['PRE_REGISTRATION', 'EARLY_BIRD', 'REGULAR'];

const TIER_COLOR_CLASSES = {
  teal:  { border: 'border-teal-400',  bg: 'bg-teal-50',   ring: 'ring-teal-200',  badge: 'bg-teal-100 text-teal-700',  label: 'text-teal-700' },
  amber: { border: 'border-amber-400', bg: 'bg-amber-50',  ring: 'ring-amber-200', badge: 'bg-amber-100 text-amber-700', label: 'text-amber-700' },
  slate: { border: 'border-slate-300', bg: 'bg-slate-50',  ring: 'ring-slate-200', badge: 'bg-slate-100 text-slate-600', label: 'text-slate-600' },
};

export const StepRegistrationType = ({
  memberType,
  selectedTier,
  onSelect,
  onNext,
}: StepRegistrationTypeProps) => {
  const { user } = useAuth();
  const { data: options, isLoading, error, refetch } = useConferenceOptions(memberType);
  const { data: periods } = useRegistrationPeriods();
  const currentTier = getCurrentTier(periods);
  const periodByKey: Record<RegistrationTierKey, { endDate: string | null }> = {
    PRE_REGISTRATION: periods?.preRegistration ?? { endDate: null, startDate: null },
    EARLY_BIRD:       periods?.earlyBird        ?? { endDate: null, startDate: null },
    REGULAR:          periods?.regular          ?? { endDate: null, startDate: null },
  };

  const optionsByTier = useMemo(() => {
    if (!options) return {} as Record<RegistrationTierKey, { id: string; price: number } | undefined>;
    return Object.fromEntries(
      TIER_ORDER.map((tierKey) => {
        const optId = REG_TIER_CONFIG[tierKey].optionIds[memberType];
        const opt = options.find((o) => o.id === optId);
        return [tierKey, opt ? { id: opt.id, price: opt.price } : undefined];
      })
    ) as Record<RegistrationTierKey, { id: string; price: number } | undefined>;
  }, [options, memberType]);

  if (isLoading) {
    return (
      <div className="flex min-h-[300px] items-center justify-center">
        <LoadingSpinner label="Loading registration options…" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <ErrorBanner message="Failed to load options." onRetry={() => refetch()} />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-0 lg:grid-cols-[1fr_300px]">
      {/* Left — tier selection */}
      <div className="border-b border-slate-100 p-6 lg:border-b-0 lg:border-r">
        <SectionLabel>Select Registration Package</SectionLabel>

        <div className="space-y-3 mb-6">
          {TIER_ORDER.map((tierKey) => {
            const cfg = REG_TIER_CONFIG[tierKey];
            const tierOpt = optionsByTier[tierKey];
            const isSelected = selectedTier === tierKey;
            const isCurrent = currentTier === tierKey;
            const colors = TIER_COLOR_CLASSES[cfg.color];

            return (
              <button
                key={tierKey}
                onClick={() => tierOpt && onSelect(tierKey, tierOpt.id)}
                disabled={!tierOpt}
                className={`w-full rounded-xl border p-4 text-left transition ${
                  isSelected
                    ? `${colors.border} ${colors.bg} ring-1 ${colors.ring}`
                    : 'border-slate-200 bg-white hover:border-slate-300'
                } ${!tierOpt ? 'opacity-40 cursor-not-allowed' : ''}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div
                      className={`mt-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full border transition ${
                        isSelected ? `${colors.border} bg-teal-500 border-teal-500` : 'border-slate-300'
                      }`}
                    >
                      {isSelected && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2 mb-0.5">
                        <p className={`text-sm font-semibold ${isSelected ? colors.label : 'text-slate-800'}`}>
                          {cfg.label}
                        </p>
                        {isCurrent && (
                          <span className={`text-[10px] font-semibold rounded-full px-2 py-0.5 ${colors.badge}`}>
                            Current Period
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400">{cfg.subtitle}</p>
                      <p className="text-[11px] text-slate-400 mt-1">
                        Deadline: <span className="font-medium">{deadlineLabel(periodByKey[tierKey])}</span>
                      </p>
                    </div>
                  </div>
                  <div className="flex-shrink-0 text-right">
                    {tierOpt ? (
                      <p className={`text-lg font-bold ${isSelected ? colors.label : 'text-slate-700'}`}>
                        {formatKRW(tierOpt.price)}
                      </p>
                    ) : (
                      <p className="text-sm text-slate-300">N/A</p>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Pricing comparison table */}
        <div className="rounded-xl border border-slate-100 overflow-hidden">
          <div className="bg-slate-50 px-4 py-2.5">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Registration Fee Comparison (KRW)
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="px-4 py-2.5 text-left text-slate-400 font-medium">Category</th>
                  {TIER_ORDER.map((tk) => (
                    <th key={tk} className="px-4 py-2.5 text-right text-slate-400 font-medium">
                      {REG_TIER_CONFIG[tk].label.replace(' Registration', '')}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {(['MEMBER', 'NON_MEMBER', 'NON_MEMBER_PLUS', 'YOUNG_ENGINEER'] as MemberType[]).map((mt) => (
                  <tr key={mt} className={memberType === mt ? 'bg-teal-50/40' : ''}>
                    <td className="px-4 py-2.5 font-medium text-slate-600">
                      {MEMBER_TYPE_LABELS[mt]}
                      {memberType === mt && (
                        <span className="ml-1.5 text-[10px] text-teal-500 font-semibold">(you)</span>
                      )}
                    </td>
                    {TIER_ORDER.map((tk) => {
                      const optId = REG_TIER_CONFIG[tk].optionIds[mt];
                      const opt = options?.find((o) => o.id === optId);
                      return (
                        <td key={tk} className="px-4 py-2.5 text-right text-slate-600">
                          {opt ? formatKRW(opt.price) : '—'}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Right sidebar */}
      <div className="bg-teal-50/40 p-6 flex flex-col">
        <SectionLabel>Your Profile</SectionLabel>
        {user && (
          <div className="mb-5 flex items-center gap-3 rounded-lg border border-teal-100 bg-white p-3">
            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-teal-100 text-xs font-semibold text-teal-700">
              {user.nameEn.charAt(0)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-slate-800 truncate">{user.nameEn}</p>
              <p className="text-xs text-slate-400 truncate">{user.affiliation}</p>
            </div>
            <MemberTypePill type={memberType} />
          </div>
        )}

        <div className="mb-5 rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-xs font-semibold text-slate-600 mb-2">Selected Package</p>
          {selectedTier ? (
            <div>
              <p className="text-sm font-semibold text-teal-700">{REG_TIER_CONFIG[selectedTier].label}</p>
              <p className="text-xs text-slate-400 mt-0.5">
                Deadline: {deadlineLabel(periodByKey[selectedTier])}
              </p>
              {optionsByTier[selectedTier] && (
                <p className="text-base font-bold text-slate-800 mt-2">
                  {formatKRW(optionsByTier[selectedTier]!.price)}
                </p>
              )}
            </div>
          ) : (
            <p className="text-xs text-slate-400">No package selected yet</p>
          )}
        </div>

        <div className="mt-auto">
          <button
            onClick={onNext}
            disabled={!selectedTier}
            className="btn-primary"
          >
            Continue to Additional Options
          </button>
        </div>
      </div>
    </div>
  );
};
