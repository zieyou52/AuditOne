# AuditOne — 학생 단체 회계·감사 플랫폼 (MVP)

React (Vite) + TypeScript + Tailwind + Supabase. NoOps MVP.

## 셋업

```bash
npm install
cp .env.example .env   # Supabase URL / anon key 입력
npm run dev
```

## Supabase 준비

1. Supabase 프로젝트 생성
2. SQL Editor 에 `schema.sql` (별도 제공) 실행 — 테이블 + RLS + 권한 시드 + RPC
3. Storage 버킷 `receipts` 생성
4. `.env` 에 프로젝트 URL / anon key 입력

## MVP 구현 범위

| 화면 | 경로 | 상태 |
|---|---|---|
| 로그인/회원가입 | `/login` | 구현 (Supabase Auth) |
| 단체 선택 | `/orgs` | 구현 |
| 대시보드 (총무/구성원 뷰 분기) | `/dashboard` | 골격 → 와이어프레임 기준 구현 예정 |
| 회계 내역 + 등록/승인 | `/accounting` | 골격 → 구현 예정 |
| 권한 매트릭스 | `/permissions` | 골격 → 구현 예정 |
| 공개 회계 | `/public/:orgId` | 구현 (public_ledger RPC) |

## Mock / Placeholder

- OCR: `src/mocks/ocr.ts` — 고정 JSON 반환 (`USE_REAL_OCR=false`)
- 감사 탐지: `src/mocks/audit.ts` — 시드 데이터 표시만
- PDF: placeholder alert

## 핵심 설계

- 권한: UI 6묶음 토글, DB 세부 권한(key) 단위 저장. 매핑은 `src/lib/permissions.ts`
- 권한 부여는 user 가 아니라 membership 에 (멀티 단체 대응)
- 승인은 별도 테이블 없이 `transactions.status`
- 예산 집계는 `budget_id` FK 기준, `category` 는 스냅샷
- 보안 경계 = RLS(조직 격리) + definer RPC. 프론트 권한 게이트는 UX 용

## 폴더 구조

```
src/
  lib/         supabase 클라이언트, 권한 상수, 타입
  context/     AuthContext (세션 + 단체 + 권한)
  components/  layout (권한 기반 사이드바)
  pages/       화면별 페이지
  mocks/       OCR / 감사 / PDF placeholder
```
