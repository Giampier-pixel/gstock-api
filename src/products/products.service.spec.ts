import { Test } from '@nestjs/testing';
import { mockDeep, type DeepMockProxy } from 'jest-mock-extended';
import { NotFoundException } from '@nestjs/common';
import { Product, ProductStatus } from '@prisma/client';
import { ProductsService } from './products.service';
import { PrismaService } from '../prisma/prisma.service';

describe('ProductsService', () => {
  let service: ProductsService;
  let prisma: DeepMockProxy<PrismaService>;

  beforeEach(async () => {
    prisma = mockDeep<PrismaService>();
    const module = await Test.createTestingModule({
      providers: [ProductsService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = module.get(ProductsService);
  });

  const buildProduct = (overrides: Partial<Product> = {}): Product =>
    ({
      id: 'p-1',
      sku: 'SKU-1',
      name: 'Test',
      description: null,
      category: 'cat',
      price: 1000 as unknown as Product['price'],
      cost: 500 as unknown as Product['cost'],
      stock: 10,
      minStock: 2,
      status: ProductStatus.ACTIVE,
      imageUrl: null,
      providerId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    }) as Product;

  it('findOne throws NotFound when missing', async () => {
    prisma.product.findUnique.mockResolvedValue(null);
    await expect(service.findOne('nope')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('create infers LOW_STOCK status when stock <= minStock', async () => {
    prisma.product.create.mockResolvedValue(
      buildProduct({ stock: 2, minStock: 5, status: ProductStatus.LOW_STOCK }),
    );

    const result = await service.create({
      sku: 'X',
      name: 'X',
      category: 'cat',
      price: 100,
      cost: 50,
      stock: 2,
      minStock: 5,
    });

    expect(prisma.product.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: ProductStatus.LOW_STOCK }) }),
    );
    expect(result.status).toBe(ProductStatus.LOW_STOCK);
  });

  it('create infers INACTIVE when stock = 0', async () => {
    prisma.product.create.mockResolvedValue(
      buildProduct({ stock: 0, minStock: 5, status: ProductStatus.INACTIVE }),
    );

    await service.create({
      sku: 'X',
      name: 'X',
      category: 'cat',
      price: 100,
      cost: 50,
      stock: 0,
      minStock: 5,
    });

    expect(prisma.product.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: ProductStatus.INACTIVE }) }),
    );
  });

  it('update recomputes status from new stock', async () => {
    prisma.product.findUnique.mockResolvedValue(
      buildProduct({ stock: 10, minStock: 2, status: ProductStatus.ACTIVE }),
    );
    prisma.product.update.mockResolvedValue(
      buildProduct({ stock: 1, minStock: 2, status: ProductStatus.LOW_STOCK }),
    );

    const result = await service.update('p-1', { stock: 1 });
    expect(prisma.product.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: ProductStatus.LOW_STOCK }) }),
    );
    expect(result.status).toBe(ProductStatus.LOW_STOCK);
  });
});
