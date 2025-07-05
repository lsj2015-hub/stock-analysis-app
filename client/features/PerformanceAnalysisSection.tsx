/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { format, subDays } from 'date-fns';
import { ko } from 'date-fns/locale';
import { Calendar as CalendarIcon } from 'lucide-react';

import { analyzePerformance } from '@/lib/api';
import { cn } from '@/lib/utils';

import { StockPerformance, PerformanceAnalysisResponse } from '@/types/common';

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

const MARKET_OPTIONS: Record<string, string[]> = {
  US: ['NASDAQ', 'NYSE', 'S&P500'],
  KR: ['KOSPI', 'KOSDAQ'],
};

// --- 사용자 정의 툴팁 ---
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-background/80 backdrop-blur-sm border p-2 rounded-lg shadow-lg text-sm">
        <p className="font-bold text-foreground">{`${label} (${data.ticker})`}</p>
        <p style={{ color: payload[0].color }}>
          {`수익률: ${Number(data.performance).toFixed(2)}%`}
        </p>
      </div>
    );
  }
  return null;
};

// --- 메인 컴포넌트 ---
export function PerformanceAnalysisSection() {
  const [isClient, setIsClient] = useState(false);
  const [dates, setDates] = useState<{ start?: Date; end?: Date }>({});
  const [country, setCountry] = useState<string>('US');
  const [market, setMarket] = useState<string>('');
  const [topN, setTopN] = useState<number>(10);

  const [analysisData, setAnalysisData] =
    useState<PerformanceAnalysisResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setIsClient(true);
    setDates({
      start: subDays(new Date(), 7),
      end: new Date(),
    });
  }, []);

  const handleAnalyze = useCallback(async () => {
    if (!market || !dates.start || !dates.end || !topN) {
      setError('모든 값을 올바르게 입력해주세요.');
      return;
    }

    setLoading(true);
    setError(null);
    setAnalysisData(null);

    try {
      const response = await analyzePerformance({
        market,
        start_date: format(dates.start, 'yyyy-MM-dd'),
        end_date: format(dates.end, 'yyyy-MM-dd'),
        top_n: topN,
      });
      setAnalysisData(response);
    } catch (err: any) {
      setError(err.message || '분석 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  }, [market, dates, topN]);

  if (!isClient) {
    return (
      <Card className="rounded-2xl border-2 border-purple-400">
        <CardHeader>
          <Skeleton className="h-8 w-1/3" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full" />
        </CardContent>
        <CardFooter className="flex justify-end">
          <Skeleton className="h-10 w-24" />
        </CardFooter>
      </Card>
    );
  }

  const PerformanceChart = ({
    data,
    title,
    barColor,
  }: {
    data: StockPerformance[];
    title: string;
    barColor: string;
  }) => {
    const chartHeight = Math.max(300, data.length * 40);
    const formatYAxisLabel = (label: string) =>
      label.length > 18 ? `${label.substring(0, 18)}...` : label;

    return (
      <div>
        <h3 className="text-lg font-semibold text-center mb-2">{title}</h3>
        <ResponsiveContainer width="100%" height={chartHeight}>
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 5, right: 30, left: 20, bottom: 20 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              type="number"
              tickFormatter={(tick) => `${tick.toFixed(0)}%`}
            />
            <YAxis
              dataKey="name"
              type="category"
              width={120}
              tick={{ fontSize: 12 }}
              tickFormatter={formatYAxisLabel}
              interval={0}
            />
            <Tooltip
              content={<CustomTooltip />}
              cursor={{ fill: 'rgba(206, 206, 206, 0.2)' }}
            />
            <Legend wrapperStyle={{ paddingTop: '20px' }} />
            <Bar dataKey="performance" name="수익률">
              {data.map((entry) => (
                <Cell key={entry.ticker} fill={barColor} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  };

  return (
    <Card className="rounded-2xl border-2 border-purple-400">
      <CardHeader>
        <CardTitle className="text-2xl font-semibold">
          수익률 종목 분석
        </CardTitle>
        <CardDescription>
          국가, 시장, 기간별 수익률 상위/하위 종목을 조회합니다.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-8">
        {/* --- 입력 섹션 --- */}
        <div className="space-y-6 p-6 border rounded-lg bg-muted/30">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6 items-end">
            <div className="flex flex-col space-y-2">
              <Label>국가</Label>
              <Select
                value={country}
                onValueChange={(v) => {
                  setCountry(v);
                  setMarket('');
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="US">미국</SelectItem>
                  <SelectItem value="KR">한국</SelectItem>
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
                      {' '}
                      {m}{' '}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col space-y-2">
              <Label htmlFor="start-date">시작일</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    id="start-date"
                    variant="outline"
                    className={cn(
                      'justify-start text-left font-normal',
                      !dates.start && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dates.start ? (
                      format(dates.start, 'PPP', { locale: ko })
                    ) : (
                      <span>날짜 선택</span>
                    )}
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
              <Label htmlFor="end-date">종료일</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    id="end-date"
                    variant="outline"
                    className={cn(
                      'justify-start text-left font-normal',
                      !dates.end && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dates.end ? (
                      format(dates.end, 'PPP', { locale: ko })
                    ) : (
                      <span>날짜 선택</span>
                    )}
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
            <div className="flex flex-col space-y-2">
              <Label htmlFor="top-n">종목 수 (N)</Label>
              <Input
                id="top-n"
                type="number"
                value={topN}
                onChange={(e) => setTopN(Math.max(1, Number(e.target.value)))}
                min="1"
                max="20"
              />
            </div>
          </div>
        </div>

        {error && (
          <p className="text-red-500 text-center text-sm font-semibold">
            {error}
          </p>
        )}

        <div className="mt-6">
          {loading && (
            <div className="w-full">
              <Skeleton className="h-[200px] w-full" />
            </div>
          )}
          {!loading && analysisData && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-12 gap-y-8">
              <PerformanceChart
                data={analysisData.top_performers}
                title="수익률 상위 종목"
                barColor="#82ca9d"
              />
              <PerformanceChart
                data={analysisData.bottom_performers}
                title="수익률 하위 종목"
                barColor="#ff8042"
              />
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter className="flex justify-end">
        <Button
          onClick={handleAnalyze}
          disabled={loading || !market || !dates.start || !dates.end}
        >
          {loading ? '분석 중...' : '분석 실행'}
        </Button>
      </CardFooter>
    </Card>
  );
}
