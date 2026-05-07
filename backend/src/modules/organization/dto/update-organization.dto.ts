import { IsBoolean, IsEmail, IsOptional, IsString, IsInt, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { SanitizeHtml } from '../../../common/decorators/sanitize-html.decorator';

export class UpdateOrganizationDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @SanitizeHtml() companyName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() siren?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @SanitizeHtml() address?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @SanitizeHtml() representativeName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @SanitizeHtml() representativeRole?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @SanitizeHtml() dpoName?: string;
  @ApiPropertyOptional() @IsOptional() @IsEmail() dpoEmail?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() dpoPhone?: string;

  @ApiPropertyOptional({ description: 'Freshness threshold in months', default: 6 })
  @IsOptional()
  @IsInt()
  @Min(1)
  freshnessThresholdMonths?: number;

  @ApiPropertyOptional({ description: 'Review cycle in months', default: 12 })
  @IsOptional()
  @IsInt()
  @Min(1)
  reviewCycleMonths?: number;

  @ApiPropertyOptional({ description: 'Annual turnover in EUR for fine exposure calculation' })
  @IsOptional()
  @IsInt()
  @Min(0)
  annualTurnover?: number;

  @ApiPropertyOptional({
    description:
      'Block a treatment creator from validating their own treatment. Default true; safe to turn off only when a single user holds all VALIDATE_ROLES.',
  })
  @IsOptional()
  @IsBoolean()
  enforceSeparationOfDuties?: boolean;
}
