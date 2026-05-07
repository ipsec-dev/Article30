import { Injectable, BadRequestException, Logger, NotFoundException } from '@nestjs/common';
import Parser from 'rss-parser';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateRssFeedDto } from './dto/create-rss-feed.dto';
import { UpdateRssFeedDto } from './dto/update-rss-feed.dto';

@Injectable()
export class RssFeedsService {
  private readonly logger = new Logger(RssFeedsService.name);
  private readonly parser = new Parser();

  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.rssFeed.findMany({ orderBy: { createdAt: 'asc' } });
  }

  async create(dto: CreateRssFeedDto) {
    try {
      await this.parser.parseURL(dto.url);
    } catch {
      throw new BadRequestException('URL does not return a valid RSS feed');
    }
    return this.prisma.rssFeed.create({ data: dto });
  }

  async update(id: string, dto: UpdateRssFeedDto) {
    const existing = await this.prisma.rssFeed.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('RSS feed not found');
    }
    if (dto.url && dto.url !== existing.url) {
      try {
        await this.parser.parseURL(dto.url);
      } catch {
        throw new BadRequestException('URL does not return a valid RSS feed');
      }
    }
    return this.prisma.rssFeed.update({ where: { id }, data: dto });
  }

  async delete(id: string) {
    const existing = await this.prisma.rssFeed.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('RSS feed not found');
    }
    await this.prisma.rssFeed.delete({ where: { id } });
    this.logger.log({ event: 'rss.feed.deleted', feedId: id, label: existing.label });
    return { deleted: true };
  }
}
