import { IsString, IsOptional, IsEmail, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { SanitizeHtml } from '../../../common/decorators/sanitize-html.decorator';

const MAX_NAME_LENGTH = 200;
const MAX_DETAILS_LENGTH = 2000;
const MAX_IDENTITY_NOTES_LENGTH = 2000;
const MAX_DESCRIPTION_LENGTH = 5000;
const MAX_SYSTEMS_LENGTH = 2000;
const MAX_RESPONSE_NOTES_LENGTH = 5000;
const MAX_EXTENSION_REASON_LENGTH = 2000;

export class UpdateDsrDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(MAX_NAME_LENGTH)
  @SanitizeHtml()
  requesterName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  requesterEmail?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(MAX_DETAILS_LENGTH)
  @SanitizeHtml()
  requesterDetails?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(MAX_IDENTITY_NOTES_LENGTH)
  @SanitizeHtml()
  identityNotes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(MAX_DESCRIPTION_LENGTH)
  @SanitizeHtml()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(MAX_SYSTEMS_LENGTH)
  @SanitizeHtml()
  affectedSystems?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(MAX_RESPONSE_NOTES_LENGTH)
  @SanitizeHtml()
  responseNotes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(MAX_EXTENSION_REASON_LENGTH)
  @SanitizeHtml()
  extensionReason?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  assignedTo?: string;
}
