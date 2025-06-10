'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Terminal } from 'lucide-react';
import {
  getFinancialStatement,
} from '@/lib/data-manager';
import {
  FinancialStatementData,
} from '@/types/stock';

interface FinancialSectionProps {
  symbol: string;
  setFinancialData: (data: FinancialStatementData | null) => void;
}

export default function FinancialSection({
  symbol,
  setFinancialData
}: FinancialSectionProps) {
  const [activeTab, setActiveTab] = useState<
    'income' | 'balance' | 'cashflow' | null
  >(null);
  const [incomeStatement, setIncomeStatement] =
    useState<FinancialStatementData | null>(null);
  const [balanceSheet, setBalanceStatement] =
    useState<FinancialStatementData | null>(null);
  const [cashFlow, setCashFlow] = useState<FinancialStatementData | null>(null);

  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const resetDataStates = useCallback(() => {
    setIncomeStatement(null);
    setBalanceStatement(null);
    setCashFlow(null);
    setFinancialData(null);
  }, [setFinancialData]);

  const fetchData = useCallback(
    async (statementType: 'income' | 'balance' | 'cashflow') => {
      // ***************** 토글 로직 추가 *****************
      if (activeTab === statementType) {
        // 이미 활성화된 탭을 다시 클릭한 경우, 데이터를 숨깁니다.
        setActiveTab(null); // 현재 탭 비활성화
        resetDataStates(); // 모든 데이터 초기화
        setLoading(false);
        setError(null);
        return; // 여기서 함수 실행을 중단
      }
      // ***************** 토글 로직 끝 *****************
      resetDataStates();
      setLoading(true);
      setError(null);
      setActiveTab(statementType);

      if (!symbol) {
        setError('종목 코드를 입력해주세요.');
        setLoading(false);
        return;
      }

      try {
        const data: FinancialStatementData | null = await getFinancialStatement(
          symbol.toUpperCase(),
          statementType
        );

        if (data && data.years && data.data && data.data.length > 0) {
          switch (statementType) {
            case 'income':
              setIncomeStatement(data);
              break;
            case 'balance':
              setBalanceStatement(data);
              break;
            case 'cashflow':
              setCashFlow(data);
              break;
          }
          setFinancialData(data); // 성공적으로 데이터를 가져오면 상위 컴포넌트로 전달
        } else {
          setError(
            `'${symbol.toUpperCase()}'에 대한 ${getStatementName(
              statementType
            )} 데이터를 찾을 수 없습니다. (데이터 없음 또는 형식 오류)`
          );
          setIncomeStatement(null);
          setBalanceStatement(null);
          setCashFlow(null);
          setFinancialData(null); // **실패 시에만 null로**
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (err: any) {
        console.error(`Failed to fetch ${statementType} data:`, err);
        setError(
          `데이터를 불러오는 중 오류가 발생했습니다. (API 오류 또는 네트워크 문제): ${
            err.message || String(err)
          }`
        );
        setIncomeStatement(null);
        setBalanceStatement(null);
        setCashFlow(null);
      } finally {
        setLoading(false);
        console.log('로딩 완료. activeTab:', statementType);
      }
    },
    [symbol, activeTab, resetDataStates, setFinancialData]
  );

  const getStatementName = (type: 'income' | 'balance' | 'cashflow') => {
    switch (type) {
      case 'income':
        return '손익 계산서';
      case 'balance':
        return '대차 대조표';
      case 'cashflow':
        return '현금 흐름표';
      default:
        return '';
    }
  };

  // symbol이 변경될 때 모든 재무 데이터 상태를 초기화하고,
  // 아무 탭도 활성화되지 않도록 activeTab을 null로 설정합니다.
  useEffect(() => {
    // 종목 코드가 변경되면, 이전의 모든 재무 데이터와 에러 상태를 초기화합니다.
    resetDataStates();
    setActiveTab(null); // 활성화된 탭 초기화
    setError(null); // 에러 메시지 초기화
  }, [symbol, resetDataStates]); // resetDataStates를 의존성 배열에 추가

  const FinancialTable = ({
    data,
    title,
  }: {
    data: FinancialStatementData | null;
    title: string;
  }) => {
    if (
      !data ||
      !data.data ||
      data.data.length === 0 ||
      !data.years ||
      data.years.length === 0
    ) {
      return (
        <Card className="mt-4 p-4 border-gray-200 bg-gray-50 shadow-sm">
          <CardTitle className="text-base mb-2">{title}</CardTitle>
          <p className="text-sm text-gray-500">
            {title} 데이터를 찾을 수 없습니다.
          </p>
        </Card>
      );
    }

    // 데이터의 첫 번째 행에서 컬럼을 가져오되, 'item' 컬럼은 항상 첫 번째로
    const allKeys = new Set<string>();
    data.data.forEach((row) => {
      Object.keys(row).forEach((key) => allKeys.add(key));
    });
    // data.years에 있는 연도만 컬럼으로 사용하고, 실제 row.data에 해당 연도 키가 있는지도 확인
    const columns = ['item', ...data.years.filter((year) => allKeys.has(year))];

    return (
      <Card className="mt-4 p-4 border-gray-200 bg-gray-50 shadow-sm">
        <CardTitle className="text-base mb-2">{title}</CardTitle>
        <div className="overflow-x-auto text-sm">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-100">
              <tr>
                {columns.map((col) => (
                  <th
                    key={col}
                    scope="col"
                    className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider"
                  >
                    {col === 'item' ? '항목' : col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {data.data.map((row, rowIndex) => (
                <tr
                  key={rowIndex}
                  className={rowIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'}
                >
                  {columns.map((col, colIndex) => (
                    <td
                      key={`${rowIndex}-${colIndex}`}
                      className={`px-3 py-2 whitespace-nowrap text-sm ${
                        col === 'item'
                          ? 'font-medium text-gray-900'
                          : 'text-right text-gray-800'
                      }`}
                    >
                      {row[col] !== undefined ? row[col] : '-'}{' '}
                      {/* undefined 처리 */}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    );
  };

  return (
    <div className="rounded-2xl border-2 border-blue-400 p-6">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg">📊</span>
        <span className="font-semibold text-lg">재무제표 상세</span>
      </div>
      <div className="flex justify-between gap-2 flex-wrap px-5">
        <Button
          variant="outline"
          onClick={() => fetchData('income')}
          disabled={loading}
          className={
            activeTab === 'income'
              ? 'bg-foreground text-background font-bold'
              : ''
          }
        >
          손익계산서
        </Button>
        <Button
          variant="outline"
          onClick={() => fetchData('balance')}
          disabled={loading}
          className={
            activeTab === 'balance'
              ? 'bg-foreground text-background font-bold'
              : ''
          }
        >
          대차대조표
        </Button>
        <Button
          variant="outline"
          onClick={() => fetchData('cashflow')}
          disabled={loading}
          className={
            activeTab === 'cashflow'
              ? 'bg-foreground text-background font-bold'
              : ''
          }
        >
          현금흐름표
        </Button>
      </div>

      {/* 데이터 표시 영역 */}
      <div className="mt-6">
        {loading && (
          <div className="space-y-4">
            <Skeleton className="h-4 w-[250px]" />
            <Skeleton className="h-4 w-[200px]" />
            <Skeleton className="h-4 w-[300px]" />
            <Skeleton className="h-4 w-[150px]" />
          </div>
        )}

        {error && (
          <Alert variant="destructive">
            <Terminal className="h-4 w-4" />
            <AlertTitle>오류 발생</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* 손익계산서 */}
        {activeTab === 'income' && incomeStatement && !loading && !error && (
          <FinancialTable
            data={incomeStatement}
            title={`${symbol.toUpperCase()} - 손익 계산서`}
          />
        )}

        {/* 대차대조표 */}
        {activeTab === 'balance' && balanceSheet && !loading && !error && (
          <FinancialTable
            data={balanceSheet}
            title={`${symbol.toUpperCase()} - 대차 대조표`}
          />
        )}

        {/* 현금흐름표 */}
        {activeTab === 'cashflow' && cashFlow && !loading && !error && (
          <FinancialTable
            data={cashFlow}
            title={`${symbol.toUpperCase()} - 현금 흐름표`}
          />
        )}

        {/* activeTab이 null이 아니면서, 해당 데이터가 없는 경우 (토글로 숨겨진 경우 포함) */}
        {activeTab !== null &&
          !loading &&
          !error &&
          !incomeStatement &&
          !balanceSheet &&
          !cashFlow && (
            <p className="text-sm text-gray-500 mt-4">
              선택된 종목의 재무제표 데이터를 찾을 수 없습니다. 종목 코드를
              확인하거나, 나중에 다시 시도해주세요.
            </p>
          )}
        {/* 어떤 탭도 활성화되지 않았고, 로딩/에러가 아닐 때 초기 메시지 (선택 사항) */}
        {!activeTab && !loading && !error && (
          <p className="text-sm text-gray-500 mt-4">
            상단의 버튼을 클릭하여 재무제표를 조회해보세요.
          </p>
        )}
      </div>
    </div>
  );
}
