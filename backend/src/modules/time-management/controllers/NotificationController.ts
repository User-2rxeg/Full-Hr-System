import { Controller, Get, Post, Delete, Param, Query, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery, ApiBody } from '@nestjs/swagger';
import { NotificationService } from '../services/NotificationService';

@ApiTags('Notifications')
@Controller('notifications')
export class NotificationController {
    constructor(private readonly notificationService: NotificationService) {}
    // @UseGuards(AuthenticationGuard,AuthorizationGuard)
    // @Roles(SystemRole.HR_ADMIN)
    // @ApiBearerAuth('access-token')
    @Get()
    @ApiOperation({
        summary: 'Get All Notifications',
        description: 'Retrieve all notifications in the system (HR/Admin only)'
    })
    @ApiQuery({
        name: 'type',
        required: false,
        description: 'Filter by notification type (e.g., SHIFT_EXPIRY, SHIFT_EXPIRY_EMPLOYEE)',
        example: 'SHIFT_EXPIRY'
    })
    @ApiResponse({ status: 200, description: 'List of notifications retrieved successfully' })
    async getAllNotifications(@Query('type') type?: string) {
        if (type) {
            return this.notificationService.getNotificationsByType(type);
        }
        return this.notificationService.getAllNotifications();
    }

    @Get('user/:userId')
    @ApiOperation({
        summary: 'Get Notifications by User',
        description: 'Retrieve all notifications for a specific user'
    })
    @ApiParam({
        name: 'userId',
        description: 'User ID (MongoDB ObjectId)',
        example: '674c1a1b2c3d4e5f6a7b8c9d'
    })
    @ApiResponse({ status: 200, description: 'User notifications retrieved successfully' })
    @ApiResponse({ status: 404, description: 'User not found' })
    getUserNotifications(@Param('userId') userId: string) {
        return this.notificationService.getNotificationsByUser(userId);
    }

    @Post('trigger-expiry-check')
    @ApiOperation({
        summary: 'Trigger Shift Expiry Check (Manual)',
        description: 'Manually trigger the shift expiry notification check. Useful for testing. Creates notifications for assignments expiring within the specified number of days.'
    })
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                days: {
                    type: 'number',
                    description: 'Number of days to check ahead for expiring assignments',
                    example: 7,
                    default: 7
                }
            }
        },
        examples: {
            'Check 7 days ahead': {
                value: { days: 7 }
            },
            'Check 14 days ahead': {
                value: { days: 14 }
            },
            'Check 30 days ahead': {
                value: { days: 30 }
            }
        }
    })
    @ApiResponse({
        status: 201,
        description: 'Expiry check triggered successfully, notifications created',
        schema: {
            type: 'object',
            properties: {
                message: { type: 'string' },
                count: { type: 'number' },
                assignments: { type: 'array' },
                notifications: { type: 'array' }
            }
        }
    })
    @ApiResponse({ status: 400, description: 'Invalid request data' })
    triggerExpiryCheck(@Body() body?: { days?: number }) {
        const days = body?.days || 7;
        return this.notificationService.triggerShiftExpiryCheck(days);
    }

    @Delete(':id')
    @ApiOperation({
        summary: 'Delete Notification',
        description: 'Delete a specific notification by ID'
    })
    @ApiParam({
        name: 'id',
        description: 'Notification ID (MongoDB ObjectId)',
        example: '674c1a1b2c3d4e5f6a7b8c9d'
    })
    @ApiResponse({ status: 200, description: 'Notification deleted successfully' })
    @ApiResponse({ status: 404, description: 'Notification not found' })
    deleteNotification(@Param('id') id: string) {
        return this.notificationService.deleteNotification(id);
    }

    @Delete('user/:userId/clear')
    @ApiOperation({
        summary: 'Clear All Notifications for User',
        description: 'Delete all notifications for a specific user'
    })
    @ApiParam({
        name: 'userId',
        description: 'User ID (MongoDB ObjectId)',
        example: '674c1a1b2c3d4e5f6a7b8c9d'
    })
    @ApiResponse({ status: 200, description: 'All user notifications cleared successfully' })
    @ApiResponse({ status: 404, description: 'User not found' })
    async clearUserNotifications(@Param('userId') userId: string): Promise<any> {
        return this.notificationService.clearUserNotifications(userId);
    }

    @Get('hr-users')
    @ApiOperation({
        summary: 'Get HR/Admin Users (Informational)',
        description: 'View which HR/Admin users will automatically receive shift expiry notifications. The system automatically finds users with HR Manager, HR Admin, or System Admin roles - no configuration required!'
    })
    @ApiResponse({
        status: 200,
        description: 'List of HR/Admin users who will automatically receive notifications',
        schema: {
            type: 'object',
            properties: {
                message: { type: 'string' },
                users: {
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: {
                            employeeId: { type: 'string' },
                            roles: { type: 'array', items: { type: 'string' } },
                            workEmail: { type: 'string' }
                        }
                    }
                },
                note: { type: 'string' }
            }
        }
    })
    getHRUsers() {
        return this.notificationService.getHRUsers();
    }
}

