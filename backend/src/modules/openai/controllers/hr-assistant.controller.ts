import { Controller, Post, Body, Get, HttpException, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBody } from '@nestjs/swagger';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { HRAssistantService } from '../services/hr-assistant.service';
import { EmployeeProfile } from '../../employee/models/employee/employee-profile.schema';
import { Department } from '../../organization-structure/models/department.schema';
import { Position } from '../../organization-structure/models/position.schema';
import { LeaveRequest } from '../../leaves/models/leave-request.schema';
import { LeaveType } from '../../leaves/models/leave-type.schema';
import { payrollRuns } from '../../payroll/payroll-execution/models/payrollRuns.schema';
import { paySlip } from '../../payroll/payroll-execution/models/payslip.schema';
import { employeePayrollDetails } from '../../payroll/payroll-execution/models/employeePayrollDetails.schema';
import { claims } from '../../payroll/payroll-tracking/models/claims.schema';
import { disputes } from '../../payroll/payroll-tracking/models/disputes.schema';
import { AppraisalRecord } from '../../performance/models/appraisal-record.schema';
import { AppraisalCycle } from '../../performance/models/appraisal-cycle.schema';
import { Application } from '../../recruitment/models/application.schema';
import { JobRequisition } from '../../recruitment/models/job-requisition.schema';
import { Interview } from '../../recruitment/models/interview.schema';
import { Offer } from '../../recruitment/models/offer.schema';
import { AttendanceRecord } from '../../time-management/models/attendance-record.schema';
import { Shift } from '../../time-management/models/shift.schema';
import { Holiday } from '../../time-management/models/holiday.schema';

class AssistantQueryDto {
    query: string;
    conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>;
    includeData?: {
        employees?: boolean;
        organization?: boolean;
        leaves?: boolean;
        payroll?: boolean;
        performance?: boolean;
        recruitment?: boolean;
        timeManagement?: boolean;
        summary?: boolean;
        all?: boolean;
    };
}

@ApiTags('HR Assistant')
@Controller('api/hr-assistant')
export class HRAssistantController {
    constructor(
        private readonly hrAssistantService: HRAssistantService,
        @InjectModel(EmployeeProfile.name) private employeeModel: Model<EmployeeProfile>,
        @InjectModel(Department.name) private departmentModel: Model<Department>,
        @InjectModel(Position.name) private positionModel: Model<Position>,
        @InjectModel(LeaveRequest.name) private leaveRequestModel: Model<LeaveRequest>,
        @InjectModel(LeaveType.name) private leaveTypeModel: Model<LeaveType>,
        @InjectModel(payrollRuns.name) private payrollRunsModel: Model<payrollRuns>,
        @InjectModel(paySlip.name) private paySlipModel: Model<paySlip>,
        @InjectModel(employeePayrollDetails.name) private payrollDetailsModel: Model<employeePayrollDetails>,
        @InjectModel(claims.name) private claimsModel: Model<claims>,
        @InjectModel(disputes.name) private disputesModel: Model<disputes>,
        @InjectModel(AppraisalRecord.name) private appraisalRecordModel: Model<AppraisalRecord>,
        @InjectModel(AppraisalCycle.name) private appraisalCycleModel: Model<AppraisalCycle>,
        @InjectModel(Application.name) private applicationModel: Model<Application>,
        @InjectModel(JobRequisition.name) private requisitionModel: Model<JobRequisition>,
        @InjectModel(Interview.name) private interviewModel: Model<Interview>,
        @InjectModel(Offer.name) private offerModel: Model<Offer>,
        @InjectModel(AttendanceRecord.name) private attendanceModel: Model<AttendanceRecord>,
        @InjectModel(Shift.name) private shiftModel: Model<Shift>,
        @InjectModel(Holiday.name) private holidayModel: Model<Holiday>,
    ) {}

