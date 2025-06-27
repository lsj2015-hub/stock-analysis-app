import {
  StockProfile,
  FinancialSummary,
  InvestmentMetrics,
  MarketData,
  AnalystRecommendations,
  Officer,
  FinancialStatementData,
  StockHistoryApiResponse,
  StockHistoryData,
  StockOverviewData,
} from '@/types/stock';
import {
  StockNews,
  SectorGroups,
  SectorTickerResponse,
  SectorAnalysisRequest,
  SectorAnalysisResponse,
} from '../types/common';

// 모든 API 요청에 대한 기본 URL
const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';

// 1. API 에러를 위한 커스텀 클래스
export class APIError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'APIError';
    this.status = status;
  }
}

interface TranslationResponse {
  translated_text: string;
}

// 모든 API 함수에 일관된 에러 핸들링 적용
const fetchAPI = async <T>(
  url: string,
  options: RequestInit = {}
): Promise<T> => {
  try {
    const response = await fetch(url, options);

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      const errorMessage =
        errorData?.detail ||
        `서버에서 오류가 발생했습니다. (상태 코드: ${response.status})`;
      throw new APIError(errorMessage, response.status);
    }
    return response.json();
  } catch (error) {
    if (error instanceof APIError) {
      throw error;
    }
    console.error(`API 호출 실패: ${url}`, error);
    throw new Error('서버와 통신할 수 없습니다. 네트워크 연결을 확인해주세요.');
  }
};

// 통합 정보 조회
export const getStockOverview = (symbol: string): Promise<StockOverviewData> =>
  fetchAPI(`${API_BASE_URL}/api/stock/${symbol}/overview`);

// 주식 프로필 정보 조회
export const getStockProfile = (symbol: string): Promise<StockProfile> =>
  fetchAPI(`${API_BASE_URL}/api/stock/${symbol}/profile`);

// 재무 요약 정보 조회
export const getFinancialSummary = (
  symbol: string
): Promise<FinancialSummary> =>
  fetchAPI(`${API_BASE_URL}/api/stock/${symbol}/financial-summary`);

// 투자 지표 조회
export const getInvestmentMetrics = (
  symbol: string
): Promise<InvestmentMetrics> =>
  fetchAPI(`${API_BASE_URL}/api/stock/${symbol}/metrics`);

// 시장 데이터 조회
export const getMarketData = (symbol: string): Promise<MarketData> =>
  fetchAPI(`${API_BASE_URL}/api/stock/${symbol}/market-data`);

// 분석가 추천 정보 조회
export const getAnalystRecommendations = (
  symbol: string
): Promise<AnalystRecommendations> =>
  fetchAPI(`${API_BASE_URL}/api/stock/${symbol}/recommendations`);

// 임원 정보 조회
export const getStockOfficers = (
  symbol: string
): Promise<{ officers: Officer[] }> =>
  fetchAPI(`${API_BASE_URL}/api/stock/${symbol}/officers`);

// 재무제표 조회
export const getFinancialStatement = (
  symbol: string,
  statementType: 'income' | 'balance' | 'cashflow'
): Promise<FinancialStatementData> =>
  fetchAPI(`${API_BASE_URL}/api/stock/${symbol}/financials/${statementType}`);

// 주가 히스토리 조회
export const getStockHistory = (
  symbol: string,
  startDate: string,
  endDate: string
): Promise<StockHistoryApiResponse> =>
  fetchAPI(
    `${API_BASE_URL}/api/stock/${symbol}/history?start_date=${startDate}&end_date=${endDate}`
  );

// 야후 RSS 뉴스 조회
export const fetchStockNews = async (
  symbol: string,
  limit = 10
): Promise<StockNews[]> => {
  const result = await fetchAPI<{ news: StockNews[] }>(
    `${API_BASE_URL}/api/stock/${symbol}/news?limit=${limit}`
  );
  return result.news;
};

// 텍스트 번역
export const getTranslation = async (text: string): Promise<string> => {
  const result = await fetchAPI<TranslationResponse>(
    `${API_BASE_URL}/api/util/translate`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    }
  );
  return result.translated_text;
};

// AI에게 질문
export const askAi = (
  symbol: string,
  question: string,
  financialData: FinancialStatementData | null,
  historyData: StockHistoryData[] | null,
  newsData: StockNews[] | null
): Promise<{ response: string }> => {
  return fetchAPI(`${API_BASE_URL}/api/ai/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      symbol,
      question,
      financialData: financialData
        ? JSON.stringify(financialData)
        : '데이터 없음',
      historyData: historyData ? JSON.stringify(historyData) : '데이터 없음',
      newsData: newsData?.map((n) => ({
        title: n.title,
        summary: n.summary,
        url: n.url,
        publishedDate: n.publishedDate,
        source: n.source,
      })),
    }),
  });
};

// --- ✅ 섹터 분석 API 함수들 ---

/**
 * 모든 섹터 그룹 정보를 가져옵니다.
 */
export const getSectorGroups = (): Promise<SectorGroups> => {
  return fetchAPI(`${API_BASE_URL}/api/sectors/groups`);
};

/**
 * 특정 시장과 그룹에 속한 티커 목록을 가져옵니다.
 * @param market - 'KOSPI' 또는 'KOSDAQ'
 * @param group - 섹터 그룹 이름
 */
export const getSectorTickers = (
  market: string,
  group: string
): Promise<SectorTickerResponse> => {
  return fetchAPI(
    `${API_BASE_URL}/api/sectors/tickers?market=${market}&group=${encodeURIComponent(
      group
    )}`
  );
};

/**
 * 선택된 섹터들의 수익률을 분석합니다.
 * @param requestData - 시작일, 종료일, 티커 목록을 포함하는 객체
 */
export const analyzeSectors = (
  requestData: SectorAnalysisRequest
): Promise<SectorAnalysisResponse> => {
  return fetchAPI(`${API_BASE_URL}/api/sectors/analysis`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestData),
  });
};
