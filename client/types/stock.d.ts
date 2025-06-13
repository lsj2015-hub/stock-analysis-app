// 통합 데이터 타입
export interface StockOverviewData {
  profile: StockProfile;
  summary: FinancialSummary;
  metrics: InvestmentMetrics;
  marketData: MarketData;
  recommendations: AnalystRecommendations;
  officers: Officer[];
}

// (1) 기업 기본 정보 (프로필)
export interface StockProfile {
  symbol: string;
  longName: string;
  industry: string;
  sector: string;
  longBusinessSummary: string;
  city: string;
  state: string;
  country: string;
  website: string;
  fullTimeEmployees: string;
}

// (2) 재무 요약 정보
export interface FinancialSummary {
  totalRevenue: string;
  netIncomeToCommon: string;
  operatingMargins: string;
  dividendYield: string;
  trailingEps: string;
  totalCash: string;
  totalDebt: string;
  debtToEquity: string;
  exDividendDate?: string | null;
}

// (3) 투자 지표
export interface InvestmentMetrics {
  trailingPE: string;
  forwardPE: string;
  priceToBook: string;
  returnOnEquity: string;
  returnOnAssets: string;
  beta: string;
}

// (4) 주가/시장 정보
export interface MarketData {
  currentPrice: string;
  previousClose: string;
  dayHigh: string;
  dayLow: string;
  fiftyTwoWeekHigh: string;
  fiftyTwoWeekLow: string;
  marketCap: string;
  sharesOutstanding: string;
  volume: string;
}

// (5) 분석가 의견
export interface AnalystRecommendations {
  recommendationMean: number;
  recommendationKey: string;
  numberOfAnalystOpinions: number;
  targetMeanPrice: string;
  targetHighPrice: string;
  targetLowPrice: string;
}

// 임원 정보
export interface Officer {
  name: string;
  title: string;
  totalPay: string;
}

// 재무제표 데이터
export interface FinancialStatementRow {
  item: string;
  [year: string]: string;
}
export interface FinancialStatementData {
  years: string[];
  data: FinancialStatementRow[];
}

// 주가 히스토리 데이터
export interface StockHistoryData {
  Date: string;
  Open: number;
  High: number;
  Low: number;
  Close: number;
  Volume: number;
}
export interface StockHistoryApiResponse {
  symbol: string;
  startDate: string;
  endDate: string;
  data: StockHistoryData[];
}
