import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  Post,
  Query,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Response } from 'express';
import { DOCUMENT_READ_ROLES, WRITE_ROLES } from '@article30/shared';
import { DocumentsService } from './documents.service';
import { StorageService } from './storage.service';
import { UploadDocumentDto } from './dto/upload-document.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequestUser } from '../../common/types/request-user';
import { PrismaService } from '../../prisma/prisma.service';
import { assertCanReadDocument } from '../../common/authorization/document-access';

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
const UPLOAD_RATE_LIMIT = 10;
const UPLOAD_RATE_TTL_MS = 60_000;

const RFC8187_RESERVED = /[!'()*]/g;

function encodeRfc8187(value: string): string {
  // encodeURIComponent already handles most chars; we additionally percent-encode
  // !'()* because they are syntactically significant in filename*=UTF-8''<value>
  // (notably "'" terminates the language tag).
  return encodeURIComponent(value).replace(
    RFC8187_RESERVED,
    c => `%${c.charCodeAt(0).toString(16).toUpperCase()}`,
  );
}

@ApiTags('documents')
@Controller('documents')
export class DocumentsController {
  constructor(
    private readonly documentsService: DocumentsService,
    private readonly storage: StorageService,
    private readonly prisma: PrismaService,
  ) {}

  @Post('upload')
  @Roles(...WRITE_ROLES)
  @Throttle({ default: { limit: UPLOAD_RATE_LIMIT, ttl: UPLOAD_RATE_TTL_MS } })
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_FILE_SIZE_BYTES } }))
  upload(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: UploadDocumentDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.documentsService.upload(file, dto, user.id);
  }

  @Get()
  findByEntity(@Query('entity') entity: string, @Query('entityId') entityId: string) {
    return this.documentsService.findByEntity(entity, entityId);
  }

  @Get(':id/download')
  @Roles(...DOCUMENT_READ_ROLES)
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
    const document = await this.documentsService.findById(id);
    await assertCanReadDocument(user, document, this.prisma);

    const obj = await this.storage.getObject(document.s3Key, range);

    res.status(obj.statusCode);
    res.setHeader('Content-Type', document.mimeType);
    res.setHeader('Content-Length', String(obj.contentLength));
    res.setHeader('Accept-Ranges', 'bytes');
    if (obj.contentRange) res.setHeader('Content-Range', obj.contentRange);
    if (obj.etag) res.setHeader('ETag', obj.etag);
    res.setHeader(
      'Content-Disposition',
      `inline; filename*=UTF-8''${encodeRfc8187(document.filename)}`,
    );
    res.setHeader('Cache-Control', 'private, no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');

    obj.body.pipe(res);
  }

  @Delete(':id')
  @Roles(...WRITE_ROLES)
  delete(@Param('id') id: string) {
    return this.documentsService.delete(id);
  }
}
