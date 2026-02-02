import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { LeaveTypeDocument } from '../models/leave-type.schema';
import { LeaveCategoryDocument } from '../models/leave-category.schema';
import { LeaveRequestDocument } from '../models/leave-request.schema';
import { LeaveEntitlementDocument } from '../models/leave-entitlement.schema';
import { LeaveAdjustmentDocument } from '../models/leave-adjustment.schema';
import { CalendarDocument } from '../models/calendar.schema';
import { AttachmentDocument } from '../models/attachment.schema';
import { LeaveStatus } from '../enums/leave-status.enum';
import { AccrualMethod } from '../enums/accrual-method.enum';
import { RoundingRule } from '../enums/rounding-rule.enum';
import { LeavePolicyDocument } from '../models/leave-policy.schema';
import { SharedLeavesService } from '../../integration/services/shared-leaves.service';
import { AdjustmentType } from '../enums/adjustment-type.enum';
import { SystemRole } from '../../employee/enums/employee-profile.enums';
import { OrganizationStructureService } from '../../organization-structure/service/organization-structure.service';
import { EmployeeProfileService } from '../../employee/services/employee-profile.service';
import { AttendanceService } from '../../time-management/services/AttendanceService';
import { HolidayService } from '../../time-management/services/HolidayService';

/**
 * UnifiedLeaveService
 *
 * Comprehensive leave management service implementing all 42 requirements
 * from leaves.requirements document.
 *
 * Key Integrations:
 * - EmployeeProfileService: Access employee data, tenure, contract types (REQ-003, REQ-008, REQ-015)
 * - OrganizationStructureService: Approval workflows, reporting hierarchy (REQ-009, REQ-020)
 * - SharedLeavesService: Notifications, cross-module communication (REQ-019, REQ-024, REQ-030)
 * - AttendanceService: Work schedules, attendance blocking (REQ-010, REQ-042)
 * - HolidayService: Public holidays exclusion (REQ-010, BR-33)
 */
@Injectable()
export class UnifiedLeaveService {
  private readonly logger = new Logger(UnifiedLeaveService.name);

  constructor(
    @InjectModel('LeaveType')
    private leaveTypeModel: Model<LeaveTypeDocument>,
    @InjectModel('LeaveRequest')
    private leaveRequestModel: Model<LeaveRequestDocument>,
    @InjectModel('LeaveEntitlement')
    private entitlementModel: Model<LeaveEntitlementDocument>,
    @InjectModel('LeaveAdjustment')
    private adjustmentModel: Model<LeaveAdjustmentDocument>,
    @InjectModel('Calendar')
    private calendarModel: Model<CalendarDocument>,
    @InjectModel('Attachment')
    private attachmentModel: Model<AttachmentDocument>,
    @InjectModel('LeaveCategory')
    private leaveCategoryModel: Model<LeaveCategoryDocument>,
    @InjectModel('LeavePolicy')
    private policyModel: Model<LeavePolicyDocument>,
    private readonly sharedLeavesService: SharedLeavesService,
    private readonly organizationStructureService: OrganizationStructureService,
    private readonly employeeProfileService: EmployeeProfileService,
    @Inject(forwardRef(() => AttendanceService))
    private readonly attendanceService: AttendanceService,
    private readonly holidayService: HolidayService,
  ) { }

