/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Brush,
} from 'recharts';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { Calendar as CalendarIcon } from 'lucide-react';

import { getSectorGroups, getSectorTickers, analyzeSectors } from '@/lib/api';
import { cn } from '@/lib/utils';

import { SectorGroups, TickerInfo, ChartData } from '@/types/common';

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
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';

// --- 타입 정의 ---
interface CustomTooltipProps {
  active?: boolean;
  payload?: any[];
  label?: string;
  activeLine: string | null;
}

// --- 사용자 정의 툴팁 컴포넌트 ---
const CustomTooltip = ({
  active,
  payload,
  label,
  activeLine,
}: CustomTooltipProps) => {
  // 활성화된 라인(activeLine)과 일치하는 데이터만 찾아서 툴팁에 표시
  const activePayload = payload?.find((p) => p.dataKey === activeLine);

  if (active && activePayload) {
    return (
      <div className="bg-background/80 backdrop-blur-sm border p-3 rounded-lg shadow-lg text-sm">
        <p className="font-bold text-foreground">{`${activePayload.name}`}</p>
        <p className="text-muted-foreground">{label}</p>
        <p style={{ color: activePayload.color }}>
          {`수익률: ${Number(activePayload.value).toFixed(2)}`}
        </p>
      </div>
    );
  }
  return null;
};

