'use client';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Settings, Trash2, ArrowUp, ArrowDown, Workflow, ChevronRight, BarChart3, Briefcase } from 'lucide-react';
import { toast } from 'sonner';
interface HiringStage {
  id: string;
  name: string;
  order: number;
  percentage: number;
  description?: string;
}
interface ProcessTemplate {
  id: string;
  name: string;
  description?: string;
  stages: HiringStage[];
  isDefault: boolean;
}
export default function ProcessTemplatesPage() {
  const [templates, setTemplates] = useState<ProcessTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<ProcessTemplate | null>(null);
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formStages, setFormStages] = useState<HiringStage[]>([
    { id: '1', name: 'Screening', order: 1, percentage: 25 },
    { id: '2', name: 'Interview', order: 2, percentage: 50 },
    { id: '3', name: 'Assessment', order: 3, percentage: 75 },
    { id: '4', name: 'Offer', order: 4, percentage: 100 },
  ]);
  const [submitting, setSubmitting] = useState(false);
  useEffect(() => {
    fetchTemplates();
  }, []);
  const fetchTemplates = async () => {
    try {
      setLoading(true);
      // Mock data for now - replace with actual API call
      const mockTemplates: ProcessTemplate[] = [
        {
          id: '1',
          name: 'Standard Hiring Process',
          description: 'Default 4-stage hiring workflow',
          isDefault: true,
          stages: [
            { id: '1', name: 'Screening', order: 1, percentage: 25 },
            { id: '2', name: 'Interview', order: 2, percentage: 50 },
            { id: '3', name: 'Assessment', order: 3, percentage: 75 },
            { id: '4', name: 'Offer', order: 4, percentage: 100 },
          ],
        },
      ];
      setTemplates(mockTemplates);
    } catch (err: any) {
      toast.error('Failed to load process templates');
    } finally {
      setLoading(false);
    }
  };
  const handleOpenModal = (template?: ProcessTemplate) => {
    if (template) {
      setEditingTemplate(template);
      setFormName(template.name);
      setFormDescription(template.description || '');
      setFormStages([...template.stages]);
    } else {
      setEditingTemplate(null);
      setFormName('');
      setFormDescription('');
      setFormStages([
        { id: '1', name: 'Screening', order: 1, percentage: 25 },
        { id: '2', name: 'Interview', order: 2, percentage: 50 },
        { id: '3', name: 'Assessment', order: 3, percentage: 75 },
        { id: '4', name: 'Offer', order: 4, percentage: 100 },
      ]);
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
      setSubmitting(true);
      // TODO: API call to save template
      toast.success(editingTemplate ? 'Template updated' : 'Template created');
      handleCloseModal();
      await fetchTemplates();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save template');
    } finally {
      setSubmitting(false);
    }
  };
  const handleAddStage = () => {
    const newStage: HiringStage = {
      id: Date.now().toString(),
      name: '',
      order: formStages.length + 1,
      percentage: 100,
    };
    setFormStages([...formStages, newStage]);
  };
  const handleRemoveStage = (id: string) => {
    setFormStages(formStages.filter(s => s.id !== id));
  };
  const handleMoveStage = (index: number, direction: 'up' | 'down') => {
    const newStages = [...formStages];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newStages.length) return;
    [newStages[index], newStages[targetIndex]] = [newStages[targetIndex], newStages[index]];
    newStages.forEach((stage, idx) => {
      stage.order = idx + 1;
    });
    setFormStages(newStages);
  };
  const handleStageChange = (id: string, field: keyof HiringStage, value: any) => {
    setFormStages(formStages.map(stage => 
      stage.id === id ? { ...stage, [field]: value } : stage
    ));
  };
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 p-6 relative">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex justify-between items-start">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Workflow className="h-6 w-6 text-primary" />
              </div>
              <h1 className="text-3xl font-bold tracking-tight text-foreground">Process Templates</h1>
            </div>
            <p className="text-muted-foreground">Define hiring stage workflows and progression rules</p>
          </div>
          <Button onClick={() => handleOpenModal()} className="gap-2">
            <Plus className="h-4 w-4" />
            New Process
          </Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="border-l-4 border-l-primary hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Processes</CardTitle>
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Workflow className="h-4 w-4 text-primary" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? <Skeleton className="h-8 w-24" /> : (
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-foreground">{templates.length}</span>
                  <span className="text-sm text-muted-foreground">templates</span>
                </div>
              )}
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-accent hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <CardTitle className="text-sm font-medium text-muted-foreground">Quick Links</CardTitle>
                <div className="p-2 bg-accent/10 rounded-lg">
                  <Settings className="h-4 w-4 text-accent-foreground" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <a href="/dashboard/hr-manager/recruitment/templates/jobs" className="text-sm text-primary hover:underline flex items-center gap-1">
                  Job Templates <ChevronRight className="h-3 w-3" />
                </a>
                <a href="/dashboard/hr-manager/recruitment/analytics" className="text-sm text-primary hover:underline flex items-center gap-1">
                  Analytics <ChevronRight className="h-3 w-3" />
                </a>
              </div>
            </CardContent>
          </Card>
        </div>
        <div className="grid grid-cols-1 gap-4">
          {loading ? (
            Array.from({ length: 2 }).map((_, i) => (
              <Card key={i}><CardContent className="pt-6"><Skeleton className="h-24 w-full" /></CardContent></Card>
            ))
          ) : templates.length === 0 ? (
            <Card>
              <CardContent className="pt-16 pb-16 text-center">
                <Workflow className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">No process templates</h3>
                <p className="text-muted-foreground mb-6">Create your first hiring workflow</p>
                <Button onClick={() => handleOpenModal()}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Process
                </Button>
              </CardContent>
            </Card>
          ) : (
            templates.map((template) => (
              <Card key={template.id} className="hover:shadow-lg transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-lg font-semibold text-foreground">{template.name}</h3>
                        {template.isDefault && (
                          <Badge variant="outline" className="text-primary border-primary/30">Default</Badge>
                        )}
                      </div>
                      {template.description && (
                        <p className="text-sm text-muted-foreground mb-3">{template.description}</p>
                      )}
                      <div className="flex flex-wrap gap-2">
                        {template.stages.map((stage, idx) => (
                          <Badge key={stage.id} variant="outline" className="text-foreground">
                            {idx + 1}. {stage.name} ({stage.percentage}%)
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" onClick={() => handleOpenModal(template)}>
                        <Settings className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Management Tools
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <a href="/dashboard/hr-manager/recruitment/jobs" className="group relative overflow-hidden rounded-xl border border-border/50 bg-card p-5 hover:border-primary/50 hover:shadow-lg transition-all">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative z-10">
                  <div className="p-2 bg-primary/10 rounded-lg w-fit mb-3">
                    <Briefcase className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="font-semibold text-foreground mb-1">Job Requisitions</h3>
                  <p className="text-xs text-muted-foreground">Apply process templates</p>
                </div>
              </a>
              <a href="/dashboard/hr-manager/recruitment/templates/jobs" className="group relative overflow-hidden rounded-xl border border-border/50 bg-card p-5 hover:border-primary/50 hover:shadow-lg transition-all">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative z-10">
                  <div className="p-2 bg-primary/10 rounded-lg w-fit mb-3">
                    <Settings className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="font-semibold text-foreground mb-1">Job Templates</h3>
                  <p className="text-xs text-muted-foreground">Manage descriptions</p>
                </div>
              </a>
              <a href="/dashboard/hr-manager/recruitment/analytics" className="group relative overflow-hidden rounded-xl border border-border/50 bg-card p-5 hover:border-primary/50 hover:shadow-lg transition-all">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative z-10">
                  <div className="p-2 bg-primary/10 rounded-lg w-fit mb-3">
                    <BarChart3 className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="font-semibold text-foreground mb-1">Analytics</h3>
                  <p className="text-xs text-muted-foreground">Process insights</p>
                </div>
              </a>
            </div>
          </CardContent>
        </Card>
      </div>
      <Dialog open={isModalOpen} onOpenChange={handleCloseModal}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingTemplate ? 'Edit Process Template' : 'Create Process Template'}</DialogTitle>
            <DialogDescription>Define the hiring stages and workflow progression</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Template Name *</Label>
                <Input id="name" value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="e.g., Senior Hire Process" required />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="description">Description</Label>
                <Textarea id="description" value={formDescription} onChange={(e) => setFormDescription(e.target.value)} placeholder="Brief description..." rows={3} />
              </div>
              <div className="grid gap-2">
                <div className="flex justify-between items-center">
                  <Label>Hiring Stages *</Label>
                  <Button type="button" variant="outline" size="sm" onClick={handleAddStage}>
                    <Plus className="h-4 w-4 mr-1" />
                    Add Stage
                  </Button>
                </div>
                <div className="space-y-2">
                  {formStages.map((stage, index) => (
                    <Card key={stage.id} className="p-3">
                      <div className="grid grid-cols-12 gap-2 items-center">
                        <div className="col-span-5">
                          <Input placeholder="Stage name" value={stage.name} onChange={(e) => handleStageChange(stage.id, 'name', e.target.value)} />
                        </div>
                        <div className="col-span-3">
                          <Input type="number" placeholder="%" value={stage.percentage} onChange={(e) => handleStageChange(stage.id, 'percentage', parseInt(e.target.value))} min={0} max={100} />
                        </div>
                        <div className="col-span-4 flex gap-1">
                          <Button type="button" variant="outline" size="sm" onClick={() => handleMoveStage(index, 'up')} disabled={index === 0}>
                            <ArrowUp className="h-4 w-4" />
                          </Button>
                          <Button type="button" variant="outline" size="sm" onClick={() => handleMoveStage(index, 'down')} disabled={index === formStages.length - 1}>
                            <ArrowDown className="h-4 w-4" />
                          </Button>
                          <Button type="button" variant="destructive" size="sm" onClick={() => handleRemoveStage(stage.id)} disabled={formStages.length <= 1}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseModal}>Cancel</Button>
              <Button type="submit" disabled={submitting}>{submitting ? 'Saving...' : editingTemplate ? 'Update' : 'Create'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
