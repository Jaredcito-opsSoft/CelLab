import { FormEvent, useCallback, useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Activity, ArrowRight, BadgeCheck, Banknote, BarChart3, Boxes, ClipboardCheck, ClipboardList, ExternalLink, Gauge, History, LayoutDashboard, LogOut, PackagePlus, PanelLeftClose, PanelLeftOpen, ReceiptText, ScanSearch, Search, Settings, ShieldCheck, ShoppingCart, Store, TrendingUp, Truck, UserPlus, Users, Wrench } from 'lucide-react';
import { apiRequest } from '../lib/api';
import { RepairDetailView } from '../modules/repairs/RepairViews';
import { InventoryMovementsView } from '../modules/inventory/InventoryViews';
import { InventoryCatalogView } from '../modules/inventory/InventoryCatalogView';
import { QuickSaleView, SaleDetailView, SalesHistoryView } from '../modules/sales/SalesViews';
import { CashView } from '../modules/cash/CashViews';
import { UserAdminView, type UserRole } from '../modules/users/UserAdminView';
import { AuditLogView } from '../modules/audit/AuditLogView';
import { WarrantyViews } from '../modules/warranties/WarrantyViews';
import { LayawayViews } from '../modules/layaways/LayawayViews';
import { ManagerialReportsView } from '../modules/reports/ManagerialReportsView';
import '../styles/panel.css';

type Section = 'dashboard' | 'clients' | 'products' | 'inventory-movements' | 'repairs' | 'repair-detail' | 'warranties' | 'sales' | 'sales-history' | 'sale-detail' | 'layaways' | 'cash' | 'tracking' | 'reports' | 'audit' | 'suppliers' | 'purchases' | 'settings';
type BusinessModuleKey = 'core_pos' | 'pos_advanced' | 'layaways' | 'cash' | 'inventory_basic' | 'repairs' | 'public_tracking' | 'suppliers' | 'purchases' | 'repair_parts' | 'warranties' | 'advanced_reports';
type BusinessModule = { key: BusinessModuleKey; label: string; description: string; category: string; isCore: boolean; defaultEnabled: boolean; enabled: boolean; dependsOn?: BusinessModuleKey[] };
type Client = { id: string; name: string; phone: string; email: string | null; notes: string | null };
type Product = { id: string; sku: string; name: string; costCents?: number; priceCents: number; stock: number; minimumStock: number; active: boolean };
type Repair = { id: string; folio: string; clientId: string; clientName: string; clientPhone: string; brand: string; model: string; status: string; reportedIssue: string; depositCents: number };
type Supplier = { id: string; name: string; contactName: string | null; phone: string | null; email: string | null; notes: string | null; active: boolean };
type Purchase = { id: string; supplierId: string; supplierName: string; repairId: string | null; folio: string; status: string; expectedAt: string | null; notes: string | null; subtotalCents: number; receivedAt: string | null; createdAt: string; items?: PurchaseItem[] };
type PurchaseItem = { id: string; productId: string; productName: string; quantity: number; receivedQuantity: number; unitCostCents: number; totalCents: number };
type DashboardSummary = { todaySalesCount: number; todaySalesTotalCents: number; openRepairsCount: number; readyRepairsCount: number; lowStockCount: number; productsCount: number; customersCount: number; recentSales: { id: string; folio: string; totalCents: number; paymentMethod: string; status: string; createdAt: string; customerName: string | null }[]; recentRepairs: { id: string; folio: string; brand: string; model: string; status: string; createdAt: string; clientName: string }[]; recentInventoryMovements: { id: string; type: string; quantity: number; previousStock: number; newStock: number; createdAt: string; productName: string }[] };
type ReportSummary = { salesCount: number; incomeCents: number; pendingRepairs: number; deliveredRepairs: number; lowStockProducts: number; recentMovements: { id: string; type: string; previousStock: number; newStock: number; createdAt: string; productName: string; userName: string }[] };
type BusinessSettings = { id: string; businessName: string; businessType: string; logoUrl: string | null; phone: string | null; address: string | null; city: string | null; state: string | null; ticketMessage: string | null; warrantyMessage: string | null; currency: string; primaryColor: string; requireOpenCashForMoneyOperations: boolean; timezone: string; updatedAt: string };
type Role = UserRole;
type SessionPayload = {
  user: {
    id: string;
    name: string;
    email: string;
    role: Role;
    active: boolean;
    lastLoginAt: string | null;
  };
  membership: {
    id: string;
    role: Role;
    active: boolean;
  };
  business: {
    id: string;
    name: string;
    slug: string;
    status: 'active' | 'inactive';
  };
};

const TOKEN = 'cellab-panel-token';
const FOCUS_MODE = 'cellab-panel-focus-mode';
const focusSections: Section[] = ['sales', 'sales-history', 'sale-detail', 'layaways', 'cash', 'repairs', 'repair-detail', 'products', 'inventory-movements'];
const statusLabel: Record<string, string> = { received: 'Recibido', diagnosis: 'Diagnóstico', awaiting_authorization: 'Por autorizar', in_repair: 'En reparación', testing: 'En pruebas', ready: 'Listo', delivered: 'Entregado', cancelled: 'Cancelado' };
const states = Object.keys(statusLabel);
const money = (cents: number, currency = 'MXN') => new Intl.NumberFormat('es-MX', { style: 'currency', currency }).format(cents / 100);
const date = (value: string) => new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
const paymentLabel = (value: string) => ({ cash: 'Efectivo', transfer: 'Transferencia', card: 'Tarjeta' }[value] ?? value);
const movementLabel = (value: string) => ({ sale: 'Venta', sale_cancel: 'Cancelación', stock_entry: 'Entrada', manual_adjustment: 'Ajuste', service_usage: 'Servicio', service_usage_void: 'Anulación', purchase_receipt: 'Compra recibida' }[value] ?? value);

