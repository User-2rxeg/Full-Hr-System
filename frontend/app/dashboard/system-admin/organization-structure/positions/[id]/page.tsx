'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { organizationStructureService } from '@/app/services/organization-structure';
import { payrollConfigurationService } from '@/app/services/payroll-configuration';
import RoleGuard from '@/app/components/RoleGuard';
import { SystemRole } from '@/app/context/AuthContext';

/**
 * Create/Edit Position - System Admin
 * REQ-OSM-01: Define and create positions
 * REQ-OSM-02: Update existing positions
 * BR 10: Position must have Job Key, Pay Grade, Dept ID
 */

interface Department {
  _id: string;
  name: string;
  code: string;
}

interface Position {
  _id: string;
  title: string;
  code: string;
  departmentId?: { _id: string; name?: string } | string;
}

interface PayGrade {
  _id: string;
  name?: string;
  grade?: string;
  code?: string;
  status?: string;
}

export default function PositionFormPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;
  const isNew = id === 'new';

  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [departments, setDepartments] = useState<Department[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [payGrades, setPayGrades] = useState<PayGrade[]>([]);
  const [isTopRole, setIsTopRole] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    code: '',
    departmentId: '',
    reportsToPositionId: '',
    payGradeId: '',
    jobKey: '',
    costCenter: '',
    jobDescription: '',
    requirements: '',
    minSalary: '',
    maxSalary: '',
  });

  useEffect(() => {
    fetchDependencies();
    if (!isNew && id) {
      fetchPosition();
    }
  }, [id, isNew]);

  const fetchDependencies = async () => {
    try {
      const [deptRes, posRes, payGradeRes] = await Promise.all([
        organizationStructureService.getDepartments(true),
        organizationStructureService.getPositions(undefined, true),
        payrollConfigurationService.getPayGrades('APPROVED'),
      ]);

      if (deptRes.data) setDepartments(Array.isArray(deptRes.data) ? deptRes.data as Department[] : []);
      if (posRes.data) setPositions(Array.isArray(posRes.data) ? posRes.data as Position[] : []);
      if (payGradeRes.data) setPayGrades(Array.isArray(payGradeRes.data) ? payGradeRes.data as PayGrade[] : []);
    } catch (err) {
      console.error('Failed to load dependencies:', err);
    }
  };

  const fetchPosition = async () => {
    try {
      setLoading(true);
      const res = await organizationStructureService.getPositionById(id);
      if (res.data) {
        const pos = res.data as any;
        setFormData({
          title: pos.title || '',
          code: pos.code || '',
          departmentId: pos.departmentId?._id || '',
          reportsToPositionId: pos.reportsToPositionId?._id || '',
          payGradeId: pos.payGradeId || pos.payGrade?._id || '',
          jobKey: pos.jobKey || '',
          costCenter: pos.costCenter || '',
          jobDescription: pos.jobDescription || '',
          requirements: pos.requirements || '',
          minSalary: pos.minSalary?.toString() || '',
          maxSalary: pos.maxSalary?.toString() || '',
        });
        setIsTopRole(!pos.reportsToPositionId);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load position');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim() || !formData.code.trim() || !formData.departmentId) {
      setError('Title, Code, and Department are required (BR 10)');
      return;
    }

    if (!formData.jobKey.trim()) {
      setError('Job Key is required (BR 10)');
      return;
    }

    if (!formData.payGradeId) {
      setError('Pay Grade is required (BR 10)');
      return;
    }

    if (!formData.costCenter.trim()) {
      setError('Cost Center is required (BR 30)');
      return;
    }

    if (!isTopRole && !formData.reportsToPositionId) {
      setError('Reporting manager is required unless this is a top-level role (BR 30)');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const payload = {
        title: formData.title.trim(),
        code: formData.code.trim().toUpperCase(),
        departmentId: formData.departmentId,
        reportsToPositionId: isTopRole ? undefined : (formData.reportsToPositionId || undefined),
        payGradeId: formData.payGradeId,
        jobKey: formData.jobKey.trim(),
        costCenter: formData.costCenter.trim(),
        jobDescription: formData.jobDescription.trim() || undefined,
        requirements: formData.requirements.trim() || undefined,
        minSalary: formData.minSalary ? parseFloat(formData.minSalary) : undefined,
        maxSalary: formData.maxSalary ? parseFloat(formData.maxSalary) : undefined,
      };

      if (isNew) {
        await organizationStructureService.createPosition(payload);
      } else {
        await organizationStructureService.updatePosition(id, payload);
      }

      router.push('/dashboard/system-admin/organization-structure');
    } catch (err: any) {
      setError(err.message || 'Failed to save position');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <RoleGuard allowedRoles={[SystemRole.SYSTEM_ADMIN, SystemRole.HR_ADMIN, SystemRole.HR_MANAGER]}>
        <div className="p-6 lg:p-8 bg-background min-h-screen">
          <div className="max-w-2xl mx-auto">
            <div className="animate-pulse space-y-6">
              <div className="h-8 bg-muted rounded w-1/3"></div>
              <div className="bg-card rounded-xl h-96"></div>
            </div>
          </div>
        </div>
      </RoleGuard>
    );
  }

  return (
    <RoleGuard allowedRoles={[SystemRole.SYSTEM_ADMIN, SystemRole.HR_ADMIN, SystemRole.HR_MANAGER]}>
      <div className="p-6 lg:p-8 bg-background min-h-screen">
        <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard/system-admin/organization-structure"
            className="p-2 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              {isNew ? 'Create Position' : 'Edit Position'}
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              {isNew ? 'REQ-OSM-01: Define and create positions' : 'REQ-OSM-02: Update existing positions'}
            </p>
          </div>
        </div>

        {error && (
          <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-card border border-border rounded-xl">
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Position Title <span className="text-destructive">*</span>
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="e.g., Senior Software Engineer"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Position Code <span className="text-destructive">*</span>
                </label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary font-mono"
                  placeholder="e.g., SSE-001"
                  required
                />
                <p className="text-xs text-muted-foreground mt-1">Unique identifier (BR 5)</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Job Key <span className="text-destructive">*</span>
                </label>
                <input
                  type="text"
                  value={formData.jobKey}
                  onChange={(e) => setFormData({ ...formData, jobKey: e.target.value })}
                  className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="e.g., JOB-ENG-IC3"
                  required
                />
                <p className="text-xs text-muted-foreground mt-1">Required (BR 10)</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Cost Center <span className="text-destructive">*</span>
                </label>
                <input
                  type="text"
                  value={formData.costCenter}
                  onChange={(e) => setFormData({ ...formData, costCenter: e.target.value })}
                  className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="e.g., CC-TECH-001"
                  required
                />
                <p className="text-xs text-muted-foreground mt-1">Required (BR 30)</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Department <span className="text-destructive">*</span>
                </label>
                <select
                  value={formData.departmentId}
                  onChange={(e) => setFormData({ ...formData, departmentId: e.target.value })}
                  className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  required
                >
                  <option value="">Select department</option>
                  {departments.map((dept) => (
                    <option key={dept._id} value={dept._id}>{dept.name}</option>
                  ))}
                </select>
                <p className="text-xs text-muted-foreground mt-1">Required (BR 10)</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Reports To
                </label>
                <div className="flex items-center gap-3 mb-2">
                  <input
                    id="is-top-role"
                    type="checkbox"
                    checked={isTopRole}
                    onChange={(e) => {
                      setIsTopRole(e.target.checked);
                      if (e.target.checked) setFormData({ ...formData, reportsToPositionId: '' });
                    }}
                    className="h-4 w-4 border-border rounded"
                  />
                  <label htmlFor="is-top-role" className="text-sm text-foreground">This is a top-level/head position</label>
                </div>
                <select
                  value={formData.reportsToPositionId}
                  onChange={(e) => setFormData({ ...formData, reportsToPositionId: e.target.value })}
                  className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  disabled={isTopRole}
                >
                  <option value="">None (Top-level)</option>
                  {positions
                    .filter(p => p._id !== id && (!formData.departmentId || (p as any).departmentId?._id === formData.departmentId || (p as any).departmentId === formData.departmentId))
                    .map((pos) => (
                      <option key={pos._id} value={pos._id}>{pos.title}</option>
                    ))}
                </select>
                <p className="text-xs text-muted-foreground mt-1">Reporting Manager (BR 30)</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Pay Grade
                </label>
                <select
                  value={formData.payGradeId}
                  onChange={(e) => setFormData({ ...formData, payGradeId: e.target.value })}
                  className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  required
                >
                  <option value="">Select pay grade</option>
                  {payGrades.map((pg) => (
                    <option key={pg._id} value={pg._id}>
                      {pg.code || pg.grade || pg.name || 'Unnamed'}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-muted-foreground mt-1">Required (BR 10)</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Min Salary
                </label>
                <input
                  type="number"
                  value={formData.minSalary}
                  onChange={(e) => setFormData({ ...formData, minSalary: e.target.value })}
                  className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="e.g., 50000"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Max Salary
                </label>
                <input
                  type="number"
                  value={formData.maxSalary}
                  onChange={(e) => setFormData({ ...formData, maxSalary: e.target.value })}
                  className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="e.g., 80000"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Job Description
              </label>
              <textarea
                value={formData.jobDescription}
                onChange={(e) => setFormData({ ...formData, jobDescription: e.target.value })}
                className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary min-h-[100px]"
                placeholder="Responsibilities and duties for this position"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Requirements
              </label>
              <textarea
                value={formData.requirements}
                onChange={(e) => setFormData({ ...formData, requirements: e.target.value })}
                className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary min-h-[100px]"
                placeholder="Qualifications and skills required"
              />
            </div>
          </div>

          <div className="px-6 py-4 border-t border-border flex items-center justify-end gap-3">
            <Link
              href="/dashboard/system-admin/organization-structure"
              className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {saving ? 'Saving...' : (isNew ? 'Create Position' : 'Update Position')}
            </button>
          </div>
        </form>
      </div>
    </div>
    </RoleGuard>
  );
}

