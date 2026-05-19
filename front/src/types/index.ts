// ─── Auth ───────────────────────────────────────────────────────────────────
export type MemberType = 'MEMBER' | 'NON_MEMBER' | 'NON_MEMBER_PLUS' | 'YOUNG_ENGINEER';

export type DietaryRequirement = 'NONE' | 'VEGETARIAN' | 'HALAL' | 'OTHER';

export interface SignupRequest {
  email: string;
  password: string;
  lastName: string;
  firstName: string;
  affiliation: string;
  position: string;
  country: string;
  phone: string;
  birthDate: string; // ISO: "1990-03-15"
  isPresenter?: boolean;
  dietaryRequirement: DietaryRequirement;
  dietaryNote?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthUser {
  accessToken: string;
  refreshToken: string;
  email: string;
  lastName: string;
  firstName: string;
  affiliation: string;
  position: string;
  country: string;
  memberType: MemberType;
  isYoungEngineer: boolean;
  isPresenter: boolean;
  dietaryRequirement: DietaryRequirement;
  dietaryNote?: string | null;
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
  lastName: string;
  firstName: string;
  affiliation: string;
  position: string;
  country: string;
  phone: string;
  memberType: MemberType;
  isVerified: boolean;
}

export interface PersonalInfo {
  lastName: string;
  firstName: string;
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

/** 등록비 카테고리 — 회원 4유형 + 전시자 추가 배지 */
export type RegistrationCategory = MemberType | 'EXHIBITOR';

export interface RegistrationCategoryMeta {
  key: RegistrationCategory;
  label: string;
  /** IABSE 회원만 선택 가능 — 로그인 유저가 IABSE 회원이 아니면 잠금 */
  iabseMemberOnly?: boolean;
  /** 전시자 추가 배지 — 별도 안내 문구 영역 확보 (문구 미정) */
  hasReservedNote?: boolean;
}

/** Registration 탭에 노출되는 등록비 카테고리 (표시 순서) */
export const REGISTRATION_CATEGORIES: RegistrationCategoryMeta[] = [
  { key: 'MEMBER', label: 'IABSE Member', iabseMemberOnly: true },
  { key: 'NON_MEMBER', label: 'Non-IABSE Member' },
  {
    key: 'NON_MEMBER_PLUS',
    label: 'IABSE-Non Member Plus (includes 1 year IABSE membership)',
  },
  { key: 'YOUNG_ENGINEER', label: 'Young Engineer' },
  {
    key: 'EXHIBITOR',
    label: 'Additional Badge for Exhibitors',
    hasReservedNote: true,
  },
];

export interface RegistrationTierConfig {
  label: string;
  subtitle: string;
  color: 'teal' | 'amber' | 'slate';
  /** optionId mapping per registration category — 5 categories */
  optionIds: Record<RegistrationCategory, string>;
}

/**
 * 각 티어의 optionId 매핑 + 스타일 메타데이터.
 * 기간(deadline)은 서버 /api/config/registration-periods 응답으로 관리된다.
 */
export const REG_TIER_CONFIG: Record<RegistrationTierKey, RegistrationTierConfig> = {
  PRE_REGISTRATION: {
    label: 'Early Bird',
    subtitle: 'Best rates — limited availability',
    color: 'teal',
    optionIds: {
      MEMBER: 'OPT-REG-PRE-MEMBER',
      NON_MEMBER: 'OPT-REG-PRE-NM',
      NON_MEMBER_PLUS: 'OPT-REG-PRE-NMP',
      YOUNG_ENGINEER: 'OPT-REG-PRE-YE',
      EXHIBITOR: 'OPT-REG-PRE-EXH',
    },
  },
  EARLY_BIRD: {
    label: 'General',
    subtitle: 'Standard advance registration',
    color: 'amber',
    optionIds: {
      MEMBER: 'OPT-REG-EARLY-MEMBER',
      NON_MEMBER: 'OPT-REG-EARLY-NM',
      NON_MEMBER_PLUS: 'OPT-REG-EARLY-NMP',
      YOUNG_ENGINEER: 'OPT-REG-EARLY-YE',
      EXHIBITOR: 'OPT-REG-EARLY-EXH',
    },
  },
  REGULAR: {
    label: 'On-site',
    subtitle: 'On-site & late registration',
    color: 'slate',
    optionIds: {
      MEMBER: 'OPT-REG-MEMBER',
      NON_MEMBER: 'OPT-REG-NONMEMBER',
      NON_MEMBER_PLUS: 'OPT-REG-NONMEMBER-PLUS',
      YOUNG_ENGINEER: 'OPT-REG-YE',
      EXHIBITOR: 'OPT-REG-EXH',
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

// ─── Option Tab (Additional Programs) ────────────────────────────────────────
export const TECH_TOUR_OPTION_IDS = [
  'OPT-TECH-TOUR-1',
  'OPT-TECH-TOUR-2',
  'OPT-TECH-TOUR-3',
] as const;

/** Accompanying Person fee depends on the current registration period */
export const accompanyingOptionId = (tier: RegistrationTierKey): string =>
  ({
    PRE_REGISTRATION: 'OPT-ACCOMP-PRE',
    EARLY_BIRD: 'OPT-ACCOMP-EARLY',
    REGULAR: 'OPT-ACCOMP-REGULAR',
  }[tier]);

export const ACCOMPANYING_OPTION_IDS = [
  'OPT-ACCOMP-PRE',
  'OPT-ACCOMP-EARLY',
  'OPT-ACCOMP-REGULAR',
] as const;

export const isAccompanyingOption = (id: string): boolean =>
  (ACCOMPANYING_OPTION_IDS as readonly string[]).includes(id);

/** Ordered list of program option IDs shown in the Option tab */
export const programOptionIds = (
  tier: RegistrationTierKey
): string[] => [
  'OPT-WELCOME',
  'OPT-GALA-DINNER',
  'OPT-GALA-DINNER-YE',
  ...TECH_TOUR_OPTION_IDS,
  accompanyingOptionId(tier),
];

/** Program options that show an explicit "I will not attend" decline checkbox */
export const DECLINE_LABELS: Record<string, string> = {
  'OPT-WELCOME': 'I will not attend the Welcome reception',
  'OPT-GALA-DINNER': 'I will not attend the Gala dinner',
  'OPT-GALA-DINNER-YE': 'I will not attend the Gala dinner',
};

/** Program options pre-selected by default (attendance assumed unless declined) */
export const DEFAULT_SELECTED_OPTION_IDS = ['OPT-WELCOME'] as const;

/** Invitation letter option ID (ADMIN category, free) */
export const INVITATION_OPTION_ID = 'OPT-VISA';

// ─── Payment ─────────────────────────────────────────────────────────────────
export type PaymentMethod = 'CARD' | 'KAKAO_PAY' | 'BANK_TRANSFER' | 'PAYPAL';
export type PaymentStatus = 'PENDING' | 'COMPLETED' | 'CANCELLED' | 'FAILED';

export interface AccompanyingPersonInfo {
  lastName: string;
  firstName: string;
}

export interface PaymentRequest {
  selectedOptionIds: string[];
  /** optionId → quantity; defaults to 1 if absent */
  quantities?: Record<string, number>;
  paymentMethod: PaymentMethod;
  tid?: string;
  replycode?: string;
  /** 동반자 등록 옵션 선택 시 동반자 이름 */
  accompanyingPerson?: AccompanyingPersonInfo;
}

export interface PaymentResponse {
  id: number;
  registrationNumber: string;
  email: string;
  lastName: string;
  firstName: string;
  affiliation: string;
  memberType: MemberType;
  status: PaymentStatus;
  paymentMethod: PaymentMethod;
  subtotal: number;
  tax: number;
  totalAmount: number;
  paidAt: string | null;
  selectedOptions: ConferenceOption[];
  accompanyingPerson?: AccompanyingPersonInfo | null;
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
