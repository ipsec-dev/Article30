import { Module } from '@nestjs/common';
import { RecitalsController } from './recitals.controller';
import { RecitalsService } from './recitals.service';

@Module({
  controllers: [RecitalsController],
  providers: [RecitalsService],
})
export class RecitalsModule {}
