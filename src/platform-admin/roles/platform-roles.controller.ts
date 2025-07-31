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
  Req, // Adicionado para obter o usuário solicitante
} from '@nestjs/common';
import { RolesService } from '../../roles/roles.service';
import { CreateRoleDto } from '../../roles/dto/create-role.dto';
import { UpdateRoleDto } from '../../roles/dto/update-role.dto'; // Assumindo que UpdateRoleDto existe e é importado
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { RolesGuard } from '../../auth/roles.guard';
import { Roles } from '../../auth/roles.decorator';
import { Request } from 'express'; // Para tipagem do req

@Controller('platform-admin/roles')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('superadmin')
export class PlatformRolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Post() // Cria uma nova role de plataforma (apenas para superadmin)
  async createRole(@Body() createRoleDto: CreateRoleDto, @Req() req: Request) {
    const requestingUserId = (req.user as any).userId;
    return this.rolesService.createRoleForPlatform(
      createRoleDto,
      requestingUserId,
    );
  }

  @Get() // Lista todas as roles (incluindo as de plataforma, para superadmin)
  async findAllRoles(@Req() req: Request) {
    const requestingUserId = (req.user as any).userId;
    return this.rolesService.findAllForPlatformAdmin(requestingUserId);
  }

  @Get(':roleId') // Busca uma role por ID (para superadmin)
  async findRoleById(
    @Param('roleId', ParseUUIDPipe) roleId: string,
    @Req() req: Request,
  ) {
    const requestingUserId = (req.user as any).userId;
    return this.rolesService.findRoleByIdForPlatformAdmin(
      roleId,
      requestingUserId,
    );
  }

  @Patch(':roleId') // Atualiza uma role (para superadmin)
  async updateRole(
    @Param('roleId', ParseUUIDPipe) roleId: string,
    @Body() updateRoleDto: UpdateRoleDto, // Usando UpdateRoleDto
    @Req() req: Request,
  ) {
    const requestingUserId = (req.user as any).userId;
    return this.rolesService.updateRoleForPlatformAdmin(
      roleId,
      updateRoleDto,
      requestingUserId,
    );
  }

  @Delete(':roleId') // Exclui uma role (para superadmin)
  async deleteRole(
    @Param('roleId', ParseUUIDPipe) roleId: string,
    @Req() req: Request,
  ) {
    const requestingUserId = (req.user as any).userId;
    return this.rolesService.deleteRoleForPlatformAdmin(
      roleId,
      requestingUserId,
    );
  }
}
