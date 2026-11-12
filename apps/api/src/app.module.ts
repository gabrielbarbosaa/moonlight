import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_PIPE } from '@nestjs/core';
import { ZodValidationPipe } from 'nestjs-zod';
import { HealthController } from './health/health.controller';
import { AnalyticsModule } from './analytics/analytics.module';
import { BackofficeModule } from './backoffice/backoffice.module';
import { BillingModule } from './billing/billing.module';
import { BookingModule } from './booking/booking.module';
import { AuthModule } from './auth/auth.module';
import { MailModule } from './mail/mail.module';
import { MediaModule } from './media/media.module';
import { OtpModule } from './otp/otp.module';
import { PagesModule } from './pages/pages.module';
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './redis/redis.module';
import { TenantsModule } from './tenants/tenants.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['../../.env', '.env'],
    }),
    PrismaModule,
    RedisModule,
    MailModule,
    OtpModule,
    AuthModule,
    TenantsModule,
    PagesModule,
    AnalyticsModule,
    BackofficeModule,
    BookingModule,
    BillingModule,
    MediaModule,
  ],
  providers: [{ provide: APP_PIPE, useClass: ZodValidationPipe }],
  controllers: [HealthController],
})
export class AppModule {}
