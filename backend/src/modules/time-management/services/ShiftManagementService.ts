// src/time-management/time-management/time-management.service.ts
import {Injectable, BadRequestException, NotFoundException, ConflictException, Logger, UseGuards} from '@nestjs/common';
import { Model, Types } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import {ShiftType, ShiftTypeDocument} from "../models/shift-type.schema";
import {Shift, ShiftDocument} from "../models/shift.schema";
import {ScheduleRule, ScheduleRuleDocument} from "../models/schedule-rule.schema";
import {ShiftAssignment, ShiftAssignmentDocument} from "../models/shift-assignment.schema";
import {Holiday, HolidayDocument} from "../models/holiday.schema";
import {LatenessRule, LatenessRuleDocument} from "../models/lateness-rule.schema";
import {OvertimeRule, OvertimeRuleDocument} from "../models/overtime-rule.schema";
import {NotificationLog, NotificationLogDocument} from "../models/notification-log.schema";
import { ShiftAssignmentStatus } from "../models/enums/index";
import {
    AssignShiftDto, BulkAssignShiftDto, CreateHolidayDto, CreateLatenessRuleDto, CreateOvertimeRuleDto,
    CreateScheduleRuleDto,
    CreateShiftDto,
    CreateShiftTypeDto, RenewAssignmentDto, UpdateHolidayDto, UpdateLatenessRuleDto,
    UpdateOvertimeRuleDto, UpdateScheduleRuleDto,
    UpdateShiftDto,
    UpdateShiftTypeDto,
    UpdateShiftAssignmentStatusDto, CreateShortTimeRuleDto, UpdateShortTimeRuleDto
} from "../dto/ShiftManagementDtos";
import {AuthenticationGuard} from "../../auth/guards/authentication-guard";
import {AuthorizationGuard} from "../../auth/guards/authorization-guard";
import {Roles} from "../../auth/decorators/roles-decorator";
import {SystemRole} from "../../employee/enums/employee-profile.enums";
import {ApiBearerAuth} from "@nestjs/swagger";


/**
 * ShiftManagementService
 * Responsibilities:
 *  - shift types (create/read/update/deactivate)
 *  - shifts (templates) with punch policy & grace minutes
 *  - schedule rules (patterns, rotations)
 *  - shift assignments (single & bulk + validation against overlap)
 *  - holiday calendar (national/organizational/weekend)
 *  - lateness & overtime rule CRUD
 *  - notifications (create NotificationLog entries)
 *
 * Mapped BR/FR/US: see inline comments
 */
@Injectable()
export class ShiftManagementService {
    private readonly logger = new Logger(ShiftManagementService.name);

    constructor(
        @InjectModel(ShiftType.name) private readonly shiftTypeModel: Model<ShiftTypeDocument>,
        @InjectModel(Shift.name) private readonly shiftModel: Model<ShiftDocument>,
        @InjectModel(ScheduleRule.name) private readonly scheduleRuleModel: Model<ScheduleRuleDocument>,
        @InjectModel(ShiftAssignment.name) private readonly shiftAssignmentModel: Model<ShiftAssignmentDocument>,
        @InjectModel(Holiday.name) private readonly holidayModel: Model<HolidayDocument>,
        @InjectModel(LatenessRule.name) private readonly latenessRuleModel: Model<LatenessRuleDocument>,
        @InjectModel(OvertimeRule.name) private readonly overtimeRuleModel: Model<OvertimeRuleDocument>,
        @InjectModel(NotificationLog.name) private readonly notificationModel: Model<NotificationLogDocument>,
    ) {}

    // --------------------------
    // ShiftType
    // --------------------------
    // FR: Shift definitions (Phase 1)
    async createShiftType(dto: CreateShiftTypeDto): Promise<ShiftType> {
        const found = await this.shiftTypeModel.findOne({ name: dto.name }).lean();
        if (found) throw new ConflictException('ShiftType already exists');
        const doc = new this.shiftTypeModel({ name: dto.name, active: dto.active ?? true });
        return doc.save();
    }

    async getShiftTypes(): Promise<ShiftType[]> {
        return this.shiftTypeModel.find().lean();
    }

