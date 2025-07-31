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
} from '@nestjs/common';
import { VehiclesService } from './vehicles.service';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';

@Controller('vehicles')
@UseGuards(JwtAuthGuard, RolesGuard)
export class VehiclesController {
  constructor(private readonly vehiclesService: VehiclesService) {}

  @Post()
  async create(@Body() createVehicleDto: CreateVehicleDto, @Req() req) {
    const userId = req.user.userId;
    return this.vehiclesService.create(createVehicleDto, userId);
  }

  @Get()
  async findAll(@Req() req) {
    const userId = req.user.userId;
    return this.vehiclesService.findAllByUserId(userId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Req() req) {
    const userId = req.user.userId;
    return this.vehiclesService.findOneByIdAndUserId(id, userId);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateVehicleDto: UpdateVehicleDto,
    @Req() req,
  ) {
    const userId = req.user.userId;
    return this.vehiclesService.update(id, updateVehicleDto, userId);
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @Req() req) {
    const userId = req.user.userId;
    return this.vehiclesService.remove(id, userId);
  }
}
