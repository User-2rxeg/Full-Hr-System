'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { TeamMember } from './TeamMemberCard';
import { StatusBadge } from '@/components/ui/status-badge';
import { analyticsService, AttritionRiskResponse } from '@/app/services/analytics';
import { SkillRadar } from '@/components/analytics/SkillRadar';
import { AttritionRiskCard } from '@/components/analytics/AttritionRiskCard';
import { BrainCircuit } from 'lucide-react';

interface TeamMemberDetailModalProps {
  member: TeamMember | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function TeamMemberDetailModal({ member, isOpen, onClose }: TeamMemberDetailModalProps) {
  const [imageError, setImageError] = useState(false);
  const [attritionRisk, setAttritionRisk] = useState<AttritionRiskResponse | null>(null);
  const [loadingRisk, setLoadingRisk] = useState(false);

  // Reset and fetch member-specific analytics
  useEffect(() => {
    setImageError(false);
    setAttritionRisk(null);

    if (isOpen && member) {
      const fetchAnalytics = async () => {
        try {
          setLoadingRisk(true);
          const riskData = await analyticsService.getAttritionRisk(member._id);
          setAttritionRisk(riskData);
        } catch (err) {
          console.error('Failed to fetch team member risk data:', err);
        } finally {
          setLoadingRisk(false);
        }
      };
      fetchAnalytics();
    }
  }, [member?._id, isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen || !member) return null;

  const displayName = member.fullName || `${member.firstName} ${member.lastName}`;
  const initials = `${member.firstName?.[0] || ''}${member.lastName?.[0] || ''}`.toUpperCase();

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const calculateTenure = (dateOfHire: string) => {
    const hire = new Date(dateOfHire);
    const now = new Date();
    const years = Math.floor((now.getTime() - hire.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
    const months = Math.floor(((now.getTime() - hire.getTime()) % (365.25 * 24 * 60 * 60 * 1000)) / (30.44 * 24 * 60 * 60 * 1000));

    if (years > 0) {
      return `${years} year${years > 1 ? 's' : ''}, ${months} month${months !== 1 ? 's' : ''}`;
    }
    return `${months} month${months !== 1 ? 's' : ''}`;
  };

  const formatStatus = (status: string) => {
    return status?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Unknown';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-lg bg-card border border-border rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header with gradient background */}
        <div className="relative bg-gradient-to-br from-primary/90 to-primary px-6 py-8 text-primary-foreground">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          <div className="flex items-center gap-4">
            {/* Avatar */}
            <div className="relative">
              {member.profilePictureUrl && !imageError ? (
                <img
                  src={member.profilePictureUrl}
                  alt={displayName}
                  className="w-20 h-20 rounded-full object-cover ring-4 ring-white/20 shadow-lg"
                  onError={() => setImageError(true)}
                />
              ) : (
                <div className="w-20 h-20 rounded-full bg-white/20 flex items-center justify-center ring-4 ring-white/20 shadow-lg">
                  <span className="text-2xl font-bold">{initials}</span>
                </div>
              )}
            </div>

            {/* Name & Title */}
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-bold truncate">{displayName}</h2>
              <p className="text-primary-foreground/80 font-medium">
                {member.primaryPositionId?.title || 'No Position'}
              </p>
              <p className="text-primary-foreground/60 text-sm">
                {member.primaryDepartmentId?.name || 'No Department'}
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-5 space-y-5">
          {/* Status Badge */}
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">Status</span>
            <StatusBadge
              status={member.status}
              label={formatStatus(member.status)}
              size="lg"
            />
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-muted/50 rounded-lg p-3">
              <p className="text-xs text-muted-foreground mb-1">Employee ID</p>
              <p className="font-semibold text-foreground">{member.employeeNumber}</p>
            </div>
            <div className="bg-muted/50 rounded-lg p-3">
              <p className="text-xs text-muted-foreground mb-1">Date of Hire</p>
              <p className="font-semibold text-foreground">{formatDate(member.dateOfHire)}</p>
            </div>
            <div className="bg-muted/50 rounded-lg p-3 col-span-2">
              <p className="text-xs text-muted-foreground mb-1">Tenure</p>
              <p className="font-semibold text-foreground">{calculateTenure(member.dateOfHire)}</p>
            </div>
          </div>

          {/* Contact Information */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <svg className="w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              Contact Information
            </h3>

            {member.workEmail && (
              <a
                href={`mailto:${member.workEmail}`}
                className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors group"
              >
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground">Work Email</p>
                  <p className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">
                    {member.workEmail}
                  </p>
                </div>
                <svg className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            )}

            {member.mobilePhone && (
              <a
                href={`tel:${member.mobilePhone}`}
                className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors group"
              >
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground">Mobile Phone</p>
                  <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                    {member.mobilePhone}
                  </p>
                </div>
                <svg className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
              </a>
            )}
          </div>

          {/* Analytics Section */}
          <div className="space-y-4 pt-4 border-t border-border">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <BrainCircuit className="w-4 h-4 text-primary" />
              Talent Analytics
            </h3>

            <div className="space-y-6">
              {/* Skills Radar */}
              <div className="bg-muted/30 rounded-xl p-4">
                <p className="text-xs font-medium text-muted-foreground mb-4 uppercase tracking-wider text-center">Skill Proficiency Matrix</p>
                <div className="h-[250px]">
                  <SkillRadar skills={member.skills || []} />
                </div>
              </div>

              {/* Attrition Risk */}
              {loadingRisk ? (
                <div className="h-24 bg-muted/50 animate-pulse rounded-xl flex items-center justify-center text-xs text-muted-foreground">
                  Calculating AI risk prediction...
                </div>
              ) : attritionRisk ? (
                <AttritionRiskCard
                  riskScore={attritionRisk.riskScore}
                  level={attritionRisk.level}
                  factors={attritionRisk.factors}
                />
              ) : (
                <div className="p-4 bg-muted/20 border border-dashed rounded-xl text-center text-xs text-muted-foreground">
                  Attrition risk data unavailable for this member
                </div>
              )}

              {/* Performance Action */}
              <div className="pt-2">
                <Link
                  href="/dashboard/department-head/performance"
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold transition-all shadow-lg hover:shadow-xl active:scale-[0.98]"
                >
                  <BrainCircuit className="w-4 h-4" />
                  Initiate Performance Review
                </Link>
                <p className="text-[10px] text-center text-muted-foreground mt-2 uppercase tracking-widest font-bold">
                  Direct action for Supervisor (BR 41b)
                </p>
              </div>
            </div>
          </div>

          {/* Privacy Notice */}
          <div className="flex items-start gap-2 p-3 bg-warning/10 border border-warning/20 rounded-lg">
            <svg className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <p className="text-xs text-amber-700 dark:text-amber-400">
              Privacy Notice: Sensitive personal information is hidden per company policy (BR 18b).
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
