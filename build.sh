#!/usr/bin/env bash
# ==============================================================================
# OSForge Studio — Script de Construction d'OS / ISO Linux
# OS: ForgeOS (Live Test Edition)
# Base: DEBIAN | Arch: x86_64 | Format: iso_hybrid
# Date de génération: 2026-09-02T15:52:46.155Z
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
echo -e "${CYAN}   Nom d'hôte         : "'forge-live'"${NC}"
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


# Activation du multi-architecture 32-bit (requis pour Steam, Wine et runtimes de jeux)
dpkg --add-architecture i386 2>/dev/null || true
# Mise à jour des index de paquets
apt-get update -y

# Installation sécurisée et résiliente des logiciels sélectionnés
for pkg in 'fastfetch' 'pciutils' 'usbutils' 'git' 'git-lfs' 'xfce4' 'xfce4-goodies' 'lightdm' 'lightdm-gtk-greeter' 'thunar' 'firefox-esr' 'xorg' 'xserver-xorg-video-all' 'mesa-vulkan-drivers' 'pulseaudio' 'pavucontrol' 'network-manager' 'network-manager-gnome' 'fonts-noto' 'fonts-liberation' 'sudo' 'curl' 'wget' 'locales' 'ca-certificates' 'systemd-sysv' 'initramfs-tools' 'firmware-linux-free' 'iproute2' 'net-tools' 'openssh-server' 'plymouth' 'plymouth-themes'; do
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
echo 'forge-live' > /etc/hostname
cat << 'HOSTS' > /etc/hosts
127.0.0.1   localhost forge-live
::1         localhost ip6-localhost ip6-loopback
HOSTS

# ==============================================================================
# 🎨 PERSONNALISATION INTEGRALE DE L'OS (BRANDING & DESIGN SYSTEM)
# ==============================================================================
# ==============================================================================
# Identité de l'OS (/etc/os-release & /etc/issue)
# ==============================================================================
echo -e "${BLUE}[BRANDING] Configuration de l'identite officielle (/etc/os-release)...${NC}"

cat > /etc/os-release << 'OSREL_EOF'
PRETTY_NAME="ForgeOS Live Test Edition"
NAME="ForgeOS"
VERSION="1.0 (Live Test Edition)"
VERSION_ID="1.0"
ID=forgeos
ID_LIKE=debian
BUILD_ID=osforge-studio
HOME_URL="https://github.com/LordMadTrix/osforge-studio"
LOGO=forgeos
OSREL_EOF

cp -f /etc/os-release /usr/lib/os-release 2>/dev/null || true

