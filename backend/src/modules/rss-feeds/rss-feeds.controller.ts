import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ADMIN_ROLES } from '@article30/shared';
import { RssFeedsService } from './rss-feeds.service';
import { CreateRssFeedDto } from './dto/create-rss-feed.dto';
import { UpdateRssFeedDto } from './dto/update-rss-feed.dto';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('rss-feeds')
@Controller('rss-feeds')
@Roles(...ADMIN_ROLES)
export class RssFeedsController {
  constructor(private readonly service: RssFeedsService) {}

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Post()
  create(@Body() dto: CreateRssFeedDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateRssFeedDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.service.delete(id);
  }
}