    async updateShiftType(id: string, dto: UpdateShiftTypeDto): Promise<ShiftType> {
        const updated = await this.shiftTypeModel.findByIdAndUpdate(id, dto, { new: true }).lean();
        if (!updated) throw new NotFoundException('ShiftType not found');
        return updated as ShiftType;
    }

    async deactivateShiftType(id: string): Promise<void> {
        const res = await this.shiftTypeModel.findByIdAndUpdate(id, { active: false });
        if (!res) throw new NotFoundException('ShiftType not found');
    }

    // --------------------------
    // Shift (template)
    // --------------------------
    // BR: punchPolicy, grace minutes; FR: shift templates for scheduling
    async createShift(dto: CreateShiftDto): Promise<Shift> {
        // ensure shiftType exists
        const shiftType = await this.shiftTypeModel.findById(dto.shiftType);
        if (!shiftType) throw new BadRequestException('ShiftType not found');

        // basic validation for time format HH:mm
        const hhmm = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
        if (!hhmm.test(dto.startTime) || !hhmm.test(dto.endTime)) {
            throw new BadRequestException('startTime/endTime must be in HH:mm format');
        }

        const doc = new this.shiftModel({
            name: dto.name,
            shiftType: new Types.ObjectId(dto.shiftType),
            startTime: dto.startTime,
            endTime: dto.endTime,
            punchPolicy: dto.punchPolicy,
            graceInMinutes: dto.graceInMinutes ?? 0,
            graceOutMinutes: dto.graceOutMinutes ?? 0,
            requiresApprovalForOvertime: dto.requiresApprovalForOvertime ?? false,
            active: dto.active ?? true,
        });

        return doc.save();
    }

    async getShifts(filter: Partial<Record<string, any>> = {}): Promise<Shift[]> {
        return this.shiftModel.find(filter).lean();
    }

    async updateShift(id: string, dto: UpdateShiftDto): Promise<Shift> {
        const updated = await this.shiftModel.findByIdAndUpdate(id, dto, { new: true }).lean();
        if (!updated) throw new NotFoundException('Shift not found');
        return updated as Shift;
    }

    async deactivateShift(id: string): Promise<void> {
        const res = await this.shiftModel.findByIdAndUpdate(id, { active: false });
        if (!res) throw new NotFoundException('Shift not found');
    }

    // --------------------------
    // ScheduleRule
    // --------------------------
    async createScheduleRule(dto: CreateScheduleRuleDto): Promise<ScheduleRule> {
        const exists = await this.scheduleRuleModel.findOne({ name: dto.name }).lean();
        if (exists) throw new ConflictException('ScheduleRule name already exists');
        const r = new this.scheduleRuleModel({ name: dto.name, pattern: dto.pattern, active: dto.active ?? true });
        return r.save();
    }

    async getScheduleRules(): Promise<ScheduleRule[]> {
        return this.scheduleRuleModel.find().lean();
    }

    async updateScheduleRule(id: string, dto: UpdateScheduleRuleDto): Promise<ScheduleRule> {
        const updated = await this.scheduleRuleModel.findByIdAndUpdate(id, dto, { new: true }).lean();
        if (!updated) throw new NotFoundException('ScheduleRule not found');
        return updated as ScheduleRule;
    }

