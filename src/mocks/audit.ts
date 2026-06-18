// 감사 탐지 로직은 MVP 범위 밖. audit_findings 테이블의 is_seed=true 데이터를
// 그대로 보여준다. 테이블이 비어있을 때를 대비한 폴백 시드.
import type { AuditFinding } from '@/lib/types';

export const SEED_FINDINGS: Partial<AuditFinding>[] = [
  { finding_type: 'missing_receipt', severity: 'warning', detail: '영수증 누락 (08-14 메가커피)', is_seed: true },
  { finding_type: 'missing_receipt', severity: 'warning', detail: '영수증 누락 (08-05 다과)', is_seed: true },
  { finding_type: 'missing_receipt', severity: 'warning', detail: '영수증 누락 (07-28 교통비)', is_seed: true },
  { finding_type: 'duplicate', severity: 'warning', detail: '중복 결제 의심 (동일 금액·날짜)', is_seed: true },
  { finding_type: 'duplicate', severity: 'warning', detail: '중복 결제 의심 (동일 사용처)', is_seed: true },
  { finding_type: 'budget_over', severity: 'critical', detail: '홍보비 예산 초과 105%', is_seed: true },
];

// PDF 생성도 placeholder. 실제 구현 시 jsPDF / react-pdf 로 교체.
export function generateReportPlaceholder(kind: string) {
  alert(`[데모] ${kind} 보고서 PDF 생성은 추후 구현 예정입니다.`);
}
