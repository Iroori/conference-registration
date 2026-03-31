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
} from '../types';

// ─── Auth ────────────────────────────────────────────────────────────────────
export const apiSignup = async (req: SignupRequest): Promise<void> => {
  await apiClient.post('/auth/signup', req);
};

export const apiLogin = async (req: LoginRequest): Promise<AuthUser> => {
  const res = await apiClient.post<{ data: AuthUser }>('/auth/login', req);
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
