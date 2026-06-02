import { useState, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AdminDashboardPage } from '../components/AdminDashboardPage';
import { useConferenceOptions } from '../hooks/useRegistration';
import { StepRegistrationType } from '../components/StepRegistrationType';
import { StepAdditionalOptions } from '../components/StepAdditionalOptions';
import { StepTechnicalTour } from '../components/StepTechnicalTour';
import { StepInvitationLetter } from '../components/StepInvitationLetter';
import { StepAdditionalInfo } from '../components/StepAdditionalInfo';
import { StepSummary } from '../components/StepSummary';
import { Step3Payment, Step4Complete } from '../components/Step3Payment';
import { PaymentHistoryTab } from '../components/PaymentHistory';
import { StepProgress } from '../components/Shared';
import { useAuth } from '../context/AuthContext';
import { POSITION_OPTIONS, COUNTRIES } from './SignupPage';
import { apiUpdateProfile } from '../lib/api';
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

type NavTab = 'REGISTER' | 'HISTORY' | 'ADMIN' | 'PROFILE';

const STEP_LABELS = ['Category', 'Options', 'Tours', 'Visa', 'Hotel', 'Confirm', 'Pay'];

const STEP_INDEX: Record<RegistrationStep, number> = {
  REG_TYPE: 1,
  ADD_OPTIONS: 2,
  TECHNICAL_TOUR: 3,
  INVITATION: 4,
  ADDITIONAL_INFO: 5,
  SUMMARY: 6,
  PAYMENT: 7,
  COMPLETE: 8,
};

