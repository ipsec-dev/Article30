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
