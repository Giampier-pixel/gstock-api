import { Injectable } from '@nestjs/common';
import { MovementType, ProductStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export interface DashboardKpis {
  totalSkus: number;
  lowStockCount: number;
  ordersToday: number;
  movementsToday: { in: number; out: number };
  inventoryValue: number;
}

export interface TopMover {
  productId: string;
  sku: string;
  name: string;
  totalQuantity: number;
}

export type TopMoversPeriod = 'today' | 'week' | 'month';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getKpis(): Promise<DashboardKpis> {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const [totalSkus, lowStockCount, ordersToday, todayIn, todayOut, products] =
      await this.prisma.$transaction([
        this.prisma.product.count(),
        this.prisma.product.count({ where: { status: ProductStatus.LOW_STOCK } }),
        this.prisma.movement.count({
          where: { type: MovementType.OUT, createdAt: { gte: startOfDay } },
        }),
        this.prisma.movement.aggregate({
          where: { type: MovementType.IN, createdAt: { gte: startOfDay } },
          _sum: { quantity: true },
        }),
        this.prisma.movement.aggregate({
          where: { type: MovementType.OUT, createdAt: { gte: startOfDay } },
          _sum: { quantity: true },
        }),
        this.prisma.product.findMany({ select: { stock: true, cost: true } }),
      ]);

    const inventoryValue = products.reduce(
      (acc, p) => acc + Number(p.cost) * p.stock,
      0,
    );

    return {
      totalSkus,
      lowStockCount,
      ordersToday,
      movementsToday: {
        in: todayIn._sum.quantity ?? 0,
        out: todayOut._sum.quantity ?? 0,
      },
      inventoryValue,
    };
  }

  async getInventoryValue(): Promise<number> {
    const products = await this.prisma.product.findMany({
      select: { stock: true, cost: true },
    });
    return products.reduce((acc, p) => acc + Number(p.cost) * p.stock, 0);
  }

  async getTopMovers(period: TopMoversPeriod = 'today', limit = 5): Promise<TopMover[]> {
    const since = new Date();
    if (period === 'today') since.setHours(0, 0, 0, 0);
    else if (period === 'week') since.setDate(since.getDate() - 7);
    else since.setMonth(since.getMonth() - 1);

    const grouped = await this.prisma.movement.groupBy({
      by: ['productId'],
      where: { createdAt: { gte: since } },
      _sum: { quantity: true },
      orderBy: { _sum: { quantity: 'desc' } },
      take: Math.max(1, Math.min(limit, 50)),
    });

    const productIds = grouped.map((g) => g.productId);
    if (productIds.length === 0) return [];

    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, sku: true, name: true },
    });
    const byId = new Map(products.map((p) => [p.id, p]));

    return grouped
      .filter((g) => byId.has(g.productId))
      .map((g) => ({
        productId: g.productId,
        sku: byId.get(g.productId)!.sku,
        name: byId.get(g.productId)!.name,
        totalQuantity: g._sum.quantity ?? 0,
      }));
  }
}
