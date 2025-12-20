'use client';

import { useMemo } from 'react';

// =====================================================
// Types
// =====================================================

export interface HiringStage {
  id: string;
  name: string;
  order: number;
  description?: string;
  percentage?: number;
}

interface StageStepperProps {
  stages: HiringStage[];
  currentStage: string; // Stage ID
  editable?: boolean;
  onChange?: (stageId: string) => void;
  showPercentage?: boolean;
  className?: string;
}

// =====================================================
// Default Hiring Stages
// =====================================================

export const DEFAULT_HIRING_STAGES: HiringStage[] = [
  { id: 'screening', name: 'Screening', order: 1, percentage: 20, description: 'Initial resume review' },
  { id: 'department_interview', name: 'Department Interview', order: 2, percentage: 40, description: 'Technical interview' },
  { id: 'hr_interview', name: 'HR Interview', order: 3, percentage: 60, description: 'HR fit interview' },
  { id: 'offer', name: 'Offer', order: 4, percentage: 80, description: 'Offer extended' },
  { id: 'hired', name: 'Hired', order: 5, percentage: 100, description: 'Candidate hired' },
];

// =====================================================
// Stage Step Component
// =====================================================

function StageStep({
  stage,
  isActive,
  isCompleted,
  isPending,
  isLast,
  editable,
  onClick,
  showPercentage,
}: {
  stage: HiringStage;
  isActive: boolean;
  isCompleted: boolean;
  isPending: boolean;
  isLast: boolean;
  editable: boolean;
  onClick: () => void;
  showPercentage: boolean;
}) {
  // Determine step state styling
  const getStepStyles = () => {
    if (isCompleted) {
      return {
        circle: 'bg-green-600 text-white',
        line: 'bg-green-600',
        label: 'text-green-700 font-medium',
      };
    }
    if (isActive) {
      return {
        circle: 'bg-blue-600 text-white ring-4 ring-blue-100',
        line: 'bg-slate-200',
        label: 'text-blue-700 font-semibold',
      };
    }
    return {
      circle: 'bg-slate-200 text-slate-500',
      line: 'bg-slate-200',
      label: 'text-slate-500',
    };
  };

  const styles = getStepStyles();

  return (
    <div className="flex items-center flex-1">
      {/* Step Circle & Label */}
      <div className="flex flex-col items-center relative">
        <button
          type="button"
          onClick={onClick}
          disabled={!editable}
          className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${styles.circle} ${
            editable ? 'cursor-pointer hover:opacity-90' : 'cursor-default'
          }`}
        >
          {isCompleted ? (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <span className="text-sm font-medium">{stage.order}</span>
          )}
        </button>

        {/* Stage Name */}
        <div className="mt-2 text-center w-24">
          <p className={`text-xs ${styles.label} truncate`}>{stage.name}</p>
          {showPercentage && stage.percentage !== undefined && (
            <p className="text-xs text-slate-400 mt-0.5">{stage.percentage}%</p>
          )}
        </div>
      </div>

      {/* Connector Line */}
      {!isLast && (
        <div className="flex-1 h-0.5 mx-2 -mt-6">
          <div className={`h-full transition-colors ${isCompleted ? styles.line : 'bg-slate-200'}`} />
        </div>
      )}
    </div>
  );
}

// =====================================================
// Vertical Stage Step Component
// =====================================================

function VerticalStageStep({
  stage,
  isActive,
  isCompleted,
  isLast,
  editable,
  onClick,
  showPercentage,
}: {
  stage: HiringStage;
  isActive: boolean;
  isCompleted: boolean;
  isLast: boolean;
  editable: boolean;
  onClick: () => void;
  showPercentage: boolean;
}) {
  const getStepStyles = () => {
    if (isCompleted) {
      return {
        circle: 'bg-green-600 text-white',
        line: 'bg-green-600',
        label: 'text-green-700 font-medium',
        description: 'text-green-600',
      };
    }
    if (isActive) {
      return {
        circle: 'bg-blue-600 text-white ring-4 ring-blue-100',
        line: 'bg-slate-200',
        label: 'text-blue-700 font-semibold',
        description: 'text-blue-600',
      };
    }
    return {
      circle: 'bg-slate-200 text-slate-500',
      line: 'bg-slate-200',
      label: 'text-slate-500',
      description: 'text-slate-400',
    };
  };

  const styles = getStepStyles();

  return (
    <div className="flex">
      {/* Circle and Line */}
      <div className="flex flex-col items-center">
        <button
          type="button"
          onClick={onClick}
          disabled={!editable}
          className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${styles.circle} ${
            editable ? 'cursor-pointer hover:opacity-90' : 'cursor-default'
          }`}
        >
          {isCompleted ? (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <span className="text-xs font-medium">{stage.order}</span>
          )}
        </button>

        {!isLast && (
          <div className={`w-0.5 h-12 my-1 ${isCompleted ? styles.line : 'bg-slate-200'}`} />
        )}
      </div>

      {/* Content */}
      <div className="ml-4 pb-8">
        <div className="flex items-center gap-2">
          <p className={`text-sm ${styles.label}`}>{stage.name}</p>
          {showPercentage && stage.percentage !== undefined && (
            <span className={`text-xs px-2 py-0.5 rounded-full bg-slate-100 ${styles.description}`}>
              {stage.percentage}%
            </span>
          )}
        </div>
        {stage.description && (
          <p className={`text-xs mt-0.5 ${styles.description}`}>{stage.description}</p>
        )}
      </div>
    </div>
  );
}

