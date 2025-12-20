import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types, Schema as MongooseSchema } from 'mongoose';
import { ProfileChangeStatus } from "../../enums/employee-profile.enums";

export type EmployeeProfileChangeRequestDocument = HydratedDocument<EmployeeProfileChangeRequest>;

@Schema({ collection: 'employee_profile_change_requests', timestamps: true })
export class EmployeeProfileChangeRequest {
    @Prop({ type: String, required: true, unique: true })
    requestId: string;

    @Prop({ type: Types.ObjectId, ref: 'EmployeeProfile', required: true })
    employeeProfileId: Types.ObjectId;

    @Prop({ type: String, required: true })
    requestDescription: string;

    @Prop({ type: String })
    reason?: string;

    @Prop({
        type: String,
        enum: Object.values(ProfileChangeStatus),
        default: ProfileChangeStatus.PENDING,
    })
    status: ProfileChangeStatus;

    @Prop({ type: Date, default: () => new Date() })
    submittedAt: Date;

    @Prop({ type: Date })
    processedAt?: Date;

    @Prop({ type: Types.ObjectId, ref: 'EmployeeProfile' })
    processedBy?: Types.ObjectId;

    @Prop({ type: String })
    rejectionReason?: string;

    // Proposed changes that HR will apply (structured data)
    @Prop({
        type: MongooseSchema.Types.Mixed,
        default: {}
    })
    proposedChanges?: Record<string, any>;
}

export const EmployeeProfileChangeRequestSchema = SchemaFactory.createForClass(
    EmployeeProfileChangeRequest,
);