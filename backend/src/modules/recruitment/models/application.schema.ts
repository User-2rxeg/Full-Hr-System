import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { ApplicationStage } from '../enums/application-stage.enum';
import { ApplicationStatus } from '../enums/application-status.enum';

export enum ApplicationSource {
    CAREERS_PAGE = 'CAREERS_PAGE',
    LINKEDIN = 'LINKEDIN',
    INDEED = 'INDEED',
    REFERRAL = 'REFERRAL',
    AGENCY = 'AGENCY',
    JOB_BOARD = 'JOB_BOARD',
    DIRECT = 'DIRECT',
    OTHER = 'OTHER'
}

@Schema({ timestamps: true })
export class Application {

    @Prop({ type: Types.ObjectId, ref: 'Candidate', required: true })
    candidateId: Types.ObjectId;

    @Prop({ type: Types.ObjectId, ref: 'JobRequisition', required: true })
    requisitionId: Types.ObjectId;

    @Prop({ type: Types.ObjectId, ref: 'User' })
    assignedHr?: Types.ObjectId;

    @Prop({
        enum: ApplicationStage,
        default: ApplicationStage.SCREENING
    })
    currentStage: ApplicationStage;

    @Prop({
        enum: ApplicationStatus,
        default: ApplicationStatus.SUBMITTED
    })
    status: ApplicationStatus;

    // Analytics tracking fields
    @Prop({
        enum: ApplicationSource,
        default: ApplicationSource.CAREERS_PAGE
    })
    source: ApplicationSource;

    @Prop({ type: Types.ObjectId, ref: 'Referral' })
    referralId?: Types.ObjectId;

    @Prop()
    sourceDetail?: string; // e.g., specific job board name
}

export type ApplicationDocument = HydratedDocument<Application>;
export const ApplicationSchema = SchemaFactory.createForClass(Application);