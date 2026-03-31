import { useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { apiSignup, apiCheckIasbse, apiVerifyEmail, apiResendCode } from '../lib/api';
import type { IasbseCheckResponse } from '../types';

type Step = 'FORM' | 'VERIFY_EMAIL';

const COUNTRIES = ['대한민국', '미국', '일본', '중국', '독일', '영국', '프랑스', '기타'];

export const SignupPage = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('FORM');

  // 폼 상태
  const [form, setForm] = useState({
    email: '',
    password: '',
    passwordConfirm: '',
    nameKr: '',
    nameEn: '',
    affiliation: '',
    position: '',
    country: '대한민국',
    phone: '',
    birthDate: '',
  });
  const [error, setError] = useState('');

  // IASBSE 확인 (이메일 blur 시 debounce)
  const emailCheckTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [iasbseResult, setIasbseResult] = useState<IasbseCheckResponse | null>(null);
  const [checkingIasbse, setCheckingIasbse] = useState(false);

  // 이메일 인증 코드
  const [verifyCode, setVerifyCode] = useState('');
  const [verifyError, setVerifyError] = useState('');

  const signupMutation = useMutation({
    mutationFn: apiSignup,
    onSuccess: () => setStep('VERIFY_EMAIL'),
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })
        ?.response?.data?.message;
      setError(msg ?? '회원가입에 실패했습니다.');
    },
  });

  const verifyMutation = useMutation({
    mutationFn: apiVerifyEmail,
    onSuccess: () => navigate('/login?verified=1'),
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })
        ?.response?.data?.message;
      setVerifyError(msg ?? '인증에 실패했습니다.');
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
      setError('비밀번호가 일치하지 않습니다.');
      return;
    }
    if (form.password.length < 8) {
      setError('비밀번호는 8자 이상이어야 합니다.');
      return;
    }
    if (!form.birthDate) {
      setError('생년월일을 입력해주세요.');
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

  const set = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [field]: e.target.value }));

  // ─── 이메일 인증 단계 ──────────────────────────────────────────────────────
  if (step === 'VERIFY_EMAIL') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center py-12 px-4">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <p className="text-xs font-semibold uppercase tracking-widest text-teal-500 mb-1">KSSC 2026</p>
            <h1 className="text-2xl font-semibold text-slate-800">이메일 인증</h1>
          </div>
          <div className="card p-6">
            <p className="text-sm text-slate-600 mb-5">
              <span className="font-medium text-slate-800">{form.email}</span>으로 인증 코드를 발송했습니다.
              이메일을 확인하고 6자리 코드를 입력해주세요.
            </p>
            <form onSubmit={handleVerify} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">인증 코드</label>
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
                {verifyMutation.isPending ? '인증 중...' : '인증 완료'}
              </button>
            </form>
            <button
              onClick={() => resendMutation.mutate(form.email)}
              disabled={resendMutation.isPending}
              className="btn-secondary mt-3"
            >
              {resendMutation.isPending ? '발송 중...' : '코드 재발송'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── 회원가입 폼 ────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4">
      <div className="mx-auto max-w-lg">
        <div className="text-center mb-8">
          <p className="text-xs font-semibold uppercase tracking-widest text-teal-500 mb-1">KSSC 2026</p>
          <h1 className="text-2xl font-semibold text-slate-800">회원가입</h1>
          <p className="mt-2 text-sm text-slate-500">참가 등록을 위한 계정을 만들어주세요</p>
        </div>

        <div className="card">
          {/* 진행 헤더 */}
          <div className="bg-slate-800 px-6 py-3.5">
            <span className="flex items-center gap-2 text-sm font-medium text-white">
              <span className="text-teal-400">·</span> 개인정보 입력
            </span>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            {/* 이메일 */}
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">
                이메일 <span className="text-red-400">*</span>
                <span className="ml-1 font-normal text-slate-400">(로그인 ID로 사용됩니다)</span>
              </label>
              <input
                type="email"
                value={form.email}
                onChange={handleEmailChange}
                className="input-base"
                placeholder="your@email.com"
                required
              />
              {/* IASBSE 회원 여부 안내 */}
              {checkingIasbse && (
                <p className="mt-1.5 text-xs text-slate-400">IASBSE 회원 여부 확인 중...</p>
              )}
              {iasbseResult && !checkingIasbse && (
                <div className={`mt-1.5 flex items-center gap-1.5 text-xs ${
                  iasbseResult.isIasbseMember ? 'text-teal-600' : 'text-amber-600'
                }`}>
                  <span>{iasbseResult.isIasbseMember ? '✓' : '!'}</span>
                  <span>{iasbseResult.message}</span>
                  {iasbseResult.isIasbseMember && (
                    <span className="ml-1 rounded-full bg-teal-100 px-2 py-0.5 text-teal-700 font-medium">
                      MEMBER 요금 적용
                    </span>
                  )}
                  {!iasbseResult.isIasbseMember && (
                    <span className="ml-1 rounded-full bg-amber-100 px-2 py-0.5 text-amber-700 font-medium">
                      NON-MEMBER 요금 적용
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* 비밀번호 */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">
                  비밀번호 <span className="text-red-400">*</span>
                </label>
                <input
                  type="password"
                  value={form.password}
                  onChange={set('password')}
                  className="input-base"
                  placeholder="8자 이상"
                  minLength={8}
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">
                  비밀번호 확인 <span className="text-red-400">*</span>
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
                  placeholder="재입력"
                  required
                />
              </div>
            </div>

            <div className="border-t border-slate-100 pt-4">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">
                개인정보
              </p>

              {/* 이름 */}
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">
                    이름 (한글) <span className="text-red-400">*</span>
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
                    이름 (영문) <span className="text-red-400">*</span>
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

              {/* 소속 / 직함 */}
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">
                    소속 <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.affiliation}
                    onChange={set('affiliation')}
                    className="input-base"
                    placeholder="회사/기관명"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">
                    직함 <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.position}
                    onChange={set('position')}
                    className="input-base"
                    placeholder="연구원 / 교수 등"
                    required
                  />
                </div>
              </div>

              {/* 생년월일 / 국가 */}
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">
                    생년월일 <span className="text-red-400">*</span>
                    <span className="ml-1 font-normal text-slate-400">(Young Engineer 구분)</span>
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
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">국가</label>
                  <select value={form.country} onChange={set('country')} className="input-base">
                    {COUNTRIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* 연락처 */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">연락처</label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={set('phone')}
                  className="input-base"
                  placeholder="+82-10-0000-0000"
                />
              </div>
            </div>

            {/* 회원 유형 안내 */}
            <div className="rounded-lg bg-slate-50 border border-slate-200 p-4">
              <p className="text-xs font-semibold text-slate-600 mb-2">결제 유형 안내</p>
              <div className="space-y-1.5">
                {[
                  { badge: 'MEMBER', color: 'teal', desc: 'IASBSE 등록 회원' },
                  { badge: 'NON-MEMBER', color: 'amber', desc: '비회원 · Young Engineer (만 35세 이하)' },
                  { badge: 'NON-MEMBER PLUS', color: 'slate', desc: '비회원 · 일반 (만 36세 이상)' },
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
              {signupMutation.isPending ? '처리 중...' : '회원가입 · 이메일 인증 코드 받기'}
            </button>
          </form>
        </div>

        <div className="mt-4 text-center">
          <p className="text-xs text-slate-500">
            이미 계정이 있으신가요?{' '}
            <Link to="/login" className="font-medium text-teal-600 hover:text-teal-700">
              로그인
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};
