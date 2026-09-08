import { OSRecipe } from '../types/os';

export type CpuVendor = 'intel' | 'amd' | 'arm' | 'generic';
export type GpuVendor = 'nvidia_proprietary' | 'nvidia_nouveau' | 'amd_radeon' | 'intel_arc' | 'vm_virtual';
export type WifiVendor = 'intel_wifi' | 'realtek_wifi' | 'broadcom_wifi' | 'generic_all';
export type FormFactor = 'desktop' | 'laptop' | 'handheld_deck' | 'server_headless';

export interface TargetHardwareProfile {
  cpu: CpuVendor;
  gpu: GpuVendor;
  wifi: WifiVendor;
  formFactor: FormFactor;
  installTpm2: boolean;
  enableVulkanGaming: boolean;
}

export interface DriverResolutionResult {
  updatedRecipe: OSRecipe;
  addedPackages: string[];
  kernelCmdlineAdditions: string[];
  explanationsFr: string[];
  explanationsEn: string[];
}

export const DEFAULT_HARDWARE_PROFILE: TargetHardwareProfile = {
  cpu: 'generic',
  gpu: 'vm_virtual',
  wifi: 'generic_all',
  formFactor: 'desktop',
  installTpm2: false,
  enableVulkanGaming: false,
};

/**
 * Résout et injecte les paquets de pilotes et firmwares réels selon le matériel cible
 */
