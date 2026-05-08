/**
 * Seed contract - these rules keep `pnpm seed` safe to re-run on any DB
 * version. Breaking them is what turns a routine bump into an incident.
 *
 *   1. Every seeded row has a stable business key (slug, number, url,
 *      article id). Once a row is keyed by X, it stays keyed by X forever.
 *      Changing the dedupe column upserts duplicates instead of updating.
 *
 *   2. Only "ensure exists" semantics: `upsert` or count-zero create. No
 *      bare `update`, no `delete`/`deleteMany`. If you need either, that's
 *      a migration or a backfill, not a seed.
 *
 *   3. Idempotent values only. Don't put Date.now(), process.env.X, or
 *      other moving values into the upsert payload's `update` branch -
 *      it would rewrite existing rows on every run.
 */
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import * as dotenv from 'dotenv';
import * as fs from 'node:fs';
import * as path from 'node:path';

const envCandidates = [
  path.resolve(process.cwd(), '.env'),
  path.resolve(__dirname, '../.env'),
  path.resolve(__dirname, '../../.env'),
];

for (const envPath of envCandidates) {
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
    break;
  }
}

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL is required');
}
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

async function main() {
  if (process.env.NODE_ENV === 'production' && process.env.ALLOW_SEED !== '1') {
    throw new Error('refusing to seed in production without ALLOW_SEED=1');
  }

  const rgpdPath = path.resolve(__dirname, './seed/rgpd.json');
  const rgpdData = JSON.parse(fs.readFileSync(rgpdPath, 'utf-8'));

  const recitals = Object.entries(rgpdData.recitals).map(([number, content]: [string, any]) => ({
    recitalNumber: parseInt(number, 10),
    contentFr: content.fr || '',
    contentEn: content.en || '',
    contentEs: content.es || '',
    contentDe: content.de || '',
    contentIt: content.it || '',
  }));

  console.log(`Seeding ${recitals.length} recitals...`);

  for (const recital of recitals) {
    await prisma.regulationRecital.upsert({
      where: { recitalNumber: recital.recitalNumber },
      create: recital,
      update: recital,
    });
  }

  console.log('Recitals seeded.');

  const articlesPath = path.resolve(__dirname, './seed/gdpr-articles.json');
  if (fs.existsSync(articlesPath)) {
    const articlesData = JSON.parse(fs.readFileSync(articlesPath, 'utf-8'));

    const articles = Object.entries(articlesData).map(([number, content]: [string, any]) => ({
      articleNumber: Number.parseInt(number, 10),
      chapter: content.chapter || '',
      titleFr: content.titleFr || '',
      titleEn: content.titleEn || '',
      contentFr: content.fr || '',
      contentEn: content.en || '',
      contentEs: content.es || '',
      contentDe: content.de || '',
      contentIt: content.it || '',
    }));

    console.log(`Seeding ${articles.length} articles...`);

    for (const article of articles) {
      await prisma.regulationArticle.upsert({
        where: { articleNumber: article.articleNumber },
        create: article,
        update: article,
      });
    }

    console.log('Articles seeded.');
  }

  const orgCount = await prisma.organization.count();
  if (orgCount === 0) {
    await prisma.organization.create({
      data: {
        slug: 'default',
        locale: 'fr',
      },
    });
    console.log('Default organization created.');
  }

  const defaultFeeds = [
    { label: 'CNIL', url: 'https://cnil.fr/fr/rss.xml' },
    { label: 'EDPB', url: 'https://www.edpb.europa.eu/feed/news_en' },
  ];

  for (const feed of defaultFeeds) {
    await prisma.rssFeed.upsert({
      where: { url: feed.url },
      create: feed,
      update: { label: feed.label },
    });
  }

  console.log('Default RSS feeds seeded.');

  console.log('Seed complete.');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
