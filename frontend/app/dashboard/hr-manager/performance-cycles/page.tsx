'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { performanceService } from '@/app/services/performance';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface Cycle {
    _id: string;
    name: string;
    description: string;
    cycleType: 'ANNUAL' | 'SEMI_ANNUAL' | 'PROBATIONARY' | 'PROJECT' | 'AD_HOC';
    status: 'PLANNED' | 'ACTIVE' | 'CLOSED' | 'ARCHIVED';
    startDate: string;
    endDate: string;
    templateId?: {
        _id: string;
        name: string;
    };
    totalAssignments?: number;
    completedAssignments?: number;
    createdAt: string;
    updatedAt: string;
}

interface Template {
    _id: string;
    name: string;
    type: string;
    isActive: boolean;
}

const cycleTypes = [
    { value: 'ANNUAL', label: 'Annual Review' },
    { value: 'SEMI_ANNUAL', label: 'Semi-Annual Review' },
    { value: 'PROBATIONARY', label: 'Probationary Review' },
    { value: 'PROJECT', label: 'Project-Based' },
    { value: 'AD_HOC', label: 'Ad-Hoc Review' },
];

const statusColors: Record<string, string> = {
    PLANNED: 'bg-muted text-muted-foreground border-border',
    ACTIVE: 'bg-foreground text-background border-foreground',
    CLOSED: 'bg-muted-foreground text-background border-muted-foreground',
    ARCHIVED: 'bg-muted text-muted-foreground border-border opacity-50',
};

const getStatusIcon = (status: string) => {
    switch (status) {
        case 'PLANNED':
            return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>;
        case 'ACTIVE':
            return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>;
        case 'CLOSED':
            return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
        case 'ARCHIVED':
            return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" /></svg>;
        default:
            return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>;
    }
};

