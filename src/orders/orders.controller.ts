import {
  Controller,
  Post,
  Body,
  UseGuards,
  Req,
  Get,
  Param,
  Query,
  DefaultValuePipe,
  ParseIntPipe,
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
    const userId = req.user.userId;
    return this.ordersService.upload(orders, userId);
  }

  @Get()
  async findAll(
    @Req() req,
    @Query('search') search?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number = 1,
    @Query('pageSize', new DefaultValuePipe(10), ParseIntPipe)
    pageSize: number = 10,
  ) {
    const userId = req.user.userId;
    return this.ordersService.findAllByUserId(
      userId,
      search,
      startDate,
      endDate,
      page,
      pageSize,
    );
  }

  @Get('all')
  async findAllByTenantList(@Req() req) {
    const userId = req.user.userId;
    return this.ordersService.findAllByTenantList(userId);
  }

  @Get(':id/history')
  async findOrderHistory(
    @Param('id') id: string,
    @Req() req,
  ): Promise<OrderHistoryEventDto[]> {
    const userId = req.user.userId;
    const history = await this.ordersService.findOrderHistoryByIdAndUserId(
      id,
      userId,
    );
    return history;
  }
}
