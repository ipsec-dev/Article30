import { Transform } from 'class-transformer';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsStrongPassword } from '../decorators/is-strong-password.decorator';

const NAME_MIN = 1;
const NAME_MAX = 120;

function trimName(value: unknown): unknown {
  return typeof value === 'string' ? value.trim() : value;
}

export class ResetPasswordDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  token!: string;

  /** Required on first-time invite flows; omitted on plain admin-issued resets. */
  @ApiPropertyOptional({ minLength: NAME_MIN, maxLength: NAME_MAX })
  @IsOptional()
  @IsString()
  @MinLength(NAME_MIN)
  @MaxLength(NAME_MAX)
  @Transform(({ value }) => trimName(value))
  firstName?: string;

  /** Required on first-time invite flows; omitted on plain admin-issued resets. */
  @ApiPropertyOptional({ minLength: NAME_MIN, maxLength: NAME_MAX })
  @IsOptional()
  @IsString()
  @MinLength(NAME_MIN)
  @MaxLength(NAME_MAX)
  @Transform(({ value }) => trimName(value))
  lastName?: string;

  @ApiProperty()
  @IsStrongPassword()
  newPassword!: string;
}
