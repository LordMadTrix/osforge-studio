#!/usr/bin/env bash
# ==============================================================================
# 🚀 OSForge Studio by LordMadTrix — Sonde d'Extraction Système (OSForge Reverser)
# ==============================================================================
# Analyse votre machine Linux réelle et génère une recette JSON compatible 
# avec OSForge Studio (https://lordmadtrix.github.io/osforge-studio/)
# pour cloner, sauvegarder ou reproduire votre configuration système à l'identique.
# ==============================================================================
set -euo pipefail

CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
PURPLE='\033[0;35m'
NC='\033[0m'

echo -e "${CYAN}===============================================================================${NC}"
echo -e "${CYAN}   🔍 OSForge Studio — Sonde & Cloneur de Machine Réelle (by LordMadTrix)     ${NC}"
echo -e "${CYAN}   The Ultimate Linux Distro & Cloud Image Builder • Écosystème MadOS          ${NC}"
echo -e "${CYAN}===============================================================================${NC}"
echo ""

# 1. Détection de la Distribution
DISTRO_ID="debian"
DISTRO_VER="13"
SUITE="trixie"

if [ -f /etc/os-release ]; then
    . /etc/os-release
    case "${ID:-debian}" in
        ubuntu)
            DISTRO_ID="ubuntu"
            DISTRO_VER="${VERSION_ID:-24.04}"
            SUITE="${UBUNTU_CODENAME:-noble}"
            ;;
        debian)
            DISTRO_ID="debian"
            DISTRO_VER="${VERSION_ID:-13}"
            SUITE="${VERSION_CODENAME:-trixie}"
            ;;
        arch|endeavouros|cachyos)
            DISTRO_ID="${ID}"
            DISTRO_VER="rolling"
            ;;
        fedora)
            DISTRO_ID="fedora"
            DISTRO_VER="${VERSION_ID:-44}"
            ;;
        alpine)
            DISTRO_ID="alpine"
            DISTRO_VER="${VERSION_ID:-3.24}"
            ;;
        opensuse*|suse)
            DISTRO_ID="opensuse"
            DISTRO_VER="tumbleweed"
            ;;
        void)
            DISTRO_ID="void"
            DISTRO_VER="rolling"
            ;;
        kali)
            DISTRO_ID="kali"
            DISTRO_VER="rolling"
            ;;
        linuxmint)
            DISTRO_ID="linuxmint"
            DISTRO_VER="${VERSION_ID:-22}"
            ;;
        *)
            DISTRO_ID="${ID:-debian}"
            DISTRO_VER="${VERSION_ID:-1.0}"
            ;;
    esac
fi
echo -e "${GREEN}[1/6] Distribution détectée : ${DISTRO_ID} (version: ${DISTRO_VER})${NC}"

# 2. Détection de l'Architecture
UNAME_M=$(uname -m)
ARCH="x86_64"
case "${UNAME_M}" in
    x86_64|amd64) ARCH="x86_64" ;;
    aarch64|arm64) ARCH="aarch64" ;;
    riscv64) ARCH="riscv64" ;;
esac
echo -e "${GREEN}[2/6] Architecture processeur : ${ARCH}${NC}"

# 3. Détection de l'Environnement de Bureau
DESKTOP="none"
CURRENT_DESKTOP="${XDG_CURRENT_DESKTOP:-${DESKTOP_SESSION:-}}"
CURRENT_DESKTOP_LOWER=$(echo "${CURRENT_DESKTOP}" | tr '[:upper:]' '[:lower:]')

if [[ "${CURRENT_DESKTOP_LOWER}" =~ kde|plasma ]]; then
    DESKTOP="kde"
elif [[ "${CURRENT_DESKTOP_LOWER}" =~ gnome ]]; then
    DESKTOP="gnome"
elif [[ "${CURRENT_DESKTOP_LOWER}" =~ xfce ]]; then
    DESKTOP="xfce"
elif [[ "${CURRENT_DESKTOP_LOWER}" =~ hyprland ]]; then
    DESKTOP="hyprland"
elif [[ "${CURRENT_DESKTOP_LOWER}" =~ sway ]]; then
    DESKTOP="sway"
elif [[ "${CURRENT_DESKTOP_LOWER}" =~ cosmic ]]; then
    DESKTOP="cosmic"
elif [[ "${CURRENT_DESKTOP_LOWER}" =~ cinnamon ]]; then
    DESKTOP="cinnamon"
elif [[ "${CURRENT_DESKTOP_LOWER}" =~ mate ]]; then
    DESKTOP="mate"
elif [[ "${CURRENT_DESKTOP_LOWER}" =~ lxqt ]]; then
    DESKTOP="lxqt"
elif [[ "${CURRENT_DESKTOP_LOWER}" =~ i3 ]]; then
    DESKTOP="i3wm"
fi
echo -e "${GREEN}[3/6] Bureau détecté        : ${DESKTOP}${NC}"

# 4. Détection des Métadonnées Système
SYS_HOSTNAME=$(hostname 2>/dev/null || echo "cloned-system")
CURRENT_USER="${SUDO_USER:-${USER:-osforge}}"
TIMEZONE="UTC"
if [ -L /etc/localtime ]; then
    TIMEZONE=$(readlink /etc/localtime | sed 's#.*/zoneinfo/##' || echo "UTC")
