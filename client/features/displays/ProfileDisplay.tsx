import { CardContent } from "@/components/ui/card";
import { StockProfile } from "@/types/stock";

export const ProfileDisplay = ({ data }: { data: StockProfile }) => (
  <CardContent className="space-y-2 text-sm">
    <p>
      <strong>산업:</strong> {data.industry}
    </p>
    <p>
      <strong>섹터:</strong> {data.sector}
    </p>
    <p>
      <strong>웹사이트:</strong>{' '}
      <a
        href={data.website}
        target="_blank"
        rel="noopener noreferrer"
        className="text-blue-600 hover:underline"
      >
        {data.website}
      </a>
    </p>
    <p>
      <strong>주소:</strong> {data.city}, {data.state}, {data.country}
    </p>
    <p>
      <strong>총 직원 수:</strong> {data.fullTimeEmployees?.toLocaleString()}
    </p>
    <h4 className="font-semibold mt-4">기업 요약</h4>
    <p className="text-neutral-700 whitespace-pre-wrap">
      {data.longBusinessSummary}
    </p>
  </CardContent>
);
