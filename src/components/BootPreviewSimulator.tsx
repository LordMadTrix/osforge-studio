import React, { useState, useEffect } from 'react';
import { OSRecipe } from '../types/os';
import { RotateCcw, Maximize2, X, Monitor } from 'lucide-react';
import { generateLogoSvg } from '../services/generators/branding';

interface BootPreviewSimulatorProps {
  recipe: OSRecipe;
  lang: 'fr' | 'en';
}

export const BootPreviewSimulator: React.FC<BootPreviewSimulatorProps> = ({ recipe, lang }) => {
  const [activeMode, setActiveMode] = useState<'plymouth' | 'grub' | 'sequence'>('plymouth');
  const [sequenceStep, setSequenceStep] = useState<'grub' | 'plymouth' | 'desktop'>('grub');
  const [isFullScreen, setIsFullScreen] = useState<boolean>(false);
  const [replayCounter, setReplayCounter] = useState<number>(0);

  const theme = recipe.branding.bootSplashTheme || 'spinner';
  const accent = recipe.branding.accentColor || '#0ea5e9';
  const osName = recipe.branding.osName || 'ForgeOS';
  const edition = recipe.branding.editionName || 'Live Edition';

  // animKey dérivé pour relancer les animations CSS dès qu'une option change
  const animKey = `${theme}-${recipe.branding.wallpaperPreset}-${accent}-${activeMode}-${replayCounter}`;

  // Gestion du déroulement de la séquence complète (GRUB -> Plymouth -> Desktop)
  useEffect(() => {
    if (activeMode !== 'sequence') return;

    const timer1 = setTimeout(() => {
      setSequenceStep('plymouth');
    }, 2800);

    const timer2 = setTimeout(() => {
      setSequenceStep('desktop');
    }, 6200);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, [activeMode, replayCounter]);

  const handleRestart = (e: React.MouseEvent) => {
    e.stopPropagation();
    setReplayCounter(prev => prev + 1);
    setSequenceStep('grub');
  };

  const handleSwitchMode = (mode: 'plymouth' | 'grub' | 'sequence') => {
    setActiveMode(mode);
    if (mode === 'sequence') {
      setSequenceStep('grub');
      setReplayCounter(prev => prev + 1);
    }
  };

  // Rendu de l'écran Plymouth animé
  const renderPlymouthScreen = () => {
    return (
      <div style={{
        width: '100%',
        height: '100%',
        background: '#04060a',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        overflow: 'hidden',
        color: '#ffffff',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}>
        {/* Style scoped des animations CSS */}
        <style>{`
          @keyframes boot-spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          @keyframes boot-pulse {
            0%, 100% { opacity: 0.35; transform: scale(0.97); }
            50% { opacity: 1; transform: scale(1.03); }
          }
          @keyframes boot-tribar-slide {
            0% { left: 0%; width: 25%; }
            50% { left: 75%; width: 25%; }
            100% { left: 0%; width: 25%; }
          }
          @keyframes boot-scanline {
            0% { transform: translateY(-100%); }
            100% { transform: translateY(1000%); }
          }
          @keyframes boot-matrix-drop {
            0% { transform: translateY(-30px); opacity: 0; }
            40% { opacity: 0.8; }
            100% { transform: translateY(120px); opacity: 0; }
          }
        `}</style>

        {/* 1. Theme SPINNER */}
        {theme === 'spinner' && (
          <div key={animKey} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
            <div style={{ position: 'relative', width: '64px', height: '64px' }}>
              <div style={{
                position: 'absolute',
                inset: 0,
                borderRadius: '50%',
                border: '3px solid rgba(255, 255, 255, 0.1)',
                borderTopColor: accent,
                animation: 'boot-spin 0.9s cubic-bezier(0.55, 0.15, 0.45, 0.85) infinite',
                boxShadow: `0 0 12px ${accent}66`,
              }} />
              <div style={{
                position: 'absolute',
                inset: '12px',
                borderRadius: '50%',
                background: `radial-gradient(circle, ${accent}33 0%, transparent 80%)`,
              }} />
            </div>

            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '1.2rem', fontWeight: 800, letterSpacing: '2px', color: '#f8fafc' }}>
                {osName}
              </div>
              <div style={{ fontSize: '0.68rem', fontWeight: 600, letterSpacing: '3px', color: accent, marginTop: '2px' }}>
                {edition.toUpperCase()}
              </div>
            </div>
          </div>
        )}

        {/* 2. Theme BGRT (OEM Motherboard handover) */}
        {theme === 'bgrt' && (
          <div key={animKey} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '30px' }}>
            {/* Logo OEM simulé */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', opacity: 0.9 }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '8px',
                border: '2px solid rgba(255, 255, 255, 0.6)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 900,
                fontSize: '1rem',
                letterSpacing: '1px',
                color: '#ffffff',
              }}>
                UEFI
              </div>
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 800, letterSpacing: '2px', color: '#ffffff' }}>PRO MOTHERBOARD</div>
                <div style={{ fontSize: '0.6rem', color: '#94a3b8' }}>BGRT Secure Handover</div>
              </div>
            </div>

            {/* Spinner sous le logo BGRT natif */}
            <div style={{ position: 'relative', width: '36px', height: '36px' }}>
              <div style={{
                position: 'absolute',
                inset: 0,
                borderRadius: '50%',
                border: '2.5px solid rgba(255, 255, 255, 0.15)',
                borderTopColor: accent,
                animation: 'boot-spin 0.8s linear infinite',
              }} />
            </div>

            <div style={{ fontSize: '0.75rem', color: '#cbd5e1', letterSpacing: '1px' }}>
              {osName}
            </div>
          </div>
        )}

        {/* 3. Theme FADE-IN */}
        {theme === 'fade-in' && (
          <div key={animKey} style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '16px',
            animation: 'boot-pulse 2.2s ease-in-out infinite',
          }}>
            <div
              style={{ width: '56px', height: '56px', filter: `drop-shadow(0 0 15px ${accent}88)` }}
              dangerouslySetInnerHTML={{ __html: generateLogoSvg(recipe) }}
            />
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, letterSpacing: '2px' }}>{osName}</div>
              <div style={{ fontSize: '0.7rem', color: accent, letterSpacing: '3px' }}>{edition}</div>
            </div>
          </div>
        )}

        {/* 4. Theme TRIBAR */}
        {theme === 'tribar' && (
          <div key={animKey} style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '30px 20px',
            boxSizing: 'border-box',
          }}>
            <div />
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '1.3rem', fontWeight: 800, letterSpacing: '2px' }}>{osName}</div>
              <div style={{ fontSize: '0.7rem', color: '#94a3b8', letterSpacing: '2px' }}>{edition}</div>
            </div>

            {/* Tribar Progress Bar at bottom */}
            <div style={{ width: '220px', height: '4px', background: 'rgba(255, 255, 255, 0.1)', position: 'relative', overflow: 'hidden', borderRadius: '2px' }}>
              <div style={{
                position: 'absolute',
                top: 0,
                bottom: 0,
                background: `linear-gradient(90deg, #ef4444, #ffffff, ${accent})`,
                borderRadius: '2px',
                animation: 'boot-tribar-slide 1.4s ease-in-out infinite',
              }} />
            </div>
          </div>
        )}

        {/* 5. Theme CYBERPUNK */}
        {theme === 'cyberpunk' && (
          <div key={animKey} style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '14px',
            position: 'relative',
          }}>
            {/* Lueur d'ambiance */}
            <div style={{
              position: 'absolute',
              width: '180px',
              height: '180px',
              background: `radial-gradient(circle, ${accent}44 0%, transparent 70%)`,
              pointerEvents: 'none',
            }} />

            <div style={{
              border: `1px solid ${accent}`,
              padding: '6px 14px',
              background: 'rgba(0, 0, 0, 0.6)',
              boxShadow: `0 0 15px ${accent}66, inset 0 0 10px ${accent}33`,
              borderRadius: '3px',
              textAlign: 'center',
            }}>
              <div style={{ fontSize: '0.62rem', color: accent, letterSpacing: '3px', marginBottom: '2px' }}>// CYBERPUNK KERNEL //</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 900, color: '#ffffff', letterSpacing: '3px' }}>
                {osName.toUpperCase()}
              </div>
            </div>

            {/* Spinner hexagonal / néon */}
            <div style={{ position: 'relative', width: '42px', height: '42px' }}>
              <div style={{
                position: 'absolute',
                inset: 0,
                border: '2px dashed #f43f5e',
                borderRadius: '50%',
                animation: 'boot-spin 3s linear infinite',
              }} />
              <div style={{
                position: 'absolute',
                inset: '4px',
                border: `2px solid ${accent}`,
                borderTopColor: 'transparent',
                borderRadius: '50%',
                animation: 'boot-spin 0.8s linear infinite reverse',
              }} />
            </div>

            <div style={{ fontSize: '0.65rem', color: '#10b981', fontFamily: 'monospace' }}>
              [ SYSTEM BOOT : OK ]
            </div>
          </div>
        )}

        {/* 6. Theme MATRIX */}
        {theme === 'matrix' && (
          <div key={animKey} style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '12px',
            fontFamily: 'monospace',
          }}>
            {/* Colonnes de caractères Matrix qui tombent */}
            <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', opacity: 0.25, pointerEvents: 'none', display: 'flex', justifyContent: 'space-around' }}>
              {[0, 1, 2, 3, 4, 5, 6].map(col => (
                <div
                  key={col}
                  style={{
                    color: '#22c55e',
                    fontSize: '10px',
                    writingMode: 'vertical-rl',
                    animation: `boot-matrix-drop ${1.2 + col * 0.3}s linear infinite`,
                  }}
                >
                  0101100101101001
                </div>
              ))}
            </div>

            <div style={{
              color: '#22c55e',
              border: '1px solid #22c55e',
              padding: '6px 12px',
              background: 'rgba(0, 20, 0, 0.7)',
              boxShadow: '0 0 15px rgba(34, 197, 94, 0.4)',
              textAlign: 'center',
            }}>
              <div style={{ fontSize: '1.1rem', fontWeight: 900, letterSpacing: '2px' }}>{osName}</div>
              <div style={{ fontSize: '0.65rem', color: '#86efac' }}>{edition}</div>
            </div>

            <div style={{ fontSize: '0.68rem', color: '#22c55e' }}>
              INITIALIZING ROOTFS...
            </div>
          </div>
        )}

        {/* Footer info indicateur */}
        <div style={{
          position: 'absolute',
          bottom: '8px',
          right: '10px',
          fontSize: '0.58rem',
          color: 'rgba(255, 255, 255, 0.35)',
          fontFamily: 'monospace',
        }}>
          Plymouth: {theme}
        </div>
      </div>
    );
  };

  // Rendu du menu GRUB 2 HD
  const renderGrubScreen = () => {
    return (
      <div style={{
        width: '100%',
        height: '100%',
        background: 'linear-gradient(135deg, #090d16 0%, #030712 100%)',
        display: 'flex',
        flexDirection: 'column',
        padding: '24px',
        boxSizing: 'border-box',
        color: '#f8fafc',
        fontFamily: 'monospace',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Titre GRUB aux couleurs d'accentuation */}
        <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: '1.15rem', fontWeight: 800, color: accent, letterSpacing: '1px' }}>
              {osName} ({edition})
            </div>
            <div style={{ fontSize: '0.66rem', color: '#94a3b8' }}>
              GRUB 2.12 HD Graphical Bootloader
            </div>
          </div>
          <div style={{
            fontSize: '0.62rem',
            padding: '2px 8px',
            borderRadius: '4px',
            background: 'rgba(255, 255, 255, 0.08)',
            color: '#94a3b8',
            border: '1px solid rgba(255, 255, 255, 0.1)',
          }}>
            UEFI x86_64
          </div>
        </div>

        {/* Cadre du menu de boot */}
        <div style={{
          flex: 1,
          border: '1px solid rgba(255, 255, 255, 0.15)',
          borderRadius: '6px',
          background: 'rgba(0, 0, 0, 0.5)',
          padding: '10px',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
        }}>
          {/* Entrée 1 : Sélectionnée par défaut */}
          <div style={{
            padding: '8px 12px',
            borderRadius: '4px',
            background: accent,
            color: '#000000',
            fontWeight: 800,
            fontSize: '0.78rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
            <span>* {osName} (Live Desktop)</span>
            <span style={{ fontSize: '0.62rem', opacity: 0.85 }}>[Entrée / Par défaut]</span>
          </div>

          {/* Entrée 2 : Failsafe */}
          <div style={{ padding: '6px 12px', fontSize: '0.75rem', color: '#cbd5e1' }}>
            &nbsp; {osName} (Mode Secours / Failsafe)
          </div>

          {/* Entrée 3 : Live Rescue RAM */}
          <div style={{ padding: '6px 12px', fontSize: '0.75rem', color: '#cbd5e1' }}>
            &nbsp; {osName} (Live Rescue - toram)
          </div>

          {/* Entrée 4 : UEFI Settings */}
          <div style={{ padding: '6px 12px', fontSize: '0.75rem', color: '#64748b' }}>
            &nbsp; Paramètres Firmware UEFI (Setup)
          </div>
        </div>

        {/* Footer avec compte à rebours */}
        <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div style={{ fontSize: '0.64rem', color: '#94a3b8', display: 'flex', justifyContent: 'space-between' }}>
            <span>Utilisez les touches ↑ et ↓ pour naviguer.</span>
            <span style={{ color: accent, fontWeight: 700 }}>Amorce automatique dans 5s...</span>
          </div>

          {/* Barre de progression du timeout */}
          <div style={{ width: '100%', height: '3px', background: 'rgba(255, 255, 255, 0.1)', borderRadius: '2px', overflow: 'hidden' }}>
            <div style={{
              width: '100%',
              height: '100%',
              background: accent,
              animation: 'boot-progress 5s linear infinite',
            }} />
          </div>
        </div>
      </div>
    );
  };

  // Rendu de l'écran Desktop final (pour la séquence complète)
  const renderDesktopScreen = () => {
    return (
      <div style={{
        width: '100%',
        height: '100%',
        background: `radial-gradient(circle at center, ${accent}22 0%, #030712 100%)`,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '16px',
        boxSizing: 'border-box',
        color: '#ffffff',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}>
        {/* Barre supérieure simulée */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '0.72rem',
          background: 'rgba(15, 23, 42, 0.8)',
          padding: '4px 12px',
          borderRadius: '6px',
          border: '1px solid rgba(255, 255, 255, 0.1)',
        }}>
          <div style={{ fontWeight: 800, color: accent }}>{osName}</div>
          <div style={{ fontSize: '0.65rem', color: '#94a3b8' }}>Session Graphique Prête</div>
          <div style={{ fontSize: '0.65rem' }}>18:30</div>
        </div>

        {/* Fenêtre terminal Fastfetch au centre */}
        <div style={{
          maxWidth: '440px',
          width: '90%',
          margin: '0 auto',
          background: 'rgba(10, 15, 28, 0.85)',
          borderRadius: '8px',
          border: `1px solid ${accent}55`,
          boxShadow: '0 10px 30px rgba(0, 0, 0, 0.7)',
          overflow: 'hidden',
          fontFamily: 'monospace',
          fontSize: '0.68rem',
        }}>
          <div style={{
            background: 'rgba(255, 255, 255, 0.05)',
            padding: '4px 8px',
            display: 'flex',
            gap: '6px',
            alignItems: 'center',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#f87171' }} />
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#fbbf24' }} />
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#4ade80' }} />
            <span style={{ fontSize: '0.62rem', color: '#94a3b8', marginLeft: '6px' }}>user@{recipe.hostname || 'forge-live'}: ~</span>
          </div>
          <div style={{ padding: '10px', color: '#e2e8f0', lineHeight: 1.4 }}>
            <div style={{ color: accent, fontWeight: 700 }}>{osName} {edition}</div>
            <div style={{ color: '#94a3b8' }}>---------------------------</div>
            <div><span style={{ color: accent }}>OS:</span> {recipe.distro.toUpperCase()} ({recipe.arch})</div>
            <div><span style={{ color: accent }}>Kernel:</span> Linux 6.12-amd64</div>
            <div><span style={{ color: accent }}>Desktop:</span> {recipe.desktop.toUpperCase()}</div>
            <div><span style={{ color: accent }}>Memory:</span> 640M / 4096M</div>
          </div>
        </div>

        {/* Dock en bas */}
        <div style={{ textAlign: 'center', fontSize: '0.65rem', color: '#94a3b8' }}>
          ✓ Démarrage terminé avec succès
        </div>
      </div>
    );
  };

  // Contenu principal de l'écran du simulateur
  const renderScreenContent = () => {
    if (activeMode === 'grub') {
      return renderGrubScreen();
    }
    if (activeMode === 'plymouth') {
      return renderPlymouthScreen();
    }
    // Séquence complète
    if (sequenceStep === 'grub') return renderGrubScreen();
    if (sequenceStep === 'plymouth') return renderPlymouthScreen();
    return renderDesktopScreen();
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
        {/* En-tête du simulateur avec boutons de mode */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '10px',
          flexWrap: 'wrap',
          gap: '8px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Monitor size={15} color="var(--cyan)" />
            <span style={{ fontSize: '0.84rem', fontWeight: 700, color: '#f1f5f9' }}>
              {lang === 'fr' ? 'Aperçu Interactif en Direct du Boot' : 'Live Interactive Boot Preview'}
            </span>
            <span className="badge badge-cyan" style={{ fontSize: '0.6rem' }}>Temps Réel</span>
          </div>

          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            {/* Switch Mode */}
            <div style={{ display: 'flex', background: 'rgba(0, 0, 0, 0.4)', padding: '2px', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}>
              <button
                type="button"
                onClick={() => handleSwitchMode('plymouth')}
                style={{
                  padding: '3px 8px',
                  borderRadius: '4px',
                  fontSize: '0.7rem',
                  background: activeMode === 'plymouth' ? 'var(--cyan)' : 'transparent',
                  color: activeMode === 'plymouth' ? '#000' : 'var(--text-muted)',
                  fontWeight: activeMode === 'plymouth' ? 700 : 500,
                  cursor: 'pointer',
                }}
              >
                🎬 Plymouth
              </button>
              <button
                type="button"
                onClick={() => handleSwitchMode('grub')}
                style={{
                  padding: '3px 8px',
                  borderRadius: '4px',
                  fontSize: '0.7rem',
                  background: activeMode === 'grub' ? 'var(--cyan)' : 'transparent',
                  color: activeMode === 'grub' ? '#000' : 'var(--text-muted)',
                  fontWeight: activeMode === 'grub' ? 700 : 500,
                  cursor: 'pointer',
                }}
              >
                📟 GRUB HD
              </button>
              <button
                type="button"
                onClick={() => handleSwitchMode('sequence')}
                style={{
                  padding: '3px 8px',
                  borderRadius: '4px',
                  fontSize: '0.7rem',
                  background: activeMode === 'sequence' ? 'var(--cyan)' : 'transparent',
                  color: activeMode === 'sequence' ? '#000' : 'var(--text-muted)',
                  fontWeight: activeMode === 'sequence' ? 700 : 500,
                  cursor: 'pointer',
                }}
              >
                ⚡ Séquence
              </button>
            </div>

            {/* Bouton Rejouer */}
            <button
              type="button"
              onClick={handleRestart}
              title={lang === 'fr' ? 'Rejouer l’animation' : 'Replay animation'}
              style={{
                padding: '4px 7px',
                borderRadius: '5px',
                background: 'rgba(255, 255, 255, 0.06)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '0.7rem',
              }}
            >
              <RotateCcw size={12} />
            </button>

            {/* Bouton Plein Écran */}
            <button
              type="button"
              onClick={() => setIsFullScreen(true)}
              title={lang === 'fr' ? 'Agrandir en plein écran' : 'Open fullscreen simulator'}
              style={{
                padding: '4px 7px',
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

        {/* Châssis de l'Écran Moniteur 16:9 */}
        <div style={{
          width: '100%',
          aspectRatio: '16 / 9',
          maxHeight: '340px',
          background: '#020617',
          borderRadius: '8px',
          border: '2px solid rgba(255, 255, 255, 0.15)',
          overflow: 'hidden',
          boxShadow: '0 12px 35px rgba(0, 0, 0, 0.8), inset 0 0 15px rgba(0, 0, 0, 0.9)',
          position: 'relative',
        }}>
          {renderScreenContent()}
        </div>

        {/* Légende interactive sous l'écran */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginTop: '6px',
          fontSize: '0.7rem',
          color: 'var(--text-muted)',
        }}>
          <span>
            {activeMode === 'plymouth' && (lang === 'fr' ? `Animation Plymouth active : « ${theme} »` : `Active Plymouth animation: "${theme}"`)}
            {activeMode === 'grub' && (lang === 'fr' ? `Menu GRUB 2 HD avec titre : « ${osName} »` : `GRUB 2 HD Menu with title: "${osName}"`)}
            {activeMode === 'sequence' && (lang === 'fr' ? `Séquence complète : GRUB → Plymouth → Bureau` : `Full sequence: GRUB → Plymouth → Desktop`)}
          </span>
          <span style={{ color: accent, fontWeight: 600 }}>
            ● {recipe.branding.accentColor}
          </span>
        </div>
      </div>

      {/* Modal Plein Écran de Simulation Immersive */}
      {isFullScreen && (
        <div
          className="modal-overlay"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.92)',
            backdropFilter: 'blur(8px)',
            zIndex: 9999,
            display: 'flex',
            flexDirection: 'column',
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
              border: `2px solid ${accent}55`,
              boxShadow: `0 0 40px ${accent}44, 0 25px 60px rgba(0, 0, 0, 0.9)`,
              overflow: 'hidden',
              position: 'relative',
              background: '#000000',
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Bouton de fermeture */}
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
                zIndex: 10,
              }}
            >
              <X size={18} />
            </button>

            {/* Contenu plein écran */}
            {renderScreenContent()}
          </div>
        </div>
      )}
    </>
  );
};
