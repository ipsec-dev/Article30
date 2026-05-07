import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import Parser from 'rss-parser';
import { RegulatoryUpdatesService } from '../../src/modules/regulatory-updates/regulatory-updates.service';
import { PrismaModule } from '../../src/prisma/prisma.module';
import { PrismaService } from '../../src/prisma/prisma.service';
import { cleanupDatabase } from '../helpers';

const TEST_DB_URL =
  process.env.DATABASE_URL_TEST ??
  'postgresql://article30:article30_secret@localhost:5432/article30_test'; // NOSONAR

describe('RegulatoryUpdatesService', () => {
  let module: TestingModule;
  let service: RegulatoryUpdatesService;
  let prisma: PrismaService;

  beforeAll(async () => {
    process.env.DATABASE_URL = TEST_DB_URL;
    module = await Test.createTestingModule({
      imports: [PrismaModule],
      providers: [RegulatoryUpdatesService],
    }).compile();
    service = module.get(RegulatoryUpdatesService);
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

  async function seedFeed(label = 'CNIL', url = 'https://cnil.fr/fr/rss.xml', enabled = true) {
    return prisma.rssFeed.create({ data: { label, url, enabled } });
  }

  async function seedEntry(feedId: string, overrides: Record<string, unknown> = {}) {
    return prisma.regulatoryUpdate.create({
      data: {
        feedId,
        guid: (overrides.guid as string) ?? `guid-${Date.now()}-${Math.random()}`,
        title: (overrides.title as string) ?? 'Test entry',
        source: (overrides.source as string) ?? 'CNIL',
        publishedAt: new Date(),
        ...overrides,
      },
    });
  }

  describe('findAll', () => {
    it('returns paginated entries', async () => {
      const feed = await seedFeed();
      await seedEntry(feed.id, { title: 'Entry A' });
      await seedEntry(feed.id, { title: 'Entry B' });

      const result = await service.findAll(1, 10);

      expect(result.total).toBe(2);
      expect(result.data).toHaveLength(2);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
    });

    it('filters by status', async () => {
      const feed = await seedFeed();
      await seedEntry(feed.id, { title: 'New entry', status: 'NEW' });
      await seedEntry(feed.id, { title: 'Read entry', status: 'READ' });

      const result = await service.findAll(1, 10, { status: 'NEW' });

      expect(result.total).toBe(1);
      expect(result.data[0].title).toBe('New entry');
    });

    it('filters by saved', async () => {
      const feed = await seedFeed();
      await seedEntry(feed.id, { title: 'Saved entry', saved: true });
      await seedEntry(feed.id, { title: 'Unsaved entry', saved: false });

      const result = await service.findAll(1, 10, { saved: true });

      expect(result.total).toBe(1);
      expect(result.data[0].title).toBe('Saved entry');
    });
  });

  describe('setImpactLevel', () => {
    it('sets impact level on entry', async () => {
      const feed = await seedFeed();
      const entry = await seedEntry(feed.id);

      const updated = await service.setImpactLevel(entry.id, 'HIGH');

      expect(updated.impactLevel).toBe('HIGH');
    });

    it('throws NotFoundException for unknown id', async () => {
      await expect(service.setImpactLevel('nonexistent-id', 'HIGH')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('setStatus', () => {
    it('sets status on entry', async () => {
      const feed = await seedFeed();
      const entry = await seedEntry(feed.id, { status: 'NEW' });

      const updated = await service.setStatus(entry.id, 'READ');

      expect(updated.status).toBe('READ');
    });
  });

  describe('toggleSaved', () => {
    it('toggles saved flag back and forth', async () => {
      const feed = await seedFeed();
      const entry = await seedEntry(feed.id, { saved: false });

      const toggled = await service.toggleSaved(entry.id);
      expect(toggled.saved).toBe(true);

      const toggledBack = await service.toggleSaved(entry.id);
      expect(toggledBack.saved).toBe(false);
    });
  });

  describe('countNew', () => {
    it('counts only NEW entries', async () => {
      const feed = await seedFeed();
      await seedEntry(feed.id, { status: 'NEW' });
      await seedEntry(feed.id, { status: 'NEW' });
      await seedEntry(feed.id, { status: 'READ' });

      const result = await service.countNew();

      expect(result.count).toBe(2);
    });
  });

  describe('sync', () => {
    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('returns newEntries: 0 when no feeds are enabled', async () => {
      const parseSpy = vi.spyOn(Parser.prototype, 'parseURL');
      const result = await service.sync();
      expect(result).toEqual({ newEntries: 0 });
      expect(parseSpy).not.toHaveBeenCalled();
    });

    it('skips disabled feeds (parseURL not called)', async () => {
      await seedFeed('Disabled', 'https://disabled.test/feed.xml', false);
      const parseSpy = vi.spyOn(Parser.prototype, 'parseURL');
      const result = await service.sync();
      expect(result.newEntries).toBe(0);
      expect(parseSpy).not.toHaveBeenCalled();
    });

    it('inserts new entries from a parsed feed and updates lastSyncAt', async () => {
      const feed = await seedFeed('CNIL', 'https://cnil.fr/feed.xml', true);
      vi.spyOn(Parser.prototype, 'parseURL').mockResolvedValue({
        items: [
          {
            guid: 'a',
            title: 'Title A',
            pubDate: '2026-01-01',
            link: 'https://a',
            contentSnippet: 'Summary A',
          },
          {
            guid: 'b',
            title: 'Title B',
            pubDate: '2026-01-02',
            link: 'https://b',
            content: 'Content B only',
          },
        ],
      } as never);

      const result = await service.sync();

      expect(result.newEntries).toBe(2);
      const rows = await prisma.regulatoryUpdate.findMany({ where: { feedId: feed.id } });
      expect(rows).toHaveLength(2);
      const refreshed = await prisma.rssFeed.findUnique({ where: { id: feed.id } });
      expect(refreshed?.lastSyncAt).not.toBeNull();
    });

    it('catches parseURL errors on one feed and continues with others', async () => {
      const feedA = await seedFeed('A', 'https://a.test/feed.xml', true);
      const feedB = await seedFeed('B', 'https://b.test/feed.xml', true);

      vi.spyOn(Parser.prototype, 'parseURL').mockImplementation(async (url: string) => {
        if (url === feedA.url) {
          throw new Error('network boom');
        }
        return {
          items: [
            {
              guid: 'b1',
              title: 'Title B1',
              pubDate: '2026-02-01',
              link: 'https://b/1',
              contentSnippet: 'Summary B1',
            },
          ],
        } as never;
      });

      const result = await service.sync();

      expect(result.newEntries).toBe(1);
      const rowsA = await prisma.regulatoryUpdate.findMany({ where: { feedId: feedA.id } });
      const rowsB = await prisma.regulatoryUpdate.findMany({ where: { feedId: feedB.id } });
      expect(rowsA).toHaveLength(0);
      expect(rowsB).toHaveLength(1);
    });

    it('dedupes by guid: second sync with same items returns 0 new entries', async () => {
      const feed = await seedFeed('Dedup', 'https://dedup.test/feed.xml', true);
      vi.spyOn(Parser.prototype, 'parseURL').mockResolvedValue({
        items: [
          {
            guid: 'dup-1',
            title: 'Dup One',
            pubDate: '2026-03-01',
            link: 'https://d/1',
            contentSnippet: 'S1',
          },
          {
            guid: 'dup-2',
            title: 'Dup Two',
            pubDate: '2026-03-02',
            link: 'https://d/2',
            contentSnippet: 'S2',
          },
        ],
      } as never);

      const first = await service.sync();
      expect(first.newEntries).toBe(2);

      const second = await service.sync();
      expect(second.newEntries).toBe(0);

      const rows = await prisma.regulatoryUpdate.findMany({ where: { feedId: feed.id } });
      expect(rows).toHaveLength(2);
    });

    it('filters out items missing a title', async () => {
      const feed = await seedFeed('Filter', 'https://filter.test/feed.xml', true);
      vi.spyOn(Parser.prototype, 'parseURL').mockResolvedValue({
        items: [
          { guid: 'no-title', pubDate: '2026-04-01', link: 'https://nt' },
          {
            guid: 'has-title',
            title: 'Kept',
            pubDate: '2026-04-02',
            link: 'https://ht',
            contentSnippet: 'ok',
          },
        ],
      } as never);

      const result = await service.sync();

      expect(result.newEntries).toBe(1);
      const rows = await prisma.regulatoryUpdate.findMany({ where: { feedId: feed.id } });
      expect(rows).toHaveLength(1);
      expect(rows[0].title).toBe('Kept');
    });

    it('falls back to title as guid when guid and link are missing', async () => {
      const feed = await seedFeed('Fallback', 'https://fallback.test/feed.xml', true);
      vi.spyOn(Parser.prototype, 'parseURL').mockResolvedValue({
        items: [
          {
            title: 'Only Title Here',
            pubDate: '2026-05-01',
            contentSnippet: 'body',
          },
        ],
      } as never);

      const result = await service.sync();

      expect(result.newEntries).toBe(1);
      const rows = await prisma.regulatoryUpdate.findMany({ where: { feedId: feed.id } });
      expect(rows).toHaveLength(1);
      expect(rows[0].guid).toBe('Only Title Here');
    });

    it('uses current time when pubDate is missing', async () => {
      const feed = await seedFeed('NoDate', 'https://nodate.test/feed.xml', true);
      vi.spyOn(Parser.prototype, 'parseURL').mockResolvedValue({
        items: [
          {
            guid: 'nd-1',
            title: 'No Date',
            link: 'https://nd/1',
            contentSnippet: 'x',
          },
        ],
      } as never);

      const before = Date.now();
      const result = await service.sync();
      const after = Date.now();

      expect(result.newEntries).toBe(1);
      const rows = await prisma.regulatoryUpdate.findMany({ where: { feedId: feed.id } });
      expect(rows).toHaveLength(1);
      const publishedMs = rows[0].publishedAt.getTime();
      // Allow a few seconds of tolerance on either side.
      expect(publishedMs).toBeGreaterThanOrEqual(before - 5000);
      expect(publishedMs).toBeLessThanOrEqual(after + 5000);
    });

    it('prefers contentSnippet, falls back to content, else null', async () => {
      const feed = await seedFeed('Desc', 'https://desc.test/feed.xml', true);
      vi.spyOn(Parser.prototype, 'parseURL').mockResolvedValue({
        items: [
          {
            guid: 'snip',
            title: 'Snippet Wins',
            pubDate: '2026-06-01',
            link: 'https://s/1',
            contentSnippet: 'snippet-text',
            content: 'full-content',
          },
          {
            guid: 'cont',
            title: 'Content Fallback',
            pubDate: '2026-06-02',
            link: 'https://s/2',
            content: 'only-content-here',
          },
          {
            guid: 'none',
            title: 'Neither',
            pubDate: '2026-06-03',
            link: 'https://s/3',
          },
        ],
      } as never);

      const result = await service.sync();
      expect(result.newEntries).toBe(3);

      const rows = await prisma.regulatoryUpdate.findMany({
        where: { feedId: feed.id },
        orderBy: { guid: 'asc' },
      });
      const byGuid = Object.fromEntries(rows.map(r => [r.guid, r.description]));
      expect(byGuid['snip']).toBe('snippet-text');
      expect(byGuid['cont']).toBe('only-content-here');
      expect(byGuid['none']).toBeNull();
    });
  });
});