fi
LOCALE_NAME="${LANG:-en_US.UTF-8}"
KEYMAP="us"
if [ -f /etc/vconsole.conf ]; then
    KEYMAP=$(grep -oP '^KEYMAP=\K[a-zA-Z0-9_-]+' /etc/vconsole.conf || echo "us")
elif [ -f /etc/default/keyboard ]; then
    KEYMAP=$(grep -oP '^XKBLAYOUT="\K[a-zA-Z0-9_-]+' /etc/default/keyboard || echo "us")
fi
echo -e "${GREEN}[4/6] Utilisateur & Région  : user=${CURRENT_USER}, tz=${TIMEZONE}, keymap=${KEYMAP}${NC}"

# 5. Détection des Paquets Logiciels Installés
SELECTED_PACKAGES=()
check_pkg() {
    local cmd="$1"
    local pkg_id="$2"
    if command -v "${cmd}" &>/dev/null; then
        SELECTED_PACKAGES+=("\"${pkg_id}\"")
    fi
}

check_pkg "fastfetch" "fastfetch"
check_pkg "neofetch" "fastfetch"
check_pkg "htop" "htop_monitor"
check_pkg "btop" "btop_monitor"
check_pkg "curl" "curl_tool"
check_pkg "git" "git_vcs"
check_pkg "vlc" "vlc_player"
check_pkg "mpv" "mpv_player"
check_pkg "steam" "steam_client"
check_pkg "firefox" "firefox_browser"
check_pkg "chromium" "chromium_browser"
check_pkg "docker" "docker_engine"
check_pkg "wireguard" "wireguard_vpn"
check_pkg "libreoffice" "libreoffice_suite"
check_pkg "gimp" "gimp_editor"
check_pkg "obs" "obs_studio"
check_pkg "zsh" "zsh_shell"
check_pkg "fish" "fish_shell"
check_pkg "mangohud" "mangohud"
check_pkg "gamemoded" "gamemode"

PKG_JOINED=$(IFS=,; echo "${SELECTED_PACKAGES[*]}")
echo -e "${GREEN}[5/6] Logiciels cartographiés: ${#SELECTED_PACKAGES[@]} paquet(s) détecté(s)${NC}"

DM="lightdm"
if [ "${DESKTOP}" = "kde" ]; then
    DM="sddm"
elif [ "${DESKTOP}" = "gnome" ]; then
    DM="gdm"
fi

# 6. Assemblage du JSON compatible OSRecipe
OUT_JSON="$(pwd)/osforge-recipe.json"
cat > "${OUT_JSON}" << RECIPE_EOF
{
  "id": "reverser-$(date +%s)",
  "name": "Clone de ${SYS_HOSTNAME}",
  "description": "Recette extraite automatiquement par la sonde OSForge Reverser depuis une machine ${DISTRO_ID} (${ARCH}).",
  "distro": "${DISTRO_ID}",
  "distroVersion": "${DISTRO_VER}",
  "distroSuite": "${SUITE}",
  "arch": "${ARCH}",
  "outputFormat": "iso_hybrid",
  "desktop": "${DESKTOP}",
  "displayManager": "${DM}",
  "kernel": "generic",
  "selectedPackages": [${PKG_JOINED}],
  "customPackages": [],
  "branding": {
    "osName": "${SYS_HOSTNAME}",
    "editionName": "Clone Machine",
    "version": "1.0",
    "accentColor": "#0ea5e9",
    "wallpaperPreset": "minimal",
    "bootSplashTheme": "spinner"
  },
  "user": {
    "username": "${CURRENT_USER}",
    "password": "osforgepassword",
    "sudo": true,
    "shell": "/bin/bash"
  },
  "hostname": "${SYS_HOSTNAME}",
  "timezone": "${TIMEZONE}",
  "locale": "${LOCALE_NAME}",
  "keyboardLayout": "${KEYMAP}",
  "enableSSH": true,
  "filesystem": "ext4",
  "security": {
    "cisBenchmarkLevel": 0,
    "firewall": "ufw",
    "appArmorOrSELinux": true,
    "fail2ban": false,
    "luksEncryption": false,
    "disableRootSSH": false,
    "autoSecurityUpdates": false
  },
  "enableGamingOptimizations": false,
  "enablePowerSaving": false,
  "enableCommunityRepos": true,
  "customServices": [],
  "firstBootScript": ""
}
RECIPE_EOF

echo ""
echo -e "${PURPLE}===============================================================================${NC}"
echo -e "${GREEN}   ✅ Recette générée avec succès : ${OUT_JSON}${NC}"
echo -e "${PURPLE}===============================================================================${NC}"
echo -e "Pour importer cette machine dans OSForge Studio :"
echo -e "1. Ouvrez : ${CYAN}https://lordmadtrix.github.io/osforge-studio/${NC}"
echo -e "2. Cliquez sur ${YELLOW}💾 Sauvegardes & Profils${NC} -> ${YELLOW}Importer JSON${NC}"
echo -e "3. Sélectionnez ce fichier : ${OUT_JSON}"
echo -e "4. Vous pouvez maintenant compiler l'ISO ou l'image de cette machine en 1 clic !"
echo -e "${PURPLE}===============================================================================${NC}"
