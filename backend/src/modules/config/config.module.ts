import { Module } from '@nestjs/common';
import { MailModule } from '../mail/mail.module';
import { ConfigController } from './config.controller';
import { VersionService } from './version.service';

@Module({
  imports: [MailModule],
  controllers: [ConfigController],
  providers: [VersionService],
  exports: [VersionService],
})
export class ConfigModule {}
