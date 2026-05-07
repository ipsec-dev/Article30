import { IsDate, IsEnum, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';
import { TreatmentProcessingActionTaken, VendorPropagationStatus } from '@prisma/client';
import { SanitizeHtml } from '../../../common/decorators/sanitize-html.decorator';

export class UpsertTreatmentProcessingDto {
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  searchedAt?: Date;

  @IsOptional()
  @IsString()
  @MaxLength(10_000)
  @SanitizeHtml()
  findingsSummary?: string;

  @IsEnum(TreatmentProcessingActionTaken)
  actionTaken!: TreatmentProcessingActionTaken;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  actionTakenAt?: Date;

  @IsOptional()
  @IsUUID()
  performedBy?: string;

  @IsEnum(VendorPropagationStatus)
  vendorPropagationStatus!: VendorPropagationStatus;
}
