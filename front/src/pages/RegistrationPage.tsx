import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useConferenceOptions } from '../hooks/useRegistration';
import { StepRegistrationType } from '../components/StepRegistrationType';
import { StepAdditionalOptions } from '../components/StepAdditionalOptions';
import { StepInvitationLetter } from '../components/StepInvitationLetter';
import { StepSummary } from '../components/StepSummary';
import { Step3Payment, Step4Complete } from '../components/Step3Payment';
import { PaymentHistoryTab, CancelTab } from '../components/PaymentHistory';
import { StepProgress } from '../components/Shared';
import { useAuth } from '../context/AuthContext';
import type { PaymentResponse, RegistrationStep, RegistrationTierKey } from '../types';
import { ADDITIONAL_OPTION_IDS, INVITATION_OPTION_ID } from '../types';

type NavTab = 'REGISTER' | 'HISTORY';
type HistorySubTab = 'HISTORY' | 'CANCEL';

const STEP_LABELS = ['Package', 'Add-ons', 'Invitation', 'Review', 'Payment'];

const STEP_INDEX: Record<RegistrationStep, number> = {
  REG_TYPE:    1,
  ADD_OPTIONS: 2,
  INVITATION:  3,
  SUMMARY:     4,
  PAYMENT:     5,
  COMPLETE:    6,
};

