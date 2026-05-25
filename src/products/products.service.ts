import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, Product, ProductStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { QueryProductsDto } from './dto/query-products.dto';
import { paginate, PaginatedResult } from '../common/dto/pagination.dto';

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: QueryProductsDto): Promise<PaginatedResult<Product>> {
    const where: Prisma.ProductWhereInput = {};
    if (query.q) {
      where.OR = [
        { name: { contains: query.q, mode: 'insensitive' } },
        { sku: { contains: query.q, mode: 'insensitive' } },
      ];
    }
    if (query.category) where.category = query.category;
    if (query.status) where.status = query.status;

    const [data, total] = await this.prisma.$transaction([
      this.prisma.product.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: query.skip,
        take: query.take,
      }),
      this.prisma.product.count({ where }),
    ]);

    return paginate(data, total, query.page, query.pageSize);
  }

  async findOne(id: string): Promise<Product> {
    const product = await this.prisma.product.findUnique({ where: { id } });
    if (!product) throw new NotFoundException(`Product ${id} not found.`);
    return product;
  }

  async findBySku(sku: string): Promise<Product | null> {
    return this.prisma.product.findUnique({ where: { sku } });
  }

  async findDistinctCategories(): Promise<string[]> {
    const rows = await this.prisma.product.findMany({
      distinct: ['category'],
      select: { category: true },
      orderBy: { category: 'asc' },
    });
    return rows.map((r) => r.category);
  }

  create(dto: CreateProductDto): Promise<Product> {
    return this.prisma.product.create({
      data: {
        ...dto,
        status: dto.status ?? this.computeStatus(dto.stock, dto.minStock),
      },
    });
  }

  async update(id: string, dto: UpdateProductDto): Promise<Product> {
    const existing = await this.findOne(id);
    const stock = dto.stock ?? existing.stock;
    const minStock = dto.minStock ?? existing.minStock;
    const status = dto.status ?? this.computeStatus(stock, minStock, existing.status);

    return this.prisma.product.update({
      where: { id },
      data: { ...dto, status },
    });
  }

  async remove(id: string): Promise<void> {
    await this.findOne(id);
    await this.prisma.product.delete({ where: { id } });
  }

  private computeStatus(
    stock: number,
    minStock: number,
    fallback: ProductStatus = ProductStatus.ACTIVE,
  ): ProductStatus {
    if (fallback === ProductStatus.INACTIVE) return ProductStatus.INACTIVE;
    if (stock <= 0) return ProductStatus.INACTIVE;
    if (stock <= minStock) return ProductStatus.LOW_STOCK;
    return ProductStatus.ACTIVE;
  }
}
