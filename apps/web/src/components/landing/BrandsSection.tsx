import { useMemo, useState } from 'react';
import { WhatsAppIcon } from './icons';
import { brands, quoteIssues } from './landingData';
import { buildWhatsappLink, useBusinessProfile } from '../../hooks/useBusinessProfile';

export function BrandsSection() {
  const [activeBrandId, setActiveBrandId] = useState(brands[0].id);
  const [selectedModel, setSelectedModel] = useState('');
  const [selectedIssue, setSelectedIssue] = useState('');
  const { profile } = useBusinessProfile();
  const activeBrand = brands.find((brand) => brand.id === activeBrandId) ?? brands[0];

  const quoteLink = useMemo(() => {
    const fallbackMessage = 'Hola CelLab Tuxtla. Quiero cotizar una reparación.';
    if (!selectedModel || !selectedIssue) return buildWhatsappLink(profile, fallbackMessage) ?? '#contacto';

    const message = [
      'Hola CelLab Tuxtla. Quiero cotizar una reparación.',
      '',
      `Marca: ${activeBrand.name}`,
      `Modelo: ${selectedModel}`,
      `Falla: ${selectedIssue}`,
      '',
      '¿Pueden confirmarme disponibilidad, precio aproximado y tiempo de reparación?',
    ].join('\n');

    return buildWhatsappLink(profile, message) ?? '#contacto';
  }, [activeBrand.name, profile, selectedIssue, selectedModel]);

  const changeBrand = (brandId: string) => {
    setActiveBrandId(brandId);
    setSelectedModel('');
    setSelectedIssue('');
  };

  return (
    <section className="lp-section lp-brands" id="marcas" aria-labelledby="brands-title">
      <div className="lp-section-head lp-section-head--split" data-reveal>
        <div>
          <p className="lp-eyebrow">Cotizador guiado</p>
          <h2 id="brands-title">Selecciona tu equipo. Nosotros hacemos las preguntas correctas.</h2>
        </div>
        <p>Reparamos, configuramos y revisamos liberación en las marcas más comunes. Elige modelo y falla para preparar un mensaje útil para el técnico.</p>
      </div>

      <div className="lp-brand-lab" data-reveal>
        <div className="lp-brand-tabs" role="tablist" aria-label="Marcas de celulares">
          {brands.map((brand) => (
            <button className={brand.id === activeBrand.id ? 'is-active' : ''} type="button" role="tab" aria-selected={brand.id === activeBrand.id} aria-label={`${brand.name}: ${brand.family}`} key={brand.id} onClick={() => changeBrand(brand.id)}>
              <span>{brand.name}</span>
              <small>{brand.family}</small>
            </button>
          ))}
        </div>

        <div className="lp-brand-panel" role="tabpanel" aria-live="polite">
          <div className="lp-brand-panel__intro">
            <span>Marca seleccionada · {activeBrand.name}</span>
            <h3>{activeBrand.family}</h3>
            <p>{activeBrand.note}</p>
          </div>

          <div className="lp-quote-progress" aria-label="Progreso del mensaje de cotización">
            <span className="is-done">Marca</span>
            <span className={selectedModel ? 'is-done' : 'is-current'}>Modelo</span>
            <span className={selectedIssue ? 'is-done' : selectedModel ? 'is-current' : ''}>Falla</span>
          </div>

          <div className="lp-choice-block">
            <h4>1. ¿Cuál es tu modelo?</h4>
            <div className="lp-model-grid">
              {activeBrand.models.map((model) => (
                <button type="button" key={model} className={selectedModel === model ? 'is-selected' : ''} aria-pressed={selectedModel === model} onClick={() => { setSelectedModel(model); setSelectedIssue(''); }}>
                  {model}
                </button>
              ))}
            </div>
          </div>

          <div className={selectedModel ? 'lp-choice-block' : 'lp-choice-block is-disabled'}>
            <h4>2. ¿Qué problema presenta?</h4>
            <div className="lp-issue-grid">
              {quoteIssues.map((issue) => (
                <button type="button" key={issue} disabled={!selectedModel} className={selectedIssue === issue ? 'is-selected' : ''} aria-pressed={selectedIssue === issue} onClick={() => setSelectedIssue(issue)}>
                  {issue}
                </button>
              ))}
            </div>
          </div>

          <div className={selectedIssue ? 'lp-quote-ready is-ready' : 'lp-quote-ready'}>
            <div>
              <span>{selectedIssue ? 'Diagnóstico inicial listo' : 'Completa los dos pasos'}</span>
              <strong>{selectedModel && selectedIssue ? `${activeBrand.name} · ${selectedModel} · ${selectedIssue}` : 'Te guiamos en menos de un minuto'}</strong>
            </div>
            <a className="lp-button lp-button--primary" href={quoteLink} target={quoteLink.startsWith('http') ? '_blank' : undefined} rel={quoteLink.startsWith('http') ? 'noreferrer' : undefined}>
              <WhatsAppIcon /> Cotizar este equipo
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
