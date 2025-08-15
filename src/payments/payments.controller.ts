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
  DefaultValuePipe,
  ParseIntPipe,
} from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { PaymentStatus } from '@prisma/client';

@Controller('payments')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post()
  @Roles('admin', 'user')
  create(@Body() createPaymentDto: CreatePaymentDto, @Req() req) {
    const userId = req.user.userId;
    return this.paymentsService.create(createPaymentDto, userId);
  }

  @Get()
  @Roles('admin', 'user')
  findAll(
    @Req() req,
    @Query('search') search?: string,
    @Query('status') status?: PaymentStatus,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number = 1,
    @Query('pageSize', new DefaultValuePipe(10), ParseIntPipe)
    pageSize: number = 10,
  ) {
    const userId = req.user.userId;
    return this.paymentsService.findAllByUserId(
      userId,
      search,
      status,
      startDate,
      endDate,
      page,
      pageSize,
    );
  }

  @Post('mark-as-paid')
  @Roles('admin', 'user')
  markAsPaid(@Body('paymentIds') paymentIds: string[], @Req() req) {
    const userId = req.user.userId;
    return this.paymentsService.markAsPaid(paymentIds, userId);
  }

  @Patch(':id/status')
  @Roles('admin', 'user')
  updatePaymentStatus(
    @Param('id') id: string,
    @Body('status') status: PaymentStatus,
    @Req() req,
  ) {
    const userId = req.user.userId;
    return this.paymentsService.updateStatus(id, status, userId);
  }

  @Patch(':id/revert')
  @Roles('admin', 'user')
  revertPayment(@Param('id') id: string, @Req() req) {
    const userId = req.user.userId;
    return this.paymentsService.revertPaymentToPending(id, userId);
  }
}
