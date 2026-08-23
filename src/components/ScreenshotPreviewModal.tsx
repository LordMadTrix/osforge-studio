import React, { useState } from 'react';
import { DistroInfo, DesktopInfo, OSRecipe } from '../types/os';
import { DISTROS } from '../data/distros';
import { DESKTOPS } from '../data/desktopEnvironments';
import { X, Check, Image as ImageIcon, Camera } from 'lucide-react';
import { DISTRO_SCREENSHOTS, DESKTOP_SCREENSHOTS } from '../data/screenshots';

interface ScreenshotPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDistro?: DistroInfo;
  selectedDesktop?: DesktopInfo;
  recipe: OSRecipe;
  onApplyDistro?: (distroId: string) => void;
  onApplyDesktop?: (desktopId: string) => void;
  lang: 'fr' | 'en';
}

export const ScreenshotPreviewModal: React.FC<ScreenshotPreviewModalProps> = ({
  isOpen,
  onClose,
  selectedDistro,
  selectedDesktop,
  recipe,
  onApplyDistro,
  onApplyDesktop,
  lang,
}) => {
  const [activeTab, setActiveTab] = useState<'distro' | 'desktop'>('distro');
  const [currentDistroId, setCurrentDistroId] = useState<string>(selectedDistro?.id || recipe.distro);
  const [currentDesktopId, setCurrentDesktopId] = useState<string>(selectedDesktop?.id || recipe.desktop);

  if (!isOpen) return null;

  const currentDistro = DISTROS.find(d => d.id === currentDistroId) || DISTROS[0];
  const currentDesktop = DESKTOPS.find(d => d.id === currentDesktopId) || DESKTOPS[1];
  const currentScreenshot = activeTab === 'distro' ? DISTRO_SCREENSHOTS[currentDistroId] : DESKTOP_SCREENSHOTS[currentDesktopId];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content"
        style={{
          maxWidth: '960px',
          width: '95%',
          maxHeight: '90vh',
          padding: 0,
          overflow: 'hidden',
          background: '#090e1a',
          border: '1px solid rgba(255, 255, 255, 0.14)',
          boxShadow: '0 25px 60px rgba(0, 0, 0, 0.8)',
          display: 'flex',
          flexDirection: 'column',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '14px 20px',
          borderBottom: '1px solid var(--border-subtle)',
          background: '#0c1222',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '6px',
              background: 'rgba(14, 165, 233, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--cyan)',
            }}>
              <ImageIcon size={18} />
            </div>
            <div>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#f8fafc', margin: 0 }}>
                {lang === 'fr' ? 'Galerie des Captures & Aperçus Graphiques' : 'Visual Screenshots & Previews'}
              </h3>
              <p style={{ fontSize: '0.74rem', color: 'var(--text-muted)', margin: 0 }}>
                {lang === 'fr' ? 'Aperçu en direct des distributions (stables & beta) et environnements graphiques' : 'Live visual mockups of distros and desktop environments'}
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {/* Tab switch */}
            <div style={{
              display: 'flex',
              background: 'rgba(15, 23, 42, 0.8)',
              padding: '2px',
              borderRadius: '6px',
              border: '1px solid var(--border-subtle)',
            }}>
              <button
                onClick={() => setActiveTab('distro')}
                style={{
                  padding: '4px 10px',
                  borderRadius: '4px',
                  border: 'none',
                  background: activeTab === 'distro' ? 'var(--cyan)' : 'transparent',
                  color: activeTab === 'distro' ? '#ffffff' : 'var(--text-muted)',
                  fontSize: '0.76rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                🐧 {lang === 'fr' ? 'Distributions' : 'Distros'}
              </button>
              <button
                onClick={() => setActiveTab('desktop')}
                style={{
                  padding: '4px 10px',
                  borderRadius: '4px',
                  border: 'none',
                  background: activeTab === 'desktop' ? 'var(--cyan)' : 'transparent',
                  color: activeTab === 'desktop' ? '#ffffff' : 'var(--text-muted)',
                  fontSize: '0.76rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                🖥️ {lang === 'fr' ? 'Bureaux & WM' : 'Desktops & WMs'}
              </button>
            </div>

            <button
              onClick={onClose}
              style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', display: 'flex' }}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Modal Body with Selector Carousel + Main Screen Showcase */}
        <div style={{ padding: '16px 20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {/* Quick Selector Pills */}
          <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '4px' }}>
            {activeTab === 'distro' ? (
              DISTROS.map(d => (
                <button
                  key={d.id}
                  onClick={() => setCurrentDistroId(d.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '5px 12px',
                    borderRadius: '6px',
                    border: currentDistroId === d.id ? `1px solid ${d.color}` : '1px solid var(--border-subtle)',
                    background: currentDistroId === d.id ? 'rgba(255, 255, 255, 0.08)' : 'rgba(15, 23, 42, 0.5)',
                    color: currentDistroId === d.id ? '#f8fafc' : 'var(--text-muted)',
                    fontSize: '0.76rem',
                    fontWeight: currentDistroId === d.id ? 600 : 400,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                  }}
                >
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: d.color }} />
                  <span>{d.name}</span>
                  {DISTRO_SCREENSHOTS[d.id] && (
                    <Camera size={10} color="#34d399" />
                  )}
                  {d.isBeta && (
                    <span style={{ fontSize: '0.6rem', padding: '0 4px', borderRadius: '3px', background: '#f59e0b', color: '#000', fontWeight: 700 }}>
                      BETA
                    </span>
                  )}
                </button>
              ))
            ) : (
              DESKTOPS.map(de => (
                <button
                  key={de.id}
                  onClick={() => setCurrentDesktopId(de.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '5px 12px',
                    borderRadius: '6px',
                    border: currentDesktopId === de.id ? '1px solid var(--cyan)' : '1px solid var(--border-subtle)',
                    background: currentDesktopId === de.id ? 'rgba(14, 165, 233, 0.12)' : 'rgba(15, 23, 42, 0.5)',
                    color: currentDesktopId === de.id ? 'var(--cyan)' : 'var(--text-muted)',
                    fontSize: '0.76rem',
                    fontWeight: currentDesktopId === de.id ? 600 : 400,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                  }}
                >
                  <span>{de.name.split(' ')[0]}</span>
                  {DESKTOP_SCREENSHOTS[de.id] && (
                    <Camera size={10} color="#34d399" />
                  )}
                  {de.versionBadge && (
                    <span style={{ fontSize: '0.62rem', color: 'var(--text-dim)' }}>
                      {de.versionBadge}
                    </span>
                  )}
                </button>
              ))
            )}
          </div>

          {/* Real screenshot (when available) */}
          {currentScreenshot && (
            <div style={{
              borderRadius: '10px',
              overflow: 'hidden',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              boxShadow: '0 15px 35px rgba(0, 0, 0, 0.5)',
              position: 'relative',
              background: '#000',
            }}>
              <img
                src={`${import.meta.env.BASE_URL}${currentScreenshot.src.replace(/^\//, '')}`}
                alt={activeTab === 'distro' ? currentDistro.name : currentDesktop.name}
                style={{ width: '100%', display: 'block' }}
              />
              <div style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                padding: '6px 12px',
                background: 'linear-gradient(to top, rgba(0,0,0,0.75), transparent)',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '0.68rem',
                color: 'rgba(255,255,255,0.75)',
              }}>
                <Camera size={11} />
                <span>
                  {lang === 'fr' ? 'Vraie capture d’écran' : 'Real screenshot'} — {currentScreenshot.author} ({currentScreenshot.license}) ·{' '}
                  <a href={currentScreenshot.source} target="_blank" rel="noreferrer" style={{ color: 'rgba(255,255,255,0.75)' }}>
                    Wikimedia Commons
                  </a>
                </span>
              </div>
            </div>
          )}

          {/* High-Resolution Interactive Mockup Display Frame (fallback simulation) */}
          {!currentScreenshot && (
          <div style={{
            borderRadius: '10px',
            overflow: 'hidden',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            background: activeTab === 'distro'
              ? (currentDistro.screenshotMockup?.wallpaper || 'linear-gradient(135deg, #090e1a 0%, #1e293b 100%)')
              : currentDesktop.previewGradient,
            boxShadow: 'inset 0 0 100px rgba(0, 0, 0, 0.4), 0 15px 35px rgba(0, 0, 0, 0.5)',
            minHeight: '340px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            position: 'relative',
          }}>
            {/* Mockup Top Status Bar */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '6px 14px',
              background: 'rgba(0, 0, 0, 0.65)',
              backdropFilter: 'blur(10px)',
              borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
              fontSize: '0.74rem',
              color: '#e2e8f0',
              fontFamily: 'var(--font-mono)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ width: '9px', height: '9px', borderRadius: '50%', background: activeTab === 'distro' ? currentDistro.color : 'var(--cyan)' }} />
                <span style={{ fontWeight: 600 }}>
                  {activeTab === 'distro' ? (currentDistro.screenshotMockup?.topBarTitle || currentDistro.name) : currentDesktop.name}
                </span>
                {activeTab === 'distro' && currentDistro.isBeta && (
                  <span className="badge badge-amber" style={{ fontSize: '0.58rem', padding: '0 4px' }}>
                    CANAL TEST / BETA
                  </span>
                )}
              </div>

              <div style={{ display: 'flex', gap: '14px', alignItems: 'center', color: 'var(--text-dim)', fontSize: '0.7rem' }}>
                <span>CPU: 4%</span>
                <span>RAM: {activeTab === 'distro' ? `${currentDistro.baseRamMB} Mo` : `${currentDesktop.ramUsageMB} Mo`}</span>
                <span>Wayland</span>
                <span>10:42</span>
              </div>
            </div>

            {/* Mockup Center Windows Area */}
            <div style={{ padding: '24px 30px', flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              {/* Window Box */}
              <div style={{
                maxWidth: '680px',
                width: '100%',
                background: 'rgba(5, 10, 20, 0.88)',
                backdropFilter: 'blur(16px)',
                borderRadius: '8px',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                boxShadow: '0 12px 40px rgba(0, 0, 0, 0.7)',
                overflow: 'hidden',
              }}>
                {/* Window Title Bar */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '7px 12px',
                  background: 'rgba(255, 255, 255, 0.04)',
                  borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                }}>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#ef4444' }} />
                    <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#f59e0b' }} />
                    <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#10b981' }} />
                  </div>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                    {activeTab === 'distro' ? 'terminal — fastfetch & sysinfo' : (currentDesktop.screenshotMockup?.activeWindow || 'Desktop Session')}
                  </span>
                  <div style={{ width: '30px' }} />
                </div>

                {/* Window Body */}
                <div style={{ padding: '16px', fontFamily: 'var(--font-mono)', fontSize: '0.8rem', lineHeight: '1.5' }}>
                  {activeTab === 'distro' ? (
                    <pre style={{ margin: 0, color: '#38bdf8', whiteSpace: 'pre-wrap' }}>
                      <code>{currentDistro.screenshotMockup?.terminalText || `OS: ${currentDistro.name}\nKernel: Linux 6.13-cachyos\nRAM: ${currentDistro.baseRamMB} MB`}</code>
                    </pre>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <div style={{ color: '#38bdf8', fontWeight: 600 }}>
                        {currentDesktop.name} — {currentDesktop.type}
                      </div>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.76rem' }}>
                        {currentDesktop.description}
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '6px' }}>
                        {currentDesktop.features.map((f, i) => (
                          <span key={i} className="badge badge-cyan" style={{ fontSize: '0.68rem' }}>
                            ✓ {f}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Mockup Bottom Dock / Bar */}
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              padding: '8px 16px',
              background: 'rgba(0, 0, 0, 0.5)',
              backdropFilter: 'blur(8px)',
              borderTop: '1px solid rgba(255, 255, 255, 0.06)',
            }}>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                {(activeTab === 'distro' ? ['Terminal', 'Fichiers', 'Navigateur', 'Docker', 'Paramètres'] : (currentDesktop.screenshotMockup?.widgets || ['App Menu', 'Terminal', 'Files', 'Settings'])).map((w, idx) => (
                  <span
                    key={idx}
                    style={{
                      padding: '3px 10px',
                      borderRadius: '4px',
                      background: 'rgba(255, 255, 255, 0.08)',
                      color: '#f8fafc',
                      fontSize: '0.7rem',
                      fontFamily: 'var(--font-mono)',
                    }}
                  >
                    {w}
                  </span>
                ))}
              </div>
            </div>
          </div>
          )}

          {/* Details & Apply Action Bar */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px',
            padding: '12px 16px',
            background: 'rgba(15, 23, 42, 0.6)',
            borderRadius: '8px',
            border: '1px solid var(--border-subtle)',
          }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.86rem', color: '#f8fafc' }}>
                {activeTab === 'distro' ? currentDistro.name : currentDesktop.name} ({activeTab === 'distro' ? currentDistro.version : currentDesktop.type})
              </div>
              <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                {activeTab === 'distro' ? currentDistro.popularFor : `RAM: ~${currentDesktop.ramUsageMB} Mo | Disque: ~${currentDesktop.diskUsageMB} Mo`}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              {activeTab === 'distro' ? (
                <button
                  onClick={() => {
                    if (onApplyDistro) onApplyDistro(currentDistro.id);
                    onClose();
                  }}
                  className="btn btn-primary"
                  style={{ fontSize: '0.8rem', padding: '6px 14px' }}
                >
                  <Check size={14} />
                  <span>{lang === 'fr' ? `Choisir ${currentDistro.name}` : `Select ${currentDistro.name}`}</span>
                </button>
              ) : (
                <button
                  onClick={() => {
                    if (onApplyDesktop) onApplyDesktop(currentDesktop.id);
                    onClose();
                  }}
                  className="btn btn-primary"
                  style={{ fontSize: '0.8rem', padding: '6px 14px' }}
                >
                  <Check size={14} />
                  <span>{lang === 'fr' ? `Choisir ${currentDesktop.name.split(' ')[0]}` : `Select ${currentDesktop.name.split(' ')[0]}`}</span>
                </button>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
