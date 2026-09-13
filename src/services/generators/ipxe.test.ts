import { describe, it, expect } from 'vitest';
import {
  generateIpxeScript,
  generatePxeServerScript,
  generatePxeServerSh,
  generatePxeServerPowershell,
  generatePxeServerBat,
} from './ipxe';
import { OSRecipe } from '../../types/os';

const mockRecipe: OSRecipe = {
  id: 'test-pxe',
  name: 'Forge Netboot OS',
  description: 'Test netboot OS',
  distro: 'debian',
  distroVersion: '13 (Trixie)',
  arch: 'x86_64',
  desktop: 'xfce',
  displayManager: 'lightdm',
  kernel: 'generic',
  outputFormat: 'iso_hybrid',
  hostname: 'forge-net',
  locale: 'en_US',
  timezone: 'UTC',
  keyboardLayout: 'us',
  selectedPackages: [],
  customPackages: [],
  customServices: [],
  firstBootScript: '',
  user: {
    username: 'forgeuser',
    fullName: 'Forge User',
    password: 'securepassword',
    sudo: true,
    autologin: true,
    shell: '/bin/bash',
  },
  branding: {
    osName: 'ForgeNet',
    editionName: 'Netboot Pro',
    version: '1.0',
    accentColor: '#0ea5e9',
    wallpaperPreset: 'minimal',
    bootSplashTheme: 'minimal',
  },
  security: {
    cisBenchmarkLevel: 1,
    firewall: 'ufw',
    appArmorOrSELinux: true,
    fail2ban: false,
    luksEncryption: false,
    disableRootSSH: true,
    autoSecurityUpdates: true,
  },
  enableSSH: true,
  enableLiveRescue: true,
  kernelCmdline: 'console=tty0',
};

describe('Chantier 3 : Serveur PXE / Netboot Réseau 1-Clic (ipxe.ts)', () => {
  it('génère un script iPXE complet avec live_boot, rescue_boot et failsafe_boot', () => {
    const ipxe = generateIpxeScript(mockRecipe);
    expect(ipxe).toContain('#!ipxe');
    expect(ipxe).toContain('set http_base http://${boot_server}/osforge');
    expect(ipxe).toContain(':live_boot');
    expect(ipxe).toContain('fetch=${http_base}/filesystem.squashfs');
    expect(ipxe).toContain('console=tty0');
    expect(ipxe).toContain(':rescue_boot');
    expect(ipxe).toContain('toram');
    expect(ipxe).toContain(':failsafe_boot');
    expect(ipxe).toContain('nomodeset');
  });

  it('génère un script serveur PXE Linux bash avec dnsmasq proxy-DHCP', () => {
    const sh = generatePxeServerScript(mockRecipe);
    expect(sh).toContain('#!/usr/bin/env bash');
    expect(sh).toContain('port=0');
    expect(sh).toContain('dhcp-range=192.168.1.0,proxy');
    expect(sh).toContain('undionly.kpxe');
    expect(sh).toContain('ipxe.efi');
    expect(sh).toContain('systemctl restart dnsmasq');
    // Vérification de l'alias
    expect(generatePxeServerSh).toBe(generatePxeServerScript);
  });

  it('génère un script PowerShell Windows pour serveur Netboot', () => {
    const ps = generatePxeServerPowershell(mockRecipe);
    expect(ps).toContain('OSForge Studio - Serveur Netboot / iPXE Windows (PowerShell)');
    expect(ps).toContain('boot.ipxe');
    expect(ps).toContain('undionly.kpxe');
    expect(ps).toContain('ipxe.efi');
    expect(ps).toContain('Invoke-WebRequest');
  });

  it('génère un lanceur batch Windows 1-clic pour serveur PXE', () => {
    const bat = generatePxeServerBat(mockRecipe);
    expect(bat).toContain('@echo off');
    expect(bat).toContain('powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%PS_SCRIPT%"');
    expect(bat).toContain('python -m http.server');
  });
});
