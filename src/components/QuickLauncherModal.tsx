import React, { useState, useEffect, useRef, useMemo } from 'react';
import { OSRecipe } from '../types/os';
import { DISTROS } from '../data/distros';
import { DESKTOPS } from '../data/desktopEnvironments';
import { SOFTWARE_PACKAGES } from '../data/packages';
import { DISTRO_PRESETS } from '../data/presets';
import { DISTRO_TIPS } from '../data/tips';
import {
  Search,
  Sparkles,
  Wand2,
  Download,
  Terminal,
  Layers,
  ShieldCheck,
  HardDrive,
  Monitor,
  Package,
  Lightbulb,
  FileCode,
  Sliders,
  X
} from 'lucide-react';

interface QuickLauncherModalProps {
  isOpen: boolean;
  onClose: () => void;
  recipe: OSRecipe;
  onUpdateRecipe: (updated: Partial<OSRecipe>) => void;
  onNavigateTab: (tab: string) => void;
  onOpenAI: () => void;
  onOpenPresets: () => void;
  onOpenBuild: () => void;
  onOpenTips: () => void;
  lang: 'fr' | 'en';
}

interface LauncherItem {
  id: string;
  category: 'action' | 'tab' | 'package' | 'distro' | 'desktop' | 'preset' | 'tip';
  title: string;
  subtitle?: string;
  badge?: string;
  badgeType?: 'cyan' | 'violet' | 'emerald' | 'amber';
  icon: any;
  action: () => void;
  keywords: string;
}

