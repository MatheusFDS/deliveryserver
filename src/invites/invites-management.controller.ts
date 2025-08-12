import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  Req,
  UseGuards,
  ParseUUIDPipe,
  DefaultValuePipe,
  ParseIntPipe,
} from '@nestjs/common';
import { InvitesService } from './invites.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Request } from 'express';

@Controller('invites-management')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin', 'superadmin')
export class InvitesManagementController {
  constructor(private readonly invitesService: InvitesService) {}

  @Get()
  async findPendingInvites(
    @Req() req: Request,
    @Query('tenantId', new ParseUUIDPipe({ optional: true })) tenantId?: string,
    @Query('search') search?: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number = 1,
    @Query('pageSize', new DefaultValuePipe(10), ParseIntPipe)
    pageSize: number = 10,
  ) {
    const requestingUserId = (req.user as any).userId;
    return this.invitesService.findPendingInvites(
      requestingUserId,
      tenantId,
      search,
      page,
      pageSize,
    );
  }

  @Get('stats')
  async getInviteStats(@Req() req: Request) {
    const requestingUserId = (req.user as any).userId;
    return this.invitesService.getInviteStats(requestingUserId);
  }

  @Post(':inviteId/resend')
  async resendInvite(
    @Param('inviteId', ParseUUIDPipe) inviteId: string,
    @Req() req: Request,
  ) {
    const requestingUserId = (req.user as any).userId;
    return this.invitesService.resendInvite(inviteId, requestingUserId);
  }

  @Delete(':inviteId')
  async cancelInvite(
    @Param('inviteId', ParseUUIDPipe) inviteId: string,
    @Req() req: Request,
  ) {
    const requestingUserId = (req.user as any).userId;
    return this.invitesService.cancelInvite(inviteId, requestingUserId);
  }

  @Post('cleanup-expired')
  @Roles('superadmin')
  async cleanupExpiredInvites() {
    const cleanedCount = await this.invitesService.cleanupExpiredInvites();
    return {
      message: `${cleanedCount} convites expirados foram marcados como expirados.`,
      cleanedCount,
    };
  }
}
