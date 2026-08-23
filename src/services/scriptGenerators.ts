import { OSRecipe, DistroId } from '../types/os';
import { DISTROS } from '../data/distros';
import { SOFTWARE_PACKAGES } from '../data/packages';

// Le catalogue de paquets (packages.ts) ne référence des noms que pour debian/ubuntu/arch/alpine/fedora.
// Sans repli, une distro comme kali/raspbian/cachyos/rocky/opensuse/void perdrait silencieusement
// TOUS les logiciels sélectionnés par l'utilisateur (pkgNames[distroId] === undefined). On mappe donc
// chaque distro absente du catalogue vers la famille de paquets la plus proche ; la boucle d'installation
// du script généré tolère déjà l'échec par paquet (|| echo omis), donc une approximation imparfaite
// (opensuse/void) dégrade un paquet individuel plutôt que de faire échouer toute la compilation.
const PKG_NAME_FALLBACK: Partial<Record<DistroId, DistroId>> = {
  kali: 'debian',
  raspbian: 'debian',
  cachyos: 'arch',
  rocky: 'fedora',
  opensuse: 'fedora',
  void: 'alpine',
};

export function resolvePackageList(recipe: OSRecipe): string[] {
  const distro = DISTROS.find(d => d.id === recipe.distro);
  const distroId = distro ? distro.id : 'debian';

  const pkgs: string[] = [];

  // From selected structured packages
  recipe.selectedPackages.forEach(pkgId => {
    const pkg = SOFTWARE_PACKAGES.find(p => p.id === pkgId);
    if (!pkg) return;
    const fallbackId = PKG_NAME_FALLBACK[distroId];
    const names = pkg.pkgNames[distroId] || (fallbackId ? pkg.pkgNames[fallbackId] : undefined);
    if (names) pkgs.push(...names.split(' '));
  });

  // From custom user package list
  recipe.customPackages.forEach(cp => {
    if (cp.trim()) pkgs.push(cp.trim());
  });

  // Familles pacman/dnf : cachyos suit les paquets Arch, rocky suit les paquets Fedora.
  const isArchLike = distroId === 'arch' || distroId === 'cachyos';
  const isFedoraLike = distroId === 'fedora' || distroId === 'rocky';

  // Desktop specific packages & Full Graphical Stack
  if (recipe.desktop === 'gnome') {
    if (distroId === 'debian' || distroId === 'ubuntu') {
      pkgs.push(
        'gnome-core', 'gdm3', 'gnome-terminal', 'nautilus', 'firefox-esr',
        'xorg', 'xserver-xorg-video-all', 'mesa-vulkan-drivers', 'mesa-va-drivers',
        'pipewire', 'pipewire-audio', 'wireplumber', 'pavucontrol',
        'network-manager', 'network-manager-gnome', 'wireless-tools', 'wpasupplicant',
        'fonts-noto', 'fonts-liberation', 'fonts-font-awesome', 'bluez'
      );
    } else if (isArchLike) {
      pkgs.push('gnome', 'gdm', 'firefox', 'pipewire', 'wireplumber', 'networkmanager', 'mesa', 'vulkan-intel', 'vulkan-radeon');
    } else if (isFedoraLike) {
      pkgs.push('@gnome-desktop', 'gdm', 'firefox', 'pipewire', 'NetworkManager');
    }
  } else if (recipe.desktop === 'kde') {
    if (distroId === 'debian' || distroId === 'ubuntu') {
      pkgs.push(
        'plasma-desktop', 'plasma-workspace', 'sddm', 'konsole', 'dolphin', 'firefox-esr',
        'xorg', 'xserver-xorg-video-all', 'mesa-vulkan-drivers',
        'pipewire', 'pipewire-audio', 'wireplumber', 'network-manager', 'plasma-nm',
        'fonts-noto', 'fonts-font-awesome', 'bluez'
      );
    } else if (isArchLike) {
      pkgs.push('plasma', 'kde-applications', 'sddm', 'firefox', 'pipewire', 'networkmanager', 'mesa');
    } else if (isFedoraLike) {
      pkgs.push('@kde-desktop', 'sddm', 'firefox', 'pipewire');
    }
  } else if (recipe.desktop === 'hyprland') {
    if (isArchLike) {
      pkgs.push('hyprland', 'waybar', 'wofi', 'kitty', 'dunst', 'xdg-desktop-portal-hyprland', 'polkit-kde-agent', 'thunar', 'firefox', 'pipewire', 'wireplumber');
    } else if (distroId === 'debian' || distroId === 'ubuntu') {
      pkgs.push('hyprland', 'waybar', 'wofi', 'kitty', 'xdg-desktop-portal-hyprland', 'thunar', 'firefox-esr', 'pipewire', 'pipewire-audio', 'wireplumber', 'network-manager');
    }
  } else if (recipe.desktop === 'xfce') {
    if (distroId === 'debian' || distroId === 'ubuntu') {
      pkgs.push(
        'xfce4', 'xfce4-goodies', 'lightdm', 'lightdm-gtk-greeter', 'thunar', 'firefox-esr',
        'xorg', 'xserver-xorg-video-all', 'mesa-vulkan-drivers',
        'pulseaudio', 'pavucontrol', 'network-manager', 'network-manager-gnome',
        'fonts-noto', 'fonts-liberation'
      );
    } else if (isArchLike) {
      pkgs.push('xfce4', 'xfce4-goodies', 'lightdm', 'lightdm-gtk-greeter', 'firefox', 'pipewire');
    } else if (isFedoraLike) {
      pkgs.push('@xfce-desktop', 'lightdm', 'firefox', 'pipewire');
    }
  } else if (recipe.desktop === 'cosmic') {
    if (distroId === 'debian' || distroId === 'ubuntu') {
      pkgs.push('cosmic-session', 'cosmic-greeter', 'cosmic-term', 'cosmic-files', 'firefox-esr', 'pipewire', 'mesa-vulkan-drivers');
    } else if (isArchLike) {
      pkgs.push('cosmic-session', 'cosmic-greeter', 'firefox', 'pipewire');
    }
  } else if (recipe.desktop === 'i3wm') {
    pkgs.push('i3-wm', 'i3status', 'i3lock', 'dmenu', 'lightdm', 'alacritty', 'firefox-esr', 'xorg', 'pulseaudio', 'network-manager');
  } else if (recipe.desktop === 'web_kiosk') {
    if (distroId === 'alpine' || distroId === 'void') pkgs.push('chromium', 'cage', 'seatd', 'xwayland', 'pipewire');
    else pkgs.push('chromium-browser', 'cage', 'seatd', 'pipewire', 'network-manager');
  }

  // Base utilities & hardware drivers
  if (distroId === 'debian' || distroId === 'ubuntu') {
    pkgs.push(
      'sudo', 'curl', 'wget', 'locales', 'ca-certificates', 'systemd-sysv', 'initramfs-tools',
      'firmware-linux-free', 'pciutils', 'usbutils', 'iproute2', 'net-tools'
    );
  } else if (isArchLike) {
    pkgs.push('base', 'linux', 'linux-firmware', 'sudo', 'curl', 'wget', 'pciutils', 'usbutils');
  } else if (distroId === 'alpine') {
    pkgs.push('alpine-base', 'linux-lts', 'shadow', 'sudo', 'curl', 'ca-certificates');
  } else if (isFedoraLike) {
    pkgs.push('kernel', 'shadow-utils', 'sudo', 'curl', 'wget', 'ca-certificates', 'pciutils', 'usbutils', 'NetworkManager');
  } else if (distroId === 'opensuse') {
    pkgs.push('kernel-default', 'sudo', 'shadow', 'curl', 'wget', 'ca-certificates', 'pciutils', 'usbutils', 'NetworkManager');
  } else if (distroId === 'void') {
    pkgs.push('linux', 'linux-firmware', 'shadow', 'sudo', 'curl', 'wget', 'ca-certificates', 'dhcpcd');
  }

  return Array.from(new Set(pkgs.filter(Boolean)));
}

/**
 * Generates the local executable build.sh bash script
 */
// Distributions réellement compilables par ce script via debootstrap (famille Debian/APT).
// Les 6 autres familles (Arch/CachyOS, Fedora/Rocky, Alpine, openSUSE, Void) sont prises en
// charge par generateNonDebianBuildScript ci-dessous, chacune avec son propre outil de bootstrap
// natif (pacstrap, dnf --installroot, apk-tools-static, zypper, xbps-static). Seul NixOS reste
// hors-cadre : son modèle déclaratif (/nix/store immuable, pas de chroot "installer des paquets")
// est architecturalement incompatible avec le pipeline debootstrap/pacstrap/... utilisé ici.
const DEBOOTSTRAP_TARGETS: Record<string, { suite: string; mirror: string; sourcesList: (arch: string) => string }> = {
  debian: {
    suite: 'trixie',
    mirror: 'http://deb.debian.org/debian',
    sourcesList: () => `deb http://deb.debian.org/debian trixie main contrib non-free non-free-firmware
deb http://deb.debian.org/debian-security trixie-security main contrib non-free non-free-firmware
deb http://deb.debian.org/debian trixie-updates main contrib non-free non-free-firmware`,
  },
  ubuntu: {
    suite: 'resolute',
    mirror: 'http://archive.ubuntu.com/ubuntu',
    sourcesList: () => `deb http://archive.ubuntu.com/ubuntu resolute main restricted universe multiverse
deb http://archive.ubuntu.com/ubuntu resolute-updates main restricted universe multiverse
deb http://archive.ubuntu.com/ubuntu resolute-security main restricted universe multiverse`,
  },
  kali: {
    suite: 'kali-rolling',
    mirror: 'http://http.kali.org/kali',
    sourcesList: () => `deb http://http.kali.org/kali kali-rolling main contrib non-free non-free-firmware`,
  },
  raspbian: {
    // "rpi-bookworm" (catalogue OSForge) n'est pas un nom de suite debootstrap valide ;
    // Raspberry Pi OS est basé sur le vrai codename Debian "bookworm".
    suite: 'bookworm',
    mirror: 'http://raspbian.raspberrypi.org/raspbian',
    sourcesList: () => `deb http://raspbian.raspberrypi.org/raspbian bookworm main contrib non-free rpi`,
  },
};

// ============================================================================
// Familles non-Debian : chaque recette ci-dessous a été testée en LIVE (bootstrap réel,
// vérification du rootfs produit) sur un hôte Ubuntu avant d'être codée ici — même exigence
// que pour la famille Debian ci-dessus. CachyOS réutilise les dépôts Arch officiels vérifiés
// (pas encore les dépôts CachyOS optimisés x86-64-v3/v4 : ajouter un dépôt supplémentaire non
// vérifié ferait échouer tout le bootstrap si son URL est indisponible pour l'architecture
// ciblée). Rocky réutilise la méthode dnf --installroot vérifiée sur Fedora (même bug connu
// sysusers.sh, même correctif) avec ses propres dépôts BaseOS/AppStream — non re-testée en
// entier faute de temps, mais le mécanisme sous-jacent est générique à dnf, pas à Fedora.
type NonDebianFamily = 'arch' | 'fedora' | 'alpine' | 'suse' | 'void';

const NON_DEBIAN_DISTROS: Record<string, NonDebianFamily> = {
  arch: 'arch',
  cachyos: 'arch',
  fedora: 'fedora',
  rocky: 'fedora',
  alpine: 'alpine',
  opensuse: 'suse',
  void: 'void',
};

const NON_DEBIAN_LABELS: Record<string, string> = {
  arch: 'Arch Linux', cachyos: 'CachyOS (base Arch Linux)',
  fedora: 'Fedora Linux', rocky: 'Rocky Linux',
  alpine: 'Alpine Linux', opensuse: 'openSUSE Tumbleweed', void: 'Void Linux',
};

interface NonDebianFamilyConfig {
  hostDeps: string;
  hostCheckCmd: string; // commandes déjà présentes sur l'hôte si le bootstrap a déjà tourné une fois : évite un "apt-get update" inutile (et donc un échec si un dépôt tiers de l'hôte est cassé, sans rapport avec la compilation)
  bootstrapBlock: (distroId: string, unameArch: string, isDiskImage: boolean) => string;
  updateCmd: string;
  installOneCmd: string; // utilise la variable shell "$pkg"
  diskImageSupported: boolean; // pipeline partition+grub-install vérifié en live (boot QEMU réel jusqu'au login) — Arch/CachyOS uniquement pour l'instant
  kernelImagePath?: string; // chemin du noyau DANS le rootfs, ex. /boot/vmlinuz-linux (Arch)
  initrdImagePath?: string; // chemin de l'initramfs DANS le rootfs, ex. /boot/initramfs-linux.img (Arch)
  // Modifier mkinitcpio.conf (HOOKS) ne suffit pas : l'initramfs déjà généré par pacstrap (avec
  // "autodetect") reste sur disque tant qu'on ne le régénère pas explicitement — vérifié en live
  // (la 1ère image bootée restait bloquée sur "A start job is running for /dev/disk/by-uuid/...").
  diskImageInitrdRegenCmd?: string;
}

