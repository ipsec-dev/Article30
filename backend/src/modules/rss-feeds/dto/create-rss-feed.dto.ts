import { IsString, IsUrl, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { SanitizeHtml } from '../../../common/decorators/sanitize-html.decorator';

const MAX_LABEL_LENGTH = 100;
const MAX_URL_LENGTH = 500;

export class CreateRssFeedDto {
  @ApiProperty()
  @IsString()
  @MaxLength(MAX_LABEL_LENGTH)
  @SanitizeHtml()
  label!: string;

  @ApiProperty()
  @IsUrl()
  @MaxLength(MAX_URL_LENGTH)
  url!: string;
}
