import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { WRITE_ROLES } from '@article30/shared';
import { DocumentsService } from './documents.service';
import { UploadDocumentDto } from './dto/upload-document.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequestUser } from '../../common/types/request-user';

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
const UPLOAD_RATE_LIMIT = 10;
const UPLOAD_RATE_TTL_MS = 60_000;

@ApiTags('documents')
@Controller('documents')
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Post('upload')
  @Roles(...WRITE_ROLES)
  @Throttle({ default: { limit: UPLOAD_RATE_LIMIT, ttl: UPLOAD_RATE_TTL_MS } })
  // Pre-buffer cap matches the service-layer post-buffer check.
  // Requests over the limit get a 413 before bytes land in the Node heap.
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: MAX_FILE_SIZE_BYTES },
    }),
  )
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
  getDownloadUrl(@Param('id') id: string) {
    return this.documentsService.getDownloadUrl(id);
  }

  @Delete(':id')
  @Roles(...WRITE_ROLES)
  delete(@Param('id') id: string) {
    return this.documentsService.delete(id);
  }
}
