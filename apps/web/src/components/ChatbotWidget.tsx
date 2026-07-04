import { useEffect, useRef, useState } from 'react';
import { ChevronRight, MessageCircle, Send, X } from 'lucide-react';
import type { ChatMessage, ChatStep } from '../types';
import { BRANDS, SERVICES } from '../types';
import { buildWhatsappLink, useBusinessProfile, type BusinessProfile } from '../hooks/useBusinessProfile';

const BOT_NAME = 'CelBot';
let msgId = 0;

function buildWaLink(profile: BusinessProfile | null, brand: string, service: string): string {
  const msg = `Hola CelLab Tuxtla\n\nNecesito ayuda con mi ${brand}.\nProblema: ${service}.\n\n¿Pueden atenderme?`;
  return buildWhatsappLink(profile, msg) ?? '#contacto';
}

function makeBot(content: string, options?: ChatMessage['options']): ChatMessage {
  return { id: String(++msgId), role: 'bot', content, options };
}

function makeUser(content: string): ChatMessage {
  return { id: String(++msgId), role: 'user', content };
}

function TypingIndicator() {
  return (
    <div className="cw-typing" aria-label="El bot está escribiendo">
      <span /><span /><span />
    </div>
  );
}

function Bubble({ msg }: { msg: ChatMessage }) {
  const isBot = msg.role === 'bot';
  return (
    <div className={`cw-bubble-wrap ${isBot ? 'cw-bubble-wrap--bot' : 'cw-bubble-wrap--user'}`}>
      {isBot && <div className="cw-avatar" aria-hidden="true">🤖</div>}
      <div className={`cw-bubble ${isBot ? 'cw-bubble--bot' : 'cw-bubble--user'}`}>{msg.content}</div>
    </div>
  );
}

function QuickOptions({ options, onSelect, disabled }: { options: NonNullable<ChatMessage['options']>; onSelect: (label: string, value: string) => void; disabled: boolean }) {
  return (
    <div className="cw-options" role="group" aria-label="Opciones de respuesta">
      {options.map((opt) => (
        <button key={opt.value} className="cw-opt-btn" onClick={() => onSelect(opt.emoji ? `${opt.emoji} ${opt.label}` : opt.label, opt.value)} disabled={disabled} aria-label={opt.label}>
          {opt.emoji && <span aria-hidden="true">{opt.emoji}</span>}
          {opt.label}
          <ChevronRight size={14} aria-hidden="true" />
        </button>
      ))}
    </div>
  );
}

