import React, { useState } from 'react';
import { OSRecipe, BrandingConfig } from '../types/os';
import {
  Palette,
  Sparkles,
  Type,
  ImageIcon,
  Wand2,
  Check,
  Volume2,
} from 'lucide-react';

interface ThemeEditorPanelProps {
  recipe: OSRecipe;
  onChange: (updated: Partial<OSRecipe>) => void;
  lang: 'fr' | 'en';
  activeSimulatorTab?: 'boot' | 'desktop';
}

interface ThemePreset {
  id: string;
  nameFr: string;
  nameEn: string;
  icon: string;
  accent: string;
  splash: BrandingConfig['bootSplashTheme'];
  wallpaper: string;
  termScheme: BrandingConfig['terminalColorScheme'];
  font: BrandingConfig['fontFamily'];
  mono: BrandingConfig['monoFontFamily'];
  buttons: 'right' | 'left';
  editionFr: string;
  editionEn: string;
}

const THEME_PRESETS: ThemePreset[] = [
  {
    id: 'rog_gaming',
    nameFr: 'ROG Gaming Performance',
    nameEn: 'ROG Gaming Performance',
    icon: '🎮',
    accent: '#e11d48',
    splash: 'osforge-custom',
    wallpaper: 'gaming_rog',
    termScheme: 'cyberpunk-neon',
    font: 'inter',
    mono: 'jetbrains-mono',
    buttons: 'right',
    editionFr: 'Gaming & Performance Edition',
    editionEn: 'Gaming & Performance Edition',
  },
  {
    id: 'cyberpunk_neon',
    nameFr: 'Cyberpunk 2077 Night',
    nameEn: 'Cyberpunk 2077 Night',
    icon: '🌆',
    accent: '#ec4899',
    splash: 'cyberpunk',
    wallpaper: 'cyberpunk',
    termScheme: 'cyberpunk-neon',
    font: 'jetbrains-mono',
    mono: 'fira-code',
    buttons: 'right',
    editionFr: 'Cyberpunk Neon Edition',
    editionEn: 'Cyberpunk Neon Edition',
  },
  {
    id: 'matrix_code',
    nameFr: 'Matrix Terminal Hacker',
    nameEn: 'Matrix Terminal Hacker',
    icon: '💻',
    accent: '#10b981',
    splash: 'matrix',
    wallpaper: 'matrix',
    termScheme: 'tokyo-night',
    font: 'jetbrains-mono',
    mono: 'jetbrains-mono',
    buttons: 'right',
    editionFr: 'Hacker & Cybersec Edition',
    editionEn: 'Hacker & Cybersec Edition',
  },
  {
    id: 'nordic_frost',
    nameFr: 'Nordic Frost Minimal',
    nameEn: 'Nordic Frost Minimal',
    icon: '❄️',
    accent: '#0ea5e9',
    splash: 'spinner',
    wallpaper: 'nordic_frost',
    termScheme: 'nord',
    font: 'inter',
    mono: 'hack',
    buttons: 'right',
    editionFr: 'Nordic Clean Edition',
    editionEn: 'Nordic Clean Edition',
  },
  {
    id: 'deep_space',
    nameFr: 'Deep Space Nebula',
    nameEn: 'Deep Space Nebula',
    icon: '🌌',
    accent: '#a855f7',
    splash: 'solar',
    wallpaper: 'deep_space',
    termScheme: 'catppuccin-mocha',
    font: 'inter',
    mono: 'fira-code',
    buttons: 'right',
    editionFr: 'Cosmic Nebula Edition',
    editionEn: 'Cosmic Nebula Edition',
  },
  {
    id: 'cupertino_clean',
    nameFr: 'Cupertino Modern',
    nameEn: 'Cupertino Modern',
    icon: '🍏',
    accent: '#38bdf8',
    splash: 'fade-in',
    wallpaper: 'minimal',
    termScheme: 'tokyo-night',
    font: 'inter',
    mono: 'cascadia-code',
    buttons: 'left',
    editionFr: 'Cupertino Studio Edition',
    editionEn: 'Cupertino Studio Edition',
  },
];

