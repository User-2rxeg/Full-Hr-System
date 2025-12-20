'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/app/context/AuthContext';
import {
    getApplicationById,
    updateApplicationStage,
    rejectApplication,
    getInterviews,
    scheduleInterview,
    submitInterviewFeedback,
    getFeedbackByInterview
} from '@/app/services/recruitment';
import { Application, Interview, FeedbackResult } from '@/app/types/recruitment';
import { ApplicationStage, ApplicationStatus, InterviewStatus, InterviewMethod } from '@/app/types/enums';
import { GlassCard } from '@/app/components/ui/glass-card';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Textarea } from '@/app/components/ui/textarea';
import { Badge } from '@/app/components/ui/badge';
import { Avatar, AvatarFallback } from '@/app/components/ui/avatar';
import { Card } from '@/app/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/app/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import { Label } from '@/app/components/ui/label';
import {
    ArrowLeft,
    Mail,
    Phone,
    MapPin,
    Calendar,
    Clock,
    FileText,
    CheckCircle2,
    XCircle,
    Video,
    User,
    Briefcase,
    Star
} from 'lucide-react';
import { toast } from 'sonner';

export default function ApplicationDetailPage() {
    const params = useParams();
    const applicationId = params?.id as string;
    const router = useRouter();
    const { user } = useAuth();

    const [app, setApp] = useState<Application | null>(null);
    const [candidate, setCandidate] = useState<any | null>(null);
    const [history, setHistory] = useState<any[]>([]);
    const [interviews, setInterviews] = useState<Interview[]>([]);
    const [loading, setLoading] = useState(true);

    // Dialog States
    const [isScheduleOpen, setIsScheduleOpen] = useState(false);
    const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
    const [isRejectOpen, setIsRejectOpen] = useState(false);

    // Form States
    const [interviewForm, setInterviewForm] = useState({
        date: '',
        time: '',
        method: InterviewMethod.VIDEO,
        location: '',
        panel: [user?.id || '']
    });

    const [employees, setEmployees] = useState<any[]>([]);

    const [feedbackForm, setFeedbackForm] = useState({
        interviewId: '',
        rating: 3,
        comments: '',
        strengths: '',
        weaknesses: '',
        recommendation: 'hire'
    });

    const [rejectionReason, setRejectionReason] = useState('');
    const [internalNote, setInternalNote] = useState('');
    const [submitting, setSubmitting] = useState(false);

    // REC-022: Predefined Rejection Templates
    const REJECTION_TEMPLATES = [
        { label: 'Generic', text: 'Thank you for your interest. Unfortunately, we have decided to move forward with other candidates who more closely match our requirements at this time.' },
        { label: 'Experience Mismatch', text: 'While your background is impressive, we are looking for a candidate with more specific experience in this domain.' },
        { label: 'Role Filled', text: 'Thank you for your time. This position has now been filled. We will keep your resume on file for future openings.' },
        { label: 'Not a Fit', text: 'After careful consideration, we determined that this role is not the best fit for your current career goals.' }
    ];

    const fetchData = useCallback(async () => {
        if (!applicationId) return;
        try {
            setLoading(true);
            const { getApplicationById, getInterviews, getApplicationHistory, getEmployees } = await import('@/app/services/recruitment');

            const [appData, interviewsData, historyData, employeesData] = await Promise.all([
                getApplicationById(applicationId),
                getInterviews({ applicationId }),
                getApplicationHistory(applicationId),
                getEmployees()
            ]);

            setApp(appData);
            setInterviews(interviewsData || []);
            setHistory(historyData || []);
            setEmployees(employeesData || []);

            // Fetch candidate details if not already populated on application
            if (appData?.candidateId) {
                try {
                    const { getCandidateById } = await import('@/app/services/recruitment');
                    const cand = await getCandidateById(appData.candidateId);
                    setCandidate(cand);
                } catch (e) {
                    console.error('Failed to fetch candidate details:', e);
                }
            }
        } catch (error) {
            toast.error('Failed to load application details');
            console.error(error);
        } finally {
            setLoading(false);
        }
    }, [applicationId]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Actions
    const handleStageChange = async (newStage: ApplicationStage) => {
        if (!app) return;
        try {
            await updateApplicationStage(app.id, newStage);
            toast.success('Stage updated successfully');
            fetchData(); // Refresh history
        } catch (error: any) {
            toast.error(error.message || 'Failed to update stage');
        }
    };

    const handleReject = async () => {
        if (!app) return;
        try {
            setSubmitting(true);
            await rejectApplication(app.id, rejectionReason);
            setIsRejectOpen(false);
            toast.success('Application rejected');
            fetchData(); // Refresh history
        } catch (error: any) {
            toast.error(error.message || 'Failed to reject');
        } finally {
            setSubmitting(false);
        }
    };

    const handleAddNote = async () => {
        if (!internalNote.trim()) return;
        toast.success('Internal note saved (Simulated)');
        // In a real app: await addApplicationNote(app.id, internalNote);
        setHistory(prev => [{
            id: 'temp-' + Date.now(),
            action: 'added_note',
            notes: internalNote,
            performedBy: user?.id || 'Recruiter',
            createdAt: new Date().toISOString()
        }, ...prev]);
        setInternalNote('');
    };

    const handleScheduleInterview = async () => {
        if (!app) return;
        
        // Validate stage is a valid ApplicationStage enum value
        const validStages = ['screening', 'department_interview', 'hr_interview', 'offer'];
        if (!validStages.includes(app.currentStage)) {
            toast.error(`Invalid stage: ${app.currentStage}. Stage must be one of: ${validStages.join(', ')}`);
            return;
        }
        
        // Check if interview already exists for this stage
        const existingInterview = interviews.find(
            i => i.stage === app.currentStage && i.status !== 'cancelled'
        );
        
        if (existingInterview) {
            toast.error(`An interview for ${app.currentStage.replace('_', ' ')} stage already exists. Please choose a different stage or cancel the existing interview first.`);
            return;
        }
        
        try {
            setSubmitting(true);
            const scheduledAt = new Date(`${interviewForm.date}T${interviewForm.time}`).toISOString();

            // Match CreateInterviewRequest interface strictly
            await scheduleInterview({
                applicationId: app.id,
                stage: app.currentStage as any,
                scheduledDate: scheduledAt,
                method: interviewForm.method,
                panel: interviewForm.panel, // Now is an array
                videoLink: interviewForm.location || 'Remote Link'
            });

            toast.success('Interview scheduled');
            setIsScheduleOpen(false);
            setInterviewForm({
                date: '',
                time: '',
                method: InterviewMethod.VIDEO,
                location: '',
                panel: [user?.id || '']
            });
            fetchData(); // Refresh history
        } catch (error: any) {
            const errorMessage = error.message || 'Failed to schedule';
            if (errorMessage.includes('already exists') || errorMessage.includes('409') || errorMessage.includes('Conflict')) {
                toast.error(`An interview for ${app.currentStage.replace('_', ' ')} stage already exists. Please choose a different stage or cancel the existing interview first.`);
            } else if (errorMessage.includes('Stage must be one of')) {
                toast.error(`Invalid stage: ${app.currentStage}. Stage must be one of: ${validStages.join(', ')}`);
            } else {
                toast.error(errorMessage);
            }
        } finally {
            setSubmitting(false);
        }
    };

    const handleSubmitFeedback = async () => {
        if (!app) return;
        try {
            setSubmitting(true);

            // concatenate structured fields into one feedback string (REC-020)
            const structuredFeedback = `
Status Recommendation: ${feedbackForm.recommendation.toUpperCase()}
Strengths: ${feedbackForm.strengths}
Weaknesses: ${feedbackForm.weaknesses}
Additional Comments: ${feedbackForm.comments}
            `.trim();

            // Match SubmitFeedbackRequest interface
            await submitInterviewFeedback({
                interviewId: feedbackForm.interviewId,
                interviewerId: user?.id || '',
                score: feedbackForm.rating,
                comments: structuredFeedback
            });

            toast.success('Feedback submitted');
            setIsFeedbackOpen(false);
            fetchData(); // Refresh history
        } catch (error: any) {
            toast.error(error.message || 'Failed to submit feedback');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <div className="p-8 text-center text-muted-foreground">Loading recruitment details...</div>;
    if (!app) return <div className="p-8 text-center text-red-500">Application not found</div>;

    return (
        <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6 pb-12">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between gap-4">
                <div className="flex items-start gap-4">
                    <Link href="/dashboard/recruiter/recruitment/applications">
                        <Button variant="ghost" size="icon" className="mt-1">
                            <ArrowLeft className="w-5 h-5" />
                        </Button>
                    </Link>
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-3xl font-bold text-foreground">{app.candidateName}</h1>
                            <Badge className={`${app.status === ApplicationStatus.REJECTED ? 'bg-red-100 text-red-700' :
                                app.status === ApplicationStatus.HIRED ? 'bg-green-100 text-green-700' :
                                    'bg-blue-100 text-blue-700'
                                }`}>
                                {app.status.replace('_', ' ').toUpperCase()}
                            </Badge>
                        </div>
                        <div className="flex items-center gap-4 mt-2 text-muted-foreground">
                            <div className="flex items-center gap-1.5"><Briefcase className="w-4 h-4" /> {app.jobTitle}</div>
                            <div className="flex items-center gap-1.5"><Mail className="w-4 h-4" /> {app.candidateEmail}</div>
                        </div>
                    </div>
                </div>

                <div className="flex gap-2 items-start">
                    <Dialog open={isRejectOpen} onOpenChange={setIsRejectOpen}>
                        <DialogTrigger asChild>
                            <Button variant="destructive">Reject</Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader><DialogTitle>Reject Application</DialogTitle></DialogHeader>
                            <div className="space-y-4 py-4">
                                <div>
                                    <Label className="mb-2 block">Rejection Template (REC-022)</Label>
                                    <Select onValueChange={(val) => setRejectionReason(val)}>
                                        <SelectTrigger><SelectValue placeholder="Select a template..." /></SelectTrigger>
                                        <SelectContent>
                                            {REJECTION_TEMPLATES.map((t, idx) => (
                                                <SelectItem key={idx} value={t.text}>{t.label}</SelectItem>
                                            ))}
                                            <SelectItem value="">Custom Reason</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <Label>Reason for Rejection</Label>
                                    <Textarea
                                        placeholder="Specific reason for rejection..."
                                        value={rejectionReason}
                                        onChange={e => setRejectionReason(e.target.value)}
                                        className="h-32"
                                    />
                                    <p className="text-xs text-muted-foreground mt-2">This message will be sent to the candidate.</p>
                                </div>
                            </div>
                            <DialogFooter>
                                <Button variant="outline" onClick={() => setIsRejectOpen(false)}>Cancel</Button>
                                <Button variant="destructive" onClick={handleReject} disabled={submitting || !rejectionReason}>Confirm Rejection</Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>

                    <Button
                        onClick={() => handleStageChange(ApplicationStage.OFFER)}
                        disabled={app.currentStage === ApplicationStage.OFFER}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white"
                    >
                        Move to Offer
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Sidebar Info */}
                <div className="space-y-6">
                    <GlassCard className="p-5 space-y-4">
                        <h3 className="font-semibold text-lg flex items-center gap-2">
                            <User className="w-5 h-5 text-primary" /> Candidate Details
                        </h3>
                        <div className="space-y-3 text-sm">
                            <div className="flex justify-between py-2 border-b border-white/5">
                                <span className="text-muted-foreground">Applied Date</span>
                                <span className="font-medium">{new Date(app.createdAt).toLocaleDateString()}</span>
                            </div>
                            <div className="flex justify-between py-2 border-b border-white/5">
                                <span className="text-muted-foreground">Department</span>
                                <span className="font-medium">{app.departmentName}</span>
                            </div>
                            <div className="flex justify-between py-2 border-b border-white/5">
                                <span className="text-muted-foreground">Phone</span>
                                <span className="font-medium">{candidate?.mobilePhone || 'N/A'}</span>
                            </div>
                            <div className="pt-2">
                                <Button variant="outline" className="w-full" onClick={() => {
                                    if (candidate?.cvUrl) window.open(candidate.cvUrl, '_blank');
                                    else toast.info('No CV uploaded/viewable for this candidate');
                                }}>
                                    <FileText className="w-4 h-4 mr-2" /> View CV
                                </Button>
                            </div>
                        </div>
                    </GlassCard>

                    {/* Recruitment Stage Progress */}
                    <GlassCard className="p-5">
                        <h3 className="font-semibold text-lg mb-4">Pipeline Stage</h3>
                        <div className="relative border-l-2 border-muted ml-3 space-y-8 py-2">
                            {[ApplicationStage.SCREENING, ApplicationStage.DEPARTMENT_INTERVIEW, ApplicationStage.HR_INTERVIEW, ApplicationStage.OFFER].map((stage, index) => {
                                const isCompleted = [ApplicationStage.DEPARTMENT_INTERVIEW, ApplicationStage.HR_INTERVIEW, ApplicationStage.OFFER].includes(app.currentStage) && stage === ApplicationStage.SCREENING ||
                                    [ApplicationStage.HR_INTERVIEW, ApplicationStage.OFFER].includes(app.currentStage) && stage === ApplicationStage.DEPARTMENT_INTERVIEW ||
                                    stage === app.currentStage;

                                const isActive = stage === app.currentStage;

                                return (
                                    <div key={stage} className="relative pl-6">
                                        <div className={`absolute -left-[9px] top-1 w-4 h-4 rounded-full border-2 
                                      ${isActive ? 'bg-primary border-primary' : isCompleted ? 'bg-primary border-primary' : 'bg-background border-muted'}`}
                                        />
                                        <div className={`${isActive ? 'text-primary font-bold' : isCompleted ? 'text-foreground' : 'text-muted-foreground'}`}>
                                            {stage.replace('_', ' ').toUpperCase()}
                                        </div>
                                        {isActive && <div className="text-xs text-muted-foreground mt-1">Current Stage</div>}
                                    </div>
                                );
                            })}
                        </div>
                    </GlassCard>
                </div>

                {/* Main Content Areas */}
                <div className="lg:col-span-2">
                    <Tabs defaultValue="interviews" className="w-full">
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="interviews">Interviews & Feedback</TabsTrigger>
                            <TabsTrigger value="notes">Notes & Activity</TabsTrigger>
                        </TabsList>

                        <TabsContent value="interviews" className="space-y-4 mt-4">
                            {/* Interview Header */}
                            <div className="flex justify-between items-center">
                                <h3 className="font-semibold text-lg">Scheduled Interviews</h3>
                                <Dialog open={isScheduleOpen} onOpenChange={setIsScheduleOpen}>
                                    <DialogTrigger asChild>
                                        <Button size="sm"><Calendar className="w-4 h-4 mr-2" /> Schedule New</Button>
                                    </DialogTrigger>
                                    <DialogContent>
                                        <DialogHeader><DialogTitle>Schedule Interview</DialogTitle></DialogHeader>
                                        <div className="space-y-4 py-4">
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <Label>Date</Label>
                                                    <Input type="date" value={interviewForm.date} onChange={e => setInterviewForm({ ...interviewForm, date: e.target.value })} />
                                                </div>
                                                <div>
                                                    <Label>Time</Label>
                                                    <Input type="time" value={interviewForm.time} onChange={e => setInterviewForm({ ...interviewForm, time: e.target.value })} />
                                                </div>
                                            </div>
                                            <div>
                                                <Label>Method</Label>
                                                <Select value={interviewForm.method} onValueChange={val => setInterviewForm({ ...interviewForm, method: val as any })}>
                                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="video">Video Call</SelectItem>
                                                        <SelectItem value="onsite">On-Site</SelectItem>
                                                        <SelectItem value="phone">Phone Screen</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div>
                                                <Label>Location / Link</Label>
                                                <Input placeholder="Zoom Link or Meeting Room" value={interviewForm.location} onChange={e => setInterviewForm({ ...interviewForm, location: e.target.value })} />
                                            </div>

                                            <div>
                                                <Label>Interview Panel (Select Multiple)</Label>
                                                <div className="grid grid-cols-2 gap-2 mt-2 max-h-40 overflow-y-auto p-2 border rounded-md bg-muted/20">
                                                    {employees.map(emp => {
                                                        const isSelected = interviewForm.panel.includes(emp.id);
                                                        return (
                                                            <div
                                                                key={emp.id}
                                                                className={`flex items-center gap-2 p-1.5 rounded text-sm cursor-pointer transition-colors ${isSelected ? 'bg-primary/20 text-primary-foreground border-primary/20' : 'hover:bg-muted'}`}
                                                                onClick={() => {
                                                                    setInterviewForm(prev => ({
                                                                        ...prev,
                                                                        panel: isSelected
                                                                            ? prev.panel.filter(id => id !== emp.id)
                                                                            : [...prev.panel, emp.id]
                                                                    }));
                                                                }}
                                                            >
                                                                <div className={`w-3.5 h-3.5 rounded-sm border flex items-center justify-center ${isSelected ? 'bg-primary border-primary' : 'bg-background border-muted'}`}>
                                                                    {isSelected && <CheckCircle2 className="w-2.5 h-2.5 text-white" />}
                                                                </div>
                                                                <span className="truncate">{emp.fullName}</span>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                                <p className="text-[10px] text-muted-foreground mt-1">Selected: {interviewForm.panel.length} interviewed(s)</p>
                                            </div>
                                        </div>
                                        <DialogFooter>
                                            <Button onClick={handleScheduleInterview} disabled={submitting}>Schedule</Button>
                                        </DialogFooter>
                                    </DialogContent>
                                </Dialog>
                            </div>

                            {interviews.length === 0 ? (
                                <GlassCard className="p-8 text-center text-muted-foreground border-dashed">
                                    <Calendar className="w-12 h-12 mx-auto opacity-20 mb-2" />
                                    <p>No interviews scheduled yet.</p>
                                </GlassCard>
                            ) : (
                                <div className="space-y-3">
                                    {interviews.map(interview => (
                                        <GlassCard key={interview.id} className="p-4">
                                            <div className="flex justify-between items-start">
                                                <div className="flex items-start gap-3">
                                                    <div className="bg-primary/10 p-2.5 rounded-lg text-primary">
                                                        {interview.method === InterviewMethod.VIDEO ? <Video className="w-5 h-5" /> : <MapPin className="w-5 h-5" />}
                                                    </div>
                                                    <div>
                                                        <h4 className="font-semibold text-foreground">
                                                            {interview.method.charAt(0).toUpperCase() + interview.method.slice(1)} Interview
                                                        </h4>
                                                        <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                                                            <Calendar className="w-3.5 h-3.5" />
                                                            {new Date(interview.scheduledDate).toLocaleDateString()}
                                                            <Clock className="w-3.5 h-3.5 ml-2" />
                                                            {new Date(interview.scheduledDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        </div>
                                                        {(interview.videoLink || interview.method === InterviewMethod.ONSITE) && (
                                                            <div className="text-xs mt-2 bg-muted/50 px-2 py-1 rounded inline-block text-muted-foreground">
                                                                {interview.videoLink || 'On-Site Location'}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="flex flex-col gap-2 items-end">
                                                    <Badge variant={interview.status === 'completed' ? 'default' : 'outline'}>
                                                        {interview.status}
                                                    </Badge>

                                                    {interview.status !== 'completed' && interview.status !== 'cancelled' && (
                                                        <Button
                                                            size="sm"
                                                            variant="secondary"
                                                            className="h-7 text-xs"
                                                            onClick={() => {
                                                                setFeedbackForm({ ...feedbackForm, interviewId: interview.id });
                                                                setIsFeedbackOpen(true);
                                                            }}
                                                        >
                                                            Add Feedback
                                                        </Button>
                                                    )}
                                                </div>
                                            </div>
                                        </GlassCard>
                                    ))}
                                </div>
                            )}
                        </TabsContent>

                        <TabsContent value="notes" className="space-y-6 mt-4">
                            {/* REC-024: Internal Notes */}
                            <div className="space-y-3">
                                <Label>Add Internal Note</Label>
                                <div className="flex gap-2">
                                    <Textarea
                                        placeholder="Type internal recruiter notes here..."
                                        value={internalNote}
                                        onChange={e => setInternalNote(e.target.value)}
                                        className="resize-none h-20"
                                    />
                                    <Button onClick={handleAddNote} className="h-20 items-center">
                                        Post Note
                                    </Button>
                                </div>
                            </div>

                            {/* REC-023: Activity Feed / Audit Trail */}
                            <div className="space-y-4">
                                <h3 className="font-semibold text-lg flex items-center gap-2">
                                    <Clock className="w-5 h-5 text-primary" /> Application Activity
                                </h3>

                                <div className="space-y-4 pl-2">
                                    {history.length === 0 ? (
                                        <p className="text-center text-muted-foreground py-8 border-2 border-dashed rounded-xl">No activity recorded yet.</p>
                                    ) : (
                                        history.map((log, idx) => (
                                            <div key={log.id || idx} className="relative pl-6 pb-2 border-l border-muted/50 last:border-0">
                                                <div className="absolute -left-1.5 top-1.5 w-3 h-3 rounded-full bg-primary/20 border border-primary/40" />
                                                <div className="space-y-1">
                                                    <div className="flex justify-between items-start">
                                                        <p className="text-sm font-medium text-foreground capitalize">
                                                            {log.action?.replace('_', ' ') || 'Stage Change'}
                                                        </p>
                                                        <span className="text-[10px] text-muted-foreground">{new Date(log.createdAt).toLocaleString()}</span>
                                                    </div>

                                                    {log.newStage && (
                                                        <p className="text-xs text-muted-foreground">
                                                            Moved to <span className="text-primary font-medium">{log.newStage.replace('_', ' ')}</span>
                                                            {log.oldStage && <> from <span className="line-through">{log.oldStage.replace('_', ' ')}</span></>}
                                                        </p>
                                                    )}

                                                    {log.notes && (
                                                        <div className="mt-2 bg-muted/30 p-2.5 rounded-lg text-xs leading-relaxed italic border border-white/5">
                                                            "{log.notes}"
                                                        </div>
                                                    )}

                                                    <p className="text-[10px] text-muted-foreground/60 mt-1">
                                                        By: {log.changedBy || 'System'}
                                                    </p>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </TabsContent>
                    </Tabs>
                </div>
            </div>

            {/* Feedback Dialog */}
            <Dialog open={isFeedbackOpen} onOpenChange={setIsFeedbackOpen}>
                <DialogContent>
                    <DialogHeader><DialogTitle>Submit Structured Feedback (REC-020)</DialogTitle></DialogHeader>
                    <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto px-1">
                        <div>
                            <Label>Overall Rating (1-5)</Label>
                            <Select value={String(feedbackForm.rating)} onValueChange={v => setFeedbackForm({ ...feedbackForm, rating: Number(v) })}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {[1, 2, 3, 4, 5].map(n => <SelectItem key={n} value={String(n)}>{n} Stars</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
                            <Label>Key Strengths</Label>
                            <Textarea
                                value={feedbackForm.strengths}
                                onChange={e => setFeedbackForm({ ...feedbackForm, strengths: e.target.value })}
                                placeholder="What did the candidate do well?"
                                className="min-h-[80px]"
                            />
                        </div>

                        <div>
                            <Label>Areas for Improvement / Weaknesses</Label>
                            <Textarea
                                value={feedbackForm.weaknesses}
                                onChange={e => setFeedbackForm({ ...feedbackForm, weaknesses: e.target.value })}
                                placeholder="Where did the candidate struggle?"
                                className="min-h-[80px]"
                            />
                        </div>

                        <div>
                            <Label>Additional Comments</Label>
                            <Textarea
                                value={feedbackForm.comments}
                                onChange={e => setFeedbackForm({ ...feedbackForm, comments: e.target.value })}
                                placeholder="Any other notes..."
                                className="min-h-[60px]"
                            />
                        </div>

                        <div>
                            <Label>Final Recommendation</Label>
                            <Select value={feedbackForm.recommendation} onValueChange={v => setFeedbackForm({ ...feedbackForm, recommendation: v })}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="hire">Strong Hire</SelectItem>
                                    <SelectItem value="hold">Hold / Maybe</SelectItem>
                                    <SelectItem value="reject">Reject</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button onClick={handleSubmitFeedback} disabled={submitting}>Submit Feedback</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