    // --------------------------
    // Shift Assignment
    // --------------------------
    // FR: assign shifts to employee/department/position; BR: no overlapping assignments
    // @UseGuards(AuthenticationGuard,AuthorizationGuard)
    // @Roles(SystemRole.SYSTEM_ADMIN, SystemRole.HR_ADMIN)
    // @ApiBearerAuth('access-token')
    async assignShiftToEmployee(dto: AssignShiftDto): Promise<ShiftAssignment> {
        // validate shift exists
        const shift = await this.shiftModel.findById(dto.shiftId).lean();
        if (!shift) throw new BadRequestException('Shift not found');

        if (!dto.employeeId && !dto.departmentId && !dto.positionId) {
            throw new BadRequestException('employeeId or departmentId or positionId required');
        }

        // check overlapping constraint: for the same target (employee/department/position), dates mustn't overlap
        const searchTargets: any[] = [];
        if (dto.employeeId) searchTargets.push({ employeeId: new Types.ObjectId(dto.employeeId) });
        if (dto.departmentId) searchTargets.push({ departmentId: new Types.ObjectId(dto.departmentId) });
        if (dto.positionId) searchTargets.push({ positionId: new Types.ObjectId(dto.positionId) });

        const overlapQuery = {
            $and: [
                { $or: searchTargets },
                { status: { $in: ['PENDING', 'APPROVED'] } },
                { $or: [{ endDate: { $exists: false } }, { endDate: { $gte: dto.startDate } }] },
                { startDate: { $lte: dto.endDate ?? new Date('9999-12-31') } },
            ],
        };

        const overlapping = await this.shiftAssignmentModel.findOne(overlapQuery).lean();
        if (overlapping) throw new ConflictException('Assignment overlaps an existing assignment');

        // prepare scheduleRuleId if provided: normalize, validate format and existence
        let scheduleRuleOid: Types.ObjectId | null = null;
        // normalize common variants to be tolerant of client casing/format mistakes
        const rawScheduleId = (dto as any).scheduleRuleId || (dto as any).ScheduleRuleId || (dto as any).schedule_rule_id || (dto as any).scheduleRuleID || null;
        if (rawScheduleId) {
            if (!Types.ObjectId.isValid(rawScheduleId)) {
                throw new BadRequestException('Invalid scheduleRuleId format');
            }
            const scheduleRule = await this.scheduleRuleModel.findById(rawScheduleId).lean();
            if (!scheduleRule) {
                throw new NotFoundException('ScheduleRule not found');
            }
            scheduleRuleOid = new Types.ObjectId(rawScheduleId);
        }

        const assignment = new this.shiftAssignmentModel({
            employeeId: dto.employeeId ? new Types.ObjectId(dto.employeeId) : undefined,
            departmentId: dto.departmentId ? new Types.ObjectId(dto.departmentId) : undefined,
            positionId: dto.positionId ? new Types.ObjectId(dto.positionId) : undefined,
            shiftId: new Types.ObjectId(dto.shiftId),
            // set scheduleRuleId to validated ObjectId when provided, otherwise null
            scheduleRuleId: scheduleRuleOid,
            startDate: dto.startDate,
            endDate: dto.endDate,
            status: dto.status ?? 'PENDING',
        });

        const saved = await assignment.save();

        // If this was a department or position-level assignment (no employeeId),
        // expand it into concrete per-employee assignments using the position_assignments collection
        if (!dto.employeeId && (dto.departmentId || dto.positionId)) {
            try {
                const createdIds: string[] = [];

                const skipIfOverlap = async (empId: any) => {
                    // Check for any overlapping assignment for this employee
                    const overlap = await this.shiftAssignmentModel.findOne({
                        employeeId: empId,
                        status: { $in: ['PENDING', 'APPROVED'] },
                        $or: [{ endDate: { $exists: false } }, { endDate: { $gte: dto.startDate } }],
                        startDate: { $lte: dto.endDate ?? new Date('9999-12-31') },
                    }).lean();
                    return !!overlap;
                };

                const paColl = this.shiftAssignmentModel.db.collection('position_assignments');

                if (dto.departmentId) {
                    const deptId = new Types.ObjectId(dto.departmentId);
                    const paQuery: any = {
                        departmentId: deptId,
                        $or: [{ endDate: { $exists: false } }, { endDate: { $gte: dto.startDate } }],
                        startDate: { $lte: dto.endDate ?? new Date('9999-12-31') },
                    };
                    const pas = await paColl.find(paQuery).toArray();
                    for (const pa of pas) {
                        const empId = pa.employeeProfileId;
                        try {
                            if (await skipIfOverlap(empId)) {
                                this.logger.debug(`Skipping per-employee assignment for ${empId} due to overlap`);
                                continue;
                            }
                            const per = new this.shiftAssignmentModel({
                                employeeId: empId,
                                departmentId: new Types.ObjectId(dto.departmentId),
                                positionId: pa.positionId ? new Types.ObjectId(pa.positionId) : undefined,
                                shiftId: new Types.ObjectId(dto.shiftId),
                                scheduleRuleId: scheduleRuleOid,
                                startDate: dto.startDate,
                                endDate: dto.endDate,
                                status: dto.status ?? 'PENDING',
                            });
                            const savedPer = await per.save();
                            createdIds.push(savedPer._id.toString());
                            // notification per employee
                            try {
                                await this.notificationModel.create({ to: empId, type: 'SHIFT_ASSIGNED', message: `Shift assignment ${savedPer._id} created for employee ${empId}` });
                            } catch (ne) {
                                this.logger.warn('Failed to log per-employee notification: ' + (ne?.message ?? ne));
                            }
                        } catch (e) {
                            this.logger.warn('Failed to create per-employee assignment: ' + (e?.message ?? e));
                        }
                    }
                    this.logger.log(`Created ${createdIds.length} per-employee assignments for department ${dto.departmentId}`);
                }

                if (dto.positionId) {
                    const posId = new Types.ObjectId(dto.positionId);
                    const paQueryPos: any = {
                        positionId: posId,
                        $or: [{ endDate: { $exists: false } }, { endDate: { $gte: dto.startDate } }],
                        startDate: { $lte: dto.endDate ?? new Date('9999-12-31') },
                    };
                    const pasPos = await paColl.find(paQueryPos).toArray();
                    for (const pa of pasPos) {
                        const empId = pa.employeeProfileId;
                        try {
                            if (await skipIfOverlap(empId)) {
                                this.logger.debug(`Skipping per-employee assignment for ${empId} due to overlap`);
                                continue;
                            }
                            const per = new this.shiftAssignmentModel({
                                employeeId: empId,
                                positionId: new Types.ObjectId(dto.positionId),
                                departmentId: pa.departmentId ? new Types.ObjectId(pa.departmentId) : undefined,
                                shiftId: new Types.ObjectId(dto.shiftId),
                                scheduleRuleId: scheduleRuleOid,
                                startDate: dto.startDate,
                                endDate: dto.endDate,
                                status: dto.status ?? 'PENDING',
                            });
                            const savedPer = await per.save();
                            createdIds.push(savedPer._id.toString());
                            try {
                                await this.notificationModel.create({ to: empId, type: 'SHIFT_ASSIGNED', message: `Shift assignment ${savedPer._id} created for employee ${empId}` });
                            } catch (ne) {
                                this.logger.warn('Failed to log per-employee notification: ' + (ne?.message ?? ne));
                            }
                        } catch (e) {
                            this.logger.warn('Failed to create per-employee assignment: ' + (e?.message ?? e));
                        }
                    }
                    this.logger.log(`Created ${createdIds.length} per-employee assignments for position ${dto.positionId}`);
                }
            } catch (e) {
                this.logger.warn('Error expanding department/position assignment: ' + (e?.message ?? e));
            }
        }

        // create a notification log entry (FR: notify manager/employee on assignment)
        try {
            // Always use a valid ObjectId for 'to'
            const recipientId = dto.createdBy && Types.ObjectId.isValid(dto.createdBy)
                ? new Types.ObjectId(dto.createdBy)
                : new Types.ObjectId(process.env.HR_USER_ID || process.env.SYSTEM_USER_ID || '000000000000000000000001');

            await this.notificationModel.create({
                to: recipientId,
                type: 'SHIFT_ASSIGNED',
                message: `Shift assignment ${saved._id} created for employee ${saved.employeeId}`,
            });

            this.logger.debug(`Notification sent to ${recipientId}`);
        } catch (e: any) {
            this.logger.error('Failed to create notification log:', e?.message ?? e);
            // Don't throw - notifications shouldn't break main functionality
        }

        // Return the saved assignment with scheduleRuleId populated (if set) to make the schedule rule visible in API response
        try {
            const populated = await this.shiftAssignmentModel.findById(saved._id).populate('scheduleRuleId').lean();
            return populated as any;
        } catch (e) {
            // fallback: return saved document if populate fails
            return saved;
        }
    }


