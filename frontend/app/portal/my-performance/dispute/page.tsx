'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { performanceService } from '@/app/services/performance';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

interface AppraisalRecord {
  _id: string;
  assignmentId: string;
  cycleId: {
    _id: string;
    name: string;
  };
  overallRating: number;
  ratings: {
    criterionKey: string;
    score: number;
    comment?: string;
  }[];
  strengths?: string;
  areasForImprovement?: string;
  developmentPlan?: string;
  managerComments?: string;
  managerId?: {
    firstName: string;
    lastName: string;
  };
  publishedAt?: string;
  status: string;
}

function DisputeContent() {
  const searchParams = useSearchParams();
  const appraisalId = searchParams.get('appraisalId');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [record, setRecord] = useState<AppraisalRecord | null>(null);

  const [formData, setFormData] = useState({
    reason: '',
    specificConcerns: '',
    expectedOutcome: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (appraisalId) {
      fetchAppraisalDetails();
    } else {
      setLoading(false);
    }
  }, [appraisalId]);

  const fetchAppraisalDetails = async () => {
    try {
      setLoading(true);
      const response = await performanceService.getRecordById(appraisalId!);
      if (response.error) {
        setError(response.error);
        return;
      }
      setRecord(response.data as AppraisalRecord);
    } catch (err: any) {
      setError(err.message || 'Failed to load appraisal details');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.reason.trim()) {
      toast.error('Please provide a validation reason');
      return;
    }
    try {
      setIsSubmitting(true);
      const response = await performanceService.fileDispute({
        recordId: appraisalId!,
        reason: `${formData.reason}\n\nConcerns:\n${formData.specificConcerns}\n\nOutcome:\n${formData.expectedOutcome}`.trim(),
      });
      if (response.error) {
        toast.error(response.error);
        return;
      }
      setSuccess(true);
      toast.success('Dispute registered in the audit trail');
    } catch (err: any) {
      toast.error(err.message || 'Transmission failure');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isWithinWindow = () => {
    if (!record?.publishedAt) return false;
    const diff = Math.floor((new Date().getTime() - new Date(record.publishedAt).getTime()) / (86400000));
    return diff <= 7;
  };

  if (loading) return <div className="flex justify-center py-24"><div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" /></div>;

  if (success) {
    return (
      <div className="max-w-2xl mx-auto py-12 text-center space-y-6">
        <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mx-auto border border-green-500/20">
          <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" /></svg>
        </div>
        <h2 className="text-3xl font-black text-foreground uppercase tracking-tight">Registry Entry Created</h2>
        <p className="text-muted-foreground font-medium">Your formal inquiry has been logged in the system. Human Resources will initiate an audit of the appraisal cycle within standard SLA windows.</p>
        <Button asChild size="lg" className="rounded-full px-8">
          <Link href="/portal/my-performance">Return to Hub</Link>
        </Button>
      </div>
    );
  }

  if (!appraisalId || !record) {
    return (
      <div className="max-w-2xl mx-auto py-12 text-center space-y-4">
        <h2 className="text-2xl font-black text-foreground uppercase tracking-tight">Resource Not Found</h2>
        <p className="text-muted-foreground">The requested appraisal record could not be retrieved from the central registry.</p>
        <Button asChild variant="outline"><Link href="/portal/my-performance">Back to Performance</Link></Button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">
          <Link href="/portal/my-performance" className="hover:text-foreground">My Performance</Link>
          <span>/</span>
          <span>Formal Inquiry</span>
        </div>
        <h1 className="text-4xl font-black text-foreground tracking-tight uppercase">Rating Validation</h1>
        <p className="text-muted-foreground font-medium">Initiate a formal audit request for cycle: <span className="text-foreground font-bold">{record.cycleId.name}</span></p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          {!isWithinWindow() ? (
            <div className="bg-destructive/10 border border-destructive/20 p-6 rounded-2xl flex items-start gap-4">
              <svg className="w-6 h-6 text-destructive mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeWidth={2} /></svg>
              <div>
                <h4 className="font-black uppercase tracking-tight text-destructive">Window Expired</h4>
                <p className="text-sm font-medium text-destructive/80 mt-1">Numerical validation requests must be filed within 7 cycles of publication. Standard audit protocols no longer apply.</p>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="bg-card border border-border rounded-2xl p-8 space-y-6 shadow-sm">
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Primary Grounds for Inquiry</label>
                  <Textarea
                    required
                    value={formData.reason}
                    onChange={(e) => setFormData(p => ({ ...p, reason: e.target.value }))}
                    placeholder="Explain the objective basis for this validation request..."
                    className="min-h-[120px] bg-muted/20"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Specific Criteria Conflicts</label>
                  <Textarea
                    value={formData.specificConcerns}
                    onChange={(e) => setFormData(p => ({ ...p, specificConcerns: e.target.value }))}
                    placeholder="Identify specific KPIs or behavioral criteria..."
                    className="min-h-[100px] bg-muted/20"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Desired Resolution</label>
                  <Textarea
                    value={formData.expectedOutcome}
                    onChange={(e) => setFormData(p => ({ ...p, expectedOutcome: e.target.value }))}
                    placeholder="Proposed corrective action..."
                    className="bg-muted/20"
                  />
                </div>
              </div>
              <div className="pt-4 border-t border-border flex justify-end gap-3">
                <Button variant="ghost" asChild><Link href="/portal/my-performance">Discard</Link></Button>
                <Button type="submit" disabled={isSubmitting || !isWithinWindow()}>
                  {isSubmitting ? 'Transmitting...' : 'Register Formal Dispute'}
                </Button>
              </div>
            </form>
          )}
        </div>

        <div className="space-y-6">
          <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Record Context</h3>
            <div className="flex items-center gap-4 py-2 border-b border-border">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center font-black text-primary border border-primary/20">
                {record.overallRating.toFixed(1)}
              </div>
              <div>
                <p className="text-xs font-black uppercase tracking-tight">Current Score</p>
                <p className="text-[10px] font-medium text-muted-foreground uppercase">{record.status}</p>
              </div>
            </div>
            <div className="space-y-3">
              <div className="text-[10px] space-y-1">
                <p className="font-black text-muted-foreground tracking-widest uppercase">Lead Auditor</p>
                <p className="font-bold text-foreground">{record.managerId?.firstName} {record.managerId?.lastName}</p>
              </div>
              <div className="text-[10px] space-y-1">
                <p className="font-black text-muted-foreground tracking-widest uppercase">Publication Date</p>
                <p className="font-bold text-foreground">{record.publishedAt ? new Date(record.publishedAt).toLocaleDateString() : 'Pending'}</p>
              </div>
            </div>
          </div>

          <div className="bg-slate-900 text-white rounded-2xl p-6 space-y-4 shadow-xl">
            <svg className="w-6 h-6 text-primary" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" /></svg>
            <div className="space-y-1">
              <h4 className="text-xs font-black uppercase tracking-widest">Audit Protocol</h4>
              <p className="text-[11px] font-medium text-slate-400 leading-relaxed">System-logged disputes trigger a mandatory HR re-evaluation. All rater comments and evidence will be scrutinized by the performance governance board.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DisputePage() {
  return (
    <Suspense fallback={<div className="flex justify-center py-24"><div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" /></div>}>
      <DisputeContent />
    </Suspense>
  );
}
