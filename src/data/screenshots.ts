// Vraies captures d'écran (Wikimedia Commons, licences libres GPL/CC/MIT).
// Attribution complète dans ATTRIBUTIONS.md à la racine du projet.
export interface ScreenshotAsset {
  src: string;
  author: string;
  source: string;
  license: string;
}

export const DISTRO_SCREENSHOTS: Partial<Record<string, ScreenshotAsset>> = {
  debian: {
    src: '/screenshots/distros/debian.webp',
    author: 'The Debian Project (capture : TOMats)',
    source: 'https://commons.wikimedia.org/wiki/File:Debian_12_(Bookworm)_-_GNOME_desktop.png',
    license: 'GPL-2.0-or-later / CC BY-SA 4.0',
  },
  ubuntu: {
    src: '/screenshots/distros/ubuntu.webp',
    author: 'Canonical Ltd.',
    source: 'https://commons.wikimedia.org/wiki/File:Ubuntu_24.04_LTS_default_desktop_-_English.png',
    license: 'GPL-2.0-or-later',
  },
  cachyos: {
    src: '/screenshots/distros/cachyos.webp',
    author: 'GKCMXLL',
    source: 'https://commons.wikimedia.org/wiki/File:CachyOS_250824.png',
    license: 'GPL-2.0-or-later',
  },
  arch: {
    src: '/screenshots/distros/arch.webp',
    author: 'Arch Linux developers',
    source: 'https://commons.wikimedia.org/wiki/File:Arch_Linux_screenshot,_12.06.2024.png',
    license: 'GPL-2.0-or-later',
  },
  alpine: {
    src: '/screenshots/distros/alpine.webp',
    author: 'Codc',
    source: 'https://commons.wikimedia.org/wiki/File:Alpine_linux.JPG',
    license: 'Domaine public',
  },
  kali: {
    src: '/screenshots/distros/kali.webp',
    author: 'Purpurreiher',
    source: 'https://commons.wikimedia.org/wiki/File:Kali_Linux_2021.2.png',
    license: 'GPL-2.0-or-later',
  },
  fedora: {
    src: '/screenshots/distros/fedora.webp',
    author: 'The Fedora Project (capture : Kirbix12)',
    source: 'https://commons.wikimedia.org/wiki/File:Fedora_42_Workstation_Desktop_English.png',
    license: 'GPL-2.0-or-later',
  },
  nixos: {
    src: '/screenshots/distros/nixos.webp',
    author: 'NixOS Foundation',
    source: 'https://commons.wikimedia.org/wiki/File:NixOS_21.11_GNOME_with_Files_and_default_theme_-_English.png',
    license: 'GPL-2.0-or-later',
  },
  void: {
    src: '/screenshots/distros/void.webp',
    author: 'The Void Linux Community',
    source: 'https://commons.wikimedia.org/wiki/File:Void_Linux_20210930_Xfce_Thunar_4.15.10_Adwaita_dark_theme_-_English.png',
    license: 'GPL-2.0-or-later',
  },
  raspbian: {
    src: '/screenshots/distros/raspbian.webp',
    author: 'Raspberry Pi Holdings',
    source: 'https://commons.wikimedia.org/wiki/File:Raspberry_Pi_OS_13_screenshot.png',
    license: 'GPL-2.0-or-later',
  },
  opensuse: {
    src: '/screenshots/distros/opensuse.webp',
    author: 'KDE Project / openSUSE (capture : VulcanSphere)',
    source: 'https://commons.wikimedia.org/wiki/File:KDE_Plasma_6_screenshot_(openSUSE_dark_mode).png',
    license: 'GPL-2.0-or-later',
  },
  rocky: {
    src: '/screenshots/distros/rocky.webp',
    author: 'Rocky Enterprise Software Foundation (capture : ZalnaRs)',
    source: 'https://commons.wikimedia.org/wiki/File:Rocky_Linux_10_Workstation.png',
    license: 'GPL-2.0-or-later',
  },
  linuxmint: {
    src: '/screenshots/distros/linuxmint.webp',
    author: 'Linux Mint Devs (capture : Funkruf)',
    source: 'https://commons.wikimedia.org/wiki/File:Linux_Mint_20_Cinnamon.png',
    license: 'GPL-2.0-or-later',
  },
  popos: {
    src: '/screenshots/distros/popos.webp',
    author: 'System76',
    source: 'https://commons.wikimedia.org/wiki/File:Pop!_OS_24.04_LTS_custom_Pop_wallpaper_-_English.png',
    license: 'GPL-3.0',
  },
  almalinux: {
    src: '/screenshots/distros/almalinux.webp',
    author: 'AlmaLinux OS Foundation',
    source: 'https://commons.wikimedia.org/wiki/File:AlmaLinux_9.3_GNOME_Files_40.2_-_English.png',
    license: 'GPL-2.0-or-later',
  },
  endeavouros: {
    src: '/screenshots/distros/endeavouros.webp',
    author: 'endeavouros-team',
    source: 'https://commons.wikimedia.org/wiki/File:EndeavourOS_Endeavour.Neo.2024.09.22_default_desktop_-_English.png',
    license: 'GPL-2.0-or-later',
  },
  parrot: {
    src: '/screenshots/distros/parrot.webp',
    author: 'Parrot Dev Team',
    source: 'https://commons.wikimedia.org/wiki/File:Parrot-security-3.70f1117e.png',
    license: 'GPL-2.0-or-later',
  },
  armbian: {
    src: '/screenshots/distros/armbian.webp',
    author: 'Igor Pecovnik (Armbian Project)',
    source: 'https://commons.wikimedia.org/wiki/File:Armbian-desktop.png',
    license: 'GPL-2.0-or-later',
  },
  dietpi: {
    src: '/screenshots/distros/dietpi.webp',
    author: 'Daniel Knight (DietPi Project)',
    source: 'https://commons.wikimedia.org/wiki/File:DietPi_installation_-_English.jpg',
    license: 'GPL-2.0-or-later',
  },
};

