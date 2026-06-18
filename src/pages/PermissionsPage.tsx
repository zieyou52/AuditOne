import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
  fetchMatrix,
  savePermissionChanges,
  GROUP_ORDER,
  GROUP_LABELS,
  type MatrixMember,
  type GroupChange,
} from '@/features/permissions/api';
import type { GroupKey } from '@/lib/permissions';

export default function PermissionsPage() {
  const { org, session } = useAuth();
  const [rows, setRows] = useState<MatrixMember[]>([]);
  // draft[membershipId][group] = boolean (현재 화면 토글 상태)
  const [draft, setDraft] = useState<Record<string, Record<GroupKey, boolean>>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!org) return;
    setLoading(true);
    try {
      const m = await fetchMatrix(org.id);
      setRows(m);
      const d: Record<string, Record<GroupKey, boolean>> = {};
      for (const r of m) d[r.membershipId] = { ...r.groups };
      setDraft(d);
    } finally {
      setLoading(false);
    }
  }, [org]);

  useEffect(() => { load(); }, [load]);

  // 초기 상태 대비 변경된 (membership, group) 추출
  const changes: GroupChange[] = useMemo(() => {
    const out: GroupChange[] = [];
    for (const r of rows) {
      if (r.isSuperAdmin) continue;
      for (const g of GROUP_ORDER) {
        const now = draft[r.membershipId]?.[g];
        if (now !== undefined && now !== r.groups[g]) {
          out.push({ membershipId: r.membershipId, group: g, enabled: now });
        }
      }
    }
    return out;
  }, [rows, draft]);

  const dirty = changes.length;

  // 이탈 경고
  useEffect(() => {
    if (!dirty) return;
    const h = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', h);
    return () => window.removeEventListener('beforeunload', h);
  }, [dirty]);

  function toggle(member: MatrixMember, g: GroupKey) {
    if (member.isSuperAdmin) return;
    setDraft((prev) => ({
      ...prev,
      [member.membershipId]: {
        ...prev[member.membershipId],
        [g]: !prev[member.membershipId][g],
      },
    }));
  }

  async function save() {
    if (!org || !session || !dirty) return;
    setSaving(true);
    try {
      await savePermissionChanges(org.id, session.user.id, changes);
      await load(); // 저장 후 초기 상태 갱신 → dirty 0
    } catch (e: any) {
      alert('저장 실패: ' + (e.message ?? ''));
    } finally {
      setSaving(false);
    }
  }

  function changed(member: MatrixMember, g: GroupKey) {
    return !member.isSuperAdmin && draft[member.membershipId]?.[g] !== member.groups[g];
  }

  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <h1 className="text-xl font-medium">권한 관리</h1>
        <span className="rounded-md bg-blue-50 px-2.5 py-1 text-xs text-blue-700">총무 전용</span>
      </div>
      <p className="mb-4 text-sm text-neutral-500">
        각 셀을 눌러 토글한 뒤 하단 수정하기로 한 번에 저장합니다. UI는 6묶음, 내부는 세부 권한으로 저장됩니다.
      </p>

      {loading ? (
        <p className="text-sm text-neutral-500">불러오는 중…</p>
      ) : (
        <>
          <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-white">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="border-b border-neutral-200 bg-neutral-50 text-neutral-500">
                  <th className="px-4 py-2.5 text-left font-medium">구성원</th>
                  {GROUP_ORDER.map((g) => (
                    <th key={g} className="px-2 py-2.5 text-center font-medium">{GROUP_LABELS[g]}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((m) => (
                  <tr key={m.membershipId} className="border-b border-neutral-100">
                    <td className="px-4 py-2">
                      <div className="font-medium">{m.name}</div>
                      <div className="text-xs text-neutral-400">
                        {m.roleLabel}{m.isSuperAdmin ? ' · 전체권한' : ''}
                      </div>
                    </td>
                    {GROUP_ORDER.map((g) => {
                      const on = m.isSuperAdmin ? true : draft[m.membershipId]?.[g];
                      const isChanged = changed(m, g);
                      return (
                        <td key={g} className="px-2 py-2 text-center">
                          <button
                            onClick={() => toggle(m, g)}
                            disabled={m.isSuperAdmin}
                            className={`inline-flex h-6 w-8 items-center justify-center rounded-md border text-xs
                              ${m.isSuperAdmin
                                ? 'cursor-not-allowed border-neutral-200 bg-neutral-50 text-neutral-300'
                                : on
                                ? 'border-blue-300 bg-blue-50 text-blue-700'
                                : 'border-neutral-200 bg-white text-neutral-300'}
                              ${isChanged ? 'ring-2 ring-amber-400' : ''}`}
                          >
                            {on ? '✓' : '−'}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex items-center justify-between">
            <div className={`text-sm ${dirty ? 'text-amber-700' : 'text-neutral-400'}`}>
              {dirty ? `저장되지 않은 변경 ${dirty}건` : '변경 사항 없음'}
            </div>
            <button onClick={save} disabled={!dirty || saving}
              className="rounded-md bg-neutral-900 px-4 py-2 text-sm text-white disabled:opacity-40">
              {saving ? '저장 중…' : '수정하기'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
