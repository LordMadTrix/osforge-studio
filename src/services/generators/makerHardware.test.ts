import { describe, it, expect } from 'vitest';
import {
  generateXrHardwareUdevRules,
  generate3dPrintLaserUdevRules,
  generateVrDoctorScript,
  generateMakerDoctorScript,
  generateMakerHardwareChrootCommands,
} from './makerHardware';
import { OSRecipe } from '../../types/os';

describe('Générateur Matériel : Casques VR & Fabrication Numérique (3D / Laser)', () => {
  const baseMockRecipe: OSRecipe = {
    id: 'test-recipe',
    name: 'Test OS',
    description: 'Test OS Description',
    distro: 'debian',
    distroVersion: '12',
    arch: 'x86_64',
    outputFormat: 'iso_hybrid',
    desktop: 'gnome',
    displayManager: 'gdm3',
    kernel: 'generic',
    selectedPackages: [],
    customPackages: [],
    branding: {
      osName: 'TestOS',
      editionName: 'Community',
      version: '1.0',
      accentColor: '#3b82f6',
      wallpaperPreset: 'minimal',
      bootSplashTheme: 'spinner',
    },
    user: {
      username: 'forgeuser',
      fullName: 'Forge User',
      password: 'password123',
      autologin: true,
      sudo: true,
      shell: '/bin/bash',
    },
    hostname: 'test-os',
    timezone: 'UTC',
    locale: 'en_US.UTF-8',
    keyboardLayout: 'us',
    enableSSH: true,
    security: {
      cisBenchmarkLevel: 0,
      firewall: 'none',
      appArmorOrSELinux: false,
      fail2ban: false,
      luksEncryption: false,
      disableRootSSH: true,
      autoSecurityUpdates: false,
    },
    customServices: [],
    firstBootScript: '',
  };

  describe('Règles Udev Casques VR (Khronos xr-hardware)', () => {
    it('doit inclure les Vendor/Product IDs des principaux casques VR du marché', () => {
      const udev = generateXrHardwareUdevRules();
      expect(udev).toContain('ATTRS{idVendor}=="28de"'); // Valve Index
      expect(udev).toContain('ATTRS{idVendor}=="0bb4"'); // HTC Vive
      expect(udev).toContain('ATTRS{idVendor}=="2833"'); // Meta Quest / Oculus
      expect(udev).toContain('ATTRS{idVendor}=="35bd"'); // Bigscreen Beyond
      expect(udev).toContain('ATTRS{idVendor}=="054c"'); // Sony PSVR2
      expect(udev).toContain('ATTRS{idVendor}=="045e"'); // Microsoft WMR
      expect(udev).toContain('GROUP="plugdev"');
      expect(udev).toContain('MODE="0666"');
      expect(udev).toContain('TAG+="uaccess"');
    });
  });

  describe('Règles Udev Impression 3D & Graveur Laser CNC', () => {
    it('doit inclure les puces USB-Série courantes (CH340, CP210x, FTDI, STM32, Arduino, RP2040)', () => {
      const udev = generate3dPrintLaserUdevRules();
      expect(udev).toContain('ATTRS{idVendor}=="1a86"'); // Qinheng CH340/CH341
      expect(udev).toContain('ATTRS{idVendor}=="10c4"'); // Silicon Labs CP210x
      expect(udev).toContain('ATTRS{idVendor}=="0403"'); // FTDI FT232R
      expect(udev).toContain('ATTRS{idVendor}=="0483"'); // STM32 CDC ACM
      expect(udev).toContain('ATTRS{idVendor}=="2341"'); // Arduino Mega/Uno
      expect(udev).toContain('ATTRS{idVendor}=="2e8a"'); // Raspberry Pi RP2040
      expect(udev).toContain('GROUP="dialout"');
      expect(udev).toContain('MODE="0666"');
      expect(udev).toContain('TAG+="uaccess"');
    });
  });

  describe('Scripts CLI Diagnostics (/usr/local/bin)', () => {
    it('generateVrDoctorScript doit auditer udev, groupes utilisateur, OpenXR et Avahi mDNS', () => {
      const script = generateVrDoctorScript();
      expect(script).toContain('OSForge VR Doctor');
      expect(script).toContain('/etc/udev/rules.d/70-xrhardware.rules');
      expect(script).toContain('plugdev video input games');
      expect(script).toContain('active_runtime.json');
      expect(script).toContain('avahi-daemon');
    });

    it('generateMakerDoctorScript doit auditer le masquage brltty, dialout/uucp et les ports ttyUSB/ACM', () => {
      const script = generateMakerDoctorScript();
      expect(script).toContain('OSForge Maker Doctor');
      expect(script).toContain('brltty');
      expect(script).toContain('dialout uucp');
      expect(script).toContain('/dev/ttyUSB* /dev/ttyACM*');
    });
  });

  describe('Intégration Chroot (generateMakerHardwareChrootCommands)', () => {
    it('doit retourner une chaîne vide si aucun paquet VR ou Maker n’est sélectionné', () => {
      const result = generateMakerHardwareChrootCommands(baseMockRecipe);
      expect(result).toBe('');
    });

    it('doit injecter la stack VR lorsque openxr_runtime ou vr_headset_drivers est sélectionné', () => {
      const recipeWithVr: OSRecipe = {
        ...baseMockRecipe,
        selectedPackages: ['openxr_runtime', 'vr_wireless_streaming'],
      };
      const result = generateMakerHardwareChrootCommands(recipeWithVr);
      expect(result).toContain('[HARDWARE-VR]');
      expect(result).toContain('/etc/udev/rules.d/70-xrhardware.rules');
      expect(result).toContain('usermod -aG plugdev,video,audio,input,games "forgeuser"');
      expect(result).toContain('systemctl enable avahi-daemon');
      expect(result).toContain('/usr/local/bin/osforge-vr-doctor');
      expect(result).not.toContain('[HARDWARE-MAKER]');
    });

    it('doit injecter la stack Maker lorsque prusa_slicer ou laser_cnc_vector est sélectionné', () => {
      const recipeWithMaker: OSRecipe = {
        ...baseMockRecipe,
        selectedPackages: ['prusa_slicer', 'hardware_serial_dialout'],
      };
      const result = generateMakerHardwareChrootCommands(recipeWithMaker);
      expect(result).toContain('[HARDWARE-MAKER]');
      expect(result).toContain('/etc/udev/rules.d/99-osforge-3dprint-laser.rules');
      expect(result).toContain('systemctl mask brltty.service brltty-udev.service');
      expect(result).toContain('usermod -aG dialout,uucp "forgeuser"');
      expect(result).toContain('/usr/local/bin/osforge-maker-doctor');
      expect(result).not.toContain('[HARDWARE-VR]');
    });

    it('doit injecter les deux stacks si les paquets VR et Maker sont simultanément sélectionnés', () => {
      const recipeWithBoth: OSRecipe = {
        ...baseMockRecipe,
        selectedPackages: ['openxr_runtime', 'laser_cnc_vector'],
      };
      const result = generateMakerHardwareChrootCommands(recipeWithBoth);
      expect(result).toContain('[HARDWARE-VR]');
      expect(result).toContain('[HARDWARE-MAKER]');
      expect(result).toContain('70-xrhardware.rules');
      expect(result).toContain('99-osforge-3dprint-laser.rules');
    });
  });
});
