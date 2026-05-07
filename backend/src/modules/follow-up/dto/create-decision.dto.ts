import { IsEnum, IsObject, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';
import { DecisionKind, EntityType } from '@prisma/client';
import { SanitizeHtml } from '../../../common/decorators/sanitize-html.decorator';

export class CreateDecisionDto {
  @IsEnum(EntityType)
  entityType!: EntityType;

  @IsUUID()
  entityId!: string;

  @IsEnum(DecisionKind)
  kind!: DecisionKind;

  @IsObject()
  outcome!: Record<string, unknown>;

  @IsString()
  @MinLength(10)
  @MaxLength(10_000)
  @SanitizeHtml()
  rationale!: string;

  @IsObject()
  inputsSnapshot!: Record<string, unknown>;
}
