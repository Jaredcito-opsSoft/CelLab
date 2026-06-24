import { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, ChevronRight } from 'lucide-react';
import type { ChatMessage, ChatStep } from '../types';
import { BRANDS, SERVICES } from '../types';

// ── Constants ─────────────────────────────────────────────────────────────────

const PHONE = '9612858828';
const BOT_NAME = 'CelBot';

function buildWaLink(brand: string, service: string): string {
  const msg = encodeURIComponent(
    `Hola CelLab Tuxtla 👋\n\nNecesito ayuda con mi ${brand}.\nProblema: ${service}.\n\n¿Pueden atenderme?`
  );
  return `https://wa.me/52${PHONE}?text=${msg}`;
}

// ── Bot response builder ──────────────────────────────────────────────────────

let msgId = 0;
function makeBot(content: string, options?: ChatMessage['options']): ChatMessage {
  return { id: String(++msgId), role: 'bot', content, options };
}
function makeUser(content: string): ChatMessage {
  return { id: String(++msgId), role: 'user', content };
}

// ── Typing indicator ──────────────────────────────────────────────────────────

function TypingIndicator() {
  return (
    <div className="cw-typing" aria-label="El bot está escribiendo">
      <span /><span /><span />
    </div>
  );
}

// ── Chat Bubble ───────────────────────────────────────────────────────────────

function Bubble({ msg }: { msg: ChatMessage }) {
  const isBot = msg.role === 'bot';
  return (
    <div className={`cw-bubble-wrap ${isBot ? 'cw-bubble-wrap--bot' : 'cw-bubble-wrap--user'}`}>
      {isBot && (
        <div className="cw-avatar" aria-hidden="true">🤖</div>
      )}
      <div className={`cw-bubble ${isBot ? 'cw-bubble--bot' : 'cw-bubble--user'}`}>
        {msg.content}
      </div>
    </div>
  );
}

// ── Quick Option Buttons ──────────────────────────────────────────────────────

interface OptionsProps {
  options: NonNullable<ChatMessage['options']>;
  onSelect: (label: string, value: string) => void;
  disabled: boolean;
}

function QuickOptions({ options, onSelect, disabled }: OptionsProps) {
  return (
    <div className="cw-options" role="group" aria-label="Opciones de respuesta">
      {options.map((opt) => (
        <button
          key={opt.value}
          className="cw-opt-btn"
          onClick={() => onSelect(opt.emoji ? `${opt.emoji} ${opt.label}` : opt.label, opt.value)}
          disabled={disabled}
          aria-label={opt.label}
        >
          {opt.emoji && <span aria-hidden="true">{opt.emoji}</span>}
          {opt.label}
          <ChevronRight size={14} aria-hidden="true" />
        </button>
      ))}
    </div>
  );
}

// ── Main Widget ───────────────────────────────────────────────────────────────

