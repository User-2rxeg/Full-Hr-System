'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/app/components/ui/button';
import { Card } from '@/app/components/ui/card';
import { Input } from '@/app/components/ui/input';
import { LoadingSpinner } from '@/app/components/ui/loading-spinner';
import { OfferResponseStatus, OfferFinalStatus, ApplicationStage } from '@/app/types/enums';
import { getOfferResponseStatusConfig } from '@/app/utils/recruitment-theme';
import { 
  getOffers, 
  createOffer, 
  sendOffer,
  getApplications,
  getAverageScore,
} from '@/app/services/recruitment';
import { CreateJobOfferRequest } from '@/app/types/recruitment';

// =====================================================
// Types
// =====================================================

interface CandidateForOffer {
  id: string;
  applicationId: string;
  candidateId: string;
  candidateName: string;
  candidateEmail: string;
  jobTitle: string;
  departmentName: string;
  averageScore: number;
}

// Local interface for UI display (different from API JobOffer type)
interface LocalJobOffer {
  id: string;
  applicationId: string;
  candidateId: string;
  candidateName: string;
  candidateEmail?: string;
  positionTitle: string;
  departmentName?: string;
  grossSalary: number;
  signingBonus?: number;
  benefits: string[];
  role?: string;
  deadline?: string;
  applicantResponse: OfferResponseStatus;
  finalStatus: OfferFinalStatus;
  createdAt: string;
}

interface NewOffer {
  applicationId: string;
  candidateId: string;
  grossSalary: number;
  signingBonus: number;
  benefits: string[];
  role: string;
  deadline: string;
  conditions: string;
}

// =====================================================
// Available Benefits
// =====================================================

const availableBenefits = [
  'Health Insurance',
  'Dental Insurance',
  'Life Insurance',
  'Remote Work',
  'Flexible Hours',
  'Annual Bonus',
  'Performance Bonus',
  'Stock Options',
  'Learning Budget',
  'Gym Membership',
  'Transportation Allowance',
  'Meal Allowance',
];

// =====================================================
// Components
// =====================================================

