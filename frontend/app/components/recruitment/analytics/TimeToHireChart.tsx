'use client';

// =====================================================
// Types
// =====================================================

interface TimeToHireDataPoint {
  period: string; // Month, week, etc.
  averageDays: number;
  label?: string;
}

interface DepartmentData {
  departmentId: string;
  departmentName: string;
  averageDays: number;
}

interface TimeToHireChartProps {
  /**
   * Trend data over time
   */
  trendData?: TimeToHireDataPoint[];
  /**
   * Data by department
   */
  departmentData?: DepartmentData[];
  /**
   * Overall average
   */
  overallAverage?: number;
  /**
   * Target days for time to hire
   */
  targetDays?: number;
  /**
   * Chart title
   */
  title?: string;
  /**
   * Display variant
   * @default 'trend'
   */
  variant?: 'trend' | 'department' | 'combined';
  /**
   * Whether the chart is loading
   * @default false
   */
  isLoading?: boolean;
  /**
   * Additional CSS classes
   */
  className?: string;
}

// =====================================================
// Loading Skeleton
// =====================================================

function ChartSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="flex items-end justify-between h-40 gap-2 mb-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-2">
            <div className="w-full bg-slate-200 rounded" style={{ height: `${30 + Math.random() * 50}%` }} />
            <div className="w-8 h-2 bg-slate-200 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}

// =====================================================
// Trend Line Chart
// =====================================================

