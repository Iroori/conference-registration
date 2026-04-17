import { useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { apiSignup, apiCheckIasbse, apiVerifyEmail, apiResendCode } from '../lib/api';
import type { IasbseCheckResponse } from '../types';

type Step = 'FORM' | 'VERIFY_EMAIL';

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

export const SignupPage = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('FORM');

  const [form, setForm] = useState({
    email: '',
    password: '',
    passwordConfirm: '',
    nameKr: '',
    nameEn: '',
    affiliation: '',
    position: '',
    country: 'South Korea',
    phone: '',
    birthDate: '',
    isPresenter: false,
  });
  const [error, setError] = useState('');
  const [privacyAgreed, setPrivacyAgreed] = useState(false);

  const emailCheckTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [iasbseResult, setIasbseResult] = useState<IasbseCheckResponse | null>(null);
  const [checkingIasbse, setCheckingIasbse] = useState(false);

  const [verifyCode, setVerifyCode] = useState('');
  const [verifyError, setVerifyError] = useState('');

  const signupMutation = useMutation({
    mutationFn: apiSignup,
    onSuccess: () => setStep('VERIFY_EMAIL'),
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })
        ?.response?.data?.message;
      setError(msg ?? 'Registration failed. Please try again.');
    },
  });

  const verifyMutation = useMutation({
    mutationFn: apiVerifyEmail,
    onSuccess: () => navigate('/login?verified=1'),
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })
        ?.response?.data?.message;
      setVerifyError(msg ?? 'Verification failed. Please check your code.');
    },
  });

  const resendMutation = useMutation({
    mutationFn: apiResendCode,
  });

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setForm((f) => ({ ...f, email: val }));
    setIasbseResult(null);

    if (emailCheckTimer.current) clearTimeout(emailCheckTimer.current);
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) {
      emailCheckTimer.current = setTimeout(async () => {
        setCheckingIasbse(true);
        try {
          const result = await apiCheckIasbse(val);
          setIasbseResult(result);
        } catch {
          setIasbseResult(null);
        } finally {
          setCheckingIasbse(false);
        }
      }, 600);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

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
    if (!privacyAgreed) {
      setError('You must agree to the Personal Data Collection & Use policy to proceed.');
      return;
    }

    const { passwordConfirm: _, ...rest } = form;
    signupMutation.mutate(rest);
  };

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    setVerifyError('');
    verifyMutation.mutate({ email: form.email, code: verifyCode });
  };

  const set = (field: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((f) => ({ ...f, [field]: e.target.value }));

  // ─── Email Verification Step ────────────────────────────────────────────────
  if (step === 'VERIFY_EMAIL') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center py-12 px-4">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <p className="text-xs font-semibold uppercase tracking-widest text-teal-500 mb-1">IABSE 2026</p>
            <h1 className="text-2xl font-semibold text-slate-800">Email Verification</h1>
          </div>
          <div className="card p-6">
            <p className="text-sm text-slate-600 mb-5">
              A 6-digit verification code has been sent to{' '}
              <span className="font-medium text-slate-800">{form.email}</span>.
              Please check your inbox and enter the code below.
            </p>
            <form onSubmit={handleVerify} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">Verification Code</label>
                <input
                  type="text"
                  value={verifyCode}
                  onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="input-base text-center text-lg tracking-widest font-semibold"
                  placeholder="000000"
                  maxLength={6}
                />
              </div>
              {verifyError && (
                <div className="rounded-lg bg-red-50 border border-red-100 px-3 py-2.5">
                  <p className="text-xs text-red-600">{verifyError}</p>
                </div>
              )}
              <button
                type="submit"
                disabled={verifyCode.length !== 6 || verifyMutation.isPending}
                className="btn-primary"
              >
                {verifyMutation.isPending ? 'Verifying…' : 'Verify Email'}
              </button>
            </form>
            <button
              onClick={() => resendMutation.mutate(form.email)}
              disabled={resendMutation.isPending}
              className="btn-secondary mt-3"
            >
              {resendMutation.isPending ? 'Sending…' : 'Resend Code'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── Registration Form ──────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4">
      <div className="mx-auto max-w-lg">
        <div className="text-center mb-8">
          <p className="text-xs font-semibold uppercase tracking-widest text-teal-500 mb-1">IABSE 2026</p>
          <h1 className="text-2xl font-semibold text-slate-800">Create Account</h1>
          <p className="mt-2 text-sm text-slate-500">Register to participate in the Annual Conference</p>
        </div>

        <div className="card">
          <div className="bg-slate-800 px-6 py-3.5">
            <span className="flex items-center gap-2 text-sm font-medium text-white">
              <span className="text-teal-400">·</span> Personal Information
            </span>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-5">

            {/* Email */}
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">
                Email Address <span className="text-red-400">*</span>
                <span className="ml-1 font-normal text-slate-400">(used as login ID)</span>
              </label>
              <input
                type="email"
                value={form.email}
                onChange={handleEmailChange}
                className="input-base"
                placeholder="your@email.com"
                required
              />
              {checkingIasbse && (
                <p className="mt-1.5 text-xs text-slate-400">Checking IABSE membership…</p>
              )}
              {iasbseResult && !checkingIasbse && (
                <div className={`mt-1.5 flex items-center gap-1.5 text-xs ${
                  iasbseResult.isIasbseMember ? 'text-teal-600' : 'text-amber-600'
                }`}>
                  <span>{iasbseResult.isIasbseMember ? '✓' : '!'}</span>
                  <span>{iasbseResult.message}</span>
                  {iasbseResult.isIasbseMember ? (
                    <span className="ml-1 rounded-full bg-teal-100 px-2 py-0.5 text-teal-700 font-medium">
                      MEMBER rate applies
                    </span>
                  ) : (
                    <span className="ml-1 rounded-full bg-amber-100 px-2 py-0.5 text-amber-700 font-medium">
                      NON-MEMBER rate applies
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Password */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">
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
                <label className="block text-xs font-medium text-slate-600 mb-1.5">
                  Confirm Password <span className="text-red-400">*</span>
                </label>
                <input
                  type="password"
                  value={form.passwordConfirm}
                  onChange={set('passwordConfirm')}
                  className={`input-base ${
                    form.passwordConfirm && form.password !== form.passwordConfirm
                      ? 'border-red-300 focus:border-red-400 focus:ring-red-100'
                      : ''
                  }`}
                  placeholder="Re-enter password"
                  required
                />
              </div>
            </div>
            <p className="text-[11px] text-slate-400 -mt-2">
              Must include uppercase, lowercase, number, and special character.
            </p>

            <div className="border-t border-slate-100 pt-4">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">
                Personal Details
              </p>

              {/* Name */}
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">
                    Name (Korean) <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.nameKr}
                    onChange={set('nameKr')}
                    className="input-base"
                    placeholder="홍길동"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">
                    Name (English) <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.nameEn}
                    onChange={set('nameEn')}
                    className="input-base"
                    placeholder="HONG Gildong"
                    required
                  />
                </div>
              </div>

              {/* Affiliation / Position */}
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">
                    Affiliation <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.affiliation}
                    onChange={set('affiliation')}
                    className="input-base"
                    placeholder="Organization / University"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">
                    Position / Title <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.position}
                    onChange={set('position')}
                    className="input-base"
                    placeholder="Professor / Researcher"
                    required
                  />
                </div>
              </div>

              {/* Date of Birth / Country */}
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">
                    Date of Birth <span className="text-red-400">*</span>
                    <span className="ml-1 font-normal text-slate-400">(for YE eligibility)</span>
                  </label>
                  <input
                    type="date"
                    value={form.birthDate}
                    onChange={set('birthDate')}
                    className="input-base"
                    max={new Date().toISOString().split('T')[0]}
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">
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
                <label className="block text-xs font-medium text-slate-600 mb-1.5">Phone Number</label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={set('phone')}
                  className="input-base"
                  placeholder="+82-10-0000-0000"
                />
              </div>

              {/* Paper Presenter */}
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3.5">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.isPresenter}
                    onChange={(e) => setForm((f) => ({ ...f, isPresenter: e.target.checked }))}
                    className="mt-0.5 h-4 w-4 rounded border-slate-300 text-teal-500 focus:ring-teal-400"
                  />
                  <div>
                    <p className="text-xs font-medium text-slate-700">
                      I am presenting a paper at IABSE 2026
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Check this box if you are an author or co-author presenting a paper at the conference.
                    </p>
                  </div>
                </label>
              </div>
            </div>

            {/* Registration Type Info */}
            <div className="rounded-lg bg-slate-50 border border-slate-200 p-4">
              <p className="text-xs font-semibold text-slate-600 mb-2">Registration Rate Guide</p>
              <div className="space-y-1.5">
                {[
                  { badge: 'MEMBER',          color: 'teal',   desc: 'IABSE registered member' },
                  { badge: 'YOUNG ENGINEER',  color: 'amber',  desc: 'Non-member · Under 36 years old' },
                  { badge: 'NON-MEMBER PLUS', color: 'violet', desc: 'Non-member · 36 years or older' },
                ].map(({ badge, color, desc }) => (
                  <div key={badge} className="flex items-center gap-2">
                    <span className={`text-xs rounded-full px-2 py-0.5 font-medium bg-${color}-100 text-${color}-700`}>
                      {badge}
                    </span>
                    <span className="text-xs text-slate-500">{desc}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Privacy & Data Collection Consent ── */}
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <div className="bg-slate-800 px-4 py-2.5">
                <p className="text-xs font-semibold text-white">Personal Data Collection &amp; Use</p>
              </div>
              <div className="p-4">
                {/* Consent items table */}
                <div className="overflow-x-auto mb-4">
                  <table className="w-full text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50">
                        <th className="border border-slate-200 px-3 py-2 text-left font-semibold text-slate-600">
                          Item
                        </th>
                        <th className="border border-slate-200 px-3 py-2 text-left font-semibold text-slate-600">
                          Purpose
                        </th>
                        <th className="border border-slate-200 px-3 py-2 text-left font-semibold text-slate-600">
                          Retention Period
                        </th>
                      </tr>
                    </thead>
                    <tbody className="text-slate-500">
                      <tr>
                        <td className="border border-slate-200 px-3 py-2">
                          Name, Email, Affiliation
                        </td>
                        <td className="border border-slate-200 px-3 py-2">
                          {/* Content to be filled */}
                        </td>
                        <td className="border border-slate-200 px-3 py-2">
                          {/* Content to be filled */}
                        </td>
                      </tr>
                      <tr>
                        <td className="border border-slate-200 px-3 py-2">
                          Date of Birth
                        </td>
                        <td className="border border-slate-200 px-3 py-2">
                          {/* Content to be filled */}
                        </td>
                        <td className="border border-slate-200 px-3 py-2">
                          {/* Content to be filled */}
                        </td>
                      </tr>
                      <tr>
                        <td className="border border-slate-200 px-3 py-2">
                          Payment Information
                        </td>
                        <td className="border border-slate-200 px-3 py-2">
                          {/* Content to be filled */}
                        </td>
                        <td className="border border-slate-200 px-3 py-2">
                          {/* Content to be filled */}
                        </td>
                      </tr>
                      <tr>
                        <td className="border border-slate-200 px-3 py-2">
                          Contact Information
                        </td>
                        <td className="border border-slate-200 px-3 py-2">
                          {/* Content to be filled */}
                        </td>
                        <td className="border border-slate-200 px-3 py-2">
                          {/* Content to be filled */}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <p className="text-[11px] text-slate-400 mb-3">
                  {/* Privacy policy body content to be added */}
                  You have the right to refuse consent; however, registration may not be
                  completed without providing the required information.
                </p>
                {/* Consent checkbox */}
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={privacyAgreed}
                    onChange={(e) => setPrivacyAgreed(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-teal-500 focus:ring-teal-400"
                  />
                  <span className="text-xs font-medium text-slate-700">
                    I agree to the collection and use of my personal data as described above.{' '}
                    <span className="text-red-400">*</span>
                  </span>
                </label>
              </div>
            </div>

            {error && (
              <div className="rounded-lg bg-red-50 border border-red-100 px-3 py-2.5">
                <p className="text-xs text-red-600">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={signupMutation.isPending}
              className="btn-primary"
            >
              {signupMutation.isPending ? 'Processing…' : 'Create Account & Get Verification Code'}
            </button>
          </form>
        </div>

        <div className="mt-4 text-center">
          <p className="text-xs text-slate-500">
            Already have an account?{' '}
            <Link to="/login" className="font-medium text-teal-600 hover:text-teal-700">
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};
