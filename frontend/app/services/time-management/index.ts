import apiService from '../api';

// Types matching backend DTOs
export interface PunchInRequest {
    employeeId: string;
    time?: Date | string; // Optional: format dd/mm/yyyy hh:mm or ISO string
    source?: string; // Optional: source identifier (e.g., 'web-app')
}

export interface PunchOutRequest {
    employeeId: string;
    time?: Date | string; // Optional: format dd/mm/yyyy hh:mm or ISO string
    source?: string; // Optional: source identifier (e.g., 'web-app')
}

// ShiftType interfaces
export interface ShiftType {
    _id: string;
    name: string;
    active: boolean;
}

export interface CreateShiftTypeDto {
    name: string;
    active?: boolean;
}

export interface UpdateShiftTypeDto {
    name?: string;
    active?: boolean;
}

// Shift interfaces
export enum PunchPolicy {
    MULTIPLE = 'MULTIPLE',
    FIRST_LAST = 'FIRST_LAST',
    ONLY_FIRST = 'ONLY_FIRST',
}

export interface Shift {
    _id: string;
    name: string;
    shiftType: string | ShiftType;
    startTime: string;
    endTime: string;
    punchPolicy: PunchPolicy;
    graceInMinutes: number;
    graceOutMinutes: number;
    requiresApprovalForOvertime: boolean;
    active: boolean;
}

export interface CreateShiftDto {
    name: string;
    shiftType: string;
    startTime: string;
    endTime: string;
    punchPolicy?: PunchPolicy;
    graceInMinutes?: number;
    graceOutMinutes?: number;
    requiresApprovalForOvertime?: boolean;
    active?: boolean;
}

export interface UpdateShiftDto {
    name?: string;
    shiftType?: string;
    startTime?: string;
    endTime?: string;
    punchPolicy?: PunchPolicy;
    graceInMinutes?: number;
    graceOutMinutes?: number;
    requiresApprovalForOvertime?: boolean;
    active?: boolean;
}

// Schedule Rule interfaces
export interface ScheduleRule {
    _id: string;
    name: string;
    pattern: string;
    active: boolean;
}

export interface CreateScheduleRuleDto {
    name: string;
    pattern: string;
    active?: boolean;
}

export interface UpdateScheduleRuleDto {
    name?: string;
    pattern?: string;
    active?: boolean;
}

// Overtime Rule interfaces
export interface OvertimeRule {
    _id: string;
    name: string;
    description?: string;
    active: boolean;
    approved: boolean;
}

export interface CreateOvertimeRuleDto {
    name: string;
    description?: string;
    active?: boolean;
    approved?: boolean;
}

export interface UpdateOvertimeRuleDto {
    name?: string;
    description?: string;
    active?: boolean;
    approved?: boolean;
}

// Short-time Rule interfaces
export interface ShortTimeRule {
    _id: string;
    name: string;
    description?: string;
    requiresPreApproval: boolean;
    ignoreWeekends: boolean;
    ignoreHolidays: boolean;
    minShortMinutes: number;
    active: boolean;
    approved: boolean;
}

export interface CreateShortTimeRuleDto {
    name: string;
    description?: string;
    requiresPreApproval?: boolean;
    ignoreWeekends?: boolean;
    ignoreHolidays?: boolean;
    minShortMinutes?: number;
    active?: boolean;
    approved?: boolean;
}

export interface UpdateShortTimeRuleDto {
    name?: string;
    description?: string;
    requiresPreApproval?: boolean;
    ignoreWeekends?: boolean;
    ignoreHolidays?: boolean;
    minShortMinutes?: number;
    active?: boolean;
    approved?: boolean;
}

// Lateness Rule interfaces
export interface LatenessRule {
    _id: string;
    name: string;
    description?: string;
    gracePeriodMinutes: number;
    deductionForEachMinute: number;
    active: boolean;
}

export interface CreateLatenessRuleDto {
    name: string;
    description?: string;
    gracePeriodMinutes?: number;
    deductionForEachMinute?: number;
    active?: boolean;
}

export interface UpdateLatenessRuleDto {
    name?: string;
    description?: string;
    gracePeriodMinutes?: number;
    deductionForEachMinute?: number;
    active?: boolean;
}

