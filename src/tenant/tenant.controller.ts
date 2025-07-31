import {
  Controller,
  Get,
  Put,
  Body,
  Param,
  UseGuards,
  Req,
} from '@nestjs/common';
import { TenantService } from './tenant.service';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Request } from 'express';

@Controller('tenant')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TenantController {
  constructor(private readonly tenantService: TenantService) {}

  @Get()
  @Roles('admin', 'superadmin', 'user', 'driver')
  async getTenant(@Req() req: Request) {
    const userId = (req.user as any).userId; // Obtém userId do token
    return this.tenantService.getTenantByUserId(userId); // Novo método no service
  }

  @Put(':tenantId')
  @Roles('admin')
  async updateTenant(
    @Req() req: Request,
    @Param('tenantId') tenantId: string,
    @Body() updateTenantDto: UpdateTenantDto,
  ) {
    const userId = (req.user as any).userId; // Obtém userId do token
    return this.tenantService.updateTenant(userId, tenantId, updateTenantDto);
  }
}
