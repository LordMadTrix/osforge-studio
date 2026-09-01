import { describe, it, expect } from 'vitest';
import { DISTRO_PRESETS } from './presets';
import { generateBuildScript, resolvePackageList } from '../services/scriptGenerators';
import { OSRecipe } from '../types/os';

const DEFAULTS: OSRecipe = {
  id: 'd', name: 'd', description: 'd',
  distro: 'debian', distroVersion: '', arch: 'x86_64', outputFormat: 'iso_hybrid',
  desktop: 'none', displayManager: 'none', kernel: 'generic',
  selectedPackages: [], customPackages: [],
  branding: { osName: 'D', editionName: 'D', version: '1.0', accentColor: '#000', wallpaperPreset: 'd', bootSplashTheme: 'classic' },
  user: { username: 'u', fullName: 'U', sudo: true, autologin: false, shell: '/bin/bash' },
  hostname: 'd', timezone: 'UTC', locale: 'en_US', keyboardLayout: 'us',
  enableSSH: true,
  security: { cisBenchmarkLevel: 0, firewall: 'none', appArmorOrSELinux: false, fail2ban: false, luksEncryption: false, disableRootSSH: false, autoSecurityUpdates: false },
  customServices: [], firstBootScript: '',
};

function recipeFromPreset(partial: Partial<OSRecipe>): OSRecipe {
  return {
    ...DEFAULTS,
    ...partial,
    security: { ...DEFAULTS.security, ...partial.security },
    user: { ...DEFAULTS.user, ...partial.user },
    branding: { ...DEFAULTS.branding, ...partial.branding },
  } as OSRecipe;
}

describe('DISTRO_PRESETS — bug réel MAJEUR trouvé en auditant : 2 presets ("devops_hyprland", "ai_llm_station") combinaient distro="arch" avec outputFormat="iso_hybrid" — un format que generateNonDebianBuildScript() refuse explicitement pour Arch/CachyOS/Fedora/Rocky/Alpine/openSUSE/Void (ISO live bootable non implémentée pour ces familles, refus honnête déjà en place). Choisir l\'un de ces presets et cliquer "Générer" produisait un script de 727 caractères refusant de continuer, pas la station de travail annoncée par son titre et ses "highlights". "ai_llm_station" avait un second bug dans la même veine : "XanMod" annoncé dans le titre/highlights alors que XanMod n\'a aucun paquet officiel pour Arch (repli silencieux vers un noyau générique). Les deux corrigés vers "qcow2" (image disque réellement bootable, déjà vérifiée par boot QEMU pour Arch cette session) et "zen" (noyau réellement câblé pour Arch, même promesse de réactivité tenue honnêtement)', () => {
  it('chaque preset du catalogue produit un vrai script de build, jamais un refus "format non pris en charge" (empêche toute régression future, pas seulement les 2 presets déjà trouvés)', () => {
    for (const preset of DISTRO_PRESETS) {
      const recipe = recipeFromPreset(preset.recipe);
      const script = generateBuildScript(recipe);
      expect(script.length, `preset "${preset.id}" (${recipe.distro} + ${recipe.outputFormat}) produit un script anormalement court`).toBeGreaterThan(2000);
      expect(script, `preset "${preset.id}" refuse le format choisi`).not.toContain("n'est pas encore pris en charge");
    }
  });

  it('devops_hyprland : utilise "qcow2" (pas "iso_hybrid", refusé par Arch) et produit un script réel', () => {
    const preset = DISTRO_PRESETS.find(p => p.id === 'devops_hyprland')!;
    expect(preset.recipe.outputFormat).toBe('qcow2');
    const script = generateBuildScript(recipeFromPreset(preset.recipe));
    expect(script).toContain('grub-install');
  });

  it('ai_llm_station : utilise "qcow2" et le noyau "zen" (pas "xanmod", inexistant pour Arch)', () => {
    const preset = DISTRO_PRESETS.find(p => p.id === 'ai_llm_station')!;
    expect(preset.recipe.outputFormat).toBe('qcow2');
    expect(preset.recipe.kernel).toBe('zen');
    const script = generateBuildScript(recipeFromPreset(preset.recipe));
    expect(script).toContain('linux-zen');
    expect(script).not.toContain('xanmod');
  });
});

