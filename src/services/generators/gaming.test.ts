import { describe, it, expect } from 'vitest';
import {
  generateMangoHudConfig,
  generateProtonGEInstallerScript,
  generateCoreCtrlPolkitRules,
  generatePipewireLowLatencyConfig,
  generateGamingChrootCommands,
} from './gaming';
import { OSRecipe } from '../../types/os';

const mockRecipe: OSRecipe = {
  id: 'test-gaming',
  name: 'Test Gaming OS',
  distro: 'ubuntu',
  version: '24.04',
  arch: 'x86_64',
  desktop: 'kde',
  displayServer: 'wayland',
  kernel: 'xanmod',
  outputFormat: 'iso_hybrid',
  filesystem: 'ext4',
  selectedPackages: [],
  network: {},
  user: {
    username: 'gamer',
    password: 'password123',
    sudoPasswordless: true,
    shell: '/bin/zsh',
  },
  security: {} as any,
  branding: {
    osName: 'MadOS Gaming',
    editionName: 'ROG Edition',
    version: '1.0',
    accentColor: '#9333ea',
  } as any,
  enableGamingOptimizations: true,
  gamingConfig: {
    enableMangoHud: true,
    mangoHudPreset: 'compact_topbar',
    enableProtonGE: true,
    enableCoreCtrlProfiles: true,
    pipewireQuantumLatency: 128,
    cpuGovernor: 'performance',
  },
} as unknown as OSRecipe;

describe('Chantier 46 : Studio d’Optimisation Gaming & Audio (MangoHUD, Proton-GE, PipeWire)', () => {
  it('génère correctement les 4 presets réels MangoHUD', () => {
    const compact = generateMangoHudConfig('compact_topbar');
    expect(compact).toContain('position=top-center');
    expect(compact).toContain('horizontal');

    const full = generateMangoHudConfig('full_hud');
    expect(full).toContain('position=top-left');
    expect(full).toContain('gpu_stats');
    expect(full).toContain('frametime=1');
    expect(full).toContain('histogram');

    const minimal = generateMangoHudConfig('minimal_fps');
    expect(minimal).toContain('fps_only');
    expect(minimal).toContain('position=top-right');

    const steamos = generateMangoHudConfig('steamos_style');
    expect(steamos).toContain('battery');
    expect(steamos).toContain('round_corners=10');
  });

  it('génère le script d’installation Proton-GE ciblant steam compatibilitytools.d', () => {
    const script = generateProtonGEInstallerScript();
    expect(script).toContain('GloriousEggroll/proton-ge-custom');
    expect(script).toContain('.steam/root/compatibilitytools.d');
    expect(script).toContain('curl -sSL');
  });

  it('génère les règles Polkit CoreCtrl pour GPU sans mot de passe root', () => {
    const polkit = generateCoreCtrlPolkitRules();
    expect(polkit).toContain('org.corectrl.helper.init');
    expect(polkit).toContain('org.corectrl.helper.stage');
    expect(polkit).toContain('polkit.Result.YES');
  });

  it('génère la configuration PipeWire pour le quantum ultra-faible latence', () => {
    const pipewire64 = generatePipewireLowLatencyConfig(64);
    expect(pipewire64).toContain('default.clock.quantum       = 64');

    const pipewire128 = generatePipewireLowLatencyConfig(128);
    expect(pipewire128).toContain('default.clock.quantum       = 128');
  });

  it('génère les commandes chroot gaming complètes dans /etc/MangoHud et /etc/pipewire', () => {
    const commands = generateGamingChrootCommands(mockRecipe);
    expect(commands).toContain('/etc/MangoHud/MangoHud.conf');
    expect(commands).toContain('/home/gamer/.config/MangoHud');
    expect(commands).toContain('/etc/pipewire/pipewire.conf.d/10-lowlatency.conf');
    expect(commands).toContain('/etc/polkit-1/rules.d/90-corectrl.rules');
    expect(commands).toContain('/usr/local/bin/osforge-install-proton-ge');
  });
});
