'use client';

import { Fragment } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { AreaChart } from 'lucide-react';
import {
  FluctuationStockInfo,

  EventInfo,
} from '@/types/common';
import { StockHistoryData } from '../../types/stock';
import { FluctuationChart } from './FluctuationChart';


interface FluctuationTableProps {
  analysisData: FluctuationStockInfo[];
  selectedTicker: {
    ticker: string;
    history: StockHistoryData[];
    events: EventInfo[];
    error?: string;
  } | null;
  onRowClick: (stock: FluctuationStockInfo) => void;
}

export function FluctuationTable({
  analysisData,
  selectedTicker,
  onRowClick,
}: FluctuationTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="text-center">종목코드</TableHead>
          <TableHead className="text-center">종목명</TableHead>
          <TableHead className="text-center">발생 횟수</TableHead>
          <TableHead className="text-center">최근 하락일</TableHead>
          <TableHead className="text-center">최근 하락일 종가</TableHead>
          <TableHead className="text-center">최근 최대반등일</TableHead>
          <TableHead className="text-center">최근 최대반등률(%)</TableHead>
          <TableHead className="text-center">그래프</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {analysisData.map((stock) => (
          <Fragment key={stock.ticker}>
            <TableRow
              onClick={() => onRowClick(stock)}
              className="cursor-pointer hover:bg-muted/50"
            >
              <TableCell className="text-right">{stock.ticker}</TableCell>
              <TableCell className="text-right">{stock.name}</TableCell>
              <TableCell className="text-right font-bold">
                {stock.occurrence_count}
              </TableCell>
              <TableCell className="text-right">
                {stock.recent_trough_date}
              </TableCell>
              <TableCell className="text-right">
                {stock.recent_trough_price.toLocaleString(undefined, {
                  maximumFractionDigits: 2,
                })}
              </TableCell>
              <TableCell className="text-right">
                {stock.recent_rebound_date}
              </TableCell>
              <TableCell className="text-right text-green-600 font-semibold">
                {stock.recent_rebound_performance.toFixed(2)}%
              </TableCell>
              <TableCell className="text-center">
                <Button variant="ghost" size="icon" className="mx-auto flex">
                  <AreaChart className="w-5 h-5" />
                </Button>
              </TableCell>
            </TableRow>
            {/* 클릭된 행 아래에 조건부로 차트 렌더링 */}
            {selectedTicker?.ticker === stock.ticker && (
              <TableRow>
                <TableCell colSpan={8}>
                  {selectedTicker.error ? (
                    <p className="text-red-500 text-center p-4">
                      {selectedTicker.error}
                    </p>
                  ) : selectedTicker.history.length > 0 ? (
                    <FluctuationChart
                      history={selectedTicker.history}
                      events={selectedTicker.events}
                      ticker={stock.name}
                    />
                  ) : (
                    <Skeleton className="w-full h-[300px]" />
                  )}
                </TableCell>
              </TableRow>
            )}
          </Fragment>
        ))}
      </TableBody>
    </Table>
  );
}