export const RegistrationPage = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [navTab, setNavTab]           = useState<NavTab>('REGISTER');
  const [historySubTab, setHistorySubTab] = useState<HistorySubTab>('HISTORY');
  const [currentStep, setCurrentStep] = useState<RegistrationStep>('REG_TYPE');

  // Step 1 — registration tier
  const [selectedTier, setSelectedTier] = useState<RegistrationTierKey | null>(null);
  const [selectedRegOptionId, setSelectedRegOptionId] = useState<string | null>(null);

  // Step 2 — additional programs
  const [additionalQuantities, setAdditionalQuantities] = useState<Record<string, number>>({});

  // Step 3 — invitation letter
  const [needsInvitationLetter, setNeedsInvitationLetter] = useState<boolean | null>(null);

  // Step 5 — payment result
  const [paymentResult, setPaymentResult] = useState<PaymentResponse | null>(null);

  const memberType = user?.memberType ?? 'NON_MEMBER_PLUS';
  const { data: options } = useConferenceOptions(memberType);

  /** Compute the final list of unique option IDs and quantities map for the payment API */
  const paymentPayload = useMemo(() => {
    const ids: string[] = [];
    const quantities: Record<string, number> = {};

    if (selectedRegOptionId) {
      ids.push(selectedRegOptionId);
    }

    (ADDITIONAL_OPTION_IDS as readonly string[]).forEach((id) => {
      const qty = additionalQuantities[id] ?? 0;
      if (qty > 0) {
        ids.push(id);
        quantities[id] = qty;
      }
    });

    if (needsInvitationLetter) {
      ids.push(INVITATION_OPTION_ID);
    }

    return { selectedOptionIds: ids, quantities };
  }, [selectedRegOptionId, additionalQuantities, needsInvitationLetter]);

  /** Total amount (incl. VAT) for display in the payment step */
  const totalAmount = useMemo(() => {
    if (!options) return 0;
    let subtotal = 0;
    paymentPayload.selectedOptionIds.forEach((id) => {
      const opt = options.find((o) => o.id === id);
      if (opt) {
        const qty = paymentPayload.quantities[id] ?? 1;
        subtotal += opt.price * qty;
      }
    });
    return subtotal + Math.round(subtotal * 0.1);
  }, [options, paymentPayload]);

  const resetRegistration = () => {
    setCurrentStep('REG_TYPE');
    setSelectedTier(null);
    setSelectedRegOptionId(null);
    setAdditionalQuantities({});
    setNeedsInvitationLetter(null);
    setPaymentResult(null);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (!user) return null;

  const stepIndex = STEP_INDEX[currentStep];

  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <div className="mx-auto max-w-4xl px-4">
        {/* Top Nav */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-teal-500">IABSE 2026</p>
            <h1 className="mt-0.5 text-xl font-semibold text-slate-800">Annual Conference</h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2">
              <span className="text-sm text-slate-600">{user.nameEn}</span>
              <span className={`text-xs rounded-full px-2 py-0.5 font-medium ${
                user.memberType === 'MEMBER'
                  ? 'bg-teal-100 text-teal-700'
                  : user.memberType === 'NON_MEMBER'
                  ? 'bg-slate-100 text-slate-600'
                  : 'bg-violet-100 text-violet-700'
              }`}>
                {user.memberType === 'MEMBER'
                  ? 'MEMBER'
                  : user.isYoungEngineer
                  ? 'YOUNG ENGINEER'
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
                  {tab === 'REGISTER' ? 'Registration' : 'My Payments'}
                </button>
              ))}
            </div>
            <button
              onClick={handleLogout}
              className="text-xs text-slate-400 hover:text-slate-600 transition"
            >
              Sign Out
            </button>
          </div>
        </div>

        {/* Registration Flow */}
        {navTab === 'REGISTER' && (
          <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
            <div className="flex items-center justify-between bg-slate-800 px-6 py-3.5">
              <span className="flex items-center gap-2 text-sm font-medium text-white">
                <span className="text-teal-400">·</span>
                {currentStep === 'COMPLETE' ? 'Registration Complete' : 'Conference Registration'}
              </span>
              {currentStep !== 'COMPLETE' && (
                <StepProgress
                  currentStep={stepIndex}
                  stepLabels={STEP_LABELS}
                />
              )}
            </div>

            {currentStep === 'REG_TYPE' && (
              <StepRegistrationType
                memberType={memberType}
                selectedTier={selectedTier}
                onSelect={(tier, optionId) => {
                  setSelectedTier(tier);
                  setSelectedRegOptionId(optionId);
                }}
                onNext={() => setCurrentStep('ADD_OPTIONS')}
              />
            )}

            {currentStep === 'ADD_OPTIONS' && (
              <StepAdditionalOptions
                memberType={memberType}
                quantities={additionalQuantities}
                onQuantityChange={(id, qty) =>
                  setAdditionalQuantities((prev) => ({ ...prev, [id]: qty }))
                }
                onNext={() => setCurrentStep('INVITATION')}
                onBack={() => setCurrentStep('REG_TYPE')}
              />
            )}

            {currentStep === 'INVITATION' && (
              <StepInvitationLetter
                needsLetter={needsInvitationLetter}
                onSelect={(needs) => setNeedsInvitationLetter(needs)}
                onNext={() => setCurrentStep('SUMMARY')}
                onBack={() => setCurrentStep('ADD_OPTIONS')}
              />
            )}

            {currentStep === 'SUMMARY' && selectedTier && (
              <StepSummary
                memberType={memberType}
                selectedTier={selectedTier}
                additionalQuantities={additionalQuantities}
                needsInvitationLetter={needsInvitationLetter ?? false}
                onEditPackage={() => setCurrentStep('REG_TYPE')}
                onEditAddons={() => setCurrentStep('ADD_OPTIONS')}
                onEditInvitation={() => setCurrentStep('INVITATION')}
                onNext={() => setCurrentStep('PAYMENT')}
                onBack={() => setCurrentStep('INVITATION')}
              />
            )}

            {currentStep === 'PAYMENT' && (
              <Step3Payment
                memberType={memberType}
                selectedOptionIds={paymentPayload.selectedOptionIds}
                quantities={paymentPayload.quantities}
                totalAmount={totalAmount}
                onComplete={(result) => {
                  setPaymentResult(result);
                  setCurrentStep('COMPLETE');
                }}
                onBack={() => setCurrentStep('SUMMARY')}
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
                <span className="text-teal-400">·</span> Payment Management
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
                    {sub === 'HISTORY' ? 'Payment History' : 'Cancel Registration'}
                  </button>
                ))}
              </div>
              {historySubTab === 'HISTORY' ? <PaymentHistoryTab /> : <CancelTab />}
            </div>
          </div>
        )}

        <p className="mt-6 text-center text-xs text-slate-400">
          Inquiries: iabse2026@kibse.or.kr · SSL Encrypted · PCI-DSS Secure Payment
        </p>
      </div>
    </div>
  );
};