// =====================================================
// Progress Bar Component
// =====================================================

function ProgressBar({ percentage, label }: { percentage: number; label: string }) {
  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-slate-700">{label}</span>
        <span className="text-sm text-slate-500">{percentage}% Complete</span>
      </div>
      <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-blue-600 rounded-full transition-all duration-500"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

// =====================================================
// Main StageStepper Component
// =====================================================

export default function StageStepper({
  stages = DEFAULT_HIRING_STAGES,
  currentStage,
  editable = false,
  onChange,
  showPercentage = true,
  className = '',
}: StageStepperProps) {
  // Sort stages by order
  const sortedStages = useMemo(() => {
    return [...stages].sort((a, b) => a.order - b.order);
  }, [stages]);

  // Find current stage index
  const currentStageIndex = useMemo(() => {
    return sortedStages.findIndex((s) => s.id === currentStage);
  }, [sortedStages, currentStage]);

  // Calculate progress percentage
  const progressPercentage = useMemo(() => {
    if (currentStageIndex === -1) return 0;
    const stage = sortedStages[currentStageIndex];
    return stage.percentage ?? Math.round(((currentStageIndex + 1) / sortedStages.length) * 100);
  }, [sortedStages, currentStageIndex]);

  // Handle stage click
  const handleStageClick = (stageId: string) => {
    if (editable && onChange) {
      onChange(stageId);
    }
  };

  // Empty state
  if (!stages || stages.length === 0) {
    return (
      <div className="flex items-center justify-center py-8 text-slate-500 text-sm">
        No stages defined
      </div>
    );
  }

  return (
    <div className={className}>
      {/* Progress Bar */}
      <ProgressBar
        percentage={progressPercentage}
        label={sortedStages[currentStageIndex]?.name || 'Progress'}
      />

      {/* Horizontal Stepper (Desktop) */}
      <div className="hidden md:flex items-start justify-between">
        {sortedStages.map((stage, index) => (
          <StageStep
            key={stage.id}
            stage={stage}
            isActive={stage.id === currentStage}
            isCompleted={index < currentStageIndex}
            isPending={index > currentStageIndex}
            isLast={index === sortedStages.length - 1}
            editable={editable}
            onClick={() => handleStageClick(stage.id)}
            showPercentage={showPercentage}
          />
        ))}
      </div>

      {/* Vertical Stepper (Mobile) */}
      <div className="md:hidden">
        {sortedStages.map((stage, index) => (
          <VerticalStageStep
            key={stage.id}
            stage={stage}
            isActive={stage.id === currentStage}
            isCompleted={index < currentStageIndex}
            isLast={index === sortedStages.length - 1}
            editable={editable}
            onClick={() => handleStageClick(stage.id)}
            showPercentage={showPercentage}
          />
        ))}
      </div>
    </div>
  );
}
