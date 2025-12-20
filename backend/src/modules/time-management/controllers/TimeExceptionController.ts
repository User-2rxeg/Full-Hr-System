// src/time-management/time-exception/time-exception.controller.ts

import { Controller, Post, Body, Get, Param, Query, Put, Response } from '@nestjs/common';

import { CreateExceptionDto, AssignExceptionDto, UpdateExceptionStatusDto, ExceptionQueryDto } from '../dto/TimeExceptionDtos';
import {TimeExceptionService} from "../services/TimeExceptionService";

@Controller('time-exceptions')
export class TimeExceptionController {
    constructor(private readonly svc: TimeExceptionService) {}

    @Post()
    async create(@Body() dto: CreateExceptionDto) {
        return this.svc.createException(dto);
    }

    @Get('export/csv')
    async exportCSV(@Response() res: any) {
        return this.svc.exportToCSV(res);
    }

    @Get('export/json')
    async exportJSON(@Response() res: any) {
        return this.svc.exportToJSON(res);
    }

    @Get()
    async list(@Query() query: ExceptionQueryDto) {
        // If no query parameters provided, return all exceptions
        if (!query.status && !query.type && !query.employeeId && !query.assignedTo) {
            return this.svc.getAllExceptions();
        }
        // Otherwise, use filtered search
        return this.svc.listExceptions(query);
    }

    @Get(':id')
    async getOne(@Param('id') id: string) {
        return this.svc.getException(id);
    }

    @Put('assign')
    async assign(@Body() dto: AssignExceptionDto) {
        return this.svc.assignException(dto);
    }

    @Put('status')
    async updateStatus(@Body() dto: UpdateExceptionStatusDto) {
        return this.svc.updateStatus(dto);
    }
}
