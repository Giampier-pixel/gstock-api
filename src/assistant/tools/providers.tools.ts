import { NotFoundException } from '@nestjs/common';
import { ProvidersService } from '../../providers/providers.service';
import type { ToolHandler } from '../types';

export function createProvidersTools(providers: ProvidersService): Record<string, ToolHandler> {
  return {
    list_providers: async () => {
      const result = await providers.list({ page: 1, pageSize: 50 } as never);
      return { count: result.data.length, total: result.meta.total, items: result.data };
    },

    get_provider_products: async (args) => {
      const providerId = String(args.providerId ?? '').trim();
      if (!providerId) return { error: 'El parámetro "providerId" es obligatorio.' };
      try {
        const provider = (await providers.findOne(providerId)) as unknown as {
          id: string;
          name: string;
          products: unknown[];
        };
        return {
          provider: { id: provider.id, name: provider.name },
          products: provider.products,
        };
      } catch (err) {
        if (err instanceof NotFoundException) {
          return { error: `Proveedor no encontrado: ${providerId}` };
        }
        throw err;
      }
    },
  };
}
