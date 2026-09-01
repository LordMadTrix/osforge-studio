import { OSRecipe } from '../../types/os';
import { NonDebianFamily } from './types';
import { resolvePackageList } from './packages';
import {
  shQuote,
  shellQuotePkgList,
  sanitizeGrubTitle,
  sanitizeKernelCmdline,
  nonNativeArchNotice,
  resolveXkb,
  dmEnableCmd,
  localeSetupCmd,
  osReleaseCmd,
  userSshSetupCmd,
  networkConfigCmd,
  vpnConfigCmd,
  communityReposCmd,
  gamingSysctlCmd,
  steamConsoleModeCmd,
  powerSavingCmd,
  sshHardeningCmd,
  macHardeningCmd,
  firewallCmd,
  autoSecurityUpdatesCmd,
  cisHardeningCmd,
  zramSetupCmd,
  flatpakSetupCmd,
  calamaresInstallerCmd,
  gpuDriverCmd,
  dmAutologinCmd,
  kioskSetupCmd,
  dotfilesCloneCmd,
  customServicesCmd,
  k3sSetupCmd,
  tailscaleServiceCmd,
  ollamaSetupCmd,
  opentofuSetupCmd,
  k8sCliSetupCmd,
  zigSetupCmd,
  vscodiumSetupCmd,
  uvSetupCmd,
  heroicSetupCmd,
  metasploitSetupCmd,
  firstbootTriggerCmd,
} from './helpers';

export const NON_DEBIAN_LABELS: Record<string, string> = {
  arch: 'Arch Linux',
  cachyos: 'CachyOS (base Arch Linux)',
  fedora: 'Fedora Linux',
  rocky: 'Rocky Linux',
  alpine: 'Alpine Linux',
  opensuse: 'openSUSE Tumbleweed',
  void: 'Void Linux',
};

export interface NonDebianFamilyConfig {
  hostDeps: string;
  hostCheckCmd: string;
  bootstrapBlock: (distroId: string, unameArch: string, isDiskImage: boolean, kernelType: string) => string;
  updateCmd: string;
  installOneCmd: string;
  diskImageSupported: boolean;
  diskImageKernelDetectCmd?: string | ((kernelType: string) => string);
  grubInstallBin?: string;
  grubConfigSubdir?: string;
  diskImageRootIsDevicePath?: boolean;
  diskImageExtraKernelArgs?: string;
  diskImageInitrdRegenCmd?: string;
}

export const ARCH_KERNEL_PACKAGE: Record<string, string> = {
  generic: 'linux',
  mainline_beta: 'linux',
  cachyos: 'linux',
  zen: 'linux-zen',
  liquorix: 'linux',
  xanmod: 'linux',
  hardened: 'linux-hardened',
  realtime: 'linux-rt',
  cloud_micro: 'linux',
  lts: 'linux-lts',
};

export const ARCH_KERNEL_FALLBACK_NOTICE: Record<string, string> = {
  mainline_beta: "mainline_beta n'a pas de paquet officiel Arch dédié",
  cachyos: 'linux-cachyos nécessite le dépôt CachyOS (non configuré ici)',
  liquorix: 'Liquorix est un noyau spécifique Debian/Ubuntu, sans équivalent officiel Arch',
  xanmod: 'XanMod est officiellement fourni pour la famille Debian/Ubuntu (APT), sans paquet officiel Arch',
  cloud_micro: "cloud_micro n'a pas d'équivalent officiel Arch",
};

