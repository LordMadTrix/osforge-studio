import { describe, it, expect } from 'vitest';
import { OSRecipe } from '../../types/os';
import { generateOfflineCacheBundleScript, offlineRepoConfigCmd } from './offlineCache';
import { generateBuildScript } from './index';

function makeTestRecipe(overrides: Partial<OSRecipe> = {}): OSRecipe {
  return {
    id: 'test-offline-recipe',
    name: 'MadOS Offline Edition',
    description: 'Test Recipe for Air-Gapped Builds',
    distro: 'debian',
    distroVersion: '13 (Trixie)',
    distroSuite: 'trixie',
    arch: 'x86_64',
    outputFormat: 'iso_hybrid',
    desktop: 'kde',
    displayManager: 'sddm',
    kernel: 'generic',
    selectedPackages: ['git', 'curl', 'fastfetch'],
    customPackages: [],
    user: {
      username: 'offline-user',
      password: 'password',
      fullName: 'Offline Tester',
      sudo: true,
      autologin: true,
      shell: '/bin/bash',
    },
    hostname: 'offline-box',
    timezone: 'Europe/Paris',
    locale: 'fr_FR.UTF-8',
    keyboardLayout: 'fr',
    enableSSH: true,
    customServices: [],
    firstBootScript: '',
    security: {
      firewall: 'none',
      appArmorOrSELinux: false,
      fail2ban: false,
      luksEncryption: false,
      disableRootSSH: false,
      autoSecurityUpdates: false,
      cisBenchmarkLevel: 0,
    },
    branding: {
      osName: 'MadOS',
      editionName: 'Air-Gapped Edition',
      version: '1.0',
      accentColor: '#38bdf8',
      wallpaperPreset: 'minimal',
      bootSplashTheme: 'minimal',
    },
    ...overrides,
  };
}

describe('Moteur de Dépôts Hors-Ligne & Compilateur en Réseau Isolé (offlineCache.ts)', () => {
  it('generateOfflineCacheBundleScript : génère un script de téléchargement Debian avec dpkg-scanpackages', () => {
    const recipe = makeTestRecipe({ distro: 'debian', distroSuite: 'bookworm' });
    const script = generateOfflineCacheBundleScript(recipe);

    expect(script).toContain('#!/usr/bin/env bash');
    expect(script).toContain('set -euo pipefail');
    expect(script).toContain('apt-get install --download-only -y');
    expect(script).toContain('dpkg-scanpackages . /dev/null 2>/dev/null | gzip -9c > Packages.gz');
    expect(script).toContain('debootstrap --download-only');
    expect(script).toContain('offline-cache-debian-bookworm.tar.gz');
  });

  it('generateOfflineCacheBundleScript : génère les commandes Arch Linux avec pacman et repo-add', () => {
    const recipe = makeTestRecipe({ distro: 'arch', distroSuite: 'rolling' });
    const script = generateOfflineCacheBundleScript(recipe);

    expect(script).toContain('pacman -Syw --cachedir');
    expect(script).toContain('repo-add');
    expect(script).toContain('offline.db.tar.gz');
    expect(script).toContain('offline-cache-arch-rolling.tar.gz');
  });

  it('generateOfflineCacheBundleScript : génère les commandes Fedora avec dnf et createrepo_c', () => {
    const recipe = makeTestRecipe({ distro: 'fedora', distroSuite: '44' });
    const script = generateOfflineCacheBundleScript(recipe);

    expect(script).toContain('dnf download --resolve --alldeps');
    expect(script).toContain('createrepo_c');
    expect(script).toContain('offline-cache-fedora-44.tar.gz');
  });

  it('offlineRepoConfigCmd : configure le dépôt local Debian avec trusted=yes', () => {
    const recipe = makeTestRecipe({ enableOfflineCache: true, offlineCachePath: './my-offline-cache' });
    const cmd = offlineRepoConfigCmd(recipe, 'debian');

    expect(cmd).toContain('deb [trusted=yes] file:/var/cache/offline-cache/debs ./');
    expect(cmd).toContain('./my-offline-cache/debs');
    expect(cmd).toContain('Acquire::http::Timeout "1";');
  });

  it('offlineRepoConfigCmd : configure le dépôt local Arch et Fedora', () => {
    const recipe = makeTestRecipe({ enableOfflineCache: true });
    const archCmd = offlineRepoConfigCmd(recipe, 'arch');
    const fedoraCmd = offlineRepoConfigCmd(recipe, 'fedora');

    expect(archCmd).toContain('Server = file:///var/cache/offline-cache/pkgs');
    expect(fedoraCmd).toContain('baseurl=file:///var/cache/offline-cache/rpms');
  });

  it('offlineRepoConfigCmd : retourne une chaîne vide si enableOfflineCache est faux', () => {
    const recipe = makeTestRecipe({ enableOfflineCache: false });
    const cmd = offlineRepoConfigCmd(recipe, 'debian');
    expect(cmd).toBe('');
  });

  it('generateBuildScript : injecte la configuration hors-ligne dans le script de build réel', () => {
    const recipe = makeTestRecipe({ enableOfflineCache: true });
    const script = generateBuildScript(recipe);

    expect(script).toContain('[OFFLINE] Configuration du dépôt local file:/var/cache/offline-cache/debs');
    expect(script).toContain('deb [trusted=yes] file:/var/cache/offline-cache/debs ./');
  });
});
