'use client';

import { useState, useEffect } from 'react';
import { leavesService } from '@/app/services/leaves';
import { employeeProfileService } from '@/app/services/employee-profile';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Calendar, Users, Settings, FileText, AlertCircle, CheckCircle2, Clock, XCircle } from 'lucide-react';

interface Employee {
  _id: string;
  fullName: string;
  firstName: string;
  lastName: string;
  employeeNumber: string;
  workEmail: string;
  primaryDepartmentId?: { name: string };
}

interface LeaveType {
  _id: string;
  name: string;
  code: string;
  isPaid: boolean;
  maxDaysPerYear?: number;
}

interface LeaveRequest {
  _id: string;
  employeeId: string | { fullName: string; employeeNumber: string };
  leaveTypeId: string | { name: string };
  dates: { from: string; to: string };
  durationDays: number;
  status: string;
  justification?: string;
  createdAt: string;
}

interface LeaveBalance {
  employeeId: string;
  leaveTypeId: string;
  leaveTypeName?: string;
  entitled: number;
  taken: number;
  pending: number;
  remaining: number;
}

export default function LeavesManagementPage() {
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<string>('');
  const [balances, setBalances] = useState<LeaveBalance[]>([]);

  // Modal states
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [isRequestsModalOpen, setIsRequestsModalOpen] = useState(false);

  // Form states
  const [assignForm, setAssignForm] = useState({
    employeeId: '',
    leaveTypeId: '',
    yearlyEntitlement: 0,
  });

  const [adjustForm, setAdjustForm] = useState({
    employeeId: '',
    leaveTypeId: '',
    type: 'add' as 'add' | 'deduct',
    days: 0,
    reason: '',
  });

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (selectedEmployee) {
      fetchEmployeeBalances(selectedEmployee);
    }
  }, [selectedEmployee]);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const [employeesRes, leaveTypesRes, requestsRes] = await Promise.all([
        fetchEmployees(),
        fetchLeaveTypes(),
        fetchRequests(),
      ]);
    } catch (err) {
      toast.error('Failed to load data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      const response = await employeeProfileService.getAllEmployees(1, 1000) as any;
      let employeesList: Employee[] = [];

      if (Array.isArray(response)) {
        employeesList = response;
      } else if (response?.data && Array.isArray(response.data)) {
        employeesList = response.data;
      } else if (response?.data?.data && Array.isArray(response.data.data)) {
        employeesList = response.data.data;
      } else if (response?.data?.employees && Array.isArray(response.data.employees)) {
        employeesList = response.data.employees;
      }

      setEmployees(employeesList);
      return employeesList;
    } catch (err) {
      console.error('Failed to fetch employees:', err);
      return [];
    }
  };

  const fetchLeaveTypes = async () => {
    try {
      const response = await leavesService.getLeaveTypes();
      const types = Array.isArray(response.data) ? response.data : [];
      setLeaveTypes(types);
      return types;
    } catch (err) {
      console.error('Failed to fetch leave types:', err);
      return [];
    }
  };

  const fetchRequests = async () => {
    try {
      const response = await leavesService.getAllRequests({ page: 1, limit: 100 });
      const data = response.data as any;
      const requestsList = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];
      setRequests(requestsList);
      return requestsList;
    } catch (err) {
      console.error('Failed to fetch requests:', err);
      return [];
    }
  };

  const fetchEmployeeBalances = async (employeeId: string) => {
    try {
      const response = await leavesService.getBalance(employeeId);
      const balancesList = Array.isArray(response.data) ? response.data : [];
      setBalances(balancesList);
    } catch (err) {
      console.error('Failed to fetch balances:', err);
      setBalances([]);
    }
  };

  const handleAssignEntitlement = async () => {
    if (!assignForm.employeeId || !assignForm.leaveTypeId || assignForm.yearlyEntitlement <= 0) {
      toast.error('Please fill all required fields');
      return;
    }

    try {
      await leavesService.assignEntitlement({
        employeeId: assignForm.employeeId,
        leaveTypeId: assignForm.leaveTypeId,
        yearlyEntitlement: assignForm.yearlyEntitlement,
      });

      toast.success('Entitlement assigned successfully');
      setIsAssignModalOpen(false);
      setAssignForm({ employeeId: '', leaveTypeId: '', yearlyEntitlement: 0 });

      if (selectedEmployee === assignForm.employeeId) {
        fetchEmployeeBalances(selectedEmployee);
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to assign entitlement');
    }
  };

  const handleAdjustBalance = async () => {
    if (!adjustForm.employeeId || !adjustForm.leaveTypeId || adjustForm.days <= 0 || !adjustForm.reason) {
      toast.error('Please fill all required fields');
      return;
    }

    try {
      await leavesService.adjustBalance({
        employeeId: adjustForm.employeeId,
        leaveTypeId: adjustForm.leaveTypeId,
        type: adjustForm.type,
        days: adjustForm.days,
        reason: adjustForm.reason,
        effectiveDate: new Date().toISOString(),
      });

      toast.success('Balance adjusted successfully');
      setIsAdjustModalOpen(false);
      setAdjustForm({ employeeId: '', leaveTypeId: '', type: 'add', days: 0, reason: '' });

      if (selectedEmployee === adjustForm.employeeId) {
        fetchEmployeeBalances(selectedEmployee);
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to adjust balance');
    }
  };

  const handleApproveRequest = async (requestId: string) => {
    try {
      await leavesService.finalizeRequest(requestId, 'APPROVED', '');
      toast.success('Request approved');
      fetchRequests();
    } catch (err: any) {
      toast.error(err.message || 'Failed to approve request');
    }
  };

  const handleRejectRequest = async (requestId: string, reason: string) => {
    try {
      await leavesService.finalizeRequest(requestId, 'REJECTED', reason);
      toast.success('Request rejected');
      fetchRequests();
    } catch (err: any) {
      toast.error(err.message || 'Failed to reject request');
    }
  };

  const getEmployeeName = (emp: any): string => {
    if (!emp) return 'Unknown';
    if (typeof emp === 'object') return emp.fullName || `${emp.firstName} ${emp.lastName}`;
    const found = employees.find(e => e._id === emp);
    return found ? found.fullName : `Employee ${emp.slice(-6)}`;
  };

  const getLeaveTypeName = (type: any): string => {
    if (!type) return 'Unknown';
    if (typeof type === 'object') return type.name;
    const found = leaveTypes.find(t => t._id === type);
    return found ? found.name : 'Unknown Type';
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      PENDING: 'bg-muted text-muted-foreground',
      APPROVED: 'bg-accent/10 text-accent-foreground border-accent/20',
      REJECTED: 'bg-destructive/10 text-destructive border-destructive/20',
    };
    return colors[status] || 'bg-muted text-muted-foreground';
  };

  const stats = {
    totalEmployees: employees.length,
    totalRequests: requests.length,
    pendingRequests: requests.filter(r => r.status === 'PENDING').length,
    approvedRequests: requests.filter(r => r.status === 'APPROVED').length,
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading leaves system...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Leave Management System</h1>
            <p className="text-muted-foreground mt-1">Manage employee leave balances, entitlements, and requests</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => setIsAssignModalOpen(true)} className="gap-2">
              <Users className="h-4 w-4" />
              Assign Entitlement
            </Button>
            <Button onClick={() => setIsAdjustModalOpen(true)} variant="outline" className="gap-2">
              <Settings className="h-4 w-4" />
              Adjust Balance
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="border-l-4 border-l-primary">
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Employees</CardTitle>
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Users className="h-4 w-4 text-primary" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground">{stats.totalEmployees}</div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-accent">
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Requests</CardTitle>
                <div className="p-2 bg-accent/10 rounded-lg">
                  <FileText className="h-4 w-4 text-accent-foreground" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground">{stats.totalRequests}</div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-muted-foreground">
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <CardTitle className="text-sm font-medium text-muted-foreground">Pending</CardTitle>
                <div className="p-2 bg-muted rounded-lg">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground">{stats.pendingRequests}</div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-accent">
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <CardTitle className="text-sm font-medium text-muted-foreground">Approved</CardTitle>
                <div className="p-2 bg-accent/10 rounded-lg">
                  <CheckCircle2 className="h-4 w-4 text-accent-foreground" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground">{stats.approvedRequests}</div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="balances" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="balances">Employee Balances</TabsTrigger>
            <TabsTrigger value="requests">Leave Requests</TabsTrigger>
            <TabsTrigger value="types">Leave Types</TabsTrigger>
          </TabsList>

          {/* Balances Tab */}
          <TabsContent value="balances" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>View Employee Leave Balances</CardTitle>
                <CardDescription>Select an employee to view their current leave balances</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-4">
                  <div className="flex-1">
                    <Label>Select Employee</Label>
                    <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose an employee" />
                      </SelectTrigger>
                      <SelectContent>
                        {employees.map((emp) => (
                          <SelectItem key={emp._id} value={emp._id}>
                            {emp.fullName} ({emp.employeeNumber})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {selectedEmployee && balances.length > 0 && (
                  <div className="mt-6 space-y-3">
                    <h3 className="font-semibold text-foreground">Leave Balances</h3>
                    {balances.map((balance) => (
                      <Card key={balance.leaveTypeId} className="bg-muted/30">
                        <CardContent className="pt-6">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-medium text-foreground">{balance.leaveTypeName || 'Unknown Type'}</h4>
                          </div>
                          <div className="grid grid-cols-4 gap-4 text-sm">
                            <div>
                              <span className="text-muted-foreground">Entitled:</span>
                              <p className="font-semibold text-foreground">{balance.entitled} days</p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Taken:</span>
                              <p className="font-semibold text-foreground">{balance.taken} days</p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Pending:</span>
                              <p className="font-semibold text-foreground">{balance.pending} days</p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Remaining:</span>
                              <p className="font-semibold text-accent-foreground">{balance.remaining} days</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}

                {selectedEmployee && balances.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <AlertCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>No leave balances found for this employee</p>
                    <Button onClick={() => setIsAssignModalOpen(true)} variant="outline" className="mt-4">
                      Assign Entitlement
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Requests Tab */}
          <TabsContent value="requests" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Leave Requests</CardTitle>
                <CardDescription>Review and manage employee leave requests</CardDescription>
              </CardHeader>
              <CardContent>
                {requests.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>No leave requests found</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {requests.map((request) => (
                      <Card key={request._id} className="bg-muted/30">
                        <CardContent className="pt-6">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <h4 className="font-semibold text-foreground">{getEmployeeName(request.employeeId)}</h4>
                                <Badge variant="outline" className={getStatusBadge(request.status)}>
                                  {request.status}
                                </Badge>
                              </div>
                              <div className="grid grid-cols-3 gap-4 text-sm text-muted-foreground">
                                <div>
                                  <span className="font-medium">Type:</span> {getLeaveTypeName(request.leaveTypeId)}
                                </div>
                                <div>
                                  <span className="font-medium">Duration:</span> {request.durationDays} days
                                </div>
                                <div>
                                  <span className="font-medium">From:</span> {new Date(request.dates.from).toLocaleDateString()}
                                </div>
                              </div>
                              {request.justification && (
                                <p className="text-sm text-muted-foreground mt-2">
                                  <span className="font-medium">Reason:</span> {request.justification}
                                </p>
                              )}
                            </div>
                            {request.status === 'PENDING' && (
                              <div className="flex gap-2 ml-4">
                                <Button size="sm" onClick={() => handleApproveRequest(request._id)} className="gap-1">
                                  <CheckCircle2 className="h-3 w-3" />
                                  Approve
                                </Button>
                                <Button size="sm" variant="destructive" onClick={() => handleRejectRequest(request._id, 'Rejected by HR')} className="gap-1">
                                  <XCircle className="h-3 w-3" />
                                  Reject
                                </Button>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Leave Types Tab */}
          <TabsContent value="types" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Leave Types</CardTitle>
                <CardDescription>Available leave types in the system</CardDescription>
              </CardHeader>
              <CardContent>
                {leaveTypes.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Calendar className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>No leave types configured</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {leaveTypes.map((type) => (
                      <Card key={type._id} className="bg-muted/30">
                        <CardContent className="pt-6">
                          <div className="flex items-start justify-between">
                            <div>
                              <h4 className="font-semibold text-foreground">{type.name}</h4>
                              <p className="text-sm text-muted-foreground">Code: {type.code}</p>
                            </div>
                            <Badge variant="outline" className={type.isPaid ? 'bg-accent/10 text-accent-foreground' : 'bg-muted'}>
                              {type.isPaid ? 'Paid' : 'Unpaid'}
                            </Badge>
                          </div>
                          {type.maxDaysPerYear && (
                            <p className="text-sm text-muted-foreground mt-2">
                              Max per year: {type.maxDaysPerYear} days
                            </p>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Assign Entitlement Modal */}
      <Dialog open={isAssignModalOpen} onOpenChange={setIsAssignModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Leave Entitlement</DialogTitle>
            <DialogDescription>Assign yearly leave entitlement to an employee</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Employee *</Label>
              <Select value={assignForm.employeeId} onValueChange={(value) => setAssignForm({ ...assignForm, employeeId: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select employee" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((emp) => (
                    <SelectItem key={emp._id} value={emp._id}>
                      {emp.fullName} ({emp.employeeNumber})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Leave Type *</Label>
              <Select value={assignForm.leaveTypeId} onValueChange={(value) => setAssignForm({ ...assignForm, leaveTypeId: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select leave type" />
                </SelectTrigger>
                <SelectContent>
                  {leaveTypes.map((type) => (
                    <SelectItem key={type._id} value={type._id}>
                      {type.name} ({type.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Yearly Entitlement (days) *</Label>
              <Input
                type="number"
                min="0"
                value={assignForm.yearlyEntitlement}
                onChange={(e) => setAssignForm({ ...assignForm, yearlyEntitlement: parseFloat(e.target.value) || 0 })}
                placeholder="Enter number of days"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAssignModalOpen(false)}>Cancel</Button>
            <Button onClick={handleAssignEntitlement}>Assign Entitlement</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Adjust Balance Modal */}
      <Dialog open={isAdjustModalOpen} onOpenChange={setIsAdjustModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adjust Leave Balance</DialogTitle>
            <DialogDescription>Manually add or deduct leave days for an employee</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Employee *</Label>
              <Select value={adjustForm.employeeId} onValueChange={(value) => setAdjustForm({ ...adjustForm, employeeId: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select employee" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((emp) => (
                    <SelectItem key={emp._id} value={emp._id}>
                      {emp.fullName} ({emp.employeeNumber})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Leave Type *</Label>
              <Select value={adjustForm.leaveTypeId} onValueChange={(value) => setAdjustForm({ ...adjustForm, leaveTypeId: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select leave type" />
                </SelectTrigger>
                <SelectContent>
                  {leaveTypes.map((type) => (
                    <SelectItem key={type._id} value={type._id}>
                      {type.name} ({type.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Adjustment Type *</Label>
              <Select value={adjustForm.type} onValueChange={(value: 'add' | 'deduct') => setAdjustForm({ ...adjustForm, type: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="add">Add Days</SelectItem>
                  <SelectItem value="deduct">Deduct Days</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Number of Days *</Label>
              <Input
                type="number"
                min="0"
                step="0.5"
                value={adjustForm.days}
                onChange={(e) => setAdjustForm({ ...adjustForm, days: parseFloat(e.target.value) || 0 })}
                placeholder="Enter number of days"
              />
            </div>
            <div>
              <Label>Reason *</Label>
              <Textarea
                value={adjustForm.reason}
                onChange={(e) => setAdjustForm({ ...adjustForm, reason: e.target.value })}
                placeholder="Enter reason for adjustment..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAdjustModalOpen(false)}>Cancel</Button>
            <Button onClick={handleAdjustBalance}>Adjust Balance</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
