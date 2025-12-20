'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/app/components/ui/button';
import { GlassCard } from '@/app/components/ui/glass-card';
import { Input } from '@/app/components/ui/input';
import { LoadingSpinner } from '@/app/components/ui/loading-spinner';
import { useAuth } from '@/app/context/AuthContext';
import {
  getJobs,
  getJobTemplates,
  createJob,
  updateJob,
  publishJob,
  closeJob
} from '@/app/services/recruitment';
import { JobRequisition, JobTemplate } from '@/app/types/recruitment';
import {
  Plus,
  Search,
  MapPin,
  Users,
  Calendar,
  Briefcase,
  Building2,
  Eye,
  Edit3,
  CheckCircle2,
  XCircle,
  Clock,
  Layout,
  ChevronRight,
  Sparkles,
  Info,
  AlertTriangle
} from 'lucide-react';
import { Badge } from '@/app/components/ui/badge';

// =====================================================
// Types
// =====================================================

interface JobWithDetails {
  id: string;
  requisitionId: string;
  templateId?: string;
  openings: number;
  location?: string;
  hiringManagerId: string;
  publishStatus: 'draft' | 'published' | 'closed';
  postingDate?: string;
  expiryDate?: string;
  createdAt: string;
  updatedAt: string;
  templateTitle?: string;
  hiringManagerName?: string;
  applicationCount?: number;
  title?: string;
  department?: string;
  description?: string;
  responsibilities?: string[];
  requirements?: string[];
  qualifications?: string[];
}

interface EmployerBranding {
  companyName: string;
  logo: string;
  tagline: string;
  description: string;
  benefits: string[];
  culture: string[];
}

const defaultEmployerBranding: EmployerBranding = {
  companyName: 'German International University',
  logo: '/logo-placeholder.png',
  tagline: 'Empowering Future Leaders',
  description: 'We are a premier educational institution committed to excellence in research and teaching.',
  benefits: [
    'Competitive Salary & Research Grants',
    'Comprehensive Health Coverage',
    'Expat Support & Housing Assistance',
    'International Professional Development',
    'State-of-the-art Campus Facilities',
  ],
  culture: [
    'Academic Excellence',
    'Global Inclusivity',
    'Research-Driven Innovation',
    'Collaborative Faculty Community',
  ],
};

// =====================================================
// Status Badge Component
// =====================================================

function StatusBadge({ status }: { status: 'draft' | 'published' | 'closed' }) {
  const statusStyles = {
    draft: 'bg-muted text-muted-foreground border-border',
    published: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.1)]',
    closed: 'bg-destructive/10 text-destructive border-destructive/20 shadow-[0_0_10px_rgba(239,68,68,0.1)]',
  };

  const statusLabels = {
    draft: 'Draft Requisition',
    published: 'Live Posting',
    closed: 'Closed',
  };

  const icons = {
    draft: <Clock className="w-3 h-3 mr-1.5" />,
    published: <CheckCircle2 className="w-3 h-3 mr-1.5" />,
    closed: <XCircle className="w-3 h-3 mr-1.5" />,
  };

  return (
    <Badge variant="outline" className={`py-1 px-3 ${statusStyles[status]} font-bold tracking-tight uppercase text-[10px]`}>
      {icons[status]}
      {statusLabels[status]}
    </Badge>
  );
}

// =====================================================
// Create/Edit Job Modal
// =====================================================

interface JobFormData {
  templateId: string;
  openings: number;
  location: string;
  expiryDate: string;
}

