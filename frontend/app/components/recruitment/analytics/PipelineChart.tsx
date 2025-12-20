'use client';

// =====================================================
// Types
// =====================================================

interface PipelineStage {
  stage: string;
  count: number;
  percentage?: number;
  color?: string;
}

interface PipelineChartProps {
  /**
   * Pipeline data to display
   */
  data: PipelineStage[];
  /**
   * Chart title
   */
  title?: string;
  /**
   * Show percentages
   * @default true
   */
  showPercentages?: boolean;
  /**
   * Show counts
   * @default true
   */
  showCounts?: boolean;
  /**
   * Total for calculating percentages (if not provided, will sum counts)
   */
  total?: number;
  /**
   * Whether the chart is loading
   * @default false
   */
  isLoading?: boolean;
  /**
   * Additional CSS classes
   */
  className?: string;
  /**
   * Display variant
   * @default 'bar'
   */
  variant?: 'bar' | 'funnel' | 'horizontal';
}

// =====================================================
// Default Colors
// =====================================================

const defaultColors = [
  'bg-blue-500',
  'bg-indigo-500',
  'bg-purple-500',
  'bg-violet-500',
  'bg-emerald-500',
  'bg-slate-400',
];

const defaultTextColors = [
  'text-blue-700',
  'text-indigo-700',
  'text-purple-700',
  'text-violet-700',
  'text-emerald-700',
  'text-slate-700',
];

const defaultBgColors = [
  'bg-blue-50',
  'bg-indigo-50',
  'bg-purple-50',
  'bg-violet-50',
  'bg-emerald-50',
  'bg-slate-50',
];

// =====================================================
// Loading Skeleton
// =====================================================

