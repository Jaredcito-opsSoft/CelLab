import { featuredProducts } from './landingData';

export function ProductsSection() {
  return (
    <section className="lp-section lp-products" id="productos" aria-labelledby="products-title">
      <div className="lp-section-head lp-section-head--split" data-reveal>
        <div>
          <p className="lp-eyebrow">Accesorios y venta</p>
          <h2 id="products-title">También cuidamos lo que usas diario.</h2>
        </div>
        <p>
          No todo llega al banco de reparación. También tenemos accesorios prácticos, protección,
          audífonos y algunos teléfonos sujetos a disponibilidad.
        </p>
      </div>

      <div className="lp-product-shelf">
        {featuredProducts.map((product, index) => (
          <article className="lp-product-card" data-reveal key={product.title} style={{ transitionDelay: `${index * 45}ms` }}>
            <span>{product.tag}</span>
            <h3>{product.title}</h3>
            <p>{product.description}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
