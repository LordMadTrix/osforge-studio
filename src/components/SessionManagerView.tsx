import React, { useState, useEffect, useMemo } from 'react';
import { OSRecipe, DisplayManagerId } from '../types/os';
import { DESKTOPS } from '../data/desktopEnvironments';
import { getDesktopSessionName } from '../services/generators/helpers';
import { ContextTip } from './ContextTip';
import { InfoTooltip } from './InfoTooltip';
import {
  AppWindow,
  CheckCircle2,
  Shield,
  Zap,
  Lock,
  User,
  Power,
  RefreshCw,
  Clock,
  Sparkles,
  AlertTriangle,
  FileCode,
  Sliders,
  Eye,
  Check,
  Radio,
  KeyRound,
  Layers,
  ChevronRight,
} from 'lucide-react';

interface SessionManagerViewProps {
  recipe: OSRecipe;
  onChange: (updated: Partial<OSRecipe>) => void;
  lang: 'fr' | 'en';
  onOpenTips?: () => void;
}

interface DisplayManagerMeta {
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

const DM_CATALOG: DisplayManagerMeta[] = [
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

const WALLPAPER_GRADIENTS: Record<string, string> = {
  minimal: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
  carbon_dark: 'linear-gradient(135deg, #090d16 0%, #1e293b 50%, #0a0e17 100%)',
  aurora_borealis: 'linear-gradient(135deg, #022c22 0%, #0f172a 50%, #3b0764 100%)',
  nordic_frost: 'linear-gradient(135deg, #082f49 0%, #0c4a6e 50%, #03141f 100%)',
  sunset_synthwave: 'linear-gradient(135deg, #2e0826 0%, #701a75 50%, #1e1b4b 100%)',
  emerald_forest: 'linear-gradient(135deg, #022c22 0%, #064e3b 50%, #02140f 100%)',
  tokyo_neon: 'linear-gradient(135deg, #1e082b 0%, #2e1065 50%, #0d001a 100%)',
  cyberpunk: 'linear-gradient(135deg, #18052e 0%, #3b0764 40%, #030014 100%)',
  matrix: 'linear-gradient(135deg, #021a0e 0%, #052e16 50%, #020b06 100%)',
  gaming_rog: 'linear-gradient(135deg, #1c0508 0%, #450a0a 50%, #0c0203 100%)',
  deep_space: 'linear-gradient(135deg, #0b0f19 0%, #1e1b4b 50%, #030712 100%)',
};

export const SessionManagerView: React.FC<SessionManagerViewProps> = ({
  recipe,
  onChange,
  lang,
  onOpenTips,
}) => {
  // Détection de l'heure en temps réel pour le simulateur
  const [currentTime, setCurrentTime] = useState(() => {
    const d = new Date();
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  });

  const [currentDate, setCurrentDate] = useState(() => {
    const d = new Date();
    return d.toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    });
  });