describe('DISTRO_PRESETS — bug réel trouvé en auditant, même classe que "devops_hyprland"/"ai_llm_station" : "cybersec_lab" et "cloud_native_homelab" utilisaient kernel="hardened" — câblé UNIQUEMENT pour Arch/CachyOS dans ce générateur, jamais pour Debian. Sur Debian, ce choix retombe silencieusement sur le noyau générique avec un simple message dans la console de build (jamais visible dans l\'UI). "cybersec_lab" est un laboratoire de sécurité qui annonçait explicitement "Hardened Kernel" en sous-titre et en highlight — particulièrement trompeur pour un preset à vocation sécuritaire. "cloud_native_homelab" avait un second bug distinct : son highlight promettait "Podman" alors que seul "docker" est dans selectedPackages (cohérent avec sa propre description qui mentionne bien Docker)', () => {
  it('cybersec_lab : utilise kernel="generic" (pas "hardened", non câblé pour Debian) et n\'annonce plus de noyau durci inexistant', () => {
    const preset = DISTRO_PRESETS.find(p => p.id === 'cybersec_lab')!;
    expect(preset.recipe.kernel).toBe('generic');
    expect(preset.subtitle).not.toMatch(/hardened kernel/i);
    expect(preset.highlights.join(' ')).not.toMatch(/noyau hardened/i);
    const script = generateBuildScript(recipeFromPreset(preset.recipe));
    expect(script).not.toContain("n'est pas encore câblé");
  });

  it('cloud_native_homelab : utilise kernel="generic" et son highlight annonce "Docker" (ce qui est réellement dans selectedPackages), pas "Podman"', () => {
    const preset = DISTRO_PRESETS.find(p => p.id === 'cloud_native_homelab')!;
    expect(preset.recipe.kernel).toBe('generic');
    expect(preset.recipe.selectedPackages).toContain('docker');
    expect(preset.recipe.selectedPackages).not.toContain('podman');
    expect(preset.highlights.join(' ')).toContain('Docker');
    expect(preset.highlights.join(' ')).not.toContain('Podman');
    const script = generateBuildScript(recipeFromPreset(preset.recipe));
    expect(script).not.toContain("n'est pas encore câblé");
  });

  it('retro_gaming_box et pro_audio_studio : non-régression, leurs noyaux liquorix/realtime restent réellement câblés pour Ubuntu (déjà vérifié ailleurs), pas de faux avertissement', () => {
    for (const id of ['retro_gaming_box', 'pro_audio_studio']) {
      const preset = DISTRO_PRESETS.find(p => p.id === id)!;
      const script = generateBuildScript(recipeFromPreset(preset.recipe));
      expect(script, id).not.toContain("n'est pas encore câblé");
    }
  });
});

describe('DISTRO_PRESETS — bug réel MAJEUR trouvé en RÉ-AUDITANT le fix "cybersec_lab" ci-dessus : le correctif du noyau "hardened" avait lui-même introduit une nouvelle fausse promesse en remplacement — le highlight annonçait "CIS Niveau 2 + AppArmor + LUKS" et security.luksEncryption valait "true", alors que "luksEncryption" n\'est câblé NULLE PART dans ce projet (aucune trace de "cryptsetup"/"luksFormat" dans tout src/, confirmé par recherche exhaustive). Le même défaut existait aussi dans le toggle UI direct (SecurityConfig.tsx, sans aucun avertissement) et dans l\'Architecte IA (aiAssistant.ts, tag "Chiffrement LUKS")', () => {
  it('cybersec_lab : n\'annonce plus "LUKS" dans ses highlights et n\'active plus luksEncryption (non câblé)', () => {
    const preset = DISTRO_PRESETS.find(p => p.id === 'cybersec_lab')!;
    expect(preset.highlights.join(' ')).not.toMatch(/luks/i);
    expect(preset.recipe.security?.luksEncryption).toBe(false);
  });
});

