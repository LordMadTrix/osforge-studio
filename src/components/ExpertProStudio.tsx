import React, { useState, useMemo } from 'react';
import { 
  Server, Monitor, Palette, Package, Cpu, Shield, FileCode, Search, 
  ChevronRight, ChevronDown, Sliders, Terminal, Zap, Eye, Flame, Check, ArrowRight, ArrowLeft, 
  PanelRightClose, PanelRightOpen, Sparkles, Layers, Download,
  HardDrive, Lock, Gamepad2, FolderGit2, Wifi, Clock, User, Key, ShieldCheck, AppWindow, CheckCircle2
} from 'lucide-react';
import { OSRecipe, DistroId } from '../types/os';
import { DistroSelector } from './DistroSelector';
import { DesktopSelector } from './DesktopSelector';
import { SessionManagerView } from './SessionManagerView';
import { SimulatorsView } from './SimulatorsView';
import { BrandingDesignView } from './BrandingDesignView';
import { PackageCatalog } from './PackageCatalog';
import { SystemConfig } from './SystemConfig';
import { GamingConfigView } from './GamingConfigView';
import { SecurityConfig } from './SecurityConfig';
import { PostInstallScripts } from './PostInstallScripts';
import { RecipeInspector } from './RecipeInspector';
import { calculateResourceEstimate } from '../services/resourceEstimator';
import { sanitizeHexColor } from '../services/generators/branding';

export type StudioSectionId = 
  // Base Système & Cible
  | 'sec_base'
  | 'base_distro'
  | 'base_kernel'
  | 'base_output'
  // Bureau & Interface
  | 'sec_ui'
  | 'ui_desktop'
  | 'ui_display_manager'
  | 'ui_default_apps'
  | 'ui_simulators'
  // Design System & Branding
  | 'sec_brand'
  | 'brand_theme'
  | 'brand_appearance'
  | 'brand_terminal_plymouth'
  | 'brand_identity'
  // Logiciels & Dépôts
  | 'pkgs_catalog'
  // Système & Matériel
  | 'sec_sys'
  | 'sys_identity'
  | 'sys_user'
  | 'sys_ssh'
  | 'sys_network'
  | 'sys_locale_power'
  | 'sys_storage'
  | 'sys_gaming'
  // Sécurité & Durcissement
  | 'sec_security'
  | 'sec_benchmark'
  | 'sec_firewall'
  | 'sec_luks'
  | 'sec_hardening'
  // Post-Install & Automatisation
  | 'sec_post'
  | 'post_firstboot'
  | 'post_dotfiles'
  | 'post_services'
  // Code & Manifestes
  | 'export_inspector'
  // Compatibilité
  | 'sys_config'
  | 'post_scripts'
  | 'brand_design';

interface ExpertProStudioProps {
  recipe: OSRecipe;
  onChange: (updated: Partial<OSRecipe>) => void;
  lang: 'fr' | 'en';
  onStartBuild: () => void;
  onOpenTips: () => void;
  onOpenScreenshots?: (tabOrId?: string) => void;
  onOpenAudit?: () => void;
  onOpenPresets?: () => void;
  onOpenAI?: () => void;
  onOpenOfficialReleases?: (distroId?: DistroId) => void;
  initialSection?: StudioSectionId;
}

interface NavSectionItem {
  id: StudioSectionId;
  labelFr: string;
  labelEn: string;
  icon: React.ReactNode;
  badge?: string;
  descriptionFr: string;
  descriptionEn: string;
  currentValue?: string;
}

interface NavCategory {
  id: string;
  sectionId: StudioSectionId;
  titleFr: string;
  titleEn: string;
  icon: React.ReactNode;
  color: string;
  badge?: string;
  descriptionFr: string;
  descriptionEn: string;
  items: NavSectionItem[];
}

interface SectionOverviewViewProps {
  category: NavCategory;
  recipe: OSRecipe;
  lang: 'fr' | 'en';
  accentColor: string;
  onNavigate: (sectionId: StudioSectionId) => void;
}

