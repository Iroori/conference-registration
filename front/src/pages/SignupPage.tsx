import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { apiSignup } from '../lib/api';
import type { DietaryRequirement, SignupRequest } from '../types';

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

export const SignupPage = () => {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    email: '',
    emailConfirm: '',
    password: '',
    passwordConfirm: '',
    lastName: '',
    firstName: '',
    affiliation: '',
    position: '',
    phone: '',
    isPresenter: false,
    dietaryRequirement: 'NONE' as DietaryRequirement,
    dietaryNote: '',
    paperInfo: '',
    iabseId: '',
    billingUniversity: '',
    billingVat: '',
    billingPoNumber: '',
    billingStreet: '',
    billingAdditionalInfo: '',
    billingPoBox: '',
    billingPostcode: '',
    billingCity: '',
    billingCountry: 'South Korea',
  });
  const [error, setError] = useState('');
  const [privacyAgreed, setPrivacyAgreed] = useState<boolean | null>(null);

  const [isOtherPosition, setIsOtherPosition] = useState(false);
  const [customPosition, setCustomPosition] = useState('');

  const signupMutation = useMutation<void, unknown, SignupRequest>({
    mutationFn: apiSignup,
    onSuccess: () => navigate('/login?verified=1'),
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })
        ?.response?.data?.message;
      setError(msg ?? 'Registration failed. Please try again.');
    },
  });

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((f) => ({ ...f, email: e.target.value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (form.email !== form.emailConfirm) {
      setError('Email addresses do not match.');
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
    if (form.dietaryRequirement === 'OTHER' && !form.dietaryNote.trim()) {
      setError('Please specify your dietary requirement.');
      return;
    }
    if (privacyAgreed !== true) {
      setError('You must agree to the Data Processing Consent to proceed.');
      return;
    }

    const finalPosition = isOtherPosition ? customPosition : form.position;

    if (!form.affiliation.trim()) {
      setError('Please enter your affiliation.');
      return;
    }
    if (!finalPosition.trim()) {
      setError(isOtherPosition ? 'Please specify your position.' : 'Please select your title.');
      return;
    }

    // Billing address values validation
    if (!form.billingUniversity.trim()) {
      setError('Please specify University / Organization for billing.');
      return;
    }
    if (!form.billingStreet.trim()) {
      setError('Please specify Street name and number for billing.');
      return;
    }
    if (!form.billingPostcode.trim()) {
      setError('Please specify Postcode for billing.');
      return;
    }
    if (!form.billingCity.trim()) {
      setError('Please specify City for billing.');
      return;
    }

    const { passwordConfirm: _, emailConfirm: __, ...rest } = form;
    void _; void __;

    signupMutation.mutate({
      ...rest,
      birthDate: '', // Nullable in backend
      position: finalPosition,
      country: form.billingCountry, // Mapping country from billingCountry
    });
  };

  const set = (field: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((f) => ({ ...f, [field]: e.target.value }));

  // ── Derived UI state ──────────────────────────────────────────────────────
  const emailValid = EMAIL_REGEX.test(form.email);
  const canSubmit = emailValid && form.emailConfirm === form.email && !signupMutation.isPending;

  return (
    <div className="min-h-screen bg-cream py-12 px-4">
      <div className="mx-auto max-w-2xl">
        <div className="text-center mb-8">
          <p className="label-section text-gold mb-1">IABSE Congress Incheon 2026</p>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Create Account</h1>
        </div>

        <div className="card">
          <div className="bg-navy px-6 py-3.5">
            <span className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.1em] text-white">
              <span className="text-gold">·</span> Personal Information
            </span>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-5">

            {/* Email Address & Confirm Email Address */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block label-section mb-1.5">
                  E-mail Address <span className="text-red-500 font-bold">*</span>
                  <span className="ml-1 normal-case tracking-normal text-slate-500">(Used as login ID)</span>
                </label>
                <input
                  type="email"
                  value={form.email}
                  onChange={handleEmailChange}
                  className="input-base"
                  placeholder="your@email.com"
                  required
                />
              </div>
              <div>
                <label className="block label-section mb-1.5">
                  Confirm Email Address <span className="text-red-500 font-bold">*</span>
                </label>
                <input
                  type="email"
                  value={form.emailConfirm}
                  onChange={set('emailConfirm')}
                  className={`input-base ${form.emailConfirm && form.email !== form.emailConfirm
                    ? 'border-red-300 focus:border-red-400 focus:ring-red-100 bg-red-50'
                    : ''
                    }`}
                  placeholder="Confirm email address"
                  required
                />
              </div>
            </div>

            {/* Password & Confirm Password */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block label-section mb-1.5">
                  Password <span className="text-red-500 font-bold">*</span>
                </label>
                <input
                  type="password"
                  value={form.password}
                  onChange={set('password')}
                  className="input-base"
                  placeholder="Enter password"
                  minLength={8}
                  required
                />
              </div>
              <div>
                <label className="block label-section mb-1.5">
                  Confirm Password <span className="text-red-500 font-bold">*</span>
                </label>
                <input
                  type="password"
                  value={form.passwordConfirm}
                  onChange={set('passwordConfirm')}
                  className={`input-base ${form.passwordConfirm && form.password !== form.passwordConfirm
                    ? 'border-red-300 focus:border-red-400 focus:ring-red-100 bg-red-50'
                    : ''
                    }`}
                  placeholder="Confirm password"
                  required
                />
              </div>
            </div>

            <div className="border-t border-slate-200 pt-5">
              <p className="text-lg font-bold text-slate-900 mb-4">
                Personal Details
              </p>

              {/* Name */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block label-section mb-1.5">
                    Last Name <span className="text-red-500 font-bold">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.lastName}
                    onChange={set('lastName')}
                    className="input-base"
                    placeholder="Last name"
                    required
                  />
                </div>
                <div>
                  <label className="block label-section mb-1.5">
                    First Name <span className="text-red-500 font-bold">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.firstName}
                    onChange={set('firstName')}
                    className="input-base"
                    placeholder="First name"
                    required
                  />
                </div>
              </div>

              {/* Affiliation */}
              <div className="mb-4">
                <label className="block label-section mb-1.5">
                  Affiliation <span className="text-red-500 font-bold">*</span>
                </label>
                <input
                  type="text"
                  value={form.affiliation}
                  onChange={set('affiliation')}
                  className="input-base"
                  placeholder="University or Organization"
                  required
                />
              </div>

              {/* Position / Title */}
              <div className="mb-4">
                <label className="block label-section mb-1.5">
                  Position / Title <span className="text-red-500 font-bold">*</span>
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
                  className="input-base text-slate-800"
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

              {/* Phone */}
              <div className="mb-4">
                <label className="block label-section mb-1.5">Phone Number <span className="text-red-500 font-bold">*</span></label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={set('phone')}
                  className="input-base"
                  placeholder="+82-10-0000-0000"
                  required
                />
              </div>

              {/* Dietary Requirements */}
              <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-semibold text-slate-800">Dietary Requirements <span className="text-red-500 font-bold">*</span></p>
                <p className="text-[12px] text-slate-550 mt-0.5 mb-3">
                  Please indicate if you have any special dietary requirements.
                </p>
                <div className="space-y-2.5">
                  {DIETARY_OPTIONS.map((opt) => (
                    <label key={opt.value} className="flex items-center gap-2.5 cursor-pointer">
                      <input
                        type="radio"
                        name="dietaryRequirement"
                        checked={form.dietaryRequirement === opt.value}
                        onChange={() =>
                          setForm((f) => ({ ...f, dietaryRequirement: opt.value }))
                        }
                        className="h-4 w-4 border-slate-350 text-gold focus:ring-gold"
                      />
                      <span className="text-sm font-medium text-slate-800">{opt.label}</span>
                    </label>
                  ))}
                </div>
                {form.dietaryRequirement === 'OTHER' && (
                  <input
                    type="text"
                    value={form.dietaryNote}
                    onChange={set('dietaryNote')}
                    className="input-base mt-2.5"
                    placeholder="Please specify dietary requirements"
                    maxLength={200}
                  />
                )}
              </div>
            </div>

            {/* ── [Billing address] Section ── */}
            <div className="border-t border-slate-200 pt-5">
              <p className="text-lg font-bold text-slate-900 mb-2">
                [Billing address]
              </p>
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-4 mb-4">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-700">Section 2 - Billing Address</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block label-section mb-1.5">University / Organization <span className="text-red-500 font-bold">*</span></label>
                    <input
                      type="text"
                      value={form.billingUniversity}
                      onChange={set('billingUniversity')}
                      className="input-base"
                      placeholder="University / Organization"
                      required
                    />
                  </div>
                  <div>
                    <label className="block label-section mb-1.5">VAT/CIF/NIF/ other ref.</label>
                    <input
                      type="text"
                      value={form.billingVat}
                      onChange={set('billingVat')}
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
                      value={form.billingPoNumber}
                      onChange={set('billingPoNumber')}
                      className="input-base"
                      placeholder="PO number"
                    />
                  </div>
                  <div>
                    <label className="block label-section mb-1.5">Street name and number <span className="text-red-500 font-bold">*</span></label>
                    <input
                      type="text"
                      value={form.billingStreet}
                      onChange={set('billingStreet')}
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
                      value={form.billingAdditionalInfo}
                      onChange={set('billingAdditionalInfo')}
                      className="input-base"
                      placeholder="Apt, Suite, Unit, etc."
                    />
                  </div>
                  <div>
                    <label className="block label-section mb-1.5">PO Box number</label>
                    <input
                      type="text"
                      value={form.billingPoBox}
                      onChange={set('billingPoBox')}
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
                      value={form.billingPostcode}
                      onChange={set('billingPostcode')}
                      className="input-base"
                      placeholder="Zip/Postcode"
                      required
                    />
                  </div>
                  <div>
                    <label className="block label-section mb-1.5">City <span className="text-red-500 font-bold">*</span></label>
                    <input
                      type="text"
                      value={form.billingCity}
                      onChange={set('billingCity')}
                      className="input-base"
                      placeholder="City"
                      required
                    />
                  </div>
                  <div>
                    <label className="block label-section mb-1.5">Country <span className="text-red-500 font-bold">*</span></label>
                    <select
                      value={form.billingCountry}
                      onChange={set('billingCountry')}
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

            {/* ── [Paper information] Section ── */}
            <div className="border-t border-slate-200 pt-5">
              {/* Paper Presenter */}
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 mb-4">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.isPresenter}
                    onChange={(e) => setForm((f) => ({ ...f, isPresenter: e.target.checked }))}
                    className="mt-0.5 h-4 w-4 rounded border-slate-355 text-gold focus:ring-gold"
                  />
                  <div>
                    <p className="text-sm font-semibold text-slate-850">
                      I am presenting a paper at IABSE Congress Incheon 2026
                    </p>
                    <p className="text-[12px] text-slate-550 mt-0.5">
                      Check this box if you are an author or co-author presenting a paper at the conference.
                    </p>
                  </div>
                </label>
              </div>

              {/* Paper Information */}
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 mb-4 space-y-3">
                <div>
                  <p className="text-sm font-bold text-slate-850 uppercase tracking-wider mb-1">
                    [Paper information] <span className="text-[11px] text-slate-500 font-normal capitalize">(Optional)</span>
                  </p>
                  <p className="text-[12px] text-slate-550 leading-relaxed">
                    Full papers accepted by the Scientific Committee will be published in the IABSE Congress 2026 Proceedings, which will be made available in electronic format prior to the start of the Congress. To be included in the final congress program, each accepted full paper should be associated with a paid registration. If there is any paper associated with this registration, please enter its number or title.
                  </p>
                </div>
                <div>
                  <label className="block label-section text-[11px] uppercase mb-1.5 text-slate-800">
                    Please enter your paper number or title here.
                  </label>
                  <input
                    type="text"
                    value={form.paperInfo}
                    onChange={set('paperInfo')}
                    className="input-base"
                    placeholder="e.g. Paper #1234 or 'A Novel Bridge Design...'"
                    maxLength={300}
                  />
                </div>
              </div>
            </div>

            {/* ── Privacy & Data Collection Consent ── */}
            <div className="border border-slate-200 rounded-xl overflow-hidden mt-4 shadow-sm">
              <div className="bg-navy px-4 py-2.5">
                <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-white">Data Processing Consent</p>
              </div>
              <div className="p-4 bg-slate-50/50">
                <p className="text-xs text-slate-600 leading-relaxed mb-4">
                  By registering for the IABSE Congress Incheon 2026, you (the delegate) agree that your personal data will be processed for registration and handling purposes, as well as to provide you with information related to the congress. All personal data will be processed in accordance with applicable data protection legislation and will not be disclosed to a third party without the delegate's written consent. Please tick the box below to provide your consent. Please note that if you do not agree to the terms, you will not be able to complete your registration.
                </p>
                <div className="flex flex-col gap-2">
                  <label className="flex items-center gap-2.5 cursor-pointer select-none">
                    <input
                      type="radio"
                      name="privacyConsent"
                      checked={privacyAgreed === true}
                      onChange={() => setPrivacyAgreed(true)}
                      className="h-4 w-4 border-slate-350 text-gold focus:ring-gold"
                    />
                    <span className="text-xs font-semibold text-slate-800">
                      I give consent
                    </span>
                  </label>
                  <label className="flex items-center gap-2.5 cursor-pointer select-none">
                    <input
                      type="radio"
                      name="privacyConsent"
                      checked={privacyAgreed === false}
                      onChange={() => setPrivacyAgreed(false)}
                      className="h-4 w-4 border-slate-350 text-gold focus:ring-gold"
                    />
                    <span className="text-xs font-semibold text-slate-800">
                      I do not consent
                    </span>
                  </label>
                </div>
              </div>
            </div>

            {error && (
              <div className="rounded-lg bg-red-50 border border-red-100 px-3 py-2.5">
                <p className="text-xs text-red-650 font-medium">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={!canSubmit}
              className="btn-primary"
            >
              {signupMutation.isPending ? 'Processing…' : 'Create Account'}
            </button>
          </form>
        </div>

        <div className="mt-4 text-center">
          <p className="text-xs text-slate-500">
            Already have an account?{' '}
            <Link to="/login" className="font-bold uppercase tracking-[0.1em] text-gold hover:text-gold-hover transition">
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};
