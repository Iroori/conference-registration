import { useMemo, useEffect } from 'react';
import { useConferenceOptions, useRegistrationPeriods } from '../hooks/useRegistration';
import { useAuth } from '../context/AuthContext';
import { ErrorBanner, LoadingSpinner, MemberTypePill, SectionLabel, formatKRW } from './Shared';
import type {
  MemberType,
  RegistrationTierKey,
  RegistrationCategory,
  RegistrationPeriods,
} from '../types';
import { REG_TIER_CONFIG, REGISTRATION_CATEGORIES } from '../types';

interface StepRegistrationTypeProps {
  memberType: MemberType;
  selectedCategory: RegistrationCategory | null;
  onSelect: (
    tier: RegistrationTierKey,
    category: RegistrationCategory,
    optionId: string
  ) => void;
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
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}

export const StepRegistrationType = ({
  memberType,
  selectedCategory,
  onSelect,
  onNext,
}: StepRegistrationTypeProps) => {
  const { user } = useAuth();
  const { data: options, isLoading, error, refetch } = useConferenceOptions(memberType);
  const { data: periods } = useRegistrationPeriods();
  const currentTier = getCurrentTier(periods);
  const tierCfg = REG_TIER_CONFIG[currentTier];
  const periodByKey: Record<RegistrationTierKey, { endDate: string | null }> = {
    PRE_REGISTRATION: periods?.preRegistration ?? { endDate: null },
    EARLY_BIRD:       periods?.earlyBird        ?? { endDate: null },
    REGULAR:          periods?.regular          ?? { endDate: null },
  };

  /** 카테고리 → 현재 티어의 옵션 price 매핑 */
  const priceByCategory = useMemo(() => {
    const map = {} as Record<RegistrationCategory, number | undefined>;
    REGISTRATION_CATEGORIES.forEach(({ key }) => {
      const opt = options?.find((o) => o.id === tierCfg.optionIds[key]);
      map[key] = opt?.price;
    });
    return map;
  }, [options, tierCfg]);

  const isLocked = (category: RegistrationCategory) => {
    const meta = REGISTRATION_CATEGORIES.find((c) => c.key === category);
    return Boolean(meta?.iabseMemberOnly) && memberType !== 'MEMBER';
  };

  // 로그인 유저의 회원 유형에 해당하는 카테고리를 기본 선택
  useEffect(() => {
    if (selectedCategory || !options) return;
    if (isLocked(memberType)) return;
    onSelect(currentTier, memberType, tierCfg.optionIds[memberType]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [options, currentTier]);

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

  const selectedPrice = selectedCategory ? priceByCategory[selectedCategory] : undefined;

  return (
    <div className="grid grid-cols-1 gap-0 lg:grid-cols-[1fr_300px]">
      {/* Left — category selection */}
      <div className="border-b border-slate-100 p-6 lg:border-b-0 lg:border-r">
        <SectionLabel>Select Registration Category</SectionLabel>

        {/* 현재 등록 기간 표시 (날짜 기준 자동 결정) */}
        <div className="mb-5 rounded-xl border border-gold-soft bg-gold-tint p-4">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <p className="text-sm font-semibold text-gold">{tierCfg.label}</p>
            <span className="text-[10px] font-semibold uppercase tracking-[0.1em] rounded-full bg-gold-soft px-2 py-0.5 text-gold border border-gold-soft">
              Current Period
            </span>
          </div>
          <p className="text-[11px] text-ink-faint">
            Deadline:{' '}
            <span className="font-medium text-ink-muted">
              {deadlineLabel(periodByKey[currentTier])}
            </span>
          </p>
        </div>

        <p className="text-xs text-ink-muted mb-3 leading-relaxed">
          All fees are shown in Korean Won (KRW). Select the category that applies to you.
        </p>

        <div className="space-y-2.5">
          {REGISTRATION_CATEGORIES.map((cat) => {
            const locked = isLocked(cat.key);
            const selected = selectedCategory === cat.key;
            const price = priceByCategory[cat.key];
            const optionId = tierCfg.optionIds[cat.key];
            const handleClick = () => {
              if (locked) return;
              onSelect(currentTier, cat.key, optionId);
            };
            return (
              <div key={cat.key}>
                <button
                  type="button"
                  onClick={handleClick}
                  disabled={locked}
                  className={`w-full text-left rounded-xl border p-4 transition ${
                    selected
                      ? 'border-gold-soft bg-gold-tint ring-1 ring-gold-soft'
                      : locked
                      ? 'border-slate-100 bg-slate-50 opacity-60 cursor-not-allowed'
                      : 'border-slate-200 bg-white hover:border-gold/40'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <span
                        className={`flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full border transition ${
                          selected ? 'border-gold' : 'border-slate-300'
                        }`}
                        aria-hidden="true"
                      >
                        {selected && <span className="h-2 w-2 rounded-full bg-gold" />}
                      </span>
                      <p className="text-sm font-medium text-ink">{cat.label}</p>
                      {locked && (
                        <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-ink-faint">
                          IABSE Members Only
                        </span>
                      )}
                    </div>
                    <p
                      className={`flex-shrink-0 text-sm font-semibold ${
                        selected ? 'text-gold' : 'text-ink-muted'
                      }`}
                    >
                      {price !== undefined ? formatKRW(price) : '—'}
                    </p>
                  </div>

                  {/* 전시자 추가 배지 — 별도 안내 문구 영역 (문구 미정) */}
                  {cat.hasReservedNote && (
                    <p className="mt-2 ml-7 text-[11px] italic text-ink-faint">
                      Additional details for exhibitors will be announced.
                    </p>
                  )}
                </button>

                {locked && (
                  <p className="mt-1 ml-7 text-[11px] text-ink-faint">
                    Your account is not registered as an IABSE member, so this
                    category cannot be selected.
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Right sidebar */}
      <div className="bg-gold-tint p-6 flex flex-col">
        <SectionLabel>Your Profile</SectionLabel>
        {user && (
          <div className="mb-5 flex items-center gap-3 rounded-lg border border-gold-soft bg-white p-3">
            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-gold-soft text-xs font-semibold text-gold">
              {user.firstName?.charAt(0) ?? '?'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-ink truncate">{`${user.firstName} ${user.lastName}`}</p>
              <p className="text-xs text-ink-faint truncate">{user.affiliation}</p>
            </div>
            <MemberTypePill type={memberType} />
          </div>
        )}

        <div className="mb-5 rounded-lg border border-slate-200 bg-white p-4">
          <p className="label-section mb-2">Selected Category</p>
          {selectedCategory ? (
            <div>
              <p className="text-sm font-semibold text-gold">
                {REGISTRATION_CATEGORIES.find((c) => c.key === selectedCategory)?.label}
              </p>
              <p className="text-xs text-ink-faint mt-0.5">
                {tierCfg.label} · Deadline {deadlineLabel(periodByKey[currentTier])}
              </p>
              {selectedPrice !== undefined && (
                <p className="amount-total mt-2">{formatKRW(selectedPrice)}</p>
              )}
            </div>
          ) : (
            <p className="text-xs text-ink-faint">No category selected yet</p>
          )}
        </div>

        <div className="mt-auto">
          <button onClick={onNext} disabled={!selectedCategory} className="btn-primary">
            Continue to Additional Options
          </button>
        </div>
      </div>
    </div>
  );
};