function sectionFromPath(): Section {
  const path = window.location.pathname;
  if (path === '/panel/inventario/movimientos') return 'inventory-movements';
  if (path === '/panel/inventario') return 'products';
  if (path === '/panel/proveedores') return 'suppliers';
  if (path === '/panel/compras') return 'purchases';
  if (path === '/panel/clientes') return 'clients';
  if (path === '/panel/caja') return 'cash';
  if (path === '/panel/rastreo') return 'tracking';
  if (path === '/panel/reportes') return 'reports';
  if (path === '/panel/garantias') return 'warranties';
  if (path === '/panel/apartados') return 'layaways';
  if (path === '/panel/auditoria') return 'audit';
  if (path.startsWith('/panel/ventas/') && path !== '/panel/ventas/historial') return 'sale-detail';
  if (path.startsWith('/panel/reparaciones/') && path !== '/panel/reparaciones') return 'repair-detail';
  if (path === '/panel/ventas/historial') return 'sales-history';
  if (path === '/panel/ventas') return 'sales';
  if (path === '/panel/reparaciones') return 'repairs';
  if (path === '/panel/configuracion') return 'settings';
  return 'dashboard';
}
function sectionPath(section: Section) { return ({ clients: '/panel/clientes', products: '/panel/inventario', suppliers: '/panel/proveedores', purchases: '/panel/compras', sales: '/panel/ventas', 'sales-history': '/panel/ventas/historial', layaways: '/panel/apartados', 'inventory-movements': '/panel/inventario/movimientos', repairs: '/panel/reparaciones', warranties: '/panel/garantias', cash: '/panel/caja', tracking: '/panel/rastreo', reports: '/panel/reportes', audit: '/panel/auditoria', settings: '/panel/configuracion' } as Partial<Record<Section, string>>)[section] ?? '/panel'; }
function currentSaleId() { return window.location.pathname.split('/').pop() ?? ''; }
function currentRepairId() { return window.location.pathname.split('/').pop() ?? ''; }
export function PanelPage() {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN) ?? '');
  const [session, setSession] = useState<SessionPayload | null>(null);
  const [validatingSession, setValidatingSession] = useState(Boolean(token));
  const [authMessage, setAuthMessage] = useState('');

  const logout = useCallback((message = '') => {
    localStorage.removeItem(TOKEN);
    setToken('');
    setSession(null);
    setValidatingSession(false);
    setAuthMessage(message);
  }, []);

  useEffect(() => {
    const handleUnauthorized = () => {
      if (localStorage.getItem(TOKEN)) {
        logout('Tu sesión ya no es válida. Inicia sesión nuevamente.');
      }
    };
    window.addEventListener('localpos:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('localpos:unauthorized', handleUnauthorized);
  }, [logout]);

  useEffect(() => {
    if (!token) {
      setSession(null);
      setValidatingSession(false);
      return;
    }

    let active = true;
    setValidatingSession(true);
    void apiRequest<SessionPayload>('/api/auth/session', {}, token)
      .then((value) => {
        if (!active) return;
        setSession(value);
        setAuthMessage('');
      })
      .catch((error) => {
        if (!active) return;
        logout(error instanceof Error ? error.message : 'No fue posible validar la sesión.');
      })
      .finally(() => {
        if (active) setValidatingSession(false);
      });
    return () => {
      active = false;
    };
  }, [token, logout]);

  if (!token) {
    return <Login message={authMessage} onLogin={(value) => {
      localStorage.setItem(TOKEN, value);
      setToken(value);
      setValidatingSession(true);
    }} />;
  }
  if (validatingSession || !session) {
    return <main className="panel-login"><div className="panel-loading">Validando acceso al negocio…</div></main>;
  }
  return <Panel token={token} session={session} onLogout={() => logout()} />;
}

function Login({ onLogin, message = '' }: { onLogin: (token: string) => void; message?: string }) {
  const [error, setError] = useState(message);
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError('');
    const data = new FormData(event.currentTarget);
    try {
      const result = await apiRequest<{ token: string }>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: data.get('email'), password: data.get('password') }),
      });
      onLogin(result.token);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No fue posible iniciar sesión.');
    } finally {
      setBusy(false);
    }
  }
  return <main className="panel-login"><section className="login-card"><div className="login-mark"><Store /><span>LOCALPOS / OPERACIONES</span></div><p className="panel-eyebrow">Acceso operativo</p><h1>Tu negocio, listo para operar.</h1><p>Ventas, inventario, clientes y servicios desde una base configurable.</p><form onSubmit={submit}><label>Correo<input name="email" type="email" autoComplete="username" required /></label><label>Contraseña<input name="password" type="password" autoComplete="current-password" required /></label>{error && <p className="form-error">{error}</p>}<button className="panel-primary" disabled={busy}>{busy ? 'Verificando…' : 'Entrar al panel'}</button></form><small><ShieldCheck /> Sesión protegida y acciones registradas.</small></section></main>;
}

type NavigationGroup = 'start' | 'operation' | 'catalog' | 'management';
type NavigationItem = { key: Section; label: string; icon: LucideIcon; group: NavigationGroup; module?: BusinessModuleKey; adminOnly?: boolean };
const navigationGroupLabels: Record<NavigationGroup, string> = { start: 'Inicio', operation: 'Operación', catalog: 'Catálogo', management: 'Gestión' };
const navigationGroups: NavigationGroup[] = ['start', 'operation', 'catalog', 'management'];
const nav: NavigationItem[] = [
  { key: 'dashboard', label: 'Resumen operativo', icon: LayoutDashboard, group: 'start' },
  { key: 'sales', label: 'Venta rápida', icon: ShoppingCart, group: 'operation', module: 'core_pos' },
  { key: 'sales-history', label: 'Historial de ventas', icon: History, group: 'operation', module: 'core_pos' },
  { key: 'layaways', label: 'Apartados', icon: ReceiptText, group: 'operation', module: 'layaways' },
  { key: 'cash', label: 'Caja y turnos', icon: Banknote, group: 'operation', module: 'cash' },
  { key: 'repairs', label: 'Reparaciones', icon: ClipboardList, group: 'operation', module: 'repairs' },
  { key: 'warranties', label: 'Garantías', icon: BadgeCheck, group: 'operation', module: 'warranties' },
  { key: 'clients', label: 'Clientes', icon: Users, group: 'catalog' },
  { key: 'products', label: 'Inventario', icon: Boxes, group: 'catalog', module: 'inventory_basic' },
  { key: 'inventory-movements', label: 'Movimientos stock', icon: Activity, group: 'catalog', module: 'inventory_basic' },
  { key: 'suppliers', label: 'Proveedores', icon: Truck, group: 'catalog', module: 'suppliers' },
  { key: 'purchases', label: 'Compras', icon: ClipboardCheck, group: 'catalog', module: 'purchases' },
  { key: 'tracking', label: 'Rastreo público', icon: ScanSearch, group: 'management', module: 'public_tracking' },
  { key: 'reports', label: 'Reportes', icon: BarChart3, group: 'management' },
  { key: 'audit', label: 'Auditoría', icon: ShieldCheck, group: 'management', adminOnly: true },
  { key: 'settings', label: 'Configuración', icon: Settings, group: 'management' },
];

const sectionModules: Partial<Record<Section, BusinessModuleKey>> = Object.fromEntries(nav.filter((item) => item.module).map((item) => [item.key, item.module])) as Partial<Record<Section, BusinessModuleKey>>;
const moduleFallback = (moduleKey: BusinessModuleKey): BusinessModule => ({
  key: moduleKey,
  label: nav.find((item) => item.module === moduleKey)?.label ?? moduleKey,
  description: '',
  category: 'operations',
  isCore: false,
  defaultEnabled: false,
  enabled: false,
});