export function ChatbotWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [step, setStep] = useState<ChatStep>('welcome');
  const [typing, setTyping] = useState(false);
  const [selectedBrand, setSelectedBrand] = useState('');
  const [optionsHistory, setOptionsHistory] = useState<Map<string, boolean>>(new Map());
  const bottomRef = useRef<HTMLDivElement>(null);

  // Initialize chat on first open
  useEffect(() => {
    if (open && messages.length === 0) {
      setTyping(true);
      setTimeout(() => {
        setTyping(false);
        const welcome = makeBot(
          `¡Hola! 👋 Soy ${BOT_NAME}, el asistente de CelLab Tuxtla.\n\n¿En qué te puedo ayudar hoy?`,
          [
            { label: 'Reparar mi equipo', value: 'repair', emoji: '🔧' },
            { label: 'Duda de garantía', value: 'guarantee', emoji: '🛡️' },
            { label: 'Hablar con un técnico', value: 'tech', emoji: '👨‍🔧' },
          ]
        );
        setMessages([welcome]);
        setStep('select_intent');
      }, 800);
    }
  }, [open, messages.length]);

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typing]);

  const addMessage = (msg: ChatMessage) => {
    setMessages((prev) => [...prev, msg]);
  };

  const botReply = (content: string, options?: ChatMessage['options'], delay = 900) => {
    setTyping(true);
    setTimeout(() => {
      setTyping(false);
      addMessage(makeBot(content, options));
    }, delay);
  };

  const disableOptions = (msgId: string) => {
    setOptionsHistory((prev) => new Map(prev).set(msgId, true));
  };

  const handleOption = (msgId: string, label: string, value: string) => {
    disableOptions(msgId);
    addMessage(makeUser(label));

    if (step === 'select_intent') {
      if (value === 'repair') {
        setStep('select_brand');
        botReply('¿Qué marca es tu celular?', BRANDS);
      } else if (value === 'guarantee') {
        setStep('guarantee_info');
        botReply(
          '🛡️ Nuestras garantías:\n\n• Pantalla/batería: 30 días\n• Servicios generales: 15 días\n• Micro-soldadura: 7 días\n\nLa garantía se especifica en tu nota de servicio.',
          [
            { label: 'Tengo otra duda', value: 'more', emoji: '❓' },
            { label: 'Hablar con técnico', value: 'tech', emoji: '👨‍🔧' },
          ]
        );
      } else if (value === 'tech') {
        setStep('tech_transfer');
        const link = `https://wa.me/52${PHONE}?text=${encodeURIComponent('Hola CelLab Tuxtla, quiero hablar con un técnico.')}`;
        botReply(
          '¡Con gusto! Te conecto con nuestro técnico directamente por WhatsApp. 👇',
          [{ label: '💬 Abrir WhatsApp', value: link, emoji: '' }]
        );
      }
    } else if (step === 'select_brand') {
      setSelectedBrand(value);
      setStep('select_service');
      botReply(`¿Cuál es el problema con tu ${value}?`, SERVICES);
    } else if (step === 'select_service') {
      setStep('done');
      const waLink = buildWaLink(selectedBrand, value);
      botReply(
        `Perfecto. Preparo tu mensaje para el equipo CelLab:\n\n📱 ${selectedBrand} · ${label.replace(/^[^\s]+ /, '')}\n\nToca el botón para enviar por WhatsApp.`,
        [{ label: '💬 Enviar a WhatsApp', value: waLink, emoji: '' }]
      );
    } else if (step === 'guarantee_info') {
      if (value === 'tech') {
        setStep('tech_transfer');
        const link = `https://wa.me/52${PHONE}?text=${encodeURIComponent('Hola CelLab Tuxtla, tengo una pregunta sobre garantía.')}`;
        botReply('Te conecto con el técnico. 👇', [
          { label: '💬 Abrir WhatsApp', value: link, emoji: '' },
        ]);
      } else {
        botReply('¿Cuál es tu duda? Puedes escribirnos directamente.', [
          { label: '💬 Contactar por WhatsApp', value: `https://wa.me/52${PHONE}`, emoji: '' },
        ]);
      }
    } else if (step === 'done' || step === 'tech_transfer') {
      // WA link option
      if (value.startsWith('https://')) {
        window.open(value, '_blank', 'noopener,noreferrer');
      }
    }
  };

  const handleReset = () => {
    setMessages([]);
    setStep('welcome');
    setSelectedBrand('');
    setOptionsHistory(new Map());
    msgId = 0;
  };

  return (
    <>
      {/* FAB */}
      <button
        className={`cw-fab ${open ? 'cw-fab--open' : ''}`}
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? 'Cerrar asistente' : 'Abrir asistente CelBot'}
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        {open ? <X size={26} /> : <MessageCircle size={26} />}
        {!open && <span className="cw-fab__badge" aria-label="1 mensaje nuevo">1</span>}
      </button>

      {/* Chat window */}
      {open && (
        <div
          className="cw-window"
          role="dialog"
          aria-label="Asistente CelBot"
          aria-modal="false"
        >
          {/* Header */}
          <div className="cw-header">
            <div className="cw-header__info">
              <div className="cw-header__avatar" aria-hidden="true">🤖</div>
              <div>
                <div className="cw-header__name">{BOT_NAME}</div>
                <div className="cw-header__status">
                  <span className="cw-header__dot" aria-hidden="true" />
                  En línea
                </div>
              </div>
            </div>
            <div className="cw-header__actions">
              <button
                className="cw-icon-btn"
                onClick={handleReset}
                aria-label="Reiniciar conversación"
                title="Reiniciar"
              >
                <Send size={15} aria-hidden="true" />
              </button>
              <button
                className="cw-icon-btn"
                onClick={() => setOpen(false)}
                aria-label="Cerrar asistente"
              >
                <X size={18} aria-hidden="true" />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="cw-messages" role="log" aria-live="polite" aria-label="Conversación">
            {messages.map((msg, i) => {
              const isLast = i === messages.length - 1;
              const isDisabled = optionsHistory.get(msg.id) ?? false;
              return (
                <div key={msg.id}>
                  <Bubble msg={msg} />
                  {msg.options && isLast && (
                    <QuickOptions
                      options={msg.options}
                      onSelect={(label, value) => handleOption(msg.id, label, value)}
                      disabled={isDisabled || typing}
                    />
                  )}
                  {/* WA links for non-last bot messages */}
                  {msg.options && !isLast && msg.options.some((o) => o.value.startsWith('https://')) && (
                    <div className="cw-options">
                      {msg.options
                        .filter((o) => o.value.startsWith('https://'))
                        .map((opt) => (
                          <a
                            key={opt.value}
                            href={opt.value}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="cw-opt-btn"
                          >
                            {opt.label}
                            <ChevronRight size={14} aria-hidden="true" />
                          </a>
                        ))}
                    </div>
                  )}
                </div>
              );
            })}
            {typing && <TypingIndicator />}
            <div ref={bottomRef} />
          </div>

          {/* Footer hint */}
          <div className="cw-footer">
            <span>CelLab Tuxtla · 961 285 8828</span>
          </div>
        </div>
      )}
    </>
  );
}