// --- 메인 컴포넌트 ---
export function SectorAnalysisSection() {
  // --- 상태 관리 ---
  const [isClient, setIsClient] = useState(false);
  const [dates, setDates] = useState<{ start?: Date; end?: Date }>({});
  const [sectorData, setSectorData] = useState<{
    groups: SectorGroups;
    markets: string[];
    tickers: TickerInfo[];
  }>({ groups: {}, markets: [], tickers: [] });

  const [selections, setSelections] = useState({
    market: '',
    group: '',
    tickers: [] as string[],
  });

  const [chartData, setChartData] = useState<{
    data: ChartData[];
    keys: string[];
  }>({ data: [], keys: [] });

  const [loading, setLoading] = useState({
    initial: true,
    tickers: false,
    analysis: false,
  });
  const [error, setError] = useState<string | null>(null);
  const [activeLine, setActiveLine] = useState<string | null>(null);

  // --- 데이터 로딩 (Effects) ---
  useEffect(() => {
    setIsClient(true);

    const today = new Date();
    const weekAgo = new Date();
    weekAgo.setDate(today.getDate() - 7);
    setDates({ start: weekAgo, end: today });

    const fetchInitialData = async () => {
      try {
        const data = await getSectorGroups();
        const initialMarket = Object.keys(data)[0] || '';
        setSectorData((prev) => ({
          ...prev,
          groups: data,
          markets: Object.keys(data),
        }));
        setSelections((prev) => ({ ...prev, market: initialMarket }));
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading((prev) => ({ ...prev, initial: false }));
      }
    };
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (!selections.market || !selections.group) {
      setSectorData((prev) => ({ ...prev, tickers: [] }));
      return;
    }
    const fetchTickers = async () => {
      setLoading((prev) => ({ ...prev, tickers: true }));
      setError(null);
      try {
        const data = await getSectorTickers(
          selections.market,
          selections.group
        );
        setSectorData((prev) => ({ ...prev, tickers: data.tickers }));
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading((prev) => ({ ...prev, tickers: false }));
      }
    };
    fetchTickers();
  }, [selections.market, selections.group]);

  // --- 이벤트 핸들러 ---
  const handleSelectionChange = (type: 'market' | 'group', value: string) => {
    if (type === 'market') {
      setSelections({ market: value, group: '', tickers: [] });
    } else {
      setSelections((prev) => ({ ...prev, group: value, tickers: [] }));
    }
  };

  const handleTickerChange = (ticker: string) => {
    setSelections((prev) => ({
      ...prev,
      tickers: prev.tickers.includes(ticker)
        ? prev.tickers.filter((t) => t !== ticker)
        : [...prev.tickers, ticker],
    }));
  };

  const handleAnalyze = useCallback(async () => {
    if (selections.tickers.length === 0 || !dates.start || !dates.end) {
      setError('기간과 분석할 섹터를 1개 이상 선택해주세요.');
      return;
    }
    setLoading((prev) => ({ ...prev, analysis: true }));
    setError(null);
    try {
      const response = await analyzeSectors({
        start_date: format(dates.start, 'yyyyMMdd'),
        end_date: format(dates.end, 'yyyyMMdd'),
        tickers: selections.tickers,
      });
      setChartData({
        data: response.data,
        keys:
          response.data.length > 0
            ? Object.keys(response.data[0]).filter((key) => key !== 'date')
            : [],
      });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading((prev) => ({ ...prev, analysis: false }));
    }
  }, [dates, selections.tickers]);

  if (!isClient) {
    return (
      <Card className="rounded-2xl border-2 border-blue-400">
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


  const colors = [
    '#8884d8',
    '#82ca9d',
    '#ffc658',
    '#ff7300',
    '#387908',
    '#d0ed57',
    '#a4de6c',
  ];
  const currentGroups = Object.keys(sectorData.groups[selections.market] || {});

  return (
    <Card className="rounded-2xl border-2 border-blue-400">
      <CardHeader>
        <CardTitle className="text-2xl font-semibold">
          섹터 수익률 비교 분석
        </CardTitle>
        <CardDescription>
          관심있는 섹터를 선택하여 기간별 누적 수익률을 비교해보세요.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-8">
        <div className="space-y-6 p-6 border rounded-lg bg-muted/30">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-6 items-end">
            <div className="flex flex-col space-y-2">
              <Label htmlFor="start-date">분석 시작일</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    id="start-date"
                    variant={'outline'}
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
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="flex flex-col space-y-2">
              <Label htmlFor="end-date">분석 종료일</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    id="end-date"
                    variant={'outline'}
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
              <Label>시장</Label>
              <Select
                value={selections.market}
                onValueChange={(v) => handleSelectionChange('market', v)}
                disabled={loading.initial}
              >
                <SelectTrigger>
                  <SelectValue placeholder="시장 선택..." />
                </SelectTrigger>
                <SelectContent>
                  {sectorData.markets.map((m) => (
                    <SelectItem key={m} value={m}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col space-y-2">
              <Label>섹터 그룹</Label>
              <Select
                value={selections.group}
                onValueChange={(v) => handleSelectionChange('group', v)}
                disabled={!selections.market}
              >
                <SelectTrigger>
                  <SelectValue placeholder="그룹 선택..." />
                </SelectTrigger>
                <SelectContent>
                  {['전체 보기', ...currentGroups].map((g) => (
                    <SelectItem key={g} value={g}>
                      {g}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>분석 대상 섹터</Label>
            <Card className="min-h-[4rem] max-h-48 overflow-y-auto">
              <CardContent className="p-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {loading.tickers &&
                  Array.from({ length: 8 }).map((_, i) => (
                    <Skeleton key={i} className="h-6 w-full" />
                  ))}
                {!loading.tickers &&
                  sectorData.tickers.map(({ ticker, name }) => (
                    <div key={ticker} className="flex items-center space-x-2">
                      <Checkbox
                        id={ticker}
                        checked={selections.tickers.includes(ticker)}
                        onCheckedChange={() => handleTickerChange(ticker)}
                      />
                      <label
                        htmlFor={ticker}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        {name}
                      </label>
                    </div>
                  ))}
              </CardContent>
            </Card>
          </div>
        </div>

        {error && (
          <p className="text-red-500 text-center text-sm font-semibold">
            {error}
          </p>
        )}

        <div className="mt-6">
          {loading.analysis && (
            <div className="w-full h-96 flex items-center justify-center text-muted-foreground">
              <p>차트 데이터를 불러오는 중입니다...</p>
            </div>
          )}
          {!loading.analysis && chartData.data.length > 0 && (
            <div className="w-full h-[500px]">
              <ResponsiveContainer>
                <LineChart
                  data={chartData.data}
                  margin={{ top: 5, right: 20, left: 0, bottom: 40 }}
                  onMouseLeave={() => setActiveLine(null)}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="hsl(var(--border))"
                  />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 12 }}
                    stroke="hsl(var(--muted-foreground))"
                  />
                  <YAxis
                    tick={{ fontSize: 12 }}
                    stroke="hsl(var(--muted-foreground))"
                    domain={['auto', 'auto']}
                    tickFormatter={(value) =>
                      typeof value === 'number' ? value.toFixed(0) : ''
                    }
                  />
                  <Tooltip
                    content={<CustomTooltip activeLine={activeLine} />}
                    cursor={{
                      stroke: 'hsl(var(--primary))',
                      strokeWidth: 1,
                      strokeDasharray: '3 3',
                    }}
                  />
                  <Legend
                    align="right"
                    layout="vertical"
                    verticalAlign="middle"
                    wrapperStyle={{ fontSize: '13px', paddingLeft: '20px' }}
                    onMouseEnter={(e) => {
                      // 타입스크립트 오류 방지를 위해 e.dataKey 존재 여부 확인
                      if (e.dataKey) {
                        setActiveLine(e.dataKey.toString());
                      }
                    }}
                    onMouseLeave={() => setActiveLine(null)}
                  />
                  <Brush dataKey="date" height={30} stroke="#8884d8" y={420} />
                  {chartData.keys.map((key, index) => (
                    <Line
                      key={key}
                      type="monotone"
                      dataKey={key}
                      name={key}
                      stroke={colors[index % colors.length]}
                      dot={false}
                      strokeOpacity={
                        activeLine === null || activeLine === key ? 1 : 0.2
                      }
                      strokeWidth={activeLine === key ? 2.5 : 1.5}
                      onMouseEnter={() => setActiveLine(key)}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter className="flex justify-end">
        <Button
          onClick={handleAnalyze}
          disabled={loading.analysis || selections.tickers.length === 0}
        >
          {loading.analysis ? '분석 중...' : '분석 실행'}
        </Button>
      </CardFooter>
    </Card>
  );
}
