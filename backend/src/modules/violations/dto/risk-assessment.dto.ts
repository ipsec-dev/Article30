import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { RiskLikelihood, RiskSeverity } from '@prisma/client';
import { SanitizeHtml } from '../../../common/decorators/sanitize-html.decorator';

export class CreateRiskAssessmentDto {
  @IsEnum(RiskLikelihood)
  likelihood!: RiskLikelihood;

  @IsEnum(RiskSeverity)
  severity!: RiskSeverity;

  @IsArray()
  affectedDataCategories!: string[];

  @IsOptional()
  @IsInt()
  @Min(0)
  estimatedSubjectCount?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  estimatedRecordCount?: number;

  @IsBoolean()
  crossBorder!: boolean;

  @IsString()
  @MinLength(10)
  @MaxLength(10_000)
  @SanitizeHtml()
  potentialConsequences!: string;

  @IsOptional()
  @IsString()
  @MaxLength(10_000)
  @SanitizeHtml()
  mitigatingFactors?: string;
}
