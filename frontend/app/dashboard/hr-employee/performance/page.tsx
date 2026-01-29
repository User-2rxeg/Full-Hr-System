'use client';

import { useState, useEffect } from 'react';
import { performanceService } from '@/app/services/performance';
import { employeeProfileService } from '@/app/services/employee-profile';
import { organizationStructureService } from '@/app/services/organization-structure';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';

interface Assignment {
  _id: string;
  cycleId: {
    _id: string;
    name: string;
  };
  employeeProfileId: {
    _id: string;
    firstName: string;
    lastName: string;
    employeeNumber: string;
    primaryDepartmentId?: {
      name: string;
    };
  };
  managerProfileId?: {
    _id: string;
    firstName: string;
    lastName: string;
  };
  status: 'PENDING' | 'IN_PROGRESS' | 'SUBMITTED' | 'PUBLISHED';
  dueDate?: string;
  createdAt: string;
}

interface Cycle {
  _id: string;
  name: string;
  status: 'PLANNED' | 'ACTIVE' | 'CLOSED' | 'ARCHIVED';
  startDate: string;
  endDate: string;
}

interface Employee {
  _id: string;
  firstName: string;
  lastName: string;
  employeeNumber: string;
  workEmail: string;
  primaryDepartmentId?: {
    _id: string;
    name: string;
  };
}

