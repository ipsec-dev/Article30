import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Severity } from '@article30/shared';
import { SanitizeHtml } from '../../../common/decorators/sanitize-html.decorator';

export class CreateViolationDto {
  @ApiProperty()
  @IsString()
  @SanitizeHtml()
  title!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @SanitizeHtml()
  description?: string;

  @ApiProperty({ enum: Severity })
  @IsEnum(Severity)
  severity!: Severity;

  @ApiProperty()
  @IsDateString()
  discoveredAt!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  notifiedToCnil?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  notifiedToPersons?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @SanitizeHtml()
  remediation?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  treatmentIds?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  dataCategories?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  estimatedRecords?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  riskLevel?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  crossBorder?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  assignedTo?: string;
}