export const RegistrationPage = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [navTab, setNavTab] = useState<NavTab>(
    location.pathname === '/admin' ? 'ADMIN' : 'REGISTER'
  );
  const [currentStep, setCurrentStep] = useState<RegistrationStep>('REG_TYPE');

  // Step 1 — registration tier + category + options
  const [selectedTier, setSelectedTier] = useState<RegistrationTierKey | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<RegistrationCategory | null>(null);
  const [selectedRegOptionId, setSelectedRegOptionId] = useState<string | null>(null);
  const [iabseId, setIabseId] = useState<string>('');
  const [birthDate, setBirthDate] = useState<string>('');
  const [exhibitorQuantity, setExhibitorQuantity] = useState<number>(1);
  const [exhibitorBadges, setExhibitorBadges] = useState<{ firstName: string; lastName: string }[]>([]);

  // Step 2 — additional programs (Welcome Reception selected by default)
  const [additionalQuantities, setAdditionalQuantities] =
    useState<Record<string, number>>(initialQuantities);
  const [accompanyingPersons, setAccompanyingPersons] = useState<AccompanyingPersonInfo[]>([]);
  const [waitlistedOptionIds, setWaitlistedOptionIds] = useState<string[]>([]);

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
      if (selectedCategory === 'EXHIBITOR') {
        quantities[selectedRegOptionId] = exhibitorQuantity;
      }
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

    return {
      selectedOptionIds: ids,
      quantities,
      accompanyingPersons,
      exhibitorBadges,
      waitlistedOptionIds,
      iabseId,
      birthDate,
    };
  }, [
    selectedRegOptionId,
    selectedCategory,
    exhibitorQuantity,
    additionalQuantities,
    needsInvitationLetter,
    accompanyingPersons,
    exhibitorBadges,
    waitlistedOptionIds,
    iabseId,
    birthDate,
  ]);

  /** Total amount for display in the payment step */
  const totalAmount = useMemo(() => {
    if (!options) return 0;
    let subtotal = 0;
    paymentPayload.selectedOptionIds.forEach((id) => {
      // Skip waitlisted options
      if (waitlistedOptionIds.includes(id)) return;

      const opt = options.find((o) => o.id === id);
      if (opt) {
        const qty = paymentPayload.quantities[id] ?? 1;
        subtotal += opt.price * qty;
      }
    });
    return subtotal;
  }, [options, paymentPayload, waitlistedOptionIds]);

  const resetRegistration = () => {
    setCurrentStep('REG_TYPE');
    setSelectedTier(null);
    setSelectedCategory(null);
    setSelectedRegOptionId(null);
    setIabseId('');
    setBirthDate('');
    setExhibitorQuantity(1);
    setExhibitorBadges([]);
    setAdditionalQuantities(initialQuantities());
    setAccompanyingPersons([]);
    setWaitlistedOptionIds([]);
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
              {(['REGISTER', 'HISTORY', 'PROFILE', ...(user.admin ? ['ADMIN'] : [])] as NavTab[]).map((tab) => (
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
                    : tab === 'PROFILE'
                    ? 'My Profile'
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
                iabseId={iabseId}
                onIabseIdChange={setIabseId}
                birthDate={birthDate}
                onBirthDateChange={setBirthDate}
                exhibitorQuantity={exhibitorQuantity}
                onExhibitorQuantityChange={setExhibitorQuantity}
                exhibitorBadges={exhibitorBadges}
                onExhibitorBadgesChange={setExhibitorBadges}
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
                accompanyingPersons={accompanyingPersons}
                onAccompanyingChange={setAccompanyingPersons}
                waitlistedOptionIds={waitlistedOptionIds}
                onWaitlistChange={setWaitlistedOptionIds}
                onNext={() => setCurrentStep('TECHNICAL_TOUR')}
                onBack={() => setCurrentStep('REG_TYPE')}
              />
            )}

            {currentStep === 'TECHNICAL_TOUR' && selectedTier && (
              <StepTechnicalTour
                memberType={memberType}
                selectedTier={selectedTier}
                selectedCategory={selectedCategory}
                selectedRegOptionId={selectedRegOptionId}
                quantities={additionalQuantities}
                onQuantityChange={(id, qty) =>
                  setAdditionalQuantities((prev) => ({ ...prev, [id]: qty }))
                }
                waitlistedOptionIds={waitlistedOptionIds}
                onWaitlistChange={setWaitlistedOptionIds}
                onNext={() => setCurrentStep('INVITATION')}
                onBack={() => setCurrentStep('ADD_OPTIONS')}
              />
            )}

            {currentStep === 'INVITATION' && (
              <StepInvitationLetter
                needsLetter={needsInvitationLetter}
                onSelect={(needs) => setNeedsInvitationLetter(needs)}
                onNext={() => setCurrentStep('ADDITIONAL_INFO')}
                onBack={() => setCurrentStep('TECHNICAL_TOUR')}
              />
            )}

            {currentStep === 'ADDITIONAL_INFO' && (
              <StepAdditionalInfo
                onNext={() => setCurrentStep('SUMMARY')}
                onBack={() => setCurrentStep('INVITATION')}
              />
            )}

            {currentStep === 'SUMMARY' && selectedTier && (
              <StepSummary
                memberType={memberType}
                selectedTier={selectedTier}
                selectedRegOptionId={selectedRegOptionId}
                additionalQuantities={additionalQuantities}
                accompanyingPersons={accompanyingPersons}
                exhibitorBadges={exhibitorBadges}
                waitlistedOptionIds={waitlistedOptionIds}
                iabseId={iabseId}
                birthDate={birthDate}
                needsInvitationLetter={needsInvitationLetter ?? false}
                onEditPackage={() => setCurrentStep('REG_TYPE')}
                onEditAddons={() => setCurrentStep('ADD_OPTIONS')}
                onEditTours={() => setCurrentStep('TECHNICAL_TOUR')}
                onEditInvitation={() => setCurrentStep('INVITATION')}
                onNext={() => setCurrentStep('PAYMENT')}
                onBack={() => setCurrentStep('ADDITIONAL_INFO')}
              />
            )}

            {currentStep === 'PAYMENT' && (
              <Step3Payment
                memberType={memberType}
                selectedOptionIds={paymentPayload.selectedOptionIds}
                quantities={paymentPayload.quantities}
                accompanyingPersons={accompanyingPersons}
                exhibitorBadges={exhibitorBadges}
                waitlistedOptionIds={waitlistedOptionIds}
                iabseId={iabseId}
                birthDate={birthDate}
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

        {/* User Profile Self-Correction */}
        {navTab === 'PROFILE' && (
          <MyProfileTab />
        )}

        <p className="mt-6 text-center text-[11px] tracking-wide text-ink-faint">
          iabse2026@kibse.or.kr
        </p>
      </div>
    </div>
  );
};

export const MyProfileTab = () => {
  const { user, login } = useAuth();
  const [firstName, setFirstName] = useState(user?.firstName || '');
  const [lastName, setLastName] = useState(user?.lastName || '');
  const [affiliation, setAffiliation] = useState(user?.affiliation || '');
  const [country, setCountry] = useState(user?.country || 'South Korea');
  const [position, setPosition] = useState(user?.position || 'Mr.');
  const [phone, setPhone] = useState(user?.phone || '');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim() || !affiliation.trim() || !phone.trim()) {
      setError('Please fill in all required fields.');
      return;
    }
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const refreshedUser = await apiUpdateProfile({
        firstName,
        lastName,
        affiliation,
        country,
        position,
        phone,
      });

      login(refreshedUser);
      setSuccess(true);
      alert('Profile updated successfully.');
    } catch (err: any) {
      console.error(err);
      setError(err?.response?.data?.message || 'Failed to update profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
      <div className="bg-navy px-6 py-3.5 flex justify-between items-center">
        <span className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.1em] text-white">
          <span className="text-gold">·</span> My Profile
        </span>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        <p className="text-xs text-ink-muted leading-relaxed">
          You can edit your personal details below. Changes will immediately synchronize across your session.
        </p>

        {error && (
          <div className="rounded-xl border border-red-100 bg-red-50 p-4 text-xs font-medium text-red-600">
            {error}
          </div>
        )}

        {success && (
          <div className="rounded-xl border border-teal-100 bg-teal-50/50 p-4 text-xs font-medium text-teal-700">
            Your profile has been successfully updated and synchronized.
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* First Name */}
          <div>
            <label className="block label-section mb-1.5">
              First Name <span className="text-red-500 font-bold">*</span>
            </label>
            <input
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="input-base"
              placeholder="First name"
              required
            />
          </div>

          {/* Last Name */}
          <div>
            <label className="block label-section mb-1.5">
              Last Name <span className="text-red-500 font-bold">*</span>
            </label>
            <input
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="input-base"
              placeholder="Last name"
              required
            />
          </div>
        </div>

        {/* Affiliation */}
        <div>
          <label className="block label-section mb-1.5">
            Affiliation <span className="text-red-500 font-bold">*</span>
          </label>
          <input
            type="text"
            value={affiliation}
            onChange={(e) => setAffiliation(e.target.value)}
            className="input-base"
            placeholder="University or Organization"
            required
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* Country */}
          <div>
            <label className="block label-section mb-1.5">
              Country <span className="text-red-500 font-bold">*</span>
            </label>
            <select
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              className="input-base text-slate-800"
              required
            >
              {COUNTRIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Position */}
          <div>
            <label className="block label-section mb-1.5">
              Position / Title <span className="text-red-500 font-bold">*</span>
            </label>
            <select
              value={position}
              onChange={(e) => setPosition(e.target.value)}
              className="input-base text-slate-800"
              required
            >
              {POSITION_OPTIONS.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Phone */}
        <div>
          <label className="block label-section mb-1.5">
            Phone <span className="text-red-500 font-bold">*</span>
          </label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="input-base"
            placeholder="+82 10-1234-5678"
            required
          />
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-gold hover:bg-gold-soft text-navy px-6 py-2.5 text-xs font-semibold uppercase tracking-[0.1em] transition disabled:opacity-50"
          >
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  );
};
