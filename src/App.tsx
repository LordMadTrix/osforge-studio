import React, { useState, useEffect, Suspense, lazy } from 'react';
import { OSRecipe } from './types/os';
import { DISTROS } from './data/distros';
import { DESKTOPS } from './data/desktopEnvironments';
import { Header } from './components/Header';
import { StatsBanner } from './components/StatsBanner';
import { WizardMode } from './components/WizardMode';
import { ExpertProStudio } from './components/ExpertProStudio';
import { Lightbulb, Sparkles, Wand2, Download, Search, Image as ImageIcon, Zap, Heart } from 'lucide-react';

import { extractRecipeFromUrl } from './services/recipeSharing';
import { saveCurrentAutosave, loadCurrentAutosave } from './services/configStorage';

// Code-split heavy, non-first-paint views and modals to shrink the initial bundle.
const BuildPipelineModal = lazy(() => import('./components/BuildPipelineModal').then(m => ({ default: m.BuildPipelineModal })));
const AIAssistantModal = lazy(() => import('./components/AIAssistantModal').then(m => ({ default: m.AIAssistantModal })));
const PresetsModal = lazy(() => import('./components/PresetsModal').then(m => ({ default: m.PresetsModal })));
const TipsModal = lazy(() => import('./components/TipsModal').then(m => ({ default: m.TipsModal })));
const QuickLauncherModal = lazy(() => import('./components/QuickLauncherModal').then(m => ({ default: m.QuickLauncherModal })));
const ScreenshotPreviewModal = lazy(() => import('./components/ScreenshotPreviewModal').then(m => ({ default: m.ScreenshotPreviewModal })));
const VersionCheckerModal = lazy(() => import('./components/VersionCheckerModal').then(m => ({ default: m.VersionCheckerModal })));
const PresentationModal = lazy(() => import('./components/PresentationModal').then(m => ({ default: m.PresentationModal })));
const HardwareAuditModal = lazy(() => import('./components/HardwareAuditModal').then(m => ({ default: m.HardwareAuditModal })));
const SavedProfilesModal = lazy(() => import('./components/SavedProfilesModal').then(m => ({ default: m.SavedProfilesModal })));
const DownloadDesktopModal = lazy(() => import('./components/DownloadDesktopModal').then(m => ({ default: m.DownloadDesktopModal })));

const DEFAULT_RECIPE: OSRecipe = {
  id: 'custom-os-01',
  name: 'ForgeOS Custom',
  description: 'Distribution Linux personnalisée compilée avec OSForge Studio',
  distro: 'debian',
  distroVersion: '13 (Trixie)',
  distroSuite: 'trixie',
  arch: 'x86_64',
  outputFormat: 'iso_hybrid',
  desktop: 'hyprland',
  displayManager: 'ly',
  kernel: 'cachyos',
  selectedPackages: ['docker', 'git', 'neovim', 'zsh_starship', 'htop_btop', 'fastfetch'],
  customPackages: ['curl', 'wget', 'sudo'],
  branding: {
    osName: 'ForgeOS',
    editionName: 'Custom Edition',
    version: '1.0',
    accentColor: '#0ea5e9',
    wallpaperPreset: 'minimal',
    bootSplashTheme: 'minimal',
  },
  user: {
    username: 'developer',
    fullName: 'Forge Developer',
    password: 'forge',
    sudo: true,
    autologin: true,
    shell: '/bin/bash',
  },
  hostname: 'forge-box',
  timezone: 'Europe/Paris',
  locale: 'fr_FR',
  keyboardLayout: 'fr',
  enableSSH: true,
  security: {
    cisBenchmarkLevel: 1,
    firewall: 'ufw',
    appArmorOrSELinux: true,
    fail2ban: false,
    luksEncryption: false,
    disableRootSSH: true,
    autoSecurityUpdates: true,
  },
  customServices: [],
  firstBootScript: '#!/usr/bin/env bash\necho "Bienvenue sur votre OS sur mesure !" > /var/log/firstboot.log',
};

