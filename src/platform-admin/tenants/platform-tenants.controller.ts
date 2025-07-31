import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  UseGuards,
  Put,
  Delete,
  ParseUUIDPipe,
  Req, // Adicionado para obter o usuário solicitante
} from '@nestjs/common';
import { TenantService } from '../../tenant/tenant.service';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { RolesGuard } from '../../auth/roles.guard';
import { Roles } from '../../auth/roles.decorator';
import { CreateTenantDto } from '../../tenant/dto/create-tenant.dto';
import { UpdateTenantDto } from '../../tenant/dto/update-tenant.dto';
import { Request } from 'express'; // Para tipagem do req

@Controller('platform-admin/tenants')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('superadmin')
export class PlatformTenantsController {
  constructor(private readonly tenantService: TenantService) {}

  @Post() // Cria um novo tenant (apenas para superadmin)
  async createTenant(
    @Body() createTenantDto: CreateTenantDto,
    @Req() req: Request,
  ) {
    const requestingUserId = (req.user as any).userId;
    return this.tenantService.createTenantByPlatformAdmin(
      createTenantDto,
      requestingUserId,
    );
  }

  @Get() // Lista todos os tenants (apenas para superadmin)
  async getAllTenants(@Req() req: Request) {
    const requestingUserId = (req.user as any).userId;
    return this.tenantService.getAllTenantsByPlatformAdmin(requestingUserId);
  }

  @Get(':tenantId') // Busca um tenant por ID (apenas para superadmin)
  async getTenantById(
    @Param('tenantId', ParseUUIDPipe) tenantId: string,
    @Req() req: Request,
  ) {
    const requestingUserId = (req.user as any).userId;
    return this.tenantService.getTenantByIdByPlatformAdmin(
      tenantId,
      requestingUserId,
    );
  }

  @Put(':tenantId') // Atualiza um tenant (apenas para superadmin)
  async updateTenant(
    @Param('tenantId', ParseUUIDPipe) tenantId: string,
    @Body() updateTenantDto: UpdateTenantDto,
    @Req() req: Request,
  ) {
    const requestingUserId = (req.user as any).userId;
    return this.tenantService.updateTenantByPlatformAdmin(
      tenantId,
      updateTenantDto,
      requestingUserId,
    );
  }

  @Delete(':tenantId') // Deleta um tenant (apenas para superadmin)
  async deleteTenant(
    @Param('tenantId', ParseUUIDPipe) tenantId: string,
    @Req() req: Request,
  ) {
    const requestingUserId = (req.user as any).userId;
    return this.tenantService.deleteTenantByPlatformAdmin(
      tenantId,
      requestingUserId,
    );
  }
}
