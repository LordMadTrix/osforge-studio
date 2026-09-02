import React, { useState } from 'react';
import { OSRecipe } from '../types/os';
import { Maximize2, X, Terminal, Search, Folder, Globe, Settings, Gamepad2, Code, ShieldCheck } from 'lucide-react';
import { generateWallpaperSvg, generateLogoSvg } from '../services/generators/branding';

interface LiveDesktopSimulatorProps {
  recipe: OSRecipe;
  lang: 'fr' | 'en';
}

export const LiveDesktopSimulator: React.FC<LiveDesktopSimulatorProps> = ({ recipe, lang }) => {
  const [isMenuOpen, setIsMenuOpen] = useState<boolean>(false);
  const [isFullScreen, setIsFullScreen] = useState<boolean>(false);
  const [activeWindow, setActiveWindow] = useState<'terminal' | 'settings'>('terminal');

  const accent = recipe.branding.accentColor || '#0ea5e9';
  const osName = recipe.branding.osName || 'ForgeOS';
  const edition = recipe.branding.editionName || 'Live Edition';
  const desktop = recipe.desktop || 'kde';
  const buttonsOnLeft = recipe.branding.windowButtonsPosition === 'left';
  const scheme = recipe.branding.terminalColorScheme || 'tokyo-night';

  // Couleurs de fond de terminal selon le scheme
  const terminalBgMap: Record<string, string> = {
    'tokyo-night': '#1a1b26',
    'catppuccin-mocha': '#1e1e2e',
    'dracula': '#282a36',
    'nord': '#2e3440',
    'gruvbox-dark': '#282828',
    'cyberpunk-neon': '#080811',
  };
  const termBg = terminalBgMap[scheme] || '#1a1b26';

  // Rendu de la barre des tâches / panneau selon l'environnement de bureau
  const renderDesktopPanel = () => {
    // 1. GNOME : Barre supérieure + Dock centré en bas
    if (desktop === 'gnome') {
      return (
        <>
          {/* Top Bar GNOME */}
          <div style={{
            height: '26px',
            background: 'rgba(10, 10, 15, 0.85)',
            backdropFilter: 'blur(12px)',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '0 12px',
            fontSize: '0.7rem',
            color: '#f8fafc',
            zIndex: 15,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                type="button"
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                style={{
                  background: isMenuOpen ? 'rgba(255, 255, 255, 0.15)' : 'transparent',
                  border: 'none',
                  color: '#ffffff',
                  fontWeight: 700,
                  fontSize: '0.72rem',
                  cursor: 'pointer',
                  padding: '2px 8px',
                  borderRadius: '4px',
                }}
              >
                Activités
              </button>
              <span style={{ color: '#94a3b8', fontSize: '0.66rem' }}>{osName}</span>
            </div>

            <div style={{ fontWeight: 600, fontSize: '0.7rem' }}>
              Mer. 18:45
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.65rem', color: '#cbd5e1' }}>
              <span>FR</span>
              <span>📶</span>
              <span>🔊</span>
              <span>🔋 98%</span>
            </div>
          </div>

          {/* Floating Dash / Dock GNOME */}
          <div style={{
            position: 'absolute',
            bottom: '10px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(15, 23, 42, 0.75)',
            backdropFilter: 'blur(16px)',
            borderRadius: '16px',
            padding: '4px 10px',
            display: 'flex',
            gap: '8px',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            boxShadow: '0 10px 25px rgba(0, 0, 0, 0.6)',
            zIndex: 10,
          }}>
            <button
              onClick={() => setActiveWindow('terminal')}
              title="Terminal"
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: activeWindow === 'terminal' ? 'rgba(255, 255, 255, 0.15)' : 'transparent',
                border: activeWindow === 'terminal' ? `1px solid ${accent}` : 'none',
                color: accent,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
            >
              <Terminal size={18} />
            </button>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#38bdf8' }}>
              <Globe size={18} />
            </div>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fbbf24' }}>
              <Folder size={18} />
            </div>
            <button
              onClick={() => setActiveWindow('settings')}
              title="Paramètres"
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: activeWindow === 'settings' ? 'rgba(255, 255, 255, 0.15)' : 'transparent',
                border: activeWindow === 'settings' ? `1px solid ${accent}` : 'none',
                color: '#94a3b8',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
            >
              <Settings size={18} />
            </button>
          </div>
        </>
      );
    }

    // 2. KDE Plasma & Autres (XFCE, Cinnamon) : Barre des tâches inférieure avec Start Menu
    return (
      <div style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: '34px',
        background: 'rgba(15, 23, 42, 0.88)',
        backdropFilter: 'blur(16px)',
        borderTop: '1px solid rgba(255, 255, 255, 0.1)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '0 10px',
        color: '#ffffff',
        zIndex: 15,
      }}>
        {/* Lanceur d'applications & Tâches actives */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            type="button"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            style={{
              padding: '3px 8px',
              borderRadius: '5px',
              background: isMenuOpen ? accent : 'rgba(255, 255, 255, 0.08)',
              color: isMenuOpen ? '#000000' : '#ffffff',
              border: `1px solid ${accent}55`,
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              fontWeight: 800,
              fontSize: '0.72rem',
              cursor: 'pointer',
            }}
          >
            <div style={{ width: '14px', height: '14px' }} dangerouslySetInnerHTML={{ __html: generateLogoSvg(recipe) }} />
            <span>{osName}</span>
          </button>

          {/* Bouton Terminal actif */}
          <button
            type="button"
            onClick={() => setActiveWindow('terminal')}
            style={{
              padding: '3px 8px',
              borderRadius: '5px',
              background: activeWindow === 'terminal' ? 'rgba(255, 255, 255, 0.15)' : 'rgba(255, 255, 255, 0.04)',
              borderBottom: activeWindow === 'terminal' ? `2px solid ${accent}` : 'none',
              border: 'none',
              color: '#ffffff',
              fontSize: '0.68rem',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              cursor: 'pointer',
            }}
          >
            <Terminal size={13} color={accent} />
            <span>Terminal</span>
          </button>

          {/* Bouton Paramètres */}
          <button
            type="button"
            onClick={() => setActiveWindow('settings')}
            style={{
              padding: '3px 8px',
              borderRadius: '5px',
              background: activeWindow === 'settings' ? 'rgba(255, 255, 255, 0.15)' : 'rgba(255, 255, 255, 0.04)',
              borderBottom: activeWindow === 'settings' ? `2px solid ${accent}` : 'none',
              border: 'none',
              color: '#ffffff',
              fontSize: '0.68rem',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              cursor: 'pointer',
            }}
          >
            <Settings size={13} />
            <span>Système</span>
          </button>
        </div>

        {/* System Tray KDE */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.66rem', color: '#cbd5e1' }}>
          <span>📶</span>
          <span>🔊</span>
          <div style={{ textAlign: 'right', lineHeight: 1.1 }}>
            <div style={{ fontWeight: 600 }}>18:45</div>
            <div style={{ fontSize: '0.58rem', color: '#94a3b8' }}>02/09/2026</div>
          </div>
        </div>
      </div>
    );
  };

  // Rendu du menu des applications déroulant (Start Menu)
  const renderAppMenu = () => {
    if (!isMenuOpen) return null;

    return (
      <div style={{
        position: 'absolute',
        bottom: desktop === 'gnome' ? 'auto' : '40px',
        top: desktop === 'gnome' ? '30px' : 'auto',
        left: '12px',
        width: '260px',
        background: 'rgba(15, 23, 42, 0.94)',
        backdropFilter: 'blur(20px)',
        borderRadius: '10px',
        border: `1px solid ${accent}55`,
        boxShadow: `0 15px 35px rgba(0, 0, 0, 0.8), 0 0 15px ${accent}22`,
        padding: '12px',
        zIndex: 25,
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        color: '#ffffff',
        fontFamily: 'system-ui, sans-serif',
      }}>
        {/* Recherche */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          background: 'rgba(0, 0, 0, 0.4)',
          borderRadius: '6px',
          padding: '5px 8px',
          border: '1px solid rgba(255, 255, 255, 0.1)',
        }}>
          <Search size={13} color="#94a3b8" />
          <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Rechercher une application...</span>
        </div>

        {/* Applications Favorites */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div style={{ fontSize: '0.62rem', fontWeight: 700, color: accent, letterSpacing: '1px' }}>FAVORIS</div>
          {[
            { icon: <Terminal size={14} color={accent} />, name: 'Terminal Système' },
            { icon: <Globe size={14} color="#38bdf8" />, name: 'Navigateur Web' },
            { icon: <Code size={14} color="#a855f7" />, name: 'VSCodium IDE' },
            { icon: <Gamepad2 size={14} color="#f43f5e" />, name: 'Steam Gamescope' },
            { icon: <ShieldCheck size={14} color="#10b981" />, name: 'Sécurité & Pare-feu' },
          ].map((app, idx) => (
            <div
              key={idx}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '5px 8px',
                borderRadius: '5px',
                fontSize: '0.72rem',
                cursor: 'pointer',
                background: 'rgba(255, 255, 255, 0.03)',
              }}
            >
              {app.icon}
              <span>{app.name}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Rendu de la fenêtre simulée
  const renderSimulatedWindow = () => {
    return (
      <div style={{
        position: 'absolute',
        top: '12%',
        left: '12%',
        width: '76%',
        height: '70%',
        borderRadius: '8px',
        overflow: 'hidden',
        background: termBg,
        border: `1px solid ${accent}66`,
        boxShadow: `0 15px 40px rgba(0, 0, 0, 0.8), 0 0 20px ${accent}33`,
        display: 'flex',
        flexDirection: 'column',
        zIndex: 5,
      }}>
        {/* Barre de titre de la fenêtre */}
        <div style={{
          height: '28px',
          background: 'rgba(10, 15, 25, 0.8)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 10px',
        }}>
          {/* Boutons de fenêtre à gauche (style macOS) */}
          {buttonsOnLeft ? (
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#ef4444' }} />
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#f59e0b' }} />
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#10b981' }} />
            </div>
          ) : (
            <div style={{ fontSize: '0.7rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Terminal size={12} color={accent} />
              <span>{activeWindow === 'terminal' ? 'terminal — fastfetch' : 'Paramètres Système'}</span>
            </div>
          )}

          {/* Titre central si boutons à gauche */}
          {buttonsOnLeft && (
            <div style={{ fontSize: '0.68rem', color: '#cbd5e1', fontWeight: 600 }}>
              {activeWindow === 'terminal' ? 'terminal — fastfetch' : 'Paramètres Système'}
            </div>
          )}

          {/* Boutons de fenêtre à droite (standard) */}
          {!buttonsOnLeft ? (
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', color: '#94a3b8', fontSize: '0.72rem' }}>
              <span>—</span>
              <span>□</span>
              <span style={{ color: '#ef4444' }}>✕</span>
            </div>
          ) : (
            <div style={{ width: '40px' }} />
          )}
        </div>

        {/* Contenu intérieur : Terminal Fastfetch ou Paramètres */}
        {activeWindow === 'terminal' ? (
          <div style={{
            flex: 1,
            padding: '12px',
            fontFamily: 'monospace',
            fontSize: '0.68rem',
            color: '#e2e8f0',
            lineHeight: 1.45,
            overflow: 'hidden',
          }}>
            <div style={{ color: accent, fontWeight: 700, marginBottom: '4px' }}>
              user@{recipe.hostname || 'forge-box'}:~$ fastfetch
            </div>
            <div style={{ display: 'flex', gap: '16px', marginTop: '6px' }}>
              {/* Logo OS textuel */}
              <div style={{ color: accent, fontWeight: 900, whiteSpace: 'pre', fontSize: '0.65rem' }}>
{`    /\\
   /  \\
  / /\\ \\
 / /__\\ \\
/________\\`}
              </div>

              {/* Spécifications réelles */}
              <div>
                <div style={{ fontWeight: 800, color: '#ffffff' }}>user@{recipe.hostname || 'forge-box'}</div>
                <div style={{ color: '#64748b' }}>---------------------------</div>
                <div><span style={{ color: accent }}>OS:</span> {osName} {edition} ({recipe.distro})</div>
                <div><span style={{ color: accent }}>Kernel:</span> Linux 6.12 ({recipe.kernel})</div>
                <div><span style={{ color: accent }}>Uptime:</span> 12 mins</div>
                <div><span style={{ color: accent }}>DE / WM:</span> {desktop.toUpperCase()} (Wayland)</div>
                <div><span style={{ color: accent }}>Icons:</span> {recipe.branding.iconTheme || 'Papirus-Dark'}</div>
                <div><span style={{ color: accent }}>Cursor:</span> {recipe.branding.cursorTheme || 'breeze'}</div>
                <div><span style={{ color: accent }}>Terminal Palette:</span> {scheme}</div>
              </div>
            </div>
          </div>
        ) : (
          <div style={{ flex: 1, padding: '14px', color: '#e2e8f0', fontSize: '0.72rem', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ fontWeight: 800, color: accent, fontSize: '0.85rem' }}>Identité & Thème Système</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <div style={{ background: 'rgba(255, 255, 255, 0.05)', padding: '8px', borderRadius: '5px' }}>
                <div style={{ color: '#94a3b8', fontSize: '0.62rem' }}>Couleur Accentuation</div>
                <div style={{ color: accent, fontWeight: 700 }}>{accent}</div>
              </div>
              <div style={{ background: 'rgba(255, 255, 255, 0.05)', padding: '8px', borderRadius: '5px' }}>
                <div style={{ color: '#94a3b8', fontSize: '0.62rem' }}>Police Interface</div>
                <div style={{ fontWeight: 700 }}>{recipe.branding.fontFamily || 'Inter'}</div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      <div style={{
        marginTop: '12px',
        padding: '12px',
        background: 'rgba(10, 15, 28, 0.7)',
        borderRadius: '8px',
        border: '1px solid rgba(56, 189, 248, 0.25)',
      }}>
        {/* Header du simulateur */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '10px',
          flexWrap: 'wrap',
          gap: '8px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '0.84rem', fontWeight: 700, color: '#f1f5f9' }}>
              🖥️ {lang === 'fr' ? 'Aperçu du Bureau en Direct' : 'Live Desktop Environment Preview'}
            </span>
            <span className="badge badge-cyan" style={{ fontSize: '0.6rem' }}>{desktop.toUpperCase()}</span>
          </div>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button
              type="button"
              onClick={() => setIsFullScreen(true)}
              style={{
                padding: '4px 8px',
                borderRadius: '5px',
                background: 'rgba(56, 189, 248, 0.12)',
                border: '1px solid rgba(56, 189, 248, 0.3)',
                color: '#38bdf8',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '0.7rem',
                fontWeight: 600,
              }}
            >
              <Maximize2 size={12} />
              <span>{lang === 'fr' ? 'Plein Écran' : 'Fullscreen'}</span>
            </button>
          </div>
        </div>

        {/* Châssis Moniteur 16:9 */}
        <div style={{
          width: '100%',
          aspectRatio: '16 / 9',
          maxHeight: '360px',
          background: '#020617',
          borderRadius: '8px',
          border: '2px solid rgba(255, 255, 255, 0.15)',
          overflow: 'hidden',
          boxShadow: '0 12px 35px rgba(0, 0, 0, 0.8)',
          position: 'relative',
        }}>
          {/* Fond d'écran SVG en direct */}
          <div
            style={{ position: 'absolute', inset: 0, zIndex: 1, pointerEvents: 'none' }}
            dangerouslySetInnerHTML={{ __html: generateWallpaperSvg(recipe) }}
          />

          {/* Fenêtre active simulée */}
          {renderSimulatedWindow()}

          {/* Menu des applications déroulant */}
          {renderAppMenu()}

          {/* Panneau / Dock du bureau */}
          {renderDesktopPanel()}
        </div>

        {/* Légende */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginTop: '6px',
          fontSize: '0.7rem',
          color: 'var(--text-muted)',
        }}>
          <span>
            {lang === 'fr'
              ? `Bureau ${desktop.toUpperCase()} avec disposition ${buttonsOnLeft ? 'gauche (macOS)' : 'droite (standard)'} et palette ${scheme}`
              : `${desktop.toUpperCase()} Desktop with ${buttonsOnLeft ? 'left (macOS)' : 'right (standard)'} controls and ${scheme} palette`}
          </span>
          <span style={{ color: accent, fontWeight: 600 }}>● {accent}</span>
        </div>
      </div>

      {/* Modal Plein Écran */}
      {isFullScreen && (
        <div
          className="modal-overlay"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.94)',
            backdropFilter: 'blur(10px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
          }}
          onClick={() => setIsFullScreen(false)}
        >
          <div
            style={{
              width: '95vw',
              maxWidth: '1200px',
              aspectRatio: '16 / 9',
              borderRadius: '12px',
              border: `2px solid ${accent}66`,
              boxShadow: `0 0 50px ${accent}44, 0 25px 60px rgba(0, 0, 0, 0.9)`,
              overflow: 'hidden',
              position: 'relative',
              background: '#000000',
            }}
            onClick={e => e.stopPropagation()}
          >
            <button
              onClick={() => setIsFullScreen(false)}
              style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                background: 'rgba(0, 0, 0, 0.6)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '50%',
                width: '36px',
                height: '36px',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                zIndex: 30,
              }}
            >
              <X size={18} />
            </button>

            <div
              style={{ position: 'absolute', inset: 0, zIndex: 1, pointerEvents: 'none' }}
              dangerouslySetInnerHTML={{ __html: generateWallpaperSvg(recipe) }}
            />
            {renderSimulatedWindow()}
            {renderAppMenu()}
            {renderDesktopPanel()}
          </div>
        </div>
      )}
    </>
  );
};