// Attendance Record interfaces
export enum PunchType {
    IN = 'IN',
    OUT = 'OUT',
}

export enum CorrectionRequestStatus {
    SUBMITTED = 'SUBMITTED',
    IN_REVIEW = 'IN_REVIEW',
    APPROVED = 'APPROVED',
    REJECTED = 'REJECTED',
    ESCALATED = 'ESCALATED',
}

export interface Punch {
    type: PunchType;
    time: string;
}

export interface AttendanceRecord {
    _id: string;
    employeeId: string;
    punches: Punch[];
    totalWorkMinutes: number;
    hasMissedPunch: boolean;
    exceptionIds: string[];
    finalisedForPayroll: boolean;
    createdAt?: string;
    updatedAt?: string;
}

export interface AttendanceCorrectionRequest {
    _id: string;
    employeeId: string;
    attendanceRecord: string | AttendanceRecord;
    reason?: string;
    status: CorrectionRequestStatus;
    createdAt?: string;
    updatedAt?: string;
}

export interface CorrectAttendanceDto {
    attendanceRecordId: string;
    correctedPunches?: Array<{ type: PunchType; time: string }>;
    addPunchIn?: string;
    addPunchOut?: string;
    removePunchIndex?: number;
    correctionReason: string;
    correctedBy?: string;
}

export interface CreateAttendanceRecordDto {
    employeeId: string;
    punches: Array<{ type: PunchType; time: string | Date }>;
    createdBy?: string;
    reason?: string;
}

export interface RequestCorrectionDto {
    employeeId: string;
    attendanceRecordId: string;
    reason: string;
    correctedPunchDate?: string;
    correctedPunchLocalTime?: string;
}

export interface ReviewCorrectionDto {
    correctionRequestId: string;
    reviewerId: string;
    action: 'APPROVE' | 'REJECT';
    note?: string;
}

export interface BulkReviewAttendanceDto {
    employeeId: string;
    startDate: string;
    endDate: string;
    filterByIssue?: 'ALL' | 'MISSING_PUNCH' | 'INVALID_SEQUENCE' | 'SHORT_TIME';
}

// Shift Assignment Status enum
export enum ShiftAssignmentStatus {
    PENDING = 'PENDING',
    APPROVED = 'APPROVED',
    CANCELLED = 'CANCELLED',
    EXPIRED = 'EXPIRED',
}

// Break Permission interfaces
export interface BreakPermission {
    _id: string;
    employeeId: string;
    attendanceRecordId: string;
    startTime: string;
    endTime: string;
    duration: number;
    reason: string;
    status: 'PENDING' | 'APPROVED' | 'REJECTED';
    createdAt?: string;
    updatedAt?: string;
}

export interface BreakPermissionDto {
    employeeId: string;
    attendanceRecordId: string;
    startTime: Date | string;
    endTime: Date | string;
    reason: string;
}

export interface ApproveBreakPermissionDto {
    approvedBy: string;
}

export interface RejectBreakPermissionDto {
    rejectionReason: string;
}

export interface PermissionLimitDto {
    maxMinutes: number;
    setBy?: string;
}

// Holiday Type enum
export enum HolidayType {
    NATIONAL = 'NATIONAL',
    ORGANIZATIONAL = 'ORGANIZATIONAL',
    WEEKLY_REST = 'WEEKLY_REST',
}

// Holiday interfaces
export interface Holiday {
    _id?: string;
    type: HolidayType;
    startDate: string | Date;
    endDate?: string | Date;
    name?: string;
    active: boolean;
    createdAt?: string;
    updatedAt?: string;
}

export interface CreateHolidayDto {
    type: HolidayType;
    startDate: string | Date;
    endDate?: string | Date;
    name?: string;
    active?: boolean;
}

export interface UpdateHolidayDto {
    type?: HolidayType;
    startDate?: string | Date;
    endDate?: string | Date;
    name?: string;
    active?: boolean;
}