function TrendChart({
  data,
  targetDays,
}: {
  data: TimeToHireDataPoint[];
  targetDays?: number;
}) {
  const maxValue = Math.max(...data.map((d) => d.averageDays), targetDays || 0);
  const minValue = Math.min(...data.map((d) => d.averageDays));

  return (
    <div className="relative">
      {/* Y-axis labels */}
      <div className="absolute left-0 top-0 bottom-8 w-8 flex flex-col justify-between text-xs text-slate-500">
        <span>{maxValue}d</span>
        <span>{Math.round((maxValue + minValue) / 2)}d</span>
        <span>{minValue}d</span>
      </div>

      {/* Chart Area */}
      <div className="ml-10">
        {/* Target Line */}
        {targetDays && (
          <div 
            className="absolute left-10 right-0 border-t-2 border-dashed border-amber-400 z-10"
            style={{ 
              top: `${((maxValue - targetDays) / (maxValue - minValue + 1)) * 100}%`,
            }}
          >
            <span className="absolute -top-3 right-0 text-xs text-amber-600 bg-white px-1">
              Target: {targetDays}d
            </span>
          </div>
        )}

        {/* Bars */}
        <div className="flex items-end justify-between h-40 gap-2">
          {data.map((point, index) => {
            const height = maxValue > 0 ? (point.averageDays / maxValue) * 100 : 0;
            const isAboveTarget = targetDays && point.averageDays > targetDays;
            const isAtTarget = targetDays && point.averageDays <= targetDays;
            
            return (
              <div key={point.period} className="flex-1 flex flex-col items-center group">
                {/* Tooltip */}
                <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-8 bg-slate-800 text-white text-xs rounded px-2 py-1 whitespace-nowrap z-20">
                  {point.averageDays} days
                </div>
                
                {/* Bar */}
                <div className="w-full relative flex-1 flex items-end">
                  <div
                    className={`w-full rounded-t transition-all duration-300 ${
                      isAboveTarget 
                        ? 'bg-amber-500 hover:bg-amber-600' 
                        : isAtTarget 
                          ? 'bg-emerald-500 hover:bg-emerald-600'
                          : 'bg-blue-500 hover:bg-blue-600'
                    }`}
                    style={{ height: `${height}%`, minHeight: '4px' }}
                  />
                </div>
                
                {/* Value */}
                <span className="text-sm font-semibold text-slate-900 mt-1">
                  {point.averageDays}
                </span>
              </div>
            );
          })}
        </div>

        {/* X-axis Labels */}
        <div className="flex justify-between gap-2 mt-2">
          {data.map((point) => (
            <div key={point.period} className="flex-1 text-center">
              <span className="text-xs text-slate-500">
                {point.label || point.period}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// =====================================================
// Department Comparison Chart
// =====================================================

function DepartmentChart({
  data,
  overallAverage,
  targetDays,
}: {
  data: DepartmentData[];
  overallAverage?: number;
  targetDays?: number;
}) {
  const maxValue = Math.max(...data.map((d) => d.averageDays));
  const sortedData = [...data].sort((a, b) => a.averageDays - b.averageDays);

  return (
    <div className="space-y-3">
      {sortedData.map((dept) => {
        const width = maxValue > 0 ? (dept.averageDays / maxValue) * 100 : 0;
        const isAboveTarget = targetDays && dept.averageDays > targetDays;
        const isAboveAverage = overallAverage && dept.averageDays > overallAverage;
        
        return (
          <div key={dept.departmentId}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium text-slate-700">
                {dept.departmentName}
              </span>
              <span className={`text-sm font-semibold ${
                isAboveTarget 
                  ? 'text-amber-600' 
                  : isAboveAverage 
                    ? 'text-slate-600'
                    : 'text-emerald-600'
              }`}>
                {dept.averageDays} days
                {isAboveTarget && (
                  <span className="ml-1 text-xs text-amber-500">▲</span>
                )}
              </span>
            </div>
            <div className="h-6 bg-slate-100 rounded-lg overflow-hidden relative">
              {/* Target marker */}
              {targetDays && (
                <div 
                  className="absolute top-0 bottom-0 w-0.5 bg-amber-400 z-10"
                  style={{ left: `${(targetDays / maxValue) * 100}%` }}
                />
              )}
              {/* Average marker */}
              {overallAverage && (
                <div 
                  className="absolute top-0 bottom-0 w-0.5 bg-slate-400 z-10"
                  style={{ left: `${(overallAverage / maxValue) * 100}%` }}
                />
              )}
              {/* Bar */}
              <div
                className={`h-full rounded-lg transition-all duration-500 ${
                  isAboveTarget 
                    ? 'bg-amber-500' 
                    : isAboveAverage 
                      ? 'bg-blue-500'
                      : 'bg-emerald-500'
                }`}
                style={{ width: `${width}%` }}
              />
            </div>
          </div>
        );
      })}
      
      {/* Legend */}
      <div className="flex items-center justify-center gap-4 mt-4 pt-4 border-t border-slate-200">
        {targetDays && (
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-amber-400 rounded" />
            <span className="text-xs text-slate-600">Target ({targetDays}d)</span>
          </div>
        )}
        {overallAverage && (
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-slate-400 rounded" />
            <span className="text-xs text-slate-600">Avg ({overallAverage}d)</span>
          </div>
        )}
      </div>
    </div>
  );
}

// =====================================================
// TimeToHireChart Component
// =====================================================

export default function TimeToHireChart({
  trendData,
  departmentData,
  overallAverage,
  targetDays = 30,
  title = 'Time to Hire',
  variant = 'trend',
  isLoading = false,
  className = '',
}: TimeToHireChartProps) {
  if (isLoading) {
    return (
      <div className={`bg-white rounded-xl border border-slate-200 shadow-sm p-6 ${className}`}>
        {title && <h3 className="text-lg font-semibold text-slate-900 mb-4">{title}</h3>}
        <ChartSkeleton />
      </div>
    );
  }

  const hasTrendData = trendData && trendData.length > 0;
  const hasDepartmentData = departmentData && departmentData.length > 0;

  if (!hasTrendData && !hasDepartmentData) {
    return (
      <div className={`bg-white rounded-xl border border-slate-200 shadow-sm p-6 ${className}`}>
        {title && <h3 className="text-lg font-semibold text-slate-900 mb-4">{title}</h3>}
        <div className="text-center py-8 text-slate-500">
          No time to hire data available
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-xl border border-slate-200 shadow-sm p-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
          {overallAverage && (
            <p className="text-sm text-slate-500">
              Average: <span className="font-medium text-slate-700">{overallAverage} days</span>
              {targetDays && (
                <span className={`ml-2 ${overallAverage > targetDays ? 'text-amber-600' : 'text-emerald-600'}`}>
                  ({overallAverage > targetDays ? `${overallAverage - targetDays}d above` : `${targetDays - overallAverage}d below`} target)
                </span>
              )}
            </p>
          )}
        </div>
        {targetDays && (
          <span className="text-sm px-2 py-1 bg-amber-50 text-amber-700 rounded">
            Target: {targetDays}d
          </span>
        )}
      </div>

      {/* Charts */}
      {variant === 'trend' && hasTrendData && (
        <TrendChart data={trendData!} targetDays={targetDays} />
      )}
      
      {variant === 'department' && hasDepartmentData && (
        <DepartmentChart 
          data={departmentData!} 
          overallAverage={overallAverage}
          targetDays={targetDays} 
        />
      )}
      
      {variant === 'combined' && (
        <div className="space-y-8">
          {hasTrendData && (
            <div>
              <h4 className="text-sm font-medium text-slate-700 mb-4">Trend Over Time</h4>
              <TrendChart data={trendData!} targetDays={targetDays} />
            </div>
          )}
          {hasDepartmentData && (
            <div>
              <h4 className="text-sm font-medium text-slate-700 mb-4">By Department</h4>
              <DepartmentChart 
                data={departmentData!} 
                overallAverage={overallAverage}
                targetDays={targetDays} 
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
