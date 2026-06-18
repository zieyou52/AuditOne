import type { TxStatus } from '@/lib/types';

export const STATUS_LABEL: Record<TxStatus, string> = {
  draft: '임시저장',
  pending: '승인대기',
  approved: '승인완료',
  rejected: '반려',
};

const STATUS_STYLE: Record<TxStatus, string> = {
  draft: 'bg-neutral-100 text-neutral-600',
  pending: 'bg-amber-100 text-amber-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
};

export function StatusBadge({ status }: { status: TxStatus }) {
  return (
    <span className={`rounded-md px-2 py-0.5 text-xs ${STATUS_STYLE[status]}`}>
      {STATUS_LABEL[status]}
    </span>
  );
}

export function formatAmount(amount: number, type: 'income' | 'expense') {
  const sign = type === 'income' ? '+' : '-';
  return `${sign}${amount.toLocaleString('ko-KR')}`;
}

export const CATEGORIES = [
  '행사비',
  '식비',
  '홍보비',
  '운영비',
  '기자재',
  '도서',
  '교통비',
  '기타',
];
