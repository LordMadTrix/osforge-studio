import { describe, it, expect } from 'vitest';
import { OSRecipe } from '../types/os';
import { analyzeAndRecommend, generateHardwareAuditScript, DetectedHardware } from './hardwareAuditor';

function makeBaseRecipe(): OSRecipe {
  return {
    id: 'base-recipe',
    name: 'Test OS',
    description: 'Test recipe',
    distro: 'debian',
    distroVersion: '13 (Trixie)',
    distroSuite: 'trixie',
    arch: 'x86_64',
    outputFormat: 'iso_hybrid',
    desktop: 'kde',
    displayManager: 'sddm',
    kernel: 'generic',
    selectedPackages: ['curl'],
    customPackages: [],
    user: {
      username: 'user',
      password: 'password',
      fullName: 'User',
      sudo: true,
      autologin: true,
      shell: '/bin/bash',
    },
    hostname: 'test-host',
    timezone: 'Europe/Paris',
    locale: 'fr_FR.UTF-8',
    keyboardLayout: 'fr',
    enableSSH: false,
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
      osName: 'TestOS',
      editionName: 'Default',
      version: '1.0',
      accentColor: '#38bdf8',
      wallpaperPreset: 'minimal',
      bootSplashTheme: 'minimal',
    },
  };
}

describe('Moteur d\'Audit Matériel & Recommandation (hardwareAuditor.ts)', () => {
  it('recommande le profil Gaming ROG avec GPU NVIDIA dédié et multi-cœurs', () => {
    const hardware: DetectedHardware = {
      cpuCores: 8,
      ramGb: 16,
      gpuRenderer: 'NVIDIA GeForce RTX 4070 Laptop GPU',
      gpuVendor: 'NVIDIA Corporation',
      isDedicatedGpu: true,
      gpuType: 'nvidia',
      deviceType: 'laptop',
      hasBattery: true,
      screenWidth: 1920,
      screenHeight: 1080,
      pixelRatio: 1,
      osPlatform: 'Win32',
      arch: 'x86_64',
    };

    const reco = analyzeAndRecommend(hardware, makeBaseRecipe());

    expect(reco.profileId).toBe('gaming_beast');
    expect(reco.distro).toBe('ubuntu');
    expect(reco.kernel).toBe('xanmod');
    expect(reco.gpuDriver).toBe('nvidia_proprietary');
    expect(reco.enableGamingOptimizations).toBe(true);
    expect(reco.enableSteamConsoleMode).toBe(true);
    expect(reco.enablePowerSaving).toBe(true);
    expect(reco.matchScore).toBeGreaterThanOrEqual(95);
  });

  it('recommande le profil Ultra-Light avec XFCE et ZRAM pour les machines à mémoire faible', () => {
    const hardware: DetectedHardware = {
      cpuCores: 2,
      ramGb: 2,
      gpuRenderer: 'Intel HD Graphics 3000',
      gpuVendor: 'Intel',
      isDedicatedGpu: false,
      gpuType: 'intel',
      deviceType: 'laptop',
      hasBattery: true,
      screenWidth: 1366,
      screenHeight: 768,
      pixelRatio: 1,
      osPlatform: 'Linux x86_64',
      arch: 'x86_64',
    };

    const reco = analyzeAndRecommend(hardware, makeBaseRecipe());

    expect(reco.profileId).toBe('lightweight_efficiency');
    expect(reco.distro).toBe('debian');
    expect(reco.desktop).toBe('xfce');
    expect(reco.enableZram).toBe(true);
    expect(reco.enableGamingOptimizations).toBe(false);
  });

  it('recommande le profil Station de Travail pour CPU et RAM confortables avec GPU intégré', () => {
    const hardware: DetectedHardware = {
      cpuCores: 8,
      ramGb: 16,
      gpuRenderer: 'Intel Iris Xe Graphics',
      gpuVendor: 'Intel',
      isDedicatedGpu: false,
      gpuType: 'intel',
      deviceType: 'desktop',
      hasBattery: false,
      screenWidth: 2560,
      screenHeight: 1440,
      pixelRatio: 1,
      osPlatform: 'Linux x86_64',
      arch: 'x86_64',
    };

    const reco = analyzeAndRecommend(hardware, makeBaseRecipe());

    expect(reco.profileId).toBe('power_workstation');
    expect(reco.desktop).toBe('kde');
    expect(reco.enableFlatpak).toBe(true);
  });

  it('génère un script d\'audit bash avec les commandes système réelles', () => {
    const script = generateHardwareAuditScript('bash');
    expect(script).toContain('#!/usr/bin/env bash');
    expect(script).toContain('lscpu');
    expect(script).toContain('free -h');
    expect(script).toContain('lspci');
    expect(script).toContain('lsblk');
    expect(script).toContain('/sys/firmware/efi');
  });

  it('génère un script d\'audit Windows batch avec WMIC', () => {
    const script = generateHardwareAuditScript('bat');
    expect(script).toContain('@echo off');
    expect(script).toContain('wmic cpu');
    expect(script).toContain('wmic computersystem');
    expect(script).toContain('wmic path win32_videocontroller');
  });
});
