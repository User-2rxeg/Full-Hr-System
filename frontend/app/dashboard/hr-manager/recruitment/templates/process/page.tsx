'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { GlassCard } from '@/app/components/ui/glass-card';
import { Badge } from '@/app/components/ui/badge';
import { Label } from '@/app/components/ui/label';
import { Textarea } from '@/app/components/ui/textarea';
import { LoadingSpinner } from '@/app/components/ui/loading-spinner';
import {
  Plus,
  Settings2,
  ChevronRight,
  Trash2,
  ArrowUp,
  ArrowDown,
  Save,
  X,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Zap,
  Info,
  Workflow,
  Clock,
  Layout
} from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/app/components/ui/dialog';

// =====================================================
// Types
// =====================================================

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
  createdAt: string;
  updatedAt: string;
}

// =====================================================
// LocalStorage Key
// =====================================================

const STORAGE_KEY = 'hr_process_templates';

// =====================================================
// Default Template
// =====================================================

const DEFAULT_TEMPLATE: ProcessTemplate = {
  id: 'default-template',
  name: 'Institutional Standard Protocol',
  description: 'Global default hiring workflow defined for GIU core recruitment operations.',
  stages: [
    { id: 'stage-screening', name: 'Screening', order: 1, percentage: 20, description: 'Initial application review and filtering' },
    { id: 'stage-shortlisting', name: 'Shortlisting', order: 2, percentage: 20, description: 'Shortlist qualified candidates for interviews' },
    { id: 'stage-interview', name: 'Interview', order: 3, percentage: 20, description: 'Department & HR interviews' },
    { id: 'stage-offer', name: 'Offer', order: 4, percentage: 20, description: 'Offer preparation and extension' },
    { id: 'stage-hired', name: 'Hired', order: 5, percentage: 20, description: 'Candidate accepted offer and onboarding begins' },
  ],
  isDefault: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

// =====================================================
// Storage Helpers
// =====================================================

function loadTemplatesFromStorage(): ProcessTemplate[] {
  if (typeof window === 'undefined') return [DEFAULT_TEMPLATE];
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([DEFAULT_TEMPLATE]));
    return [DEFAULT_TEMPLATE];
  }
  try {
    const templates = JSON.parse(stored);
    if (!templates.find((t: ProcessTemplate) => t.id === 'default-template')) {
      templates.unshift(DEFAULT_TEMPLATE);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
    }
    return templates;
  } catch {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([DEFAULT_TEMPLATE]));
    return [DEFAULT_TEMPLATE];
  }
}