function Panel({ token, session, onLogout }: { token: string; session: SessionPayload; onLogout: () => void }) {
  const [section, setSection] = useState<Section>(sectionFromPath);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [business, setBusiness] = useState<BusinessSettings | null>(null);
  const [modules, setModules] = useState<BusinessModule[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [repairs, setRepairs] = useState<Repair[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState('');
  const [modulesLoaded, setModulesLoaded] = useState(false);
  const [focusMode, setFocusMode] = useState(() => localStorage.getItem(FOCUS_MODE) === '1');
  const role = session.membership.role;
  const canFocus = focusSections.includes(section);
  const isFocusMode = canFocus && focusMode;
  const enabledModules = new Set(modules.filter((module) => module.enabled).map((module) => module.key));
  const isModuleEnabled = (moduleKey?: BusinessModuleKey) => !moduleKey || enabledModules.has(moduleKey);
  const visibleNav = nav.filter((item) => isModuleEnabled(item.module) && (!item.adminOnly || role === 'admin'));
  const blockedModuleKey = sectionModules[section];
  const waitingForModuleState = Boolean(blockedModuleKey && !modulesLoaded);
  const blockedModule = modulesLoaded && blockedModuleKey && !isModuleEnabled(blockedModuleKey)
    ? modules.find((module) => module.key === blockedModuleKey) ?? moduleFallback(blockedModuleKey)
    : null;

  const loadBusiness = useCallback(async () => {
    try {
      const data = await apiRequest<{ item: BusinessSettings }>('/api/operations/business-settings', {}, token);
      setBusiness(data.item);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No fue posible cargar la configuración.');
    }
  }, [token]);

  const loadModules = useCallback(async () => {
    setModulesLoaded(false);
    try {
      const data = await apiRequest<{ items: BusinessModule[] }>('/api/operations/modules', {}, token);
      setModules(data.items);
    } catch {
      setModules([
        { key: 'core_pos', label: 'Venta rápida', description: '', category: 'base', isCore: true, defaultEnabled: true, enabled: true },
        { key: 'cash', label: 'Caja y turnos', description: '', category: 'base', isCore: true, defaultEnabled: true, enabled: true },
        { key: 'inventory_basic', label: 'Inventario básico', description: '', category: 'base', isCore: true, defaultEnabled: true, enabled: true },
      ]);
    } finally {
      setModulesLoaded(true);
    }
  }, [token]);

  useEffect(() => { void loadBusiness(); }, [loadBusiness]);
  useEffect(() => { void loadModules(); }, [loadModules]);
  useEffect(() => {
    const sync = () => setSection(sectionFromPath());
    window.addEventListener('popstate', sync);
    return () => window.removeEventListener('popstate', sync);
  }, []);

  const load = useCallback(async () => {
    if (blockedModule || waitingForModuleState) return;
    setBusy(true);
    setError('');
    try {
      if (section === 'dashboard' || section === 'reports') setSummary(await apiRequest<DashboardSummary>('/api/operations/dashboard/summary', {}, token));
      if (section === 'clients') setClients((await apiRequest<{ items: Client[] }>(`/api/operations/clients?search=${encodeURIComponent(search)}`, {}, token)).items);
      if (section === 'products' || section === 'purchases') setProducts((await apiRequest<{ items: Product[] }>(`/api/operations/products?search=${encodeURIComponent(search)}&limit=100`, {}, token)).items);
      if (section === 'repairs') {
        const [r, c] = await Promise.all([
          apiRequest<{ items: Repair[] }>(`/api/operations/repairs?search=${encodeURIComponent(search)}`, {}, token),
          apiRequest<{ items: Client[] }>('/api/operations/clients?limit=100', {}, token),
        ]);
        setRepairs(r.items);
        setClients(c.items);
      }
    } catch (e) {
      const m = e instanceof Error ? e.message : 'No fue posible cargar los datos.';
      setError(m);
      if (m.toLowerCase().includes('sesión')) onLogout();
    } finally {
      setBusy(false);
    }
  }, [section, search, token, onLogout, blockedModule, waitingForModuleState]);

  useEffect(() => { void load(); }, [load]);

  const navigate = (next: Section, path = sectionPath(next)) => {
    window.history.pushState({}, '', path);
    setSection(next);
  };
  const toggleFocusMode = () => {
    setFocusMode((current) => {
      const next = !current;
      localStorage.setItem(FOCUS_MODE, next ? '1' : '0');
      return next;
    });
  };
  const title = section === 'sale-detail' ? 'Detalle de venta' : section === 'repair-detail' ? 'Detalle de reparación' : (nav.find((item) => item.key === section)?.label ?? 'Panel');
  const showSearch = !['dashboard', 'settings', 'sales', 'sales-history', 'sale-detail', 'layaways', 'repair-detail', 'warranties', 'inventory-movements', 'cash', 'tracking', 'reports', 'audit', 'purchases'].includes(section);
  const rootClass = `panel-root${isFocusMode ? ' panel-root--focus' : ''}`;

  return (
    <main className={rootClass} data-section={section} style={{ '--ops-blue': business?.primaryColor ?? '#185a70' } as CSSProperties}>
      <aside className="panel-sidebar" aria-label="Navegación principal">
        <a className="panel-brand" href="/"><span>LP</span><b>LocalPOS<small>{business?.businessName ?? session.business.name}</small></b></a>
        <nav className="panel-navigation" aria-label="Módulos del negocio">{navigationGroups.map((group) => {
          const groupItems = visibleNav.filter((item) => item.group === group);
          if (groupItems.length === 0) return null;
          return <section className="panel-navigation__group" key={group} aria-labelledby={`panel-nav-${group}`}>
            <h2 id={`panel-nav-${group}`}>{navigationGroupLabels[group]}</h2>
            <div>{groupItems.map(({ key, label, icon: Icon }) => <button key={key} type="button" className={section === key ? 'active' : ''} aria-current={section === key ? 'page' : undefined} title={label} onClick={() => { setSearch(''); navigate(key); }}><Icon aria-hidden="true" /><span>{label}</span></button>)}</div>
          </section>;
        })}</nav>
        <button className="panel-logout" onClick={onLogout}><LogOut />Cerrar sesión</button>
      </aside>
      <section className="panel-workspace">
        <header>
          <div>
            <p className="panel-eyebrow">LocalPOS / {business?.businessName ?? session.business.name}</p>
            <h1>{title}</h1>
          </div>
          {(showSearch || canFocus) && <div className="panel-header-actions">
            {showSearch && <label className="panel-search"><Search /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar en este módulo…" /></label>}
            {canFocus && <button className="focus-toggle" type="button" aria-pressed={isFocusMode} onClick={toggleFocusMode} title={isFocusMode ? 'Mostrar menú lateral' : 'Activar modo enfoque'}>
              {isFocusMode ? <PanelLeftOpen /> : <PanelLeftClose />}
              <span>{isFocusMode ? 'Mostrar menú' : 'Modo enfoque'}</span>
              <small>{isFocusMode ? 'Volver a navegación' : 'Vista mostrador'}</small>
            </button>}
          </div>}
        </header>
        {error && <div className="panel-alert">{error}<button onClick={() => void load()}>Reintentar</button></div>}
        {(busy || waitingForModuleState) && <div className="panel-loading">Sincronizando operación…</div>}
        {blockedModule && <ModuleDisabled module={blockedModule} />}
        {!blockedModule && !busy && section === 'dashboard' && <Dashboard summary={summary} business={business} modules={modules} onNavigate={navigate} />}
        {!blockedModule && !busy && section === 'clients' && <Clients token={token} items={clients} reload={load} />}
        {!blockedModule && !busy && section === 'products' && <InventoryCatalogView token={token} role={role} currency={business?.currency ?? 'MXN'} />}
        {!blockedModule && !busy && section === 'inventory-movements' && <InventoryMovementsView token={token} role={role} currency={business?.currency ?? 'MXN'} />}
        {!blockedModule && !busy && section === 'suppliers' && <SuppliersView token={token} role={role} />}
        {!blockedModule && !busy && section === 'purchases' && <PurchasesView token={token} role={role} products={products} currency={business?.currency ?? 'MXN'} />}
        {!blockedModule && !busy && section === 'repairs' && <Repairs token={token} items={repairs} clients={clients} reload={load} onOpenRepair={(id) => navigate('repair-detail', `/panel/reparaciones/${id}`)} />}
        {!blockedModule && !busy && section === 'repair-detail' && <RepairDetailView token={token} repairId={currentRepairId()} role={role} onBack={() => navigate('repairs')} />}
        {!blockedModule && !busy && section === 'warranties' && <WarrantyViews token={token} role={role} />}
        {!blockedModule && !busy && section === 'sales' && business && <QuickSaleView token={token} business={business} advancedPosEnabled={enabledModules.has('pos_advanced')} onOpenSale={(id) => navigate('sale-detail', `/panel/ventas/${id}`)} onOpenHistory={() => navigate('sales-history')} />}
        {!blockedModule && !busy && section === 'sales-history' && business && <SalesHistoryView token={token} business={business} onOpenSale={(id) => navigate('sale-detail', `/panel/ventas/${id}`)} onNewSale={() => navigate('sales')} />}
        {!blockedModule && !busy && section === 'sale-detail' && <SaleDetailView token={token} saleId={currentSaleId()} role={role} advancedPosEnabled={enabledModules.has('pos_advanced')} onBack={() => navigate('sales-history')} />}
        {!blockedModule && !busy && section === 'layaways' && <LayawayViews token={token} role={role} currency={business?.currency ?? 'MXN'} />}
        {!blockedModule && !busy && section === 'cash' && <CashView token={token} role={role} business={business} />}
        {!blockedModule && !busy && section === 'tracking' && <TrackingPanel />}
        {!blockedModule && !busy && section === 'reports' && <div className="reports-stack">
          <ReportsPanel token={token} currency={business?.currency ?? 'MXN'} />
          {enabledModules.has('advanced_reports') && (role === 'admin' || role === 'manager') && <ManagerialReportsView token={token} currency={business?.currency ?? 'MXN'} />}
        </div>}
        {!blockedModule && !busy && section === 'audit' && <AuditLogView token={token} role={role} />}
        {!blockedModule && !busy && section === 'settings' && business && <BusinessConfiguration token={token} item={business} role={role} modules={modules} onModulesChanged={loadModules} onSaved={loadBusiness} />}
      </section>
    </main>
  );
}

function Dashboard({ summary, business, modules, onNavigate }: { summary: DashboardSummary | null; business: BusinessSettings | null; modules: BusinessModule[]; onNavigate: (next: Section, path?: string) => void }) {
  if (!summary) return <section className="dashboard-empty"><Gauge /><h2>Preparando centro de mando</h2><p>Cuando el API responda, aquí verás ventas, caja e inventario según los módulos activos.</p></section>;
  const currency = business?.currency ?? 'MXN';
  const enabled = new Set(modules.filter((module) => module.enabled).map((module) => module.key));
  const repairsEnabled = enabled.has('repairs');
  const inventoryEnabled = enabled.has('inventory_basic');
  const cashEnabled = enabled.has('cash');
  const stats = [
    { label: 'Ingresos de hoy', value: money(summary.todaySalesTotalCents, currency), note: `${summary.todaySalesCount} ventas completadas`, icon: <TrendingUp /> },
    ...(repairsEnabled ? [
      { label: 'Equipos activos', value: summary.openRepairsCount, note: 'En diagnóstico, reparación o pruebas', icon: <Wrench /> },
      { label: 'Listos para entregar', value: summary.readyRepairsCount, note: 'Oportunidad de cobrar y cerrar', icon: <ReceiptText /> },
    ] : []),
    ...(inventoryEnabled ? [{ label: 'Stock crítico', value: summary.lowStockCount, note: `${summary.productsCount} productos registrados`, icon: <Boxes />, tone: summary.lowStockCount > 0 ? 'warning' : 'good' }] : []),
    { label: 'Clientes', value: summary.customersCount, note: 'Base operativa actual', icon: <Users /> },
  ];
  const actions = [
    { label: 'Nueva venta', note: 'Punto de venta rápido', icon: <ShoppingCart />, run: () => onNavigate('sales') },
    ...(repairsEnabled ? [{ label: 'Recibir equipo', note: 'Abrir folio de taller', icon: <ClipboardList />, run: () => onNavigate('repairs') }] : []),
    { label: 'Nuevo cliente', note: 'Alta de mostrador', icon: <UserPlus />, run: () => onNavigate('clients') },
    ...(inventoryEnabled ? [
      { label: 'Inventario', note: 'Productos y existencias', icon: <PackagePlus />, run: () => onNavigate('products') },
      { label: 'Movimientos', note: 'Trazabilidad de stock', icon: <Activity />, run: () => onNavigate('inventory-movements') },
    ] : []),
    ...(cashEnabled ? [{ label: 'Caja', note: 'Abrir, cerrar y cortar turno', icon: <Banknote />, run: () => onNavigate('cash') }] : []),
  ];
  return <div className="ops-dashboard"><section className="dashboard-metrics"><div className="metric-list">{stats.map((x, i) => <StatCard {...x} key={i} />)}</div><div className="quick-action-grid">{actions.map((x, i) => <QuickAction {...x} key={i} />)}</div></section><section className="dashboard-activity">{repairsEnabled && <RecentPanel title="Reparaciones recientes" empty="Sin ingresos de taller hoy.">{summary.recentRepairs.map((x) => <div className="activity-row" key={x.id}><span><b>{x.brand} {x.model}</b><small>{x.clientName} · {date(x.createdAt)}</small></span><StatusBadge value={x.status} /></div>)}</RecentPanel>}<RecentPanel title="Últimas ventas" empty="No hay ventas registradas hoy.">{summary.recentSales.map((x) => <div className="activity-row" key={x.id}><span><b>{x.folio}</b><small>{paymentLabel(x.paymentMethod)} · {date(x.createdAt)} · {x.customerName ?? 'Mostrador'}</small></span><strong>{money(x.totalCents, currency)}</strong></div>)}</RecentPanel>{inventoryEnabled && <RecentPanel title="Kardex de inventario" empty="Sin movimientos de stock recientes.">{summary.recentInventoryMovements.map((x) => <div className="activity-row" key={x.id}><span><b>{movementLabel(x.type)}</b><small>{x.productName} · {date(x.createdAt)}</small></span><strong>{x.previousStock} → {x.newStock}</strong></div>)}</RecentPanel>}</section></div>;
}
function StatCard({ label, value, note, icon, tone }: { label: string; value: string | number; note: string; icon: ReactNode; tone?: string }) { return <article className={`stat-card ${tone ? `stat-${tone}` : ''}`}><span className="stat-icon">{icon}</span><small>{label}</small><b>{value}</b><p>{note}</p></article>; }
function QuickAction({ label, note, icon, run }: { label: string; note: string; icon: ReactNode; run: () => void }) { return <button className="quick-action" onClick={run}><span>{icon}</span><b>{label}</b><small>{note}</small><ArrowRight /></button>; }
function RecentPanel({ title, empty, children }: { title: string; empty: string; children: ReactNode[] }) { return <article className="recent-panel"><h3>{title}</h3>{children.length ? children : <p className="empty-state">{empty}</p>}</article>; }
function StatusBadge({ value }: { value: string }) { return <em className={`status-badge status-${value}`}>{statusLabel[value] ?? (value === 'completed' ? 'Completada' : value === 'cancelled' ? 'Cancelada' : value)}</em>; }
function TrackingPanel() { return <section className="utility-panel"><div><p className="panel-eyebrow">Rastreo público</p><h2>Consulta para clientes sin entrar al panel.</h2><p>Usa esta vista para probar folios REP desde la experiencia pública.</p></div><a className="panel-primary ghost-link" href="/#rastrear" target="_blank" rel="noreferrer"><ExternalLink />Abrir rastreador</a></section>; }

function ModuleDisabled({ module }: { module: BusinessModule }) {
  return <section className="utility-panel module-disabled"><div><p className="panel-eyebrow">Módulo no activado</p><h2>{module.label}</h2><p>Este negocio no tiene activo el módulo de {module.label.toLowerCase()}. Puedes activarlo desde Configuración &gt; Módulos del negocio si tu rol tiene permiso.</p></div><Settings /></section>;
}

function SuppliersView({ token, role }: { token: string; role: Role }) {
  const [items, setItems] = useState<Supplier[]>([]);
  const [edit, setEdit] = useState<Supplier | null>(null);
  const [error, setError] = useState('');
  const canManage = role === 'admin' || role === 'manager';
  const load = useCallback(async () => { try { setItems((await apiRequest<{ items: Supplier[] }>('/api/operations/suppliers?includeInactive=true', {}, token)).items); } catch (e) { setError(e instanceof Error ? e.message : 'No fue posible cargar proveedores.'); } }, [token]);
  useEffect(() => { void load(); }, [load]);
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canManage) return;
    const form = new FormData(event.currentTarget);
    const body = { name: form.get('name'), contactName: form.get('contactName') || null, phone: form.get('phone') || null, email: form.get('email') || null, notes: form.get('notes') || null, active: form.get('active') === 'on' };
    await apiRequest(edit ? `/api/operations/suppliers/${edit.id}` : '/api/operations/suppliers', { method: edit ? 'PATCH' : 'POST', body: JSON.stringify(body) }, token);
    setEdit(null);
    event.currentTarget.reset();
    await load();
  }
  async function archive(id: string) { if (!confirm('¿Archivar este proveedor? Sus compras históricas se conservan.')) return; await apiRequest(`/api/operations/suppliers/${id}`, { method: 'DELETE' }, token); await load(); }
  return <ModuleLayout title={edit ? 'Editar proveedor' : 'Registrar proveedor'} icon={<Truck />} form={canManage ? <form className="ops-form" onSubmit={save} key={edit?.id ?? 'new'}><label>Proveedor<input name="name" defaultValue={edit?.name} required /></label><label>Contacto<input name="contactName" defaultValue={edit?.contactName ?? ''} /></label><label>Teléfono<input name="phone" defaultValue={edit?.phone ?? ''} /></label><label>Correo<input name="email" type="email" defaultValue={edit?.email ?? ''} /></label><label className="wide">Notas<textarea name="notes" defaultValue={edit?.notes ?? ''} /></label><label className="wide setting-toggle"><input name="active" type="checkbox" defaultChecked={edit?.active ?? true} /><span><b>Proveedor activo</b><small>Los proveedores inactivos se conservan para historial.</small></span></label><div className="form-actions">{edit && <button type="button" onClick={() => setEdit(null)}>Cancelar</button>}<button className="panel-primary">Guardar proveedor</button></div></form> : <p className="inventory-readonly">Tu rol puede consultar proveedores, pero solo admin o manager pueden gestionarlos.</p>}>{error && <p className="panel-alert">{error}</p>}<DataTable empty="Proveedores está activo, pero aún no hay registros.">{items.map((supplier) => <div className="data-row supplier-row" key={supplier.id}><div><b>{supplier.name}</b><span>{supplier.contactName ?? 'Sin contacto'}</span></div><span>{supplier.phone ?? 'Sin teléfono'}</span><span>{supplier.active ? 'Activo' : 'Inactivo'}</span><div className="row-actions">{canManage && <button onClick={() => setEdit(supplier)}>Editar</button>}{canManage && <button onClick={() => void archive(supplier.id)}>Archivar</button>}</div></div>)}</DataTable></ModuleLayout>;
}

function PurchasesView({ token, role, products, currency }: { token: string; role: Role; products: Product[]; currency: string }) {
  const [items, setItems] = useState<Purchase[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [productOptions, setProductOptions] = useState<Product[]>(products);
  const [selected, setSelected] = useState<Purchase | null>(null);
  const [error, setError] = useState('');
  const canManage = role === 'admin' || role === 'manager';
  const load = useCallback(async () => {
    try {
      const [purchaseData, supplierData, productData] = await Promise.all([
        apiRequest<{ items: Purchase[] }>('/api/operations/purchases', {}, token),
        apiRequest<{ items: Supplier[] }>('/api/operations/suppliers', {}, token),
        apiRequest<{ items: Product[] }>('/api/operations/products?limit=100', {}, token),
      ]);
      setItems(purchaseData.items);
      setSuppliers(supplierData.items);
      setProductOptions(productData.items);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No fue posible cargar compras.');
    }
  }, [token]);
  useEffect(() => { void load(); }, [load]);
  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const result = await apiRequest<{ item: Purchase }>('/api/operations/purchases', { method: 'POST', body: JSON.stringify({ supplierId: form.get('supplierId'), notes: form.get('notes') || null, status: 'draft' }) }, token);
    setSelected(result.item);
    event.currentTarget.reset();
    await load();
  }
  async function addLine(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) return;
    const form = new FormData(event.currentTarget);
    await apiRequest(`/api/operations/purchases/${selected.id}/items`, { method: 'POST', body: JSON.stringify({ productId: form.get('productId'), quantity: Number(form.get('quantity')), unitCostCents: Math.round(Number(form.get('unitCost') || 0) * 100) }) }, token);
    event.currentTarget.reset();
    const detail = await apiRequest<{ item: Purchase }>(`/api/operations/purchases/${selected.id}`, {}, token);
    setSelected(detail.item);
    await load();
  }
  async function receive(id: string) { if (!confirm('¿Recibir esta compra y aumentar stock?')) return; await apiRequest(`/api/operations/purchases/${id}/receive`, { method: 'POST', body: JSON.stringify({ note: 'Recepción desde panel' }) }, token); await load(); setSelected(null); }
  return <div className="purchase-workbench"><ModuleLayout title="Nueva compra" icon={<ClipboardCheck />} form={canManage ? <form className="ops-form" onSubmit={create}><label className="wide">Proveedor<select name="supplierId" required><option value="">Seleccionar</option>{suppliers.map((supplier) => <option value={supplier.id} key={supplier.id}>{supplier.name}</option>)}</select></label><label className="wide">Notas<textarea name="notes" /></label><div className="form-actions"><button className="panel-primary">Crear compra</button></div></form> : <p className="inventory-readonly">Tu rol puede consultar compras, pero solo admin o manager pueden gestionarlas.</p>}>{error && <p className="panel-alert">{error}</p>}<DataTable empty="Compras está activo, pero aún no hay órdenes.">{items.map((purchase) => <div className="data-row purchase-row" key={purchase.id}><div><b>{purchase.folio}</b><span>{purchase.supplierName} · {date(purchase.createdAt)}</span></div><span>{purchase.status}</span><b>{money(purchase.subtotalCents, currency)}</b><div className="row-actions"><button onClick={async () => setSelected((await apiRequest<{ item: Purchase }>(`/api/operations/purchases/${purchase.id}`, {}, token)).item)}>Detalle</button>{canManage && purchase.status !== 'received' && purchase.status !== 'cancelled' && <button onClick={() => void receive(purchase.id)}>Recibir</button>}</div></div>)}</DataTable></ModuleLayout>{selected && <section className="records-panel purchase-detail"><header><div><p className="panel-eyebrow">Detalle de compra</p><h2>{selected.folio}</h2></div><button className="text-action" onClick={() => setSelected(null)}>Cerrar</button></header>{canManage && selected.status !== 'received' && selected.status !== 'cancelled' && <form className="ops-form" onSubmit={addLine}><label>Producto<select name="productId" required><option value="">Seleccionar</option>{productOptions.map((product) => <option value={product.id} key={product.id}>{product.name} · {product.sku}</option>)}</select></label><label>Cantidad<input name="quantity" type="number" min="1" defaultValue="1" required /></label><label>Costo unitario<input name="unitCost" type="number" min="0" step=".01" required /></label><div className="form-actions"><button className="panel-primary">Agregar producto</button></div></form>}<DataTable empty="Agrega productos para recibir la compra.">{(selected.items ?? []).map((line) => <div className="data-row purchase-item-row" key={line.id}><div><b>{line.productName}</b><span>Recibido {line.receivedQuantity} de {line.quantity}</span></div><span>{money(line.unitCostCents, currency)}</span><b>{money(line.totalCents, currency)}</b></div>)}</DataTable></section>}</div>;
}

