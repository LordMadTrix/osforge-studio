import React, { useState, useMemo } from 'react';
import { OSRecipe } from '../types/os';
import { DESKTOPS } from '../data/desktopEnvironments';
import { ContextTip } from './ContextTip';
import { InfoTooltip } from './InfoTooltip';
import {
  Monitor, CheckCircle2, Globe, Image as ImageIcon, Rss, Search, X,
  HardDrive, Wrench
} from 'lucide-react';
import { BrandLogo } from './BrandLogo';
import { DESKTOP_LOGOS } from '../data/logos';
import { useLiveVersions } from '../hooks/useLiveVersions';
import { SessionManagerView } from './SessionManagerView';

interface DesktopSelectorProps {
  recipe: OSRecipe;
  onChange: (updated: Partial<OSRecipe>) => void;
  lang: 'fr' | 'en';
  onOpenTips?: () => void;
  onOpenScreenshots?: (desktopId?: string) => void;
  subSection?: 'desktop' | 'display_manager' | 'default_apps' | 'all';
}

export const DesktopSelector: React.FC<DesktopSelectorProps> = ({
  recipe,
  onChange,
  lang,
  onOpenTips,
  onOpenScreenshots,
  subSection = 'all',
}) => {
  const { desktops: liveDesktops } = useLiveVersions();

  type DesktopFilterCategory = 'all' | 'Full Desktop' | 'Tiling WM' | 'Lightweight' | 'Next-Gen Rust' | 'Specialized';
  type DesktopProtocolFilter = 'all' | 'wayland' | 'x11' | 'headless';

  const [desktopCategory, setDesktopCategory] = useState<DesktopFilterCategory>('all');
  const [protocolFilter, setProtocolFilter] = useState<DesktopProtocolFilter>('all');
  const [desktopSearch, setDesktopSearch] = useState('');

  const desktopCategories: { id: DesktopFilterCategory; label: string; icon: string }[] = useMemo(() => [
    { id: 'all', label: lang === 'fr' ? 'Tous les bureaux' : 'All Desktops', icon: '🌐' },
    { id: 'Full Desktop', label: lang === 'fr' ? 'Bureaux Complets' : 'Full Desktops', icon: '🖥️' },
    { id: 'Tiling WM', label: lang === 'fr' ? 'Tiling Window Managers' : 'Tiling WMs', icon: '🪟' },
    { id: 'Lightweight', label: lang === 'fr' ? 'Légers & Faible RAM' : 'Lightweight (<400MB)', icon: '🪶' },
    { id: 'Next-Gen Rust', label: lang === 'fr' ? 'Écosystème Rust' : 'Next-Gen Rust', icon: '🦀' },
    { id: 'Specialized', label: lang === 'fr' ? 'Serveur & Kiosk' : 'Server & Kiosk', icon: '⚙️' },
  ], [lang]);

  const filteredDesktops = useMemo(() => {
    return DESKTOPS.filter(de => {
      if (desktopCategory !== 'all') {
        if (desktopCategory === 'Specialized') {
          if (de.type !== 'Headless' && de.type !== 'Appliance') return false;
        } else if (de.type !== desktopCategory) {
          return false;
        }
      }
      if (protocolFilter !== 'all') {
        if (protocolFilter === 'wayland' && !de.wayland) return false;
        if (protocolFilter === 'x11' && (de.wayland || de.type === 'Headless')) return false;
        if (protocolFilter === 'headless' && de.type !== 'Headless') return false;
      }
      if (desktopSearch.trim()) {
        const q = desktopSearch.toLowerCase();
        return (
          de.name.toLowerCase().includes(q) ||
          de.description.toLowerCase().includes(q) ||
          de.type.toLowerCase().includes(q) ||
          de.id.toLowerCase().includes(q) ||
          de.features.some(f => f.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [desktopCategory, protocolFilter, desktopSearch]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Contextual Pro Tip */}
      <ContextTip category="desktop" lang={lang} onOpenAllTips={onOpenTips} />

      {/* 1. Desktop / WM Grid */}
      {(subSection === 'all' || subSection === 'desktop') && (
      <>
      <div>
        <div style={{ marginBottom: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Monitor size={18} color="var(--violet)" />
              {lang === 'fr' ? 'Environnement de Bureau & Gestionnaire de Fenêtres' : 'Desktop Environment & Window Manager'}
              <InfoTooltip
                text={lang === 'fr'
                  ? 'Choisissez Hyprland pour un tiling fluide, COSMIC Beta en Rust, GNOME 47/48 ou KDE Plasma 6.3 pour un bureau complet, ou Headless pour un serveur.'
                  : 'Choose Hyprland for Wayland tiling, COSMIC Rust Beta, GNOME 47/48 or KDE Plasma 6.3 for full desktop, or Headless for server.'}
              />
            </h2>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              {lang === 'fr'
                ? 'Sélectionnez l’interface visuelle ou le mode sans écran (Headless/Serveur).'
                : 'Select visual interface or headless server mode.'}
            </p>
          </div>

          {onOpenScreenshots && (
            <button
              onClick={() => onOpenScreenshots()}
              className="btn btn-secondary"
              style={{ fontSize: '0.78rem', padding: '5px 10px', color: 'var(--violet)' }}
            >
              <ImageIcon size={13} />
              <span>{lang === 'fr' ? '📸 Galerie des Bureaux' : '📸 Desktop Gallery'}</span>
            </button>
          )}
        </div>

        {/* Barre de Recherche & Catégories Bureaux */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
            {/* Champ de recherche */}
            <div style={{ position: 'relative', flex: '1 1 240px', maxWidth: '360px' }}>
              <Search size={14} color="var(--text-dim)" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="text"
                placeholder={lang === 'fr' ? 'Rechercher un bureau (KDE, Hyprland, Wayland...)' : 'Search desktop (KDE, Hyprland, Wayland...)'}
                value={desktopSearch}
                onChange={e => setDesktopSearch(e.target.value)}
                className="input-text"
                style={{
                  width: '100%',
                  paddingLeft: '32px',
                  paddingRight: desktopSearch ? '30px' : '10px',
                  paddingTop: '6px',
                  paddingBottom: '6px',
                  fontSize: '0.78rem',
                  borderRadius: '6px',
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid var(--border-subtle)',
                }}
              />
              {desktopSearch && (
                <button
                  onClick={() => setDesktopSearch('')}
                  style={{
                    position: 'absolute',
                    right: '8px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-dim)',
                    cursor: 'pointer',
                    padding: '2px',
                  }}
                  title={lang === 'fr' ? 'Effacer la recherche' : 'Clear search'}
                >
                  <X size={13} />
                </button>
              )}
            </div>

            {/* Filtre protocole Wayland / X11 */}
            <div style={{ display: 'flex', gap: '4px', alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginRight: '2px' }}>
                {lang === 'fr' ? 'Protocole :' : 'Protocol:'}
              </span>
              {[
                { id: 'all', label: lang === 'fr' ? 'Tous' : 'All' },
                { id: 'wayland', label: 'Wayland' },
                { id: 'x11', label: 'X11' },
                { id: 'headless', label: lang === 'fr' ? 'Sans GUI' : 'Headless' },
              ].map(p => {
                const isActive = protocolFilter === p.id;
                return (
                  <button
                    key={p.id}
                    onClick={() => setProtocolFilter(p.id as any)}
                    style={{
                      fontSize: '0.7rem',
                      padding: '3px 8px',
                      borderRadius: '4px',
                      background: isActive ? 'rgba(168, 85, 247, 0.18)' : 'rgba(255, 255, 255, 0.03)',
                      border: isActive ? '1px solid #a855f7' : '1px solid var(--border-subtle)',
                      color: isActive ? '#c084fc' : 'var(--text-muted)',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      fontWeight: isActive ? 600 : 400,
                    }}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Onglets de Catégories avec Badges de Comptage */}
          <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '3px' }}>
            {desktopCategories.map(cat => {
              const isSelected = desktopCategory === cat.id;
              const count = cat.id === 'all'
                ? DESKTOPS.length
                : cat.id === 'Specialized'
                  ? DESKTOPS.filter(d => d.type === 'Headless' || d.type === 'Appliance').length
                  : DESKTOPS.filter(d => d.type === cat.id).length;
              return (
                <button
                  key={cat.id}
                  onClick={() => setDesktopCategory(cat.id as any)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '0.73rem',
                    padding: '5px 10px',
                    borderRadius: '6px',
                    whiteSpace: 'nowrap',
                    background: isSelected ? 'rgba(168, 85, 247, 0.18)' : 'rgba(255, 255, 255, 0.03)',
                    border: isSelected ? '1px solid var(--violet)' : '1px solid var(--border-subtle)',
                    color: isSelected ? 'var(--violet)' : 'var(--text-muted)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    fontWeight: isSelected ? 600 : 400,
                  }}
                >
                  <span>{cat.icon}</span>
                  <span>{cat.label}</span>
                  <span style={{
                    fontSize: '0.62rem',
                    padding: '1px 5px',
                    borderRadius: '999px',
                    background: isSelected ? 'rgba(168, 85, 247, 0.3)' : 'rgba(255, 255, 255, 0.06)',
                    color: isSelected ? '#fff' : 'var(--text-dim)',
                  }}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Bandeau si le bureau sélectionné est masqué par le filtre */}
          {recipe.desktop && !filteredDesktops.some(d => d.id === recipe.desktop) && (
            <div style={{
              padding: '7px 12px',
              borderRadius: '6px',
              background: 'rgba(168, 85, 247, 0.08)',
              border: '1px solid rgba(168, 85, 247, 0.25)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: '0.76rem',
            }}>
              <span style={{ color: 'var(--violet)' }}>
                {lang === 'fr'
                  ? `Bureau sélectionné : ${DESKTOPS.find(d => d.id === recipe.desktop)?.name || recipe.desktop} (hors du filtre actif)`
                  : `Selected desktop: ${DESKTOPS.find(d => d.id === recipe.desktop)?.name || recipe.desktop} (filtered out)`}
              </span>
              <button
                onClick={() => {
                  setDesktopCategory('all');
                  setProtocolFilter('all');
                  setDesktopSearch('');
                }}
                className="btn btn-secondary"
                style={{ fontSize: '0.68rem', padding: '2px 8px', color: 'var(--violet)' }}
              >
                {lang === 'fr' ? 'Afficher' : 'Show'}
              </button>
            </div>
          )}
        </div>

        {/* Message si aucun résultat */}
        {filteredDesktops.length === 0 ? (
          <div style={{
            padding: '32px 20px',
            textAlign: 'center',
            color: 'var(--text-muted)',
            fontSize: '0.84rem',
            background: 'rgba(255, 255, 255, 0.02)',
            borderRadius: '8px',
            border: '1px dashed var(--border-subtle)',
          }}>
            <p style={{ marginBottom: '10px' }}>
              {lang === 'fr' ? 'Aucun environnement ne correspond aux critères sélectionnés.' : 'No desktop matches the selected criteria.'}
            </p>
            <button
              onClick={() => {
                setDesktopCategory('all');
                setProtocolFilter('all');
                setDesktopSearch('');
              }}
              className="btn btn-secondary"
              style={{ fontSize: '0.74rem', padding: '4px 10px' }}
            >
              {lang === 'fr' ? 'Réinitialiser les filtres' : 'Reset filters'}
            </button>
          </div>
        ) : (
          <div className="cards-grid">
            {filteredDesktops.map(de => {
            const isSelected = recipe.desktop === de.id;
            return (
              <div
                key={de.id}
                onClick={() => onChange({
                  desktop: de.id,
                  displayManager: de.recommendedDM,
                })}
                className={`select-card ${isSelected ? 'selected' : ''}`}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  position: 'relative',
                }}
              >
                <div>
                  {/* Top Preview Bar */}
                  <div style={{
                    height: '4px',
                    borderRadius: '2px',
                    background: de.previewGradient,
                    marginBottom: '10px',
                  }} />

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {DESKTOP_LOGOS[de.id] && (
                        <div style={{
                          width: '26px',
                          height: '26px',
                          borderRadius: '7px',
                          background: 'rgba(255, 255, 255, 0.06)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}>
                          <BrandLogo logo={DESKTOP_LOGOS[de.id]} size={15} />
                        </div>
                      )}
                      <h3 style={{ fontSize: '0.92rem', fontWeight: 700, color: isSelected ? 'var(--cyan)' : 'var(--text-main)' }}>
                        {de.name}
                      </h3>
                    </div>
                    <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                      {de.isBeta && (
                        <span className="badge badge-amber" style={{ fontSize: '0.58rem', padding: '1px 4px', fontWeight: 700 }}>
                          BETA
                        </span>
                      )}
                      <span className="badge badge-violet" style={{ fontSize: '0.64rem' }}>
                        {de.type}
                      </span>
                    </div>
                  </div>

                  <div style={{ fontSize: '0.7rem', fontWeight: 600, marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '5px', flexWrap: 'wrap' }}>
                    {de.id === 'kde' && (recipe.distro === 'ubuntu' || recipe.distro === 'debian' || recipe.distro === 'linuxmint' || recipe.distro === 'kali' || recipe.distro === 'raspbian') ? (
                      <>
                        <span className="badge badge-cyan" style={{ fontSize: '0.62rem', padding: '1px 5px' }}>
                          v5.27 LTS ({recipe.distro === 'ubuntu' ? 'Ubuntu 24.04' : recipe.distro === 'debian' ? 'Debian 12' : recipe.distro.toUpperCase()})
                        </span>
                        <span style={{ color: 'var(--text-dim)', fontSize: '0.62rem', fontWeight: 400 }}>
                          (Upstream : {liveDesktops[de.id]?.latest || '6.x'})
                        </span>
                      </>
                    ) : liveDesktops[de.id]?.isLive ? (
                      <>
                        <Rss size={9} color="var(--cyan)" />
                        <span style={{ color: 'var(--cyan)' }}>{liveDesktops[de.id].latest}</span>
                        {liveDesktops[de.id].releaseDate && (
                          <span style={{ color: 'var(--text-dim)', fontWeight: 400 }}>({liveDesktops[de.id].releaseDate})</span>
                        )}
                      </>
                    ) : (
                      <span style={{ color: 'var(--text-dim)', fontWeight: 400 }}>{de.versionBadge}</span>
                    )}
                  </div>

                  <p style={{ fontSize: '0.76rem', color: 'var(--text-muted)', lineHeight: '1.35', marginBottom: '10px' }}>
                    {de.description}
                  </p>

                  {/* Key Features Pill */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '10px' }}>
                    {de.features.slice(0, 2).map((f, i) => (
                      <span key={i} style={{
                        fontSize: '0.66rem',
                        background: 'rgba(255, 255, 255, 0.04)',
                        padding: '2px 5px',
                        borderRadius: '3px',
                        color: '#cbd5e1',
                      }}>
                        ✓ {f}
                      </span>
                    ))}
                  </div>
                </div>

                <div style={{
                  paddingTop: '8px',
                  borderTop: '1px solid var(--border-subtle)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: '0.7rem',
                  color: 'var(--text-dim)',
                }}>
                  <span>RAM: <strong style={{ color: '#f1f5f9' }}>{de.ramUsageMB === 0 ? '0 Mo' : `+${de.ramUsageMB} Mo`}</strong></span>
                  {onOpenScreenshots ? (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenScreenshots(de.id);
                      }}
                      style={{
                        background: 'rgba(255, 255, 255, 0.06)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: '4px',
                        padding: '2px 6px',
                        color: '#fb923c',
                        cursor: 'pointer',
                        fontSize: '0.68rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '3px',
                      }}
                    >
                      <ImageIcon size={11} />
                      <span>{lang === 'fr' ? 'Aperçu' : 'Preview'}</span>
                    </button>
                  ) : (
                    <span>{de.wayland ? '⚡ Wayland' : '🖥️ X11'}</span>
                  )}
                </div>

                {isSelected && (
                  <div style={{ position: 'absolute', top: '10px', right: '10px' }}>
                    <CheckCircle2 size={16} color="var(--cyan)" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
        )}
      </div>

      {/* Special Configuration: Kiosk URL if Kiosk mode selected */}
      {recipe.desktop === 'web_kiosk' && (
        <div className="glass-panel" style={{ padding: '16px', border: '1px solid #ec4899', background: 'rgba(236, 72, 153, 0.04)' }}>
          <h3 style={{ fontSize: '0.98rem', fontWeight: 700, color: '#f472b6', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Globe size={16} />
            {lang === 'fr' ? 'Configuration de l’URL Borne Kiosk' : 'Kiosk Target URL Configuration'}
          </h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '10px' }}>
            {lang === 'fr'
              ? 'L’OS démarrera immédiatement en plein écran verrouillé sur cette adresse web sans barres d’outils.'
              : 'The OS will boot straight into fullscreen locked Chromium at this web address.'}
          </p>
          <input
            type="text"
            className="input-text"
            value={recipe.kioskUrl || ''}
            onChange={(e) => onChange({ kioskUrl: e.target.value })}
            placeholder="https://console.openfactory.tech/ ou https://votre-dashboard.lan"
            style={{ fontSize: '0.88rem', borderColor: '#f472b6' }}
          />
        </div>
      )}
      </>
      )}

      {/* 2. Gestionnaire de Connexion (Display Manager) Dédié */}
      {(subSection === 'all' || subSection === 'display_manager') && (
        <SessionManagerView
          recipe={recipe}
          onChange={onChange}
          lang={lang}
          onOpenTips={onOpenTips}
        />
      )}

      {/* 3. Applications de Bureau & Outils d'Administration Système */}
      {(subSection === 'all' || subSection === 'default_apps') && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Bannière d'en-tête de la suite d'administration */}
          <div style={{
            padding: '16px 20px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.12) 0%, rgba(14, 165, 233, 0.08) 100%)',
            border: '1px solid rgba(168, 85, 247, 0.25)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '8px',
                background: 'rgba(168, 85, 247, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#c084fc',
              }}>
                <Wrench size={20} />
              </div>
              <div>
                <h3 style={{ fontSize: '0.98rem', fontWeight: 700, margin: 0, color: '#ffffff' }}>
                  {lang === 'fr' ? 'Applications & Outils d’Administration Système' : 'Applications & System Administration Suite'}
                </h3>
                <p style={{ fontSize: '0.76rem', color: 'var(--text-muted)', margin: 0 }}>
                  {lang === 'fr'
                    ? 'Applications par défaut, gestionnaires de disques, moniteurs de processus et utilitaires d’administration pour piloter votre OS.'
                    : 'Default user apps, partition managers, process monitors, and administration utilities for your OS.'}
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <span className="badge badge-cyan" style={{ fontSize: '0.68rem', padding: '3px 8px' }}>
                {recipe.defaultApps?.browser || 'firefox'}
              </span>
              <span className="badge badge-violet" style={{ fontSize: '0.68rem', padding: '3px 8px' }}>
                {recipe.defaultApps?.terminal || 'alacritty'}
              </span>
              <span className="badge badge-emerald" style={{ fontSize: '0.68rem', padding: '3px 8px' }}>
                {recipe.defaultApps?.diskManager || 'gnome-disks'}
              </span>
            </div>
          </div>

          {/* Grille : Applications Usuelles & Outils Sysadmin */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
            gap: '20px',
          }}>
            {/* Volet 1 : Applications de Bureau Principales */}
            <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <h4 style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--text-main)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Globe size={16} color="#38bdf8" />
                {lang === 'fr' ? '1. Applications de Bureau Utilisateur' : '1. Default User Applications'}
              </h4>

              {/* 1.1 Navigateur Web */}
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '6px' }}>
                  🌐 {lang === 'fr' ? 'Navigateur Web par Défaut :' : 'Default Web Browser:'}
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {[
                    { id: 'firefox', name: 'Mozilla Firefox', desc: 'Standard / ESR open-source', badge: 'Recommandé' },
                    { id: 'google_chrome', name: 'Google Chrome', desc: 'Dépôt officiel Google Linux (x86_64)', badge: 'Officiel' },
                    { id: 'chromium', name: 'Chromium', desc: 'Moteur open-source pur sans télémétrie', badge: 'Open-Source' },
                    { id: 'brave', name: 'Brave Browser', desc: 'Protection vie privée & adblocker natif', badge: 'Privacy' },
                    { id: 'librewolf', name: 'LibreWolf', desc: 'Fork Firefox durci anti-tracking', badge: 'Hardened' },
                  ].map((b) => {
                    const currentBrowser = recipe.defaultApps?.browser || 'firefox';
                    const isSelected = currentBrowser === b.id;
                    return (
                      <div
                        key={b.id}
                        onClick={() => onChange({
                          defaultApps: { ...recipe.defaultApps, browser: b.id as any }
                        })}
                        style={{
                          padding: '8px 12px',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          background: isSelected ? 'rgba(56, 189, 248, 0.12)' : 'rgba(255, 255, 255, 0.02)',
                          border: isSelected ? '1px solid var(--cyan)' : '1px solid var(--border-subtle)',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontSize: '0.82rem', fontWeight: 600, color: isSelected ? '#ffffff' : 'var(--text-main)' }}>
                              {b.name}
                            </span>
                            <span className="badge badge-cyan" style={{ fontSize: '0.6rem', padding: '1px 5px' }}>
                              {b.badge}
                            </span>
                          </div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                            {b.desc}
                          </div>
                        </div>
                        {isSelected && <CheckCircle2 size={14} color="var(--cyan)" />}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 1.2 Émulateur de Terminal */}
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '6px' }}>
                  💻 {lang === 'fr' ? 'Émulateur de Terminal par Défaut :' : 'Default Terminal Emulator:'}
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {[
                    { id: 'alacritty', name: 'Alacritty', desc: 'Accéléré GPU en Rust, ultra-rapide & minimaliste', badge: 'GPU Rust' },
                    { id: 'kitty', name: 'Kitty', desc: 'Rendu GPU avec support images terminal & fenêtrage', badge: 'Feature-Rich' },
                    { id: 'ghostty', name: 'Ghostty', desc: 'Terminal natif moderne écrit en Zig', badge: 'Zig Fast' },
                    { id: 'foot', name: 'Foot', desc: 'Terminal Wayland natif ultra-léger et économe', badge: 'Wayland Native' },
                    { id: 'gnome-terminal', name: 'GNOME Terminal / Konsole', desc: 'Standard complet de l’environnement', badge: 'Desktop Default' },
                  ].map((t) => {
                    const currentTerm = recipe.defaultApps?.terminal || 'alacritty';
                    const isSelected = currentTerm === t.id;
                    return (
                      <div
                        key={t.id}
                        onClick={() => onChange({
                          defaultApps: { ...recipe.defaultApps, terminal: t.id as any }
                        })}
                        style={{
                          padding: '8px 12px',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          background: isSelected ? 'rgba(168, 85, 247, 0.12)' : 'rgba(255, 255, 255, 0.02)',
                          border: isSelected ? '1px solid var(--violet)' : '1px solid var(--border-subtle)',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontSize: '0.82rem', fontWeight: 600, color: isSelected ? '#ffffff' : 'var(--text-main)' }}>
                              {t.name}
                            </span>
                            <span className="badge badge-violet" style={{ fontSize: '0.6rem', padding: '1px 5px' }}>
                              {t.badge}
                            </span>
                          </div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                            {t.desc}
                          </div>
                        </div>
                        {isSelected && <CheckCircle2 size={14} color="var(--violet)" />}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 1.3 Éditeur de Code & Fichiers Système */}
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '6px' }}>
                  📝 {lang === 'fr' ? 'Éditeur de Code & Fichiers de Configuration :' : 'Code & Config Files Editor:'}
                </label>
                <select
                  className="input-select"
                  value={recipe.defaultApps?.textEditor || 'default'}
                  onChange={(e) => onChange({
                    defaultApps: { ...recipe.defaultApps, textEditor: e.target.value as any }
                  })}
                >
                  <option value="default">{lang === 'fr' ? 'Natif du bureau (Kate, Gedit, Mousepad)' : 'Native Desktop Editor'}</option>
                  <option value="vscodium">VSCodium (VS Code 100% open-source & telemetry-free)</option>
                  <option value="micro">Micro (Éditeur terminal moderne avec raccourcis Ctrl+C/Ctrl+V)</option>
                  <option value="nano">GNU Nano (Classique sysadmin universel)</option>
                </select>
              </div>
            </div>

            {/* Volet 2 : Outils d'Administration Système & Maintenance */}
            <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <h4 style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--text-main)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <HardDrive size={16} color="#10b981" />
                {lang === 'fr' ? '2. Outils d’Administration Système' : '2. System Administration Tools'}
              </h4>

              {/* 2.1 Gestionnaire de Disques & Partitions */}
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '6px' }}>
                  💽 {lang === 'fr' ? 'Gestionnaire de Disques & Partitions :' : 'Disk & Partition Manager:'}
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {[
                    { id: 'default', name: lang === 'fr' ? 'Natif / GNOME Disques' : 'Native / GNOME Disks', desc: 'Gestionnaire graphique standard avec santé SMART et ISO', badge: 'Standard' },
                    { id: 'gparted', name: 'GParted Partition Editor', desc: 'Outil de partitionnement avancé (ext4, btrfs, NTFS, FAT32)', badge: 'Pro Sysadmin' },
                    { id: 'partitionmanager', name: 'KDE Partition Manager', desc: 'Interface Qt complète pour disques et systèmes de fichiers', badge: 'KDE / Qt' },
                    { id: 'cli', name: 'CLI Uniquement (parted, fdisk)', desc: 'Mode minimal sans outil graphique additionnel', badge: 'Minimal' },
                  ].map((d) => {
                    const currentDisk = recipe.defaultApps?.diskManager || 'default';
                    const isSelected = currentDisk === d.id;
                    return (
                      <div
                        key={d.id}
                        onClick={() => onChange({
                          defaultApps: { ...recipe.defaultApps, diskManager: d.id as any }
                        })}
                        style={{
                          padding: '8px 12px',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          background: isSelected ? 'rgba(16, 185, 129, 0.12)' : 'rgba(255, 255, 255, 0.02)',
                          border: isSelected ? '1px solid #10b981' : '1px solid var(--border-subtle)',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontSize: '0.82rem', fontWeight: 600, color: isSelected ? '#ffffff' : 'var(--text-main)' }}>
                              {d.name}
                            </span>
                            <span className="badge badge-emerald" style={{ fontSize: '0.6rem', padding: '1px 5px' }}>
                              {d.badge}
                            </span>
                          </div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                            {d.desc}
                          </div>
                        </div>
                        {isSelected && <CheckCircle2 size={14} color="#10b981" />}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 2.2 Moniteur Système & Processus */}
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '6px' }}>
                  📊 {lang === 'fr' ? 'Moniteur Système & Gestionnaire de Tâches :' : 'System Monitor & Task Manager:'}
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {[
                    { id: 'default', name: lang === 'fr' ? 'Moniteur Graphique du Bureau' : 'Desktop GUI Monitor', desc: 'GNOME System Monitor, Plasma Systemmonitor ou XFCE Taskmanager', badge: 'Bureau' },
                    { id: 'btop', name: 'Btop++ TUI (Graphique Terminal)', desc: 'Visualisation moderne CPU, GPU, RAM, réseau et disques', badge: 'TUI Moderne' },
                    { id: 'htop', name: 'Htop CLI Interactif', desc: 'Classique universel ultra-léger et rapide', badge: 'CLI Rapide' },
                  ].map((m) => {
                    const currentMon = recipe.defaultApps?.systemMonitor || 'default';
                    const isSelected = currentMon === m.id;
                    return (
                      <div
                        key={m.id}
                        onClick={() => onChange({
                          defaultApps: { ...recipe.defaultApps, systemMonitor: m.id as any }
                        })}
                        style={{
                          padding: '8px 12px',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          background: isSelected ? 'rgba(245, 158, 11, 0.12)' : 'rgba(255, 255, 255, 0.02)',
                          border: isSelected ? '1px solid #f59e0b' : '1px solid var(--border-subtle)',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontSize: '0.82rem', fontWeight: 600, color: isSelected ? '#ffffff' : 'var(--text-main)' }}>
                              {m.name}
                            </span>
                            <span className="badge badge-amber" style={{ fontSize: '0.6rem', padding: '1px 5px' }}>
                              {m.badge}
                            </span>
                          </div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                            {m.desc}
                          </div>
                        </div>
                        {isSelected && <CheckCircle2 size={14} color="#f59e0b" />}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 2.3 Logithèque & Gestionnaire de Paquets Graphique */}
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '6px' }}>
                  📦 {lang === 'fr' ? 'Gestionnaire de Paquets Graphique / Logithèque :' : 'GUI Package Manager / Software Center:'}
                </label>
                <select
                  className="input-select"
                  value={recipe.defaultApps?.packageManagerGui || 'default'}
                  onChange={(e) => onChange({
                    defaultApps: { ...recipe.defaultApps, packageManagerGui: e.target.value as any }
                  })}
                >
                  <option value="default">{lang === 'fr' ? 'Par défaut du bureau (GNOME Software / Discover)' : 'Default (GNOME Software / Discover)'}</option>
                  <option value="synaptic">Synaptic Package Manager (Gestionnaire APT graphique expert)</option>
                  <option value="none">{lang === 'fr' ? 'Aucun (Gestion en ligne de commande uniquement)' : 'None (CLI only)'}</option>
                </select>
              </div>

              {/* 2.4 Utilitaires & Toggles Avancés d'Administration */}
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '8px' }}>
                  🛡️ {lang === 'fr' ? 'Modules d’Administration Système Avancés :' : 'Advanced System Administration Modules:'}
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '8px' }}>
                  {[
                    {
                      key: 'enableTimeshift',
                      label: 'Timeshift',
                      sub: lang === 'fr' ? 'Instantanés & Restauration' : 'Snapshots & Restore',
                      checked: !!recipe.defaultApps?.enableTimeshift,
                    },
                    {
                      key: 'enableGufw',
                      label: 'Gufw Firewall',
                      sub: lang === 'fr' ? 'Pare-feu UFW graphique' : 'UFW GUI Firewall',
                      checked: !!recipe.defaultApps?.enableGufw,
                    },
                    {
                      key: 'enableInxi',
                      label: 'Inxi / Hwinfo',
                      sub: lang === 'fr' ? 'Diagnostic matériel complet' : 'Full Hardware Diagnostics',
                      checked: !!recipe.defaultApps?.enableInxi,
                    },
                    {
                      key: 'enableCockpitWebAdmin',
                      label: 'Cockpit Web',
                      sub: lang === 'fr' ? 'Admin distante (port 9090)' : 'Remote Web Admin (9090)',
                      checked: !!recipe.defaultApps?.enableCockpitWebAdmin,
                    },
                  ].map((item) => (
                    <label
                      key={item.key}
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '8px',
                        padding: '8px 10px',
                        borderRadius: '6px',
                        background: item.checked ? 'rgba(168, 85, 247, 0.12)' : 'rgba(255, 255, 255, 0.02)',
                        border: item.checked ? '1px solid var(--violet)' : '1px solid var(--border-subtle)',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={item.checked}
                        onChange={(e) => onChange({
                          defaultApps: {
                            ...recipe.defaultApps,
                            [item.key]: e.target.checked,
                          },
                        })}
                        style={{ marginTop: '2px' }}
                      />
                      <div>
                        <div style={{ fontSize: '0.78rem', fontWeight: 600, color: item.checked ? '#ffffff' : 'var(--text-main)' }}>
                          {item.label}
                        </div>
                        <div style={{ fontSize: '0.66rem', color: 'var(--text-muted)' }}>
                          {item.sub}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