    @Post('chat')
    @ApiOperation({ summary: 'Chat with HR AI Assistant (read-only)' })
    @ApiBody({ type: AssistantQueryDto })
    async chat(@Body() body: AssistantQueryDto) {
        try {
            const includeData = body.includeData || { summary: true };
            const loadAll = !!includeData.all;

            const dataContext: Record<string, unknown> = {};

            if (includeData.summary || loadAll) {
                const [
                    employeeCount,
                    departmentCount,
                    positionCount,
                    leaveRequestCount,
                    payrollRunsCount,
                    appraisalCount,
                    applicationCount,
                    attendanceCount,
                ] = await Promise.all([
                    this.employeeModel.countDocuments(),
                    this.departmentModel.countDocuments(),
                    this.positionModel.countDocuments(),
                    this.leaveRequestModel.countDocuments(),
                    this.payrollRunsModel.countDocuments(),
                    this.appraisalRecordModel.countDocuments(),
                    this.applicationModel.countDocuments(),
                    this.attendanceModel.countDocuments(),
                ]);

                dataContext.systemSummary = {
                    totalEmployees: employeeCount,
                    totalDepartments: departmentCount,
                    totalPositions: positionCount,
                    leaveRequests: leaveRequestCount,
                    payrollRuns: payrollRunsCount,
                    appraisalRecords: appraisalCount,
                    applications: applicationCount,
                    attendanceRecords: attendanceCount,
                    timestamp: new Date().toISOString(),
                };
            }

            if (includeData.employees || loadAll) {
                dataContext.employees = await this.employeeModel
                    .find()
                    .select('firstName lastName email status dateOfHire primaryDepartmentId primaryPositionId')
                    .limit(50)
                    .lean();
            }

            if (includeData.organization || loadAll) {
                const [departments, positions] = await Promise.all([
                    this.departmentModel.find().lean(),
                    this.positionModel.find().lean(),
                ]);
                dataContext.organization = {
                    departments,
                    positions,
                };
            }

            if (includeData.leaves || loadAll) {
                const [leaveRequests, leaveTypes] = await Promise.all([
                    this.leaveRequestModel.find().limit(50).lean(),
                    this.leaveTypeModel.find().lean(),
                ]);
                dataContext.leaves = {
                    leaveRequests,
                    leaveTypes,
                };
            }

            if (includeData.payroll || loadAll) {
                const [runs, payslips, payrollDetails, claims, disputes] = await Promise.all([
                    this.payrollRunsModel.find().limit(20).lean(),
                    this.paySlipModel.find().limit(20).lean(),
                    this.payrollDetailsModel.find().limit(20).lean(),
                    this.claimsModel.find().limit(20).lean(),
                    this.disputesModel.find().limit(20).lean(),
                ]);
                dataContext.payroll = {
                    runs,
                    payslips,
                    payrollDetails,
                    claims,
                    disputes,
                };
            }

            if (includeData.performance || loadAll) {
                const [records, cycles] = await Promise.all([
                    this.appraisalRecordModel.find().limit(20).lean(),
                    this.appraisalCycleModel.find().limit(20).lean(),
                ]);
                dataContext.performance = {
                    appraisalRecords: records,
                    appraisalCycles: cycles,
                };
            }

            if (includeData.recruitment || loadAll) {
                const [applications, requisitions, interviews, offers] = await Promise.all([
                    this.applicationModel.find().limit(20).lean(),
                    this.requisitionModel.find().limit(20).lean(),
                    this.interviewModel.find().limit(20).lean(),
                    this.offerModel.find().limit(20).lean(),
                ]);
                dataContext.recruitment = {
                    applications,
                    requisitions,
                    interviews,
                    offers,
                };
            }

            if (includeData.timeManagement || loadAll) {
                const [attendance, shifts, holidays] = await Promise.all([
                    this.attendanceModel.find().limit(20).lean(),
                    this.shiftModel.find().limit(20).lean(),
                    this.holidayModel.find().limit(20).lean(),
                ]);
                dataContext.timeManagement = {
                    attendanceRecords: attendance,
                    shifts,
                    holidays,
                };
            }

            const response = await this.hrAssistantService.processQuery(
                body.query,
                body.conversationHistory || [],
                dataContext
            );

            return {
                success: true,
                response,
                dataLoaded: Object.keys(dataContext),
            };
        } catch (error) {
            throw new HttpException(
                `HR Assistant error: ${error.message}`,
                HttpStatus.INTERNAL_SERVER_ERROR
            );
        }
    }

