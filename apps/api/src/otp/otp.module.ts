import { Global, Module } from '@nestjs/common';
import { OtpPort } from './otp.port';
import { PygmyOtpService } from './pygmy-otp.service';

@Global()
@Module({
  providers: [{ provide: OtpPort, useClass: PygmyOtpService }],
  exports: [OtpPort],
})
export class OtpModule {}
