import { MovementType } from '@prisma/client';
import { MovementsService } from '../../movements/movements.service';
import { ProductsService } from '../../products/products.service';
import type { ToolHandler } from '../types';

const clampLimit = (raw: unknown, fallback: number, max = 50): number => {
  const n = typeof raw === 'number' ? raw : Number(raw);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return Math.min(Math.floor(n), max);
};

const parseDate = (raw: unknown): Date | undefined => {
  if (raw === undefined || raw === null || raw === '') return undefined;
  const d = new Date(String(raw));
  if (Number.isNaN(d.getTime())) throw new Error(`fecha inválida: ${String(raw)}`);
  return d;
};

const parseMovementType = (raw: unknown): MovementType | undefined => {
  if (!raw) return undefined;
  const v = String(raw).toUpperCase();
  if (v === 'IN') return MovementType.IN;
  if (v === 'OUT') return MovementType.OUT;
  return undefined;
};

export function createMovementsTools(
  movements: MovementsService,
  products: ProductsService,
): Record<string, ToolHandler> {
  return {
    list_recent_movements: async (args) => {
      const pageSize = clampLimit(args.limit, 10);
      const type = parseMovementType(args.type);
      const result = await movements.list({
        page: 1,
        pageSize,
        ...(type ? { type } : {}),
      } as never);
      return { count: result.data.length, items: result.data };
    },

    get_product_movements: async (args) => {
      const sku = String(args.sku ?? '').trim();
      if (!sku) return { error: 'El parámetro "sku" es obligatorio.' };
      const product = await products.findBySku(sku);
      if (!product) return { error: `Producto no encontrado: ${sku}` };
      const pageSize = clampLimit(args.limit, 20);
      const result = await movements.list({
        productId: product.id,
        page: 1,
        pageSize,
      } as never);
      return {
        product: { id: product.id, sku: product.sku },
        count: result.data.length,
        items: result.data,
      };
    },

    movements_summary: async (args) => {
      try {
        const from = parseDate(args.from);
        const to = parseDate(args.to);
        return await movements.summary(from, to);
      } catch (err) {
        return { error: (err as Error).message };
      }
    },
  };
}
