'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import {
  getOffers,
  getCandidateById,
  getApplicationById,
  getJobById,
  getInterviews,
  getApplicationHistory,
  getFeedbackByApplication
} from '@/app/services/recruitment';
import { useAuth } from '@/app/context/AuthContext';
import { JobOffer, Candidate, Application, JobRequisition, Interview } from '@/app/types/recruitment';
import { LoadingSpinner } from '@/app/components/ui/loading-spinner';

// ==================== INTERFACES ====================
interface OfferDisplay {
  id: string;
  applicationId: string;
  candidateId: string;
  candidateName: string;
  candidateEmail: string;
  jobTitle: string;
  department: string;
  salary: number;
  signingBonus?: number;
  benefits?: string[];
  deadline: string;
  status: 'pending_approval' | 'approved' | 'rejected' | 'sent' | 'signed' | 'accepted' | 'declined';
  createdAt: string;
  approvers: Array<{
    employeeId: string;
    role: string;
    status: string;
    actionDate?: string;
    comment?: string;
  }>;
  approvedBy?: string;
  approvedAt?: string;
  rejectionReason?: string;
  rawOffer: JobOffer;
  // Additional data for recruiter view
  interviews?: Interview[];
  candidatePipeline?: any;
  feedbacks?: any[];
}

// ==================== MAIN COMPONENT ====================
export default function RecruiterOffersPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [offers, setOffers] = useState<OfferDisplay[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('all');

  // Helper to map API status to local status
  const mapOfferStatus = (
    finalStatus?: string,
    applicantResponse?: string,
    candidateSignedAt?: string,
  ): OfferDisplay['status'] => {
    if (applicantResponse === 'accepted') return 'accepted';
    if (candidateSignedAt) return 'signed';
    if (applicantResponse === 'rejected') return 'declined';
    if (finalStatus === 'rejected') return 'rejected';
    if (finalStatus === 'approved') return 'approved';
    if (finalStatus === 'sent') return 'sent';
    return 'pending_approval';
  };

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const offersData = await getOffers();

      // Use populated data from backend, with fallbacks for manual fetching if needed
      const transformedOffers: OfferDisplay[] = await Promise.all(
        offersData.map(async (offer: any) => {
          // Use populated candidate data if available
          let candidateName = 'Unknown Candidate';
          let candidateEmail = '';
          if (offer.candidateData) {
            candidateName = offer.candidateData.fullName || 
              `${offer.candidateData.firstName || ''} ${offer.candidateData.lastName || ''}`.trim() || 
              'Unknown Candidate';
            candidateEmail = offer.candidateData.personalEmail || '';
          } else if (offer.candidateId) {
            // Fallback: fetch candidate if not populated
            try {
              const candidate = await getCandidateById(offer.candidateId);
              candidateName = candidate.fullName || `${candidate.firstName} ${candidate.lastName}`;
              candidateEmail = candidate.personalEmail || '';
            } catch {
              candidateName = offer.candidateName || 'Unknown Candidate';
            }
          }

          // Use populated application data if available
          let jobTitle = offer.role || 'Unknown Position';
          let department = '';
          let interviews: Interview[] = [];
          let candidatePipeline: any = null;
          let feedbacks: any[] = [];

          if (offer.applicationData) {
            // Extract job title from nested application data (application -> requisition -> template)
            const requisition = offer.applicationData.requisitionId;
            if (requisition && typeof requisition === 'object') {
              jobTitle = requisition.title || requisition.templateTitle || 
                        (requisition.templateId && typeof requisition.templateId === 'object'
                          ? (requisition.templateId.title || requisition.templateId.templateTitle)
                          : undefined) ||
                        offer.role || 
                        'Unknown Position';
              department = requisition.department ||
                          (requisition.templateId && typeof requisition.templateId === 'object'
                            ? requisition.templateId.department
                            : '') ||
                          '';
            }
          } else if (offer.applicationId) {
            // Fallback: fetch application and job if not populated
            try {
              const application = await getApplicationById(offer.applicationId);
              if (application.requisitionId) {
                const job = await getJobById(application.requisitionId);
                jobTitle = job.templateTitle || offer.role || 'Unknown Position';
                department = application.departmentName || '';
              }
            } catch {
              jobTitle = offer.positionTitle || offer.role || 'Unknown Position';
              department = offer.departmentName || '';
            }
          }

          // Fetch interviews for this application
          if (offer.applicationId) {
            try {
              interviews = await getInterviews({ applicationId: offer.applicationId });
            } catch {
              // Interviews might not be available
            }

            // Fetch feedback for this application
            try {
              feedbacks = await getFeedbackByApplication(offer.applicationId);
            } catch {
              // Feedback might not be available
            }

            // Fetch application history (candidate pipeline)
            try {
              const history = await getApplicationHistory(offer.applicationId);
              candidatePipeline = history;
            } catch {
              // History might not be available
            }
          }

          // Check if any approver has approved/rejected
          const approvedApprover = offer.approvers?.find((a: any) => a.status === 'approved');
          const rejectedApprover = offer.approvers?.find((a: any) => a.status === 'rejected');

          return {
            id: offer.id,
            applicationId: offer.applicationId,
            candidateId: offer.candidateId,
            candidateName,
            candidateEmail,
            jobTitle,
            department,
            salary: offer.grossSalary || 0,
            signingBonus: offer.signingBonus,
            benefits: offer.benefits,
            deadline: offer.deadline || '',
            status: mapOfferStatus(offer.finalStatus, offer.applicantResponse, offer.candidateSignedAt),
            createdAt: offer.createdAt || '',
            approvers: offer.approvers || [],
            approvedBy: approvedApprover?.employeeId,
            approvedAt: approvedApprover?.actionDate,
            rejectionReason: rejectedApprover?.comment,
            rawOffer: offer,
            interviews,
            candidatePipeline,
            feedbacks,
          };
        })
      );

      setOffers(transformedOffers);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load offers');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ==================== FILTERING ====================
  const filteredOffers = offers.filter((offer) => {
    if (filter === 'all') return true;
    if (filter === 'pending') return offer.status === 'pending_approval';
    if (filter === 'approved') return offer.status === 'approved';
    if (filter === 'sent') return offer.status === 'sent';
    if (filter === 'signed') return offer.status === 'signed';
    if (filter === 'accepted') return offer.status === 'accepted';
    if (filter === 'rejected') return offer.status === 'rejected' || offer.status === 'declined';
    return true;
  });

  // ==================== STATUS HELPERS ====================
  const getStatusBadge = (status: OfferDisplay['status']) => {
    // Black/White theme styles
    const styles: Record<OfferDisplay['status'], string> = {
      pending_approval: 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700',
      approved: 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-400 dark:border-slate-600',
      rejected: 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400 border border-slate-400 dark:border-slate-600',
      sent: 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700',
      signed: 'bg-slate-700 dark:bg-slate-300 text-white dark:text-black border border-slate-800 dark:border-slate-400 font-semibold',
      accepted: 'bg-black dark:bg-white text-white dark:text-black border border-black dark:border-white font-bold',
      declined: 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400 border border-slate-400 dark:border-slate-600',
    };
    const labels: Record<OfferDisplay['status'], string> = {
      pending_approval: 'Pending Approval',
      approved: 'Approved',
      rejected: 'Rejected',
      sent: 'Sent to Candidate',
      signed: 'Digitally Signed',
      accepted: 'Accepted',
      declined: 'Declined',
    };
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${styles[status]}`}>
        {labels[status]}
      </span>
    );
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-EG', { style: 'currency', currency: 'EGP' }).format(amount);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return dateString;
    }
  };

  // ==================== RENDER ====================
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center space-y-4">
        <p className="text-slate-800 dark:text-slate-200">{error}</p>
        <Button onClick={fetchData}>Retry</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm text-slate-500 mb-2">
            <Link href="/dashboard/recruiter/recruitment" className="hover:text-slate-700">
              Recruitment
            </Link>
            <span>/</span>
            <span>Offers</span>
          </div>
          <h1 className="text-2xl font-semibold text-slate-900">Offer Management</h1>
          <p className="text-sm text-slate-500 mt-1">View and manage job offers</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          // Black/White theme
          { label: 'Pending', count: offers.filter((o) => o.status === 'pending_approval').length, color: 'bg-slate-200 dark:bg-slate-700' },
          { label: 'Approved', count: offers.filter((o) => o.status === 'approved').length, color: 'bg-slate-400 dark:bg-slate-600' },
          { label: 'Sent', count: offers.filter((o) => o.status === 'sent').length, color: 'bg-slate-500 dark:bg-slate-500' },
          { label: 'Signed', count: offers.filter((o) => o.status === 'signed').length, color: 'bg-slate-700 dark:bg-slate-300' },
          { label: 'Accepted', count: offers.filter((o) => o.status === 'accepted').length, color: 'bg-black dark:bg-white' },
        ].map((stat) => (
          <div
            key={stat.label}
            className={`bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-4 cursor-pointer hover:shadow-md transition-shadow ${filter === stat.label.toLowerCase() ? 'ring-2 ring-black dark:ring-white' : ''
              }`}
            onClick={() => setFilter(stat.label.toLowerCase())}
          >
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${stat.color}`}></div>
              <span className="text-sm text-slate-600">{stat.label}</span>
            </div>
            <p className="text-2xl font-bold text-slate-900 mt-1">{stat.count}</p>
          </div>
        ))}
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 border-b border-slate-200 overflow-x-auto">
        {['all', 'pending', 'approved', 'sent', 'signed', 'accepted', 'rejected'].map((tab) => (
          <button
            key={tab}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${filter === tab
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            onClick={() => setFilter(tab)}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Main Content */}
      <div className="space-y-4">
        {filteredOffers.length === 0 ? (
          <Card>
            <div className="text-center py-12">
              <svg className="w-12 h-12 text-slate-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-slate-500">No offers found</p>
            </div>
          </Card>
        ) : (
          filteredOffers.map((offer) => (
            <Card key={offer.id} className="hover:shadow-md transition-shadow">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-slate-900">{offer.candidateName}</h3>
                    {getStatusBadge(offer.status)}
                  </div>
                  <p className="text-sm text-slate-600 mb-2">{offer.candidateEmail}</p>
                  <div className="flex flex-wrap gap-4 text-sm text-slate-500">
                    <span className="flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      {offer.jobTitle}
                    </span>
                    <span className="flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                      {offer.department}
                    </span>
                    <span className="flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {formatCurrency(offer.salary)}/month
                    </span>
                    <span className="flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      Deadline: {formatDate(offer.deadline)}
                    </span>
                  </div>
                  {offer.interviews && offer.interviews.length > 0 && (
                    <div className="mt-2 text-xs text-slate-500">
                      Interviews: {offer.interviews.length} scheduled
                    </div>
                  )}
                  {offer.candidatePipeline && (
                    <div className="mt-2 text-xs text-slate-500">
                      Pipeline: {offer.candidatePipeline.length} status changes
                    </div>
                  )}
                  {offer.signingBonus && offer.signingBonus > 0 && (
                    <p className="mt-2 text-sm text-emerald-600 bg-emerald-50 px-3 py-1 rounded inline-block">
                      Signing Bonus: {formatCurrency(offer.signingBonus)}
                    </p>
                  )}
                  {offer.rejectionReason && (
                    <p className="mt-2 text-sm text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 px-3 py-1 rounded">
                      Reason: {offer.rejectionReason}
                    </p>
                  )}
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => router.push(`/dashboard/recruiter/recruitment/offers/${offer.id}`)}
                  >
                    View Details
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => router.push(`/dashboard/recruiter/recruitment/applications/${offer.applicationId}`)}
                  >
                    View Application
                  </Button>
                </div>
              </div>

              {/* Meta */}
              <div className="flex items-center gap-4 mt-4 pt-4 border-t border-slate-100 text-xs text-slate-400">
                <span>Created: {formatDate(offer.createdAt)}</span>
                {offer.approvers && offer.approvers.length > 0 && (
                  <>
                    <span>•</span>
                    <span>
                      Approvers: {offer.approvers.map(a => `${a.role} (${a.status})`).join(', ')}
                    </span>
                  </>
                )}
                {offer.approvedBy && offer.approvedAt && (
                  <>
                    <span>•</span>
                    <span>Approved: {formatDate(offer.approvedAt)}</span>
                  </>
                )}
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}

