import React, { useState, useEffect, Suspense, lazy } from 'react';
import { OSRecipe } from './types/os';
import { DISTROS } from './data/distros';
import { DESKTOPS } from './data/desktopEnvironments';
import { Header } from './components/Header';
import { StatsBanner } from './components/StatsBanner';
import { DistroSelector } from './components/DistroSelector';
import { DesktopSelector } from './components/DesktopSelector';
import { PackageCatalog } from './components/PackageCatalog';
import { SystemConfig } from './components/SystemConfig';
import { SecurityConfig } from './components/SecurityConfig';
import { PostInstallScripts } from './components/PostInstallScripts';
import { RecipeInspector } from './components/RecipeInspector';
import { Lightbulb, Sparkles, Wand2, Download, Search, Image as ImageIcon, Zap } from 'lucide-react';

// Code-split heavy, non-first-paint views and modals to shrink the initial bundle.
const RealBoot = lazy(() => import('./components/RealBoot').then(m => ({ default: m.RealBoot })));
const BuildPipelineModal = lazy(() => import('./components/BuildPipelineModal').then(m => ({ default: m.BuildPipelineModal })));
const AIAssistantModal = lazy(() => import('./components/AIAssistantModal').then(m => ({ default: m.AIAssistantModal })));
const PresetsModal = lazy(() => import('./components/PresetsModal').then(m => ({ default: m.PresetsModal })));
const TipsModal = lazy(() => import('./components/TipsModal').then(m => ({ default: m.TipsModal })));
const QuickLauncherModal = lazy(() => import('./components/QuickLauncherModal').then(m => ({ default: m.QuickLauncherModal })));
const ScreenshotPreviewModal = lazy(() => import('./components/ScreenshotPreviewModal').then(m => ({ default: m.ScreenshotPreviewModal })));
const VersionCheckerModal = lazy(() => import('./components/VersionCheckerModal').then(m => ({ default: m.VersionCheckerModal })));

