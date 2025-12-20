'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useAuth } from '@/app/context/AuthContext';
import {
    getApplications,
    updateApplicationStage,
    getJobs,
    getApplicationById
} from '@/app/services/recruitment';
import { Application, JobRequisition } from '@/app/types/recruitment';
import { ApplicationStage, ApplicationStatus } from '@/app/types/enums';
import { GlassCard } from '@/app/components/ui/glass-card';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Badge } from '@/app/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/app/components/ui/avatar';
import {
    Search,
    Filter,
    MoreHorizontal,
    Users,
    Calendar,
    Mail,
    Briefcase,
    Star,
    ArrowRight,
    GripHorizontal,
    Clock
} from 'lucide-react';
import { toast } from 'sonner';

// ==================== TYPES ====================

interface StageColumn {
    id: ApplicationStage;
    title: string;
    color: string;
}

const STAGES: StageColumn[] = [
    { id: ApplicationStage.SCREENING, title: 'Screening', color: 'bg-blue-500/10 border-blue-500/20 text-blue-700' },
    { id: ApplicationStage.DEPARTMENT_INTERVIEW, title: 'Dept. Interview', color: 'bg-purple-500/10 border-purple-500/20 text-purple-700' },
    { id: ApplicationStage.HR_INTERVIEW, title: 'HR Interview', color: 'bg-pink-500/10 border-pink-500/20 text-pink-700' },
    { id: ApplicationStage.OFFER, title: 'Offer', color: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-700' },
];

export default function ApplicationsKanbanPage() {
    const { user } = useAuth();
    const [applications, setApplications] = useState<Application[]>([]);
    const [jobs, setJobs] = useState<JobRequisition[]>([]);

    // Filters
    const [searchTerm, setSearchTerm] = useState('');
    const [jobFilter, setJobFilter] = useState('all');
    const [loading, setLoading] = useState(true);
    const [draggedAppId, setDraggedAppId] = useState<string | null>(null);

    // Initial Data Fetch
    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            const [appsData, jobsData] = await Promise.all([
                getApplications(),
                getJobs()
            ]);
            setApplications(appsData || []);
            setJobs(jobsData || []);
        } catch (error) {
            console.error('Failed to load data:', error);
            toast.error('Failed to load applications');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Handle Drop Logic
    const handleDrop = async (targetStage: ApplicationStage) => {
        if (!draggedAppId) return;

        // Optimistic Update
        const appToMove = applications.find(a => a.id === draggedAppId);
        if (!appToMove || appToMove.currentStage === targetStage) return;

        const previousStage = appToMove.currentStage;

        setApplications(prev => prev.map(app =>
            app.id === draggedAppId
                ? { ...app, currentStage: targetStage }
                : app
        ));

        try {
            await updateApplicationStage(draggedAppId, targetStage);
            toast.success(`Moved to ${STAGES.find(s => s.id === targetStage)?.title}`);
        } catch (error: any) {
            // Revert on failure
            setApplications(prev => prev.map(app =>
                app.id === draggedAppId
                    ? { ...app, currentStage: previousStage }
                    : app
            ));
            toast.error(error.message || 'Failed to update stage');
        } finally {
            setDraggedAppId(null);
        }
    };

    // Filter Logic
    const filteredApplications = useMemo(() => {
        return applications.filter(app => {
            // Basic Search
            const matchesSearch =
                app.candidateName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                app.jobTitle?.toLowerCase().includes(searchTerm.toLowerCase());

            // Job Filter
            const matchesJob = jobFilter === 'all' || app.requisitionId === jobFilter;

            // Active only (hide rejected/hired for kanban clarity unless specifically requested?)
            // For now show all active ones.
            const isActive = app.status !== ApplicationStatus.REJECTED && app.status !== ApplicationStatus.HIRED;

            return matchesSearch && matchesJob && isActive;
        });
    }, [applications, searchTerm, jobFilter]);

    // Group by Stage
    const columns = useMemo(() => {
        const cols: Record<string, Application[]> = {};
        STAGES.forEach(s => cols[s.id] = []);

        filteredApplications.forEach(app => {
            // If stage matches, add to column. Fallback to screening if undefined.
            const stage = app.currentStage || ApplicationStage.SCREENING;
            if (cols[stage]) {
                cols[stage].push(app);
            }
        });
        return cols;
    }, [filteredApplications]);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-16 h-16 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div>
                    <p className="text-muted-foreground animate-pulse font-medium">Loading board...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="h-[calc(100vh-2rem)] flex flex-col space-y-4 max-w-[1600px] mx-auto p-4 sm:p-6 pb-2">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shrink-0">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
                        <Users className="w-6 h-6 text-primary" />
                        Candidate Pipeline
                    </h1>
                    <p className="text-muted-foreground text-sm mt-1">
                        Drag candidates to move them through the hiring process.
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                    {/* Job Filter */}
                    <div className="relative">
                        <select
                            className="h-10 w-[200px] rounded-lg border border-input bg-background pl-3 pr-8 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 appearance-none"
                            value={jobFilter}
                            onChange={(e) => setJobFilter(e.target.value)}
                        >
                            <option value="all">All Jobs</option>
                            {jobs.map(job => (
                                <option key={job.id} value={job.id}>{job.title || job.templateTitle || 'Untitled Position'}</option>
                            ))}
                        </select>
                        <Briefcase className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
                    </div>

                    {/* Search */}
                    <div className="relative">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search candidates..."
                            className="pl-9 w-[200px] lg:w-[300px]"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    <Button>
                        <Filter className="w-4 h-4 mr-2" /> Filters
                    </Button>
                </div>
            </div>

            {/* Kanban Board */}
            <div className="flex-1 overflow-x-auto overflow-y-hidden pb-4">
                <div className="flex h-full gap-5 min-w-[1000px]">
                    {STAGES.map((stage) => (
                        <div
                            key={stage.id}
                            className="flex-1 flex flex-col min-w-[300px] max-w-[380px] h-full"
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={() => handleDrop(stage.id)}
                        >
                            {/* Column Header */}
                            <div className={`p-4 rounded-t-xl border-t border-x ${stage.color} backdrop-blur-sm flex items-center justify-between shrink-0 mb-2 shadow-sm`}>
                                <div className="flex items-center gap-2 font-semibold">
                                    <span>{stage.title}</span>
                                    <Badge variant="secondary" className="bg-background/50 ml-2 rounded-full px-2">
                                        {columns[stage.id]?.length || 0}
                                    </Badge>
                                </div>
                            </div>

                            {/* Column Content */}
                            <div className="flex-1 bg-muted/20 rounded-xl border border-border/50 p-2 overflow-y-auto custom-scrollbar space-y-3">
                                {columns[stage.id]?.length === 0 ? (
                                    <div className="h-32 flex flex-col items-center justify-center text-muted-foreground text-sm border-2 border-dashed border-muted rounded-lg m-2">
                                        <GripHorizontal className="w-8 h-8 opacity-20 mb-2" />
                                        <span>No candidates</span>
                                    </div>
                                ) : (
                                    columns[stage.id]?.map((app) => (
                                        <KanbanCard
                                            key={app.id}
                                            application={app}
                                            onDragStart={() => setDraggedAppId(app.id)}
                                        />
                                    ))
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

// ==================== KANBAN CARD COMPONENT ====================

function KanbanCard({ application, onDragStart }: { application: Application; onDragStart: () => void }) {
    // Note: 'source' and 'referral' tracking would come from fetched candidate details in a full implementation
    const isReferral = false;

    return (
        <div
            draggable
            onDragStart={onDragStart}
            className="group cursor-move relative touch-none"
        >
            <GlassCard
                variant="hover"
                className="p-4 active:cursor-grabbing active:scale-[0.98] transition-transform"
            >
                <div className="flex justify-between items-start mb-2">
                    <div className="flex gap-2">
                        <div className="mt-1">
                            <h3 className="font-semibold text-foreground text-sm line-clamp-1" title={application.candidateName}>
                                {application.candidateName}
                            </h3>
                            <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5" title={application.jobTitle}>
                                <Briefcase className="w-3 h-3" />
                                <span className="line-clamp-1 max-w-[140px]">{application.jobTitle}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex items-center justify-between mt-4">
                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {application.createdAt ? new Date(application.createdAt).toLocaleDateString() : 'Recent'}
                    </div>

                    <Link href={`/dashboard/recruiter/recruitment/applications/${application.id}`} draggable={false}>
                        <Button size="sm" variant="ghost" className="h-7 px-2 text-xs">
                            View <ArrowRight className="w-3 h-3 ml-1" />
                        </Button>
                    </Link>
                </div>

                {/* Hover Indicator */}
                <div className="absolute inset-0 border-2 border-primary/0 group-hover:border-primary/50 rounded-xl transition-all pointer-events-none" />
            </GlassCard>
        </div>
    );
}
