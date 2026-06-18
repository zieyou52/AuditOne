import { supabase } from '@/lib/supabase';
import {
  PERMISSION_GROUPS,
  GROUP_ORDER,
  GROUP_LABELS,
  groupState,
  type GroupKey,
} from '@/lib/permissions';

export interface MatrixMember {
  membershipId: string;
  name: string;
  roleLabel: string | null;
  isSuperAdmin: boolean;
  held: Set<string>; // 보유 세부 권한 key
  groups: Record<GroupKey, boolean>; // 묶음 ON/OFF (초기 상태)
}

// org 의 멤버 + 각자 보유 권한 로드
export async function fetchMatrix(orgId: string): Promise<MatrixMember[]> {
  const { data, error } = await supabase
    .from('memberships')
    .select('id, role_label, is_super_admin, users(name), member_permissions(permission_key)')
    .eq('org_id', orgId)
    .order('is_super_admin', { ascending: false });
  if (error) throw error;

  return ((data as any[]) ?? []).map((m) => {
    const held = new Set<string>(
      (m.member_permissions ?? []).map((p: any) => p.permission_key as string)
    );
    return {
      membershipId: m.id,
      name: m.users?.name ?? '(이름 없음)',
      roleLabel: m.role_label,
      isSuperAdmin: m.is_super_admin,
      held,
      groups: groupState(held),
    };
  });
}

export interface GroupChange {
  membershipId: string;
  group: GroupKey;
  enabled: boolean;
}

// diff 기반 일괄 저장: 묶음 ON → 세부권한 전체 upsert, OFF → 전체 delete
// 변경 1건마다 permission_logs 기록
export async function savePermissionChanges(
  orgId: string,
  actorUserId: string,
  changes: GroupChange[]
): Promise<void> {
  for (const c of changes) {
    const keys = PERMISSION_GROUPS[c.group];

    if (c.enabled) {
      const rows = keys.map((k) => ({
        membership_id: c.membershipId,
        permission_key: k,
      }));
      const { error } = await supabase
        .from('member_permissions')
        .upsert(rows, {
          onConflict: 'membership_id,permission_key',
          ignoreDuplicates: true,
        });
      if (error) throw error;
    } else {
      const { error } = await supabase
        .from('member_permissions')
        .delete()
        .eq('membership_id', c.membershipId)
        .in('permission_key', keys as unknown as string[]);
      if (error) throw error;
    }

    const { error: logErr } = await supabase.from('permission_logs').insert({
      org_id: orgId,
      actor_id: actorUserId,
      target_membership_id: c.membershipId,
      change: `${GROUP_LABELS[c.group]} 권한 ${c.enabled ? '추가' : '회수'}`,
    });
    if (logErr) throw logErr;
  }
}

export { GROUP_ORDER, GROUP_LABELS };
