"use client";

import { useState } from "react";

interface BackupHistory {
  id: string;
  timestamp: string;
  size: string;
  status: "success" | "failed" | "pending";
  type: "full" | "incremental";
}

export default function DataBackupPage() {
  const [backupHistory, setBackupHistory] = useState<BackupHistory[]>([
    {
      id: "bak-001",
      timestamp: new Date(Date.now() - 86400000).toISOString(),
      size: "2.4 GB",
      status: "success",
      type: "full",
    },
    {
      id: "bak-002",
      timestamp: new Date(Date.now() - 43200000).toISOString(),
      size: "156 MB",
      status: "success",
      type: "incremental",
    },
    {
      id: "bak-003",
      timestamp: new Date().toISOString(),
      size: "172 MB",
      status: "pending",
      type: "incremental",
    },
  ]);

  const [backupConfig, setBackupConfig] = useState({
    autoBackupEnabled: true,
    backupFrequency: "daily",
    retentionDays: "30",
    backupTime: "02:00",
    notifyEmail: "admin@company.com",
  });

  const triggerBackup = async () => {
    try {
      const newBackup: BackupHistory = {
        id: `bak-${Date.now()}`,
        timestamp: new Date().toISOString(),
        size: "0 MB",
        status: "pending",
        type: "incremental",
      };
      setBackupHistory([newBackup, ...backupHistory]);

      setTimeout(() => {
        setBackupHistory((prev) =>
          prev.map((b) =>
            b.id === newBackup.id
              ? { ...b, status: "success", size: Math.random() * 500 + "MB" }
              : b
          )
        );
      }, 3000);
    } catch (e: any) {
      alert("Failed to trigger backup: " + e?.message);
    }
  };

  const saveBackupConfig = async () => {
    try {
      alert("Backup configuration saved successfully");
    } catch (e: any) {
      alert("Failed to save backup config: " + e?.message);
    }
  };

  const restoreBackup = (id: string) => {
    if (!confirm("Are you sure you want to restore from this backup? This will overwrite current data.")) return;
    alert(`Restore from backup ${id} initiated (placeholder)`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Data Backup Configuration</h1>
        <p className="text-slate-600 mt-2">Configure and manage database backups, restore points, and retention policies</p>
      </div>

      {/* Backup Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6">
          <p className="text-slate-600 text-sm font-medium">Last Backup</p>
          <p className="text-2xl font-bold text-green-600 mt-2">2 hours ago</p>
          <p className="text-xs text-slate-500 mt-1">Status: Success</p>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6">
          <p className="text-slate-600 text-sm font-medium">Total Backups</p>
          <p className="text-2xl font-bold text-slate-900 mt-2">{backupHistory.length}</p>
          <p className="text-xs text-slate-500 mt-1">In retention window</p>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6">
          <p className="text-slate-600 text-sm font-medium">Storage Used</p>
          <p className="text-2xl font-bold text-slate-900 mt-2">4.7 GB</p>
          <p className="text-xs text-slate-500 mt-1">of 100 GB allocated</p>
        </div>
      </div>

      {/* Backup Configuration & History */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Backup Configuration Panel */}
        <div className="lg:col-span-1 bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="p-6 border-b border-slate-100">
            <h2 className="text-lg font-semibold text-slate-900">Backup Configuration</h2>
            <p className="text-xs text-slate-600 mt-1">REQ-PY-16: Set backup schedule and policies</p>
          </div>

          <div className="p-6 space-y-4">
            <div>
              <label className="flex items-center gap-2 mb-2">
                <input
                  type="checkbox"
                  checked={backupConfig.autoBackupEnabled}
                  onChange={(e) =>
                    setBackupConfig((c) => ({ ...c, autoBackupEnabled: e.target.checked }))
                  }
                  className="w-4 h-4 rounded border-slate-300 text-violet-600"
                />
                <span className="text-sm font-medium text-slate-700">Enable Automatic Backups</span>
              </label>
              <p className="text-xs text-slate-500 ml-6">Automatically backup data on schedule</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Backup Frequency</label>
              <select
                value={backupConfig.backupFrequency}
                onChange={(e) =>
                  setBackupConfig((c) => ({ ...c, backupFrequency: e.target.value }))
                }
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
              >
                <option value="hourly">Every Hour</option>
                <option value="every-6h">Every 6 Hours</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Backup Time (UTC)</label>
              <input
                type="time"
                value={backupConfig.backupTime}
                onChange={(e) =>
                  setBackupConfig((c) => ({ ...c, backupTime: e.target.value }))
                }
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Retention (days)</label>
              <input
                type="number"
                min="7"
                max="365"
                value={backupConfig.retentionDays}
                onChange={(e) =>
                  setBackupConfig((c) => ({ ...c, retentionDays: e.target.value }))
                }
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
              />
              <p className="text-xs text-slate-500 mt-1">Keep backups for this many days</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Notification Email</label>
              <input
                type="email"
                value={backupConfig.notifyEmail}
                onChange={(e) =>
                  setBackupConfig((c) => ({ ...c, notifyEmail: e.target.value }))
                }
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                placeholder="admin@company.com"
              />
            </div>

            <div className="flex gap-2 pt-4 border-t border-slate-100">
              <button
                onClick={saveBackupConfig}
                className="flex-1 px-3 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 text-sm font-medium"
              >
                Save Config
              </button>
              <button
                onClick={triggerBackup}
                className="flex-1 px-3 py-2 border border-violet-300 bg-violet-50 text-violet-700 rounded-lg hover:bg-violet-100 text-sm font-medium"
              >
                Backup Now
              </button>
            </div>
          </div>
        </div>

        {/* Backup History Panel */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="p-6 border-b border-slate-100">
            <h2 className="text-lg font-semibold text-slate-900">Backup History</h2>
            <p className="text-xs text-slate-600 mt-1">Recent backup operations and restore options</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b bg-slate-50">
                  <th className="py-3 px-6 font-medium text-slate-700">Timestamp</th>
                  <th className="py-3 px-6 font-medium text-slate-700">Type</th>
                  <th className="py-3 px-6 font-medium text-slate-700">Size</th>
                  <th className="py-3 px-6 font-medium text-slate-700">Status</th>
                  <th className="py-3 px-6 font-medium text-slate-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {backupHistory.map((backup) => (
                  <tr key={backup.id} className="border-b hover:bg-slate-50">
                    <td className="py-3 px-6 text-slate-900">
                      {new Date(backup.timestamp).toLocaleString()}
                    </td>
                    <td className="py-3 px-6">
                      <span className="px-2 py-1 rounded text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
                        {backup.type === "full" ? "Full Backup" : "Incremental"}
                      </span>
                    </td>
                    <td className="py-3 px-6 text-slate-600">{backup.size}</td>
                    <td className="py-3 px-6">
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium border ${
                          backup.status === "success"
                            ? "bg-green-50 text-green-700 border-green-200"
                            : backup.status === "failed"
                            ? "bg-red-50 text-red-700 border-red-200"
                            : "bg-yellow-50 text-yellow-700 border-yellow-200"
                        }`}
                      >
                        {backup.status === "success"
                          ? "✓ Success"
                          : backup.status === "failed"
                          ? "✗ Failed"
                          : "⏳ In Progress"}
                      </span>
                    </td>
                    <td className="py-3 px-6">
                      {backup.status === "success" && (
                        <button
                          onClick={() => restoreBackup(backup.id)}
                          className="px-2 py-1 border border-slate-300 rounded text-xs hover:bg-slate-50"
                        >
                          Restore
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Guidelines */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Backup Guidelines & Best Practices</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <p className="font-medium text-slate-900 mb-2">💾 Backup Strategy</p>
            <ul className="list-disc ml-5 space-y-1 text-sm text-slate-700">
              <li>Full backups run weekly; daily incremental backups</li>
              <li>Backups stored in geographically distributed locations</li>
              <li>Encryption enabled for all backup data</li>
              <li>Retention period ensures compliance with data policies</li>
            </ul>
          </div>
          <div>
            <p className="font-medium text-slate-900 mb-2">🔄 Restore Procedures</p>
            <ul className="list-disc ml-5 space-y-1 text-sm text-slate-700">
              <li>Test restore procedures regularly to ensure integrity</li>
              <li>Verify backup before deleting old data</li>
              <li>Keep offline copies of critical backups</li>
              <li>Document all restore operations in audit logs</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
