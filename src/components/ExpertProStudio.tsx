import React, { useState, useMemo } from 'react';
import { 
  Server, Monitor, Palette, Package, Cpu, Shield, FileCode, Search, 
  ChevronRight, Sliders, Terminal, Zap, Eye, Flame, Check, ArrowRight, ArrowLeft, 
  PanelRightClose, PanelRightOpen, Sparkles, Layers, Download
} from 'lucide-react';
import { OSRecipe, DistroId } from '../types/os';
import { DistroSelector } from './DistroSelector';
import { DesktopSelector } from './DesktopSelector';
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
  | 'base_distro'
  | 'base_kernel'
  | 'base_output'
  // Bureau & Interface
  | 'ui_desktop'
  | 'ui_display_manager'
  | 'ui_default_apps'
  | 'ui_simulators'
  // Design System & Branding
  | 'brand_theme'
  | 'brand_appearance'
  | 'brand_terminal_plymouth'
  | 'brand_identity'
  // Logiciels & Dépôts
  | 'pkgs_catalog'
  // Système & Matériel
  | 'sys_identity'
  | 'sys_user'
  | 'sys_ssh'
  | 'sys_network'
  | 'sys_locale_power'
  | 'sys_storage'
  | 'sys_gaming'
  // Sécurité & Durcissement
  | 'sec_benchmark'
  | 'sec_firewall'
  | 'sec_luks'
  | 'sec_hardening'
  // Post-Install & Automatisation
  | 'post_firstboot'
  | 'post_dotfiles'
  | 'post_services'
  // Code & Manifestes
  | 'export_inspector';

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

