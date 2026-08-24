import { describe, it, expect } from 'vitest';
import { generateBuildScript, resolvePackageList, generateCloudInitYaml } from './scriptGenerators';
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

describe('generateBuildScript — grub.cfg : la vraie valeur ROOT_UUID doit être substituée, pas un template littéral (bug réel trouvé en live sur openSUSE : root=UUID= vide → kernel panic)', () => {
  it.each(['arch', 'fedora', 'rocky', 'opensuse', 'void'] as DistroId[])('%s : ni "search --set=root" ni "root=UUID=" ne contiennent de antislash devant ${ROOT_UUID}', (distroId) => {
    const script = generateBuildScript(makeRecipe({ distro: distroId, outputFormat: 'raw_img' }));
    expect(script).not.toContain('\\${ROOT_UUID}');
    expect(script).toContain('search --no-floppy --fs-uuid --set=root ${ROOT_UUID}');
    expect(script).toContain('root=UUID=${ROOT_UUID}');
  });
});

describe('generateBuildScript — image disque openSUSE (nouvellement implémentée, hostonly dracut corrigé)', () => {
  it('installe kernel-default, grub2 et grub2-i386-pc pour un format disque', () => {
    const script = generateBuildScript(makeRecipe({ distro: 'opensuse', outputFormat: 'raw_img' }));
    expect(script).toContain('kernel-default grub2 grub2-i386-pc');
  });

  it('désactive hostonly dracut AVANT l\'installation du noyau (même correctif que Fedora/Rocky)', () => {
    const script = generateBuildScript(makeRecipe({ distro: 'opensuse', outputFormat: 'raw_img' }));
    const dracutIdx = script.indexOf('hostonly="no"');
    const kernelInstallIdx = script.indexOf('kernel-default grub2 grub2-i386-pc');
    expect(dracutIdx).toBeGreaterThan(-1);
    expect(kernelInstallIdx).toBeGreaterThan(-1);
    expect(dracutIdx).toBeLessThan(kernelInstallIdx);
  });

  it('utilise grub2-install / boot/grub2 (comme Fedora/Rocky, pas grub-install/boot/grub comme Arch)', () => {
    const script = generateBuildScript(makeRecipe({ distro: 'opensuse', outputFormat: 'raw_img' }));
    expect(script).toContain('grub2-install');
    expect(script).toContain('/boot/grub2/grub.cfg');
  });

  it('détecte dynamiquement la version du noyau via /lib/modules (pas de chemin statique)', () => {
    const script = generateBuildScript(makeRecipe({ distro: 'opensuse', outputFormat: 'raw_img' }));
    expect(script).toContain('KVER=$(ls');
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

  it('linuxmint hérite des noms de paquets ubuntu (dérivé Ubuntu)', () => {
    const mint = resolvePackageList(makeRecipe({ distro: 'linuxmint', selectedPackages: ['git'] }));
    expect(mint.length).toBeGreaterThan(0);
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

describe('generateBuildScript — Linux Mint (nouveau : dérivé Ubuntu, réutilise le pipeline vérifié)', () => {
  it('bootstrap avec les mêmes paramètres que Ubuntu (mirror, suite, composants main+universe)', () => {
    const script = generateBuildScript(makeRecipe({ distro: 'linuxmint', outputFormat: 'iso_hybrid' }));
    expect(script).toContain('archive.ubuntu.com/ubuntu');
    expect(script).toContain('resolute');
    expect(script).toContain('--components="main,universe"');
  });

  it("utilise linux-image-generic (paquet noyau Ubuntu), pas linux-image-<arch> (nom Debian, inexistant sur ce miroir)", () => {
    const script = generateBuildScript(makeRecipe({ distro: 'linuxmint', outputFormat: 'iso_hybrid' }));
    expect(script).toContain('linux-image-generic');
  });

  it("applique le correctif firefox-snap-transition (hérité d'Ubuntu, même dépôt de base)", () => {
    const script = generateBuildScript(makeRecipe({ distro: 'linuxmint', outputFormat: 'iso_hybrid', selectedPackages: ['firefox'] }));
    expect(script).toContain('packages.mozilla.org');
  });
});

describe('generateBuildScript — Raspberry Pi OS (bootstrap Debian + overlay corrigé cette session)', () => {
  it('bootstrap depuis le vrai Debian (deb.debian.org), PAS directement depuis archive.raspberrypi.com', () => {
    // Bug réel trouvé et corrigé cette session via un test live sur GitHub Actions :
    // archive.raspberrypi.com/debian n'est qu'un dépôt d'ajout (noyau/firmware), pas un miroir
    // Debian complet ; un debootstrap direct dessus échoue avec "usr-is-merged" introuvable.
    const script = generateBuildScript(makeRecipe({ distro: 'raspbian', arch: 'aarch64', outputFormat: 'iso_hybrid' }));
    expect(script).toContain('deb.debian.org/debian bookworm main');
    expect(script).toContain('archive.raspberrypi.com/debian bookworm main');
    expect(script).toMatch(/debootstrap --arch="arm64"[\s\S]*?"http:\/\/deb\.debian\.org\/debian"/);
  });

  it('importe la clé GPG signed-by du dépôt Raspberry Pi avant apt-get update (sinon NO_PUBKEY)', () => {
    const script = generateBuildScript(makeRecipe({ distro: 'raspbian', arch: 'aarch64', outputFormat: 'iso_hybrid' }));
    expect(script).toContain('raspberrypi.gpg.key');
    expect(script).toContain('signed-by=/etc/apt/keyrings/raspberrypi.gpg.key');
    const keyIdx = script.indexOf('curl -fsSL https://archive.raspberrypi.com/debian/raspberrypi.gpg.key');
    const updateIdx = script.indexOf('# Mise à jour des index de paquets');
    expect(keyIdx).toBeGreaterThan(-1);
    expect(updateIdx).toBeGreaterThan(-1);
    expect(keyIdx).toBeLessThan(updateIdx);
  });

  it("utilise le vrai méta-paquet noyau raspberrypi-kernel (vérifié en live : linux-image-rpi-v8 n'existe pas)", () => {
    const script = generateBuildScript(makeRecipe({ distro: 'raspbian', arch: 'aarch64', outputFormat: 'iso_hybrid' }));
    expect(script).toContain('raspberrypi-kernel');
    expect(script).toContain('raspi-firmware');
    expect(script).not.toContain('linux-image-rpi-v8');
    expect(script).not.toContain('linux-image-arm64');
  });

  it("n'inclut PAS le noyau/firmware dans le --include du debootstrap (absents du miroir Debian de bootstrap)", () => {
    const script = generateBuildScript(makeRecipe({ distro: 'raspbian', arch: 'aarch64', outputFormat: 'iso_hybrid' }));
    const includeMatch = script.match(/--include="([^"]*)"/);
    expect(includeMatch).not.toBeNull();
    expect(includeMatch![1]).not.toContain('raspberrypi-kernel');
    expect(includeMatch![1]).not.toContain('raspi-firmware');
  });
});

describe('generateBuildScript — rpi_sd (carte SD Raspberry Pi, pipeline vérifié en live sur GitHub Actions)', () => {
  it('raspbian + aarch64 + rpi_sd génère un vrai pipeline carte SD (pas le repli ISO)', () => {
    const script = generateBuildScript(makeRecipe({ distro: 'raspbian', arch: 'aarch64', outputFormat: 'rpi_sd' }));
    expect(script).toContain('Image Carte SD Raspberry Pi');
    expect(script).not.toContain("n'est pas disponible pour cette combinaison");
  });

  it('bootstrap ARM64 via qemu-user-static + debootstrap --foreign/--second-stage', () => {
    const script = generateBuildScript(makeRecipe({ distro: 'raspbian', arch: 'aarch64', outputFormat: 'rpi_sd' }));
    expect(script).toContain('qemu-user-static');
    expect(script).toContain('debootstrap --arch=arm64 --foreign bookworm');
    expect(script).toContain('qemu-aarch64-static');
    expect(script).toContain('/debootstrap/debootstrap --second-stage');
  });

  it("partitionne en FAT32 boot (/boot/firmware) + ext4 root, PAS de GRUB", () => {
    const script = generateBuildScript(makeRecipe({ distro: 'raspbian', arch: 'aarch64', outputFormat: 'rpi_sd' }));
    expect(script).toContain('mkfs.vfat -F 32');
    expect(script).toContain('mkfs.ext4 -F -L rootfs');
    expect(script).toContain('/boot/firmware');
    expect(script).not.toContain('grub-install');
    expect(script).not.toContain('grub.cfg');
  });

  it('écrit cmdline.txt avec root=UUID (pas GRUB, RPi lit cmdline.txt/config.txt directement)', () => {
    const script = generateBuildScript(makeRecipe({ distro: 'raspbian', arch: 'aarch64', outputFormat: 'rpi_sd' }));
    expect(script).toContain('cmdline.txt');
    expect(script).toContain('root=UUID=${ROOT_UUID}');
    expect(script).toContain('rootwait');
  });

  it('compresse la sortie finale en .img.xz', () => {
    const script = generateBuildScript(makeRecipe({ distro: 'raspbian', arch: 'aarch64', outputFormat: 'rpi_sd' }));
    expect(script).toContain('xz -T0 -f');
    expect(script).toContain('.img.xz');
  });

  it('rpi_sd avec une autre distro (ex: ubuntu) retombe honnêtement sur le repli ISO', () => {
    const script = generateBuildScript(makeRecipe({ distro: 'ubuntu', arch: 'aarch64', outputFormat: 'rpi_sd' }));
    expect(script).not.toContain('Image Carte SD Raspberry Pi');
    expect(script).toContain("n'est pas disponible pour cette combinaison");
  });

  it('rpi_sd avec raspbian + x86_64 (pas de vrai matériel Pi 64-bit x86) retombe honnêtement sur le repli ISO', () => {
    const script = generateBuildScript(makeRecipe({ distro: 'raspbian', arch: 'x86_64', outputFormat: 'rpi_sd' }));
    expect(script).not.toContain('Image Carte SD Raspberry Pi');
    expect(script).toContain("n'est pas disponible pour cette combinaison");
  });
});

describe('generateBuildScript — sélection de noyau réellement câblée pour Arch (vérifié via archlinux.org/packages/search/json)', () => {
  it.each([
    ['zen', 'linux-zen'],
    ['hardened', 'linux-hardened'],
    ['lts', 'linux-lts'],
    ['realtime', 'linux-rt'],
  ] as const)('kernel=%s installe le vrai paquet officiel %s (image disque Arch)', (kernel, expectedPkg) => {
    const script = generateBuildScript(makeRecipe({ distro: 'arch', outputFormat: 'raw_img', kernel }));
    expect(script).toContain(`grub ${expectedPkg} linux-firmware`);
    expect(script).toContain(`/boot/vmlinuz-${expectedPkg}`);
    expect(script).toContain(`/boot/initramfs-${expectedPkg}.img`);
  });

  it("kernel=cachyos retombe honnêtement sur 'linux' avec un avertissement visible (linux-cachyos exige le dépôt CachyOS, non configuré)", () => {
    const script = generateBuildScript(makeRecipe({ distro: 'arch', outputFormat: 'raw_img', kernel: 'cachyos' }));
    expect(script).toContain("nécessite le dépôt CachyOS");
    expect(script).toContain('grub linux linux-firmware');
    // "linux-cachyos" apparaît légitimement DANS le message d'avertissement lui-même (nommer
    // le paquet indisponible) : ce qui compte, c'est qu'il n'apparaisse PAS comme commande
    // d'installation pacstrap réelle.
    expect(script).not.toMatch(/pacstrap[^\n]*linux-cachyos/);
  });

  it("kernel='generic' n'affiche aucun avertissement de repli", () => {
    const script = generateBuildScript(makeRecipe({ distro: 'arch', outputFormat: 'raw_img', kernel: 'generic' }));
    expect(script).not.toContain('[INFO]');
    expect(script).toContain('grub linux linux-firmware');
  });
});

describe('generateBuildScript — sélection de noyau réellement câblée pour Ubuntu/Mint (vérifié en live : kernel.ubuntu.com/mainline, PPA Liquorix officiel, boot QEMU réel)', () => {
  it("kernel=mainline_beta télécharge en direct le dernier noyau mainline officiel (kernel.ubuntu.com) et exclut le noyau générique du bootstrap", () => {
    const script = generateBuildScript(makeRecipe({ distro: 'ubuntu', outputFormat: 'iso_hybrid', kernel: 'mainline_beta' }));
    expect(script).toContain('https://kernel.ubuntu.com/mainline/');
    expect(script).toContain('MAINLINE_VER=');
    expect(script).not.toMatch(/--include="linux-image-generic,/);
  });

  it("kernel=liquorix ajoute le vrai PPA officiel (ppa:damentz/liquorix) et installe linux-image-liquorix-amd64", () => {
    const script = generateBuildScript(makeRecipe({ distro: 'ubuntu', outputFormat: 'iso_hybrid', kernel: 'liquorix' }));
    expect(script).toContain('add-apt-repository -y ppa:damentz/liquorix');
    expect(script).toContain('linux-image-liquorix-amd64');
    expect(script).not.toMatch(/--include="linux-image-generic,/);
  });

  it("kernel=cloud_micro installe le vrai paquet officiel Ubuntu linux-image-kvm", () => {
    const script = generateBuildScript(makeRecipe({ distro: 'ubuntu', outputFormat: 'iso_hybrid', kernel: 'cloud_micro' }));
    expect(script).toContain('apt-get install -y --no-install-recommends linux-image-kvm');
    expect(script).not.toMatch(/--include="linux-image-generic,/);
  });

  it("Linux Mint hérite du même câblage réel (mainline_beta)", () => {
    const script = generateBuildScript(makeRecipe({ distro: 'linuxmint', outputFormat: 'iso_hybrid', kernel: 'mainline_beta' }));
    expect(script).toContain('https://kernel.ubuntu.com/mainline/');
  });

  it("kernel=zen (non câblé pour Ubuntu) retombe honnêtement sur linux-image-generic avec avertissement visible", () => {
    const script = generateBuildScript(makeRecipe({ distro: 'ubuntu', outputFormat: 'iso_hybrid', kernel: 'zen' }));
    expect(script).toContain("n'est pas encore câblé pour ubuntu");
    expect(script).toContain('--include="linux-image-generic,');
    expect(script).not.toContain('kernel.ubuntu.com/mainline');
  });

  it("kernel='generic' n'affiche aucun avertissement de repli sur Ubuntu", () => {
    const script = generateBuildScript(makeRecipe({ distro: 'ubuntu', outputFormat: 'iso_hybrid', kernel: 'generic' }));
    expect(script).not.toContain("n'est pas encore câblé");
    expect(script).toContain('--include="linux-image-generic,');
  });
});

describe('generateBuildScript — noyau LTS/Realtime réellement câblé via XanMod (vérifié en direct sur xanmod.org)', () => {
  it("Debian + kernel=lts ajoute le vrai dépôt XanMod et installe linux-xanmod-lts-x64v1", () => {
    const script = generateBuildScript(makeRecipe({ distro: 'debian', arch: 'x86_64', outputFormat: 'iso_hybrid', kernel: 'lts' }));
    expect(script).toContain('https://dl.xanmod.org/archive.key');
    expect(script).toContain('deb.xanmod.org trixie main');
    expect(script).toContain('linux-xanmod-lts-x64v1');
    expect(script).not.toMatch(/--include="linux-image-amd64,/);
  });

  it("Ubuntu + kernel=realtime ajoute le vrai dépôt XanMod et installe linux-xanmod-rt-x64v2", () => {
    const script = generateBuildScript(makeRecipe({ distro: 'ubuntu', arch: 'x86_64', outputFormat: 'iso_hybrid', kernel: 'realtime' }));
    expect(script).toContain('deb.xanmod.org resolute main');
    expect(script).toContain('linux-xanmod-rt-x64v2');
  });

  it("XanMod n'est pas proposé hors x86_64 (aucun paquet officiel pour cette architecture)", () => {
    const script = generateBuildScript(makeRecipe({ distro: 'debian', arch: 'aarch64', outputFormat: 'iso_hybrid', kernel: 'lts' }));
    expect(script).not.toContain('xanmod');
    expect(script).toContain("n'est pas encore câblé pour debian");
  });
});

describe('resolvePackageList — Sway/Cinnamon/LXQt réellement câblés (étaient silencieusement ignorés : sélectionnables dans l\'UI mais aucun paquet installé)', () => {
  it.each([
    ['debian', 'sway', 'sway'],
    ['ubuntu', 'sway', 'sway'],
    ['arch', 'sway', 'sway'],
    ['fedora', 'sway', 'sway'],
    ['debian', 'cinnamon', 'cinnamon'],
    ['arch', 'cinnamon', 'cinnamon'],
    ['fedora', 'cinnamon', '@cinnamon-desktop'],
    ['debian', 'lxqt', 'lxqt'],
    ['arch', 'lxqt', 'lxqt-session'],
    ['fedora', 'lxqt', '@lxqt-desktop'],
  ] as const)('%s + desktop=%s installe un vrai paquet (%s)', (distro, desktop, expectedPkg) => {
    const recipe = makeRecipe({ distro, desktop, selectedPackages: [], customPackages: [] });
    const pkgs = resolvePackageList(recipe);
    expect(pkgs).toContain(expectedPkg);
  });

  it('desktop=sway ne contient aucun paquet des autres bureaux', () => {
    const pkgs = resolvePackageList(makeRecipe({ distro: 'debian', desktop: 'sway', selectedPackages: [], customPackages: [] }));
    expect(pkgs).not.toContain('gnome-core');
    expect(pkgs).not.toContain('plasma-desktop');
  });
});

describe('generateBuildScript — Rocky Linux : EPEL/CRB activés, bureaux réellement disponibles vérifiés individuellement (vs groupes @dnf non garantis)', () => {
  it('active les dépôts EPEL et CRB, requis pour KDE/XFCE/Cinnamon sur Rocky (docs.rockylinux.org)', () => {
    const script = generateBuildScript(makeRecipe({ distro: 'rocky', outputFormat: 'raw_img', desktop: 'kde' }));
    expect(script).toContain('[epel]');
    expect(script).toContain('[crb]');
    expect(script).toContain('--repo=epel');
    expect(script).toContain('--repo=crb');
  });

  it.each([
    ['kde', 'plasma-desktop'],
    ['xfce', 'xfce4-session'],
    ['cinnamon', 'cinnamon-desktop'],
  ] as const)('desktop=%s installe un vrai paquet EPEL9 (%s) au lieu d\'un groupe @dnf non garanti sur Rocky', (desktop, expectedPkg) => {
    const pkgs = resolvePackageList(makeRecipe({ distro: 'rocky', desktop, selectedPackages: [], customPackages: [] }));
    expect(pkgs).toContain(expectedPkg);
    expect(pkgs.some(p => p.startsWith('@'))).toBe(false);
  });

  it.each(['sway', 'lxqt'] as const)('desktop=%s n\'installe rien sur Rocky (confirmé absent même d\'EPEL9, contrairement à Fedora)', (desktop) => {
    const pkgs = resolvePackageList(makeRecipe({ distro: 'rocky', desktop, selectedPackages: [], customPackages: [] }));
    expect(pkgs.some(p => p.includes('sway') || p.includes('lxqt'))).toBe(false);
  });
});

describe('resolvePackageList — Alpine Linux : bureaux réellement câblés (aucun n\'était installé auparavant, quel que soit le choix)', () => {
  it.each([
    ['gnome', 'gnome'],
    ['kde', 'plasma-desktop'],
    ['xfce', 'xfce4'],
    ['hyprland', 'hyprland'],
    ['sway', 'sway'],
    ['lxqt', 'lxqt-session'],
  ] as const)('desktop=%s installe un vrai paquet Alpine vérifié (%s)', (desktop, expectedPkg) => {
    const pkgs = resolvePackageList(makeRecipe({ distro: 'alpine', desktop, selectedPackages: [], customPackages: [] }));
    expect(pkgs).toContain(expectedPkg);
  });

  it('desktop=i3wm installe "i3wm" (sans tiret) sur Alpine, contrairement à "i3-wm" partout ailleurs (piège réel trouvé en vérifiant)', () => {
    const alpinePkgs = resolvePackageList(makeRecipe({ distro: 'alpine', desktop: 'i3wm', selectedPackages: [], customPackages: [] }));
    expect(alpinePkgs).toContain('i3wm');
    expect(alpinePkgs).not.toContain('i3-wm');

    const debianPkgs = resolvePackageList(makeRecipe({ distro: 'debian', desktop: 'i3wm', selectedPackages: [], customPackages: [] }));
    expect(debianPkgs).toContain('i3-wm');
    expect(debianPkgs).not.toContain('i3wm');
  });
});

describe('resolvePackageList — Void Linux : bureaux réellement câblés (aucun n\'était installé auparavant, quel que soit le choix)', () => {
  it.each([
    ['gnome', 'gnome'],
    ['kde', 'plasma-desktop'],
    ['xfce', 'xfce4'],
    ['sway', 'sway'],
    ['lxqt', 'lxqt-session'],
    ['cinnamon', 'cinnamon'],
  ] as const)('desktop=%s installe un vrai paquet Void vérifié (%s)', (desktop, expectedPkg) => {
    const pkgs = resolvePackageList(makeRecipe({ distro: 'void', desktop, selectedPackages: [], customPackages: [] }));
    expect(pkgs).toContain(expectedPkg);
  });

  it('desktop=i3wm installe "i3" (ni "i3-wm" ni "i3wm") sur Void — 3e nom différent trouvé pour le même paquet', () => {
    const pkgs = resolvePackageList(makeRecipe({ distro: 'void', desktop: 'i3wm', selectedPackages: [], customPackages: [] }));
    expect(pkgs).toContain('i3');
    expect(pkgs).not.toContain('i3-wm');
    expect(pkgs).not.toContain('i3wm');
  });

  it('desktop=hyprland n\'installe rien sur Void (hyprland et waybar confirmés absents du dépôt officiel, contrairement à Alpine)', () => {
    const pkgs = resolvePackageList(makeRecipe({ distro: 'void', desktop: 'hyprland', selectedPackages: [], customPackages: [] }));
    expect(pkgs.some(p => p.includes('hyprland') || p === 'waybar')).toBe(false);
  });

  it('desktop=sway n\'installe pas "waybar" sur Void (confirmé absent du dépôt, contrairement à Alpine) mais installe sway', () => {
    const pkgs = resolvePackageList(makeRecipe({ distro: 'void', desktop: 'sway', selectedPackages: [], customPackages: [] }));
    expect(pkgs).toContain('sway');
    expect(pkgs).not.toContain('waybar');
  });
});

describe('resolvePackageList — openSUSE Tumbleweed : bureaux réellement câblés (aucun n\'était installé auparavant, quel que soit le choix)', () => {
  it.each([
    ['gnome', 'patterns-gnome-gnome'],
    ['kde', 'plasma6-desktop'],
    ['xfce', 'patterns-xfce-xfce'],
    ['hyprland', 'hyprland'],
    ['i3wm', 'i3'],
    ['sway', 'sway'],
    ['cinnamon', 'cinnamon'],
    ['lxqt', 'patterns-lxqt-lxqt'],
  ] as const)('desktop=%s installe un vrai paquet/pattern openSUSE vérifié (%s)', (desktop, expectedPkg) => {
    const pkgs = resolvePackageList(makeRecipe({ distro: 'opensuse', desktop, selectedPackages: [], customPackages: [] }));
    expect(pkgs).toContain(expectedPkg);
  });

  it('installe "MozillaFirefox" (pas "firefox") sur openSUSE — nom de paquet spécifique trouvé en vérifiant', () => {
    const pkgs = resolvePackageList(makeRecipe({ distro: 'opensuse', desktop: 'gnome', selectedPackages: [], customPackages: [] }));
    expect(pkgs).toContain('MozillaFirefox');
    expect(pkgs).not.toContain('firefox');
  });
});

describe('generateBuildScript / generateCloudInitYaml — pare-feu "nftables" réellement câblé (bug réel trouvé : sélectionnable dans l\'UI mais jamais référencé nulle part, zéro paquet installé, zéro règle configurée)', () => {
  it('ISO Debian/APT : installe nftables et écrit un vrai jeu de règles (deny incoming par défaut)', () => {
    const script = generateBuildScript(makeRecipe({
      distro: 'debian', outputFormat: 'iso_hybrid', enableSSH: true,
      security: { cisBenchmarkLevel: 1, firewall: 'nftables', appArmorOrSELinux: true, autoSecurityUpdates: true } as any,
    }));
    expect(script).toContain('apt-get install -y --no-install-recommends nftables');
    expect(script).toContain('policy drop');
    expect(script).toContain('tcp dport 22 accept');
    expect(script).toContain('nft -f /etc/nftables.conf');
  });

  it('ISO : n\'ajoute pas la règle SSH si enableSSH=false', () => {
    const script = generateBuildScript(makeRecipe({
      distro: 'debian', outputFormat: 'iso_hybrid', enableSSH: false,
      security: { cisBenchmarkLevel: 1, firewall: 'nftables', appArmorOrSELinux: true, autoSecurityUpdates: true } as any,
    }));
    expect(script).not.toContain('tcp dport 22 accept');
  });

  it('firewall="none" ne câble ni ufw ni nftables', () => {
    const script = generateBuildScript(makeRecipe({
      distro: 'debian', outputFormat: 'iso_hybrid',
      security: { cisBenchmarkLevel: 1, firewall: 'none', appArmorOrSELinux: true, autoSecurityUpdates: true } as any,
    }));
    expect(script).not.toContain('install -y --no-install-recommends nftables');
    expect(script).not.toContain('install -y --no-install-recommends ufw');
  });

  it('cloud-init : ajoute nftables aux paquets et un fichier de règles réel (bug annexe corrigé : "ufw" n\'était lui non plus jamais ajouté aux paquets cloud-init malgré "ufw --force enable" dans runcmd)', () => {
    const yaml = generateCloudInitYaml(makeRecipe({
      distro: 'ubuntu', outputFormat: 'qcow2', enableSSH: true,
      security: { cisBenchmarkLevel: 1, firewall: 'nftables', appArmorOrSELinux: true, autoSecurityUpdates: true } as any,
    }));
    expect(yaml).toContain('- nftables');
    expect(yaml).toContain('/etc/nftables.conf');
    expect(yaml).toContain('nft -f /etc/nftables.conf');
  });

  it('cloud-init : ajoute "ufw" aux paquets quand firewall="ufw" (paquet jamais installé auparavant, seulement activé)', () => {
    const yaml = generateCloudInitYaml(makeRecipe({
      distro: 'ubuntu', outputFormat: 'qcow2',
      security: { cisBenchmarkLevel: 1, firewall: 'ufw', appArmorOrSELinux: true, autoSecurityUpdates: true } as any,
    }));
    expect(yaml).toContain('- ufw');
  });
});

describe('resolvePackageList / generateBuildScript — "enableSSH" réellement câblé (bug réel trouvé : n\'installait ni n\'activait jamais le serveur SSH, sur AUCUNE distro — seul le fichier authorized_keys était écrit)', () => {
  it.each([
    ['debian', 'openssh-server'],
    ['ubuntu', 'openssh-server'],
    ['arch', 'openssh'],
    ['fedora', 'openssh-server'],
    ['rocky', 'openssh-server'],
    ['alpine', 'openssh-server'],
    ['opensuse', 'openssh'],
    ['void', 'openssh'],
  ] as const)('distro=%s + enableSSH=true installe le vrai paquet SSH (%s)', (distro, expectedPkg) => {
    const pkgs = resolvePackageList(makeRecipe({ distro, enableSSH: true, selectedPackages: [], customPackages: [] }));
    expect(pkgs).toContain(expectedPkg);
  });

  it('enableSSH=false n\'installe aucun paquet SSH', () => {
    const pkgs = resolvePackageList(makeRecipe({ distro: 'debian', enableSSH: false, selectedPackages: [], customPackages: [] }));
    expect(pkgs.some(p => p.includes('ssh'))).toBe(false);
  });

  it('Debian/Ubuntu : active le service "ssh" (pas "sshd") au premier boot', () => {
    const script = generateBuildScript(makeRecipe({ distro: 'debian', outputFormat: 'iso_hybrid', enableSSH: true }));
    expect(script).toContain('systemctl enable ssh ');
  });

  it.each(['arch', 'fedora', 'opensuse'] as const)('%s (systemd) : active le service "sshd" au premier boot', (distro) => {
    const script = generateBuildScript(makeRecipe({ distro, outputFormat: 'raw_img', enableSSH: true }));
    expect(script).toContain('systemctl enable sshd');
  });

  it('Alpine (OpenRC) : active sshd via rc-update, pas systemctl', () => {
    const script = generateBuildScript(makeRecipe({ distro: 'alpine', outputFormat: 'raw_img', enableSSH: true }));
    expect(script).toContain('rc-update add sshd default');
  });

  it('Void (runit) : active sshd via un lien symbolique runsvdir, pas systemctl ni rc-update', () => {
    const script = generateBuildScript(makeRecipe({ distro: 'void', outputFormat: 'raw_img', enableSSH: true }));
    expect(script).toContain('/etc/sv/sshd');
    expect(script).toContain('runsvdir/default/sshd');
  });
});

describe('generateBuildScript — "keyboardLayout" réellement câblé (bug réel trouvé : jamais référencé, le clavier gardait toujours la disposition par défaut de l\'image)', () => {
  it('Debian/Ubuntu : écrit /etc/default/keyboard (vrai mécanisme Debian, pilote console + X11)', () => {
    const script = generateBuildScript(makeRecipe({ distro: 'debian', outputFormat: 'iso_hybrid', keyboardLayout: 'fr' }));
    expect(script).toContain('/etc/default/keyboard');
    expect(script).toContain('XKBLAYOUT="fr"');
  });

  it('"uk" se traduit en vrai code XKB "gb" (pas "uk", qui n\'existe pas dans XKB)', () => {
    const script = generateBuildScript(makeRecipe({ distro: 'debian', outputFormat: 'iso_hybrid', keyboardLayout: 'uk' }));
    expect(script).toContain('XKBLAYOUT="gb"');
    expect(script).not.toContain('XKBLAYOUT="uk"');
  });

  it.each([
    ['ca-fr', 'ca', 'fr'],
    ['ch-fr', 'ch', 'fr'],
  ] as const)('"%s" sépare correctement layout="%s" et variant="%s" (convention XKB)', (uiId, layout, variant) => {
    const script = generateBuildScript(makeRecipe({ distro: 'arch', outputFormat: 'raw_img', keyboardLayout: uiId }));
    expect(script).toContain(`Option "XkbLayout" "${layout}"`);
    expect(script).toContain(`Option "XkbVariant" "${variant}"`);
  });

  it('familles non-Debian : écrit aussi /etc/X11/xorg.conf.d/00-keyboard.conf et /etc/vconsole.conf', () => {
    const script = generateBuildScript(makeRecipe({ distro: 'fedora', outputFormat: 'raw_img', keyboardLayout: 'de' }));
    expect(script).toContain('/etc/X11/xorg.conf.d/00-keyboard.conf');
    expect(script).toContain('KEYMAP=de');
  });
});

describe('generateBuildScript — service du gestionnaire de connexion réellement activé au boot (bug MAJEUR trouvé : grep confirmait zéro "systemctl enable gdm/sddm/lightdm" ou équivalent OpenRC/runit dans tout le fichier — le paquet s\'installait mais le systeme demarrait toujours sur une console texte, jamais la session graphique, quel que soit le bureau choisi)', () => {
  it('Debian/Ubuntu : "gdm3" reste "gdm3" (nom du service Debian), activé via systemctl', () => {
    const script = generateBuildScript(makeRecipe({ distro: 'debian', outputFormat: 'iso_hybrid', desktop: 'gnome', displayManager: 'gdm3' }));
    expect(script).toContain('systemctl enable gdm3');
  });

  it.each(['arch', 'fedora', 'opensuse'] as const)('%s : "gdm3" se traduit en service "gdm" (pas "gdm3", nom spécifique à Debian)', (distro) => {
    const script = generateBuildScript(makeRecipe({ distro, outputFormat: 'raw_img', desktop: 'gnome', displayManager: 'gdm3' }));
    expect(script).toContain('systemctl enable gdm ');
    expect(script).not.toContain('systemctl enable gdm3');
  });

  it('Alpine (OpenRC) : active via rc-update, pas systemctl', () => {
    const script = generateBuildScript(makeRecipe({ distro: 'alpine', outputFormat: 'raw_img', desktop: 'kde', displayManager: 'sddm' }));
    expect(script).toContain('rc-update add sddm default');
  });

  it('Void (runit) : active via un lien symbolique runsvdir, pas systemctl ni rc-update', () => {
    const script = generateBuildScript(makeRecipe({ distro: 'void', outputFormat: 'raw_img', desktop: 'xfce', displayManager: 'lightdm' }));
    expect(script).toContain('/etc/sv/lightdm');
    expect(script).toContain('runsvdir/default/lightdm');
  });

  it('displayManager="none" (headless) n\'active aucun service graphique', () => {
    const script = generateBuildScript(makeRecipe({ distro: 'debian', outputFormat: 'iso_hybrid', desktop: 'none', displayManager: 'none' }));
    expect(script).not.toContain('systemctl enable gdm');
    expect(script).not.toContain('systemctl enable sddm');
    expect(script).not.toContain('systemctl enable lightdm');
  });
});

describe('generateBuildScript — mode kiosque ("kioskUrl") réellement câblé (bug réel trouvé : jamais référencé — chromium/cage/seatd s\'installaient sans jamais rien lancer, ni URL configurée, ni seatd activé, ni auto-login)', () => {
  it('utilise la vraie URL choisie dans le script de lancement cage', () => {
    const script = generateBuildScript(makeRecipe({
      distro: 'debian', outputFormat: 'iso_hybrid', desktop: 'web_kiosk', displayManager: 'none',
      kioskUrl: 'https://example.com/dashboard',
    }));
    expect(script).toContain("exec cage -- chromium");
    expect(script).toContain('https://example.com/dashboard');
  });

  it('échappe correctement une apostrophe dans l\'URL (injection shell potentielle sinon)', () => {
    const script = generateBuildScript(makeRecipe({
      distro: 'debian', outputFormat: 'iso_hybrid', desktop: 'web_kiosk', displayManager: 'none',
      kioskUrl: "https://x.test/?a='b'",
    }));
    // Motif d'échappement shell standard pour une apostrophe à l'intérieur d'une chaîne entre
    // apostrophes : fermer, insérer \', rouvrir — jamais l'apostrophe brute non échappée.
    expect(script).toContain("https://x.test/?a='\\''b'\\''");
    expect(script).not.toContain("kioskUrl: \"https://x.test/?a='b'\"");
  });

  it('sans URL choisie, retombe sur "about:blank" plutôt que de planter', () => {
    const script = generateBuildScript(makeRecipe({ distro: 'debian', outputFormat: 'iso_hybrid', desktop: 'web_kiosk', displayManager: 'none', kioskUrl: undefined as any }));
    expect(script).toContain("'about:blank'");
  });

  it('Debian/Arch/Fedora/Alpine/Void : installe "chromium" (bare) — "chromium-browser" n\'existe même pas sur Debian et est un stub snap sur Ubuntu (piège identique à Firefox déjà corrigé)', () => {
    const pkgs = resolvePackageList(makeRecipe({ distro: 'debian', desktop: 'web_kiosk', selectedPackages: [], customPackages: [] }));
    expect(pkgs).toContain('chromium');
    expect(pkgs).not.toContain('chromium-browser');
  });

  it('Ubuntu/Mint : bascule sur Firefox (vrai dépôt Mozilla déjà câblé) plutôt qu\'un chromium snap non fonctionnel', () => {
    const pkgs = resolvePackageList(makeRecipe({ distro: 'ubuntu', desktop: 'web_kiosk', selectedPackages: [], customPackages: [] }));
    expect(pkgs).toContain('firefox');
    expect(pkgs).not.toContain('chromium');
    const script = generateBuildScript(makeRecipe({ distro: 'ubuntu', outputFormat: 'iso_hybrid', desktop: 'web_kiosk', displayManager: 'none' }));
    expect(script).toContain('packages.mozilla.org');
    expect(script).toContain('exec cage -- firefox --kiosk');
  });

  it('active le service "seatd" (requis par cage pour l\'accès GPU/input, jamais activé auparavant)', () => {
    const script = generateBuildScript(makeRecipe({ distro: 'arch', outputFormat: 'raw_img', desktop: 'web_kiosk', displayManager: 'none' }));
    expect(script).toContain('systemctl enable seatd');
  });

  it('active un vrai auto-login getty (systemd) pour atteindre la session kiosque sans intervention', () => {
    const script = generateBuildScript(makeRecipe({ distro: 'debian', outputFormat: 'iso_hybrid', desktop: 'web_kiosk', displayManager: 'none', user: { username: 'kiosk', fullName: 'Kiosk', shell: '/bin/bash', sudo: true, password: 'x', sshPublicKey: '' } as any }));
    expect(script).toContain('--autologin kiosk');
  });

  it('Alpine/Void : n\'édite pas l\'init à l\'aveugle, affiche un avertissement honnête à la place', () => {
    const alpine = generateBuildScript(makeRecipe({ distro: 'alpine', outputFormat: 'raw_img', desktop: 'web_kiosk', displayManager: 'none' }));
    expect(alpine).toContain('Auto-login console non câblé');
    expect(alpine).not.toContain('/etc/systemd/system/getty@tty1');
  });

  it('desktop != "web_kiosk" ne touche à rien (pas de seatd, pas d\'auto-login, pas de cage)', () => {
    const script = generateBuildScript(makeRecipe({ distro: 'debian', outputFormat: 'iso_hybrid', desktop: 'gnome', displayManager: 'gdm3' }));
    expect(script).not.toContain('exec cage');
    expect(script).not.toContain('seatd');
  });
});

describe('generateBuildScript — familles sans noyau câblé : avertissement honnête plutôt que choix ignoré en silence', () => {
  it('Fedora + kernel non générique affiche un avertissement de repli explicite', () => {
    const script = generateBuildScript(makeRecipe({ distro: 'fedora', outputFormat: 'raw_img', kernel: 'zen' }));
    expect(script).toContain("n'a pas de paquet officiel dnf");
  });

  it('Debian (APT) + kernel non générique affiche un avertissement de repli explicite', () => {
    const script = generateBuildScript(makeRecipe({ distro: 'debian', outputFormat: 'iso_hybrid', kernel: 'hardened' }));
    expect(script).toContain("n'est pas encore câblé pour debian");
  });

  it('Debian (APT) + kernel="generic" (défaut) ne montre aucun avertissement de repli', () => {
    const script = generateBuildScript(makeRecipe({ distro: 'debian', outputFormat: 'iso_hybrid', kernel: 'generic' }));
    expect(script).not.toContain("n'est pas encore câblé");
  });
});
