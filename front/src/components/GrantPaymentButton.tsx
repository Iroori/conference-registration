import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiGetAdminOptions, apiGrantWaitlist } from '../lib/api';

interface SelectionState {
  checked: boolean;
  qty: number;
}

const extractErrorMessage = (err: unknown): string =>
  (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
  'Failed to open payment.';

/**
 * 관리자가 특정 등록 유저에게 옵션 결제 권한을 여는 버튼 (+ 미니 모달).
 * 대기 신청/결제 이력이 없어도 동작한다. 유저는 오퍼 페이지(/waitlist/pay)에서 직접 결제한다.
 * 정원이 있는 옵션(Gala Dinner, Technical Tour 등)을 복수 선택해서 한 번에 열어줄 수 있다.
 */
export const GrantPaymentButton = ({ email, userName }: { email: string; userName: string }) => {
  const [open, setOpen] = useState(false);
  const [selection, setSelection] = useState<Record<string, SelectionState>>({});
  const [force, setForce] = useState(true);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const { data: options } = useQuery({
    queryKey: ['adminOptions'],
    queryFn: apiGetAdminOptions,
    enabled: open,
    select: (opts) => opts.filter((o) => o.maxCapacity != null && o.id !== 'OPT-WELCOME'),
  });

  const toggle = (optionId: string) => {
    setSelection((prev) => ({
      ...prev,
      [optionId]: { checked: !(prev[optionId]?.checked ?? false), qty: prev[optionId]?.qty ?? 1 },
    }));
  };

  const setQty = (optionId: string, qty: number) => {
    setSelection((prev) => ({
      ...prev,
      [optionId]: { checked: prev[optionId]?.checked ?? false, qty: Math.max(1, qty) },
    }));
  };

  const selectedEntries = Object.entries(selection).filter(([, s]) => s.checked);

  const grantMutation = useMutation({
    mutationFn: async () => {
      const results = await Promise.allSettled(
        selectedEntries.map(([optionId, s]) =>
          apiGrantWaitlist({ email, optionId, quantity: s.qty, force })
        )
      );
      const failures = results
        .map((r, i) => ({ r, optionId: selectedEntries[i][0] }))
        .filter((x): x is { r: PromiseRejectedResult; optionId: string } => x.r.status === 'rejected');
      if (failures.length > 0) {
        const detail = failures
          .map(
            ({ r, optionId }) =>
              `${options?.find((o) => o.id === optionId)?.nameEn ?? optionId}: ${extractErrorMessage(r.reason)}`
          )
          .join(' / ');
        throw new Error(detail);
      }
    },
    onSuccess: () =>
      setMsg({
        ok: true,
        text: `Payment opened for ${selectedEntries.length} item(s). The user can now pay ${
          selectedEntries.length > 1 ? 'these items' : 'this item'
        } on their offer page.`,
      }),
    onError: (err: unknown) =>
      setMsg({ ok: false, text: err instanceof Error ? err.message : 'Failed to open payment.' }),
  });

  const submit = () => {
    setMsg(null);
    if (selectedEntries.length === 0) {
      setMsg({ ok: false, text: 'Select at least one option.' });
      return;
    }
    grantMutation.mutate();
  };

  return (
    <>
      <button
        onClick={() => {
          setOpen(true);
          setSelection({});
          setForce(true);
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

            <div className="mt-3 space-y-2">
              <div>
                <label className="block text-[10px] font-semibold uppercase text-slate-500 mb-1">
                  Options (select one or more)
                </label>
                <div className="space-y-1.5 max-h-48 overflow-y-auto rounded-md border border-slate-200 p-2">
                  {options?.map((o) => {
                    const sel = selection[o.id] ?? { checked: false, qty: 1 };
                    return (
                      <div key={o.id} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={sel.checked}
                          onChange={() => toggle(o.id)}
                          className="h-3.5 w-3.5"
                        />
                        <span className="flex-1 text-xs text-slate-700 truncate">{o.nameEn}</span>
                        <input
                          type="number"
                          min={1}
                          disabled={!sel.checked}
                          value={sel.qty}
                          onChange={(e) => setQty(o.id, Number(e.target.value) || 1)}
                          className="w-14 rounded-md border border-slate-300 px-2 py-1 text-center text-xs focus:border-teal-400 focus:outline-none focus:ring-1 focus:ring-teal-200 disabled:bg-slate-50 disabled:text-slate-300"
                        />
                      </div>
                    );
                  })}
                  {options && options.length === 0 && (
                    <p className="text-[11px] text-slate-400 px-1 py-1">No capacity-limited options.</p>
                  )}
                </div>
              </div>
              <label className="flex items-center gap-1.5 text-[11px] text-slate-600">
                <input type="checkbox" checked={force} onChange={(e) => setForce(e.target.checked)} className="h-3.5 w-3.5" />
                Allow over-capacity
              </label>
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
