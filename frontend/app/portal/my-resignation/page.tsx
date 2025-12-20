'use client';

import { useState, useEffect } from 'react';
import {
  offboardingService,
  TerminationRequest,
  TerminationStatus,
} from '@/app/services/offboarding';
import { useAuth } from '@/app/context/AuthContext';

export default function MyResignationPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [existingRequests, setExistingRequests] = useState<TerminationRequest[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    reason: '',
    employeeComments: '',
    terminationDate: '',
  });

  useEffect(() => {
    if (user?.id) {
      fetchExistingRequests();
    }
  }, [user]);

  const fetchExistingRequests = async () => {
    try {
      setLoading(true);
      setError(null);
      const employeeId = user?.id;
      if (employeeId) {
        const requests = await offboardingService.getResignationRequestsByEmployeeId(employeeId);
        setExistingRequests(Array.isArray(requests) ? requests : []);
      }
    } catch (err: any) {
      if (!err.message?.includes('404')) {
        console.error('Failed to fetch resignation requests:', err);
      }
      setExistingRequests([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.reason || !formData.terminationDate) {
      setError('Please provide a reason and effective date');
      return;
    }

    const employeeId = user?.id;
    // Try to get contractId from user object, or use employeeId as fallback
    const contractId = (user as any)?.contractId || (user as any)?.employeeContractId || employeeId;

    if (!employeeId) {
      setError('Unable to determine employee information. Please contact HR.');
      return;
    }

    if (!contractId) {
      setError('Unable to find your contract information. Please contact HR to ensure your contract is on file.');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      setSuccess(null);

      await offboardingService.createResignationRequest({
        employeeId,
        contractId,
        reason: formData.reason,
        employeeComments: formData.employeeComments || undefined,
        terminationDate: formData.terminationDate,
      });

      setFormData({ reason: '', employeeComments: '', terminationDate: '' });
      setShowForm(false);
      setSuccess('Your resignation request has been submitted successfully.');
      await fetchExistingRequests();
    } catch (err: any) {
      setError(err.message || 'Failed to submit resignation request');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusConfig = (status: TerminationStatus) => {
    switch (status) {
      case TerminationStatus.PENDING:
        return {
          bg: 'bg-muted/30',
          border: 'border-border',
          text: 'text-muted-foreground',
          icon: 'clock',
          label: 'Pending Review'
        };
      case TerminationStatus.UNDER_REVIEW:
        return {
          bg: 'bg-muted/50',
          border: 'border-border',
          text: 'text-foreground',
          icon: 'search',
          label: 'Under Review'
        };
      case TerminationStatus.APPROVED:
        return {
          bg: 'bg-primary/5',
          border: 'border-primary/20',
          text: 'text-primary',
          icon: 'check',
          label: 'Approved'
        };
      case TerminationStatus.REJECTED:
        return {
          bg: 'bg-destructive/5',
          border: 'border-destructive/20',
          text: 'text-destructive',
          icon: 'x',
          label: 'Not Approved'
        };
      default:
        return {
          bg: 'bg-muted/30',
          border: 'border-border',
          text: 'text-muted-foreground',
          icon: 'circle',
          label: status
        };
    }
  };

  const getStatusDescription = (status: TerminationStatus) => {
    switch (status) {
      case TerminationStatus.PENDING:
        return 'Your request is waiting for review by your line manager.';
      case TerminationStatus.UNDER_REVIEW:
        return 'Your request is being reviewed by HR and management.';
      case TerminationStatus.APPROVED:
        return 'Your resignation has been approved. HR will contact you about next steps.';
      case TerminationStatus.REJECTED:
        return 'Your request was not approved. Please contact HR for more information.';
      default:
        return '';
    }
  };

  const getMinDate = () => {
    const today = new Date();
    today.setDate(today.getDate() + 14);
    return today.toISOString().split('T')[0];
  };

  const hasActiveRequest = existingRequests.some(
    (r) => r.status === TerminationStatus.PENDING || r.status === TerminationStatus.UNDER_REVIEW
  );

  const renderStatusIcon = (icon: string) => {
    switch (icon) {
      case 'clock':
        return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
      case 'search':
        return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>;
      case 'check':
        return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
      case 'x':
        return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-6 lg:p-8">
        <div className="max-w-5xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-muted rounded w-1/3"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
            <div className="h-64 bg-card rounded-xl shadow-sm border border-border"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6 lg:p-8">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Resignation Request</h1>
          <p className="text-muted-foreground">Submit and track your resignation status and history.</p>
        </div>

        {error && (
          <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-lg flex items-center gap-3">
            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {error}
          </div>
        )}

        {success && (
          <div className="bg-primary/10 border border-primary/20 text-primary px-4 py-3 rounded-lg flex items-center gap-3">
            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {success}
          </div>
        )}

        <div className="flex flex-col gap-8">
          {/* Main Content - Centered */}
          <div className="w-full max-w-3xl mx-auto space-y-8">

            {/* Active Request / Submit New */}
            {!hasActiveRequest ? (
              <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
                {!showForm ? (
                  <div className="p-8 text-center flex flex-col items-center justify-center min-h-[400px]">
                    <div className="w-20 h-20 bg-muted/50 rounded-full flex items-center justify-center mb-6 ring-8 ring-muted/20">
                      <svg className="w-10 h-10 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                    </div>
                    <h2 className="text-2xl font-bold text-foreground mb-3">Ready to move on?</h2>
                    <p className="text-muted-foreground mb-8 max-w-md text-base leading-relaxed">
                      We're sorry to see you go. If you've decided to resign, you can submit your formal request here.
                    </p>
                    <button
                      onClick={() => setShowForm(true)}
                      className="inline-flex items-center gap-2 px-8 py-4 bg-primary text-primary-foreground font-semibold rounded-full hover:bg-primary/90 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                    >
                      Start Resignation Request
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="p-6 lg:p-10 space-y-8">
                    <div className="flex items-center justify-between border-b border-border pb-6">
                      <div>
                        <h2 className="text-2xl font-bold text-foreground">Submit Resignation Request</h2>
                        <p className="text-muted-foreground mt-1">Please provide the details of your resignation below</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowForm(false)}
                        className="p-2 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                      </button>
                    </div>

                    <div className="bg-muted/30 border border-border rounded-xl p-5">
                      <div className="flex gap-4">
                        <div className="bg-background p-2 rounded-lg h-fit border border-border">
                          <svg className="w-5 h-5 text-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <div>
                          <h3 className="font-semibold text-foreground">Important Information</h3>
                          <ul className="text-sm text-muted-foreground mt-2 space-y-2 list-disc list-inside">
                            <li>Minimum notice period is <span className="font-medium text-foreground">2 weeks</span></li>
                            <li>Your request will follow the approval workflow: Line Manager, Finance, HR</li>
                            <li>You will be notified of decisions through the system</li>
                          </ul>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="text-sm font-semibold text-foreground">
                            Reason for Resignation <span className="text-destructive">*</span>
                          </label>
                          <select
                            value={formData.reason}
                            onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                            className="w-full px-4 py-3 bg-background border border-input rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                            required
                          >
                            <option value="">Select a reason...</option>
                            <option value="Better career opportunity">Better career opportunity</option>
                            <option value="Personal reasons">Personal reasons</option>
                            <option value="Relocation">Relocation</option>
                            <option value="Health reasons">Health reasons</option>
                            <option value="Further education">Further education</option>
                            <option value="Work-life balance">Work-life balance</option>
                            <option value="Career change">Career change</option>
                            <option value="Retirement">Retirement</option>
                            <option value="Other">Other</option>
                          </select>
                        </div>

                        <div className="space-y-2">
                          <label className="text-sm font-semibold text-foreground">
                            Proposed Last Day <span className="text-destructive">*</span>
                          </label>
                          <input
                            type="date"
                            value={formData.terminationDate}
                            onChange={(e) => setFormData({ ...formData, terminationDate: e.target.value })}
                            min={getMinDate()}
                            className="w-full px-4 py-3 bg-background border border-input rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                            required
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-foreground">
                          Additional Comments <span className="text-muted-foreground font-normal">(Optional)</span>
                        </label>
                        <textarea
                          value={formData.employeeComments}
                          onChange={(e) => setFormData({ ...formData, employeeComments: e.target.value })}
                          className="w-full px-4 py-3 bg-background border border-input rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all resize-none"
                          rows={4}
                          placeholder="Please ensure you have discussed this with your line manager first..."
                        />
                      </div>
                    </div>

                    <div className="flex justify-end gap-4 pt-4 border-t border-border">
                      <button
                        type="button"
                        onClick={() => {
                          setShowForm(false);
                          setFormData({ reason: '', employeeComments: '', terminationDate: '' });
                        }}
                        className="px-6 py-3 border border-input text-foreground font-medium rounded-lg hover:bg-muted transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={submitting}
                        className="inline-flex items-center justify-center gap-2 px-8 py-3 bg-primary text-primary-foreground font-medium rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-all shadow-sm"
                      >
                        {submitting ? (
                          <>
                            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Submitting...
                          </>
                        ) : (
                          'Submit Resignation'
                        )}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            ) : (
              <div className="bg-muted/30 border border-border p-8 rounded-xl flex flex-col items-center text-center gap-4">
                <div className="bg-background p-4 rounded-full border border-border shadow-sm ring-4 ring-background">
                  <svg className="w-8 h-8 text-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-foreground">Active Request Pending</h3>
                  <p className="text-muted-foreground mt-2 max-w-lg mx-auto">
                    You have an active resignation request pending review. You cannot submit a new request until the current one is processed.
                  </p>
                </div>
              </div>
            )}

            {/* Existing Requests Section */}
            {existingRequests.length > 0 && (
              <div className="space-y-6 pt-8 border-t border-border">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-foreground">Request History</h2>
                </div>

                {existingRequests.map((request) => {
                  const reasonDisplay = typeof request.reason === 'object' ? JSON.stringify(request.reason) : request.reason;

                  return (
                    <div key={request._id} className="bg-card rounded-xl shadow-sm border border-border overflow-hidden transition-all hover:shadow-md">
                      <div className="px-6 py-4 border-b border-border bg-muted/20">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span className="flex items-center justify-center w-8 h-8 rounded-full bg-background border border-border font-bold text-xs shadow-sm">
                              {renderStatusIcon(getStatusConfig(request.status).icon)}
                            </span>
                            <div>
                              <span className="font-semibold text-foreground">{getStatusConfig(request.status).label}</span>
                            </div>
                          </div>
                          <span className="text-sm font-mono text-muted-foreground bg-background px-2 py-1 rounded border border-border">
                            {new Date(request.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>

                      <div className="p-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-6">
                          <div>
                            <p className="text-xs uppercase tracking-wider font-semibold text-muted-foreground mb-2">Reason</p>
                            <p className="text-foreground font-medium text-lg">{reasonDisplay}</p>
                          </div>
                          {request.terminationDate && (
                            <div>
                              <p className="text-xs uppercase tracking-wider font-semibold text-muted-foreground mb-2">Proposed Last Day</p>
                              <p className="text-foreground font-medium text-lg">{new Date(request.terminationDate).toLocaleDateString()}</p>
                            </div>
                          )}
                        </div>

                        {request.employeeComments && (
                          <div className="mb-6">
                            <p className="text-xs uppercase tracking-wider font-semibold text-muted-foreground mb-2">Your Comments</p>
                            <div className="bg-muted/30 p-4 rounded-lg text-sm text-foreground border border-border/50">
                              {request.employeeComments}
                            </div>
                          </div>
                        )}

                        {request.hrComments && (
                          <div className="bg-muted/50 rounded-xl p-5 border border-border flex gap-4">
                            <div className="bg-background p-2 rounded-lg h-fit border border-border">
                              <svg className="w-5 h-5 text-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                              </svg>
                            </div>
                            <div>
                              <p className="text-sm font-bold text-foreground">HR Response</p>
                              <p className="text-muted-foreground text-sm mt-1 leading-relaxed">{request.hrComments}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Horizontal Process Stepper - Bottom */}
          <div className="bg-card rounded-xl shadow-sm border border-border p-8 mt-4">
            <h2 className="text-lg font-semibold text-foreground mb-8 text-center uppercase tracking-wide opacity-80">Resignation Process Overview</h2>

            <div className="relative max-w-4xl mx-auto">
              {/* Connecting Line */}
              <div className="absolute top-5 left-0 w-full h-0.5 bg-muted"></div>

              <div className="grid grid-cols-6 gap-2 relative">
                {[
                  { step: 1, label: 'Submit', description: 'Initiation', active: true },
                  { step: 2, label: 'Review', description: 'Manager', active: false },
                  { step: 3, label: 'Finance', description: 'Clearance', active: false },
                  { step: 4, label: 'HR', description: 'Processing', active: false },
                  { step: 5, label: 'Assets', description: 'Handover', active: false },
                  { step: 6, label: 'Settle', description: 'Final Pay', active: false },
                ].map((item, index) => (
                  <div key={item.step} className="flex flex-col items-center relative group">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold z-10 transition-colors duration-300 border-4 border-card ring-2 ring-offset-2 ring-offset-card ${item.active
                      ? 'bg-foreground text-background ring-foreground'
                      : 'bg-muted text-muted-foreground ring-transparent'
                      }`}>
                      {item.step}
                    </div>
                    <div className="text-center mt-4">
                      <p className={`text-sm font-bold ${item.active ? 'text-foreground' : 'text-muted-foreground'}`}>{item.label}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 hidden sm:block">{item.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

