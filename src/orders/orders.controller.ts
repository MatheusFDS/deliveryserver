// Em src/orders/orders.controller.ts

import {
  Controller,
  Post,
  Body,
  UseGuards,
  Req,
  Get,
  Param,
} from '@nestjs/common';
import { OrdersService } from './orders.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Order } from '@prisma/client';
import { OrderHistoryEventDto } from './dto/order-history-event.dto';

@Controller('orders')
@UseGuards(JwtAuthGuard)
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post('upload')
  async upload(@Body() orders: Order[], @Req() req) {
    const userId = req.user.userId; // Obtém userId do token
    return this.ordersService.upload(orders, userId); // Passa userId em vez de tenantId
  }

  @Get()
  async findAll(@Req() req) {
    const userId = req.user.userId; // Obtém userId do token
    return this.ordersService.findAllByUserId(userId); // Passa userId em vez de tenantId
  }

  @Get(':id/history')
  async findOrderHistory(
    @Param('id') id: string,
    @Req() req,
  ): Promise<OrderHistoryEventDto[]> {
    const userId = req.user.userId; // Obtém userId do token
    const history = await this.ordersService.findOrderHistoryByIdAndUserId(
      id,
      userId,
    ); // Passa userId
    return history;
  }
}