const ACCENT_COLORS = [
  { hex: '#e11d48', name: 'Crimson ROG' },
  { hex: '#0ea5e9', name: 'Sky Cyan' },
  { hex: '#84a05c', name: 'Sage Green' },
  { hex: '#a855f7', name: 'Purple Violet' },
  { hex: '#f59e0b', name: 'Amber Gold' },
  { hex: '#ec4899', name: 'Neon Pink' },
  { hex: '#f43f5e', name: 'Rose Red' },
  { hex: '#6366f1', name: 'Indigo Blue' },
  { hex: '#10b981', name: 'Emerald Green' },
  { hex: '#14b8a6', name: 'Teal Modern' },
];

export const ThemeEditorPanel: React.FC<ThemeEditorPanelProps> = ({
  recipe,
  onChange,
  lang,
  activeSimulatorTab = 'boot',
}) => {
  const [manualTab, setManualTab] = useState<'presets' | 'accent' | 'boot' | 'desktop' | 'identity' | null>(null);
  const editorTab = manualTab ?? (activeSimulatorTab === 'desktop' ? 'desktop' : 'presets');

  const branding = recipe.branding;

  const handleUpdateBranding = (partial: Partial<BrandingConfig>) => {
    onChange({
      branding: {
        ...branding,
        ...partial,
      },
    });
  };

  const handleApplyPreset = (preset: ThemePreset) => {
    onChange({
      branding: {
        ...branding,
        accentColor: preset.accent,
        bootSplashTheme: preset.splash,
        wallpaperPreset: preset.wallpaper,
        terminalColorScheme: preset.termScheme,
        fontFamily: preset.font,
        monoFontFamily: preset.mono,
        windowButtonsPosition: preset.buttons,
        editionName: lang === 'fr' ? preset.editionFr : preset.editionEn,
        enableGrubTheme: true,
      },
    });
  };

  return (
    <div
      style={{
        background: 'linear-gradient(135deg, rgba(13, 19, 31, 0.95) 0%, rgba(9, 13, 22, 0.98) 100%)',
        borderRadius: '8px',
        border: '1px solid rgba(56, 189, 248, 0.25)',
        boxShadow: '0 8px 30px rgba(0, 0, 0, 0.55)',
        padding: '14px 16px',
        marginBottom: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
      }}
    >
      {/* En-tête de l'éditeur de thème */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '6px',
              background: 'rgba(56, 189, 248, 0.15)',
              border: '1px solid rgba(56, 189, 248, 0.35)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#38bdf8',
            }}
          >
            <Palette size={15} />
          </div>
          <div>
            <div style={{ fontSize: '0.88rem', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>{lang === 'fr' ? 'Éditeur de Thème en Direct' : 'Live Theme Studio & Editor'}</span>
              <span className="badge badge-cyan" style={{ fontSize: '0.62rem', padding: '1px 6px' }}>
                {lang === 'fr' ? 'Temps Réel' : 'Live Sync'}
              </span>
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
              {lang === 'fr'
                ? 'Personnalisez les couleurs, le logo, le splash Plymouth et l’ambiance avec effet visuel immédiat.'
                : 'Fine-tune colors, logo, Plymouth splash, and desktop wallpaper with instant visual feedback.'}
            </div>
          </div>
        </div>

        {/* Barre d'onglets de l'éditeur */}
        <div style={{ display: 'flex', background: 'rgba(15, 23, 42, 0.7)', padding: '3px', borderRadius: '6px', border: '1px solid var(--border-subtle)', gap: '4px' }}>
          <button
            type="button"
            onClick={() => setManualTab('presets')}
            style={{
              padding: '4px 10px',
              borderRadius: '4px',
              fontSize: '0.72rem',
              fontWeight: editorTab === 'presets' ? 700 : 500,
              background: editorTab === 'presets' ? 'rgba(56, 189, 248, 0.25)' : 'transparent',
              color: editorTab === 'presets' ? '#38bdf8' : 'var(--text-muted)',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <Wand2 size={11} />
            <span>{lang === 'fr' ? 'Presets' : 'Presets'}</span>
          </button>
          <button
            type="button"
            onClick={() => setManualTab('accent')}
            style={{
              padding: '4px 10px',
              borderRadius: '4px',
              fontSize: '0.72rem',
              fontWeight: editorTab === 'accent' ? 700 : 500,
              background: editorTab === 'accent' ? 'rgba(56, 189, 248, 0.25)' : 'transparent',
              color: editorTab === 'accent' ? '#38bdf8' : 'var(--text-muted)',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: branding.accentColor || '#0ea5e9' }} />
            <span>{lang === 'fr' ? 'Couleur' : 'Colors'}</span>
          </button>
          <button
            type="button"
            onClick={() => setManualTab('boot')}
            style={{
              padding: '4px 10px',
              borderRadius: '4px',
              fontSize: '0.72rem',
              fontWeight: editorTab === 'boot' ? 700 : 500,
              background: editorTab === 'boot' ? 'rgba(56, 189, 248, 0.25)' : 'transparent',
              color: editorTab === 'boot' ? '#38bdf8' : 'var(--text-muted)',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <Sparkles size={11} />
            <span>{lang === 'fr' ? 'Boot & Plymouth' : 'Boot & Splash'}</span>
          </button>
          <button
            type="button"
            onClick={() => setManualTab('desktop')}
            style={{
              padding: '4px 10px',
              borderRadius: '4px',
              fontSize: '0.72rem',
              fontWeight: editorTab === 'desktop' ? 700 : 500,
              background: editorTab === 'desktop' ? 'rgba(56, 189, 248, 0.25)' : 'transparent',
              color: editorTab === 'desktop' ? '#38bdf8' : 'var(--text-muted)',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <ImageIcon size={11} />
            <span>{lang === 'fr' ? 'Fond & Bureau' : 'Wallpaper & UI'}</span>
          </button>
          <button
            type="button"
            onClick={() => setManualTab('identity')}
            style={{
              padding: '4px 10px',
              borderRadius: '4px',
              fontSize: '0.72rem',
              fontWeight: editorTab === 'identity' ? 700 : 500,
              background: editorTab === 'identity' ? 'rgba(56, 189, 248, 0.25)' : 'transparent',
              color: editorTab === 'identity' ? '#38bdf8' : 'var(--text-muted)',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <Type size={11} />
            <span>{lang === 'fr' ? 'Nom & Logo' : 'Name & Logo'}</span>
          </button>
        </div>
      </div>

      {/* Contenu spécifique à l'onglet sélectionné */}

      {/* 1. PRESETS RAPIDES 1-CLIC */}
      {editorTab === 'presets' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '8px' }}>
          {THEME_PRESETS.map((preset) => {
            const isSelected = branding.accentColor === preset.accent && branding.bootSplashTheme === preset.splash;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => handleApplyPreset(preset)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  background: isSelected ? 'rgba(56, 189, 248, 0.16)' : 'rgba(15, 23, 42, 0.6)',
                  border: isSelected ? `1px solid ${preset.accent}` : '1px solid rgba(255, 255, 255, 0.08)',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.15s ease',
                  boxShadow: isSelected ? `0 0 12px ${preset.accent}40` : 'none',
                }}
              >
                <div style={{ fontSize: '1.2rem' }}>{preset.icon}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '0.76rem', fontWeight: 700, color: isSelected ? '#ffffff' : 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ textOverflow: 'ellipsis', whiteSpace: 'nowrap', overflow: 'hidden' }}>
                      {lang === 'fr' ? preset.nameFr : preset.nameEn}
                    </span>
                    {isSelected && <Check size={12} color={preset.accent} />}
                  </div>
                  <div style={{ fontSize: '0.66rem', color: 'var(--text-muted)' }}>
                    Splash: {preset.splash} · {preset.accent}
                  </div>
                </div>
                <span
                  style={{
                    width: '12px',
                    height: '12px',
                    borderRadius: '50%',
                    background: preset.accent,
                    flexShrink: 0,
                    boxShadow: `0 0 6px ${preset.accent}`,
                  }}
                />
              </button>
            );
          })}
        </div>
      )}

      {/* 2. COULEURS & ACCENT */}
      {editorTab === 'accent' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
            <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
              {lang === 'fr'
                ? 'Choisissez une couleur dominante pour le logo, la lueur de boot, GRUB et les barres d’accentuation :'
                : 'Select the primary accent hue for logo glow, boot progress bar, GRUB and window highlights:'}
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input
                type="color"
                value={branding.accentColor || '#0ea5e9'}
                onChange={(e) => handleUpdateBranding({ accentColor: e.target.value })}
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '5px',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  cursor: 'pointer',
                  background: 'none',
                  padding: '1px',
                }}
                title={lang === 'fr' ? 'Sélecteur de couleur personnalisé' : 'Custom color picker'}
              />
              <input
                type="text"
                className="input-text font-mono"
                style={{ width: '84px', fontSize: '0.74rem', padding: '4px 6px', textAlign: 'center' }}
                value={branding.accentColor || '#0ea5e9'}
                onChange={(e) => handleUpdateBranding({ accentColor: e.target.value })}
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
            {ACCENT_COLORS.map((color) => {
              const isCurrent = branding.accentColor?.toLowerCase() === color.hex.toLowerCase();
              return (
                <button
                  key={color.hex}
                  type="button"
                  onClick={() => handleUpdateBranding({ accentColor: color.hex })}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '4px 10px',
                    borderRadius: '6px',
                    background: isCurrent ? 'rgba(255, 255, 255, 0.15)' : 'rgba(15, 23, 42, 0.5)',
                    border: isCurrent ? `2px solid ${color.hex}` : '1px solid rgba(255, 255, 255, 0.08)',
                    cursor: 'pointer',
                    boxShadow: isCurrent ? `0 0 10px ${color.hex}88` : 'none',
                    transform: isCurrent ? 'scale(1.04)' : 'scale(1)',
                    transition: 'all 0.15s ease',
                  }}
                  title={color.name}
                >
                  <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: color.hex }} />
                  <span style={{ fontSize: '0.72rem', color: isCurrent ? '#ffffff' : 'var(--text-muted)', fontWeight: isCurrent ? 700 : 500 }}>
                    {color.name}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. BOOT & PLYMOUTH SPLASH */}
      {editorTab === 'boot' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '8px' }}>
            {[
              { id: 'osforge-custom', name: '⭐ OSForge Custom', desc: 'Logo + Glow + Tribar' },
              { id: 'spinner', name: 'Minimal Spinner', desc: 'Anneau moderne haute fluidité' },
              { id: 'bgrt', name: 'BGRT Motherboard', desc: 'Handover UEFI natif' },
              { id: 'fade-in', name: 'Fade-In Glow', desc: 'Pulsation douce et logo' },
              { id: 'tribar', name: 'Tribar Slide', desc: 'Barre de progression 3 segments' },
              { id: 'solar', name: 'Solar Flare', desc: 'Éruptions coronales animées' },
              { id: 'glow', name: 'Glow Neon', desc: 'Lueur diffuse géométrique' },
              { id: 'cyberpunk', name: 'Cyberpunk Scan', desc: 'Scanline CRT et néon' },
              { id: 'matrix', name: 'Matrix Rain', desc: 'Pluie binaire verte' },
            ].map((splash) => {
              const isCurrent = branding.bootSplashTheme === splash.id;
              return (
                <button
                  key={splash.id}
                  type="button"
                  onClick={() => handleUpdateBranding({ bootSplashTheme: splash.id as any })}
                  style={{
                    padding: '8px 10px',
                    borderRadius: '6px',
                    background: isCurrent ? 'rgba(56, 189, 248, 0.16)' : 'rgba(15, 23, 42, 0.5)',
                    border: isCurrent ? '1px solid #38bdf8' : '1px solid rgba(255, 255, 255, 0.08)',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div style={{ fontSize: '0.76rem', fontWeight: isCurrent ? 700 : 600, color: isCurrent ? '#38bdf8' : 'var(--text-main)' }}>
                    {splash.name}
                  </div>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                    {splash.desc}
                  </div>
                </button>
              );
            })}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap', paddingTop: '4px', borderTop: '1px solid rgba(255, 255, 255, 0.06)' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '0.74rem', color: 'var(--text-main)' }}>
              <input
                type="checkbox"
                checked={branding.enableGrubTheme ?? true}
                onChange={(e) => handleUpdateBranding({ enableGrubTheme: e.target.checked })}
              />
              <span>{lang === 'fr' ? 'Thème GRUB 2 HD synchronisé' : 'Synchronized GRUB 2 HD Theme'}</span>
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '0.74rem', color: 'var(--text-main)' }}>
              <input
                type="checkbox"
                checked={branding.enableStartupSound ?? false}
                onChange={(e) => handleUpdateBranding({ enableStartupSound: e.target.checked })}
              />
              <Volume2 size={13} color="#38bdf8" />
              <span>{lang === 'fr' ? 'Son de démarrage stéréo au boot' : 'Stereo boot sound'}</span>
            </label>
          </div>
        </div>
      )}

      {/* 4. FOND D'ÉCRAN & AMBIANCE BUREAU */}
      {editorTab === 'desktop' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.74rem', color: 'var(--text-muted)', marginBottom: '6px' }}>
              🖼️ {lang === 'fr' ? 'Fond d’écran vectoriel HD :' : 'HD Vector Wallpaper Preset:'}
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '6px' }}>
              {[
                { id: 'gaming_rog', name: 'Gaming ROG', hint: 'Fibre & Rouge' },
                { id: 'cyberpunk', name: 'Cyberpunk Neon', hint: 'Grille 80s & Soleil' },
                { id: 'matrix', name: 'Matrix Code', hint: 'Bio-pluie verte' },
                { id: 'nordic_frost', name: 'Nordic Frost', hint: 'Glacier arctique' },
                { id: 'deep_space', name: 'Deep Space', hint: 'Nébuleuse & Cosmos' },
                { id: 'sunset_synthwave', name: 'Sunset Synthwave', hint: 'Coucher rétro' },
                { id: 'emerald_forest', name: 'Emerald Forest', hint: 'Matrice émeraude' },
                { id: 'tokyo_neon', name: 'Tokyo Neon', hint: 'Nuit pluvieuse' },
                { id: 'carbon_dark', name: 'Carbon Pro', hint: 'Fibre industrielle' },
                { id: 'aurora_borealis', name: 'Aurora Borealis', hint: 'Aurore céleste' },
                { id: 'minimal', name: 'Minimal Slate', hint: 'Épuré & Géométrie' },
              ].map((wp) => {
                const isCurrent = (branding.wallpaperPreset || 'minimal') === wp.id;
                return (
                  <button
                    key={wp.id}
                    type="button"
                    onClick={() => handleUpdateBranding({ wallpaperPreset: wp.id })}
                    style={{
                      padding: '6px 8px',
                      borderRadius: '5px',
                      background: isCurrent ? 'rgba(56, 189, 248, 0.16)' : 'rgba(15, 23, 42, 0.5)',
                      border: isCurrent ? '1px solid #38bdf8' : '1px solid rgba(255, 255, 255, 0.08)',
                      cursor: 'pointer',
                      textAlign: 'left',
                      fontSize: '0.72rem',
                    }}
                  >
                    <div style={{ fontWeight: isCurrent ? 700 : 500, color: isCurrent ? '#38bdf8' : 'var(--text-main)' }}>
                      {wp.name}
                    </div>
                    <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)' }}>{wp.hint}</div>
                  </button>
                );
              })}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '10px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                🔗 {lang === 'fr' ? 'URL fond personnalisé (optionnel) :' : 'Custom wallpaper image URL:'}
              </label>
              <input
                type="text"
                className="input-text"
                style={{ fontSize: '0.74rem', padding: '5px 8px' }}
                placeholder="https://.../wallpaper.webp"
                value={branding.customWallpaperUrl || ''}
                onChange={(e) => handleUpdateBranding({ customWallpaperUrl: e.target.value })}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                🪟 {lang === 'fr' ? 'Disposition des boutons de fenêtres :' : 'Window controls placement:'}
              </label>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  type="button"
                  onClick={() => handleUpdateBranding({ windowButtonsPosition: 'right' })}
                  style={{
                    flex: 1,
                    padding: '5px 8px',
                    borderRadius: '5px',
                    fontSize: '0.72rem',
                    fontWeight: (!branding.windowButtonsPosition || branding.windowButtonsPosition === 'right') ? 700 : 500,
                    background: (!branding.windowButtonsPosition || branding.windowButtonsPosition === 'right') ? 'rgba(56, 189, 248, 0.18)' : 'rgba(15, 23, 42, 0.5)',
                    border: (!branding.windowButtonsPosition || branding.windowButtonsPosition === 'right') ? '1px solid #38bdf8' : '1px solid rgba(255, 255, 255, 0.08)',
                    color: (!branding.windowButtonsPosition || branding.windowButtonsPosition === 'right') ? '#38bdf8' : 'var(--text-muted)',
                    cursor: 'pointer',
                  }}
                >
                  👉 {lang === 'fr' ? 'À Droite' : 'Right'}
                </button>
                <button
                  type="button"
                  onClick={() => handleUpdateBranding({ windowButtonsPosition: 'left' })}
                  style={{
                    flex: 1,
                    padding: '5px 8px',
                    borderRadius: '5px',
                    fontSize: '0.72rem',
                    fontWeight: branding.windowButtonsPosition === 'left' ? 700 : 500,
                    background: branding.windowButtonsPosition === 'left' ? 'rgba(56, 189, 248, 0.18)' : 'rgba(15, 23, 42, 0.5)',
                    border: branding.windowButtonsPosition === 'left' ? '1px solid #38bdf8' : '1px solid rgba(255, 255, 255, 0.08)',
                    color: branding.windowButtonsPosition === 'left' ? '#38bdf8' : 'var(--text-muted)',
                    cursor: 'pointer',
                  }}
                >
                  👈 {lang === 'fr' ? 'À Gauche (macOS)' : 'Left (macOS)'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 5. NOM DE L'OS, ÉDITION & IDENTITÉ */}
      {editorTab === 'identity' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
              🏷️ {lang === 'fr' ? 'Nom de la Distribution / OS :' : 'OS Distribution Name:'}
            </label>
            <input
              type="text"
              className="input-text"
              style={{ fontSize: '0.78rem', padding: '5px 8px', fontWeight: 700 }}
              value={branding.osName || ''}
              onChange={(e) => handleUpdateBranding({ osName: e.target.value })}
              placeholder="Ex: MadOS, ForgeOS"
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
              🎯 {lang === 'fr' ? 'Nom de l’Édition :' : 'Edition Subtitle:'}
            </label>
            <input
              type="text"
              className="input-text"
              style={{ fontSize: '0.78rem', padding: '5px 8px' }}
              value={branding.editionName || ''}
              onChange={(e) => handleUpdateBranding({ editionName: e.target.value })}
              placeholder="Ex: Gaming ROG Edition"
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
              🔢 {lang === 'fr' ? 'Version de la Release :' : 'Version Number:'}
            </label>
            <input
              type="text"
              className="input-text font-mono"
              style={{ fontSize: '0.78rem', padding: '5px 8px' }}
              value={branding.version || '1.0'}
              onChange={(e) => handleUpdateBranding({ version: e.target.value })}
              placeholder="1.0"
            />
          </div>
        </div>
      )}
    </div>
  );
};
