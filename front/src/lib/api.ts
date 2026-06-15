import apiClient from './apiClient';
import type {
  AuthUser,
  SignupRequest,
  LoginRequest,
  EmailVerifyRequest,
  ConferenceOption,
  MemberType,
  PaymentRequest,
  PaymentResponse,
  RegistrationPeriods,
  IasbseMember,
  UpdateProfileRequest,
  DiscountCode,
  PaginatedUsersResponse,
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

// 인증 코드 발송 (최초 및 재발송 겸용)
export const apiSendCode = async (email: string): Promise<void> => {
  await apiClient.post('/auth/send-code', { email });
};

// 인증 코드 검증 (가입 전 단계) — 성공 시 서버가 20분간 인증 이력 보관
export const apiVerifyCode = async (req: EmailVerifyRequest): Promise<void> => {
  await apiClient.post('/auth/verify-code', req);
};

export const apiRefreshToken = async (refreshToken: string): Promise<AuthUser> => {
  const res = await apiClient.post<{ data: AuthUser }>('/auth/refresh', { refreshToken });
  return res.data.data;
};

export const apiLogout = async (refreshToken: string): Promise<void> => {
  await apiClient.post('/auth/logout', { refreshToken });
};

// ─── IASBSE ──────────────────────────────────────────────────────────────────
export const apiCheckIasbse = async (firstName: string, lastName: string, company: string): Promise<boolean> => {
  const res = await apiClient.get<{ data: boolean }>(
    `/iasbse/check?firstName=${encodeURIComponent(firstName)}&lastName=${encodeURIComponent(lastName)}&company=${encodeURIComponent(company)}`
  );
  return res.data.data;
};

export const apiGetIasbseCompanies = async (): Promise<string[]> => {
  const res = await apiClient.get<{ data: string[] }>('/iasbse/companies');
  return res.data.data;
};

export const apiVerifyIabseId = async (iabseId: string): Promise<boolean> => {
  const res = await apiClient.get<{ data: boolean }>(
    `/iasbse/verify-id?iabseId=${encodeURIComponent(iabseId)}`
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

// ─── Admin ───────────────────────────────────────────────────────────────────
export const apiGetAdminUsers = async (page: number, size: number, search?: string): Promise<PaginatedUsersResponse> => {
  const params = new URLSearchParams();
  params.append('page', String(page));
  params.append('size', String(size));
  if (search) {
    params.append('search', search);
  }
  const res = await apiClient.get<{ data: PaginatedUsersResponse }>(`/admin/users?${params.toString()}`);
  return res.data.data;
};

export const apiUpdateUserMemberType = async (userId: number, memberType: MemberType): Promise<void> => {
  await apiClient.put(`/admin/users/${userId}/member-type`, { memberType });
};

export const apiGetAdminIasbseMembers = async (search?: string): Promise<IasbseMember[]> => {
  const url = search ? `/admin/iasbse-members?search=${encodeURIComponent(search)}` : '/admin/iasbse-members';
  const res = await apiClient.get<{ data: IasbseMember[] }>(url);
  return res.data.data;
};

export const apiAddAdminIasbseMember = async (req: {
  iabseId: string;
  firstName: string;
  lastName: string;
}): Promise<IasbseMember> => {
  const res = await apiClient.post<{ data: IasbseMember }>('/admin/iasbse-members', req);
  return res.data.data;
};

export const apiDeleteAdminIasbseMember = async (id: number): Promise<void> => {
  await apiClient.delete(`/admin/iasbse-members/${id}`);
};

export const apiGetAdminPayments = async (): Promise<PaymentResponse[]> => {
  const res = await apiClient.get<{ data: PaymentResponse[] }>('/admin/payments');
  return res.data.data;
};

export const apiGetAdminOptions = async (): Promise<ConferenceOption[]> => {
  const res = await apiClient.get<{ data: ConferenceOption[] }>('/admin/options');
  return res.data.data;
};

export const apiUpdateOptionCapacity = async (optionId: string, maxCapacity: number): Promise<void> => {
  await apiClient.patch(`/admin/options/${optionId}/capacity`, { maxCapacity });
};

export const apiDeleteUser = async (userId: number): Promise<void> => {
  await apiClient.delete(`/admin/users/${userId}`);
};

export const apiUpdateProfile = async (req: UpdateProfileRequest): Promise<AuthUser> => {
  const res = await apiClient.put<{ data: AuthUser }>('/user/profile', req);
  return res.data.data;
};

export const apiGetAdminDiscountCodes = async (): Promise<DiscountCode[]> => {
  const res = await apiClient.get<{ data: DiscountCode[] }>('/admin/discount-codes');
  return res.data.data;
};

export const apiCreateAdminDiscountCode = async (req: {
  iabseMemberDiscountRate: number;
  nonIabseMemberDiscountRate: number;
  galaDinnerFree: boolean;
  accompanyingPersonFree: boolean;
  technicalTourFree: boolean;
}): Promise<DiscountCode> => {
  const res = await apiClient.post<{ data: DiscountCode }>('/admin/discount-codes', req);
  return res.data.data;
};

export const apiDeleteAdminPayment = async (paymentId: number): Promise<void> => {
  await apiClient.delete(`/admin/payments/${paymentId}`);
};

export const apiDeleteAdminDiscountCode = async (id: number): Promise<void> => {
  await apiClient.delete(`/admin/discount-codes/${id}`);
};

export const apiVerifyDiscountCode = async (code: string): Promise<DiscountCode> => {
  const res = await apiClient.get<{ data: DiscountCode }>(`/payments/discount-code/verify?code=${encodeURIComponent(code)}`);
  return res.data.data;
};
