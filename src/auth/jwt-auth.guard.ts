// src/auth/jwt-auth.guard.ts

import {
  ExecutionContext,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
  Inject,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  IAuthProvider,
  AUTH_PROVIDER,
} from '../infrastructure/auth/auth.provider.interface';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(
    @Inject(AUTH_PROVIDER) private readonly authProvider: IAuthProvider,
  ) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException('Token de autenticação não fornecido.');
    }

    try {
      const decodedToken = await this.authProvider.validateToken(token);

      const userFromDb = await this.authProvider.findOrCreateUser(decodedToken);

      if (!userFromDb || !userFromDb.isActive) {
        throw new UnauthorizedException(
          'Usuário inativo ou não encontrado no sistema.',
        );
      }

      request.user = {
        userId: userFromDb.id,
        email: userFromDb.email,
        role: userFromDb.roleId,
        tenantId: userFromDb.tenantId,
      };

      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new InternalServerErrorException(
        'Erro ao validar a autenticação do usuário.',
      );
    }
  }

  private extractTokenFromHeader(request: any): string | null {
    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }
    return authHeader.split(' ')[1];
  }
  handleRequest(err, user) {
    if (err || !user) {
      throw err || new UnauthorizedException();
    }
    return user;
  }
}
