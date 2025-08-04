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
  Req,
  Query,
  DefaultValuePipe,
  ParseIntPipe,
} from '@nestjs/common';
import { TenantService } from '../../tenant/tenant.service';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { RolesGuard } from '../../auth/roles.guard';
import { Roles } from '../../auth/roles.decorator';
import { CreateTenantDto } from '../../tenant/dto/create-tenant.dto';
import { UpdateTenantDto } from '../../tenant/dto/update-tenant.dto';
import { Request } from 'express';

@Controller('platform-admin/tenants')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('superadmin')
export class PlatformTenantsController {
  constructor(private readonly tenantService: TenantService) {}

  @Post()
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

  @Get()
  async getAllTenants(
    @Req() req: Request,
    @Query('searchTerm') searchTerm?: string,
    @Query('includeInactive') includeInactive: string = 'false',
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number = 1,
    @Query('pageSize', new DefaultValuePipe(10), ParseIntPipe)
    pageSize: number = 10,
  ) {
    const requestingUserId = (req.user as any).userId;
    const includeInactiveBool = includeInactive === 'true';
    return this.tenantService.getAllTenantsByPlatformAdmin(
      requestingUserId,
      searchTerm,
      includeInactiveBool,
      page,
      pageSize,
    );
  }

  @Get(':tenantId')
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

  @Put(':tenantId')
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

  @Delete(':tenantId')
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