function JobFormModal({
  isOpen,
  onClose,
  onSubmit,
  templates,
  initialData,
  isEditing,
  isLoading,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: JobFormData) => Promise<void>;
  templates: JobTemplate[];
  initialData?: JobFormData;
  isEditing: boolean;
  isLoading: boolean;
}) {
  const [formData, setFormData] = useState<JobFormData>(
    initialData || {
      templateId: '',
      openings: 1,
      location: '',
      expiryDate: '',
    }
  );

  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
    } else {
      setFormData({
        templateId: '',
        openings: 1,
        location: '',
        expiryDate: '',
      });
    }
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(formData);
  };

  return (
    <div className="fixed inset-0 bg-background/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-in fade-in duration-300">
      <GlassCard className="max-w-xl w-full p-8 shadow-2xl border-primary/20 animate-in zoom-in-95 duration-300">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
            {isEditing ? <Edit3 className="w-6 h-6" /> : <Plus className="w-6 h-6" />}
          </div>
          <h2 className="text-2xl font-bold text-foreground">
            {isEditing ? 'Pulse Edit: Requisition' : 'Compose: New Requisition'}
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
              <Layout className="w-3 h-3" /> Job Template
            </label>
            <select
              value={formData.templateId}
              onChange={(e) => setFormData({ ...formData, templateId: e.target.value })}
              className="w-full h-11 px-4 bg-muted/40 border border-border rounded-xl focus:ring-2 focus:ring-primary/20 text-sm font-medium focus:outline-none appearance-none transition-all"
              required
              disabled={isEditing}
            >
              <option value="">Select an approved template...</option>
              {templates.map((template) => (
                <option key={template.id || template._id} value={template.id || template._id}>
                  {template.title} — {template.department}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                <Users className="w-3 h-3" /> Headcount
              </label>
              <Input
                type="number"
                min="1"
                value={formData.openings}
                onChange={(e) => setFormData({ ...formData, openings: parseInt(e.target.value) || 1 })}
                className="h-11 rounded-xl bg-muted/40 border-border focus:ring-primary/20 font-bold"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                <MapPin className="w-3 h-3" /> Deployment City
              </label>
              <Input
                type="text"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder="e.g., Cairo, Egypt"
                className="h-11 rounded-xl bg-muted/40 border-border focus:ring-primary/20"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
              <Calendar className="w-3 h-3" /> Auto-Archive Date
            </label>
            <Input
              type="date"
              value={formData.expiryDate}
              onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
              className="h-11 rounded-xl bg-muted/40 border-border focus:ring-primary/20"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="ghost" onClick={onClose} disabled={isLoading} className="h-11 font-bold">
              Dismiss
            </Button>
            <Button type="submit" disabled={isLoading} className="h-11 px-8 rounded-xl bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 font-bold">
              {isLoading ? (
                <span className="flex items-center gap-2 italic">Processing...</span>
              ) : isEditing ? (
                'Sync Changes'
              ) : (
                'Finalize Creation'
              )}
            </Button>
          </div>
        </form>
      </GlassCard>
    </div>
  );
}

// =====================================================
// Job Preview Modal
// =====================================================

function JobPreviewModal({
  job,
  branding,
  onClose,
  onPublish,
  onCloseJob,
  isPublishing,
}: {
  job: JobWithDetails;
  branding: EmployerBranding;
  onClose: () => void;
  onPublish: () => void;
  onCloseJob: () => void;
  isPublishing: boolean;
}) {
  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-md flex items-center justify-center z-[100] p-4 animate-in fade-in duration-500">
      <GlassCard className="max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border-border/50 animate-in slide-in-from-bottom-8 duration-500">
        {/* Header with Branding */}
        <div className="bg-gradient-to-br from-primary via-primary/90 to-blue-600 text-primary-foreground p-10 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 blur-[80px] rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="flex items-center gap-6 mb-8 relative z-10">
            <div className="w-20 h-20 bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl flex items-center justify-center shadow-inner">
              <Building2 className="w-10 h-10" />
            </div>
            <div>
              <h2 className="text-2xl font-black tracking-tighter uppercase">{branding.companyName}</h2>
              <p className="text-primary-foreground/70 font-medium italic">{branding.tagline}</p>
            </div>
          </div>
          <div className="space-y-2 relative z-10">
            <h1 className="text-5xl font-extrabold tracking-tighter leading-none">{job.title || job.templateTitle || 'Untitled Position'}</h1>
            <div className="flex flex-wrap gap-6 pt-4 text-sm font-bold opacity-80 uppercase tracking-widest">
              {job.department && (
                <span className="flex items-center gap-2 bg-white/10 px-3 py-1 rounded-lg">
                  <Building2 className="w-4 h-4" />
                  {job.department}
                </span>
              )}
              {job.location && (
                <span className="flex items-center gap-2 bg-white/10 px-3 py-1 rounded-lg">
                  <MapPin className="w-4 h-4" />
                  {job.location}
                </span>
              )}
              <span className="flex items-center gap-2 bg-white/10 px-3 py-1 rounded-lg">
                <Users className="w-4 h-4" />
                {job.openings} Opening{job.openings > 1 ? 's' : ''}
              </span>
            </div>
          </div>
        </div>

        {/* Job Details */}
        <div className="p-10 space-y-10">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
            <div className="lg:col-span-2 space-y-10">
              {job.description && (
                <section className="space-y-4">
                  <div className="flex items-center gap-2 text-primary font-black uppercase tracking-widest text-xs">
                    <Info className="w-4 h-4" /> The Mission
                  </div>
                  <p className="text-muted-foreground leading-relaxed text-lg font-medium opacity-90">{job.description}</p>
                </section>
              )}

              <div className="grid md:grid-cols-2 gap-10">
                {job.responsibilities && job.responsibilities.length > 0 && (
                  <section className="space-y-4">
                    <h3 className="text-sm font-black text-foreground uppercase tracking-widest flex items-center gap-2">
                      Core Responsibilities
                    </h3>
                    <ul className="space-y-3">
                      {job.responsibilities.map((item, idx) => (
                        <li key={idx} className="flex gap-3 text-sm text-muted-foreground font-medium">
                          <CheckCircle2 className="w-4 h-4 mt-0.5 text-primary flex-shrink-0" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </section>
                )}

                {job.requirements && job.requirements.length > 0 && (
                  <section className="space-y-4">
                    <h3 className="text-sm font-black text-foreground uppercase tracking-widest flex items-center gap-2">
                      Ideal Candidate Profile
                    </h3>
                    <ul className="space-y-3">
                      {job.requirements.map((item, idx) => (
                        <li key={idx} className="flex gap-3 text-sm text-muted-foreground font-medium">
                          <Sparkles className="w-4 h-4 mt-0.5 text-amber-500 flex-shrink-0" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </section>
                )}
              </div>
            </div>

            <aside className="space-y-8">
              <div className="bg-muted/30 rounded-3xl p-6 border border-border/50 space-y-6">
                <h3 className="text-sm font-black text-foreground tracking-widest uppercase">Perks & Culture</h3>
                <div className="space-y-6">
                  <div>
                    <h4 className="text-[10px] font-black text-primary uppercase tracking-[0.2em] mb-3">Benefits</h4>
                    <ul className="space-y-3">
                      {branding.benefits.map((benefit, idx) => (
                        <li key={idx} className="flex items-center gap-3 text-xs font-bold text-foreground opacity-80">
                          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                          {benefit}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="pt-4 border-t border-border/50">
                    <h4 className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.2em] mb-3">Institutional Culture</h4>
                    <ul className="space-y-2">
                      {branding.culture.map((item, idx) => (
                        <li key={idx} className="text-[11px] font-semibold text-muted-foreground italic leading-tight">
                          "{item}"
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </aside>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="border-t border-border/50 p-6 flex justify-between items-center bg-muted/20">
          <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Internal Preview Only
          </Badge>
          <div className="flex gap-3">
            <Button variant="ghost" className="rounded-xl font-bold h-11" onClick={onClose}>
              Dismiss
            </Button>
            {job.publishStatus === 'draft' && (
              <Button
                onClick={onPublish}
                disabled={isPublishing}
                className="rounded-xl h-11 px-8 bg-primary hover:bg-primary/90 font-bold shadow-lg shadow-primary/20"
              >
                {isPublishing ? 'Synchronizing...' : 'Go Live Now'}
              </Button>
            )}
            {job.publishStatus === 'published' && (
              <Button
                variant="destructive"
                onClick={onCloseJob}
                disabled={isPublishing}
                className="rounded-xl h-11 px-8 font-bold shadow-lg shadow-destructive/20"
              >
                {isPublishing ? 'Revoking...' : 'Revoke Posting'}
              </Button>
            )}
          </div>
        </div>
      </GlassCard>
    </div>
  );
}

// =====================================================
// Main Page Component - HR Manager Job Management
// =====================================================

export default function HRManagerJobsPage() {
  const { user } = useAuth();
  const [jobs, setJobs] = useState<JobWithDetails[]>([]);
  const [templates, setTemplates] = useState<JobTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedJob, setSelectedJob] = useState<JobWithDetails | null>(null);
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishSuccess, setPublishSuccess] = useState<string | null>(null);

  // Form modal state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingJob, setEditingJob] = useState<JobWithDetails | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [jobsData, templatesData] = await Promise.all([
        getJobs(),
        getJobTemplates(),
      ]);

      const transformedJobs: JobWithDetails[] = (jobsData || []).map((job: JobRequisition & { _id?: string }) => {
        const template = templatesData.find((t: JobTemplate & { _id?: string }) =>
          (t.id || t._id) === job.templateId
        );

        return {
          id: job.id || job._id || '',
          requisitionId: job.requisitionId || `REQ-${Date.now()}`,
          templateId: job.templateId,
          openings: job.openings || 1,
          location: job.location || 'Remote-Friendly',
          hiringManagerId: job.hiringManagerId || '',
          publishStatus: job.publishStatus || 'draft',
          postingDate: job.postingDate,
          expiryDate: job.expiryDate,
          createdAt: job.createdAt || new Date().toISOString(),
          updatedAt: job.updatedAt || new Date().toISOString(),
          templateTitle: template?.title,
          title: template?.title || 'Untitled High-Impact Role',
          department: template?.department || 'Strategic Dept',
          description: template?.description,
          responsibilities: (template as any)?.responsibilities || [],
          requirements: (template as any)?.requirements || [],
          qualifications: template?.qualifications,
          applicationCount: 0,
        };
      });

      setJobs(transformedJobs);
      setTemplates(templatesData || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to synchronize acquisition data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filteredJobs = jobs.filter((job) => {
    const jobTitle = job.title || job.templateTitle || '';
    const jobDepartment = job.department || '';
    const matchesSearch =
      jobTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
      jobDepartment.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.requisitionId.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || job.publishStatus === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleEditJob = (job: JobWithDetails) => {
    setEditingJob(job);
    setIsFormOpen(true);
  };

  const handleCreateJob = async (data: JobFormData) => {
    if (!user?.id) return;
    setIsSubmitting(true);
    try {
      await createJob({
        templateId: data.templateId,
        openings: data.openings,
        location: data.location,
        hiringManagerId: user.id,
        expiryDate: data.expiryDate || undefined,
      });
      setIsFormOpen(false);
      setPublishSuccess('Aquisition protocol initiated successfully.');
      setTimeout(() => setPublishSuccess(null), 3000);
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to launch requisition');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateJob = async (data: JobFormData) => {
    if (!editingJob?.requisitionId) return;
    setIsSubmitting(true);
    try {
      await updateJob(editingJob.requisitionId, {
        openings: data.openings,
        location: data.location,
        expiryDate: data.expiryDate || undefined,
      });
      setIsFormOpen(false);
      setEditingJob(null);
      setPublishSuccess('Requisition details synchronized.');
      setTimeout(() => setPublishSuccess(null), 3000);
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Requisition sync failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePublishJob = async (requisitionId: string | undefined) => {
    if (!requisitionId) return;
    setIsPublishing(true);
    try {
      await publishJob(requisitionId, true);
      setPublishSuccess('Position broadcasted to global talent pool.');
      setSelectedJob(null);
      setTimeout(() => setPublishSuccess(null), 3000);
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Activation protocol failed');
    } finally {
      setIsPublishing(false);
    }
  };

  const handleCloseJob = async (requisitionId: string | undefined) => {
    if (!requisitionId) return;
    setIsPublishing(true);
    try {
      await closeJob(requisitionId);
      setPublishSuccess('Position closed for new application influx.');
      setSelectedJob(null);
      setTimeout(() => setPublishSuccess(null), 3000);
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Termination failed');
    } finally {
      setIsPublishing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <LoadingSpinner size="lg" className="text-primary" />
        <p className="text-xs font-black uppercase tracking-[0.3em] text-muted-foreground animate-pulse">Synchronizing Acquisition Core</p>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-[1600px] mx-auto space-y-10 animate-in fade-in duration-500">
      {/* Page Header */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 border-b border-border/50 pb-8">
        <div className="space-y-2">
          <div className="flex items-center gap-3 text-primary font-black uppercase tracking-[0.2em] text-[10px] mb-1">
            <div className="w-8 h-[1px] bg-primary/40" /> Position Management
          </div>
          <h1 className="text-4xl font-extrabold text-foreground tracking-tighter leading-none flex items-center gap-3">
            Requisitions
            <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 text-xs py-1 uppercase font-black px-3 tracking-tighter">{jobs.length} Total</Badge>
          </h1>
          <p className="text-muted-foreground text-lg font-medium opacity-80">
            Launch and orchestrate strategic hiring mandates across the global network.
          </p>
        </div>
        <Button
          onClick={() => { setEditingJob(null); setIsFormOpen(true); }}
          className="h-14 px-8 rounded-2xl bg-primary hover:bg-primary/90 shadow-xl shadow-primary/20 text-md font-bold transition-all hover:scale-[1.02] flex gap-3"
        >
          <Plus className="w-5 h-5" />
          Initiate Requisition
        </Button>
      </div>

      {/* Global Alerts */}
      <div className="space-y-3">
        {error && (
          <GlassCard className="border-destructive/20 bg-destructive/5 text-destructive p-5 flex items-center justify-between animate-in slide-in-from-top-4 duration-300">
            <div className="flex items-center gap-3 font-bold">
              <AlertTriangle className="w-5 h-5" />
              <span>{error}</span>
            </div>
            <button onClick={() => setError(null)} className="p-2 hover:bg-destructive/10 rounded-lg transition-colors">
              <XCircle className="w-5 h-5" />
            </button>
          </GlassCard>
        )}

        {publishSuccess && (
          <GlassCard className="border-emerald-500/20 bg-emerald-500/5 text-emerald-500 p-5 flex items-center gap-3 font-bold animate-in slide-in-from-top-4 duration-300">
            <CheckCircle2 className="w-5 h-5" />
            <span>{publishSuccess}</span>
          </GlassCard>
        )}
      </div>

      {/* Stats Summary Panel */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Mandates', value: jobs.length, sub: 'All statuses', color: 'primary' },
          { label: 'Staged', value: jobs.filter(j => j.publishStatus === 'draft').length, sub: 'Draft status', color: 'muted-foreground' },
          { label: 'Live', value: jobs.filter(j => j.publishStatus === 'published').length, sub: 'Market visible', color: 'emerald-500' },
          { label: 'Closed', value: jobs.filter(j => j.publishStatus === 'closed').length, sub: 'Archives', color: 'destructive' },
        ].map((stat, i) => (
          <GlassCard key={i} className="p-6 overflow-hidden group">
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 mb-2">{stat.label}</p>
            <div className="flex items-end gap-3">
              <span className={`text-4xl font-black tracking-tighter ${stat.color === 'primary' ? 'text-primary' : stat.color === 'emerald-500' ? 'text-emerald-500' : stat.color === 'destructive' ? 'text-destructive' : 'text-muted-foreground'}`}>{stat.value}</span>
              <span className="text-[10px] font-bold text-muted-foreground/50 pb-1 uppercase italic leading-none">{stat.sub}</span>
            </div>
            <div className={`mt-4 h-1 w-full bg-muted rounded-full overflow-hidden`}>
              <div
                className={`h-full ${stat.color === 'primary' ? 'bg-primary' : stat.color === 'emerald-500' ? 'bg-emerald-500' : stat.color === 'destructive' ? 'bg-destructive' : 'bg-muted-foreground'} opacity-40 transition-all duration-1000`}
                style={{ width: jobs.length ? `${(stat.value / jobs.length) * 100}%` : '0%' }}
              />
            </div>
          </GlassCard>
        ))}
      </div>

      {/* Workspace Controls */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-muted/20 p-2 rounded-2xl border border-border/40 backdrop-blur-sm">
        <div className="relative group flex-1 min-w-[300px]">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-all" />
          <Input
            placeholder="Query mandates by title, ID, or department..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-12 h-12 rounded-xl bg-background/50 border-none focus-visible:ring-2 focus-visible:ring-primary/20 font-medium"
          />
        </div>
        <div className="flex p-1 bg-background/40 rounded-[14px] border border-border/50">
          {['all', 'draft', 'published', 'closed'].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-5 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all ${statusFilter === status
                ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/10'
                : 'text-muted-foreground hover:bg-muted/50'
                }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* Mandate Register (Table) */}
      <GlassCard className="overflow-hidden border-border/30">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-muted/30 border-b border-border/50">
                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Detailed Identity</th>
                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Org Unit</th>
                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground text-center">Status Index</th>
                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground text-center">Velocity</th>
                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Timeline</th>
                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground text-right">Mandate Control</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/20">
              {filteredJobs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-8 py-32 text-center">
                    <div className="flex flex-col items-center opacity-40">
                      <Briefcase className="w-16 h-16 mb-6 stroke-[1]" />
                      <p className="text-xl font-bold tracking-tighter">No strategic mandates identified.</p>
                      <p className="text-xs font-semibold uppercase tracking-widest mt-2">Modify your query or initiate a new requisition.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredJobs.map((job, index) => (
                  <tr key={job.id || job.requisitionId || `job-${index}`} className="group hover:bg-muted/40 transition-all duration-300">
                    <td className="px-8 py-7">
                      <div className="space-y-1">
                        <p className="text-lg font-black text-foreground group-hover:text-primary transition-colors tracking-tighter leading-none">{job.title}</p>
                        <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground tracking-widest uppercase">
                          <span className="text-primary/70">{job.requisitionId}</span>
                          <span className="w-1 h-1 bg-border rounded-full" />
                          <span className="flex items-center gap-1.5"><MapPin className="w-3 h-3" /> {job.location}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-7">
                      <Badge variant="outline" className="bg-muted/20 border-border text-[10px] font-black uppercase tracking-tighter py-1 px-3">
                        {job.department}
                      </Badge>
                    </td>
                    <td className="px-8 py-7 text-center">
                      <StatusBadge status={job.publishStatus} />
                    </td>
                    <td className="px-8 py-7 text-center">
                      <div className="inline-flex flex-col items-center">
                        <span className="text-xl font-black text-foreground leading-none">{job.openings}</span>
                        <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Target</span>
                      </div>
                    </td>
                    <td className="px-8 py-7">
                      <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground">
                        <Calendar className="w-3.5 h-3.5 opacity-40" />
                        {job.postingDate ? (
                          <span className="text-foreground">{new Date(job.postingDate).toLocaleDateString()}</span>
                        ) : (
                          <span className="italic opacity-40 uppercase text-[10px]">Pending Launch</span>
                        )}
                      </div>
                    </td>
                    <td className="px-8 py-7">
                      <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300 -translate-x-2 group-hover:translate-x-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-10 w-10 rounded-xl hover:bg-background shadow-sm border border-transparent hover:border-border transition-all"
                          onClick={() => setSelectedJob(job)}
                          title="Preview mandate"
                        >
                          <Eye className="w-4 h-4 text-muted-foreground" />
                        </Button>
                        {job.publishStatus === 'draft' && (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-10 w-10 rounded-xl hover:bg-background shadow-sm border border-transparent hover:border-border transition-all text-primary"
                              onClick={() => handleEditJob(job)}
                              title="Edit details"
                            >
                              <Edit3 className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="default"
                              size="sm"
                              className="h-10 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-600 font-bold shadow-lg shadow-emerald-500/10 transition-all font-black text-[10px] uppercase tracking-widest"
                              onClick={() => handlePublishJob(job.requisitionId)}
                            >
                              Go Live
                            </Button>
                          </>
                        )}
                        {job.publishStatus === 'published' && (
                          <Button
                            variant="destructive"
                            size="sm"
                            className="h-10 px-4 rounded-xl font-bold font-black bg-red-500 hover:bg-red-600 shadow-lg shadow-red-500/10 transition-all uppercase text-[10px] tracking-widest"
                            onClick={() => handleCloseJob(job.requisitionId)}
                          >
                            Terminate
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </GlassCard>

      {/* Modals */}
      <JobFormModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSubmit={editingJob ? handleUpdateJob : handleCreateJob}
        templates={templates}
        initialData={editingJob ? {
          templateId: editingJob.templateId || '',
          openings: editingJob.openings,
          location: editingJob.location || '',
          expiryDate: editingJob.expiryDate || '',
        } : undefined}
        isEditing={!!editingJob}
        isLoading={isSubmitting}
      />

      {selectedJob && (
        <JobPreviewModal
          job={selectedJob}
          branding={defaultEmployerBranding}
          onClose={() => setSelectedJob(null)}
          onPublish={() => handlePublishJob(selectedJob.requisitionId)}
          onCloseJob={() => handleCloseJob(selectedJob.requisitionId)}
          isPublishing={isPublishing}
        />
      )}
    </div>
  );
}
