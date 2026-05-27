import { useEffect, useMemo, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { apiSignup, apiSendCode, apiVerifyCode, apiGetIasbseCompanies } from '../lib/api';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import type { DietaryRequirement } from '../types';

const POSITION_OPTIONS = [
  'Professor',
  'Dr.',
  'Mr.',
  'Ms.',
  'Mx.',
  'Student',
  'Other',
];

const DIETARY_OPTIONS: { value: DietaryRequirement; label: string }[] = [
  { value: 'NONE', label: 'None' },
  { value: 'VEGETARIAN', label: 'Vegetarian' },
  { value: 'HALAL', label: 'Halal' },
  { value: 'OTHER', label: 'Other' },
];

const COUNTRIES = [
  'Afghanistan', 'Albania', 'Algeria', 'Argentina', 'Australia', 'Austria',
  'Bangladesh', 'Belgium', 'Bolivia', 'Brazil', 'Bulgaria',
  'Cambodia', 'Canada', 'Chile', 'China', 'Colombia', 'Croatia', 'Czech Republic',
  'Denmark',
  'Ecuador', 'Egypt', 'Estonia',
  'Finland', 'France',
  'Germany', 'Ghana', 'Greece',
  'Hungary',
  'India', 'Indonesia', 'Iran', 'Iraq', 'Ireland', 'Israel', 'Italy',
  'Japan', 'Jordan',
  'Kazakhstan', 'Kenya', 'South Korea', 'Kuwait',
  'Latvia', 'Lithuania',
  'Malaysia', 'Mexico', 'Morocco',
  'Netherlands', 'New Zealand', 'Nigeria', 'Norway',
  'Pakistan', 'Peru', 'Philippines', 'Poland', 'Portugal',
  'Qatar',
  'Romania', 'Russia',
  'Saudi Arabia', 'Serbia', 'Singapore', 'Slovakia', 'Slovenia',
  'South Africa', 'Spain', 'Sri Lanka', 'Sweden', 'Switzerland',
  'Taiwan', 'Thailand', 'Turkey',
  'Ukraine', 'United Arab Emirates', 'United Kingdom', 'United States',
  'Venezuela', 'Vietnam',
  'Other',
];

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CODE_TTL_SECONDS = 600;      // 10분 — 서버 expiration-minutes 와 일치
const RESEND_COOLDOWN_SECONDS = 30; // 서버 RESEND_COOLDOWN_SECONDS 와 일치

type VerifyState = 'IDLE' | 'SENT' | 'VERIFIED';

const formatMMSS = (s: number): string => {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
};

const TIER_BADGE_CLASSES: Record<string, string> = {
  MEMBER: 'bg-gold-soft text-gold border border-gold-soft',
  'YOUNG ENGINEER': 'bg-amber-50 text-amber-700 border border-amber-200',
  'NON-MEMBER': 'bg-navy text-white border border-navy',
};

export const SignupPage = () => {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    email: '',
    password: '',
    passwordConfirm: '',
    lastName: '',
    firstName: '',
    affiliation: '',
    position: '',
    country: 'South Korea',
    phone: '',
    birthDate: null as Date | null,
    isPresenter: false,
    dietaryRequirement: 'NONE' as DietaryRequirement,
    dietaryNote: '',
  });
  const [error, setError] = useState('');
  const [privacyAgreed, setPrivacyAgreed] = useState<boolean | null>(null);

  const [isOtherCompany, setIsOtherCompany] = useState(false);
  const [customCompany, setCustomCompany] = useState('');

  const [isOtherPosition, setIsOtherPosition] = useState(false);
  const [customPosition, setCustomPosition] = useState('');

  const { data: companies = [] } = useQuery({
    queryKey: ['iasbseCompanies'],
    queryFn: apiGetIasbseCompanies,
  });

  // ── Email verification state ─────────────────────────────────────────────
  const [verifyState, setVerifyState] = useState<VerifyState>('IDLE');
  const [verifyCode, setVerifyCode] = useState('');
  const [verifyError, setVerifyError] = useState('');
  const [codeSentAt, setCodeSentAt] = useState<number | null>(null);
  const [now, setNow] = useState<number>(() => Date.now());

  const emailValid = EMAIL_REGEX.test(form.email);

  const timeLeft = useMemo(() => {
    if (codeSentAt == null) return 0;
    const elapsed = Math.floor((now - codeSentAt) / 1000);
    return Math.max(0, CODE_TTL_SECONDS - elapsed);
  }, [codeSentAt, now]);

  const resendCooldown = useMemo(() => {
    if (codeSentAt == null) return 0;
    const elapsed = Math.floor((now - codeSentAt) / 1000);
    return Math.max(0, RESEND_COOLDOWN_SECONDS - elapsed);
  }, [codeSentAt, now]);

  // 1초마다 tick — 활성 시에만
  useEffect(() => {
    if (verifyState !== 'SENT') return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [verifyState]);

  // ── Mutations ─────────────────────────────────────────────────────────────
  const sendCodeMutation = useMutation({
    mutationFn: apiSendCode,
    onSuccess: () => {
      setCodeSentAt(Date.now());
      setNow(Date.now());
      setVerifyState('SENT');
      setVerifyCode('');
      setVerifyError('');
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })
        ?.response?.data?.message;
      setVerifyError(msg ?? 'Failed to send verification code. Please try again.');
    },
  });

  const verifyCodeMutation = useMutation({
    mutationFn: apiVerifyCode,
    onSuccess: () => {
      setVerifyState('VERIFIED');
      setVerifyError('');
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })
        ?.response?.data?.message;
      setVerifyError(msg ?? 'Verification failed. Please check your code.');
    },
  });

  const signupMutation = useMutation({
    mutationFn: apiSignup,
    onSuccess: () => navigate('/login?verified=1'),
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })
        ?.response?.data?.message;
      setError(msg ?? 'Registration failed. Please try again.');
    },
  });

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((f) => ({ ...f, email: e.target.value }));
    // 이메일 변경 시 인증 상태 초기화
    if (verifyState !== 'IDLE') {
      setVerifyState('IDLE');
      setVerifyCode('');
      setVerifyError('');
      setCodeSentAt(null);
    }
  };

  const handleSendCode = () => {
    if (!emailValid) return;
    setVerifyError('');
    sendCodeMutation.mutate(form.email);
  };

  const handleVerifyCode = () => {
    setVerifyError('');
    verifyCodeMutation.mutate({ email: form.email, code: verifyCode });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (verifyState !== 'VERIFIED') {
      setError('Please verify your email before creating an account.');
      return;
    }
    if (form.password !== form.passwordConfirm) {
      setError('Passwords do not match.');
      return;
    }
    if (form.password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (!form.birthDate) {
      setError('Please enter your date of birth.');
      return;
    }
    if (form.dietaryRequirement === 'OTHER' && !form.dietaryNote.trim()) {
      setError('Please specify your dietary requirement.');
      return;
    }
    if (privacyAgreed !== true) {
      setError('You must agree to the Data Processing Consent to proceed.');
      return;
    }

    const { passwordConfirm: _, birthDate, ...rest } = form;
    void _;
    const formattedDate = birthDate ? birthDate.toISOString().split('T')[0] : '';
    const finalAffiliation = isOtherCompany ? customCompany : form.affiliation;
    const finalPosition = isOtherPosition ? customPosition : form.position;

    if (isOtherCompany && !customCompany.trim()) {
      setError('Please specify your affiliation.');
      return;
    }
    if (!finalPosition.trim()) {
      setError(isOtherPosition ? 'Please specify your position.' : 'Please select your title.');
      return;
    }

    signupMutation.mutate({
      ...rest,
      birthDate: formattedDate,
      affiliation: finalAffiliation,
      position: finalPosition,
    });
  };

  const set = (field: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((f) => ({ ...f, [field]: e.target.value }));

  // ── Derived UI state ──────────────────────────────────────────────────────
  const canSendCode = emailValid && !sendCodeMutation.isPending && verifyState !== 'VERIFIED';
  const canResend = verifyState === 'SENT' && resendCooldown === 0 && !sendCodeMutation.isPending;
  const codeExpired = verifyState === 'SENT' && timeLeft === 0;
  const canConfirm =
    verifyState === 'SENT' && verifyCode.length === 6 && !codeExpired && !verifyCodeMutation.isPending;
  const canSubmit = verifyState === 'VERIFIED' && !signupMutation.isPending;

  const timerColor = timeLeft === 0 ? 'text-red-500' : timeLeft <= 60 ? 'text-amber-600' : 'text-ink-muted';

  return (
    <div className="min-h-screen bg-cream py-12 px-4">
      <div className="mx-auto max-w-lg">
        <div className="text-center mb-8">
          <p className="label-section text-gold mb-1">IABSE Congress Incheon 2026</p>
          <h1 className="text-2xl font-semibold text-ink">Create Account</h1>
          <p className="mt-2 text-sm text-ink-muted">Register to participate in the Annual Conference</p>
        </div>

        <div className="card">
          <div className="bg-navy px-6 py-3.5">
            <span className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.1em] text-white">
              <span className="text-gold">·</span> Personal Information
            </span>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-5">

            {/* Email + Verify button */}
            <div>
              <label className="block label-section mb-1.5">
                Email Address <span className="text-red-400">*</span>
                <span className="ml-1 normal-case tracking-normal text-ink-faint">(used as login ID)</span>
              </label>
              <div className="flex gap-2">
                <input
                  type="email"
                  value={form.email}
                  onChange={handleEmailChange}
                  className="input-base flex-1"
                  placeholder="your@email.com"
                  required
                  readOnly={verifyState === 'VERIFIED'}
                />
                {verifyState === 'VERIFIED' ? (
                  <span className="inline-flex items-center gap-1.5 rounded-lg bg-gold-soft border border-gold-soft px-3 text-[10px] font-semibold uppercase tracking-[0.1em] text-gold whitespace-nowrap">
                    <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    Verified
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={handleSendCode}
                    disabled={!canSendCode}
                    className="rounded-lg bg-navy px-4 text-[10px] font-semibold uppercase tracking-[0.1em] text-white hover:bg-navy-hover disabled:bg-slate-300 disabled:cursor-not-allowed whitespace-nowrap"
                  >
                    {sendCodeMutation.isPending ? 'Sending…' : verifyState === 'SENT' ? 'Sent' : 'Verify'}
                  </button>
                )}
              </div>

              {verifyError && verifyState !== 'SENT' && (
                <p className="mt-1.5 text-[11px] text-red-600">{verifyError}</p>
              )}

              {/* Verification code input (shown after [Verify] clicked) */}
              {verifyState === 'SENT' && (
                <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[11px] text-ink-muted">
                      A 6-digit code was sent to <span className="font-medium text-ink">{form.email}</span>.
                    </p>
                    <span className={`text-xs font-mono font-semibold ${timerColor}`}>
                      {codeExpired ? 'Expired' : formatMMSS(timeLeft)}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      inputMode="numeric"
                      value={verifyCode}
                      onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      disabled={codeExpired}
                      className="input-base flex-1 text-center tracking-widest font-semibold"
                      placeholder="000000"
                      maxLength={6}
                    />
                    <button
                      type="button"
                      onClick={handleVerifyCode}
                      disabled={!canConfirm}
                      className="rounded-lg bg-gold px-4 text-[10px] font-semibold uppercase tracking-[0.1em] text-white hover:bg-gold-hover disabled:bg-slate-300 disabled:cursor-not-allowed whitespace-nowrap"
                    >
                      {verifyCodeMutation.isPending ? 'Checking…' : 'Confirm'}
                    </button>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    {verifyError ? (
                      <p className="text-[11px] text-red-600">{verifyError}</p>
                    ) : codeExpired ? (
                      <p className="text-[11px] text-red-600">Code expired. Please resend.</p>
                    ) : (
                      <p className="text-[11px] text-ink-faint">Didn't receive it? Check your spam folder.</p>
                    )}
                    <button
                      type="button"
                      onClick={handleSendCode}
                      disabled={!canResend}
                      className="text-[11px] font-semibold uppercase tracking-[0.1em] text-gold hover:text-gold-hover disabled:text-slate-400 disabled:cursor-not-allowed"
                    >
                      {resendCooldown > 0 ? `Resend (${resendCooldown}s)` : 'Resend Code'}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Password */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block label-section mb-1.5">
                  Password <span className="text-red-400">*</span>
                </label>
                <input
                  type="password"
                  value={form.password}
                  onChange={set('password')}
                  className="input-base"
                  placeholder="Min. 8 characters"
                  minLength={8}
                  required
                />
              </div>
              <div>
                <label className="block label-section mb-1.5">
                  Confirm Password <span className="text-red-400">*</span>
                </label>
                <input
                  type="password"
                  value={form.passwordConfirm}
                  onChange={set('passwordConfirm')}
                  className={`input-base ${form.passwordConfirm && form.password !== form.passwordConfirm
                    ? 'border-red-300 focus:border-red-400 focus:ring-red-100'
                    : ''
                    }`}
                  placeholder="Re-enter password"
                  required
                />
              </div>
            </div>
            <p className="text-[11px] text-ink-faint -mt-2">
              Must include uppercase, lowercase, number, and special character.
            </p>

            <div className="border-t border-slate-100 pt-4">
              <p className="label-section mb-4">
                Personal Details
              </p>

              {/* Name */}
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="block label-section mb-1.5">
                    Last Name <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.lastName}
                    onChange={set('lastName')}
                    className="input-base"
                    placeholder="Hong"
                    required
                  />
                </div>
                <div>
                  <label className="block label-section mb-1.5">
                    First Name <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.firstName}
                    onChange={set('firstName')}
                    className="input-base"
                    placeholder="Gildong"
                    required
                  />
                </div>
              </div>

              {/* Affiliation */}
              <div className="mb-3">
                <label className="block label-section mb-1.5">
                  Affiliation <span className="text-red-400">*</span>
                </label>
                <select
                  value={isOtherCompany ? 'OTHER' : form.affiliation}
                  onChange={(e) => {
                    if (e.target.value === 'OTHER') {
                      setIsOtherCompany(true);
                      setForm((f) => ({ ...f, affiliation: '' }));
                    } else {
                      setIsOtherCompany(false);
                      setForm((f) => ({ ...f, affiliation: e.target.value }));
                    }
                  }}
                  className="input-base"
                  required
                >
                  <option value="" disabled>Select your affiliation</option>
                  {companies.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                  <option value="OTHER">Other (Please specify)</option>
                </select>
                {isOtherCompany && (
                  <input
                    type="text"
                    value={customCompany}
                    onChange={(e) => setCustomCompany(e.target.value)}
                    className="input-base mt-2"
                    placeholder="Please specify your affiliation"
                    required
                  />
                )}
              </div>

              {/* IABSE Verification Alert Notice */}
              <div className="rounded-lg bg-slate-50 border border-slate-200 p-4 mb-3 text-[11px] text-slate-600 leading-relaxed shadow-sm space-y-2">
                <p>
                  Please note that to successfully verify your IABSE membership and access the member registration rate, the <strong className="text-navy font-semibold">Full Name</strong> and <strong className="text-navy font-semibold">Affiliation</strong> you enter must exactly match the information registered in your official IABSE membership profile.
                </p>
                <p>
                  If your membership verification fails or you encounter any issues during this process, please do not proceed with the payment. Instead, kindly contact the Secretariat directly at <a href="mailto:iabse2026@kibse.or.kr" className="text-gold hover:underline font-semibold">iabse2026@kibse.or.kr</a> for assistance, and we will promptly help verify your status.
                </p>
              </div>

              {/* Position / Title */}
              <div className="mb-3">
                <label className="block label-section mb-1.5">
                  Position / Title <span className="text-red-400">*</span>
                </label>
                <select
                  value={isOtherPosition ? 'OTHER' : form.position}
                  onChange={(e) => {
                    if (e.target.value === 'OTHER') {
                      setIsOtherPosition(true);
                      setForm((f) => ({ ...f, position: '' }));
                    } else {
                      setIsOtherPosition(false);
                      setForm((f) => ({ ...f, position: e.target.value }));
                    }
                  }}
                  className="input-base"
                  required
                >
                  <option value="" disabled>Select your title</option>
                  {POSITION_OPTIONS.map((p) => (
                    <option key={p} value={p === 'Other' ? 'OTHER' : p}>
                      {p === 'Other' ? 'Other (Please specify)' : p}
                    </option>
                  ))}
                </select>
                {isOtherPosition && (
                  <input
                    type="text"
                    value={customPosition}
                    onChange={(e) => setCustomPosition(e.target.value)}
                    className="input-base mt-2"
                    placeholder="Please specify your position"
                    maxLength={100}
                    required
                  />
                )}
              </div>

              {/* Date of Birth / Country */}
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div className="flex flex-col">
                  <label className="block label-section mb-1.5">
                    Date of Birth <span className="text-red-400">*</span>
                    <span className="ml-1 normal-case tracking-normal text-ink-faint">(for YE eligibility)</span>
                  </label>
                  <DatePicker
                    selected={form.birthDate}
                    onChange={(date: Date | null) => setForm((f) => ({ ...f, birthDate: date }))}
                    dateFormat="yyyy-MM-dd"
                    showYearDropdown
                    showMonthDropdown
                    dropdownMode="select"
                    maxDate={new Date()}
                    placeholderText="Select Date"
                    className="input-base w-full"
                    required
                  />
                </div>
                <div>
                  <label className="block label-section mb-1.5">
                    Country <span className="text-red-400">*</span>
                  </label>
                  <select value={form.country} onChange={set('country')} className="input-base">
                    {COUNTRIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Phone */}
              <div className="mb-3">
                <label className="block label-section mb-1.5">Phone Number</label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={set('phone')}
                  className="input-base"
                  placeholder="+82-10-0000-0000"
                />
              </div>

              {/* Dietary Requirements */}
              <div className="mb-3 rounded-lg border border-slate-200 bg-slate-50 p-3.5">
                <p className="text-xs font-medium text-ink">Dietary Requirements</p>
                <p className="text-[11px] text-ink-faint mt-0.5 mb-2.5">
                  Please indicate if you have any special dietary requirements.
                </p>
                <div className="space-y-2">
                  {DIETARY_OPTIONS.map((opt) => (
                    <label key={opt.value} className="flex items-center gap-2.5 cursor-pointer">
                      <input
                        type="radio"
                        name="dietaryRequirement"
                        checked={form.dietaryRequirement === opt.value}
                        onChange={() =>
                          setForm((f) => ({ ...f, dietaryRequirement: opt.value }))
                        }
                        className="h-4 w-4 border-slate-300 text-gold focus:ring-gold"
                      />
                      <span className="text-xs text-ink">{opt.label}</span>
                    </label>
                  ))}
                </div>
                {form.dietaryRequirement === 'OTHER' && (
                  <input
                    type="text"
                    value={form.dietaryNote}
                    onChange={set('dietaryNote')}
                    className="input-base mt-2.5"
                    placeholder="Please specify"
                    maxLength={200}
                  />
                )}
              </div>

              {/* Paper Presenter */}
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3.5">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.isPresenter}
                    onChange={(e) => setForm((f) => ({ ...f, isPresenter: e.target.checked }))}
                    className="mt-0.5 h-4 w-4 rounded border-slate-300 text-gold focus:ring-gold"
                  />
                  <div>
                    <p className="text-xs font-medium text-ink">
                      I am presenting a paper at IABSE Congress Incheon 2026
                    </p>
                    <p className="text-[11px] text-ink-faint mt-0.5">
                      Check this box if you are an author or co-author presenting a paper at the conference.
                    </p>
                  </div>
                </label>
              </div>
            </div>

            {/* Registration Type Info */}
            <div className="rounded-lg bg-slate-50 border border-slate-200 p-4">
              <p className="label-section mb-2">Registration Rate Guide</p>
              <div className="space-y-1.5">
                {[
                  { badge: 'MEMBER', desc: 'IABSE registered member' },
                  { badge: 'YOUNG ENGINEER', desc: 'Non-member · Under 36 years old' },
                  { badge: 'NON-MEMBER', desc: 'Non-member · 36 years or older' },
                ].map(({ badge, desc }) => (
                  <div key={badge} className="flex items-center gap-2">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em] ${TIER_BADGE_CLASSES[badge]}`}>
                      {badge}
                    </span>
                    <span className="text-xs text-ink-muted">{desc}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Privacy & Data Collection Consent ── */}
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <div className="bg-navy px-4 py-2.5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-white">Data Processing Consent</p>
              </div>
              <div className="p-4">
                <p className="text-xs text-ink-muted leading-relaxed mb-4">
                  By registering for the IABSE Congress Incheon 2026, you (the delegate) agree that your personal data will be processed for registration and handling purposes, as well as to provide you with information related to the congress. All personal data will be processed in accordance with applicable data protection legislation and will not be disclosed to a third party without the delegate's written consent. Please tick the box below to provide your consent. Please note that if you do not agree to the terms, you will not be able to complete your registration.
                </p>
                <div className="flex flex-col gap-2">
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="radio"
                      name="privacyConsent"
                      checked={privacyAgreed === true}
                      onChange={() => setPrivacyAgreed(true)}
                      className="h-4 w-4 border-slate-300 text-gold focus:ring-gold"
                    />
                    <span className="text-xs font-medium text-ink">
                      I give consent
                    </span>
                  </label>
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="radio"
                      name="privacyConsent"
                      checked={privacyAgreed === false}
                      onChange={() => setPrivacyAgreed(false)}
                      className="h-4 w-4 border-slate-300 text-gold focus:ring-gold"
                    />
                    <span className="text-xs font-medium text-ink">
                      I do not consent
                    </span>
                  </label>
                </div>
              </div>
            </div>

            {error && (
              <div className="rounded-lg bg-red-50 border border-red-100 px-3 py-2.5">
                <p className="text-xs text-red-600">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={!canSubmit}
              className="btn-primary"
              title={verifyState !== 'VERIFIED' ? 'Verify your email first' : undefined}
            >
              {signupMutation.isPending ? 'Processing…' : 'Create Account'}
            </button>
          </form>
        </div>

        <div className="mt-4 text-center">
          <p className="text-xs text-ink-muted">
            Already have an account?{' '}
            <Link to="/login" className="font-semibold uppercase tracking-[0.1em] text-gold hover:text-gold-hover">
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};