function ReportsPanel({ token, currency }: { token: string; currency: string }) {
  const today = new Date().toISOString().slice(0, 10); const [from, setFrom] = useState(today); const [to, setTo] = useState(today); const [report, setReport] = useState<ReportSummary | null>(null); const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
  const load = useCallback(async () => { setBusy(true); setError(''); try { setReport(await apiRequest<ReportSummary>(`/api/operations/reports/basic?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`, {}, token)); } catch (e) { setError(e instanceof Error ? e.message : 'No fue posible cargar reportes.'); } finally { setBusy(false); } }, [from, to, token]);
  useEffect(() => { void load(); }, [load]);
  return <section className="reports-workbench"><div className="reports-hero"><div><p className="panel-eyebrow">Reportes básicos</p><h2>Corte operativo por rango</h2><p>Consulta ingresos POS, reparaciones, stock bajo y movimientos recientes.</p></div><form className="report-filter" onSubmit={(event) => { event.preventDefault(); void load(); }}><label>Desde<input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></label><label>Hasta<input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></label><button className="panel-primary" disabled={busy}>{busy ? 'Consultando…' : 'Actualizar'}</button></form></div>{error && <p className="panel-alert">{error}</p>}<div className="report-preview report-preview--live"><article><span>Ingresos</span><b>{money(report?.incomeCents ?? 0, currency)}</b><small>{report?.salesCount ?? 0} ventas completadas</small></article><article><span>Pendientes</span><b>{report?.pendingRepairs ?? 0}</b><small>Reparaciones abiertas</small></article><article><span>Entregadas</span><b>{report?.deliveredRepairs ?? 0}</b><small>En el rango seleccionado</small></article><article><span>Stock bajo</span><b>{report?.lowStockProducts ?? 0}</b><small>Productos por reponer</small></article></div><article className="recent-panel report-movements"><h3>Movimientos recientes</h3>{report?.recentMovements?.length ? report.recentMovements.map((m) => <div className="activity-row" key={m.id}><span><b>{movementLabel(m.type)}</b><small>{m.productName} · {m.userName} · {date(m.createdAt)}</small></span><strong>{m.previousStock} → {m.newStock}</strong></div>) : <p className="empty-state">Sin movimientos recientes.</p>}</article></section>;
}