    @Post('analyze')
    @ApiOperation({ summary: 'Analyze user intent' })
    async analyzeIntent(@Body() body: { query: string }) {
        try {
            const analysis = await this.hrAssistantService.analyzeIntent(body.query);
            return { success: true, analysis };
        } catch (error) {
            throw new HttpException(
                `Analysis error: ${error.message}`,
                HttpStatus.INTERNAL_SERVER_ERROR
            );
        }
    }

    @Post('report')
    @ApiOperation({ summary: 'Generate an AI report' })
    async generateReport(@Body() body: { reportType: string; filters?: Record<string, unknown> }) {
        try {
            // Gather data based on report type
            let data: Record<string, unknown> = {};

            switch (body.reportType) {
                case 'employee-summary':
                    const employees = await this.employeeModel.find().lean();
                    const byStatus = employees.reduce((acc, emp) => {
                        const status = emp.status || 'unknown';
                        acc[status] = (acc[status] || 0) + 1;
                        return acc;
                    }, {} as Record<string, number>);
                    data = { totalEmployees: employees.length, byStatus };
                    break;

                case 'department-overview':
                    const departments = await this.departmentModel.find().lean();
                    data = { departments, totalDepartments: departments.length };
                    break;

                default:
                    data = { message: 'Report type not recognized' };
            }

            const report = await this.hrAssistantService.generateReport(body.reportType, data);
            return { success: true, report, rawData: data };
        } catch (error) {
            throw new HttpException(
                `Report generation error: ${error.message}`,
                HttpStatus.INTERNAL_SERVER_ERROR
            );
        }
    }

    @Post('draft')
    @ApiOperation({ summary: 'Draft an HR document' })
    async draftDocument(@Body() body: { documentType: string; context: Record<string, unknown> }) {
        try {
            const document = await this.hrAssistantService.draftDocument(
                body.documentType,
                body.context
            );
            return { success: true, document };
        } catch (error) {
            throw new HttpException(
                `Document drafting error: ${error.message}`,
                HttpStatus.INTERNAL_SERVER_ERROR
            );
        }
    }

    @Get('capabilities')
    @ApiOperation({ summary: 'Get assistant capabilities' })
    getCapabilities() {
        return {
            capabilities: [
                {
                    name: 'Employee Lookup',
                    description: 'Search and view employee information',
                    examples: ['Show me all employees in Engineering', 'Find employee John Doe', 'List recent hires'],
                },
                {
                    name: 'Payroll Insights',
                    description: 'Get payroll summaries and information',
                    examples: ['Show payroll summary for this month', 'What are the total salary expenses?'],
                },
                {
                    name: 'Leave Management',
                    description: 'Check leave balances and requests',
                    examples: ['Show pending leave requests', 'What is my leave balance?'],
                },
                {
                    name: 'Reports',
                    description: 'Generate various HR reports',
                    examples: ['Generate employee summary report', 'Show department overview'],
                },
                {
                    name: 'Document Drafting',
                    description: 'Help draft HR documents',
                    examples: ['Draft an offer letter', 'Write a job description for Software Engineer'],
                },
                {
                    name: 'General HR Help',
                    description: 'Answer HR-related questions',
                    examples: ['What is our leave policy?', 'How do I request overtime?'],
                },
            ],
        };
    }
}
