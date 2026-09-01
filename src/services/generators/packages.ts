import { OSRecipe } from '../../types/os';
import { DISTROS } from '../../data/distros';
import { SOFTWARE_PACKAGES } from '../../data/packages';
import { PKG_NAME_FALLBACK } from './types';

export function resolvePackageList(recipe: OSRecipe): string[] {
  const distro = DISTROS.find(d => d.id === recipe.distro);
  const distroId = distro ? distro.id : 'debian';

  const pkgs: string[] = [];

  // From selected structured packages
  recipe.selectedPackages.forEach(pkgId => {
    const pkg = SOFTWARE_PACKAGES.find(p => p.id === pkgId);
    if (!pkg) return;
    const fallbackId = PKG_NAME_FALLBACK[distroId];
    const names = pkg.pkgNames[distroId] || (fallbackId ? pkg.pkgNames[fallbackId] : undefined);
    if (names) pkgs.push(...names.split(' '));
  });

  // From custom user package list
  recipe.customPackages.forEach(cp => {
    if (cp.trim()) pkgs.push(cp.trim());
  });

  // Familles pacman/dnf : cachyos suit les paquets Arch, rocky suit les paquets Fedora.
  const isArchLike = distroId === 'arch' || distroId === 'cachyos';
  const isFedoraLike = distroId === 'fedora' || distroId === 'rocky';
  const isDebianLike = distroId === 'debian' || distroId === 'ubuntu' || distroId === 'kali' || distroId === 'raspbian' || distroId === 'linuxmint';

  // Desktop specific packages & Full Graphical Stack
  if (recipe.desktop === 'gnome') {
    if (isDebianLike) {
      pkgs.push(
        'gnome-core', 'gdm3', 'gnome-terminal', 'nautilus', 'firefox-esr',
        'xorg', 'xserver-xorg-video-all', 'mesa-vulkan-drivers', 'mesa-va-drivers',
        'pipewire', 'pipewire-audio', 'wireplumber', 'pavucontrol',
        'network-manager', 'network-manager-gnome', 'wireless-tools', 'wpasupplicant',
        'fonts-noto', 'fonts-liberation', 'fonts-font-awesome', 'bluez'
      );
    } else if (isArchLike) {
      pkgs.push('gnome', 'gdm', 'firefox', 'pipewire', 'wireplumber', 'networkmanager', 'mesa', 'vulkan-intel', 'vulkan-radeon');
    } else if (isFedoraLike) {
      pkgs.push('@gnome-desktop', 'gdm', 'firefox', 'pipewire', 'NetworkManager');
    } else if (distroId === 'alpine') {
      pkgs.push('gnome', 'gdm', 'dbus', 'eudev', 'xorg-server', 'mesa-dri-gallium', 'firefox', 'pipewire', 'wireplumber', 'networkmanager');
    } else if (distroId === 'void') {
      pkgs.push('gnome', 'gdm', 'dbus', 'eudev', 'xorg-server', 'mesa', 'firefox', 'pipewire', 'wireplumber', 'NetworkManager');
    } else if (distroId === 'opensuse') {
      pkgs.push('patterns-gnome-gnome', 'gdm', 'MozillaFirefox', 'pipewire', 'wireplumber', 'NetworkManager');
    }
  } else if (recipe.desktop === 'kde') {
    if (isDebianLike) {
      pkgs.push(
        'plasma-desktop', 'kde-plasma-desktop', 'plasma-workspace', 'plasma-workspace-wayland', 'kwin-wayland', 'kwin-x11', 'sddm', 'konsole', 'dolphin', 'firefox-esr',
        'xorg', 'xserver-xorg-video-all', 'mesa-vulkan-drivers',
        'pipewire', 'pipewire-audio', 'wireplumber', 'network-manager', 'plasma-nm',
        'fonts-noto', 'fonts-font-awesome', 'bluez'
      );
    } else if (isArchLike) {
      pkgs.push('plasma', 'kde-applications', 'sddm', 'firefox', 'pipewire', 'networkmanager', 'mesa');
    } else if (distroId === 'fedora') {
      pkgs.push('@kde-desktop', 'sddm', 'firefox', 'pipewire');
    } else if (distroId === 'rocky') {
      pkgs.push('plasma-desktop', 'plasma-workspace', 'sddm', 'konsole', 'dolphin', 'firefox', 'pipewire');
    } else if (distroId === 'alpine') {
      pkgs.push('plasma-desktop', 'sddm', 'dbus', 'eudev', 'xorg-server', 'mesa-dri-gallium', 'konsole', 'dolphin', 'firefox', 'pipewire', 'networkmanager');
    } else if (distroId === 'void') {
      pkgs.push('plasma-desktop', 'sddm', 'dbus', 'eudev', 'xorg-server', 'mesa', 'konsole', 'dolphin', 'firefox', 'pipewire', 'NetworkManager');
    } else if (distroId === 'opensuse') {
      pkgs.push('plasma6-desktop', 'plasma6-workspace', 'sddm', 'konsole', 'dolphin', 'MozillaFirefox', 'pipewire', 'wireplumber', 'NetworkManager');
    }
  } else if (recipe.desktop === 'hyprland') {
    if (isArchLike) {
      pkgs.push('hyprland', 'waybar', 'wofi', 'kitty', 'dunst', 'xdg-desktop-portal-hyprland', 'polkit-kde-agent', 'thunar', 'firefox', 'pipewire', 'wireplumber', 'ly');
    } else if (isDebianLike) {
      pkgs.push('hyprland', 'waybar', 'wofi', 'kitty', 'xdg-desktop-portal-hyprland', 'thunar', 'firefox-esr', 'pipewire', 'pipewire-audio', 'wireplumber', 'network-manager');
    } else if (distroId === 'alpine') {
      pkgs.push('hyprland', 'waybar', 'foot', 'dbus', 'eudev', 'mesa-dri-gallium', 'thunar', 'firefox', 'pipewire', 'wireplumber');
    } else if (distroId === 'opensuse') {
      pkgs.push('hyprland', 'waybar', 'foot', 'MozillaFirefox', 'pipewire', 'wireplumber', 'NetworkManager', 'ly');
    }
  } else if (recipe.desktop === 'xfce') {
    if (isDebianLike) {
      pkgs.push(
        'xfce4', 'xfce4-goodies', 'lightdm', 'lightdm-gtk-greeter', 'thunar', 'firefox-esr',
        'xorg', 'xserver-xorg-video-all', 'mesa-vulkan-drivers',
        'pulseaudio', 'pavucontrol', 'network-manager', 'network-manager-gnome',
        'fonts-noto', 'fonts-liberation'
      );
    } else if (isArchLike) {
      pkgs.push('xfce4', 'xfce4-goodies', 'lightdm', 'lightdm-gtk-greeter', 'firefox', 'pipewire');
    } else if (distroId === 'fedora') {
      pkgs.push('@xfce-desktop', 'lightdm', 'firefox', 'pipewire');
    } else if (distroId === 'rocky') {
      pkgs.push('xfce4-session', 'xfce4-panel', 'xfce4-terminal', 'thunar', 'lightdm', 'firefox', 'pipewire');
    } else if (distroId === 'alpine') {
      pkgs.push('xfce4', 'xfce4-terminal', 'lightdm', 'lightdm-gtk-greeter', 'dbus', 'eudev', 'xorg-server', 'mesa-dri-gallium', 'thunar', 'firefox', 'pipewire');
    } else if (distroId === 'void') {
      pkgs.push('xfce4', 'lightdm', 'lightdm-gtk-greeter', 'dbus', 'eudev', 'xorg-server', 'mesa', 'firefox', 'pipewire');
    } else if (distroId === 'opensuse') {
      pkgs.push('patterns-xfce-xfce', 'lightdm', 'MozillaFirefox', 'pipewire');
    }
  } else if (recipe.desktop === 'cosmic') {
    if (isDebianLike) {
      pkgs.push('cosmic-session', 'cosmic-greeter', 'cosmic-term', 'cosmic-files', 'firefox-esr', 'pipewire', 'mesa-vulkan-drivers');
    } else if (isArchLike) {
      pkgs.push('cosmic-session', 'cosmic-greeter', 'firefox', 'pipewire');
    } else if (distroId === 'fedora') {
      pkgs.push('cosmic-session', 'cosmic-greeter', 'cosmic-term', 'cosmic-files', 'firefox', 'pipewire');
    } else if (distroId === 'opensuse') {
      pkgs.push('cosmic-session', 'cosmic-greeter', 'cosmic-term', 'cosmic-files', 'MozillaFirefox', 'pipewire', 'wireplumber', 'NetworkManager');
    } else if (distroId === 'alpine') {
      pkgs.push('cosmic-session', 'cosmic-greeter', 'cosmic-term', 'cosmic-files', 'dbus', 'eudev', 'mesa-dri-gallium', 'firefox', 'pipewire', 'networkmanager');
    }
  } else if (recipe.desktop === 'i3wm') {
    if (distroId === 'alpine') {
      pkgs.push('i3wm', 'i3status', 'i3lock', 'dmenu', 'lightdm', 'alacritty', 'dbus', 'eudev', 'xorg-server', 'mesa-dri-gallium', 'firefox', 'pipewire', 'networkmanager');
    } else if (distroId === 'void') {
      pkgs.push('i3', 'i3status', 'i3lock', 'dmenu', 'lightdm', 'alacritty', 'dbus', 'eudev', 'xorg-server', 'mesa', 'firefox', 'pipewire', 'NetworkManager');
    } else if (distroId === 'opensuse') {
      pkgs.push('i3', 'i3status', 'i3lock', 'dmenu', 'lightdm', 'alacritty', 'MozillaFirefox', 'pipewire', 'NetworkManager');
    } else if (isFedoraLike) {
      pkgs.push('i3', 'i3status', 'i3lock', 'dmenu', 'lightdm', 'kitty', 'firefox', 'pipewire', 'NetworkManager');
    } else if (isArchLike) {
      pkgs.push('i3-wm', 'i3status', 'i3lock', 'dmenu', 'lightdm', 'alacritty', 'firefox', 'pipewire', 'wireplumber', 'networkmanager');
    } else {
      pkgs.push('i3-wm', 'i3status', 'i3lock', 'dmenu', 'lightdm', 'alacritty', 'firefox-esr', 'xorg', 'pulseaudio', 'network-manager');
    }
  } else if (recipe.desktop === 'sway') {
    if (isDebianLike) {
      pkgs.push('sway', 'swaylock', 'swaybg', 'swayidle', 'waybar', 'foot', 'firefox-esr', 'pipewire', 'pipewire-audio', 'wireplumber', 'network-manager');
    } else if (isArchLike) {
      pkgs.push('sway', 'swaylock', 'swaybg', 'swayidle', 'waybar', 'foot', 'firefox', 'pipewire', 'wireplumber', 'networkmanager', 'ly');
    } else if (distroId === 'fedora') {
      pkgs.push('sway', 'swaylock', 'swaybg', 'swayidle', 'waybar', 'firefox', 'pipewire', 'NetworkManager', 'ly');
    } else if (distroId === 'alpine') {
      pkgs.push('sway', 'swaylock', 'swaybg', 'swayidle', 'waybar', 'foot', 'dbus', 'eudev', 'mesa-dri-gallium', 'firefox', 'pipewire', 'networkmanager');
    } else if (distroId === 'void') {
      pkgs.push('sway', 'swaylock', 'swaybg', 'swayidle', 'foot', 'dbus', 'eudev', 'mesa', 'firefox', 'pipewire', 'NetworkManager');
    } else if (distroId === 'opensuse') {
      pkgs.push('sway', 'swaylock', 'swaybg', 'swayidle', 'waybar', 'foot', 'MozillaFirefox', 'pipewire', 'wireplumber', 'NetworkManager', 'ly');
    }
  } else if (recipe.desktop === 'cinnamon') {
    if (isDebianLike) {
      pkgs.push('cinnamon', 'lightdm', 'lightdm-gtk-greeter', 'nemo', 'firefox-esr', 'xorg', 'xserver-xorg-video-all', 'pipewire', 'pipewire-audio', 'wireplumber', 'network-manager');
    } else if (isArchLike) {
      pkgs.push('cinnamon', 'lightdm', 'lightdm-gtk-greeter', 'nemo', 'firefox', 'pipewire', 'wireplumber', 'networkmanager');
    } else if (distroId === 'fedora') {
      pkgs.push('@cinnamon-desktop', 'lightdm', 'firefox', 'pipewire');
    } else if (distroId === 'rocky') {
      pkgs.push('cinnamon-desktop', 'lightdm', 'firefox', 'pipewire');
    } else if (distroId === 'void') {
      pkgs.push('cinnamon', 'lightdm', 'lightdm-gtk-greeter', 'nemo', 'dbus', 'eudev', 'xorg-server', 'mesa', 'firefox', 'pipewire', 'NetworkManager');
    } else if (distroId === 'opensuse') {
      pkgs.push('cinnamon', 'lightdm', 'nemo', 'MozillaFirefox', 'pipewire', 'NetworkManager');
    }
  } else if (recipe.desktop === 'lxqt') {
    if (isDebianLike) {
      pkgs.push('lxqt', 'sddm', 'pcmanfm-qt', 'firefox-esr', 'xorg', 'xserver-xorg-video-all', 'pipewire', 'pipewire-audio', 'wireplumber', 'network-manager');
    } else if (isArchLike) {
      pkgs.push('lxqt-session', 'lxqt-panel', 'lxqt-config', 'pcmanfm-qt', 'openbox', 'sddm', 'firefox', 'pipewire', 'wireplumber', 'networkmanager');
    } else if (distroId === 'fedora') {
      pkgs.push('@lxqt-desktop', 'sddm', 'firefox', 'pipewire');
    } else if (distroId === 'alpine') {
      pkgs.push('lxqt-session', 'lxqt-panel', 'pcmanfm-qt', 'sddm', 'dbus', 'eudev', 'xorg-server', 'mesa-dri-gallium', 'firefox', 'pipewire', 'networkmanager');
    } else if (distroId === 'void') {
      pkgs.push('lxqt-session', 'lxqt-panel', 'lxqt-config', 'pcmanfm-qt', 'openbox', 'sddm', 'dbus', 'eudev', 'xorg-server', 'mesa', 'firefox', 'pipewire', 'NetworkManager');
    } else if (distroId === 'opensuse') {
      pkgs.push('patterns-lxqt-lxqt', 'sddm', 'pcmanfm-qt', 'MozillaFirefox', 'pipewire', 'NetworkManager');
    }
  } else if (recipe.desktop === 'lxde') {
    if (isDebianLike) {
      pkgs.push('lxde', 'lightdm', 'lightdm-gtk-greeter', 'firefox-esr', 'xorg', 'xserver-xorg-video-all', 'pipewire', 'pipewire-audio', 'wireplumber', 'network-manager');
    } else if (isArchLike) {
      pkgs.push('lxde', 'lightdm', 'lightdm-gtk-greeter', 'firefox', 'pipewire', 'wireplumber', 'networkmanager');
    } else if (distroId === 'fedora') {
      pkgs.push('@lxde-desktop', 'lightdm', 'firefox', 'pipewire');
    } else if (distroId === 'void') {
      pkgs.push('lxde', 'lightdm', 'lightdm-gtk-greeter', 'dbus', 'eudev', 'xorg-server', 'mesa', 'firefox', 'pipewire', 'NetworkManager');
    } else if (distroId === 'opensuse') {
      pkgs.push('patterns-lxde-lxde', 'lightdm', 'MozillaFirefox', 'pipewire', 'NetworkManager');
    }
  } else if (recipe.desktop === 'mate') {
    if (isDebianLike) {
      pkgs.push('mate-desktop-environment', 'lightdm', 'lightdm-gtk-greeter', 'firefox-esr', 'xorg', 'xserver-xorg-video-all', 'pipewire', 'pipewire-audio', 'wireplumber', 'network-manager');
    } else if (isArchLike) {
      pkgs.push('mate', 'mate-extra', 'lightdm', 'lightdm-gtk-greeter', 'firefox', 'pipewire', 'wireplumber', 'networkmanager');
    } else if (distroId === 'fedora' || distroId === 'rocky') {
      pkgs.push('mate-session-manager', 'mate-panel', 'marco', 'mate-terminal', 'caja', 'mate-control-center', 'lightdm', 'firefox', 'pipewire', 'NetworkManager');
    } else if (distroId === 'void') {
      pkgs.push('mate', 'lightdm', 'lightdm-gtk-greeter', 'dbus', 'eudev', 'xorg-server', 'mesa', 'firefox', 'pipewire', 'NetworkManager');
    } else if (distroId === 'opensuse') {
      pkgs.push('patterns-mate-mate', 'lightdm', 'MozillaFirefox', 'pipewire', 'NetworkManager');
    }
  } else if (recipe.desktop === 'budgie') {
    if (isDebianLike) {
      pkgs.push('budgie-desktop-environment', 'lightdm', 'lightdm-gtk-greeter', 'nautilus', 'gnome-terminal', 'firefox-esr', 'xorg', 'xserver-xorg-video-all', 'pipewire', 'pipewire-audio', 'wireplumber', 'network-manager');
    } else if (isArchLike) {
      pkgs.push('budgie-desktop', 'nautilus', 'gnome-terminal', 'lightdm', 'lightdm-gtk-greeter', 'firefox', 'pipewire', 'wireplumber', 'networkmanager');
    } else if (distroId === 'fedora') {
      pkgs.push('budgie-desktop', 'nautilus', 'gnome-terminal', 'lightdm', 'firefox', 'pipewire', 'NetworkManager');
    } else if (distroId === 'void') {
      pkgs.push('budgie-desktop', 'nautilus', 'gnome-terminal', 'lightdm', 'lightdm-gtk-greeter', 'dbus', 'eudev', 'xorg-server', 'mesa', 'firefox', 'pipewire', 'NetworkManager');
    } else if (distroId === 'opensuse') {
      pkgs.push('patterns-budgie-budgie', 'lightdm', 'MozillaFirefox', 'pipewire', 'NetworkManager');
    }
  } else if (recipe.desktop === 'deepin') {
    if (isArchLike) {
      pkgs.push('deepin', 'ddm', 'firefox', 'pipewire', 'wireplumber', 'networkmanager');
    }
  } else if (recipe.desktop === 'web_kiosk') {
    if (distroId === 'ubuntu' || distroId === 'linuxmint') pkgs.push('firefox', 'cage', 'seatd', 'network-manager');
    else if (distroId === 'alpine' || distroId === 'void') pkgs.push('chromium', 'cage', 'seatd', 'xwayland', 'pipewire');
    else if (isArchLike) pkgs.push('chromium', 'cage', 'seatd', 'pipewire', 'networkmanager');
    else if (isFedoraLike || distroId === 'opensuse') pkgs.push('chromium', 'cage', 'seatd', 'pipewire', 'NetworkManager');
    else pkgs.push('chromium', 'cage', 'seatd', 'pipewire', 'network-manager');
  } else if (recipe.desktop === 'openbox') {
    if (isDebianLike) {
      pkgs.push('openbox', 'tint2', 'feh', 'obconf', 'xterm', 'lightdm', 'lightdm-gtk-greeter', 'xorg', 'xserver-xorg-video-all', 'pipewire', 'pipewire-audio', 'wireplumber', 'network-manager');
    } else if (isArchLike) {
      pkgs.push('openbox', 'tint2', 'feh', 'obconf', 'alacritty', 'lightdm', 'lightdm-gtk-greeter', 'pipewire', 'wireplumber', 'networkmanager');
    } else if (distroId === 'fedora' || distroId === 'rocky') {
      pkgs.push('openbox', 'tint2', 'feh', 'obconf', 'alacritty', 'lightdm', 'pipewire', 'NetworkManager');
    } else if (distroId === 'opensuse') {
      pkgs.push('openbox', 'tint2', 'feh', 'alacritty', 'lightdm', 'pipewire', 'NetworkManager');
    } else if (distroId === 'alpine') {
      pkgs.push('openbox', 'tint2', 'feh', 'xterm', 'lightdm', 'lightdm-gtk-greeter', 'dbus', 'eudev', 'xorg-server', 'mesa-dri-gallium', 'networkmanager');
    } else if (distroId === 'void') {
      pkgs.push('openbox', 'tint2', 'feh', 'obconf', 'alacritty', 'lightdm', 'lightdm-gtk-greeter', 'dbus', 'eudev', 'xorg-server', 'mesa', 'pipewire', 'NetworkManager');
    }
  } else if (recipe.desktop === 'niri') {
    if (isArchLike) {
      pkgs.push('niri', 'xwayland-satellite', 'waybar', 'alacritty', 'fuzzel', 'mako', 'swaylock', 'pipewire', 'wireplumber', 'networkmanager');
    } else if (distroId === 'fedora') {
      pkgs.push('niri', 'waybar', 'alacritty', 'fuzzel', 'mako', 'pipewire', 'NetworkManager');
    } else if (distroId === 'alpine') {
      pkgs.push('niri', 'waybar', 'alacritty', 'fuzzel', 'mako', 'pipewire', 'seatd');
    } else if (distroId === 'void') {
      pkgs.push('niri', 'waybar', 'alacritty', 'fuzzel', 'mako', 'pipewire', 'NetworkManager');
    } else if (distroId === 'opensuse') {
      pkgs.push('niri', 'waybar', 'alacritty', 'fuzzel', 'mako', 'pipewire', 'NetworkManager');
    }
  }

  // Base utilities & hardware drivers
  if (isDebianLike) {
    pkgs.push(
      'sudo', 'curl', 'wget', 'locales', 'ca-certificates', 'systemd-sysv', 'initramfs-tools',
      'firmware-linux-free', 'pciutils', 'usbutils', 'iproute2', 'net-tools'
    );
  } else if (isArchLike) {
    pkgs.push('base', 'linux', 'linux-firmware', 'sudo', 'curl', 'wget', 'pciutils', 'usbutils');
  } else if (distroId === 'alpine') {
    pkgs.push('alpine-base', 'linux-lts', 'shadow', 'sudo', 'curl', 'ca-certificates');
  } else if (isFedoraLike) {
    pkgs.push('kernel', 'shadow-utils', 'sudo', 'curl', 'wget', 'ca-certificates', 'pciutils', 'usbutils', 'NetworkManager');
  } else if (distroId === 'opensuse') {
    pkgs.push('kernel-default', 'sudo', 'shadow', 'curl', 'wget', 'ca-certificates', 'pciutils', 'usbutils', 'NetworkManager');
  } else if (distroId === 'void') {
    pkgs.push('linux', 'linux-firmware', 'shadow', 'sudo', 'curl', 'wget', 'ca-certificates', 'dhcpcd');
  }

  // SSH Server
  if (recipe.enableSSH) {
    if (isDebianLike) {
      pkgs.push('openssh-server');
    } else if (isArchLike || distroId === 'opensuse' || distroId === 'void') {
      pkgs.push('openssh');
    } else if (distroId === 'alpine' || isFedoraLike) {
      pkgs.push('openssh-server');
    }
  }

  // Dotfiles
  if (recipe.dotfilesGitUrl) {
    pkgs.push('git');
  }

  // Fail2ban
  if (recipe.enableSSH && recipe.security.fail2ban) {
    pkgs.push('fail2ban');
  }

  // AppArmor / SELinux
  if (recipe.security.appArmorOrSELinux) {
    if (distroId === 'debian' || distroId === 'ubuntu' || distroId === 'linuxmint' || distroId === 'kali' || distroId === 'raspbian') {
      pkgs.push('apparmor');
    } else if (isFedoraLike) {
      pkgs.push('selinux-policy-targeted', 'policycoreutils');
    }
  }

  // Firewall (ufw/firewalld/nftables)
  if (recipe.security.firewall === 'ufw' && distroId !== 'opensuse') {
    pkgs.push('ufw');
  } else if (recipe.security.firewall === 'firewalld') {
    pkgs.push('firewalld');
  } else if (recipe.security.firewall === 'nftables') {
    pkgs.push('nftables');
  }

  // LUKS2 Encryption
  if (recipe.security.luksEncryption) {
    pkgs.push('cryptsetup');
  }

  // Wi-Fi
  if (recipe.network?.enableWifi) {
    if (isDebianLike) {
      pkgs.push('wpasupplicant', 'wireless-tools');
    } else if (distroId === 'alpine') {
      pkgs.push('wpa_supplicant');
    } else if (isArchLike || isFedoraLike || distroId === 'opensuse' || distroId === 'void') {
      pkgs.push('wpa_supplicant');
    }
  }

  // GitHub SSH Import
  if (recipe.user.sshImportGithubUser) {
    pkgs.push('curl');
  }

  // Auto Security Updates
  if (recipe.security.autoSecurityUpdates) {
    if (isDebianLike) {
      pkgs.push('unattended-upgrades');
    } else if (isFedoraLike) {
      pkgs.push('dnf-automatic');
    }
  }

  // Custom User Shell
  if (recipe.user.shell === '/bin/zsh') {
    pkgs.push('zsh');
  } else if (recipe.user.shell === '/bin/fish') {
    pkgs.push(distroId === 'void' ? 'fish-shell' : 'fish');
  }

  // Flatpak & App Stores
  if (recipe.enableFlatpak) {
    pkgs.push('flatpak');
    if (recipe.desktop === 'kde') {
      pkgs.push('plasma-discover-backend-flatpak');
    } else if (recipe.desktop === 'gnome') {
      pkgs.push('gnome-software-plugin-flatpak');
    }
  }

  // Installeur Graphique Calamares
  if (recipe.enableCalamaresInstaller) {
    pkgs.push('calamares');
    if (recipe.distro === 'ubuntu' || recipe.distro === 'linuxmint') {
      pkgs.push('calamares-settings-ubuntu');
    } else if (isDebianLike) {
      pkgs.push('calamares-settings-debian');
    }
  }

  // Pilotes Graphiques GPU & Utilitaires Matériels
  if (recipe.gpuDriver === 'nvidia_proprietary' || recipe.gpuDriver === 'hybrid_prime') {
    if (isDebianLike) {
      pkgs.push('nvidia-driver');
      if (recipe.gpuDriver === 'hybrid_prime') pkgs.push('nvidia-prime');
    } else if (isArchLike) {
      pkgs.push('nvidia-dkms', 'nvidia-utils');
      if (recipe.gpuDriver === 'hybrid_prime') pkgs.push('prime-run');
    } else if (isFedoraLike) {
      pkgs.push('akmod-nvidia', 'xorg-x11-drv-nvidia');
    }
  }

  // Outils ASUS ROG & TUF
  if (recipe.enableAsusRogTools) {
    if (isArchLike || isFedoraLike) {
      pkgs.push('asusctl', 'supergfxctl');
    }
  }

  // Outils AMD CoreCtrl
  if (recipe.enableCoreCtrlAmd) {
    if (isDebianLike || isArchLike || isFedoraLike || distroId === 'opensuse') {
      pkgs.push('corectrl');
    }
  }

  // zRAM Swap
  if (recipe.enableZram || recipe.security.enableZram) {
    if (isDebianLike || isArchLike) {
      pkgs.push('systemd-zram-generator');
    } else if (isFedoraLike) {
      pkgs.push('zram-generator');
    } else if (distroId === 'alpine') {
      pkgs.push('zram-init');
    }
  }

  // WireGuard
  if (recipe.network?.enableWireguard) {
    pkgs.push('wireguard-tools');
  }

  // Gaming Optimizations
  if (recipe.enableGamingOptimizations) {
    pkgs.push('gamemode', 'mangohud');
    if (isDebianLike || isFedoraLike) {
      pkgs.push('mesa-vulkan-drivers');
    } else if (isArchLike) {
      pkgs.push('vulkan-radeon', 'vulkan-intel', 'vulkan-tools');
    } else if (distroId === 'alpine') {
      pkgs.push('mesa-vulkan-ati', 'mesa-vulkan-intel');
    } else if (distroId === 'opensuse') {
      pkgs.push('libvulkan_radeon', 'libvulkan_intel');
    }
  }

  // Power Saving (TLP)
  if (recipe.enablePowerSaving) {
    if (isDebianLike || isFedoraLike || distroId === 'opensuse') {
      pkgs.push('tlp', 'tlp-rdw', 'powertop');
    } else {
      pkgs.push('tlp', 'powertop');
    }
  }

  // Proxmox Template
  if (recipe.outputFormat === 'proxmox_qcow2') {
    if (isDebianLike || isFedoraLike || isArchLike || distroId === 'alpine' || distroId === 'opensuse' || distroId === 'void') {
      pkgs.push('qemu-guest-agent', 'cloud-init');
    }
  }

  return Array.from(new Set(pkgs.filter(Boolean)));
}