const NON_DEBIAN_FAMILY_CONFIG: Record<NonDebianFamily, NonDebianFamilyConfig> = {
  arch: {
    hostDeps: 'arch-install-scripts pacman-package-manager',
    hostCheckCmd: 'pacstrap',
    bootstrapBlock: (_distroId, _arch, isDiskImage) => `mkdir -p "\${WORK_DIR}/pacman.d"
cat > "\${WORK_DIR}/pacman.d/mirrorlist" << 'ARCH_MIRROR_EOF'
Server = https://geo.mirror.pkgbuild.com/$repo/os/$arch
ARCH_MIRROR_EOF
cat > "\${WORK_DIR}/pacman.conf" << PACMAN_CONF_EOF
[options]
Architecture = auto
SigLevel = Never
LocalFileSigLevel = Optional
#CheckSpace

[core]
Include = \${WORK_DIR}/pacman.d/mirrorlist

[extra]
Include = \${WORK_DIR}/pacman.d/mirrorlist
PACMAN_CONF_EOF

mkdir -p "\${ROOTFS_DIR}/var/lib/pacman"
pacstrap -c -G -M -C "\${WORK_DIR}/pacman.conf" "\${ROOTFS_DIR}" base${isDiskImage ? ' grub linux linux-firmware' : ''}

# Le rootfs cible a besoin de son PROPRE mirrorlist utilisable : pacstrap -M n'y copie pas
# celui de l'hôte, et celui livré par défaut avec "base" a tous ses miroirs commentés.
echo 'Server = https://geo.mirror.pkgbuild.com/$repo/os/$arch' > "\${ROOTFS_DIR}/etc/pacman.d/mirrorlist"
sed -i 's/^#\\?SigLevel.*/SigLevel = Never/' "\${ROOTFS_DIR}/etc/pacman.conf"
# CheckSpace est peu fiable dans un chroot (faux "not enough free disk space", vérifié en live) : désactivé.
sed -i 's/^CheckSpace/#CheckSpace/' "\${ROOTFS_DIR}/etc/pacman.conf"${isDiskImage ? `
# Le hook "autodetect" de mkinitcpio adapte l'initramfs au matériel de LA MACHINE DE BUILD (WSL2/CI),
# pas à celui de la machine cible qui bootera l'image — vérifié en live : sans ce retrait, l'image
# construite reste bloquée au démarrage sur "A start job is running for /dev/disk/by-uuid/...".
sed -i 's/^HOOKS=.*/HOOKS=(base systemd microcode modconf kms keyboard sd-vconsole block filesystems fsck)/' "\${ROOTFS_DIR}/etc/mkinitcpio.conf"` : ''}`,
    updateCmd: 'pacman -Sy --noconfirm',
    installOneCmd: 'pacman -S --noconfirm --needed "$pkg"',
    diskImageSupported: true,
    kernelImagePath: '/boot/vmlinuz-linux',
    initrdImagePath: '/boot/initramfs-linux.img',
    diskImageInitrdRegenCmd: 'mkinitcpio -P',
  },
  fedora: {
    hostDeps: 'dnf dnf-plugins-core rpm',
    hostCheckCmd: 'dnf rpmkeys',
    bootstrapBlock: (distroId) => {
      const isRocky = distroId === 'rocky';
      // Pas de backslash devant $basearch/$releasever ici : ce sont des variables du format
      // .repo dnf lui-même (substituées par dnf à la lecture du fichier), pas des variables
      // shell. Un backslash littéral casserait la substitution dnf (URL invalide).
      const repoBlock = isRocky
        ? `[baseos]
name=Rocky Linux 9 - BaseOS
baseurl=https://download.rockylinux.org/pub/rocky/9/BaseOS/$basearch/os/
enabled=1
gpgcheck=0

[appstream]
name=Rocky Linux 9 - AppStream
baseurl=https://download.rockylinux.org/pub/rocky/9/AppStream/$basearch/os/
enabled=1
gpgcheck=0`
        : `[fedora]
name=Fedora $releasever - $basearch
baseurl=https://dl.fedoraproject.org/pub/fedora/linux/releases/$releasever/Everything/$basearch/os/
enabled=1
gpgcheck=0

[updates]
name=Fedora $releasever - $basearch - Updates
baseurl=https://dl.fedoraproject.org/pub/fedora/linux/updates/$releasever/Everything/$basearch/
enabled=1
gpgcheck=0`;
      const releasever = isRocky ? '9' : '44';
      const repoIds = isRocky ? '--repo=baseos --repo=appstream' : '--repo=fedora --repo=updates';
      const releasePkg = isRocky ? 'rocky-release' : 'fedora-release';
      return `mkdir -p "\${WORK_DIR}/yum.repos.d"
cat > "\${WORK_DIR}/yum.repos.d/target.repo" << 'DNF_REPO_EOF'
${repoBlock}
DNF_REPO_EOF

DNF_BASE="dnf --installroot=\${ROOTFS_DIR} --releasever=${releasever} --setopt=reposdir=\${WORK_DIR}/yum.repos.d ${repoIds} --nogpgcheck -y"

# Bug connu rpm/dnf : le scriptlet %sysusers du paquet "setup" appelle /usr/lib/rpm/sysusers.sh,
# fourni par le paquet "rpm" lui-même — s'il n'est pas encore posé sur le disque au moment où le
# scriptlet tourne (ordre de transaction), l'installation de "setup" (qui fournit /etc/passwd)
# échoue silencieusement. Vérifié en live : une 2e passe explicite sur "setup" seule le corrige.
$DNF_BASE install basesystem ${releasePkg} bash coreutils dnf || true
$DNF_BASE install setup
$DNF_BASE install shadow-utils sudo`;
    },
    updateCmd: '',
    installOneCmd: 'dnf install -y "$pkg"',
    diskImageSupported: false,
  },
  alpine: {
    hostDeps: '',
    hostCheckCmd: 'curl tar xz',
    bootstrapBlock: () => `mkdir -p "\${WORK_DIR}/apk-static"
APK_IDX="\${WORK_DIR}/apk-idx.html"
curl -sL https://dl-cdn.alpinelinux.org/alpine/latest-stable/main/x86_64/ -o "$APK_IDX"
APKVER=$(grep -oP 'apk-tools-static-[0-9][0-9.r-]*\\.apk' "$APK_IDX" | head -1)
curl -sL "https://dl-cdn.alpinelinux.org/alpine/latest-stable/main/x86_64/$APKVER" -o "\${WORK_DIR}/apk-tools-static.apk"
tar -xzf "\${WORK_DIR}/apk-tools-static.apk" -C "\${WORK_DIR}/apk-static"

"\${WORK_DIR}/apk-static/sbin/apk.static" \\
  -X https://dl-cdn.alpinelinux.org/alpine/latest-stable/main \\
  -X https://dl-cdn.alpinelinux.org/alpine/latest-stable/community \\
  -U --allow-untrusted --root "\${ROOTFS_DIR}" --initdb \\
  add alpine-base shadow sudo

mkdir -p "\${ROOTFS_DIR}/etc/apk"
cat > "\${ROOTFS_DIR}/etc/apk/repositories" << 'APK_REPOS_EOF'
https://dl-cdn.alpinelinux.org/alpine/latest-stable/main
https://dl-cdn.alpinelinux.org/alpine/latest-stable/community
APK_REPOS_EOF`,
    updateCmd: 'apk update',
    installOneCmd: 'apk add --no-cache "$pkg"',
    diskImageSupported: false,
  },
  suse: {
    hostDeps: 'zypper',
    hostCheckCmd: 'zypper',
    bootstrapBlock: () => `mkdir -p "\${ROOTFS_DIR}"
zypper --root "\${ROOTFS_DIR}" --non-interactive addrepo --no-gpgcheck \\
  https://download.opensuse.org/tumbleweed/repo/oss/ repo-oss
zypper --root "\${ROOTFS_DIR}" --non-interactive --gpg-auto-import-keys refresh
zypper --root "\${ROOTFS_DIR}" --non-interactive install --no-recommends -y --allow-unsigned-rpm \\
  patterns-base-minimal_base rpm shadow sudo`,
    updateCmd: '',
    installOneCmd: 'zypper --non-interactive install --no-recommends "$pkg"',
    diskImageSupported: false,
  },
  void: {
    hostDeps: '',
    hostCheckCmd: 'curl tar xz',
    bootstrapBlock: () => `mkdir -p "\${WORK_DIR}/xbps-static" "\${ROOTFS_DIR}/var/db/xbps/keys"
curl -sL https://repo-default.voidlinux.org/static/xbps-static-latest.x86_64-musl.tar.xz -o "\${WORK_DIR}/xbps-static.tar.xz"
tar -xJf "\${WORK_DIR}/xbps-static.tar.xz" -C "\${WORK_DIR}/xbps-static"

yes | "\${WORK_DIR}/xbps-static/usr/bin/xbps-install.static" \\
  -S -R https://repo-default.voidlinux.org/current \\
  -r "\${ROOTFS_DIR}" -y base-voidstrap shadow sudo

mkdir -p "\${ROOTFS_DIR}/etc/xbps.d"
echo 'repository=https://repo-default.voidlinux.org/current' > "\${ROOTFS_DIR}/etc/xbps.d/00-repository-main.conf"`,
    updateCmd: 'xbps-install -Sy',
    installOneCmd: 'xbps-install -Sy "$pkg"',
    diskImageSupported: false,
  },
};

// L'ISO hybride Debian (isohybrid-mbr) et l'image disque partitionnée (familles non-Debian, voir
// generateNonDebianDiskImageBlock) sont toutes deux déjà des images disque brutes valides : qemu-img
// les convertit directement vers QCOW2/VMDK/RAW sans repartitionnement supplémentaire.
const DISK_IMAGE_FORMATS: Record<string, { qemuFormat: string; ext: string; label: string }> = {
  qcow2: { qemuFormat: 'qcow2', ext: 'qcow2', label: 'Image Cloud QCOW2' },
  vmdk: { qemuFormat: 'vmdk', ext: 'vmdk', label: 'Disque Virtuel VMDK' },
  raw_img: { qemuFormat: 'raw', ext: 'img', label: 'Image Disque Brute (RAW)' },
};

/**
 * Bootstrap réel (non-Debian) : Arch/CachyOS (pacstrap), Fedora/Rocky (dnf --installroot),
 * Alpine (apk-tools-static officiel), openSUSE (zypper --root), Void (xbps-static officiel).
 * Formats de sortie supportés : RootFS tar.gz (WSL2 / Docker) uniquement pour l'instant — l'ISO
 * live bootable et les images disque nécessitent une intégration bootloader/initramfs propre à
 * chaque famille (mkinitcpio/dracut/mkinitfs + hooks "live" dédiés, absents ici), pas encore
 * implémentée : le script le signale clairement plutôt que de produire une image qui ne démarre pas.
 */
