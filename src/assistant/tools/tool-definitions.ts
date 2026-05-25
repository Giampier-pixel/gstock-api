import { Type, type FunctionDeclaration } from '@google/genai';

export const TOOL_DEFINITIONS: FunctionDeclaration[] = [
  {
    name: 'search_products',
    description:
      'Busca productos por texto libre en nombre, SKU o descripción. Devuelve los productos coincidentes.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        query: { type: Type.STRING, description: 'Texto a buscar (nombre, SKU parcial, palabra clave).' },
        limit: { type: Type.NUMBER, description: 'Máximo de resultados (1-50). Default 10.' },
      },
      required: ['query'],
    },
  },
  {
    name: 'get_product',
    description:
      'Obtiene el detalle completo de un producto por SKU (incluye stock, costo, precio, proveedor).',
    parameters: {
      type: Type.OBJECT,
      properties: { sku: { type: Type.STRING, description: 'SKU exacto del producto.' } },
      required: ['sku'],
    },
  },
  {
    name: 'list_low_stock',
    description: 'Lista productos con estado LOW_STOCK (stock por debajo o igual al mínimo).',
    parameters: {
      type: Type.OBJECT,
      properties: {
        limit: { type: Type.NUMBER, description: 'Máximo de resultados (1-50). Default 20.' },
      },
    },
  },
  {
    name: 'list_by_category',
    description: 'Lista productos de una categoría específica.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        category: { type: Type.STRING, description: 'Nombre exacto de la categoría.' },
        limit: { type: Type.NUMBER, description: 'Máximo de resultados (1-50). Default 20.' },
      },
      required: ['category'],
    },
  },
  {
    name: 'list_categories',
    description: 'Devuelve la lista de todas las categorías existentes en el inventario.',
    parameters: { type: Type.OBJECT, properties: {} },
  },
  {
    name: 'list_recent_movements',
    description: 'Lista los movimientos de inventario más recientes (entradas/salidas).',
    parameters: {
      type: Type.OBJECT,
      properties: {
        limit: { type: Type.NUMBER, description: 'Máximo de resultados (1-50). Default 10.' },
        type: {
          type: Type.STRING,
          enum: ['IN', 'OUT'],
          description: 'Filtra por tipo IN (entrada) o OUT (salida).',
        },
      },
    },
  },
  {
    name: 'get_product_movements',
    description: 'Lista los movimientos de un producto específico (por SKU).',
    parameters: {
      type: Type.OBJECT,
      properties: {
        sku: { type: Type.STRING, description: 'SKU del producto.' },
        limit: { type: Type.NUMBER, description: 'Máximo de resultados (1-50). Default 20.' },
      },
      required: ['sku'],
    },
  },
  {
    name: 'movements_summary',
    description:
      'Totales de unidades movidas (IN/OUT) en un rango de fechas. Si no se pasa rango, considera todos los movimientos.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        from: { type: Type.STRING, description: 'Fecha desde (ISO 8601, ej. 2026-05-01T00:00:00Z).' },
        to: { type: Type.STRING, description: 'Fecha hasta (ISO 8601).' },
      },
    },
  },
  {
    name: 'list_providers',
    description: 'Lista todos los proveedores registrados.',
    parameters: { type: Type.OBJECT, properties: {} },
  },
  {
    name: 'get_provider_products',
    description: 'Lista los productos asociados a un proveedor específico (por ID del proveedor).',
    parameters: {
      type: Type.OBJECT,
      properties: { providerId: { type: Type.STRING, description: 'ID del proveedor.' } },
      required: ['providerId'],
    },
  },
  {
    name: 'get_dashboard_kpis',
    description:
      'Devuelve los KPIs actuales del dashboard: total de SKUs, productos en bajo stock, salidas de hoy, entradas/salidas del día, valor del inventario.',
    parameters: { type: Type.OBJECT, properties: {} },
  },
  {
    name: 'get_inventory_value',
    description: 'Devuelve el valor total del inventario (suma de costo × stock de todos los productos).',
    parameters: { type: Type.OBJECT, properties: {} },
  },
  {
    name: 'get_top_movers',
    description: 'Lista los productos con más movimientos en un periodo dado (today, week, month).',
    parameters: {
      type: Type.OBJECT,
      properties: {
        period: {
          type: Type.STRING,
          enum: ['today', 'week', 'month'],
          description: 'Periodo a evaluar. Default "today".',
        },
        limit: { type: Type.NUMBER, description: 'Máximo de resultados (1-20). Default 5.' },
      },
    },
  },
];
