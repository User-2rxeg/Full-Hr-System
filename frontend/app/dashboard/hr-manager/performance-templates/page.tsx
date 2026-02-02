'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { performanceService } from '@/app/services/performance';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
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

// Backend schema types
type TemplateType = 'ANNUAL' | 'SEMI_ANNUAL' | 'PROBATIONARY' | 'PROJECT' | 'AD_HOC';
type RatingScaleType = 'THREE_POINT' | 'FIVE_POINT' | 'TEN_POINT';

interface RatingScale {
    type: RatingScaleType;
    min: number;
    max: number;
    step?: number;
    labels?: string[];
}

interface Criterion {
    key: string;
    title: string;
    details?: string;
    weight?: number;
    maxScore?: number;
    required?: boolean;
}

interface Template {
    _id: string;
    name: string;
    description?: string;
    templateType: TemplateType;
    ratingScale: RatingScale;
    criteria: Criterion[];
    instructions?: string;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}

const templateTypes = [
    { value: 'ANNUAL', label: 'Annual Review' },
    { value: 'SEMI_ANNUAL', label: 'Semi-Annual Review' },
    { value: 'PROBATIONARY', label: 'Probationary Review' },
    { value: 'PROJECT', label: 'Project-Based' },
    { value: 'AD_HOC', label: 'Ad-Hoc Review' },
];

const ratingScaleTypes = [
    { value: 'THREE_POINT', label: '3-Point Scale', min: 1, max: 3 },
    { value: 'FIVE_POINT', label: '5-Point Scale', min: 1, max: 5 },
    { value: 'TEN_POINT', label: '10-Point Scale', min: 1, max: 10 },
];

const defaultRatingScale: RatingScale = {
    type: 'FIVE_POINT',
    min: 1,
    max: 5,
    step: 1,
    labels: ['Poor', 'Below Average', 'Average', 'Good', 'Excellent'],
};