export const DESKTOP_SCREENSHOTS: Partial<Record<string, ScreenshotAsset>> = {
  gnome: {
    src: '/screenshots/desktops/gnome.webp',
    author: 'The GNOME Project (capture : Paowee, CentOS Stream 10)',
    source: 'https://commons.wikimedia.org/wiki/File:CentOS_Stream_10_screenshot,_with_GNOME_47.png',
    license: 'GPL-2.0-or-later',
  },
  kde: {
    src: '/screenshots/desktops/kde.webp',
    author: 'KDE developers (capture : VulcanSphere)',
    source: 'https://commons.wikimedia.org/wiki/File:KDE_Plasma_6.3_desktop_screenshot.webp',
    license: 'GPL-2.0+ / LGPL-2.1+',
  },
  xfce: {
    src: '/screenshots/desktops/xfce.webp',
    author: 'Martin Wagner',
    source: 'https://commons.wikimedia.org/wiki/File:XFCE-4.12-Desktop-standard.png',
    license: 'GPL-2.0-or-later',
  },
  cinnamon: {
    src: '/screenshots/desktops/cinnamon.webp',
    author: 'Linux Mint Devs (capture : Funkruf)',
    source: 'https://commons.wikimedia.org/wiki/File:Linux_Mint_20_Cinnamon.png',
    license: 'GPL-2.0-or-later',
  },
  lxqt: {
    src: '/screenshots/desktops/lxqt.webp',
    author: 'LXQt developers',
    source: 'https://commons.wikimedia.org/wiki/File:LXQt_2.0.0_Ambiance_screenshot.png',
    license: 'LGPL-2.1+ / GPL-2.0+',
  },
  hyprland: {
    src: '/screenshots/desktops/hyprland.webp',
    author: 'Worthymelight',
    source: 'https://commons.wikimedia.org/wiki/File:Hyprland_screen.png',
    license: 'CC BY 4.0',
  },
  i3wm: {
    src: '/screenshots/desktops/i3wm.webp',
    author: 'Michael Stapelberg',
    source: 'https://commons.wikimedia.org/wiki/File:I3_window_manager_screenshot.png',
    license: 'CC BY-SA 3.0',
  },
  sway: {
    src: '/screenshots/desktops/sway.webp',
    author: 'Alexey Samoilov (Ubuntu Sway Remix)',
    source: 'https://commons.wikimedia.org/wiki/File:Ubuntu_Sway_Remix_Dekstop_(22.04).png',
    license: 'GPL-2.0-or-later',
  },
  cosmic: {
    src: '/screenshots/desktops/cosmic.webp',
    author: 'System76',
    source: 'https://commons.wikimedia.org/wiki/File:COSMIC_Epoch_1.0.0_alpha_desktop.png',
    license: 'GPL-3.0',
  },
  mate: {
    src: '/screenshots/desktops/mate.webp',
    author: 'The Ubuntu MATE Team',
    source: 'https://commons.wikimedia.org/wiki/File:Ubuntu_MATE_25.04_default_desktop_-_English.png',
    license: 'GPL-2.0-or-later',
  },
  budgie: {
    src: '/screenshots/desktops/budgie.webp',
    author: 'Ubuntu Budgie Team',
    source: 'https://commons.wikimedia.org/wiki/File:Ubuntu_Budgie_25.04_default_desktop_-_English.png',
    license: 'GPL-2.0-or-later',
  },
  deepin: {
    src: '/screenshots/desktops/deepin.webp',
    author: 'Deepin Technology Co., Ltd',
    source: 'https://commons.wikimedia.org/wiki/File:Deepin_Linux_23.1_default_desktop_-_English.png',
    license: 'GPL-3.0',
  },
  pantheon: {
    src: '/screenshots/desktops/pantheon.webp',
    author: 'elementary, Inc.',
    source: 'https://commons.wikimedia.org/wiki/File:Elementary_OS_8.0_default_desktop_-_English.png',
    license: 'GPL-3.0',
  },
  lxde: {
    src: '/screenshots/desktops/lxde.webp',
    author: 'The Debian Project',
    source: 'https://commons.wikimedia.org/wiki/File:Debian_11.9.0_LXDE_default_desktop_-_English.png',
    license: 'GPL-2.0-or-later',
  },
  openbox: {
    src: '/screenshots/desktops/openbox.webp',
    author: 'Freebie (Arch Linux / Openbox)',
    source: 'https://commons.wikimedia.org/wiki/File:Arch_Linux_with_the_Openbox_WM.png',
    license: 'GPL-2.0-or-later',
  },
  bspwm: {
    src: '/screenshots/desktops/bspwm.webp',
    author: 'Aditya Shakya',
    source: 'https://commons.wikimedia.org/wiki/File:Archcraft-v2023.04-Bspwn.png',
    license: 'GPL-3.0',
  },
  wayfire: {
    src: '/screenshots/desktops/wayfire.webp',
    author: 'Drew DeVault / Wayfire team',
    source: 'https://commons.wikimedia.org/wiki/File:Wfire.png',
    license: 'MIT',
  },
};

export const DM_SCREENSHOTS: Partial<Record<string, ScreenshotAsset>> = {
  sddm: {
    src: '/screenshots/desktops/sddm.webp',
    author: 'Lubuntu Team / SDDM developers',
    source: 'https://commons.wikimedia.org/wiki/File:Lubuntu_25.04_sddm-ocean_wallpaper_-_English.jpg',
    license: 'GPL-2.0-or-later',
  },
  lightdm: {
    src: '/screenshots/desktops/lightdm.webp',
    author: 'MikoSushi000',
    source: 'https://commons.wikimedia.org/wiki/File:LightDM-GTK-greeter.webp',
    license: 'CC BY 4.0',
  },
  gdm3: {
    src: '/screenshots/desktops/gdm3.webp',
    author: 'GNOME Project',
    source: 'https://commons.wikimedia.org/wiki/File:Gdm_greeter.jpg',
    license: 'CC BY-SA 4.0',
  },
};