function generateNonDebianBuildScript(recipe: OSRecipe, family: NonDebianFamily): string {
  const pkgs = resolvePackageList(recipe).join(' ');
  const config = NON_DEBIAN_FAMILY_CONFIG[family];
  const label = NON_DEBIAN_LABELS[recipe.distro] || recipe.distro;
  const unameArch = recipe.arch === 'i686' ? 'i686' : recipe.arch;
  const rootfsTarName = `${recipe.branding.osName.toLowerCase().replace(/[^a-z0-9]/g, '-')}-rootfs.tar.gz`;
  const isTarFormat = recipe.outputFormat === 'wsl2_tar' || recipe.outputFormat === 'docker_rootfs';
  const diskTarget = DISK_IMAGE_FORMATS[recipe.outputFormat];
  const wantsDiskImage = !!diskTarget;
  const diskImageAvailable = wantsDiskImage && config.diskImageSupported;

  if (!isTarFormat && !diskImageAvailable) {
    const diskImageHint = wantsDiskImage
      ? `Ce format d'image disque n'est pas encore pris en charge pour ${label} spécifiquement`
      : `Le format '${recipe.outputFormat}' n'est pas encore pris en charge pour ${label}`;
    return `#!/usr/bin/env bash
set -euo pipefail
RED='\\033[0;31m'
YELLOW='\\033[1;33m'
NC='\\033[0m'
echo -e "\${RED}[ERREUR] ${diskImageHint}.\${NC}"
echo ""
echo -e "\${YELLOW}Pour ${label}, sont actuellement implémentés :\${NC}"
echo "  - Distribution Windows WSL2 (.tar.gz)"
echo "  - RootFS Docker (.tar.gz)"
${NON_DEBIAN_FAMILY_CONFIG.arch.diskImageSupported && family !== 'arch' ? 'echo "  (les images disque QCOW2/VMDK/RAW sont disponibles pour Arch Linux / CachyOS)"' : ''}
echo ""
echo "L'ISO live bootable nécessite une intégration bootloader + initramfs \"live\" propre à chaque"
echo "famille (mkinitcpio/dracut/mkinitfs), pas encore codée dans OSForge Studio pour cette distribution."
echo "Changez le format de sortie, ou choisissez une distro de la famille Debian (Debian, Ubuntu, Kali,"
echo "Raspberry Pi OS) pour une ISO complète."
exit 1
`;
  }

  if (diskImageAvailable) {
    return generateNonDebianDiskImageScript(recipe, family, pkgs, label, unameArch, diskTarget);
  }

  return `#!/usr/bin/env bash
# ==============================================================================
# OSForge Studio — Script de Construction RootFS (${recipe.branding.osName})
# Base: ${label} | Arch: ${recipe.arch} | Format: ${recipe.outputFormat}
# Date de génération: ${new Date().toISOString()}
# ==============================================================================

set -euo pipefail

RED='\\033[0;31m'
GREEN='\\033[0;32m'
CYAN='\\033[0;36m'
YELLOW='\\033[1;33m'
NC='\\033[0m'

echo -e "\${CYAN}=======================================================\${NC}"
echo -e "\${CYAN}   🚀 OSForge Studio : Construction RootFS            \${NC}"
echo -e "\${CYAN}   Distribution cible : ${label} (${recipe.arch})\${NC}"
echo -e "\${CYAN}   Nom d'hôte         : ${recipe.hostname}\${NC}"
echo -e "\${CYAN}=======================================================\${NC}"

if [[ $EUID -ne 0 ]]; then
   echo -e "\${RED}[ERREUR] Ce script doit être exécuté avec les privilèges root (sudo).\${NC}"
   exit 1
fi

WORK_DIR="/var/tmp/osforge-build-$(date +%s)"
ROOTFS_DIR="\${WORK_DIR}/rootfs"
OUTPUT_DIR="$(pwd)/dist"
mkdir -p "\${ROOTFS_DIR}" "\${OUTPUT_DIR}"

echo -e "\${YELLOW}[1/4] 📦 Installation des dépendances de bootstrap sur l'hôte...\${NC}"
which ${config.hostCheckCmd} >/dev/null 2>&1 || {
    echo -e "\${YELLOW}Installation des outils requis sur l'hôte...\${NC}"
    apt-get update -y && apt-get install -y curl tar xz-utils ${config.hostDeps}
}

echo -e "\${YELLOW}[2/4] 🏗️ Initialisation du RootFS ${label}...\${NC}"
${config.bootstrapBlock(recipe.distro, unameArch, false)}

echo -e "\${YELLOW}[3/4] ⚙️ Configuration du système et installation des paquets...\${NC}"

# Le rootfs fraîchement créé n'a pas de résolution DNS : sans ceci, le gestionnaire de paquets
# à l'intérieur du chroot ne peut contacter aucun dépôt ("Could not resolve host").
cp /etc/resolv.conf "\${ROOTFS_DIR}/etc/resolv.conf" 2>/dev/null || true

mount --bind /dev "\${ROOTFS_DIR}/dev"
mount --bind /dev/pts "\${ROOTFS_DIR}/dev/pts" 2>/dev/null || true
mount --bind /proc "\${ROOTFS_DIR}/proc"
mount --bind /sys "\${ROOTFS_DIR}/sys"

cat << 'CHROOT_EOF' | chroot "\${ROOTFS_DIR}" /bin/sh
set -e
${config.updateCmd}

for pkg in ${pkgs}; do
    ${config.installOneCmd} || echo "Info: $pkg omis ou non disponible dans le dépôt."
done

echo "${recipe.hostname}" > /etc/hostname
cat << 'HOSTS' > /etc/hosts
127.0.0.1   localhost ${recipe.hostname}
::1         localhost ip6-localhost ip6-loopback
HOSTS

ln -sf /usr/share/zoneinfo/${recipe.timezone} /etc/localtime 2>/dev/null || true

if ! id "${recipe.user.username}" >/dev/null 2>&1; then
    useradd -m -s ${recipe.user.shell} -c "${recipe.user.fullName}" ${recipe.user.username}
    echo "${recipe.user.username}:${recipe.user.password || 'forge'}" | chpasswd
fi
echo "root:toor" | chpasswd

${recipe.user.sudo ? `mkdir -p /etc/sudoers.d
echo "${recipe.user.username} ALL=(ALL:ALL) NOPASSWD:ALL" > /etc/sudoers.d/90-osforge-user
chmod 440 /etc/sudoers.d/90-osforge-user` : '# Compte utilisateur sans droits sudo (non demandé dans la recette)'}

${recipe.enableSSH && recipe.user.sshPublicKey ? `mkdir -p /home/${recipe.user.username}/.ssh
echo "${recipe.user.sshPublicKey}" > /home/${recipe.user.username}/.ssh/authorized_keys
chmod 700 /home/${recipe.user.username}/.ssh
chmod 600 /home/${recipe.user.username}/.ssh/authorized_keys
chown -R ${recipe.user.username}:${recipe.user.username} /home/${recipe.user.username}/.ssh` : ''}

cat << 'FIRSTBOOT_EOF' > /root/firstboot.sh
#!/bin/sh
${recipe.firstBootScript || '# Aucun script first-boot spécifique'}
FIRSTBOOT_EOF
chmod +x /root/firstboot.sh
CHROOT_EOF

echo -e "\${YELLOW}[4/4] 🧹 Démontage et archivage du RootFS...\${NC}"
umount -lf "\${ROOTFS_DIR}/sys" || true
umount -lf "\${ROOTFS_DIR}/proc" || true
umount -lf "\${ROOTFS_DIR}/dev/pts" || true
umount -lf "\${ROOTFS_DIR}/dev" || true

tar -czf "\${OUTPUT_DIR}/${rootfsTarName}" -C "\${ROOTFS_DIR}" .

echo -e "\${GREEN}=======================================================\${NC}"
echo -e "\${GREEN}   ✅ RootFS généré avec succès : \${OUTPUT_DIR}/${rootfsTarName}\${NC}"
echo -e "\${GREEN}   Taille du fichier : $(du -h "\${OUTPUT_DIR}/${rootfsTarName}" 2>/dev/null | cut -f1 || echo "OK")\${NC}"
echo -e "\${GREEN}=======================================================\${NC}"
`;
}

/**
 * Image disque partitionnée + GRUB (BIOS/i386-pc) pour les familles non-Debian qui le supportent
 * (Arch/CachyOS pour l'instant). Pipeline vérifié en LIVE cette session : bootstrap réel, partition
 * MBR, formatage ext4, grub-install, génération grub.cfg/fstab, puis boot QEMU réel jusqu'au prompt
 * de connexion ("disktest login:"). Deux points critiques découverts en live et corrigés ici :
 *  - pacman "CheckSpace" produit de faux "not enough free disk space" en chroot : désactivé.
 *  - le hook mkinitcpio "autodetect" adapte l'initramfs au matériel de LA MACHINE DE BUILD, pas à la
 *    cible : sans son retrait, l'image reste bloquée au démarrage sur la recherche du disque racine.
 */
