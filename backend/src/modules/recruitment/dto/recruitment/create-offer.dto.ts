import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsMongoId, IsOptional, IsNumber, IsDateString, IsArray, IsEnum, ValidateNested, Validate, ValidatorConstraint, ValidatorConstraintInterface, ValidationArguments } from 'class-validator';
import { Type } from 'class-transformer';
import { OfferResponseStatus } from '../../enums/offer-response-status.enum';
import { ApprovalStatus } from '../../enums/approval-status.enum';

/**
 * Custom validator to ensure date is in the future
 */
@ValidatorConstraint({ name: 'isFutureDate', async: false })
export class IsFutureDateConstraint implements ValidatorConstraintInterface {
    validate(dateString: string, args: ValidationArguments) {
        if (!dateString) return true;
        const date = new Date(dateString);
        return date > new Date();
    }

    defaultMessage(args: ValidationArguments) {
        return 'Date must be in the future';
    }
}

/**
 * REC-014: Manage job offers and approvals
 * REC-018: Generate, send and collect electronically signed offer letters
 * The system supports issuing an offer letter which needs to be customizable and editable
 */

class ApproverDto {
    @ApiProperty({ 
        description: 'Approver employee ID', 
        example: '507f1f77bcf86cd799439012' 
    })
    @IsMongoId()
    @IsNotEmpty()
    employeeId: string;

    @ApiProperty({ description: 'Role of approver', example: 'Hiring Manager' })
    @IsString()
    @IsNotEmpty()
    role: string;
}

export class CreateOfferDto {
    @ApiProperty({ 
        description: 'Application ID', 
        example: '692df406e5d9b085bcd29cc6' 
    })
    @IsMongoId()
    @IsNotEmpty()
    applicationId: string;

    @ApiProperty({ 
        description: 'Candidate ID', 
        example: '675c1a2b3d4e5f6789012345' 
    })
    @IsMongoId()
    @IsNotEmpty()
    candidateId: string;

    @ApiPropertyOptional({ 
        description: 'HR employee creating the offer',
        example: '507f1f77bcf86cd799439013' 
    })
    @IsMongoId()
    @IsOptional()
    hrEmployeeId?: string;

    @ApiProperty({ description: 'Job role/title', example: 'Senior Software Engineer' })
    @IsString()
    @IsNotEmpty()
    role: string;

    @ApiProperty({ description: 'Gross monthly salary', example: 50000 })
    @IsNumber()
    @IsNotEmpty()
    grossSalary: number;

    @ApiPropertyOptional({ description: 'Signing bonus', example: 10000 })
    @IsNumber()
    @IsOptional()
    signingBonus?: number;

    @ApiPropertyOptional({ description: 'Benefits list', example: ['Health Insurance', 'Gym Membership'] })
    @IsArray()
    @IsString({ each: true })
    @IsOptional()
    benefits?: string[];

    @ApiPropertyOptional({ description: 'Insurance details' })
    @IsString()
    @IsOptional()
    insurances?: string;

    @ApiPropertyOptional({ description: 'Additional conditions' })
    @IsString()
    @IsOptional()
    conditions?: string;

    @ApiPropertyOptional({ description: 'Offer letter content/body' })
    @IsString()
    @IsOptional()
    content?: string;

    @ApiProperty({ 
        description: 'Offer acceptance deadline (must be in the future)',
        example: '2025-12-31T23:59:59Z'
    })
    @IsDateString()
    @IsNotEmpty()
    @Validate(IsFutureDateConstraint, { message: 'Offer deadline must be in the future' })
    deadline: string;

    @ApiProperty({ description: 'List of approvers required', type: [ApproverDto] })
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => ApproverDto)
    approvers: ApproverDto[];
}

export class ApproveOfferDto {
    @ApiProperty({ description: 'Approver employee ID' })
    @IsMongoId()
    @IsNotEmpty()
    approverId: string;

    @ApiProperty({ description: 'Approval status', enum: ApprovalStatus })
    @IsEnum(ApprovalStatus)
    @IsNotEmpty()
    status: ApprovalStatus;

    @ApiPropertyOptional({ description: 'Approval comment' })
    @IsString()
    @IsOptional()
    comment?: string;
}

export class CandidateOfferResponseDto {
    @ApiProperty({ description: 'Candidate response', enum: OfferResponseStatus })
    @IsEnum(OfferResponseStatus)
    @IsNotEmpty()
    response: OfferResponseStatus;

    @ApiPropertyOptional({ description: 'Candidate signature (base64 or URL)' })
    @IsString()
    @IsOptional()
    signature?: string;

    @ApiPropertyOptional({ description: 'Decline reason (if rejected)' })
    @IsString()
    @IsOptional()
    declineReason?: string;
}

export class SendOfferDto {
    @ApiProperty({ description: 'Candidate email address' })
    @IsString()
    @IsNotEmpty()
    candidateEmail: string;

    @ApiPropertyOptional({ description: 'Custom email subject' })
    @IsString()
    @IsOptional()
    emailSubject?: string;

    @ApiPropertyOptional({ description: 'Custom email body' })
    @IsString()
    @IsOptional()
    emailBody?: string;
}
