import { featuredProducts } from './landingData';

export function ProductsSection() {
  return (
    <section className="lp-section lp-products" id="productos" aria-labelledby="products-title">
      <div className="lp-section-head lp-section-head--split" data-reveal>
        <div>
          <p className="lp-eyebrow">Más que reparación</p>
          <h2 id="products-title">Protección, carga y audio elegidos para durar.</h2>
        </div>
        <p>
          Encuentra lo necesario para cuidar el equipo después de repararlo. Te ayudamos a comprobar
          compatibilidad antes de comprar.
        </p>
      </div>

      <div className="lp-product-shelf">
        {featuredProducts.map((product, index) => (
          <article className="lp-product-card" data-reveal key={product.title} style={{ transitionDelay: `${index * 45}ms` }}>
            <span className="lp-product-card__index">{String(index + 1).padStart(2, '0')}</span>
            <span className="lp-product-card__tag">{product.tag}</span>
            <h3>{product.title}</h3>
            <p>{product.description}</p>
            <a href="#contacto">Consultar disponibilidad <span aria-hidden="true">↗</span></a>
          </article>
        ))}
      </div>
    </section>
  );
}