    // @UseGuards(AuthenticationGuard,AuthorizationGuard)
    // @Roles(SystemRole.SYSTEM_ADMIN, SystemRole.HR_ADMIN)
    // @ApiBearerAuth('access-token')
    // async bulkAssignShift(dto: BulkAssignShiftDto): Promise<ShiftAssignment[]> {
    //     const results: ShiftAssignment[] = [];
    //     if (!dto.targets || dto.targets.length === 0) throw new BadRequestException('targets required');
    //
    //     for (const t of dto.targets) {
    //         try {
    //             const assignDto: AssignShiftDto = {
    //                 employeeId: t.employeeId,
    //                 departmentId: t.departmentId,
    //                 positionId: t.positionId,
    //                 shiftId: dto.shiftId,
    //                 // allow per-target override of scheduleRuleId, fallback to bulk dto
    //                 scheduleRuleId: t.scheduleRuleId ?? dto.scheduleRuleId,
    //                 startDate: dto.startDate,
    //                 endDate: dto.endDate,
    //                 status: dto.status,
    //                 createdBy: dto.createdBy,
    //             } as AssignShiftDto;
    //
    //             const created = await this.assignShiftToEmployee(assignDto);
    //             results.push(created);
    //         } catch (err) {
    //             this.logger.warn(`Bulk assign skipped target due to: ${err.message}`);
    //             // continue with next target (best-effort as specified in requirements)
    //         }
    //     }
    //
    //     return results;
    // }

