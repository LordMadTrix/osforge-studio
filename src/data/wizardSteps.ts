import { DistroId, DesktopEnvironmentId, KernelType, OutputFormat, OSRecipe } from '../types/os';

export interface WizardIntent {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  icon: string;
  badge: string;
  recommendedDistro: DistroId;
  recommendedDesktop: DesktopEnvironmentId;
  recommendedKernel: KernelType;
  recommendedFormat: OutputFormat;
  defaultPackages: string[];
  enableGamingOptimizations?: boolean;
  enablePowerSaving?: boolean;
  accentColor: string;
}

export const WIZARD_INTENTS: WizardIntent[] = [
  {
    id: 'gaming',
    title: 'Gaming & Jeux Vidéo',
    subtitle: 'Performances 3D maximales, Steam, Proton & Émulateurs',
    description: 'Parfait pour jouer à vos jeux Windows et Linux avec la plus faible latence, pilotes graphiques Vulkan et support des manettes.',
    icon: 'Gamepad2',
    badge: 'Populaire',
    recommendedDistro: 'ubuntu',
    recommendedDesktop: 'kde',
    recommendedKernel: 'xanmod',
    recommendedFormat: 'iso_hybrid',
    defaultPackages: ['steam', 'lutris_heroic', 'obs_studio', 'vlc_media', 'gamepad_drivers', 'fastfetch', 'discord'],
    enableGamingOptimizations: true,
    enablePowerSaving: true,
    accentColor: '#ff003c',
  },
  {
    id: 'development',
    title: 'Développement & Code',
    subtitle: 'Docker, VS Code, Git, NodeJS, Rust & Terminal moderne',
    description: 'Une station de travail ultra-efficace pour programmeurs et ingénieurs DevOps avec tous les compilateurs et environnements prêts.',
    icon: 'Code2',
    badge: 'Productivité',
    recommendedDistro: 'debian',
    recommendedDesktop: 'gnome',
    recommendedKernel: 'generic',
    recommendedFormat: 'iso_hybrid',
    defaultPackages: ['docker', 'git', 'neovim', 'zsh_starship', 'rust_toolchain', 'nodejs_stack', 'python_stack', 'vscodium', 'htop_btop', 'fastfetch'],
    accentColor: '#0ea5e9',
  },
  {
    id: 'daily_office',
    title: 'Bureautique & Quotidien',
    subtitle: 'Simple, fluide et stable comme Windows ou macOS',
    description: 'Idéal pour naviguer sur le web, regarder des vidéos, rédiger des documents et les tâches de tous les jours en toute sécurité.',
    icon: 'Laptop',
    badge: 'Accessible',
    recommendedDistro: 'linuxmint',
    recommendedDesktop: 'cinnamon',
    recommendedKernel: 'generic',
    recommendedFormat: 'iso_hybrid',
    defaultPackages: ['firefox', 'libreoffice', 'vlc_media', 'gimp_editor', 'htop_btop', 'fastfetch'],
    accentColor: '#10b981',
  },
  {
    id: 'security_pentest',
    title: 'Cybersécurité & Audit',
    subtitle: 'Wireshark, Nmap, Metasploit & Outils Réseau',
    description: 'Environnement complet pour les analystes en sécurité, étudiants et passionnés de tests d’intrusion et d’analyse réseau.',
    icon: 'ShieldCheck',
    badge: 'Expertise',
    recommendedDistro: 'kali',
    recommendedDesktop: 'xfce',
    recommendedKernel: 'generic',
    recommendedFormat: 'iso_hybrid',
    defaultPackages: ['wireshark', 'nmap', 'metasploit', 'aircrack', 'john_hashcat', 'git', 'htop_btop', 'fastfetch'],
    accentColor: '#ef4444',
  },
  {
    id: 'server_homelab',
    title: 'Serveur & Homelab',
    subtitle: 'Léger, autonome, sans écran (Headless) avec Docker & K3s',
    description: 'Parfait pour recycler un PC en serveur domestique, héberger vos applications, un VPN WireGuard ou une interface Cockpit.',
    icon: 'Server',
    badge: 'Infrastructure',
    recommendedDistro: 'debian',
    recommendedDesktop: 'none',
    recommendedKernel: 'generic',
    recommendedFormat: 'iso_hybrid',
    defaultPackages: ['docker', 'k3s_server', 'cockpit_admin', 'wireguard', 'git', 'htop_btop'],
    accentColor: '#f59e0b',
  },
  {
    id: 'lightweight_revive',
    title: 'Ordinateur Ancien / Ultra-Léger',
    subtitle: 'Consommation minimale de RAM (< 250 Mo) et réactivité instantanée',
    description: 'Donnez une seconde jeunesse à un vieil ordinateur ou un PC portable peu puissant avec un bureau ultra-léger et économe.',
    icon: 'Zap',
    badge: 'Écologique',
    recommendedDistro: 'debian',
    recommendedDesktop: 'xfce',
    recommendedKernel: 'generic',
    recommendedFormat: 'iso_hybrid',
    defaultPackages: ['firefox', 'vlc_media', 'htop_btop', 'fastfetch'],
    enablePowerSaving: true,
    accentColor: '#a855f7',
  },
];

