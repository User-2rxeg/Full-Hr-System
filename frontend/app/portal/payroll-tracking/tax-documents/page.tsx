'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { payrollTrackingService } from '@/app/services/payroll-tracking';
import { FileText, Download, Calendar, ShieldCheck, History, Info, Search, FileSignature } from 'lucide-react';
import {
  PortalPageHeader,
  PortalCard,
  PortalStatCard,
  PortalLoading,
  PortalEmptyState,
  PortalBadge,
  PortalButton,
  PortalInput,
  PortalErrorState,
} from '@/components/portal';
interface TaxDocument {
  id: string;
  year: number;
  type: string;
  name: string;
  issueDate: string;
  status: string;
  fileSize?: string;
  url?: string;
}
export default function PortalTaxDocumentsPage() {
  const { user } = useAuth();
  const [documents, setDocuments] = useState<TaxDocument[]>([]);
  const [filteredDocs, setFilteredDocs] = useState<TaxDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const fetchDocs = async () => {
    if (!user?.id) { setLoading(false); return; }
    try {
      setLoading(true);
      setError(null);
      const res = await payrollTrackingService.getTaxDocuments(user.id);
      let data: any[] = [];
      if (Array.isArray(res?.data)) data = res.data;
      else if (Array.isArray(res)) data = res;
      const mapped = data.map((d: any) => ({
        id: d.id || d._id || Math.random().toString(),
        year: d.year || new Date().getFullYear(),
        type: d.type || 'Annual Tax Return',
        name: d.name || `Tax Statement ${d.year || ''}`,
        issueDate: d.issueDate || d.updatedAt || new Date().toISOString(),
        status: d.status || 'verified',
        fileSize: d.fileSize || '1.2 MB',
      }));
      setDocuments(mapped);
      setFilteredDocs(mapped);
    } catch (err: any) {
      setError(err.message || 'Failed to load tax registry');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    fetchDocs();
  }, [user?.id]);
  useEffect(() => {
    setFilteredDocs(searchQuery ? documents.filter(d => 
      d.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      d.year.toString().includes(searchQuery)
    ) : documents);
  }, [searchQuery, documents]);
  const handleDownload = async (doc: TaxDocument) => {
    if (!user?.id) return;
    try {
      setDownloading(doc.id);
      const res = await payrollTrackingService.downloadAnnualTaxStatement(user.id, doc.year);
      if (res?.blob) {
        const url = window.URL.createObjectURL(res.blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = res.filename || `tax-doc-${doc.year}-${doc.id}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (err) { console.error(err); } finally { setDownloading(null); }
  };
  if (loading) return <PortalLoading message="Decrypting tax archives..." fullScreen />;
  return (
    <div className="min-h-screen bg-background p-4 md:p-6 lg:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <PortalPageHeader
          title="Tax Compliance Center المركز الضريبي"
          description="Access annual tax statements, income certifications, and statutory filings"
          breadcrumbs={[{ label: 'Payroll', href: '/portal/payroll-tracking' }, { label: 'Tax Docs' }]}
        />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
           <PortalStatCard title="Compliance Health" value="OPTIMIZED" icon={<ShieldCheck className="w-5 h-5" />} accentColor="primary" />
           <PortalStatCard title="Total Statements" value={documents.length} icon={<History className="w-5 h-5" />} accentColor="accent" />
           <PortalStatCard title="Next Filing" value="Apr 2026" icon={<Calendar className="w-5 h-5" />} accentColor="muted" />
        </div>
        {error && <PortalErrorState message={error} onRetry={fetchDocs} />}
        <PortalCard className="bg-muted/10 border-dashed">
           <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <PortalInput 
                placeholder="Search by year or document type..." 
                value={searchQuery} 
                onChange={(e) => setSearchQuery(e.target.value)} 
                className="pl-10 h-12"
              />
           </div>
        </PortalCard>
        <div className="space-y-3">
          {filteredDocs.length > 0 ? filteredDocs.map((d) => (
            <PortalCard key={d.id} hover padding="none" className="overflow-hidden group">
               <div className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                  <div className="flex items-center gap-5">
                     <div className="p-4 rounded-2xl bg-primary/10 text-primary border border-primary/20 group-hover:bg-primary group-hover:text-white transition-all">
                        <FileSignature className="w-6 h-6" />
                     </div>
                     <div>
                        <h3 className="font-extrabold text-lg uppercase tracking-tight">{d.name}</h3>
                        <div className="flex items-center gap-3 mt-1">
                           <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Issued: {new Date(d.issueDate).toLocaleDateString()}</span>
                           <PortalBadge variant="success" size="sm">VERIFIED</PortalBadge>
                        </div>
                     </div>
                  </div>
                  <div className="flex items-center gap-8">
                     <div className="text-right hidden md:block">
                        <p className="text-[10px] font-black opacity-40 uppercase mb-1">Archive Integrity</p>
                        <p className="text-xs font-bold text-muted-foreground">{d.fileSize} • PDF</p>
                     </div>
                     <div className="flex gap-2">
                        <PortalButton 
                          variant="outline" 
                          size="sm" 
                          loading={downloading === d.id} 
                          onClick={() => handleDownload(d)}
                          icon={<Download className="w-4 h-4" />}
                        >
                          Download Statement
                        </PortalButton>
                     </div>
                  </div>
               </div>
            </PortalCard>
          )) : (
            <PortalEmptyState icon={<FileText className="w-16 h-16 opacity-10" />} title="No Tax Records Found" description="Tax documents for the current period are still being processed." />
          )}
        </div>
        <PortalCard className="bg-gradient-to-br from-primary/5 to-accent/5 border-dashed border-2">
           <div className="flex gap-4 items-start">
              <div className="p-2 rounded-lg bg-primary/10 text-primary"><Info className="w-5 h-5" /></div>
              <div>
                 <h4 className="font-black text-sm uppercase tracking-wider mb-1">Global Tax Authority Compliance</h4>
                 <p className="text-xs text-muted-foreground leading-relaxed italic">
                    "All documents provided here are digitally signed and verified by the Corporate Finance Integrity Team. Use these statements for personal tax filings and banking requirements."
                 </p>
              </div>
           </div>
        </PortalCard>
      </div>
    </div>
  );
}
