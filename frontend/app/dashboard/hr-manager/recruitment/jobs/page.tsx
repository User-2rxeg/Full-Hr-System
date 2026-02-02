'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
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
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  getJobs,
  getJobTemplates,
  createJob,
  updateJob,
  publishJob,
  closeJob
} from '@/app/services/recruitment';
import { JobRequisition, JobTemplate } from '@/types/recruitment';
import {
  Plus,
  Search,
  MapPin,
  Users,
  Calendar,
  Briefcase,
  Eye,
  Edit3,
  CheckCircle2,
  XCircle,
  Clock,
  ChevronRight,
  FileText,
  BarChart3,
  Filter,
  Settings
} from 'lucide-react';
import { toast } from 'sonner';

interface JobWithDetails extends JobRequisition {
  templateTitle?: string;
  hiringManagerName?: string;
  applicationCount?: number;
}

interface JobFormData {
  templateId: string;
  openings: number;
  location: string;
  expiryDate: string;
  hiringManagerId?: string;
}

export default function RecruitmentJobsPageRedesigned() {
  const [jobs, setJobs] = useState<JobWithDetails[]>([]);
  const [templates, setTemplates] = useState<JobTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedJob, setSelectedJob] = useState<JobWithDetails | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [formData, setFormData] = useState<JobFormData>({
    templateId: '',
    openings: 1,
    location: '',
    expiryDate: '',
    hiringManagerId: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [jobsData, templatesData] = await Promise.all([
        getJobs(),
        getJobTemplates(),
      ]);
      setJobs(jobsData || []);
      setTemplates(templatesData || []);
    } catch (err: any) {
      toast.error('Failed to load jobs');
      console.error('Error fetching jobs:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleOpenModal = (job?: JobWithDetails) => {
    if (job) {
      setIsEditing(true);
      setSelectedJob(job);
      setFormData({
        templateId: job.templateId || '',
        openings: job.openings || 1,
        location: job.location || '',
        expiryDate: job.expiryDate ? new Date(job.expiryDate).toISOString().split('T')[0] : '',
      });
    } else {
      setIsEditing(false);
      setSelectedJob(null);
      setFormData({
        templateId: '',
        openings: 1,
        location: '',
        expiryDate: '',
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setIsEditing(false);
    setSelectedJob(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (isEditing && selectedJob) {
        await updateJob(selectedJob.requisitionId, formData);
        toast.success('Job requisition updated successfully');
      } else {
        // Ensure hiringManagerId is provided or use a default
        const jobData = {
          ...formData,
          hiringManagerId: formData.hiringManagerId || '',
        };
        await createJob(jobData as any);
        toast.success('Job requisition created successfully');
      }
      handleCloseModal();
      fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save job requisition');
    }
  };

  const handlePublish = async (requisitionId: string) => {
    try {
      await publishJob(requisitionId);
      toast.success('Job published successfully');
      fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to publish job');
    }
  };

  const handleClose = async (requisitionId: string) => {
    try {
      await closeJob(requisitionId);
      toast.success('Job closed successfully');
      fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to close job');
    }
  };

  const filteredJobs = jobs.filter((job) => {
    const matchesSearch =
      (job.templateTitle?.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (job.location?.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (job.requisitionId?.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus = statusFilter === 'all' || job.publishStatus === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: jobs.length,
    draft: jobs.filter(j => j.publishStatus === 'draft').length,
    published: jobs.filter(j => j.publishStatus === 'published').length,
    closed: jobs.filter(j => j.publishStatus === 'closed').length,
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 p-6 relative">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Briefcase className="h-6 w-6 text-primary" />
              </div>
              <h1 className="text-3xl font-bold tracking-tight text-foreground">
                Job Requisitions
              </h1>
            </div>
            <p className="text-muted-foreground">
              Create, manage, and publish job openings to attract top talent
            </p>
          </div>
          <Button onClick={() => handleOpenModal()} className="gap-2">
            <Plus className="h-4 w-4" />
            New Requisition
          </Button>
        </div>

        {/* Performance Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="border-l-4 border-l-primary hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Requisitions
                </CardTitle>
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
                  <span className="text-3xl font-bold text-foreground">
                    {stats.total}
                  </span>
                  <span className="text-sm text-muted-foreground">jobs</span>
                </div>
              )}
            </CardContent>
            <CardFooter className="pt-0">
              <div className="text-xs text-muted-foreground">
                All statuses included
              </div>
            </CardFooter>
          </Card>

          <Card className="border-l-4 border-l-muted-foreground/50 hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Draft Requisitions
                </CardTitle>
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
                  <span className="text-3xl font-bold text-foreground">
                    {stats.draft}
                  </span>
                  <span className="text-sm text-muted-foreground">pending</span>
                </div>
              )}
            </CardContent>
            <CardFooter className="pt-0">
              <div className="text-xs text-muted-foreground">
                Ready to publish
              </div>
            </CardFooter>
          </Card>

          <Card className="border-l-4 border-l-accent hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Published Jobs
                </CardTitle>
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
                  <span className="text-3xl font-bold text-foreground">
                    {stats.published}
                  </span>
                  <span className="text-sm text-muted-foreground">live</span>
                </div>
              )}
            </CardContent>
            <CardFooter className="pt-0">
              <Link
                href="/dashboard/hr-manager/recruitment/applications"
                className="text-sm text-primary hover:text-primary/80 flex items-center gap-1"
              >
                View applications
                <ChevronRight className="h-3 w-3" />
              </Link>
            </CardFooter>
          </Card>

          <Card className="border-l-4 border-l-destructive hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Closed Positions
                </CardTitle>
                <div className="p-2 bg-destructive/10 rounded-lg">
                  <XCircle className="h-4 w-4 text-destructive" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-foreground">
                    {stats.closed}
                  </span>
                  <span className="text-sm text-muted-foreground">archived</span>
                </div>
              )}
            </CardContent>
            <CardFooter className="pt-0">
              <div className="text-xs text-muted-foreground">
                Filled or cancelled
              </div>
            </CardFooter>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by title, location, or ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-[200px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="published">Published</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Jobs List */}
        <div className="grid grid-cols-1 gap-4">
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="pt-6">
                  <Skeleton className="h-20 w-full" />
                </CardContent>
              </Card>
            ))
          ) : filteredJobs.length === 0 ? (
            <Card>
              <CardContent className="pt-16 pb-16 text-center">
                <Briefcase className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  No job requisitions found
                </h3>
                <p className="text-muted-foreground mb-6">
                  Get started by creating your first job requisition
                </p>
                <Button onClick={() => handleOpenModal()}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Job Requisition
                </Button>
              </CardContent>
            </Card>
          ) : (
            filteredJobs.map((job) => (
              <Card key={job.requisitionId} className="hover:shadow-lg transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div className="flex-1 space-y-3">
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-muted rounded-lg">
                          <Briefcase className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="text-lg font-semibold text-foreground">
                              {job.templateTitle || (job as any).jobTitle || (job as any).title || (job as any).positionTitle || (job as any).role || 'Position Not Specified'}
                            </h3>
                            {job.publishStatus === 'draft' && (
                              <Badge variant="outline" className="text-muted-foreground border-border">
                                <Clock className="h-3 w-3 mr-1" />
                                Draft
                              </Badge>
                            )}
                            {job.publishStatus === 'published' && (
                              <Badge variant="outline" className="text-accent-foreground border-accent/30">
                                <CheckCircle2 className="h-3 w-3 mr-1" />
                                Published
                              </Badge>
                            )}
                            {job.publishStatus === 'closed' && (
                              <Badge variant="outline" className="text-destructive border-destructive/30">
                                <XCircle className="h-3 w-3 mr-1" />
                                Closed
                              </Badge>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {job.location || 'Location not specified'}
                            </div>
                            <div className="flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              {job.openings} {job.openings === 1 ? 'opening' : 'openings'}
                            </div>
                            {job.expiryDate && (
                              <div className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                Expires {new Date(job.expiryDate).toLocaleDateString()}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenModal(job)}
                      >
                        <Edit3 className="h-4 w-4" />
                      </Button>
                      {job.publishStatus === 'draft' && (
                        <Button
                          size="sm"
                          onClick={() => handlePublish(job.requisitionId)}
                        >
                          Publish
                        </Button>
                      )}
                      {job.publishStatus === 'published' && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            asChild
                          >
                            <Link href={`/dashboard/hr-manager/recruitment/applications?job=${job.requisitionId}`}>
                              <Eye className="h-4 w-4 mr-2" />
                              Applications
                            </Link>
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleClose(job.requisitionId)}
                          >
                            Close
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

        {/* Management Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Recruitment Management
            </CardTitle>
            <CardDescription>
              Additional recruitment tools and analytics
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Link
                href="/dashboard/hr-manager/recruitment/templates/jobs"
                className="group relative overflow-hidden rounded-xl border border-border/50 bg-card p-5 hover:border-primary/50 hover:shadow-lg transition-all"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative z-10">
                  <div className="p-2 bg-primary/10 rounded-lg w-fit mb-3">
                    <FileText className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="font-semibold text-foreground mb-1">Job Templates</h3>
                  <p className="text-xs text-muted-foreground">Standardized job descriptions</p>
                </div>
              </Link>

              <Link
                href="/dashboard/hr-manager/recruitment/analytics"
                className="group relative overflow-hidden rounded-xl border border-border/50 bg-card p-5 hover:border-primary/50 hover:shadow-lg transition-all"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative z-10">
                  <div className="p-2 bg-primary/10 rounded-lg w-fit mb-3">
                    <BarChart3 className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="font-semibold text-foreground mb-1">Analytics</h3>
                  <p className="text-xs text-muted-foreground">Recruitment insights and metrics</p>
                </div>
              </Link>

              <Link
                href="/dashboard/hr-manager/recruitment/applications"
                className="group relative overflow-hidden rounded-xl border border-border/50 bg-card p-5 hover:border-primary/50 hover:shadow-lg transition-all"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative z-10">
                  <div className="p-2 bg-primary/10 rounded-lg w-fit mb-3">
                    <Users className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="font-semibold text-foreground mb-1">Applications</h3>
                  <p className="text-xs text-muted-foreground">Review candidate applications</p>
                </div>
              </Link>

              <Link
                href="/dashboard/hr-manager/recruitment/interviews"
                className="group relative overflow-hidden rounded-xl border border-border/50 bg-card p-5 hover:border-primary/50 hover:shadow-lg transition-all"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative z-10">
                  <div className="p-2 bg-primary/10 rounded-lg w-fit mb-3">
                    <Calendar className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="font-semibold text-foreground mb-1">Interviews</h3>
                  <p className="text-xs text-muted-foreground">Schedule and manage interviews</p>
                </div>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Create/Edit Modal */}
      <Dialog open={isModalOpen} onOpenChange={handleCloseModal}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>
              {isEditing ? 'Edit Job Requisition' : 'Create Job Requisition'}
            </DialogTitle>
            <DialogDescription>
              {isEditing ? 'Update the job requisition details' : 'Create a new job requisition from a template'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="templateId">Job Template *</Label>
                <Select
                  value={formData.templateId}
                  onValueChange={(value) => setFormData({ ...formData, templateId: value })}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a job template" />
                  </SelectTrigger>
                  <SelectContent>
                    {templates.map((template) => (
                      <SelectItem key={template._id || template.id} value={template._id || template.id || ''}>
                        {template.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="openings">Number of Openings *</Label>
                <Input
                  id="openings"
                  type="number"
                  min="1"
                  value={formData.openings}
                  onChange={(e) => setFormData({ ...formData, openings: parseInt(e.target.value) || 1 })}
                  required
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="location">Location *</Label>
                <Input
                  id="location"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="e.g., New Cairo, Egypt"
                  required
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="expiryDate">Expiry Date</Label>
                <Input
                  id="expiryDate"
                  type="date"
                  value={formData.expiryDate}
                  onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseModal}>
                Cancel
              </Button>
              <Button type="submit">
                {isEditing ? 'Update Requisition' : 'Create Requisition'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
