import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private readonly transporter: nodemailer.Transporter;
  private readonly from: string;

  constructor(private readonly config: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: config.getOrThrow<string>('SMTP_HOST'),
      port: config.get<number>('SMTP_PORT', 587),
      secure: config.get<boolean>('SMTP_SECURE', false),
      auth: {
        user: config.get<string>('SMTP_USER'),
        pass: config.get<string>('SMTP_PASS'),
      },
    });
    this.from = config.get<string>('SMTP_FROM', 'no-reply@starforged.app');
  }

  async sendMagicLink(to: string, link: string) {
    await this.transporter.sendMail({
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
}
