import { CardContent } from '@/components/ui/card';
import { InvestmentMetrics } from '@/types/stock';

export const MetricsDisplay = ({ data }: { data: InvestmentMetrics }) => (
  <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3 text-sm">
    <p>
      <strong>Trailing P/E (후행 PER):</strong> {data.trailingPE}
    </p>
    <p>
      <strong>Forward P/E (선행 PER):</strong> {data.forwardPE}
    </p>
    <p>
      <strong>Price to Book (PBR):</strong> {data.priceToBook}
    </p>
    <p>
      <strong>Return on Equity (ROE):</strong> {data.returnOnEquity}
    </p>
    <p>
      <strong>Return on Assets (ROA):</strong> {data.returnOnAssets}
    </p>
    <p>
      <strong>Beta (베타):</strong> {data.beta}
    </p>
  </CardContent>
);