    async getAssignmentsForEmployee(employeeId: string): Promise<ShiftAssignment[]> {
        const eId = new Types.ObjectId(employeeId);

        // direct assignments where employeeId matches
        const direct = await this.shiftAssignmentModel.find({ employeeId: eId }).lean();

        // find position_assignments for this employee to detect department/position snapshot assignments
        const paColl = this.shiftAssignmentModel.db.collection('position_assignments');
        const paQuery: any = { employeeProfileId: eId };
        // only consider currently effective assignments (optional: include historical if needed)
        // an assignment is considered active if endDate absent or endDate >= now
        const now = new Date();
        paQuery.$or = [ { endDate: { $exists: false } }, { endDate: { $gte: now } } ];

        const pas = await paColl.find(paQuery).toArray();
        const deptIds: Types.ObjectId[] = [];
        const posIds: Types.ObjectId[] = [];
        for (const pa of pas) {
            if (pa.departmentId) deptIds.push(new Types.ObjectId(pa.departmentId));
            if (pa.positionId) posIds.push(new Types.ObjectId(pa.positionId));
        }

        const deptPosAssignments: any[] = [];
        if (deptIds.length || posIds.length) {
            const or: any[] = [];
            if (deptIds.length) or.push({ departmentId: { $in: deptIds } });
            if (posIds.length) or.push({ positionId: { $in: posIds } });
            const deptPosQuery = { $or: or };
            const deptPos = await this.shiftAssignmentModel.find(deptPosQuery).lean();
            deptPosAssignments.push(...deptPos);
        }

        // merge and deduplicate by _id
        const map = new Map<string, any>();
        for (const a of [...direct, ...deptPosAssignments]) {
            map.set(a._id.toString(), a);
        }
        return Array.from(map.values());
    }

    async getAllAssignments(): Promise<ShiftAssignment[]> {
        return this.shiftAssignmentModel.find().lean() as Promise<ShiftAssignment[]>;
    }

    async renewAssignment(id: string, dto: RenewAssignmentDto): Promise<ShiftAssignment> {
        const assignment = await this.shiftAssignmentModel.findById(id);
        if (!assignment) throw new NotFoundException('Assignment not found');
        if (dto.startDate) assignment.startDate = dto.startDate;
        if (dto.endDate) assignment.endDate = dto.endDate;
        if (dto.scheduleRuleId) assignment.scheduleRuleId = new Types.ObjectId(dto.scheduleRuleId);
        if (dto.status) assignment.status = dto.status as any;
        await assignment.save();
        return assignment.toObject() as ShiftAssignment;
    }

