'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { leavesService } from '@/app/services/leaves';
import { useAuth } from '@/app/context/AuthContext';

// Types
interface LeaveBalance {
  leaveTypeId: string;
  leaveTypeName: string;
  leaveTypeCode?: string;
  yearlyEntitlement: number;
  accrued: number;
  taken: number;
  pending: number;
  carryForward: number;
  remaining: number;
}

interface TeamMemberBalance {
  employeeId: string;
  employeeName?: string;
  balances: LeaveBalance[];
}

interface UpcomingLeave {
  _id: string;
  employeeId: string;
  employeeName?: string;
  leaveTypeId: string;
  leaveTypeName?: string;
  dates: {
    from: string;
    to: string;
  };
  durationDays: number;
  status: string;
}

interface LeaveType {
  _id: string;
  name: string;
  code?: string;
}

export default function TeamBalancesPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [teamBalances, setTeamBalances] = useState<TeamMemberBalance[]>([]);
  const [upcomingLeaves, setUpcomingLeaves] = useState<UpcomingLeave[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [filterLeaveType, setFilterLeaveType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'balances' | 'upcoming'>('balances');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchData = useCallback(async (isRefresh = false) => {
    if (!user) return;

    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      // Get today's date for upcoming leaves filter
      const today = new Date().toISOString().split('T')[0];

      const [balancesRes, upcomingRes, typesRes] = await Promise.all([
        leavesService.getTeamBalances(user.id).catch((err: any) => ({ data: [], error: err.message })),
        leavesService.getTeamRequests(user.id, {
          status: 'approved',
          from: today,
          limit: 100,
          sort: 'dates.from',
        }).catch((err: any) => ({ data: [], error: err.message })),
        leavesService.getLeaveTypes().catch((err: any) => ({ data: [], error: err.message })),
      ]);

      // Check for errors
      if (balancesRes.error || upcomingRes.error || typesRes.error) {
        const errorMsg = balancesRes.error || upcomingRes.error || typesRes.error;
        setError(typeof errorMsg === 'string' ? errorMsg : 'Failed to load some data');
      }

      // Process leave types first (needed for enriching other data)
      const types: LeaveType[] = Array.isArray(typesRes.data) ? typesRes.data : [];
      setLeaveTypes(types);

      // Process balances - normalize data structure
      let balancesData: TeamMemberBalance[] = [];
      if (Array.isArray(balancesRes.data)) {
        balancesData = balancesRes.data.map((member: TeamMemberBalance) => ({
          employeeId: member.employeeId || '',
          employeeName: member.employeeName || undefined,
          balances: Array.isArray(member.balances) ? member.balances.map(bal => ({
            leaveTypeId: bal.leaveTypeId || '',
            leaveTypeName: bal.leaveTypeName || types.find(t => t._id === bal.leaveTypeId)?.name || 'Unknown',
            leaveTypeCode: bal.leaveTypeCode,
            yearlyEntitlement: bal.yearlyEntitlement ?? 0,
            accrued: bal.accrued ?? 0,
            taken: bal.taken ?? 0,
            pending: bal.pending ?? 0,
            carryForward: bal.carryForward ?? 0,
            remaining: bal.remaining ?? 0,
          })) : [],
        }));
      }
      setTeamBalances(balancesData);

      // Process upcoming leaves - normalize data structure
      let upcomingData: UpcomingLeave[] = [];
      if (upcomingRes.data) {
        const rawData = Array.isArray(upcomingRes.data)
          ? upcomingRes.data
          : (upcomingRes.data as { data?: UpcomingLeave[] }).data || [];

        upcomingData = rawData
          .filter((leave: UpcomingLeave) => leave.dates?.from && leave.dates?.to)
          .map((leave: UpcomingLeave) => ({
            _id: leave._id || '',
            employeeId: leave.employeeId || '',
            employeeName: leave.employeeName || undefined,
            leaveTypeId: leave.leaveTypeId || '',
            leaveTypeName: leave.leaveTypeName || types.find(t => t._id === leave.leaveTypeId)?.name || 'Unknown',
            dates: {
              from: leave.dates.from,
              to: leave.dates.to,
            },
            durationDays: leave.durationDays ?? 1,
            status: leave.status || 'approved',
          }));
      }
      setUpcomingLeaves(upcomingData);
      setLastUpdated(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load team data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user, fetchData]);

  // Auto-refresh every 60 seconds
  useEffect(() => {
    if (!user) return;

    const interval = setInterval(() => {
      fetchData(true);
    }, 60000);

    return () => clearInterval(interval);
  }, [user, fetchData]);

  const getLeaveTypeName = (leaveTypeId: string) => {
    if (!leaveTypeId) return 'Unknown';
    const type = leaveTypes.find(t => t._id === leaveTypeId);
    return type?.name || 'Unknown';
  };

  const getLeaveTypeColor = (typeName: string) => {
    const name = (typeName || '').toLowerCase();
    if (name.includes('annual')) return { bg: 'bg-primary/10 dark:bg-primary/20', text: 'text-primary', bar: 'bg-primary' };
    if (name.includes('sick')) return { bg: 'bg-muted', text: 'text-foreground', bar: 'bg-muted-foreground' };
    if (name.includes('personal')) return { bg: 'bg-accent/10 dark:bg-accent/20', text: 'text-accent-foreground', bar: 'bg-accent' };
    if (name.includes('maternity') || name.includes('paternity')) return { bg: 'bg-primary/10 dark:bg-primary/20', text: 'text-primary', bar: 'bg-primary' };
    if (name.includes('unpaid')) return { bg: 'bg-muted', text: 'text-foreground', bar: 'bg-muted-foreground' };
    return { bg: 'bg-muted', text: 'text-muted-foreground', bar: 'bg-muted-foreground' };
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'N/A';
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return 'Invalid Date';
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return 'Invalid Date';
    }
  };

  const getDaysUntil = (dateStr: string) => {
    if (!dateStr) return 0;
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const targetDate = new Date(dateStr);
      if (isNaN(targetDate.getTime())) return 0;
      targetDate.setHours(0, 0, 0, 0);
      const diffTime = targetDate.getTime() - today.getTime();
      return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    } catch {
      return 0;
    }
  };

  const getEmployeeDisplayName = (employeeName?: string, employeeId?: string) => {
    if (employeeName && employeeName.trim()) return employeeName;
    if (employeeId) return `Employee ${employeeId.slice(-6)}`;
    return 'Unknown Employee';
  };

  const getEmployeeInitials = (employeeName?: string, employeeId?: string) => {
    const name = employeeName || employeeId || 'UN';
    return name.substring(0, 2).toUpperCase();
  };

  // Filter team members by search query
  const filteredTeamBalances = teamBalances.filter(member => {
    if (!searchQuery.trim()) return true;
    const name = (member.employeeName || member.employeeId || '').toLowerCase();
    return name.includes(searchQuery.toLowerCase());
  });

  // Filter upcoming leaves
  const filteredUpcomingLeaves = upcomingLeaves.filter(leave => {
    if (filterLeaveType !== 'all' && leave.leaveTypeId !== filterLeaveType) return false;
    if (searchQuery.trim()) {
      const name = (leave.employeeName || leave.employeeId || '').toLowerCase();
      return name.includes(searchQuery.toLowerCase());
    }
    return true;
  });

  // Stats calculations with safety checks
  const totalTeamMembers = teamBalances.length;

  const onLeaveToday = upcomingLeaves.filter(leave => {
    if (!leave.dates?.from || !leave.dates?.to) return false;
    try {
      const today = new Date().toISOString().split('T')[0];
      return leave.dates.from <= today && leave.dates.to >= today;
    } catch {
      return false;
    }
  }).length;

  const upcomingThisWeek = upcomingLeaves.filter(leave => {
    if (!leave.dates?.from) return false;
    const daysUntil = getDaysUntil(leave.dates.from);
    return daysUntil >= 0 && daysUntil <= 7;
  }).length;

  // Calculate total days on leave this week for workload planning
  const totalDaysOnLeaveThisWeek = upcomingLeaves
    .filter(leave => {
      if (!leave.dates?.from) return false;
      const daysUntil = getDaysUntil(leave.dates.from);
      return daysUntil >= 0 && daysUntil <= 7;
    })
    .reduce((sum, leave) => sum + (leave.durationDays || 0), 0);

  // Check if user is not logged in
  if (!user) {
    return (
      <div className="p-6 lg:p-8 flex items-center justify-center min-h-[50vh] bg-background">
        <div className="text-center">
          <div className="w-16 h-16 bg-destructive/10 dark:bg-destructive/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-destructive" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-foreground">Authentication Required</h3>
          <p className="text-muted-foreground mt-1">Please log in to view team balances</p>
          <Link href="/login" className="mt-4 inline-block text-primary hover:text-primary/80 font-medium transition-colors">
            Go to Login
          </Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-6 lg:p-8 bg-background">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-muted rounded w-1/3"></div>
            <div className="grid grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-24 bg-card rounded-xl shadow-sm border border-border"></div>
              ))}
            </div>
            <div className="h-96 bg-card rounded-xl shadow-sm border border-border"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 bg-background min-h-screen">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
              <Link href="/dashboard/department-head" className="hover:text-foreground transition-colors">
                Dashboard
              </Link>
              <span>/</span>
              <span className="text-foreground">Team Balances</span>
            </div>
            <h1 className="text-2xl lg:text-3xl font-bold text-foreground">Team Leave Balances</h1>
            <div className="flex items-center gap-3 mt-1">
              <p className="text-muted-foreground">View your team members&apos; leave balances and upcoming leaves</p>
              {lastUpdated && (
                <span className="text-xs text-muted-foreground">
                  Updated {lastUpdated.toLocaleTimeString()}
                </span>
              )}
              {refreshing && (
                <span className="flex items-center gap-1 text-xs text-primary">
                  <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                  </svg>
                  Refreshing...
                </span>
              )}
            </div>
          </div>
          <button
            onClick={() => fetchData(true)}
            disabled={refreshing}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-card border border-border text-foreground font-medium rounded-lg hover:bg-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-destructive/10 dark:bg-destructive/20 border border-destructive/20 text-destructive px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-card rounded-xl shadow-sm border border-border p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Team Members</p>
                <p className="text-3xl font-bold text-foreground mt-1">{totalTeamMembers}</p>
              </div>
              <div className="w-12 h-12 bg-primary/10 dark:bg-primary/20 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
            </div>
          </div>
          <div className="bg-card rounded-xl shadow-sm border border-border p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">On Leave Today</p>
                <p className="text-3xl font-bold text-foreground mt-1">{onLeaveToday}</p>
              </div>
              <div className="w-12 h-12 bg-muted rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            </div>
          </div>
          <div className="bg-card rounded-xl shadow-sm border border-border p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Upcoming (7 days)</p>
                <p className="text-3xl font-bold text-foreground mt-1">{upcomingThisWeek}</p>
              </div>
              <div className="w-12 h-12 bg-muted rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>
          <div className="bg-card rounded-xl shadow-sm border border-border p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Leave Days (7 days)</p>
                <p className="text-3xl font-bold text-primary mt-1">{totalDaysOnLeaveThisWeek}</p>
              </div>
              <div className="w-12 h-12 bg-primary/10 dark:bg-primary/20 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* View Toggle and Search */}
        <div className="bg-card rounded-xl shadow-sm border border-border p-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            {/* View Toggle */}
            <div className="flex bg-muted rounded-lg p-1">
              <button
                onClick={() => setViewMode('balances')}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  viewMode === 'balances'
                    ? 'bg-card text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Leave Balances
              </button>
              <button
                onClick={() => setViewMode('upcoming')}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  viewMode === 'upcoming'
                    ? 'bg-card text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Upcoming Leaves
              </button>
            </div>

            {/* Search and Filter */}
            <div className="flex items-center gap-3">
              <div className="relative">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  placeholder="Search team member..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-2 text-sm border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring w-64"
                />
              </div>
              {viewMode === 'upcoming' && (
                <select
                  value={filterLeaveType}
                  onChange={(e) => setFilterLeaveType(e.target.value)}
                  className="px-3 py-2 text-sm border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring"
                >
                  <option value="all">All Leave Types</option>
                  {leaveTypes.map((type) => (
                    <option key={type._id} value={type._id}>
                      {type.name}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>
        </div>

        {/* Content */}
        {viewMode === 'balances' ? (
          /* Team Balances View */
          <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden">
            {filteredTeamBalances.length === 0 ? (
              <div className="p-12 text-center">
                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-foreground">No team members found</h3>
                <p className="text-muted-foreground mt-1">
                  {searchQuery ? 'No team members match your search' : 'You don\'t have any team members with leave data yet'}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {filteredTeamBalances.map((member) => (
                  <div key={member.employeeId} className="p-6">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-10 h-10 bg-muted rounded-full flex items-center justify-center">
                        <span className="text-sm font-medium text-muted-foreground">
                          {getEmployeeInitials(member.employeeName, member.employeeId)}
                        </span>
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground">
                          {getEmployeeDisplayName(member.employeeName, member.employeeId)}
                        </h3>
                        <p className="text-sm text-muted-foreground">ID: {(member.employeeId || '').slice(-8)}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      {member.balances.map((balance) => {
                        const colors = getLeaveTypeColor(balance.leaveTypeName);
                        const totalEntitled = balance.yearlyEntitlement + (balance.carryForward || 0);
                        const percentage = totalEntitled > 0 ? (balance.taken / totalEntitled) * 100 : 0;

                        return (
                          <div key={balance.leaveTypeId} className={`p-4 rounded-lg ${colors.bg}`}>
                            <div className="flex items-center justify-between mb-2">
                              <span className={`text-sm font-medium ${colors.text}`}>
                                {balance.leaveTypeName}
                              </span>
                              {balance.pending > 0 && (
                                <span className="px-2 py-0.5 text-xs font-medium bg-warning/10 dark:bg-warning/20 text-warning rounded-full">
                                  {balance.pending} pending
                                </span>
                              )}
                            </div>
                            <div className="flex items-baseline gap-1">
                              <span className="text-2xl font-bold text-foreground">{balance.remaining}</span>
                              <span className="text-sm text-muted-foreground">/ {totalEntitled} days</span>
                            </div>
                            <div className="mt-2 w-full bg-background/50 rounded-full h-1.5">
                              <div
                                className={`h-1.5 rounded-full ${colors.bar}`}
                                style={{ width: `${Math.min(percentage, 100)}%` }}
                              ></div>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">Used: {balance.taken} days</p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* Upcoming Leaves View */
          <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden">
            {filteredUpcomingLeaves.length === 0 ? (
              <div className="p-12 text-center">
                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-foreground">No upcoming leaves</h3>
                <p className="text-muted-foreground mt-1">
                  {searchQuery || filterLeaveType !== 'all'
                    ? 'No upcoming leaves match your filters'
                    : 'No team members have upcoming approved leaves'}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {filteredUpcomingLeaves.map((leave) => {
                  const colors = getLeaveTypeColor(leave.leaveTypeName || getLeaveTypeName(leave.leaveTypeId));
                  const daysUntil = getDaysUntil(leave.dates.from);
                  const isToday = daysUntil === 0;
                  const isOngoing = daysUntil < 0;

                  return (
                    <div key={leave._id} className="p-4 hover:bg-accent/30 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-muted rounded-full flex items-center justify-center">
                            <span className="text-sm font-medium text-muted-foreground">
                              {getEmployeeInitials(leave.employeeName, leave.employeeId)}
                            </span>
                          </div>
                          <div>
                            <h4 className="font-medium text-foreground">
                              {getEmployeeDisplayName(leave.employeeName, leave.employeeId)}
                            </h4>
                            <div className="flex items-center gap-2 mt-1">
                              <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${colors.bg} ${colors.text}`}>
                                {leave.leaveTypeName || getLeaveTypeName(leave.leaveTypeId)}
                              </span>
                              <span className="text-sm text-muted-foreground">
                                {formatDate(leave.dates.from)} - {formatDate(leave.dates.to)}
                              </span>
                              <span className="text-sm text-muted-foreground">
                                ({leave.durationDays} day{leave.durationDays !== 1 ? 's' : ''})
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          {isOngoing ? (
                            <span className="px-3 py-1 text-xs font-medium bg-success/10 dark:bg-success/20 text-success rounded-full">
                              Currently on leave
                            </span>
                          ) : isToday ? (
                            <span className="px-3 py-1 text-xs font-medium bg-warning/10 dark:bg-warning/20 text-warning rounded-full">
                              Starts today
                            </span>
                          ) : (
                            <span className="px-3 py-1 text-xs font-medium bg-primary/10 dark:bg-primary/20 text-primary rounded-full">
                              In {daysUntil} day{daysUntil !== 1 ? 's' : ''}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Legend/Help */}
        <div className="bg-primary/5 dark:bg-primary/10 rounded-xl border border-primary/20 p-6">
          <div className="flex gap-4">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 bg-primary/10 dark:bg-primary/20 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Managing Team Leave</h3>
              <ul className="mt-2 text-sm text-muted-foreground space-y-1">
                <li>• <strong className="text-foreground">Leave Balances:</strong> View remaining leave days for each team member</li>
                <li>• <strong className="text-foreground">Upcoming Leaves:</strong> Plan workloads around scheduled absences</li>
                <li>• <strong className="text-foreground">Pending</strong> indicates leave requests awaiting HR approval</li>
                <li>• Use the search bar to quickly find specific team members</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

