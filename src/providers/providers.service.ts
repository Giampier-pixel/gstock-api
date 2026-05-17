import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, Provider } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProviderDto } from './dto/create-provider.dto';
import { UpdateProviderDto } from './dto/update-provider.dto';
import { PaginationDto, paginate, PaginatedResult } from '../common/dto/pagination.dto';

@Injectable()
export class ProvidersService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: PaginationDto & { q?: string }): Promise<PaginatedResult<Provider>> {
    const where: Prisma.ProviderWhereInput = {};
    if (query.q) {
      where.OR = [
        { name: { contains: query.q, mode: 'insensitive' } },
        { contact: { contains: query.q, mode: 'insensitive' } },
        { email: { contains: query.q, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await this.prisma.$transaction([
      this.prisma.provider.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: query.skip,
        take: query.take,
      }),
      this.prisma.provider.count({ where }),
    ]);

    return paginate(data, total, query.page, query.pageSize);
  }

  async findOne(id: string): Promise<Provider> {
    const provider = await this.prisma.provider.findUnique({
      where: { id },
      include: { products: { select: { id: true, sku: true, name: true } } },
    });
    if (!provider) throw new NotFoundException(`Provider ${id} not found.`);
    return provider;
  }

  create(dto: CreateProviderDto): Promise<Provider> {
    return this.prisma.provider.create({ data: dto });
  }

  async update(id: string, dto: UpdateProviderDto): Promise<Provider> {
    await this.findOne(id);
    return this.prisma.provider.update({ where: { id }, data: dto });
  }

  async remove(id: string): Promise<void> {
    await this.findOne(id);
    await this.prisma.provider.delete({ where: { id } });
  }
}
