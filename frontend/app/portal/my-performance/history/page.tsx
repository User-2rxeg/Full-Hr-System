'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { performanceService } from '@/app/services/performance';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface AppraisalRecord {
  _id: string;
  cycleId: {
    _id: string;
    name: string;
    cycleType: string;
    startDate: string;
    endDate: string;
  };
  templateId?: {
    name: string;
    templateType: string;
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
  status: string;
  publishedAt?: string;
  acknowledgedAt?: string;
  createdAt: string;
}

export default function AppraisalHistoryPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [records, setRecords] = useState<AppraisalRecord[]>([]);
  const [selectedRecord, setSelectedRecord] = useState<AppraisalRecord | null>(null);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const response = await performanceService.getAppraisalHistory();
      if (response.error) {
        setError(response.error);
        return;
      }
      const data = response.data;
      if (Array.isArray(data)) {
        setRecords(data as AppraisalRecord[]);
      } else if (data && typeof data === 'object' && 'data' in data) {
        setRecords((data as { data: AppraisalRecord[] }).data);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load appraisal history');
    } finally {
      setLoading(false);
    }
  };

  const getRatingColor = (rating: number) => {
    if (rating >= 4.5) return 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20';
    if (rating >= 3.5) return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20';
    if (rating >= 2.5) return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20';
    return 'bg-destructive/10 text-destructive border-destructive/20';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PUBLISHED': return 'bg-green-500/10 text-green-600 border-green-500/20';
      case 'ACKNOWLEDGED': return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
      case 'DISPUTED': return 'bg-destructive/10 text-destructive border-destructive/20';
      default: return 'bg-muted text-muted-foreground border-border';
    }
  };

  const trendData = records
    .filter(r => r.overallRating)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    .slice(-6);

  const averageRating = records.length > 0
    ? records.reduce((sum, r) => sum + (r.overallRating || 0), 0) / records.length
    : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Retrieving historical records...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
            <Link href="/portal/my-performance" className="hover:text-foreground">My Performance</Link>
            <span>/</span>
            <span className="text-foreground">History</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground">Archive Registry</h1>
          <p className="text-muted-foreground mt-1">Multi-cycle performance documentation and longitudinal trends</p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/portal/my-performance">Back to Hub</Link>
        </Button>
      </div>

      {error && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
          <p className="text-sm font-medium text-destructive">{error}</p>
        </div>
      )}

      {/* Stats Cluster */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Cycles', value: records.length, bg: 'bg-muted' },
          { label: 'Mean Score', value: averageRating.toFixed(2), bg: 'bg-primary/5 text-primary' },
          { label: 'Peak Performance', value: records.length ? Math.max(...records.map(r => r.overallRating)).toFixed(2) : '--', bg: 'bg-green-500/10 text-green-600' },
          { label: 'Lifecycle Status', value: 'ACTIVE', bg: 'bg-blue-500/10 text-blue-600' },
        ].map((stat, i) => (
          <div key={i} className={`border border-border rounded-xl p-5 ${stat.bg}`}>
            <p className="text-[10px] font-black uppercase tracking-widest opacity-60">{stat.label}</p>
            <p className="text-2xl font-black mt-1">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Trend Analysis */}
      {trendData.length > 1 && (
        <div className="bg-card border border-border rounded-xl p-8">
          <h3 className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground mb-10 text-center">Longitudinal Velocity</h3>
          <div className="flex items-end justify-between gap-4 h-32 px-4 sm:px-12">
            {trendData.map((record, index) => {
              const heightPercent = (record.overallRating / 5) * 100;
              return (
                <div key={record._id} className="flex-1 flex flex-col items-center group relative">
                  <div className="absolute bottom-full mb-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Badge className="font-black text-[10px]">{record.overallRating.toFixed(2)}</Badge>
                  </div>
                  <div
                    className={`w-full max-w-[24px] sm:max-w-[40px] rounded-t-full transition-all duration-500 ease-out border-x border-t ${getRatingColor(record.overallRating)}`}
                    style={{ height: `${heightPercent}%` }}
                  ></div>
                  <div className="mt-4 text-center">
                    <p className="text-[9px] font-black uppercase tracking-tighter text-muted-foreground truncate max-w-[60px]">{record.cycleId?.name}</p>
                    <p className="text-[8px] font-medium text-slate-400">{new Date(record.createdAt).getFullYear()}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Historical List */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-border bg-muted/30">
          <h3 className="font-black text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Record Ledger</h3>
        </div>
        <div className="divide-y divide-border">
          {records.length === 0 ? (
            <div className="p-16 text-center opacity-40">
              <p className="text-sm font-bold uppercase tracking-widest">Registry is empty</p>
            </div>
          ) : (
            records.map((record) => (
              <div
                key={record._id}
                className="p-6 hover:bg-muted/20 transition-all cursor-pointer group"
                onClick={() => setSelectedRecord(record)}
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-6">
                    <div className={`w-14 h-14 rounded-full border-2 flex flex-col items-center justify-center transition-transform group-hover:scale-110 ${getRatingColor(record.overallRating)}`}>
                      <span className="text-xl font-black">{record.overallRating?.toFixed(1)}</span>
                      <span className="text-[8px] font-black opacity-60">SCORE</span>
                    </div>
                    <div>
                      <h4 className="font-bold text-foreground group-hover:text-primary transition-colors uppercase tracking-tight">
                        {record.cycleId?.name}
                      </h4>
                      <p className="text-xs font-semibold text-muted-foreground uppercase opacity-80 mt-0.5">
                        {record.templateId?.name || 'Standard Review'}
                      </p>
                      <div className="flex items-center gap-4 mt-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
                        <span>{new Date(record.publishedAt || record.createdAt).toLocaleDateString()}</span>
                        {record.managerId && <span className="opacity-60">Reviewed by {record.managerId.firstName}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className={`font-black ${getStatusColor(record.status)}`}>{record.status}</Badge>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Detail Dialog */}
      <Dialog open={!!selectedRecord} onOpenChange={(open) => !open && setSelectedRecord(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black uppercase tracking-tight">{selectedRecord?.cycleId?.name}</DialogTitle>
            <DialogDescription className="font-bold uppercase tracking-widest text-[10px]">Registry Retrieval Record</DialogDescription>
          </DialogHeader>

          <div className="space-y-8 py-6">
            <div className="flex items-center gap-8 p-6 bg-muted/30 rounded-2xl border border-border">
              <div className={`w-24 h-24 rounded-full border-4 flex flex-col items-center justify-center bg-card shadow-lg ${getRatingColor(selectedRecord?.overallRating || 0)}`}>
                <span className="text-4xl font-black">{selectedRecord?.overallRating?.toFixed(2)}</span>
                <span className="text-[9px] font-black opacity-60">FINAL</span>
              </div>
              <div className="space-y-1">
                <p className="text-xl font-black text-foreground uppercase tracking-tight">Executive Summary</p>
                <p className="text-sm font-medium text-muted-foreground italic">"{selectedRecord?.managerComments || 'No qualitative summary provided.'}"</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-green-600 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-green-500"></span>
                  Key Strengths
                </h4>
                <p className="text-sm font-medium text-foreground bg-muted/20 p-4 rounded-xl border border-border">{selectedRecord?.strengths || 'N/A'}</p>
              </div>
              <div className="space-y-3">
                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-600 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                  Growth Vectors
                </h4>
                <p className="text-sm font-medium text-foreground bg-muted/20 p-4 rounded-xl border border-border">{selectedRecord?.areasForImprovement || 'N/A'}</p>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-600 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                Strategic Evolution Plan
              </h4>
              <div className="bg-muted p-6 rounded-xl text-sm font-medium leading-relaxed">
                {selectedRecord?.developmentPlan || 'No formal development plan logged for this cycle.'}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