describe('DISTRO_PRESETS — bug réel trouvé en auditant, même classe : "retro_gaming_box" annonçait "Manettes Xbox/PS5 prêtes" sans jamais sélectionner "gamepad_drivers" (joystick/jstest-gtk/xboxdrv — le paquet catalogue conçu exactement pour cette promesse, Steam seul ne fournissant ni calibrage ni pilote générique hors du support xpad/hid-generic déjà présent dans le noyau). "devops_hyprland" avait la même incohérence interne que "cloud_native_homelab" (déjà corrigée) : highlight "Docker & Podman" alors que son propre sous-titre ne mentionne QUE Docker et que selectedPackages n\'installe que "docker"', () => {
  it('retro_gaming_box : installe réellement joystick/jstest-gtk/xboxdrv (paquet "gamepad_drivers" désormais sélectionné)', () => {
    const preset = DISTRO_PRESETS.find(p => p.id === 'retro_gaming_box')!;
    expect(preset.recipe.selectedPackages).toContain('gamepad_drivers');
    const pkgs = resolvePackageList(recipeFromPreset(preset.recipe));
    expect(pkgs).toContain('joystick');
    expect(pkgs).toContain('xboxdrv');
  });

  it('devops_hyprland : highlight annonce "Docker Engine" (cohérent avec son sous-titre et selectedPackages), plus "Podman" non installé', () => {
    const preset = DISTRO_PRESETS.find(p => p.id === 'devops_hyprland')!;
    expect(preset.recipe.selectedPackages).toContain('docker');
    expect(preset.recipe.selectedPackages).not.toContain('podman');
    expect(preset.highlights.join(' ')).not.toContain('Podman');
  });

  it('devops_hyprland : "LazyGit" reste une promesse honnête — réellement fourni par le paquet "git" sur Arch (non-régression)', () => {
    const preset = DISTRO_PRESETS.find(p => p.id === 'devops_hyprland')!;
    const pkgs = resolvePackageList(recipeFromPreset(preset.recipe));
    expect(pkgs).toContain('lazygit');
  });
});

describe('DISTRO_PRESETS — Preset officiel "MadOS ROG Edition" (Gaming & ASUS ROG)', () => {
  it('mados_rog_edition : présent dans le catalogue et configuré avec Ubuntu 24.04, KDE Plasma, XanMod et Gaming stack', () => {
    const preset = DISTRO_PRESETS.find(p => p.id === 'mados_rog_edition');
    expect(preset).toBeDefined();
    expect(preset!.recipe.distro).toBe('ubuntu');
    expect(preset!.recipe.desktop).toBe('kde');
    expect(preset!.recipe.kernel).toBe('xanmod');
    expect(preset!.recipe.enableGamingOptimizations).toBe(true);
    expect(preset!.recipe.enablePowerSaving).toBe(true);
    expect(preset!.recipe.selectedPackages).toContain('steam');
    expect(preset!.recipe.selectedPackages).toContain('lutris_heroic');
    expect(preset!.recipe.selectedPackages).toContain('gamepad_drivers');

    const script = generateBuildScript(recipeFromPreset(preset!.recipe));
    expect(script).toContain('deb.xanmod.org');
    expect(script).toContain('linux-xanmod-x64v3');
    expect(script).toContain('99-gaming.conf');
    expect(script).toContain('tcp_congestion_control = bbr');
  });

  it('steam_machine_console configure la session Gamescope GamepadUI et les règles udev manettes', () => {
    const preset = DISTRO_PRESETS.find((p) => p.id === 'steam_machine_console');
    expect(preset).toBeDefined();
    expect(preset!.recipe.distro).toBe('ubuntu');
    expect(preset!.recipe.enableSteamConsoleMode).toBe(true);
    expect(preset!.recipe.enableGamingOptimizations).toBe(true);
    expect(preset!.recipe.selectedPackages).toContain('steam');
    expect(preset!.recipe.selectedPackages).toContain('gamepad_drivers');

    const script = generateBuildScript(recipeFromPreset(preset!.recipe));
    expect(script).toContain('70-steam-input.rules');
    expect(script).toContain('steam-gamescope-session');
    expect(script).toContain('steam -gamepadui -steamos3');
    expect(script).toContain('steam-console.desktop');
  });
});
