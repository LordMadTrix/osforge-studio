import { describe, it, expect } from 'vitest';
import { generateTechnicalManualMarkdown } from './technicalManual';
import { OSRecipe } from '../../types/os';

const sampleRecipe: OSRecipe = {
  id: 'doc-test',
  name: 'ForgeOS Pro Gaming',
  description: 'Station de test pour génération documentaire',
  distro: 'debian',
  distroVersion: '13 (Trixie)',
  distroSuite: 'trixie',
  arch: 'x86_64',
  outputFormat: 'iso_hybrid',
  desktop: 'kde',
  displayManager: 'sddm',
  kernel: 'xanmod',
  selectedPackages: ['docker', 'git', 'steam', 'fastfetch'],
  customPackages: ['ripgrep'],
  branding: {
    osName: 'ForgeOS',
    editionName: 'Pro Gaming',
    version: '2026.1',
    accentColor: '#38bdf8',
    wallpaperPreset: 'gaming_rog',
    bootSplashTheme: 'cyberpunk',
  },
  user: {
    username: 'gamer',
    fullName: 'Gamer Pro',
    sudo: true,
    autologin: true,
    shell: '/bin/bash',
  },
  hostname: 'forge-rig',
  timezone: 'Europe/Paris',
  locale: 'fr_FR',
  keyboardLayout: 'fr',
  enableSSH: true,
  security: {
    cisBenchmarkLevel: 1,
    firewall: 'ufw',
    allowedPorts: [22, 80, 443],
    appArmorOrSELinux: true,
    fail2ban: true,
    enableCrowdSec: true,
    luksEncryption: true,
    disableRootSSH: true,
    autoSecurityUpdates: true,
  },
  customServices: [],
  firstBootScript: '#!/bin/sh\necho "test"',
  enableGamingOptimizations: true,
  enableProAudio: true,
  enableLocalAiStack: true,
  localAiModel: 'llama3.2:3b',
  enableOpenWebUi: true,
  enableBtrfsSnapshots: true,
  filesystem: 'btrfs',
};

describe('generateTechnicalManualMarkdown (Fiche Technique Système & Dossier d’Architecture)', () => {
  it('génère un document Markdown avec sections d’architecture, identité et métadonnées', () => {
    const doc = generateTechnicalManualMarkdown(sampleRecipe);
    expect(doc).toContain('FICHE TECHNIQUE DU SYSTÈME — FORGEOS');
    expect(doc).toContain('ForgeOS');
    expect(doc).toContain('x86_64');
    expect(doc).toContain('KDE Plasma');
    expect(doc).toContain('xanmod');
  });

  it('détaille les modules avancés actifs (IA locale, Btrfs, Audio Pro, CrowdSec)', () => {
    const doc = generateTechnicalManualMarkdown(sampleRecipe);
    expect(doc).toContain('Appliance IA Locale (Ollama + Open WebUI)');
    expect(doc).toContain('llama3.2:3b');
    expect(doc).toContain('Système de Snapshots Btrfs & Restauration GRUB');
    expect(doc).toContain('Audio Professionnel & MAO Faible Latence');
    expect(doc).toContain('Cyber-Défense CrowdSec');
    expect(doc).toContain('Chiffrement LUKS2');
  });

  it('adapte les commandes d’administration selon le gestionnaire de paquets de la distro', () => {
    const debianDoc = generateTechnicalManualMarkdown(sampleRecipe);
    expect(debianDoc).toContain('apt-get update && apt-get upgrade');

    const archRecipe: OSRecipe = {
      ...sampleRecipe,
      distro: 'arch',
    };
    const archDoc = generateTechnicalManualMarkdown(archRecipe);
    expect(archDoc).toContain('pacman -Syu');

    const fedoraRecipe: OSRecipe = {
      ...sampleRecipe,
      distro: 'fedora',
    };
    const fedoraDoc = generateTechnicalManualMarkdown(fedoraRecipe);
    expect(fedoraDoc).toContain('dnf upgrade');
  });
});
