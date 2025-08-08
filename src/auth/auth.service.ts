import {
  Injectable,
  UnauthorizedException,
  NotImplementedException,
  InternalServerErrorException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  changePassword() {
    throw new NotImplementedException();
  }

  resetPassword() {
    throw new NotImplementedException();
  }

  forgotPassword() {
    throw new NotImplementedException();
  }

  async validateUser(
    email: string,
    pass: string,
    domain?: string,
  ): Promise<any> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { email },
        include: {
          role: true,
          driver: { select: { id: true } },
          tenant: true,
        },
      });

      if (
        !user ||
        !user.password ||
        !(await bcrypt.compare(pass, user.password))
      ) {
        throw new UnauthorizedException('Credenciais inválidas.');
      }

      if (!user.isActive) {
        throw new UnauthorizedException('Usuário inativo.');
      }

      const normalizedDomain = domain ? domain.split(':')[0] : undefined;

      // Permite superadmin somente nos domínios específicos
      if (user.role.name.toLowerCase() === 'superadmin') {
        if (
          normalizedDomain === 'deliveryweb-production.up.railway.app' ||
          normalizedDomain === 'localhost' ||
          normalizedDomain === '127.0.0.1'
        ) {
          return this.removePassword(user);
        } else {
          throw new UnauthorizedException(
            'Acesso restrito para superadmin fora do domínio específico.',
          );
        }
      }

      // Verifica tenant ativo
      if (user.tenantId && (!user.tenant || !user.tenant.isActive)) {
        throw new UnauthorizedException('Tenant inativo.');
      }

      // Detecta ambiente local (localhost, localhost:8081, 127.0.0.1, IP local)
      const isLocalDev =
        normalizedDomain === 'localhost' ||
        normalizedDomain === '127.0.0.1' ||
        domain === 'localhost:8081' ||
        /^192\.168\.\d+\.\d+$/.test(normalizedDomain || '');

      if (isLocalDev) {
        return this.removePassword(user);
      }

      // Valida domínio do tenant para ambiente não local
      if (domain) {
        if (!user.tenant || user.tenant.domain !== normalizedDomain) {
          throw new UnauthorizedException(
            'Domínio inválido ou usuário não pertence a este domínio.',
          );
        }
      } else {
        if (user.tenant && user.tenant.domain) {
          throw new BadRequestException(
            'Para este usuário, o domínio é obrigatório.',
          );
        }
      }

      return this.removePassword(user);
    } catch (e) {
      if (
        e instanceof UnauthorizedException ||
        e instanceof BadRequestException
      ) {
        throw e;
      }
      this.logger.error('Erro ao validar usuário', e.stack || e);
      throw new InternalServerErrorException('Erro ao validar usuário.');
    }
  }

  async login(loginDto: LoginDto) {
    const user = await this.validateUser(
      loginDto.email,
      loginDto.password,
      loginDto.domain,
    );

    // Bloqueia motorista sem vínculo de driverId
    if (user.role.name.toLowerCase() === 'driver' && !user.driver) {
      throw new UnauthorizedException(
        'Motorista não vinculado a um registro de driver.',
      );
    }

    const payload: any = {
      email: user.email,
      sub: user.id,
      role: user.role.name,
    };

    const accessToken = this.jwtService.sign(payload, {
      secret: process.env.JWT_SECRET,
      expiresIn: process.env.JWT_ACCESS_EXPIRATION,
    });

    const refreshToken = this.jwtService.sign(
      { sub: user.id },
      {
        secret: process.env.JWT_REFRESH_SECRET,
        expiresIn: process.env.JWT_REFRESH_EXPIRATION,
      },
    );

    const userResponse = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role.name,
      tenantId: user.tenantId,
      driverId: user.driver?.id || null,
    };

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      user: userResponse,
    };
  }

  async refreshToken(token: string) {
    try {
      // Verifica se o token está invalidado
      if (await this.isTokenInvalid(token)) {
        throw new UnauthorizedException('Token de atualização inválido.');
      }

      const refreshPayload = this.jwtService.verify(token, {
        secret: process.env.JWT_REFRESH_SECRET,
      });

      const userWithDetails = await this.prisma.user.findUnique({
        where: { id: refreshPayload.sub },
        include: {
          role: true,
          driver: { select: { id: true } },
          tenant: true,
        },
      });

      if (!userWithDetails) {
        throw new UnauthorizedException(
          'Usuário do token de atualização não encontrado.',
        );
      }

      if (!userWithDetails.isActive) {
        throw new UnauthorizedException('Usuário inativo.');
      }

      if (
        userWithDetails.tenantId &&
        (!userWithDetails.tenant || !userWithDetails.tenant.isActive)
      ) {
        throw new UnauthorizedException('Tenant inativo.');
      }

      const newAccessTokenPayload: any = {
        email: userWithDetails.email,
        sub: userWithDetails.id,
        role: userWithDetails.role.name,
      };

      const newAccessToken = this.jwtService.sign(newAccessTokenPayload, {
        secret: process.env.JWT_SECRET,
        expiresIn: process.env.JWT_ACCESS_EXPIRATION,
      });

      const newRefreshToken = this.jwtService.sign(
        { sub: userWithDetails.id },
        {
          secret: process.env.JWT_REFRESH_SECRET,
          expiresIn: process.env.JWT_REFRESH_EXPIRATION,
        },
      );

      return {
        access_token: newAccessToken,
        refresh_token: newRefreshToken,
      };
    } catch (e) {
      throw new UnauthorizedException(
        'Token de atualização inválido ou expirado.',
      );
    }
  }

  async logout(token: string): Promise<void> {
    try {
      const decoded = this.jwtService.decode(token) as any;
      if (!decoded?.exp) return;

      const expiresInSeconds = decoded.exp - Math.floor(Date.now() / 1000);
      if (expiresInSeconds <= 0) return;

      await this.prisma.invalidatedToken.create({
        data: {
          token,
          expiresAt: new Date(decoded.exp * 1000),
          invalidatedAt: new Date(),
        },
      });
    } catch (e) {
      this.logger.error('Erro ao processar logout', e.stack || e);
      throw new InternalServerErrorException('Falha ao processar logout.');
    }
  }

  async isTokenInvalid(token: string): Promise<boolean> {
    try {
      const invalidated = await this.prisma.invalidatedToken.findUnique({
        where: { token },
      });
      return !!invalidated;
    } catch {
      return true;
    }
  }

  async invalidateTokensForUser(): Promise<void> {
    throw new NotImplementedException('Método não implementado.');
  }

  async invalidateTokensForTenant(): Promise<void> {
    throw new NotImplementedException('Método não implementado.');
  }

  private removePassword(user: any) {
    const userCopy = { ...user };
    delete userCopy.password;
    return userCopy;
  }
}
