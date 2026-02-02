import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { ChatCompletionMessageParam } from 'openai/resources/chat/completions';

@Injectable()
export class OpenAIService {
    private readonly logger = new Logger(OpenAIService.name);
    private readonly openai: OpenAI;
    private readonly model: string;

    constructor(private readonly configService: ConfigService) {
        const apiKey = this.configService.get<string>('OPENAI_API_KEY');

        if (!apiKey || apiKey === 'your-openai-api-key-here') {
            this.logger.warn('OpenAI API key not configured. AI features will not work.');
        }

        this.openai = new OpenAI({
            apiKey: apiKey,
        });

        this.model = this.configService.get<string>('OPENAI_MODEL') || 'gpt-4o';
    }

    /**
     * Send a chat completion request to OpenAI
     */
    async chat(
        messages: ChatCompletionMessageParam[],
        options?: {
            temperature?: number;
            maxTokens?: number;
            systemPrompt?: string;
        }
    ): Promise<string> {
        try {
            const allMessages: ChatCompletionMessageParam[] = [];

            if (options?.systemPrompt) {
                allMessages.push({
                    role: 'system',
                    content: options.systemPrompt,
                });
            }

            allMessages.push(...messages);

            const response = await this.openai.chat.completions.create({
                model: this.model,
                messages: allMessages,
                temperature: options?.temperature ?? 0.7,
                max_tokens: options?.maxTokens ?? 1000,
            });

            return response.choices[0]?.message?.content || '';
        } catch (error) {
            this.logger.error('OpenAI chat completion failed', error);
            throw error;
        }
    }

    /**
     * Simple prompt completion
     */
    async complete(prompt: string, systemPrompt?: string): Promise<string> {
        return this.chat(
            [{ role: 'user', content: prompt }],
            { systemPrompt }
        );
    }

    /**
     * Generate a JSON response from OpenAI
     */
    async generateJSON<T>(
        prompt: string,
        systemPrompt?: string
    ): Promise<T> {
        try {
            const response = await this.openai.chat.completions.create({
                model: this.model,
                messages: [
                    ...(systemPrompt ? [{ role: 'system' as const, content: systemPrompt }] : []),
                    { role: 'user', content: prompt },
                ],
                response_format: { type: 'json_object' },
                temperature: 0.3,
            });

            const content = response.choices[0]?.message?.content || '{}';
            return JSON.parse(content) as T;
        } catch (error) {
            this.logger.error('OpenAI JSON generation failed', error);
            throw error;
        }
    }

    /**
     * Check if OpenAI is properly configured
     */
    isConfigured(): boolean {
        const apiKey = this.configService.get<string>('OPENAI_API_KEY');
        return !!apiKey && apiKey !== 'your-openai-api-key-here';
    }
}
