import { describe, it, expect } from 'vitest';
import { OSRecipe } from '../../types/os';
import {
  sanitizeOsSlug,
  sanitizeHexColor,
  hexToRgb,
  hexToGnomeAccent,
  generateWallpaperSvg,
  generateLogoSvg,
  generateOsReleaseCmd,
  generateWallpaperSetupCmd,
  generateGlobalThemeCmd,
  generateFastfetchMotdCmd,
  generatePlymouthCmd,
  generateGrubThemeCmd,
  generateFontconfigCmd,
  generateTerminalThemeCmd,
  generateProAliasesCmd,
  generateStartupSoundCmd,
  generateAutostartThemeCmd,
  generateDefaultApplicationsCmd,
  generateBrandingChrootCommands,
  escapeXml,
} from './branding';
import { resolvePackageList } from './packages';

function makeRecipe(overrides: Partial<OSRecipe> = {}): OSRecipe {
  return {
    id: 'test-recipe',
    name: 'Test Recipe',
    description: 'Test Description',
    distro: 'ubuntu',
    distroVersion: '24.04',
    distroSuite: 'noble',
    arch: 'x86_64',
    outputFormat: 'iso_hybrid',
    desktop: 'kde',
    displayManager: 'sddm',
    kernel: 'xanmod',
    selectedPackages: [],
    customPackages: [],
    user: {
      username: 'gamer',
      password: 'password',
      fullName: 'Steam Gamer',
      sudo: true,
      autologin: true,
      shell: '/bin/bash',
    },
    hostname: 'steambox',
    timezone: 'Europe/Paris',
    locale: 'fr_FR.UTF-8',
    keyboardLayout: 'fr',
    enableSSH: true,
    customServices: [],
    firstBootScript: '',
    security: {
      firewall: 'ufw',
      appArmorOrSELinux: true,
      fail2ban: false,
      luksEncryption: false,
      disableRootSSH: true,
      autoSecurityUpdates: true,
      cisBenchmarkLevel: 1,
    },
    branding: {
      osName: 'SteamMachineOS',
      editionName: 'Console Edition',
      version: '3.0',
      accentColor: '#ff003c',
      wallpaperPreset: 'gaming_rog',
      bootSplashTheme: 'bgrt',
      enableGrubTheme: true,
      enableFastfetchMotd: true,
      enableCustomOsRelease: true,
    },
    ...overrides,
  };
}

