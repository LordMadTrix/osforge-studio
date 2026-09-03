import React, { useState, useMemo } from 'react';
import { 
  Server, Monitor, Palette, Package, Cpu, Shield, FileCode, Search, 
  ChevronRight, Sliders, Terminal, Zap, Eye, Flame, Check, ArrowRight, ArrowLeft, 
  PanelRightClose, PanelRightOpen, Sparkles, Layers
} from 'lucide-react';
import { OSRecipe } from '../types/os';
import { DistroSelector } from './DistroSelector';
import { DesktopSelector } from './DesktopSelector';
import { PackageCatalog } from './PackageCatalog';
import { SystemConfig } from './SystemConfig';
import { SecurityConfig } from './SecurityConfig';
import { PostInstallScripts } from './PostInstallScripts';
import { RecipeInspector } from './RecipeInspector';
import { calculateResourceEstimate } from '../services/resourceEstimator';
import { sanitizeHexColor } from '../services/generators/branding';

export type StudioSectionId = 
  | 'base_distro'
  | 'ui_desktop'
  | 'ui_simulators'
  | 'brand_design'
  | 'pkgs_catalog'
  | 'sys_config'
  | 'sys_gaming'
  | 'sec_hardening'
  | 'post_scripts'
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
  initialSection = 'base_distro',
}) => {
  const [activeSection, setActiveSection] = useState<StudioSectionId>(initialSection);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isHudCollapsed, setIsHudCollapsed] = useState(false);

  // Estimation des ressources
  const estimate = useMemo(() => calculateResourceEstimate(recipe), [recipe]);
  const accentColor = sanitizeHexColor(recipe.branding.accentColor, '#0ea5e9');

  // Arborescence de navigation structurée
  const categories: NavCategory[] = useMemo(() => [
    {
      id: 'cat_base',
      titleFr: 'Base Système & Cible',
      titleEn: 'System Base & Target',
      icon: <Server size={17} color="#38bdf8" />,
      items: [
        {
          id: 'base_distro',
          labelFr: 'Distribution & Formats',
          labelEn: 'Distribution & Formats',
          badge: recipe.distro.toUpperCase(),
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
          id: 'brand_design',
          labelFr: 'Fonds d\'écran, Thème & Boot',
          labelEn: 'Wallpapers, Theme & Boot',
          badge: recipe.branding.wallpaperPreset || 'minimal',
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
          id: 'sys_config',
          labelFr: 'Identité, Réseau & Comptes',
          labelEn: 'Identity, Network & Users',
        },
        {
          id: 'sys_gaming',
          labelFr: 'Gaming, ROG & Profils',
          labelEn: 'Gaming, ROG & Profiles',
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
          id: 'sec_hardening',
          labelFr: 'Pare-feu, CIS & Chiffrement',
          labelEn: 'Firewall, CIS & Encryption',
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
          id: 'post_scripts',
          labelFr: 'Scripts First-Boot & Hooks',
          labelEn: 'First-Boot Scripts & Hooks',
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
          labelFr: 'Inspecteur Multi-Fichiers',
          labelEn: 'Multi-File Inspector',
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
      height: 'calc(100vh - 65px)',
      background: '#07090e',
      color: 'var(--text-main)',
      overflow: 'hidden',
      position: 'relative',
    }}>
      
      {/* ========================================================================= */}
      {/* 1. SIDEBAR NAVIGATION HIÉRARCHIQUE (MASTER)                              */}
      {/* ========================================================================= */}
      <aside style={{
        width: isSidebarCollapsed ? '64px' : '280px',
        minWidth: isSidebarCollapsed ? '64px' : '280px',
        borderRight: '1px solid var(--border-subtle)',
        background: 'rgba(11, 14, 22, 0.95)',
        display: 'flex',
        flexDirection: 'column',
        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        zIndex: 20,
      }}>
        {/* En-tête Sidebar */}
        <div style={{
          padding: '12px 14px',
          borderBottom: '1px solid var(--border-subtle)',
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
                {activeSection === 'base_distro' && (lang === 'fr' ? 'Distribution, Noyau & Formats d\'Image' : 'Distribution, Kernel & Output Formats')}
                {activeSection === 'ui_desktop' && (lang === 'fr' ? 'Environnement de Bureau & Gestionnaire de Session' : 'Desktop Environment & Session Manager')}
                {activeSection === 'ui_simulators' && (lang === 'fr' ? 'Simulateurs Interactifs (Bureau Live & Boot Splash)' : 'Interactive Simulators (Live Desktop & Boot Splash)')}
                {activeSection === 'brand_design' && (lang === 'fr' ? 'Design System, Fonds d\'écran & Identité' : 'Design System, Wallpapers & Branding')}
                {activeSection === 'pkgs_catalog' && (lang === 'fr' ? 'Catalogue Logiciel, Dépôts Tiers & Mode Hors-Ligne' : 'Software Catalog, Third-Party Repos & Air-Gapped Mode')}
                {activeSection === 'sys_config' && (lang === 'fr' ? 'Identité Système, Utilisateurs & Réseau Headless' : 'System Identity, Users & Headless Network')}
                {activeSection === 'sys_gaming' && (lang === 'fr' ? 'Optimisations Gaming, Matériel ROG & Console Steam' : 'Gaming Optimizations, ROG Hardware & Steam Console')}
                {activeSection === 'sec_hardening' && (lang === 'fr' ? 'Pare-feu, Durcissement CIS Benchmark & Chiffrement' : 'Firewall, CIS Hardening & Encryption')}
                {activeSection === 'post_scripts' && (lang === 'fr' ? 'Scripts Post-Installation, Hooks & IaC (Ansible/Terraform)' : 'Post-Install Scripts, Hooks & IaC')}
                {activeSection === 'export_inspector' && (lang === 'fr' ? 'Inspecteur Multi-Manifestes (Bash, Cloud-Init, Dockerfile)' : 'Multi-Manifest Inspector (Bash, Cloud-Init, Dockerfile)')}
              </h2>
            </div>

            {/* Actions Contextuelles */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {onOpenScreenshots && (
                <button
                  onClick={() => onOpenScreenshots(activeSection === 'base_distro' ? 'distro' : 'desktop')}
                  className="btn btn-secondary"
                  style={{ fontSize: '0.75rem', padding: '6px 10px', display: 'flex', alignItems: 'center', gap: '5px' }}
                >
                  <Eye size={14} />
                  <span>{lang === 'fr' ? 'Captures d\'écran' : 'Screenshots'}</span>
                </button>
              )}
            </div>
          </div>

          {/* Contenu Découpé par Sous-Section */}
          <div style={{ minHeight: '400px' }}>
            {activeSection === 'base_distro' && (
              <DistroSelector
                recipe={recipe}
                onChange={onChange}
                lang={lang}
                onOpenTips={onOpenTips}
                onOpenScreenshots={onOpenScreenshots}
              />
            )}

            {(activeSection === 'ui_desktop' || activeSection === 'ui_simulators' || activeSection === 'brand_design') && (
              <DesktopSelector
                recipe={recipe}
                onChange={onChange}
                lang={lang}
                onOpenTips={onOpenTips}
                onOpenScreenshots={onOpenScreenshots}
              />
            )}

            {activeSection === 'pkgs_catalog' && (
              <PackageCatalog
                recipe={recipe}
                onChange={onChange}
                lang={lang}
                onOpenTips={onOpenTips}
              />
            )}

            {(activeSection === 'sys_config' || activeSection === 'sys_gaming') && (
              <SystemConfig
                recipe={recipe}
                onChange={onChange}
                lang={lang}
                onOpenTips={onOpenTips}
              />
            )}

            {activeSection === 'sec_hardening' && (
              <SecurityConfig
                recipe={recipe}
                onChange={onChange}
                lang={lang}
                onOpenTips={onOpenTips}
              />
            )}

            {activeSection === 'post_scripts' && (
              <PostInstallScripts
                recipe={recipe}
                onChange={onChange}
                lang={lang}
                onOpenTips={onOpenTips}
              />
            )}

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
        borderLeft: '1px solid var(--border-subtle)',
        background: 'rgba(11, 14, 22, 0.96)',
        display: 'flex',
        flexDirection: 'column',
        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        zIndex: 20,
        overflowY: 'auto',
      }}>
        {/* Toggle HUD */}
        <div style={{
          padding: '12px 14px',
          borderBottom: '1px solid var(--border-subtle)',
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
