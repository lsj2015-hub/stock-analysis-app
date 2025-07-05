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
  TooltipProps,
} from 'recharts';
import { format, subDays, eachDayOfInterval } from 'date-fns';
import { ko } from 'date-fns/locale';
import { Calendar as CalendarIcon } from 'lucide-react';

import { compareStocks } from '@/lib/api';
import { cn } from '@/lib/utils';
import {
  StockComparisonDataPoint,
  StockComparisonSeries,
} from '@/types/common';

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

const INDEX_OPTIONS: Record<string, { name: string; ticker: string }[]> = {
  KR: [
    { name: '코스피', ticker: '^KS11' },
    { name: '코스닥', ticker: '^KQ11' },
  ],
  US: [
    { name: 'S&P 500', ticker: '^GSPC' },
    { name: '나스닥', ticker: '^IXIC' },
    { name: '다우존스', ticker: '^DJI' },
  ],
};

const CustomTooltip = ({
  active,
  payload,
  label,
}: TooltipProps<number, string>) => {
  if (active && payload && payload.length) {
    const filteredPayload = payload.filter(
      (p) => p.name !== '기준 (100)' && p.value !== null
    );
    if (filteredPayload.length === 0) return null;

    return (
      <div className="rounded-lg border bg-background p-2 shadow-sm">
        <p className="text-sm text-muted-foreground mb-1">
          {format(new Date(label), 'yyyy년 M월 d일')}
        </p>
        {filteredPayload.map((item, index) => (
          <div key={index} className="flex justify-between items-center gap-4">
            <p className="text-sm font-bold" style={{ color: item.color }}>
              {item.name}
            </p>
            <p
              className="font-mono font-bold text-right"
              style={{ color: item.color }}
            >
              {item.value?.toFixed(2)}
            </p>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export function CompareStocksSection() {
  const [isClient, setIsClient] = useState(false);
  const [tickerInputs, setTickerInputs] = useState<string[]>([
    '',
    '',
    '',
    '',
    '',
  ]);
  const [dates, setDates] = useState<{ start?: Date; end?: Date }>({});
  const [chartData, setChartData] = useState<{
    data: StockComparisonDataPoint[];
    series: StockComparisonSeries[];
  }>({ data: [], series: [] });

  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [indexCountry, setIndexCountry] = useState<string>('');
  const [selectedIndex, setSelectedIndex] = useState<string>('');

  useEffect(() => {
    setIsClient(true);
    setDates({
      start: subDays(new Date(), 7),
      end: new Date(),
    });
  }, []);

  const handleTickerChange = (index: number, value: string) => {
    const newTickers = [...tickerInputs];
    // ✅ 에러 수정: `(index: number)`와 같은 잘못된 타입 캐스팅 문법 제거
    newTickers[index] = value.toUpperCase();
    setTickerInputs(newTickers);
  };

  const handleAnalyze = useCallback(async () => {
    const stockTickers = tickerInputs
      .map((t) => t.trim().toUpperCase())
      .filter(Boolean);
    const finalTickers = [...stockTickers];
    if (selectedIndex) {
      finalTickers.push(selectedIndex);
    }
    const uniqueTickers = [...new Set(finalTickers)];

    if (uniqueTickers.length === 0 || !dates.start || !dates.end) {
      setError(
        '기간을 선택하고, 비교할 종목이나 지수를 1개 이상 입력해주세요.'
      );
      return;
    }

    setLoading(true);
    setError(null);
    setChartData({ data: [], series: [] });

    try {
      const response = await compareStocks({
        tickers: uniqueTickers,
        start_date: format(dates.start, 'yyyy-MM-dd'),
        end_date: format(dates.end, 'yyyy-MM-dd'),
      });

      const stockDataMap = new Map(
        response.data.map((item) => [item.date, item])
      );
      const allDays = eachDayOfInterval({ start: dates.start, end: dates.end });

      const paddedData = allDays.map((day) => {
        const dateString = format(day, 'yyyy-MM-dd');
        if (stockDataMap.has(dateString)) {
          return stockDataMap.get(dateString)!;
        }
        const placeholder: StockComparisonDataPoint = { date: dateString };
        response.series.forEach((series) => {
          // ✅ 에러 수정: `(series: any)`와 같은 불안정한 타입 캐스팅 제거
          placeholder[series.dataKey] = null;
        });
        return placeholder;
      });

      setChartData({ data: paddedData, series: response.series });
    } catch (err: any) {
      setError(err.message || '분석 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  }, [dates, tickerInputs, selectedIndex]);

  if (!isClient) {
    return <Skeleton className="h-[300px] w-full" />;
  }

  const colors = [
    '#8884d8',
    '#82ca9d',
    '#ffc658',
    '#ff7300',
    '#00C49F',
    '#FF8042',
  ];

  return (
    <Card className="rounded-2xl border-2 border-orange-400">
      <CardHeader>
        <CardTitle className="text-2xl font-semibold">
          종목 및 지수 수익률 비교
        </CardTitle>
        <CardDescription>
          여러 종목과 시장 지수의 주가 수익률을 정규화하여 비교합니다. (분석
          시작일 = 100)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-8">
        <div className="space-y-6 p-6 border rounded-lg bg-muted/30">
          <div className="space-y-3">
            <Label className="font-semibold">비교 종목 (최대 5개)</Label>
            <div className="flex flex-col sm:flex-row gap-2">
              {tickerInputs.map((ticker, index) => (
                <div key={index} className="flex-1 min-w-0">
                  <Label
                    htmlFor={`ticker-${index}`}
                    className="text-xs text-muted-foreground"
                  >
                    종목 {index + 1}
                  </Label>
                  <Input
                    id={`ticker-${index}`}
                    placeholder="AAPL"
                    value={ticker}
                    onChange={(e) => handleTickerChange(index, e.target.value)}
                    className="h-9 w-full mt-1"
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
            <div className="space-y-3">
              <Label className="font-semibold">비교 지수 (선택)</Label>
              <div className="grid grid-cols-2 gap-4">
                <Select
                  value={indexCountry}
                  onValueChange={(v) => {
                    setIndexCountry(v);
                    setSelectedIndex('');
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="국가 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="KR">한국</SelectItem>
                    <SelectItem value="US">미국</SelectItem>
                  </SelectContent>
                </Select>
                <Select
                  value={selectedIndex}
                  onValueChange={setSelectedIndex}
                  disabled={!indexCountry}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="지수 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    {/* ✅ 에러 수정: 잘못된 타입 캐스팅 문법 제거 */}
                    {(INDEX_OPTIONS[indexCountry] || []).map((index) => (
                      <SelectItem key={index.ticker} value={index.ticker}>
                        {index.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-3">
              <Label className="font-semibold">분석 기간</Label>
              <div className="grid grid-cols-2 gap-4">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      id="start-date-compare"
                      variant="outline"
                      className={cn(
                        'w-full justify-start text-left font-normal'
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dates.start ? (
                        format(dates.start, 'PPP', { locale: ko })
                      ) : (
                        <span>시작일</span>
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
                      disabled={(date) =>
                        date > (dates.end || new Date()) ||
                        date < new Date('1900-01-01')
                      }
                    />
                  </PopoverContent>
                </Popover>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      id="end-date-compare"
                      variant="outline"
                      className={cn(
                        'w-full justify-start text-left font-normal'
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dates.end ? (
                        format(dates.end, 'PPP', { locale: ko })
                      ) : (
                        <span>종료일</span>
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
                      disabled={(date) =>
                        date > new Date() ||
                        date < (dates.start || new Date('1900-01-01'))
                      }
                    />
                  </PopoverContent>
                </Popover>
              </div>
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
            <div className="w-full h-96 flex items-center justify-center text-muted-foreground">
              <p>차트 데이터를 불러오는 중입니다...</p>
            </div>
          )}
          {!loading && chartData.data.length > 0 && (
            <div className="w-full h-[500px]">
              <ResponsiveContainer>
                <LineChart
                  data={chartData.data}
                  margin={{ top: 5, right: 30, left: 0, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} dy={5} />
                  <YAxis
                    tick={{ fontSize: 12 }}
                    dx={-5}
                    domain={['auto', 'auto']}
                    tickFormatter={(value) => value.toFixed(0)}
                  />
                  <Tooltip
                    content={<CustomTooltip />}
                    cursor={{ stroke: '#6b7280', strokeDasharray: '5 5' }}
                  />
                  <Legend
                    verticalAlign="top"
                    align="right"
                    wrapperStyle={{ paddingBottom: '20px' }}
                    formatter={(value) => {
                      if (value === '기준 (100)') {
                        return null;
                      }
                      return value;
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey={() => 100}
                    stroke="#e5e7eb"
                    dot={false}
                    strokeWidth={1.5}
                    strokeDasharray="5 5"
                    name="기준 (100)"
                  />
                  {chartData.series.map((s, i) => (
                    <Line
                      key={s.dataKey}
                      type="monotone"
                      dataKey={s.dataKey}
                      name={s.name}
                      stroke={colors[i % colors.length]}
                      strokeWidth={s.dataKey === selectedIndex ? 4 : 2}
                      dot={false}
                      activeDot={{ r: 6, strokeWidth: 2 }}
                      connectNulls={true}
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
          disabled={
            loading ||
            (tickerInputs.every((t) => t.trim() === '') && !selectedIndex)
          }
        >
          {loading ? '분석 중...' : '분석 실행'}
        </Button>
      </CardFooter>
    </Card>
  );
}
