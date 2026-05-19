import { usePaymentHistory } from '../hooks/useRegistration';
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
        <p className="text-sm font-medium text-ink-muted">No payment records found</p>
        <p className="text-xs text-ink-faint">Your payment history will appear here after registration.</p>
      </div>
    );
  }

  return (
    <div>
      <SectionLabel>My Payments</SectionLabel>
      <div className="overflow-hidden rounded-xl border border-slate-100">
        <div className="grid grid-cols-[1fr_1fr_90px_110px_90px] bg-slate-50 px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-ink-faint">
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
              } hover:bg-gold-tint transition`}
          >
            <div>
              <p className="font-mono text-xs font-semibold text-gold">
                {record.registrationNumber}
              </p>
              <div className="mt-0.5 flex items-center gap-1.5">
                <p className="text-xs text-ink-faint">{`${record.firstName} ${record.lastName}`}</p>
                <MemberTypePill type={record.memberType} />
              </div>
            </div>
            <p className="truncate pr-4 text-xs text-ink-muted">
              {record.selectedOptions.map((o) => o.nameEn).join(', ')}
            </p>
            <p
              className={`text-right text-sm font-semibold ${record.status === 'COMPLETED'
                  ? 'text-gold'
                  : record.status === 'CANCELLED'
                    ? 'text-red-400 line-through'
                    : 'text-ink'
                }`}
            >
              {formatKRW(record.totalAmount)}
            </p>
            <p className="text-center text-xs text-ink-faint">
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