export const NON_DEBIAN_FAMILY_CONFIG: Record<NonDebianFamily, NonDebianFamilyConfig> = {
  arch: {
    hostDeps: 'arch-install-scripts pacman-package-manager',
    hostCheckCmd: 'pacstrap',
    bootstrapBlock: (distroId, unameArch, isDiskImage, kernelType) => {
      const kernelPkg = ARCH_KERNEL_PACKAGE[kernelType] || 'linux';
      const fallbackNotice = ARCH_KERNEL_FALLBACK_NOTICE[kernelType];
      const archNotice = nonNativeArchNotice(unameArch, 'Arch (pacstrap)');
      const cachyosNotice = distroId === 'cachyos'
        ? `echo -e "\${YELLOW}[INFO] Le dépôt officiel CachyOS n'est pas encore configuré par ce générateur : paquets Arch Linux standards utilisés à la place (aucun paquet compilé x86-64-v3/v4, pas d'ordonnanceur BORE spécifique).\${NC}"\n`
        : '';
      return `${archNotice}${cachyosNotice}mkdir -p "\${WORK_DIR}/pacman.d"
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

mkdir -p "\${ROOTFS_DIR}/var/lib/pacman"${isDiskImage && fallbackNotice ? `
echo -e "\${YELLOW}[INFO] ${fallbackNotice} : installation de '${kernelPkg}' à la place.\${NC}"` : ''}
pacstrap -c -G -M -C "\${WORK_DIR}/pacman.conf" "\${ROOTFS_DIR}" base${isDiskImage ? ` grub ${kernelPkg} linux-firmware` : ''}

# Le rootfs cible a besoin de son PROPRE mirrorlist utilisable : pacstrap -M n'y copie pas
# celui de l'hôte, et celui livré par défaut avec "base" a tous ses miroirs commentés.
echo 'Server = https://geo.mirror.pkgbuild.com/$repo/os/$arch' > "\${ROOTFS_DIR}/etc/pacman.d/mirrorlist"
sed -i 's/^#\\?SigLevel.*/SigLevel = Never/' "\${ROOTFS_DIR}/etc/pacman.conf"
# CheckSpace est peu fiable dans un chroot (faux "not enough free disk space", vérifié en live) : désactivé.
sed -i 's/^CheckSpace/#CheckSpace/' "\${ROOTFS_DIR}/etc/pacman.conf"${isDiskImage ? `
# Le hook "autodetect" de mkinitcpio adapte l'initramfs au matériel de LA MACHINE DE BUILD (WSL2/CI),
# pas à celui de la machine cible qui bootera l'image — vérifié en live : sans ce retrait, l'image
# construite reste bloquée au démarrage sur "A start job is running for /dev/disk/by-uuid/...".
sed -i 's/^HOOKS=.*/HOOKS=(base systemd microcode modconf kms keyboard sd-vconsole block filesystems fsck)/' "\${ROOTFS_DIR}/etc/mkinitcpio.conf"` : ''}`;
    },
    updateCmd: 'pacman -Sy --noconfirm',
    installOneCmd: 'pacman -S --noconfirm --needed "$pkg"',
    diskImageSupported: true,
    diskImageKernelDetectCmd: (kernelType: string) => {
      const kernelPkg = ARCH_KERNEL_PACKAGE[kernelType] || 'linux';
      return `KERNEL_PATH="/boot/vmlinuz-${kernelPkg}"\nINITRD_PATH="/boot/initramfs-${kernelPkg}.img"`;
    },
    grubInstallBin: 'grub-install',
    grubConfigSubdir: 'grub',
    diskImageInitrdRegenCmd: 'mkinitcpio -P',
  },
  fedora: {
    hostDeps: 'dnf dnf-plugins-core rpm',
    hostCheckCmd: 'dnf rpmkeys',
    bootstrapBlock: (distroId, unameArch, isDiskImage, kernelType) => {
      const isRocky = distroId === 'rocky';
      const archNotice = nonNativeArchNotice(unameArch, isRocky ? 'Rocky (dnf --installroot)' : 'Fedora (dnf --installroot)');
      const isFedoraLtsKernel = !isRocky && kernelType === 'lts';
      const kernelFallbackNotice = kernelType && kernelType !== 'generic' && !isFedoraLtsKernel
        ? `Le noyau "${kernelType}" n'a pas de paquet officiel dnf pour ${isRocky ? 'Rocky Linux' : 'Fedora'} : noyau par défaut de la distro utilisé à la place.`
        : null;
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
gpgcheck=0

[epel]
name=Extra Packages for Enterprise Linux 9 - $basearch
baseurl=https://dl.fedoraproject.org/pub/epel/9/Everything/$basearch/
enabled=1
gpgcheck=0

[crb]
name=Rocky Linux 9 - CRB
baseurl=https://download.rockylinux.org/pub/rocky/9/CRB/$basearch/os/
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
      const repoIds = isRocky ? '--repo=baseos --repo=appstream --repo=epel --repo=crb' : '--repo=fedora --repo=updates';
      const releasePkg = isRocky ? 'rocky-release' : 'fedora-release';
      return `${archNotice}mkdir -p "\${WORK_DIR}/yum.repos.d"
cat > "\${WORK_DIR}/yum.repos.d/target.repo" << 'DNF_REPO_EOF'
${repoBlock}
DNF_REPO_EOF
${isFedoraLtsKernel ? `
# Dépôt COPR réel (vérifié en direct : projet actif, chroot fedora-44-x86_64, clé GPG et
# repodata accessibles) fournissant le paquet "kernel-longterm" — Fedora ne maintient aucune
# branche noyau LTS officielle, contrairement à Debian/Ubuntu (XanMod) plus haut dans ce fichier.
cat > "\${WORK_DIR}/yum.repos.d/kernel-longterm.repo" << 'COPR_REPO_EOF'
[copr:copr.fedorainfracloud.org:kwizart:kernel-longterm-6.18]
name=Copr repo for kernel-longterm-6.18 owned by kwizart
baseurl=https://download.copr.fedorainfracloud.org/results/kwizart/kernel-longterm-6.18/fedora-$releasever-$basearch/
type=rpm-md
skip_if_unavailable=True
gpgcheck=1
gpgkey=https://download.copr.fedorainfracloud.org/results/kwizart/kernel-longterm-6.18/pubkey.gpg
repo_gpgcheck=0
enabled=1
enabled_metadata=1
COPR_REPO_EOF` : ''}

DNF_BASE="dnf --installroot=\${ROOTFS_DIR} --releasever=${releasever} --setopt=reposdir=\${WORK_DIR}/yum.repos.d ${repoIds}${isFedoraLtsKernel ? ' --repo=copr:copr.fedorainfracloud.org:kwizart:kernel-longterm-6.18' : ''} --nogpgcheck -y"

# Bug connu rpm/dnf : le scriptlet %sysusers du paquet "setup" appelle /usr/lib/rpm/sysusers.sh,
# fourni par le paquet "rpm" lui-même — s'il n'est pas encore posé sur le disque au moment où le
# scriptlet tourne (ordre de transaction), l'installation de "setup" (qui fournit /etc/passwd)
# échoue silencieusement. Vérifié en live : une 2e passe explicite sur "setup" seule le corrige.
$DNF_BASE install basesystem ${releasePkg} bash coreutils dnf || true
$DNF_BASE install setup
$DNF_BASE install shadow-utils sudo${isDiskImage ? `

# dracut est "hostonly" par défaut sur Fedora/RHEL : sans ceci, l'initramfs généré automatiquement
# par le scriptlet du paquet noyau n'embarque que les modules de LA MACHINE DE BUILD, pas ceux
# nécessaires pour démarrer sur une autre machine/VM cible — vérifié en live (méthode officiellement
# documentée par Fedora/RHEL pour construire des images génériques).
mkdir -p "\${ROOTFS_DIR}/etc/dracut.conf.d"
cat > "\${ROOTFS_DIR}/etc/dracut.conf.d/00-no-hostonly.conf" << 'DRACUT_EOF'
hostonly="no"
DRACUT_EOF
${kernelFallbackNotice ? `
echo -e "\${YELLOW}[INFO] ${kernelFallbackNotice}\${NC}"` : ''}${isFedoraLtsKernel ? `
echo -e "\${CYAN}[INFO] Noyau \\"lts\\" réellement câblé pour Fedora via le dépôt COPR kwizart/kernel-longterm-6.18.\${NC}"
$DNF_BASE install kernel-longterm grub2-pc` : `
$DNF_BASE install kernel grub2-pc`}` : ''}`;
    },
    updateCmd: '',
    installOneCmd: 'dnf install -y "$pkg"',
    diskImageSupported: true,
    diskImageKernelDetectCmd: 'KVER=$(ls "${MNT_DIR}/lib/modules/" | head -1)\nKERNEL_PATH="/boot/vmlinuz-${KVER}"\nINITRD_PATH="/boot/initramfs-${KVER}.img"',
    grubInstallBin: 'grub2-install',
    grubConfigSubdir: 'grub2',
  },
  alpine: {
    hostDeps: '',
    hostCheckCmd: 'curl tar xz',
    bootstrapBlock: (_distroId, unameArch, isDiskImage, kernelType) => `${nonNativeArchNotice(unameArch, 'Alpine (apk-tools-static)')}${isDiskImage && kernelType && kernelType !== 'generic' && kernelType !== 'lts' ? `echo -e "\${YELLOW}[INFO] Le noyau \\"${kernelType}\\" n'a pas de paquet apk dédié pour Alpine : linux-lts (déjà vérifié en live) utilisé à la place.\${NC}"\n` : ''}mkdir -p "\${WORK_DIR}/apk-static"
APK_IDX="\${WORK_DIR}/apk-idx.html"
curl -sL https://dl-cdn.alpinelinux.org/alpine/latest-stable/main/x86_64/ -o "$APK_IDX"
APKVER=$(grep -oP 'apk-tools-static-[0-9][0-9.r-]*\\.apk' "$APK_IDX" | head -1)
curl -sL "https://dl-cdn.alpinelinux.org/alpine/latest-stable/main/x86_64/$APKVER" -o "\${WORK_DIR}/apk-tools-static.apk"
tar -xzf "\${WORK_DIR}/apk-tools-static.apk" -C "\${WORK_DIR}/apk-static"

"\${WORK_DIR}/apk-static/sbin/apk.static" \\
  -X https://dl-cdn.alpinelinux.org/alpine/latest-stable/main \\
  -X https://dl-cdn.alpinelinux.org/alpine/latest-stable/community \\
  -U --allow-untrusted --root "\${ROOTFS_DIR}" --initdb \\
  add alpine-base shadow sudo${isDiskImage ? ' linux-lts grub grub-bios mkinitfs' : ''}

mkdir -p "\${ROOTFS_DIR}/etc/apk"
cat > "\${ROOTFS_DIR}/etc/apk/repositories" << 'APK_REPOS_EOF'
https://dl-cdn.alpinelinux.org/alpine/latest-stable/main
https://dl-cdn.alpinelinux.org/alpine/latest-stable/community
APK_REPOS_EOF${isDiskImage ? `

# Alpine ne démarre aucun getty sur la console série par défaut (seulement tty1-tty6) — même
# limite que Void, vérifiée en live de la même façon.
sed -i 's/^#ttyS0::/ttyS0::/' "\${ROOTFS_DIR}/etc/inittab"` : ''}`,
    updateCmd: 'apk update',
    installOneCmd: 'apk add --no-cache "$pkg"',
    diskImageSupported: true,
    diskImageKernelDetectCmd: 'KERNEL_PATH="/boot/vmlinuz-lts"\nINITRD_PATH="/boot/initramfs-lts"',
    grubInstallBin: 'grub-install',
    grubConfigSubdir: 'grub',
    diskImageRootIsDevicePath: true,
    diskImageExtraKernelArgs: 'modules=sd-mod,ext4',
  },
  suse: {
    hostDeps: 'zypper',
    hostCheckCmd: 'zypper',
    bootstrapBlock: (_distroId, unameArch, isDiskImage, kernelType) => `${nonNativeArchNotice(unameArch, 'openSUSE (zypper)')}${isDiskImage && kernelType && kernelType !== 'generic' ? `echo -e "\${YELLOW}[INFO] Le noyau \\"${kernelType}\\" n'a pas de paquet zypper dédié pour openSUSE : kernel-default utilisé à la place.\${NC}"\n` : ''}mkdir -p "\${ROOTFS_DIR}"
zypper --root "\${ROOTFS_DIR}" --non-interactive addrepo --no-gpgcheck \\
  https://download.opensuse.org/tumbleweed/repo/oss/ repo-oss
zypper --root "\${ROOTFS_DIR}" --non-interactive --gpg-auto-import-keys refresh
zypper --root "\${ROOTFS_DIR}" --non-interactive install --no-recommends -y --allow-unsigned-rpm \\
  patterns-base-minimal_base rpm shadow sudo${isDiskImage ? `

# dracut est "hostonly" par défaut : sans ceci, l'initramfs généré par le scriptlet du paquet
# noyau n'embarque que les pilotes de LA MACHINE DE BUILD (l'hôte Ubuntu du chroot zypper), pas
# ceux nécessaires pour démarrer sur la VM/machine cible réelle — même bug que Fedora/RHEL, même
# correctif (méthode officiellement documentée pour construire des images disque génériques).
# Écrit AVANT l'installation du noyau : le scriptlet %posttrans qui régénère l'initramfs doit
# trouver ce fichier déjà en place.
mkdir -p "\${ROOTFS_DIR}/etc/dracut.conf.d"
cat > "\${ROOTFS_DIR}/etc/dracut.conf.d/00-no-hostonly.conf" << 'DRACUT_EOF'
hostonly="no"
DRACUT_EOF

# "dracut" doit être installé EXPLICITEMENT : contrairement à Fedora/RHEL, kernel-default
# d'openSUSE ne le tire pas comme dépendance — vérifié en live (le scriptlet %posttrans
# affichait littéralement "dracut is not installed, not rebuilding the initrd", laissant
# /boot sans aucun fichier initrd du tout).
zypper --root "\${ROOTFS_DIR}" --non-interactive install --no-recommends -y --allow-unsigned-rpm \\
  kernel-default grub2 grub2-i386-pc dracut` : ''}`,
    updateCmd: '',
    installOneCmd: 'zypper --non-interactive install --no-recommends "$pkg"',
    diskImageSupported: true,
    diskImageKernelDetectCmd: 'KVER=$(ls "${MNT_DIR}/lib/modules/" | head -1)\nKERNEL_PATH="/boot/vmlinuz-${KVER}"\nINITRD_PATH="/boot/initrd-${KVER}"',
    grubInstallBin: 'grub2-install',
    grubConfigSubdir: 'grub2',
    diskImageInitrdRegenCmd: `sh -c 'KVER=$(ls /lib/modules | head -1); dracut --force --no-hostonly "/boot/initrd-$KVER" "$KVER"'`,
  },
  void: {
    hostDeps: '',
    hostCheckCmd: 'curl tar xz',
    bootstrapBlock: (_distroId, unameArch, isDiskImage, kernelType) => `${nonNativeArchNotice(unameArch, 'Void (xbps-static)')}${isDiskImage && kernelType && kernelType !== 'generic' ? `echo -e "\${YELLOW}[INFO] Le noyau \\"${kernelType}\\" n'a pas de paquet xbps dédié pour Void : linux (paquet par défaut) utilisé à la place.\${NC}"\n` : ''}mkdir -p "\${WORK_DIR}/xbps-static" "\${ROOTFS_DIR}/var/db/xbps/keys"
curl -sL https://repo-default.voidlinux.org/static/xbps-static-latest.x86_64-musl.tar.xz -o "\${WORK_DIR}/xbps-static.tar.xz"
tar -xJf "\${WORK_DIR}/xbps-static.tar.xz" -C "\${WORK_DIR}/xbps-static"

set +o pipefail
yes | "\${WORK_DIR}/xbps-static/usr/bin/xbps-install.static" \\
  -S -R https://repo-default.voidlinux.org/current \\
  -r "\${ROOTFS_DIR}" -y base-voidstrap shadow sudo${isDiskImage ? ' grub linux' : ''}
set -o pipefail

mkdir -p "\${ROOTFS_DIR}/etc/xbps.d"
echo 'repository=https://repo-default.voidlinux.org/current' > "\${ROOTFS_DIR}/etc/xbps.d/00-repository-main.conf"${isDiskImage ? `

# Void n'active aucun getty sur la console série par défaut (seulement tty1-tty6) : sans ce lien,
# le système démarre normalement mais n'affiche jamais rien sur ttyS0 — vérifié en live (ce qui
# ressemblait à un blocage au démarrage était en réalité un boot réussi, juste invisible).
ln -sf /etc/sv/agetty-ttyS0 "\${ROOTFS_DIR}/etc/runit/runsvdir/default/agetty-ttyS0"` : ''}`,
    updateCmd: 'xbps-install -Sy',
    installOneCmd: 'xbps-install -Sy "$pkg"',
    diskImageSupported: true,
    diskImageKernelDetectCmd: 'KVER=$(ls "${MNT_DIR}/lib/modules/" | head -1)\nKERNEL_PATH="/boot/vmlinuz-${KVER}"\nINITRD_PATH="/boot/initramfs-${KVER}.img"',
    grubInstallBin: 'grub-install',
    grubConfigSubdir: 'grub',
  },
};

