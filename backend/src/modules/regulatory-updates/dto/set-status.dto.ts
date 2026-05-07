import { IsString, IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SetStatusDto {
  @ApiProperty({ enum: ['NEW', 'REVIEWED', 'DISMISSED'] })
  @IsString()
  @IsIn(['NEW', 'REVIEWED', 'DISMISSED'])
  status!: string;
}
