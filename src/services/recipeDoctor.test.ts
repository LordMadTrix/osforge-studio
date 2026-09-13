import { describe, it, expect } from 'vitest';
import { auditRecipe, applyRecipeFix } from './recipeDoctor';
import { OSRecipe } from '../types/os';

const baseRecipe: OSRecipe = {
  id: 'test-recipe-01',
  name: 'Test OS',
  description: 'Test recipe',
  distro: 'debian',
  distroVersion: '13 (Trixie)',
  arch: 'x86_64',
  outputFormat: 'iso_hybrid',
  desktop: 'xfce',
  displayManager: 'lightdm',
  kernel: 'generic',
  selectedPackages: [],
  customPackages: [],
  customServices: [],
  firstBootScript: '',
  enableSSH: false,
  hostname: 'test-node',
  locale: 'fr_FR',
  timezone: 'Europe/Paris',
  keyboardLayout: 'fr',
  user: {
    username: 'admin',
    fullName: 'Admin User',
    password: 'SuperSecurePassword2026!',
    sudo: true,
    autologin: false,
    shell: '/bin/bash',
  },
  branding: {
    osName: 'TestOS',
    editionName: 'TestEdition',
    version: '1.0',
    accentColor: '#0284c7',
    wallpaperPreset: 'minimal',
    bootSplashTheme: 'minimal',
  },
  security: {
    cisBenchmarkLevel: 1,
    firewall: 'ufw',
    appArmorOrSELinux: true,
    fail2ban: true,
    disableRootSSH: true,
    luksEncryption: false,
    autoSecurityUpdates: true,
  },
};

describe('🩺 Recipe Doctor — Analyse Statique & Détection d\'Incohérences', () => {
  it('détecte une recette saine Debian avec un score maximal', () => {
    const report = auditRecipe(baseRecipe);
    expect(report.passed).toBe(true);
    expect(report.errorCount).toBe(0);
    expect(report.score).toBe(100);
    expect(report.securityScore).toBeGreaterThanOrEqual(80);
  });

  it('détecte et corrige le format ISO sur une distribution non-Debian (Arch)', () => {
    const archRecipe: OSRecipe = {
      ...baseRecipe,
      distro: 'arch',
      outputFormat: 'iso_hybrid',
    };

    const report = auditRecipe(archRecipe);
    expect(report.passed).toBe(false);
    expect(report.errorCount).toBeGreaterThan(0);
    const nonDebianIsoDiag = report.diagnostics.find((d) => d.id === 'non-debian-iso');
    expect(nonDebianIsoDiag).toBeDefined();
    expect(nonDebianIsoDiag?.severity).toBe('error');

    // Test de l'auto-fix
    const fixed = applyRecipeFix(archRecipe, 'non-debian-iso');
    expect(fixed.outputFormat).toBe('qcow2');
    const newReport = auditRecipe(fixed);
    expect(newReport.diagnostics.some((d) => d.id === 'non-debian-iso')).toBe(false);
  });

  it('détecte et corrige l\'incompatibilité Rocky 9 avec LXQt', () => {
    const rockyRecipe: OSRecipe = {
      ...baseRecipe,
      distro: 'rocky',
      outputFormat: 'qcow2',
      desktop: 'lxqt',
    };

    const report = auditRecipe(rockyRecipe);
    const rockyDiag = report.diagnostics.find((d) => d.id === 'rocky-missing-desktop');
    expect(rockyDiag).toBeDefined();
    expect(rockyDiag?.severity).toBe('error');

    const fixed = applyRecipeFix(rockyRecipe, 'rocky-missing-desktop');
    expect(fixed.desktop).toBe('xfce');
  });

  it('détecte une incompatibilité cross-architecture sur Arch (ARM64)', () => {
    const crossArchRecipe: OSRecipe = {
      ...baseRecipe,
      distro: 'arch',
      outputFormat: 'qcow2',
      arch: 'aarch64',
    };

    const report = auditRecipe(crossArchRecipe);
    const crossDiag = report.diagnostics.find((d) => d.id === 'non-debian-cross-arch');
    expect(crossDiag).toBeDefined();
    expect(crossDiag?.severity).toBe('error');

    const fixed = applyRecipeFix(crossArchRecipe, 'non-debian-cross-arch');
    expect(fixed.arch).toBe('x86_64');
  });

  it('détecte l\'incompatibilité d\'Ollama glibc sur Alpine Linux musl', () => {
    const alpineRecipe: OSRecipe = {
      ...baseRecipe,
      distro: 'alpine',
      outputFormat: 'qcow2',
      selectedPackages: ['ollama_ai'],
    };

    const report = auditRecipe(alpineRecipe);
    const ollamaDiag = report.diagnostics.find((d) => d.id === 'alpine-ollama-glibc');
    expect(ollamaDiag).toBeDefined();
    expect(ollamaDiag?.severity).toBe('warning');

    const fixed = applyRecipeFix(alpineRecipe, 'alpine-ollama-glibc');
    expect(fixed.selectedPackages).not.toContain('ollama_ai');
  });

  it('détecte un avertissement lorsque Cinnamon utilise GDM3 sous VM', () => {
    const cinnamonRecipe: OSRecipe = {
      ...baseRecipe,
      desktop: 'cinnamon',
      displayManager: 'gdm3',
    };

    const report = auditRecipe(cinnamonRecipe);
    const gdm3Diag = report.diagnostics.find((d) => d.id === 'cinnamon-gdm3-mismatch');
    expect(gdm3Diag).toBeDefined();
    expect(gdm3Diag?.severity).toBe('warning');

    const fixed = applyRecipeFix(cinnamonRecipe, 'cinnamon-gdm3-mismatch');
    expect(fixed.displayManager).toBe('lightdm');
  });

  it('détecte et corrige l\'absence de mot de passe lorsque SSH est activé', () => {
    const sshRecipe: OSRecipe = {
      ...baseRecipe,
      enableSSH: true,
      user: {
        ...baseRecipe.user,
        password: '',
        sshPublicKey: undefined,
      },
    };

    const report = auditRecipe(sshRecipe);
    const sshDiag = report.diagnostics.find((d) => d.id === 'ssh-no-auth');
    expect(sshDiag).toBeDefined();
    expect(sshDiag?.severity).toBe('error');

    const fixed = applyRecipeFix(sshRecipe, 'ssh-no-auth');
    expect(fixed.user.password).toBe('forge');
  });

  it('détecte et corrige le chiffrement LUKS sans phrase de passe', () => {
    const luksRecipe: OSRecipe = {
      ...baseRecipe,
      security: {
        ...baseRecipe.security,
        luksEncryption: true,
        luksPassword: '',
      },
    };

    const report = auditRecipe(luksRecipe);
    const luksDiag = report.diagnostics.find((d) => d.id === 'luks-no-passphrase');
    expect(luksDiag).toBeDefined();
    expect(luksDiag?.severity).toBe('error');

    const fixed = applyRecipeFix(luksRecipe, 'luks-no-passphrase');
    expect(fixed.security.luksPassword).toBeTruthy();
  });
});
