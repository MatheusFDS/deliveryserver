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
} from '@nestjs/common';
import { UsersService } from '../../users/users.service';
import { CreateUserDto } from '../../users/dto/create-user.dto';
import { UpdateUserDto } from '../../users/dto/update-user.dto';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { RolesGuard } from '../../auth/roles.guard';
import { Roles } from '../../auth/roles.decorator';
import { Request } from 'express';

@Controller('platform-admin/users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('superadmin')
export class PlatformUsersController {
  constructor(private readonly usersService: UsersService) {}

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
    @Query('tenantId', new ParseUUIDPipe({ optional: true }))
    tenantId: string | undefined,
    @Req() req: Request,
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
    @Req() req: Request, // CORRIGIDO: req: Request (obrigatório) primeiro
    @Query('tenantId', new ParseUUIDPipe({ optional: true })) tenantId?: string, // Opcional
    @Query('includeInactive') includeInactive: string = 'false', // Opcional (com valor default)
    @Query('searchTerm') searchTerm?: string, // Opcional
  ) {
    const requestingUserId = (req.user as any).userId;
    const includeInactiveBool = includeInactive === 'true';
    return this.usersService.findAllUsersPlatform(
      requestingUserId,
      tenantId,
      includeInactiveBool,
      searchTerm,
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
