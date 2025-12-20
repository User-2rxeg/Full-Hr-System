'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/app/components/ui/button';
import { Card } from '@/app/components/ui/card';
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
  companyName: 'Our Company',
  logo: '/logo-placeholder.png',
  tagline: 'Building the Future Together',
  description: 'We are a leading technology company dedicated to creating innovative solutions.',
  benefits: [
    'Competitive Salary & Bonuses',
    'Health Insurance',
    'Remote Work Options',
    'Learning & Development Budget',
    'Flexible Working Hours',
  ],
  culture: [
    'Innovation First',
    'Collaborative Environment',
    'Work-Life Balance',
    'Diversity & Inclusion',
  ],
};

// =====================================================
// Status Badge Component
// =====================================================

function StatusBadge({ status }: { status: 'draft' | 'published' | 'closed' }) {
  const statusStyles = {
    draft: 'bg-slate-100 text-slate-700 border-slate-200',
    published: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    closed: 'bg-red-50 text-red-700 border-red-200',
  };

  const statusLabels = {
    draft: 'Draft',
    published: 'Published',
    closed: 'Closed',
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${statusStyles[status]}`}>
      {statusLabels[status]}
    </span>
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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-lg w-full p-6">
        <h2 className="text-xl font-bold text-slate-900 mb-4">
          {isEditing ? 'Edit Job Requisition' : 'Create New Job Requisition'}
        </h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Job Template *
            </label>
            <select
              value={formData.templateId}
              onChange={(e) => setFormData({ ...formData, templateId: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              required
              disabled={isEditing}
            >
              <option value="">Select a template...</option>
              {templates.map((template) => (
                <option key={template.id || template._id} value={template.id || template._id}>
                  {template.title} - {template.department}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Number of Openings *
            </label>
            <Input
              type="number"
              min="1"
              value={formData.openings}
              onChange={(e) => setFormData({ ...formData, openings: parseInt(e.target.value) || 1 })}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Location *
            </label>
            <Input
              type="text"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              placeholder="e.g., Cairo, Egypt"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Expiry Date
            </label>
            <Input
              type="date"
              value={formData.expiryDate}
              onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Saving...' : isEditing ? 'Update' : 'Create'}
            </Button>
          </div>
        </form>
      </div>
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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header with Branding */}
        <div className="bg-gradient-to-r from-purple-600 to-purple-800 text-white p-6 rounded-t-xl">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 bg-white rounded-lg flex items-center justify-center">
              <span className="text-purple-600 font-bold text-xl">TC</span>
            </div>
            <div>
              <h2 className="text-xl font-bold">{branding.companyName}</h2>
              <p className="text-purple-200">{branding.tagline}</p>
            </div>
          </div>
          <h1 className="text-2xl font-bold">{job.title || job.templateTitle || 'Position'}</h1>
          <div className="flex flex-wrap gap-4 mt-2 text-sm text-purple-200">
            {job.department && (
              <span className="flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                {job.department}
              </span>
            )}
            {job.location && (
              <span className="flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                </svg>
                {job.location}
              </span>
            )}
            <span className="flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              {job.openings} Opening{job.openings > 1 ? 's' : ''}
            </span>
          </div>
        </div>

        {/* Job Details */}
        <div className="p-6 space-y-6">
          {job.description && (
            <section>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">About the Role</h3>
              <p className="text-slate-600">{job.description}</p>
            </section>
          )}

          {job.qualifications && job.qualifications.length > 0 && (
            <section>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Qualifications</h3>
              <ul className="list-disc list-inside space-y-1">
                {job.qualifications.map((item, idx) => (
                  <li key={idx} className="text-slate-600">{item}</li>
                ))}
              </ul>
            </section>
          )}

          {/* Benefits & Culture */}
          <section className="bg-slate-50 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-slate-900 mb-3">Why Join Us?</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-medium text-slate-800 mb-2">Benefits</h4>
                <ul className="space-y-1">
                  {branding.benefits.map((benefit, idx) => (
                    <li key={idx} className="flex items-center gap-2 text-sm text-slate-600">
                      <svg className="w-4 h-4 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      {benefit}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h4 className="font-medium text-slate-800 mb-2">Our Culture</h4>
                <ul className="space-y-1">
                  {branding.culture.map((item, idx) => (
                    <li key={idx} className="flex items-center gap-2 text-sm text-slate-600">
                      <svg className="w-4 h-4 text-purple-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </section>
        </div>

        {/* Footer Actions */}
        <div className="border-t border-slate-200 p-4 flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          {job.publishStatus === 'draft' && (
            <Button variant="default" onClick={onPublish} disabled={isPublishing}>
              {isPublishing ? 'Publishing...' : 'Publish Job'}
            </Button>
          )}
          {job.publishStatus === 'published' && (
            <Button variant="destructive" onClick={onCloseJob} disabled={isPublishing}>
              {isPublishing ? 'Closing...' : 'Close Job'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

// =====================================================
// Main Page Component - HR Admin Job Management
// Permissions: Create, Update, Publish, Close, View
// =====================================================

export default function HRAdminJobsPage() {
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
          location: job.location || 'Not specified',
          hiringManagerId: job.hiringManagerId || '',
          publishStatus: job.publishStatus || 'draft',
          postingDate: job.postingDate,
          expiryDate: job.expiryDate,
          createdAt: job.createdAt || new Date().toISOString(),
          updatedAt: job.updatedAt || new Date().toISOString(),
          templateTitle: template?.title,
          title: template?.title || 'Untitled Position',
          department: template?.department || 'General',
          description: template?.description,
          qualifications: template?.qualifications,
          applicationCount: 0,
        };
      });

      setJobs(transformedJobs);
      setTemplates(templatesData || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load jobs');
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

  const handleCreateJob = async (data: JobFormData) => {
    if (!user?.id) {
      setError('User not authenticated');
      return;
    }
    
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
      setPublishSuccess('Job requisition created successfully!');
      setTimeout(() => setPublishSuccess(null), 3000);
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create job');
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
      setPublishSuccess('Job requisition updated successfully!');
      setTimeout(() => setPublishSuccess(null), 3000);
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update job');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePublishJob = async (requisitionId: string | undefined) => {
    if (!requisitionId) {
      setError('Cannot publish job: Requisition ID is missing');
      return;
    }
    setIsPublishing(true);
    try {
      await publishJob(requisitionId, true);
      
      setJobs((prev) =>
        prev.map((job) =>
          job.requisitionId === requisitionId
            ? { ...job, publishStatus: 'published' as const, postingDate: new Date().toISOString().split('T')[0] }
            : job
        )
      );
      
      setPublishSuccess('Job published successfully!');
      setSelectedJob(null);
      setTimeout(() => setPublishSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to publish job');
    } finally {
      setIsPublishing(false);
    }
  };

  const handleCloseJob = async (requisitionId: string | undefined) => {
    if (!requisitionId) {
      setError('Cannot close job: Requisition ID is missing');
      return;
    }
    setIsPublishing(true);
    try {
      await closeJob(requisitionId);
      
      setJobs((prev) =>
        prev.map((j) =>
          j.requisitionId === requisitionId ? { ...j, publishStatus: 'closed' as const } : j
        )
      );
      
      setPublishSuccess('Job closed successfully!');
      setSelectedJob(null);
      setTimeout(() => setPublishSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to close job');
    } finally {
      setIsPublishing(false);
    }
  };

  const handleEditJob = (job: JobWithDetails) => {
    setEditingJob(job);
    setIsFormOpen(true);
  };

  const stats = {
    total: jobs.length,
    draft: jobs.filter((j) => j.publishStatus === 'draft').length,
    published: jobs.filter((j) => j.publishStatus === 'published').length,
    closed: jobs.filter((j) => j.publishStatus === 'closed').length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6 flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Job Requisitions</h1>
          <p className="text-slate-600 mt-1">HR Admin - Full access to manage job postings</p>
        </div>
        <Button onClick={() => { setEditingJob(null); setIsFormOpen(true); }}>
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Create New Job
        </Button>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
          <svg className="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
          <span className="text-red-800 font-medium">{error}</span>
          <button onClick={() => setError(null)} className="ml-auto text-red-600 hover:text-red-800">✕</button>
        </div>
      )}

      {publishSuccess && (
        <div className="mb-6 bg-emerald-50 border border-emerald-200 rounded-lg p-4 flex items-center gap-3">
          <svg className="w-5 h-5 text-emerald-600" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          <span className="text-emerald-800 font-medium">{publishSuccess}</span>
        </div>
      )}

      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <p className="text-sm text-slate-600">Total Jobs</p>
          <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <p className="text-sm text-slate-600">Draft</p>
          <p className="text-2xl font-bold text-slate-700">{stats.draft}</p>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <p className="text-sm text-slate-600">Published</p>
          <p className="text-2xl font-bold text-emerald-600">{stats.published}</p>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <p className="text-sm text-slate-600">Closed</p>
          <p className="text-2xl font-bold text-red-600">{stats.closed}</p>
        </div>
      </div>

      <Card className="mb-6">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex-1 min-w-[250px]">
            <Input
              placeholder="Search jobs by title, department, or ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            {['all', 'draft', 'published', 'closed'].map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  statusFilter === status
                    ? 'bg-purple-600 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </Card>

      <Card className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-600 uppercase">Job Details</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-600 uppercase">Department</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-600 uppercase">Status</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-600 uppercase">Openings</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-600 uppercase">Posted Date</th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-slate-600 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredJobs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                    No jobs found matching your criteria.
                  </td>
                </tr>
              ) : (
                filteredJobs.map((job, index) => (
                  <tr key={job.id || job.requisitionId || `job-${index}`} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium text-slate-900">{job.title}</p>
                        <p className="text-sm text-slate-500">{job.requisitionId}</p>
                        <p className="text-sm text-slate-500">{job.location}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4"><span className="text-slate-700">{job.department}</span></td>
                    <td className="px-6 py-4"><StatusBadge status={job.publishStatus} /></td>
                    <td className="px-6 py-4"><span className="text-slate-700">{job.openings}</span></td>
                    <td className="px-6 py-4"><span className="text-slate-700">{job.postingDate || '-'}</span></td>
                    <td className="px-6 py-4">
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={() => setSelectedJob(job)}>View</Button>
                        {job.publishStatus === 'draft' && (
                          <>
                            <Button variant="outline" size="sm" onClick={() => handleEditJob(job)}>Edit</Button>
                            <Button variant="default" size="sm" onClick={() => handlePublishJob(job.requisitionId)}>Publish</Button>
                          </>
                        )}
                        {job.publishStatus === 'published' && (
                          <Button variant="destructive" size="sm" onClick={() => handleCloseJob(job.requisitionId)}>Close</Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

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

      <JobFormModal
        isOpen={isFormOpen}
        onClose={() => { setIsFormOpen(false); setEditingJob(null); }}
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
    </div>
  );
}