// Shift Assignment interfaces
export interface ShiftAssignment {
    _id: string;
    employeeId?: string;
    departmentId?: string;
    positionId?: string;
    shiftId: string;
    scheduleRuleId?: string;
    startDate: string;
    endDate?: string;
    status: ShiftAssignmentStatus;
    createdAt?: string;
    updatedAt?: string;
}

export interface AssignShiftDto {
    employeeId?: string;
    departmentId?: string;
    positionId?: string;
    shiftId: string;
    scheduleRuleId?: string;
    startDate: string;
    endDate?: string;
    status?: ShiftAssignmentStatus;
    createdBy?: string;
}

export interface RenewAssignmentDto {
    startDate?: string;
    endDate?: string;
    scheduleRuleId?: string;
    status?: ShiftAssignmentStatus;
}

export interface UpdateShiftAssignmentStatusDto {
    status: ShiftAssignmentStatus;
    reason?: string;
    updatedBy?: string;
}

// Break Permission interfaces
export interface BreakPermission {
    _id: string;
    employeeId: string;
    attendanceRecordId: string;
    startTime: string;
    endTime: string;
    duration: number;
    reason: string;
    status: 'PENDING' | 'APPROVED' | 'REJECTED';
    createdAt?: string;
    updatedAt?: string;
}


