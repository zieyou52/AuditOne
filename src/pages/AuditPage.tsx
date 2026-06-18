import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import type { AuditFinding } from '@/lib/types';

export default function AuditPage() {
  const { org } = useAuth();
  const [findings, setFindings] = useState<AuditFinding[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!org) return;
    supabase.from('audit_findings').select('*').eq('org_id', org.id)
      .then(({ data }) => { setFindings((data as AuditFinding[]) ?? []); setLoading(false); });
  }, [org]);

  return (
    <div>
      <h1 className="text-xl font-medium">감사</h1>
      <p className="mt-0.5 mb-4 text-sm text-neutral-500">자동 감사 결과 (MVP: 시드 데이터 표시)</p>
      {loading ? <p className="text-sm text-neutral-500">불러오는 중…</p> : (
        <div className="flex flex-col gap-2">
          {findings.map((f) => (
            <div key={f.id} className={`rounded-lg border bg-white p-3 text-sm ${
              f.severity === 'critical' ? 'border-red-300' : 'border-amber-300'
            }`}>
              <span className={f.severity === 'critical' ? 'text-red-700' : 'text-amber-700'}>
                ⚠ {f.detail}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
