'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

import { FinancialStatementData, StockHistoryData } from '@/types/stock';
import { StockNews } from '@/types/common';

import SearchSection from '@/features/SearchSection';
import FinancialSection from '@/features/FinancialSection';
import HistorySection from '@/features/HistorySection';
import AiQuestionSection from '@/features/AiQuestionSection';
import NewsSection from '@/features/NewsSection';
import ScrollToTopButton from '@/components/shared/ScrollToTopButton'; // ✅ 플로팅 버튼 임포트
import { Button } from '@/components/ui/button';

export default function Home() {
  const [symbol, setSymbol] = useState<string>('AAPL');

  // AI에 컨텍스트를 제공하기 위한 상태들
  const [financialData, setFinancialData] =
    useState<FinancialStatementData | null>(null);
  const [stockHistoryData, setStockHistoryData] = useState<
    StockHistoryData[] | null
  >(null);
  const [newsData, setNewsData] = useState<StockNews[] | null>(null);

  // ✅ 이 부분을 새로운 코드로 교체합니다.
  useEffect(() => {
    // 브라우저의 자동 스크롤 복원 기능을 끄는 것을 유지합니다.
    if (window.history.scrollRestoration) {
      window.history.scrollRestoration = 'manual';
    }

    // setTimeout을 사용해 스크롤 명령을 다음 렌더링 사이클로 넘깁니다.
    // 이렇게 하면 브라우저의 자체 스크롤 복원 시도가 끝난 후 실행됩니다.
    const timer = setTimeout(() => {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    }, 0);

    // 컴포넌트가 언마운트될 때 타이머를 정리합니다.
    return () => clearTimeout(timer);
  }, []);

  const handleSymbolChange = (newSymbol: string) => {
    const upperCaseSymbol = newSymbol.trim().toUpperCase();
    if (upperCaseSymbol) {
      setSymbol(upperCaseSymbol);
      setFinancialData(null);
      setStockHistoryData(null);
      setNewsData(null);
    }
  };

  return (
    <main className="min-h-screen bg-neutral-50">
      <div className="w-full bg-gradient-to-r from-[#fbbc04] to-[#34a853] h-1" />
      {/* 헤더 섹션 */}
      <header className="py-6 border-b">
        <div className="max-w-5xl mx-auto px-8 relative flex justify-center items-center">
          {/* 중앙 정렬된 제목 */}
          <h1 className="text-2xl font-bold tracking-tight">기업 정보 조회</h1>
          <div className="absolute right-0">
            <Link href="/bench-mark">
              <Button className="font-bold bg-gradient-to-r from-[#fbbc04] to-[#34a853] hover:bg-gradient-to-r hover:from-[#34a853] hover:to-[#fbbc04]">
                bench-mark 분석
              </Button>
            </Link>
          </div>
        </div>
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

      {/* ✅ 플로팅 버튼 컴포넌트 추가 */}
      <ScrollToTopButton />
    </main>
  );
}
