'use client';

import { useState, useEffect } from 'react';
import { FinancialStatementData, StockHistoryData } from '@/types/stock';
import { StockNews } from '@/types/common';

import SearchSection from '@/features/SearchSection';
import FinancialSection from '@/features/FinancialSection';
import HistorySection from '@/features/HistorySection';
import AiQuestionSection from '@/features/AiQuestionSection';
import NewsSection from '@/features/NewsSection';
import ScrollToTopButton from '@/components/shared/ScrollToTopButton';

export default function Home() {
  const [symbol, setSymbol] = useState<string>('AAPL');

  // AI에 컨텍스트를 제공하기 위한 상태들
  const [financialData, setFinancialData] =
    useState<FinancialStatementData | null>(null);
  const [stockHistoryData, setStockHistoryData] = useState<
    StockHistoryData[] | null
  >(null);
  const [newsData, setNewsData] = useState<StockNews[] | null>(null);

  // ✅ 페이지가 처음 로드될 때 스크롤을 맨 위로 이동시키는 코드
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const handleSymbolChange = (newSymbol: string) => {
    const upperCaseSymbol = newSymbol.trim().toUpperCase();
    if (upperCaseSymbol) {
      setSymbol(upperCaseSymbol);
      // 종목 변경 시 AI 컨텍스트 데이터 초기화
      setFinancialData(null);
      setStockHistoryData(null);
      setNewsData(null);
    }
  };

  return (
    <main className="min-h-screen bg-neutral-50">
      <div className="w-full bg-gradient-to-r from-[#fbbc04] to-[#34a853] h-1" />
      <header className="flex items-center justify-center px-8 py-6 border-b">
        <h1 className="text-2xl font-bold tracking-tight">기업 정보 조회</h1>
      </header>
      <div className="max-w-5xl mx-auto py-8 flex flex-col gap-6">
        <SearchSection symbol={symbol} setSymbol={handleSymbolChange} />
        <FinancialSection symbol={symbol} setFinancialData={setFinancialData} />
        <HistorySection
          symbol={symbol}
          setStockHistoryData={setStockHistoryData}
        />
        <NewsSection symbol={symbol} setNewsData={setNewsData} />
        <AiQuestionSection
          symbol={symbol}
          financialData={financialData}
          stockHistoryData={stockHistoryData}
          newsData={newsData}
        />
      </div>

      <ScrollToTopButton />
    </main>
  );
}
