'use client';

import { useState, useEffect } from 'react';
import { employeeProfileService } from '@/app/services/employee-profile';
import { timeManagementService, AttendanceCorrectionRequest, AttendanceRecord } from '@/app/services/time-management';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Textarea } from '@/app/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/app/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/app/components/ui/dialog';
import { Badge } from '@/app/components/ui/badge';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/app/components/ui/tabs';
import Link from 'next/link';
import { GlassCard } from '@/app/components/ui/glass-card';
import { ArrowLeft, Clock, FileText, CheckCircle2, XCircle, AlertCircle, Calendar, Plus } from 'lucide-react';

export default function CorrectionRequestsPage() {
    const [employeeId, setEmployeeId] = useState<string | null>(null);
    const [requests, setRequests] = useState<AttendanceCorrectionRequest[]>([]);
    const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [viewRequest, setViewRequest] = useState<AttendanceCorrectionRequest | null>(null);

    // Dialog State
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    // Form State
    const [selectedRecordId, setSelectedRecordId] = useState<string>('');
    const [reason, setReason] = useState('');
    const [correctedDate, setCorrectedDate] = useState('');
    const [correctedTime, setCorrectedTime] = useState('');

    const [activeTab, setActiveTab] = useState("profile");
    const [profileRequests, setProfileRequests] = useState<any[]>([]);

    useEffect(() => {
        const init = async () => {
            try {
                setLoading(true);
                const profileRes = await employeeProfileService.getMyProfile();
                const empId = (profileRes.data as any)._id;
                setEmployeeId(empId);

                // Fetch Attendance Corrections
                const attendanceRes = await timeManagementService.getEmployeeCorrections(empId);
                setRequests(attendanceRes.data || []);

                // Fetch Profile Corrections
                const profileReqRes = await employeeProfileService.getMyCorrectionRequests(empId);
                const profileData = profileReqRes.data;
                if (Array.isArray(profileData)) {
                    setProfileRequests(profileData);
                } else if (profileData && typeof profileData === 'object') {
                    // Handle paginated response { data: [...] } or { items: [...] }
                    if (Array.isArray((profileData as any).data)) {
                        setProfileRequests((profileData as any).data);
                    } else if (Array.isArray((profileData as any).items)) {
                        setProfileRequests((profileData as any).items);
                    } else {
                        setProfileRequests([]);
                    }
                } else {
                    setProfileRequests([]);
                }

                // Fetch Attendance Records for dropdown
                const now = new Date();
                const recordsRes = await timeManagementService.getMonthlyAttendance(empId, now.getMonth() + 1, now.getFullYear());
                setAttendanceRecords(recordsRes.data || []);

            } catch (error) {
                console.error("Failed to load data", error);
                toast.error("Failed to load requests");
            } finally {
                setLoading(false);
            }
        };
        init();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!employeeId || !selectedRecordId || !reason || !correctedDate || !correctedTime) {
            toast.error("Please fill all fields");
            return;
        }

        try {
            setSubmitting(true);
            // Format date to dd/MM/yyyy as required by backend
            const dateObj = new Date(correctedDate);
            const formattedDate = format(dateObj, 'dd/MM/yyyy');

            await timeManagementService.requestAttendanceCorrection({
                employeeId,
                attendanceRecordId: selectedRecordId,
                reason,
                correctedPunchDate: formattedDate,
                correctedPunchLocalTime: correctedTime
            });

            toast.success("Correction request submitted successfully");

            // Refresh requests
            const requestsRes = await timeManagementService.getEmployeeCorrections(employeeId);
            setRequests(requestsRes.data || []);

            setIsDialogOpen(false);
            // Reset form
            setSelectedRecordId('');
            setReason('');
            setCorrectedDate('');
            setCorrectedTime('');

        } catch (error: any) {
            console.error("Failed to submit request", error);
            toast.error(error.response?.data?.message || "Failed to submit request");
        } finally {
            setSubmitting(false);
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'APPROVED': return <Badge className="bg-green-500/10 text-green-600 hover:bg-green-500/20 shadow-none border-green-500/20 text-[10px] px-1.5 py-0 h-5"><CheckCircle2 className="w-3 h-3 mr-1" /> Approved</Badge>;
            case 'REJECTED': return <Badge className="bg-red-500/10 text-red-600 hover:bg-red-500/20 shadow-none border-red-500/20 text-[10px] px-1.5 py-0 h-5"><XCircle className="w-3 h-3 mr-1" /> Rejected</Badge>;
            case 'SUBMITTED': return <Badge className="bg-yellow-500/10 text-yellow-600 hover:bg-yellow-500/20 shadow-none border-yellow-500/20 text-[10px] px-1.5 py-0 h-5"><Clock className="w-3 h-3 mr-1" /> Submitted</Badge>;
            case 'IN_REVIEW': return <Badge className="bg-blue-500/10 text-blue-600 hover:bg-blue-500/20 shadow-none border-blue-500/20 text-[10px] px-1.5 py-0 h-5"><AlertCircle className="w-3 h-3 mr-1" /> In Review</Badge>;
            default: return <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5">{status}</Badge>;
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-16 h-16 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div>
                    <p className="text-muted-foreground animate-pulse font-medium">Loading requests...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen pb-10 relative">
            <div className="absolute top-0 right-0 w-1/3 h-96 bg-blue-500/5 rounded-bl-[100px] -z-10 blur-3xl pointer-events-none" />

            <div className="space-y-6 max-w-5xl mx-auto px-4 sm:px-6 py-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <div className="flex items-center gap-2 text-muted-foreground mb-1">
                            <Link href="/dashboard/department-employee/employee-profile" className="hover:text-primary transition-colors flex items-center gap-1 text-xs">
                                <ArrowLeft className="w-3 h-3" /> Back to Profile
                            </Link>
                        </div>
                        <h1 className="text-2xl font-bold tracking-tight text-foreground">Correction Requests</h1>
                        <p className="text-xs text-muted-foreground mt-0.5">Track and manage your profile and attendance changes</p>
                    </div>

                    <div className="flex gap-2">
                        {activeTab === 'attendance' && (
                            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                                <DialogTrigger asChild>
                                    <Button size="sm" className="shadow-sm shadow-primary/20 h-9 text-xs">
                                        <Plus className="w-3.5 h-3.5 mr-2" /> New Attendance Request
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="sm:max-w-[450px]">
                                    <DialogHeader>
                                        <DialogTitle className="text-lg">Submit Correction Request</DialogTitle>
                                        <DialogDescription className="text-xs">
                                            Request a correction for an incorrect or missing punch.
                                        </DialogDescription>
                                    </DialogHeader>
                                    <form onSubmit={handleSubmit} className="space-y-4 py-2">
                                        <div className="space-y-1.5">
                                            <Label htmlFor="record" className="text-xs font-semibold">Attendance Record</Label>
                                            <Select value={selectedRecordId} onValueChange={setSelectedRecordId}>
                                                <SelectTrigger className="h-9 text-sm">
                                                    <SelectValue placeholder="Select a date" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {attendanceRecords.map((record) => {
                                                        const dateStr = record.createdAt ? new Date(record.createdAt).toLocaleDateString() : 'Unknown Date';
                                                        const punches = record.punches || [];
                                                        const punchesStr = punches.map(p => `${p.type} ${new Date(p.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`).join(', ');

                                                        return (
                                                            <SelectItem key={record._id} value={record._id} className="text-sm">
                                                                {dateStr} - {punchesStr || 'No Punches'}
                                                            </SelectItem>
                                                        );
                                                    })}
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-1.5">
                                                <Label htmlFor="date" className="text-xs font-semibold">Corrected Date</Label>
                                                <Input
                                                    id="date"
                                                    type="date"
                                                    value={correctedDate}
                                                    onChange={(e) => setCorrectedDate(e.target.value)}
                                                    required
                                                    className="h-9 text-sm"
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label htmlFor="time" className="text-xs font-semibold">Corrected Time</Label>
                                                <Input
                                                    id="time"
                                                    type="time"
                                                    value={correctedTime}
                                                    onChange={(e) => setCorrectedTime(e.target.value)}
                                                    required
                                                    className="h-9 text-sm"
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-1.5">
                                            <Label htmlFor="reason" className="text-xs font-semibold">Reason</Label>
                                            <Textarea
                                                id="reason"
                                                placeholder="Explain why this correction is needed..."
                                                value={reason}
                                                onChange={(e) => setReason(e.target.value)}
                                                required
                                                className="text-sm min-h-[80px]"
                                            />
                                        </div>

                                        <DialogFooter className="pt-2">
                                            <Button type="button" variant="outline" size="sm" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                                            <Button type="submit" size="sm" disabled={submitting}>
                                                {submitting ? 'Submitting...' : 'Submit Request'}
                                            </Button>
                                        </DialogFooter>
                                    </form>
                                </DialogContent>
                            </Dialog>
                        )}
                        {activeTab === 'profile' && (
                            <Link href="/dashboard/department-employee/employee-profile/edit?tab=correction">
                                <Button size="sm" className="shadow-sm shadow-primary/20 h-9 text-xs">
                                    <Plus className="w-3.5 h-3.5 mr-2" /> New Profile Correction
                                </Button>
                            </Link>
                        )}
                    </div>
                </div>

                <Tabs defaultValue="profile" className="w-full" onValueChange={setActiveTab}>
                    <div className="border-b border-border/50 mb-5">
                        <TabsList className="bg-transparent h-auto p-0 gap-6">
                            <TabsTrigger
                                value="profile"
                                className="bg-transparent border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none rounded-none px-2 py-2.5 text-muted-foreground data-[state=active]:text-foreground transition-all text-sm"
                            >
                                <div className="flex items-center gap-2">
                                    <FileText className="w-3.5 h-3.5" />
                                    Profile Corrections
                                </div>
                            </TabsTrigger>
                            <TabsTrigger
                                value="attendance"
                                className="bg-transparent border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none rounded-none px-2 py-2.5 text-muted-foreground data-[state=active]:text-foreground transition-all text-sm"
                            >
                                <div className="flex items-center gap-2">
                                    <Clock className="w-3.5 h-3.5" />
                                    Attendance Corrections
                                </div>
                            </TabsTrigger>
                        </TabsList>
                    </div>

                    <TabsContent value="profile" className="focus-visible:outline-none animate-in fade-in slide-in-from-right-4 duration-300">
                        <GlassCard className="overflow-hidden">
                            <div className="p-4 border-b border-border/50">
                                <h3 className="font-semibold text-base">Profile Data Corrections</h3>
                                <p className="text-xs text-muted-foreground mt-0.5">Requests to change your personal or employment details.</p>
                            </div>

                            {profileRequests.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-12 text-center">
                                    <div className="w-12 h-12 bg-muted/30 rounded-full flex items-center justify-center mb-3">
                                        <FileText className="w-6 h-6 text-muted-foreground/50" />
                                    </div>
                                    <h4 className="text-foreground font-medium text-sm">No Request History</h4>
                                    <p className="text-xs text-muted-foreground mt-0.5 max-w-xs">
                                        You haven't submitted any profile correction requests yet.
                                    </p>
                                </div>
                            ) : (
                                <div className="relative overflow-x-auto">
                                    <Table>
                                        <TableHeader className="bg-muted/50">
                                            <TableRow>
                                                <TableHead className="text-xs h-9">Date Requested</TableHead>
                                                <TableHead className="text-xs h-9">Description</TableHead>
                                                <TableHead className="text-xs h-9">Status</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody className="text-sm">
                                            {profileRequests.map((req) => (
                                                <TableRow key={req._id} className="hover:bg-muted/10 transition-colors">
                                                    <TableCell className="font-medium text-foreground py-3">
                                                        {req.createdAt ? new Date(req.createdAt).toLocaleDateString() : '-'}
                                                    </TableCell>
                                                    <TableCell className="max-w-[300px] truncate text-muted-foreground py-3" title={req.requestDescription}>
                                                        {req.requestDescription || "No description"}
                                                    </TableCell>
                                                    <TableCell className="py-3">{getStatusBadge(req.status)}</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            )}
                        </GlassCard>
                    </TabsContent>

                    <TabsContent value="attendance" className="focus-visible:outline-none animate-in fade-in slide-in-from-right-4 duration-300">
                        <GlassCard className="overflow-hidden">
                            <div className="p-4 border-b border-border/50">
                                <h3 className="font-semibold text-base">Attendance Correction History</h3>
                                <p className="text-xs text-muted-foreground mt-0.5">Status of your submitted attendance punch corrections.</p>
                            </div>

                            {requests.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-12 text-center">
                                    <div className="w-12 h-12 bg-muted/30 rounded-full flex items-center justify-center mb-3">
                                        <Clock className="w-6 h-6 text-muted-foreground/50" />
                                    </div>
                                    <h4 className="text-foreground font-medium text-sm">No Request History</h4>
                                    <p className="text-xs text-muted-foreground mt-0.5 max-w-xs">
                                        You haven't submitted any attendance correction requests yet.
                                    </p>
                                </div>
                            ) : (
                                <div className="relative overflow-x-auto">
                                    <Table>
                                        <TableHeader className="bg-muted/50">
                                            <TableRow>
                                                <TableHead className="text-xs h-9">Created Date</TableHead>
                                                <TableHead className="text-xs h-9">Attendance Record</TableHead>
                                                <TableHead className="text-xs h-9">Reason</TableHead>
                                                <TableHead className="text-xs h-9">Status</TableHead>
                                                <TableHead className="text-right text-xs h-9">Action</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody className="text-sm">
                                            {requests.map((req) => (
                                                <TableRow key={req._id} className="hover:bg-muted/10 transition-colors">
                                                    <TableCell className="font-medium text-foreground py-3">
                                                        {req.createdAt ? new Date(req.createdAt).toLocaleDateString() : '-'}
                                                    </TableCell>
                                                    <TableCell className="text-muted-foreground py-3">
                                                        {typeof req.attendanceRecord === 'string'
                                                            ? <span className="font-mono text-xs">{req.attendanceRecord.substring(0, 8)}...</span>
                                                            : (req.attendanceRecord as any)?.createdAt ?
                                                                <div className="flex items-center gap-2">
                                                                    <Calendar className="w-3.5 h-3.5" />
                                                                    {new Date((req.attendanceRecord as any).createdAt).toLocaleDateString()}
                                                                </div>
                                                                : 'N/A'
                                                        }
                                                    </TableCell>
                                                    <TableCell className="max-w-[200px] truncate text-muted-foreground py-3" title={req.reason}>
                                                        {req.reason}
                                                    </TableCell>
                                                    <TableCell className="py-3">{getStatusBadge(req.status)}</TableCell>
                                                    <TableCell className="text-right py-3">
                                                        <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setViewRequest(req)}>
                                                            View
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            )}
                        </GlassCard>
                    </TabsContent>
                </Tabs>

                {/* View Request Details Dialog */}
                <Dialog open={!!viewRequest} onOpenChange={(open) => !open && setViewRequest(null)}>
                    <DialogContent className="sm:max-w-[450px]">
                        <DialogHeader>
                            <DialogTitle className="text-lg">Request Details</DialogTitle>
                            <DialogDescription className="text-xs">
                                Review the details of your correction request.
                            </DialogDescription>
                        </DialogHeader>
                        {viewRequest && (
                            <div className="space-y-4 py-2">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <Label className="text-[10px] text-muted-foreground uppercase font-semibold">Status</Label>
                                        <div className="mt-1">{getStatusBadge(viewRequest.status)}</div>
                                    </div>
                                    <div>
                                        <Label className="text-[10px] text-muted-foreground uppercase font-semibold">Created At</Label>
                                        <div className="text-xs font-medium mt-1 flex items-center gap-1.5">
                                            <Calendar className="w-3.5 h-3.5" />
                                            {viewRequest.createdAt ? new Date(viewRequest.createdAt).toLocaleString() : '-'}
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-muted/30 p-3 rounded-lg border border-border/50">
                                    <Label className="text-[10px] text-muted-foreground uppercase font-semibold">Attendance Record</Label>
                                    <div className="text-xs font-medium mt-1">
                                        {typeof viewRequest.attendanceRecord === 'string'
                                            ? viewRequest.attendanceRecord
                                            : (viewRequest.attendanceRecord as any)?.createdAt
                                                ? new Date((viewRequest.attendanceRecord as any).createdAt).toLocaleDateString()
                                                : 'ID: ' + (viewRequest.attendanceRecord as any)?._id
                                        }
                                    </div>
                                </div>

                                <div>
                                    <Label className="text-[10px] text-muted-foreground uppercase font-semibold">Reason</Label>
                                    <div className="text-xs mt-1 p-2.5 bg-muted/30 rounded-lg border border-border/50 whitespace-pre-wrap leading-relaxed">
                                        {viewRequest.reason}
                                    </div>
                                </div>

                                {(viewRequest as any).reviewerId && (
                                    <div className="border-t border-border/50 pt-3 mt-2">
                                        <Label className="text-[10px] text-muted-foreground uppercase font-semibold mb-1 block">Reviewer Note</Label>
                                        <div className="text-xs p-2.5 bg-blue-500/5 border border-blue-500/10 rounded-lg text-foreground leading-relaxed">
                                            {(viewRequest as any).reviewNote || <span className="text-muted-foreground italic">No notes provided.</span>}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                        <DialogFooter>
                            <Button size="sm" onClick={() => setViewRequest(null)} className="h-8">Close</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </div>
    );
}
