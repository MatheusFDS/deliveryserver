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
  Logger,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { InviteUserDto } from './dto/invite-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Request } from 'express';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  private readonly logger = new Logger(UsersController.name);

  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  async getMe(@Req() req: Request) {
    const userId = (req.user as any).userId;
    return this.usersService.findOneById(userId);
  }

  // ENDPOINT DE DEBUG - REMOVER APÓS TESTES
  @Get('debug')
  async debugUser(@Req() req: Request) {
    this.logger.debug(
      `🐛 Debug users - Usuario: ${JSON.stringify(req.user as any)}`,
    );
    return {
      user: req.user,
      timestamp: new Date().toISOString(),
      message: 'Debug endpoint funcionando!',
    };
  }

  @Post()
  @Roles('admin') // superadmin vai passar por causa do RolesGuard atualizado
  async invite(@Body() inviteUserDto: InviteUserDto, @Req() req: Request) {
    this.logger.debug(
      `📧 Tentativa de convite por: ${JSON.stringify(req.user as any)}`,
    );
    this.logger.debug(`👤 Role do usuário: ${(req.user as any)?.role}`);
    this.logger.debug(`📝 Dados do convite: ${JSON.stringify(inviteUserDto)}`);

    const requestingUserId = (req.user as any).userId;
    const result = await this.usersService.inviteUserForTenant(
      inviteUserDto,
      requestingUserId,
    );

    this.logger.debug(`✅ Convite criado com sucesso`);
    return result;
  }

  @Get()
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
  @Roles('admin')
  async findAllList(@Req() req: Request) {
    const requestingUserId = (req.user as any).userId;
    return this.usersService.findAllByTenantList(requestingUserId);
  }

  @Get(':id')
  @Roles('admin')
  async findOne(@Param('id') id: string, @Req() req: Request) {
    const requestingUserId = (req.user as any).userId;
    return this.usersService.findOneByIdAndTenant(id, requestingUserId);
  }

  @Patch(':id')
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

  @Delete(':id')
  @Roles('admin')
  async remove(@Param('id') id: string, @Req() req: Request) {
    const requestingUserId = (req.user as any).userId;
    return this.usersService.updateUserForTenant(
      id,
      { isActive: false },
      requestingUserId,
    );
  }
}
