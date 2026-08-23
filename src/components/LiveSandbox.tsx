import React, { useState, useRef, useEffect } from 'react';
import type { OSRecipe } from '../types/os';
import { DISTROS } from '../data/distros';
import { DESKTOPS } from '../data/desktopEnvironments';
import { calculateEstimatedSizeAndRam } from '../services/buildSimulator';
import { resolvePackageList } from '../services/scriptGenerators';
import {
  Play,
  RotateCcw,
  Maximize2,
  Minimize2,
  Terminal,
  Folder,
  Globe,
  Shield,
  Camera,
  Layers,
  X,
  Power,
  FileCode,
  Wifi
} from 'lucide-react';

interface LiveSandboxProps {
  recipe: OSRecipe;
  lang: 'fr' | 'en';
}

type VMState = 'stopped' | 'bios' | 'grub' | 'booting' | 'running' | 'paused';

export const LiveSandbox: React.FC<LiveSandboxProps> = ({ recipe, lang }) => {
  const [vmState, setVmState] = useState<VMState>('running');
  const [bootLogs, setBootLogs] = useState<string[]>([]);
  const [grubSelection, setGrubSelection] = useState<number>(0);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [snapshotCount, setSnapshotCount] = useState<number>(0);
  const [snapshotNotice, setSnapshotNotice] = useState<string>('');

  // Virtual Window Manager State
  const [openWindows, setOpenWindows] = useState<string[]>(['terminal']);
  const [activeWindow, setActiveWindow] = useState<string>('terminal');
  const [isStartMenuOpen, setIsStartMenuOpen] = useState<boolean>(false);

  // Terminal State
  const [inputCommand, setInputCommand] = useState('');
  const [history, setHistory] = useState<string[]>([
    `Linux ${recipe.hostname} 6.8.0-28-${recipe.kernel} (${recipe.arch})`,
    `OSForge WebVM • Distribution: ${recipe.distro.toUpperCase()} (${recipe.branding.osName})`,
    `Connecté en tant que: ${recipe.user.username} (UID 1000, GID 1000)`,
    `Tapez 'help' pour la liste des commandes ou essayez 'fastfetch', 'htop', 'ls -la'.`,
    '',
  ]);

  // Virtual Browser State
  const [browserUrl, setBrowserUrl] = useState<string>(recipe.kioskUrl || 'https://console.openfactory.tech/');

  // Virtual File Manager State
  const [currentPath, setCurrentPath] = useState<string>('/home/' + recipe.user.username);
  const [viewingFile, setViewingFile] = useState<{ name: string; content: string } | null>(null);

  // VM Hardware Config
  const [vRam] = useState<number>(4096);
  const [vCpus] = useState<number>(4);

  const terminalEndRef = useRef<HTMLDivElement>(null);
  const bootLogsEndRef = useRef<HTMLDivElement>(null);
  const vmContainerRef = useRef<HTMLDivElement>(null);

  const distro = DISTROS.find(d => d.id === recipe.distro) || DISTROS[0];
  const desktop = DESKTOPS.find(d => d.id === recipe.desktop) || DESKTOPS[0];
  const metrics = calculateEstimatedSizeAndRam(recipe);
  const pkgs = resolvePackageList(recipe);

  // Auto scroll terminal
  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history]);

  // Boot sequence logic
  const handlePowerOn = () => {
    setVmState('bios');
    setBootLogs([]);

    // 1. BIOS stage (0.8s)
    setTimeout(() => {
      setVmState('grub');
      // 2. Auto boot from GRUB after 2 seconds
      setTimeout(() => {
        setVmState('booting');
        runBootSequence();
      }, 1800);
    }, 900);
  };

  const runBootSequence = () => {
    const sequence = [
      `[    0.000000] Linux version 6.8.0-28-${recipe.kernel} (osforge@build-server) #1 SMP PREEMPT_DYNAMIC`,
      `[    0.012431] Command line: BOOT_IMAGE=/live/vmlinuz boot=live quiet splash hostname=${recipe.hostname}`,
      `[    0.142019] x86/fpu: Supporting XSAVE feature 0x001: 'x87 floating point registers'`,
      `[    0.320140] Memory: ${vRam}MB available (${metrics.ramMB}MB kernel and modules reserved)`,
      `[    0.510291] CPU: Virtual CPU @ 3.20GHz (${vCpus} cores active)`,
      `[    0.720190] ACPI: Core revision 20260101`,
      `[    0.910400] systemd[1]: Inserted module 'autofs4'`,
      `[  OK  ] Mounted /sys/kernel/security.`,
      `[  OK  ] Started File System Check on Root Device.`,
      `[  OK  ] Mounted /tmp.`,
      `[  OK  ] Reached target Local File Systems.`,
      `[  OK  ] Starting Network Time Synchronization...`,
      `[  OK  ] Started D-Bus System Message Bus.`,
      `[  OK  ] Started Network Manager (DHCP IP 192.168.122.42).`,
      `[  OK  ] Started OpenSSH Server Daemon (Port 22).`,
      recipe.security.firewall === 'ufw' ? `[  OK  ] Started Uncomplicated Firewall (UFW Level ${recipe.security.cisBenchmarkLevel}).` : `[  OK  ] Firewall service ready.`,
      recipe.selectedPackages.includes('docker') ? `[  OK  ] Started Docker Application Container Engine.` : `[  OK  ] Initialized container subsystems.`,
      `[  OK  ] Executing /root/firstboot.sh hook...`,
      `[  OK  ] Reached target Multi-User System.`,
      recipe.desktop !== 'none' ? `[  OK  ] Starting Display Manager (${recipe.displayManager || 'sddm'})...` : `[  OK  ] Starting TTY1 Console...`,
      `[  OK  ] Reached target Graphical Interface. Welcome to ${recipe.branding.osName}!`,
    ];

    let i = 0;
    const interval = setInterval(() => {
      if (i < sequence.length) {
        setBootLogs(prev => [...prev, sequence[i]]);
        i++;
      } else {
        clearInterval(interval);
        setTimeout(() => {
          setVmState('running');
        }, 500);
      }
    }, 85);
  };

  const handleReboot = () => {
    setVmState('bios');
    setOpenWindows(['terminal']);
    setActiveWindow('terminal');
    setTimeout(() => {
      setVmState('booting');
      runBootSequence();
    }, 800);
  };

  const handleTakeSnapshot = () => {
    setSnapshotCount(prev => prev + 1);
    setSnapshotNotice(`📸 Snapshot #${snapshotCount + 1} capturé avec succès (${new Date().toLocaleTimeString()})`);
    setTimeout(() => setSnapshotNotice(''), 3000);
  };

  const toggleWindow = (winId: string) => {
    if (openWindows.includes(winId)) {
      if (activeWindow === winId) {
        setOpenWindows(openWindows.filter(w => w !== winId));
      } else {
        setActiveWindow(winId);
      }
    } else {
      setOpenWindows([...openWindows, winId]);
      setActiveWindow(winId);
    }
  };

  const closeWindow = (winId: string) => {
    setOpenWindows(openWindows.filter(w => w !== winId));
  };

  // Virtual Terminal Command Handler
  const handleCommand = (e: React.FormEvent) => {
    e.preventDefault();
    const cmd = inputCommand.trim();
    if (!cmd) return;

    const newHistory = [...history, `${recipe.user.username}@${recipe.hostname}:~$ ${cmd}`];
    const lower = cmd.toLowerCase();

    if (lower === 'clear') {
      setHistory([]);
      setInputCommand('');
      return;
    } else if (lower === 'help') {
      newHistory.push(
        'Commandes disponibles dans la WebVM :',
        '  fastfetch / neofetch  - Affiche le logo ASCII et les specs de l’OS',
        '  uname -a              - Affiche le noyau et l’architecture',
        '  htop / btop           - Moniteur de processus en temps réel',
        '  cat /etc/os-release   - Métadonnées officielles de la distribution',
        '  ls -la [rep]          - Liste les fichiers et dossiers',
        '  pkg-list / packages   - Liste les paquets préinstallés',
        '  docker ps / docker    - Statut des conteneurs',
        '  sudo ufw status       - Statut du pare-feu et des ports',
        '  ip addr / ping        - Configuration réseau virtuelle',
        '  df -h / free -m       - Espace disque et consommation RAM',
        '  cowsay [texte]        - La célèbre mascotte Linux',
        '  reboot / poweroff     - Redémarrer ou éteindre la VM',
        '  clear                 - Efface l’écran'
      );
    } else if (lower === 'uname -a' || lower === 'uname') {
      newHistory.push(`Linux ${recipe.hostname} 6.8.0-28-${recipe.kernel} #1 SMP PREEMPT_DYNAMIC ${recipe.arch} GNU/Linux`);
    } else if (lower === 'fastfetch' || lower === 'neofetch') {
      const ascii = getAsciiLogo(recipe.distro);
      newHistory.push(
        ascii,
        `  OS: ${recipe.branding.osName} (${distro.name} ${recipe.distroVersion})`,
        `  Host: OSForge Cloud Sandbox v2.4`,
        `  Kernel: 6.8.0-28-${recipe.kernel}`,
        `  Uptime: 12 mins`,
        `  Packages: ${pkgs.length} (${distro.packageManager})`,
        `  Shell: ${recipe.user.shell}`,
        `  DE / WM: ${desktop.name.split(' (')[0]}`,
        `  CPU: Virtual CPU (4) @ 3.20GHz`,
        `  Memory: ${metrics.ramMB}MB / ${vRam}MB`,
        `  Disk: ${metrics.isoSizeMB}MB / 32GB`
      );
    } else if (lower.includes('cat /etc/os-release')) {
      newHistory.push(
        `PRETTY_NAME="${recipe.branding.osName} (${recipe.branding.editionName})"`,
        `NAME="${recipe.branding.osName}"`,
        `VERSION_ID="${recipe.branding.version}"`,
        `VERSION="${recipe.branding.version} (${distro.name})"`,
        `ID=${recipe.distro}`,
        `ID_LIKE="linux"`,
        `HOME_URL="https://console.openfactory.tech/"`
      );
    } else if (lower.startsWith('cowsay')) {
      const msg = cmd.slice(7) || 'OSForge Studio est genial !';
      newHistory.push(
        ` ____________________________________`,
        `< ${msg} >`,
        ` ------------------------------------`,
        `        \\   ^__^`,
        `         \\  (oo)\\_______`,
        `            (__)\\       )\\/\\`,
        `                ||----w |`,
        `                ||     ||`
      );
    } else if (lower === 'htop' || lower === 'btop') {
      newHistory.push(
        `[||||||||                  ${metrics.ramMB}MB / ${vRam}MB]  CPU: 2.8% [|||       ]`,
        `PID  USER      PRI  NI  VIRT   RES   SHR S CPU% MEM%   TIME+  Command`,
        `  1  root       20   0  168M   14M    9M S  0.0  0.2  0:01.2 init [systemd]`,
        `120  ${recipe.user.username}    20   0  420M   85M   32M S  1.4  1.2  0:04.8 ${desktop.id !== 'none' ? desktop.id : 'bash'}`,
        `240  ${recipe.user.username}    20   0  110M   18M    8M S  0.1  0.2  0:00.3 systemd-journald`,
        `350  root       20   0  820M  120M   45M S  0.4  1.8  0:02.1 dockerd`
      );
    } else if (lower === 'docker ps' || lower === 'docker') {
      newHistory.push(
        'CONTAINER ID   IMAGE                 COMMAND                  CREATED         STATUS         PORTS                  NAMES',
        '8b5f3a1290c4   nginx:alpine          "/docker-entrypoint.…"   5 minutes ago   Up 5 minutes   0.0.0.0:80->80/tcp     web-app',
        '3c2e1f9a887b   redis:7-alpine        "docker-entrypoint.s…"   5 minutes ago   Up 5 minutes   0.0.0.0:6379->6379/tcp cache-db'
      );
    } else if (lower.includes('ufw') || lower.includes('firewall')) {
      newHistory.push(
        `Status: ${recipe.security.firewall === 'ufw' ? 'active' : 'inactive'}`,
        `CIS Level: ${recipe.security.cisBenchmarkLevel}`,
        'To                         Action      From',
        '--                         ------      ----',
        '22/tcp (SSH)               ALLOW       Anywhere',
        '80,443/tcp (HTTP/S)        ALLOW       Anywhere'
      );
    } else if (lower === 'reboot') {
      handleReboot();
      return;
    } else if (lower === 'poweroff' || lower === 'shutdown') {
      setVmState('stopped');
      return;
    } else if (lower === 'free -m' || lower === 'free') {
      newHistory.push(
        '               total        used        free      shared  buff/cache   available',
        `Mem:            ${vRam}         ${metrics.ramMB}        ${vRam - metrics.ramMB - 400}          32         400        ${vRam - metrics.ramMB}`,
        'Swap:           2048           0        2048'
      );
    } else if (lower === 'df -h') {
      newHistory.push(
        'Filesystem      Size  Used Avail Use% Mounted on',
        `overlay          32G  ${(metrics.isoSizeMB / 1024).toFixed(1)}G   30G   4% /`,
        'tmpfs           2.0G     0  2.0G   0% /dev/shm',
        '/dev/sda1       512M   48M  464M  10% /boot/efi'
      );
    } else if (lower.includes('pkg-list') || lower === 'packages') {
      newHistory.push(`Logiciels préinstallés (${pkgs.length}) :`, pkgs.join(', '));
    } else if (lower.startsWith('ls')) {
      newHistory.push(
        '.bashrc   .zshrc   .config/   Documents/   Downloads/',
        'Desktop/   .ssh/   firstboot.log   recipe.json   README.md'
      );
    } else {
      newHistory.push(`bash: ${cmd}: commande introuvable. Tapez 'help' pour les commandes disponibles.`);
    }

    newHistory.push('');
    setHistory(newHistory);
    setInputCommand('');
  };

  // Filesystem mock data
  const virtualFiles: Record<string, { type: 'file' | 'dir'; size?: string; content?: string }[]> = {
    [`/home/${recipe.user.username}`]: [
      { type: 'dir', name: 'Desktop' } as any,
      { type: 'dir', name: 'Documents' } as any,
      { type: 'dir', name: 'Downloads' } as any,
      { type: 'dir', name: '.config' } as any,
      { type: 'file', name: 'recipe.json', size: '1.4 Ko', content: JSON.stringify(recipe, null, 2) },
      { type: 'file', name: 'firstboot.log', size: '320 o', content: `[2026-08-22] ${recipe.branding.osName} first boot completed successfully.\nHostname: ${recipe.hostname}\nUser: ${recipe.user.username}` },
      { type: 'file', name: 'welcome.txt', size: '540 o', content: `Bienvenue sur ${recipe.branding.osName} (${recipe.branding.editionName}) !\nCe système d'exploitation a été conçu avec OSForge Studio.\n\nBase: ${recipe.distro}\nBureau: ${recipe.desktop}\nNoyau: ${recipe.kernel}` },
    ],
    '/etc': [
      { type: 'file', name: 'hostname', size: '12 o', content: recipe.hostname },
      { type: 'file', name: 'os-release', size: '280 o', content: `NAME="${recipe.branding.osName}"\nVERSION="${recipe.branding.version}"\nID=${recipe.distro}` },
      { type: 'file', name: 'timezone', size: '16 o', content: recipe.timezone },
    ],
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Top VM Hardware Control Bar */}
      <div className="glass-panel" style={{ padding: '14px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
        {/* Left: VM Status & Specs */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              backgroundColor: vmState === 'running' ? '#10b981' : vmState === 'stopped' ? '#ef4444' : '#f59e0b',
              boxShadow: `0 0 10px ${vmState === 'running' ? '#10b981' : vmState === 'stopped' ? '#ef4444' : '#f59e0b'}`,
            }} />
            <span style={{ fontWeight: 700, fontSize: '0.92rem', color: '#f8fafc' }}>
              OSForge WebVM
            </span>
            <span className="badge badge-cyan" style={{ fontSize: '0.68rem' }}>
              {vmState === 'running' ? 'Active / 60 FPS' : vmState === 'stopped' ? 'Éteinte' : 'Démarrage...'}
            </span>
          </div>

          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'flex', gap: '12px' }}>
            <span>RAM Virtuelle: <strong style={{ color: '#f1f5f9' }}>{vRam} Mo</strong></span>
            <span>CPU Cores: <strong style={{ color: '#f1f5f9' }}>{vCpus} vCPU</strong></span>
            <span>GPU: <strong style={{ color: 'var(--cyan)' }}>VirtIO-3D (Wasm)</strong></span>
          </div>
        </div>

        {/* Right: Power & Action Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {snapshotNotice && (
            <span style={{ fontSize: '0.78rem', color: '#34d399', fontWeight: 600, animation: 'fadeIn 0.2s ease' }}>
              {snapshotNotice}
            </span>
          )}

          {vmState === 'stopped' ? (
            <button onClick={handlePowerOn} className="btn btn-emerald" style={{ padding: '6px 14px', fontSize: '0.82rem' }}>
              <Play size={14} />
              <span>{lang === 'fr' ? 'Démarrer la VM' : 'Start VM'}</span>
            </button>
          ) : (
            <>
              <button onClick={handleReboot} className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '0.8rem' }} title="Redémarrer">
                <RotateCcw size={14} />
                <span>Reboot</span>
              </button>
              <button onClick={handleTakeSnapshot} className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '0.8rem' }} title="Prendre un snapshot">
                <Camera size={14} />
                <span>Snapshot</span>
              </button>
              <button onClick={() => setVmState('stopped')} className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '0.8rem', color: '#f87171' }} title="Éteindre">
                <Power size={14} />
                <span>Stop</span>
              </button>
            </>
          )}

          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="btn btn-secondary"
            style={{ padding: '6px 10px' }}
            title="Plein écran"
          >
            {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
          </button>
        </div>
      </div>

      {/* Main Virtual Monitor Display Screen */}
      <div
        ref={vmContainerRef}
        style={{
          height: isFullscreen ? '100vh' : '580px',
          position: isFullscreen ? 'fixed' : 'relative',
          top: isFullscreen ? 0 : 'auto',
          left: isFullscreen ? 0 : 'auto',
          right: isFullscreen ? 0 : 'auto',
          bottom: isFullscreen ? 0 : 'auto',
          zIndex: isFullscreen ? 9999 : 10,
          background: '#040711',
          border: isFullscreen ? 'none' : '2px solid rgba(6, 182, 212, 0.4)',
          borderRadius: isFullscreen ? 0 : '16px',
          overflow: 'hidden',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.9), 0 0 30px rgba(6, 182, 212, 0.15)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
        }}
      >
        {/* ========================================================================= */}
        {/* STATE 1 : VM STOPPED SCREEN                                               */}
        {/* ========================================================================= */}
        {vmState === 'stopped' && (
          <div style={{
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '16px',
            background: 'radial-gradient(circle at center, #0d1527 0%, #040711 80%)',
          }}>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '20px',
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <Power size={32} color="#f87171" />
            </div>
            <h3 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#f8fafc' }}>
              Machine Virtuelle Éteinte
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', maxWidth: '440px', textAlign: 'center' }}>
              Cliquez ci-dessous pour lancer la séquence de démarrage UEFI/BIOS et tester votre distribution {recipe.branding.osName}.
            </p>
            <button onClick={handlePowerOn} className="btn btn-emerald" style={{ padding: '12px 28px', fontSize: '1rem' }}>
              <Play size={18} />
              <span>Démarrer {recipe.branding.osName} (Live Boot)</span>
            </button>
          </div>
        )}

        {/* ========================================================================= */}
        {/* STATE 2 : BIOS / POST SCREEN                                              */}
        {/* ========================================================================= */}
        {vmState === 'bios' && (
          <div style={{
            height: '100%',
            background: '#000000',
            color: '#cbd5e1',
            fontFamily: 'var(--font-mono)',
            padding: '24px',
            fontSize: '0.85rem',
            lineHeight: '1.6',
          }}>
            <div style={{ color: 'var(--cyan)', fontWeight: 700, marginBottom: '12px' }}>
              OSForge Virtual BIOS v2.4 (c) 2026 OpenFactory Tech
            </div>
            <div>CPU: OSForge Virtual Processor (4 Cores @ 3.20GHz)</div>
            <div>RAM: {vRam} MB System Memory OK</div>
            <div>Primary Master: OSForge-Virtual-NVMe-32GB</div>
            <div>Boot Media: [CD-ROM / Live ISO] {recipe.branding.osName}-{recipe.arch}.iso</div>
            <div style={{ marginTop: '16px', color: '#34d399' }}>
              Booting from CD-ROM... Loading EFI Bootloader...
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* STATE 3 : GRUB BOOTLOADER SCREEN                                          */}
        {/* ========================================================================= */}
        {vmState === 'grub' && (
          <div style={{
            height: '100%',
            background: '#070b19',
            color: '#f8fafc',
            fontFamily: 'var(--font-mono)',
            padding: '32px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}>
            <div>
              <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                <h3 style={{ fontSize: '1.2rem', color: 'var(--cyan)', fontWeight: 800 }}>
                  GNU GRUB version 2.06 — {recipe.branding.osName} ({recipe.branding.editionName})
                </h3>
              </div>

              <div style={{ maxWidth: '600px', margin: '0 auto', border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '12px' }}>
                {[
                  `* ${recipe.branding.osName} (${recipe.distro.toUpperCase()}) [Mode Live Standard]`,
                  `  ${recipe.branding.osName} (Mode Failsafe / Sans échec)`,
                  `  Test de la mémoire RAM (Memtest86+)`,
                  `  Démarrer sur le disque local`,
                ].map((entry, idx) => (
                  <div
                    key={idx}
                    onClick={() => {
                      setGrubSelection(idx);
                      setVmState('booting');
                      runBootSequence();
                    }}
                    style={{
                      padding: '8px 12px',
                      background: grubSelection === idx ? 'var(--cyan)' : 'transparent',
                      color: grubSelection === idx ? '#04121e' : '#e2e8f0',
                      fontWeight: grubSelection === idx ? 700 : 500,
                      cursor: 'pointer',
                      borderRadius: '4px',
                    }}
                  >
                    {entry}
                  </div>
                ))}
              </div>
            </div>

            <div style={{ textAlign: 'center', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              Démarrage automatique dans 2 secondes... Appuyez sur Entrée pour valider.
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* STATE 4 : KERNEL & SYSTEMD BOOT LOGS                                      */}
        {/* ========================================================================= */}
        {vmState === 'booting' && (
          <div style={{
            height: '100%',
            background: '#000000',
            color: '#f8fafc',
            fontFamily: 'var(--font-mono)',
            padding: '18px',
            fontSize: '0.8rem',
            lineHeight: '1.5',
            overflowY: 'auto',
          }}>
            {bootLogs.map((line, idx) => (
              <div key={idx} style={{ color: line.includes('[  OK  ]') ? '#34d399' : line.includes('Linux version') ? 'var(--cyan)' : '#cbd5e1' }}>
                {line}
              </div>
            ))}
            <div ref={bootLogsEndRef} />
          </div>
        )}

        {/* ========================================================================= */}
        {/* STATE 5 : RUNNING OS (DESKTOP / KIOSK / HEADLESS)                         */}
        {/* ========================================================================= */}
        {vmState === 'running' && (
          <div style={{
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            background: desktop.previewGradient,
            position: 'relative',
            overflow: 'hidden',
          }}>
            {/* Top Bar / Status Panel */}
            <div style={{
              background: 'rgba(5, 8, 16, 0.85)',
              backdropFilter: 'blur(12px)',
              padding: '6px 16px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: '0.8rem',
              color: '#f8fafc',
              borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
              zIndex: 50,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <button
                  onClick={() => setIsStartMenuOpen(!isStartMenuOpen)}
                  style={{
                    background: isStartMenuOpen ? 'var(--cyan)' : 'rgba(255, 255, 255, 0.1)',
                    color: isStartMenuOpen ? '#04121e' : '#f8fafc',
                    border: 'none',
                    padding: '4px 10px',
                    borderRadius: '6px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <Layers size={13} />
                  <span>{recipe.branding.osName}</span>
                </button>

                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    onClick={() => toggleWindow('terminal')}
                    style={{
                      background: openWindows.includes('terminal') ? 'rgba(6, 182, 212, 0.2)' : 'transparent',
                      color: openWindows.includes('terminal') ? 'var(--cyan)' : 'var(--text-muted)',
                      border: 'none',
                      padding: '3px 8px',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '0.75rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <Terminal size={12} />
                    <span>Terminal</span>
                  </button>

                  <button
                    onClick={() => toggleWindow('files')}
                    style={{
                      background: openWindows.includes('files') ? 'rgba(6, 182, 212, 0.2)' : 'transparent',
                      color: openWindows.includes('files') ? 'var(--cyan)' : 'var(--text-muted)',
                      border: 'none',
                      padding: '3px 8px',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '0.75rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <Folder size={12} />
                    <span>Fichiers</span>
                  </button>

                  <button
                    onClick={() => toggleWindow('browser')}
                    style={{
                      background: openWindows.includes('browser') ? 'rgba(6, 182, 212, 0.2)' : 'transparent',
                      color: openWindows.includes('browser') ? 'var(--cyan)' : 'var(--text-muted)',
                      border: 'none',
                      padding: '3px 8px',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '0.75rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <Globe size={12} />
                    <span>Navigateur</span>
                  </button>

                  <button
                    onClick={() => toggleWindow('security')}
                    style={{
                      background: openWindows.includes('security') ? 'rgba(16, 185, 129, 0.2)' : 'transparent',
                      color: openWindows.includes('security') ? '#34d399' : 'var(--text-muted)',
                      border: 'none',
                      padding: '3px 8px',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '0.75rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <Shield size={12} />
                    <span>Sécurité CIS</span>
                  </button>
                </div>
              </div>

              {/* Time & User Status */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', fontSize: '0.76rem' }}>
                <span style={{ color: 'var(--cyan)', fontFamily: 'var(--font-mono)' }}>
                  IP: 192.168.122.42
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Wifi size={12} color="#10b981" /> 100%
                </span>
                <span style={{ fontWeight: 600 }}>
                  {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
                <span style={{ color: 'var(--text-muted)' }}>
                  👤 {recipe.user.username}
                </span>
              </div>
            </div>

            {/* Start Menu Dropdown */}
            {isStartMenuOpen && (
              <div style={{
                position: 'absolute',
                top: '38px',
                left: '12px',
                width: '280px',
                background: 'rgba(8, 12, 22, 0.95)',
                backdropFilter: 'blur(16px)',
                borderRadius: '10px',
                border: '1px solid rgba(6, 182, 212, 0.3)',
                boxShadow: '0 10px 30px rgba(0,0,0,0.8)',
                padding: '12px',
                zIndex: 100,
                animation: 'scaleUp 0.15s ease-out',
              }}>
                <div style={{ paddingBottom: '8px', borderBottom: '1px solid var(--border-subtle)', marginBottom: '8px' }}>
                  <div style={{ fontWeight: 700, color: '#f8fafc', fontSize: '0.9rem' }}>{recipe.branding.osName}</div>
                  <div style={{ fontSize: '0.74rem', color: 'var(--cyan)' }}>{recipe.branding.editionName}</div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <button
                    onClick={() => { toggleWindow('terminal'); setIsStartMenuOpen(false); }}
                    style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 8px', background: 'transparent', border: 'none', color: '#f1f5f9', fontSize: '0.8rem', cursor: 'pointer', borderRadius: '4px', textAlign: 'left' }}
                  >
                    <Terminal size={14} color="var(--cyan)" /> Terminal Interactif
                  </button>
                  <button
                    onClick={() => { toggleWindow('files'); setIsStartMenuOpen(false); }}
                    style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 8px', background: 'transparent', border: 'none', color: '#f1f5f9', fontSize: '0.8rem', cursor: 'pointer', borderRadius: '4px', textAlign: 'left' }}
                  >
                    <Folder size={14} color="#f59e0b" /> Explorateur de Fichiers
                  </button>
                  <button
                    onClick={() => { toggleWindow('browser'); setIsStartMenuOpen(false); }}
                    style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 8px', background: 'transparent', border: 'none', color: '#f1f5f9', fontSize: '0.8rem', cursor: 'pointer', borderRadius: '4px', textAlign: 'left' }}
                  >
                    <Globe size={14} color="var(--violet)" /> Navigateur Web
                  </button>
                  <button
                    onClick={() => { toggleWindow('security'); setIsStartMenuOpen(false); }}
                    style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 8px', background: 'transparent', border: 'none', color: '#f1f5f9', fontSize: '0.8rem', cursor: 'pointer', borderRadius: '4px', textAlign: 'left' }}
                  >
                    <Shield size={14} color="#10b981" /> Centre de Sécurité CIS
                  </button>
                </div>

                <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between' }}>
                  <button onClick={handleReboot} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '0.74rem', cursor: 'pointer' }}>
                    🔄 Reboot
                  </button>
                  <button onClick={() => setVmState('stopped')} style={{ background: 'none', border: 'none', color: '#f87171', fontSize: '0.74rem', cursor: 'pointer' }}>
                    ⏹️ Éteindre
                  </button>
                </div>
              </div>
            )}

            {/* Desktop Work Area & Floating Windows */}
            <div style={{ flex: 1, position: 'relative', padding: '16px', overflow: 'hidden' }}>

              {/* Special Kiosk Overlay if Kiosk mode */}
              {recipe.desktop === 'web_kiosk' && (
                <div style={{
                  position: 'absolute',
                  inset: 0,
                  background: '#040711',
                  zIndex: 20,
                  display: 'flex',
                  flexDirection: 'column',
                }}>
                  <div style={{ background: '#0d1322', padding: '6px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-subtle)', fontSize: '0.78rem' }}>
                    <span style={{ color: '#ec4899', fontWeight: 700 }}>🔒 Mode Borne Kiosk Verrouillé (Chromium Fullscreen)</span>
                    <span style={{ color: 'var(--text-muted)' }}>URL: {recipe.kioskUrl || 'https://console.openfactory.tech/'}</span>
                  </div>
                  <div style={{ flex: 1, padding: '30px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
                    <Globe size={48} color="#ec4899" style={{ marginBottom: '14px' }} />
                    <h3 style={{ fontSize: '1.4rem', color: '#ffffff', marginBottom: '8px' }}>
                      Borne d'Affichage Dynamique Active
                    </h3>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', maxWidth: '520px', marginBottom: '16px' }}>
                      Affichage plein écran automatique de l'application web cible : <strong style={{ color: '#f472b6' }}>{recipe.kioskUrl || 'https://console.openfactory.tech/'}</strong>
                    </p>
                    <button onClick={() => toggleWindow('terminal')} className="btn btn-secondary" style={{ fontSize: '0.8rem' }}>
                      <Terminal size={14} /> Ouvrir la console de maintenance
                    </button>
                  </div>
                </div>
              )}

              {/* WINDOW 1: TERMINAL WINDOW */}
              {openWindows.includes('terminal') && (
                <div style={{
                  position: 'absolute',
                  top: '20px',
                  left: '30px',
                  width: '560px',
                  height: '360px',
                  background: '#040711',
                  border: '1px solid rgba(6, 182, 212, 0.4)',
                  borderRadius: '10px',
                  boxShadow: '0 16px 40px rgba(0,0,0,0.8)',
                  display: 'flex',
                  flexDirection: 'column',
                  zIndex: activeWindow === 'terminal' ? 30 : 25,
                }} onClick={() => setActiveWindow('terminal')}>
                  {/* Window Titlebar */}
                  <div style={{
                    background: '#0a101f',
                    padding: '8px 12px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    borderBottom: '1px solid var(--border-subtle)',
                    borderTopLeftRadius: '10px',
                    borderTopRightRadius: '10px',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Terminal size={14} color="var(--cyan)" />
                      <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#f8fafc', fontFamily: 'var(--font-mono)' }}>
                        {recipe.user.username}@{recipe.hostname}: ~
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button onClick={() => closeWindow('terminal')} style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer' }}>
                        <X size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Terminal Content */}
                  <div style={{
                    flex: 1,
                    padding: '12px',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.8rem',
                    lineHeight: '1.5',
                    color: '#38bdf8',
                    overflowY: 'auto',
                  }}>
                    {history.map((l, i) => (
                      <div key={i} style={{ whiteSpace: 'pre-wrap' }}>{l}</div>
                    ))}
                    <div ref={terminalEndRef} />
                  </div>

                  {/* Terminal Input */}
                  <form onSubmit={handleCommand} style={{
                    display: 'flex',
                    alignItems: 'center',
                    background: '#070c18',
                    borderTop: '1px solid var(--border-subtle)',
                    padding: '8px 12px',
                  }}>
                    <span style={{ color: 'var(--emerald)', fontWeight: 700, fontFamily: 'var(--font-mono)', marginRight: '6px', fontSize: '0.8rem' }}>
                      {recipe.user.username}@{recipe.hostname}:~$
                    </span>
                    <input
                      type="text"
                      className="input-text font-mono"
                      value={inputCommand}
                      onChange={(e) => setInputCommand(e.target.value)}
                      placeholder="Tapez 'fastfetch', 'htop', 'help'..."
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#f8fafc',
                        padding: 0,
                        outline: 'none',
                        boxShadow: 'none',
                        fontSize: '0.8rem',
                        flex: 1,
                      }}
                      autoFocus
                    />
                  </form>
                </div>
              )}

              {/* WINDOW 2: FILE MANAGER WINDOW */}
              {openWindows.includes('files') && (
                <div style={{
                  position: 'absolute',
                  top: '50px',
                  left: '180px',
                  width: '520px',
                  height: '340px',
                  background: '#0d1322',
                  border: '1px solid rgba(245, 158, 11, 0.4)',
                  borderRadius: '10px',
                  boxShadow: '0 16px 40px rgba(0,0,0,0.8)',
                  display: 'flex',
                  flexDirection: 'column',
                  zIndex: activeWindow === 'files' ? 30 : 25,
                }} onClick={() => setActiveWindow('files')}>
                  <div style={{
                    background: '#151d30',
                    padding: '8px 12px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    borderBottom: '1px solid var(--border-subtle)',
                    borderTopLeftRadius: '10px',
                    borderTopRightRadius: '10px',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Folder size={14} color="#f59e0b" />
                      <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#f8fafc' }}>
                        Gestionnaire de Fichiers — {currentPath}
                      </span>
                    </div>
                    <button onClick={() => closeWindow('files')} style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer' }}>
                      <X size={14} />
                    </button>
                  </div>

                  <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
                    {/* Sidebar */}
                    <div style={{ width: '130px', background: '#090e1a', padding: '10px', borderRight: '1px solid var(--border-subtle)', fontSize: '0.75rem', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <button onClick={() => { setCurrentPath(`/home/${recipe.user.username}`); setViewingFile(null); }} style={{ background: 'none', border: 'none', color: '#cbd5e1', textAlign: 'left', cursor: 'pointer' }}>
                        🏠 Dossier Perso
                      </button>
                      <button onClick={() => { setCurrentPath('/etc'); setViewingFile(null); }} style={{ background: 'none', border: 'none', color: '#cbd5e1', textAlign: 'left', cursor: 'pointer' }}>
                        ⚙️ /etc (Système)
                      </button>
                    </div>

                    {/* Files Grid */}
                    <div style={{ flex: 1, padding: '12px', overflowY: 'auto' }}>
                      {viewingFile ? (
                        <div>
                          <button onClick={() => setViewingFile(null)} className="btn btn-secondary" style={{ padding: '2px 8px', fontSize: '0.72rem', marginBottom: '8px' }}>
                            ← Retour
                          </button>
                          <h5 style={{ fontSize: '0.8rem', color: 'var(--cyan)', marginBottom: '4px' }}>{viewingFile.name}</h5>
                          <pre style={{ background: '#040711', padding: '8px', borderRadius: '6px', fontSize: '0.74rem', color: '#38bdf8', overflowX: 'auto', maxHeight: '180px' }}>
                            <code>{viewingFile.content}</code>
                          </pre>
                        </div>
                      ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))', gap: '10px' }}>
                          {(virtualFiles[currentPath] || []).map((f, i) => (
                            <div
                              key={i}
                              onClick={() => f.type === 'file' && setViewingFile(f as any)}
                              style={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '8px',
                                borderRadius: '6px',
                                background: 'rgba(255,255,255,0.03)',
                                cursor: 'pointer',
                                textAlign: 'center',
                              }}
                            >
                              {f.type === 'dir' ? <Folder size={26} color="#f59e0b" /> : <FileCode size={26} color="var(--cyan)" />}
                              <span style={{ fontSize: '0.72rem', color: '#f1f5f9', wordBreak: 'break-all' }}>{(f as any).name}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* WINDOW 3: SECURITY & CIS DASHBOARD WINDOW */}
              {openWindows.includes('security') && (
                <div style={{
                  position: 'absolute',
                  top: '60px',
                  left: '260px',
                  width: '460px',
                  height: '320px',
                  background: '#0d1322',
                  border: '1px solid rgba(16, 185, 129, 0.4)',
                  borderRadius: '10px',
                  boxShadow: '0 16px 40px rgba(0,0,0,0.8)',
                  display: 'flex',
                  flexDirection: 'column',
                  zIndex: activeWindow === 'security' ? 30 : 25,
                }} onClick={() => setActiveWindow('security')}>
                  <div style={{
                    background: '#151d30',
                    padding: '8px 12px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    borderBottom: '1px solid var(--border-subtle)',
                    borderTopLeftRadius: '10px',
                    borderTopRightRadius: '10px',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Shield size={14} color="#10b981" />
                      <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#f8fafc' }}>
                        Centre de Sécurité & Conformité CIS
                      </span>
                    </div>
                    <button onClick={() => closeWindow('security')} style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer' }}>
                      <X size={14} />
                    </button>
                  </div>

                  <div style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: '10px', overflowY: 'auto' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '6px', fontSize: '0.78rem' }}>
                      <span>Niveau CIS Benchmark :</span>
                      <strong style={{ color: '#34d399' }}>Level {recipe.security.cisBenchmarkLevel} (Actif)</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px', background: 'rgba(10, 15, 28, 0.6)', borderRadius: '6px', fontSize: '0.78rem' }}>
                      <span>Pare-feu Système :</span>
                      <strong style={{ color: 'var(--cyan)' }}>{recipe.security.firewall.toUpperCase()} (Port 22 filtré)</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px', background: 'rgba(10, 15, 28, 0.6)', borderRadius: '6px', fontSize: '0.78rem' }}>
                      <span>Module LSM :</span>
                      <strong style={{ color: '#f8fafc' }}>{recipe.security.appArmorOrSELinux ? 'AppArmor / SELinux Enforcé' : 'Désactivé'}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px', background: 'rgba(10, 15, 28, 0.6)', borderRadius: '6px', fontSize: '0.78rem' }}>
                      <span>Chiffrement LUKS :</span>
                      <strong style={{ color: '#f8fafc' }}>{recipe.security.luksEncryption ? 'AES-XTS 512-bit' : 'Standard'}</strong>
                    </div>
                  </div>
                </div>
              )}

              {/* WINDOW 4: VIRTUAL BROWSER WINDOW */}
              {openWindows.includes('browser') && (
                <div style={{
                  position: 'absolute',
                  top: '40px',
                  left: '120px',
                  width: '540px',
                  height: '350px',
                  background: '#0d1322',
                  border: '1px solid rgba(139, 92, 246, 0.4)',
                  borderRadius: '10px',
                  boxShadow: '0 16px 40px rgba(0,0,0,0.8)',
                  display: 'flex',
                  flexDirection: 'column',
                  zIndex: activeWindow === 'browser' ? 30 : 25,
                }} onClick={() => setActiveWindow('browser')}>
                  <div style={{
                    background: '#151d30',
                    padding: '8px 12px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    borderBottom: '1px solid var(--border-subtle)',
                    borderTopLeftRadius: '10px',
                    borderTopRightRadius: '10px',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Globe size={14} color="var(--violet)" />
                      <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#f8fafc' }}>
                        Navigateur Web Virtuel
                      </span>
                    </div>
                    <button onClick={() => closeWindow('browser')} style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer' }}>
                      <X size={14} />
                    </button>
                  </div>

                  {/* Browser Address Bar */}
                  <div style={{ padding: '6px 12px', background: '#0a0f1c', borderBottom: '1px solid var(--border-subtle)', display: 'flex', gap: '8px' }}>
                    <input
                      type="text"
                      className="input-text font-mono"
                      value={browserUrl}
                      onChange={(e) => setBrowserUrl(e.target.value)}
                      style={{ padding: '4px 8px', fontSize: '0.76rem' }}
                    />
                  </div>

                  {/* Browser Viewport Mock */}
                  <div style={{ flex: 1, padding: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', background: '#040711' }}>
                    <Globe size={36} color="var(--violet)" style={{ marginBottom: '10px' }} />
                    <h4 style={{ fontSize: '1rem', color: '#f8fafc', marginBottom: '6px' }}>Page Web Chargée dans la VM</h4>
                    <p style={{ fontSize: '0.78rem', color: 'var(--cyan)', fontFamily: 'var(--font-mono)' }}>{browserUrl}</p>
                    <p style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '8px' }}>Connexion sécurisée via le réseau virtuel NAT 192.168.122.0/24</p>
                  </div>
                </div>
              )}

            </div>

            {/* Bottom Desktop Dock */}
            {recipe.desktop !== 'none' && recipe.desktop !== 'web_kiosk' && (
              <div style={{
                background: 'rgba(5, 8, 16, 0.8)',
                backdropFilter: 'blur(12px)',
                margin: '0 auto 12px auto',
                padding: '6px 14px',
                borderRadius: '16px',
                display: 'flex',
                gap: '12px',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                zIndex: 40,
              }}>
                <button onClick={() => toggleWindow('terminal')} style={{ background: openWindows.includes('terminal') ? 'rgba(6, 182, 212, 0.3)' : 'transparent', border: 'none', borderRadius: '8px', padding: '6px', cursor: 'pointer' }} title="Terminal">
                  <Terminal size={18} color="var(--cyan)" />
                </button>
                <button onClick={() => toggleWindow('files')} style={{ background: openWindows.includes('files') ? 'rgba(245, 158, 11, 0.3)' : 'transparent', border: 'none', borderRadius: '8px', padding: '6px', cursor: 'pointer' }} title="Fichiers">
                  <Folder size={18} color="#f59e0b" />
                </button>
                <button onClick={() => toggleWindow('browser')} style={{ background: openWindows.includes('browser') ? 'rgba(139, 92, 246, 0.3)' : 'transparent', border: 'none', borderRadius: '8px', padding: '6px', cursor: 'pointer' }} title="Navigateur">
                  <Globe size={18} color="var(--violet)" />
                </button>
                <button onClick={() => toggleWindow('security')} style={{ background: openWindows.includes('security') ? 'rgba(16, 185, 129, 0.3)' : 'transparent', border: 'none', borderRadius: '8px', padding: '6px', cursor: 'pointer' }} title="Sécurité CIS">
                  <Shield size={18} color="#10b981" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

function getAsciiLogo(distro: string): string {
  if (distro === 'arch') {
    return `
       /\\         Arch Linux
      /  \\        ----------
     /\\   \\       OS: ForgeOS Arch Edition
    /      \\      Kernel: 6.8.0-zen
   /   ,,   \\     Packages: pacman
  /   |  |  -\\    Uptime: 12 mins
 /_-''    ''-_\\   `;
  } else if (distro === 'debian') {
    return `
     ,---._       Debian GNU/Linux
    / /""' \\      ----------------
   | |      |     OS: ForgeOS Debian Edition
   \\ \\     /      Kernel: 6.8.0-generic
    \`'---'        Packages: dpkg / apt
                  `;
  } else if (distro === 'ubuntu') {
    return `
         _        Ubuntu Linux
     ---(_)       ------------
 _/  ---  \\       OS: ForgeOS Ubuntu Edition
(_) |   |         Kernel: 6.8.0-generic
  \\  --- _/       Packages: apt
     ---(_)       `;
  } else if (distro === 'alpine') {
    return `
       /\\         Alpine Linux
      //\\\\        ------------
     //  \\\\       OS: ForgeOS Alpine Minimal
    ///\\/\\/\\\\     Kernel: 6.8.0-lts
   ////    \\\\\\\\   Packages: apk (musl)
                  `;
  }
  return `
    .---.         Linux Universel
   /     \\        ---------------
  (@|o o|@)       OS: ForgeOS Studio
   /  _  \\        Kernel: 6.8.0
  /  ( )  \\       Packages: custom
                  `;
}