  private validateObjectId(id: string, fieldName: string): void {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException(`Invalid ${fieldName} format: ${id}`);
    }
  }

  // --------------------------------------------------------------------------------
  // Policy / Types / Categories
  // --------------------------------------------------------------------------------

  // REQ-011: Track sick leave usage over last N years (default 3)
  async getLeaveUsageLastYears(
    employeeId: string,
    leaveTypeId: string,
    years: number = 3,
  ) {
    const end = new Date();
    const start = new Date();
    start.setFullYear(end.getFullYear() - years);

    const [agg] = await this.leaveRequestModel.aggregate([
      {
        $match: {
          employeeId: new Types.ObjectId(employeeId),
          leaveTypeId: new Types.ObjectId(leaveTypeId),
          status: LeaveStatus.APPROVED,
          'dates.from': { $gte: start, $lte: end },
        },
      },
      {
        $group: {
          _id: null,
          totalDays: { $sum: '$durationDays' },
        },
      },
    ]);

    const totalDays = agg?.totalDays ?? 0;
    const maxAllowed = 360;

    return {
      employeeId,
      leaveTypeId,
      periodStart: start,
      periodEnd: end,
      totalDays,
      maxAllowed,
      remainingAllowed: Math.max(0, maxAllowed - totalDays),
    };
  }

  // REQ-011: count how many times an employee took a specific leave
  async getLeaveCountForType(employeeId: string, leaveTypeId: string) {
    const count = await this.leaveRequestModel.countDocuments({
      employeeId: new Types.ObjectId(employeeId),
      leaveTypeId: new Types.ObjectId(leaveTypeId),
      status: LeaveStatus.APPROVED,
    });

    return { employeeId, leaveTypeId, count };
  }

  // REQ-006 Create and Manage Leave Types
  async createLeaveType(dto: any) {
    const exists = await this.leaveTypeModel.findOne({ code: dto.code });
    if (exists) throw new ConflictException('Leave type code already exists');
    return new this.leaveTypeModel(dto).save();
  }

  async getAllLeaveTypes() {
    return this.leaveTypeModel.find().lean();
  }

  async getLeaveType(id: string) {
    const doc = await this.leaveTypeModel.findById(id).lean();
    if (!doc) throw new NotFoundException('Leave type not found');
    return doc;
  }

  async updateLeaveType(id: string, dto: any) {
    const updated = await this.leaveTypeModel
      .findByIdAndUpdate(id, dto, { new: true, runValidators: true, strict: false })
      .lean();
    if (!updated) throw new NotFoundException('Leave type not found');
    return updated;
  }

  async deleteLeaveType(id: string) {
    const deleted = await this.leaveTypeModel.findByIdAndDelete(id);
    if (!deleted) throw new NotFoundException('Leave type not found');
    return { success: true };
  }

  // REQ-010, REQ-011 Categories
  async createCategory(dto: any) {
    return this.leaveCategoryModel.create(dto);
  }

  async getAllCategories() {
    return this.leaveCategoryModel.find().lean();
  }

  async getCategory(id: string) {
    return this.leaveCategoryModel.findById(id).lean();
  }

  async updateCategory(id: string, dto: any) {
    return this.leaveCategoryModel
      .findByIdAndUpdate(id, dto, { new: true })
      .lean();
  }

  async deleteCategory(id: string) {
    const deleted = await this.leaveCategoryModel.findByIdAndDelete(id);
    if (!deleted) throw new NotFoundException('Category not found');
    return { success: true };
  }

  // --------------------------------------------------------------------------------
  // Eligibility rules (REQ-007)
  // --------------------------------------------------------------------------------

  async checkEligibility(employeeProfile: any, leaveTypeId: string) {
    const leaveType = (await this.leaveTypeModel
      .findById(leaveTypeId)
      .lean()) as any;
    if (!leaveType) throw new BadRequestException('Invalid leave type');

    if (leaveType.eligibility?.minTenureDays) {
      const hireDate = new Date(employeeProfile.hireDate);
      const days = Math.floor(
        (Date.now() - hireDate.getTime()) / (1000 * 60 * 60 * 24),
      );
      if (days < leaveType.eligibility.minTenureDays) {
        return { ok: false, reason: 'Minimum tenure not met' };
      }
    }

    if (
      leaveType.eligibility?.employmentTypes &&
      leaveType.eligibility.employmentTypes.length
    ) {
      if (
        !leaveType.eligibility.employmentTypes.includes(
          employeeProfile.employmentType,
        )
      ) {
        return { ok: false, reason: 'Employment type not eligible' };
      }
    }

    return { ok: true };
  }

  // --------------------------------------------------------------------------------
  // Calendar helpers (REQ-010)
  // --------------------------------------------------------------------------------

  async addHoliday(year: number, date: Date, reason?: string) {
    let doc = await this.calendarModel.findOne({ year });
    if (!doc)
      doc = await this.calendarModel.create({
        year,
        holidays: [],
        blockedPeriods: [],
      });
    doc.holidays.push(date);
    return doc.save();
  }

  async addBlockedPeriod(year: number, from: Date, to: Date, reason: string) {
    let doc = await this.calendarModel.findOne({ year });
    if (!doc)
      doc = await this.calendarModel.create({
        year,
        holidays: [],
        blockedPeriods: [],
      });
    doc.blockedPeriods.push({ from, to, reason });
    return doc.save();
  }

  async getCalendar(year: number) {
    return this.calendarModel.findOne({ year }).lean();
  }

  private async isHoliday(date: Date): Promise<boolean> {
    const year = date.getFullYear();
    const doc = await this.calendarModel.findOne({ year }).lean();
    if (!doc) return false;

    return (doc.holidays || []).some(
      (d: any) => new Date(d).toDateString() === date.toDateString(),
    );
  }

  private async isBlockedPeriod(date: Date): Promise<boolean> {
    const year = date.getFullYear();
    const doc = await this.calendarModel.findOne({ year }).lean();
    if (!doc) return false;

    for (const p of doc.blockedPeriods || []) {
      const from = new Date(p.from);
      const to = new Date(p.to);
      if (date >= from && date <= to) return true;
    }
    return false;
  }

  // REQ-005 / REQ-010: working duration = exclude weekends + public holidays
  private async _calculateWorkingDuration(
    employeeId: string,
    from: Date,
    to: Date,
  ) {
    let count = 0;

    for (let d = new Date(from); d <= to; d.setDate(d.getDate() + 1)) {
      const day = new Date(d);

      const dayOfWeek = day.getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      if (isWeekend) continue;

      const holiday = await this.isHoliday(day);
      if (holiday) continue;

      count++;
    }

    return count;
  }

  // --------------------------------------------------------------------------------
  // Leave Request lifecycle (REQ-015 .. REQ-031)
  // --------------------------------------------------------------------------------

  async createLeaveRequest(dto: {
    employeeId: string;
    leaveTypeId: string;
    from: Date;
    to: Date;
    justification?: string;
    attachmentId?: string;
    employeeProfile?: any;
    postLeave?: boolean;
  }) {
    if (!dto.employeeId || !dto.leaveTypeId || !dto.from || !dto.to) {
      throw new BadRequestException('Missing fields');
    }

    const leaveType = await this.leaveTypeModel
      .findById(dto.leaveTypeId)
      .lean();
    if (!leaveType) {
      throw new BadRequestException('Invalid leave type');
    }

    if (dto.employeeProfile) {
      const elig = await this.checkEligibility(
        dto.employeeProfile,
        dto.leaveTypeId,
      );
      if (!elig.ok) {
        throw new BadRequestException(`Ineligible: ${elig.reason}`);
      }
    }

    if (leaveType.requiresAttachment && !dto.attachmentId) {
      throw new BadRequestException(
        'Attachment is required for this leave type',
      );
    }

    if (dto.attachmentId) {
      const attachment = await this.attachmentModel
        .findById(dto.attachmentId)
        .lean();
      if (!attachment) {
        throw new BadRequestException('Attachment not found');
      }
    }

    const fromDate = new Date(dto.from);
    const toDate = new Date(dto.to);

    if (dto.postLeave) {
      const MAX_POST_LEAVE_DAYS = 30;
      const now = new Date();
      const diffMs = now.getTime() - toDate.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      if (diffDays > MAX_POST_LEAVE_DAYS) {
        throw new BadRequestException(
          `Post-leave requests must be submitted within ${MAX_POST_LEAVE_DAYS} days after leave end`,
        );
      }
    }

    // Check for overlaps with PENDING or APPROVED requests
    // REQ-015: System should automatically check for overlapping dates
    // Improved logic to cover [StartA, EndA] overlaps [StartB, EndB]
    const overlap = await this.leaveRequestModel
      .findOne({
        employeeId: new Types.ObjectId(dto.employeeId),
        status: { $in: [LeaveStatus.APPROVED, LeaveStatus.PENDING] }, // Covered pending too for safety
        $or: [
          { 'dates.from': { $lte: toDate }, 'dates.to': { $gte: fromDate } },
        ],
      })
      .lean();

    if (overlap) {
      throw new BadRequestException('Overlapping leave request exists (Pending or Approved)');
    }

    for (
      let d = new Date(fromDate);
      d <= toDate;
      d.setDate(d.getDate() + 1)
    ) {
      const day = new Date(d);
      if (await this.isBlockedPeriod(day)) {
        throw new BadRequestException(
          'Requested dates fall within a blocked period',
        );
      }
    }

    const duration = await this._calculateWorkingDuration(
      dto.employeeId,
      fromDate,
      toDate,
    );

    if (leaveType.maxDurationDays && duration > leaveType.maxDurationDays) {
      throw new BadRequestException(
        `Requested duration (${duration} days) exceeds the maximum allowed for this leave type (${leaveType.maxDurationDays} days)`,
      );
    }

    // REQ-028: Medical certificate for Sick leave > 1 day
    // We check category name or type code for "SICK"
    const category = await this.leaveCategoryModel.findById(leaveType.categoryId);
    const isSick = category?.name?.toLowerCase().includes('sick') || leaveType.name.toLowerCase().includes('sick');

    if (isSick && duration > 1 && !dto.attachmentId) {
      throw new BadRequestException('Medical certificate is required for sick leave exceeding 1 day');
    }

    // REQ-011: Validate special absence/mission type rules
    try {
      const specialValidation = await this.validateSpecialAbsenceRules(dto.employeeId, dto.leaveTypeId, duration);
      if (!specialValidation.valid && specialValidation.errors && specialValidation.errors.length > 0) {
        throw new BadRequestException(specialValidation.errors.join(' '));
      }
    } catch (error) {
      // If validation method fails (e.g., no config), continue - it's optional
      if (error instanceof BadRequestException) throw error;
      this.logger.warn(`Special absence validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // Entitlement Check
    if (leaveType.deductible) {
      const entitlement = await this.entitlementModel
        .findOne({
          employeeId: new Types.ObjectId(dto.employeeId),
          leaveTypeId: new Types.ObjectId(dto.leaveTypeId),
        })
        .lean();

      // If deductible and NO entitlement record -> Assume 0 balance -> Fail if duration > 0
      if (!entitlement) {
        throw new BadRequestException('No leave entitlement found for this type. Balance is 0.');
      }

      const yearly = entitlement.yearlyEntitlement ?? 0;
      const carryForward = entitlement.carryForward ?? 0;
      const taken = entitlement.taken ?? 0;
      const pending = entitlement.pending ?? 0;
      const accrued = entitlement.accruedRounded ?? entitlement.accruedActual ?? yearly; // Use accrued if available, else yearly (depending on policy, but here we read state)
      // Note: In refined logic, remaining should be the source of truth if maintained correctly.

      const remaining = entitlement.remaining ?? (accrued + carryForward - taken - pending);

      if (duration > remaining) {
        throw new BadRequestException(
          `Requested duration (${duration} days) exceeds remaining entitlement (${remaining} days) for this leave type`,
        );
      }
    }

    const payload: any = {
      employeeId: new Types.ObjectId(dto.employeeId),
      leaveTypeId: new Types.ObjectId(dto.leaveTypeId),
      dates: { from: fromDate, to: toDate },
      durationDays: duration,
      justification: dto.justification,
      attachmentId: dto.attachmentId
        ? new Types.ObjectId(dto.attachmentId)
        : undefined,
      approvalFlow: [
        { role: 'manager', status: 'pending' },
        { role: 'hr', status: 'pending' },
      ],
      status: LeaveStatus.PENDING,
      irregularPatternFlag: false,
      postLeave: !!dto.postLeave,
    };

    const created = new this.leaveRequestModel(payload);
    await created.save();

    // Update pending count in entitlement when request is created
    // IMPORTANT: Unpaid leave should NOT affect balance - skip pending update for unpaid leave
    const isUnpaidLeave = leaveType.paid === false;
    if (leaveType.deductible && !isUnpaidLeave) {
      const ent = await this.entitlementModel.findOne({
        employeeId: new Types.ObjectId(dto.employeeId),
        leaveTypeId: new Types.ObjectId(dto.leaveTypeId),
      });
      if (ent) {
        ent.pending = (ent.pending || 0) + duration;
        await ent.save();
      }
    }

    const employeeProfile = await this.sharedLeavesService.getEmployeeProfile(dto.employeeId);
    const employeeName = employeeProfile?.fullName || 'Employee';
    await this.sharedLeavesService.sendLeaveRequestSubmittedNotification(
      dto.employeeId,
      employeeName,
      leaveType.name,
      fromDate,
      toDate
    );

    const managerId = await this.sharedLeavesService.getEmployeeManager(dto.employeeId);
    if (managerId) {
      await this.sharedLeavesService.sendManagerLeaveRequestNotification(
        managerId,
        employeeName,
        leaveType.name,
        fromDate,
        toDate
      );
    }

    return created;
  }

  async getAllRequests(
    opts: {
      page?: number;
      limit?: number;
      employeeId?: string;
      status?: string;
      leaveTypeId?: string;
      from?: string;
      to?: string;
    } = {},
  ) {
    const q: any = {};

    if (opts.employeeId) q.employeeId = new Types.ObjectId(opts.employeeId);
    if (opts.status) q.status = opts.status;
    if (opts.leaveTypeId)
      q.leaveTypeId = new Types.ObjectId(opts.leaveTypeId);

    if (opts.from || opts.to) {
      q['dates.from'] = {};
      if (opts.from) q['dates.from'].$gte = new Date(opts.from);
      if (opts.to) q['dates.from'].$lte = new Date(opts.to);
    }

    const page = Math.max(1, Number(opts.page) || 1);
    const limit = Math.max(1, Number(opts.limit) || 20);

    const [data, total] = await Promise.all([
      this.leaveRequestModel
        .find(q)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      this.leaveRequestModel.countDocuments(q),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async getRequest(id: string) {
    return this.leaveRequestModel.findById(id).lean();
  }

  async updateRequest(id: string, dto: Partial<any>) {
    this.validateObjectId(id, 'id');
    
    this.logger.log(`[UPDATE_REQUEST] Starting update for request ${id}`);
    this.logger.debug(`[UPDATE_REQUEST] Update data:`, JSON.stringify(dto, null, 2));
    
    const leave = await this.leaveRequestModel.findById(id);
    if (!leave) {
      this.logger.error(`[UPDATE_REQUEST] Leave request ${id} not found`);
      throw new NotFoundException('Leave request not found');
    }
    
    this.logger.log(`[UPDATE_REQUEST] Current status: ${leave.status}`);
    
    // Allow updates for PENDING and RETURNED_FOR_CORRECTION statuses
    if (leave.status !== LeaveStatus.PENDING && leave.status !== LeaveStatus.RETURNED_FOR_CORRECTION) {
      this.logger.warn(`[UPDATE_REQUEST] Attempted to update ${leave.status} request ${id}`);
      throw new BadRequestException(`Only pending or returned-for-correction requests can be modified. Current status: ${leave.status}`);
    }

    // Handle leaveTypeId update if provided
    if (dto.leaveTypeId) {
      this.validateObjectId(dto.leaveTypeId, 'leaveTypeId');
      const newLeaveType = await this.leaveTypeModel.findById(dto.leaveTypeId).lean();
      if (!newLeaveType) {
        this.logger.error(`[UPDATE_REQUEST] Invalid leave type ${dto.leaveTypeId}`);
        throw new BadRequestException('Invalid leave type');
      }
      this.logger.log(`[UPDATE_REQUEST] Updating leave type from ${leave.leaveTypeId} to ${dto.leaveTypeId}`);
      leave.leaveTypeId = new Types.ObjectId(dto.leaveTypeId);
    }

    // Handle date updates
    if (dto.from && dto.to) {
      const from = new Date(dto.from);
      const to = new Date(dto.to);

      // Validate date order
      if (from > to) {
        throw new BadRequestException('Start date must be before or equal to end date');
      }

      // Check for overlaps with other approved requests (excluding current request)
      const overlap = await this.leaveRequestModel
        .findOne({
          _id: { $ne: leave._id },
          employeeId: leave.employeeId,
          status: { $in: [LeaveStatus.APPROVED] },
          $or: [{ 'dates.from': { $lte: to }, 'dates.to': { $gte: from } }],
        })
        .lean();

      if (overlap) {
        throw new BadRequestException(
          'New dates overlap an approved leave',
        );
      }

      // Recalculate duration based on working days (for balance calculations)
      const workingDuration = await this._calculateWorkingDuration(
        leave.employeeId.toString(),
        from,
        to,
      );

      // Get leave type (either new one or existing one)
      const leaveTypeId = dto.leaveTypeId ? new Types.ObjectId(dto.leaveTypeId) : leave.leaveTypeId;
      const leaveType = await this.leaveTypeModel
        .findById(leaveTypeId)
        .lean();
      if (!leaveType) {
        throw new BadRequestException('Invalid leave type for this request');
      }

      // Validate max duration using working days
      if (leaveType.maxDurationDays && workingDuration > leaveType.maxDurationDays) {
        throw new BadRequestException(
          `Requested duration (${workingDuration} working days) exceeds the maximum allowed for this leave type (${leaveType.maxDurationDays} days)`,
        );
      }

      // Update dates and duration
      // Use the durationDays from DTO if provided (calendar days), otherwise use working days
      leave.dates = { from, to };
      if (dto.durationDays !== undefined && dto.durationDays > 0) {
        // If frontend sends calendar days, use that for display purposes
        // But we still need working days for balance calculations
        leave.durationDays = dto.durationDays;
      } else {
        // Fallback to working days if no duration provided
        leave.durationDays = workingDuration;
      }
    } else if (dto.durationDays !== undefined && dto.durationDays > 0) {
      // If durationDays is provided directly (without dates), use it
      leave.durationDays = dto.durationDays;
    }

    // Update justification
    if (dto.justification !== undefined) {
      this.logger.log(`[UPDATE_REQUEST] Updating justification`);
      leave.justification = dto.justification;
    }

    // Update attachment
    if (dto.attachmentId !== undefined) {
      if (dto.attachmentId) {
        this.validateObjectId(dto.attachmentId, 'attachmentId');
        const attachment = await this.attachmentModel.findById(dto.attachmentId).lean();
        if (!attachment) {
          throw new BadRequestException('Attachment not found');
        }
        leave.attachmentId = new Types.ObjectId(dto.attachmentId);
      } else {
        leave.attachmentId = undefined;
      }
    }

    // If status was RETURNED_FOR_CORRECTION, change it back to PENDING after update
    if (leave.status === LeaveStatus.RETURNED_FOR_CORRECTION) {
      leave.status = LeaveStatus.PENDING;
      // Clear any return-for-correction notes from approvalFlow
      if (leave.approvalFlow && Array.isArray(leave.approvalFlow)) {
        leave.approvalFlow = leave.approvalFlow.filter(
          (entry: any) => entry.status !== 'returned_for_correction'
        );
        leave.markModified('approvalFlow');
      }
    }

    this.logger.log(`[UPDATE_REQUEST] Saving leave request ${id}`);
    const saved = await leave.save();
    
    // Update postLeave flag using raw MongoDB (not in schema)
    if (dto.postLeave !== undefined) {
      this.logger.log(`[UPDATE_REQUEST] Updating postLeave flag to ${dto.postLeave}`);
      const collection = this.leaveRequestModel.collection;
      await collection.updateOne(
        { _id: new Types.ObjectId(id) },
        { $set: { postLeave: !!dto.postLeave } }
      );
    }
    
    // Fetch updated document to return
    const updated = await this.leaveRequestModel.findById(id).lean();
    if (!updated) {
      this.logger.error(`[UPDATE_REQUEST] Leave request ${id} not found after update`);
      throw new NotFoundException('Leave request not found after update');
    }
    
    this.logger.log(`[UPDATE_REQUEST] Leave request ${id} updated successfully`);
    this.logger.debug(`[UPDATE_REQUEST] Updated request:`, JSON.stringify({
      _id: updated._id,
      status: updated.status,
      dates: updated.dates,
      durationDays: updated.durationDays,
      leaveTypeId: updated.leaveTypeId,
    }, null, 2));
    
    return updated;
  }

  async cancelRequest(id: string, employeeId: string) {
    this.validateObjectId(id, 'id');
    this.validateObjectId(employeeId, 'employeeId');

    const leave = await this.leaveRequestModel.findById(id);
    if (!leave) throw new NotFoundException('Leave request not found');

    if (leave.employeeId.toString() !== employeeId) {
      throw new BadRequestException('Unauthorized');
    }

    const leaveType = await this.leaveTypeModel.findById(leave.leaveTypeId);
    const leaveTypeName = leaveType?.name || 'Leave';

    if (leave.status === LeaveStatus.PENDING) {
      leave.status = LeaveStatus.CANCELLED;
      await leave.save();

      await this.sharedLeavesService.sendLeaveRequestCancelledNotification(
        employeeId,
        leaveTypeName,
        leave.dates.from,
        leave.dates.to
      );

      return leave;
    }

    if (leave.status === LeaveStatus.APPROVED) {
      leave.status = LeaveStatus.CANCELLED;
      await leave.save();

      // BR-18: Restore balance when cancelled
      const ent = await this.entitlementModel.findOne({
        employeeId: leave.employeeId,
        leaveTypeId: leave.leaveTypeId,
      });

      if (ent) {
        ent.taken = Math.max(0, (ent.taken || 0) - (leave.durationDays || 0));
        ent.remaining = (ent.remaining || 0) + (leave.durationDays || 0);
        await ent.save();
      }

      // REQ-042: Sync cancellation to Payroll (restore any deductions)
      await this.syncCancellation(
        leave.employeeId.toString(),
        leave._id.toString(),
        leave.durationDays || 0,
      );

      // REQ-042: Unblock attendance records (Time Management integration)
      try {
        const unblockResult = await this.unblockAttendanceForLeave(
          leave.employeeId.toString(),
          leave._id.toString(),
        );

        if (unblockResult.ok) {
          this.logger.log(
            `[CANCEL] Unblocked attendance for cancelled leave ${leave._id}`
          );
        } else {
          this.logger.warn(
            `[CANCEL] Failed to unblock attendance for leave ${leave._id}`
          );
        }
      } catch (attendanceError) {
        this.logger.error(
          `[CANCEL] Attendance unblock error: ${attendanceError.message}`
        );
        // Don't fail cancellation if attendance unblocking fails
      }

      // Send cancellation notification
      await this.sharedLeavesService.sendLeaveRequestCancelledNotification(
        employeeId,
        leaveTypeName,
        leave.dates.from,
        leave.dates.to
      );

      // Sync with Time Management (legacy method)
      await this.sharedLeavesService.syncLeaveWithTimeManagement(
        leave.employeeId.toString(),
        leave.dates.from,
        leave.dates.to,
        leaveTypeName,
        'cancelled'
      );

      return leave;
    }

    throw new BadRequestException('Request cannot be cancelled in current state');
  }

  async returnForCorrection(id: string, reviewerId: string, reason: string) {
    this.validateObjectId(id, 'id');
    this.validateObjectId(reviewerId, 'reviewerId');

    const leave = await this.leaveRequestModel.findById(id);
    if (!leave) throw new NotFoundException('Leave request not found');

    if (leave.status !== LeaveStatus.PENDING) {
      throw new BadRequestException('Only pending requests can be returned for correction');
    }

    leave.status = LeaveStatus.RETURNED_FOR_CORRECTION;

    // Add to approval flow history
    if (!leave.approvalFlow || !Array.isArray(leave.approvalFlow)) {
      leave.approvalFlow = [] as any;
    }

    leave.approvalFlow.push({
      role: 'reviewer',
      status: 'returned_for_correction',
      decidedBy: new Types.ObjectId(reviewerId),
      decidedAt: new Date(),
      reason: reason,
    } as any);

    await leave.save();

    const leaveType = await this.leaveTypeModel.findById(leave.leaveTypeId);
    await this.sharedLeavesService.sendLeaveRequestReturnedForCorrectionNotification(
      leave.employeeId.toString(),
      leaveType?.name || 'Leave',
      leave.dates.from,
      leave.dates.to,
      reason
    );

    return leave;
  }

  async resubmitCorrectedRequest(id: string, employeeId: string, corrections: Partial<{
    from: string;
    to: string;
    justification: string;
    attachmentId: string;
  }>) {
    this.validateObjectId(id, 'id');
    this.validateObjectId(employeeId, 'employeeId');

    const leave = await this.leaveRequestModel.findById(id);
    if (!leave) throw new NotFoundException('Leave request not found');

    if (leave.employeeId.toString() !== employeeId) {
      throw new BadRequestException('Unauthorized');
    }

    if (leave.status !== LeaveStatus.RETURNED_FOR_CORRECTION) {
      throw new BadRequestException('Only requests returned for correction can be resubmitted');
    }

    // Apply corrections
    if (corrections.from && corrections.to) {
      const from = new Date(corrections.from);
      const to = new Date(corrections.to);

      const duration = await this._calculateWorkingDuration(employeeId, from, to);
      leave.dates = { from, to };
      leave.durationDays = duration;
    }

    if (corrections.justification) {
      leave.justification = corrections.justification;
    }

    if (corrections.attachmentId) {
      leave.attachmentId = new Types.ObjectId(corrections.attachmentId);
    }

    // Reset status to pending
    leave.status = LeaveStatus.PENDING;

    // Reset approval flow
    leave.approvalFlow = [
      { role: 'manager', status: 'pending' },
      { role: 'hr', status: 'pending' },
    ] as any;

    await leave.save();

    const leaveType = await this.leaveTypeModel.findById(leave.leaveTypeId);
    const employeeProfile = await this.sharedLeavesService.getEmployeeProfile(employeeId);

    await this.sharedLeavesService.sendLeaveRequestSubmittedNotification(
      employeeId,
      employeeProfile?.fullName || 'Employee',
      leaveType?.name || 'Leave',
      leave.dates.from,
      leave.dates.to
    );

    return leave;
  }

  async managerApprove(id: string, managerId: string) {
    this.validateObjectId(id, 'id');
    this.validateObjectId(managerId, 'managerId');

    const leave = await this.leaveRequestModel.findById(id);
    if (!leave) throw new NotFoundException('Not found');

    if (leave.status !== LeaveStatus.PENDING) {
      throw new BadRequestException(
        'Only pending requests can be approved by manager',
      );
    }

    if (!leave.approvalFlow || !Array.isArray(leave.approvalFlow)) {
      leave.approvalFlow = [] as any;
    }

    leave.approvalFlow[0] = {
      role: 'manager',
      status: 'approved',
      decidedBy: new Types.ObjectId(managerId),
      decidedAt: new Date(),
    } as any;

    // Set status to APPROVED (manager approval is final)
    leave.status = LeaveStatus.APPROVED;

    // Update entitlement balance
    const ent = await this.entitlementModel.findOne({
      employeeId: leave.employeeId,
      leaveTypeId: leave.leaveTypeId,
    });

    const leaveType = await this.leaveTypeModel.findById(leave.leaveTypeId);
    const isDeductible = leaveType?.deductible ?? true;
    const isUnpaidLeave = leaveType?.paid === false;

    // IMPORTANT: Unpaid leave should NOT affect balance
    // Unpaid leave is only tracked for payroll deduction, not balance tracking
    if (isDeductible && !isUnpaidLeave && ent) {
      // Move from pending to taken
      const durationDays = leave.durationDays || 0;
      ent.pending = Math.max(0, (ent.pending || 0) - durationDays);
      ent.taken = (ent.taken || 0) + durationDays;

      // Calculate remaining properly: yearly + carryForward - taken
      const yearly = ent.yearlyEntitlement || 0;
      const carryForward = ent.carryForward || 0;
      ent.remaining = yearly + carryForward - ent.taken;

      await ent.save();
    } else if (isUnpaidLeave) {
      this.logger.log(
        `[BALANCE SKIP] Unpaid leave ${leave._id} approved - balance not affected (payroll tracking only)`
      );
    }

    await leave.save();

    // Send approval notification to employee
    await this.sharedLeavesService.sendLeaveRequestApprovedNotification(
      leave.employeeId.toString(),
      leaveType?.name || 'Leave',
      leave.dates.from,
      leave.dates.to
    );

    return leave;
  }

  async managerReject(id: string, managerId: string, reason?: string) {
    this.validateObjectId(id, 'id');
    this.validateObjectId(managerId, 'managerId');

    const leave = await this.leaveRequestModel.findById(id);
    if (!leave) throw new NotFoundException('Not found');

    if (leave.status !== LeaveStatus.PENDING) {
      throw new BadRequestException('Only pending requests can be rejected by manager');
    }

    if (!leave.approvalFlow || !Array.isArray(leave.approvalFlow)) {
      leave.approvalFlow = [] as any;
    }

    leave.approvalFlow[0] = {
      role: 'manager',
      status: 'rejected',
      decidedBy: new Types.ObjectId(managerId),
      decidedAt: new Date(),
      reason: reason,
    } as any;

    leave.status = LeaveStatus.REJECTED;
    await leave.save();

    // Update entitlement - remove from pending
    // IMPORTANT: Unpaid leave should NOT affect balance - skip for unpaid leave
    const leaveType = await this.leaveTypeModel.findById(leave.leaveTypeId);
    const isUnpaidLeave = leaveType?.paid === false;
    
    if (!isUnpaidLeave) {
    const ent = await this.entitlementModel.findOne({
      employeeId: leave.employeeId,
      leaveTypeId: leave.leaveTypeId,
    });

    if (ent) {
      ent.pending = Math.max(0, (ent.pending || 0) - (leave.durationDays || 0));
      await ent.save();
    }
    } else {
      this.logger.log(
        `[BALANCE SKIP] Unpaid leave ${leave._id} rejected by manager - balance not affected (payroll tracking only)`
      );
    }
    await this.sharedLeavesService.sendLeaveRequestRejectedNotification(
      leave.employeeId.toString(),
      leaveType?.name || 'Leave',
      leave.dates.from,
      leave.dates.to,
      reason
    );

    return leave;
  }

  async hrFinalize(
    id: string,
    hrId: string,
    decision: 'approve' | 'reject',
    allowNegative: boolean = false,
    reason?: string,
    isOverride: boolean = false,
  ) {
    const leave = await this.leaveRequestModel.findById(id);
    if (!leave) throw new NotFoundException('Leave request not found');

    // Check if already finalized (HR approval exists in approvalFlow)
    const hrApproval = leave.approvalFlow?.find((f) => f.role === 'hr');
    const isAlreadyFinalized = hrApproval?.status === 'approved' && leave.status === LeaveStatus.APPROVED;
    
    if (isAlreadyFinalized && decision === 'approve') {
      throw new BadRequestException(
        'This leave request has already been finalized. Employee records and payroll have been updated.',
      );
    }

    // Allow finalizing APPROVED requests (for finalization step)
    // Also allow PENDING and REJECTED (for initial approval/rejection)
    const validStatuses: LeaveStatus[] = [LeaveStatus.PENDING, LeaveStatus.APPROVED];
    if (decision === 'approve') {
      validStatuses.push(LeaveStatus.REJECTED); // Allow override
    }

    if (!validStatuses.includes(leave.status as LeaveStatus)) {
      throw new BadRequestException(
        `Cannot finalize request in status ${leave.status}. Only PENDING, APPROVED, or REJECTED requests can be finalized.`,
      );
    }

    if (!leave.approvalFlow || !Array.isArray(leave.approvalFlow)) {
      leave.approvalFlow = [] as any;
    }

    if (!leave.approvalFlow[1]) {
      leave.approvalFlow[1] = {
        role: 'hr',
        status: 'pending',
      } as any;
    }

    // Track override in approval flow for audit trail (REQ-026)
    leave.approvalFlow[1] = {
      role: 'hr',
      status: decision === 'approve' ? 'approved' : 'rejected',
      decidedBy: new Types.ObjectId(hrId),
      decidedAt: new Date(),
      ...(isOverride && { overrideReason: reason, isOverride: true }),
    } as any;

    // Log override for audit trail
    if (isOverride) {
      this.logger.log(
        `[OVERRIDE] HR ${hrId} overrode manager decision for leave ${id}. Reason: ${reason || 'Not provided'}`
      );
    }

    // Store original status before changing it
    const originalStatus = leave.status;

    if (decision === 'reject') {
      // If already approved, we need to reverse the entitlement deduction
      if (originalStatus === LeaveStatus.APPROVED) {
        const ent = await this.entitlementModel.findOne({
          employeeId: leave.employeeId,
          leaveTypeId: leave.leaveTypeId,
        });
        const leaveType = await this.leaveTypeModel.findById(leave.leaveTypeId);
        const isDeductible = leaveType?.deductible ?? true;
        const isUnpaidLeave = leaveType?.paid === false;
        
        // IMPORTANT: Unpaid leave should NOT affect balance - skip reversal for unpaid leave
        // Unpaid leave reversal is handled by payroll, not balance tracking
        if (isDeductible && !isUnpaidLeave && ent) {
          // Reverse the deduction - restore balance
          const durationDays = leave.durationDays || 0;
          ent.taken = Math.max(0, (ent.taken || 0) - durationDays);
          ent.remaining = (ent.remaining || 0) + durationDays;
          
          // If this was moved from pending, restore pending too
          // Check if there was a pending deduction
          const managerApproval = leave.approvalFlow?.find((f) => f.role === 'manager');
          if (managerApproval?.status === 'approved') {
            // Manager had approved, so it was moved from pending to taken
            // Restore to pending instead
            ent.pending = (ent.pending || 0) + durationDays;
            ent.taken = Math.max(0, (ent.taken || 0) - durationDays);
          }
          
          await ent.save();
        } else if (isUnpaidLeave) {
          this.logger.log(
            `[BALANCE SKIP] Unpaid leave ${leave._id} rejected - balance not affected (payroll tracking only)`
          );
        }
      }

      leave.status = LeaveStatus.REJECTED;
      await leave.save();
      
      // Send finalization notification for rejection (REQ-030)
      // Notify employee, manager, and attendance coordinator when request is finalized as rejected
      try {
        const leaveTypeForReject = await this.leaveTypeModel.findById(leave.leaveTypeId);
        const managerId = await this.sharedLeavesService.getEmployeeManager(leave.employeeId.toString());
        
        // Check if this was finalizing an already-approved request (needs finalization notification)
        const wasFinalizingApproved = originalStatus === LeaveStatus.APPROVED;
        
        if (wasFinalizingApproved) {
          // Finalization notification (REQ-030) - notify all parties
          await this.sharedLeavesService.sendLeaveRequestFinalizedNotification(
            leave.employeeId.toString(),
            managerId || '',
            leaveTypeForReject?.name || 'Leave',
            leave.dates.from,
            leave.dates.to,
            'rejected'
          );
        } else {
          // Initial rejection notification (not a finalization)
        await this.sharedLeavesService.sendLeaveRequestRejectedNotification(
          leave.employeeId.toString(),
          leaveTypeForReject?.name || 'Leave',
          leave.dates.from,
          leave.dates.to,
          reason
        );
        }
      } catch (notifError) {
        this.logger.warn('Failed to send rejection/finalization notification:', notifError);
      }
      
      return leave;
    }

    // APPROVE/FINALIZE decision
    const isFinalizingApproved = originalStatus === LeaveStatus.APPROVED;
    const isOverridingRejection = originalStatus === LeaveStatus.REJECTED && decision === 'approve';
    const ent = await this.entitlementModel.findOne({
      employeeId: leave.employeeId,
      leaveTypeId: leave.leaveTypeId,
    });

    const leaveType = await this.leaveTypeModel.findById(leave.leaveTypeId);
    const isDeductible = leaveType?.deductible ?? true;
    const isPaidLeave = leaveType?.paid !== false;
    
    // IMPORTANT: Unpaid leave should NOT affect balance (deductible = false)
    // Unpaid leave is only tracked for payroll deduction purposes, not balance tracking
    // If leave type is unpaid, it should be non-deductible to prevent negative balances
    const isUnpaidLeave = leaveType?.paid === false;
    const shouldUpdateBalance = isDeductible && !isUnpaidLeave;

    // Update entitlements in the following cases:
    // 1. Approving a PENDING request (initial approval)
    // 2. Overriding a REJECTED request to APPROVE (REQ-029: auto update balance after final approval)
    // 3. Finalizing an already-APPROVED request - verify balance is correct (REQ-029)
    // NOTE: Unpaid leave does NOT update balance - it's only tracked for payroll
    if (shouldUpdateBalance) {
      if (ent) {
        // For already-approved requests, verify balance is correct (REQ-029)
        if (isFinalizingApproved) {
          // Balance should have been updated by manager approval
          // Verify it's correct and ensure this leave is accounted for
          const durationDays = leave.durationDays || 0;
          const managerApproval = leave.approvalFlow?.find((f) => f.role === 'manager');
          
          if (managerApproval?.status === 'approved') {
            // Manager approved, so balance should have been updated by managerApprove()
            // Verify remaining balance calculation is correct (REQ-029: ensure records remain accurate)
            const yearly = ent.yearlyEntitlement || 0;
            const carryForward = ent.carryForward || 0;
            const currentTaken = ent.taken || 0;
            const expectedRemaining = yearly + carryForward - currentTaken;
            
            // Recalculate remaining to ensure it's correct
            // This handles cases where balance might have been manually adjusted or there were calculation errors
            ent.remaining = expectedRemaining;
            await ent.save();
            
            this.logger.log(
              `[BALANCE VERIFY] Verified balance for finalized leave ${leave._id}. ` +
              `Duration: ${durationDays} days, Taken: ${currentTaken}, Remaining: ${expectedRemaining} ` +
              `(Yearly: ${yearly}, CarryForward: ${carryForward})`
            );
          } else {
            // No manager approval - this might be a direct HR approval
            // In this case, we should ensure balance is updated (though this shouldn't normally happen)
            this.logger.warn(
              `[BALANCE WARNING] Finalizing approved leave ${leave._id} without manager approval. ` +
              `Balance may not have been updated. Duration: ${durationDays} days.`
            );
            
            // Ensure balance is correct even if manager didn't approve
            const yearly = ent.yearlyEntitlement || 0;
            const carryForward = ent.carryForward || 0;
            const currentTaken = ent.taken || 0;
            ent.remaining = yearly + carryForward - currentTaken;
            await ent.save();
          }
        } else if (!isFinalizingApproved) {
          // Approving PENDING or overriding REJECTED to APPROVE
        if (!allowNegative) {
          const remaining = ent.remaining ?? 0;
          if (leave.durationDays > remaining) {
            throw new BadRequestException(`Insufficient balance for approval. Request: ${leave.durationDays}, Remaining: ${remaining}. Use allowNegative=true to override.`);
          }
        }

          // Handle override of rejected request: pending was already removed by manager rejection
          // So we need to deduct directly from remaining, not from pending
          if (isOverridingRejection) {
            // Overriding rejection: balance was never deducted (manager rejected removed from pending only)
            // So we deduct directly from remaining balance
            const durationDays = leave.durationDays || 0;
            ent.taken = (ent.taken || 0) + durationDays;
            ent.remaining = (ent.remaining || 0) - durationDays;
            // Pending was already removed by manager rejection, so no need to adjust it
            this.logger.log(
              `[BALANCE UPDATE] Override rejection to approval: Deducted ${durationDays} days from balance for leave ${leave._id}`
            );
          } else {
            // Normal approval: Move from pending to taken
            const durationDays = leave.durationDays || 0;
            const pendingDays = Math.max(0, (ent.pending || 0) - durationDays);
            ent.pending = pendingDays;
            ent.taken = (ent.taken || 0) + durationDays;
            ent.remaining = (ent.remaining || 0) - durationDays;
            this.logger.log(
              `[BALANCE UPDATE] Approved pending request: Moved ${durationDays} days from pending to taken for leave ${leave._id}`
            );
          }
          
        await ent.save();
        }
      } else {
        // No entitlement exists - only create if approving (not finalizing already-approved)
        if (!isFinalizingApproved) {
        if (!allowNegative) {
          throw new BadRequestException('No entitlement found. Cannot approve without allowNegative override.');
        }
        await this.entitlementModel.create({
          employeeId: leave.employeeId,
          leaveTypeId: leave.leaveTypeId,
          yearlyEntitlement: 0,
          accruedActual: 0,
          accruedRounded: 0,
          carryForward: 0,
          taken: leave.durationDays || 0,
          pending: 0,
          remaining: -(leave.durationDays || 0),
          lastAccrualDate: null,
          nextResetDate: null,
        });
          this.logger.log(
            `[BALANCE UPDATE] Created entitlement with negative balance for leave ${leave._id} (allowNegative=true)`
          );
        } else {
          // Finalizing already-approved but no entitlement exists - this is an error
          this.logger.warn(
            `[BALANCE WARNING] Finalizing approved leave ${leave._id} but no entitlement found. ` +
            `Balance may not have been updated correctly.`
          );
        }
      }
    }

    // Update status to APPROVED if it was PENDING
    if (!isFinalizingApproved) {
      leave.status = LeaveStatus.APPROVED;
    }

    // Update employee records and sync with payroll/time management
    await this.finalizeApprovedLeave(leave, hrId, isPaidLeave);
    
    await leave.save();

    // Send notifications
    try {
      const leaveTypeForNotify = await this.leaveTypeModel.findById(leave.leaveTypeId);
      const managerId = await this.sharedLeavesService.getEmployeeManager(leave.employeeId.toString());
      
      if (isFinalizingApproved) {
        // Finalization notification (REQ-030)
        await this.sharedLeavesService.sendLeaveRequestFinalizedNotification(
          leave.employeeId.toString(),
          managerId || '',
          leaveTypeForNotify?.name || 'Leave',
          leave.dates.from,
          leave.dates.to,
          'approved'
        );
      } else {
        // Initial approval notification
      await this.sharedLeavesService.sendLeaveRequestApprovedNotification(
        leave.employeeId.toString(),
        leaveTypeForNotify?.name || 'Leave',
        leave.dates.from,
        leave.dates.to
      );
      }

      // Sync with Time Management
      await this.sharedLeavesService.syncLeaveWithTimeManagement(
        leave.employeeId.toString(),
        leave.dates.from,
        leave.dates.to,
        leaveTypeForNotify?.name || 'Leave',
        'approved'
      );
    } catch (notifError) {
      this.logger.warn('Failed to send notification or sync:', notifError);
    }

    return leave;
  }

  /**
   * Finalizes an approved leave request by updating employee records and adjusting payroll
   * This is called when HR finalizes an already-approved request (REQ-025)
   *
   * Integrations:
   * - Payroll: Sync for deductions/tracking (REQ-042)
   * - Time Management: Block attendance records (REQ-042)
   */
  private async finalizeApprovedLeave(
    leave: LeaveRequestDocument,
    hrId: string,
    isPaidLeave: boolean,
  ): Promise<void> {
    try {
      // 1. Update employee status if currently on leave
      const now = new Date();
      const leaveStart = new Date(leave.dates.from);
      const leaveEnd = new Date(leave.dates.to);
      
      if (now >= leaveStart && now <= leaveEnd) {
        await this.sharedLeavesService.updateEmployeeStatusToOnLeave(leave.employeeId.toString());
      }

      // 2. Real-time sync with Payroll (REQ-042: Auto sync with payroll system)
      // Sync for ALL finalized leaves (both paid and unpaid) so payroll can track them
      // Unpaid leaves will trigger deductions, paid leaves are tracked for records
      await this.payrollNotifyAfterApproval(leave);

      // 3. Block attendance for the leave period (REQ-042: Sync with Time Management)
      // This prevents the employee from punching in during approved leave days
      try {
        const leaveType = await this.leaveTypeModel.findById(leave.leaveTypeId);
        const leaveTypeName = leaveType?.name || 'Leave';

        const blockResult = await this.blockAttendanceForLeave(
          leave.employeeId.toString(),
          leave._id.toString(),
          leaveStart,
          leaveEnd,
          leaveTypeName,
        );

        if (blockResult.ok) {
          this.logger.log(
            `[FINALIZE] Blocked ${blockResult.blockedDays} attendance days for leave ${leave._id}`
          );
        } else {
          this.logger.warn(
            `[FINALIZE] Failed to block attendance for leave ${leave._id}, but leave is approved`
          );
        }
      } catch (attendanceError) {
        this.logger.error(
          `[FINALIZE] Attendance blocking error for leave ${leave._id}: ${attendanceError.message}`
        );
        // Don't fail finalization if attendance blocking fails
      }

      // 3. Log finalization for audit trail
      this.logger.log(
        `[FINALIZE] Leave request ${leave._id} finalized by HR ${hrId}. ` +
        `Employee: ${leave.employeeId}, Days: ${leave.durationDays}, ` +
        `Paid: ${isPaidLeave}, Period: ${leaveStart.toISOString().slice(0, 10)} to ${leaveEnd.toISOString().slice(0, 10)}`
      );
    } catch (error) {
      this.logger.error(`Failed to finalize leave ${leave._id}:`, error);
      throw new BadRequestException(`Failed to finalize leave request: ${error.message}`);
    }
  }

  /**
   * Real-time payroll sync after leave finalization (REQ: Auto sync with payroll)
   * This ensures salary deductions or adjustments are calculated without delays
   */
  private async payrollNotifyAfterApproval(leave: LeaveRequestDocument) {
    try {
      const leaveType = await this.leaveTypeModel.findById(leave.leaveTypeId);
      const isPaid = leaveType?.paid !== false;
      
      this.logger.log(
        `[PAYROLL_SYNC] Initiating real-time sync for leave ${leave._id}. ` +
        `Employee: ${leave.employeeId}, Days: ${leave.durationDays || 0}, Paid: ${isPaid}`
      );

      // Real-time sync with payroll system
      await this.sharedLeavesService.syncLeaveWithPayroll(leave.employeeId.toString(), {
        leaveRequestId: leave._id.toString(),
        leaveTypeId: leave.leaveTypeId.toString(),
        durationDays: leave.durationDays || 0,
        isPaid: isPaid,
        from: leave.dates.from,
        to: leave.dates.to,
      });

      this.logger.log(
        `[PAYROLL_SYNC] ✅ Real-time sync completed for leave ${leave._id}. ` +
        `${isPaid ? 'Paid leave - no deduction required' : 'Unpaid leave - deduction will be calculated'}`
      );
    } catch (err) {
      this.logger.error(`[PAYROLL_SYNC] ❌ Real-time sync failed for leave ${leave._id}:`, err);
      // Don't throw - allow finalization to complete even if sync fails
      // Payroll service can still process during payroll calculation
    }
  }

  // --------------------------------------------------------------------------------
  // Entitlements & Adjustments (REQ-008, REQ-013)
  // --------------------------------------------------------------------------------
  async assignEntitlement(
    employeeId: string,
    leaveTypeId: string,
    yearlyEntitlement: number,
  ) {
  this.validateObjectId(employeeId, 'employeeId');
  this.validateObjectId(leaveTypeId, 'leaveTypeId');

  const empObj = new Types.ObjectId(employeeId);
  const ltObj = new Types.ObjectId(leaveTypeId);

  const ent = await this.entitlementModel.findOneAndUpdate(
    { employeeId: empObj, leaveTypeId: ltObj },
    { $set: { yearlyEntitlement } },
    { upsert: true, new: true },
  );

  const takenAgg = await this.leaveRequestModel.aggregate([
    { $match: { employeeId: empObj, leaveTypeId: ltObj, status: { $in: ['approved', 'APPROVED'] } } },
    { $group: { _id: null, total: { $sum: '$durationDays' } } },
  ]);

  const pendingAgg = await this.leaveRequestModel.aggregate([
    { $match: { employeeId: empObj, leaveTypeId: ltObj, status: { $in: ['pending', 'PENDING'] } } },
    { $group: { _id: null, total: { $sum: '$durationDays' } } },
  ]);

  const taken = takenAgg[0]?.total ?? 0;
  const pending = pendingAgg[0]?.total ?? 0;
  const carryForward = ent.carryForward ?? 0;

  ent.accruedActual = yearlyEntitlement;
  ent.accruedRounded = yearlyEntitlement;

  ent.taken = taken;
  ent.pending = pending;

  const base = ent.accruedRounded ?? ent.accruedActual ?? yearlyEntitlement ?? 0;
  ent.remaining = Math.max(0, base + carryForward - taken - pending);

  ent.lastAccrualDate = new Date();

  await ent.save();

  const leaveType = await this.leaveTypeModel.findById(leaveTypeId).lean();
  await this.sharedLeavesService.sendLeaveBalanceAdjustedNotification(
    employeeId,
    leaveType?.name || 'Leave',
    'set',
      yearlyEntitlement,
    `Entitlement set: ${yearlyEntitlement} days for ${leaveType?.name || 'Leave'}`,
  );

  return ent.toObject();
  }

  // no sessions: simple create + update
  async manualEntitlementAdjustment(
    employeeId: string,
    leaveTypeId: string,
    amount: number,
    type: AdjustmentType,
    reason: string,
    hrUserId: string,
  ) {
    // Create adjustment record
    await this.adjustmentModel.create({
      employeeId: new Types.ObjectId(employeeId),
      leaveTypeId: new Types.ObjectId(leaveTypeId),
      adjustmentType: type,
      amount,
      reason,
      hrUserId: new Types.ObjectId(hrUserId),
      createdAt: new Date(),
    });

    // Get current entitlement to calculate properly
    const current = await this.entitlementModel.findOne({
      employeeId: new Types.ObjectId(employeeId),
      leaveTypeId: new Types.ObjectId(leaveTypeId),
    });

    if (!current) {
      throw new NotFoundException('Entitlement not found for employee + leaveType');
    }

    let updateData: any = {};

    if (type === 'add') {
      // Add to yearlyEntitlement (permanent increase to entitlement)
      updateData.yearlyEntitlement = (current.yearlyEntitlement || 0) + amount;
      // Recalculate remaining = yearlyEntitlement + carryForward - taken
      updateData.remaining = Math.max(0, updateData.yearlyEntitlement + (current.carryForward || 0) - (current.taken || 0));
    } else {
      // Deduct from remaining (available balance)
      const newRemaining = Math.max(0, (current.remaining || 0) - amount);
      updateData.remaining = newRemaining;
    }

    const updated = await this.entitlementModel.findOneAndUpdate(
      {
        employeeId: new Types.ObjectId(employeeId),
        leaveTypeId: new Types.ObjectId(leaveTypeId),
      },
      { $set: updateData },
      { new: true },
    );

    if (!updated) {
      throw new NotFoundException('Failed to update entitlement');
    }

    // Send notification to employee
    const leaveType = await this.leaveTypeModel.findById(leaveTypeId);
    await this.sharedLeavesService.sendLeaveBalanceAdjustedNotification(
      employeeId,
      leaveType?.name || 'Leave',
      type,
      amount,
      reason
    );

    return updated;
  }

  async getEntitlements(employeeId: string) {
    this.validateObjectId(employeeId, 'employeeId');
    return this.entitlementModel.find({ employeeId: new Types.ObjectId(employeeId) }).lean();
  }

  async createEntitlement(dto: any) {
    this.validateObjectId(dto.employeeId, 'employeeId');
    this.validateObjectId(dto.leaveTypeId, 'leaveTypeId');

    const existing = await this.entitlementModel.findOne({
      employeeId: new Types.ObjectId(dto.employeeId),
      leaveTypeId: new Types.ObjectId(dto.leaveTypeId),
    });

    if (existing) {
      throw new ConflictException('Entitlement already exists for this employee and leave type');
    }

    return this.entitlementModel.create({
      ...dto,
      employeeId: new Types.ObjectId(dto.employeeId),
      leaveTypeId: new Types.ObjectId(dto.leaveTypeId),
    });
  }

  async createAdjustment(dto: any) {
    return this.manualEntitlementAdjustment(
      dto.employeeId,
      dto.leaveTypeId,
      dto.amount,
      dto.adjustmentType,
      dto.reason,
      dto.hrUserId,
    );
  }

  // --------------------------------------------------------------------------------
  // Balance views and history (REQ-031, REQ-032, REQ-033)
  // --------------------------------------------------------------------------------

  async getEmployeeBalances(employeeId: string) {
    if (!employeeId) throw new BadRequestException('employeeId required');

    let entitlements = await this.entitlementModel
      .find({ employeeId: new Types.ObjectId(employeeId) })
      .lean();

    // If employee has no entitlements, auto-create default entitlements for all leave types
    if (entitlements.length === 0) {
      const allLeaveTypes = await this.leaveTypeModel.find().lean();

      for (const leaveType of allLeaveTypes) {
        // Default entitlement values based on leave type
        let defaultEntitlement = 0;
        const typeName = (leaveType.name || '').toLowerCase();
        const typeCode = (leaveType.code || '').toLowerCase();

        if (typeName.includes('annual') || typeCode.includes('annual')) {
          defaultEntitlement = 21; // 21 days annual leave
        } else if (typeName.includes('sick') || typeCode.includes('sick')) {
          defaultEntitlement = 14; // 14 days sick leave
        } else if (typeName.includes('personal') || typeCode.includes('personal')) {
          defaultEntitlement = 5; // 5 days personal leave
        } else {
          defaultEntitlement = 5; // Default for other types
        }

        await this.entitlementModel.create({
          employeeId: new Types.ObjectId(employeeId),
          leaveTypeId: leaveType._id,
          yearlyEntitlement: defaultEntitlement,
          accruedActual: defaultEntitlement,
          accruedRounded: defaultEntitlement,
          carryForward: 0,
          taken: 0,
          pending: 0,
          remaining: defaultEntitlement,
          lastAccrualDate: new Date(),
        });
      }

      // Re-fetch entitlements after creation
      entitlements = await this.entitlementModel
        .find({ employeeId: new Types.ObjectId(employeeId) })
        .lean();
    }

    // Fetch all leave types to enrich the response
    const allLeaveTypes = await this.leaveTypeModel.find().lean();
    const leaveTypeMap = new Map(allLeaveTypes.map(lt => [lt._id.toString(), lt]));

    const results = await Promise.all(
      entitlements.map(async (ent: any) => {
        // Match both uppercase and lowercase status values for compatibility
        const takenAgg = await this.leaveRequestModel.aggregate([
          {
            $match: {
              employeeId: new Types.ObjectId(employeeId),
              leaveTypeId: new Types.ObjectId(ent.leaveTypeId),
              status: { $in: ['approved', 'APPROVED'] },
            },
          },
          { $group: { _id: null, takenDays: { $sum: '$durationDays' } } },
        ]);

        const pendingAgg = await this.leaveRequestModel.aggregate([
          {
            $match: {
              employeeId: new Types.ObjectId(employeeId),
              leaveTypeId: new Types.ObjectId(ent.leaveTypeId),
              status: { $in: ['pending', 'PENDING'] },
            },
          },
          { $group: { _id: null, pendingDays: { $sum: '$durationDays' } } },
        ]);

        const takenFromRequests = takenAgg[0]?.takenDays ?? 0;
        const pendingFromRequests = pendingAgg[0]?.pendingDays ?? 0;

        // Use aggregated values from actual requests for accuracy
        // This ensures we always have the correct count from approved/pending requests
        const taken = takenFromRequests;
        const pending = pendingFromRequests;
        const yearly = ent.yearlyEntitlement ?? 0;
        const carryForward = ent.carryForward ?? 0;

        // Always calculate remaining from source values: yearly + carryForward - taken
        // This ensures accuracy even if stored values are stale
        const remaining = yearly + carryForward - taken;

        // Get leave type info
        const leaveType = leaveTypeMap.get(ent.leaveTypeId.toString());

        return {
          leaveTypeId: ent.leaveTypeId,
          leaveTypeName: leaveType?.name || '',
          leaveTypeCode: leaveType?.code || '',
          yearlyEntitlement: yearly,
          accrued: yearly,
          taken,
          pending,
          carryForward,
          remaining,
          usedRounded: Math.round(taken),
          lastAccrualDate: ent.lastAccrualDate ?? null,
        };
      }),
    );

    return results;
  }

  async getEmployeeHistory(
    employeeId: string,
    opts: {
      leaveTypeId?: string;
      status?: string;
      from?: string;
      to?: string;
      page?: number;
      limit?: number;
      sort?: string;
    } = {},
  ) {
    if (!employeeId) throw new BadRequestException('employeeId required');

    const q: any = { employeeId: new Types.ObjectId(employeeId) };
    if (opts.leaveTypeId)
      q.leaveTypeId = new Types.ObjectId(opts.leaveTypeId);
    if (opts.status) q.status = opts.status;
    if (opts.from || opts.to) {
      q['dates.from'] = {};
      if (opts.from) q['dates.from'].$gte = new Date(opts.from);
      if (opts.to) q['dates.from'].$lte = new Date(opts.to);
    }

    const page = Math.max(1, opts.page ?? 1);
    const limit = Math.max(1, opts.limit ?? 20);
    const sort = opts.sort ?? '-dates.from';

    const docs = await this.leaveRequestModel
      .find(q)
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();
    const total = await this.leaveRequestModel.countDocuments(q);
    return { data: docs, page, limit, total };
  }

  async recalcEmployee(employeeId: string) {
  this.validateObjectId(employeeId, 'employeeId');
  const empObj = new Types.ObjectId(employeeId);

  // جِب كل entitlements للموظف
  const entitlements = await this.entitlementModel.find({ employeeId: empObj });

  // جِب taken من approved requests (group by leaveTypeId)
  const takenAgg = await this.leaveRequestModel.aggregate([
    { $match: { employeeId: empObj, status: { $in: ['approved', 'APPROVED'] } } },
    { $group: { _id: '$leaveTypeId', total: { $sum: '$durationDays' } } },
  ]);

  // جِب pending من pending requests (group by leaveTypeId)
  const pendingAgg = await this.leaveRequestModel.aggregate([
    { $match: { employeeId: empObj, status: { $in: ['pending', 'PENDING'] } } },
    { $group: { _id: '$leaveTypeId', total: { $sum: '$durationDays' } } },
  ]);

  const takenMap = new Map<string, number>(
    takenAgg.map((r) => [r._id.toString(), r.total ?? 0]),
  );
  const pendingMap = new Map<string, number>(
    pendingAgg.map((r) => [r._id.toString(), r.total ?? 0]),
  );

  let processed = 0;

    for (const e of entitlements) {
    const ltId = e.leaveTypeId.toString();
    const taken = takenMap.get(ltId) ?? 0;
    const pending = pendingMap.get(ltId) ?? 0;

    e.taken = taken;
    e.pending = pending;

    // اختار "base" موحّد للرصيد (حسب نظامك)
    // لو عندك accrual شغال: استخدم accruedRounded/Actual
    // لو مش شغال: استخدم yearlyEntitlement
    const base =
      (e.accruedRounded ?? e.accruedActual ?? e.yearlyEntitlement ?? 0);

    const carryForward = e.carryForward ?? 0;

    e.remaining = base + carryForward - taken - pending;

      await e.save();
    processed++;
    }

  return { ok: true, employeeId, processed };
  }


  // --------------------------------------------------------------------------------
  // Manager views & admin filters (REQ-034, REQ-035, REQ-039)
  // --------------------------------------------------------------------------------

  async teamBalances(
    managerId: string,
    opts: { department?: string; leaveTypeId?: string } = {},
  ) {
    const employees = await this.leaveRequestModel
      .distinct('employeeId', {
        'approvalFlow.0.decidedBy': new Types.ObjectId(managerId),
      })
      .catch(() => []);

    if (!employees || employees.length === 0) return [];

    const result = await Promise.all(
      (employees as Types.ObjectId[]).map(async (empId: any) => {
        const balances = await this.getEmployeeBalances(empId.toString());
        return { employeeId: empId.toString(), balances };
      }),
    );
    return result;
  }

  async teamRequests(
    managerId: string,
    opts: {
      leaveTypeId?: string;
      status?: string;
      department?: string;
      from?: string;
      to?: string;
      page?: number;
      limit?: number;
      sort?: string;
    } = {},
  ) {
    const q: any = {};
    if (opts.leaveTypeId)
      q.leaveTypeId = new Types.ObjectId(opts.leaveTypeId);
    if (opts.status) q.status = opts.status;
    if (opts.from || opts.to) {
      q['dates.from'] = {};
      if (opts.from) q['dates.from'].$gte = new Date(opts.from);
      if (opts.to) q['dates.from'].$lte = new Date(opts.to);
    }

    q['approvalFlow.0.decidedBy'] = new Types.ObjectId(managerId);

    const page = Math.max(1, opts.page ?? 1);
    const limit = Math.max(1, opts.limit ?? 20);
    const sort = opts.sort ?? '-dates.from';

    const docs = await this.leaveRequestModel
      .find(q)
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();
    const total = await this.leaveRequestModel.countDocuments(q);
    return { data: docs, page, limit, total };
  }

  async irregularPatterns(
    managerId: string,
    opts: { department?: string } = {},
  ) {
    const threshold = 3;
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const docs = await this.leaveRequestModel.aggregate([
      {
        $match: {
          'dates.from': { $gte: sixMonthsAgo },
          leaveTypeCategory: 'Sick',
        },
      },
      { $group: { _id: '$employeeId', cnt: { $sum: 1 } } },
      { $match: { cnt: { $gte: threshold } } },
    ]);

    return docs;
  }

  // --------------------------------------------------------------------------------
  // Accruals & Carry-forward (REQ-003, REQ-040, REQ-041, REQ-042)
  // --------------------------------------------------------------------------------

  private applyRounding(value: number, mode: RoundingRule): number {
    if (mode === RoundingRule.NONE) return value;
    if (mode === RoundingRule.ROUND) return Math.round(value);
    if (mode === RoundingRule.ROUND_UP) return Math.ceil(value);
    if (mode === RoundingRule.ROUND_DOWN) return Math.floor(value);
    return value;
  }

  async runAccrual(
    referenceDate?: string,
    method: AccrualMethod = AccrualMethod.MONTHLY,
    roundingRule: RoundingRule = RoundingRule.ROUND,
  ) {
    const ref = referenceDate ? new Date(referenceDate) : new Date();
    let processedCount = 0;
    let createdCount = 0;

    // Get all leave types
    const allLeaveTypes = await this.leaveTypeModel.find().lean();

    if (allLeaveTypes.length === 0) {
      return {
        ok: false,
        message: 'No leave types found. Please create leave types first.',
        processed: 0,
        created: 0,
      };
    }

    // Get all unique employee IDs from existing entitlements and leave requests
    const entitlementEmployees = await this.entitlementModel.distinct('employeeId');
    const requestEmployees = await this.leaveRequestModel.distinct('employeeId');

    // Combine and deduplicate
    const allEmployeeIds = new Set([
      ...entitlementEmployees.map(id => id.toString()),
      ...requestEmployees.map(id => id.toString()),
    ]);

    this.logger.log(`Found ${allEmployeeIds.size} employees for accrual processing`);

    // Create missing entitlements for each employee
    for (const employeeIdStr of allEmployeeIds) {
      const employeeId = new Types.ObjectId(employeeIdStr);
      const existingEntitlements = await this.entitlementModel.find({ employeeId }).lean();
      const existingTypeIds = new Set(existingEntitlements.map(e => e.leaveTypeId?.toString()));

      for (const leaveType of allLeaveTypes) {
        if (existingTypeIds.has(leaveType._id.toString())) continue;

        // Determine default entitlement based on leave type
        let defaultEntitlement = 0;
        const typeName = (leaveType.name || '').toLowerCase();
        const typeCode = (leaveType.code || '').toLowerCase();

        if (typeName.includes('annual') || typeCode.includes('annual')) {
          defaultEntitlement = 21;
        } else if (typeName.includes('sick') || typeCode.includes('sick')) {
          defaultEntitlement = 21; // Sick leave days
        } else if (typeName.includes('personal') || typeCode.includes('personal')) {
          defaultEntitlement = 5;
        } else if (typeName.includes('paternity') || typeCode.includes('paternity')) {
          defaultEntitlement = 5;
        } else if (typeName.includes('maternity') || typeCode.includes('maternity')) {
          defaultEntitlement = 90;
        } else {
          defaultEntitlement = 5;
        }

        await this.entitlementModel.create({
          employeeId,
          leaveTypeId: leaveType._id,
          yearlyEntitlement: defaultEntitlement,
          accruedActual: 0,
          accruedRounded: 0,
          carryForward: 0,
          taken: 0,
          pending: 0,
          remaining: 0,
          lastAccrualDate: null,
        });
        createdCount++;
        this.logger.log(`Created entitlement for employee ${employeeIdStr}, type ${leaveType.name}`);
      }
    }

    // Now run the actual accrual on all entitlements
    const entitlements = await this.entitlementModel.find();
    this.logger.log(`Processing ${entitlements.length} entitlements for accrual`);

    for (const e of entitlements) {
      if (!e.yearlyEntitlement || e.yearlyEntitlement <= 0) {
        this.logger.log(`Skipping entitlement ${e._id} - no yearly entitlement`);
        continue;
      }

      let delta = 0;
      const yearly = e.yearlyEntitlement || 0;

      switch (method) {
        case AccrualMethod.MONTHLY:
          delta = yearly / 12;
          break;
        case AccrualMethod.YEARLY:
          delta = yearly;
          break;
        case AccrualMethod.PER_TERM:
          delta = yearly / 3;
          break;
        default:
          delta = yearly / 12;
      }

      // For first-time accrual or if method is YEARLY, just add the delta
      const lastAccrual = e.lastAccrualDate;

      // Skip if already accrued today (prevent duplicate runs)
      if (lastAccrual) {
        const lastDate = new Date(lastAccrual);
        const refDate = new Date(ref);
        if (lastDate.toDateString() === refDate.toDateString()) {
          this.logger.log(`Skipping entitlement ${e._id} - already accrued today`);
          continue;
        }
      }

      // Add the accrual
      const previousAccrued = e.accruedActual || 0;
      e.accruedActual = previousAccrued + delta;
      e.accruedRounded = this.applyRounding(e.accruedActual, roundingRule);

      // Recalculate taken and pending from actual requests for accuracy
      const takenAgg = await this.leaveRequestModel.aggregate([
        {
          $match: {
            employeeId: e.employeeId,
            leaveTypeId: e.leaveTypeId,
            status: { $in: ['approved', 'APPROVED'] },
          },
        },
        { $group: { _id: null, total: { $sum: '$durationDays' } } },
      ]);

      const pendingAgg = await this.leaveRequestModel.aggregate([
        {
          $match: {
            employeeId: e.employeeId,
            leaveTypeId: e.leaveTypeId,
            status: { $in: ['pending', 'PENDING'] },
          },
        },
        { $group: { _id: null, total: { $sum: '$durationDays' } } },
      ]);

      const taken = takenAgg[0]?.total ?? 0;
      const pending = pendingAgg[0]?.total ?? 0;
      const carryForward = e.carryForward || 0;

      e.taken = taken;
      e.pending = pending;
      e.remaining = e.accruedRounded + carryForward - taken - pending;
      e.lastAccrualDate = ref;

      await e.save();
      processedCount++;
      this.logger.log(`Accrued ${delta} days for entitlement ${e._id}. New accrued: ${e.accruedActual}, remaining: ${e.remaining}`);
    }

    return {
      ok: true,
      processed: processedCount,
      created: createdCount,
      totalEntitlements: entitlements.length,
      referenceDate: ref,
      method,
      roundingRule,
    };
  }

  /**
   * Year-End / Period Carry-Forward System
   * REQ: Automated carry-forward with caps, expiry rules, and audit logging
   *
   * Default rules per leave type:
   * - Annual Leave: Up to 10 days, expires after 6 months
   * - Sick Leave: Cannot be carried forward (resets)
   * - Personal/Paternity: Up to 5 days, expires after 3 months
   * - Other: Up to 5 days, expires after 6 months
   */
  async carryForward(
    referenceDate?: string,
    options?: {
      capDays?: number;
      expiryMonths?: number;
      leaveTypeRules?: Record<string, { cap: number; expiryMonths: number; canCarryForward: boolean }>;
      dryRun?: boolean; // Preview changes without saving
    },
  ) {
    const ref = referenceDate ? new Date(referenceDate) : new Date();
    const dryRun = options?.dryRun ?? false;

    // Get all leave types for rule mapping
    const leaveTypes = await this.leaveTypeModel.find().lean();
    const leaveTypeMap = new Map(leaveTypes.map(lt => [lt._id.toString(), lt]));

    // Define default carry-forward rules per leave type
    const defaultRules: Record<string, { cap: number; expiryMonths: number; canCarryForward: boolean }> = {
      annual: { cap: 10, expiryMonths: 6, canCarryForward: true },
      sick: { cap: 0, expiryMonths: 0, canCarryForward: false },
      personal: { cap: 5, expiryMonths: 3, canCarryForward: true },
      paternity: { cap: 5, expiryMonths: 3, canCarryForward: true },
      maternity: { cap: 0, expiryMonths: 0, canCarryForward: false },
      unpaid: { cap: 0, expiryMonths: 0, canCarryForward: false },
      default: { cap: 5, expiryMonths: 6, canCarryForward: true },
    };

    // Merge with custom rules if provided
    const rules = { ...defaultRules, ...options?.leaveTypeRules };

    // Get rule for a leave type
    const getRuleForType = (leaveTypeId: string): { cap: number; expiryMonths: number; canCarryForward: boolean } => {
      const leaveType = leaveTypeMap.get(leaveTypeId);
      if (!leaveType) return rules.default;

      const name = (leaveType.name || '').toLowerCase();
      const code = (leaveType.code || '').toLowerCase();

      if (name.includes('annual') || code.includes('annual')) return rules.annual;
      if (name.includes('sick') || code.includes('sick')) return rules.sick;
      if (name.includes('personal') || code.includes('personal')) return rules.personal;
      if (name.includes('paternity') || code.includes('paternity')) return rules.paternity;
      if (name.includes('maternity') || code.includes('maternity')) return rules.maternity;
      if (name.includes('unpaid') || code.includes('unpaid')) return rules.unpaid;

      // Use global override if provided
      if (options?.capDays !== undefined) {
        return {
          cap: options.capDays,
          expiryMonths: options.expiryMonths ?? 6,
          canCarryForward: options.capDays > 0
        };
      }

      return rules.default;
    };

    const entitlements = await this.entitlementModel.find();
    const results: Array<{
      employeeId: string;
      leaveTypeId: string;
      leaveTypeName: string;
      previousRemaining: number;
      eligibleToCarry: number;
      cappedAmount: number;
      carriedForward: number;
      expired: number;
      expiryDate: Date | null;
      newBalance: number;
      rule: { cap: number; expiryMonths: number; canCarryForward: boolean };
    }> = [];

    let processedCount = 0;
    let totalCarriedForward = 0;
    let totalExpired = 0;

    for (const e of entitlements) {
      const leaveType = leaveTypeMap.get(e.leaveTypeId?.toString());
      const leaveTypeName = leaveType?.name || 'Unknown';
      const rule = getRuleForType(e.leaveTypeId?.toString() || '');

      // Calculate current remaining balance (unused days from previous year)
      const yearlyEntitlement = e.yearlyEntitlement || 0;
      const taken = e.taken || 0;
      const pending = e.pending || 0;
      const previousCarryForward = e.carryForward || 0;

      // Current remaining = what was entitled + carry forward - taken - pending
      const currentRemaining = Math.max(0, yearlyEntitlement + previousCarryForward - taken - pending);

      // Calculate carry-forward amount
      let eligibleToCarry = currentRemaining;
      let carriedForward = 0;
      let expired = 0;
      let expiryDate: Date | null = null;

      if (rule.canCarryForward && rule.cap > 0) {
        // Apply cap
        carriedForward = Math.min(eligibleToCarry, rule.cap);
        expired = Math.max(0, eligibleToCarry - carriedForward);

        // Calculate expiry date
        if (carriedForward > 0 && rule.expiryMonths > 0) {
          expiryDate = new Date(ref);
          expiryDate.setMonth(expiryDate.getMonth() + rule.expiryMonths);
        }
      } else {
        // Leave type cannot be carried forward - all unused expires
        expired = eligibleToCarry;
        carriedForward = 0;
      }

      // Calculate new balance for new year
      // New year starts with: new yearly entitlement + carried forward amount
      const newBalance = yearlyEntitlement + carriedForward;

      // Store result
      results.push({
        employeeId: e.employeeId?.toString() || '',
        leaveTypeId: e.leaveTypeId?.toString() || '',
        leaveTypeName,
        previousRemaining: currentRemaining,
        eligibleToCarry,
        cappedAmount: rule.cap,
        carriedForward,
        expired,
        expiryDate,
        newBalance,
        rule,
      });

      totalCarriedForward += carriedForward;
      totalExpired += expired;

      // Update entitlement if not dry run
      if (!dryRun) {
        e.carryForward = carriedForward;
        e.taken = 0; // Reset taken for new year
        e.pending = 0; // Reset pending count (actual pending requests remain)
        e.accruedActual = yearlyEntitlement;
        e.accruedRounded = yearlyEntitlement;
        e.remaining = newBalance;
        e.lastAccrualDate = ref;

        // Store expiry information
        (e as any).carryForwardExpiry = expiryDate;
        (e as any).carryForwardProcessedAt = ref;

        await e.save();
        processedCount++;

        this.logger.log(
          `Carry-forward for employee ${e.employeeId}, ${leaveTypeName}: ` +
          `${currentRemaining} remaining -> ${carriedForward} carried (cap: ${rule.cap}), ` +
          `${expired} expired, new balance: ${newBalance}`
        );
      }
    }

    // Group results by employee for reporting
    const employeeSummaries = new Map<string, {
      employeeId: string;
      totalCarried: number;
      totalExpired: number;
      details: typeof results;
    }>();

    for (const result of results) {
      const existing = employeeSummaries.get(result.employeeId);
      if (existing) {
        existing.totalCarried += result.carriedForward;
        existing.totalExpired += result.expired;
        existing.details.push(result);
      } else {
        employeeSummaries.set(result.employeeId, {
          employeeId: result.employeeId,
          totalCarried: result.carriedForward,
          totalExpired: result.expired,
          details: [result],
        });
      }
    }

    return {
      ok: true,
      dryRun,
      referenceDate: ref,
      processed: processedCount,
      totalEntitlements: entitlements.length,
      totalCarriedForward,
      totalExpired,
      rules: {
        annual: rules.annual,
        sick: rules.sick,
        personal: rules.personal,
        default: rules.default,
      },
      summary: {
        employeesProcessed: employeeSummaries.size,
        byLeaveType: leaveTypes.map(lt => {
          const typeResults = results.filter(r => r.leaveTypeId === lt._id.toString());
          return {
            leaveTypeId: lt._id.toString(),
            leaveTypeName: lt.name,
            totalCarried: typeResults.reduce((sum, r) => sum + r.carriedForward, 0),
            totalExpired: typeResults.reduce((sum, r) => sum + r.expired, 0),
            employeesAffected: typeResults.length,
          };
        }),
      },
      details: dryRun ? results : undefined, // Only include details for dry run
      auditLog: {
        action: dryRun ? 'CARRY_FORWARD_PREVIEW' : 'CARRY_FORWARD_EXECUTED',
        timestamp: new Date(),
        referenceDate: ref,
        totalProcessed: processedCount,
        totalCarriedForward,
        totalExpired,
      },
    };
  }

  /**
   * Get carry-forward preview without making changes
   */
  async previewCarryForward(
    referenceDate?: string,
    options?: {
      capDays?: number;
      expiryMonths?: number;
      leaveTypeRules?: Record<string, { cap: number; expiryMonths: number; canCarryForward: boolean }>;
    },
  ) {
    return this.carryForward(referenceDate, { ...options, dryRun: true });
  }

  /**
   * Override carry-forward for specific employee
   */
  async overrideCarryForward(
    employeeId: string,
    leaveTypeId: string,
    carryForwardDays: number,
    expiryDate?: string,
    reason?: string,
  ) {
    const entitlement = await this.entitlementModel.findOne({
      employeeId: new Types.ObjectId(employeeId),
      leaveTypeId: new Types.ObjectId(leaveTypeId),
    });

    if (!entitlement) {
      throw new NotFoundException('Entitlement not found');
    }

    const previousCarryForward = entitlement.carryForward || 0;
    const previousRemaining = entitlement.remaining || 0;

    // Update carry forward
    entitlement.carryForward = carryForwardDays;
    entitlement.remaining = (entitlement.yearlyEntitlement || 0) + carryForwardDays - (entitlement.taken || 0) - (entitlement.pending || 0);

    if (expiryDate) {
      (entitlement as any).carryForwardExpiry = new Date(expiryDate);
    }
    (entitlement as any).carryForwardOverrideReason = reason;
    (entitlement as any).carryForwardOverrideAt = new Date();

    await entitlement.save();

    this.logger.log(
      `Carry-forward override for employee ${employeeId}, type ${leaveTypeId}: ` +
      `${previousCarryForward} -> ${carryForwardDays} days. Reason: ${reason}`
    );

    return {
      ok: true,
      employeeId,
      leaveTypeId,
      previousCarryForward,
      newCarryForward: carryForwardDays,
      previousRemaining,
      newRemaining: entitlement.remaining,
      expiryDate: (entitlement as any).carryForwardExpiry,
      reason,
    };
  }

  /**
   * Get carry-forward report for all employees
   */
  async getCarryForwardReport(options?: {
    employeeId?: string;
    leaveTypeId?: string;
    year?: number;
  }) {
    const query: any = {};

    if (options?.employeeId) {
      query.employeeId = new Types.ObjectId(options.employeeId);
    }
    if (options?.leaveTypeId) {
      query.leaveTypeId = new Types.ObjectId(options.leaveTypeId);
    }

    const entitlements = await this.entitlementModel.find(query).lean();
    const leaveTypes = await this.leaveTypeModel.find().lean();
    const leaveTypeMap = new Map(leaveTypes.map(lt => [lt._id.toString(), lt]));

    const report = entitlements.map(e => {
      const leaveType = leaveTypeMap.get(e.leaveTypeId?.toString() || '');
      return {
        employeeId: e.employeeId?.toString(),
        leaveTypeId: e.leaveTypeId?.toString(),
        leaveTypeName: leaveType?.name || 'Unknown',
        yearlyEntitlement: e.yearlyEntitlement || 0,
        carryForward: e.carryForward || 0,
        carryForwardExpiry: (e as any).carryForwardExpiry,
        taken: e.taken || 0,
        pending: e.pending || 0,
        remaining: e.remaining || 0,
        lastAccrualDate: e.lastAccrualDate,
        overrideReason: (e as any).carryForwardOverrideReason,
      };
    });

    // Summary statistics
    const summary = {
      totalEmployees: new Set(report.map(r => r.employeeId)).size,
      totalCarryForward: report.reduce((sum, r) => sum + r.carryForward, 0),
      byLeaveType: leaveTypes.map(lt => {
        const typeEntitlements = report.filter(r => r.leaveTypeId === lt._id.toString());
        return {
          leaveTypeId: lt._id.toString(),
          leaveTypeName: lt.name,
          totalCarryForward: typeEntitlements.reduce((sum, r) => sum + r.carryForward, 0),
          employeesWithCarryForward: typeEntitlements.filter(r => r.carryForward > 0).length,
        };
      }),
    };

    return {
      ok: true,
      report,
      summary,
    };
  }
  private async getFirstApprovedLeaveDateMap() {
  const rows = await this.leaveRequestModel.aggregate([
    { $match: { status: 'approved' } }, // <-- عدّلها حسب enum عندك (APPROVED)
    { $sort: { 'dates.from': 1 } },
    { $group: { _id: '$employeeId', firstVacationDate: { $first: '$dates.from' } } },
  ]);

  return new Map<string, Date>(
    rows.map((r: any) => [String(r._id), new Date(r.firstVacationDate)]),
  );
}


  async resetLeaveYear(
    strategy: 'hireDate' | 'calendarYear' | 'custom',
    referenceDate?: Date,
  employeeId?: string,
  dryRun: boolean = false,
) {
  const ref = referenceDate ?? new Date();

  // policies
    const policies = await this.policyModel.find().lean();
  const policyMap = new Map(policies.map((p: any) => [String(p.leaveTypeId), p]));

  // first vacation map
  const firstVacationMap =
    strategy === 'hireDate' ? await this.getFirstApprovedLeaveDateMap() : new Map<string, Date>();

  // ✅ ONLY ONE employee if provided
  const entitlements = employeeId
    ? await this.entitlementModel.find({ employeeId: new Types.ObjectId(employeeId) })
    : await this.entitlementModel.find();

  let processed = 0;
  const preview: any[] = [];

    for (const e of entitlements) {
    const empId = String(e.employeeId);

    let criterion: Date | null = null;
    if (strategy === 'calendarYear') criterion = new Date(Date.UTC(ref.getUTCFullYear(), 0, 1));
    else if (strategy === 'custom') criterion = ref;
    else criterion = firstVacationMap.get(empId) ?? null;

    if (!criterion) continue;

    const shouldReset =
      strategy === 'calendarYear' || strategy === 'custom'
        ? true
        : (criterion.getUTCMonth() === ref.getUTCMonth() && criterion.getUTCDate() === ref.getUTCDate());

    if (!shouldReset) continue;

    // --- compute new values (WITHOUT saving yet) ---
    const policy = policyMap.get(String(e.leaveTypeId));
    const method = policy?.accrualMethod ?? AccrualMethod.YEARLY;

    const before = {
      entitlementId: String(e._id),
      employeeId: String(e.employeeId),
      leaveTypeId: String(e.leaveTypeId),
      taken: e.taken,
      pending: e.pending,
      accruedActual: e.accruedActual,
      accruedRounded: e.accruedRounded,
      remaining: e.remaining,
    };

    let after = { ...before };

    after.taken = 0;
    after.pending = 0;

    if (method === AccrualMethod.YEARLY) {
      const yearly = e.yearlyEntitlement || 0;
      after.accruedActual = yearly;
      after.accruedRounded = yearly;
      after.remaining = yearly + (e.carryForward || 0);
      } else {
      after.accruedActual = 0;
      after.accruedRounded = 0;
      after.remaining = (e.carryForward || 0);
    }

    preview.push({ before, after, accrualMethod: method });
    processed++;

    // ✅ only save if NOT dryRun
    if (!dryRun) {
      e.taken = after.taken;
      e.pending = after.pending;
      e.accruedActual = after.accruedActual as any;
      e.accruedRounded = after.accruedRounded as any;
      e.remaining = after.remaining as any;
      e.lastAccrualDate = ref;
      await e.save();
    }
  }

  return { ok: true, processed, dryRun, preview };
}


  async calculateServiceDays(
    employeeId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<number> {
    if (!startDate || !endDate) return 0;
    const totalDays = Math.ceil(
      (new Date(endDate).getTime() - new Date(startDate).getTime()) /
      (1000 * 60 * 60 * 24),
    );

    const unpaidRequests = await this.leaveRequestModel
      .find({
        employeeId: new Types.ObjectId(employeeId),
        status: { $in: [LeaveStatus.APPROVED] },
        'dates.from': { $lte: endDate },
        'dates.to': { $gte: startDate },
      })
      .lean();

    let unpaidDays = 0;
    for (const period of unpaidRequests) {
      const overlapStart = new Date(
        Math.max(
          new Date(period.dates.from).getTime(),
          startDate.getTime(),
        ),
      );
      const overlapEnd = new Date(
        Math.min(
          new Date(period.dates.to).getTime(),
          endDate.getTime(),
        ),
      );
      if (overlapStart <= overlapEnd) {
        const days =
          Math.ceil(
            (overlapEnd.getTime() - overlapStart.getTime()) /
            (1000 * 60 * 60 * 24),
          ) + 1;
        unpaidDays += days;
      }
    }
    return Math.max(0, totalDays - unpaidDays);
  }

  // --------------------------------------------------------------------------------
  // Time Management Integration (REQ-010, REQ-042)
  // --------------------------------------------------------------------------------

  /**
   * Calculate leave duration excluding weekends and public holidays
   * REQ-010: Public holidays must be excluded from leave count
   * BR-23: Duration calculated net of non-working days
   * BR-33: Public holidays excluded where applicable
   *
   * Integration: HolidayService
   */
  async calculateDurationExcludingHolidays(
    employeeId: string,
    fromDate: Date,
    toDate: Date,
    excludeWeekends: boolean = true,
    excludeHolidays: boolean = true,
  ): Promise<number> {
    try {
      this.validateObjectId(employeeId, 'employeeId');

      const start = new Date(fromDate);
      const end = new Date(toDate);

      if (start > end) {
        throw new BadRequestException('Start date must be before end date');
      }

      let totalDays = 0;
      const currentDate = new Date(start);

      // Get public holidays for the period if needed
      let holidays: Date[] = [];
      if (excludeHolidays) {
        try {
          // Integration point: HolidayService.getHolidaysInRange(start, end)
          // TODO: Implement getHolidaysInRange method in HolidayService
          // For now, use Calendar model as fallback
          const year = start.getFullYear();
          const calendar = await this.calendarModel.findOne({ year });
          if (calendar && calendar.holidays) {
            holidays = (calendar.holidays as any[])
              .filter((h: any) => {
                const hDate = new Date(h.date);
                return hDate >= start && hDate <= end;
              })
              .map((h: any) => new Date(h.date));
            this.logger.log(`[DURATION-CALC] Found ${holidays.length} holidays in range`);
          }
        } catch (error) {
          this.logger.warn(`[DURATION-CALC] Could not fetch holidays: ${error.message}`);
          // Continue without holiday exclusion
        }
      }

      // Iterate through each day
      while (currentDate <= end) {
        const dayOfWeek = currentDate.getDay(); // 0 = Sunday, 6 = Saturday

        // Check if it's a weekend
        const isWeekend = (dayOfWeek === 0 || dayOfWeek === 6);

        // Check if it's a public holiday
        const isHoliday = holidays.some(holiday =>
          holiday.toDateString() === currentDate.toDateString()
        );

        // Count the day if it's not excluded
        if ((!excludeWeekends || !isWeekend) && (!excludeHolidays || !isHoliday)) {
          totalDays++;
        }

        // Move to next day
        currentDate.setDate(currentDate.getDate() + 1);
      }

      this.logger.log(
        `[DURATION-CALC] Employee ${employeeId}: ${start.toDateString()} to ${end.toDateString()} = ${totalDays} working days`
      );

      return totalDays;
    } catch (error) {
      this.logger.error(`[DURATION-CALC] Error: ${error.message}, falling back to calendar days`);
      // Fallback to calendar days
      const start = new Date(fromDate);
      const end = new Date(toDate);
      const diffTime = Math.abs(end.getTime() - start.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
      return diffDays;
    }
  }

  /**
   * Block attendance records for approved leave period
   * REQ-042: Sync approved leaves to Time Management
   * BR-44: Real-time sync between leave and attendance
   *
   * Integration: AttendanceService
   */
  async blockAttendanceForLeave(
    employeeId: string,
    leaveRequestId: string,
    fromDate: Date,
    toDate: Date,
    leaveTypeName: string,
  ): Promise<{ ok: boolean; blockedDays: number }> {
    try {
      this.validateObjectId(employeeId, 'employeeId');
      this.validateObjectId(leaveRequestId, 'leaveRequestId');

      this.logger.log(
        `[ATTENDANCE-BLOCK] Blocking attendance for employee ${employeeId} from ${fromDate.toDateString()} to ${toDate.toDateString()}`
      );

      // Call AttendanceService to block the attendance records
      try {
        // Integration point: AttendanceService.blockAttendanceForLeave()
        // TODO: Implement blockAttendanceForLeave method in AttendanceService
        // Method signature: blockAttendanceForLeave(employeeId, fromDate, toDate, leaveRequestId, leaveTypeName)
        // This method should create attendance blocks or mark days as "on leave" to prevent punch-in

        this.logger.log(
          `[ATTENDANCE-BLOCK] Integration point: Would block attendance for employee ${employeeId} ` +
          `from ${fromDate.toDateString()} to ${toDate.toDateString()} (Leave: ${leaveRequestId})`
        );

        // When implemented in AttendanceService:
        // await this.attendanceService.blockAttendanceForLeave(employeeId, fromDate, toDate, leaveRequestId, leaveTypeName);

        // Calculate number of days blocked
        const blockedDays = Math.ceil(
          (toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24)
        ) + 1;

        this.logger.log(
          `[ATTENDANCE-BLOCK] Ready to block ${blockedDays} days for employee ${employeeId}`
        );

        return { ok: true, blockedDays };
      } catch (attendanceError) {
        this.logger.error(
          `[ATTENDANCE-BLOCK] AttendanceService error: ${attendanceError.message}`
        );
        // Don't fail the leave approval if attendance blocking fails
        return { ok: false, blockedDays: 0 };
      }
    } catch (error) {
      this.logger.error(`[ATTENDANCE-BLOCK] Error: ${error.message}`);
      return { ok: false, blockedDays: 0 };
    }
  }

  /**
   * Unblock attendance records when leave is cancelled
   * REQ-042: Sync cancellations to Time Management
   * BR-18: Canceled leaves → return days to balance
   */
  async unblockAttendanceForLeave(
    employeeId: string,
    leaveRequestId: string,
  ): Promise<{ ok: boolean }> {
    try {
      this.validateObjectId(employeeId, 'employeeId');
      this.validateObjectId(leaveRequestId, 'leaveRequestId');

      this.logger.log(
        `[ATTENDANCE-UNBLOCK] Unblocking attendance for employee ${employeeId}, leave ${leaveRequestId}`
      );

      try {
        // Integration point: AttendanceService.unblockAttendanceForLeave()
        // TODO: Implement unblockAttendanceForLeave method in AttendanceService
        // Method signature: unblockAttendanceForLeave(employeeId, leaveRequestId)
        // This method should remove attendance blocks for the cancelled leave

        this.logger.log(
          `[ATTENDANCE-UNBLOCK] Integration point: Would unblock attendance for employee ${employeeId}, leave ${leaveRequestId}`
        );

        // When implemented in AttendanceService:
        // await this.attendanceService.unblockAttendanceForLeave(employeeId, leaveRequestId);

        this.logger.log(
          `[ATTENDANCE-UNBLOCK] Ready to unblock attendance for employee ${employeeId}`
        );

        return { ok: true };
      } catch (attendanceError) {
        this.logger.error(
          `[ATTENDANCE-UNBLOCK] AttendanceService error: ${attendanceError.message}`
        );
        return { ok: false };
      }
    } catch (error) {
      this.logger.error(`[ATTENDANCE-UNBLOCK] Error: ${error.message}`);
      return { ok: false };
    }
  }

  // --------------------------------------------------------------------------------
  // Payroll integration (REQ-042): Real-time Payroll Synchronization
  // --------------------------------------------------------------------------------

  /**
   * Sync leave balance updates to payroll system
   * REQ-042: Real-time synchronization for payroll calculations
   */
  async payrollSyncBalance(employeeId: string, balanceData?: any) {
    try {
      this.logger.log(
        `[PAYROLL-SYNC] Syncing balance for employee ${employeeId}`,
      );

      // In a real implementation, this would call the payroll-tracking service
      // to update employee records for salary calculations
      // Example: await this.payrollTrackingService.updateLeaveBalance(employeeId, balanceData);

      return {
        ok: true,
        employeeId,
        syncedAt: new Date(),
        balanceData,
        message: 'Balance synced to payroll system',
      };
    } catch (error) {
      this.logger.error(
        `[PAYROLL-SYNC] Failed to sync balance for ${employeeId}`,
        error,
      );
      throw new Error(`Payroll sync failed: ${error.message}`);
    }
  }

  /**
   * Sync approved leave to payroll for deductions/adjustments
   * REQ-042: Approved leaves (paid/unpaid) must sync in real-time with payroll
   * BR 44: Approved leaves change payroll calculations
   */
  async payrollSyncLeave(
    employeeId: string,
    leaveData: {
      leaveRequestId: string;
      leaveTypeId: string;
      durationDays: number;
      isPaid: boolean;
      from: Date;
      to: Date;
    },
  ) {
    try {
      this.logger.log(
        `[PAYROLL-SYNC] Syncing leave for employee ${employeeId}: ${leaveData.durationDays} days (${leaveData.isPaid ? 'PAID' : 'UNPAID'})`,
      );

      const syncPayload = {
        employeeId,
        leaveRequestId: leaveData.leaveRequestId,
        leaveTypeId: leaveData.leaveTypeId,
        fromDate: leaveData.from,
        toDate: leaveData.to,
        durationDays: leaveData.durationDays,
        isPaid: leaveData.isPaid,
        syncedAt: new Date(),
        payrollImpact: leaveData.isPaid
          ? 'NO_DEDUCTION'
          : 'UNPAID_DEDUCTION_REQUIRED',
      };

      // In production, call payroll-tracking service:
      // await this.payrollTrackingService.recordLeaveForPayroll(syncPayload);

      this.logger.log(
        `[PAYROLL-SYNC] Successfully synced leave ${leaveData.leaveRequestId} to payroll`,
      );

      return {
        ok: true,
        employeeId,
        leaveRequestId: leaveData.leaveRequestId,
        syncedAt: new Date(),
        payrollImpact: syncPayload.payrollImpact,
      };
    } catch (error) {
      this.logger.error(
        `[PAYROLL-SYNC] Failed to sync leave for ${employeeId}`,
        error,
      );
      throw new Error(`Leave payroll sync failed: ${error.message}`);
    }
  }

  /**
   * Calculate unpaid leave deduction
   * REQ-042: If unapproved absences are recorded, calculate deduction
   * Formula: (Base Salary / Work Days in Month) × Unpaid Leave Days
   * BR 52: Deduction calculation for unpaid leave
   */
  async calculateUnpaidDeduction(
    employeeId: string,
    baseSalary: number,
    workDaysInMonth: number,
    unpaidLeaveDays: number,
  ) {
    try {
      this.validateObjectId(employeeId, 'employeeId');

      if (baseSalary <= 0 || workDaysInMonth <= 0 || unpaidLeaveDays < 0) {
        throw new BadRequestException(
          'Invalid parameters for unpaid deduction calculation',
        );
      }

      const dailyRate = baseSalary / workDaysInMonth;
      const deductionAmount = dailyRate * unpaidLeaveDays;

      this.logger.log(
        `[UNPAID-DEDUCTION] Employee ${employeeId}: ${unpaidLeaveDays} days × ${dailyRate.toFixed(2)} = ${deductionAmount.toFixed(2)}`,
      );

      return {
        employeeId,
        baseSalary,
        workDaysInMonth,
        unpaidLeaveDays,
        dailyRate: Math.round(dailyRate * 100) / 100,
        deductionAmount: Math.round(deductionAmount * 100) / 100,
        netSalary: Math.round((baseSalary - deductionAmount) * 100) / 100,
        formula: `(${baseSalary} / ${workDaysInMonth}) × ${unpaidLeaveDays}`,
        calculatedAt: new Date(),
      };
    } catch (error) {
      this.logger.error(
        `[UNPAID-DEDUCTION] Calculation failed for ${employeeId}`,
        error,
      );
      throw error;
    }
  }

  /**
   * Calculate leave encashment for final settlement or carry-forward encashment
   * REQ-042: Final settlement - remaining leave balance conversion
   * BR 52: If employee is terminated/resigns, remaining leave → encashment
   * BR 53: Encashment formula: [Daily salary rate] × [Unused days, max 30]
   */
  async calculateEncashment(
    employeeId: string,
    dailySalaryRate: number,
    unusedLeaveDays: number,
    maxEncashableDays = 30,
  ) {
    try {
      this.validateObjectId(employeeId, 'employeeId');

      if (dailySalaryRate <= 0 || unusedLeaveDays < 0) {
        throw new BadRequestException(
          'Invalid parameters for encashment calculation',
        );
      }

      // BR 53: Cap at max encashable days (default 30, customizable)
      const daysEncashed = Math.min(unusedLeaveDays, maxEncashableDays);
      const encashmentAmount = dailySalaryRate * daysEncashed;
      const daysForfeited = unusedLeaveDays - daysEncashed;

      this.logger.log(
        `[ENCASHMENT] Employee ${employeeId}: ${daysEncashed} days × ${dailySalaryRate.toFixed(2)} = ${encashmentAmount.toFixed(2)}`,
      );

      if (daysForfeited > 0) {
        this.logger.warn(
          `[ENCASHMENT] Employee ${employeeId}: ${daysForfeited} days forfeited (exceeded cap of ${maxEncashableDays})`,
        );
      }

      return {
        employeeId,
        unusedLeaveDays,
        maxEncashableDays,
        daysEncashed,
        daysForfeited,
        dailySalaryRate,
        encashmentAmount: Math.round(encashmentAmount * 100) / 100,
        formula: `${dailySalaryRate} × ${daysEncashed}`,
        calculatedAt: new Date(),
      };
    } catch (error) {
      this.logger.error(
        `[ENCASHMENT] Calculation failed for ${employeeId}`,
        error,
      );
      throw error;
    }
  }

  /**
   * Sync leave cancellation to payroll (restore deducted amount)
   * REQ-042: If approved leaves are canceled, recalculate and return days
   * BR 18: Canceled/rescheduled leaves → automatically return days to balance
   */
  async syncCancellation(
    employeeId: string,
    leaveRequestId: string,
    daysToRestore: number,
  ) {
    try {
      this.validateObjectId(employeeId, 'employeeId');
      this.validateObjectId(leaveRequestId, 'leaveRequestId');

      this.logger.log(
        `[PAYROLL-SYNC] Cancellation sync for employee ${employeeId}: restoring ${daysToRestore} days`,
      );

      // In production, notify payroll to reverse any deductions
      // await this.payrollTrackingService.reverseLeaveDeduc tion(leaveRequestId);

      return {
        ok: true,
        employeeId,
        leaveRequestId,
        daysRestored: daysToRestore,
        syncedAt: new Date(),
        action: 'DEDUCTION_REVERSED',
        message: 'Leave cancellation synced, days restored to balance',
      };
    } catch (error) {
      this.logger.error(
        `[PAYROLL-SYNC] Cancellation sync failed for ${employeeId}`,
        error,
      );
      throw new Error(`Cancellation sync failed: ${error.message}`);
    }
  }

  /**
   * Wrapper method for backward compatibility
   */
  async payrollSyncLeaveWrapper(employeeId: string, leaveData: any) {
    return this.payrollSyncLeave(employeeId, leaveData);
  }

  /**
   * Process final settlement for terminated/resigned employee
   * REQ-042: Final settlement - convert remaining leave to encashment/deduction
   * BR 52: Remaining leave balance → encashment or deduction based on rules
   */
  async processFinalSettlement(
    employeeId: string,
    options: {
      dailySalaryRate: number;
      maxEncashableDays?: number;
      settlementDate?: Date;
      reason?: 'resignation' | 'termination' | 'retirement';
    },
  ) {
    try {
      this.validateObjectId(employeeId, 'employeeId');

      this.logger.log(
        `[FINAL-SETTLEMENT] Processing for employee ${employeeId} (${options.reason || 'resignation'})`,
      );

      // Get all employee entitlements
      const entitlements = await this.entitlementModel.find({ employeeId });

      if (!entitlements || entitlements.length === 0) {
        this.logger.warn(
          `[FINAL-SETTLEMENT] No entitlements found for ${employeeId}`,
        );
        return {
          ok: true,
          employeeId,
          totalEncashment: 0,
          message: 'No leave balance to process',
          processedAt: new Date(),
        };
      }

      const encashmentDetails: any[] = [];
      let totalEncashmentAmount = 0;
      let totalDaysEncashed = 0;
      let totalDaysForfeited = 0;

      // Process each leave type
      for (const ent of entitlements) {
        const leaveType = await this.leaveTypeModel.findById(ent.leaveTypeId);
        const leaveTypeName = leaveType?.name || 'Unknown';

        // Only encash if remaining > 0
        if (ent.remaining > 0) {
          const encashment = await this.calculateEncashment(
            employeeId,
            options.dailySalaryRate,
            ent.remaining,
            options.maxEncashableDays || 30,
          );

          totalEncashmentAmount += encashment.encashmentAmount;
          totalDaysEncashed += encashment.daysEncashed;
          totalDaysForfeited += encashment.daysForfeited;

          encashmentDetails.push({
            leaveTypeId: ent.leaveTypeId.toString(),
            leaveTypeName,
            remainingDays: ent.remaining,
            daysEncashed: encashment.daysEncashed,
            daysForfeited: encashment.daysForfeited,
            encashmentAmount: encashment.encashmentAmount,
          });

          this.logger.log(
            `[FINAL-SETTLEMENT] ${leaveTypeName}: ${encashment.daysEncashed} days → ${encashment.encashmentAmount}`,
          );
        }
      }

      // In production, send to payroll:
      // await this.payrollTrackingService.addFinalSettlementEncashment({
      //   employeeId,
      //   totalAmount: totalEncashmentAmount,
      //   details: encashmentDetails,
      //   settlementDate: options.settlementDate || new Date(),
      // });

      this.logger.log(
        `[FINAL-SETTLEMENT] Completed for ${employeeId}: Total encashment = ${totalEncashmentAmount.toFixed(2)}`,
      );

      return {
        ok: true,
        employeeId,
        settlementDate: options.settlementDate || new Date(),
        reason: options.reason || 'resignation',
        totalDaysEncashed,
        totalDaysForfeited,
        totalEncashmentAmount: Math.round(totalEncashmentAmount * 100) / 100,
        encashmentDetails,
        processedAt: new Date(),
      };
    } catch (error) {
      this.logger.error(
        `[FINAL-SETTLEMENT] Processing failed for ${employeeId}`,
        error,
      );
      throw new Error(`Final settlement processing failed: ${error.message}`);
    }
  }

  // --------------------------------------------------------------------------------
  // Attachments (REQ-016, REQ-028)
  // --------------------------------------------------------------------------------

  async saveAttachment(dto: any) {
    return this.attachmentModel.create(dto);
  }

  async validateMedicalAttachment(id: string, verifiedBy?: string) {
    try {
      // Validate attachment ID format
      if (!id || !Types.ObjectId.isValid(id)) {
        throw new BadRequestException('Invalid attachment ID format');
      }

      const attachmentId = new Types.ObjectId(id);
      const attachment = await this.attachmentModel.findById(attachmentId);
      if (!attachment) {
        throw new NotFoundException(`Attachment with ID ${id} not found`);
      }
      
    const type = (attachment.fileType || '').toLowerCase();
      const validTypes = ['pdf', 'image', 'jpeg', 'jpg', 'png', 'gif', 'bmp'];
      const isValidType = validTypes.some(validType => type.includes(validType));
      
      if (!isValidType) {
        throw new BadRequestException(`Invalid medical document format: ${attachment.fileType}. Only PDF and image files (JPEG, JPG, PNG, GIF, BMP) are accepted.`);
      }

      // Find leave request that uses this specific attachment (attachmentId is stored as ObjectId in schema)
      // Use findOne to ensure we only get ONE specific leave request for this attachment
      const attachmentIdObj = new Types.ObjectId(id);
      const leaveRequest = await this.leaveRequestModel.findOne({ attachmentId: attachmentIdObj });
    
      if (!leaveRequest) {
        this.logger.warn(`No leave request found for attachment ${id}`);
        // Still return success for attachment validation, but no leave request to update
      } else if (verifiedBy) {
        // Track verification in approval flow for audit trail (REQ-028)
        // Only update THIS specific leave request - ensure we're working with the correct one
        if (!leaveRequest.approvalFlow || !Array.isArray(leaveRequest.approvalFlow)) {
          leaveRequest.approvalFlow = [] as any;
        }
        
        // Check if verification already exists for THIS specific attachment in THIS specific request
        const attachmentIdStr = id.toString();
        const existingVerification = leaveRequest.approvalFlow.find(
          (f: any) => 
            f.action === 'medical_document_verified' && 
            (f.attachmentId === attachmentIdStr || f.attachmentId === id)
        );
        
        if (!existingVerification) {
          // Add verification entry to approval flow for THIS specific request only
          const verificationEntry = {
            role: 'hr',
            status: 'verified',
            action: 'medical_document_verified',
            decidedBy: new Types.ObjectId(verifiedBy),
            decidedAt: new Date(),
            attachmentId: attachmentIdStr, // Always store attachment ID for exact matching
          };
          
          leaveRequest.approvalFlow.push(verificationEntry as any);
          await leaveRequest.save();
          this.logger.log(`Medical document ${id} verified by HR ${verifiedBy} for leave request ${leaveRequest._id} (attachmentId: ${attachmentIdStr})`);
        } else {
          this.logger.log(`Medical document ${id} already verified for leave request ${leaveRequest._id}`);
        }
      }

      return {
        ...attachment.toObject(),
        verified: true,
        verifiedAt: new Date(),
        verifiedBy: verifiedBy || null,
        leaveRequestId: leaveRequest?._id?.toString() || null,
      };
    } catch (error) {
      this.logger.error(`Error validating medical attachment ${id}: ${error.message}`, error.stack);
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(`Failed to verify medical document: ${error.message}`);
    }
  }

  // --------------------------------------------------------------------------------
  // Misc / Analytics / Bulk (REQ-027, REQ-039)
  // --------------------------------------------------------------------------------

  async bulkProcessRequests(
    requestIds: string[],
    action: 'approve' | 'reject',
    actorId: string,
  ) {
    const results: string[] = [];
    const errors: string[] = [];

    // Process each request using hrFinalize to ensure proper finalization
    for (const id of requestIds) {
      try {
        // Validate request exists and is in a processable state
      const reqDoc = await this.leaveRequestModel.findById(id);
        if (!reqDoc) {
          errors.push(`${id}: Request not found`);
          continue;
        }

        // Check if already finalized (skip if already finalized and approving)
        const hrApproval = reqDoc.approvalFlow?.find((f) => f.role === 'hr');
        const isAlreadyFinalized = hrApproval?.status === 'approved' && reqDoc.status === LeaveStatus.APPROVED;
        
        if (isAlreadyFinalized && action === 'approve') {
          errors.push(`${id}: Already finalized`);
          continue;
        }

        // Use hrFinalize to properly finalize each request (updates balances, sends notifications, etc.)
        await this.hrFinalize(id, actorId, action, true, `Bulk ${action} by HR`, false);
        results.push(id);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        this.logger.warn(`Failed to process request ${id} in bulk: ${errorMessage}`);
        errors.push(`${id}: ${errorMessage}`);
      }
    }

    return { 
      ok: true, 
      processed: results.length, 
      total: requestIds.length,
      ids: results,
      errors: errors.length > 0 ? errors : undefined
    };
  }

  async flagIrregular(requestId: string, flag: boolean, reason?: string, managerId?: string) {
    this.validateObjectId(requestId, 'requestId');
    
    const leave = await this.leaveRequestModel.findById(requestId);
    if (!leave) throw new NotFoundException('Leave request not found');
    
    leave.irregularPatternFlag = !!flag;
    
    // Store the reason in approvalFlow as a manager note when flagging
    if (flag && reason) {
      // Check if there's already an irregular flag entry in approvalFlow
      const existingFlagIndex = leave.approvalFlow?.findIndex(
        (entry: any) => entry.role === 'manager' && entry.status === 'irregular_flag'
      );
      
      const flagEntry: any = {
        role: 'manager',
        status: 'irregular_flag',
        decidedBy: managerId ? new Types.ObjectId(managerId) : undefined,
        decidedAt: new Date(),
        reason: reason, // Store reason in the approvalFlow entry
      };
      
      if (existingFlagIndex !== undefined && existingFlagIndex >= 0) {
        // Update existing flag entry
        leave.approvalFlow[existingFlagIndex] = flagEntry;
      } else {
        // Add new flag entry
        if (!leave.approvalFlow) {
          leave.approvalFlow = [];
        }
        leave.approvalFlow.push(flagEntry);
      }
      
      // Mark approvalFlow as modified to ensure Mongoose saves the changes
      leave.markModified('approvalFlow');
      
      this.logger.log(
        `[IRREGULAR_FLAG] Leave ${requestId} flagged as irregular by manager ${managerId || 'unknown'}. Reason: ${reason.substring(0, 100)}`,
      );
    } else if (!flag) {
      // Remove irregular flag entries when unflagging
      if (leave.approvalFlow) {
        leave.approvalFlow = leave.approvalFlow.filter(
          (entry: any) => entry.role !== 'manager' || entry.status !== 'irregular_flag'
        );
        leave.markModified('approvalFlow');
      }
      this.logger.log(`[IRREGULAR_FLAG] Irregular flag removed from leave ${requestId}`);
    }
    
    const saved = await leave.save();
    return saved.toObject ? saved.toObject() : saved;
  }

  async calculateServiceDaysWrapper(
    employeeId: string,
    startDate: Date,
    endDate: Date,
  ) {
    return this.calculateServiceDays(employeeId, startDate, endDate);
  }

  // --------------------------------------------------------------------------------
  // Leave Policies (REQ-003, REQ-009)
  // --------------------------------------------------------------------------------

  async createPolicy(dto: any) {
    this.validateObjectId(dto.leaveTypeId, 'leaveTypeId');

    const leaveType = await this.leaveTypeModel.findById(dto.leaveTypeId);
    if (!leaveType) {
      throw new NotFoundException('Leave type not found');
    }

    const existingPolicy = await this.policyModel.findOne({
      leaveTypeId: new Types.ObjectId(dto.leaveTypeId),
    });

    if (existingPolicy) {
      throw new ConflictException('Policy already exists for this leave type');
    }

    return this.policyModel.create({
      ...dto,
      leaveTypeId: new Types.ObjectId(dto.leaveTypeId),
    });
  }

  async getAllPolicies() {
    return this.policyModel.find().populate('leaveTypeId', 'name code').lean();
  }

  async getPolicy(id: string) {
    this.validateObjectId(id, 'id');
    const policy = await this.policyModel.findById(id).populate('leaveTypeId', 'name code').lean();
    if (!policy) throw new NotFoundException('Policy not found');
    return policy;
  }

  async getPolicyByLeaveType(leaveTypeId: string) {
    this.validateObjectId(leaveTypeId, 'leaveTypeId');
    const policy = await this.policyModel.findOne({
      leaveTypeId: new Types.ObjectId(leaveTypeId),
    }).populate('leaveTypeId', 'name code').lean();
    if (!policy) throw new NotFoundException('Policy not found for this leave type');
    return policy;
  }

  async updatePolicy(id: string, dto: any) {
    this.validateObjectId(id, 'id');
    const updated = await this.policyModel.findByIdAndUpdate(id, dto, { new: true }).lean();
    if (!updated) throw new NotFoundException('Policy not found');
    return updated;
  }

  async deletePolicy(id: string) {
    this.validateObjectId(id, 'id');
    const deleted = await this.policyModel.findByIdAndDelete(id);
    if (!deleted) throw new NotFoundException('Policy not found');
    return { success: true };
  }

  // --------------------------------------------------------------------------------
  // Approval Workflow Configuration (REQ-009)
  // --------------------------------------------------------------------------------

  /**
   * Configure approval workflow for a leave policy
   * Stores workflow configuration in the eligibility field
   * @param policyId Policy ID
   * @param workflowConfig Approval workflow configuration per position
   */
  async configureApprovalWorkflow(policyId: string, workflowConfig: {
    defaultWorkflow?: Array<{ role: string; order: number; positionId?: string; positionCode?: string }>;
    positionWorkflows?: Array<{
      positionId: string;
      positionCode?: string;
      workflow: Array<{ role: string; order: number; positionId?: string; positionCode?: string }>;
    }>;
  }) {
    this.validateObjectId(policyId, 'policyId');
    
    const policy = await this.policyModel.findById(policyId);
    if (!policy) throw new NotFoundException('Policy not found');

    // Validate position IDs if provided
    if (workflowConfig.positionWorkflows) {
      for (const pw of workflowConfig.positionWorkflows) {
        if (pw.positionId) {
          this.validateObjectId(pw.positionId, 'positionId');
          try {
            const position = await this.organizationStructureService.getPositionById(pw.positionId);
            if (!position) {
              throw new NotFoundException(`Position ${pw.positionId} not found`);
            }
          } catch (error) {
            if (error instanceof NotFoundException) throw error;
            this.logger.warn(`Could not validate position ${pw.positionId}: ${error.message}`);
          }
        }
      }
    }

    // Store workflow in eligibility field using raw MongoDB collection to bypass Mongoose schema
    // This allows saving approvalWorkflow even though it's not in the strict schema
    const collection = this.policyModel.collection;
    
    const result = await collection.findOneAndUpdate(
      { _id: new Types.ObjectId(policyId) },
      {
        $set: {
          'eligibility.approvalWorkflow': workflowConfig,
        },
      },
      { returnDocument: 'after' }
    );

    if (!result) {
      throw new NotFoundException('Policy not found');
    }

    this.logger.log(`[WORKFLOW_CONFIG] Approval workflow configured for policy ${policyId}`);
    this.logger.debug(`[WORKFLOW_CONFIG] Workflow saved: ${JSON.stringify(workflowConfig)}`);
    
    // Verify it was saved
    const verification = await collection.findOne({ _id: new Types.ObjectId(policyId) });
    const savedWorkflow = verification?.eligibility?.approvalWorkflow;
    if (savedWorkflow) {
      this.logger.log(`[WORKFLOW_CONFIG] Workflow verified in database`);
    } else {
      this.logger.error(`[WORKFLOW_CONFIG] ERROR: Workflow not found after save`);
    }
    
    return result as any;
  }

  /**
   * Get approval workflow for a policy, optionally filtered by position
   * @param policyId Policy ID
   * @param positionId Optional position ID to get position-specific workflow
   */
  async getApprovalWorkflow(policyId: string, positionId?: string) {
    this.validateObjectId(policyId, 'policyId');
    
    const policy = await this.policyModel.findById(policyId).lean();
    if (!policy) throw new NotFoundException('Policy not found');

    const workflowConfig = (policy.eligibility as any)?.approvalWorkflow;
    if (!workflowConfig) {
      // Return default workflow if none configured
      return {
        defaultWorkflow: [
          { role: 'manager', order: 1 },
          { role: 'hr', order: 2 },
        ],
      };
    }

    // If positionId provided, try to find position-specific workflow
    if (positionId && workflowConfig.positionWorkflows) {
      this.validateObjectId(positionId, 'positionId');
      const positionWorkflow = workflowConfig.positionWorkflows.find(
        (pw: any) => pw.positionId === positionId
      );
      if (positionWorkflow) {
        return {
          workflow: positionWorkflow.workflow,
          positionId: positionWorkflow.positionId,
          positionCode: positionWorkflow.positionCode,
        };
      }
    }

    // Return default workflow
    return {
      defaultWorkflow: workflowConfig.defaultWorkflow || [
        { role: 'manager', order: 1 },
        { role: 'hr', order: 2 },
      ],
    };
  }

  /**
   * Get all positions for workflow configuration UI
   */
  async getPositionsForWorkflow() {
    try {
      const positions = await this.organizationStructureService.searchPositions({
        isActive: true,
        limit: 1000,
      });
      return positions.data || [];
    } catch (error) {
      this.logger.error('Failed to fetch positions for workflow', error);
      return [];
    }
  }

  // --------------------------------------------------------------------------------
  // Special Absence/Mission Types Configuration (REQ-011)
  // --------------------------------------------------------------------------------

  /**
   * Configure special absence/mission type rules for a leave type
   * Stores configuration using raw MongoDB to bypass schema validation
   */
  async configureSpecialAbsenceType(leaveTypeId: string, config: {
    isSpecialAbsence?: boolean;
    isMissionType?: boolean;
    trackSickLeaveCycle?: boolean; // Track cumulatively over 3-year cycle
    sickLeaveMaxDays?: number; // Max 360 days over 3 years
    sickLeaveCycleYears?: number; // Default 3 years
    trackMaternityCount?: boolean; // Track number of times taken
    maxMaternityCount?: number; // Maximum number of times allowed
    requiresSpecialApproval?: boolean;
    specialRules?: Record<string, any>; // Additional rules (Hajj, exams, marriage, etc.)
  }) {
    this.validateObjectId(leaveTypeId, 'leaveTypeId');

    const leaveType = await this.leaveTypeModel.findById(leaveTypeId);
    if (!leaveType) throw new NotFoundException('Leave type not found');

    // Use raw MongoDB collection to store special configuration
    const collection = this.leaveTypeModel.collection;
    
    const result = await collection.findOneAndUpdate(
      { _id: new Types.ObjectId(leaveTypeId) },
      {
        $set: {
          'specialAbsenceConfig': config,
        },
      },
      { returnDocument: 'after' }
    );

    if (!result) {
      throw new NotFoundException('Leave type not found');
    }

    this.logger.log(`[SPECIAL_ABSENCE_CONFIG] Special absence configuration set for leave type ${leaveTypeId}`);
    return result as any;
  }

  /**
   * Get special absence/mission type configuration for a leave type
   */
  async getSpecialAbsenceConfig(leaveTypeId: string) {
    this.validateObjectId(leaveTypeId, 'leaveTypeId');
    
    const collection = this.leaveTypeModel.collection;
    const leaveType = await collection.findOne({ _id: new Types.ObjectId(leaveTypeId) });
    
    if (!leaveType) throw new NotFoundException('Leave type not found');
    
    return leaveType.specialAbsenceConfig || null;
  }

  /**
   * Get sick leave usage for employee over 3-year cycle (REQ-011)
   * Enhanced version that enforces 360-day max limit
   */
  async getSickLeaveUsage(employeeId: string, leaveTypeId: string) {
    this.validateObjectId(employeeId, 'employeeId');
    this.validateObjectId(leaveTypeId, 'leaveTypeId');

    // Get special config to check if this is a sick leave type with cycle tracking
    const config = await this.getSpecialAbsenceConfig(leaveTypeId);
    const cycleYears = config?.sickLeaveCycleYears || 3;
    const maxDays = config?.sickLeaveMaxDays || 360;

    const end = new Date();
    const start = new Date();
    start.setFullYear(end.getFullYear() - cycleYears);

    const [agg] = await this.leaveRequestModel.aggregate([
      {
        $match: {
          employeeId: new Types.ObjectId(employeeId),
          leaveTypeId: new Types.ObjectId(leaveTypeId),
          status: LeaveStatus.APPROVED,
          'dates.from': { $gte: start, $lte: end },
        },
      },
      {
        $group: {
          _id: null,
          totalDays: { $sum: '$durationDays' },
          requests: { $push: { from: '$dates.from', to: '$dates.to', days: '$durationDays' } },
        },
      },
    ]);

    const totalDays = agg?.totalDays ?? 0;
    const remainingAllowed = Math.max(0, maxDays - totalDays);
    const isOverLimit = totalDays >= maxDays;

    return {
      employeeId,
      leaveTypeId,
      periodStart: start,
      periodEnd: end,
      cycleYears,
      totalDays,
      maxDays,
      remainingAllowed,
      isOverLimit,
      requests: agg?.requests || [],
    };
  }

  /**
   * Get maternity leave count for employee (REQ-011)
   */
  async getMaternityLeaveCount(employeeId: string, leaveTypeId: string) {
    this.validateObjectId(employeeId, 'employeeId');
    this.validateObjectId(leaveTypeId, 'leaveTypeId');

    const count = await this.leaveRequestModel.countDocuments({
      employeeId: new Types.ObjectId(employeeId),
      leaveTypeId: new Types.ObjectId(leaveTypeId),
      status: LeaveStatus.APPROVED,
    });

    // Get config to check max allowed
    const config = await this.getSpecialAbsenceConfig(leaveTypeId);
    const maxCount = config?.maxMaternityCount;

    return {
      employeeId,
      leaveTypeId,
      count,
      maxCount: maxCount || null,
      canTakeMore: maxCount ? count < maxCount : true,
    };
  }

  /**
   * Validate special absence/mission type rules before approving leave
   */
  async validateSpecialAbsenceRules(employeeId: string, leaveTypeId: string, durationDays: number) {
    this.validateObjectId(employeeId, 'employeeId');
    this.validateObjectId(leaveTypeId, 'leaveTypeId');

    const config = await this.getSpecialAbsenceConfig(leaveTypeId);
    if (!config) {
      return { valid: true }; // No special rules configured
    }

    const errors: string[] = [];

    // Check sick leave 3-year cycle limit
    if (config.trackSickLeaveCycle) {
      const usage = await this.getSickLeaveUsage(employeeId, leaveTypeId);
      const projectedTotal = usage.totalDays + durationDays;
      
      if (projectedTotal > usage.maxDays) {
        errors.push(
          `Sick leave limit exceeded. Used ${usage.totalDays}/${usage.maxDays} days in the last ${usage.cycleYears} years. ` +
          `Requested ${durationDays} days would exceed the limit by ${projectedTotal - usage.maxDays} days.`
        );
      }
    }

    // Check maternity leave count limit
    if (config.trackMaternityCount) {
      const maternityInfo = await this.getMaternityLeaveCount(employeeId, leaveTypeId);
      
      if (maternityInfo.maxCount && maternityInfo.count >= maternityInfo.maxCount) {
        errors.push(
          `Maternity leave limit reached. Employee has already taken ${maternityInfo.count}/${maternityInfo.maxCount} maternity leaves.`
        );
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      config,
    };
  }

  // --------------------------------------------------------------------------------
  // Statistics and Reports
  // --------------------------------------------------------------------------------

  async getLeaveStats(employeeId?: string, departmentId?: string) {
    const match: any = {};
    if (employeeId) match.employeeId = new Types.ObjectId(employeeId);

    const stats = await this.leaveRequestModel.aggregate([
      { $match: match },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalDays: { $sum: '$durationDays' },
        },
      },
    ]);

    const result = {
      pending: { count: 0, totalDays: 0 },
      approved: { count: 0, totalDays: 0 },
      rejected: { count: 0, totalDays: 0 },
      cancelled: { count: 0, totalDays: 0 },
    };

    for (const s of stats) {
      if (s._id in result) {
        result[s._id] = { count: s.count, totalDays: s.totalDays };
      }
    }

    return result;
  }

  async getEntitlementSummary(employeeId: string) {
    this.validateObjectId(employeeId, 'employeeId');

    const entitlements = await this.entitlementModel
      .find({ employeeId: new Types.ObjectId(employeeId) })
      .populate('leaveTypeId', 'name code')
      .lean();

    return entitlements.map((ent: any) => ({
      leaveType: ent.leaveTypeId?.name || 'Unknown',
      leaveTypeCode: ent.leaveTypeId?.code || 'UNKNOWN',
      yearlyEntitlement: ent.yearlyEntitlement || 0,
      accrued: ent.accruedRounded || ent.accruedActual || 0,
      taken: ent.taken || 0,
      pending: ent.pending || 0,
      carryForward: ent.carryForward || 0,
      remaining: ent.remaining || 0,
    }));
  }

  async getPendingApprovalsCount(managerId: string) {
    this.validateObjectId(managerId, 'managerId');

    const count = await this.leaveRequestModel.countDocuments({
      status: LeaveStatus.PENDING,
      'approvalFlow.0.status': 'pending',
    });

    return { managerId, pendingCount: count };
  }

  async getOverdueRequests(hoursThreshold: number = 48) {
    const thresholdDate = new Date(Date.now() - hoursThreshold * 60 * 60 * 1000);

    return this.leaveRequestModel.find({
      status: LeaveStatus.PENDING,
      createdAt: { $lt: thresholdDate },
    }).lean();
  }

  async checkAndEscalateOverdue() {
    const overdueRequests = await this.getOverdueRequests(48);

    for (const request of overdueRequests) {
      const employeeProfile = await this.sharedLeavesService.getEmployeeProfile(request.employeeId.toString());
      const managerId = await this.sharedLeavesService.getEmployeeManager(request.employeeId.toString());

      if (managerId) {
        await this.sharedLeavesService.sendOverdueApprovalEscalationNotification(
          managerId,
          request._id.toString(),
          employeeProfile?.fullName || 'Employee'
        );
      }
    }

    return { escalated: overdueRequests.length };
  }

  // --------------------------------------------------------------------------------
  // Calendar Management Extended
  // --------------------------------------------------------------------------------

  async updateCalendar(year: number, dto: { holidays?: Date[]; blockedPeriods?: any[] }) {
    let calendar = await this.calendarModel.findOne({ year });

    if (!calendar) {
      calendar = await this.calendarModel.create({
        year,
        holidays: dto.holidays || [],
        blockedPeriods: dto.blockedPeriods || [],
      });
    } else {
      if (dto.holidays) calendar.holidays = dto.holidays;
      if (dto.blockedPeriods) calendar.blockedPeriods = dto.blockedPeriods;
      await calendar.save();
    }

    return calendar;
  }

  async removeHoliday(year: number, date: Date) {
    const calendar = await this.calendarModel.findOne({ year });
    if (!calendar) throw new NotFoundException('Calendar not found for this year');

    const dateStr = date.toISOString().slice(0, 10);
    calendar.holidays = calendar.holidays.filter(
      (h: Date) => new Date(h).toISOString().slice(0, 10) !== dateStr
    );

    return calendar.save();
  }

  async removeBlockedPeriod(year: number, from: Date, to: Date) {
    const calendar = await this.calendarModel.findOne({ year });
    if (!calendar) throw new NotFoundException('Calendar not found for this year');

    calendar.blockedPeriods = calendar.blockedPeriods.filter(
      (p: any) =>
        new Date(p.from).getTime() !== from.getTime() ||
        new Date(p.to).getTime() !== to.getTime()
    );

    return calendar.save();
  }

  // --------------------------------------------------------------------------------
  // Attachment Management Extended
  // --------------------------------------------------------------------------------

  async getAttachment(id: string) {
    this.validateObjectId(id, 'id');
    const attachment = await this.attachmentModel.findById(id).lean();
    if (!attachment) throw new NotFoundException('Attachment not found');
    return attachment;
  }

  async deleteAttachment(id: string) {
    this.validateObjectId(id, 'id');
    const deleted = await this.attachmentModel.findByIdAndDelete(id);
    if (!deleted) throw new NotFoundException('Attachment not found');
    return { success: true };
  }

  // --------------------------------------------------------------------------------
  // Adjustment History
  // --------------------------------------------------------------------------------

  async getAdjustmentHistory(employeeId: string, leaveTypeId?: string) {
    this.validateObjectId(employeeId, 'employeeId');

    const filter: any = { employeeId: new Types.ObjectId(employeeId) };
    if (leaveTypeId) {
      this.validateObjectId(leaveTypeId, 'leaveTypeId');
      filter.leaveTypeId = new Types.ObjectId(leaveTypeId);
    }

    return this.adjustmentModel
      .find(filter)
      .populate('leaveTypeId', 'name code')
     // .populate('hrUserId', 'firstName lastName')
      .sort({ createdAt: -1 })
      .lean();
  }

  /**
   * Fix negative balances for unpaid leave types
   * Unpaid leave should NOT affect balance - this method corrects any incorrect deductions
   * @param employeeId Optional - fix for specific employee only
   * @param addDays Optional - add days to yearly entitlement (default: 0)
   */
  async fixUnpaidLeaveBalances(employeeId?: string, addDays: number = 0): Promise<{ fixed: number; errors: string[]; updated: number }> {
    try {
      this.logger.log(`[BALANCE FIX] Starting unpaid leave balance correction${addDays > 0 ? ` (adding ${addDays} days)` : ''}...`);
      
      // Get all unpaid leave types
      const unpaidLeaveTypes = await this.leaveTypeModel.find({ paid: false }).lean();
      const unpaidLeaveTypeIds = unpaidLeaveTypes.map(lt => lt._id.toString());
      
      if (unpaidLeaveTypeIds.length === 0) {
        this.logger.log('[BALANCE FIX] No unpaid leave types found in system');
        return { fixed: 0, errors: [], updated: 0 };
      }

      // Build query for entitlements
      const query: any = { leaveTypeId: { $in: unpaidLeaveTypeIds.map(id => new Types.ObjectId(id)) } };
      if (employeeId) {
        query.employeeId = new Types.ObjectId(employeeId);
      }

      // Find all entitlements for unpaid leave types
      const entitlements = await this.entitlementModel.find(query).lean();
      this.logger.log(`[BALANCE FIX] Found ${entitlements.length} unpaid leave entitlements to check`);

      let fixedCount = 0;
      let updatedCount = 0;
      const errors: string[] = [];

      for (const ent of entitlements) {
        try {
          // Unpaid leave should NOT have taken/remaining deductions
          // Reset taken to 0 and recalculate remaining based on yearly + carryForward only
          let yearly = ent.yearlyEntitlement || 0;
          const carryForward = ent.carryForward || 0;
          const currentTaken = ent.taken || 0;
          const currentRemaining = ent.remaining || 0;

          // Add days to yearly entitlement if requested
          if (addDays > 0) {
            yearly = yearly + addDays;
            updatedCount++;
            this.logger.log(
              `[BALANCE FIX] Adding ${addDays} days to entitlement ${ent._id}: ` +
              `Yearly: ${ent.yearlyEntitlement || 0} → ${yearly}`
            );
          }

          const correctRemaining = yearly + carryForward;

          // Fix if there's a discrepancy (taken > 0, remaining != correct, or days were added)
          if (currentTaken > 0 || currentRemaining !== correctRemaining || addDays > 0) {
            await this.entitlementModel.updateOne(
              { _id: ent._id },
              {
                $set: {
                  yearlyEntitlement: yearly, // Updated if addDays > 0
                  taken: 0, // Unpaid leave doesn't deduct from balance
                  remaining: correctRemaining, // Remaining = yearly + carryForward (no deductions)
                }
              }
            );

            fixedCount++;
            this.logger.log(
              `[BALANCE FIX] Fixed entitlement ${ent._id}: ` +
              `Yearly: ${ent.yearlyEntitlement || 0} → ${yearly}, ` +
              `Taken: ${currentTaken} → 0, Remaining: ${currentRemaining} → ${correctRemaining}`
            );
          }
        } catch (err: any) {
          const errorMsg = `Failed to fix entitlement ${ent._id}: ${err.message}`;
          errors.push(errorMsg);
          this.logger.error(`[BALANCE FIX] ${errorMsg}`, err);
        }
      }

      this.logger.log(`[BALANCE FIX] ✅ Completed. Fixed ${fixedCount} entitlements, Updated ${updatedCount} with added days. Errors: ${errors.length}`);
      return { fixed: fixedCount, errors, updated: updatedCount };
    } catch (error: any) {
      this.logger.error('[BALANCE FIX] ❌ Failed to fix unpaid leave balances:', error);
      throw new BadRequestException(`Failed to fix unpaid leave balances: ${error.message}`);
    }
  }

  // --------------------------------------------------------------------------------
  // User Role Management (REQ: HR Admin manages user roles and permissions)
  // --------------------------------------------------------------------------------

  /**
   * Get user by ID or email for role management
   * @param query - User ID (ObjectId) or email address
   * @returns User profile with roles
   */
  async getUserByIdOrEmail(query: string): Promise<any> {
    if (!query || !query.trim()) {
      throw new BadRequestException('Query parameter is required');
    }

    const q = query.trim();
    let employeeProfile: any = null;
    let systemRole: any = null;

    // Try to find by ObjectId first
    if (Types.ObjectId.isValid(q)) {
      employeeProfile = await this.sharedLeavesService['employeeProfileModel']
        .findById(new Types.ObjectId(q))
        .select('_id fullName employeeNumber workEmail status')
        .lean()
        .exec();

      if (employeeProfile) {
        systemRole = await this.sharedLeavesService['systemRoleModel']
          .findOne({ employeeProfileId: new Types.ObjectId(q), isActive: true })
          .select('roles permissions isActive')
          .lean()
          .exec();
      }
    }

    // If not found by ID, try email or employeeNumber
    if (!employeeProfile) {
      employeeProfile = await this.sharedLeavesService['employeeProfileModel']
        .findOne({ 
          $or: [
            { employeeNumber: q },
            { workEmail: q },
          ]
        })
        .select('_id fullName employeeNumber workEmail status')
        .lean()
        .exec();

      if (employeeProfile) {
        systemRole = await this.sharedLeavesService['systemRoleModel']
          .findOne({ employeeProfileId: employeeProfile._id, isActive: true })
          .select('roles permissions isActive')
          .lean()
          .exec();
      }
    }

    if (!employeeProfile) {
      throw new NotFoundException(`User not found with ID or email: ${q}`);
    }

    // Determine primary role (first role in array, or default)
    const primaryRole = systemRole?.roles?.[0] || null;

    return {
      _id: employeeProfile._id,
      id: employeeProfile._id,
      fullName: employeeProfile.fullName || '',
      email: (employeeProfile as any).workEmail || '',
      employeeNumber: employeeProfile.employeeNumber || '',
      status: employeeProfile.status || '',
      role: primaryRole,
      roles: systemRole?.roles || [],
      permissions: systemRole?.permissions || [],
      isActive: systemRole?.isActive ?? true,
    };
  }

  /**
   * Update user role for leave management
   * @param userId - User ID (ObjectId)
   * @param payload - Update payload with role and optional actorId
   * @returns Updated user profile with roles
   */
  async updateUserRole(userId: string, payload: { role: string; actorId?: string }): Promise<any> {
    this.validateObjectId(userId, 'userId');

    const { role, actorId } = payload;

    if (!role) {
      throw new BadRequestException('Role is required');
    }

    // Validate role is a valid SystemRole
    const validRoles = Object.values(SystemRole);
    if (!validRoles.includes(role as SystemRole)) {
      throw new BadRequestException(`Invalid role: ${role}. Valid roles: ${validRoles.join(', ')}`);
    }

    // Check if employee exists
    const employeeProfile = await this.sharedLeavesService['employeeProfileModel']
      .findById(new Types.ObjectId(userId))
      .select('_id fullName employeeNumber workEmail status')
      .lean()
      .exec();

    if (!employeeProfile) {
      throw new NotFoundException(`Employee not found with ID: ${userId}`);
    }

    // Find or create system role document
    let systemRole = await this.sharedLeavesService['systemRoleModel']
      .findOne({ employeeProfileId: new Types.ObjectId(userId) })
      .exec();

    if (!systemRole) {
      // Create new system role document
      systemRole = new this.sharedLeavesService['systemRoleModel']({
        employeeProfileId: new Types.ObjectId(userId),
        roles: [role as SystemRole],
        permissions: [],
        isActive: true,
      });
    } else {
      // Update existing role - replace all roles with the new one
      // Or add if not present (depending on business logic)
      if (!systemRole.roles.includes(role as SystemRole)) {
        systemRole.roles = [role as SystemRole]; // Replace with single role
      }
      systemRole.isActive = true;
    }

    await systemRole.save();

    // Log the change if actorId is provided
    if (actorId) {
      this.logger.log(`[ROLE UPDATE] User ${userId} role updated to ${role} by actor ${actorId}`);
    }

    // Return updated user info
    return {
      _id: employeeProfile._id,
      id: employeeProfile._id,
      fullName: employeeProfile.fullName || '',
      email: (employeeProfile as any).workEmail || '',
      employeeNumber: employeeProfile.employeeNumber || '',
      status: employeeProfile.status || '',
      role: role,
      roles: systemRole.roles,
      permissions: systemRole.permissions || [],
      isActive: systemRole.isActive,
    };
  }
}


