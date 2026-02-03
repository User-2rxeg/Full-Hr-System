"use client";
import { useState, useEffect, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  getApplications,
  getJobs,
  updateApplicationStage,
  updateApplicationStatus,
  rejectApplication,
} from "@/app/services/recruitment";
import { Application, JobRequisition } from "@/types/recruitment";
import { ApplicationStage, ApplicationStatus } from "@/types/enums";
import {
  Users,
  Search,
  Filter,
  Briefcase,
  Calendar,
  UserCheck,
  Mail,
  Clock,
  CheckCircle2,
  Eye,
  ThumbsUp,
  ThumbsDown,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

function ApplicationsContent() {
  const searchParams = useSearchParams();
  const jobIdFromUrl = searchParams.get("job");
  const [applications, setApplications] = useState<Application[]>([]);
  const [jobs, setJobs] = useState<JobRequisition[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedJobFilter, setSelectedJobFilter] = useState<string>(jobIdFromUrl || "all");
  const [selectedStageFilter, setSelectedStageFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedApplication, setSelectedApplication] = useState<Application | null>(null);
  const [isActionModalOpen, setIsActionModalOpen] = useState(false);
  const [actionType, setActionType] = useState<"approve" | "reject" | "stage">("stage");
  const [newStage, setNewStage] = useState<ApplicationStage>(ApplicationStage.SCREENING);
  const [rejectionReason, setRejectionReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [appsData, jobsData] = await Promise.all([getApplications(), getJobs()]);
      setApplications(appsData || []);
      setJobs(jobsData || []);
    } catch (err: any) {
      toast.error("Failed to load applications");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenActionModal = (app: Application, type: "approve" | "reject" | "stage") => {
    setSelectedApplication(app);
    setActionType(type);
    setIsActionModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsActionModalOpen(false);
    setSelectedApplication(null);
    setRejectionReason("");
  };

  const handleSubmitAction = async () => {
    if (!selectedApplication) return;
    try {
      setSubmitting(true);
      if (actionType === "approve") {
        await updateApplicationStatus(selectedApplication.id, { status: ApplicationStatus.HIRED });
        toast.success("Application approved");
      } else if (actionType === "reject") {
        if (!rejectionReason.trim()) {
          toast.error("Please provide a rejection reason");
          return;
        }
        await rejectApplication(selectedApplication.id, rejectionReason);
        toast.success("Application rejected");
      } else if (actionType === "stage") {
        await updateApplicationStage(selectedApplication.id, newStage);
        toast.success("Stage updated");
      }
      handleCloseModal();
      await fetchData();
    } catch (err: any) {
      toast.error(err.message || "Failed to update");
    } finally {
      setSubmitting(false);
    }
  };

  const filteredApplications = useMemo(() => {
    return applications.filter((app) => {
      const matchesJob = selectedJobFilter === "all" || app.requisitionId === selectedJobFilter;
      const matchesStage = selectedStageFilter === "all" || app.currentStage === selectedStageFilter;
      const matchesSearch =
        searchQuery === "" ||
        (app.candidateName && app.candidateName.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (app.candidateEmail && app.candidateEmail.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesJob && matchesStage && matchesSearch;
    });
  }, [applications, selectedJobFilter, selectedStageFilter, searchQuery]);

  const stats = {
    total: applications.length,
    screening: applications.filter((a) => a.currentStage === ApplicationStage.SCREENING).length,
    interview: applications.filter(
      (a) => a.currentStage === ApplicationStage.DEPARTMENT_INTERVIEW || a.currentStage === ApplicationStage.HR_INTERVIEW
    ).length,
    hired: applications.filter((a) => a.status === ApplicationStatus.HIRED).length,
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex justify-between items-start">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <h1 className="text-3xl font-bold tracking-tight text-foreground">Candidate Applications</h1>
            </div>
            <p className="text-muted-foreground">Review, assess, and manage candidate applications</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="border-l-4 border-l-primary hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Applications</CardTitle>
                <div className="p-2 bg-primary/10 rounded-lg">
                  <FileText className="h-4 w-4 text-primary" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-foreground">{stats.total}</span>
                  <span className="text-sm text-muted-foreground">candidates</span>
                </div>
              )}
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-muted-foreground/50 hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <CardTitle className="text-sm font-medium text-muted-foreground">Screening</CardTitle>
                <div className="p-2 bg-muted rounded-lg">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-foreground">{stats.screening}</span>
                  <span className="text-sm text-muted-foreground">pending</span>
                </div>
              )}
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-primary hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <CardTitle className="text-sm font-medium text-muted-foreground">Interviews</CardTitle>
                <div className="p-2 bg-primary/10 rounded-lg">
                  <UserCheck className="h-4 w-4 text-primary" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-foreground">{stats.interview}</span>
                  <span className="text-sm text-muted-foreground">scheduled</span>
                </div>
              )}
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-accent hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <CardTitle className="text-sm font-medium text-muted-foreground">Hired</CardTitle>
                <div className="p-2 bg-accent/10 rounded-lg">
                  <CheckCircle2 className="h-4 w-4 text-accent-foreground" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-foreground">{stats.hired}</span>
                  <span className="text-sm text-muted-foreground">successful</span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={selectedJobFilter} onValueChange={setSelectedJobFilter}>
                <SelectTrigger>
                  <Briefcase className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Filter by job" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Jobs</SelectItem>
                  {jobs.map((job) => (
                    <SelectItem key={job.requisitionId} value={job.requisitionId}>
                      {job.templateTitle || job.requisitionId}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={selectedStageFilter} onValueChange={setSelectedStageFilter}>
                <SelectTrigger>
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Filter by stage" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Stages</SelectItem>
                  <SelectItem value={ApplicationStage.SCREENING}>Screening</SelectItem>
                  <SelectItem value={ApplicationStage.DEPARTMENT_INTERVIEW}>Dept. Interview</SelectItem>
                  <SelectItem value={ApplicationStage.HR_INTERVIEW}>HR Interview</SelectItem>
                  <SelectItem value={ApplicationStage.OFFER}>Offer</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
        <div className="grid grid-cols-1 gap-4">
          {loading
            ? Array.from({ length: 3 }).map((_, i) => (
                <Card key={i}>
                  <CardContent className="pt-6">
                    <Skeleton className="h-24 w-full" />
                  </CardContent>
                </Card>
              ))
            : filteredApplications.length === 0 ? (
                <Card>
                  <CardContent className="pt-16 pb-16 text-center">
                    <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-foreground mb-2">No applications found</h3>
                    <p className="text-muted-foreground">
                      {searchQuery || selectedJobFilter !== "all" || selectedStageFilter !== "all"
                        ? "Try adjusting your filters"
                        : "Applications will appear here"}
                    </p>
                  </CardContent>
                </Card>
              ) : (
                filteredApplications.map((application) => (
                  <Card key={application.id} className="hover:shadow-lg transition-shadow">
                    <CardContent className="pt-6">
                      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-start gap-3">
                            <div className="p-2 bg-muted rounded-lg">
                              <Users className="h-5 w-5 text-muted-foreground" />
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <h3 className="text-lg font-semibold text-foreground">{application.candidateName || "Unnamed"}</h3>
                                <Badge variant="outline">{application.currentStage}</Badge>
                                <Badge variant="outline">{application.status}</Badge>
                              </div>
                              <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                                <div className="flex items-center gap-1">
                                  <Mail className="h-3 w-3" />
                                  {application.candidateEmail || "No email"}
                                </div>
                                <div className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  Applied {new Date(application.createdAt).toLocaleDateString()}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {application.status !== ApplicationStatus.HIRED && application.status !== ApplicationStatus.REJECTED && (
                            <>
                              <Button variant="outline" size="sm" onClick={() => handleOpenActionModal(application, "stage")}>
                                <Eye className="h-4 w-4 mr-2" />
                                Stage
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleOpenActionModal(application, "approve")}
                                className="text-accent-foreground border-accent/30"
                              >
                                <ThumbsUp className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleOpenActionModal(application, "reject")}
                                className="text-destructive border-destructive/30"
                              >
                                <ThumbsDown className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
        </div>
      </div>
      <Dialog open={isActionModalOpen} onOpenChange={handleCloseModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionType === "approve" && "Approve Application"}
              {actionType === "reject" && "Reject Application"}
              {actionType === "stage" && "Update Stage"}
            </DialogTitle>
            <DialogDescription>
              {selectedApplication?.candidateName} - {selectedApplication?.candidateEmail}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {actionType === "reject" && (
              <div className="grid gap-2">
                <Label htmlFor="reason">Rejection Reason *</Label>
                <Textarea
                  id="reason"
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Reason..."
                  rows={4}
                  required
                />
              </div>
            )}
            {actionType === "stage" && (
              <div className="grid gap-2">
                <Label>New Stage</Label>
                <Select value={newStage} onValueChange={(value: ApplicationStage) => setNewStage(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ApplicationStage.SCREENING}>Screening</SelectItem>
                    <SelectItem value={ApplicationStage.DEPARTMENT_INTERVIEW}>Dept. Interview</SelectItem>
                    <SelectItem value={ApplicationStage.HR_INTERVIEW}>HR Interview</SelectItem>
                    <SelectItem value={ApplicationStage.OFFER}>Offer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseModal}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmitAction}
              disabled={submitting || (actionType === "reject" && !rejectionReason.trim())}
              variant={actionType === "reject" ? "destructive" : "default"}
            >
              {submitting ? "Processing..." : "Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function HRManagerApplicationsPage() {
  return (
    <Suspense fallback={<div className="p-6 text-center text-muted-foreground">Loading applications...</div>}>
      <ApplicationsContent />
    </Suspense>
  );
}
