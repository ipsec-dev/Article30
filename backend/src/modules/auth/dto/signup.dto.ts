import { Transform } from 'class-transformer';
import { IsEmail, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { IsStrongPassword } from '../decorators/is-strong-password.decorator';

const NAME_MIN = 1;
const NAME_MAX = 120;

function trimName(value: unknown): unknown {
  return typeof value === 'string' ? value.trim() : value;
}

export class SignupDto {
  @ApiProperty({ minLength: NAME_MIN, maxLength: NAME_MAX })
  @IsString()
  @MinLength(NAME_MIN)
  @MaxLength(NAME_MAX)
  @Transform(({ value }) => trimName(value))
  firstName!: string;

  @ApiProperty({ minLength: NAME_MIN, maxLength: NAME_MAX })
  @IsString()
  @MinLength(NAME_MIN)
  @MaxLength(NAME_MAX)
  @Transform(({ value }) => trimName(value))
  lastName!: string;

  @ApiProperty()
  @IsEmail()
  @Matches(/^[\x21-\x7E]+$/, { message: 'email must contain only printable ASCII characters' })
  @Transform(({ value }) => {
    if (typeof value !== 'string') {
      return value;
    }
    // NFKC-fold then lowercase so visually-identical emails share one row,
    // and uniqueness stays case-insensitive.
    return value.normalize('NFKC').toLowerCase().trim();
  })
  email!: string;

  @ApiProperty()
  @IsStrongPassword()
  password!: string;
}
