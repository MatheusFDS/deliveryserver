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
import {
  OptimizeRouteResponse,
  DistanceCalculationResponse,
  GeocodeResult,
  RouteCalculationResult,
} from './interfaces/route-optimization.interface';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('routes')
@UseGuards(JwtAuthGuard, RolesGuard)
export class RoutesController {
  constructor(private readonly routesService: RoutesService) {}

  // REMOVIDO: Endpoint `getMapsKey` para não expor a chave API diretamente

  @Post('optimize')
  @Roles('admin', 'user')
  async optimizeRoute(
    @Body() optimizeRouteDto: OptimizeRouteDto,
    @Req() req,
  ): Promise<OptimizeRouteResponse> {
    const userId = req.user.userId;

    if (!optimizeRouteDto.startingPoint?.trim()) {
      throw new BadRequestException('Ponto de partida é obrigatório');
    }

    if (!optimizeRouteDto.orders || optimizeRouteDto.orders.length === 0) {
      throw new BadRequestException('Lista de pedidos é obrigatória');
    }

    if (optimizeRouteDto.orders.length > 25) {
      throw new BadRequestException('Máximo de 25 pedidos por otimização');
    }

    return this.routesService.optimizeRoute(optimizeRouteDto, userId);
  }

  @Post('calculate-distance')
  @Roles('admin', 'user')
  async calculateDistance(
    @Body() body: { origin: string; destination: string },
  ): Promise<DistanceCalculationResponse> {
    if (!body.origin?.trim() || !body.destination?.trim()) {
      throw new BadRequestException('Origem e destino são obrigatórios');
    }

    return this.routesService.calculateDistance(body.origin, body.destination);
  }

  @Post('geocode')
  @Roles('admin', 'user', 'driver')
  async geocodeAddresses(
    @Body() body: { addresses: string[] },
  ): Promise<GeocodeResult[]> {
    if (!body.addresses || body.addresses.length === 0) {
      throw new BadRequestException('Lista de endereços é obrigatória');
    }

    if (body.addresses.length > 50) {
      throw new BadRequestException('Máximo de 50 endereços por vez');
    }

    return this.routesService.geocodeAddresses(body.addresses);
  }

  @Post('calculate-route')
  @Roles('admin', 'user')
  async calculateInteractiveRoute(
    @Body()
    body: {
      origin: { lat: number; lng: number };
      destination: { lat: number; lng: number };
      waypoints?: Array<{ lat: number; lng: number }>;
    },
  ): Promise<RouteCalculationResult> {
    if (!body.origin || !body.destination) {
      throw new BadRequestException('Origem e destino são obrigatórios');
    }

    if (body.waypoints && body.waypoints.length > 23) {
      throw new BadRequestException('Máximo de 23 waypoints permitidos');
    }

    return this.routesService.calculateInteractiveRoute(
      body.origin,
      body.destination,
      body.waypoints || [],
    );
  }

  @Post('static-map')
  @Roles('admin', 'user', 'driver')
  async getStaticMap(
    @Body()
    body: {
      center?: { lat: number; lng: number };
      markers?: Array<{
        lat: number;
        lng: number;
        label?: string;
        color?: string;
      }>;
      path?: Array<{ lat: number; lng: number }>;
      zoom?: number;
      size?: string;
      polyline?: string;
    },
  ) {
    return this.routesService.generateStaticMap(
      body.markers || [],
      body.path || [],
      body.center,
      body.zoom || 12,
      body.size || '600x400',
      body.polyline,
    );
  }

  @Get('map/:routeId')
  @Roles('admin', 'user', 'driver')
  async getRouteMap(@Param('routeId') routeId: string, @Req() req) {
    const userId = req.user.userId;

    return this.routesService.getRouteMap(routeId, userId);
  }
}
