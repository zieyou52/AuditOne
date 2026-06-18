-- ============================================================
-- AuditOne — Supabase (PostgreSQL) Schema v1.0
-- 학생 단체 회계·감사·예산 관리 플랫폼
--
-- 설계 원칙
--  1) 권한: 세부 권한(permissions)을 마스터로 저장, UI는 6묶음 노출
--  2) 권한은 user가 아니라 membership에 부여 (멀티 단체 소속 대응)
--  3) 승인은 별도 테이블 없이 transactions.status로 통합
--  4) budget_id FK로 집계, category는 스냅샷 용도(집계에 사용 안 함)
--  5) P2(OCR/감사)는 테이블 존재 + 플래그로 실제/시드 구분
--  6) RLS = "조직 격리"까지만. 세부 기능 권한은 앱 레이어에서 체크
-- ============================================================

-- 확장 (uuid 생성용)
create extension if not exists "pgcrypto";

-- ============================================================
-- ENUM 타입
-- ============================================================
create type org_type        as enum ('club','academic','council','startup','project','etc');
create type member_status   as enum ('active','inactive','pending');
create type invite_method    as enum ('code','link','email');
create type tx_type          as enum ('income','expense');
create type tx_status        as enum ('draft','pending','approved','rejected');
create type finding_type     as enum ('missing_receipt','duplicate','budget_over','amount_anomaly','date_anomaly');
create type finding_severity as enum ('info','warning','critical');

-- ============================================================
-- 1. 사용자 (Supabase auth.users와 1:1 매핑되는 프로필)
--    id = auth.uid()
-- ============================================================
create table users (
  id           uuid primary key references auth.users(id) on delete cascade,
  email        text not null,
  name         text not null,
  student_no   text,
  created_at   timestamptz not null default now()
);

-- ============================================================
-- 2. 단체
-- ============================================================
create table organizations (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  school      text,
  org_type    org_type not null default 'club',
  semester    text,
  created_by  uuid references users(id),
  created_at  timestamptz not null default now()
);

-- ============================================================
-- 3. 멤버십 (user × org). 권한/직책/상태가 여기 매달림
-- ============================================================
create table memberships (
  id              uuid primary key default gen_random_uuid(),
  org_id          uuid not null references organizations(id) on delete cascade,
  user_id         uuid not null references users(id) on delete cascade,
  role_label      text,                        -- 표시용 (회장/부회장/운영진…) 권한과 무관
  is_super_admin  boolean not null default false,  -- 총무 플래그
  status          member_status not null default 'active',
  joined_at       timestamptz not null default now(),
  unique (org_id, user_id)
);

-- ============================================================
-- 4. 초대
-- ============================================================
create table invites (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references organizations(id) on delete cascade,
  code        text not null unique,
  method      invite_method not null default 'code',
  email       text,                            -- email 초대 시
  expires_at  timestamptz,
  created_at  timestamptz not null default now()
);

-- ============================================================
-- 5. 권한 마스터 (세부 권한). group_key = UI 6묶음 매핑
-- ============================================================
create table permissions (
  key        text primary key,                 -- 예: 'account.read'
  group_key  text not null,                     -- 예: 'accounting'
  label      text not null
);

-- ============================================================
-- 6. 멤버 권한 (membership × permission 다대다)
--    UI 묶음 토글 ON  = 해당 group_key 권한 일괄 INSERT
--                 OFF = 일괄 DELETE
-- ============================================================
create table member_permissions (
  id              uuid primary key default gen_random_uuid(),
  membership_id   uuid not null references memberships(id) on delete cascade,
  permission_key  text not null references permissions(key) on delete cascade,
  granted_at      timestamptz not null default now(),
  unique (membership_id, permission_key)
);

-- ============================================================
-- 7. 권한 변경 이력 (수정하기 저장 시 diff 단위로 기록)
-- ============================================================
create table permission_logs (
  id                    uuid primary key default gen_random_uuid(),
  org_id                uuid not null references organizations(id) on delete cascade,
  actor_id              uuid references users(id),       -- 변경한 사람(총무)
  target_membership_id  uuid references memberships(id) on delete cascade,
  change                text not null,                   -- 예: '회계 승인 권한 추가'
  created_at            timestamptz not null default now()
);

