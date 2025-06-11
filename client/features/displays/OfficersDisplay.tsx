import { CardContent } from '@/components/ui/card';
import { Officer } from '@/types/stock';

export const OfficersDisplay = ({ data }: { data: Officer[] }) => (
  <CardContent className="space-y-2 text-sm">
    {data.length > 0 ? (
      <ul className="list-disc pl-5 space-y-1">
        {data.map((officer, index) => (
          <li key={index}>
            <strong>{officer.name}</strong> - {officer.title} (총 보수:{' '}
            {officer.totalPayUSD})
          </li>
        ))}
      </ul>
    ) : (
      <p>임원 정보를 찾을 수 없습니다.</p>
    )}
  </CardContent>
);
