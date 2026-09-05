import { OSRecipe } from '../../types/os';
import { shQuote } from './helpers';
import { resolveCrypttabOptions } from './luksHardware';

/**
 * Génère un script bash automatisé et sécurisé `partition-disk.sh`
 * pour partitionner et formater un disque physique ou virtuel cible.
 */
export function generatePartitionDiskScript(recipe: OSRecipe): string {
  const pConfig = recipe.diskPartitionConfig || {
    targetDiskSizeGB: 64,
    efiSizeMB: 512,
    bootSizeMB: 1024,
    swapSizeMB: 4096,
    customHomePartition: false,
    homeSizeGB: 20,
  };

  const isBtrfs = recipe.filesystem === 'btrfs';
  const isLuks = Boolean(recipe.security.luksEncryption);
  const luksPass = recipe.security.luksPassword || 'forge_secure_2026';
  const hasSeparateBoot = pConfig.bootSizeMB > 0;
  const hasSwap = pConfig.swapSizeMB > 0;
  const hasHome = pConfig.customHomePartition && (pConfig.homeSizeGB ?? 0) > 0;

  return `#!/usr/bin/env bash
# ==============================================================================
# OSForge Studio — Script de Partitionnement & Formatage de Disque
# Recette : ${recipe.name} (${recipe.distro} / ${recipe.desktop})
# Système de fichiers : ${isBtrfs ? 'Btrfs' : 'ext4'}${isLuks ? ' + Chiffrement LUKS2' : ''}
# ==============================================================================
set -euo pipefail

RED='\\033[0;31m'
GREEN='\\033[0;32m'
YELLOW='\\033[1;33m'
CYAN='\\033[0;36m'
NC='\\033[0m'

TARGET_DISK="\${1:-}"

if [ -z "\${TARGET_DISK}" ]; then
    echo -e "\${YELLOW}[USAGE] $0 /dev/sdX  OU  $0 /dev/nvme0n1\${NC}"
    echo -e "Disques disponibles détectés :"
    lsblk -d -p -n -l -o NAME,SIZE,MODEL,TYPE | grep -E 'disk' || true
    echo ""
    read -rp "Veuillez entrer le périphérique de disque cible (ex: /dev/sdb) : " TARGET_DISK
fi

if [ ! -b "\${TARGET_DISK}" ]; then
    echo -e "\${RED}[ERREUR] Le périphérique '\${TARGET_DISK}' n'est pas un disque valide !\${NC}" >&2
    exit 1
fi

# GARDE-FOU VITAL : Interdiction absolue de cibler un disque contenant la racine hôte / ou /boot
ROOT_DEV=$(findmnt -n -o SOURCE / 2>/dev/null || true)
if [[ "\${ROOT_DEV}" == "\${TARGET_DISK}"* ]]; then
    echo -e "\${RED}[DANGER VITAL BLOCAGE] Le disque \${TARGET_DISK} héberge le système actuel (/) !\${NC}" >&2
    echo -e "\${RED}Opération immédiatement avortée pour protéger vos données.\${NC}" >&2
    exit 1
fi

echo -e "\${RED}==============================================================================\${NC}"
echo -e "\${RED} ATTENTION : TOUTES LES DONNÉES SUR \${TARGET_DISK} VONT ÊTRE DÉFINITIVEMENT DÉTRUITES !\${NC}"
echo -e "\${RED}==============================================================================\${NC}"
lsblk "\${TARGET_DISK}"
echo ""
read -rp "Êtes-vous ABSOLUMENT CERTAIN de vouloir écraser \${TARGET_DISK} ? (tapez 'OUI' pour confirmer) : " CONFIRM
if [ "\${CONFIRM}" != "OUI" ]; then
    echo -e "\${YELLOW}Opération annulée par l'utilisateur.\${NC}"
    exit 0
fi

echo -e "\${CYAN}[1/6] Démontage des partitions existantes et nettoyage de la table GPT...\${NC}"
swapoff -a 2>/dev/null || true
umount -R "/mnt/target" 2>/dev/null || true
for part in $(lsblk -n -l -o NAME "\${TARGET_DISK}" | tail -n +2); do
    umount -lf "/dev/\${part}" 2>/dev/null || true
done

# Effacement des signatures de partitions existantes
wipefs --all --force "\${TARGET_DISK}"
sgdisk --zap-all "\${TARGET_DISK}" 2>/dev/null || true
partprobe "\${TARGET_DISK}" 2>/dev/null || true
sleep 1

# Helper pour nommer les partitions (/dev/sda1 vs /dev/nvme0n1p1)
part_dev() {
    local disk="$1"
    local num="$2"
    if [[ "\${disk}" =~ [0-9]$ ]]; then
        echo "\${disk}p\${num}"
    else
        echo "\${disk}\${num}"
    fi
}

echo -e "\${CYAN}[2/6] Création de la table de partitionnement GPT (sfdisk / parted)...\${NC}"
CURRENT_PART=1

# 1. Partition EFI (ESP)
EFI_PART=$(part_dev "\${TARGET_DISK}" "\${CURRENT_PART}")
sgdisk -n "\${CURRENT_PART}:0:+${pConfig.efiSizeMB}M" -t "\${CURRENT_PART}:ef00" -c "\${CURRENT_PART}:EFI_SYSTEM" "\${TARGET_DISK}"
CURRENT_PART=$((CURRENT_PART + 1))

# 2. Partition /boot séparée (optionnelle)
BOOT_PART=""
${hasSeparateBoot ? `BOOT_PART=$(part_dev "\${TARGET_DISK}" "\${CURRENT_PART}")
sgdisk -n "\${CURRENT_PART}:0:+${pConfig.bootSizeMB}M" -t "\${CURRENT_PART}:8300" -c "\${CURRENT_PART}:BOOT_SYSTEM" "\${TARGET_DISK}"
CURRENT_PART=$((CURRENT_PART + 1))` : ''}

# 3. Partition Swap (optionnelle)
SWAP_PART=""
${hasSwap ? `SWAP_PART=$(part_dev "\${TARGET_DISK}" "\${CURRENT_PART}")
sgdisk -n "\${CURRENT_PART}:0:+${pConfig.swapSizeMB}M" -t "\${CURRENT_PART}:8200" -c "\${CURRENT_PART}:LINUX_SWAP" "\${TARGET_DISK}"
CURRENT_PART=$((CURRENT_PART + 1))` : ''}

# 4. Partition /home dédiée (optionnelle)
HOME_PART=""
${hasHome ? `HOME_PART=$(part_dev "\${TARGET_DISK}" "\${CURRENT_PART}")
sgdisk -n "\${CURRENT_PART}:0:+${pConfig.homeSizeGB}G" -t "\${CURRENT_PART}:8302" -c "\${CURRENT_PART}:HOME_USER" "\${TARGET_DISK}"
CURRENT_PART=$((CURRENT_PART + 1))` : ''}

# 5. Partition Racine (Root) : prend tout l'espace restant
ROOT_PART=$(part_dev "\${TARGET_DISK}" "\${CURRENT_PART}")
sgdisk -n "\${CURRENT_PART}:0:0" -t "\${CURRENT_PART}:8300" -c "\${CURRENT_PART}:ROOT_SYSTEM" "\${TARGET_DISK}"

partprobe "\${TARGET_DISK}"
sleep 2

echo -e "\${CYAN}[3/6] Formatage de la partition EFI (FAT32)...\${NC}"
mkfs.vfat -F32 -n "EFI" "\${EFI_PART}"

${hasSeparateBoot ? `echo -e "\${CYAN}Formatage de la partition /boot (ext4)...\${NC}"
mkfs.ext4 -F -L "BOOT" "\${BOOT_PART}"` : ''}

${hasSwap ? `echo -e "\${CYAN}Initialisation de la partition Swap...\${NC}"
mkswap -L "SWAP" "\${SWAP_PART}"` : ''}

${hasHome ? `echo -e "\${CYAN}Formatage de la partition /home (${isBtrfs ? 'btrfs' : 'ext4'})...\${NC}"
${isBtrfs ? `mkfs.btrfs -f -L "HOME" "\${HOME_PART}"` : `mkfs.ext4 -F -L "HOME" "\${HOME_PART}"`}` : ''}

echo -e "\${CYAN}[4/6] Configuration du volume racine (Root)${isLuks ? ' avec LUKS2' : ''}...\${NC}"
FINAL_ROOT_DEV="\${ROOT_PART}"

${isLuks ? `# Formatage Chiffré LUKS2
echo -n ${shQuote(luksPass)} | cryptsetup luksFormat --type luks2 --cipher aes-xts-plain64 --key-size 512 --hash sha512 --pbkdf argon2id --batch-mode "\${ROOT_PART}" -
echo -n ${shQuote(luksPass)} | cryptsetup open "\${ROOT_PART}" cryptroot -
FINAL_ROOT_DEV="/dev/mapper/cryptroot"
` : ''}

echo -e "\${CYAN}[5/6] Formatage du système de fichiers (${isBtrfs ? 'Btrfs' : 'ext4'})...\${NC}"
${isBtrfs ? `mkfs.btrfs -f -L "ROOT" "\${FINAL_ROOT_DEV}"

# Création des sous-volumes Btrfs standard
mkdir -p /mnt/btrfs_temp
mount "\${FINAL_ROOT_DEV}" /mnt/btrfs_temp
btrfs subvolume create /mnt/btrfs_temp/@
btrfs subvolume create /mnt/btrfs_temp/@home
btrfs subvolume create /mnt/btrfs_temp/@snapshots
btrfs subvolume create /mnt/btrfs_temp/@var_log
umount /mnt/btrfs_temp
rmdir /mnt/btrfs_temp

# Montage des sous-volumes sous /mnt/target
mkdir -p /mnt/target
mount -o noatime,compress=zstd:1,subvol=@ "\${FINAL_ROOT_DEV}" /mnt/target
mkdir -p /mnt/target/home /mnt/target/.snapshots /mnt/target/var/log
mount -o noatime,compress=zstd:1,subvol=@home "\${FINAL_ROOT_DEV}" /mnt/target/home
mount -o noatime,compress=zstd:1,subvol=@snapshots "\${FINAL_ROOT_DEV}" /mnt/target/.snapshots
mount -o noatime,compress=zstd:1,subvol=@var_log "\${FINAL_ROOT_DEV}" /mnt/target/var/log
` : `mkfs.ext4 -F -L "ROOT" "\${FINAL_ROOT_DEV}"
mkdir -p /mnt/target
mount "\${FINAL_ROOT_DEV}" /mnt/target
`}

# Montage de l'EFI et des répertoires auxiliaires
mkdir -p /mnt/target/boot/efi
mount "\${EFI_PART}" /mnt/target/boot/efi

${hasSeparateBoot ? `mkdir -p /mnt/target/boot
mount "\${BOOT_PART}" /mnt/target/boot` : ''}

${hasHome ? `mkdir -p /mnt/target/home
mount "\${HOME_PART}" /mnt/target/home` : ''}

echo -e "\${CYAN}[6/6] Génération du fichier /etc/fstab avec les vrais UUIDs...\${NC}"
mkdir -p /mnt/target/etc
cat > /mnt/target/etc/fstab << FSTAB_EOF
# /etc/fstab généré automatiquement par OSForge Studio
# <file system>                             <mount point>       <type>      <options>                           <dump> <pass>
FSTAB_EOF

ROOT_UUID=$(blkid -s UUID -o value "\${FINAL_ROOT_DEV}")
EFI_UUID=$(blkid -s UUID -o value "\${EFI_PART}")

${isBtrfs ? `echo "UUID=\${ROOT_UUID}  /                   btrfs       noatime,compress=zstd:1,subvol=@            0      0" >> /mnt/target/etc/fstab
echo "UUID=\${ROOT_UUID}  /home               btrfs       noatime,compress=zstd:1,subvol=@home        0      0" >> /mnt/target/etc/fstab
echo "UUID=\${ROOT_UUID}  /.snapshots         btrfs       noatime,compress=zstd:1,subvol=@snapshots   0      0" >> /mnt/target/etc/fstab
echo "UUID=\${ROOT_UUID}  /var/log            btrfs       noatime,compress=zstd:1,subvol=@var_log     0      0" >> /mnt/target/etc/fstab` : `echo "UUID=\${ROOT_UUID}  /                   ext4        defaults,noatime                    0      1" >> /mnt/target/etc/fstab`}

echo "UUID=\${EFI_UUID}   /boot/efi           vfat        umask=0077                          0      2" >> /mnt/target/etc/fstab

${hasSeparateBoot ? `BOOT_UUID=$(blkid -s UUID -o value "\${BOOT_PART}")
echo "UUID=\${BOOT_UUID}  /boot               ext4        defaults,noatime                    0      2" >> /mnt/target/etc/fstab` : ''}

${hasSwap ? `SWAP_UUID=$(blkid -s UUID -o value "\${SWAP_PART}")
echo "UUID=\${SWAP_UUID}  none                swap        sw                                  0      0" >> /mnt/target/etc/fstab` : ''}

${isLuks ? `# Ajout dans /etc/crypttab
LUKS_UUID=$(blkid -s UUID -o value "\${ROOT_PART}")
cat > /mnt/target/etc/crypttab << CRYPT_EOF
cryptroot UUID=\${LUKS_UUID} none ${resolveCrypttabOptions(recipe.security)}
CRYPT_EOF
` : ''}

echo ""
echo -e "\${GREEN}==============================================================================\${NC}"
echo -e "\${GREEN} SUCCÈS : Le disque \${TARGET_DISK} a été partitionné et monté sous /mnt/target !\${NC}"
echo -e "\${GREEN} Structure créée :\${NC}"
lsblk "\${TARGET_DISK}"
echo ""
echo -e "\${GREEN}Contenu généré de /mnt/target/etc/fstab :\${NC}"
cat /mnt/target/etc/fstab
echo -e "\${GREEN}==============================================================================\${NC}"
`;
}
