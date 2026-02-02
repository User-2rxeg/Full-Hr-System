import { Controller, Post, Body, Get, HttpException, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBody, ApiResponse } from '@nestjs/swagger';
import { OpenAIService } from '../services/openai.service';

class ChatRequestDto {
    messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>;
    systemPrompt?: string;
    temperature?: number;
    maxTokens?: number;
}

class CompletionRequestDto {
    prompt: string;
    systemPrompt?: string;
}

@ApiTags('OpenAI')
@Controller('api/ai')
export class OpenAIController {
    constructor(private readonly openaiService: OpenAIService) {}

    @Get('status')
    @ApiOperation({ summary: 'Check if OpenAI is configured' })
    @ApiResponse({ status: 200, description: 'Returns configuration status' })
    getStatus() {
        return {
            configured: this.openaiService.isConfigured(),
            message: this.openaiService.isConfigured()
                ? 'OpenAI is configured and ready'
                : 'OpenAI API key not configured',
        };
    }

    @Post('chat')
    @ApiOperation({ summary: 'Send a chat completion request' })
    @ApiBody({ type: ChatRequestDto })
    @ApiResponse({ status: 200, description: 'Returns AI response' })
    async chat(@Body() body: ChatRequestDto) {
        if (!this.openaiService.isConfigured()) {
            throw new HttpException(
                'OpenAI is not configured. Please add your API key to the environment variables.',
                HttpStatus.SERVICE_UNAVAILABLE
            );
        }

        try {
            const response = await this.openaiService.chat(body.messages, {
                systemPrompt: body.systemPrompt,
                temperature: body.temperature,
                maxTokens: body.maxTokens,
            });

            return {
                success: true,
                response,
            };
        } catch (error) {
            throw new HttpException(
                `AI request failed: ${error.message}`,
                HttpStatus.INTERNAL_SERVER_ERROR
            );
        }
    }

    @Post('complete')
    @ApiOperation({ summary: 'Send a simple completion request' })
    @ApiBody({ type: CompletionRequestDto })
    @ApiResponse({ status: 200, description: 'Returns AI response' })
    async complete(@Body() body: CompletionRequestDto) {
        if (!this.openaiService.isConfigured()) {
            throw new HttpException(
                'OpenAI is not configured. Please add your API key to the environment variables.',
                HttpStatus.SERVICE_UNAVAILABLE
            );
        }

        try {
            const response = await this.openaiService.complete(
                body.prompt,
                body.systemPrompt
            );

            return {
                success: true,
                response,
            };
        } catch (error) {
            throw new HttpException(
                `AI request failed: ${error.message}`,
                HttpStatus.INTERNAL_SERVER_ERROR
            );
        }
    }
}
