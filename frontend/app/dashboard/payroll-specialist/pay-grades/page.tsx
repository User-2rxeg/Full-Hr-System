"use client";

import { useEffect, useMemo, useState } from "react";
import { payrollConfigurationService } from "@/app/services/payroll-configuration";
import { ConfigStatus } from "@/types/enums";
import type { PayGrade } from "@/types/payroll";
import { useAuth } from "@/context/AuthContext";
import { ThemeCustomizer, ThemeCustomizerTrigger } from '@/components/theme-customizer';
import { X } from 'lucide-react';

// Note: Backend PayGrade currently supports grade, baseSalary, grossSalary, status.
// Department/Position association can be added when backend fields are available.

type CreateForm = {
  grade: string;
  baseSalary: string;
  grossSalary: string;
};

export default function PayGradesPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [showThemeCustomizer, setShowThemeCustomizer] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [form, setForm] = useState<CreateForm>({ grade: "", baseSalary: "", grossSalary: "" });
  const [editForm, setEditForm] = useState<CreateForm>({ grade: "", baseSalary: "", grossSalary: "" });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [items, setItems] = useState<PayGrade[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | ConfigStatus>("all");
  const [selectedGrade, setSelectedGrade] = useState<PayGrade | null>(null);

  function normalize(raw: any): PayGrade {
    return {
      id: raw.id ?? raw._id ?? String(Math.random()),
      grade: raw.grade ?? raw.name ?? raw.title ?? "",
      baseSalary: Number(raw.baseSalary ?? raw.base ?? raw.base_salary ?? 0),
      grossSalary: Number(raw.grossSalary ?? raw.gross ?? raw.gross_salary ?? 0),
      status: raw.status ?? raw.configStatus ?? ConfigStatus.DRAFT,
      createdBy: raw.createdBy ?? raw.creator ?? raw.created_by ?? undefined,
      approvedBy: raw.approvedBy ?? raw.approver ?? raw.approved_by ?? undefined,
      createdAt: raw.createdAt ?? raw.created_at ?? undefined,
      updatedAt: raw.updatedAt ?? raw.updated_at ?? undefined,
    } as PayGrade;
  }

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await payrollConfigurationService.getPayGrades();
      if ((res as any)?.error) {
        throw new Error((res as any).error);
      }

      const data = (res as any)?.data;
      const candidates = [
        data?.payGrades,
        data?.data?.payGrades,
        data?.data,
        data,
        res,
      ];

      const list = candidates.find(Array.isArray) || [];
      setItems(list.map(normalize));
    } catch (e: any) {
      setError(e?.message ?? "Failed to load pay grades");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    if (filter === "all") return items;
    return items.filter((i) => i.status === filter);
  }, [items, filter]);

  const handleCreateClick = () => {
    setForm({ grade: "", baseSalary: "", grossSalary: "" });
    setError(null);
    setShowCreateModal(true);
  };

  const handleEditClick = (pg: PayGrade) => {
    if (pg.status !== ConfigStatus.DRAFT) {
      setError("Only DRAFT pay grades can be edited. Approved or rejected grades cannot be modified.");
      return;
    }

    setEditForm({
      grade: pg.grade ?? "",
      baseSalary: String(pg.baseSalary ?? 0),
      grossSalary: String(pg.grossSalary ?? 0)
    });
    setEditingId(pg.id as string);
    setError(null);
    setShowEditModal(true);
  };

  const handleViewClick = (pg: PayGrade) => {
    setSelectedGrade(pg);
    setShowViewModal(true);
  };

  async function create() {
    if (!form.grade || !form.baseSalary || !form.grossSalary) {
      setError("Please fill all required fields");
      return;
    }

    if (!user?.id) {
      setError("User not authenticated. Please log in again.");
      return;
    }

    // Validate salary values
    const baseSalary = parseFloat(form.baseSalary);
    const grossSalary = parseFloat(form.grossSalary);

    if (isNaN(baseSalary) || baseSalary < 0) {
      setError("Base salary must be a positive number");
      return;
    }

    if (isNaN(grossSalary) || grossSalary < 0) {
      setError("Gross salary must be a positive number");
      return;
    }

    if (grossSalary < baseSalary) {
      setError("Gross salary cannot be less than base salary");
      return;
    }

    setCreating(true);
    setError(null);
    try {
      const payload = {
        grade: form.grade,
        baseSalary: baseSalary,
        grossSalary: grossSalary,
        createdByEmployeeId: user.id,
      };

      const res = await payrollConfigurationService.createPayGrade(payload as any);
      if ((res as any)?.error) {
        throw new Error((res as any).error);
      }

      setSuccess("Pay grade created successfully as DRAFT");
      setShowCreateModal(false);
      setForm({ grade: "", baseSalary: "", grossSalary: "" });
      await load();
    } catch (e: any) {
      setError(e?.message ?? "Failed to create pay grade");
    } finally {
      setCreating(false);
    }
  }

  async function update() {
    if (!editingId || !editForm.grade || !editForm.baseSalary || !editForm.grossSalary) {
      setError("Please fill all required fields");
      return;
    }

    // Validate salary values
    const baseSalary = parseFloat(editForm.baseSalary);
    const grossSalary = parseFloat(editForm.grossSalary);

    if (isNaN(baseSalary) || baseSalary < 0) {
      setError("Base salary must be a positive number");
      return;
    }

    if (isNaN(grossSalary) || grossSalary < 0) {
      setError("Gross salary must be a positive number");
      return;
    }

    if (grossSalary < baseSalary) {
      setError("Gross salary cannot be less than base salary");
      return;
    }

    setUpdating(true);
    setError(null);
    try {
      const payload = {
        grade: editForm.grade,
        baseSalary: baseSalary,
        grossSalary: grossSalary,
      };

      const res = await payrollConfigurationService.updatePayGrade(editingId as any, payload as any);
      if ((res as any)?.error) {
        throw new Error((res as any).error);
      }

      setSuccess("Pay grade updated successfully");
      setShowEditModal(false);
      setEditingId(null);
      setEditForm({ grade: "", baseSalary: "", grossSalary: "" });
      await load();
    } catch (e: any) {
      setError(e?.message ?? "Failed to update pay grade");
    } finally {
      setUpdating(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("Are you sure you want to delete this pay grade? This action cannot be undone.")) return;

    setError(null);
    try {
      const res = await payrollConfigurationService.deletePayGrade(id as any);
      if ((res as any)?.error) {
        throw new Error((res as any).error);
      }
      setSuccess("Pay grade deleted successfully");
      await load();
    } catch (e: any) {
      setError(e?.message ?? "Failed to delete pay grade");
    }
  }

  const getEmployeeDisplayName = (emp: any) => {
    if (!emp) return 'N/A';
    if (typeof emp === 'string') return emp;
    return `${emp.fullName || `${emp.firstName} ${emp.lastName}`.trim()} (${emp.employeeNumber})`;
  };

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return "-";
    try {
      return new Date(dateString).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateString;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const resetForms = () => {
    setForm({ grade: "", baseSalary: "", grossSalary: "" });
    setEditForm({ grade: "", baseSalary: "", grossSalary: "" });
    setEditingId(null);
    setError(null);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Pay Grades Configuration</h1>
            <p className="text-muted-foreground mt-2">Loading pay grades...</p>
          </div>
        </div>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 relative">
      {/* Theme Customizer */}
      <div className="fixed bottom-6 right-6 z-40">
        <ThemeCustomizerTrigger
          onClick={() => setShowThemeCustomizer(true)}
        />
      </div>

      {showThemeCustomizer && (
        <ThemeCustomizer open={showThemeCustomizer} onOpenChange={setShowThemeCustomizer} />
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Pay Grades Configuration</h1>
          <p className="text-muted-foreground mt-2">Define grade names and salary limits, manage drafts and approvals.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={load}
            className="px-4 py-2 border border-input bg-background text-foreground rounded-lg hover:bg-muted transition-all duration-200 font-medium"
          >
            Refresh
          </button>
          <button
            onClick={handleCreateClick}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-all duration-200 font-medium"
          >
            Create Pay Grade
          </button>
        </div>
      </div>

      {/* Success Alert */}
      {success && (
        <div className="bg-success/10 border border-success/20 rounded-lg p-4 flex items-center gap-3">
          <div className="text-success font-bold">✓</div>
          <p className="text-success-foreground font-medium">{success}</p>
          <button
            onClick={() => setSuccess(null)}
            className="ml-auto text-success hover:text-success/80"
          >
            ×
          </button>
        </div>
      )}

      {/* Error Alert */}
      {error && !showCreateModal && !showEditModal && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 flex items-center gap-3">
          <div className="text-destructive font-bold">✕</div>
          <p className="text-destructive-foreground font-medium">{error}</p>
          <button
            onClick={() => setError(null)}
            className="ml-auto text-destructive hover:text-destructive/80"
          >
            ×
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="bg-card rounded-lg border border-border p-4">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <label className="block text-sm font-medium text-muted-foreground mb-2">Filter by Status</label>
            <select
              className="w-full max-w-xs px-4 py-2 border border-input rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-200"
              value={filter}
              onChange={(e) => setFilter(e.target.value as any)}
            >
              <option value="all">All Statuses</option>
              <option value={ConfigStatus.DRAFT}>Draft</option>
              <option value={ConfigStatus.APPROVED}>Approved</option>
              <option value={ConfigStatus.REJECTED}>Rejected</option>
            </select>
          </div>
          <div className="text-sm text-muted-foreground">
            Showing {filtered.length} of {items.length} total pay grades
          </div>
        </div>
      </div>

      {/* Pay Grades Table */}
      <div className="bg-card rounded-lg border border-border shadow-sm">
        <div className="p-6 border-b border-border">
          <h2 className="text-xl font-bold text-foreground">
            Pay Grades ({filtered.length})
          </h2>
        </div>

        {filtered.length === 0 ? (
          <div className="p-12 text-center">
            <div className="text-muted-foreground text-4xl mb-4"></div>
            <p className="text-foreground font-medium">
              {filter !== "all" ? `No ${filter.toLowerCase()} pay grades found` : "No pay grades found"}
            </p>
            <p className="text-muted-foreground text-sm mt-1">
              {filter !== "all" ? "Try selecting a different filter" : "Create your first pay grade to get started"}
            </p>
            {!(filter !== "all") && (
              <button
                onClick={handleCreateClick}
                className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-all duration-200 font-medium"
              >
                Create Pay Grade
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left py-4 px-6 font-semibold text-foreground">Grade Name</th>
                  <th className="text-left py-4 px-6 font-semibold text-foreground">Base Salary</th>
                  <th className="text-left py-4 px-6 font-semibold text-foreground">Gross Salary</th>
                  <th className="text-left py-4 px-6 font-semibold text-foreground">Status</th>
                  <th className="text-left py-4 px-6 font-semibold text-foreground">Created By</th>
                  <th className="text-left py-4 px-6 font-semibold text-foreground">Updated</th>
                  <th className="text-left py-4 px-6 font-semibold text-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((pg) => (
                  <tr key={pg.id} className="border-b border-border hover:bg-muted/10 transition-colors">
                    <td className="py-4 px-6">
                      <span className="font-medium text-foreground">{pg.grade}</span>
                    </td>
                    <td className="py-4 px-6">
                      <span className="tabular-nums text-foreground">{formatCurrency(pg.baseSalary)}</span>
                    </td>
                    <td className="py-4 px-6">
                      <span className="tabular-nums text-foreground">{formatCurrency(pg.grossSalary)}</span>
                    </td>
                    <td className="py-4 px-6">
                      <span className={`
                        inline-flex items-center px-3 py-1 rounded-full text-sm font-medium
                        ${pg.status === ConfigStatus.APPROVED
                          ? 'bg-green-100 text-green-800'
                          : pg.status === ConfigStatus.DRAFT
                            ? 'bg-yellow-100 text-yellow-800'
                            : pg.status === ConfigStatus.REJECTED
                              ? 'bg-red-100 text-red-800'
                              : 'bg-muted/20 text-foreground'
                        }
                      `}>
                        {pg.status}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-foreground text-sm font-medium">
                      {getEmployeeDisplayName(pg.createdBy)}
                    </td>
                    <td className="py-4 px-6 text-foreground">{formatDate(pg.updatedAt)}</td>
                    <td className="py-4 px-6">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleViewClick(pg)}
                          className="px-3 py-1.5 text-sm border border-input bg-background text-foreground rounded-lg hover:bg-muted transition-all duration-200"
                          title="View Details"
                        >
                          View
                        </button>
                        {pg.status === ConfigStatus.DRAFT && (
                          <>
                            <button
                              onClick={() => handleEditClick(pg)}
                              className="px-3 py-1.5 text-sm border border-input bg-background text-foreground rounded-lg hover:bg-muted transition-all duration-200"
                              title="Edit"
                            >
                              Edit
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-card rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto border border-border shadow-xl">
            <div className="p-6 border-b border-border">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-foreground">Create Pay Grade</h3>
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    resetForms();
                  }}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>
            <div className="p-6 space-y-6">
              {/* Show error only inside modal */}
              {error && (
                <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <div className="text-destructive mt-0.5">✕</div>
                    <div>
                      <p className="text-destructive-foreground font-medium">Validation Error</p>
                      <p className="text-destructive/90 text-sm mt-1">{error}</p>
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-2">
                  Grade Name *
                </label>
                <input
                  type="text"
                  value={form.grade}
                  onChange={(e) => setForm({ ...form, grade: e.target.value })}
                  className="w-full px-4 py-2.5 border border-input rounded-lg font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-200"
                  required
                  placeholder="e.g., Senior TA, Junior Developer"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-2">
                  Base Salary *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-muted-foreground">$</span>
                  </div>
                  <input
                    type="number"
                    value={form.baseSalary}
                    onChange={(e) => setForm({ ...form, baseSalary: e.target.value })}
                    className="w-full pl-8 pr-4 py-2.5 border border-input rounded-lg font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-200"
                    required
                    placeholder="0"
                    min="0"
                    step="0.01"
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-2">Minimum guaranteed salary for this grade</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-2">
                  Gross Salary *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-muted-foreground">$</span>
                  </div>
                  <input
                    type="number"
                    value={form.grossSalary}
                    onChange={(e) => setForm({ ...form, grossSalary: e.target.value })}
                    className="w-full pl-8 pr-4 py-2.5 border border-input rounded-lg font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-200"
                    required
                    placeholder="0"
                    min="0"
                    step="0.01"
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-2">Total salary including all allowances and benefits</p>
              </div>

              <div className="bg-primary/5 border border-primary/10 rounded-lg p-4">
                <h5 className="font-semibold text-foreground mb-2">What will be created:</h5>
                <ul className="text-muted-foreground text-sm space-y-1">
                  <li>• <span className="font-semibold">Grade:</span> {form.grade || '[No name]'}</li>
                  <li>• <span className="font-semibold">Base Salary:</span> ${form.baseSalary || '0'}</li>
                  <li>• <span className="font-semibold">Gross Salary:</span> ${form.grossSalary || '0'}</li>
                  <li>• <span className="font-semibold">Status:</span> DRAFT (requires Payroll Manager approval)</li>
                </ul>
              </div>
            </div>
            <div className="p-6 border-t border-border flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  resetForms();
                }}
                className="px-4 py-2.5 border border-input bg-background text-foreground rounded-lg hover:bg-muted transition-all duration-200 font-medium"
              >
                Cancel
              </button>
              <button
                onClick={create}
                disabled={creating || !form.grade || !form.baseSalary || !form.grossSalary}
                className="px-4 py-2.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:bg-muted/40 transition-all duration-200 font-medium"
              >
                {creating ? 'Creating...' : 'Create Draft'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-card rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto border border-border shadow-xl">
            <div className="p-6 border-b border-border">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-foreground">Edit Pay Grade</h3>
                <button
                  onClick={() => {
                    setShowEditModal(false);
                    resetForms();
                  }}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>
            <div className="p-6 space-y-6">
              {/* Show error only inside modal */}
              {error && (
                <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <div className="text-destructive mt-0.5">✕</div>
                    <div>
                      <p className="text-destructive-foreground font-medium">Validation Error</p>
                      <p className="text-destructive/90 text-sm mt-1">{error}</p>
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-2">
                  Grade Name *
                </label>
                <input
                  type="text"
                  value={editForm.grade}
                  onChange={(e) => setEditForm({ ...editForm, grade: e.target.value })}
                  className="w-full px-4 py-2.5 border border-input rounded-lg font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-200"
                  required
                  placeholder="e.g., Senior TA, Junior Developer"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-2">
                  Base Salary *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-muted-foreground">$</span>
                  </div>
                  <input
                    type="number"
                    value={editForm.baseSalary}
                    onChange={(e) => setEditForm({ ...editForm, baseSalary: e.target.value })}
                    className="w-full pl-8 pr-4 py-2.5 border border-input rounded-lg font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-200"
                    required
                    placeholder="0"
                    min="0"
                    step="0.01"
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-2">Minimum guaranteed salary for this grade</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-2">
                  Gross Salary *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-muted-foreground">$</span>
                  </div>
                  <input
                    type="number"
                    value={editForm.grossSalary}
                    onChange={(e) => setEditForm({ ...editForm, grossSalary: e.target.value })}
                    className="w-full pl-8 pr-4 py-2.5 border border-input rounded-lg font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-200"
                    required
                    placeholder="0"
                    min="0"
                    step="0.01"
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-2">Total salary including all allowances and benefits</p>
              </div>

              <div className="bg-primary/5 border border-primary/10 rounded-lg p-4">
                <h5 className="font-semibold text-foreground mb-2">What will be updated:</h5>
                <ul className="text-muted-foreground text-sm space-y-1">
                  <li>• <span className="font-semibold">Grade:</span> {editForm.grade || '[No name]'}</li>
                  <li>• <span className="font-semibold">Base Salary:</span> ${editForm.baseSalary || '0'}</li>
                  <li>• <span className="font-semibold">Gross Salary:</span> ${editForm.grossSalary || '0'}</li>
                  <li>• <span className="font-semibold">Status:</span> DRAFT (remains draft after editing)</li>
                </ul>
              </div>
            </div>
            <div className="p-6 border-t border-border flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowEditModal(false);
                  resetForms();
                }}
                className="px-4 py-2.5 border border-input bg-background text-foreground rounded-lg hover:bg-muted transition-all duration-200 font-medium"
              >
                Cancel
              </button>
              <button
                onClick={update}
                disabled={updating || !editForm.grade || !editForm.baseSalary || !editForm.grossSalary}
                className="px-4 py-2.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:bg-muted/40 transition-all duration-200 font-medium"
              >
                {updating ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Modal */}
      {showViewModal && selectedGrade && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-card rounded-lg max-w-lg w-full border border-border shadow-xl">
            <div className="p-6 border-b border-border">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-foreground mb-2">Pay Grade Details</h3>
                </div>
                <button
                  onClick={() => setShowViewModal(false)}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>
            <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
              <div>
                <h4 className="text-lg font-bold text-foreground mb-2">{selectedGrade.grade}</h4>
                <span className={`
                  inline-flex items-center px-3 py-1 rounded-full text-sm font-medium
                  ${selectedGrade.status === ConfigStatus.APPROVED
                    ? 'bg-green-100 text-green-800'
                    : selectedGrade.status === ConfigStatus.DRAFT
                      ? 'bg-yellow-100 text-yellow-800'
                      : selectedGrade.status === ConfigStatus.REJECTED
                        ? 'bg-red-100 text-red-800'
                        : 'bg-muted/20 text-foreground'
                  }
                `}>
                  {selectedGrade.status}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Base Salary</p>
                  <p className="font-medium text-foreground text-2xl">{formatCurrency(selectedGrade.baseSalary)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Gross Salary</p>
                  <p className="font-medium text-foreground text-2xl">{formatCurrency(selectedGrade.grossSalary)}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <p className="font-medium text-foreground">{selectedGrade.status}</p>
                </div>
                {selectedGrade.createdAt && (
                  <div>
                    <p className="text-sm text-muted-foreground">Created</p>
                    <p className="font-medium text-foreground">{formatDate(selectedGrade.createdAt)}</p>
                  </div>
                )}
                {selectedGrade.updatedAt && (
                  <div>
                    <p className="text-sm text-muted-foreground">Last Modified</p>
                    <p className="font-medium text-foreground">{formatDate(selectedGrade.updatedAt)}</p>
                  </div>
                )}
                <div>
                  <p className="text-sm text-muted-foreground">Created By</p>
                  <p className="font-medium text-foreground">
                    {getEmployeeDisplayName(selectedGrade.createdBy)}
                  </p>
                </div>
              </div>

              {(selectedGrade.status === ConfigStatus.APPROVED || selectedGrade.status === ConfigStatus.REJECTED) && selectedGrade.approvedBy && (
                <div className="bg-muted/10 border border-border rounded-lg p-4">
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">
                        {selectedGrade.status === ConfigStatus.REJECTED ? 'Rejected By' : 'Approved By'}
                      </p>
                      <p className="font-medium text-foreground">
                        {getEmployeeDisplayName(selectedGrade.approvedBy)}
                      </p>
                    </div>
                    {selectedGrade.updatedAt && (
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">
                          {selectedGrade.status === ConfigStatus.REJECTED ? 'Rejected At' : 'Approved At'}
                        </p>
                        <p className="font-medium text-foreground">
                          {formatDate(selectedGrade.updatedAt)}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
            <div className="p-6 border-t border-border flex justify-end">
              <button
                onClick={() => setShowViewModal(false)}
                className="px-4 py-2.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-all duration-200 font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Information Box */}
      <div className="bg-muted/10 border border-border rounded-lg p-6">
        <h3 className="font-semibold text-foreground mb-3">Payroll Specialist Information</h3>
        <ul className="text-muted-foreground text-sm space-y-2">
          <li>• As a Payroll Specialist, you can <span className="font-semibold text-primary">create draft</span> pay grades</li>
          <li>• You can <span className="font-semibold text-primary">edit draft</span> pay grades only (not approved or rejected ones)</li>
          <li>• You can <span className="font-semibold text-primary">delete draft</span> pay grades</li>
          <li>• You can <span className="font-semibold text-primary">view all</span> pay grades (draft, approved, rejected)</li>
          <li>• Drafts require Payroll Manager approval before they become active</li>
          <li>• Approved and rejected pay grades cannot be edited</li>
          <li>• <span className="font-semibold">Base Salary:</span> Minimum guaranteed salary for this grade</li>
          <li>• <span className="font-semibold">Gross Salary:</span> Total salary including all allowances and benefits</li>
        </ul>
      </div>
    </div>
  );
}