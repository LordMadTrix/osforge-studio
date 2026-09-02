import { OSRecipe, DistroId, DesktopEnvironmentId, KernelType } from '../types/os';

export interface DetectedHardware {
  cpuCores: number;
  ramGb: number;
  gpuRenderer: string;
  gpuVendor: string;
  isDedicatedGpu: boolean;
  gpuType: 'nvidia' | 'amd' | 'intel' | 'apple' | 'other';
  deviceType: 'laptop' | 'desktop' | 'mobile' | 'unknown';
  hasBattery: boolean;
  screenWidth: number;
  screenHeight: number;
  pixelRatio: number;
  osPlatform: string;
  arch: 'x86_64' | 'aarch64';
}

export interface AuditRecommendation {
  profileId: 'gaming_beast' | 'lightweight_efficiency' | 'power_workstation' | 'modern_balanced';
  titleFr: string;
  titleEn: string;
  summaryFr: string;
  summaryEn: string;
  matchScore: number; // 0 - 100
  distro: DistroId;
  distroVersion: string;
  distroSuite: string;
  desktop: DesktopEnvironmentId;
  displayManager: string;
  kernel: KernelType;
  gpuDriver: 'mesa_open' | 'nvidia_proprietary' | 'hybrid_prime';
  enableGamingOptimizations: boolean;
  enableSteamConsoleMode: boolean;
  enableZram: boolean;
  enablePowerSaving: boolean;
  enableFlatpak: boolean;
  keyPointsFr: string[];
  keyPointsEn: string[];
  suggestedPackages: string[];
  suggestedRecipeChanges: Partial<OSRecipe>;
}

/**
 * Sonde les caractéristiques matérielles disponibles via les API Web standard et WebGL
 */
