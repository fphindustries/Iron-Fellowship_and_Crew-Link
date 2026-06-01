import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private transporter?: nodemailer.Transporter;
  private readonly from: string;

  constructor(private readonly config: ConfigService) {
    this.from = config.get<string>('SMTP_FROM', 'no-reply@starforged.app');
  }

  async sendMagicLink(to: string, link: string) {
    await this.getTransporter().sendMail({
      from: this.from,
      to,
      subject: 'Your sign-in link',
      html: `
        <p>Click the link below to sign in. It expires in 15 minutes.</p>
        <p><a href="${link}">${link}</a></p>
      `,
      text: `Sign in here (expires in 15 minutes): ${link}`,
    });
  }

  private getTransporter() {
    if (!this.transporter) {
      this.transporter = nodemailer.createTransport({
        host: this.config.getOrThrow<string>('SMTP_HOST'),
        port: this.config.get<number>('SMTP_PORT', 587),
        secure: this.config.get<boolean>('SMTP_SECURE', false),
        auth: {
          user: this.config.get<string>('SMTP_USER'),
          pass: this.config.get<string>('SMTP_PASS'),
        },
      });
    }

    return this.transporter;
  }
}
