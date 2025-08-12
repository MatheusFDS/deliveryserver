import { Controller, Post, Request, UseGuards, Get } from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @UseGuards(JwtAuthGuard)
  @Get('session')
  async getSession(@Request() req) {
    const userId = req.user.userId;
    return this.authService.getSessionUser(userId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  async logout(@Request() req) {
    const firebaseUid = req.user.firebaseUid;
    await this.authService.logout(firebaseUid);
    return { message: 'Sessão invalidada quando aplicável.' };
  }
}
