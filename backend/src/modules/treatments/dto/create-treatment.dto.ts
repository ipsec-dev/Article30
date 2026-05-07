import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  IsUrl,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { LegalBasis, SensitiveDataCategory, GuaranteeType } from '@article30/shared';
import { SanitizeHtml } from '../../../common/decorators/sanitize-html.decorator';

export class DataCategoryEntryDto {
  @ApiProperty()
  @IsString()
  @SanitizeHtml()
  category!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @SanitizeHtml()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @SanitizeHtml()
  retentionPeriod?: string;
}

export class RecipientEntryDto {
  @ApiProperty()
  @IsString()
  @SanitizeHtml()
  type!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @SanitizeHtml()
  precision?: string;
}

export class SecurityMeasureEntryDto {
  @ApiProperty()
  @IsString()
  @SanitizeHtml()
  type!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @SanitizeHtml()
  precision?: string;
}

export class TransferEntryDto {
  @ApiProperty()
  @IsString()
  @SanitizeHtml()
  destinationOrg!: string;

  @ApiProperty()
  @IsString()
  @SanitizeHtml()
  country!: string;

  @ApiProperty({ enum: GuaranteeType })
  @IsEnum(GuaranteeType)
  guaranteeType!: GuaranteeType;

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateIf(o => o.documentLink && o.documentLink.length > 0)
  @IsUrl()
  documentLink?: string;
}

export class CreateTreatmentDto {
  @ApiProperty()
  @IsString()
  @SanitizeHtml()
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @SanitizeHtml()
  purpose?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  subPurposes?: string[];

  @ApiPropertyOptional({ enum: LegalBasis })
  @IsOptional()
  @IsEnum(LegalBasis)
  legalBasis?: LegalBasis;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  personCategories?: string[];

  @ApiPropertyOptional({ type: [DataCategoryEntryDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DataCategoryEntryDto)
  dataCategories?: DataCategoryEntryDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  hasSensitiveData?: boolean;

  @ApiPropertyOptional({ enum: SensitiveDataCategory, isArray: true })
  @IsOptional()
  @IsArray()
  @IsEnum(SensitiveDataCategory, { each: true })
  sensitiveCategories?: SensitiveDataCategory[];

  @ApiPropertyOptional({ type: [RecipientEntryDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RecipientEntryDto)
  recipients?: RecipientEntryDto[];

  @ApiPropertyOptional({ type: [TransferEntryDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TransferEntryDto)
  transfers?: TransferEntryDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @SanitizeHtml()
  retentionPeriod?: string;

  // Legacy fields (kept for backward compatibility during migration)
  @ApiPropertyOptional({ type: [String], deprecated: true })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  recipientTypes?: string[];

  @ApiPropertyOptional({ type: [String], deprecated: true })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  securityMeasures?: string[];

  @ApiPropertyOptional({ type: [SecurityMeasureEntryDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SecurityMeasureEntryDto)
  securityMeasuresDetailed?: SecurityMeasureEntryDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  assignedTo?: string;

  // Risk criteria (CNIL 9 criteria for AIPD determination)
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  hasEvaluationScoring?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  hasAutomatedDecisions?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  hasSystematicMonitoring?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isLargeScale?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  hasCrossDatasetLinking?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  involvesVulnerablePersons?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  usesInnovativeTech?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  canExcludeFromRights?: boolean;
}
