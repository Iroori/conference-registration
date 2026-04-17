import { useEffect, useState } from 'react';
import { useCreatePayment } from '../hooks/useRegistration';
import { useAuth } from '../context/AuthContext';
import { ErrorBanner, LoadingSpinner, SectionLabel, MemberTypePill, formatKRW } from './Shared';
import { apiReportPaymentFailure } from '../lib/api';
import type { MemberType, PaymentResponse } from '../types';

interface Step3PaymentProps {
  memberType: MemberType;
  selectedOptionIds: string[];
  quantities: Record<string, number>;
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
  totalAmount,
  onComplete,
  onBack,
}: Step3PaymentProps) => {
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const domestic = isKoreanUser(user?.country);
  const mid = domestic
    ? (import.meta.env.VITE_PAYGATE_MID_DOMESTIC || 'paygatekr')
    : (import.meta.env.VITE_PAYGATE_MID_OVERSEAS || 'paygateoverseaskr');
  // 통화 및 금액: 해외 MID의 통화·환율 변환은 PayGate가 자체 처리 — 항상 KRW(WON) 원화 금액 전달
  const goodcurrency = 'WON';
  const unitprice = totalAmount;

  const { mutate: createPayment, isPending, error } = useCreatePayment();

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
            replycode: replycode
          },
          { onSuccess: (result) => onComplete(result) }
        );
      } else {
        // 서버로 실패 이벤트 전송 (추적용)
        apiReportPaymentFailure({
          replycode,
          replyMsg,
          tid: (form.elements.namedItem('tid') as HTMLInputElement)?.value || undefined,
        });
        alert(`Payment failed: [${replycode}] ${replyMsg}`);
      }
    };
  }, [createPayment, selectedOptionIds, quantities, onComplete]);

  const handlePay = () => {
    if (isSubmitting) return; // 중복 클릭 방지
    if (typeof (window as any).doTransaction === 'function') {
      const form = document.forms.namedItem('PGIOForm');
      if (form) {
        setIsSubmitting(true);
        (window as any).doTransaction(form);
      }
    } else {
      alert("Payment module is not loaded completely. Please refresh and try again.");
    }
  };

  const errMsg = error
    ? ((error as { response?: { data?: { message?: string } } })?.response?.data?.message
      ?? 'An error occurred during payment processing.')
    : null;

  return (
    <>
      <div className="grid grid-cols-1 gap-0 lg:grid-cols-[1fr_300px]">
        <div className="border-b border-slate-100 p-6 lg:border-b-0 lg:border-r">

          {/* Registrant quick summary */}
          {user && (
            <div className="mb-5 rounded-lg border border-slate-100 bg-slate-50/60 p-4">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                Confirming Payment For
              </p>
              <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-xs">
                {[
                  ['Name', user.nameEn],
                  ['Affiliation', user.affiliation],
                  ['Email', user.email],
                  ['Country', user.country],
                ].map(([label, val]) => (
                  <div key={label} className="flex justify-between">
                    <span className="text-slate-400">{label}</span>
                    <span className="font-medium text-slate-700">{val}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Payment method info */}
          <div className="mb-5 rounded-lg border border-slate-200 bg-white p-4">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
              Payment Method
            </p>
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-teal-100">
                <svg className="h-4 w-4 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
                  <line x1="1" y1="10" x2="23" y2="10" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-700">Credit / Debit Card</p>
                <p className="text-xs text-slate-400">
                  {domestic ? 'Domestic card payment (KRW)' : 'International card payment (USD)'}
                </p>
              </div>
            </div>
          </div>

          {errMsg && <ErrorBanner message={errMsg} />}
        </div>

        {/* Right sidebar */}
        <div className="bg-teal-50/40 p-6">
          <SectionLabel>Payment Total</SectionLabel>
          {user && (
            <div className="mb-4 flex items-center gap-3 rounded-lg border border-teal-100 bg-white p-3">
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-teal-100 text-xs font-semibold text-teal-700">
                {user.nameEn.charAt(0)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-slate-800 truncate">{user.nameEn}</p>
                <p className="text-xs text-slate-400 truncate">{user.affiliation}</p>
              </div>
              <MemberTypePill type={memberType} />
            </div>
          )}

          <div className="mb-5 border border-teal-100 rounded-lg bg-white p-4">
            <div className="flex justify-between items-center">
              <span className="text-sm font-semibold text-slate-700">Total (incl. VAT)</span>
              <span className="text-xl font-bold text-teal-600">{formatKRW(totalAmount)}</span>
            </div>
            {!domestic && (
              <p className="mt-1 text-right text-xs text-slate-400">
                ≈ USD {unitprice.toLocaleString()}
              </p>
            )}
          </div>

          <button
            onClick={handlePay}
            disabled={isPending}
            className="mb-2 flex w-full items-center justify-center gap-2 rounded-lg bg-teal-500 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-600 active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-teal-300"
          >
            {isPending && <LoadingSpinner size="sm" />}
            {isPending ? 'Processing…' : 'Confirm & Pay'}
          </button>
          <button
            onClick={onBack}
            className="w-full rounded-lg border border-slate-200 py-2 text-sm text-slate-500 transition hover:bg-slate-50"
          >
            Back to Summary
          </button>
          <div className="mt-3 flex items-center justify-center gap-1.5 text-xs text-slate-400">
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0110 0v4" />
            </svg>
            SSL Encrypted · PCI-DSS Secure
          </div>
          {user && (
            <p className="mt-2 text-center text-xs text-slate-400">
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
            <input type="hidden" name="receipttoname" value={user.nameEn} />
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
      <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-teal-100">
        <svg className="h-7 w-7 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
        </svg>
      </div>
      <h2 className="mb-2 text-2xl font-semibold text-slate-800">Thank You for Registering</h2>
      <p className="mb-6 text-sm text-slate-600 leading-relaxed">
        Thank you for registering for the IABSE Congress Incheon 2026. Once your payment is fully processed, you will receive a confirmation email containing your registration details and a receipt. We look forward to seeing you in Incheon.
      </p>
      <div className="flex gap-3">
        <button
          onClick={onGoHistory}
          className="rounded-lg border border-slate-200 px-5 py-2 text-sm text-slate-600 transition hover:bg-slate-50"
        >
          View Payment History
        </button>
      </div>
    </div>

    <div className="rounded-xl border border-teal-100 bg-teal-50/50 p-5">
      <SectionLabel>Registration Confirmation</SectionLabel>
      <div className="mb-4 space-y-2.5">
        <div className="flex justify-between text-sm">
          <span className="text-slate-400">Registration No.</span>
          <span className="font-mono font-semibold text-teal-700">{result.registrationNumber}</span>
        </div>
        {[
          ['Name', result.nameEn],
          ['Affiliation', result.affiliation],
          ['Email', result.email],
          ['Paid At', result.paidAt ?? '-'],
        ].map(([label, val]) => (
          <div key={label} className="flex justify-between text-sm">
            <span className="text-slate-400">{label}</span>
            <span className="font-medium text-slate-700 text-right">{val}</span>
          </div>
        ))}
      </div>
      <div className="border-t border-teal-100 pt-3">
        {result.selectedOptions.map((opt) => (
          <div key={opt.id} className="mb-1.5 flex justify-between text-xs">
            <span className="text-slate-500">{opt.nameEn}</span>
            <span className="text-slate-600">{opt.isFree ? 'Free' : formatKRW(opt.price)}</span>
          </div>
        ))}
        <div className="mt-2 flex justify-between border-t border-teal-100 pt-2">
          <span className="text-sm font-semibold text-slate-700">Total</span>
          <span className="text-base font-bold text-teal-600">{formatKRW(result.totalAmount)}</span>
        </div>
      </div>
    </div>
  </div>
);
