import { CardContent } from '@/components/ui/card';
import { AnalystRecommendations } from '@/types/stock';

export const RecommendationsDisplay = ({
  data,
}: {
  data: AnalystRecommendations;
}) => (
  <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3 text-sm">
    <p>
      <strong>추천 평균:</strong> {data.recommendationMean} (
      {data.recommendationKey})
    </p>
    <p>
      <strong>분석가 수:</strong> {data.numberOfAnalystOpinions}명
    </p>
    <p>
      <strong>목표 주가 (평균):</strong> {data.targetMeanPrice}
    </p>
    <p>
      <strong>목표 주가 (최고):</strong> {data.targetHighPrice}
    </p>
    <p>
      <strong>목표 주가 (최저):</strong> {data.targetLowPrice}
    </p>
  </CardContent>
);
