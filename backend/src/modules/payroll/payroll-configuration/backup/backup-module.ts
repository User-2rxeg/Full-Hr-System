import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import {BackupService} from "./backup-service";
import {BackupController} from "./backup-controller";
import {CronBackupService} from "./backup-cron";


@Module({
    imports: [ScheduleModule.forRoot()],
    providers: [BackupService,CronBackupService],
    controllers: [BackupController],
    exports: [BackupService],
})
export class BackupModule {}

