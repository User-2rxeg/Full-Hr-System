import { Injectable } from '@nestjs/common';
import { OpenAIService } from './openai.service';

/**
 * HR AI Assistant Service
 * Provides AI-powered assistance with access to HR data and operations
 */
@Injectable()
export class HRAssistantService {
    private readonly HR_SYSTEM_CONTEXT = `
You are an AI HR Assistant for a comprehensive Human Resources Management System. You have read-only access to real-time HR data.

## System Capabilities:
- **Employee Management**: View employee profiles, contact info, employment history, documents
- **Organization Structure**: Departments, positions, reporting hierarchies, org charts
- **Payroll**: Salary info, payslips, deductions, allowances, tax calculations
- **Time Management**: Attendance records, work schedules, overtime
- **Leave Management**: Leave balances, requests, approvals, policies
- **Performance**: Appraisals, goals, feedback, performance reviews
- **Recruitment**: Job postings, applications, candidates, interviews, offers
- **Onboarding/Offboarding**: New hire tasks, clearance checklists

## Guidelines:
1. Always be professional, helpful, and concise
2. When you have data, present it clearly in a structured format
3. If you don't have access to certain data, explain what you would need
4. Protect sensitive information - don't expose full salaries unless explicitly asked by authorized users
5. Suggest relevant actions the user can take
6. If asked to perform an action, explain the steps or confirm before proceeding

## Current Data Context:
{DATA_CONTEXT}
`;

    constructor(
        private readonly openaiService: OpenAIService,
    ) {}

    /**
     * Process a user query with HR context
     */
    async processQuery(
        query: string,
        conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>,
        dataContext?: Record<string, unknown>
    ): Promise<string> {
        // Build the system prompt with available data context
        const contextString = dataContext
            ? JSON.stringify(dataContext, null, 2)
            : 'No specific data loaded. Ask the user what they need help with.';

        const systemPrompt = this.HR_SYSTEM_CONTEXT.replace('{DATA_CONTEXT}', contextString);

        const messages = conversationHistory.map(m => ({
            role: m.role as 'user' | 'assistant',
            content: m.content,
        }));

        messages.push({ role: 'user', content: query });

        return this.openaiService.chat(messages, {
            systemPrompt,
            temperature: 0.7,
            maxTokens: 2000,
        });
    }

    /**
     * Analyze intent from user query to determine what data to fetch
     */
    async analyzeIntent(query: string): Promise<{
        intent: string;
        entities: Record<string, string>;
        requiredData: string[];
    }> {
        const prompt = `
Analyze this HR-related query and extract the intent and entities.

Query: "${query}"

Respond in JSON format:
{
    "intent": "one of: employee_lookup, payroll_info, leave_balance, attendance_report, performance_review, recruitment_status, org_structure, general_help",
    "entities": {
        "employeeId": "if mentioned",
        "employeeName": "if mentioned",
        "department": "if mentioned",
        "dateRange": "if mentioned",
        "other": "any other relevant entity"
    },
    "requiredData": ["list of data types needed: employees, departments, payroll, leaves, attendance, performance, recruitment"]
}
`;

        return this.openaiService.generateJSON(prompt);
    }

    /**
     * Generate a summary report based on data
     */
    async generateReport(
        reportType: string,
        data: Record<string, unknown>
    ): Promise<string> {
        const prompt = `
Generate a clear, well-formatted ${reportType} report based on this data:

${JSON.stringify(data, null, 2)}

Format the report with:
- Clear headings
- Key metrics highlighted
- Any notable trends or concerns
- Actionable recommendations if applicable
`;

        return this.openaiService.complete(prompt, 'You are an HR analytics expert. Create clear, actionable reports.');
    }

    /**
     * Help draft HR documents
     */
    async draftDocument(
        documentType: string,
        context: Record<string, unknown>
    ): Promise<string> {
        const prompt = `
Draft a professional ${documentType} based on this context:

${JSON.stringify(context, null, 2)}

Make it professional, clear, and appropriate for an HR context.
`;

        return this.openaiService.complete(prompt, 'You are an HR professional skilled at writing clear, professional documents.');
    }
}
