import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { RssFeedsService } from '../../src/modules/rss-feeds/rss-feeds.service';
import { PrismaModule } from '../../src/prisma/prisma.module';
import { PrismaService } from '../../src/prisma/prisma.service';
import { cleanupDatabase } from '../helpers';

const TEST_DB_URL =
  process.env.DATABASE_URL_TEST ??
  'postgresql://article30:article30_secret@localhost:5432/article30_test'; // NOSONAR

const LABEL_CNIL = 'CNIL';
const URL_CNIL = 'https://cnil.fr/fr/rss.xml';

describe('RssFeedsService', () => {
  let module: TestingModule;
  let service: RssFeedsService;
  let prisma: PrismaService;

  beforeAll(async () => {
    process.env.DATABASE_URL = TEST_DB_URL;
    module = await Test.createTestingModule({
      imports: [PrismaModule],
      providers: [RssFeedsService],
    }).compile();
    service = module.get(RssFeedsService);
    prisma = module.get(PrismaService);
  });

  afterEach(async () => {
    // Clean rss_feeds first (cascades to regulatory_updates), then run base cleanup
    await prisma.rssFeed.deleteMany();
    await cleanupDatabase(prisma);
  });

  afterAll(async () => {
    await module.close();
  });

  async function seedFeed(label = LABEL_CNIL, url = URL_CNIL) {
    return prisma.rssFeed.create({ data: { label, url } });
  }

  async function seedEntry(feedId: string, title = 'Test entry') {
    return prisma.regulatoryUpdate.create({
      data: {
        feedId,
        title,
        guid: `guid-${Date.now()}-${Math.random()}`,
        source: LABEL_CNIL,
        publishedAt: new Date(),
      },
    });
  }

  describe('findAll', () => {
    it('returns all feeds', async () => {
      await seedFeed(LABEL_CNIL, URL_CNIL);
      await seedFeed('CEPD', 'https://edpb.europa.eu/rss.xml');

      const feeds = await service.findAll();

      expect(feeds).toHaveLength(2);
      const labels = feeds.map(f => f.label);
      expect(labels).toContain(LABEL_CNIL);
      expect(labels).toContain('CEPD');
    });
  });

  describe('update', () => {
    it('updates label and enabled without touching url', async () => {
      const feed = await seedFeed('Old Label', URL_CNIL);

      const updated = await service.update(feed.id, { label: 'New Label', enabled: false });

      expect(updated.label).toBe('New Label');
      expect(updated.enabled).toBe(false);
      expect(updated.url).toBe(URL_CNIL);
    });

    it('throws NotFoundException for unknown id', async () => {
      await expect(service.update('nonexistent-id', { label: 'X' })).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('delete', () => {
    it('deletes feed and cascades entries', async () => {
      const feed = await seedFeed();
      await seedEntry(feed.id, 'Entry to cascade');

      await service.delete(feed.id);

      const feeds = await service.findAll();
      expect(feeds).toHaveLength(0);

      const entries = await prisma.regulatoryUpdate.findMany({ where: { feedId: feed.id } });
      expect(entries).toHaveLength(0);
    });
  });
});
