import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import type { Transaction, TxStatus } from '@/lib/types';
import {
  fetchTransactions,
  fetchStatusCounts,
  fetchBudgetsWithUsage,
  type BudgetWithUsage,
} from '@/features/accounting/api';
import { StatusBadge, formatAmount } from '@/features/accounting/ui';
import TransactionFormModal from '@/features/accounting/TransactionFormModal';
import TransactionDetailModal from '@/features/accounting/TransactionDetailModal';

type FilterKey = 'all' | TxStatus;

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'all', label: '전체' },
  { key: 'pending', label: '승인대기' },
  { key: 'approved', label: '승인완료' },
  { key: 'rejected', label: '반려' },
];

export default function AccountingPage() {
  const { org, has } = useAuth();
  const [params, setParams] = useSearchParams();
  const filter = (params.get('status') as FilterKey) || 'all';

  const [txs, setTxs] = useState<Transaction[]>([]);
  const [counts, setCounts] = useState<Record<FilterKey, number>>({
    all: 0, draft: 0, pending: 0, approved: 0, rejected: 0,
  });
  const [budgets, setBudgets] = useState<BudgetWithUsage[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selected, setSelected] = useState<Transaction | null>(null);

  const canCreate = has('account.create');

  const load = useCallback(async () => {
    if (!org) return;
    setLoading(true);
    try {
      const status = filter === 'all' ? undefined : (filter as TxStatus);
      const [list, c, b] = await Promise.all([
        fetchTransactions(org.id, status),
        fetchStatusCounts(org.id),
        fetchBudgetsWithUsage(org.id),
      ]);
      setTxs(list);
      setCounts(c as Record<FilterKey, number>);
      setBudgets(b);
    } finally {
      setLoading(false);
    }
  }, [org, filter]);

  useEffect(() => { load(); }, [load]);

  function setFilter(k: FilterKey) {
    if (k === 'all') setParams({});
    else setParams({ status: k });
  }

  const title = useMemo(() => `${org?.name ?? ''} · ${org?.semester ?? ''}`, [org]);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-medium">회계 내역</h1>
          <div className="mt-0.5 text-sm text-neutral-500">{title}</div>
        </div>
        {canCreate && (
          <button onClick={() => setShowForm(true)}
            className="rounded-md bg-neutral-900 px-3 py-2 text-sm text-white">+ 내역 등록</button>
        )}
      </div>

      <div className="mb-3 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button key={f.key} onClick={() => setFilter(f.key)}
            className={`rounded-md border px-3 py-1.5 text-sm ${
              filter === f.key
                ? 'border-neutral-300 bg-neutral-900 text-white'
                : 'border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50'
            }`}>
            {f.label} {counts[f.key] ?? 0}
          </button>
        ))}
      </div>

      <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-neutral-200 bg-neutral-50 text-left text-neutral-500">
              <th className="px-4 py-2.5 font-medium">거래일</th>
              <th className="px-4 py-2.5 font-medium">사용처</th>
              <th className="px-4 py-2.5 font-medium">카테고리</th>
              <th className="px-4 py-2.5 text-right font-medium">금액</th>
              <th className="px-4 py-2.5 text-center font-medium">상태</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-neutral-400">불러오는 중…</td></tr>
            ) : txs.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-neutral-400">내역이 없습니다.</td></tr>
            ) : (
              txs.map((t) => (
                <tr key={t.id} onClick={() => setSelected(t)}
                  className="cursor-pointer border-b border-neutral-100 hover:bg-neutral-50">
                  <td className="px-4 py-2.5 text-neutral-500">{t.trade_date.slice(5)}</td>
                  <td className="px-4 py-2.5">{t.vendor ?? '-'}</td>
                  <td className="px-4 py-2.5 text-neutral-500">{t.category ?? '-'}</td>
                  <td className={`px-4 py-2.5 text-right ${t.tx_type === 'income' ? 'text-green-700' : ''}`}>
                    {formatAmount(t.amount, t.tx_type)}
                  </td>
                  <td className="px-4 py-2.5 text-center"><StatusBadge status={t.status} /></td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showForm && (
        <TransactionFormModal budgets={budgets} onClose={() => setShowForm(false)} onCreated={load} />
      )}
      {selected && (
        <TransactionDetailModal tx={selected} onClose={() => setSelected(null)} onChanged={load} />
      )}
    </div>
  );
}
