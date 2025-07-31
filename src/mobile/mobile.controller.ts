import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  UseGuards,
  Req,
  Query,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { MobileService } from './mobile.service';

@Controller('mobile/v1')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('driver')
export class MobileController {
  constructor(private readonly mobileService: MobileService) {}

  @Get('profile')
  async getProfile(@Req() req) {
    const userId = req.user.userId; // Apenas userId é seguro do JWT
    // tenantId e driverId serão derivados no serviço
    return this.mobileService.getProfile(userId);
  }

  @Get('routes')
  async getDriverRoutes(
    @Req() req,
    @Query('includeHistory') includeHistory?: string,
  ) {
    const userId = req.user.userId; // Apenas userId é seguro
    const includeHistoryBool = includeHistory === 'true';
    // tenantId e driverId serão derivados no serviço
    return this.mobileService.getDriverRoutes(userId, includeHistoryBool);
  }

  @Get('history')
  async getDriverHistory(@Req() req) {
    const userId = req.user.userId; // Apenas userId é seguro
    // tenantId e driverId serão derivados no serviço
    return this.mobileService.getDriverHistory(userId);
  }

  @Get('financials/receivables')
  async getDriverReceivables(@Req() req) {
    const userId = req.user.userId; // Apenas userId é seguro
    // driverId e tenantId serão derivados no serviço
    return this.mobileService.getDriverReceivables(userId);
  }

  @Get('routes/:id')
  async getRouteDetails(@Param('id') routeId: string, @Req() req) {
    const userId = req.user.userId; // Apenas userId é seguro
    // tenantId e driverId serão derivados no serviço
    return this.mobileService.getRouteDetails(routeId, userId);
  }

  @Get('deliveries/:id')
  async getDeliveryDetails(@Param('id') orderId: string, @Req() req) {
    const userId = req.user.userId; // Apenas userId é seguro
    // tenantId será derivado no serviço
    return this.mobileService.getDeliveryDetails(orderId, userId);
  }

  @Patch('orders/:id/status')
  async updateOrderStatus(
    @Param('id') orderId: string,
    @Body()
    updateData: {
      status: string;
      motivoNaoEntrega?: string;
      codigoMotivoNaoEntrega?: string;
    },
    @Req() req,
  ) {
    const userId = req.user.userId; // Apenas userId é seguro
    // driverId e tenantId serão derivados no serviço
    return this.mobileService.updateOrderStatus(orderId, updateData, userId);
  }

  @Post('orders/:id/proof')
  @UseInterceptors(FileInterceptor('file'))
  async uploadDeliveryProof(
    @Param('id') orderId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() body: { description?: string },
    @Req() req,
  ) {
    const userId = req.user.userId; // Apenas userId é seguro
    // driverId e tenantId serão derivados no serviço
    return this.mobileService.uploadDeliveryProof(orderId, file, userId);
  }

  @Get('orders/:id/proofs')
  async getOrderProofs(@Param('id') orderId: string, @Req() req) {
    const userId = req.user.userId; // Apenas userId é seguro
    // tenantId será derivado no serviço
    return this.mobileService.getOrderProofs(orderId, userId);
  }
}
