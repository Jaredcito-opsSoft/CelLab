import { useEffect, useRef, useState } from 'react';
import { AlertCircle, CheckCircle2, Loader2, Search, XCircle } from 'lucide-react';
import { apiRequest } from '../lib/api';
import { buildWhatsappLink, useBusinessProfile } from '../hooks/useBusinessProfile';

type TrackResult =
  | { found: false; message: string }
  | { found: true; folio: string; status: string; statusLabel: string; device: string; lastUpdate: string; receivedAt: string; publicMessage: string; nextStep: string; warrantyUntil: string | null; businessName: string };

const date = (value: string) => new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));

export function RepairTracker() {
  const [folio, setFolio] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TrackResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { profile } = useBusinessProfile();

  useEffect(() => {
    if (result || error) {
      setResult(null);
      setError(null);
    }
  }, [folio, phone]);

  async function handleSearch() {
    const cleanFolio = folio.trim().toUpperCase();
    const cleanPhone = phone.trim();
    if (!cleanFolio) {
      inputRef.current?.focus();
      return;
    }
    if (!cleanPhone) {
      setError('Ingresa el teléfono registrado al dejar tu equipo.');
      return;
    }
    setLoading(true);
    setResult(null);
    setError(null);
    try {
      const response = await apiRequest<TrackResult>('/api/public/repairs/track', { method: 'POST', body: JSON.stringify({ folio: cleanFolio, phone: cleanPhone }) });
      setResult(response);
      if (!response.found) setError(response.message);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No fue posible consultar el estado.');
    } finally {
      setLoading(false);
    }
  }

  const helpLink = result?.found ? buildWhatsappLink(profile, `Hola, quiero consultar mi reparación ${result.folio}`) : null;

  return (
    <section className="rt-section" id="rastrear" aria-labelledby="rt-heading">
      <div className="shell">
        <div className="rt-card">
          <div className="rt-card__head">
            <div className="rt-icon-wrap" aria-hidden="true"><Search size={22} /></div>
            <div>
              <h2 className="rt-card__title" id="rt-heading">Rastrea tu equipo</h2>
              <p className="rt-card__sub">Ingresa tu folio y teléfono para consultar el estado de tu reparación.</p>
            </div>
          </div>

          <div className="rt-search-row rt-search-row--two" role="search">
            <div className="rt-input-wrap">
              <label htmlFor="folio-input" className="visually-hidden">Número de folio</label>
              <input id="folio-input" ref={inputRef} className="rt-input" type="text" placeholder="Ej. REP-00001" value={folio} onChange={(e) => setFolio(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') void handleSearch(); }} autoComplete="off" spellCheck={false} maxLength={12} disabled={loading} />
            </div>
            <div className="rt-input-wrap">
              <label htmlFor="phone-input" className="visually-hidden">Teléfono registrado</label>
              <input id="phone-input" className="rt-input" type="tel" placeholder="Teléfono" value={phone} onChange={(e) => setPhone(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') void handleSearch(); }} autoComplete="tel" maxLength={20} disabled={loading} />
            </div>
            <button className="rt-btn" onClick={() => void handleSearch()} disabled={loading || !folio.trim() || !phone.trim()} aria-label="Consultar estado de reparación">
              {loading ? <Loader2 size={18} className="rt-spin" aria-hidden="true" /> : <Search size={18} aria-hidden="true" />}
              <span>{loading ? 'Consultando…' : 'Consultar estado'}</span>
            </button>
          </div>

          <p className="rt-hint">Usa el folio de tu nota y el teléfono registrado en recepción.</p>
          {error && <div className="rt-error" role="alert"><XCircle size={16} aria-hidden="true" /><span>{error}</span></div>}

          {result?.found && (
            <div className="rt-result" role="region" aria-label={`Estado de reparación ${result.folio}`}>
              <div className="rt-result__header rt-status-bg--diag">
                <div className="rt-result__folio"><span className="rt-result__folio-label">Folio</span><span className="rt-result__folio-num">{result.folio}</span></div>
                <div className="rt-result__badge rt-status--diag"><CheckCircle2 size={18} /><span>{result.statusLabel}</span></div>
              </div>
              <div className="rt-result__body">
                <div className="rt-result__row"><span className="rt-result__key">Equipo</span><span className="rt-result__val">{result.device}</span></div>
                <div className="rt-result__row"><span className="rt-result__key">Recepción</span><span className="rt-result__val">{date(result.receivedAt)}</span></div>
                <div className="rt-result__row"><span className="rt-result__key">Última actualización</span><span className="rt-result__val">{date(result.lastUpdate)}</span></div>
                <div className="rt-result__note"><AlertCircle size={14} /><span>{result.publicMessage}</span></div>
                <div className="rt-result__row"><span className="rt-result__key">Próximo paso</span><span className="rt-result__val">{result.nextStep}</span></div>
                {result.warrantyUntil && <div className="rt-result__row"><span className="rt-result__key">Garantía vigente hasta</span><span className="rt-result__val">{date(result.warrantyUntil)}</span></div>}
                {helpLink ? <a className="rt-help" href={helpLink} target="_blank" rel="noreferrer">Necesito ayuda por WhatsApp</a> : <span className="rt-help" aria-disabled="true">Teléfono de contacto pendiente de configurar</span>}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
