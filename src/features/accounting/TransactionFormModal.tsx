import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { createTransaction, type BudgetWithUsage } from './api';
import { CATEGORIES } from './ui';
import { runOcr } from '@/mocks/ocr';

interface Props {
  budgets: BudgetWithUsage[];
  onClose: () => void;
  onCreated: () => void;
}

export default function TransactionFormModal({ budgets, onClose, onCreated }: Props) {
  const { org, membership, session } = useAuth();
  const [tradeDate, setTradeDate] = useState(new Date().toISOString().slice(0, 10));
  const [txType, setTxType] = useState<'expense' | 'income'>('expense');
  const [budgetId, setBudgetId] = useState<string>(budgets[0]?.id ?? '');
  const [category, setCategory] = useState<string>(budgets[0]?.category ?? CATEGORIES[0]);
  const [amount, setAmount] = useState('');
  const [vendor, setVendor] = useState('');
  const [memo, setMemo] = useState('');
  const [ocrBusy, setOcrBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  // 예산 항목 선택 시 category 스냅샷도 함께 세팅
  function pickBudget(id: string) {
    setBudgetId(id);
    const b = budgets.find((x) => x.id === id);
    if (b) setCategory(b.category);
  }

  async function onOcr(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setOcrBusy(true);
    try {
      const r = await runOcr(file);
      setTradeDate(r.date);
      setAmount(String(r.amount));
      setVendor(r.vendor);
    } finally {
      setOcrBusy(false);
    }
  }

  async function submit() {
    setErr('');
    const amt = parseInt(amount.replace(/[^0-9]/g, ''), 10);
    if (!amt || amt <= 0) {
      setErr('금액을 입력하세요.');
      return;
    }
    setSaving(true);
    try {
      await createTransaction({
        org_id: org!.id,
        budget_id: txType === 'expense' ? budgetId || null : null,
        category, // 스냅샷
        payer_membership_id: membership?.id ?? null,
        trade_date: tradeDate,
        amount: amt,
        tx_type: txType,
        vendor: vendor || null,
        memo: memo || null,
        created_by: session?.user.id ?? null,
      });
      onCreated();
      onClose();
    } catch (e: any) {
      setErr(e.message ?? '등록에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-xl border border-neutral-200 bg-white p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <div className="text-base font-medium">내역 등록</div>
          <button onClick={onClose} className="text-neutral-400 hover:text-neutral-700">✕</button>
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex gap-2.5">
            <div className="flex-1">
              <label className="mb-1 block text-xs text-neutral-500">거래일</label>
              <input type="date" value={tradeDate} onChange={(e) => setTradeDate(e.target.value)}
                className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm" />
            </div>
            <div className="w-28">
              <label className="mb-1 block text-xs text-neutral-500">유형</label>
              <select value={txType} onChange={(e) => setTxType(e.target.value as any)}
                className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm">
                <option value="expense">지출</option>
                <option value="income">수입</option>
              </select>
            </div>
          </div>

          {txType === 'expense' && (
            <div>
              <label className="mb-1 block text-xs text-neutral-500">
                예산 항목 <span className="text-neutral-400">(집계 기준)</span>
              </label>
              <select value={budgetId} onChange={(e) => pickBudget(e.target.value)}
                className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm">
                {budgets.length === 0 && <option value="">예산 항목 없음</option>}
                {budgets.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.category} ({Math.round(b.ratio * 100)}% 사용)
                  </option>
                ))}
              </select>
            </div>
          )}

          {txType === 'income' && (
            <div>
              <label className="mb-1 block text-xs text-neutral-500">카테고리</label>
              <select value={category} onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm">
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          )}

          <div className="flex gap-2.5">
            <div className="flex-1">
              <label className="mb-1 block text-xs text-neutral-500">금액</label>
              <input value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="38000"
                className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm" />
            </div>
            <div className="flex-1">
              <label className="mb-1 block text-xs text-neutral-500">사용처</label>
              <input value={vendor} onChange={(e) => setVendor(e.target.value)} placeholder="메가커피"
                className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm" />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs text-neutral-500">내용 (선택)</label>
            <input value={memo} onChange={(e) => setMemo(e.target.value)}
              className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm" />
          </div>

          <label className="cursor-pointer rounded-md border border-dashed border-neutral-300 px-3 py-3 text-center text-sm text-neutral-500 hover:bg-neutral-50">
            {ocrBusy ? '영수증 분석 중…' : '영수증 업로드 → OCR 자동입력'}
            <div className="mt-0.5 text-xs text-neutral-400">JPG · PNG · PDF (데모: mock)</div>
            <input type="file" accept="image/*,.pdf" className="hidden" onChange={onOcr} disabled={ocrBusy} />
          </label>

          {err && <div className="text-xs text-red-600">{err}</div>}
        </div>

        <div className="mt-5 flex gap-2">
          <button onClick={onClose}
            className="flex-1 rounded-md border border-neutral-300 px-3 py-2 text-sm">취소</button>
          <button onClick={submit} disabled={saving}
            className="flex-1 rounded-md bg-neutral-900 px-3 py-2 text-sm text-white disabled:opacity-50">
            {saving ? '등록 중…' : '등록 (승인대기)'}
          </button>
        </div>
      </div>
    </div>
  );
}
