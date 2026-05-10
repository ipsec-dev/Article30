import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  NotFoundException,
  Param,
  Post,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
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
import { assertCanReadFollowUpAttachment } from '../../common/authorization/document-access';

const RFC8187_RESERVED = /[!'()*]/g;

function encodeRfc8187(value: string): string {
  return encodeURIComponent(value).replace(
    RFC8187_RESERVED,
    c => `%${c.charCodeAt(0).toString(16).toUpperCase()}`,
  );
}

@ApiTags('follow-up')
@Controller('follow-up/attachments')
export class AttachmentsController {
  constructor(
    private readonly attachments: AttachmentsService,
    private readonly storage: StorageService,
    private readonly prisma: PrismaService,
  ) {}

  // Order matters: more-specific routes (`:id/download`, `:id` Delete) must
  // be declared BEFORE the polymorphic `:entityType/:entityId` Get.

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
  @ApiOkResponse({
    description: 'Streams the file. Returns 206 with Content-Range when a Range header is sent.',
    content: { '*/*': { schema: { type: 'string', format: 'binary' } } },
  })
  async download(
    @Param('id') id: string,
    @Headers('range') range: string | undefined,
    @CurrentUser() user: RequestUser,
    @Res() res: Response,
  ) {
    const attachment = await this.prisma.followUpAttachment.findFirst({
      where: { id, deletedAt: null },
    });
    if (!attachment || !attachment.storageKey) {
      throw new NotFoundException('Attachment not found');
    }

    await assertCanReadFollowUpAttachment(user, attachment, this.prisma);

    const obj = await this.storage.getObject(attachment.storageKey, range);

    res.status(obj.statusCode);
    res.setHeader('Content-Type', attachment.mimeType);
    res.setHeader('Content-Length', String(obj.contentLength));
    res.setHeader('Accept-Ranges', 'bytes');
    if (obj.contentRange) res.setHeader('Content-Range', obj.contentRange);
    if (obj.etag) res.setHeader('ETag', obj.etag);
    res.setHeader(
      'Content-Disposition',
      `inline; filename*=UTF-8''${encodeRfc8187(attachment.filename)}`,
    );
    res.setHeader('Cache-Control', 'private, no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');

    obj.body.pipe(res);
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
