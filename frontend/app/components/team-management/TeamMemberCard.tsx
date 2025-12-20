'use client';

import { useState } from 'react';

export interface TeamMember {
  _id: string;
  firstName: string;
  lastName: string;
  fullName?: string;
  employeeNumber: string;
  workEmail: string;
  mobilePhone?: string;
  status: string;
  dateOfHire: string;
  profilePictureUrl?: string;
  primaryPositionId?: {
    _id: string;
    title: string;
  };
  primaryDepartmentId?: {
    _id: string;
    name: string;
  };
}

interface TeamMemberCardProps {
  member: TeamMember;
  onViewDetails?: (member: TeamMember) => void;
  variant?: 'grid' | 'list';
}

const STATUS_STYLES: Record<string, { bg: string; text: string; dot: string }> = {
  active: {
    bg: 'bg-green-50 dark:bg-green-900/20',
    text: 'text-green-700 dark:text-green-400',
    dot: 'bg-green-500'
  },
  onboarding: {
    bg: 'bg-blue-50 dark:bg-blue-900/20',
    text: 'text-blue-700 dark:text-blue-400',
    dot: 'bg-blue-500'
  },
  on_leave: {
    bg: 'bg-amber-50 dark:bg-amber-900/20',
    text: 'text-amber-700 dark:text-amber-400',
    dot: 'bg-amber-500'
  },
  suspended: {
    bg: 'bg-red-50 dark:bg-red-900/20',
    text: 'text-red-700 dark:text-red-400',
    dot: 'bg-red-500'
  },
  terminated: {
    bg: 'bg-muted',
    text: 'text-muted-foreground',
    dot: 'bg-muted-foreground'
  },
};

export default function TeamMemberCard({ member, onViewDetails, variant = 'grid' }: TeamMemberCardProps) {
  const [imageError, setImageError] = useState(false);

  const statusStyle = STATUS_STYLES[member.status?.toLowerCase()] || STATUS_STYLES.active;
  const displayName = member.fullName || `${member.firstName} ${member.lastName}`;
  const initials = `${member.firstName?.[0] || ''}${member.lastName?.[0] || ''}`.toUpperCase();

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatStatus = (status: string) => {
    return status?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Unknown';
  };

  if (variant === 'list') {
    return (
      <div
        className="flex items-center gap-4 p-4 bg-card border border-border rounded-lg hover:shadow-md hover:border-primary/30 transition-all cursor-pointer group"
        onClick={() => onViewDetails?.(member)}
      >
        {/* Avatar */}
        <div className="relative flex-shrink-0">
          {member.profilePictureUrl && !imageError ? (
            <img
              src={member.profilePictureUrl}
              alt={displayName}
              className="w-12 h-12 rounded-full object-cover ring-2 ring-background"
              onError={() => setImageError(true)}
            />
          ) : (
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/80 to-primary flex items-center justify-center ring-2 ring-background">
              <span className="text-sm font-semibold text-primary-foreground">{initials}</span>
            </div>
          )}
          <div className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-background ${statusStyle.dot}`} />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-medium text-foreground truncate group-hover:text-primary transition-colors">
              {displayName}
            </h3>
            <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${statusStyle.bg} ${statusStyle.text}`}>
              {formatStatus(member.status)}
            </span>
          </div>
          <p className="text-sm text-muted-foreground truncate">
            {member.primaryPositionId?.title || 'No Position'} • {member.primaryDepartmentId?.name || 'No Department'}
          </p>
        </div>

        {/* Meta */}
        <div className="hidden md:flex items-center gap-6 text-sm text-muted-foreground">
          <div>
            <p className="text-xs text-muted-foreground/70">Employee ID</p>
            <p className="font-medium">{member.employeeNumber}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground/70">Joined</p>
            <p className="font-medium">{formatDate(member.dateOfHire)}</p>
          </div>
        </div>

        {/* Action */}
        <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
          <svg className="w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </div>
    );
  }

  // Grid variant
  return (
    <div
      className="bg-card border border-border rounded-xl p-5 hover:shadow-lg hover:border-primary/30 transition-all cursor-pointer group"
      onClick={() => onViewDetails?.(member)}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="relative">
          {member.profilePictureUrl && !imageError ? (
            <img
              src={member.profilePictureUrl}
              alt={displayName}
              className="w-14 h-14 rounded-full object-cover ring-2 ring-background shadow-sm"
              onError={() => setImageError(true)}
            />
          ) : (
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary/80 to-primary flex items-center justify-center ring-2 ring-background shadow-sm">
              <span className="text-lg font-semibold text-primary-foreground">{initials}</span>
            </div>
          )}
          <div className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2 border-background ${statusStyle.dot}`} />
        </div>
        <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${statusStyle.bg} ${statusStyle.text}`}>
          {formatStatus(member.status)}
        </span>
      </div>

      {/* Name & Role */}
      <div className="mb-4">
        <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
          {displayName}
        </h3>
        <p className="text-sm text-primary/80 font-medium mt-0.5">
          {member.primaryPositionId?.title || 'No Position Assigned'}
        </p>
        <p className="text-sm text-muted-foreground">
          {member.primaryDepartmentId?.name || 'No Department'}
        </p>
      </div>

      {/* Details */}
      <div className="space-y-2 text-sm">
        <div className="flex items-center gap-2 text-muted-foreground">
          <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
          </svg>
          <span className="truncate">{member.employeeNumber}</span>
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span>Joined {formatDate(member.dateOfHire)}</span>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-4 pt-4 border-t border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          {member.workEmail && (
            <a
              href={`mailto:${member.workEmail}`}
              onClick={(e) => e.stopPropagation()}
              className="p-1.5 rounded-lg bg-muted hover:bg-primary/10 hover:text-primary transition-colors"
              title="Send email"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </a>
          )}
          {member.mobilePhone && (
            <a
              href={`tel:${member.mobilePhone}`}
              onClick={(e) => e.stopPropagation()}
              className="p-1.5 rounded-lg bg-muted hover:bg-primary/10 hover:text-primary transition-colors"
              title="Call"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
            </a>
          )}
        </div>
        <span className="text-xs text-muted-foreground group-hover:text-primary transition-colors flex items-center gap-1">
          View Profile
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </span>
      </div>
    </div>
  );
}

