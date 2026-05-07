import { IsString, IsObject, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { SanitizeHtml } from '../../../common/decorators/sanitize-html.decorator';

const MAX_TITLE_LENGTH = 255;

export class CreateScreeningDto {
  @ApiProperty()
  @IsString()
  @MaxLength(MAX_TITLE_LENGTH)
  @SanitizeHtml()
  title!: string;

  @ApiProperty()
  @IsObject()
  responses!: Record<string, string>;
}
