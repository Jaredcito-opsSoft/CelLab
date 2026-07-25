import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Download, RefreshCw, WifiOff, X } from 'lucide-react';
import { registerSW } from 'virtual:pwa-register';
import { checkApiConnection, connectionSnapshot, subscribeConnection } from '../lib/api';

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

type PwaContextValue = {
  online: boolean;
  canInstall: boolean;
  isStandalone: boolean;
  isIos: boolean;
  install: () => Promise<void>;
};

const PwaContext = createContext<PwaContextValue>({
  online: true,
  canInstall: false,
  isStandalone: false,
  isIos: false,
  install: async () => undefined,
});

export function usePwa() {
  return useContext(PwaContext);
}

export function PwaProvider({ children }: { children: ReactNode }) {
  const [online, setOnline] = useState(connectionSnapshot());
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [showIosHelp, setShowIosHelp] = useState(false);
  const [updateServiceWorker, setUpdateServiceWorker] = useState<((reloadPage?: boolean) => Promise<void>) | null>(null);
  const isStandalone = typeof window !== 'undefined'
    && (window.matchMedia('(display-mode: standalone)').matches || ('standalone' in navigator && Boolean((navigator as Navigator & { standalone?: boolean }).standalone)));
  const isIos = typeof navigator !== 'undefined' && /iphone|ipad|ipod/i.test(navigator.userAgent);

  useEffect(() => subscribeConnection(setOnline), []);
  useEffect(() => {
    document.documentElement.dataset.localposOnline = online ? 'true' : 'false';
    return () => { delete document.documentElement.dataset.localposOnline; };
  }, [online]);

  useEffect(() => {
    const onInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as InstallPromptEvent);
    };
    const onInstalled = () => setInstallPrompt(null);
    window.addEventListener('beforeinstallprompt', onInstallPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onInstallPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  useEffect(() => {
    const updateSW = registerSW({
      immediate: true,
      onNeedRefresh: () => setUpdateAvailable(true),
      onRegisterError: () => undefined,
    });
    setUpdateServiceWorker(() => updateSW);
  }, []);

  const install = async () => {
    if (installPrompt) {
      await installPrompt.prompt();
      await installPrompt.userChoice;
      setInstallPrompt(null);
      return;
    }
    if (isIos && !isStandalone) setShowIosHelp(true);
  };

  const value = useMemo<PwaContextValue>(() => ({
    online,
    canInstall: Boolean(installPrompt) || (isIos && !isStandalone),
    isStandalone,
    isIos,
    install,
  }), [online, installPrompt, isStandalone, isIos]);

  return (
    <PwaContext.Provider value={value}>
      {!online && <aside className="connection-banner" role="status">
        <WifiOff aria-hidden="true" />
        <span><b>Sin conexión</b><small>LocalPOS necesita internet para consultar existencias y registrar operaciones.</small></span>
        <button type="button" onClick={() => void checkApiConnection()}><RefreshCw />Reintentar</button>
      </aside>}
      {updateAvailable && <aside className="pwa-update-banner" role="status">
        <span><b>Actualización disponible</b><small>Guarda tu trabajo antes de actualizar LocalPOS.</small></span>
        <button type="button" onClick={() => void updateServiceWorker?.(true)}>Actualizar ahora</button>
        <button type="button" className="pwa-banner-close" aria-label="Actualizar después" onClick={() => setUpdateAvailable(false)}><X /></button>
      </aside>}
      {showIosHelp && <div className="pwa-help-backdrop" role="presentation" onClick={() => setShowIosHelp(false)}>
        <section className="pwa-help-sheet" role="dialog" aria-modal="true" aria-labelledby="pwa-ios-title" onClick={(event) => event.stopPropagation()}>
          <span className="pwa-help-icon"><Download /></span>
          <div><h2 id="pwa-ios-title">Instalar LocalPOS</h2><p>En Safari toca <b>Compartir</b> y después <b>Agregar a pantalla de inicio</b>.</p></div>
          <button type="button" onClick={() => setShowIosHelp(false)}>Entendido</button>
        </section>
      </div>}
      {children}
    </PwaContext.Provider>
  );
}
