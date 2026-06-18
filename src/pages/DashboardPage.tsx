import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { fetchDashboardSummary, type DashboardSummary } from '@/features/dashboard/api';
import { fetchBudgetsWithUsage, type BudgetWithUsage } from '@/features/accounting/api';

function won(n: number) {
  return n.toLocaleString('ko-KR');
}

export default function DashboardPage() {
  const { org, isSuperAdmin } = useAuth();
  const nav = useNavigate();
  const [sum, setSum] = useState<DashboardSummary | null>(null);
  const [budgets, setBudgets] = useState<BudgetWithUsage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!org) return;
    setLoading(true);
    Promise.all([fetchDashboardSummary(org.id), fetchBudgetsWithUsage(org.id)])
      .then(([s, b]) => { setSum(s); setBudgets(b); })
      .finally(() => setLoading(false));
  }, [org]);

  if (loading || !sum) {
    return <div className="text-sm text-neutral-500">불러오는 중…</div>;
  }

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-medium">대시보드</h1>
          <div className="mt-0.5 text-sm text-neutral-500">{org?.name}</div>
        </div>
        <span className="rounded-md bg-blue-50 px-2.5 py-1 text-xs text-blue-700">
          {isSuperAdmin ? '총무 뷰' : '구성원 뷰'}
        </span>
      </div>

      {/* 요약: 총무는 총예산/총지출/잔액, 구성원은 총지출/전체사용률 */}
      {isSuperAdmin ? (
        <div className="mb-3 grid grid-cols-3 gap-3">
          <div className="rounded-lg bg-white p-4 ring-1 ring-neutral-200">
            <div className="text-sm text-neutral-500">총 예산</div>
            <div className="mt-1 text-2xl font-medium">{won(sum.totalBudget)}</div>
          </div>
          <div className="rounded-lg bg-white p-4 ring-1 ring-neutral-200">
            <div className="text-sm text-neutral-500">총 지출</div>
            <div className="mt-1 text-2xl font-medium">{won(sum.totalSpent)}</div>
          </div>
          <div className="rounded-lg bg-white p-4 ring-1 ring-neutral-200">
            <div className="text-sm text-neutral-500">잔액</div>
            <div className={`mt-1 text-2xl font-medium ${sum.balance < 0 ? 'text-red-600' : 'text-green-700'}`}>
              {won(sum.balance)}
            </div>
          </div>
        </div>
      ) : (
        <div className="mb-3 grid grid-cols-2 gap-3">
          <div className="rounded-lg bg-white p-4 ring-1 ring-neutral-200">
            <div className="text-sm text-neutral-500">총 지출</div>
            <div className="mt-1 text-2xl font-medium">{won(sum.totalSpent)}</div>
          </div>
          <div className="rounded-lg bg-white p-4 ring-1 ring-neutral-200">
            <div className="text-sm text-neutral-500">전체 예산 사용률</div>
            <div className="mt-1 text-2xl font-medium">
              {sum.totalBudget > 0 ? Math.round((sum.totalSpent / sum.totalBudget) * 100) : 0}%
            </div>
          </div>
        </div>
      )}

      {/* 액션 카드 3종: 총무 전용 (승인대기/예산초과/감사알림) */}
      {isSuperAdmin && (
        <div className="mb-3 grid grid-cols-3 gap-3">
          <button onClick={() => nav('/accounting?status=pending')}
            className="rounded-xl border border-amber-300 bg-white p-4 text-left hover:bg-amber-50">
            <div className="text-sm text-amber-700">승인 대기</div>
            <div className="my-1 text-2xl font-medium">{sum.pendingCount}건</div>
            <div className="text-xs text-blue-600">바로 검토하기 →</div>
          </button>

          <button onClick={() => nav('/budget')}
            className="rounded-xl border border-red-300 bg-white p-4 text-left hover:bg-red-50">
            <div className="text-sm text-red-700">예산 초과</div>
            <div className="my-1 text-2xl font-medium">{sum.overBudgetCount}건</div>
            <div className="text-xs text-neutral-500">
              {sum.overBudgetNames.length ? sum.overBudgetNames.join(', ') : '초과 없음'}
            </div>
          </button>

          <button onClick={() => nav('/audit')}
            className="rounded-xl border border-neutral-300 bg-white p-4 text-left hover:bg-neutral-50">
            <div className="text-sm text-neutral-700">감사 알림</div>
            <div className="my-1 text-2xl font-medium">{sum.auditCount}건</div>
            <div className="text-xs text-neutral-500">자동 감사 결과</div>
          </button>
        </div>
      )}

      {/* 예산 사용률 바 */}
      <div className="rounded-xl border border-neutral-200 bg-white p-5">
        <div className="mb-3 text-sm font-medium">예산 사용률</div>
        {budgets.length === 0 ? (
          <div className="text-sm text-neutral-400">예산 항목이 없습니다.</div>
        ) : (
          budgets.map((b) => {
            const pct = Math.round(b.ratio * 100);
            const over = pct > 100;
            return (
              <div key={b.id} className="mb-3 last:mb-0">
                <div className="mb-1 flex justify-between text-sm">
                  <span>{b.category}</span>
                  <span className={over ? 'text-red-600' : 'text-neutral-500'}>
                    {won(b.used)} / {won(b.planned_amount)} · {pct}%
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded bg-neutral-100">
                  <div className={`h-full ${over ? 'bg-red-500' : 'bg-blue-500'}`}
                    style={{ width: `${Math.min(pct, 100)}%` }} />
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