function generateNonDebianDiskImageScript(
  recipe: OSRecipe,
  family: NonDebianFamily,
  pkgs: string,
  label: string,
  unameArch: string,
  diskTarget: { qemuFormat: string; ext: string; label: string }
): string {
  const config = NON_DEBIAN_FAMILY_CONFIG[family];
  const baseName = recipe.branding.osName.toLowerCase().replace(/[^a-z0-9]/g, '-');
  const rawImageName = `${baseName}-${recipe.branding.version}-${recipe.arch}.raw.img`;
  const diskImageName = `${baseName}-${recipe.branding.version}-${recipe.arch}.${diskTarget.ext}`;
  const needsConversion = diskTarget.ext !== 'raw.img' && diskTarget.qemuFormat !== 'raw';
  const kernelPath = config.kernelImagePath!;
  const initrdPath = config.initrdImagePath!;

  const diskConversionStep = needsConversion ? `
echo -e "\${YELLOW}[6/6] 💽 Conversion vers ${diskTarget.label}...\${NC}"
qemu-img convert -O ${diskTarget.qemuFormat}${diskTarget.qemuFormat === 'qcow2' ? ' -o compat=1.1' : ''} "\${OUTPUT_DIR}/${rawImageName}" "\${OUTPUT_DIR}/${diskImageName}"
rm -f "\${OUTPUT_DIR}/${rawImageName}"
` : `mv "\${OUTPUT_DIR}/${rawImageName}" "\${OUTPUT_DIR}/${diskImageName}"`;

  return `#!/usr/bin/env bash
# ==============================================================================
# OSForge Studio — Script de Construction Image Disque (${recipe.branding.osName})
# Base: ${label} | Arch: ${recipe.arch} | Format: ${recipe.outputFormat}
# Date de génération: ${new Date().toISOString()}
# ==============================================================================

set -euo pipefail

RED='\\033[0;31m'
GREEN='\\033[0;32m'
CYAN='\\033[0;36m'
YELLOW='\\033[1;33m'
NC='\\033[0m'

echo -e "\${CYAN}=======================================================\${NC}"
echo -e "\${CYAN}   🚀 OSForge Studio : Construction Image Disque      \${NC}"
echo -e "\${CYAN}   Distribution cible : ${label} (${recipe.arch})\${NC}"
echo -e "\${CYAN}   Nom d'hôte         : ${recipe.hostname}\${NC}"
echo -e "\${CYAN}=======================================================\${NC}"

if [[ $EUID -ne 0 ]]; then
   echo -e "\${RED}[ERREUR] Ce script doit être exécuté avec les privilèges root (sudo).\${NC}"
   exit 1
fi

WORK_DIR="/var/tmp/osforge-build-$(date +%s)"
ROOTFS_DIR="\${WORK_DIR}/rootfs"
MNT_DIR="\${WORK_DIR}/mnt"
OUTPUT_DIR="$(pwd)/dist"
mkdir -p "\${ROOTFS_DIR}" "\${MNT_DIR}" "\${OUTPUT_DIR}"

echo -e "\${YELLOW}[1/6] 📦 Installation des dépendances de bootstrap sur l'hôte...\${NC}"
which ${config.hostCheckCmd} parted qemu-img >/dev/null 2>&1 || {
    echo -e "\${YELLOW}Installation des outils requis sur l'hôte...\${NC}"
    apt-get update -y && apt-get install -y curl tar xz-utils parted qemu-utils ${config.hostDeps}
}

echo -e "\${YELLOW}[2/6] 🏗️ Initialisation du RootFS ${label} (avec noyau + GRUB)...\${NC}"
${config.bootstrapBlock(recipe.distro, unameArch, true)}

echo -e "\${YELLOW}[3/6] ⚙️ Configuration du système et installation des paquets...\${NC}"

cp /etc/resolv.conf "\${ROOTFS_DIR}/etc/resolv.conf" 2>/dev/null || true

mount --bind /dev "\${ROOTFS_DIR}/dev"
mount --bind /dev/pts "\${ROOTFS_DIR}/dev/pts" 2>/dev/null || true
mount --bind /proc "\${ROOTFS_DIR}/proc"
mount --bind /sys "\${ROOTFS_DIR}/sys"
${config.diskImageInitrdRegenCmd ? `
# Modifier la config de l'initramfs (HOOKS ci-dessus) ne suffit pas : le fichier déjà généré par
# le bootstrap (avec le hook "autodetect" adapté à la machine de build) reste sur disque tant
# qu'on ne le régénère pas explicitement — vérifié en live, sans quoi l'image ne démarre pas.
chroot "\${ROOTFS_DIR}" ${config.diskImageInitrdRegenCmd}
` : ''}
cat << 'CHROOT_EOF' | chroot "\${ROOTFS_DIR}" /bin/sh
set -e
${config.updateCmd}

for pkg in ${pkgs}; do
    ${config.installOneCmd} || echo "Info: $pkg omis ou non disponible dans le dépôt."
done

echo "${recipe.hostname}" > /etc/hostname
cat << 'HOSTS' > /etc/hosts
127.0.0.1   localhost ${recipe.hostname}
::1         localhost ip6-localhost ip6-loopback
HOSTS

ln -sf /usr/share/zoneinfo/${recipe.timezone} /etc/localtime 2>/dev/null || true

if ! id "${recipe.user.username}" >/dev/null 2>&1; then
    useradd -m -s ${recipe.user.shell} -c "${recipe.user.fullName}" ${recipe.user.username}
    echo "${recipe.user.username}:${recipe.user.password || 'forge'}" | chpasswd
fi
echo "root:toor" | chpasswd

${recipe.user.sudo ? `mkdir -p /etc/sudoers.d
echo "${recipe.user.username} ALL=(ALL:ALL) NOPASSWD:ALL" > /etc/sudoers.d/90-osforge-user
chmod 440 /etc/sudoers.d/90-osforge-user` : '# Compte utilisateur sans droits sudo (non demandé dans la recette)'}

${recipe.enableSSH && recipe.user.sshPublicKey ? `mkdir -p /home/${recipe.user.username}/.ssh
echo "${recipe.user.sshPublicKey}" > /home/${recipe.user.username}/.ssh/authorized_keys
chmod 700 /home/${recipe.user.username}/.ssh
chmod 600 /home/${recipe.user.username}/.ssh/authorized_keys
chown -R ${recipe.user.username}:${recipe.user.username} /home/${recipe.user.username}/.ssh` : ''}

cat << 'FIRSTBOOT_EOF' > /root/firstboot.sh
#!/bin/sh
${recipe.firstBootScript || '# Aucun script first-boot spécifique'}
FIRSTBOOT_EOF
chmod +x /root/firstboot.sh
CHROOT_EOF

umount -lf "\${ROOTFS_DIR}/sys" || true
umount -lf "\${ROOTFS_DIR}/proc" || true
umount -lf "\${ROOTFS_DIR}/dev/pts" || true
umount -lf "\${ROOTFS_DIR}/dev" || true

echo -e "\${YELLOW}[4/6] 💽 Partitionnement et formatage de l'image disque...\${NC}"
RAW_IMG="\${OUTPUT_DIR}/${rawImageName}"
qemu-img create -f raw "\${RAW_IMG}" 8G
parted -s "\${RAW_IMG}" mklabel msdos
parted -s "\${RAW_IMG}" mkpart primary ext4 1MiB 100%
parted -s "\${RAW_IMG}" set 1 boot on

LOOPDEV=$(losetup -f)
losetup -P "\${LOOPDEV}" "\${RAW_IMG}"
mkfs.ext4 -F "\${LOOPDEV}p1"
mount "\${LOOPDEV}p1" "\${MNT_DIR}"

echo -e "\${YELLOW}[5/6] 🖲️ Copie du système et installation de GRUB (BIOS)...\${NC}"
cp -a "\${ROOTFS_DIR}"/. "\${MNT_DIR}"/

cp /etc/resolv.conf "\${MNT_DIR}/etc/resolv.conf" 2>/dev/null || true
mount --bind /dev "\${MNT_DIR}/dev"
mount --bind /dev/pts "\${MNT_DIR}/dev/pts" 2>/dev/null || true
mount --bind /proc "\${MNT_DIR}/proc"
mount --bind /sys "\${MNT_DIR}/sys"

ROOT_UUID=$(blkid -s UUID -o value "\${LOOPDEV}p1")

chroot "\${MNT_DIR}" grub-install --target=i386-pc --boot-directory=/boot "\${LOOPDEV}"

cat > "\${MNT_DIR}/etc/fstab" << FSTAB_EOF
UUID=\${ROOT_UUID} / ext4 defaults 0 1
FSTAB_EOF

mkdir -p "\${MNT_DIR}/boot/grub"
cat > "\${MNT_DIR}/boot/grub/grub.cfg" << GRUBCFG_EOF
set timeout=3
set default=0
menuentry "${recipe.branding.osName}" {
    search --no-floppy --fs-uuid --set=root \${ROOT_UUID}
    linux ${kernelPath} root=UUID=\${ROOT_UUID} rw console=tty0 console=ttyS0,115200
    initrd ${initrdPath}
}
GRUBCFG_EOF

umount -lf "\${MNT_DIR}/sys" || true
umount -lf "\${MNT_DIR}/proc" || true
umount -lf "\${MNT_DIR}/dev/pts" || true
umount -lf "\${MNT_DIR}/dev" || true
umount -lf "\${MNT_DIR}" || true
losetup -d "\${LOOPDEV}" || true
${diskConversionStep}

echo -e "\${GREEN}=======================================================\${NC}"
echo -e "\${GREEN}   ✅ ${diskTarget.label} générée avec succès : \${OUTPUT_DIR}/${diskImageName}\${NC}"
echo -e "\${GREEN}   Taille du fichier : $(du -h "\${OUTPUT_DIR}/${diskImageName}" 2>/dev/null | cut -f1 || echo "OK")\${NC}"
echo -e "\${GREEN}=======================================================\${NC}"
`;
}

