import { IsEnum, IsString, IsOptional, IsEmail, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DsrType } from '@article30/shared';
import { SanitizeHtml } from '../../../common/decorators/sanitize-html.decorator';

const MAX_NAME_LENGTH = 200;
const MAX_DETAILS_LENGTH = 2000;
const MAX_DESCRIPTION_LENGTH = 5000;
const MAX_SYSTEMS_LENGTH = 2000;

export class CreateDsrDto {
  @ApiProperty({ enum: DsrType })
  @IsEnum(DsrType)
  type!: DsrType;

  @ApiProperty()
  @IsString()
  @MaxLength(MAX_NAME_LENGTH)
  @SanitizeHtml()
  requesterName!: string;

  @ApiProperty()
  @IsEmail()
  requesterEmail!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(MAX_DETAILS_LENGTH)
  @SanitizeHtml()
  requesterDetails?: string;

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
  assignedTo?: string;
}
