import { OSRecipe } from '../../types/os';
import { NonDebianFamily } from './types';
import { resolvePackageList } from './packages';

/**
 * Génère le script autonome bundle-offline-cache.sh
 * Exécuté sur une machine connectée pour télécharger, indexer et archiver
 * l'intégralité des paquets et dépendances nécessaires à la recette.
 */
export function generateOfflineCacheBundleScript(recipe: OSRecipe): string {
  const distroId = recipe.distro || 'debian';
  const suite = recipe.distroSuite || (distroId === 'ubuntu' ? 'noble' : 'bookworm');
  const cacheDir = recipe.offlineCachePath || './offline-cache';
  const pkgList = resolvePackageList(recipe);
  const packagesStr = pkgList.join(' ');

  const isDebianLike = ['debian', 'ubuntu', 'kali', 'raspbian', 'linuxmint', 'popos', 'parrot'].includes(distroId);
  const isArchLike = distroId === 'arch' || distroId === 'cachyos' || distroId === 'endeavouros';
  const isFedoraLike = distroId === 'fedora' || distroId === 'rocky' || distroId === 'almalinux';

  return `#!/usr/bin/env bash
# ==============================================================================
# OSForge Studio — Assistant de Mise en Cache Hors-Ligne (Air-Gapped Builder)
# Recette : ${recipe.name || 'OSForge Linux'} (${distroId} ${suite})
# Date de génération : ${new Date().toISOString()}
# ==============================================================================
set -euo pipefail

# Couleurs d'affichage
RED='\\033[0;31m'
GREEN='\\033[0;32m'
BLUE='\\033[0;34m'
CYAN='\\033[0;36m'
YELLOW='\\033[1;33m'
BOLD='\\033[1m'
NC='\\033[0m'

echo -e "\${BLUE}\${BOLD}====================================================================\${NC}"
echo -e "\${BLUE}\${BOLD}  🌐 OSForge Studio — Générateur de Bundle Hors-Ligne (Air-Gapped)\${NC}"
echo -e "\${BLUE}\${BOLD}====================================================================\${NC}"

# 1. Vérification des privilèges root
if [ "$(id -u)" -ne 0 ]; then
    echo -e "\${RED}[ERREUR] Ce script de mise en cache doit être exécuté en tant que root (sudo).\${NC}"
    exit 1
fi

CACHE_ROOT="${cacheDir}"
mkdir -p "$CACHE_ROOT"
cd "$CACHE_ROOT"

echo -e "\${CYAN}[1/4] Préparation de l'environnement de cache local dans : $CACHE_ROOT\${NC}"

${isDebianLike ? `# --- FAMILLE DEBIAN / UBUNTU ---
echo -e "\${CYAN}[2/4] Téléchargement des paquets .deb et résolution récursive des dépendances...\${NC}"

DEB_DIR="$CACHE_ROOT/debs"
BOOTSTRAP_DIR="$CACHE_ROOT/debootstrap-cache"
mkdir -p "$DEB_DIR" "$BOOTSTRAP_DIR"

# Outil d'indexation locale Packages.gz
if ! command -v dpkg-scanpackages &>/dev/null; then
    echo -e "\${YELLOW}Installation de dpkg-dev pour générer l'index local...\${NC}"
    apt-get update -qq && apt-get install -y --no-install-recommends dpkg-dev
fi

# Téléchargement uniquement (--download-only) sans installation
echo -e "\${BLUE}Téléchargement de la sélection logicielle...\${NC}"
apt-get update -qq

TARGET_PACKAGES="${packagesStr}"

if [ -n "$TARGET_PACKAGES" ]; then
    apt-get install --download-only -y \\
        -o Dir::Cache="$CACHE_ROOT" \\
        -o Dir::Cache::archives="$DEB_DIR" \\
        $TARGET_PACKAGES || true
fi

# Pré-téléchargement du socle debootstrap
if command -v debootstrap &>/dev/null; then
    echo -e "\${BLUE}Mise en cache du socle debootstrap pour ${suite}...\${NC}"
    TMP_BOOTSTRAP=$(mktemp -d)
    debootstrap --download-only --cache-dir="$BOOTSTRAP_DIR" "${suite}" "$TMP_BOOTSTRAP" || true
    rm -rf "$TMP_BOOTSTRAP"
fi

echo -e "\${CYAN}[3/4] Indexation du dépôt local avec dpkg-scanpackages...\${NC}"
cd "$DEB_DIR"
dpkg-scanpackages . /dev/null 2>/dev/null | gzip -9c > Packages.gz

echo -e "\${GREEN}[OK]\${NC} Index Packages.gz généré avec $(find . -name "*.deb" | wc -l) paquets .deb."
cd "$CACHE_ROOT"
` : isArchLike ? `# --- FAMILLE ARCH LINUX ---
echo -e "\${CYAN}[2/4] Téléchargement des paquets pacman (.pkg.tar.zst)...\${NC}"

PKG_DIR="$CACHE_ROOT/pkgs"
mkdir -p "$PKG_DIR"

if [ -n "${packagesStr}" ]; then
    pacman -Syw --cachedir "$PKG_DIR" --noconfirm base linux linux-firmware ${packagesStr} || true
fi

echo -e "\${CYAN}[3/4] Création de la base de données de dépôt avec repo-add...\${NC}"
if ls "$PKG_DIR"/*.pkg.tar.zst &>/dev/null; then
    repo-add "$PKG_DIR/offline.db.tar.gz" "$PKG_DIR"/*.pkg.tar.zst
    echo -e "\${GREEN}[OK]\${NC} Base de données locale offline.db.tar.gz créée."
fi
` : isFedoraLike ? `# --- FAMILLE FEDORA / ROCKY ---
echo -e "\${CYAN}[2/4] Téléchargement des paquets RPM et dépendances avec dnf...\${NC}"

RPM_DIR="$CACHE_ROOT/rpms"
mkdir -p "$RPM_DIR"

if ! command -v createrepo_c &>/dev/null; then
    dnf install -y createrepo_c || true
fi

if [ -n "${packagesStr}" ]; then
    dnf download --resolve --alldeps --destdir="$RPM_DIR" ${packagesStr} || true
fi

echo -e "\${CYAN}[3/4] Génération des métadonnées repodata avec createrepo_c...\${NC}"
if ls "$RPM_DIR"/*.rpm &>/dev/null; then
    createrepo_c "$RPM_DIR"
    echo -e "\${GREEN}[OK]\${NC} Métadonnées repodata générées."
fi
` : `# Autres distributions
echo -e "\${YELLOW}[INFO] Mode cache générique : vérifiez le gestionnaire de paquets de ${distroId}.\${NC}"
`}

echo -e "\${CYAN}[4/4] Création de l'archive tarball autonome...\${NC}"
ARCHIVE_NAME="offline-cache-${distroId}-${suite}.tar.gz"
cd "$(dirname "$CACHE_ROOT")"
tar -czf "$ARCHIVE_NAME" "$(basename "$CACHE_ROOT")"

echo ""
echo -e "\${GREEN}\${BOLD}====================================================================\${NC}"
echo -e "\${GREEN}\${BOLD}  ✓ Bundle hors-ligne généré avec succès !\${NC}"
echo -e "\${GREEN}\${BOLD}  Fichier : $(pwd)/$ARCHIVE_NAME\${NC}"
echo -e "\${GREEN}\${BOLD}====================================================================\${NC}"
echo -e "Pour compiler sur votre machine hors-ligne / en salle blanche :"
echo -e " 1. Copiez '$ARCHIVE_NAME' sur votre machine cible."
echo -e " 2. Décompressez-le : tar -xzf '$ARCHIVE_NAME'"
echo -e " 3. Lancez votre build : sudo ./build.sh"
`;
}

/**
 * Configure les sources du dépôt local file:/// dans le chroot lors du build hors-ligne
 */
export function offlineRepoConfigCmd(recipe: OSRecipe, family: 'debian' | NonDebianFamily): string {
  if (!recipe.enableOfflineCache) return '';

  const cachePath = recipe.offlineCachePath || './offline-cache';

  if (family === 'debian') {
    return `# ==============================================================================
# Configuration Réseau Isolé / Dépôt Local Hors-Ligne (Air-Gapped)
# ==============================================================================
if [ -d "${cachePath}/debs" ]; then
    echo -e "\${BLUE}[OFFLINE] Configuration du dépôt local file:/var/cache/offline-cache/debs...\${NC}"
    mkdir -p "\${ROOTFS_DIR}/var/cache/offline-cache/debs"
    cp -r "${cachePath}/debs/"* "\${ROOTFS_DIR}/var/cache/offline-cache/debs/" 2>/dev/null || true

    # Remplacement des sources distantes par le miroir local avec trusted=yes
    cat << 'OFFLINE_SOURCES_EOF' > "\${ROOTFS_DIR}/etc/apt/sources.list"
deb [trusted=yes] file:/var/cache/offline-cache/debs ./
OFFLINE_SOURCES_EOF

    # Suppression des sources distantes annexes
    rm -f "\${ROOTFS_DIR}/etc/apt/sources.list.d/"*.list "\${ROOTFS_DIR}/etc/apt/sources.list.d/"*.sources 2>/dev/null || true

    # Désactivation des timeouts internet
    cat << 'APT_OFFLINE_CONF' > "\${ROOTFS_DIR}/etc/apt/apt.conf.d/99offline"
Acquire::http::Timeout "1";
Acquire::https::Timeout "1";
APT::Get::Assume-Yes "true";
APT_OFFLINE_CONF
fi
`;
  }

  if (family === 'arch') {
    return `# [Arch Offline] Configuration du dépôt local
if [ -d "${cachePath}/pkgs" ]; then
    echo -e "\${BLUE}[OFFLINE] Montage du cache Arch local file:///var/cache/offline-cache/pkgs...\${NC}"
    mkdir -p "\${ROOTFS_DIR}/var/cache/offline-cache/pkgs"
    cp -r "${cachePath}/pkgs/"* "\${ROOTFS_DIR}/var/cache/offline-cache/pkgs/" 2>/dev/null || true

    cat << 'PACMAN_OFFLINE_EOF' >> "\${ROOTFS_DIR}/etc/pacman.conf"
[offline-custom]
SigLevel = Optional TrustAll
Server = file:///var/cache/offline-cache/pkgs
PACMAN_OFFLINE_EOF
fi
`;
  }

  if (family === 'fedora') {
    return `# [Fedora Offline] Configuration du dépôt local RPM
if [ -d "${cachePath}/rpms" ]; then
    echo -e "\${BLUE}[OFFLINE] Montage du cache Fedora local file:///var/cache/offline-cache/rpms...\${NC}"
    mkdir -p "\${ROOTFS_DIR}/var/cache/offline-cache/rpms"
    cp -r "${cachePath}/rpms/"* "\${ROOTFS_DIR}/var/cache/offline-cache/rpms/" 2>/dev/null || true

    mkdir -p "\${ROOTFS_DIR}/etc/yum.repos.d"
    rm -f "\${ROOTFS_DIR}/etc/yum.repos.d/"*.repo 2>/dev/null || true
    cat << 'DNF_OFFLINE_EOF' > "\${ROOTFS_DIR}/etc/yum.repos.d/offline.repo"
[offline]
name=Offline Cache
baseurl=file:///var/cache/offline-cache/rpms
enabled=1
gpgcheck=0
DNF_OFFLINE_EOF
fi
`;
  }

  return '';
}
