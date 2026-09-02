import { OSRecipe } from '../../types/os';
import { sanitizeOsSlug } from './branding';

/**
 * Génère le script de gravure USB sécurisé avec support optionnel de persistance
 */
export function generateUsbFlashScript(recipe: OSRecipe, format: 'bash' | 'powershell' = 'bash'): string {
  if (format === 'powershell') {
    return generateUsbFlashWindows(recipe);
  }
  return generateUsbFlashBash(recipe);
}

/**
 * Script Bash pour Linux & macOS (flash-usb.sh)
 */
export function generateUsbFlashBash(recipe: OSRecipe): string {
  const slug = sanitizeOsSlug(recipe.branding.osName || recipe.name || 'forgeos');
  const isoName = `${slug}-${recipe.distroVersion || '1.0'}-${recipe.arch || 'x86_64'}.iso`;
  const persistenceEnabled = recipe.enableUsbPersistence !== false;

  return `#!/usr/bin/env bash
# ==============================================================================
# OSForge Studio - Script de Gravure USB Sécurisé avec Persistance Live
# Système cible : ${recipe.branding.osName || recipe.name} (${recipe.distro} ${recipe.distroVersion})
# ==============================================================================

set -euo pipefail

RED='\\033[0;31m'
GREEN='\\033[0;32m'
YELLOW='\\033[1;33m'
BLUE='\\033[0;34m'
CYAN='\\033[0;36m'
BOLD='\\033[1m'
NC='\\033[0m'

echo -e "\${BLUE}\${BOLD}====================================================================\${NC}"
echo -e "\${CYAN}\${BOLD}  OSForge Studio - Gravure Clé USB Live & Partition de Persistance \${NC}"
echo -e "\${BLUE}\${BOLD}====================================================================\${NC}"

# 1. Vérification des privilèges root
if [ "$(id -u)" -ne 0 ]; then
    echo -e "\${RED}[ERREUR] Ce script doit être exécuté en tant que root (sudo).\${NC}"
    echo "Usage: sudo ./flash-usb.sh [chemin_vers_iso] [peripherique_cible]"
    exit 1
fi

# 2. Détection du fichier ISO
ISO_PATH="\${1:-}"
if [ -z "$ISO_PATH" ]; then
    if [ -f "dist/${isoName}" ]; then
        ISO_PATH="dist/${isoName}"
    elif [ -f "${isoName}" ]; then
        ISO_PATH="${isoName}"
    elif [ -f "forgeos-1.0-x86_64.iso" ]; then
        ISO_PATH="forgeos-1.0-x86_64.iso"
    else
        echo -e "\${YELLOW}[?] Veuillez spécifier le chemin vers le fichier ISO :\${NC}"
        read -r -p "Chemin ISO: " ISO_PATH
    fi
fi

if [ ! -f "$ISO_PATH" ]; then
    echo -e "\${RED}[ERREUR] Le fichier ISO '$ISO_PATH' est introuvable.\${NC}"
    exit 1
fi

ISO_SIZE_BYTES=$(stat -c%s "$ISO_PATH" 2>/dev/null || stat -f%z "$ISO_PATH")
ISO_SIZE_MB=$(( ISO_SIZE_BYTES / 1024 / 1024 ))
echo -e "\${GREEN}[OK]\${NC} Image ISO trouvée : \${BOLD}$ISO_PATH\${NC} (\${ISO_SIZE_MB} Mo)"
echo ""

# 3. Détection des périphériques de stockage USB connectés
TARGET_DEV="\${2:-}"
if [ -z "$TARGET_DEV" ]; then
    echo -e "\${CYAN}[1/4] Périphériques amovibles / USB détectés sur votre machine :\${NC}"
    echo "--------------------------------------------------------------------"
    lsblk -d -p -n -l -o NAME,SIZE,MODEL,TRAN,HOTPLUG 2>/dev/null | grep -E "(usb|1$)" || lsblk -d -p -o NAME,SIZE,MODEL,TYPE
    echo "--------------------------------------------------------------------"
    echo ""
    echo -e "\${YELLOW}[ATTENTION] Ne sélectionnez JAMAIS votre disque interne (ex: /dev/sda ou /dev/nvme0n1) !\${NC}"
    read -r -p "Entrez le périphérique cible à flasher (ex: /dev/sdb ou /dev/sdc) : " TARGET_DEV
fi

# 4. Gardes-fous de sécurité stricts (anti-destruction de disque système)
if [ ! -b "$TARGET_DEV" ]; then
    echo -e "\${RED}[ERREUR] '$TARGET_DEV' n'est pas un périphérique bloc valide.\${NC}"
    exit 1
fi

ROOT_DISK=$(findmnt -n -o SOURCE / | sed -E 's/p?[0-9]+$//' || true)
BOOT_DISK=$(findmnt -n -o SOURCE /boot 2>/dev/null | sed -E 's/p?[0-9]+$//' || true)

if [ "$TARGET_DEV" = "$ROOT_DISK" ] || [ "$TARGET_DEV" = "$BOOT_DISK" ]; then
    echo -e "\${RED}[DANGER ABSOLU] '$TARGET_DEV' contient le système en cours d'exécution (/ ou /boot) !\${NC}"
    echo -e "\${RED}Opération bloquée immédiatement pour protéger votre ordinateur.\${NC}"
    exit 1
fi

echo ""
echo -e "\${RED}\${BOLD}[AVERTISSEMENT] Toutes les données sur $TARGET_DEV seront irrémédiablement écrasées !\${NC}"
read -r -p "Confirmez-vous la gravure sur $TARGET_DEV ? [o/N] : " CONFIRM
if [[ ! "$CONFIRM" =~ ^[oOyY]$ ]]; then
    echo -e "\${YELLOW}Opération annulée.\${NC}"
    exit 0
fi

# 5. Démontage des partitions existantes sur le périphérique
echo -e "\${BLUE}[2/4] Démontage des volumes montés sur $TARGET_DEV...\${NC}"
umount \${TARGET_DEV}* 2>/dev/null || true

# 6. Gravure directe de l'ISO
echo -e "\${BLUE}[3/4] Gravure de l'image ISO ($ISO_SIZE_MB Mo) sur $TARGET_DEV...\${NC}"
dd if="$ISO_PATH" of="$TARGET_DEV" bs=4M status=progress conv=fdatasync
sync

${persistenceEnabled ? `# 7. Création de la Partition de Persistance (Debian Live Casper/Union)
echo -e "\${BLUE}[4/4] Configuration de la partition de persistance sur le reste de la clé USB...\${NC}"

# Re-lecture de la table des partitions
partprobe "$TARGET_DEV" 2>/dev/null || true
sleep 2

# Récupération du dernier secteur utilisé par l'ISO
LAST_SECTOR=$(fdisk -l "$TARGET_DEV" 2>/dev/null | grep -E "^$TARGET_DEV" | awk '{print $3}' | sort -n | tail -n 1 || true)

if [ -n "$LAST_SECTOR" ]; then
    START_SECTOR=$(( LAST_SECTOR + 2048 ))
    echo -e "\${CYAN}Création de la partition de persistance à partir du secteur $START_SECTOR...\${NC}"
    
    # Création de la partition avec sfdisk ou parted
    (
      echo "start=$START_SECTOR, type=83"
    ) | sfdisk --append "$TARGET_DEV" 2>/dev/null || parted -s "$TARGET_DEV" mkpart primary ext4 \${START_SECTOR}s 100% 2>/dev/null || true

    partprobe "$TARGET_DEV" 2>/dev/null || true
    sleep 2

    # Identification de la nouvelle partition créée
    PERSIST_PART=$(lsblk -p -n -l -o NAME "$TARGET_DEV" | tail -n 1)
    if [ "$PERSIST_PART" != "$TARGET_DEV" ]; then
        echo -e "\${CYAN}Formatage en ext4 avec le label 'persistence' sur $PERSIST_PART...\${NC}"
        mkfs.ext4 -F -L "persistence" "$PERSIST_PART" 2>/dev/null || true

        TMP_MNT=$(mktemp -d)
        mount "$PERSIST_PART" "$TMP_MNT"
        echo "/ union" > "$TMP_MNT/persistence.conf"
        sync
        umount "$TMP_MNT"
        rm -rf "$TMP_MNT"
        echo -e "\${GREEN}[OK]\${NC} Partition de persistance active ($PERSIST_PART : / union)"
    fi
fi` : `# Persistance non demandée
echo -e "\${BLUE}[4/4] Finalisation...\${NC}"`}

sync
echo ""
echo -e "\${GREEN}\${BOLD}====================================================================\${NC}"
echo -e "\${GREEN}\${BOLD}  ✓ Gravure terminée avec succès sur $TARGET_DEV !\${NC}"
echo -e "\${GREEN}\${BOLD}====================================================================\${NC}"
echo -e "Vous pouvez maintenant retirer votre clé USB et démarrer votre machine dessus."
${persistenceEnabled ? 'echo -e "Au menu de boot, sélectionnez \\"Live\\" : vos réglages et fichiers seront automatiquement persistés."' : ''}
`;
}