export function generateBuildScript(recipe: OSRecipe): string {
  const pkgs = resolvePackageList(recipe).join(' ');
  const isoName = `${recipe.branding.osName.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${recipe.branding.version}-${recipe.arch}.iso`;
  const debArch = recipe.arch === 'x86_64' ? 'amd64' : recipe.arch === 'aarch64' ? 'arm64' : recipe.arch;
  const target = DEBOOTSTRAP_TARGETS[recipe.distro];

  if (!target) {
    const nonDebianFamily = NON_DEBIAN_DISTROS[recipe.distro];
    if (nonDebianFamily) {
      return generateNonDebianBuildScript(recipe, nonDebianFamily);
    }

    return `#!/usr/bin/env bash
set -euo pipefail
RED='\\033[0;31m'
NC='\\033[0m'
echo -e "\${RED}[ERREUR] La distribution '${recipe.distro}' n'est pas prise en charge par ce script de compilation.\${NC}"
echo ""
echo "NixOS est architecturalement incompatible avec ce pipeline : son modèle est déclaratif"
echo "(un fichier configuration.nix décrit tout le système, /nix/store est immuable), alors que"
echo "ce script fonctionne par bootstrap + chroot + installation impérative de paquets — une"
echo "approche qui ne s'applique pas à Nix. Générer un système NixOS nécessiterait un pipeline"
echo "entièrement différent (nixos-generators / nix build), non implémenté dans OSForge Studio."
echo ""
echo "Toutes les autres distributions du catalogue sont prises en charge : Debian, Ubuntu, Kali,"
echo "Raspberry Pi OS (ISO complète) ainsi qu'Arch, CachyOS, Fedora, Rocky, Alpine, openSUSE, Void"
echo "(RootFS WSL2/Docker — voir le format de sortie sélectionné)."
exit 1
`;
  }

  const kernelPkg = recipe.distro === 'ubuntu' ? 'linux-image-generic' : `linux-image-${debArch}`;

  // Formats de sortie réellement implémentés : ISO live (par défaut) et RootFS tar.gz
  // (WSL2 / Docker), qui réutilisent tous les deux le même RootFS déjà construit.
  // Les formats disque (QCOW2, VMDK, RAW, carte SD Raspberry Pi) nécessitent un vrai
  // partitionnement + installation du bootloader sur disque, pas encore implémenté :
  // le script prévient clairement et retombe sur l'ISO plutôt que de mentir.
  const isTarFormat = recipe.outputFormat === 'wsl2_tar' || recipe.outputFormat === 'docker_rootfs';
  const rootfsTarName = `${recipe.branding.osName.toLowerCase().replace(/[^a-z0-9]/g, '-')}-rootfs.tar.gz`;

  // L'ISO hybride (isohybrid-mbr) est déjà une image disque brute valide : qemu-img peut
  // donc la convertir directement vers QCOW2/VMDK/RAW sans repartitionnement supplémentaire.
  const diskTarget = DISK_IMAGE_FORMATS[recipe.outputFormat];
  const diskImageName = diskTarget ? `${recipe.branding.osName.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${recipe.branding.version}-${recipe.arch}.${diskTarget.ext}` : '';

  const UNIMPLEMENTED_FORMATS: Record<string, string> = {
    rpi_sd: 'Carte SD Raspberry Pi',
  };
  const formatWarning = UNIMPLEMENTED_FORMATS[recipe.outputFormat]
    ? `echo -e "\${YELLOW}[INFO] Le format '${UNIMPLEMENTED_FORMATS[recipe.outputFormat]}' n'est pas encore implémenté : génération d'une image ISO à la place.\${NC}"\n\n`
    : '';

  const diskConversionStep = diskTarget ? `
which qemu-img >/dev/null 2>&1 || {
    echo -e "\${YELLOW}Installation de qemu-utils (conversion ${diskTarget.label})...\${NC}"
    apt-get update -y && apt-get install -y qemu-utils
}

echo -e "\${YELLOW}[8/8] 💽 Conversion vers ${diskTarget.label}...\${NC}"
qemu-img convert -O ${diskTarget.qemuFormat}${diskTarget.qemuFormat === 'qcow2' ? ' -o compat=1.1' : ''} "\${OUTPUT_DIR}/${isoName}" "\${OUTPUT_DIR}/${diskImageName}"

echo -e "\${GREEN}=======================================================\${NC}"
echo -e "\${GREEN}   ✅ ${diskTarget.label} générée avec succès : \${OUTPUT_DIR}/${diskImageName}\${NC}"
echo -e "\${GREEN}   Taille du fichier : $(du -h "\${OUTPUT_DIR}/${diskImageName}" 2>/dev/null | cut -f1 || echo "OK")\${NC}"
echo -e "\${GREEN}=======================================================\${NC}"
` : '';

  const packagingSteps = isTarFormat ? `echo -e "\${YELLOW}[5/5] 📦 Archivage du système de fichiers (RootFS tar.gz)...\${NC}"
tar -czf "\${OUTPUT_DIR}/${rootfsTarName}" -C "\${ROOTFS_DIR}" .

echo -e "\${GREEN}=======================================================\${NC}"
echo -e "\${GREEN}   ✅ RootFS généré avec succès : \${OUTPUT_DIR}/${rootfsTarName}\${NC}"
echo -e "\${GREEN}   Taille du fichier : $(du -h "\${OUTPUT_DIR}/${rootfsTarName}" 2>/dev/null | cut -f1 || echo "OK")\${NC}"
echo -e "\${GREEN}   Empreinte SHA256  : $(sha256sum "\${OUTPUT_DIR}/${rootfsTarName}" 2>/dev/null | cut -d' ' -f1 || echo "Calculé au build")\${NC}"
echo -e "\${GREEN}=======================================================\${NC}"
` : `${formatWarning}echo -e "\${YELLOW}[5/7] 🗜️ Compression SquashFS du système d'exploitation...\${NC}"
mkdir -p "\${ISO_DIR}/live"
mksquashfs "\${ROOTFS_DIR}" "\${ISO_DIR}/live/filesystem.squashfs" -comp xz -e boot

echo -e "\${YELLOW}[6/7] 🖲️ Préparation du chargeur de démarrage GRUB (BIOS & UEFI)...\${NC}"
mkdir -p "\${ISO_DIR}/boot/grub/i386-pc" "\${ISO_DIR}/EFI/BOOT"
cp "\${ROOTFS_DIR}/boot"/vmlinuz* "\${ISO_DIR}/live/vmlinuz" || cp "\${ROOTFS_DIR}/boot"/vmlinux* "\${ISO_DIR}/live/vmlinuz" || true
cp "\${ROOTFS_DIR}/boot"/initrd.img* "\${ISO_DIR}/live/initrd" || cp "\${ROOTFS_DIR}/boot"/initramfs* "\${ISO_DIR}/live/initrd" || true

cat << 'GRUB_CONFIG_EOF' > "\${ISO_DIR}/boot/grub/grub.cfg"
set default=0
set timeout=3

insmod all_video
insmod font
insmod part_msdos
insmod part_gpt
insmod iso9660
insmod search

search --no-floppy --set=root --file /live/vmlinuz

menuentry "${recipe.branding.osName} (${recipe.branding.editionName}) [Live Desktop]" {
    linux /live/vmlinuz boot=live components quiet splash hostname=${recipe.hostname}
    initrd /live/initrd
}

menuentry "${recipe.branding.osName} (Mode Secours / Failsafe)" {
    linux /live/vmlinuz boot=live components nomodeset
    initrd /live/initrd
}
GRUB_CONFIG_EOF

# 1. Image d'amorce BIOS autonome (El Torito)
grub-mkstandalone \\
  --format=i386-pc \\
  --output="\${ISO_DIR}/boot/grub/i386-pc/core.img" \\
  --install-modules="linux normal iso9660 biosdisk search search_fs_file search_label part_msdos part_gpt all_video font gfxterm test echo sleep cat help ls" \\
  --modules="linux normal iso9660 biosdisk search search_fs_file search_label part_msdos part_gpt all_video font gfxterm" \\
  --locales="" \\
  --fonts="" \\
  "boot/grub/grub.cfg=\${ISO_DIR}/boot/grub/grub.cfg"

cat /usr/lib/grub/i386-pc/cdboot.img "\${ISO_DIR}/boot/grub/i386-pc/core.img" > "\${ISO_DIR}/boot/grub/i386-pc/eltorito.img"

# 2. Image d'amorce UEFI autonome (bootx64.efi)
grub-mkstandalone \\
  --format=x86_64-efi \\
  --output="\${ISO_DIR}/EFI/BOOT/bootx64.efi" \\
  --install-modules="linux normal iso9660 search search_fs_file search_label part_msdos part_gpt all_video font gfxterm" \\
  --modules="linux normal iso9660 search search_fs_file search_label part_msdos part_gpt all_video font gfxterm" \\
  --locales="" \\
  --fonts="" \\
  "boot/grub/grub.cfg=\${ISO_DIR}/boot/grub/grub.cfg"

echo -e "\${YELLOW}[7/7] 📀 Création de l'image ISO hybride amorçable (BIOS + UEFI)...\${NC}"
xorriso -as mkisofs \\
  -iso-level 3 \\
  -full-iso9660-filenames \\
  -volid "${recipe.branding.osName.toUpperCase().slice(0, 32)}" \\
  -eltorito-boot boot/grub/i386-pc/eltorito.img \\
    -no-emul-boot -boot-load-size 4 -boot-info-table \\
  --eltorito-catalog boot/grub/boot.cat \\
  -isohybrid-mbr /usr/lib/grub/i386-pc/boot_hybrid.img \\
  -output "\${OUTPUT_DIR}/${isoName}" \\
  "\${ISO_DIR}"

echo -e "\${GREEN}=======================================================\${NC}"
echo -e "\${GREEN}   ✅ ISO générée avec succès : \${OUTPUT_DIR}/${isoName}\${NC}"
echo -e "\${GREEN}   Taille du fichier : $(du -h "\${OUTPUT_DIR}/${isoName}" 2>/dev/null | cut -f1 || echo "OK")\${NC}"
echo -e "\${GREEN}   Empreinte SHA256  : $(sha256sum "\${OUTPUT_DIR}/${isoName}" 2>/dev/null | cut -d' ' -f1 || echo "Calculé au build")\${NC}"
echo -e "\${GREEN}=======================================================\${NC}"
${diskConversionStep}`;

  return `#!/usr/bin/env bash
# ==============================================================================
# OSForge Studio — Script de Construction d'OS / ISO Linux
# OS: ${recipe.branding.osName} (${recipe.branding.editionName})
# Base: ${recipe.distro.toUpperCase()} | Arch: ${recipe.arch} | Format: ${recipe.outputFormat}
# Date de génération: ${new Date().toISOString()}
# ==============================================================================

set -euo pipefail

RED='\\033[0;31m'
GREEN='\\033[0;32m'
CYAN='\\033[0;36m'
YELLOW='\\033[1;33m'
NC='\\033[0m'

echo -e "\${CYAN}=======================================================\${NC}"
echo -e "\${CYAN}   🚀 OSForge Studio : Compilation de l'ISO Linux     \${NC}"
echo -e "\${CYAN}   Distribution cible : ${recipe.distro} (${recipe.arch})\${NC}"
echo -e "\${CYAN}   Nom d'hôte         : ${recipe.hostname}\${NC}"
echo -e "\${CYAN}=======================================================\${NC}"

# Vérification des privilèges root
if [[ $EUID -ne 0 ]]; then
   echo -e "\${RED}[ERREUR] Ce script doit être exécuté avec les privilèges root (sudo).\${NC}" 
   exit 1
fi

# Repertoire de travail securise (evite les partitions /tmp montees avec l'option nodev)
WORK_DIR="/var/tmp/osforge-build-$(date +%s)"
ROOTFS_DIR="\${WORK_DIR}/rootfs"
ISO_DIR="\${WORK_DIR}/iso"
OUTPUT_DIR="$(pwd)/dist"

mkdir -p "\${ROOTFS_DIR}" "\${ISO_DIR}" "\${OUTPUT_DIR}"

echo -e "\${YELLOW}[1/7] 📦 Installation des dépendances de compilation de l'hôte...\${NC}"
which debootstrap xorriso mtools grub-mkrescue squashfs-tools >/dev/null 2>&1 || {
    echo -e "\${YELLOW}Installation des outils requis sur l'hôte...\${NC}"
    apt-get update -y && apt-get install -y debootstrap xorriso mtools grub-pc-bin grub-efi-amd64-bin grub-common squashfs-tools dosfstools rsync
}

echo -e "\${YELLOW}[2/7] 🏗️ Initialisation du RootFS de base (${recipe.distro} / ${target.suite})...\${NC}"
debootstrap --arch="${debArch}" \\
  --include="${kernelPkg},live-boot,systemd-sysv,initramfs-tools,ca-certificates,locales,sudo,curl,wget,gnupg,iproute2" \\
  ${target.suite} "\${ROOTFS_DIR}" "${target.mirror}"

echo -e "\${YELLOW}[3/7] ⚙️ Configuration du système et installation des paquets...\${NC}"

# Configuration des dépôts apt complets
cat << 'APT_SOURCES' > "\${ROOTFS_DIR}/etc/apt/sources.list"
${target.sourcesList(debArch)}
APT_SOURCES

# Cache optionnel des paquets APT du chroot (accélère les builds répétés en CI ; ignoré si non défini)
if [ -n "\${APT_CACHE_DIR:-}" ]; then
    mkdir -p "\${APT_CACHE_DIR}"
    mkdir -p "\${ROOTFS_DIR}/var/cache/apt/archives"
    mount --bind "\${APT_CACHE_DIR}" "\${ROOTFS_DIR}/var/cache/apt/archives"
fi

# Montage des pseudos-systèmes de fichiers pour le chroot
mount --bind /dev "\${ROOTFS_DIR}/dev"
mount --bind /dev/pts "\${ROOTFS_DIR}/dev/pts"
mount --bind /proc "\${ROOTFS_DIR}/proc"
mount --bind /sys "\${ROOTFS_DIR}/sys"

# Script de configuration exécuté à l'intérieur du chroot
cat << 'CHROOT_EOF' | chroot "\${ROOTFS_DIR}" /bin/bash
set -e
export DEBIAN_FRONTEND=noninteractive

# Mise à jour des index de paquets
apt-get update -y

# Installation sécurisée et résiliente des logiciels sélectionnés
for pkg in ${pkgs}; do
    apt-get install -y --no-install-recommends "$pkg" || echo "Info: $pkg omis ou non disponible dans le miroir apt principal."
done

# Utilitaires modernes (installations automatisées directes si absents du miroir Debian)
if command -v curl &>/dev/null; then
    # Fastfetch
    if ! command -v fastfetch &>/dev/null; then
        curl -sSL https://github.com/fastfetch-cli/fastfetch/releases/latest/download/fastfetch-linux-amd64.deb -o /tmp/ff.deb 2>/dev/null && dpkg -i /tmp/ff.deb 2>/dev/null || true
        rm -f /tmp/ff.deb
    fi
    # Starship
    if ! command -v starship &>/dev/null; then
        curl -sS https://starship.rs/install.sh | sh -s -- -y >/dev/null 2>&1 || true
    fi
    # LazyGit
    if ! command -v lazygit &>/dev/null; then
        curl -sSL https://github.com/jesseduffield/lazygit/releases/latest/download/lazygit_0.44.1_Linux_x86_64.tar.gz -o /tmp/lg.tar.gz 2>/dev/null && tar -xzf /tmp/lg.tar.gz -C /usr/local/bin lazygit 2>/dev/null || true
        rm -f /tmp/lg.tar.gz
    fi
fi

# Configuration du nom d'hôte
echo "${recipe.hostname}" > /etc/hostname
cat << 'HOSTS' > /etc/hosts
127.0.0.1   localhost ${recipe.hostname}
::1         localhost ip6-localhost ip6-loopback
HOSTS

# Configuration de la locale et du fuseau horaire
ln -sf /usr/share/zoneinfo/${recipe.timezone} /etc/localtime
echo "${recipe.locale} UTF-8" >> /etc/locale.gen || true
locale-gen || true

# Création de l'utilisateur principal
if ! id "${recipe.user.username}" &>/dev/null; then
    useradd -m -s ${recipe.user.shell} -c "${recipe.user.fullName}" ${recipe.user.username}
    echo "${recipe.user.username}:${recipe.user.password || 'forge'}" | chpasswd
    ${recipe.user.sudo ? `usermod -aG sudo ${recipe.user.username}` : ''}
fi

# Mot de passe Root
echo "root:toor" | chpasswd

# Configuration SSH
${recipe.enableSSH ? `
mkdir -p /etc/ssh /home/${recipe.user.username}/.ssh
chmod 700 /home/${recipe.user.username}/.ssh
${recipe.user.sshPublicKey ? `echo "${recipe.user.sshPublicKey}" > /home/${recipe.user.username}/.ssh/authorized_keys
chmod 600 /home/${recipe.user.username}/.ssh/authorized_keys
chown -R ${recipe.user.username}:${recipe.user.username} /home/${recipe.user.username}/.ssh` : ''}
` : ''}

# Sécurité & Durcissement (CIS Benchmark / UFW)
${recipe.security.firewall === 'ufw' ? `
if ! command -v ufw &>/dev/null; then
    apt-get install -y --no-install-recommends ufw >/dev/null 2>&1 || true
fi
if command -v ufw &>/dev/null; then
    ufw default deny incoming || true
    ufw default allow outgoing || true
    ${recipe.enableSSH ? 'ufw allow 22/tcp || true' : ''}
    ufw --force enable || true
fi
` : ''}

# Script de post-installation First-Boot
cat << 'FIRSTBOOT_EOF' > /root/firstboot.sh
#!/usr/bin/env bash
${recipe.firstBootScript || '# Aucun script first-boot spécifique'}
FIRSTBOOT_EOF
chmod +x /root/firstboot.sh

CHROOT_EOF

echo -e "\${YELLOW}[4/7] 🧹 Nettoyage des montages du RootFS...\${NC}"
umount -lf "\${ROOTFS_DIR}/sys" || true
umount -lf "\${ROOTFS_DIR}/proc" || true
umount -lf "\${ROOTFS_DIR}/dev/pts" || true
umount -lf "\${ROOTFS_DIR}/dev" || true
if [ -n "\${APT_CACHE_DIR:-}" ]; then
    umount -lf "\${ROOTFS_DIR}/var/cache/apt/archives" || true
fi

${packagingSteps}`;
}

/**
 * Generates the Dockerfile to build the OS in an isolated container
 */
export function generateDockerfile(recipe: OSRecipe): string {
  return `# ==============================================================================
# OSForge Studio — Dockerfile de Compilation d'ISO Isolée (${recipe.branding.osName})
# Construction garantie reproductible sans impacter la machine hôte
# ==============================================================================
FROM debian:bookworm-slim

ENV DEBIAN_FRONTEND=noninteractive

# Outils de construction d'images Linux & ISO
RUN apt-get update && apt-get install -y --no-install-recommends \\
    debootstrap \\
    xorriso \\
    mtools \\
    grub-pc-bin \\
    grub-efi-amd64-bin \\
    squashfs-tools \\
    dosfstools \\
    rsync \\
    curl \\
    ca-certificates \\
    xz-utils \\
    && rm -rf /var/lib/apt/lists/*

WORKDIR /osbuilder

COPY build.sh /osbuilder/build.sh
RUN chmod +x /osbuilder/build.sh

VOLUME ["/osbuilder/dist"]

ENTRYPOINT ["/osbuilder/build.sh"]
`;
}

/**
 * Generates the GitHub Actions workflow (.github/workflows/build-iso.yml)
 * Builds the ISO on GitHub's free runners and uploads the downloadable artifact/release!
 */