export const QuickLauncherModal: React.FC<QuickLauncherModalProps> = ({
  isOpen,
  onClose,
  recipe,
  onUpdateRecipe,
  onNavigateTab,
  onOpenAI,
  onOpenPresets,
  onOpenBuild,
  onOpenTips,
  lang,
}) => {
  const [search, setSearch] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setSearch('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const items: LauncherItem[] = useMemo(() => {
    const list: LauncherItem[] = [];

    // 1. Navigation Tabs
    const tabs = [
      { id: 'builder', name: lang === 'fr' ? 'Aller au Studio (Distro & Bureau)' : 'Go to Studio (Distro & Desktop)', icon: Layers },
      { id: 'packages', name: lang === 'fr' ? 'Aller aux Logiciels & Paquets' : 'Go to Software & Packages', icon: Package },
      { id: 'system', name: lang === 'fr' ? 'Aller à la Configuration Système & Utilisateur' : 'Go to System & User Config', icon: Sliders },
      { id: 'security', name: lang === 'fr' ? 'Aller à la Sécurité & Hardening CIS' : 'Go to Security & Hardening', icon: ShieldCheck },
      { id: 'postinstall', name: lang === 'fr' ? 'Aller aux Scripts First-Boot & Services' : 'Go to Scripts & Services', icon: Terminal },
      { id: 'inspector', name: lang === 'fr' ? 'Aller à l’Inspecteur de Code & Recette' : 'Go to Code & Recipe Inspector', icon: FileCode },
    ];

    tabs.forEach(t => {
      list.push({
        id: `tab-${t.id}`,
        category: 'tab',
        title: t.name,
        subtitle: lang === 'fr' ? 'Navigation onglet' : 'Tab Navigation',
        badge: 'Onglet',
        badgeType: 'cyan',
        icon: t.icon,
        action: () => { onNavigateTab(t.id); onClose(); },
        keywords: `${t.name} tab navigation`,
      });
    });

    // 2. Global Fast Actions
    list.push({
      id: 'action-build',
      category: 'action',
      title: lang === 'fr' ? 'Générer & Compiler l’Image ISO' : 'Build & Export ISO Image',
      subtitle: lang === 'fr' ? 'Ouvrir le centre de build (Cloud GitHub ou Local)' : 'Open build hub',
      badge: 'Action',
      badgeType: 'emerald',
      icon: Download,
      action: () => { onOpenBuild(); onClose(); },
      keywords: 'build compile export iso image telecharger generate',
    });

    list.push({
      id: 'action-ai',
      category: 'action',
      title: lang === 'fr' ? 'Architecte IA : Générer par Prompt' : 'AI Architect: Generate by Prompt',
      subtitle: lang === 'fr' ? 'Décrire l’OS en langage naturel' : 'Describe your distro in natural language',
      badge: 'IA',
      badgeType: 'violet',
      icon: Wand2,
      action: () => { onOpenAI(); onClose(); },
      keywords: 'ai ia assistant architect prompt generate intelligence artificielle',
    });

    list.push({
      id: 'action-presets',
      category: 'action',
      title: lang === 'fr' ? 'Galerie des Modèles de Distributions' : 'Preconfigured Distro Templates',
      subtitle: lang === 'fr' ? 'Charger une recette préconfigurée (Dev, Pentest, Gaming...)' : 'Browse presets',
      badge: 'Modèles',
      badgeType: 'cyan',
      icon: Sparkles,
      action: () => { onOpenPresets(); onClose(); },
      keywords: 'presets modeles templates distro recipes dev security gaming',
    });

    list.push({
      id: 'action-screenshots',
      category: 'action',
      title: lang === 'fr' ? 'Galerie des Captures d’Écran & Aperçus (Beta & Stable)' : 'Screenshot & Preview Gallery (Beta & Stable)',
      subtitle: lang === 'fr' ? 'Visualiser les maquettes des distros et bureaux' : 'View live UI mockups and terminal previews',
      badge: 'Captures',
      badgeType: 'violet',
      icon: Layers,
      action: () => {
        if (onOpenTips) onOpenTips(); // will trigger modal
        onClose();
      },
      keywords: 'screenshot capture apercu preview image beta trixie plucky cosmic cachyos photo',
    });

    list.push({
      id: 'action-tips',
      category: 'action',
      title: lang === 'fr' ? 'Guide des Astuces & Bonnes Pratiques' : 'Tips & OS Engineering Guide',
      subtitle: lang === 'fr' ? 'Consulter toutes les astuces d’optimisation' : 'View all optimization tips',
      badge: 'Astuces',
      badgeType: 'amber',
      icon: Lightbulb,
      action: () => { onOpenTips(); onClose(); },
      keywords: 'tips astuces guide best practices conseils aide optimisation',
    });

    // 3. Distributions
    DISTROS.forEach(d => {
      const isSelected = recipe.distro === d.id;
      list.push({
        id: `distro-${d.id}`,
        category: 'distro',
        title: `${lang === 'fr' ? 'Choisir la distribution' : 'Select distribution'} : ${d.name}`,
        subtitle: `${d.description.slice(0, 60)}... (${d.packageManager.toUpperCase()})`,
        badge: isSelected ? 'Actif' : d.badge,
        badgeType: isSelected ? 'emerald' : 'cyan',
        icon: HardDrive,
        action: () => {
          onUpdateRecipe({
            distro: d.id,
            distroVersion: d.version,
            arch: d.supportedArch.includes(recipe.arch) ? recipe.arch : d.supportedArch[0],
          });
          onClose();
        },
        keywords: `distro distribution ${d.name} ${d.id} ${d.packageManager} ${d.codename}`,
      });
    });

    // 4. Desktop Environments
    DESKTOPS.forEach(de => {
      const isSelected = recipe.desktop === de.id;
      list.push({
        id: `desktop-${de.id}`,
        category: 'desktop',
        title: `${lang === 'fr' ? 'Choisir le bureau' : 'Select desktop'} : ${de.name}`,
        subtitle: `${de.description.slice(0, 60)}... (${de.type})`,
        badge: isSelected ? 'Actif' : de.type,
        badgeType: isSelected ? 'emerald' : 'violet',
        icon: Monitor,
        action: () => {
          onUpdateRecipe({
            desktop: de.id,
            displayManager: de.recommendedDM,
          });
          onClose();
        },
        keywords: `desktop bureau window manager wm ${de.name} ${de.id} ${de.type}`,
      });
    });

    // 5. Software Packages (Toggle)
    SOFTWARE_PACKAGES.forEach(pkg => {
      const isSelected = recipe.selectedPackages.includes(pkg.id);
      list.push({
        id: `pkg-${pkg.id}`,
        category: 'package',
        title: `${isSelected ? '✓ ' : '+ '} ${pkg.name}`,
        subtitle: `${pkg.description} (+${pkg.sizeMB} Mo)`,
        badge: isSelected ? (lang === 'fr' ? 'Installé' : 'Selected') : (lang === 'fr' ? 'Ajouter' : 'Add'),
        badgeType: isSelected ? 'emerald' : 'cyan',
        icon: Package,
        action: () => {
          let newSelected: string[];
          if (isSelected) {
            newSelected = recipe.selectedPackages.filter(id => id !== pkg.id);
          } else {
            newSelected = [...recipe.selectedPackages, pkg.id];
          }
          onUpdateRecipe({ selectedPackages: newSelected });
        },
        keywords: `package paquet logiciel ${pkg.name} ${pkg.id} ${pkg.tags.join(' ')} ${pkg.description}`,
      });
    });

    // 6. Presets
    DISTRO_PRESETS.forEach(preset => {
      list.push({
        id: `preset-${preset.id}`,
        category: 'preset',
        title: `${lang === 'fr' ? 'Charger le modèle' : 'Load Preset'} : ${preset.title}`,
        subtitle: `${preset.subtitle} — ${preset.description.slice(0, 50)}...`,
        badge: preset.category,
        badgeType: 'amber',
        icon: Sparkles,
        action: () => {
          onUpdateRecipe(preset.recipe);
          onClose();
        },
        keywords: `preset modele template ${preset.title} ${preset.subtitle} ${preset.category}`,
      });
    });

    // 7. Tips
    DISTRO_TIPS.forEach(tip => {
      list.push({
        id: `tip-${tip.id}`,
        category: 'tip',
        title: `${lang === 'fr' ? 'Astuce' : 'Tip'} : ${lang === 'fr' ? tip.titleFr : tip.titleEn}`,
        subtitle: `${(lang === 'fr' ? tip.contentFr : tip.contentEn).slice(0, 75)}...`,
        badge: tip.tag,
        badgeType: 'amber',
        icon: Lightbulb,
        action: () => {
          if (tip.targetTab) {
            onNavigateTab(tip.targetTab);
          }
          onClose();
        },
        keywords: `tip astuce conseil ${tip.titleFr} ${tip.titleEn} ${tip.contentFr} ${tip.tag}`,
      });
    });

    return list;
  }, [recipe, lang, onNavigateTab, onOpenAI, onOpenPresets, onOpenBuild, onOpenTips, onUpdateRecipe, onClose]);

  const filteredItems = useMemo(() => {
    if (!search.trim()) {
      // Return top priority items when empty search
      return items.filter(i => i.category === 'action' || i.category === 'tab').slice(0, 12);
    }
    const q = search.toLowerCase().trim();
    return items.filter(i => {
      return i.title.toLowerCase().includes(q) ||
             (i.subtitle && i.subtitle.toLowerCase().includes(q)) ||
             i.keywords.toLowerCase().includes(q);
    }).slice(0, 20);
  }, [items, search]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % (filteredItems.length || 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + filteredItems.length) % (filteredItems.length || 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredItems[selectedIndex]) {
        filteredItems[selectedIndex].action();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content"
        style={{
          maxWidth: '680px',
          padding: 0,
          overflow: 'hidden',
          background: '#0c1220',
          border: '1px solid rgba(255, 255, 255, 0.14)',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.7)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Launcher Input Bar */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '14px 18px',
          borderBottom: '1px solid var(--border-subtle)',
          background: '#0c0a09',
        }}>
          <Search size={18} color="var(--cyan)" />
          <input
            ref={inputRef}
            type="text"
            className="font-sans"
            placeholder={lang === 'fr' ? 'Rechercher une action, paquet, modèle, astuce... (ex: docker, arch, hyprland, build)' : 'Type a command, package, preset, or tip...'}
            value={search}
            onChange={(e) => { setSearch(e.target.value); setSelectedIndex(0); }}
            onKeyDown={handleKeyDown}
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: 'var(--text-main)',
              fontSize: '0.94rem',
            }}
          />
          {search && (
            <button
              onClick={() => { setSearch(''); setSelectedIndex(0); }}
              style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', display: 'flex' }}
            >
              <X size={15} />
            </button>
          )}
          <span style={{
            fontSize: '0.68rem',
            padding: '2px 6px',
            borderRadius: '4px',
            background: 'rgba(255, 255, 255, 0.06)',
            color: 'var(--text-dim)',
            fontFamily: 'var(--font-mono)',
          }}>
            ESC
          </span>
        </div>

        {/* Results List */}
        <div
          ref={listRef}
          style={{
            maxHeight: '380px',
            overflowY: 'auto',
            padding: '6px',
            display: 'flex',
            flexDirection: 'column',
            gap: '2px',
          }}
        >
          {filteredItems.map((item, idx) => {
            const isSelected = idx === selectedIndex;
            const Icon = item.icon;

            return (
              <div
                key={item.id}
                onClick={item.action}
                onMouseEnter={() => setSelectedIndex(idx)}
                style={{
                  padding: '9px 12px',
                  borderRadius: '6px',
                  background: isSelected ? 'rgba(249, 115, 22, 0.12)' : 'transparent',
                  border: isSelected ? '1px solid rgba(249, 115, 22, 0.3)' : '1px solid transparent',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px',
                  transition: 'background 0.1s ease',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                  <div style={{
                    color: isSelected ? 'var(--cyan)' : 'var(--text-muted)',
                    display: 'flex',
                    alignItems: 'center',
                    flexShrink: 0,
                  }}>
                    <Icon size={16} />
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{
                      fontSize: '0.84rem',
                      fontWeight: isSelected ? 600 : 500,
                      color: isSelected ? '#ffffff' : 'var(--text-main)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}>
                      {item.title}
                    </div>
                    {item.subtitle && (
                      <div style={{
                        fontSize: '0.73rem',
                        color: 'var(--text-dim)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}>
                        {item.subtitle}
                      </div>
                    )}
                  </div>
                </div>

                {item.badge && (
                  <span
                    className={`badge badge-${item.badgeType || 'cyan'}`}
                    style={{ fontSize: '0.64rem', flexShrink: 0 }}
                  >
                    {item.badge}
                  </span>
                )}
              </div>
            );
          })}

          {filteredItems.length === 0 && (
            <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--text-dim)', fontSize: '0.84rem' }}>
              {lang === 'fr' ? 'Aucun résultat pour cette recherche.' : 'No matching results found.'}
            </div>
          )}
        </div>

        {/* Launcher Footer Bar */}
        <div style={{
          padding: '8px 16px',
          borderTop: '1px solid var(--border-subtle)',
          background: '#0c0a09',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '0.72rem',
          color: 'var(--text-dim)',
        }}>
          <div style={{ display: 'flex', gap: '12px' }}>
            <span><kbd style={{ background: 'rgba(255,255,255,0.06)', padding: '1px 4px', borderRadius: '3px' }}>↑↓</kbd> Naviguer</span>
            <span><kbd style={{ background: 'rgba(255,255,255,0.06)', padding: '1px 4px', borderRadius: '3px' }}>↵</kbd> Exécuter</span>
            <span><kbd style={{ background: 'rgba(255,255,255,0.06)', padding: '1px 4px', borderRadius: '3px' }}>ESC</kbd> Fermer</span>
          </div>
          <span>OSForge Studio Quick Launcher</span>
        </div>
      </div>
    </div>
  );
};
