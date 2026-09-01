import { OSRecipe } from '../../types/os';
import { resolvePackageList } from './packages';
import {
  shQuote,
  shellQuotePkgList,
  sanitizeKernelCmdline,
  dmEnableCmd,
  localeSetupCmd,
  osReleaseCmd,
  userSshSetupCmd,
  networkConfigCmd,
  vpnConfigCmd,
  communityReposCmd,
  gamingSysctlCmd,
  powerSavingCmd,
  sshHardeningCmd,
  macHardeningCmd,
  firewallCmd,
  autoSecurityUpdatesCmd,
  cisHardeningCmd,
  zramSetupCmd,
  flatpakSetupCmd,
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

export function generateRpiSdScript(recipe: OSRecipe): string {
  const pkgs = shellQuotePkgList(resolvePackageList(recipe));
  const imgName = `${recipe.branding.osName.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${recipe.branding.version}-${recipe.arch}.img`;
  const dmCmd = dmEnableCmd(recipe.displayManager, 'debian');

  return `#!/usr/bin/env bash
# ==============================================================================
# OSForge Studio — Carte SD Raspberry Pi (image .img.xz prête à flasher)
# OS: ${recipe.branding.osName} (${recipe.branding.editionName})
# Base: Raspberry Pi OS (Debian bookworm, arm64) | Format: rpi_sd
# Date de génération: ${new Date().toISOString()}
# ==============================================================================

set -euo pipefail

RED='\\033[0;31m'
GREEN='\\033[0;32m'
CYAN='\\033[0;36m'
YELLOW='\\033[1;33m'
NC='\\033[0m'

echo -e "\${CYAN}=======================================================\${NC}"
echo -e "\${CYAN}   🍓 OSForge Studio : Image Carte SD Raspberry Pi    \${NC}"
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

echo -e "\${YELLOW}[1/6] 📦 Installation des dépendances de compilation de l'hôte...\${NC}"
which debootstrap qemu-img parted mkfs.vfat qemu-aarch64-static xz >/dev/null 2>&1 || {
    echo -e "\${YELLOW}Installation des outils requis sur l'hôte (bootstrap + émulation ARM64)...\${NC}"
    apt-get update -y && apt-get install -y debootstrap qemu-user-static binfmt-support parted dosfstools qemu-utils xz-utils
}

echo -e "\${YELLOW}[2/6] 🏗️ Bootstrap ARM64 du système Debian de base ("${shQuote(recipe.hostname)}" / bookworm)...\${NC}"
debootstrap --arch=arm64 --foreign bookworm "\${ROOTFS_DIR}" http://deb.debian.org/debian
cp /usr/bin/qemu-aarch64-static "\${ROOTFS_DIR}/usr/bin/"
chroot "\${ROOTFS_DIR}" /debootstrap/debootstrap --second-stage

echo -e "\${YELLOW}[3/6] ⚙️ Ajout du dépôt Raspberry Pi, installation du noyau et configuration...\${NC}"
mkdir -p "\${ROOTFS_DIR}/etc/apt/keyrings"
curl -fsSL https://archive.raspberrypi.com/debian/raspberrypi.gpg.key -o "\${ROOTFS_DIR}/etc/apt/keyrings/raspberrypi.gpg.key"

mount --bind /dev "\${ROOTFS_DIR}/dev"
mount --bind /dev/pts "\${ROOTFS_DIR}/dev/pts" 2>/dev/null || true
mount --bind /proc "\${ROOTFS_DIR}/proc"
mount --bind /sys "\${ROOTFS_DIR}/sys"
cp /etc/resolv.conf "\${ROOTFS_DIR}/etc/resolv.conf" 2>/dev/null || true

cat << 'CHROOT_EOF' | chroot "\${ROOTFS_DIR}" /bin/bash
set -e
export DEBIAN_FRONTEND=noninteractive

echo "deb http://deb.debian.org/debian bookworm main" > /etc/apt/sources.list
echo "deb [signed-by=/etc/apt/keyrings/raspberrypi.gpg.key] http://archive.raspberrypi.com/debian bookworm main" >> /etc/apt/sources.list

apt-get update -y
apt-get install -y --no-install-recommends raspberrypi-kernel raspi-firmware systemd-sysv ca-certificates locales sudo curl wget gnupg iproute2 openssh-server

for pkg in ${pkgs}; do
    apt-get install -y --no-install-recommends "$pkg" || echo "Info: $pkg omis ou non disponible dans le dépôt."
done

echo ${shQuote(recipe.hostname)} > /etc/hostname
cat << 'HOSTS' > /etc/hosts
127.0.0.1   localhost ${recipe.hostname}
::1         localhost ip6-localhost ip6-loopback
HOSTS

${osReleaseCmd(recipe, 'debian')}

ln -sf /usr/share/zoneinfo/${recipe.timezone} /etc/localtime
${localeSetupCmd(recipe, 'debian')}

if ! id ${shQuote(recipe.user.username)} &>/dev/null; then
    useradd -m -s ${shQuote(recipe.user.shell)} -c ${shQuote(recipe.user.fullName)} ${shQuote(recipe.user.username)}
    echo ${shQuote(recipe.user.username)}:${shQuote(recipe.user.password || 'forge')} | chpasswd
    ${recipe.user.sudo ? `usermod -aG sudo ${shQuote(recipe.user.username)}` : ''}
fi
echo "root:toor" | chpasswd

${recipe.enableSSH ? 'systemctl enable ssh || true' : ''}
${userSshSetupCmd(recipe)}
${networkConfigCmd(recipe, 'debian')}
${vpnConfigCmd(recipe, 'debian')}
${communityReposCmd(recipe, 'debian')}
${gamingSysctlCmd(recipe)}
${powerSavingCmd(recipe, 'debian')}
${sshHardeningCmd(recipe, 'debian')}
${macHardeningCmd(recipe, 'debian')}
${autoSecurityUpdatesCmd(recipe, 'debian')}
${cisHardeningCmd(recipe, 'debian')}
${zramSetupCmd(recipe, 'debian')}
${flatpakSetupCmd(recipe, 'debian')}

${dmCmd}
${dmAutologinCmd(recipe, 'debian')}
${kioskSetupCmd(recipe, 'debian')}
${dotfilesCloneCmd(recipe)}
${customServicesCmd(recipe, 'debian')}
${k3sSetupCmd(recipe, 'debian')}
${tailscaleServiceCmd(recipe, 'debian')}
${ollamaSetupCmd(recipe, 'debian')}
${opentofuSetupCmd(recipe, 'debian')}
${k8sCliSetupCmd(recipe, 'debian')}
${zigSetupCmd(recipe, 'debian')}
${vscodiumSetupCmd(recipe, 'debian')}
${uvSetupCmd(recipe, 'debian')}
${heroicSetupCmd(recipe, 'debian')}
${metasploitSetupCmd(recipe, 'debian')}
${firewallCmd(recipe, 'debian')}

cat << 'FIRSTBOOT_EOF' > /root/firstboot.sh
#!/usr/bin/env bash
${recipe.firstBootScript || '# Aucun script first-boot spécifique'}
FIRSTBOOT_EOF
chmod +x /root/firstboot.sh
${recipe.firstBootScript ? firstbootTriggerCmd('debian') : ''}
CHROOT_EOF

umount -lf "\${ROOTFS_DIR}/sys" || true
umount -lf "\${ROOTFS_DIR}/proc" || true
umount -lf "\${ROOTFS_DIR}/dev/pts" || true
umount -lf "\${ROOTFS_DIR}/dev" || true

echo -e "\${YELLOW}[4/6] 💽 Partitionnement de l'image (FAT32 boot + ext4 root)...\${NC}"
RAW_IMG="\${OUTPUT_DIR}/${imgName}"
qemu-img create -f raw "\${RAW_IMG}" 4G
parted -s "\${RAW_IMG}" mklabel msdos
parted -s "\${RAW_IMG}" mkpart primary fat32 1MiB 257MiB
parted -s "\${RAW_IMG}" set 1 boot on
parted -s "\${RAW_IMG}" mkpart primary ext4 257MiB 100%

LOOPDEV=$(losetup -f)
losetup -P "\${LOOPDEV}" "\${RAW_IMG}"
mkfs.vfat -F 32 -n bootfs "\${LOOPDEV}p1"
mkfs.ext4 -F -L rootfs "\${LOOPDEV}p2"

mount "\${LOOPDEV}p2" "\${MNT_DIR}"
mkdir -p "\${MNT_DIR}/boot/firmware"
mount "\${LOOPDEV}p1" "\${MNT_DIR}/boot/firmware"

echo -e "\${YELLOW}[5/6] 🖲️ Copie du système de fichiers vers la carte SD...\${NC}"
cp -a "\${ROOTFS_DIR}"/. "\${MNT_DIR}"/

BOOT_UUID=$(blkid -s UUID -o value "\${LOOPDEV}p1")
ROOT_UUID=$(blkid -s UUID -o value "\${LOOPDEV}p2")

cat > "\${MNT_DIR}/etc/fstab" << FSTAB_EOF
UUID=\${ROOT_UUID} / ext4 defaults,noatime 0 1
UUID=\${BOOT_UUID} /boot/firmware vfat defaults 0 2
FSTAB_EOF

cat > "\${MNT_DIR}/boot/firmware/cmdline.txt" << CMDLINE_EOF
console=serial0,115200 console=tty1 root=UUID=\${ROOT_UUID} rootfstype=ext4 fsck.repair=yes rootwait${recipe.kernelCmdline ? ` ${sanitizeKernelCmdline(recipe.kernelCmdline)}` : ''}
CMDLINE_EOF

umount -lf "\${MNT_DIR}/boot/firmware" || true
umount -lf "\${MNT_DIR}" || true
losetup -d "\${LOOPDEV}" || true

echo -e "\${YELLOW}[6/6] 🗜️ Compression XZ de l'image (.img.xz, prête à flasher)...\${NC}"
xz -T0 -f "\${RAW_IMG}"

echo -e "\${GREEN}=======================================================\${NC}"
echo -e "\${GREEN}   ✅ Image Carte SD Raspberry Pi générée : \${OUTPUT_DIR}/${imgName}.xz\${NC}"
echo -e "\${GREEN}   Taille du fichier : $(du -h "\${OUTPUT_DIR}/${imgName}.xz" 2>/dev/null | cut -f1 || echo "OK")\${NC}"
echo -e "\${GREEN}   Flashage : Raspberry Pi Imager ou Balena Etcher (image .xz supportée nativement)\${NC}"
echo -e "\${GREEN}=======================================================\${NC}"
`;
}