function PipelineChartSkeleton({ variant }: { variant: string }) {
  if (variant === 'horizontal') {
    return (
      <div className="space-y-4 animate-pulse">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex items-center gap-4">
            <div className="w-32 h-4 bg-slate-200 rounded" />
            <div className="flex-1 h-8 bg-slate-200 rounded" />
            <div className="w-12 h-4 bg-slate-200 rounded" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-pulse">
      <div className="flex items-end justify-between h-48 gap-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-2">
            <div className={`w-full bg-slate-200 rounded-t`} style={{ height: `${(6 - i) * 20}%` }} />
            <div className="w-12 h-3 bg-slate-200 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}

// =====================================================
// Bar Chart Variant
// =====================================================

function BarChart({
  data,
  total,
  showPercentages,
  showCounts,
}: {
  data: PipelineStage[];
  total: number;
  showPercentages: boolean;
  showCounts: boolean;
}) {
  const maxCount = Math.max(...data.map((d) => d.count));

  return (
    <div className="h-64">
      <div className="flex items-end justify-between h-48 gap-3 px-2">
        {data.map((stage, index) => {
          const height = maxCount > 0 ? (stage.count / maxCount) * 100 : 0;
          const percentage = total > 0 ? ((stage.count / total) * 100).toFixed(1) : '0';
          const color = stage.color || defaultColors[index % defaultColors.length];

          return (
            <div key={stage.stage} className="flex-1 flex flex-col items-center gap-2 group">
              {/* Tooltip */}
              <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-slate-800 text-white text-xs rounded px-2 py-1 mb-1">
                {stage.count} ({percentage}%)
              </div>
              
              {/* Bar */}
              <div className="w-full relative flex-1 flex items-end">
                <div
                  className={`w-full ${color} rounded-t transition-all duration-300 hover:opacity-80`}
                  style={{ height: `${height}%`, minHeight: stage.count > 0 ? '4px' : '0' }}
                />
              </div>
              
              {/* Count */}
              {showCounts && (
                <span className="text-sm font-semibold text-slate-900">
                  {stage.count}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Labels */}
      <div className="flex justify-between gap-3 px-2 mt-3">
        {data.map((stage, index) => {
          const percentage = total > 0 ? ((stage.count / total) * 100).toFixed(1) : '0';
          
          return (
            <div key={stage.stage} className="flex-1 text-center">
              <p className="text-xs font-medium text-slate-700 truncate">
                {stage.stage}
              </p>
              {showPercentages && (
                <p className="text-xs text-slate-500">
                  {percentage}%
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// =====================================================
// Horizontal Bar Chart Variant
// =====================================================

function HorizontalChart({
  data,
  total,
  showPercentages,
  showCounts,
}: {
  data: PipelineStage[];
  total: number;
  showPercentages: boolean;
  showCounts: boolean;
}) {
  const maxCount = Math.max(...data.map((d) => d.count));

  return (
    <div className="space-y-3">
      {data.map((stage, index) => {
        const width = maxCount > 0 ? (stage.count / maxCount) * 100 : 0;
        const percentage = total > 0 ? ((stage.count / total) * 100).toFixed(1) : '0';
        const color = stage.color || defaultColors[index % defaultColors.length];
        const textColor = defaultTextColors[index % defaultTextColors.length];
        const bgColor = defaultBgColors[index % defaultBgColors.length];

        return (
          <div key={stage.stage} className="group">
            <div className="flex items-center justify-between mb-1">
              <span className={`text-sm font-medium ${textColor}`}>
                {stage.stage}
              </span>
              <span className="text-sm text-slate-600">
                {showCounts && stage.count}
                {showCounts && showPercentages && ' · '}
                {showPercentages && `${percentage}%`}
              </span>
            </div>
            <div className={`h-8 ${bgColor} rounded-lg overflow-hidden`}>
              <div
                className={`h-full ${color} rounded-lg transition-all duration-500 flex items-center justify-end pr-2`}
                style={{ width: `${Math.max(width, 0)}%` }}
              >
                {width > 15 && (
                  <span className="text-xs font-medium text-white">
                    {stage.count}
                  </span>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// =====================================================
// Funnel Chart Variant
// =====================================================

function FunnelChart({
  data,
  total,
  showPercentages,
  showCounts,
}: {
  data: PipelineStage[];
  total: number;
  showPercentages: boolean;
  showCounts: boolean;
}) {
  const firstCount = data[0]?.count || 1;

  return (
    <div className="space-y-2">
      {data.map((stage, index) => {
        const percentage = total > 0 ? ((stage.count / total) * 100).toFixed(1) : '0';
        const width = firstCount > 0 ? Math.max((stage.count / firstCount) * 100, 30) : 30;
        const color = stage.color || defaultColors[index % defaultColors.length];
        const textColor = defaultTextColors[index % defaultTextColors.length];

        return (
          <div key={stage.stage} className="flex items-center justify-center">
            <div
              className={`${color} h-12 rounded-lg flex items-center justify-between px-4 transition-all duration-300`}
              style={{ width: `${width}%` }}
            >
              <span className="text-sm font-medium text-white truncate">
                {stage.stage}
              </span>
              <span className="text-sm font-bold text-white ml-2">
                {showCounts && stage.count}
                {showPercentages && !showCounts && `${percentage}%`}
              </span>
            </div>
          </div>
        );
      })}
      
      {/* Conversion Rate Arrows */}
      <div className="mt-4 pt-4 border-t border-slate-200">
        <p className="text-xs text-center text-slate-500 mb-2">Stage Conversion</p>
        <div className="flex items-center justify-center gap-2 flex-wrap">
          {data.slice(0, -1).map((stage, index) => {
            const nextStage = data[index + 1];
            const conversionRate = stage.count > 0 
              ? ((nextStage.count / stage.count) * 100).toFixed(0) 
              : '0';
            
            return (
              <span 
                key={index} 
                className={`text-xs px-2 py-1 rounded ${defaultBgColors[index % defaultBgColors.length]} ${defaultTextColors[index % defaultTextColors.length]}`}
              >
                {conversionRate}%
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// =====================================================
// PipelineChart Component
// =====================================================

export default function PipelineChart({
  data,
  title = 'Recruitment Pipeline',
  showPercentages = true,
  showCounts = true,
  total,
  isLoading = false,
  className = '',
  variant = 'bar',
}: PipelineChartProps) {
  const calculatedTotal = total ?? data.reduce((sum, d) => sum + d.count, 0);

  if (isLoading) {
    return (
      <div className={`bg-white rounded-xl border border-slate-200 shadow-sm p-6 ${className}`}>
        {title && <h3 className="text-lg font-semibold text-slate-900 mb-4">{title}</h3>}
        <PipelineChartSkeleton variant={variant} />
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className={`bg-white rounded-xl border border-slate-200 shadow-sm p-6 ${className}`}>
        {title && <h3 className="text-lg font-semibold text-slate-900 mb-4">{title}</h3>}
        <div className="text-center py-8 text-slate-500">
          No pipeline data available
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-xl border border-slate-200 shadow-sm p-6 ${className}`}>
      {/* Header */}
      {title && (
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
          <span className="text-sm text-slate-500">
            Total: {calculatedTotal}
          </span>
        </div>
      )}

      {/* Chart */}
      {variant === 'bar' && (
        <BarChart
          data={data}
          total={calculatedTotal}
          showPercentages={showPercentages}
          showCounts={showCounts}
        />
      )}
      {variant === 'horizontal' && (
        <HorizontalChart
          data={data}
          total={calculatedTotal}
          showPercentages={showPercentages}
          showCounts={showCounts}
        />
      )}
      {variant === 'funnel' && (
        <FunnelChart
          data={data}
          total={calculatedTotal}
          showPercentages={showPercentages}
          showCounts={showCounts}
        />
      )}
    </div>
  );
}