describe('Branding & Personnalisation Complète (Zéro Cosmétique)', () => {
  describe('Sanitizers & Conversions de Couleurs', () => {
    it('sanitizeOsSlug : convertit proprement les noms avec espaces, accents et symboles', () => {
      expect(sanitizeOsSlug('SteamMachineOS 3.0')).toBe('steammachineos-3-0');
      expect(sanitizeOsSlug('  Mon OS / Pro!! ')).toBe('mon-os-pro');
      expect(sanitizeOsSlug('')).toBe('custom-linux');
    });

    it('sanitizeHexColor : accepte les hex 6 caractères et rejette les entrées invalides', () => {
      expect(sanitizeHexColor('#FF003C')).toBe('#ff003c');
      expect(sanitizeHexColor('#0ea5e9')).toBe('#0ea5e9');
      expect(sanitizeHexColor('red', '#123456')).toBe('#123456');
      expect(sanitizeHexColor('#xyz', '#123456')).toBe('#123456');
    });

    it('hexToRgb : calcule fidèlement les composantes RGB pour KDE kdeglobals', () => {
      expect(hexToRgb('#ffffff')).toEqual({ r: 255, g: 255, b: 255 });
      expect(hexToRgb('#000000')).toEqual({ r: 0, g: 0, b: 0 });
      expect(hexToRgb('#ff003c')).toEqual({ r: 255, g: 0, b: 60 });
    });

    it('hexToGnomeAccent : mappe vers les noms de couleur supportés par GNOME/GTK4', () => {
      expect(hexToGnomeAccent('#ff0000')).toBe('red');
      expect(hexToGnomeAccent('#f97316')).toBe('orange');
      expect(hexToGnomeAccent('#eab308')).toBe('yellow');
      expect(hexToGnomeAccent('#22c55e')).toBe('green');
      expect(hexToGnomeAccent('#06b6d4')).toBe('teal');
      expect(hexToGnomeAccent('#3b82f6')).toBe('blue');
      expect(hexToGnomeAccent('#a855f7')).toBe('purple');
      expect(hexToGnomeAccent('#ec4899')).toBe('pink');
    });
  });

  describe('Générateurs SVG de Fond d’Écran & Logo', () => {
    it('generateWallpaperSvg : génère un SVG 1920x1080 valide avec le nom et l’édition de l’OS', () => {
      const recipe = makeRecipe();
      const svg = generateWallpaperSvg(recipe);
      expect(svg).toContain('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1920 1080"');
      expect(svg).toContain('STEAMMACHINEOS');
      expect(svg).toContain('CONSOLE EDITION');
      expect(svg).toContain('#ff003c');
    });

    it('generateWallpaperSvg : produit des SVG distincts pour les 5 presets', () => {
      const r = makeRecipe();
      const minimalSvg = generateWallpaperSvg({ ...r, branding: { ...r.branding, wallpaperPreset: 'minimal' } });
      const cyberpunkSvg = generateWallpaperSvg({ ...r, branding: { ...r.branding, wallpaperPreset: 'cyberpunk' } });
      const matrixSvg = generateWallpaperSvg({ ...r, branding: { ...r.branding, wallpaperPreset: 'matrix' } });
      const rogSvg = generateWallpaperSvg({ ...r, branding: { ...r.branding, wallpaperPreset: 'gaming_rog' } });
      const spaceSvg = generateWallpaperSvg({ ...r, branding: { ...r.branding, wallpaperPreset: 'deep_space' } });

      expect(minimalSvg).toContain('Minimalist Geometry');
      expect(cyberpunkSvg).toContain('Synthwave Sun');
      expect(matrixSvg).toContain('Digital Rain Columns');
      expect(rogSvg).toContain('Gamer Slashes');
      expect(spaceSvg).toContain('Starfield');
    });

    it('generateLogoSvg : produit un logo SVG carré 256x256 avec la lettre initiale', () => {
      const recipe = makeRecipe({ branding: { ...makeRecipe().branding, osName: 'Vortex' } });
      const svg = generateLogoSvg(recipe);
      expect(svg).toContain('viewBox="0 0 256 256"');
      expect(svg).toContain('>V<');
    });
  });

  describe('Configurations Système & Fichiers Réels', () => {
    it('generateOsReleaseCmd : génère /etc/os-release, /etc/issue et installe le logo pixmaps', () => {
      const recipe = makeRecipe();
      const cmd = generateOsReleaseCmd(recipe);
      expect(cmd).toContain("cat > /etc/os-release << 'OSREL_EOF'");
      expect(cmd).toContain('NAME="SteamMachineOS"');
      expect(cmd).toContain('PRETTY_NAME="SteamMachineOS Console Edition"');
      expect(cmd).toContain('ID=steammachineos');
      expect(cmd).toContain('LOGO=steammachineos');
      expect(cmd).toContain('/etc/issue');
      expect(cmd).toContain('/usr/share/pixmaps/steammachineos.svg');
    });

    it('generateOsReleaseCmd : désactivation propre si enableCustomOsRelease = false', () => {
      const recipe = makeRecipe({ branding: { ...makeRecipe().branding, enableCustomOsRelease: false } });
      expect(generateOsReleaseCmd(recipe)).toContain('desactive');
      expect(generateOsReleaseCmd(recipe)).not.toContain('/etc/os-release');
    });

    it('generateWallpaperSetupCmd : configure les dossiers et schémas KDE, GNOME, XFCE et SDDM', () => {
      const recipe = makeRecipe();
      const cmd = generateWallpaperSetupCmd(recipe);
      expect(cmd).toContain('/usr/share/backgrounds/steammachineos-wallpaper.svg');
      expect(cmd).toContain('/etc/dconf/profile/user');
      expect(cmd).toContain('/etc/dconf/db/local.d/01-background');
      expect(cmd).toContain("picture-uri='file:///usr/share/backgrounds/steammachineos-wallpaper.png'");
      expect(cmd).toContain('/usr/share/wallpapers/Next');
      expect(cmd).toContain('/usr/share/wallpapers/Altai');
      expect(cmd).not.toContain('${WALLPAPER_TARGET}');
      expect(cmd).toContain('defaultWallpaperTheme=steammachineos');
      expect(cmd).toContain('/etc/xdg/xfce4/xfconf/xfce-perchannel-xml/xfce4-desktop.xml');
      expect(cmd).toContain('/usr/share/sddm/themes/breeze/components/artwork');
      expect(cmd).toContain('/etc/lightdm/lightdm-gtk-greeter.conf');
    });

    it('generateWallpaperSetupCmd : utilise curl en priorité si une customWallpaperUrl est fournie', () => {
      const recipe = makeRecipe({
        branding: {
          ...makeRecipe().branding,
          customWallpaperUrl: 'https://images.unsplash.com/photo-custom.png',
        },
      });
      const cmd = generateWallpaperSetupCmd(recipe);
      expect(cmd).toContain('curl -fsSL --retry 3 -o "/usr/share/backgrounds/steammachineos-wallpaper.png"');
      expect(cmd).toContain('https://images.unsplash.com/photo-custom.png');
    });

    it('generateGlobalThemeCmd : configure AccentColor et Dark Theme sur KDE kdeglobals et GTK', () => {
      const recipe = makeRecipe();
      const cmd = generateGlobalThemeCmd(recipe);
      expect(cmd).toContain('/etc/xdg/kdeglobals');
      expect(cmd).toContain('AccentColor=255,0,60');
      expect(cmd).toContain('LastUsedCustomAccentColor=255,0,60');
      expect(cmd).toContain('accentColorFromWallpaper=false');
      expect(cmd).toContain('ColorScheme=BreezeDark');
      expect(cmd).toContain('/etc/gtk-3.0/settings.ini');
      expect(cmd).toContain('/etc/gtk-4.0/settings.ini');
      expect(cmd).toContain('gtk-application-prefer-dark-theme = 1');
      expect(cmd).toContain('/etc/dconf/db/local.d/02-theme');
      expect(cmd).toContain('color-scheme=\'prefer-dark\'');
    });

    it('generateFastfetchMotdCmd : configure /etc/motd, fastfetch config.jsonc et le script profile.d', () => {
      const recipe = makeRecipe();
      const cmd = generateFastfetchMotdCmd(recipe);
      expect(cmd).toContain('/etc/motd');
      expect(cmd).toContain('/etc/fastfetch/config.jsonc');
      expect(cmd).toContain('"title": "#ff003c"');
      expect(cmd).toContain('/etc/profile.d/00-fastfetch-welcome.sh');
      expect(cmd).toContain('fastfetch');
    });

    it('generatePlymouthCmd : configure le thème sélectionné avec plymouth-set-default-theme', () => {
      const recipe = makeRecipe({ branding: { ...makeRecipe().branding, bootSplashTheme: 'bgrt' } });
      const cmd = generatePlymouthCmd(recipe);
      expect(cmd).toContain('plymouth-set-default-theme -R "bgrt"');
    });

    it('generateGrubThemeCmd : génère le theme.txt GRUB 2 avec la couleur d’accentuation et l’arrière-plan', () => {
      const recipe = makeRecipe({ branding: { ...makeRecipe().branding, enableGrubTheme: true } });
      const cmd = generateGrubThemeCmd(recipe);
      expect(cmd).toContain('/boot/grub/themes/steammachineos/theme.txt');
      expect(cmd).toContain('title-color: "#ff003c"');
      expect(cmd).toContain('desktop-image: "background.png"');
      expect(cmd).toContain('boot_menu');
      expect(cmd).toContain('progress_bar');
      expect(cmd).toContain('GRUB_THEME="/boot/grub/themes/steammachineos/theme.txt"');
      expect(cmd).toContain('GRUB_BACKGROUND=');
    });

    it('generateBrandingChrootCommands : regroupe toutes les briques de personnalisation en un seul appel', () => {
      const recipe = makeRecipe();
      const fullCmd = generateBrandingChrootCommands(recipe);
      expect(fullCmd).toContain('PERSONNALISATION INTEGRALE');
      expect(fullCmd).toContain('/etc/os-release');
      expect(fullCmd).toContain('/usr/share/backgrounds');
      expect(fullCmd).toContain('/etc/xdg/kdeglobals');
      expect(fullCmd).toContain('/usr/local/bin/osforge-apply-theme.sh');
      expect(fullCmd).toContain('/etc/xdg/autostart/osforge-branding.desktop');
      expect(fullCmd).toContain('/etc/fastfetch');
      expect(fullCmd).toContain('plymouth-set-default-theme');
      expect(fullCmd).toContain('/boot/grub/themes');
    });

    it('generateWallpaperSvg : génère les thèmes SVG (nordic_frost, sunset_synthwave, emerald_forest, tokyo_neon, carbon_dark, aurora_borealis)', () => {
      const rFrost = makeRecipe({ branding: { ...makeRecipe().branding, wallpaperPreset: 'nordic_frost' } });
      expect(generateWallpaperSvg(rFrost)).toContain('NORDIC FROST');

      const rSynth = makeRecipe({ branding: { ...makeRecipe().branding, wallpaperPreset: 'sunset_synthwave' } });
      expect(generateWallpaperSvg(rSynth)).toContain('SYNTHWAVE');

      const rEmerald = makeRecipe({ branding: { ...makeRecipe().branding, wallpaperPreset: 'emerald_forest' } });
      expect(generateWallpaperSvg(rEmerald)).toContain('EMERALD BIO-CORE');

      const rTokyo = makeRecipe({ branding: { ...makeRecipe().branding, wallpaperPreset: 'tokyo_neon' } });
      expect(generateWallpaperSvg(rTokyo)).toContain('TOKYO NIGHT');

      const rCarbon = makeRecipe({ branding: { ...makeRecipe().branding, wallpaperPreset: 'carbon_dark' } });
      expect(generateWallpaperSvg(rCarbon)).toContain('carbonGrid');
      expect(generateWallpaperSvg(rCarbon)).toContain('PRO WORKSTATION');

      const rAurora = makeRecipe({ branding: { ...makeRecipe().branding, wallpaperPreset: 'aurora_borealis' } });
      expect(generateWallpaperSvg(rAurora)).toContain('AURORA BOREALIS');
    });

    it('generatePlymouthCmd : génère un thème sur-mesure complet avec script Plymouth et logo pour osforge-custom', () => {
      const recipe = makeRecipe({
        branding: {
          ...makeRecipe().branding,
          osName: 'CustomOS',
          editionName: 'Pro Edition',
          accentColor: '#10b981',
          bootSplashTheme: 'osforge-custom',
        },
      });
      const cmd = generatePlymouthCmd(recipe);
      expect(cmd).toContain('/usr/share/plymouth/themes/customos/customos.plymouth');
      expect(cmd).toContain('/usr/share/plymouth/themes/customos/customos.script');
      expect(cmd).toContain('ModuleName=script');
      expect(cmd).toContain('progress_bar.width');
      expect(cmd).toContain('Plymouth.SetBootProgressFunction');
      expect(cmd).toContain('plymouth-set-default-theme -R "customos"');
    });

    it('generatePlymouthCmd : prend en charge le thème solar et tribar', () => {
      const rSolar = makeRecipe({ branding: { ...makeRecipe().branding, bootSplashTheme: 'solar' } });
      expect(generatePlymouthCmd(rSolar)).toContain('plymouth-set-default-theme -R "solar"');

      const rTribar = makeRecipe({ branding: { ...makeRecipe().branding, bootSplashTheme: 'tribar' } });
      expect(generatePlymouthCmd(rTribar)).toContain('plymouth-set-default-theme -R "tribar"');
    });

    it('generateGlobalThemeCmd : configure les icônes, curseurs, polices et disposition des boutons à gauche', () => {
      const recipe = makeRecipe({
        branding: {
          ...makeRecipe().branding,
          iconTheme: 'papirus-dark',
          cursorTheme: 'bibata-modern',
          fontFamily: 'inter',
          monoFontFamily: 'jetbrains-mono',
          windowButtonsPosition: 'left',
        },
      });
      const cmd = generateGlobalThemeCmd(recipe);
      expect(cmd).toContain('gtk-icon-theme-name = Papirus-Dark');
      expect(cmd).toContain('gtk-cursor-theme-name = Bibata-Modern-Classic');
      expect(cmd).toContain('gtk-font-name = Inter 10');
      expect(cmd).toContain('/usr/share/icons/default/index.theme');
      expect(cmd).toContain('ButtonsOnLeft=XAI');
      expect(cmd).toContain("button-layout='close,minimize,maximize:'");
      expect(cmd).toContain('value="CHM|"');
    });

    it('generateFontconfigCmd : génère le fichier local.conf avec les polices UI et Monospace', () => {
      const recipe = makeRecipe({
        branding: {
          ...makeRecipe().branding,
          fontFamily: 'inter',
          monoFontFamily: 'jetbrains-mono',
        },
      });
      const cmd = generateFontconfigCmd(recipe);
      expect(cmd).toContain('/etc/fonts/local.conf');
      expect(cmd).toContain('<family>Inter</family>');
      expect(cmd).toContain('<family>JetBrains Mono</family>');
      expect(cmd).toContain('fc-cache');
    });

    it('generateTerminalThemeCmd : génère les palettes pour Kitty, Alacritty et XFCE Terminal', () => {
      const recipe = makeRecipe({
        branding: {
          ...makeRecipe().branding,
          terminalColorScheme: 'tokyo-night',
          monoFontFamily: 'jetbrains-mono',
        },
      });
      const cmd = generateTerminalThemeCmd(recipe);
      expect(cmd).toContain('/etc/xdg/kitty/kitty.conf');
      expect(cmd).toContain('background       #1a1b26');
      expect(cmd).toContain('/etc/xdg/alacritty/alacritty.toml');
      expect(cmd).toContain('background = "#1a1b26"');
      expect(cmd).toContain('/etc/xdg/xfce4/terminal/terminalrc');
      expect(cmd).toContain('ColorBackground=#1a1b26');
    });

    it('generateProAliasesCmd : génère les raccourcis shell pro dans /etc/profile.d/', () => {
      const recipe = makeRecipe({ distro: 'debian' });
      const cmd = generateProAliasesCmd(recipe);
      expect(cmd).toContain('/etc/profile.d/99-osforge-aliases.sh');
      expect(cmd).toContain("alias ll='ls -la");
      expect(cmd).toContain("alias ports='netstat");
      expect(cmd).toContain("alias myip='curl");
      expect(cmd).toContain("alias sysupdate='sudo apt update && apt upgrade -y'");
    });

    it('generateStartupSoundCmd : crée le script et l’entrée autostart desktop si activé', () => {
      const recipe = makeRecipe({
        branding: {
          ...makeRecipe().branding,
          enableStartupSound: true,
        },
      });
      const cmd = generateStartupSoundCmd(recipe);
      expect(cmd).toContain('/usr/local/bin/osforge-startup-sound.sh');
      expect(cmd).toContain('/etc/xdg/autostart/osforge-startup-sound.desktop');
      expect(cmd).toContain('service-login.oga');
    });
  });

  describe('Résolution des Paquets Système de Branding & Personnalisation', () => {
    it('resolvePackageList inclut plymouth, fastfetch, icônes et polices sur mesure', () => {
      const recipe = makeRecipe({
        branding: {
          ...makeRecipe().branding,
          iconTheme: 'papirus-dark',
          cursorTheme: 'bibata-modern',
          fontFamily: 'inter',
          monoFontFamily: 'jetbrains-mono',
        },
      });
      const pkgs = resolvePackageList(recipe);
      expect(pkgs).toContain('plymouth');
      expect(pkgs).toContain('fastfetch');
      expect(pkgs).toContain('papirus-icon-theme');
      expect(pkgs).toContain('bibata-cursor-theme');
      expect(pkgs).toContain('fonts-inter');
      expect(pkgs).toContain('fonts-jetbrains-mono');
    });

    it('resolvePackageList résout correctement les paquets sous Arch Linux', () => {
      const recipe = makeRecipe({
        distro: 'arch',
        branding: {
          ...makeRecipe().branding,
          iconTheme: 'breeze',
          cursorTheme: 'breeze',
          fontFamily: 'inter',
          monoFontFamily: 'jetbrains-mono',
        },
      });
      const pkgs = resolvePackageList(recipe);
      expect(pkgs).toContain('breeze-icons');
      expect(pkgs).toContain('xcursor-breeze');
      expect(pkgs).toContain('inter-font');
      expect(pkgs).toContain('ttf-jetbrains-mono');
    });

    it('resolvePackageList inclut librsvg2-common et dconf-cli sur Debian pour les bureaux graphiques', () => {
      const debianRecipe = makeRecipe({ distro: 'debian', desktop: 'kde' });
      const pkgs = resolvePackageList(debianRecipe);
      expect(pkgs).toContain('librsvg2-common');
      expect(pkgs).toContain('dconf-cli');
    });

    it('resolvePackageList n inclut pas librsvg2-common si desktop="none"', () => {
      const headlessRecipe = makeRecipe({ distro: 'debian', desktop: 'none' });
      const pkgs = resolvePackageList(headlessRecipe);
      expect(pkgs).not.toContain('librsvg2-common');
      expect(pkgs).not.toContain('dconf-cli');
    });
  });

  describe('Autostart Universel de Session Graphique (Application Garantie)', () => {
    it('generateAutostartThemeCmd : produit le script osforge-apply-theme.sh et le fichier .desktop', () => {
      const recipe = makeRecipe({
        branding: {
          ...makeRecipe().branding,
          osName: 'MadOS',
          accentColor: '#ff003c',
          iconTheme: 'papirus-dark',
          cursorTheme: 'bibata-modern',
        },
      });
      const cmd = generateAutostartThemeCmd(recipe);
      expect(cmd).toContain('/usr/local/bin/osforge-apply-theme.sh');
      expect(cmd).toContain('/etc/xdg/autostart/osforge-branding.desktop');
      expect(cmd).toContain('plasma-apply-wallpaperimage');
      expect(cmd).toContain('plasma-apply-colorscheme BreezeDark');
      expect(cmd).toContain('plasma-apply-cursortheme "Bibata-Modern-Classic"');
      expect(cmd).toContain('gsettings set org.gnome.desktop.interface color-scheme \'prefer-dark\'');
      expect(cmd).toContain('gsettings set org.gnome.desktop.interface icon-theme \'Papirus-Dark\'');
      expect(cmd).toContain('xfconf-query -c xfce4-desktop');
      expect(cmd).toContain('X-KDE-autostart-phase=2');
    });

    it('generateAutostartThemeCmd : déploie le lanceur autostart de terminal de bienvenue Fastfetch au premier boot', () => {
      const recipe = makeRecipe({
        branding: {
          ...makeRecipe().branding,
          osName: 'MadOS ROG Edition',
        },
      });
      const cmd = generateAutostartThemeCmd(recipe);
      expect(cmd).toContain('/etc/xdg/autostart/osforge-welcome.desktop');
      expect(cmd).toContain('konsole --hold -e fastfetch');
      expect(cmd).toContain('utilities-terminal');
      expect(cmd).toContain('/etc/skel/.config/autostart/osforge-welcome.desktop');
    });
  });

  describe('Neutralisation des Thèmes et Logos de Secours Ubuntu dans Plymouth', () => {
    it('generatePlymouthCmd : écrase les watermarks Ubuntu et configure update-alternatives pour le splash custom', () => {
      const recipe = makeRecipe({
        branding: {
          ...makeRecipe().branding,
          osName: 'MadOS',
          bootSplashTheme: 'osforge-custom',
          accentColor: '#ff003c',
        },
      });
      const cmd = generatePlymouthCmd(recipe);
      expect(cmd).toContain('/usr/share/plymouth/ubuntu-logo.png');
      expect(cmd).toContain('update-alternatives --install /etc/alternatives/default.plymouth');
      expect(cmd).toContain('update-alternatives --set default.plymouth');
      expect(cmd).toContain('/etc/plymouth/plymouthd.conf');
      expect(cmd).toContain('progress_bar.raw_image = Image("progress_bar.png")');
      expect(cmd).not.toContain('Image.Constant');
    });

    it('generatePlymouthCmd : écrase aussi les logos Ubuntu sur les thèmes standards (spinner, bgrt, etc.)', () => {
      const recipe = makeRecipe({
        branding: {
          ...makeRecipe().branding,
          osName: 'MadOS',
          bootSplashTheme: 'bgrt',
        },
      });
      const cmd = generatePlymouthCmd(recipe);
      expect(cmd).toContain('/usr/share/plymouth/ubuntu-logo.png');
      expect(cmd).toContain('/etc/plymouth/plymouthd.conf');
      expect(cmd).toContain('update-alternatives');
    });
  });

  describe('Applications de Bureau par Défaut (XDG MIME & Alternatives)', () => {
    it('generateDefaultApplicationsCmd : associe Google Chrome par défaut pour HTTP/HTTPS et alternatives', () => {
      const recipe = makeRecipe({
        defaultApps: {
          browser: 'google_chrome',
          terminal: 'kitty',
          textEditor: 'vscodium',
        },
      });
      const cmd = generateDefaultApplicationsCmd(recipe);
      expect(cmd).toContain('/etc/xdg/mimeapps.list');
      expect(cmd).toContain('text/html=google-chrome.desktop');
      expect(cmd).toContain('x-scheme-handler/https=google-chrome.desktop');
      expect(cmd).toContain('text/plain=codium.desktop');
      expect(cmd).toContain('update-alternatives --set x-www-browser "/usr/bin/google-chrome-stable"');
      expect(cmd).toContain('update-alternatives --set x-terminal-emulator /usr/bin/kitty');
      expect(cmd).toContain('BROWSER=/usr/bin/google-chrome-stable');
    });

    it('generateDefaultApplicationsCmd : supporte Chromium, Brave et LibreWolf', () => {
      const rChromium = makeRecipe({ defaultApps: { browser: 'chromium' } });
      expect(generateDefaultApplicationsCmd(rChromium)).toContain('text/html=chromium.desktop');

      const rBrave = makeRecipe({ defaultApps: { browser: 'brave' } });
      expect(generateDefaultApplicationsCmd(rBrave)).toContain('text/html=brave-browser.desktop');

      const rLibreWolf = makeRecipe({ defaultApps: { browser: 'librewolf' } });
      expect(generateDefaultApplicationsCmd(rLibreWolf)).toContain('text/html=librewolf.desktop');
    });
  });

  describe('Robustesse XML & Intégration Fond d\'Écran Cinnamon / GNOME / Desktop-Base', () => {
    it('escapeXml : convertit correctement &, <, >, " et \'', () => {
      expect(escapeXml('Gaming & Performance <Pro> "Edition" \'Deluxe\'')).toBe('Gaming &amp; Performance &lt;Pro&gt; &quot;Edition&quot; &apos;Deluxe&apos;');
    });

    it('generateWallpaperSvg : échappe systématiquement les caractères spéciaux pour éviter le crash XML de rsvg-convert', () => {
      const recipe = makeRecipe({
        branding: {
          ...makeRecipe().branding,
          osName: 'MadOS ROG <Edition>',
          editionName: 'Gaming & Performance Edition',
          wallpaperPreset: 'gaming_rog',
        },
      });
      const svg = generateWallpaperSvg(recipe);
      expect(svg).toContain('GAMING &amp; PERFORMANCE EDITION // GAMING EDITION');
      expect(svg).toContain('MADOS ROG &lt;EDITION&gt;');
      expect(svg).not.toContain('GAMING & PERFORMANCE');
    });

    it('generateWallpaperSetupCmd : génère les propriétés XML Cinnamon, GNOME et le dossier desktop-base', () => {
      const recipe = makeRecipe({
        branding: {
          ...makeRecipe().branding,
          osName: 'MadOS ROG Edition',
          editionName: 'Gaming & Performance Edition',
        },
      });
      const cmd = generateWallpaperSetupCmd(recipe);
      expect(cmd).toContain('/usr/share/cinnamon-background-properties/mados-rog-edition.xml');
      expect(cmd).toContain('/usr/share/gnome-background-properties/mados-rog-edition.xml');
      expect(cmd).toContain('/usr/share/images/desktop-base/default');
      expect(cmd).toContain('/usr/share/images/desktop-base/desktop-background');
      expect(cmd).toContain('rsvg-convert -w 1920 -h 1080 "/usr/share/backgrounds/mados-rog-edition-wallpaper.svg" -o "/usr/share/backgrounds/mados-rog-edition-wallpaper.png"');
    });
  });
});

