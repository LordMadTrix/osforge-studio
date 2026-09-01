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
  fedora: 'fedora',
  rocky: 'fedora',
  alpine: 'alpine',
  opensuse: 'suse',
  void: 'void',
};

export const DEBOOTSTRAP_TARGETS: Record<string, DebianTarget> = {
  debian: {
    suite: 'trixie',
    mirror: 'http://deb.debian.org/debian',
    sourcesList: () => `deb http://deb.debian.org/debian trixie main contrib non-free non-free-firmware
deb http://deb.debian.org/debian-security trixie-security main contrib non-free non-free-firmware
deb http://deb.debian.org/debian trixie-updates main contrib non-free non-free-firmware`,
  },
  ubuntu: {
    suite: 'resolute',
    mirror: 'http://archive.ubuntu.com/ubuntu',
    sourcesList: () => `deb http://archive.ubuntu.com/ubuntu resolute main restricted universe multiverse
deb http://archive.ubuntu.com/ubuntu resolute-updates main restricted universe multiverse
deb http://archive.ubuntu.com/ubuntu resolute-security main restricted universe multiverse`,
    components: 'main,universe',
  },
  kali: {
    suite: 'kali-rolling',
    mirror: 'http://http.kali.org/kali',
    sourcesList: () => `deb http://http.kali.org/kali kali-rolling main contrib non-free non-free-firmware`,
  },
  linuxmint: {
    suite: 'resolute',
    mirror: 'http://archive.ubuntu.com/ubuntu',
    sourcesList: () => `deb http://archive.ubuntu.com/ubuntu resolute main restricted universe multiverse
deb http://archive.ubuntu.com/ubuntu resolute-updates main restricted universe multiverse
deb http://archive.ubuntu.com/ubuntu resolute-security main restricted universe multiverse`,
    components: 'main,universe',
  },
  raspbian: {
    suite: 'bookworm',
    mirror: 'http://deb.debian.org/debian',
    sourcesList: () => `deb http://deb.debian.org/debian bookworm main
deb [signed-by=/etc/apt/keyrings/raspberrypi.gpg.key] http://archive.raspberrypi.com/debian bookworm main`,
  },
};
