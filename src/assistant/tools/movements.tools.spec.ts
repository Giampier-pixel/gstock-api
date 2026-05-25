import { MovementType } from '@prisma/client';
import { MovementsService } from '../../movements/movements.service';
import { ProductsService } from '../../products/products.service';
import { createMovementsTools } from './movements.tools';

describe('movements tools', () => {
  const movements = { list: jest.fn(), summary: jest.fn() } as unknown as MovementsService;
  const products = { findBySku: jest.fn() } as unknown as ProductsService;

  beforeEach(() => jest.clearAllMocks());

  it('list_recent_movements paginates with limit', async () => {
    (movements.list as jest.Mock).mockResolvedValue({
      data: [{ id: 'm1' }],
      meta: { page: 1, pageSize: 10, total: 1, totalPages: 1 },
    });
    const tools = createMovementsTools(movements, products);
    await tools.list_recent_movements({ limit: 10 }, { userId: 'u' });
    expect(movements.list).toHaveBeenCalledWith(
      expect.objectContaining({ page: 1, pageSize: 10 }),
    );
  });

  it('list_recent_movements filters by type when provided', async () => {
    (movements.list as jest.Mock).mockResolvedValue({
      data: [],
      meta: { page: 1, pageSize: 10, total: 0, totalPages: 1 },
    });
    const tools = createMovementsTools(movements, products);
    await tools.list_recent_movements({ type: 'IN' }, { userId: 'u' });
    expect(movements.list).toHaveBeenCalledWith(
      expect.objectContaining({ type: MovementType.IN }),
    );
  });

  it('get_product_movements returns error when SKU does not exist', async () => {
    (products.findBySku as jest.Mock).mockResolvedValue(null);
    const tools = createMovementsTools(movements, products);
    const result = await tools.get_product_movements({ sku: 'X' }, { userId: 'u' });
    expect(result).toEqual({ error: 'Producto no encontrado: X' });
  });

  it('get_product_movements lists movements for found product', async () => {
    (products.findBySku as jest.Mock).mockResolvedValue({ id: 'p1', sku: 'X' });
    (movements.list as jest.Mock).mockResolvedValue({
      data: [{ id: 'm1' }],
      meta: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
    });
    const tools = createMovementsTools(movements, products);
    const result = await tools.get_product_movements({ sku: 'X', limit: 20 }, { userId: 'u' });
    expect(movements.list).toHaveBeenCalledWith(
      expect.objectContaining({ productId: 'p1', pageSize: 20 }),
    );
    expect(result).toEqual(expect.objectContaining({ count: 1, items: [{ id: 'm1' }] }));
  });

  it('movements_summary passes ISO date parsing', async () => {
    (movements.summary as jest.Mock).mockResolvedValue({ in: 5, out: 3 });
    const tools = createMovementsTools(movements, products);
    await tools.movements_summary(
      { from: '2026-05-01T00:00:00Z', to: '2026-05-31T00:00:00Z' },
      { userId: 'u' },
    );
    expect(movements.summary).toHaveBeenCalledWith(
      new Date('2026-05-01T00:00:00Z'),
      new Date('2026-05-31T00:00:00Z'),
    );
  });

  it('movements_summary rejects invalid date strings', async () => {
    const tools = createMovementsTools(movements, products);
    const result = await tools.movements_summary({ from: 'not-a-date' }, { userId: 'u' });
    expect(result).toEqual({ error: expect.stringContaining('fecha') });
  });
});
