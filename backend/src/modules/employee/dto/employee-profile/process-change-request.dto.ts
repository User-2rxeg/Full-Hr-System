import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ProfileChangeStatus } from '../../enums/employee-profile.enums';

export class ProcessChangeRequestDto {
    @IsEnum(ProfileChangeStatus, {
        message: 'Status must be either APPROVED or REJECTED'
    })
    status: ProfileChangeStatus.APPROVED | ProfileChangeStatus.REJECTED;

    @IsOptional()
    @IsString()
    rejectionReason?: string;

    @IsOptional()
    proposedChanges?: Record<string, any>;
}
