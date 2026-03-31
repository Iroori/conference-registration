import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Step2Options } from '../components/Step2Options';
import { Step3Payment, Step4Complete } from '../components/Step3Payment';
import { PaymentHistoryTab, CancelTab } from '../components/PaymentHistory';
import { StepProgress } from '../components/Shared';
import { useAuth } from '../context/AuthContext';
import type { PaymentResponse, RegistrationStep } from '../types';

type NavTab = 'REGISTER' | 'HISTORY';
type HistorySubTab = 'HISTORY' | 'CANCEL';

export const RegistrationPage = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [navTab, setNavTab] = useState<NavTab>('REGISTER');
  const [historySubTab, setHistorySubTab] = useState<HistorySubTab>('HISTORY');
  const [currentStep, setCurrentStep] = useState<RegistrationStep>('OPTIONS');
  const [selectedOptionIds, setSelectedOptionIds] = useState<string[]>([]);
  const [paymentResult, setPaymentResult] = useState<PaymentResponse | null>(null);

  const STEP_INDEX: Record<RegistrationStep, number> = {
    OPTIONS: 1, PAYMENT: 2, COMPLETE: 3,
  };

  const handleOptionsNext = (optionIds: string[]) => {
    setSelectedOptionIds(optionIds);
    setCurrentStep('PAYMENT');
  };

  const handlePaymentComplete = (result: PaymentResponse) => {
    setPaymentResult(result);
    setCurrentStep('COMPLETE');
  };

  const resetRegistration = () => {
    setCurrentStep('OPTIONS');
    setSelectedOptionIds([]);
    setPaymentResult(null);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <div className="mx-auto max-w-4xl px-4">
        {/* Top Nav */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-teal-500">KSSC 2026</p>
            <h1 className="mt-0.5 text-xl font-semibold text-slate-800">Annual Conference</h1>
          </div>
          <div className="flex items-center gap-3">
            {/* 유저 정보 + 회원유형 */}
            <div className="hidden sm:flex items-center gap-2">
              <span className="text-sm text-slate-600">{user.nameKr}</span>
              <span className={`text-xs rounded-full px-2 py-0.5 font-medium ${
                user.memberType === 'MEMBER'
                  ? 'bg-teal-100 text-teal-700'
                  : user.memberType === 'NON_MEMBER'
                  ? 'bg-amber-100 text-amber-700'
                  : 'bg-slate-100 text-slate-600'
              }`}>
                {user.memberType === 'MEMBER'
                  ? 'MEMBER'
                  : user.memberType === 'NON_MEMBER'
                  ? 'NON-MEMBER (YE)'
                  : 'NON-MEMBER PLUS'}
              </span>
            </div>
            <div className="flex gap-1 rounded-xl border border-slate-200 bg-white p-1">
              {(['REGISTER', 'HISTORY'] as NavTab[]).map((tab) => (
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
            <button
              onClick={handleLogout}
              className="text-xs text-slate-400 hover:text-slate-600 transition"
            >
              로그아웃
            </button>
          </div>
        </div>

        {/* Registration Flow */}
        {navTab === 'REGISTER' && (
          <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
            <div className="flex items-center justify-between bg-slate-800 px-6 py-3.5">
              <span className="flex items-center gap-2 text-sm font-medium text-white">
                <span className="text-teal-400">·</span>
                {currentStep === 'COMPLETE' ? '등록 완료' : '참가 등록'}
              </span>
              {currentStep !== 'COMPLETE' && (
                <StepProgress currentStep={STEP_INDEX[currentStep]} totalSteps={3} />
              )}
            </div>

            {currentStep === 'OPTIONS' && (
              <Step2Options
                memberType={user.memberType}
                onNext={handleOptionsNext}
              />
            )}
            {currentStep === 'PAYMENT' && (
              <Step3Payment
                memberType={user.memberType}
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
                {(['HISTORY', 'CANCEL'] as HistorySubTab[]).map((sub) => (
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
