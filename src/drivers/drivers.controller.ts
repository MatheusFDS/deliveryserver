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
  UploadedFile,
  UseInterceptors,
  Query,
  DefaultValuePipe,
  ParseIntPipe,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { DriversService } from './drivers.service';
import { CreateDriverDto } from './dto/create-driver.dto';
import { UpdateDriverDto } from './dto/update-driver.dto';
import { Request } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { OrderStatus } from '@prisma/client';
import { Roles } from 'src/auth/roles.decorator';

@Controller('drivers')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DriversController {
  constructor(private readonly driversService: DriversService) {}

  @Post()
  @Roles('admin')
  create(@Body() createDriverDto: CreateDriverDto, @Req() req: Request) {
    const userId = (req.user as any).userId;
    return this.driversService.create(createDriverDto, userId);
  }

  @Get()
  @Roles('admin')
  findAll(
    @Req() req: Request,
    @Query('search') search?: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number = 1,
    @Query('pageSize', new DefaultValuePipe(10), ParseIntPipe)
    pageSize: number = 10,
  ) {
    const userId = (req.user as any).userId;
    return this.driversService.findAllByUserId(userId, search, page, pageSize);
  }

  @Get('all')
  @Roles('admin', 'user')
  findAllByTenant(@Req() req: Request) {
    const userId = (req.user as any).userId;
    return this.driversService.findAllByTenant(userId);
  }

  // *** MUDANÇA: rota estática 'available-users' antes de ':id' ***
  @Get('available-users')
  @Roles('admin', 'user')
  getAvailableUsers(@Req() req: Request) {
    const userId = (req.user as any).userId;
    return this.driversService.getAvailableUsersByUserId(userId);
  }

  @Get(':id')
  @Roles('admin', 'user')
  findOne(@Param('id') id: string, @Req() req: Request) {
    const userId = (req.user as any).userId;
    return this.driversService.findOneByIdAndUserId(id, userId);
  }

  @Patch(':id')
  @Roles('admin', 'user')
  update(
    @Param('id') id: string,
    @Body() updateDriverDto: UpdateDriverDto,
    @Req() req: Request,
  ) {
    const userId = (req.user as any).userId;
    return this.driversService.update(id, updateDriverDto, userId);
  }

  @Delete(':id')
  @Roles('admin', 'user')
  remove(@Param('id') id: string, @Req() req: Request) {
    const userId = (req.user as any).userId;
    return this.driversService.remove(id, userId);
  }

  @Get('orders')
  @Roles('driver')
  findOrdersByDriver(@Req() req: Request) {
    const userId = (req.user as any).userId;
    return this.driversService.findOrdersByAuthUser(userId);
  }

  @Patch('orders/:id/start')
  @Roles('driver')
  startOrder(@Param('id') orderId: string, @Req() req: Request) {
    const userId = (req.user as any).userId;
    return this.driversService.updateOrderStatus(
      orderId,
      OrderStatus.EM_ENTREGA,
      userId,
    );
  }

  @Patch('orders/:id/complete')
  @Roles('driver')
  completeOrder(@Param('id') orderId: string, @Req() req: Request) {
    const userId = (req.user as any).userId;
    return this.driversService.updateOrderStatus(
      orderId,
      OrderStatus.ENTREGUE,
      userId,
    );
  }

  @Post('orders/:id/proof')
  @Roles('driver')
  @UseInterceptors(FileInterceptor('file'))
  uploadProof(
    @Param('id') orderId: string,
    @UploadedFile() file: any,
    @Req() req: Request,
  ) {
    const userId = (req.user as any).userId;
    return this.driversService.saveProof(orderId, file, userId);
  }

  @Get('payments')
  @Roles('driver')
  getPayments(@Req() req: Request) {
    const userId = (req.user as any).userId;
    return this.driversService.findPaymentsByAuthUser(userId);
  }
}
