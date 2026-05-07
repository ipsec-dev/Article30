import {
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Post,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { AttachmentCategory, EntityType } from '@prisma/client';
import { FOLLOW_UP_READ_ROLES, FOLLOW_UP_WRITE_ROLES } from '@article30/shared';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequestUser } from '../../common/types/request-user';
import { PrismaService } from '../../prisma/prisma.service';
import { AttachmentsService } from './attachments.service';
import { StorageService } from '../documents/storage.service';

@ApiTags('follow-up')
@Controller('follow-up/attachments')
export class AttachmentsController {
  constructor(
    private readonly attachments: AttachmentsService,
    private readonly storage: StorageService,
    private readonly prisma: PrismaService,
  ) {}

  // Order matters: more-specific routes (`:id/download`, `:id` Delete) must
  // be declared BEFORE the polymorphic `:entityType/:entityId` Get, otherwise
  // Express matches them as a 2-param entityType/entityId and 404s on the
  // entity validator (review #2).

  @Post()
  @Roles(...FOLLOW_UP_WRITE_ROLES)
  @UseInterceptors(FileInterceptor('file'))
  async upload(
    @UploadedFile() file: Express.Multer.File,
    @Body('entityType') entityType: EntityType,
    @Body('entityId') entityId: string,
    @Body('category') category: AttachmentCategory,
    @CurrentUser() user: RequestUser,
  ) {
    return this.attachments.upload({
      entityType,
      entityId,
      filename: file.originalname,
      mimeType: file.mimetype,
      buffer: file.buffer,
      category,
      uploadedBy: user.id,
    });
  }

  @Get(':id/download')
  @Roles(...FOLLOW_UP_READ_ROLES)
  async download(@Param('id') id: string, @Res() res: Response) {
    const attachment = await this.prisma.followUpAttachment.findFirst({
      where: { id, deletedAt: null },
    });
    if (!attachment || !attachment.storageKey) {
      throw new NotFoundException('Attachment not found');
    }
    const url = await this.storage.getPresignedUrl(attachment.storageKey);
    res.redirect(url);
  }

  @Delete(':id')
  @Roles(...FOLLOW_UP_WRITE_ROLES)
  async softDelete(
    @Param('id') id: string,
    @Body('deletionReason') deletionReason: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.attachments.softDelete({
      attachmentId: id,
      deletedBy: user.id,
      deletionReason,
    });
  }

  @Get(':entityType/:entityId')
  @Roles(...FOLLOW_UP_READ_ROLES)
  async list(@Param('entityType') entityType: EntityType, @Param('entityId') entityId: string) {
    return this.attachments.list(entityType, entityId);
  }
}
