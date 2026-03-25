import type {
  MemberVerifyRequest,
  MemberVerifyResponse,
  ConferenceOption,
  OptionPricing,
  PaymentRequest,
  PaymentResult,
  PaymentRecord,
  CancelRequest,
  CancelResult,
  MemberType,
} from '../types';

const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));

const MOCK_MEMBERS: Record<string, MemberVerifyResponse> = {
  'park.soyeon@postech.ac.kr': {
    found: true,
    memberType: 'MEMBER',
    member: {
      id: 'M-001',
      email: 'park.soyeon@postech.ac.kr',
      nameKr: '박소연',
      nameEn: 'Park Soyeon',
      affiliation: 'POSTECH',
      position: '박사과정',
      country: '대한민국',
      phone: '+82-10-1234-5678',
      memberType: 'MEMBER',
      isVerified: true,
    },
  },
  'john.kim@mit.edu': {
    found: false,
    memberType: 'NON_MEMBER',
    member: null,
  },
};

export const CONFERENCE_OPTIONS: ConferenceOption[] = [
  {
    id: 'OPT-REG-MEMBER',
    category: 'REGISTRATION',
    nameKr: '컨퍼런스 등록 (정회원)',
    nameEn: 'Conference Registration (Member)',
    description: '전일정 포함 · 논문집 PDF 제공',
    price: 150000,
    isFree: false,
    isRequired: true,
    memberOnly: true,
  },
  {
    id: 'OPT-REG-NONMEMBER',
    category: 'REGISTRATION',
    nameKr: '컨퍼런스 등록 (비회원)',
    nameEn: 'Conference Registration (Non-Member)',
    description: '전일정 포함 · 현장 등록',
    price: 250000,
    isFree: false,
    isRequired: true,
    memberOnly: false,
  },
  {
    id: 'OPT-REG-NONMEMBER-PLUS',
    category: 'REGISTRATION',
    nameKr: '컨퍼런스 등록 + 연회비',
    nameEn: 'Registration + Annual Membership',
    description: '비회원 등록 + 당일 학회 가입 포함',
    price: 320000,
    isFree: false,
    isRequired: true,
    memberOnly: false,
  },
  {
    id: 'OPT-GALA',
    category: 'PROGRAM',
    nameKr: '갈라 디너',
    nameEn: 'Gala Dinner',
    description: 'Day 2 저녁 · 공식 만찬 · 드레스코드: 비즈니스 캐주얼',
    price: 80000,
    isFree: false,
    isRequired: false,
  },
  {
    id: 'OPT-TOUR',
    category: 'PROGRAM',
    nameKr: '투어 프로그램',
    nameEn: 'Tour Program',
    description: 'Day 3 오후 · 도시 문화 투어 · 버스 이동 포함',
    price: 50000,
    isFree: false,
    isRequired: false,
    maxCapacity: 40,
  },
  {
    id: 'OPT-YEP',
    category: 'PROGRAM',
    nameKr: '영 엔지니어 프로그램',
    nameEn: 'Young Engineer Program',
    description: '만 35세 이하 · 멘토링 + 네트워킹 세션',
    price: 30000,
    isFree: false,
    isRequired: false,
  },
  {
    id: 'OPT-VISA',
    category: 'ADMIN',
    nameKr: '비자 초청장 요청',
    nameEn: 'Visa Invitation Letter',
    description: '여권 정보 입력 필요 · 5영업일 이내 발급',
    price: 0,
    isFree: true,
    isRequired: false,
    requiresUpload: false,
  },
  {
    id: 'OPT-PROCEEDINGS',
    category: 'ADMIN',
    nameKr: '논문집 인쇄본',
    nameEn: 'Printed Proceedings',
    description: '현장 수령 · USB 동봉',
    price: 20000,
    isFree: false,
    isRequired: false,
  },
];

const REGISTRATION_PRICES: Record<MemberType, number> = {
  MEMBER: 150000,
  NON_MEMBER: 250000,
  NON_MEMBER_PLUS: 320000,
};

export const apiVerifyMember = async (req: MemberVerifyRequest): Promise<MemberVerifyResponse> => {
  await delay(800);
  const result = MOCK_MEMBERS[req.email.toLowerCase()];
  if (result) return result;
  return { found: false, memberType: 'NON_MEMBER', member: null };
};

