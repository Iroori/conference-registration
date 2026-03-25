export type MemberType = 'MEMBER' | 'NON_MEMBER' | 'NON_MEMBER_PLUS';

export type PaymentRegion = 'DOMESTIC' | 'OVERSEAS';

export type PaymentMethod = 'CARD' | 'KAKAO_PAY' | 'BANK_TRANSFER' | 'PAYPAL';

export type PaymentStatus = 'PENDING' | 'COMPLETED' | 'CANCELLED' | 'FAILED';

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

export interface MemberVerifyRequest {
  email: string;
}

export interface MemberVerifyResponse {
  found: boolean;
  member: Member | null;
  memberType: MemberType;
}

export interface ConferenceOption {
  id: string;
  category: 'REGISTRATION' | 'PROGRAM' | 'ADMIN';
  nameKr: string;
  nameEn: string;
  description: string;
  price: number;
  isFree: boolean;
  isRequired: boolean;
  requiresUpload?: boolean;
  memberOnly?: boolean;
  maxCapacity?: number;
}

export interface OptionPricing {
  memberId: string;
  memberType: MemberType;
  options: ConferenceOption[];
  basePrice: number;
  discount: number;
  subtotal: number;
  tax: number;
  total: number;
}

export interface PersonalInfo {
  nameKr: string;
  nameEn: string;
  affiliation: string;
  position: string;
  country: string;
  phone: string;
}

export interface PaymentRequest {
  memberId: string;
  memberType: MemberType;
  personalInfo: PersonalInfo;
  selectedOptionIds: string[];
  paymentRegion: PaymentRegion;
  paymentMethod: PaymentMethod;
  totalAmount: number;
}

export interface PaymentResult {
  paymentId: string;
  registrationNumber: string;
  status: PaymentStatus;
  member: Member;
  selectedOptions: ConferenceOption[];
  totalAmount: number;
  paidAt: string;
  emailSent: boolean;
}

export interface PaymentRecord {
  paymentId: string;
  registrationNumber: string;
  nameKr: string;
  nameEn: string;
  affiliation: string;
  memberType: MemberType;
  selectedOptions: string[];
  totalAmount: number;
  status: PaymentStatus;
  paidAt: string;
  paymentMethod: PaymentMethod;
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

export type RegistrationStep = 'VERIFY' | 'OPTIONS' | 'PAYMENT' | 'COMPLETE';
