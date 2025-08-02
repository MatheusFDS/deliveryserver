import {
  ExecutionContext,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { TenantService } from '../tenant/tenant.service';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(
    private reflector: Reflector,
    private authService: AuthService,
    private usersService: UsersService,
    private tenantService: TenantService,
  ) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException('Token de autenticação não fornecido.');
    }

    if (await this.authService.isTokenInvalid(token)) {
      throw new UnauthorizedException(
        'Sessão expirada ou inválida. Por favor, faça login novamente.',
      );
    }

    const canActivateParent = (await super.canActivate(context)) as boolean;
    if (!canActivateParent) {
      throw new UnauthorizedException('Autenticação falhou.');
    }

    const userPayload = request.user;

    if (!userPayload || !userPayload.userId) {
      throw new UnauthorizedException(
        'Informações do usuário não disponíveis no token.',
      );
    }

    try {
      const dbUser = await this.usersService.findOneById(userPayload.userId);
      if (!dbUser || !dbUser.isActive) {
        throw new UnauthorizedException('Usuário inativo ou não encontrado.');
      }

      if (dbUser.tenantId) {
        const tenant = await this.tenantService.getTenantByUserId(dbUser.id);
        if (!tenant || !tenant.isActive) {
          throw new UnauthorizedException('Tenant inativo.');
        }
      }

      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new InternalServerErrorException(
        'Erro na validação de permissões de acesso.',
      );
    }
  }

  private extractTokenFromHeader(request: any): string | null {
    const authHeader = request.headers.authorization;
    if (!authHeader) {
      return null;
    }

    const [, token] = authHeader.split(' ');
    return token;
  }
}
