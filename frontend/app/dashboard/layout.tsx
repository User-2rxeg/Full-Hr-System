"use client";

import { useAuth } from "@/app/context/AuthContext";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import Sidebar from "@/app/components/Sidebar";
import DashboardHeader from "@/app/components/DashboardHeader";
import { SystemRole } from "@/app/types";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, user, isLoading, getDashboardRoute } = useAuth();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();
  const isPayrollRoute = pathname?.includes('/payroll-tracking');


  useEffect(() => {
    if (isLoading) return;

    // Redirect to login if not authenticated
    if (!isAuthenticated || !user) {
      router.push('/login');
      return;
    }

    // Candidates should ONLY access their own dashboard
    // Block them from accessing any other dashboard route
    if (user.role === SystemRole.JOB_CANDIDATE) {
      const currentPath = window.location.pathname;
      const candidateDashboard = '/dashboard/job-candidate';
      
      // If candidate tries to access any other dashboard, redirect to their own
      if (!currentPath.startsWith(candidateDashboard)) {
        router.replace(candidateDashboard);
        return;
      }
    }

    // Employees should not access candidate dashboard
    if (user.role !== SystemRole.JOB_CANDIDATE) {
      const currentPath = window.location.pathname;
      const candidateDashboard = '/dashboard/job-candidate';
      
      if (currentPath.startsWith(candidateDashboard)) {
        router.replace(getDashboardRoute());
        return;
      }
    }
  }, [isAuthenticated, isLoading, user, router, getDashboardRoute]);

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-sm text-muted-foreground mt-4">Loading...</p>
        </div>
      </div>
    );
  }

  

  // Block rendering if not authenticated
  if (!isAuthenticated || !user) {
    return null;
  }

  // Block rendering if candidate tries to access other dashboards
  if (user.role === SystemRole.JOB_CANDIDATE) {
    const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';
    const candidateDashboard = '/dashboard/job-candidate';
    if (!currentPath.startsWith(candidateDashboard)) {
      return null; // Will redirect in useEffect
    }
  }

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <DashboardHeader onMenuClick={() => setSidebarOpen(!sidebarOpen)} />

        {/* Page Content */}
        <main className="flex-1 overflow-auto">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className={isPayrollRoute ? 'payroll-scope' : undefined}>
              {isPayrollRoute && (
                <style dangerouslySetInnerHTML={{ __html: `
                  /* Convert colorful/gradient headers to white cards with subtle border + shadow */
                  .payroll-scope .bg-gradient-to-r { background: #ffffff !important; color: #0f172a !important; border: 1px solid #e5e7eb !important; box-shadow: 0 1px 2px rgba(15,23,42,0.06) !important; border-radius: .5rem !important; }
                  .payroll-scope .bg-black, .payroll-scope .bg-slate-900, .payroll-scope .text-white { background: #ffffff !important; color: #0f172a !important; border: 1px solid #e5e7eb !important; box-shadow: 0 1px 2px rgba(15,23,42,0.06) !important; }
                  .payroll-scope .from-amber-600, .payroll-scope .to-amber-700, .payroll-scope .bg-amber-600, .payroll-scope .bg-amber-50, .payroll-scope .text-amber-100, .payroll-scope .text-amber-600, .payroll-scope .text-amber-700, .payroll-scope .text-orange-100, .payroll-scope .bg-orange-50, .payroll-scope .text-orange-700, .payroll-scope .bg-blue-50, .payroll-scope .text-blue-700, .payroll-scope .bg-green-50, .payroll-scope .text-green-600, .payroll-scope .bg-red-50, .payroll-scope .text-red-700, .payroll-scope .bg-purple-50, .payroll-scope .text-purple-600 {
                    background: transparent !important;
                    color: #0f172a !important;
                    border-color: #e5e7eb !important;
                  }
                  .payroll-scope .bg-white\/20 { background-color: rgba(255,255,255,0.06) !important; }
                  .payroll-scope .bg-white { background-color: #ffffff !important; color: #0f172a !important; }
                  .payroll-scope .text-amber-100, .payroll-scope .text-orange-100, .payroll-scope .text-blue-100, .payroll-scope .text-green-100, .payroll-scope .text-red-100, .payroll-scope .text-purple-100 { color: #6b7280 !important; }
                  /* Muted outlined badges for statuses (small accents only) */
                  .payroll-scope .bg-yellow-100.text-yellow-700, .payroll-scope .bg-yellow-100.text-yellow-700 span { background: transparent !important; color: #6b4b1f !important; border: 1px solid rgba(107,75,31,0.18) !important; }
                  .payroll-scope .bg-red-100.text-red-700 { background: transparent !important; color: #7a3b3b !important; border: 1px solid rgba(122,59,59,0.18) !important; }
                  .payroll-scope .bg-green-100.text-green-700 { background: transparent !important; color: #466a46 !important; border: 1px solid rgba(70,106,70,0.18) !important; }
                  .payroll-scope .group-hover\\:text-amber-700, .payroll-scope .group-hover\\:text-orange-700, .payroll-scope .group-hover\\:text-red-700 { color: #0f172a !important; }
                `}} />
              )}

              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
