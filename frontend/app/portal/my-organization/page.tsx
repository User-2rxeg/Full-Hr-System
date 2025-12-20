'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/app/context/AuthContext';
import { organizationStructureService } from '@/app/services/organization-structure';

/**
 * My Organization - Employee Portal
 * REQ-SANV-01: As an Employee, I want to view the organizational hierarchy
 * BR 24: Organizational structure must be viewable as a graphical chart
 * BR 41: Access must be role-based
 */

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

  const fetchOrgChart = async () => {
    try {
      setLoading(true);
      setError(null);

      const res = await organizationStructureService.getOrgChart();
      if (res.data) {
        setOrgData(Array.isArray(res.data) ? res.data : []);
        // Expand first level by default
        if (Array.isArray(res.data)) {
          setExpandedNodes(new Set(res.data.map((n: OrgNode) => n._id)));
        }
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
      if (newSet.has(nodeId)) {
        newSet.delete(nodeId);
      } else {
        newSet.add(nodeId);
      }
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

  const collapseAll = () => {
    setExpandedNodes(new Set());
  };

  const renderTreeNode = (node: OrgNode, depth: number = 0) => {
    const isExpanded = expandedNodes.has(node._id);
    const hasChildren = node.children && node.children.length > 0;
    const displayName = node.type === 'department' ? node.name : node.title;
    const isCurrentUser = node.employeeId?._id === user?.id;

    // Search filter
    if (searchQuery) {
      const matchesSearch =
        displayName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        node.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        node.employeeId?.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        node.employeeId?.lastName.toLowerCase().includes(searchQuery.toLowerCase());

      const hasMatchingChildren = node.children?.some(child => {
        const childName = child.type === 'department' ? child.name : child.title;
        return childName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          child.code.toLowerCase().includes(searchQuery.toLowerCase());
      });

      if (!matchesSearch && !hasMatchingChildren) return null;
    }

    return (
      <div key={node._id} className="select-none">
        <div
          className={`flex items-center gap-2 py-2 px-3 rounded-lg transition-colors ${
            isCurrentUser 
              ? 'bg-primary/10 border border-primary/30' 
              : 'hover:bg-muted/50'
          }`}
          style={{ marginLeft: depth * 24 }}
        >
          {hasChildren ? (
            <button
              onClick={() => toggleNode(node._id)}
              className="p-1 text-muted-foreground hover:text-foreground rounded"
            >
              <svg
                className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          ) : (
            <span className="w-6"></span>
          )}

          <div className={`w-2 h-2 rounded-full ${
            node.type === 'department' 
              ? 'bg-blue-500' 
              : node.employeeId ? 'bg-green-500' : 'bg-amber-500'
          }`}></div>

          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className={`font-medium ${isCurrentUser ? 'text-primary' : 'text-foreground'}`}>
                {displayName}
              </span>
              {isCurrentUser && (
                <span className="text-xs text-primary font-medium">(You)</span>
              )}
            </div>
            {node.type === 'position' && (
              <div className="text-sm text-muted-foreground">
                {node.employeeId
                  ? `${node.employeeId.firstName} ${node.employeeId.lastName}`
                  : 'Vacant'}
              </div>
            )}
          </div>
        </div>

        {hasChildren && isExpanded && (
          <div className="border-l-2 border-border ml-3" style={{ marginLeft: depth * 24 + 12 }}>
            {node.children!.map(child => renderTreeNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="p-6 lg:p-8">
        <div className="max-w-6xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-muted rounded w-1/3"></div>
            <div className="bg-card rounded-xl border border-border p-6 h-96"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl lg:text-3xl font-semibold text-foreground">Organization Structure</h1>
          <p className="text-muted-foreground mt-1">View the organizational hierarchy and your position within it</p>
        </div>

        {error && (
          <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {/* Toolbar */}
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="relative">
              <input
                type="text"
                placeholder="Search organization..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary w-64"
              />
              <svg className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={expandAll}
                className="px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
              >
                Expand All
              </button>
              <button
                onClick={collapseAll}
                className="px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
              >
                Collapse All
              </button>
            </div>
          </div>

          {/* Legend */}
          <div className="flex items-center gap-6 mt-4 pt-4 border-t border-border">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <div className="w-2 h-2 rounded-full bg-blue-500"></div>
              <span>Department</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <div className="w-2 h-2 rounded-full bg-green-500"></div>
              <span>Filled Position</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <div className="w-2 h-2 rounded-full bg-amber-500"></div>
              <span>Vacant Position</span>
            </div>
          </div>
        </div>

        {/* Organization Tree */}
        <div className="bg-card border border-border rounded-xl">
          {orgData.length === 0 ? (
            <div className="p-12 text-center">
              <svg className="w-16 h-16 text-muted-foreground/50 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              <h3 className="font-medium text-foreground">Organization Chart Not Available</h3>
              <p className="text-muted-foreground text-sm mt-1">
                The organization structure has not been set up yet
              </p>
            </div>
          ) : (
            <div className="p-6">
              {orgData.map(node => renderTreeNode(node))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

