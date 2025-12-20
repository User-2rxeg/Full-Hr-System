'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { organizationStructureService } from '@/app/services/organization-structure';

interface Department {
  _id: string;
  code: string;
  name: string;
  description?: string;
  isActive: boolean;
  headPositionId?: {
    _id: string;
    title: string;
    code: string;
  };
}

interface Position {
  _id: string;
  code: string;
  title: string;
  description?: string;
  isActive: boolean;
  departmentId?: {
    _id: string;
    name: string;
    code: string;
  };
  reportsToPositionId?: {
    _id: string;
    title: string;
    code: string;
  };
}

interface Stats {
  departments: { total: number; active: number; inactive: number };
  positions: { total: number; active: number; inactive: number; vacant: number; filled: number };
}

export default function HRManagerOrganizationPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'departments' | 'positions'>('overview');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [deptResult, posResult, deptStatsResult, posStatsResult] = await Promise.all([
        organizationStructureService.getDepartments(),
        organizationStructureService.getPositions(),
        organizationStructureService.getDepartmentStats(),
        organizationStructureService.getPositionStats(),
      ]);

      setDepartments(Array.isArray(deptResult) ? deptResult : (deptResult as any)?.data || []);
      setPositions(Array.isArray(posResult) ? posResult : (posResult as any)?.data || []);

      const deptStats = (deptStatsResult as any)?.data || deptStatsResult || { total: 0, active: 0, inactive: 0 };
      const posStats = (posStatsResult as any)?.data || posStatsResult || { total: 0, active: 0, inactive: 0, vacant: 0, filled: 0 };

      setStats({
        departments: deptStats,
        positions: posStats,
      });
    } catch (err: any) {
      setError(err.message || 'Failed to fetch organization data');
    } finally {
      setLoading(false);
    }
  };

  const filteredDepartments = departments.filter(
    (dept) =>
      dept.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      dept.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredPositions = positions.filter(
    (pos) =>
      pos.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      pos.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="p-6 lg:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-muted rounded w-1/4"></div>
            <div className="grid grid-cols-5 gap-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-24 bg-card rounded-xl border border-border"></div>
              ))}
            </div>
            <div className="h-96 bg-card rounded-xl border border-border"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 bg-background min-h-screen">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-semibold text-foreground">Organization Structure</h1>
            <p className="text-muted-foreground mt-1">View departments, positions, and organizational hierarchy</p>
          </div>
          <Link
            href="/dashboard/system-admin/organization-structure/org-chart"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground font-medium rounded-lg hover:bg-primary/90 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            View Org Chart
          </Link>
        </div>

        {error && (
          <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="bg-card border border-border rounded-xl p-4">
              <p className="text-sm text-muted-foreground">Total Departments</p>
              <p className="text-2xl font-semibold text-foreground mt-1">{stats.departments.total}</p>
              <p className="text-xs text-green-600 mt-1">{stats.departments.active} active</p>
            </div>
            <div className="bg-card border border-border rounded-xl p-4">
              <p className="text-sm text-muted-foreground">Total Positions</p>
              <p className="text-2xl font-semibold text-foreground mt-1">{stats.positions.total}</p>
              <p className="text-xs text-green-600 mt-1">{stats.positions.active} active</p>
            </div>
            <div className="bg-card border border-border rounded-xl p-4">
              <p className="text-sm text-muted-foreground">Filled Positions</p>
              <p className="text-2xl font-semibold text-foreground mt-1">{stats.positions.filled}</p>
            </div>
            <div className="bg-card border border-border rounded-xl p-4">
              <p className="text-sm text-muted-foreground">Vacant Positions</p>
              <p className="text-2xl font-semibold text-amber-600 mt-1">{stats.positions.vacant}</p>
            </div>
            <div className="bg-card border border-border rounded-xl p-4">
              <p className="text-sm text-muted-foreground">Inactive</p>
              <p className="text-2xl font-semibold text-muted-foreground mt-1">
                {stats.departments.inactive + stats.positions.inactive}
              </p>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="bg-card border border-border rounded-xl">
          <div className="border-b border-border">
            <div className="flex gap-1 p-1">
              {(['overview', 'departments', 'positions'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors capitalize ${activeTab === tab
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                    }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          <div className="p-4">
            {/* Search */}
            {activeTab !== 'overview' && (
              <div className="mb-4">
                <input
                  type="text"
                  placeholder={`Search ${activeTab}...`}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full max-w-md px-4 py-2 border border-input rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            )}

            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <div className="grid lg:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-medium text-foreground mb-4">Departments</h3>
                  <div className="space-y-3">
                    {departments.slice(0, 5).map((dept) => (
                      <div
                        key={dept._id}
                        className="flex items-center justify-between p-3 bg-accent/50 rounded-lg"
                      >
                        <div>
                          <p className="font-medium text-foreground">{dept.name}</p>
                          <p className="text-sm text-muted-foreground">{dept.code}</p>
                        </div>
                        <span
                          className={`px-2 py-1 text-xs rounded-full ${dept.isActive
                              ? 'bg-green-500/10 text-green-600 dark:text-green-400'
                              : 'bg-muted text-muted-foreground'
                            }`}
                        >
                          {dept.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    ))}
                    {departments.length === 0 && (
                      <p className="text-center text-muted-foreground py-4">No departments found</p>
                    )}
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-medium text-foreground mb-4">Positions</h3>
                  <div className="space-y-3">
                    {positions.slice(0, 5).map((pos) => (
                      <div
                        key={pos._id}
                        className="flex items-center justify-between p-3 bg-accent/50 rounded-lg"
                      >
                        <div>
                          <p className="font-medium text-foreground">{pos.title}</p>
                          <p className="text-sm text-muted-foreground">
                            {pos.departmentId?.name || 'No department'}
                          </p>
                        </div>
                        <span
                          className={`px-2 py-1 text-xs rounded-full ${pos.isActive
                              ? 'bg-green-500/10 text-green-600 dark:text-green-400'
                              : 'bg-muted text-muted-foreground'
                            }`}
                        >
                          {pos.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    ))}
                    {positions.length === 0 && (
                      <p className="text-center text-muted-foreground py-4">No positions found</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Departments Tab */}
            {activeTab === 'departments' && (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Code</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Name</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Head Position</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredDepartments.map((dept) => (
                      <tr key={dept._id} className="border-b border-border hover:bg-accent/50">
                        <td className="py-3 px-4 text-sm font-mono text-foreground">{dept.code}</td>
                        <td className="py-3 px-4 text-sm text-foreground">{dept.name}</td>
                        <td className="py-3 px-4 text-sm text-muted-foreground">
                          {dept.headPositionId?.title || '-'}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-1 text-xs rounded-full ${dept.isActive
                                ? 'bg-green-500/10 text-green-600 dark:text-green-400'
                                : 'bg-muted text-muted-foreground'
                              }`}
                          >
                            {dept.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {filteredDepartments.length === 0 && (
                      <tr>
                        <td colSpan={4} className="py-8 text-center text-muted-foreground">
                          No departments found
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* Positions Tab */}
            {activeTab === 'positions' && (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Code</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Title</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Department</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Reports To</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPositions.map((pos) => (
                      <tr key={pos._id} className="border-b border-border hover:bg-accent/50">
                        <td className="py-3 px-4 text-sm font-mono text-foreground">{pos.code}</td>
                        <td className="py-3 px-4 text-sm text-foreground">{pos.title}</td>
                        <td className="py-3 px-4 text-sm text-muted-foreground">
                          {pos.departmentId?.name || '-'}
                        </td>
                        <td className="py-3 px-4 text-sm text-muted-foreground">
                          {pos.reportsToPositionId?.title || '-'}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-1 text-xs rounded-full ${pos.isActive
                                ? 'bg-green-500/10 text-green-600 dark:text-green-400'
                                : 'bg-muted text-muted-foreground'
                              }`}
                          >
                            {pos.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {filteredPositions.length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-muted-foreground">
                          No positions found
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