export function resolveHardwareDrivers(
  recipe: OSRecipe,
  profile: TargetHardwareProfile
): DriverResolutionResult {
  const isDebianLike = ['debian', 'ubuntu', 'kali', 'raspbian', 'linuxmint', 'popos', 'parrot', 'dietpi', 'retropie', 'armbian', 'raspap'].includes(recipe.distro);
  const isArchLike = ['arch', 'cachyos', 'endeavouros'].includes(recipe.distro);
  const isFedoraLike = ['fedora', 'rocky', 'almalinux'].includes(recipe.distro);


  const newCustomPackages = new Set<string>(recipe.customPackages || []);
  const addedPkgs: string[] = [];
  const cmdlineAdditions: string[] = [];
  const explanationsFr: string[] = [];
  const explanationsEn: string[] = [];

  const addPkg = (pkg: string, noteFr: string, noteEn: string) => {
    if (!newCustomPackages.has(pkg)) {
      newCustomPackages.add(pkg);
      addedPkgs.push(pkg);
      explanationsFr.push(`[Paquet] ${pkg} : ${noteFr}`);
      explanationsEn.push(`[Package] ${pkg}: ${noteEn}`);
    }
  };

  // 1. Microcode CPU
  if (profile.cpu === 'intel') {
    if (isDebianLike) addPkg('intel-microcode', 'Microcode processeur Intel avec correctifs de sécurité hardware', 'Intel CPU microcode with hardware security fixes');
    else if (isArchLike) addPkg('intel-ucode', 'Microcode processeur Intel pour initramfs Arch', 'Intel CPU microcode for Arch initramfs');
    else if (isFedoraLike) addPkg('microcode_ctl', 'Gestionnaire de microcode CPU Intel/AMD RedHat', 'RedHat Intel/AMD CPU microcode manager');
  } else if (profile.cpu === 'amd') {
    if (isDebianLike) addPkg('amd64-microcode', 'Microcode processeur AMD Ryzen/EPYC avec correctifs hardware', 'AMD Ryzen/EPYC CPU microcode with hardware fixes');
    else if (isArchLike) addPkg('amd-ucode', 'Microcode processeur AMD pour initramfs Arch', 'AMD CPU microcode for Arch initramfs');
    else if (isFedoraLike) addPkg('microcode_ctl', 'Gestionnaire de microcode CPU Intel/AMD RedHat', 'RedHat Intel/AMD CPU microcode manager');
  }

  // 2. Pilotes Graphiques GPU
  if (profile.gpu === 'nvidia_proprietary') {
    cmdlineAdditions.push('nvidia-drm.modeset=1');
    if (isDebianLike) {
      addPkg('nvidia-driver', 'Pilote propriétaire officiel Nvidia (CUDA, NVENC & Vulkan)', 'Official proprietary Nvidia driver');
      addPkg('nvidia-kernel-dkms', 'Module noyau Nvidia DKMS pour compatibilité tous noyaux', 'Nvidia DKMS kernel module');
    } else if (isArchLike) {
      addPkg('nvidia-dkms', 'Pilote Nvidia DKMS multi-noyaux pour Arch', 'Nvidia multi-kernel DKMS driver');
      addPkg('nvidia-utils', 'Utilitaires et bibliothèques utilisateurs Nvidia', 'Nvidia userland utilities and libs');
    } else if (isFedoraLike) {
      addPkg('akmod-nvidia', 'Pilote propriétaire Nvidia Akmod pour Fedora/RHEL', 'Nvidia Akmod driver for Fedora/RHEL');
    }
  } else if (profile.gpu === 'amd_radeon') {
    if (isDebianLike) {
      addPkg('firmware-amd-graphics', 'Firmwares GPU AMD Radeon RX / Vega / RDNA', 'AMD Radeon RX/Vega/RDNA GPU firmwares');
      addPkg('mesa-vulkan-drivers', 'Pilote Vulkan open-source RADV AMD', 'Open-source RADV AMD Vulkan driver');
      addPkg('libgl1-mesa-dri', 'Accélération graphique DRI Mesa pour Radeon', 'Mesa DRI acceleration for Radeon');
    } else if (isArchLike) {
      addPkg('vulkan-radeon', 'Pilote Vulkan RADV officiel AMD pour Arch', 'AMD RADV Vulkan driver for Arch');
      addPkg('mesa', 'Pile graphique open-source 3D Mesa', 'Mesa 3D open-source graphics stack');
      addPkg('xf86-video-amdgpu', 'Pilote Xorg AMDGPU optimisé', 'Tuned AMDGPU Xorg driver');
    } else if (isFedoraLike) {
      addPkg('mesa-vulkan-drivers', 'Pilotes Vulkan Mesa pour Fedora', 'Mesa Vulkan drivers for Fedora');
      addPkg('mesa-dri-drivers', 'Pilotes Mesa DRI Radeon pour Fedora', 'Mesa DRI Radeon drivers for Fedora');
    }
  } else if (profile.gpu === 'intel_arc') {
    if (isDebianLike) {
      addPkg('intel-media-va-driver-non-free', 'Accélération matérielle QuickSync / VA-API pour Intel Arc', 'QuickSync / VA-API hardware acceleration for Intel Arc');
      addPkg('mesa-vulkan-drivers', 'Pilote Vulkan ANV pour Intel Iris / Arc', 'ANV Vulkan driver for Intel Iris/Arc');
    } else if (isArchLike) {
      addPkg('intel-media-driver', 'Pilote VA-API officiel Intel pour Arch', 'Official Intel VA-API driver for Arch');
      addPkg('vulkan-intel', 'Pilote Vulkan ANV officiel Intel pour Arch', 'Intel ANV Vulkan driver for Arch');
    } else if (isFedoraLike) {
      addPkg('intel-media-driver', 'Accélération VA-API Intel pour Fedora', 'Intel VA-API acceleration for Fedora');
      addPkg('mesa-vulkan-drivers', 'Pilote Vulkan Intel pour Fedora', 'Intel Vulkan driver for Fedora');
    }
  }

  // 3. Puces Wi-Fi & Sans-fil
  if (profile.wifi === 'broadcom_wifi') {
    if (isDebianLike) addPkg('broadcom-sta-dkms', 'Pilote Wi-Fi Broadcom BCM43xx propriétaire', 'Proprietary Broadcom BCM43xx Wi-Fi driver');
    else if (isArchLike) addPkg('broadcom-wl-dkms', 'Pilote Broadcom WL DKMS pour Arch', 'Broadcom WL DKMS driver for Arch');
  } else if (profile.wifi === 'realtek_wifi') {
    if (isDebianLike) addPkg('firmware-realtek', 'Firmwares cartes Wi-Fi et Bluetooth Realtek RTL8xxx', 'Realtek RTL8xxx Wi-Fi and Bluetooth firmwares');
    else if (isArchLike || isFedoraLike) addPkg('linux-firmware', 'Ensemble des firmwares matériels sans-fil', 'Full wireless hardware firmware bundle');
  } else if (profile.wifi === 'intel_wifi') {
    if (isDebianLike) addPkg('firmware-iwlwifi', 'Firmwares puces Wi-Fi Intel Wireless / Wi-Fi 6E/7', 'Intel Wireless / Wi-Fi 6E/7 firmwares');
  } else if (profile.wifi === 'generic_all') {
    if (isDebianLike) {
      addPkg('firmware-linux-free', 'Firmwares matériels libres de base', 'Base free hardware firmwares');
    }
  }

  // 4. Form Factor & Gestion d'Énergie
  if (profile.formFactor === 'laptop') {
    if (isDebianLike || isArchLike || isFedoraLike) {
      addPkg('tlp', 'Optimiseur de batterie et gestion dynamique d’énergie PC portable', 'Battery optimizer and power saver for laptops');
      addPkg('powertop', 'Diagnostic de consommation électrique matériel', 'Hardware power consumption diagnostics');
    }
  } else if (profile.formFactor === 'handheld_deck') {
    if (isArchLike) {
      addPkg('gamescope', 'Micro-compositeur Wayland optimisé Steam Deck / Consoles', 'Steam Deck tuned Wayland micro-compositor');
      addPkg('power-profiles-daemon', 'Gestionnaire de profils de puissance TDP', 'TDP power profile manager');
    }
  }

  // 5. TPM 2.0 & Chiffrement Hardware
  if (profile.installTpm2) {
    if (isDebianLike) {
      addPkg('tpm2-tools', 'Outils de diagnostic et scellement de clés TPM 2.0', 'TPM 2.0 diagnostic and key sealing tools');
      addPkg('libtss2-esys-3.0.2-0', 'Bibliothèque cryptographique TPM 2.0 TSS2', 'TPM 2.0 TSS2 cryptographic library');
    } else if (isArchLike || isFedoraLike) {
      addPkg('tpm2-tools', 'Outils de gestion de puce TPM 2.0', 'TPM 2.0 chip management tools');
    }
  }

  // Fusionner la ligne de commande kernel si nécessaire
  let updatedKernelCmdline = recipe.kernelCmdline || '';
  for (const cmd of cmdlineAdditions) {
    if (!updatedKernelCmdline.includes(cmd)) {
      updatedKernelCmdline = updatedKernelCmdline ? `${updatedKernelCmdline} ${cmd}` : cmd;
    }
  }

  const updatedRecipe: OSRecipe = {
    ...recipe,
    customPackages: Array.from(newCustomPackages),
    kernelCmdline: updatedKernelCmdline || undefined,
  };

  return {
    updatedRecipe,
    addedPackages: addedPkgs,
    kernelCmdlineAdditions: cmdlineAdditions,
    explanationsFr,
    explanationsEn,
  };
}
