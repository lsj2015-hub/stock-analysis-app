import { CardContent } from '@/components/ui/card';
import { FinancialSummary } from '@/types/stock';

export const SummaryDisplay = ({ data }: { data: FinancialSummary }) => (
  <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3 text-sm">
    <p>
      <strong>총수익:</strong> {data.totalRevenue}
    </p>
    <p>
      <strong>순이익:</strong> {data.netIncomeToCommon}
    </p>
    <p>
      <strong>영업이익률:</strong> {data.operatingMargins}
    </p>
    <p>
      <strong>배당수익률:</strong> {data.dividendYield}
    </p>
    <p>
      <strong>주당순이익(EPS):</strong> {data.trailingEps}
    </p>
    <p>
      <strong>총 현금:</strong> {data.totalCash}
    </p>
    <p>
      <strong>총 부채:</strong> {data.totalDebt}
    </p>
    <p>
      <strong>부채비율:</strong> {data.debtToEquity}
    </p>
  </CardContent>
);
