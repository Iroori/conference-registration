import React, { useState } from 'react';
import { useVerifyMember } from '../hooks/useRegistration';
import { ErrorBanner, LoadingSpinner, MemberTypePill, SectionLabel } from './Shared';
import type { MemberType, MemberVerifyResponse, PersonalInfo } from '../types';

interface Step1VerifyProps {
  onVerified: (data: MemberVerifyResponse, personalInfo: PersonalInfo) => void;
}

const COUNTRIES = ['대한민국', '미국', '일본', '중국', '독일', '영국', '프랑스', '기타'];

const MEMBER_TYPE_DESCRIPTIONS: Record<MemberType, { nameKr: string; desc: string; priceFrom: string }> = {
  MEMBER:          { nameKr: '정회원', desc: '학회 등록 회원 · 할인 요금 적용', priceFrom: '₩150,000~' },
  NON_MEMBER:      { nameKr: '비회원', desc: '일반 참가자 · 정가 적용', priceFrom: '₩250,000~' },
  NON_MEMBER_PLUS: { nameKr: '비회원 PLUS', desc: '비회원 등록 + 당일 학회 가입 포함', priceFrom: '₩320,000~' },
};

const MEMBER_TYPES: MemberType[] = ['MEMBER', 'NON_MEMBER', 'NON_MEMBER_PLUS'];

