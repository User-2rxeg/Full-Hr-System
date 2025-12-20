import { IsArray, IsEnum, IsMongoId, IsOptional, ArrayMinSize } from 'class-validator';
import { SystemRole } from '../../enums/employee-profile.enums';

export class AdminAssignRoleDto {
    @IsOptional()
    @IsMongoId()
    accessProfileId?: string;

    @IsOptional()
    @IsArray()
    @ArrayMinSize(1, { message: 'At least one role must be assigned' })
    @IsEnum(SystemRole, { each: true, message: 'Each role must be a valid system role' })
    roles?: SystemRole[];
}
