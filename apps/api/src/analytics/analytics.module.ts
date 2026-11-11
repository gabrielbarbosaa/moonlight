import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { AuthModule } from '../auth/auth.module';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsRollupService } from './analytics-rollup.service';
import { AnalyticsService } from './analytics.service';

@Module({
  imports: [AuthModule, ScheduleModule.forRoot()],
  controllers: [AnalyticsController],
  providers: [AnalyticsService, AnalyticsRollupService],
})
export class AnalyticsModule {}
