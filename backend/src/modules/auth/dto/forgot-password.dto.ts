import { Transform } from 'class-transformer';
import { IsEmail } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ForgotPasswordDto {
  @ApiProperty()
  @IsEmail()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.normalize('NFKC').toLowerCase().trim();
    }
    return value;
  })
  email!: string;
}
