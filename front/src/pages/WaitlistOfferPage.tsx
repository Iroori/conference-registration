import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  apiFetchMyWaitlistOffers,
  apiInitiateWaitlistPayment,
  apiCompletePayment,
  apiReportPaymentFailure,
} from '../lib/api';
import { ErrorBanner, LoadingSpinner, formatKRW } from '../components/Shared';
import type { WaitlistOffer, PaymentResponse } from '../types';

// 한국 국가명 판별 (Step3Payment와 동일 규칙)
function isKoreanUser(country: string | undefined): boolean {
  if (!country) return false;
  const normalized = country.trim().toLowerCase();
  return ['south korea', 'korea', '대한민국', 'kr'].some((kw) => normalized.includes(kw));
}

export const WaitlistOfferPage = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [submittingId, setSubmittingId] = useState<number | null>(null);
  const [pgError, setPgError] = useState<string | null>(null);
  const [paidResult, setPaidResult] = useState<PaymentResponse | null>(null);

  const { data: offers, isLoading, isError, refetch } = useQuery({
    queryKey: ['myWaitlistOffers'],
    queryFn: apiFetchMyWaitlistOffers,
  });

  const domestic = isKoreanUser(user?.country);
  const mid = domestic
    ? (import.meta.env.VITE_PAYGATE_MID_DOMESTIC || 'kibse')
    : (import.meta.env.VITE_PAYGATE_MID_OVERSEAS || 'kibse0us');
  const paymethod = domestic ? 'card' : '101';

  // PayGate 결과 콜백 — Step3Payment와 동일 흐름 (완료는 공용 /payments/complete 재사용)
  useEffect(() => {
    (window as unknown as { getPGIOresult: () => void }).getPGIOresult = () => {
      const form = document.forms.namedItem('PGIOForm') as HTMLFormElement | null;
      if (!form) return;
      const replycode = (form.elements.namedItem('replycode') as HTMLInputElement)?.value;
      const replyMsg = (form.elements.namedItem('replyMsg') as HTMLInputElement)?.value;

      if (replycode === '0000' || replycode === 'NPS000' || replycode === 'NPS016') {
        const registrationNumber = (form.elements.namedItem('mb_serial_no') as HTMLInputElement)?.value;
        const tid = (form.elements.namedItem('tid') as HTMLInputElement)?.value;
        apiCompletePayment({ registrationNumber, tid, replycode })
          .then((result) => {
            const apilogInput = document.createElement('input');
            apilogInput.type = 'hidden';
            apilogInput.name = 'apilog';
            apilogInput.value = '100';
            form.appendChild(apilogInput);
            if (typeof (window as unknown as { verifyReceived?: () => void }).verifyReceived === 'function') {
              (window as unknown as { verifyReceived: () => void }).verifyReceived();
            }
            setSubmittingId(null);
            setPaidResult(result);
            refetch();
          })
          .catch((err: unknown) => {
            setSubmittingId(null);
            const msg =
              (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
              'Payment completion failed. Please contact the secretariat.';
            setPgError(msg);
          });
      } else {
        setSubmittingId(null);
        setPgError(`[${replycode}] ${replyMsg || 'Payment was not completed. Please try again.'}`);
        apiReportPaymentFailure({
          replycode,
          replyMsg,
          tid: (form.elements.namedItem('tid') as HTMLInputElement)?.value || undefined,
        });
      }
    };
  }, [refetch]);

  const handlePay = async (offer: WaitlistOffer) => {
    if (submittingId !== null) return;
    setPgError(null);

    if (typeof (window as unknown as { doTransaction?: unknown }).doTransaction !== 'function') {
      setPgError('Payment module is not loaded. Please refresh the page and try again.');
      return;
    }

    setSubmittingId(offer.waitlistId);
    try {
      const initiated = await apiInitiateWaitlistPayment(offer.waitlistId);

      // React 내부 속성 직렬화 방지를 위해 순수 DOM으로 폼 생성 (Step3Payment와 동일)
      let form = document.forms.namedItem('PGIOForm') as HTMLFormElement | null;
      if (form) form.remove();

      form = document.createElement('form');
      form.name = 'PGIOForm';
      form.style.display = 'none';

      const addInput = (name: string, value: string) => {
        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = name;
        input.value = value;
        form!.appendChild(input);
      };

      addInput('mid', mid);
      addInput('paymethod', paymethod);
      addInput('goodname', `IABSE 2026 - ${offer.optionName}`);
      addInput('unitprice', String(offer.totalAmount));
      addInput('goodcurrency', 'WON');
      addInput('langcode', domestic ? 'KR' : 'US');
      addInput('cardquota', '00');
      addInput('replycode', '');
      addInput('replyMsg', '');
      addInput('tid', '');
      addInput('cardauthcode', '');
      addInput('cardtype', '');
      addInput('cardnumber', '');
      addInput('mb_serial_no', initiated.registrationNumber);

      if (user) {
        addInput('receipttoname', `${user.firstName || ''} ${user.lastName || ''}`.trim());
        addInput('receipttoemail', user.email);
      }

      document.body.appendChild(form);
      (window as unknown as { doTransaction: (f: HTMLFormElement) => void }).doTransaction(form);
    } catch (err: unknown) {
      setSubmittingId(null);
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Failed to initiate payment. The offer may have expired.';
      setPgError(msg);
      refetch();
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-slate-800">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-teal-400">
              IABSE Congress Incheon 2026
            </p>
            <h1 className="text-lg font-semibold text-white">Waitlist Payment</h1>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <button
              onClick={() => navigate('/')}
              className="rounded-lg border border-slate-600 px-3 py-1.5 text-slate-200 transition hover:bg-slate-700"
            >
              My Registration
            </button>
            <button
              onClick={logout}
              className="text-slate-400 transition hover:text-white"
            >
              Log out
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-8">
        {paidResult && (
          <div className="mb-6 rounded-2xl border border-teal-100 bg-teal-50 p-5">
            <p className="text-sm font-semibold text-teal-800">
              ✓ Payment completed — Registration No. {paidResult.registrationNumber}
            </p>
            <p className="mt-1 text-xs text-teal-700">
              A receipt has been sent to {paidResult.email}. This additional payment now appears in your payment history.
            </p>
          </div>
        )}

        {pgError && (
          <div className="mb-6">
            <ErrorBanner message={pgError} />
          </div>
        )}

        {isLoading && (
          <div className="flex flex-col items-center justify-center gap-3 py-20">
            <LoadingSpinner size="sm" />
            <p className="text-xs font-medium text-slate-500">Loading your offers...</p>
          </div>
        )}

        {isError && (
          <div className="rounded-2xl border border-red-100 bg-red-50 p-6 text-center text-sm text-red-600">
            Failed to load your waitlist offers. Please refresh and try again.
          </div>
        )}

        {offers && offers.length === 0 && !paidResult && (
          <div className="rounded-2xl border border-slate-100 bg-white p-10 text-center shadow-sm">
            <p className="text-sm font-semibold text-slate-700">No active offers</p>
            <p className="mt-1.5 text-xs text-slate-500">
              You don't have any waitlist items available for payment right now. If a seat opens up, we'll email you and it will appear here.
            </p>
          </div>
        )}

        {offers && offers.length > 0 && (
          <div className="space-y-4">
            <p className="text-xs text-slate-500">
              A seat has opened up for the item(s) below. Complete payment before the deadline to secure your spot.
            </p>
            {offers.map((offer) => (
              <div
                key={offer.waitlistId}
                className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{offer.optionName}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {formatKRW(offer.price)} × {offer.quantity}
                      {offer.offerExpiresAt && (
                        <span className="ml-2 text-amber-600">· Pay by {offer.offerExpiresAt}</span>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-lg font-semibold text-slate-900">{formatKRW(offer.totalAmount)}</span>
                    <button
                      onClick={() => handlePay(offer)}
                      disabled={submittingId !== null}
                      className="flex items-center justify-center gap-2 rounded-lg bg-teal-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-600 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
                    >
                      {submittingId === offer.waitlistId && <LoadingSpinner size="sm" />}
                      {submittingId === offer.waitlistId ? 'Opening payment…' : 'Pay now'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
            <div className="flex items-center justify-center gap-1.5 pt-2 text-[10px] uppercase tracking-[0.1em] text-slate-400">
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0110 0v4" />
              </svg>
              SSL Encrypted · PCI-DSS Secure
            </div>
          </div>
        )}
      </main>

      {/* PayGate 결제창 렌더 영역 */}
      <div id="PGIOscreen" className="mt-4 flex w-full justify-center"></div>
    </div>
  );
};
