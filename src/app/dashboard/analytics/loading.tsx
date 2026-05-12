import { Skeleton } from "@/components/ui/skeleton";

export default function AnalyticsLoading() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-10 w-64" />
      <Skeleton className="h-[320px] w-full" />
      <Skeleton className="h-[320px] w-full" />
    </div>
  );
}
