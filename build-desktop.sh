#!/usr/bin/env bash
set -e

WORK_DIR="/var/tmp/mados-build-$$"
ROOTFS_DIR="${WORK_DIR}/rootfs"
ISO_DIR="${WORK_DIR}/iso"
OUTPUT_DIR="$(pwd)/dist"

mkdir -p "${ROOTFS_DIR}" "${ISO_DIR}" "${OUTPUT_DIR}"

echo -e "\033[0;33m[1/7] 🏗️ Initialisation du RootFS minimal Debian Bookworm...\033[0m"
debootstrap --arch="amd64" \
  --include="linux-image-amd64,live-boot,systemd-sysv,initramfs-tools,ca-certificates,locales,sudo,curl,wget,gnupg,iproute2,pciutils,usbutils" \
  bookworm "${ROOTFS_DIR}" "http://deb.debian.org/debian"

echo -e "\033[0;33m[2/7] 🎨 Installation du bureau graphique XFCE et logiciels...\033[0m"
mount --bind /dev "${ROOTFS_DIR}/dev"
mount --bind /dev/pts "${ROOTFS_DIR}/dev/pts"
mount --bind /proc "${ROOTFS_DIR}/proc"
mount --bind /sys "${ROOTFS_DIR}/sys"

cat << 'CHROOT_SCRIPT' | chroot "${ROOTFS_DIR}" /bin/bash
set -e
export DEBIAN_FRONTEND=noninteractive

# Empêche les démons de démarrer automatiquement dans le chroot
cat << 'POLICY_EOF' > /usr/sbin/policy-rc.d
#!/bin/sh
exit 101
POLICY_EOF
chmod +x /usr/sbin/policy-rc.d

echo "fr_FR.UTF-8 UTF-8" > /etc/locale.gen
echo "en_US.UTF-8 UTF-8" >> /etc/locale.gen
locale-gen
update-locale LANG=fr_FR.UTF-8

echo "mados-desktop" > /etc/hostname
echo "127.0.0.1 localhost mados-desktop" > /etc/hosts

apt-get update -y
apt-get install -y --no-install-recommends \
  xfce4 xfce4-terminal xfce4-goodies \
  lightdm lightdm-gtk-greeter \
  xorg xserver-xorg-video-all xserver-xorg-input-all \
  mesa-vulkan-drivers \
  network-manager network-manager-gnome \
  pulseaudio pavucontrol \
  firefox-esr neofetch htop btop || true

useradd -m -s /bin/bash -G sudo,audio,video,netdev madtrix || true
echo "madtrix:madtrix" | chpasswd
echo "root:root" | chpasswd
echo "madtrix ALL=(ALL) NOPASSWD:ALL" > /etc/sudoers.d/99-madtrix
chmod 0440 /etc/sudoers.d/99-madtrix

mkdir -p /etc/lightdm/lightdm.conf.d
cat << 'LIGHTDM_CONF' > /etc/lightdm/lightdm.conf.d/80-autologin.conf
[Seat:*]
autologin-user=madtrix
autologin-user-timeout=0
user-session=xfce
LIGHTDM_CONF

mkdir -p /etc/live
cat << 'LIVE_CONF' > /etc/live/boot.conf
export LIVE_BOOT_USERNAME=madtrix
export LIVE_BOOT_HOSTNAME=mados-desktop
LIVE_CONF

