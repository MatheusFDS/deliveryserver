import {
  ExecutionContext,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
  Inject,
  CanActivate,
} from '@nestjs/common';
import {
  IAuthProvider,
  AUTH_PROVIDER,
} from '../infrastructure/auth/auth.provider.interface';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    @Inject(AUTH_PROVIDER) private readonly authProvider: IAuthProvider,
  ) {}

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

      const userPayload = {
        userId: userFromDb.id,
        email: userFromDb.email,
        role: userFromDb.role.name,
        roleId: userFromDb.roleId,
        tenantId: userFromDb.tenantId,
        firebaseUid: userFromDb.firebaseUid,
      };

      request.user = userPayload;
      return true;
    } catch (error) {
      if (
        error.getStatus &&
        typeof error.getStatus === 'function' &&
        error.getStatus() < 500
      ) {
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
}
