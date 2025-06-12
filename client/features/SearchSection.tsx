'use client';

import { useState, useCallback, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  getStockProfile,
  getFinancialSummary,
  getInvestmentMetrics,
  getMarketData,
  getAnalystRecommendations,
  getStockOfficers,
} from '@/lib/api';
import { ProfileDisplay } from './displays/ProfileDisplay';
import { SummaryDisplay } from './displays/SummaryDisplay';
import { MetricsDisplay } from './displays/MetricsDisplay';
import { MarketDataDisplay } from './displays/MarketDataDisplay';
import { RecommendationsDisplay } from './displays/RecommendationsDisplay';
import { OfficersDisplay } from './displays/OfficersDisplay';
import { ProfileSkeleton } from '../components/skeletons/ProfileSkeleton';
import { GridSkeleton } from '../components/skeletons/GridSkeleton';
import { OfficersSkeleton } from '../components/skeletons/OfficersSkeleton';

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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(
    async (section: ActiveSection) => {
      if (activeSection === section && !loading) {
        setActiveSection(null);
        setData(null);
        return;
      }

      setLoading(true);
      setError(null);
      setData(null);
      setActiveSection(section);

      try {
        const fetcherMap: Record<
          ActiveSection,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (symbol: string) => Promise<any>
        > = {
          profile: getStockProfile,
          summary: getFinancialSummary,
          metrics: getInvestmentMetrics,
          market: getMarketData,
          recommendations: getAnalystRecommendations,
          officers: getStockOfficers,
        };
        const result = await fetcherMap[section](symbol);

        if (
          result &&
          (Array.isArray(result)
            ? result.length > 0
            : Object.keys(result).length > 0)
        ) {
          setData(result);
        } else {
          setError(
            `'${symbol.toUpperCase()}'에 대한 ${
              SECTION_NAMES[section]
            } 정보를 찾을 수 없습니다.`
          );
          setActiveSection(null);
        }
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : '알 수 없는 오류가 발생했습니다.';
        setError(message);
        setActiveSection(null);
      } finally {
        setLoading(false);
      }
    },
    [symbol, activeSection, loading]
  );

  useEffect(() => {
    setLocalSymbol(symbol);
    setActiveSection(null);
    setData(null);
    setError(null);
  }, [symbol]);

  const handleSearch = () => {
    if (localSymbol.trim() === '') {
      setError('종목 코드를 입력해주세요.');
      return;
    }
    setSymbol(localSymbol);
  };

  const renderContent = () => {
    if (loading) {
      const skeletonMap: Record<ActiveSection, React.ReactNode> = {
        profile: <ProfileSkeleton />,
        summary: <GridSkeleton itemCount={8} />,
        metrics: <GridSkeleton itemCount={6} />,
        market: <GridSkeleton itemCount={9} />,
        recommendations: <GridSkeleton itemCount={5} />,
        officers: <OfficersSkeleton />,
      };
      return (
        <Card className="mt-2 bg-gray-50">
          <CardHeader>
            <CardTitle>
              <Skeleton className="h-6 w-40" />
            </CardTitle>
          </CardHeader>
          {activeSection && skeletonMap[activeSection]}
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
    if (data && activeSection) {
      const displayMap: Record<ActiveSection, React.ReactNode> = {
        profile: <ProfileDisplay data={data} />,
        summary: <SummaryDisplay data={data} />,
        metrics: <MetricsDisplay data={data} />,
        market: <MarketDataDisplay data={data} />,
        recommendations: <RecommendationsDisplay data={data} />,
        officers: <OfficersDisplay data={data.officers} />,
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
            {symbol.toUpperCase()} 조회
          </Button>
        </div>
        <div className="px-3 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
          {(Object.keys(SECTION_NAMES) as ActiveSection[]).map((key) => (
            <Button
              key={key}
              onClick={() => fetchData(key)}
              variant={activeSection === key ? 'default' : 'outline'}
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
