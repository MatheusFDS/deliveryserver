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

interface SendPasswordResetEmailParams {
  email: string;
  name: string;
  resetLink: string;
}

interface SendNewLeadEmailParams {
  companyName: string;
  contactName: string;
  email: string;
  phone: string;
  fleetSize: number;
  message: string;
}

@Injectable()
export class EmailService {
  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('SENDGRID_API_KEY');
    if (apiKey) {
      sgMail.setApiKey(apiKey);
    }
  }

  async sendNewLeadEmail(params: SendNewLeadEmailParams): Promise<void> {
    const toEmail = this.configService.get<string>('COMMERCIAL_TEAM_EMAIL');
    if (!toEmail) {
      console.error(
        'E-mail da equipe comercial (COMMERCIAL_TEAM_EMAIL) não configurado.',
      );
      return;
    }

    const subject = `Novo Lead Recebido: ${params.companyName}`;
    const html = this.generateNewLeadTemplate(params);

    const msg = {
      to: toEmail,
      from:
        this.configService.get<string>('SENDGRID_FROM_EMAIL') ||
        'noreply@sistema.com',
      subject,
      html,
    };

    try {
      await sgMail.send(msg);
    } catch (error) {
      console.error(
        `Erro ao enviar email de notificação de lead: ${(error as Error).message}`,
      );
    }
  }

  async sendPasswordResetEmail(
    params: SendPasswordResetEmailParams,
  ): Promise<void> {
    const { email, name, resetLink } = params;

    const subject = 'Redefinição de Senha - Sistema de Gestão';
    const html = this.generatePasswordResetTemplate({ name, resetLink });

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
      console.error(
        `Erro ao enviar email de redefinição de senha: ${(error as Error).message}`,
      );
    }
  }

  async sendInviteEmail(params: SendInviteEmailParams): Promise<void> {
    const { email, inviterName, roleName, tenantName, inviteToken, expiresAt } =
      params;

    const frontendUrl = this.configService.get<string>('FRONTEND_URL');
    const acceptUrl = `${frontendUrl}/aceitar/${inviteToken}`;

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
      throw new Error(
        `Erro ao enviar email de convite: ${(error as Error).message}`,
      );
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
      throw new Error(
        `Erro ao enviar email de status: ${(error as Error).message}`,
      );
    }
  }

  private generateNewLeadTemplate(params: SendNewLeadEmailParams): string {
    const { companyName, contactName, email, phone, fleetSize, message } =
      params;
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Novo Lead Recebido</title>
        <style>
            body { font-family: "Inter", "Roboto", "Helvetica", "Arial", sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f4; }
            .container { max-width: 600px; margin: 20px auto; padding: 20px; background-color: #ffffff; border-radius: 8px; box-shadow: 0 4px 8px rgba(0,0,0,0.1); }
            .header { background: #005a4d; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .header h1 { margin: 0; font-size: 24px; }
            .content { padding: 30px 20px; }
            .content h2 { color: #005a4d; font-size: 20px; border-bottom: 2px solid #eeeeee; padding-bottom: 10px; margin-bottom: 20px; }
            .lead-info p { font-size: 16px; margin: 10px 0; color: #555; }
            .lead-info strong { color: #333; }
            .message-box { background: #f9f9f9; border-left: 4px solid #005a4d; padding: 15px; margin-top: 20px; border-radius: 4px; }
            .message-box p { margin: 0; white-space: pre-wrap; }
            .footer { text-align: center; margin-top: 20px; color: #888; font-size: 12px; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🌟 Novo Lead da Landing Page!</h1>
            </div>
            <div class="content">
                <h2>Detalhes do Contato</h2>
                <div class="lead-info">
                    <p><strong>Empresa:</strong> ${companyName}</p>
                    <p><strong>Nome do Contato:</strong> ${contactName}</p>
                    <p><strong>Email:</strong> <a href="mailto:${email}">${email}</a></p>
                    <p><strong>Telefone:</strong> ${phone}</p>
                    <p><strong>Tamanho da Frota:</strong> ${fleetSize} veículos</p>
                </div>
                <h2>Mensagem</h2>
                <div class="message-box">
                    <p>${message}</p>
                </div>
            </div>
            <div class="footer">
                <p>Este e-mail foi enviado automaticamente pelo sistema.</p>
            </div>
        </div>
    </body>
    </html>
    `;
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

  private generatePasswordResetTemplate(params: {
    name: string;
    resetLink: string;
  }): string {
    const { name, resetLink } = params;
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Redefinição de Senha</title>
        <style>
            body { 
                font-family: "Inter", "Roboto", "Helvetica", "Arial", sans-serif; 
                line-height: 1.6; 
                color: #2e3440; 
                margin: 0; 
                padding: 0;
                background-color: #f7f8fa;
            }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { 
                background: linear-gradient(135deg, #00695c 0%, #004c40 100%); 
                color: white; 
                padding: 40px 30px; 
                text-align: center; 
                border-radius: 12px 12px 0 0;
            }
            .header h1 { margin: 0 0 10px 0; font-size: 2rem; font-weight: 600; }
            .content { background: #ffffff; padding: 40px 30px; border-radius: 0 0 12px 12px; }
            .content h2 { color: #2e3440; font-size: 1.5rem; margin: 0 0 20px 0; }
            .content p { font-size: 0.875rem; line-height: 1.6; margin: 0 0 15px 0; }
            .button { 
                display: inline-block; 
                background: #00695c; 
                color: white !important; 
                padding: 16px 32px; 
                text-decoration: none; 
                border-radius: 8px; 
                margin: 25px 0; 
                font-weight: 500;
                font-size: 0.875rem;
            }
            .warning { 
                background: rgba(237, 108, 2, 0.1); 
                border-left: 4px solid #ed6c02;
                color: #e65100;
                padding: 20px; 
                border-radius: 0 8px 8px 0; 
                margin: 25px 0; 
            }
            .footer { text-align: center; margin-top: 30px; color: #5e6b73; font-size: 0.75rem; }
            .link-box {
                background: #f1f3f4; 
                padding: 15px; 
                border-radius: 8px; 
                word-break: break-all; 
                font-family: "Roboto Mono", monospace;
                font-size: 0.75rem;
                color: #5e6b73;
                margin-top: 15px;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🔑 Redefinição de Senha</h1>
            </div>
            <div class="content">
                <h2>Olá, ${name}!</h2>
                <p>Recebemos uma solicitação para redefinir a senha da sua conta. Se você não fez essa solicitação, pode ignorar este e-mail com segurança.</p>
                <p>Para criar uma nova senha, clique no botão abaixo:</p>
                <div style="text-align: center;">
                    <a href="${resetLink}" class="button">Redefinir Minha Senha</a>
                </div>
                <div class="warning">
                    <strong>Atenção:</strong> Por segurança, este link é válido por um tempo limitado.
                </div>
                <hr style="margin: 30px 0; border: none; border-top: 1px solid #e0e4e7;">
                <p>Se o botão não funcionar, copie e cole o seguinte link no seu navegador:</p>
                <div class="link-box">${resetLink}</div>
            </div>
            <div class="footer">
                <p>Este é um email automático. Não responda a esta mensagem.</p>
                <p>© 2025 Sistema de Gestão de Entregas. Todos os direitos reservados.</p>
            </div>
        </div>
    </body>
    </html>
    `;
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
            body { 
                font-family: "Inter", "Roboto", "Helvetica", "Arial", sans-serif; 
                line-height: 1.6; 
                color: #2e3440; 
                margin: 0; 
                padding: 0;
                background-color: #f7f8fa;
            }
            .container { 
                max-width: 600px; 
                margin: 0 auto; 
                padding: 20px; 
            }
            .header { 
                background: linear-gradient(135deg, #00695c 0%, #004c40 100%); 
                color: white; 
                padding: 40px 30px; 
                text-align: center; 
                border-radius: 12px 12px 0 0; 
                box-shadow: 0px 4px 8px rgba(0, 105, 92, 0.2);
            }
            .header h1 {
                margin: 0 0 10px 0;
                font-size: 2rem;
                font-weight: 600;
            }
            .header p {
                margin: 0;
                font-size: 1.1rem;
                opacity: 0.9;
            }
            .content { 
                background: #ffffff; 
                padding: 40px 30px; 
                border-radius: 0 0 12px 12px;
                box-shadow: 0px 1px 3px rgba(0, 0, 0, 0.08), 0px 2px 2px rgba(0, 0, 0, 0.12);
            }
            .content h2 {
                color: #2e3440;
                font-size: 1.5rem;
                font-weight: 500;
                margin: 0 0 20px 0;
            }
            .content p {
                color: #2e3440;
                font-size: 0.875rem;
                line-height: 1.6;
                margin: 0 0 15px 0;
            }
            .button { 
                display: inline-block; 
                background: #00695c; 
                color: white; 
                padding: 16px 32px; 
                text-decoration: none; 
                border-radius: 8px; 
                margin: 25px 0; 
                font-weight: 500;
                font-size: 0.875rem;
                box-shadow: 0px 2px 4px rgba(0, 105, 92, 0.3);
                transition: all 0.2s ease;
            }
            .button:hover { 
                background: #004c40; 
                box-shadow: 0px 4px 8px rgba(0, 105, 92, 0.4);
            }
            .info-box { 
                background: #f7f8fa; 
                border-left: 4px solid #00695c; 
                padding: 20px; 
                margin: 25px 0; 
                border-radius: 0 8px 8px 0;
            }
            .info-box h3 {
                color: #2e3440;
                font-size: 1rem;
                font-weight: 500;
                margin: 0 0 15px 0;
            }
            .info-box p {
                margin: 8px 0;
            }
            .warning { 
                background: rgba(237, 108, 2, 0.1); 
                border: 1px solid rgba(237, 108, 2, 0.2); 
                color: #e65100;
                padding: 20px; 
                border-radius: 8px; 
                margin: 25px 0; 
            }
            .warning strong {
                color: #ed6c02;
            }
            .footer { 
                text-align: center; 
                margin-top: 30px; 
                color: #5e6b73; 
                font-size: 0.75rem; 
                line-height: 1.4;
            }
            .link-box {
                background: #f1f3f4; 
                padding: 15px; 
                border-radius: 8px; 
                word-break: break-all; 
                font-family: "Roboto Mono", monospace;
                font-size: 0.75rem;
                color: #5e6b73;
                margin: 15px 0;
            }
            .steps-list {
                background: #f7f8fa;
                padding: 20px;
                border-radius: 8px;
                margin: 20px 0;
            }
            .steps-list ol {
                margin: 0;
                padding-left: 20px;
            }
            .steps-list li {
                margin: 8px 0;
                color: #2e3440;
            }
            hr {
                margin: 30px 0; 
                border: none; 
                border-top: 1px solid #e0e4e7;
            }
            .highlight {
                color: #00695c;
                font-weight: 500;
            }
            .company-tag {
                background: rgba(0, 105, 92, 0.1);
                color: #00695c;
                padding: 4px 8px;
                border-radius: 4px;
                font-size: 0.75rem;
                font-weight: 500;
            }
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
                
                <p><strong class="highlight">${inviterName}</strong> convidou você para fazer parte do sistema de gestão${tenantName ? ` da empresa <span class="company-tag">${tenantName}</span>` : ' da <strong class="highlight">plataforma</strong>'}.</p>
                
                <div class="info-box">
                    <h3>📋 Detalhes do convite:</h3>
                    <p><strong>Perfil:</strong> <span class="highlight">${roleName}</span></p>
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
                
                <h3 style="color: #2e3440; font-size: 1rem; margin: 25px 0 15px 0;">O que acontece depois?</h3>
                <div class="steps-list">
                    <ol>
                        <li>Clique no botão "Aceitar Convite"</li>
                        <li>Você será redirecionado para criar sua conta</li>
                        <li>Use sua conta Google ou email para fazer login</li>
                        <li>Comece a usar o sistema imediatamente!</li>
                    </ol>
                </div>
                
                <hr>
                
                <h3 style="color: #2e3440; font-size: 1rem; margin: 20px 0 10px 0;">Problemas para aceitar?</h3>
                <p>Se o botão não funcionar, copie e cole este link no seu navegador:</p>
                <div class="link-box">${acceptUrl}</div>
            </div>
            
            <div class="footer">
                <p>Este é um email automático. Não responda a esta mensagem.</p>
                <p>© 2025 Sistema de Gestão de Entregas. Todos os direitos reservados.</p>
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
    let statusColor = '#00695c';

    switch (newStatus) {
      case 'EM_ENTREGA':
        statusMessage = 'Entrega iniciada';
        statusColor = '#ff6f00';
        break;
      case 'ENTREGUE':
        statusMessage = 'Entregue com sucesso';
        statusColor = '#2e7d32';
        break;
      case 'NAO_ENTREGUE':
        statusMessage = 'Não foi possível entregar';
        statusColor = '#d32f2f';
        break;
      case 'EM_ROTA':
        statusMessage = 'Saiu para entrega';
        statusColor = '#0288d1';
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
            body { 
                font-family: "Inter", "Roboto", "Helvetica", "Arial", sans-serif; 
                line-height: 1.6; 
                color: #2e3440; 
                margin: 0; 
                padding: 20px;
                background-color: #f7f8fa;
            }
            .container { 
                max-width: 600px; 
                margin: 0 auto; 
                background: white; 
                border-radius: 12px; 
                overflow: hidden; 
                box-shadow: 0px 1px 3px rgba(0, 0, 0, 0.08), 0px 2px 2px rgba(0, 0, 0, 0.12);
            }
            .header { 
                background: ${statusColor}; 
                color: white; 
                padding: 40px 30px; 
                text-align: center; 
            }
            .header h1 {
                margin: 0 0 10px 0;
                font-size: 1.75rem;
                font-weight: 500;
            }
            .header p {
                margin: 0;
                font-size: 1.1rem;
                opacity: 0.9;
            }
            .content { 
                padding: 40px 30px; 
            }
            .content h2 {
                color: #2e3440;
                font-size: 1.5rem;
                font-weight: 500;
                margin: 0 0 15px 0;
            }
            .content p {
                color: #2e3440;
                font-size: 0.875rem;
                margin: 0 0 15px 0;
            }
            .content h3 {
                color: #2e3440;
                font-size: 1rem;
                font-weight: 500;
                margin: 25px 0 15px 0;
            }
            .status-badge { 
                background: ${statusColor}; 
                color: white; 
                padding: 12px 20px; 
                border-radius: 20px; 
                display: inline-block; 
                font-weight: 500;
                font-size: 0.875rem;
                box-shadow: 0px 2px 4px rgba(0, 0, 0, 0.15);
            }
            .info-row { 
                display: flex; 
                justify-content: space-between; 
                padding: 12px 0; 
                border-bottom: 1px solid #e0e4e7;
                font-size: 0.875rem;
            }
            .info-row:last-child {
                border-bottom: none;
            }
            .info-row span:first-child {
                color: #5e6b73;
            }
            .info-row span:last-child {
                color: #2e3440;
                font-weight: 500;
            }
            .footer { 
                background: #f7f8fa; 
                padding: 30px; 
                text-align: center; 
                color: #5e6b73; 
                font-size: 0.75rem;
                line-height: 1.4;
            }
            .highlight {
                color: ${statusColor};
                font-weight: 500;
            }
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
                <p>O pedido <span class="highlight">${orderNumber}</span> teve seu status atualizado.</p>
                
                <div style="text-align: center; margin: 30px 0;">
                    <span class="status-badge">${statusMessage}</span>
                </div>
                
                <h3>📋 Detalhes:</h3>
                <div style="background: #f7f8fa; padding: 20px; border-radius: 8px; border-left: 4px solid ${statusColor};">
                    <div class="info-row">
                        <span>Cliente:</span>
                        <span>${customer}</span>
                    </div>
                    <div class="info-row">
                        <span>Motorista:</span>
                        <span>${driverName || 'Não informado'}</span>
                    </div>
                    <div class="info-row">
                        <span>Status anterior:</span>
                        <span>${oldStatus}</span>
                    </div>
                    <div class="info-row">
                        <span>Novo status:</span>
                        <span>${newStatus}</span>
                    </div>
                    <div class="info-row">
                        <span>Data/Hora:</span>
                        <span>${new Date().toLocaleString('pt-BR')}</span>
                    </div>
                </div>
            </div>
            
            <div class="footer">
                <p>Este é um email automático do Sistema de Gestão de Entregas.</p>
                <p>© 2025 Sistema de Gestão. Todos os direitos reservados.</p>
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
            body { 
                font-family: "Inter", "Roboto", "Helvetica", "Arial", sans-serif; 
                line-height: 1.6; 
                color: #2e3440; 
                margin: 0; 
                padding: 20px;
                background-color: #f7f8fa;
            }
            .container { 
                max-width: 600px; 
                margin: 0 auto; 
                background: white; 
                border-radius: 12px; 
                overflow: hidden; 
                box-shadow: 0px 1px 3px rgba(0, 0, 0, 0.08), 0px 2px 2px rgba(0, 0, 0, 0.12);
            }
            .header { 
                background: #2e7d32; 
                color: white; 
                padding: 40px 30px; 
                text-align: center; 
            }
            .content { 
                padding: 40px 30px; 
            }
            .footer { 
                background: #f7f8fa; 
                padding: 30px; 
                text-align: center; 
                color: #5e6b73; 
                font-size: 0.75rem;
            }
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
            body { 
                font-family: "Inter", "Roboto", "Helvetica", "Arial", sans-serif; 
                line-height: 1.6; 
                color: #2e3440; 
                margin: 0; 
                padding: 20px;
                background-color: #f7f8fa;
            }
            .container { 
                max-width: 600px; 
                margin: 0 auto; 
                background: white; 
                border-radius: 12px; 
                overflow: hidden; 
                box-shadow: 0px 1px 3px rgba(0, 0, 0, 0.08), 0px 2px 2px rgba(0, 0, 0, 0.12);
            }
            .header { 
                background: #0288d1; 
                color: white; 
                padding: 40px 30px; 
                text-align: center; 
            }
            .content { 
                padding: 40px 30px; 
            }
            .footer { 
                background: #f7f8fa; 
                padding: 30px; 
                text-align: center; 
                color: #5e6b73; 
                font-size: 0.75rem;
            }
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
            body { 
                font-family: "Inter", "Roboto", "Helvetica", "Arial", sans-serif; 
                line-height: 1.6; 
                color: #2e3440; 
                margin: 0; 
                padding: 20px;
                background-color: #f7f8fa;
            }
            .container { 
                max-width: 600px; 
                margin: 0 auto; 
                background: white; 
                border-radius: 12px; 
                overflow: hidden; 
                box-shadow: 0px 1px 3px rgba(0, 0, 0, 0.08), 0px 2px 2px rgba(0, 0, 0, 0.12);
            }
            .header { 
                background: #d32f2f; 
                color: white; 
                padding: 40px 30px; 
                text-align: center; 
            }
            .content { 
                padding: 40px 30px; 
            }
            .reason-box { 
                background: rgba(237, 108, 2, 0.1); 
                border: 1px solid rgba(237, 108, 2, 0.2); 
                color: #e65100;
                padding: 20px; 
                border-radius: 8px; 
                margin: 25px 0; 
            }
            .reason-box h3 {
                color: #ed6c02;
                margin: 0 0 10px 0;
            }
            .footer { 
                background: #f7f8fa; 
                padding: 30px; 
                text-align: center; 
                color: #5e6b73; 
                font-size: 0.75rem;
            }
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
  private generateGenericTemplate(_data: any): string {
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Notificação do Sistema</title>
        <style>
            body { 
                font-family: "Inter", "Roboto", "Helvetica", "Arial", sans-serif; 
                line-height: 1.6; 
                color: #2e3440; 
                margin: 0; 
                padding: 20px;
                background-color: #f7f8fa;
            }
            .container { 
                max-width: 600px; 
                margin: 0 auto; 
                background: white; 
                border-radius: 12px; 
                overflow: hidden; 
                box-shadow: 0px 1px 3px rgba(0, 0, 0, 0.08), 0px 2px 2px rgba(0, 0, 0, 0.12);
            }
            .header { 
                background: linear-gradient(135deg, #00695c 0%, #004c40 100%); 
                color: white; 
                padding: 40px 30px; 
                text-align: center; 
            }
            .header h1 {
                margin: 0 0 10px 0;
                font-size: 1.75rem;
                font-weight: 500;
            }
            .content { 
                padding: 40px 30px; 
            }
            .content h2 {
                color: #2e3440;
                font-size: 1.5rem;
                font-weight: 500;
                margin: 0 0 15px 0;
            }
            .content p {
                color: #2e3440;
                font-size: 0.875rem;
                margin: 0 0 15px 0;
            }
            .footer { 
                background: #f7f8fa; 
                padding: 30px; 
                text-align: center; 
                color: #5e6b73; 
                font-size: 0.75rem;
                line-height: 1.4;
            }
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
                <p>© 2025 Sistema de Gestão. Todos os direitos reservados.</p>
            </div>
        </div>
    </body>
    </html>
    `;
  }
}