export const apiFetchOptions = async (_memberType: MemberType): Promise<ConferenceOption[]> => {
  await delay(400);
  return CONFERENCE_OPTIONS;
};

export const apiCalculatePricing = async (
  memberType: MemberType,
  selectedOptionIds: string[]
): Promise<OptionPricing> => {
  await delay(200);
  const allOptions = CONFERENCE_OPTIONS;
  const selected = allOptions.filter((o) => selectedOptionIds.includes(o.id));
  const basePrice = REGISTRATION_PRICES[memberType];
  const addons = selected.filter((o) => o.category !== 'REGISTRATION').reduce((sum, o) => sum + o.price, 0);
  const subtotal = basePrice + addons;
  const tax = Math.round(subtotal * 0.1);
  return {
    memberId: '',
    memberType,
    options: selected,
    basePrice,
    discount: 0,
    subtotal,
    tax,
    total: subtotal + tax,
  };
};

export const apiSubmitPayment = async (req: PaymentRequest): Promise<PaymentResult> => {
  await delay(1800);
  if (Math.random() < 0.05) throw new Error('결제 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
  const regNum = `KSSC-2026-${Math.floor(10000 + Math.random() * 90000)}`;
  const selectedOptions = CONFERENCE_OPTIONS.filter((o) => req.selectedOptionIds.includes(o.id));
  return {
    paymentId: `PAY-${Date.now()}`,
    registrationNumber: regNum,
    status: 'COMPLETED',
    member: {
      id: req.memberId || 'GUEST',
      email: '',
      nameKr: req.personalInfo.nameKr,
      nameEn: req.personalInfo.nameEn,
      affiliation: req.personalInfo.affiliation,
      position: req.personalInfo.position,
      country: req.personalInfo.country,
      phone: req.personalInfo.phone,
      memberType: req.memberType,
      isVerified: true,
    },
    selectedOptions,
    totalAmount: req.totalAmount,
    paidAt: new Date().toISOString(),
    emailSent: true,
  };
};

export const apiFetchPaymentHistory = async (): Promise<PaymentRecord[]> => {
  await delay(600);
  return [
    {
      paymentId: 'PAY-001',
      registrationNumber: 'KSSC-2026-03847',
      nameKr: '박소연',
      nameEn: 'Park Soyeon',
      affiliation: 'POSTECH',
      memberType: 'MEMBER',
      selectedOptions: ['컨퍼런스 등록', '갈라 디너'],
      totalAmount: 253000,
      status: 'COMPLETED',
      paidAt: '2026-03-18T10:23:00Z',
      paymentMethod: 'CARD',
    },
    {
      paymentId: 'PAY-002',
      registrationNumber: 'KSSC-2026-03901',
      nameKr: '김민준',
      nameEn: 'Kim Minjun',
      affiliation: 'MIT',
      memberType: 'NON_MEMBER',
      selectedOptions: ['컨퍼런스 등록', '투어 프로그램'],
      totalAmount: 330000,
      status: 'PENDING',
      paidAt: '2026-03-17T14:55:00Z',
      paymentMethod: 'PAYPAL',
    },
    {
      paymentId: 'PAY-003',
      registrationNumber: 'KSSC-2026-03715',
      nameKr: '이지수',
      nameEn: 'Lee Jisu',
      affiliation: 'KAIST',
      memberType: 'MEMBER',
      selectedOptions: ['컨퍼런스 등록'],
      totalAmount: 165000,
      status: 'CANCELLED',
      paidAt: '2026-03-15T09:10:00Z',
      paymentMethod: 'KAKAO_PAY',
    },
  ];
};

export const apiCancelPayment = async (req: CancelRequest): Promise<CancelResult> => {
  await delay(1000);
  if (!req.registrationNumber.startsWith('KSSC')) {
    throw new Error('유효하지 않은 등록 번호입니다.');
  }
  return {
    success: true,
    refundAmount: 253000,
    message: '취소 요청이 정상적으로 접수되었습니다. 환불은 3~5 영업일 이내 처리됩니다.',
  };
};
