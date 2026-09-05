import { describe, it, expect } from 'vitest';
import { generateQemuTestBat, generateQemuTestSh } from './testVm';
import { OSRecipe } from '../../types/os';

const mockIsoRecipe: OSRecipe = {
  id: 'test-iso',
  name: 'Test ISO OS',
  distro: 'debian',
  version: '13',
  arch: 'x86_64',
  desktop: 'xfce',
  displayServer: 'x11',
  kernel: 'generic',
  outputFormat: 'iso_hybrid',
  filesystem: 'ext4',
  selectedPackages: [],
  network: {},
  user: { username: 'testuser', password: 'password', sudoPasswordless: true, shell: '/bin/bash' },
  security: {} as any,
  branding: { osName: 'DebianTest', editionName: 'Light', version: '1.0' } as any,
} as unknown as OSRecipe;

const mockQcow2Recipe: OSRecipe = {
  ...mockIsoRecipe,
  id: 'test-qcow2',
  outputFormat: 'qcow2',
};

describe('Chantier 43 : Lanceur Universel de Banc d’Essai VM 1-Clic (tester-en-vm.bat & tester-en-vm.sh)', () => {
  it('génère un script batch Windows avec détection d’accélération matérielle WHPX et TCG', () => {
    const bat = generateQemuTestBat(mockIsoRecipe);
    expect(bat).toContain('@echo off');
    expect(bat).toContain('qemu-system-x86_64');
    expect(bat).toContain('-accel whpx');
    expect(bat).toContain('-accel tcg');
    expect(bat).toContain('virtio-net-pci');
    expect(bat).toContain('hostfwd=tcp::2222-:22');
  });

  it('adapte les arguments QEMU pour le format ISO (-cdrom / -boot d)', () => {
    const bat = generateQemuTestBat(mockIsoRecipe);
    expect(bat).toContain('-cdrom');
    expect(bat).toContain('-boot d');
  });

  it('adapte les arguments QEMU pour le format image disque QCOW2 (-drive if=virtio)', () => {
    const bat = generateQemuTestBat(mockQcow2Recipe);
    expect(bat).toContain('-drive file="%DIST_DIR%\\');
    expect(bat).toContain('if=virtio');
    expect(bat).toContain('format=qcow2');
  });

  it('génère un script bash Linux avec détection KVM et gestion console/display', () => {
    const sh = generateQemuTestSh(mockIsoRecipe);
    expect(sh).toContain('#!/usr/bin/env bash');
    expect(sh).toContain('/dev/kvm');
    expect(sh).toContain('-enable-kvm');
    expect(sh).toContain('hostfwd=tcp::2222-:22');
  });
});
