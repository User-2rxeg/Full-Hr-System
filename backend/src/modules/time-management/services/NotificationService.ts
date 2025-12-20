import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types, Connection } from 'mongoose';
import { InjectConnection } from '@nestjs/mongoose';
import { NotificationLog, NotificationLogDocument } from '../models/notification-log.schema';
import { ShiftAssignment, ShiftAssignmentDocument } from '../models/shift-assignment.schema';

@Injectable()
export class NotificationService {
    private readonly logger = new Logger(NotificationService.name);

    constructor(
        @InjectModel(NotificationLog.name) private readonly notificationModel: Model<NotificationLogDocument>,
        @InjectModel(ShiftAssignment.name) private readonly shiftAssignmentModel: Model<ShiftAssignmentDocument>,
        @InjectConnection() private readonly connection: Connection,
    ) {}

    /**
     * Get all notifications for a specific user
     */
    async getNotificationsByUser(userId: string) {
        try {
            this.logger.log(`Fetching notifications for user: ${userId}`);
            const notifications = await this.notificationModel
                .find({ to: new Types.ObjectId(userId) })
                .sort({ createdAt: -1 })
                .lean();

            this.logger.log(`Found ${notifications.length} notifications for user: ${userId}`);
            return notifications;
        } catch (error) {
            this.logger.error(`Failed to fetch notifications for user: ${userId}`, error);
            throw error;
        }
    }

    /**
     * Get all notifications (for admin/HR)
     */
    async getAllNotifications(filter?: any) {
        try {
            const query = filter || {};
            const notifications = await this.notificationModel
                .find(query)
                .sort({ createdAt: -1 })
                .lean();

            return notifications;
        } catch (error) {
            this.logger.error('Failed to fetch all notifications', error);
            throw error;
        }
    }

    /**
     * Get notifications by type
     */
    async getNotificationsByType(type: string) {
        try {
            const notifications = await this.notificationModel
                .find({ type })
                .sort({ createdAt: -1 })
                .lean();

            return notifications;
        } catch (error) {
            this.logger.error('Failed to fetch notifications by type', error);
            throw error;
        }
    }

    /**
     * Manually trigger shift expiry check (for testing)
     * This method can be called from an endpoint to test the notification system
     * Automatically finds HR users - no HR_USER_ID required!
     */
    async triggerShiftExpiryCheck(days: number = 7) {
        try {
            const now = new Date();
            const threshold = new Date();
            threshold.setDate(now.getDate() + days);
            threshold.setHours(23, 59, 59, 999);

            // Find assignments expiring within the specified days
            const assignments = await this.shiftAssignmentModel.find({
                endDate: { $exists: true, $lte: threshold, $gte: now },
                status: { $in: ['PENDING', 'APPROVED'] },
            }).lean();

            if (!assignments?.length) {
                return {
                    message: `No expiring assignments in next ${days} days`,
                    count: 0,
                    assignments: [],
                    hrUsers: []
                };
            }

            // Automatically find HR users
            const hrUsers = await this.findHRUsers();
            const notificationsCreated: any[] = [];

            for (const a of assignments) {
                // IMPORTANT FIX: Check if notification already exists for this assignment (prevent duplicates)
                const existingNotification = await this.notificationModel.findOne({
                    'metadata.assignmentId': a._id.toString(),
                    type: { $in: ['SHIFT_EXPIRY', 'SHIFT_EXPIRY_EMPLOYEE'] }
                }).lean();

                if (existingNotification) {
                    this.logger.debug(`Skipping shift expiry notification for assignment ${a._id} - already exists`);
                    continue;
                }

                const msg = `Shift assignment ${a._id} for employee ${a.employeeId} expires on ${a.endDate?.toISOString().slice(0,10)}. Please review for renewal or reassignment.`;

                // Notify all HR users
                for (const hrUser of hrUsers) {
                    const hrNotification = await this.notificationModel.create({
                        to: hrUser.employeeProfileId,
                        type: 'SHIFT_EXPIRY',
                        message: msg,
                        metadata: { assignmentId: a._id.toString() } // Track which assignment
                    } as any);
                    notificationsCreated.push(hrNotification);
                }

                // Notify employee
                if (a.employeeId) {
                    try {
                        const empNotification = await this.notificationModel.create({
                            to: a.employeeId,
                            type: 'SHIFT_EXPIRY_EMPLOYEE',
                            message: `Your shift assignment expires on ${a.endDate?.toISOString().slice(0,10)}. Please contact HR if renewal is needed.`,
                            metadata: { assignmentId: a._id.toString() } // Track which assignment
                        } as any);
                        notificationsCreated.push(empNotification);
                    } catch (e) {
                        this.logger.warn('Failed to create notification for employee', e);
                    }
                }
            }

            return {
                message: hrUsers.length > 0
                    ? `Created ${notificationsCreated.length} notifications for ${assignments.length} expiring assignments (notified ${hrUsers.length} HR users)`
                    : `Created ${notificationsCreated.length} notifications for ${assignments.length} expiring assignments (no HR users found, only employees notified)`,
                count: notificationsCreated.length,
                hrUsersFound: hrUsers.length,
                hrUsers: hrUsers.map(u => ({ email: u.workEmail, roles: u.roles })),
                assignments: assignments.map(a => ({
                    assignmentId: a._id,
                    employeeId: a.employeeId,
                    endDate: a.endDate,
                    status: a.status
                })),
                notifications: notificationsCreated
            };
        } catch (error) {
            this.logger.error('Failed to trigger shift expiry check', error);
            throw error;
        }
    }

