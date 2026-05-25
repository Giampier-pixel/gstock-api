import { ProductStatus } from '@prisma/client';
import { ProductsService } from '../../products/products.service';
import { createProductsTools } from './products.tools';

describe('products tools', () => {
  const service = {
    list: jest.fn(),
    findBySku: jest.fn(),
    findDistinctCategories: jest.fn(),
  } as unknown as ProductsService;

  beforeEach(() => jest.clearAllMocks());

  it('search_products delegates to list with q', async () => {
    (service.list as jest.Mock).mockResolvedValue({
      data: [{ sku: 'A' }],
      meta: { page: 1, pageSize: 10, total: 1, totalPages: 1 },
    });
    const tools = createProductsTools(service);
    const result = await tools.search_products({ query: 'cola', limit: 10 }, { userId: 'u1' });
    expect(service.list).toHaveBeenCalledWith(
      expect.objectContaining({ q: 'cola', page: 1, pageSize: 10 }),
    );
    expect(result).toEqual(expect.objectContaining({ count: 1, items: [{ sku: 'A' }] }));
  });

  it('get_product returns error when SKU not found', async () => {
    (service.findBySku as jest.Mock).mockResolvedValue(null);
    const tools = createProductsTools(service);
    const result = await tools.get_product({ sku: 'X' }, { userId: 'u1' });
    expect(result).toEqual({ error: 'Producto no encontrado: X' });
  });

  it('list_low_stock filters by LOW_STOCK status', async () => {
    (service.list as jest.Mock).mockResolvedValue({
      data: [],
      meta: { page: 1, pageSize: 20, total: 0, totalPages: 1 },
    });
    const tools = createProductsTools(service);
    await tools.list_low_stock({ limit: 20 }, { userId: 'u1' });
    expect(service.list).toHaveBeenCalledWith(
      expect.objectContaining({ status: ProductStatus.LOW_STOCK }),
    );
  });

  it('list_by_category filters by category', async () => {
    (service.list as jest.Mock).mockResolvedValue({
      data: [],
      meta: { page: 1, pageSize: 20, total: 0, totalPages: 1 },
    });
    const tools = createProductsTools(service);
    await tools.list_by_category({ category: 'bebidas', limit: 5 }, { userId: 'u1' });
    expect(service.list).toHaveBeenCalledWith(
      expect.objectContaining({ category: 'bebidas', pageSize: 5 }),
    );
  });

  it('list_categories returns array of strings', async () => {
    (service.findDistinctCategories as jest.Mock).mockResolvedValue(['a', 'b']);
    const tools = createProductsTools(service);
    const result = await tools.list_categories({}, { userId: 'u1' });
    expect(result).toEqual({ categories: ['a', 'b'] });
  });

  it('search_products clamps limit to [1, 50]', async () => {
    (service.list as jest.Mock).mockResolvedValue({
      data: [],
      meta: { page: 1, pageSize: 50, total: 0, totalPages: 1 },
    });
    const tools = createProductsTools(service);
    await tools.search_products({ query: 'x', limit: 9999 }, { userId: 'u1' });
    expect(service.list).toHaveBeenCalledWith(expect.objectContaining({ pageSize: 50 }));
  });
});
