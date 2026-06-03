import { useMemo, useEffect, useState } from 'react';
import { useConferenceOptions, useRegistrationPeriods } from '../hooks/useRegistration';
import { useAuth } from '../context/AuthContext';
import { ErrorBanner, LoadingSpinner, MemberTypePill, SectionLabel, formatKRW } from './Shared';
import { apiVerifyIabseId } from '../lib/api';
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
  iabseId: string;
  onIabseIdChange: (val: string) => void;
  birthDate: string;
  onBirthDateChange: (val: string) => void;
  exhibitorQuantity: number;
  onExhibitorQuantityChange: (qty: number) => void;
  exhibitorBadges: { firstName: string; lastName: string }[];
  onExhibitorBadgesChange: (badges: { firstName: string; lastName: string }[]) => void;
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
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long' });
}

export const StepRegistrationType = ({
  memberType,
  selectedCategory,
  iabseId,
  onIabseIdChange,
  birthDate,
  onBirthDateChange,
  exhibitorQuantity,
  onExhibitorQuantityChange,
  exhibitorBadges,
  onExhibitorBadgesChange,
  onSelect,
  onNext,
}: StepRegistrationTypeProps) => {
  const { user } = useAuth();
  const { data: options, isLoading, error, refetch } = useConferenceOptions(memberType);
  const { data: periods } = useRegistrationPeriods();
  const currentTier = getCurrentTier(periods);
  const tierCfg = REG_TIER_CONFIG[currentTier];

  const [isValidating, setIsValidating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const periodByKey: Record<RegistrationTierKey, { endDate: string | null }> = {
    PRE_REGISTRATION: periods?.preRegistration ?? { endDate: null },
    EARLY_BIRD:       periods?.earlyBird        ?? { endDate: null },
    REGULAR:          periods?.regular          ?? { endDate: null },
  };

  const [localYear, setLocalYear] = useState('');
  const [localMonth, setLocalMonth] = useState('');
  const [localDay, setLocalDay] = useState('');

  useEffect(() => {
    if (birthDate) {
      const parts = birthDate.split('-');
      setLocalYear(parts[0] || '');
      setLocalMonth(parts[1] || '');
      setLocalDay(parts[2] || '');
    } else {
      setLocalYear('');
      setLocalMonth('');
      setLocalDay('');
    }
  }, [birthDate]);

  const handleYearChange = (val: string) => {
    setLocalYear(val);
    if (val && localMonth && localDay) {
      onBirthDateChange(`${val}-${localMonth.padStart(2, '0')}-${localDay.padStart(2, '0')}`);
    } else {
      onBirthDateChange('');
    }
  };

  const handleMonthChange = (val: string) => {
    setLocalMonth(val);
    if (localYear && val && localDay) {
      onBirthDateChange(`${localYear}-${val.padStart(2, '0')}-${localDay.padStart(2, '0')}`);
    } else {
      onBirthDateChange('');
    }
  };

  const handleDayChange = (val: string) => {
    setLocalDay(val);
    if (localYear && localMonth && val) {
      onBirthDateChange(`${localYear}-${localMonth.padStart(2, '0')}-${val.padStart(2, '0')}`);
    } else {
      onBirthDateChange('');
    }
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
    if (category === 'MEMBER') return false;
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

  const canContinue = useMemo(() => {
    if (!selectedCategory || isValidating) return false;
    if (selectedCategory === 'MEMBER') {
      return iabseId.trim().length > 0;
    }
    if (selectedCategory === 'YOUNG_ENGINEER') {
      if (!birthDate) return false;
      const year = new Date(birthDate).getFullYear();
      return year >= 1992;
    }
    if (selectedCategory === 'EXHIBITOR') {
      if (exhibitorBadges.length !== exhibitorQuantity) return false;
      return exhibitorBadges.every(
        (b) => b.firstName.trim().length > 0 && b.lastName.trim().length > 0
      );
    }
    return true;
  }, [selectedCategory, iabseId, birthDate, exhibitorQuantity, exhibitorBadges, isValidating]);

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
        <div className="mb-5 flex flex-wrap items-center gap-2.5">
          <p className="text-xs font-semibold text-ink-muted">
            Early Bird Registration Deadline: 30 June 2026
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
              setErrorMessage(null);
              onSelect(currentTier, cat.key, optionId);
            };
            return (
              <div key={cat.key}>
                <div
                  onClick={handleClick}
                  className={`w-full text-left rounded-xl border p-4 transition ${
                    selected
                      ? 'border-gold-soft bg-gold-tint ring-1 ring-gold-soft'
                      : locked
                      ? 'border-slate-100 bg-slate-50 opacity-60 cursor-not-allowed'
                      : 'border-slate-200 bg-white hover:border-gold/40 cursor-pointer'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <span
                        className={`flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full border transition mt-0.5 ${
                          selected ? 'border-gold' : 'border-slate-300'
                        }`}
                        aria-hidden="true"
                      >
                        {selected && <span className="h-2 w-2 rounded-full bg-gold" />}
                      </span>
                      <div className="text-left">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-bold text-ink leading-tight">{cat.label}</p>
                          {locked && (
                            <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.1em] text-ink-faint">
                              IABSE Members Only
                            </span>
                          )}
                        </div>
                        {cat.subLabel && (
                          <p className="text-[11px] text-slate-500 mt-1.5 normal-case font-normal leading-normal">
                            {cat.subLabel}
                          </p>
                        )}
                      </div>
                    </div>
                    <p
                      className={`flex-shrink-0 text-sm font-semibold ${
                        selected ? 'text-gold' : 'text-ink-muted'
                      }`}
                    >
                      {price !== undefined ? formatKRW(price) : '—'}
                    </p>
                  </div>

                  {/* IABSE Member 안내 문구 및 ID 폼 */}
                  {selected && cat.key === 'MEMBER' && (
                    <div className="mt-3 ml-7 space-y-2" onClick={(e) => e.stopPropagation()}>
                      <label className="block text-xs font-semibold text-ink-muted">IABSE ID *</label>
                      <input
                        type="text"
                        required
                        value={iabseId}
                        onChange={(e) => onIabseIdChange(e.target.value)}
                        className="input-base w-full max-w-xs"
                        placeholder="Enter your IABSE ID"
                      />
                      <p className="text-[11px] text-gold mt-1">
                        Only active members are eligible for the member rate.
                      </p>
                    </div>
                  )}



                  {/* Young Engineer 안내 문구 및 생년월일 폼 */}
                  {selected && cat.key === 'YOUNG_ENGINEER' && (
                    <div className="mt-4 ml-7 space-y-2.5" onClick={(e) => e.stopPropagation()}>
                      <label className="block text-xs font-semibold text-ink-muted">Date of Birth *</label>
                      <div className="flex gap-2 flex-wrap">
                        {/* Year Select */}
                        <select
                          value={localYear}
                          onChange={(e) => handleYearChange(e.target.value)}
                          className="input-base py-1.5 text-xs text-slate-800 w-28"
                          required
                        >
                          <option value="">Year</option>
                          {Array.from({ length: 2026 - 1950 + 1 }, (_, i) => 2026 - i).map((y) => (
                            <option key={y} value={y}>{y}</option>
                          ))}
                        </select>

                        {/* Month Select */}
                        <select
                          value={localMonth}
                          onChange={(e) => handleMonthChange(e.target.value)}
                          className="input-base py-1.5 text-xs text-slate-800 w-40"
                          required
                        >
                          <option value="">Month</option>
                          {[
                            '01 - January',
                            '02 - February',
                            '03 - March',
                            '04 - April',
                            '05 - May',
                            '06 - June',
                            '07 - July',
                            '08 - August',
                            '09 - September',
                            '10 - October',
                            '11 - November',
                            '12 - December'
                          ].map((mStr) => {
                            const val = mStr.substring(0, 2);
                            return (
                              <option key={val} value={val}>
                                {mStr}
                              </option>
                            );
                          })}
                        </select>

                        {/* Day Select */}
                        <select
                          value={localDay}
                          onChange={(e) => handleDayChange(e.target.value)}
                          className="input-base py-1.5 text-xs text-slate-800 w-24"
                          required
                        >
                          <option value="">Day</option>
                          {Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, '0')).map((d) => (
                            <option key={d} value={d}>{parseInt(d)}</option>
                          ))}
                        </select>
                      </div>
                      <p className="text-[11px] text-gold mt-1 font-semibold">
                        *Young Engineer category is eligible only for attendees born in 1992 or later.
                      </p>
                    </div>
                  )}

                  {/* Additional Badge for Exhibitor 개수 카운터 및 이름 폼 */}
                  {selected && cat.key === 'EXHIBITOR' && (
                    <div className="mt-4 ml-7 space-y-4" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-3">
                        <label className="text-xs font-semibold text-ink-muted">Quantity</label>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              const newQty = Math.max(1, exhibitorQuantity - 1);
                              onExhibitorQuantityChange(newQty);
                              const newBadges = [...exhibitorBadges];
                              while (newBadges.length > newQty) newBadges.pop();
                              onExhibitorBadgesChange(newBadges);
                            }}
                            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-ink hover:bg-slate-50 font-bold"
                          >
                            -
                          </button>
                          <span className="text-sm font-semibold text-ink w-8 text-center">{exhibitorQuantity}</span>
                          <button
                            type="button"
                            onClick={() => {
                              const newQty = exhibitorQuantity + 1;
                              onExhibitorQuantityChange(newQty);
                              const newBadges = [...exhibitorBadges];
                              while (newBadges.length < newQty) {
                                newBadges.push({ firstName: '', lastName: '' });
                              }
                              onExhibitorBadgesChange(newBadges);
                            }}
                            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-ink hover:bg-slate-50 font-bold"
                          >
                            +
                          </button>
                        </div>
                      </div>
                      <div className="space-y-3">
                        <p className="text-xs font-semibold text-ink-muted">Exhibitor Names</p>
                        {Array.from({ length: exhibitorQuantity }).map((_, idx) => {
                          const badge = exhibitorBadges[idx] || { firstName: '', lastName: '' };
                          return (
                            <div key={idx} className="flex gap-2">
                              <input
                                type="text"
                                required
                                value={badge.firstName}
                                onChange={(e) => {
                                  const updated = [...exhibitorBadges];
                                  if (!updated[idx]) updated[idx] = { firstName: '', lastName: '' };
                                  updated[idx].firstName = e.target.value;
                                  onExhibitorBadgesChange(updated);
                                }}
                                className="input-base flex-1"
                                placeholder={`First Name #${idx + 1}`}
                              />
                              <input
                                type="text"
                                required
                                value={badge.lastName}
                                onChange={(e) => {
                                  const updated = [...exhibitorBadges];
                                  if (!updated[idx]) updated[idx] = { firstName: '', lastName: '' };
                                  updated[idx].lastName = e.target.value;
                                  onExhibitorBadgesChange(updated);
                                }}
                                className="input-base flex-1"
                                placeholder={`Last Name #${idx + 1}`}
                              />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {locked && (
                  <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <svg
                        className="h-4 w-4 flex-shrink-0 text-amber-600"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                        aria-hidden="true"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
                        />
                      </svg>
                      <p className="text-sm font-semibold text-amber-800">
                        Membership Verification Notice
                      </p>
                    </div>
                    <div className="space-y-2 text-xs leading-relaxed text-amber-800">
                      <p>Membership Status Unverified.</p>
                      <p>
                        If you believe you are a current member and wish to receive the
                        discounted member rate, please do not proceed with the payment.
                        Instead, kindly contact the Secretariat at{' '}
                        <span className="font-bold text-amber-900">
                          iabse2026@kibse.or.kr
                        </span>{' '}
                        to verify your membership status. We will update your profile as
                        soon as your status is confirmed.
                      </p>
                      <p>
                        <span className="font-bold">Note:</span> Please ensure your
                        membership is verified before completing the payment, as refunds
                        for rate differences may not be issued after the transaction is
                        processed.
                      </p>
                    </div>
                  </div>
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
              <p className="text-sm font-semibold text-ink">
                {REGISTRATION_CATEGORIES.find((c) => c.key === selectedCategory)?.label}
              </p>
              <p className="text-xs text-ink-faint mt-0.5">
                {tierCfg.label} · {selectedCategory === 'EXHIBITOR' ? `Qty: ${exhibitorQuantity}` : `Deadline ${deadlineLabel(periodByKey[currentTier])}`}
              </p>
              {selectedPrice !== undefined && (
                <p className="amount-total mt-2">
                  {formatKRW(selectedPrice * (selectedCategory === 'EXHIBITOR' ? exhibitorQuantity : 1))}
                </p>
              )}
            </div>
          ) : (
            <p className="text-xs text-ink-faint">No category selected yet</p>
          )}
        </div>

        <div className="mt-auto">
          {errorMessage && (
            <div className="mb-3 rounded-xl border border-red-100 bg-red-50 p-3 text-xs font-semibold text-red-600 animate-fadeIn">
              {errorMessage}
            </div>
          )}
          <button
            onClick={async () => {
              if (selectedCategory === 'MEMBER') {
                setIsValidating(true);
                setErrorMessage(null);
                try {
                  const isValid = await apiVerifyIabseId(iabseId.trim());
                  if (!isValid) {
                    setErrorMessage('The entered IABSE ID does not exist. Please check your ID and try again.');
                    setIsValidating(false);
                    return;
                  }
                } catch (err) {
                  console.error(err);
                  setErrorMessage('Failed to verify IABSE ID. Please try again.');
                  setIsValidating(false);
                  return;
                }
                setIsValidating(false);
              }
              onNext();
            }}
            disabled={!canContinue}
            className="btn-primary flex items-center justify-center gap-2"
          >
            {isValidating ? 'Verifying IABSE ID...' : 'Continue to Additional Options'}
          </button>
        </div>
      </div>
    </div>
  );
};