cat << 'ISSUE_EOF' > /etc/issue
\033[1;36mForgeOS\033[0m \033[1;33mLive Test Edition\033[0m (v1.0) [\\n \\l]

ISSUE_EOF
cp -f /etc/issue /etc/issue.net 2>/dev/null || true

# Installation de l'icone officielle du systeme
mkdir -p /usr/share/pixmaps
cat << 'LOGOSVG_EOF' > /usr/share/pixmaps/forgeos.svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="256" height="256">
  <defs>
    <linearGradient id="grad" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#38bdf8"/>
      <stop offset="100%" stop-color="#0f172a"/>
    </linearGradient>
  </defs>
  <rect width="256" height="256" rx="56" fill="url(#grad)"/>
  <rect x="12" y="12" width="232" height="232" rx="44" fill="none" stroke="#ffffff" stroke-width="4" opacity="0.2"/>
  <text x="128" y="168" font-family="system-ui, -apple-system, sans-serif" font-weight="900" font-size="120" fill="#ffffff" text-anchor="middle">F</text>
</svg>
LOGOSVG_EOF


# ==============================================================================
# Fond d'écran officiel & Intégration Environnements de Bureau
# ==============================================================================
echo -e "${BLUE}[BRANDING] Deploiement du fond d'ecran (minimal)...${NC}"
mkdir -p /usr/share/backgrounds
mkdir -p "/usr/share/wallpapers/forgeos/contents/images"


cat << 'WALLPAPERSVG_EOF' > "/usr/share/backgrounds/forgeos-wallpaper.svg"
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1920 1080" width="1920" height="1080">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0f172a"/>
      <stop offset="100%" stop-color="#020617"/>
    </linearGradient>
    <linearGradient id="accentLine" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#38bdf8" stop-opacity="0.1"/>
      <stop offset="50%" stop-color="#38bdf8" stop-opacity="0.9"/>
      <stop offset="100%" stop-color="#38bdf8" stop-opacity="0.1"/>
    </linearGradient>
  </defs>
  <rect width="1920" height="1080" fill="url(#bg)"/>
  <!-- Minimalist Geometry -->
  <polygon points="960,380 1100,460 1100,620 960,700 820,620 820,460" fill="none" stroke="#38bdf8" stroke-width="2.5" opacity="0.75"/>
  <circle cx="960" cy="540" r="45" fill="#38bdf8" fill-opacity="0.1" stroke="#38bdf8" stroke-width="1.5"/>
  <line x1="640" y1="760" x2="1280" y2="760" stroke="url(#accentLine)" stroke-width="2"/>
  <text x="960" y="810" font-family="system-ui, -apple-system, sans-serif" font-weight="700" font-size="32" fill="#ffffff" text-anchor="middle" letter-spacing="3">ForgeOS</text>
  <text x="960" y="845" font-family="system-ui, -apple-system, sans-serif" font-weight="500" font-size="15" fill="#38bdf8" text-anchor="middle" letter-spacing="5">LIVE TEST EDITION</text>
</svg>
WALLPAPERSVG_EOF


# Si le SVG existe, creer le lien dans le dossier des wallpapers KDE
if [ -f "/usr/share/backgrounds/forgeos-wallpaper.svg" ]; then
    cp -f "/usr/share/backgrounds/forgeos-wallpaper.svg" "/usr/share/wallpapers/forgeos/contents/images/1920x1080.svg" 2>/dev/null || true
    WALLPAPER_TARGET="/usr/share/backgrounds/forgeos-wallpaper.svg"
else
    cp -f "/usr/share/backgrounds/forgeos-wallpaper.png" "/usr/share/wallpapers/forgeos/contents/images/1920x1080.png" 2>/dev/null || true
    WALLPAPER_TARGET="/usr/share/backgrounds/forgeos-wallpaper.png"
fi

# Métadonnées pour sélecteur KDE Plasma
cat << 'METADATA_EOF' > "/usr/share/wallpapers/forgeos/metadata.json"
{
    "KPlugin": {
        "Id": "forgeos",
        "Name": "ForgeOS",
        "Authors": [{"Name": "OSForge Studio"}]
    }
}
METADATA_EOF

# 1. Intégration GNOME / Cinnamon (via DConf local)
mkdir -p /etc/dconf/db/local.d
cat << DCONF_BG_EOF > /etc/dconf/db/local.d/01-background
[org/gnome/desktop/background]
picture-uri='file://${WALLPAPER_TARGET}'
picture-uri-dark='file://${WALLPAPER_TARGET}'
picture-options='zoom'
primary-color='#000000'
secondary-color='#000000'
DCONF_BG_EOF
if command -v dconf &>/dev/null; then
    dconf update 2>/dev/null || true
fi

# 2. Intégration XFCE
mkdir -p /etc/xdg/xfce4/xfconf/xfce-perchannel-xml
cat << XFCE_BG_EOF > /etc/xdg/xfce4/xfconf/xfce-perchannel-xml/xfce4-desktop.xml
<?xml version="1.0" encoding="UTF-8"?>
<channel name="xfce4-desktop" version="1.0">
  <property name="backdrop" type="empty">
    <property name="screen0" type="empty">
      <property name="monitor0" type="empty">
        <property name="workspace0" type="empty">
          <property name="image-path" type="string" value="${WALLPAPER_TARGET}"/>
          <property name="image-style" type="int" value="5"/>
        </property>
      </property>
    </property>
  </property>
</channel>
XFCE_BG_EOF

# 3. Intégration SDDM (KDE Login Greeter)
mkdir -p /usr/share/sddm/themes/breeze/components/artwork
if [ -d /usr/share/sddm/themes/breeze ]; then
    cp -f "${WALLPAPER_TARGET}" /usr/share/sddm/themes/breeze/components/artwork/background.svg 2>/dev/null || true
fi

# 4. Intégration LightDM Greeter
if [ -f /etc/lightdm/lightdm-gtk-greeter.conf ]; then
    sed -i "s|^#\?background=.*|background = ${WALLPAPER_TARGET}|" /etc/lightdm/lightdm-gtk-greeter.conf 2>/dev/null || true
fi


# ==============================================================================
# Thème Sombre & Couleur d'Accentuation (#38bdf8)
# ==============================================================================
echo -e "${BLUE}[BRANDING] Application de la couleur d'accentuation (#38bdf8) et du Dark Theme...${NC}"

# 1. Configuration globale KDE Plasma (kdeglobals)
mkdir -p /etc/xdg
cat << KDEGLOBALS_EOF >> /etc/xdg/kdeglobals
[General]
AccentColor=56,189,248
ColorScheme=BreezeDark

[KDE]
colorScheme=BreezeDark
lookAndFeelPackage=org.kde.breezedark.desktop
KDEGLOBALS_EOF

# Copie dans le squelette utilisateur /etc/skel
mkdir -p /etc/skel/.config
cp -f /etc/xdg/kdeglobals /etc/skel/.config/kdeglobals 2>/dev/null || true

# 2. Configuration GTK 3 & GTK 4 (Thème sombre + Papirus Dark si installé)
mkdir -p /etc/gtk-3.0 /etc/gtk-4.0
cat << GTK_SETTINGS_EOF > /etc/gtk-3.0/settings.ini
[Settings]
gtk-theme-name = Adwaita-dark
gtk-application-prefer-dark-theme = 1
gtk-icon-theme-name = Papirus-Dark
gtk-cursor-theme-name = Breeze_Snow
GTK_SETTINGS_EOF

cp -f /etc/gtk-3.0/settings.ini /etc/gtk-4.0/settings.ini 2>/dev/null || true

mkdir -p /etc/skel/.config/gtk-3.0 /etc/skel/.config/gtk-4.0
cp -f /etc/gtk-3.0/settings.ini /etc/skel/.config/gtk-3.0/settings.ini 2>/dev/null || true
cp -f /etc/gtk-3.0/settings.ini /etc/skel/.config/gtk-4.0/settings.ini 2>/dev/null || true

# 3. DConf Interface Sombre & Accent Color (GNOME / Libadwaita)
cat << DCONF_THEME_EOF > /etc/dconf/db/local.d/02-theme
[org/gnome/desktop/interface]
color-scheme='prefer-dark'
gtk-theme='Adwaita-dark'
icon-theme='Papirus-Dark'
accent-color='teal'
DCONF_THEME_EOF
if command -v dconf &>/dev/null; then
    dconf update 2>/dev/null || true
fi


# ==============================================================================
# Bannière Terminal & Fastfetch aux Couleurs de l'OS
# ==============================================================================
echo -e "${BLUE}[BRANDING] Configuration de Fastfetch et de la banniere terminal...${NC}"

# 1. Bannière d'accueil MOTD (affichée sur TTY et connexions SSH)
cat << 'MOTD_EOF' > /etc/motd
\033[1;36m╔═══════════════════════════════════════════════════════════════════════════╗\033[0m
\033[1;36m║\033[0m  \033[1;37mForgeOS\033[0m — \033[1;33mLive Test Edition\033[0m (v1.0)                                     \033[1;36m║\033[0m
\033[1;36m║\033[0m  Système optimisé généré avec \033[1;35mOSForge Studio\033[0m                             \033[1;36m║\033[0m
\033[1;36m╚═══════════════════════════════════════════════════════════════════════════╝\033[0m
MOTD_EOF

# 2. Configuration personnalisée de Fastfetch
mkdir -p /etc/fastfetch
cat << 'FASTFETCH_CONF_EOF' > /etc/fastfetch/config.jsonc
{
  "$schema": "https://github.com/fastfetch-cli/fastfetch/raw/dev/doc/json_schema.json",
  "logo": {
    "type": "small",
    "color": { "1": "#38bdf8" }
  },
  "display": {
    "separator": " ➜ ",
    "color": {
      "keys": "#38bdf8",
      "title": "#38bdf8"
    }
  },
  "modules": [
    "title",
    "separator",
    "os",
    "host",
    "kernel",
    "uptime",
    "packages",
    "shell",
    "display",
    "de",
    "wm",
    "terminal",
    "cpu",
    "gpu",
    "memory",
    "break",
    "colors"
  ]
}
FASTFETCH_CONF_EOF

# 3. Script d'accueil interactif dans /etc/profile.d/ (lance fastfetch sur shell interactif)
cat << 'PROFILE_FASTFETCH_EOF' > /etc/profile.d/00-fastfetch-welcome.sh
#!/bin/sh
if [ -n "$PS1" ] && [ -t 1 ] && command -v fastfetch >/dev/null 2>&1; then
    fastfetch
fi
PROFILE_FASTFETCH_EOF
chmod +x /etc/profile.d/00-fastfetch-welcome.sh


# ==============================================================================
# Configuration Plymouth (Boot Splash : spinner)
# ==============================================================================
if command -v plymouth-set-default-theme &>/dev/null; then
    echo -e "${BLUE}[BRANDING] Activation du theme Plymouth : spinner...${NC}"
    plymouth-set-default-theme -R "spinner" 2>/dev/null || plymouth-set-default-theme -R "spinner" 2>/dev/null || true
fi


# ==============================================================================
# Thème Graphique GRUB 2 HD (ForgeOS)
# ==============================================================================
echo -e "${BLUE}[BRANDING] Installation du theme graphique GRUB 2...${NC}"
mkdir -p "/boot/grub/themes/forgeos"

cat << 'GRUBTHEME_EOF' > "/boot/grub/themes/forgeos/theme.txt"
# OSForge Studio - GRUB 2 Theme
title-text: "ForgeOS (Live Test Edition)"
title-font: "DejaVu Sans Bold 18"
title-color: "#38bdf8"
desktop-color: "#0a0c14"
message-font: "DejaVu Sans Regular 14"
message-color: "#94a3b8"
terminal-font: "Fixed 14"

+ boot_menu {
    left = 20%
    top = 30%
    width = 60%
    height = 50%
    item_font = "DejaVu Sans Regular 16"
    item_color = "#94a3b8"
    selected_item_color = "#ffffff"
    selected_item_pixmap_style = "select_*.png"
    item_height = 40
    item_padding = 10
    item_spacing = 15
}

+ progress_bar {
    id = "__timeout__"
    left = 20%
    top = 85%
    width = 60%
    height = 12
    show_text = true
    font = "DejaVu Sans Regular 12"
    text_color = "#38bdf8"
    fg_color = "#38bdf8"
    bg_color = "#1e293b"
}
GRUBTHEME_EOF

# Activation du theme dans /etc/default/grub si present
if [ -f /etc/default/grub ]; then
    sed -i '/^GRUB_THEME=/d' /etc/default/grub
    echo 'GRUB_THEME="/boot/grub/themes/forgeos/theme.txt"' >> /etc/default/grub
    if command -v update-grub &>/dev/null; then
        update-grub 2>/dev/null || true
    fi
fi



# Configuration de la locale et du fuseau horaire
ln -sf /usr/share/zoneinfo/Europe/Paris /etc/localtime
echo "fr_FR.UTF-8 UTF-8" >> /etc/locale.gen || true
locale-gen || true
echo "LANG=fr_FR.UTF-8" > /etc/default/locale
echo "LANG=fr_FR.UTF-8" > /etc/locale.conf

# Configuration clavier
cat > /etc/default/keyboard << 'KBD_EOF'
XKBMODEL="pc105"
XKBLAYOUT="fr"
XKBVARIANT=""
XKBOPTIONS=""
KBD_EOF

# Création de l'utilisateur principal
if ! id 'forge' &>/dev/null; then
    useradd -m -s '/bin/bash' -c 'Forge Live User' 'forge'
    echo 'forge':'forge' | chpasswd
    usermod -aG sudo 'forge'
fi

# Mot de passe Root
echo "root:toor" | chpasswd

# Configuration SSH & Clés d'accès

systemctl enable ssh 2>/dev/null || true

















systemctl enable lightdm 2>/dev/null || true
mkdir -p /etc/lightdm/lightdm.conf.d
cat > /etc/lightdm/lightdm.conf.d/50-autologin.conf << 'LIGHTDM_EOF'
[Seat:*]
autologin-user=forge
autologin-user-timeout=0
LIGHTDM_EOF















# Sécurité & Durcissement (CIS Benchmark / UFW / nftables)


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
# Aucun script first-boot spécifique
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
VMLINUZ_SRC=$(readlink -f "${ROOTFS_DIR}/boot/vmlinuz" 2>/dev/null || true)
[ -n "$VMLINUZ_SRC" ] && [ -f "$VMLINUZ_SRC" ] || VMLINUZ_SRC=$(find "${ROOTFS_DIR}/boot" -maxdepth 1 -type f \( -name 'vmlinuz-*' -o -name 'vmlinux-*' -o -name 'kernel*.img' \) ! -name '*.old' 2>/dev/null | sort | head -1)
[ -n "$VMLINUZ_SRC" ] && cp "$VMLINUZ_SRC" "${ISO_DIR}/live/vmlinuz"

INITRD_SRC=$(readlink -f "${ROOTFS_DIR}/boot/initrd.img" 2>/dev/null || true)
[ -n "$INITRD_SRC" ] && [ -f "$INITRD_SRC" ] || INITRD_SRC=$(find "${ROOTFS_DIR}/boot" -maxdepth 1 -type f \( -name 'initrd.img-*' -o -name 'initramfs-*' \) ! -name '*.old' 2>/dev/null | sort | head -1)
[ -n "$INITRD_SRC" ] && cp "$INITRD_SRC" "${ISO_DIR}/live/initrd"

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

menuentry "ForgeOS (Live Test Edition) [Live Desktop]" {
    linux /live/vmlinuz boot=live components loop.max_loop=8 max_loop=8 quiet splash hostname=forge-live
    initrd /live/initrd
}

menuentry "ForgeOS (Mode Secours / Failsafe)" {
    linux /live/vmlinuz boot=live components loop.max_loop=8 max_loop=8 nomodeset
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
  -volid 'FORGEOS' \
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
