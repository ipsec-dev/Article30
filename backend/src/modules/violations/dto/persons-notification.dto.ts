import { IsDateString, IsEnum, IsString, MaxLength, MinLength } from 'class-validator';
import { PersonsNotificationMethod } from '@prisma/client';
import { SanitizeHtml } from '../../../common/decorators/sanitize-html.decorator';

export class NotifyPersonsDto {
  @IsEnum(PersonsNotificationMethod)
  method!: PersonsNotificationMethod;

  @IsDateString()
  notifiedAt!: string;

  @IsString()
  @MinLength(5)
  @MaxLength(2_000)
  @SanitizeHtml()
  recipientScope!: string;
}