    async expireAssignment(id: string): Promise<void> {
        const assignment = await this.shiftAssignmentModel.findById(id);
        if (!assignment) throw new NotFoundException('Assignment not found');
        assignment.endDate = new Date();
        assignment.status = 'EXPIRED' as any;
        await assignment.save();
        // notify employee
        try {
            await this.notificationModel.create({
                to: assignment.employeeId ? assignment.employeeId as any : null,
                type: 'SHIFT_EXPIRED',
                message: `Your shift assignment ${assignment._id} expired`,
            });
        } catch (e) {
            this.logger.warn('Failed to log expire notification');
        }
    }

    /**
     * US-021: Update shift assignment status
     * Updates the status of a shift assignment (PENDING, APPROVED, CANCELLED, EXPIRED)
     */
    @UseGuards(AuthenticationGuard,AuthorizationGuard)
    @Roles(SystemRole.SYSTEM_ADMIN, SystemRole.HR_ADMIN)
    @ApiBearerAuth('access-token')
    async updateAssignmentStatus(id: string, dto: UpdateShiftAssignmentStatusDto) {
        // Validate status is a valid ShiftAssignmentStatus enum value
        const validStatuses = ['PENDING', 'APPROVED', 'CANCELLED', 'EXPIRED'];
        if (!validStatuses.includes(dto.status)) {
            throw new BadRequestException(
                `Invalid status. Must be one of: ${validStatuses.join(', ')}`
            );
        }

        // Find the assignment
        const assignment = await this.shiftAssignmentModel.findById(id);
        if (!assignment) {
            throw new NotFoundException(`Shift assignment with ID ${id} not found`);
        }

        // Store old status for response
        const oldStatus = assignment.status;

        // Update the status
        assignment.status = dto.status as any;
        await assignment.save();

        // Send notification to employee about status change
        try {
            let notificationMessage = `Shift assignment status changed from ${oldStatus} to ${dto.status}`;
            if (dto.reason) {
                notificationMessage += `. Reason: ${dto.reason}`;
            }

            await this.notificationModel.create({
                to: assignment.employeeId ? assignment.employeeId as any : null,
                type: 'SHIFT_STATUS_UPDATED',
                message: notificationMessage,
            });
        } catch (e) {
            this.logger.warn('Failed to log status update notification: ' + (e?.message ?? e));
        }

        // Log the status change
        this.logger.log(
            `Shift assignment ${id} status updated from ${oldStatus} to ${dto.status}` +
            (dto.updatedBy ? ` by user ${dto.updatedBy}` : '') +
            (dto.reason ? `. Reason: ${dto.reason}` : '')
        );

        return {
            message: 'Shift assignment status updated successfully',
            assignmentId: id,
            oldStatus,
            newStatus: dto.status,
            reason: dto.reason,
            updatedAt: new Date(),
        };
    }

    async validateShiftOverlap(employeeId: string | Types.ObjectId, startDate: Date, endDate?: Date): Promise<boolean> {
        const eId = typeof employeeId === 'string' ? new Types.ObjectId(employeeId) : employeeId;
        const overlapping = await this.shiftAssignmentModel.findOne({
            employeeId: eId,
            status: { $in: ['PENDING', 'APPROVED'] },
            $or: [{ endDate: { $exists: false } }, { endDate: { $gte: startDate } }],
            startDate: { $lte: endDate ?? new Date('9999-12-31') },
        }).lean();
        return !!overlapping;
    }

    // --------------------------
    // Holiday CRUD + detection
    // --------------------------
    async createHoliday(dto: CreateHolidayDto): Promise<Holiday> {
        const h = new this.holidayModel({
            type: dto.type,
            startDate: dto.startDate,
            endDate: dto.endDate,
            name: dto.name,
            active: dto.active ?? true,
        });
        return h.save();
    }

    async getHolidays(filter: Partial<Record<string, any>> = {}): Promise<Holiday[]> {
        return this.holidayModel.find(filter).lean();
    }

    async updateHoliday(id: string, dto: UpdateHolidayDto): Promise<Holiday> {
        const updated = await this.holidayModel.findByIdAndUpdate(id, dto, { new: true }).lean();
        if (!updated) throw new NotFoundException('Holiday not found');
        return updated as Holiday;
    }

    async deactivateHoliday(id: string): Promise<void> {
        const res = await this.holidayModel.findByIdAndUpdate(id, { active: false });
        if (!res) throw new NotFoundException('Holiday not found');
    }

