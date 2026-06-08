import { useEffect, useState, useMemo } from 'react';
import { useCreatePayment, useConferenceOptions } from '../hooks/useRegistration';
import { useAuth } from '../context/AuthContext';
import { ErrorBanner, LoadingSpinner, SectionLabel, formatKRW } from './Shared';
import { apiReportPaymentFailure, apiVerifyDiscountCode } from '../lib/api';
import type { PaymentResponse, AccompanyingPersonInfo, ExhibitorBadgeInfo, DiscountCode } from '../types';
import { INVITATION_OPTION_ID } from '../types';


interface Step3PaymentProps {
  selectedOptionIds: string[];
  quantities: Record<string, number>;
  accompanyingPersons: AccompanyingPersonInfo[];
  exhibitorBadges: ExhibitorBadgeInfo[];
  waitlistedOptionIds: string[];
  iabseId: string;
  birthDate: string;
  totalAmount: number;
  onComplete: (result: PaymentResponse) => void;
  onBack: () => void;
}

// 한국 국가명 목록 (SignupPage: 'South Korea', Step1Verify: '대한민국')
const KOREAN_COUNTRY_VALUES = ['South Korea', '대한민국', 'Korea', 'KR'];

function isKoreanUser(country: string | undefined): boolean {
  if (!country) return false;
  return KOREAN_COUNTRY_VALUES.includes(country);
}

