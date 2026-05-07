import { PartialType, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsOptional, IsUUID } from 'class-validator';
import { CreateViolationDto } from './create-violation.dto';

export class UpdateViolationDto extends PartialType(CreateViolationDto) {
  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  treatmentIds?: string[];
}
