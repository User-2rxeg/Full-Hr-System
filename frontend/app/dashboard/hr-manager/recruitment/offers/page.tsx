'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  getOffers,
  approveOffer,
  rejectOffer,
  sendOffer,
  getCandidateById,
  getApplicationById,
  getJobById,
  triggerPreboarding,
  getFeedbackByApplication
} from '@/app/services/recruitment';
import { useAuth } from '@/context/AuthContext';
import { JobOffer} from '@/types/recruitment';



// ==================== INTERFACES ====================
// Local display interface that combines offer + denormalized data
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
  // Raw offer data for API calls
  rawOffer: JobOffer;
}

interface CommunicationLog {
  id: string;
  offerId: string;
  type: 'email' | 'system' | 'note';
  message: string;
  timestamp: string;
  user: string;
}

// ==================== MAIN COMPONENT ====================
export default function OffersPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [offers, setOffers] = useState<OfferDisplay[]>([]);
  const [logs, setLogs] = useState<CommunicationLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('all');
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedOffer, setSelectedOffer] = useState<OfferDisplay | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showLogsPanel, setShowLogsPanel] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [triggeringPreboarding, setTriggeringPreboarding] = useState<string | null>(null);
  const [showPreboardingModal, setShowPreboardingModal] = useState(false);
  const [preboardingOffer, setPreboardingOffer] = useState<OfferDisplay | null>(null);

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
          };
        })
      );

      setOffers(transformedOffers);
      setLogs([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load offers');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ==================== HANDLERS ====================
  const handleApprove = (offer: OfferDisplay) => {
    setSelectedOffer(offer);
    setShowApprovalModal(true);
  };

  const handleReject = (offer: OfferDisplay) => {
    setSelectedOffer(offer);
    setRejectionReason('');
    setShowRejectModal(true);
  };

  const confirmApproval = async () => {
    if (!selectedOffer || !user) return;

    try {
      setProcessing(true);
      setError(null);

      await approveOffer(selectedOffer.id, user.id);

      setOffers((prev) =>
        prev.map((o) =>
          o.id === selectedOffer.id
            ? {
              ...o,
              status: 'approved',
              approvedBy: `${user.firstName} ${user.lastName}`,
              approvedAt: new Date().toISOString().split('T')[0],
            }
            : o
        )
      );

      // Add log
      const newLog: CommunicationLog = {
        id: Date.now().toString(),
        offerId: selectedOffer.id,
        type: 'system',
        message: 'Offer approved by HR Manager',
        timestamp: new Date().toLocaleString(),
        user: 'HR Manager',
      };
      setLogs((prev) => [newLog, ...prev]);

      setShowApprovalModal(false);
      setSelectedOffer(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to approve offer');
    } finally {
      setProcessing(false);
    }
  };

  const confirmRejection = async () => {
    if (!selectedOffer || !rejectionReason.trim() || !user) return;

    try {
      setProcessing(true);
      setError(null);

      await rejectOffer(selectedOffer.id, user.id, rejectionReason);

      setOffers((prev) =>
        prev.map((o) =>
          o.id === selectedOffer.id
            ? { ...o, status: 'rejected', rejectionReason }
            : o
        )
      );

      // Add log
      const newLog: CommunicationLog = {
        id: Date.now().toString(),
        offerId: selectedOffer.id,
        type: 'system',
        message: `Offer rejected: ${rejectionReason}`,
        timestamp: new Date().toLocaleString(),
        user: `${user.firstName} ${user.lastName}`,
      };
      setLogs((prev) => [newLog, ...prev]);

      setShowRejectModal(false);
      setSelectedOffer(null);
      setRejectionReason('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reject offer');
    } finally {
      setProcessing(false);
    }
  };

  const handleSendOffer = async (offer: OfferDisplay) => {
    try {
      setProcessing(true);
      setError(null);

      await sendOffer(offer.id);

      setOffers((prev) =>
        prev.map((o) =>
          o.id === offer.id
            ? { ...o, status: 'sent' }
            : o
        )
      );

      // Add log
      const newLog: CommunicationLog = {
        id: Date.now().toString(),
        offerId: offer.id,
        type: 'email',
        message: 'Offer letter sent to candidate email',
        timestamp: new Date().toLocaleString(),
        user: 'System',
      };
      setLogs((prev) => [newLog, ...prev]);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send offer');
    } finally {
      setProcessing(false);
    }
  };

  // Pre-boarding trigger handler (REC-029: Trigger pre-boarding tasks for accepted offers)
  const handleTriggerPreboarding = (offer: OfferDisplay) => {
    setPreboardingOffer(offer);
    setShowPreboardingModal(true);
  };

  const confirmPreboarding = async () => {
    if (!preboardingOffer) return;

    try {
      setTriggeringPreboarding(preboardingOffer.id);
      setError(null);

      await triggerPreboarding(preboardingOffer.applicationId);

      // Add success log
      const newLog: CommunicationLog = {
        id: Date.now().toString(),
        offerId: preboardingOffer.id,
        type: 'system',
        message: `Pre-boarding triggered for ${preboardingOffer.candidateName}. Onboarding module initialized.`,
        timestamp: new Date().toLocaleString(),
        user: `${user?.firstName} ${user?.lastName}`,
      };
      setLogs((prev) => [newLog, ...prev]);

      setShowPreboardingModal(false);
      setPreboardingOffer(null);

      // Show success message
      alert(`Pre-boarding initiated successfully for ${preboardingOffer.candidateName}. The candidate will receive onboarding documents and tasks.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to trigger pre-boarding');
    } finally {
      setTriggeringPreboarding(null);
    }
  };

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

  const pendingCount = offers.filter((o) => o.status === 'pending_approval').length;

  // ==================== STATUS HELPERS ====================
  const getStatusBadge = (status: OfferDisplay['status']) => {
    // Black/White theme styles
    const styles: Record<OfferDisplay['status'], string> = {
      pending_approval: 'bg-white dark:bg-card text-foreground dark:text-muted-foreground border border-border dark:border-border',
      approved: 'bg-muted dark:bg-card text-foreground dark:text-foreground border border-border dark:border-border',
      rejected: 'bg-muted dark:bg-muted text-muted-foreground dark:text-muted-foreground border border-border dark:border-border',
      sent: 'bg-muted dark:bg-card text-foreground dark:text-muted-foreground border border-border dark:border-border',
      signed: 'bg-muted dark:bg-card text-white dark:text-black border border-slate-800 dark:border-border font-semibold',
      accepted: 'bg-black dark:bg-white text-white dark:text-black border border-black dark:border-white font-bold',
      declined: 'bg-muted dark:bg-muted text-muted-foreground dark:text-muted-foreground border border-border dark:border-border',
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
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black dark:border-white"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
            <Link href="/dashboard/hr-manager/recruitment" className="hover:text-foreground">
              Recruitment
            </Link>
            <span>/</span>
            <span>Offers</span>
          </div>
          <h1 className="text-2xl font-semibold text-foreground">Offer Approvals</h1>
          <p className="text-sm text-muted-foreground mt-1">Review and approve job offers (BR-26)</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowLogsPanel(!showLogsPanel)}>
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            {showLogsPanel ? 'Hide Logs' : 'View Logs'}
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          // Black/White theme - using opacity and borders for distinction
          { label: 'Pending', count: offers.filter((o) => o.status === 'pending_approval').length, color: 'bg-muted dark:bg-muted' },
          { label: 'Approved', count: offers.filter((o) => o.status === 'approved').length, color: 'bg-slate-400 dark:bg-card' },
          { label: 'Sent', count: offers.filter((o) => o.status === 'sent').length, color: 'bg-muted0 dark:bg-muted0' },
          { label: 'Signed', count: offers.filter((o) => o.status === 'signed').length, color: 'bg-muted dark:bg-card' },
          { label: 'Accepted', count: offers.filter((o) => o.status === 'accepted').length, color: 'bg-black dark:bg-white' },
          { label: 'Rejected', count: offers.filter((o) => o.status === 'rejected' || o.status === 'declined').length, color: 'bg-slate-300 dark:bg-card' },
        ].map((stat) => (
          <div
            key={stat.label}
            className={`bg-white rounded-lg border border-border p-4 cursor-pointer hover:shadow-md transition-shadow ${filter === stat.label.toLowerCase() ? 'ring-2 ring-blue-500' : ''
              }`}
            onClick={() => setFilter(stat.label.toLowerCase())}
          >
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${stat.color}`}></div>
              <span className="text-sm text-muted-foreground">{stat.label}</span>
            </div>
            <p className="text-2xl font-bold text-foreground mt-1">{stat.count}</p>
          </div>
        ))}
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 border-b border-border overflow-x-auto">
        {['all', 'pending', 'approved', 'sent', 'signed', 'accepted', 'rejected'].map((tab) => (
          <button
            key={tab}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${filter === tab
              ? 'border-black dark:border-white text-black dark:text-white'
              : 'border-transparent text-muted-foreground dark:text-muted-foreground hover:text-foreground dark:hover:text-muted-foreground'
              }`}
            onClick={() => setFilter(tab)}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
            {tab === 'pending' && pendingCount > 0 && (
              <span className="ml-1 px-1.5 py-0.5 text-xs bg-muted dark:bg-muted text-foreground dark:text-muted-foreground rounded-full border border-border dark:border-border">
                {pendingCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Main Content */}
      <div className={`grid gap-6 ${showLogsPanel ? 'grid-cols-1 lg:grid-cols-3' : 'grid-cols-1'}`}>
        {/* Offers List */}
        <div className={showLogsPanel ? 'lg:col-span-2' : ''}>
          {filteredOffers.length === 0 ? (
            <Card>
              <div className="text-center py-12">
                <svg className="w-12 h-12 text-muted-foreground mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="text-muted-foreground">No offers found</p>
              </div>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredOffers.map((offer) => (
                <Card key={offer.id} className="hover:shadow-md transition-shadow">
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-foreground">{offer.candidateName}</h3>
                        {getStatusBadge(offer.status)}
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">{offer.candidateEmail}</p>
                      <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
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
                      {offer.signingBonus && offer.signingBonus > 0 && (
                        <p className="mt-2 text-sm text-accent-foreground bg-accent/10 px-3 py-1 rounded inline-block">
                          Signing Bonus: {formatCurrency(offer.signingBonus)}
                        </p>
                      )}
                      {offer.rejectionReason && (
                        <p className="mt-2 text-sm text-destructive bg-destructive/10 px-3 py-1 rounded">
                          Reason: {offer.rejectionReason}
                        </p>
                      )}
                    </div>

                    <div className="flex gap-2">
                      {offer.status === 'pending_approval' && (
                        <>
                          <Button size="sm" onClick={() => handleApprove(offer)}>
                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            Approve
                          </Button>
                          <Button variant="destructive" size="sm" onClick={() => handleReject(offer)}>
                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                            Reject
                          </Button>
                        </>
                      )}

                      {offer.status === 'approved' && (
                        <Button
                          size="sm"
                          onClick={() => handleSendOffer(offer)}
                          disabled={processing}
                        >
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                          </svg>
                          Send Offer
                        </Button>
                      )}

                      {/* REC-029: Pre-boarding trigger for accepted/signed offers */}
                      {(offer.status === 'accepted' || offer.status === 'signed') && (
                        <Button
                          size="sm"
                          onClick={() => handleTriggerPreboarding(offer)}
                          disabled={triggeringPreboarding === offer.id}
                          className="bg-black dark:bg-white text-white dark:text-black hover:bg-card dark:hover:bg-muted border border-black dark:border-white"
                        >
                          {triggeringPreboarding === offer.id ? (
                            <>
                              <svg className="w-4 h-4 mr-1 animate-spin" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              Processing...
                            </>
                          ) : (
                            <>
                              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                              </svg>
                              Start Pre-boarding
                            </>
                          )}
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => router.push(`/dashboard/hr-manager/recruitment/offers/${offer.id}`)}
                      >
                        View Details
                      </Button>
                    </div>
                  </div>

                  {/* Meta */}
                  <div className="flex items-center gap-4 mt-4 pt-4 border-t border-border text-xs text-muted-foreground">
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
              ))}
            </div>
          )}
        </div>

        {/* Communication Logs Panel (BR-37) */}
        {showLogsPanel && (
          <div className="lg:col-span-1">
            <Card>
              <div className="space-y-3 max-h-[600px] overflow-y-auto">
                {logs.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No logs available</p>
                ) : (
                  logs.map((log) => (
                    <div key={log.id} className="flex gap-3 p-3 bg-muted rounded-lg">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 border ${log.type === 'email' ? 'bg-muted dark:bg-card text-foreground dark:text-muted-foreground border-border dark:border-border' :
                        log.type === 'system' ? 'bg-muted dark:bg-muted text-foreground dark:text-foreground border-border dark:border-border' :
                        'bg-muted dark:bg-card text-muted-foreground dark:text-muted-foreground border-border dark:border-border'
                      }`}>
                        {log.type === 'email' ? (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                        ) : log.type === 'system' ? (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        ) : (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-foreground">{log.message}</p>
                        <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                          <span>{log.user}</span>
                          <span>•</span>
                          <span>{log.timestamp}</span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Card>
          </div>
        )}
      </div>

      {/* Approval Confirmation Modal */}
      {showApprovalModal && selectedOffer && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/50" onClick={() => setShowApprovalModal(false)} />
            <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md p-6">
              <div className="text-center">
                <div className="w-12 h-12 bg-muted dark:bg-muted rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-border dark:border-border">
                  <svg className="w-6 h-6 text-foreground dark:text-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">Approve Offer</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Are you sure you want to approve the offer for <strong>{selectedOffer.candidateName}</strong>
                  for the position of <strong>{selectedOffer.jobTitle}</strong>?
                </p>
                <div className="bg-muted rounded-lg p-3 mb-6 text-sm text-left">
                  <div className="flex justify-between mb-1">
                    <span className="text-muted-foreground">Salary</span>
                    <span className="font-medium">{formatCurrency(selectedOffer.salary)}/month</span>
                  </div>
                  {selectedOffer.signingBonus && selectedOffer.signingBonus > 0 && (
                    <div className="flex justify-between mb-1">
                      <span className="text-muted-foreground">Signing Bonus</span>
                      <span className="font-medium text-foreground dark:text-foreground">{formatCurrency(selectedOffer.signingBonus)}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Deadline</span>
                    <span className="font-medium">{formatDate(selectedOffer.deadline)}</span>
                  </div>
                </div>
                <div className="flex gap-3">
                  <Button variant="outline" className="w-full" onClick={() => setShowApprovalModal(false)}>
                    Cancel
                  </Button>
                  <Button className="w-full" onClick={confirmApproval}>
                    Confirm Approval
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Rejection Modal */}
      {showRejectModal && selectedOffer && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/50" onClick={() => setShowRejectModal(false)} />
            <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md p-6">
              <div className="text-center">
                <div className="w-12 h-12 bg-muted dark:bg-muted rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-border dark:border-border">
                  <svg className="w-6 h-6 text-foreground dark:text-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">Reject Offer</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Please provide a reason for rejecting this offer for <strong>{selectedOffer.candidateName}</strong>.
                </p>
                <textarea
                  className="w-full px-4 py-3 border border-border rounded-lg text-foreground placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500 mb-4"
                  rows={3}
                  placeholder="Enter rejection reason..."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                />
                <div className="flex gap-3">
                  <Button variant="outline" className="w-full" onClick={() => setShowRejectModal(false)}>
                    Cancel
                  </Button>
                  <Button variant="destructive" className="w-full" onClick={confirmRejection} disabled={!rejectionReason.trim()}>
                    Confirm Rejection
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Pre-boarding Confirmation Modal (REC-029) */}
      {showPreboardingModal && preboardingOffer && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/50" onClick={() => setShowPreboardingModal(false)} />
            <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md p-6">
              <div className="text-center">
                <div className="w-12 h-12 bg-muted dark:bg-muted rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-border dark:border-border">
                  <svg className="w-6 h-6 text-foreground dark:text-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">Trigger Pre-boarding</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Start the onboarding process for <strong>{preboardingOffer.candidateName}</strong>?
                </p>
                <div className="bg-muted dark:bg-card border border-border dark:border-border rounded-lg p-4 mb-6 text-left">
                  <h4 className="font-medium text-foreground dark:text-foreground mb-2">This will initiate:</h4>
                  <ul className="text-sm text-foreground dark:text-muted-foreground space-y-1">
                    <li className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-foreground dark:text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Employment contract preparation
                    </li>
                    <li className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-foreground dark:text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Document collection requests
                    </li>
                    <li className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-foreground dark:text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      IT equipment setup tasks
                    </li>
                    <li className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-foreground dark:text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Welcome email to candidate
                    </li>
                  </ul>
                </div>
                <div className="flex gap-3">
                  <Button variant="outline" className="w-full" onClick={() => setShowPreboardingModal(false)}>
                    Cancel
                  </Button>
                  <Button
                    className="w-full bg-indigo-600 hover:bg-indigo-700"
                    onClick={confirmPreboarding}
                    disabled={triggeringPreboarding !== null}
                  >
                    {triggeringPreboarding ? 'Processing...' : 'Start Pre-boarding'}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
