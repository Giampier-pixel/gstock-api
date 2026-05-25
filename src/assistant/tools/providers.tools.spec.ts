import { NotFoundException } from '@nestjs/common';
import { ProvidersService } from '../../providers/providers.service';
import { createProvidersTools } from './providers.tools';

describe('providers tools', () => {
  const providers = { list: jest.fn(), findOne: jest.fn() } as unknown as ProvidersService;

  beforeEach(() => jest.clearAllMocks());

  it('list_providers returns paginated items', async () => {
    (providers.list as jest.Mock).mockResolvedValue({
      data: [{ id: 'pv1', name: 'Acme' }],
      meta: { page: 1, pageSize: 50, total: 1, totalPages: 1 },
    });
    const tools = createProvidersTools(providers);
    const result = await tools.list_providers({}, { userId: 'u' });
    expect(result).toEqual(
      expect.objectContaining({ count: 1, items: [{ id: 'pv1', name: 'Acme' }] }),
    );
  });

  it('get_provider_products returns provider + products', async () => {
    (providers.findOne as jest.Mock).mockResolvedValue({
      id: 'pv1',
      name: 'Acme',
      products: [{ id: 'p1', sku: 'X' }],
    });
    const tools = createProvidersTools(providers);
    const result = await tools.get_provider_products({ providerId: 'pv1' }, { userId: 'u' });
    expect(result).toEqual({
      provider: { id: 'pv1', name: 'Acme' },
      products: [{ id: 'p1', sku: 'X' }],
    });
  });

  it('get_provider_products returns error when not found', async () => {
    (providers.findOne as jest.Mock).mockRejectedValue(
      new NotFoundException('Provider X not found.'),
    );
    const tools = createProvidersTools(providers);
    const result = await tools.get_provider_products({ providerId: 'X' }, { userId: 'u' });
    expect(result).toEqual({ error: expect.stringContaining('no encontrado') });
  });
});
