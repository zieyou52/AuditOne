// OCR 은 데모용 placeholder. 외부 API 실패 리스크를 없애기 위해
// 고정 JSON 을 반환한다. 실제 1건 연동이 필요하면 USE_REAL_OCR 분기.

export interface OcrResult {
  date: string;
  amount: number;
  vendor: string;
  biz_name: string;
}

export const USE_REAL_OCR = false;

const MOCK_RESULTS: OcrResult[] = [
  { date: '2026-08-14', amount: 38000, vendor: '메가커피 신촌점', biz_name: '메가엠지씨커피' },
  { date: '2026-08-12', amount: 52400, vendor: '교보문고', biz_name: '교보문고' },
  { date: '2026-08-08', amount: 91000, vendor: '쿠팡', biz_name: '쿠팡(주)' },
];

export async function runOcr(_file: File): Promise<OcrResult> {
  // 데모: 업로드 파일 무관하게 회전하며 mock 반환
  await new Promise((r) => setTimeout(r, 700)); // 분석 중 UX
  const idx = Math.floor(Math.random() * MOCK_RESULTS.length);
  return MOCK_RESULTS[idx];
}
