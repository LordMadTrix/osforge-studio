import { OSRecipe } from '../../types/os';
import { DEBOOTSTRAP_TARGETS, resolveDebianTarget } from './types';
import { resolvePackageList } from './packages';
import { DISK_IMAGE_FORMATS } from './nonDebian';
import {
  shQuote,
  shellQuotePkgList,
  sanitizeGrubTitle,
  sanitizeKernelCmdline,
  resolveXkb,
  dmEnableCmd,
  localeSetupCmd,
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
import { generateBrandingChrootCommands } from './branding';

export function generateDebianBuildScript(recipe: OSRecipe): string {
  const pkgs = shellQuotePkgList(resolvePackageList(recipe));
  const isoName = `${recipe.branding.osName.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${recipe.branding.version}-${recipe.arch}.iso`;
  const debArch = recipe.arch === 'x86_64' ? 'amd64' : recipe.arch === 'aarch64' ? 'arm64' : recipe.arch === 'i686' ? 'i386' : recipe.arch;
  const needsCrossArchEmulation = debArch !== 'amd64' && recipe.arch !== 'i686';
  const qemuStaticBinary = recipe.arch === 'aarch64' ? 'qemu-aarch64-static' : recipe.arch === 'riscv64' ? 'qemu-riscv64-static' : null;
  const target = resolveDebianTarget(recipe.distro, recipe.distroSuite) || DEBOOTSTRAP_TARGETS[recipe.distro] || DEBOOTSTRAP_TARGETS.debian;
  const xkb = resolveXkb(recipe.keyboardLayout);
  const dmCmd = dmEnableCmd(recipe.displayManager, 'debian');

  const kernelPkg = recipe.distro === 'raspbian' && recipe.arch === 'aarch64' ? 'raspberrypi-kernel'
    : recipe.distro === 'ubuntu' || recipe.distro === 'linuxmint' ? 'linux-image-generic'
    : `linux-image-${debArch}`;

  const isUbuntuFamily = recipe.distro === 'ubuntu' || recipe.distro === 'linuxmint';
  const isXanmodEligible = (recipe.distro === 'debian' || isUbuntuFamily) && recipe.arch === 'x86_64';
  const isDebianLiquorixEligible = recipe.distro === 'debian' && recipe.arch === 'x86_64';
  const REAL_ALT_KERNEL =
    (isUbuntuFamily && (['mainline_beta', 'liquorix', 'cloud_micro'] as string[]).includes(recipe.kernel)) ||
    (isXanmodEligible && (['xanmod', 'lts', 'realtime'] as string[]).includes(recipe.kernel)) ||
    (isDebianLiquorixEligible && recipe.kernel === 'liquorix')
      ? recipe.kernel
      : null;

  const isTarFormat = recipe.outputFormat === 'wsl2_tar' || recipe.outputFormat === 'docker_rootfs';
  const rootfsTarName = `${recipe.branding.osName.toLowerCase().replace(/[^a-z0-9]/g, '-')}-rootfs.tar.gz`;

  const diskTarget = DISK_IMAGE_FORMATS[recipe.outputFormat];
  const diskImageName = diskTarget ? `${recipe.branding.osName.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${recipe.branding.version}-${recipe.arch}.${diskTarget.ext}` : '';

  const UNIMPLEMENTED_FORMATS: Record<string, string> = {
    rpi_sd: "Carte SD Raspberry Pi (disponible uniquement pour Raspberry Pi OS en ARM64)",
  };
  const formatWarning = UNIMPLEMENTED_FORMATS[recipe.outputFormat]
    ? `echo -e "\${YELLOW}[INFO] Le format '${UNIMPLEMENTED_FORMATS[recipe.outputFormat]}' n'est pas disponible pour cette combinaison distro/architecture : génération d'une image ISO à la place.\${NC}"\n\n`
    : '';

  const diskConversionStep = diskTarget ? `
which qemu-img >/dev/null 2>&1 || {
    echo -e "\${YELLOW}Installation de qemu-utils (conversion ${diskTarget.label})...\${NC}"
    apt-get update -y && apt-get install -y qemu-utils
}

echo -e "\${YELLOW}[8/8] 💽 Conversion vers ${diskTarget.label}...\${NC}"
qemu-img convert -O ${diskTarget.qemuFormat}${diskTarget.qemuFormat === 'qcow2' ? ' -o compat=1.1' : ''} "\${OUTPUT_DIR}/${isoName}" "\${OUTPUT_DIR}/${diskImageName}"
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
VMLINUZ_SRC=$(readlink -f "\${ROOTFS_DIR}/boot/vmlinuz" 2>/dev/null || true)
[ -n "$VMLINUZ_SRC" ] && [ -f "$VMLINUZ_SRC" ] || VMLINUZ_SRC=$(find "\${ROOTFS_DIR}/boot" -maxdepth 1 -type f \\( -name 'vmlinuz-*' -o -name 'vmlinux-*' -o -name 'kernel*.img' \\) ! -name '*.old' 2>/dev/null | sort | head -1)
[ -n "$VMLINUZ_SRC" ] && cp "$VMLINUZ_SRC" "\${ISO_DIR}/live/vmlinuz"

INITRD_SRC=$(readlink -f "\${ROOTFS_DIR}/boot/initrd.img" 2>/dev/null || true)
[ -n "$INITRD_SRC" ] && [ -f "$INITRD_SRC" ] || INITRD_SRC=$(find "\${ROOTFS_DIR}/boot" -maxdepth 1 -type f \\( -name 'initrd.img-*' -o -name 'initramfs-*' \\) ! -name '*.old' 2>/dev/null | sort | head -1)
[ -n "$INITRD_SRC" ] && cp "$INITRD_SRC" "\${ISO_DIR}/live/initrd"

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

menuentry "${sanitizeGrubTitle(recipe.branding.osName)} (${sanitizeGrubTitle(recipe.branding.editionName)}) [Live Desktop]" {
    linux /live/vmlinuz boot=live components loop.max_loop=8 max_loop=8 quiet splash hostname=${recipe.hostname}${recipe.kernelCmdline ? ` ${sanitizeKernelCmdline(recipe.kernelCmdline)}` : ''}
    initrd /live/initrd
}

menuentry "${sanitizeGrubTitle(recipe.branding.osName)} (Mode Secours / Failsafe)" {
    linux /live/vmlinuz boot=live components loop.max_loop=8 max_loop=8 nomodeset
    initrd /live/initrd
}
${recipe.enableLiveRescue ? `
menuentry "${sanitizeGrubTitle(recipe.branding.osName)} (Mode Live Rescue & RAM Boot / toram)" {
    linux /live/vmlinuz boot=live components toram loop.max_loop=8 max_loop=8 quiet splash hostname=${recipe.hostname}
    initrd /live/initrd
}
` : ''}
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
  -volid ${shQuote(recipe.branding.osName.toUpperCase().slice(0, 32))} \\
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
echo -e "\${CYAN}   Nom d'hôte         : "${shQuote(recipe.hostname)}"\${NC}"
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
which debootstrap xorriso mtools grub-mkrescue squashfs-tools${needsCrossArchEmulation ? ` ${qemuStaticBinary}` : ''} >/dev/null 2>&1 || {
    echo -e "\${YELLOW}Installation des outils requis sur l'hôte${needsCrossArchEmulation ? ' (bootstrap + émulation ' + recipe.arch + ')' : ''}...\${NC}"
    apt-get update -y && apt-get install -y debootstrap xorriso mtools grub-pc-bin grub-efi-amd64-bin grub-common squashfs-tools dosfstools rsync${needsCrossArchEmulation ? ' qemu-user-static binfmt-support' : ''}
}

echo -e "\${YELLOW}[2/7] 🏗️ Initialisation du RootFS de base (${recipe.distro} / ${target.suite})...\${NC}"
${recipe.kernel && recipe.kernel !== 'generic' && !REAL_ALT_KERNEL ? `echo -e "\${YELLOW}[INFO] Le noyau \\"${recipe.kernel}\\" n'est pas encore câblé pour ${recipe.distro} (APT) : ${kernelPkg} (noyau par défaut de la distro) utilisé à la place. Zen/Hardened/LTS/RT sont réellement pris en charge pour Arch/CachyOS ; Mainline/Cloud-Micro pour Ubuntu/Mint ; Liquorix pour Debian et Ubuntu/Mint en x86_64 ; XanMod (Standard/LTS/RT) pour Debian et Ubuntu/Mint en x86_64.\${NC}"
` : ''}${REAL_ALT_KERNEL ? `echo -e "\${CYAN}[INFO] Noyau \\"${recipe.kernel}\\" réellement câblé : installation après le bootstrap de base (voir étape 3).\${NC}"
` : ''}${needsCrossArchEmulation ? `echo -e "\${CYAN}[INFO] Architecture \\"${recipe.arch}\\" différente de l'hôte : bootstrap en deux étapes avec émulation ${qemuStaticBinary} (comme pour la carte SD Raspberry Pi).\${NC}"
` : ''}${needsCrossArchEmulation && !isTarFormat ? `echo -e "\${RED}[AVERTISSEMENT] Le RootFS \\"${recipe.arch}\\" sera correctement construit, MAIS la chaîne d'amorçage de ce générateur (GRUB BIOS i386-pc + UEFI x86_64-efi, El Torito) est câblée exclusivement pour x86_64 : l'ISO produite ne démarrera PAS sur du matériel ${recipe.arch}. Choisissez le format \\"Distribution Windows WSL2\\" ou \\"Conteneur Docker RootFS\\" pour obtenir un RootFS ${recipe.arch} réellement utilisable dès maintenant.\${NC}"
` : ''}debootstrap --arch="${debArch}"${needsCrossArchEmulation ? ' --foreign' : ''} \\${target.components ? `
  --components="${target.components}" \\` : ''}
  --include="${recipe.distro === 'raspbian' || REAL_ALT_KERNEL ? '' : `${kernelPkg},`}live-boot,systemd-sysv,initramfs-tools,ca-certificates,locales,sudo,curl,wget,gnupg,iproute2" \\
  ${target.suite} "\${ROOTFS_DIR}" "${target.mirror}"
${needsCrossArchEmulation ? `cp /usr/bin/${qemuStaticBinary} "\${ROOTFS_DIR}/usr/bin/"
chroot "\${ROOTFS_DIR}" /debootstrap/debootstrap --second-stage
` : ''}
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
${(recipe.distro === 'ubuntu' || recipe.distro === 'linuxmint') && (recipe.selectedPackages.includes('firefox') || recipe.desktop === 'web_kiosk') ? `
# Sur Ubuntu (et Mint, qui hérite ici du même dépôt de base), "firefox" en apt n'est qu'un
# paquet de transition vers snap (vérifié en live : l'installation "réussit" silencieusement
# mais ne pose qu'un stub non fonctionnel, snapd n'étant pas actif dans un chroot). On ajoute
# le vrai dépôt APT officiel de Mozilla à la place.
mkdir -p /etc/apt/keyrings
curl -fsSL https://packages.mozilla.org/apt/repo-signing-key.gpg -o /etc/apt/keyrings/packages.mozilla.org.asc || true
echo "deb [signed-by=/etc/apt/keyrings/packages.mozilla.org.asc] https://packages.mozilla.org/apt mozilla main" > /etc/apt/sources.list.d/mozilla.list
cat > /etc/apt/preferences.d/mozilla << 'MOZPIN_EOF'
Package: *
Pin: origin packages.mozilla.org
Pin-Priority: 1000
MOZPIN_EOF
` : ''}
${recipe.distro === 'raspbian' ? `
# archive.raspberrypi.com n'est qu'un dépôt d'ajout signé au-dessus du vrai Debian ci-dessus :
# sa clé GPG doit être présente AVANT "apt-get update" pour que la ligne "signed-by" du
# sources.list soit valide (vérifié en live : sans ceci, apt-get update échoue avec NO_PUBKEY).
mkdir -p /etc/apt/keyrings
curl -fsSL https://archive.raspberrypi.com/debian/raspberrypi.gpg.key -o /etc/apt/keyrings/raspberrypi.gpg.key
` : ''}
${debArch === 'amd64' ? `# Activation du multi-architecture 32-bit (requis pour Steam, Wine et runtimes de jeux)
dpkg --add-architecture i386 2>/dev/null || true
` : ''}# Mise à jour des index de paquets
apt-get update -y

${recipe.distro === 'raspbian' && recipe.arch === 'aarch64' ? `# Noyau et firmware Raspberry Pi (absents du miroir Debian utilisé pour le bootstrap initial)
apt-get install -y --no-install-recommends raspberrypi-kernel raspi-firmware

` : recipe.distro === 'raspbian' ? `# Raspberry Pi OS en ${recipe.arch} : "raspberrypi-kernel" n'existe que pour arm64/armhf (voir le
# commentaire sur kernelPkg plus haut) — noyau Debian standard "${kernelPkg}" installé à la place.
# "raspi-firmware" (Architecture: all) reste installé pour la cohérence de configuration.
apt-get install -y --no-install-recommends ${kernelPkg} raspi-firmware

` : ''}${REAL_ALT_KERNEL === 'mainline_beta' ? `# Noyau mainline le plus récent — vérifié en direct sur kernel.ubuntu.com/mainline (vrais .deb
# officiels Canonical, publiés pour chaque version taguée y compris fraîchement sortie).
echo -e "\${YELLOW}[INFO] Recherche du dernier noyau mainline officiel (kernel.ubuntu.com/mainline)...\${NC}"
apt-get install -y --no-install-recommends curl ca-certificates
MAINLINE_VER=$(curl -fsSL https://kernel.ubuntu.com/mainline/ | grep -oP 'href="v\\K[0-9]+\\.[0-9]+(\\.[0-9]+)?(?=/")' | grep -v -i rc | sort -V | tail -1)
if [ -n "$MAINLINE_VER" ]; then
    echo -e "\${GREEN}[INFO] Noyau mainline officiel détecté : v\${MAINLINE_VER}\${NC}"
    MAINLINE_BASE="https://kernel.ubuntu.com/mainline/v\${MAINLINE_VER}/amd64"
    mkdir -p /tmp/mainline-kernel && cd /tmp/mainline-kernel
    curl -fsSL "\${MAINLINE_BASE}/" -o index.html
    for f in $(grep -oP 'href="\\K[^"]+\\.deb' index.html | grep -E '^linux-(headers|image-unsigned|modules)-[0-9]+\\.[0-9]+\\.[0-9]+-[0-9]+-generic_[^"]*_amd64\\.deb$|^linux-headers-[0-9]+\\.[0-9]+\\.[0-9]+-[0-9]+_[^"]*_all\\.deb$'); do
        curl -fsSL "\${MAINLINE_BASE}/\${f}" -o "$f"
    done
    dpkg -i *.deb || apt-get install -f -y --no-install-recommends
    cd / && rm -rf /tmp/mainline-kernel
else
    echo -e "\${RED}[AVERTISSEMENT] Impossible de déterminer le dernier noyau mainline en direct ; installation du noyau Ubuntu standard à la place.\${NC}"
    apt-get install -y --no-install-recommends linux-image-generic
fi

` : ''}${REAL_ALT_KERNEL === 'liquorix' && recipe.distro !== 'debian' ? `# Noyau Liquorix — dépôt PPA officiel (ppa:damentz/liquorix), méthode exacte du vrai script
# d'installation servi par liquorix.net/install-liquorix.sh (branche Ubuntu, vérifiée en direct).
echo -e "\${YELLOW}[INFO] Ajout du dépôt PPA officiel Liquorix (damentz/liquorix)...\${NC}"
apt-get install -y --no-install-recommends gpg gpg-agent software-properties-common
add-apt-repository -y ppa:damentz/liquorix
apt-get update -y
apt-get install -y --no-install-recommends linux-image-liquorix-amd64 linux-headers-liquorix-amd64

` : ''}${REAL_ALT_KERNEL === 'liquorix' && recipe.distro === 'debian' ? `# Noyau Liquorix pour Debian — PAS de PPA (mécanisme propre à Launchpad/Ubuntu, absent sur
# Debian) : dépôt APT direct signé par clé, méthode exacte de la branche *debian* du vrai script
# d'installation servi par liquorix.net/install-liquorix.sh (vérifiée en direct : dépôt réel
# https://liquorix.net/debian, clé réelle liquorix-keyring.gpg, suite "${target.suite}" confirmée
# publiée avec les deux paquets linux-image/linux-headers-liquorix-amd64 réels — pas de build
# arm64 chez Liquorix, cohérent avec la portée x86_64 déjà appliquée à XanMod ci-dessous).
echo -e "\${YELLOW}[INFO] Ajout du dépôt APT officiel Liquorix (liquorix.net/debian)...\${NC}"
apt-get install -y --no-install-recommends curl gpg ca-certificates
mkdir -p /etc/apt/keyrings
curl -fsSL https://liquorix.net/liquorix-keyring.gpg | gpg --batch --yes --output /etc/apt/keyrings/liquorix-keyring.gpg --dearmor
echo "deb [arch=amd64 signed-by=/etc/apt/keyrings/liquorix-keyring.gpg] https://liquorix.net/debian ${target.suite} main" > /etc/apt/sources.list.d/liquorix.list
apt-get update -y
apt-get install -y --no-install-recommends linux-image-liquorix-amd64 linux-headers-liquorix-amd64

` : ''}${REAL_ALT_KERNEL === 'cloud_micro' ? `# Noyau officiel Ubuntu optimisé invité cloud/KVM (vrai paquet, dépôt Ubuntu standard).
echo -e "\${YELLOW}[INFO] Installation du noyau officiel Ubuntu invité cloud/KVM (linux-image-kvm)...\${NC}"
apt-get install -y --no-install-recommends linux-image-kvm

` : ''}${(REAL_ALT_KERNEL === 'xanmod' || REAL_ALT_KERNEL === 'lts' || REAL_ALT_KERNEL === 'realtime') ? `# Noyau XanMod — vrai dépôt APT officiel (deb.xanmod.org), vérifié en direct sur xanmod.org.
# Branches Standard (x64v3), LTS (x64v1) et RT (x64v2) distinctes et réellement maintenues par le projet,
# codenames Debian/Ubuntu de ce pipeline (${target.suite}) confirmés pris en charge.
echo -e "\${YELLOW}[INFO] Ajout du dépôt APT officiel XanMod (deb.xanmod.org)...\${NC}"
apt-get install -y --no-install-recommends curl gnupg
mkdir -p /etc/apt/keyrings
if curl -fsSL https://dl.xanmod.org/archive.key | gpg --dearmor -o /etc/apt/keyrings/xanmod-archive-keyring.gpg; then
    echo "deb [signed-by=/etc/apt/keyrings/xanmod-archive-keyring.gpg] http://deb.xanmod.org ${target.suite} main" > /etc/apt/sources.list.d/xanmod-release.list
    apt-get update -y
    if ! apt-get install -y --no-install-recommends ${REAL_ALT_KERNEL === 'xanmod' ? 'linux-xanmod-x64v3' : REAL_ALT_KERNEL === 'lts' ? 'linux-xanmod-lts-x64v1' : 'linux-xanmod-rt-x64v2'}; then
        echo -e "\${RED}[AVERTISSEMENT] Le paquet noyau XanMod n'a pas pu être installé : noyau ${kernelPkg} par défaut installé à la place.\${NC}"
        apt-get install -y --no-install-recommends ${kernelPkg}
    fi
else
    echo -e "\${RED}[AVERTISSEMENT] Dépôt XanMod injoignable (bloqué par le réseau/pare-feu ?) : noyau ${kernelPkg} par défaut installé à la place.\${NC}"
    apt-get install -y --no-install-recommends ${kernelPkg}
fi

` : ''}# Installation sécurisée et résiliente des logiciels sélectionnés
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
echo ${shQuote(recipe.hostname)} > /etc/hostname
cat << 'HOSTS' > /etc/hosts
127.0.0.1   localhost ${recipe.hostname}
::1         localhost ip6-localhost ip6-loopback
HOSTS

${generateBrandingChrootCommands(recipe)}

# Configuration de la locale et du fuseau horaire
ln -sf /usr/share/zoneinfo/${recipe.timezone} /etc/localtime
${localeSetupCmd(recipe, 'debian')}

# Configuration clavier
cat > /etc/default/keyboard << 'KBD_EOF'
XKBMODEL="pc105"
XKBLAYOUT="${xkb.layout}"
XKBVARIANT="${xkb.variant || ''}"
XKBOPTIONS=""
KBD_EOF

# Création de l'utilisateur principal
if ! id ${shQuote(recipe.user.username)} &>/dev/null; then
    useradd -m -s ${shQuote(recipe.user.shell)} -c ${shQuote(recipe.user.fullName)} ${shQuote(recipe.user.username)}
    echo ${shQuote(recipe.user.username)}:${shQuote(recipe.user.password || 'forge')} | chpasswd
    ${recipe.user.sudo ? `usermod -aG sudo ${shQuote(recipe.user.username)}` : ''}
fi

# Mot de passe Root
echo "root:toor" | chpasswd

# Configuration SSH & Clés d'accès
${recipe.enableSSH ? `
systemctl enable ssh 2>/dev/null || true
` : ''}
${userSshSetupCmd(recipe)}
${networkConfigCmd(recipe, 'debian')}
${vpnConfigCmd(recipe, 'debian')}
${communityReposCmd(recipe, 'debian')}
${gamingSysctlCmd(recipe)}
${steamConsoleModeCmd(recipe)}
${powerSavingCmd(recipe, 'debian')}
${sshHardeningCmd(recipe, 'debian')}
${macHardeningCmd(recipe, 'debian')}
${autoSecurityUpdatesCmd(recipe, 'debian')}
${cisHardeningCmd(recipe, 'debian')}
${zramSetupCmd(recipe, 'debian')}
${flatpakSetupCmd(recipe, 'debian')}
${calamaresInstallerCmd(recipe, 'debian')}
${gpuDriverCmd(recipe, 'debian')}

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

# Sécurité & Durcissement (CIS Benchmark / UFW / nftables)
${firewallCmd(recipe, 'debian')}

# Configuration robuste de l'initramfs pour le boot Live (SquashFS & Loop devices)
mkdir -p /etc/initramfs-tools/scripts/init-premount
cat >> /etc/initramfs-tools/modules << 'INITRAMFS_MODULES_EOF'
loop
overlay
squashfs
iso9660
isofs
vfat
INITRAMFS_MODULES_EOF

cat << 'LOOP_HOOK_EOF' > /etc/initramfs-tools/scripts/init-premount/00_loop_devices
#!/bin/sh
PREREQ=""
prereqs() { echo "$PREREQ"; }
case $1 in
prereqs) prereqs; exit 0;;
esac

modprobe loop 2>/dev/null || true
if [ ! -e /dev/loop-control ]; then
    mknod /dev/loop-control c 10 237 2>/dev/null || true
fi
for i in 0 1 2 3 4 5 6 7; do
    if [ ! -e /dev/loop$i ]; then
        mknod /dev/loop$i b 7 $i 2>/dev/null || true
    fi
done
exit 0
LOOP_HOOK_EOF
chmod +x /etc/initramfs-tools/scripts/init-premount/00_loop_devices

# Régénération de l'initramfs avec live-boot et les modules de stockage
if command -v update-initramfs &>/dev/null; then
    update-initramfs -u -k all 2>/dev/null || update-initramfs -c -k all 2>/dev/null || true
fi

# Script de post-installation First-Boot
cat << 'FIRSTBOOT_EOF' > /root/firstboot.sh
#!/usr/bin/env bash
${recipe.firstBootScript || '# Aucun script first-boot spécifique'}
FIRSTBOOT_EOF
chmod +x /root/firstboot.sh
${recipe.firstBootScript ? firstbootTriggerCmd('debian') : ''}

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