    // returns true if provided date is part of an active holiday (BR: calendars integrated with attendance)
    async isHoliday(date: Date): Promise<boolean> {
        const s = new Date(date); s.setHours(0,0,0,0);
        const e = new Date(date); e.setHours(23,59,59,999);
        const found = await this.holidayModel.findOne({
            active: true,
            $or: [
                { startDate: { $lte: e }, endDate: { $gte: s } }, // range contains date
                { startDate: { $gte: s, $lte: e }, endDate: { $exists: false } }, // single-day holiday
            ],
        }).lean();
        return !!found;
    }

    // --------------------------
    // Lateness rules
    // --------------------------
    async createLatenessRule(dto: CreateLatenessRuleDto): Promise<LatenessRule> {
        const r = new this.latenessRuleModel({
            name: dto.name,
            description: dto.description,
            gracePeriodMinutes: dto.gracePeriodMinutes ?? 0,
            deductionForEachMinute: dto.deductionForEachMinute ?? 0,
            active: dto.active ?? true,
        });
        return r.save();
    }

    async getLatenessRules(): Promise<LatenessRule[]> {
        return this.latenessRuleModel.find().lean();
    }

    async updateLatenessRule(id: string, dto: UpdateLatenessRuleDto): Promise<LatenessRule> {
        const updated = await this.latenessRuleModel.findByIdAndUpdate(id, dto, { new: true }).lean();
        if (!updated) throw new NotFoundException('LatenessRule not found');
        return updated as LatenessRule;
    }

    // --------------------------
    // Overtime rules
    // --------------------------
    async createOvertimeRule(dto: CreateOvertimeRuleDto): Promise<OvertimeRule> {
        const r = new this.overtimeRuleModel({
            name: dto.name,
            description: dto.description,
            active: dto.active ?? true,
            approved: dto.approved ?? false,
        });
        return r.save();
    }

    async getOvertimeRules(): Promise<OvertimeRule[]> {
        // Filter out short-time rules (those with description starting with 'SHORT_TIME:')
        const all = await this.overtimeRuleModel.find().lean();
        return all.filter((rule: any) => {
            const desc = rule.description;
            // Only exclude if description exists AND starts with SHORT_TIME:
            if (desc && typeof desc === 'string' && desc.startsWith('SHORT_TIME:')) {
                return false;
            }
            return true;
        }) as OvertimeRule[];
    }

    async updateOvertimeRule(id: string, dto: UpdateOvertimeRuleDto): Promise<OvertimeRule> {
        const updated = await this.overtimeRuleModel.findByIdAndUpdate(id, dto, { new: true }).lean();
        if (!updated) throw new NotFoundException('OvertimeRule not found');
        return updated as OvertimeRule;
    }

    async approveOvertimeRule(id: string): Promise<OvertimeRule> {
        const rule = await this.overtimeRuleModel.findById(id);
        if (!rule) throw new NotFoundException('OvertimeRule not found');
        rule.approved = true;
        await rule.save();
        return rule.toObject() as OvertimeRule;
    }

    // --------------------------
    // Short-time rules (stored in overtimeRule collection using description prefix)
    // --------------------------
    private encodeShortTimeDescription(dto: CreateShortTimeRuleDto | UpdateShortTimeRuleDto): string {
        const cfg: any = {
            kind: 'SHORT_TIME',
            description: dto.description ?? null,
            requiresPreApproval: dto.requiresPreApproval ?? false,
            ignoreWeekends: dto.ignoreWeekends ?? false,
            ignoreHolidays: dto.ignoreHolidays ?? false,
            minShortMinutes: dto.minShortMinutes ?? 30,
        };
        return 'SHORT_TIME:' + JSON.stringify(cfg);
    }

    private tryDecodeShortTimeDescription(desc?: any) {
        if (!desc || typeof desc !== 'string') return null;
        if (!desc.startsWith('SHORT_TIME:')) return null;
        try {
            const json = desc.substring('SHORT_TIME:'.length);
            return JSON.parse(json);
        } catch (e) {
            return null;
        }
    }

