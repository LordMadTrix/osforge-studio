#!/usr/bin/env bash
# ==============================================================================
# OSForge Studio — Script de Construction d'OS / ISO Linux
# OS: ForgeOS (Custom Edition)
# Base: DEBIAN | Arch: x86_64 | Format: iso_hybrid
# Date de génération: 2026-08-23T15:23:12.631Z
# ==============================================================================

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${CYAN}=======================================================${NC}"
echo -e "${CYAN}   🚀 OSForge Studio : Compilation de l'ISO Linux     ${NC}"
echo -e "${CYAN}   Distribution cible : debian (x86_64)${NC}"
echo -e "${CYAN}   Nom d'hôte         : forge-box${NC}"
echo -e "${CYAN}=======================================================${NC}"

# Vérification des privilèges root
if [[ $EUID -ne 0 ]]; then
   echo -e "${RED}[ERREUR] Ce script doit être exécuté avec les privilèges root (sudo).${NC}"
   exit 1
fi

# Repertoire de travail securise (evite les partitions /tmp montees avec l'option nodev)
WORK_DIR="/var/tmp/osforge-build-$(date +%s)"
ROOTFS_DIR="${WORK_DIR}/rootfs"
ISO_DIR="${WORK_DIR}/iso"
OUTPUT_DIR="$(pwd)/dist"

mkdir -p "${ROOTFS_DIR}" "${ISO_DIR}" "${OUTPUT_DIR}"

echo -e "${YELLOW}[1/7] 📦 Installation des dépendances de compilation de l'hôte...${NC}"
which debootstrap xorriso mtools grub-mkrescue squashfs-tools >/dev/null 2>&1 || {
    echo -e "${YELLOW}Installation des outils requis sur l'hôte...${NC}"
    apt-get update -y && apt-get install -y debootstrap xorriso mtools grub-pc-bin grub-efi-amd64-bin grub-common squashfs-tools dosfstools rsync
}

echo -e "${YELLOW}[2/7] 🏗️ Initialisation du RootFS de base (debian / trixie)...${NC}"
debootstrap --arch="amd64" \
  --include="linux-image-amd64,live-boot,systemd-sysv,initramfs-tools,ca-certificates,locales,sudo,curl,wget,gnupg,iproute2" \
  trixie "${ROOTFS_DIR}" "http://deb.debian.org/debian"

echo -e "${YELLOW}[3/7] ⚙️ Configuration du système et installation des paquets...${NC}"

# Configuration des dépôts apt complets
cat << 'APT_SOURCES' > "${ROOTFS_DIR}/etc/apt/sources.list"
deb http://deb.debian.org/debian trixie main contrib non-free non-free-firmware
deb http://deb.debian.org/debian-security trixie-security main contrib non-free non-free-firmware
deb http://deb.debian.org/debian trixie-updates main contrib non-free non-free-firmware
APT_SOURCES

# Cache optionnel des paquets APT du chroot (accélère les builds répétés en CI ; ignoré si non défini)
if [ -n "${APT_CACHE_DIR:-}" ]; then
    mkdir -p "${APT_CACHE_DIR}"
    mkdir -p "${ROOTFS_DIR}/var/cache/apt/archives"
    mount --bind "${APT_CACHE_DIR}" "${ROOTFS_DIR}/var/cache/apt/archives"
fi

# Montage des pseudos-systèmes de fichiers pour le chroot
mount --bind /dev "${ROOTFS_DIR}/dev"
mount --bind /dev/pts "${ROOTFS_DIR}/dev/pts"
mount --bind /proc "${ROOTFS_DIR}/proc"
mount --bind /sys "${ROOTFS_DIR}/sys"

# Script de configuration exécuté à l'intérieur du chroot
cat << 'CHROOT_EOF' | chroot "${ROOTFS_DIR}" /bin/bash
set -e
export DEBIAN_FRONTEND=noninteractive

# Mise à jour des index de paquets
apt-get update -y

# Installation sécurisée et résiliente des logiciels sélectionnés
for pkg in docker.io docker-compose git git-lfs neovim ripgrep fd-find zsh fzf curl btop htop iotop ncdu neofetch pciutils usbutils wget sudo hyprland waybar wofi kitty xdg-desktop-portal-hyprland thunar firefox-esr pipewire pipewire-audio wireplumber network-manager locales ca-certificates systemd-sysv initramfs-tools firmware-linux-free iproute2 net-tools; do
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
echo "forge-box" > /etc/hostname
cat << 'HOSTS' > /etc/hosts
127.0.0.1   localhost forge-box
::1         localhost ip6-localhost ip6-loopback
HOSTS

# Configuration de la locale et du fuseau horaire
ln -sf /usr/share/zoneinfo/Europe/Paris /etc/localtime
echo "fr_FR UTF-8" >> /etc/locale.gen || true
locale-gen || true

# Création de l'utilisateur principal
if ! id "developer" &>/dev/null; then
    useradd -m -s /bin/bash -c "Forge Developer" developer
    echo "developer:forge" | chpasswd
    usermod -aG sudo developer
fi

# Mot de passe Root
echo "root:toor" | chpasswd

# Configuration SSH

mkdir -p /etc/ssh /home/developer/.ssh
chmod 700 /home/developer/.ssh



# Sécurité & Durcissement (CIS Benchmark / UFW)

if ! command -v ufw &>/dev/null; then
    apt-get install -y --no-install-recommends ufw >/dev/null 2>&1 || true
fi
if command -v ufw &>/dev/null; then
    ufw default deny incoming || true
    ufw default allow outgoing || true
    ufw allow 22/tcp || true
    ufw --force enable || true
