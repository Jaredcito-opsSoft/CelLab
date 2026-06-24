import { useState, useRef, useEffect } from 'react';
import { Search, Loader2, CheckCircle2, Clock, Wrench, Package, AlertCircle, XCircle } from 'lucide-react';
import type { RepairOrder, RepairStatus } from '../types';
import { MOCK_ORDERS } from '../types';

// ── Status config ─────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  RepairStatus,
  { icon: React.ReactNode; colorClass: string; bgClass: string }
> = {
  recibido: {
    icon: <Package size={18} />,
    colorClass: 'rt-status--received',
    bgClass: 'rt-status-bg--received',
  },
  diagnostico: {
    icon: <Search size={18} />,
    colorClass: 'rt-status--diag',
    bgClass: 'rt-status-bg--diag',
  },
  en_reparacion: {
    icon: <Wrench size={18} />,
    colorClass: 'rt-status--repair',
    bgClass: 'rt-status-bg--repair',
  },
  esperando_refaccion: {
    icon: <Clock size={18} />,
    colorClass: 'rt-status--waiting',
    bgClass: 'rt-status-bg--waiting',
  },
  listo: {
    icon: <CheckCircle2 size={18} />,
    colorClass: 'rt-status--ready',
    bgClass: 'rt-status-bg--ready',
  },
  entregado: {
    icon: <CheckCircle2 size={18} />,
    colorClass: 'rt-status--delivered',
    bgClass: 'rt-status-bg--delivered',
  },
};

// ── Progress steps ────────────────────────────────────────────────────────────

const STEPS: RepairStatus[] = [
  'recibido',
  'diagnostico',
  'en_reparacion',
  'listo',
];

const STEP_LABELS: Record<string, string> = {
  recibido: 'Recibido',
  diagnostico: 'Diagnóstico',
  en_reparacion: 'Reparación',
  listo: 'Listo',
};

function getStepIndex(status: RepairStatus): number {
  const idx = STEPS.indexOf(status);
  if (idx === -1) return STEPS.length - 1; // entregado / esperando = end
  return idx;
}

// ── Result Card ───────────────────────────────────────────────────────────────

function ResultCard({ order }: { order: RepairOrder }) {
  const cfg = STATUS_CONFIG[order.status];
  const stepIndex = getStepIndex(order.status);

  return (
    <div className="rt-result" role="region" aria-label={`Estado de reparación ${order.folio}`}>
      {/* Header */}
      <div className={`rt-result__header ${cfg.bgClass}`}>
        <div className="rt-result__folio">
          <span className="rt-result__folio-label">Folio</span>
          <span className="rt-result__folio-num">{order.folio}</span>
        </div>
        <div className={`rt-result__badge ${cfg.colorClass}`}>
          {cfg.icon}
          <span>{order.statusLabel}</span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="rt-progress" aria-label="Progreso de reparación">
        {STEPS.map((step, i) => (
          <div key={step} className="rt-progress__step">
            <div
              className={`rt-progress__dot ${
                i <= stepIndex
                  ? 'rt-progress__dot--active'
                  : 'rt-progress__dot--inactive'
              }`}
              aria-current={i === stepIndex ? 'step' : undefined}
            />
            {i < STEPS.length - 1 && (
              <div
                className={`rt-progress__line ${
                  i < stepIndex ? 'rt-progress__line--active' : ''
                }`}
              />
            )}
            <span className="rt-progress__label">{STEP_LABELS[step]}</span>
          </div>
        ))}
      </div>

      {/* Details */}
      <div className="rt-result__body">
        <div className="rt-result__row">
          <span className="rt-result__key">Equipo</span>
          <span className="rt-result__val">{order.brand} {order.model}</span>
        </div>
        <div className="rt-result__row">
          <span className="rt-result__key">Motivo</span>
          <span className="rt-result__val">{order.issue}</span>
        </div>
        {order.estimatedDate && (
          <div className="rt-result__row">
            <span className="rt-result__key">Fecha estimada</span>
            <span className="rt-result__val">{order.estimatedDate}</span>
          </div>
        )}
        {order.techNote && (
          <div className="rt-result__note">
            <AlertCircle size={14} aria-hidden="true" />
            <span>{order.techNote}</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export function RepairTracker() {
  const [folio, setFolio] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<RepairOrder | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Reset result/error when input changes
  useEffect(() => {
    if (result || error) {
      setResult(null);
      setError(null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [folio]);

  const handleSearch = async () => {
    const normalized = folio.trim().toUpperCase();
    if (!normalized) {
      inputRef.current?.focus();
      return;
    }
    setLoading(true);
    setResult(null);
    setError(null);

    // Simulate API call
    await new Promise((r) => setTimeout(r, 1400));

    const found = MOCK_ORDERS[normalized];
    if (found) {
      setResult(found);
    } else {
      setError(`No encontramos el folio "${normalized}". Verifica el número o contáctanos.`);
    }
    setLoading(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch();
  };

  return (
    <section className="rt-section" id="rastrear" aria-labelledby="rt-heading">
      <div className="shell">
        <div className="rt-card">
          <div className="rt-card__head">
            <div className="rt-icon-wrap" aria-hidden="true">
              <Search size={22} />
            </div>
            <div>
              <h2 className="rt-card__title" id="rt-heading">
                Consulta tu reparación
              </h2>
              <p className="rt-card__sub">
                Ingresa el folio que te dimos al dejar tu equipo.
              </p>
            </div>
          </div>

          {/* Search row */}
          <div className="rt-search-row" role="search">
            <div className="rt-input-wrap">
              <label htmlFor="folio-input" className="visually-hidden">
                Número de folio
              </label>
              <input
                id="folio-input"
                ref={inputRef}
                className="rt-input"
                type="text"
                placeholder="Ej. REP-0001"
                value={folio}
                onChange={(e) => setFolio(e.target.value)}
                onKeyDown={handleKeyDown}
                aria-label="Número de folio de reparación"
                autoComplete="off"
                spellCheck={false}
                maxLength={12}
                disabled={loading}
              />
            </div>
            <button
              className="rt-btn"
              onClick={handleSearch}
              disabled={loading || !folio.trim()}
              aria-label="Buscar reparación"
            >
              {loading ? (
                <Loader2 size={18} className="rt-spin" aria-hidden="true" />
              ) : (
                <Search size={18} aria-hidden="true" />
              )}
              <span>{loading ? 'Buscando…' : 'Consultar'}</span>
            </button>
          </div>

          <p className="rt-hint">Prueba: REP-0001 · REP-0042 · REP-0099</p>

          {/* Error */}
          {error && (
            <div className="rt-error" role="alert">
              <XCircle size={16} aria-hidden="true" />
              <span>{error}</span>
            </div>
          )}

          {/* Result */}
          {result && <ResultCard order={result} />}
        </div>
      </div>
    </section>
  );
}
