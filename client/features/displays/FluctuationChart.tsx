/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceDot,
} from 'recharts';
import { EventInfo } from '@/types/common';
import { StockHistoryData } from '../../types/stock';

interface FluctuationChartProps {
  history: StockHistoryData[];
  events: EventInfo[];
  ticker: string;
}

export function FluctuationChart({
  history,
  events,
  ticker,
}: FluctuationChartProps) {
  if (!history || history.length === 0) {
    return (
      <div className="text-center p-4 text-red-500">
        차트 데이터를 불러오는 데 실패했습니다.
      </div>
    );
  }
  const eventDates = new Set(events.map((e) => e.trough_date));

  // 커스텀 툴팁
  const CustomTooltipContent = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background/90 p-2 border rounded-md shadow-lg text-sm">
          <p className="font-bold">{label}</p>
          <p
            style={{ color: payload[0].stroke }}
          >{`종가: ${payload[0].value.toLocaleString(undefined, {
            maximumFractionDigits: 2,
          })}`}</p>
          {eventDates.has(label) && (
            <p className="text-red-500 font-bold mt-1">🔻 저점 발생</p>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="p-4 bg-gray-50 rounded-lg">
      <h4 className="text-md font-semibold mb-2">{ticker} 주가 차트</h4>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart
          data={history}
          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="Date" tick={{ fontSize: 12 }} />
          <YAxis
            domain={['auto', 'auto']}
            tickFormatter={(val) => val.toLocaleString()}
            tick={{ fontSize: 12 }}
          />
          <Tooltip content={<CustomTooltipContent />} />
          <Legend />
          <Line
            type="monotone"
            dataKey="Close"
            name="종가"
            stroke="#8884d8"
            dot={false}
            strokeWidth={2}
          />
          {events.map((event) => (
            <ReferenceDot
              key={`${event.trough_date}-${event.trough_price}`}
              x={event.trough_date}
              y={event.trough_price}
              r={5}
              fill="#ef4444"
              stroke="white"
              strokeWidth={1}
              ifOverflow="extendDomain"
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