export const App: React.FC = () => {
  const [recipe, setRecipe] = useState<OSRecipe>(() => {
    const shared = extractRecipeFromUrl();
    if (shared) return { ...DEFAULT_RECIPE, ...shared };
    const autosaved = loadCurrentAutosave();
    return autosaved ? { ...DEFAULT_RECIPE, ...autosaved } : DEFAULT_RECIPE;
  });
  const [uiMode, setUiMode] = useState<'wizard' | 'expert'>('wizard');
  const [activeTab, setActiveTab] = useState<string>('builder');
  const [lang, setLang] = useState<'fr' | 'en'>('fr');

  // Autosave automatique à chaque modification de la recette
  useEffect(() => {
    saveCurrentAutosave(recipe);
  }, [recipe]);

  // Modals state
  const [isPresetsOpen, setIsPresetsOpen] = useState<boolean>(false);
  const [isAIOpen, setIsAIOpen] = useState<boolean>(false);
  const [isBuildOpen, setIsBuildOpen] = useState<boolean>(false);
  const [isTipsOpen, setIsTipsOpen] = useState<boolean>(false);
  const [isLauncherOpen, setIsLauncherOpen] = useState<boolean>(false);
  const [isScreenshotsOpen, setIsScreenshotsOpen] = useState<boolean>(false);
  const [isVersionCheckerOpen, setIsVersionCheckerOpen] = useState<boolean>(false);
  const [isPresentationOpen, setIsPresentationOpen] = useState<boolean>(false);
  const [isAuditOpen, setIsAuditOpen] = useState<boolean>(false);
  const [isProfilesOpen, setIsProfilesOpen] = useState<boolean>(false);
  const [isDesktopDownloadOpen, setIsDesktopDownloadOpen] = useState<boolean>(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [previewDistroId, setPreviewDistroId] = useState<string | undefined>(undefined);
  const [previewDesktopId, setPreviewDesktopId] = useState<string | undefined>(undefined);

  // Interception de l'événement PWA BeforeInstallPrompt pour installation 1-clic
  useEffect(() => {
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
  }, []);

  const handleInstallPwa = async () => {
    if (!deferredPrompt) return;
    try {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice?.outcome === 'accepted') {
        setDeferredPrompt(null);
      }
    } catch (err) {
      console.warn('Installation PWA ignorée ou annulée:', err);
    }
  };

  // Global Keyboard Shortcut: Ctrl+K / Cmd+K / Ctrl+P to open Quick Launcher
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K' || e.key === 'p' || e.key === 'P')) {
        e.preventDefault();
        setIsLauncherOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleUpdateRecipe = (updated: Partial<OSRecipe>) => {
    setRecipe(prev => ({ ...prev, ...updated }));
  };

  const handleNavigateFromTip = (targetTab: string) => {
    setUiMode('expert');
    setActiveTab(targetTab);
  };

  const handleOpenScreenshots = (targetDistroOrDesktopId?: string) => {
    if (targetDistroOrDesktopId) {
      if (DESKTOPS.some(de => de.id === targetDistroOrDesktopId)) {
        setPreviewDesktopId(targetDistroOrDesktopId);
        setPreviewDistroId(undefined);
      } else if (DISTROS.some(d => d.id === targetDistroOrDesktopId)) {
        setPreviewDistroId(targetDistroOrDesktopId);
        setPreviewDesktopId(undefined);
      }
    } else {
      setPreviewDistroId(undefined);
      setPreviewDesktopId(undefined);
    }
    setIsScreenshotsOpen(true);
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-main)' }}>
      {/* Header Bar */}
      <Header
        recipe={recipe}
        onOpenPresets={() => setIsPresetsOpen(true)}
        onOpenAI={() => setIsAIOpen(true)}
        onStartBuild={() => setIsBuildOpen(true)}
        onOpenTips={() => setIsTipsOpen(true)}
        onOpenLauncher={() => setIsLauncherOpen(true)}
        onOpenScreenshots={() => handleOpenScreenshots()}
        onOpenVersionChecker={() => setIsVersionCheckerOpen(true)}
        onOpenPresentation={() => setIsPresentationOpen(true)}
        onOpenAudit={() => setIsAuditOpen(true)}
        onOpenProfiles={() => setIsProfilesOpen(true)}
        onOpenDesktopDownload={() => setIsDesktopDownloadOpen(true)}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        uiMode={uiMode}
        setUiMode={setUiMode}
        lang={lang}
        setLang={setLang}
      />

      {/* Real-time Status Banner (Shown in Wizard Mode) */}
      {uiMode === 'wizard' && <StatsBanner recipe={recipe} lang={lang} />}

      {/* Main Workspace Container */}
      <main style={{
        maxWidth: uiMode === 'expert' ? '100%' : '1540px',
        width: '100%',
        margin: '0 auto',
        padding: uiMode === 'expert' ? '0' : '20px 24px',
        flex: 1,
      }}>
        {/* Mode 1: Guided Wizard Mode */}
        {uiMode === 'wizard' && (
          <WizardMode
            recipe={recipe}
            onUpdateRecipe={handleUpdateRecipe}
            onStartBuild={() => setIsBuildOpen(true)}
            onSwitchToExpert={() => setUiMode('expert')}
            onOpenScreenshots={handleOpenScreenshots}
            onOpenAudit={() => setIsAuditOpen(true)}
            lang={lang}
          />
        )}

        {/* Mode 2: Expert Studio Pro (Master-Detail Architecture) */}
        {uiMode === 'expert' && (
          <ExpertProStudio
            recipe={recipe}
            onChange={handleUpdateRecipe}
            lang={lang}
            onStartBuild={() => setIsBuildOpen(true)}
            onOpenTips={() => setIsTipsOpen(true)}
            onOpenScreenshots={handleOpenScreenshots}
            onOpenAudit={() => setIsAuditOpen(true)}
            onOpenPresets={() => setIsPresetsOpen(true)}
            onOpenAI={() => setIsAIOpen(true)}
            initialSection={
              activeTab === 'packages' ? 'pkgs_catalog'
              : activeTab === 'system' ? 'sys_config'
              : activeTab === 'security' ? 'sec_hardening'
              : activeTab === 'postinstall' ? 'post_scripts'
              : activeTab === 'inspector' ? 'export_inspector'
              : 'base_distro'
            }
          />
        )}
      </main>

      {/* Footer (Shown in Wizard Mode) */}
      {uiMode === 'wizard' && (
        <footer style={{
        borderTop: '1px solid var(--border-subtle)',
        background: 'rgba(12, 10, 9, 0.95)',
        padding: '14px 24px',
        marginTop: 'auto',
      }}>
        <div style={{
          maxWidth: '1540px',
          margin: '0 auto',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
          fontSize: '0.78rem',
          color: 'var(--text-muted)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 700, color: 'var(--text-main)' }}>OSForge Studio</span>
            <span style={{ color: 'var(--cyan)', fontWeight: 600 }}>by LordMadTrix</span>
            <span style={{ color: 'rgba(255, 255, 255, 0.2)' }}>—</span>
            <span style={{ color: 'var(--text-muted)' }}>
              {lang === 'fr' 
                ? 'The Ultimate Linux Distro & Cloud Image Builder • Écosystème MadOS' 
                : 'The Ultimate Linux Distro & Cloud Image Builder • MadOS Ecosystem'}
            </span>
          </div>

          <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
            <button
              onClick={() => setIsVersionCheckerOpen(true)}
              style={{ background: 'none', border: 'none', color: '#84a05c', cursor: 'pointer', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              <Zap size={13} />
              <span>{lang === 'fr' ? 'Mises à jour' : 'Updates'}</span>
            </button>
            <button
              onClick={() => handleOpenScreenshots()}
              style={{ background: 'none', border: 'none', color: 'var(--cyan)', cursor: 'pointer', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              <ImageIcon size={13} />
              <span>{lang === 'fr' ? 'Galerie Captures' : 'Screenshots'}</span>
            </button>
            <button
              onClick={() => setIsLauncherOpen(true)}
              style={{ background: 'none', border: 'none', color: 'var(--cyan)', cursor: 'pointer', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              <Search size={13} />
              <span>{lang === 'fr' ? 'Lanceur (Ctrl+K)' : 'Launcher (Ctrl+K)'}</span>
            </button>
            <button
              onClick={() => setIsTipsOpen(true)}
              style={{ background: 'none', border: 'none', color: '#fbbf24', cursor: 'pointer', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              <Lightbulb size={13} />
              <span>{lang === 'fr' ? 'Guide & Astuces' : 'Tips & Guide'}</span>
            </button>
            <button
              onClick={() => setIsAIOpen(true)}
              style={{ background: 'none', border: 'none', color: 'var(--cyan)', cursor: 'pointer', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              <Wand2 size={13} />
              <span>{lang === 'fr' ? 'Architecte IA' : 'AI Architect'}</span>
            </button>
            <button
              onClick={() => setIsPresetsOpen(true)}
              style={{ background: 'none', border: 'none', color: 'var(--emerald)', cursor: 'pointer', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              <Sparkles size={13} />
              <span>{lang === 'fr' ? 'Modèles' : 'Presets'}</span>
            </button>
            <button
              onClick={() => import('./services/buildExport').then(m => m.downloadBuildPackage(recipe))}
              style={{ background: 'none', border: 'none', color: '#fb923c', cursor: 'pointer', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              <Download size={13} />
              <span>{lang === 'fr' ? 'Kit Export (ZIP)' : 'Export Kit (ZIP)'}</span>
            </button>
            <a
              href="https://www.patreon.com/c/LordMad"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                background: 'rgba(255, 66, 77, 0.12)',
                border: '1px solid rgba(255, 66, 77, 0.3)',
                color: '#ff424d',
                borderRadius: '4px',
                padding: '2px 8px',
                fontSize: '0.78rem',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                textDecoration: 'none',
                fontWeight: 600,
              }}
              title={lang === 'fr' ? 'Soutenir LordMadTrix sur Patreon' : 'Support LordMadTrix on Patreon'}
            >
              <Heart size={12} fill="#ff424d" />
              <span>{lang === 'fr' ? 'Patreon' : 'Patreon'}</span>
            </a>
          </div>
        </div>
      </footer>
      )}

      {/* Modals */}
      <Suspense fallback={null}>
        <VersionCheckerModal
          isOpen={isVersionCheckerOpen}
          onClose={() => setIsVersionCheckerOpen(false)}
          recipe={recipe}
          onUpdateRecipe={handleUpdateRecipe}
          lang={lang}
        />

        <ScreenshotPreviewModal
          isOpen={isScreenshotsOpen}
          onClose={() => {
            setIsScreenshotsOpen(false);
            setPreviewDistroId(undefined);
            setPreviewDesktopId(undefined);
          }}
          selectedDistro={previewDistroId ? DISTROS.find(d => d.id === previewDistroId) : undefined}
          selectedDesktop={previewDesktopId ? DESKTOPS.find(de => de.id === previewDesktopId) : undefined}
          recipe={recipe}
          onApplyDistro={(distroId) => {
            const d = DISTROS.find(item => item.id === distroId);
            if (d) {
              handleUpdateRecipe({
                distro: d.id,
                distroVersion: d.version,
                arch: d.supportedArch.includes(recipe.arch) ? recipe.arch : d.supportedArch[0],
              });
            }
          }}
          onApplyDesktop={(desktopId) => {
            const de = DESKTOPS.find(item => item.id === desktopId);
            if (de) {
              handleUpdateRecipe({
                desktop: de.id,
                displayManager: de.recommendedDM,
              });
            }
          }}
          lang={lang}
        />

        <QuickLauncherModal
          isOpen={isLauncherOpen}
          onClose={() => setIsLauncherOpen(false)}
          recipe={recipe}
          onUpdateRecipe={handleUpdateRecipe}
          onNavigateTab={handleNavigateFromTip}
          onOpenAI={() => setIsAIOpen(true)}
          onOpenPresets={() => setIsPresetsOpen(true)}
          onOpenBuild={() => setIsBuildOpen(true)}
          onOpenTips={() => setIsTipsOpen(true)}
          lang={lang}
        />

        <BuildPipelineModal
          recipe={recipe}
          isOpen={isBuildOpen}
          onClose={() => setIsBuildOpen(false)}
          lang={lang}
        />

        <AIAssistantModal
          currentRecipe={recipe}
          isOpen={isAIOpen}
          onClose={() => setIsAIOpen(false)}
          onApplyRecipe={handleUpdateRecipe}
          lang={lang}
        />

        <PresetsModal
          isOpen={isPresetsOpen}
          onClose={() => setIsPresetsOpen(false)}
          onSelectPreset={handleUpdateRecipe}
          lang={lang}
        />

        <TipsModal
          isOpen={isTipsOpen}
          onClose={() => setIsTipsOpen(false)}
          onNavigateTab={handleNavigateFromTip}
          lang={lang}
        />

        <PresentationModal
          isOpen={isPresentationOpen}
          onClose={() => setIsPresentationOpen(false)}
          lang={lang}
        />

        <HardwareAuditModal
          isOpen={isAuditOpen}
          onClose={() => setIsAuditOpen(false)}
          onApplyRecipe={handleUpdateRecipe}
          lang={lang}
          currentRecipe={recipe}
        />

        <SavedProfilesModal
          isOpen={isProfilesOpen}
          onClose={() => setIsProfilesOpen(false)}
          currentRecipe={recipe}
          onLoadRecipe={(loadedRecipe) => setRecipe(loadedRecipe)}
          lang={lang}
        />

        <DownloadDesktopModal
          isOpen={isDesktopDownloadOpen}
          onClose={() => setIsDesktopDownloadOpen(false)}
          lang={lang}
          deferredPrompt={deferredPrompt}
          onInstallPwa={handleInstallPwa}
        />
      </Suspense>
    </div>
  );
};

export default App;
