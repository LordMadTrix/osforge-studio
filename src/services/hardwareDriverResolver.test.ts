import { describe, it, expect } from 'vitest';
import { resolveHardwareDrivers, DEFAULT_HARDWARE_PROFILE } from './hardwareDriverResolver';
import { OSRecipe } from '../types/os';

const BASE_RECIPE: OSRecipe = {
  id: 'test-recipe',
  name: 'Test OS',
  description: 'Test Recipe',
  distro: 'debian',
  distroVersion: '12',
  distroSuite: 'bookworm',
  arch: 'x86_64',
  outputFormat: 'iso_hybrid',
  desktop: 'none',
  displayManager: 'none',
  kernel: 'generic',
  selectedPackages: [],
  customPackages: [],
  branding: {
    osName: 'TestOS',
    editionName: 'Test',
    version: '1.0',
    accentColor: '#000000',
    wallpaperPreset: 'minimal',
    bootSplashTheme: 'minimal',
  },
  user: {
    username: 'user',
    fullName: 'User',
    password: 'password',
    sudo: true,
    autologin: false,
    shell: '/bin/bash',
  },
  hostname: 'testhost',
  timezone: 'UTC',
  locale: 'en_US',
  keyboardLayout: 'us',
  enableSSH: false,
  security: {
    cisBenchmarkLevel: 0,
    firewall: 'none',
    appArmorOrSELinux: false,
    fail2ban: false,
    luksEncryption: false,
    disableRootSSH: false,
    autoSecurityUpdates: false,
  },
  customServices: [],
  firstBootScript: '',
};

describe('Hardware Driver Resolver (Zéro Cosmétique)', () => {
  it('injects Intel microcode for Debian and Arch', () => {
    const resDebian = resolveHardwareDrivers(BASE_RECIPE, {
      ...DEFAULT_HARDWARE_PROFILE,
      cpu: 'intel',
    });
    expect(resDebian.addedPackages).toContain('intel-microcode');

    const resArch = resolveHardwareDrivers({ ...BASE_RECIPE, distro: 'arch' }, {
      ...DEFAULT_HARDWARE_PROFILE,
      cpu: 'intel',
    });
    expect(resArch.addedPackages).toContain('intel-ucode');
  });

  it('injects AMD microcode for Debian and Arch', () => {
    const resDebian = resolveHardwareDrivers(BASE_RECIPE, {
      ...DEFAULT_HARDWARE_PROFILE,
      cpu: 'amd',
    });
    expect(resDebian.addedPackages).toContain('amd64-microcode');

    const resArch = resolveHardwareDrivers({ ...BASE_RECIPE, distro: 'arch' }, {
      ...DEFAULT_HARDWARE_PROFILE,
      cpu: 'amd',
    });
    expect(resArch.addedPackages).toContain('amd-ucode');
  });

  it('configures Nvidia proprietary drivers and kernel modeset cmdline', () => {
    const res = resolveHardwareDrivers(BASE_RECIPE, {
      ...DEFAULT_HARDWARE_PROFILE,
      gpu: 'nvidia_proprietary',
    });
    expect(res.addedPackages).toContain('nvidia-driver');
    expect(res.addedPackages).toContain('nvidia-kernel-dkms');
    expect(res.kernelCmdlineAdditions).toContain('nvidia-drm.modeset=1');
    expect(res.updatedRecipe.kernelCmdline).toContain('nvidia-drm.modeset=1');
  });

  it('configures AMD Radeon firmware and Vulkan drivers', () => {
    const res = resolveHardwareDrivers(BASE_RECIPE, {
      ...DEFAULT_HARDWARE_PROFILE,
      gpu: 'amd_radeon',
    });
    expect(res.addedPackages).toContain('firmware-amd-graphics');
    expect(res.addedPackages).toContain('mesa-vulkan-drivers');
  });

  it('injects Broadcom Wi-Fi DKMS on request', () => {
    const res = resolveHardwareDrivers(BASE_RECIPE, {
      ...DEFAULT_HARDWARE_PROFILE,
      wifi: 'broadcom_wifi',
    });
    expect(res.addedPackages).toContain('broadcom-sta-dkms');
  });

  it('configures laptop power saving packages', () => {
    const res = resolveHardwareDrivers(BASE_RECIPE, {
      ...DEFAULT_HARDWARE_PROFILE,
      formFactor: 'laptop',
    });
    expect(res.addedPackages).toContain('tlp');
    expect(res.addedPackages).toContain('powertop');
  });

  it('injects TPM 2.0 security tooling when enabled', () => {
    const res = resolveHardwareDrivers(BASE_RECIPE, {
      ...DEFAULT_HARDWARE_PROFILE,
      installTpm2: true,
    });
    expect(res.addedPackages).toContain('tpm2-tools');
  });
});
