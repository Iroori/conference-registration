import { useState, useRef, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AdminDashboardPage } from '../components/AdminDashboardPage';
import { useConferenceOptions } from '../hooks/useRegistration';
import { StepRegistrationType } from '../components/StepRegistrationType';
import { StepAdditionalOptions } from '../components/StepAdditionalOptions';
import { StepTechnicalTour } from '../components/StepTechnicalTour';
import { StepInvitationLetter } from '../components/StepInvitationLetter';
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

const STEP_LABELS = ['Category', 'Options', 'Tours', 'Visa', 'Confirm', 'Pay'];

const STEP_INDEX: Record<RegistrationStep, number> = {
  REG_TYPE: 1,
  ADD_OPTIONS: 2,
  TECHNICAL_TOUR: 3,
  INVITATION: 4,
  SUMMARY: 5,
  PAYMENT: 6,
  COMPLETE: 7,
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
  const [passportFirstName, setPassportFirstName] = useState<string>('');
  const [passportLastName, setPassportLastName] = useState<string>('');
  const [passportNumber, setPassportNumber] = useState<string>('');

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
      passportFirstName,
      passportLastName,
      passportNumber,
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
    passportFirstName,
    passportLastName,
    passportNumber,
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
    setPassportFirstName('');
    setPassportLastName('');
    setPassportNumber('');
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
            <div className="hidden sm:flex items-center">
              <span className="text-xs text-white/70">{`${user.firstName} ${user.lastName}`}</span>
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
                passportFirstName={passportFirstName}
                onPassportFirstNameChange={setPassportFirstName}
                passportLastName={passportLastName}
                onPassportLastNameChange={setPassportLastName}
                passportNumber={passportNumber}
                onPassportNumberChange={setPassportNumber}
                birthDate={birthDate}
                onBirthDateChange={setBirthDate}
                onNext={() => setCurrentStep('SUMMARY')}
                onBack={() => setCurrentStep('TECHNICAL_TOUR')}
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
                passportFirstName={passportFirstName}
                passportLastName={passportLastName}
                passportNumber={passportNumber}
                onEditPackage={() => setCurrentStep('REG_TYPE')}
                onEditAddons={() => setCurrentStep('ADD_OPTIONS')}
                onEditTours={() => setCurrentStep('TECHNICAL_TOUR')}
                onEditInvitation={() => setCurrentStep('INVITATION')}
                onNext={() => setCurrentStep('PAYMENT')}
                onBack={() => setCurrentStep('INVITATION')}
              />
            )}

            {currentStep === 'PAYMENT' && (
              <Step3Payment
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

  const [passportFirstName, setPassportFirstName] = useState(user?.passportFirstName || '');
  const [passportLastName, setPassportLastName] = useState(user?.passportLastName || '');
  const [passportNumber, setPassportNumber] = useState(user?.passportNumber || '');
  const [birthDate, setBirthDate] = useState(user?.birthDate || '');
  const dateInputRef = useRef<HTMLInputElement>(null);

  const [isPresenter, setIsPresenter] = useState(user?.isPresenter || false);
  const [isAuthor, setIsAuthor] = useState(user?.isAuthor || false);
  const [paperInfo, setPaperInfo] = useState(user?.paperInfo || '');

  const [billingUniversity, setBillingUniversity] = useState(user?.billingUniversity || '');
  const [billingVat, setBillingVat] = useState(user?.billingVat || '');
  const [billingPoNumber, setBillingPoNumber] = useState(user?.billingPoNumber || '');
  const [billingStreet, setBillingStreet] = useState(user?.billingStreet || '');
  const [billingAdditionalInfo, setBillingAdditionalInfo] = useState(user?.billingAdditionalInfo || '');
  const [billingPoBox, setBillingPoBox] = useState(user?.billingPoBox || '');
  const [billingPostcode, setBillingPostcode] = useState(user?.billingPostcode || '');
  const [billingCity, setBillingCity] = useState(user?.billingCity || '');
  const [billingCountry, setBillingCountry] = useState(user?.billingCountry || 'South Korea');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !firstName.trim() ||
      !lastName.trim() ||
      !affiliation.trim() ||
      !phone.trim() ||
      !billingUniversity.trim() ||
      !billingStreet.trim() ||
      !billingPostcode.trim() ||
      !billingCity.trim() ||
      !billingCountry.trim()
    ) {
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
        billingUniversity,
        billingVat,
        billingPoNumber,
        billingStreet,
        billingAdditionalInfo,
        billingPoBox,
        billingPostcode,
        billingCity,
        billingCountry,
        isPresenter,
        isAuthor,
        paperInfo,
        passportFirstName,
        passportLastName,
        passportNumber,
        birthDate: birthDate || null,
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
          You can edit your personal details and billing address below. Changes will immediately synchronize across your session.
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

        {/* ── Passport & Date of Birth Section ── */}
        <div className="border-t border-slate-200 pt-5">
          <p className="text-lg font-bold text-slate-900 mb-2">
            Passport & Date of Birth
          </p>
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-4 mb-4">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-700">Passport Details (Required for Visa Invitation Letter)</p>
            
            <div>
              <label className="block label-section mb-1.5">Date of Birth</label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="YYYY MM DD"
                  value={birthDate ? birthDate.replace(/-/g, ' ') : ''}
                  onClick={() => dateInputRef.current?.showPicker()}
                  readOnly
                  className="input-base text-slate-850 pr-10 cursor-pointer bg-white"
                />
                <button
                  type="button"
                  onClick={() => dateInputRef.current?.showPicker()}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-650"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5m-9-6h.008v.008H12v-.008zM12 15h.008v.008H12V15zm0 2.25h.008v.008H12v-.008zM9.75 15h.008v.008H9.75V15zm0 2.25h.008v.008H9.75v-.008zM7.5 15h.008v.008H7.5V15zm0 2.25h.008v.008H7.5v-.008zm6.75-4.5h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V15zm0 2.25h.008v.008h-.008v-.008zm2.25-4.5h.008v.008H16.5v-.008zm0 2.25h.008v.008H16.5V15z" />
                  </svg>
                </button>
                <input
                  type="date"
                  ref={dateInputRef}
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                  className="absolute opacity-0 w-0 h-0 pointer-events-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block label-section mb-1.5">Passport First Name</label>
                <input
                  type="text"
                  value={passportFirstName}
                  onChange={(e) => setPassportFirstName(e.target.value)}
                  className="input-base"
                  placeholder="First name as on passport"
                />
              </div>
              <div>
                <label className="block label-section mb-1.5">Passport Last Name</label>
                <input
                  type="text"
                  value={passportLastName}
                  onChange={(e) => setPassportLastName(e.target.value)}
                  className="input-base"
                  placeholder="Last name as on passport"
                />
              </div>
            </div>

            <div>
              <label className="block label-section mb-1.5">Passport Number</label>
              <input
                type="text"
                value={passportNumber}
                onChange={(e) => setPassportNumber(e.target.value)}
                className="input-base"
                placeholder="Passport number"
              />
            </div>
          </div>
        </div>

        {/* ── Billing Address Section ── */}
        <div className="border-t border-slate-200 pt-5">
          <p className="text-lg font-bold text-slate-900 mb-2">
            Billing Address
          </p>
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-4 mb-4">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-700">Section 2 - Billing Address</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block label-section mb-1.5">University / Organization <span className="text-red-500 font-bold">*</span></label>
                <input
                  type="text"
                  value={billingUniversity}
                  onChange={(e) => setBillingUniversity(e.target.value)}
                  className="input-base"
                  placeholder="University / Organization"
                  required
                />
              </div>
              <div>
                <label className="block label-section mb-1.5">VAT/CIF/NIF/ other ref.</label>
                <input
                  type="text"
                  value={billingVat}
                  onChange={(e) => setBillingVat(e.target.value)}
                  className="input-base"
                  placeholder="VAT / Tax reference number"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block label-section mb-1.5">PO number or other purchase identification</label>
                <input
                  type="text"
                  value={billingPoNumber}
                  onChange={(e) => setBillingPoNumber(e.target.value)}
                  className="input-base"
                  placeholder="PO number"
                />
              </div>
              <div>
                <label className="block label-section mb-1.5">Street name and number <span className="text-red-500 font-bold">*</span></label>
                <input
                  type="text"
                  value={billingStreet}
                  onChange={(e) => setBillingStreet(e.target.value)}
                  className="input-base"
                  placeholder="Street address"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block label-section mb-1.5">Additional address information</label>
                <input
                  type="text"
                  value={billingAdditionalInfo}
                  onChange={(e) => setBillingAdditionalInfo(e.target.value)}
                  className="input-base"
                  placeholder="Apt, Suite, Unit, etc."
                />
              </div>
              <div>
                <label className="block label-section mb-1.5">PO Box number</label>
                <input
                  type="text"
                  value={billingPoBox}
                  onChange={(e) => setBillingPoBox(e.target.value)}
                  className="input-base"
                  placeholder="PO Box number"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block label-section mb-1.5">Postcode <span className="text-red-500 font-bold">*</span></label>
                <input
                  type="text"
                  value={billingPostcode}
                  onChange={(e) => setBillingPostcode(e.target.value)}
                  className="input-base"
                  placeholder="Zip/Postcode"
                  required
                />
              </div>
              <div>
                <label className="block label-section mb-1.5">City <span className="text-red-500 font-bold">*</span></label>
                <input
                  type="text"
                  value={billingCity}
                  onChange={(e) => setBillingCity(e.target.value)}
                  className="input-base"
                  placeholder="City"
                  required
                />
              </div>
              <div>
                <label className="block label-section mb-1.5">Country <span className="text-red-500 font-bold">*</span></label>
                <select
                  value={billingCountry}
                  onChange={(e) => setBillingCountry(e.target.value)}
                  className="input-base text-slate-800"
                  required
                >
                  {COUNTRIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* ── Paper Author and Presenter Status Section ── */}
        <div className="border-t border-slate-200 pt-5">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-4">
            <div>
              <p className="text-sm font-bold text-slate-850 uppercase tracking-wider mb-1">
                Paper Author and Presenter Status
              </p>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Please check all that apply. Leave this section blank if none apply.
              </p>
            </div>

            <div className="space-y-2.5">
              {/* Author Checkbox */}
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isAuthor}
                  onChange={(e) => setIsAuthor(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-slate-355 text-gold focus:ring-gold"
                />
                <span className="text-sm font-semibold text-slate-800">
                  I am an author or co-author of a paper at the Congress.
                </span>
              </label>

              {/* Presenter Checkbox */}
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isPresenter}
                  onChange={(e) => setIsPresenter(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-slate-355 text-gold focus:ring-gold"
                />
                <span className="text-sm font-semibold text-slate-800">
                  I am the presenter of a paper at the Congress.
                </span>
              </label>
            </div>

            <div className="border-t border-slate-200/80 pt-3.5 space-y-3">
              <div>
                <label className="block label-section text-[11px] uppercase mb-1.5 text-slate-800">
                  Please enter your paper number or title here.
                </label>
                <input
                  type="text"
                  value={paperInfo}
                  onChange={(e) => setPaperInfo(e.target.value)}
                  className="input-base"
                  placeholder="123 or A Novel Bridge Design…"
                  maxLength={300}
                />
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed font-normal">
                Full papers accepted by the Scientific Committee will be published in the IABSE Congress 2026 Proceedings. If your abstract or full paper is accepted, please enter its number or title.
              </p>
            </div>
          </div>
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
