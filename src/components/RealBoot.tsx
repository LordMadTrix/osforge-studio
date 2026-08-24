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
// en ~38s sur copy.sh/v86 avant d'être répliqué ici).
//
// Tout (runtime wasm/js/bios ET l'image noyau elle-même) est auto-hébergé dans public/v86/,
// sur le même domaine que le site — pas seulement pour l'indépendance vis-à-vis de copy.sh, mais
// parce qu'un vrai utilisateur a rencontré en production un bloqueur de pub qui coupait
// silencieusement les requêtes vers i.copy.sh (un domaine tiers peu connu). Aucune exception JS
// n'était levée dans ce cas — seul l'évènement "download-error" de v86 (ou, en dernier recours,
// le minuteur de blocage silencieux ci-dessous) le révèle.
export const RealBoot: React.FC<RealBootProps> = ({ lang }) => {
  const serialRef = useRef<HTMLTextAreaElement>(null);
  const emulatorRef = useRef<any>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'running' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [progress, setProgress] = useState(0);

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
    setProgress(0);
    stopEmulator();
    if (serialRef.current) serialRef.current.value = '';

    try {
      const base = import.meta.env.BASE_URL;
      const { V86 } = await import(/* @vite-ignore */ `${base}v86/libv86.mjs`);
      // Ce profil Buildroot envoie sa console sur le port série émulé (ttyS0), pas sur le
      // "screen_container" VGA — bug réel trouvé en live : screen_container seul rendait un
      // écran VGA texte vide (span par caractère avec couleur premier-plan/fond noir/noir,
      // le tampon VGA n'étant simplement jamais écrit), alors que le CPU tournait bel et bien
      // (is_running=true, compteur d'instructions en hausse). "serial_container" est l'option
      // distincte de v86 qui capture ce flux série — c'est elle qu'il fallait utiliser ici.
      const emulator = new V86({
        wasm_path: `${base}v86/v86.wasm`,
        memory_size: 128 * 1024 * 1024,
        vga_memory_size: 2 * 1024 * 1024,
        bios: { url: `${base}v86/bios/seabios.bin` },
        vga_bios: { url: `${base}v86/bios/vgabios.bin` },
        bzimage: { url: `${base}v86/buildroot-bzimage.bin` },
        cmdline: 'tsc=reliable mitigations=off random.trust_cpu=on console=ttyS0',
        autostart: true,
      });
      // "serial_container" (l'option auto-liée de v86 pour bios/vga_bios/etc.) a été délibérément
      // évitée ici : un utilisateur réel a rapporté que le clavier n'atteignait jamais la VM avec
      // cette option — probablement un gestionnaire clavier interne (déprécié, potentiellement
      // incomplet) qui entre en conflit avec le nôtre. À la place, on reproduit exactement le
      // pattern de l'exemple officiel examples/serial.html : écouter "serial0-output-byte" pour
      // l'affichage, appeler serial0_send() nous-mêmes pour la saisie — deux chemins totalement
      // indépendants, sans aucune liaison automatique de v86 entre les deux.
      emulator.add_listener('serial0-output-byte', (byte: number) => {
        const char = String.fromCharCode(byte);
        if (char === '\r') return;
        if (serialRef.current) {
          serialRef.current.value += char;
          serialRef.current.scrollTop = serialRef.current.scrollHeight;
        }
      });
      // Les 4 fichiers (wasm/bios/vgabios/bzimage) n'exposent pas de "total" fiable dans leurs
      // évènements de progression (lengthComputable=false, vérifié en live) : tailles réelles
      // codées en dur ici (elles ne bougeront pas, ce sont des assets versionnés dans ce dépôt)
      // pour calculer une vraie progression globale plutôt qu'un simple spinner indéterminé.
      const KNOWN_SIZES: Record<string, number> = {
        'v86.wasm': 2101621,
        'seabios.bin': 131072,
        'vgabios.bin': 36352,
        'buildroot-bzimage.bin': 5166352,
      };
      const GRAND_TOTAL = Object.values(KNOWN_SIZES).reduce((a, b) => a + b, 0);
      const loadedByFile: Record<string, number> = {};
      emulator.add_listener('download-progress', (e: { file_name: string; loaded: number }) => {
        const short = e.file_name.split('/').pop() || e.file_name;
        loadedByFile[short] = e.loaded;
        const sum = Object.values(loadedByFile).reduce((a, b) => a + b, 0);
        setProgress(Math.min(100, Math.round((sum / GRAND_TOTAL) * 100)));
      });

      // v86 charge bios/vga_bios/bzimage de façon asynchrone APRÈS le constructeur : un blocage
      // réseau (bloqueur de pub/extension qui coupe i.copy.sh, un domaine peu connu) ne lève
      // aucune exception JS ici — seul cet évènement le signale. Sans ce hook, l'échec était
      // invisible (aucune erreur affichée, juste un écran qui reste vide indéfiniment).
      emulator.add_listener('download-error', (e: { file_name: string }) => {
        setErrorMsg(
          lang === 'fr'
            ? `Impossible de télécharger "${e.file_name}". Un bloqueur de pub ou une extension de vie privée bloque probablement ce domaine externe — essayez de le désactiver pour ce site, ou ouvrez la page en navigation privée.`
            : `Failed to download "${e.file_name}". An ad blocker or privacy extension is likely blocking this external domain — try disabling it for this site, or open the page in a private/incognito window.`
        );
        setStatus('error');
      });
      emulatorRef.current = emulator;
      setStatus('running');

      // Filet de sécurité : si rien n'apparaît après un délai généreux, le blocage est silencieux
      // (pas d'évènement download-error, juste un CPU qui tourne dans le vide) — prévenir plutôt
      // que de laisser un écran vide sans aucune explication.
      setTimeout(() => {
        if (emulatorRef.current === emulator && serialRef.current?.value.trim() === '') {
          setErrorMsg(
            lang === 'fr'
              ? "Rien ne s'affiche après 15 secondes. Si un bloqueur de pub ou une extension est actif, essayez de le désactiver pour ce site ou d'ouvrir la page en navigation privée."
              : "Nothing has appeared after 15 seconds. If an ad blocker or extension is active, try disabling it for this site or opening the page in a private/incognito window."
          );
        }
      }, 15000);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
      setStatus('error');
    }
  };

  useEffect(() => () => stopEmulator(), []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div className="glass-panel" style={{ padding: '18px' }}>
        <h3 style={{ fontSize: '0.98rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
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
        {status === 'running' && progress < 100 && (
          <div style={{ marginTop: '12px' }}>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
              {lang === 'fr' ? `Téléchargement du noyau et de l'émulateur… ${progress}%` : `Downloading kernel and emulator… ${progress}%`}
            </div>
            <div style={{ height: '6px', borderRadius: '3px', background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${progress}%`, background: 'var(--emerald, #84a05c)', transition: 'width 0.2s ease' }} />
            </div>
          </div>
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
        {status === 'running' && (
          <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', padding: '6px 12px 0' }}>
            {lang === 'fr' ? '⌨️ Cliquez dans le terminal ci-dessous puis tapez — le shell répond réellement (essayez "ls", "uname -a").' : '⌨️ Click inside the terminal below and type — the shell really responds (try "ls", "uname -a").'}
          </p>
        )}
        {/* Textarea gérée intégralement à la main : l'affichage vient du listener
            "serial0-output-byte" ci-dessus, la saisie part via serial0_send() ci-dessous
            (preventDefault empêche toute insertion native pour ne garder que l'écho réel
            renvoyé par la VM). */}
        <textarea
          ref={serialRef}
          spellCheck={false}
          onKeyDown={(e) => {
            if (!emulatorRef.current) return;
            e.preventDefault();
            if (e.key === 'Enter') emulatorRef.current.serial0_send('\n');
            else if (e.key === 'Backspace') emulatorRef.current.serial0_send('\x7f');
            else if (e.key === 'Tab') emulatorRef.current.serial0_send('\t');
            else if (e.ctrlKey && e.key.length === 1) emulatorRef.current.serial0_send(String.fromCharCode(e.key.toUpperCase().charCodeAt(0) - 64));
            else if (e.key.length === 1) emulatorRef.current.serial0_send(e.key);
          }}
          style={{
            display: status === 'idle' ? 'none' : 'block',
            width: '100%',
            height: '400px',
            resize: 'vertical',
            background: '#000',
            color: '#4ade80',
            padding: '12px',
            border: 'none',
            borderRadius: '8px',
            fontFamily: 'monospace',
            fontSize: '0.8rem',
            lineHeight: 1.4,
          }}
        />
      </div>
    </div>
  );
};
