import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { EmailService } from '../shared/services/email.service';
import { ContactDto } from './dto/contact.dto';

@Injectable()
export class LandingService {
  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
    private emailService: EmailService,
  ) {}

  async createLead(contactData: ContactDto) {
    const lead = await this.prisma.lead.create({
      data: {
        companyName: contactData.companyName,
        contactName: contactData.contactName,
        email: contactData.email,
        phone: contactData.phone,
        fleetSize: contactData.fleetSize,
        message: contactData.message,
        source: contactData.source || 'landing-page',
        status: 'NEW',
      },
    });

    return lead;
  }

  async notifyNewLead(lead: any) {
    await this.emailService.sendNewLeadEmail({
      companyName: lead.companyName,
      contactName: lead.contactName,
      email: lead.email,
      phone: lead.phone,
      fleetSize: lead.fleetSize,
      message: lead.message,
    });
  }

  async getPlans() {
    return [
      {
        id: 'basic',
        name: 'Básico',
        price: 199,
        description: 'Ideal para pequenas frotas',
        features: [
          'Até 5 veículos',
          'Roteirização básica',
          'Rastreamento em tempo real',
          'Gestão de pedidos',
          'Suporte por e-mail',
        ],
        maxVehicles: 5,
        popular: false,
      },
      {
        id: 'pro',
        name: 'Pro',
        price: 499,
        description: 'Ideal para empresas em crescimento',
        features: [
          'Até 20 veículos',
          'Roteirização avançada',
          'Otimização com cálculo de frete',
          'Notificações personalizadas',
          'Relatórios detalhados',
          'Suporte prioritário',
          'Integração via API',
        ],
        maxVehicles: 20,
        popular: true,
      },
      {
        id: 'enterprise',
        name: 'Enterprise',
        price: null,
        description: 'Solução completa para grandes operações',
        features: [
          'Veículos ilimitados',
          'Roteirização com regras complexas',
          'Multi-tenancy completa',
          'Suporte 24/7',
          'Gerente de contas dedicado',
          'Treinamento personalizado',
          'Integrações customizadas',
        ],
        maxVehicles: null,
        popular: false,
      },
    ];
  }

  async getStats() {
    const totalLeads = await this.prisma.lead.count();
    const newLeads = await this.prisma.lead.count({
      where: { status: 'NEW' },
    });
    const convertedLeads = await this.prisma.lead.count({
      where: { status: 'CONVERTED' },
    });

    return {
      totalLeads,
      newLeads,
      convertedLeads,
      conversionRate: totalLeads > 0 ? (convertedLeads / totalLeads) * 100 : 0,
    };
  }
}
