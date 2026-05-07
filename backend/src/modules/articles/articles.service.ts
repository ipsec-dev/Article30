import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

const DEFAULT_PAGE_SIZE = 20;

@Injectable()
export class ArticlesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(page = 1, limit = DEFAULT_PAGE_SIZE) {
    const [data, total] = await Promise.all([
      this.prisma.regulationArticle.findMany({
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { articleNumber: 'asc' },
      }),
      this.prisma.regulationArticle.count(),
    ]);
    return { data, total, page, limit };
  }

  async findByNumber(articleNumber: number) {
    const article = await this.prisma.regulationArticle.findUnique({
      where: { articleNumber },
    });
    if (!article) {
      throw new NotFoundException('Article not found');
    }
    return article;
  }
}
