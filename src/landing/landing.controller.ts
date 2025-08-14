import {
  Controller,
  Post,
  Body,
  Get,
  HttpStatus,
  HttpException,
} from '@nestjs/common';
import { LandingService } from './landing.service';
import { ContactDto } from './dto/contact.dto';

@Controller('api/landing')
export class LandingController {
  constructor(private readonly landingService: LandingService) {}

  @Post('contact')
  async submitContact(@Body() contactData: ContactDto) {
    try {
      const lead = await this.landingService.createLead(contactData);

      // Enviar notificação para equipe comercial
      await this.landingService.notifyNewLead(lead);

      return {
        success: true,
        message: 'Obrigado pelo interesse! Entraremos em contato em breve.',
        leadId: lead.id,
      };
    } catch (error) {
      throw new HttpException(
        'Erro ao processar solicitação. Tente novamente.',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('plans')
  async getPlans() {
    return this.landingService.getPlans();
  }

  @Get('stats')
  async getStats() {
    return this.landingService.getStats();
  }
}
