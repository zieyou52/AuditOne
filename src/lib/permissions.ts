// UI는 6묶음 토글, DB는 세부 권한(key) 단위 저장.
// 매핑은 여기 한 곳에서만 관리한다 (DB 스키마 변경 없이 UI 확장 가능).

export const PERMISSION_GROUPS = {
  accounting: ['account.read', 'account.create', 'account.update', 'account.delete'],
  approval: ['account.approve', 'account.reject'],
  budget: ['budget.read', 'budget.update'],
  reports: ['report.read', 'report.create'],
  audit: ['audit.use', 'audit.review'],
  members: ['member.manage', 'notice.manage'],
} as const;

export type GroupKey = keyof typeof PERMISSION_GROUPS;

export type PermissionKey =
  (typeof PERMISSION_GROUPS)[GroupKey][number];

export const GROUP_ORDER: GroupKey[] = [
  'accounting',
  'approval',
  'budget',
  'reports',
  'audit',
  'members',
];

export const GROUP_LABELS: Record<GroupKey, string> = {
  accounting: '회계',
  approval: '승인',
  budget: '예산',
  reports: '보고서',
  audit: '감사',
  members: '구성원',
};

// 보유 권한 set 기준으로 묶음이 ON 인지 계산 (MVP: 부분 보유 없음 → every)
export function groupState(held: Set<string>): Record<GroupKey, boolean> {
  const out = {} as Record<GroupKey, boolean>;
  for (const g of GROUP_ORDER) {
    out[g] = PERMISSION_GROUPS[g].every((k) => held.has(k));
  }
  return out;
}

// 세부 권한 보유 여부 (총무는 전체 보유로 간주)
export function can(
  held: Set<string>,
  key: PermissionKey,
  isSuperAdmin: boolean
): boolean {
  return isSuperAdmin || held.has(key);
}
