import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { SuperadminGuard } from '../auth/superadmin.guard';
import { BackofficeController } from './backoffice.controller';
import { BackofficeService } from './backoffice.service';

@Module({
  imports: [AuthModule],
  controllers: [BackofficeController],
  providers: [BackofficeService, SuperadminGuard],
})
export class BackofficeModule {}