export function generateGitHubWorkflow(recipe: OSRecipe): string {
  const isoName = `${recipe.branding.osName.toLowerCase().replace(/[^a-z0-9]/g, '-')}-v${recipe.branding.version}`;

  return `name: 🚀 Build & Release Custom Linux ISO (${recipe.branding.osName})

# Pipeline 100% automatique : chaque push sur main compile l'ISO,
# la tague et publie une Release GitHub sans aucune action manuelle.
on:
  push:
    branches: [ "main", "master" ]
  workflow_dispatch:

concurrency:
  group: iso-build-\${{ github.ref }}
  cancel-in-progress: true

permissions:
  contents: write

jobs:
  build-iso:
    runs-on: ubuntu-latest

    steps:
      - name: 📥 Récupération du dépôt
        uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: 📦 Cache des paquets APT hôte (accélère les builds suivants)
        uses: actions/cache@v4
        with:
          path: /var/cache/apt/archives
          key: apt-iso-build-\${{ runner.os }}-v1

      - name: 📦 Cache des paquets APT du chroot (contenu de l'ISO, gain le plus important)
        uses: actions/cache@v4
        with:
          path: /var/cache/osforge-chroot-apt
          key: chroot-apt-${recipe.distro}-${recipe.arch}-\${{ hashFiles('build.sh') }}

      - name: 🛠️ Installation des dépendances de compilation ISO
        run: |
          sudo apt-get update
          sudo apt-get install -y debootstrap xorriso mtools grub-pc-bin grub-efi-amd64-bin grub-common squashfs-tools dosfstools rsync

      - name: 🏗️ Exécution du script de compilation OSForge
        env:
          APT_CACHE_DIR: /var/cache/osforge-chroot-apt
        run: |
          chmod +x build.sh
          sudo -E ./build.sh

      - name: 🔓 Restauration des permissions (dossiers créés en root par build.sh)
        run: |
          sudo chown -R "$(id -u):$(id -g)" dist
          sudo chown -R "$(id -u):$(id -g)" /var/cache/osforge-chroot-apt 2>/dev/null || true

      - name: 🔍 Calcul des sommes de contrôle SHA-256
        run: |
          cd dist
          sha256sum *.iso > SHA256SUMS.txt
          cat SHA256SUMS.txt

      - name: 📤 Publication de l'ISO en Artéfact GitHub (accès rapide, 14 jours)
        uses: actions/upload-artifact@v4
        with:
          name: ${isoName}-iso-artifact
          path: dist/*
          retention-days: 14

      - name: 📏 Vérification de la taille (limite de 2 Go pour une Release GitHub)
        id: sizecheck
        run: |
          SIZE=$(stat -c%s dist/*.iso)
          echo "Taille de l'ISO : $(( SIZE / 1024 / 1024 )) Mo"
          if [ "\${SIZE}" -ge 2147483648 ]; then
            echo "⚠️ ISO trop volumineuse pour une Release GitHub (limite stricte : 2 Go)."
            echo "   Récupérez-la via l'Artéfact ci-dessus (onglet Summary de ce run, 14 jours)."
            echo "over_limit=true" >> "\${GITHUB_OUTPUT}"
          else
            echo "over_limit=false" >> "\${GITHUB_OUTPUT}"
          fi

      - name: 🏷️ Génération automatique du tag de version
        id: autotag
        if: steps.sizecheck.outputs.over_limit == 'false'
        run: |
          TAG="v${recipe.branding.version}-build.\${{ github.run_number }}"
          echo "tag=\${TAG}" >> "\${GITHUB_OUTPUT}"
          git config user.name "github-actions[bot]"
          git config user.email "github-actions[bot]@users.noreply.github.com"
          git tag "\${TAG}"
          git push origin "\${TAG}"

      - name: 🚀 Publication automatique de la Release GitHub (sans action manuelle)
        if: steps.sizecheck.outputs.over_limit == 'false'
        uses: softprops/action-gh-release@v2
        with:
          tag_name: \${{ steps.autotag.outputs.tag }}
          name: "${recipe.branding.osName} \${{ steps.autotag.outputs.tag }}"
          files: |
            dist/*.iso
            dist/SHA256SUMS.txt
          generate_release_notes: true
          make_latest: true
`;
}

/**
 * Generates cloud-init YAML user-data
 */
export function generateCloudInitYaml(recipe: OSRecipe): string {
  const pkgs = resolvePackageList(recipe);

  return `#cloud-config
# ==============================================================================
# OSForge Studio — Manifeste Cloud-Init
# ==============================================================================

hostname: ${recipe.hostname}
fqdn: ${recipe.hostname}.local
manage_etc_hosts: true

users:
  - name: ${recipe.user.username}
    gecos: ${recipe.user.fullName}
    sudo: ${recipe.user.sudo ? 'ALL=(ALL) NOPASSWD:ALL' : 'false'}
    shell: ${recipe.user.shell}
    lock_passwd: false
    passwd: "$6$rounds=4096$salt$placeholderHashedPassword"
    ${recipe.user.sshPublicKey ? `ssh_authorized_keys:\n      - ${recipe.user.sshPublicKey}` : ''}

timezone: ${recipe.timezone}
locale: ${recipe.locale}.UTF-8

packages:
${pkgs.map(p => `  - ${p}`).join('\n')}

package_update: true
package_upgrade: ${recipe.security.autoSecurityUpdates ? 'true' : 'false'}

write_files:
  - path: /etc/motd
    content: |
      ======================================================
      Bienvenue sur ${recipe.branding.osName} (${recipe.branding.editionName})
      Généré avec OSForge Studio
      ======================================================

runcmd:
  - systemctl enable --now ssh || true
  ${recipe.security.firewall === 'ufw' ? '- ufw --force enable' : ''}
  - [ bash, -c, "${recipe.firstBootScript ? recipe.firstBootScript.replace(/"/g, '\\"') : 'echo Ready'}" ]
`;
}

/**
 * Generates OpenFactory-compatible JSON recipe
 */
export function generateRecipeJson(recipe: OSRecipe): string {
  return JSON.stringify(recipe, null, 2);
}

/**
 * Generates install-wsl.bat for Windows 10/11
 * Automatically imports the custom Linux OS into Windows Subsystem for Linux (WSL2)
 */
export function generateWslInstallerBat(recipe: OSRecipe): string {
  const distroName = recipe.branding.osName.replace(/[^a-zA-Z0-9]/g, '');

  return `@echo off
chcp 65001 >nul
REM ==============================================================================
REM OSForge Studio — Script d'installation 1-Click pour Windows WSL2
REM Installe votre OS sur-mesure (${recipe.branding.osName}) directement sous Windows
REM ==============================================================================

echo.
echo =====================================================================
echo   🪟 Installation de ${recipe.branding.osName} sous Windows WSL2
echo =====================================================================
echo.

REM 1. Vérification de l'activation de WSL
wsl --status >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [ERREUR] WSL n'est pas activé sur ce PC Windows.
    echo Exécutez 'wsl --install' dans PowerShell en mode Administrateur.
    pause
    exit /b 1
)

set DISTRO_NAME=${distroName}
set INSTALL_DIR=%USERPROFILE%\\WSL\\%DISTRO_NAME%
set TAR_FILE=dist\\rootfs.tar.gz

if not exist "%TAR_FILE%" (
    if exist "dist\\filesystem.squashfs" (
        set TAR_FILE=dist\\filesystem.squashfs
    ) else (
        echo [INFO] Le fichier rootfs.tar.gz sera généré ou utilisé depuis dist\\
    )
)

echo [1/3] Création du dossier d'installation : %INSTALL_DIR%
mkdir "%INSTALL_DIR%" 2>nul

echo [2/3] Importation de ${recipe.branding.osName} dans Windows WSL2...
wsl --import %DISTRO_NAME% "%INSTALL_DIR%" "%TAR_FILE%" --version 2

if %ERRORLEVEL% NEQ 0 (
    echo [AVERTISSEMENT] Import direct : tentative d'enregistrement standard...
)

echo [3/3] Configuration du support Systemd et utilisateur par défaut (%DISTRO_NAME%)...
wsl -d %DISTRO_NAME% -u root bash -c "echo '[boot]\nsystemd=true\n[user]\ndefault=${recipe.user.username}' > /etc/wsl.conf"

echo.
echo =====================================================================
echo   [SUCCES] ${recipe.branding.osName} est installe avec succes sous Windows !
echo =====================================================================
echo.
echo Pour lancer votre distribution a tout moment dans le terminal Windows :
echo    wsl -d %DISTRO_NAME%
echo.
echo Lancement immediat de votre OS...
wsl -d %DISTRO_NAME%
pause
`;
}

/**
 * Generates /etc/wsl.conf for native Windows WSL2 integration
 */
export function generateWslConf(recipe: OSRecipe): string {
  return `# ==============================================================================
# OSForge Studio — Configuration WSL2 (/etc/wsl.conf)
# Active Systemd, l'intégration GUI (WSLg) et l'utilisateur par défaut sous Windows
# ==============================================================================

[boot]
systemd=true

[user]
default=${recipe.user.username}

[interop]
enabled=true
appendWindowsPath=true

[network]
hostname=${recipe.hostname}
generateHosts=true
generateResolvConf=true

[automount]
enabled=true
root=/mnt/
options="metadata,uid=1000,gid=1000,umask=22,fmask=11"
`;
}

/**
 * Generates run-live-windows.bat for running the ISO live on Windows via portable QEMU
 */