export const timeManagementService = {
    // ============================================================
    // ATTENDANCE / PUNCH OPERATIONS
    // ============================================================

    // Punch In - POST /attendance/punch-in
    punchIn: async (data: PunchInRequest) => {
        return apiService.post('/attendance/punch-in', data);
    },

    // Punch Out - POST /attendance/punch-out
    punchOut: async (data: PunchOutRequest) => {
        return apiService.post('/attendance/punch-out', data);
    },

    // Get today's attendance record - GET /attendance/today/:employeeId
    getTodayRecord: async (employeeId: string) => {
        return apiService.get(`/attendance/today/${employeeId}`);
    },

    // Submit correction request - POST /attendance-correction/request
    requestCorrection: async (data: any) => {
        return apiService.post('/attendance-correction/request', data);
    },

    // Get employee's corrections - GET /attendance-correction/:employeeId
    getEmployeeCorrections: async (employeeId: string) => {
        return apiService.get<AttendanceCorrectionRequest[]>(`/attendance-correction/${employeeId}`);
    },

    // Get all corrections (manager) - GET /attendance-correction/all
    getAllCorrections: async () => {
        return apiService.get('/attendance-correction/all');
    },

    // Get pending corrections (manager) - GET /attendance-correction/pending
    getPendingCorrections: async () => {
        return apiService.get('/attendance-correction/pending');
    },

    // Start reviewing correction (mark as IN_REVIEW) - POST /attendance-correction/start-review
    startReview: async (correctionRequestId: string) => {
        return apiService.post('/attendance-correction/start-review', { correctionRequestId });
    },

    // Review correction (approve/reject) - PUT /attendance-correction/review
    reviewCorrection: async (data: { correctionRequestId: string; action: 'APPROVE' | 'REJECT'; reviewerId: string; note?: string }) => {
        return apiService.put('/attendance-correction/review', data);
    },


    // ============================================================
    // SHIFT TYPE OPERATIONS
    // ============================================================

    // Create shift type - POST /time-management/shift-types
    createShiftType: async (data: CreateShiftTypeDto) => {
        return apiService.post<ShiftType>('/time-management/shift-types', data);
    },

    // Get all shift types - GET /time-management/shift-types
    getShiftTypes: async () => {
        return apiService.get<ShiftType[]>('/time-management/shift-types');
    },

    // Update shift type - PATCH /time-management/shift-types/:id
    updateShiftType: async (id: string, data: UpdateShiftTypeDto) => {
        return apiService.patch<ShiftType>(`/time-management/shift-types/${id}`, data);
    },

    // Deactivate shift type - DELETE /time-management/shift-types/:id
    deactivateShiftType: async (id: string) => {
        return apiService.delete(`/time-management/shift-types/${id}`);
    },

    // ============================================================
    // SHIFT OPERATIONS
    // ============================================================

    // Create shift - POST /time-management/shifts
    createShift: async (data: CreateShiftDto) => {
        return apiService.post<Shift>('/time-management/shifts', data);
    },

    // Get all shifts - GET /time-management/shifts
    getShifts: async () => {
        return apiService.get<Shift[]>('/time-management/shifts');
    },

    // Update shift - PATCH /time-management/shifts/:id
    updateShift: async (id: string, data: UpdateShiftDto) => {
        return apiService.patch<Shift>(`/time-management/shifts/${id}`, data);
    },

    // Deactivate shift - DELETE /time-management/shifts/:id
    deactivateShift: async (id: string) => {
        return apiService.delete(`/time-management/shifts/${id}`);
    },

    // ============================================================
    // SCHEDULE RULE OPERATIONS
    // ============================================================

    // Create schedule rule - POST /time-management/schedule-rules
    createScheduleRule: async (data: CreateScheduleRuleDto) => {
        return apiService.post<ScheduleRule>('/time-management/schedule-rules', data);
    },

    // Get all schedule rules - GET /time-management/schedule-rules
    getScheduleRules: async () => {
        return apiService.get<ScheduleRule[]>('/time-management/schedule-rules');
    },

    // Update schedule rule - PATCH /time-management/schedule-rules/:id
    updateScheduleRule: async (id: string, data: UpdateScheduleRuleDto) => {
        return apiService.patch<ScheduleRule>(`/time-management/schedule-rules/${id}`, data);
    },

    // Deactivate schedule rule - DELETE /time-management/schedule-rules/:id
    deactivateScheduleRule: async (id: string) => {
        return apiService.delete(`/time-management/schedule-rules/${id}`);
    },

    // ============================================================
    // OVERTIME RULE OPERATIONS
    // ============================================================

    // Create overtime rule - POST /time-management/overtime-rules
    createOvertimeRule: async (data: CreateOvertimeRuleDto) => {
        return apiService.post<OvertimeRule>('/time-management/overtime-rules', data);
    },

    // Get all overtime rules - GET /time-management/overtime-rules
    getOvertimeRules: async () => {
        return apiService.get<OvertimeRule[]>('/time-management/overtime-rules');
    },

    // Update overtime rule - PATCH /time-management/overtime-rules/:id
    updateOvertimeRule: async (id: string, data: UpdateOvertimeRuleDto) => {
        return apiService.patch<OvertimeRule>(`/time-management/overtime-rules/${id}`, data);
    },

    // Approve overtime rule - POST /time-management/overtime-rules/:id/approve
    approveOvertimeRule: async (id: string) => {
        return apiService.post<OvertimeRule>(`/time-management/overtime-rules/${id}/approve`);
    },

    // ============================================================
    // SHORT-TIME RULE OPERATIONS
    // ============================================================

    // Create short-time rule - POST /time-management/short-time-rules
    createShortTimeRule: async (data: CreateShortTimeRuleDto) => {
        return apiService.post<ShortTimeRule>('/time-management/short-time-rules', data);
    },

    // Get all short-time rules - GET /time-management/short-time-rules
    getShortTimeRules: async () => {
        return apiService.get<ShortTimeRule[]>('/time-management/short-time-rules');
    },

    // Update short-time rule - PATCH /time-management/short-time-rules/:id
    updateShortTimeRule: async (id: string, data: UpdateShortTimeRuleDto) => {
        return apiService.patch<ShortTimeRule>(`/time-management/short-time-rules/${id}`, data);
    },

    // Approve short-time rule - POST /time-management/short-time-rules/:id/approve
    approveShortTimeRule: async (id: string) => {
        return apiService.post<ShortTimeRule>(`/time-management/short-time-rules/${id}/approve`);
    },

    // ============================================================
    // LATENESS RULE OPERATIONS
    // ============================================================

    // Create lateness rule - POST /time-management/lateness-rules
    createLatenessRule: async (data: CreateLatenessRuleDto) => {
        return apiService.post<LatenessRule>('/time-management/lateness-rules', data);
    },

    // Get all lateness rules - GET /time-management/lateness-rules
    getLatenessRules: async () => {
        return apiService.get<LatenessRule[]>('/time-management/lateness-rules');
    },

    // Update lateness rule - PATCH /time-management/lateness-rules/:id
    updateLatenessRule: async (id: string, data: UpdateLatenessRuleDto) => {
        return apiService.patch<LatenessRule>(`/time-management/lateness-rules/${id}`, data);
    },

    // Delete lateness rule - DELETE /time-management/lateness-rules/:id
    deleteLatenessRule: async (id: string) => {
        return apiService.delete<LatenessRule>(`/time-management/lateness-rules/${id}`);
    },

    // ============================================================
    // ATTENDANCE RECORD OPERATIONS
    // ============================================================

    // Get monthly attendance - GET /attendance/month/:employeeId?month=X&year=Y
    getMonthlyAttendance: async (employeeId: string, month: number, year: number) => {
        return apiService.get<AttendanceRecord[]>(`/attendance/month/${employeeId}?month=${month}&year=${year}`);
    },

    // Get payroll-ready attendance - GET /attendance/payroll?month=X&year=Y
    getPayrollAttendance: async (month: number, year: number) => {
        return apiService.get<AttendanceRecord[]>(`/attendance/payroll?month=${month}&year=${year}`);
    },

    // Update attendance record - PUT /attendance/:id
    updateAttendanceRecord: async (id: string, data: any) => {
        return apiService.put(`/attendance/${id}`, data);
    },

    // Review attendance record - POST /attendance/review/:recordId
    reviewAttendanceRecord: async (recordId: string) => {
        return apiService.post(`/attendance/review/${recordId}`);
    },

    // Correct attendance record - POST /attendance/correct
    correctAttendanceRecord: async (data: CorrectAttendanceDto) => {
        return apiService.post('/attendance/correct', data);
    },

    // Create attendance record (Department Head) - POST /attendance/create
    createAttendanceRecord: async (data: CreateAttendanceRecordDto) => {
        return apiService.post('/attendance/create', data);
    },

    // Bulk review attendance - POST /attendance/review/bulk
    bulkReviewAttendance: async (data: BulkReviewAttendanceDto) => {
        return apiService.post('/attendance/review/bulk', data);
    },

    // ============================================================
    // ATTENDANCE CORRECTION REQUEST OPERATIONS
    // ============================================================

    // Request correction (employee) - POST /attendance-correction/request
    requestAttendanceCorrection: async (data: RequestCorrectionDto) => {
        return apiService.post<AttendanceCorrectionRequest>('/attendance-correction/request', data);
    },

    // Review correction (manager) - PUT /attendance-correction/review
    reviewCorrectionRequest: async (data: ReviewCorrectionDto) => {
        return apiService.put('/attendance-correction/review', data);
    },


    // ============================================================
    // SHIFT ASSIGNMENT OPERATIONS
    // ============================================================

    // Assign shift - POST /time-management/assignments
    assignShift: async (data: AssignShiftDto) => {
        return apiService.post<ShiftAssignment>('/time-management/assignments', data);
    },

    // Get all assignments - GET /time-management/assignments
    getAllAssignments: async () => {
        return apiService.get<ShiftAssignment[]>('/time-management/assignments');
    },

    // Get assignments for employee - GET /time-management/assignments/employee/:employeeId
    getAssignmentsForEmployee: async (employeeId: string) => {
        return apiService.get<ShiftAssignment[]>(`/time-management/assignments/employee/${employeeId}`);
    },

    // Renew assignment - PATCH /time-management/assignments/:id
    renewAssignment: async (id: string, data: RenewAssignmentDto) => {
        return apiService.patch<ShiftAssignment>(`/time-management/assignments/${id}`, data);
    },

    // Expire assignment - DELETE /time-management/assignments/:id
    expireAssignment: async (id: string) => {
        return apiService.delete<void>(`/time-management/assignments/${id}`);
    },

    // Update assignment status - PATCH /time-management/assignments/:id/status
    updateAssignmentStatus: async (id: string, data: UpdateShiftAssignmentStatusDto) => {
        return apiService.patch<ShiftAssignment>(`/time-management/assignments/${id}/status`, data);
    },

    // Get shift expiry notifications - GET /notifications/user/:userId (for shift assignments)
    getShiftExpiryNotifications: async (userId: string) => {
        return apiService.get<any[]>(`/notifications/user/${userId}`);
    },

    // Get expiring assignments for employee (utility function - calculates locally)
    getExpiringAssignmentsForEmployee: async (employeeId: string, thresholdDays: number = 7) => {
        try {
            const assignments = await timeManagementService.getAssignmentsForEmployee(employeeId);
            const assignmentList = Array.isArray(assignments.data) ? assignments.data : [];

            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const expiring = assignmentList.filter((assignment: ShiftAssignment) => {
                // Only check approved assignments with end dates
                if (assignment.status !== ShiftAssignmentStatus.APPROVED || !assignment.endDate) {
                    return false;
                }

                const endDate = new Date(assignment.endDate);
                endDate.setHours(0, 0, 0, 0);

                // Calculate days until expiry
                const timeDiff = endDate.getTime() - today.getTime();
                const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));

                // Return true if assignment expires within threshold and hasn't expired yet
                return daysDiff <= thresholdDays && daysDiff >= 0;
            });

            return {
                data: expiring,
                error: null,
            };
        } catch (err) {
            return {
                data: [],
                error: err instanceof Error ? err.message : 'Failed to fetch expiring assignments',
            };
        }
    },

    // ============================================================
    // BREAK PERMISSION OPERATIONS
    // ============================================================

    // Create break permission - POST /break-permissions
    createBreakPermission: async (data: {
        employeeId: string;
        attendanceRecordId: string;
        startTime: Date | string;
        endTime: Date | string;
        reason: string;
    }) => {
        return apiService.post('/break-permissions', data);
    },

    // Get all break permissions (with optional filters) - GET /break-permissions
    getAllBreakPermissions: async (employeeId?: string, status?: string) => {
        const params = new URLSearchParams();
        if (employeeId) params.append('employeeId', employeeId);
        if (status) params.append('status', status);
        const query = params.toString();
        return apiService.get(`/break-permissions${query ? `?${query}` : ''}`);
    },

    // Get break permissions for specific employee - GET /break-permissions/employee/:employeeId
    getEmployeeBreakPermissions: async (employeeId: string) => {
        return apiService.get(`/break-permissions/employee/${employeeId}`);
    },

    // Approve break permission - POST /break-permissions/:permissionId/approve
    approveBreakPermission: async (permissionId: string, approvedBy: string) => {
        return apiService.post(`/break-permissions/${permissionId}/approve`, { approvedBy });
    },

    // Reject break permission - POST /break-permissions/:permissionId/reject
    rejectBreakPermission: async (permissionId: string, rejectionReason: string) => {
        return apiService.post(`/break-permissions/${permissionId}/reject`, { rejectionReason });
    },

    // Delete break permission - DELETE /break-permissions/:employeeId/:permissionId
    deleteBreakPermission: async (employeeId: string, permissionId: string) => {
        return apiService.delete(`/break-permissions/${employeeId}/${permissionId}`);
    },

    // Get approved break minutes - GET /break-permissions/attendance/:attendanceRecordId/approved-minutes
    getApprovedBreakMinutes: async (attendanceRecordId: string) => {
        return apiService.get(`/break-permissions/attendance/${attendanceRecordId}/approved-minutes`);
    },

    // Get permission limit - GET /break-permissions/limit
    getPermissionLimit: async () => {
        return apiService.get('/break-permissions/limit');
    },

    // Set permission limit - POST /break-permissions/limit
    setPermissionLimit: async (maxMinutes: number, setBy?: string) => {
        return apiService.post('/break-permissions/limit', { maxMinutes, setBy });
    },

    // ============================================================
    // HOLIDAY OPERATIONS
    // ============================================================

    // Get all holidays - GET /holidays
    getAllHolidays: async () => {
        return apiService.get<Holiday[]>('/holidays');
    },

    // Get holiday by ID - GET /holidays/:id
    getHolidayById: async (id: string) => {
        return apiService.get<Holiday>(`/holidays/${id}`);
    },

    // Check if date is holiday - GET /holidays/check?date=YYYY-MM-DD
    checkIfHoliday: async (date: string | Date) => {
        const dateStr = typeof date === 'string' ? date : date.toISOString().split('T')[0];
        return apiService.get<{ isHoliday: boolean; holiday: Holiday | null }>(`/holidays/check?date=${dateStr}`);
    },

    // Create holiday - POST /holidays
    createHoliday: async (data: CreateHolidayDto) => {
        return apiService.post<Holiday>('/holidays', data);
    },

    // Update holiday - PUT /holidays/:id
    updateHoliday: async (id: string, data: UpdateHolidayDto) => {
        return apiService.put<Holiday>(`/holidays/${id}`, data);
    },

    // Delete holiday - DELETE /holidays/:id
    deleteHoliday: async (id: string) => {
        return apiService.delete<{ ok: boolean }>(`/holidays/${id}`);
    },



    // Get break permission max limit - GET /break-permissions/limit
    getBreakPermissionLimit: async () => {
        return apiService.get('/break-permissions/limit');
    },

    // ============================================================
    // TIME EXCEPTION OPERATIONS
    // ============================================================

    // Create time exception - POST /time-exceptions
    createTimeException: async (data: {
        employeeId: string;
        attendanceRecordId: string;
        type: string; // MISSED_PUNCH, LATE, EARLY_LEAVE, SHORT_TIME, OVERTIME_REQUEST, MANUAL_ADJUSTMENT
        reason: string;
        assignedTo?: string;
    }) => {
        return apiService.post('/time-exceptions', data);
    },

    // Get all time exceptions - GET /time-exceptions
    getAllTimeExceptions: async () => {
        return apiService.get('/time-exceptions');
    },

    // Get single time exception - GET /time-exceptions/:id
    getTimeException: async (id: string) => {
        return apiService.get(`/time-exceptions/${id}`);
    },

    // Update time exception status - PUT /time-exceptions/status
    updateTimeExceptionStatus: async (data: {
        exceptionId: string;
        status: string; // OPEN, PENDING, APPROVED, REJECTED, ESCALATED, RESOLVED
        comment?: string;
    }) => {
        return apiService.put('/time-exceptions/status', data);
    },

    // Assign time exception - PUT /time-exceptions/assign
    assignTimeException: async (data: {
        exceptionId: string;
        assigneeId: string;
    }) => {
        return apiService.put('/time-exceptions/assign', data);
    },

    // List time exceptions with filters - GET /time-exceptions?status=X&type=Y
    listTimeExceptions: async (filters?: {
        status?: string;
        type?: string;
        employeeId?: string;
        assignedTo?: string;
    }) => {
        let query = '';
        if (filters) {
            const params = new URLSearchParams();
            if (filters.status) params.set('status', filters.status);
            if (filters.type) params.set('type', filters.type);
            if (filters.employeeId) params.set('employeeId', filters.employeeId);
            if (filters.assignedTo) params.set('assignedTo', filters.assignedTo);
            query = `?${params.toString()}`;
        }
        return apiService.get(`/time-exceptions${query}`);
    },

    // Export time exceptions to CSV - GET /time-exceptions/export/csv
    exportTimeExceptionsCSV: async () => {
        return apiService.get('/time-exceptions/export/csv');
    },

    // Export time exceptions to JSON - GET /time-exceptions/export/json
    exportTimeExceptionsJSON: async () => {
        return apiService.get('/time-exceptions/export/json');
    },

    // ============================================================
    // REPEATED LATENESS TRACKING (Disciplinary)
    // ============================================================

    // Get repeated lateness count for an employee - GET /time-management/repeated-lateness/:employeeId/count
    getRepeatedLatenessCount: async (employeeId: string) => {
        return apiService.get(`/time-management/repeated-lateness/${employeeId}/count`);
    },

    // Evaluate and escalate repeated lateness - POST /time-management/repeated-lateness/:employeeId/evaluate
    evaluateRepeatedLateness: async (
        employeeId: string,
        options?: {
            windowDays?: number;
            threshold?: number;
            notifyHrId?: string;
        }
    ) => {
        return apiService.post(`/time-management/repeated-lateness/${employeeId}/evaluate`, options || {});
    },
};

export default timeManagementService;