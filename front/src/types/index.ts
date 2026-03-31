// ─── Auth ───────────────────────────────────────────────────────────────────
export type MemberType = 'MEMBER' | 'NON_MEMBER' | 'NON_MEMBER_PLUS';

export interface SignupRequest {
  email: string;
  password: string;
  nameKr: string;
  nameEn: string;
  affiliation: string;
  position: string;
  country: string;
  phone: string;
  birthDate: string; // ISO: "1990-03-15"
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthUser {
  token: string;
  email: string;
  nameKr: string;
  nameEn: string;
  affiliation: string;
  position: string;
  memberType: MemberType;
  isYoungEngineer: boolean;
}

export interface IasbseCheckResponse {
  isIasbseMember: boolean;
  message: string;
}

export interface EmailVerifyRequest {
  email: string;
  code: string;
}

// ─── Member (결제 흐름 내 사용) ─────────────────────────────────────────────
export interface Member {
  id: string;
  email: string;
  nameKr: string;
  nameEn: string;
  affiliation: string;
  position: string;
  country: string;
  phone: string;
  memberType: MemberType;
  isVerified: boolean;
}

export interface PersonalInfo {
  nameKr: string;
  nameEn: string;
  affiliation: string;
  position: string;
  country: string;
  phone: string;
}

// ─── Conference Options ──────────────────────────────────────────────────────
export type OptionCategory = 'REGISTRATION' | 'PROGRAM' | 'ADMIN';

export interface ConferenceOption {
  id: string;
  category: OptionCategory;
  nameKr: string;
  nameEn: string;
  description: string;
  price: number;
  isFree: boolean;
  isRequired: boolean;
  requiresUpload?: boolean;
  allowedMemberType?: MemberType | null;
  maxCapacity?: number | null;
  currentCount?: number;
  available?: boolean;
}

// ─── Payment ─────────────────────────────────────────────────────────────────
export type PaymentMethod = 'CARD' | 'KAKAO_PAY' | 'BANK_TRANSFER' | 'PAYPAL';
export type PaymentStatus = 'PENDING' | 'COMPLETED' | 'CANCELLED' | 'FAILED';

export interface PaymentRequest {
  selectedOptionIds: string[];
  paymentMethod: PaymentMethod;
}

export interface PaymentResponse {
  id: number;
  registrationNumber: string;
  email: string;
  nameKr: string;
  nameEn: string;
  affiliation: string;
  memberType: MemberType;
  status: PaymentStatus;
  paymentMethod: PaymentMethod;
  subtotal: number;
  tax: number;
  totalAmount: number;
  paidAt: string | null;
  selectedOptions: ConferenceOption[];
}

export interface CancelRequest {
  registrationNumber: string;
  reason: string;
}

export interface CancelResult {
  success: boolean;
  refundAmount: number;
  message: string;
}

// ─── Pricing (프론트엔드 계산용) ─────────────────────────────────────────────
export interface PricingSummary {
  subtotal: number;
  tax: number;
  total: number;
}

// ─── Page State ──────────────────────────────────────────────────────────────
export type RegistrationStep = 'OPTIONS' | 'PAYMENT' | 'COMPLETE';
