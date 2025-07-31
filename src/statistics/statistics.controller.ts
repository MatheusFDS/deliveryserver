import {
  Controller,
  Get,
  Query,
  UseGuards,
  Request,
  BadRequestException,
} from '@nestjs/common';
import { StatisticsService } from './statistics.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('statistics')
@UseGuards(JwtAuthGuard)
export class StatisticsController {
  constructor(private readonly statisticsService: StatisticsService) {}

  @Get()
  async getStatistics(
    @Request() req,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('driverId') driverId: string = '',
  ) {
    const userId = req.user.userId; // Obtém userId do token

    if (!startDate || !endDate) {
      throw new BadRequestException('Start date and end date must be provided');
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new BadRequestException('Invalid date format');
    }

    return this.statisticsService.getStatistics(
      userId, // Passa userId em vez de tenantId
      start,
      end,
      driverId,
    );
  }
}
