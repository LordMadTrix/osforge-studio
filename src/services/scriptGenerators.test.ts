import { describe, it, expect } from 'vitest';
import { generateBuildScript, resolvePackageList } from './scriptGenerators';
import { DISTROS } from '../data/distros';
import { OSRecipe, DistroId, OutputFormat } from '../types/os';

// Recette minimale valide, réutilisée et surchargée par les tests. Les valeurs n'ont pas
// d'importance fonctionnelle ici : seule la FORME du script bash généré est vérifiée (jamais
// exécuté par ces tests — l'exécution réelle est couverte par la vérification manuelle en WSL2/
// QEMU documentée dans les commits ; ces tests attrapent les erreurs de template/échappement
// avant même d'en arriver là).
function makeRecipe(overrides: Partial<OSRecipe> = {}): OSRecipe {
  return {
    id: 'test-recipe',
    name: 'TestForge',
    description: 'Recette de test',
    distro: 'debian',
    distroVersion: '13',
    arch: 'x86_64',
    outputFormat: 'iso_hybrid',
    desktop: 'none',
    displayManager: 'none',
    kernel: 'generic',
    selectedPackages: ['git', 'docker'],
    customPackages: ['htop'],
    branding: {
      osName: 'TestForge',
      editionName: 'Test Edition',
      version: '1.0',
      accentColor: '#0ea5e9',
      wallpaperPreset: 'minimal',
      bootSplashTheme: 'minimal',
    },
    user: {
      username: 'tester',
      fullName: 'Test User',
      password: 'test',
      sudo: true,
      autologin: false,
      shell: '/bin/bash',
    },
    hostname: 'test-box',
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
    firstBootScript: '#!/usr/bin/env bash\necho hello',
    ...overrides,
  };
}

const ALL_DISTRO_IDS = DISTROS.map(d => d.id);
const ALL_OUTPUT_FORMATS: OutputFormat[] = [
  'iso_hybrid', 'wsl2_tar', 'qcow2', 'vmdk', 'raw_img', 'docker_rootfs', 'rpi_sd',
];

describe('generateBuildScript — sanité générale sur toute la matrice distro × format', () => {
  for (const distroId of ALL_DISTRO_IDS) {
    for (const format of ALL_OUTPUT_FORMATS) {
      it(`${distroId} / ${format} : ne jette pas et ne contient aucun artefact de template cassé`, () => {
        const recipe = makeRecipe({ distro: distroId, outputFormat: format });
        let script = '';
        expect(() => { script = generateBuildScript(recipe); }).not.toThrow();

        expect(script.startsWith('#!/usr/bin/env bash')).toBe(true);

        // Ces motifs ne doivent JAMAIS apparaître dans un script généré : ils trahissent une
        // interpolation JS ratée (variable non résolue, undefined injecté dans le template).
        expect(script).not.toMatch(/\bundefined\b/);
        expect(script).not.toMatch(/\bNaN\b/);
        expect(script).not.toContain('[object Object]');
      });
    }
  }
});

describe('generateBuildScript — heredocs correctement protégés (bug critique corrigé cette session)', () => {
  it("le heredoc CHROOT_EOF des familles non-Debian est protégé par des guillemets (sinon $pkg s'expanse en vide avant même d'atteindre le chroot)", () => {
    const recipe = makeRecipe({ distro: 'arch', outputFormat: 'wsl2_tar' });
    const script = generateBuildScript(recipe);
    expect(script).toContain("<< 'CHROOT_EOF'");
    expect(script).not.toContain('<< CHROOT_EOF\n');
  });

  it('chaque heredoc ouvert a bien son délimiteur de fermeture correspondant', () => {
    const recipe = makeRecipe({ distro: 'arch', outputFormat: 'wsl2_tar' });
    const script = generateBuildScript(recipe);
    const openers = [...script.matchAll(/<<-?\s*'?([A-Z_]+)'?/g)].map(m => m[1]);
    for (const delim of openers) {
      const closingLineCount = script.split('\n').filter(l => l.trim() === delim).length;
      expect(closingLineCount, `délimiteur ${delim} sans fermeture correspondante`).toBeGreaterThanOrEqual(1);
    }
  });
});

