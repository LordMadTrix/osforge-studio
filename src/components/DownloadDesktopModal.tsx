import React, { useState } from 'react';
import { 
  X, Monitor, Terminal, Download, Check, Copy, Sparkles, 
  ExternalLink, ShieldCheck, Box, HardDrive
} from 'lucide-react';
import { downloadWindowsPortableZip, downloadLinuxPortableZip } from '../services/desktopPackager';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface DownloadDesktopModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: 'fr' | 'en';
  deferredPrompt?: BeforeInstallPromptEvent | null;
  onInstallPwa?: () => void;
}

const DownloadDesktopModalContent: React.FC<{
  onClose: () => void;
  lang: 'fr' | 'en';
  deferredPrompt?: BeforeInstallPromptEvent | null;
  onInstallPwa?: () => void;
}> = ({ onClose, lang, deferredPrompt, onInstallPwa }) => {
  // Détection automatique de l'OS initial
  const initialPlatform = () => {
    if (typeof window === 'undefined') return 'windows';
    const ua = navigator.userAgent.toLowerCase();
    if (ua.includes('linux') || ua.includes('x11')) return 'linux';
    return 'windows';
  };

  const [activePlatform, setActivePlatform] = useState<'windows' | 'linux' | 'docker'>(initialPlatform);
  const [isDownloadingWin, setIsDownloadingWin] = useState(false);
  const [isDownloadingLin, setIsDownloadingLin] = useState(false);
  const [copiedCmd, setCopiedCmd] = useState<string | null>(null);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCmd(id);
    setTimeout(() => setCopiedCmd(null), 2000);
  };

  const handleDownloadWindows = async () => {
    setIsDownloadingWin(true);
    try {
      await downloadWindowsPortableZip();
    } catch (err) {
      console.error('Erreur téléchargement Windows:', err);
    } finally {
      setIsDownloadingWin(false);
    }
  };

  const handleDownloadLinux = async () => {
    setIsDownloadingLin(true);
    try {
      await downloadLinuxPortableZip();
    } catch (err) {
      console.error('Erreur téléchargement Linux:', err);
    } finally {
      setIsDownloadingLin(false);
    }
  };

  const winPsCmd = `irm https://raw.githubusercontent.com/LordMadTrix/osforge-studio/main/scripts/install-windows.ps1 | iex`;
  const linBashCmd = `curl -fsSL https://raw.githubusercontent.com/LordMadTrix/osforge-studio/main/scripts/install-linux.sh | bash`;
  const dockerCmd = `docker run -d -p 8080:80 --name osforge-studio ghcr.io/lordmadtrix/osforge-studio:latest`;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(4, 7, 14, 0.85)',
      backdropFilter: 'blur(10px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '20px',
    }}>
      <div style={{
        background: '#0a0f1d',
        border: '1px solid rgba(2, 132, 199, 0.3)',
        borderRadius: '16px',
        width: '100%',
        maxWidth: '820px',
        maxHeight: '92vh',
        overflowY: 'auto',
        boxShadow: '0 24px 64px rgba(0, 0, 0, 0.8), 0 0 40px rgba(2, 132, 199, 0.15)',
        display: 'flex',
        flexDirection: 'column',
      }}>
        
        {/* En-tête */}
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'rgba(255, 255, 255, 0.02)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(2, 132, 199, 0.4)',
            }}>
              <Monitor size={22} color="#ffffff" />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)' }}>
                  {lang === 'fr' ? 'Télécharger OSForge Studio Desktop' : 'Download OSForge Studio Desktop'}
                </h2>
                <span style={{
                  fontSize: '0.68rem',
                  padding: '2px 8px',
                  borderRadius: '12px',
                  background: 'rgba(16, 185, 129, 0.15)',
                  color: '#10b981',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  fontWeight: 700,
                }}>
                  V1.0 PRO
                </span>
              </div>
              <p style={{ margin: '3px 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                {lang === 'fr' 
                  ? 'Exécutez OSForge Studio en local et hors-ligne sur votre propre ordinateur' 
                  : 'Run OSForge Studio locally and offline on your personal computer'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              color: 'var(--text-muted)',
              borderRadius: '8px',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Sélecteur de Plateforme */}
        <div style={{
          padding: '16px 24px 0',
          display: 'flex',
          gap: '8px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
        }}>
          <button
            onClick={() => setActivePlatform('windows')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 18px',
              borderRadius: '8px 8px 0 0',
              border: 'none',
              borderBottom: activePlatform === 'windows' ? '2px solid #0284c7' : '2px solid transparent',
              background: activePlatform === 'windows' ? 'rgba(2, 132, 199, 0.1)' : 'transparent',
              color: activePlatform === 'windows' ? 'var(--cyan)' : 'var(--text-muted)',
              fontSize: '0.85rem',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            <HardDrive size={16} />
            <span>Windows (10 / 11)</span>
          </button>

          <button
            onClick={() => setActivePlatform('linux')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 18px',
              borderRadius: '8px 8px 0 0',
              border: 'none',
              borderBottom: activePlatform === 'linux' ? '2px solid #0284c7' : '2px solid transparent',
              background: activePlatform === 'linux' ? 'rgba(2, 132, 199, 0.1)' : 'transparent',
              color: activePlatform === 'linux' ? 'var(--cyan)' : 'var(--text-muted)',
              fontSize: '0.85rem',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            <Terminal size={16} />
            <span>Linux (Multi-Distro)</span>
          </button>

          <button
            onClick={() => setActivePlatform('docker')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 18px',
              borderRadius: '8px 8px 0 0',
              border: 'none',
              borderBottom: activePlatform === 'docker' ? '2px solid #0284c7' : '2px solid transparent',
              background: activePlatform === 'docker' ? 'rgba(2, 132, 199, 0.1)' : 'transparent',
              color: activePlatform === 'docker' ? 'var(--cyan)' : 'var(--text-muted)',
              fontSize: '0.85rem',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            <Box size={16} />
            <span>Docker & Serveur</span>
          </button>
        </div>

        {/* Contenu Principal */}
        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>

          {/* ===================== ONGLET WINDOWS ===================== */}
          {activePlatform === 'windows' && (
            <>
              {/* Carte 1 : Pack Portable ZIP */}
              <div style={{
                background: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid rgba(2, 132, 199, 0.25)',
                borderRadius: '12px',
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '14px',
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <h3 style={{ margin: 0, fontSize: '1.05rem', color: 'var(--text-main)', fontWeight: 700 }}>
                        {lang === 'fr' ? 'Pack Portable Autonome (ZIP)' : 'Standalone Portable Pack (ZIP)'}
                      </h3>
                      <span style={{
                        fontSize: '0.65rem',
                        padding: '2px 7px',
                        borderRadius: '6px',
                        background: 'rgba(2, 132, 199, 0.2)',
                        color: 'var(--cyan)',
                        fontWeight: 700,
                      }}>
                        {lang === 'fr' ? 'RECOMMANDÉ' : 'RECOMMENDED'}
                      </span>
                    </div>
                    <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                      {lang === 'fr'
                        ? 'Contient le script Lancer-OSForge-Studio.bat avec mini-serveur HTTP PowerShell natif. Démarre en 1 double-clic sans rien installer.'
                        : 'Includes Lancer-OSForge-Studio.bat with native PowerShell HTTP server. Starts in 1 double-click without installing anything.'}
                    </p>
                  </div>

                  <button
                    onClick={handleDownloadWindows}
                    disabled={isDownloadingWin}
                    style={{
                      background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                      border: 'none',
                      borderRadius: '8px',
                      color: '#ffffff',
                      padding: '10px 18px',
                      fontSize: '0.85rem',
                      fontWeight: 700,
                      cursor: isDownloadingWin ? 'wait' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      boxShadow: '0 4px 14px rgba(2, 132, 199, 0.3)',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    <Download size={16} />
                    <span>{isDownloadingWin ? (lang === 'fr' ? 'Génération...' : 'Generating...') : (lang === 'fr' ? 'Télécharger (.zip)' : 'Download (.zip)')}</span>
                  </button>
                </div>

                {/* Étapes rapides */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: '10px',
                  marginTop: '6px',
                }}>
                  <div style={{ background: 'rgba(0,0,0,0.25)', padding: '10px 12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ fontSize: '0.72rem', color: 'var(--cyan)', fontWeight: 700, marginBottom: '2px' }}>1. TÉLÉCHARGER</div>
                    <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>Récupérez l'archive ZIP sur votre PC.</div>
                  </div>
                  <div style={{ background: 'rgba(0,0,0,0.25)', padding: '10px 12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ fontSize: '0.72rem', color: 'var(--cyan)', fontWeight: 700, marginBottom: '2px' }}>2. EXTRAIRE</div>
                    <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>Décompressez le dossier n'importe où.</div>
                  </div>
                  <div style={{ background: 'rgba(0,0,0,0.25)', padding: '10px 12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ fontSize: '0.72rem', color: '#10b981', fontWeight: 700, marginBottom: '2px' }}>3. DOUBLE-CLIC</div>
                    <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>Lancez Lancer-OSForge-Studio.bat !</div>
                  </div>
                </div>
              </div>

              {/* Carte 2 : PWA Windows Directe */}
              <div style={{
                background: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '12px',
                padding: '16px 20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '16px',
              }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Sparkles size={16} color="#fbbf24" />
                    <h4 style={{ margin: 0, fontSize: '0.95rem', color: 'var(--text-main)', fontWeight: 700 }}>
                      {lang === 'fr' ? 'Installation Native PWA Windows' : 'Native Windows PWA Installation'}
                    </h4>
                  </div>
                  <p style={{ margin: '3px 0 0', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    {lang === 'fr'
                      ? 'Installe OSForge Studio comme logiciel autonome avec icône dans le menu Démarrer et fenêtre dédiée sans barre d\'URL.'
                      : 'Installs OSForge Studio as a standalone app with Start menu icon and borderless window.'}
                  </p>
                </div>

                {deferredPrompt && onInstallPwa ? (
                  <button
                    onClick={onInstallPwa}
                    style={{
                      background: 'rgba(251, 191, 36, 0.15)',
                      border: '1px solid rgba(251, 191, 36, 0.3)',
                      color: '#fbbf24',
                      borderRadius: '8px',
                      padding: '8px 14px',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    ⚡ {lang === 'fr' ? 'Installer sur ce PC' : 'Install on this PC'}
                  </button>
                ) : (
                  <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.05)', padding: '5px 10px', borderRadius: '6px' }}>
                    {lang === 'fr' ? 'Via l\'icône ⊕ dans la barre d\'adresse' : 'Via ⊕ icon in browser address bar'}
                  </span>
                )}
              </div>

              {/* Carte 3 : Commande PowerShell 1-Ligne */}
              <div style={{
                background: 'rgba(0, 0, 0, 0.3)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '12px',
                padding: '14px 18px',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                    {lang === 'fr' ? 'Installation Rapide en 1 Ligne (PowerShell)' : 'Fast 1-Line Install (PowerShell)'}
                  </span>
                  <button
                    onClick={() => copyToClipboard(winPsCmd, 'win-ps')}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: copiedCmd === 'win-ps' ? '#10b981' : 'var(--cyan)',
                      fontSize: '0.75rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    {copiedCmd === 'win-ps' ? <Check size={13} /> : <Copy size={13} />}
                    <span>{copiedCmd === 'win-ps' ? (lang === 'fr' ? 'Copié !' : 'Copied!') : (lang === 'fr' ? 'Copier' : 'Copy')}</span>
                  </button>
                </div>
                <pre style={{
                  margin: 0,
                  padding: '10px 12px',
                  background: '#040711',
                  borderRadius: '6px',
                  fontSize: '0.76rem',
                  fontFamily: 'var(--font-mono)',
                  color: '#38bdf8',
                  overflowX: 'auto',
                }}>
                  {winPsCmd}
                </pre>
              </div>
            </>
          )}

          {/* ===================== ONGLET LINUX ===================== */}
          {activePlatform === 'linux' && (
            <>
              {/* Carte 1 : Pack Portable Linux */}
              <div style={{
                background: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid rgba(2, 132, 199, 0.25)',
                borderRadius: '12px',
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '14px',
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <h3 style={{ margin: 0, fontSize: '1.05rem', color: 'var(--text-main)', fontWeight: 700 }}>
                        {lang === 'fr' ? 'Pack Portable Linux (.zip)' : 'Linux Portable Pack (.zip)'}
                      </h3>
                      <span style={{
                        fontSize: '0.65rem',
                        padding: '2px 7px',
                        borderRadius: '6px',
                        background: 'rgba(2, 132, 199, 0.2)',
                        color: 'var(--cyan)',
                        fontWeight: 700,
                      }}>
                        MULTI-DISTRO
                      </span>
                    </div>
                    <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                      {lang === 'fr'
                        ? 'Contient lancer-osforge-studio.sh, installer-raccourci.sh et le fichier .desktop compatible Debian, Ubuntu, Arch, Fedora, openSUSE, Alpine, Void.'
                        : 'Contains lancer-osforge-studio.sh, installer-raccourci.sh and .desktop file for all major Linux distributions.'}
                    </p>
                  </div>

                  <button
                    onClick={handleDownloadLinux}
                    disabled={isDownloadingLin}
                    style={{
                      background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                      border: 'none',
                      borderRadius: '8px',
                      color: '#ffffff',
                      padding: '10px 18px',
                      fontSize: '0.85rem',
                      fontWeight: 700,
                      cursor: isDownloadingLin ? 'wait' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      boxShadow: '0 4px 14px rgba(2, 132, 199, 0.3)',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    <Download size={16} />
                    <span>{isDownloadingLin ? (lang === 'fr' ? 'Génération...' : 'Generating...') : (lang === 'fr' ? 'Télécharger (.zip)' : 'Download (.zip)')}</span>
                  </button>
                </div>

                {/* Étapes rapides */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: '10px',
                  marginTop: '6px',
                }}>
                  <div style={{ background: 'rgba(0,0,0,0.25)', padding: '10px 12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ fontSize: '0.72rem', color: 'var(--cyan)', fontWeight: 700, marginBottom: '2px' }}>1. EXTRAIRE</div>
                    <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>unzip OSForge-Studio-Linux-Portable.zip</div>
                  </div>
                  <div style={{ background: 'rgba(0,0,0,0.25)', padding: '10px 12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ fontSize: '0.72rem', color: 'var(--cyan)', fontWeight: 700, marginBottom: '2px' }}>2. INTÉGRATION</div>
                    <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>./installer-raccourci.sh (menu app)</div>
                  </div>
                  <div style={{ background: 'rgba(0,0,0,0.25)', padding: '10px 12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ fontSize: '0.72rem', color: '#10b981', fontWeight: 700, marginBottom: '2px' }}>3. EXÉCUTER</div>
                    <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>./lancer-osforge-studio.sh</div>
                  </div>
                </div>
              </div>

              {/* Carte 2 : Commande Bash 1-Ligne */}
              <div style={{
                background: 'rgba(0, 0, 0, 0.3)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '12px',
                padding: '14px 18px',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                    {lang === 'fr' ? 'Installation Rapide en 1 Ligne (Terminal Bash)' : 'Fast 1-Line Install (Bash Terminal)'}
                  </span>
                  <button
                    onClick={() => copyToClipboard(linBashCmd, 'lin-bash')}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: copiedCmd === 'lin-bash' ? '#10b981' : 'var(--cyan)',
                      fontSize: '0.75rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    {copiedCmd === 'lin-bash' ? <Check size={13} /> : <Copy size={13} />}
                    <span>{copiedCmd === 'lin-bash' ? (lang === 'fr' ? 'Copié !' : 'Copied!') : (lang === 'fr' ? 'Copier' : 'Copy')}</span>
                  </button>
                </div>
                <pre style={{
                  margin: 0,
                  padding: '10px 12px',
                  background: '#040711',
                  borderRadius: '6px',
                  fontSize: '0.76rem',
                  fontFamily: 'var(--font-mono)',
                  color: '#38bdf8',
                  overflowX: 'auto',
                }}>
                  {linBashCmd}
                </pre>
              </div>
            </>
          )}

          {/* ===================== ONGLET DOCKER ===================== */}
          {activePlatform === 'docker' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{
                background: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '12px',
                padding: '18px 20px',
              }}>
                <h3 style={{ margin: '0 0 6px', fontSize: '1rem', color: 'var(--text-main)', fontWeight: 700 }}>
                  {lang === 'fr' ? 'Conteneur Docker / Podman (Auto-Hébergement)' : 'Docker / Podman Container (Self-Hosting)'}
                </h3>
                <p style={{ margin: '0 0 12px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  {lang === 'fr'
                    ? 'Déployez OSForge Studio sur votre serveur personnel, NAS (Synology, Unraid) ou homelab en 1 seule ligne de commande :'
                    : 'Deploy OSForge Studio on your personal server, NAS or homelab with a single command:'}
                </p>

                <div style={{
                  background: '#040711',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '8px',
                  padding: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px',
                }}>
                  <code style={{ fontSize: '0.78rem', color: '#38bdf8', fontFamily: 'var(--font-mono)' }}>
                    {dockerCmd}
                  </code>
                  <button
                    onClick={() => copyToClipboard(dockerCmd, 'docker-cmd')}
                    style={{
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      color: copiedCmd === 'docker-cmd' ? '#10b981' : 'var(--text-muted)',
                      borderRadius: '6px',
                      padding: '4px 8px',
                      fontSize: '0.75rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    {copiedCmd === 'docker-cmd' ? <Check size={12} /> : <Copy size={12} />}
                    <span>{copiedCmd === 'docker-cmd' ? 'Copié' : 'Copier'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Bandeau Vie Privée & GitHub */}
          <div style={{
            background: 'rgba(2, 132, 199, 0.05)',
            border: '1px solid rgba(2, 132, 199, 0.15)',
            borderRadius: '10px',
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShieldCheck size={18} color="#10b981" />
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                {lang === 'fr'
                  ? '100% Hors-Ligne & Privé : Toutes vos recettes et scripts sont générés en local sur votre machine.'
                  : '100% Offline & Private: All recipes and scripts are generated locally on your computer.'}
              </span>
            </div>

            <a
              href="https://github.com/LordMadTrix/osforge-studio/releases"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                color: 'var(--cyan)',
                fontSize: '0.78rem',
                fontWeight: 600,
                textDecoration: 'none',
                whiteSpace: 'nowrap',
              }}
            >
              <span>GitHub Releases</span>
              <ExternalLink size={12} />
            </a>
          </div>

        </div>

      </div>
    </div>
  );
};

export const DownloadDesktopModal: React.FC<DownloadDesktopModalProps> = ({
  isOpen,
  onClose,
  lang,
  deferredPrompt,
  onInstallPwa,
}) => {
  if (!isOpen) return null;

  return (
    <DownloadDesktopModalContent
      onClose={onClose}
      lang={lang}
      deferredPrompt={deferredPrompt}
      onInstallPwa={onInstallPwa}
    />
  );
};
