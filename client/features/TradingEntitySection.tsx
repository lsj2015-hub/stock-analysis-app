/* eslint-disable @typescript-eslint/no-explicit-any */
// client/features/TradingEntitySection.tsx
'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import { format, subDays } from 'date-fns';
import { ko } from 'date-fns/locale';
import { Calendar as CalendarIcon } from 'lucide-react';
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
  ReferenceLine,
} from 'recharts';

import { cn } from '@/lib/utils';
import { getTradingVolume, getTopNetPurchases } from '@/lib/api';
import { NetPurchaseData, TradingVolumeResponse } from '@/types/common';

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
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

const INVESTOR_MAIN_TYPES = [
  '기관합계',
  '개인',
  '외국인',
  '기타법인',
  '기타외국인',
];
const INSTITUTION_TYPE = [
  '금융투자',
  '보험',
  '투신',
  '사모',
  '은행',
  '기타금융',
  '연기금',
];

const CHART_COLORS = [
  '#8884d8',
  '#82ca9d',
  '#ffc658',
  '#ff7300',
  '#00C49F',
  '#FFBB28',
  '#FF8042',
  '#0088FE',
  '#AF19FF',
  '#FF4560',
  '#775DD0',
  '#546E7A',
];

const SectionSkeleton = () => (
  <Card className="rounded-2xl border-2 border-green-400">
    <CardHeader>
      <Skeleton className="h-8 w-1/3" />
      <Skeleton className="h-4 w-2/3" />
    </CardHeader>
    <CardContent>
      <Skeleton className="h-96 w-full" />
    </CardContent>
  </Card>
);
const CustomTooltipContent = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-background/90 p-2 border rounded-md shadow-lg text-sm">
        <p className="font-bold">{label}</p>
        {payload.map((pld: any) => (
          <div key={pld.dataKey} style={{ color: pld.fill }}>{`${
            pld.name
          }: ${formatToBillionWons(pld.value)}`}</div>
        ))}
      </div>
    );
  }
  return null;
};
const formatToBillionWons = (value: any) => {
  const num = Number(value);
  if (isNaN(num)) return value;
  return `${(num / 1e8).toLocaleString('ko-KR', {
    maximumFractionDigits: 1,
  })}억`;
};