export interface WizardDesktopChoice {
  id: DesktopEnvironmentId;
  name: string;
  tagline: string;
  description: string;
  ramUsage: string;
  isPopular?: boolean;
}

export const WIZARD_DESKTOP_CHOICES: WizardDesktopChoice[] = [
  {
    id: 'cinnamon',
    name: 'Cinnamon',
    tagline: 'Le plus familier si vous venez de Windows',
    description: 'Menu démarrer traditionnel, barre des tâches en bas, très intuitif et facile à prendre en main.',
    ramUsage: '~650 Mo RAM',
    isPopular: true,
  },
  {
    id: 'kde',
    name: 'KDE Plasma',
    tagline: 'Moderne, ultra-personnalisable et fluide',
    description: 'Superbes effets visuels, personnalisation totale, idéal pour les écrans haute résolution et le jeu.',
    ramUsage: '~700 Mo RAM',
    isPopular: true,
  },
  {
    id: 'gnome',
    name: 'GNOME',
    tagline: 'Épuré, sobre et orienté productivité',
    description: 'Interface épurée avec vue d’ensemble des activités, idéale pour les écrans larges et le tactile.',
    ramUsage: '~800 Mo RAM',
  },
  {
    id: 'xfce',
    name: 'XFCE',
    tagline: 'Ultra-léger, rapide et incassable',
    description: 'Consomme très peu de mémoire, réagit instantanément même sur les machines les plus modestes.',
    ramUsage: '~350 Mo RAM',
    isPopular: true,
  },
  {
    id: 'hyprland',
    name: 'Hyprland (Tiling Wayland)',
    tagline: 'Futuriste, pilotable au clavier avec animations',
    description: 'Les fenêtres se rangent automatiquement en mosaïque. Adoré des développeurs et passionnés.',
    ramUsage: '~400 Mo RAM',
  },
  {
    id: 'none',
    name: 'Mode Serveur (Sans Interface Graphique)',
    tagline: 'Console texte pure pour serveur ou VM',
    description: 'Zéro gaspillage de ressources, uniquement accessible via terminal ou console SSH.',
    ramUsage: '< 100 Mo RAM',
  },
];

export interface WizardSoftwarePack {
  id: string;
  title: string;
  description: string;
  icon: string;
  packageIds: string[];
}

