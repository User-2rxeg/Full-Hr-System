'use client';

import { useState, useEffect } from 'react';
import {
  offboardingService,
  ClearanceChecklist,
  TerminationRequest,
  TerminationStatus,
  ApprovalStatus,
} from '@/app/services/offboarding';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  ClipboardCheck,
  CheckCircle2,
  XCircle,
  Clock,
  Plus,
  FileText,
  Building2
} from 'lucide-react';
import { toast } from 'sonner';

export default function ClearanceChecklistPage() {
  const [loading, setLoading] = useState(true);
  const [checklists, setChecklists] = useState<ClearanceChecklist[]>([]);
  const [selectedChecklist, setSelectedChecklist] = useState<ClearanceChecklist | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [approvedTerminations, setApprovedTerminations] = useState<TerminationRequest[]>([]);
  const [selectedTerminationId, setSelectedTerminationId] = useState<string>('');
  const [updateItemDept, setUpdateItemDept] = useState<string>('');
  const [updateItemStatus, setUpdateItemStatus] = useState<ApprovalStatus>(ApprovalStatus.PENDING);
  const [updateItemComments, setUpdateItemComments] = useState<string>('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [checklistsData, approvedData] = await Promise.all([
        offboardingService.getAllClearanceChecklists().catch(() => []),
        offboardingService.getTerminationRequestsByStatus(TerminationStatus.APPROVED).catch(() => []),
      ]);

      setChecklists(Array.isArray(checklistsData) ? checklistsData : []);
      setApprovedTerminations(Array.isArray(approvedData) ? approvedData : []);
    } catch (err: any) {
      toast.error('Failed to fetch data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateChecklist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTerminationId) {
      toast.error('Please select a termination request');
      return;
    }

    try {
      setSubmitting(true);
      await offboardingService.createClearanceChecklist({
        terminationId: selectedTerminationId,
        items: [
          { department: 'IT' },
          { department: 'Finance' },
          { department: 'Facilities' },
          { department: 'HR' },
          { department: 'Admin' },
        ],
      });

      toast.success('Clearance checklist created successfully');
      setIsCreateModalOpen(false);
      setSelectedTerminationId('');
      await fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to create clearance checklist');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSelectChecklist = async (checklist: ClearanceChecklist) => {
    setSelectedChecklist(checklist);
  };

  const handleUpdateItemStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedChecklist || !updateItemDept) return;

    try {
      setSubmitting(true);
      await offboardingService.updateClearanceItem(selectedChecklist._id, {
        department: updateItemDept,
        status: updateItemStatus,
        comments: updateItemComments,
        updatedBy: 'current-user', // TODO: Get from auth context
      });

      toast.success('Department clearance updated');
      setUpdateItemDept('');
      setUpdateItemComments('');
      await fetchData();
      if (selectedChecklist) {
        handleSelectChecklist(selectedChecklist);
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to update clearance item');
    } finally {
      setSubmitting(false);
    }
  };

  const getEmployeeName = (employeeId: any): string => {
    if (!employeeId) return 'Unknown Employee';
    if (typeof employeeId === 'string') return employeeId;
    if (typeof employeeId === 'object') {
      const emp = employeeId as any;
      return `${emp.firstName || ''} ${emp.lastName || ''}`.trim() || 'Employee';
    }
    return 'Employee';
  };

  const getTerminationDisplay = (terminationId: any): string => {
    if (!terminationId) return 'N/A';
    if (typeof terminationId === 'string') return terminationId.slice(0, 8);
    if (typeof terminationId === 'object' && terminationId._id) {
      return terminationId._id.slice(0, 8);
    }
    return 'N/A';
  };

  // Calculate if checklist is completed based on all items being approved
  const isChecklistCompleted = (checklist: ClearanceChecklist): boolean => {
    if (!checklist.items || checklist.items.length === 0) return false;
    return checklist.items.every(item => item.status === ApprovalStatus.APPROVED);
  };

  const stats = {
    total: checklists.length,
    pending: checklists.filter(c => !isChecklistCompleted(c)).length,
    completed: checklists.filter(c => isChecklistCompleted(c)).length,
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 p-6">
        <div className="max-w-7xl mx-auto space-y-8">
          <Skeleton className="h-24 w-full" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="border-l-4 border-l-muted">
                <CardContent className="pt-6">
                  <Skeleton className="h-20 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 p-6 relative">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-primary/10 rounded-lg">
                <ClipboardCheck className="h-6 w-6 text-primary" />
              </div>
              <h1 className="text-3xl font-bold tracking-tight text-foreground">
                Exit Clearance Checklists
              </h1>
            </div>
            <p className="text-muted-foreground">
              Manage departmental sign-offs for employee separations
            </p>
          </div>
          <Button onClick={() => setIsCreateModalOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            New Checklist
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="border-l-4 border-l-primary hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Checklists
                </CardTitle>
                <div className="p-2 bg-primary/10 rounded-lg">
                  <FileText className="h-4 w-4 text-primary" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-foreground">
                  {stats.total}
                </span>
                <span className="text-sm text-muted-foreground">checklists</span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-destructive hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Pending Clearance
                </CardTitle>
                <div className="p-2 bg-destructive/10 rounded-lg">
                  <Clock className="h-4 w-4 text-destructive" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-2">
                <span className={`text-3xl font-bold ${stats.pending > 0 ? 'text-destructive' : 'text-foreground'}`}>
                  {stats.pending}
                </span>
                <span className="text-sm text-muted-foreground">in progress</span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-accent hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Completed
                </CardTitle>
                <div className="p-2 bg-accent/10 rounded-lg">
                  <CheckCircle2 className="h-4 w-4 text-accent-foreground" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-foreground">
                  {stats.completed}
                </span>
                <span className="text-sm text-muted-foreground">approved</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Checklists List */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Checklists ({checklists.length})</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-border max-h-[600px] overflow-y-auto">
                  {checklists.length === 0 ? (
                    <div className="p-8 text-center">
                      <ClipboardCheck className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">No checklists found</p>
                      <Button
                        variant="outline"
                        className="mt-4"
                        onClick={() => setIsCreateModalOpen(true)}
                      >
                        Create First Checklist
                      </Button>
                    </div>
                  ) : (
                    checklists.map((checklist) => (
                      <button
                        key={checklist._id}
                        onClick={() => handleSelectChecklist(checklist)}
                        className={`w-full text-left p-4 hover:bg-accent/50 transition-colors ${
                          selectedChecklist?._id === checklist._id
                            ? 'bg-accent border-l-4 border-l-primary'
                            : ''
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <p className="font-semibold text-foreground">
                            ID: {getTerminationDisplay(checklist.terminationId)}
                          </p>
                          {isChecklistCompleted(checklist) ? (
                            <Badge variant="outline" className="text-accent-foreground border-accent/30">
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Complete
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-destructive border-destructive/30">
                              <Clock className="h-3 w-3 mr-1" />
                              Pending
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Created: {new Date(checklist.createdAt).toLocaleDateString()}
                        </p>
                      </button>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right: Checklist Details */}
          <div className="lg:col-span-2">
            {!selectedChecklist ? (
              <Card>
                <CardContent className="pt-16 pb-16 text-center">
                  <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    Select a Checklist
                  </h3>
                  <p className="text-muted-foreground">
                    Choose a checklist from the list to view departmental clearances
                  </p>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Checklist Details</CardTitle>
                      <CardDescription>
                        Termination ID: {getTerminationDisplay(selectedChecklist.terminationId)}
                      </CardDescription>
                    </div>
                    {isChecklistCompleted(selectedChecklist) && (
                      <Badge className="bg-accent text-accent-foreground">
                        <CheckCircle2 className="h-4 w-4 mr-1" />
                        Fully Cleared
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {selectedChecklist.items && selectedChecklist.items.length > 0 ? (
                    selectedChecklist.items.map((item, idx) => (
                      <Card key={idx} className="border-l-4 border-l-muted">
                        <CardContent className="pt-6">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <Building2 className="h-5 w-5 text-muted-foreground" />
                                <h4 className="font-semibold text-foreground">
                                  {item.department || 'Unknown Department'}
                                </h4>
                              </div>
                              {item.comments && (
                                <p className="text-sm text-muted-foreground ml-8">
                                  {item.comments}
                                </p>
                              )}
                            </div>
                            <div>
                              {item.status === ApprovalStatus.APPROVED ? (
                                <Badge variant="outline" className="text-accent-foreground border-accent/30">
                                  <CheckCircle2 className="h-3 w-3 mr-1" />
                                  Cleared
                                </Badge>
                              ) : item.status === ApprovalStatus.REJECTED ? (
                                <Badge variant="outline" className="text-destructive border-destructive/30">
                                  <XCircle className="h-3 w-3 mr-1" />
                                  Rejected
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-muted-foreground border-border">
                                  <Clock className="h-3 w-3 mr-1" />
                                  Pending
                                </Badge>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      No clearance items found
                    </div>
                  )}

                  {/* Update Item Form */}
                  <Card className="border-primary/20">
                    <CardHeader>
                      <CardTitle className="text-base">Update Department Clearance</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <form onSubmit={handleUpdateItemStatus} className="space-y-4">
                        <div className="grid gap-2">
                          <Label htmlFor="department">Department *</Label>
                          <Select value={updateItemDept} onValueChange={setUpdateItemDept} required>
                            <SelectTrigger>
                              <SelectValue placeholder="Select department" />
                            </SelectTrigger>
                            <SelectContent>
                              {selectedChecklist.items?.map((item, idx) => (
                                <SelectItem key={idx} value={item.department || `dept-${idx}`}>
                                  {item.department || 'Unknown'}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="grid gap-2">
                          <Label htmlFor="status">Status *</Label>
                          <Select
                            value={updateItemStatus}
                            onValueChange={(value: ApprovalStatus) => setUpdateItemStatus(value)}
                            required
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value={ApprovalStatus.APPROVED}>Approved</SelectItem>
                              <SelectItem value={ApprovalStatus.REJECTED}>Rejected</SelectItem>
                              <SelectItem value={ApprovalStatus.PENDING}>Pending</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="grid gap-2">
                          <Label htmlFor="comments">Comments</Label>
                          <Textarea
                            id="comments"
                            value={updateItemComments}
                            onChange={(e) => setUpdateItemComments(e.target.value)}
                            placeholder="Add any notes or comments..."
                            rows={3}
                          />
                        </div>

                        <Button type="submit" disabled={submitting || !updateItemDept}>
                          {submitting ? 'Updating...' : 'Update Clearance'}
                        </Button>
                      </form>
                    </CardContent>
                  </Card>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Create Checklist Modal */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Create Clearance Checklist</DialogTitle>
            <DialogDescription>
              Create a new exit clearance checklist for an approved termination
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateChecklist}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="termination">Approved Termination *</Label>
                <Select
                  value={selectedTerminationId}
                  onValueChange={setSelectedTerminationId}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a termination request" />
                  </SelectTrigger>
                  <SelectContent>
                    {approvedTerminations.length === 0 ? (
                      <SelectItem value="none" disabled>
                        No approved terminations available
                      </SelectItem>
                    ) : (
                      approvedTerminations.map((term) => (
                        <SelectItem key={term._id} value={term._id}>
                          {getEmployeeName(term.employeeId)} - {term.reason?.substring(0, 40) || 'N/A'}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                {approvedTerminations.length === 0 && (
                  <p className="text-sm text-destructive">
                    No approved terminations available. Please approve a termination first.
                  </p>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCreateModalOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={submitting || approvedTerminations.length === 0}>
                {submitting ? 'Creating...' : 'Create Checklist'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
