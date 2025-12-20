
'use client';   
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/app/context/AuthContext';
import {
    getInterviews,
    updateInterview
} from '@/app/services/recruitment';
import { Interview } from '@/app/types/recruitment';
import { InterviewStatus, InterviewMethod } from '@/app/types/enums';
import { GlassCard } from '@/app/components/ui/glass-card';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { Input } from '@/app/components/ui/input';
import {
    Calendar,
    Clock,
    Video,
    MapPin,
    User,
    Briefcase,
    ExternalLink,
    CheckCircle2,
    XCircle,
    Search,
    Phone
} from 'lucide-react';

import { toast } from 'sonner';

export default function RecruitInterviewsPage() {
    const { user } = useAuth();
    const [interviews, setInterviews] = useState<Interview[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('upcoming'); // upcoming, history
    const [searchTerm, setSearchTerm] = useState('');

    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            // Fetch all interviews (backend filtering by date would be better, but doing client side for now as per minimal services)
            const data = await getInterviews();
            setInterviews(data || []);
        } catch (error) {
            console.error(error);
            toast.error('Failed to load interviews');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const filteredInterviews = interviews.filter(int => {
        const date = new Date(int.scheduledDate);
        const now = new Date();
        const isUpcoming = date >= now && int.status !== InterviewStatus.COMPLETED && int.status !== InterviewStatus.CANCELLED;
        const isHistory = date < now || int.status === InterviewStatus.COMPLETED || int.status === InterviewStatus.CANCELLED;

        const matchesFilter = filter === 'upcoming' ? isUpcoming : isHistory;
        const matchesSearch = int.candidateName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            int.jobTitle?.toLowerCase().includes(searchTerm.toLowerCase());

        return matchesFilter && matchesSearch;
    }).sort((a, b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime());

    const handleMarkComplete = async (id: string) => {
        try {
            await updateInterview(id, { status: InterviewStatus.COMPLETED });
            setInterviews(prev => prev.map(i => i.id === id ? { ...i, status: InterviewStatus.COMPLETED } : i));
            toast.success('Interview marked as completed');
        } catch (e) {
            toast.error('Failed to update status');
        }
    };

    return (
        <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
                        <Calendar className="w-6 h-6 text-primary" />
                        Interview Schedule
                    </h1>
                    <p className="text-muted-foreground text-sm mt-1">
                        Manage upcoming interviews and assessments.
                    </p>
                </div>

                <div className="flex items-center gap-2 bg-muted/50 p-1 rounded-lg">
                    <Button
                        variant={filter === 'upcoming' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setFilter('upcoming')}
                    >
                        Upcoming
                    </Button>
                    <Button
                        variant={filter === 'history' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setFilter('history')}
                    >
                        History
                    </Button>
                </div>
            </div>

            <div className="relative max-w-md">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="Search candidate or job..."
                    className="pl-9"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                />
            </div>

            {loading ? (
                <div className="text-center py-12">Loading schedule...</div>
            ) : filteredInterviews.length === 0 ? (
                <GlassCard className="p-12 text-center flex flex-col items-center justify-center border-dashed">
                    <Calendar className="w-12 h-12 text-muted-foreground/30 mb-4" />
                    <h3 className="text-lg font-medium">No interviews found</h3>
                    <p className="text-muted-foreground">
                        {filter === 'upcoming' ? 'No upcoming interviews scheduled.' : 'No interview history found.'}
                    </p>
                </GlassCard>
            ) : (
                <div className="grid gap-4">
                    {filteredInterviews.map((interview) => (
                        <GlassCard key={interview.id} className="p-4 sm:p-5 flex flex-col md:flex-row gap-4 justify-between items-start md:items-center hover:bg-muted/5 transition-colors">
                            <div className="flex items-start gap-4">
                                <div className={`p-3 rounded-full shrink-0 ${interview.method === InterviewMethod.VIDEO ? 'bg-blue-100 text-blue-600' :
                                        interview.method === InterviewMethod.ONSITE ? 'bg-purple-100 text-purple-600' : 'bg-orange-100 text-orange-600'
                                    }`}>
                                    {interview.method === InterviewMethod.VIDEO ? <Video className="w-5 h-5" /> :
                                        interview.method === InterviewMethod.ONSITE ? <MapPin className="w-5 h-5" /> : <Phone className="w-5 h-5" />}
                                </div>

                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <h3 className="font-semibold text-foreground text-lg">{interview.candidateName}</h3>
                                        <Badge variant="secondary" className="text-xs font-normal">
                                            {interview.method.toUpperCase()}
                                        </Badge>
                                    </div>
                                    <div className="space-y-1 text-sm text-muted-foreground">
                                        <div className="flex items-center gap-2">
                                            <Briefcase className="w-4 h-4" />
                                            {interview.jobTitle}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Calendar className="w-4 h-4" />
                                            {new Date(interview.scheduledDate).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                                            <span className="text-foreground font-medium">
                                                at {new Date(interview.scheduledDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto items-stretch md:items-center">
                                {interview.status === InterviewStatus.SCHEDULED && (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="border-green-200 hover:bg-green-50 text-green-700"
                                        onClick={() => handleMarkComplete(interview.id)}
                                    >
                                        <CheckCircle2 className="w-4 h-4 mr-2" /> Mark Done
                                    </Button>
                                )}

                                <Link href={`/dashboard/recruiter/recruitment/applications/${interview.applicationId}?tab=interviews`}>
                                    <Button size="sm" variant="ghost">View Application</Button>
                                </Link>

                                {interview.method === InterviewMethod.VIDEO && interview.location?.includes('http') && (
                                    <Button size="sm" className="bg-blue-600 hover:bg-blue-700" onClick={() => window.open(interview.location, '_blank')}>
                                        Join Call <ExternalLink className="w-4 h-4 ml-2" />
                                    </Button>
                                )}
                            </div>
                        </GlassCard>
                    ))}
                </div>
            )}
        </div>
    );
}