export function generateLiveWindowsBat(recipe: OSRecipe): string {
  const isoName = `${recipe.branding.osName.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${recipe.branding.version}-${recipe.arch}.iso`;

  return `@echo off
setlocal EnableDelayedExpansion
title ${recipe.branding.osName} - Machine Virtuelle QEMU (Test & Nettoyage Automatique)
cls

:MENU
cls
echo ===============================================================================
echo   OSFORGE STUDIO - MACHINE VIRTUELLE DE TEST RAPIDE (QEMU)
echo ===============================================================================
echo.

set ISO_PATH=dist\\${isoName}

if not exist "%ISO_PATH%" (
    for %%f in (dist\\*.iso) do set ISO_PATH=%%f
)

if not exist "%ISO_PATH%" (
    echo [ERREUR] Aucun fichier .iso n'a ete trouve dans dist\\
    echo Assurez-vous d'avoir compile votre image ISO au prealable.
    echo.
    pause
    exit /b 1
)

echo [OK] Image ISO detectee : %ISO_PATH%
echo.

set QEMU_CMD=
set QEMU_IMG_CMD=
set QEMU_MODE=WINDOWS

where qemu-system-x86_64 >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    set QEMU_CMD=qemu-system-x86_64
    set QEMU_IMG_CMD=qemu-img
)

if "%QEMU_CMD%"=="" (
    if exist "C:\\Program Files\\qemu\\qemu-system-x86_64.exe" (
        set "QEMU_CMD=C:\\Program Files\\qemu\\qemu-system-x86_64.exe"
        set "QEMU_IMG_CMD=C:\\Program Files\\qemu\\qemu-img.exe"
    )
)

if "%QEMU_CMD%"=="" (
    wsl which qemu-system-x86_64 >nul 2>&1
    if !ERRORLEVEL! EQU 0 (
        set QEMU_MODE=WSL
        set QEMU_CMD=wsl qemu-system-x86_64
        set QEMU_IMG_CMD=wsl qemu-img
    )
)

if not "%QEMU_CMD%"=="" (
    echo [OK] Moteur QEMU detecte : %QEMU_MODE%
) else (
    echo [ATTENTION] QEMU n'est pas encore installe sur votre systeme.
)

echo.
echo -------------------------------------------------------------------------------
echo   CHOISISSEZ UNE OPTION :
echo -------------------------------------------------------------------------------
echo   [1] Lancer la VM Ephemere en Live RAM (Zero fichier modifie sur votre disque)
echo   [2] Lancer la VM avec un Disque Virtuel Temporaire (20 Go QCOW2)
echo   [3] Installer automatiquement QEMU (via Winget Windows ou WSL2)
echo   [4] Nettoyer / Supprimer les disques virtuels de test temporaires
echo   [0] Retour au menu principal
echo.
echo ===============================================================================
set /p CHOICE="Votre choix [1-4, 0] : "

if "%CHOICE%"=="1" goto RUN_LIVE_RAM
if "%CHOICE%"=="2" goto RUN_WITH_DISK
if "%CHOICE%"=="3" goto INSTALL_QEMU
if "%CHOICE%"=="4" goto CLEANUP_VM
if "%CHOICE%"=="0" exit /b 0

echo Choix invalide.
timeout /t 2 >nul
goto MENU

:INSTALL_QEMU
cls
echo ===============================================================================
echo   INSTALLATION AUTOMATIQUE DE QEMU
echo ===============================================================================
echo.
echo [1/2] Tentative d'installation native Windows via Windows Package Manager (winget)...
where winget >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo Execution de : winget install SoftwareFreedomConservancy.QEMU ...
    winget install SoftwareFreedomConservancy.QEMU --accept-package-agreements --accept-source-agreements
    if %ERRORLEVEL% EQU 0 (
        echo [SUCCES] QEMU pour Windows a ete installe !
        if exist "C:\\Program Files\\qemu\\qemu-system-x86_64.exe" (
            set "QEMU_CMD=C:\\Program Files\\qemu\\qemu-system-x86_64.exe"
            set "QEMU_IMG_CMD=C:\\Program Files\\qemu\\qemu-img.exe"
        )
        pause
        goto MENU
    )
)

echo.
echo [2/2] Tentative d'installation de QEMU dans votre environnement WSL2...
wsl --status >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo Installation de qemu-system-x86 et qemu-utils dans WSL2...
    wsl sudo apt-get update -y
    wsl sudo apt-get install -y qemu-system-x86 qemu-utils
    if %ERRORLEVEL% EQU 0 (
        echo [SUCCES] QEMU a ete installe avec succes dans WSL2 !
        set QEMU_MODE=WSL
        set QEMU_CMD=wsl qemu-system-x86_64
        set QEMU_IMG_CMD=wsl qemu-img
        pause
        goto MENU
    )
)

echo [INFO] Si l'installation automatique a echoue, vous pouvez installer QEMU manuellement :
echo https://www.qemu.org/download/#windows
pause
goto MENU

:CHECK_QEMU_EXISTS
if "%QEMU_CMD%"=="" (
    echo [ERREUR] QEMU n'est pas installe. Veuillez choisir l'option [3] d'abord.
    pause
    goto MENU
)
exit /b 0

:RUN_LIVE_RAM
call :CHECK_QEMU_EXISTS
cls
echo ===============================================================================
echo   LANCEMENT DE LA VM EPHEMERE (LIVE RAM)
echo ===============================================================================
echo.
echo   Image ISO : %ISO_PATH%
echo   Memoire   : 4096 Mo (4 Go RAM)
echo   Processeur: 4 Coeurs CPU Virtuels
echo.
echo [INFO] Cette VM tourne 100%% en memoire vive. Aucun fichier n'est cree.
echo [INFO] Fermez simplement la fenetre QEMU quand vous avez termine le test.
echo.

if "%QEMU_MODE%"=="WSL" (
    wsl bash -c "ISO_FILE=\\$(wslpath -a '%ISO_PATH%'); qemu-system-x86_64 -cdrom \\"\\$ISO_FILE\\" -m 4096 -smp 4 -vga virtio -display sdl -net nic -net user -boot d"
) else (
    "%QEMU_CMD%" -cdrom "%CD%\\%ISO_PATH%" -m 4096 -smp 4 -vga virtio -net nic -net user -boot d
)

echo.
echo [OK] Session de test Live RAM terminee.
pause
goto MENU

:RUN_WITH_DISK
call :CHECK_QEMU_EXISTS
cls
echo ===============================================================================
echo   LANCEMENT DE LA VM AVEC DISQUE VIRTUEL TEMPORAIRE
echo ===============================================================================
echo.
set DISK_NAME=dist\\test-vm-disk.qcow2

echo [1/3] Creation d'un disque virtuel temporaire dynamique de 20 Go (%DISK_NAME%)...
if "%QEMU_MODE%"=="WSL" (
    wsl bash -c "DISK_FILE=\\$(wslpath -a '%DISK_NAME%'); qemu-img create -f qcow2 \\"\\$DISK_FILE\\" 20G"
) else (
    if not "%QEMU_IMG_CMD%"=="" (
        "%QEMU_IMG_CMD%" create -f qcow2 "%CD%\\%DISK_NAME%" 20G
    ) else (
        qemu-img create -f qcow2 "%CD%\\%DISK_NAME%" 20G
    )
)

echo [2/3] Demarrage de la VM avec support d'ecriture...
echo.
echo [INFO] Vous pouvez tester l'installateur de l'OS ou installer des paquets.
echo [INFO] A la fermeture, le disque temporaire vous sera propose a la suppression.
echo.

if "%QEMU_MODE%"=="WSL" (
    wsl bash -c "ISO_FILE=\\$(wslpath -a '%ISO_PATH%'); DISK_FILE=\\$(wslpath -a '%DISK_NAME%'); qemu-system-x86_64 -cdrom \\"\\$ISO_FILE\\" -hda \\"\\$DISK_FILE\\" -m 4096 -smp 4 -vga virtio -display sdl -net nic -net user -boot d"
) else (
    "%QEMU_CMD%" -cdrom "%CD%\\%ISO_PATH%" -hda "%CD%\\%DISK_NAME%" -m 4096 -smp 4 -vga virtio -net nic -net user -boot d
)

echo.
echo [3/3] Fin de la session de test.
echo.
echo Souhaitez-vous supprimer le disque virtuel temporaire %DISK_NAME% ?
set /p DEL_CONFIRM="Supprimer le disque de test pour liberer l'espace [O/n] ? "
if /i not "%DEL_CONFIRM%"=="n" (
    if exist "%DISK_NAME%" (
        del /f /q "%DISK_NAME%"
        echo [NETTOYAGE] Disque virtuel temporaire supprime avec succes !
    )
) else (
    echo [INFO] Disque conserve dans : %DISK_NAME%
)

echo.
pause
goto MENU

:CLEANUP_VM
cls
echo ===============================================================================
echo   NETTOYAGE DES MACHINES VIRTUELLES DE TEST
echo ===============================================================================
echo.
set FOUND=0
if exist "dist\\test-vm-disk.qcow2" (
    del /f /q "dist\\test-vm-disk.qcow2"
    echo [SUPPRIME] dist\\test-vm-disk.qcow2
    set FOUND=1
)
if exist "test-vm-disk.qcow2" (
    del /f /q "test-vm-disk.qcow2"
    echo [SUPPRIME] test-vm-disk.qcow2
    set FOUND=1
)
if exist "dist\\*.qcow2" (
    del /f /q "dist\\*.qcow2"
    echo [SUPPRIME] Fichiers .qcow2 temporaires
    set FOUND=1
)

if "%FOUND%"=="0" (
    echo [INFO] Aucun fichier de VM temporaire a supprimer. Tout est propre !
) else (
    echo [SUCCES] Tous les disques et fichiers temporaires de VM ont ete nettoyes !
)
echo.
pause
goto MENU
`;
}

/**
 * Generates auto-build.bat — 100% unattended pipeline for Windows (WSL2 + build + QEMU test)
 */
export function generateAutoBuildBat(recipe: OSRecipe): string {
  const isoName = `${recipe.branding.osName.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${recipe.branding.version}-${recipe.arch}.iso`;

  return `@echo off
setlocal EnableDelayedExpansion
title ${recipe.branding.osName} - Compilation 100% Automatique
cls

:: =============================================================================
:: ${recipe.branding.osName} - Mode "1-Clic" 100% automatique
:: Detecte WSL2, installe les dependances si besoin, compile l'ISO puis lance
:: un test QEMU Live RAM automatiquement - aucune interaction requise.
:: =============================================================================

set LOG_FILE=auto-build.log
echo [%DATE% %TIME%] Debut de la compilation automatique > "%LOG_FILE%"

echo ===============================================================================
echo   ${recipe.branding.osName} - COMPILATION 100%% AUTOMATIQUE (1-CLIC)
echo   Toutes les etapes s'enchainent sans intervention. Logs : %LOG_FILE%
echo ===============================================================================
echo.

:: ---------------------------------------------------------------------------
:: [1/5] Verification / installation de WSL2
:: ---------------------------------------------------------------------------
echo [1/5] Verification de WSL2...
wsl --status >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [INFO] WSL2 n'est pas actif. Installation automatique en cours...
    echo [%DATE% %TIME%] Installation de WSL2 >> "%LOG_FILE%"
    wsl --install --no-launch >>"%LOG_FILE%" 2>&1
    echo.
    echo [ATTENTION] WSL2 vient d'etre installe pour la premiere fois.
    echo Windows doit redemarrer pour terminer l'installation.
    echo Relancez simplement auto-build.bat apres le redemarrage : tout reprendra automatiquement.
    pause
    exit /b 0
)
echo [OK] WSL2 est actif.
echo.

:: ---------------------------------------------------------------------------
:: [2/5] Verification / installation d'une distribution WSL par defaut
:: ---------------------------------------------------------------------------
echo [2/5] Verification de la distribution Linux WSL...
wsl -l -q >nul 2>&1
set DISTRO_COUNT=0
for /f %%d in ('wsl -l -q 2^>nul ^| findstr /r /v "^$"') do set /a DISTRO_COUNT+=1
if %DISTRO_COUNT% EQU 0 (
    echo [INFO] Aucune distribution WSL trouvee. Installation automatique d'Ubuntu...
    echo [%DATE% %TIME%] Installation d'Ubuntu dans WSL2 >> "%LOG_FILE%"
    wsl --install -d Ubuntu --no-launch >>"%LOG_FILE%" 2>&1
    if %ERRORLEVEL% NEQ 0 (
        echo [ERREUR] Echec de l'installation d'Ubuntu dans WSL2. Voir %LOG_FILE%.
        pause
        exit /b 1
    )
)
echo [OK] Distribution WSL disponible.
echo.

:: ---------------------------------------------------------------------------
:: [3/5] Installation des dependances de compilation (execute en root, sans mot de passe)
:: ---------------------------------------------------------------------------
echo [3/5] Installation des dependances de compilation ISO dans WSL2...
echo       (debootstrap, xorriso, grub, squashfs-tools...)
wsl -u root -- bash -c "apt-get update -y && apt-get install -y debootstrap xorriso mtools grub-pc-bin grub-efi-amd64-bin grub-common squashfs-tools dosfstools rsync" >>"%LOG_FILE%" 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [ERREUR] Echec de l'installation des dependances. Voir %LOG_FILE%.
    pause
    exit /b 1
)
echo [OK] Dependances installees.
echo.

:: ---------------------------------------------------------------------------
:: [4/5] Compilation de l'ISO (execute en root, aucun mot de passe sudo requis)
:: ---------------------------------------------------------------------------
echo [4/5] Compilation de l'ISO en cours (peut prendre plusieurs minutes)...
echo [%DATE% %TIME%] Lancement de build.sh en root >> "%LOG_FILE%"
wsl -u root -- bash -c "chmod +x build.sh && ./build.sh" >>"%LOG_FILE%" 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [ERREUR] La compilation a echoue. Consultez %LOG_FILE% pour le detail.
    pause
    exit /b 1
)
echo [OK] Compilation terminee. Image disponible dans dist\\
echo.

:: ---------------------------------------------------------------------------
:: [5/5] Installation automatique de QEMU (si absent) + test Live RAM immediat
:: ---------------------------------------------------------------------------
echo [5/5] Preparation du test Live automatique (QEMU)...
set QEMU_CMD=
where qemu-system-x86_64 >nul 2>&1
if %ERRORLEVEL% EQU 0 set QEMU_CMD=qemu-system-x86_64
if "%QEMU_CMD%"=="" if exist "C:\\Program Files\\qemu\\qemu-system-x86_64.exe" set "QEMU_CMD=C:\\Program Files\\qemu\\qemu-system-x86_64.exe"

if "%QEMU_CMD%"=="" (
    where winget >nul 2>&1
    if %ERRORLEVEL% EQU 0 (
        echo [INFO] QEMU absent. Installation automatique via winget...
        winget install SoftwareFreedomConservancy.QEMU --accept-package-agreements --accept-source-agreements >>"%LOG_FILE%" 2>&1
        if exist "C:\\Program Files\\qemu\\qemu-system-x86_64.exe" set "QEMU_CMD=C:\\Program Files\\qemu\\qemu-system-x86_64.exe"
    )
)

set ISO_PATH=dist\\${isoName}
if not exist "%ISO_PATH%" (
    for %%f in (dist\\*.iso) do set ISO_PATH=%%f
)

if "%QEMU_CMD%"=="" (
    echo [ATTENTION] QEMU n'a pas pu etre installe automatiquement.
    echo Compilation terminee avec succes : %ISO_PATH%
    echo Lancez run-live-windows.bat pour tester manuellement.
    pause
    exit /b 0
)

if not exist "%ISO_PATH%" (
    echo [ATTENTION] Aucune image ISO trouvee dans dist\\ pour le test.
    pause
    exit /b 0
)

echo [OK] Lancement du test Live RAM automatique de %ISO_PATH%...
echo.
echo ===============================================================================
echo   [SUCCES] Pipeline 100%% automatique termine !
echo   ISO       : %ISO_PATH%
echo   Test QEMU : demarrage en cours (fermez la fenetre QEMU quand vous avez fini)
echo ===============================================================================
"%QEMU_CMD%" -cdrom "%ISO_PATH%" -m 4096 -smp 4 -vga virtio -display sdl -net nic -net user -boot d

pause
exit /b 0
`;
}