const DEFAULT_RECIPE: OSRecipe = {
  id: 'custom-os-01',
  name: 'ForgeOS Custom',
  description: 'Distribution Linux personnalisée compilée avec OSForge Studio',
  distro: 'debian',
  distroVersion: '13 (Trixie Testing / Next)',
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
  const [recipe, setRecipe] = useState<OSRecipe>(DEFAULT_RECIPE);
  const [activeTab, setActiveTab] = useState<string>('builder');
  const [lang, setLang] = useState<'fr' | 'en'>('fr');

  // Modals state
  const [isPresetsOpen, setIsPresetsOpen] = useState<boolean>(false);
  const [isAIOpen, setIsAIOpen] = useState<boolean>(false);
  const [isBuildOpen, setIsBuildOpen] = useState<boolean>(false);
  const [isTipsOpen, setIsTipsOpen] = useState<boolean>(false);
  const [isLauncherOpen, setIsLauncherOpen] = useState<boolean>(false);
  const [isScreenshotsOpen, setIsScreenshotsOpen] = useState<boolean>(false);
  const [isVersionCheckerOpen, setIsVersionCheckerOpen] = useState<boolean>(false);
  const [previewDistroId, setPreviewDistroId] = useState<string | undefined>(undefined);
  const [previewDesktopId, setPreviewDesktopId] = useState<string | undefined>(undefined);

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
    setActiveTab(targetTab);
  };

  const handleOpenScreenshots = (targetDistroOrDesktopId?: string) => {
    if (targetDistroOrDesktopId) {
      if (DISTROS.some(d => d.id === targetDistroOrDesktopId)) {
        setPreviewDistroId(targetDistroOrDesktopId);
      } else if (DESKTOPS.some(de => de.id === targetDistroOrDesktopId)) {
        setPreviewDesktopId(targetDistroOrDesktopId);
      }
    }
    setIsScreenshotsOpen(true);
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-main)' }}>
      {/* Header Bar */}
      <Header
        onOpenPresets={() => setIsPresetsOpen(true)}
        onOpenAI={() => setIsAIOpen(true)}
        onStartBuild={() => setIsBuildOpen(true)}
        onOpenTips={() => setIsTipsOpen(true)}
        onOpenLauncher={() => setIsLauncherOpen(true)}
        onOpenScreenshots={() => handleOpenScreenshots()}
        onOpenVersionChecker={() => setIsVersionCheckerOpen(true)}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        lang={lang}
        setLang={setLang}
      />

      {/* Real-time Status Banner */}
      <StatsBanner recipe={recipe} lang={lang} />

      {/* Main Workspace Container */}
      <main style={{
        maxWidth: '1540px',
        width: '100%',
        margin: '0 auto',
        padding: '20px 24px',
        flex: 1,
      }}>
        {/* Tab 1: Studio Builder (Base + Arch + Desktop) */}
        {activeTab === 'builder' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
            <DistroSelector
              recipe={recipe}
              onChange={handleUpdateRecipe}
              lang={lang}
              onOpenTips={() => setIsTipsOpen(true)}
              onOpenScreenshots={handleOpenScreenshots}
            />
            <DesktopSelector
              recipe={recipe}
              onChange={handleUpdateRecipe}
              lang={lang}
              onOpenTips={() => setIsTipsOpen(true)}
              onOpenScreenshots={handleOpenScreenshots}
            />
          </div>
        )}

        {/* Tab 2: Packages Catalog */}
        {activeTab === 'packages' && (
          <PackageCatalog recipe={recipe} onChange={handleUpdateRecipe} lang={lang} onOpenTips={() => setIsTipsOpen(true)} />
        )}

        {/* Tab 3: System & Identity */}
        {activeTab === 'system' && (
          <SystemConfig recipe={recipe} onChange={handleUpdateRecipe} lang={lang} onOpenTips={() => setIsTipsOpen(true)} />
        )}

        {/* Tab 4: Security & Hardening */}
        {activeTab === 'security' && (
          <SecurityConfig recipe={recipe} onChange={handleUpdateRecipe} lang={lang} onOpenTips={() => setIsTipsOpen(true)} />
        )}

        {/* Tab 5: Post-Install Scripts & Hooks */}
        {activeTab === 'postinstall' && (
          <PostInstallScripts recipe={recipe} onChange={handleUpdateRecipe} lang={lang} onOpenTips={() => setIsTipsOpen(true)} />
        )}

        {/* Tab 6: Code & Recipe Inspector */}
        {activeTab === 'inspector' && (
          <RecipeInspector recipe={recipe} lang={lang} onOpenTips={() => setIsTipsOpen(true)} />
        )}

        {/* Tab 7: Real Linux boot in the browser (v86 WASM x86 emulator) */}
        {activeTab === 'sandbox' && (
          <Suspense fallback={null}>
            <RealBoot lang={lang} />
          </Suspense>
        )}
      </main>

      {/* Footer */}
      <footer style={{
        borderTop: '1px solid var(--border-subtle)',
        background: 'rgba(10, 15, 29, 0.95)',
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontWeight: 600, color: '#f8fafc' }}>OSForge Studio</span>
            <span>—</span>
            <span>Concepteur & Compilateur de Distributions Linux</span>
          </div>

          <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
            <button
              onClick={() => setIsVersionCheckerOpen(true)}
              style={{ background: 'none', border: 'none', color: '#10b981', cursor: 'pointer', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '4px' }}
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
              style={{ background: 'none', border: 'none', color: '#a78bfa', cursor: 'pointer', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              <Download size={13} />
              <span>{lang === 'fr' ? 'Kit Export (ZIP)' : 'Export Kit (ZIP)'}</span>
            </button>
          </div>
        </div>
      </footer>

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
          onLaunchInApp={() => setActiveTab('sandbox')}
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
      </Suspense>
    </div>
  );
};

export default App;
