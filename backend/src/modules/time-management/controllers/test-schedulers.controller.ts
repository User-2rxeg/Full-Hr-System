import { Controller, Post } from '@nestjs/common';
import { ShiftExpiryScheduler } from '../services/ShiftExpiryScheduler';
import { TimeExceptionEscalationScheduler } from '../services/time-exception-escalation.scheduler';

@Controller('test-schedulers')
export class TestSchedulersController {
    constructor(
        private shiftExpiryScheduler: ShiftExpiryScheduler,
        private timeExceptionScheduler: TimeExceptionEscalationScheduler,
    ) {}

    @Post('shift-expiry')
    async testShiftExpiry() {
        // Trigger immediately
        await this.shiftExpiryScheduler.runDaily();
        return {
            status: 'ShiftExpiryScheduler triggered',
            message: 'Check logs for detailed output',
        };
    }

    @Post('time-exception-escalation')
    async testTimeExceptionEscalation() {
        // Trigger immediately
        await this.timeExceptionScheduler.escalateUnreviewedTimeExceptions();
        return {
            status: 'TimeExceptionEscalationScheduler triggered',
            message: 'Check logs for detailed output',
        };
    }
}