export const Step3Payment = ({
  selectedOptionIds,
  quantities,
  accompanyingPersons,
  exhibitorBadges,
  waitlistedOptionIds,
  iabseId,
  birthDate,
  totalAmount,
  onComplete,
  onBack,
}: Step3PaymentProps) => {
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pgError, setPgError] = useState<string | null>(null);
  const [policyAgreed, setPolicyAgreed] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'bank'>('card');

  // Discount code states
  const { data: options } = useConferenceOptions(user?.memberType ?? 'NON_MEMBER');
  const [discountCodeInput, setDiscountCodeInput] = useState('');
  const [appliedCodeEntity, setAppliedCodeEntity] = useState<DiscountCode | null>(null);
  const [discountError, setDiscountError] = useState<string | null>(null);
  const [verifyingCode, setVerifyingCode] = useState(false);

  const discountBreakdown = useMemo(() => {
    if (!appliedCodeEntity || !options) {
      return {
        regDiscount: 0,
        galaDiscount: 0,
        accompDiscount: 0,
        tourDiscount: 0,
        totalDiscount: 0,
      };
    }

    let regDiscount = 0;
    let galaDiscount = 0;
    let accompDiscount = 0;
    let tourDiscount = 0;

    const regOptId = selectedOptionIds.find((id) => {
      const opt = options.find((o) => o.id === id);
      return opt && opt.category === 'REGISTRATION';
    });

    if (regOptId) {
      const regOpt = options.find((o) => o.id === regOptId);
      if (regOpt) {
        const isMemberOption = regOpt.id.includes('-MEMBER') && !regOpt.id.includes('-NONMEMBER') && !regOpt.id.includes('-NMP');
        const rate = isMemberOption
          ? appliedCodeEntity.iabseMemberDiscountRate
          : appliedCodeEntity.nonIabseMemberDiscountRate;
        if (rate > 0) {
          regDiscount = (regOpt.price * rate) / 100;
        }
      }
    }

    if (appliedCodeEntity.galaDinnerFree) {
      const galaOpt = options.find((o) => o.id === 'OPT-GALA-DINNER');
      if (galaOpt && selectedOptionIds.includes('OPT-GALA-DINNER')) {
        galaDiscount = galaOpt.price * (quantities['OPT-GALA-DINNER'] ?? 1);
      }
    }

    if (appliedCodeEntity.accompanyingPersonFree) {
      const accompOptId = selectedOptionIds.find((id) => id.startsWith('OPT-ACCOMP-'));
      if (accompOptId) {
        const accompOpt = options.find((o) => o.id === accompOptId);
        if (accompOpt) {
          accompDiscount = accompOpt.price;
        }
      }
    }

    if (appliedCodeEntity.technicalTourFree) {
      const tourOptId = selectedOptionIds.find((id) => id.startsWith('OPT-TECH-TOUR-'));
      if (tourOptId) {
        const tourOpt = options.find((o) => o.id === tourOptId);
        if (tourOpt) {
          tourDiscount = tourOpt.price * (quantities[tourOptId] ?? 1);
        }
      }
    }

    const totalDiscount = Math.min(regDiscount + galaDiscount + accompDiscount + tourDiscount, totalAmount);

    return {
      regDiscount,
      galaDiscount,
      accompDiscount,
      tourDiscount,
      totalDiscount,
    };
  }, [appliedCodeEntity, options, selectedOptionIds, quantities, totalAmount]);

  const finalPaidAmount = Math.max(0, totalAmount - discountBreakdown.totalDiscount);

  const domestic = isKoreanUser(user?.country);
  const mid = domestic
    ? (import.meta.env.VITE_PAYGATE_MID_DOMESTIC || 'kibse')
    : (import.meta.env.VITE_PAYGATE_MID_OVERSEAS || 'kibse0us');
  // 통화 및 금액: 해외 MID의 통화·환율 변환은 PayGate가 자체 처리 — 항상 KRW(WON) 원화 금액 전달
  const goodcurrency = 'WON';
  const unitprice = finalPaidAmount;
  const paymethod = domestic ? 'card' : '104';

  const { mutate: createPayment, isPending, error: serverError } = useCreatePayment();

  const handleApplyDiscountCode = async () => {
    if (!discountCodeInput.trim()) return;
    setVerifyingCode(true);
    setDiscountError(null);
    try {
      const code = await apiVerifyDiscountCode(discountCodeInput.trim());
      setAppliedCodeEntity(code);
      setDiscountError(null);
    } catch (err: any) {
      console.error(err);
      const msg = err?.response?.data?.message || 'Invalid discount code.';
      setDiscountError(msg);
      setAppliedCodeEntity(null);
    } finally {
      setVerifyingCode(false);
    }
  };

  useEffect(() => {
    (window as any).getPGIOresult = () => {
      const form = document.forms.namedItem('PGIOForm') as HTMLFormElement;
      if (!form) return;
      const replycode = (form.elements.namedItem('replycode') as HTMLInputElement)?.value;
      const replyMsg = (form.elements.namedItem('replyMsg') as HTMLInputElement)?.value;

      // 0000: 상용 결제 성공, NPS016: 데모 거래 성공 알림코드
      if (replycode === "0000" || replycode === "NPS000" || replycode === "NPS016") {
        createPayment(
          {
            selectedOptionIds,
            quantities: Object.keys(quantities).length > 0 ? quantities : undefined,
            paymentMethod: 'CARD',
            tid: (form.elements.namedItem('tid') as HTMLInputElement)?.value,
            replycode: replycode,
            accompanyingPersons: accompanyingPersons.length > 0 ? accompanyingPersons : undefined,
            exhibitorBadges: exhibitorBadges.length > 0 ? exhibitorBadges : undefined,
            waitlistedOptionIds: waitlistedOptionIds.length > 0 ? waitlistedOptionIds : undefined,
            iabseId: iabseId || undefined,
            birthDate: birthDate || undefined,
            appliedDiscountCode: appliedCodeEntity?.code || undefined,
          },
          {
            onSuccess: (result) => onComplete(result),
            onError: () => setIsSubmitting(false),
          }
        );
      } else {
        // PG 에러: 버튼 잠금 해제 + 인라인 에러 표시
        setIsSubmitting(false);
        setPgError(`[${replycode}] ${replyMsg || 'Payment was not completed. Please try again.'}`);
        apiReportPaymentFailure({
          replycode,
          replyMsg,
          tid: (form.elements.namedItem('tid') as HTMLInputElement)?.value || undefined,
        });
      }
    };
  }, [createPayment, selectedOptionIds, quantities, accompanyingPersons, exhibitorBadges, waitlistedOptionIds, iabseId, birthDate, appliedCodeEntity, onComplete]);

  const handleFreeRegistration = () => {
    if (isSubmitting || isPending) return;
    if (!policyAgreed) {
      setPgError('Please agree to the Cancellation and Refund Policy before proceeding.');
      return;
    }
    setPgError(null);
    setIsSubmitting(true);

    createPayment(
      {
        selectedOptionIds,
        quantities: Object.keys(quantities).length > 0 ? quantities : undefined,
        paymentMethod: 'CARD',
        tid: undefined,
        replycode: '0000',
        accompanyingPersons: accompanyingPersons.length > 0 ? accompanyingPersons : undefined,
        exhibitorBadges: exhibitorBadges.length > 0 ? exhibitorBadges : undefined,
        waitlistedOptionIds: waitlistedOptionIds.length > 0 ? waitlistedOptionIds : undefined,
        iabseId: iabseId || undefined,
        birthDate: birthDate || undefined,
        appliedDiscountCode: appliedCodeEntity?.code || undefined,
      },
      {
        onSuccess: (result) => onComplete(result),
        onError: () => setIsSubmitting(false),
      }
    );
  };

  const handlePay = () => {
    if (isSubmitting || isPending) return;
    if (!policyAgreed) {
      setPgError('Please agree to the Cancellation and Refund Policy before proceeding.');
      return;
    }
    setPgError(null);

    if (finalPaidAmount === 0) {
      handleFreeRegistration();
      return;
    }

    if (typeof (window as any).doTransaction === 'function') {
      setIsSubmitting(true);

      // React의 내부 속성(__reactFiber 등)이 PG 스크립트에 의해 직렬화되는 것을 방지하기 위해 순수 DOM으로 폼 생성
      let form = document.forms.namedItem('PGIOForm') as HTMLFormElement;
      if (form) {
        form.remove(); // 기존 폼 제거
      }

      form = document.createElement('form');
      form.name = 'PGIOForm';
      form.style.display = 'none';

      const addInput = (name: string, value: string) => {
        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = name;
        input.value = value;
        form.appendChild(input);
      };

      addInput('mid', mid);
      addInput('paymethod', paymethod);
      addInput('goodname', 'IABSE 2026 Registration');
      addInput('unitprice', String(unitprice));
      addInput('goodcurrency', goodcurrency);
      addInput('langcode', domestic ? 'KR' : 'US');
      addInput('cardquota', '00');
      addInput('replycode', '');
      addInput('replyMsg', '');
      addInput('tid', '');
      addInput('cardauthcode', '');
      addInput('cardtype', '');
      addInput('cardnumber', '');

      if (user) {
        addInput('receipttoname', `${user.firstName || ''} ${user.lastName || ''}`.trim());
        addInput('receipttoemail', user.email);
      }

      document.body.appendChild(form);
      (window as any).doTransaction(form);
    } else {
      setPgError("Payment module is not loaded. Please refresh the page and try again.");
    }
  };

  const serverErrMsg = serverError
    ? ((serverError as { response?: { data?: { message?: string } } })?.response?.data?.message
      ?? 'An error occurred during payment processing.')
    : null;
  const errMsg = pgError ?? serverErrMsg;

  return (
    <>
      <div className="grid grid-cols-1 gap-0 lg:grid-cols-[1fr_300px]">
        <div className="border-b border-slate-100 p-6 lg:border-b-0 lg:border-r">

          {/* Registrant quick summary */}
          {user && (
            <div className="mb-5 rounded-lg border border-slate-100 bg-slate-50/60 p-4">
              <p className="label-section text-sm mb-3">
                Confirming Payment For
              </p>
              <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                {[
                  ['Name', `${user.firstName || ''} ${user.lastName || ''}`.trim() || '-'],
                  ['Affiliation', user.affiliation || '-'],
                  ['Email', user.email],
                  ['Country', user.country || '-'],
                ].map(([label, val]) => (
                  <div key={label} className="flex justify-between">
                    <span className="text-ink-faint">{label}</span>
                    <span className="font-medium text-ink">{val}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Payment Method Selector */}
          <div className="mb-5 rounded-lg border border-slate-200 bg-white p-4 space-y-3">
            <p className="label-section text-sm mb-1">
              Payment Method
            </p>
            
            <div className="space-y-2.5">
              {/* Card option */}
              <label className="flex items-start gap-3 cursor-pointer p-2.5 rounded-lg border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition">
                <input
                  type="radio"
                  name="paymentMethodSelector"
                  checked={paymentMethod === 'card'}
                  onChange={() => setPaymentMethod('card')}
                  className="mt-1 h-4 w-4 border-slate-350 text-gold focus:ring-gold"
                />
                <div className="-mt-0.5">
                  <p className="text-sm font-semibold text-ink">Credit / Debit card</p>
                  <p className="text-xs text-ink-faint mt-0.5">
                    {domestic ? 'Domestic card payment (KRW)' : 'International card payment (KRW)'}
                  </p>
                </div>
              </label>

              {/* Bank transfer option */}
              <label className="flex items-start gap-3 cursor-pointer p-2.5 rounded-lg border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition">
                <input
                  type="radio"
                  name="paymentMethodSelector"
                  checked={paymentMethod === 'bank'}
                  onChange={() => setPaymentMethod('bank')}
                  className="mt-1 h-4 w-4 border-slate-350 text-gold focus:ring-gold"
                />
                <div className="-mt-0.5">
                  <p className="text-sm font-semibold text-ink">Bank transfer</p>
                  <p className="text-xs text-ink-faint mt-0.5">
                    Direct bank remittance via invoice details
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* Bank transfer notice */}
          {paymentMethod === 'bank' && (
            <div className="mb-5 rounded-lg border border-amber-200 bg-amber-50 p-4 animate-fadeIn">
              <div className="flex items-center gap-2 mb-2">
                <svg
                  className="h-4 w-4 flex-shrink-0 text-amber-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
                  />
                </svg>
                <p className="text-sm font-semibold text-amber-800">
                  Notice for Registration Payment
                </p>
              </div>
              <div className="space-y-2 text-xs leading-relaxed text-amber-805">
                <p>
                  Currently, our online registration system only accepts Credit Card payments.
                </p>
                <p>
                  If you prefer to pay via Bank Transfer, please do not proceed with the online
                  payment. Instead, kindly contact the Secretariat directly at{' '}
                  <span className="font-bold text-amber-900">iabse2026@kibse.or.kr</span> with
                  your registration details. We will provide you with the official invoice and
                  bank account details required for the transfer.
                </p>
                <p>
                  <span className="font-bold">Note:</span> Any bank remittance fees incurred
                  during the wire transfer must be covered by the participant.
                </p>
              </div>
            </div>
          )}

          {/* Discount Code Input Box */}
          <div className="mb-5 rounded-lg border border-slate-200 bg-white p-4 space-y-3">
            <p className="label-section text-sm mb-1">Discount Code</p>
            <div className="flex gap-2">
              <input
                type="text"
                value={discountCodeInput}
                onChange={(e) => setDiscountCodeInput(e.target.value.toUpperCase())}
                placeholder="Enter discount code..."
                disabled={appliedCodeEntity !== null || verifyingCode}
                className="input-base flex-1 uppercase font-mono text-slate-800"
              />
              {appliedCodeEntity ? (
                <button
                  type="button"
                  onClick={() => {
                    setAppliedCodeEntity(null);
                    setDiscountCodeInput('');
                  }}
                  className="px-4 py-2 border border-red-200 text-red-650 hover:bg-red-50 text-xs font-semibold rounded-lg transition"
                >
                  Remove
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleApplyDiscountCode}
                  disabled={verifyingCode || !discountCodeInput.trim()}
                  className="px-4 py-2 bg-teal-500 hover:bg-teal-600 disabled:bg-slate-200 disabled:text-slate-400 text-white text-xs font-semibold rounded-lg transition"
                >
                  {verifyingCode ? 'Applying...' : 'Apply'}
                </button>
              )}
            </div>
            {discountError && (
              <p className="text-xs text-red-650 font-medium mt-1">{discountError}</p>
            )}
            {appliedCodeEntity && (
              <div className="p-3 bg-teal-50/50 border border-teal-100 rounded-lg space-y-1.5 text-xs text-teal-800 animate-fadeIn">
                <p className="font-bold">✓ Discount Code '{appliedCodeEntity.code}' applied successfully.</p>
                <div className="space-y-0.5 text-slate-650 font-medium">
                  {discountBreakdown.regDiscount > 0 && (
                    <p>- Registration Discount: <span className="text-teal-700 font-bold">-{formatKRW(discountBreakdown.regDiscount)}</span></p>
                  )}
                  {discountBreakdown.galaDiscount > 0 && (
                    <p>- Gala Dinner Discount: <span className="text-teal-700 font-bold">-{formatKRW(discountBreakdown.galaDiscount)}</span></p>
                  )}
                  {discountBreakdown.accompDiscount > 0 && (
                    <p>- Accompanying Person Discount: <span className="text-teal-700 font-bold">-{formatKRW(discountBreakdown.accompDiscount)}</span></p>
                  )}
                  {discountBreakdown.tourDiscount > 0 && (
                    <p>- Technical Tour Discount: <span className="text-teal-700 font-bold">-{formatKRW(discountBreakdown.tourDiscount)}</span></p>
                  )}
                  <p className="border-t border-teal-100 pt-1 font-bold text-teal-800 flex justify-between">
                    <span>Total Discount:</span>
                    <span>-{formatKRW(discountBreakdown.totalDiscount)}</span>
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Cancellation & Refund Policy */}
          <div className="mb-5 rounded-lg border border-slate-200 bg-white p-4">
            <p className="label-section text-sm mb-2">Cancellation &amp; Refund Policy</p>
            <div className="rounded-md border border-slate-100 bg-slate-50/60 p-3 text-xs leading-relaxed text-ink-muted space-y-3">
              <div>
                <p className="font-bold text-sm text-ink mb-1.5">Terms and Conditions</p>
                <p className="text-ink-muted mb-2 font-medium">You have accepted below terms and conditions:</p>
                
                <div className="space-y-3.5 pl-0.5">
                  <div>
                    <p className="font-bold text-ink mb-1">Registration Terms and Conditions</p>
                    <ul className="list-disc pl-4 space-y-1.5 text-ink-muted">
                      <li>
                        All registration fees are quoted and will be charged in Korean Won (KRW). Registration fees are exempt from standard administrative fees.
                      </li>
                      <li>
                        Bank charges and currency exchange fees are at the delegate's own expense. These should be factored in when transferring funds to ensure the full registration fee is received in the congress bank account.
                      </li>
                    </ul>
                  </div>

                  <div>
                    <p className="font-bold text-ink mb-1">Registration Cancellation Terms &amp; Conditions</p>
                    <ul className="list-disc pl-4 space-y-1.5 text-ink-muted">
                      <li>
                        Notice of cancellation must be sent by email to the Congress Secretariat.
                      </li>
                      <li>
                        Cancellations made during the Early Bird period (until 30 June 2026) will be refunded in full, Please note that all payment processing fees (bank transfer charges and credit card transaction fees) are the responsibility of the participant and will be strictly deducted from the final refund amount. For cancellations received between 1 July and 26 August 2026, a refund of 30% will apply. After this date, no refunds will be made.
                      </li>
                      <li>
                        If you are unable to attend, you may transfer your registration to a colleague. Name changes are free of charge. All requests for changes must be submitted in writing to the Congress Secretariat.
                      </li>
                      <li>
                        No-shows will not receive a refund. As per the terms and conditions accepted during registration, participants who do not attend the Congress remain fully responsible for any outstanding balances.
                      </li>
                      <li>
                        Please allow up to 4 weeks for the processing of any refunds.
                      </li>
                    </ul>
                  </div>

                  <div>
                    <p className="font-bold text-ink mb-1">Insurance</p>
                    <ul className="list-disc pl-4 space-y-1.5 text-ink-muted">
                      <li>
                        Participants are highly advised to arrange their own personal travel and health insurance. Neither the Organizers nor the Congress Secretariat will assume any responsibility whatsoever for non-refundable payments in the event of cancellation prior to arrival, or for any damage or injury to persons or property during the Congress.
                      </li>
                    </ul>
                  </div>

                  <div className="mt-3.5 border-t border-slate-100 pt-3.5">
                    <p className="font-bold text-ink mb-1.5">Disclaimer</p>
                    <div className="space-y-2 text-ink-muted">
                      <p>
                        (1) The IABSE Congress Incheon 2026 Secretariat reserves the right to cancel, postpone, modify the schedule, or change the venue of the Congress without prior notice due to force majeure, including but not limited to natural disasters, pandemics (such as COVID-19), government restrictions, or other unforeseen circumstances.
                      </p>
                      <p>
                        (2) If such an event occurs before the Congress begins, the Secretariat will refund any received registration fees, minus applicable costs. If electronic proceedings are being prepared for registered participants at the time of cancellation, refunds will be issued minus the costs of production, packaging, and shipping.
                      </p>
                      <p>
                        (3) The IABSE Congress Incheon 2026 Secretariat is not responsible for any additional expenses incurred by participants, such as airfare, accommodation, or other costs. These remain the responsibility of the participant and their respective service providers.
                      </p>
                      <div>
                        <p>(4) If a force majeure event occurs:</p>
                        <ul className="list-disc pl-4 mt-1 space-y-1">
                          <li>During the Congress: No refunds will be issued.</li>
                          <li>Before the Congress, preventing it from taking place: Registration fees will be refunded in principle. However, if a postponement, schedule modification, or venue change prevents a participant from attending, they may request a refund.</li>
                        </ul>
                      </div>
                      <p>
                        (5) If cancellation is due to COVID-19-related travel bans (or flu or other contagious illnesses) or quarantine requirements, the Secretariat will assess refund requests on a case-by-case basis, considering official regulations in effect at the time.
                      </p>
                      <p>
                        (6) The IABSE Congress Incheon 2026 Secretariat is not liable for damages or compensation beyond the registration fee refund outlined in point (2).
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <label className="mt-3 flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={policyAgreed}
                onChange={(e) => setPolicyAgreed(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-gold focus:ring-gold"
              />
              <span className="text-sm font-medium text-ink">
                I have read and agree to the Cancellation and Refund Policy.
              </span>
            </label>
          </div>

          {errMsg && (
            <div className="mt-2">
              <ErrorBanner message={errMsg} />
              <p className="mt-1.5 text-center text-xs text-ink-faint">
                Please check your payment details and click <strong>Confirm &amp; Pay</strong> to try again.
              </p>
            </div>
          )}
        </div>

        {/* Right sidebar */}
        <div className="bg-gold-tint p-6">
          <SectionLabel>Payment Total</SectionLabel>
          {user && (
            <div className="mb-4 flex items-center gap-3 rounded-lg border border-gold-soft bg-white p-3">
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-gold-soft text-xs font-semibold text-gold">
                {user.firstName?.charAt(0) || user.email.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-ink truncate">{`${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email}</p>
                <p className="text-xs text-ink-faint truncate">{user.affiliation || '-'}</p>
              </div>
            </div>
          )}

          <div className="mb-5 border border-gold-soft rounded-lg bg-white p-4">
            <div className="flex justify-between items-baseline text-xs text-slate-500 font-medium">
              <span>Subtotal</span>
              <span className="font-mono">{formatKRW(totalAmount)}</span>
            </div>
            {discountBreakdown.totalDiscount > 0 && (
              <div className="flex justify-between items-baseline text-xs text-teal-600 font-semibold mt-1">
                <span>Discount</span>
                <span className="font-mono">-{formatKRW(discountBreakdown.totalDiscount)}</span>
              </div>
            )}
            <div className="border-t border-slate-100 mt-2 pt-2 flex justify-between items-baseline">
              <span className="label-section text-sm">Total</span>
              <span className="amount-total">{formatKRW(finalPaidAmount)}</span>
            </div>
            {!domestic && (
              <p className="mt-1 text-right text-sm text-ink-faint">
                ≈ KRW {unitprice.toLocaleString()}
              </p>
            )}
          </div>

          {paymentMethod === 'bank' ? (
            /* Bank transfer disabled block */
            <div className="space-y-2">
              <p className="text-center text-[11px] text-amber-600 font-semibold leading-relaxed bg-amber-50 rounded-lg p-2.5 border border-amber-100">
                Please refer to the Bank Transfer notice box on the left and contact us via email.
              </p>
              <button
                disabled
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-slate-200 py-2.5 text-sm font-semibold text-slate-400 cursor-not-allowed border border-slate-300"
              >
                Bank Transfer Selected
              </button>
            </div>
          ) : (
            /* Card payment block */
            <>
              {!policyAgreed && (
                <p className="mb-2 text-center text-[11px] text-ink-faint">
                  Please agree to the Cancellation and Refund Policy to continue.
                </p>
              )}
              <button
                onClick={handlePay}
                disabled={isPending || isSubmitting || !policyAgreed}
                className="mb-2 flex w-full items-center justify-center gap-2 rounded-lg bg-gold py-2.5 text-sm font-semibold text-white transition hover:bg-gold-hover active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-gold-soft disabled:text-gold"
              >
                {(isPending || isSubmitting) && <LoadingSpinner size="sm" />}
                {isPending ? 'Processing…' : isSubmitting ? 'Opening payment window…' : (finalPaidAmount === 0 ? 'Complete Registration' : 'Confirm & Pay')}
              </button>
            </>
          )}
          <button
            onClick={onBack}
            className="w-full rounded-lg border border-slate-200 py-2 text-sm text-ink-muted transition hover:bg-slate-50"
          >
            Back to Summary
          </button>
          <div className="mt-3 flex items-center justify-center gap-1.5 text-[10px] uppercase tracking-[0.1em] text-ink-faint">
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0110 0v4" />
            </svg>
            SSL Encrypted · PCI-DSS Secure
          </div>
          {user && (
            <p className="mt-2 text-center text-[11px] text-ink-faint">
              A receipt will be sent to {user.email} after payment.
            </p>
          )}
        </div>
      </div>

      <div id="PGIOscreen" className="mt-4 w-full flex justify-center"></div>
    </>
  );
};

// ─── Step 4: Completion Screen ────────────────────────────────────────────────
interface Step4CompleteProps {
  result: PaymentResponse;
  onGoHistory: () => void;
}

export const Step4Complete = ({ result, onGoHistory }: Step4CompleteProps) => (
  <div className="grid grid-cols-1 gap-6 p-8 lg:grid-cols-[1fr_320px]">
    <div className="flex flex-col justify-center">
      <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-gold-soft">
        <svg className="h-7 w-7 text-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
        </svg>
      </div>
      <h2 className="mb-2 text-2xl font-semibold text-ink">Thank You for Registering</h2>
      <p className="mb-6 text-sm text-ink-muted leading-relaxed">
        Thank you for registering for the IABSE Congress Incheon 2026. Once your payment is fully processed, you will receive a confirmation email containing your registration details and a receipt. We look forward to seeing you in Incheon.
      </p>
      <div className="flex gap-3">
        <button
          onClick={onGoHistory}
          className="rounded-lg border border-slate-200 px-5 py-2 text-sm text-ink-muted transition hover:border-gold/40 hover:text-ink"
        >
          View Payment History
        </button>
      </div>
    </div>

    <div className="rounded-xl border border-gold-soft bg-gold-tint p-5">
      <SectionLabel>Registration Confirmation</SectionLabel>
      <div className="mb-4 space-y-2.5">
        <div className="flex justify-between text-sm">
          <span className="text-ink-faint">Registration No.</span>
          <span className="font-mono font-semibold text-gold">{result.registrationNumber}</span>
        </div>
        {[
          ['Name', `${result.firstName} ${result.lastName}`],
          ['Affiliation', result.affiliation],
          ['Email', result.email],
          ['Paid At', result.paidAt ?? '-'],
        ].map(([label, val]) => (
          <div key={label} className="flex justify-between text-sm">
            <span className="text-ink-faint">{label}</span>
            <span className="font-medium text-ink text-right">{val}</span>
          </div>
        ))}
      </div>
      <div className="border-t border-gold-soft pt-3">
        {result.selectedOptions.map((opt) => (
          <div key={opt.id} className="mb-1.5 flex justify-between text-xs">
            <span className="text-ink-muted">{opt.nameEn}</span>
            <span className="text-ink">{opt.id === INVITATION_OPTION_ID ? '' : (opt.isFree ? 'Free' : formatKRW(opt.price))}</span>
          </div>
        ))}
        {result.accompanyingPersons && result.accompanyingPersons.length > 0 && (
          <div className="space-y-1 mt-1.5 border-t border-gold-soft pt-1.5">
            <span className="text-[10px] text-ink-faint block">Accompanying Persons:</span>
            {result.accompanyingPersons.map((p, idx) => (
              <div key={idx} className="flex justify-between text-xs text-ink-muted pl-2">
                <span>- {p.firstName} {p.lastName}</span>
              </div>
            ))}
          </div>
        )}
        {result.exhibitorBadges && result.exhibitorBadges.length > 0 && (
          <div className="space-y-1 mt-1.5 border-t border-gold-soft pt-1.5">
            <span className="text-[10px] text-ink-faint block">Exhibitors:</span>
            {result.exhibitorBadges.map((e, idx) => (
              <div key={idx} className="flex justify-between text-xs text-ink-muted pl-2">
                <span>- {e.firstName} {e.lastName}</span>
              </div>
            ))}
          </div>
        )}
        <div className="mt-2 flex justify-between items-baseline border-t border-gold-soft pt-2">
          <span className="label-section">Total</span>
          <span className="amount-total">{formatKRW(result.totalAmount)}</span>
        </div>
      </div>
    </div>
  </div>
);
