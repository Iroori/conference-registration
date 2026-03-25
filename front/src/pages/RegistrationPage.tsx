import { useState } from 'react';
import { Step1Verify } from '../components/Step1Verify';
import { Step2Options } from '../components/Step2Options';
import { Step3Payment, Step4Complete } from '../components/Step3Payment';
import { PaymentHistoryTab, CancelTab } from '../components/PaymentHistory';
import { StepProgress } from '../components/Shared';
import type {
  MemberType,
  PersonalInfo,
  MemberVerifyResponse,
  PaymentResult,
  RegistrationStep,
} from '../types';

type NavTab = 'REGISTER' | 'HISTORY';
type HistorySubTab = 'HISTORY' | 'CANCEL';

export const RegistrationPage = () => {
  const [navTab, setNavTab] = useState<NavTab>('REGISTER');
  const [historySubTab, setHistorySubTab] = useState<HistorySubTab>('HISTORY');
  const [currentStep, setCurrentStep] = useState<RegistrationStep>('VERIFY');

  const [memberType, setMemberType] = useState<MemberType>('NON_MEMBER');
  const [memberId, setMemberId] = useState('');
  const [personalInfo, setPersonalInfo] = useState<PersonalInfo>({
    nameKr: '', nameEn: '', affiliation: '', position: '', country: '대한민국', phone: '',
  });
  const [selectedOptionIds, setSelectedOptionIds] = useState<string[]>([]);
  const [paymentResult, setPaymentResult] = useState<PaymentResult | null>(null);

  const STEP_INDEX: Record<RegistrationStep, number> = {
    VERIFY: 1, OPTIONS: 2, PAYMENT: 3, COMPLETE: 4,
  };

  const handleVerified = (data: MemberVerifyResponse, info: PersonalInfo) => {
    setMemberType(data.memberType);
    setMemberId(data.member?.id ?? '');
    setPersonalInfo(info);
    setCurrentStep('OPTIONS');
  };

  const handleOptionsNext = (optionIds: string[]) => {
    setSelectedOptionIds(optionIds);
    setCurrentStep('PAYMENT');
  };

  const handlePaymentComplete = (result: PaymentResult) => {
    setPaymentResult(result);
    setCurrentStep('COMPLETE');
  };

  const resetRegistration = () => {
    setCurrentStep('VERIFY');
    setMemberType('NON_MEMBER');
    setMemberId('');
    setPersonalInfo({ nameKr: '', nameEn: '', affiliation: '', position: '', country: '대한민국', phone: '' });
    setSelectedOptionIds([]);
    setPaymentResult(null);
  };

  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <div className="mx-auto max-w-4xl px-4">
        {/* Top Nav */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-teal-500">KSSC 2026</p>
            <h1 className="mt-0.5 text-xl font-semibold text-slate-800">Annual Conference</h1>
          </div>
          <div className="flex gap-1 rounded-xl border border-slate-200 bg-white p-1">
            {(['REGISTER', 'HISTORY'] as NavTab[]).map(tab => (
              <button
                key={tab}
                onClick={() => setNavTab(tab)}
                className={`rounded-lg px-4 py-1.5 text-sm font-medium transition ${
                  navTab === tab
                    ? 'bg-slate-800 text-white'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {tab === 'REGISTER' ? '참가 등록' : '결제 관리'}
              </button>
            ))}
          </div>
        </div>

        {/* Registration Flow */}
        {navTab === 'REGISTER' && (
          <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
            {/* Header */}
            <div className="flex items-center justify-between bg-slate-800 px-6 py-3.5">
              <span className="flex items-center gap-2 text-sm font-medium text-white">
                <span className="text-teal-400">·</span>
                {currentStep === 'COMPLETE' ? '등록 완료' : '참가 등록'}
              </span>
              {currentStep !== 'COMPLETE' && (
                <StepProgress currentStep={STEP_INDEX[currentStep]} />
              )}
            </div>

            {/* Step Content */}
            {currentStep === 'VERIFY' && (
              <Step1Verify onVerified={handleVerified} />
            )}
            {currentStep === 'OPTIONS' && (
              <Step2Options
                memberType={memberType}
                personalInfo={personalInfo}
                onNext={handleOptionsNext}
                onBack={() => setCurrentStep('VERIFY')}
              />
            )}
            {currentStep === 'PAYMENT' && (
              <Step3Payment
                memberType={memberType}
                memberId={memberId}
                personalInfo={personalInfo}
                selectedOptionIds={selectedOptionIds}
                onComplete={handlePaymentComplete}
                onBack={() => setCurrentStep('OPTIONS')}
              />
            )}
            {currentStep === 'COMPLETE' && paymentResult && (
              <Step4Complete
                result={paymentResult}
                onGoHistory={() => {
                  setNavTab('HISTORY');
                  resetRegistration();
                }}
              />
            )}
          </div>
        )}

        {/* Payment Management */}
        {navTab === 'HISTORY' && (
          <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
            <div className="bg-slate-800 px-6 py-3.5">
              <span className="flex items-center gap-2 text-sm font-medium text-white">
                <span className="text-teal-400">·</span> 결제 관리
              </span>
            </div>
            <div className="p-6">
              <div className="mb-5 flex gap-2">
                {(['HISTORY', 'CANCEL'] as HistorySubTab[]).map(sub => (
                  <button
                    key={sub}
                    onClick={() => setHistorySubTab(sub)}
                    className={`rounded-full border px-4 py-1.5 text-xs font-medium transition ${
                      historySubTab === sub
                        ? 'border-slate-800 bg-slate-800 text-white'
                        : 'border-slate-200 text-slate-500 hover:border-slate-300'
                    }`}
                  >
                    {sub === 'HISTORY' ? '결제내역 조회' : '결제 취소'}
                  </button>
                ))}
              </div>
              {historySubTab === 'HISTORY' ? <PaymentHistoryTab /> : <CancelTab />}
            </div>
          </div>
        )}

        <p className="mt-6 text-center text-xs text-slate-400">
          문의: registration@kssc2026.org · SSL 암호화 · PCI-DSS 보안 결제
        </p>
      </div>
    </div>
  );
};
