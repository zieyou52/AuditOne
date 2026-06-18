-- ============================================================
-- AuditOne 시연용 시드 데이터
-- 주의: auth.users 에 먼저 사용자가 있어야 함 (Supabase Auth 가입 후 실행)
-- 아래 :uid 를 본인 auth.users.id 로 치환하거나, 가입한 유저 id 를 넣으세요.
-- ============================================================

-- 0) 본인 uid 확인: select id, email from auth.users;
-- 아래 블록에서 'YOUR-AUTH-UID' 를 실제 uid 로 바꾼 뒤 실행.

do $$
declare
  v_uid uuid := 'YOUR-AUTH-UID';      -- ← 치환
  v_org uuid;
  v_ms  uuid;
  b_event uuid; b_ops uuid; b_promo uuid;
begin
  -- 프로필
  insert into users (id, email, name, student_no)
  values (v_uid, 'demo@ewha.ac.kr', '김총무', '20231234')
  on conflict (id) do nothing;

  -- 단체
  insert into organizations (name, school, org_type, semester, created_by)
  values ('IT동아리 UNIS', '이화여자대학교', 'club', '2026-1학기', v_uid)
  returning id into v_org;

  -- 총무 멤버십 (전체권한)
  insert into memberships (org_id, user_id, role_label, is_super_admin, status)
  values (v_org, v_uid, '총무', true, 'active')
  returning id into v_ms;

  -- 예산
  insert into budgets (org_id, category, planned_amount) values (v_org, '행사비', 1000000) returning id into b_event;
  insert into budgets (org_id, category, planned_amount) values (v_org, '운영비', 300000)  returning id into b_ops;
  insert into budgets (org_id, category, planned_amount) values (v_org, '홍보비', 200000)  returning id into b_promo;

  -- 거래 (승인완료 + 승인대기 + 반려 섞기)
  insert into transactions (org_id, budget_id, payer_membership_id, trade_date, amount, tx_type, category, vendor, status, created_by) values
    (v_org, null,    v_ms, '2026-08-10', 500000, 'income',  '수입',   '학생회비 입금', 'approved', v_uid),
    (v_org, b_event, v_ms, '2026-08-05', 24000,  'expense', '행사비', '정기모임 다과', 'approved', v_uid),
    (v_org, b_event, v_ms, '2026-08-03', 706000, 'expense', '행사비', '워크샵 대관',   'approved', v_uid),
    (v_org, b_ops,   v_ms, '2026-08-12', 52400,  'expense', '도서',   '교보문고',     'approved', v_uid),
    (v_org, b_ops,   v_ms, '2026-08-07', 71000,  'expense', '운영비', '비품 구입',     'approved', v_uid),
    (v_org, b_promo, v_ms, '2026-08-02', 210000, 'expense', '홍보비', '현수막 제작',   'approved', v_uid),
    (v_org, b_event, v_ms, '2026-08-14', 38000,  'expense', '식비',   '메가커피 신촌점','pending',  v_uid),
    (v_org, b_ops,   v_ms, '2026-08-13', 15000,  'expense', '교통비', '택시',         'pending',  v_uid),
    (v_org, b_promo, v_ms, '2026-08-11', 9000,   'expense', '홍보비', '스티커 인쇄',   'pending',  v_uid),
    (v_org, b_promo, v_ms, '2026-08-08', 91000,  'expense', '홍보비', '쿠팡 현수막',   'rejected', v_uid);

  -- 감사 시드 (P2: 표시용)
  insert into audit_findings (org_id, finding_type, severity, detail, is_seed) values
    (v_org, 'missing_receipt', 'warning',  '영수증 누락 (08-14 메가커피)', true),
    (v_org, 'missing_receipt', 'warning',  '영수증 누락 (08-05 다과)',     true),
    (v_org, 'missing_receipt', 'warning',  '영수증 누락 (07-28 교통비)',   true),
    (v_org, 'duplicate',       'warning',  '중복 결제 의심',               true),
    (v_org, 'duplicate',       'warning',  '중복 결제 의심',               true),
    (v_org, 'budget_over',     'critical', '홍보비 예산 초과 105%',        true);

  raise notice '시드 완료: org=%', v_org;
end $$;
