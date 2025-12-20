"use client";

import { useEffect, useState } from "react";
import { payrollConfigurationService } from "@/app/services/payroll-configuration";

type CompanySettingsForm = {
  currency: string;
  timeZone: string;
  payDate: string;
  status?: string;
};

export default function CompanySettingsPage() {
  const [loadingSettings, setLoadingSettings] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [errorSettings, setErrorSettings] = useState<string | null>(null);
  const [successSettings, setSuccessSettings] = useState<string | null>(null);
  const [approving, setApproving] = useState(false);
  const [lastSavedSnapshot, setLastSavedSnapshot] = useState<string>("");

  const [form, setForm] = useState<CompanySettingsForm>({
    currency: "EGP",
    timeZone: "Africa/Cairo",
    payDate: new Date().toISOString().split('T')[0],
    status: "DRAFT",
  });

  const loadSettings = async () => {
    setLoadingSettings(true);
    setErrorSettings(null);
    try {
      const res = await payrollConfigurationService.getCompanyWideSettings();
      const data = (res.data as any)?.data || (res.data as any);
      if (data) {
        setForm({
          currency: data.currency ?? "EGP",
          timeZone: data.timeZone ?? "Africa/Cairo",
          payDate: data.payDate ? new Date(data.payDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
          // Frontend-only status persisted in localStorage
          status: (typeof window !== 'undefined' && localStorage.getItem('companySettingsStatus')) || "DRAFT",
        });
        // Initialize last saved snapshot based on loaded data
        const snapshot = JSON.stringify({
          currency: data.currency ?? "EGP",
          timeZone: data.timeZone ?? "Africa/Cairo",
          payDate: data.payDate ? new Date(data.payDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        });
        setLastSavedSnapshot(snapshot);
      }
    } catch (e: any) {
      setErrorSettings(e?.message || "Failed to load settings");
      console.error('Load settings error:', e);
    } finally {
      setLoadingSettings(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const saveSettings = async () => {
    setSavingSettings(true);
    setErrorSettings(null);
    setSuccessSettings(null);
    try {
      const payload = {
        currency: form.currency,
        timeZone: form.timeZone,
        payDate: form.payDate,
      };
      await payrollConfigurationService.updateCompanyWideSettings(payload);
      // After final change, mark status as DRAFT locally (Step 1)
      const snapshot = JSON.stringify(payload);
      setLastSavedSnapshot(snapshot);
      if (typeof window !== 'undefined') localStorage.setItem('companySettingsStatus', 'DRAFT');
      setForm((f) => ({ ...f, status: 'DRAFT' }));
      setSuccessSettings("Step 1 complete: Changes saved. Review then Approve (Step 2).");
    } catch (e: any) {
      setErrorSettings(e?.message || "Failed to save settings");
    } finally {
      setSavingSettings(false);
    }
  };

  const handleApprove = async () => {
    // Frontend-only: toggle status locally and persist in localStorage
    setApproving(true);
    setErrorSettings(null);
    setSuccessSettings(null);
    try {
      setForm((f) => {
        const next = { ...f, status: 'APPROVED' };
        if (typeof window !== 'undefined') localStorage.setItem('companySettingsStatus', next.status || 'APPROVED');
        return next;
      });
      setSuccessSettings("Step 2 complete: Draft approved.");
    } catch (e: any) {
      setErrorSettings(e?.message || "Failed to approve settings locally");
    } finally {
      setApproving(false);
    }
  };

  const handleReject = async () => {
    // Frontend-only: toggle status locally and persist in localStorage
    setApproving(true);
    setErrorSettings(null);
    setSuccessSettings(null);
    try {
      setForm((f) => {
        const next = { ...f, status: 'REJECTED' };
        if (typeof window !== 'undefined') localStorage.setItem('companySettingsStatus', next.status || 'REJECTED');
        return next;
      });
      setSuccessSettings("Company settings rejected locally");
    } catch (e: any) {
      setErrorSettings(e?.message || "Failed to reject settings locally");
    } finally {
      setApproving(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'DRAFT':
        return <span className="px-2 py-1 text-xs rounded-full bg-yellow-100 text-yellow-800">DRAFT</span>;
      case 'APPROVED':
        return <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">APPROVED</span>;
      case 'REJECTED':
        return <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-800">REJECTED</span>;
      default:
        return <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-800">{status}</span>;
    }
  };

  const isFormEqualToLastSaved = () => {
    const current = JSON.stringify({ currency: form.currency, timeZone: form.timeZone, payDate: form.payDate });
    return current === lastSavedSnapshot;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Company-Wide Settings Configuration</h1>
        <p className="text-slate-600 mt-2">Configure global company settings including currency, timezone, and payroll date</p>
      </div>

      {/* Main Settings Card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
    

  

        {/* Settings Form */}
        <div className="p-6">
          {errorSettings && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
              ❌ {errorSettings}
            </div>
          )}
          {successSettings && (
            <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg text-sm text-green-800">
              ✓ {successSettings}
            </div>
          )}

          {loadingSettings ? (
            <p className="text-slate-600">Loading settings...</p>
          ) : (
            <div className="space-y-4">
              {/* Status Badge */}
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-slate-700">Status:</span>
                {getStatusBadge(form.status || 'DRAFT')}
              </div>
              {/* Step guidance */}
              <div className="text-xs text-slate-600">
                <span className="font-medium">Step 1:</span> Save changes to create a draft. <span className="font-medium">Step 2:</span> Approve the draft to finalize.
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Currency</label>
                  <select
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                    value={form.currency}
                    onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value }))}
                  >
                    <option value="EGP">EGP - Egyptian Pound</option>
                    <option value="USD">USD - US Dollar</option>
                    <option value="EUR">EUR - Euro</option>
                    <option value="GBP">GBP - British Pound</option>
                    <option value="AED">AED - UAE Dirham</option>
                    <option value="SAR">SAR - Saudi Riyal</option>
                    <option value="INR">INR - Indian Rupee</option>
                    <option value="PKR">PKR - Pakistani Rupee</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Timezone</label>
                  <select
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                    value={form.timeZone}
                    onChange={(e) => setForm((f) => ({ ...f, timeZone: e.target.value }))}
                  >
                    <option value="Africa/Cairo">Africa/Cairo</option>
                    <option value="UTC">UTC</option>
                    <option value="EST">EST - Eastern Standard Time</option>
                    <option value="CST">CST - Central Standard Time</option>
                    <option value="MST">MST - Mountain Standard Time</option>
                    <option value="PST">PST - Pacific Standard Time</option>
                    <option value="GST">GST - Gulf Standard Time (Dubai)</option>
                    <option value="PKT">PKT - Pakistan Standard Time</option>
                    <option value="IST">IST - Indian Standard Time</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Payroll Date</label>
                  <input
                    type="date"
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                    value={form.payDate}
                    onChange={(e) => setForm((f) => ({ ...f, payDate: e.target.value }))}
                  />
                  <p className="text-xs text-slate-500 mt-1">Date for payroll execution</p>
                </div>
              </div>

              <div className="flex gap-2 pt-4 border-t border-slate-100">
                <button
                  onClick={saveSettings}
                  disabled={savingSettings}
                  className="px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 disabled:opacity-50 text-sm font-medium"
                >
                  {savingSettings ? "Saving..." : "Save Settings"}
                </button>
                <button
                  onClick={loadSettings}
                  className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 text-sm font-medium"
                >
                  Reset
                </button>

                {/* Approve/Reject buttons - only show for DRAFT */}
                {form.status === 'DRAFT' && (
                  <>
                    <button
                      onClick={handleApprove}
                      disabled={approving || !isFormEqualToLastSaved()}
                      className="ml-auto px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 text-sm font-medium"
                    >
                      {approving ? "Processing..." : (isFormEqualToLastSaved() ? "Approve" : "Save first to approve")}
                    </button>
                    <button
                      onClick={handleReject}
                      disabled={approving}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 text-sm font-medium"
                    >
                      {approving ? "Processing..." : "Reject"}
                    </button>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Guidelines */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Guidelines & Business Rules</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <p className="font-medium text-slate-900 mb-2">⚙️ Configuration Impact</p>
            <ul className="list-disc ml-5 space-y-1 text-sm text-slate-700">
              <li>Payroll date controls when payroll execution occurs</li>
              <li>Currency setting is used in all calculations and reports globally</li>
              <li>Timezone affects scheduled payroll tasks and audit log timestamps</li>
              <li>All changes apply to new payroll runs created after modification</li>
            </ul>
          </div>
          <div>
            <p className="font-medium text-slate-900 mb-2">📋 Business Rules (BR 3)</p>
            <ul className="list-disc ml-5 space-y-1 text-sm text-slate-700">
              <li>Payroll must be processed within defined cycles per region</li>
              <li>Default values: Currency=EGP, Timezone=Africa/Cairo</li>
              <li>Settings persist globally across all departments and positions</li>
              <li>Only System Admins can modify these settings</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
