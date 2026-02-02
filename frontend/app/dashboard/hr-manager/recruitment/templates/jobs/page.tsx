'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from '@/components/ui/textarea';
import { getJobTemplates, createJobTemplate, updateJobTemplate, deleteJobTemplate } from '@/app/services/recruitment';
import { organizationStructureService } from '@/app/services/organization-structure';
import { JobTemplate as ApiJobTemplate } from '@/types/recruitment';
import {
  FileText,
  Plus,
  Search,
  Edit3,
  Trash2,
  Eye,
  ChevronRight,
  Settings,
  BarChart3,
  Briefcase
} from 'lucide-react';
import { toast } from 'sonner';

interface JobTemplate {
  id: string;
  title: string;
  department: string;
  description: string;
  qualifications: string;
  skills: string;
  createdAt: string;
  updatedAt: string;
}

interface FormData {
  title: string;
  department: string;
  description: string;
  qualifications: string;
  skills: string;
}

const arrayToString = (arr: string[] | undefined): string => {
  if (!arr || arr.length === 0) return '';
  return arr.map(item => `• ${item}`).join('\n');
};

const stringToArray = (str: string): string[] => {
  if (!str.trim()) return [];
  return str
    .split('\n')
    .map(line => line.replace(/^[•\-*]\s*/, '').trim())
    .filter(line => line.length > 0);
};

const transformApiToLocal = (apiTemplate: ApiJobTemplate): JobTemplate => ({
  id: apiTemplate._id || apiTemplate.id,
  title: apiTemplate.title || '',
  department: apiTemplate.department || '',
  description: apiTemplate.description || '',
  qualifications: arrayToString(apiTemplate.qualifications),
  skills: arrayToString(apiTemplate.skills),
  createdAt: apiTemplate.createdAt ? new Date(apiTemplate.createdAt).toLocaleDateString() : '',
  updatedAt: apiTemplate.updatedAt ? new Date(apiTemplate.updatedAt).toLocaleDateString() : '',
});

const transformLocalToApi = (formData: FormData) => ({
  title: formData.title,
  department: formData.department,
  description: formData.description || undefined,
  qualifications: stringToArray(formData.qualifications),
  skills: stringToArray(formData.skills),
});

