import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import type { PublicLedgerRow } from '@/lib/types';

export default function PublicLedgerPage() {
  const { orgId } = useParams();
  const [rows, setRows] = useState<PublicLedgerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(false);

  useEffect(() => {
    if (!orgId) return;
    supabase.rpc('public_ledger', { p_org: orgId }).then(({ data, error }) => {
      if (error) setErr(true);
      else setRows((data as PublicLedgerRow[]) ?? []);
      setLoading(false);
    });
  }, [orgId]);

  const { income, expense } = useMemo(() => {
    let income = 0, expense = 0;
    for (const r of rows) {
      if (r.tx_type === 'income') income += r.amount;
      else expense += r.amount;
    }
    return { income, expense };
  }, [rows]);

  const won = (n: number) => n.toLocaleString('ko-KR');

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <div className="border-b border-neutral-200 pb-5 text-center">
        <h1 className="text-xl font-medium">공개 회계</h1>
        <div className="mt-2 inline-block rounded-md bg-green-50 px-3 py-1 text-xs text-green-700">
          로그인 없이 누구나 열람 가능
        </div>
      </div>

      {loading ? (
        <p className="mt-6 text-sm text-neutral-500">불러오는 중…</p>
      ) : err ? (
        <p className="mt-6 text-sm text-red-600">데이터를 불러올 수 없습니다.</p>
      ) : (
        <>
          <div className="my-5 grid grid-cols-3 gap-3 text-center">
            <div className="rounded-lg bg-white p-3 ring-1 ring-neutral-200">
              <div className="text-xs text-neutral-500">총 수입</div>
              <div className="mt-1 text-lg font-medium text-green-700">{won(income)}</div>
            </div>
            <div className="rounded-lg bg-white p-3 ring-1 ring-neutral-200">
              <div className="text-xs text-neutral-500">총 지출</div>
              <div className="mt-1 text-lg font-medium">{won(expense)}</div>
            </div>
            <div className="rounded-lg bg-white p-3 ring-1 ring-neutral-200">
              <div className="text-xs text-neutral-500">잔액</div>
              <div className="mt-1 text-lg font-medium">{won(income - expense)}</div>
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-200 bg-neutral-50 text-left text-neutral-500">
                  <th className="px-4 py-2.5 font-medium">날짜</th>
                  <th className="px-4 py-2.5 font-medium">사용처</th>
                  <th className="px-4 py-2.5 font-medium">카테고리</th>
                  <th className="px-4 py-2.5 text-right font-medium">금액</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr><td colSpan={4} className="px-4 py-8 text-center text-neutral-400">공개된 내역이 없습니다.</td></tr>
                ) : rows.map((r, i) => (
                  <tr key={i} className="border-b border-neutral-100">
                    <td className="px-4 py-2.5 text-neutral-500">{r.trade_date.slice(5)}</td>
                    <td className="px-4 py-2.5">{r.vendor ?? '-'}</td>
                    <td className="px-4 py-2.5 text-neutral-500">{r.category ?? '-'}</td>
                    <td className={`px-4 py-2.5 text-right ${r.tx_type === 'income' ? 'text-green-700' : ''}`}>
                      {r.tx_type === 'income' ? '+' : '-'}{won(r.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 rounded-md border border-neutral-200 bg-white p-3 text-xs leading-relaxed text-neutral-500">
            승인완료된 거래만 표시됩니다. 계좌번호·연락처·개인정보는 public_ledger 함수에서 원천적으로 제외되어 노출되지 않습니다.
          </div>
        </>
      )}
    </div>
  );
}
