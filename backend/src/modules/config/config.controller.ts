import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { MailService } from '../mail/mail.service';
import { PrismaService } from '../../prisma/prisma.service';
import { VersionService } from './version.service';

@ApiTags('config')
@Controller('config')
export class ConfigController {
  constructor(
    private readonly mailService: MailService,
    private readonly prisma: PrismaService,
    private readonly versionService: VersionService,
  ) {}

  @Public()
  @Get()
  async getConfig(): Promise<{
    smtpEnabled: boolean;
    bootstrapAvailable: boolean;
    version: string;
  }> {
    const userCount = await this.prisma.user.count();
    return {
      smtpEnabled: this.mailService.isEnabled(),
      bootstrapAvailable: userCount === 0,
      version: this.versionService.version,
    };
  }
}
