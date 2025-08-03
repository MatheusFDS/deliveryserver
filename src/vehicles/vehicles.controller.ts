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
  Query, // Import Query
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
  async findAll(
    @Req() req,
    @Query('search') search?: string, // Add search query parameter
    @Query('page') page: number = 1, // Add page query parameter with default
    @Query('pageSize') pageSize: number = 10, // Add pageSize query parameter with default
  ) {
    const userId = req.user.userId;
    return this.vehiclesService.findAllByUserId(
      userId,
      search,
      +page,
      +pageSize,
    ); // Pass parameters to service
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
