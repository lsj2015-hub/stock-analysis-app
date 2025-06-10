/**
 * 기업 기본 정보 타입
 */
export interface StockInfo {
  symbol: string;
  longName: string;
  industry: string;
  sector: string;
  longBusinessSummary: string; // 이 필드는 번역된 텍스트가 올 수 있음
  address1: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  website: string;
  fullTimeEmployees: string; // 포맷팅되어 문자열로 옴
  totalRevenue: string;
  netIncomeToCommon: string;
  operatingMargins: string;
  dividendYield: string;
  trailingEps: string;
  totalCash: string;
  totalDebt: string;
  debtToEquity: string;
  trailingPE: string;
  forwardPE: string;
  priceToBook: string;
  returnOnEquity: string;
  returnOnAssets: string;
  beta: string;
  currentPrice: string;
  previousClose: string;
  dayHigh: string;
  dayLow: string;
  fiftyTwoWeekHigh: string;
  fiftyTwoWeekLow: string;
  marketCap: string;
  sharesOutstanding: string;
  volume: string;
  recommendationMean: string | number;
  recommendationKey: string;
  numberOfAnalystOpinions: string | number;
  targetMeanPrice: string;
  targetHighPrice: string;
  targetLowPrice: string;
}

/**
 * 임원 정보 타입
 */
export interface Officer {
  name: string;
  title: string;
  totalPayUSD: string; // 포맷팅되어 문자열로 옴
}

/**
 * 재무제표 데이터 타입 (항목별, 연도별)
 */
export interface FinancialStatementRow {
  item: string; // 항목명 (예: '매출액', '영업이익')
  [year: string]: string; // 연도별 값 (예: '2023': '$100.00억', '2022': '$90.00억')
}

export interface FinancialStatementData {
  years: string[]; // 연도 목록 (예: ['2020', '2021', '2022', '2023'])
  data: FinancialStatementRow[];
}

/**
 * 주가 히스토리 개별 항목 타입
 */
export interface StockPriceEntry {
  Date: string; // YYYY-MM-DD
  Close: number;
  High: number;
  Low: number;
  Open: number;
  Volume: number;
}

// StockHistoryData: 주가 히스토리 데이터의 각 행에 대한 타입
export interface StockHistoryData {
  Date: string;
  Open: number;
  High: number;
  Low: number;
  Close: number;
  Volume: number;
}

// StockHistoryApiResponse: 주가 히스토리 API의 전체 응답 타입
export interface StockHistoryApiResponse {
  data: StockHistoryData[];
  message: string;
  startDate: string;
  endDate: string;
}

// FinancialRow: 재무제표 데이터의 각 행에 대한 타입 (예: {"항목": "매출액", "2023": 1000})
export interface FinancialRow {
  항목: string; // '항목' 필드는 필수입니다.
  [year: string]: string | number | undefined; // 연도 필드는 동적으로 추가될 수 있습니다.
}

// FinancialStatementData: 백엔드의 /api/stock/financials 응답 전체에 대한 타입
export interface FinancialStatementData {
  years: string[]; // 연도 리스트 (예: ["2023", "2022", "2021"])
  data: FinancialRow[]; // ⭐ 이 부분이 FinancialRow[] 로 명확히 지정되어야 합니다.
  message?: string; // 백엔드에서 메시지를 항상 반환하지 않을 수 있으므로 선택적입니다.
}
