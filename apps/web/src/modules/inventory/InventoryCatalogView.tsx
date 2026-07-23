import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { Archive, Barcode, Boxes, Link2, PackagePlus, Pencil, Plus, Search, Tags, X } from 'lucide-react';
import { apiRequest } from '../../lib/api';

type Role = 'admin' | 'manager' | 'staff' | 'technician' | 'viewer';
type Category = { id: string; name: string; active: boolean; productsCount: number };
type Compatibility = { id: string; productId: string; brand: string; model: string };
type Product = {
  id: string;
  sku: string;
  barcode: string | null;
  name: string;
  categoryId: string | null;
  categoryName: string | null;
  costCents?: number;
  priceCents: number;
  stock: number;
  minimumStock: number;
  active: boolean;
  compatibilities: Compatibility[];
};

const money = (cents: number, currency: string) => new Intl.NumberFormat('es-MX', { style: 'currency', currency }).format(cents / 100);

export function InventoryCatalogView({ token, role, currency }: { token: string; role: Role; currency: string }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [search, setSearch] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const canManage = role === 'admin' || role === 'manager';

  const load = useCallback(async () => {
    setBusy(true);
    setError('');
    const params = new URLSearchParams({ limit: '100' });
    if (appliedSearch) params.set('search', appliedSearch);
    if (categoryId) params.set('categoryId', categoryId);
    try {
      const [productData, categoryData] = await Promise.all([
        apiRequest<{ items: Product[] }>(`/api/operations/products?${params.toString()}`, {}, token),
        apiRequest<{ items: Category[] }>(`/api/operations/categories?includeInactive=${canManage}`, {}, token),
      ]);
      setProducts(productData.items);
      setCategories(categoryData.items);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No fue posible cargar el catálogo.');
    } finally {
      setBusy(false);
    }
  }, [appliedSearch, canManage, categoryId, token]);

  useEffect(() => { void load(); }, [load]);
  const selectedProduct = useMemo(() => products.find((product) => product.id === selectedProductId) ?? null, [products, selectedProductId]);
  const activeCategories = categories.filter((category) => category.active);

  async function saveProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canManage) return;
    const form = new FormData(event.currentTarget);
    const payload = {
      sku: String(form.get('sku') ?? '').trim(),
      barcode: String(form.get('barcode') ?? '').trim() || null,
      name: String(form.get('name') ?? '').trim(),
      categoryId: String(form.get('categoryId') ?? '') || null,
      costCents: Math.round(Number(form.get('cost') || 0) * 100),
      priceCents: Math.round(Number(form.get('price') || 0) * 100),
      stock: Number(form.get('stock') || 0),
      minimumStock: Number(form.get('minimumStock') || 0),
      active: true,
    };
    setBusy(true); setError(''); setMessage('');
    try {
      await apiRequest(editingProduct ? `/api/operations/products/${editingProduct.id}` : '/api/operations/products', { method: editingProduct ? 'PATCH' : 'POST', body: JSON.stringify(payload) }, token);
      setEditingProduct(null);
      setMessage(editingProduct ? 'Producto actualizado.' : 'Producto registrado.');
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No fue posible guardar el producto.');
    } finally { setBusy(false); }
  }

  async function archiveProduct(productId: string) {
    setBusy(true); setError(''); setMessage('');
    try {
      await apiRequest(`/api/operations/products/${productId}`, { method: 'DELETE' }, token);
      if (selectedProductId === productId) setSelectedProductId(null);
      setMessage('Producto archivado sin eliminar su historial.');
      await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'No fue posible archivar el producto.'); }
    finally { setBusy(false); }
  }

  async function saveCategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const name = String(form.get('name') ?? '').trim();
    setBusy(true); setError(''); setMessage('');
    try {
      await apiRequest(editingCategory ? `/api/operations/categories/${editingCategory.id}` : '/api/operations/categories', { method: editingCategory ? 'PATCH' : 'POST', body: JSON.stringify({ name }) }, token);
      setEditingCategory(null);
      event.currentTarget.reset();
      setMessage(editingCategory ? 'Categoría actualizada.' : 'Categoría creada.');
      await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'No fue posible guardar la categoría.'); }
    finally { setBusy(false); }
  }

  async function archiveCategory(id: string) {
    setBusy(true); setError(''); setMessage('');
    try {
      await apiRequest(`/api/operations/categories/${id}`, { method: 'DELETE' }, token);
      if (categoryId === id) setCategoryId('');
      setMessage('Categoría archivada; los productos conservaron su clasificación histórica.');
      await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'No fue posible archivar la categoría.'); }
    finally { setBusy(false); }
  }

  async function addCompatibility(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedProduct) return;
    const form = new FormData(event.currentTarget);
    setBusy(true); setError(''); setMessage('');
    try {
      await apiRequest(`/api/operations/products/${selectedProduct.id}/compatibilities`, { method: 'POST', body: JSON.stringify({ brand: form.get('brand'), model: form.get('model') }) }, token);
      event.currentTarget.reset();
      setMessage('Compatibilidad agregada.');
      await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'No fue posible agregar la compatibilidad.'); }
    finally { setBusy(false); }
  }

  async function removeCompatibility(id: string) {
    setBusy(true); setError(''); setMessage('');
    try {
      await apiRequest(`/api/operations/product-compatibilities/${id}`, { method: 'DELETE' }, token);
      setMessage('Compatibilidad eliminada.');
      await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'No fue posible quitar la compatibilidad.'); }
    finally { setBusy(false); }
  }

  return (
    <div className="inventory-catalog">
      <section className="catalog-command">
        <div>
          <p className="panel-eyebrow">Inventario avanzado · fase 1</p>
          <h2>Catálogo identificable y compatible</h2>
          <p>Encuentra piezas por nombre, SKU, código de barras, marca o modelo compatible.</p>
        </div>
        <form className="catalog-search" onSubmit={(event) => { event.preventDefault(); setAppliedSearch(search.trim()); }}>
          <label><Search /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Nombre, SKU, código, marca o modelo" /></label>
          <select aria-label="Filtrar por categoría" value={categoryId} onChange={(event) => setCategoryId(event.target.value)}><option value="">Todas las categorías</option>{activeCategories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select>
          <button className="panel-primary" disabled={busy}>Buscar</button>
        </form>
      </section>

      {(message || error) && <p className={error ? 'panel-alert' : 'settings-message'}>{error || message}</p>}

      <div className="catalog-layout">
        {canManage && <aside className="catalog-tools">
          <form className="ops-form catalog-product-form" onSubmit={saveProduct} key={editingProduct?.id ?? 'new-product'}>
            <div className="catalog-form-title"><PackagePlus /><div><span>{editingProduct ? 'Edición controlada' : 'Alta de producto'}</span><h3>{editingProduct ? editingProduct.name : 'Nuevo producto'}</h3></div></div>
            <label>SKU<input name="sku" defaultValue={editingProduct?.sku ?? ''} required /></label>
            <label><span>Código de barras</span><input name="barcode" defaultValue={editingProduct?.barcode ?? ''} autoComplete="off" /></label>
            <label className="wide">Producto<input name="name" defaultValue={editingProduct?.name ?? ''} required /></label>
            <label className="wide">Categoría<select name="categoryId" defaultValue={editingProduct?.categoryId ?? ''}><option value="">Sin categoría</option>{activeCategories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
            <label>Costo<input name="cost" type="number" min="0" step=".01" defaultValue={editingProduct ? (editingProduct.costCents ?? 0) / 100 : ''} /></label>
            <label>Precio<input name="price" type="number" min="0" step=".01" defaultValue={editingProduct ? editingProduct.priceCents / 100 : ''} required /></label>
            <label>Existencia<input name="stock" type="number" min="0" step="1" defaultValue={editingProduct?.stock ?? 0} required /></label>
            <label>Stock mínimo<input name="minimumStock" type="number" min="0" step="1" defaultValue={editingProduct?.minimumStock ?? 0} required /></label>
            <div className="form-actions">{editingProduct && <button type="button" onClick={() => setEditingProduct(null)}>Cancelar</button>}<button className="panel-primary" disabled={busy}>Guardar producto</button></div>
          </form>

          <section className="category-manager">
            <div className="catalog-form-title"><Tags /><div><span>Clasificación</span><h3>Categorías</h3></div></div>
            <form onSubmit={saveCategory} key={editingCategory?.id ?? 'new-category'}><input name="name" defaultValue={editingCategory?.name ?? ''} placeholder="Nombre de categoría" required minLength={2} /><button disabled={busy}>{editingCategory ? 'Guardar' : <><Plus />Agregar</>}</button>{editingCategory && <button type="button" onClick={() => setEditingCategory(null)}><X /></button>}</form>
            <div className="category-list">{categories.map((category) => <article key={category.id} className={!category.active ? 'is-archived' : ''}><div><b>{category.name}</b><small>{category.productsCount} productos · {category.active ? 'Activa' : 'Archivada'}</small></div>{category.active && <span><button type="button" onClick={() => setEditingCategory(category)} aria-label={`Editar ${category.name}`}><Pencil /></button><button type="button" onClick={() => void archiveCategory(category.id)} aria-label={`Archivar ${category.name}`}><Archive /></button></span>}</article>)}</div>
          </section>
        </aside>}

        <section className="catalog-results">
          <header><div><p className="panel-eyebrow">Existencias</p><h3>{products.length} productos encontrados</h3></div>{busy && <span>Actualizando…</span>}</header>
          {!products.length && !busy ? <p className="empty-state">No hay productos que coincidan con los filtros.</p> : <div className="catalog-product-list">{products.map((product) => <article key={product.id} className={selectedProductId === product.id ? 'is-selected' : ''}>
            <button className="catalog-product-main" type="button" onClick={() => setSelectedProductId(product.id)}>
              <span className="catalog-product-code"><Barcode />{product.barcode || product.sku}</span>
              <b>{product.name}</b>
              <small>{product.categoryName ?? 'Sin categoría'} · SKU {product.sku}</small>
              <div className="compatibility-preview">{product.compatibilities.slice(0, 3).map((item) => <em key={item.id}>{item.brand} {item.model}</em>)}{product.compatibilities.length > 3 && <em>+{product.compatibilities.length - 3}</em>}</div>
            </button>
            <div className="catalog-product-numbers"><strong>{money(product.priceCents, currency)}</strong>{canManage && product.costCents !== undefined && <small>Costo {money(product.costCents, currency)}</small>}<span className={product.stock <= product.minimumStock ? 'stock-low' : ''}>{product.stock} pzas.</span></div>
            {canManage && <div className="catalog-row-actions"><button onClick={() => setEditingProduct(product)}><Pencil />Editar</button>{role === 'admin' && <button onClick={() => void archiveProduct(product.id)}><Archive />Archivar</button>}</div>}
          </article>)}</div>}

          {selectedProduct && <aside className="compatibility-panel">
            <header><div><p className="panel-eyebrow">Compatibilidad de pieza</p><h3>{selectedProduct.name}</h3></div><button onClick={() => setSelectedProductId(null)} aria-label="Cerrar compatibilidades"><X /></button></header>
            {canManage && <form onSubmit={addCompatibility}><label>Marca<input name="brand" placeholder="Samsung" required /></label><label>Modelo<input name="model" placeholder="Galaxy A15" required /></label><button className="panel-primary" disabled={busy}><Link2 />Vincular</button></form>}
            <div className="compatibility-list">{selectedProduct.compatibilities.length ? selectedProduct.compatibilities.map((item) => <span key={item.id}><b>{item.brand}</b> {item.model}{canManage && <button onClick={() => void removeCompatibility(item.id)} aria-label={`Quitar ${item.brand} ${item.model}`}><X /></button>}</span>) : <p className="empty-state">Todavía no hay marcas o modelos vinculados.</p>}</div>
          </aside>}
        </section>
      </div>
    </div>
  );
}
