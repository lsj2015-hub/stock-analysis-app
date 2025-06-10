'use client';

import { useState } from 'react';
import SearchSection from './sectors/SearchSection';
import FinancialSection from './sectors/FinancialSection';
import HistorySection from './sectors/HistorySection';
import AiQuestionSection from './sectors/AiQuestionSection';
import { FinancialStatementData, StockHistoryData } from '../types/stock';
import NewsSection from './sectors/NewsSection';
import { StockNews } from '../types/common';

export default function Home() {
  const [symbol, setSymbol] = useState<string>('AAPL');
  const [financialData, setFinancialData] =
    useState<FinancialStatementData | null>(null);
  const [stockHistoryData, setStockHistoryData] = useState<
    StockHistoryData[] | null>(null);
  const [newsData, setNewsData] = useState<StockNews[] | null>(null);

  console.log({ newsData })

  // SearchSection에서 종목 코드를 변경할 수 있도록 콜백 함수 전달
  const handleSymbolChange = (newSymbol: string) => {
    if (newSymbol.trim()) {
      const upperCaseSymbol = newSymbol.toUpperCase();
      setSymbol(upperCaseSymbol);
      // 종목 변경 시 모든 자식 컴포넌트로부터 받은 데이터 초기화
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
    </main>
  );
}
