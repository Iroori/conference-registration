// ─── Auth ───────────────────────────────────────────────────────────────────
export type MemberType = 'MEMBER' | 'NON_MEMBER' | 'NON_MEMBER_PLUS' | 'YOUNG_ENGINEER';

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
  country: string;
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
  /** 관리자 응답에만 포함됨 (일반 사용자 응답은 available boolean만 받음) */
  maxCapacity?: number | null;
  currentCount?: number;
  available?: boolean;
}

// ─── Registration Tiers ──────────────────────────────────────────────────────
export type RegistrationTierKey = 'PRE_REGISTRATION' | 'EARLY_BIRD' | 'REGULAR';

export interface RegistrationTierConfig {
  label: string;
  subtitle: string;
  color: 'teal' | 'amber' | 'slate';
  /** optionId mapping per member type — 4 categories */
  optionIds: Record<MemberType, string>;
}

/**
 * 각 티어의 optionId 매핑 + 스타일 메타데이터.
 * 기간(deadline)은 서버 /api/config/registration-periods 응답으로 관리된다.
 */
export const REG_TIER_CONFIG: Record<RegistrationTierKey, RegistrationTierConfig> = {
  PRE_REGISTRATION: {
    label: 'Pre-Registration',
    subtitle: 'Best rates — limited availability',
    color: 'teal',
    optionIds: {
      MEMBER: 'OPT-REG-PRE-MEMBER',
      NON_MEMBER: 'OPT-REG-PRE-NM',
      NON_MEMBER_PLUS: 'OPT-REG-PRE-NMP',
      YOUNG_ENGINEER: 'OPT-REG-PRE-YE',
    },
  },
  EARLY_BIRD: {
    label: 'Early Bird',
    subtitle: 'Standard advance registration',
    color: 'amber',
    optionIds: {
      MEMBER: 'OPT-REG-EARLY-MEMBER',
      NON_MEMBER: 'OPT-REG-EARLY-NM',
      NON_MEMBER_PLUS: 'OPT-REG-EARLY-NMP',
      YOUNG_ENGINEER: 'OPT-REG-EARLY-YE',
    },
  },
  REGULAR: {
    label: 'Regular Registration',
    subtitle: 'On-site & late registration',
    color: 'slate',
    optionIds: {
      MEMBER: 'OPT-REG-MEMBER',
      NON_MEMBER: 'OPT-REG-NONMEMBER',
      NON_MEMBER_PLUS: 'OPT-REG-NONMEMBER-PLUS',
      YOUNG_ENGINEER: 'OPT-REG-YE',
    },
  },
};

// ─── Registration Periods (서버 설정 기반) ──────────────────────────────────
export interface TierPeriod {
  startDate: string | null;  // ISO yyyy-MM-dd
  endDate: string | null;
}
export interface RegistrationPeriods {
  preRegistration: TierPeriod;
  earlyBird: TierPeriod;
  regular: TierPeriod;
}

/** Option IDs shown in the Additional Programs step */
export const ADDITIONAL_OPTION_IDS = [
  'OPT-WELCOME',
  'OPT-GALA-DINNER',
  'OPT-TECH-TOUR',
  'OPT-ACCOMPANYING',
  'OPT-PRE-WORKSHOP',
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
