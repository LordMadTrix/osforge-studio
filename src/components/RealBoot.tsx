import React, { useEffect, useRef, useState, useMemo } from 'react';
import {
  Play,
  RotateCcw,
  Power,
  Terminal,
  Copy,
  Check,
  Download,
  Maximize2,
  Minimize2,
  Sparkles,
  Cpu,
  HardDrive,
  Activity,
  Send,
  Trash2,
  FileCode,
  Globe,
  Sliders
} from 'lucide-react';
import { OSRecipe } from '../types/os';

interface RealBootProps {
  lang: 'fr' | 'en';
  recipe?: OSRecipe;
}

type TerminalTheme = 'matrix' | 'cyber' | 'amber' | 'monochrome' | 'synthwave';

const THEMES: Record<TerminalTheme, { name: string; bg: string; text: string; border: string; glow: string }> = {
  matrix: {
    name: 'Matrix CRT',
    bg: '#020904',
    text: '#4ade80',
    border: '#166534',
    glow: 'rgba(74, 222, 128, 0.18)',
  },
  cyber: {
    name: 'Cyber Cyan',
    bg: '#030f1e',
    text: '#38bdf8',
    border: '#0369a1',
    glow: 'rgba(56, 189, 248, 0.18)',
  },
  amber: {
    name: 'Ambre 1982',
    bg: '#120700',
    text: '#fbbf24',
    border: '#b45309',
    glow: 'rgba(251, 191, 36, 0.18)',
  },
  monochrome: {
    name: 'Monochrome',
    bg: '#090d16',
    text: '#f1f5f9',
    border: '#334155',
    glow: 'rgba(241, 245, 249, 0.12)',
  },
  synthwave: {
    name: 'Synthwave',
    bg: '#0e051a',
    text: '#c084fc',
    border: '#7e22ce',
    glow: 'rgba(192, 132, 252, 0.18)',
  },
};