apt-get clean
rm -rf /var/lib/apt/lists/* /tmp/*
rm -f /usr/sbin/policy-rc.d
CHROOT_SCRIPT

echo -e "\033[0;33m[3/7] 🧹 Démontage des systèmes virtuels...\033[0m"
fuser -k -m "${ROOTFS_DIR}" 2>/dev/null || true
sleep 1
umount -lf "${ROOTFS_DIR}/sys" || true
umount -lf "${ROOTFS_DIR}/proc" || true
umount -lf "${ROOTFS_DIR}/dev/pts" || true
umount -lf "${ROOTFS_DIR}/dev" || true

echo -e "\033[0;33m[4/7] 🗜️ Compression SquashFS (XZ) du système complet...\033[0m"
mkdir -p "${ISO_DIR}/live"
mksquashfs "${ROOTFS_DIR}" "${ISO_DIR}/live/filesystem.squashfs" -comp xz -e boot

echo -e "\033[0;33m[5/7] 📦 Préparation du noyau Linux et Initrd...\033[0m"
cp "${ROOTFS_DIR}/boot"/vmlinuz* "${ISO_DIR}/live/vmlinuz" 2>/dev/null || true
cp "${ROOTFS_DIR}/boot"/initrd.img* "${ISO_DIR}/live/initrd" 2>/dev/null || true

if [ ! -f "${ISO_DIR}/live/vmlinuz" ] || [ ! -f "${ISO_DIR}/live/initrd" ]; then
    echo -e "\033[0;31m[ERREUR FATALE] Noyau ou initrd introuvable dans ${ROOTFS_DIR}/boot !\033[0m"
    exit 1
fi

echo -e "\033[0;33m[6/7] 🖲️ Configuration GRUB avec recherche automatique de la racine...\033[0m"
mkdir -p "${ISO_DIR}/boot/grub/i386-pc" "${ISO_DIR}/EFI/BOOT"

cat << 'GRUB_CONFIG' > "${ISO_DIR}/boot/grub/grub.cfg"
set default=0
set timeout=3

insmod all_video
insmod font
insmod part_msdos
insmod part_gpt
insmod iso9660
insmod search

search --no-floppy --set=root --file /live/vmlinuz

menuentry 'MadOS Desktop (Session Graphique Live)' {
    linux /live/vmlinuz boot=live components quiet splash
    initrd /live/initrd
}

menuentry 'MadOS Desktop (Mode Sans Echec / Failsafe)' {
    linux /live/vmlinuz boot=live components nomodeset
    initrd /live/initrd
}
GRUB_CONFIG

grub-mkstandalone \
  --format=i386-pc \
  --output="${ISO_DIR}/boot/grub/i386-pc/core.img" \
  --install-modules="linux normal iso9660 biosdisk search search_fs_file search_label part_msdos part_gpt all_video font gfxterm test echo sleep cat help ls" \
  --modules="linux normal iso9660 biosdisk search search_fs_file search_label part_msdos part_gpt all_video font gfxterm" \
  --locales="" --fonts="" "boot/grub/grub.cfg=${ISO_DIR}/boot/grub/grub.cfg"

CDBOOT_IMG=$(find /usr/lib/grub /usr/share/grub /usr/local/lib/grub -name cdboot.img 2>/dev/null | head -1 || true)
if [ -n "$CDBOOT_IMG" ] && [ -f "$CDBOOT_IMG" ]; then
    cat "$CDBOOT_IMG" "${ISO_DIR}/boot/grub/i386-pc/core.img" > "${ISO_DIR}/boot/grub/i386-pc/eltorito.img"
else
    cp "${ISO_DIR}/boot/grub/i386-pc/core.img" "${ISO_DIR}/boot/grub/i386-pc/eltorito.img"
fi

grub-mkstandalone \
  --format=x86_64-efi \
  --output="${ISO_DIR}/EFI/BOOT/bootx64.efi" \
  --install-modules="linux normal iso9660 search search_fs_file search_label part_msdos part_gpt all_video font gfxterm" \
  --modules="linux normal iso9660 search search_fs_file search_label part_msdos part_gpt all_video font gfxterm" \
  --locales="" --fonts="" "boot/grub/grub.cfg=${ISO_DIR}/boot/grub/grub.cfg"

BOOT_HYBRID_IMG=$(find /usr/lib/grub /usr/share/grub /usr/local/lib/grub -name boot_hybrid.img 2>/dev/null | head -1 || true)
ISOHYBRID_MBR_OPT=""
if [ -n "$BOOT_HYBRID_IMG" ] && [ -f "$BOOT_HYBRID_IMG" ]; then
    ISOHYBRID_MBR_OPT="-isohybrid-mbr $BOOT_HYBRID_IMG"
fi

echo -e "\033[0;33m[7/7] 📀 Création de l'ISO hybride amorçable (BIOS + UEFI)...\033[0m"
xorriso -as mkisofs \
  -iso-level 3 \
  -full-iso9660-filenames \
  -volid "MADOS" \
  -eltorito-boot boot/grub/i386-pc/eltorito.img \
    -no-emul-boot -boot-load-size 4 -boot-info-table \
  --eltorito-catalog boot/grub/boot.cat \
  ${ISOHYBRID_MBR_OPT} \
  -output "${OUTPUT_DIR}/mados-1.0-x86_64.iso" \
  "${ISO_DIR}"

cp "${OUTPUT_DIR}/mados-1.0-x86_64.iso" "${OUTPUT_DIR}/forgeos-1.0-x86_64.iso"

rm -rf "${WORK_DIR}"

echo -e "\033[0;32m=======================================================\033[0m"
echo -e "\033[0;32m   🎉 ISO Desktop générée avec succès : ${OUTPUT_DIR}/mados-1.0-x86_64.iso\033[0m"
echo -e "\033[0;32m   Taille : $(du -h "${OUTPUT_DIR}/mados-1.0-x86_64.iso" | cut -f1)\033[0m"
echo -e "\033[0;32m=======================================================\033[0m"
