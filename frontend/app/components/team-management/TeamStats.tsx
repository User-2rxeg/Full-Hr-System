'use client';

import { TeamMember } from './TeamMemberCard';

interface TeamStatsProps {
  members: TeamMember[];
  loading?: boolean;
}

export default function TeamStats({ members, loading }: TeamStatsProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-card border border-border rounded-xl p-5 animate-pulse">
            <div className="h-4 bg-muted rounded w-1/2 mb-3"></div>
            <div className="h-8 bg-muted rounded w-1/3"></div>
          </div>
        ))}
      </div>
    );
  }

  // Calculate stats
  const totalMembers = members.length;
  const activeMembers = members.filter(m => m.status?.toLowerCase() === 'active').length;
  const onLeave = members.filter(m => m.status?.toLowerCase() === 'on_leave').length;
  const onboarding = members.filter(m => m.status?.toLowerCase() === 'onboarding').length;

  // Group by department
  const departmentCounts = members.reduce((acc, member) => {
    const dept = member.primaryDepartmentId?.name || 'Unassigned';
    acc[dept] = (acc[dept] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Group by position
  const positionCounts = members.reduce((acc, member) => {
    const pos = member.primaryPositionId?.title || 'Unassigned';
    acc[pos] = (acc[pos] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const uniqueDepartments = Object.keys(departmentCounts).length;
  const uniquePositions = Object.keys(positionCounts).length;

  const stats = [
    {
      label: 'Total Team Members',
      value: totalMembers,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
      color: 'from-blue-500 to-blue-600',
      bgColor: 'bg-blue-50 dark:bg-blue-900/20',
      textColor: 'text-blue-600 dark:text-blue-400',
    },
    {
      label: 'Active Members',
      value: activeMembers,
      subtext: `${totalMembers > 0 ? Math.round((activeMembers / totalMembers) * 100) : 0}% of team`,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      color: 'from-green-500 to-green-600',
      bgColor: 'bg-green-50 dark:bg-green-900/20',
      textColor: 'text-green-600 dark:text-green-400',
    },
    {
      label: 'On Leave',
      value: onLeave,
      subtext: onLeave > 0 ? 'Currently away' : 'All present',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
      color: 'from-amber-500 to-amber-600',
      bgColor: 'bg-amber-50 dark:bg-amber-900/20',
      textColor: 'text-amber-600 dark:text-amber-400',
    },
    {
      label: 'Onboarding',
      value: onboarding,
      subtext: onboarding > 0 ? 'New joiners' : 'No new hires',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
        </svg>
      ),
      color: 'from-purple-500 to-purple-600',
      bgColor: 'bg-purple-50 dark:bg-purple-900/20',
      textColor: 'text-purple-600 dark:text-purple-400',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Main Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <div
            key={index}
            className="bg-card border border-border rounded-xl p-5 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
                <p className="text-3xl font-bold text-foreground mt-1">{stat.value}</p>
                {stat.subtext && (
                  <p className="text-xs text-muted-foreground mt-1">{stat.subtext}</p>
                )}
              </div>
              <div className={`p-2.5 rounded-xl ${stat.bgColor}`}>
                <div className={stat.textColor}>{stat.icon}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Secondary Stats - Breakdown */}
      {totalMembers > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* By Position */}
          <div className="bg-card border border-border rounded-xl p-5">
            <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
              <svg className="w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              Team by Position
              <span className="ml-auto text-xs font-normal text-muted-foreground">{uniquePositions} roles</span>
            </h3>
            <div className="space-y-3">
              {Object.entries(positionCounts)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 5)
                .map(([position, count]) => {
                  const percentage = Math.round((count / totalMembers) * 100);
                  return (
                    <div key={position}>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="text-foreground truncate mr-2">{position}</span>
                        <span className="text-muted-foreground flex-shrink-0">{count}</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-primary to-primary/70 rounded-full transition-all duration-500"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>

          {/* By Department */}
          <div className="bg-card border border-border rounded-xl p-5">
            <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
              <svg className="w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              Team by Department
              <span className="ml-auto text-xs font-normal text-muted-foreground">{uniqueDepartments} depts</span>
            </h3>
            <div className="space-y-3">
              {Object.entries(departmentCounts)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 5)
                .map(([department, count]) => {
                  const percentage = Math.round((count / totalMembers) * 100);
                  return (
                    <div key={department}>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="text-foreground truncate mr-2">{department}</span>
                        <span className="text-muted-foreground flex-shrink-0">{count}</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-blue-500 to-blue-400 rounded-full transition-all duration-500"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