function OfferStatusBadge({ status }: { status: OfferResponseStatus }) {
  const config = getOfferResponseStatusConfig(status);
  
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${config.color}`}>
      {config.label}
    </span>
  );
}

function PreboardingButton({
  offer,
}: {
  offer: LocalJobOffer;
  onTrigger?: (offerId: string) => void;
  isTriggering?: boolean;
}) {
  if (offer.applicantResponse !== OfferResponseStatus.ACCEPTED) {
    return null;
  }

  // HR Employee cannot trigger pre-boarding - only HR Manager can (REC-029)
  // Show informational badge instead
  return (
    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700">
      Ready for Pre-boarding
    </span>
  );
}

// =====================================================
// Main Component
// =====================================================

export default function OffersPage() {
  const searchParams = useSearchParams();
  const preselectedAppId = searchParams.get('applicationId');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [candidates, setCandidates] = useState<CandidateForOffer[]>([]);
  const [offers, setOffers] = useState<LocalJobOffer[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isSending, setIsSending] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [newOffer, setNewOffer] = useState<NewOffer>({
    applicationId: preselectedAppId || '',
    candidateId: '',
    grossSalary: 0,
    signingBonus: 0,
    benefits: [],
    role: '',
    deadline: '',
    conditions: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Load data from API
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Get applications at offer stage and existing offers
      const [apps, offersData] = await Promise.all([
        getApplications({ stage: ApplicationStage.OFFER }),
        getOffers()
      ]);
      
      // Transform applications to candidates for offer
      const candidatesForOffer: CandidateForOffer[] = [];
      for (const app of apps) {
        // Only show applications that don't have offers yet
        const hasOffer = offersData.some(o => o.applicationId === app.id);
        if (!hasOffer) {
          // Get average score for the application
          let avgScore = 0;
          try {
            const scoreResult = await getAverageScore(app.id);
            avgScore = scoreResult.averageScore || 0;
          } catch {
            // Score might not be available
          }
          
          candidatesForOffer.push({
            id: app.id,
            applicationId: app.id,
            candidateId: app.candidateId || '',
            candidateName: app.candidateName || 'Unknown',
            candidateEmail: app.candidateEmail || '',
            jobTitle: app.jobTitle || '',
            departmentName: app.departmentName || '',
            averageScore: avgScore,
          });
        }
      }
      
      setCandidates(candidatesForOffer);
      // Map offers to local interface
      setOffers(offersData.map(o => ({
        id: o.id,
        applicationId: o.applicationId,
        candidateId: o.candidateId,
        candidateName: o.candidateName || 'Unknown',
        candidateEmail: o.candidateName, // Use candidateName as fallback since candidateEmail isn't in API type
        positionTitle: o.positionTitle || '',
        departmentName: o.departmentName || '',
        grossSalary: o.grossSalary,
        signingBonus: o.signingBonus,
        benefits: o.benefits || [],
        role: o.role,
        deadline: o.deadline,
        applicantResponse: o.applicantResponse,
        finalStatus: o.finalStatus,
        createdAt: o.createdAt,
      })));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load offers data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Auto-open form if applicationId is provided
  useEffect(() => {
    if (preselectedAppId && !loading) {
      setShowCreateForm(true);
      setNewOffer((prev) => ({ ...prev, applicationId: preselectedAppId }));
    }
  }, [preselectedAppId, loading]);

  // Toggle benefit selection
  const toggleBenefit = (benefit: string) => {
    setNewOffer((prev) => ({
      ...prev,
      benefits: prev.benefits.includes(benefit)
        ? prev.benefits.filter((b) => b !== benefit)
        : [...prev.benefits, benefit],
    }));
  };

  // Validate form (BR-26)
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!newOffer.applicationId) {
      newErrors.applicationId = 'Please select a candidate';
    }

    if (!newOffer.grossSalary || newOffer.grossSalary <= 0) {
      newErrors.grossSalary = 'Please enter a valid salary';
    }

    if (!newOffer.deadline) {
      newErrors.deadline = 'Please select a response deadline';
    } else if (new Date(newOffer.deadline) < new Date()) {
      newErrors.deadline = 'Deadline must be in the future';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Create offer (BR-26)
  const handleCreateOffer = async () => {
    if (!validateForm()) return;

    try {
      setIsCreating(true);
      setError(null);
      
      const selectedCandidate = candidates.find(c => c.applicationId === newOffer.applicationId);
      
      const offerData: CreateJobOfferRequest = {
        applicationId: newOffer.applicationId,
        candidateId: selectedCandidate?.candidateId || newOffer.candidateId,
        role: newOffer.role || selectedCandidate?.jobTitle || 'Position',
        grossSalary: newOffer.grossSalary,
        signingBonus: newOffer.signingBonus || undefined,
        benefits: newOffer.benefits,
        deadline: newOffer.deadline,
        conditions: newOffer.conditions || undefined,
        approvers: [], // Default to empty, HR manager will approve
      };
      
      const createdOffer = await createOffer(offerData);
      
      // Map the created offer to local interface
      const newOfferLocal: LocalJobOffer = {
        id: createdOffer.id,
        applicationId: createdOffer.applicationId,
        candidateId: createdOffer.candidateId,
        candidateName: selectedCandidate?.candidateName || createdOffer.candidateName || 'Unknown',
        candidateEmail: selectedCandidate?.candidateEmail,
        positionTitle: selectedCandidate?.jobTitle || createdOffer.positionTitle || '',
        departmentName: selectedCandidate?.departmentName || createdOffer.departmentName || '',
        grossSalary: createdOffer.grossSalary,
        signingBonus: createdOffer.signingBonus,
        benefits: createdOffer.benefits || [],
        role: createdOffer.role,
        deadline: createdOffer.deadline,
        applicantResponse: createdOffer.applicantResponse,
        finalStatus: createdOffer.finalStatus,
        createdAt: createdOffer.createdAt,
      };
      
      setOffers((prev) => [newOfferLocal, ...prev]);
      
      // Remove candidate from list
      setCandidates((prev) => prev.filter((c) => c.applicationId !== newOffer.applicationId));

      setShowCreateForm(false);
      setNewOffer({
        applicationId: '',
        candidateId: '',
        grossSalary: 0,
        signingBonus: 0,
        benefits: [],
        role: '',
        deadline: '',
        conditions: '',
      });

      setSuccessMessage('Offer created successfully! You can now send it to the candidate.');
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create offer');
    } finally {
      setIsCreating(false);
    }
  };

  // Send offer
  const handleSendOffer = async (offerId: string) => {
    try {
      setIsSending(offerId);
      setError(null);
      
      await sendOffer(offerId);

      // Reload offers to get updated state
      await loadData();

      setSuccessMessage('Offer sent to candidate successfully!');
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send offer');
    } finally {
      setIsSending(null);
    }
  };

  // Stats
  const stats = {
    total: offers.length,
    pending: offers.filter((o) => o.applicantResponse === OfferResponseStatus.PENDING).length,
    accepted: offers.filter((o) => o.applicantResponse === OfferResponseStatus.ACCEPTED).length,
    // Ready for pre-boarding (accepted offers)
    preboardingReady: offers.filter(
      (o) => o.applicantResponse === OfferResponseStatus.ACCEPTED
    ).length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Offers Management</h1>
          <p className="text-slate-600 mt-1">
            Create, send, and track job offers to candidates
          </p>
        </div>
        <Button variant="default" onClick={() => setShowCreateForm(true)}>
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Create Offer
        </Button>
      </div>

      {/* Success Alert */}
      {successMessage && (
        <div className="mb-6 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg p-4 flex items-center gap-3">
          <svg className="w-5 h-5 text-slate-700 dark:text-slate-300" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          <span className="text-slate-800 dark:text-slate-200 font-medium">{successMessage}</span>
        </div>
      )}

      {/* Error Alert */}
      {error && (
        <div className="mb-6 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg p-4 flex items-center gap-3">
          <svg className="w-5 h-5 text-slate-700 dark:text-slate-300" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
          <span className="text-slate-800 dark:text-slate-200 font-medium">{error}</span>
          <button 
            onClick={() => setError(null)}
            className="ml-auto text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100"
          >
            ×
          </button>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <p className="text-sm text-slate-600">Total Offers</p>
          <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <p className="text-sm text-slate-600">Pending Response</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{stats.pending}</p>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <p className="text-sm text-slate-600">Accepted</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{stats.accepted}</p>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <p className="text-sm text-slate-600">Awaiting Pre-boarding</p>
          <p className="text-2xl font-bold text-indigo-600">{stats.preboardingReady}</p>
        </div>
      </div>

      {/* Create Offer Form (BR-26) */}
      {showCreateForm && (
        <Card className="mb-6">
          <div className="space-y-6">
            {/* Select Candidate */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Select Candidate <span className="text-slate-700 dark:text-slate-300">*</span>
              </label>
              {candidates.length === 0 ? (
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-center text-slate-600">
                  No candidates at the offer stage. Move candidates through the pipeline first.
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {candidates.map((candidate) => (
                    <button
                      key={candidate.id}
                      onClick={() => setNewOffer({ ...newOffer, applicationId: candidate.applicationId })}
                      className={`p-4 rounded-lg border text-left transition-colors ${
                        newOffer.applicationId === candidate.applicationId
                          ? 'border-indigo-500 bg-indigo-50'
                          : 'border-slate-200 hover:border-indigo-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-slate-900">{candidate.candidateName}</p>
                          <p className="text-sm text-slate-500">{candidate.jobTitle}</p>
                          <p className="text-xs text-slate-400">{candidate.departmentName}</p>
                        </div>
                        <div className="text-right">
                          <span className={`text-lg font-bold ${candidate.averageScore >= 70 ? 'text-slate-900 dark:text-slate-100' : 'text-slate-700 dark:text-slate-300'}`}>
                            {candidate.averageScore}%
                          </span>
                          <p className="text-xs text-slate-500">Score</p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
              {errors.applicationId && (
                <p className="text-red-600 text-sm mt-1">{errors.applicationId}</p>
              )}
            </div>

            {/* Salary & Bonus */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Gross Salary (EGP/month) <span className="text-slate-700 dark:text-slate-300">*</span>
                </label>
                <Input
                  type="number"
                  value={newOffer.grossSalary || ''}
                  onChange={(e) => setNewOffer({ ...newOffer, grossSalary: parseInt(e.target.value) || 0 })}
                  placeholder="e.g., 20000"
                />
                {errors.grossSalary && <p className="text-red-600 text-sm mt-1">{errors.grossSalary}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Signing Bonus (EGP)
                </label>
                <Input
                  type="number"
                  value={newOffer.signingBonus || ''}
                  onChange={(e) => setNewOffer({ ...newOffer, signingBonus: parseInt(e.target.value) || 0 })}
                  placeholder="Optional"
                />
              </div>
            </div>

            {/* Role & Deadline */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Role/Position Title
                </label>
                <Input
                  type="text"
                  value={newOffer.role}
                  onChange={(e) => setNewOffer({ ...newOffer, role: e.target.value })}
                  placeholder="Leave empty to use job title"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Response Deadline <span className="text-slate-700 dark:text-slate-300">*</span>
                </label>
                <Input
                  type="date"
                  value={newOffer.deadline}
                  onChange={(e) => setNewOffer({ ...newOffer, deadline: e.target.value })}
                />
                {errors.deadline && <p className="text-red-600 text-sm mt-1">{errors.deadline}</p>}
              </div>
            </div>

            {/* Benefits Selection */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                  Benefits Package <span className="text-slate-700 dark:text-slate-300">*</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {availableBenefits.map((benefit) => (
                  <button
                    key={benefit}
                    onClick={() => toggleBenefit(benefit)}
                    className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                      newOffer.benefits.includes(benefit)
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {benefit}
                  </button>
                ))}
              </div>
              {errors.benefits && (
                <p className="text-slate-700 dark:text-slate-300 text-sm mt-1">{errors.benefits}</p>
              )}
            </div>

            {/* Conditions */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Additional Conditions
              </label>
              <textarea
                value={newOffer.conditions}
                onChange={(e) => setNewOffer({ ...newOffer, conditions: e.target.value })}
                rows={3}
                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Any special terms, conditions, or notes..."
              />
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
              <Button variant="outline" onClick={() => setShowCreateForm(false)}>
                Cancel
              </Button>
              <Button
                variant="default"
                onClick={handleCreateOffer}
                disabled={isCreating || candidates.length === 0}
              >
                Create Offer
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Offers List */}
      <Card className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Candidate
                </th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Position
                </th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Compensation
                </th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Status
                </th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Deadline
                </th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {offers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                    No offers created yet.
                  </td>
                </tr>
              ) : (
                offers.map((offer) => (
                  <tr key={offer.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <p className="font-medium text-slate-900">{offer.candidateName}</p>
                      <p className="text-sm text-slate-500">{offer.candidateEmail}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-slate-900">{offer.positionTitle}</p>
                      <p className="text-sm text-slate-500">{offer.departmentName}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-medium text-slate-900">
                        EGP {offer.grossSalary.toLocaleString()}/mo
                      </p>
                      {offer.signingBonus && (
                        <p className="text-sm text-emerald-600">
                          + EGP {offer.signingBonus.toLocaleString()} signing bonus
                        </p>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <OfferStatusBadge status={offer.applicantResponse} />
                    </td>
                    <td className="px-6 py-4">
                      {offer.deadline ? (
                        <p className="text-slate-900">{new Date(offer.deadline).toLocaleDateString()}</p>
                      ) : (
                        <p className="text-slate-500">No deadline set</p>
                      )}
                      {offer.role && (
                        <p className="text-sm text-slate-500">Role: {offer.role}</p>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex flex-col items-end gap-2">
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => handleSendOffer(offer.id)}
                          disabled={isSending === offer.id || offer.applicantResponse !== OfferResponseStatus.PENDING}
                        >
                          {isSending === offer.id ? 'Sending...' : 'Send Offer'}
                        </Button>
                        <PreboardingButton offer={offer} />
                        <Link href={`/dashboard/hr-employee/recruitment/applications/${offer.applicationId}`}>
                          <Button variant="outline" size="sm">
                            View Application
                          </Button>
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Pre-boarding Info Card (REC-029) */}
      {stats.preboardingReady > 0 && (
        <Card className="mt-6 border-indigo-200 bg-indigo-50">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-slate-200 dark:bg-slate-700 rounded-full flex items-center justify-center border border-slate-300 dark:border-slate-600">
              <svg className="w-6 h-6 text-slate-800 dark:text-slate-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-slate-900 dark:text-slate-100">Pre-boarding Ready</h3>
              <p className="text-sm text-slate-700 dark:text-slate-300">
                {stats.preboardingReady} accepted offer{stats.preboardingReady > 1 ? 's are' : ' is'} ready for pre-boarding. 
                Trigger pre-boarding to initiate onboarding tasks (contract signing, forms, etc.) as per REC-029.
              </p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
