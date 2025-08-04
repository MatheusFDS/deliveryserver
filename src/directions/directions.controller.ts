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
    return this.directionsService.create(createDirectionsDto, userId);
  }

  @Get()
  async findAll(
    @Req() req,
    @Query('search') search?: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number = 1,
    @Query('pageSize', new DefaultValuePipe(10), ParseIntPipe)
    pageSize: number = 10,
  ) {
    const userId = req.user.userId;
    return this.directionsService.findAllByUserId(
      userId,
      search,
      page,
      pageSize,
    );
  }

  @Get('all')
  async findAllByTenant(@Req() req) {
    const userId = req.user.userId;
    return this.directionsService.findAllByTenant(userId);
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
