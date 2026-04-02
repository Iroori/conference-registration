import { useState, useEffect } from 'react';
import { useCreatePayment } from '../hooks/useRegistration';
import { useAuth } from '../context/AuthContext';
import { ErrorBanner, LoadingSpinner, SectionLabel, MemberTypePill, formatKRW } from './Shared';
import type { MemberType, PaymentMethod, PaymentResponse } from '../types';

interface Step3PaymentProps {
  memberType: MemberType;
  selectedOptionIds: string[];
  quantities: Record<string, number>;
  totalAmount: number;
  onComplete: (result: PaymentResponse) => void;
  onBack: () => void;
}

type PaymentRegion = 'DOMESTIC' | 'OVERSEAS';

const REGION_OPTIONS = [
  {
    id: 'DOMESTIC' as PaymentRegion,
    label: 'Domestic Payment',
    desc: 'Card · Bank Transfer · KakaoPay · Instant approval',
  },
  {
    id: 'OVERSEAS' as PaymentRegion,
    label: 'International Payment',
    desc: 'Visa · Mastercard · PayPal · Processing may take time',
  },
];

const METHOD_OPTIONS: { id: PaymentMethod; label: string; desc: string; region: PaymentRegion[] }[] = [
  { id: 'CARD', label: 'Credit / Debit Card', desc: 'Domestic cards accepted', region: ['DOMESTIC'] },
  { id: 'KAKAO_PAY', label: 'KakaoPay', desc: 'QR code or app link', region: ['DOMESTIC'] },
  { id: 'BANK_TRANSFER', label: 'Bank Transfer', desc: 'Real-time transfer', region: ['DOMESTIC'] },
  { id: 'PAYPAL', label: 'PayPal / International Card', desc: 'USD · EUR supported', region: ['OVERSEAS'] },
];

export const Step3Payment = ({
  memberType,
  selectedOptionIds,
  quantities,
  totalAmount,
  onComplete,
  onBack,
}: Step3PaymentProps) => {
  const { user } = useAuth();
  const [region, setRegion] = useState<PaymentRegion>('DOMESTIC');
  const [method, setMethod] = useState<PaymentMethod>('CARD');

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
            paymentMethod: method,
            tid: (form.elements.namedItem('tid') as HTMLInputElement)?.value,
            replycode: replycode
          },
          { onSuccess: (result) => onComplete(result) }
        );
      } else {
        alert(`Payment failed: [${replycode}] ${replyMsg}`);
      }
    };
  }, [createPayment, selectedOptionIds, quantities, method, onComplete]);

  const handlePay = () => {
    if (typeof (window as any).doTransaction === 'function') {
      const form = document.forms.namedItem('PGIOForm');
      if (form) {
        (window as any).doTransaction(form);
      }
    } else {
      alert("Payment module is not loaded completely. Please refresh and try again.");
    }
  };

  const availableMethods = METHOD_OPTIONS.filter((m) => m.region.includes(region));
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
                ].map(([label, val]) => (
                  <div key={label} className="flex justify-between">
                    <span className="text-slate-400">{label}</span>
                    <span className="font-medium text-slate-700">{val}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Payment region */}
          <div className="mb-5">
            <SectionLabel>Payment Region</SectionLabel>
            <div className="grid grid-cols-2 gap-2">
              {REGION_OPTIONS.map((r) => (
                <button
                  key={r.id}
                  onClick={() => {
                    setRegion(r.id);
                    setMethod(r.id === 'DOMESTIC' ? 'CARD' : 'PAYPAL');
                  }}
                  className={`rounded-lg border p-3 text-left transition ${region === r.id
                    ? 'border-teal-400 bg-teal-50 ring-1 ring-teal-200'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                >
                  <p className={`text-xs font-semibold ${region === r.id ? 'text-teal-700' : 'text-slate-600'}`}>
                    {r.label}
                  </p>
                  <p className="mt-0.5 text-[10px] text-slate-400">{r.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Payment method */}
          <div className="mb-4">
            <SectionLabel>Payment Method</SectionLabel>
            <div className="grid grid-cols-2 gap-2">
              {availableMethods.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setMethod(m.id)}
                  className={`rounded-lg border p-3 text-left transition ${method === m.id
                    ? 'border-teal-400 bg-teal-50 ring-1 ring-teal-200'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                >
                  <p className={`text-xs font-semibold ${method === m.id ? 'text-teal-700' : 'text-slate-600'}`}>
                    {m.label}
                  </p>
                  <p className="mt-0.5 text-[10px] text-slate-400">{m.desc}</p>
                </button>
              ))}
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
        <input type="hidden" name="mid" value={import.meta.env.VITE_PAYGATE_MID || 'paygatekr'} />
        <input type="hidden" name="paymethod" value={import.meta.env.VITE_PAYGATE_METHOD || '9'} />
        <input type="hidden" name="goodname" value="KSSC 2026 Registration" />
        <input type="hidden" name="unitprice" value={region === 'DOMESTIC' ? totalAmount : Math.ceil(totalAmount / 1300) || 1} />
        <input type="hidden" name="goodcurrency" value={region === 'DOMESTIC' ? 'WON' : 'USD'} />
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
      <h2 className="mb-2 text-2xl font-semibold text-slate-800">Registration Complete</h2>
      <p className="mb-1 text-sm text-slate-500">
        {result.nameEn}'s registration has been successfully processed.
      </p>
      <p className="mb-6 text-sm text-slate-400">A confirmation email and receipt have been sent.</p>
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
