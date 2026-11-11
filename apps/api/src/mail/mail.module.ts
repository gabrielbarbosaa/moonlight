import { Global, Module } from '@nestjs/common';
import { MailPort } from './mail.port';
import { SmtpMailService } from './smtp-mail.service';

@Global()
@Module({
  providers: [{ provide: MailPort, useClass: SmtpMailService }],
  exports: [MailPort],
})
export class MailModule {}
