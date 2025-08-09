// src/routes/routes.controller.ts

/**
 * ROUTES CONTROLLER - VERSÃO CORRIGIDA
 *
 * Justificativa: Versão corrigida que mantém a funcionalidade atual
 * mas adiciona melhorias essenciais sem problemas de tipos.
 *
 * Correções aplicadas:
 * - Remoção de argumentos incorretos
 * - Remoção de variáveis não utilizadas
 * - Tipos corretos para evitar erros
 * - Mantém funcionalidade original
 */

import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  Req,
  BadRequestException,
  Logger,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';

import { RoutesService } from './routes.service';
import { OptimizeRouteDto } from './dto/optimize-route.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { LatLng } from './interfaces/route-optimization.interface';

// Tratamento específico de exceções
import { MapsException } from './exceptions/maps.exceptions';

@ApiTags('Routes')
@ApiBearerAuth()
@Controller('routes')
@UseGuards(JwtAuthGuard, RolesGuard)
export class RoutesController {
  private readonly logger = new Logger(RoutesController.name);

  constructor(private readonly routesService: RoutesService) {}

  // =========================================================================
  // OTIMIZAÇÃO DE ROTA
  // =========================================================================

  @Post('optimize')
  @Roles('admin', 'user')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Otimizar rota de entrega',
    description:
      'Calcula a rota mais eficiente para múltiplas paradas de entrega',
  })
  @ApiResponse({ status: 200, description: 'Rota otimizada com sucesso' })
  @ApiResponse({ status: 400, description: 'Dados de entrada inválidos' })
  async optimizeRoute(
    @Body() optimizeRouteDto: OptimizeRouteDto,
    @Req() req: any,
  ) {
    const userId = req.user.userId;
    const requestId = this.generateRequestId();

    this.logger.log(
      `[${requestId}] Optimize route request from user ${userId}`,
    );

    try {
      // Validação adicional de segurança (além do DTO)
      this.validateOptimizeRouteRequest(optimizeRouteDto);

      // Sanitizar dados de entrada
      const sanitizedDto = this.sanitizeOptimizeRouteDto(optimizeRouteDto);

      const result = await this.routesService.optimizeRoute(
        sanitizedDto,
        userId,
      );

      this.logger.log(`[${requestId}] Route optimization successful`);

      return {
        success: true,
        message: 'Rota otimizada com sucesso.',
        data: result,
        meta: {
          requestId,
          totalWaypoints: result.optimizedWaypoints.length,
          totalDistance: result.totalDistanceInMeters,
          totalDuration: result.totalDurationInSeconds,
        },
      };
    } catch (error) {
      return this.handleControllerError(error, 'route optimization', requestId);
    }
  }

  // =========================================================================
  // CALCULAR DISTÂNCIA
  // =========================================================================

  @Post('calculate-distance')
  @Roles('admin', 'user')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Calcular distância entre dois pontos',
    description: 'Calcula a distância e tempo de viagem entre origem e destino',
  })
  @ApiResponse({ status: 200, description: 'Distância calculada com sucesso' })
  async calculateDistance(
    @Body() body: { origin: string; destination: string },
  ) {
    const requestId = this.generateRequestId();

    this.logger.debug(`[${requestId}] Distance calculation request`);

    try {
      // Validação
      if (!body.origin?.trim() || !body.destination?.trim()) {
        throw new BadRequestException('Origem e destino são obrigatórios');
      }

      // Sanitizar entradas
      const origin = this.sanitizeAddress(body.origin);
      const destination = this.sanitizeAddress(body.destination);

      const result = await this.routesService.calculateDistance(
        origin,
        destination,
      );

      return {
        success: true,
        message: 'Distância calculada com sucesso.',
        data: result,
        meta: {
          requestId,
          distanceKm: (result.distanceInMeters / 1000).toFixed(2),
          durationMinutes: Math.round(result.durationInSeconds / 60),
        },
      };
    } catch (error) {
      return this.handleControllerError(
        error,
        'distance calculation',
        requestId,
      );
    }
  }

  // =========================================================================
  // GEOCODIFICAÇÃO
  // =========================================================================

  @Post('geocode')
  @Roles('admin', 'user', 'driver')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Geocodificar endereços',
    description: 'Converte endereços em coordenadas geográficas',
  })
  @ApiResponse({
    status: 200,
    description: 'Endereços geocodificados com sucesso',
  })
  async geocodeAddresses(@Body() body: { addresses: string[] }) {
    const requestId = this.generateRequestId();

    this.logger.debug(
      `[${requestId}] Geocoding ${body.addresses.length} addresses`,
    );

    try {
      // Validação
      if (!body.addresses || body.addresses.length === 0) {
        throw new BadRequestException('Lista de endereços é obrigatória');
      }

      if (body.addresses.length > 100) {
        throw new BadRequestException('Máximo de 100 endereços por consulta');
      }

      // Sanitizar endereços
      const sanitizedAddresses = body.addresses.map((addr) =>
        this.sanitizeAddress(addr),
      );

      const result =
        await this.routesService.geocodeAddresses(sanitizedAddresses);

      const successCount = result.filter((r) => r.success).length;
      const successRate = ((successCount / result.length) * 100).toFixed(1);

      return {
        success: true,
        message: 'Endereços geocodificados com sucesso.',
        data: result,
        meta: {
          requestId,
          totalAddresses: result.length,
          successfulGeocodings: successCount,
          successRate: `${successRate}%`,
        },
      };
    } catch (error) {
      return this.handleControllerError(error, 'geocoding', requestId);
    }
  }

  // =========================================================================
  // ROTA INTERATIVA
  // =========================================================================

  @Post('calculate-route')
  @Roles('admin', 'user')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Calcular rota interativa',
    description: 'Calcula rota detalhada com waypoints opcionais',
  })
  @ApiResponse({
    status: 200,
    description: 'Rota interativa calculada com sucesso',
  })
  async calculateInteractiveRoute(
    @Body() body: { origin: LatLng; destination: LatLng; waypoints?: LatLng[] },
  ) {
    const requestId = this.generateRequestId();

    this.logger.debug(
      `[${requestId}] Interactive route calculation with ${body.waypoints?.length || 0} waypoints`,
    );

    try {
      // Validação
      if (!body.origin || !body.destination) {
        throw new BadRequestException('Origem e destino são obrigatórios');
      }

      // Validação de coordenadas
      this.validateCoordinates(body.origin, 'origem');
      this.validateCoordinates(body.destination, 'destino');

      if (body.waypoints) {
        body.waypoints.forEach((wp, index) => {
          this.validateCoordinates(wp, `waypoint ${index + 1}`);
        });
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
        meta: {
          requestId,
          totalLegs: result.legs.length,
          totalDistanceKm: (result.totalDistanceInMeters / 1000).toFixed(2),
          totalDurationMinutes: Math.round(result.totalDurationInSeconds / 60),
        },
      };
    } catch (error) {
      return this.handleControllerError(
        error,
        'interactive route calculation',
        requestId,
      );
    }
  }

  // =========================================================================
  // OBTER MAPA DA ROTA
  // =========================================================================

  @Get('map/:routeId')
  @Roles('admin', 'user', 'driver')
  @ApiOperation({
    summary: 'Obter dados do mapa da rota',
    description: 'Recupera dados de uma rota salva anteriormente',
  })
  @ApiResponse({
    status: 200,
    description: 'Dados do mapa obtidos com sucesso',
  })
  @ApiResponse({ status: 404, description: 'Rota não encontrada' })
  async getRouteMap(@Param('routeId') routeId: string, @Req() req: any) {
    const userId = req.user.userId;
    const requestId = this.generateRequestId();

    this.logger.debug(
      `[${requestId}] Get route map request for route ${routeId}`,
    );

    try {
      // Validar e sanitizar routeId
      const sanitizedRouteId = this.sanitizeRouteId(routeId);

      const result = await this.routesService.getRouteMap(
        sanitizedRouteId,
        userId,
      );

      return {
        success: true,
        message: 'Dados do mapa da rota obtidos com sucesso.',
        data: result,
        meta: {
          requestId,
          routeId: sanitizedRouteId,
          waypointsCount: result.optimizedWaypoints.length,
        },
      };
    } catch (error) {
      return this.handleControllerError(error, 'get route map', requestId);
    }
  }

  // =========================================================================
  // MÉTODOS PRIVADOS DE SUPORTE
  // =========================================================================

  /**
   * Valida request de otimização de rota
   */
  private validateOptimizeRouteRequest(dto: OptimizeRouteDto): void {
    if (!dto.startingPoint?.trim()) {
      throw new BadRequestException('Ponto de partida é obrigatório');
    }

    if (!dto.orders || dto.orders.length === 0) {
      throw new BadRequestException('Lista de pedidos é obrigatória');
    }

    if (dto.orders.length > 25) {
      throw new BadRequestException('Máximo de 25 pedidos por otimização');
    }

    // Verificar duplicatas de ID
    const ids = dto.orders.map((o) => o.id);
    const uniqueIds = new Set(ids);
    if (ids.length !== uniqueIds.size) {
      throw new BadRequestException('IDs de pedidos devem ser únicos');
    }
  }

  /**
   * Valida coordenadas
   */
  private validateCoordinates(coords: LatLng, fieldName: string): void {
    if (
      !coords ||
      typeof coords.lat !== 'number' ||
      typeof coords.lng !== 'number'
    ) {
      throw new BadRequestException(
        `Coordenadas de ${fieldName} são obrigatórias`,
      );
    }

    if (coords.lat < -90 || coords.lat > 90) {
      throw new BadRequestException(
        `Latitude de ${fieldName} deve estar entre -90 e 90`,
      );
    }

    if (coords.lng < -180 || coords.lng > 180) {
      throw new BadRequestException(
        `Longitude de ${fieldName} deve estar entre -180 e 180`,
      );
    }
  }

  /**
   * Sanitiza DTO de otimização de rota
   */
  private sanitizeOptimizeRouteDto(dto: OptimizeRouteDto): OptimizeRouteDto {
    return {
      startingPoint: this.sanitizeAddress(dto.startingPoint),
      orders: dto.orders.map((order) => ({
        id: order.id.trim(),
        address: this.sanitizeAddress(order.address),
        cliente: order.cliente.trim(),
        numero: order.numero.trim(),
      })),
    };
  }

  /**
   * Sanitiza endereço
   */
  private sanitizeAddress(address: string): string {
    return address
      .trim()
      .replace(/[<>'"]/g, '') // Remove caracteres perigosos
      .substring(0, 200); // Limita tamanho
  }

  /**
   * Sanitiza route ID
   */
  private sanitizeRouteId(routeId: string): string {
    if (!routeId?.trim()) {
      throw new BadRequestException('Route ID é obrigatório');
    }

    // Remove caracteres não alfanuméricos (exceto hífen e underscore)
    const sanitized = routeId.trim().replace(/[^a-zA-Z0-9\-_]/g, '');

    if (sanitized.length === 0) {
      throw new BadRequestException('Route ID inválido');
    }

    return sanitized;
  }

  /**
   * Tratamento centralizado de erros
   */
  private handleControllerError(
    error: any,
    operation: string,
    requestId: string,
  ) {
    this.logger.error(`[${requestId}] ${operation} failed:`, {
      error: error.message,
      stack: error.stack,
    });

    // Tratamento específico para MapsException
    if (error instanceof MapsException) {
      return {
        success: false,
        message: error.message,
        error: {
          code: error.code,
          provider: error.provider,
          isRetryable: error.isRetryable,
          requestId,
        },
      };
    }

    // Tratamento para BadRequestException
    if (error instanceof BadRequestException) {
      return {
        success: false,
        message: error.message,
        error: {
          code: 'VALIDATION_ERROR',
          requestId,
        },
      };
    }

    // Re-throw para que o ExceptionFilter global trate
    throw error;
  }

  /**
   * Gera ID único para request
   */
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  }
}