    /**
     * Create LATE notification (ONLY ONCE per day)
     */
    async createLateNotification(employeeId: string, details: {
        scheduledTime: Date;
        actualTime: Date;
        lateByMinutes: number;
    }): Promise<boolean> {
        try {
            const today = new Date();
            const startOfDay = new Date(today);
            startOfDay.setHours(0, 0, 0, 0);

            const endOfDay = new Date(today);
            endOfDay.setHours(23, 59, 59, 999);

            // Check if late notification already sent today
            const existingLate = await this.notificationModel.findOne({
                to: new Types.ObjectId(employeeId),
                type: 'LATE',
                createdAt: {
                    $gte: startOfDay,
                    $lte: endOfDay
                }
            });

            if (existingLate) {
                this.logger.debug(`Late notification already exists for employee ${employeeId} today`);
                return false; // Already notified
            }

            // Create new late notification
            await this.notificationModel.create({
                to: new Types.ObjectId(employeeId),
                type: 'LATE',
                message: `You punched in late today at ${details.actualTime.toLocaleTimeString()}. Scheduled: ${details.scheduledTime.toLocaleTimeString()}, Late by: ${details.lateByMinutes} minutes`,
                metadata: {
                    scheduledTime: details.scheduledTime,
                    actualTime: details.actualTime,
                    lateByMinutes: details.lateByMinutes,
                    date: today.toISOString().split('T')[0]
                }
            });

            return true;
        } catch (error) {
            this.logger.error('Failed to create late notification', error);
            throw error;
        }
    }

    /**
     * Create MISSED_PUNCH notification
     */
    async createMissedPunchNotification(employeeId: string, type: 'IN' | 'OUT'): Promise<void> {
        try {
            await this.notificationModel.create({
                to: new Types.ObjectId(employeeId),
                type: 'MISSED_PUNCH',
                message: `You missed your ${type === 'IN' ? 'punch in' : 'punch out'} today.`,
                metadata: {
                    punchType: type,
                    date: new Date().toISOString().split('T')[0]
                }
            });
        } catch (error) {
            this.logger.error('Failed to create missed punch notification', error);
            throw error;
        }
    }

    /**
     * Create SHORT_TIME notification
     */
    async createShortTimeNotification(employeeId: string, details: {
        expectedHours: number;
        actualHours: number;
        shortByHours: number;
    }): Promise<void> {
        try {
            await this.notificationModel.create({
                to: new Types.ObjectId(employeeId),
                type: 'SHORT_TIME',
                message: `Your shift today was shorter than required. Expected: ${details.expectedHours} hours, Actual: ${details.actualHours} hours`,
                metadata: {
                    expectedHours: details.expectedHours,
                    actualHours: details.actualHours,
                    shortByHours: details.shortByHours,
                    date: new Date().toISOString().split('T')[0]
                }
            });
        } catch (error) {
            this.logger.error('Failed to create short time notification', error);
            throw error;
        }
    }