export const WIZARD_SOFTWARE_PACKS: WizardSoftwarePack[] = [
  {
    id: 'web_office',
    title: 'Navigation & Bureautique',
    description: 'Firefox / Chromium et suite bureautique LibreOffice',
    icon: 'Globe',
    packageIds: ['firefox', 'libreoffice'],
  },
  {
    id: 'media_creative',
    title: 'Multimédia & Création',
    description: 'Lecteur vidéo VLC, éditeur photo GIMP et audio',
    icon: 'Film',
    packageIds: ['vlc_media', 'gimp_editor', 'mpv_player'],
  },
  {
    id: 'gaming_suite',
    title: 'Gaming & Lanceurs de Jeux',
    description: 'Steam, Heroic (Epic/GOG), MangoHUD et GameMode',
    icon: 'Gamepad2',
    packageIds: ['steam', 'lutris_heroic', 'gamepad_drivers'],
  },
  {
    id: 'dev_essentials',
    title: 'Outils Développeur',
    description: 'Docker Engine, Git, VS Code (Codium) et Neovim',
    icon: 'Code',
    packageIds: ['docker', 'git', 'vscodium'],
  },
  {
    id: 'streaming_social',
    title: 'Streaming & Communication',
    description: 'OBS Studio pour enregistrer/streamer et Discord',
    icon: 'Tv',
    packageIds: ['obs_studio', 'discord'],
  },
  {
    id: 'system_utilities',
    title: 'Utilitaires Système Modernes',
    description: 'Fastfetch, moniteur de ressources Btop et archives',
    icon: 'Activity',
    packageIds: ['htop_btop', 'fastfetch'],
  },
];

export interface WizardFormatChoice {
  id: OutputFormat;
  title: string;
  subtitle: string;
  description: string;
  icon: string;
  recommendedFor: string;
}

export const WIZARD_FORMAT_CHOICES: WizardFormatChoice[] = [
  {
    id: 'iso_hybrid',
    title: 'Image ISO Amorçable (Recommandé)',
    subtitle: 'Pour graver sur Clé USB ou installer sur PC Réel',
    description: 'Compatible BIOS classique et UEFI moderne. Démarre en session Live et permet l’installation sur disque dur.',
    icon: 'Disc',
    recommendedFor: 'Installation PC, clé USB amorçable, test Live RAM',
  },
  {
    id: 'wsl2_tar',
    title: 'Dans Windows (WSL2)',
    subtitle: 'Archive RootFS importable en 1 clic sous Windows 10/11',
    description: 'Intègre directement votre système personnalisé à l’intérieur de Windows via `wsl --import`.',
    icon: 'AppWindow',
    recommendedFor: 'Utilisation transparente dans Windows sans redémarrer',
  },
  {
    id: 'qcow2',
    title: 'Machine Virtuelle (QEMU / KVM / Proxmox)',
    subtitle: 'Disque virtuel dynamique avec partitionnement complet',
    description: 'Prêt à être attaché à une VM Linux, Proxmox VE ou QEMU avec amorçage GRUB immédiat.',
    icon: 'HardDrive',
    recommendedFor: 'Virtualisation avancée, Proxmox, serveurs cloud',
  },
  {
    id: 'rpi_sd',
    title: 'Carte SD Raspberry Pi (ARM64)',
    subtitle: 'Image prête à flasher pour Raspberry Pi 4 / 5',
    description: 'Partitionnement boot FAT32 + rootfs ext4 optimisé pour micro-SD.',
    icon: 'Cpu',
    recommendedFor: 'Raspberry Pi 4, 5 et monocartes ARM64',
  },
];

/**
 * Applies a Wizard intent to a recipe cleanly without breaking custom settings.
 */
export function applyWizardIntentToRecipe(intent: WizardIntent, currentRecipe: OSRecipe): OSRecipe {
  return {
    ...currentRecipe,
    name: `${currentRecipe.branding.osName || 'ForgeOS'} ${intent.title}`,
    distro: intent.recommendedDistro,
    desktop: intent.recommendedDesktop,
    kernel: intent.recommendedKernel,
    outputFormat: intent.recommendedFormat,
    enableGamingOptimizations: intent.enableGamingOptimizations ?? currentRecipe.enableGamingOptimizations,
    enablePowerSaving: intent.enablePowerSaving ?? currentRecipe.enablePowerSaving,
    selectedPackages: Array.from(new Set([...currentRecipe.selectedPackages, ...intent.defaultPackages])),
    branding: {
      ...currentRecipe.branding,
      editionName: intent.title,
      accentColor: intent.accentColor,
    },
  };
}
