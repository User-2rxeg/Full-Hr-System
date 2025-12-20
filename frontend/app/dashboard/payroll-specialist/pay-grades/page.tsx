"use client";

import { useEffect, useMemo, useState } from "react";
import { payrollConfigurationService } from "@/app/services/payroll-configuration";
import { ConfigStatus } from "@/app/types/enums";
import type { PayGrade } from "@/app/types/payroll";
import { useAuth } from "@/app/context/AuthContext";

// Note: Backend PayGrade currently supports grade, baseSalary, grossSalary, status.
// Department/Position association can be added when backend fields are available.

type CreateForm = {
  grade: string;
  baseSalary: string;
  grossSalary: string;
};

type EditState = {
  id: string;
  grade: string;
  baseSalary: string;
  grossSalary: string;
} | null;

export default function PayGradesPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [form, setForm] = useState<CreateForm>({ grade: "", baseSalary: "", grossSalary: "" });
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<PayGrade[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | ConfigStatus>("all");
  const [edit, setEdit] = useState<EditState>(null);

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

  async function create() {
    if (!form.grade || !form.baseSalary || !form.grossSalary) return;
    if (!user?.id) {
      setError(`User not authenticated. Please log in again. (User: ${user ? 'exists but no ID' : 'null'})`);
      return;
    }
    setCreating(true);
    setError(null);
    try {
      const payload = {
        grade: form.grade,
        baseSalary: Number(form.baseSalary),
        grossSalary: Number(form.grossSalary),
        createdByEmployeeId: user.id,
      };
      const res = await payrollConfigurationService.createPayGrade(payload as any);
      if ((res as any)?.error) {
        throw new Error((res as any).error);
      }
      setForm({ grade: "", baseSalary: "", grossSalary: "" });
      await load();
    } catch (e: any) {
      setError(e?.message ?? "Failed to create pay grade");
    } finally {
      setCreating(false);
    }
  }

  function beginEdit(pg: PayGrade) {
    setEdit({ id: pg.id as any, grade: pg.grade ?? "", baseSalary: String(pg.baseSalary ?? 0), grossSalary: String(pg.grossSalary ?? 0) });
  }

  async function saveEdit() {
    if (!edit) return;
    setError(null);
    try {
      const payload = {
        grade: edit.grade,
        baseSalary: Number(edit.baseSalary),
        grossSalary: Number(edit.grossSalary),
      };
      const res = await payrollConfigurationService.updatePayGrade(edit.id as any, payload as any);
      if ((res as any)?.error) {
        throw new Error((res as any).error);
      }
      setEdit(null);
      await load();
    } catch (e: any) {
      setError(e?.message ?? "Failed to save changes");
    }
  }

  function cancelEdit() {
    setEdit(null);
  }

  async function remove(id: string) {
    setError(null);
    try {
      const res = await payrollConfigurationService.deletePayGrade(id as any);
      if ((res as any)?.error) {
        throw new Error((res as any).error);
      }
      await load();
    } catch (e: any) {
      setError(e?.message ?? "Failed to delete pay grade");
    }
  }
  return (
    <div className="space-y-6">
      {/* Debug Info - Remove after testing */}
      {!user && !authLoading && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm text-yellow-800">
          ⚠️ Debug: User object is null. Check localStorage for 'hr_user' key.
        </div>
      )}
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Pay Grades</h1>
          <p className="text-slate-600 mt-2">Define grade names and salary limits, manage drafts and approvals.</p>
        </div>
        <div className="hidden md:flex items-center gap-3">
          <span className="px-3 py-1 text-xs rounded-full bg-blue-50 text-blue-700 border border-blue-200">Drafts require manager approval</span>
        </div>
      </div>

      {/* Create Card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
        <div className="p-6 border-b border-slate-100">
          <h2 className="text-lg font-semibold text-slate-900">Create Pay Grade</h2>
          <p className="text-sm text-slate-600 mt-1">Start a new draft pay grade. You can edit and submit for approval later.</p>
        </div>
        <div className="p-6 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-700">Grade Name</label>
            <input className="border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-200" placeholder="e.g., Senior TA" value={form.grade} onChange={(e) => setForm((f) => ({ ...f, grade: e.target.value }))} />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-700">Base Salary</label>
            <input className="border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-200" placeholder="0" type="number" value={form.baseSalary} onChange={(e) => setForm((f) => ({ ...f, baseSalary: e.target.value }))} />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-700">Gross Salary</label>
            <input className="border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-200" placeholder="0" type="number" value={form.grossSalary} onChange={(e) => setForm((f) => ({ ...f, grossSalary: e.target.value }))} />
          </div>
          <div className="flex items-end">
            <button className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-2 disabled:opacity-50" onClick={create} disabled={creating || !form.grade || !form.baseSalary || !form.grossSalary}>
              {creating ? "Creating..." : "Create Draft"}
            </button>
          </div>
        </div>
        {error && <div className="px-6 pb-6 text-red-600 text-sm">{error}</div>}
      </div>

      {/* List Card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
        <div className="p-6 flex items-center justify-between border-b border-slate-100">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Pay Grades</h2>
            <p className="text-xs text-slate-600">View all grades across statuses.</p>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-slate-600">Filter</label>
            <select className="border border-slate-300 rounded-lg px-2 py-1 text-sm" value={filter} onChange={(e) => setFilter(e.target.value as any)}>
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
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-slate-100 text-slate-500 mb-3">🏷️</div>
            <p className="text-slate-700 font-medium">No pay grades yet</p>
            <p className="text-slate-500 text-sm mt-1">Create your first draft using the form above.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left border-b bg-slate-50">
                  <th className="py-2 px-3">Grade</th>
                  <th className="py-2 px-3">Base</th>
                  <th className="py-2 px-3">Gross</th>
                  <th className="py-2 px-3">Status</th>
                  <th className="py-2 px-3">Created By</th>
                  <th className="py-2 px-3">Approved By</th>
                  <th className="py-2 px-3">Created</th>
                  <th className="py-2 px-3">Updated</th>
                  <th className="py-2 px-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((pg) => (
                  <tr key={pg.id} className="border-b hover:bg-slate-50">
                    <td className="py-2 px-3">
                      {edit?.id === pg.id ? (
                        <input className="border rounded px-2 py-1" value={edit?.grade ?? ''} onChange={(e) => setEdit((s) => (s ? { ...s, grade: e.target.value } : s))} />
                      ) : (
                        <span className="font-medium text-slate-900">{pg.grade}</span>
                      )}
                    </td>
                    <td className="py-2 px-3">
                      {edit?.id === pg.id ? (
                        <input className="border rounded px-2 py-1" type="number" value={edit?.baseSalary ?? ''} onChange={(e) => setEdit((s) => (s ? { ...s, baseSalary: e.target.value } : s))} />
                      ) : (
                        <span className="tabular-nums">{pg.baseSalary}</span>
                      )}
                    </td>
                    <td className="py-2 px-3">
                      {edit?.id === pg.id ? (
                        <input className="border rounded px-2 py-1" type="number" value={edit?.grossSalary ?? ''} onChange={(e) => setEdit((s) => (s ? { ...s, grossSalary: e.target.value } : s))} />
                      ) : (
                        <span className="tabular-nums">{pg.grossSalary}</span>
                      )}
                    </td>
                    <td className="py-2 px-3">
                      <span className={`px-2 py-1 rounded text-xs border ${pg.status === ConfigStatus.APPROVED ? 'bg-green-50 border-green-200 text-green-700' : pg.status === ConfigStatus.REJECTED ? 'bg-red-50 border-red-200 text-red-700' : 'bg-slate-50 border-slate-200 text-slate-700'}`}>{pg.status}</span>
                    </td>
                    <td className="py-2 px-3">{pg.createdBy ?? '-'}</td>
                    <td className="py-2 px-3">{pg.approvedBy ?? '-'}</td>
                    <td className="py-2 px-3">{pg.createdAt ? new Date(pg.createdAt).toLocaleString() : '-'}</td>
                    <td className="py-2 px-3">{pg.updatedAt ? new Date(pg.updatedAt).toLocaleString() : '-'}</td>
                    <td className="py-2 px-3">
                      {edit?.id === pg.id ? (
                        <div className="flex flex-wrap gap-2">
                          <button className="px-3 py-1 border rounded hover:bg-green-50" onClick={saveEdit}>Save</button>
                          <button className="px-3 py-1 border rounded hover:bg-slate-50" onClick={cancelEdit}>Cancel</button>
                        </div>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {pg.status === ConfigStatus.DRAFT && (
                            <button className="px-3 py-1 border rounded hover:bg-slate-50" onClick={() => beginEdit(pg)}>Edit Draft</button>
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

      {/* Footer Note */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm text-slate-700">
        <p className="font-medium">Notes</p>
        <ul className="list-disc ml-5 space-y-1 mt-2">
          <li>As a Payroll Specialist, you can only create drafts, edit drafts, and view all pay grades.</li>
          <li>Drafts require Payroll Manager approval before they become active.</li>
          <li>Only draft status items can be edited—approved or rejected items are read-only.</li>
          <li>Department/position linkage will be added once backend fields are available.</li>
        </ul>
      </div>
    </div>
  );
}