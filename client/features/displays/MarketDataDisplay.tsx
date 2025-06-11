import { CardContent } from '@/components/ui/card';
import { MarketData } from '@/types/stock';

export const MarketDataDisplay = ({ data }: { data: MarketData }) => (
  <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3 text-sm">
    <p>
      <strong>현재가:</strong> {data.currentPrice}
    </p>
    <p>
      <strong>이전 종가:</strong> {data.previousClose}
    </p>
    <p>
      <strong>금일 고가:</strong> {data.dayHigh}
    </p>
    <p>
      <strong>금일 저가:</strong> {data.dayLow}
    </p>
    <p>
      <strong>52주 최고가:</strong> {data.fiftyTwoWeekHigh}
    </p>
    <p>
      <strong>52주 최저가:</strong> {data.fiftyTwoWeekLow}
    </p>
    <p>
      <strong>시가총액:</strong> {data.marketCap}
    </p>
    <p>
      <strong>발행 주식 수:</strong> {data.sharesOutstanding}
    </p>
    <p>
      <strong>거래량:</strong> {data.volume}
    </p>
  </CardContent>
);