export function TradingEntitySection() {
  const [isClient, setIsClient] = useState(false);
  const [tradingVolume, setTradingVolume] = useState<{
    request: {
      startDate?: Date;
      endDate?: Date;
      ticker: string;
      detail: boolean;
      institutionOnly: boolean;
    };
    response: TradingVolumeResponse | null;
    loading: boolean;
    error: string | null;
  }>({
    request: { ticker: 'KOSPI', detail: false, institutionOnly: false },
    response: null,
    loading: false,
    error: null,
  });
  const [netPurchase, setNetPurchase] = useState<{
    request: {
      startDate?: Date;
      endDate?: Date;
      market: 'KOSPI' | 'KOSDAQ';
      investor: string;
    };
    response: NetPurchaseData[] | null;
    loading: boolean;
    error: string | null;
  }>({
    request: { market: 'KOSPI', investor: '기관합계' },
    response: null,
    loading: false,
    error: null,
  });
  const [showNetPurchaseInstDetails, setShowNetPurchaseInstDetails] =
    useState(false);

  useEffect(() => {
    setIsClient(true);
    const today = new Date();
    const sevenDaysAgo = subDays(today, 7);
    setTradingVolume((prev) => ({
      ...prev,
      request: { ...prev.request, startDate: sevenDaysAgo, endDate: today },
    }));
    setNetPurchase((prev) => ({
      ...prev,
      request: { ...prev.request, startDate: sevenDaysAgo, endDate: today },
    }));
  }, []);

  const handleFetchTradingVolume = useCallback(async () => {
    if (!tradingVolume.request.startDate || !tradingVolume.request.endDate) {
      setTradingVolume((prev) => ({ ...prev, error: '날짜를 선택해주세요.' }));
      return;
    }
    setTradingVolume((prev) => ({
      ...prev,
      loading: true,
      error: null,
      response: null,
    }));
    try {
      const res = await getTradingVolume({
        start_date: format(tradingVolume.request.startDate, 'yyyyMMdd'),
        end_date: format(tradingVolume.request.endDate, 'yyyyMMdd'),
        ticker: tradingVolume.request.ticker || 'KOSPI',
        detail: tradingVolume.request.detail,
        institution_only: tradingVolume.request.institutionOnly,
      });
      if (res.data && res.data.length > 0 && res.index_name === '날짜') {
        const formattedData = res.data.map((item) => ({
          ...item,
          날짜: String(item.날짜).split('T')[0],
        }));
        setTradingVolume((prev) => ({
          ...prev,
          response: { ...res, data: formattedData },
          loading: false,
        }));
      } else {
        setTradingVolume((prev) => ({
          ...prev,
          response: res,
          loading: false,
        }));
      }
    } catch (err: any) {
      setTradingVolume((prev) => ({
        ...prev,
        error: err.message,
        response: null,
        loading: false,
      }));
    }
  }, [tradingVolume.request]);

  const handleFetchNetPurchase = useCallback(async () => {
    if (!netPurchase.request.startDate || !netPurchase.request.endDate) {
      setNetPurchase((prev) => ({ ...prev, error: '날짜를 선택해주세요.' }));
      return;
    }
    setNetPurchase((prev) => ({
      ...prev,
      loading: true,
      error: null,
      response: null,
    }));
    try {
      const res = await getTopNetPurchases({
        start_date: format(netPurchase.request.startDate, 'yyyyMMdd'),
        end_date: format(netPurchase.request.endDate, 'yyyyMMdd'),
        market: netPurchase.request.market,
        investor: netPurchase.request.investor,
      });
      setNetPurchase((prev) => ({
        ...prev,
        response: res.data,
        loading: false,
      }));
    } catch (err: any) {
      setNetPurchase((prev) => ({
        ...prev,
        error: err.message,
        response: null,
        loading: false,
      }));
    }
  }, [netPurchase.request]);

  const tradingChartData = useMemo(() => {
    if (!tradingVolume.response?.data) return [];
    return tradingVolume.response.data.map((item) => {
      const newItem: { [key: string]: any } = {};
      for (const key in item) {
        const isNumeric =
          !isNaN(parseFloat(item[key] as any)) && isFinite(item[key] as any);
        newItem[key] = isNumeric ? Number(item[key]) : item[key];
      }
      return newItem;
    });
  }, [tradingVolume.response]);

  const filteredTradingData = useMemo(() => {
    if (tradingChartData.length === 0) return [];
    if (tradingVolume.request.institutionOnly) {
      return tradingChartData.filter((d: any) =>
        INSTITUTION_TYPE.includes(d.투자자구분)
      );
    }
    return tradingChartData.filter((d: any) =>
      INVESTOR_MAIN_TYPES.includes(d.투자자구분)
    );
  }, [tradingChartData, tradingVolume.request.institutionOnly]);

  const investorKeys = useMemo(() => {
    if (tradingChartData.length === 0) return [];
    return Object.keys(tradingChartData[0]).filter(
      (k) => k !== '날짜' && k !== '전체' && k !== '투자자구분'
    );
  }, [tradingChartData]);

  if (!isClient) return <SectionSkeleton />;

  return (
    <Card className="rounded-2xl border-2 border-green-400">
      <CardHeader>
        <CardTitle className="text-2xl font-semibold">
          투자자별 매매현황
        </CardTitle>
        <CardDescription>
          기간별, 투자자별 거래 동향 및 순매수 상위 종목을 분석합니다.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-12">
        <div className="space-y-4">
          <h3 className="text-xl font-semibold">일자별 투자자 매매현황</h3>
          <div className="p-4 border rounded-md bg-muted/30 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
            <div className="flex flex-col space-y-1.5">
              <Label>시작일</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'font-normal w-full justify-start',
                      !tradingVolume.request.startDate &&
                        'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {tradingVolume.request.startDate
                      ? format(tradingVolume.request.startDate, 'PPP', {
                          locale: ko,
                        })
                      : '날짜 선택...'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={tradingVolume.request.startDate}
                    onSelect={(date) =>
                      setTradingVolume((p) => ({
                        ...p,
                        request: { ...p.request, startDate: date! },
                      }))
                    }
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="flex flex-col space-y-1.5">
              <Label>종료일</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'font-normal w-full justify-start',
                      !tradingVolume.request.endDate && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {tradingVolume.request.endDate
                      ? format(tradingVolume.request.endDate, 'PPP', {
                          locale: ko,
                        })
                      : '날짜 선택...'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={tradingVolume.request.endDate}
                    onSelect={(date) =>
                      setTradingVolume((p) => ({
                        ...p,
                        request: { ...p.request, endDate: date! },
                      }))
                    }
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="flex flex-col space-y-1.5">
              <Label>시장/종목코드</Label>
              <Input
                value={tradingVolume.request.ticker}
                onChange={(e) =>
                  setTradingVolume((p) => ({
                    ...p,
                    request: {
                      ...p.request,
                      ticker: e.target.value.toUpperCase(),
                    },
                  }))
                }
                placeholder="KOSPI, 005930..."
              />
            </div>
            <div className="flex flex-col space-y-1.5 pt-7">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="detail-checkbox"
                  checked={tradingVolume.request.detail}
                  onCheckedChange={(checked) =>
                    setTradingVolume((p) => ({
                      ...p,
                      request: {
                        ...p.request,
                        detail: !!checked,
                        institutionOnly: false,
                      },
                    }))
                  }
                />
                <Label htmlFor="detail-checkbox">일자별 상세</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="institution-checkbox"
                  checked={tradingVolume.request.institutionOnly}
                  disabled={tradingVolume.request.detail}
                  onCheckedChange={(checked) =>
                    setTradingVolume((p) => ({
                      ...p,
                      request: { ...p.request, institutionOnly: !!checked },
                    }))
                  }
                />
                <Label
                  htmlFor="institution-checkbox"
                  className={cn(
                    tradingVolume.request.detail && 'text-muted-foreground'
                  )}
                >
                  기관 세부항목
                </Label>
              </div>
            </div>
            <div className="lg:col-span-1 flex justify-end">
              <Button
                onClick={handleFetchTradingVolume}
                disabled={
                  tradingVolume.loading || !tradingVolume.request.startDate
                }
              >
                {tradingVolume.loading ? '조회 중...' : '조회'}
              </Button>
            </div>
          </div>
          {tradingVolume.loading && <Skeleton className="h-72 w-full mt-4" />}
          {tradingVolume.error && (
            <p className="text-red-500 text-center mt-2">
              {tradingVolume.error}
            </p>
          )}
          {tradingChartData.length > 0 && (
            <div className="mt-4 space-y-6">
              <ResponsiveContainer width="100%" height={400}>
                {tradingVolume.request.detail ? (
                  <BarChart
                    data={tradingChartData}
                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="날짜" />
                    <YAxis tickFormatter={formatToBillionWons} />
                    <Tooltip content={<CustomTooltipContent />} />
                    <Legend />
                    <ReferenceLine
                      y={0}
                      stroke="#000"
                      strokeWidth={1}
                      strokeDasharray="3 3"
                    />
                    {investorKeys.map((key, index) => (
                      <Bar
                        key={key}
                        dataKey={key}
                        fill={CHART_COLORS[index % CHART_COLORS.length]}
                        name={key}
                      />
                    ))}
                  </BarChart>
                ) : (
                  <BarChart
                    data={filteredTradingData}
                    layout="vertical"
                    margin={{ left: 30 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" tickFormatter={formatToBillionWons} />
                    <YAxis dataKey="투자자구분" type="category" width={80} />
                    <Tooltip
                      formatter={(value: number) => formatToBillionWons(value)}
                      cursor={{ fill: 'rgba(206, 206, 206, 0.2)' }}
                    />
                    <Bar dataKey="순매수" name="순매수 금액(억원)">
                      {filteredTradingData.map((entry: any, index: number) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={entry.순매수 >= 0 ? '#82ca9d' : '#ff8042'}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                )}
              </ResponsiveContainer>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {Object.keys(tradingVolume.response!.data[0]).map(
                        (key) => (
                          <TableHead
                            key={key}
                            className={
                              typeof tradingVolume.response!.data[0][key] ===
                              'number'
                                ? 'text-right'
                                : ''
                            }
                          >
                            {key}
                          </TableHead>
                        )
                      )}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tradingVolume.response!.data.map((row, i) => (
                      <TableRow key={i}>
                        {Object.values(row).map((value, j) => (
                          <TableCell
                            key={j}
                            className={
                              typeof value === 'number' ? 'text-right' : ''
                            }
                          >
                            {typeof value === 'number'
                              ? formatToBillionWons(value)
                              : String(value)}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <h3 className="text-xl font-semibold">투자자별 순매수 상위종목</h3>
          <div className="p-4 border rounded-md bg-muted/30 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
            <div className="flex flex-col space-y-1.5">
              <Label>시작일</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'font-normal w-full justify-start',
                      !netPurchase.request.startDate && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {netPurchase.request.startDate
                      ? format(netPurchase.request.startDate, 'PPP', {
                          locale: ko,
                        })
                      : '날짜 선택...'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={netPurchase.request.startDate}
                    onSelect={(date) =>
                      setNetPurchase((p) => ({
                        ...p,
                        request: { ...p.request, startDate: date! },
                      }))
                    }
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="flex flex-col space-y-1.5">
              <Label>종료일</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'font-normal w-full justify-start',
                      !netPurchase.request.endDate && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {netPurchase.request.endDate
                      ? format(netPurchase.request.endDate, 'PPP', {
                          locale: ko,
                        })
                      : '날짜 선택...'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={netPurchase.request.endDate}
                    onSelect={(date) =>
                      setNetPurchase((p) => ({
                        ...p,
                        request: { ...p.request, endDate: date! },
                      }))
                    }
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="flex flex-col space-y-1.5">
              <Label>시장</Label>
              <Select
                value={netPurchase.request.market}
                onValueChange={(value: 'KOSPI' | 'KOSDAQ') =>
                  setNetPurchase((p) => ({
                    ...p,
                    request: { ...p.request, market: value },
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="KOSPI">KOSPI</SelectItem>
                  <SelectItem value="KOSDAQ">KOSDAQ</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex-grow grid grid-cols-2 gap-x-2 items-end">
              <div className="flex flex-col space-y-1.5">
                <Label>투자자</Label>
                <Select
                  value={netPurchase.request.investor}
                  onValueChange={(value) =>
                    setNetPurchase((p) => ({
                      ...p,
                      request: { ...p.request, investor: value },
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(showNetPurchaseInstDetails
                      ? INSTITUTION_TYPE
                      : INVESTOR_MAIN_TYPES
                    ).map((opt: string) => (
                      <SelectItem key={opt} value={opt}>
                        {opt}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center space-x-2 pb-1.5">
                <Checkbox
                  id="net-purchase-institution-checkbox"
                  checked={showNetPurchaseInstDetails}
                  onCheckedChange={(checked) => {
                    setShowNetPurchaseInstDetails(!!checked);
                    setNetPurchase((p) => ({
                      ...p,
                      request: {
                        ...p.request,
                        investor: !!checked
                          ? INSTITUTION_TYPE[0]
                          : INVESTOR_MAIN_TYPES[0],
                      },
                    }));
                  }}
                />
                <Label htmlFor="net-purchase-institution-checkbox">
                  기관 세부
                </Label>
              </div>
            </div>
            <div className="md:col-span-4 flex justify-end">
              <Button
                onClick={handleFetchNetPurchase}
                disabled={netPurchase.loading || !netPurchase.request.startDate}
              >
                {netPurchase.loading ? '조회 중...' : '조회'}
              </Button>
            </div>
          </div>
          {netPurchase.loading && <Skeleton className="h-96 w-full mt-4" />}
          {netPurchase.error && (
            <p className="text-red-500 text-center mt-2">{netPurchase.error}</p>
          )}
          {netPurchase.response && netPurchase.response.length > 0 && (
            <ResponsiveContainer width="100%" height={400}>
              <BarChart
                data={netPurchase.response}
                layout="vertical"
                margin={{ left: 20, right: 20, top: 20, bottom: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" tickFormatter={formatToBillionWons} />
                <YAxis
                  dataKey="name"
                  type="category"
                  width={120}
                  tick={{ fontSize: 12 }}
                />
                <Tooltip
                  formatter={(value: number) => formatToBillionWons(value)}
                />
                <Legend
                  verticalAlign="top"
                  wrapperStyle={{ paddingBottom: '10px' }}
                />
                <Bar dataKey="value" name="순매수 금액(억원)" fill="#82ca9d" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
