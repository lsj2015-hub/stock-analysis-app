import { CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export const OfficersSkeleton = () => (
  <CardContent className="space-y-3 text-sm">
    {Array.from({ length: 3 }).map((_, i) => (
      <div className="flex items-center gap-2" key={i}>
        <Skeleton className="h-5 w-4" />
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-5 w-60" />
      </div>
    ))}
  </CardContent>
);
