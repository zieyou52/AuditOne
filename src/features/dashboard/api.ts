import { supabase } from '@/lib/supabase';
import {
  fetchBudgetsWithUsage,
  fetchStatusCounts,
} from '@/features/accounting/api';

export interface DashboardSummary {
  totalBudget: number; // 1. 총예산 (budgets 합계)
  totalSpent: number; // 2. 총지출 (approved 지출 합계)
  balance: number; // 3. 잔액
  pendingCount: number; // 4. 승인대기 건수
  overBudgetCount: number; // 5. 예산초과 항목 수 (ratio > 1)
  auditCount: number; // 6. 감사알림 건수 (시드 포함)
  overBudgetNames: string[]; // 초과 항목명 (보조 표시용)
}

export async function fetchDashboardSummary(
  orgId: string
): Promise<DashboardSummary> {
  // 기존 두 함수 재사용 + 감사 count 만 추가 (head:true 로 행 미전송)
  const [budgets, counts, auditRes] = await Promise.all([
    fetchBudgetsWithUsage(orgId),
    fetchStatusCounts(orgId),
    supabase
      .from('audit_findings')
      .select('*', { count: 'exact', head: true })
      .eq('org_id', orgId),
  ]);

  const totalBudget = budgets.reduce((s, b) => s + b.planned_amount, 0);
  const totalSpent = budgets.reduce((s, b) => s + b.used, 0);
  const over = budgets.filter((b) => b.ratio > 1);

  return {
    totalBudget,
    totalSpent,
    balance: totalBudget - totalSpent,
    pendingCount: counts.pending,
    overBudgetCount: over.length,
    auditCount: auditRes.count ?? 0,
    overBudgetNames: over.map((b) => b.category),
  };
}
