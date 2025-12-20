/**
 * Leave Pattern Analyzer
 * Detects irregular leaving patterns in employees' leave history
 */

// ============================================
// INTERFACE DEFINITIONS
// ============================================

export interface LeaveRequest {
  _id: string;
  employeeId: string;
  employeeName?: string;
  leaveTypeId: string;
  leaveTypeName?: string;
  dates: {
    from: string;
    to: string;
  };
  durationDays: number;
  status: string;
  createdAt?: string;
  justification?: string;
  flaggedIrregular?: boolean;
  irregularReason?: string;
}

export interface PatternDetectionConfig {
  // Monday/Friday pattern thresholds
  mondayFridayThreshold: number; // Max occurrences per month before flagging
  mondayFridayMonthsToCheck: number; // How many months of history to analyze

  // Holiday extension thresholds
  holidayExtensionMaxPerQuarter: number; // Max extensions per quarter before flagging

  // Short notice thresholds
  shortNoticeDays: number; // Days considered "short notice"
  shortNoticeMaxPerMonth: number; // Max short notice leaves per month

  // Clustering thresholds
  clusteringWindowDays: number; // Working days window to check for clusters
  clusteringMinLeaves: number; // Min single-day leaves to be considered a cluster

  // Behavioral change thresholds
  behavioralChangeDeviationPercent: number; // Percentage increase from average to flag
}

export interface PatternAnalysisResult {
  employeeId: string;
  employeeName?: string;
  patterns: DetectedPattern[];
  overallRiskScore: number; // 0-100
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
}

export interface DetectedPattern {
  type: PatternType;
  severity: 'low' | 'medium' | 'high';
  description: string;
  occurrences: PatternOccurrence[];
  suggestion: string;
}

export interface PatternOccurrence {
  date: string;
  leaveRequestId?: string;
  details?: string;
}

export type PatternType =
  | 'monday_friday'
  | 'holiday_extension'
  | 'short_notice'
  | 'clustering'
  | 'behavioral_change'
  | 'excessive_sick_leave';

// ============================================
// DEFAULT CONFIGURATION
// ============================================

export const DEFAULT_CONFIG: PatternDetectionConfig = {
  mondayFridayThreshold: 3,
  mondayFridayMonthsToCheck: 3,
  holidayExtensionMaxPerQuarter: 2,
  shortNoticeDays: 2,
  shortNoticeMaxPerMonth: 2,
  clusteringWindowDays: 10,
  clusteringMinLeaves: 3,
  behavioralChangeDeviationPercent: 50,
};

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Check if a date is a Monday (day 1) or Friday (day 5)
 */
export function isMondayOrFriday(date: Date): boolean {
  const day = date.getDay();
  return day === 1 || day === 5;
}

/**
 * Check if a date is a Monday
 */
export function isMonday(date: Date): boolean {
  return date.getDay() === 1;
}

/**
 * Check if a date is a Friday
 */
export function isFriday(date: Date): boolean {
  return date.getDay() === 5;
}

/**
 * Get the day name from a date
 */
export function getDayName(date: Date): string {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[date.getDay()];
}

/**
 * Calculate working days between two dates (excludes weekends)
 */
export function getWorkingDaysBetween(start: Date, end: Date): number {
  let count = 0;
  const current = new Date(start);

  while (current <= end) {
    const day = current.getDay();
    if (day !== 0 && day !== 6) {
      count++;
    }
    current.setDate(current.getDate() + 1);
  }

  return count;
}

/**
 * Get the start of a month
 */