-- ============================================================
-- 8. 예산
-- ============================================================
create table budgets (
  id              uuid primary key default gen_random_uuid(),
  org_id          uuid not null references organizations(id) on delete cascade,
  category        text not null,               -- 행사비/운영비/홍보비…
  planned_amount  integer not null default 0,
  created_at      timestamptz not null default now()
);

-- ============================================================
-- 9. 회계 내역. budget_id FK로 집계, category는 스냅샷
-- ============================================================
create table transactions (
  id                  uuid primary key default gen_random_uuid(),
  org_id              uuid not null references organizations(id) on delete cascade,
  budget_id           uuid references budgets(id) on delete set null,  -- 집계 기준
  payer_membership_id uuid references memberships(id) on delete set null,
  trade_date          date not null,
  amount              integer not null,
  tx_type             tx_type not null,
  category            text,                     -- 스냅샷(거래 시점 분류). 집계엔 미사용
  vendor              text,                     -- 사용처
  memo                text,
  status              tx_status not null default 'draft',
  reject_reason       text,                     -- 반려 사유
  approved_by         uuid references memberships(id),
  created_by          uuid references users(id),
  created_at          timestamptz not null default now()
);

-- ============================================================
-- 10. 영수증. ocr_mocked로 실제/mock 구분 (P1)
-- ============================================================
create table receipts (
  id              uuid primary key default gen_random_uuid(),
  transaction_id  uuid not null references transactions(id) on delete cascade,
  file_url        text not null,
  ocr_result      jsonb,                        -- {date, amount, vendor, biz_name}
  ocr_mocked      boolean not null default true,
  created_at      timestamptz not null default now()
);

-- ============================================================
-- 11. 감사 결과 (P2). is_seed로 데모 시드 구분
-- ============================================================
create table audit_findings (
  id              uuid primary key default gen_random_uuid(),
  org_id          uuid not null references organizations(id) on delete cascade,
  transaction_id  uuid references transactions(id) on delete cascade,
  finding_type    finding_type not null,
  severity        finding_severity not null default 'warning',
  detail          text,
  is_seed         boolean not null default true,   -- 데모용 시드 여부
  created_at      timestamptz not null default now()
);

-- ============================================================
-- 인덱스 (조회 패턴 기준)
-- ============================================================
create index idx_memberships_org       on memberships(org_id);
create index idx_memberships_user      on memberships(user_id);
create index idx_member_perms_ms       on member_permissions(membership_id);
create index idx_tx_org                on transactions(org_id);
create index idx_tx_status             on transactions(org_id, status);
create index idx_tx_budget             on transactions(budget_id);
create index idx_budgets_org           on budgets(org_id);
create index idx_receipts_tx           on receipts(transaction_id);
create index idx_findings_org          on audit_findings(org_id);
create index idx_perm_logs_org         on permission_logs(org_id);

-- ============================================================
-- 헬퍼 함수: 현재 사용자가 속한 org 목록 (RLS에서 재사용)
--  security definer로 memberships를 우회 조회 → RLS 재귀 방지
-- ============================================================
create or replace function my_org_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select org_id from memberships where user_id = auth.uid();
$$;

create or replace function is_super_admin(target_org uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from memberships
    where user_id = auth.uid()
      and org_id = target_org
      and is_super_admin = true
  );
$$;

-- ============================================================
-- RLS: 조직 격리. "내가 속한 org의 데이터만"
--  세부 기능 권한(수정/승인 등)은 앱 레이어 + member_permissions로 체크
-- ============================================================
alter table users               enable row level security;
alter table organizations       enable row level security;
alter table memberships         enable row level security;
alter table invites             enable row level security;
alter table permissions         enable row level security;
alter table member_permissions  enable row level security;
alter table permission_logs     enable row level security;
alter table budgets             enable row level security;
alter table transactions        enable row level security;
alter table receipts            enable row level security;
alter table audit_findings      enable row level security;

-- users: 본인 프로필 + 같은 org 멤버 조회 가능
create policy users_self_select on users for select
  using (id = auth.uid()
         or id in (select user_id from memberships where org_id in (select my_org_ids())));
create policy users_self_upsert on users for insert with check (id = auth.uid());
create policy users_self_update on users for update using (id = auth.uid());

