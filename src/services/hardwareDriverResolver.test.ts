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

  it('supports openSUSE and Alpine driver resolution', () => {
    const suseRes = resolveHardwareDrivers({ ...BASE_RECIPE, distro: 'opensuse' }, {
      ...DEFAULT_HARDWARE_PROFILE,
      cpu: 'intel',
      gpu: 'amd_radeon',
      installTpm2: true,
    });
    expect(suseRes.addedPackages).toContain('ucode-intel');
    expect(suseRes.addedPackages).toContain('kernel-firmware-amdgpu');
    expect(suseRes.addedPackages).toContain('libvulkan_radeon');
    expect(suseRes.addedPackages).toContain('tpm2-tools');

    const alpineRes = resolveHardwareDrivers({ ...BASE_RECIPE, distro: 'alpine' }, {
      ...DEFAULT_HARDWARE_PROFILE,
      cpu: 'amd',
      gpu: 'amd_radeon',
      installTpm2: true,
    });
    expect(alpineRes.addedPackages).toContain('amd-ucode');
    expect(alpineRes.addedPackages).toContain('mesa-vulkan-ati');
    expect(alpineRes.addedPackages).toContain('tpm2-tools');
  });
});

describe("Wi-Fi drivers — MediaTek & Atheros & lacunes Intel/Broadcom comblées (firmware-mediatek v20250410-2 et firmware-atheros v20250410-2 confirmés réels sur Debian Trixie le 2026-09-12 via packages.debian.org ; ollama v0.34.0 dans Arch [extra] confirmé via archlinux.org/packages/search/json)", () => {

  describe("MediaTek MT7xxx (Wi-Fi 6/6E) — firmware-mediatek confirmé réel sur Debian Trixie", () => {
    it("Debian → firmware-mediatek", () => {
      const res = resolveHardwareDrivers(BASE_RECIPE, { ...DEFAULT_HARDWARE_PROFILE, wifi: "mediatek_wifi" });
      expect(res.addedPackages).toContain("firmware-mediatek");
    });
    it("Arch → linux-firmware (contient mediatek/*)", () => {
      const res = resolveHardwareDrivers({ ...BASE_RECIPE, distro: "arch" }, { ...DEFAULT_HARDWARE_PROFILE, wifi: "mediatek_wifi" });
      expect(res.addedPackages).toContain("linux-firmware");
    });
    it("Fedora → linux-firmware", () => {
      const res = resolveHardwareDrivers({ ...BASE_RECIPE, distro: "fedora" }, { ...DEFAULT_HARDWARE_PROFILE, wifi: "mediatek_wifi" });
      expect(res.addedPackages).toContain("linux-firmware");
    });
    it("Alpine → linux-firmware", () => {
      const res = resolveHardwareDrivers({ ...BASE_RECIPE, distro: "alpine" }, { ...DEFAULT_HARDWARE_PROFILE, wifi: "mediatek_wifi" });
      expect(res.addedPackages).toContain("linux-firmware");
    });
    it("openSUSE → kernel-firmware-mediatek", () => {
      const res = resolveHardwareDrivers({ ...BASE_RECIPE, distro: "opensuse" }, { ...DEFAULT_HARDWARE_PROFILE, wifi: "mediatek_wifi" });
      expect(res.addedPackages).toContain("kernel-firmware-mediatek");
    });
  });

  describe("Qualcomm Atheros ath10k/ath11k/ath12k — firmware-atheros confirmé réel sur Debian Trixie", () => {
    it("Debian → firmware-atheros", () => {
      const res = resolveHardwareDrivers(BASE_RECIPE, { ...DEFAULT_HARDWARE_PROFILE, wifi: "atheros_wifi" });
      expect(res.addedPackages).toContain("firmware-atheros");
    });
    it("Arch → linux-firmware (contient ath10k/ath11k/*)", () => {
      const res = resolveHardwareDrivers({ ...BASE_RECIPE, distro: "arch" }, { ...DEFAULT_HARDWARE_PROFILE, wifi: "atheros_wifi" });
      expect(res.addedPackages).toContain("linux-firmware");
    });
    it("Fedora → linux-firmware", () => {
      const res = resolveHardwareDrivers({ ...BASE_RECIPE, distro: "fedora" }, { ...DEFAULT_HARDWARE_PROFILE, wifi: "atheros_wifi" });
      expect(res.addedPackages).toContain("linux-firmware");
    });
    it("openSUSE → kernel-firmware-ath10k", () => {
      const res = resolveHardwareDrivers({ ...BASE_RECIPE, distro: "opensuse" }, { ...DEFAULT_HARDWARE_PROFILE, wifi: "atheros_wifi" });
      expect(res.addedPackages).toContain("kernel-firmware-ath10k");
    });
    it("Void → linux-firmware", () => {
      const res = resolveHardwareDrivers({ ...BASE_RECIPE, distro: "void" }, { ...DEFAULT_HARDWARE_PROFILE, wifi: "atheros_wifi" });
      expect(res.addedPackages).toContain("linux-firmware");
    });
  });

  describe("Intel iwlwifi — lacune comblée : Arch/Fedora/Alpine/Void obtenaient RIEN (retour silencieux)", () => {
    it("Arch → linux-firmware (contient iwlwifi/*)", () => {
      const res = resolveHardwareDrivers({ ...BASE_RECIPE, distro: "arch" }, { ...DEFAULT_HARDWARE_PROFILE, wifi: "intel_wifi" });
      expect(res.addedPackages).toContain("linux-firmware");
    });
    it("Fedora → linux-firmware", () => {
      const res = resolveHardwareDrivers({ ...BASE_RECIPE, distro: "fedora" }, { ...DEFAULT_HARDWARE_PROFILE, wifi: "intel_wifi" });
      expect(res.addedPackages).toContain("linux-firmware");
    });
    it("Alpine → linux-firmware", () => {
      const res = resolveHardwareDrivers({ ...BASE_RECIPE, distro: "alpine" }, { ...DEFAULT_HARDWARE_PROFILE, wifi: "intel_wifi" });
      expect(res.addedPackages).toContain("linux-firmware");
    });
    it("Void → linux-firmware", () => {
      const res = resolveHardwareDrivers({ ...BASE_RECIPE, distro: "void" }, { ...DEFAULT_HARDWARE_PROFILE, wifi: "intel_wifi" });
      expect(res.addedPackages).toContain("linux-firmware");
    });
    it("Debian → firmware-iwlwifi (inchangé)", () => {
      const res = resolveHardwareDrivers(BASE_RECIPE, { ...DEFAULT_HARDWARE_PROFILE, wifi: "intel_wifi" });
      expect(res.addedPackages).toContain("firmware-iwlwifi");
    });
    it("openSUSE → kernel-firmware-iwlwifi (inchangé)", () => {
      const res = resolveHardwareDrivers({ ...BASE_RECIPE, distro: "opensuse" }, { ...DEFAULT_HARDWARE_PROFILE, wifi: "intel_wifi" });
      expect(res.addedPackages).toContain("kernel-firmware-iwlwifi");
    });
  });

  describe("Broadcom BCM43xx — lacune comblée : Fedora/openSUSE/Alpine/Void obtenaient RIEN", () => {
    it("Fedora → broadcom-wl (RPMFusion-nonfree)", () => {
      const res = resolveHardwareDrivers({ ...BASE_RECIPE, distro: "fedora" }, { ...DEFAULT_HARDWARE_PROFILE, wifi: "broadcom_wifi" });
      expect(res.addedPackages).toContain("broadcom-wl");
    });
    it("openSUSE → broadcom-wl-kmp-default (Packman)", () => {
      const res = resolveHardwareDrivers({ ...BASE_RECIPE, distro: "opensuse" }, { ...DEFAULT_HARDWARE_PROFILE, wifi: "broadcom_wifi" });
      expect(res.addedPackages).toContain("broadcom-wl-kmp-default");
    });
    it("Alpine → linux-firmware (brcm/*)", () => {
      const res = resolveHardwareDrivers({ ...BASE_RECIPE, distro: "alpine" }, { ...DEFAULT_HARDWARE_PROFILE, wifi: "broadcom_wifi" });
      expect(res.addedPackages).toContain("linux-firmware");
    });
    it("Void → linux-firmware (brcm/*)", () => {
      const res = resolveHardwareDrivers({ ...BASE_RECIPE, distro: "void" }, { ...DEFAULT_HARDWARE_PROFILE, wifi: "broadcom_wifi" });
      expect(res.addedPackages).toContain("linux-firmware");
    });
  });
});
