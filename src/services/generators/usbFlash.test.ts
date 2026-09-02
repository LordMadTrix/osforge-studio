import { describe, it, expect } from 'vitest';
import { OSRecipe } from '../../types/os';
import { generateUsbFlashScript, generateUsbFlashBash, generateUsbFlashWindows } from './usbFlash';

function makeTestRecipe(overrides: Partial<OSRecipe> = {}): OSRecipe {
  return {
    id: 'test-recipe',
    name: 'MadOS ROG Edition',
    description: 'Test Recipe',
    distro: 'ubuntu',
    distroVersion: '24.04',
    distroSuite: 'noble',
    arch: 'x86_64',
    outputFormat: 'iso_hybrid',
    desktop: 'kde',
    displayManager: 'sddm',
    kernel: 'xanmod',
    selectedPackages: [],
    customPackages: [],
    user: {
      username: 'gamer',
      password: 'password',
      fullName: 'Mad Gamer',
      sudo: true,
      autologin: true,
      shell: '/bin/bash',
    },
    hostname: 'mados-rog',
    timezone: 'Europe/Paris',
    locale: 'fr_FR.UTF-8',
    keyboardLayout: 'fr',
    enableSSH: true,
    customServices: [],
    firstBootScript: '',
    security: {
      firewall: 'ufw',
      appArmorOrSELinux: true,
      fail2ban: false,
      luksEncryption: false,
      disableRootSSH: true,
      autoSecurityUpdates: true,
      cisBenchmarkLevel: 1,
    },
    branding: {
      osName: 'MadOS',
      editionName: 'ROG Gaming Edition',
      version: '24.04',
      accentColor: '#f43f5e',
      wallpaperPreset: 'gaming_rog',
      bootSplashTheme: 'cyberpunk',
    },
    ...overrides,
  };
}

describe('Générateur de Gravure USB Sécurisée avec Persistance (usbFlash.ts)', () => {
  it('generateUsbFlashBash : génère un script bash avec vérification root et gardes-fous disques', () => {
    const recipe = makeTestRecipe();
    const script = generateUsbFlashBash(recipe);

    expect(script).toContain('#!/usr/bin/env bash');
    expect(script).toContain('set -euo pipefail');
    expect(script).toContain('id -u');
    expect(script).toContain('mados-24.04-x86_64.iso');
    expect(script).toContain('lsblk -d -p -n -l');
    expect(script).toContain('ROOT_DISK=');
    expect(script).toContain('BOOT_DISK=');
    expect(script).toContain('dd if="$ISO_PATH" of="$TARGET_DEV" bs=4M status=progress conv=fdatasync');
  });

  it('generateUsbFlashBash : configure automatiquement la partition de persistance (Casper/Union)', () => {
    const recipe = makeTestRecipe({ enableUsbPersistence: true });
    const script = generateUsbFlashBash(recipe);

    expect(script).toContain('Partition de Persistance');
    expect(script).toContain('mkfs.ext4 -F -L "persistence"');
    expect(script).toContain('echo "/ union" > "$TMP_MNT/persistence.conf"');
  });

  it('generateUsbFlashBash : omet la persistance si enableUsbPersistence = false', () => {
    const recipe = makeTestRecipe({ enableUsbPersistence: false });
    const script = generateUsbFlashBash(recipe);

    expect(script).toContain('Persistance non demandée');
    expect(script).not.toContain('mkfs.ext4 -F -L "persistence"');
    expect(script).not.toContain('persistence.conf');
  });

  it('generateUsbFlashWindows : génère le script batch Windows avec élévation et détection USB', () => {
    const recipe = makeTestRecipe();
    const script = generateUsbFlashWindows(recipe);

    expect(script).toContain('@echo off');
    expect(script).toContain('net session >nul 2>&1');
    expect(script).toContain('Get-Disk | Where-Object { $_.BusType -eq \'USB\' }');
    expect(script).toContain('mados-24.04-x86_64.iso');
  });

  it('generateUsbFlashScript : bascule proprement entre bash et powershell/batch', () => {
    const recipe = makeTestRecipe();
    const bash = generateUsbFlashScript(recipe, 'bash');
    const win = generateUsbFlashScript(recipe, 'powershell');

    expect(bash).toContain('#!/usr/bin/env bash');
    expect(win).toContain('@echo off');
  });
});
