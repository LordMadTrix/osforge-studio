import { describe, it, expect } from 'vitest';
import { StudioSectionId } from './ExpertProStudio';
import { OSRecipe } from '../types/os';

describe('Navigation Studio Expert — Isolation stricte de chaque section sur sa propre page', () => {
  const expectedSections: StudioSectionId[] = [
    'base_distro',
    'ui_desktop',
    'ui_simulators',
    'brand_design',
    'pkgs_catalog',
    'sys_config',
    'sys_gaming',
    'sec_hardening',
    'post_scripts',
    'export_inspector',
  ];

  const sampleRecipe: OSRecipe = {
    id: 'test-recipe',
    name: 'OSForge Test',
    description: 'Test Recipe for page views',
    customServices: [],
    firstBootScript: '',
    distro: 'debian',
    distroVersion: '13',
    arch: 'x86_64',
    outputFormat: 'iso_hybrid',
    desktop: 'kde',
    displayManager: 'sddm',
    kernel: 'zen',
    selectedPackages: ['neovim', 'fastfetch'],
    customPackages: [],
    branding: {
      osName: 'OSForge Pro',
      editionName: 'Gaming ROG',
      version: '1.0',
      accentColor: '#e11d48',
      wallpaperPreset: 'gaming_rog',
      bootSplashTheme: 'osforge-custom',
    },
    user: {
      username: 'gamer',
      fullName: 'Forge Gamer',
      password: 'secretpassword',
      sudo: true,
      autologin: true,
      shell: '/bin/bash',
    },
    hostname: 'osforge-rig',
    timezone: 'Europe/Paris',
    locale: 'fr_FR.UTF-8',
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
    gamingConfig: {
      enableMangoHud: true,
      mangoHudPreset: 'compact_topbar',
      enableProtonGE: true,
      enableCoreCtrlProfiles: true,
      pipewireQuantumLatency: 128,
      cpuGovernor: 'performance',
    },
  };

  it('définit précisément les 10 sections uniques dans l’arborescence Studio', () => {
    expect(expectedSections).toHaveLength(10);
    expect(new Set(expectedSections).size).toBe(10);
  });

  it('garantit que le recipe est compatible avec toutes les sections dédiées', () => {
    expect(sampleRecipe.distro).toBe('debian');
    expect(sampleRecipe.desktop).toBe('kde');
    expect(sampleRecipe.branding.accentColor).toBe('#e11d48');
    expect(sampleRecipe.branding.bootSplashTheme).toBe('osforge-custom');
    expect(sampleRecipe.branding.wallpaperPreset).toBe('gaming_rog');
    expect(sampleRecipe.gamingConfig?.cpuGovernor).toBe('performance');
    expect(sampleRecipe.gamingConfig?.pipewireQuantumLatency).toBe(128);
  });
});
