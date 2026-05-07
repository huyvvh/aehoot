import { cn } from "@/lib/utils"

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn("animate-pulse rounded-md bg-muted", className)}
      {...props}
    />
  )
}

export { Skeleton }

export function SetCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl overflow-hidden shadow-[0_4px_0_#e0e0e0] border border-gray-100">
      <Skeleton className="h-28 w-full rounded-none bg-gray-200" />
      <div className="p-4 space-y-3">
        <Skeleton className="h-5 w-3/4 bg-gray-200" />
        <Skeleton className="h-4 w-1/2 bg-gray-200" />
        <div className="flex gap-2 pt-1">
          <Skeleton className="h-6 w-16 bg-gray-200" />
          <Skeleton className="h-6 w-20 bg-gray-200" />
        </div>
      </div>
    </div>
  );
}

export function GameRowSkeleton() {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex gap-4 items-center">
      <Skeleton className="h-12 w-12 rounded-xl shrink-0 bg-gray-200" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-5 w-1/3 bg-gray-200" />
        <Skeleton className="h-4 w-1/4 bg-gray-200" />
      </div>
      <Skeleton className="h-8 w-20 hidden sm:block bg-gray-200" />
    </div>
  );
}

export function DashboardStatsSkeleton() {
  return (
    <div className="bg-[#7c5cbf] rounded-2xl px-6 py-4 shadow-[0_4px_0_#5e3d9e]">
      <Skeleton className="h-8 w-36 bg-white/20 mb-3" />
      <div className="flex gap-6">
        <Skeleton className="h-12 w-24 bg-white/20 rounded-xl" />
        <Skeleton className="h-12 w-24 bg-white/20 rounded-xl" />
      </div>
    </div>
  );
}