-- organizations: 내가 속한 org만 조회 / 생성은 누구나(생성자 본인)
create policy orgs_member_select on organizations for select
  using (id in (select my_org_ids()));
create policy orgs_insert on organizations for insert
  with check (created_by = auth.uid());
create policy orgs_admin_update on organizations for update
  using (is_super_admin(id));

-- memberships: 같은 org 멤버 조회 / 총무만 변경
create policy ms_select on memberships for select
  using (org_id in (select my_org_ids()));
create policy ms_admin_write on memberships for insert
  with check (is_super_admin(org_id));
create policy ms_admin_update on memberships for update
  using (is_super_admin(org_id));
create policy ms_admin_delete on memberships for delete
  using (is_super_admin(org_id));

-- invites: 총무만
create policy inv_admin_all on invites for all
  using (is_super_admin(org_id)) with check (is_super_admin(org_id));

-- permissions: 마스터 테이블, 로그인 사용자 전체 읽기 전용
create policy perm_read on permissions for select using (auth.uid() is not null);

-- member_permissions: 같은 org 조회 / 총무만 변경
create policy mp_select on member_permissions for select
  using (membership_id in (select id from memberships where org_id in (select my_org_ids())));
create policy mp_admin_write on member_permissions for all
  using (membership_id in (select id from memberships where is_super_admin(org_id)))
  with check (membership_id in (select id from memberships where is_super_admin(org_id)));

-- permission_logs: 같은 org 조회 / 총무만 기록
create policy plog_select on permission_logs for select
  using (org_id in (select my_org_ids()));
create policy plog_admin_insert on permission_logs for insert
  with check (is_super_admin(org_id));

-- budgets / transactions / receipts / audit_findings: org 격리
create policy budgets_select on budgets for select using (org_id in (select my_org_ids()));
create policy budgets_write  on budgets for all using (org_id in (select my_org_ids())) with check (org_id in (select my_org_ids()));

create policy tx_select on transactions for select using (org_id in (select my_org_ids()));
create policy tx_write  on transactions for all using (org_id in (select my_org_ids())) with check (org_id in (select my_org_ids()));

create policy rc_select on receipts for select
  using (transaction_id in (select id from transactions where org_id in (select my_org_ids())));
create policy rc_write on receipts for all
  using (transaction_id in (select id from transactions where org_id in (select my_org_ids())))
  with check (transaction_id in (select id from transactions where org_id in (select my_org_ids())));

create policy find_select on audit_findings for select using (org_id in (select my_org_ids()));
create policy find_write  on audit_findings for all using (org_id in (select my_org_ids())) with check (org_id in (select my_org_ids()));

-- 공개 회계 페이지: 비로그인 접근이 필요하면 별도 RPC(security definer)로
-- 화이트리스트 컬럼만 반환 권장 (계좌/개인정보 제외). 아래는 예시.
create or replace function public_ledger(p_org uuid)
returns table (trade_date date, category text, amount integer, tx_type tx_type, vendor text)
language sql
stable
security definer
set search_path = public
as $$
  select trade_date, category, amount, tx_type, vendor
  from transactions
  where org_id = p_org and status = 'approved'
  order by trade_date desc;
$$;

-- ============================================================
-- 권한 마스터 시드 (세부 권한 → 6 UI 묶음)
-- ============================================================
insert into permissions (key, group_key, label) values
  ('account.read',    'accounting', '회계 조회'),
  ('account.create',  'accounting', '회계 등록'),
  ('account.update',  'accounting', '회계 수정'),
  ('account.delete',  'accounting', '회계 삭제'),
  ('account.approve', 'approval',   '회계 승인'),
  ('account.reject',  'approval',   '회계 반려'),
  ('budget.read',     'budget',     '예산 조회'),
  ('budget.update',   'budget',     '예산 수정'),
  ('report.read',     'reports',    '보고서 조회'),
  ('report.create',   'reports',    '보고서 생성'),
  ('audit.use',       'audit',      '감사 기능 사용'),
  ('audit.review',    'audit',      '이상 거래 확인'),
  ('member.manage',   'members',    '구성원 관리'),
  ('notice.manage',   'members',    '공지사항 관리');
