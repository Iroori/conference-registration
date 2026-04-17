import { useState } from 'react';
import { usePaymentHistory, useCancelPayment } from '../hooks/useRegistration';
import { ErrorBanner, LoadingSpinner, SectionLabel, StatusPill, MemberTypePill, formatKRW } from './Shared';

export const PaymentHistoryTab = () => {
  const { data, isLoading, error, refetch } = usePaymentHistory();

  if (isLoading) {
    return (
      <div className="flex min-h-[200px] items-center justify-center">
        <LoadingSpinner label="Loading payment history…" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-2">
        <ErrorBanner message="Failed to load payment history." onRetry={() => refetch()} />
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="flex min-h-[200px] flex-col items-center justify-center gap-2 text-center">
        <p className="text-sm font-medium text-slate-500">No payment records found</p>
        <p className="text-xs text-slate-400">Your payment history will appear here after registration.</p>
      </div>
    );
  }

  return (
    <div>
      <SectionLabel>My Payments</SectionLabel>
      <div className="overflow-hidden rounded-xl border border-slate-100">
        <div className="grid grid-cols-[1fr_1fr_90px_110px_90px] bg-slate-50 px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-slate-400">
          <span>Reg. Number</span>
          <span>Selected Options</span>
          <span className="text-right">Amount</span>
          <span className="text-center">Paid At</span>
          <span className="text-center">Status</span>
        </div>
        {data.map((record, i) => (
          <div
            key={record.id}
            className={`grid grid-cols-[1fr_1fr_90px_110px_90px] items-center px-4 py-3.5 text-sm ${i > 0 ? 'border-t border-slate-100' : ''
              } hover:bg-slate-50/50 transition`}
          >
            <div>
              <p className="font-mono text-xs font-semibold text-teal-700">
                {record.registrationNumber}
              </p>
              <div className="mt-0.5 flex items-center gap-1.5">
                <p className="text-xs text-slate-400">{record.nameEn}</p>
                <MemberTypePill type={record.memberType} />
              </div>
            </div>
            <p className="truncate pr-4 text-xs text-slate-500">
              {record.selectedOptions.map((o) => o.nameEn).join(', ')}
            </p>
            <p
              className={`text-right text-sm font-semibold ${record.status === 'COMPLETED'
                  ? 'text-teal-600'
                  : record.status === 'CANCELLED'
                    ? 'text-red-400 line-through'
                    : 'text-slate-700'
                }`}
            >
              {formatKRW(record.totalAmount)}
            </p>
            <p className="text-center text-xs text-slate-400">
              {record.paidAt ? new Date(record.paidAt).toLocaleDateString('en-US') : '—'}
            </p>
            <div className="flex justify-center">
              <StatusPill status={record.status} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export const CancelTab = () => {
  const [regNum, setRegNum] = useState('');
  const [reason, setReason] = useState('');
  const [isDone, setIsDone] = useState(false);

  const { mutate: cancelPayment, isPending, error, reset } = useCancelPayment();

  const handleCancel = () => {
    if (!regNum.trim()) return;
    cancelPayment(
      { registrationNumber: regNum.trim(), reason: reason || 'Cancellation requested' },
      { onSuccess: () => setIsDone(true) }
    );
  };

  const errMsg = error
    ? ((error as { response?: { data?: { message?: string } } })?.response?.data?.message
      ?? 'An error occurred during cancellation.')
    : null;

  if (isDone) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-10 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-teal-100">
          <svg className="h-6 w-6 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
        </div>
        <div>
          <p className="font-semibold text-slate-800">Cancellation Request Submitted</p>
          <p className="mt-1 text-sm text-slate-500">Refund will be processed within 3–5 business days.</p>
        </div>
        <button
          onClick={() => {
            setIsDone(false);
            setRegNum('');
            setReason('');
            reset();
          }}
          className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
        >
          Submit Another Request
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-xl">
      <SectionLabel>Payment Cancellation Request</SectionLabel>

      <div className="mb-5 rounded-lg border border-orange-100 bg-orange-50 p-4">
        <p className="text-xs font-semibold text-orange-800 mb-2">Cancellation &amp; Refund Policy</p>
        <ul className="space-y-1 text-xs leading-relaxed text-orange-700 list-disc ml-4">
          <li>Full refund if cancellation is submitted <strong>more than 30 days</strong> before the Congress opening date.</li>
          <li>50% refund if cancellation is submitted <strong>8–30 days</strong> before the Congress opening date.</li>
          <li><strong>No refund</strong> for cancellations submitted <strong>7 days or fewer</strong> before the Congress opening date.</li>
          <li>Refunds will be processed within <strong>3–5 business days</strong> via the original payment method.</li>
          <li>Cancellations must be submitted through this portal. Email cancellation requests will not be accepted.</li>
        </ul>
      </div>

      <div className="mb-4">
        <label className="mb-1.5 block text-xs font-medium text-slate-500">Registration Number</label>
        <input
          type="text"
          value={regNum}
          onChange={(e) => setRegNum(e.target.value)}
          placeholder="IABSE-2026-XXXXX"
          className="h-10 w-full rounded-lg border border-slate-200 px-3 font-mono text-sm text-slate-800 outline-none transition focus:border-teal-400 focus:ring-2 focus:ring-teal-100 placeholder:text-slate-300"
        />
      </div>

      <div className="mb-5">
        <label className="mb-1.5 block text-xs font-medium text-slate-500">
          Reason for Cancellation <span className="text-slate-400">(optional)</span>
        </label>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
          placeholder="Please describe the reason for cancellation"
          className="w-full resize-none rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-teal-400 focus:ring-2 focus:ring-teal-100 placeholder:text-slate-300"
        />
      </div>

      {errMsg && (
        <div className="mb-4">
          <ErrorBanner message={errMsg} onRetry={() => reset()} />
        </div>
      )}

      <button
        onClick={handleCancel}
        disabled={isPending || !regNum.trim()}
        className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-5 py-2.5 text-sm font-medium text-red-700 transition hover:bg-red-100 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isPending && <LoadingSpinner size="sm" />}
        {isPending ? 'Processing…' : 'Submit Cancellation Request'}
      </button>
    </div>
  );
};
