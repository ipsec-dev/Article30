import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { DocumentsModule } from '../documents/documents.module';
import { EntityValidator } from './entity-validator';
import { TimelineService } from './timeline.service';
import { CommentsService } from './comments.service';
import { AttachmentsService } from './attachments.service';
import { DecisionsService } from './decisions.service';
import { ContentRevisionsService } from './content-revisions.service';
import { TimelineController } from './timeline.controller';
import { CommentsController } from './comments.controller';
import { AttachmentsController } from './attachments.controller';
import { DecisionsController } from './decisions.controller';

@Module({
  imports: [PrismaModule, DocumentsModule],
  controllers: [TimelineController, CommentsController, AttachmentsController, DecisionsController],
  providers: [
    EntityValidator,
    TimelineService,
    CommentsService,
    AttachmentsService,
    DecisionsService,
    ContentRevisionsService,
  ],
  exports: [
    EntityValidator,
    TimelineService,
    CommentsService,
    AttachmentsService,
    DecisionsService,
    ContentRevisionsService,
  ],
})
export class FollowUpModule {}
