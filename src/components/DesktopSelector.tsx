import React from 'react';
import { OSRecipe, DisplayManagerId } from '../types/os';
import { DESKTOPS } from '../data/desktopEnvironments';
import { ContextTip } from './ContextTip';
import { InfoTooltip } from './InfoTooltip';
import { Monitor, CheckCircle2, Globe, Sliders, Palette, Image as ImageIcon } from 'lucide-react';
import { BrandLogo } from './BrandLogo';
import { DESKTOP_LOGOS } from '../data/logos';

interface DesktopSelectorProps {
  recipe: OSRecipe;
  onChange: (updated: Partial<OSRecipe>) => void;
  lang: 'fr' | 'en';
  onOpenTips?: () => void;
  onOpenScreenshots?: (desktopId?: string) => void;
}

export const DesktopSelector: React.FC<DesktopSelectorProps> = ({ recipe, onChange, lang, onOpenTips, onOpenScreenshots }) => {
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
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px' }}>
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
                      <h3 style={{ fontSize: '0.92rem', fontWeight: 700, color: isSelected ? 'var(--cyan)' : '#f8fafc' }}>
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
                        color: '#a78bfa',
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
          <h3 style={{ fontSize: '0.98rem', fontWeight: 700, color: '#f8fafc', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
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
                    background: isSelected ? 'rgba(14, 165, 233, 0.1)' : 'rgba(10, 15, 28, 0.4)',
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
                      <span style={{ fontWeight: 600, fontSize: '0.84rem', color: isSelected ? '#ffffff' : '#e2e8f0' }}>
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
          <h3 style={{ fontSize: '0.98rem', fontWeight: 700, color: '#f8fafc', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Palette size={16} color="var(--violet)" />
            {lang === 'fr' ? 'Thème de Démarrage & Plymouth Splash' : 'Boot Splash & Wallpaper Preset'}
            <InfoTooltip
              text={lang === 'fr'
                ? 'Le thème graphique affiché pendant le chargement du noyau et le fond d’écran initial.'
                : 'Graphical theme shown during kernel boot and default wallpaper preset.'}
            />
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                {lang === 'fr' ? 'Couleur d’Accentuation Système' : 'System Accent Color'}
              </label>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                {['#0ea5e9', '#10b981', '#a855f7', '#f59e0b', '#ec4899', '#f43f5e', '#6366f1'].map(color => (
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
                    }}
                  />
                ))}
              </div>
            </div>

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
                <option value="minimal">Minimal Spinner (Épuré)</option>
                <option value="cyberpunk">Cyberpunk Neon Glitch (Futuriste)</option>
                <option value="retro_tui">Retro Terminal TUI (Matrix / Hack)</option>
                <option value="enterprise">Enterprise Slate (Sobre & Pro)</option>
              </select>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
