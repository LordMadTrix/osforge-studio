import React from 'react';
import { OSRecipe } from '../types/os';
import { Palette, Sparkles, Type, TerminalSquare } from 'lucide-react';
import { ContextTip } from './ContextTip';
import { InfoTooltip } from './InfoTooltip';

interface BrandingDesignViewProps {
  recipe: OSRecipe;
  onChange: (updated: Partial<OSRecipe>) => void;
  lang: 'fr' | 'en';
  onOpenTips?: () => void;
  subSection?: 'theme' | 'appearance' | 'terminal_plymouth' | 'identity' | 'all';
}

export const BrandingDesignView: React.FC<BrandingDesignViewProps> = ({
  recipe,
  onChange,
  lang,
  onOpenTips,
  subSection = 'all',
}) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
      {/* Contextual Tip */}
      <ContextTip category="desktop" lang={lang} onOpenAllTips={onOpenTips} />

      {/* 1. Couleur d'Accent & Thème de Démarrage */}
      {(subSection === 'all' || subSection === 'theme') && (
      <div className="glass-panel" style={{ padding: '20px' }}>
        <h3 style={{ fontSize: '1.02rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Palette size={18} color="var(--pink)" />
          {lang === 'fr' ? 'Couleur d’Accentuation & Identité Graphique' : 'Accent Color & Visual Identity'}
          <InfoTooltip
            text={lang === 'fr'
              ? 'Définit la teinte dominante de l’interface, des indicateurs du terminal, du thème GRUB et du splash de démarrage.'
              : 'Defines the dominant hue for window accents, terminal highlights, GRUB theme, and boot splash.'}
          />
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Palette de sélection de la couleur d'accent */}
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '8px' }}>
              {lang === 'fr' ? 'Couleur d’Accentuation Système (Hexadécimal) :' : 'System Accent Color (Hex):'}
            </label>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
              {[
                { hex: '#0ea5e9', name: 'Sky Cyan' },
                { hex: '#84a05c', name: 'Sage Green' },
                { hex: '#a855f7', name: 'Purple Violet' },
                { hex: '#f59e0b', name: 'Amber Gold' },
                { hex: '#ec4899', name: 'Neon Pink' },
                { hex: '#f43f5e', name: 'Rose Red' },
                { hex: '#6366f1', name: 'Indigo Blue' },
                { hex: '#10b981', name: 'Emerald' },
                { hex: '#14b8a6', name: 'Teal' },
                { hex: '#e11d48', name: 'Crimson ROG' },
              ].map(c => (
                <button
                  key={c.hex}
                  type="button"
                  onClick={() => onChange({
                    branding: { ...recipe.branding, accentColor: c.hex }
                  })}
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: c.hex,
                    border: recipe.branding.accentColor === c.hex ? '3px solid #ffffff' : '2px solid transparent',
                    cursor: 'pointer',
                    boxShadow: recipe.branding.accentColor === c.hex ? `0 0 12px ${c.hex}` : 'none',
                    transform: recipe.branding.accentColor === c.hex ? 'scale(1.1)' : 'scale(1)',
                    transition: 'all 0.15s ease',
                  }}
                  title={`${c.name} (${c.hex})`}
                />
              ))}
              <input
                type="text"
                className="input-text font-mono"
                style={{ width: '90px', fontSize: '0.78rem', padding: '5px 8px', textAlign: 'center' }}
                value={recipe.branding.accentColor || '#0ea5e9'}
                onChange={(e) => onChange({
                  branding: { ...recipe.branding, accentColor: e.target.value }
                })}
              />
            </div>
          </div>

          {/* Grille : Fond d'écran & Thème Plymouth */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '6px' }}>
                🖼️ {lang === 'fr' ? 'Fond d’Écran Vectoriel HD (1920x1080) :' : 'Vector HD Wallpaper Preset:'}
              </label>
              <select
                className="input-select"
                value={recipe.branding.wallpaperPreset || 'minimal'}
                onChange={(e) => onChange({
                  branding: { ...recipe.branding, wallpaperPreset: e.target.value }
                })}
              >
                <option value="minimal">Minimal Slate (Ardoise sobre & géométrie épurée)</option>
                <option value="carbon_dark">Carbon Pro Dark (Fibre de carbone & plaque industrielle)</option>
                <option value="aurora_borealis">Aurora Borealis (Aurore boréale céleste & cimes)</option>
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
              <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '6px' }}>
                🔗 {lang === 'fr' ? 'URL Fond d’Écran Personnalisé (Optionnel) :' : 'Custom Wallpaper Image URL (Optional):'}
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
        </div>
      </div>
      )}

      {/* 2. Icônes, Curseurs & Polices d'Écriture */}
      {(subSection === 'all' || subSection === 'appearance') && (
      <div className="glass-panel" style={{ padding: '20px' }}>
        <h3 style={{ fontSize: '1.02rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Type size={18} color="var(--cyan)" />
          {lang === 'fr' ? 'Polices, Icônes & Curseur Souris' : 'Fonts, Icons & Mouse Cursor'}
          <InfoTooltip
            text={lang === 'fr'
              ? 'Configure les packs d’icônes XDG, le pointeur de souris et les familles de polices typographiques système et terminal.'
              : 'Configures system XDG icon themes, mouse pointer, and typographic font families.'}
          />
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '14px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '6px' }}>
              🎨 {lang === 'fr' ? 'Pack d’Icônes Système :' : 'System Icon Theme:'}
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
            <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '6px' }}>
              👆 {lang === 'fr' ? 'Thème de Curseur Souris :' : 'Mouse Cursor Theme:'}
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

          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '6px' }}>
              🔤 {lang === 'fr' ? 'Police d’Interface (Sans-Serif) :' : 'Interface Font (Sans-Serif):'}
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
            <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '6px' }}>
              ⌨️ {lang === 'fr' ? 'Police Terminal & Code (Monospace) :' : 'Terminal & Code Font (Monospace):'}
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
      </div>
      )}

      {/* 3. Terminal & Ergonomie Fenêtres */}
      {(subSection === 'all' || subSection === 'terminal_plymouth') && (
      <div className="glass-panel" style={{ padding: '20px' }}>
        <h3 style={{ fontSize: '1.02rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <TerminalSquare size={18} color="#10b981" />
          {lang === 'fr' ? 'Palette Terminal & Ergonomie des Fenêtres' : 'Terminal Colors & Window Ergonomics'}
          <InfoTooltip
            text={lang === 'fr'
              ? 'Configure le schéma de couleurs appliqué aux terminaux (Kitty, Alacritty, XFCE Terminal) ainsi que le positionnement des boutons de fermeture/réduction.'
              : 'Configures terminal emulator color palette and titlebar controls placement.'}
          />
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '14px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '6px' }}>
              🖥️ {lang === 'fr' ? 'Palette Terminal (Kitty, Alacritty, XFCE) :' : 'Terminal Color Scheme:'}
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
            <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '6px' }}>
              🪟 {lang === 'fr' ? 'Disposition des Boutons de Fenêtres :' : 'Window Controls Position:'}
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <button
                type="button"
                onClick={() => onChange({
                  branding: { ...recipe.branding, windowButtonsPosition: 'right' }
                })}
                style={{
                  padding: '8px 12px',
                  borderRadius: '6px',
                  fontSize: '0.8rem',
                  fontWeight: (!recipe.branding.windowButtonsPosition || recipe.branding.windowButtonsPosition === 'right') ? 700 : 500,
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
                  transition: 'all 0.15s ease',
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
                  padding: '8px 12px',
                  borderRadius: '6px',
                  fontSize: '0.8rem',
                  fontWeight: recipe.branding.windowButtonsPosition === 'left' ? 700 : 500,
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
                  transition: 'all 0.15s ease',
                }}
              >
                👈 {lang === 'fr' ? 'À Gauche (macOS)' : 'Left (macOS)'}
              </button>
            </div>
          </div>
        </div>

        {/* Thème Plymouth Splash */}
        <div style={{ marginTop: '14px' }}>
          <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '6px' }}>
            🎬 {lang === 'fr' ? 'Thème Plymouth (Boot Splash au Démarrage) :' : 'Plymouth Splash Theme:'}
          </label>
          <select
            className="input-select"
            value={recipe.branding.bootSplashTheme}
            onChange={(e) => onChange({
              branding: { ...recipe.branding, bootSplashTheme: e.target.value as any }
            })}
          >
            <option value="osforge-custom">⭐ OSForge Custom (Sur-mesure avec Logo & Accent)</option>
            <option value="spinner">Minimal Spinner (Roue moderne)</option>
            <option value="bgrt">BGRT (Logo UEFI constructeur natif)</option>
            <option value="fade-in">Fade-In (Transition douce)</option>
            <option value="tribar">Tribar (Barre de progression classique)</option>
            <option value="solar">Solar (Éruptions coronales animées)</option>
            <option value="glow">Glow Minimal (Lueur diffuse)</option>
            <option value="cyberpunk">Cyberpunk Glow (Lueur futuriste)</option>
            <option value="matrix">Matrix Glow</option>
          </select>
        </div>
      </div>
      )}

      {/* 4. Options d'Intégration & Identité Système */}
      {(subSection === 'all' || subSection === 'identity') && (
      <div className="glass-panel" style={{ padding: '20px' }}>
        <h3 style={{ fontSize: '1.02rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Sparkles size={18} color="#f59e0b" />
          {lang === 'fr' ? 'Intégration & Modules d’Identité Système' : 'System Integration & Identity Modules'}
          <InfoTooltip
            text={lang === 'fr'
              ? 'Active les scripts de personnalisation réels injectés dans /etc/os-release, /etc/issue, le thème GRUB 2 et le shell interactif.'
              : 'Enables genuine customization scripts injected into /etc/os-release, /etc/issue, GRUB 2 theme and interactive shell.'}
          />
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
          <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '0.82rem', color: 'var(--text-main)', cursor: 'pointer', padding: '10px', background: 'rgba(10, 15, 28, 0.4)', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}>
            <input
              type="checkbox"
              style={{ marginTop: '2px' }}
              checked={recipe.branding.enableCustomOsRelease !== false}
              onChange={(e) => onChange({
                branding: { ...recipe.branding, enableCustomOsRelease: e.target.checked }
              })}
            />
            <div>
              <div style={{ fontWeight: 600 }}>{lang === 'fr' ? 'Identité Système (/etc/os-release & Pixmap)' : 'System Identity (/etc/os-release)'}</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{lang === 'fr' ? 'Injecte le nom et le logo personnalisé dans les métadonnées système' : 'Injects custom name and logo into system metadata'}</div>
            </div>
          </label>

          <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '0.82rem', color: 'var(--text-main)', cursor: 'pointer', padding: '10px', background: 'rgba(10, 15, 28, 0.4)', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}>
            <input
              type="checkbox"
              style={{ marginTop: '2px' }}
              checked={recipe.branding.enableFastfetchMotd !== false}
              onChange={(e) => onChange({
                branding: { ...recipe.branding, enableFastfetchMotd: e.target.checked }
              })}
            />
            <div>
              <div style={{ fontWeight: 600 }}>{lang === 'fr' ? 'Bannière Terminal & Fastfetch aux couleurs OS' : 'Terminal Banner & Fastfetch'}</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{lang === 'fr' ? 'Affiche automatiquement le logo et la télémétrie à l’ouverture du terminal' : 'Displays OS logo and specs upon terminal session open'}</div>
            </div>
          </label>

          <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '0.82rem', color: 'var(--text-main)', cursor: 'pointer', padding: '10px', background: 'rgba(10, 15, 28, 0.4)', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}>
            <input
              type="checkbox"
              style={{ marginTop: '2px' }}
              checked={Boolean(recipe.branding.enableGrubTheme)}
              onChange={(e) => onChange({
                branding: { ...recipe.branding, enableGrubTheme: e.target.checked }
              })}
            />
            <div>
              <div style={{ fontWeight: 600 }}>{lang === 'fr' ? 'Thème GRUB 2 Graphique HD Coordonné' : 'HD Graphical GRUB 2 Theme'}</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{lang === 'fr' ? 'Menu de boot GRUB haute résolution assorti au fond d’écran et à la couleur d’accent' : 'High-resolution boot menu matched to wallpaper and accent'}</div>
            </div>
          </label>

          <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '0.82rem', color: 'var(--text-main)', cursor: 'pointer', padding: '10px', background: 'rgba(10, 15, 28, 0.4)', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}>
            <input
              type="checkbox"
              style={{ marginTop: '2px' }}
              checked={recipe.branding.enableProAliases !== false}
              onChange={(e) => onChange({
                branding: { ...recipe.branding, enableProAliases: e.target.checked }
              })}
            />
            <div>
              <div style={{ fontWeight: 600 }}>{lang === 'fr' ? 'Pack Raccourcis & Aliases Shell Pro' : 'Pro Shell Aliases (sysupdate, ports...)'}</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{lang === 'fr' ? 'Raccourcis sysupdate, myip, ports, meminfo dans ~/.bashrc et /etc/bash.bashrc' : 'Injects sysupdate, myip, ports, meminfo shortcuts into bashrc'}</div>
            </div>
          </label>

          <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '0.82rem', color: 'var(--text-main)', cursor: 'pointer', padding: '10px', background: 'rgba(10, 15, 28, 0.4)', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}>
            <input
              type="checkbox"
              style={{ marginTop: '2px' }}
              checked={Boolean(recipe.branding.enableStartupSound)}
              onChange={(e) => onChange({
                branding: { ...recipe.branding, enableStartupSound: e.target.checked }
              })}
            />
            <div>
              <div style={{ fontWeight: 600 }}>{lang === 'fr' ? 'Son de Démarrage / Chime Audio au login' : 'Startup Sound Chime on Login'}</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{lang === 'fr' ? 'Joue un jingle sonore harmonieux à l’ouverture de la session graphique' : 'Plays a subtle harmonic audio chime upon desktop login'}</div>
            </div>
          </label>
        </div>
      </div>
      )}
    </div>
  );
};
