import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Movement, MovementType, Prisma, ProductStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMovementDto } from './dto/create-movement.dto';
import { QueryMovementsDto } from './dto/query-movements.dto';
import { paginate, PaginatedResult } from '../common/dto/pagination.dto';

@Injectable()
export class MovementsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: QueryMovementsDto): Promise<PaginatedResult<Movement>> {
    const where: Prisma.MovementWhereInput = {};
    if (query.productId) where.productId = query.productId;
    if (query.type) where.type = query.type;
    if (query.from || query.to) {
      where.createdAt = {};
      if (query.from) where.createdAt.gte = new Date(query.from);
      if (query.to) where.createdAt.lte = new Date(query.to);
    }

    const [data, total] = await this.prisma.$transaction([
      this.prisma.movement.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: query.skip,
        take: query.take,
        include: { product: { select: { id: true, sku: true, name: true } } },
      }),
      this.prisma.movement.count({ where }),
    ]);

    return paginate(data, total, query.page, query.pageSize);
  }

  async create(dto: CreateMovementDto, userId: string): Promise<Movement> {
    return this.prisma.$transaction(async (tx) => {
      const product = await tx.product.findUnique({ where: { id: dto.productId } });
      if (!product) throw new NotFoundException(`Product ${dto.productId} not found.`);

      const delta = dto.type === MovementType.IN ? dto.quantity : -dto.quantity;
      const nextStock = product.stock + delta;
      if (nextStock < 0) {
        throw new BadRequestException(
          `Insufficient stock: current=${product.stock}, attempting OUT of ${dto.quantity}.`,
        );
      }

      const status = this.computeStatus(nextStock, product.minStock, product.status);

      await tx.product.update({
        where: { id: product.id },
        data: { stock: nextStock, status },
      });

      return tx.movement.create({
        data: {
          productId: dto.productId,
          type: dto.type,
          quantity: dto.quantity,
          reason: dto.reason,
          userId,
        },
      });
    });
  }

  async remove(id: string): Promise<void> {
    return this.prisma.$transaction(async (tx) => {
      const movement = await tx.movement.findUnique({ where: { id } });
      if (!movement) throw new NotFoundException(`Movement ${id} not found.`);

      const product = await tx.product.findUnique({ where: { id: movement.productId } });
      if (!product) {
        await tx.movement.delete({ where: { id } });
        return;
      }

      const reversal = movement.type === MovementType.IN ? -movement.quantity : movement.quantity;
      const nextStock = product.stock + reversal;
      if (nextStock < 0) {
        throw new BadRequestException(
          'Cannot revert movement: would leave product with negative stock.',
        );
      }

      const status = this.computeStatus(nextStock, product.minStock, product.status);
      await tx.product.update({ where: { id: product.id }, data: { stock: nextStock, status } });
      await tx.movement.delete({ where: { id } });
    });
  }

  async summary(
    from?: Date,
    to?: Date,
  ): Promise<{ in: number; out: number; from?: Date; to?: Date }> {
    const range: { gte?: Date; lte?: Date } = {};
    if (from) range.gte = from;
    if (to) range.lte = to;
    const where = (type: MovementType): Prisma.MovementWhereInput =>
      from || to ? { type, createdAt: range } : { type };

    const [inAgg, outAgg] = await Promise.all([
      this.prisma.movement.aggregate({
        where: where(MovementType.IN),
        _sum: { quantity: true },
      }),
      this.prisma.movement.aggregate({
        where: where(MovementType.OUT),
        _sum: { quantity: true },
      }),
    ]);

    return {
      in: inAgg._sum.quantity ?? 0,
      out: outAgg._sum.quantity ?? 0,
      from,
      to,
    };
  }

  private computeStatus(
    stock: number,
    minStock: number,
    fallback: ProductStatus,
  ): ProductStatus {
    if (fallback === ProductStatus.INACTIVE && stock === 0) return ProductStatus.INACTIVE;
    if (stock <= 0) return ProductStatus.INACTIVE;
    if (stock <= minStock) return ProductStatus.LOW_STOCK;
    return ProductStatus.ACTIVE;
  }
}
