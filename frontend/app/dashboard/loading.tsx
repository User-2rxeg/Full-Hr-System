'use client';

export default function DashboardLoading() {
  return (
    <div className="space-y-6">
      {/* Header skeleton */}
      <div className="h-9 bg-slate-200 rounded w-1/3 animate-pulse"></div>
      <div className="h-4 bg-slate-200 rounded w-1/2 animate-pulse"></div>

      {/* Stats skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white rounded-lg border border-slate-200 shadow-sm p-6">
            <div className="h-5 bg-slate-200 rounded w-1/2 animate-pulse"></div>
            <div className="h-8 bg-slate-200 rounded w-2/3 mt-3 animate-pulse"></div>
          </div>
        ))}
      </div>

      {/* Content skeleton */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6">
        <div className="h-6 bg-slate-200 rounded w-1/4 animate-pulse"></div>
        <div className="mt-4 space-y-3">
          <div className="h-4 bg-slate-200 rounded animate-pulse"></div>
          <div className="h-4 bg-slate-200 rounded animate-pulse"></div>
          <div className="h-4 bg-slate-200 rounded w-5/6 animate-pulse"></div>
        </div>
      </div>
    </div>
  );
}

