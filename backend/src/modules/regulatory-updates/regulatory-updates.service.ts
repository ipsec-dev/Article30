import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import Parser from 'rss-parser';
import { PrismaService } from '../../prisma/prisma.service';

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const STATUS_NEW = 'NEW';
const NOT_FOUND_MESSAGE = 'Regulatory update not found';

@Injectable()
export class RegulatoryUpdatesService {
  private readonly logger = new Logger(RegulatoryUpdatesService.name);
  private readonly parser = new Parser();

  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    page = DEFAULT_PAGE,
    limit = DEFAULT_LIMIT,
    filters: {
      source?: string;
      impactLevel?: string;
      status?: string;
      saved?: boolean | null;
    } = {},
  ) {
    const where: Record<string, unknown> = {};
    if (filters.source) {
      where.source = filters.source;
    }
    if (filters.impactLevel) {
      where.impactLevel = filters.impactLevel;
    }
    if (filters.status) {
      where.status = filters.status;
    }
    if (filters.saved != null) {
      where.saved = filters.saved;
    }

    const [data, total] = await Promise.all([
      this.prisma.regulatoryUpdate.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { publishedAt: 'desc' },
      }),
      this.prisma.regulatoryUpdate.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  async sync(): Promise<{ newEntries: number }> {
    const feeds = await this.prisma.rssFeed.findMany({ where: { enabled: true } });
    let totalNew = 0;

    for (const feed of feeds) {
      try {
        const feedNew = await this.syncSingleFeed(feed);
        totalNew += feedNew;
      } catch (error) {
        this.logger.warn({
          event: 'rss.feed.sync.failed',
          feedId: feed.id,
          label: feed.label,
          url: feed.url,
          err: error,
        });
      }
    }

    return { newEntries: totalNew };
  }

  private async syncSingleFeed(feed: { id: string; url: string; label: string }): Promise<number> {
    const parsed = await this.parser.parseURL(feed.url);
    let feedNew = 0;

    const validItems = parsed.items.filter(item => {
      const guid = item.guid || item.link || item.title;
      return guid && item.title;
    });

    for (const item of validItems) {
      const guid = item.guid || item.link || item.title || '';
      const created = await this.createIfNew(feed, guid, item);
      if (created) {
        feedNew++;
      }
    }

    await this.prisma.rssFeed.update({
      where: { id: feed.id },
      data: { lastSyncAt: new Date() },
    });

    this.logger.log({
      event: 'rss.feed.synced',
      feedId: feed.id,
      label: feed.label,
      newEntries: feedNew,
    });
    return feedNew;
  }

  private async createIfNew(
    feed: { id: string; label: string },
    guid: string,
    item: {
      title?: string;
      contentSnippet?: string;
      content?: string;
      link?: string;
      pubDate?: string;
    },
  ): Promise<boolean> {
    const exists = await this.prisma.regulatoryUpdate.findUnique({ where: { guid } });
    if (exists) {
      return false;
    }

    let publishedAt: Date;
    if (item.pubDate) {
      publishedAt = new Date(item.pubDate);
    } else {
      publishedAt = new Date();
    }

    await this.prisma.regulatoryUpdate.create({
      data: {
        guid,
        publishedAt,
        feedId: feed.id,
        title: item.title ?? '',
        description: item.contentSnippet || item.content || null,
        url: item.link || null,
        source: feed.label,
      },
    });
    return true;
  }

  async setImpactLevel(id: string, impactLevel: string) {
    const entry = await this.prisma.regulatoryUpdate.findUnique({ where: { id } });
    if (!entry) {
      throw new NotFoundException(NOT_FOUND_MESSAGE);
    }
    return this.prisma.regulatoryUpdate.update({ where: { id }, data: { impactLevel } });
  }

  async setStatus(id: string, status: string) {
    const entry = await this.prisma.regulatoryUpdate.findUnique({ where: { id } });
    if (!entry) {
      throw new NotFoundException(NOT_FOUND_MESSAGE);
    }
    return this.prisma.regulatoryUpdate.update({ where: { id }, data: { status } });
  }

  async toggleSaved(id: string) {
    const entry = await this.prisma.regulatoryUpdate.findUnique({ where: { id } });
    if (!entry) {
      throw new NotFoundException(NOT_FOUND_MESSAGE);
    }
    return this.prisma.regulatoryUpdate.update({ where: { id }, data: { saved: !entry.saved } });
  }

  async countNew(): Promise<{ count: number }> {
    const count = await this.prisma.regulatoryUpdate.count({ where: { status: STATUS_NEW } });
    return { count };
  }
}
