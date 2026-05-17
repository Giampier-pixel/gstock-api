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
}
