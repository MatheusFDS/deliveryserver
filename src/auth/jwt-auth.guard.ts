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
      // 1. Valida o token usando o provedor externo (Firebase)
      const decodedToken = await this.authProvider.validateToken(token);

      // 2. Sincroniza o usuário (encontra ou cria baseado no convite)
      const userFromDb = await this.authProvider.findOrCreateUser(decodedToken);

      if (!userFromDb || !userFromDb.isActive) {
        throw new UnauthorizedException(
          'Usuário inativo ou não encontrado no sistema.',
        );
      }

      // 3. Anexa o usuário do *nosso banco de dados* à requisição
      // Isso garante que o resto da aplicação (ex: RolesGuard) use nosso User model.
      request.user = {
        userId: userFromDb.id,
        email: userFromDb.email,
        role: userFromDb.roleId, // O RolesGuard precisará do ID ou do nome da role
        tenantId: userFromDb.tenantId,
        firebaseUid: userFromDb.firebaseUid,
      };

      return true;
    } catch (error) {
      // Re-lança exceções já tratadas (como Unauthorized ou Forbidden)
      if (
        error.getStatus &&
        typeof error.getStatus === 'function' &&
        error.getStatus() < 500
      ) {
        throw error;
      }
      // Para erros inesperados, lança um erro de servidor genérico
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

  // A validação manual no canActivate torna o handleRequest do Passport obsoleto para esta lógica.
  // No entanto, o método precisa existir.
  handleRequest(err, user) {
    if (err || !user) {
      throw (
        err || new UnauthorizedException('Token inválido via handleRequest.')
      );
    }
    return user;
  }
}