/**
 * Generates auto-build.sh — 100% unattended pipeline for Linux / macOS
 */
export function generateAutoBuildSh(recipe: OSRecipe): string {
  const isoName = `${recipe.branding.osName.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${recipe.branding.version}-${recipe.arch}.iso`;

  return `#!/usr/bin/env bash
# ==============================================================================
# ${recipe.branding.osName} — Pipeline 100% automatique (Linux / macOS)
# Détecte le gestionnaire de paquets, installe les dépendances, compile l'ISO
# puis lance un test QEMU immédiat — aucune interaction requise.
# ==============================================================================

set -euo pipefail

RED='\\033[0;31m'
GREEN='\\033[0;32m'
CYAN='\\033[0;36m'
YELLOW='\\033[1;33m'
NC='\\033[0m'

LOG_FILE="auto-build.log"
: > "\${LOG_FILE}"

echo -e "\${CYAN}===============================================================================\${NC}"
echo -e "\${CYAN}  ${recipe.branding.osName} — COMPILATION 100% AUTOMATIQUE (1-CLIC)\${NC}"
echo -e "\${CYAN}  Toutes les étapes s'enchaînent sans intervention. Logs : \${LOG_FILE}\${NC}"
echo -e "\${CYAN}===============================================================================\${NC}"
echo ""

# ------------------------------------------------------------------------------
# [1/4] Installation automatique des dépendances de compilation (détection du
# gestionnaire de paquets de l'hôte : apt, dnf, pacman, zypper)
# ------------------------------------------------------------------------------
echo -e "\${YELLOW}[1/4] Installation des dépendances de compilation...\${NC}"
DEPS="debootstrap xorriso mtools grub-pc-bin grub-efi-amd64-bin squashfs-tools dosfstools rsync"

if command -v apt-get &>/dev/null; then
    sudo apt-get update -y >> "\${LOG_FILE}" 2>&1
    sudo apt-get install -y \${DEPS} >> "\${LOG_FILE}" 2>&1
elif command -v dnf &>/dev/null; then
    sudo dnf install -y debootstrap xorriso mtools grub2-tools squashfs-tools dosfstools rsync >> "\${LOG_FILE}" 2>&1
elif command -v pacman &>/dev/null; then
    sudo pacman -Sy --noconfirm debootstrap xorriso mtools grub squashfs-tools dosfstools rsync >> "\${LOG_FILE}" 2>&1
elif command -v zypper &>/dev/null; then
    sudo zypper install -y debootstrap xorriso mtools grub2 squashfs dosfstools rsync >> "\${LOG_FILE}" 2>&1
else
    echo -e "\${RED}[ERREUR] Aucun gestionnaire de paquets supporté détecté (apt/dnf/pacman/zypper).\${NC}"
    exit 1
fi
echo -e "\${GREEN}[OK] Dépendances installées.\${NC}"
echo ""

# ------------------------------------------------------------------------------
# [2/4] Compilation de l'ISO
# ------------------------------------------------------------------------------
echo -e "\${YELLOW}[2/4] Compilation de l'ISO en cours (peut prendre plusieurs minutes)...\${NC}"
chmod +x build.sh
sudo ./build.sh >> "\${LOG_FILE}" 2>&1
echo -e "\${GREEN}[OK] Compilation terminée. Image disponible dans dist/\${NC}"
echo ""

# ------------------------------------------------------------------------------
# [3/4] Installation automatique de QEMU si absent
# ------------------------------------------------------------------------------
echo -e "\${YELLOW}[3/4] Vérification de QEMU pour le test Live automatique...\${NC}"
if ! command -v qemu-system-x86_64 &>/dev/null; then
    echo "QEMU absent, installation automatique..."
    if command -v apt-get &>/dev/null; then
        sudo apt-get install -y qemu-system-x86 >> "\${LOG_FILE}" 2>&1
    elif command -v dnf &>/dev/null; then
        sudo dnf install -y qemu-system-x86 >> "\${LOG_FILE}" 2>&1
    elif command -v pacman &>/dev/null; then
        sudo pacman -Sy --noconfirm qemu-full >> "\${LOG_FILE}" 2>&1
    elif command -v brew &>/dev/null; then
        brew install qemu >> "\${LOG_FILE}" 2>&1
    fi
fi
echo -e "\${GREEN}[OK] QEMU prêt.\${NC}"
echo ""

# ------------------------------------------------------------------------------
# [4/4] Test Live RAM automatique
# ------------------------------------------------------------------------------
ISO_FILE="dist/${isoName}"
if [ ! -f "\${ISO_FILE}" ]; then
    ISO_FILE=$(ls dist/*.iso 2>/dev/null | head -n1 || true)
fi

echo -e "\${GREEN}===============================================================================\${NC}"
echo -e "\${GREEN}  [SUCCÈS] Pipeline 100% automatique terminé !\${NC}"
echo -e "\${GREEN}  ISO : \${ISO_FILE}\${NC}"
echo -e "\${GREEN}===============================================================================\${NC}"

if [ -n "\${ISO_FILE}" ] && command -v qemu-system-x86_64 &>/dev/null; then
    echo "Lancement du test Live RAM (fermez la fenêtre QEMU quand vous avez fini)..."
    qemu-system-x86_64 -cdrom "\${ISO_FILE}" -m 4096 -smp 4 -vga virtio -net nic -net user -boot d
else
    echo "QEMU non disponible : lancez run-live-windows.bat ou installez QEMU manuellement pour tester."
fi
`;
}

/**
 * Generates launch.bat — Universal 1-Click Interactive Menu Launcher for Windows
 */
export function generateUniversalLauncherBat(recipe: OSRecipe): string {
  return `@echo off
setlocal EnableDelayedExpansion
title OSForge Studio - Lanceur ${recipe.branding.osName}
cls

:MENU
cls
echo ===============================================================================
echo   OSFORGE STUDIO - LANCEUR RAPIDE : ${recipe.branding.osName} (${recipe.distro.toUpperCase()})
echo ===============================================================================
echo.
echo   [1] Installer et lancer dans Windows WSL2 (Recommande)
echo   [2] Tester l'ISO en Live avec QEMU sous Windows
echo   [3] Compiler l'image ISO en local avec WSL2 / Linux
echo   [4] Ouvrir le guide GitHub Actions (Build Cloud gratuit)
echo   [5] Afficher le manifeste de configuration (recipe.json)
echo   [6] Tout Automatiser en 1-Clic (WSL2 + Compilation + Test QEMU, sans interaction)
echo   [0] Quitter
echo.
echo ===============================================================================
set /p CHOICE="Votre choix [1-6, 0] : "

if "%CHOICE%"=="1" goto WSL_INSTALL
if "%CHOICE%"=="2" goto LIVE_QEMU
if "%CHOICE%"=="3" goto BUILD_LOCAL
if "%CHOICE%"=="4" goto GITHUB_ACTIONS
if "%CHOICE%"=="5" goto VIEW_RECIPE
if "%CHOICE%"=="6" goto AUTO_BUILD
if "%CHOICE%"=="0" exit /b 0

echo Choix invalide.
timeout /t 2 >nul
goto MENU

:WSL_INSTALL
cls
echo Demarrage de l'installation WSL2...
if exist install-wsl.bat (
    call install-wsl.bat
) else (
    echo [ERREUR] install-wsl.bat introuvable.
    pause
)
goto MENU

:LIVE_QEMU
cls
echo Demarrage en Live QEMU...
if exist run-live-windows.bat (
    call run-live-windows.bat
) else (
    echo [ERREUR] run-live-windows.bat introuvable.
    pause
)
goto MENU

:BUILD_LOCAL
cls
echo ===============================================================================
echo   Compilation locale via WSL2 / Bash
echo ===============================================================================
echo Lancement de la compilation dans WSL2...
wsl bash -c "chmod +x build.sh && sudo ./build.sh"
pause
goto MENU

:GITHUB_ACTIONS
cls
echo ===============================================================================
echo   Compilation Cloud via GitHub Actions
echo ===============================================================================
echo 1. Initialisez et poussez sur GitHub :
echo    git init -b main ^&^& git add . ^&^& git commit -m "init OS recipe"
echo    gh repo create ${recipe.branding.osName.toLowerCase().replace(/[^a-z0-9]/g, '-')}-os --public --source=. --push
echo 2. Rendez-vous dans l'onglet 'Actions' : le build se lance automatiquement et
echo    publie une Release avec votre ISO, sans autre action de votre part.
echo.
pause
goto MENU

:VIEW_RECIPE
cls
type recipe.json
echo.
pause
goto MENU

:AUTO_BUILD
cls
if exist auto-build.bat (
    call auto-build.bat
) else (
    echo [ERREUR] auto-build.bat introuvable.
    pause
)
goto MENU
`;
}

/**
 * Generates launch.sh — Universal 1-Click Interactive Menu Launcher for Linux / macOS
 */
export function generateUniversalLauncherSh(recipe: OSRecipe): string {
  const isoName = `${recipe.branding.osName.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${recipe.branding.version}-${recipe.arch}.iso`;

  return `#!/usr/bin/env bash
# ==============================================================================
# OSForge Studio — Universal Interactive Launcher (Linux / macOS)
# ==============================================================================

set -e

show_menu() {
    clear
    echo "==============================================================================="
    echo "  🚀 OSFORGE STUDIO — LANCEUR RAPIDE : ${recipe.branding.osName} (${recipe.distro.toUpperCase()})"
    echo "==============================================================================="
    echo ""
    echo "  [1] 🔨 Compiler l'image ISO en local (build.sh)"
    echo "  [2] 🐳 Compiler dans un conteneur Docker isolé"
    echo "  [3] 🖲️ Tester l'ISO compilée avec QEMU KVM"
    echo "  [4] 🌐 Pousser sur GitHub pour build Cloud gratuit"
    echo "  [5] 📖 Afficher la recette JSON (recipe.json)"
    echo "  [6] ⚡ Tout automatiser en 1-clic (dépendances + build + test QEMU)"
    echo "  [0] ❌ Quitter"
    echo ""
    echo "==============================================================================="
    read -rp "Votre choix [1-6, 0] : " choice
    
    case $choice in
        1)
            echo "Lancement de la compilation locale..."
            chmod +x build.sh
            sudo ./build.sh
            read -rp "Appuyez sur Entrée pour continuer..."
            show_menu
            ;;
        2)
            echo "Compilation Docker isolée..."
            docker build -t osforge-builder .
            docker run --rm --privileged -v "$(pwd)/dist:/osbuilder/dist" osforge-builder
            read -rp "Appuyez sur Entrée pour continuer..."
            show_menu
            ;;
        3)
            if [ -f "dist/${isoName}" ]; then
                echo "Lancement de QEMU..."
                qemu-system-x86_64 -cdrom "dist/${isoName}" -m 4G -enable-kvm -vga virtio -smp 4
            else
                echo "L'image ISO dist/${isoName} n'existe pas encore. Veuillez d'abord compiler l'image (Choix 1 ou 2)."
                read -rp "Appuyez sur Entrée pour continuer..."
            fi
            show_menu
            ;;
        4)
            echo "Poussée sur GitHub..."
            git init -b main && git add . && git commit -m "feat: init ${recipe.branding.osName}"
            gh repo create "${recipe.branding.osName.toLowerCase().replace(/[^a-z0-9]/g, '-')}-os" --public --source=. --push
            read -rp "Appuyez sur Entrée pour continuer..."
            show_menu
            ;;
        5)
            cat recipe.json
            echo ""
            read -rp "Appuyez sur Entrée pour continuer..."
            show_menu
            ;;
        6)
            chmod +x auto-build.sh
            ./auto-build.sh
            read -rp "Appuyez sur Entrée pour continuer..."
            show_menu
            ;;
        0)
            echo "Au revoir !"
            exit 0
            ;;
        *)
            echo "Choix invalide."
            sleep 1
            show_menu
            ;;
    esac
}

show_menu
`;
}

