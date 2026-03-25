import { useState } from 'react';
import { useSubmitPayment, usePricing } from '../hooks/useRegistration';
import { ErrorBanner, LoadingSpinner, MemberTypePill, SectionLabel, formatKRW } from './Shared';
import type { MemberType, PaymentMethod, PaymentRegion, PersonalInfo, PaymentResult } from '../types';
import { CONFERENCE_OPTIONS } from '../lib/api';

interface Step3PaymentProps {
  memberType: MemberType;
  memberId: string;
  personalInfo: PersonalInfo;
  selectedOptionIds: string[];
  onComplete: (result: PaymentResult) => void;
  onBack: () => void;
}

type RegionOption = { id: PaymentRegion; label: string; desc: string };
type MethodOption = { id: PaymentMethod; label: string; desc: string; region: PaymentRegion[] };

const REGION_OPTIONS: RegionOption[] = [
  { id: 'DOMESTIC', label: '국내 결제', desc: '카드·계좌이체·카카오페이 · 즉시 승인' },
  { id: 'OVERSEAS', label: '해외 결제', desc: 'Visa·Mastercard·PayPal · 승인 시간 소요 가능' },
];

const METHOD_OPTIONS: MethodOption[] = [
  { id: 'CARD', label: '신용/체크카드', desc: 'BC·삼성·현대 등', region: ['DOMESTIC'] },
  { id: 'KAKAO_PAY', label: '카카오페이', desc: 'QR 또는 앱 연동', region: ['DOMESTIC'] },
  { id: 'BANK_TRANSFER', label: '계좌이체', desc: '실시간 이체', region: ['DOMESTIC'] },
  { id: 'PAYPAL', label: 'PayPal / 해외카드', desc: 'USD·EUR 지원', region: ['OVERSEAS'] },
];

