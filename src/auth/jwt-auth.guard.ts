import {
  ExecutionContext,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
  Inject,
  Logger,
  CanActivate,
} from '@nestjs/common';
import {
  IAuthProvider,
  AUTH_PROVIDER,
} from '../infrastructure/auth/auth.provider.interface';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  private readonly logger = new Logger(JwtAuthGuard.name);

  constructor(
    @Inject(AUTH_PROVIDER) private readonly authProvider: IAuthProvider,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = this.extractTokenFromHeader(request);

    this.logger.debug(`🔍 Token extraído: ${token ? 'SIM' : 'NÃO'}`);

    if (!token) {
      this.logger.warn('❌ Token de autenticação não fornecido');
      throw new UnauthorizedException('Token de autenticação não fornecido.');
    }

    try {
      this.logger.debug('🔍 Validando token...');
      const decodedToken = await this.authProvider.validateToken(token);
      this.logger.debug(`✅ Token validado para: ${decodedToken.email}`);

      this.logger.debug('🔍 Buscando/criando usuário...');
      const userFromDb = await this.authProvider.findOrCreateUser(decodedToken);
      this.logger.debug(
        `✅ Usuário encontrado: ${userFromDb.email}, Role: ${userFromDb.role.name}`,
      );

      if (!userFromDb || !userFromDb.isActive) {
        this.logger.warn(`❌ Usuário inativo: ${userFromDb?.email}`);
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

      this.logger.debug(
        `🔗 Anexando ao request: ${JSON.stringify(userPayload)}`,
      );
      request.user = userPayload;

      this.logger.debug(
        '✅ Autenticação bem-sucedida - prosseguindo para RolesGuard',
      );
      return true;
    } catch (error) {
      this.logger.error(
        `❌ Erro na autenticação: ${error.message}`,
        error.stack,
      );

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
