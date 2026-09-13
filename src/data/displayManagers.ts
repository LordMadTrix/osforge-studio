import { DisplayManagerId } from '../types/os';

export interface DisplayManagerMeta {
  id: DisplayManagerId;
  name: string;
  fullName: string;
  framework: string;
  ramMB: number;
  protocols: ('wayland' | 'x11' | 'tty')[];
  serviceUnit: string;
  configPath: string;
  badge: string;
  accentColor: string;
  descFr: string;
  descEn: string;
  recommendedFor: string[];
  featuresFr: string[];
  featuresEn: string[];
  tipFr: string;
  tipEn: string;
}

export const DISPLAY_MANAGERS: DisplayManagerMeta[] = [
  {
    id: 'sddm',
    name: 'SDDM',
    fullName: 'Simple Desktop Display Manager',
    framework: 'Qt6 / QML',
    ramMB: 80,
    protocols: ['wayland', 'x11'],
    serviceUnit: 'sddm.service',
    configPath: '/etc/sddm.conf.d/autologin.conf',
    badge: 'Standard Qt6 & KDE',
    accentColor: '#38bdf8',
    descFr: 'Gestionnaire de connexion moderne basé sur Qt6 et QML, standard officiel de KDE Plasma 6 et LXQt.',
    descEn: 'Modern Qt6 and QML based display manager, official standard on KDE Plasma 6 and LXQt.',
    recommendedFor: ['kde', 'lxqt'],
    featuresFr: ['Support Wayland natif layer-shell', 'Thèmes animés QML personnalisables', 'Détection auto des sessions Plasma Wayland/X11'],
    featuresEn: ['Native Wayland layer-shell support', 'Customizable QML animated themes', 'Auto-detection of Plasma Wayland/X11 sessions'],
    tipFr: 'SDDM est le choix recommandé numéro 1 pour KDE Plasma 6. OSForge génère automatiquement la détection Wayland / X11.',
    tipEn: 'SDDM is the recommended #1 choice for KDE Plasma 6 with automated Wayland/X11 session binding.',
  },
  {
    id: 'gdm3',
    name: 'GDM (GDM3)',
    fullName: 'GNOME Display Manager',
    framework: 'GTK4 / Clutter',
    ramMB: 140,
    protocols: ['wayland', 'x11'],
    serviceUnit: 'gdm3.service / gdm.service',
    configPath: '/etc/gdm3/custom.conf',
    badge: 'Officiel GNOME',
    accentColor: '#3b82f6',
    descFr: 'Le gestionnaire officiel du projet GNOME. Intégration transparente avec GNOME Shell et AccountsService.',
    descEn: 'Official display manager for GNOME. Seamless integration with GNOME Shell and AccountsService.',
    recommendedFor: ['gnome', 'budgie', 'pantheon'],
    featuresFr: ['Intégration profonde GNOME Shell', 'Prise en charge Wayland par défaut avec fallback X11', 'Gestion fine des comptes AccountsService'],
    featuresEn: ['Deep GNOME Shell integration', 'Default Wayland with automatic X11 fallback', 'Full AccountsService user profile support'],
    tipFr: 'Recommandé pour GNOME. OSForge applique automatiquement le tweak WaylandEnable=false pour les bureaux X11 purs.',
    tipEn: 'Recommended for GNOME. OSForge automatically applies WaylandEnable=false tweak for pure X11 desktops.',
  },
  {
    id: 'lightdm',
    name: 'LightDM',
    fullName: 'Light Display Manager',
    framework: 'GTK3 / Slick-Greeter',
    ramMB: 45,
    protocols: ['x11', 'wayland'],
    serviceUnit: 'lightdm.service',
    configPath: '/etc/lightdm/lightdm.conf.d/50-autologin.conf',
    badge: 'Universel & Léger',
    accentColor: '#10b981',
    descFr: 'Polyvalent, ultra-léger et rapide. Idéal pour XFCE, MATE, Cinnamon et les tiling window managers classiques.',
    descEn: 'Versatile, lightweight, and fast. Ideal for XFCE, MATE, Cinnamon, and traditional window managers.',
    recommendedFor: ['xfce', 'mate', 'cinnamon', 'i3wm', 'openbox', 'bspwm', 'qtile'],
    featuresFr: ['Faible empreinte mémoire (~45 MB)', 'Compatible Slick-Greeter & thèmes GTK', 'Support autologin ultra-fiable'],
    featuresEn: ['Low memory footprint (~45 MB)', 'Compatible with Slick-Greeter & GTK themes', 'Battle-tested autologin configuration'],
    tipFr: 'Le gestionnaire le plus stable et universel pour les environnements de bureau légers et les machines virtuelles.',
    tipEn: 'The most stable and universal display manager for lightweight desktops and virtual machines.',
  },
  {
    id: 'ly',
    name: 'Ly',
    fullName: 'Ly TUI Console Display Manager',
    framework: 'C / Ncurses (TUI)',
    ramMB: 15,
    protocols: ['wayland', 'x11', 'tty'],
    serviceUnit: 'ly@tty2.service',
    configPath: '/etc/ly/config.ini',
    badge: 'Ultra-Minimaliste TUI',
    accentColor: '#a855f7',
    descFr: 'Gestionnaire de connexion en mode texte console avec animations Matrix ASCII. Démarrage instantané en 10ms.',
    descEn: 'Compact TUI text-mode login screen with Matrix ASCII animations. Starts instantly in 10ms.',
    recommendedFor: ['hyprland', 'sway', 'wayfire', 'niri'],
    featuresFr: ['Empreinte record (~15 MB RAM)', 'Démarrage en 10 millisecondes', 'Lancement direct de compositeurs Wayland purs'],
    featuresEn: ['Minimal memory footprint (~15 MB)', 'Blazing fast 10ms startup', 'Direct launching of pure Wayland compositors'],
    tipFr: 'Favori des amateurs de Hyprland et Sway. Packagé nativement sur Arch, Fedora et openSUSE.',
    tipEn: 'Favorite for Hyprland and Sway users. Available in Arch, Fedora, and openSUSE official repositories.',
  },
  {
    id: 'cosmic-greeter',
    name: 'COSMIC Greeter',
    fullName: 'COSMIC Display Manager (System76)',
    framework: 'Rust / libcosmic',
    ramMB: 65,
    protocols: ['wayland'],
    serviceUnit: 'cosmic-greeter.service',
    configPath: '/etc/cosmic-greeter/config.ron',
    badge: 'Next-Gen Rust Beta',
    accentColor: '#f59e0b',
    descFr: 'Gestionnaire de nouvelle génération développé à 100% en Rust par System76 pour COSMIC Desktop.',
    descEn: 'Next-generation memory-safe display manager written in 100% Rust by System76 for COSMIC Desktop.',
    recommendedFor: ['cosmic'],
    featuresFr: ['Sécurité mémoire garantie en Rust', 'Wayland natif avec compositeur cosmic-comp', 'Applets modulaires harmonisées'],
    featuresEn: ['Memory safety guaranteed by Rust', 'Native Wayland with cosmic-comp compositor', 'Harmonious modular desktop applets'],
    tipFr: 'Conçu sur mesure pour COSMIC Desktop Beta. Service systemd cosmic-greeter activé automatiquement.',
    tipEn: 'Tailor-made for COSMIC Desktop Beta. Automatically enables cosmic-greeter systemd unit.',
  },
  {
    id: 'ddm',
    name: 'DDM',
    fullName: 'Deepin Display Manager',
    framework: 'Qt6 / Treeland',
    ramMB: 90,
    protocols: ['wayland', 'x11'],
    serviceUnit: 'ddm.service',
    configPath: '/etc/deepin/ddm.conf',
    badge: 'Deepin DDE',
    accentColor: '#06b6d4',
    descFr: 'Le gestionnaire de connexion natif de Deepin Desktop (DDE), conçu avec les effets graphiques DDE et Treeland.',
    descEn: 'Native Deepin Desktop (DDE) display manager, designed with smooth DDE visual effects and Treeland compositor.',
    recommendedFor: ['deepin'],
    featuresFr: ['Design élégant et effets de flou natifs', 'Intégration du compositeur Treeland Wayland', 'Expérience unifiée Deepin'],
    featuresEn: ['Elegant glassmorphic design and blur', 'Treeland Wayland compositor integration', 'Unified Deepin OS experience'],
    tipFr: 'Activé par défaut lors de la sélection de l’environnement Deepin (DDE).',
    tipEn: 'Activated by default when selecting Deepin Desktop Environment (DDE).',
  },
  {
    id: 'none',
    name: 'Aucun (Console / Kiosk Direct)',
    fullName: 'Getty Console Direct Autologin',
    framework: 'Linux Kernel TTY / Getty',
    ramMB: 0,
    protocols: ['tty'],
    serviceUnit: 'getty@tty1.service.d/autologin.conf',
    configPath: '/etc/systemd/system/getty@tty1.service.d/autologin.conf',
    badge: 'Headless / Kiosk Pure',
    accentColor: '#94a3b8',
    descFr: 'Désactive tout greeter graphique. Démarre directement dans la console texte shell ou lance immédiatement la borne Web Kiosk.',
    descEn: 'Disables all graphical greeters. Boots directly into the shell console or launches fullscreen Web Kiosk.',
    recommendedFor: ['none', 'web_kiosk'],
    featuresFr: ['Zéro RAM consommée pour le greeter', 'Démarrage instantané en mode serveur', 'Compatible Getty override pour bornes autonomes'],
    featuresEn: ['Zero RAM overhead for greeter', 'Instant boot into server shell', 'Supports Getty autologin override for dedicated kiosks'],
    tipFr: 'Indispensable pour les serveurs sans écran (Headless) et les bornes interactives plein écran (Web Kiosk).',
    tipEn: 'Essential for headless servers and dedicated fullscreen Web Kiosk appliances.',
  },
];
