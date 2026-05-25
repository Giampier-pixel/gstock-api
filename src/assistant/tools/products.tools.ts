import { ProductStatus } from '@prisma/client';
import { ProductsService } from '../../products/products.service';
import type { ToolHandler } from '../types';

const clampLimit = (raw: unknown, fallback: number, max = 50): number => {
  const n = typeof raw === 'number' ? raw : Number(raw);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return Math.min(Math.floor(n), max);
};

export function createProductsTools(products: ProductsService): Record<string, ToolHandler> {
  return {
    search_products: async (args) => {
      const query = String(args.query ?? '').trim();
      if (!query) return { error: 'El parámetro "query" es obligatorio.' };
      const pageSize = clampLimit(args.limit, 10);
      const result = await products.list({ q: query, page: 1, pageSize } as never);
      return { count: result.data.length, items: result.data };
    },

    get_product: async (args) => {
      const sku = String(args.sku ?? '').trim();
      if (!sku) return { error: 'El parámetro "sku" es obligatorio.' };
      const product = await products.findBySku(sku);
      if (!product) return { error: `Producto no encontrado: ${sku}` };
      return product;
    },

    list_low_stock: async (args) => {
      const pageSize = clampLimit(args.limit, 20);
      const result = await products.list({
        status: ProductStatus.LOW_STOCK,
        page: 1,
        pageSize,
      } as never);
      return { count: result.data.length, total: result.meta.total, items: result.data };
    },

    list_by_category: async (args) => {
      const category = String(args.category ?? '').trim();
      if (!category) return { error: 'El parámetro "category" es obligatorio.' };
      const pageSize = clampLimit(args.limit, 20);
      const result = await products.list({ category, page: 1, pageSize } as never);
      return { count: result.data.length, total: result.meta.total, items: result.data };
    },

    list_categories: async () => {
      const categories = await products.findDistinctCategories();
      return { categories };
    },
  };
}
