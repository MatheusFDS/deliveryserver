import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  ParseUUIDPipe,
  Query,
  Req,
  DefaultValuePipe,
  ParseIntPipe,
  Logger,
} from '@nestjs/common';
import { UsersService } from '../../users/users.service';
import { CreateUserDto } from '../../users/dto/create-user.dto';
import { UpdateUserDto } from '../../users/dto/update-user.dto';
import { InviteUserDto } from '../../users/dto/invite-user.dto';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { RolesGuard } from '../../auth/roles.guard';
import { Roles } from '../../auth/roles.decorator';
import { Request } from 'express';
import { PrismaService } from '../../prisma/prisma.service';

@Controller('platform-admin/users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('superadmin')
export class PlatformUsersController {
  private readonly logger = new Logger(PlatformUsersController.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly prisma: PrismaService,
  ) {}

  @Post('invite')
  async inviteUser(
    @Body() inviteUserDto: InviteUserDto,
    @Req() req: Request,
    @Query('tenantId', new ParseUUIDPipe({ optional: true })) tenantId?: string,
  ) {
    this.logger.debug(
      `🎯 Platform Admin - Convite por: ${JSON.stringify(req.user as any)}`,
    );
    this.logger.debug(
      `📧 Email: ${inviteUserDto.email}, Role: ${inviteUserDto.roleId}`,
    );
    this.logger.debug(`🏢 Tenant especificado: ${tenantId || 'NENHUM'}`);

    const requestingUserId = (req.user as any).userId;

    const targetRole = await this.prisma.role.findUnique({
      where: { id: inviteUserDto.roleId },
    });

    if (!targetRole) {
      throw new Error('Role especificada não existe.');
    }

    let finalTenantId: string | null = null;

    if (targetRole.isPlatformRole) {
      this.logger.debug(`👑 Role de plataforma - usuário ficará sem tenant`);
      finalTenantId = null;
    } else {
      if (tenantId) {
        finalTenantId = tenantId;
        this.logger.debug(`🏢 Usando tenant especificado: ${tenantId}`);
      } else {
        const firstTenant = await this.prisma.tenant.findFirst({
          where: { isActive: true },
        });
        if (!firstTenant) {
          throw new Error('Nenhum tenant ativo encontrado.');
        }
        finalTenantId = firstTenant.id;
        this.logger.debug(`🏢 Usando primeiro tenant ativo: ${finalTenantId}`);
      }
    }

    const result = await this.prisma.userInvite.create({
      data: {
        email: inviteUserDto.email,
        roleId: inviteUserDto.roleId,
        tenantId: finalTenantId,
        invitedBy: requestingUserId,
        status: 'PENDING',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
      include: {
        role: true,
        tenant: true,
      },
    });

    this.logger.debug(`✅ Convite criado com sucesso: ${result.id}`);

    return {
      message: 'Convite enviado com sucesso!',
      invite: result,
    };
  }

  @Post('platform-admin')
  async createPlatformAdmin(
    @Body() createUserDto: CreateUserDto,
    @Req() req: Request,
  ) {
    const requestingUserId = (req.user as any).userId;
    return this.usersService.createPlatformUser(
      createUserDto,
      requestingUserId,
      null,
    );
  }

  @Post('tenant-user')
  async createTenantUser(
    @Body() createUserDto: CreateUserDto,
    @Req() req: Request,
    @Query('tenantId', new ParseUUIDPipe({ optional: true }))
    tenantId?: string,
  ) {
    const requestingUserId = (req.user as any).userId;
    return this.usersService.createPlatformUser(
      createUserDto,
      requestingUserId,
      tenantId || null,
    );
  }

  @Get()
  async findAllUsers(
    @Req() req: Request,
    @Query('tenantId', new ParseUUIDPipe({ optional: true })) tenantId?: string,
    @Query('includeInactive') includeInactive: string = 'false',
    @Query('searchTerm') searchTerm?: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number = 1,
    @Query('pageSize', new DefaultValuePipe(10), ParseIntPipe)
    pageSize: number = 10,
  ) {
    const requestingUserId = (req.user as any).userId;
    const includeInactiveBool = includeInactive === 'true';
    return this.usersService.findAllUsersPlatform(
      requestingUserId,
      tenantId,
      includeInactiveBool,
      searchTerm,
      page,
      pageSize,
    );
  }

  @Get(':userId')
  async findUserById(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Req() req: Request,
  ) {
    const requestingUserId = (req.user as any).userId;
    return this.usersService.findOneUserPlatform(userId, requestingUserId);
  }

  @Patch(':userId')
  async updateUser(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body() updateUserDto: UpdateUserDto,
    @Req() req: Request,
  ) {
    const requestingUserId = (req.user as any).userId;
    return this.usersService.updateUserPlatform(
      userId,
      updateUserDto,
      requestingUserId,
    );
  }

  @Delete(':userId')
  async deleteUser(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Req() req: Request,
  ) {
    const requestingUserId = (req.user as any).userId;
    return this.usersService.inactivateUserPlatform(userId, requestingUserId);
  }
}
