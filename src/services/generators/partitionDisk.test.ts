import { describe, it, expect } from 'vitest';
import { generatePartitionDiskScript } from './partitionDisk';
import { OSRecipe } from '../../types/os';

const baseRecipe: OSRecipe = {
  id: 'part-test',
  name: 'Partition Test OS',
  description: 'Test de génération de partition-disk.sh',
  distro: 'debian',
  distroVersion: '13',
  distroSuite: 'trixie',
  arch: 'x86_64',
  outputFormat: 'iso_hybrid',
  desktop: 'kde',
  displayManager: 'sddm',
  kernel: 'xanmod',
  selectedPackages: [],
  customPackages: [],
  branding: {
    osName: 'PartOS',
    editionName: 'Standard',
    version: '1.0',
    accentColor: '#38bdf8',
    wallpaperPreset: 'minimal',
    bootSplashTheme: 'minimal',
  },
  user: {
    username: 'admin',
    fullName: 'Admin User',
    sudo: true,
    autologin: true,
    shell: '/bin/bash',
  },
  hostname: 'partition-box',
  timezone: 'Europe/Paris',
  locale: 'fr_FR',
  keyboardLayout: 'fr',
  enableSSH: true,
  security: {
    cisBenchmarkLevel: 1,
    firewall: 'ufw',
    appArmorOrSELinux: true,
    fail2ban: false,
    luksEncryption: false,
    disableRootSSH: true,
    autoSecurityUpdates: true,
  },
  customServices: [],
  firstBootScript: '#!/bin/sh\necho "test"',
  diskPartitionConfig: {
    targetDiskSizeGB: 128,
    efiSizeMB: 512,
    bootSizeMB: 1024,
    swapSizeMB: 4096,
    customHomePartition: true,
    homeSizeGB: 40,
  },
};

describe('generatePartitionDiskScript (Script de Partitionnement & Formatage Automatisé)', () => {
  it('génère un script bash avec table de partitionnement GPT et EFI fat32', () => {
    const script = generatePartitionDiskScript(baseRecipe);
    expect(script).toContain('#!/usr/bin/env bash');
    expect(script).toContain('sgdisk --zap-all');
    expect(script).toContain('mkfs.vfat -F32');
    expect(script).toContain('mkswap');
    expect(script).toContain('TARGET_DISK=');
  });

  it('génère les sous-volumes Btrfs (@, @home, @snapshots) lorsque le format Btrfs est sélectionné', () => {
    const btrfsRecipe: OSRecipe = {
      ...baseRecipe,
      filesystem: 'btrfs',
    };
    const script = generatePartitionDiskScript(btrfsRecipe);
    expect(script).toContain('mkfs.btrfs -f -L "ROOT"');
    expect(script).toContain('btrfs subvolume create /mnt/btrfs_temp/@');
    expect(script).toContain('btrfs subvolume create /mnt/btrfs_temp/@home');
    expect(script).toContain('btrfs subvolume create /mnt/btrfs_temp/@snapshots');
    expect(script).toContain('compress=zstd:1');
  });

  it('génère le conteneur chiffré LUKS2 et /dev/mapper/cryptroot lorsque le chiffrement est actif', () => {
    const luksRecipe: OSRecipe = {
      ...baseRecipe,
      security: {
        ...baseRecipe.security,
        luksEncryption: true,
        luksPassword: 'SecretPassword2026',
      },
    };
    const script = generatePartitionDiskScript(luksRecipe);
    expect(script).toContain('cryptsetup luksFormat --type luks2');
    expect(script).toContain('cryptsetup open');
    expect(script).toContain('cryptroot');
    expect(script).toContain('/etc/crypttab');
  });

  it('génère une table /etc/fstab basée sur les UUIDs des partitions', () => {
    const script = generatePartitionDiskScript(baseRecipe);
    expect(script).toContain('cat > /mnt/target/etc/fstab << FSTAB_EOF');
    expect(script).toContain('UUID=');
    expect(script).toContain('/boot/efi');
  });
});
