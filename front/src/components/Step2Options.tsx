import { useState, useMemo } from 'react';
import { useConferenceOptions } from '../hooks/useRegistration';
import { useAuth } from '../context/AuthContext';
import { ErrorBanner, LoadingSpinner, MemberTypePill, SectionLabel, formatKRW } from './Shared';
import type { MemberType, ConferenceOption } from '../types';

interface Step2OptionsProps {
  memberType: MemberType;
  onNext: (selectedOptionIds: string[]) => void;
}

const REGISTRATION_OPTION_IDS: Record<MemberType, string> = {
  MEMBER: 'OPT-REG-MEMBER',
  NON_MEMBER: 'OPT-REG-NONMEMBER',
  NON_MEMBER_PLUS: 'OPT-REG-NONMEMBER-PLUS',
  YOUNG_ENGINEER: 'OPT-REG-YE',
};

const CATEGORY_LABELS: Record<ConferenceOption['category'], string> = {
  REGISTRATION: 'Registration Package',
  PROGRAM: 'Additional Programs',
  ADMIN: 'Administrative Services',
};

const CATEGORY_ORDER: ConferenceOption['category'][] = ['REGISTRATION', 'PROGRAM', 'ADMIN'];

export const Step2Options = ({ memberType, onNext }: Step2OptionsProps) => {
  const { user } = useAuth();
  const registrationId = REGISTRATION_OPTION_IDS[memberType];
  const [selectedIds, setSelectedIds] = useState<string[]>([registrationId]);

  const { data: options, isLoading, error, refetch } = useConferenceOptions(memberType);

  const toggleOption = (optionId: string, isRequired: boolean) => {
    if (isRequired) return;
    setSelectedIds((prev) =>
      prev.includes(optionId) ? prev.filter((id) => id !== optionId) : [...prev, optionId]
    );
  };

  // 프론트엔드에서 가격 계산
  const pricing = useMemo(() => {
    if (!options) return null;
    const selected = options.filter((o) => selectedIds.includes(o.id));
    const subtotal = selected.reduce((sum, o) => sum + o.price, 0);
    const tax = Math.round(subtotal * 0.1);
    return { selected, subtotal, tax, total: subtotal + tax };
  }, [options, selectedIds]);

  if (isLoading) {
    return (
      <div className="flex min-h-[300px] items-center justify-center">
        <LoadingSpinner label="Loading options…" />
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

  const grouped = (options ?? []).reduce<Record<string, ConferenceOption[]>>((acc, opt) => {
    if (!acc[opt.category]) acc[opt.category] = [];
    acc[opt.category].push(opt);
    return acc;
  }, {});

  return (
    <div className="grid grid-cols-1 gap-0 lg:grid-cols-[1fr_300px]">
      {/* Left - 옵션 목록 */}
      <div className="border-b border-slate-100 p-6 lg:border-b-0 lg:border-r">
        {CATEGORY_ORDER.map((cat) => {
          const items = grouped[cat];
          if (!items || items.length === 0) return null;
          return (
            <div key={cat} className="mb-6">
              <SectionLabel>{CATEGORY_LABELS[cat]}</SectionLabel>
              <div className="space-y-2">
                {items.map((opt) => {
                  const isSelected = selectedIds.includes(opt.id);
                  const isSoldOut = opt.available === false;
                  return (
                    <button
                      key={opt.id}
                      onClick={() => !isSoldOut && toggleOption(opt.id, opt.isRequired)}
                      disabled={isSoldOut}
                      className={`w-full rounded-lg border p-3.5 text-left transition ${isSelected
                        ? 'border-teal-400 bg-teal-50 ring-1 ring-teal-200'
                        : isSoldOut
                          ? 'border-slate-100 bg-slate-50 opacity-50 cursor-not-allowed'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                        } ${opt.isRequired && !isSoldOut ? 'cursor-default' : ''}`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div
                            className={`flex h-4 w-4 flex-shrink-0 items-center justify-center rounded border transition ${isSelected ? 'border-teal-500 bg-teal-500' : 'border-slate-300'
                              }`}
                          >
                            {isSelected && (
                              <svg
                                className="h-2.5 w-2.5 text-white"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                strokeWidth={3}
                              >
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                              </svg>
                            )}
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-sm font-medium text-slate-800">{opt.nameEn}</p>
                              {opt.isRequired && (
                                <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500">
                                  Required
                                </span>
                              )}
                              {opt.maxCapacity != null && (
                                <span className="rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-600">
                                  {isSoldOut
                                    ? 'Sold Out'
                                    : `Seats: ${opt.maxCapacity - (opt.currentCount ?? 0)}/${opt.maxCapacity}`}
                                </span>
                              )}
                            </div>
                            <p className="mt-0.5 text-xs text-slate-400">{opt.description}</p>
                          </div>
                        </div>
                        <p className={`flex-shrink-0 text-sm font-semibold ${isSelected ? 'text-teal-600' : 'text-slate-600'}`}>
                          {opt.isFree ? 'Free' : formatKRW(opt.price)}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Right Sidebar - 결제 요약 */}
      <div className="bg-teal-50/40 p-6">
        <SectionLabel>Order Summary</SectionLabel>

        {user && (
          <div className="mb-5 flex items-center gap-3 rounded-lg border border-teal-100 bg-white p-3">
            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-teal-100 text-xs font-semibold text-teal-700">
              {user.nameKr.slice(0, 1)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-slate-800">{user.nameKr}</p>
              <p className="truncate text-xs text-slate-400">{user.affiliation}</p>
            </div>
            <MemberTypePill type={memberType} />
          </div>
        )}

        {pricing && (
          <div className="mb-5 space-y-2">
            {pricing.selected.map((opt) => (
              <div key={opt.id} className="flex justify-between text-xs text-slate-500">
                <span className="truncate pr-2">{opt.nameEn}</span>
                <span className="flex-shrink-0 font-medium text-slate-700">
                  {opt.isFree ? 'Free' : formatKRW(opt.price)}
                </span>
              </div>
            ))}
            <div className="flex justify-between text-xs text-slate-400">
              <span>VAT (10%)</span>
              <span>{formatKRW(pricing.tax)}</span>
            </div>
            <div className="border-t border-slate-200 pt-2">
              <div className="flex justify-between">
                <span className="text-sm font-semibold text-slate-800">Total</span>
                <span className="text-base font-bold text-teal-600">{formatKRW(pricing.total)}</span>
              </div>
            </div>
          </div>
        )}

        <button
          onClick={() => onNext(selectedIds)}
          disabled={selectedIds.length === 0}
          className="btn-primary"
        >
          Proceed to Payment
        </button>
      </div>
    </div>
  );
};
