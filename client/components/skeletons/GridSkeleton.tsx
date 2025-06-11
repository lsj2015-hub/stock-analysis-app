import { CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export const GridSkeleton = ({ itemCount = 8 }: { itemCount?: number }) => (
  <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 text-sm">
    {Array.from({ length: itemCount }).map((_, i) => (
      <div className="flex gap-2" key={i}>
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-5 w-20" />
      </div>
    ))}
  </CardContent>
);