export default function HREmployeePerformancePage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [cycles, setCycles] = useState<Cycle[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);

  const [selectedCycleId, setSelectedCycleId] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Bulk assignment state
  const [showBulkAssign, setShowBulkAssign] = useState(false);
  const [bulkFormData, setBulkFormData] = useState({
    cycleId: '',
    templateId: '',
    departmentId: '',
    employeeProfileIds: [] as string[],
    dueDate: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [templates, setTemplates] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (selectedCycleId) {
      fetchAssignments();
    }
  }, [selectedCycleId, statusFilter]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const cyclesRes = await performanceService.getCycles();
      const cyclesData = Array.isArray(cyclesRes.data) ? cyclesRes.data : [];
      setCycles(cyclesData);

      const activeCycle = cyclesData.find((c: Cycle) => c.status === 'ACTIVE');
      if (activeCycle) {
        setSelectedCycleId(activeCycle._id);
        setBulkFormData(prev => ({ ...prev, cycleId: activeCycle._id }));
      }

      try {
        const employeesRes = await employeeProfileService.getAllEmployees(1, 100);
        let employeesData: Employee[] = [];
        if (employeesRes && employeesRes.data) {
          if (Array.isArray(employeesRes.data)) {
            employeesData = employeesRes.data;
          } else if (typeof employeesRes.data === 'object' && 'data' in employeesRes.data) {
            const nestedData = (employeesRes.data as any).data;
            if (Array.isArray(nestedData)) employeesData = nestedData;
          }
        }
        setEmployees(employeesData);
      } catch (err: any) {
        console.error('Error fetching employees:', err);
      }

      const templatesRes = await performanceService.getTemplates();
      const templatesData = Array.isArray(templatesRes.data) ? templatesRes.data : [];
      setTemplates(templatesData.filter((t: any) => t.isActive));

      const departmentsRes = await organizationStructureService.getDepartments(true);
      const departmentsData = Array.isArray(departmentsRes.data) ? departmentsRes.data : [];
      setDepartments(departmentsData);
    } catch (err: any) {
      setError(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const fetchAssignments = async () => {
    try {
      const response = await performanceService.searchAssignments();
      const data = response.data as Assignment[] | { data: Assignment[] };
      if (Array.isArray(data)) {
        setAssignments(data);
      } else if (data && 'data' in data) {
        setAssignments(data.data);
      } else {
        setAssignments([]);
      }
    } catch (err: any) {
      console.error('Failed to fetch assignments:', err);
    }
  };

  const handleBulkAssign = async () => {
    if (!bulkFormData.cycleId || !bulkFormData.templateId || !bulkFormData.departmentId || bulkFormData.employeeProfileIds.length === 0) {
      toast.error('Please complete all required fields');
      return;
    }
    try {
      setIsSubmitting(true);
      const response = await performanceService.bulkCreateAssignments({
        cycleId: bulkFormData.cycleId,
        templateId: bulkFormData.templateId,
        departmentId: bulkFormData.departmentId,
        employeeProfileIds: bulkFormData.employeeProfileIds,
        dueDate: bulkFormData.dueDate || undefined,
      });
      if (response.error) {
        toast.error(response.error);
        return;
      }
      toast.success(`Successfully assigned ${bulkFormData.employeeProfileIds.length} employees`);
      setShowBulkAssign(false);
      setBulkFormData({ cycleId: selectedCycleId, templateId: '', departmentId: '', employeeProfileIds: [], dueDate: '' });
      fetchAssignments();
    } catch (err: any) {
      toast.error(err.message || 'Failed to create assignments');
    } finally {
      setIsSubmitting(false);
    }
  };

  const statusColors: Record<string, string> = {
    PENDING: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
    IN_PROGRESS: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
    SUBMITTED: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
    PUBLISHED: 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20',
  };

  const filteredAssignments = assignments.filter(a => {
    const search = searchQuery.toLowerCase();
    const matchesSearch = !searchQuery ||
      a.employeeProfileId?.firstName?.toLowerCase().includes(search) ||
      a.employeeProfileId?.lastName?.toLowerCase().includes(search) ||
      a.employeeProfileId?.employeeNumber?.toLowerCase().includes(search);
    const matchesStatus = statusFilter === 'all' || a.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading performance data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
            <Link href="/dashboard/hr-employee" className="hover:text-foreground">HR Employee</Link>
            <span>/</span>
            <span className="text-foreground">Performance Management</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground">Operational Performance Hub</h1>
          <p className="text-muted-foreground mt-1">Registry of all active appraisal assignments and monitoring</p>
        </div>
        <Button onClick={() => setShowBulkAssign(true)}>
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Bulk Assignment
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total active', value: assignments.length, icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z', color: 'text-foreground', bg: 'bg-muted' },
          { label: 'Pending', value: assignments.filter(a => a.status === 'PENDING').length, icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z', color: 'text-amber-600', bg: 'bg-amber-500/10' },
          { label: 'In Progress', value: assignments.filter(a => a.status === 'IN_PROGRESS').length, icon: 'M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z', color: 'text-blue-600', bg: 'bg-blue-500/10' },
          { label: 'Finalized', value: assignments.filter(a => a.status === 'PUBLISHED').length, icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z', color: 'text-green-600', bg: 'bg-green-500/10' },
        ].map((stat, i) => (
          <div key={i} className="bg-card border border-border rounded-xl p-5 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 ${stat.bg} rounded-lg flex items-center justify-center`}>
                <svg className={`w-5 h-5 ${stat.color}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={stat.icon} />
                </svg>
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{stat.label}</p>
                <p className="text-2xl font-black text-foreground">{stat.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-card border border-border rounded-xl p-4 flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <Input
            placeholder="Search resources..."
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Select value={selectedCycleId} onValueChange={setSelectedCycleId}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Cycle Filter" />
          </SelectTrigger>
          <SelectContent>
            {cycles.map(c => <SelectItem key={c._id} value={c._id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Status Filter" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All States</SelectItem>
            <SelectItem value="PENDING">Pending</SelectItem>
            <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
            <SelectItem value="SUBMITTED">Submitted</SelectItem>
            <SelectItem value="PUBLISHED">Published</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Assignments Registry */}
      <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-border bg-muted/30">
          <h3 className="font-bold text-foreground uppercase tracking-widest text-[11px]">Assignment Registry</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-muted/50 border-b border-border text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                <th className="px-6 py-4 text-left">Recipient</th>
                <th className="px-6 py-4 text-left">Organization Unit</th>
                <th className="px-6 py-4 text-left">Reviewer</th>
                <th className="px-6 py-4 text-center">Lifecycle State</th>
                <th className="px-6 py-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredAssignments.map((assignment) => (
                <tr key={assignment._id} className="hover:bg-muted/20 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-bold text-foreground">{assignment.employeeProfileId?.firstName} {assignment.employeeProfileId?.lastName}</div>
                    <div className="text-[10px] text-muted-foreground font-semibold uppercase">{assignment.employeeProfileId?.employeeNumber}</div>
                  </td>
                  <td className="px-6 py-4 text-xs font-medium text-foreground">
                    {assignment.employeeProfileId?.primaryDepartmentId?.name || 'Unassigned'}
                  </td>
                  <td className="px-6 py-4 text-xs font-semibold text-muted-foreground">
                    {assignment.managerProfileId ? `${assignment.managerProfileId.firstName} ${assignment.managerProfileId.lastName}` : 'N/A'}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <Badge variant="outline" className={`font-black ${statusColors[assignment.status]}`}>
                      {assignment.status}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Button variant="ghost" size="sm" onClick={() => setSelectedAssignment(assignment)} className="text-xs font-bold uppercase tracking-widest">Details</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredAssignments.length === 0 && (
            <div className="p-16 text-center text-muted-foreground text-sm font-medium">
              No records matching the current registry query.
            </div>
          )}
        </div>
      </div>

      {/* Bulk Assign Modal */}
      <Dialog open={showBulkAssign} onOpenChange={setShowBulkAssign}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Bulk Evaluation Assignment</DialogTitle>
            <DialogDescription>Distribute appraisal forms to selected organizational units</DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Appraisal Cycle</label>
              <Select value={bulkFormData.cycleId} onValueChange={(v) => setBulkFormData(p => ({ ...p, cycleId: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {cycles.map(c => <SelectItem key={c._id} value={c._id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Appraisal Template</label>
              <Select value={bulkFormData.templateId} onValueChange={(v) => setBulkFormData(p => ({ ...p, templateId: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {templates.map(t => <SelectItem key={t._id} value={t._id}>{t.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Target Department</label>
              <Select value={bulkFormData.departmentId} onValueChange={(v) => setBulkFormData(p => ({ ...p, departmentId: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {departments.map(d => <SelectItem key={d._id} value={d._id}>{d.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Submission Deadline</label>
              <Input type="date" value={bulkFormData.dueDate} onChange={(e) => setBulkFormData(p => ({ ...p, dueDate: e.target.value }))} />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Eligible Personnel ({employees.length})</label>
              <Button variant="link" size="sm" onClick={() => setBulkFormData(p => ({ ...p, employeeProfileIds: p.employeeProfileIds.length === employees.length ? [] : employees.map(e => e._id) }))} className="text-[10px] h-auto p-0">Select All Toggle</Button>
            </div>
            <div className="border border-border rounded-lg max-h-48 overflow-y-auto p-2 space-y-2 bg-muted/20">
              {employees.map(e => (
                <div key={e._id} className="flex items-center gap-3 p-2 hover:bg-card rounded transition-colors group">
                  <input
                    type="checkbox"
                    checked={bulkFormData.employeeProfileIds.includes(e._id)}
                    onChange={() => setBulkFormData(p => ({ ...p, employeeProfileIds: p.employeeProfileIds.includes(e._id) ? p.employeeProfileIds.filter(id => id !== e._id) : [...p.employeeProfileIds, e._id] }))}
                    className="w-4 h-4 rounded border-border text-primary cursor-pointer"
                  />
                  <div>
                    <div className="text-xs font-bold text-foreground">{e.firstName} {e.lastName}</div>
                    <div className="text-[10px] text-muted-foreground font-medium">{e.employeeNumber} | {e.primaryDepartmentId?.name || 'Core'}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <DialogFooter className="mt-6 border-t border-border pt-4">
            <Button variant="ghost" onClick={() => setShowBulkAssign(false)}>Discard</Button>
            <Button onClick={handleBulkAssign} disabled={isSubmitting}>{isSubmitting ? 'Synchronizing...' : 'Finalize Assignments'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
