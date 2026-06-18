import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import type { Transaction } from '@/lib/types';
import {
  approveTransaction,
  rejectTransaction,
  deleteTransaction,
} from './api';
import { StatusBadge, formatAmount } from './ui';

interface Props {
  tx: Transaction;
  onClose: () => void;
  onChanged: () => void;
}

export default function TransactionDetailModal({ tx, onClose, onChanged }: Props) {
  const { membership, has } = useAuth();
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  const canApprove = has('account.approve');
  const canReject = has('account.reject');
  const canDelete = has('account.delete');
  const actionable = tx.status === 'pending';

  async function doApprove() {
    if (!membership) return;
    setBusy(true);
    try {
      await approveTransaction(tx.id, membership.id);
      onChanged();
      onClose();
    } finally {
      setBusy(false);
    }
  }

  async function doReject() {
    if (!reason.trim()) return;
    setBusy(true);
    try {
      await rejectTransaction(tx.id, reason.trim());
      onChanged();
      onClose();
    } finally {
      setBusy(false);
    }
  }

  async function doDelete() {
    if (!confirm('이 거래를 삭제할까요?')) return;
    setBusy(true);
    try {
      await deleteTransaction(tx.id);
      onChanged();
      onClose();
    } finally {
      setBusy(false);
    }
  }

  const row = (label: string, value: React.ReactNode) => (
    <div className="flex justify-between border-b border-neutral-100 py-2 text-sm">
      <span className="text-neutral-500">{label}</span>
      <span>{value}</span>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-xl border border-neutral-200 bg-white p-6" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <div className="text-base font-medium">거래 상세</div>
          <button onClick={onClose} className="text-neutral-400 hover:text-neutral-700">✕</button>
        </div>

        <div>
          {row('상태', <StatusBadge status={tx.status} />)}
          {row('거래일', tx.trade_date)}
          {row('유형', tx.tx_type === 'income' ? '수입' : '지출')}
          {row('카테고리', tx.category ?? '-')}
          {row('금액', <span className={tx.tx_type === 'income' ? 'text-green-700' : ''}>{formatAmount(tx.amount, tx.tx_type)}</span>)}
          {row('사용처', tx.vendor ?? '-')}
          {tx.memo && row('내용', tx.memo)}
          {tx.status === 'rejected' && tx.reject_reason && row('반려 사유', <span className="text-red-600">{tx.reject_reason}</span>)}
        </div>

        {/* 승인/반려: pending 상태 + 권한 보유 시에만 */}
        {actionable && (canApprove || canReject) && !rejecting && (
          <div className="mt-5 flex gap-2">
            {canReject && (
              <button onClick={() => setRejecting(true)} disabled={busy}
                className="flex-1 rounded-md border border-red-300 px-3 py-2 text-sm text-red-600 disabled:opacity-50">반려</button>
            )}
            {canApprove && (
              <button onClick={doApprove} disabled={busy}
                className="flex-1 rounded-md bg-green-600 px-3 py-2 text-sm text-white disabled:opacity-50">
                {busy ? '처리 중…' : '승인'}
              </button>
            )}
          </div>
        )}

        {/* 반려 사유 입력 */}
        {rejecting && (
          <div className="mt-5">
            <label className="mb-1 block text-xs text-neutral-500">반려 사유</label>
            <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2}
              className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm" placeholder="증빙 누락 등" />
            <div className="mt-2 flex gap-2">
              <button onClick={() => setRejecting(false)} className="flex-1 rounded-md border border-neutral-300 px-3 py-2 text-sm">취소</button>
              <button onClick={doReject} disabled={busy || !reason.trim()}
                className="flex-1 rounded-md bg-red-600 px-3 py-2 text-sm text-white disabled:opacity-50">반려 확정</button>
            </div>
          </div>
        )}

        {/* 삭제 */}
        {canDelete && !rejecting && (
          <button onClick={doDelete} disabled={busy}
            className="mt-3 w-full text-center text-xs text-neutral-400 hover:text-red-600">이 거래 삭제</button>
        )}
      </div>
    </div>
  );
}
