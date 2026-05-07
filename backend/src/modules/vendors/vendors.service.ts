import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PRISMA_SELECT } from '../../common/prisma/select-shapes';
import { CreateVendorDto } from './dto/create-vendor.dto';
import { UpdateVendorDto } from './dto/update-vendor.dto';

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const VENDOR_NOT_FOUND = 'Vendor not found';

@Injectable()
export class VendorsService {
  private readonly logger = new Logger(VendorsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async findAll(page = DEFAULT_PAGE, limit = DEFAULT_LIMIT) {
    const [vendors, total] = await Promise.all([
      this.prisma.vendor.findMany({
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          creator: { select: PRISMA_SELECT.userRef },
          _count: { select: { treatments: true } },
        },
      }),
      this.prisma.vendor.count(),
    ]);

    return { data: vendors, total, page, limit };
  }

  async findOne(id: string) {
    const vendor = await this.prisma.vendor.findUnique({
      where: { id },
      include: {
        creator: { select: PRISMA_SELECT.userRef },
        treatments: {
          include: {
            treatment: { select: PRISMA_SELECT.treatmentRef },
          },
        },
        subProcessors: true,
      },
    });

    if (!vendor) {
      throw new NotFoundException(VENDOR_NOT_FOUND);
    }
    return vendor;
  }

  async create(dto: CreateVendorDto, userId: string) {
    const { treatmentIds, dpaSigned, dpaExpiry, ...rest } = dto;

    let dpaSignedDate: Date | null;
    if (dpaSigned) {
      dpaSignedDate = new Date(dpaSigned);
    } else {
      dpaSignedDate = null;
    }
    let dpaExpiryDate: Date | null;
    if (dpaExpiry) {
      dpaExpiryDate = new Date(dpaExpiry);
    } else {
      dpaExpiryDate = null;
    }
    let treatmentsNested: { create: { treatmentId: string }[] } | null;
    if (treatmentIds?.length) {
      treatmentsNested = { create: treatmentIds.map(treatmentId => ({ treatmentId })) };
    } else {
      treatmentsNested = null;
    }

    const treatmentsField: { treatments?: { create: { treatmentId: string }[] } } = {};
    if (treatmentsNested) {
      treatmentsField.treatments = treatmentsNested;
    }
    const vendor = await this.prisma.vendor.create({
      data: {
        ...rest,
        ...treatmentsField,
        dpaSigned: dpaSignedDate,
        dpaExpiry: dpaExpiryDate,
        createdBy: userId,
      },
      include: {
        creator: { select: PRISMA_SELECT.userRef },
        treatments: {
          include: {
            treatment: { select: PRISMA_SELECT.treatmentRef },
          },
        },
      },
    });

    this.logger.log({ event: 'vendor.created', vendorId: vendor.id, userId });
    return vendor;
  }

  async update(id: string, dto: UpdateVendorDto) {
    const existing = await this.prisma.vendor.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(VENDOR_NOT_FOUND);
    }

    const { treatmentIds, dpaSigned, dpaExpiry, ...rest } = dto;

    const data: Record<string, unknown> = { ...rest };
    if (dpaSigned !== undefined) {
      if (dpaSigned) {
        data.dpaSigned = new Date(dpaSigned);
      } else {
        data.dpaSigned = null;
      }
    }
    if (dpaExpiry !== undefined) {
      if (dpaExpiry) {
        data.dpaExpiry = new Date(dpaExpiry);
      } else {
        data.dpaExpiry = null;
      }
    }

    if (treatmentIds !== undefined) {
      await this.prisma.vendorTreatment.deleteMany({ where: { vendorId: id } });
      if (treatmentIds.length > 0) {
        await this.prisma.vendorTreatment.createMany({
          data: treatmentIds.map(treatmentId => ({ vendorId: id, treatmentId })),
        });
      }
    }

    const vendor = await this.prisma.vendor.update({
      data,
      where: { id },
      include: {
        creator: { select: PRISMA_SELECT.userRef },
        treatments: {
          include: {
            treatment: { select: PRISMA_SELECT.treatmentRef },
          },
        },
        subProcessors: true,
      },
    });

    this.logger.debug({ event: 'vendor.updated', vendorId: id });
    return vendor;
  }

  async delete(id: string) {
    const existing = await this.prisma.vendor.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(VENDOR_NOT_FOUND);
    }

    await this.prisma.vendor.delete({ where: { id } });
    this.logger.log({ event: 'vendor.deleted', vendorId: id });
    return { deleted: true };
  }
}
