import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Req,
  Query,
  DefaultValuePipe,
  ParseIntPipe,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { InviteUserDto } from './dto/invite-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Request } from 'express';
import { ForgotPasswordDto } from './dto/forgot-password.dto';

@Controller('users')
// @UseGuards foi removido daqui para permitir rotas públicas
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /**
   * Endpoint público para solicitar a redefinição de senha.
   */
  @Post('forgot-password')
  async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    return this.usersService.forgotPassword(forgotPasswordDto);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard) // Guard aplicado individualmente
  async getMe(@Req() req: Request) {
    const userId = (req.user as any).userId;
    return this.usersService.findOneById(userId);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard) // Guard aplicado individualmente
  @Roles('admin')
  async invite(@Body() inviteUserDto: InviteUserDto, @Req() req: Request) {
    const requestingUserId = (req.user as any).userId;
    const result = await this.usersService.inviteUserForTenant(
      inviteUserDto,
      requestingUserId,
    );
    return result;
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard) // Guard aplicado individualmente
  @Roles('admin')
  async findAll(
    @Req() req: Request,
    @Query('search') search?: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number = 1,
    @Query('pageSize', new DefaultValuePipe(10), ParseIntPipe)
    pageSize: number = 10,
  ) {
    const requestingUserId = (req.user as any).userId;
    return this.usersService.findAllByTenant(
      requestingUserId,
      search,
      page,
      pageSize,
    );
  }

  @Get('all')
  @UseGuards(JwtAuthGuard, RolesGuard) // Guard aplicado individualmente
  @Roles('admin')
  async findAllList(@Req() req: Request) {
    const requestingUserId = (req.user as any).userId;
    return this.usersService.findAllByTenantList(requestingUserId);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard) // Guard aplicado individualmente
  @Roles('admin')
  async findOne(@Param('id') id: string, @Req() req: Request) {
    const requestingUserId = (req.user as any).userId;
    return this.usersService.findOneByIdAndTenant(id, requestingUserId);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard) // Guard aplicado individualmente
  @Roles('admin')
  async update(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
    @Req() req: Request,
  ) {
    const requestingUserId = (req.user as any).userId;
    return this.usersService.updateUserForTenant(
      id,
      updateUserDto,
      requestingUserId,
    );
  }

  /**
   * Endpoint para DELETAR PERMANENTEMENTE um usuário.
   * A lógica foi alterada de soft-delete para hard-delete.
   */
  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard) // Guard aplicado individualmente
  @Roles('admin')
  async remove(@Param('id') id: string, @Req() req: Request) {
    const requestingUserId = (req.user as any).userId;
    // Lógica anterior: inativava o usuário
    // return this.usersService.updateUserForTenant(id, { isActive: false }, requestingUserId);

    // Nova lógica: deleta o usuário permanentemente
    return this.usersService.deleteUserForTenant(id, requestingUserId);
  }
}
