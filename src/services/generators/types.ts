import { DistroId } from '../../types/os';

export type NonDebianFamily = 'arch' | 'fedora' | 'alpine' | 'suse' | 'void';

export interface DebianTarget {
  suite: string;
  mirror: string;
  components?: string;
  sourcesList: (arch: string) => string;
}

export const PKG_NAME_FALLBACK: Partial<Record<DistroId, DistroId>> = {
  kali: 'debian',
  raspbian: 'debian',
  cachyos: 'arch',
  rocky: 'fedora',
  opensuse: 'fedora',
  void: 'alpine',
  linuxmint: 'ubuntu',
  popos: 'ubuntu',
  almalinux: 'fedora',
  endeavouros: 'arch',
  parrot: 'debian',
};

export const KEYBOARD_XKB_MAP: Record<string, { layout: string; variant?: string }> = {
  fr: { layout: 'fr' },
  us: { layout: 'us' },
  uk: { layout: 'gb' },
  de: { layout: 'de' },
  es: { layout: 'es' },
  it: { layout: 'it' },
  'ca-fr': { layout: 'ca', variant: 'fr' },
  be: { layout: 'be' },
  'ch-fr': { layout: 'ch', variant: 'fr' },
};

export const NON_DEBIAN_DISTROS: Record<string, NonDebianFamily> = {
  arch: 'arch',
  cachyos: 'arch',
  endeavouros: 'arch',
  fedora: 'fedora',
  rocky: 'fedora',
  almalinux: 'fedora',
  alpine: 'alpine',
  opensuse: 'suse',
  void: 'void',
};

const DEBIAN_SUITES = ['trixie', 'bookworm', 'forky', 'sid'];
const UBUNTU_SUITES = ['resolute', 'noble', 'jammy', 'focal'];
const KALI_SUITES = ['kali-rolling', 'kali-dev'];
const RASPBIAN_SUITES = ['bookworm', 'bullseye', 'trixie'];
const PARROT_SUITES = ['lory', 'current'];

export function resolveDebianTarget(distro: DistroId, customSuite?: string): DebianTarget | undefined {
  if (distro === 'debian') {
    const suite = (customSuite && DEBIAN_SUITES.includes(customSuite)) ? customSuite : 'trixie';
    return {
      suite,
      mirror: 'http://deb.debian.org/debian',
      sourcesList: () => `deb http://deb.debian.org/debian ${suite} main contrib non-free non-free-firmware
deb http://deb.debian.org/debian-security ${suite}-security main contrib non-free non-free-firmware
deb http://deb.debian.org/debian ${suite}-updates main contrib non-free non-free-firmware`,
    };
  }

  if (distro === 'ubuntu' || distro === 'linuxmint' || distro === 'popos') {
    const defaultSuite = distro === 'popos' ? 'noble' : 'resolute';
    const suite = (customSuite && UBUNTU_SUITES.includes(customSuite)) ? customSuite : defaultSuite;
    return {
      suite,
      mirror: 'http://archive.ubuntu.com/ubuntu',
      components: distro === 'popos' ? 'main,universe,restricted,multiverse' : 'main,universe',
      sourcesList: () => `deb http://archive.ubuntu.com/ubuntu ${suite} main restricted universe multiverse
deb http://archive.ubuntu.com/ubuntu ${suite}-updates main restricted universe multiverse
deb http://archive.ubuntu.com/ubuntu ${suite}-security main restricted universe multiverse${distro === 'popos' ? `\ndeb http://apt.pop-os.org/release ${suite} main` : ''}`,
    };
  }

  if (distro === 'kali') {
    const suite = (customSuite && KALI_SUITES.includes(customSuite)) ? customSuite : 'kali-rolling';
    return {
      suite,
      mirror: 'http://http.kali.org/kali',
      sourcesList: () => `deb http://http.kali.org/kali ${suite} main contrib non-free non-free-firmware`,
    };
  }

  if (distro === 'parrot') {
    const suite = (customSuite && PARROT_SUITES.includes(customSuite)) ? customSuite : 'lory';
    return {
      suite,
      mirror: 'https://deb.parrot.sh/parrot',
      sourcesList: () => `deb https://deb.parrot.sh/parrot ${suite} main contrib non-free non-free-firmware
deb https://deb.parrot.sh/parrot ${suite}-security main contrib non-free non-free-firmware
deb https://deb.parrot.sh/parrot ${suite}-backports main contrib non-free non-free-firmware`,
    };
  }

  if (distro === 'raspbian') {
    const suite = (customSuite && RASPBIAN_SUITES.includes(customSuite)) ? customSuite : 'bookworm';
    return {
      suite,
      mirror: 'http://deb.debian.org/debian',
      sourcesList: () => `deb http://deb.debian.org/debian ${suite} main
deb [signed-by=/etc/apt/keyrings/raspberrypi.gpg.key] http://archive.raspberrypi.com/debian ${suite} main`,
    };
  }

  return undefined;
}

export const DEBOOTSTRAP_TARGETS: Record<string, DebianTarget> = {
  debian: resolveDebianTarget('debian')!,
  ubuntu: resolveDebianTarget('ubuntu')!,
  kali: resolveDebianTarget('kali')!,
  linuxmint: resolveDebianTarget('linuxmint')!,
  popos: resolveDebianTarget('popos')!,
  parrot: resolveDebianTarget('parrot')!,
  raspbian: resolveDebianTarget('raspbian', 'bookworm')!,
};
