// src/auth/auth.controller.ts

import { Controller, Post, Request, UseGuards, Get } from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * Endpoint para estabelecer ou validar uma sessão.
   * O frontend chama este endpoint após obter um ID Token do Firebase.
   * O JwtAuthGuard faz todo o trabalho pesado de validar o token e sincronizar o usuário.
   * Se o Guard passar, o usuário está autenticado, e retornamos seus dados de sessão.
   */
  @UseGuards(JwtAuthGuard)
  @Get('session')
  async getSession(@Request() req) {
    // 'req.user' é anexado pelo JwtAuthGuard e contém o payload com o ID do nosso banco de dados.
    const userId = req.user.userId;
    return this.authService.getSessionUser(userId);
  }

  /**
   * Endpoint para logout. O Guard garante que apenas um usuário autenticado pode chamar.
   */
  @UseGuards(JwtAuthGuard)
  @Post('logout')
  async logout(@Request() req) {
    // CORREÇÃO: Usar o firebaseUid em vez do userId
    const firebaseUid = req.user.firebaseUid;
    await this.authService.logout(firebaseUid);
    return { message: 'Sessão invalidada quando aplicável.' };
  }
}