export default function PerformanceTemplatesPage() {
    const [templates, setTemplates] = useState<Template[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    // Dialog states
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
    const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Form state matching backend schema
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        templateType: 'ANNUAL' as TemplateType,
        ratingScale: { ...defaultRatingScale },
        criteria: [] as Criterion[],
        instructions: '',
    });

    // New criterion form
    const [newCriterion, setNewCriterion] = useState({
        key: '',
        title: '',
        details: '',
        weight: 10,
        maxScore: 5,
        required: true,
    });

    useEffect(() => {
        fetchTemplates();
    }, []);

    const fetchTemplates = async () => {
        try {
            setLoading(true);
            const response = await performanceService.getTemplates();
            if (response.error) {
                setError(response.error);
                return;
            }
            setTemplates(Array.isArray(response.data) ? response.data : []);
        } catch (err: any) {
            setError(err.message || 'Failed to fetch templates');
        } finally {
            setLoading(false);
        }
    };

    const handleCreateTemplate = async () => {
        try {
            setIsSubmitting(true);
            setError(null);

            // Prepare payload matching backend DTO
            const payload = {
                name: formData.name,
                description: formData.description || undefined,
                templateType: formData.templateType,
                ratingScale: formData.ratingScale,
                criteria: formData.criteria.length > 0 ? formData.criteria : undefined,
                instructions: formData.instructions || undefined,
            };

            const response = await performanceService.createTemplate(payload);
            if (response.error) {
                setError(response.error);
                return;
            }
            setIsCreateDialogOpen(false);
            resetForm();
            fetchTemplates();
        } catch (err: any) {
            setError(err.message || 'Failed to create template');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleUpdateTemplate = async () => {
        if (!selectedTemplate) return;
        try {
            setIsSubmitting(true);
            setError(null);

            const payload = {
                name: formData.name,
                description: formData.description || undefined,
                templateType: formData.templateType,
                ratingScale: formData.ratingScale,
                criteria: formData.criteria.length > 0 ? formData.criteria : undefined,
                instructions: formData.instructions || undefined,
            };

            const response = await performanceService.updateTemplate(selectedTemplate._id, payload);
            if (response.error) {
                setError(response.error);
                return;
            }
            setIsEditDialogOpen(false);
            resetForm();
            fetchTemplates();
        } catch (err: any) {
            setError(err.message || 'Failed to update template');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleToggleStatus = async (template: Template) => {
        try {
            if (template.isActive) {
                await performanceService.deactivateTemplate(template._id);
            } else {
                await performanceService.reactivateTemplate(template._id);
            }
            fetchTemplates();
        } catch (err: any) {
            setError(err.message || 'Failed to update template status');
        }
    };

    const resetForm = () => {
        setFormData({
            name: '',
            description: '',
            templateType: 'ANNUAL',
            ratingScale: { ...defaultRatingScale },
            criteria: [],
            instructions: '',
        });
        setNewCriterion({
            key: '',
            title: '',
            details: '',
            weight: 10,
            maxScore: 5,
            required: true,
        });
        setSelectedTemplate(null);
    };

    const openEditDialog = (template: Template) => {
        setSelectedTemplate(template);
        setFormData({
            name: template.name,
            description: template.description || '',
            templateType: template.templateType,
            ratingScale: template.ratingScale || { ...defaultRatingScale },
            criteria: template.criteria || [],
            instructions: template.instructions || '',
        });
        setIsEditDialogOpen(true);
    };

    const openViewDialog = (template: Template) => {
        setSelectedTemplate(template);
        setIsViewDialogOpen(true);
    };

    const handleRatingScaleTypeChange = (type: RatingScaleType) => {
        const scaleConfig = ratingScaleTypes.find(s => s.value === type);
        if (scaleConfig) {
            const labels = type === 'THREE_POINT'
                ? ['Poor', 'Average', 'Excellent']
                : type === 'FIVE_POINT'
                    ? ['Poor', 'Below Average', 'Average', 'Good', 'Excellent']
                    : ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'];

            setFormData(prev => ({
                ...prev,
                ratingScale: {
                    type,
                    min: scaleConfig.min,
                    max: scaleConfig.max,
                    step: 1,
                    labels,
                },
            }));
        }
    };

    const addCriterion = () => {
        if (!newCriterion.key || !newCriterion.title) return;

        const criterion: Criterion = {
            key: newCriterion.key,
            title: newCriterion.title,
            details: newCriterion.details || undefined,
            weight: newCriterion.weight,
            maxScore: newCriterion.maxScore,
            required: newCriterion.required,
        };

        setFormData(prev => ({
            ...prev,
            criteria: [...prev.criteria, criterion],
        }));

        setNewCriterion({
            key: '',
            title: '',
            details: '',
            weight: 10,
            maxScore: 5,
            required: true,
        });
    };

    const removeCriterion = (key: string) => {
        setFormData(prev => ({
            ...prev,
            criteria: prev.criteria.filter(c => c.key !== key),
        }));
    };

    const filteredTemplates = templates.filter(t =>
        t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.templateType.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const getTypeColor = (type: string) => {
        switch (type) {
            case 'ANNUAL': return 'bg-primary/10 text-primary border-primary/20';
            case 'SEMI_ANNUAL': return 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20';
            case 'PROBATIONARY': return 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20';
            case 'PROJECT': return 'bg-primary/10 text-primary border-primary/20';
            case 'AD_HOC': return 'bg-accent/10 text-accent-foreground border-accent/20';
            default: return 'bg-muted text-muted-foreground border-border';
        }
    };

    const getRatingScaleLabel = (type: RatingScaleType) => {
        switch (type) {
            case 'THREE_POINT': return '3-Point';
            case 'FIVE_POINT': return '5-Point';
            case 'TEN_POINT': return '10-Point';
            default: return type;
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                    <p className="text-muted-foreground">Loading templates...</p>
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
                        <span className="text-foreground font-medium">Performance Core</span>
                    </div>
                    <h1 className="text-2xl font-bold text-foreground">Appraisal Frameworks</h1>
                    <p className="text-muted-foreground mt-1 text-sm">Define and manage standardized evaluation criteria and methodology</p>
                </div>
                <Button onClick={() => setIsCreateDialogOpen(true)} className="font-bold uppercase tracking-widest text-[10px] h-10 px-6">
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    New Framework
                </Button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { label: 'Total Frameworks', value: templates.length, icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2', bg: 'bg-muted', color: 'text-foreground' },
                    { label: 'Active', value: templates.filter(t => t.isActive).length, icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z', bg: 'bg-foreground', color: 'text-background' },
                    { label: 'Annual', value: templates.filter(t => t.templateType === 'ANNUAL').length, icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z', bg: 'bg-muted-foreground', color: 'text-background' },
                    { label: 'Specialized', value: templates.filter(t => t.templateType !== 'ANNUAL').length, icon: 'M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z', bg: 'bg-muted', color: 'text-foreground' },
                ].map((stat, i) => (
                    <div key={i} className="bg-card border border-border rounded-xl p-5 hover:shadow-md transition-shadow">
                        <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 ${stat.bg} rounded-lg flex items-center justify-center`}>
                                <svg className={`w-5 h-5 ${stat.color}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={stat.icon} />
                                </svg>
                            </div>
                            <div>
                                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{stat.label}</p>
                                <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Error Message */}
            {error && (
                <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
                    <p className="text-sm font-medium text-destructive">{error}</p>
                    <button onClick={() => setError(null)} className="text-sm text-destructive underline mt-1">Dismiss</button>
                </div>
            )}

            {/* Search */}
            <div className="relative">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <Input
                    placeholder="Search templates..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                />
            </div>

            {/* Templates Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredTemplates.map((template) => (
                    <div
                        key={template._id}
                        className="bg-card border border-border rounded-xl p-6 hover:shadow-lg hover:border-primary/50 transition-all"
                    >
                        <div className="flex items-start justify-between mb-4">
                            <div>
                                <h3 className="font-semibold text-foreground">{template.name}</h3>
                                <Badge variant="outline" className={`mt-2 ${getTypeColor(template.templateType)}`}>
                                    {template.templateType.replace('_', ' ')}
                                </Badge>
                            </div>
                            <Badge variant={template.isActive ? 'default' : 'secondary'}>
                                {template.isActive ? 'Active' : 'Inactive'}
                            </Badge>
                        </div>

                        <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                            {template.description || 'No description provided'}
                        </p>

                        <div className="flex items-center gap-4 text-xs text-muted-foreground mb-4">
                            <span className="flex items-center gap-1">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                </svg>
                                {template.criteria?.length || 0} criteria
                            </span>
                            <span className="flex items-center gap-1">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                                </svg>
                                {getRatingScaleLabel(template.ratingScale?.type)} scale
                            </span>
                        </div>

                        <div className="flex flex-col gap-2 pt-4 border-t border-border mt-auto">
                            <div className="grid grid-cols-2 gap-2">
                                <Button variant="outline" size="sm" onClick={() => openViewDialog(template)} className="font-bold uppercase tracking-widest text-[10px]">
                                    Details
                                </Button>
                                <Button variant="outline" size="sm" onClick={() => openEditDialog(template)} className="font-bold uppercase tracking-widest text-[10px]">
                                    Configure
                                </Button>
                            </div>
                            <Button
                                variant={template.isActive ? 'secondary' : 'default'}
                                size="sm"
                                onClick={() => handleToggleStatus(template)}
                                className="font-bold uppercase tracking-widest text-[10px] w-full"
                            >
                                {template.isActive ? 'Retire Framework' : 'Publish Framework'}
                            </Button>
                        </div>
                    </div>
                ))}
            </div>

            {filteredTemplates.length === 0 && (
                <div className="text-center py-12 bg-card border border-border rounded-xl">
                    <svg className="w-12 h-12 text-muted-foreground opacity-30 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <h3 className="text-lg font-medium text-foreground mb-1">No templates found</h3>
                    <p className="text-muted-foreground">Create your first appraisal template to get started</p>
                </div>
            )}

            {/* Create/Edit Template Dialog */}
            <Dialog open={isCreateDialogOpen || isEditDialogOpen} onOpenChange={(open: boolean) => {
                if (!open) {
                    setIsCreateDialogOpen(false);
                    setIsEditDialogOpen(false);
                    resetForm();
                }
            }}>
                <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{isEditDialogOpen ? 'Edit Template' : 'Create New Template'}</DialogTitle>
                        <DialogDescription>
                            {isEditDialogOpen ? 'Update the template details and criteria' : 'Define a new appraisal template with rating scales and criteria'}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-6 py-4">
                        {/* Basic Info */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="col-span-2 sm:col-span-1">
                                <Label htmlFor="name">Template Name *</Label>
                                <Input
                                    id="name"
                                    value={formData.name}
                                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                    placeholder="e.g., Annual Performance Review"
                                    className="mt-1"
                                />
                            </div>
                            <div className="col-span-2 sm:col-span-1">
                                <Label htmlFor="templateType">Template Type *</Label>
                                <Select
                                    value={formData.templateType}
                                    onValueChange={(value: TemplateType) => setFormData(prev => ({ ...prev, templateType: value }))}
                                >
                                    <SelectTrigger className="mt-1">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {templateTypes.map(type => (
                                            <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="col-span-2">
                                <Label htmlFor="description">Description</Label>
                                <Textarea
                                    id="description"
                                    value={formData.description}
                                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                                    placeholder="Describe the purpose and use case of this template..."
                                    className="mt-1"
                                    rows={3}
                                />
                            </div>
                        </div>

                        {/* Rating Scale */}
                        <div className="p-4 bg-muted/50 border border-border rounded-lg">
                            <Label className="text-base font-semibold">Rating Scale *</Label>
                            <p className="text-sm text-muted-foreground mb-4">Select the rating scale type for this template</p>

                            <div className="grid grid-cols-3 gap-3 mb-4">
                                {ratingScaleTypes.map((scale) => (
                                    <button
                                        key={scale.value}
                                        type="button"
                                        onClick={() => handleRatingScaleTypeChange(scale.value as RatingScaleType)}
                                        className={`p-4 rounded-lg border-2 transition-all text-center ${formData.ratingScale.type === scale.value
                                            ? 'border-primary bg-primary/10 text-primary'
                                            : 'border-border bg-background hover:border-primary/50'
                                            }`}
                                    >
                                        <div className="text-2xl font-bold mb-1">{scale.max}</div>
                                        <div className="text-sm font-medium">{scale.label}</div>
                                    </button>
                                ))}
                            </div>

                            <div>
                                <Label className="text-sm">Scale Labels (optional)</Label>
                                <div className="flex flex-wrap gap-2 mt-2">
                                    {formData.ratingScale.labels?.map((label, idx) => (
                                        <div key={idx} className="flex items-center gap-1 bg-background px-3 py-1 rounded-full border border-border text-sm">
                                            <span className="font-medium text-primary">{idx + formData.ratingScale.min}:</span>
                                            <Input
                                                value={label}
                                                onChange={(e) => {
                                                    const newLabels = [...(formData.ratingScale.labels || [])];
                                                    newLabels[idx] = e.target.value;
                                                    setFormData(prev => ({
                                                        ...prev,
                                                        ratingScale: { ...prev.ratingScale, labels: newLabels }
                                                    }));
                                                }}
                                                className="border-0 p-0 h-auto w-24 text-sm bg-transparent focus:ring-0"
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Criteria */}
                        <div>
                            <Label className="text-base font-semibold">Evaluation Criteria</Label>
                            <p className="text-sm text-muted-foreground mb-3">Add the criteria that will be evaluated</p>

                            {/* Add Criterion Form */}
                            <div className="p-4 border border-dashed border-slate-300 rounded-lg mb-4">
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <Label htmlFor="criterionKey">Key (unique identifier) *</Label>
                                        <Input
                                            id="criterionKey"
                                            value={newCriterion.key}
                                            onChange={(e) => setNewCriterion(prev => ({ ...prev, key: e.target.value.toLowerCase().replace(/\s+/g, '_') }))}
                                            placeholder="e.g., quality_of_work"
                                            className="mt-1"
                                        />
                                    </div>
                                    <div>
                                        <Label htmlFor="criterionTitle">Title *</Label>
                                        <Input
                                            id="criterionTitle"
                                            value={newCriterion.title}
                                            onChange={(e) => setNewCriterion(prev => ({ ...prev, title: e.target.value }))}
                                            placeholder="e.g., Quality of Work"
                                            className="mt-1"
                                        />
                                    </div>
                                    <div>
                                        <Label htmlFor="criterionWeight">Weight (%)</Label>
                                        <Input
                                            id="criterionWeight"
                                            type="number"
                                            min="0"
                                            max="100"
                                            value={newCriterion.weight}
                                            onChange={(e) => setNewCriterion(prev => ({ ...prev, weight: parseInt(e.target.value) || 0 }))}
                                            className="mt-1"
                                        />
                                    </div>
                                    <div>
                                        <Label htmlFor="criterionMaxScore">Max Score</Label>
                                        <Input
                                            id="criterionMaxScore"
                                            type="number"
                                            min="1"
                                            value={newCriterion.maxScore}
                                            onChange={(e) => setNewCriterion(prev => ({ ...prev, maxScore: parseInt(e.target.value) || 5 }))}
                                            className="mt-1"
                                        />
                                    </div>
                                    <div className="col-span-2">
                                        <Label htmlFor="criterionDetails">Details</Label>
                                        <Input
                                            id="criterionDetails"
                                            value={newCriterion.details}
                                            onChange={(e) => setNewCriterion(prev => ({ ...prev, details: e.target.value }))}
                                            placeholder="Brief description of the criterion"
                                            className="mt-1"
                                        />
                                    </div>
                                    <div className="col-span-2 flex items-center gap-2">
                                        <Checkbox
                                            id="criterionRequired"
                                            checked={newCriterion.required}
                                            onCheckedChange={(checked: boolean) => setNewCriterion(prev => ({ ...prev, required: checked }))}
                                        />
                                        <Label htmlFor="criterionRequired" className="text-sm font-normal">Required criterion</Label>
                                    </div>
                                </div>
                                <Button type="button" variant="outline" className="mt-3" onClick={addCriterion}>
                                    + Add Criterion
                                </Button>
                            </div>

                            {/* Criteria List */}
                            {formData.criteria.length > 0 && (
                                <div className="space-y-2">
                                    {formData.criteria.map((criterion) => (
                                        <div key={criterion.key} className="flex items-center justify-between p-3 bg-muted/50 border border-border rounded-lg">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span className="font-medium text-foreground">{criterion.title}</span>
                                                    <Badge variant="outline" className="text-xs">{criterion.key}</Badge>
                                                    {criterion.weight && <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">{criterion.weight}%</Badge>}
                                                    {criterion.required && <Badge variant="secondary" className="bg-destructive/10 text-destructive border-destructive/20">Required</Badge>}
                                                </div>
                                                {criterion.details && (
                                                    <p className="text-sm text-muted-foreground mt-1">{criterion.details}</p>
                                                )}
                                            </div>
                                            <Button variant="ghost" size="sm" onClick={() => removeCriterion(criterion.key)}>
                                                <svg className="w-4 h-4 text-destructive" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                </svg>
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Instructions */}
                        <div>
                            <Label htmlFor="instructions">Instructions for Evaluators</Label>
                            <Textarea
                                id="instructions"
                                value={formData.instructions}
                                onChange={(e) => setFormData(prev => ({ ...prev, instructions: e.target.value }))}
                                placeholder="Provide guidance for managers conducting evaluations..."
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
                        <Button onClick={isEditDialogOpen ? handleUpdateTemplate : handleCreateTemplate} disabled={isSubmitting || !formData.name}>
                            {isSubmitting ? 'Saving...' : (isEditDialogOpen ? 'Update Template' : 'Create Template')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* View Template Dialog */}
            <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{selectedTemplate?.name}</DialogTitle>
                        <DialogDescription>
                            <Badge className={`mt-2 ${getTypeColor(selectedTemplate?.templateType || '')}`}>
                                {selectedTemplate?.templateType?.replace('_', ' ')}
                            </Badge>
                        </DialogDescription>
                    </DialogHeader>

                    {selectedTemplate && (
                        <div className="space-y-6 py-4">
                            <div>
                                <h4 className="font-medium text-foreground mb-2">Description</h4>
                                <p className="text-muted-foreground">{selectedTemplate.description || 'No description provided'}</p>
                            </div>

                            <div>
                                <h4 className="font-medium text-foreground mb-3">Rating Scale</h4>
                                <div className="p-4 bg-muted/50 border border-border rounded-lg">
                                    <div className="flex items-center gap-4 mb-3">
                                        <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                                            {getRatingScaleLabel(selectedTemplate.ratingScale?.type)}
                                        </Badge>
                                        <span className="text-sm text-muted-foreground font-medium">
                                            Range: {selectedTemplate.ratingScale?.min} - {selectedTemplate.ratingScale?.max}
                                        </span>
                                    </div>
                                    {selectedTemplate.ratingScale?.labels && selectedTemplate.ratingScale.labels.length > 0 && (
                                        <div className="flex flex-wrap gap-2">
                                            {selectedTemplate.ratingScale.labels.map((label, idx) => (
                                                <div key={idx} className="px-3 py-1 bg-background rounded-full border border-border text-sm">
                                                    <span className="font-medium text-primary">{idx + (selectedTemplate.ratingScale?.min || 1)}:</span> {label}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div>
                                <h4 className="font-medium text-foreground mb-3">Evaluation Criteria</h4>
                                {selectedTemplate.criteria && selectedTemplate.criteria.length > 0 ? (
                                    <div className="space-y-2">
                                        {selectedTemplate.criteria.map((criterion, idx) => (
                                            <div key={idx} className="p-3 bg-muted/50 border border-border rounded-lg">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span className="font-medium text-foreground">{criterion.title}</span>
                                                    <Badge variant="outline" className="text-xs">{criterion.key}</Badge>
                                                    {criterion.weight && <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">{criterion.weight}%</Badge>}
                                                    {criterion.required && <Badge variant="secondary" className="bg-destructive/10 text-destructive border-destructive/20">Required</Badge>}
                                                </div>
                                                {criterion.details && (
                                                    <p className="text-sm text-muted-foreground mt-1">{criterion.details}</p>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-muted-foreground italic">No criteria defined</p>
                                )}
                            </div>

                            {selectedTemplate.instructions && (
                                <div>
                                    <h4 className="font-medium text-foreground mb-2">Instructions</h4>
                                    <p className="text-muted-foreground whitespace-pre-wrap">{selectedTemplate.instructions}</p>
                                </div>
                            )}
                        </div>
                    )}

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>Close</Button>
                        <Button onClick={() => {
                            setIsViewDialogOpen(false);
                            if (selectedTemplate) openEditDialog(selectedTemplate);
                        }}>
                            Edit Template
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