export default function JobTemplatesPage() {
  const [templates, setTemplates] = useState<JobTemplate[]>([]);
  const [departments, setDepartments] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<JobTemplate | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<JobTemplate | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    title: '',
    department: '',
    description: '',
    qualifications: '',
    skills: '',
  });

  useEffect(() => {
    fetchData();
    fetchDepartments();
  }, []);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getJobTemplates();
      const transformed = data.map(transformApiToLocal);
      setTemplates(transformed);
    } catch (err: any) {
      toast.error('Failed to load job templates');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchDepartments = async () => {
    try {
      const response = await organizationStructureService.getDepartments();
      const depts = Array.isArray(response?.data) ? response.data : [];
      const deptNames = depts.map((d: any) => d.name || d.departmentName).filter(Boolean);
      setDepartments(deptNames.length > 0 ? deptNames : ['Engineering', 'Marketing', 'Sales', 'HR', 'Finance', 'Operations']);
    } catch (err) {
      console.error('Failed to fetch departments:', err);
      setDepartments(['Engineering', 'Marketing', 'Sales', 'HR', 'Finance', 'Operations']);
    }
  };

  const handleOpenModal = (template?: JobTemplate) => {
    if (template) {
      setEditingTemplate(template);
      setFormData({
        title: template.title,
        department: template.department,
        description: template.description,
        qualifications: template.qualifications,
        skills: template.skills,
      });
    } else {
      setEditingTemplate(null);
      setFormData({
        title: '',
        department: '',
        description: '',
        qualifications: '',
        skills: '',
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingTemplate(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      const apiData = transformLocalToApi(formData);

      if (editingTemplate) {
        await updateJobTemplate(editingTemplate.id, apiData);
        toast.success('Template updated successfully');
      } else {
        await createJobTemplate(apiData);
        toast.success('Template created successfully');
      }

      handleCloseModal();
      fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save template');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this template?')) return;

    try {
      await deleteJobTemplate(id);
      toast.success('Template deleted successfully');
      fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete template');
    }
  };

  const handlePreview = (template: JobTemplate) => {
    setPreviewTemplate(template);
    setIsPreviewModalOpen(true);
  };

  const filteredTemplates = templates.filter(template => {
    const searchLower = searchQuery.toLowerCase();
    return (
      template.title.toLowerCase().includes(searchLower) ||
      template.department.toLowerCase().includes(searchLower) ||
      template.description.toLowerCase().includes(searchLower)
    );
  });

  const stats = {
    total: templates.length,
    departments: new Set(templates.map(t => t.department)).size,
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 p-6 relative">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-primary/10 rounded-lg">
                <FileText className="h-6 w-6 text-primary" />
              </div>
              <h1 className="text-3xl font-bold tracking-tight text-foreground">
                Job Templates
              </h1>
            </div>
            <p className="text-muted-foreground">
              Create and manage standardized job description templates
            </p>
          </div>
          <Button onClick={() => handleOpenModal()} className="gap-2">
            <Plus className="h-4 w-4" />
            New Template
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="border-l-4 border-l-primary hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Templates
                </CardTitle>
                <div className="p-2 bg-primary/10 rounded-lg">
                  <FileText className="h-4 w-4 text-primary" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-foreground">
                    {stats.total}
                  </span>
                  <span className="text-sm text-muted-foreground">templates</span>
                </div>
              )}
            </CardContent>
            <CardFooter className="pt-0">
              <div className="text-xs text-muted-foreground">
                Standardized job descriptions
              </div>
            </CardFooter>
          </Card>

          <Card className="border-l-4 border-l-accent hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Departments Covered
                </CardTitle>
                <div className="p-2 bg-accent/10 rounded-lg">
                  <Briefcase className="h-4 w-4 text-accent-foreground" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-foreground">
                    {stats.departments}
                  </span>
                  <span className="text-sm text-muted-foreground">departments</span>
                </div>
              )}
            </CardContent>
            <CardFooter className="pt-0">
              <Link 
                href="/dashboard/hr-manager/recruitment/templates/process"
                className="text-sm text-primary hover:text-primary/80 flex items-center gap-1"
              >
                Process templates
                <ChevronRight className="h-3 w-3" />
              </Link>
            </CardFooter>
          </Card>
        </div>

        {/* Search */}
        <Card>
          <CardContent className="pt-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by title, department, or description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Templates Grid */}
        <div className="grid grid-cols-1 gap-4">
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="pt-6">
                  <Skeleton className="h-24 w-full" />
                </CardContent>
              </Card>
            ))
          ) : filteredTemplates.length === 0 ? (
            <Card>
              <CardContent className="pt-16 pb-16 text-center">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  No job templates found
                </h3>
                <p className="text-muted-foreground mb-6">
                  {searchQuery ? 'Try adjusting your search' : 'Get started by creating your first template'}
                </p>
                <Button onClick={() => handleOpenModal()}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Template
                </Button>
              </CardContent>
            </Card>
          ) : (
            filteredTemplates.map((template) => (
              <Card key={template.id} className="hover:shadow-lg transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-muted rounded-lg">
                          <FileText className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="text-lg font-semibold text-foreground">
                              {template.title}
                            </h3>
                            <Badge variant="outline" className="text-primary border-primary/30">
                              {template.department}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                            {template.description || 'No description provided'}
                          </p>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span>Created: {template.createdAt}</span>
                            <span>Updated: {template.updatedAt}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePreview(template)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenModal(template)}
                      >
                        <Edit3 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDelete(template.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Management Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Template Management
            </CardTitle>
            <CardDescription>
              Additional recruitment template tools
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Link 
                href="/dashboard/hr-manager/recruitment/templates/process"
                className="group relative overflow-hidden rounded-xl border border-border/50 bg-card p-5 hover:border-primary/50 hover:shadow-lg transition-all"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative z-10">
                  <div className="p-2 bg-primary/10 rounded-lg w-fit mb-3">
                    <Settings className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="font-semibold text-foreground mb-1">Process Templates</h3>
                  <p className="text-xs text-muted-foreground">Define hiring stage workflows</p>
                </div>
              </Link>

              <Link 
                href="/dashboard/hr-manager/recruitment/analytics"
                className="group relative overflow-hidden rounded-xl border border-border/50 bg-card p-5 hover:border-primary/50 hover:shadow-lg transition-all"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative z-10">
                  <div className="p-2 bg-primary/10 rounded-lg w-fit mb-3">
                    <BarChart3 className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="font-semibold text-foreground mb-1">Analytics</h3>
                  <p className="text-xs text-muted-foreground">Template usage insights</p>
                </div>
              </Link>

              <Link 
                href="/dashboard/hr-manager/recruitment/jobs"
                className="group relative overflow-hidden rounded-xl border border-border/50 bg-card p-5 hover:border-primary/50 hover:shadow-lg transition-all"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative z-10">
                  <div className="p-2 bg-primary/10 rounded-lg w-fit mb-3">
                    <Briefcase className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="font-semibold text-foreground mb-1">Job Requisitions</h3>
                  <p className="text-xs text-muted-foreground">Create jobs from templates</p>
                </div>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Create/Edit Modal */}
      <Dialog open={isModalOpen} onOpenChange={handleCloseModal}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingTemplate ? 'Edit Job Template' : 'Create Job Template'}
            </DialogTitle>
            <DialogDescription>
              {editingTemplate ? 'Update the job template details' : 'Create a new standardized job template'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="title">Job Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g., Senior Software Engineer"
                  required
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="department">Department *</Label>
                <Select
                  value={formData.department}
                  onValueChange={(value) => setFormData({ ...formData, department: value })}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map((dept) => (
                      <SelectItem key={dept} value={dept}>
                        {dept}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Brief overview of the role..."
                  rows={4}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="qualifications">Qualifications (one per line)</Label>
                <Textarea
                  id="qualifications"
                  value={formData.qualifications}
                  onChange={(e) => setFormData({ ...formData, qualifications: e.target.value })}
                  placeholder="• Bachelor's degree in Computer Science&#10;• 5+ years of experience"
                  rows={5}
                />
                <p className="text-xs text-muted-foreground">
                  Add bullet points (•, -, *) or just list one per line
                </p>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="skills">Skills (one per line)</Label>
                <Textarea
                  id="skills"
                  value={formData.skills}
                  onChange={(e) => setFormData({ ...formData, skills: e.target.value })}
                  placeholder="• React, TypeScript&#10;• Node.js, Express"
                  rows={5}
                />
                <p className="text-xs text-muted-foreground">
                  Add bullet points (•, -, *) or just list one per line
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseModal}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? 'Saving...' : editingTemplate ? 'Update Template' : 'Create Template'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Preview Modal */}
      <Dialog open={isPreviewModalOpen} onOpenChange={setIsPreviewModalOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{previewTemplate?.title}</DialogTitle>
            <DialogDescription>
              <Badge variant="outline" className="mt-2">
                {previewTemplate?.department}
              </Badge>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {previewTemplate?.description && (
              <div>
                <h4 className="font-semibold text-foreground mb-2">Description</h4>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {previewTemplate.description}
                </p>
              </div>
            )}

            {previewTemplate?.qualifications && (
              <div>
                <h4 className="font-semibold text-foreground mb-2">Qualifications</h4>
                <div className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {previewTemplate.qualifications}
                </div>
              </div>
            )}

            {previewTemplate?.skills && (
              <div>
                <h4 className="font-semibold text-foreground mb-2">Required Skills</h4>
                <div className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {previewTemplate.skills}
                </div>
              </div>
            )}

            <div className="border-t border-border pt-4 text-xs text-muted-foreground space-y-1">
              <p>Created: {previewTemplate?.createdAt}</p>
              <p>Last Updated: {previewTemplate?.updatedAt}</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPreviewModalOpen(false)}>
              Close
            </Button>
            <Button onClick={() => {
              setIsPreviewModalOpen(false);
              if (previewTemplate) handleOpenModal(previewTemplate);
            }}>
              Edit Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
