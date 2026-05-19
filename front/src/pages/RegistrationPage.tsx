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

const STEP_LABELS = ['Select', 'Option', 'Option2', 'Summary', 'Payment'];

const STEP_INDEX: Record<RegistrationStep, number> = {
  REG_TYPE: 1,
  ADD_OPTIONS: 2,
  INVITATION: 3,
  SUMMARY: 4,
  PAYMENT: 5,
  COMPLETE: 6,
};

export const RegistrationPage = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [navTab, setNavTab] = useState<NavTab>('REGISTER');
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
    <div className="min-h-screen bg-cream">
      {/* Top navy header bar */}
      <div className="bg-navy">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-4 px-4 py-5">
          <div className="flex items-center gap-3">
            <img src="/logo_IABSE_white.png" alt="IABSE 2026" className="h-10 object-contain" />
            <h1 className="text-base font-medium tracking-wide text-white">IABSE Congress Incheon 2026</h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2.5">
              <span className="text-xs text-white/70">{`${user.firstName} ${user.lastName}`}</span>
              <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em] ${
                user.memberType === 'MEMBER'
                  ? 'border-gold-soft bg-gold-soft text-gold'
                  : user.memberType === 'NON_MEMBER'
                  ? 'border-white/20 bg-white/5 text-white/70'
                  : 'border-white/30 bg-white/10 text-white'
              }`}>
                {user.memberType === 'MEMBER'
                  ? 'MEMBER'
                  : user.isYoungEngineer
                    ? 'YOUNG ENGINEER'
                    : 'NON-MEMBER PLUS'}
              </span>
            </div>
            <div className="flex gap-1 rounded-full border border-white/15 bg-white/5 p-0.5">
              {(['REGISTER', 'HISTORY'] as NavTab[]).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setNavTab(tab)}
                  className={`rounded-full px-4 py-1.5 text-xs font-medium uppercase tracking-[0.1em] transition ${
                    navTab === tab
                      ? 'bg-gold text-navy'
                      : 'text-white/70 hover:text-white'
                  }`}
                >
                  {tab === 'REGISTER' ? 'Registration' : 'My Payments'}
                </button>
              ))}
            </div>
            <button
              onClick={handleLogout}
              className="text-[11px] uppercase tracking-[0.1em] text-white/50 transition hover:text-white"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-4 py-8">
        {/* Registration Flow */}
        {navTab === 'REGISTER' && (
          <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
            <div className="flex items-center justify-between bg-navy px-6 py-3.5">
              <span className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.1em] text-white">
                <span className="text-gold">·</span>
                {currentStep === 'COMPLETE' ? 'Registration Complete' : 'Registration'}
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
            <div className="bg-navy px-6 py-3.5">
              <span className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.1em] text-white">
                <span className="text-gold">·</span> Payment Management
              </span>
            </div>
            <div className="p-6">
              <div className="mb-5 flex gap-2">
                {(['HISTORY', 'CANCEL'] as HistorySubTab[]).map((sub) => (
                  <button
                    key={sub}
                    onClick={() => setHistorySubTab(sub)}
                    className={`rounded-full border px-4 py-1.5 text-[10px] font-semibold uppercase tracking-[0.1em] transition ${
                      historySubTab === sub
                        ? 'border-gold bg-gold text-navy'
                        : 'border-slate-200 text-ink-muted hover:border-gold/40 hover:text-ink'
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

        <p className="mt-6 text-center text-[11px] tracking-wide text-ink-faint">
          iabse2026@kibse.or.kr
        </p>
      </div>
    </div>
  );
};
