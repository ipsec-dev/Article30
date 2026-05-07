import { Transform } from 'class-transformer';
import { IsEmail, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty()
  @IsEmail()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.toLowerCase().trim();
    }
    return value;
  })
  email!: string;

  @ApiProperty()
  @IsString()
  password!: string;
}
