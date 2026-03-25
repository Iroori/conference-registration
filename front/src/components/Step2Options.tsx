import { useState, useEffect } from 'react';
import { useConferenceOptions, usePricing } from '../hooks/useRegistration';
import { ErrorBanner, LoadingSpinner, MemberTypePill, SectionLabel, formatKRW } from './Shared';
import type { MemberType, PersonalInfo, ConferenceOption } from '../types';

interface Step2OptionsProps {
  memberType: MemberType;
  personalInfo: PersonalInfo;
  onNext: (selectedOptionIds: string[]) => void;
  onBack: () => void;
}

const REGISTRATION_OPTION_IDS: Record<MemberType, string> = {
  MEMBER: 'OPT-REG-MEMBER',
  NON_MEMBER: 'OPT-REG-NONMEMBER',
  NON_MEMBER_PLUS: 'OPT-REG-NONMEMBER-PLUS',
};

const CATEGORY_LABELS: Record<ConferenceOption['category'], string> = {
  REGISTRATION: '참가 패키지',
  PROGRAM: '추가 프로그램',
  ADMIN: '행정 서비스',
};

export const Step2Options = ({ memberType, personalInfo, onNext, onBack }: Step2OptionsProps) => {
  const registrationId = REGISTRATION_OPTION_IDS[memberType];
  const [selectedIds, setSelectedIds] = useState<string[]>([registrationId]);

  const { data: options, isLoading, error, refetch } = useConferenceOptions(memberType);
  const { data: pricing, isLoading: pricingLoading } = usePricing(memberType, selectedIds, selectedIds.length > 0);

  useEffect(() => {
    setSelectedIds([REGISTRATION_OPTION_IDS[memberType]]);
  }, [memberType]);

  const toggleOption = (optionId: string, isRequired: boolean) => {
    if (isRequired) return;
    setSelectedIds(prev =>
      prev.includes(optionId) ? prev.filter(id => id !== optionId) : [...prev, optionId]
    );
  };

  if (isLoading) return (
    <div className="flex min-h-[300px] items-center justify-center">
      <LoadingSpinner label="옵션을 불러오는 중..." />
    </div>
  );

  if (error) return (
    <div className="p-6">
      <ErrorBanner message="옵션을 불러오지 못했습니다." onRetry={() => refetch()} />
    </div>
  );

  const grouped = (options ?? []).reduce<Record<string, ConferenceOption[]>>((acc, opt) => {
    if (!acc[opt.category]) acc[opt.category] = [];
    acc[opt.category].push(opt);
    return acc;
  }, {});

  const categoryOrder: ConferenceOption['category'][] = ['REGISTRATION', 'PROGRAM', 'ADMIN'];
  const filteredGrouped = { ...grouped };
  if (filteredGrouped.REGISTRATION) {
    filteredGrouped.REGISTRATION = filteredGrouped.REGISTRATION.filter(o => o.id === registrationId);
  }

  return (
    <div className="grid grid-cols-1 gap-0 lg:grid-cols-[1fr_300px]">
      {/* Left */}
      <div className="border-b border-slate-100 p-6 lg:border-b-0 lg:border-r">
        {categoryOrder.map(cat => {
          const items = filteredGrouped[cat];
          if (!items || items.length === 0) return null;
          return (
            <div key={cat} className="mb-6">
              <SectionLabel>{CATEGORY_LABELS[cat]}</SectionLabel>
              <div className="space-y-2">
                {items.map(opt => {
                  const isSelected = selectedIds.includes(opt.id);
                  return (
                    <button
                      key={opt.id}
                      onClick={() => toggleOption(opt.id, opt.isRequired)}
                      className={`w-full rounded-lg border p-3.5 text-left transition ${
                        isSelected
                          ? 'border-teal-400 bg-teal-50 ring-1 ring-teal-200'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      } ${opt.isRequired ? 'cursor-default' : 'cursor-pointer'}`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`flex h-4 w-4 items-center justify-center rounded border transition ${
                            isSelected ? 'border-teal-500 bg-teal-500' : 'border-slate-300'
                          }`}>
                            {isSelected && (
                              <svg className="h-2.5 w-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                              </svg>
                            )}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-medium text-slate-800">{opt.nameKr}</p>
                              {opt.isRequired && (
                                <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500">
                                  필수
                                </span>
                              )}
                              {opt.maxCapacity && (
                                <span className="rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-600">
                                  정원 {opt.maxCapacity}명
                                </span>
                              )}
                            </div>
                            <p className="mt-0.5 text-xs text-slate-400">{opt.description}</p>
                          </div>
                        </div>
                        <p className={`text-sm font-semibold ${isSelected ? 'text-teal-600' : 'text-slate-600'}`}>
                          {opt.isFree ? '무료' : formatKRW(opt.price)}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}

        {/* PROGRAM */}
        <div className="mb-6">
          <SectionLabel>추가 프로그램</SectionLabel>
          <div className="space-y-2">
            {(options ?? []).filter(o => o.category === 'PROGRAM').map(opt => {
              const isSelected = selectedIds.includes(opt.id);
              return (
                <button
                  key={opt.id}
                  onClick={() => toggleOption(opt.id, false)}
                  className={`w-full rounded-lg border p-3.5 text-left transition ${
                    isSelected ? 'border-teal-400 bg-teal-50 ring-1 ring-teal-200' : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`flex h-4 w-4 flex-shrink-0 items-center justify-center rounded border transition ${isSelected ? 'border-teal-500 bg-teal-500' : 'border-slate-300'}`}>
                        {isSelected && <svg className="h-2.5 w-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-slate-800">{opt.nameKr}</p>
                          {opt.maxCapacity && <span className="rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-600">정원 {opt.maxCapacity}명</span>}
                        </div>
                        <p className="mt-0.5 text-xs text-slate-400">{opt.description}</p>
                      </div>
                    </div>
                    <p className={`text-sm font-semibold ${isSelected ? 'text-teal-600' : 'text-slate-600'}`}>{formatKRW(opt.price)}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* ADMIN */}
        <div className="mb-2">
          <SectionLabel>행정 서비스</SectionLabel>
          <div className="space-y-2">
            {(options ?? []).filter(o => o.category === 'ADMIN').map(opt => {
              const isSelected = selectedIds.includes(opt.id);
              return (
                <button
                  key={opt.id}
                  onClick={() => toggleOption(opt.id, false)}
                  className={`w-full rounded-lg border p-3.5 text-left transition ${isSelected ? 'border-teal-400 bg-teal-50 ring-1 ring-teal-200' : 'border-slate-200 bg-white hover:border-slate-300'}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`flex h-4 w-4 flex-shrink-0 items-center justify-center rounded border transition ${isSelected ? 'border-teal-500 bg-teal-500' : 'border-slate-300'}`}>
                        {isSelected && <svg className="h-2.5 w-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-800">{opt.nameKr}</p>
                        <p className="mt-0.5 text-xs text-slate-400">{opt.description}</p>
                      </div>
                    </div>
                    <p className={`text-sm font-semibold ${isSelected ? 'text-teal-600' : 'text-slate-600'}`}>{opt.isFree ? '무료' : formatKRW(opt.price)}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Right Sidebar */}
      <div className="bg-teal-50/40 p-6">
        <SectionLabel>결제 요약</SectionLabel>

        <div className="mb-5 flex items-center gap-3 rounded-lg border border-teal-100 bg-white p-3">
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-teal-100 text-xs font-semibold text-teal-700">
            {personalInfo.nameKr.slice(0, 1)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-slate-800">{personalInfo.nameKr}</p>
            <p className="truncate text-xs text-slate-400">{personalInfo.affiliation}</p>
          </div>
          <MemberTypePill type={memberType} />
        </div>

        {pricingLoading ? (
          <div className="flex justify-center py-4"><LoadingSpinner size="sm" /></div>
        ) : pricing ? (
          <div className="mb-5 space-y-2">
            {pricing.options.map(opt => (
              <div key={opt.id} className="flex justify-between text-xs text-slate-500">
                <span className="truncate pr-2">{opt.nameKr}</span>
                <span className="flex-shrink-0 font-medium text-slate-700">
                  {opt.isFree ? '무료' : formatKRW(opt.price)}
                </span>
              </div>
            ))}
            <div className="flex justify-between text-xs text-slate-400">
              <span>부가세 (10%)</span>
              <span>{formatKRW(pricing.tax)}</span>
            </div>
            <div className="border-t border-slate-200 pt-2">
              <div className="flex justify-between">
                <span className="text-sm font-semibold text-slate-800">합계</span>
                <span className="text-base font-bold text-teal-600">{formatKRW(pricing.total)}</span>
              </div>
            </div>
          </div>
        ) : null}

        <button
          onClick={() => onNext(selectedIds)}
          className="mb-2 w-full rounded-lg bg-teal-500 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-600 active:scale-[0.98]"
        >
          결제 단계로
        </button>
        <button
          onClick={onBack}
          className="w-full rounded-lg border border-slate-200 py-2 text-sm text-slate-500 transition hover:bg-slate-50"
        >
          이전 단계
        </button>
      </div>
    </div>
  );
};