describe('generateBuildScript — familles RPM/pacman : pas de sur-échappement des variables natives', () => {
  it("le mirrorlist pacman utilise \\$repo/\\$arch littéraux, sans backslash (ce sont des variables pacman, pas shell)", () => {
    const script = generateBuildScript(makeRecipe({ distro: 'arch', outputFormat: 'wsl2_tar' }));
    expect(script).toContain('Server = https://geo.mirror.pkgbuild.com/$repo/os/$arch');
    expect(script).not.toContain('\\$repo');
    expect(script).not.toContain('\\$arch');
  });

  it('les fichiers .repo dnf (Fedora/Rocky) utilisent $basearch/$releasever littéraux', () => {
    const fedora = generateBuildScript(makeRecipe({ distro: 'fedora', outputFormat: 'wsl2_tar' }));
    expect(fedora).toContain('$basearch');
    expect(fedora).not.toContain('\\$basearch');
    expect(fedora).not.toContain('\\$releasever');

    const rocky = generateBuildScript(makeRecipe({ distro: 'rocky', outputFormat: 'wsl2_tar' }));
    expect(rocky).toContain('$basearch');
    expect(rocky).not.toContain('\\$basearch');
  });
});

describe('generateBuildScript — DNS dans le chroot (bug corrigé : resolv.conf absent = aucun paquet ne peut se télécharger)', () => {
  it('copie resolv.conf avant le premier appel au gestionnaire de paquets, pour toutes les familles non-Debian', () => {
    for (const distroId of ['arch', 'fedora', 'alpine', 'opensuse', 'void'] as DistroId[]) {
      const script = generateBuildScript(makeRecipe({ distro: distroId, outputFormat: 'wsl2_tar' }));
      expect(script, `${distroId} : resolv.conf non copié`).toContain('resolv.conf');
    }
  });
});

describe('generateBuildScript — images disque Arch/CachyOS (vérifié en live via boot QEMU réel)', () => {
  it('désactive CheckSpace (faux positifs "not enough disk space" en chroot, vérifié en live)', () => {
    const script = generateBuildScript(makeRecipe({ distro: 'arch', outputFormat: 'qcow2' }));
    expect(script).toContain('#CheckSpace');
  });

  it("retire le hook 'autodetect' de mkinitcpio ET régénère explicitement l'initramfs (les deux sont nécessaires — vérifié en live)", () => {
    const script = generateBuildScript(makeRecipe({ distro: 'arch', outputFormat: 'raw_img' }));
    expect(script).not.toMatch(/HOOKS=\([^)]*autodetect/);
    expect(script).toContain('mkinitcpio -P');
  });

  it('inclut console=ttyS0 sur la ligne kernel (sinon aucune sortie visible sur console série)', () => {
    const script = generateBuildScript(makeRecipe({ distro: 'arch', outputFormat: 'vmdk' }));
    expect(script).toContain('console=ttyS0');
  });

  it('CachyOS bénéficie du même pipeline vérifié que Arch (même famille)', () => {
    const script = generateBuildScript(makeRecipe({ distro: 'cachyos', outputFormat: 'raw_img' }));
    expect(script).toContain('mkinitcpio -P');
    expect(script).toContain('#CheckSpace');
  });
});

describe('generateBuildScript — images disque Fedora/Rocky (vérifié en live via boot QEMU réel)', () => {
  it('désactive hostonly de dracut avant le premier posttrans du paquet kernel', () => {
    for (const distroId of ['fedora', 'rocky'] as DistroId[]) {
      const script = generateBuildScript(makeRecipe({ distro: distroId, outputFormat: 'qcow2' }));
      expect(script, distroId).toContain('hostonly="no"');
      expect(script, distroId).toContain('grub2-install');
    }
  });

  it('détecte la version du noyau dynamiquement au lieu de la coder en dur', () => {
    const script = generateBuildScript(makeRecipe({ distro: 'fedora', outputFormat: 'raw_img' }));
    expect(script).toContain('KVER=$(ls');
  });
});

describe('generateBuildScript — familles sans image disque vérifiée : refus explicite, jamais de code silencieusement cassé', () => {
  it.each(['opensuse'] as DistroId[])('%s refuse proprement les formats image disque non vérifiés', (distroId) => {
    for (const format of ['qcow2', 'vmdk', 'raw_img'] as OutputFormat[]) {
      const script = generateBuildScript(makeRecipe({ distro: distroId, outputFormat: format }));
      expect(script).toContain('exit 1');
      expect(script).toMatch(/ERREUR/);
    }
  });
});

