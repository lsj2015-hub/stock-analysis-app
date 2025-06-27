// - API로부터 받아오는 개별 주식 뉴스 기사의 타입 정의 ---

export interface StockNews {
  title: string;
  url: string;
  publishedDate: string;
  source: string;
  summary: string;
  translatedTitle?: string;
  translatedSummary?: string;
}

// --- 섹터 분석 관련 타입 ---

export interface SectorGroups {
  [market: string]: {
    [group: string]: string[];
  };
}

export interface TickerInfo {
  ticker: string;
  name: string;
}

export interface SectorTickerResponse {
  tickers: TickerInfo[];
}

export interface SectorAnalysisRequest {
  start_date: string;
  end_date: string;
  tickers: string[];
}

export interface ChartData {
  date: string;
  [key: string]: number | string | null;
}

export interface SectorAnalysisResponse {
  data: ChartData[];
}