    /**
     * Clean up attendance notifications after punch out
     * Removes: MISSED_PUNCH, SHORT_TIME (if no longer applicable)
     */
    async cleanupAttendanceAfterPunchOut(employeeId: string, punchTime: Date): Promise<void> {
        try {
            const today = new Date(punchTime);
            const startOfDay = new Date(today);
            startOfDay.setHours(0, 0, 0, 0);

            const endOfDay = new Date(today);
            endOfDay.setHours(23, 59, 59, 999);

            // Remove MISSED_PUNCH notifications (both IN and OUT)
            await this.notificationModel.deleteMany({
                to: new Types.ObjectId(employeeId),
                type: 'MISSED_PUNCH',
                createdAt: {
                    $gte: startOfDay,
                    $lte: endOfDay
                }
            });

            this.logger.log(`Cleaned up missed punch notifications for employee ${employeeId} after punch out`);
        } catch (error) {
            this.logger.error('Failed to cleanup attendance after punch out', error);
            // Don't throw - this is cleanup, shouldn't break main flow
        }
    }

    /**
     * Clean up SHORT_TIME notification if shift is now complete
     * Call this after recalculating hours
     */
    async cleanupShortTimeIfComplete(employeeId: string, date: Date, actualHours: number, requiredHours: number): Promise<void> {
        try {
            const startOfDay = new Date(date);
            startOfDay.setHours(0, 0, 0, 0);

            const endOfDay = new Date(date);
            endOfDay.setHours(23, 59, 59, 999);

            // If actual hours >= required hours, remove SHORT_TIME notification
            if (actualHours >= requiredHours) {
                await this.notificationModel.deleteMany({
                    to: new Types.ObjectId(employeeId),
                    type: 'SHORT_TIME',
                    createdAt: {
                        $gte: startOfDay,
                        $lte: endOfDay
                    }
                });

                this.logger.log(`Cleaned up short time notification for employee ${employeeId} - shift is now complete`);
            }
        } catch (error) {
            this.logger.error('Failed to cleanup short time notification', error);
        }
    }

    /**
     * Clean up MISSED_PUNCH_IN after successful punch in
     */
    async cleanupMissedPunchIn(employeeId: string, punchTime: Date): Promise<void> {
        try {
            const today = new Date(punchTime);
            const startOfDay = new Date(today);
            startOfDay.setHours(0, 0, 0, 0);

            const endOfDay = new Date(today);
            endOfDay.setHours(23, 59, 59, 999);

            // Remove only MISSED_PUNCH for IN type
            await this.notificationModel.deleteMany({
                to: new Types.ObjectId(employeeId),
                type: 'MISSED_PUNCH',
                'metadata.punchType': 'IN',
                createdAt: {
                    $gte: startOfDay,
                    $lte: endOfDay
                }
            });

            this.logger.log(`Cleaned up missed punch IN notification for employee ${employeeId}`);
        } catch (error) {
            this.logger.error('Failed to cleanup missed punch IN', error);
        }
    }

    /**
     * Check if LATE notification was already sent today
     */
    async hasLateNotificationToday(employeeId: string, date: Date): Promise<boolean> {
        try {
            const startOfDay = new Date(date);
            startOfDay.setHours(0, 0, 0, 0);

            const endOfDay = new Date(date);
            endOfDay.setHours(23, 59, 59, 999);

            const existing = await this.notificationModel.findOne({
                to: new Types.ObjectId(employeeId),
                type: 'LATE',
                createdAt: {
                    $gte: startOfDay,
                    $lte: endOfDay
                }
            });

            return !!existing;
        } catch (error) {
            this.logger.error('Failed to check late notification', error);
            return false;
        }
    }

