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
  BadRequestException,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { DeliveryService } from './delivery.service';
import { CreateDeliveryDto } from './dto/create-delivery.dto';
import { UpdateDeliveryDto } from './dto/update-delivery.dto';
import { RejeitarRoteiroDto } from './dto/reject-delivery.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { OrderStatus } from '../types/status.enum';

export class CalculateFreightDto {
  orderIds: string[];
  vehicleId: string;
}

@Controller('delivery')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DeliveryController {
  constructor(private readonly deliveryService: DeliveryService) {}

  @Post()
  @Roles('admin', 'user')
  async create(@Body() createDeliveryDto: CreateDeliveryDto, @Req() req) {
    const userId = req.user.userId;
    return this.deliveryService.create(createDeliveryDto, userId);
  }

  @Post('calculate-freight-preview')
  @Roles('admin', 'user')
  async calculateFreightPreview(
    @Body() calculateFreightDto: CalculateFreightDto,
    @Req() req,
  ) {
    const userId = req.user.userId;
    return this.deliveryService.calculateFreightPreview(
      calculateFreightDto,
      userId,
    );
  }

  @Get()
  @Roles('admin', 'driver', 'user')
  async findAll(@Req() req) {
    const userId = req.user.userId;
    const userRole = req.user.role;
    // Passa o userId e a role para o serviço lidar com a lógica de filtragem para motoristas
    return this.deliveryService.findAllByUserIdAndRole(userId, userRole);
  }

  @Get(':id')
  @Roles('admin', 'driver', 'user')
  async findOne(@Param('id') id: string, @Req() req) {
    const userId = req.user.userId;
    const userRole = req.user.role;
    // Passa userId e role para o serviço lidar com a lógica de acesso do motorista
    return this.deliveryService.findOneByIdAndUserIdAndRole(
      id,
      userId,
      userRole,
    );
  }

  @Patch(':id')
  @Roles('admin', 'user')
  async update(
    @Param('id') id: string,
    @Body() updateDeliveryDto: UpdateDeliveryDto,
    @Req() req,
  ) {
    const userId = req.user.userId;
    return this.deliveryService.update(id, updateDeliveryDto, userId);
  }

  @Delete(':id')
  @Roles('admin', 'user')
  @HttpCode(HttpStatus.OK)
  async remove(@Param('id') id: string, @Req() req) {
    const userId = req.user.userId;
    return this.deliveryService.remove(id, userId);
  }

  @Patch(':id/remove-order/:orderId')
  @Roles('admin', 'user')
  async removeOrderFromDelivery(
    @Param('id') deliveryId: string,
    @Param('orderId') orderId: string,
    @Req() req,
  ) {
    const userId = req.user.userId;
    return this.deliveryService.removeOrderFromDelivery(
      deliveryId,
      orderId,
      userId,
    );
  }

  @Patch('order/:orderId/status')
  @Roles('driver')
  async updateOrderStatus(
    @Param('orderId') orderId: string,
    @Body()
    body: {
      status:
        | OrderStatus.EM_ENTREGA
        | OrderStatus.ENTREGUE
        | OrderStatus.NAO_ENTREGUE;
      motivoNaoEntrega?: string;
      codigoMotivoNaoEntrega?: string;
    },
    @Req() req,
  ) {
    const userId = req.user.userId; // Obtém userId do token
    // A validação de driverId será movida para o serviço
    if (!body.status)
      throw new BadRequestException('Novo status do pedido é obrigatório.');
    if (body.status === OrderStatus.NAO_ENTREGUE && !body.motivoNaoEntrega) {
      throw new BadRequestException(
        'Motivo da não entrega é obrigatório para o status "Não entregue".',
      );
    }

    return this.deliveryService.updateOrderStatus(
      orderId,
      body.status,
      userId, // Passa userId
      body.motivoNaoEntrega,
      body.codigoMotivoNaoEntrega,
    );
  }

  @Patch(':id/liberar')
  @Roles('admin')
  async liberarRoteiro(@Param('id') deliveryId: string, @Req() req) {
    const userId = req.user.userId;
    return this.deliveryService.liberarRoteiro(deliveryId, userId);
  }

  @Patch(':id/rejeitar')
  @Roles('admin')
  async rejeitarRoteiro(
    @Param('id') deliveryId: string,
    @Body() rejeitarRoteiroDto: RejeitarRoteiroDto,
    @Req() req,
  ) {
    const userId = req.user.userId;
    return this.deliveryService.rejeitarRoteiro(
      deliveryId,
      userId,
      rejeitarRoteiroDto.motivo,
    );
  }
}
