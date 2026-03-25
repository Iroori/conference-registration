import { useState } from 'react';
import { usePaymentHistory, useCancelPayment } from '../hooks/useRegistration';
import { ErrorBanner, LoadingSpinner, SectionLabel, StatusPill, MemberTypePill, formatKRW } from './Shared';

export const PaymentHistoryTab = () => {
  const { data, isLoading, error, refetch } = usePaymentHistory();

  if (isLoading) return (
    <div className="flex min-h-[200px] items-center justify-center">
      <LoadingSpinner label="내역을 불러오는 중..." />
    </div>
  );

  if (error) return (
    <div className="p-2">
      <ErrorBanner message="결제 내역을 불러오지 못했습니다." onRetry={() => refetch()} />
    </div>
  );

  return (
    <div>
      <SectionLabel>전체 결제 내역</SectionLabel>
      <div className="overflow-hidden rounded-xl border border-slate-100">
        <div className="grid grid-cols-[1fr_1fr_80px_100px_90px] bg-slate-50 px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-slate-400">
          <span>등록자</span>
          <span>선택 옵션</span>
          <span className="text-right">금액</span>
          <span className="text-center">결제일</span>
          <span className="text-center">상태</span>
        </div>
        {(data ?? []).map((record, i) => (
          <div
            key={record.paymentId}
            className={`grid grid-cols-[1fr_1fr_80px_100px_90px] items-center px-4 py-3.5 text-sm ${
              i > 0 ? 'border-t border-slate-100' : ''
            } hover:bg-slate-50/50 transition`}
          >
            <div>
              <p className="font-medium text-slate-800">{record.nameKr}</p>
              <div className="mt-0.5 flex items-center gap-1.5">
                <p className="text-xs text-slate-400">{record.affiliation}</p>
                <MemberTypePill type={record.memberType} />
              </div>
            </div>
            <p className="truncate pr-4 text-xs text-slate-500">{record.selectedOptions.join(', ')}</p>
            <p className={`text-right text-sm font-semibold ${
              record.status === 'COMPLETED' ? 'text-teal-600' :
              record.status === 'CANCELLED' ? 'text-red-400 line-through' : 'text-slate-700'
            }`}>
              {formatKRW(record.totalAmount)}
            </p>
            <p className="text-center text-xs text-slate-400">
              {new Date(record.paidAt).toLocaleDateString('ko-KR')}
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
      { registrationNumber: regNum.trim(), reason },
      {
        onSuccess: () => setIsDone(true),
      }
    );
  };

  if (isDone) return (
    <div className="flex flex-col items-center justify-center gap-4 py-10 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-teal-100">
        <svg className="h-6 w-6 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
        </svg>
      </div>
      <div>
        <p className="font-semibold text-slate-800">취소 요청이 접수되었습니다</p>
        <p className="mt-1 text-sm text-slate-500">환불은 3~5 영업일 이내 처리됩니다.</p>
      </div>
      <button
        onClick={() => { setIsDone(false); setRegNum(''); setReason(''); reset(); }}
        className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
      >
        다시 입력
      </button>
    </div>
  );

  return (
    <div className="max-w-xl">
      <SectionLabel>결제 취소 요청</SectionLabel>

      <div className="mb-5 rounded-lg border border-orange-100 bg-orange-50 p-3.5">
        <p className="text-xs leading-relaxed text-orange-700">
          취소 정책: 행사 30일 전까지 전액 환불 · 7일 전 50% 환불 · 이후 환불 불가
        </p>
      </div>

      <div className="mb-4">
        <label className="mb-1.5 block text-xs font-medium text-slate-500">등록 번호</label>
        <input
          type="text"
          value={regNum}
          onChange={e => setRegNum(e.target.value)}
          placeholder="KSSC-2026-XXXXX"
          className="h-10 w-full rounded-lg border border-slate-200 px-3 font-mono text-sm text-slate-800 outline-none transition focus:border-teal-400 focus:ring-2 focus:ring-teal-100 placeholder:text-slate-300"
        />
      </div>

      <div className="mb-5">
        <label className="mb-1.5 block text-xs font-medium text-slate-500">취소 사유 (선택)</label>
        <textarea
          value={reason}
          onChange={e => setReason(e.target.value)}
          rows={3}
          placeholder="취소 사유를 입력해주세요"
          className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-teal-400 focus:ring-2 focus:ring-teal-100 placeholder:text-slate-300 resize-none"
        />
      </div>

      {error && (
        <div className="mb-4">
          <ErrorBanner message={(error as Error).message} onRetry={() => reset()} />
        </div>
      )}

      <button
        onClick={handleCancel}
        disabled={isPending || !regNum.trim()}
        className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-5 py-2.5 text-sm font-medium text-red-700 transition hover:bg-red-100 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isPending && <LoadingSpinner size="sm" />}
        {isPending ? '처리 중...' : '취소 요청 제출'}
      </button>
    </div>
  );
};
