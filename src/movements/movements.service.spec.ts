import { Test } from '@nestjs/testing';
import { mockDeep, type DeepMockProxy } from 'jest-mock-extended';
import { MovementType } from '@prisma/client';
import { MovementsService } from './movements.service';
import { PrismaService } from '../prisma/prisma.service';

describe('MovementsService', () => {
  let service: MovementsService;
  let prisma: DeepMockProxy<PrismaService>;

  beforeEach(async () => {
    prisma = mockDeep<PrismaService>();
    const module = await Test.createTestingModule({
      providers: [MovementsService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = module.get(MovementsService);
  });

  describe('summary', () => {
    it('returns totals for IN and OUT in the given range', async () => {
      prisma.movement.aggregate.mockImplementation(((args: { where: { type: MovementType } }) => {
        const type = args.where.type;
        return Promise.resolve({
          _sum: { quantity: type === MovementType.IN ? 50 : 30 },
        });
      }) as never);

      const from = new Date('2026-05-01T00:00:00Z');
      const to = new Date('2026-05-31T23:59:59Z');
      const result = await service.summary(from, to);

      expect(result).toEqual({ in: 50, out: 30, from, to });
    });

    it('treats null sums as 0', async () => {
      prisma.movement.aggregate.mockResolvedValue({ _sum: { quantity: null } } as never);

      const result = await service.summary();

      expect(result.in).toBe(0);
      expect(result.out).toBe(0);
    });
  });
});
