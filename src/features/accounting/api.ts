import { supabase } from '@/lib/supabase';
import type { Budget, Transaction, TxStatus } from '@/lib/types';

export interface BudgetWithUsage extends Budget {
  used: number; // 승인완료 지출 합계 (budget_id 기준)
  ratio: number; // used / planned (0~)
}

// 거래 목록 (budgets 조인). status 필터 옵션.
export async function fetchTransactions(
  orgId: string,
  status?: TxStatus
): Promise<Transaction[]> {
  let q = supabase
    .from('transactions')
    .select('*')
    .eq('org_id', orgId)
    .order('trade_date', { ascending: false });
  if (status) q = q.eq('status', status);
  const { data, error } = await q;
  if (error) throw error;
  return (data as Transaction[]) ?? [];
}

// 상태별 건수 (필터 칩 카운트)
export async function fetchStatusCounts(
  orgId: string
): Promise<Record<'all' | TxStatus, number>> {
  const { data, error } = await supabase
    .from('transactions')
    .select('status')
    .eq('org_id', orgId);
  if (error) throw error;
  const rows = (data as { status: TxStatus }[]) ?? [];
  const counts = { all: rows.length, draft: 0, pending: 0, approved: 0, rejected: 0 };
  for (const r of rows) counts[r.status]++;
  return counts;
}

export interface NewTransaction {
  org_id: string;
  budget_id: string | null;
  category: string | null; // 스냅샷
  payer_membership_id: string | null;
  trade_date: string;
  amount: number;
  tx_type: 'income' | 'expense';
  vendor: string | null;
  memo: string | null;
  created_by: string | null;
}

// 등록: 항상 pending 으로 진입
export async function createTransaction(tx: NewTransaction): Promise<Transaction> {
  const { data, error } = await supabase
    .from('transactions')
    .insert({ ...tx, status: 'pending' })
    .select()
    .single();
  if (error) throw error;
  return data as Transaction;
}

export async function updateTransaction(
  id: string,
  patch: Partial<Transaction>
): Promise<void> {
  const { error } = await supabase.from('transactions').update(patch).eq('id', id);
  if (error) throw error;
}

export async function approveTransaction(
  id: string,
  approverMembershipId: string
): Promise<void> {
  await updateTransaction(id, {
    status: 'approved',
    approved_by: approverMembershipId,
    reject_reason: null,
  });
}

export async function rejectTransaction(id: string, reason: string): Promise<void> {
  await updateTransaction(id, { status: 'rejected', reject_reason: reason });
}

export async function deleteTransaction(id: string): Promise<void> {
  const { error } = await supabase.from('transactions').delete().eq('id', id);
  if (error) throw error;
}

// 예산 + 사용률 (budget_id 기준 집계, category 문자열 미사용)
export async function fetchBudgetsWithUsage(
  orgId: string
): Promise<BudgetWithUsage[]> {
  const [{ data: budgets, error: be }, { data: txs, error: te }] = await Promise.all([
    supabase.from('budgets').select('*').eq('org_id', orgId),
    supabase
      .from('transactions')
      .select('budget_id, amount')
      .eq('org_id', orgId)
      .eq('tx_type', 'expense')
      .eq('status', 'approved'),
  ]);
  if (be) throw be;
  if (te) throw te;

  const usedMap = new Map<string, number>();
  for (const t of (txs as { budget_id: string | null; amount: number }[]) ?? []) {
    if (!t.budget_id) continue;
    usedMap.set(t.budget_id, (usedMap.get(t.budget_id) ?? 0) + t.amount);
  }
  return ((budgets as Budget[]) ?? []).map((b) => {
    const used = usedMap.get(b.id) ?? 0;
    return { ...b, used, ratio: b.planned_amount > 0 ? used / b.planned_amount : 0 };
  });
}