export function getMonthStart(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

/**
 * Get the start of a quarter
 */
export function getQuarterStart(date: Date): Date {
  const quarter = Math.floor(date.getMonth() / 3);
  return new Date(date.getFullYear(), quarter * 3, 1);
}

/**
 * Check if two dates are in the same month
 */
export function isSameMonth(date1: Date, date2: Date): boolean {
  return date1.getFullYear() === date2.getFullYear() && date1.getMonth() === date2.getMonth();
}

/**
 * Check if two dates are in the same quarter
 */
export function isSameQuarter(date1: Date, date2: Date): boolean {
  const q1 = Math.floor(date1.getMonth() / 3);
  const q2 = Math.floor(date2.getMonth() / 3);
  return date1.getFullYear() === date2.getFullYear() && q1 === q2;
}

/**
 * Get months ago date
 */
export function getMonthsAgo(months: number): Date {
  const date = new Date();
  date.setMonth(date.getMonth() - months);
  return date;
}

/**
 * Parse date string to Date object
 */
export function parseDate(dateStr: string): Date {
  return new Date(dateStr);
}

/**
 * Format date for display
 */
export function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

// ============================================
// PATTERN DETECTION FUNCTIONS
// ============================================

/**
 * 1. Monday/Friday Pattern Detection
 * Check if employee takes leave on Mondays or Fridays more than threshold times
 */
export function detectMondayFridayPattern(
  leaves: LeaveRequest[],
  config: PatternDetectionConfig = DEFAULT_CONFIG
): DetectedPattern | null {
  const cutoffDate = getMonthsAgo(config.mondayFridayMonthsToCheck);
  const recentLeaves = leaves.filter(
    (l) => l.status === 'approved' && new Date(l.dates.from) >= cutoffDate
  );

  const mondayFridayOccurrences: PatternOccurrence[] = [];

  recentLeaves.forEach((leave) => {
    const fromDate = new Date(leave.dates.from);
    const toDate = new Date(leave.dates.to);

    // Check each day of the leave
    const current = new Date(fromDate);
    while (current <= toDate) {
      if (isMondayOrFriday(current)) {
        mondayFridayOccurrences.push({
          date: current.toISOString().split('T')[0],
          leaveRequestId: leave._id,
          details: `${getDayName(current)} - ${leave.leaveTypeName || 'Leave'}`,
        });
      }
      current.setDate(current.getDate() + 1);
    }
  });

  // Group by month and check threshold
  const monthlyCount: Record<string, number> = {};
  mondayFridayOccurrences.forEach((occ) => {
    const monthKey = occ.date.substring(0, 7); // YYYY-MM
    monthlyCount[monthKey] = (monthlyCount[monthKey] || 0) + 1;
  });

  const monthsExceedingThreshold = Object.entries(monthlyCount).filter(
    ([, count]) => count >= config.mondayFridayThreshold
  );

  if (monthsExceedingThreshold.length > 0 || mondayFridayOccurrences.length >= config.mondayFridayThreshold * 2) {
    const totalOccurrences = mondayFridayOccurrences.length;
    const severity = totalOccurrences >= config.mondayFridayThreshold * 3 ? 'high' :
      totalOccurrences >= config.mondayFridayThreshold * 2 ? 'medium' : 'low';

    return {
      type: 'monday_friday',
      severity,
      description: `Employee has taken leave on Monday/Friday ${totalOccurrences} times in the last ${config.mondayFridayMonthsToCheck} months`,
      occurrences: mondayFridayOccurrences.slice(0, 10), // Limit to 10 for display
      suggestion: 'Review if these leaves are legitimate or indicate a pattern of extending weekends',
    };
  }

  return null;
}

/**
 * 2. Holiday Extension Detection
 * Identify leaves that extend weekends or public holidays
 */
export function detectHolidayExtensionPattern(
  leaves: LeaveRequest[],
  holidays: string[] = [],
  config: PatternDetectionConfig = DEFAULT_CONFIG
): DetectedPattern | null {
  const quarterStart = getQuarterStart(new Date());
  const recentLeaves = leaves.filter(
    (l) => l.status === 'approved' && new Date(l.dates.from) >= quarterStart
  );

  const extensionOccurrences: PatternOccurrence[] = [];

  recentLeaves.forEach((leave) => {
    const fromDate = new Date(leave.dates.from);
    const toDate = new Date(leave.dates.to);

    // Check if leave starts on Monday (extends weekend)
    if (isMonday(fromDate)) {
      const previousFriday = new Date(fromDate);
      previousFriday.setDate(previousFriday.getDate() - 3);

      extensionOccurrences.push({
        date: fromDate.toISOString().split('T')[0],
        leaveRequestId: leave._id,
        details: 'Leave starts on Monday (extends weekend)',
      });
    }

    // Check if leave ends on Friday (extends weekend)
    if (isFriday(toDate)) {
      extensionOccurrences.push({
        date: toDate.toISOString().split('T')[0],
        leaveRequestId: leave._id,
        details: 'Leave ends on Friday (extends weekend)',
      });
    }

    // Check if leave is adjacent to a holiday
    holidays.forEach((holiday) => {
      const holidayDate = new Date(holiday);
      const dayBefore = new Date(holidayDate);
      dayBefore.setDate(dayBefore.getDate() - 1);
      const dayAfter = new Date(holidayDate);
      dayAfter.setDate(dayAfter.getDate() + 1);

      if (
        (fromDate <= dayBefore && toDate >= dayBefore) ||
        (fromDate <= dayAfter && toDate >= dayAfter)
      ) {
        extensionOccurrences.push({
          date: fromDate.toISOString().split('T')[0],
          leaveRequestId: leave._id,
          details: `Leave adjacent to holiday (${formatDate(holidayDate)})`,
        });
      }
    });
  });

  if (extensionOccurrences.length > config.holidayExtensionMaxPerQuarter) {
    const severity = extensionOccurrences.length >= config.holidayExtensionMaxPerQuarter * 2 ? 'high' :
      extensionOccurrences.length > config.holidayExtensionMaxPerQuarter ? 'medium' : 'low';

    return {
      type: 'holiday_extension',
      severity,
      description: `Employee has ${extensionOccurrences.length} leave(s) extending weekends/holidays this quarter`,
      occurrences: extensionOccurrences,
      suggestion: 'Verify if leaves are pre-planned vacations or indicate a pattern of extending breaks',
    };
  }

  return null;
}

/**
 * 3. Short Notice Pattern Detection
 * Flag if multiple short-notice leaves in a month
 */
export function detectShortNoticePattern(
  leaves: LeaveRequest[],
  config: PatternDetectionConfig = DEFAULT_CONFIG
): DetectedPattern | null {
  const currentMonth = getMonthStart(new Date());
  const recentLeaves = leaves.filter(
    (l) => l.status === 'approved' && new Date(l.dates.from) >= currentMonth
  );

  const shortNoticeOccurrences: PatternOccurrence[] = [];

  recentLeaves.forEach((leave) => {
    if (!leave.createdAt) return;

    const requestDate = new Date(leave.createdAt);
    const leaveStartDate = new Date(leave.dates.from);
    const daysDiff = Math.floor(
      (leaveStartDate.getTime() - requestDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysDiff < config.shortNoticeDays) {
      shortNoticeOccurrences.push({
        date: leave.dates.from,
        leaveRequestId: leave._id,
        details: `Requested ${daysDiff} day(s) before leave (threshold: ${config.shortNoticeDays} days)`,
      });
    }
  });

  if (shortNoticeOccurrences.length > config.shortNoticeMaxPerMonth) {
    const severity = shortNoticeOccurrences.length >= config.shortNoticeMaxPerMonth * 2 ? 'high' : 'medium';

    return {
      type: 'short_notice',
      severity,
      description: `Employee has ${shortNoticeOccurrences.length} short-notice leaves this month`,
      occurrences: shortNoticeOccurrences,
      suggestion: 'Discuss the importance of advance notice with the employee',
    };
  }

  return null;
}

/**
 * 4. Clustering Detection
 * Identify multiple single-day leaves clustered together
 */
export function detectClusteringPattern(
  leaves: LeaveRequest[],
  config: PatternDetectionConfig = DEFAULT_CONFIG
): DetectedPattern | null {
  const threeMonthsAgo = getMonthsAgo(3);
  const singleDayLeaves = leaves.filter(
    (l) =>
      l.status === 'approved' &&
      l.durationDays === 1 &&
      new Date(l.dates.from) >= threeMonthsAgo
  );

  if (singleDayLeaves.length < config.clusteringMinLeaves) {
    return null;
  }

  // Sort by date
  singleDayLeaves.sort(
    (a, b) => new Date(a.dates.from).getTime() - new Date(b.dates.from).getTime()
  );

  const clusters: PatternOccurrence[][] = [];
  let currentCluster: PatternOccurrence[] = [];

  singleDayLeaves.forEach((leave, index) => {
    const leaveDate = new Date(leave.dates.from);

    if (currentCluster.length === 0) {
      currentCluster.push({
        date: leave.dates.from,
        leaveRequestId: leave._id,
        details: `${leave.leaveTypeName || 'Leave'} - ${getDayName(leaveDate)}`,
      });
    } else {
      const lastDate = new Date(currentCluster[currentCluster.length - 1].date);
      const workingDays = getWorkingDaysBetween(lastDate, leaveDate);

      if (workingDays <= config.clusteringWindowDays) {
        currentCluster.push({
          date: leave.dates.from,
          leaveRequestId: leave._id,
          details: `${leave.leaveTypeName || 'Leave'} - ${getDayName(leaveDate)}`,
        });
      } else {
        if (currentCluster.length >= config.clusteringMinLeaves) {
          clusters.push([...currentCluster]);
        }
        currentCluster = [
          {
            date: leave.dates.from,
            leaveRequestId: leave._id,
            details: `${leave.leaveTypeName || 'Leave'} - ${getDayName(leaveDate)}`,
          },
        ];
      }
    }

    // Check last cluster
    if (index === singleDayLeaves.length - 1 && currentCluster.length >= config.clusteringMinLeaves) {
      clusters.push([...currentCluster]);
    }
  });

  if (clusters.length > 0) {
    const allOccurrences = clusters.flat();

    // Check if many are on Monday/Friday (more suspicious)
    const mondayFridayCount = allOccurrences.filter((occ) =>
      isMondayOrFriday(new Date(occ.date))
    ).length;

    const severity = mondayFridayCount >= allOccurrences.length / 2 ? 'high' :
      clusters.length > 1 ? 'medium' : 'low';

    return {
      type: 'clustering',
      severity,
      description: `Found ${clusters.length} cluster(s) of single-day leaves (${allOccurrences.length} total)`,
      occurrences: allOccurrences,
      suggestion: 'Review if clustered single-day leaves indicate avoidance of continuous leave documentation',
    };
  }

  return null;
}

/**
 * 5. Behavioral Change Detection
 * Compare current month's leave pattern with historical average
 */
export function detectBehavioralChange(
  leaves: LeaveRequest[],
  config: PatternDetectionConfig = DEFAULT_CONFIG
): DetectedPattern | null {
  const sixMonthsAgo = getMonthsAgo(6);
  const currentMonthStart = getMonthStart(new Date());

  const approvedLeaves = leaves.filter((l) => l.status === 'approved');

  // Calculate historical average (excluding current month)
  const historicalLeaves = approvedLeaves.filter((l) => {
    const leaveDate = new Date(l.dates.from);
    return leaveDate >= sixMonthsAgo && leaveDate < currentMonthStart;
  });

  // Group by month
  const monthlyDays: Record<string, number> = {};
  historicalLeaves.forEach((leave) => {
    const monthKey = leave.dates.from.substring(0, 7);
    monthlyDays[monthKey] = (monthlyDays[monthKey] || 0) + leave.durationDays;
  });

  const monthCounts = Object.values(monthlyDays);
  if (monthCounts.length < 3) {
    return null; // Not enough history
  }

  const averageDaysPerMonth =
    monthCounts.reduce((sum, days) => sum + days, 0) / monthCounts.length;

  // Current month leaves
  const currentMonthLeaves = approvedLeaves.filter((l) =>
    isSameMonth(new Date(l.dates.from), new Date())
  );
  const currentMonthDays = currentMonthLeaves.reduce(
    (sum, l) => sum + l.durationDays,
    0
  );

  const increasePercent =
    averageDaysPerMonth > 0
      ? ((currentMonthDays - averageDaysPerMonth) / averageDaysPerMonth) * 100
      : currentMonthDays > 0
      ? 100
      : 0;

  if (increasePercent >= config.behavioralChangeDeviationPercent) {
    const severity = increasePercent >= 100 ? 'high' : increasePercent >= 75 ? 'medium' : 'low';

    return {
      type: 'behavioral_change',
      severity,
      description: `Leave usage increased by ${Math.round(increasePercent)}% compared to average (${currentMonthDays} days vs ${averageDaysPerMonth.toFixed(1)} avg)`,
      occurrences: currentMonthLeaves.map((l) => ({
        date: l.dates.from,
        leaveRequestId: l._id,
        details: `${l.durationDays} day(s) - ${l.leaveTypeName || 'Leave'}`,
      })),
      suggestion: 'Check in with employee to understand if there are underlying issues',
    };
  }

  return null;
}

/**
 * 6. Excessive Sick Leave Detection (Additional)
 * Detect if sick leave usage is unusually high
 */
export function detectExcessiveSickLeave(
  leaves: LeaveRequest[],
  thresholdDaysPerMonth: number = 3
): DetectedPattern | null {
  const threeMonthsAgo = getMonthsAgo(3);

  const sickLeaves = leaves.filter(
    (l) =>
      l.status === 'approved' &&
      (l.leaveTypeName?.toLowerCase().includes('sick') || false) &&
      new Date(l.dates.from) >= threeMonthsAgo
  );

  if (sickLeaves.length === 0) return null;

  const totalSickDays = sickLeaves.reduce((sum, l) => sum + l.durationDays, 0);
  const avgPerMonth = totalSickDays / 3;

  if (avgPerMonth > thresholdDaysPerMonth) {
    const severity = avgPerMonth >= thresholdDaysPerMonth * 2 ? 'high' : 'medium';

    return {
      type: 'excessive_sick_leave',
      severity,
      description: `Average ${avgPerMonth.toFixed(1)} sick days per month (threshold: ${thresholdDaysPerMonth})`,
      occurrences: sickLeaves.map((l) => ({
        date: l.dates.from,
        leaveRequestId: l._id,
        details: `${l.durationDays} day(s) sick leave`,
      })),
      suggestion: 'Consider discussing employee wellbeing or requesting medical documentation',
    };
  }

  return null;
}

// ============================================
// MAIN ANALYSIS FUNCTION
// ============================================

/**
 * Analyze all leave patterns for an employee
 */
export function analyzeLeavePatterns(
  leaves: LeaveRequest[],
  employeeId: string,
  employeeName?: string,
  holidays: string[] = [],
  config: PatternDetectionConfig = DEFAULT_CONFIG
): PatternAnalysisResult {
  const patterns: DetectedPattern[] = [];

  // Run all pattern detections
  const mondayFriday = detectMondayFridayPattern(leaves, config);
  if (mondayFriday) patterns.push(mondayFriday);

  const holidayExtension = detectHolidayExtensionPattern(leaves, holidays, config);
  if (holidayExtension) patterns.push(holidayExtension);

  const shortNotice = detectShortNoticePattern(leaves, config);
  if (shortNotice) patterns.push(shortNotice);

  const clustering = detectClusteringPattern(leaves, config);
  if (clustering) patterns.push(clustering);

  const behavioralChange = detectBehavioralChange(leaves, config);
  if (behavioralChange) patterns.push(behavioralChange);

  const excessiveSick = detectExcessiveSickLeave(leaves);
  if (excessiveSick) patterns.push(excessiveSick);

  // Calculate overall risk score
  let riskScore = 0;
  patterns.forEach((pattern) => {
    switch (pattern.severity) {
      case 'high':
        riskScore += 30;
        break;
      case 'medium':
        riskScore += 20;
        break;
      case 'low':
        riskScore += 10;
        break;
    }
  });

  // Cap at 100
  riskScore = Math.min(riskScore, 100);

  // Determine risk level
  let riskLevel: 'low' | 'medium' | 'high' | 'critical';
  if (riskScore >= 70) {
    riskLevel = 'critical';
  } else if (riskScore >= 50) {
    riskLevel = 'high';
  } else if (riskScore >= 25) {
    riskLevel = 'medium';
  } else {
    riskLevel = 'low';
  }

  return {
    employeeId,
    employeeName,
    patterns,
    overallRiskScore: riskScore,
    riskLevel,
  };
}

/**
 * Analyze patterns for multiple employees
 */
export function analyzeTeamLeavePatterns(
  leavesByEmployee: Map<string, { leaves: LeaveRequest[]; employeeName?: string }>,
  holidays: string[] = [],
  config: PatternDetectionConfig = DEFAULT_CONFIG
): PatternAnalysisResult[] {
  const results: PatternAnalysisResult[] = [];

  leavesByEmployee.forEach((data, employeeId) => {
    const result = analyzeLeavePatterns(
      data.leaves,
      employeeId,
      data.employeeName,
      holidays,
      config
    );

    // Only include if there are patterns detected
    if (result.patterns.length > 0) {
      results.push(result);
    }
  });

  // Sort by risk score (highest first)
  results.sort((a, b) => b.overallRiskScore - a.overallRiskScore);

  return results;
}

// ============================================
// UTILITY FUNCTIONS FOR UI
// ============================================

/**
 * Get color for risk level
 */
export function getRiskLevelColor(level: 'low' | 'medium' | 'high' | 'critical'): {
  bg: string;
  text: string;
  border: string;
} {
  switch (level) {
    case 'critical':
      return { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-300' };
    case 'high':
      return { bg: 'bg-orange-100', text: 'text-orange-800', border: 'border-orange-300' };
    case 'medium':
      return { bg: 'bg-amber-100', text: 'text-amber-800', border: 'border-amber-300' };
    case 'low':
      return { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-300' };
    default:
      return { bg: 'bg-gray-100', text: 'text-gray-800', border: 'border-gray-300' };
  }
}

/**
 * Get icon for pattern type
 */
export function getPatternTypeIcon(type: PatternType): string {
  switch (type) {
    case 'monday_friday':
      return '📅';
    case 'holiday_extension':
      return '🏖️';
    case 'short_notice':
      return '⚡';
    case 'clustering':
      return '🔗';
    case 'behavioral_change':
      return '📈';
    case 'excessive_sick_leave':
      return '🏥';
    default:
      return '⚠️';
  }
}

/**
 * Get human-readable name for pattern type
 */
export function getPatternTypeName(type: PatternType): string {
  switch (type) {
    case 'monday_friday':
      return 'Monday/Friday Pattern';
    case 'holiday_extension':
      return 'Holiday Extension';
    case 'short_notice':
      return 'Short Notice';
    case 'clustering':
      return 'Leave Clustering';
    case 'behavioral_change':
      return 'Behavioral Change';
    case 'excessive_sick_leave':
      return 'Excessive Sick Leave';
    default:
      return 'Unknown Pattern';
  }
}

