import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createTransport, Transporter } from 'nodemailer';
import { BookingMailDetails, MailPort } from './mail.port';

@Injectable()
export class SmtpMailService extends MailPort {
  private readonly transporter: Transporter;
  private readonly from: string;

  constructor(config: ConfigService) {
    super();
    const user = config.get<string>('SMTP_USER');
    const pass = config.get<string>('SMTP_PASS');
    this.transporter = createTransport({
      host: config.get<string>('SMTP_HOST', 'localhost'),
      port: Number(config.get('SMTP_PORT', 1026)),
      secure: config.get<string>('SMTP_SECURE') === 'true',
      auth: user && pass ? { user, pass } : undefined,
    });
    this.from = config.get<string>('MAIL_FROM', 'SiteBuilder <no-reply@sitebuilder.local>');
  }

  async sendAuthCode(to: string, code: string, expiresInMinutes: number) {
    await this.transporter.sendMail({
      from: this.from,
      to,
      subject: `Seu código de acesso: ${code}`,
      text: `Seu código de acesso é ${code}. Ele expira em ${expiresInMinutes} minutos.`,
    });
  }

  async sendBookingConfirmation(to: string, details: BookingMailDetails) {
    await this.transporter.sendMail({
      from: this.from,
      to,
      subject: `Reserva confirmada: ${details.serviceName}`,
      text: `Olá, ${details.customerName}! Sua reserva de ${details.serviceName} com ${details.tenantName} está confirmada para ${details.when}.`,
    });
  }

  async sendBookingNotification(to: string, details: BookingMailDetails) {
    const notes = details.notes ? `\nObservações: ${details.notes}` : '';
    await this.transporter.sendMail({
      from: this.from,
      to,
      subject: `Nova reserva: ${details.serviceName}`,
      text: `${details.customerName} (${details.customerEmail}) reservou ${details.serviceName} para ${details.when}.${notes}`,
    });
  }

  async sendBookingCancellation(to: string, details: BookingMailDetails) {
    await this.transporter.sendMail({
      from: this.from,
      to,
      subject: `Reserva cancelada: ${details.serviceName}`,
      text: `Olá, ${details.customerName}. Sua reserva de ${details.serviceName} com ${details.tenantName} para ${details.when} foi cancelada.`,
    });
  }
}
