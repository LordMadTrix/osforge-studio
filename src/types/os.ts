export type DistroId =
  | 'debian'
  | 'ubuntu'
  | 'arch'
  | 'alpine'
  | 'fedora'
  | 'opensuse'
  | 'rocky'
  | 'raspbian'
  | 'kali'
  | 'cachyos'
  | 'nixos'
  | 'void'
  | 'linuxmint';

export type ArchType = 'x86_64' | 'aarch64' | 'riscv64' | 'i686';

export type OutputFormat = 
  | 'iso_hybrid' 
  | 'wsl2_tar'
  | 'qcow2' 
  | 'vmdk' 
  | 'vdi'
  | 'proxmox_qcow2'
  | 'ami_raw'
  | 'raw_img' 
  | 'docker_rootfs' 
  | 'rpi_sd';

export type DesktopEnvironmentId = 
  | 'none'
  | 'gnome'
  | 'kde'
  | 'xfce'
  | 'hyprland'
  | 'cosmic'
  | 'sway'
  | 'niri'
  | 'i3wm'
  | 'openbox'
  | 'cinnamon'
  | 'lxqt'
  | 'lxde'
  | 'mate'
  | 'budgie'
  | 'deepin'
  | 'web_kiosk';

export type DisplayManagerId = 'gdm3' | 'sddm' | 'lightdm' | 'ly' | 'cosmic-greeter' | 'ddm' | 'none';

export type KernelType = 
  | 'generic'
  | 'mainline_beta'
  | 'zen'
  | 'cachyos'
  | 'liquorix'
  | 'xanmod'
  | 'hardened'
  | 'realtime'
  | 'lts'
  | 'cloud_micro';

export type PackageCategory = 
  | 'development'
  | 'security'
  | 'gaming'
  | 'multimedia'
  | 'homelab'
  | 'productivity'
  | 'system'
  | 'ai'
  | 'audio';

export interface DistroRelease {
  version: string;
  suite: string;
  label: string;
  isLatest?: boolean;
  isLts?: boolean;
  eol?: string;
}

export interface DistroInfo {
  id: DistroId;
  name: string;
  version: string;
  codename: string;
  packageManager: 'apt' | 'pacman' | 'dnf' | 'apk' | 'zypper' | 'nix' | 'xbps';
  description: string;
  badge: string;
  color: string;
  popularFor: string;
  defaultMirror: string;
  supportedArch: ArchType[];
  baseIsoSizeMB: number;
  baseRamMB: number;
  isBeta?: boolean;
  channel?: 'stable' | 'beta' | 'rolling' | 'testing';
  availableReleases?: DistroRelease[];
  screenshotMockup?: {
    wallpaper: string;
    terminalText: string;
    statsText: string;
    topBarTitle: string;
  };
}

export interface DesktopInfo {
  id: DesktopEnvironmentId;
  name: string;
  type: 'Full Desktop' | 'Tiling WM' | 'Lightweight' | 'Headless' | 'Appliance' | 'Next-Gen Rust';
  description: string;
  ramUsageMB: number;
  diskUsageMB: number;
  recommendedDM: DisplayManagerId;
  wayland: boolean;
  previewGradient: string;
  features: string[];
  isBeta?: boolean;
  versionBadge?: string;
  screenshotMockup?: {
    layoutType: 'tiling' | 'floating' | 'dock' | 'panel' | 'kiosk' | 'terminal';
    activeWindow: string;
    accentColor: string;
    widgets: string[];
  };
}

export interface SoftwarePackage {
  id: string;
  name: string;
  category: PackageCategory;
  description: string;
  sizeMB: number;
  icon: string;
  tags: string[];
  pkgNames: Partial<Record<DistroId, string>>;
  appType?: 'gui' | 'cli' | 'daemon';
  systemImpact?: 'low' | 'medium' | 'heavy';
}

export interface CustomService {
  name: string;
  description: string;
  execStart: string;
  enabled: boolean;
}

export interface SystemUser {
  username: string;
  fullName: string;
  password?: string;
  sudo: boolean;
  autologin: boolean;
  sshPublicKey?: string;
  sshImportGithubUser?: string;
  shell: '/bin/bash' | '/bin/zsh' | '/bin/fish' | '/bin/sh';
}

