// src/notifications/notifications.controller.ts

import {
  Controller,
  Get,
  Patch,
  Param,
  Req,
  Query,
  UseGuards,
  ParseUUIDPipe,
  DefaultValuePipe,
  ParseIntPipe,
} from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';

@Controller('notifications')
@UseGuards(JwtAuthGuard, RolesGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  async findMyNotifications(
    @Req() req: any,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('pageSize', new DefaultValuePipe(15), ParseIntPipe) pageSize: number,
  ) {
    const userId = req.user.userId;
    return this.notificationsService.findByUser(userId, page, pageSize);
  }

  @Patch(':id/read')
  async markAsRead(
    @Param('id', ParseUUIDPipe) notificationId: string,
    @Req() req: any,
  ) {
    const userId = req.user.userId;
    return this.notificationsService.markAsRead(notificationId, userId);
  }

  @Patch('read-all')
  async markAllAsRead(@Req() req: any) {
    const userId = req.user.userId;
    return this.notificationsService.markAllAsRead(userId);
  }
}
