import { IsBoolean, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class NotificationSettingsDto {
  @ApiPropertyOptional() @IsOptional() @IsBoolean() notifyDsrDeadline?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() notifyVendorDpaExpiry?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() notifyTreatmentReview?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() notifyViolation72h?: boolean;
}
