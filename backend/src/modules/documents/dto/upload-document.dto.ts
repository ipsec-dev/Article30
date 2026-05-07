import { IsEnum, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { LinkedEntity } from '@article30/shared';

export class UploadDocumentDto {
  @ApiProperty({ enum: LinkedEntity })
  @IsEnum(LinkedEntity)
  linkedEntity!: LinkedEntity;

  @ApiProperty()
  @IsString()
  linkedEntityId!: string;
}
