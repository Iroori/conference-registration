import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiGetAdminOptions, apiGrantWaitlist } from '../lib/api';

/**
 * 관리자가 특정 등록 유저에게 옵션 결제 권한을 여는 버튼 (+ 미니 모달).
 * 대기 신청/결제 이력이 없어도 동작한다. 유저는 오퍼 페이지(/waitlist/pay)에서 직접 결제한다.
 */
export const GrantPaymentButton = ({ email, userName }: { email: string; userName: string }) => {
  const [open, setOpen] = useState(false);
  const [optionId, setOptionId] = useState('');
  const [qty, setQty] = useState(1);
  const [force, setForce] = useState(true);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const { data: options } = useQuery({
    queryKey: ['adminOptions'],
    queryFn: apiGetAdminOptions,
    enabled: open,
    select: (opts) => opts.filter((o) => o.maxCapacity != null),
  });

  const grantMutation = useMutation({
    mutationFn: () => apiGrantWaitlist({ email, optionId, quantity: qty, force }),
    onSuccess: () =>
      setMsg({ ok: true, text: 'Payment opened. The user can now pay this item on their offer page.' }),
    onError: (err: unknown) => {
      const m =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Failed to open payment.';
      setMsg({ ok: false, text: m });
    },
  });

  const submit = () => {
    setMsg(null);
    if (!optionId) {
      setMsg({ ok: false, text: 'Select an option.' });
      return;
    }
    grantMutation.mutate();
  };

  return (
    <>
      <button
        onClick={() => {
          setOpen(true);
          setMsg(null);
        }}
        className="mr-1 px-2.5 py-1 bg-teal-500 hover:bg-teal-600 text-white font-semibold rounded-lg text-[10px] shadow-sm transition"
      >
        Open payment
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-xl bg-white p-5 shadow-xl text-left"
            onClick={(e) => e.stopPropagation()}
          >
            <h4 className="text-sm font-semibold text-slate-800">Open payment for a user</h4>
            <p className="mt-1 text-[11px] font-medium text-slate-600">
              {userName} · {email}
            </p>
            <p className="mt-1 text-[11px] text-slate-400">
              Grants payment access for the selected option (works even without a registration record). The user pays it themselves on their offer page.
            </p>

            <div className="mt-3 space-y-2">
              <div>
                <label className="block text-[10px] font-semibold uppercase text-slate-500 mb-1">Option</label>
                <select
                  value={optionId}
                  onChange={(e) => setOptionId(e.target.value)}
                  className="w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-xs bg-white focus:border-teal-400 focus:outline-none focus:ring-1 focus:ring-teal-200"
                >
                  <option value="">Select option…</option>
                  {options?.map((o) => (
                    <option key={o.id} value={o.id}>{o.nameEn}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-end gap-3">
                <div>
                  <label className="block text-[10px] font-semibold uppercase text-slate-500 mb-1">Qty</label>
                  <input
                    type="number"
                    min={1}
                    value={qty}
                    onChange={(e) => setQty(Math.max(1, Number(e.target.value) || 1))}
                    className="w-20 rounded-md border border-slate-300 px-2.5 py-1.5 text-xs text-center focus:border-teal-400 focus:outline-none focus:ring-1 focus:ring-teal-200"
                  />
                </div>
                <label className="flex items-center gap-1.5 text-[11px] text-slate-600 pb-1.5">
                  <input type="checkbox" checked={force} onChange={(e) => setForce(e.target.checked)} className="h-3.5 w-3.5" />
                  Allow over-capacity
                </label>
              </div>
            </div>

            {msg && (
              <p className={`mt-2 text-[11px] font-medium ${msg.ok ? 'text-teal-600' : 'text-red-600'}`}>{msg.text}</p>
            )}

            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setOpen(false)}
                className="rounded-md border border-slate-300 px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50"
              >
                Close
              </button>
              <button
                onClick={submit}
                disabled={grantMutation.isPending}
                className="rounded-md bg-teal-500 px-4 py-1.5 text-xs font-semibold text-white hover:bg-teal-600 disabled:bg-slate-200 disabled:text-slate-400"
              >
                {grantMutation.isPending ? 'Opening…' : 'Open payment'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
