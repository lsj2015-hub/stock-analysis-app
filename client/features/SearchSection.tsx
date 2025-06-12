'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { getStockOverview } from '@/lib/api'; // ✅ getStockOverview만 사용
import { StockOverviewData } from '@/types/stock'; // ✅ 통합 타입 사용
import { ProfileDisplay } from './displays/ProfileDisplay';
import { SummaryDisplay } from './displays/SummaryDisplay';
import { MetricsDisplay } from './displays/MetricsDisplay';
import { MarketDataDisplay } from './displays/MarketDataDisplay';
import { RecommendationsDisplay } from './displays/RecommendationsDisplay';
import { OfficersDisplay } from './displays/OfficersDisplay';

type ActiveSection =
  | 'profile'
  | 'summary'
  | 'metrics'
  | 'market'
  | 'recommendations'
  | 'officers';

const SECTION_NAMES: Record<ActiveSection, string> = {
  profile: '회사 기본 정보',
  summary: '재무 요약',
  metrics: '투자 지표',
  market: '시장 정보',
  recommendations: '분석가 의견',
  officers: '주요 임원',
};

interface SearchSectionProps {
  symbol: string;
  setSymbol: (newSymbol: string) => void;
}

export default function SearchSection({
  symbol,
  setSymbol,
}: SearchSectionProps) {
  const [localSymbol, setLocalSymbol] = useState(symbol);
  const [activeSection, setActiveSection] = useState<ActiveSection | null>(
    null
  );
  const [overviewData, setOverviewData] = useState<StockOverviewData | null>(
    null
  );
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // 부모의 symbol이 변경되면 로컬 상태 초기화
  useEffect(() => {
    setLocalSymbol(symbol);
    setOverviewData(null);
    setActiveSection(null);
    setError(null);
  }, [symbol]);

  // '조회' 버튼 클릭 시 실행되는 통합 데이터 조회 함수
  const handleSearch = async () => {
    const trimmedSymbol = localSymbol.trim();
    if (trimmedSymbol === '') {
      setError('종목 코드를 입력해주세요.');
      return;
    }

    // 부모의 symbol 상태 업데이트
    setSymbol(trimmedSymbol);

    setLoading(true);
    setError(null);
    setOverviewData(null);
    setActiveSection(null);

    try {
      const result = await getStockOverview(trimmedSymbol);
      setOverviewData(result);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  // 상세 정보 버튼 클릭 시 섹션 표시/숨김 토글
  const toggleSection = (section: ActiveSection) => {
    setActiveSection((prev) => (prev === section ? null : section));
  };

  const renderContent = () => {
    if (loading) {
      return (
        <Card className="mt-2 bg-gray-50">
          <CardHeader>
            <CardTitle>
              <Skeleton className="h-6 w-40" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Skeleton className="h-40 w-full" />
          </CardContent>
        </Card>
      );
    }
    if (error) {
      return (
        <Alert variant="destructive" className="mt-2">
          <AlertTitle>오류</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      );
    }
    if (overviewData && activeSection) {
      const displayMap: Record<ActiveSection, React.ReactNode> = {
        profile: <ProfileDisplay data={overviewData.profile} />,
        summary: <SummaryDisplay data={overviewData.summary} />,
        metrics: <MetricsDisplay data={overviewData.metrics} />,
        market: <MarketDataDisplay data={overviewData.marketData} />,
        recommendations: (
          <RecommendationsDisplay data={overviewData.recommendations} />
        ),
        officers: <OfficersDisplay data={overviewData.officers} />,
      };
      return (
        <Card className="mt-2 bg-gray-50">
          <CardHeader>
            <CardTitle>{SECTION_NAMES[activeSection]}</CardTitle>
          </CardHeader>
          {displayMap[activeSection]}
        </Card>
      );
    }
    return null;
  };

  return (
    <Card className="rounded-2xl border-2 border-red-400">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span className="text-lg">🔍</span>
          <span className="font-semibold text-lg">종목 검색 및 정보 조회</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-col sm:flex-row gap-2">
          <Input
            placeholder="AAPL, GOOGL..."
            className="bg-neutral-100 flex-grow"
            value={localSymbol}
            onChange={(e) => setLocalSymbol(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          />
          <Button onClick={handleSearch} className="w-full sm:w-auto">
            {localSymbol ? `${localSymbol} 조회` : '조회'}
          </Button>
        </div>
        <div className="px-3 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
          {(Object.keys(SECTION_NAMES) as ActiveSection[]).map((key) => (
            <Button
              key={key}
              onClick={() => toggleSection(key)}
              variant={activeSection === key ? 'default' : 'outline'}
              disabled={!overviewData || loading}
            >
              {SECTION_NAMES[key]}
            </Button>
          ))}
        </div>
        <div className="mt-4">{renderContent()}</div>
      </CardContent>
    </Card>
  );
}
