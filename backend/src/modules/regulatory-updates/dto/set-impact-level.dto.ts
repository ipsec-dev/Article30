import { IsString, IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SetImpactLevelDto {
  @ApiProperty({ enum: ['HIGH', 'MEDIUM', 'LOW'] })
  @IsString()
  @IsIn(['HIGH', 'MEDIUM', 'LOW'])
  impactLevel!: string;
}