function Clients({ token, items, reload }: { token: string; items: Client[]; reload: () => Promise<void> }) {
  const [edit, setEdit] = useState<Client | null>(null);
  async function save(e: FormEvent<HTMLFormElement>) { e.preventDefault(); const f = new FormData(e.currentTarget); const body = { name: f.get('name'), phone: f.get('phone'), email: f.get('email') || null, notes: f.get('notes') || null }; await apiRequest(edit ? `/api/operations/clients/${edit.id}` : '/api/operations/clients', { method: edit ? 'PATCH' : 'POST', body: JSON.stringify(body) }, token); setEdit(null); e.currentTarget.reset(); await reload(); }
  async function remove(id: string) { if (!confirm('¿Archivar este cliente? Su historial se conservará.')) return; await apiRequest(`/api/operations/clients/${id}`, { method: 'DELETE' }, token); await reload(); }
  return <ModuleLayout title={edit ? 'Editar cliente' : 'Registrar cliente'} icon={<UserPlus />} form={<form className="ops-form" onSubmit={save} key={edit?.id ?? 'new'}><label>Nombre<input name="name" defaultValue={edit?.name} required /></label><label>Teléfono<input name="phone" defaultValue={edit?.phone} required /></label><label>Correo<input name="email" type="email" defaultValue={edit?.email ?? ''} /></label><label className="wide">Notas<textarea name="notes" defaultValue={edit?.notes ?? ''} /></label><div className="form-actions">{edit && <button type="button" onClick={() => setEdit(null)}>Cancelar</button>}<button className="panel-primary">Guardar cliente</button></div></form>}><DataTable empty="Aún no hay clientes. Registra el primero.">{items.map((x) => <div className="data-row client-row" key={x.id}><div><b>{x.name}</b><span>{x.phone}</span></div><span>{x.email ?? 'Sin correo'}</span><div className="row-actions"><button onClick={() => setEdit(x)}>Editar</button><button onClick={() => void remove(x.id)}>Archivar</button></div></div>)}</DataTable></ModuleLayout>;
}

