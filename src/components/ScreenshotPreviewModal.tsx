import React, { useState } from 'react';
import { DistroInfo, DesktopInfo, OSRecipe } from '../types/os';
import { DISTROS } from '../data/distros';
import { DESKTOPS } from '../data/desktopEnvironments';
import { X, Check, Image as ImageIcon, Camera, LayoutGrid, ArrowLeft } from 'lucide-react';
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
  const [manualTab, setManualTab] = useState<'distro' | 'desktop' | null>(null);
  const [manualDistroId, setManualDistroId] = useState<string | null>(null);
  const [manualDesktopId, setManualDesktopId] = useState<string | null>(null);
  const [manualFocus, setManualFocus] = useState<boolean | null>(null);

  if (!isOpen) return null;

  const activeTab = manualTab ?? (selectedDesktop ? 'desktop' : 'distro');
  const currentDistroId = manualDistroId ?? (selectedDistro?.id || recipe.distro);
  const currentDesktopId = manualDesktopId ?? (selectedDesktop?.id || recipe.desktop);
  const isDirectFocus = manualFocus ?? Boolean(selectedDesktop || selectedDistro);

  const currentDistro = DISTROS.find(d => d.id === currentDistroId) || DISTROS[0];
  const currentDesktop = DESKTOPS.find(d => d.id === currentDesktopId) || DESKTOPS[1];
  const currentScreenshot = activeTab === 'distro' ? DISTRO_SCREENSHOTS[currentDistroId] : DESKTOP_SCREENSHOTS[currentDesktopId];

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 9999 }}>
      <div
        className="modal-content"
        style={{
          maxWidth: isDirectFocus ? '1100px' : '980px',
          width: '95%',
          maxHeight: '92vh',
          padding: 0,
          overflow: 'hidden',
          background: '#090d16',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          boxShadow: '0 25px 60px rgba(0, 0, 0, 0.85)',
          display: 'flex',
          flexDirection: 'column',
          transition: 'all 0.2s ease',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '12px 18px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          background: '#0d131f',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '6px',
              background: 'rgba(56, 189, 248, 0.12)',
              border: '1px solid rgba(56, 189, 248, 0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#38bdf8',
            }}>
              <ImageIcon size={17} />
            </div>
            <div>
              <h3 style={{ fontSize: '0.96rem', fontWeight: 700, color: 'var(--text-main)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                {isDirectFocus ? (
                  activeTab === 'desktop' ? (
                    <>
                      <span>{currentDesktop.name}</span>
                      <span style={{ fontSize: '0.7rem', color: '#38bdf8', fontWeight: 500, padding: '1px 6px', background: 'rgba(56, 189, 248, 0.12)', borderRadius: '4px' }}>
                        {currentDesktop.type}
                      </span>
                    </>
                  ) : (
                    <>
                      <span>{currentDistro.name}</span>
                      <span style={{ fontSize: '0.7rem', color: currentDistro.color, fontWeight: 500, padding: '1px 6px', background: 'rgba(255, 255, 255, 0.08)', borderRadius: '4px' }}>
                        {currentDistro.version}
                      </span>
                    </>
                  )
                ) : (
                  lang === 'fr' ? 'Galerie des Captures & Aperçus' : 'Visual Screenshot Gallery'
                )}
              </h3>
              <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', margin: 0 }}>
                {isDirectFocus ? (
                  activeTab === 'desktop'
                    ? (lang === 'fr' ? `Aperçu direct du bureau · RAM requise : ~${currentDesktop.ramUsageMB} Mo · Wayland : ${currentDesktop.wayland ? 'Oui' : 'Non'}` : `Direct desktop preview · RAM: ~${currentDesktop.ramUsageMB} MB · Wayland: ${currentDesktop.wayland ? 'Yes' : 'No'}`)
                    : (lang === 'fr' ? `Aperçu direct de la distribution · Base RAM : ~${currentDistro.baseRamMB} Mo` : `Direct distro preview · Base RAM: ~${currentDistro.baseRamMB} MB`)
                ) : (
                  lang === 'fr' ? 'Parcourez les captures d’écran officielles des distributions et bureaux Linux' : 'Browse official screenshots of Linux distros and desktops'
                )}
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {/* Si en focus direct, bouton pour basculer vers toute la galerie */}
            {isDirectFocus ? (
              <button
                onClick={() => setManualFocus(false)}
                className="btn btn-secondary"
                style={{
                  padding: '4px 10px',
                  fontSize: '0.74rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  borderRadius: '5px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  color: 'var(--text-muted)',
                }}
              >
                <LayoutGrid size={13} />
                <span>{lang === 'fr' ? 'Voir tous les bureaux' : 'View all desktops'}</span>
              </button>
            ) : (
              /* Onglets Distros / Bureaux si en mode galerie */
              <div style={{
                display: 'flex',
                background: 'rgba(26, 22, 19, 0.8)',
                padding: '2px',
                borderRadius: '6px',
                border: '1px solid var(--border-subtle)',
              }}>
                <button
                  onClick={() => setManualTab('distro')}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '4px',
                    border: 'none',
                    background: activeTab === 'distro' ? 'var(--cyan)' : 'transparent',
                    color: activeTab === 'distro' ? '#ffffff' : 'var(--text-muted)',
                    fontSize: '0.74rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  🐧 {lang === 'fr' ? 'Distributions' : 'Distros'}
                </button>
                <button
                  onClick={() => setManualTab('desktop')}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '4px',
                    border: 'none',
                    background: activeTab === 'desktop' ? 'var(--cyan)' : 'transparent',
                    color: activeTab === 'desktop' ? '#ffffff' : 'var(--text-muted)',
                    fontSize: '0.74rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  🖥️ {lang === 'fr' ? 'Bureaux & WM' : 'Desktops & WMs'}
                </button>
              </div>
            )}

            <button
              onClick={onClose}
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                display: 'flex',
                padding: '6px',
                borderRadius: '5px',
              }}
              title={lang === 'fr' ? 'Fermer (Échap)' : 'Close (Esc)'}
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div style={{
          padding: '14px 18px',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          background: '#090d16',
        }}>
          {/* Quick Selector Pills (uniquement si NON en mode focus direct pour éviter de polluer) */}
          {!isDirectFocus && (
            <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '4px' }}>
              {activeTab === 'distro' ? (
                DISTROS.map(d => (
                  <button
                    key={d.id}
                    onClick={() => setManualDistroId(d.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '4px 10px',
                      borderRadius: '5px',
                      border: currentDistroId === d.id ? `1px solid ${d.color}` : '1px solid rgba(255, 255, 255, 0.08)',
                      background: currentDistroId === d.id ? 'rgba(255, 255, 255, 0.08)' : 'rgba(15, 23, 42, 0.5)',
                      color: currentDistroId === d.id ? 'var(--text-main)' : 'var(--text-muted)',
                      fontSize: '0.74rem',
                      fontWeight: currentDistroId === d.id ? 600 : 400,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: d.color }} />
                    <span>{d.name}</span>
                    {DISTRO_SCREENSHOTS[d.id] && <Camera size={10} color="#38bdf8" />}
                    {d.isBeta && (
                      <span style={{ fontSize: '0.58rem', padding: '0 4px', borderRadius: '3px', background: '#f59e0b', color: '#000', fontWeight: 700 }}>
                        BETA
                      </span>
                    )}
                  </button>
                ))
              ) : (
                DESKTOPS.map(de => (
                  <button
                    key={de.id}
                    onClick={() => setManualDesktopId(de.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '4px 10px',
                      borderRadius: '5px',
                      border: currentDesktopId === de.id ? '1px solid #38bdf8' : '1px solid rgba(255, 255, 255, 0.08)',
                      background: currentDesktopId === de.id ? 'rgba(56, 189, 248, 0.12)' : 'rgba(15, 23, 42, 0.5)',
                      color: currentDesktopId === de.id ? '#38bdf8' : 'var(--text-muted)',
                      fontSize: '0.74rem',
                      fontWeight: currentDesktopId === de.id ? 600 : 400,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    <span>{de.name.split(' ')[0]}</span>
                    {DESKTOP_SCREENSHOTS[de.id] && <Camera size={10} color="#38bdf8" />}
                    {de.versionBadge && (
                      <span style={{ fontSize: '0.62rem', color: 'var(--text-dim)' }}>
                        {de.versionBadge}
                      </span>
                    )}
                  </button>
                ))
              )}
            </div>
          )}

          {/* VRAIE CAPTURE D'ÉCRAN (Directement affichée en plein cadre) */}
          {currentScreenshot ? (
            <div style={{
              borderRadius: '8px',
              overflow: 'hidden',
              border: '1px solid rgba(255, 255, 255, 0.14)',
              boxShadow: '0 15px 40px rgba(0, 0, 0, 0.65)',
              position: 'relative',
              background: '#000',
              maxHeight: isDirectFocus ? '65vh' : '52vh',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <img
                src={`${import.meta.env.BASE_URL}${currentScreenshot.src.replace(/^\//, '')}`}
                alt={activeTab === 'distro' ? currentDistro.name : currentDesktop.name}
                style={{
                  width: '100%',
                  height: 'auto',
                  maxHeight: isDirectFocus ? '65vh' : '52vh',
                  objectFit: 'contain',
                  display: 'block',
                }}
              />
              <div style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                padding: '6px 14px',
                background: 'linear-gradient(to top, rgba(0,0,0,0.85), transparent)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: '0.68rem',
                color: 'rgba(255,255,255,0.75)',
              }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Camera size={12} color="#38bdf8" />
                  <span>
                    {lang === 'fr' ? 'Capture d’écran réelle' : 'Official screenshot'} — {currentScreenshot.author}
                  </span>
                </span>
                <a
                  href={currentScreenshot.source}
                  target="_blank"
                  rel="noreferrer"
                  style={{ color: '#38bdf8', textDecoration: 'none' }}
                >
                  Source ({currentScreenshot.license}) ↗
                </a>
              </div>
            </div>
          ) : (
            /* Simulation interactive (fallback si pas d'image) */
            <div style={{
              borderRadius: '8px',
              overflow: 'hidden',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              background: activeTab === 'distro'
                ? (currentDistro.screenshotMockup?.wallpaper || 'linear-gradient(135deg, #150f0c 0%, #2b1f18 100%)')
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
                color: 'var(--text-main)',
                fontFamily: 'var(--font-mono)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ width: '9px', height: '9px', borderRadius: '50%', background: activeTab === 'distro' ? currentDistro.color : 'var(--cyan)' }} />
                  <span style={{ fontWeight: 600 }}>
                    {activeTab === 'distro' ? (currentDistro.screenshotMockup?.topBarTitle || currentDistro.name) : currentDesktop.name}
                  </span>
                </div>

                <div style={{ display: 'flex', gap: '14px', alignItems: 'center', color: 'var(--text-dim)', fontSize: '0.7rem' }}>
                  <span>RAM: {activeTab === 'distro' ? `${currentDistro.baseRamMB} Mo` : `${currentDesktop.ramUsageMB} Mo`}</span>
                  <span>Wayland</span>
                  <span>10:42</span>
                </div>
              </div>

              {/* Mockup Center Windows Area */}
              <div style={{ padding: '24px 30px', flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
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
                      <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#84a05c' }} />
                    </div>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                      {activeTab === 'distro' ? 'terminal — fastfetch & sysinfo' : (currentDesktop.screenshotMockup?.activeWindow || 'Desktop Session')}
                    </span>
                    <div style={{ width: '30px' }} />
                  </div>

                  <div style={{ padding: '16px', fontFamily: 'var(--font-mono)', fontSize: '0.8rem', lineHeight: '1.5' }}>
                    {activeTab === 'distro' ? (
                      <pre style={{ margin: 0, color: '#fb923c', whiteSpace: 'pre-wrap' }}>
                        <code>{currentDistro.screenshotMockup?.terminalText || `OS: ${currentDistro.name}\nKernel: Linux\nRAM: ${currentDistro.baseRamMB} MB`}</code>
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
            </div>
          )}

          {/* Details & Apply Action Bar */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px',
            padding: '10px 14px',
            background: '#0d131f',
            borderRadius: '6px',
            border: '1px solid rgba(255, 255, 255, 0.08)',
          }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.84rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>{activeTab === 'distro' ? currentDistro.name : currentDesktop.name}</span>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                  ({activeTab === 'distro' ? currentDistro.version : currentDesktop.type})
                </span>
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                {activeTab === 'distro' ? currentDistro.popularFor : `RAM minimale : ~${currentDesktop.ramUsageMB} Mo · Disque : ~${currentDesktop.diskUsageMB} Mo`}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              {isDirectFocus && (
                <button
                  onClick={() => setManualFocus(false)}
                  className="btn btn-secondary"
                  style={{ fontSize: '0.78rem', padding: '6px 12px' }}
                >
                  <ArrowLeft size={13} />
                  <span>{lang === 'fr' ? 'Galerie complète' : 'All screenshots'}</span>
                </button>
              )}

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
