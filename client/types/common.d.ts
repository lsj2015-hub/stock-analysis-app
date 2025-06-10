/**
 * API로부터 받아오는 개별 주식 뉴스 기사의 타입 정의
 */
export interface StockNews {
  title: string;
  url: string;
  publishedDate: string;
  source: string;
  summary: string;
  translated?: string; // 번역된 텍스트 (선택적)
}
