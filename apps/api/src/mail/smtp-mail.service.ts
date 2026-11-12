import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createTransport, Transporter } from 'nodemailer';
import { BookingLinkItem, BookingMailDetails, MailPort } from './mail.port';

function servicesLine(details: BookingMailDetails) {
  return details.services
    .map((service) => `- ${service.name} (${service.durationMinutes} min)`)
    .join('\n');
}

function summary(details: BookingMailDetails) {
  return [
    `Quando: ${details.when}`,
    `Duração total: ${details.totalMinutes} min`,
    'Serviços:',
    servicesLine(details),
  ].join('\n');
}

function manageBlock(details: BookingMailDetails) {
  if (!details.manageUrl) return '';
  return `\n\nPara ver, cancelar ou adicionar serviços à sua reserva, acesse:\n${details.manageUrl}`;
}

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
    this.from = config.get<string>('MAIL_FROM', 'Moonlight <no-reply@moonlight.local>');
  }

  async sendBookingConfirmation(to: string, details: BookingMailDetails) {
    await this.transporter.sendMail({
      from: this.from,
      to,
      subject: `Reserva confirmada: ${details.serviceName}`,
      text: `Olá, ${details.customerName}! Sua reserva com ${details.tenantName} está confirmada.\n\n${summary(details)}${manageBlock(details)}`,
    });
  }

  async sendBookingNotification(to: string, details: BookingMailDetails) {
    const notes = details.notes ? `\nObservações: ${details.notes}` : '';
    await this.transporter.sendMail({
      from: this.from,
      to,
      subject: `Nova reserva: ${details.serviceName}`,
      text: `${details.customerName} (${details.customerEmail}) fez uma reserva.\n\n${summary(details)}${notes}`,
    });
  }

  async sendBookingCancellation(to: string, details: BookingMailDetails) {
    await this.transporter.sendMail({
      from: this.from,
      to,
      subject: `Reserva cancelada: ${details.serviceName}`,
      text: `Olá, ${details.customerName}. Sua reserva com ${details.tenantName} foi cancelada.\n\n${summary(details)}`,
    });
  }

  async sendBookingCancelledByCustomer(to: string, details: BookingMailDetails) {
    await this.transporter.sendMail({
      from: this.from,
      to,
      subject: `Reserva cancelada pelo cliente: ${details.serviceName}`,
      text: `${details.customerName} (${details.customerEmail}) cancelou a reserva. O horário voltou a ficar livre.\n\n${summary(details)}`,
    });
  }

  async sendBookingChanged(
    to: string,
    details: BookingMailDetails,
    change: string,
    audience: 'customer' | 'owner',
  ) {
    const intro =
      audience === 'customer'
        ? `Olá, ${details.customerName}! Sua reserva com ${details.tenantName} foi atualizada: ${change}.`
        : `${details.customerName} (${details.customerEmail}) atualizou a reserva: ${change}.`;
    await this.transporter.sendMail({
      from: this.from,
      to,
      subject: `Reserva atualizada: ${details.serviceName}`,
      text: `${intro}\n\n${summary(details)}${audience === 'customer' ? manageBlock(details) : ''}`,
    });
  }

  async sendBookingLinks(to: string, tenantName: string, items: BookingLinkItem[]) {
    const list = items.map((item) => `${item.when}\n${item.serviceName}\n${item.url}`).join('\n\n');
    await this.transporter.sendMail({
      from: this.from,
      to,
      subject: `Suas reservas com ${tenantName}`,
      text: `Aqui estão os links para ver, cancelar ou adicionar serviços às suas próximas reservas com ${tenantName}:\n\n${list}\n\nSe você não pediu este e-mail, pode ignorá-lo.`,
    });
  }
}