export const Step1Verify = ({ onVerified }: Step1VerifyProps) => {
  const [email, setEmail] = useState('');
  const [verifyResult, setVerifyResult] = useState<MemberVerifyResponse | null>(null);
  const [selectedMemberType, setSelectedMemberType] = useState<MemberType>('NON_MEMBER');
  const [personalInfo, setPersonalInfo] = useState<PersonalInfo>({
    nameKr: '', nameEn: '', affiliation: '', position: '', country: '대한민국', phone: '',
  });
  const [formErrors, setFormErrors] = useState<Partial<PersonalInfo>>({});

  const { mutate: verifyMember, isPending, error } = useVerifyMember();

  const handleVerify = () => {
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return;
    verifyMember({ email }, {
      onSuccess: (res) => {
        setVerifyResult(res);
        if (res.found && res.member) {
          setSelectedMemberType('MEMBER');
          setPersonalInfo({
            nameKr: res.member.nameKr,
            nameEn: res.member.nameEn,
            affiliation: res.member.affiliation,
            position: res.member.position,
            country: res.member.country,
            phone: res.member.phone,
          });
        }
      },
    });
  };

  const validateForm = (): boolean => {
    const errors: Partial<PersonalInfo> = {};
    if (!personalInfo.nameKr.trim()) errors.nameKr = '이름(한글)을 입력해주세요';
    if (!personalInfo.nameEn.trim()) errors.nameEn = '이름(영문)을 입력해주세요';
    if (!personalInfo.affiliation.trim()) errors.affiliation = '소속 기관을 입력해주세요';
    if (!personalInfo.position.trim()) errors.position = '직함을 입력해주세요';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleNext = () => {
    if (!verifyResult) return;
    if (!validateForm()) return;
    onVerified({ ...verifyResult, memberType: selectedMemberType }, personalInfo);
  };

  const updateField = (field: keyof PersonalInfo) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setPersonalInfo(prev => ({ ...prev, [field]: e.target.value }));
    if (formErrors[field]) setFormErrors(prev => ({ ...prev, [field]: undefined }));
  };

  return (
    <div className="grid grid-cols-1 gap-0 lg:grid-cols-[1fr_300px]">
      {/* Left */}
      <div className="border-b border-slate-100 p-6 lg:border-b-0 lg:border-r">
        <SectionLabel>이메일로 회원 확인</SectionLabel>

        <div className="mb-5 rounded-lg border border-teal-100 bg-teal-50/60 p-3.5">
          <p className="text-xs leading-relaxed text-teal-700">
            학회 회원 데이터 기반으로 실시간 검증됩니다. 미등록 이메일은 Non-Member로 처리됩니다.
          </p>
        </div>

        <div className="mb-5">
          <label className="mb-1.5 block text-xs font-medium text-slate-500">이메일 주소</label>
          <div className="flex gap-2">
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleVerify()}
              placeholder="example@university.ac.kr"
              className="h-10 flex-1 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none transition focus:border-teal-400 focus:ring-2 focus:ring-teal-100 placeholder:text-slate-300"
            />
            <button
              onClick={handleVerify}
              disabled={isPending || !email.trim()}
              className="flex h-10 items-center gap-2 rounded-lg border border-teal-300 bg-teal-50 px-4 text-sm font-medium text-teal-700 transition hover:bg-teal-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isPending ? <LoadingSpinner size="sm" /> : null}
              {isPending ? '확인 중...' : '이메일 확인'}
            </button>
          </div>
        </div>

        {error && <div className="mb-4"><ErrorBanner message={(error as Error).message} /></div>}

        {verifyResult && (
          <>
            <div className="mb-5">
              <SectionLabel>회원 유형 선택</SectionLabel>
              <div className="grid grid-cols-3 gap-2">
                {MEMBER_TYPES.map(type => {
                  const info = MEMBER_TYPE_DESCRIPTIONS[type];
                  const isAutoDetected = type === verifyResult.memberType;
                  const isSelected = selectedMemberType === type;
                  return (
                    <button
                      key={type}
                      onClick={() => setSelectedMemberType(type)}
                      className={`relative rounded-lg border p-3 text-left transition ${
                        isSelected
                          ? 'border-teal-400 bg-teal-50 ring-1 ring-teal-300'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      {isAutoDetected && (
                        <span className="absolute right-2 top-2 rounded-full bg-teal-100 px-1.5 py-0.5 text-[10px] font-semibold text-teal-700">
                          검증됨
                        </span>
                      )}
                      <p className="mb-0.5 text-xs font-semibold text-slate-700">{type.replace(/_/g, '-')}</p>
                      <p className="mb-2 text-[10px] leading-relaxed text-slate-400">{info.desc}</p>
                      <p className={`text-sm font-semibold ${isSelected ? 'text-teal-600' : 'text-slate-600'}`}>
                        {info.priceFrom}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mb-4">
              <SectionLabel>개인정보 입력</SectionLabel>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { field: 'nameKr' as const, label: '이름 (한글)', placeholder: '박소연' },
                  { field: 'nameEn' as const, label: '이름 (영문)', placeholder: 'Park Soyeon' },
                  { field: 'affiliation' as const, label: '소속 기관', placeholder: 'POSTECH' },
                  { field: 'position' as const, label: '직함 / 직위', placeholder: '박사과정' },
                ].map(({ field, label, placeholder }) => (
                  <div key={field}>
                    <label className="mb-1.5 block text-xs font-medium text-slate-500">{label}</label>
                    <input
                      type="text"
                      value={personalInfo[field]}
                      onChange={updateField(field)}
                      placeholder={placeholder}
                      className={`h-10 w-full rounded-lg border px-3 text-sm text-slate-800 outline-none transition focus:ring-2 placeholder:text-slate-300 ${
                        formErrors[field]
                          ? 'border-red-300 focus:border-red-400 focus:ring-red-100'
                          : 'border-slate-200 focus:border-teal-400 focus:ring-teal-100'
                      }`}
                    />
                    {formErrors[field] && (
                      <p className="mt-1 text-xs text-red-500">{formErrors[field]}</p>
                    )}
                  </div>
                ))}
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-500">국가</label>
                  <select
                    value={personalInfo.country}
                    onChange={updateField('country')}
                    className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm text-slate-800 outline-none transition focus:border-teal-400 focus:ring-2 focus:ring-teal-100"
                  >
                    {COUNTRIES.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-500">연락처</label>
                  <input
                    type="tel"
                    value={personalInfo.phone}
                    onChange={updateField('phone')}
                    placeholder="+82-10-0000-0000"
                    className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm text-slate-800 outline-none transition focus:border-teal-400 focus:ring-2 focus:ring-teal-100 placeholder:text-slate-300"
                  />
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Right Sidebar */}
      <div className="bg-teal-50/40 p-6">
        <SectionLabel>등록 안내</SectionLabel>

        {verifyResult ? (
          <div className="mb-5 flex items-center gap-3 rounded-lg border border-teal-100 bg-white p-3">
            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-teal-100 text-xs font-semibold text-teal-700">
              {personalInfo.nameKr.slice(0, 1) || '?'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-slate-800">{personalInfo.nameKr || '—'}</p>
              <p className="truncate text-xs text-slate-400">{email}</p>
            </div>
            <MemberTypePill type={selectedMemberType} />
          </div>
        ) : (
          <div className="mb-5 rounded-lg border border-dashed border-slate-200 p-4 text-center">
            <p className="text-xs text-slate-400">이메일 인증 후 회원 정보가 표시됩니다</p>
          </div>
        )}

        <div className="mb-5 space-y-2 text-xs leading-relaxed text-slate-500">
          <div className="flex gap-2"><span className="text-teal-400">·</span><span>등록 후 확인 이메일 자동 발송</span></div>
          <div className="flex gap-2"><span className="text-teal-400">·</span><span>결제 완료 시 영수증 이메일 첨부</span></div>
          <div className="flex gap-2"><span className="text-teal-400">·</span><span>비자 요청은 옵션 단계에서 선택</span></div>
          <div className="flex gap-2"><span className="text-teal-400">·</span><span>문의: registration@kssc2026.org</span></div>
        </div>

        <button
          onClick={handleNext}
          disabled={!verifyResult}
          className="w-full rounded-lg bg-teal-500 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-600 active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
        >
          다음 단계 — 옵션 선택
        </button>
      </div>
    </div>
  );
};