/**
 * Script Batch / PowerShell pour Windows (flash-usb.bat)
 */
export function generateUsbFlashWindows(recipe: OSRecipe): string {
  const slug = sanitizeOsSlug(recipe.branding.osName || recipe.name || 'forgeos');
  const isoName = `${slug}-${recipe.distroVersion || '1.0'}-${recipe.arch || 'x86_64'}.iso`;

  return `@echo off
:: ==============================================================================
:: OSForge Studio - Assistant de Gravure USB pour Windows
:: Image cible : ${recipe.branding.osName || recipe.name}
:: ==============================================================================

chcp 65001 >nul
title OSForge Studio - Gravure Clé USB Live

echo ====================================================================
echo   OSForge Studio - Gravure Clé USB & Support Live
echo ====================================================================
echo.

:: Vérification élévation Administrateur
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo [ERREUR] Ce script doit etre execute en tant qu'Administrateur.
    echo Faites un clic droit sur flash-usb.bat puis "Executer en tant qu'administrateur".
    pause
    exit /b 1
)

:: Recherche de l'ISO
set "ISO_FILE=${isoName}"
if not exist "%ISO_FILE%" (
    if exist "dist\\${isoName}" (
        set "ISO_FILE=dist\\${isoName}"
    ) else if exist "forgeos-1.0-x86_64.iso" (
        set "ISO_FILE=forgeos-1.0-x86_64.iso"
    )
)

echo [OK] Image ISO detectee : %ISO_FILE%
echo.

echo Disques amovibles USB detectes sur votre PC :
echo --------------------------------------------------------------------
powershell -NoProfile -Command "Get-Disk | Where-Object { $_.BusType -eq 'USB' } | Select-Object Number, FriendlyName, @{Name='Size_GB';Expression={[math]::Round($_.Size / 1GB, 2)}} | Format-Table -AutoSize"
echo --------------------------------------------------------------------
echo.

echo Option recommandee sous Windows :
echo 1) Utiliser Rufus (officiel et gratuit) : https://rufus.ie/
echo    - Selectionnez votre cle USB
echo    - Selectionnez le fichier ISO : %ISO_FILE%
echo    - Taille de persistance : Faites glisser le curseur (ex: 4 Go) pour activer la persistance
echo.
echo 2) Ou graver avec BalenaEtcher : https://etcher.balena.io/
echo.

set /p "LAUNCH_RUFUS=Voulez-vous ouvrir le dossier de l'ISO dans l'Explorateur ? [O/N] : "
if /i "%LAUNCH_RUFUS%"=="O" (
    explorer.exe /select,"%ISO_FILE%"
)

echo.
echo Operation terminee.
pause
`;
}
