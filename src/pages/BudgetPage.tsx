import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { fetchBudgetsWithUsage, type BudgetWithUsage } from '@/features/accounting/api';

export default function BudgetPage() {
  const { org } = useAuth();
  const [budgets, setBudgets] = useState<BudgetWithUsage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!org) return;
    fetchBudgetsWithUsage(org.id).then((b) => { setBudgets(b); setLoading(false); });
  }, [org]);

  return (
    <div>
      <h1 className="text-xl font-medium">예산</h1>
      <p className="mt-0.5 mb-4 text-sm text-neutral-500">budget_id 기준 집계 · 초과 항목 강조</p>
      {loading ? <p className="text-sm text-neutral-500">불러오는 중…</p> : (
        <div className="rounded-xl border border-neutral-200 bg-white p-5">
          {budgets.map((b) => {
            const pct = Math.round(b.ratio * 100);
            const over = pct > 100;
            return (
              <div key={b.id} className="mb-3 last:mb-0">
                <div className="mb-1 flex justify-between text-sm">
                  <span>{b.category}</span>
                  <span className={over ? 'text-red-600' : 'text-neutral-500'}>
                    {b.used.toLocaleString()} / {b.planned_amount.toLocaleString()} · {pct}%
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded bg-neutral-100">
                  <div className={`h-full ${over ? 'bg-red-500' : 'bg-blue-500'}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
