import { Global, Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { BillingPort } from './billing.port';
import { BillingController } from './billing.controller';
import { BillingRenewalService } from './billing-renewal.service';
import { BillingService } from './billing.service';
import { EntitlementsService } from './entitlements.service';
import { SandboxBillingService } from './sandbox-billing.service';

@Global()
@Module({
  imports: [AuthModule],
  controllers: [BillingController],
  providers: [
    SandboxBillingService,
    { provide: BillingPort, useExisting: SandboxBillingService },
    BillingService,
    BillingRenewalService,
    EntitlementsService,
  ],
  exports: [EntitlementsService],
})
export class BillingModule {}
