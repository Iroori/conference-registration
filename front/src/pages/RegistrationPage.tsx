import { useState, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AdminDashboardPage } from '../components/AdminDashboardPage';
import { useConferenceOptions } from '../hooks/useRegistration';
import { StepRegistrationType } from '../components/StepRegistrationType';
import { StepAdditionalOptions } from '../components/StepAdditionalOptions';
import { StepInvitationLetter } from '../components/StepInvitationLetter';
import { StepSummary } from '../components/StepSummary';
import { Step3Payment, Step4Complete } from '../components/Step3Payment';
import { PaymentHistoryTab } from '../components/PaymentHistory';
import { StepProgress } from '../components/Shared';
import { useAuth } from '../context/AuthContext';
import type {
  PaymentResponse,
  RegistrationStep,
  RegistrationTierKey,
  RegistrationCategory,
  AccompanyingPersonInfo,
} from '../types';
import { INVITATION_OPTION_ID, DEFAULT_SELECTED_OPTION_IDS } from '../types';

const initialQuantities = (): Record<string, number> =>
  Object.fromEntries(DEFAULT_SELECTED_OPTION_IDS.map((id) => [id, 1]));

type NavTab = 'REGISTER' | 'HISTORY' | 'ADMIN';

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
  const location = useLocation();
  const [navTab, setNavTab] = useState<NavTab>(
    location.pathname === '/admin' ? 'ADMIN' : 'REGISTER'
  );
  const [currentStep, setCurrentStep] = useState<RegistrationStep>('REG_TYPE');

  // Step 1 — registration tier + category
  const [selectedTier, setSelectedTier] = useState<RegistrationTierKey | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<RegistrationCategory | null>(null);
  const [selectedRegOptionId, setSelectedRegOptionId] = useState<string | null>(null);

  // Step 2 — additional programs (Welcome Reception selected by default)
  const [additionalQuantities, setAdditionalQuantities] =
    useState<Record<string, number>>(initialQuantities);
  const [accompanyingPerson, setAccompanyingPerson] = useState<AccompanyingPersonInfo>({
    lastName: '',
    firstName: '',
  });

  // Step 3 — invitation letter
  const [needsInvitationLetter, setNeedsInvitationLetter] = useState<boolean | null>(null);

  // Step 5 — payment result
  const [paymentResult, setPaymentResult] = useState<PaymentResponse | null>(null);

  const memberType = user?.memberType ?? 'NON_MEMBER';
  const { data: options } = useConferenceOptions(memberType);

  /** Compute the final list of unique option IDs and quantities map for the payment API */
  const paymentPayload = useMemo(() => {
    const ids: string[] = [];
    const quantities: Record<string, number> = {};

    if (selectedRegOptionId) {
      ids.push(selectedRegOptionId);
    }

    Object.entries(additionalQuantities).forEach(([id, qty]) => {
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
    return subtotal;
  }, [options, paymentPayload]);

  const resetRegistration = () => {
    setCurrentStep('REG_TYPE');
    setSelectedTier(null);
    setSelectedCategory(null);
    setSelectedRegOptionId(null);
    setAdditionalQuantities(initialQuantities());
    setAccompanyingPerson({ lastName: '', firstName: '' });
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
                  : 'border-white/30 bg-white/10 text-white'
              }`}>
                {user.memberType === 'MEMBER'
                  ? 'MEMBER'
                  : user.isYoungEngineer
                    ? 'YOUNG ENGINEER'
                    : user.memberType === 'NON_MEMBER'
                      ? 'NON-MEMBER'
                      : 'NON-MEMBER PLUS'}
              </span>
            </div>
            <div className="flex gap-1 rounded-full border border-white/15 bg-white/5 p-0.5">
              {(['REGISTER', 'HISTORY', ...(user.admin ? ['ADMIN'] : [])] as NavTab[]).map((tab) => (
                <button
                  key={tab}
                  onClick={() => {
                    setNavTab(tab);
                    if (tab === 'ADMIN') {
                      navigate('/admin');
                    } else {
                      navigate('/');
                    }
                  }}
                  className={`rounded-full px-4 py-1.5 text-xs font-medium uppercase tracking-[0.1em] transition ${
                    navTab === tab
                      ? 'bg-gold text-navy'
                      : 'text-white/70 hover:text-white'
                  }`}
                >
                  {tab === 'REGISTER'
                    ? 'Registration'
                    : tab === 'HISTORY'
                    ? 'My Payments'
                    : 'Admin Panel'}
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
                selectedCategory={selectedCategory}
                onSelect={(tier, category, optionId) => {
                  setSelectedTier(tier);
                  setSelectedCategory(category);
                  setSelectedRegOptionId(optionId);
                }}
                onNext={() => setCurrentStep('ADD_OPTIONS')}
              />
            )}

            {currentStep === 'ADD_OPTIONS' && selectedTier && (
              <StepAdditionalOptions
                memberType={memberType}
                selectedTier={selectedTier}
                selectedCategory={selectedCategory}
                selectedRegOptionId={selectedRegOptionId}
                quantities={additionalQuantities}
                onQuantityChange={(id, qty) =>
                  setAdditionalQuantities((prev) => ({ ...prev, [id]: qty }))
                }
                accompanyingPerson={accompanyingPerson}
                onAccompanyingChange={setAccompanyingPerson}
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
                selectedRegOptionId={selectedRegOptionId}
                additionalQuantities={additionalQuantities}
                accompanyingPerson={accompanyingPerson}
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
                accompanyingPerson={accompanyingPerson}
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
              <PaymentHistoryTab />
            </div>
          </div>
        )}

        {/* Admin Dashboard */}
        {navTab === 'ADMIN' && user.admin && (
          <AdminDashboardPage />
        )}

        <p className="mt-6 text-center text-[11px] tracking-wide text-ink-faint">
          iabse2026@kibse.or.kr
        </p>
      </div>
    </div>
  );
};
