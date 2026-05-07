import { IsEnum, IsOptional } from 'class-validator';
import { DsrStatus } from '@prisma/client';

export class TransitionDsrDto {
  @IsEnum(DsrStatus)
  target!: DsrStatus;

  // Payload is target-specific — runtime validation happens in DSR_TRANSITION_VALIDATORS.
  // class-validator can't validate a discriminated union, so we accept `unknown` and rely
  // on the service-layer validator for payload shape.
  // @IsOptional() prevents ValidationPipe(whitelist:true) from stripping it (review #16).
  @IsOptional()
  payload?: unknown;
}
