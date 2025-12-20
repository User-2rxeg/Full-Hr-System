import { Controller, Get, Post, Put, Delete, Body, Param, Query, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { HolidayService } from '../services/HolidayService';
import { Holiday } from '../models/holiday.schema';
import { HolidayType } from '../models/enums';

@ApiTags('Holidays')
@Controller('holidays')
export class HolidayController {
    constructor(private readonly holidayService: HolidayService) {}

    @Get()
    @ApiOperation({ summary: 'List all holidays' })
    @ApiResponse({ status: 200, schema: { type: 'array', items: { type: 'object', properties: { _id: { type: 'string' }, type: { type: 'string' }, startDate: { type: 'string', format: 'date-time' }, endDate: { type: 'string', format: 'date-time' }, name: { type: 'string' }, active: { type: 'boolean' } } } } })
    async list() {
        return this.holidayService.listAll();
    }

    @Get('check')
    @ApiOperation({ summary: 'Check if a date is a holiday' })
    @ApiResponse({ status: 200, schema: { type: 'object', properties: { isHoliday: { type: 'boolean' }, holiday: { type: 'object', nullable: true, properties: { _id: { type: 'string' }, type: { type: 'string' }, startDate: { type: 'string', format: 'date-time' }, endDate: { type: 'string', format: 'date-time' }, name: { type: 'string' }, active: { type: 'boolean' } } } } } })
    async check(@Query('date') dateStr: string) {
        if (!dateStr) throw new BadRequestException('date query param required in ISO or yyyy-mm-dd');
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) throw new BadRequestException('Invalid date');
        const holiday = await this.holidayService.getHolidayForDate(d);
        return { isHoliday: !!holiday, holiday };
    }
    @Get(':id')
    @ApiOperation({ summary: 'Get holiday by id' })
    @ApiResponse({ status: 200, schema: { type: 'object', properties: { _id: { type: 'string' }, type: { type: 'string' }, startDate: { type: 'string', format: 'date-time' }, endDate: { type: 'string', format: 'date-time' }, name: { type: 'string' }, active: { type: 'boolean' } } } })
    async getById(@Param('id') id: string) {
        return this.holidayService.getById(id);
    }

    // POST - create holiday with explicit swagger schema and examples
    @Post()
    @ApiOperation({ summary: 'Create a holiday' })
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                type: { type: 'string', enum: Object.values(HolidayType) },
                startDate: { type: 'string', format: 'date-time', description: 'Start date (ISO string or yyyy-mm-dd)' },
                endDate: { type: 'string', format: 'date-time', description: 'Optional end date for multi-day holidays' },
                name: { type: 'string' },
                active: { type: 'boolean', default: true }
            },
            required: ['type','startDate']
        },
        examples: {
            NationalHoliday: {
                summary: 'Single-day national holiday',
                value: { type: HolidayType.NATIONAL, startDate: '2025-12-25', name: 'Christmas Day', active: true }
            },
            OrganizationalHoliday: {
                summary: 'Multi-day company closure',
                value: { type: HolidayType.ORGANIZATIONAL, startDate: '2025-12-31', endDate: '2026-01-02', name: 'Year-end Closure', active: true }
            },
            WeeklyRest: {
                summary: 'Weekly rest day (recurring weekday)',
                value: { type: HolidayType.WEEKLY_REST, startDate: '2025-01-05', name: 'Sunday Rest', active: true }
            }
        }
    })
    @ApiResponse({ status: 201, description: 'Holiday created', schema: { type: 'object', properties: { _id: { type: 'string' }, type: { type: 'string' }, startDate: { type: 'string', format: 'date-time' }, endDate: { type: 'string', format: 'date-time' }, name: { type: 'string' }, active: { type: 'boolean' } } } })
    async create(@Body() payload: Partial<Holiday>) {
        if (!payload.type || !payload.startDate) throw new BadRequestException('type and startDate are required');
        return this.holidayService.createHoliday(payload);
    }

    // PUT - update holiday with same schema for swagger clarity
    @Put(':id')
    @ApiOperation({ summary: 'Update a holiday' })
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                type: { type: 'string', enum: Object.values(HolidayType) },
                startDate: { type: 'string', format: 'date-time' },
                endDate: { type: 'string', format: 'date-time' },
                name: { type: 'string' },
                active: { type: 'boolean' }
            }
        },
        examples: {
            UpdateName: { summary: 'Update name or active flag', value: { name: 'Updated Holiday Name', active: false } }
        }
    })
    @ApiResponse({ status: 200, description: 'Holiday updated', schema: { type: 'object', properties: { _id: { type: 'string' }, type: { type: 'string' }, startDate: { type: 'string', format: 'date-time' }, endDate: { type: 'string', format: 'date-time' }, name: { type: 'string' }, active: { type: 'boolean' } } } })
    async update(@Param('id') id: string, @Body() payload: Partial<Holiday>) {
        return this.holidayService.updateHoliday(id, payload);
    }

    @Delete(':id')
    @ApiOperation({ summary: 'Delete a holiday' })
    @ApiResponse({ status: 200, schema: { type: 'object', properties: { ok: { type: 'boolean' } } } })
    async delete(@Param('id') id: string) {
        const ok = await this.holidayService.deleteHoliday(id);
        return { ok };
    }
}