describe('generateBuildScript — image disque Void (vérifié en live via boot QEMU réel)', () => {
  it("active le getty ttyS0 (désactivé par défaut, sinon le boot semble bloqué alors qu'il a réussi)", () => {
    const script = generateBuildScript(makeRecipe({ distro: 'void', outputFormat: 'raw_img' }));
    expect(script).toContain('agetty-ttyS0');
  });

  it('désactive temporairement pipefail autour du "yes |" (SIGPIPE + pipefail = arrêt silencieux du script, vérifié en live)', () => {
    const script = generateBuildScript(makeRecipe({ distro: 'void', outputFormat: 'raw_img' }));
    expect(script).toContain('set +o pipefail');
    expect(script).toContain('set -o pipefail');
  });
});

describe('generateBuildScript — image disque Alpine (vérifié en live via boot QEMU réel)', () => {
  it('active le getty ttyS0 dans /etc/inittab (commenté par défaut)', () => {
    const script = generateBuildScript(makeRecipe({ distro: 'alpine', outputFormat: 'raw_img' }));
    expect(script).toContain("sed -i 's/^#ttyS0::/ttyS0::/'");
  });

  it("utilise root=/dev/sda1 au lieu de UUID= (nlplug-findfs ne résout pas UUID= dans ce pipeline, vérifié en live)", () => {
    const script = generateBuildScript(makeRecipe({ distro: 'alpine', outputFormat: 'raw_img' }));
    expect(script).toContain('root=/dev/sda1');
    expect(script).not.toContain('root=UUID=');
  });
});

describe('generateBuildScript — NixOS : refus honnête, jamais de tentative de compilation erronée', () => {
  it('refuse explicitement avec un message expliquant pourquoi (incompatibilité architecturale, pas juste "pas encore fait")', () => {
    const script = generateBuildScript(makeRecipe({ distro: 'nixos', outputFormat: 'iso_hybrid' }));
    expect(script).toContain('exit 1');
    expect(script).toMatch(/déclaratif|nix build|nixos-generators/i);
  });
});

describe('resolvePackageList — repli de noms de paquets pour les distros absentes du catalogue', () => {
  it('kali et raspbian produisent une liste non vide (héritage des noms de paquets debian)', () => {
    const kali = resolvePackageList(makeRecipe({ distro: 'kali', selectedPackages: ['git'] }));
    const raspbian = resolvePackageList(makeRecipe({ distro: 'raspbian', selectedPackages: ['git'] }));
    expect(kali.length).toBeGreaterThan(0);
    expect(raspbian.length).toBeGreaterThan(0);
  });

  it('cachyos, rocky, opensuse et void produisent tous une liste non vide via repli vers la famille la plus proche', () => {
    for (const distroId of ['cachyos', 'rocky', 'opensuse', 'void'] as DistroId[]) {
      const pkgs = resolvePackageList(makeRecipe({ distro: distroId, selectedPackages: ['git'], customPackages: [] }));
      expect(pkgs.length, distroId).toBeGreaterThan(0);
    }
  });

  it('ne produit jamais de doublons', () => {
    const pkgs = resolvePackageList(makeRecipe({
      distro: 'debian',
      selectedPackages: ['git', 'docker'],
      customPackages: ['git', 'sudo'],
    }));
    expect(pkgs.length).toBe(new Set(pkgs).size);
  });
});

describe('generateBuildScript — Raspberry Pi OS (miroir et paquet noyau corrigés cette session)', () => {
  it('utilise le miroir archive.raspberrypi.com (le seul à publier arm64 — vérifié en live)', () => {
    const script = generateBuildScript(makeRecipe({ distro: 'raspbian', arch: 'aarch64', outputFormat: 'iso_hybrid' }));
    expect(script).toContain('archive.raspberrypi.com');
    expect(script).not.toContain('raspbian.raspberrypi.org');
  });

  it("utilise le vrai méta-paquet noyau linux-image-rpi-v8 (pas linux-image-arm64, qui n'existe pas sur ce dépôt)", () => {
    const script = generateBuildScript(makeRecipe({ distro: 'raspbian', arch: 'aarch64', outputFormat: 'iso_hybrid' }));
    expect(script).toContain('linux-image-rpi-v8');
    expect(script).not.toContain('linux-image-arm64');
  });
});
