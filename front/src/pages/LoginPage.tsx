import { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { apiLogin } from '../lib/api';
import { useAuth } from '../context/AuthContext';

export const LoginPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  const isPreWorkshop = location.pathname.includes('/pre-workshop');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const loginMutation = useMutation({
    mutationFn: apiLogin,
    onSuccess: (data) => {
      login(data);
      // redirect target precedence: location state -> defaults based on page route
      const from = (location.state as any)?.from?.pathname || (isPreWorkshop ? '/pre-workshop' : '/');
      navigate(from, { replace: true });
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })
        ?.response?.data?.message;
      setError(msg ?? 'Login failed. Please check your credentials.');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email || !password) {
      setError('Please enter your email and password.');
      return;
    }
    loginMutation.mutate({ email, password });
  };

  return (
    <div className="min-h-screen bg-cream flex items-center justify-center py-12 px-4">
      <div className="w-full max-w-sm">
        {/* Header */}
        <div className="text-center mb-8">
          <img src="/logo.png" alt="IABSE Congress Incheon 2026" className="mx-auto object-contain" style={{ height: '10rem' }} />
          <h1 className="text-base font-medium tracking-wide text-ink">
            {isPreWorkshop ? 'IABSE Congress Incheon 2026: Pre-workshop' : 'IABSE Congress Incheon 2026'}
          </h1>
        </div>

        <div className="card p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block label-section mb-1.5">
                Email address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-base"
                placeholder="your@email.com"
                autoComplete="email"
              />
            </div>

            <div>
              <label className="block label-section mb-1.5">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-base"
                placeholder="••••••••"
                autoComplete="current-password"
              />
            </div>

            {error && (
              <div className="rounded-lg bg-red-50 border border-red-100 px-3 py-2.5">
                <p className="text-xs text-red-600">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loginMutation.isPending}
              className="btn-primary"
            >
              {loginMutation.isPending ? 'Logging in...' : 'Sign In'}
            </button>
          </form>

          <div className="mt-4 pt-4 border-t border-slate-100 text-center">
            <Link to={isPreWorkshop ? '/pre-workshop/signup' : '/signup'} className="text-xs font-semibold uppercase tracking-[0.1em] text-gold hover:text-gold-hover">
              Create a new user account
            </Link>
          </div>
        </div>

        <p className="mt-6 text-center text-[11px] tracking-wide text-ink-faint">
          Contact: iabse2026@kibse.or.kr
        </p>
      </div>
    </div>
  );
};