export interface NetworkConfig {
  enableWifi?: boolean;
  wifiSsid?: string;
  wifiPassword?: string;
  ipMode?: 'dhcp' | 'static';
  staticIp?: string;
  gateway?: string;
  dnsServers?: string[];
  enableWireguard?: boolean;
  wireguardPrivateKey?: string;
  wireguardAddress?: string;
  wireguardEndpoint?: string;
  wireguardAllowedIps?: string;
  wireguardPublicKey?: string;
  enableTailscale?: boolean;
  tailscaleAuthKey?: string;
}

export interface SecurityConfig {
  cisBenchmarkLevel: 0 | 1 | 2;
  firewall: 'none' | 'ufw' | 'firewalld' | 'nftables';
  allowedPorts?: number[];
  customAllowedPorts?: string;
  appArmorOrSELinux: boolean;
  fail2ban: boolean;
  luksEncryption: boolean;
  luksPassword?: string;
  disableRootSSH: boolean;
  autoSecurityUpdates: boolean;
  enableZram?: boolean;
}

export interface BrandingConfig {
  osName: string;
  editionName: string;
  version: string;
  accentColor: string;
  wallpaperPreset: 'minimal' | 'cyberpunk' | 'matrix' | 'gaming_rog' | 'deep_space' | string;
  customWallpaperUrl?: string;
  bootSplashTheme: 'cyberpunk' | 'minimal' | 'matrix' | 'classic' | 'openfactory' | 'bgrt' | 'spinner' | 'fade-in';
  enableGrubTheme?: boolean;
  enableFastfetchMotd?: boolean;
  enableCustomOsRelease?: boolean;
  enableCustomAudioChime?: boolean;
}

export interface OSRecipe {
  id: string;
  name: string;
  description: string;
  distro: DistroId;
  distroVersion: string;
  distroSuite?: string;
  arch: ArchType;
  outputFormat: OutputFormat;
  desktop: DesktopEnvironmentId;
  displayManager: DisplayManagerId;
  kernel: KernelType;
  kernelCmdline?: string;
  kioskUrl?: string;
  selectedPackages: string[]; // package IDs
  customPackages: string[]; // manual package names
  branding: BrandingConfig;
  user: SystemUser;
  hostname: string;
  timezone: string;
  locale: string;
  keyboardLayout: string;
  enableSSH: boolean;
  enableFlatpak?: boolean;
  enableCalamaresInstaller?: boolean;
  gpuDriver?: 'mesa_open' | 'nvidia_proprietary' | 'hybrid_prime';
  enableAsusRogTools?: boolean;
  enableCoreCtrlAmd?: boolean;
  enableZram?: boolean;
  enableLiveRescue?: boolean;
  enableCommunityRepos?: boolean;
  enableGamingOptimizations?: boolean;
  enableSteamConsoleMode?: boolean;
  enablePowerSaving?: boolean;
  enableLocalAiStack?: boolean;
  localAiModel?: string;
  enableOpenWebUi?: boolean;
  enableHomelabStack?: boolean;
  homelabServices?: ('adguard' | 'jellyfin' | 'nextcloud' | 'nginx_proxy_manager')[];
  enableKioskMode?: boolean;
  filesystem?: 'ext4' | 'btrfs';
  enableBtrfsSnapshots?: boolean;
  network?: NetworkConfig;
  security: SecurityConfig;
  customServices: CustomService[];
  firstBootScript: string;
  dotfilesGitUrl?: string;
  cloudInitYaml?: string;
}

export interface DistroPreset {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  icon: string;
  category: 'Dev' | 'Security' | 'Gaming' | 'Server' | 'IoT/Minimal' | 'AI' | 'Media';
  recipe: Partial<OSRecipe>;
  highlights: string[];
  estimatedSize: string;
  estimatedRam: string;
}

export interface BuildStepLog {
  id: number;
  stage: string;
  message: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'warning';
  timestamp: string;
  outputSnippet?: string;
}