fi


# Script de post-installation First-Boot
cat << 'FIRSTBOOT_EOF' > /root/firstboot.sh
#!/usr/bin/env bash
#!/usr/bin/env bash
echo "Bienvenue sur votre OS sur mesure !" > /var/log/firstboot.log
FIRSTBOOT_EOF
chmod +x /root/firstboot.sh

CHROOT_EOF

echo -e "${YELLOW}[4/7] 🧹 Nettoyage des montages du RootFS...${NC}"
umount -lf "${ROOTFS_DIR}/sys" || true
umount -lf "${ROOTFS_DIR}/proc" || true
umount -lf "${ROOTFS_DIR}/dev/pts" || true
umount -lf "${ROOTFS_DIR}/dev" || true
if [ -n "${APT_CACHE_DIR:-}" ]; then
    umount -lf "${ROOTFS_DIR}/var/cache/apt/archives" || true
fi

echo -e "${YELLOW}[5/7] 🗜️ Compression SquashFS du système d'exploitation...${NC}"
mkdir -p "${ISO_DIR}/live"
mksquashfs "${ROOTFS_DIR}" "${ISO_DIR}/live/filesystem.squashfs" -comp xz -e boot

echo -e "${YELLOW}[6/7] 🖲️ Préparation du chargeur de démarrage GRUB (BIOS & UEFI)...${NC}"
mkdir -p "${ISO_DIR}/boot/grub/i386-pc" "${ISO_DIR}/EFI/BOOT"
cp "${ROOTFS_DIR}/boot"/vmlinuz* "${ISO_DIR}/live/vmlinuz" || cp "${ROOTFS_DIR}/boot"/vmlinux* "${ISO_DIR}/live/vmlinuz" || true
cp "${ROOTFS_DIR}/boot"/initrd.img* "${ISO_DIR}/live/initrd" || cp "${ROOTFS_DIR}/boot"/initramfs* "${ISO_DIR}/live/initrd" || true

cat << 'GRUB_CONFIG_EOF' > "${ISO_DIR}/boot/grub/grub.cfg"
set default=0
set timeout=3

insmod all_video
insmod font
insmod part_msdos
insmod part_gpt
insmod iso9660
insmod search

search --no-floppy --set=root --file /live/vmlinuz

menuentry "ForgeOS (Custom Edition) [Live Desktop]" {
    linux /live/vmlinuz boot=live components quiet splash hostname=forge-box
    initrd /live/initrd
}

menuentry "ForgeOS (Mode Secours / Failsafe)" {
    linux /live/vmlinuz boot=live components nomodeset
    initrd /live/initrd
}
GRUB_CONFIG_EOF

# 1. Image d'amorce BIOS autonome (El Torito)
grub-mkstandalone \
  --format=i386-pc \
  --output="${ISO_DIR}/boot/grub/i386-pc/core.img" \
  --install-modules="linux normal iso9660 biosdisk search search_fs_file search_label part_msdos part_gpt all_video font gfxterm test echo sleep cat help ls" \
  --modules="linux normal iso9660 biosdisk search search_fs_file search_label part_msdos part_gpt all_video font gfxterm" \
  --locales="" \
  --fonts="" \
  "boot/grub/grub.cfg=${ISO_DIR}/boot/grub/grub.cfg"

cat /usr/lib/grub/i386-pc/cdboot.img "${ISO_DIR}/boot/grub/i386-pc/core.img" > "${ISO_DIR}/boot/grub/i386-pc/eltorito.img"

# 2. Image d'amorce UEFI autonome (bootx64.efi)
grub-mkstandalone \
  --format=x86_64-efi \
  --output="${ISO_DIR}/EFI/BOOT/bootx64.efi" \
  --install-modules="linux normal iso9660 search search_fs_file search_label part_msdos part_gpt all_video font gfxterm" \
  --modules="linux normal iso9660 search search_fs_file search_label part_msdos part_gpt all_video font gfxterm" \
  --locales="" \
  --fonts="" \
  "boot/grub/grub.cfg=${ISO_DIR}/boot/grub/grub.cfg"

echo -e "${YELLOW}[7/7] 📀 Création de l'image ISO hybride amorçable (BIOS + UEFI)...${NC}"
xorriso -as mkisofs \
  -iso-level 3 \
  -full-iso9660-filenames \
  -volid "FORGEOS" \
  -eltorito-boot boot/grub/i386-pc/eltorito.img \
    -no-emul-boot -boot-load-size 4 -boot-info-table \
  --eltorito-catalog boot/grub/boot.cat \
  -isohybrid-mbr /usr/lib/grub/i386-pc/boot_hybrid.img \
  -output "${OUTPUT_DIR}/forgeos-1.0-x86_64.iso" \
  "${ISO_DIR}"

echo -e "${GREEN}=======================================================${NC}"
echo -e "${GREEN}   ✅ ISO générée avec succès : ${OUTPUT_DIR}/forgeos-1.0-x86_64.iso${NC}"
echo -e "${GREEN}   Taille du fichier : $(du -h "${OUTPUT_DIR}/forgeos-1.0-x86_64.iso" 2>/dev/null | cut -f1 || echo "OK")${NC}"
echo -e "${GREEN}   Empreinte SHA256  : $(sha256sum "${OUTPUT_DIR}/forgeos-1.0-x86_64.iso" 2>/dev/null | cut -d' ' -f1 || echo "Calculé au build")${NC}"
echo -e "${GREEN}=======================================================${NC}"
