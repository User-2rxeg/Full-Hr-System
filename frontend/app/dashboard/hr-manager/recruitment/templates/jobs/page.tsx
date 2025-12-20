'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Button } from '@/app/components/ui/button';
import { Card } from '@/app/components/ui/card';
import { Input } from '@/app/components/ui/input';
import { getJobTemplates, createJobTemplate, updateJobTemplate, deleteJobTemplate } from '@/app/services/recruitment';
import { organizationStructureService } from '@/app/services/organization-structure';
import { JobTemplate as ApiJobTemplate } from '@/app/types/recruitment';

// ==================== INTERFACES ====================
interface JobTemplate {
  id: string;
  title: string;
  department: string;
  description: string;
  qualifications: string; // Display as string, stored as array in DB
  skills: string; // Display as string, stored as array in DB
  createdAt: string;
  updatedAt: string;
}

interface FormData {
  title: string;
  department: string;
  description: string;
  qualifications: string;
  skills: string;
}

interface FormErrors {
  title?: string;
  department?: string;
  description?: string;
  qualifications?: string;
  skills?: string;
}

// ==================== HELPER FUNCTIONS ====================
// Convert array to bullet-point string for display
const arrayToString = (arr: string[] | undefined): string => {
  if (!arr || arr.length === 0) return '';
  return arr.map(item => `• ${item}`).join('\n');
};

// Convert bullet-point string to array for API
const stringToArray = (str: string): string[] => {
  if (!str.trim()) return [];
  return str
    .split('\n')
    .map(line => line.replace(/^[•\-*]\s*/, '').trim())
    .filter(line => line.length > 0);
};

// Transform API response to local format
const transformApiToLocal = (apiTemplate: ApiJobTemplate): JobTemplate => ({
  id: apiTemplate._id || apiTemplate.id,
  title: apiTemplate.title || '',
  department: apiTemplate.department || '',
  description: apiTemplate.description || '',
  qualifications: arrayToString(apiTemplate.qualifications),
  skills: arrayToString(apiTemplate.skills),
  createdAt: apiTemplate.createdAt ? new Date(apiTemplate.createdAt).toLocaleDateString() : '',
  updatedAt: apiTemplate.updatedAt ? new Date(apiTemplate.updatedAt).toLocaleDateString() : '',
});

// Transform local form data to API format
const transformLocalToApi = (formData: FormData) => ({
  title: formData.title,
  department: formData.department,
  description: formData.description || undefined,
  qualifications: stringToArray(formData.qualifications),
  skills: stringToArray(formData.skills),
});

