import { IsArray, ArrayNotEmpty, IsString } from 'class-validator';

export class BulkActionDto {
    @IsArray()
    @ArrayNotEmpty()
    requestIds: string[];

    @IsString()
    action: 'approve' | 'reject';
}