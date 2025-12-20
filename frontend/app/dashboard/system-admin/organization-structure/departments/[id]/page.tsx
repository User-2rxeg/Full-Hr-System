'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { organizationStructureService } from '@/app/services/organization-structure';
import { employeeProfileService } from '@/app/services/employee-profile';
import RoleGuard from '@/app/components/RoleGuard';
import { SystemRole } from '@/app/context/AuthContext';

/**
 * Create/Edit Department - System Admin
 * REQ-OSM-01: Define and create departments
 * REQ-OSM-02: Update existing departments
 */

interface Department {
  _id: string;
  name: string;
  code: string;
}

interface Employee {
  _id: string;
  firstName: string;
  lastName: string;
  employeeNumber: string;
}

export default function DepartmentFormPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;
  const isNew = id === 'new';

  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [departments, setDepartments] = useState<Department[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);

  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    parentDepartmentId: '',
    headOfDepartmentId: '',
    costCenter: '',
  });

  useEffect(() => {
    fetchDependencies();
    if (!isNew && id) {
      fetchDepartment();
    }
  }, [id, isNew]);

  const fetchDependencies = async () => {
    try {
      const [deptRes, empRes] = await Promise.all([
        organizationStructureService.getDepartments(true),
        employeeProfileService.getTeamProfiles(),
      ]);

      if (deptRes.data) setDepartments(Array.isArray(deptRes.data) ? deptRes.data as Department[] : []);
      if (empRes.data) setEmployees(Array.isArray(empRes.data) ? empRes.data as Employee[] : []);
    } catch (err) {
      console.error('Failed to load dependencies:', err);
    }
  };

  const fetchDepartment = async () => {
    try {
      setLoading(true);
      const res = await organizationStructureService.getDepartmentById(id);
      if (res.data) {
        const dept = res.data as any;
        setFormData({
          name: dept.name || '',
          code: dept.code || '',
          description: dept.description || '',
          parentDepartmentId: dept.parentDepartmentId?._id || '',
          headOfDepartmentId: dept.headOfDepartmentId?._id || '',
          costCenter: dept.costCenter || '',
        });
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load department');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim() || !formData.code.trim()) {
      setError('Name and Code are required');
      return;
    }

    if (!formData.costCenter.trim()) {
      setError('Cost Center is required (BR 30)');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const payload = {
        name: formData.name.trim(),
        code: formData.code.trim().toUpperCase(),
        description: formData.description.trim() || undefined,
        parentDepartmentId: formData.parentDepartmentId || undefined,
        headOfDepartmentId: formData.headOfDepartmentId || undefined,
        costCenter: formData.costCenter.trim() || undefined,
      };

      if (isNew) {
        await organizationStructureService.createDepartment(payload);
      } else {
        await organizationStructureService.updateDepartment(id, payload);
      }

      router.push('/dashboard/system-admin/organization-structure');
    } catch (err: any) {
      setError(err.message || 'Failed to save department');
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
              {isNew ? 'Create Department' : 'Edit Department'}
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              {isNew ? 'REQ-OSM-01: Define and create departments' : 'REQ-OSM-02: Update existing departments'}
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
                  Department Name <span className="text-destructive">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="e.g., Human Resources"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Department Code <span className="text-destructive">*</span>
                </label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary font-mono"
                  placeholder="e.g., HR"
                  required
                />
                <p className="text-xs text-muted-foreground mt-1">Unique identifier (BR 5)</p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary min-h-[100px]"
                placeholder="Brief description of the department"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Parent Department
                </label>
                <select
                  value={formData.parentDepartmentId}
                  onChange={(e) => setFormData({ ...formData, parentDepartmentId: e.target.value })}
                  className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">None (Top-level)</option>
                  {departments
                    .filter(d => d._id !== id)
                    .map((dept) => (
                      <option key={dept._id} value={dept._id}>{dept.name}</option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Head of Department
                </label>
                <select
                  value={formData.headOfDepartmentId}
                  onChange={(e) => setFormData({ ...formData, headOfDepartmentId: e.target.value })}
                  className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">Select employee</option>
                  {employees.map((emp) => (
                    <option key={emp._id} value={emp._id}>
                      {emp.firstName} {emp.lastName} ({emp.employeeNumber})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Cost Center
              </label>
              <input
                type="text"
                value={formData.costCenter}
                onChange={(e) => setFormData({ ...formData, costCenter: e.target.value })}
                className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="e.g., CC-HR-001"
                required
              />
              <p className="text-xs text-muted-foreground mt-1">Required for payroll linkage (BR 30)</p>
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
              {saving ? 'Saving...' : (isNew ? 'Create Department' : 'Update Department')}
            </button>
          </div>
        </form>
      </div>
    </div>
    </RoleGuard>
  );
}

