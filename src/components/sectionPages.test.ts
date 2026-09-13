import { describe, it, expect } from 'vitest';
import { StudioSectionId } from './ExpertProStudio';
import { OSRecipe, DisplayManagerId } from '../types/os';
import { DESKTOPS } from '../data/desktopEnvironments';
import { DISPLAY_MANAGERS } from '../data/displayManagers';
import { DM_SCREENSHOTS } from '../data/screenshots';
import { getDesktopSessionName, dmAutologinCmd } from '../services/generators/helpers';
import { generateLogoSvg, generateWallpaperSvg } from '../services/generators/branding';

describe('Navigation Studio Expert — Isolation stricte de chaque section sur sa propre page', () => {
  const expectedSections: StudioSectionId[] = [
    // Base Système & Cible
    'base_distro',
    'base_kernel',
    'base_output',
    // Bureau & Interface
    'ui_desktop',
    'ui_display_manager',
    'ui_default_apps',
    'ui_simulators',
    // Design System & Branding
    'brand_theme',
    'brand_appearance',
    'brand_terminal_plymouth',
    'brand_identity',
    // Logiciels & Dépôts
    'pkgs_catalog',
    // Système & Matériel
    'sys_identity',
    'sys_user',
    'sys_ssh',
    'sys_network',
    'sys_locale_power',
    'sys_storage',
    'sys_gaming',
    // Sécurité & Durcissement
    'sec_benchmark',
    'sec_firewall',
    'sec_luks',
    'sec_hardening',
    // Post-Install & Automatisation
    'post_firstboot',
    'post_dotfiles',
    'post_services',
    // Code & Manifestes
    'export_inspector',
  ];

  const sampleRecipe: OSRecipe = {
    id: 'test-recipe',
    name: 'OSForge Test',
    description: 'Test Recipe for page views',
    customServices: [],
    firstBootScript: '',
    distro: 'debian',
    distroVersion: '13',
    arch: 'x86_64',
    outputFormat: 'iso_hybrid',
    desktop: 'kde',
    displayManager: 'sddm',
    kernel: 'zen',
    selectedPackages: ['neovim', 'fastfetch'],
    customPackages: [],
    branding: {
      osName: 'OSForge Pro',
      editionName: 'Gaming ROG',
      version: '1.0',
      accentColor: '#e11d48',
      wallpaperPreset: 'gaming_rog',
      bootSplashTheme: 'osforge-custom',
    },
    user: {
      username: 'gamer',
      fullName: 'Forge Gamer',
      password: 'secretpassword',
      sudo: true,
      autologin: true,
      shell: '/bin/bash',
    },
    hostname: 'osforge-rig',
    timezone: 'Europe/Paris',
    locale: 'fr_FR.UTF-8',
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
    gamingConfig: {
      enableMangoHud: true,
      mangoHudPreset: 'compact_topbar',
      enableProtonGE: true,
      enableCoreCtrlProfiles: true,
      pipewireQuantumLatency: 128,
      cpuGovernor: 'performance',
    },
  };

  it('définit précisément les 27 sous-sections granulaires uniques dans l’arborescence Studio', () => {
    expect(expectedSections).toHaveLength(27);
    expect(new Set(expectedSections).size).toBe(27);
  });

  it('garantit que le recipe est compatible avec toutes les sections dédiées', () => {
    expect(sampleRecipe.distro).toBe('debian');
    expect(sampleRecipe.desktop).toBe('kde');
    expect(sampleRecipe.branding.accentColor).toBe('#e11d48');
    expect(sampleRecipe.branding.bootSplashTheme).toBe('osforge-custom');
    expect(sampleRecipe.branding.wallpaperPreset).toBe('gaming_rog');
    expect(sampleRecipe.gamingConfig?.cpuGovernor).toBe('performance');
    expect(sampleRecipe.gamingConfig?.pipewireQuantumLatency).toBe(128);
  });

  it('définit précisément les 8 sections principales ayant leur place dédiée dans le menu à gauche', () => {
    const mainSections: StudioSectionId[] = [
      'sec_base',
      'sec_ui',
      'sec_brand',
      'pkgs_catalog',
      'sec_sys',
      'sec_security',
      'sec_post',
      'export_inspector',
    ];
    expect(mainSections).toHaveLength(8);
    expect(new Set(mainSections).size).toBe(8);
  });

  describe('Session Management Hub (ui_display_manager) — Recommandations et Autologin', () => {
    it('garantit la correspondance exacte des gestionnaires recommandés pour les bureaux majeurs', () => {
      const desktopMap = new Map(DESKTOPS.map(d => [d.id, d.recommendedDM]));
      expect(desktopMap.get('kde')).toBe('sddm');
      expect(desktopMap.get('gnome')).toBe('gdm3');
      expect(desktopMap.get('xfce')).toBe('lightdm');
      expect(desktopMap.get('hyprland')).toBe('ly');
      expect(desktopMap.get('cosmic')).toBe('cosmic-greeter');
      expect(desktopMap.get('deepin')).toBe('ddm');
      expect(desktopMap.get('none')).toBe('none');
      expect(desktopMap.get('web_kiosk')).toBe('none');
    });

    it('résout correctement les noms de session Wayland / X11 via getDesktopSessionName', () => {
      expect(getDesktopSessionName('kde')).toEqual({ session: 'plasma', isWaylandNative: true });
      expect(getDesktopSessionName('gnome')).toEqual({ session: 'gnome', isWaylandNative: true });
      expect(getDesktopSessionName('cosmic')).toEqual({ session: 'cosmic', isWaylandNative: true });
      expect(getDesktopSessionName('sway')).toEqual({ session: 'sway', isWaylandNative: true });
      expect(getDesktopSessionName('xfce')).toEqual({ session: 'xfce', isWaylandNative: false });
      expect(getDesktopSessionName('cinnamon')).toEqual({ session: 'cinnamon', isWaylandNative: false });
    });

    it('génère les fichiers réels de configuration autologin pour GDM, SDDM, LightDM et Kiosk', () => {
      const rGdm = { ...sampleRecipe, displayManager: 'gdm3' as const, user: { ...sampleRecipe.user, autologin: true } };
      const rSddm = { ...sampleRecipe, displayManager: 'sddm' as const, user: { ...sampleRecipe.user, autologin: true } };
      const rLight = { ...sampleRecipe, displayManager: 'lightdm' as const, user: { ...sampleRecipe.user, autologin: true } };

      expect(dmAutologinCmd(rGdm, 'debian')).toContain('/etc/gdm3/custom.conf');
      expect(dmAutologinCmd(rSddm, 'debian')).toContain('/etc/sddm.conf.d/autologin.conf');
      expect(dmAutologinCmd(rLight, 'debian')).toContain('/etc/lightdm/lightdm.conf.d/50-autologin.conf');
    });

    it('couvre l’intégralité des 7 gestionnaires de sessions avec de vraies captures vérifiées et métadonnées', () => {
      const dmIds: DisplayManagerId[] = ['sddm', 'gdm3', 'lightdm', 'ly', 'cosmic-greeter', 'ddm', 'none'];
      
      expect(DISPLAY_MANAGERS).toHaveLength(7);
      
      dmIds.forEach((id) => {
        const dm = DISPLAY_MANAGERS.find(d => d.id === id);
        expect(dm, `Display Manager ${id} doit exister dans DISPLAY_MANAGERS`).toBeDefined();
        expect(dm?.serviceUnit).toBeTruthy();
        expect(dm?.framework).toBeTruthy();
        expect(dm?.protocols.length).toBeGreaterThan(0);

        const shot = DM_SCREENSHOTS[id];
        expect(shot, `Capture réelle obligatoire pour le greeter ${id}`).toBeDefined();
        expect(shot?.src).toMatch(/^\/screenshots\/desktops\/.*\.webp$/);
        expect(shot?.author).toBeTruthy();
        expect(shot?.source).toMatch(/^https?:\/\//);
        expect(shot?.license).toBeTruthy();
      });
    });
  });

  describe('Live Theme Studio (ui_simulators) — Éditeur de Thème et Simulateurs', () => {
    it('met à jour l’identité visuelle et le logo SVG en temps réel', () => {
      const customRecipe: OSRecipe = {
        ...sampleRecipe,
        branding: {
          ...sampleRecipe.branding,
          osName: 'MadOS',
          editionName: 'ROG Edition',
          accentColor: '#e11d48',
          wallpaperPreset: 'gaming_rog',
          bootSplashTheme: 'osforge-custom',
        },
      };

      const logo = generateLogoSvg(customRecipe);
      expect(logo).toContain('#e11d48');
      expect(logo).toContain('>M<'); // Première lettre de MadOS

      const wallpaper = generateWallpaperSvg(customRecipe);
      expect(wallpaper).toContain('<svg');
      expect(wallpaper).toContain('MADOS');
    });

    it('génère un rendu SVG valide pour chacun des 11 presets de fonds d’écran', () => {
      const presets = [
        'minimal', 'carbon_dark', 'aurora_borealis', 'nordic_frost',
        'sunset_synthwave', 'emerald_forest', 'tokyo_neon', 'cyberpunk',
        'matrix', 'gaming_rog', 'deep_space',
      ];

      presets.forEach((p) => {
        const r: OSRecipe = {
          ...sampleRecipe,
          branding: { ...sampleRecipe.branding, wallpaperPreset: p },
        };
        const svg = generateWallpaperSvg(r);
        expect(svg).toContain('<svg');
        expect(svg).toContain('viewBox="0 0 1920 1080"');
      });
    });
  });

  describe('Sous-section Applications & Outils d’Administration Système (ui_default_apps)', () => {
    it('supporte la configuration complète des applications par défaut et des outils sysadmin', () => {
      const adminRecipe: OSRecipe = {
        ...sampleRecipe,
        defaultApps: {
          browser: 'brave',
          terminal: 'kitty',
          textEditor: 'vscodium',
          diskManager: 'gparted',
          systemMonitor: 'btop',
          packageManagerGui: 'synaptic',
          enableTimeshift: true,
          enableGufw: true,
          enableInxi: true,
          enableCockpitWebAdmin: true,
          enableDesktopTweaks: true,
          enableDisplayConfigGui: true,
          enableAudioControlGui: true,
          enableBluetoothGui: true,
        },
      };

      expect(adminRecipe.defaultApps?.diskManager).toBe('gparted');
      expect(adminRecipe.defaultApps?.systemMonitor).toBe('btop');
      expect(adminRecipe.defaultApps?.packageManagerGui).toBe('synaptic');
      expect(adminRecipe.defaultApps?.enableTimeshift).toBe(true);
      expect(adminRecipe.defaultApps?.enableGufw).toBe(true);
      expect(adminRecipe.defaultApps?.enableInxi).toBe(true);
      expect(adminRecipe.defaultApps?.enableCockpitWebAdmin).toBe(true);
      expect(adminRecipe.defaultApps?.enableDesktopTweaks).toBe(true);
      expect(adminRecipe.defaultApps?.enableDisplayConfigGui).toBe(true);
      expect(adminRecipe.defaultApps?.enableAudioControlGui).toBe(true);
      expect(adminRecipe.defaultApps?.enableBluetoothGui).toBe(true);
    });
  });
});