export const Step3Payment = ({
  memberType, memberId, personalInfo, selectedOptionIds, onComplete, onBack,
}: Step3PaymentProps) => {
  const [region, setRegion] = useState<PaymentRegion>('DOMESTIC');
  const [method, setMethod] = useState<PaymentMethod>('CARD');

  const { data: pricing } = usePricing(memberType, selectedOptionIds, true);
  const { mutate: submitPayment, isPending, error } = useSubmitPayment();

  const selectedOptions = CONFERENCE_OPTIONS.filter(o => selectedOptionIds.includes(o.id));

  const handlePay = () => {
    if (!pricing) return;
    submitPayment(
      {
        memberId,
        memberType,
        personalInfo,
        selectedOptionIds,
        paymentRegion: region,
        paymentMethod: method,
        totalAmount: pricing.total,
      },
      { onSuccess: result => onComplete(result) }
    );
  };

  const availableMethods = METHOD_OPTIONS.filter(m => m.region.includes(region));

  return (
    <div className="grid grid-cols-1 gap-0 lg:grid-cols-[1fr_300px]">
      <div className="border-b border-slate-100 p-6 lg:border-b-0 lg:border-r">
        <SectionLabel>최종 확인</SectionLabel>
        <div className="mb-5 rounded-lg border border-slate-100 bg-slate-50/60 p-4">
          <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-xs">
            {[
              ['등록자', personalInfo.nameKr],
              ['소속', personalInfo.affiliation],
              ['직함', personalInfo.position],
              ['국가', personalInfo.country],
            ].map(([label, val]) => (
              <div key={label} className="flex justify-between">
                <span className="text-slate-400">{label}</span>
                <span className="font-medium text-slate-700">{val}</span>
              </div>
            ))}
            <div className="col-span-2 flex justify-between">
              <span className="text-slate-400">선택 옵션</span>
              <span className="font-medium text-slate-700">{selectedOptions.map(o => o.nameKr).join(', ')}</span>
            </div>
          </div>
        </div>

        <div className="mb-5">
          <SectionLabel>결제 지역</SectionLabel>
          <div className="grid grid-cols-2 gap-2">
            {REGION_OPTIONS.map(r => (
              <button
                key={r.id}
                onClick={() => {
                  setRegion(r.id);
                  setMethod(r.id === 'DOMESTIC' ? 'CARD' : 'PAYPAL');
                }}
                className={`rounded-lg border p-3 text-left transition ${
                  region === r.id
                    ? 'border-teal-400 bg-teal-50 ring-1 ring-teal-200'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <p className={`text-xs font-semibold ${region === r.id ? 'text-teal-700' : 'text-slate-600'}`}>{r.label}</p>
                <p className="mt-0.5 text-[10px] text-slate-400">{r.desc}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="mb-4">
          <SectionLabel>결제 수단</SectionLabel>
          <div className="grid grid-cols-2 gap-2">
            {availableMethods.map(m => (
              <button
                key={m.id}
                onClick={() => setMethod(m.id)}
                className={`rounded-lg border p-3 text-left transition ${
                  method === m.id
                    ? 'border-teal-400 bg-teal-50 ring-1 ring-teal-200'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <p className={`text-xs font-semibold ${method === m.id ? 'text-teal-700' : 'text-slate-600'}`}>{m.label}</p>
                <p className="mt-0.5 text-[10px] text-slate-400">{m.desc}</p>
              </button>
            ))}
          </div>
        </div>

        {error && <ErrorBanner message={(error as Error).message} />}
      </div>

      <div className="bg-teal-50/40 p-6">
        <SectionLabel>최종 결제 금액</SectionLabel>
        <div className="mb-4 flex items-center gap-3 rounded-lg border border-teal-100 bg-white p-3">
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-teal-100 text-xs font-semibold text-teal-700">
            {personalInfo.nameKr.slice(0, 1)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-slate-800">{personalInfo.nameKr}</p>
            <p className="text-xs text-slate-400">{personalInfo.affiliation}</p>
          </div>
          <MemberTypePill type={memberType} />
        </div>

        {pricing && (
          <div className="mb-5 space-y-2">
            {pricing.options.map(o => (
              <div key={o.id} className="flex justify-between text-xs text-slate-500">
                <span className="truncate pr-2">{o.nameKr}</span>
                <span className="font-medium text-slate-700">{o.isFree ? '무료' : formatKRW(o.price)}</span>
              </div>
            ))}
            <div className="flex justify-between text-xs text-slate-400">
              <span>부가세 (10%)</span><span>{formatKRW(pricing.tax)}</span>
            </div>
            <div className="border-t border-slate-200 pt-2">
              <div className="flex justify-between">
                <span className="text-sm font-semibold text-slate-800">최종 합계</span>
                <span className="text-base font-bold text-teal-600">{formatKRW(pricing.total)}</span>
              </div>
            </div>
          </div>
        )}

        <button
          onClick={handlePay}
          disabled={isPending}
          className="mb-2 flex w-full items-center justify-center gap-2 rounded-lg bg-teal-500 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-600 active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-teal-300"
        >
          {isPending && <LoadingSpinner size="sm" />}
          {isPending ? '결제 처리 중...' : '결제하기'}
        </button>
        <button onClick={onBack} className="w-full rounded-lg border border-slate-200 py-2 text-sm text-slate-500 transition hover:bg-slate-50">
          이전 단계
        </button>
        <div className="mt-3 flex items-center justify-center gap-1.5 text-xs text-slate-400">
          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0110 0v4" />
          </svg>
          SSL 암호화 · PCI-DSS 보안
        </div>
        <p className="mt-2 text-center text-xs text-slate-400">
          결제 완료 후 {personalInfo.nameKr ? `${personalInfo.nameKr}님의` : ''} 이메일로 영수증이 자동 발송됩니다
        </p>
      </div>
    </div>
  );
};

interface Step4CompleteProps {
  result: PaymentResult;
  onGoHistory: () => void;
}

export const Step4Complete = ({ result, onGoHistory }: Step4CompleteProps) => (
  <div className="grid grid-cols-1 gap-6 p-8 lg:grid-cols-[1fr_320px]">
    <div className="flex flex-col justify-center">
      <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-teal-100">
        <svg className="h-7 w-7 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
        </svg>
      </div>
      <h2 className="mb-2 text-2xl font-semibold text-slate-800">등록이 완료되었습니다</h2>
      <p className="mb-1 text-sm text-slate-500">
        {result.member.nameKr}님의 등록이 성공적으로 처리되었습니다.
      </p>
      <p className="mb-6 text-sm text-slate-400">
        확인 이메일 및 영수증이 자동 발송되었습니다.
      </p>
      <div className="flex gap-3">
        <button
          onClick={onGoHistory}
          className="rounded-lg border border-slate-200 px-5 py-2 text-sm text-slate-600 transition hover:bg-slate-50"
        >
          결제내역 확인
        </button>
        <button
          onClick={() => window.location.reload()}
          className="rounded-lg bg-teal-500 px-5 py-2 text-sm font-semibold text-white transition hover:bg-teal-600"
        >
          처음으로
        </button>
      </div>
    </div>

    <div className="rounded-xl border border-teal-100 bg-teal-50/50 p-5">
      <SectionLabel>등록 확인서</SectionLabel>
      <div className="mb-4 space-y-2.5">
        <div className="flex justify-between text-sm">
          <span className="text-slate-400">등록 번호</span>
          <span className="font-mono font-semibold text-teal-700">{result.registrationNumber}</span>
        </div>
        {[
          ['등록자', result.member.nameKr],
          ['소속', result.member.affiliation],
          ['회원 유형', result.member.memberType],
          ['결제일', new Date(result.paidAt).toLocaleDateString('ko-KR')],
        ].map(([label, val]) => (
          <div key={label} className="flex justify-between text-sm">
            <span className="text-slate-400">{label}</span>
            <span className="font-medium text-slate-700">{val}</span>
          </div>
        ))}
      </div>
      <div className="border-t border-teal-100 pt-3">
        {result.selectedOptions.map(opt => (
          <div key={opt.id} className="mb-1.5 flex justify-between text-xs">
            <span className="text-slate-500">{opt.nameKr}</span>
            <span className="text-slate-600">{opt.isFree ? '무료' : formatKRW(opt.price)}</span>
          </div>
        ))}
        <div className="mt-2 flex justify-between border-t border-teal-100 pt-2">
          <span className="text-sm font-semibold text-slate-700">합계</span>
          <span className="text-base font-bold text-teal-600">{formatKRW(result.totalAmount)}</span>
        </div>
      </div>
    </div>
  </div>
);
