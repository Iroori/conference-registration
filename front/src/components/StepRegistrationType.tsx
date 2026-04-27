import { useMemo, useEffect } from 'react';
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

// All tiers share the same gold accent — distinguished only by labels.
const TIER_STYLES = {
  active: {
    border: 'border-gold-soft',
    bg: 'bg-gold-tint',
    badge: 'bg-gold-soft text-gold border border-gold-soft',
    label: 'text-gold',
    price: 'text-gold',
  },
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
    PRE_REGISTRATION: periods?.preRegistration ?? { endDate: null },
    EARLY_BIRD:       periods?.earlyBird        ?? { endDate: null },
    REGULAR:          periods?.regular          ?? { endDate: null },
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

  // 현재 기간에 해당하는 옵션을 자동 선택
  useEffect(() => {
    const tierOpt = optionsByTier[currentTier];
    if (tierOpt) {
      onSelect(currentTier, tierOpt.id);
    }
  }, [optionsByTier, currentTier]);

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

        {/* 현재 등록 기간 표시 (사용자 선택 불가) */}
        {(() => {
          const cfg = REG_TIER_CONFIG[currentTier];
          const tierOpt = optionsByTier[currentTier];
          const styles = TIER_STYLES.active;
          return (
            <div className={`mb-6 rounded-xl border ${styles.border} ${styles.bg} p-4`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <p className={`text-sm font-semibold ${styles.label}`}>{cfg.label}</p>
                    <span className={`text-[10px] font-semibold uppercase tracking-[0.1em] rounded-full px-2 py-0.5 ${styles.badge}`}>
                      Current Period
                    </span>
                  </div>
                  <p className="text-xs text-ink-muted">{cfg.subtitle}</p>
                  <p className="text-[11px] text-ink-faint mt-1">
                    Deadline: <span className="font-medium text-ink-muted">{deadlineLabel(periodByKey[currentTier])}</span>
                  </p>
                </div>
                <div className="flex-shrink-0 text-right">
                  {tierOpt ? (
                    <p className="amount-total">{formatKRW(tierOpt.price)}</p>
                  ) : (
                    <p className="text-sm text-slate-300">N/A</p>
                  )}
                </div>
              </div>
            </div>
          );
        })()}

        {/* Registration Fee Comparison (KRW) — 현재 기간 기준 */}
        <div className="rounded-xl border border-slate-100 overflow-hidden">
          <div className="bg-slate-50 px-4 py-2.5 flex items-center justify-between">
            <p className="label-section">
              Registration Fee Comparison (KRW)
            </p>
            <span className="text-[10px] text-ink-faint">{REG_TIER_CONFIG[currentTier].label}</span>
          </div>
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="px-4 py-2.5 text-left text-ink-faint font-medium">Category</th>
                <th className="px-4 py-2.5 text-right text-ink-faint font-medium">Fee (KRW)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {(['MEMBER', 'NON_MEMBER', 'NON_MEMBER_PLUS', 'YOUNG_ENGINEER'] as MemberType[]).map((mt) => {
                const optId = REG_TIER_CONFIG[currentTier].optionIds[mt];
                const opt = options?.find((o) => o.id === optId);
                return (
                  <tr key={mt} className={memberType === mt ? 'bg-gold-tint' : ''}>
                    <td className="px-4 py-2.5 font-medium text-ink-muted">
                      {MEMBER_TYPE_LABELS[mt]}
                      {memberType === mt && (
                        <span className="ml-1.5 text-[10px] text-gold font-semibold uppercase tracking-[0.1em]">(you)</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-right text-ink-muted">
                      {opt ? formatKRW(opt.price) : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Right sidebar */}
      <div className="bg-gold-tint p-6 flex flex-col">
        <SectionLabel>Your Profile</SectionLabel>
        {user && (
          <div className="mb-5 flex items-center gap-3 rounded-lg border border-gold-soft bg-white p-3">
            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-gold-soft text-xs font-semibold text-gold">
              {user.nameEn?.charAt(0) ?? '?'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-ink truncate">{user.nameEn}</p>
              <p className="text-xs text-ink-faint truncate">{user.affiliation}</p>
            </div>
            <MemberTypePill type={memberType} />
          </div>
        )}

        <div className="mb-5 rounded-lg border border-slate-200 bg-white p-4">
          <p className="label-section mb-2">Selected Package</p>
          {selectedTier ? (
            <div>
              <p className="text-sm font-semibold text-gold">{REG_TIER_CONFIG[selectedTier].label}</p>
              <p className="text-xs text-ink-faint mt-0.5">
                Deadline: {deadlineLabel(periodByKey[selectedTier])}
              </p>
              {optionsByTier[selectedTier] && (
                <p className="amount-total mt-2">
                  {formatKRW(optionsByTier[selectedTier]!.price)}
                </p>
              )}
            </div>
          ) : (
            <p className="text-xs text-ink-faint">No package selected yet</p>
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
