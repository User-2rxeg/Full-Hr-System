'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { payrollTrackingService } from '@/app/services/payroll-tracking';
import {
  FileText,
  History,
  Receipt,
  Briefcase,
  Folder,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Calendar,
  DollarSign,
  ChevronRight,
  Download,
  Eye,
  ShieldCheck,
  CreditCard,
  PieChart,
  ArrowUpRight
} from 'lucide-react';
import {
  PortalPageHeader,
  PortalCard,
  PortalStatCard,
  PortalLoading,
  PortalBadge,
  PortalButton,
} from '@/components/portal';

interface RecentPayslip {
  id: string;
  periodEnd: string;
  netPay: number;
  status: string;
  currency: string;
}

export default function PortalPayrollTrackingPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [recentPayslips, setRecentPayslips] = useState<RecentPayslip[]>([]);
  const [stats, setStats] = useState({
    totalPayslips: 0,
    pendingClaims: 0,
    pendingDisputes: 0,
    lastPayslipDate: 'N/A',
    lastPayslipAmount: 0,
    ytdEarnings: 0,
    ytdDeductions: 0,
  });

  const fetchStats = async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    try {
      const payslipsResponse = await payrollTrackingService.getEmployeePayslips(user.id);
      const payslips = (payslipsResponse?.data as any[]) || [];

      const trackingResponse = await payrollTrackingService.trackClaimsAndDisputes(user.id);
      const tracking = (trackingResponse?.data as any) || { claims: [], disputes: [] };

      const pendingClaims = tracking.claims?.filter((c: any) => c.status === 'PENDING' || c.status === 'IN_REVIEW')?.length || 0;
      const pendingDisputes = tracking.disputes?.filter((d: any) => d.status === 'PENDING' || d.status === 'IN_REVIEW')?.length || 0;

      const lastPayslip = payslips[0];
      const currentYear = new Date().getFullYear();
      const ytdPayslips = payslips.filter((p: any) => new Date(p.periodEnd).getFullYear() === currentYear);
      const ytdEarnings = ytdPayslips.reduce((sum: number, p: any) => sum + (p.grossPay || 0), 0);
      const ytdDeductions = ytdPayslips.reduce((sum: number, p: any) => sum + (p.totalDeductions || 0), 0);

      const recent = payslips.slice(0, 3).map((p: any) => ({
        id: p.id || p._id,
        periodEnd: p.periodEnd,
        netPay: p.netPay || 0,
        status: p.status || 'paid',
        currency: p.currency || 'EGP',
      }));

      setRecentPayslips(recent);
      setStats({
        totalPayslips: payslips.length,
        pendingClaims,
        pendingDisputes,
        lastPayslipDate: lastPayslip?.periodEnd ? new Date(lastPayslip.periodEnd).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : 'N/A',
        lastPayslipAmount: lastPayslip?.netPay || 0,
        ytdEarnings,
        ytdDeductions,
      });
    } catch (error) {
      console.error('Error fetching payroll stats:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [user?.id]);

  const payrollFeatures = [
    {
      title: 'My Payslips',
      description: 'Monthly earnings breakdown',
      href: '/portal/payroll-tracking/payslips',
      Icon: FileText,
      color: 'primary',
    },
    {
      title: 'Salary History',
      description: 'Progression and changes',
      href: '/portal/payroll-tracking/salary-history',
      Icon: TrendingUp,
      color: 'accent',
    },
    {
      title: 'Deductions',
      description: 'Taxes, insurance & more',
      href: '/portal/payroll-tracking/deductions',
      Icon: Receipt,
      color: 'destructive',
    },
    {
      title: 'Contributions',
      description: 'Employer-paid benefits',
      href: '/portal/payroll-tracking/contributions',
      Icon: ShieldCheck,
      color: 'success',
    },
    {
      title: 'Tax Docs',
      description: 'Annual tax statements',
      href: '/portal/payroll-tracking/tax-documents',
      Icon: Folder,
      color: 'muted',
    },
    {
      title: 'Disputes',
      description: 'Claims and issue reporting',
      href: '/portal/payroll-tracking/claims-disputes',
      Icon: AlertCircle,
      color: 'warning',
    },
  ];

  if (loading) return <PortalLoading message="Decrypting financial records..." fullScreen />;

  return (
    <div className="min-h-screen bg-background p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <PortalPageHeader
          title="Payroll Tracking المركز المالي"
          description="Global overview of your compensation structure, tax compliance, and benefit allocations"
          breadcrumbs={[{ label: 'Payroll Tracking' }]}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <PortalStatCard
            title="Net Liquidity"
            value={`${stats.lastPayslipAmount.toLocaleString()} EGP`}
            subtitle={`Last deposit: ${stats.lastPayslipDate}`}
            icon={<CreditCard className="w-5 h-5" />}
            accentColor="primary"
          />
          <PortalStatCard
            title="YTD Gross Earnings"
            value={`${stats.ytdEarnings.toLocaleString()} EGP`}
            icon={<TrendingUp className="w-5 h-5" />}
            accentColor="accent"
          />
          <PortalStatCard
            title="YTD Total Deductions"
            value={`${stats.ytdDeductions.toLocaleString()} EGP`}
            icon={<TrendingDown className="w-5 h-5" />}
            accentColor="destructive"
          />
          <PortalStatCard
            title="Open Inquiries"
            value={stats.pendingClaims + stats.pendingDisputes}
            icon={<AlertCircle className="w-5 h-5" />}
            accentColor="warning"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {payrollFeatures.map((feature) => (
                <Link key={feature.href} href={feature.href}>
                  <PortalCard hover className="h-full group hover:border-primary/50 transition-all cursor-pointer">
                    <div className={`p-3 rounded-2xl w-fit mb-4 bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors`}>
                      <feature.Icon className="w-6 h-6" />
                    </div>
                    <h3 className="font-extrabold text-lg flex items-center gap-2">
                      {feature.title}
                      <ArrowUpRight className="w-4 h-4 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1">{feature.description}</p>
                  </PortalCard>
                </Link>
              ))}
            </div>

            <PortalCard>
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-primary/10 text-primary border border-primary/20"><History className="w-5 h-5" /></div>
                  <h3 className="font-black text-xl">Recent Activity</h3>
                </div>
                <Link href="/portal/payroll-tracking/payslips">
                  <PortalButton variant="ghost" size="sm" className="text-xs font-black uppercase tracking-widest">Global History</PortalButton>
                </Link>
              </div>

              <div className="space-y-3">
                {recentPayslips.length > 0 ? recentPayslips.map((payslip) => (
                  <div key={payslip.id} className="p-5 border border-border/50 rounded-2xl flex items-center justify-between hover:bg-muted/30 transition-all group">
                    <div className="flex items-center gap-5">
                      <div className="p-3 bg-background rounded-xl border border-border group-hover:border-primary/30 transition-colors">
                        <DollarSign className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-black text-foreground">{new Date(payslip.periodEnd).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</p>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.1em]">Settlement ID: {payslip.id.slice(-8).toUpperCase()}</p>
                      </div>
                    </div>
                    <div className="text-right flex items-center gap-6">
                      <div className="hidden sm:block">
                        <p className="font-black text-lg text-primary">{payslip.netPay.toLocaleString()} {payslip.currency}</p>
                        <PortalBadge variant={payslip.status === 'paid' ? 'success' : 'warning'} size="sm">{payslip.status.toUpperCase()}</PortalBadge>
                      </div>
                      <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                  </div>
                )) : <PortalEmptyState title="No Records" description="Financial history will appear after your first settlement cycle." />}
              </div>
            </PortalCard>
          </div>

          <div className="space-y-6">
            <PortalCard className="bg-gradient-to-br from-primary/5 to-accent/5 border-dashed border-2">
              <h3 className="font-bold mb-6 flex items-center gap-2 py-1 border-b border-primary/10"><PieChart className="w-4 h-4 text-primary" /> Net Breakdown</h3>
              <div className="space-y-6">
                <div className="space-y-2">
                  <div className="flex justify-between items-end">
                    <span className="text-[10px] font-black uppercase opacity-40">Liquidated Pay</span>
                    <span className="text-xs font-black">78%</span>
                  </div>
                  <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-primary" style={{ width: '78%' }}></div>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-end">
                    <span className="text-[10px] font-black uppercase opacity-40">Tax & Compliance</span>
                    <span className="text-xs font-black">15%</span>
                  </div>
                  <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-destructive" style={{ width: '15%' }}></div>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-end">
                    <span className="text-[10px] font-black uppercase opacity-40">Insurance & Benefits</span>
                    <span className="text-xs font-black">7%</span>
                  </div>
                  <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-accent" style={{ width: '7%' }}></div>
                  </div>
                </div>
              </div>
              <p className="mt-8 text-[10px] text-muted-foreground italic leading-relaxed">Percentages based on global YTD average including bonuses and deductions.</p>
            </PortalCard>

            <PortalCard>
               <h3 className="font-black text-xs uppercase tracking-[0.2em] text-primary mb-4">Support & Resource</h3>
               <div className="space-y-4">
                  <div className="flex gap-3 items-start p-3 hover:bg-muted/50 rounded-xl transition-colors cursor-pointer group">
                     <div className="p-2 rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-white transition-colors"><FileText className="w-4 h-4" /></div>
                     <div>
                        <p className="text-xs font-bold">Tax Filing Guide 2025</p>
                        <p className="text-[10px] text-muted-foreground">PDF Document • 4.2 MB</p>
                     </div>
                  </div>
                  <div className="flex gap-3 items-start p-3 hover:bg-muted/50 rounded-xl transition-colors cursor-pointer group">
                     <div className="p-2 rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-white transition-colors"><ShieldCheck className="w-4 h-4" /></div>
                     <div>
                        <p className="text-xs font-bold">Insurance Coverage Detail</p>
                        <p className="text-[10px] text-muted-foreground">Internal Portal Link</p>
                     </div>
                  </div>
               </div>
            </PortalCard>
          </div>
        </div>
      </div>
    </div>
  );
}
            value={stats.lastPayslipDate}
            subtitle={stats.lastPayslipAmount > 0 ? `EGP ${stats.lastPayslipAmount.toLocaleString()}` : undefined}
            icon={<Calendar className="h-5 w-5" />}
            accentColor="accent"
          />
          <PortalStatCard
            title="YTD Earnings"
            value={`EGP ${stats.ytdEarnings.toLocaleString()}`}
            icon={<TrendingUp className="h-5 w-5" />}
            accentColor="accent"
          />
          <PortalStatCard
            title="YTD Deductions"
            value={`EGP ${stats.ytdDeductions.toLocaleString()}`}
            icon={<TrendingDown className="h-5 w-5" />}
            accentColor="destructive"
          />
        </div>

        {/* Pending Items Alert */}
        {(stats.pendingClaims > 0 || stats.pendingDisputes > 0) && (
          <PortalCard className="bg-warning/5 border-warning/20">
            <div className="flex items-center gap-4 p-4">
              <div className="w-10 h-10 rounded-full bg-warning/10 flex items-center justify-center">
                <AlertCircle className="h-5 w-5 text-warning" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-foreground">You have pending items</p>
                <p className="text-sm text-muted-foreground">
                  {stats.pendingClaims > 0 && `${stats.pendingClaims} pending claim(s)`}
                  {stats.pendingClaims > 0 && stats.pendingDisputes > 0 && ' and '}
                  {stats.pendingDisputes > 0 && `${stats.pendingDisputes} pending dispute(s)`}
                </p>
              </div>
              <Link href="/portal/payroll-tracking/claims-disputes">
                <PortalButton variant="outline" size="sm">
                  View Details
                  <ChevronRight className="h-4 w-4" />
                </PortalButton>
              </Link>
            </div>
          </PortalCard>
        )}

        {/* Recent Payslips */}
        {recentPayslips.length > 0 && (
          <PortalCard padding="none">
            <div className="p-6 border-b border-border">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-foreground">Recent Payslips</h2>
                <Link href="/portal/payroll-tracking/payslips">
                  <PortalButton variant="ghost" size="sm">
                    View All
                    <ChevronRight className="h-4 w-4" />
                  </PortalButton>
                </Link>
              </div>
            </div>
            <div className="divide-y divide-border">
              {recentPayslips.map((payslip) => (
                <div
                  key={payslip.id}
                  className="p-4 flex items-center justify-between hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <FileText className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">
                        {new Date(payslip.periodEnd).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Net Pay: {payslip.currency} {payslip.netPay.toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <PortalBadge variant="success">{payslip.status}</PortalBadge>
                    <PortalButton
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedPayslip(payslip)}
                    >
                      <Eye className="h-4 w-4" />
                    </PortalButton>
                    <PortalButton
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDownload(payslip.id)}
                    >
                      <Download className="h-4 w-4" />
                    </PortalButton>
                  </div>
                </div>
              ))}
            </div>
          </PortalCard>
        )}

        {/* Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {payrollFeatures.map((feature) => (
            <Link key={feature.href} href={feature.href}>
              <PortalCard hover className="h-full group">
                <div className="flex items-start gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110 ${
                    feature.color === 'primary' ? 'bg-primary/10 text-primary' :
                    feature.color === 'accent' ? 'bg-accent/10 text-accent-foreground' :
                    feature.color === 'destructive' ? 'bg-destructive/10 text-destructive' :
                    feature.color === 'warning' ? 'bg-warning/10 text-warning' :
                    'bg-muted text-muted-foreground'
                  }`}>
                    <feature.Icon className="h-6 w-6" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                      {feature.title}
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      {feature.description}
                    </p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                </div>
              </PortalCard>
            </Link>
          ))}
        </div>

        {/* Quick Help */}
        <PortalCard className="bg-gradient-to-r from-primary/5 to-accent/5">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <DollarSign className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-foreground">Need Help?</h3>
              <p className="text-sm text-muted-foreground">
                If you have questions about your payroll, contact HR or submit a claim through the Claims & Disputes section.
              </p>
            </div>
          </div>
        </PortalCard>
      </div>

      {/* Payslip Quick View Modal */}
      <PortalModal
        isOpen={!!selectedPayslip}
        onClose={() => setSelectedPayslip(null)}
        title="Payslip Details"
        description={selectedPayslip ? new Date(selectedPayslip.periodEnd).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : ''}
        size="md"
        footer={
          <>
            <PortalButton variant="outline" onClick={() => setSelectedPayslip(null)}>
              Close
            </PortalButton>
            <PortalButton onClick={() => selectedPayslip && handleDownload(selectedPayslip.id)}>
              <Download className="h-4 w-4" />
              Download
            </PortalButton>
          </>
        }
      >
        {selectedPayslip && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground">Net Pay</p>
                <p className="text-2xl font-bold text-foreground">
                  {selectedPayslip.currency} {selectedPayslip.netPay.toLocaleString()}
                </p>
              </div>
              <div className="p-4 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground">Status</p>
                <div className="mt-1">
                  <PortalBadge variant="success" size="md">{selectedPayslip.status}</PortalBadge>
                </div>
              </div>
            </div>
            <div className="pt-4 border-t border-border">
              <Link href={`/portal/payroll-tracking/payslips`}>
                <PortalButton variant="outline" className="w-full">
                  View Full Details
                  <ChevronRight className="h-4 w-4" />
                </PortalButton>
              </Link>
            </div>
          </div>
        )}
      </PortalModal>
    </div>
  );
}
