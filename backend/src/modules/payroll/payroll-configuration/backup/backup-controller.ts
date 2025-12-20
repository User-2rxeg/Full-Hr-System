import {
    Controller,
    Post,
    Get,
    Delete,
    Param,
    Body,
    Logger,
    HttpException,
    HttpStatus,
} from '@nestjs/common';
import {BackupMetadata, BackupService} from "./backup-service";




@Controller('api/backups')
export class BackupController {
    private readonly logger = new Logger(BackupController.name);

    constructor(private readonly backupService: BackupService) {}

    @Post('create')
    async createBackup(@Body() body?: { name?: string; oplog?: boolean; dumpDbUsersAndRoles?: boolean }): Promise<BackupMetadata> {
        try {
            this.logger.log('Manual backup requested');
            const metadata = await this.backupService.createBackup({
                name: body?.name || 'manual',
                oplog: body?.oplog ?? false,
                dumpDbUsersAndRoles: body?.dumpDbUsersAndRoles ?? false,
            });
            return metadata;
        } catch (error) {
            this.logger.error(`Backup creation failed: ${error instanceof Error ? error.message : String(error)}`);
            throw new HttpException(
                `Backup failed: ${error instanceof Error ? error.message : String(error)}`,
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }

    @Get('list')
    async listBackups(): Promise<BackupMetadata[]> {
        try {
            return await this.backupService.listBackups();
        } catch (error) {
            this.logger.error(`Failed to list backups: ${error instanceof Error ? error.message : String(error)}`);
            throw new HttpException(
                `Failed to list backups: ${error instanceof Error ? error.message : String(error)}`,
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }

    @Delete(':filename')
    async deleteBackup(@Param('filename') filename: string): Promise<{ message: string }> {
        try {
            await this.backupService.deleteBackup(filename);
            return { message: `Backup ${filename} deleted successfully` };
        } catch (error) {
            this.logger.error(`Failed to delete backup: ${error instanceof Error ? error.message : String(error)}`);
            throw new HttpException(
                `Failed to delete backup: ${error instanceof Error ? error.message : String(error)}`,
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }
}

