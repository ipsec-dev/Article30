import { IsEnum, IsIn, IsNotEmpty, IsString, IsUUID, MaxLength } from 'class-validator';
import { CommentVisibility, EntityType } from '@prisma/client';
import { SanitizeHtml } from '../../../common/decorators/sanitize-html.decorator';

export class CreateCommentDto {
  @IsEnum(EntityType)
  entityType!: EntityType;

  @IsUUID()
  entityId!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(10_000)
  @SanitizeHtml()
  body!: string;

  @IsIn(['INTERNAL', 'AUDITOR_VISIBLE'])
  visibility!: CommentVisibility;
}