const SectionOverviewView: React.FC<SectionOverviewViewProps> = ({
  category,
  lang,
  accentColor,
  onNavigate,
}) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Hero Banner de la Section */}
      <div style={{
        padding: '24px',
        borderRadius: '12px',
        background: `linear-gradient(135deg, ${category.color}18 0%, rgba(13, 19, 31, 0.9) 100%)`,
        border: `1px solid ${category.color}40`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '16px',
        boxShadow: `0 8px 30px ${category.color}12`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{
            width: '54px',
            height: '54px',
            borderRadius: '12px',
            background: `${category.color}25`,
            border: `1px solid ${category.color}50`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: `0 0 20px ${category.color}30`,
          }}>
            {React.cloneElement(category.icon as React.ReactElement<{ size?: number; color?: string }>, { size: 28, color: category.color })}
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px', color: category.color }}>
                {lang === 'fr' ? 'Section Principale' : 'Main Section'}
              </span>
              {category.badge && (
                <span style={{
                  fontSize: '0.68rem',
                  padding: '1px 6px',
                  borderRadius: '4px',
                  background: `${category.color}25`,
                  color: category.color,
                  fontWeight: 700,
                  border: `1px solid ${category.color}40`,
                }}>
                  {category.badge}
                </span>
              )}
            </div>
            <h1 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0, color: '#ffffff' }}>
              {lang === 'fr' ? category.titleFr : category.titleEn}
            </h1>
            <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', margin: '6px 0 0 0', maxWidth: '650px', lineHeight: 1.5 }}>
              {lang === 'fr' ? category.descriptionFr : category.descriptionEn}
            </p>
          </div>
        </div>

        <div style={{
          background: 'rgba(0, 0, 0, 0.35)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '8px',
          padding: '10px 16px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}>
          <span style={{ fontSize: '1.35rem', fontWeight: 800, color: category.color }}>
            {category.items.length}
          </span>
          <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            {lang === 'fr' ? 'Sous-pages dédiées' : 'Dedicated sub-pages'}
          </span>
        </div>
      </div>

      {/* Grille des Cartes de Sous-Sections Dédiées */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
        gap: '16px',
      }}>
        {category.items.map((item, idx) => (
          <div
            key={item.id}
            onClick={() => onNavigate(item.id)}
            style={{
              background: 'rgba(13, 19, 31, 0.8)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '10px',
              padding: '18px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: '14px',
              cursor: 'pointer',
              transition: 'all 0.18s ease',
              position: 'relative',
              overflow: 'hidden',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = category.color;
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = `0 6px 20px ${category.color}20`;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
              e.currentTarget.style.transform = 'none';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '7px',
                    background: `${category.color}15`,
                    color: category.color,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    {item.icon}
                  </div>
                  <div>
                    <span style={{ fontSize: '0.66rem', color: 'var(--text-muted)', fontWeight: 700 }}>
                      {lang === 'fr' ? `Sous-section ${idx + 1}` : `Sub-section ${idx + 1}`}
                    </span>
                    <h3 style={{ fontSize: '0.95rem', fontWeight: 700, margin: 0, color: '#ffffff' }}>
                      {lang === 'fr' ? item.labelFr : item.labelEn}
                    </h3>
                  </div>
                </div>

                {item.badge && (
                  <span style={{
                    fontSize: '0.68rem',
                    padding: '2px 7px',
                    borderRadius: '4px',
                    background: 'rgba(255, 255, 255, 0.08)',
                    color: 'var(--text-main)',
                    fontWeight: 700,
                  }}>
                    {item.badge}
                  </span>
                )}
              </div>

              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '0 0 10px 0', lineHeight: 1.4 }}>
                {lang === 'fr' ? item.descriptionFr : item.descriptionEn}
              </p>
            </div>

            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderTop: '1px solid rgba(255, 255, 255, 0.06)',
              paddingTop: '12px',
            }}>
              {item.currentValue ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                    {lang === 'fr' ? 'Actuel :' : 'Current:'}
                  </span>
                  <span style={{ fontSize: '0.72rem', color: category.color, fontWeight: 700 }}>
                    {item.currentValue}
                  </span>
                </div>
              ) : <div />}

              <button
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: accentColor,
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  cursor: 'pointer',
                  padding: '4px 8px',
                  borderRadius: '4px',
                }}
              >
                <span>{lang === 'fr' ? 'Configurer' : 'Configure'}</span>
                <ArrowRight size={13} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export const ExpertProStudio: React.FC<ExpertProStudioProps> = ({
  recipe,
  onChange,
  lang,
  onStartBuild,
  onOpenTips,
  onOpenScreenshots,
  onOpenAudit,
  onOpenPresets,
  onOpenAI,
  onOpenOfficialReleases,
  initialSection = 'base_distro',
}) => {
  const [activeSection, setActiveSection] = useState<StudioSectionId>(initialSection);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isHudCollapsed, setIsHudCollapsed] = useState(false);
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({});

  const toggleCategory = (catId: string) => {
    setCollapsedCategories(prev => ({ ...prev, [catId]: !prev[catId] }));
  };

  // Estimation des ressources
  const estimate = useMemo(() => calculateResourceEstimate(recipe), [recipe]);
  const accentColor = sanitizeHexColor(recipe.branding.accentColor, '#0ea5e9');

  // Arborescence de navigation structurée et granulaire avec chaque section et sous-section
  const categories: NavCategory[] = useMemo(() => [
    {
      id: 'cat_base',
      sectionId: 'sec_base',
      titleFr: 'Base Système & Cible',
      titleEn: 'System Base & Target',
      icon: <Server size={17} color="#38bdf8" />,
      color: '#38bdf8',
      badge: `${recipe.distro.toUpperCase()} • ${recipe.arch}`,
      descriptionFr: 'Distribution Linux racine, version de publication, noyau et format d\'image amorçable cible.',
      descriptionEn: 'Root Linux distribution, release version, kernel optimizations, and target bootable image formats.',
      items: [
        {
          id: 'base_distro',
          labelFr: 'Distribution Linux',
          labelEn: 'Linux Distribution',
          icon: <Server size={14} />,
          badge: recipe.distro.toUpperCase(),
          descriptionFr: 'Choix de la distribution parmi Debian, Ubuntu, Kali, Mint, Arch, Fedora, Alpine, etc.',
          descriptionEn: 'Distribution selection among Debian, Ubuntu, Kali, Mint, Arch, Fedora, Alpine, etc.',
          currentValue: `${recipe.distro} ${recipe.distroVersion || ''}`,
        },
        {
          id: 'base_kernel',
          labelFr: 'Noyau Linux & Tuning',
          labelEn: 'Linux Kernel & Tuning',
          icon: <Zap size={14} />,
          badge: recipe.kernel,
          descriptionFr: 'Optimisations de scheduling du noyau (Standard, Zen, Liquorix 1000 Hz, Hardened, RT).',
          descriptionEn: 'Kernel scheduler optimizations (Standard, Zen, Liquorix 1000 Hz, Hardened, RT).',
          currentValue: `Noyau ${recipe.kernel}`,
        },
        {
          id: 'base_output',
          labelFr: 'Architecture & Formats',
          labelEn: 'Architecture & Output',
          icon: <HardDrive size={14} />,
          badge: `${recipe.arch}`,
          descriptionFr: 'Format de sortie : ISO Live Hybride, Image Disque QCOW2/VMDK/RAW, RootFS WSL2 ou SD Pi.',
          descriptionEn: 'Output format: Hybrid Live ISO, QCOW2/VMDK/RAW Disk Image, WSL2 RootFS, or SD Card.',
          currentValue: `${recipe.outputFormat} (${recipe.arch})`,
        },
      ],
    },
    {
      id: 'cat_ui',
      sectionId: 'sec_ui',
      titleFr: 'Bureau & Interface',
      titleEn: 'Desktop & Interface',
      icon: <Monitor size={17} color="#a855f7" />,
      color: '#a855f7',
      badge: recipe.desktop ? recipe.desktop.toUpperCase() : 'HEADLESS',
      descriptionFr: 'Environnement de bureau, gestionnaire de fenêtres, session de connexion et applications par défaut.',
      descriptionEn: 'Desktop environment, window managers, display greeters, and default desktop applications.',
      items: [
        {
          id: 'ui_desktop',
          labelFr: 'Environnement de Bureau',
          labelEn: 'Desktop Environment',
          icon: <Monitor size={14} />,
          badge: recipe.desktop,
          descriptionFr: '18 bureaux et fenêtres (KDE Plasma, GNOME, XFCE, Hyprland, Sway, Kiosk, etc.).',
          descriptionEn: '18 desktop environments & WMs (KDE Plasma, GNOME, XFCE, Hyprland, Sway, Kiosk, etc.).',
          currentValue: recipe.desktop,
        },
        {
          id: 'ui_display_manager',
          labelFr: 'Gestionnaire de Session',
          labelEn: 'Display Manager',
          icon: <AppWindow size={14} />,
          badge: recipe.displayManager,
          descriptionFr: 'Gestionnaire de connexion graphique (LightDM, GDM3, SDDM, ou console pure).',
          descriptionEn: 'Graphical display manager & greeter (LightDM, GDM3, SDDM, or pure console).',
          currentValue: recipe.displayManager,
        },
        {
          id: 'ui_default_apps',
          labelFr: 'Applications & Administration',
          labelEn: 'Default Apps & Sysadmin',
          icon: <Sliders size={14} />,
          descriptionFr: 'Navigateur, terminal, éditeur, gestionnaire de disques, moniteur système et logithèque.',
          descriptionEn: 'Web browser, terminal, editor, disk manager, system monitor, and software center.',
          currentValue: `${recipe.defaultApps?.browser || 'Firefox'} • ${recipe.defaultApps?.diskManager || 'Disques'}`,
        },
        {
          id: 'ui_simulators',
          labelFr: 'Simulateurs Bureau & Boot',
          labelEn: 'Desktop & Boot Simulators',
          icon: <Eye size={14} />,
          descriptionFr: 'Simulateur interactif temps réel du boot Plymouth et du bureau graphique en direct.',
          descriptionEn: 'Real-time interactive preview of Plymouth boot sequence and live desktop.',
          currentValue: 'Plymouth & Live',
        },
      ],
    },
    {
      id: 'cat_brand',
      sectionId: 'sec_brand',
      titleFr: 'Design System & Branding',
      titleEn: 'Design System & Branding',
      icon: <Palette size={17} color="#ec4899" />,
      color: '#ec4899',
      badge: recipe.branding.accentColor,
      descriptionFr: 'Identité visuelle de votre distribution, fonds d\'écran, thèmes d\'icônes, Plymouth et polices.',
      descriptionEn: 'Visual branding of your Linux distribution: wallpapers, icons, cursors, Plymouth and fonts.',
      items: [
        {
          id: 'brand_theme',
          labelFr: 'Couleurs & Fonds d\'Écran',
          labelEn: 'Colors & Wallpapers',
          icon: <Palette size={14} />,
          badge: recipe.branding.wallpaperPreset || 'minimal',
          descriptionFr: 'Couleur d\'accentuation HSL et sélection parmi 11 fonds d\'écran HD vectoriels intégrés.',
          descriptionEn: 'Accent color picker and curated collection of 11 vector HD system wallpapers.',
          currentValue: recipe.branding.wallpaperPreset || 'Par défaut',
        },
        {
          id: 'brand_appearance',
          labelFr: 'Icônes, Curseurs & Polices',
          labelEn: 'Icons, Cursors & Fonts',
          icon: <Sparkles size={14} />,
          badge: recipe.branding.iconTheme,
          descriptionFr: 'Packs d\'icônes Papirus/Nordic, thèmes de curseurs et typographies modernes UI et code.',
          descriptionEn: 'Papirus/Nordic icon themes, cursor packs, and modern UI and monospace coding fonts.',
          currentValue: `${recipe.branding.iconTheme || 'Papirus'} • ${recipe.branding.fontFamily || 'Inter'}`,
        },
        {
          id: 'brand_terminal_plymouth',
          labelFr: 'Terminal & Boot Plymouth',
          labelEn: 'Terminal & Boot Plymouth',
          icon: <Terminal size={14} />,
          descriptionFr: 'Palettes terminal (Catppuccin, Tokyo Night, Dracula) et thèmes Plymouth animés.',
          descriptionEn: 'Terminal color schemes (Catppuccin, Tokyo Night, Dracula) and animated Plymouth themes.',
          currentValue: recipe.branding.bootSplashTheme || 'osforge-custom',
        },
        {
          id: 'brand_identity',
          labelFr: 'Identité Système & Fastfetch',
          labelEn: 'System Identity & Fastfetch',
          icon: <CheckCircle2 size={14} />,
          descriptionFr: 'Nom d\'édition dans /etc/os-release, bannière Fastfetch, thème GRUB 2 et disposition boutons.',
          descriptionEn: '/etc/os-release branding, Fastfetch MOTD banner, GRUB 2 theme, and window buttons layout.',
          currentValue: recipe.branding.osName,
        },
      ],
    },
    {
      id: 'cat_pkgs',
      sectionId: 'pkgs_catalog',
      titleFr: 'Logiciels & Dépôts',
      titleEn: 'Software & Repositories',
      icon: <Package size={17} color="#10b981" />,
      color: '#10b981',
      badge: `${recipe.selectedPackages.length + (recipe.customPackages?.length || 0)} paquets`,
      descriptionFr: 'Catalogue interactif de logiciels, paquets CLI, suites pro, utilitaires et dépôts tiers.',
      descriptionEn: 'Interactive software catalog, CLI tools, developer suites, utilities, and extra repositories.',
      items: [
        {
          id: 'pkgs_catalog',
          labelFr: 'Catalogue des Paquets',
          labelEn: 'Package Catalog',
          icon: <Package size={14} />,
          badge: `${recipe.selectedPackages.length + (recipe.customPackages?.length || 0)}`,
          descriptionFr: 'Sélectionnez des logiciels organisés par catégories avec vérification automatique de compatibilité.',
          descriptionEn: 'Select software organized by categories with live repository compatibility checks.',
          currentValue: `${recipe.selectedPackages.length} sélectionnés`,
        },
      ],
    },
    {
      id: 'cat_sys',
      sectionId: 'sec_sys',
      titleFr: 'Système & Matériel',
      titleEn: 'System & Hardware',
      icon: <Cpu size={17} color="#f59e0b" />,
      color: '#f59e0b',
      badge: recipe.hostname,
      descriptionFr: 'Configuration de la machine, utilisateur, réseau OOB, stockage, profils d\'énergie et gaming ROG.',
      descriptionEn: 'Machine identity, user accounts, headless network, storage, power profiles, and ROG gaming.',
      items: [
        {
          id: 'sys_identity',
          labelFr: 'Identité & Nom d\'Hôte',
          labelEn: 'Identity & Hostname',
          icon: <Cpu size={14} />,
          badge: recipe.hostname,
          descriptionFr: 'Nom d\'hôte (hostname), description de la machine et informations système.',
          descriptionEn: 'Hostname, machine description, and system information.',
          currentValue: recipe.hostname,
        },
        {
          id: 'sys_user',
          labelFr: 'Compte Utilisateur',
          labelEn: 'User Account',
          icon: <User size={14} />,
          badge: recipe.user.username,
          descriptionFr: 'Identifiant, mot de passe chiffré, shell par défaut et privilèges sudoers.',
          descriptionEn: 'Username, hashed password, default login shell, and sudo privileges.',
          currentValue: recipe.user.username,
        },
        {
          id: 'sys_ssh',
          labelFr: 'Accès Distant SSH',
          labelEn: 'Remote SSH Access',
          icon: <Key size={14} />,
          badge: recipe.enableSSH ? 'SSH Actif' : undefined,
          descriptionFr: 'Activation du serveur OpenSSH et importation de clés publiques autorisées.',
          descriptionEn: 'OpenSSH server activation and authorized public keys management.',
          currentValue: recipe.enableSSH ? 'Activé' : 'Désactivé',
        },
        {
          id: 'sys_network',
          labelFr: 'Réseau Headless & VPN',
          labelEn: 'Headless Network & VPN',
          icon: <Wifi size={14} />,
          badge: recipe.network?.enableWifi ? 'Wi-Fi' : undefined,
          descriptionFr: 'Pré-configuration Wi-Fi WPA2/WPA3, VPN WireGuard, mesh Tailscale et IP fixe/DHCP.',
          descriptionEn: 'Headless Wi-Fi WPA2/WPA3, WireGuard VPN, Tailscale mesh, and static/DHCP IP.',
          currentValue: recipe.network?.enableWifi ? 'Wi-Fi configuré' : 'Ethernet / DHCP',
        },
        {
          id: 'sys_locale_power',
          labelFr: 'Clavier, Locale & Profils',
          labelEn: 'Keyboard, Locale & Profiles',
          icon: <Clock size={14} />,
          descriptionFr: 'Disposition de clavier, locale système, fuseau horaire et profils d\'alimentation.',
          descriptionEn: 'Keyboard layout, system locale, timezone, and power/audio latency profiles.',
          currentValue: `${recipe.keyboardLayout} • ${recipe.timezone}`,
        },
        {
          id: 'sys_storage',
          labelFr: 'Stockage & Bootloader',
          labelEn: 'Storage & Bootloader',
          icon: <HardDrive size={14} />,
          badge: recipe.bootloader || 'grub2',
          descriptionFr: 'Type de partitionnement (ESP, Root Btrfs/Ext4, Swap) et points de montage.',
          descriptionEn: 'Partition layout (ESP, Root Btrfs/Ext4, Swap) and custom mount points.',
          currentValue: `${recipe.filesystem || 'ext4'} • ${recipe.bootloader || 'grub2'}`,
        },
        {
          id: 'sys_gaming',
          labelFr: 'Gaming, ROG & Latence',
          labelEn: 'Gaming, ROG & Latency',
          icon: <Gamepad2 size={14} />,
          badge: recipe.enableGamingOptimizations ? 'ROG' : undefined,
          descriptionFr: 'Tuning GameMode, latence audio PipeWire, Hugepages, MangoHud et Proton-GE.',
          descriptionEn: 'GameMode tuning, PipeWire audio latency, Hugepages, MangoHud, and Proton-GE.',
          currentValue: recipe.enableGamingOptimizations ? 'Optimisé ROG' : 'Standard',
        },
      ],
    },
    {
      id: 'cat_sec',
      sectionId: 'sec_security',
      titleFr: 'Sécurité & Durcissement',
      titleEn: 'Security & Hardening',
      icon: <Shield size={17} color="#ef4444" />,
      color: '#ef4444',
      badge: recipe.security.firewall !== 'none' ? `${recipe.security.firewall.toUpperCase()}` : 'Standard',
      descriptionFr: 'Conformité CIS Benchmark / ANSSI, pare-feu réseau, chiffrement LUKS2 et durcissement du noyau.',
      descriptionEn: 'CIS Benchmark / ANSSI compliance, network firewalls, LUKS2 encryption, and kernel hardening.',
      items: [
        {
          id: 'sec_benchmark',
          labelFr: 'Conformité CIS Benchmark',
          labelEn: 'CIS Benchmark Compliance',
          icon: <Shield size={14} />,
          badge: recipe.security.cisBenchmarkLevel > 0 ? `CIS L${recipe.security.cisBenchmarkLevel}` : undefined,
          descriptionFr: 'Référentiels de sécurité d\'entreprise ANSSI et CIS Benchmark Niveau 1 & 2.',
          descriptionEn: 'Enterprise security standards ANSSI and CIS Benchmark Level 1 & 2.',
          currentValue: recipe.security.cisBenchmarkLevel > 0 ? `Niveau ${recipe.security.cisBenchmarkLevel}` : 'Standard',
        },
        {
          id: 'sec_firewall',
          labelFr: 'Pare-feu & Filtrage Ports',
          labelEn: 'Firewall & Port Filtering',
          icon: <Flame size={14} />,
          badge: recipe.security.firewall !== 'none' ? recipe.security.firewall.toUpperCase() : undefined,
          descriptionFr: 'Pare-feu système (UFW, NFTables, Fail2ban) et politique de filtrage des ports entrants.',
          descriptionEn: 'System firewall (UFW, NFTables, Fail2ban) and ingress ports filtering policy.',
          currentValue: recipe.security.firewall !== 'none' ? recipe.security.firewall.toUpperCase() : 'Désactivé',
        },
        {
          id: 'sec_luks',
          labelFr: 'Chiffrement Disque LUKS2',
          labelEn: 'LUKS2 Disk Encryption',
          icon: <Lock size={14} />,
          badge: recipe.security.luksEncryption ? 'LUKS2' : undefined,
          descriptionFr: 'Chiffrement intégral de volume avec cryptsetup LUKS2 et clé de secours.',
          descriptionEn: 'Full partition encryption with cryptsetup LUKS2 and recovery passphrase.',
          currentValue: recipe.security.luksEncryption ? 'Chiffré LUKS2' : 'Non chiffré',
        },
        {
          id: 'sec_hardening',
          labelFr: 'Durcissement & Défense',
          labelEn: 'Hardening & Defense',
          icon: <ShieldCheck size={14} />,
          badge: recipe.security.enableCrowdSec ? 'CrowdSec' : undefined,
          descriptionFr: 'Paramètres sysctl de protection noyau, désactivation de root SSH et CrowdSec.',
          descriptionEn: 'Sysctl kernel protection tunables, root SSH lockout, and CrowdSec active defense.',
          currentValue: recipe.security.disableRootSSH ? 'Root SSH bloqué' : 'Standard',
        },
      ],
    },
    {
      id: 'cat_scripts',
      sectionId: 'sec_post',
      titleFr: 'Post-Install & Automatisation',
      titleEn: 'Post-Install & Automation',
      icon: <FileCode size={17} color="#6366f1" />,
      color: '#6366f1',
      badge: recipe.customServices.length > 0 ? `${recipe.customServices.length} services` : undefined,
      descriptionFr: 'Scripts Bash personnalisés au premier démarrage, dotfiles Git et services systemd personnalisés.',
      descriptionEn: 'Custom first-boot bash scripts, Git user dotfiles, and custom systemd/OpenRC units.',
      items: [
        {
          id: 'post_firstboot',
          labelFr: 'Script Bash First-Boot',
          labelEn: 'First-Boot Bash Script',
          icon: <Terminal size={14} />,
          descriptionFr: 'Script Shell exécuté automatiquement avec les privilèges root au premier boot.',
          descriptionEn: 'Shell script executed automatically with root privileges upon first boot.',
          currentValue: recipe.firstBootScript ? 'Script configuré' : 'Aucun',
        },
        {
          id: 'post_dotfiles',
          labelFr: 'Injection Git Dotfiles',
          labelEn: 'Git Dotfiles Injection',
          icon: <FolderGit2 size={14} />,
          descriptionFr: 'Clonage automatique d\'un dépôt Git de dotfiles dans le répertoire home de l\'utilisateur.',
          descriptionEn: 'Automatic clone of user dotfiles Git repository directly into home directory.',
          currentValue: recipe.dotfilesGitUrl ? 'Dépôt Git configuré' : 'Aucun',
        },
        {
          id: 'post_services',
          labelFr: 'Services Systemd Personnalisés',
          labelEn: 'Custom Systemd Services',
          icon: <Layers size={14} />,
          badge: recipe.customServices.length > 0 ? `${recipe.customServices.length}` : undefined,
          descriptionFr: 'Création et activation de démons et services systemd ou OpenRC sur-mesure.',
          descriptionEn: 'Creation and activation of custom systemd units or OpenRC services.',
          currentValue: `${recipe.customServices.length} service(s)`,
        },
      ],
    },
    {
      id: 'cat_export',
      sectionId: 'export_inspector',
      titleFr: 'Code, Recette & Manifestes',
      titleEn: 'Code, Recipe & Manifests',
      icon: <Terminal size={17} color="#14b8a6" />,
      color: '#14b8a6',
      badge: 'Code & Manifestes',
      descriptionFr: 'Inspecteur complet des scripts générés (Bash debootstrap/pacstrap, Cloud-Init, Packer, QEMU).',
      descriptionEn: 'Complete multi-manifest inspector (debootstrap/pacstrap Bash, Cloud-Init, Packer, QEMU).',
      items: [
        {
          id: 'export_inspector',
          labelFr: 'Inspecteur Multi-Manifestes',
          labelEn: 'Multi-Manifest Inspector',
          icon: <FileCode size={14} />,
          descriptionFr: 'Visualisez, copiez et téléchargez les manifestes de construction réels.',
          descriptionEn: 'View, copy, and download the actual build manifests and bash scripts.',
          currentValue: 'Scripts & Manifestes',
        },
      ],
    },
  ], [recipe]);

  // Liste ordonnée de toutes les sous-sections pour la navigation Précédent / Suivant
  const allSectionsList = useMemo(() => {
    return categories.flatMap(c => c.items.map(i => i.id));
  }, [categories]);

  const currentIndex = allSectionsList.indexOf(activeSection);
  const prevSection = currentIndex > 0 ? allSectionsList[currentIndex - 1] : null;
  const nextSection = currentIndex < allSectionsList.length - 1 ? allSectionsList[currentIndex + 1] : null;

  // Filtrage selon la recherche
  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) return categories;
    const query = searchQuery.toLowerCase();
    return categories.map(cat => ({
      ...cat,
      items: cat.items.filter(item => 
        (lang === 'fr' ? item.labelFr : item.labelEn).toLowerCase().includes(query) ||
        (cat.titleFr.toLowerCase().includes(query) || cat.titleEn.toLowerCase().includes(query))
      )
    })).filter(cat => cat.items.length > 0 || cat.titleFr.toLowerCase().includes(query) || cat.titleEn.toLowerCase().includes(query));
  }, [categories, searchQuery, lang]);

  return (
    <div style={{
      display: 'flex',
      height: 'calc(100vh - 48px)',
      background: '#090d16',
      color: 'var(--text-main)',
      overflow: 'hidden',
      position: 'relative',
    }}>
      
      {/* ========================================================================= */}
      {/* 1. SIDEBAR NAVIGATION HIÉRARCHIQUE (MASTER)                              */}
      {/* ========================================================================= */}
      <aside style={{
        width: isSidebarCollapsed ? '60px' : '285px',
        minWidth: isSidebarCollapsed ? '60px' : '285px',
        borderRight: '1px solid rgba(255, 255, 255, 0.07)',
        background: '#0d131f',
        display: 'flex',
        flexDirection: 'column',
        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        zIndex: 20,
      }}>
        {/* En-tête Sidebar */}
        <div style={{
          padding: '10px 14px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.07)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '8px',
        }}>
          {!isSidebarCollapsed && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: accentColor,
                boxShadow: `0 0 8px ${accentColor}`,
              }} />
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{
                  fontSize: '0.82rem',
                  fontWeight: 800,
                  letterSpacing: '0.5px',
                  textTransform: 'uppercase',
                  color: 'var(--text-main)',
                  lineHeight: 1.1,
                }}>
                  {lang === 'fr' ? 'Studio Expert' : 'Expert Studio'}
                </span>
                <span style={{ fontSize: '0.64rem', color: 'var(--text-muted)' }}>
                  {lang === 'fr' ? '8 Sections • 27 Modules' : '8 Sections • 27 Modules'}
                </span>
              </div>
            </div>
          )}
          <button
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            title={isSidebarCollapsed ? (lang === 'fr' ? 'Déplier le menu' : 'Expand menu') : (lang === 'fr' ? 'Replier le menu' : 'Collapse menu')}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: '5px',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {isSidebarCollapsed ? <ChevronRight size={18} /> : <Sliders size={16} />}
          </button>
        </div>

        {/* Barre de Recherche Rapide dans les Options */}
        {!isSidebarCollapsed && (
          <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--border-subtle)' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              background: 'rgba(26, 32, 44, 0.6)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '6px',
              padding: '5px 8px',
              gap: '6px',
            }}>
              <Search size={14} color="var(--text-muted)" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder={lang === 'fr' ? 'Filtrer sections & modules...' : 'Filter sections & modules...'}
                style={{
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  color: 'var(--text-main)',
                  fontSize: '0.75rem',
                  width: '100%',
                }}
              />
            </div>
          </div>
        )}

        {/* Arborescence des Menus : Chaque Section et Chaque Sous-Section a sa place */}
        <nav style={{
          flex: 1,
          overflowY: 'auto',
          padding: '8px 6px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
        }}>
          {filteredCategories.map((cat, catIdx) => {
            const isSectionActive = activeSection === cat.sectionId;
            const hasActiveChild = cat.items.some(item => item.id === activeSection);
            const isHighlighted = isSectionActive || hasActiveChild;
            const isExpanded = !collapsedCategories[cat.id];

            return (
              <div
                key={cat.id}
                style={{
                  borderRadius: '8px',
                  background: isHighlighted ? 'rgba(255, 255, 255, 0.02)' : 'transparent',
                  border: isHighlighted ? '1px solid rgba(255, 255, 255, 0.05)' : '1px solid transparent',
                  padding: '3px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '2px',
                }}
              >
                {/* 1. Entrée Principale de la SECTION (Cliquable pour ouvrir la vue d'ensemble de la section) */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  borderRadius: '6px',
                  background: isSectionActive 
                    ? `linear-gradient(90deg, ${cat.color}25 0%, transparent 100%)` 
                    : isHighlighted 
                      ? 'rgba(255, 255, 255, 0.04)' 
                      : 'transparent',
                  borderLeft: isSectionActive ? `3px solid ${cat.color}` : '3px solid transparent',
                  transition: 'all 0.15s ease',
                }}>
                  <button
                    onClick={() => {
                      if (cat.items.length === 1) {
                        setActiveSection(cat.items[0].id);
                      } else {
                        setActiveSection(cat.sectionId);
                      }
                    }}
                    title={lang === 'fr' ? `Section ${catIdx + 1} : ${cat.titleFr}` : `Section ${catIdx + 1}: ${cat.titleEn}`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: isSidebarCollapsed ? '8px 0' : '7px 8px',
                      background: 'transparent',
                      border: 'none',
                      color: isSectionActive ? '#ffffff' : isHighlighted ? 'var(--text-main)' : 'var(--text-muted)',
                      fontWeight: isSectionActive || isHighlighted ? 700 : 600,
                      cursor: 'pointer',
                      fontSize: '0.78rem',
                      textAlign: 'left',
                      flex: 1,
                      overflow: 'hidden',
                    }}
                  >
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '24px',
                      height: '24px',
                      borderRadius: '5px',
                      background: `${cat.color}18`,
                      flexShrink: 0,
                    }}>
                      {cat.icon}
                    </div>
                    {!isSidebarCollapsed && (
                      <span style={{ whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                        {catIdx + 1}. {lang === 'fr' ? cat.titleFr : cat.titleEn}
                      </span>
                    )}
                  </button>

                  {!isSidebarCollapsed && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '3px', paddingRight: '4px' }}>
                      {cat.badge && (
                        <span style={{
                          fontSize: '0.62rem',
                          padding: '1px 5px',
                          borderRadius: '4px',
                          background: `${cat.color}20`,
                          color: cat.color,
                          fontWeight: 700,
                        }}>
                          {cat.badge}
                        </span>
                      )}
                      {cat.items.length > 1 && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleCategory(cat.id);
                          }}
                          title={isExpanded ? (lang === 'fr' ? 'Replier les sous-sections' : 'Collapse sub-sections') : (lang === 'fr' ? 'Déplier les sous-sections' : 'Expand sub-sections')}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: 'var(--text-muted)',
                            cursor: 'pointer',
                            padding: '3px',
                            borderRadius: '4px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* 2. Liste Arborescente des SOUS-SECTIONS (Chaque sous-section a sa propre place dédiée) */}
                {!isSidebarCollapsed && isExpanded && cat.items.length > 1 && (
                  <div style={{
                    marginLeft: '14px',
                    paddingLeft: '10px',
                    borderLeft: `1px solid rgba(255, 255, 255, 0.08)`,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '2px',
                    marginTop: '2px',
                    marginBottom: '4px',
                  }}>
                    {cat.items.map(item => {
                      const isItemActive = activeSection === item.id;
                      return (
                        <button
                          key={item.id}
                          onClick={() => setActiveSection(item.id)}
                          title={lang === 'fr' ? item.labelFr : item.labelEn}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '6px 8px',
                            borderRadius: '5px',
                            background: isItemActive ? `linear-gradient(90deg, rgba(2, 132, 199, 0.2) 0%, transparent 100%)` : 'transparent',
                            borderLeft: isItemActive ? `2px solid ${accentColor}` : '2px solid transparent',
                            borderTop: 'none',
                            borderRight: 'none',
                            borderBottom: 'none',
                            color: isItemActive ? '#ffffff' : 'var(--text-muted)',
                            fontWeight: isItemActive ? 600 : 500,
                            cursor: 'pointer',
                            fontSize: '0.74rem',
                            textAlign: 'left',
                            transition: 'all 0.12s ease',
                            gap: '6px',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden' }}>
                            <span style={{ color: isItemActive ? accentColor : 'var(--text-muted)', display: 'flex', alignItems: 'center' }}>
                              {item.icon}
                            </span>
                            <span style={{ whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                              {lang === 'fr' ? item.labelFr : item.labelEn}
                            </span>
                          </div>

                          {item.badge && (
                            <span style={{
                              fontSize: '0.6rem',
                              padding: '1px 4px',
                              borderRadius: '3px',
                              background: isItemActive ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.06)',
                              color: isItemActive ? '#ffffff' : 'var(--text-muted)',
                              fontWeight: 600,
                            }}>
                              {item.badge}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* Pied de Sidebar avec Actions Rapides */}
        <div style={{
          padding: '10px 12px',
          borderTop: '1px solid rgba(255, 255, 255, 0.07)',
          background: 'rgba(0, 0, 0, 0.2)',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
        }}>
          {!isSidebarCollapsed ? (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                {onOpenPresets && (
                  <button
                    onClick={onOpenPresets}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '5px',
                      padding: '6px',
                      borderRadius: '6px',
                      border: '1px solid rgba(2, 132, 199, 0.3)',
                      background: 'rgba(2, 132, 199, 0.08)',
                      color: 'var(--cyan)',
                      fontSize: '0.7rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    <Layers size={13} />
                    <span>{lang === 'fr' ? 'Presets' : 'Presets'}</span>
                  </button>
                )}
                {onOpenAI && (
                  <button
                    onClick={onOpenAI}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '5px',
                      padding: '6px',
                      borderRadius: '6px',
                      border: '1px solid rgba(168, 85, 247, 0.3)',
                      background: 'rgba(168, 85, 247, 0.08)',
                      color: '#c084fc',
                      fontSize: '0.7rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    <Sparkles size={13} />
                    <span>{lang === 'fr' ? 'IA Copilot' : 'AI Copilot'}</span>
                  </button>
                )}
              </div>

              {onOpenAudit && (
                <button
                  onClick={onOpenAudit}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    width: '100%',
                    padding: '6px',
                    borderRadius: '6px',
                    border: '1px solid rgba(16, 185, 129, 0.3)',
                    background: 'rgba(16, 185, 129, 0.08)',
                    color: '#10b981',
                    fontSize: '0.72rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  <Zap size={13} />
                  <span>{lang === 'fr' ? 'Sonde Matérielle PC' : 'Hardware PC Audit'}</span>
                </button>
              )}
              {onOpenTips && (
                <button
                  onClick={onOpenTips}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    width: '100%',
                    padding: '6px',
                    borderRadius: '6px',
                    border: '1px solid var(--border-subtle)',
                    background: 'rgba(255, 255, 255, 0.03)',
                    color: 'var(--text-muted)',
                    fontSize: '0.72rem',
                    cursor: 'pointer',
                  }}
                >
                  <span>💡 {lang === 'fr' ? 'Guides & Astuces' : 'Tips & Docs'}</span>
                </button>
              )}
            </>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'center' }}>
              {onOpenPresets && (
                <button
                  onClick={onOpenPresets}
                  title={lang === 'fr' ? 'Modèles Prédéfinis' : 'Presets'}
                  style={{ background: 'transparent', border: 'none', color: 'var(--cyan)', cursor: 'pointer', padding: '4px' }}
                >
                  <Layers size={17} />
                </button>
              )}
              {onOpenAudit && (
                <button
                  onClick={onOpenAudit}
                  title={lang === 'fr' ? 'Sonde Matérielle' : 'Hardware Audit'}
                  style={{ background: 'transparent', border: 'none', color: '#10b981', cursor: 'pointer', padding: '4px' }}
                >
                  <Zap size={17} />
                </button>
              )}
            </div>
          )}
        </div>
      </aside>

      {/* ========================================================================= */}
      {/* 2. ZONE CENTRALE : PANNEAU UNIQUE CIBLÉ (WORKBENCH)                       */}
      {/* ========================================================================= */}
      <main style={{
        flex: 1,
        height: '100%',
        overflowY: 'auto',
        background: '#0a0d16',
        padding: '24px 32px 80px 32px',
        display: 'flex',
        flexDirection: 'column',
      }}>
        <div style={{ maxWidth: '1080px', width: '100%', margin: '0 auto' }}>
          
          {/* Fil d'Ariane & Titre de Section */}
          <div style={{
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
            borderBottom: '1px solid var(--border-subtle)',
            paddingBottom: '14px',
          }}>
            <div>
              <div style={{ fontSize: '0.72rem', color: 'var(--cyan)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px' }}>
                {activeSection.startsWith('sec_') ? (lang === 'fr' ? 'Vue d\'Ensemble de Section' : 'Section Overview Hub') : (lang === 'fr' ? 'Configuration Ciblée' : 'Focused Section')}
              </div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)', margin: '4px 0 0 0' }}>
                {/* Vues d'Ensemble des Sections Principales */}
                {activeSection === 'sec_base' && (lang === 'fr' ? 'Base Système & Cible — Hub d\'Architecture' : 'System Base & Target — Architecture Hub')}
                {activeSection === 'sec_ui' && (lang === 'fr' ? 'Bureau & Interface Graphique — Hub Visuel' : 'Desktop & Graphical Interface — Visual Hub')}
                {activeSection === 'sec_brand' && (lang === 'fr' ? 'Design System, Thème & Branding — Hub Cosmétique' : 'Design System, Theme & Branding — Aesthetic Hub')}
                {activeSection === 'sec_sys' && (lang === 'fr' ? 'Système, Matériel & Gaming — Hub Machine' : 'System, Hardware & Gaming — Machine Hub')}
                {activeSection === 'sec_security' && (lang === 'fr' ? 'Sécurité, Durcissement & Pare-feu — Hub Défense' : 'Security, Hardening & Firewall — Defense Hub')}
                {activeSection === 'sec_post' && (lang === 'fr' ? 'Post-Installation & Automatisation — Hub Déploiement' : 'Post-Installation & Automation — Deployment Hub')}

                {/* 1. Base Système */}
                {activeSection === 'base_distro' && (lang === 'fr' ? 'Distribution Linux & Canal de Version' : 'Linux Distribution & Release Channel')}
                {activeSection === 'base_kernel' && (lang === 'fr' ? 'Noyau Linux & Optimisations (BORE, Liquorix, Zen, Hardened)' : 'Linux Kernel Tuning (BORE, Liquorix, Zen, Hardened)')}
                {activeSection === 'base_output' && (lang === 'fr' ? 'Architecture Processeur & Formats d\'Image (ISO, Disques, WSL2, Docker, SD)' : 'CPU Architecture & Target Image Formats')}
                
                {/* 2. Bureau & Interface */}
                {activeSection === 'ui_desktop' && (lang === 'fr' ? 'Environnement de Bureau & Gestionnaire de Fenêtres' : 'Desktop Environment & Window Manager')}
                {activeSection === 'ui_display_manager' && (lang === 'fr' ? 'Gestionnaire de Session & Authentification (Display Manager)' : 'Display Manager & Session Login Greeter')}
                {activeSection === 'ui_default_apps' && (lang === 'fr' ? 'Applications & Outils d\'Administration Système' : 'Applications & System Administration Suite')}
                {activeSection === 'ui_simulators' && (lang === 'fr' ? 'Simulateurs Interactifs (Bureau Live & Séquence Plymouth)' : 'Interactive Simulators (Live Desktop & Plymouth Boot)')}

                {/* 3. Design System & Branding */}
                {activeSection === 'brand_theme' && (lang === 'fr' ? 'Couleur d\'Accentuation & Fonds d\'Écran Vectoriels HD' : 'Accent Color & Vector HD Wallpapers')}
                {activeSection === 'brand_appearance' && (lang === 'fr' ? 'Packs d\'Icônes, Curseurs Souris & Polices Typographiques' : 'Icon Themes, Mouse Cursors & Fonts')}
                {activeSection === 'brand_terminal_plymouth' && (lang === 'fr' ? 'Schéma Couleurs Terminal, Boutons & Thème Plymouth' : 'Terminal Colors, Window Controls & Plymouth Theme')}
                {activeSection === 'brand_identity' && (lang === 'fr' ? 'Identité Système, Fastfetch MOTD, Thème GRUB 2 & Aliases' : 'System Identity, Fastfetch, GRUB 2 & Shell Aliases')}

                {/* 4. Logiciels & Dépôts */}
                {activeSection === 'pkgs_catalog' && (lang === 'fr' ? 'Catalogue Logiciel, Dépôts Tiers & Mode Hors-Ligne' : 'Software Catalog, Third-Party Repos & Air-Gapped Mode')}

                {/* 5. Système & Matériel */}
                {activeSection === 'sys_identity' && (lang === 'fr' ? 'Identité du Système, Nom d\'Hôte & Édition' : 'System Identity, Hostname & Edition')}
                {activeSection === 'sys_user' && (lang === 'fr' ? 'Compte Utilisateur Principal, Privilèges Sudo & Dotfiles' : 'Primary User Account, Sudo & Dotfiles')}
                {activeSection === 'sys_ssh' && (lang === 'fr' ? 'Accès Distant OpenSSH, Clés Publiques & Import GitHub' : 'OpenSSH Remote Access & Public Keys')}
                {activeSection === 'sys_network' && (lang === 'fr' ? 'Pré-configuration Réseau Headless, Wi-Fi, WireGuard & Tailscale' : 'Headless Network, Wi-Fi, WireGuard & Tailscale')}
                {activeSection === 'sys_locale_power' && (lang === 'fr' ? 'Disposition Clavier, Fuseau Horaire & Profils Énergie' : 'Keyboard Layout, Timezone & Energy Profiles')}
                {activeSection === 'sys_storage' && (lang === 'fr' ? 'Partitionnement Disque, Btrfs, Mode Immuable & Bootloader' : 'Disk Partitioning, Btrfs, Immutable Mode & Bootloader')}
                {activeSection === 'sys_gaming' && (lang === 'fr' ? 'Moteur Gaming ROG, Latence PipeWire & Console Steam Gamescope' : 'Gaming Optimizations, ROG Hardware & Steam Console')}

                {/* 6. Sécurité & Durcissement */}
                {activeSection === 'sec_benchmark' && (lang === 'fr' ? 'Profils de Conformité & Durcissement CIS Benchmark' : 'CIS Benchmark Compliance & Hardening Profiles')}
                {activeSection === 'sec_firewall' && (lang === 'fr' ? 'Pare-feu Réseau (UFW/Firewalld/NFTables) & Whitelist Ports' : 'Network Firewall & Allowed Ports Whitelist')}
                {activeSection === 'sec_luks' && (lang === 'fr' ? 'Chiffrement Intégral LUKS2 & Déverrouillage Matériel (TPM2/FIDO2)' : 'LUKS2 Full Disk Encryption & Hardware Unlock')}
                {activeSection === 'sec_hardening' && (lang === 'fr' ? 'Options de Durcissement Avancées & Cyber-Défense Active' : 'Advanced Hardening Options & Cyber-Defense')}

                {/* 7. Post-Install & Automatisation */}
                {activeSection === 'post_firstboot' && (lang === 'fr' ? 'Script Bash Root au Premier Démarrage (/root/firstboot.sh)' : 'First-Boot Root Bash Script Hook')}
                {activeSection === 'post_dotfiles' && (lang === 'fr' ? 'Clonage & Déploiement Automatique de Dotfiles Git' : 'Automatic Git Dotfiles Deployment')}
                {activeSection === 'post_services' && (lang === 'fr' ? 'Créateur de Démons & Services Systemd Dédiés (*.service)' : 'Custom Systemd Units & Services Generator')}

                {/* 8. Code & Manifestes */}
                {activeSection === 'export_inspector' && (lang === 'fr' ? 'Inspecteur Multi-Manifestes (Bash, Cloud-Init, Calamares, VM)' : 'Multi-Manifest Inspector (Bash, Cloud-Init, Calamares, VM)')}
              </h2>
            </div>

            {/* Actions Contextuelles */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {(activeSection === 'base_distro' || activeSection === 'base_kernel' || activeSection === 'base_output') && onOpenOfficialReleases && (
                <button
                  onClick={() => onOpenOfficialReleases(recipe.distro as DistroId)}
                  className="btn btn-secondary"
                  style={{
                    fontSize: '0.75rem',
                    padding: '6px 10px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    color: '#34d399',
                    borderColor: 'rgba(16, 185, 129, 0.35)',
                    background: 'rgba(16, 185, 129, 0.08)',
                  }}
                  title={lang === 'fr' ? 'Télécharger les ISOs officielles sans modif' : 'Download official vanilla ISOs'}
                >
                  <Download size={14} />
                  <span>{lang === 'fr' ? 'ISO Officielle (Sans modif)' : 'Vanilla ISO'}</span>
                </button>
              )}

              {onOpenScreenshots && (
                <button
                  onClick={() => onOpenScreenshots(activeSection.startsWith('base') ? 'distro' : 'desktop')}
                  className="btn btn-secondary"
                  style={{ fontSize: '0.75rem', padding: '6px 10px', display: 'flex', alignItems: 'center', gap: '5px' }}
                >
                  <Eye size={14} />
                  <span>{lang === 'fr' ? 'Captures d\'écran' : 'Screenshots'}</span>
                </button>
              )}
            </div>
          </div>

          {/* Contenu Découpé par Section & Sous-Section (Chaque section et sous-section a sa propre page dédiée 1-à-1) */}
          <div style={{ minHeight: '400px' }}>
            {/* Vues d'Ensemble des Sections Principales (Hubs Dédiés) */}
            {activeSection === 'sec_base' && (
              <SectionOverviewView
                category={categories[0]}
                recipe={recipe}
                lang={lang}
                accentColor={accentColor}
                onNavigate={setActiveSection}
              />
            )}
            {activeSection === 'sec_ui' && (
              <SectionOverviewView
                category={categories[1]}
                recipe={recipe}
                lang={lang}
                accentColor={accentColor}
                onNavigate={setActiveSection}
              />
            )}
            {activeSection === 'sec_brand' && (
              <SectionOverviewView
                category={categories[2]}
                recipe={recipe}
                lang={lang}
                accentColor={accentColor}
                onNavigate={setActiveSection}
              />
            )}
            {activeSection === 'sec_sys' && (
              <SectionOverviewView
                category={categories[4]}
                recipe={recipe}
                lang={lang}
                accentColor={accentColor}
                onNavigate={setActiveSection}
              />
            )}
            {activeSection === 'sec_security' && (
              <SectionOverviewView
                category={categories[5]}
                recipe={recipe}
                lang={lang}
                accentColor={accentColor}
                onNavigate={setActiveSection}
              />
            )}
            {activeSection === 'sec_post' && (
              <SectionOverviewView
                category={categories[6]}
                recipe={recipe}
                lang={lang}
                accentColor={accentColor}
                onNavigate={setActiveSection}
              />
            )}

            {/* 1. Base Système & Cible */}
            {activeSection === 'base_distro' && (
              <DistroSelector
                recipe={recipe}
                onChange={onChange}
                lang={lang}
                onOpenTips={onOpenTips}
                onOpenScreenshots={onOpenScreenshots}
                onOpenOfficialReleases={onOpenOfficialReleases}
                subSection="distro"
              />
            )}
            {activeSection === 'base_kernel' && (
              <DistroSelector
                recipe={recipe}
                onChange={onChange}
                lang={lang}
                onOpenTips={onOpenTips}
                onOpenScreenshots={onOpenScreenshots}
                onOpenOfficialReleases={onOpenOfficialReleases}
                subSection="kernel"
              />
            )}
            {activeSection === 'base_output' && (
              <DistroSelector
                recipe={recipe}
                onChange={onChange}
                lang={lang}
                onOpenTips={onOpenTips}
                onOpenScreenshots={onOpenScreenshots}
                onOpenOfficialReleases={onOpenOfficialReleases}
                subSection="output"
              />
            )}

            {/* 2. Bureau & Interface */}
            {activeSection === 'ui_desktop' && (
              <DesktopSelector
                recipe={recipe}
                onChange={onChange}
                lang={lang}
                onOpenTips={onOpenTips}
                onOpenScreenshots={onOpenScreenshots}
                subSection="desktop"
              />
            )}
            {activeSection === 'ui_display_manager' && (
              <SessionManagerView
                recipe={recipe}
                onChange={onChange}
                lang={lang}
                onOpenTips={onOpenTips}
              />
            )}
            {activeSection === 'ui_default_apps' && (
              <DesktopSelector
                recipe={recipe}
                onChange={onChange}
                lang={lang}
                onOpenTips={onOpenTips}
                onOpenScreenshots={onOpenScreenshots}
                subSection="default_apps"
              />
            )}
            {activeSection === 'ui_simulators' && (
              <SimulatorsView
                recipe={recipe}
                onChange={onChange}
                lang={lang}
                onOpenTips={onOpenTips}
              />
            )}

            {/* 3. Design System & Branding */}
            {activeSection === 'brand_theme' && (
              <BrandingDesignView
                recipe={recipe}
                onChange={onChange}
                lang={lang}
                onOpenTips={onOpenTips}
                subSection="theme"
              />
            )}
            {activeSection === 'brand_appearance' && (
              <BrandingDesignView
                recipe={recipe}
                onChange={onChange}
                lang={lang}
                onOpenTips={onOpenTips}
                subSection="appearance"
              />
            )}
            {activeSection === 'brand_terminal_plymouth' && (
              <BrandingDesignView
                recipe={recipe}
                onChange={onChange}
                lang={lang}
                onOpenTips={onOpenTips}
                subSection="terminal_plymouth"
              />
            )}
            {activeSection === 'brand_identity' && (
              <BrandingDesignView
                recipe={recipe}
                onChange={onChange}
                lang={lang}
                onOpenTips={onOpenTips}
                subSection="identity"
              />
            )}

            {/* 4. Logiciels & Dépôts */}
            {activeSection === 'pkgs_catalog' && (
              <PackageCatalog
                recipe={recipe}
                onChange={onChange}
                lang={lang}
                onOpenTips={onOpenTips}
              />
            )}

            {/* 5. Système & Matériel */}
            {activeSection === 'sys_identity' && (
              <SystemConfig
                recipe={recipe}
                onChange={onChange}
                lang={lang}
                onOpenTips={onOpenTips}
                subSection="identity"
              />
            )}
            {activeSection === 'sys_user' && (
              <SystemConfig
                recipe={recipe}
                onChange={onChange}
                lang={lang}
                onOpenTips={onOpenTips}
                subSection="user"
              />
            )}
            {activeSection === 'sys_ssh' && (
              <SystemConfig
                recipe={recipe}
                onChange={onChange}
                lang={lang}
                onOpenTips={onOpenTips}
                subSection="ssh"
              />
            )}
            {activeSection === 'sys_network' && (
              <SystemConfig
                recipe={recipe}
                onChange={onChange}
                lang={lang}
                onOpenTips={onOpenTips}
                subSection="network"
              />
            )}
            {activeSection === 'sys_locale_power' && (
              <SystemConfig
                recipe={recipe}
                onChange={onChange}
                lang={lang}
                onOpenTips={onOpenTips}
                subSection="locale_power"
              />
            )}
            {activeSection === 'sys_storage' && (
              <SystemConfig
                recipe={recipe}
                onChange={onChange}
                lang={lang}
                onOpenTips={onOpenTips}
                subSection="storage"
              />
            )}
            {activeSection === 'sys_gaming' && (
              <GamingConfigView
                recipe={recipe}
                onChange={onChange}
                lang={lang}
                onOpenTips={onOpenTips}
              />
            )}

            {/* 6. Sécurité & Durcissement */}
            {activeSection === 'sec_benchmark' && (
              <SecurityConfig
                recipe={recipe}
                onChange={onChange}
                lang={lang}
                onOpenTips={onOpenTips}
                subSection="benchmark"
              />
            )}
            {activeSection === 'sec_firewall' && (
              <SecurityConfig
                recipe={recipe}
                onChange={onChange}
                lang={lang}
                onOpenTips={onOpenTips}
                subSection="firewall"
              />
            )}
            {activeSection === 'sec_luks' && (
              <SecurityConfig
                recipe={recipe}
                onChange={onChange}
                lang={lang}
                onOpenTips={onOpenTips}
                subSection="luks"
              />
            )}
            {activeSection === 'sec_hardening' && (
              <SecurityConfig
                recipe={recipe}
                onChange={onChange}
                lang={lang}
                onOpenTips={onOpenTips}
                subSection="hardening"
              />
            )}

            {/* 7. Post-Install & Automatisation */}
            {activeSection === 'post_firstboot' && (
              <PostInstallScripts
                recipe={recipe}
                onChange={onChange}
                lang={lang}
                onOpenTips={onOpenTips}
                subSection="firstboot"
              />
            )}
            {activeSection === 'post_dotfiles' && (
              <PostInstallScripts
                recipe={recipe}
                onChange={onChange}
                lang={lang}
                onOpenTips={onOpenTips}
                subSection="dotfiles"
              />
            )}
            {activeSection === 'post_services' && (
              <PostInstallScripts
                recipe={recipe}
                onChange={onChange}
                lang={lang}
                onOpenTips={onOpenTips}
                subSection="services"
              />
            )}

            {/* 8. Code, Recette & Manifestes */}
            {activeSection === 'export_inspector' && (
              <RecipeInspector
                recipe={recipe}
                lang={lang}
                onOpenTips={onOpenTips}
              />
            )}
          </div>

          {/* Navigation Précédent / Suivant en bas de chaque section */}
          <div style={{
            marginTop: '40px',
            paddingTop: '20px',
            borderTop: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
          }}>
            {prevSection ? (
              <button
                onClick={() => setActiveSection(prevSection)}
                className="btn btn-secondary"
                style={{ fontSize: '0.8rem', padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <ArrowLeft size={15} />
                <span>{lang === 'fr' ? 'Section Précédente' : 'Previous Section'}</span>
              </button>
            ) : <div />}

            {nextSection ? (
              <button
                onClick={() => setActiveSection(nextSection)}
                className="btn btn-primary"
                style={{ fontSize: '0.8rem', padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <span>{lang === 'fr' ? 'Section Suivante' : 'Next Section'}</span>
                <ArrowRight size={15} />
              </button>
            ) : (
              <button
                onClick={onStartBuild}
                className="btn btn-primary"
                style={{
                  fontSize: '0.82rem',
                  padding: '10px 20px',
                  background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                  boxShadow: '0 2px 10px rgba(2, 132, 199, 0.4)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontWeight: 700,
                }}
              >
                <Flame size={16} />
                <span>{lang === 'fr' ? '🚀 Lancer la Compilation (Build)' : '🚀 Start Compilation (Build)'}</span>
              </button>
            )}
          </div>

        </div>
      </main>

      {/* ========================================================================= */}
      {/* 3. VOLET DROIT : HEADS-UP DISPLAY (HUD) EN TEMPS RÉEL                     */}
      {/* ========================================================================= */}
      <aside style={{
        width: isHudCollapsed ? '44px' : '310px',
        minWidth: isHudCollapsed ? '44px' : '310px',
        borderLeft: '1px solid rgba(255, 255, 255, 0.07)',
        background: '#0d131f',
        display: 'flex',
        flexDirection: 'column',
        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        zIndex: 20,
        overflowY: 'auto',
      }}>
        {/* Toggle HUD */}
        <div style={{
          padding: '10px 14px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.07)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: isHudCollapsed ? 'center' : 'space-between',
        }}>
          {!isHudCollapsed && (
            <span style={{ fontSize: '0.78rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--text-muted)' }}>
              {lang === 'fr' ? 'Synthèse Live' : 'Live HUD'}
            </span>
          )}
          <button
            onClick={() => setIsHudCollapsed(!isHudCollapsed)}
            title={isHudCollapsed ? (lang === 'fr' ? 'Déplier le volet HUD' : 'Expand HUD') : (lang === 'fr' ? 'Replier le volet HUD' : 'Collapse HUD')}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {isHudCollapsed ? <PanelRightOpen size={17} /> : <PanelRightClose size={17} />}
          </button>
        </div>

        {!isHudCollapsed && (
          <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            
            {/* Carte Identité OS */}
            <div style={{
              borderRadius: '8px',
              border: `1px solid ${accentColor}44`,
              background: 'rgba(18, 24, 38, 0.8)',
              padding: '12px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#ffffff' }}>
                  {recipe.branding.osName || 'ForgeOS'}
                </span>
                <span style={{
                  fontSize: '0.65rem',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  background: `${accentColor}33`,
                  color: accentColor,
                  fontWeight: 700,
                }}>
                  {recipe.branding.editionName || 'Pro'}
                </span>
              </div>
              <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                {recipe.distro.toUpperCase()} • {recipe.desktop} • {recipe.arch}
              </div>
            </div>

            {/* Vignette Rendu Bureau (Miniature Temps Réel) */}
            <div style={{
              borderRadius: '8px',
              border: '1px solid var(--border-subtle)',
              background: '#090d16',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
            }}>
              <div style={{
                height: '110px',
                background: `linear-gradient(135deg, ${accentColor}44 0%, #090d16 100%)`,
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '10px',
              }}>
                {/* Simulation de fenêtre miniature */}
                <div style={{
                  width: '85%',
                  height: '75%',
                  background: 'rgba(15, 23, 42, 0.92)',
                  borderRadius: '6px',
                  border: `1px solid ${accentColor}88`,
                  boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
                  display: 'flex',
                  flexDirection: 'column',
                  padding: '6px 8px',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#ef4444' }} />
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#f59e0b' }} />
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981' }} />
                    <span style={{ fontSize: '0.55rem', color: accentColor, marginLeft: 'auto', fontWeight: 700 }}>
                      {recipe.desktop}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.58rem', color: '#94a3b8', fontFamily: 'monospace' }}>
                    $ fastfetch --os {recipe.branding.osName}
                  </div>
                  <div style={{ fontSize: '0.55rem', color: '#10b981', marginTop: 'auto' }}>
                    ✓ Kernel {recipe.kernel} ready
                  </div>
                </div>
              </div>
              <div style={{ padding: '8px 10px', fontSize: '0.68rem', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between' }}>
                <span>Preset : <strong>{recipe.branding.wallpaperPreset || 'minimal'}</strong></span>
                <span style={{ color: accentColor, fontWeight: 700 }}>{accentColor}</span>
              </div>
            </div>

            {/* Jauges Métriques Live */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <div style={{
                background: 'rgba(26, 32, 44, 0.5)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '6px',
                padding: '8px',
                display: 'flex',
                flexDirection: 'column',
              }}>
                <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{lang === 'fr' ? 'RAM Estimée' : 'Est. RAM'}</span>
                <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#38bdf8', marginTop: '2px' }}>
                  ~{estimate?.minRamMB || 450} Mo
                </span>
              </div>

              <div style={{
                background: 'rgba(26, 32, 44, 0.5)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '6px',
                padding: '8px',
                display: 'flex',
                flexDirection: 'column',
              }}>
                <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{lang === 'fr' ? 'Taille Image' : 'Est. Disk'}</span>
                <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#a855f7', marginTop: '2px' }}>
                  ~{estimate?.estimatedIsoMB ? `${(estimate.estimatedIsoMB / 1024).toFixed(1)} Go` : '1.8 Go'}
                </span>
              </div>
            </div>

            {/* Jauge Score de Sécurité */}
            <div style={{
              background: 'rgba(26, 32, 44, 0.5)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '6px',
              padding: '10px',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>{lang === 'fr' ? 'Posture Sécurité' : 'Security Posture'}</span>
                <span style={{ fontWeight: 700, color: recipe.security.firewall !== 'none' ? '#10b981' : '#f59e0b' }}>
                  {recipe.security.firewall !== 'none' ? 'Protégé (UFW/CIS)' : 'Basique'}
                </span>
              </div>
              <div style={{ width: '100%', height: '5px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', overflow: 'hidden' }}>
                <div style={{
                  width: `${recipe.security.firewall !== 'none' ? (recipe.security.cisBenchmarkLevel ? 90 : 75) : 40}%`,
                  height: '100%',
                  background: recipe.security.firewall !== 'none' ? 'linear-gradient(90deg, #10b981, #06b6d4)' : '#f59e0b',
                  borderRadius: '3px',
                }} />
              </div>
            </div>

            {/* Checklist de Recette Rapide */}
            <div style={{
              background: 'rgba(26, 32, 44, 0.4)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '6px',
              padding: '10px',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
              fontSize: '0.72rem',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#10b981' }}>
                <Check size={13} />
                <span>Format : <strong>{recipe.outputFormat}</strong></span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#10b981' }}>
                <Check size={13} />
                <span>Noyau : <strong>{recipe.kernel}</strong></span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#10b981' }}>
                <Check size={13} />
                <span>{recipe.selectedPackages.length + (recipe.customPackages?.length || 0)} paquets configurés</span>
              </div>
            </div>

            {/* Bouton de Build Permanent */}
            <button
              onClick={onStartBuild}
              style={{
                marginTop: 'auto',
                width: '100%',
                padding: '13px',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                color: '#ffffff',
                fontWeight: 800,
                fontSize: '0.85rem',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: '0 4px 14px rgba(2, 132, 199, 0.4)',
                transition: 'all 0.15s ease',
              }}
            >
              <Flame size={18} />
              <span>{lang === 'fr' ? '🚀 Compiler l\'Image' : '🚀 Compile OS Image'}</span>
            </button>

          </div>
        )}
      </aside>

    </div>
  );
};
