import { IsEnum, IsOptional } from 'class-validator';
import { ViolationStatus } from '@prisma/client';

export class TransitionDto {
  @IsEnum(ViolationStatus)
  target!: ViolationStatus;

  // payload is target-specific; the service-level validator (transition-validators.ts)
  // performs deep validation. The HTTP boundary just accepts it as an object.
  // @IsOptional() prevents ValidationPipe(whitelist:true) from stripping it.
  @IsOptional()
  payload?: unknown;
}
