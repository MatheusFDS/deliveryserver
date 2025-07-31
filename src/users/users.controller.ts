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
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Request } from 'express';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  async getMe(@Req() req: Request) {
    const userId = (req.user as any).userId;
    return this.usersService.findOneById(userId);
  }

  @Post()
  @Roles('admin')
  async create(@Body() createUserDto: CreateUserDto, @Req() req: Request) {
    const requestingUserId = (req.user as any).userId;
    // CORRIGIDO: Chamando createUserForTenant com os argumentos corretos
    return this.usersService.createUserForTenant(
      createUserDto,
      requestingUserId,
    );
  }

  @Get()
  @Roles('admin')
  async findAll(@Req() req: Request) {
    const requestingUserId = (req.user as any).userId;
    return this.usersService.findAllByTenant(requestingUserId);
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
    return this.usersService.inactivateUserForTenant(id, requestingUserId);
  }
}