export const RealBoot: React.FC<RealBootProps> = ({ lang, recipe }) => {
  const serialRef = useRef<HTMLTextAreaElement>(null);
  const emulatorRef = useRef<any>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'running' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [progress, setProgress] = useState(0);

  // Ergonomie & Thème du terminal
  const [theme, setTheme] = useState<TerminalTheme>('matrix');
  const [fontSize, setFontSize] = useState<'small' | 'medium' | 'large'>('medium');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [copied, setCopied] = useState(false);

  // Uptime & Métriques
  const [uptimeSeconds, setUptimeSeconds] = useState(0);

  // Barre de commande rapide & Injecteur de script
  const [cmdInput, setCmdInput] = useState('');
  const [showScriptDrawer, setShowScriptDrawer] = useState(false);
  const [customScript, setCustomScript] = useState(
    'echo "=== Test Système v86 ==="\nuname -a\nfree -m\n'
  );

  // Chronomètre d'Uptime
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (status === 'running') {
      interval = setInterval(() => {
        setUptimeSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      setUptimeSeconds(0);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [status]);

  const formatUptime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const stopEmulator = () => {
    try {
      emulatorRef.current?.destroy();
    } catch {
      // Déjà détruit
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

      // Écoute du flux série octet par octet pour l'affichage fidèle
      emulator.add_listener('serial0-output-byte', (byte: number) => {
        const char = String.fromCharCode(byte);
        if (char === '\r') return;
        if (serialRef.current) {
          serialRef.current.value += char;
          serialRef.current.scrollTop = serialRef.current.scrollHeight;
        }
      });

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

      emulator.add_listener('download-error', (e: { file_name: string }) => {
        setErrorMsg(
          lang === 'fr'
            ? `Impossible de télécharger "${e.file_name}". Un bloqueur de pub ou une extension de vie privée bloque probablement ce domaine externe — essayez de le désactiver pour ce site.`
            : `Failed to download "${e.file_name}". An ad blocker or privacy extension is likely blocking this domain.`
        );
        setStatus('error');
      });

      emulatorRef.current = emulator;
      setStatus('running');

      // Auto-focus sur le terminal après démarrage
      setTimeout(() => {
        serialRef.current?.focus();
      }, 600);

      // Filet de sécurité si écran noir prolongé
      setTimeout(() => {
        if (emulatorRef.current === emulator && serialRef.current?.value.trim() === '') {
          setErrorMsg(
            lang === 'fr'
              ? "Rien ne s'affiche après 15 secondes. Si un bloqueur de pub ou une extension est actif, essayez de le désactiver pour ce site."
              : "Nothing has appeared after 15 seconds. If an ad blocker is active, try disabling it for this site."
          );
        }
      }, 15000);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
      setStatus('error');
    }
  };

  useEffect(() => () => stopEmulator(), []);

  // Envoi d'une chaîne ou d'une commande complète au port série
  const sendStringToEmulator = (str: string) => {
    if (!emulatorRef.current || status !== 'running') return;
    emulatorRef.current.serial0_send(str);
  };

  const sendCommand = (cmd: string) => {
    if (!cmd.trim()) return;
    sendStringToEmulator(`${cmd}\n`);
    setCmdInput('');
    serialRef.current?.focus();
  };

  const executeCustomScript = () => {
    if (!customScript.trim()) return;
    const lines = customScript.split('\n');
    lines.forEach((line, idx) => {
      setTimeout(() => {
        sendStringToEmulator(`${line}\n`);
      }, idx * 120);
    });
    serialRef.current?.focus();
  };

  // Copier le contenu du terminal
  const handleCopyLogs = () => {
    if (serialRef.current) {
      navigator.clipboard.writeText(serialRef.current.value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Télécharger le journal de boot
  const handleDownloadLogs = () => {
    if (!serialRef.current) return;
    const blob = new Blob([serialRef.current.value], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `v86-linux-boot-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.log`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  // Effacer l'affichage local du terminal
  const handleClearTerminal = () => {
    if (serialRef.current) {
      serialRef.current.value = '';
    }
    sendStringToEmulator('clear\n');
  };

  // Presets de commandes 1-Clic
  const quickCommands = [
    { label: 'uname -a', desc: lang === 'fr' ? 'Noyau & Architecture' : 'Kernel & Arch', cmd: 'uname -a' },
    { label: 'ls -la /', desc: lang === 'fr' ? 'Arborescence RootFS' : 'Root filesystem', cmd: 'ls -la /' },
    { label: 'free -m', desc: lang === 'fr' ? 'Mémoire vive RAM' : 'RAM usage', cmd: 'free -m' },
    { label: 'df -h', desc: lang === 'fr' ? 'Points de montage disque' : 'Disk mounts', cmd: 'df -h' },
    { label: 'cat /etc/os-release', desc: lang === 'fr' ? 'Distribution & Build' : 'OS Version', cmd: 'cat /etc/os-release' },
    { label: 'udhcpc', desc: lang === 'fr' ? 'Initialiser Réseau DHCP' : 'Init DHCP Network', cmd: 'udhcpc' },
    { label: 'ps aux', desc: lang === 'fr' ? 'Processus actifs' : 'Running processes', cmd: 'ps aux' },
    { label: 'uptime', desc: lang === 'fr' ? 'Temps de fonctionnement' : 'Uptime & load', cmd: 'uptime && date' },
    { label: '🧪 Test I/O', desc: lang === 'fr' ? 'Création de fichier' : 'File write test', cmd: 'echo "OSForge Studio Live OK" > /tmp/osforge.txt && cat /tmp/osforge.txt' },
  ];

  // Presets de scripts d'injection
  const scriptPresets = [
    {
      name: lang === 'fr' ? '📊 Benchmark CPU Boucle' : '📊 CPU Loop Benchmark',
      script: 'echo "Démarrage benchmark CPU..."\ntime for i in $(seq 1 20000); do :; done\necho "Benchmark terminé avec succès !"',
    },
    {
      name: lang === 'fr' ? '👥 Utilisateurs & Groupes' : '👥 Users & Groups',
      script: 'echo "=== /etc/passwd ==="\ncat /etc/passwd\necho "=== /etc/group ==="\ncat /etc/group',
    },
    {
      name: lang === 'fr' ? '💾 Arborescence /proc & /sys' : '💾 Inspect /proc & /sys',
      script: 'cat /proc/cpuinfo | head -n 12\ncat /proc/meminfo | head -n 8\ncat /proc/version',
    },
    ...(recipe?.firstBootScript
      ? [{
          name: lang === 'fr' ? '🚀 Mon Script First-Boot (Recette)' : '🚀 My Recipe First-Boot Script',
          script: recipe.firstBootScript,
        }]
      : []),
  ];

  const currentTheme = THEMES[theme];

  const fontSizeMap = {
    small: '0.74rem',
    medium: '0.84rem',
    large: '0.96rem',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* 1. Header & VM Controls */}
      <div className="glass-panel" style={{ padding: '18px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                🚀 {lang === 'fr' ? 'Démarrage Réel dans le Navigateur' : 'Real Boot in the Browser'}
              </h3>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '3px 8px',
                  borderRadius: '12px',
                  fontSize: '0.72rem',
                  fontWeight: 600,
                  background:
                    status === 'running'
                      ? 'rgba(16, 185, 129, 0.15)'
                      : status === 'loading'
                      ? 'rgba(245, 158, 11, 0.15)'
                      : 'rgba(148, 163, 184, 0.1)',
                  color:
                    status === 'running'
                      ? 'var(--emerald)'
                      : status === 'loading'
                      ? '#f59e0b'
                      : 'var(--text-muted)',
                  border: `1px solid ${
                    status === 'running'
                      ? 'rgba(16, 185, 129, 0.3)'
                      : status === 'loading'
                      ? 'rgba(245, 158, 11, 0.3)'
                      : 'rgba(148, 163, 184, 0.2)'
                  }`,
                }}
              >
                <span
                  style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    background:
                      status === 'running' ? '#10b981' : status === 'loading' ? '#f59e0b' : '#94a3b8',
                    animation: status === 'running' ? 'pulse 2s infinite' : 'none',
                  }}
                />
                {status === 'running'
                  ? (lang === 'fr' ? `Noyau Actif (${formatUptime(uptimeSeconds)})` : `Active Kernel (${formatUptime(uptimeSeconds)})`)
                  : status === 'loading'
                  ? (lang === 'fr' ? `Chargement ${progress}%` : `Loading ${progress}%`)
                  : (lang === 'fr' ? 'VM Arrêtée' : 'VM Stopped')}
              </span>
            </div>

            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.5, margin: 0, maxWidth: '850px' }}>
              {lang === 'fr'
                ? "Ceci n'est pas une simulation : un vrai noyau Linux (Buildroot) démarre dans une machine virtuelle x86 émulée en WebAssembly (v86), directement dans cet onglet. Aucun serveur, rien n'est installé sur votre machine."
                : "This isn't a simulation: a real Linux kernel (Buildroot) boots inside a WebAssembly-emulated x86 virtual machine (v86), directly in this tab. No server, nothing installed on your machine."}
            </p>
          </div>

          {/* VM Action Buttons */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {status !== 'running' && (
              <button className="btn btn-primary" onClick={startEmulator} disabled={status === 'loading'}>
                <Play size={14} />
                {status === 'loading'
                  ? (lang === 'fr' ? `Chargement (${progress}%)` : `Loading (${progress}%)`)
                  : (lang === 'fr' ? 'Démarrer un vrai Linux' : 'Boot a real Linux')}
              </button>
            )}
            {status === 'running' && (
              <>
                <button className="btn btn-secondary" onClick={startEmulator} title={lang === 'fr' ? 'Redémarrer la VM' : 'Restart VM'}>
                  <RotateCcw size={14} />
                  {lang === 'fr' ? 'Redémarrer' : 'Restart'}
                </button>
                <button className="btn btn-secondary" onClick={() => { stopEmulator(); setStatus('idle'); }} title={lang === 'fr' ? 'Éteindre la VM' : 'Power off VM'}>
                  <Power size={14} />
                  {lang === 'fr' ? 'Arrêter' : 'Stop'}
                </button>
              </>
            )}
          </div>
        </div>

        {/* VM Technical Badges */}
        <div style={{ display: 'flex', gap: '8px', marginTop: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', padding: '2px 8px', background: 'rgba(255,255,255,0.04)', borderRadius: '4px', border: '1px solid var(--border-subtle)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <Cpu size={12} color="var(--cyan)" />
            Arch: <strong>x86 i686 (32-bit)</strong>
          </span>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', padding: '2px 8px', background: 'rgba(255,255,255,0.04)', borderRadius: '4px', border: '1px solid var(--border-subtle)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <HardDrive size={12} color="var(--emerald)" />
            RAM: <strong>128 Mo WebAssembly</strong>
          </span>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', padding: '2px 8px', background: 'rgba(255,255,255,0.04)', borderRadius: '4px', border: '1px solid var(--border-subtle)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <Terminal size={12} color="var(--violet)" />
            TTY: <strong>serial0 (ttyS0)</strong>
          </span>
          {recipe?.branding.osName && (
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', padding: '2px 8px', background: 'rgba(255,255,255,0.04)', borderRadius: '4px', border: '1px solid var(--border-subtle)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <Sparkles size={12} color="#f59e0b" />
              Recette : <strong>{recipe.branding.osName}</strong>
            </span>
          )}
        </div>

        {/* Progress bar on download */}
        {status === 'running' && progress < 100 && (
          <div style={{ marginTop: '12px' }}>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '4px', display: 'flex', justifyContent: 'space-between' }}>
              <span>{lang === 'fr' ? "Téléchargement du noyau Buildroot et de l'émulateur WebAssembly…" : "Downloading Buildroot kernel and WASM emulator…"}</span>
              <span className="font-mono">{progress}%</span>
            </div>
            <div style={{ height: '6px', borderRadius: '3px', background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${progress}%`, background: 'var(--emerald, #10b981)', transition: 'width 0.2s ease' }} />
            </div>
          </div>
        )}

        {status === 'error' && (
          <p style={{ fontSize: '0.78rem', color: 'var(--red, #ef4444)', marginTop: '12px', padding: '8px 12px', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '6px', border: '1px solid rgba(239, 68, 68, 0.25)' }}>
            {lang === 'fr' ? "Échec de l'émulateur : " : 'Emulator error: '}{errorMsg}
          </p>
        )}
      </div>

      {/* 2. Interactive Terminal Console with Custom Controls */}
      <div
        className="glass-panel"
        style={{
          padding: '0',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          border: `1px solid ${status === 'running' ? currentTheme.border : 'var(--border-subtle)'}`,
          boxShadow: status === 'running' ? `0 0 25px ${currentTheme.glow}` : 'none',
          transition: 'all 0.3s ease',
          ...(isFullscreen
            ? {
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                zIndex: 9999,
                borderRadius: 0,
                margin: 0,
              }
            : {}),
        }}
      >
        {/* Terminal Header & Toolbar */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '8px 14px',
            background: 'rgba(10, 15, 28, 0.95)',
            borderBottom: '1px solid var(--border-subtle)',
            flexWrap: 'wrap',
            gap: '8px',
          }}
        >
          {/* Window Buttons & Title */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ display: 'flex', gap: '6px' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#ef4444', display: 'inline-block' }} />
              <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#f59e0b', display: 'inline-block' }} />
              <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
            </div>
            <span style={{ fontSize: '0.76rem', fontWeight: 600, color: 'var(--text-muted)', marginLeft: '6px', fontFamily: 'monospace' }}>
              buildroot@v86-x86:~#
            </span>
          </div>

          {/* Customization & Action Bar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            {/* Theme Selector */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ fontSize: '0.70rem', color: 'var(--text-muted)' }}>Thème :</span>
              <select
                className="select-custom font-mono"
                style={{ fontSize: '0.72rem', padding: '2px 6px', height: '24px' }}
                value={theme}
                onChange={(e) => setTheme(e.target.value as TerminalTheme)}
              >
                {Object.entries(THEMES).map(([k, v]) => (
                  <option key={k} value={k}>{v.name}</option>
                ))}
              </select>
            </div>

            {/* Font Size Selector */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ fontSize: '0.70rem', color: 'var(--text-muted)' }}>Taille :</span>
              <div style={{ display: 'inline-flex', borderRadius: '4px', background: 'rgba(255,255,255,0.06)', padding: '2px' }}>
                {(['small', 'medium', 'large'] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => setFontSize(s)}
                    style={{
                      border: 'none',
                      background: fontSize === s ? 'var(--cyan)' : 'transparent',
                      color: fontSize === s ? '#000' : 'var(--text-muted)',
                      fontSize: '0.68rem',
                      fontWeight: 700,
                      padding: '2px 6px',
                      borderRadius: '3px',
                      cursor: 'pointer',
                    }}
                  >
                    {s === 'small' ? 'S' : s === 'medium' ? 'M' : 'L'}
                  </button>
                ))}
              </div>
            </div>

            {/* Clear terminal */}
            <button
              onClick={handleClearTerminal}
              className="btn btn-secondary"
              style={{ fontSize: '0.72rem', padding: '3px 8px', height: '26px' }}
              title={lang === 'fr' ? "Effacer l'affichage" : 'Clear terminal'}
            >
              <Trash2 size={12} />
              {lang === 'fr' ? 'Effacer' : 'Clear'}
            </button>

            {/* Copy Logs */}
            <button
              onClick={handleCopyLogs}
              className="btn btn-secondary"
              style={{ fontSize: '0.72rem', padding: '3px 8px', height: '26px' }}
              title={lang === 'fr' ? 'Copier le log du terminal' : 'Copy terminal text'}
            >
              {copied ? <Check size={12} color="var(--emerald)" /> : <Copy size={12} />}
              {copied ? (lang === 'fr' ? 'Copié !' : 'Copied!') : (lang === 'fr' ? 'Copier' : 'Copy')}
            </button>

            {/* Download Logs */}
            <button
              onClick={handleDownloadLogs}
              className="btn btn-secondary"
              style={{ fontSize: '0.72rem', padding: '3px 8px', height: '26px' }}
              title={lang === 'fr' ? 'Télécharger les logs de session' : 'Download session log'}
            >
              <Download size={12} />
              .log
            </button>

            {/* Fullscreen Toggle */}
            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="btn btn-secondary"
              style={{ fontSize: '0.72rem', padding: '3px 8px', height: '26px' }}
              title={isFullscreen ? (lang === 'fr' ? 'Quitter plein écran' : 'Exit fullscreen') : (lang === 'fr' ? 'Plein écran' : 'Fullscreen')}
            >
              {isFullscreen ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
            </button>
          </div>
        </div>

        {/* Terminal Screen / Idle Placeholder */}
        {status === 'idle' ? (
          <div style={{ padding: '60px 20px', textAlign: 'center', background: currentTheme.bg }}>
            <Terminal size={42} color="var(--emerald)" style={{ marginBottom: '14px', opacity: 0.8 }} />
            <h4 style={{ fontSize: '1.05rem', fontWeight: 600, color: '#f1f5f9', marginBottom: '8px' }}>
              {lang === 'fr' ? 'Machine Virtuelle x86 Prête' : 'x86 Virtual Machine Ready'}
            </h4>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', maxWidth: '520px', margin: '0 auto 18px' }}>
              {lang === 'fr'
                ? 'Cliquez sur "Démarrer un vrai Linux" ci-dessus pour initialiser le BIOS SeaBIOS, charger le noyau Buildroot et ouvrir un vrai shell Linux interactif.'
                : 'Click "Boot a real Linux" above to initialize SeaBIOS, boot the Buildroot Linux kernel, and interact with a live Linux shell.'}
            </p>
            <button className="btn btn-primary" onClick={startEmulator}>
              <Play size={14} />
              {lang === 'fr' ? 'Démarrer un vrai Linux' : 'Boot a real Linux'}
            </button>
          </div>
        ) : (
          <div style={{ position: 'relative', background: currentTheme.bg }}>
            {/* Terminal Saisie / Sortie */}
            <textarea
              ref={serialRef}
              spellCheck={false}
              onPaste={(e) => {
                if (!emulatorRef.current) return;
                e.preventDefault();
                const pasted = e.clipboardData.getData('text');
                if (pasted) {
                  sendStringToEmulator(pasted);
                }
              }}
              onKeyDown={(e) => {
                if (!emulatorRef.current || status !== 'running') return;
                e.preventDefault();

                // Touches spéciales et séquences d'échappement ANSI
                if (e.key === 'Enter') {
                  emulatorRef.current.serial0_send('\n');
                } else if (e.key === 'Backspace') {
                  emulatorRef.current.serial0_send('\x7f');
                } else if (e.key === 'Tab') {
                  emulatorRef.current.serial0_send('\t');
                } else if (e.key === 'Escape') {
                  emulatorRef.current.serial0_send('\x1b');
                } else if (e.key === 'ArrowUp') {
                  emulatorRef.current.serial0_send('\x1b[A');
                } else if (e.key === 'ArrowDown') {
                  emulatorRef.current.serial0_send('\x1b[B');
                } else if (e.key === 'ArrowRight') {
                  emulatorRef.current.serial0_send('\x1b[C');
                } else if (e.key === 'ArrowLeft') {
                  emulatorRef.current.serial0_send('\x1b[D');
                } else if (e.key === 'Home') {
                  emulatorRef.current.serial0_send('\x1b[H');
                } else if (e.key === 'End') {
                  emulatorRef.current.serial0_send('\x1b[F');
                } else if (e.key === 'PageUp') {
                  emulatorRef.current.serial0_send('\x1b[5~');
                } else if (e.key === 'PageDown') {
                  emulatorRef.current.serial0_send('\x1b[6~');
                } else if (e.key === 'Delete') {
                  emulatorRef.current.serial0_send('\x1b[3~');
                } else if (e.ctrlKey && e.key.toLowerCase() === 'c') {
                  emulatorRef.current.serial0_send('\x03');
                } else if (e.ctrlKey && e.key.toLowerCase() === 'd') {
                  emulatorRef.current.serial0_send('\x04');
                } else if (e.ctrlKey && e.key.toLowerCase() === 'l') {
                  emulatorRef.current.serial0_send('\x0c');
                } else if (e.ctrlKey && e.key.toLowerCase() === 'z') {
                  emulatorRef.current.serial0_send('\x1a');
                } else if (e.ctrlKey && e.key.toLowerCase() === 'u') {
                  emulatorRef.current.serial0_send('\x15');
                } else if (e.ctrlKey && e.key.toLowerCase() === 'k') {
                  emulatorRef.current.serial0_send('\x0b');
                } else if (e.ctrlKey && e.key.toLowerCase() === 'w') {
                  emulatorRef.current.serial0_send('\x17');
                } else if (e.ctrlKey && e.key.length === 1) {
                  emulatorRef.current.serial0_send(String.fromCharCode(e.key.toUpperCase().charCodeAt(0) - 64));
                } else if (e.key.length === 1) {
                  emulatorRef.current.serial0_send(e.key);
                }
              }}
              style={{
                width: '100%',
                height: isFullscreen ? 'calc(100vh - 170px)' : '420px',
                resize: isFullscreen ? 'none' : 'vertical',
                background: currentTheme.bg,
                color: currentTheme.text,
                padding: '14px 16px',
                border: 'none',
                outline: 'none',
                fontFamily: '"Fira Code", "Cascadia Code", "JetBrains Mono", Consolas, monospace',
                fontSize: fontSizeMap[fontSize],
                lineHeight: 1.45,
                boxSizing: 'border-box',
                display: 'block',
              }}
            />
          </div>
        )}

        {/* 3. Direct Command Send Bar (Always accessible) */}
        {status === 'running' && (
          <div
            style={{
              padding: '10px 14px',
              background: 'rgba(10, 15, 28, 0.95)',
              borderTop: '1px solid var(--border-subtle)',
              display: 'flex',
              gap: '8px',
              alignItems: 'center',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: currentTheme.text, fontSize: '0.82rem', fontFamily: 'monospace' }}>
              <span>$</span>
            </div>
            <input
              type="text"
              className="input-text font-mono"
              placeholder={lang === 'fr' ? 'Saisissez une commande bash (ex: uname -a, free, ls /)...' : 'Type a bash command (e.g. uname -a, free, ls /)...'}
              value={cmdInput}
              onChange={(e) => setCmdInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  sendCommand(cmdInput);
                }
              }}
              style={{ flex: 1, fontSize: '0.82rem', height: '34px' }}
            />
            <button
              className="btn btn-primary"
              style={{ height: '34px', padding: '0 14px' }}
              onClick={() => sendCommand(cmdInput)}
              disabled={!cmdInput.trim()}
            >
              <Send size={13} />
              {lang === 'fr' ? 'Envoyer ↵' : 'Send ↵'}
            </button>
            <button
              className="btn btn-secondary"
              style={{ height: '34px', padding: '0 12px' }}
              onClick={() => setShowScriptDrawer(!showScriptDrawer)}
              title={lang === 'fr' ? 'Injecteur de script multi-lignes' : 'Multi-line script injector'}
            >
              <FileCode size={14} color="var(--violet)" />
              {lang === 'fr' ? 'Scripts' : 'Scripts'}
            </button>
          </div>
        )}
      </div>

      {/* 4. 1-Click Quick Commands Bar */}
      {status === 'running' && (
        <div className="glass-panel" style={{ padding: '16px' }}>
          <h4 style={{ fontSize: '0.86rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Sparkles size={15} color="var(--cyan)" />
            {lang === 'fr' ? 'Commandes Rapides en 1-Clic (Test en Direct)' : '1-Click Quick Actions (Live Test)'}
          </h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '8px' }}>
            {quickCommands.map((q) => (
              <button
                key={q.cmd}
                onClick={() => sendCommand(q.cmd)}
                className="btn btn-secondary"
                style={{
                  justifyContent: 'flex-start',
                  padding: '8px 12px',
                  height: 'auto',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  textAlign: 'left',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, fontSize: '0.80rem', color: '#f1f5f9' }} className="font-mono">
                  <Terminal size={12} color="var(--emerald)" />
                  {q.label}
                </div>
                <div style={{ fontSize: '0.70rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                  {q.desc}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 5. Custom Script Injector Drawer */}
      {status === 'running' && showScriptDrawer && (
        <div className="glass-panel" style={{ padding: '16px', border: '1px solid var(--violet)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h4 style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px', margin: 0 }}>
              <FileCode size={15} color="var(--violet)" />
              {lang === 'fr' ? 'Injecteur de Script Bash dans la VM' : 'Bash Script Injector into VM'}
            </h4>
            <div style={{ display: 'flex', gap: '6px' }}>
              {scriptPresets.map((p, idx) => (
                <button
                  key={idx}
                  onClick={() => setCustomScript(p.script)}
                  className="btn btn-secondary"
                  style={{ fontSize: '0.72rem', padding: '3px 8px', height: '26px' }}
                >
                  {p.name}
                </button>
              ))}
            </div>
          </div>

          <textarea
            className="textarea-custom font-mono"
            rows={5}
            value={customScript}
            onChange={(e) => setCustomScript(e.target.value)}
            placeholder="# Saisissez vos commandes bash ici..."
            style={{ fontSize: '0.78rem', marginBottom: '10px' }}
          />

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <button className="btn btn-secondary" onClick={() => setShowScriptDrawer(false)}>
              {lang === 'fr' ? 'Fermer' : 'Close'}
            </button>
            <button className="btn btn-primary" onClick={executeCustomScript}>
              <Play size={13} />
              {lang === 'fr' ? 'Exécuter dans la VM' : 'Execute inside VM'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
