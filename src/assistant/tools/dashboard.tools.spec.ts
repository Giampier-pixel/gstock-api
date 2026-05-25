import { DashboardService } from '../../dashboard/dashboard.service';
import { createDashboardTools } from './dashboard.tools';

describe('dashboard tools', () => {
  const dashboard = {
    getKpis: jest.fn(),
    getInventoryValue: jest.fn(),
    getTopMovers: jest.fn(),
  } as unknown as DashboardService;

  beforeEach(() => jest.clearAllMocks());

  it('get_dashboard_kpis returns full KPIs', async () => {
    (dashboard.getKpis as jest.Mock).mockResolvedValue({
      totalSkus: 3,
      lowStockCount: 1,
      ordersToday: 0,
      movementsToday: { in: 0, out: 0 },
      inventoryValue: 5000,
    });
    const tools = createDashboardTools(dashboard);
    const result = await tools.get_dashboard_kpis({}, { userId: 'u' });
    expect(result).toEqual(expect.objectContaining({ totalSkus: 3, inventoryValue: 5000 }));
  });

  it('get_inventory_value returns numeric value', async () => {
    (dashboard.getInventoryValue as jest.Mock).mockResolvedValue(1234);
    const tools = createDashboardTools(dashboard);
    const result = await tools.get_inventory_value({}, { userId: 'u' });
    expect(result).toEqual({ value: 1234 });
  });

  it('get_top_movers passes period and limit through', async () => {
    (dashboard.getTopMovers as jest.Mock).mockResolvedValue([{ sku: 'X', totalQuantity: 10 }]);
    const tools = createDashboardTools(dashboard);
    const result = await tools.get_top_movers({ period: 'week', limit: 3 }, { userId: 'u' });
    expect(dashboard.getTopMovers).toHaveBeenCalledWith('week', 3);
    expect(result).toEqual({ items: [{ sku: 'X', totalQuantity: 10 }] });
  });

  it('get_top_movers defaults to today/5 when args missing', async () => {
    (dashboard.getTopMovers as jest.Mock).mockResolvedValue([]);
    const tools = createDashboardTools(dashboard);
    await tools.get_top_movers({}, { userId: 'u' });
    expect(dashboard.getTopMovers).toHaveBeenCalledWith('today', 5);
  });

  it('get_top_movers rejects invalid period', async () => {
    const tools = createDashboardTools(dashboard);
    const result = await tools.get_top_movers({ period: 'year' }, { userId: 'u' });
    expect(result).toEqual({ error: expect.stringContaining('period') });
  });
});
