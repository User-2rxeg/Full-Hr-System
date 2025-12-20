import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

/**
 * Employee Profile Audit Log Schema
 * BR 22: Every modification, edit, or cancellation must be logged with timestamp and Actor's ID
 * 
 * This is a separate audit schema - does not modify existing employee schemas
 */
export enum EmployeeProfileAuditAction {
    CREATED = 'CREATED',
    UPDATED = 'UPDATED',
    DELETED = 'DELETED',
    STATUS_CHANGED = 'STATUS_CHANGED',
    ROLE_ASSIGNED = 'ROLE_ASSIGNED',
    ROLE_REMOVED = 'ROLE_REMOVED',
    CONTACT_INFO_UPDATED = 'CONTACT_INFO_UPDATED',
    BIO_UPDATED = 'BIO_UPDATED',
    EMERGENCY_CONTACT_ADDED = 'EMERGENCY_CONTACT_ADDED',
    EMERGENCY_CONTACT_UPDATED = 'EMERGENCY_CONTACT_UPDATED',
    EMERGENCY_CONTACT_DELETED = 'EMERGENCY_CONTACT_DELETED',
    CHANGE_REQUEST_CREATED = 'CHANGE_REQUEST_CREATED',
    CHANGE_REQUEST_APPROVED = 'CHANGE_REQUEST_APPROVED',
    CHANGE_REQUEST_REJECTED = 'CHANGE_REQUEST_REJECTED',
    CHANGE_REQUEST_CANCELED = 'CHANGE_REQUEST_CANCELED',
    DEACTIVATED = 'DEACTIVATED',
}

export type EmployeeProfileAuditLogDocument = HydratedDocument<EmployeeProfileAuditLog>;

@Schema({ collection: 'employee_profile_audit_logs', timestamps: true })
export class EmployeeProfileAuditLog {
    @Prop({ type: String, enum: Object.values(EmployeeProfileAuditAction), required: true })
    action: EmployeeProfileAuditAction;

    @Prop({ type: Types.ObjectId, ref: 'EmployeeProfile', required: true })
    employeeProfileId: Types.ObjectId;

    @Prop({ type: Types.ObjectId, ref: 'EmployeeProfile' })
    performedByEmployeeId?: Types.ObjectId;

    @Prop({ type: String })
    summary?: string;

    @Prop({ type: String })
    fieldChanged?: string; // Specific field that was changed (e.g., 'mobilePhone', 'status', 'contractType')

    @Prop({ type: Object })
    beforeSnapshot?: Record<string, unknown>;

    @Prop({ type: Object })
    afterSnapshot?: Record<string, unknown>;

    @Prop({ type: String })
    ipAddress?: string;

    @Prop({ type: String })
    userAgent?: string;
}

export const EmployeeProfileAuditLogSchema =
    SchemaFactory.createForClass(EmployeeProfileAuditLog);

// Index for efficient queries
EmployeeProfileAuditLogSchema.index({ employeeProfileId: 1, createdAt: -1 });
EmployeeProfileAuditLogSchema.index({ performedByEmployeeId: 1, createdAt: -1 });
EmployeeProfileAuditLogSchema.index({ action: 1, createdAt: -1 });