export function ChatbotWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [step, setStep] = useState<ChatStep>('welcome');
  const [typing, setTyping] = useState(false);
  const [selectedBrand, setSelectedBrand] = useState('');
  const [optionsHistory, setOptionsHistory] = useState<Map<string, boolean>>(new Map());
  const bottomRef = useRef<HTMLDivElement>(null);
  const { profile, phoneLabel } = useBusinessProfile();

  useEffect(() => {
    if (open && messages.length === 0) {
      setTyping(true);
      window.setTimeout(() => {
        setTyping(false);
        setMessages([
          makeBot(`¡Hola! 👋 Soy ${BOT_NAME}, el asistente de CelLab Tuxtla.\n\n¿En qué te puedo ayudar hoy?`, [
            { label: 'Reparar mi equipo', value: 'repair', emoji: '🔧' },
            { label: 'Duda de garantía', value: 'guarantee', emoji: '🛡️' },
            { label: 'Hablar con un técnico', value: 'tech', emoji: '👨‍🔧' },
          ]),
        ]);
        setStep('select_intent');
      }, 500);
    }
  }, [open, messages.length]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typing]);

  const addMessage = (msg: ChatMessage) => setMessages((prev) => [...prev, msg]);

  const botReply = (content: string, options?: ChatMessage['options'], delay = 650) => {
    setTyping(true);
    window.setTimeout(() => {
      setTyping(false);
      addMessage(makeBot(content, options));
    }, delay);
  };

  const handleOption = (msgIdValue: string, label: string, value: string) => {
    setOptionsHistory((prev) => new Map(prev).set(msgIdValue, true));
    addMessage(makeUser(label));

    if (value.startsWith('https://')) {
      window.open(value, '_blank', 'noopener,noreferrer');
      return;
    }

    if (step === 'select_intent') {
      if (value === 'repair') {
        setStep('select_brand');
        botReply('¿Qué marca es tu celular?', BRANDS);
      } else if (value === 'guarantee') {
        setStep('guarantee_info');
        botReply('🛡️ La garantía se especifica en tu nota de servicio y depende de la pieza instalada. Si tienes un folio, podemos revisarlo contigo.', [
          { label: 'Tengo otra duda', value: 'more', emoji: '❓' },
          { label: 'Hablar con técnico', value: 'tech', emoji: '👨‍🔧' },
        ]);
      } else if (value === 'tech') {
        setStep('tech_transfer');
        const link = buildWhatsappLink(profile, 'Hola CelLab Tuxtla, quiero hablar con un técnico.') ?? '#contacto';
        botReply('¡Con gusto! Te conecto directamente por WhatsApp.', [{ label: 'Abrir WhatsApp', value: link, emoji: '💬' }]);
      }
    } else if (step === 'select_brand') {
      setSelectedBrand(value);
      setStep('select_service');
      botReply(`¿Cuál es el problema con tu ${value}?`, SERVICES);
    } else if (step === 'select_service') {
      setStep('done');
      const waLink = buildWaLink(profile, selectedBrand, value);
      botReply(`Perfecto. Preparo tu mensaje:\n\n📱 ${selectedBrand} · ${label.replace(/^[^\s]+ /, '')}\n\nToca el botón para enviarlo por WhatsApp.`, [
        { label: 'Enviar a WhatsApp', value: waLink, emoji: '💬' },
      ]);
    } else if (step === 'guarantee_info') {
      const link = buildWhatsappLink(profile, value === 'tech' ? 'Hola CelLab Tuxtla, tengo una pregunta sobre garantía.' : 'Hola CelLab Tuxtla, tengo una duda.') ?? '#contacto';
      botReply('Te dejo el enlace para continuar por WhatsApp.', [{ label: 'Abrir WhatsApp', value: link, emoji: '💬' }]);
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
      <button className={`cw-fab ${open ? 'cw-fab--open' : ''}`} onClick={() => setOpen((v) => !v)} aria-label={open ? 'Cerrar asistente' : 'Abrir asistente CelBot'} aria-expanded={open} aria-haspopup="dialog">
        {open ? <X size={26} /> : <MessageCircle size={26} />}
        {!open && <span className="cw-fab__badge" aria-label="1 mensaje nuevo">1</span>}
      </button>

      {open && (
        <div className="cw-window" role="dialog" aria-label="Asistente CelBot" aria-modal="false">
          <div className="cw-header">
            <div className="cw-header__info">
              <div className="cw-header__avatar" aria-hidden="true">🤖</div>
              <div>
                <div className="cw-header__name">{BOT_NAME}</div>
                <div className="cw-header__status"><span className="cw-header__dot" aria-hidden="true" /> En línea</div>
              </div>
            </div>
            <div className="cw-header__actions">
              <button className="cw-icon-btn" onClick={handleReset} aria-label="Reiniciar conversación" title="Reiniciar"><Send size={15} aria-hidden="true" /></button>
              <button className="cw-icon-btn" onClick={() => setOpen(false)} aria-label="Cerrar asistente"><X size={18} aria-hidden="true" /></button>
            </div>
          </div>

          <div className="cw-messages" role="log" aria-live="polite" aria-label="Conversación">
            {messages.map((msg, i) => {
              const isLast = i === messages.length - 1;
              const isDisabled = optionsHistory.get(msg.id) ?? false;
              return (
                <div key={msg.id}>
                  <Bubble msg={msg} />
                  {msg.options && isLast && <QuickOptions options={msg.options} onSelect={(optionLabel, optionValue) => handleOption(msg.id, optionLabel, optionValue)} disabled={isDisabled || typing} />}
                  {msg.options && !isLast && msg.options.some((o) => o.value.startsWith('https://')) && (
                    <div className="cw-options">
                      {msg.options.filter((o) => o.value.startsWith('https://')).map((opt) => (
                        <a key={opt.value} href={opt.value} target="_blank" rel="noopener noreferrer" className="cw-opt-btn">
                          {opt.label}<ChevronRight size={14} aria-hidden="true" />
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

          <div className="cw-footer">
            <span>{profile?.businessName ?? 'CelLab Tuxtla'} · {phoneLabel || 'Teléfono por configurar'}</span>
          </div>
        </div>
      )}
    </>
  );
}
