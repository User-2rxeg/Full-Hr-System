'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { organizationStructureService } from '@/app/services/organization-structure';

/**
 * Organization Chart - System Admin View
 * REQ-SANV-01: As an Employee, I want to view the organizational hierarchy
 * BR 24: Organizational structure must be viewable as a graphical chart
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

export default function OrgChartPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [orgData, setOrgData] = useState<OrgNode[]>([]);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchOrgChart();
  }, []);

  const buildOrgTree = (data: any): OrgNode[] => {
    // Handle case where data has departments and positions
    if (data?.departments || data?.positions) {
      const departments = data.departments || [];
      const positions = data.positions || [];

      // Create a map of departments
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

      // Create a map of positions
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

      // Build position hierarchy within each department
      positions.forEach((pos: any) => {
        const posNode = posMap.get(pos._id);
        if (!posNode) return;

        const parentPosId = pos.reportsToPositionId?._id || pos.reportsToPositionId;
        const deptId = pos.departmentId?._id || pos.departmentId;

        if (parentPosId && posMap.has(parentPosId)) {
          // Position reports to another position
          const parentPos = posMap.get(parentPosId);
          if (parentPos && parentPos.children) {
            parentPos.children.push(posNode);
          }
        } else if (deptId && deptMap.has(deptId)) {
          // Top-level position in department
          const dept = deptMap.get(deptId);
          if (dept && dept.children) {
            dept.children.push(posNode);
          }
        }
      });

      // Return all departments as root nodes
      return Array.from(deptMap.values());
    }

    // Handle case where data is already an array
    if (Array.isArray(data)) {
      return data;
    }

    return [];
  };

  const fetchOrgChart = async () => {
    try {
      setLoading(true);
      setError(null);

      const res = await organizationStructureService.getOrgChart();
      const treeData = buildOrgTree(res.data || res);
      setOrgData(treeData);

      // Expand first level by default
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
          className={`flex items-center gap-2 py-2 px-3 rounded-lg hover:bg-muted/50 transition-colors ${
            depth > 0 ? 'ml-6' : ''
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
              <span className="font-medium text-foreground">{displayName}</span>
              <span className="text-xs text-muted-foreground font-mono">({node.code})</span>
              {!node.isActive && (
                <span className="text-xs text-red-500">[Inactive]</span>
              )}
            </div>
            {node.type === 'position' && (
              <div className="text-sm text-muted-foreground">
                {node.employeeId
                  ? `${node.employeeId.firstName} ${node.employeeId.lastName} (${node.employeeId.employeeNumber})`
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
      <div className="p-6 lg:p-8 bg-background min-h-screen">
        <div className="max-w-6xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-muted rounded w-1/3"></div>
            <div className="h-96 bg-muted rounded-xl"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 bg-background min-h-screen">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard/system-admin/organization-structure"
              className="p-2 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Organization Chart</h1>
              <p className="text-muted-foreground text-sm mt-1">
                REQ-SANV-01: View organizational hierarchy (BR 24)
              </p>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {/* Toolbar */}
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="flex items-center gap-3">
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
              <h3 className="font-medium text-foreground">No Organization Data</h3>
              <p className="text-muted-foreground text-sm mt-1">
                Create departments and positions to build the organization chart
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

