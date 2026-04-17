import apiClient from './apiClient';
import type {
  AuthUser,
  SignupRequest,
  LoginRequest,
  EmailVerifyRequest,
  IasbseCheckResponse,
  ConferenceOption,
  MemberType,
  PaymentRequest,
  PaymentResponse,
  CancelRequest,
  CancelResult,
  RegistrationPeriods,
} from '../types';

// ─── Password hashing ────────────────────────────────────────────────────────
// SHA-256 the password client-side so the plaintext never travels over the wire.
// The server receives the hex digest and BCrypts it for storage / comparison.
async function hashPassword(plaintext: string): Promise<string> {
  const data = new TextEncoder().encode(plaintext);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

// ─── Auth ────────────────────────────────────────────────────────────────────
export const apiSignup = async (req: SignupRequest): Promise<void> => {
  const hashedPw = await hashPassword(req.password);
  await apiClient.post('/auth/signup', { ...req, password: hashedPw });
};

export const apiLogin = async (req: LoginRequest): Promise<AuthUser> => {
  const hashedPw = await hashPassword(req.password);
  const res = await apiClient.post<{ data: AuthUser }>('/auth/login', {
    ...req,
    password: hashedPw,
  });
  return res.data.data;
};

export const apiResendCode = async (email: string): Promise<void> => {
  await apiClient.post(`/auth/resend-code?email=${encodeURIComponent(email)}`);
};

export const apiVerifyEmail = async (req: EmailVerifyRequest): Promise<void> => {
  await apiClient.post('/auth/verify-email', req);
};

export const apiRefreshToken = async (refreshToken: string): Promise<AuthUser> => {
  const res = await apiClient.post<{ data: AuthUser }>('/auth/refresh', { refreshToken });
  return res.data.data;
};

export const apiLogout = async (refreshToken: string): Promise<void> => {
  await apiClient.post('/auth/logout', { refreshToken });
};

// ─── IASBSE ──────────────────────────────────────────────────────────────────
export const apiCheckIasbse = async (email: string): Promise<IasbseCheckResponse> => {
  const res = await apiClient.get<{ data: IasbseCheckResponse }>(
    `/iasbse/check?email=${encodeURIComponent(email)}`
  );
  return res.data.data;
};

// ─── Options ─────────────────────────────────────────────────────────────────
export const apiFetchOptions = async (memberType: MemberType): Promise<ConferenceOption[]> => {
  const res = await apiClient.get<{ data: ConferenceOption[] }>(
    `/options?memberType=${memberType}`
  );
  return res.data.data;
};

// ─── Config ──────────────────────────────────────────────────────────────────
export const apiFetchRegistrationPeriods = async (): Promise<RegistrationPeriods> => {
  const res = await apiClient.get<{ data: RegistrationPeriods }>('/config/registration-periods');
  return res.data.data;
};

// ─── Payment ─────────────────────────────────────────────────────────────────
export const apiCreatePayment = async (req: PaymentRequest): Promise<PaymentResponse> => {
  const res = await apiClient.post<{ data: PaymentResponse }>('/payments', req);
  return res.data.data;
};

export const apiFetchMyPayments = async (): Promise<PaymentResponse[]> => {
  const res = await apiClient.get<{ data: PaymentResponse[] }>('/payments/me');
  return res.data.data;
};

export const apiCancelPayment = async (req: CancelRequest): Promise<CancelResult> => {
  const res = await apiClient.post<{ data: { success: boolean; refundAmount: number; message: string } }>(
    '/payments/cancel',
    req
  );
  const d = res.data.data;
  return { success: d.success, refundAmount: d.refundAmount, message: d.message };
};

export const apiReportPaymentFailure = async (payload: {
  replycode: string;
  replyMsg: string;
  tid?: string;
}): Promise<void> => {
  // 실패 이벤트 전송 자체가 실패해도 UX 차단하지 않음 — 콘솔 경고만 출력
  try {
    await apiClient.post('/payments/failure', payload);
  } catch {
    console.warn('[Payment] Failed to report payment failure to server');
  }
};
