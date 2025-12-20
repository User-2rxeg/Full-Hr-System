'use client';

export default function LegalPolicyAdminPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Legal & Policy Admin Dashboard</h1>
        <p className="text-slate-600 mt-2">Legal rules and compliance management</p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6">
          <p className="text-slate-600 text-sm">Active Policies</p>
          <p className="text-2xl font-bold text-slate-900 mt-2">28</p>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6">
          <p className="text-slate-600 text-sm">Pending Review</p>
          <p className="text-2xl font-bold text-slate-900 mt-2">5</p>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6">
          <p className="text-slate-600 text-sm">Compliance Score</p>
          <p className="text-2xl font-bold text-green-600 mt-2">98%</p>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6">
          <p className="text-slate-600 text-sm">Violations</p>
          <p className="text-2xl font-bold text-slate-900 mt-2">0</p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <button className="p-4 border border-slate-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors text-center">
            <div className="text-2xl mb-2">📋</div>
            <p className="font-medium text-slate-900">Policies</p>
          </button>
          <button className="p-4 border border-slate-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors text-center">
            <div className="text-2xl mb-2">⚖️</div>
            <p className="font-medium text-slate-900">Legal Rules</p>
          </button>
          <button className="p-4 border border-slate-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors text-center">
            <div className="text-2xl mb-2">📊</div>
            <p className="font-medium text-slate-900">Compliance</p>
          </button>
          <button className="p-4 border border-slate-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors text-center">
            <div className="text-2xl mb-2">🔍</div>
            <p className="font-medium text-slate-900">Audit Trail</p>
          </button>
        </div>
      </div>
    </div>
  );
}

