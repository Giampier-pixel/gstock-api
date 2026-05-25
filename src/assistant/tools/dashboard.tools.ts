import {
  DashboardService,
  type TopMoversPeriod,
} from '../../dashboard/dashboard.service';
import type { ToolHandler } from '../types';

const VALID_PERIODS: TopMoversPeriod[] = ['today', 'week', 'month'];

const clampLimit = (raw: unknown, fallback: number, max = 20): number => {
  const n = typeof raw === 'number' ? raw : Number(raw);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return Math.min(Math.floor(n), max);
};

export function createDashboardTools(dashboard: DashboardService): Record<string, ToolHandler> {
  return {
    get_dashboard_kpis: async () => dashboard.getKpis(),

    get_inventory_value: async () => {
      const value = await dashboard.getInventoryValue();
      return { value };
    },

    get_top_movers: async (args) => {
      const period = (args.period ?? 'today') as string;
      if (!VALID_PERIODS.includes(period as TopMoversPeriod)) {
        return { error: 'period inválido. Use "today", "week" o "month".' };
      }
      const limit = clampLimit(args.limit, 5);
      const items = await dashboard.getTopMovers(period as TopMoversPeriod, limit);
      return { items };
    },
  };
}
