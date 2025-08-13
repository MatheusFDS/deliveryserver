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
} from '@nestjs/common';
import { UsersService } from '../../users/users.service';
import { CreateUserDto } from '../../users/dto/create-user.dto';
import { UpdateUserDto } from '../../users/dto/update-user.dto';
import { InviteUserDto } from '../../users/dto/invite-user.dto';
import { EmailService } from '../../shared/services/email.service';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { RolesGuard } from '../../auth/roles.guard';
import { Roles } from '../../auth/roles.decorator';
import { Request } from 'express';
import { PrismaService } from '../../prisma/prisma.service';
import { addDays } from 'date-fns';

@Controller('platform-admin/users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('superadmin')
export class PlatformUsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
  ) {}

  @Post('invite')
  async inviteUser(
    @Body() inviteUserDto: InviteUserDto,
    @Req() req: Request,
    @Query('tenantId', new ParseUUIDPipe({ optional: true })) tenantId?: string,
  ) {
    const requestingUserId = (req.user as any).userId;
    const requestingUser = await this.prisma.user.findUnique({
      where: { id: requestingUserId },
      select: { name: true },
    });
    const targetRole = await this.prisma.role.findUnique({
      where: { id: inviteUserDto.roleId },
    });
    if (!targetRole) {
      throw new Error('Role especificada não existe.');
    }
    let finalTenantId: string | null = null;
    let tenantName: string | undefined = undefined;
    if (targetRole.isPlatformRole) {
      finalTenantId = null;
    } else {
      if (tenantId) {
        const tenant = await this.prisma.tenant.findUnique({
          where: { id: tenantId },
          select: { name: true },
        });
        finalTenantId = tenantId;
        tenantName = tenant?.name;
      } else {
        const firstTenant = await this.prisma.tenant.findFirst({
          where: { isActive: true },
          select: { id: true, name: true },
        });
        if (!firstTenant) {
          throw new Error('Nenhum tenant ativo encontrado.');
        }
        finalTenantId = firstTenant.id;
        tenantName = firstTenant.name;
      }
    }
    const expiresAt = addDays(new Date(), 7);
    const result = await this.prisma.userInvite.create({
      data: {
        email: inviteUserDto.email,
        roleId: inviteUserDto.roleId,
        tenantId: finalTenantId,
        invitedBy: requestingUserId,
        status: 'PENDING',
        expiresAt,
      },
      include: {
        role: true,
        tenant: true,
      },
    });
    try {
      await this.emailService.sendInviteEmail({
        email: inviteUserDto.email,
        inviterName: requestingUser?.name || 'Administrador',
        roleName: targetRole.name,
        tenantName,
        inviteToken: result.id,
        expiresAt,
      });
      return {
        message: 'Convite enviado com sucesso!',
        invite: result,
      };
    } catch (emailError) {
      return {
        message: 'Convite criado, mas houve erro no envio do email.',
        invite: result,
        emailError: true,
      };
    }
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

  // CORREÇÃO: Esta rota agora chama o método correto para exclusão permanente.
  @Delete(':userId')
  async deleteUser(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Req() req: Request,
  ) {
    const requestingUserId = (req.user as any).userId;
    // Lógica anterior que chamava inactivateUserPlatform foi trocada
    return this.usersService.deletePlatformUser(userId, requestingUserId);
  }
}
