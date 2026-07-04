import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCreatePayment, usePaymentHistory } from '../hooks/useRegistration';
import { PaymentHistoryTab } from '../components/PaymentHistory';
import { MyProfileTab } from './RegistrationPage';
import { SectionLabel, formatKRW } from '../components/Shared';
import { apiReportPaymentFailure } from '../lib/api';
import type { PaymentResponse } from '../types';

type NavTab = 'REGISTER' | 'PRE_WORKSHOP' | 'HISTORY' | 'PROFILE';
type Step = 'PROGRAM_SELECT' | 'PRICE_SELECT' | 'CONFIRM_PAY' | 'COMPLETE';

const OPTIONS_CONFIG = {
  FORENSIC: {
    title: 'Forensic Engineering Practice',
    brochureUrl: '/api/pre-workshop/download?fileName=ForensicEngineeringPractice.pdf',
    brochureName: 'ForensicEngineeringPractice.pdf',
    stdId: 'OPT-PRE-FORENSIC-STD',
    stuId: 'OPT-PRE-FORENSIC-STU',
  },
  SHM: {
    title: 'Structural Health Monitoring',
    brochureUrl: '/api/pre-workshop/download?fileName=StructuralHealthMonitoring.png',
    brochureName: 'StructuralHealthMonitoring.png',
    stdId: 'OPT-PRE-SHM-STD',
    stuId: 'OPT-PRE-SHM-STU',
  },
};

function isKoreanUser(country: string | undefined): boolean {
  if (!country) return false;
  const normalized = country.trim().toLowerCase();
  const keywords = ['south korea', 'korea', '대한민국', 'kr'];
  return keywords.some((kw) => normalized.includes(kw));
}

