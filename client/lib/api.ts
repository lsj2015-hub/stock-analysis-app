// client/lib/api.ts

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
} from '@/types/stock';
import { StockNews } from '../types/common'; // StockNews는 common.d.ts에서 임포트

// 모든 API 요청에 대한 기본 URL
const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';

interface TranslationResponse {
  translated_text: string;
}

// 주식 프로필 정보 조회
export async function getStockProfile(symbol: string): Promise<StockProfile> {
  const response = await fetch(`${API_BASE_URL}/api/stock/${symbol}/profile`);
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(
      errorData.detail || '기업 프로필 정보를 가져오지 못했습니다.'
    );
  }
  return response.json();
}

// 재무 요약 정보 조회
export async function getFinancialSummary(
  symbol: string
): Promise<FinancialSummary> {
  const response = await fetch(
    `${API_BASE_URL}/api/stock/${symbol}/financial-summary`
  );
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(
      errorData.detail || '재무 요약 정보를 가져오지 못했습니다.'
    );
  }
  return response.json();
}

// 투자 지표 조회
export async function getInvestmentMetrics(
  symbol: string
): Promise<InvestmentMetrics> {
  const response = await fetch(`${API_BASE_URL}/api/stock/${symbol}/metrics`);
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(
      errorData.detail || '투자 지표 정보를 가져오지 못했습니다.'
    );
  }
  return response.json();
}

// 시장 데이터 조회
export async function getMarketData(symbol: string): Promise<MarketData> {
  const response = await fetch(
    `${API_BASE_URL}/api/stock/${symbol}/market-data`
  );
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.detail || '시장 데이터를 가져오지 못했습니다.');
  }
  return response.json();
}

// 분석가 추천 정보 조회
export async function getAnalystRecommendations(
  symbol: string
): Promise<AnalystRecommendations> {
  const response = await fetch(
    `${API_BASE_URL}/api/stock/${symbol}/recommendations`
  );
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(
      errorData.detail || '분석가 추천 정보를 가져오지 못했습니다.'
    );
  }
  return response.json();
}

// 임원 정보 조회
export async function getStockOfficers(
  symbol: string
): Promise<{ officers: Officer[] }> {
  const response = await fetch(`${API_BASE_URL}/api/stock/${symbol}/officers`);
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.detail || '임원 정보를 가져오지 못했습니다.');
  }
  return response.json();
}

// 재무제표 조회
export async function getFinancialStatement(
  symbol: string,
  statementType: 'income' | 'balance' | 'cashflow'
): Promise<FinancialStatementData> {
  const response = await fetch(
    `${API_BASE_URL}/api/stock/${symbol}/financials/${statementType}`
  );
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.detail || '재무제표를 가져오지 못했습니다.');
  }
  return response.json();
}

// 주가 히스토리 조회
export async function getStockHistory(
  symbol: string,
  startDate: string,
  endDate: string
): Promise<StockHistoryApiResponse> {
  const response = await fetch(
    `${API_BASE_URL}/api/stock/${symbol}/history?start_date=${startDate}&end_date=${endDate}`
  );
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(
      errorData.detail || '주가 히스토리 데이터를 가져오지 못했습니다.'
    );
  }
  return response.json();
}

// 야후 RSS 뉴스 조회
export async function fetchStockNews(
  symbol: string,
  limit: number = 10
): Promise<StockNews[]> {
  const response = await fetch(
    `${API_BASE_URL}/api/stock/${symbol}/news?limit=${limit}`
  );
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.detail || '뉴스 정보를 가져오지 못했습니다.');
  }
  const data = await response.json();
  return data.news;
}

// 텍스트 번역
export async function getTranslation(text: string): Promise<string> {
  const response = await fetch(`${API_BASE_URL}/api/util/translate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ text }),
  });
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.detail || '번역에 실패했습니다.');
  }
  const data: TranslationResponse = await response.json();
  return data.translated_text;
}

// AI에게 질문
export async function askAi(
  symbol: string,
  question: string,
  financialData: FinancialStatementData | null, 
  historyData: StockHistoryData[] | null,
  newsData: StockNews[] | null // 타입 명확히
): Promise<{ response: string }> {
  const response = await fetch(`${API_BASE_URL}/api/ai/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      symbol,
      question,
      // ✅ financialData와 historyData를 JSON 문자열로 변환하여 전달
      financialData: financialData
        ? JSON.stringify(financialData)
        : '데이터 없음',
      historyData: historyData ? JSON.stringify(historyData) : '데이터 없음',
      newsData: newsData?.map((n: StockNews) => ({
        title: n.title,
        summary: n.summary,
        url: n.url,
        publishedDate: n.publishedDate,
        source: n.source,
      })),
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.detail || 'AI 응답을 가져오지 못했습니다.');
  }
  return response.json();
}