function saveTemplatesToStorage(templates: ProcessTemplate[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
}

const STAGE_COLORS = [
  'bg-primary',
  'bg-indigo-500',
  'bg-violet-500',
  'bg-purple-500',
  'bg-fuchsia-500',
  'bg-pink-500',
  'bg-rose-500',
  'bg-amber-500',
];

export default function ProcessTemplatesPage() {
  const [templates, setTemplates] = useState<ProcessTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<ProcessTemplate | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [formData, setFormData] = useState({ name: '', description: '' });
  const [stages, setStages] = useState<HiringStage[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    setTemplates(loadTemplatesFromStorage());
    setLoading(false);
  }, []);

  const getTotalPercentage = () => stages.reduce((sum, s) => sum + s.percentage, 0);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!formData.name.trim()) newErrors.name = 'Protocol name is required';
    if (stages.length < 1) newErrors.stages = 'Minimum 1 stage required';
    const total = getTotalPercentage();
    if (total !== 100) newErrors.percentage = `Total allocation must be 100% (Current: ${total}%)`;

    stages.forEach((stage, index) => {
      if (!stage.name.trim()) newErrors[`stage_name_${index}`] = 'Identity required';
      if (stage.percentage <= 0) newErrors[`stage_percentage_${index}`] = 'Invalid %';
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleOpenCreate = () => {
    setEditingTemplate(null);
    setFormData({ name: '', description: '' });
    setStages([
      { id: `new_${Date.now()}_1`, name: 'Screening', order: 1, percentage: 20 },
      { id: `new_${Date.now()}_2`, name: 'Technical Assessment', order: 2, percentage: 20 },
      { id: `new_${Date.now()}_3`, name: 'Panel Interview', order: 3, percentage: 20 },
      { id: `new_${Date.now()}_4`, name: 'Culture Fit', order: 4, percentage: 20 },
      { id: `new_${Date.now()}_5`, name: 'Final Decision', order: 5, percentage: 20 },
    ]);
    setErrors({});
    setShowModal(true);
  };

  const handleOpenEdit = (template: ProcessTemplate) => {
    setEditingTemplate(template);
    setFormData({ name: template.name, description: template.description || '' });
    setStages([...template.stages]);
    setErrors({});
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!validateForm()) return;
    setSaving(true);
    try {
      const updatedStages = stages.map((s, i) => ({
        ...s,
        id: s.id.startsWith('new_') ? `stage_${Date.now()}_${i}` : s.id,
        order: i + 1,
      }));

      let newTemplates: ProcessTemplate[];
      if (editingTemplate) {
        newTemplates = templates.map(t =>
          t.id === editingTemplate.id
            ? { ...t, name: formData.name, description: formData.description, stages: updatedStages, updatedAt: new Date().toISOString() }
            : t
        );
      } else {
        const newTemplate: ProcessTemplate = {
          id: `template_${Date.now()}`,
          name: formData.name,
          description: formData.description,
          stages: updatedStages,
          isDefault: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        newTemplates = [...templates, newTemplate];
      }
      saveTemplatesToStorage(newTemplates);
      setTemplates(newTemplates);
      setShowModal(false);
      toast.success(editingTemplate ? 'Protocol updated' : 'New protocol initialized');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (id: string) => {
    if (id === 'default-template') {
      toast.error('Cannot delete core standard protocol');
      return;
    }
    if (confirm('Permanently archive this process template?')) {
      const updatedTemplates = templates.filter(t => t.id !== id);
      saveTemplatesToStorage(updatedTemplates);
      setTemplates(updatedTemplates);
      toast.success('Template archived');
    }
  };

  const handleSetDefault = (id: string) => {
    const updatedTemplates = templates.map(t => ({
      ...t,
      isDefault: t.id === id,
      updatedAt: t.id === id ? new Date().toISOString() : t.updatedAt,
    }));
    saveTemplatesToStorage(updatedTemplates);
    setTemplates(updatedTemplates);
    toast.info('Global default protocol updated');
  };

  return (
    <div className="p-4 sm:p-8 max-w-[1400px] mx-auto space-y-12 animate-in fade-in duration-700 pb-20">
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary/5 blur-[120px] rounded-full -z-10 pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 border-b border-border/50 pb-10">
        <div className="space-y-4">
          <div className="flex items-center gap-3 text-primary font-black uppercase tracking-[0.3em] text-[10px] mb-1">
            <Workflow className="w-4 h-4" /> Workflow Architecture
          </div>
          <h1 className="text-5xl font-black text-foreground tracking-tighter leading-tight italic">
            Process Blueprints
          </h1>
          <p className="max-w-2xl text-muted-foreground text-lg font-medium opacity-70 leading-relaxed">
            Architect custom hiring sequences for diverse mandates. Define stage weightage and operational flow protocols.
          </p>
        </div>
        <Button onClick={handleOpenCreate} className="h-14 px-8 rounded-2xl bg-primary shadow-xl shadow-primary/20 font-black uppercase text-[10px] tracking-widest gap-2">
          <Plus className="w-5 h-5" /> Initialize New Protocol
        </Button>
      </div>

      {/* Constraints Warning */}
      <GlassCard className="p-6 bg-amber-500/5 border-amber-500/20 flex flex-col sm:flex-row items-start gap-4">
        <div className="p-3 bg-amber-500 text-white rounded-2xl">
          <Zap className="w-6 h-6" />
        </div>
        <div>
          <h3 className="font-black text-xs uppercase tracking-widest text-amber-500 mb-1">Operational Environment Note</h3>
          <p className="text-sm font-medium text-amber-500/80 leading-relaxed">
            These protocols are currently managed via <span className="underline font-bold">Local Vault Synchronization</span>.
            Persistent backend migration is pending institutional infrastructure updates. All changes are stored within this workstation's secure cache.
          </p>
        </div>
      </GlassCard>

      {/* Templates List */}
      {loading ? (
        <div className="flex items-center justify-center py-32">
          <LoadingSpinner size="lg" className="text-primary" />
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          {templates.map((template) => (
            <GlassCard key={template.id} className="p-8 group hover:border-primary/30 transition-all relative overflow-hidden flex flex-col justify-between">
              <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                <Layout size={100} strokeWidth={1} />
              </div>

              <div className="space-y-6 relative z-10">
                <div className="flex justify-between items-start">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <h3 className="text-2xl font-black tracking-tighter uppercase italic group-hover:text-primary transition-colors">{template.name}</h3>
                      {template.isDefault && (
                        <Badge className="bg-primary/10 text-primary border-primary/20 text-[9px] font-black tracking-widest uppercase">System Core</Badge>
                      )}
                    </div>
                    <p className="text-sm font-medium text-muted-foreground/70 max-w-md italic leading-relaxed">
                      {template.description || 'Institutional protocol without detailed addendum.'}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <div className="opacity-0 group-hover:opacity-100 transition-all flex gap-2">
                      {!template.isDefault && (
                        <Button variant="ghost" size="icon" onClick={() => handleSetDefault(template.id)} className="h-10 w-10 border border-border/50 hover:bg-primary/10 hover:text-primary rounded-xl" title="Set as Global Standard">
                          <CheckCircle2 className="w-4 h-4" />
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" onClick={() => handleOpenEdit(template)} className="h-10 w-10 border border-border/50 hover:bg-background rounded-xl">
                        <Settings2 className="w-4 h-4" />
                      </Button>
                      {!template.isDefault && (
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(template.id)} className="h-10 w-10 border border-border/50 hover:bg-destructive/10 hover:text-destructive rounded-xl">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Progress Visualizer */}
                <div className="space-y-4">
                  <div className="flex h-10 rounded-[20px] overflow-hidden bg-muted/40 p-1.5 border border-border/30">
                    {template.stages.map((stage, idx) => (
                      <div
                        key={stage.id}
                        className={`${STAGE_COLORS[idx % STAGE_COLORS.length]} first:rounded-l-2xl last:rounded-r-2xl border-x border-white/10 flex items-center justify-center transition-all relative group/stage`}
                        style={{ width: `${stage.percentage}%` }}
                      >
                        {stage.percentage >= 15 && (
                          <span className="text-[8px] font-black text-white uppercase tracking-tighter px-1 truncate">
                            {stage.name}
                          </span>
                        )}
                        <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-foreground text-background px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest opacity-0 group-hover/stage:opacity-100 transition-opacity whitespace-nowrap pointer-events-none shadow-xl">
                          {stage.name}: {stage.percentage}% Impact
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex flex-wrap gap-x-6 gap-y-3">
                    {template.stages.map((stage, idx) => (
                      <div key={stage.id} className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${STAGE_COLORS[idx % STAGE_COLORS.length]}`} />
                        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/80">
                          {stage.name} <span className="opacity-40 italic">({stage.percentage}%)</span>
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="pt-6 mt-8 border-t border-border/30 flex justify-between items-center text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground/40">
                <div className="flex gap-4">
                  <span>{template.stages.length} Workflow Nodes</span>
                  <span>•</span>
                  <span>Nexus Sync {new Date(template.updatedAt).toLocaleDateString()}</span>
                </div>
                <ChevronRight className="w-4 h-4" />
              </div>
            </GlassCard>
          ))}

          {templates.length === 0 && (
            <div className="col-span-full py-40 flex flex-col items-center justify-center space-y-4 opacity-20">
              <Layers size={80} strokeWidth={1} />
              <p className="text-xl font-black uppercase tracking-widest">Protocol Vault Empty</p>
              <Button variant="outline" onClick={handleOpenCreate}>Initialize First Blueprint</Button>
            </div>
          )}
        </div>
      )}

      {/* Editor Dialog */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="sm:max-w-3xl rounded-[40px] border-border/50 shadow-2xl p-0 overflow-hidden bg-background/95 backdrop-blur-3xl">
          <div className="bg-primary/5 p-10 border-b border-primary/10">
            <h2 className="text-3xl font-black tracking-tighter uppercase text-primary italic">
              {editingTemplate ? 'Modify Protocol' : 'Blueprint Architect'}
            </h2>
            <p className="text-xs font-bold text-muted-foreground tracking-widest uppercase opacity-70">
              Defining institutional operational sequences for recruitment execution.
            </p>
          </div>

          <div className="p-10 space-y-10 max-h-[65vh] overflow-y-auto custom-scrollbar">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Protocol Nomenclature</Label>
                <Input
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="h-14 rounded-2xl bg-muted/20 border-border/50 font-black text-md tracking-tighter uppercase"
                  placeholder="e.g., GLOBAL_FACULTY_FLOW"
                />
                {errors.name && <p className="text-[9px] font-black text-destructive uppercase tracking-widest">{errors.name}</p>}
              </div>
              <div className="space-y-4">
                <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Institutional Description</Label>
                <Textarea
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  className="h-14 rounded-2xl bg-muted/20 border-border/50 font-medium text-sm min-h-[56px]"
                  placeholder="Brief operational context..."
                />
              </div>
            </div>

            <div className="space-y-6">
              <div className="flex justify-between items-end border-b border-border/50 pb-4">
                <h3 className="font-black text-xs uppercase tracking-[0.3em] text-primary">Workflow Architecture Nodes</h3>
                <div className={`text-[10px] font-black uppercase tracking-widest flex items-center gap-2 ${getTotalPercentage() === 100 ? 'text-emerald-500' : 'text-amber-500'}`}>
                  {getTotalPercentage() === 100 ? <CheckCircle2 className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
                  Allocation: {getTotalPercentage()}% / 100%
                </div>
              </div>

              <div className="space-y-3">
                {stages.map((stage, idx) => (
                  <div key={stage.id} className="flex items-center gap-4 p-4 bg-muted/10 border border-border/30 rounded-3xl group/row hover:bg-muted/20 hover:border-primary/20 transition-all">
                    <div className="flex flex-col gap-1 items-center justify-center opacity-30 group-hover/row:opacity-100 transition-opacity">
                      <button onClick={() => idx > 0 && setStages(prev => {
                        const next = [...prev];
                        [next[idx], next[idx - 1]] = [next[idx - 1], next[idx]];
                        return next;
                      })} className="hover:text-primary"><ArrowUp className="w-4 h-4" /></button>
                      <button onClick={() => idx < stages.length - 1 && setStages(prev => {
                        const next = [...prev];
                        [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
                        return next;
                      })} className="hover:text-primary"><ArrowDown className="w-4 h-4" /></button>
                    </div>

                    <div className="w-8 h-8 rounded-xl bg-background border border-border/50 flex items-center justify-center text-[10px] font-black text-primary shadow-inner">
                      {idx + 1}
                    </div>

                    <div className="flex-1">
                      <Input
                        value={stage.name}
                        onChange={e => handleStageChange(idx, 'name', e.target.value)}
                        className={`h-11 rounded-xl border-none bg-background/50 font-bold uppercase text-xs tracking-tight ${errors[`stage_name_${idx}`] ? 'ring-1 ring-destructive' : ''}`}
                        placeholder="Node Identity"
                      />
                    </div>

                    <div className="relative w-24">
                      <Input
                        type="number"
                        value={stage.percentage}
                        onChange={e => handleStageChange(idx, 'percentage', e.target.value)}
                        className={`h-11 rounded-xl border-none bg-background/50 pr-8 font-black text-xs text-right ${errors[`stage_percentage_${idx}`] ? 'ring-1 ring-destructive' : ''}`}
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] font-black opacity-30">%</span>
                    </div>

                    <Button variant="ghost" size="icon" onClick={() => handleRemoveStage(idx)} disabled={stages.length <= 1} className="h-10 w-10 text-muted-foreground/30 hover:text-destructive hover:bg-destructive/5">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>

              <Button variant="outline" onClick={handleAddStage} className="w-full h-14 rounded-3xl border-dashed border-2 border-border/50 text-muted-foreground hover:text-primary hover:border-primary/30 transition-all font-black uppercase text-[10px] tracking-widest gap-2">
                <Plus className="w-4 h-4" /> Append Operational Node
              </Button>
            </div>
          </div>

          <div className="p-8 bg-muted/40 border-t border-border/50 flex gap-4">
            <Button variant="ghost" onClick={() => setShowModal(false)} className="flex-1 h-14 rounded-3xl font-black uppercase text-[10px] tracking-widest opacity-50 hover:opacity-100 transition-opacity">Abort Mission</Button>
            <Button onClick={handleSave} disabled={saving || getTotalPercentage() !== 100} className="flex-1 h-14 rounded-3xl bg-primary hover:bg-primary/90 shadow-xl shadow-primary/20 font-black uppercase text-[10px] tracking-widest gap-2 transition-all">
              <Save className="w-5 h-5" /> Initialize Protocol
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <style jsx global>{`
          .custom-scrollbar::-webkit-scrollbar { width: 5px; }
          .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
          .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(var(--primary-rgb), 0.1); border-radius: 10px; }
      `}</style>
    </div>
  );

  function handleAddStage() {
    const newStage: HiringStage = { id: `new_${Date.now()}`, name: '', order: stages.length + 1, percentage: 0 };
    setStages([...stages, newStage]);
  }

  function handleRemoveStage(idx: number) {
    if (stages.length <= 1) return;
    const next = stages.filter((_, i) => i !== idx);
    setStages(next.map((s, i) => ({ ...s, order: i + 1 })));
  }

  function handleStageChange(idx: number, field: keyof HiringStage, value: string | number) {
    setStages(prev => prev.map((s, i) => i === idx ? { ...s, [field]: field === 'percentage' ? Number(value) : value } : s));
  }
}