export const PreWorkshopPage = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [navTab, setNavTab] = useState<NavTab>('PRE_WORKSHOP');
  const [currentStep, setCurrentStep] = useState<Step>('PROGRAM_SELECT');

  // Selection states
  const [selectedProgram, setSelectedProgram] = useState<'FORENSIC' | 'SHM' | null>(null);
  const [feeType, setFeeType] = useState<'STANDARD' | 'STUDENT' | null>(null);

  // Payment states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pgError, setPgError] = useState<string | null>(null);
  const [policyAgreed, setPolicyAgreed] = useState(false);
  const [paymentResult, setPaymentResult] = useState<PaymentResponse | null>(null);

  const { data: payments } = usePaymentHistory();
  const { mutate: createPayment, isPending, error: serverError } = useCreatePayment();

  // Check if user has already paid for pre-workshop
  const alreadyPaidPreWorkshop = useMemo(() => {
    if (!payments) return null;
    return payments.find(
      (p) =>
        p.status === 'COMPLETED' &&
        p.selectedOptions.some((o) => o.id.startsWith('OPT-PRE-'))
    );
  }, [payments]);

  // Check if user has already paid for main conference
  const alreadyPaidMain = useMemo(() => {
    if (!payments) return null;
    return payments.find(
      (p) =>
        p.status === 'COMPLETED' &&
        p.selectedOptions.some((o) => o.category === 'REGISTRATION')
    );
  }, [payments]);

  // Determine current option ID and price
  const selectedOptionId = useMemo(() => {
    if (!selectedProgram || !feeType) return '';
    const cfg = OPTIONS_CONFIG[selectedProgram];
    return feeType === 'STANDARD' ? cfg.stdId : cfg.stuId;
  }, [selectedProgram, feeType]);

  const selectedPrice = useMemo(() => {
    if (!feeType) return 0;
    return feeType === 'STANDARD' ? 400000 : 300000;
  }, [feeType]);

  const selectedTitle = useMemo(() => {
    if (!selectedProgram) return '';
    return OPTIONS_CONFIG[selectedProgram].title;
  }, [selectedProgram]);

  // Setup PayGate configuration
  const domestic = isKoreanUser(user?.country);
  const mid = domestic
    ? (import.meta.env.VITE_PAYGATE_MID_DOMESTIC || 'kibse')
    : (import.meta.env.VITE_PAYGATE_MID_OVERSEAS || 'kibse0us');
  const goodcurrency = 'WON';
  const unitprice = selectedPrice;
  const paymethod = domestic ? 'card' : '101';

  // Setup window event listener for PG popup
  useEffect(() => {
    (window as any).getPGIOresult = () => {
      const form = document.forms.namedItem('PGIOForm') as HTMLFormElement;
      if (!form) return;
      const replycode = (form.elements.namedItem('replycode') as HTMLInputElement)?.value;
      const replyMsg = (form.elements.namedItem('replyMsg') as HTMLInputElement)?.value;

      if (replycode === '0000' || replycode === 'NPS000' || replycode === 'NPS016') {
        createPayment(
          {
            selectedOptionIds: [selectedOptionId],
            paymentMethod: 'CARD',
            tid: (form.elements.namedItem('tid') as HTMLInputElement)?.value,
            replycode: replycode,
          },
          {
            onSuccess: (result) => {
              setPaymentResult(result);
              setCurrentStep('COMPLETE');
              setIsSubmitting(false);
            },
            onError: () => setIsSubmitting(false),
          }
        );
      } else {
        setIsSubmitting(false);
        setPgError(`[${replycode}] ${replyMsg || 'Payment was not completed. Please try again.'}`);
        apiReportPaymentFailure({
          replycode,
          replyMsg,
          tid: (form.elements.namedItem('tid') as HTMLInputElement)?.value || undefined,
        });
      }
    };
  }, [createPayment, selectedOptionId]);

  const handlePay = () => {
    if (isSubmitting || isPending) return;
    if (!policyAgreed) {
      setPgError('Please agree to the Cancellation and Refund Policy before proceeding.');
      return;
    }
    setPgError(null);

    if (typeof (window as any).doTransaction === 'function') {
      setIsSubmitting(true);

      let form = document.forms.namedItem('PGIOForm') as HTMLFormElement;
      if (form) {
        form.remove();
      }

      form = document.createElement('form');
      form.name = 'PGIOForm';
      form.style.display = 'none';

      const addInput = (name: string, value: string) => {
        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = name;
        input.value = value;
        form.appendChild(input);
      };

      addInput('mid', mid);
      addInput('paymethod', paymethod);
      addInput('goodname', 'IABSE 2026 Pre-workshop');
      addInput('unitprice', String(unitprice));
      addInput('goodcurrency', goodcurrency);
      addInput('langcode', domestic ? 'KR' : 'US');
      addInput('cardquota', '00');
      addInput('replycode', '');
      addInput('replyMsg', '');
      addInput('tid', '');
      addInput('cardauthcode', '');
      addInput('cardtype', '');
      addInput('cardnumber', '');

      if (user) {
        addInput('receipttoname', `${user.firstName || ''} ${user.lastName || ''}`.trim());
        addInput('receipttoemail', user.email);
      }

      document.body.appendChild(form);
      (window as any).doTransaction(form);
    } else {
      setPgError('Payment module is not loaded. Please refresh the page and try again.');
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/pre-workshop/login');
  };

  const serverErrMsg = serverError
    ? ((serverError as { response?: { data?: { message?: string } } })?.response?.data?.message ??
      'An error occurred during payment processing.')
    : null;
  const errMsg = pgError ?? serverErrMsg;

  if (!user) return null;

  return (
    <div className="min-h-screen bg-cream">
      {/* Top navy header bar */}
      <div className="bg-navy">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-4 px-4 py-5">
          <div className="flex items-center gap-3 flex-shrink-0">
            <img src="/logo_IABSE_white.png" alt="IABSE 2026" className="h-10 object-contain" />
            <span className="text-sm sm:text-base font-semibold tracking-wide text-white block">
              IABSE Congress Incheon 2026: Pre-workshop
            </span>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center">
              <span className="text-xs text-white/70">{`${user.firstName} ${user.lastName}`}</span>
            </div>
            <div className="flex gap-1 rounded-full border border-white/15 bg-white/5 p-0.5">
              {(['REGISTER', 'PRE_WORKSHOP', 'HISTORY', 'PROFILE'] as NavTab[]).map((tab) => (
                <button
                  key={tab}
                  onClick={() => {
                    if (tab === 'PRE_WORKSHOP') {
                      setNavTab(tab);
                    } else {
                      navigate('/', { state: { tab } });
                    }
                  }}
                  className={`rounded-full px-4 py-1.5 text-xs font-medium uppercase tracking-[0.1em] transition ${
                    navTab === tab ? 'bg-gold text-navy' : 'text-white/70 hover:text-white'
                  }`}
                >
                  {tab === 'REGISTER'
                    ? 'Registration'
                    : tab === 'PRE_WORKSHOP'
                    ? 'Pre-workshop'
                    : tab === 'HISTORY'
                    ? 'My Payments'
                    : 'My Profile'}
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
        {/* Shared payments warning/badge */}
        {navTab === 'PRE_WORKSHOP' && alreadyPaidMain && (
          <div className="mb-6 rounded-xl border border-emerald-100 bg-emerald-50/50 p-4 text-xs text-emerald-800 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="flex h-2 w-2 rounded-full bg-emerald-500"></span>
              <span>You have completed your registration for the main Congress.</span>
            </div>
            <button
              onClick={() => setNavTab('HISTORY')}
              className="font-semibold underline hover:text-emerald-950 transition uppercase tracking-wider"
            >
              View Receipt
            </button>
          </div>
        )}

        {navTab === 'PRE_WORKSHOP' && alreadyPaidPreWorkshop && (
          <div className="mb-6 rounded-xl border border-gold/20 bg-gold-tint/50 p-5 text-sm text-slate-800 space-y-3">
            <div className="flex items-center gap-2 font-bold text-navy">
              <svg className="h-5 w-5 text-gold flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Pre-workshop Registration Completed</span>
            </div>
            <p className="text-xs text-slate-600 pl-7 leading-relaxed">
              You have already registered for the Pre-workshop:{' '}
              <strong className="text-navy">
                {alreadyPaidPreWorkshop.selectedOptions.find((o) => o.id.startsWith('OPT-PRE-'))?.nameEn}
              </strong>
              .<br />
              Registration Number:{' '}
              <span className="font-mono font-semibold text-gold">{alreadyPaidPreWorkshop.registrationNumber}</span>
            </p>
            <div className="pl-7 pt-1">
              <button
                onClick={() => setNavTab('HISTORY')}
                className="btn-secondary py-1 px-3 text-xs inline-flex items-center gap-1.5"
              >
                View Payment Receipt
              </button>
            </div>
          </div>
        )}

        {/* Tab content logic */}
        {navTab === 'PRE_WORKSHOP' && !alreadyPaidPreWorkshop && (
          <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
            {/* Header branding */}
            <div className="bg-navy px-6 py-5 border-b border-white/10 text-left">
              <h2 className="text-lg font-bold text-white tracking-wide">
                IABSE Congress Incheon 2026: Pre-workshop
              </h2>
            </div>

            {/* Stepper display */}
            <div className="bg-slate-50 px-6 py-3 border-b border-slate-100 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-400">
              <span className={currentStep === 'PROGRAM_SELECT' ? 'text-gold' : ''}>1. Program Selection</span>
              <span>&gt;</span>
              <span className={currentStep === 'PRICE_SELECT' ? 'text-gold' : ''}>2. Price Type</span>
              <span>&gt;</span>
              <span className={currentStep === 'CONFIRM_PAY' ? 'text-gold' : ''}>3. Payment</span>
              <span>&gt;</span>
              <span className={currentStep === 'COMPLETE' ? 'text-gold' : ''}>4. Complete</span>
            </div>

            {/* Step 1: Program Option selection */}
            {currentStep === 'PROGRAM_SELECT' && (
              <div className="p-6 space-y-6">
                {/* Logo, Date, Venue above cards */}
                <div className="flex flex-col items-center text-center space-y-3 pb-6 border-b border-slate-100">
                  <img src="/logo.png" alt="IABSE Incheon" className="h-36 object-contain" />
                  <div className="space-y-1 text-base font-semibold text-slate-500">
                    <p>Date: <span className="font-normal text-slate-600">15 September 2026</span></p>
                    <p>Venue: <span className="font-normal text-slate-600">Songdo ConvensiA</span></p>
                  </div>
                </div>

                <SectionLabel>Select Program Option</SectionLabel>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Forensic Option Card */}
                  <div
                     onClick={() => setSelectedProgram('FORENSIC')}
                     className={`cursor-pointer rounded-xl border p-5 transition flex flex-col justify-between h-32 hover:border-gold-hover hover:shadow-sm select-none ${
                       selectedProgram === 'FORENSIC'
                         ? 'border-gold bg-gold-tint/20 ring-1 ring-gold'
                         : 'border-slate-150 bg-white'
                     }`}
                   >
                     <div>
                       <div className="flex justify-between items-start gap-2">
                         <h3 className="font-bold text-navy text-base leading-snug">
                           {OPTIONS_CONFIG.FORENSIC.title}
                         </h3>
                         <input
                           type="radio"
                           checked={selectedProgram === 'FORENSIC'}
                           readOnly
                           className="text-gold focus:ring-gold h-4 w-4"
                         />
                       </div>
                     </div>
                     <div className="mt-4 pt-4 border-t border-slate-100">
                       <a
                         href={OPTIONS_CONFIG.FORENSIC.brochureUrl}
                         download={OPTIONS_CONFIG.FORENSIC.brochureName}
                         onClick={(e) => e.stopPropagation()}
                         className="inline-flex items-center gap-1.5 text-xs text-gold font-semibold uppercase tracking-wider hover:text-gold-hover transition"
                       >
                         <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                         </svg>
                         Download Syllabus (PDF)
                       </a>
                     </div>
                   </div>
 
                   {/* SHM Option Card */}
                   <div
                     onClick={() => setSelectedProgram('SHM')}
                     className={`cursor-pointer rounded-xl border p-5 transition flex flex-col justify-between h-32 hover:border-gold-hover hover:shadow-sm select-none ${
                       selectedProgram === 'SHM'
                         ? 'border-gold bg-gold-tint/20 ring-1 ring-gold'
                         : 'border-slate-150 bg-white'
                     }`}
                   >
                     <div>
                       <div className="flex justify-between items-start gap-2">
                         <h3 className="font-bold text-navy text-base leading-snug">
                           {OPTIONS_CONFIG.SHM.title}
                         </h3>
                         <input
                           type="radio"
                           checked={selectedProgram === 'SHM'}
                           readOnly
                           className="text-gold focus:ring-gold h-4 w-4"
                         />
                       </div>
                     </div>
                     <div className="mt-4 pt-4 border-t border-slate-100">
                       <a
                         href={OPTIONS_CONFIG.SHM.brochureUrl}
                         download={OPTIONS_CONFIG.SHM.brochureName}
                         onClick={(e) => e.stopPropagation()}
                         className="inline-flex items-center gap-1.5 text-xs text-gold font-semibold uppercase tracking-wider hover:text-gold-hover transition"
                       >
                         <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                         </svg>
                         Download Brochure (PNG)
                       </a>
                     </div>
                   </div>
                </div>

                <div className="mt-8 flex justify-end">
                  <button
                    disabled={!selectedProgram}
                    onClick={() => setCurrentStep('PRICE_SELECT')}
                    className="btn-primary w-full md:w-auto md:px-8 py-3"
                  >
                    Next Step
                  </button>
                </div>
              </div>
            )}

            {/* Step 2: Price Type selection */}
            {currentStep === 'PRICE_SELECT' && (
              <div className="p-6 space-y-6">
                <SectionLabel>Select Registration Fee Type</SectionLabel>

                <div className="rounded-lg border border-slate-100 bg-slate-50/50 p-4 mb-4 text-xs text-slate-700">
                  <p>
                    Selected Program:{' '}
                    <strong className="text-navy">{selectedTitle}</strong>
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Standard Fee Card */}
                  <div
                    onClick={() => setFeeType('STANDARD')}
                    className={`cursor-pointer rounded-xl border p-5 transition flex flex-col justify-between h-32 hover:border-gold-hover hover:shadow-sm select-none ${
                      feeType === 'STANDARD'
                        ? 'border-gold bg-gold-tint/20 ring-1 ring-gold'
                        : 'border-slate-150 bg-white'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-bold text-navy text-sm uppercase tracking-wide">Standard Fee</h4>
                      </div>
                      <input
                        type="radio"
                        checked={feeType === 'STANDARD'}
                        readOnly
                        className="text-gold focus:ring-gold h-4 w-4"
                      />
                    </div>
                    <div className="mt-4 flex justify-between items-baseline">
                      <span className="text-xs text-slate-400">Price:</span>
                      <span className="text-gold text-xl font-bold">{formatKRW(400000)}</span>
                    </div>
                  </div>

                  {/* Student Fee Card */}
                  <div
                    onClick={() => setFeeType('STUDENT')}
                    className={`cursor-pointer rounded-xl border p-5 transition flex flex-col justify-between h-32 hover:border-gold-hover hover:shadow-sm select-none ${
                      feeType === 'STUDENT'
                        ? 'border-gold bg-gold-tint/20 ring-1 ring-gold'
                        : 'border-slate-150 bg-white'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-bold text-navy text-sm uppercase tracking-wide">Student Fee</h4>
                      </div>
                      <input
                        type="radio"
                        checked={feeType === 'STUDENT'}
                        readOnly
                        className="text-gold focus:ring-gold h-4 w-4"
                      />
                    </div>
                    <div className="mt-4 flex justify-between items-baseline">
                      <span className="text-xs text-slate-400">Price:</span>
                      <span className="text-gold text-xl font-bold">{formatKRW(300000)}</span>
                    </div>
                  </div>
                </div>

                {/* Student Warning message */}
                {feeType === 'STUDENT' && (
                  <div className="rounded-xl border border-gold/10 bg-gold-tint/40 p-4 text-xs text-slate-700 flex gap-2">
                    <svg className="h-4 w-4 text-gold flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="leading-relaxed">
                      * Please be advised that we will be verifying student status on-site. All student
                      registrants are required to present a valid student ID at the registration desk
                      upon arrival.
                    </p>
                  </div>
                )}

                <div className="mt-8 flex justify-between gap-4">
                  <button
                    onClick={() => setCurrentStep('PROGRAM_SELECT')}
                    className="btn-secondary w-32 py-3"
                  >
                    Back
                  </button>
                  <button
                    disabled={!feeType}
                    onClick={() => {
                      setPolicyAgreed(false);
                      setPgError(null);
                      setCurrentStep('CONFIRM_PAY');
                    }}
                    className="btn-primary w-full md:w-auto md:px-8 py-3"
                  >
                    Next Step
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Payment & Policies */}
            {currentStep === 'CONFIRM_PAY' && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-[1fr_300px] border-t border-slate-100">
                <div className="p-6 space-y-6 md:border-r border-slate-100">
                  <SectionLabel>Cancellation &amp; Refund Policy</SectionLabel>

                  <div className="prose prose-sm max-h-40 overflow-y-auto rounded-lg border border-slate-150 p-4 text-xs text-slate-650 bg-slate-50/20 leading-relaxed space-y-2">
                    <p className="font-bold text-navy mb-1 text-[11px] uppercase tracking-wider">
                      Cancellation Policy &amp; Minimum Enrollment Warning
                    </p>
                    <p>
                      Please note that the workshop is subject to cancellation if the total number of
                      registrants is fewer than 30 by 31 July 2026. If the minimum enrollment
                      requirement is not met by this date, the workshop will be cancelled, and all
                      pre-registered participants will receive a 100% refund of their registration
                      fee.
                    </p>
                  </div>

                  <label className="flex items-start gap-2.5 select-none cursor-pointer">
                    <input
                      type="checkbox"
                      checked={policyAgreed}
                      onChange={(e) => setPolicyAgreed(e.target.checked)}
                      className="rounded text-gold focus:ring-gold h-4 w-4 mt-0.5"
                    />
                    <span className="text-xs font-semibold text-slate-800">
                      I have read and agree to the Cancellation and Refund Policy.
                    </span>
                  </label>

                  {errMsg && (
                    <div className="rounded-lg bg-red-50 border border-red-100 p-3.5">
                      <p className="text-xs font-semibold text-red-600 leading-normal">{errMsg}</p>
                    </div>
                  )}

                  <div className="pt-4 border-t border-slate-100 flex justify-between gap-4">
                    <button
                      onClick={() => setCurrentStep('PRICE_SELECT')}
                      className="btn-secondary w-32 py-3"
                      disabled={isSubmitting || isPending}
                    >
                      Back
                    </button>
                    <button
                      disabled={isSubmitting || isPending || !policyAgreed}
                      onClick={handlePay}
                      className="btn-primary w-full md:w-auto md:px-8 py-3"
                    >
                      {isPending ? 'Processing…' : isSubmitting ? 'Opening payment window…' : 'Confirm & Pay'}
                    </button>
                  </div>
                </div>

                {/* Sidebar calculation breakdown */}
                <div className="p-6 bg-slate-50/50 space-y-5">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Order Summary
                  </h4>
                  <div className="space-y-3.5">
                    <div className="text-xs">
                      <span className="block text-slate-400 uppercase font-bold text-[9px]">
                        Program Option
                      </span>
                      <span className="font-semibold text-navy leading-tight block mt-1">
                        {selectedTitle}
                      </span>
                    </div>

                    <div className="text-xs">
                      <span className="block text-slate-400 uppercase font-bold text-[9px]">
                        Fee Category
                      </span>
                      <span className="font-semibold text-slate-700 block mt-1 capitalize">
                        {feeType?.toLowerCase()} Fee
                      </span>
                    </div>

                    <div className="border-t border-slate-200/60 my-4"></div>

                    <div className="flex justify-between items-baseline">
                      <span className="text-xs font-bold text-slate-800">Total Price:</span>
                      <span className="font-mono text-gold font-bold text-lg">
                        {formatKRW(selectedPrice)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              <div id="PGIOscreen" className="mt-4 w-full flex justify-center"></div>
            </>
          )}

            {/* Step 4: Complete screen */}
            {currentStep === 'COMPLETE' && paymentResult && (
              <div className="p-10 text-center space-y-6 max-w-lg mx-auto">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gold-tint">
                  <svg className="h-8 w-8 text-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-navy tracking-tight">Registration Complete!</h3>
                  <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                    Thank you for registering for the IABSE Incheon 2026 Pre-workshop. Your registration and payment details are confirmed.
                  </p>
                </div>

                <div className="rounded-xl border border-slate-100 bg-slate-50 p-5 space-y-2.5 text-xs text-left max-w-sm mx-auto leading-relaxed">
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-semibold">Reg. Number:</span>
                    <strong className="font-mono text-gold font-bold">{paymentResult.registrationNumber}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-semibold">Registered Program:</span>
                    <strong className="text-navy text-right font-medium">{selectedTitle}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-semibold">Amount Paid:</span>
                    <strong className="font-mono text-slate-700 font-bold">{formatKRW(paymentResult.totalAmount)}</strong>
                  </div>
                </div>

                <div className="pt-4">
                  <button
                    onClick={() => {
                      setNavTab('HISTORY');
                      setCurrentStep('PROGRAM_SELECT');
                      setSelectedProgram(null);
                      setFeeType(null);
                    }}
                    className="btn-primary w-full max-w-xs py-3"
                  >
                    View My Payment History
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: consolidated payment history */}
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

        {/* Tab 3: profile self-correction */}
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