  useEffect(() => {
    const timer = setInterval(() => {
      const d = new Date();
      setCurrentTime(d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      setCurrentDate(
        d.toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-US', {
          weekday: 'long',
          month: 'long',
          day: 'numeric',
        })
      );
    }, 10000);
    return () => clearInterval(timer);
  }, [lang]);

  // État de test pour le simulateur de greeter
  const [testLoginState, setTestLoginState] = useState<'idle' | 'logging_in' | 'success'>('idle');
  const [showConfigCode, setShowConfigCode] = useState(false);

  // Analyse du bureau actif et de la session cible
  const currentDesktop = useMemo(() => {
    return DESKTOPS.find((d) => d.id === recipe.desktop) || DESKTOPS[0];
  }, [recipe.desktop]);

  const targetSessionInfo = useMemo(() => {
    return getDesktopSessionName(recipe.desktop);
  }, [recipe.desktop]);

  const recommendedDMId = currentDesktop.recommendedDM || 'lightdm';
  const isRecommendedMatched = recipe.displayManager === recommendedDMId;
  const recommendedDMMeta = DM_CATALOG.find((dm) => dm.id === recommendedDMId);
  const currentDMMeta = DM_CATALOG.find((dm) => dm.id === recipe.displayManager) || DM_CATALOG[0];

  // Gestion du déclenchement du test de login
  const handleSimulateLogin = () => {
    if (testLoginState !== 'idle') return;
    setTestLoginState('logging_in');
    setTimeout(() => {
      setTestLoginState('success');
      setTimeout(() => {
        setTestLoginState('idle');
      }, 3500);
    }, 800);
  };

  // Résolution du background wallpaper
  const wallpaperBg = useMemo(() => {
    if (recipe.branding.customWallpaperUrl) {
      return `url("${recipe.branding.customWallpaperUrl}") center/cover no-repeat`;
    }
    const preset = recipe.branding.wallpaperPreset || 'minimal';
    return WALLPAPER_GRADIENTS[preset] || WALLPAPER_GRADIENTS.minimal;
  }, [recipe.branding.customWallpaperUrl, recipe.branding.wallpaperPreset]);

  // Détection des incompatibilités / avertissements stricts (Zéro Cosmétique)
  const isDebianFamily = ['debian', 'ubuntu', 'kali', 'raspbian', 'linuxmint'].includes(recipe.distro);
  const isLyOnDebianOrAlpine = recipe.displayManager === 'ly' && (isDebianFamily || recipe.distro === 'alpine');
  const isNoneOnGui = recipe.displayManager === 'none' && recipe.desktop !== 'none' && recipe.desktop !== 'web_kiosk';
  const isAutologinUnsupported = recipe.user.autologin && ['ly', 'ddm', 'cosmic-greeter'].includes(recipe.displayManager);

  // Génération du code d'autologin réel tel que produit par dmAutologinCmd
  const generatedAutologinSnippet = useMemo(() => {
    const user = recipe.user.username || 'user';
    const sess = targetSessionInfo.session;
    if (recipe.displayManager === 'gdm3') {
      return `# /etc/gdm3/custom.conf\n[daemon]\nAutomaticLoginEnable=true\nAutomaticLogin=${user}\n\n# /var/lib/AccountsService/users/${user}\n[User]\nSession=${sess}\nXSession=${sess}`;
    }
    if (recipe.displayManager === 'sddm') {
      return `# /etc/sddm.conf.d/autologin.conf\n[Autologin]\nUser=${user}\nSession=${recipe.desktop === 'kde' ? 'plasmawayland' : sess}\n\n# /etc/sddm.conf.d/10-wayland.conf\n[General]\nDisplayServer=wayland\nGreeterEnvironment=QT_WAYLAND_SHELL_INTEGRATION=layer-shell`;
    }
    if (recipe.displayManager === 'lightdm') {
      return `# /etc/lightdm/lightdm.conf.d/50-autologin.conf\n[Seat:*]\nautologin-user=${user}\nautologin-user-timeout=0\nuser-session=${sess}`;
    }
    if (recipe.displayManager === 'none') {
      return `# /etc/systemd/system/getty@tty1.service.d/autologin.conf\n[Service]\nExecStart=\nExecStart=-/sbin/agetty --autologin ${user} --noclear %I \\$TERM`;
    }
    return `# Auto-login non standardisé pour ${recipe.displayManager}\n# Authentification manuelle via prompt au premier boot`;
  }, [recipe.displayManager, recipe.user.username, targetSessionInfo.session, recipe.desktop]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
      {/* Contextual Pro Tip */}
      <ContextTip category="desktop" lang={lang} onOpenAllTips={onOpenTips} />

      {/* 1. Header & Quick Architecture Status */}
      <div className="glass-panel" style={{ padding: '22px', borderLeft: '4px solid var(--cyan)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span className="badge badge-cyan" style={{ fontSize: '0.72rem', padding: '2px 8px' }}>
                {lang === 'fr' ? 'Session & Authentification' : 'Session & Auth'}
              </span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Clock size={12} />
                {lang === 'fr' ? 'Démarrage graphique Linux' : 'Linux graphical boot'}
              </span>
            </div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <AppWindow size={22} color="var(--cyan)" />
              {lang === 'fr' ? 'Gestionnaire de Session & Écran de Connexion (Display Manager)' : 'Display Manager & Session Login Greeter'}
              <InfoTooltip
                text={lang === 'fr'
                  ? 'Le Display Manager (GDM, SDDM, LightDM, Ly...) initialise le serveur d’affichage (Wayland ou X11), présente l’écran d’authentification (Greeter) et lance la session utilisateur configurée.'
                  : 'The Display Manager initializes the display server (Wayland or X11), presents the greeter authentication dialog, and launches the user session.'}
              />
            </h2>
            <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', marginTop: '4px', maxWidth: '780px', lineHeight: 1.45 }}>
              {lang === 'fr'
                ? 'Configurez le greeter d’accueil, l’ouverture automatique de session (Auto-Login), le protocole d’affichage et prévisualisez le rendu graphique en temps réel.'
                : 'Configure graphical greeter, passwordless auto-login, display protocols, and preview greeter rendering in real time.'}
            </p>
          </div>

          {/* Quick Metrics Pills */}
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <div style={{ padding: '8px 14px', borderRadius: '8px', background: 'rgba(15, 23, 42, 0.6)', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                {lang === 'fr' ? 'Gestionnaire Actif' : 'Active DM'}
              </div>
              <div style={{ fontSize: '0.9rem', fontWeight: 700, color: currentDMMeta.accentColor, display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                <Zap size={13} />
                {currentDMMeta.name}
              </div>
            </div>

            <div style={{ padding: '8px 14px', borderRadius: '8px', background: 'rgba(15, 23, 42, 0.6)', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                {lang === 'fr' ? 'Connexion Auto' : 'Auto-Login'}
              </div>
              <div style={{
                fontSize: '0.9rem',
                fontWeight: 700,
                color: recipe.user.autologin ? '#10b981' : '#94a3b8',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                marginTop: '2px',
              }}>
                {recipe.user.autologin ? <CheckCircle2 size={13} /> : <Lock size={13} />}
                {recipe.user.autologin
                  ? (lang === 'fr' ? `Oui (${recipe.user.username})` : `Yes (${recipe.user.username})`)
                  : (lang === 'fr' ? 'Requis (MdP)' : 'Password Req.')}
              </div>
            </div>

            <div style={{ padding: '8px 14px', borderRadius: '8px', background: 'rgba(15, 23, 42, 0.6)', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                {lang === 'fr' ? 'Session Cible' : 'Target Session'}
              </div>
              <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#c084fc', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                <Layers size={13} />
                {targetSessionInfo.session} ({targetSessionInfo.isWaylandNative ? 'Wayland' : 'X11'})
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Recommandation Intelligente & Avertissements */}
      {!isRecommendedMatched && recommendedDMMeta && recipe.desktop !== 'none' && (
        <div style={{
          padding: '14px 18px',
          borderRadius: '8px',
          background: 'rgba(245, 158, 11, 0.08)',
          border: '1px solid rgba(245, 158, 11, 0.4)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'rgba(245, 158, 11, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f59e0b' }}>
              <Sparkles size={20} />
            </div>
            <div>
              <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#f59e0b' }}>
                {lang === 'fr' ? 'Recommandation Officielle d’Intégration' : 'Official Integration Recommendation'}
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                {lang === 'fr'
                  ? `Pour votre bureau "${currentDesktop.name}", le gestionnaire le plus stable et harmonisé est "${recommendedDMMeta.name}".`
                  : `For your active desktop "${currentDesktop.name}", the most stable and integrated display manager is "${recommendedDMMeta.name}".`}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onChange({ displayManager: recommendedDMId })}
            className="btn btn-primary"
            style={{ fontSize: '0.8rem', padding: '6px 14px', background: '#f59e0b', borderColor: '#f59e0b', color: '#000', fontWeight: 700 }}
          >
            <Zap size={14} />
            {lang === 'fr' ? `Appliquer ${recommendedDMMeta.name} en 1-clic` : `Apply ${recommendedDMMeta.name} (1-Click)`}
          </button>
        </div>
      )}

      {isRecommendedMatched && recipe.desktop !== 'none' && (
        <div style={{
          padding: '12px 16px',
          borderRadius: '8px',
          background: 'rgba(16, 185, 129, 0.08)',
          border: '1px solid rgba(16, 185, 129, 0.3)',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
        }}>
          <CheckCircle2 size={18} color="#10b981" />
          <div style={{ fontSize: '0.82rem', color: '#6ee7b7' }}>
            {lang === 'fr'
              ? `Configuration optimale : "${currentDMMeta.name}" est le gestionnaire de référence pour "${currentDesktop.name}".`
              : `Optimal configuration: "${currentDMMeta.name}" is the reference display manager for "${currentDesktop.name}".`}
          </div>
        </div>
      )}

      {/* Avertissement Zéro Cosmétique : Ly sur Debian/Alpine */}
      {isLyOnDebianOrAlpine && (
        <div style={{
          padding: '12px 16px',
          borderRadius: '8px',
          background: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.4)',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '12px',
        }}>
          <AlertTriangle size={18} color="#ef4444" style={{ flexShrink: 0, marginTop: '2px' }} />
          <div>
            <div style={{ fontSize: '0.84rem', fontWeight: 700, color: '#f87171' }}>
              {lang === 'fr' ? 'Dépôts Officiels : Paquet Ly absent' : 'Official Repositories: Ly package missing'}
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>
              {lang === 'fr'
                ? `Le gestionnaire "Ly" n'existe pas dans les dépôts Debian / Ubuntu / Alpine officiels. Le générateur OSForge n'installera aucun paquet fictif pour ne pas faire échouer le bootstrap. Choisissez LightDM ou SDDM pour cette distribution.`
                : `"Ly" is not packaged in official Debian / Ubuntu / Alpine repositories. The OSForge generator will not install phantom packages to ensure clean bootstrap. Consider LightDM or SDDM.`}
            </div>
          </div>
        </div>
      )}

      {/* Avertissement Zéro Cosmétique : Bureau GUI avec DM none */}
      {isNoneOnGui && (
        <div style={{
          padding: '12px 16px',
          borderRadius: '8px',
          background: 'rgba(56, 189, 248, 0.1)',
          border: '1px solid rgba(56, 189, 248, 0.4)',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '12px',
        }}>
          <AlertTriangle size={18} color="var(--cyan)" style={{ flexShrink: 0, marginTop: '2px' }} />
          <div>
            <div style={{ fontSize: '0.84rem', fontWeight: 700, color: '#38bdf8' }}>
              {lang === 'fr' ? 'Mode Console Directe sans Greeter' : 'Direct Console Boot without Greeter'}
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>
              {lang === 'fr'
                ? `Vous avez choisi un bureau graphique (${currentDesktop.name}) mais aucun Display Manager ("Aucun"). La machine démarrera directement en console TTY shell. Vous devrez exécuter manuellement startx ou lancer votre compositeur.`
                : `You selected a GUI desktop (${currentDesktop.name}) but no display manager ("None"). The OS will boot to text console TTY. You will need to start the GUI manually with startx or compositor command.`}
            </div>
          </div>
        </div>
      )}

      {/* Avertissement Autologin non standardisé */}
      {isAutologinUnsupported && (
        <div style={{
          padding: '10px 14px',
          borderRadius: '8px',
          background: 'rgba(168, 85, 247, 0.08)',
          border: '1px solid rgba(168, 85, 247, 0.3)',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
        }}>
          <InfoTooltip text="GDM, SDDM, LightDM and Getty Kiosk are automated." />
          <div style={{ fontSize: '0.78rem', color: '#d8b4fe' }}>
            {lang === 'fr'
              ? `Note système : L'autologin automatisé dans OSForge est câblé pour GDM, SDDM, LightDM et la console Kiosk. Pour "${currentDMMeta.name}", l'authentification restera demandée au premier boot.`
              : `System note: Automated autologin scripts are implemented for GDM, SDDM, LightDM, and Getty Kiosk. Manual login prompt will remain active for "${currentDMMeta.name}".`}
          </div>
        </div>
      )}

      {/* 3. Disposition à 2 Colonnes : Grille des Display Managers + Panneau Simulateur & Autologin */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))',
        gap: '20px',
        alignItems: 'start',
      }}>
        {/* COLONNE GAUCHE : Sélecteur de Gestionnaire de Connexion */}
        <div className="glass-panel" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Sliders size={18} color="var(--cyan)" />
              {lang === 'fr' ? 'Catalogue des Gestionnaires (7 DMs)' : 'Display Manager Catalog (7 DMs)'}
            </h3>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>
              {lang === 'fr' ? 'Sélectionnez le greeter cible' : 'Select target greeter'}
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {DM_CATALOG.map((dm) => {
              const isSelected = recipe.displayManager === dm.id;
              const isRecommended = currentDesktop.recommendedDM === dm.id;

              return (
                <div
                  key={dm.id}
                  onClick={() => onChange({ displayManager: dm.id })}
                  style={{
                    padding: '14px 16px',
                    borderRadius: '8px',
                    background: isSelected
                      ? `linear-gradient(135deg, rgba(${dm.id === 'sddm' ? '56, 189, 248' : dm.id === 'gdm3' ? '59, 130, 246' : dm.id === 'lightdm' ? '16, 185, 129' : dm.id === 'ly' ? '168, 85, 247' : dm.id === 'cosmic-greeter' ? '245, 158, 11' : '148, 163, 184'}, 0.12) 0%, rgba(10, 15, 28, 0.7) 100%)`
                      : 'rgba(10, 15, 28, 0.4)',
                    border: `1.5px solid ${isSelected ? dm.accentColor : 'var(--border-subtle)'}`,
                    cursor: 'pointer',
                    transition: 'all 0.18s ease',
                    boxShadow: isSelected ? `0 0 16px ${dm.accentColor}25` : 'none',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 700, fontSize: '0.92rem', color: isSelected ? '#ffffff' : 'var(--text-main)' }}>
                          {dm.name}
                        </span>
                        <span
                          style={{
                            fontSize: '0.65rem',
                            fontWeight: 600,
                            padding: '1px 6px',
                            borderRadius: '4px',
                            background: `${dm.accentColor}20`,
                            color: dm.accentColor,
                            border: `1px solid ${dm.accentColor}40`,
                          }}
                        >
                          {dm.framework}
                        </span>
                        {isRecommended && (
                          <span
                            style={{
                              fontSize: '0.65rem',
                              fontWeight: 700,
                              padding: '1px 6px',
                              borderRadius: '4px',
                              background: 'rgba(245, 158, 11, 0.2)',
                              color: '#fbbf24',
                              border: '1px solid rgba(245, 158, 11, 0.5)',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '3px',
                            }}
                          >
                            <Sparkles size={10} />
                            {lang === 'fr' ? 'Recommandé' : 'Recommended'}
                          </span>
                        )}
                      </div>

                      <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '4px', lineHeight: 1.35 }}>
                        {lang === 'fr' ? dm.descFr : dm.descEn}
                      </div>

                      {/* Métadonnées techniques & Protocoles */}
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '8px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '0.68rem', color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: '3px' }}>
                          <Zap size={11} color="var(--yellow)" />
                          RAM : ~{dm.ramMB} MB
                        </span>
                        <span style={{ fontSize: '0.68rem', color: 'var(--text-dim)' }}>•</span>
                        <span style={{ fontSize: '0.68rem', color: 'var(--text-dim)' }}>
                          {dm.protocols.map((p) => (p === 'wayland' ? 'Wayland' : p === 'x11' ? 'X11' : 'TTY')).join(' / ')}
                        </span>
                        <span style={{ fontSize: '0.68rem', color: 'var(--text-dim)' }}>•</span>
                        <span style={{ fontSize: '0.68rem', color: 'var(--text-dim)', fontFamily: 'monospace' }}>
                          {dm.serviceUnit.split(' ')[0]}
                        </span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', paddingTop: '2px' }}>
                      <div style={{
                        width: '20px',
                        height: '20px',
                        borderRadius: '50%',
                        border: `2px solid ${isSelected ? dm.accentColor : 'var(--border-subtle)'}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: isSelected ? dm.accentColor : 'transparent',
                        transition: 'all 0.15s ease',
                      }}>
                        {isSelected && <Check size={12} color="#000000" strokeWidth={3} />}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* COLONNE DROITE : Simulateur Greeter Interactif + Panneau Auto-Login */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* A. Simulateur d'Écran de Connexion en Direct (Live Greeter Preview) */}
          <div className="glass-panel" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h3 style={{ fontSize: '0.98rem', fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Eye size={18} color="var(--violet)" />
                {lang === 'fr' ? 'Simulateur d’Écran de Connexion (Live Greeter)' : 'Live Greeter Simulator'}
              </h3>
              <span className="badge badge-violet" style={{ fontSize: '0.68rem' }}>
                Skin {currentDMMeta.name}
              </span>
            </div>

            {/* Le Cadre d'Écran Greeter Interactif */}
            <div
              style={{
                position: 'relative',
                width: '100%',
                minHeight: '340px',
                borderRadius: '10px',
                overflow: 'hidden',
                background: wallpaperBg,
                boxShadow: '0 8px 30px rgba(0,0,0,0.6)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                padding: '16px',
                fontFamily: recipe.displayManager === 'ly' ? 'monospace' : 'inherit',
              }}
            >
              {/* Overlay sombre avec flou pour lisibilité du greeter */}
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  background: recipe.displayManager === 'ly'
                    ? 'rgba(0, 0, 0, 0.88)'
                    : recipe.displayManager === 'none'
                    ? 'rgba(2, 6, 23, 0.95)'
                    : 'rgba(15, 23, 42, 0.45)',
                  backdropFilter: recipe.displayManager === 'ly' || recipe.displayManager === 'none' ? 'none' : 'blur(8px)',
                  zIndex: 1,
                }}
              />

              {/* Effet CRT scanlines pour Ly */}
              {recipe.displayManager === 'ly' && (
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    backgroundImage: 'linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%)',
                    backgroundSize: '100% 4px',
                    pointerEvents: 'none',
                    zIndex: 2,
                    opacity: 0.6,
                  }}
                />
              )}

              {/* Barre Supérieure du Greeter (Horloge, Date, Statut, Power) */}
              <div style={{ position: 'relative', zIndex: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#ffffff', textShadow: '0 2px 4px rgba(0,0,0,0.8)' }}>
                    {currentTime}
                  </span>
                  <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.7)', textShadow: '0 1px 3px rgba(0,0,0,0.8)' }}>
                    • {currentDate}
                  </span>
                </div>

                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.8)', padding: '2px 8px', borderRadius: '12px', background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }}>
                    {recipe.hostname || 'osforge'}
                  </span>
                  <div style={{ display: 'flex', gap: '4px', color: 'rgba(255,255,255,0.8)' }}>
                    <span title={lang === 'fr' ? 'Éteindre' : 'Shutdown'} style={{ display: 'inline-flex', cursor: 'pointer' }}>
                      <Power size={14} />
                    </span>
                  </div>
                </div>
              </div>

              {/* Centre du Greeter : Formulaire d'Authentification Dynamique par DM */}
              <div style={{ position: 'relative', zIndex: 3, margin: 'auto 0', display: 'flex', justifyContent: 'center' }}>
                {testLoginState === 'success' ? (
                  <div style={{
                    padding: '20px 28px',
                    borderRadius: '12px',
                    background: 'rgba(16, 185, 129, 0.25)',
                    border: '1px solid #10b981',
                    backdropFilter: 'blur(12px)',
                    textAlign: 'center',
                    color: '#ffffff',
                    animation: 'fadeIn 0.3s ease-out',
                  }}>
                    <CheckCircle2 size={32} color="#10b981" style={{ margin: '0 auto 8px' }} />
                    <div style={{ fontSize: '1rem', fontWeight: 800 }}>
                      {lang === 'fr' ? 'Authentification Réussie !' : 'Authentication Successful!'}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#6ee7b7', marginTop: '4px' }}>
                      {lang === 'fr'
                        ? `Lancement de la session ${currentDesktop.name} (${targetSessionInfo.session})...`
                        : `Launching ${currentDesktop.name} session (${targetSessionInfo.session})...`}
                    </div>
                  </div>
                ) : recipe.displayManager === 'ly' ? (
                  /* Skin Ly TUI Matrix Terminal */
                  <div style={{
                    width: '100%',
                    maxWidth: '380px',
                    padding: '16px',
                    borderRadius: '4px',
                    border: '1.5px solid #a855f7',
                    background: 'rgba(0, 0, 0, 0.85)',
                    color: '#c084fc',
                    fontSize: '0.78rem',
                    boxShadow: '0 0 20px rgba(168, 85, 247, 0.3)',
                  }}>
                    <div style={{ textAlign: 'center', borderBottom: '1px dashed #a855f7', paddingBottom: '6px', marginBottom: '10px', color: '#e9d5ff', fontWeight: 700 }}>
                      * LY DISPLAY MANAGER (v0.6.0) *
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#a855f7' }}>login:</span>
                        <span style={{ color: '#ffffff', fontWeight: 600 }}>{recipe.user.username || 'user'}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#a855f7' }}>password:</span>
                        <span style={{ color: '#94a3b8' }}>••••••••••••</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed #a855f7', paddingTop: '6px' }}>
                        <span style={{ color: '#a855f7' }}>desktop:</span>
                        <span style={{ color: '#38bdf8' }}>{targetSessionInfo.session} (F1/F2)</span>
                      </div>
                    </div>
                    {recipe.user.autologin && (
                      <div style={{ marginTop: '8px', fontSize: '0.7rem', color: '#f59e0b', textAlign: 'center' }}>
                        [AUTOLOGIN: bypass auth → direct shell]
                      </div>
                    )}
                  </div>
                ) : recipe.displayManager === 'none' ? (
                  /* Skin None / TTY Pure Console */
                  <div style={{
                    width: '100%',
                    maxWidth: '420px',
                    padding: '16px',
                    borderRadius: '6px',
                    background: '#020617',
                    border: '1px solid #1e293b',
                    color: '#38bdf8',
                    fontFamily: 'monospace',
                    fontSize: '0.76rem',
                    lineHeight: 1.4,
                  }}>
                    <div style={{ color: '#94a3b8' }}>OSForge Linux 6.12.0 ({recipe.arch})</div>
                    <div style={{ color: '#64748b', marginBottom: '8px' }}>tty1 - console mode</div>
                    <div>
                      {recipe.hostname || 'osforge'} login: <span style={{ color: '#ffffff' }}>{recipe.user.username || 'user'}</span>
                    </div>
                    {recipe.user.autologin ? (
                      <div style={{ color: '#10b981' }}>[tty1 autologin active: /sbin/agetty override applied]</div>
                    ) : (
                      <div>Password: <span style={{ animation: 'blink 1s infinite' }}>_</span></div>
                    )}
                    {recipe.desktop === 'web_kiosk' && (
                      <div style={{ color: '#ec4899', marginTop: '6px' }}>
                        cage -s -- chromium --kiosk {recipe.kioskUrl || 'https://console.openfactory.tech'}
                      </div>
                    )}
                  </div>
                ) : (
                  /* Skin Graphique Moderne (SDDM / GDM / LightDM / COSMIC / DDM) */
                  <div style={{
                    width: '100%',
                    maxWidth: '340px',
                    padding: '20px',
                    borderRadius: '16px',
                    background: 'rgba(15, 23, 42, 0.75)',
                    border: `1.5px solid ${currentDMMeta.accentColor}50`,
                    backdropFilter: 'blur(16px)',
                    textAlign: 'center',
                    boxShadow: `0 12px 40px rgba(0,0,0,0.5), 0 0 20px ${currentDMMeta.accentColor}20`,
                  }}>
                    {/* Avatar Utilisateur */}
                    <div style={{
                      width: '64px',
                      height: '64px',
                      borderRadius: '50%',
                      background: `linear-gradient(135deg, ${currentDMMeta.accentColor} 0%, #1e1b4b 100%)`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      margin: '0 auto 12px',
                      border: '2px solid rgba(255, 255, 255, 0.2)',
                      boxShadow: `0 0 16px ${currentDMMeta.accentColor}40`,
                    }}>
                      <User size={30} color="#ffffff" />
                    </div>

                    <div style={{ fontSize: '1rem', fontWeight: 800, color: '#ffffff', marginBottom: '2px' }}>
                      {recipe.user.fullName || recipe.user.username || 'User'}
                    </div>
                    <div style={{ fontSize: '0.74rem', color: 'var(--text-dim)', marginBottom: '14px' }}>
                      @{recipe.user.username || 'user'} • {currentDMMeta.name}
                    </div>

                    {/* Champ Mot de Passe ou Indicateur Auto-login */}
                    {recipe.user.autologin ? (
                      <div style={{
                        padding: '10px',
                        borderRadius: '8px',
                        background: 'rgba(16, 185, 129, 0.15)',
                        border: '1px solid rgba(16, 185, 129, 0.4)',
                        color: '#6ee7b7',
                        fontSize: '0.78rem',
                        fontWeight: 600,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                      }}>
                        <Zap size={14} color="#10b981" />
                        {lang === 'fr' ? 'Connexion Automatique Active' : 'Automatic Login Active'}
                      </div>
                    ) : (
                      <div style={{ position: 'relative', width: '100%' }}>
                        <input
                          type="password"
                          readOnly
                          value="password123"
                          style={{
                            width: '100%',
                            padding: '8px 36px 8px 12px',
                            borderRadius: '8px',
                            background: 'rgba(255, 255, 255, 0.08)',
                            border: '1px solid rgba(255, 255, 255, 0.15)',
                            color: '#ffffff',
                            fontSize: '0.85rem',
                            textAlign: 'center',
                            letterSpacing: '0.2em',
                          }}
                        />
                        <button
                          type="button"
                          onClick={handleSimulateLogin}
                          style={{
                            position: 'absolute',
                            right: '6px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            background: currentDMMeta.accentColor,
                            border: 'none',
                            borderRadius: '6px',
                            width: '24px',
                            height: '24px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            color: '#000',
                          }}
                          title={lang === 'fr' ? 'Valider la connexion' : 'Submit login'}
                        >
                          <ChevronRight size={16} strokeWidth={3} />
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Barre Inférieure du Greeter (Sélecteur de Session Desktop) */}
              <div style={{ position: 'relative', zIndex: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '4px 10px',
                  borderRadius: '20px',
                  background: 'rgba(0, 0, 0, 0.5)',
                  backdropFilter: 'blur(6px)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                }}>
                  <Radio size={12} color={currentDMMeta.accentColor} />
                  <span style={{ fontSize: '0.72rem', color: '#ffffff', fontWeight: 600 }}>
                    {currentDesktop.name} ({targetSessionInfo.isWaylandNative ? 'Wayland' : 'X11'})
                  </span>
                </div>

                {/* Bouton pour déclencher l'animation de test */}
                <button
                  type="button"
                  onClick={handleSimulateLogin}
                  disabled={testLoginState !== 'idle'}
                  style={{
                    padding: '5px 12px',
                    borderRadius: '6px',
                    fontSize: '0.74rem',
                    fontWeight: 700,
                    background: testLoginState === 'logging_in' ? '#f59e0b' : 'rgba(255, 255, 255, 0.15)',
                    color: '#ffffff',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    cursor: testLoginState === 'idle' ? 'pointer' : 'default',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    backdropFilter: 'blur(6px)',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <RefreshCw size={12} className={testLoginState === 'logging_in' ? 'spin' : ''} />
                  <span>
                    {testLoginState === 'logging_in'
                      ? (lang === 'fr' ? 'Connexion en cours...' : 'Logging in...')
                      : (lang === 'fr' ? 'Tester Connexion' : 'Test Login')}
                  </span>
                </button>
              </div>
            </div>
          </div>

          {/* B. Contrôleur de Connexion Automatique (Auto-Login & Target Session) */}
          <div className="glass-panel" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h3 style={{ fontSize: '0.98rem', fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <KeyRound size={18} color="var(--emerald)" />
                {lang === 'fr' ? 'Connexion Automatique (Auto-Login)' : 'Automatic Login (Auto-Login)'}
                <InfoTooltip
                  text={lang === 'fr'
                    ? 'Démarre immédiatement le bureau sélectionné sans demander de mot de passe utilisateur. Câblé directement dans le script bash de build.'
                    : 'Immediately boots into the user desktop without prompting for password. Directly configured in the build script.'}
                />
              </h3>

              {/* Master Switch Autologin */}
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={recipe.user.autologin}
                  onChange={(e) => onChange({
                    user: { ...recipe.user, autologin: e.target.checked }
                  })}
                  style={{ width: '18px', height: '18px', accentColor: 'var(--emerald)', cursor: 'pointer' }}
                />
                <span style={{ fontSize: '0.82rem', fontWeight: 700, color: recipe.user.autologin ? '#34d399' : 'var(--text-muted)' }}>
                  {recipe.user.autologin ? (lang === 'fr' ? 'ACTIVÉE' : 'ENABLED') : (lang === 'fr' ? 'DÉSACTIVÉE' : 'DISABLED')}
                </span>
              </label>
            </div>

            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '14px', lineHeight: 1.4 }}>
              {lang === 'fr'
                ? 'Permet à l’ordinateur de démarrer directement sur la session graphique sans interruption, idéal pour PC de salon, bornes interactives, ou postes personnels protégés par chiffrement LUKS.'
                : 'Allows the system to boot straight into the graphical desktop without prompting. Ideal for media centers, kiosks, or single-user machines secured by LUKS.'}
            </p>

            {/* Récapitulatif technique câblé */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '10px',
              padding: '12px',
              borderRadius: '8px',
              background: 'rgba(15, 23, 42, 0.5)',
              border: '1px solid var(--border-subtle)',
              marginBottom: '14px',
            }}>
              <div>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>
                  {lang === 'fr' ? 'Utilisateur Cible :' : 'Target User:'}
                </div>
                <div style={{ fontSize: '0.84rem', fontWeight: 700, color: '#ffffff', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <User size={13} color="var(--cyan)" />
                  {recipe.user.username || 'user'}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>
                  {lang === 'fr' ? 'Session Lancée :' : 'Session Started:'}
                </div>
                <div style={{ fontSize: '0.84rem', fontWeight: 700, color: '#c084fc', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Layers size={13} />
                  {targetSessionInfo.session} ({targetSessionInfo.isWaylandNative ? 'Wayland' : 'X11'})
                </div>
              </div>
            </div>

            {/* Bouton pour afficher/masquer le code bash injecté */}
            <button
              type="button"
              onClick={() => setShowConfigCode(!showConfigCode)}
              className="btn btn-secondary"
              style={{ width: '100%', fontSize: '0.76rem', padding: '6px 12px', justifyContent: 'center' }}
            >
              <FileCode size={13} />
              <span>
                {showConfigCode
                  ? (lang === 'fr' ? 'Masquer la configuration bash' : 'Hide bash config')
                  : (lang === 'fr' ? 'Voir le code de configuration généré (/etc)' : 'View generated config code (/etc)')}
              </span>
            </button>

            {/* Snippet bash en direct (Zéro Cosmétique) */}
            {showConfigCode && (
              <div style={{ marginTop: '12px', borderRadius: '6px', overflow: 'hidden', border: '1px solid var(--border-subtle)' }}>
                <div style={{ background: 'rgba(15, 23, 42, 0.8)', padding: '6px 10px', fontSize: '0.7rem', color: 'var(--text-dim)', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between' }}>
                  <span>{currentDMMeta.configPath}</span>
                  <span>bash dmAutologinCmd</span>
                </div>
                <pre style={{
                  padding: '10px',
                  background: '#090d16',
                  color: '#38bdf8',
                  fontSize: '0.72rem',
                  lineHeight: 1.45,
                  margin: 0,
                  overflowX: 'auto',
                  fontFamily: 'monospace',
                }}>
                  {generatedAutologinSnippet}
                </pre>
              </div>
            )}

            {/* Avertissement de sécurité si autologin activé */}
            {recipe.user.autologin && (
              <div style={{
                marginTop: '12px',
                padding: '8px 12px',
                borderRadius: '6px',
                background: 'rgba(239, 68, 68, 0.08)',
                border: '1px solid rgba(239, 68, 68, 0.25)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}>
                <Shield size={14} color="#f87171" style={{ flexShrink: 0 }} />
                <span style={{ fontSize: '0.72rem', color: '#fca5a5' }}>
                  {lang === 'fr'
                    ? 'Attention : Quiconque allume la machine accède directement au compte sans mot de passe.'
                    : 'Caution: Anyone turning on the physical computer gains direct access without password.'}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