export default function PerformanceCyclesPage() {
    const [cycles, setCycles] = useState<Cycle[]>([]);
    const [templates, setTemplates] = useState<Template[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');

    // Dialog states
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
    const [selectedCycle, setSelectedCycle] = useState<Cycle | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Form state
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        cycleType: 'ANNUAL' as Cycle['cycleType'],
        startDate: '',
        endDate: '',
        templateId: '',
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [cyclesRes, templatesRes] = await Promise.all([
                performanceService.getCycles(),
                performanceService.getTemplates(),
            ]);

            if (cyclesRes.error) {
                setError(cyclesRes.error);
                return;
            }

            setCycles(Array.isArray(cyclesRes.data) ? cyclesRes.data : []);
            setTemplates(Array.isArray(templatesRes.data) ? templatesRes.data.filter((t: Template) => t.isActive) : []);
        } catch (err: any) {
            setError(err.message || 'Failed to fetch data');
        } finally {
            setLoading(false);
        }
    };

    const handleCreateCycle = async () => {
        try {
            setIsSubmitting(true);
            const payload = {
                ...formData,
                templateId: formData.templateId || undefined,
            };
            const response = await performanceService.createCycle(payload);
            if (response.error) {
                setError(response.error);
                return;
            }
            setIsCreateDialogOpen(false);
            resetForm();
            fetchData();
        } catch (err: any) {
            setError(err.message || 'Failed to create cycle');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleUpdateCycle = async () => {
        if (!selectedCycle) return;
        try {
            setIsSubmitting(true);
            const payload = {
                ...formData,
                templateId: formData.templateId || undefined,
            };
            const response = await performanceService.updateCycle(selectedCycle._id, payload);
            if (response.error) {
                setError(response.error);
                return;
            }
            setIsEditDialogOpen(false);
            resetForm();
            fetchData();
        } catch (err: any) {
            setError(err.message || 'Failed to update cycle');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleStatusChange = async (cycle: Cycle, action: 'activate' | 'close' | 'archive') => {
        try {
            let response;
            switch (action) {
                case 'activate':
                    response = await performanceService.activateCycle(cycle._id);
                    break;
                case 'close':
                    response = await performanceService.closeCycle(cycle._id);
                    break;
                case 'archive':
                    response = await performanceService.archiveCycle(cycle._id);
                    break;
            }
            if (response?.error) {
                setError(response.error);
                return;
            }
            fetchData();
        } catch (err: any) {
            setError(err.message || `Failed to ${action} cycle`);
        }
    };

    const resetForm = () => {
        setFormData({
            name: '',
            description: '',
            cycleType: 'ANNUAL',
            startDate: '',
            endDate: '',
            templateId: '',
        });
        setSelectedCycle(null);
    };

    const openEditDialog = (cycle: Cycle) => {
        setSelectedCycle(cycle);
        setFormData({
            name: cycle.name,
            description: cycle.description || '',
            cycleType: cycle.cycleType,
            startDate: cycle.startDate?.split('T')[0] || '',
            endDate: cycle.endDate?.split('T')[0] || '',
            templateId: cycle.templateId?._id || '',
        });
        setIsEditDialogOpen(true);
    };

    const openViewDialog = (cycle: Cycle) => {
        setSelectedCycle(cycle);
        setIsViewDialogOpen(true);
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    };

    const getProgress = (cycle: Cycle) => {
        if (!cycle.totalAssignments) return 0;
        return Math.round(((cycle.completedAssignments || 0) / cycle.totalAssignments) * 100);
    };

    const getDaysRemaining = (endDate: string) => {
        const end = new Date(endDate);
        const now = new Date();
        const diff = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        return diff;
    };

    const filteredCycles = cycles.filter(c => {
        const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            c.cycleType.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    const stats = {
        total: cycles.length,
        active: cycles.filter(c => c.status === 'ACTIVE').length,
        planned: cycles.filter(c => c.status === 'PLANNED').length,
        closed: cycles.filter(c => c.status === 'CLOSED').length,
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                    <p className="text-muted-foreground">Loading cycles...</p>
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
                        <Link href="/dashboard/hr-manager" className="hover:text-foreground">HR Manager</Link>
                        <span>/</span>
                        <span className="text-foreground">Performance Cycles</span>
                    </div>
                    <h1 className="text-2xl font-bold text-foreground">Appraisal Cycles</h1>
                    <p className="text-muted-foreground mt-1">Manage performance review cycles and schedules</p>
                </div>
                <Button onClick={() => setIsCreateDialogOpen(true)}>
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Create Cycle
                </Button>
            </div>

            {/* Error Message */}
            {error && (
                <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
                    <p className="text-sm font-medium text-destructive">{error}</p>
                    <button onClick={() => setError(null)} className="text-sm text-destructive underline mt-1 opacity-80 hover:opacity-100">Dismiss</button>
                </div>
            )}

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { label: 'Total Cycles', value: stats.total, icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z', color: 'text-foreground', bg: 'bg-muted' },
                    { label: 'Active', value: stats.active, icon: 'M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15', color: 'text-accent-foreground', bg: 'bg-accent/10' },
                    { label: 'Planned', value: stats.planned, icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2', color: 'text-muted-foreground', bg: 'bg-muted' },
                    { label: 'Closed', value: stats.closed, icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z', color: 'text-foreground', bg: 'bg-muted' },
                ].map((stat, i) => (
                    <div key={i} className="bg-card border border-border rounded-xl p-5 hover:shadow-md transition-shadow">
                        <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 ${stat.bg} rounded-lg flex items-center justify-center`}>
                                <svg className={`w-5 h-5 ${stat.color}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={stat.icon} />
                                </svg>
                            </div>
                            <div>
                                <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{stat.label}</p>
                                <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Search and Filters */}
            <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                    <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <Input
                        placeholder="Search cycles..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                    />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-full sm:w-48">
                        <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Statuses</SelectItem>
                        <SelectItem value="PLANNED">Planned</SelectItem>
                        <SelectItem value="ACTIVE">Active</SelectItem>
                        <SelectItem value="CLOSED">Closed</SelectItem>
                        <SelectItem value="ARCHIVED">Archived</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* Cycles Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredCycles.map((cycle) => {
                    const progress = getProgress(cycle);

                    return (
                        <div
                            key={cycle._id}
                            className="bg-card border border-border rounded-xl p-6 hover:shadow-lg hover:border-primary/50 transition-all group flex flex-col justify-between"
                        >
                            <div>
                                <div className="flex items-start justify-between mb-4 text-sm">
                                    <div className="flex flex-col gap-1">
                                        <h3 className="font-semibold text-foreground text-lg group-hover:text-primary transition-colors">
                                            {cycle.name}
                                        </h3>
                                        <Badge variant="outline" className={`w-fit text-[10px] h-5 ${statusColors[cycle.status]}`}>
                                            {cycle.status}
                                        </Badge>
                                    </div>
                                    <div className="w-10 h-10 bg-muted rounded-full flex items-center justify-center text-foreground">
                                        {getStatusIcon(cycle.status)}
                                    </div>
                                </div>

                                <p className="text-sm text-muted-foreground mb-6 line-clamp-2">
                                    {cycle.description || 'Appraisal cycle for organizational performance evaluation.'}
                                </p>

                                <div className="space-y-3 mb-6">
                                    <div className="flex items-center justify-between text-xs">
                                        <span className="text-muted-foreground flex items-center gap-2">
                                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                            </svg>
                                            Timeline
                                        </span>
                                        <span className="font-bold text-foreground">
                                            {formatDate(cycle.startDate)} - {formatDate(cycle.endDate)}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between text-xs">
                                        <span className="text-muted-foreground flex items-center gap-2">
                                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                                            </svg>
                                            Template
                                        </span>
                                        <span className="font-bold text-foreground">{cycle.templateId?.name || 'Standard'}</span>
                                    </div>
                                    <div className="space-y-1.5">
                                        <div className="flex justify-between text-[10px] font-semibold uppercase tracking-widest">
                                            <span className="text-muted-foreground">Progression</span>
                                            <span className="text-foreground">{progress}%</span>
                                        </div>
                                        <Progress value={progress} className="h-1.5" />
                                    </div>
                                </div>
                            </div>

                            <div className="pt-4 border-t border-border mt-auto">
                                <div className="grid grid-cols-2 gap-2">
                                    <Button variant="outline" size="sm" onClick={() => openViewDialog(cycle)} className="font-bold uppercase tracking-widest text-[10px]">
                                        Details
                                    </Button>
                                    <Button variant="outline" size="sm" onClick={() => openEditDialog(cycle)} className="font-bold uppercase tracking-widest text-[10px]">
                                        Configure
                                    </Button>
                                    {cycle.status === 'PLANNED' && (
                                        <Button size="sm" onClick={() => handleStatusChange(cycle, 'activate')} className="col-span-2 font-bold uppercase tracking-widest text-[10px] bg-foreground text-background hover:bg-foreground/90">
                                            Activate Cycle
                                        </Button>
                                    )}
                                    {cycle.status === 'ACTIVE' && (
                                        <Button size="sm" onClick={() => handleStatusChange(cycle, 'close')} className="col-span-2 font-bold uppercase tracking-widest text-[10px] bg-muted-foreground text-background hover:bg-muted-foreground/90">
                                            Close entries
                                        </Button>
                                    )}
                                    {cycle.status === 'CLOSED' && (
                                        <Button size="sm" onClick={() => handleStatusChange(cycle, 'archive')} className="col-span-2 font-bold uppercase tracking-widest text-[10px] bg-muted text-foreground hover:bg-muted/90">
                                            Archive Results
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {filteredCycles.length === 0 && (
                <div className="text-center py-12 bg-card border border-border rounded-xl">
                    <svg className="w-12 h-12 text-muted-foreground opacity-30 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <h3 className="text-lg font-medium text-foreground mb-1">No cycles found</h3>
                    <p className="text-muted-foreground">Create your first appraisal cycle to get started</p>
                </div>
            )}

            {/* Create/Edit Cycle Dialog */}
            <Dialog open={isCreateDialogOpen || isEditDialogOpen} onOpenChange={(open: boolean) => {
                if (!open) {
                    setIsCreateDialogOpen(false);
                    setIsEditDialogOpen(false);
                    resetForm();
                }
            }}>
                <DialogContent className="max-w-xl">
                    <DialogHeader>
                        <DialogTitle>{isEditDialogOpen ? 'Edit Cycle' : 'Create New Cycle'}</DialogTitle>
                        <DialogDescription>
                            {isEditDialogOpen ? 'Update the cycle details' : 'Define a new appraisal cycle with dates and template'}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        <div>
                            <Label htmlFor="name">Cycle Name</Label>
                            <Input
                                id="name"
                                value={formData.name}
                                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                placeholder="e.g., Q4 2024 Annual Review"
                                className="mt-1"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="cycleType">Cycle Type</Label>
                                <Select value={formData.cycleType} onValueChange={(value: any) => setFormData(prev => ({ ...prev, cycleType: value }))}>
                                    <SelectTrigger className="mt-1">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {cycleTypes.map(type => (
                                            <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label htmlFor="template">Template (Optional)</Label>
                                <Select value={formData.templateId || 'none'} onValueChange={(value: string) => setFormData(prev => ({ ...prev, templateId: value === 'none' ? '' : value }))}>
                                    <SelectTrigger className="mt-1">
                                        <SelectValue placeholder="Select template" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">No template</SelectItem>
                                        {templates.map(template => (
                                            <SelectItem key={template._id} value={template._id}>{template.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="startDate">Start Date</Label>
                                <Input
                                    id="startDate"
                                    type="date"
                                    value={formData.startDate}
                                    onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
                                    className="mt-1"
                                />
                            </div>
                            <div>
                                <Label htmlFor="endDate">End Date</Label>
                                <Input
                                    id="endDate"
                                    type="date"
                                    value={formData.endDate}
                                    onChange={(e) => setFormData(prev => ({ ...prev, endDate: e.target.value }))}
                                    className="mt-1"
                                />
                            </div>
                        </div>

                        <div>
                            <Label htmlFor="description">Description</Label>
                            <Textarea
                                id="description"
                                value={formData.description}
                                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                                placeholder="Describe the purpose of this cycle..."
                                className="mt-1"
                                rows={3}
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => {
                            setIsCreateDialogOpen(false);
                            setIsEditDialogOpen(false);
                            resetForm();
                        }}>
                            Cancel
                        </Button>
                        <Button onClick={isEditDialogOpen ? handleUpdateCycle : handleCreateCycle} disabled={isSubmitting}>
                            {isSubmitting ? 'Saving...' : (isEditDialogOpen ? 'Update Cycle' : 'Create Cycle')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* View Cycle Dialog */}
            <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
                <DialogContent className="max-w-xl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <div className="text-muted-foreground">{getStatusIcon(selectedCycle?.status || 'PLANNED')}</div>
                            {selectedCycle?.name}
                        </DialogTitle>
                        <DialogDescription>
                            <div className="flex items-center gap-2 mt-2">
                                <Badge className={statusColors[selectedCycle?.status || 'PLANNED']}>
                                    {selectedCycle?.status}
                                </Badge>
                                <Badge variant="outline">{selectedCycle?.cycleType?.replace('_', ' ')}</Badge>
                            </div>
                        </DialogDescription>
                    </DialogHeader>

                    {selectedCycle && (
                        <div className="space-y-4 py-4">
                            <div>
                                <h4 className="font-medium text-foreground mb-1">Description</h4>
                                <p className="text-muted-foreground">{selectedCycle.description || 'No description provided'}</p>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <h4 className="font-medium text-foreground mb-1">Start Date</h4>
                                    <p className="text-muted-foreground">{formatDate(selectedCycle.startDate)}</p>
                                </div>
                                <div>
                                    <h4 className="font-medium text-foreground mb-1">End Date</h4>
                                    <p className="text-muted-foreground">{formatDate(selectedCycle.endDate)}</p>
                                </div>
                            </div>

                            {selectedCycle.templateId && (
                                <div>
                                    <h4 className="font-medium text-foreground mb-1">Assigned Template</h4>
                                    <Badge variant="secondary" className="bg-primary/5 text-primary border-primary/10">{selectedCycle.templateId.name}</Badge>
                                </div>
                            )}

                            {selectedCycle.totalAssignments && selectedCycle.totalAssignments > 0 && (
                                <div>
                                    <h4 className="font-medium text-foreground mb-2">Progress</h4>
                                    <Progress value={getProgress(selectedCycle)} className="h-3" />
                                    <p className="text-sm text-muted-foreground mt-2">
                                        {selectedCycle.completedAssignments || 0} of {selectedCycle.totalAssignments} appraisals completed ({getProgress(selectedCycle)}%)
                                    </p>
                                </div>
                            )}
                        </div>
                    )}

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>Close</Button>
                        {selectedCycle?.status === 'PLANNED' && (
                            <Button onClick={() => {
                                setIsViewDialogOpen(false);
                                if (selectedCycle) openEditDialog(selectedCycle);
                            }}>
                                Edit Cycle
                            </Button>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
