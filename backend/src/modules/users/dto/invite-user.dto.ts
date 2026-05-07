import { Transform } from 'class-transformer';
import { IsEmail, IsEnum, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Role } from '@article30/shared';

export class InviteUserDto {
  @ApiProperty()
  @IsEmail()
  @Matches(/^[\x21-\x7E]+$/, { message: 'email must contain only printable ASCII characters' })
  @Transform(({ value }) => {
    if (typeof value !== 'string') {
      return value;
    }
    return value.normalize('NFKC').toLowerCase().trim();
  })
  email!: string;

  @ApiProperty({ enum: Role })
  @IsEnum(Role)
  role!: Role;
}
