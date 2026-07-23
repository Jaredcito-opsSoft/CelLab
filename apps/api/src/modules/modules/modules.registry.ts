export const businessModuleKeys = [
  'core_pos',
  'pos_advanced',
  'layaways',
  'cash',
  'inventory_basic',
  'repairs',
  'public_tracking',
  'suppliers',
  'purchases',
  'repair_parts',
  'warranties',
  'advanced_reports',
] as const;

export type BusinessModuleKey = typeof businessModuleKeys[number];

export type BusinessModuleMeta = {
  key: BusinessModuleKey;
  label: string;
  description: string;
  category: 'base' | 'operations' | 'inventory' | 'reports';
  isCore: boolean;
  defaultEnabled: boolean;
  dependsOn?: BusinessModuleKey[];
};

export const businessModuleRegistry: BusinessModuleMeta[] = [
  { key: 'core_pos', label: 'Venta rapida', description: 'Punto de venta, tickets e historial de ventas.', category: 'base', isCore: true, defaultEnabled: true },
  { key: 'pos_advanced', label: 'Funciones avanzadas POS', description: 'Pagos mixtos y devoluciones parciales para operaciones que las necesiten.', category: 'operations', isCore: false, defaultEnabled: true, dependsOn: ['core_pos'] },
  { key: 'layaways', label: 'Apartados', description: 'Reservas de producto, abonos y entrega al liquidar.', category: 'operations', isCore: false, defaultEnabled: true, dependsOn: ['core_pos'] },
  { key: 'cash', label: 'Caja y turnos', description: 'Apertura, cierre, movimientos y corte operativo.', category: 'base', isCore: true, defaultEnabled: true },
  { key: 'inventory_basic', label: 'Inventario basico', description: 'Productos, existencias y kardex basico.', category: 'base', isCore: true, defaultEnabled: true },
  { key: 'repairs', label: 'Taller de reparaciones', description: 'Recepcion, folios, estados, pagos y entrega de equipos.', category: 'operations', isCore: false, defaultEnabled: true },
  { key: 'public_tracking', label: 'Rastreo publico', description: 'Consulta publica de folios para clientes.', category: 'operations', isCore: false, defaultEnabled: true, dependsOn: ['repairs'] },
  { key: 'suppliers', label: 'Proveedores', description: 'Directorio de proveedores para compras e inventario.', category: 'inventory', isCore: false, defaultEnabled: false },
  { key: 'purchases', label: 'Compras', description: 'Ordenes de compra y recepcion de mercancia sin pagos a proveedor.', category: 'inventory', isCore: false, defaultEnabled: false, dependsOn: ['inventory_basic', 'suppliers'] },
  { key: 'repair_parts', label: 'Piezas para reparacion', description: 'Permite usar productos o piezas dentro de folios de taller.', category: 'operations', isCore: false, defaultEnabled: true, dependsOn: ['repairs'] },
  { key: 'warranties', label: 'Garantías', description: 'Reclamos, evaluación y resolución de garantías vinculadas al taller.', category: 'operations', isCore: false, defaultEnabled: true, dependsOn: ['repairs'] },
  { key: 'advanced_reports', label: 'Reportes avanzados', description: 'Reportes gerenciales futuros sobre margenes, compras e inventario.', category: 'reports', isCore: false, defaultEnabled: false },
];

export const businessModuleMap = new Map(businessModuleRegistry.map((module) => [module.key, module]));

export function isBusinessModuleKey(value: string): value is BusinessModuleKey {
  return businessModuleKeys.includes(value as BusinessModuleKey);
}