    private async findHRUsers(): Promise<any[]> {
        try {
            if (!this.connection.db) {
                this.logger.warn('Database connection not available');
                return [];
            }

            // IMPORTANT: Use Main2's better HR detection
            const HR_ROLE_CANDIDATES = ['HR Admin', 'HR Manager', 'HR', 'HR_ADMIN', 'HR_MANAGER', 'HR_ADMINISTRATOR', 'HR Administrator', 'System Admin'];

            // Try embedded roles first
            const profileCollections = ['employee_profiles', 'employeeprofiles', 'employee_profiles_v1'];
            for (const colName of profileCollections) {
                try {
                    const probe = await this.connection.db.collection(colName).findOne({});
                    if (probe && Object.prototype.hasOwnProperty.call(probe, 'roles')) {
                        const directHr = await this.connection.db
                            .collection(colName)
                            .find({ roles: { $in: HR_ROLE_CANDIDATES } })
                            .project({ _id: 1, workEmail: 1, roles: 1, status: 1 })
                            .toArray();

                        return directHr.map(e => ({
                            employeeProfileId: e._id,
                            roles: e.roles,
                            workEmail: e.workEmail,
                            isActive: e.status === 'ACTIVE',
                        }));
                    }
                } catch (e) {
                    // ignore and try next
                }
            }

            // Fallback to role collections
            const roleCollections = ['employee_system_roles', 'employeesystemroles', 'employee_systemroles', 'employeeSystemRoles'];
            for (const rc of roleCollections) {
                try {
                    const hrRoles = await this.connection.db.collection(rc).find({
                        roles: { $in: HR_ROLE_CANDIDATES },
                        isActive: true
                    }).toArray();

                    if (!hrRoles || hrRoles.length === 0) continue;

                    const employeeIds = Array.from(new Set(hrRoles.map((r: any) => String(r.employeeProfileId)))).map(id => new Types.ObjectId(id));

                    // Find employee profiles
                    let employees: any[] = [];
                    for (const colName of profileCollections) {
                        try {
                            employees = await this.connection.db.collection(colName).find({
                                _id: { $in: employeeIds },
                                status: 'ACTIVE'
                            }).project({ _id: 1, workEmail: 1, status: 1 }).toArray();
                            if (employees.length) break;
                        } catch (e) {
                            continue;
                        }
                    }

                    const results = hrRoles
                        .map((role: any) => {
                            const emp = employees.find(e => String(e._id) === String(role.employeeProfileId));
                            if (!emp) return null;
                            return {
                                employeeProfileId: role.employeeProfileId,
                                roles: role.roles,
                                workEmail: emp.workEmail,
                                isActive: emp.status === 'ACTIVE',
                            };
                        })
                        .filter(Boolean);

                    if (results.length) return results;
                } catch (e) {
                    continue;
                }
            }

            return [];
        } catch (error) {
            this.logger.error('Failed to find HR users', error);
            return [];
        }
    }

    /**
     * Delete a notification
     */
    async deleteNotification(id: string) {
        try {
            const result = await this.notificationModel.findByIdAndDelete(id);
            return result;
        } catch (error) {
            this.logger.error('Failed to delete notification', error);
            throw error;
        }
    }

    /**
     * Clear all notifications for a user
     */
    async clearUserNotifications(userId: string): Promise<any> {
        try {
            const result = await this.notificationModel.deleteMany({
                to: new Types.ObjectId(userId)
            });
            return result;
        } catch (error) {
            this.logger.error('Failed to clear user notifications', error);
            throw error;
        }
    }

    /**
     * Get all HR/Admin users in the system
     */
    async getHRUsers() {
        try {
            if (!this.connection.db) {
                return {
                    message: 'Database connection not available',
                    users: [],
                    note: 'Unable to query HR users at this time.'
                };
            }

            const hrUsers = await this.findHRUsers();

            return {
                message: `Found ${hrUsers.length} HR/Admin user(s)`,
                users: hrUsers,
                note: 'These users will automatically receive shift expiry notifications.'
            };
        } catch (error) {
            this.logger.error('Failed to fetch HR users', error);
            throw error;
        }
    }

    async findUsersByRole(roleName: string): Promise<any[]> {
        try {
            if (!this.connection.db) {
                this.logger.warn('Database connection not available');
                return [];
            }

            const ROLE = roleName;

            // Probe employee_profiles
            const probe = await this.connection.db.collection('employee_profiles').findOne({});
            if (probe && Object.prototype.hasOwnProperty.call(probe, 'roles')) {
                const users = await this.connection.db
                    .collection('employee_profiles')
                    .find({ roles: { $in: [ROLE] }, status: 'ACTIVE' })
                    .project({ _id: 1, workEmail: 1, roles: 1 })
                    .toArray();

                return users.map(u => ({ employeeProfileId: u._id, workEmail: u.workEmail, roles: u.roles }));
            }

            // Fallback
            const roles = await this.connection.db
                .collection('employee_system_roles')
                .find({ roles: { $in: [ROLE] }, isActive: true })
                .toArray();

            if (!roles?.length) return [];

            const employeeIds = Array.from(new Set(roles.map((r: any) => String(r.employeeProfileId)))).map(id => new Types.ObjectId(id));

            const employees = await this.connection.db
                .collection('employee_profiles')
                .find({ _id: { $in: employeeIds }, status: 'ACTIVE' })
                .project({ _id: 1, workEmail: 1, status: 1 })
                .toArray();

            const results = roles
                .map((role: any) => {
                    const emp = employees.find(e => String(e._id) === String(role.employeeProfileId));
                    if (!emp) return null;
                    return { employeeProfileId: role.employeeProfileId, roles: role.roles, workEmail: emp.workEmail };
                })
                .filter(Boolean);

            return results;
        } catch (error) {
            this.logger.error('findUsersByRole failed', error);
            return [];
        }
    }
}