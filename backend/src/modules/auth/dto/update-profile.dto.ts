import { Transform } from 'class-transformer';
import { IsString, MaxLength, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

const NAME_MIN = 1;
const NAME_MAX = 120;

function trimName(value: unknown): unknown {
  return typeof value === 'string' ? value.trim() : value;
}

export class UpdateProfileDto {
  @ApiProperty({ minLength: NAME_MIN, maxLength: NAME_MAX })
  @IsString()
  @Transform(({ value }) => trimName(value))
  @MinLength(NAME_MIN)
  @MaxLength(NAME_MAX)
  firstName!: string;

  @ApiProperty({ minLength: NAME_MIN, maxLength: NAME_MAX })
  @IsString()
  @Transform(({ value }) => trimName(value))
  @MinLength(NAME_MIN)
  @MaxLength(NAME_MAX)
  lastName!: string;
}
