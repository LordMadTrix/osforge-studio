import React, { useState } from 'react';
import { OSRecipe, DisplayManagerId } from '../types/os';
import { DESKTOPS } from '../data/desktopEnvironments';
import { ContextTip } from './ContextTip';
import { InfoTooltip } from './InfoTooltip';
import { Monitor, CheckCircle2, Globe, Sliders, Palette, Image as ImageIcon, Rss } from 'lucide-react';
import { BrandLogo } from './BrandLogo';
import { DESKTOP_LOGOS } from '../data/logos';
import { useLiveVersions } from '../hooks/useLiveVersions';
import { BootPreviewSimulator } from './BootPreviewSimulator';
import { LiveDesktopSimulator } from './LiveDesktopSimulator';

interface DesktopSelectorProps {
  recipe: OSRecipe;
  onChange: (updated: Partial<OSRecipe>) => void;
  lang: 'fr' | 'en';
  onOpenTips?: () => void;
  onOpenScreenshots?: (desktopId?: string) => void;
}

export const DesktopSelector: React.FC<DesktopSelectorProps> = ({ recipe, onChange, lang, onOpenTips, onOpenScreenshots }) => {
  const [previewSimulatorTab, setPreviewSimulatorTab] = useState<'boot' | 'desktop'>('boot');
  const { desktops: liveDesktops } = useLiveVersions();
  const displayManagers: { id: DisplayManagerId; name: string; desc: string; tipFr: string; tipEn: string }[] = [
    {
      id: 'gdm3',
      name: 'GDM (GNOME Display Manager)',
      desc: 'Recommandé pour GNOME, Wayland natif',
      tipFr: 'Gestionnaire de connexion officiel du projet GNOME avec prise en charge complète de Wayland.',
      tipEn: 'Official GNOME display manager with native Wayland session support.',
    },
    {
      id: 'sddm',
      name: 'SDDM (Simple Desktop DM)',
      desc: 'Recommandé pour KDE Plasma & Qt6',
      tipFr: 'Gestionnaire moderne basé sur Qt et QML, standard de KDE Plasma 6.',
      tipEn: 'Modern Qt and QML based display manager, standard on KDE Plasma.',
    },
    {
      id: 'cosmic-greeter',
      name: 'COSMIC Greeter (Rust Display Manager)',
      desc: 'Recommandé pour COSMIC Desktop Beta',
      tipFr: 'Gestionnaire de connexion moderne développé en Rust pour COSMIC Desktop.',
      tipEn: 'Modern memory-safe display manager written in Rust for COSMIC.',
    },
    {
      id: 'ddm',
      name: 'DDM (Deepin Display Manager)',
      desc: 'Recommandé pour Deepin (DDE)',
      tipFr: 'Gestionnaire de connexion natif de Deepin, basé sur Qt6 et le compositeur Wayland treeland.',
      tipEn: 'Deepin\'s native display manager, built on Qt6 and the treeland Wayland compositor.',
    },
    {
      id: 'lightdm',
      name: 'LightDM (Léger & GTK)',
      desc: 'Recommandé pour XFCE, i3wm, Cinnamon',
      tipFr: 'Ultra-rapide, faible empreinte RAM et hautement personnalisable avec slick-greeter.',
      tipEn: 'Fast, lightweight and highly customizable with GTK/slick greeters.',
    },
    {
      id: 'ly',
      name: 'Ly (TUI Console Display Manager)',
      desc: 'Ultra-léger en mode texte pour Hyprland & Sway',
      tipFr: 'Écran de login en mode texte console avec animations ASCII. Démarre en 10ms.',
      tipEn: 'Text-mode console login with ASCII matrix animations. Starts in 10ms.',
    },
    {
      id: 'none',
      name: 'Aucun (Auto-login / Console directe)',
      desc: 'Pour les serveurs headless ou bornes kiosk',
      tipFr: 'Démarre directement dans le shell console ou lance immédiatement l’application kiosk.',
      tipEn: 'Boots directly into the text console or immediately launches kiosk browser.',
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Contextual Pro Tip */}
      <ContextTip category="desktop" lang={lang} onOpenAllTips={onOpenTips} />

      {/* 1. Desktop / WM Grid */}
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

        <div className="cards-grid">
          {DESKTOPS.map(de => {
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

                  <div style={{ fontSize: '0.7rem', fontWeight: 600, marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    {liveDesktops[de.id]?.isLive ? (
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

      {/* 2. Display Manager & Theme */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '18px' }}>
        {/* Display Manager */}
        <div className="glass-panel" style={{ padding: '18px' }}>
          <h3 style={{ fontSize: '0.98rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sliders size={16} color="var(--cyan)" />
            {lang === 'fr' ? 'Gestionnaire de Connexion (Display Manager)' : 'Display Manager'}
            <InfoTooltip
              text={lang === 'fr'
                ? 'L’écran d’authentification au démarrage. Ly est ultra-léger, LightDM est universel, GDM est conçu pour GNOME, SDDM pour KDE, COSMIC Greeter pour COSMIC.'
                : 'The graphical login greeter. Ly is ultra-fast TUI, LightDM is universal, GDM is for GNOME, SDDM for KDE.'}
            />
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {displayManagers.map(dm => {
              const isSelected = recipe.displayManager === dm.id;
              return (
                <div
                  key={dm.id}
                  onClick={() => onChange({ displayManager: dm.id })}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '6px',
                    background: isSelected ? 'rgba(249, 115, 22, 0.1)' : 'rgba(10, 15, 28, 0.4)',
                    border: `1px solid ${isSelected ? 'var(--cyan)' : 'var(--border-subtle)'}`,
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontWeight: 600, fontSize: '0.84rem', color: isSelected ? '#ffffff' : 'var(--text-main)' }}>
                        {dm.name}
                      </span>
                      <InfoTooltip text={lang === 'fr' ? dm.tipFr : dm.tipEn} />
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                      {dm.desc}
                    </div>
                  </div>
                  {isSelected && <CheckCircle2 size={15} color="var(--cyan)" />}
                </div>
              );
            })}
          </div>
        </div>

        {/* Branding & Boot Theme */}
        <div className="glass-panel" style={{ padding: '18px' }}>
          <h3 style={{ fontSize: '0.98rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Palette size={16} color="var(--violet)" />
            {lang === 'fr' ? 'Thème de Démarrage & Plymouth Splash' : 'Boot Splash & Wallpaper Preset'}
            <InfoTooltip
              text={lang === 'fr'
                ? 'Le thème graphique affiché pendant le chargement du noyau et le fond d’écran initial.'
                : 'Graphical theme shown during kernel boot and default wallpaper preset.'}
            />
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* 1. Accent Color */}
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                {lang === 'fr' ? 'Couleur d’Accentuation Système' : 'System Accent Color'}
              </label>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                {['#0ea5e9', '#84a05c', '#a855f7', '#f59e0b', '#ec4899', '#f43f5e', '#6366f1', '#10b981', '#14b8a6', '#e11d48'].map(color => (
                  <button
                    key={color}
                    onClick={() => onChange({
                      branding: { ...recipe.branding, accentColor: color }
                    })}
                    style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '50%',
                      background: color,
                      border: recipe.branding.accentColor === color ? '2px solid #ffffff' : '2px solid transparent',
                      cursor: 'pointer',
                      boxShadow: recipe.branding.accentColor === color ? '0 0 10px ' + color : 'none',
                      transition: 'transform 0.15s ease',
                    }}
                    title={color}
                  />
                ))}
              </div>
            </div>

            {/* 2. Wallpaper & Style */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '10px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                  {lang === 'fr' ? 'Fond d’Écran Vectoriel HD (1920x1080)' : 'Vector HD Wallpaper Preset'}
                </label>
                <select
                  className="input-select"
                  value={recipe.branding.wallpaperPreset || 'minimal'}
                  onChange={(e) => onChange({
                    branding: { ...recipe.branding, wallpaperPreset: e.target.value }
                  })}
                >
                  <option value="minimal">Minimal Slate (Ardoise sobre & géométrie épurée)</option>
                  <option value="nordic_frost">Nordic Frost (Glacier arctique & aurore #88c0d0)</option>
                  <option value="sunset_synthwave">Sunset Synthwave (Soleil rétro 80s & grille)</option>
                  <option value="emerald_forest">Emerald Forest (Bio-matrice émeraude #10b981)</option>
                  <option value="tokyo_neon">Tokyo Neon (Pluie tokyoïte & halo violet)</option>
                  <option value="cyberpunk">Cyberpunk Neon (Grille synthwave & soleil néon)</option>
                  <option value="matrix">Matrix Hacker (Pluie numérique verte)</option>
                  <option value="gaming_rog">Gaming ROG (Fibre de carbone & rouge gamer)</option>
                  <option value="deep_space">Deep Space (Cosmos, nébuleuse & étoiles)</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                  {lang === 'fr' ? 'URL Fond d’Écran Personnalisé (Optionnel)' : 'Custom Wallpaper Image URL (Optional)'}
                </label>
                <input
                  type="text"
                  className="input-text"
                  value={recipe.branding.customWallpaperUrl || ''}
                  onChange={(e) => onChange({
                    branding: { ...recipe.branding, customWallpaperUrl: e.target.value }
                  })}
                  placeholder="https://example.com/wallpaper.png"
                />
              </div>
            </div>

            {/* 3. Icon Theme & Cursor Theme */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '10px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                  🎨 {lang === 'fr' ? 'Pack d’Icônes Système' : 'System Icon Theme'}
                </label>
                <select
                  className="input-select"
                  value={recipe.branding.iconTheme || 'papirus-dark'}
                  onChange={(e) => onChange({
                    branding: { ...recipe.branding, iconTheme: e.target.value as any }
                  })}
                >
                  <option value="papirus-dark">Papirus Dark (Recommandé - Moderne & SVG)</option>
                  <option value="papirus-light">Papirus Light (Clair & épuré)</option>
                  <option value="breeze-dark">Breeze Dark (KDE Plasma Flat officiel)</option>
                  <option value="breeze">Breeze Light (KDE Clair officiel)</option>
                  <option value="adwaita">Adwaita (GNOME Standard)</option>
                  <option value="yaru-dark">Yaru Dark (Ubuntu Style)</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                  👆 {lang === 'fr' ? 'Thème de Curseur Souris' : 'Mouse Cursor Theme'}
                </label>
                <select
                  className="input-select"
                  value={recipe.branding.cursorTheme || 'breeze'}
                  onChange={(e) => onChange({
                    branding: { ...recipe.branding, cursorTheme: e.target.value as any }
                  })}
                >
                  <option value="breeze">Breeze Cursors (Haute visibilité / Universel)</option>
                  <option value="bibata-modern">Bibata Modern Classic (Material arrondi)</option>
                  <option value="adwaita">Adwaita Cursor (GNOME Standard)</option>
                  <option value="dmz-black">DMZ Black (Classique Linux)</option>
                </select>
              </div>
            </div>

            {/* 4. Fonts: Interface & Monospace */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '10px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                  🔤 {lang === 'fr' ? 'Police d’Interface (Sans-Serif)' : 'Interface Font (Sans-Serif)'}
                </label>
                <select
                  className="input-select font-mono"
                  value={recipe.branding.fontFamily || 'inter'}
                  onChange={(e) => onChange({
                    branding: { ...recipe.branding, fontFamily: e.target.value as any }
                  })}
                >
                  <option value="inter">Inter (Recommandé - Écrans & Lisibilité UI)</option>
                  <option value="roboto">Roboto (Material Design universel)</option>
                  <option value="cantarell">Cantarell (Standard GNOME moderne)</option>
                  <option value="dejavu">DejaVu Sans (Robuste & complet)</option>
                  <option value="jetbrains-mono">JetBrains Mono (Style hacker pro)</option>
                  <option value="fira-code">Fira Code (Moderne)</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                  ⌨️ {lang === 'fr' ? 'Police Terminal & Code (Monospace)' : 'Terminal & Code Font (Monospace)'}
                </label>
                <select
                  className="input-select font-mono"
                  value={recipe.branding.monoFontFamily || 'jetbrains-mono'}
                  onChange={(e) => onChange({
                    branding: { ...recipe.branding, monoFontFamily: e.target.value as any }
                  })}
                >
                  <option value="jetbrains-mono">JetBrains Mono (Ligatures & clarté dev)</option>
                  <option value="fira-code">Fira Code (Ligatures programmation)</option>
                  <option value="hack">Hack (Standard sysadmin lisible)</option>
                  <option value="cascadia-code">Cascadia Code (Microsoft Terminal)</option>
                </select>
              </div>
            </div>

            {/* 5. Terminal Color Scheme & Window Buttons Layout */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '10px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                  🖥️ {lang === 'fr' ? 'Palette Terminal (Kitty, Alacritty, XFCE)' : 'Terminal Color Scheme'}
                </label>
                <select
                  className="input-select font-mono"
                  value={recipe.branding.terminalColorScheme || 'tokyo-night'}
                  onChange={(e) => onChange({
                    branding: { ...recipe.branding, terminalColorScheme: e.target.value as any }
                  })}
                >
                  <option value="tokyo-night">Tokyo Night (Bleu nuit néon cyberpunk)</option>
                  <option value="catppuccin-mocha">Catppuccin Mocha (Pastel doux moderne)</option>
                  <option value="dracula">Dracula (Anthracite & violet gothique)</option>
                  <option value="nord">Nord (Bleu glacier arctique apaisant)</option>
                  <option value="gruvbox-dark">Gruvbox Dark (Rétro chaud confortable)</option>
                  <option value="cyberpunk-neon">Cyberpunk Neon (Noir pur & cyan/magenta)</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                  🪟 {lang === 'fr' ? 'Disposition des Boutons de Fenêtres' : 'Window Controls Position'}
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => onChange({
                      branding: { ...recipe.branding, windowButtonsPosition: 'right' }
                    })}
                    style={{
                      padding: '7px 10px',
                      borderRadius: '5px',
                      fontSize: '0.76rem',
                      border: (!recipe.branding.windowButtonsPosition || recipe.branding.windowButtonsPosition === 'right')
                        ? '1px solid #38bdf8'
                        : '1px solid var(--border-subtle)',
                      background: (!recipe.branding.windowButtonsPosition || recipe.branding.windowButtonsPosition === 'right')
                        ? 'rgba(56, 189, 248, 0.15)'
                        : 'rgba(15, 23, 42, 0.6)',
                      color: (!recipe.branding.windowButtonsPosition || recipe.branding.windowButtonsPosition === 'right')
                        ? '#38bdf8'
                        : 'var(--text-muted)',
                      cursor: 'pointer',
                    }}
                  >
                    👉 {lang === 'fr' ? 'À Droite (Standard)' : 'Right (Standard)'}
                  </button>
                  <button
                    type="button"
                    onClick={() => onChange({
                      branding: { ...recipe.branding, windowButtonsPosition: 'left' }
                    })}
                    style={{
                      padding: '7px 10px',
                      borderRadius: '5px',
                      fontSize: '0.76rem',
                      border: recipe.branding.windowButtonsPosition === 'left'
                        ? '1px solid #38bdf8'
                        : '1px solid var(--border-subtle)',
                      background: recipe.branding.windowButtonsPosition === 'left'
                        ? 'rgba(56, 189, 248, 0.15)'
                        : 'rgba(15, 23, 42, 0.6)',
                      color: recipe.branding.windowButtonsPosition === 'left'
                        ? '#38bdf8'
                        : 'var(--text-muted)',
                      cursor: 'pointer',
                    }}
                  >
                    👈 {lang === 'fr' ? 'À Gauche (macOS)' : 'Left (macOS)'}
                  </button>
                </div>
              </div>
            </div>

            {/* 6. Plymouth Theme */}
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                {lang === 'fr' ? 'Thème Plymouth (Boot Splash)' : 'Plymouth Splash Theme'}
              </label>
              <select
                className="input-select"
                value={recipe.branding.bootSplashTheme}
                onChange={(e) => onChange({
                  branding: { ...recipe.branding, bootSplashTheme: e.target.value as any }
                })}
              >
                <option value="spinner">Minimal Spinner (Roue moderne)</option>
                <option value="bgrt">BGRT (Logo UEFI constructeur natif)</option>
                <option value="fade-in">Fade-In (Transition douce)</option>
                <option value="tribar">Tribar (Barre de progression classique)</option>
                <option value="cyberpunk">Cyberpunk Glow (Lueur futuriste)</option>
                <option value="matrix">Matrix Glow</option>
              </select>
            </div>

            {/* Switcher Simulateur Interactif : Boot vs Bureau Live */}
            <div style={{ marginTop: '10px' }}>
              <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '6px', marginBottom: '6px' }}>
                <button
                  type="button"
                  onClick={() => setPreviewSimulatorTab('boot')}
                  style={{
                    padding: '5px 12px',
                    borderRadius: '6px',
                    fontSize: '0.78rem',
                    fontWeight: previewSimulatorTab === 'boot' ? 700 : 500,
                    background: previewSimulatorTab === 'boot' ? 'rgba(56, 189, 248, 0.15)' : 'transparent',
                    color: previewSimulatorTab === 'boot' ? 'var(--cyan)' : 'var(--text-muted)',
                    border: previewSimulatorTab === 'boot' ? '1px solid rgba(56, 189, 248, 0.4)' : '1px solid transparent',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  🎬 {lang === 'fr' ? 'Démarrage (Boot & Plymouth)' : 'Boot (Plymouth & GRUB)'}
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewSimulatorTab('desktop')}
                  style={{
                    padding: '5px 12px',
                    borderRadius: '6px',
                    fontSize: '0.78rem',
                    fontWeight: previewSimulatorTab === 'desktop' ? 700 : 500,
                    background: previewSimulatorTab === 'desktop' ? 'rgba(56, 189, 248, 0.15)' : 'transparent',
                    color: previewSimulatorTab === 'desktop' ? 'var(--cyan)' : 'var(--text-muted)',
                    border: previewSimulatorTab === 'desktop' ? '1px solid rgba(56, 189, 248, 0.4)' : '1px solid transparent',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  🖥️ {lang === 'fr' ? `Bureau Graphique (${recipe.desktop.toUpperCase()})` : `Live Desktop (${recipe.desktop.toUpperCase()})`}
                </button>
              </div>

              {previewSimulatorTab === 'boot' ? (
                <BootPreviewSimulator recipe={recipe} lang={lang} />
              ) : (
                <LiveDesktopSimulator recipe={recipe} lang={lang} />
              )}
            </div>

            {/* 7. Feature Toggles */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '8px', marginTop: '6px', paddingTop: '10px', borderTop: '1px solid var(--border-subtle)' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.78rem', color: 'var(--text-main)', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={recipe.branding.enableCustomOsRelease !== false}
                  onChange={(e) => onChange({
                    branding: { ...recipe.branding, enableCustomOsRelease: e.target.checked }
                  })}
                />
                <span>{lang === 'fr' ? 'Identité Système (/etc/os-release & Pixmap)' : 'System Identity (/etc/os-release)'}</span>
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.78rem', color: 'var(--text-main)', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={recipe.branding.enableFastfetchMotd !== false}
                  onChange={(e) => onChange({
                    branding: { ...recipe.branding, enableFastfetchMotd: e.target.checked }
                  })}
                />
                <span>{lang === 'fr' ? 'Bannière Terminal & Fastfetch aux couleurs OS' : 'Terminal Banner & Fastfetch in OS Colors'}</span>
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.78rem', color: 'var(--text-main)', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={Boolean(recipe.branding.enableGrubTheme)}
                  onChange={(e) => onChange({
                    branding: { ...recipe.branding, enableGrubTheme: e.target.checked }
                  })}
                />
                <span>{lang === 'fr' ? 'Thème GRUB 2 Graphique HD Coordonné' : 'HD Graphical GRUB 2 Theme'}</span>
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.78rem', color: 'var(--text-main)', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={recipe.branding.enableProAliases !== false}
                  onChange={(e) => onChange({
                    branding: { ...recipe.branding, enableProAliases: e.target.checked }
                  })}
                />
                <span>{lang === 'fr' ? 'Pack Raccourcis & Aliases Shell Pro (sysupdate, ports...)' : 'Pro Shell Aliases (sysupdate, ports...)'}</span>
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.78rem', color: 'var(--text-main)', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={Boolean(recipe.branding.enableStartupSound)}
                  onChange={(e) => onChange({
                    branding: { ...recipe.branding, enableStartupSound: e.target.checked }
                  })}
                />
                <span>{lang === 'fr' ? 'Son de Démarrage / Chime Audio au login' : 'Startup Sound Chime on Login'}</span>
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
