import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import type { Organization } from '@/lib/types';

export default function OrgSelectPage() {
  const { selectOrg } = useAuth();
  const nav = useNavigate();
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from('organizations').select('*').then(({ data }) => {
      setOrgs((data as Organization[]) ?? []);
      setLoading(false);
    });
  }, []);

  async function pick(o: Organization) {
    await selectOrg(o);
    nav('/dashboard');
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="text-xl font-medium">단체 선택</h1>
      {loading ? (
        <p className="mt-4 text-sm text-neutral-500">불러오는 중…</p>
      ) : orgs.length === 0 ? (
        <p className="mt-4 text-sm text-neutral-500">소속된 단체가 없습니다. 초대 코드로 합류하거나 단체를 생성하세요.</p>
      ) : (
        <div className="mt-5 flex flex-col gap-2">
          {orgs.map((o) => (
            <button key={o.id} onClick={() => pick(o)}
              className="rounded-lg border border-neutral-200 bg-white px-4 py-3 text-left hover:bg-neutral-50">
              <div className="font-medium">{o.name}</div>
              <div className="text-xs text-neutral-500">{o.school} · {o.semester}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