export async function detectHardwareProfile(): Promise<DetectedHardware> {
  const cpuCores = typeof navigator !== 'undefined' && navigator.hardwareConcurrency ? navigator.hardwareConcurrency : 4;
  const ramGb = typeof navigator !== 'undefined' && (navigator as unknown as { deviceMemory?: number }).deviceMemory
    ? (navigator as unknown as { deviceMemory: number }).deviceMemory
    : 8;

  let gpuRenderer = 'Standard / Non spécifié';
  let gpuVendor = 'Standard';
  let isDedicatedGpu = false;
  let gpuType: DetectedHardware['gpuType'] = 'other';

  if (typeof document !== 'undefined') {
    try {
      const canvas = document.createElement('canvas');
      const gl = (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')) as WebGLRenderingContext | null;
      if (gl) {
        const ext = gl.getExtension('WEBGL_debug_renderer_info');
        if (ext) {
          const r = gl.getParameter(ext.UNMASKED_RENDERER_WEBGL);
          const v = gl.getParameter(ext.UNMASKED_VENDOR_WEBGL);
          if (r) gpuRenderer = String(r);
          if (v) gpuVendor = String(v);
        }
      }
    } catch {
      // Ignorer si WebGL n'est pas autorisé
    }
  }

  const lowerGpu = (gpuRenderer + ' ' + gpuVendor).toLowerCase();
  if (lowerGpu.includes('nvidia') || lowerGpu.includes('geforce') || lowerGpu.includes('quadro') || lowerGpu.includes('rtx') || lowerGpu.includes('gtx')) {
    gpuType = 'nvidia';
    isDedicatedGpu = true;
  } else if (lowerGpu.includes('radeon') || lowerGpu.includes('amd')) {
    gpuType = 'amd';
    isDedicatedGpu = true;
  } else if (lowerGpu.includes('intel') || lowerGpu.includes('iris') || lowerGpu.includes('uhd') || lowerGpu.includes('hd graphics')) {
    gpuType = 'intel';
    isDedicatedGpu = false;
  } else if (lowerGpu.includes('apple') || lowerGpu.includes('metal')) {
    gpuType = 'apple';
    isDedicatedGpu = true;
  }

  let hasBattery = false;
  let deviceType: DetectedHardware['deviceType'] = 'desktop';

  if (typeof navigator !== 'undefined') {
    try {
      if ('getBattery' in navigator && typeof (navigator as unknown as { getBattery: () => Promise<{ charging: boolean }> }).getBattery === 'function') {
        const battery = await (navigator as unknown as { getBattery: () => Promise<{ charging: boolean }> }).getBattery();
        if (battery && typeof battery.charging === 'boolean') {
          hasBattery = true;
          deviceType = 'laptop';
        }
      }
    } catch {
      // Ignorer si Battery Status API est restreinte
    }

    if (navigator.maxTouchPoints && navigator.maxTouchPoints > 1 && !hasBattery) {
      deviceType = 'mobile';
    }
  }

  const ua = typeof navigator !== 'undefined' ? navigator.userAgent.toLowerCase() : '';
  const isArm = ua.includes('aarch64') || ua.includes('arm64');
  const arch: 'x86_64' | 'aarch64' = isArm ? 'aarch64' : 'x86_64';

  const screenWidth = typeof window !== 'undefined' ? window.screen.width : 1920;
  const screenHeight = typeof window !== 'undefined' ? window.screen.height : 1080;
  const pixelRatio = typeof window !== 'undefined' ? window.devicePixelRatio : 1;
  const osPlatform = typeof navigator !== 'undefined' ? (navigator.platform || 'Linux') : 'Linux';

  return {
    cpuCores,
    ramGb,
    gpuRenderer,
    gpuVendor,
    isDedicatedGpu,
    gpuType,
    deviceType,
    hasBattery,
    screenWidth,
    screenHeight,
    pixelRatio,
    osPlatform,
    arch,
  };
}

/**
 * Analyse le profil matériel et produit la recommandation optimale de distribution et réglages
 */
export function analyzeAndRecommend(hardware: DetectedHardware, currentRecipe: OSRecipe): AuditRecommendation {
  const isLowMemory = hardware.ramGb <= 4 || hardware.cpuCores <= 2;
  const isGpuPowerhouse = hardware.isDedicatedGpu && hardware.ramGb >= 8 && hardware.cpuCores >= 4;
  const isModernWorkstation = !isLowMemory && !isGpuPowerhouse && hardware.ramGb >= 8;

  // 1. Profil GAMING POWERHOUSE (Gros GPU NVIDIA ou AMD + RAM >= 8 Go)
  if (isGpuPowerhouse) {
    const isNvidia = hardware.gpuType === 'nvidia';
    const gpuDriver = isNvidia ? 'nvidia_proprietary' : 'mesa_open';
    const keyPointsFr = [
      `GPU Dédié détecté (${hardware.gpuRenderer}) : activation des pilotes graphiques optimisés.`,
      `${hardware.cpuCores} cœurs CPU & ${hardware.ramGb} Go RAM : parfait pour les jeux AAA et l'émulation.`,
      `Noyau XanMod EDGE à faible latence et profil réseau anti-lag TCP BBR+.`,
      `Session KDE Plasma avec intégration Proton, GameMode, MangoHUD et Steam Console GamepadUI.`,
    ];
    const keyPointsEn = [
      `Dedicated GPU detected (${hardware.gpuRenderer}): optimized graphics drivers enabled.`,
      `${hardware.cpuCores} CPU cores & ${hardware.ramGb} GB RAM: ideal for AAA gaming and emulation.`,
      `Low-latency XanMod EDGE kernel and anti-lag TCP BBR+ network profile.`,
      `KDE Plasma session with Proton, GameMode, MangoHUD and Steam GamepadUI.`,
    ];

    const suggestedRecipeChanges: Partial<OSRecipe> = {
      distro: 'ubuntu',
      distroVersion: '24.04 LTS (Noble)',
      distroSuite: 'noble',
      desktop: 'kde',
      displayManager: 'sddm',
      kernel: 'xanmod',
      gpuDriver,
      enableGamingOptimizations: true,
      enableSteamConsoleMode: true,
      enableZram: false,
      enablePowerSaving: hardware.hasBattery,
      enableFlatpak: true,
      selectedPackages: Array.from(new Set([...currentRecipe.selectedPackages, 'git', 'curl', 'fastfetch', 'btop_monitor'])),
      branding: {
        ...currentRecipe.branding,
        osName: 'MadOS ROG Edition',
        editionName: 'Gaming & Performance Edition',
        accentColor: '#ef4444',
        wallpaperPreset: 'gaming_rog',
      },
    };

    return {
      profileId: 'gaming_beast',
      titleFr: 'MadOS ROG Gaming Edition (Ubuntu 24.04 LTS + KDE + XanMod)',
      titleEn: 'MadOS ROG Gaming Edition (Ubuntu 24.04 LTS + KDE + XanMod)',
      summaryFr: 'Configuration haute performance taillée sur mesure pour votre carte graphique dédiée et vos capacités processeur.',
      summaryEn: 'High-performance configuration tailored for your dedicated GPU and multi-core CPU capabilities.',
      matchScore: 98,
      distro: 'ubuntu',
      distroVersion: '24.04 LTS (Noble)',
      distroSuite: 'noble',
      desktop: 'kde',
      displayManager: 'sddm',
      kernel: 'xanmod',
      gpuDriver,
      enableGamingOptimizations: true,
      enableSteamConsoleMode: true,
      enableZram: false,
      enablePowerSaving: hardware.hasBattery,
      enableFlatpak: true,
      keyPointsFr,
      keyPointsEn,
      suggestedPackages: ['git', 'curl', 'fastfetch', 'btop_monitor'],
      suggestedRecipeChanges,
    };
  }

  // 2. Profil FAIBLE PUISSANCE / LAPTOP ANCIEN (RAM <= 4 Go ou CPU <= 2 cœurs)
  if (isLowMemory) {
    const keyPointsFr = [
      `Mémoire RAM mesurée à ${hardware.ramGb} Go : bureau ultra-léger XFCE recommandé pour libérer les ressources.`,
      `Activation de ZRAM Swap compressé (double virtuellement la capacité RAM sans ralentir le disque).`,
      `Noyau stable standard à faible empreinte mémoire avec Debian 13 Trixie.`,
      hardware.hasBattery ? 'Batterie détectée : activation du démon d’économie d’énergie TLP.' : 'Consommation électrique minimale.',
    ];
    const keyPointsEn = [
      `RAM measured at ${hardware.ramGb} GB: lightweight XFCE desktop recommended to preserve memory.`,
      `Compressed ZRAM Swap enabled (virtually doubles usable RAM without disk paging slowdowns).`,
      `Stable minimal footprint kernel with Debian 13 Trixie.`,
      hardware.hasBattery ? 'Battery detected: TLP power saving daemon enabled.' : 'Minimal power consumption.',
    ];

    const suggestedRecipeChanges: Partial<OSRecipe> = {
      distro: 'debian',
      distroVersion: '13 (Trixie)',
      distroSuite: 'trixie',
      desktop: 'xfce',
      displayManager: 'lightdm',
      kernel: 'generic',
      gpuDriver: 'mesa_open',
      enableGamingOptimizations: false,
      enableSteamConsoleMode: false,
      enableZram: true,
      enablePowerSaving: hardware.hasBattery,
      enableFlatpak: false,
      selectedPackages: Array.from(new Set([...currentRecipe.selectedPackages, 'curl', 'fastfetch', 'htop'])),
      branding: {
        ...currentRecipe.branding,
        osName: 'ForgeOS Light',
        editionName: 'Lightweight & Efficient Edition',
        accentColor: '#10b981',
        wallpaperPreset: 'minimal',
      },
    };

    return {
      profileId: 'lightweight_efficiency',
      titleFr: 'ForgeOS Ultra-Light (Debian 13 Trixie + XFCE + ZRAM)',
      titleEn: 'ForgeOS Ultra-Light (Debian 13 Trixie + XFCE + ZRAM)',
      summaryFr: 'Distribution ultra-légère et réactive conçue pour ressusciter votre machine et préserver chaque mégaoctet de RAM.',
      summaryEn: 'Ultra-light and responsive distribution designed to revive your machine and save every megabyte of RAM.',
      matchScore: 97,
      distro: 'debian',
      distroVersion: '13 (Trixie)',
      distroSuite: 'trixie',
      desktop: 'xfce',
      displayManager: 'lightdm',
      kernel: 'generic',
      gpuDriver: 'mesa_open',
      enableGamingOptimizations: false,
      enableSteamConsoleMode: false,
      enableZram: true,
      enablePowerSaving: hardware.hasBattery,
      enableFlatpak: false,
      keyPointsFr,
      keyPointsEn,
      suggestedPackages: ['curl', 'fastfetch', 'htop'],
      suggestedRecipeChanges,
    };
  }

  // 3. Profil STATION MODERNE / MULTITÂCHE & DEV (RAM >= 8 Go, GPU Intel / AMD intégré)
  const keyPointsFr = [
    `${hardware.cpuCores} cœurs CPU & ${hardware.ramGb} Go RAM : puissance idéale pour un environnement multitâche moderne.`,
    `Debian 13 Trixie avec KDE Plasma 6 : esthétique soignée, fluidité 60 fps et stabilité éprouvée.`,
    `Intégration Flatpak & Flathub pour accéder à toutes les applications modernes sans compromettre le socle système.`,
    hardware.hasBattery ? 'Profil TLP Laptop activé pour optimiser l’autonomie de la batterie.' : 'Station fixe prête pour le développement.',
  ];
  const keyPointsEn = [
    `${hardware.cpuCores} CPU cores & ${hardware.ramGb} GB RAM: ideal power for modern multitasking.`,
    `Debian 13 Trixie with KDE Plasma 6: sleek aesthetics, 60 fps fluidity, and proven stability.`,
    `Native Flatpak & Flathub integration for access to all modern apps without compromising system stability.`,
    hardware.hasBattery ? 'TLP Laptop profile enabled to maximize battery life.' : 'Workstation ready for development.',
  ];

  const suggestedRecipeChanges: Partial<OSRecipe> = {
    distro: 'debian',
    distroVersion: '13 (Trixie)',
    distroSuite: 'trixie',
    desktop: 'kde',
    displayManager: 'sddm',
    kernel: 'generic',
    gpuDriver: 'mesa_open',
    enableGamingOptimizations: false,
    enableSteamConsoleMode: false,
    enableZram: true,
    enablePowerSaving: hardware.hasBattery,
    enableFlatpak: true,
    selectedPackages: Array.from(new Set([...currentRecipe.selectedPackages, 'git', 'curl', 'fastfetch', 'eza', 'bat_cat'])),
    branding: {
      ...currentRecipe.branding,
      osName: 'ForgeOS Pro',
      editionName: 'Workstation Edition',
      accentColor: '#38bdf8',
      wallpaperPreset: 'minimal',
    },
  };

  return {
    profileId: isModernWorkstation ? 'power_workstation' : 'modern_balanced',
    titleFr: 'ForgeOS Pro Workstation (Debian 13 Trixie + KDE Plasma + Flatpak)',
    titleEn: 'ForgeOS Pro Workstation (Debian 13 Trixie + KDE Plasma + Flatpak)',
    summaryFr: 'Équilibre parfait entre stabilité rock-solid, confort visuel moderne et accès aux dernières technologies logicielles.',
    summaryEn: 'Perfect balance of rock-solid stability, modern visual comfort, and access to the latest software technologies.',
    matchScore: 96,
    distro: 'debian',
    distroVersion: '13 (Trixie)',
    distroSuite: 'trixie',
    desktop: 'kde',
    displayManager: 'sddm',
    kernel: 'generic',
    gpuDriver: 'mesa_open',
    enableGamingOptimizations: false,
    enableSteamConsoleMode: false,
    enableZram: true,
    enablePowerSaving: hardware.hasBattery,
    enableFlatpak: true,
    keyPointsFr,
    keyPointsEn,
    suggestedPackages: ['git', 'curl', 'fastfetch', 'eza', 'bat_cat'],
    suggestedRecipeChanges,
  };
}

/**
 * Génère un script d'audit matériel en profondeur pour exécuter directement sur la machine cible
 */
export function generateHardwareAuditScript(platform: 'bash' | 'bat'): string {
  if (platform === 'bat') {
    return `@echo off
chcp 65001 >nul
cls
echo ====================================================================
echo   🔍 OSForge Studio — Rapport d'Audit Matériel Windows
echo ====================================================================
echo.
echo [1/5] Informations Processeur (CPU) :
wmic cpu get name,numberofcores,numberoflogicalprocessors,maxclockspeed /format:list
echo.
echo [2/5] Mémoire Vive (RAM) :
wmic computersystem get totalphysicalmemory /format:list
echo.
echo [3/5] Carte Graphique (GPU) :
wmic path win32_videocontroller get name,adapterram,driverversion /format:list
echo.
echo [4/5] Disques et Stockage :
wmic logicaldisk get caption,description,freespace,size /format:list
echo.
echo [5/5] Type d'Amorçage (UEFI vs BIOS) :
bcdedit | findstr /i "path"
echo.
echo ====================================================================
echo Audit terminé ! Vous pouvez reporter ces informations dans OSForge Studio.
pause
`;
  }

  return `#!/usr/bin/env bash
# ==============================================================================
# OSForge Studio — Rapport d'Audit Matériel Linux
# ==============================================================================
set -euo pipefail

CYAN='\\033[0;36m'
GREEN='\\033[0;32m'
YELLOW='\\033[1;33m'
BOLD='\\033[1m'
NC='\\033[0m'

echo -e "\${CYAN}\${BOLD}====================================================================\${NC}"
echo -e "\${CYAN}\${BOLD}  🔍 OSForge Studio — Audit Matériel de la Machine Cible\${NC}"
echo -e "\${CYAN}\${BOLD}====================================================================\${NC}"
echo ""

echo -e "\${YELLOW}[1/6] Processeur (CPU) :\${NC}"
lscpu | grep -E "Model name|Socket|Thread|NUMA|CPU[(]s[)]|Architecture" || uname -m

echo ""
echo -e "\${YELLOW}[2/6] Mémoire Vive (RAM) :\${NC}"
free -h

echo ""
echo -e "\${YELLOW}[3/6] Carte(s) Graphique(s) (GPU) :\${NC}"
lspci -nnk | grep -iA3 -E "vga|3d|display" || echo "lspci non disponible"

echo ""
echo -e "\${YELLOW}[4/6] Périphériques de Stockage :\${NC}"
lsblk -o NAME,SIZE,TYPE,FSTYPE,MOUNTPOINTS || df -h

echo ""
echo -e "\${YELLOW}[5/6] Mode d'Amorçage (UEFI vs Legacy BIOS) :\${NC}"
if [ -d /sys/firmware/efi ]; then
    echo -e "\${GREEN}✓ Système démarré en mode UEFI (64-bit).\${NC}"
else
    echo -e "\${YELLOW}! Système démarré en mode Legacy BIOS (CSM).\${NC}"
fi

echo ""
echo -e "\${YELLOW}[6/6] Batterie / Type d'Appareil :\${NC}"
if [ -d /sys/class/power_supply ] && ls /sys/class/power_supply/BAT* &>/dev/null; then
    echo -e "\${GREEN}✓ Batterie détectée (PC Portable / Laptop).\${NC}"
else
    echo -e "Pas de batterie détectée (Station de travail fixe / Desktop / VM)."
fi

echo ""
echo -e "\${GREEN}\${BOLD}====================================================================\${NC}"
echo -e "\${GREEN}\${BOLD}  Audit complet terminé !\${NC}"
echo -e "\${GREEN}\${BOLD}====================================================================\${NC}"
`;
}