function Products({ token, role, items, reload, currency }: { token: string; role: Role; items: Product[]; reload: () => Promise<void>; currency: string }) {
  const [edit, setEdit] = useState<Product | null>(null); const canManageInventory = role === 'admin' || role === 'manager';
  async function save(e: FormEvent<HTMLFormElement>) { e.preventDefault(); const f = new FormData(e.currentTarget); const body = { sku: f.get('sku'), name: f.get('name'), costCents: Math.round(Number(f.get('cost') || 0) * 100), priceCents: Math.round(Number(f.get('price')) * 100), stock: Number(f.get('stock')), minimumStock: Number(f.get('minimumStock')), active: true }; await apiRequest(edit ? `/api/operations/products/${edit.id}` : '/api/operations/products', { method: edit ? 'PATCH' : 'POST', body: JSON.stringify(body) }, token); setEdit(null); await reload(); }
  async function remove(id: string) { if (!confirm('¿Archivar este producto?')) return; await apiRequest(`/api/operations/products/${id}`, { method: 'DELETE' }, token); await reload(); }
  return <ModuleLayout title={edit ? 'Editar producto' : 'Alta de inventario'} icon={<PackagePlus />} form={canManageInventory ? <form className="ops-form" onSubmit={save} key={edit?.id ?? 'new'}><label>SKU<input name="sku" defaultValue={edit?.sku} required /></label><label>Producto<input name="name" defaultValue={edit?.name} required /></label><label>Costo MXN<input name="cost" type="number" step=".01" min="0" defaultValue={edit ? (edit.costCents ?? 0) / 100 : ''} /></label><label>Precio MXN<input name="price" type="number" step=".01" min="0" defaultValue={edit ? edit.priceCents / 100 : ''} required /></label><label>Existencia<input name="stock" type="number" min="0" defaultValue={edit?.stock ?? 0} required /></label><label>Stock mínimo<input name="minimumStock" type="number" min="0" defaultValue={edit?.minimumStock ?? 0} required /></label><div className="form-actions">{edit && <button type="button" onClick={() => setEdit(null)}>Cancelar</button>}<button className="panel-primary">Guardar producto</button></div></form> : <p className="inventory-readonly">Tu rol puede consultar inventario, pero solo admin o manager pueden modificar productos y existencias.</p>}><DataTable empty="El inventario está vacío."><div className="data-head product-row"><span>Producto</span><span>Precio</span><span>Stock</span><span>Acciones</span></div>{items.map((x) => <div className="data-row product-row" key={x.id}><div><b>{x.name}</b><span>{x.sku}</span></div><b>{money(x.priceCents, currency)}{canManageInventory && x.costCents !== undefined && <small>Costo {money(x.costCents, currency)}</small>}</b><span className={x.stock <= x.minimumStock ? 'stock-low' : ''}>{x.stock} pzas.</span><div className="row-actions">{canManageInventory && <button onClick={() => setEdit(x)}>Editar</button>}{role === 'admin' && <button onClick={() => void remove(x.id)}>Archivar</button>}</div></div>)}</DataTable></ModuleLayout>;
}

