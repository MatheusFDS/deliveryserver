import {
  Controller,
  Post,
  Body,
  UseGuards,
  Req,
  Get,
  Patch,
  Delete,
  Param,
} from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { UpdatePaymentDto } from './dto/update-payment.dto';
import { CreateGroupPaymentDto } from './dto/create-group-payment.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Request } from 'express';

@Controller('payments')
@UseGuards(JwtAuthGuard)
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post()
  async create(
    @Body() createPaymentDto: CreatePaymentDto,
    @Req() req: Request,
  ) {
    const userId = (req.user as any).userId; // Obtém userId do token
    return await this.paymentsService.create(createPaymentDto, userId); // Passa userId em vez de tenantId
  }

  @Get()
  async findAll(@Req() req: Request) {
    const userId = (req.user as any).userId; // Obtém userId do token
    return this.paymentsService.findAllByUserId(userId); // Passa userId em vez de tenantId
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Req() req: Request) {
    const userId = (req.user as any).userId; // Obtém userId do token
    return this.paymentsService.findOneByIdAndUserId(id, userId); // Passa userId em vez de tenantId
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updatePaymentDto: UpdatePaymentDto,
    @Req() req: Request,
  ) {
    const userId = (req.user as any).userId; // Obtém userId do token
    return this.paymentsService.update(id, updatePaymentDto, userId); // Passa userId em vez de tenantId
  }

  @Patch(':id/status')
  async updateStatus(
    @Param('id') id: string,
    @Body() { status }: { status: string },
    @Req() req: Request,
  ) {
    const userId = (req.user as any).userId; // Obtém userId do token
    const updatePaymentDto: UpdatePaymentDto = { status };
    return this.paymentsService.update(id, updatePaymentDto, userId); // Passa userId em vez de tenantId
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @Req() req: Request) {
    const userId = (req.user as any).userId; // Obtém userId do token
    return this.paymentsService.remove(id, userId); // Passa userId em vez de tenantId
  }

  @Post('group')
  async groupPayments(
    @Body() createGroupPaymentDto: CreateGroupPaymentDto,
    @Req() req: Request,
  ) {
    const userId = (req.user as any).userId; // Obtém userId do token
    return await this.paymentsService.groupPayments(
      createGroupPaymentDto.paymentIds,
      userId, // Passa userId em vez de tenantId
    );
  }

  @Post('ungroup/:id')
  async ungroupPayments(@Param('id') id: string, @Req() req: Request) {
    const userId = (req.user as any).userId; // Obtém userId do token
    return await this.paymentsService.ungroupPayments(id, userId); // Passa userId em vez de tenantId
  }
}