    async createShortTimeRule(dto: CreateShortTimeRuleDto): Promise<any> {
        const desc = this.encodeShortTimeDescription(dto);
        const r = new this.overtimeRuleModel({
            name: dto.name,
            description: desc,
            active: dto.active ?? true,
            approved: dto.approved ?? false,
        });
        const saved = await r.save();
        return {
            _id: saved._id,
            name: saved.name,
            ...(this.tryDecodeShortTimeDescription(saved.description) || { rawDescription: saved.description }),
            active: saved.active,
            approved: saved.approved,
        };
    }

    async getShortTimeRules(): Promise<any[]> {
        const all = await this.overtimeRuleModel.find().lean();
        const results: any[] = [];
        for (const r of all) {
            const cfg = this.tryDecodeShortTimeDescription(r.description as any);
            if (cfg && cfg.kind === 'SHORT_TIME') {
                results.push({
                    _id: r._id,
                    name: r.name,
                    description: cfg.description,
                    requiresPreApproval: cfg.requiresPreApproval,
                    ignoreWeekends: cfg.ignoreWeekends,
                    ignoreHolidays: cfg.ignoreHolidays,
                    minShortMinutes: cfg.minShortMinutes,
                    active: r.active,
                    approved: r.approved,
                });
            }
        }
        return results;
    }

    async updateShortTimeRule(id: string, dto: UpdateShortTimeRuleDto): Promise<any> {
        const rule = await this.overtimeRuleModel.findById(id);
        if (!rule) throw new NotFoundException('ShortTimeRule not found');
        const cfg = this.tryDecodeShortTimeDescription(rule.description as any);
        if (!cfg || cfg.kind !== 'SHORT_TIME') throw new NotFoundException('ShortTimeRule not found');

        // update config
        const updatedCfg = {
            ...cfg,
            description: dto.description ?? cfg.description,
            requiresPreApproval: dto.requiresPreApproval ?? cfg.requiresPreApproval,
            ignoreWeekends: dto.ignoreWeekends ?? cfg.ignoreWeekends,
            ignoreHolidays: dto.ignoreHolidays ?? cfg.ignoreHolidays,
            minShortMinutes: dto.minShortMinutes ?? cfg.minShortMinutes,
        };

        rule.name = dto.name ?? rule.name;
        rule.description = 'SHORT_TIME:' + JSON.stringify(updatedCfg);
        if (dto.active !== undefined) rule.active = dto.active;
        if (dto.approved !== undefined) rule.approved = dto.approved;

        await rule.save();

        return {
            _id: rule._id,
            name: rule.name,
            description: updatedCfg.description,
            requiresPreApproval: updatedCfg.requiresPreApproval,
            ignoreWeekends: updatedCfg.ignoreWeekends,
            ignoreHolidays: updatedCfg.ignoreHolidays,
            minShortMinutes: updatedCfg.minShortMinutes,
            active: rule.active,
            approved: rule.approved,
        };
    }

    async approveShortTimeRule(id: string): Promise<any> {
        const rule = await this.overtimeRuleModel.findById(id);
        if (!rule) throw new NotFoundException('ShortTimeRule not found');
        const cfg = this.tryDecodeShortTimeDescription(rule.description as any);
        if (!cfg || cfg.kind !== 'SHORT_TIME') throw new NotFoundException('ShortTimeRule not found');
        rule.approved = true;
        await rule.save();
        return {
            _id: rule._id,
            name: rule.name,
            ...(this.tryDecodeShortTimeDescription(rule.description) || { rawDescription: rule.description }),
            active: rule.active,
            approved: rule.approved,
        };
    }

    // --------------------------
    // Notification helper
    // --------------------------
    async notify(to: Types.ObjectId | string | null, type: string, message?: string) {
        try {
            const toId = to ? (typeof to === 'string' ? new Types.ObjectId(to) : to) : null;
            return this.notificationModel.create({ to: toId, type, message });
        } catch (e) {
            this.logger.warn('Failed to write notification log: ' + (e?.message ?? e));
            return null;
        }
    }
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    async deactivateScheduleRule(id: string) {
        return this.scheduleRuleModel.findByIdAndUpdate(id, { active: false });
    }


    //////////////////////////////////////////////////////////////////////////////



}
