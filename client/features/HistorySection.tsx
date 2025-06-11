'use client';

import { useState, useCallback, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Terminal } from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip, // ⭐ Tooltip 임포트 확인
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { getStockHistory } from '@/lib/api';
import { StockHistoryData, StockHistoryApiResponse } from '@/types/stock';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface HistorySectionProps {
  symbol: string;
  setStockHistoryData: (data: StockHistoryData[] | null) => void;
}

export default function HistorySection({ symbol, setStockHistoryData }: HistorySectionProps) {
  const getFormattedDate = (date: Date) => {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const today = new Date();
  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setDate(today.getDate() - 7);

  const [startDate, setStartDate] = useState<string>(
    getFormattedDate(sevenDaysAgo)
  );
  const [endDate, setEndDate] = useState<string>(getFormattedDate(today));
  const [actualEndDate, setActualEndDate] = useState<string | null>(null);
  const [historyData, setHistoryData] = useState<
    StockHistoryData[] | null
  >(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [showChartAndTable, setShowChartAndTable] = useState<boolean>(false);

  const formatChartData = useCallback((data: StockHistoryData[] | null) => {
    if (!data || data.length === 0) return [];
    return data
      .map((item) => ({
        date: item.Date,
        close: item.Close,
        volume: item.Volume,
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, []);

  const fetchHistory = useCallback(async () => {
    if (!symbol || !startDate || !endDate) {
      setError('종목 코드와 날짜를 모두 입력해주세요.');
      setHistoryData(null);
      setStockHistoryData(null);
      setActualEndDate(null);
      return;
    }

    setLoading(true);
    setError(null);
    setHistoryData(null);
    setStockHistoryData(null);
    setActualEndDate(null);
    setShowChartAndTable(false); // ✅ 데이터가 없을 때 차트/테이블 숨김 처리 추가

    try {
      const apiResponse: StockHistoryApiResponse | null = await getStockHistory(
        symbol,
        startDate,
        endDate
      );

      if (apiResponse && apiResponse.data && apiResponse.data.length > 0) {
        setHistoryData(apiResponse.data);
        setStockHistoryData(apiResponse.data); // 상위로 데이터 전달 (★)
        setActualEndDate(apiResponse.endDate);
        setShowChartAndTable(true);
      } else {
        setError(
          apiResponse?.message ||
            `${symbol.toUpperCase()}에 대한 ${startDate}부터 ${endDate}까지의 주가 데이터를 찾을 수 없습니다.`
        );
        setHistoryData(null);
        setStockHistoryData(null);
        setActualEndDate(null);
        setShowChartAndTable(false);
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      console.error('Error fetching stock history:', err);
      setError(
        `주가 데이터를 불러오는 중 오류가 발생했습니다: ${
          err.message || String(err)
        }`
      );
      // 모든 관련 상태 초기화
      setHistoryData(null);
      setStockHistoryData(null);
      setActualEndDate(null);
      setShowChartAndTable(false);
    } finally {
      setLoading(false);
    }
  }, [symbol, startDate, endDate, setStockHistoryData]);

  useEffect(() => {
    setHistoryData(null);
    setActualEndDate(null);
    setError(null);
    setShowChartAndTable(false);
  }, [symbol, setHistoryData]);

  const chartData = formatChartData(historyData);
  const displayEndDate = actualEndDate || endDate;

  const formatNumber = (num: number, isCurrency: boolean = true) => {
    if (typeof num !== 'number' || isNaN(num)) return '-';
    if (isCurrency) {
      return num.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
    }
    return num.toLocaleString('en-US');
  };

  // ⭐ 툴팁 포맷터 함수 추가
  const tooltipFormatter = useCallback((value: number, name: string) => {
    if (name === '종가') {
      return value.toFixed(2); // 종가는 소수점 2자리
    }
    if (name === '거래량') {
      if (value === 0) return '0';
      if (value >= 1000) {
        return `${(value / 1000).toLocaleString()}K`; // 1,000 이상은 K로 표시
      }
      return value.toLocaleString(); // 1,000 미만은 그대로 표시
    }
    return value.toLocaleString(); // 그 외 숫자는 기본 로케일 포맷
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (showChartAndTable && historyData && historyData.length > 0) {
      setShowChartAndTable(false);
      setHistoryData(null);
      setActualEndDate(null);
    } else {
      fetchHistory();
    }
  };

  return (
    <div className="rounded-2xl border-2 border-yellow-400 p-6">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg">📈</span>
        <span className="font-semibold text-lg">기간별 주가 히스토리 조회</span>
      </div>
      <form
        className="flex flex-col sm:flex-row gap-3 items-center justify-between px-5"
        onSubmit={handleSubmit}
      >
        <div className="flex flex-row items-center gap-2">
          <Input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="max-w-[180px] bg-neutral-100"
          />
          <span className="text-sm text-muted-foreground mx-0 sm:mx-2">~</span>
          <Input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="max-w-[180px] bg-neutral-100"
          />
        </div>
        <Button
          type="submit"
          className="w-full sm:w-auto mt-2 sm:mt-0 bg-black text-white"
          disabled={loading}
        >
          {loading ? '조회 중...' : '주가 데이터 조회'}
        </Button>
      </form>

      <div className="mt-6">
        {loading && (
          <div className="space-y-4">
            <Skeleton className="h-[200px] w-full" />
            <Skeleton className="h-4 w-[250px]" />
          </div>
        )}

        {error && (
          <Alert variant="destructive">
            <Terminal className="h-4 w-4" />
            <AlertTitle>오류 발생</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {showChartAndTable &&
          historyData &&
          historyData.length > 0 &&
          !loading &&
          !error && (
            <Card className="mt-4 p-4 border-gray-200 bg-gray-50 shadow-sm">
              <CardTitle className="text-base mb-4">
                {symbol.toUpperCase()} 주가 히스토리 ({startDate} ~{' '}
                {displayEndDate})
              </CardTitle>

              <div className="overflow-x-auto overflow-y-auto max-h-[250px] mb-6 border rounded-md">
                <Table className="min-w-full">
                  <TableHeader className="sticky top-0 bg-gray-50 z-10">
                    <TableRow>
                      <TableHead className="w-[100px] text-center">
                        날짜
                      </TableHead>
                      <TableHead className="text-right">시작가</TableHead>
                      <TableHead className="text-right">고가</TableHead>
                      <TableHead className="text-right">저가</TableHead>
                      <TableHead className="text-right">종가</TableHead>
                      <TableHead className="text-right">거래량</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {historyData.map((item) => (
                      <TableRow key={item.Date}>
                        <TableCell className="font-medium text-center">
                          {item.Date}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatNumber(item.Open)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatNumber(item.High)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatNumber(item.Low)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatNumber(item.Close)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatNumber(item.Volume, false)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <ResponsiveContainer width="100%" height={300}>
                <LineChart
                  data={chartData}
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis yAxisId="left" orientation="left" stroke="#8884d8" />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    stroke="#82ca9d"
                    tickFormatter={(value) => {
                      if (value === 0) return '0';
                      if (value >= 1000) {
                        return `${(value / 1000).toLocaleString()}K`;
                      }
                      return value.toLocaleString();
                    }}
                  />
                  {/* ⭐ Tooltip에 formatter 속성 추가 */}
                  <Tooltip formatter={tooltipFormatter} />
                  <Legend />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="close"
                    name="종가"
                    stroke="#8884d8"
                    activeDot={{ r: 8 }}
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="volume"
                    name="거래량"
                    stroke="#82ca9d"
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </Card>
          )}

        {((!showChartAndTable && !loading && !error) ||
          !historyData ||
          historyData.length === 0) && (
          <p className="text-sm text-gray-500 mt-4">
            조회 기간을 선택하고 &apos;주가 데이터 조회&apos; 버튼을 클릭하여
            주가 히스토리를 확인하세요.
          </p>
        )}
      </div>
    </div>
  );
}