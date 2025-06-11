'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Terminal } from 'lucide-react';
import { getFinancialStatement } from '@/lib/api';
import { FinancialStatementData } from '@/types/stock';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface FinancialSectionProps {
  symbol: string;
  setFinancialData: (data: FinancialStatementData | null) => void;
}

type StatementType = 'income' | 'balance' | 'cashflow';

// FinancialTable 컴포넌트 (변경 없음)
const FinancialTable = ({
  data,
  title,
}: {
  data: FinancialStatementData;
  title: string;
}) => {
  return (
    <Card className="mt-4 bg-gray-50 shadow-sm">
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto text-sm custom-scrollbar">
          <Table className="min-w-full">
            <TableHeader className="bg-gray-100">
              <TableRow>
                <TableHead key="item" className="font-semibold text-gray-800">
                  항목
                </TableHead>
                {data.years.map((year) => (
                  <TableHead
                    key={year}
                    className="text-right font-semibold text-gray-800"
                  >
                    {year}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.data.map((row, rowIndex) => (
                <TableRow key={rowIndex}>
                  <TableCell key="item" className="font-medium text-gray-900">
                    {row.item}
                  </TableCell>
                  {data.years.map((year) => (
                    <TableCell key={year} className="text-right text-gray-700">
                      {row[year] ?? '-'}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

// ✅ --- 요청하신 모양의 새 스켈레톤 컴포넌트 ---
const SimpleFinancialSkeleton = () => (
  <Card className="mt-4 bg-gray-50 shadow-sm">
    <CardHeader>
      {/* 제목: 가는 직사각형 */}
      <Skeleton className="h-7 w-2/5 rounded-md" />
    </CardHeader>
    <CardContent>
      {/* 내용: 큰 직사각형 */}
      <Skeleton className="h-72 w-full" />
    </CardContent>
  </Card>
);

export default function FinancialSection({
  symbol,
  setFinancialData,
}: FinancialSectionProps) {
  const [activeTab, setActiveTab] = useState<StatementType | null>(null);
  const [statementData, setStatementData] =
    useState<FinancialStatementData | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(
    async (statementType: StatementType) => {
      if (activeTab === statementType) {
        setActiveTab(null);
        setStatementData(null);
        setFinancialData(null);
        return;
      }

      setLoading(true);
      setError(null);
      setStatementData(null);
      setFinancialData(null);
      setActiveTab(statementType);

      try {
        const data = await getFinancialStatement(symbol, statementType);
        setStatementData(data);
        setFinancialData(data);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : '알 수 없는 오류';
        setError(`데이터 로딩 실패: ${errorMessage}`);
        setFinancialData(null);
      } finally {
        setLoading(false);
      }
    },
    [symbol, activeTab, setFinancialData]
  );

  useEffect(() => {
    setActiveTab(null);
    setStatementData(null);
    setError(null);
    setFinancialData(null);
  }, [symbol, setFinancialData]);

  const getStatementName = (type: StatementType | null) => {
    if (!type) return '';
    const names = {
      income: '손익 계산서',
      balance: '대차 대조표',
      cashflow: '현금 흐름표',
    };
    return names[type];
  };

  return (
    <Card className="rounded-2xl border-2 border-blue-400">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span className="text-lg">📊</span>
          <span className="font-semibold text-lg">재무제표 상세</span>
          <span className="ml-4 text-base font-semibold text-gray-700">
            ({symbol})
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex justify-center gap-40">
          <Button
            variant={activeTab === 'income' ? 'default' : 'outline'}
            onClick={() => fetchData('income')}
            disabled={loading}
          >
            손익계산서
          </Button>
          <Button
            variant={activeTab === 'balance' ? 'default' : 'outline'}
            onClick={() => fetchData('balance')}
            disabled={loading}
          >
            대차대조표
          </Button>
          <Button
            variant={activeTab === 'cashflow' ? 'default' : 'outline'}
            onClick={() => fetchData('cashflow')}
            disabled={loading}
          >
            현금흐름표
          </Button>
        </div>

        <div className="mt-2">
          {loading && <SimpleFinancialSkeleton />}

          {error && !loading && (
            <Alert variant="destructive" className="mt-4">
              <Terminal className="h-4 w-4" />
              <AlertTitle>오류 발생</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {!loading && !error && statementData && activeTab && (
            <FinancialTable
              data={statementData}
              title={`${symbol.toUpperCase()} - ${getStatementName(activeTab)}`}
            />
          )}

          {!loading && !activeTab && !error && (
            <p className="text-sm text-center text-gray-500 pt-10">
              상단의 버튼을 클릭하여 재무제표를 조회해보세요.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
