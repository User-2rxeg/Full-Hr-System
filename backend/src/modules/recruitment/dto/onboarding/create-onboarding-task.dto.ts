import { IsString, IsNotEmpty, IsOptional, IsDateString, IsMongoId, Validate, ValidatorConstraint, ValidatorConstraintInterface, ValidationArguments } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Custom validator to ensure date is not in the past
 */
@ValidatorConstraint({ name: 'isNotPastDate', async: false })
export class IsNotPastDateConstraint implements ValidatorConstraintInterface {
    validate(dateString: string, args: ValidationArguments) {
        if (!dateString) return true;
        const date = new Date(dateString);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return date >= today;
    }

    defaultMessage(args: ValidationArguments) {
        return 'Date cannot be in the past';
    }
}

export class CreateOnboardingTaskDto {
    @ApiProperty({ description: 'Task name', example: 'Complete I-9 Form' })
    @IsString()
    @IsNotEmpty()
    name: string;

    @ApiProperty({ description: 'Department responsible', example: 'HR' })
    @IsString()
    @IsNotEmpty()
    department: string;

    @ApiPropertyOptional({ description: 'Task deadline (cannot be in the past)', example: '2025-12-31T00:00:00.000Z' })
    @IsDateString()
    @IsOptional()
    @Validate(IsNotPastDateConstraint, { message: 'Task deadline cannot be in the past' })
    deadline?: string;

    @ApiPropertyOptional({ description: 'Document ID if task requires document upload', example: '507f1f77bcf86cd799439013' })
    @IsMongoId()
    @IsOptional()
    documentId?: string;

    @ApiPropertyOptional({ description: 'Additional notes', example: 'Must be completed before first day' })
    @IsString()
    @IsOptional()
    notes?: string;
}
