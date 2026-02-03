'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { organizationStructureService } from '@/app/services/organization-structure';
import {
  PortalPageHeader,
  PortalCard,
  PortalLoading,
  PortalBadge,
  PortalButton,
  PortalInput,
  PortalErrorState,
  PortalEmptyState,
} from '@/components/portal';
import { Users, Building, Briefcase, ChevronRight, ChevronDown, Search, Maximize2, Minimize2, User, Landmark } from 'lucide-react';
interface OrgNode {
  _id: string;
  name?: string;
  title?: string;
  code: string;
  type: 'department' | 'position';
  parentId?: string;
  employeeId?: {
    _id: string;
    firstName: string;
    lastName: string;
    employeeNumber: string;
  };
  children?: OrgNode[];
  isActive: boolean;
}
export default function MyOrganizationPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [orgData, setOrgData] = useState<OrgNode[]>([]);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  useEffect(() => {
    fetchOrgChart();
  }, []);
  const buildOrgTree = (data: any): OrgNode[] => {
    if (data?.departments || data?.positions) {
      const departments = data.departments || [];
      const positions = data.positions || [];
      const deptMap = new Map<string, OrgNode>();
      departments.forEach((dept: any) => {
        deptMap.set(dept._id, {
          _id: dept._id,
          name: dept.name,
          code: dept.code,
          type: 'department',
          isActive: dept.isActive !== false,
          children: [],
        });
      });
      const posMap = new Map<string, OrgNode>();
      positions.forEach((pos: any) => {
        posMap.set(pos._id, {
          _id: pos._id,
          title: pos.title,
          code: pos.code,
          type: 'position',
          parentId: pos.reportsToPositionId?._id || pos.reportsToPositionId,
          employeeId: pos.currentHolderId,
          isActive: pos.isActive !== false,
          children: [],
        });
      });
      positions.forEach((pos: any) => {
        const posNode = posMap.get(pos._id);
        if (!posNode) return;
        const parentPosId = pos.reportsToPositionId?._id || pos.reportsToPositionId;
        const deptId = pos.departmentId?._id || pos.departmentId;
        if (parentPosId && posMap.has(parentPosId)) {
          const parentPos = posMap.get(parentPosId);
          if (parentPos && parentPos.children) {
            parentPos.children.push(posNode);
          }
        } else if (deptId && deptMap.has(deptId)) {
          const dept = deptMap.get(deptId);
          if (dept && dept.children) {
            dept.children.push(posNode);
          }
        }
      });
      return Array.from(deptMap.values());
    }
    if (Array.isArray(data)) return data;
    return [];
  };
  const fetchOrgChart = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await organizationStructureService.getOrgChart();
      const treeData = buildOrgTree(res.data || res);
      setOrgData(treeData);
      if (treeData.length > 0) {
        setExpandedNodes(new Set(treeData.map((n: OrgNode) => n._id)));
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load organization chart');
    } finally {
      setLoading(false);
    }
  };
  const toggleNode = (nodeId: string) => {
    setExpandedNodes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(nodeId)) newSet.delete(nodeId);
      else newSet.add(nodeId);
      return newSet;
    });
  };
  const expandAll = () => {
    const allIds = new Set<string>();
    const collectIds = (nodes: OrgNode[]) => {
      nodes.forEach(node => {
        allIds.add(node._id);
        if (node.children) collectIds(node.children);
      });
    };
    collectIds(orgData);
    setExpandedNodes(allIds);
  };
  const collapseAll = () => setExpandedNodes(new Set());
  const renderTreeNode = (node: OrgNode, depth: number = 0) => {
    const isExpanded = expandedNodes.has(node._id);
    const hasChildren = node.children && node.children.length > 0;
    const displayName = node.type === 'department' ? node.name : node.title;
    const isCurrentUser = node.employeeId?._id === user?.id;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        displayName?.toLowerCase().includes(q) ||
        node.code?.toLowerCase().includes(q) ||
        node.employeeId?.firstName?.toLowerCase().includes(q) ||
        node.employeeId?.lastName?.toLowerCase().includes(q);
      const hasMatchingChildren = node.children?.some(child => {
        const childName = child.type === 'department' ? child.name : child.title;
        return childName?.toLowerCase().includes(q) || child.code?.toLowerCase().includes(q);
      });
      if (!matchesSearch && !hasMatchingChildren) return null;
    }
    return (
      <div key={node._id} className="select-none animate-in fade-in slide-in-from-left-2 transition-all">
        <div 
          className={`flex items-center gap-3 py-3 px-4 rounded-2xl transition-all mb-1 border group relative ${
            isCurrentUser 
              ? 'bg-primary text-primary-foreground border-primary shadow-lg scale-[1.02] z-10' 
              : 'bg-card border-border hover:border-primary/30 hover:bg-muted/50'
          }`}
          style={{ marginLeft: depth * 32 }}
        >
          {depth > 0 && (
            <div className="absolute left-[-16px] top-1/2 w-4 h-px bg-border group-hover:bg-primary/30"></div>
          )}
          {hasChildren ? (
            <button
              onClick={() => toggleNode(node._id)}
              className={`p-1.5 rounded-lg transition-colors ${isCurrentUser ? 'hover:bg-white/20' : 'hover:bg-primary/10 hover:text-primary'} text-muted-foreground`}
            >
              {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>
          ) : (
            <div className="w-7 h-7"></div>
          )}
          <div className={`p-2 rounded-xl ${
            isCurrentUser ? 'bg-white/20' : node.type === 'department' ? 'bg-primary/10 text-primary' : 'bg-accent/10 text-accent-foreground'
          }`}>
            {node.type === 'department' ? <Landmark className="w-4 h-4" /> : <Briefcase className="w-4 h-4" />}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="font-bold truncate text-sm">{displayName}</p>
              {isCurrentUser && <PortalBadge variant="info" className="bg-white/20 border-white/20 text-white text-[8px] px-1.5">YOU</PortalBadge>}
            </div>
            <div className="flex items-center gap-2 mt-0.5 opacity-60">
              <span className="text-[10px] font-black uppercase tracking-widest">{node.code}</span>
              {node.employeeId && (
                <>
                  <span className="text-xs">•</span>
                  <div className="flex items-center gap-1">
                    <User className="w-3 h-3" />
                    <span className="text-xs font-medium">{node.employeeId.firstName} {node.employeeId.lastName}</span>
                  </div>
                </>
              )}
            </div>
          </div>
          {!node.isActive && <PortalBadge variant="destructive" size="sm">Inactive</PortalBadge>}
        </div>
        {isExpanded && node.children && (
          <div className="border-l-2 border-border/30 ml-4 pl-4 py-1">
            {node.children.map(child => renderTreeNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };
  if (loading) return <PortalLoading message="Building organization map..." fullScreen />;
  return (
    <div className="min-h-screen bg-background p-4 md:p-6 lg:p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <PortalPageHeader
          title="Organization"
          description="Global hierarchy mapping and talent structure"
          breadcrumbs={[{ label: 'Organization' }]}
          actions={
            <div className="flex gap-2">
              <PortalButton variant="outline" size="sm" onClick={expandAll} icon={<Maximize2 className="w-4 h-4" />}>Expand</PortalButton>
              <PortalButton variant="outline" size="sm" onClick={collapseAll} icon={<Minimize2 className="w-4 h-4" />}>Collapse</PortalButton>
            </div>
          }
        />
        {error && <PortalErrorState message={error} onRetry={fetchOrgChart} />}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-1 space-y-6">
            <PortalCard className="bg-primary/5 border-primary/20 sticky top-6">
              <h3 className="font-black text-xs uppercase tracking-widest text-primary mb-4 flex items-center gap-2">
                <Search className="w-3 h-3" /> Focus Search
              </h3>
              <PortalInput 
                placeholder="Find Dept / Role..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-background"
              />
              <div className="mt-6 space-y-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-primary/10 text-primary"><Landmark className="w-3.5 h-3.5" /></div>
                  <div>
                    <p className="text-[10px] font-black uppercase opacity-40">Departments</p>
                    <p className="text-xs font-bold text-foreground leading-tight">Functional business units</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-accent/10 text-accent-foreground"><Briefcase className="w-3.5 h-3.5" /></div>
                  <div>
                    <p className="text-[10px] font-black uppercase opacity-40">Positions</p>
                    <p className="text-xs font-bold text-foreground leading-tight">Specific job mandates</p>
                  </div>
                </div>
              </div>
            </PortalCard>
          </div>
          <div className="lg:col-span-3">
            <PortalCard className="min-h-[600px] bg-muted/10">
              <div className="flex items-center gap-3 mb-8 pb-4 border-b border-border/50">
                <div className="p-2.5 rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
                  <Building className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="font-bold text-lg">Corporate Blueprint</h2>
                  <p className="text-xs text-muted-foreground">Interactive talent distribution map</p>
                </div>
              </div>
              {orgData.length > 0 ? (
                <div className="space-y-4">
                  {orgData.map(node => renderTreeNode(node))}
                </div>
              ) : (
                <PortalEmptyState icon={<Users className="w-12 h-12 opacity-20" />} title="Blueprint Unavailable" description="The organization chart is currently being updated." />
              )}
            </PortalCard>
          </div>
        </div>
      </div>
    </div>
  );
}
