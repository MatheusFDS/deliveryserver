import { Controller, Get, Put, Body, Req, UseGuards } from '@nestjs/common';
import { UserSettingsService } from './user-settings.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Request } from 'express';

@Controller('user-settings')
@UseGuards(JwtAuthGuard)
export class UserSettingsController {
  constructor(private readonly userSettingsService: UserSettingsService) {}

  @Get()
  getUserSettings(@Req() req: Request) {
    // req.user.userId é seguro, pois vem do JWT autenticado.
    return this.userSettingsService.getUserSettings(req.user.userId);
  }

  @Put()
  updateUserSettings(@Req() req: Request, @Body() body: any) {
    // req.user.userId é seguro.
    return this.userSettingsService.updateUserSettings(
      req.user.userId,
      body.settings,
    );
  }
}
