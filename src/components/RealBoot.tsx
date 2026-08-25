import React, { useEffect, useRef, useState } from 'react';
import {
  Play,
  RotateCcw,
  Power,
  Pause,
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
  Upload,
  Layers,
  Monitor,
  Wifi,
  Shield,
  Zap,
  Disc,
  FolderOpen,
  Info,
  Server
} from 'lucide-react';
import { OSRecipe } from '../types/os';

interface RealBootProps {
  lang: 'fr' | 'en';
  recipe?: OSRecipe;
}

type TerminalTheme = 'matrix' | 'cyber' | 'amber' | 'monochrome' | 'synthwave';
type BootOSMode = 'buildroot' | 'alpine' | 'debian' | 'tinycore' | 'custom_iso';
type DisplayMode = 'serial' | 'vga';

const THEMES: Record<TerminalTheme, { name: string; bg: string; text: string; border: string; glow: string; accent: string }> = {
  matrix: {
    name: 'Matrix CRT',
    bg: '#020904',
    text: '#4ade80',
    border: '#166534',
    glow: 'rgba(74, 222, 128, 0.22)',
    accent: '#22c55e',
  },
  cyber: {
    name: 'Cyber Cyan',
    bg: '#030f1e',
    text: '#38bdf8',
    border: '#0369a1',
    glow: 'rgba(56, 189, 248, 0.22)',
    accent: '#0284c7',
  },
  amber: {
    name: 'Ambre 1982',
    bg: '#120700',
    text: '#fbbf24',
    border: '#b45309',
    glow: 'rgba(251, 191, 36, 0.22)',
    accent: '#f59e0b',
  },
  monochrome: {
    name: 'Monochrome',
    bg: '#090d16',
    text: '#f1f5f9',
    border: '#334155',
    glow: 'rgba(241, 245, 249, 0.14)',
    accent: '#94a3b8',
  },
  synthwave: {
    name: 'Synthwave',
    bg: '#0e051a',
    text: '#c084fc',
    border: '#7e22ce',
    glow: 'rgba(192, 132, 252, 0.22)',
    accent: '#a855f7',
  },
};

const OS_PRESETS: Record<BootOSMode, {
  name: string;
  distro: string;
  badge: string;
  descFr: string;
  descEn: string;
  icon: string;
  recommendedRam: number;
  isIncluded?: boolean;
}> = {
  buildroot: {
    name: 'Buildroot Micro-Linux',
    distro: 'Buildroot 2024 (x86)',
    badge: '5 Mo • Ultra-Rapide',
    descFr: 'Noyau Linux 5.6 complet embarqué en local. Boot instantané en 1 seconde avec BusyBox et shell ash.',
    descEn: 'Embedded local Linux 5.6 kernel. Instant 1-second boot with BusyBox and ash shell.',
    icon: '🐧',
    recommendedRam: 128,
    isIncluded: true,
  },
  alpine: {
    name: 'Alpine Linux Netboot',
    distro: 'Alpine Linux v3.19 (i686)',
    badge: '14 Mo • apk add',
    descFr: 'Véritable distribution Alpine Linux avec le gestionnaire de paquets apk add et OpenRC.',
    descEn: 'Real Alpine Linux system with official apk add package manager and OpenRC.',
    icon: '🏔️',
    recommendedRam: 256,
  },
  debian: {
    name: 'Debian GNU/Linux Installer',
    distro: 'Debian 12 Bookworm (i386)',
    badge: '18 Mo • Base APT',
    descFr: 'Installeur officiel Debian GNU/Linux avec noyau officiel Debian et console netboot.',
    descEn: 'Official Debian GNU/Linux netboot installer with Debian kernel and base console.',
    icon: '🌀',
    recommendedRam: 512,
  },
  tinycore: {
    name: 'Tiny Core Linux',
    distro: 'Tiny Core 14 (x86)',
    badge: '20 Mo • Bureau Léger',
    descFr: 'Système Linux ultra-compact en RAM avec support X11, FLWM et gestionnaire de paquets TCE.',
    descEn: 'Ultra-compact Linux system running 100% in RAM with X11, FLWM, and TCE manager.',
    icon: '⚡',
    recommendedRam: 256,
  },
  custom_iso: {
    name: 'Image ISO Locale Personnalisée',
    distro: 'ISO Locale (El Torito / GRUB)',
    badge: 'Fichier .iso / .img',
    descFr: 'Chargez votre propre image ISO générée par OSForge Studio (dist/*.iso) ou n’importe quelle ISO x86 32-bit.',
    descEn: 'Load your custom ISO built with OSForge Studio (dist/*.iso) or any x86 32-bit ISO.',
    icon: '💿',
    recommendedRam: 512,
  },
};

type QuickCategory = 'system' | 'memory' | 'network' | 'security' | 'benchmark' | 'recipe';