function Repairs({ token, items, clients, reload, onOpenRepair }: { token: string; items: Repair[]; clients: Client[]; reload: () => Promise<void>; onOpenRepair: (id: string) => void }) {
  const [localClients, setLocalClients] = useState<Client[]>(clients);
  const [selectedClientId, setSelectedClientId] = useState('');
  const [clientQuery, setClientQuery] = useState('');
  const [quickName, setQuickName] = useState('');
  const [quickPhone, setQuickPhone] = useState('');
  const [message, setMessage] = useState('');
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [creatingClient, setCreatingClient] = useState(false);
  const normalize = (value: string) => value.trim().toLowerCase();
  const selectedClient = localClients.find((client) => client.id === selectedClientId) ?? null;
  const hasClientQuery = clientQuery.trim().length > 0;
  const matchingClients = hasClientQuery ? localClients.filter((client) => normalize(`${client.name} ${client.phone}`).includes(normalize(clientQuery))).slice(0, 5) : [];

  useEffect(() => { setLocalClients(clients); }, [clients]);

  function updateClientQuery(value: string) {
    setClientQuery(value);
    setSelectedClientId('');
    setMessage('');
    setFormError('');
    if (/^\+?[\d\s().-]+$/.test(value.trim())) setQuickPhone(value.trim());
    else if (value.trim().length > 1) setQuickName(value.trim());
  }

  function selectClient(client: Client) {
    setSelectedClientId(client.id);
    setClientQuery(`${client.name} · ${client.phone}`);
    setQuickName('');
    setQuickPhone('');
    setMessage('Cliente seleccionado. El folio queda listo para capturar.');
    setFormError('');
  }

  async function createQuickClient() {
    const name = quickName.trim();
    const phone = quickPhone.trim();
    if (name.length < 2 || phone.length < 8) {
      setFormError('Captura nombre y teléfono para crear el cliente rápido.');
      return null;
    }
    setCreatingClient(true);
    setFormError('');
    try {
      const result = await apiRequest<{ item: Client }>('/api/operations/clients', { method: 'POST', body: JSON.stringify({ name, phone, email: null, notes: null }) }, token);
      setLocalClients((current) => [result.item, ...current.filter((client) => client.id !== result.item.id)]);
      selectClient(result.item);
      return result.item;
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'No fue posible crear el cliente rápido.');
      return null;
    } finally {
      setCreatingClient(false);
    }
  }

  async function resolveClientId() {
    if (selectedClientId) return selectedClientId;
    const created = await createQuickClient();
    return created?.id ?? '';
  }

  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (saving) return;
    const formElement = e.currentTarget;
    const formData = new FormData(formElement);
    setSaving(true);
    setMessage('');
    setFormError('');
    try {
      const clientId = await resolveClientId();
      if (!clientId) return;
      const result = await apiRequest<{ item: { id: string } }>('/api/operations/repairs', { method: 'POST', body: JSON.stringify({ clientId, brand: formData.get('brand'), model: formData.get('model'), reportedIssue: formData.get('reportedIssue'), physicalCondition: formData.get('physicalCondition'), depositCents: Math.round(Number(formData.get('deposit') || 0) * 100) }) }, token);
      formElement.reset();
      setSelectedClientId('');
      setClientQuery('');
      setQuickName('');
      setQuickPhone('');
      await reload();
      onOpenRepair(result.item.id);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'No fue posible crear el folio.');
    } finally {
      setSaving(false);
    }
  }
  async function move(id: string, status: string) { await apiRequest(`/api/operations/repairs/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }, token); await reload(); }
  return <ModuleLayout title="Recibir un equipo" icon={<Wrench />} form={<form className="ops-form repair-form repair-intake-form" onSubmit={save}><section className="quick-client-card wide"><div className="quick-client-card__head"><div><span>Cliente de mostrador</span><small>Buscar o crear con datos mínimos sin salir del folio.</small></div>{selectedClient && <button type="button" className="text-action" onClick={() => { setSelectedClientId(''); setClientQuery(''); setMessage(''); }}>Cambiar</button>}</div>{selectedClient ? <div className="selected-client"><b>{selectedClient.name}</b><span>{selectedClient.phone}</span></div> : <><label className="quick-client-search">Buscar cliente<input value={clientQuery} onChange={(event) => updateClientQuery(event.target.value)} placeholder="Nombre o teléfono" autoComplete="off" /></label>{matchingClients.length > 0 && <div className="quick-client-results">{matchingClients.map((client) => <button type="button" key={client.id} className="quick-client-result" onClick={() => selectClient(client)}><b>{client.name}</b><span>{client.phone}</span></button>)}</div>}<div className="quick-client-create"><label>Nombre<input value={quickName} onChange={(event) => { setQuickName(event.target.value); setFormError(''); }} placeholder="Nombre completo" /></label><label>Teléfono<input value={quickPhone} onChange={(event) => { setQuickPhone(event.target.value); setFormError(''); }} placeholder="10 dígitos" /></label><button type="button" className="quick-client-create__button" disabled={creatingClient || quickName.trim().length < 2 || quickPhone.trim().length < 8} onClick={() => void createQuickClient()}>{creatingClient ? 'Creando…' : 'Crear y seleccionar'}</button></div></>}{message && <p className="settings-message">{message}</p>}{formError && <p className="form-error">{formError}</p>}</section><label>Marca<input name="brand" required /></label><label>Modelo<input name="model" required /></label><label>Anticipo MXN<input name="deposit" type="number" min="0" step=".01" defaultValue="0" /></label><label className="wide">Falla reportada<textarea name="reportedIssue" required /></label><label className="wide">Condición física al recibir<textarea name="physicalCondition" required /></label><div className="form-actions"><small className="repair-fast-tip">Al crear, abrimos el detalle del folio automáticamente.</small><button className="panel-primary" disabled={saving || creatingClient}>{saving ? 'Creando folio…' : 'Crear folio y abrir detalle'}</button></div></form>}><DataTable empty="No hay reparaciones registradas.">{items.map((x) => <div className="repair-ticket" key={x.id}><div className="ticket-folio"><small>Folio</small><b>{x.folio}</b></div><div><b>{x.brand} {x.model}</b><span>{x.clientName} · {x.clientPhone}</span><p>{x.reportedIssue}</p></div><label>Estado<select value={x.status} onChange={(e) => void move(x.id, e.target.value)}>{states.map((s) => <option value={s} key={s}>{statusLabel[s]}</option>)}</select></label><button type="button" className="text-action" onClick={() => onOpenRepair(x.id)}>Ver detalle</button><span className={`status-dot status-${x.status}`}>{statusLabel[x.status]}</span></div>)}</DataTable></ModuleLayout>;
}

function ModuleSettings({ token, role, modules, onChanged }: { token: string; role: Role; modules: BusinessModule[]; onChanged: () => Promise<void> }) {
  const [message, setMessage] = useState('');
  const canManage = role === 'admin' || role === 'manager';
  const byKey = new Map(modules.map((module) => [module.key, module]));
  const optionalModules = modules.filter((module) => !module.isCore);
  async function toggle(module: BusinessModule) {
    if (!canManage || module.isCore) return;
    setMessage('');
    try {
      await apiRequest(`/api/operations/modules/${module.key}`, { method: 'PATCH', body: JSON.stringify({ enabled: !module.enabled }) }, token);
      await onChanged();
      setMessage(`${module.label} ${module.enabled ? 'desactivado' : 'activado'}.`);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'No fue posible actualizar el módulo.');
    }
  }
  return <section className="settings-section business-modules-section"><header><span>Módulos del negocio</span><p>LocalPOS puede operar simple. Activa solo los módulos que este negocio necesita.</p></header><div className="module-toggle-grid">{optionalModules.map((module) => { const dependencies = (module.dependsOn ?? []).map((key) => byKey.get(key)?.label ?? key); return <article className={`module-toggle-card ${module.enabled ? 'is-enabled' : ''}`} key={module.key}><div><b>{module.label}</b><p>{module.description}</p>{dependencies.length > 0 && <small>Requiere: {dependencies.join(', ')}.</small>}</div><button type="button" disabled={!canManage} aria-pressed={module.enabled} onClick={() => void toggle(module)}>{module.enabled ? 'Activo' : 'Apagado'}</button></article>; })}</div><div className="settings-note"><b>Módulos base</b><span>Venta rápida, caja e inventario básico se mantienen activos para preservar el POS simple.</span></div>{message && <p className="settings-message">{message}</p>}</section>;
}

function BusinessConfiguration({ token, item, role, modules, onModulesChanged, onSaved }: { token: string; item: BusinessSettings; role: Role; modules: BusinessModule[]; onModulesChanged: () => Promise<void>; onSaved: () => Promise<void> }) {
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const canEdit = role === 'admin';

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canEdit) return;
    setSaving(true);
    setMessage('');
    const form = new FormData(event.currentTarget);
    const value = (name: string) => String(form.get(name) ?? '').trim() || null;
    const body = {
      businessName: value('businessName'),
      businessType: value('businessType'),
      logoUrl: value('logoUrl'),
      phone: value('phone'),
      address: value('address'),
      city: value('city'),
      state: value('state'),
      ticketMessage: value('ticketMessage'),
      warrantyMessage: value('warrantyMessage'),
      currency: String(form.get('currency') ?? 'MXN'),
      primaryColor: String(form.get('primaryColor') ?? '#0A84FF'),
      requireOpenCashForMoneyOperations: form.get('requireOpenCashForMoneyOperations') === 'on',
      timezone: String(form.get('timezone') ?? 'America/Mexico_City').trim() || 'America/Mexico_City',
    };

    try {
      await apiRequest('/api/operations/business-settings', { method: 'PATCH', body: JSON.stringify(body) }, token);
      await onSaved();
      setMessage('Configuración guardada.');
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'No fue posible guardar la configuración.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
    <div className="settings-grid">
      <section className="settings-form-card">
        <div className="settings-intro">
          <div>
            <p className="panel-eyebrow">Configuración operativa</p>
            <h2>Negocio, tickets, caja y políticas</h2>
            <p>CelLab es el piloto configurado; LocalPOS sigue operando como single-business hasta que exista un modelo real de multiempresa.</p>
          </div>
          <span className={canEdit ? 'role-chip role-admin' : 'role-chip'}>{canEdit ? 'Admin · edición habilitada' : 'Solo lectura de configuración'}</span>
        </div>

        <form className="settings-form" onSubmit={save} key={item.updatedAt}>
          <section className="settings-section">
            <header>
              <span>Negocio</span>
              <p>Datos visibles en panel, landing, recibos y rastreo público.</p>
            </header>
            <div className="settings-fields">
              <label>Nombre comercial<input name="businessName" defaultValue={item.businessName} disabled={!canEdit} required /></label>
              <label>Tipo de negocio<input name="businessType" defaultValue={item.businessType} disabled={!canEdit} required /></label>
              <label>Teléfono<input name="phone" defaultValue={item.phone ?? ''} disabled={!canEdit} /></label>
              <label>URL del logotipo<input name="logoUrl" type="url" defaultValue={item.logoUrl ?? ''} disabled={!canEdit} placeholder="https://…" /></label>
              <label className="wide">Dirección<input name="address" defaultValue={item.address ?? ''} disabled={!canEdit} /></label>
              <label>Ciudad<input name="city" defaultValue={item.city ?? ''} disabled={!canEdit} /></label>
              <label>Estado<input name="state" defaultValue={item.state ?? ''} disabled={!canEdit} /></label>
            </div>
          </section>

          <section className="settings-section">
            <header>
              <span>Tickets</span>
              <p>Mensajes impresos y apariencia de notas. No agregan datos privados.</p>
            </header>
            <div className="settings-fields">
              <label>Color principal<input name="primaryColor" type="color" defaultValue={item.primaryColor} disabled={!canEdit} /></label>
              <label>Moneda<input name="currency" defaultValue={item.currency} maxLength={3} disabled={!canEdit} required /></label>
              <label className="wide">Mensaje para tickets<textarea name="ticketMessage" defaultValue={item.ticketMessage ?? ''} disabled={!canEdit} /></label>
            </div>
          </section>

          <section className="settings-section">
            <header>
              <span>Caja</span>
              <p>Política operativa para ventas, pagos, cancelaciones y movimientos con dinero.</p>
            </header>
            <div className="settings-fields">
              <label>Zona horaria<input name="timezone" defaultValue={item.timezone ?? 'America/Mexico_City'} disabled={!canEdit} required /></label>
              <label className="wide setting-toggle">
                <input name="requireOpenCashForMoneyOperations" type="checkbox" defaultChecked={item.requireOpenCashForMoneyOperations} disabled={!canEdit} />
                <span className="setting-toggle__box" aria-hidden="true" />
                <span>
                  <b>Requerir caja abierta para operaciones con dinero</b>
                  <small>Si está activo, ventas, pagos y cancelaciones se bloquean cuando no hay caja abierta.</small>
                </span>
              </label>
            </div>
          </section>

          <section className="settings-section">
            <header>
              <span>Garantías</span>
              <p>Texto base para notas de reparación y entrega.</p>
            </header>
            <div className="settings-fields">
              <label className="wide">Mensaje de garantía<textarea name="warrantyMessage" defaultValue={item.warrantyMessage ?? ''} disabled={!canEdit} /></label>
            </div>
          </section>

          <section className="settings-section settings-section--readonly">
            <header>
              <span>Usuarios</span>
              <p>Hito 11 habilita gestión de usuarios, roles extendidos y auditoría inicial desde el bloque administrativo inferior.</p>
            </header>
            <div className="settings-note">
              <b>Roles activos</b>
              <span>Admin, encargado, mostrador, técnico y consulta. Las acciones sensibles se bloquean en backend, no solo en la interfaz.</span>
            </div>
          </section>

          <ModuleSettings token={token} role={role} modules={modules} onChanged={onModulesChanged} />

          <section className="settings-section settings-section--readonly">
            <header>
              <span>Avanzado</span>
              <p>Multiempresa, sucursales y emisores genéricos son deuda técnica planificada, no funciones activas.</p>
            </header>
            <div className="settings-note">
              <b>Contrato Hito 10</b>
              <span>No exponer multiempresa real ni cambiar namespaces/JWT en el mismo paso que mejoras operativas.</span>
            </div>
          </section>

          {message && <p className="settings-message">{message}</p>}
          {canEdit && <div className="form-actions"><button className="panel-primary" disabled={saving}>{saving ? 'Guardando…' : 'Guardar configuración'}</button></div>}
        </form>
      </section>

      <aside className="business-preview" style={{ '--preview-color': item.primaryColor } as CSSProperties}>
        <p>Vista para notas</p>
        <div className="preview-logo">{item.logoUrl ? <img src={item.logoUrl} alt="Logotipo configurado" /> : <span>LP</span>}</div>
        <h3>{item.businessName}</h3>
        <small>{item.businessType}</small>
        <address>{[item.address, item.city, item.state].filter(Boolean).join(' · ')}</address>
        <b>{item.phone}</b>
        <div className="preview-rule" />
        <p>{item.ticketMessage}</p>
        <em>{item.warrantyMessage}</em>
        <footer>{item.currency} · {item.timezone} · Caja obligatoria: {item.requireOpenCashForMoneyOperations ? 'Sí' : 'No'}</footer>
      </aside>
    </div>
    <UserAdminView token={token} role={role} />
    </>
  );
}

function ModuleLayout({ title, icon, form, children }: { title: string; icon: ReactNode; form: ReactNode; children: ReactNode }) { return <div className="module-grid"><aside className="capture-panel"><h2>{icon}{title}</h2>{form}</aside><section className="records-panel">{children}</section></div>; }
function DataTable({ empty, children }: { empty: string; children: ReactNode }) { return <div className="data-table">{Array.isArray(children) && children.length === 0 ? <p className="empty-state">{empty}</p> : children}</div>; }
