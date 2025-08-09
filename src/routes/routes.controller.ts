// src/routes/routes.controller.ts

// Justificativa: O controller foi ajustado para fornecer respostas de API padronizadas,
// melhorando a consistência e a experiência de desenvolvimento para os clientes (frontend/mobile).
// As chamadas ao serviço permanecem as mesmas, mas a "casca" da resposta agora é uniforme.

import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  Req,
  BadRequestException,
} from '@nestjs/common';
import { RoutesService } from './routes.service';
import { OptimizeRouteDto } from './dto/optimize-route.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { LatLng } from './interfaces/route-optimization.interface';

@Controller('routes')
@UseGuards(JwtAuthGuard, RolesGuard)
export class RoutesController {
  constructor(private readonly routesService: RoutesService) {}

  @Post('optimize')
  @Roles('admin', 'user')
  async optimizeRoute(@Body() optimizeRouteDto: OptimizeRouteDto, @Req() req) {
    const userId = req.user.userId;

    // A validação do DTO já trata a maioria dos casos, mas mantemos checagens
    // extras por segurança, caso o ValidationPipe seja desativado.
    if (!optimizeRouteDto.startingPoint?.trim()) {
      throw new BadRequestException('Ponto de partida é obrigatório');
    }
    if (!optimizeRouteDto.orders || optimizeRouteDto.orders.length === 0) {
      throw new BadRequestException('Lista de pedidos é obrigatória');
    }

    const result = await this.routesService.optimizeRoute(
      optimizeRouteDto,
      userId,
    );

    return {
      success: true,
      message: 'Rota otimizada com sucesso.',
      data: result,
    };
  }

  // Os métodos abaixo seguem o mesmo padrão, delegando ao serviço e envolvendo
  // a resposta na estrutura padronizada.
  // Nota: Supondo que as implementações no adapter e serviço sejam completadas.

  @Post('calculate-distance')
  @Roles('admin', 'user')
  async calculateDistance(
    @Body() body: { origin: string; destination: string },
  ) {
    if (!body.origin?.trim() || !body.destination?.trim()) {
      throw new BadRequestException('Origem e destino são obrigatórios');
    }
    const result = await this.routesService.calculateDistance(
      body.origin,
      body.destination,
    );
    return {
      success: true,
      message: 'Distância calculada com sucesso.',
      data: result,
    };
  }

  @Post('geocode')
  @Roles('admin', 'user', 'driver')
  async geocodeAddresses(@Body() body: { addresses: string[] }) {
    if (!body.addresses || body.addresses.length === 0) {
      throw new BadRequestException('Lista de endereços é obrigatória');
    }
    const result = await this.routesService.geocodeAddresses(body.addresses);
    return {
      success: true,
      message: 'Endereços geocodificados com sucesso.',
      data: result,
    };
  }

  @Post('calculate-route')
  @Roles('admin', 'user')
  async calculateInteractiveRoute(
    @Body() body: { origin: LatLng; destination: LatLng; waypoints?: LatLng[] },
  ) {
    if (!body.origin || !body.destination) {
      throw new BadRequestException('Origem e destino são obrigatórios');
    }
    const result = await this.routesService.calculateInteractiveRoute(
      body.origin,
      body.destination,
      body.waypoints || [],
    );
    return {
      success: true,
      message: 'Rota interativa calculada com sucesso.',
      data: result,
    };
  }

  @Get('map/:routeId')
  @Roles('admin', 'user', 'driver')
  async getRouteMap(@Param('routeId') routeId: string, @Req() req) {
    const userId = req.user.userId;
    const result = await this.routesService.getRouteMap(routeId, userId);
    return {
      success: true,
      message: 'Dados do mapa da rota obtidos com sucesso.',
      data: result,
    };
  }
}
