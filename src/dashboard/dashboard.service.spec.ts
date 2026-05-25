import { Test } from '@nestjs/testing';
import { mockDeep, type DeepMockProxy } from 'jest-mock-extended';
import { DashboardService } from './dashboard.service';
import { PrismaService } from '../prisma/prisma.service';

describe('DashboardService', () => {
  let service: DashboardService;
  let prisma: DeepMockProxy<PrismaService>;

  beforeEach(async () => {
    prisma = mockDeep<PrismaService>();
    const module = await Test.createTestingModule({
      providers: [DashboardService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = module.get(DashboardService);
  });

  describe('getInventoryValue', () => {
    it('returns sum of cost * stock across all products', async () => {
      prisma.product.findMany.mockResolvedValue([
        { stock: 10, cost: 100 },
        { stock: 5, cost: 200 },
      ] as never);

      const value = await service.getInventoryValue();

      expect(value).toBe(10 * 100 + 5 * 200);
      expect(prisma.product.findMany).toHaveBeenCalledWith({
        select: { stock: true, cost: true },
      });
    });
  });

  describe('getTopMovers', () => {
    it('groups movements by product and returns top N', async () => {
      (prisma.movement.groupBy as unknown as jest.Mock).mockResolvedValue([
        { productId: 'p1', _sum: { quantity: 100 } },
        { productId: 'p2', _sum: { quantity: 50 } },
      ]);
      prisma.product.findMany.mockResolvedValue([
        { id: 'p1', sku: 'SKU-1', name: 'Prod 1' },
        { id: 'p2', sku: 'SKU-2', name: 'Prod 2' },
      ] as never);

      const result = await service.getTopMovers('today', 2);

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({ sku: 'SKU-1', totalQuantity: 100 });
      expect(result[1]).toMatchObject({ sku: 'SKU-2', totalQuantity: 50 });
    });
  });
});
