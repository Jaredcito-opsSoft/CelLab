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
          <p className="lp-eyebrow">Marcas atendidas</p>
          <h2 id="brands-title">Dinos qué equipo tienes. Llegamos mejor preparados.</h2>
        </div>
        <p>Elige marca, modelo y falla. Dejamos listo el mensaje para WhatsApp con la información que el técnico sí necesita.</p>
      </div>

      <div className="lp-brand-lab" data-reveal>
        <div className="lp-brand-tabs" role="tablist" aria-label="Marcas de celulares">
          {brands.map((brand) => (
            <button className={brand.id === activeBrand.id ? 'is-active' : ''} type="button" role="tab" aria-selected={brand.id === activeBrand.id} key={brand.id} onClick={() => changeBrand(brand.id)}>
              <span>{brand.name}</span>
              <small>{brand.family}</small>
            </button>
          ))}
        </div>

        <div className="lp-brand-panel" role="tabpanel" aria-live="polite">
          <div className="lp-brand-panel__intro">
            <span>{activeBrand.name}</span>
            <h3>{activeBrand.family}</h3>
            <p>{activeBrand.note}</p>
          </div>

          <div className="lp-quote-progress" aria-label="Progreso del mensaje de cotización">
            <span className="is-done">Marca</span>
            <span className={selectedModel ? 'is-done' : 'is-current'}>Modelo</span>
            <span className={selectedIssue ? 'is-done' : selectedModel ? 'is-current' : ''}>Falla</span>
          </div>

          <div className="lp-choice-block">
            <h4>Modelo común</h4>
            <div className="lp-model-grid">
              {activeBrand.models.map((model) => (
                <button type="button" key={model} className={selectedModel === model ? 'is-selected' : ''} aria-pressed={selectedModel === model} onClick={() => { setSelectedModel(model); setSelectedIssue(''); }}>
                  {model}
                </button>
              ))}
            </div>
          </div>

          <div className={selectedModel ? 'lp-choice-block' : 'lp-choice-block is-disabled'}>
            <h4>Falla principal</h4>
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
              <span>{selectedIssue ? 'Mensaje listo' : 'Completa modelo y falla'}</span>
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
