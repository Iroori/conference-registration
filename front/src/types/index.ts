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
  isPresenter?: boolean;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthUser {
  accessToken: string;
  refreshToken: string;
  email: string;
  nameKr: string;
  nameEn: string;
  affiliation: string;
  position: string;
  memberType: MemberType;
  isYoungEngineer: boolean;
  isPresenter: boolean;
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

// ─── Registration Tiers ──────────────────────────────────────────────────────
export type RegistrationTierKey = 'PRE_REGISTRATION' | 'EARLY_BIRD' | 'REGULAR';

export interface RegistrationTierConfig {
  label: string;
  subtitle: string;
  deadline: string;
  deadlineDate: Date;
  color: 'teal' | 'amber' | 'slate';
  optionIds: Record<MemberType, string>;
}

export const REG_TIER_CONFIG: Record<RegistrationTierKey, RegistrationTierConfig> = {
  PRE_REGISTRATION: {
    label: 'Pre-Registration',
    subtitle: 'Best rates — limited availability',
    deadline: 'April 30, 2026',
    deadlineDate: new Date('2026-04-30'),
    color: 'teal',
    optionIds: {
      MEMBER: 'OPT-REG-PRE-MEMBER',
      NON_MEMBER: 'OPT-REG-PRE-NM',
      NON_MEMBER_PLUS: 'OPT-REG-PRE-NMP',
    },
  },
  EARLY_BIRD: {
    label: 'Early Bird',
    subtitle: 'Standard advance registration',
    deadline: 'July 31, 2026',
    deadlineDate: new Date('2026-07-31'),
    color: 'amber',
    optionIds: {
      MEMBER: 'OPT-REG-EARLY-MEMBER',
      NON_MEMBER: 'OPT-REG-EARLY-NM',
      NON_MEMBER_PLUS: 'OPT-REG-EARLY-NMP',
    },
  },
  REGULAR: {
    label: 'Regular Registration',
    subtitle: 'On-site & late registration',
    deadline: 'October 31, 2026',
    deadlineDate: new Date('2026-10-31'),
    color: 'slate',
    optionIds: {
      MEMBER: 'OPT-REG-MEMBER',
      NON_MEMBER: 'OPT-REG-NONMEMBER',
      NON_MEMBER_PLUS: 'OPT-REG-NONMEMBER-PLUS',
    },
  },
};

/** Option IDs shown in the Additional Programs step */
export const ADDITIONAL_OPTION_IDS = [
  'OPT-WELCOME',
  'OPT-CONGRESS-DINNER',
  'OPT-TECH-TOUR',
  'OPT-YEP',
  'OPT-ACCOMPANYING',
  'OPT-WORKSHOP',
] as const;

/** Invitation letter option ID (ADMIN category, free) */
export const INVITATION_OPTION_ID = 'OPT-VISA';

// ─── Payment ─────────────────────────────────────────────────────────────────
export type PaymentMethod = 'CARD' | 'KAKAO_PAY' | 'BANK_TRANSFER' | 'PAYPAL';
export type PaymentStatus = 'PENDING' | 'COMPLETED' | 'CANCELLED' | 'FAILED';

export interface PaymentRequest {
  selectedOptionIds: string[];
  /** optionId → quantity; defaults to 1 if absent */
  quantities?: Record<string, number>;
  paymentMethod: PaymentMethod;
  tid?: string;
  replycode?: string;
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
export type RegistrationStep =
  | 'REG_TYPE'
  | 'ADD_OPTIONS'
  | 'INVITATION'
  | 'SUMMARY'
  | 'PAYMENT'
  | 'COMPLETE';