export const DISK_IMAGE_FORMATS: Record<string, { qemuFormat: string; ext: string; label: string }> = {
  qcow2: { qemuFormat: 'qcow2', ext: 'qcow2', label: 'Image Cloud QCOW2' },
  vmdk: { qemuFormat: 'vmdk', ext: 'vmdk', label: 'Disque Virtuel VMware (VMDK)' },
  vdi: { qemuFormat: 'vdi', ext: 'vdi', label: 'Disque Virtuel VirtualBox (VDI)' },
  proxmox_qcow2: { qemuFormat: 'qcow2', ext: 'qcow2', label: 'Template Proxmox VE (QCOW2 + Cloud-Init)' },
  ami_raw: { qemuFormat: 'raw', ext: 'raw', label: 'Image Cloud AWS AMI / OpenStack (RAW Sparse)' },
  raw_img: { qemuFormat: 'raw', ext: 'img', label: 'Image Disque Brute (RAW)' },
};

export function generateNonDebianDiskImageScript(
  recipe: OSRecipe,
  family: NonDebianFamily,
  pkgs: string,
  label: string,
  unameArch: string,
  diskTarget: { qemuFormat: string; ext: string; label: string }
): string {
  const config = NON_DEBIAN_FAMILY_CONFIG[family];
  const sshEnableCmd = !recipe.enableSSH ? '' : family === 'alpine'
    ? 'rc-update add sshd default 2>/dev/null || true'
    : family === 'void'
      ? 'mkdir -p /etc/runit/runsvdir/default && ln -sf /etc/sv/sshd /etc/runit/runsvdir/default/sshd 2>/dev/null || true'
      : 'systemctl enable sshd 2>/dev/null || true';
  const xkb = resolveXkb(recipe.keyboardLayout);
  const dmCmd = dmEnableCmd(recipe.displayManager, family);
  const baseName = recipe.branding.osName.toLowerCase().replace(/[^a-z0-9]/g, '-');
  const rawImageName = `${baseName}-${recipe.branding.version}-${recipe.arch}.raw.img`;
  const diskImageName = `${baseName}-${recipe.branding.version}-${recipe.arch}.${diskTarget.ext}`;
  const needsConversion = diskTarget.ext !== 'raw.img' && diskTarget.qemuFormat !== 'raw';
  const grubBin = config.grubInstallBin!;
  const grubSubdir = config.grubConfigSubdir!;
  const grubSearchLine = config.diskImageRootIsDevicePath ? '' : '    search --no-floppy --fs-uuid --set=root ${ROOT_UUID}\n';
  const rootKernelArg = config.diskImageRootIsDevicePath ? '/dev/sda1' : 'UUID=${ROOT_UUID}';

  const luksPasswordWasGenerated = !recipe.security.luksPassword;
  const luksPasswordResolved = recipe.security.luksPassword || Array.from(
    { length: 24 },
    () => Math.floor(Math.random() * 36).toString(36)
  ).join('');
  const luksPasswordQuoted = shQuote(luksPasswordResolved);
  const luksPasswordWarning = luksPasswordWasGenerated
    ? `echo -e "\${RED:-}[IMPORTANT] Aucun mot de passe LUKS fourni : un mot de passe ALÉATOIRE a été généré pour ce chiffrement -> ${luksPasswordResolved}\${NC:-}"
echo -e "\${RED:-}[IMPORTANT] Notez-le MAINTENANT : sans lui, ce disque sera ILLISIBLE (aucune récupération possible).\${NC:-}"\n`
    : '';

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
echo -e "\${CYAN}   Nom d'hôte         : "${shQuote(recipe.hostname)}"\${NC}"
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
which ${config.hostCheckCmd} parted qemu-img ${recipe.security.luksEncryption ? 'cryptsetup' : ''} >/dev/null 2>&1 || {
    echo -e "\${YELLOW}Installation des outils requis sur l'hôte...\${NC}"
    apt-get update -y && apt-get install -y curl tar xz-utils parted qemu-utils ${config.hostDeps} ${recipe.security.luksEncryption ? 'cryptsetup' : ''}
}

echo -e "\${YELLOW}[2/6] 🏗️ Initialisation du RootFS ${label} (avec noyau + GRUB)...\${NC}"
${config.bootstrapBlock(recipe.distro, unameArch, true, recipe.kernel)}

echo -e "\${YELLOW}[3/6] ⚙️ Configuration du système et installation des paquets...\${NC}"

cp /etc/resolv.conf "\${ROOTFS_DIR}/etc/resolv.conf" 2>/dev/null || true

mount --bind /dev "\${ROOTFS_DIR}/dev"
mount --bind /dev/pts "\${ROOTFS_DIR}/dev/pts" 2>/dev/null || true
mount --bind /proc "\${ROOTFS_DIR}/proc"
mount --bind /sys "\${ROOTFS_DIR}/sys"
${config.diskImageInitrdRegenCmd ? `
chroot "\${ROOTFS_DIR}" ${config.diskImageInitrdRegenCmd}
` : ''}
cat << 'CHROOT_EOF' | chroot "\${ROOTFS_DIR}" /bin/sh
set -e
${config.updateCmd}

for pkg in ${pkgs}; do
    ${config.installOneCmd} || echo "Info: $pkg omis ou non disponible dans le dépôt."
done

echo ${shQuote(recipe.hostname)} > /etc/hostname
cat << 'HOSTS' > /etc/hosts
127.0.0.1   localhost ${recipe.hostname}
::1         localhost ip6-localhost ip6-loopback
HOSTS

${osReleaseCmd(recipe, family === 'suse' ? 'opensuse' : family)}

ln -sf /usr/share/zoneinfo/${recipe.timezone} /etc/localtime 2>/dev/null || true
${localeSetupCmd(recipe, family)}

mkdir -p /etc/X11/xorg.conf.d
cat > /etc/X11/xorg.conf.d/00-keyboard.conf << 'XKB_EOF'
Section "InputClass"
    Identifier "system-keyboard"
    MatchIsKeyboard "on"
    Option "XkbLayout" "${xkb.layout}"${xkb.variant ? `
    Option "XkbVariant" "${xkb.variant}"` : ''}
EndSection
XKB_EOF
echo "KEYMAP=${xkb.layout}" > /etc/vconsole.conf 2>/dev/null || true

if ! id ${shQuote(recipe.user.username)} >/dev/null 2>&1; then
    useradd -m -s ${shQuote(recipe.user.shell)} -c ${shQuote(recipe.user.fullName)} ${shQuote(recipe.user.username)}
    echo ${shQuote(recipe.user.username)}:${shQuote(recipe.user.password || 'forge')} | chpasswd
fi
echo "root:toor" | chpasswd

${recipe.user.sudo ? `mkdir -p /etc/sudoers.d
echo ${shQuote(recipe.user.username)}' ALL=(ALL:ALL) NOPASSWD:ALL' > /etc/sudoers.d/90-osforge-user
chmod 440 /etc/sudoers.d/90-osforge-user` : '# Compte utilisateur sans droits sudo (non demandé dans la recette)'}

${sshEnableCmd}
${userSshSetupCmd(recipe)}
${networkConfigCmd(recipe, family)}
${vpnConfigCmd(recipe, family)}
${communityReposCmd(recipe, family)}
${gamingSysctlCmd(recipe)}
${steamConsoleModeCmd(recipe)}
${powerSavingCmd(recipe, family)}
${sshHardeningCmd(recipe, family)}
${macHardeningCmd(recipe, family)}
${firewallCmd(recipe, family)}
${autoSecurityUpdatesCmd(recipe, family)}
${cisHardeningCmd(recipe, family)}
${zramSetupCmd(recipe, family)}
${flatpakSetupCmd(recipe, family)}
${calamaresInstallerCmd(recipe, family)}
${gpuDriverCmd(recipe, family)}
${dmCmd}
${dmAutologinCmd(recipe, family)}
${kioskSetupCmd(recipe, family)}
${dotfilesCloneCmd(recipe)}
${customServicesCmd(recipe, family)}
${k3sSetupCmd(recipe, family)}
${tailscaleServiceCmd(recipe, family)}
${ollamaSetupCmd(recipe, family)}
${opentofuSetupCmd(recipe, family)}
${k8sCliSetupCmd(recipe, family)}
${zigSetupCmd(recipe, family)}
${vscodiumSetupCmd(recipe, family)}
${uvSetupCmd(recipe, family)}
${heroicSetupCmd(recipe, family)}
${metasploitSetupCmd(recipe, family)}

cat << 'FIRSTBOOT_EOF' > /root/firstboot.sh
#!/bin/sh
${recipe.firstBootScript || '# Aucun script first-boot spécifique'}
FIRSTBOOT_EOF
chmod +x /root/firstboot.sh
${recipe.firstBootScript ? firstbootTriggerCmd(family) : ''}
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
${recipe.security.luksEncryption ? `
# Chiffrement intégral LUKS2 de la partition racine
${luksPasswordWarning}echo -n ${luksPasswordQuoted} | cryptsetup luksFormat --type luks2 --batch-mode -d - "\${LOOPDEV}p1"
echo -n ${luksPasswordQuoted} | cryptsetup open --type luks2 -d - "\${LOOPDEV}p1" cryptroot
mkfs.ext4 -F "/dev/mapper/cryptroot"
mount "/dev/mapper/cryptroot" "\${MNT_DIR}"
` : `mkfs.ext4 -F "\${LOOPDEV}p1"
mount "\${LOOPDEV}p1" "\${MNT_DIR}"`}

echo -e "\${YELLOW}[5/6] 🖲️ Copie du système et installation de GRUB (BIOS)...\${NC}"
cp -a "\${ROOTFS_DIR}"/. "\${MNT_DIR}"/

cp /etc/resolv.conf "\${MNT_DIR}/etc/resolv.conf" 2>/dev/null || true
mount --bind /dev "\${MNT_DIR}/dev"
mount --bind /dev/pts "\${MNT_DIR}/dev/pts" 2>/dev/null || true
mount --bind /proc "\${MNT_DIR}/proc"
mount --bind /sys "\${MNT_DIR}/sys"

ROOT_UUID=$(blkid -s UUID -o value "\${LOOPDEV}p1")

chroot "\${MNT_DIR}" ${grubBin} --target=i386-pc --boot-directory=/boot "\${LOOPDEV}"

${recipe.security.luksEncryption ? `cat > "\${MNT_DIR}/etc/crypttab" << CRYPT_EOF
cryptroot UUID=\${ROOT_UUID} none luks,discard
CRYPT_EOF
cat > "\${MNT_DIR}/etc/fstab" << FSTAB_EOF
/dev/mapper/cryptroot / ext4 defaults 0 1
FSTAB_EOF` : `cat > "\${MNT_DIR}/etc/fstab" << FSTAB_EOF
UUID=\${ROOT_UUID} / ext4 defaults 0 1
FSTAB_EOF`}

${typeof config.diskImageKernelDetectCmd === 'function' ? config.diskImageKernelDetectCmd(recipe.kernel) : config.diskImageKernelDetectCmd}

mkdir -p "\${MNT_DIR}/boot/${grubSubdir}"
cat > "\${MNT_DIR}/boot/${grubSubdir}/grub.cfg" << GRUBCFG_EOF
set timeout=3
set default=0
menuentry "${sanitizeGrubTitle(recipe.branding.osName)}" {
${grubSearchLine}    linux \${KERNEL_PATH} root=${recipe.security.luksEncryption ? '/dev/mapper/cryptroot cryptdevice=UUID=${ROOT_UUID}:cryptroot rd.luks.name=${ROOT_UUID}=cryptroot' : rootKernelArg} rw console=tty0 console=ttyS0,115200${config.diskImageExtraKernelArgs ? ` ${config.diskImageExtraKernelArgs}` : ''}${recipe.kernelCmdline ? ` ${sanitizeKernelCmdline(recipe.kernelCmdline)}` : ''}
    initrd \${INITRD_PATH}
}
GRUBCFG_EOF

umount -lf "\${MNT_DIR}/sys" || true
umount -lf "\${MNT_DIR}/proc" || true
umount -lf "\${MNT_DIR}/dev/pts" || true
umount -lf "\${MNT_DIR}/dev" || true
umount -lf "\${MNT_DIR}" || true
${recipe.security.luksEncryption ? `cryptsetup close cryptroot 2>/dev/null || true` : ''}
losetup -d "\${LOOPDEV}" || true
${diskConversionStep}
${recipe.outputFormat === 'proxmox_qcow2' ? `
cat << 'PROXMOX_DEPLOY_EOF' > "\${OUTPUT_DIR}/deploy-proxmox.sh"
#!/usr/bin/env bash
# OSForge Studio — Script de Déploiement Template Proxmox VE
set -euo pipefail

VMID=\${1:-9000}
VMNAME=\${2:-${recipe.branding.osName.toLowerCase().replace(/[^a-z0-9]/g, '-')}}
STORAGE=\${3:-local-lvm}
IMAGE_PATH="$(cd "$(dirname "$0")" && pwd)/${diskImageName}"

echo "======================================================="
echo "  🚀 Déploiement Template Proxmox VE (ID: \${VMID})"
echo "  Nom     : \${VMNAME}"
echo "  Image   : \${IMAGE_PATH}"
echo "  Storage : \${STORAGE}"
echo "======================================================="

qm create "\${VMID}" --name "\${VMNAME}" --memory 4096 --cores 4 --net0 virtio,bridge=vmbr0
qm importdisk "\${VMID}" "\${IMAGE_PATH}" "\${STORAGE}"
qm set "\${VMID}" --scsihw virtio-scsi-pci --scsi0 "\${STORAGE}:vm-\${VMID}-disk-0"
qm set "\${VMID}" --boot c --bootdisk scsi0
qm set "\${VMID}" --ide2 "\${STORAGE}:cloudinit"
qm set "\${VMID}" --serial0 socket --vga serial0
qm set "\${VMID}" --agent enabled=1
qm template "\${VMID}"

echo "[OK] Template Proxmox VE \${VMID} créé avec succès !"
PROXMOX_DEPLOY_EOF
chmod +x "\${OUTPUT_DIR}/deploy-proxmox.sh"
` : ''}${recipe.outputFormat === 'ami_raw' ? `
cat << 'AWS_UPLOAD_EOF' > "\${OUTPUT_DIR}/upload-aws-ami.sh"
#!/usr/bin/env bash
# OSForge Studio — Script d'Import Snapshot AWS EC2
set -euo pipefail

S3_BUCKET=\${1:-my-os-images-bucket}
IMAGE_PATH="$(cd "$(dirname "$0")" && pwd)/${diskImageName}"

echo "======================================================="
echo "  ☁️ Import Image AWS EC2 Snapshot"
echo "  Image  : \${IMAGE_PATH}"
echo "  Bucket : s3://\${S3_BUCKET}/"
echo "======================================================="

aws s3 cp "\${IMAGE_PATH}" "s3://\${S3_BUCKET}/${diskImageName}"
aws ec2 import-snapshot --description "${recipe.branding.osName} AWS RAW Image" --disk-container "Format=RAW,UserBucket={S3Bucket=\${S3_BUCKET},S3Key=${diskImageName}}"

echo "[OK] Import snapshot AWS initié avec succès !"
AWS_UPLOAD_EOF
chmod +x "\${OUTPUT_DIR}/upload-aws-ami.sh"
` : ''}
echo -e "\${GREEN}=======================================================\${NC}"
echo -e "\${GREEN}   ✅ ${diskTarget.label} générée avec succès : \${OUTPUT_DIR}/${diskImageName}\${NC}"
echo -e "\${GREEN}   Taille du fichier : $(du -h "\${OUTPUT_DIR}/${diskImageName}" 2>/dev/null | cut -f1 || echo "OK")\${NC}"
echo -e "\${GREEN}=======================================================\${NC}"
`;
}

export function generateNonDebianBuildScript(recipe: OSRecipe, family: NonDebianFamily): string {
  const pkgs = shellQuotePkgList(resolvePackageList(recipe));
  const config = NON_DEBIAN_FAMILY_CONFIG[family];
  const sshEnableCmd = !recipe.enableSSH ? '' : family === 'alpine'
    ? 'rc-update add sshd default 2>/dev/null || true'
    : family === 'void'
      ? 'mkdir -p /etc/runit/runsvdir/default && ln -sf /etc/sv/sshd /etc/runit/runsvdir/default/sshd 2>/dev/null || true'
      : 'systemctl enable sshd 2>/dev/null || true';
  const xkb = resolveXkb(recipe.keyboardLayout);
  const dmCmd = dmEnableCmd(recipe.displayManager, family);
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
echo "L'ISO live bootable nécessite une intégration bootloader + initramfs \\"live\\" propre à chaque"
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
echo -e "\${CYAN}   Nom d'hôte         : "${shQuote(recipe.hostname)}"\${NC}"
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
${config.bootstrapBlock(recipe.distro, unameArch, false, recipe.kernel)}

echo -e "\${YELLOW}[3/4] ⚙️ Configuration du système et installation des paquets...\${NC}"

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

echo ${shQuote(recipe.hostname)} > /etc/hostname
cat << 'HOSTS' > /etc/hosts
127.0.0.1   localhost ${recipe.hostname}
::1         localhost ip6-localhost ip6-loopback
HOSTS

${osReleaseCmd(recipe, family === 'suse' ? 'opensuse' : family)}

ln -sf /usr/share/zoneinfo/${recipe.timezone} /etc/localtime 2>/dev/null || true
${localeSetupCmd(recipe, family)}

mkdir -p /etc/X11/xorg.conf.d
cat > /etc/X11/xorg.conf.d/00-keyboard.conf << 'XKB_EOF'
Section "InputClass"
    Identifier "system-keyboard"
    MatchIsKeyboard "on"
    Option "XkbLayout" "${xkb.layout}"${xkb.variant ? `
    Option "XkbVariant" "${xkb.variant}"` : ''}
EndSection
XKB_EOF
echo "KEYMAP=${xkb.layout}" > /etc/vconsole.conf 2>/dev/null || true

if ! id ${shQuote(recipe.user.username)} >/dev/null 2>&1; then
    useradd -m -s ${shQuote(recipe.user.shell)} -c ${shQuote(recipe.user.fullName)} ${shQuote(recipe.user.username)}
    echo ${shQuote(recipe.user.username)}:${shQuote(recipe.user.password || 'forge')} | chpasswd
fi
echo "root:toor" | chpasswd

${recipe.user.sudo ? `mkdir -p /etc/sudoers.d
echo ${shQuote(recipe.user.username)}' ALL=(ALL:ALL) NOPASSWD:ALL' > /etc/sudoers.d/90-osforge-user
chmod 440 /etc/sudoers.d/90-osforge-user` : '# Compte utilisateur sans droits sudo (non demandé dans la recette)'}

${sshEnableCmd}
${userSshSetupCmd(recipe)}
${networkConfigCmd(recipe, family)}
${vpnConfigCmd(recipe, family)}
${communityReposCmd(recipe, family)}
${gamingSysctlCmd(recipe)}
${steamConsoleModeCmd(recipe)}
${powerSavingCmd(recipe, family)}
${sshHardeningCmd(recipe, family)}
${macHardeningCmd(recipe, family)}
${firewallCmd(recipe, family)}
${autoSecurityUpdatesCmd(recipe, family)}
${cisHardeningCmd(recipe, family)}
${zramSetupCmd(recipe, family)}
${flatpakSetupCmd(recipe, family)}
${calamaresInstallerCmd(recipe, family)}
${gpuDriverCmd(recipe, family)}
${dmCmd}
${dmAutologinCmd(recipe, family)}
${kioskSetupCmd(recipe, family)}
${dotfilesCloneCmd(recipe)}
${customServicesCmd(recipe, family)}
${k3sSetupCmd(recipe, family)}
${tailscaleServiceCmd(recipe, family)}
${ollamaSetupCmd(recipe, family)}
${opentofuSetupCmd(recipe, family)}
${k8sCliSetupCmd(recipe, family)}
${zigSetupCmd(recipe, family)}
${vscodiumSetupCmd(recipe, family)}
${uvSetupCmd(recipe, family)}
${heroicSetupCmd(recipe, family)}
${metasploitSetupCmd(recipe, family)}

cat << 'FIRSTBOOT_EOF' > /root/firstboot.sh
#!/bin/sh
${recipe.firstBootScript || '# Aucun script first-boot spécifique'}
FIRSTBOOT_EOF
chmod +x /root/firstboot.sh
${recipe.firstBootScript ? firstbootTriggerCmd(family) : ''}
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
