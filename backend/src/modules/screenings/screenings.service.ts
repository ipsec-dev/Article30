import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { VALID_SCREENING_IDS, ChecklistAnswer } from '@article30/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { PRISMA_SELECT } from '../../common/prisma/select-shapes';
import { CreateScreeningDto } from './dto/create-screening.dto';

const VALID_ANSWERS = new Set(Object.values(ChecklistAnswer));

const DEFAULT_PAGE_SIZE = 20;
const SCORE_PERCENT_MULTIPLIER = 100;
const GREEN_THRESHOLD = 80;
const RED_NO_THRESHOLD = 4;
const RED_SCORE_THRESHOLD = 50;

function computeScoreAndVerdict(responses: Record<string, string>): {
  score: number;
  verdict: string;
} {
  const total = VALID_SCREENING_IDS.length;
  const positive = Object.values(responses).filter(
    a => a === ChecklistAnswer.YES || a === ChecklistAnswer.NA,
  ).length;
  const noCount = Object.values(responses).filter(a => a === ChecklistAnswer.NO).length;
  const score = Math.round((positive / total) * SCORE_PERCENT_MULTIPLIER);

  let verdict: string;
  if (noCount === 0 && score >= GREEN_THRESHOLD) {
    verdict = 'GREEN';
  } else if (noCount >= RED_NO_THRESHOLD || score < RED_SCORE_THRESHOLD) {
    verdict = 'RED';
  } else {
    verdict = 'ORANGE';
  }

  return { score, verdict };
}

@Injectable()
export class ScreeningsService {
  private readonly logger = new Logger(ScreeningsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async findAll(page = 1, limit = DEFAULT_PAGE_SIZE) {
    const [data, total] = await Promise.all([
      this.prisma.screening.findMany({
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          creator: { select: PRISMA_SELECT.userRef },
          treatment: { select: PRISMA_SELECT.treatmentRef },
        },
      }),
      this.prisma.screening.count(),
    ]);
    return { data, total, page, limit };
  }

  async findOne(id: string) {
    const screening = await this.prisma.screening.findUnique({
      where: { id },
      include: {
        creator: { select: PRISMA_SELECT.userRef },
        treatment: { select: PRISMA_SELECT.treatmentRef },
      },
    });
    if (!screening) {
      throw new NotFoundException('Screening not found');
    }
    return screening;
  }

  async create(dto: CreateScreeningDto, userId: string) {
    for (const qId of VALID_SCREENING_IDS) {
      if (!dto.responses[qId]) {
        throw new BadRequestException(`Missing answer for question ${qId}`);
      }
      if (!VALID_ANSWERS.has(dto.responses[qId] as ChecklistAnswer)) {
        throw new BadRequestException(`Invalid answer for question ${qId}: ${dto.responses[qId]}`);
      }
    }

    const { score, verdict } = computeScoreAndVerdict(dto.responses);

    const screening = await this.prisma.screening.create({
      data: {
        score,
        verdict,
        title: dto.title,
        responses: dto.responses,
        createdBy: userId,
      },
      include: { creator: { select: PRISMA_SELECT.userRef } },
    });

    this.logger.log({
      event: 'screening.created',
      screeningId: screening.id,
      verdict,
      score,
      userId,
    });
    return screening;
  }

  async convert(id: string) {
    const screening = await this.findOne(id);
    if (screening.treatmentId) {
      throw new ConflictException('Screening already converted to a treatment');
    }

    const responses = screening.responses as Record<string, string>;
    const hasSensitiveData =
      responses.q20 === ChecklistAnswer.YES || responses.q20 === ChecklistAnswer.PARTIAL;

    const treatment = await this.prisma.treatment.create({
      data: {
        hasSensitiveData,
        name: screening.title,
        createdBy: screening.createdBy,
      },
    });

    await this.prisma.screening.update({
      where: { id },
      data: { treatmentId: treatment.id },
    });

    this.logger.log({ event: 'screening.converted', screeningId: id, treatmentId: treatment.id });
    return { treatmentId: treatment.id };
  }
}
