import { IsEnum, IsNotEmpty, IsString, IsMongoId } from 'class-validator';
import { DocumentType } from '../../enums/document-type.enum';
import { ApiProperty } from '@nestjs/swagger';

export class UploadDocumentDto {
    @ApiProperty({ description: 'Owner ID (employee/candidate)', example: '507f1f77bcf86cd799439011' })
    @IsMongoId()
    @IsNotEmpty()
    ownerId: string;

    @ApiProperty({ enum: DocumentType, description: 'Type of document' })
    @IsEnum(DocumentType)
    @IsNotEmpty()
    type: DocumentType;

    @ApiProperty({ description: 'File path or URL', example: '/uploads/documents/id-card-12345.pdf' })
    @IsString()
    @IsNotEmpty()
    filePath: string;
}

