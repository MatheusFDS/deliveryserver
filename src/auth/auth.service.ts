import {
  Injectable,
  UnauthorizedException,
  NotImplementedException,
  InternalServerErrorException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
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
          driver: {
            select: {
              id: true,
            },
          },
          tenant: true,
        },
      });

      if (
        !user ||
        !user.password ||
        !(await bcrypt.compare(pass, user.password))
      ) {
        throw new UnauthorizedException('Credenciais inválidas');
      }

      const normalizedDomain = domain ? domain.split(':')[0] : undefined;

      if (user.role.name === 'superadmin' || user.role.name === 'SUPERADMIN') {
        if (normalizedDomain === 'deliveryweb-production.up.railway.app') {
          const userWithoutPassword = { ...user };
          delete userWithoutPassword.password;
          return userWithoutPassword;
        } else {
          throw new UnauthorizedException(
            'Acesso restrito para superadmin fora do domínio específico.',
          );
        }
      }

      if (normalizedDomain === 'localhost') {
        const userWithoutPassword = { ...user };
        delete userWithoutPassword.password;
        return userWithoutPassword;
      }

      if (domain) {
        if (!user.tenant || user.tenant.domain !== domain) {
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

      const userWithoutPassword = { ...user };
      delete userWithoutPassword.password;
      return userWithoutPassword;
    } catch (e) {
      // ADICIONADO: Log do erro original para depuração
      console.error('Erro detalhado durante a validação do usuário:', e);

      if (
        e instanceof UnauthorizedException ||
        e instanceof BadRequestException
      ) {
        throw e;
      }
      throw new InternalServerErrorException('Erro ao validar usuário.');
    }
  }

  async login(loginDto: LoginDto) {
    const user = await this.validateUser(
      loginDto.email,
      loginDto.password,
      loginDto.domain,
    );

    const payload: any = {
      email: user.email,
      sub: user.id,
      role: user.role.name,
    };

    if (
      (user.role.name === 'driver' || user.role.name === 'DRIVER') &&
      !user.driver
    ) {
      // Lógica para drivers sem driver associado, se necessário
    }

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
      const refreshPayload = this.jwtService.verify(token, {
        secret: process.env.JWT_REFRESH_SECRET,
      });

      const userWithDetails = await this.prisma.user.findUnique({
        where: { id: refreshPayload.sub },
        include: {
          role: true,
          driver: { select: { id: true } },
        },
      });

      if (!userWithDetails) {
        throw new UnauthorizedException(
          'Usuário do token de atualização não encontrado.',
        );
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
      return { access_token: newAccessToken };
    } catch (e) {
      throw new UnauthorizedException(
        'Token de atualização inválido ou expirado.',
      );
    }
  }

  async logout(token: string): Promise<void> {
    try {
      const decoded = this.jwtService.decode(token);
      if (!decoded || !decoded.exp) {
        return;
      }

      const expiresInSeconds = decoded.exp - Math.floor(Date.now() / 1000);
      if (expiresInSeconds <= 0) {
        return;
      }

      await this.prisma.invalidatedToken.create({
        data: {
          token: token,
          expiresAt: new Date(decoded.exp * 1000),
          invalidatedAt: new Date(),
        },
      });
    } catch (e) {
      throw new InternalServerErrorException('Falha ao processar logout.');
    }
  }

  async isTokenInvalid(token: string): Promise<boolean> {
    try {
      const invalidated = await this.prisma.invalidatedToken.findUnique({
        where: { token: token },
      });
      return !!invalidated;
    } catch (e) {
      return true;
    }
  }
}
