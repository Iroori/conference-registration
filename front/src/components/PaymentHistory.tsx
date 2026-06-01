import { useState } from 'react';
import { usePaymentHistory } from '../hooks/useRegistration';
import { ErrorBanner, LoadingSpinner, SectionLabel, StatusPill, MemberTypePill, formatKRW } from './Shared';

export const PaymentHistoryTab = () => {
  const { data, isLoading, error, refetch } = usePaymentHistory();
  const [expandedRecordId, setExpandedRecordId] = useState<number | null>(null);

  const toggleExpandRecord = (id: number) => {
    setExpandedRecordId((prev) => (prev === id ? null : id));
  };

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
        <div className="grid grid-cols-[30px_1fr_1fr_90px_110px_90px] bg-slate-50 px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-ink-faint">
          <span></span>
          <span>Reg. Number</span>
          <span>Selected Options</span>
          <span className="text-right">Amount</span>
          <span className="text-center">Paid At</span>
          <span className="text-center">Status</span>
        </div>
        {data.map((record) => {
          const isExpanded = expandedRecordId === record.id;
          return (
            <div key={record.id} className="border-b border-slate-100 last:border-b-0 bg-white">
              <div
                onClick={() => toggleExpandRecord(record.id)}
                className="grid grid-cols-[30px_1fr_1fr_90px_110px_90px] items-center px-4 py-3.5 text-sm hover:bg-gold-tint transition select-none cursor-pointer"
              >
                <div className="text-center text-slate-400 flex items-center justify-center">
                  <svg 
                    className={`h-2.5 w-2.5 transform transition-transform duration-200 ${isExpanded ? 'rotate-90 text-gold font-bold' : ''}`} 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" />
                  </svg>
                </div>
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

              {isExpanded && (
                <div className="bg-slate-50/50 border-t border-slate-100/70 p-4 space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-200/50 pb-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-650 flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-gold"></span>
                      Registration Receipt &amp; Breakdown
                    </h4>
                    <span className="text-[10px] text-slate-400 font-mono">Reg No: {record.registrationNumber}</span>
                  </div>

                  {/* Accompanying Persons Info */}
                  {record.accompanyingPersons && record.accompanyingPersons.length > 0 && (
                    <div className="rounded-lg bg-gold-tint/50 border border-gold/10 px-3 py-2 text-xs text-slate-800 space-y-1">
                      <div className="flex items-center gap-2">
                        <svg className="h-4 w-4 text-gold flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                        </svg>
                        <span className="font-semibold text-slate-800">Accompanying Persons:</span>
                      </div>
                      <div className="pl-6 space-y-1">
                        {record.accompanyingPersons.map((p, idx) => (
                          <p key={idx} className="font-medium text-slate-700">- {p.firstName} {p.lastName}</p>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Exhibitor Badges Info */}
                  {record.exhibitorBadges && record.exhibitorBadges.length > 0 && (
                    <div className="rounded-lg bg-gold-tint/50 border border-gold/10 px-3 py-2 text-xs text-slate-800 space-y-1">
                      <div className="flex items-center gap-2">
                        <svg className="h-4 w-4 text-gold flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 014 0m-6 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.333 0 4 .667 4 2v1H5v-1c0-1.333 2.667-2 4-2z" />
                        </svg>
                        <span className="font-semibold text-slate-800">Exhibitors:</span>
                      </div>
                      <div className="pl-6 space-y-1">
                        {record.exhibitorBadges.map((e, idx) => (
                          <p key={idx} className="font-medium text-slate-700">- {e.firstName} {e.lastName}</p>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Itemized Options */}
                    <div className="space-y-2">
                      <h5 className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Items Ordered</h5>
                      <div className="divide-y divide-slate-100 border border-slate-200/60 rounded-lg overflow-hidden bg-white">
                        {record.selectedOptions.map((opt) => (
                          <div key={opt.id} className="flex justify-between items-center p-3 text-xs hover:bg-slate-50/50 transition">
                            <div className="flex items-center gap-2">
                              <span className={`inline-block rounded px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wide ${
                                opt.category === 'REGISTRATION' 
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
                                  : opt.category === 'PROGRAM'
                                  ? 'bg-purple-50 text-purple-700 border border-purple-100'
                                  : 'bg-slate-100 text-slate-700 border border-slate-200'
                              }`}>
                                {opt.category === 'REGISTRATION' ? 'Registration' : opt.category === 'PROGRAM' ? 'Program' : 'Admin'}
                              </span>
                              <div>
                                <div className="font-semibold text-slate-800">{opt.nameEn}</div>
                              </div>
                            </div>
                            <span className="font-mono font-semibold text-slate-700">{formatKRW(opt.price)}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Financial details */}
                    <div className="space-y-2">
                      <h5 className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Total Calculation</h5>
                      <div className="bg-white border border-slate-200/60 rounded-lg p-3 space-y-2">
                        <div className="flex justify-between text-xs text-slate-500 font-medium">
                          <span>Net Price (Subtotal):</span>
                          <span className="font-mono text-slate-700">{formatKRW(record.subtotal)}</span>
                        </div>
                        <div className="flex justify-between text-xs text-slate-500 font-medium">
                          <span>VAT (10% Tax):</span>
                          <span className="font-mono text-slate-700">{formatKRW(record.tax)}</span>
                        </div>
                        <div className="border-t border-slate-100 pt-2 flex justify-between text-xs font-bold text-slate-800">
                          <span>Gross Total Amount Paid:</span>
                          <span className="font-mono text-gold text-sm">{formatKRW(record.totalAmount)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