// ==================== MAIN COMPONENT ====================
export default function JobTemplatesPage() {
  const [templates, setTemplates] = useState<JobTemplate[]>([]);
  const [departments, setDepartments] = useState<string[]>([]);
  const [loadingDepartments, setLoadingDepartments] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<JobTemplate | null>(null);
  const [formData, setFormData] = useState<FormData>({
    title: '',
    department: '',
    description: '',
    qualifications: '',
    skills: '',
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [saving, setSaving] = useState(false);
  const [previewTemplate, setPreviewTemplate] = useState<JobTemplate | null>(null);

  // Fetch departments from Organization Structure module (REC-003 integration)
  const fetchDepartments = useCallback(async () => {
    try {
      setLoadingDepartments(true);
      const deptData = await organizationStructureService.getDepartments();
      // Extract department names from the response
      let deptArray: any[] = [];
      if (Array.isArray(deptData)) {
        deptArray = deptData;
      } else if (deptData && typeof deptData === 'object' && Array.isArray(deptData.data)) {
        deptArray = deptData.data;
      }
      const deptNames = deptArray.map((dept: any) => dept.name || dept.departmentName || dept.title).filter(Boolean);
      // Fallback to static list if API returns empty
      setDepartments(deptNames.length > 0 ? deptNames : ['Engineering', 'Product', 'Human Resources', 'Finance', 'Marketing', 'Sales', 'Operations']);
    } catch (err) {
      console.error('Failed to load departments:', err);
      // Fallback to static list on error
      setDepartments(['Engineering', 'Product', 'Human Resources', 'Finance', 'Marketing', 'Sales', 'Operations']);
    } finally {
      setLoadingDepartments(false);
    }
  }, []);

  const fetchTemplates = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const templatesData = await getJobTemplates();
      const transformedTemplates = templatesData.map(transformApiToLocal);
      
      setTemplates(transformedTemplates);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load job templates');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTemplates();
    fetchDepartments();
  }, [fetchTemplates, fetchDepartments]);

  // ==================== VALIDATION (BR-2) ====================
  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Job title is required';
    }
    if (!formData.department.trim()) {
      newErrors.department = 'Department is required';
    }
    if (!formData.qualifications.trim()) {
      newErrors.qualifications = 'Qualifications are required';
    } else if (formData.qualifications.trim().length < 20) {
      newErrors.qualifications = 'Please provide more detailed qualifications (min 20 characters)';
    }
    if (!formData.skills.trim()) {
      newErrors.skills = 'Skills are required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // ==================== HANDLERS ====================
  const handleOpenCreate = () => {
    setEditingTemplate(null);
    setFormData({ title: '', department: '', description: '', qualifications: '', skills: '' });
    setErrors({});
    setShowModal(true);
  };

  const handleOpenEdit = (template: JobTemplate) => {
    setEditingTemplate(template);
    setFormData({
      title: template.title,
      department: template.department,
      description: template.description,
      qualifications: template.qualifications,
      skills: template.skills,
    });
    setErrors({});
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    try {
      setSaving(true);
      setError(null);
      
      const apiData = transformLocalToApi(formData);
      
      if (editingTemplate) {
        // Update existing
        const updated = await updateJobTemplate(editingTemplate.id, apiData);
        const transformedUpdated = transformApiToLocal(updated);
        setTemplates((prev) =>
          prev.map((t) =>
            t.id === editingTemplate.id ? transformedUpdated : t
          )
        );
      } else {
        // Create new
        const newTemplate = await createJobTemplate(apiData);
        const transformedNew = transformApiToLocal(newTemplate);
        setTemplates((prev) => [transformedNew, ...prev]);
      }

      setShowModal(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save template');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this template?')) return;
    
    try {
      setError(null);
      await deleteJobTemplate(id);
      setTemplates((prev) => prev.filter((t) => t.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete template');
    }
  };

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error when user types
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  // ==================== FILTERED TEMPLATES ====================
  const filteredTemplates = templates.filter(
    (t) =>
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.department.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // ==================== RENDER ====================
  return (
    <div className="space-y-6">
      {/* Error Alert */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm text-slate-500 mb-2">
            <Link href="/dashboard/hr-manager/recruitment" className="hover:text-slate-700">
              Recruitment
            </Link>
            <span>/</span>
            <span>Job Templates</span>
          </div>
          <h1 className="text-2xl font-semibold text-slate-900">Job Description Templates</h1>
          <p className="text-sm text-slate-500 mt-1">Create and manage standardized job descriptions (BR-2)</p>
        </div>
        <Button onClick={handleOpenCreate}>
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Create Template
        </Button>
      </div>

      {/* Search */}
      <div className="max-w-md">
        <Input
          placeholder="Search templates..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Templates List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : filteredTemplates.length === 0 ? (
        <Card>
          <div className="text-center py-12">
            <svg className="w-12 h-12 text-slate-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-slate-500">No templates found</p>
            <Button onClick={handleOpenCreate} className="mt-4">
              Create First Template
            </Button>
          </div>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredTemplates.map((template) => (
            <Card key={template.id} className="hover:shadow-md transition-shadow">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h3 className="text-lg font-semibold text-slate-900">{template.title}</h3>
                  </div>
                  <div className="flex flex-wrap gap-4 mt-2 text-sm text-slate-500">
                    <span className="flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                      {template.department || 'No department'}
                    </span>
                    <span className="flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      Updated: {template.updatedAt || 'N/A'}
                    </span>
                  </div>
                  {template.description && (
                    <p className="mt-2 text-sm text-slate-600 line-clamp-2">{template.description}</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setPreviewTemplate(template)}>
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    Preview
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleOpenEdit(template)}>
                    Edit
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(template.id)}>
                    <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/50" onClick={() => setShowModal(false)} />
            <div className="relative bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
              {/* Modal Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
                <h2 className="text-xl font-semibold text-slate-900">
                  {editingTemplate ? 'Edit Job Template' : 'Create Job Template'}
                </h2>
                <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Modal Body */}
              <div className="flex flex-col lg:flex-row max-h-[calc(90vh-130px)] overflow-hidden">
                {/* Form Section */}
                <div className="flex-1 p-6 overflow-y-auto border-r border-slate-200">
                  <div className="space-y-5">
                    <Input
                      placeholder="e.g., Software Engineer"
                      value={formData.title}
                      onChange={(e) => handleInputChange('title', e.target.value)}
                    />
                    {errors.title && (
                      <div className="text-xs text-red-500 mt-1">{errors.title}</div>
                    )}
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Job Title *</label>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">
                        Department *
                      </label>
                      <select
                        className={`w-full px-4 py-3 border rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:border-transparent transition-all ${
                          errors.department
                            ? 'border-red-300 focus:ring-red-500'
                            : 'border-slate-200 focus:ring-blue-500'
                        }`}
                        value={formData.department}
                        onChange={(e) => handleInputChange('department', e.target.value)}
                      >
                        <option value="">Select department</option>
                        {departments.map((dept) => (
                          <option key={dept} value={dept}>
                            {dept}
                          </option>
                        ))}
                      </select>
                      {errors.department && (
                        <p className="mt-1.5 text-sm text-red-600">{errors.department}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">
                        Description
                      </label>
                      <textarea
                        className={`w-full px-4 py-3 border rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:border-transparent transition-all min-h-[80px] ${
                          errors.description
                            ? 'border-red-300 focus:ring-red-500'
                            : 'border-slate-200 focus:ring-blue-500'
                        }`}
                        placeholder="Brief description of the job role and responsibilities..."
                        value={formData.description}
                        onChange={(e) => handleInputChange('description', e.target.value)}
                      />
                      {errors.description && (
                        <p className="mt-1.5 text-sm text-red-600">{errors.description}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">
                        Qualifications *
                      </label>
                      <textarea
                        className={`w-full px-4 py-3 border rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:border-transparent transition-all min-h-[120px] ${
                          errors.qualifications
                            ? 'border-red-300 focus:ring-red-500'
                            : 'border-slate-200 focus:ring-blue-500'
                        }`}
                        placeholder="• Bachelor's degree in Computer Science&#10;• 3+ years of experience&#10;• Strong analytical skills"
                        value={formData.qualifications}
                        onChange={(e) => handleInputChange('qualifications', e.target.value)}
                      />
                      {errors.qualifications && (
                        <p className="mt-1.5 text-sm text-red-600">{errors.qualifications}</p>
                      )}
                      <p className="mt-1.5 text-xs text-slate-400">
                        Use bullet points (•) or new lines for each qualification
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">
                        Skills *
                      </label>
                      <textarea
                        className={`w-full px-4 py-3 border rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:border-transparent transition-all min-h-[120px] ${
                          errors.skills
                            ? 'border-red-300 focus:ring-red-500'
                            : 'border-slate-200 focus:ring-blue-500'
                        }`}
                        placeholder="• JavaScript / TypeScript&#10;• React / Next.js&#10;• Node.js / NestJS"
                        value={formData.skills}
                        onChange={(e) => handleInputChange('skills', e.target.value)}
                      />
                      {errors.skills && (
                        <p className="mt-1.5 text-sm text-red-600">{errors.skills}</p>
                      )}
                      <p className="mt-1.5 text-xs text-slate-400">
                        Use bullet points (•) or new lines for each skill
                      </p>
                    </div>
                  </div>
                </div>

                {/* Preview Section */}
                <div className="flex-1 p-6 bg-slate-50 overflow-y-auto">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-medium text-slate-700">Preview</h3>
                    <span className="text-xs text-slate-500">Live preview</span>
                  </div>
                  <div className="bg-white rounded-lg border border-slate-200 p-5">
                    <h4 className="text-xl font-bold text-slate-900">
                      {formData.title || 'Job Title'}
                    </h4>
                    <div className="flex flex-wrap gap-3 mt-3 text-sm text-slate-600">
                      <span className="flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                        {formData.department || 'Department'}
                      </span>
                    </div>
                    {formData.description && (
                      <p className="mt-3 text-sm text-slate-600">{formData.description}</p>
                    )}
                    <hr className="my-4" />
                    <h5 className="font-semibold text-slate-800 mb-2">Qualifications</h5>
                    <div className="text-sm text-slate-600 whitespace-pre-line mb-4">
                      {formData.qualifications || 'No qualifications specified'}
                    </div>
                    <h5 className="font-semibold text-slate-800 mb-2">Skills</h5>
                    <div className="text-sm text-slate-600 whitespace-pre-line">
                      {formData.skills || 'No skills specified'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200 bg-slate-50">
                <Button variant="outline" onClick={() => setShowModal(false)} disabled={saving}>
                  Cancel
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={saving || !formData.title || !formData.department || !formData.qualifications || !formData.skills}
                >
                  {saving ? 'Saving...' : editingTemplate ? 'Update Template' : 'Create Template'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {previewTemplate && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/50" onClick={() => setPreviewTemplate(null)} />
            <div className="relative bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-hidden">
              {/* Preview Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-blue-600 to-blue-700">
                <div>
                  <h2 className="text-xl font-semibold text-white">{previewTemplate.title}</h2>
                  <p className="text-blue-100 text-sm mt-1">{previewTemplate.department}</p>
                </div>
                <button onClick={() => setPreviewTemplate(null)} className="text-white/80 hover:text-white">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Preview Body */}
              <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
                {/* Description */}
                {previewTemplate.description && (
                  <div className="mb-6">
                    <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-2">Description</h3>
                    <p className="text-slate-700">{previewTemplate.description}</p>
                  </div>
                )}

                {/* Qualifications */}
                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">Qualifications</h3>
                  <div className="bg-slate-50 rounded-lg p-4">
                    <div className="text-slate-700 whitespace-pre-line">
                      {previewTemplate.qualifications || 'No qualifications specified'}
                    </div>
                  </div>
                </div>

                {/* Skills */}
                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">Required Skills</h3>
                  <div className="bg-slate-50 rounded-lg p-4">
                    <div className="text-slate-700 whitespace-pre-line">
                      {previewTemplate.skills || 'No skills specified'}
                    </div>
                  </div>
                </div>

                {/* Meta Info */}
                <div className="flex items-center gap-6 pt-4 border-t border-slate-200 text-sm text-slate-500">
                  <span className="flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    Last updated: {previewTemplate.updatedAt}
                  </span>
                </div>
              </div>

              {/* Preview Footer */}
              <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200 bg-slate-50">
                <Button variant="outline" onClick={() => setPreviewTemplate(null)}>
                  Close
                </Button>
                <Button onClick={() => { setPreviewTemplate(null); handleOpenEdit(previewTemplate); }}>
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Edit Template
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
