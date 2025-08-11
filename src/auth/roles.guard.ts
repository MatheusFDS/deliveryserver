import {
  Injectable,
  CanActivate,
  ExecutionContext,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from './roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  private readonly logger = new Logger(RolesGuard.name);

  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    this.logger.debug(`Roles requeridas: ${JSON.stringify(requiredRoles)}`);

    if (!requiredRoles) {
      this.logger.debug('Nenhuma role requerida - acesso permitido');
      return true;
    }

    const { user } = context.switchToHttp().getRequest();
    this.logger.debug(`Usuário do request: ${JSON.stringify(user)}`);

    if (!user || !user.role) {
      this.logger.warn('Usuário não encontrado ou sem role');
      return false;
    }

    // SUPERADMIN tem acesso a tudo
    if (user.role === 'superadmin') {
      this.logger.debug('Usuário é SUPERADMIN - acesso PERMITIDO');
      return true;
    }

    const hasRole = requiredRoles.includes(user.role);
    this.logger.debug(
      `Usuário tem role '${user.role}', acesso ${hasRole ? 'PERMITIDO' : 'NEGADO'}`,
    );

    return hasRole;
  }
}
