"use client";

import { useEffect, useMemo, useState } from "react";
import { payrollConfigurationService } from "@/app/services/payroll-configuration";
import { ConfigStatus } from "@/types/enums";
import { useAuth } from "@/context/AuthContext";

interface InsuranceBracket {
  id: string;
  name: string;
  minSalary: number;
  maxSalary: number;
  employeeRate: number;
  employerRate: number;
  status: ConfigStatus;
  createdBy?: string;
  approvedBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

type EditState = {
  id: string;
  minSalary: string;
  maxSalary: string;
  employeeRate: string;
  employerRate: string;
} | null;

export default function InsuranceBracketsPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [brackets, setBrackets] = useState<InsuranceBracket[]>([]);
  const [filter, setFilter] = useState<ConfigStatus | "all">("all");
  const [edit, setEdit] = useState<EditState>(null);
  const [view, setView] = useState<InsuranceBracket | null>(null);

  const filtered = useMemo(() => {
    if (filter === "all") return brackets;
    return brackets.filter((b) => b.status === filter);
  }, [brackets, filter]);

  const normalize = (raw: any): InsuranceBracket => {
    return {
      id: raw.id || raw._id,
      name: raw.name || raw.insuranceName || "",
      minSalary: Number(raw.minSalary || raw.min_salary || 0),
      maxSalary: Number(raw.maxSalary || raw.max_salary || 0),
      employeeRate: Number(raw.employeeRate || raw.employee_rate || 0),
      employerRate: Number(raw.employerRate || raw.employer_rate || 0),
      status: raw.status || raw.configStatus || ConfigStatus.DRAFT,
      createdBy: raw.createdBy || raw.creator,
      approvedBy: raw.approvedBy || raw.approver,
      createdAt: raw.createdAt || raw.created_at,
      updatedAt: raw.updatedAt || raw.updated_at,
    };
  };

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await payrollConfigurationService.getInsuranceBrackets();
      const rawData = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
      setBrackets(Array.isArray(rawData) ? rawData.map(normalize) : []);
    } catch (e: any) {
      setError(e?.message || "Failed to load insurance brackets");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const beginEdit = (bracket: InsuranceBracket) => {
    // Only allow editing brackets in DRAFT status
    if (bracket.status !== ConfigStatus.DRAFT) {
      setError("Only DRAFT insurance brackets can be edited.");
      return;
    }

    setEdit({
      id: bracket.id,
      minSalary: String(bracket.minSalary),
      maxSalary: String(bracket.maxSalary),
      employeeRate: String(bracket.employeeRate),
      employerRate: String(bracket.employerRate),
    });
  };

  const cancelEdit = () => {
    setEdit(null);
  };

  const viewItem = (b: InsuranceBracket) => {
    setEdit(null);
    setError(null);
    setSuccess(null);
    setView(b);
  };

  const closeView = () => setView(null);

  const saveEdit = async () => {
    if (!edit) return;

    setError(null);
    setSuccess(null);

    try {
      // Double-check current status before saving (in case it changed)
      const current = brackets.find((b) => b.id === edit.id);
      if (!current || current.status !== ConfigStatus.DRAFT) {
        setError("Cannot edit an insurance bracket unless it is in DRAFT status.");
        setEdit(null);
        return;
      }

      const payload = {
        minSalary: Number(edit.minSalary),
        maxSalary: Number(edit.maxSalary),
        employeeRate: Number(edit.employeeRate),
        employerRate: Number(edit.employerRate),
      };

      const res = await payrollConfigurationService.updateInsuranceBracket(edit.id, payload);
      if ((res as any)?.error) {
        setError((res as any).error || "Failed to update insurance bracket");
        return;
      }
      setSuccess("Insurance bracket updated successfully");
      setEdit(null);
      await load();
    } catch (e: any) {
      setError(e?.message || "Failed to update insurance bracket");
    }
  };

  const approve = async (id: string) => {
    if (!user?.id) {
      setError("User not authenticated");
      return;
    }

    setError(null);
    setSuccess(null);

    try {
      const res = await payrollConfigurationService.approveInsuranceBracket(id, { approvedBy: user.id });
      if ((res as any)?.error) {
        setError((res as any).error || "Failed to approve");
        return;
      }
      setSuccess("Insurance bracket approved successfully");
      await load();
    } catch (e: any) {
      setError(e?.message || "Failed to approve");
    }
  };

  const reject = async (id: string) => {
    if (!user?.id) {
      setError("User not authenticated");
      return;
    }

    setError(null);
    setSuccess(null);

    try {
      const res = await payrollConfigurationService.rejectInsuranceBracket(id, { approvedBy: user.id });
      if ((res as any)?.error) {
        setError((res as any).error || "Failed to reject");
        return;
      }
      setSuccess("Insurance bracket rejected");
      await load();
    } catch (e: any) {
      setError(e?.message || "Failed to reject");
    }
  };

  const deleteItem = async (id: string) => {
    if (!confirm("Are you sure you want to delete this insurance bracket? This action cannot be undone.")) return;

    setError(null);
    setSuccess(null);

    try {
      const res = await payrollConfigurationService.deleteInsuranceBracket(id);
      if ((res as any)?.error) {
        setError((res as any).error || "Failed to delete");
        return;
      }
      setSuccess("Insurance bracket deleted successfully");
      await load();
    } catch (e: any) {
      setError(e?.message || "Failed to delete");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Insurance Brackets Review and Update</h1>
        <p className="text-slate-600 mt-2">Review, update, and approve insurance bracket configurations</p>
      </div>

 

      {/* Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-800">
          ❌ {error}
        </div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-sm text-green-800">
          ✓ {success}
        </div>
      )}

      {/* List Card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
        <div className="p-6 flex items-center justify-between border-b border-slate-100">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Insurance Brackets</h2>
            <p className="text-xs text-slate-600">Manage and approve all insurance configurations</p>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-slate-600">Filter</label>
            <select
              className="border border-slate-300 rounded-lg px-2 py-1 text-sm"
              value={filter}
              onChange={(e) => setFilter(e.target.value as any)}
            >
              <option value="all">All</option>
              <option value={ConfigStatus.DRAFT}>Draft</option>
              <option value={ConfigStatus.APPROVED}>Approved</option>
              <option value={ConfigStatus.REJECTED}>Rejected</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="p-6 text-slate-600">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-slate-100 text-slate-500 mb-3">
              🏥
            </div>
            <p className="text-slate-700 font-medium">No insurance brackets to review</p>
            <p className="text-slate-500 text-sm mt-1">Specialists will create insurance brackets for you to approve.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left border-b bg-slate-50">
                  <th className="py-2 px-3">Bracket Name</th>
                  <th className="py-2 px-3">Salary Range</th>
                  <th className="py-2 px-3">Employee%</th>
                  <th className="py-2 px-3">Employer%</th>
                  <th className="py-2 px-3">Status</th>
                  <th className="py-2 px-3">Created</th>
                  <th className="py-2 px-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((b) => (
                  <tr key={b.id} className="border-b hover:bg-slate-50">
                    <td className="py-2 px-3">
                      <span className="font-medium text-slate-900">{b.name}</span>
                    </td>
                    <td className="py-2 px-3">
                      {edit?.id === b.id ? (
                        <div className="flex gap-1">
                          <input
                            className="border rounded px-2 py-1 w-20"
                            type="number"
                            value={edit.minSalary}
                            onChange={(e) => setEdit((s) => (s ? { ...s, minSalary: e.target.value } : s))}
                          />
                          <span>-</span>
                          <input
                            className="border rounded px-2 py-1 w-20"
                            type="number"
                            value={edit.maxSalary}
                            onChange={(e) => setEdit((s) => (s ? { ...s, maxSalary: e.target.value } : s))}
                          />
                        </div>
                      ) : (
                        <span className="tabular-nums">{b.minSalary} - {b.maxSalary}</span>
                      )}
                    </td>
                    <td className="py-2 px-3">
                      {edit?.id === b.id ? (
                        <input
                          className="border rounded px-2 py-1 w-16"
                          type="number"
                          min="0"
                          max="100"
                          step="0.01"
                          value={edit.employeeRate}
                          onChange={(e) => setEdit((s) => (s ? { ...s, employeeRate: e.target.value } : s))}
                        />
                      ) : (
                        <span className="tabular-nums">{b.employeeRate}%</span>
                      )}
                    </td>
                    <td className="py-2 px-3">
                      {edit?.id === b.id ? (
                        <input
                          className="border rounded px-2 py-1 w-16"
                          type="number"
                          min="0"
                          max="100"
                          step="0.01"
                          value={edit.employerRate}
                          onChange={(e) => setEdit((s) => (s ? { ...s, employerRate: e.target.value } : s))}
                        />
                      ) : (
                        <span className="tabular-nums">{b.employerRate}%</span>
                      )}
                    </td>
                    <td className="py-2 px-3">
                      <span
                        className={`px-2 py-1 rounded text-xs border ${
                          b.status === ConfigStatus.APPROVED
                            ? "bg-green-50 border-green-200 text-green-700"
                            : b.status === ConfigStatus.REJECTED
                            ? "bg-red-50 border-red-200 text-red-700"
                            : "bg-slate-50 border-slate-200 text-slate-700"
                        }`}
                      >
                        {b.status}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-xs text-slate-600">
                      {b.createdAt ? new Date(b.createdAt).toLocaleDateString() : "-"}
                    </td>
                    <td className="py-2 px-3">
                      {edit?.id === b.id ? (
                        <div className="flex flex-wrap gap-2">
                          <button
                            className="px-3 py-1 border rounded hover:bg-green-50 text-xs"
                            onClick={saveEdit}
                          >
                            Save
                          </button>
                          <button
                            className="px-3 py-1 border rounded hover:bg-slate-50 text-xs"
                            onClick={cancelEdit}
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {b.status === ConfigStatus.DRAFT ? (
                            <>
                              <button
                                className="px-3 py-1 border rounded hover:bg-green-50 text-xs"
                                onClick={() => approve(b.id)}
                              >
                                ✓ Approve
                              </button>
                              <button
                                className="px-3 py-1 border rounded hover:bg-red-50 text-xs"
                                onClick={() => reject(b.id)}
                              >
                                ✗ Reject
                              </button>
                              <button
                                className="px-3 py-1 border rounded hover:bg-blue-50 text-xs"
                                onClick={() => beginEdit(b)}
                              >
                                Edit
                              </button>
                              <button
                                className="px-3 py-1 border rounded hover:bg-blue-50 text-xs"
                                onClick={() => viewItem(b)}
                              >
                                View
                              </button>
                              <button
                                className="px-3 py-1 border rounded hover:bg-red-50 text-xs"
                                onClick={() => deleteItem(b.id)}
                              >
                                Delete
                              </button>
                            </>
                          ) : (
                            <button
                              className="px-3 py-1 border rounded hover:bg-blue-50 text-xs"
                              onClick={() => viewItem(b)}
                            >
                              View
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Info Footer */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm text-slate-700">
        <p className="font-medium">Insurance Bracket Guidelines</p>
        <ul className="list-disc ml-5 space-y-1 mt-2">
          <li>Insurance brackets define contribution rates based on salary ranges</li>
          <li>Employee & employer rates are percentages (0-100%) applied to the base amount</li>
          <li>Ensure salary ranges don't overlap to avoid calculation conflicts</li>
          <li>Update brackets when labor laws or company policies change</li>
          <li>Approved brackets are immediately applied to payroll calculations</li>
        </ul>
      </div>

      {/* View Modal */}
      {view && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={closeView} />
          <div className="relative bg-white w-[95vw] max-w-xl rounded-xl shadow-xl border border-slate-200">
            <div className="px-6 py-4 border-b flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">{view.name || 'Insurance Bracket'}</h3>
                <p className="text-xs text-slate-500 mt-0.5">ID: {view.id}</p>
              </div>
              <span className={`px-2 py-1 rounded text-xs border ${
                view.status === ConfigStatus.APPROVED
                  ? 'bg-green-50 border-green-200 text-green-700'
                  : view.status === ConfigStatus.REJECTED
                  ? 'bg-red-50 border-red-200 text-red-700'
                  : 'bg-slate-50 border-slate-200 text-slate-700'
              }`}>
                {view.status}
              </span>
            </div>
            <div className="px-6 py-5 space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <KV label="Salary Min" value={view.minSalary} />
                <KV label="Salary Max" value={view.maxSalary} />
                <KV label="Employee Rate" value={`${view.employeeRate}%`} />
                <KV label="Employer Rate" value={`${view.employerRate}%`} />
                <KV label="Created" value={view.createdAt ? new Date(view.createdAt).toLocaleDateString() : '—'} />
              </div>
            </div>
            <div className="px-6 py-4 border-t flex justify-end">
              <button onClick={closeView} className="px-3 py-1 border rounded hover:bg-slate-50 text-sm">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Small helper for key/value display in the view modal
function KV({ label, value }: { label: string; value: any }) {
  return (
    <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="text-sm font-medium text-slate-900">{value ?? '—'}</div>
    </div>
  );
}
