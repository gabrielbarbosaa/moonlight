import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createTransport, Transporter } from 'nodemailer';
import { MailPort } from './mail.port';

@Injectable()
export class SmtpMailService extends MailPort {
  private readonly transporter: Transporter;
  private readonly from: string;

  constructor(config: ConfigService) {
    super();
    this.transporter = createTransport({
      host: config.get<string>('SMTP_HOST', 'localhost'),
      port: Number(config.get('SMTP_PORT', 1026)),
      secure: false,
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
}
