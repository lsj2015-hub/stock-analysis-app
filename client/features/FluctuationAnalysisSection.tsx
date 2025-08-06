/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState, useEffect, useCallback } from 'react';
import { format, subDays } from 'date-fns';
import { ko } from 'date-fns/locale';
import {
  Calendar as CalendarIcon,
  Zap,
  TrendingUp,
  TrendingDown,
  Hourglass,
} from 'lucide-react';
import { analyzeFluctuations, getStockHistory } from '@/lib/api';
import { FluctuationStockInfo, EventInfo } from '@/types/common';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { FluctuationTable } from './displays/FluctuationTable'; // ✅ 새로 만든 테이블 컴포넌트 import
import { StockHistoryData } from '../types/stock';

const MARKET_OPTIONS: Record<string, string[]> = {
  US: ['NASDAQ', 'NYSE', 'S&P500'],
  KR: ['KOSPI', 'KOSDAQ'],
};

export function FluctuationAnalysisSection() {
  const [isClient, setIsClient] = useState(false);
  const [dates, setDates] = useState<{ start?: Date; end?: Date }>({});
  const [country, setCountry] = useState<string>('KR');
  const [market, setMarket] = useState<string>('KOSPI');
  const [declinePeriod, setDeclinePeriod] = useState<number>(5);
  const [declineRate, setDeclineRate] = useState<number>(-20);
  const [reboundPeriod, setReboundPeriod] = useState<number>(20);
  const [reboundRate, setReboundRate] = useState<number>(20);

  const [analysisData, setAnalysisData] = useState<FluctuationStockInfo[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  const [selectedTicker, setSelectedTicker] = useState<{
    ticker: string;
    history: StockHistoryData[];
    events: EventInfo[];
    error?: string;
  } | null>(null);

  useEffect(() => {
    setIsClient(true);
    const today = new Date();
    setDates({
      start: subDays(today, 7),
      end: today,
    });
  }, []);

  const handleRowClick = async (stock: FluctuationStockInfo) => {
    if (selectedTicker?.ticker === stock.ticker) {
      setSelectedTicker(null);
      return;
    }
    setSelectedTicker({
      ticker: stock.ticker,
      history: [],
      events: stock.events,
    });
    try {
      if (!dates.start || !dates.end) return;
      const historyResponse = await getStockHistory(
        stock.ticker,
        format(dates.start, 'yyyy-MM-dd'),
        format(dates.end, 'yyyy-MM-dd')
      );
      setSelectedTicker({
        ticker: stock.ticker,
        history: historyResponse.data,
        events: stock.events,
      });
    } catch (e: any) {
      console.error('Failed to fetch history:', e);
      setSelectedTicker({
        ticker: stock.ticker,
        history: [],
        events: stock.events,
        error: '주가 정보를 불러오지 못했습니다.',
      });
    }
  };

  const handleAnalyze = useCallback(async () => {
    if (!market || !dates.start || !dates.end) {
      setError('모든 값을 올바르게 입력해주세요.');
      return;
    }

    setLoading(true);
    setError(null);
    setAnalysisData([]);
    setSelectedTicker(null);
    setProgress(0);

    const progressInterval = setInterval(() => {
      setProgress((prev) => Math.min(prev + 5, 95));
    }, 500);

    try {
      const response = await analyzeFluctuations({
        country,
        market,
        start_date: format(dates.start, 'yyyy-MM-dd'),
        end_date: format(dates.end, 'yyyy-MM-dd'),
        decline_period: declinePeriod,
        decline_rate: declineRate,
        rebound_period: reboundPeriod,
        rebound_rate: reboundRate,
      });
      setAnalysisData(response.found_stocks);
      setProgress(100);
    } catch (err: any) {
      setError(err.message || '분석 중 오류가 발생했습니다.');
      setProgress(0);
    } finally {
      clearInterval(progressInterval);
      setLoading(false);
    }
  }, [
    country,
    market,
    dates,
    declinePeriod,
    declineRate,
    reboundPeriod,
    reboundRate,
  ]);

  if (!isClient) {
    return <Skeleton className="h-[400px] w-full" />;
  }

  return (
    <Card className="rounded-2xl border-2 border-cyan-400">
      <CardHeader>
        <CardTitle className="text-2xl font-semibold flex items-center gap-2">
          <Zap className="w-6 h-6 text-cyan-500" />
          변동성 종목 분석
        </CardTitle>
        <CardDescription>
          지정된 기간 동안 급락 후 반등하는 종목을 분석합니다. 테이블 행을
          클릭하여 상세 차트를 확인하세요.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-8">
        <div className="space-y-6 p-6 border rounded-lg bg-muted/30">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 items-end">
            <div className="flex flex-col space-y-2">
              <Label>국가</Label>
              <Select
                value={country}
                onValueChange={(v) => {
                  setCountry(v);
                  setMarket(MARKET_OPTIONS[v][0]);
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="KR">한국</SelectItem>
                  <SelectItem value="US">미국</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col space-y-2">
              <Label>시장</Label>
              <Select
                value={market}
                onValueChange={setMarket}
                disabled={!country}
              >
                <SelectTrigger>
                  <SelectValue placeholder="시장 선택..." />
                </SelectTrigger>
                <SelectContent>
                  {(MARKET_OPTIONS[country] || []).map((m) => (
                    <SelectItem key={m} value={m}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col space-y-2">
              <Label>시작일</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="font-normal w-full justify-start"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dates.start
                      ? format(dates.start, 'PPP', { locale: ko })
                      : '날짜 선택'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={dates.start}
                    onSelect={(d) =>
                      setDates((v) => ({ ...v, start: d ?? undefined }))
                    }
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="flex flex-col space-y-2">
              <Label>종료일</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="font-normal w-full justify-start"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dates.end
                      ? format(dates.end, 'PPP', { locale: ko })
                      : '날짜 선택'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={dates.end}
                    onSelect={(d) =>
                      setDates((v) => ({ ...v, end: d ?? undefined }))
                    }
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 items-end pt-4">
            <div className="flex flex-col space-y-2">
              <Label className="flex items-center gap-1">
                <Hourglass className="w-4 h-4" />
                하락 기간(일)
              </Label>
              <Input
                type="number"
                value={declinePeriod}
                onChange={(e) => setDeclinePeriod(Number(e.target.value))}
              />
            </div>
            <div className="flex flex-col space-y-2">
              <Label className="flex items-center gap-1">
                <TrendingDown className="w-4 h-4" />
                하락률(%)
              </Label>
              <Input
                type="number"
                value={declineRate}
                onChange={(e) => setDeclineRate(Number(e.target.value))}
              />
            </div>
            <div className="flex flex-col space-y-2">
              <Label className="flex items-center gap-1">
                <Hourglass className="w-4 h-4" />
                반등 기간(일)
              </Label>
              <Input
                type="number"
                value={reboundPeriod}
                onChange={(e) => setReboundPeriod(Number(e.target.value))}
              />
            </div>
            <div className="flex flex-col space-y-2">
              <Label className="flex items-center gap-1">
                <TrendingUp className="w-4 h-4" />
                반등률(%)
              </Label>
              <Input
                type="number"
                value={reboundRate}
                onChange={(e) => setReboundRate(Number(e.target.value))}
              />
            </div>
          </div>
        </div>

        {loading && (
          <div className="px-1">
            <Progress value={progress} className="w-full" />
          </div>
        )}
        {error && (
          <Alert variant="destructive">
            <AlertTitle>오류 발생</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* ✅ 새로 만든 FluctuationTable 컴포넌트를 사용하여 렌더링 */}
        {!loading && analysisData.length > 0 && (
          <FluctuationTable
            analysisData={analysisData}
            selectedTicker={selectedTicker}
            onRowClick={handleRowClick}
          />
        )}
        {!loading && !error && analysisData.length === 0 && (
          <p className="text-center text-muted-foreground pt-4">
            분석 버튼을 눌러 결과를 확인하세요.
          </p>
        )}
      </CardContent>
      <CardFooter className="flex justify-end">
        <Button onClick={handleAnalyze} disabled={loading}>
          {loading ? `분석 중... (${progress.toFixed(0)}%)` : '분석 실행'}
        </Button>
      </CardFooter>
    </Card>
  );
}
