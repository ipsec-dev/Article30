import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

const DEFAULT_PAGE_SIZE = 20;

@Injectable()
export class RecitalsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(page = 1, limit = DEFAULT_PAGE_SIZE) {
    const [data, total] = await Promise.all([
      this.prisma.regulationRecital.findMany({
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { recitalNumber: 'asc' },
      }),
      this.prisma.regulationRecital.count(),
    ]);
    return { data, total, page, limit };
  }

  async findByNumber(recitalNumber: number) {
    const recital = await this.prisma.regulationRecital.findUnique({
      where: { recitalNumber },
    });
    if (!recital) {
      throw new NotFoundException('Recital not found');
    }
    return recital;
  }
}
