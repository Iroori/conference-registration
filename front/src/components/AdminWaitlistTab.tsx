import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  apiGetWaitlistSummary,
  apiGetWaitlistByOption,
  apiOfferWaitlist,
  apiRevokeWaitlist,
} from '../lib/api';
import type { WaitlistEntry } from '../types';

const statusStyle = (status: string): string => {
  switch (status) {
    case 'WAITING':
      return 'bg-slate-100 text-slate-600';
    case 'OFFERED':
      return 'bg-amber-100 text-amber-700';
    case 'COMPLETED':
      return 'bg-teal-100 text-teal-700';
    case 'EXPIRED':
      return 'bg-slate-200 text-slate-500';
    case 'CANCELLED':
      return 'bg-red-100 text-red-600';
    default:
      return 'bg-slate-100 text-slate-600';
  }
};

const parentStyle = (status: string): string => {
  switch (status) {
    case 'COMPLETED':
      return 'text-teal-600';
    case 'PENDING':
      return 'text-amber-600';
    case 'FAILED':
    case 'CANCELLED':
      return 'text-red-500';
    default:
      return 'text-slate-500';
  }
};

const seatLabel = (available: number, maxCapacity: number | null): string => {
  if (maxCapacity == null) return 'Unlimited';
  return String(available);
};

