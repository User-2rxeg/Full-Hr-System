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
  qualifications?: string[];
}

interface EmployerBranding {
  companyName: string;
  tagline: string;
  benefits: string[];
  culture: string[];
}

const defaultEmployerBranding: EmployerBranding = {
  companyName: 'Our Company',
  tagline: 'Building the Future Together',
  benefits: ['Competitive Salary', 'Health Insurance', 'Remote Work', 'Learning Budget', 'Flexible Hours'],
  culture: ['Innovation First', 'Collaborative', 'Work-Life Balance', 'Diversity & Inclusion'],
};

// =====================================================
// Components
// =====================================================

function StatusBadge({ status }: { status: 'draft' | 'published' | 'closed' }) {
  const styles = {
    draft: 'bg-slate-100 text-slate-700 border-slate-200',
    published: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    closed: 'bg-red-50 text-red-700 border-red-200',
  };
  const labels = { draft: 'Draft', published: 'Published', closed: 'Closed' };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${styles[status]}`}>
      {labels[status]}
    </span>
  );
}

interface JobFormData {
  templateId: string;
  openings: number;
  location: string;
  expiryDate: string;
}

function JobFormModal({
  isOpen, onClose, onSubmit, templates, initialData, isEditing, isLoading,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: JobFormData) => Promise<void>;
  templates: JobTemplate[];
  initialData?: JobFormData;
  isEditing: boolean;
  isLoading: boolean;
}) {
  const [formData, setFormData] = useState<JobFormData>(initialData || { templateId: '', openings: 1, location: '', expiryDate: '' });

  useEffect(() => {
    setFormData(initialData || { templateId: '', openings: 1, location: '', expiryDate: '' });
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-lg w-full p-6">
        <h2 className="text-xl font-bold text-slate-900 mb-4">{isEditing ? 'Edit Job' : 'Create New Job'}</h2>
        <form onSubmit={async (e) => { e.preventDefault(); await onSubmit(formData); }} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Job Template *</label>
            <select
              value={formData.templateId}
              onChange={(e) => setFormData({ ...formData, templateId: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500"
              required
              disabled={isEditing}
            >
              <option value="">Select a template...</option>
              {templates.map((t) => (
                <option key={t.id || t._id} value={t.id || t._id}>{t.title} - {t.department}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Openings *</label>
            <Input type="number" min="1" value={formData.openings} onChange={(e) => setFormData({ ...formData, openings: parseInt(e.target.value) || 1 })} required />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Location *</label>
            <Input value={formData.location} onChange={(e) => setFormData({ ...formData, location: e.target.value })} placeholder="Cairo, Egypt" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Expiry Date</label>
            <Input type="date" value={formData.expiryDate} onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })} />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>Cancel</Button>
            <Button type="submit" disabled={isLoading}>{isLoading ? 'Saving...' : isEditing ? 'Update' : 'Create'}</Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function JobPreviewModal({
  job, branding, onClose, onPublish, onCloseJob, isPublishing,
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
        <div className="bg-gradient-to-r from-slate-700 to-slate-900 text-white p-6 rounded-t-xl">
          <h2 className="text-xl font-bold">{branding.companyName}</h2>
          <p className="text-slate-300">{branding.tagline}</p>
          <h1 className="text-2xl font-bold mt-4">{job.title || 'Position'}</h1>
          <p className="text-slate-300 mt-2">{job.department} • {job.location} • {job.openings} Opening{job.openings > 1 ? 's' : ''}</p>
        </div>
        <div className="p-6 space-y-4">
          {job.description && <div><h3 className="font-semibold mb-2">About the Role</h3><p className="text-slate-600">{job.description}</p></div>}
          {job.qualifications?.length && (
            <div>
              <h3 className="font-semibold mb-2">Qualifications</h3>
              <ul className="list-disc list-inside text-slate-600">{job.qualifications.map((q, i) => <li key={i}>{q}</li>)}</ul>
            </div>
          )}
          <div className="bg-slate-50 rounded-lg p-4">
            <h3 className="font-semibold mb-2">Benefits</h3>
            <div className="flex flex-wrap gap-2">{branding.benefits.map((b, i) => <span key={i} className="bg-slate-200 text-slate-800 px-2 py-1 rounded text-sm">{b}</span>)}</div>
          </div>
        </div>
        <div className="border-t p-4 flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>Close</Button>
          {job.publishStatus === 'draft' && <Button onClick={onPublish} disabled={isPublishing}>{isPublishing ? 'Publishing...' : 'Publish'}</Button>}
          {job.publishStatus === 'published' && <Button variant="destructive" onClick={onCloseJob} disabled={isPublishing}>{isPublishing ? 'Closing...' : 'Close Job'}</Button>}
        </div>
      </div>
    </div>
  );
}

// =====================================================
// Main Page - System Admin Job Management
// =====================================================

export default function SystemAdminJobsPage() {
  const { user } = useAuth();
  const [jobs, setJobs] = useState<JobWithDetails[]>([]);
  const [templates, setTemplates] = useState<JobTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedJob, setSelectedJob] = useState<JobWithDetails | null>(null);
  const [isPublishing, setIsPublishing] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingJob, setEditingJob] = useState<JobWithDetails | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [jobsData, templatesData] = await Promise.all([getJobs(), getJobTemplates()]);
      
      const transformed: JobWithDetails[] = (jobsData || []).map((job: JobRequisition & { _id?: string }) => {
        const template = templatesData.find((t: JobTemplate & { _id?: string }) => (t.id || t._id) === job.templateId);
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
          title: template?.title || 'Untitled',
          department: template?.department || 'General',
          description: template?.description,
          qualifications: template?.qualifications,
        };
      });
      
      setJobs(transformed);
      setTemplates(templatesData || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load jobs');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filteredJobs = jobs.filter((job) => {
    const matchesSearch = (job.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (job.department || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.requisitionId.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch && (statusFilter === 'all' || job.publishStatus === statusFilter);
  });

  const handleCreateJob = async (data: JobFormData) => {
    if (!user?.id) { setError('User not authenticated'); return; }
    setIsSubmitting(true);
    try {
      await createJob({ templateId: data.templateId, openings: data.openings, location: data.location, hiringManagerId: user.id, expiryDate: data.expiryDate || undefined });
      setIsFormOpen(false);
      setSuccessMsg('Job created!');
      setTimeout(() => setSuccessMsg(null), 3000);
      await fetchData();
    } catch (err) { setError(err instanceof Error ? err.message : 'Failed to create job'); }
    finally { setIsSubmitting(false); }
  };

  const handleUpdateJob = async (data: JobFormData) => {
    if (!editingJob?.requisitionId) return;
    setIsSubmitting(true);
    try {
      await updateJob(editingJob.requisitionId, { openings: data.openings, location: data.location, expiryDate: data.expiryDate || undefined });
      setIsFormOpen(false);
      setEditingJob(null);
      setSuccessMsg('Job updated!');
      setTimeout(() => setSuccessMsg(null), 3000);
      await fetchData();
    } catch (err) { setError(err instanceof Error ? err.message : 'Failed to update job'); }
    finally { setIsSubmitting(false); }
  };

  const handlePublishJob = async (requisitionId?: string) => {
    if (!requisitionId) { setError('Missing requisition ID'); return; }
    setIsPublishing(true);
    try {
      await publishJob(requisitionId, true);
      setJobs(prev => prev.map(j => j.requisitionId === requisitionId ? { ...j, publishStatus: 'published' as const } : j));
      setSuccessMsg('Job published!');
      setSelectedJob(null);
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err) { setError(err instanceof Error ? err.message : 'Failed to publish'); }
    finally { setIsPublishing(false); }
  };

  const handleCloseJob = async (requisitionId?: string) => {
    if (!requisitionId) { setError('Missing requisition ID'); return; }
    setIsPublishing(true);
    try {
      await closeJob(requisitionId);
      setJobs(prev => prev.map(j => j.requisitionId === requisitionId ? { ...j, publishStatus: 'closed' as const } : j));
      setSuccessMsg('Job closed!');
      setSelectedJob(null);
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err) { setError(err instanceof Error ? err.message : 'Failed to close'); }
    finally { setIsPublishing(false); }
  };

  const stats = {
    total: jobs.length,
    draft: jobs.filter(j => j.publishStatus === 'draft').length,
    published: jobs.filter(j => j.publishStatus === 'published').length,
    closed: jobs.filter(j => j.publishStatus === 'closed').length,
  };

  if (loading) return <div className="flex items-center justify-center min-h-[400px]"><LoadingSpinner size="lg" /></div>;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6 flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Job Requisitions</h1>
          <p className="text-slate-600 mt-1">System Administrator - Full Access</p>
        </div>
        <Button onClick={() => { setEditingJob(null); setIsFormOpen(true); }}>
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          Create Job
        </Button>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
          <span className="text-red-800">{error}</span>
          <button onClick={() => setError(null)} className="ml-auto text-red-600">✕</button>
        </div>
      )}

      {successMsg && (
        <div className="mb-6 bg-emerald-50 border border-emerald-200 rounded-lg p-4">
          <span className="text-emerald-800">{successMsg}</span>
        </div>
      )}

      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg border p-4"><p className="text-sm text-slate-600">Total</p><p className="text-2xl font-bold">{stats.total}</p></div>
        <div className="bg-white rounded-lg border p-4"><p className="text-sm text-slate-600">Draft</p><p className="text-2xl font-bold text-slate-700">{stats.draft}</p></div>
        <div className="bg-white rounded-lg border p-4"><p className="text-sm text-slate-600">Published</p><p className="text-2xl font-bold text-emerald-600">{stats.published}</p></div>
        <div className="bg-white rounded-lg border p-4"><p className="text-sm text-slate-600">Closed</p><p className="text-2xl font-bold text-red-600">{stats.closed}</p></div>
      </div>

      <Card className="mb-6">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex-1 min-w-[250px]">
            <Input placeholder="Search jobs..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>
          <div className="flex gap-2">
            {['all', 'draft', 'published', 'closed'].map((s) => (
              <button key={s} onClick={() => setStatusFilter(s)} className={`px-4 py-2 rounded-lg text-sm font-medium ${statusFilter === s ? 'bg-slate-700 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}>
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </Card>

      <Card className="p-0">
        <table className="w-full">
          <thead className="bg-slate-50 border-b">
            <tr>
              <th className="text-left px-6 py-3 text-xs font-semibold text-slate-600 uppercase">Job</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-slate-600 uppercase">Department</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-slate-600 uppercase">Status</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-slate-600 uppercase">Openings</th>
              <th className="text-right px-6 py-3 text-xs font-semibold text-slate-600 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filteredJobs.length === 0 ? (
              <tr><td colSpan={5} className="px-6 py-12 text-center text-slate-500">No jobs found.</td></tr>
            ) : (
              filteredJobs.map((job, i) => (
                <tr key={job.id || job.requisitionId || `job-${i}`} className="hover:bg-slate-50">
                  <td className="px-6 py-4">
                    <p className="font-medium">{job.title}</p>
                    <p className="text-sm text-slate-500">{job.requisitionId} • {job.location}</p>
                  </td>
                  <td className="px-6 py-4">{job.department}</td>
                  <td className="px-6 py-4"><StatusBadge status={job.publishStatus} /></td>
                  <td className="px-6 py-4">{job.openings}</td>
                  <td className="px-6 py-4">
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" size="sm" onClick={() => setSelectedJob(job)}>View</Button>
                      {job.publishStatus === 'draft' && (
                        <>
                          <Button variant="outline" size="sm" onClick={() => { setEditingJob(job); setIsFormOpen(true); }}>Edit</Button>
                          <Button size="sm" onClick={() => handlePublishJob(job.requisitionId)}>Publish</Button>
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
        initialData={editingJob ? { templateId: editingJob.templateId || '', openings: editingJob.openings, location: editingJob.location || '', expiryDate: editingJob.expiryDate || '' } : undefined}
        isEditing={!!editingJob}
        isLoading={isSubmitting}
      />
    </div>
  );
}
