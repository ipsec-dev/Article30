import { IsString, IsOptional, IsBoolean, IsUrl, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { SanitizeHtml } from '../../../common/decorators/sanitize-html.decorator';

const MAX_LABEL_LENGTH = 100;
const MAX_URL_LENGTH = 500;

export class UpdateRssFeedDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(MAX_LABEL_LENGTH)
  @SanitizeHtml()
  label?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl()
  @MaxLength(MAX_URL_LENGTH)
  url?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}