interface NavCategory {
  id: string;
  titleFr: string;
  titleEn: string;
  icon: React.ReactNode;
  items: {
    id: StudioSectionId;
    labelFr: string;
    labelEn: string;
    badge?: string;
  }[];
}

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

  // Estimation des ressources
  const estimate = useMemo(() => calculateResourceEstimate(recipe), [recipe]);
  const accentColor = sanitizeHexColor(recipe.branding.accentColor, '#0ea5e9');

  // Arborescence de navigation structurée et granulaire
  const categories: NavCategory[] = useMemo(() => [
    {
      id: 'cat_base',
      titleFr: 'Base Système & Cible',
      titleEn: 'System Base & Target',
      icon: <Server size={17} color="#38bdf8" />,
      items: [
        {
          id: 'base_distro',
          labelFr: 'Distribution Linux',
          labelEn: 'Linux Distribution',
          badge: recipe.distro.toUpperCase(),
        },
        {
          id: 'base_kernel',
          labelFr: 'Noyau Linux & Tunning',
          labelEn: 'Linux Kernel & Tuning',
          badge: recipe.kernel,
        },
        {
          id: 'base_output',
          labelFr: 'Architecture & Formats',
          labelEn: 'Architecture & Output',
          badge: `${recipe.arch}`,
        },
      ],
    },
    {
      id: 'cat_ui',
      titleFr: 'Bureau & Interface',
      titleEn: 'Desktop & Interface',
      icon: <Monitor size={17} color="#a855f7" />,
      items: [
        {
          id: 'ui_desktop',
          labelFr: 'Environnement de Bureau',
          labelEn: 'Desktop Environment',
          badge: recipe.desktop,
        },
        {
          id: 'ui_display_manager',
          labelFr: 'Gestionnaire de Session',
          labelEn: 'Display Manager',
          badge: recipe.displayManager,
        },
        {
          id: 'ui_default_apps',
          labelFr: 'Applications par Défaut',
          labelEn: 'Default Applications',
        },
        {
          id: 'ui_simulators',
          labelFr: 'Simulateurs Bureau & Boot',
          labelEn: 'Desktop & Boot Simulators',
        },
      ],
    },
    {
      id: 'cat_brand',
      titleFr: 'Design System & Branding',
      titleEn: 'Design System & Branding',
      icon: <Palette size={17} color="#ec4899" />,
      items: [
        {
          id: 'brand_theme',
          labelFr: 'Couleurs & Fonds d\'Écran',
          labelEn: 'Colors & Wallpapers',
          badge: recipe.branding.wallpaperPreset || 'minimal',
        },
        {
          id: 'brand_appearance',
          labelFr: 'Icônes, Curseurs & Polices',
          labelEn: 'Icons, Cursors & Fonts',
          badge: recipe.branding.iconTheme,
        },
        {
          id: 'brand_terminal_plymouth',
          labelFr: 'Terminal & Boot Plymouth',
          labelEn: 'Terminal & Boot Plymouth',
        },
        {
          id: 'brand_identity',
          labelFr: 'Identité Système & Fastfetch',
          labelEn: 'System Identity & Fastfetch',
        },
      ],
    },
    {
      id: 'cat_pkgs',
      titleFr: 'Logiciels & Dépôts',
      titleEn: 'Software & Repositories',
      icon: <Package size={17} color="#10b981" />,
      items: [
        {
          id: 'pkgs_catalog',
          labelFr: 'Catalogue des Paquets',
          labelEn: 'Package Catalog',
          badge: `${recipe.selectedPackages.length + (recipe.customPackages?.length || 0)}`,
        },
      ],
    },
    {
      id: 'cat_sys',
      titleFr: 'Système & Matériel',
      titleEn: 'System & Hardware',
      icon: <Cpu size={17} color="#f59e0b" />,
      items: [
        {
          id: 'sys_identity',
          labelFr: 'Identité & Nom d\'Hôte',
          labelEn: 'Identity & Hostname',
          badge: recipe.hostname,
        },
        {
          id: 'sys_user',
          labelFr: 'Compte Utilisateur',
          labelEn: 'User Account',
          badge: recipe.user.username,
        },
        {
          id: 'sys_ssh',
          labelFr: 'Accès Distant SSH',
          labelEn: 'Remote SSH Access',
          badge: recipe.enableSSH ? 'SSH' : undefined,
        },
        {
          id: 'sys_network',
          labelFr: 'Réseau Headless & VPN',
          labelEn: 'Headless Network & VPN',
          badge: recipe.network?.enableWifi ? 'Wi-Fi' : undefined,
        },
        {
          id: 'sys_locale_power',
          labelFr: 'Clavier, Locale & Profils',
          labelEn: 'Keyboard, Locale & Profiles',
        },
        {
          id: 'sys_storage',
          labelFr: 'Stockage & Bootloader',
          labelEn: 'Storage & Bootloader',
          badge: recipe.bootloader || 'grub2',
        },
        {
          id: 'sys_gaming',
          labelFr: 'Gaming, ROG & Latence',
          labelEn: 'Gaming, ROG & Latency',
          badge: recipe.enableGamingOptimizations ? 'ROG' : undefined,
        },
      ],
    },
    {
      id: 'cat_sec',
      titleFr: 'Sécurité & Durcissement',
      titleEn: 'Security & Hardening',
      icon: <Shield size={17} color="#ef4444" />,
      items: [
        {
          id: 'sec_benchmark',
          labelFr: 'Conformité CIS Benchmark',
          labelEn: 'CIS Benchmark Compliance',
          badge: recipe.security.cisBenchmarkLevel > 0 ? `CIS L${recipe.security.cisBenchmarkLevel}` : undefined,
        },
        {
          id: 'sec_firewall',
          labelFr: 'Pare-feu & Filtrage Ports',
          labelEn: 'Firewall & Port Filtering',
          badge: recipe.security.firewall !== 'none' ? recipe.security.firewall.toUpperCase() : undefined,
        },
        {
          id: 'sec_luks',
          labelFr: 'Chiffrement Disque LUKS2',
          labelEn: 'LUKS2 Disk Encryption',
          badge: recipe.security.luksEncryption ? 'LUKS2' : undefined,
        },
        {
          id: 'sec_hardening',
          labelFr: 'Durcissement & Défense',
          labelEn: 'Hardening & Defense',
          badge: recipe.security.enableCrowdSec ? 'CrowdSec' : undefined,
        },
      ],
    },
    {
      id: 'cat_scripts',
      titleFr: 'Post-Install & Automatisation',
      titleEn: 'Post-Install & Automation',
      icon: <FileCode size={17} color="#6366f1" />,
      items: [
        {
          id: 'post_firstboot',
          labelFr: 'Script Bash First-Boot',
          labelEn: 'First-Boot Bash Script',
        },
        {
          id: 'post_dotfiles',
          labelFr: 'Injection Git Dotfiles',
          labelEn: 'Git Dotfiles Injection',
        },
        {
          id: 'post_services',
          labelFr: 'Services Systemd Personnalisés',
          labelEn: 'Custom Systemd Services',
          badge: recipe.customServices.length > 0 ? `${recipe.customServices.length}` : undefined,
        },
      ],
    },
    {
      id: 'cat_export',
      titleFr: 'Code, Recette & Manifestes',
      titleEn: 'Code, Recipe & Manifests',
      icon: <Terminal size={17} color="#14b8a6" />,
      items: [
        {
          id: 'export_inspector',
          labelFr: 'Inspecteur Multi-Manifestes',
          labelEn: 'Multi-Manifest Inspector',
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
    })).filter(cat => cat.items.length > 0);
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
        width: isSidebarCollapsed ? '60px' : '270px',
        minWidth: isSidebarCollapsed ? '60px' : '270px',
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
              <span style={{
                fontSize: '0.82rem',
                fontWeight: 800,
                letterSpacing: '0.5px',
                textTransform: 'uppercase',
                color: 'var(--text-main)',
              }}>
                {lang === 'fr' ? 'Studio Expert' : 'Expert Studio'}
              </span>
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
                placeholder={lang === 'fr' ? 'Filtrer les menus...' : 'Filter sections...'}
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

        {/* Arborescence des Menus & Catégories */}
        <nav style={{
          flex: 1,
          overflowY: 'auto',
          padding: '8px 6px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
        }}>
          {filteredCategories.map(cat => (
            <div key={cat.id} style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              {!isSidebarCollapsed && (
                <div style={{
                  fontSize: '0.68rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.8px',
                  color: 'var(--text-muted)',
                  padding: '6px 8px 3px 8px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}>
                  {cat.icon}
                  <span>{lang === 'fr' ? cat.titleFr : cat.titleEn}</span>
                </div>
              )}

              {cat.items.map(item => {
                const isActive = activeSection === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveSection(item.id)}
                    title={lang === 'fr' ? item.labelFr : item.labelEn}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: isSidebarCollapsed ? 'center' : 'space-between',
                      padding: isSidebarCollapsed ? '10px 0' : '7px 10px',
                      borderRadius: '6px',
                      background: isActive 
                        ? `linear-gradient(90deg, rgba(2, 132, 199, 0.18) 0%, rgba(2, 132, 199, 0.05) 100%)` 
                        : 'transparent',
                      borderLeft: isActive ? `3px solid ${accentColor}` : '3px solid transparent',
                      borderTop: 'none',
                      borderRight: 'none',
                      borderBottom: 'none',
                      color: isActive ? '#ffffff' : 'var(--text-muted)',
                      fontWeight: isActive ? 700 : 500,
                      cursor: 'pointer',
                      fontSize: '0.78rem',
                      textAlign: 'left',
                      transition: 'all 0.15s ease',
                      gap: '8px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                      {isSidebarCollapsed && cat.icon}
                      {!isSidebarCollapsed && (
                        <span style={{ whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                          {lang === 'fr' ? item.labelFr : item.labelEn}
                        </span>
                      )}
                    </div>

                    {!isSidebarCollapsed && item.badge && (
                      <span style={{
                        fontSize: '0.62rem',
                        padding: '1px 5px',
                        borderRadius: '4px',
                        background: isActive ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.06)',
                        color: isActive ? '#ffffff' : 'var(--text-muted)',
                        fontWeight: 600,
                      }}>
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Pied de Sidebar avec Actions Rapides */}
        <div style={{
          padding: '10px 12px',
          borderTop: '1px solid var(--border-subtle)',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
          background: 'rgba(7, 9, 14, 0.98)',
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
                {lang === 'fr' ? 'Configuration Ciblée' : 'Focused Section'}
              </div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)', margin: '4px 0 0 0' }}>
                {/* 1. Base Système */}
                {activeSection === 'base_distro' && (lang === 'fr' ? 'Distribution Linux & Canal de Version' : 'Linux Distribution & Release Channel')}
                {activeSection === 'base_kernel' && (lang === 'fr' ? 'Noyau Linux & Optimisations (BORE, Liquorix, Zen, Hardened)' : 'Linux Kernel Tuning (BORE, Liquorix, Zen, Hardened)')}
                {activeSection === 'base_output' && (lang === 'fr' ? 'Architecture Processeur & Formats d\'Image (ISO, Disques, WSL2, Docker, SD)' : 'CPU Architecture & Target Image Formats')}
                
                {/* 2. Bureau & Interface */}
                {activeSection === 'ui_desktop' && (lang === 'fr' ? 'Environnement de Bureau & Gestionnaire de Fenêtres' : 'Desktop Environment & Window Manager')}
                {activeSection === 'ui_display_manager' && (lang === 'fr' ? 'Gestionnaire de Session & Authentification (Display Manager)' : 'Display Manager & Session Login Greeter')}
                {activeSection === 'ui_default_apps' && (lang === 'fr' ? 'Applications de Bureau par Défaut (Navigateur, Terminal, Code)' : 'Default Desktop Applications (Browser, Terminal, Code)')}
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

          {/* Contenu Découpé par Sous-Section (Chaque sous-section a sa propre page dédiée 1-à-1) */}
          <div style={{ minHeight: '400px' }}>
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
              <DesktopSelector
                recipe={recipe}
                onChange={onChange}
                lang={lang}
                onOpenTips={onOpenTips}
                onOpenScreenshots={onOpenScreenshots}
                subSection="display_manager"
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