export const RealBoot: React.FC<RealBootProps> = ({ lang, recipe }) => {
  const serialRef = useRef<HTMLTextAreaElement>(null);
  const screenContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isoFileInputRef = useRef<HTMLInputElement>(null);
  const emulatorRef = useRef<any>(null);
  const loadWatchdogRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // État VM & Système sélectionné
  const [status, setStatus] = useState<'idle' | 'loading' | 'running' | 'paused' | 'error'>('idle');
  const [selectedOS, setSelectedOS] = useState<BootOSMode>('buildroot');
  const [ramSize, setRamSize] = useState<number>(128);
  const [customIsoFile, setCustomIsoFile] = useState<File | null>(null);
  const [customIsoName, setCustomIsoName] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState('');
  const [progress, setProgress] = useState(0);

  // Affichage : Console Série (ttyS0) vs Écran Graphique VGA
  const [displayMode, setDisplayMode] = useState<DisplayMode>('serial');

  // Ergonomie, Thème & Scanlines
  const [theme, setTheme] = useState<TerminalTheme>('matrix');
  const [fontSize, setFontSize] = useState<'small' | 'medium' | 'large'>('medium');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [scanlines, setScanlines] = useState(true);
  const [copied, setCopied] = useState(false);
  const [fileNotice, setFileNotice] = useState<string | null>(null);

  // Télémétrie RX/TX & Uptime
  const [uptimeSeconds, setUptimeSeconds] = useState(0);
  const [rxBytes, setRxBytes] = useState(0);
  const [txBytes, setTxBytes] = useState(0);

  // Commandes & Historique (Flèche Haut / Bas)
  const [cmdInput, setCmdInput] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [activeCategory, setActiveCategory] = useState<QuickCategory>('system');

  // Tiroir Script Personnalisé
  const [showScriptDrawer, setShowScriptDrawer] = useState(false);
  const [customScript, setCustomScript] = useState(
    'echo "=== Test Système v86 ==="\nuname -a\nfree -m\n'
  );

  // Mise à jour de la RAM recommandée quand on change d'OS
  const handleSelectOS = (os: BootOSMode) => {
    setSelectedOS(os);
    setRamSize(OS_PRESETS[os].recommendedRam);
  };

  // Chronomètre d'Uptime
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (status === 'running') {
      interval = setInterval(() => {
        setUptimeSeconds((prev) => prev + 1);
      }, 1000);
    } else if (status === 'idle') {
      setUptimeSeconds(0);
      setRxBytes(0);
      setTxBytes(0);
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

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const stopEmulator = () => {
    try {
      emulatorRef.current?.destroy();
    } catch {
      // Nettoyé
    }
    emulatorRef.current = null;
  };

  const togglePauseEmulator = () => {
    if (!emulatorRef.current) return;
    if (status === 'running') {
      try {
        emulatorRef.current.pause();
        setStatus('paused');
      } catch (err) {
        console.error(err);
      }
    } else if (status === 'paused') {
      try {
        emulatorRef.current.unpause();
        setStatus('running');
      } catch (err) {
        console.error(err);
      }
    }
  };

  const startEmulator = async () => {
    setStatus('loading');
    setErrorMsg('');
    setProgress(0);
    setRxBytes(0);
    setTxBytes(0);
    stopEmulator();
    if (serialRef.current) serialRef.current.value = '';

    // Bug réel trouvé en auditant : le filet de sécurité "chargement bloqué en silence" (un
    // watchdog qui bascule vers l'état "error" si rien ne s'affiche après un délai) a été retiré
    // par un commit récent, sans rien pour le remplacer. Or Alpine/Debian/TinyCore pointent
    // maintenant vers des CDN tiers hotlinkés dont deux (dl-cdn.alpinelinux.org, deb.debian.org)
    // ne renvoient AUCUN header Access-Control-Allow-Origin (vérifié en direct, curl -sI) — un
    // fetch cross-origin y échoue silencieusement côté navigateur — et le troisième
    // (tinycorelinux.net) sert en HTTP pur, bloqué par mixed-content sur une page HTTPS avant même
    // que la requête ne parte. Si v86 n'émet pas fidèlement "download-error" dans ces cas (requête
    // qui ne se termine jamais plutôt que rejetée), l'utilisateur reste bloqué indéfiniment sur
    // "Chargement..." sans aucune explication. Restauré ici comme filet de secours, en plus (pas à
    // la place) du gestionnaire "download-error" existant qui reste la voie rapide normale.
    if (loadWatchdogRef.current) clearTimeout(loadWatchdogRef.current);
    loadWatchdogRef.current = setTimeout(() => {
      setErrorMsg(
        lang === 'fr'
          ? "Le chargement n'a montré aucun signe d'activité après 20s. Le CDN distant bloque probablement les requêtes cross-origin (CORS) ou HTTP mixte — réessayez avec Buildroot (auto-hébergé) ou une ISO locale."
          : 'No loading activity after 20s. The remote CDN likely blocks cross-origin (CORS) or mixed-content requests — try Buildroot (self-hosted) or a local ISO instead.'
      );
      setStatus('error');
    }, 20000);

    try {
      const base = import.meta.env.BASE_URL;
      const { V86 } = await import(/* @vite-ignore */ `${base}v86/libv86.mjs`);

      // Construction de la configuration de démarrage selon le système choisi
      const v86Config: any = {
        wasm_path: `${base}v86/v86.wasm`,
        memory_size: ramSize * 1024 * 1024,
        vga_memory_size: 8 * 1024 * 1024,
        bios: { url: `${base}v86/bios/seabios.bin` },
        vga_bios: { url: `${base}v86/bios/vgabios.bin` },
        autostart: true,
      };

      if (screenContainerRef.current) {
        v86Config.screen_container = screenContainerRef.current;
      }

      if (selectedOS === 'buildroot') {
        v86Config.bzimage = { url: `${base}v86/buildroot-bzimage.bin` };
        v86Config.cmdline = 'tsc=reliable mitigations=off random.trust_cpu=on console=ttyS0';
      } else if (selectedOS === 'alpine') {
        v86Config.bzimage = { url: 'https://dl-cdn.alpinelinux.org/alpine/v3.19/releases/x86/netboot/vmlinuz-lts' };
        v86Config.initrd = { url: 'https://dl-cdn.alpinelinux.org/alpine/v3.19/releases/x86/netboot/initramfs-lts' };
        v86Config.cmdline = 'console=ttyS0 modules=loop,squashfs quiet';
      } else if (selectedOS === 'debian') {
        v86Config.bzimage = { url: 'https://deb.debian.org/debian/dists/bookworm/main/installer-i386/current/images/netboot/debian-installer/i386/linux' };
        v86Config.initrd = { url: 'https://deb.debian.org/debian/dists/bookworm/main/installer-i386/current/images/netboot/debian-installer/i386/initrd.gz' };
        v86Config.cmdline = 'console=ttyS0 priority=low';
      } else if (selectedOS === 'tinycore') {
        v86Config.bzimage = { url: 'http://tinycorelinux.net/14.x/x86/release/distribution_files/vmlinuz' };
        v86Config.initrd = { url: 'http://tinycorelinux.net/14.x/x86/release/distribution_files/core.gz' };
        v86Config.cmdline = 'console=ttyS0 quiet';
      } else if (selectedOS === 'custom_iso') {
        if (!customIsoFile) {
          throw new Error(
            lang === 'fr'
              ? 'Veuillez sélectionner un fichier image ISO (.iso) sur votre disque avant de démarrer.'
              : 'Please select an ISO image file (.iso) from your local disk before starting.'
          );
        }
        v86Config.cdrom = { buffer: customIsoFile };
      }

      const emulator = new V86(v86Config);

      // Écoute du flux série octet par octet pour l'affichage fidèle
      emulator.add_listener('serial0-output-byte', (byte: number) => {
        // Bug réel trouvé en auditant : le watchdog était (à tort) désarmé juste après
        // "setStatus('running')" ci-dessous — or ce setStatus a lieu immédiatement après la
        // CONSTRUCTION de l'objet V86, PAS après un boot confirmé (aucun événement "démarrage
        // réussi" n'existe avant le premier octet série). Reproduit en direct dans le navigateur :
        // avec Alpine (CORS bloqué, confirmé par la console : "blocked by CORS policy", RX/TX
        // restant à 0 B), l'UI affichait quand même "Système Actif" en permanence — la pire régression
        // possible, pire qu'un simple blocage silencieux, puisqu'elle affirme activement un succès
        // qui n'a jamais eu lieu. Le premier octet série reçu est la seule preuve fiable qu'un
        // noyau a réellement démarré : c'est ICI, pas à la construction de V86, que le watchdog doit
        // être désarmé.
        if (loadWatchdogRef.current) {
          clearTimeout(loadWatchdogRef.current);
          loadWatchdogRef.current = null;
        }
        setRxBytes((prev) => prev + 1);
        const char = String.fromCharCode(byte);
        if (char === '\r') return;
        if (serialRef.current) {
          serialRef.current.value += char;
          serialRef.current.scrollTop = serialRef.current.scrollHeight;
        }
      });

      emulator.add_listener('download-progress', (e: { file_name: string; loaded: number; total?: number }) => {
        // Une progression réelle prouve que la requête n'est pas bloquée : on repousse le
        // watchdog au lieu de le laisser expirer sous un simple téléchargement lent.
        if (loadWatchdogRef.current) clearTimeout(loadWatchdogRef.current);
        loadWatchdogRef.current = setTimeout(() => {
          setErrorMsg(
            lang === 'fr'
              ? "Le téléchargement s'est arrêté sans terminer. Le CDN distant bloque probablement les requêtes cross-origin (CORS) ou HTTP mixte — réessayez avec Buildroot (auto-hébergé) ou une ISO locale."
              : 'Download stalled before completing. The remote CDN likely blocks cross-origin (CORS) or mixed-content requests — try Buildroot (self-hosted) or a local ISO instead.'
          );
          setStatus('error');
        }, 20000);
        if (e.total && e.total > 0) {
          setProgress(Math.min(100, Math.round((e.loaded / e.total) * 100)));
        } else {
          setProgress((prev) => Math.min(95, prev + 10));
        }
      });

      emulator.add_listener('download-error', (e: { file_name: string }) => {
        if (loadWatchdogRef.current) {
          clearTimeout(loadWatchdogRef.current);
          loadWatchdogRef.current = null;
        }
        setErrorMsg(
          lang === 'fr'
            ? `Impossible de télécharger "${e.file_name}". Vérifiez votre connexion ou un bloqueur de requêtes cross-origin.`
            : `Failed to download "${e.file_name}". Please check network connection or ad blockers.`
        );
        setStatus('error');
      });

      emulatorRef.current = emulator;
      // "running" ici ne prouve PAS qu'un noyau a réellement démarré (V86 vient juste d'être
      // construit) — voir le commentaire sur "serial0-output-byte" ci-dessus : le watchdog reste
      // volontairement armé jusqu'au premier octet série réel, seule preuve fiable de succès.
      setStatus('running');

      setTimeout(() => {
        if (displayMode === 'serial') {
          serialRef.current?.focus();
        }
      }, 600);
    } catch (err) {
      if (loadWatchdogRef.current) {
        clearTimeout(loadWatchdogRef.current);
        loadWatchdogRef.current = null;
      }
      setErrorMsg(err instanceof Error ? err.message : String(err));
      setStatus('error');
    }
  };

  useEffect(() => () => {
    if (loadWatchdogRef.current) clearTimeout(loadWatchdogRef.current);
    stopEmulator();
  }, []);

  // Envoi d'une chaîne ou d'une commande complète au port série
  const sendStringToEmulator = (str: string) => {
    if (!emulatorRef.current || (status !== 'running' && status !== 'paused')) return;
    setTxBytes((prev) => prev + str.length);
    emulatorRef.current.serial0_send(str);
  };

  const sendCommand = (cmd: string) => {
    if (!cmd.trim()) return;
    sendStringToEmulator(`${cmd}\n`);
    setHistory((prev) => [...prev.filter((h) => h !== cmd), cmd]);
    setHistoryIndex(-1);
    setCmdInput('');
    serialRef.current?.focus();
  };

  const handleKeyDownInput = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      sendCommand(cmdInput);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (history.length === 0) return;
      const nextIndex = historyIndex === -1 ? history.length - 1 : Math.max(0, historyIndex - 1);
      setHistoryIndex(nextIndex);
      setCmdInput(history[nextIndex]);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex === -1) return;
      const nextIndex = historyIndex + 1;
      if (nextIndex >= history.length) {
        setHistoryIndex(-1);
        setCmdInput('');
      } else {
        setHistoryIndex(nextIndex);
        setCmdInput(history[nextIndex]);
      }
    }
  };

  // Chargement d'une ISO Locale
  const handleSelectIsoFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCustomIsoFile(file);
    setCustomIsoName(file.name);
    setSelectedOS('custom_iso');
    setRamSize(512);
  };

  const handleDropIsoFile = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    if (file.name.endsWith('.iso') || file.name.endsWith('.img') || file.name.endsWith('.bin')) {
      setCustomIsoFile(file);
      setCustomIsoName(file.name);
      setSelectedOS('custom_iso');
      setRamSize(512);
    }
  };

  // Injection de Fichier dans la VM
  const injectFileIntoVm = (filename: string, content: string) => {
    const cleanFilename = filename.replace(/[^a-zA-Z0-9_.-]/g, '_');
    const safeContent = content.replace(/\r\n/g, '\n');
    // Bug réel (mineur) trouvé en auditant : le nom de terminateur "INJECT_EOF" était fixe — un
    // fichier injecté qui contient lui-même une ligne strictement égale à "INJECT_EOF" (plausible
    // pour un script utilisant lui-même des heredocs, ou généré par un outil similaire) referme le
    // heredoc prématurément, et le reste du "contenu du fichier" est exécuté comme de vraies
    // commandes shell dans la VM invitée au lieu d'être écrit tel quel dans le fichier cible.
    // Sévérité faible (VM sandbox jetable propre à l'utilisateur, pas une frontière de sécurité
    // réelle), mais casse la promesse de la fonctionnalité ("Injecter Fichier" doit écrire le
    // contenu fidèlement). Corrigé en tirant un terminateur aléatoire par appel et en le
    // re-tirant tant qu'il apparaît comme ligne du contenu (collision pratiquement impossible en
    // un seul tirage, mais vérifiée plutôt que supposée).
    let terminator = `INJECT_EOF_${Math.random().toString(36).slice(2, 10)}`;
    const contentLines = new Set(safeContent.split('\n'));
    while (contentLines.has(terminator)) {
      terminator = `INJECT_EOF_${Math.random().toString(36).slice(2, 10)}`;
    }
    sendStringToEmulator(`cat << '${terminator}' > /tmp/${cleanFilename}\n${safeContent}\n${terminator}\nchmod +x /tmp/${cleanFilename} 2>/dev/null || true\n`);
    setFileNotice(lang === 'fr' ? `✅ Fichier /tmp/${cleanFilename} créé et prêt !` : `✅ File /tmp/${cleanFilename} created!`);
    setTimeout(() => setFileNotice(null), 3500);
    serialRef.current?.focus();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      if (text) injectFileIntoVm(file.name, text);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const executeCustomScript = () => {
    if (!customScript.trim()) return;
    const lines = customScript.split('\n');
    lines.forEach((line, idx) => {
      setTimeout(() => {
        sendStringToEmulator(`${line}\n`);
      }, idx * 100);
    });
    serialRef.current?.focus();
  };

  // Actions de Presse-Papier et Journal
  const handleCopyLogs = () => {
    if (serialRef.current) {
      navigator.clipboard.writeText(serialRef.current.value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

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

  const handleClearTerminal = () => {
    if (serialRef.current) {
      serialRef.current.value = '';
    }
    sendStringToEmulator('clear\n');
  };

  // Catégories de Commandes Rapides
  const categorizedCommands: Record<QuickCategory, { name: string; icon: any; items: { label: string; desc: string; cmd: string }[] }> = {
    system: {
      name: lang === 'fr' ? '🚀 Système & Noyau' : '🚀 System & Kernel',
      icon: Cpu,
      items: [
        { label: 'uname -a', desc: lang === 'fr' ? 'Noyau & Architecture' : 'Kernel & Arch', cmd: 'uname -a' },
        { label: 'cat /etc/os-release', desc: lang === 'fr' ? 'Distribution & Build' : 'OS Version', cmd: 'cat /etc/os-release' },
        { label: 'uptime && date', desc: lang === 'fr' ? 'Temps & Charge CPU' : 'Uptime & load', cmd: 'uptime && date' },
        { label: 'dmesg | tail -n 25', desc: lang === 'fr' ? 'Derniers logs noyau' : 'Kernel boot logs', cmd: 'dmesg | tail -n 25' },
        { label: 'cat /proc/version', desc: lang === 'fr' ? 'Version compilateur GCC' : 'Kernel GCC info', cmd: 'cat /proc/version' },
      ],
    },
    memory: {
      name: lang === 'fr' ? '💾 Mémoire & Disque' : '💾 Memory & Storage',
      icon: HardDrive,
      items: [
        { label: 'free -m', desc: lang === 'fr' ? 'Mémoire vive RAM (Mo)' : 'RAM usage in MB', cmd: 'free -m' },
        { label: 'df -h', desc: lang === 'fr' ? 'Montages disque & RootFS' : 'Filesystem mounts', cmd: 'df -h' },
        { label: 'ls -la /', desc: lang === 'fr' ? 'Arborescence racine' : 'Root directory', cmd: 'ls -la /' },
        { label: 'cat /proc/meminfo', desc: lang === 'fr' ? 'Détails mémoire vive' : 'Detailed memory info', cmd: 'cat /proc/meminfo | head -n 12' },
        { label: 'ls -lh /bin', desc: lang === 'fr' ? 'Exécutables BusyBox' : 'BusyBox binaries', cmd: 'ls -lh /bin | head -n 15' },
      ],
    },
    network: {
      name: lang === 'fr' ? '🌐 Réseau & DHCP' : '🌐 Network & DHCP',
      icon: Wifi,
      items: [
        { label: 'udhcpc -i eth0', desc: lang === 'fr' ? 'Obtenir une IP DHCP' : 'Acquire DHCP Lease', cmd: 'udhcpc -i eth0 2>/dev/null || udhcpc' },
        { label: 'ifconfig -a', desc: lang === 'fr' ? 'Interfaces réseau' : 'Network interfaces', cmd: 'ifconfig -a' },
        { label: 'cat /etc/resolv.conf', desc: lang === 'fr' ? 'Serveurs DNS configurés' : 'DNS nameservers', cmd: 'cat /etc/resolv.conf' },
        { label: 'route -n', desc: lang === 'fr' ? 'Table de routage IP' : 'Routing table', cmd: 'route -n' },
      ],
    },
    security: {
      name: lang === 'fr' ? '👥 Sécurité & Comptes' : '👥 Users & Security',
      icon: Shield,
      items: [
        { label: 'id && whoami', desc: lang === 'fr' ? 'Utilisateur & UID/GID' : 'Current user UID', cmd: 'id && whoami' },
        { label: 'cat /etc/passwd', desc: lang === 'fr' ? 'Comptes utilisateurs' : 'System accounts', cmd: 'cat /etc/passwd' },
        { label: 'ps aux', desc: lang === 'fr' ? 'Processus en cours' : 'Running processes', cmd: 'ps aux' },
        { label: 'env', desc: lang === 'fr' ? 'Variables environnement' : 'Environment variables', cmd: 'env' },
      ],
    },
    benchmark: {
      name: lang === 'fr' ? '⚡ Benchmarks & I/O' : '⚡ Benchmarks & I/O',
      icon: Zap,
      items: [
        { label: 'Benchmark CPU Boucle', desc: lang === 'fr' ? 'Calcul boucle 20k itérations' : 'CPU loop test', cmd: 'time for i in $(seq 1 20000); do :; done' },
        { label: '🧪 Test Écriture Disque', desc: lang === 'fr' ? 'Test I/O dans /tmp' : 'I/O write test', cmd: 'echo "OSForge Studio Live OK" > /tmp/osforge.txt && cat /tmp/osforge.txt' },
        { label: 'cat /proc/cpuinfo', desc: lang === 'fr' ? 'Modèle processeur x86' : 'CPU capabilities', cmd: 'cat /proc/cpuinfo' },
      ],
    },
    recipe: {
      name: lang === 'fr' ? '📜 Recette Active' : '📜 Active Recipe',
      icon: FileCode,
      items: [
        ...(recipe?.firstBootScript
          ? [{ label: 'Exécuter First-Boot', desc: lang === 'fr' ? 'Script post-install de la recette' : 'Run recipe post-install script', cmd: recipe.firstBootScript }]
          : []),
        { label: 'Vérifier Hostname', desc: lang === 'fr' ? 'Test nom d’hôte recette' : 'Check configured hostname', cmd: `echo "Recette configurée : ${recipe?.branding.osName || 'ForgeOS'}" && hostname` },
      ],
    },
  };

  const currentTheme = THEMES[theme];

  const fontSizeMap = {
    small: '0.74rem',
    medium: '0.84rem',
    large: '0.96rem',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {/* 1. Header & Configuration Panel */}
      <div className="glass-panel" style={{ padding: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                🚀 {lang === 'fr' ? 'Démarrage Réel dans le Navigateur (WebAssembly x86)' : 'Real Boot in Browser (WebAssembly x86)'}
              </h3>

              {/* Status Badge */}
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '3px 10px',
                  borderRadius: '12px',
                  fontSize: '0.74rem',
                  fontWeight: 700,
                  background:
                    status === 'running'
                      ? 'rgba(16, 185, 129, 0.18)'
                      : status === 'paused'
                      ? 'rgba(59, 130, 246, 0.18)'
                      : status === 'loading'
                      ? 'rgba(245, 158, 11, 0.18)'
                      : 'rgba(148, 163, 184, 0.1)',
                  color:
                    status === 'running'
                      ? 'var(--emerald)'
                      : status === 'paused'
                      ? '#60a5fa'
                      : status === 'loading'
                      ? '#f59e0b'
                      : 'var(--text-muted)',
                  border: `1px solid ${
                    status === 'running'
                      ? 'rgba(16, 185, 129, 0.35)'
                      : status === 'paused'
                      ? 'rgba(59, 130, 246, 0.35)'
                      : status === 'loading'
                      ? 'rgba(245, 158, 11, 0.35)'
                      : 'rgba(148, 163, 184, 0.2)'
                  }`,
                }}
              >
                <span
                  style={{
                    width: '7px',
                    height: '7px',
                    borderRadius: '50%',
                    background:
                      status === 'running'
                        ? '#10b981'
                        : status === 'paused'
                        ? '#3b82f6'
                        : status === 'loading'
                        ? '#f59e0b'
                        : '#94a3b8',
                    boxShadow: status === 'running' ? '0 0 8px #10b981' : 'none',
                    animation: status === 'running' ? 'pulse 2s infinite' : 'none',
                  }}
                />
                {status === 'running'
                  ? (lang === 'fr' ? `Système Actif (${formatUptime(uptimeSeconds)})` : `Active System (${formatUptime(uptimeSeconds)})`)
                  : status === 'paused'
                  ? (lang === 'fr' ? 'VM en Pause' : 'VM Paused')
                  : status === 'loading'
                  ? (lang === 'fr' ? `Chargement ${progress}%` : `Loading ${progress}%`)
                  : (lang === 'fr' ? 'VM Arrêtée' : 'VM Stopped')}
              </span>
            </div>

            <p style={{ fontSize: '0.80rem', color: 'var(--text-muted)', margin: 0 }}>
              {lang === 'fr'
                ? "Véritable émulateur PC x86 complet (v86 WebAssembly) exécuté 100% dans votre navigateur. Démarre de vrais systèmes Linux ou vos images ISO locales."
                : "Full x86 PC emulator running 100% in your browser. Boots real Linux distributions or your local ISO images."}
            </p>
          </div>

          {/* VM Actions & Power Controls */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {status !== 'running' && status !== 'paused' && (
              <button className="btn btn-primary" onClick={startEmulator} disabled={status === 'loading'}>
                <Play size={14} />
                {status === 'loading'
                  ? (lang === 'fr' ? `Chargement (${progress}%)` : `Loading (${progress}%)`)
                  : (lang === 'fr' ? `Démarrer ${OS_PRESETS[selectedOS].name}` : `Boot ${OS_PRESETS[selectedOS].name}`)}
              </button>
            )}
            {(status === 'running' || status === 'paused') && (
              <>
                <button
                  className="btn btn-secondary"
                  onClick={togglePauseEmulator}
                  title={status === 'paused' ? 'Reprendre la VM' : 'Mettre la VM en pause'}
                >
                  {status === 'paused' ? <Play size={14} color="var(--emerald)" /> : <Pause size={14} />}
                  {status === 'paused' ? (lang === 'fr' ? 'Reprendre' : 'Resume') : (lang === 'fr' ? 'Pause' : 'Pause')}
                </button>
                <button className="btn btn-secondary" onClick={startEmulator} title={lang === 'fr' ? 'Redémarrer la VM' : 'Restart VM'}>
                  <RotateCcw size={14} />
                  {lang === 'fr' ? 'Redémarrer' : 'Restart'}
                </button>
                <button className="btn btn-secondary" onClick={() => { stopEmulator(); setStatus('idle'); }} title={lang === 'fr' ? 'Éteindre la VM' : 'Power off VM'}>
                  <Power size={14} color="#ef4444" />
                  {lang === 'fr' ? 'Arrêter' : 'Stop'}
                </button>
              </>
            )}
          </div>
        </div>

        {/* Bug réel trouvé en auditant : cette grille (le SEUL moyen de changer d'OS) n'était
            affichée qu'à l'état "idle" — or aucun bouton ne ramène jamais "error" vers "idle" (le
            bouton "Éteindre" qui fait setStatus('idle') n'est rendu que pour running/paused). Un
            utilisateur dont le boot échouait (CORS/mixed-content, voir watchdog ci-dessus) restait
            bloqué à répéter indéfiniment le MÊME OS cassé via le bouton "Démarrer" (qui reste
            visible en erreur), sans aucun moyen de choisir Buildroot (le seul OS auto-hébergé, donc
            fiable) à la place. Corrigé en affichant aussi la grille depuis l'état "error". */}
        {(status === 'idle' || status === 'error') && (
          <div style={{ marginTop: '14px' }}>
            <div style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Server size={13} color="var(--cyan)" />
              {lang === 'fr' ? 'Choisissez le système Linux à démarrer :' : 'Select Linux system to boot:'}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '8px' }}>
              {(Object.entries(OS_PRESETS) as [BootOSMode, typeof OS_PRESETS['buildroot']][]).map(([key, os]) => {
                const isSelected = selectedOS === key;
                return (
                  <div
                    key={key}
                    onClick={() => handleSelectOS(key)}
                    style={{
                      padding: '10px 12px',
                      borderRadius: '6px',
                      background: isSelected ? 'rgba(14, 165, 233, 0.12)' : 'rgba(255,255,255,0.02)',
                      border: `1px solid ${isSelected ? 'var(--cyan)' : 'var(--border-subtle)'}`,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.84rem', fontWeight: 700, color: isSelected ? 'var(--cyan)' : '#f1f5f9', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span>{os.icon}</span> {os.name}
                      </span>
                      <span style={{ fontSize: '0.66rem', padding: '1px 6px', borderRadius: '4px', background: 'rgba(255,255,255,0.06)', color: 'var(--text-muted)' }}>
                        {os.badge}
                      </span>
                    </div>
                    <p style={{ fontSize: '0.70rem', color: 'var(--text-muted)', margin: 0 }}>
                      {lang === 'fr' ? os.descFr : os.descEn}
                    </p>
                  </div>
                );
              })}
            </div>

            {/* Custom ISO file loader strip if selected */}
            {selectedOS === 'custom_iso' && (
              <div
                style={{
                  marginTop: '10px',
                  padding: '12px',
                  background: 'rgba(14, 165, 233, 0.06)',
                  border: '1px dashed var(--cyan)',
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '10px',
                }}
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDropIsoFile}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Disc size={22} color="var(--cyan)" />
                  <div>
                    <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#f1f5f9' }}>
                      {customIsoName ? `Image sélectionnée : ${customIsoName}` : (lang === 'fr' ? 'Glissez-déposez votre fichier .iso ou cliquez pour parcourir' : 'Drop your .iso file or click to browse')}
                    </div>
                    <div style={{ fontSize: '0.70rem', color: 'var(--text-muted)' }}>
                      {customIsoFile ? `${(customIsoFile.size / (1024 * 1024)).toFixed(1)} Mo` : (lang === 'fr' ? 'Prend en charge vos ISOs compilées (dist/*.iso) ou toute ISO x86' : 'Supports your built ISOs (dist/*.iso) or any x86 ISO')}
                    </div>
                  </div>
                </div>

                <input
                  type="file"
                  ref={isoFileInputRef}
                  accept=".iso,.img,.bin"
                  style={{ display: 'none' }}
                  onChange={handleSelectIsoFile}
                />
                <button
                  className="btn btn-secondary"
                  onClick={() => isoFileInputRef.current?.click()}
                  style={{ fontSize: '0.74rem', padding: '4px 12px' }}
                >
                  <FolderOpen size={13} />
                  {lang === 'fr' ? 'Parcourir mes ISOs...' : 'Browse ISOs...'}
                </button>
              </div>
            )}
          </div>
        )}

        {/* 1.2 RAM Selector & Technical Badges */}
        <div style={{ display: 'flex', gap: '8px', marginTop: '12px', flexWrap: 'wrap', alignItems: 'center', borderTop: '1px solid var(--border-subtle)', paddingTop: '10px' }}>
          {/* RAM Size Pill */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ fontSize: '0.70rem', color: 'var(--text-muted)' }}>RAM WASM :</span>
            <div style={{ display: 'inline-flex', borderRadius: '4px', background: 'rgba(255,255,255,0.06)', padding: '2px' }}>
              {[128, 256, 512].map((sz) => (
                <button
                  key={sz}
                  onClick={() => setRamSize(sz)}
                  disabled={status === 'running' || status === 'paused'}
                  style={{
                    border: 'none',
                    background: ramSize === sz ? 'var(--emerald)' : 'transparent',
                    color: ramSize === sz ? '#000' : 'var(--text-muted)',
                    fontSize: '0.68rem',
                    fontWeight: 700,
                    padding: '2px 6px',
                    borderRadius: '3px',
                    cursor: (status === 'running' || status === 'paused') ? 'default' : 'pointer',
                  }}
                >
                  {sz} Mo
                </button>
              ))}
            </div>
          </div>

          <span style={{ fontSize: '0.72rem', color: '#f1f5f9', padding: '3px 8px', background: 'rgba(255,255,255,0.04)', borderRadius: '4px', border: '1px solid var(--border-subtle)', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
            <Cpu size={12} color="var(--cyan)" />
            Arch: <strong>x86 i686 (32-bit)</strong>
          </span>

          <span style={{ fontSize: '0.72rem', color: '#f1f5f9', padding: '3px 8px', background: 'rgba(255,255,255,0.04)', borderRadius: '4px', border: '1px solid var(--border-subtle)', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
            <Terminal size={12} color="var(--violet)" />
            Port: <strong>ttyS0 (115200 bps)</strong>
          </span>

          {recipe?.branding.osName && (
            <span style={{ fontSize: '0.72rem', color: '#f1f5f9', padding: '3px 8px', background: 'rgba(255,255,255,0.04)', borderRadius: '4px', border: '1px solid var(--border-subtle)', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
              <Sparkles size={12} color="#f59e0b" />
              Recette: <strong>{recipe.branding.osName}</strong>
            </span>
          )}

          {/* Telemetry Pills */}
          {(status === 'running' || status === 'paused') && (
            <>
              <span style={{ fontSize: '0.70rem', color: 'var(--text-muted)', padding: '3px 8px', background: 'rgba(0,0,0,0.3)', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.05)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <Activity size={11} color="var(--emerald)" />
                RX: <strong className="font-mono">{formatBytes(rxBytes)}</strong>
              </span>
              <span style={{ fontSize: '0.70rem', color: 'var(--text-muted)', padding: '3px 8px', background: 'rgba(0,0,0,0.3)', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.05)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                TX: <strong className="font-mono">{formatBytes(txBytes)}</strong>
              </span>
            </>
          )}
        </div>

        {/* Loading progress bar */}
        {status === 'loading' && (
          <div style={{ marginTop: '12px' }}>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '4px', display: 'flex', justifyContent: 'space-between' }}>
              <span>{lang === 'fr' ? `Initialisation de ${OS_PRESETS[selectedOS].name}…` : `Initializing ${OS_PRESETS[selectedOS].name}…`}</span>
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

      {/* 2. Interactive Terminal / VGA Console Window */}
      <div
        className="glass-panel"
        style={{
          padding: '0',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          border: `1px solid ${status === 'running' ? currentTheme.border : 'var(--border-subtle)'}`,
          boxShadow: status === 'running' ? `0 0 30px ${currentTheme.glow}` : 'none',
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

            {/* Display Mode Toggle: Serial (ttyS0) vs VGA Graphic */}
            <div style={{ display: 'inline-flex', borderRadius: '4px', background: 'rgba(255,255,255,0.06)', padding: '2px', marginLeft: '6px' }}>
              <button
                onClick={() => setDisplayMode('serial')}
                style={{
                  border: 'none',
                  background: displayMode === 'serial' ? 'var(--cyan)' : 'transparent',
                  color: displayMode === 'serial' ? '#000' : 'var(--text-muted)',
                  fontSize: '0.70rem',
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: '3px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <Terminal size={11} />
                {lang === 'fr' ? 'Console Série (ttyS0)' : 'Serial Console (ttyS0)'}
              </button>
              <button
                onClick={() => setDisplayMode('vga')}
                style={{
                  border: 'none',
                  background: displayMode === 'vga' ? 'var(--cyan)' : 'transparent',
                  color: displayMode === 'vga' ? '#000' : 'var(--text-muted)',
                  fontSize: '0.70rem',
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: '3px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <Monitor size={11} />
                {lang === 'fr' ? 'Écran VGA Graphique' : 'VGA Screen'}
              </button>
            </div>
          </div>

          {/* Customization & Action Bar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            {/* CRT Scanlines Toggle */}
            <button
              onClick={() => setScanlines(!scanlines)}
              className="btn btn-secondary"
              style={{
                fontSize: '0.70rem',
                padding: '2px 8px',
                height: '24px',
                background: scanlines ? 'rgba(74, 222, 128, 0.15)' : 'transparent',
                borderColor: scanlines ? 'var(--emerald)' : 'var(--border-subtle)',
                color: scanlines ? 'var(--emerald)' : 'var(--text-muted)',
              }}
              title={lang === 'fr' ? 'Activer/Désactiver effet CRT Scanlines' : 'Toggle CRT Scanlines'}
            >
              <Monitor size={12} />
              CRT
            </button>

            {/* Theme Selector */}
            {displayMode === 'serial' && (
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
            )}

            {/* Font Size Selector */}
            {displayMode === 'serial' && (
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
            )}

            {/* Clear terminal */}
            <button
              onClick={handleClearTerminal}
              className="btn btn-secondary"
              style={{ fontSize: '0.70rem', padding: '2px 7px', height: '24px' }}
              title={lang === 'fr' ? "Effacer l'affichage" : 'Clear terminal'}
            >
              <Trash2 size={11} />
              {lang === 'fr' ? 'Effacer' : 'Clear'}
            </button>

            {/* Copy Logs */}
            <button
              onClick={handleCopyLogs}
              className="btn btn-secondary"
              style={{ fontSize: '0.70rem', padding: '2px 7px', height: '24px' }}
              title={lang === 'fr' ? 'Copier le log du terminal' : 'Copy terminal text'}
            >
              {copied ? <Check size={11} color="var(--emerald)" /> : <Copy size={11} />}
              {copied ? (lang === 'fr' ? 'Copié !' : 'Copied!') : (lang === 'fr' ? 'Copier' : 'Copy')}
            </button>

            {/* Download Logs */}
            <button
              onClick={handleDownloadLogs}
              className="btn btn-secondary"
              style={{ fontSize: '0.70rem', padding: '2px 7px', height: '24px' }}
              title={lang === 'fr' ? 'Télécharger les logs de session' : 'Download session log'}
            >
              <Download size={11} />
              .log
            </button>

            {/* Fullscreen Toggle */}
            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="btn btn-secondary"
              style={{ fontSize: '0.70rem', padding: '2px 7px', height: '24px' }}
              title={isFullscreen ? (lang === 'fr' ? 'Quitter plein écran' : 'Exit fullscreen') : (lang === 'fr' ? 'Plein écran' : 'Fullscreen')}
            >
              {isFullscreen ? <Minimize2 size={11} /> : <Maximize2 size={11} />}
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
                ? `Prêt à démarrer ${OS_PRESETS[selectedOS].name} avec ${ramSize} Mo de RAM. Cliquez sur "Démarrer" pour lancer l'émulation.`
                : `Ready to boot ${OS_PRESETS[selectedOS].name} with ${ramSize} MB RAM. Click "Boot" to start emulation.`}
            </p>
            <button className="btn btn-primary" onClick={startEmulator}>
              <Play size={14} />
              {lang === 'fr' ? `Démarrer ${OS_PRESETS[selectedOS].name}` : `Boot ${OS_PRESETS[selectedOS].name}`}
            </button>
          </div>
        ) : (
          <div
            className={scanlines ? 'crt-scanlines' : ''}
            style={{ position: 'relative', background: currentTheme.bg }}
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleFileUpload as any}
          >
            {/* Mode 1 : Terminal Série Saisie / Sortie */}
            <textarea
              ref={serialRef}
              className="term-scroll"
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
                if (!emulatorRef.current || (status !== 'running' && status !== 'paused')) return;
                e.preventDefault();

                // Touches spéciales et séquences d'échappement ANSI
                if (e.key === 'Enter') {
                  sendStringToEmulator('\n');
                } else if (e.key === 'Backspace') {
                  sendStringToEmulator('\x7f');
                } else if (e.key === 'Tab') {
                  sendStringToEmulator('\t');
                } else if (e.key === 'Escape') {
                  sendStringToEmulator('\x1b');
                } else if (e.key === 'ArrowUp') {
                  sendStringToEmulator('\x1b[A');
                } else if (e.key === 'ArrowDown') {
                  sendStringToEmulator('\x1b[B');
                } else if (e.key === 'ArrowRight') {
                  sendStringToEmulator('\x1b[C');
                } else if (e.key === 'ArrowLeft') {
                  sendStringToEmulator('\x1b[D');
                } else if (e.key === 'Home') {
                  sendStringToEmulator('\x1b[H');
                } else if (e.key === 'End') {
                  sendStringToEmulator('\x1b[F');
                } else if (e.key === 'PageUp') {
                  sendStringToEmulator('\x1b[5~');
                } else if (e.key === 'PageDown') {
                  sendStringToEmulator('\x1b[6~');
                } else if (e.key === 'Delete') {
                  sendStringToEmulator('\x1b[3~');
                } else if (e.ctrlKey && e.key.toLowerCase() === 'c') {
                  sendStringToEmulator('\x03');
                } else if (e.ctrlKey && e.key.toLowerCase() === 'd') {
                  sendStringToEmulator('\x04');
                } else if (e.ctrlKey && e.key.toLowerCase() === 'l') {
                  sendStringToEmulator('\x0c');
                } else if (e.ctrlKey && e.key.toLowerCase() === 'z') {
                  sendStringToEmulator('\x1a');
                } else if (e.ctrlKey && e.key.toLowerCase() === 'u') {
                  sendStringToEmulator('\x15');
                } else if (e.ctrlKey && e.key.toLowerCase() === 'k') {
                  sendStringToEmulator('\x0b');
                } else if (e.ctrlKey && e.key.toLowerCase() === 'w') {
                  sendStringToEmulator('\x17');
                } else if (e.ctrlKey && e.key.length === 1) {
                  sendStringToEmulator(String.fromCharCode(e.key.toUpperCase().charCodeAt(0) - 64));
                } else if (e.key.length === 1) {
                  sendStringToEmulator(e.key);
                }
              }}
              style={{
                width: '100%',
                height: isFullscreen ? 'calc(100vh - 210px)' : '420px',
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
                display: displayMode === 'serial' ? 'block' : 'none',
              }}
            />

            {/* Mode 2 : Écran Graphique VGA Container */}
            <div
              ref={screenContainerRef}
              style={{
                width: '100%',
                minHeight: isFullscreen ? 'calc(100vh - 210px)' : '420px',
                background: '#000',
                display: displayMode === 'vga' ? 'flex' : 'none',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'auto',
                padding: '10px',
              }}
            />

            {/* Notification de fichier injecté */}
            {fileNotice && (
              <div
                style={{
                  position: 'absolute',
                  top: '12px',
                  right: '16px',
                  padding: '6px 14px',
                  background: 'rgba(16, 185, 129, 0.9)',
                  color: '#fff',
                  fontSize: '0.76rem',
                  fontWeight: 600,
                  borderRadius: '4px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
                  zIndex: 20,
                  animation: 'fadeIn 0.2s ease',
                }}
              >
                {fileNotice}
              </div>
            )}
          </div>
        )}

        {/* 3. Special Keys & Signal Control Strip (1-Click Control) */}
        {(status === 'running' || status === 'paused') && (
          <div
            style={{
              padding: '6px 14px',
              background: 'rgba(6, 10, 20, 0.98)',
              borderTop: '1px solid rgba(255,255,255,0.06)',
              display: 'flex',
              gap: '6px',
              alignItems: 'center',
              flexWrap: 'wrap',
            }}
          >
            <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 600, marginRight: '4px' }}>
              SIGNAUX :
            </span>
            <button
              onClick={() => sendStringToEmulator('\x03')}
              className="btn btn-secondary"
              style={{ fontSize: '0.68rem', padding: '2px 8px', height: '22px', fontFamily: 'monospace' }}
              title="Interrompre le processus (SIGINT)"
            >
              Ctrl+C
            </button>
            <button
              onClick={() => sendStringToEmulator('\x0c')}
              className="btn btn-secondary"
              style={{ fontSize: '0.68rem', padding: '2px 8px', height: '22px', fontFamily: 'monospace' }}
              title="Effacer le terminal"
            >
              Ctrl+L
            </button>
            <button
              onClick={() => sendStringToEmulator('\t')}
              className="btn btn-secondary"
              style={{ fontSize: '0.68rem', padding: '2px 8px', height: '22px', fontFamily: 'monospace' }}
              title="Autocomplétion"
            >
              Tab ⇥
            </button>
            <button
              onClick={() => sendStringToEmulator('\x04')}
              className="btn btn-secondary"
              style={{ fontSize: '0.68rem', padding: '2px 8px', height: '22px', fontFamily: 'monospace' }}
              title="EOF / Déconnexion"
            >
              Ctrl+D
            </button>
            <button
              onClick={() => sendStringToEmulator('\x1a')}
              className="btn btn-secondary"
              style={{ fontSize: '0.68rem', padding: '2px 8px', height: '22px', fontFamily: 'monospace' }}
              title="Suspendre en arrière-plan (SIGTSTP)"
            >
              Ctrl+Z
            </button>
            <button
              onClick={() => sendStringToEmulator('\n')}
              className="btn btn-secondary"
              style={{ fontSize: '0.68rem', padding: '2px 8px', height: '22px', fontFamily: 'monospace' }}
              title="Entrée"
            >
              Enter ↵
            </button>

            {/* Hidden File Input for Injection */}
            <input
              type="file"
              ref={fileInputRef}
              style={{ display: 'none' }}
              onChange={handleFileUpload}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="btn btn-secondary"
              style={{ fontSize: '0.68rem', padding: '2px 8px', height: '22px', marginLeft: 'auto' }}
              title={lang === 'fr' ? 'Injecter un fichier .sh/.txt dans /tmp/' : 'Inject file into /tmp/'}
            >
              <Upload size={11} color="var(--cyan)" />
              {lang === 'fr' ? 'Injecter Fichier' : 'Inject File'}
            </button>
          </div>
        )}

        {/* 4. Direct Command Input Bar */}
        {(status === 'running' || status === 'paused') && (
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
              onKeyDown={handleKeyDownInput}
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

      {/* 5. Integrated Categorized 1-Click Command Dock (Zero Scroll Hub) */}
      {(status === 'running' || status === 'paused') && (
        <div className="glass-panel" style={{ padding: '14px' }}>
          {/* Category Tabs */}
          <div style={{ display: 'flex', gap: '6px', marginBottom: '12px', flexWrap: 'wrap', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '10px' }}>
            {(Object.entries(categorizedCommands) as [QuickCategory, typeof categorizedCommands['system']][]).map(([k, cat]) => {
              const Icon = cat.icon;
              const isActive = activeCategory === k;
              return (
                <button
                  key={k}
                  onClick={() => setActiveCategory(k)}
                  className={`btn ${isActive ? 'btn-primary' : 'btn-secondary'}`}
                  style={{
                    fontSize: '0.74rem',
                    padding: '4px 10px',
                    height: '28px',
                    borderRadius: '4px',
                    fontWeight: isActive ? 700 : 500,
                  }}
                >
                  <Icon size={12} />
                  {cat.name}
                </button>
              );
            })}
          </div>

          {/* Quick Action Items for Active Category */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '8px' }}>
            {categorizedCommands[activeCategory].items.map((q) => (
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
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, fontSize: '0.78rem', color: '#f1f5f9' }} className="font-mono">
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

      {/* 6. Custom Multi-Line Script Injector Drawer */}
      {(status === 'running' || status === 'paused') && showScriptDrawer && (
        <div className="glass-panel" style={{ padding: '16px', border: '1px solid var(--violet)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h4 style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px', margin: 0 }}>
              <FileCode size={15} color="var(--violet)" />
              {lang === 'fr' ? 'Injecteur de Script Bash dans la VM' : 'Bash Script Injector into VM'}
            </h4>
            <div style={{ display: 'flex', gap: '6px' }}>
              <button
                onClick={() => setCustomScript('time for i in $(seq 1 20000); do :; done\necho "Terminé !"')}
                className="btn btn-secondary"
                style={{ fontSize: '0.72rem', padding: '3px 8px', height: '26px' }}
              >
                Benchmark
              </button>
              <button
                onClick={() => setCustomScript('cat /etc/passwd\ncat /etc/group')}
                className="btn btn-secondary"
                style={{ fontSize: '0.72rem', padding: '3px 8px', height: '26px' }}
              >
                Passwd
              </button>
              {recipe?.firstBootScript && (
                <button
                  onClick={() => setCustomScript(recipe.firstBootScript!)}
                  className="btn btn-secondary"
                  style={{ fontSize: '0.72rem', padding: '3px 8px', height: '26px' }}
                >
                  First-Boot
                </button>
              )}
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
