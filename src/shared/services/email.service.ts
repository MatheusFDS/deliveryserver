// Service de envio de e-mails (SendGrid)
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as sgMail from '@sendgrid/mail';

interface SendInviteEmailParams {
  email: string;
  inviterName: string;
  roleName: string;
  tenantName?: string;
  inviteToken: string;
  expiresAt: Date;
}

interface SendStatusEmailParams {
  email: string;
  templateId: string;
  data: any;
}

@Injectable()
export class EmailService {
  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('SENDGRID_API_KEY');
    if (apiKey) {
      sgMail.setApiKey(apiKey);
    }
  }

  async sendInviteEmail(params: SendInviteEmailParams): Promise<void> {
    const { email, inviterName, roleName, tenantName, inviteToken, expiresAt } =
      params;

    const frontendUrl = this.configService.get<string>('FRONTEND_URL');
    const acceptUrl = `${frontendUrl}/convite/${inviteToken}`;

    const subject = tenantName
      ? `Convite para ${tenantName} - Sistema de Gestão`
      : 'Convite para Sistema de Gestão - Plataforma';

    const html = this.generateInviteEmailTemplate({
      inviterName,
      roleName,
      tenantName,
      acceptUrl,
      expiresAt,
      isPlatformRole: !tenantName,
    });

    const msg = {
      to: email,
      from:
        this.configService.get<string>('SENDGRID_FROM_EMAIL') ||
        'noreply@sistema.com',
      subject,
      html,
    };

    try {
      await sgMail.send(msg);
    } catch (error) {
      throw new Error(`Erro ao enviar email de convite: ${error.message}`);
    }
  }

  async sendStatusEmail(params: SendStatusEmailParams): Promise<void> {
    const { email, templateId, data } = params;

    let subject = '';
    let html = '';

    switch (templateId) {
      case 'order-status-changed':
        subject = this.getOrderStatusSubject(data.newStatus, data.orderNumber);
        html = this.generateOrderStatusTemplate(data);
        break;

      case 'delivery-completed':
        subject = `Roteiro ${data.deliveryId?.slice(0, 8)}... finalizado`;
        html = this.generateDeliveryCompletedTemplate(data);
        break;

      case 'delivery-approved-for-driver':
        subject = `Roteiro aprovado para entrega`;
        html = this.generateDeliveryApprovedTemplate(data);
        break;

      case 'delivery-rejected':
        subject = `Roteiro rejeitado`;
        html = this.generateDeliveryRejectedTemplate(data);
        break;

      default:
        subject = 'Notificação do Sistema';
        html = this.generateGenericTemplate(data);
    }

    const msg = {
      to: email,
      from:
        this.configService.get<string>('SENDGRID_FROM_EMAIL') ||
        'noreply@sistema.com',
      subject,
      html,
    };

    try {
      await sgMail.send(msg);
    } catch (error) {
      throw new Error(`Erro ao enviar email de status: ${error.message}`);
    }
  }

  private getOrderStatusSubject(
    newStatus: string,
    orderNumber: string,
  ): string {
    switch (newStatus) {
      case 'EM_ENTREGA':
        return `Pedido ${orderNumber} - Entrega iniciada`;
      case 'ENTREGUE':
        return `Pedido ${orderNumber} - Entregue com sucesso`;
      case 'NAO_ENTREGUE':
        return `Pedido ${orderNumber} - Tentativa de entrega`;
      case 'EM_ROTA':
        return `Pedido ${orderNumber} - Saiu para entrega`;
      default:
        return `Pedido ${orderNumber} - Status atualizado`;
    }
  }

  private generateInviteEmailTemplate(params: {
    inviterName: string;
    roleName: string;
    tenantName?: string;
    acceptUrl: string;
    expiresAt: Date;
    isPlatformRole: boolean;
  }): string {
    const { inviterName, roleName, tenantName, acceptUrl, expiresAt } = params;

    const expirationDate = new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(expiresAt);

    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Convite para Sistema de Gestão</title>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .button { display: inline-block; background: #667eea; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; font-weight: bold; }
            .button:hover { background: #5a67d8; }
            .info-box { background: white; border-left: 4px solid #667eea; padding: 15px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
            .warning { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🎉 Você foi convidado!</h1>
                <p>Sistema de Gestão de Entregas</p>
            </div>
            
            <div class="content">
                <h2>Olá!</h2>
                
                <p><strong>${inviterName}</strong> convidou você para fazer parte do sistema de gestão${tenantName ? ` da empresa <strong>${tenantName}</strong>` : ' da <strong>plataforma</strong>'}.</p>
                
                <div class="info-box">
                    <h3>📋 Detalhes do convite:</h3>
                    <p><strong>Perfil:</strong> ${roleName}</p>
                    ${tenantName ? `<p><strong>Empresa:</strong> ${tenantName}</p>` : '<p><strong>Tipo:</strong> Acesso à plataforma administrativa</p>'}
                    <p><strong>Convidado por:</strong> ${inviterName}</p>
                </div>
                
                <p>Para aceitar o convite e criar sua conta, clique no botão abaixo:</p>
                
                <div style="text-align: center;">
                    <a href="${acceptUrl}" class="button">✨ Aceitar Convite</a>
                </div>
                
                <div class="warning">
                    <strong>⚠️ Importante:</strong> Este convite expira em <strong>${expirationDate}</strong>. 
                    Certifique-se de aceitar antes desta data.
                </div>
                
                <p><strong>O que acontece depois?</strong></p>
                <ol>
                    <li>Clique no botão "Aceitar Convite"</li>
                    <li>Você será redirecionado para criar sua conta</li>
                    <li>Use sua conta Google ou email para fazer login</li>
                    <li>Comece a usar o sistema imediatamente!</li>
                </ol>
                
                <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
                
                <p><strong>Problemas para aceitar?</strong></p>
                <p>Se o botão não funcionar, copie e cole este link no seu navegador:</p>
                <p style="background: #f1f1f1; padding: 10px; border-radius: 5px; word-break: break-all; font-family: monospace;">
                    ${acceptUrl}
                </p>
            </div>
            
            <div class="footer">
                <p>Este é um email automático. Não responda a esta mensagem.</p>
                <p>© 2024 Sistema de Gestão de Entregas. Todos os direitos reservados.</p>
            </div>
        </div>
    </body>
    </html>
    `;
  }

  private generateOrderStatusTemplate(data: any): string {
    const { newStatus, oldStatus, orderNumber, customerName, driverName } =
      data;
    const customer = customerName || 'Cliente';

    let statusMessage = '';
    let statusColor = '#667eea';

    switch (newStatus) {
      case 'EM_ENTREGA':
        statusMessage = 'Entrega iniciada';
        statusColor = '#ff9500';
        break;
      case 'ENTREGUE':
        statusMessage = 'Entregue com sucesso';
        statusColor = '#28a745';
        break;
      case 'NAO_ENTREGUE':
        statusMessage = 'Não foi possível entregar';
        statusColor = '#dc3545';
        break;
      case 'EM_ROTA':
        statusMessage = 'Saiu para entrega';
        statusColor = '#007bff';
        break;
      default:
        statusMessage = `Status atualizado para ${newStatus}`;
    }

    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Atualização do Pedido ${orderNumber}</title>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 20px; }
            .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
            .header { background: ${statusColor}; color: white; padding: 30px; text-align: center; }
            .content { padding: 30px; }
            .status-badge { background: ${statusColor}; color: white; padding: 8px 16px; border-radius: 20px; display: inline-block; font-weight: bold; }
            .info-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #eee; }
            .footer { background: #f8f9fa; padding: 20px; text-align: center; color: #666; font-size: 12px; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>📦 Atualização do Pedido</h1>
                <p>Pedido ${orderNumber}</p>
            </div>
            
            <div class="content">
                <h2>Status atualizado!</h2>
                <p>O pedido <strong>${orderNumber}</strong> teve seu status atualizado.</p>
                
                <div style="text-align: center; margin: 20px 0;">
                    <span class="status-badge">${statusMessage}</span>
                </div>
                
                <h3>📋 Detalhes:</h3>
                <div class="info-row">
                    <span><strong>Cliente:</strong></span>
                    <span>${customer}</span>
                </div>
                <div class="info-row">
                    <span><strong>Motorista:</strong></span>
                    <span>${driverName || 'Não informado'}</span>
                </div>
                <div class="info-row">
                    <span><strong>Status anterior:</strong></span>
                    <span>${oldStatus}</span>
                </div>
                <div class="info-row">
                    <span><strong>Novo status:</strong></span>
                    <span>${newStatus}</span>
                </div>
                <div class="info-row">
                    <span><strong>Data/Hora:</strong></span>
                    <span>${new Date().toLocaleString('pt-BR')}</span>
                </div>
            </div>
            
            <div class="footer">
                <p>Este é um email automático do Sistema de Gestão de Entregas.</p>
                <p>© 2024 Sistema de Gestão. Todos os direitos reservados.</p>
            </div>
        </div>
    </body>
    </html>
    `;
  }

  private generateDeliveryCompletedTemplate(data: any): string {
    const { deliveryId, driverName } = data;
    const shortId = deliveryId?.slice(0, 8) || 'N/A';

    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Roteiro Finalizado</title>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 20px; }
            .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
            .header { background: #28a745; color: white; padding: 30px; text-align: center; }
            .content { padding: 30px; }
            .footer { background: #f8f9fa; padding: 20px; text-align: center; color: #666; font-size: 12px; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>✅ Roteiro Finalizado</h1>
                <p>ID: ${shortId}...</p>
            </div>
            
            <div class="content">
                <h2>Roteiro concluído com sucesso!</h2>
                <p>O roteiro <strong>${shortId}...</strong> foi finalizado pelo motorista <strong>${driverName}</strong>.</p>
                
                <p>Todas as entregas deste roteiro foram processadas.</p>
                
                <p><strong>Data/Hora:</strong> ${new Date().toLocaleString('pt-BR')}</p>
            </div>
            
            <div class="footer">
                <p>Sistema de Gestão de Entregas - Notificação Automática</p>
            </div>
        </div>
    </body>
    </html>
    `;
  }

  private generateDeliveryApprovedTemplate(data: any): string {
    const { deliveryId, driverName } = data;
    const shortId = deliveryId?.slice(0, 8) || 'N/A';

    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Roteiro Aprovado</title>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 20px; }
            .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
            .header { background: #007bff; color: white; padding: 30px; text-align: center; }
            .content { padding: 30px; }
            .footer { background: #f8f9fa; padding: 20px; text-align: center; color: #666; font-size: 12px; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🚚 Roteiro Aprovado</h1>
                <p>ID: ${shortId}...</p>
            </div>
            
            <div class="content">
                <h2>Olá, ${driverName}!</h2>
                <p>Seu roteiro <strong>${shortId}...</strong> foi aprovado e liberado para entrega.</p>
                
                <p>Você já pode iniciar as entregas deste roteiro.</p>
                
                <p><strong>Data/Hora:</strong> ${new Date().toLocaleString('pt-BR')}</p>
            </div>
            
            <div class="footer">
                <p>Sistema de Gestão de Entregas - Notificação Automática</p>
            </div>
        </div>
    </body>
    </html>
    `;
  }

  private generateDeliveryRejectedTemplate(data: any): string {
    const { deliveryId, reason, driverName } = data;
    const shortId = deliveryId?.slice(0, 8) || 'N/A';

    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Roteiro Rejeitado</title>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 20px; }
            .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
            .header { background: #dc3545; color: white; padding: 30px; text-align: center; }
            .content { padding: 30px; }
            .reason-box { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0; }
            .footer { background: #f8f9fa; padding: 20px; text-align: center; color: #666; font-size: 12px; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>❌ Roteiro Rejeitado</h1>
                <p>ID: ${shortId}...</p>
            </div>
            
            <div class="content">
                <h2>Olá, ${driverName}!</h2>
                <p>Infelizmente, seu roteiro <strong>${shortId}...</strong> foi rejeitado.</p>
                
                ${
                  reason
                    ? `
                <div class="reason-box">
                    <h3>📝 Motivo da rejeição:</h3>
                    <p>${reason}</p>
                </div>
                `
                    : ''
                }
                
                <p>Entre em contato com a administração para mais informações.</p>
                
                <p><strong>Data/Hora:</strong> ${new Date().toLocaleString('pt-BR')}</p>
            </div>
            
            <div class="footer">
                <p>Sistema de Gestão de Entregas - Notificação Automática</p>
            </div>
        </div>
    </body>
    </html>
    `;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private generateGenericTemplate(data: any): string {
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Notificação do Sistema</title>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 20px; }
            .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
            .header { background: #667eea; color: white; padding: 30px; text-align: center; }
            .content { padding: 30px; }
            .footer { background: #f8f9fa; padding: 20px; text-align: center; color: #666; font-size: 12px; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>📢 Notificação</h1>
            </div>
            
            <div class="content">
                <h2>Você tem uma nova notificação</h2>
                <p>Acesse o sistema para ver mais detalhes.</p>
                
                <p><strong>Data/Hora:</strong> ${new Date().toLocaleString('pt-BR')}</p>
            </div>
            
            <div class="footer">
                <p>Sistema de Gestão de Entregas - Notificação Automática</p>
            </div>
        </div>
    </body>
    </html>
    `;
  }
}
