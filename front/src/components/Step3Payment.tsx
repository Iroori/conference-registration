import { useEffect, useState } from 'react';
import { useCreatePayment } from '../hooks/useRegistration';
import { useAuth } from '../context/AuthContext';
import { ErrorBanner, LoadingSpinner, SectionLabel, MemberTypePill, formatKRW } from './Shared';
import { apiReportPaymentFailure } from '../lib/api';
import type { MemberType, PaymentResponse, AccompanyingPersonInfo } from '../types';
import { isAccompanyingOption } from '../types';

interface Step3PaymentProps {
  memberType: MemberType;
  selectedOptionIds: string[];
  quantities: Record<string, number>;
  accompanyingPerson: AccompanyingPersonInfo;
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
  memberType,
  selectedOptionIds,
  quantities,
  accompanyingPerson,
  totalAmount,
  onComplete,
  onBack,
}: Step3PaymentProps) => {
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pgError, setPgError] = useState<string | null>(null);
  const [policyAgreed, setPolicyAgreed] = useState(false);

  const domestic = isKoreanUser(user?.country);
  const mid = domestic
    ? (import.meta.env.VITE_PAYGATE_MID_DOMESTIC || 'kibse')
    : (import.meta.env.VITE_PAYGATE_MID_OVERSEAS || 'kibse0us');
  // 통화 및 금액: 해외 MID의 통화·환율 변환은 PayGate가 자체 처리 — 항상 KRW(WON) 원화 금액 전달
  const goodcurrency = 'WON';
  const unitprice = totalAmount;

  const { mutate: createPayment, isPending, error: serverError } = useCreatePayment();

  useEffect(() => {
    (window as any).getPGIOresult = () => {
      const form = document.forms.namedItem('PGIOForm') as HTMLFormElement;
      if (!form) return;
      const replycode = (form.elements.namedItem('replycode') as HTMLInputElement)?.value;
      const replyMsg = (form.elements.namedItem('replyMsg') as HTMLInputElement)?.value;

      // 0000: 상용 결제 성공, NPS016: 데모 거래 성공 알림코드
      if (replycode === "0000" || replycode === "NPS000" || replycode === "NPS016") {
        const needsAccompanying = selectedOptionIds.some(isAccompanyingOption);
        createPayment(
          {
            selectedOptionIds,
            quantities: Object.keys(quantities).length > 0 ? quantities : undefined,
            paymentMethod: 'CARD',
            tid: (form.elements.namedItem('tid') as HTMLInputElement)?.value,
            replycode: replycode,
            accompanyingPerson: needsAccompanying ? accompanyingPerson : undefined,
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
  }, [createPayment, selectedOptionIds, quantities, accompanyingPerson, onComplete]);

  const handlePay = () => {
    if (isSubmitting || isPending) return;
    if (!policyAgreed) {
      setPgError('Please agree to the Cancellation and Refund Policy before proceeding.');
      return;
    }
    setPgError(null); // 이전 에러 초기화
    if (typeof (window as any).doTransaction === 'function') {
      const form = document.forms.namedItem('PGIOForm');
      if (form) {
        setIsSubmitting(true);
        (window as any).doTransaction(form);
      }
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
              <p className="label-section mb-3">
                Confirming Payment For
              </p>
              <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-xs">
                {[
                  ['Name', `${user.firstName} ${user.lastName}`],
                  ['Affiliation', user.affiliation],
                  ['Email', user.email],
                  ['Country', user.country],
                ].map(([label, val]) => (
                  <div key={label} className="flex justify-between">
                    <span className="text-ink-faint">{label}</span>
                    <span className="font-medium text-ink">{val}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Payment method info */}
          <div className="mb-5 rounded-lg border border-slate-200 bg-white p-4">
            <p className="label-section mb-3">
              Payment Method
            </p>
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-gold-soft">
                <svg className="h-4 w-4 text-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
                  <line x1="1" y1="10" x2="23" y2="10" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-ink">Credit / Debit Card</p>
                <p className="text-xs text-ink-faint">
                  {domestic ? 'Domestic card payment (KRW)' : 'International card payment (USD)'}
                </p>
              </div>
            </div>
          </div>

          {/* Cancellation & Refund Policy */}
          <div className="mb-5 rounded-lg border border-slate-200 bg-white p-4">
            <p className="label-section mb-2">Cancellation &amp; Refund Policy</p>
            <div className="max-h-56 overflow-y-auto rounded-md border border-slate-100 bg-slate-50/60 p-3 text-[11px] leading-relaxed text-ink-muted space-y-2.5">
              <div>
                <p className="font-semibold text-ink">1. How to Request a Cancellation</p>
                <p>
                  All cancellation requests must be submitted in writing via email to the
                  Secretariat at iabse2026@kibse.or.kr.
                </p>
                <p>
                  Please note that cancellations cannot be processed automatically through
                  the registration website, and requests made by phone will not be accepted.
                  The official date of your cancellation will be recorded as the date the
                  written request is received by the Secretariat.
                </p>
              </div>
              <div>
                <p className="font-semibold text-ink">2. General Refund Policy</p>
                <p>
                  Refunds will be granted based on the date of receipt of the written
                  cancellation request. The following cancellation schedule applies:
                </p>
                <ul className="list-disc ml-4 space-y-1">
                  <li>
                    On or before the Early Bird Registration Deadline (30 June): 100% refund
                    of the registration fee. Please note that all payment processing fees
                    (bank transfer charges and credit card transaction fees) are the
                    responsibility of the participant and will be strictly deducted from the
                    final refund amount.
                  </li>
                  <li>
                    During the Regular Registration Period (From 1 July to 26 August): 50%
                    refund of the registration fee.
                  </li>
                  <li>
                    After the Regular Registration Deadline (27 August) and No-shows: No
                    refunds will be issued under any circumstances.
                  </li>
                </ul>
              </div>
              <div>
                <p className="font-semibold text-ink">3. Refund Processing</p>
                <p>
                  <span className="font-medium text-ink">Confirmation:</span> Upon receiving
                  your cancellation request, the Secretariat will send a confirmation email
                  detailing your cancellation status and the expected refund amount.
                </p>
                <p>
                  <span className="font-medium text-ink">Processing Timeline:</span> To ensure
                  accuracy, all approved refunds will be processed in a single batch within
                  30 to 60 days after the official conclusion of the IABSE Congress Incheon
                  2026.
                </p>
                <p>
                  <span className="font-medium text-ink">Deductions:</span> Please be aware
                  that any bank transfer charges, credit card processing fees, or currency
                  exchange differences incurred during the transaction will be strictly
                  deducted from the final refund amount.
                </p>
                <p>
                  <span className="font-medium text-ink">Payment Method:</span> Refunds will
                  be issued using the same payment method originally used during the
                  registration process. If the original payment method is unavailable,
                  alternative arrangements will be coordinated via email.
                </p>
              </div>
            </div>
            <label className="mt-3 flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={policyAgreed}
                onChange={(e) => setPolicyAgreed(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-gold focus:ring-gold"
              />
              <span className="text-xs font-medium text-ink">
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
                {user.firstName?.charAt(0) ?? '?'}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-ink truncate">{`${user.firstName} ${user.lastName}`}</p>
                <p className="text-xs text-ink-faint truncate">{user.affiliation}</p>
              </div>
              <MemberTypePill type={memberType} />
            </div>
          )}

          <div className="mb-5 border border-gold-soft rounded-lg bg-white p-4">
            <div className="flex justify-between items-baseline">
              <span className="label-section">Total (incl. VAT)</span>
              <span className="amount-total">{formatKRW(totalAmount)}</span>
            </div>
            {!domestic && (
              <p className="mt-1 text-right text-xs text-ink-faint">
                ≈ USD {unitprice.toLocaleString()}
              </p>
            )}
          </div>

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
            {isPending ? 'Processing…' : isSubmitting ? 'Opening payment window…' : 'Confirm & Pay'}
          </button>
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
      <form name="PGIOForm" style={{ display: 'none' }}>
        <input type="hidden" name="mid" value={mid} />
        <input type="hidden" name="paymethod" value={import.meta.env.VITE_PAYGATE_METHOD || 'card'} />
        <input type="hidden" name="goodname" value="IABSE 2026 Registration" />
        <input type="hidden" name="unitprice" value={unitprice} />
        <input type="hidden" name="goodcurrency" value={goodcurrency} />
        <input type="hidden" name="langcode" value="KR" />
        <input type="hidden" name="cardquota" value="00" />
        <input type="hidden" name="replycode" value="" />
        <input type="hidden" name="replyMsg" value="" />
        <input type="hidden" name="tid" value="" />
        <input type="hidden" name="cardauthcode" value="" />
        <input type="hidden" name="cardtype" value="" />
        <input type="hidden" name="cardnumber" value="" />
        {user && (
          <>
            <input type="hidden" name="receipttoname" value={`${user.firstName} ${user.lastName}`} />
            <input type="hidden" name="receipttoemail" value={user.email} />
          </>
        )}
      </form>
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
            <span className="text-ink">{opt.isFree ? 'Free' : formatKRW(opt.price)}</span>
          </div>
        ))}
        {result.accompanyingPerson && (
          <div className="mb-1.5 flex justify-between text-xs">
            <span className="text-ink-muted">Accompanying Person</span>
            <span className="text-ink">
              {result.accompanyingPerson.firstName} {result.accompanyingPerson.lastName}
            </span>
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
