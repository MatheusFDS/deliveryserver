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

@Controller('drivers')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DriversController {
  constructor(private readonly driversService: DriversService) {}

  @Post()
  create(@Body() createDriverDto: CreateDriverDto, @Req() req: Request) {
    const userId = (req.user as any).userId;
    return this.driversService.create(createDriverDto, userId);
  }

  @Get()
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
  findAllByTenant(@Req() req: Request) {
    const userId = (req.user as any).userId;
    return this.driversService.findAllByTenant(userId);
  }

  @Get('available-users')
  getAvailableUsers(@Req() req: Request) {
    const userId = (req.user as any).userId;
    return this.driversService.getAvailableUsersByUserId(userId);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateDriverDto: UpdateDriverDto,
    @Req() req: Request,
  ) {
    const userId = (req.user as any).userId;
    return this.driversService.update(id, updateDriverDto, userId);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Req() req: Request) {
    const userId = (req.user as any).userId;
    return this.driversService.remove(id, userId);
  }

  @Get('orders')
  findOrdersByDriver(@Req() req: Request) {
    const userId = (req.user as any).userId;
    return this.driversService.findOrdersByAuthUser(userId);
  }

  @Patch('orders/:id/start')
  startOrder(@Param('id') orderId: string, @Req() req: Request) {
    const userId = (req.user as any).userId;
    return this.driversService.updateOrderStatus(
      orderId,
      'in_progress',
      userId,
    );
  }

  @Patch('orders/:id/complete')
  completeOrder(@Param('id') orderId: string, @Req() req: Request) {
    const userId = (req.user as any).userId;
    return this.driversService.updateOrderStatus(orderId, 'completed', userId);
  }

  @Post('orders/:id/proof')
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
  getPayments(@Req() req: Request) {
    const userId = (req.user as any).userId;
    return this.driversService.findPaymentsByAuthUser(userId);
  }
}
