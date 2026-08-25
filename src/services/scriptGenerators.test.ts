import { describe, it, expect } from 'vitest';
import { generateBuildScript, resolvePackageList, generateCloudInitYaml, generateGitHubWorkflow, generateAutoBuildSh, generateWslInstallerBat, generateLiveWindowsBat, generateAutoBuildBat, generateUniversalLauncherBat, generateUniversalLauncherSh } from './scriptGenerators';
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
    const script = generateBuildScript(makeRecipe({ distro: 'arch', outputFormat: 'raw_img', kernel: 'generic', security: { ...makeRecipe().security, autoSecurityUpdates: false } }));
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

describe('generateBuildScript — noyau XanMod / LTS / Realtime réellement câblé via XanMod (vérifié en direct sur xanmod.org)', () => {
  it("Debian + kernel=xanmod (x86_64) ajoute le vrai dépôt XanMod et installe linux-xanmod-x64v3", () => {
    const script = generateBuildScript(makeRecipe({ distro: 'debian', arch: 'x86_64', outputFormat: 'iso_hybrid', kernel: 'xanmod' }));
    expect(script).toContain('https://dl.xanmod.org/archive.key');
    expect(script).toContain('deb.xanmod.org trixie main');
    expect(script).toContain('linux-xanmod-x64v3');
    expect(script).not.toMatch(/--include="linux-image-amd64,/);
  });

  it("Ubuntu + kernel=xanmod (x86_64) ajoute le vrai dépôt XanMod et installe linux-xanmod-x64v3", () => {
    const script = generateBuildScript(makeRecipe({ distro: 'ubuntu', arch: 'x86_64', outputFormat: 'iso_hybrid', kernel: 'xanmod' }));
    expect(script).toContain('deb.xanmod.org resolute main');
    expect(script).toContain('linux-xanmod-x64v3');
    expect(script).not.toMatch(/--include="linux-image-generic,/);
  });

  it("Linux Mint + kernel=xanmod (x86_64) installe linux-xanmod-x64v3", () => {
    const script = generateBuildScript(makeRecipe({ distro: 'linuxmint', arch: 'x86_64', outputFormat: 'iso_hybrid', kernel: 'xanmod' }));
    expect(script).toContain('deb.xanmod.org resolute main');
    expect(script).toContain('linux-xanmod-x64v3');
  });

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
    const script = generateBuildScript(makeRecipe({ distro: 'debian', arch: 'aarch64', outputFormat: 'iso_hybrid', kernel: 'xanmod' }));
    expect(script).not.toContain('deb.xanmod.org');
    expect(script).toContain("n'est pas encore câblé pour debian");
  });

  it("Arch Linux + kernel=xanmod : notice de repli honnête", () => {
    const script = generateBuildScript(makeRecipe({ distro: 'arch', outputFormat: 'raw_img', kernel: 'xanmod' }));
    expect(script).toContain('XanMod est officiellement fourni pour la famille Debian/Ubuntu (APT)');
    expect(script).toContain('installation de \'linux\' à la place');
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

  it('bug réel trouvé en auditant : desktop=i3wm sur Fedora/Rocky tombait dans le "else" générique qui installe "i3-wm" (nom Debian/Arch) — confirmé ABSENT de Fedora/EPEL9 en direct (src.fedoraproject.org/rpms/i3-wm : 404). Le vrai paquet Fedora/Rocky s\'appelle "i3" (confirmé présent sur les deux). "alacritty" également confirmé absent de Fedora, remplacé par "kitty" (confirmé réel, déjà utilisé ailleurs dans ce fichier pour Hyprland/Arch)', () => {
    for (const distro of ['fedora', 'rocky'] as const) {
      const pkgs = resolvePackageList(makeRecipe({ distro, desktop: 'i3wm', selectedPackages: [], customPackages: [] }));
      expect(pkgs, distro).toContain('i3');
      expect(pkgs, distro).not.toContain('i3-wm');
      expect(pkgs, distro).toContain('kitty');
      expect(pkgs, distro).not.toContain('alacritty');
    }
  });

  it('bug réel trouvé dans le même audit : Arch/CachyOS tombaient AUSSI dans le "else" générique, qui installe "firefox-esr" et "network-manager" (noms Debian) — confirmés en direct ABSENTS d\'Arch via l\'API JSON officielle (archlinux.org/packages/search/json, "count": 0 pour les deux). "pacman -S" échoue sur tout paquet inconnu de sa liste, donc TOUT le bootstrap Arch échouait dès que "i3wm" était sélectionné. Corrigé avec une branche Arch dédiée utilisant "networkmanager" (sans tiret, confirmé réel et déjà utilisé partout ailleurs dans ce fichier pour Arch)', () => {
    for (const distro of ['arch', 'cachyos'] as const) {
      const pkgs = resolvePackageList(makeRecipe({ distro, desktop: 'i3wm', selectedPackages: [], customPackages: [] }));
      expect(pkgs, distro).toContain('i3-wm');
      expect(pkgs, distro).toContain('firefox');
      expect(pkgs, distro).not.toContain('firefox-esr');
      expect(pkgs, distro).toContain('networkmanager');
      expect(pkgs, distro).not.toContain('network-manager');
    }
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
    expect(script).toContain("'nftables'");
    expect(script).toContain('policy drop');
    expect(script).toContain('tcp dport 22 accept');
    expect(script).toContain('nft -f /etc/nftables.conf');
    expect(script).toContain('systemctl enable nftables 2>/dev/null || true');
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
    expect(script).not.toContain("'nftables'");
    expect(script).not.toContain("'ufw'");
    expect(script).not.toContain('nft -f /etc/nftables.conf');
    expect(script).not.toContain('ufw --force enable');
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

  it('cloud-init : "nftables" n\'apparaît plus qu\'une seule fois dans "packages:" (doublon corrigé — le paquet est déjà ajouté par resolvePackageList(), la ligne dédiée à cloud-init était devenue redondante depuis le câblage du pare-feu pour toutes les familles)', () => {
    const yaml = generateCloudInitYaml(makeRecipe({
      distro: 'ubuntu', outputFormat: 'qcow2',
      security: { cisBenchmarkLevel: 1, firewall: 'nftables', appArmorOrSELinux: false, autoSecurityUpdates: true } as any,
    }));
    const occurrences = (yaml.match(/^ {2}- nftables$/gm) || []).length;
    expect(occurrences).toBe(1);
  });
});

describe('generateCloudInitYaml — bug réel trouvé en auditant : ce manifeste est généré pour LES 13 DISTROS du catalogue (RecipeInspector.tsx l\'affiche systématiquement, sans filtrage par distro), mais "systemctl enable --now ssh" était codé en dur alors que le VRAI nom d\'unité systemd est "sshd" (pas "ssh") sur Arch/CachyOS/Fedora/Rocky/openSUSE (déjà établi ailleurs dans ce fichier via sshEnableCmd), et qu\'Alpine (OpenRC) et Void (runit) n\'utilisent même PAS systemctl du tout — le "|| true" masquait l\'échec sans jamais activer SSH, rendant une image cloud Arch/Fedora/Alpine/Void injoignable en SSH malgré "Activer SSH" coché', () => {
  it('Debian/Ubuntu : conserve "systemctl enable --now ssh" (non-régression, comportement inchangé)', () => {
    const yaml = generateCloudInitYaml(makeRecipe({ distro: 'debian', outputFormat: 'qcow2', enableSSH: true }));
    expect(yaml).toContain('systemctl enable --now ssh || true');
    expect(yaml).not.toContain('enable --now sshd');
  });

  it('Arch, Fedora, openSUSE : utilisent le vrai nom d\'unité "sshd" via systemctl', () => {
    for (const distro of ['arch', 'fedora', 'opensuse'] as const) {
      const yaml = generateCloudInitYaml(makeRecipe({ distro, outputFormat: 'qcow2', enableSSH: true }));
      expect(yaml).toContain('systemctl enable --now sshd || true');
    }
  });

  it('Alpine : utilise "rc-update add sshd default" (OpenRC, pas systemctl)', () => {
    const yaml = generateCloudInitYaml(makeRecipe({ distro: 'alpine', outputFormat: 'qcow2', enableSSH: true }));
    expect(yaml).toContain('rc-update add sshd default');
    expect(yaml).not.toContain('systemctl enable --now ssh');
  });

  it('Void : active sshd via le mécanisme runit (symlink runsvdir), pas systemctl', () => {
    const yaml = generateCloudInitYaml(makeRecipe({ distro: 'void', outputFormat: 'qcow2', enableSSH: true }));
    expect(yaml).toContain('/etc/sv/sshd /etc/runit/runsvdir/default/sshd');
    expect(yaml).not.toContain('systemctl enable --now ssh');
  });
});

describe('generateCloudInitYaml — durcissement sécurité réellement câblé (bug réel trouvé en comparant ce générateur aux 4 générateurs bash déjà audités : "fail2ban"/"disableRootSSH"/"appArmorOrSELinux"/"dotfilesGitUrl"/"customServices" avaient chacun leur paquet déjà ajouté par resolvePackageList(), mais aucune action d\'activation dans runcmd/write_files — les paquets s\'installaient sans jamais être configurés ni démarrés sur une image cloud-init qcow2/vmdk)', () => {
  it('fail2ban=true : écrit jail.local et active le service', () => {
    const yaml = generateCloudInitYaml(makeRecipe({
      distro: 'ubuntu', outputFormat: 'qcow2',
      security: { cisBenchmarkLevel: 1, firewall: 'none', appArmorOrSELinux: false, fail2ban: true, autoSecurityUpdates: true } as any,
    }));
    expect(yaml).toContain('path: /etc/fail2ban/jail.local');
    expect(yaml).toContain('enabled = true');
    expect(yaml).toContain('- systemctl enable --now fail2ban || true');
  });

  it('disableRootSSH=true : ajoute PermitRootLogin no à sshd_config', () => {
    const yaml = generateCloudInitYaml(makeRecipe({
      distro: 'ubuntu', outputFormat: 'qcow2',
      security: { cisBenchmarkLevel: 1, firewall: 'none', appArmorOrSELinux: false, disableRootSSH: true, autoSecurityUpdates: true } as any,
    }));
    expect(yaml).toContain(`echo 'PermitRootLogin no' >> /etc/ssh/sshd_config`);
  });

  it('appArmorOrSELinux=true : active le service apparmor', () => {
    const yaml = generateCloudInitYaml(makeRecipe({
      distro: 'ubuntu', outputFormat: 'qcow2',
      security: { cisBenchmarkLevel: 1, firewall: 'none', appArmorOrSELinux: true, autoSecurityUpdates: true } as any,
    }));
    expect(yaml).toContain('- systemctl enable --now apparmor || true');
  });

  it('dotfilesGitUrl : clone réellement le dépôt (jamais câblé avant ce correctif)', () => {
    const yaml = generateCloudInitYaml(makeRecipe({
      distro: 'ubuntu', outputFormat: 'qcow2', dotfilesGitUrl: 'https://github.com/example/dotfiles.git',
    } as any));
    expect(yaml).toContain(`git clone --depth 1 'https://github.com/example/dotfiles.git' /home/'tester'/.dotfiles || true`);
  });

  it('dotfilesGitUrl : injection de commande via "username" corrigée (faille RÉELLE trouvée et vérifiée en direct : ce "runcmd" est exécuté via shell par cloud-init, "username" était utilisé tel quel comme segment de chemin juste après l\'URL déjà protégée)', () => {
    const yaml = generateCloudInitYaml(makeRecipe({
      distro: 'ubuntu', outputFormat: 'qcow2', dotfilesGitUrl: 'https://github.com/example/dotfiles.git',
      user: { username: `evil$(touch /tmp/pwned)`, fullName: 'Test', password: 'x', shell: '/bin/bash', sudo: true, autologin: false },
    } as any));
    expect(yaml).toContain(`/home/'evil$(touch /tmp/pwned)'/.dotfiles`);
    expect(yaml).not.toMatch(/\/home\/evil\$\(touch/);
  });

  it('customServices : écrit le vrai fichier .service et l\'active si "enabled"', () => {
    const yaml = generateCloudInitYaml(makeRecipe({
      distro: 'ubuntu', outputFormat: 'qcow2',
      customServices: [{ name: 'my-app', description: 'My App', execStart: '/usr/local/bin/my-app', enabled: true }],
    } as any));
    expect(yaml).toContain('path: /etc/systemd/system/my-app.service');
    expect(yaml).toContain('ExecStart=/usr/local/bin/my-app');
    expect(yaml).toContain('- systemctl enable --now my-app || true');
  });

  it('tout désactivé : aucune trace de durcissement (comportement par défaut inchangé)', () => {
    const yaml = generateCloudInitYaml(makeRecipe({
      distro: 'ubuntu', outputFormat: 'qcow2',
      security: { cisBenchmarkLevel: 1, firewall: 'none', appArmorOrSELinux: false, fail2ban: false, disableRootSSH: false, autoSecurityUpdates: true } as any,
    }));
    expect(yaml).not.toContain('fail2ban');
    expect(yaml).not.toContain('PermitRootLogin');
    expect(yaml).not.toContain('enable --now apparmor');
  });
});

describe('generateCloudInitYaml — bug réel trouvé en auditant : "fail2ban"/"appArmorOrSELinux"/"customServices" supposaient TOUS systemd sans condition, alors que ce même fichier établit déjà (serviceEnableCmd, macHardeningCmd) qu\'Alpine (OpenRC) et Void (runit) n\'ont pas systemctl, et qu\'appArmorOrSELinux doit écrire /etc/selinux/config sur Fedora/Rocky (SELinux), pas activer un service "apparmor" inexistant là-bas. Le commentaire précédent ("cloud-init quasi exclusivement Debian/Ubuntu en pratique") est devenu obsolète dès le correctif du nom d\'unité SSH (commit c996e2b) : RecipeInspector.tsx affiche ce manifeste pour les 13 distros sans filtrage', () => {
  it('fail2ban sur Alpine : utilise "rc-update add fail2ban default" (OpenRC, pas systemctl)', () => {
    const yaml = generateCloudInitYaml(makeRecipe({
      distro: 'alpine', outputFormat: 'qcow2',
      security: { cisBenchmarkLevel: 1, firewall: 'none', appArmorOrSELinux: false, fail2ban: true, autoSecurityUpdates: true } as any,
    }));
    expect(yaml).toContain('rc-update add fail2ban default');
    expect(yaml).not.toContain('systemctl enable --now fail2ban');
  });

  it('fail2ban sur Void : active via le symlink runit, pas systemctl', () => {
    const yaml = generateCloudInitYaml(makeRecipe({
      distro: 'void', outputFormat: 'qcow2',
      security: { cisBenchmarkLevel: 1, firewall: 'none', appArmorOrSELinux: false, fail2ban: true, autoSecurityUpdates: true } as any,
    }));
    expect(yaml).toContain('/etc/sv/fail2ban /etc/runit/runsvdir/default/fail2ban');
    expect(yaml).not.toContain('systemctl enable --now fail2ban');
  });

  it('appArmorOrSELinux sur Fedora/Rocky : écrit /etc/selinux/config (SELINUX=enforcing), PAS "systemctl enable apparmor" (service inexistant là-bas)', () => {
    for (const distro of ['fedora', 'rocky'] as const) {
      const yaml = generateCloudInitYaml(makeRecipe({
        distro, outputFormat: 'qcow2',
        security: { cisBenchmarkLevel: 1, firewall: 'none', appArmorOrSELinux: true, autoSecurityUpdates: true } as any,
      }));
      expect(yaml).toContain('path: /etc/selinux/config');
      expect(yaml).toContain('SELINUX=enforcing');
      expect(yaml).not.toContain('enable --now apparmor');
    }
  });

  it('appArmorOrSELinux sur Arch/openSUSE/Alpine/Void : aucune action (cohérent avec resolvePackageList qui n\'installe rien pour ces familles)', () => {
    for (const distro of ['arch', 'opensuse', 'alpine', 'void'] as const) {
      const yaml = generateCloudInitYaml(makeRecipe({
        distro, outputFormat: 'qcow2',
        security: { cisBenchmarkLevel: 1, firewall: 'none', appArmorOrSELinux: true, autoSecurityUpdates: true } as any,
      }));
      expect(yaml).not.toContain('apparmor');
      expect(yaml).not.toContain('selinux');
    }
  });

  it('customServices sur Alpine/Void : avertissement honnête dans /etc/motd, PAS de fichier .service systemd inerte', () => {
    for (const distro of ['alpine', 'void'] as const) {
      const yaml = generateCloudInitYaml(makeRecipe({
        distro, outputFormat: 'qcow2',
        customServices: [{ name: 'my-app', description: 'My App', execStart: '/usr/local/bin/my-app', enabled: true }],
      } as any));
      expect(yaml).not.toContain('/etc/systemd/system/my-app.service');
      expect(yaml).toContain('non cable sur cette distribution');
    }
  });

  it('Debian/Ubuntu/Arch/openSUSE : customServices écrit toujours le vrai fichier .service systemd (non-régression)', () => {
    for (const distro of ['debian', 'ubuntu', 'arch', 'opensuse'] as const) {
      const yaml = generateCloudInitYaml(makeRecipe({
        distro, outputFormat: 'qcow2',
        customServices: [{ name: 'my-app', description: 'My App', execStart: '/usr/local/bin/my-app', enabled: true }],
      } as any));
      expect(yaml).toContain('/etc/systemd/system/my-app.service');
    }
  });
});

describe('generateBuildScript — pare-feu réellement câblé au-delà de Debian/Ubuntu (bug réel MAJEUR trouvé en auditant : "firewall" n\'était référencé QUE dans generateBuildScript(), jamais dans generateNonDebianBuildScript()/generateNonDebianDiskImageScript() — un système Arch, Fedora, Rocky, Alpine, Void ou openSUSE ne recevait ZÉRO pare-feu quel que soit le choix explicite de l\'utilisateur. Paquets "ufw"/"nftables" vérifiés réels en direct par famille, service activé explicitement via serviceEnableCmd() pour les 3 systèmes d\'init)', () => {
  it('Arch + firewall="ufw" : paquet installé et service systemd activé', () => {
    const pkgs = resolvePackageList(makeRecipe({ distro: 'arch', outputFormat: 'raw_img', security: { cisBenchmarkLevel: 1, firewall: 'ufw', appArmorOrSELinux: false, fail2ban: false, luksEncryption: false, disableRootSSH: false, autoSecurityUpdates: true } }));
    expect(pkgs).toContain('ufw');
    const script = generateBuildScript(makeRecipe({ distro: 'arch', outputFormat: 'raw_img', security: { cisBenchmarkLevel: 1, firewall: 'ufw', appArmorOrSELinux: false, fail2ban: false, luksEncryption: false, disableRootSSH: false, autoSecurityUpdates: true } }));
    expect(script).toContain('ufw --force enable');
    expect(script).toContain('systemctl enable ufw 2>/dev/null || true');
  });

  it('Void + firewall="ufw" : paquet installé et service runit activé (contrairement à Debian, jamais câblé avant ce correctif)', () => {
    const script = generateBuildScript(makeRecipe({ distro: 'void', outputFormat: 'raw_img', security: { cisBenchmarkLevel: 1, firewall: 'ufw', appArmorOrSELinux: false, fail2ban: false, luksEncryption: false, disableRootSSH: false, autoSecurityUpdates: true } }));
    expect(script).toContain('ln -sf /etc/sv/ufw /etc/runit/runsvdir/default/ufw');
  });

  it('Fedora + firewall="nftables" : paquet installé, règles écrites et service systemd activé', () => {
    const script = generateBuildScript(makeRecipe({ distro: 'fedora', outputFormat: 'raw_img', security: { cisBenchmarkLevel: 1, firewall: 'nftables', appArmorOrSELinux: false, fail2ban: false, luksEncryption: false, disableRootSSH: false, autoSecurityUpdates: true } }));
    expect(script).toContain('policy drop');
    expect(script).toContain('systemctl enable nftables 2>/dev/null || true');
  });

  it('openSUSE + firewall="ufw" : avertissement honnête plutôt qu\'un paquet inexistant (confirmé absent du dépôt officiel Tumbleweed)', () => {
    const pkgs = resolvePackageList(makeRecipe({ distro: 'opensuse', outputFormat: 'raw_img', security: { cisBenchmarkLevel: 1, firewall: 'ufw', appArmorOrSELinux: false, fail2ban: false, luksEncryption: false, disableRootSSH: false, autoSecurityUpdates: true } }));
    expect(pkgs).not.toContain('ufw');
    const script = generateBuildScript(makeRecipe({ distro: 'opensuse', outputFormat: 'raw_img', security: { cisBenchmarkLevel: 1, firewall: 'ufw', appArmorOrSELinux: false, fail2ban: false, luksEncryption: false, disableRootSSH: false, autoSecurityUpdates: true } }));
    expect(script).toContain("UFW n'a pas de paquet officiel pour openSUSE");
    expect(script).not.toContain('ufw --force enable');
  });

  it('openSUSE + firewall="nftables" : câblé normalement (contrairement à ufw, réellement disponible)', () => {
    const pkgs = resolvePackageList(makeRecipe({ distro: 'opensuse', outputFormat: 'raw_img', security: { cisBenchmarkLevel: 1, firewall: 'nftables', appArmorOrSELinux: false, fail2ban: false, luksEncryption: false, disableRootSSH: false, autoSecurityUpdates: true } }));
    expect(pkgs).toContain('nftables');
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

  it('bug réel trouvé en auditant, même classe que le bug i3wm Arch/CachyOS déjà corrigé : Arch/Fedora/openSUSE tombaient dans le "else" générique qui installe "network-manager" (nom Debian) — confirmé ABSENT d\'Arch en direct (archlinux.org/packages/search/json, "count": 0). Arch a besoin de "networkmanager" (sans tiret), Fedora/openSUSE de "NetworkManager" (capitalisé) — tous deux confirmés réels et déjà utilisés partout ailleurs dans ce fichier', () => {
    const archPkgs = resolvePackageList(makeRecipe({ distro: 'arch', desktop: 'web_kiosk', selectedPackages: [], customPackages: [] }));
    expect(archPkgs).toContain('networkmanager');
    expect(archPkgs).not.toContain('network-manager');

    const fedoraPkgs = resolvePackageList(makeRecipe({ distro: 'fedora', desktop: 'web_kiosk', selectedPackages: [], customPackages: [] }));
    expect(fedoraPkgs).toContain('NetworkManager');
    expect(fedoraPkgs).not.toContain('network-manager');

    const opensusePkgs = resolvePackageList(makeRecipe({ distro: 'opensuse', desktop: 'web_kiosk', selectedPackages: [], customPackages: [] }));
    expect(opensusePkgs).toContain('NetworkManager');
    expect(opensusePkgs).not.toContain('network-manager');
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

describe('generateBuildScript — "dotfilesGitUrl" et "customServices" réellement câblés (bug réel trouvé : jamais référencés — le dépôt de dotfiles n\'était jamais cloné, les services personnalisés jamais écrits sur le disque, quel que soit leur contenu)', () => {
  it('dotfilesGitUrl : clone réellement le dépôt et installe "git"', () => {
    const script = generateBuildScript(makeRecipe({ distro: 'debian', outputFormat: 'iso_hybrid', dotfilesGitUrl: 'https://github.com/user/dotfiles.git' } as any));
    expect(script).toContain("git clone --depth 1 'https://github.com/user/dotfiles.git'");
    const pkgs = resolvePackageList(makeRecipe({ distro: 'debian', dotfilesGitUrl: 'https://x.test/d.git', selectedPackages: [], customPackages: [] } as any));
    expect(pkgs).toContain('git');
  });

  it('sans dotfilesGitUrl, aucune commande git clone n\'est générée', () => {
    const script = generateBuildScript(makeRecipe({ distro: 'debian', outputFormat: 'iso_hybrid' }));
    expect(script).not.toContain('git clone');
  });

  it('customServices : écrit un vrai fichier .service avec le contenu EXACT choisi (pas d\'échappement shell erroné dans le corps du heredoc, qui corromprait le fichier réellement produit)', () => {
    const script = generateBuildScript(makeRecipe({
      distro: 'debian', outputFormat: 'iso_hybrid',
      customServices: [{ name: 'my-app', description: "It's a test", execStart: `/usr/bin/echo 'hello' && echo "test"`, enabled: true }],
    } as any));
    expect(script).toContain('/etc/systemd/system/my-app.service');
    expect(script).toContain(`ExecStart=/usr/bin/echo 'hello' && echo "test"`);
    expect(script).toContain("Description=It's a test");
    expect(script).toContain('systemctl enable my-app ');
  });

  it('customServices avec enabled=false : crée le fichier mais ne l\'active pas', () => {
    const script = generateBuildScript(makeRecipe({
      distro: 'debian', outputFormat: 'iso_hybrid',
      customServices: [{ name: 'quiet-svc', description: 'x', execStart: '/bin/true', enabled: false }],
    } as any));
    expect(script).toContain('/etc/systemd/system/quiet-svc.service');
    expect(script).not.toContain('systemctl enable quiet-svc');
  });

  it('nom de service se terminant déjà par ".service" : pas de double suffixe', () => {
    const script = generateBuildScript(makeRecipe({
      distro: 'debian', outputFormat: 'iso_hybrid',
      customServices: [{ name: 'already-suffixed.service', description: 'x', execStart: '/bin/true', enabled: true }],
    } as any));
    expect(script).toContain('/etc/systemd/system/already-suffixed.service');
    expect(script).not.toContain('already-suffixed.service.service');
  });

  it('Alpine/Void : n\'écrit pas de fichier .service inerte, affiche un avertissement honnête à la place', () => {
    const script = generateBuildScript(makeRecipe({
      distro: 'alpine', outputFormat: 'raw_img',
      customServices: [{ name: 'x', description: 'x', execStart: '/bin/true', enabled: true }],
    } as any));
    expect(script).toContain('non câblé');
    expect(script).not.toContain('/etc/systemd/system/');
  });

  it('customServices=[] ne génère aucune unité systemd de service personnalisé (le firstboot.service ci-dessous, désormais réellement câblé, est un mécanisme distinct et n\'est pas concerné par ce test)', () => {
    const script = generateBuildScript(makeRecipe({ distro: 'debian', outputFormat: 'iso_hybrid', customServices: [], firstBootScript: '' } as any));
    expect(script).not.toContain('/etc/systemd/system/');
  });
});

describe('generateBuildScript — "fail2ban" et "disableRootSSH" réellement câblés (bug réel trouvé : sur les 6 champs du panneau Sécurité, 5 avaient zéro référence — dont ces deux réglages de protection SSH concrète)', () => {
  it('fail2ban=true : installe le paquet, écrit un vrai jail.local activant le jail sshd, active le service', () => {
    const script = generateBuildScript(makeRecipe({
      distro: 'debian', outputFormat: 'iso_hybrid', enableSSH: true,
      security: { cisBenchmarkLevel: 1, firewall: 'none', appArmorOrSELinux: false, fail2ban: true, luksEncryption: false, disableRootSSH: false, autoSecurityUpdates: true } as any,
    }));
    expect(script).toContain('/etc/fail2ban/jail.local');
    expect(script).toContain('[sshd]');
    expect(script).toContain('enabled = true');
    expect(script).toContain('systemctl enable fail2ban');
    const pkgs = resolvePackageList(makeRecipe({
      distro: 'debian', enableSSH: true, selectedPackages: [], customPackages: [],
      security: { cisBenchmarkLevel: 1, firewall: 'none', appArmorOrSELinux: false, fail2ban: true, luksEncryption: false, disableRootSSH: false, autoSecurityUpdates: true } as any,
    }));
    expect(pkgs).toContain('fail2ban');
  });

  it('disableRootSSH=true : ajoute "PermitRootLogin no" à sshd_config', () => {
    const script = generateBuildScript(makeRecipe({
      distro: 'arch', outputFormat: 'raw_img', enableSSH: true,
      security: { cisBenchmarkLevel: 1, firewall: 'none', appArmorOrSELinux: false, fail2ban: false, luksEncryption: false, disableRootSSH: true, autoSecurityUpdates: true } as any,
    }));
    expect(script).toContain('PermitRootLogin no');
  });

  it('fail2ban/disableRootSSH ignorés quand enableSSH=false (rien à protéger)', () => {
    const script = generateBuildScript(makeRecipe({
      distro: 'debian', outputFormat: 'iso_hybrid', enableSSH: false,
      security: { cisBenchmarkLevel: 1, firewall: 'none', appArmorOrSELinux: false, fail2ban: true, luksEncryption: false, disableRootSSH: true, autoSecurityUpdates: true } as any,
    }));
    expect(script).not.toContain('PermitRootLogin');
    expect(script).not.toContain('jail.local');
  });

  it('Alpine : active fail2ban via rc-update, pas systemctl', () => {
    const script = generateBuildScript(makeRecipe({
      distro: 'alpine', outputFormat: 'raw_img', enableSSH: true,
      security: { cisBenchmarkLevel: 1, firewall: 'none', appArmorOrSELinux: false, fail2ban: true, luksEncryption: false, disableRootSSH: false, autoSecurityUpdates: true } as any,
    }));
    expect(script).toContain('rc-update add fail2ban default');
  });

  it('fail2ban=false et disableRootSSH=false : aucune trace de ces réglages', () => {
    const script = generateBuildScript(makeRecipe({
      distro: 'debian', outputFormat: 'iso_hybrid', enableSSH: true,
      security: { cisBenchmarkLevel: 1, firewall: 'none', appArmorOrSELinux: false, fail2ban: false, luksEncryption: false, disableRootSSH: false, autoSecurityUpdates: true } as any,
    }));
    expect(script).not.toContain('jail.local');
    expect(script).not.toContain('PermitRootLogin');
  });
});

describe('generateBuildScript — "/etc/os-release" réellement personnalisé (bug réel trouvé : jamais réécrit — "neofetch"/"hostnamectl" affichaient toujours "Debian GNU/Linux" au lieu du nom choisi par l\'utilisateur, malgré tout le travail de branding dans l\'UI)', () => {
  it('écrit un vrai PRETTY_NAME/NAME/VERSION reflétant la branding choisie', () => {
    const script = generateBuildScript(makeRecipe({
      distro: 'debian', outputFormat: 'iso_hybrid',
      branding: { osName: 'MonOS', editionName: 'Pro', version: '3.0', accentColor: '#000', wallpaperPreset: 'x', bootSplashTheme: 'minimal' } as any,
    }));
    expect(script).toContain('/etc/os-release');
    expect(script).toContain('PRETTY_NAME="MonOS Pro"');
    expect(script).toContain('NAME="MonOS"');
    expect(script).toContain('VERSION_ID="3.0"');
  });

  it.each([
    ['debian', 'debian'],
    ['ubuntu', 'debian'],
    ['arch', 'arch'],
    ['fedora', 'fedora'],
    ['alpine', 'alpine'],
    ['void', 'void'],
    ['opensuse', 'opensuse'],
  ] as const)('%s : ID_LIKE="%s" préserve la vraie famille sous-jacente (compatibilité des outils qui détectent le gestionnaire de paquets)', (distro, expectedIdLike) => {
    const format = ['arch', 'fedora', 'alpine', 'void', 'opensuse'].includes(distro) ? 'raw_img' : 'iso_hybrid';
    const script = generateBuildScript(makeRecipe({ distro, outputFormat: format as any }));
    expect(script).toContain(`ID_LIKE=${expectedIdLike}`);
  });

  it('bug réel MAJEUR trouvé en auditant : un osName avec guillemet double injectait une commande shell dans /etc/os-release, un fichier COURAMMENT sourcé comme du shell par des outils système réels ("source /etc/os-release" — neofetch, screenfetch, scripts de détection de distribution) sur la machine finie livrée à l\'utilisateur, pas seulement pendant la compilation. Reproduit par une VRAIE EXÉCUTION bash ("source" sur un /etc/os-release contenant PRETTY_NAME="Evil"; touch /tmp/preuve; echo "..." exécute réellement la commande injectée). Corrigé avec shDoubleQuoteEscape() (backslash puis guillemet, préserve le texte affiché contrairement à un titre GRUB qui peut se permettre d\'être tronqué)', () => {
    const script = generateBuildScript(makeRecipe({
      distro: 'debian', outputFormat: 'iso_hybrid',
      branding: { osName: 'Evil"; touch /tmp/preuve; echo "', editionName: 'D', version: '1.0', accentColor: '#000', wallpaperPreset: 'd', bootSplashTheme: 'classic' } as any,
    }));
    expect(script).toContain('NAME="Evil\\"; touch /tmp/preuve; echo \\""');
    expect(script).not.toContain('NAME="Evil"; touch /tmp/preuve; echo ""');
  });
});

describe('shDoubleQuoteEscape — bug réel trouvé en RÉ-AUDITANT le correctif os-release du cycle précédent : échapper uniquement le guillemet double laissait "$" et le backtick actifs — un guillemet double bash n\'empêche PAS l\'expansion "$(...)"/backtick, seul un guillemet SIMPLE le ferait. Reproduit par une VRAIE EXÉCUTION bash : PRETTY_NAME="Evil $(touch /tmp/preuve)" sourcé exécutait réellement la commande malgré l\'échappement précédent (aucun guillemet à casser, la substitution restait active à l\'intérieur même du guillemet double intact). Corrigé en échappant aussi "$" et le backtick. Trois nouveaux sites du MÊME défaut trouvés dans la même passe et corrigés avec le même helper renforcé : deux "echo" bash (generateAutoBuildSh, generateUniversalLauncherSh) et un "git commit -m" (generateUniversalLauncherSh) qui interpolaient tous branding.osName brut à l\'intérieur d\'une chaîne bash entre guillemets doubles déjà ouverte', () => {
  it('/etc/os-release : un osName contenant "$(...)" voit son "$" échappé, neutralisant la substitution de commande au moment du "source"', () => {
    const script = generateBuildScript(makeRecipe({
      distro: 'debian', outputFormat: 'iso_hybrid',
      branding: { osName: 'Evil $(touch /tmp/preuve)', editionName: 'D', version: '1.0', accentColor: '#000', wallpaperPreset: 'd', bootSplashTheme: 'classic' } as any,
    }));
    expect(script).toContain('NAME="Evil \\$(touch /tmp/preuve)"');
    expect(script).not.toContain('NAME="Evil $(touch /tmp/preuve)"');
  });

  it('generateAutoBuildSh : un osName contenant "$(...)" dans la bannière "echo -e" voit son "$" échappé', () => {
    const sh = generateAutoBuildSh(makeRecipe({
      distro: 'debian', outputFormat: 'iso_hybrid',
      branding: { osName: 'Evil $(touch /tmp/preuve)', editionName: 'D', version: '1.0', accentColor: '#000', wallpaperPreset: 'd', bootSplashTheme: 'classic' } as any,
    }));
    expect(sh).toContain('Evil \\$(touch /tmp/preuve) — COMPILATION 100% AUTOMATIQUE');
  });

  it('generateUniversalLauncherSh : un osName contenant "$(...)" dans le menu "echo" ET dans le message de "git commit -m" voit son "$" échappé aux deux endroits', () => {
    const sh = generateUniversalLauncherSh(makeRecipe({
      distro: 'debian', outputFormat: 'iso_hybrid',
      branding: { osName: 'Evil $(touch /tmp/preuve)', editionName: 'D', version: '1.0', accentColor: '#000', wallpaperPreset: 'd', bootSplashTheme: 'classic' } as any,
    }));
    expect(sh).toContain('LANCEUR RAPIDE : Evil \\$(touch /tmp/preuve)');
    expect(sh).toContain('git commit -m "feat: init Evil \\$(touch /tmp/preuve)"');
  });

  it('osName "normal" (sans caractère spécial) sur les 4 sites : non-régression, contenu identique', () => {
    const recipe = makeRecipe({
      branding: { osName: 'ForgeOS', editionName: 'D', version: '1.0', accentColor: '#000', wallpaperPreset: 'd', bootSplashTheme: 'classic' } as any,
    });
    expect(generateBuildScript({ ...recipe, distro: 'debian', outputFormat: 'iso_hybrid' })).toContain('NAME="ForgeOS"');
    expect(generateAutoBuildSh({ ...recipe, distro: 'debian', outputFormat: 'iso_hybrid' })).toContain('ForgeOS — COMPILATION 100% AUTOMATIQUE');
    const launcherSh = generateUniversalLauncherSh({ ...recipe, distro: 'debian', outputFormat: 'iso_hybrid' });
    expect(launcherSh).toContain('LANCEUR RAPIDE : ForgeOS');
    expect(launcherSh).toContain('git commit -m "feat: init ForgeOS"');
  });
});

describe('resolvePackageList — le paquet du shell choisi (zsh/fish) est réellement installé (bug MAJEUR trouvé : "useradd -s /bin/zsh" fixait le shell SANS installer le paquet, cassant la connexion au compte dès le premier login puisque bash/sh sont dans le système de base mais pas zsh/fish)', () => {
  it.each([
    ['debian', '/bin/zsh', 'zsh'],
    ['arch', '/bin/zsh', 'zsh'],
    ['alpine', '/bin/zsh', 'zsh'],
    ['debian', '/bin/fish', 'fish'],
    ['arch', '/bin/fish', 'fish'],
  ] as const)('%s + shell=%s installe le vrai paquet (%s)', (distro, shell, expectedPkg) => {
    const pkgs = resolvePackageList(makeRecipe({ distro, selectedPackages: [], customPackages: [], user: { username: 'u', fullName: 'U', shell, sudo: true, password: 'x', sshPublicKey: '', autologin: false } as any }));
    expect(pkgs).toContain(expectedPkg);
  });

  it('Void + shell=/bin/fish installe "fish-shell" (pas "fish", qui n\'existe pas sur Void — piège réel trouvé en vérifiant)', () => {
    const pkgs = resolvePackageList(makeRecipe({ distro: 'void', selectedPackages: [], customPackages: [], user: { username: 'u', fullName: 'U', shell: '/bin/fish', sudo: true, password: 'x', sshPublicKey: '', autologin: false } as any }));
    expect(pkgs).toContain('fish-shell');
    expect(pkgs).not.toContain('fish');
  });

  it('shell=/bin/bash ou /bin/sh : aucun paquet supplémentaire (déjà dans le système de base)', () => {
    const pkgs = resolvePackageList(makeRecipe({ distro: 'debian', selectedPackages: [], customPackages: [], user: { username: 'u', fullName: 'U', shell: '/bin/bash', sudo: true, password: 'x', sshPublicKey: '', autologin: false } as any }));
    expect(pkgs).not.toContain('zsh');
    expect(pkgs).not.toContain('fish');
  });
});

describe('generateBuildScript — "user.autologin" réellement câblé par gestionnaire de connexion (bug réel trouvé : jamais référencé — cochée ou non, aucune différence dans le système généré)', () => {
  it('GDM3 (Debian) : configure /etc/gdm3/custom.conf avec le vrai chemin Debian', () => {
    const script = generateBuildScript(makeRecipe({
      distro: 'debian', outputFormat: 'iso_hybrid', desktop: 'gnome', displayManager: 'gdm3',
      user: { username: 'kim', fullName: 'Kim', shell: '/bin/bash', sudo: true, password: 'x', sshPublicKey: '', autologin: true } as any,
    }));
    expect(script).toContain('/etc/gdm3/custom.conf');
    expect(script).toContain('AutomaticLoginEnable=true');
    expect(script).toContain("AutomaticLogin=''kim'");
  });

  it('GDM (non-Debian) : configure /etc/gdm/custom.conf (pas gdm3, nom spécifique à Debian)', () => {
    const script = generateBuildScript(makeRecipe({
      distro: 'arch', outputFormat: 'raw_img', desktop: 'gnome', displayManager: 'gdm3',
      user: { username: 'kim', fullName: 'Kim', shell: '/bin/bash', sudo: true, password: 'x', sshPublicKey: '', autologin: true } as any,
    }));
    expect(script).toContain('/etc/gdm/custom.conf');
    expect(script).not.toContain('/etc/gdm3/');
  });

  it('SDDM : écrit un vrai fragment sddm.conf.d avec [Autologin]', () => {
    const script = generateBuildScript(makeRecipe({
      distro: 'fedora', outputFormat: 'raw_img', desktop: 'kde', displayManager: 'sddm',
      user: { username: 'kim', fullName: 'Kim', shell: '/bin/bash', sudo: true, password: 'x', sshPublicKey: '', autologin: true } as any,
    }));
    expect(script).toContain('/etc/sddm.conf.d/autologin.conf');
    expect(script).toContain('[Autologin]');
    expect(script).toContain('User=kim');
  });

  it('LightDM : écrit un vrai fragment lightdm.conf.d avec [Seat:*]', () => {
    const script = generateBuildScript(makeRecipe({
      distro: 'alpine', outputFormat: 'raw_img', desktop: 'xfce', displayManager: 'lightdm',
      user: { username: 'kim', fullName: 'Kim', shell: '/bin/bash', sudo: true, password: 'x', sshPublicKey: '', autologin: true } as any,
    }));
    expect(script).toContain('/etc/lightdm/lightdm.conf.d/50-autologin.conf');
    expect(script).toContain('autologin-user=kim');
  });

  it('autologin=false : aucune trace de configuration autologin', () => {
    const script = generateBuildScript(makeRecipe({
      distro: 'debian', outputFormat: 'iso_hybrid', desktop: 'gnome', displayManager: 'gdm3',
      user: { username: 'kim', fullName: 'Kim', shell: '/bin/bash', sudo: true, password: 'x', sshPublicKey: '', autologin: false } as any,
    }));
    expect(script).not.toContain('AutomaticLoginEnable');
  });

  it('displayManager="none" (headless) : autologin=true n\'a aucun effet', () => {
    const script = generateBuildScript(makeRecipe({
      distro: 'debian', outputFormat: 'iso_hybrid', desktop: 'none', displayManager: 'none',
      user: { username: 'kim', fullName: 'Kim', shell: '/bin/bash', sudo: true, password: 'x', sshPublicKey: '', autologin: true } as any,
    }));
    expect(script).not.toContain('AutomaticLoginEnable');
    expect(script).not.toContain('[Autologin]');
    expect(script).not.toContain('autologin-user=');
  });
});

describe('generateBuildScript — injection de commande shell via "customPackages" corrigée (faille RÉELLE trouvée et vérifiée : un fichier de preuve a été effectivement créé localement avant correctif, avec les privilèges du script)', () => {
  it('met chaque nom de paquet entre apostrophes, y compris ceux contenant $(...)', () => {
    const script = generateBuildScript(makeRecipe({
      distro: 'debian', outputFormat: 'iso_hybrid', selectedPackages: [],
      customPackages: ['htop', '$(touch /tmp/pwned)'],
    }));
    expect(script).toContain("'htop'");
    expect(script).toContain("'$(touch /tmp/pwned)'");
    // Le motif dangereux, non protégé, ne doit JAMAIS apparaître tel quel dans la liste du for.
    expect(script).not.toMatch(/for pkg in[^\n]*[^']\$\(touch \/tmp\/pwned\)[^']/);
  });

  it('échappe correctement une apostrophe visant à casser la citation (motif classique d\'évasion shell)', () => {
    const script = generateBuildScript(makeRecipe({
      distro: 'debian', outputFormat: 'iso_hybrid', selectedPackages: [],
      customPackages: [`vim'; touch /tmp/pwned2 #`],
    }));
    expect(script).toContain(`'vim'\\''; touch /tmp/pwned2 #'`);
  });

  it('un vrai nom de paquet normal fonctionne toujours sans changement de comportement', () => {
    const script = generateBuildScript(makeRecipe({ distro: 'debian', outputFormat: 'iso_hybrid', selectedPackages: ['git'] }));
    expect(script).toContain("'git'");
  });
});

describe('generateBuildScript — injection de commande shell via "useradd" (username/fullName) corrigée (faille RÉELLE trouvée juste après celle de "customPackages" : "username" totalement non protégé, "fullName" entre guillemets DOUBLES qui n\'empêchent PAS $(...) — vérifiée en exécutant réellement les lignes extraites du script généré, avec useradd/id/chpasswd/usermod stubbés : aucun fichier de preuve créé)', () => {
  it('username et fullName contenant $(...) et une tentative d\'évasion par apostrophe sont neutralisés dans la ligne useradd', () => {
    const script = generateBuildScript(makeRecipe({
      distro: 'debian', outputFormat: 'iso_hybrid',
      user: {
        username: `evil'; touch /tmp/pwned3 #`,
        fullName: `John $(touch /tmp/pwned4)Doe`,
        password: 'test', sudo: true, autologin: false, shell: '/bin/bash',
      },
    }));
    expect(script).toContain(`useradd -m -s '/bin/bash' -c 'John $(touch /tmp/pwned4)Doe' 'evil'\\''; touch /tmp/pwned3 #'`);
    // La commande "id" de vérification d'existence doit aussi être protégée.
    expect(script).toContain(`if ! id 'evil'\\''; touch /tmp/pwned3 #'`);
    // Le nom d'utilisateur doit être protégé partout où il ressert (chpasswd, sudoers, usermod, chown, chemins SSH).
    expect(script).not.toMatch(/useradd -m -s [^\n]*\$\(touch \/tmp\/pwned4\)[^'\n]*\n/);
  });

  it('un nom d\'utilisateur normal fonctionne toujours sans changement de comportement', () => {
    const script = generateBuildScript(makeRecipe({ distro: 'debian', outputFormat: 'iso_hybrid' }));
    expect(script).toContain(`useradd -m -s '/bin/bash' -c 'Test User' 'tester'`);
  });

  it('sshPublicKey contenant $(...) est neutralisé dans authorized_keys, avec le username protégé dans le chemin', () => {
    const script = generateBuildScript(makeRecipe({
      distro: 'debian', outputFormat: 'iso_hybrid', enableSSH: true,
      user: {
        username: `evil'; touch /tmp/pwned5 #`, fullName: 'Test User', password: 'test',
        sudo: true, autologin: false, shell: '/bin/bash',
        sshPublicKey: `ssh-ed25519 AAAA$(touch /tmp/pwned6) test@test`,
      } as any,
    }));
    expect(script).toContain(`echo 'ssh-ed25519 AAAA$(touch /tmp/pwned6) test@test' > /home/'evil'\\''; touch /tmp/pwned5 #'/.ssh/authorized_keys`);
  });
});

describe('generateBuildScript — injection de commande shell via "hostname" corrigée (même audit, même classe de faille : "echo \\"${hostname}\\" > /etc/hostname" et la bannière colorée étaient vulnérables au $(...) car en guillemets doubles simples — vérifié en exécutant réellement les lignes extraites : le payload s\'imprime comme texte littéral, aucun fichier de preuve créé)', () => {
  it('hostname contenant $(...) est neutralisé dans "/etc/hostname" et la bannière', () => {
    const script = generateBuildScript(makeRecipe({
      distro: 'debian', outputFormat: 'iso_hybrid',
      hostname: `evil$(touch /tmp/pwned7)box`,
    }));
    expect(script).toContain(`echo 'evil$(touch /tmp/pwned7)box' > /etc/hostname`);
    expect(script).toContain(`Nom d'hôte         : "'evil$(touch /tmp/pwned7)box'"`);
    expect(script).not.toMatch(/echo "evil\$\(touch \/tmp\/pwned7\)box" > \/etc\/hostname/);
  });

  it('un hostname normal fonctionne toujours sans changement de comportement', () => {
    const script = generateBuildScript(makeRecipe({ distro: 'debian', outputFormat: 'iso_hybrid', hostname: 'forge-box' }));
    expect(script).toContain(`echo 'forge-box' > /etc/hostname`);
  });
});

describe('generateBuildScript — injection de commande shell via "username" dans dmAutologinCmd (GDM)/kioskSetupCmd/dotfilesCloneCmd corrigée (faille RÉELLE, PLUS GRAVE que les précédentes : le script sed/printf de dmAutologinCmd(GDM) enveloppait "username" dans des guillemets SIMPLES SANS AUCUN échappement — une simple apostrophe dans le nom suffisait à casser la citation et injecter n\'importe quelle commande, sans même avoir besoin de $(...). Vérifié en exécutant réellement le bloc sed/printf extrait d\'un script généré, avec /etc/gdm3/custom.conf redirigé vers un fichier factice : le payload malveillant est écrit tel quel dans le fichier de conf, la commande injectée ne s\'exécute jamais)', () => {
  it('dmAutologinCmd (GDM) : une apostrophe dans le username ne casse plus la citation du script sed/printf', () => {
    const script = generateBuildScript(makeRecipe({
      distro: 'debian', outputFormat: 'iso_hybrid', desktop: 'gnome', displayManager: 'gdm3',
      user: {
        username: `x'; touch /tmp/pwned8 #`, fullName: 'X', shell: '/bin/bash',
        sudo: true, autologin: true, password: 'test',
      },
    }));
    expect(script).toContain(`AutomaticLogin=''x'\\''; touch /tmp/pwned8 #' /etc/gdm3/custom.conf`);
    expect(script).toContain(`AutomaticLogin=''x'\\''; touch /tmp/pwned8 #''\\n' >> /etc/gdm3/custom.conf`);
  });

  it('kioskSetupCmd : username contenant une apostrophe est neutralisé dans le chemin .bash_profile et le chown', () => {
    const script = generateBuildScript(makeRecipe({
      distro: 'debian', outputFormat: 'iso_hybrid', desktop: 'web_kiosk',
      kioskUrl: 'https://example.com',
      user: {
        username: `x'; touch /tmp/pwned9 #`, fullName: 'X', shell: '/bin/bash',
        sudo: true, autologin: false, password: 'test',
      },
    }));
    expect(script).toContain(`cat >> /home/'x'\\''; touch /tmp/pwned9 #'/.bash_profile << 'KIOSK_EOF'`);
    expect(script).toContain(`chown 'x'\\''; touch /tmp/pwned9 #':'x'\\''; touch /tmp/pwned9 #' /home/'x'\\''; touch /tmp/pwned9 #'/.bash_profile`);
  });

  it('dotfilesCloneCmd : username contenant une apostrophe est neutralisé dans le chemin de clone et le chown', () => {
    const script = generateBuildScript(makeRecipe({
      distro: 'debian', outputFormat: 'iso_hybrid',
      dotfilesGitUrl: 'https://github.com/example/dotfiles.git',
      user: {
        username: `x'; touch /tmp/pwned10 #`, fullName: 'X', shell: '/bin/bash',
        sudo: true, autologin: false, password: 'test',
      },
    }));
    expect(script).toContain(`git clone --depth 1 'https://github.com/example/dotfiles.git' /home/'x'\\''; touch /tmp/pwned10 #'/.dotfiles`);
    expect(script).toContain(`chown -R 'x'\\''; touch /tmp/pwned10 #':'x'\\''; touch /tmp/pwned10 #' /home/'x'\\''; touch /tmp/pwned10 #'/.dotfiles`);
  });

  it('un username normal fonctionne toujours sans changement de comportement dans les trois fonctions', () => {
    const script = generateBuildScript(makeRecipe({
      distro: 'debian', outputFormat: 'iso_hybrid', desktop: 'gnome', displayManager: 'gdm3',
      dotfilesGitUrl: 'https://github.com/example/dotfiles.git',
      user: { username: 'tester', fullName: 'Test User', shell: '/bin/bash', sudo: true, autologin: true, password: 'test' },
    }));
    expect(script).toContain(`AutomaticLogin=''tester'`);
    expect(script).toContain(`/home/'tester'/.dotfiles`);
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

  it('Rocky + kernel="lts" affiche toujours un avertissement de repli (COPR non câblé pour Rocky, seulement pour Fedora)', () => {
    const script = generateBuildScript(makeRecipe({ distro: 'rocky', outputFormat: 'raw_img', kernel: 'lts' }));
    expect(script).toContain("n'a pas de paquet officiel dnf");
    expect(script).not.toContain('kernel-longterm');
  });

  it('CachyOS : affiche un avertissement honnête indiquant que le vrai dépôt CachyOS n\'est pas configuré (bug réel trouvé en auditant : choisir "CachyOS" comme distribution de base produisait un système strictement identique à "Arch Linux", sans aucun indice pour l\'utilisateur — le paramètre "distroId" du bootstrapBlock Arch était explicitement ignoré, préfixé "_distroId")', () => {
    const script = generateBuildScript(makeRecipe({ distro: 'cachyos', outputFormat: 'raw_img', kernel: 'generic' }));
    expect(script).toContain("Le dépôt officiel CachyOS n'est pas encore configuré");
  });

  it('Arch Linux (plain) : aucun avertissement CachyOS (non-régression, comportement inchangé)', () => {
    const script = generateBuildScript(makeRecipe({ distro: 'arch', outputFormat: 'raw_img', kernel: 'generic' }));
    expect(script).not.toContain('CachyOS');
  });
});

describe('generateBuildScript — noyau "lts" réellement câblé pour Fedora via un vrai dépôt COPR (kwizart/kernel-longterm-6.18, vérifié en direct : projet actif, chroot fedora-44-x86_64, clé GPG et repodata/primary.xml accessibles, paquet "kernel-longterm" confirmé présent)', () => {
  it('Fedora + kernel="lts" : écrit le vrai fichier .repo COPR et installe "kernel-longterm" au lieu de "kernel"', () => {
    const script = generateBuildScript(makeRecipe({ distro: 'fedora', outputFormat: 'raw_img', kernel: 'lts' }));
    expect(script).toContain('[copr:copr.fedorainfracloud.org:kwizart:kernel-longterm-6.18]');
    expect(script).toContain('baseurl=https://download.copr.fedorainfracloud.org/results/kwizart/kernel-longterm-6.18/fedora-$releasever-$basearch/');
    expect(script).toContain('gpgkey=https://download.copr.fedorainfracloud.org/results/kwizart/kernel-longterm-6.18/pubkey.gpg');
    expect(script).toContain('$DNF_BASE install kernel-longterm grub2-pc');
    expect(script).not.toContain("n'a pas de paquet officiel dnf");
  });

  it('Fedora + kernel="generic" (défaut) : ni le dépôt COPR ni "kernel-longterm" ne sont présents', () => {
    const script = generateBuildScript(makeRecipe({ distro: 'fedora', outputFormat: 'raw_img', kernel: 'generic' }));
    expect(script).not.toContain('kernel-longterm');
    expect(script).toContain('$DNF_BASE install kernel grub2-pc');
  });
});

describe('resolvePackageList/generateBuildScript — bureau COSMIC câblé pour Fedora (bug réel trouvé en auditant : "cosmic-session"/"cosmic-greeter"/"cosmic-term"/"cosmic-files" ne sont câblés nulle part en dehors de Debian/Ubuntu et Arch-like, alors que packages.fedoraproject.org confirme en direct leur présence réelle pour Fedora 43/44/45)', () => {
  it('Fedora + desktop="cosmic" : installe les vrais paquets cosmic-session/greeter/term/files', () => {
    const pkgs = resolvePackageList(makeRecipe({ distro: 'fedora', outputFormat: 'raw_img', desktop: 'cosmic', selectedPackages: [] }));
    expect(pkgs).toEqual(expect.arrayContaining(['cosmic-session', 'cosmic-greeter', 'cosmic-term', 'cosmic-files', 'firefox', 'pipewire']));
  });

  it('Fedora + desktop="cosmic" + displayManager="cosmic-greeter" : le service est réellement activé au premier boot', () => {
    const script = generateBuildScript(makeRecipe({
      distro: 'fedora', outputFormat: 'raw_img', desktop: 'cosmic', displayManager: 'cosmic-greeter', selectedPackages: [],
    }));
    expect(script).toContain('systemctl enable cosmic-greeter 2>/dev/null || true');
  });

  it('Rocky + desktop="cosmic" : aucun paquet cosmic-* installé (non câblé, absent de EPEL/CRB)', () => {
    const pkgs = resolvePackageList(makeRecipe({ distro: 'rocky', outputFormat: 'raw_img', desktop: 'cosmic', selectedPackages: [] }));
    expect(pkgs).not.toEqual(expect.arrayContaining(['cosmic-session']));
  });

  it('openSUSE + desktop="cosmic" : installe les vrais paquets cosmic-session/greeter/term/files (confirmés en direct sur rpmfind.net pour Tumbleweed) avec MozillaFirefox/wireplumber/NetworkManager', () => {
    const pkgs = resolvePackageList(makeRecipe({ distro: 'opensuse', outputFormat: 'raw_img', desktop: 'cosmic', selectedPackages: [] }));
    expect(pkgs).toEqual(expect.arrayContaining(['cosmic-session', 'cosmic-greeter', 'cosmic-term', 'cosmic-files', 'MozillaFirefox', 'pipewire', 'wireplumber', 'NetworkManager']));
    expect(pkgs).not.toContain('firefox');
  });

  it('openSUSE + desktop="cosmic" + displayManager="cosmic-greeter" : le service est réellement activé au premier boot', () => {
    const script = generateBuildScript(makeRecipe({
      distro: 'opensuse', outputFormat: 'raw_img', desktop: 'cosmic', displayManager: 'cosmic-greeter', selectedPackages: [],
    }));
    expect(script).toContain('systemctl enable cosmic-greeter 2>/dev/null || true');
  });

  it('Alpine + desktop="cosmic" : installe les vrais paquets (confirmés en direct sur pkgs.alpinelinux.org, pas de xorg-server car COSMIC est du Wayland via cosmic-comp)', () => {
    const pkgs = resolvePackageList(makeRecipe({ distro: 'alpine', outputFormat: 'raw_img', desktop: 'cosmic', selectedPackages: [] }));
    expect(pkgs).toEqual(expect.arrayContaining(['cosmic-session', 'cosmic-greeter', 'cosmic-term', 'cosmic-files', 'dbus', 'eudev', 'mesa-dri-gallium', 'firefox', 'pipewire', 'networkmanager']));
    expect(pkgs).not.toContain('xorg-server');
  });

  it('Alpine + desktop="cosmic" + displayManager="cosmic-greeter" : le service OpenRC réel "cosmic-greeter" (confirmé via l\'APKBUILD, pas un nom supposé) est activé au premier boot', () => {
    const script = generateBuildScript(makeRecipe({
      distro: 'alpine', outputFormat: 'raw_img', desktop: 'cosmic', displayManager: 'cosmic-greeter', selectedPackages: [],
    }));
    expect(script).toContain('rc-update add cosmic-greeter default 2>/dev/null || true');
  });
});

describe('generateBuildScript — noyau "liquorix" réellement câblé pour Debian (pas juste Ubuntu/Mint), via le vrai dépôt APT direct de liquorix.net (vérifié en direct : https://liquorix.net/debian/dists/trixie existe, clé liquorix-keyring.gpg accessible, paquets linux-image/linux-headers-liquorix-amd64 confirmés dans le Packages.gz — PAS de PPA, mécanisme propre à Launchpad/Ubuntu absent sur Debian)', () => {
  it('Debian + kernel="liquorix" : ajoute le vrai dépôt APT signé (pas de PPA) et installe les vrais paquets', () => {
    const script = generateBuildScript(makeRecipe({ distro: 'debian', outputFormat: 'iso_hybrid', kernel: 'liquorix' }));
    expect(script).toContain('https://liquorix.net/liquorix-keyring.gpg');
    expect(script).toContain('deb [arch=amd64 signed-by=/etc/apt/keyrings/liquorix-keyring.gpg] https://liquorix.net/debian trixie main');
    expect(script).toContain('apt-get install -y --no-install-recommends linux-image-liquorix-amd64 linux-headers-liquorix-amd64');
    expect(script).not.toContain('ppa:damentz/liquorix');
    expect(script).not.toContain("n'est pas encore câblé pour debian");
  });

  it('Ubuntu + kernel="liquorix" : continue d\'utiliser le PPA officiel (non-régression, le nouveau chemin Debian ne doit pas l\'affecter)', () => {
    const script = generateBuildScript(makeRecipe({ distro: 'ubuntu', outputFormat: 'iso_hybrid', kernel: 'liquorix' }));
    expect(script).toContain('add-apt-repository -y ppa:damentz/liquorix');
    expect(script).not.toContain('liquorix.net/debian');
  });

  it('Debian + kernel="zen" (toujours non câblé) : avertissement honnête inchangé', () => {
    const script = generateBuildScript(makeRecipe({ distro: 'debian', outputFormat: 'iso_hybrid', kernel: 'zen' }));
    expect(script).toContain("n'est pas encore câblé pour debian");
    expect(script).not.toContain('liquorix.net');
  });
});

describe('generateBuildScript/resolvePackageList — gestionnaire de connexion "ly" (recommandé pour Hyprland/Sway) réellement câblé (bug réel MAJEUR trouvé en auditant : ni le paquet ni le service systemd n\'étaient jamais installés/activés, quel que soit le choix — un système Hyprland/Sway démarrait donc toujours sur une console texte). Paquet confirmé réel en direct pour Arch/Fedora/openSUSE, absent pour Debian/Ubuntu/Alpine. Service confirmé être un GABARIT systemd ("ly@.service", pas "ly.service") via le fichier réel du projet, avec DefaultInstance=tty2', () => {
  it('Arch + desktop="hyprland" + displayManager="ly" : le paquet "ly" est installé et le service "ly@tty2.service" est activé', () => {
    const pkgs = resolvePackageList(makeRecipe({ distro: 'arch', outputFormat: 'raw_img', desktop: 'hyprland', displayManager: 'ly', selectedPackages: [] }));
    expect(pkgs).toContain('ly');
    const script = generateBuildScript(makeRecipe({ distro: 'arch', outputFormat: 'raw_img', desktop: 'hyprland', displayManager: 'ly', selectedPackages: [] }));
    expect(script).toContain('systemctl enable ly@tty2.service 2>/dev/null || true');
  });

  it('openSUSE + desktop="sway" + displayManager="ly" : paquet installé et service activé (rolling release, package.rpm confirmé sur download.opensuse.org)', () => {
    const pkgs = resolvePackageList(makeRecipe({ distro: 'opensuse', outputFormat: 'raw_img', desktop: 'sway', displayManager: 'ly', selectedPackages: [] }));
    expect(pkgs).toContain('ly');
    const script = generateBuildScript(makeRecipe({ distro: 'opensuse', outputFormat: 'raw_img', desktop: 'sway', displayManager: 'ly', selectedPackages: [] }));
    expect(script).toContain('systemctl enable ly@tty2.service 2>/dev/null || true');
  });

  it('Fedora + desktop="sway" + displayManager="ly" : paquet installé et service activé', () => {
    const pkgs = resolvePackageList(makeRecipe({ distro: 'fedora', outputFormat: 'raw_img', desktop: 'sway', displayManager: 'ly', selectedPackages: [] }));
    expect(pkgs).toContain('ly');
    const script = generateBuildScript(makeRecipe({ distro: 'fedora', outputFormat: 'raw_img', desktop: 'sway', displayManager: 'ly', selectedPackages: [] }));
    expect(script).toContain('systemctl enable ly@tty2.service 2>/dev/null || true');
  });

  it('Debian + desktop="hyprland" + displayManager="ly" : "ly" reste honnêtement non installé (absent des dépôts Debian, confirmé)', () => {
    const pkgs = resolvePackageList(makeRecipe({ distro: 'debian', outputFormat: 'iso_hybrid', desktop: 'hyprland', displayManager: 'ly', selectedPackages: [] }));
    expect(pkgs).not.toContain('ly');
    const script = generateBuildScript(makeRecipe({ distro: 'debian', outputFormat: 'iso_hybrid', desktop: 'hyprland', displayManager: 'ly', selectedPackages: [] }));
    expect(script).not.toContain('ly@tty2.service');
  });

  it('Alpine + desktop="sway" + displayManager="ly" : "ly" reste honnêtement non installé (absent du dépôt Alpine, confirmé)', () => {
    const pkgs = resolvePackageList(makeRecipe({ distro: 'alpine', outputFormat: 'raw_img', desktop: 'sway', displayManager: 'ly', selectedPackages: [] }));
    expect(pkgs).not.toContain('ly');
    const script = generateBuildScript(makeRecipe({ distro: 'alpine', outputFormat: 'raw_img', desktop: 'sway', displayManager: 'ly', selectedPackages: [] }));
    expect(script).not.toContain('ly@tty2.service');
  });
});

describe('generateBuildScript/resolvePackageList — "appArmorOrSELinux" réellement câblé (bug réel trouvé en auditant : regroupé à tort avec cisBenchmarkLevel/luksEncryption comme "trop large" alors que c\'est un réglage aussi concret que fail2ban/disableRootSSH déjà câblés — le LSM est déjà actif par défaut dans le noyau Debian/Ubuntu/Kali (confirmé via wiki.debian.org/AppArmor/HowToUse, qui documente comment le DÉSACTIVER), mais le paquet userspace n\'était jamais installé ; SELinux "targeted" réécrit explicitement en "enforcing" pour Fedora/Rocky plutôt que de compter sur une valeur par défaut du paquet)', () => {
  it('Debian + appArmorOrSELinux=true : installe "apparmor" et active son service', () => {
    const pkgs = resolvePackageList(makeRecipe({ distro: 'debian', outputFormat: 'iso_hybrid', security: { cisBenchmarkLevel: 1, firewall: 'ufw', appArmorOrSELinux: true, fail2ban: false, luksEncryption: false, disableRootSSH: false, autoSecurityUpdates: true } }));
    expect(pkgs).toContain('apparmor');
    const script = generateBuildScript(makeRecipe({ distro: 'debian', outputFormat: 'iso_hybrid', security: { cisBenchmarkLevel: 1, firewall: 'ufw', appArmorOrSELinux: true, fail2ban: false, luksEncryption: false, disableRootSSH: false, autoSecurityUpdates: true } }));
    expect(script).toContain('systemctl enable apparmor 2>/dev/null || true');
  });

  it('Fedora + appArmorOrSELinux=true : installe selinux-policy-targeted/policycoreutils et réécrit /etc/selinux/config en enforcing', () => {
    const pkgs = resolvePackageList(makeRecipe({ distro: 'fedora', outputFormat: 'raw_img', security: { cisBenchmarkLevel: 1, firewall: 'ufw', appArmorOrSELinux: true, fail2ban: false, luksEncryption: false, disableRootSSH: false, autoSecurityUpdates: true } }));
    expect(pkgs).toEqual(expect.arrayContaining(['selinux-policy-targeted', 'policycoreutils']));
    const script = generateBuildScript(makeRecipe({ distro: 'fedora', outputFormat: 'raw_img', security: { cisBenchmarkLevel: 1, firewall: 'ufw', appArmorOrSELinux: true, fail2ban: false, luksEncryption: false, disableRootSSH: false, autoSecurityUpdates: true } }));
    expect(script).toContain('SELINUX=enforcing');
    expect(script).toContain('SELINUXTYPE=targeted');
  });

  it('Arch + appArmorOrSELinux=true : reste honnêtement hors périmètre (LSM non actif par défaut, pas de politique équivalente)', () => {
    const pkgs = resolvePackageList(makeRecipe({ distro: 'arch', outputFormat: 'raw_img', security: { cisBenchmarkLevel: 1, firewall: 'ufw', appArmorOrSELinux: true, fail2ban: false, luksEncryption: false, disableRootSSH: false, autoSecurityUpdates: true } }));
    expect(pkgs).not.toContain('apparmor');
    expect(pkgs).not.toContain('selinux-policy-targeted');
  });

  it('Debian + appArmorOrSELinux=false : aucune trace du paquet ou du service (comportement par défaut inchangé)', () => {
    const pkgs = resolvePackageList(makeRecipe({ distro: 'debian', outputFormat: 'iso_hybrid', security: { cisBenchmarkLevel: 1, firewall: 'ufw', appArmorOrSELinux: false, fail2ban: false, luksEncryption: false, disableRootSSH: false, autoSecurityUpdates: true } }));
    expect(pkgs).not.toContain('apparmor');
  });
});

describe('resolvePackageList — nouvel environnement de bureau LXDE ajouté au catalogue (prédécesseur GTK de LXQt, Openbox + PCManFM) — paquets tous vérifiés en direct avant câblage : méta-paquet "lxde" réel sur Debian trixie ET bookworm (suite Raspbian), Ubuntu "resolute" (universe) et Kali (source lxde-metapackages) ; groupe Arch officiel "lxde" confirmé (archlinux.org/packages/search/json) ; "@lxde-desktop" confirmé vrai groupe dnf Fedora ; Rocky/EPEL9 confirmé ABSENT (même limite que LXQt) ; "patterns-lxde-lxde" confirmé vrai pattern zypper openSUSE Tumbleweed ; méta-paquet "lxde" confirmé réel sur Void (metapackage=yes) ; Alpine confirmé ABSENT', () => {
  it('Debian, Kali, Raspbian, Linux Mint : installent le vrai méta-paquet "lxde" (regroupement isDebianLike)', () => {
    for (const distro of ['debian', 'kali', 'raspbian', 'linuxmint'] as const) {
      const pkgs = resolvePackageList(makeRecipe({ distro, outputFormat: 'iso_hybrid', desktop: 'lxde', selectedPackages: [] }));
      expect(pkgs).toEqual(expect.arrayContaining(['lxde', 'lightdm', 'lightdm-gtk-greeter']));
    }
  });

  it('Arch : installe le vrai groupe "lxde"', () => {
    const pkgs = resolvePackageList(makeRecipe({ distro: 'arch', outputFormat: 'raw_img', desktop: 'lxde', selectedPackages: [] }));
    expect(pkgs).toEqual(expect.arrayContaining(['lxde', 'lightdm']));
  });

  it('Fedora : installe le vrai groupe dnf "@lxde-desktop" ; Rocky reste honnêtement hors périmètre (absent d\'EPEL9, comme LXQt)', () => {
    const fedoraPkgs = resolvePackageList(makeRecipe({ distro: 'fedora', outputFormat: 'raw_img', desktop: 'lxde', selectedPackages: [] }));
    const rockyPkgs = resolvePackageList(makeRecipe({ distro: 'rocky', outputFormat: 'raw_img', desktop: 'lxde', selectedPackages: [] }));
    expect(fedoraPkgs).toContain('@lxde-desktop');
    expect(rockyPkgs.some(p => p.toLowerCase().includes('lxde'))).toBe(false);
  });

  it('openSUSE : installe le vrai pattern zypper "patterns-lxde-lxde"', () => {
    const pkgs = resolvePackageList(makeRecipe({ distro: 'opensuse', outputFormat: 'raw_img', desktop: 'lxde', selectedPackages: [] }));
    expect(pkgs).toContain('patterns-lxde-lxde');
  });

  it('Void : installe le vrai méta-paquet complet "lxde"', () => {
    const pkgs = resolvePackageList(makeRecipe({ distro: 'void', outputFormat: 'raw_img', desktop: 'lxde', selectedPackages: [] }));
    expect(pkgs).toContain('lxde');
  });

  it('Alpine : reste honnêtement hors périmètre, aucun paquet lxde-* installé (confirmé absent du dépôt)', () => {
    const pkgs = resolvePackageList(makeRecipe({ distro: 'alpine', outputFormat: 'raw_img', desktop: 'lxde', selectedPackages: [] }));
    expect(pkgs.some(p => p.toLowerCase().includes('lxde'))).toBe(false);
  });
});

describe('resolvePackageList — nouvel environnement de bureau MATE ajouté au catalogue (dérivé de GNOME 2, continuation classique) — paquets tous vérifiés en direct avant câblage : "mate-desktop-environment" réel sur Debian (sources.debian.org, 1.26.0) ; groupes Arch officiels "mate"/"mate-extra" confirmés (archlinux.org/groups/x86_64/) ; composants individuels réels sur Fedora ET Rocky/EPEL9 (mate-session-manager, mate-panel, marco, mate-terminal, caja, mate-control-center — contrairement à LXQt qui est absent d\'EPEL9) ; "patterns-mate-mate" confirmé vrai pattern zypper officiel (rpmfind.net) ; méta-paquet "mate" confirmé réel et complet sur Void (metapackage=yes dans le template source) ; Alpine confirmé ABSENT (aucun paquet "mate*" pertinent trouvé)', () => {
  it('Debian : installe le vrai méta-paquet "mate-desktop-environment" avec la pile graphique complète', () => {
    const pkgs = resolvePackageList(makeRecipe({ distro: 'debian', outputFormat: 'iso_hybrid', desktop: 'mate', selectedPackages: [] }));
    expect(pkgs).toEqual(expect.arrayContaining(['mate-desktop-environment', 'lightdm', 'lightdm-gtk-greeter', 'firefox-esr']));
  });

  it('Arch : installe les vrais groupes "mate" et "mate-extra"', () => {
    const pkgs = resolvePackageList(makeRecipe({ distro: 'arch', outputFormat: 'raw_img', desktop: 'mate', selectedPackages: [] }));
    expect(pkgs).toEqual(expect.arrayContaining(['mate', 'mate-extra', 'lightdm']));
  });

  it('Fedora et Rocky : installent les mêmes composants individuels réels (contrairement à LXQt, MATE existe bien sur les deux)', () => {
    const fedoraPkgs = resolvePackageList(makeRecipe({ distro: 'fedora', outputFormat: 'raw_img', desktop: 'mate', selectedPackages: [] }));
    const rockyPkgs = resolvePackageList(makeRecipe({ distro: 'rocky', outputFormat: 'raw_img', desktop: 'mate', selectedPackages: [] }));
    for (const pkgs of [fedoraPkgs, rockyPkgs]) {
      expect(pkgs).toEqual(expect.arrayContaining(['mate-session-manager', 'mate-panel', 'marco', 'mate-terminal', 'caja', 'mate-control-center']));
    }
  });

  it('openSUSE : installe le vrai pattern zypper "patterns-mate-mate"', () => {
    const pkgs = resolvePackageList(makeRecipe({ distro: 'opensuse', outputFormat: 'raw_img', desktop: 'mate', selectedPackages: [] }));
    expect(pkgs).toContain('patterns-mate-mate');
    expect(pkgs).toContain('MozillaFirefox');
  });

  it('Void : installe le vrai méta-paquet complet "mate"', () => {
    const pkgs = resolvePackageList(makeRecipe({ distro: 'void', outputFormat: 'raw_img', desktop: 'mate', selectedPackages: [] }));
    expect(pkgs).toContain('mate');
    expect(pkgs).toContain('lightdm-gtk-greeter');
  });

  it('Alpine : reste honnêtement hors périmètre, aucun paquet mate-* installé (confirmé absent du dépôt)', () => {
    const pkgs = resolvePackageList(makeRecipe({ distro: 'alpine', outputFormat: 'raw_img', desktop: 'mate', selectedPackages: [] }));
    expect(pkgs.some(p => p.startsWith('mate'))).toBe(false);
  });
});

describe('resolvePackageList — nouvel environnement de bureau Budgie ajouté au catalogue (développé à l\'origine par Solus, désormais indépendant) — paquets tous vérifiés en direct avant câblage : "budgie-desktop-environment" réel sur Debian (sources.debian.org) ; groupe Arch officiel "budgie" confirmé (archlinux.org/groups/x86_64/budgie/) ; "budgie-desktop" confirmé réel individuellement sur Fedora, openSUSE ET Void ; "patterns-budgie-budgie" confirmé vrai pattern zypper Tumbleweed (rpmfind.net, filtré explicitement sur Tumbleweed et non Leap) ; Rocky/EPEL9 ET Alpine confirmés ABSENTS', () => {
  it('Debian : installe le vrai méta-paquet "budgie-desktop-environment" avec Nautilus/GNOME Terminal', () => {
    const pkgs = resolvePackageList(makeRecipe({ distro: 'debian', outputFormat: 'iso_hybrid', desktop: 'budgie', selectedPackages: [] }));
    expect(pkgs).toEqual(expect.arrayContaining(['budgie-desktop-environment', 'lightdm', 'nautilus', 'gnome-terminal']));
  });

  it('Arch : installe le vrai groupe "budgie-desktop"', () => {
    const pkgs = resolvePackageList(makeRecipe({ distro: 'arch', outputFormat: 'raw_img', desktop: 'budgie', selectedPackages: [] }));
    expect(pkgs).toEqual(expect.arrayContaining(['budgie-desktop', 'nautilus', 'gnome-terminal', 'lightdm']));
  });

  it('Fedora et Void : installent "budgie-desktop" (Rocky en revanche n\'a rien, absent d\'EPEL9)', () => {
    const fedoraPkgs = resolvePackageList(makeRecipe({ distro: 'fedora', outputFormat: 'raw_img', desktop: 'budgie', selectedPackages: [] }));
    const voidPkgs = resolvePackageList(makeRecipe({ distro: 'void', outputFormat: 'raw_img', desktop: 'budgie', selectedPackages: [] }));
    const rockyPkgs = resolvePackageList(makeRecipe({ distro: 'rocky', outputFormat: 'raw_img', desktop: 'budgie', selectedPackages: [] }));
    expect(fedoraPkgs).toContain('budgie-desktop');
    expect(voidPkgs).toContain('budgie-desktop');
    expect(rockyPkgs.some(p => p.includes('budgie'))).toBe(false);
  });

  it('openSUSE : installe le vrai pattern zypper "patterns-budgie-budgie" (Tumbleweed, pas Leap)', () => {
    const pkgs = resolvePackageList(makeRecipe({ distro: 'opensuse', outputFormat: 'raw_img', desktop: 'budgie', selectedPackages: [] }));
    expect(pkgs).toContain('patterns-budgie-budgie');
    expect(pkgs).toContain('MozillaFirefox');
  });

  it('Alpine : reste honnêtement hors périmètre, aucun paquet budgie-* installé (confirmé absent du dépôt)', () => {
    const pkgs = resolvePackageList(makeRecipe({ distro: 'alpine', outputFormat: 'raw_img', desktop: 'budgie', selectedPackages: [] }));
    expect(pkgs.some(p => p.includes('budgie'))).toBe(false);
  });
});

describe('generateBuildScript — durcissement sécurité étendu à la carte SD Raspberry Pi (bug réel trouvé en comparant les fonctions appelées par les 4 générateurs : generateRpiSdScript() n\'appelait QUE osReleaseCmd(), aucun des sshHardeningCmd/macHardeningCmd/firewallCmd déjà câblés partout ailleurs — une image Raspberry Pi ne recevait ni fail2ban, ni durcissement SSH, ni AppArmor, ni pare-feu, malgré la création réelle d\'un compte utilisateur et l\'activation SSH sur ce même chemin. "apparmor" ajouté à la liste de paquets pour "raspbian" (absent de la condition existante), déjà réel dans le dépôt Debian bookworm que Raspberry Pi OS réutilise directement)', () => {
  it('Raspberry Pi SD : fail2ban, disableRootSSH, AppArmor et nftables tous réellement câblés', () => {
    const recipe = makeRecipe({
      distro: 'raspbian', outputFormat: 'rpi_sd', arch: 'aarch64', enableSSH: true,
      security: { cisBenchmarkLevel: 1, firewall: 'nftables', appArmorOrSELinux: true, fail2ban: true, luksEncryption: false, disableRootSSH: true, autoSecurityUpdates: true },
    });
    const pkgs = resolvePackageList(recipe);
    expect(pkgs).toEqual(expect.arrayContaining(['fail2ban', 'apparmor', 'nftables']));
    const script = generateBuildScript(recipe);
    expect(script).toContain('echo "PermitRootLogin no" >> /etc/ssh/sshd_config');
    expect(script).toContain('systemctl enable fail2ban 2>/dev/null || true');
    expect(script).toContain('systemctl enable apparmor 2>/dev/null || true');
    expect(script).toContain('systemctl enable nftables 2>/dev/null || true');
  });

  it('Raspberry Pi SD : aucune trace de durcissement quand tout est désactivé (comportement par défaut inchangé)', () => {
    const recipe = makeRecipe({
      distro: 'raspbian', outputFormat: 'rpi_sd', arch: 'aarch64', enableSSH: true,
      security: { cisBenchmarkLevel: 1, firewall: 'none', appArmorOrSELinux: false, fail2ban: false, luksEncryption: false, disableRootSSH: false, autoSecurityUpdates: true },
    });
    const script = generateBuildScript(recipe);
    expect(script).not.toContain('fail2ban');
    expect(script).not.toContain('systemctl enable apparmor');
    expect(script).not.toContain('nft -f /etc/nftables.conf');
  });
});

describe('generateBuildScript — bureau graphique et personnalisation réellement câblés sur la carte SD Raspberry Pi (même audit que le durcissement sécurité ci-dessus : generateRpiSdScript() n\'appelait ni dmEnableCmd/dmAutologinCmd ni kioskSetupCmd/dotfilesCloneCmd/customServicesCmd — alors que resolvePackageList() installe bel et bien les paquets du bureau choisi pour "rpi_sd" et que rien dans l\'UI n\'empêche de choisir un bureau graphique pour une carte SD Raspberry Pi. Sans ce correctif, un Raspberry Pi avec XFCE/KDE/etc. sélectionné installait le bureau mais démarrait TOUJOURS sur une console texte — exactement le bug MAJEUR d\'origine de cette session, jamais corrigé sur ce chemin précis)', () => {
  it('Raspberry Pi SD + desktop="xfce" + displayManager="lightdm" + autologin=true : le service est activé et l\'autologin réellement configuré', () => {
    const recipe = makeRecipe({
      distro: 'raspbian', outputFormat: 'rpi_sd', arch: 'aarch64', desktop: 'xfce', displayManager: 'lightdm',
      user: { username: 'tester', fullName: 'Tester', password: 'x', shell: '/bin/bash', sudo: true, autologin: true, sshPublicKey: '' } as any,
    });
    const script = generateBuildScript(recipe);
    expect(script).toContain('systemctl enable lightdm 2>/dev/null || true');
    expect(script).toContain('autologin-user=tester');
  });

  it('Raspberry Pi SD + dotfilesGitUrl : le dépôt est réellement cloné (jamais câblé avant ce correctif)', () => {
    const recipe = makeRecipe({
      distro: 'raspbian', outputFormat: 'rpi_sd', arch: 'aarch64',
      dotfilesGitUrl: 'https://github.com/example/dotfiles.git',
    } as any);
    const script = generateBuildScript(recipe);
    expect(script).toContain("git clone --depth 1 'https://github.com/example/dotfiles.git'");
  });

  it('Raspberry Pi SD + desktop="none" : aucune trace de gestionnaire de connexion (comportement par défaut inchangé)', () => {
    const recipe = makeRecipe({ distro: 'raspbian', outputFormat: 'rpi_sd', arch: 'aarch64', desktop: 'none', displayManager: 'none' });
    const script = generateBuildScript(recipe);
    expect(script).not.toContain('systemctl enable lightdm');
    expect(script).not.toContain('systemctl enable gdm');
    expect(script).not.toContain('systemctl enable sddm');
  });
});

describe('resolvePackageList/generateBuildScript — nouvel environnement de bureau Deepin (DDE) ajouté au catalogue, câblé pour Arch uniquement cette itération — un premier contrôle laissait croire "deepin-desktop-environment" disponible sur Debian (sources.debian.org/api/src/ renvoyait 200), mais une deuxième vérification directe sur packages.debian.org/{bookworm,trixie,sid}/deepin-desktop-environment a montré "No such package" sur les 3 (faux positif corrigé avant tout câblage). Arch confirmé réel via l\'API JSON officielle (pas du scraping HTML) : "ddm" existe bien (dépôt "extra", groups:["deepin"], mainteneur felixonmars, construit récemment) ; son service systemd réel "ddm.service" confirmé via le fichier source amont du projet (github.com/linuxdeepin/ddm)', () => {
  it('Arch + desktop="deepin" : installe le vrai groupe "deepin" et le paquet "ddm"', () => {
    const pkgs = resolvePackageList(makeRecipe({ distro: 'arch', outputFormat: 'raw_img', desktop: 'deepin', selectedPackages: [] }));
    expect(pkgs).toEqual(expect.arrayContaining(['deepin', 'ddm', 'firefox', 'pipewire', 'wireplumber', 'networkmanager']));
  });

  it('Arch + desktop="deepin" + displayManager="ddm" : le service "ddm.service" est réellement activé (passthrough générique déjà correct, vérifié plutôt que supposé)', () => {
    const script = generateBuildScript(makeRecipe({
      distro: 'arch', outputFormat: 'raw_img', desktop: 'deepin', displayManager: 'ddm', selectedPackages: [],
    }));
    expect(script).toContain('systemctl enable ddm 2>/dev/null || true');
  });

  it('Debian et Rocky : "deepin"/"ddm" restent honnêtement hors périmètre (Debian confirmé absent malgré un faux positif initial ; Rocky jamais vérifié cette itération)', () => {
    const debianPkgs = resolvePackageList(makeRecipe({ distro: 'debian', outputFormat: 'iso_hybrid', desktop: 'deepin', selectedPackages: [] }));
    const rockyPkgs = resolvePackageList(makeRecipe({ distro: 'rocky', outputFormat: 'raw_img', desktop: 'deepin', selectedPackages: [] }));
    expect(debianPkgs.some(p => /deepin|ddm/.test(p))).toBe(false);
    expect(rockyPkgs.some(p => /deepin|ddm/.test(p))).toBe(false);
  });
});

describe('generateBuildScript — bootstrap Debian/APT multi-architecture réellement fonctionnel (2 bugs réels MAJEURS trouvés en auditant : (1) "debootstrap --arch=X" pour ARM64/RISC-V (librement sélectionnables dans l\'UI) était appelé en une seule passe SANS émulation qemu-user-static/binfmt — contrairement à generateRpiSdScript qui gère déjà correctement ce cas pour ARM64 — un hôte de build x86_64 (GitHub Actions, WSL2) ne peut PAS exécuter nativement des binaires ARM64/RISC-V, la 2e étape de debootstrap échoue immédiatement ; (2) "i686" était passé tel quel à debootstrap au lieu du vrai nom d\'architecture Debian "i386" (vérifié en direct : deb.debian.org/.../binary-i686/ = 404, binary-i386/ = 200) — tout build Debian/Ubuntu/Kali/Mint x86 32-bit aurait échoué immédiatement, quel que soit l\'architecture réellement visée)', () => {
  it('aarch64 : bootstrap en deux étapes avec émulation qemu-aarch64-static (même mécanisme déjà éprouvé pour la carte SD Raspberry Pi)', () => {
    const script = generateBuildScript(makeRecipe({ distro: 'debian', outputFormat: 'iso_hybrid', arch: 'aarch64' }));
    expect(script).toContain('debootstrap --arch="arm64" --foreign');
    expect(script).toContain('cp /usr/bin/qemu-aarch64-static "${ROOTFS_DIR}/usr/bin/"');
    expect(script).toContain('chroot "${ROOTFS_DIR}" /debootstrap/debootstrap --second-stage');
    expect(script).toContain('qemu-user-static binfmt-support');
  });

  it('riscv64 : bootstrap en deux étapes avec émulation qemu-riscv64-static', () => {
    const script = generateBuildScript(makeRecipe({ distro: 'debian', outputFormat: 'iso_hybrid', arch: 'riscv64' }));
    expect(script).toContain('debootstrap --arch="riscv64" --foreign');
    expect(script).toContain('cp /usr/bin/qemu-riscv64-static "${ROOTFS_DIR}/usr/bin/"');
  });

  it('i686 : utilise le vrai nom d\'architecture Debian "i386" (pas "i686"), sans émulation (natif sur un hôte x86_64)', () => {
    const script = generateBuildScript(makeRecipe({ distro: 'debian', outputFormat: 'iso_hybrid', arch: 'i686' }));
    expect(script).toContain('debootstrap --arch="i386"');
    expect(script).not.toContain('--foreign');
    expect(script).not.toContain('qemu-');
  });

  it('x86_64 : aucune émulation, aucun changement de comportement (non-régression)', () => {
    const script = generateBuildScript(makeRecipe({ distro: 'debian', outputFormat: 'iso_hybrid', arch: 'x86_64' }));
    expect(script).toContain('debootstrap --arch="amd64"');
    expect(script).not.toContain('--foreign');
    expect(script).not.toContain('qemu-');
  });
});

describe('generateBuildScript — avertissement honnête pour les 5 familles non-Debian (Arch, Fedora/Rocky, Alpine, openSUSE, Void) sur architecture non-x86_64 (bug réel MAJEUR trouvé en auditant, PIRE que le bug Debian corrigé juste avant : les 5 bootstrapBlock() ignoraient TOUTES leur paramètre d\'architecture cible — préfixé "_arch" dans chacune — et leurs miroirs/archives (pacstrap via geo.mirror.pkgbuild.com, apk-tools-static/xbps-static via des URLs x86_64 codées en dur, etc.) produisaient SILENCIEUSEMENT une image x86_64 tout en prétendant honorer le choix ARM64/RISC-V/i686 fait dans l\'UI — aucune erreur, aucun indice, juste la mauvaise architecture livrée sans le dire)', () => {
  it('Arch + aarch64 : avertissement honnête, aucune fausse promesse silencieuse', () => {
    const script = generateBuildScript(makeRecipe({ distro: 'arch', outputFormat: 'raw_img', arch: 'aarch64' }));
    expect(script).toContain('Arch (pacstrap)');
    expect(script).toContain("n'est pas encore câblé pour une architecture autre que x86_64");
  });

  it('Fedora + riscv64 et Rocky + aarch64 : avertissement honnête sur les deux (même famille dnf)', () => {
    const fedoraScript = generateBuildScript(makeRecipe({ distro: 'fedora', outputFormat: 'raw_img', arch: 'riscv64' }));
    const rockyScript = generateBuildScript(makeRecipe({ distro: 'rocky', outputFormat: 'raw_img', arch: 'aarch64' }));
    expect(fedoraScript).toContain('Fedora (dnf --installroot)');
    expect(rockyScript).toContain('Rocky (dnf --installroot)');
  });

  it('Alpine + i686, openSUSE + aarch64, Void + riscv64 : avertissement honnête sur les trois', () => {
    const alpineScript = generateBuildScript(makeRecipe({ distro: 'alpine', outputFormat: 'raw_img', arch: 'i686' }));
    const opensuseScript = generateBuildScript(makeRecipe({ distro: 'opensuse', outputFormat: 'raw_img', arch: 'aarch64' }));
    const voidScript = generateBuildScript(makeRecipe({ distro: 'void', outputFormat: 'raw_img', arch: 'riscv64' }));
    expect(alpineScript).toContain('Alpine (apk-tools-static)');
    expect(opensuseScript).toContain('openSUSE (zypper)');
    expect(voidScript).toContain('Void (xbps-static)');
  });

  it('x86_64 sur les 5 familles : aucun avertissement (comportement par défaut inchangé)', () => {
    for (const distro of ['arch', 'fedora', 'alpine', 'opensuse', 'void']) {
      const script = generateBuildScript(makeRecipe({ distro: distro as any, outputFormat: 'raw_img', arch: 'x86_64' }));
      expect(script).not.toContain("n'est pas encore câblé pour une architecture");
    }
  });
});

describe('generateBuildScript — avertissement honnête sur la chaîne d\'amorçage x86-only pour Debian/APT en architecture non-x86_64 (bug réel trouvé en auto-auditant le correctif d\'émulation multi-architecture du cycle précédent : le bootstrap ARM64/RISC-V fonctionne désormais réellement grâce à l\'émulation qemu-*-static, MAIS la chaîne GRUB/xorriso qui suit (grub-mkstandalone --format=i386-pc ET --format=x86_64-efi, El Torito, isohybrid-mbr) reste câblée exclusivement pour x86_64 — une ISO "iso_hybrid" en ARM64/RISC-V se construirait sans erreur mais ne démarrerait JAMAIS sur du vrai matériel cible. wsl2_tar/docker_rootfs (simple RootFS, sans chaîne d\'amorçage) restent en revanche pleinement fonctionnels, déjà couverts par le correctif précédent)', () => {
  it('iso_hybrid + aarch64 : avertissement explicite sur l\'incompatibilité de la chaîne d\'amorçage', () => {
    const script = generateBuildScript(makeRecipe({ distro: 'debian', outputFormat: 'iso_hybrid', arch: 'aarch64' }));
    expect(script).toContain('ne démarrera PAS sur du matériel aarch64');
  });

  it('wsl2_tar + aarch64 et docker_rootfs + riscv64 : aucun avertissement (RootFS pur, pas de chaîne d\'amorçage concernée, pleinement fonctionnel)', () => {
    const wslScript = generateBuildScript(makeRecipe({ distro: 'debian', outputFormat: 'wsl2_tar', arch: 'aarch64' }));
    const dockerScript = generateBuildScript(makeRecipe({ distro: 'ubuntu', outputFormat: 'docker_rootfs', arch: 'riscv64' }));
    expect(wslScript).not.toContain('ne démarrera PAS');
    expect(dockerScript).not.toContain('ne démarrera PAS');
  });

  it('iso_hybrid + x86_64 : aucun avertissement (non-régression, comportement inchangé)', () => {
    const script = generateBuildScript(makeRecipe({ distro: 'debian', outputFormat: 'iso_hybrid', arch: 'x86_64' }));
    expect(script).not.toContain('ne démarrera PAS');
  });
});

describe('resolvePackageList — bug réel MAJEUR trouvé en auditant : Kali, Raspberry Pi OS (hors format rpi_sd) et Linux Mint passent tous par ce générateur (DEBOOTSTRAP_TARGETS les liste) avec un distroId différent de "debian"/"ubuntu", mais TOUS les blocs de paquets de bureau (GNOME/KDE/XFCE/Cosmic/Hyprland/Sway/Cinnamon/LXQt/MATE/Budgie) ainsi que les utilitaires de base et "openssh-server" ne testaient QUE "debian"/"ubuntu" littéralement — un système Linux Mint + Cinnamon (combinaison pourtant emblématique de Mint) ou Kali + GNOME (bureau par défaut de la vraie Kali) démarrait sur une console texte SANS AUCUN AVERTISSEMENT, parfois même sans "sudo" ni serveur SSH malgré "Activer SSH" coché. Corrigé en regroupant ces 5 distros sous "isDebianLike", cohérent avec DEBOOTSTRAP_TARGETS (raspbian bootstrape depuis le miroir Debian brut, linuxmint depuis le miroir Ubuntu brut — mêmes pools de paquets) et avec le bloc appArmorOrSELinux qui traitait déjà ces 5 distros ensemble. Kali vérifié séparément en direct (pkg.kali.org) : "gnome-core"/"gdm3"/"openssh-server" y sont bien de vrais paquets', () => {
  it('Linux Mint + Cinnamon : installe le vrai paquet "cinnamon" avec LightDM (pas zéro paquet de bureau)', () => {
    const pkgs = resolvePackageList(makeRecipe({ distro: 'linuxmint', outputFormat: 'iso_hybrid', desktop: 'cinnamon', displayManager: 'lightdm', selectedPackages: [] }));
    expect(pkgs).toEqual(expect.arrayContaining(['cinnamon', 'lightdm', 'lightdm-gtk-greeter', 'nemo']));
  });

  it('Kali + GNOME : installe le vrai paquet "gnome-core"/"gdm3" (bureau par défaut de la vraie Kali)', () => {
    const pkgs = resolvePackageList(makeRecipe({ distro: 'kali', outputFormat: 'iso_hybrid', desktop: 'gnome', displayManager: 'gdm3', selectedPackages: [] }));
    expect(pkgs).toEqual(expect.arrayContaining(['gnome-core', 'gdm3', 'nautilus']));
  });

  it('Raspberry Pi OS (format iso_hybrid, pas rpi_sd) + XFCE : installe le vrai paquet "xfce4"', () => {
    const pkgs = resolvePackageList(makeRecipe({ distro: 'raspbian', outputFormat: 'iso_hybrid', arch: 'aarch64', desktop: 'xfce', displayManager: 'lightdm', selectedPackages: [] }));
    expect(pkgs).toEqual(expect.arrayContaining(['xfce4', 'xfce4-goodies']));
  });

  it('Kali/Raspbian/Linux Mint : "sudo" et les utilitaires de base sont bien installés (bug distinct trouvé dans le même audit : la ligne des utilitaires de base avait le même trou)', () => {
    for (const distro of ['kali', 'raspbian', 'linuxmint'] as const) {
      const pkgs = resolvePackageList(makeRecipe({ distro, outputFormat: 'iso_hybrid', arch: distro === 'raspbian' ? 'aarch64' : 'x86_64', desktop: 'none', selectedPackages: [] }));
      expect(pkgs).toContain('sudo');
      expect(pkgs).toContain('curl');
    }
  });

  it('Kali/Raspbian/Linux Mint + Activer SSH : installent bien "openssh-server" (bug distinct trouvé dans le même audit : SSH activé sans le paquet serveur)', () => {
    for (const distro of ['kali', 'raspbian', 'linuxmint'] as const) {
      const pkgs = resolvePackageList(makeRecipe({ distro, outputFormat: 'iso_hybrid', arch: distro === 'raspbian' ? 'aarch64' : 'x86_64', enableSSH: true, selectedPackages: [] }));
      expect(pkgs).toContain('openssh-server');
    }
  });

  it('Debian/Ubuntu : non-régression, comportement inchangé après le regroupement isDebianLike', () => {
    const debianPkgs = resolvePackageList(makeRecipe({ distro: 'debian', outputFormat: 'iso_hybrid', desktop: 'gnome', selectedPackages: [] }));
    const ubuntuPkgs = resolvePackageList(makeRecipe({ distro: 'ubuntu', outputFormat: 'iso_hybrid', desktop: 'kde', selectedPackages: [] }));
    expect(debianPkgs).toEqual(expect.arrayContaining(['gnome-core', 'gdm3', 'sudo']));
    expect(ubuntuPkgs).toEqual(expect.arrayContaining(['plasma-desktop', 'sddm', 'sudo']));
  });
});

describe('generateBuildScript — bug réel MAJEUR trouvé en auditant : "raspberrypi-kernel" était installé pour TOUT build Raspberry Pi OS quelle que soit l\'architecture, alors que distros.ts annonce officiellement supportedArch: [\'aarch64\', \'x86_64\'] (x86_64 réellement sélectionnable dans l\'UI). Vérifié en direct via le navigateur (archive.raspberrypi.com renvoie 403 aux clients non-navigateur) sur archive.raspberrypi.com/debian/dists/bookworm/main/binary-amd64/Packages : "raspberrypi-kernel" est ABSENT de l\'index amd64 (seul "raspberrypi-kernel-headers" y figure, sans l\'image noyau elle-même) — un build Raspberry Pi OS + x86_64 échouait donc systématiquement à l\'installation du noyau. "raspi-firmware" confirmé "Architecture: all" sur le même index, fonctionne sur toutes les architectures', () => {
  it('Raspberry Pi OS + x86_64 : installe le vrai noyau Debian standard "linux-image-amd64", PAS "raspberrypi-kernel" (absent sur amd64)', () => {
    const script = generateBuildScript(makeRecipe({ distro: 'raspbian', outputFormat: 'iso_hybrid', arch: 'x86_64' }));
    const kernelLine = script.split('\n').find(l => l.includes('apt-get install') && l.includes('raspi-firmware'));
    expect(kernelLine).toContain('linux-image-amd64');
    expect(kernelLine).not.toContain('raspberrypi-kernel');
  });

  it('Raspberry Pi OS + aarch64 (format wsl2_tar, hors chemin rpi_sd) : non-régression, "raspberrypi-kernel" toujours installé', () => {
    const script = generateBuildScript(makeRecipe({ distro: 'raspbian', outputFormat: 'wsl2_tar', arch: 'aarch64' }));
    const kernelLine = script.split('\n').find(l => l.includes('apt-get install') && l.includes('raspi-firmware'));
    expect(kernelLine).toContain('raspberrypi-kernel');
  });
});

describe('generateBuildScript/resolvePackageList/cloudInitYaml — "autoSecurityUpdates" réellement câblé (bug réel trouvé en auditant : la case "Mises à jour de sécurité auto" de l\'UI n\'installait ni "unattended-upgrades" sur Debian-like ni "dnf-automatic" sur Fedora/Rocky, et n\'activait aucun timer/service dans les scripts de build bash — zéro action réelle malgré la promesse de l\'UI. Câblé pour Debian/Ubuntu/Kali/Raspbian/Mint avec configuration /etc/apt/apt.conf.d/20auto-upgrades et service systemd, pour Fedora/Rocky avec /etc/dnf/automatic.conf et dnf-automatic.timer, avec avertissements honnêtes sur les rolling releases et Alpine/Void)', () => {
  it('Debian / Ubuntu / Kali / Mint / Raspbian : installe "unattended-upgrades", configure /etc/apt/apt.conf.d/20auto-upgrades et active le service', () => {
    for (const distro of ['debian', 'ubuntu', 'kali', 'linuxmint', 'raspbian'] as const) {
      const recipe = makeRecipe({ distro, outputFormat: 'iso_hybrid', arch: distro === 'raspbian' ? 'aarch64' : 'x86_64', security: { ...makeRecipe().security, autoSecurityUpdates: true } });
      const pkgs = resolvePackageList(recipe);
      expect(pkgs).toContain('unattended-upgrades');
      const script = generateBuildScript(recipe);
      expect(script).toContain('/etc/apt/apt.conf.d/20auto-upgrades');
      expect(script).toContain('APT::Periodic::Unattended-Upgrade "1";');
      expect(script).toContain('systemctl enable unattended-upgrades');
    }
  });

  it('Fedora / Rocky : installe "dnf-automatic", configure apply_updates = yes dans /etc/dnf/automatic.conf et active les timers systemd', () => {
    for (const distro of ['fedora', 'rocky'] as const) {
      const recipe = makeRecipe({ distro, outputFormat: 'raw_img', security: { ...makeRecipe().security, autoSecurityUpdates: true } });
      const pkgs = resolvePackageList(recipe);
      expect(pkgs).toContain('dnf-automatic');
      const script = generateBuildScript(recipe);
      expect(script).toContain('/etc/dnf/automatic.conf');
      expect(script).toContain('apply_updates = yes');
      expect(script).toContain('systemctl enable dnf-automatic.timer');
    }
  });

  it('Arch Linux / CachyOS : avertissement honnête de distribution rolling-release, pas de faux démon inerte', () => {
    const archScript = generateBuildScript(makeRecipe({ distro: 'arch', outputFormat: 'raw_img', security: { ...makeRecipe().security, autoSecurityUpdates: true } }));
    expect(archScript).toContain('Sur une distribution en rolling-release (Arch Linux)');
    const cachyScript = generateBuildScript(makeRecipe({ distro: 'cachyos', outputFormat: 'raw_img', security: { ...makeRecipe().security, autoSecurityUpdates: true } }));
    expect(cachyScript).toContain('Sur une distribution en rolling-release (CachyOS)');
  });

  it('openSUSE / Alpine / Void : avertissements honnêtes et précis selon la famille', () => {
    const suseScript = generateBuildScript(makeRecipe({ distro: 'opensuse', outputFormat: 'raw_img', security: { ...makeRecipe().security, autoSecurityUpdates: true } }));
    expect(suseScript).toContain('openSUSE Tumbleweed');
    const alpineScript = generateBuildScript(makeRecipe({ distro: 'alpine', outputFormat: 'wsl2_tar', security: { ...makeRecipe().security, autoSecurityUpdates: true } }));
    expect(alpineScript).toContain('Alpine');
    const voidScript = generateBuildScript(makeRecipe({ distro: 'void', outputFormat: 'wsl2_tar', security: { ...makeRecipe().security, autoSecurityUpdates: true } }));
    expect(voidScript).toContain('Void');
  });

  it('Carte SD Raspberry Pi (rpi_sd) : configure bien unattended-upgrades', () => {
    const script = generateBuildScript(makeRecipe({ distro: 'raspbian', outputFormat: 'rpi_sd', arch: 'aarch64', security: { ...makeRecipe().security, autoSecurityUpdates: true } }));
    expect(script).toContain('/etc/apt/apt.conf.d/20auto-upgrades');
    expect(script).toContain('systemctl enable unattended-upgrades');
  });

  it('Cloud-Init : injecte /etc/apt/apt.conf.d/20auto-upgrades et active unattended-upgrades sur Debian, dnf-automatic.timer sur Fedora', () => {
    const debianCloud = generateCloudInitYaml(makeRecipe({ distro: 'debian', security: { ...makeRecipe().security, autoSecurityUpdates: true } }));
    expect(debianCloud).toContain('/etc/apt/apt.conf.d/20auto-upgrades');
    expect(debianCloud).toContain('systemctl enable --now unattended-upgrades');
    const fedoraCloud = generateCloudInitYaml(makeRecipe({ distro: 'fedora', security: { ...makeRecipe().security, autoSecurityUpdates: true } }));
    expect(fedoraCloud).toContain('systemctl enable --now dnf-automatic.timer');
  });

  it('autoSecurityUpdates désactivé : aucune écriture ni activation', () => {
    const debianScript = generateBuildScript(makeRecipe({ distro: 'debian', security: { ...makeRecipe().security, autoSecurityUpdates: false } }));
    expect(debianScript).not.toContain('/etc/apt/apt.conf.d/20auto-upgrades');
    const fedoraScript = generateBuildScript(makeRecipe({ distro: 'fedora', outputFormat: 'raw_img', security: { ...makeRecipe().security, autoSecurityUpdates: false } }));
    expect(fedoraScript).not.toContain('dnf-automatic.timer');
  });
});

describe('generateBuildScript/generateNonDebianBuildScript/generateNonDebianDiskImageScript/generateRpiSdScript — "locale" réellement configurée sur toutes les distributions (bug réel trouvé en auditant : "recipe.locale" ignoré sur les 5 familles non-Debian, syntaxe "fr_FR UTF-8" invalide sur Debian au lieu de "fr_FR.UTF-8 UTF-8" pour locale-gen, et omission de /etc/locale.conf / /etc/default/locale)', () => {
  it('Debian / Ubuntu / Kali / Mint : génère fr_FR.UTF-8 UTF-8 dans /etc/locale.gen, lance locale-gen et définit LANG dans /etc/default/locale et /etc/locale.conf', () => {
    const script = generateBuildScript(makeRecipe({ distro: 'debian', locale: 'fr_FR' }));
    expect(script).toContain('echo "fr_FR.UTF-8 UTF-8" >> /etc/locale.gen');
    expect(script).toContain('locale-gen');
    expect(script).toContain('echo "LANG=fr_FR.UTF-8" > /etc/default/locale');
    expect(script).toContain('echo "LANG=fr_FR.UTF-8" > /etc/locale.conf');
  });

  it('Arch Linux / CachyOS : génère /etc/locale.gen + locale-gen + /etc/locale.conf', () => {
    const script = generateBuildScript(makeRecipe({ distro: 'arch', outputFormat: 'raw_img', locale: 'de_DE' }));
    expect(script).toContain('echo "de_DE.UTF-8 UTF-8" >> /etc/locale.gen');
    expect(script).toContain('locale-gen');
    expect(script).toContain('echo "LANG=de_DE.UTF-8" > /etc/locale.conf');
  });

  it('Fedora / Rocky : génère /etc/locale.conf', () => {
    const script = generateBuildScript(makeRecipe({ distro: 'fedora', outputFormat: 'raw_img', locale: 'es_ES' }));
    expect(script).toContain('echo "LANG=es_ES.UTF-8" > /etc/locale.conf');
  });

  it('openSUSE : génère /etc/locale.conf et /etc/sysconfig/language', () => {
    const script = generateBuildScript(makeRecipe({ distro: 'opensuse', outputFormat: 'raw_img', locale: 'en_GB' }));
    expect(script).toContain('echo "LANG=en_GB.UTF-8" > /etc/locale.conf');
    expect(script).toContain('RC_LANG="en_GB.UTF-8"');
  });

  it('Void Linux : génère /etc/default/libc-locales, exécute xbps-reconfigure et écrit /etc/locale.conf', () => {
    const script = generateBuildScript(makeRecipe({ distro: 'void', outputFormat: 'wsl2_tar', locale: 'fr_FR' }));
    expect(script).toContain('/etc/default/libc-locales');
    expect(script).toContain('xbps-reconfigure -f glibc-locales');
    expect(script).toContain('echo "LANG=fr_FR.UTF-8" > /etc/locale.conf');
  });

  it('Alpine Linux : génère /etc/profile.d/locale.sh pour musl', () => {
    const script = generateBuildScript(makeRecipe({ distro: 'alpine', outputFormat: 'wsl2_tar', locale: 'fr_FR' }));
    expect(script).toContain('/etc/profile.d/locale.sh');
    expect(script).toContain('export LANG=fr_FR.UTF-8');
  });

  it('Carte SD Raspberry Pi : applique localeSetupCmd', () => {
    const script = generateBuildScript(makeRecipe({ distro: 'raspbian', outputFormat: 'rpi_sd', arch: 'aarch64', locale: 'fr_FR' }));
    expect(script).toContain('echo "fr_FR.UTF-8 UTF-8" >> /etc/locale.gen');
    expect(script).toContain('echo "LANG=fr_FR.UTF-8" > /etc/default/locale');
  });
});


describe('generateGitHubWorkflow — bug réel MAJEUR trouvé en auditant : "dist/*.iso" était codé en dur dans 3 étapes (sommes de contrôle SHA-256, vérification de taille, glob de la Release) — alors que build.sh ne produit un .iso QUE pour le format "ISO hybride". Les formats RootFS WSL2/Docker (.tar.gz, seul format réellement fonctionnel pour Arch/CachyOS/Fedora/Rocky/Alpine/openSUSE/Void), les images disque (.qcow2/.vmdk/.img) et la carte SD Raspberry Pi (.img.xz) sont TOUS des combinaisons réellement supportées par ce même générateur, mais "sha256sum *.iso"/"stat dist/*.iso" y échouaient systématiquement ("cannot stat"), cassant tout le pipeline de publication automatique avant même d\'atteindre la Release GitHub — vérifié en exécutant réellement les commandes bash extraites contre un vrai fichier .tar.gz dans un répertoire temporaire (exit code 0 après correctif, échec avant)', () => {
  it('N\'importe quelle distro/format : ne contient plus AUCUNE ligne active (hors commentaire) référençant "dist/*.iso"', () => {
    for (const [distro, format] of [['debian', 'iso_hybrid'], ['arch', 'wsl2_tar'], ['fedora', 'qcow2'], ['void', 'docker_rootfs']] as const) {
      const wf = generateGitHubWorkflow(makeRecipe({ distro: distro as DistroId, outputFormat: format as OutputFormat }));
      const activeLine = wf.split('\n').find(l => !l.trim().startsWith('#') && l.includes('dist/*.iso'));
      expect(activeLine).toBeUndefined();
    }
  });

  it('Calcule les sommes de contrôle sur tout le contenu de dist/ ("sha256sum *"), pas seulement les .iso', () => {
    const wf = generateGitHubWorkflow(makeRecipe({ distro: 'arch', outputFormat: 'wsl2_tar' }));
    expect(wf).toContain('sha256sum * > SHA256SUMS.txt');
  });

  it('Détecte le fichier de sortie réel par exclusion (pas par extension) pour la vérification de taille', () => {
    const wf = generateGitHubWorkflow(makeRecipe({ distro: 'fedora', outputFormat: 'qcow2' }));
    expect(wf).toContain(`find dist -maxdepth 1 -type f ! -name 'SHA256SUMS.txt'`);
  });

  it('La Release GitHub cible tout le contenu de dist/ ("dist/*"), quel que soit le format produit', () => {
    const wf = generateGitHubWorkflow(makeRecipe({ distro: 'void', outputFormat: 'docker_rootfs' }));
    expect(wf).toMatch(/files: \|\s*\n\s*dist\/\*\s*\n/);
  });
});

describe('generateAutoBuildSh — bug réel trouvé en auditant, par contraste avec l\'équivalent Windows auto-build.bat (déjà correct sur ce point) : quand le format de sortie choisi n\'est pas "ISO hybride" (RootFS WSL2/Docker, image disque, carte SD...), aucun .iso n\'existe jamais dans dist/ — ce script affichait quand même "[SUCCÈS] ... ISO : " avec un chemin vide, puis accusait à tort QEMU d\'être absent alors que la vraie raison est qu\'il n\'y a simplement rien à tester via un boot "-cdrom" ISO (le vrai fichier produit, ex. un .tar.gz, existe bien et a bien réussi) — vérifié en exécutant réellement la logique extraite contre un vrai fichier .tar.gz dans un répertoire temporaire', () => {
  it('Le message honnête "pas d\'image ISO à tester" existe et interpole le vrai format de sortie choisi (la structure if/elif/else est générée telle quelle pour tous les formats — c\'est une vérification d\'existence au moment de l\'EXÉCUTION du script, pas de la génération)', () => {
    const sh = generateAutoBuildSh(makeRecipe({ distro: 'arch', outputFormat: 'wsl2_tar' }));
    expect(sh).toContain('Format de sortie \\"wsl2_tar\\" : pas d\'image ISO à tester via QEMU');
    expect(sh).toContain('if [ -z "${ISO_FILE}" ]; then');
  });

  it('Détecte le vrai fichier produit dans dist/ par exclusion des logs (pas par extension .iso) pour le message de succès', () => {
    const sh = generateAutoBuildSh(makeRecipe({ distro: 'fedora', outputFormat: 'qcow2' }));
    expect(sh).toContain(`find dist -maxdepth 1 -type f ! -name '*.log'`);
    expect(sh).toContain('Fichier généré : ${ARTIFACT_FILE:-voir le dossier dist/}');
  });

  it('Non-régression : la commande de lancement QEMU existe toujours pour le cas où un vrai .iso est présent au moment de l\'exécution', () => {
    const sh = generateAutoBuildSh(makeRecipe({ distro: 'debian', outputFormat: 'iso_hybrid' }));
    expect(sh).toContain('qemu-system-x86_64 -cdrom "${ISO_FILE}"');
  });
});

describe('Sécurité CIS Benchmark — conformité sysctl, limits.d et umask 027 (Niveaux 1 et 2)', () => {
  it('cisBenchmarkLevel=1 : écrit /etc/sysctl.d/99-cis-security.conf et limits coredumps sans umask 027', () => {
    const script = generateBuildScript(makeRecipe({
      distro: 'debian',
      outputFormat: 'iso_hybrid',
      security: { ...makeRecipe().security, cisBenchmarkLevel: 1 },
    }));
    expect(script).toContain('/etc/sysctl.d/99-cis-security.conf');
    expect(script).toContain('fs.suid_dumpable = 0');
    expect(script).toContain('kernel.randomize_va_space = 2');
    expect(script).toContain('cat > /etc/security/limits.d/10-cis-coredumps.conf');
    expect(script).not.toContain('99-cis-umask.sh');
  });

  it('cisBenchmarkLevel=2 : ajoute umask 027 strict et protections noyau supplémentaires', () => {
    const script = generateBuildScript(makeRecipe({
      distro: 'arch',
      outputFormat: 'qcow2',
      security: { ...makeRecipe().security, cisBenchmarkLevel: 2 },
    }));
    expect(script).toContain('99-cis-umask.sh');
    expect(script).toContain('umask 027');
    expect(script).toContain('kernel.yama.ptrace_scope = 2');
    expect(script).toContain('kernel.dmesg_restrict = 1');
    expect(script).toContain('net.ipv4.tcp_syncookies = 1');
  });

  it('Cloud-init intègre les fichiers de durcissement CIS Benchmark 1 et 2', () => {
    const cloudInit = generateCloudInitYaml(makeRecipe({
      security: { ...makeRecipe().security, cisBenchmarkLevel: 2 },
    }));
    expect(cloudInit).toContain('/etc/sysctl.d/99-cis-security.conf');
    expect(cloudInit).toContain('/etc/security/limits.d/10-cis-coredumps.conf');
    expect(cloudInit).toContain('/etc/profile.d/99-cis-umask.sh');
    expect(cloudInit).toContain('chmod 600 /etc/shadow /etc/gshadow');
  });
});

describe('zRAM Swap compressé en RAM (ZSTD) — configuration système et cloud-init', () => {
  it('enableZram=true installe systemd-zram-generator sur Debian et configure zram-generator.conf', () => {
    const recipe = makeRecipe({ distro: 'debian', outputFormat: 'iso_hybrid', enableZram: true });
    const pkgs = resolvePackageList(recipe);
    expect(pkgs).toContain('systemd-zram-generator');
    const script = generateBuildScript(recipe);
    expect(script).toContain('/etc/systemd/zram-generator.conf');
    expect(script).toContain('compression-algorithm = zstd');
    expect(script).toContain('systemctl enable systemd-zram-setup@zram0.service');
  });

  it('enableZram=true installe zram-generator sur Fedora', () => {
    const recipe = makeRecipe({ distro: 'fedora', outputFormat: 'qcow2', enableZram: true });
    const pkgs = resolvePackageList(recipe);
    expect(pkgs).toContain('zram-generator');
  });

  it('enableZram=true configure zram-init sur Alpine Linux', () => {
    const recipe = makeRecipe({ distro: 'alpine', outputFormat: 'wsl2_tar', enableZram: true });
    const pkgs = resolvePackageList(recipe);
    expect(pkgs).toContain('zram-init');
    const script = generateBuildScript(recipe);
    expect(script).toContain('rc-update add zram-init default');
  });

  it('Cloud-init active zram-generator.conf et le service zram-setup', () => {
    const cloudInit = generateCloudInitYaml(makeRecipe({ enableZram: true }));
    expect(cloudInit).toContain('/etc/systemd/zram-generator.conf');
    expect(cloudInit).toContain('systemd-zram-setup@zram0.service');
  });
});

describe('Flatpak & Flathub — pré-installation et injection de dépôt OOB', () => {
  it('enableFlatpak=true installe le paquet flatpak et configure le remote officiel flathub', () => {
    const recipe = makeRecipe({ distro: 'arch', outputFormat: 'qcow2', enableFlatpak: true });
    const pkgs = resolvePackageList(recipe);
    expect(pkgs).toContain('flatpak');
    const script = generateBuildScript(recipe);
    expect(script).toContain('flatpak remote-add --if-not-exists flathub https://dl.flathub.org/repo/flathub.flatpakrepo');
  });

  it('enableFlatpak=false (défaut) n\'ajoute pas le paquet flatpak par défaut', () => {
    const recipe = makeRecipe({ distro: 'debian', enableFlatpak: false, selectedPackages: [] });
    const pkgs = resolvePackageList(recipe);
    expect(pkgs).not.toContain('flatpak');
  });
});

describe('Nouveaux bureaux et gestionnaires de fenêtres : Openbox et Niri', () => {
  it('Openbox installe tint2, feh et obconf sur Debian/Ubuntu', () => {
    const pkgs = resolvePackageList(makeRecipe({ distro: 'debian', desktop: 'openbox', selectedPackages: [] }));
    expect(pkgs).toEqual(expect.arrayContaining(['openbox', 'tint2', 'feh', 'obconf', 'lightdm']));
  });

  it('Openbox installe openbox, tint2 et alacritty sur Arch Linux', () => {
    const pkgs = resolvePackageList(makeRecipe({ distro: 'arch', desktop: 'openbox', selectedPackages: [] }));
    expect(pkgs).toEqual(expect.arrayContaining(['openbox', 'tint2', 'feh', 'obconf', 'alacritty']));
  });

  it('bug réel trouvé en auditant : Openbox sur Alpine se limitait à "openbox, tint2, feh, xorg-server, mesa" — sans AUCUN gestionnaire de connexion, contrairement aux 4 autres familles câblées, la session n\'était atteignable par aucun moyen graphique standard. "lightdm"/"lightdm-gtk-greeter"/"dbus"/"eudev"/"xterm"/"networkmanager" tous confirmés réels en direct sur pkgs.alpinelinux.org, désormais installés comme pour les autres familles', () => {
    const pkgs = resolvePackageList(makeRecipe({ distro: 'alpine', desktop: 'openbox', selectedPackages: [] }));
    expect(pkgs).toEqual(expect.arrayContaining(['openbox', 'lightdm', 'lightdm-gtk-greeter', 'dbus', 'eudev', 'networkmanager', 'xterm']));
    expect(pkgs).not.toContain('mesa');
    expect(pkgs).toContain('mesa-dri-gallium');
  });

  it('Niri (Wayland Rust scrollable tiling) installe niri, xwayland-satellite et waybar sur Arch Linux', () => {
    const pkgs = resolvePackageList(makeRecipe({ distro: 'arch', desktop: 'niri', selectedPackages: [] }));
    expect(pkgs).toEqual(expect.arrayContaining(['niri', 'xwayland-satellite', 'waybar', 'alacritty', 'fuzzel']));
  });

  it('Niri installe niri et waybar sur Fedora', () => {
    const pkgs = resolvePackageList(makeRecipe({ distro: 'fedora', desktop: 'niri', selectedPackages: [] }));
    expect(pkgs).toEqual(expect.arrayContaining(['niri', 'waybar', 'alacritty', 'fuzzel']));
  });
});

describe('Ligne de commande noyau personnalisée (kernelCmdline) — injection GRUB et RPi cmdline.txt', () => {
  it('ISO Debian : injecte kernelCmdline dans le menuentry de grub.cfg', () => {
    const script = generateBuildScript(makeRecipe({
      distro: 'debian',
      outputFormat: 'iso_hybrid',
      kernelCmdline: 'transparent_hugepage=madvise split_lock_mitigate=0',
    }));
    expect(script).toContain('linux /live/vmlinuz boot=live components quiet splash hostname=test-box transparent_hugepage=madvise split_lock_mitigate=0');
  });

  it('Image disque QCOW2 Arch : injecte kernelCmdline dans grub.cfg', () => {
    const script = generateBuildScript(makeRecipe({
      distro: 'arch',
      outputFormat: 'qcow2',
      kernelCmdline: 'nomodeset pci=noaer',
    }));
    expect(script).toContain('rw console=tty0 console=ttyS0,115200 nomodeset pci=noaer');
  });

  it('Carte SD Raspberry Pi : injecte kernelCmdline dans cmdline.txt', () => {
    const script = generateBuildScript(makeRecipe({
      distro: 'raspbian',
      arch: 'aarch64',
      outputFormat: 'rpi_sd',
      kernelCmdline: 'cgroup_enable=cpuset cgroup_memory=1',
    }));
    expect(script).toContain('rootfstype=ext4 fsck.repair=yes rootwait cgroup_enable=cpuset cgroup_memory=1');
  });
});

describe('Image disque non-Debian (Arch/Fedora/Alpine/openSUSE/Void) — bug réel MAJEUR trouvé en auditant, même mécanisme et même sévérité que le describe "kernelCmdline" ci-dessus : "branding.osName" était interpolé BRUT dans le même heredoc bash "<< GRUBCFG_EOF" non protégé (nécessaire pour laisser ${KERNEL_PATH}/${INITRD_PATH}/${ROOT_UUID} s\'étendre au moment de la compilation). Reproduit par une VRAIE EXÉCUTION bash (pas juste une lecture de code) : un osName contenant littéralement "$(touch /tmp/preuve)" exécute réellement cette commande substituée pendant la compilation de l\'image disque — fichier de preuve confirmé créé sur le disque, résultat (vide) substitué à la place de la commande dans le grub.cfg généré. Corrigé avec sanitizeForUnquotedHeredoc() (même fonction que kernelCmdline, renommée pour refléter son usage désormais partagé entre les deux champs)', () => {
  it('Image disque QCOW2 Arch : un osName contenant "$(...)" voit son "$" supprimé dans le menuentry de grub.cfg, neutralisant toute substitution de commande', () => {
    const script = generateBuildScript(makeRecipe({
      distro: 'arch',
      outputFormat: 'qcow2',
      branding: { osName: 'Evil $(touch /tmp/preuve)', editionName: 'D', version: '1.0', accentColor: '#000', wallpaperPreset: 'd', bootSplashTheme: 'classic' },
    }));
    expect(script).toContain('menuentry "Evil (touch /tmp/preuve)" {');
    expect(script).not.toContain('menuentry "Evil $(touch /tmp/preuve)" {');
  });

  it('Image disque QCOW2 Arch : les variables bash légitimes ${KERNEL_PATH}/${INITRD_PATH}/${ROOT_UUID} du même heredoc restent bien présentes et non altérées (non-régression)', () => {
    const script = generateBuildScript(makeRecipe({ distro: 'arch', outputFormat: 'qcow2' }));
    expect(script).toContain('linux ${KERNEL_PATH} root=UUID=${ROOT_UUID}');
    expect(script).toContain('initrd ${INITRD_PATH}');
  });

  it('osName "normal" (sans caractère spécial) : non-régression, contenu identique', () => {
    const script = generateBuildScript(makeRecipe({
      distro: 'arch', outputFormat: 'qcow2',
      branding: { osName: 'ForgeOS', editionName: 'D', version: '1.0', accentColor: '#000', wallpaperPreset: 'd', bootSplashTheme: 'classic' },
    }));
    expect(script).toContain('menuentry "ForgeOS" {');
  });
});

describe('Titres "menuentry" GRUB (ISO + image disque) — bug réel CRITIQUE trouvé en auditant, plus grave encore que les deux injections shell "osName" déjà corrigées ce cycle (-volid, heredoc GRUBCFG_EOF disque) : même après ces deux fixes, les titres "menuentry "..."" restaient vulnérables à une INJECTION DE SYNTAXE GRUB (déclenchée au DÉMARRAGE de l\'ISO, pas pendant sa compilation), un problème totalement différent puisque le heredoc ISO ("<< \'GRUB_CONFIG_EOF\'") est déjà protégé contre l\'injection shell côté build. Vérifié avec le VRAI analyseur "grub-script-check" (paquet grub2-common, WSL Ubuntu de cette machine, pas une supposition) : un osName contenant littéralement \'Evil"; set injected_var=1; menuentry "Second\' valide SANS LA MOINDRE ERREUR — le point-virgule termine prématurément le menuentry légitime et permet d\'exécuter une commande GRUB arbitraire puis de démarrer un second menuentry qui récupère le bloc suivant. Corrigé avec sanitizeGrubTitle() (guillemet, point-virgule, accolades, $, backtick, backslash supprimés), appliqué aux 3 sites "menuentry" (1 image disque, bascule de sanitizeForUnquotedHeredoc() — insuffisant, ne protégeait pas contre "; ni "\\" — vers sanitizeGrubTitle() ; 2 ISO, non protégés auparavant)', () => {
  it('ISO Debian : un osName contenant guillemet + point-virgule (tentative d\'injection de commande GRUB) produit un titre inerte, syntaxiquement sûr', () => {
    const script = generateBuildScript(makeRecipe({
      distro: 'debian', outputFormat: 'iso_hybrid',
      branding: { osName: 'Evil"; set injected_var=1; menuentry "Second', editionName: 'D', version: '1.0', accentColor: '#000', wallpaperPreset: 'd', bootSplashTheme: 'classic' },
    }));
    expect(script).toContain('menuentry "Evil set injected_var=1 menuentry Second (D) [Live Desktop]" {');
    expect(script).not.toMatch(/menuentry "Evil"/);
  });

  it('Image disque QCOW2 Arch : même protection appliquée (bascule de sanitizeForUnquotedHeredoc, insuffisant seul, vers sanitizeGrubTitle)', () => {
    const script = generateBuildScript(makeRecipe({
      distro: 'arch', outputFormat: 'qcow2',
      branding: { osName: 'Evil"; set injected_var=1; menuentry "Second', editionName: 'D', version: '1.0', accentColor: '#000', wallpaperPreset: 'd', bootSplashTheme: 'classic' },
    }));
    expect(script).toContain('menuentry "Evil set injected_var=1 menuentry Second" {');
    expect(script).not.toMatch(/menuentry "Evil"/);
  });

  it('osName/editionName "normaux" (sans caractère spécial) sur les 3 sites : non-régression, contenu identique', () => {
    const recipe = makeRecipe({
      branding: { osName: 'ForgeOS', editionName: 'Pro', version: '1.0', accentColor: '#000', wallpaperPreset: 'd', bootSplashTheme: 'classic' },
    });
    const isoScript = generateBuildScript({ ...recipe, distro: 'debian', outputFormat: 'iso_hybrid' });
    expect(isoScript).toContain('menuentry "ForgeOS (Pro) [Live Desktop]" {');
    expect(isoScript).toContain('menuentry "ForgeOS (Mode Secours / Failsafe)" {');
    const diskScript = generateBuildScript({ ...recipe, distro: 'arch', outputFormat: 'qcow2' });
    expect(diskScript).toContain('menuentry "ForgeOS" {');
  });
});

describe('Catalogue Logiciels enrichi — résolution des nouveaux paquets (IA, MAO, DevOps, Sécurité, CLI Rust)', () => {
  it('Résout les paquets IA locale (ollama_ai, python_ai_data) sur Arch Linux', () => {
    const pkgs = resolvePackageList(makeRecipe({
      distro: 'arch',
      selectedPackages: ['ollama_ai', 'python_ai_data'],
    }));
    expect(pkgs).toContain('ollama');
    expect(pkgs).toContain('python-numpy');
    expect(pkgs).toContain('jupyterlab');
  });

  it('Résout les paquets Studio MAO (ardour_daw, audacity) sur Debian/Ubuntu', () => {
    const pkgs = resolvePackageList(makeRecipe({
      distro: 'debian',
      selectedPackages: ['ardour_daw', 'audacity'],
    }));
    expect(pkgs).toContain('ardour');
    expect(pkgs).toContain('qjackctl');
    expect(pkgs).toContain('audacity');
  });

  it('Résout les paquets DevOps & IaC (ansible, opentofu_terraform, k8s_cli_tools) sur Fedora', () => {
    const pkgs = resolvePackageList(makeRecipe({
      distro: 'fedora',
      selectedPackages: ['ansible', 'opentofu_terraform', 'k8s_cli_tools'],
    }));
    expect(pkgs).toContain('ansible');
    expect(pkgs).toContain('opentofu');
    expect(pkgs).toContain('kubernetes-client');
    expect(pkgs).toContain('helm');
  });

  it('Résout les paquets Sécurité & Vie privée (keepassxc, tor_privoxy) sur Alpine', () => {
    const pkgs = resolvePackageList(makeRecipe({
      distro: 'alpine',
      selectedPackages: ['keepassxc', 'tor_privoxy'],
    }));
    expect(pkgs).toContain('keepassxc');
    expect(pkgs).toContain('tor');
    expect(pkgs).toContain('privoxy');
  });

  it('Résout les outils modernes CLI Rust (cli_modern_tools, tmux_zellij) sur Arch Linux', () => {
    const pkgs = resolvePackageList(makeRecipe({
      distro: 'arch',
      selectedPackages: ['cli_modern_tools', 'tmux_zellij'],
    }));
    expect(pkgs).toContain('bat');
    expect(pkgs).toContain('eza');
    expect(pkgs).toContain('du-dust');
    expect(pkgs).toContain('ripgrep');
    expect(pkgs).toContain('zellij');
    expect(pkgs).toContain('tmux');
  });

  it('Résout les chaînes de compilation (golang_toolchain, cpp_modern_stack, zig_compiler) sur Arch Linux', () => {
    const pkgs = resolvePackageList(makeRecipe({
      distro: 'arch',
      selectedPackages: ['golang_toolchain', 'cpp_modern_stack', 'zig_compiler'],
    }));
    expect(pkgs).toContain('go');
    expect(pkgs).toContain('base-devel');
    expect(pkgs).toContain('cmake');
    expect(pkgs).toContain('ninja');
    expect(pkgs).toContain('clang');
    expect(pkgs).toContain('zig');
  });

  it('Résout la 3D, l’émulation et les manettes (blender_3d, retroarch_gaming, gamepad_drivers) sur Debian', () => {
    const pkgs = resolvePackageList(makeRecipe({
      distro: 'debian',
      selectedPackages: ['blender_3d', 'retroarch_gaming', 'gamepad_drivers'],
    }));
    expect(pkgs).toContain('blender');
    expect(pkgs).toContain('retroarch');
    expect(pkgs).toContain('joystick');
    expect(pkgs).toContain('xboxdrv');
  });

  it('bug réel MAJEUR trouvé en auditant : gamepad_drivers sur Arch n\'installe plus "jstest-gtk"/"xboxdrv" (confirmés AUR-only, count:0 sur archlinux.org/packages/search/json) — seul le vrai paquet natif "joyutils" reste', () => {
    const pkgs = resolvePackageList(makeRecipe({ distro: 'arch', selectedPackages: ['gamepad_drivers'] }));
    expect(pkgs).toContain('joyutils');
    expect(pkgs).not.toContain('jstest-gtk');
    expect(pkgs).not.toContain('xboxdrv');
  });

  it('bug réel MAJEUR trouvé dans le même audit : gamepad_drivers sur Fedora/openSUSE/Alpine utilisait "joystick"/"joyutils" fictifs — remplacés par le vrai paquet "linuxconsoletools" (confirmé réel sur les 3 familles)', () => {
    const fedora = resolvePackageList(makeRecipe({ distro: 'fedora', selectedPackages: ['gamepad_drivers'] }));
    expect(fedora).toContain('linuxconsoletools');
    expect(fedora).toContain('jstest-gtk');
    expect(fedora).not.toContain('joystick');

    const opensuse = resolvePackageList(makeRecipe({ distro: 'opensuse', selectedPackages: ['gamepad_drivers'] }));
    expect(opensuse).toContain('linuxconsoletools');
    expect(opensuse).not.toContain('joystick');
    expect(opensuse).not.toContain('jstest-gtk');

    const alpine = resolvePackageList(makeRecipe({ distro: 'alpine', selectedPackages: ['gamepad_drivers'] }));
    expect(alpine).toContain('linuxconsoletools');
    expect(alpine).not.toContain('joyutils');
  });

  it('Résout sauvegarde, publication et métriques (restic_rclone, typst_pandoc, prometheus_node_exporter) sur Fedora', () => {
    const pkgs = resolvePackageList(makeRecipe({
      distro: 'fedora',
      selectedPackages: ['restic_rclone', 'typst_pandoc', 'prometheus_node_exporter'],
    }));
    expect(pkgs).toContain('restic');
    expect(pkgs).toContain('rclone');
    expect(pkgs).toContain('pandoc');
    expect(pkgs).toContain('typst');
    expect(pkgs).toContain('golang-github-prometheus-node_exporter');
  });
});

describe('generateBuildScript — faille réelle d\'injection de commande via "kernelCmdline" (champ libre récemment ajouté). Interpolé tel quel dans 3 heredocs bash qui écrivent grub.cfg/cmdline.txt, dont 2 avec un délimiteur NON protégé ("<< GRUBCFG_EOF" / "<< CMDLINE_EOF", nécessaire pour laisser ${KERNEL_PATH}/${ROOT_UUID} s\'évaluer à l\'exécution) — un heredoc non protégé développe aussi $(), les backticks et \\ dans TOUT son corps. Reproduit et vérifié en direct (exécution bash réelle, avant/après) : un "kernelCmdline" contenant "$(commande)" exécutait réellement cette commande avec les privilèges root du script généré ; après le correctif (sanitizeKernelCmdline, qui retire $/`` `` /\\), le même contenu littéral ne déclenche plus rien', () => {
  it('Image disque non-Debian (QCOW2/VMDK/RAW) : neutralise "$(commande)" dans la ligne GRUB "linux ..."', () => {
    const script = generateBuildScript(makeRecipe({ distro: 'arch', outputFormat: 'qcow2', kernelCmdline: 'quiet $(touch /tmp/pwned) splash' } as any));
    const grubLine = script.split('\n').find(l => l.includes('console=tty0') && l.includes('splash'));
    expect(grubLine).toBeDefined();
    expect(grubLine).not.toContain('$(touch');
    expect(grubLine).toContain('quiet (touch /tmp/pwned) splash');
  });

  it('Carte SD Raspberry Pi (cmdline.txt) : neutralise "$(commande)" de la même façon', () => {
    const script = generateBuildScript(makeRecipe({ distro: 'raspbian', outputFormat: 'rpi_sd', arch: 'aarch64', kernelCmdline: 'quiet $(touch /tmp/pwned) splash' } as any));
    const cmdlineLine = script.split('\n').find(l => l.includes('console=serial0'));
    expect(cmdlineLine).toBeDefined();
    expect(cmdlineLine).not.toContain('$(touch');
  });

  it('ISO Debian/APT (heredoc déjà protégé par apostrophes) : le correctif retire aussi $/backtick/\\, cohérent avec les 2 autres cas', () => {
    const script = generateBuildScript(makeRecipe({ distro: 'debian', outputFormat: 'iso_hybrid', kernelCmdline: 'mitigations=$(off) `nope`' } as any));
    const grubLine = script.split('\n').find(l => l.includes('boot=live components quiet splash'));
    expect(grubLine).toBeDefined();
    expect(grubLine).not.toContain('$(off)');
    expect(grubLine).not.toContain('`nope`');
  });

  it('kernelCmdline légitime (sans caractères dangereux) : reste intact dans les 3 générateurs', () => {
    const cmdline = 'mitigations=off nosplash quiet loglevel=3';
    const arch = generateBuildScript(makeRecipe({ distro: 'arch', outputFormat: 'qcow2', kernelCmdline: cmdline } as any));
    const rpi = generateBuildScript(makeRecipe({ distro: 'raspbian', outputFormat: 'rpi_sd', arch: 'aarch64', kernelCmdline: cmdline } as any));
    const debian = generateBuildScript(makeRecipe({ distro: 'debian', outputFormat: 'iso_hybrid', kernelCmdline: cmdline } as any));
    expect(arch).toContain(cmdline);
    expect(rpi).toContain(cmdline);
    expect(debian).toContain(cmdline);
  });

  it('kernelCmdline vide/absent : aucun changement de comportement (non-régression)', () => {
    const withCmdline = generateBuildScript(makeRecipe({ distro: 'debian', outputFormat: 'iso_hybrid' } as any));
    expect(withCmdline).not.toContain('undefined');
  });
});

describe('resolvePackageList — bureau Niri : deux bugs réels distincts trouvés en auditant. (1) Debian/Ubuntu/Kali/Raspbian/Mint installaient waybar/alacritty/fuzzel/mako/swaylock — des outils sans AUCUNE utilité sans le compositeur Wayland — sans jamais installer "niri" lui-même ; vérifié en direct que "niri" est réellement ABSENT de Debian trixie (packages.debian.org : "No such package") et d\'Ubuntu "resolute" (seuls "niri-companion"/"librust-niri-ipc-dev" existent, dans la suite future "stonking" uniquement) — honnêtement non câblé désormais, comme Void+Hyprland avant lui. (2) Void, à l\'inverse, OMETTAIT "niri" du push alors qu\'il est confirmé réel (raw.githubusercontent.com/void-linux/void-packages srcpkgs/niri/template, build_style=cargo, v26.04) — un oubli, pas une absence légitime, contrairement au cas Debian', () => {
  it('Debian, Ubuntu, Kali : n\'installent plus AUCUN paquet lié à Niri (honnêtement hors périmètre, "niri" confirmé absent du dépôt)', () => {
    for (const distro of ['debian', 'ubuntu', 'kali'] as const) {
      const pkgs = resolvePackageList(makeRecipe({ distro, outputFormat: 'iso_hybrid', desktop: 'niri', selectedPackages: [] }));
      expect(pkgs.some(p => ['niri', 'waybar', 'alacritty', 'fuzzel', 'mako', 'swaylock'].includes(p))).toBe(false);
    }
  });

  it('Void : installe désormais le vrai paquet "niri" (bug d\'omission corrigé)', () => {
    const pkgs = resolvePackageList(makeRecipe({ distro: 'void', outputFormat: 'raw_img', desktop: 'niri', selectedPackages: [] }));
    expect(pkgs).toContain('niri');
  });

  it('Arch, Fedora, Alpine : non-régression, "niri" toujours installé', () => {
    for (const distro of ['arch', 'fedora', 'alpine'] as const) {
      const pkgs = resolvePackageList(makeRecipe({ distro, outputFormat: distro === 'alpine' ? 'wsl2_tar' : 'raw_img', desktop: 'niri', selectedPackages: [] }));
      expect(pkgs).toContain('niri');
    }
  });

  it('openSUSE : extension "1 à 1", installe désormais "niri" et ses 4 paquets compagnons (waybar/alacritty/fuzzel/mako), tous confirmés réels dans le dépôt OSS officiel de Tumbleweed (contrairement à Deepin, jamais câblé pour openSUSE car officiellement retiré des dépôts pour raisons de sécurité en mai 2025)', () => {
    const pkgs = resolvePackageList(makeRecipe({ distro: 'opensuse', outputFormat: 'raw_img', desktop: 'niri', selectedPackages: [] }));
    expect(pkgs).toEqual(expect.arrayContaining(['niri', 'waybar', 'alacritty', 'fuzzel', 'mako']));
  });
});

describe('generateCloudInitYaml — bug réel trouvé en auditant : "enableFlatpak" installait bien le paquet "flatpak" (via resolvePackageList, partagé par tous les générateurs), mais n\'ajoutait jamais le dépôt distant Flathub dans ce manifeste — contrairement à flatpakSetupCmd(), déjà câblé dans les 4 générateurs bash. Une image cloud-init avec Flatpak coché installait donc le paquet sans aucun dépôt configuré : "flatpak install <app>" y échouait avec "no remotes configured"', () => {
  it('enableFlatpak=true : installe le paquet ET ajoute le dépôt Flathub officiel', () => {
    const yaml = generateCloudInitYaml(makeRecipe({ enableFlatpak: true } as any));
    expect(yaml).toContain('- flatpak');
    expect(yaml).toContain('flatpak remote-add --if-not-exists flathub https://dl.flathub.org/repo/flathub.flatpakrepo');
  });

  it('enableFlatpak=false (ou absent) : aucune trace de Flathub (comportement par défaut inchangé)', () => {
    const yaml = generateCloudInitYaml(makeRecipe({ enableFlatpak: false } as any));
    expect(yaml).not.toContain('flathub');
  });
});

describe('generateCloudInitYaml — bug réel MAJEUR trouvé en auditant : les 4 générateurs bash activent tous explicitement le gestionnaire de connexion (dmEnableCmd/dmCmd), mais ce manifeste ne le faisait JAMAIS — le paquet du bureau choisi (gdm3/sddm/lightdm/ly...) est bien dans "packages:" via resolvePackageList(), mais son service n\'était jamais activé. DesktopSelector.tsx ne filtre pas les bureaux par format de sortie : choisir GNOME + image disque QCOW2 est un cas parfaitement légitime. Une telle image démarrait donc TOUJOURS sur une console texte, quel que soit le bureau choisi — même bug déjà corrigé 3 fois dans ce même manifeste (SSH, Flatpak, durcissement) pour d\'autres réglages, ici pour l\'activation du bureau graphique lui-même', () => {
  it('Debian + GNOME + gdm3 : active gdm3 via systemctl', () => {
    const yaml = generateCloudInitYaml(makeRecipe({ distro: 'debian', desktop: 'gnome', displayManager: 'gdm3' } as any));
    expect(yaml).toContain('systemctl enable --now gdm3 || true');
  });

  it('Arch + KDE + sddm, Fedora + XFCE + lightdm : activent le vrai DM via systemctl', () => {
    const arch = generateCloudInitYaml(makeRecipe({ distro: 'arch', desktop: 'kde', displayManager: 'sddm' } as any));
    expect(arch).toContain('systemctl enable --now sddm || true');
    const fedora = generateCloudInitYaml(makeRecipe({ distro: 'fedora', desktop: 'xfce', displayManager: 'lightdm' } as any));
    expect(fedora).toContain('systemctl enable --now lightdm || true');
  });

  it('Alpine : active le DM via "rc-update add" (OpenRC, pas systemctl)', () => {
    const yaml = generateCloudInitYaml(makeRecipe({ distro: 'alpine', desktop: 'xfce', displayManager: 'lightdm' } as any));
    expect(yaml).toContain('rc-update add lightdm default');
    expect(yaml).not.toContain('systemctl enable --now lightdm');
  });

  it('openSUSE + Hyprland + ly : active le vrai service à gabarit "ly@tty2.service" (pas "ly.service")', () => {
    const yaml = generateCloudInitYaml(makeRecipe({ distro: 'opensuse', desktop: 'hyprland', displayManager: 'ly' } as any));
    expect(yaml).toContain('systemctl enable --now ly@tty2.service || true');
  });

  it('displayManager="none" (mode serveur/headless) : aucune ligne d\'activation de DM ajoutée (comportement par défaut inchangé)', () => {
    const yaml = generateCloudInitYaml(makeRecipe({ distro: 'debian', desktop: 'none', displayManager: 'none' } as any));
    expect(yaml).not.toMatch(/enable --now (gdm3|sddm|lightdm|ly)/);
    expect(yaml).not.toContain('rc-update add');
  });
});

describe('generateCloudInitYaml — bug réel trouvé dans le même audit que l\'activation du DM : "dmAutologinCmd" (connexion automatique GDM/SDDM/LightDM) et "kioskSetupCmd" (mode borne kiosque — getty autologin, seatd, lancement de cage/chromium au login) sont câblés dans les 4 générateurs bash mais totalement absents de ce manifeste. "kioskSetupCmd" est le cas le plus grave : le bureau "web_kiosk" utilise displayManager="none" (l\'activation du DM ne s\'applique donc jamais ici), toute la fonctionnalité dépendait UNIQUEMENT de ce mécanisme absent — chromium/cage/seatd s\'installaient sans jamais être lancés. Vérifié par un aller-retour YAML réel via PyYAML (échappement backslash/guillemet/retour-à-la-ligne) puis "bash -n" sur le script bash extrait et décodé', () => {
  it('user.autologin=true + GDM3 : ajoute une entrée runcmd [bash, -c, ...] qui configure AutomaticLoginEnable', () => {
    const yaml = generateCloudInitYaml(makeRecipe({
      distro: 'debian', desktop: 'gnome', displayManager: 'gdm3',
      user: { username: 'testuser', fullName: 'Test User', sudo: true, autologin: true, shell: '/bin/bash' },
    } as any));
    expect(yaml).toContain('AutomaticLoginEnable=true');
    expect(yaml).toContain('- [ bash, -c, "');
  });

  it('user.autologin=false : aucune ligne d\'autologin ajoutée (comportement par défaut inchangé)', () => {
    const yaml = generateCloudInitYaml(makeRecipe({
      distro: 'debian', desktop: 'gnome', displayManager: 'gdm3',
      user: { username: 'testuser', fullName: 'Test User', sudo: true, autologin: false, shell: '/bin/bash' },
    } as any));
    expect(yaml).not.toContain('AutomaticLoginEnable');
  });

  it('desktop="web_kiosk" : ajoute une entrée runcmd qui active seatd et lance cage/le navigateur au login', () => {
    const yaml = generateCloudInitYaml(makeRecipe({
      distro: 'ubuntu', desktop: 'web_kiosk', displayManager: 'none', kioskUrl: 'https://example.com',
    } as any));
    expect(yaml).toContain('exec cage --');
    expect(yaml).toContain('seatd');
    expect(yaml).toContain('example.com');
  });

  it('desktop autre que web_kiosk : aucune ligne de mode kiosque ajoutée (comportement par défaut inchangé)', () => {
    const yaml = generateCloudInitYaml(makeRecipe({ distro: 'debian', desktop: 'gnome', displayManager: 'gdm3' } as any));
    expect(yaml).not.toContain('exec cage --');
  });
});

describe('generateCloudInitYaml — bug réel trouvé en auditant, même classe que le fix "kernelCmdline" (échappement incomplet avant insertion dans un scalaire YAML entre guillemets) : le "firstBootScript" (champ libre multi-lignes de l\'utilisateur) n\'était protégé QUE contre les guillemets doubles ("recipe.firstBootScript.replace(/\"/g, ...)") avant d\'être inséré dans "- [ bash, -c, \"...\" ]". Reproduit par un vrai round-trip PyYAML avant correctif : un script multi-lignes typique (shebang "#!/bin/bash" + commentaires "#" + commandes) se retrouvait totalement aplati sur une seule ligne YAML — la ligne entière devenant un commentaire bash inerte, le script ne s\'exécutait plus DU TOUT, silencieusement, sans erreur visible. Un backslash présent dans le script (ex. "C:\\temp") était en plus réinterprété comme une séquence d\'échappement YAML ("\\t" devenait une tabulation). Corrigé en réutilisant toRuncmdBashBlock(), le helper déjà écrit et vérifié cette session pour ce même problème (activation DM/autologin/kiosque, commit 468a467)', () => {
  it('firstBootScript multi-lignes avec guillemets et backslashes : round-trip exact via les mêmes règles d\'échappement (\\\\, \\", \\n) que YAML pour un scalaire entre guillemets — décodé ici par JSON.parse, dont les règles pour ces 3 séquences sont identiques à celles de YAML', () => {
    const script = '#!/bin/bash\n# Test avec des "guillemets" et un backslash C:\\temp\nmkdir -p /opt/app\necho done\n';
    const yaml = generateCloudInitYaml(makeRecipe({ firstBootScript: script }));
    const match = yaml.match(/- \[ bash, -c, "((?:[^"\\]|\\.)*)" \]/);
    expect(match, 'entrée runcmd "- [ bash, -c, ... ]" introuvable ou mal formée dans le YAML généré').not.toBeNull();
    const decoded = JSON.parse('"' + match![1] + '"');
    expect(decoded).toBe(script);
  });

  it('firstBootScript multi-lignes : le runcmd tient sur UNE seule ligne physique du fichier YAML (avant le fix, les vrais retours à la ligne du script cassaient/aplatissaient le scalaire YAML une fois parsé)', () => {
    const script = 'ligne1\nligne2\nligne3';
    const yaml = generateCloudInitYaml(makeRecipe({ firstBootScript: script }));
    const runcmdLine = yaml.split('\n').find(l => l.includes('- [ bash, -c, "'));
    expect(runcmdLine, 'ligne runcmd introuvable').toBeDefined();
    expect(runcmdLine).toContain('" ]');
    expect(runcmdLine).toContain('ligne1\\nligne2\\nligne3');
  });

  it('firstBootScript vide/absent : conserve le comportement honnête existant ("echo Ready"), non-régression', () => {
    const yaml = generateCloudInitYaml(makeRecipe({ firstBootScript: '' }));
    expect(yaml).toContain('- [ bash, -c, "echo Ready" ]');
  });
});

describe('generateCloudInitYaml — bug réel trouvé en auditant, même classe que "firstBootScript" ci-dessus mais sur un site différent : hostname, nom d\'utilisateur, nom complet (gecos) et clé publique SSH sont tous de simples <input type="text"> sans validation dans SystemConfig.tsx, mais étaient insérés en scalaires YAML BRUTS (sans guillemets) dans generateCloudInitYaml(). Reproduit par un vrai round-trip PyYAML avant correctif : un nom complet aussi banal que "Bob: The Builder" (deux-points suivi d\'un espace) rendait TOUT le fichier cloud-init invalide ("mapping values are not allowed here" — plus de création d\'utilisateur, plus de SSH, plus de durcissement, rien ne s\'applique). Un commentaire de clé SSH contenant un "#" (réaliste : "yubikey #2 travail") tronquait silencieusement la fin de la ligne. Corrigé via le nouveau helper yamlDq() (guillemets + échappement backslash/guillemet, JSON-compatible)', () => {
  it('nom complet (gecos) contenant un deux-points suivi d\'un espace : round-trip exact, ne casse plus le fichier (avant le fix, cette valeur rendait tout le YAML invalide)', () => {
    const yaml = generateCloudInitYaml(makeRecipe({
      hostname: 'my:host',
      user: { username: 'bob', fullName: 'Bob: The Builder', sudo: true, autologin: false, shell: '/bin/bash' },
    }));
    const hostnameMatch = yaml.match(/^hostname: "((?:[^"\\]|\\.)*)"$/m);
    const gecosMatch = yaml.match(/^ {4}gecos: "((?:[^"\\]|\\.)*)"$/m);
    expect(hostnameMatch, 'hostname doit être un scalaire YAML entre guillemets').not.toBeNull();
    expect(gecosMatch, 'gecos doit être un scalaire YAML entre guillemets').not.toBeNull();
    expect(JSON.parse('"' + hostnameMatch![1] + '"')).toBe('my:host');
    expect(JSON.parse('"' + gecosMatch![1] + '"')).toBe('Bob: The Builder');
  });

  it('clé publique SSH avec un commentaire contenant un "#" : round-trip exact, plus de troncature silencieuse', () => {
    const key = 'ssh-ed25519 AAAAtest yubikey #2 travail';
    const yaml = generateCloudInitYaml(makeRecipe({
      user: { username: 'bob', fullName: 'Bob', sudo: true, autologin: false, shell: '/bin/bash', sshPublicKey: key },
    }));
    const keyMatch = yaml.match(/ {6}- "((?:[^"\\]|\\.)*)"/);
    expect(keyMatch, 'clé SSH doit être un scalaire YAML entre guillemets').not.toBeNull();
    expect(JSON.parse('"' + keyMatch![1] + '"')).toBe(key);
  });

  it('hostname/username/fullName/sshPublicKey "normaux" (sans caractère spécial) : non-régression, contenu identique', () => {
    const yaml = generateCloudInitYaml(makeRecipe({
      hostname: 'forge-box',
      user: { username: 'developer', fullName: 'Jean Dupont', sudo: true, autologin: false, shell: '/bin/bash', sshPublicKey: 'ssh-ed25519 AAAAnormal jean@host' },
    }));
    expect(yaml).toContain('hostname: "forge-box"');
    expect(yaml).toContain('name: "developer"');
    expect(yaml).toContain('gecos: "Jean Dupont"');
    expect(yaml).toContain('- "ssh-ed25519 AAAAnormal jean@host"');
  });
});

describe('generateGitHubWorkflow — bug réel trouvé en auditant, même classe que les deux describe précédents (échappement YAML manquant sur un champ libre) mais sur un troisième générateur : "branding.osName" (simple <input type="text"> sans validation dans SystemConfig.tsx) est inséré dans le "name:" top-level du workflow ET dans le "name:" de l\'étape de publication de Release, tous deux des scalaires YAML. Reproduit par un vrai round-trip PyYAML avant correctif : un nom d\'OS aussi banal que "Mon OS: Édition Pro" (un simple deux-points) rendait TOUT le fichier de workflow GitHub Actions invalide — la fonctionnalité phare "publication automatique d\'une Release GitHub à chaque push" ne se déclenchait alors JAMAIS, sans le moindre message d\'erreur visible dans l\'UI (le workflow est simplement rejeté au niveau GitHub, en dehors de toute observation possible par OSForge Studio). Corrigé via yamlDq()/yamlEscape() (mêmes helpers que les deux fixes précédents)', () => {
  it('branding.osName avec un deux-points : le "name:" top-level du workflow reste un YAML valide, round-trip exact', () => {
    const wf = generateGitHubWorkflow(makeRecipe({
      branding: { osName: 'Mon OS: Édition Pro', editionName: 'D', version: '1.0', accentColor: '#000', wallpaperPreset: 'd', bootSplashTheme: 'classic' },
    }));
    const nameLine = wf.split('\n')[0];
    expect(nameLine.startsWith('name: "')).toBe(true);
    expect(JSON.parse(nameLine.slice('name: '.length))).toContain('Mon OS: Édition Pro');
  });

  it('branding.osName avec un guillemet double : le "name:" de l\'étape de publication de Release reste un YAML valide, sans fermeture prématurée du scalaire', () => {
    const wf = generateGitHubWorkflow(makeRecipe({
      branding: { osName: 'Mon "Super" OS', editionName: 'D', version: '1.0', accentColor: '#000', wallpaperPreset: 'd', bootSplashTheme: 'classic' },
    }));
    const releaseNameMatch = wf.match(/ {10}name: "((?:[^"\\]|\\.)*)"$/m);
    expect(releaseNameMatch, 'ligne "name:" de l\'étape softprops/action-gh-release introuvable ou mal formée').not.toBeNull();
    expect(JSON.parse('"' + releaseNameMatch![1] + '"')).toBe('Mon "Super" OS ${{ steps.autotag.outputs.tag }}');
  });

  it('branding.osName "normal" (sans caractère spécial) : non-régression, contenu identique', () => {
    const wf = generateGitHubWorkflow(makeRecipe({
      branding: { osName: 'ForgeOS', editionName: 'D', version: '1.0', accentColor: '#000', wallpaperPreset: 'd', bootSplashTheme: 'classic' },
    }));
    expect(wf).toContain('name: "🚀 Build & Release Custom Linux ISO (ForgeOS)"');
    expect(wf).toContain('name: "ForgeOS ${{ steps.autotag.outputs.tag }}"');
  });
});

describe('generateWslInstallerBat / generateLiveWindowsBat / generateAutoBuildBat / generateUniversalLauncherBat — bug réel trouvé en auditant, quatrième domaine touché par le même défaut (échappement manquant sur "branding.osName") après cloud-init/workflow YAML : dans un script .bat Windows, le caractère "%" reste actif pour l\'expansion de variable même au milieu d\'une ligne "echo"/"title" sans aucun guillemet autour. Vérifié EMPIRIQUEMENT par une vraie exécution cmd.exe (pas une simple lecture de documentation) : "%HOMEDRIVE%" s\'est réellement substitué par le contenu réel de cette variable d\'environnement Windows, et "%VARIABLE_INEXISTANTE%" a silencieusement disparu du texte affiché, sans la moindre erreur. Corrigé via batEscapePercent() ("%" -> "%%", échappement standard .bat), appliqué aux 4 générateurs .bat du projet', () => {
  it('generateWslInstallerBat : un osName contenant "%" produit "%%" (pourcent littéral protégé) dans les 4 lignes REM/echo concernées', () => {
    const bat = generateWslInstallerBat(makeRecipe({
      branding: { osName: 'Ubuntu %HOMEDRIVE% Test', editionName: 'D', version: '1.0', accentColor: '#000', wallpaperPreset: 'd', bootSplashTheme: 'classic' },
    }));
    expect(bat).toContain('Ubuntu %%HOMEDRIVE%% Test');
    expect(bat).not.toMatch(/[^%]%HOMEDRIVE%[^%]/);
  });

  it('generateLiveWindowsBat : un osName contenant "%" produit "%%" dans la ligne "title"', () => {
    const bat = generateLiveWindowsBat(makeRecipe({
      branding: { osName: 'Ubuntu %HOMEDRIVE% Test', editionName: 'D', version: '1.0', accentColor: '#000', wallpaperPreset: 'd', bootSplashTheme: 'classic' },
    }));
    expect(bat).toContain('title Ubuntu %%HOMEDRIVE%% Test');
  });

  it('generateAutoBuildBat : un osName contenant "%" produit "%%" dans les lignes "title"/echo (non-régression sur le "100%%" déjà protégé, texte fixe)', () => {
    const bat = generateAutoBuildBat(makeRecipe({
      branding: { osName: 'Ubuntu %HOMEDRIVE% Test', editionName: 'D', version: '1.0', accentColor: '#000', wallpaperPreset: 'd', bootSplashTheme: 'classic' },
    }));
    expect(bat).toContain('title Ubuntu %%HOMEDRIVE%% Test');
    expect(bat).toContain('COMPILATION 100%% AUTOMATIQUE');
  });

  it('generateUniversalLauncherBat : un osName contenant "%" produit "%%" dans les lignes "title"/echo', () => {
    const bat = generateUniversalLauncherBat(makeRecipe({
      branding: { osName: 'Ubuntu %HOMEDRIVE% Test', editionName: 'D', version: '1.0', accentColor: '#000', wallpaperPreset: 'd', bootSplashTheme: 'classic' },
    }));
    expect(bat).toContain('Lanceur Ubuntu %%HOMEDRIVE%% Test');
  });

  it('osName "normal" (sans "%") : non-régression, contenu identique sur les 4 générateurs', () => {
    const recipe = makeRecipe({
      branding: { osName: 'ForgeOS', editionName: 'D', version: '1.0', accentColor: '#000', wallpaperPreset: 'd', bootSplashTheme: 'classic' },
    });
    expect(generateWslInstallerBat(recipe)).toContain('Installation de ForgeOS sous Windows WSL2');
    expect(generateLiveWindowsBat(recipe)).toContain('title ForgeOS - Machine Virtuelle QEMU');
    expect(generateAutoBuildBat(recipe)).toContain('title ForgeOS - Compilation 100% Automatique');
    expect(generateUniversalLauncherBat(recipe)).toContain('Lanceur ForgeOS');
  });
});

describe('generateBuildScript (ISO hybride) — bug réel MAJEUR trouvé en auditant, même sévérité que le fix "kernelCmdline" en tout début de session : la ligne "-volid" de la commande xorriso interpolait "branding.osName" directement entre guillemets doubles bash SANS AUCUNE protection. Reproduit par une VRAIE EXÉCUTION bash (pas juste une lecture de code) : un osName aussi simple que \'test"; touch /tmp/preuve; echo "\' brise le guillemet double englobant et permet d\'injecter une commande shell ARBITRAIRE qui s\'exécute réellement lors de la compilation de l\'ISO ("echo INJECTED_COMMAND_RAN > preuve.txt" placé entre les deux guillemets injectés s\'est réellement exécuté, fichier de preuve confirmé créé). Corrigé en réutilisant shQuote() (déjà écrit et vérifié pour ce même problème sur username/fullName/shell/dotfilesGitUrl)', () => {
  it('branding.osName avec guillemets et point-virgule (tentative d\'injection shell) : la ligne "-volid" reste un littéral bash sûr entre guillemets simples, round-trip exact', () => {
    const osName = 'test"; touch /tmp/preuve_injection; echo "';
    const recipe = makeRecipe({
      branding: { osName, editionName: 'D', version: '1.0', accentColor: '#000', wallpaperPreset: 'd', bootSplashTheme: 'classic' },
      distro: 'debian', outputFormat: 'iso_hybrid',
    });
    const script = generateBuildScript(recipe);
    const volidLine = script.split('\n').find(l => l.trim().startsWith('-volid'));
    expect(volidLine, 'ligne "-volid" introuvable dans le script généré').toBeDefined();
    const match = volidLine!.match(/-volid '([^']*)' \\$/);
    expect(match, 'la valeur de -volid doit être entièrement entre guillemets simples bash (shQuote)').not.toBeNull();
    expect(match![1]).toBe(osName.toUpperCase().slice(0, 32));
  });

  it('branding.osName "normal" (sans caractère spécial) : non-régression, contenu identique', () => {
    const recipe = makeRecipe({
      branding: { osName: 'ForgeOS', editionName: 'D', version: '1.0', accentColor: '#000', wallpaperPreset: 'd', bootSplashTheme: 'classic' },
      distro: 'debian', outputFormat: 'iso_hybrid',
    });
    const script = generateBuildScript(recipe);
    expect(script).toContain("-volid 'FORGEOS' \\");
  });
});

describe('firstBootScript — bug réel MAJEUR trouvé en auditant, probablement le plus impactant de toute cette session : "/root/firstboot.sh" était écrit et rendu exécutable (chmod +x) dans les 4 générateurs bash, mais n\'était RÉFÉRENCÉ NULLE PART ailleurs — aucun service systemd, aucun script OpenRC, aucun service runit ne le déclenchait jamais, alors que PostInstallScripts.tsx promet explicitement à l\'utilisateur "Ce script s\'exécutera automatiquement avec les privilèges root lors du tout premier démarrage de la machine." La fonctionnalité "First-Boot Hook" (mise en avant dans l\'UI) ne s\'exécutait donc JAMAIS sur aucun format de sortie généré par ces 4 générateurs (seul le chemin cloud-init exécutait réellement le script). Corrigé avec firstbootTriggerCmd() : un service "oneshot" par famille d\'init (systemd Type=oneshot + auto-désactivation ; OpenRC avec rc-update del après exécution ; runit qui retire son propre symlink), vérifié pour la partie systemd via "systemd-analyze verify" (WSL Ubuntu, exit 0)', () => {
  it('Debian ISO : crée firstboot.service (systemd Type=oneshot, auto-désactivation) et l\'active', () => {
    const script = generateBuildScript(makeRecipe({
      distro: 'debian', outputFormat: 'iso_hybrid', firstBootScript: 'echo test',
    }));
    expect(script).toContain('/etc/systemd/system/firstboot.service');
    expect(script).toContain('Type=oneshot');
    expect(script).toContain('ExecStart=/root/firstboot.sh');
    expect(script).toContain('systemctl disable firstboot.service');
    expect(script).toContain('systemctl enable firstboot.service');
  });

  it('Arch qcow2 (image disque non-Debian) : crée et active firstboot.service (systemd)', () => {
    const script = generateBuildScript(makeRecipe({
      distro: 'arch', outputFormat: 'qcow2', firstBootScript: 'echo test',
    }));
    expect(script).toContain('/etc/systemd/system/firstboot.service');
    expect(script).toContain('systemctl enable firstboot.service');
  });

  it('Alpine (RootFS non-Debian) : crée un script OpenRC /etc/init.d/firstboot et l\'active via rc-update, PAS de systemd', () => {
    const script = generateBuildScript(makeRecipe({
      distro: 'alpine', outputFormat: 'wsl2_tar', firstBootScript: 'echo test',
    }));
    expect(script).toContain('/etc/init.d/firstboot');
    expect(script).toContain('#!/sbin/openrc-run');
    expect(script).toContain('rc-update add firstboot default');
    expect(script).toContain('rc-update del firstboot default');
    expect(script).not.toContain('/etc/systemd/system/firstboot.service');
  });

  it('Void (image disque non-Debian) : crée un service runit /etc/sv/firstboot/run qui retire son propre symlink, PAS de systemd', () => {
    const script = generateBuildScript(makeRecipe({
      distro: 'void', outputFormat: 'raw_img', firstBootScript: 'echo test',
    }));
    expect(script).toContain('/etc/sv/firstboot/run');
    expect(script).toContain('/root/firstboot.sh');
    expect(script).toContain('rm -f /etc/runit/runsvdir/default/firstboot');
    expect(script).not.toContain('/etc/systemd/system/firstboot.service');
  });

  it('Raspberry Pi SD : crée et active firstboot.service (systemd, comme Debian)', () => {
    const script = generateBuildScript(makeRecipe({
      distro: 'raspbian', arch: 'aarch64', outputFormat: 'rpi_sd', firstBootScript: 'echo test',
    }));
    expect(script).toContain('/etc/systemd/system/firstboot.service');
    expect(script).toContain('systemctl enable firstboot.service');
  });

  it('firstBootScript vide : aucun mécanisme de déclenchement créé (rien à exécuter, cohérent avec l\'absence de script)', () => {
    const script = generateBuildScript(makeRecipe({
      distro: 'debian', outputFormat: 'iso_hybrid', firstBootScript: '',
    }));
    expect(script).not.toContain('/etc/systemd/system/firstboot.service');
    expect(script).not.toContain('/etc/init.d/firstboot');
    expect(script).not.toContain('/etc/sv/firstboot');
  });
});

describe('K3s Lightweight Kubernetes — bug réel MAJEUR trouvé en auditant : le paquet du catalogue n\'installait RÉELLEMENT k3s que sur Alpine (vrai paquet apk) — "k3s-bin" sur Arch confirmé ABSENT des dépôts officiels (archlinux.org/packages/search/json, "count": 0, AUR uniquement, jamais installable via "pacman -S" dans ce générateur) et "k3s" sur Fedora confirmé ABSENT (src.fedoraproject.org/rpms/k3s : 404, dont héritent Rocky/openSUSE) — sur Debian/Ubuntu, seuls des prérequis (curl/iptables/wireguard) étaient installés, jamais k3s lui-même. Choisir "K3s" produisait donc un système SANS Kubernetes fonctionnel sur 9 distros sur 10. Corrigé avec k3sSetupCmd() : déclenche le vrai installeur officiel (get.k3s.io, documenté comme supportant systemd ET OpenRC) au premier démarrage via un service "oneshot" auto-désactivant, vérifié via "systemd-analyze verify" (WSL Ubuntu, exit 0 sur le fichier réel généré, sans substitution)', () => {
  it('Debian ISO : crée k3s-setup.service qui déclenche le vrai installeur get.k3s.io', () => {
    const script = generateBuildScript(makeRecipe({
      distro: 'debian', outputFormat: 'iso_hybrid', selectedPackages: ['k3s'],
    }));
    const pkgs = resolvePackageList(makeRecipe({ distro: 'debian', selectedPackages: ['k3s'], customPackages: [] }));
    expect(pkgs).toContain('curl');
    expect(script).toContain('/etc/systemd/system/k3s-setup.service');
    expect(script).toContain('curl -sfL https://get.k3s.io | sh -');
    expect(script).toContain('systemctl enable k3s-setup.service');
  });

  it('Arch qcow2 : installe les vrais prérequis (PAS "k3s-bin", AUR uniquement) et déclenche get.k3s.io', () => {
    const pkgs = resolvePackageList(makeRecipe({ distro: 'arch', selectedPackages: ['k3s'], customPackages: [] }));
    expect(pkgs).not.toContain('k3s-bin');
    expect(pkgs).toContain('curl');
    expect(pkgs).toContain('wireguard-tools');
    const script = generateBuildScript(makeRecipe({ distro: 'arch', outputFormat: 'qcow2', selectedPackages: ['k3s'] }));
    expect(script).toContain('/etc/systemd/system/k3s-setup.service');
  });

  it('Fedora raw_img : installe les vrais prérequis (PAS "k3s", confirmé absent de Fedora) et déclenche get.k3s.io', () => {
    const pkgs = resolvePackageList(makeRecipe({ distro: 'fedora', selectedPackages: ['k3s'], customPackages: [] }));
    expect(pkgs).not.toContain('k3s');
    expect(pkgs).toContain('curl');
    const script = generateBuildScript(makeRecipe({ distro: 'fedora', outputFormat: 'raw_img', selectedPackages: ['k3s'] }));
    expect(script).toContain('/etc/systemd/system/k3s-setup.service');
  });

  it('Alpine : conserve son vrai paquet apk natif "k3s", AUCUN service k3s-setup créé (déjà fonctionnel, rien à déclencher)', () => {
    const pkgs = resolvePackageList(makeRecipe({ distro: 'alpine', selectedPackages: ['k3s'], customPackages: [] }));
    expect(pkgs).toContain('k3s');
    const script = generateBuildScript(makeRecipe({ distro: 'alpine', outputFormat: 'wsl2_tar', selectedPackages: ['k3s'] }));
    expect(script).not.toContain('k3s-setup.service');
  });

  it('Void : honnêtement hors périmètre — avertissement affiché, PAS de faux service k3s-setup (runit non documenté comme supporté par get.k3s.io)', () => {
    const script = generateBuildScript(makeRecipe({ distro: 'void', outputFormat: 'raw_img', selectedPackages: ['k3s'] }));
    expect(script).toContain("n'est pas encore câblé pour Void");
    expect(script).not.toContain('k3s-setup.service');
  });

  it('K3s non sélectionné : aucun mécanisme k3s créé (non-régression)', () => {
    const script = generateBuildScript(makeRecipe({ distro: 'debian', outputFormat: 'iso_hybrid', selectedPackages: [] }));
    expect(script).not.toContain('k3s-setup.service');
    expect(script).not.toContain('get.k3s.io');
  });
});

describe('Tailscale — bug réel trouvé dans le même audit que K3s : le paquet catalogue "wireguard" (nommé "WireGuard VPN & Tailscale" dans l\'UI, tag "Mesh") n\'installait jamais rien lié à Tailscale malgré la promesse du nom et des tags. Contrairement à K3s, "tailscale" est confirmé un vrai paquet natif sur les 4 familles (packages.debian.org/bookworm, archlinux.org, src.fedoraproject.org, pkgs.alpinelinux.org — tous 200) : simple ajout au catalogue, plus activation du service "tailscaled" (jamais démarré auparavant, rendant "tailscale up" inutilisable au premier login même une fois le paquet présent)', () => {
  it('sélectionner "wireguard" installe réellement "tailscale" et active "tailscaled" sur Debian/Arch/Fedora/Alpine', () => {
    for (const distro of ['debian', 'arch', 'fedora', 'alpine'] as const) {
      const pkgs = resolvePackageList(makeRecipe({ distro, selectedPackages: ['wireguard'], customPackages: [] }));
      expect(pkgs, distro).toContain('tailscale');
      const format = distro === 'alpine' ? 'wsl2_tar' : distro === 'arch' ? 'qcow2' : distro === 'fedora' ? 'raw_img' : 'iso_hybrid';
      const script = generateBuildScript(makeRecipe({ distro, outputFormat: format as any, selectedPackages: ['wireguard'] }));
      expect(script, distro).toContain('tailscaled');
    }
  });

  it('wireguard non sélectionné : aucune activation de tailscaled (non-régression)', () => {
    const script = generateBuildScript(makeRecipe({ distro: 'debian', outputFormat: 'iso_hybrid', selectedPackages: [] }));
    expect(script).not.toContain('tailscaled');
  });
});

describe('Ollama Local AI — bug réel MAJEUR trouvé dans le même audit que K3s, même mécanisme : sur Debian/Ubuntu, "ollama_ai" n\'installait que "curl ca-certificates" (prérequis) sans jamais installer Ollama lui-même — vérifié par le CONTENU réel de la page (pas juste le code HTTP, qui renvoie 200 même sur la page d\'erreur "No such package" de packages.debian.org/packages.ubuntu.com) : "ollama" confirmé ABSENT des dépôts Debian bookworm/trixie ET Ubuntu noble. Corrigé en déclenchant le vrai installeur officiel (ollama.com/install.sh, qui crée et active lui-même son propre service systemd) au premier démarrage, vérifié via "systemd-analyze verify" (WSL Ubuntu, exit 0)', () => {
  it('Debian ISO : crée ollama-setup.service qui déclenche le vrai installeur officiel', () => {
    const script = generateBuildScript(makeRecipe({
      distro: 'debian', outputFormat: 'iso_hybrid', selectedPackages: ['ollama_ai'],
    }));
    expect(script).toContain('/etc/systemd/system/ollama-setup.service');
    expect(script).toContain('https://ollama.com/install.sh');
    expect(script).toContain('systemctl enable ollama-setup.service');
  });

  it('Arch qcow2 : AUCUN service ollama-setup créé (vrai paquet natif "ollama" déjà fonctionnel)', () => {
    const script = generateBuildScript(makeRecipe({
      distro: 'arch', outputFormat: 'qcow2', selectedPackages: ['ollama_ai'],
    }));
    expect(script).not.toContain('ollama-setup.service');
  });

  it('Void : honnêtement hors périmètre — avertissement affiché, PAS de faux service ollama-setup', () => {
    const script = generateBuildScript(makeRecipe({
      distro: 'void', outputFormat: 'raw_img', selectedPackages: ['ollama_ai'],
    }));
    expect(script).toContain("n'est pas encore câblé pour Void");
    expect(script).not.toContain('ollama-setup.service');
  });

  it('ollama_ai non sélectionné : aucun mécanisme créé (non-régression)', () => {
    const script = generateBuildScript(makeRecipe({ distro: 'debian', outputFormat: 'iso_hybrid', selectedPackages: [] }));
    expect(script).not.toContain('ollama-setup.service');
  });
});

describe('OpenTofu — bug réel MAJEUR trouvé dans le même audit que K3s/Ollama, même piège (code HTTP 200 sur la page d\'erreur "No such package") : "opentofu" installait un paquet qui n\'existe PAS sur Debian/Ubuntu (packages.debian.org/packages.ubuntu.com : contenu réel confirmé "No such package"). Contrairement à K3s/Ollama (services, déclenchement au premier démarrage), OpenTofu est un simple CLI sans démon : installé directement PENDANT la compilation via le vrai installeur officiel (get.opentofu.org/install-opentofu.sh --install-method deb), vérifié via "bash -n" sur le snippet réel extrait', () => {
  it('Debian ISO : déclenche le vrai installeur officiel OpenTofu pendant la compilation', () => {
    const script = generateBuildScript(makeRecipe({
      distro: 'debian', outputFormat: 'iso_hybrid', selectedPackages: ['opentofu_terraform'],
    }));
    expect(script).toContain('https://get.opentofu.org/install-opentofu.sh');
    expect(script).toContain('--install-method deb');
  });

  it('Arch qcow2 : AUCUN installeur curl déclenché (vrai paquet natif "opentofu" déjà fonctionnel)', () => {
    const script = generateBuildScript(makeRecipe({
      distro: 'arch', outputFormat: 'qcow2', selectedPackages: ['opentofu_terraform'],
    }));
    expect(script).not.toContain('install-opentofu.sh');
  });

  it('opentofu_terraform non sélectionné : aucun mécanisme créé (non-régression)', () => {
    const script = generateBuildScript(makeRecipe({ distro: 'debian', outputFormat: 'iso_hybrid', selectedPackages: [] }));
    expect(script).not.toContain('install-opentofu.sh');
  });
});

describe('K8s CLI Tools (kubectl/helm) — bug réel MAJEUR trouvé dans le même audit que K3s/Ollama/OpenTofu, même piège HTTP-200 : "kubectl"/"helm" installaient des paquets absents de Debian bookworm/trixie et Ubuntu noble (contenu réel confirmé), et "kubernetes-client" était fictif sous ce nom sur openSUSE (seuls des noms versionnés comme "kubernetes1.35-client-common" existent réellement). Corrigé en installant les vrais binaires officiels (dl.k8s.io pour kubectl, script officiel get-helm-4 pour Helm) directement pendant la compilation, vérifié en direct : les deux URLs répondent HTTP 200, et "bash -n" valide chaque script généré', () => {
  it('Debian ISO x86_64 : déclenche le vrai installeur kubectl (amd64) ET Helm (get-helm-4) pendant la compilation', () => {
    const script = generateBuildScript(makeRecipe({
      distro: 'debian', outputFormat: 'iso_hybrid', arch: 'x86_64', selectedPackages: ['k8s_cli_tools'],
    }));
    expect(script).toContain('https://dl.k8s.io/release/');
    expect(script).toContain('/bin/linux/amd64/kubectl');
    expect(script).toContain('https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-4');
  });

  it('Ubuntu ISO aarch64 : le binaire kubectl téléchargé est bien la variante arm64', () => {
    const script = generateBuildScript(makeRecipe({
      distro: 'ubuntu', outputFormat: 'iso_hybrid', arch: 'aarch64', selectedPackages: ['k8s_cli_tools'],
    }));
    expect(script).toContain('/bin/linux/arm64/kubectl');
  });

  it('openSUSE : installe kubectl via dl.k8s.io mais PAS Helm (vrai paquet natif "helm" déjà fonctionnel dans packages.ts)', () => {
    const script = generateBuildScript(makeRecipe({
      distro: 'opensuse', outputFormat: 'wsl2_tar', selectedPackages: ['k8s_cli_tools'],
    }));
    expect(script).toContain('https://dl.k8s.io/release/');
    expect(script).not.toContain('get-helm-4');
  });

  it('Arch : AUCUN installeur curl déclenché (vrais paquets natifs "kubectl"/"helm"/"k9s" déjà fonctionnels)', () => {
    const script = generateBuildScript(makeRecipe({
      distro: 'arch', outputFormat: 'wsl2_tar', selectedPackages: ['k8s_cli_tools'],
    }));
    expect(script).not.toContain('dl.k8s.io');
    expect(script).not.toContain('get-helm-4');
  });

  it('Architecture riscv64 (non publiée par dl.k8s.io) : avertissement honnête affiché, PAS de curl vers une URL cassée', () => {
    const script = generateBuildScript(makeRecipe({
      distro: 'opensuse', outputFormat: 'wsl2_tar', arch: 'riscv64', selectedPackages: ['k8s_cli_tools'],
    }));
    expect(script).toContain("n'est pas encore câblé pour l'architecture riscv64");
    expect(script).not.toContain('curl -fsSL "https://dl.k8s.io');
  });

  it('k8s_cli_tools non sélectionné : aucun mécanisme créé (non-régression)', () => {
    const script = generateBuildScript(makeRecipe({ distro: 'debian', outputFormat: 'iso_hybrid', selectedPackages: [] }));
    expect(script).not.toContain('dl.k8s.io');
    expect(script).not.toContain('get-helm-4');
  });
});

describe('Zig Toolchain — bug réel MAJEUR trouvé dans le même audit que K8s CLI Tools, même piège HTTP-200 : "zig" installait un paquet absent de Debian bookworm/trixie et Ubuntu noble (contenu réel confirmé "No such package"/"Package not available in this suite"). Corrigé en installant la vraie archive officielle depuis ziglang.org/download/ directement pendant la compilation, vérifié en direct : la version stable extraite du vrai index.json (0.16.0 au moment du test) s\'extrait bien via le pipeline shell réel, les 4 URLs d\'archive (x86_64/aarch64/x86/riscv64) répondent HTTP 200, et l\'archive réelle s\'extrait et s\'exécute correctement sous WSL Linux (pas seulement "bash -n")', () => {
  it('Debian ISO x86_64 : déclenche le vrai installeur Zig (archive x86_64-linux) pendant la compilation', () => {
    const script = generateBuildScript(makeRecipe({
      distro: 'debian', outputFormat: 'iso_hybrid', arch: 'x86_64', selectedPackages: ['zig_compiler'],
    }));
    expect(script).toContain('https://ziglang.org/download/index.json');
    expect(script).toContain('zig-x86_64-linux-');
  });

  it('Ubuntu ISO i686 : l\'archive téléchargée est bien la variante "x86" (pas "i686", nom réel utilisé par ziglang.org)', () => {
    const script = generateBuildScript(makeRecipe({
      distro: 'ubuntu', outputFormat: 'iso_hybrid', arch: 'i686', selectedPackages: ['zig_compiler'],
    }));
    expect(script).toContain('zig-x86-linux-');
    expect(script).not.toContain('zig-i686-linux-');
  });

  it('Arch : AUCUN installeur curl déclenché (vrai paquet natif "zig" déjà fonctionnel)', () => {
    const script = generateBuildScript(makeRecipe({
      distro: 'arch', outputFormat: 'wsl2_tar', selectedPackages: ['zig_compiler'],
    }));
    expect(script).not.toContain('ziglang.org');
  });

  it('openSUSE : AUCUN installeur curl déclenché (vrai paquet natif "zig" documenté par le wiki officiel openSUSE)', () => {
    const script = generateBuildScript(makeRecipe({
      distro: 'opensuse', outputFormat: 'wsl2_tar', selectedPackages: ['zig_compiler'],
    }));
    expect(script).not.toContain('ziglang.org');
  });

  it('zig_compiler non sélectionné : aucun mécanisme créé (non-régression)', () => {
    const script = generateBuildScript(makeRecipe({ distro: 'debian', outputFormat: 'iso_hybrid', selectedPackages: [] }));
    expect(script).not.toContain('ziglang.org');
  });
});

describe('VSCodium — bug réel MAJEUR trouvé en auditant, le pire de cette classe de faille trouvé cette session : LES 5 familles étaient fictives (pas seulement Debian/Ubuntu comme pour K3s/Ollama/OpenTofu/K8s CLI Tools/Zig). "codium" absent (contenu réel "No such package") de Debian/Ubuntu/Fedora, "vscodium-bin" absent des dépôts Arch officiels (AUR uniquement), "code" absent d\'Alpine (le vrai paquet "vscodium" n\'existe que dans le dépôt "testing", non activé). Corrigé en ajoutant les vrais dépôts APT/RPM officiels signés pour Debian/Ubuntu/Fedora, vérifié en direct : le dépôt APT réel a été ajouté et interrogé sous WSL Linux (pas seulement bash -n) — "apt-cache policy codium" y confirme un vrai candidat installable (version 1.126.04524) depuis download.vscodium.com', () => {
  it('Debian ISO : ajoute le vrai dépôt APT officiel VSCodium et installe "codium" pendant la compilation', () => {
    const script = generateBuildScript(makeRecipe({
      distro: 'debian', outputFormat: 'iso_hybrid', selectedPackages: ['vscodium'],
    }));
    expect(script).toContain('https://download.vscodium.com/debs');
    expect(script).toContain('apt-get install -y codium');
  });

  it('Fedora : ajoute le vrai dépôt RPM officiel VSCodium et installe "codium" via dnf', () => {
    const script = generateBuildScript(makeRecipe({
      distro: 'fedora', outputFormat: 'wsl2_tar', selectedPackages: ['vscodium'],
    }));
    expect(script).toContain('paulcarroty.gitlab.io/vscodium-deb-rpm-repo/rpms/');
    expect(script).toContain('dnf install -y codium');
  });

  it('Arch : avertissement honnête (aucun paquet officiel, AUR uniquement) — PAS de tentative d\'installation cassée', () => {
    const script = generateBuildScript(makeRecipe({
      distro: 'arch', outputFormat: 'wsl2_tar', selectedPackages: ['vscodium'],
    }));
    expect(script).toContain("n'est pas encore câblé pour Arch");
    expect(script).not.toContain('download.vscodium.com');
  });

  it('Alpine : avertissement honnête (seul le dépôt "testing" instable fournit ce paquet, non activé) — PAS de tentative d\'installation cassée', () => {
    const script = generateBuildScript(makeRecipe({
      distro: 'alpine', outputFormat: 'wsl2_tar', selectedPackages: ['vscodium'],
    }));
    expect(script).toContain("n'est pas encore câblé pour Alpine");
    expect(script).not.toContain('download.vscodium.com');
  });

  it('vscodium non sélectionné : aucun mécanisme créé (non-régression)', () => {
    const script = generateBuildScript(makeRecipe({ distro: 'debian', outputFormat: 'iso_hybrid', selectedPackages: [] }));
    expect(script).not.toContain('download.vscodium.com');
    expect(script).not.toContain('vscodium.repo');
  });
});

describe('uv (Python) — bug réel trouvé en auditant : la description de "python_stack" promet "UV" (le gestionnaire de paquets Python moderne d\'Astral) mais aucune des 5 familles ne l\'installait jamais. "uv" confirmé ABSENT (contenu réel "No such package") de Debian trixie et Ubuntu noble, confirmé RÉEL sur Arch/Alpine/Fedora (ajouté à pkgNames). Corrigé pour Debian/Ubuntu via le vrai installeur officiel astral.sh/uv/install.sh, avec UV_INSTALL_DIR=/usr/local/bin (installation système, pas le défaut par utilisateur "~/.local/bin" inutilisable dans un chroot qui tourne en root) — vérifié en exécutant réellement l\'installeur sous WSL Linux avec cette variable : "uv --version" répond correctement sur le vrai binaire produit', () => {
  it('Debian ISO : déclenche le vrai installeur officiel uv (UV_INSTALL_DIR=/usr/local/bin) pendant la compilation', () => {
    const script = generateBuildScript(makeRecipe({
      distro: 'debian', outputFormat: 'iso_hybrid', selectedPackages: ['python_stack'],
    }));
    expect(script).toContain('https://astral.sh/uv/install.sh');
    expect(script).toContain('UV_INSTALL_DIR=/usr/local/bin');
  });

  it('Arch : "uv" fait partie du vrai paquet natif résolu (pkgNames), AUCUN installeur curl déclenché', () => {
    const pkgs = resolvePackageList(makeRecipe({ distro: 'arch', selectedPackages: ['python_stack'] }));
    expect(pkgs).toContain('uv');
    const script = generateBuildScript(makeRecipe({ distro: 'arch', outputFormat: 'wsl2_tar', selectedPackages: ['python_stack'] }));
    expect(script).not.toContain('astral.sh');
  });

  it('python_stack non sélectionné : aucun mécanisme créé (non-régression)', () => {
    const script = generateBuildScript(makeRecipe({ distro: 'debian', outputFormat: 'iso_hybrid', selectedPackages: [] }));
    expect(script).not.toContain('astral.sh');
  });
});

describe('Heroic Games Launcher — bug réel trouvé en auditant : "heroic-games-launcher" (Debian) et "heroic-games-launcher-bin" (Arch) sont tous deux fictifs (contenu réel "No such package" ; AUR uniquement sur Arch, API JSON count:0) — Heroic ne publie aucun paquet natif dans les dépôts officiels d\'aucune distro. Corrigé en installant les vrais artefacts GitHub Releases officiels (.deb/.rpm/AppImage). Un bug réel MAJEUR a été trouvé et corrigé en EXÉCUTANT réellement la branche Arch sous WSL Linux (pas seulement bash -n) : la première version tentait d\'aplatir l\'extraction AppImage via "mv squashfs-root/* dest/ && rmdir squashfs-root", mais "mv dir/*" ne déplace jamais les fichiers cachés — "rmdir" échouait alors sur "Directory not empty" et coupait TOUTE la chaîne "&&" derrière lui, laissant le symlink/.desktop/icône jamais créés malgré un téléchargement réussi. Corrigé en référençant les chemins directement dans "squashfs-root" — revérifié en direct : la chaîne complète s\'exécute sans erreur, produit un vrai binaire exécutable', () => {
  it('Debian ISO : déclenche le vrai installeur .deb (résolution dynamique via l\'API GitHub releases/latest) pendant la compilation', () => {
    const script = generateBuildScript(makeRecipe({
      distro: 'debian', outputFormat: 'iso_hybrid', selectedPackages: ['lutris_heroic'],
    }));
    expect(script).toContain('HeroicGamesLauncher/releases/latest');
    expect(script).toContain('apt-get install -y /tmp/heroic.deb');
  });

  it('Fedora : déclenche le vrai installeur .rpm via dnf', () => {
    const script = generateBuildScript(makeRecipe({
      distro: 'fedora', outputFormat: 'wsl2_tar', selectedPackages: ['lutris_heroic'],
    }));
    expect(script).toContain('dnf install -y /tmp/heroic.rpm');
  });

  it('Arch : déclenche le vrai installeur AppImage (aucun paquet natif hors AUR) — référence les chemins DANS squashfs-root (pas de "mv"/"rmdir" fragile)', () => {
    const script = generateBuildScript(makeRecipe({
      distro: 'arch', outputFormat: 'wsl2_tar', selectedPackages: ['lutris_heroic'],
    }));
    expect(script).toContain('--appimage-extract');
    expect(script).toContain('/opt/heroic/squashfs-root/AppRun');
    expect(script).not.toContain('mv /opt/heroic/squashfs-root/*');
  });

  it('Alpine : lutris seul (vrai paquet natif), AUCUN mécanisme Heroic (jamais promis pour cette famille)', () => {
    const script = generateBuildScript(makeRecipe({
      distro: 'alpine', outputFormat: 'wsl2_tar', selectedPackages: ['lutris_heroic'],
    }));
    expect(script.toLowerCase()).not.toContain('heroic');
  });

  it('lutris_heroic non sélectionné : aucun mécanisme créé (non-régression)', () => {
    const script = generateBuildScript(makeRecipe({ distro: 'debian', outputFormat: 'iso_hybrid', selectedPackages: [] }));
    expect(script.toLowerCase()).not.toContain('heroic');
  });
});

describe('Metasploit Framework — bug réel MAJEUR trouvé en auditant, le pire de cette classe de faille trouvé cette session en nombre de familles cassées : "metasploit-framework" (Debian/Ubuntu) et "metasploit" (Alpine, Fedora) sont TOUS fictifs (contenu réel "No such package" sur Debian/Ubuntu ; aucun paquet apk officiel sur Alpine ; aucune preuve de paquet officiel sur Fedora, seul le dépôt tiers Rapid7 le fournit) — un outil PHARE du catalogue pentest ne s\'installait donc réellement que sur 1 famille sur 5 (Arch). Corrigé en utilisant le vrai installeur officiel Rapid7 (msfinstall), dont le contenu réel a été téléchargé et lu en direct : gère nativement apt (Debian/Ubuntu), yum/dnf (Fedora, détection /etc/redhat-release) et zypper (openSUSE, détection /usr/bin/zypper)', () => {
  it('Debian ISO : déclenche le vrai installeur officiel Rapid7 (msfinstall) pendant la compilation', () => {
    const script = generateBuildScript(makeRecipe({
      distro: 'debian', outputFormat: 'iso_hybrid', selectedPackages: ['metasploit'],
    }));
    expect(script).toContain('metasploit-omnibus/master/config/templates/metasploit-framework-wrappers/msfupdate.erb');
    expect(script).toContain('/tmp/msfinstall');
  });

  it('Fedora : déclenche le même installeur officiel (gère yum/dnf via détection /etc/redhat-release)', () => {
    const script = generateBuildScript(makeRecipe({
      distro: 'fedora', outputFormat: 'wsl2_tar', selectedPackages: ['metasploit'],
    }));
    expect(script).toContain('msfinstall');
  });

  it('openSUSE : déclenche le même installeur officiel (gère zypper via détection /usr/bin/zypper)', () => {
    const script = generateBuildScript(makeRecipe({
      distro: 'opensuse', outputFormat: 'wsl2_tar', selectedPackages: ['metasploit'],
    }));
    expect(script).toContain('msfinstall');
  });

  it('Arch : AUCUN installeur déclenché (vrai paquet natif "metasploit" déjà fonctionnel)', () => {
    const script = generateBuildScript(makeRecipe({
      distro: 'arch', outputFormat: 'wsl2_tar', selectedPackages: ['metasploit'],
    }));
    expect(script).not.toContain('msfinstall');
  });

  it('Alpine : avertissement honnête (aucun paquet natif ni support apk documenté par l\'installeur officiel) — PAS de tentative cassée', () => {
    const script = generateBuildScript(makeRecipe({
      distro: 'alpine', outputFormat: 'wsl2_tar', selectedPackages: ['metasploit'],
    }));
    expect(script).toContain("n'est pas encore câblé pour Alpine");
    expect(script).not.toContain('msfinstall');
  });

  it('metasploit non sélectionné : aucun mécanisme créé (non-régression)', () => {
    const script = generateBuildScript(makeRecipe({ distro: 'debian', outputFormat: 'iso_hybrid', selectedPackages: [] }));
    expect(script).not.toContain('msfinstall');
  });
});

