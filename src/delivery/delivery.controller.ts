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
  Query,
  DefaultValuePipe,
  ParseIntPipe,
} from '@nestjs/common';
import { DeliveryService } from './delivery.service';
import { CreateDeliveryDto } from './dto/create-delivery.dto';
import { UpdateDeliveryDto } from './dto/update-delivery.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
// CORREÇÃO: Importar o Enum do Prisma para fazer a conversão de tipo (cast)
import { DeliveryStatus } from '@prisma/client';

@Controller('delivery')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DeliveryController {
  constructor(private readonly deliveryService: DeliveryService) {}

  @Post()
  @Roles('admin', 'user')
  create(@Body() createDeliveryDto: CreateDeliveryDto, @Req() req) {
    const userId = req.user.userId;
    return this.deliveryService.create(createDeliveryDto, userId);
  }

  @Get()
  @Roles('admin', 'user', 'driver')
  findAll(
    @Req() req,
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number = 1,
    @Query('pageSize', new DefaultValuePipe(10), ParseIntPipe)
    pageSize: number = 10,
  ) {
    const userId = req.user.userId;
    return this.deliveryService.findAll(
      userId,
      search,
      // CORREÇÃO: Fazemos um "cast" da string para o tipo DeliveryStatus
      // para satisfazer a tipagem do serviço.
      status as DeliveryStatus,
      startDate,
      endDate,
      page,
      pageSize,
    );
  }

  @Get(':id')
  @Roles('admin', 'user', 'driver')
  findOne(@Param('id') id: string, @Req() req) {
    const userId = req.user.userId;
    return this.deliveryService.findOne(id, userId);
  }

  @Patch(':id')
  @Roles('admin', 'user')
  update(
    @Param('id') id: string,
    @Body() updateDeliveryDto: UpdateDeliveryDto,
    @Req() req,
  ) {
    const userId = req.user.userId;
    return this.deliveryService.update(id, updateDeliveryDto, userId);
  }

  @Delete(':id')
  @Roles('admin', 'user')
  remove(@Param('id') id: string, @Req() req) {
    const userId = req.user.userId;
    return this.deliveryService.remove(id, userId);
  }

  @Post('/calculate-freight-preview')
  @Roles('admin', 'user')
  calculateFreightPreview(
    @Body() data: { orderIds: string[]; vehicleId: string },
    @Req() req,
  ) {
    const userId = req.user.userId;
    return this.deliveryService.calculateFreightPreview(data, userId);
  }

  @Patch(':id/liberar')
  @Roles('admin', 'user')
  approveDelivery(@Param('id') id: string, @Req() req) {
    const userId = req.user.userId;
    return this.deliveryService.liberarRoteiro(id, userId);
  }

  @Patch(':id/rejeitar')
  @Roles('admin', 'user')
  rejectDelivery(
    @Param('id') id: string,
    @Body('motivo') motivo: string,
    @Req() req,
  ) {
    const userId = req.user.userId;
    return this.deliveryService.rejeitarRoteiro(id, userId, motivo);
  }

  @Patch('/order/:orderId/status')
  @Roles('driver')
  updateOrderStatus(
    @Param('orderId') orderId: string,
    @Body()
    body: {
      status: any;
      motivoNaoEntrega?: string;
      codigoMotivoNaoEntrega?: string;
    },
    @Req() req,
  ) {
    const userId = req.user.userId;
    return this.deliveryService.updateOrderStatus(
      orderId,
      body.status,
      userId,
      body.motivoNaoEntrega,
      body.codigoMotivoNaoEntrega,
    );
  }

  @Patch(':id/remove-order/:orderId')
  @Roles('admin', 'user')
  removeOrderFromDelivery(
    @Param('id') id: string,
    @Param('orderId') orderId: string,
    @Req() req,
  ) {
    const userId = req.user.userId;
    return this.deliveryService.removeOrderFromDelivery(id, orderId, userId);
  }
}
