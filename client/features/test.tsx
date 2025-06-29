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
import { format, subDays } from 'date-fns';
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

// ✅ CustomTooltip을 다시 파일 최상단으로 이동시키고 로직을 수정합니다.
const CustomTooltip = ({
  active,
  payload,
  label,
}: TooltipProps<number, string>) => {
  if (active && payload && payload.length) {
    // 툴팁에 표시될 데이터에서 '기준 (100)' 라인을 필터링하여 제외합니다.
    const filteredPayload = payload.filter((p) => p.name !== '기준 (100)');

    // 필터링 후 보여줄 데이터가 없으면 툴팁을 렌더링하지 않습니다.
    if (filteredPayload.length === 0) {
      return null;
    }

    return (
      <div className="rounded-lg border bg-background p-2 shadow-sm">
        <p className="text-sm text-muted-foreground mb-1">
          {format(new Date(label), 'yyyy년 M월 d일')}
        </p>
        {/* 필터링된 모든 종목 데이터를 순회하며 표시합니다. */}
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

// --- 메인 컴포넌트 ---
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

  // ✅ 단일 라인 툴팁을 위해 사용했던 상태를 제거합니다.
  // const [activeDataKey, setActiveDataKey] = useState<string | null>(null);

  useEffect(() => {
    setIsClient(true);
    setDates({
      start: subDays(new Date(), 7),
      end: new Date(),
    });
  }, []);

  const handleTickerChange = (index: number, value: string) => {
    const newTickers = [...tickerInputs];
    newTickers[index] = value.toUpperCase();
    setTickerInputs(newTickers);
  };

  const handleAnalyze = useCallback(async () => {
    const tickerList = tickerInputs
      .map((t) => t.trim().toUpperCase())
      .filter(Boolean);

    if (tickerList.length === 0 || !dates.start || !dates.end) {
      setError('기간을 선택하고, 비교할 티커를 1개 이상 입력해주세요.');
      return;
    }

    setLoading(true);
    setError(null);
    setChartData({ data: [], series: [] });

    try {
      const response = await compareStocks({
        tickers: tickerList,
        start_date: format(dates.start, 'yyyy-MM-dd'),
        end_date: format(dates.end, 'yyyy-MM-dd'),
      });
      setChartData(response);
    } catch (err: any) {
      setError(err.message || '분석 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  }, [dates, tickerInputs]);

  if (!isClient) {
    return <Skeleton className="h-[300px] w-full" />;
  }

  const colors = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#00C49F'];

  return (
    <Card className="rounded-2xl border-2 border-orange-400">
      <CardHeader>
        <CardTitle className="text-2xl font-semibold">
          종목별 수익률 비교
        </CardTitle>
        <CardDescription>
          여러 종목의 주가 수익률을 정규화하여 비교합니다. (분석 시작일 = 100)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-8">
        {/* --- 설정 UI 부분 (변경 없음) --- */}
        <div className="space-y-6 p-6 border rounded-lg bg-muted/30">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
            <div className="space-y-3">
              <Label className="font-semibold">비교 종목 (최대 5개)</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3">
                {tickerInputs.map((ticker, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Label
                      htmlFor={`ticker-${index}`}
                      className="min-w-[50px] text-sm text-muted-foreground"
                    >
                      종목 {index + 1}
                    </Label>
                    <Input
                      id={`ticker-${index}`}
                      placeholder="AAPL"
                      value={ticker}
                      onChange={(e) =>
                        handleTickerChange(index, e.target.value)
                      }
                      className="h-9"
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <Label className="font-semibold">분석 기간</Label>
              <div className="flex items-center gap-4">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      id="start-date-compare"
                      variant="outline"
                      className={cn(
                        'w-48 justify-start text-left font-normal',
                        !dates.start && 'text-muted-foreground'
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dates.start ? (
                        format(dates.start, 'PPP', { locale: ko })
                      ) : (
                        <span>시작일 선택</span>
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
                <span className="text-muted-foreground">~</span>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      id="end-date-compare"
                      variant="outline"
                      className={cn(
                        'w-f48 justify-start text-left font-normal',
                        !dates.end && 'text-muted-foreground'
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dates.end ? (
                        format(dates.end, 'PPP', { locale: ko })
                      ) : (
                        <span>종료일 선택</span>
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
                {/* ✅ 마우스 이벤트를 제거하여 기본 동작으로 복귀 */}
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
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 6, strokeWidth: 2 }}
                      // ✅ onMouseEnter를 제거하여 개별 라인 호버 동작 비활성화
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
          disabled={loading || tickerInputs.every((t) => t.trim() === '')}
        >
          {loading ? '분석 중...' : '분석 실행'}
        </Button>
      </CardFooter>
    </Card>
  );
}
