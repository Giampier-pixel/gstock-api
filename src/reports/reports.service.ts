import { Injectable } from '@nestjs/common';
import { MovementType, Product } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export interface RevenuePoint {
  date: string;
  revenue: number;
  unitsOut: number;
}

export interface CategoryBreakdown {
  category: string;
  skuCount: number;
  stockUnits: number;
  inventoryValue: number;
}

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async revenueByDay(days: number): Promise<RevenuePoint[]> {
    const since = new Date();
    since.setDate(since.getDate() - (days - 1));
    since.setHours(0, 0, 0, 0);

    const movements = await this.prisma.movement.findMany({
      where: { type: MovementType.OUT, createdAt: { gte: since } },
      include: { product: { select: { price: true } } },
    });

    const buckets = new Map<string, { revenue: number; unitsOut: number }>();
    for (let i = 0; i < days; i++) {
      const day = new Date(since);
      day.setDate(since.getDate() + i);
      buckets.set(day.toISOString().slice(0, 10), { revenue: 0, unitsOut: 0 });
    }

    for (const mov of movements) {
      const key = mov.createdAt.toISOString().slice(0, 10);
      const bucket = buckets.get(key);
      if (!bucket) continue;
      bucket.unitsOut += mov.quantity;
      bucket.revenue += Number(mov.product.price) * mov.quantity;
    }

    return Array.from(buckets.entries()).map(([date, v]) => ({ date, ...v }));
  }

  async categories(): Promise<CategoryBreakdown[]> {
    const products = await this.prisma.product.findMany();
    const grouped = new Map<string, Product[]>();
    for (const p of products) {
      const list = grouped.get(p.category) ?? [];
      list.push(p);
      grouped.set(p.category, list);
    }

    return Array.from(grouped.entries())
      .map(([category, items]) => ({
        category,
        skuCount: items.length,
        stockUnits: items.reduce((acc, p) => acc + p.stock, 0),
        inventoryValue: items.reduce((acc, p) => acc + Number(p.cost) * p.stock, 0),
      }))
      .sort((a, b) => b.inventoryValue - a.inventoryValue);
  }
}