export const AdminWaitlistTab = () => {
  const queryClient = useQueryClient();
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [qtyById, setQtyById] = useState<Record<number, number>>({});

  const {
    data: summary,
    isLoading: loadingSummary,
    isError: errorSummary,
  } = useQuery({
    queryKey: ['waitlistSummary'],
    queryFn: apiGetWaitlistSummary,
  });

  const { data: detail, isLoading: loadingDetail } = useQuery({
    queryKey: ['waitlistDetail', selectedOptionId],
    queryFn: () => apiGetWaitlistByOption(selectedOptionId as string),
    enabled: !!selectedOptionId,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['waitlistSummary'] });
    if (selectedOptionId) {
      queryClient.invalidateQueries({ queryKey: ['waitlistDetail', selectedOptionId] });
    }
  };

  const offerMutation = useMutation({
    mutationFn: ({ id, quantity, force }: { id: number; quantity: number; force: boolean }) =>
      apiOfferWaitlist(id, quantity, force),
    onSuccess: invalidate,
  });

  const revokeMutation = useMutation({
    mutationFn: (id: number) => apiRevokeWaitlist(id),
    onSuccess: invalidate,
  });

  const available = detail?.availableSeats ?? 0;
  const maxCapacity = detail?.maxCapacity ?? null;
  const unlimited = maxCapacity == null;

  const handleOffer = (entry: WaitlistEntry) => {
    const qty = Math.max(1, qtyById[entry.waitlistId] ?? 1);
    const over = !unlimited && qty > available;
    const confirmMsg = over
      ? `Only ${available} seat(s) available for this program.\n\nOffer ${qty} seat(s) to ${entry.userName} anyway? This will exceed the capacity.`
      : `Send an offer for ${qty} seat(s) to ${entry.userName}?`;
    if (!window.confirm(confirmMsg)) return;
    offerMutation.mutate(
      { id: entry.waitlistId, quantity: qty, force: over },
      {
        onError: (err: unknown) => {
          const msg =
            (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
            'Failed to send the offer.';
          window.alert(msg);
        },
      }
    );
  };

  const handleRevoke = (entry: WaitlistEntry) => {
    if (!window.confirm(`Revoke the offer for ${entry.userName}? The seat returns to the pool.`)) return;
    revokeMutation.mutate(entry.waitlistId);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-slate-800">Waitlist Management</h3>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Offer opened seats to waitlisted attendees in order. Offered attendees pay for the item only, after logging in.
          </p>
        </div>
        <span className="text-xs text-slate-500 font-medium bg-slate-200/60 px-2.5 py-1 rounded-full">
          Options with waitlist: {summary?.length ?? 0}
        </span>
      </div>

      {loadingSummary && (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-teal-500"></div>
          <p className="text-xs font-medium text-slate-500">Retrieving waitlists...</p>
        </div>
      )}

      {errorSummary && (
        <div className="rounded-xl border border-red-100 bg-red-50 p-5 text-center text-red-600 text-xs font-medium">
          Failed to load waitlists. Please check server authorization.
        </div>
      )}

      {summary && summary.length === 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-500 text-sm">
          No waitlist requests yet.
        </div>
      )}

      {/* Option summary cards */}
      {summary && summary.length > 0 && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {summary.map((s) => {
            const isActive = s.optionId === selectedOptionId;
            return (
              <button
                key={s.optionId}
                onClick={() => setSelectedOptionId(s.optionId)}
                className={`rounded-xl border p-4 text-left transition ${
                  isActive
                    ? 'border-teal-400 bg-teal-50/60 ring-1 ring-teal-200'
                    : 'border-slate-200 bg-white hover:border-teal-200'
                }`}
              >
                <p className="text-sm font-semibold text-slate-800 truncate">{s.optionName}</p>
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-600">
                  <span>Waiting: <b className="text-slate-800">{s.waitingCount}</b></span>
                  <span>Offered: <b className="text-amber-600">{s.offeredCount}</b></span>
                  <span>
                    Seats left:{' '}
                    <b className={s.maxCapacity != null && s.availableSeats <= 0 ? 'text-red-500' : 'text-teal-600'}>
                      {seatLabel(s.availableSeats, s.maxCapacity)}
                    </b>
                  </span>
                </div>
                <p className="mt-1 text-[10px] text-slate-400">
                  Sold {s.currentCount}{s.maxCapacity != null ? ` / ${s.maxCapacity}` : ''}
                </p>
              </button>
            );
          })}
        </div>
      )}

      {/* Detail table */}
      {selectedOptionId && (
        <div className="mt-4">
          {loadingDetail && (
            <p className="text-xs font-medium text-slate-500 py-6 text-center">Loading waitlist...</p>
          )}

          {detail && (
            <>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-semibold text-slate-800">
                  {detail.optionName} — Waitlist (FIFO order)
                </h4>
                <span className="text-[11px] text-slate-500">
                  Seats available:{' '}
                  <b className={!unlimited && available <= 0 ? 'text-red-500' : 'text-teal-600'}>
                    {seatLabel(available, maxCapacity)}
                  </b>
                </span>
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
                <table className="w-full border-collapse text-left text-xs">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-600">
                      <th className="px-3 py-3 text-center">#</th>
                      <th className="px-3 py-3">Attendee</th>
                      <th className="px-3 py-3">Requested</th>
                      <th className="px-3 py-3 text-center">Registration</th>
                      <th className="px-3 py-3 text-center">Status</th>
                      <th className="px-3 py-3">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {detail.entries.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-3 py-6 text-center text-slate-400">
                          No entries.
                        </td>
                      </tr>
                    )}
                    {detail.entries.map((e) => {
                      const canOffer = e.status === 'WAITING' || e.status === 'EXPIRED';
                      return (
                        <tr key={e.waitlistId} className="hover:bg-slate-50/50">
                          <td className="px-3 py-3 text-center font-mono text-slate-400">{e.position}</td>
                          <td className="px-3 py-3">
                            <p className="font-semibold text-slate-800">{e.userName}</p>
                            <p className="text-[10px] text-slate-400">{e.userEmail}</p>
                          </td>
                          <td className="px-3 py-3 text-slate-500">{e.requestedAt ?? '-'}</td>
                          <td className="px-3 py-3 text-center">
                            <span className={`font-semibold ${parentStyle(e.parentPaymentStatus)}`}>
                              {e.parentPaymentStatus}
                            </span>
                          </td>
                          <td className="px-3 py-3 text-center">
                            <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold ${statusStyle(e.status)}`}>
                              {e.status}
                              {e.status === 'OFFERED' ? ` ×${e.offeredQuantity}` : ''}
                            </span>
                            {e.status === 'OFFERED' && e.offerExpiresAt && (
                              <p className={`text-[10px] mt-0.5 ${e.offerExpired ? 'text-red-500' : 'text-slate-400'}`}>
                                {e.offerExpired ? 'Expired' : `until ${e.offerExpiresAt}`}
                              </p>
                            )}
                          </td>
                          <td className="px-3 py-3">
                            {canOffer && (
                              <div className="flex items-center gap-1.5">
                                <input
                                  type="number"
                                  min={1}
                                  value={qtyById[e.waitlistId] ?? 1}
                                  onChange={(ev) =>
                                    setQtyById((prev) => ({
                                      ...prev,
                                      [e.waitlistId]: Math.max(1, Number(ev.target.value) || 1),
                                    }))
                                  }
                                  className="w-14 rounded-md border border-slate-300 px-2 py-1 text-center text-xs focus:border-teal-400 focus:outline-none focus:ring-1 focus:ring-teal-200"
                                />
                                <button
                                  onClick={() => handleOffer(e)}
                                  disabled={offerMutation.isPending}
                                  className="rounded-md bg-teal-500 px-3 py-1 text-[11px] font-semibold text-white transition hover:bg-teal-600 disabled:bg-slate-200 disabled:text-slate-400"
                                >
                                  Offer
                                </button>
                              </div>
                            )}
                            {e.status === 'OFFERED' && (
                              <button
                                onClick={() => handleRevoke(e)}
                                disabled={revokeMutation.isPending}
                                className="rounded-md border border-slate-300 px-3 py-1 text-[11px] font-semibold text-slate-600 transition hover:bg-slate-100 disabled:opacity-50"
                              >
                                Revoke
                              </button>
                            )}
                            {e.status === 'COMPLETED' && (
                              <span className="text-[11px] text-teal-600 font-medium">Paid ×{e.offeredQuantity}</span>
                            )}
                            {e.status === 'CANCELLED' && <span className="text-[11px] text-slate-400">—</span>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};
