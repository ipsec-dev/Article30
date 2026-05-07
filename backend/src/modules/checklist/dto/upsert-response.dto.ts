import { IsEnum, IsOptional, IsString, IsUUID, IsDateString, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ChecklistAnswer, Priority } from '@article30/shared';
import { SanitizeHtml } from '../../../common/decorators/sanitize-html.decorator';

const MAX_TEXT_LENGTH = 2000;

export class UpsertResponseDto {
  @ApiProperty({ enum: ChecklistAnswer })
  @IsEnum(ChecklistAnswer)
  response!: ChecklistAnswer;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(MAX_TEXT_LENGTH)
  @SanitizeHtml()
  reason?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(MAX_TEXT_LENGTH)
  @SanitizeHtml()
  actionPlan?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  assignedTo?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  deadline?: string;

  @ApiPropertyOptional({ enum: Priority })
  @IsOptional()
  @IsEnum(Priority)
  priority?: Priority;
}
