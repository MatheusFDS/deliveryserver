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
import { DirectionsService } from './directions.service';
import { CreateDirectionsDto } from './dto/create-directions.dto';
import { UpdateDirectionsDto } from './dto/update-directions.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';

@Controller('directions')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DirectionsController {
  constructor(private readonly directionsService: DirectionsService) {}

  @Post()
  async create(@Body() createDirectionsDto: CreateDirectionsDto, @Req() req) {
    const userId = req.user.userId;
    // O tenantId NÃO deve vir do createDirectionsDto diretamente do cliente por questões de segurança.
    return this.directionsService.create(createDirectionsDto, userId);
  }

  @Get()
  async findAll(@Req() req) {
    const userId = req.user.userId;
    return this.directionsService.findAllByUserId(userId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Req() req) {
    const userId = req.user.userId;
    return this.directionsService.findOneByIdAndUserId(id, userId);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateDirectionsDto: UpdateDirectionsDto,
    @Req() req,
  ) {
    const userId = req.user.userId;
    return this.directionsService.update(id, updateDirectionsDto, userId);
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @Req() req) {
    const userId = req.user.userId;
    return this.directionsService.remove(id, userId);
  }
}
