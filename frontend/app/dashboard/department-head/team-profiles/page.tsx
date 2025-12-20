'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { employeeProfileService } from '@/app/services/employee-profile';
import {
  TeamMemberCard,
  TeamStats,
  TeamMemberDetailModal,
  TeamSearchFilter,
  TeamMember,
} from '@/app/components/team-management';

export default function TeamProfilesPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Search and filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Fetch team profiles
  useEffect(() => {
    const fetchTeamProfiles = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await employeeProfileService.getTeamProfiles();

        if (response.error) {
          throw new Error(response.error);
        }

        const data = response.data as TeamMember[] | undefined;
        setTeamMembers(data || []);
      } catch (err: any) {
        console.error('Failed to fetch team profiles:', err);
        setError(err.message || 'Failed to load team members');
      } finally {
        setLoading(false);
      }
    };

    fetchTeamProfiles();
  }, []);

  // Filter and search logic
  const filteredMembers = useMemo(() => {
    let filtered = teamMembers;

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(
        (member) => member.status?.toLowerCase() === statusFilter.toLowerCase()
      );
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((member) => {
        const fullName = member.fullName || `${member.firstName} ${member.lastName}`;
        return (
          fullName.toLowerCase().includes(query) ||
          member.employeeNumber?.toLowerCase().includes(query) ||
          member.workEmail?.toLowerCase().includes(query) ||
          member.primaryPositionId?.title?.toLowerCase().includes(query) ||
          member.primaryDepartmentId?.name?.toLowerCase().includes(query)
        );
      });
    }

    return filtered;
  }, [teamMembers, statusFilter, searchQuery]);

  const handleViewDetails = (member: TeamMember) => {
    setSelectedMember(member);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedMember(null);
  };

  if (loading) {
    return (
      <div className="p-6 lg:p-8 bg-background min-h-screen">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header skeleton */}
          <div className="animate-pulse">
            <div className="h-8 bg-muted rounded w-1/3 mb-2"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
          </div>

          {/* Stats skeleton */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-card border border-border rounded-xl p-5 animate-pulse">
                <div className="h-4 bg-muted rounded w-1/2 mb-3"></div>
                <div className="h-8 bg-muted rounded w-1/3"></div>
              </div>
            ))}
          </div>

          {/* Cards skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="bg-card border border-border rounded-xl p-5 animate-pulse">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-14 h-14 bg-muted rounded-full"></div>
                  <div className="h-6 bg-muted rounded w-20"></div>
                </div>
                <div className="h-5 bg-muted rounded w-2/3 mb-2"></div>
                <div className="h-4 bg-muted rounded w-1/2 mb-4"></div>
                <div className="space-y-2">
                  <div className="h-4 bg-muted rounded w-full"></div>
                  <div className="h-4 bg-muted rounded w-3/4"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 bg-background min-h-screen">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="p-2 bg-primary/10 rounded-lg">
                <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h1 className="text-2xl lg:text-3xl font-bold text-foreground">My Team</h1>
            </div>
            <p className="text-muted-foreground">
              View and manage your direct reports. Access non-sensitive profile information for your team members.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard/department-head"
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-muted-foreground bg-card border border-border rounded-lg hover:bg-accent hover:text-foreground transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Dashboard
            </Link>
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-lg flex items-center gap-3">
            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{error}</span>
            <button
              onClick={() => window.location.reload()}
              className="ml-auto text-sm font-medium hover:underline"
            >
              Retry
            </button>
          </div>
        )}

        {/* Team Stats */}
        <TeamStats members={teamMembers} loading={loading} />

        {/* Search and Filter */}
        <TeamSearchFilter
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          statusFilter={statusFilter}
          onStatusChange={setStatusFilter}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          totalResults={filteredMembers.length}
        />

        {/* Empty State */}
        {!loading && teamMembers.length === 0 && (
          <div className="bg-card border border-border rounded-xl p-12 text-center">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">No Team Members Found</h3>
            <p className="text-muted-foreground max-w-md mx-auto">
              You don't have any direct reports assigned to you yet. Team members will appear here once they are assigned to your supervision.
            </p>
          </div>
        )}

        {/* No Results State */}
        {!loading && teamMembers.length > 0 && filteredMembers.length === 0 && (
          <div className="bg-card border border-border rounded-xl p-12 text-center">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">No Results Found</h3>
            <p className="text-muted-foreground max-w-md mx-auto mb-4">
              No team members match your current search or filter criteria.
            </p>
            <button
              onClick={() => {
                setSearchQuery('');
                setStatusFilter('all');
              }}
              className="text-primary font-medium hover:underline"
            >
              Clear filters
            </button>
          </div>
        )}

        {/* Team Members Grid/List */}
        {filteredMembers.length > 0 && (
          <div
            className={
              viewMode === 'grid'
                ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'
                : 'space-y-3'
            }
          >
            {filteredMembers.map((member) => (
              <TeamMemberCard
                key={member._id}
                member={member}
                variant={viewMode}
                onViewDetails={handleViewDetails}
              />
            ))}
          </div>
        )}

        {/* Privacy Notice */}
        <div className="bg-muted/50 border border-border rounded-xl p-4 flex items-start gap-3">
          <svg className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          <div>
            <h4 className="text-sm font-medium text-foreground">Privacy Protected View</h4>
            <p className="text-sm text-muted-foreground mt-0.5">
              As per company policy (BR 18b), sensitive information such as salary details, personal addresses, and financial data is restricted.
              You can only view work-related profile information for your direct reports.
            </p>
          </div>
        </div>

        {/* Member Detail Modal */}
        <TeamMemberDetailModal
          member={selectedMember}
          isOpen={isModalOpen}
          onClose={handleCloseModal}
        />
      </div>
    </div>
  );
}

