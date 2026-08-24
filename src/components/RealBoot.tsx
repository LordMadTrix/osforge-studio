import React, { useEffect, useRef, useState } from 'react';
import { Play, RotateCcw, Power } from 'lucide-react';

interface RealBootProps {
  lang: 'fr' | 'en';
}

// Démarre un vrai noyau Linux (Buildroot, ~5 Mo) via v86, un émulateur x86 en WebAssembly qui
// tourne entièrement dans le navigateur — aucun serveur, aucune installation. Contrairement à
// l'ancien "Simulateur Live" (un faux terminal avec des réponses codées en dur), ceci exécute un
// VRAI noyau Linux, compilé pour de vrai, dans une VM x86 émulée réelle. Configuration reprise à
// l'identique du profil officiel "buildroot" de v86 (vérifié en live : boot jusqu'au shell "~%"
// en ~38s sur copy.sh/v86 avant d'être répliqué ici). L'image du noyau reste hébergée sur le CDN
// officiel du projet (i.copy.sh) plutôt que dupliquée dans ce dépôt ; le runtime de l'émulateur
// (wasm/js/bios) est en revanche auto-hébergé dans public/v86/ pour ne pas dépendre de copy.sh
// pour le fonctionnement du site lui-même.
export const RealBoot: React.FC<RealBootProps> = ({ lang }) => {
  const screenRef = useRef<HTMLDivElement>(null);
  const emulatorRef = useRef<any>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'running' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const stopEmulator = () => {
    try {
      emulatorRef.current?.destroy();
    } catch {
      // déjà arrêté ou jamais démarré : rien à faire
    }
    emulatorRef.current = null;
  };

  const startEmulator = async () => {
    setStatus('loading');
    setErrorMsg('');
    stopEmulator();
    if (screenRef.current) screenRef.current.innerHTML = '';

    try {
      const base = import.meta.env.BASE_URL;
      const { V86 } = await import(/* @vite-ignore */ `${base}v86/libv86.mjs`);
      const emulator = new V86({
        wasm_path: `${base}v86/v86.wasm`,
        memory_size: 128 * 1024 * 1024,
        vga_memory_size: 2 * 1024 * 1024,
        screen_container: screenRef.current,
        bios: { url: `${base}v86/bios/seabios.bin` },
        vga_bios: { url: `${base}v86/bios/vgabios.bin` },
        bzimage: { url: 'https://i.copy.sh/buildroot-bzimage.bin' },
        cmdline: 'tsc=reliable mitigations=off random.trust_cpu=on',
        autostart: true,
      });
      emulatorRef.current = emulator;
      setStatus('running');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
      setStatus('error');
    }
  };

  useEffect(() => () => stopEmulator(), []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div className="glass-panel" style={{ padding: '18px' }}>
        <h3 style={{ fontSize: '0.98rem', fontWeight: 700, color: '#f8fafc', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          🚀 {lang === 'fr' ? 'Démarrage Réel dans le Navigateur' : 'Real Boot in the Browser'}
        </h3>
        <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
          {lang === 'fr'
            ? "Ceci n'est pas une simulation : un vrai noyau Linux (Buildroot) démarre dans une machine virtuelle x86 émulée en WebAssembly (v86), directement dans cet onglet. Aucun serveur, rien n'est installé sur votre machine."
            : "This isn't a simulation: a real Linux kernel (Buildroot) boots inside a WebAssembly-emulated x86 virtual machine (v86), directly in this tab. No server, nothing installed on your machine."}
        </p>
        <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
          {status !== 'running' && (
            <button className="btn btn-primary" onClick={startEmulator} disabled={status === 'loading'}>
              <Play size={14} />
              {status === 'loading'
                ? (lang === 'fr' ? 'Démarrage...' : 'Starting...')
                : (lang === 'fr' ? 'Démarrer un vrai Linux' : 'Boot a real Linux')}
            </button>
          )}
          {status === 'running' && (
            <>
              <button className="btn btn-secondary" onClick={startEmulator}>
                <RotateCcw size={14} />
                {lang === 'fr' ? 'Redémarrer' : 'Restart'}
              </button>
              <button className="btn btn-secondary" onClick={() => { stopEmulator(); setStatus('idle'); }}>
                <Power size={14} />
                {lang === 'fr' ? 'Arrêter' : 'Stop'}
              </button>
            </>
          )}
        </div>
        {status === 'error' && (
          <p style={{ fontSize: '0.78rem', color: 'var(--red, #ef4444)', marginTop: '10px' }}>
            {lang === 'fr' ? "Échec du chargement de l'émulateur : " : 'Emulator failed to load: '}{errorMsg}
          </p>
        )}
      </div>

      <div
        className="glass-panel"
        style={{ padding: status === 'idle' ? '18px' : '4px', minHeight: status === 'idle' ? 'auto' : '420px' }}
      >
        {status === 'idle' && (
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', textAlign: 'center', padding: '40px 0' }}>
            {lang === 'fr' ? 'Cliquez sur "Démarrer un vrai Linux" pour voir le noyau charger en direct.' : 'Click "Boot a real Linux" to watch the kernel load live.'}
          </p>
        )}
        <div
          ref={screenRef}
          style={{
            display: status === 'idle' ? 'none' : 'block',
            background: '#000',
            color: '#4ade80',
            padding: '12px',
            borderRadius: '8px',
            overflow: 'auto',
            fontFamily: 'monospace',
          }}
        />
      </div>
    </div>
  );
};
