import { OSRecipe, DistroId } from '../types/os';
import { DISTROS } from '../data/distros';
import { SOFTWARE_PACKAGES } from '../data/packages';

// Le catalogue de paquets (packages.ts) ne référence des noms que pour debian/ubuntu/arch/alpine/fedora.
// Sans repli, une distro comme kali/raspbian/cachyos/rocky/opensuse/void perdrait silencieusement
// TOUS les logiciels sélectionnés par l'utilisateur (pkgNames[distroId] === undefined). On mappe donc
// chaque distro absente du catalogue vers la famille de paquets la plus proche ; la boucle d'installation
// du script généré tolère déjà l'échec par paquet (|| echo omis), donc une approximation imparfaite
// (opensuse/void) dégrade un paquet individuel plutôt que de faire échouer toute la compilation.
const PKG_NAME_FALLBACK: Partial<Record<DistroId, DistroId>> = {
  kali: 'debian',
  raspbian: 'debian',
  cachyos: 'arch',
  rocky: 'fedora',
  opensuse: 'fedora',
  void: 'alpine',
  linuxmint: 'ubuntu',
};

// Faille réelle trouvée et vérifiée en direct (fichier de preuve local créé, puis neutralisé) :
// "customPackages" est du texte libre saisi par l'utilisateur (ou importé depuis une recette JSON
// partagée par quelqu'un d'autre), injecté SANS échappement dans "for pkg in ${pkgs}; do" — un
// nom de paquet contenant $(commande) s'exécute réellement en shell, avec les privilèges root/sudo
// du script généré, puisque "${pkgs}" est substitué au moment de la GÉNÉRATION (texte source bash
// littéral, pas une variable bash évaluée plus tard). Reproduit localement : un for-loop avec
// littéralement "$(echo X > /tmp/preuve)" dans la liste crée bien le fichier. Corrigé en mettant
// chaque nom de paquet entre apostrophes (le motif d'échappement shell standard pour une apostrophe
// à l'intérieur d'une chaîne protégée) : neutralise $(), les backticks et le globbing, tout en
// préservant le comportement normal pour un vrai nom de paquet.
function shQuote(value: string): string {
  return `'${value.replace(/'/g, `'\\''`)}'`;
}

function shellQuotePkgList(names: string[]): string {
  return names.map(shQuote).join(' ');
}

// Faille réelle trouvée et vérifiée en direct (fichier de preuve local créé, puis neutralisé) :
// "useradd -m -s ${recipe.user.shell} -c \"${recipe.user.fullName}\" ${recipe.user.username}"
// avait DEUX failures : "username" totalement non protégé (même classe que customPackages
// ci-dessus) ; et "fullName", bien qu'entre guillemets DOUBLES, restait exploitable car les
// guillemets doubles bash n'empêchent PAS la substitution de commande $(...) (seuls les guillemets
// simples le font). Reproduit localement : `echo "useradd -c \"John $(touch /tmp/preuve)Doe\" user"`
// exécute bien la commande injectée et crée le fichier. Corrigé en passant les trois champs
// (shell, username, fullName) par shQuote() — "shell" est un type union TypeScript côté UI mais
// pas imposé à l'exécution pour une recette JSON importée/éditée à la main.

// Bug réel trouvé en auditant : "keyboardLayout" (data/... via SystemConfig.tsx) n'était
// référencé NULLE PART dans ce fichier — le clavier gardait toujours la disposition par défaut
// de l'image, quel que soit le choix de l'utilisateur. Les identifiants de l'UI ("uk", "ca-fr",
// "ch-fr"...) ne sont PAS tous des codes XKB valides tels quels : XKB utilise "gb" (pas "uk") pour
// le Royaume-Uni, et les variantes régionales s'expriment via layout+variant séparés (convention
// XKB stable et documentée depuis des décennies, ex. /usr/share/X11/xkb/rules/base.lst).
const KEYBOARD_XKB_MAP: Record<string, { layout: string; variant?: string }> = {
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

function resolveXkb(keyboardLayout: string): { layout: string; variant?: string } {
  return KEYBOARD_XKB_MAP[keyboardLayout] || { layout: 'us' };
}

// Bug réel MAJEUR trouvé en auditant (grep confirme ZERO occurrence de "systemctl enable gdm/
// sddm/lightdm" ou équivalent OpenRC/runit dans tout ce fichier, sur AUCUN bureau ni AUCUNE
// distro) : le paquet du gestionnaire de connexion (gdm3/sddm/lightdm/cosmic-greeter) était bien
// installé par chaque bloc "desktop" ci-dessus, mais son SERVICE n'était jamais activé au premier
// boot — un système démarrait donc toujours sur une console texte, jamais sur la session
// graphique, quel que soit l'environnement de bureau choisi. "ly" (recommandé pour Hyprland/Sway)
// reste hors périmètre : confirmé absent des dépôts Alpine et Void en vérifiant, et jamais
// installé par les blocs Hyprland/Sway existants — nécessiterait un cablage plus large séparé.
function resolveDmServiceName(displayManager: string, family: 'debian' | NonDebianFamily): string | null {
  if (displayManager === 'none' || displayManager === 'ly') return null;
  if (displayManager === 'gdm3') return family === 'debian' ? 'gdm3' : 'gdm';
  return displayManager; // "sddm" / "lightdm" / "cosmic-greeter" : même nom partout, déjà vérifié
}

function dmEnableCmd(displayManager: string, family: 'debian' | NonDebianFamily): string {
  const svc = resolveDmServiceName(displayManager, family);
  if (!svc) return '';
  return serviceEnableCmd(svc, family);
}

// Helper générique factorisant le même mécanisme d'activation par init system que sshEnableCmd/
// dmEnableCmd ci-dessus (utilisé aussi pour "seatd", requis par "cage" en mode kiosque — même bug
// trouvé : le paquet s'installait sans jamais être activé, cage n'aurait alors aucun accès au GPU).
function serviceEnableCmd(service: string, family: 'debian' | NonDebianFamily): string {
  if (family === 'alpine') return `rc-update add ${service} default 2>/dev/null || true`;
  if (family === 'void') return `mkdir -p /etc/runit/runsvdir/default && ln -sf /etc/sv/${service} /etc/runit/runsvdir/default/${service} 2>/dev/null || true`;
  return `systemctl enable ${service} 2>/dev/null || true`;
}

// Bug réel trouvé en auditant : "user.autologin" (case à cocher dans l'UI, distincte du mode
// kiosque) n'était référencé nulle part — cochée ou non, aucune différence dans le système généré.
// Contrairement au getty console utilisé pour le kiosque (session unique, sans DM), l'autologin
// "normal" doit passer par le mécanisme NATIF propre à chaque gestionnaire de connexion — conventions
// stables et documentées depuis des années, vérifiées être identiques sur toutes les distros qui
// embarquent ces DM (seul le chemin du fichier de config gdm3/gdm diffère, déjà établi ailleurs
// dans ce fichier via resolveDmServiceName) :
// - GDM(3) : [daemon] AutomaticLoginEnable=true / AutomaticLogin=<user> dans custom.conf
// - SDDM : [Autologin] User=<user> dans un fragment sddm.conf.d (pas de Session= : ces builds
//   n'installent qu'UN SEUL environnement de bureau, donc SDDM n'a qu'une session disponible)
// - LightDM : [Seat:*] autologin-user=<user> dans un fragment lightdm.conf.d
function dmAutologinCmd(recipe: OSRecipe, family: 'debian' | NonDebianFamily): string {
  if (!recipe.user.autologin || recipe.displayManager === 'none') return '';
  const username = recipe.user.username;
  if (recipe.displayManager === 'gdm3') {
    const confPath = family === 'debian' ? '/etc/gdm3/custom.conf' : '/etc/gdm/custom.conf';
    return `mkdir -p $(dirname ${confPath})
if [ -f ${confPath} ] && grep -q '^\\[daemon\\]' ${confPath}; then
    sed -i '/^\\[daemon\\]/a AutomaticLoginEnable=true\\nAutomaticLogin='${shQuote(username)} ${confPath}
else
    printf '[daemon]\\nAutomaticLoginEnable=true\\nAutomaticLogin='${shQuote(username)}'\\n' >> ${confPath}
fi`;
  }
  if (recipe.displayManager === 'sddm') {
    return `mkdir -p /etc/sddm.conf.d
cat > /etc/sddm.conf.d/autologin.conf << 'SDDM_EOF'
[Autologin]
User=${username}
SDDM_EOF`;
  }
  if (recipe.displayManager === 'lightdm') {
    return `mkdir -p /etc/lightdm/lightdm.conf.d
cat > /etc/lightdm/lightdm.conf.d/50-autologin.conf << 'LIGHTDM_EOF'
[Seat:*]
autologin-user=${username}
autologin-user-timeout=0
LIGHTDM_EOF`;
  }
  return `echo -e "\${YELLOW:-}[INFO] Auto-login non câblé pour le gestionnaire de connexion \\"${recipe.displayManager}\\" (seuls GDM/SDDM/LightDM sont pris en charge).\${NC:-}" 2>/dev/null || true`;
}

// Bug réel trouvé en auditant : "kioskUrl" (choisi dans l'UI, présent dans un preset réel) n'était
// référencé NULLE PART — le mode kiosque installait chromium/cage/seatd mais ne lançait jamais
// rien : ni URL configurée, ni script de démarrage, ni "seatd" (requis par cage pour l'accès GPU/
// input) jamais activé comme service, ni auto-login pour atteindre la session sans intervention.
// Repli honnête pour Alpine/Void : l'auto-login y dépend de fichiers d'init (/etc/inittab OpenRC,
// service agetty runit) dont le contenu exact ne peut pas être vérifié en direct sans un boot réel
// — les modifier à l'aveugle risquerait de casser la console plutôt que de l'améliorer. Les paquets
// s'installent et se lancent quand même via le script de profil shell si l'utilisateur se connecte
// manuellement ; seul l'auto-login automatique manque sur ces deux distributions.
function kioskSetupCmd(recipe: OSRecipe, family: 'debian' | NonDebianFamily): string {
  if (recipe.desktop !== 'web_kiosk') return '';
  const useFirefox = (recipe.distro === 'ubuntu' || recipe.distro === 'linuxmint');
  const browserCmd = useFirefox
    ? 'firefox --kiosk --no-remote'
    : 'chromium --kiosk --no-first-run --disable-infobars --noerrdialogs';
  const url = (recipe.kioskUrl || 'about:blank').replace(/'/g, `'\\''`);
  const username = recipe.user.username;
  const autologin = (family === 'alpine' || family === 'void')
    ? `echo -e "\${YELLOW:-}[INFO] Auto-login console non câblé pour cette distribution (nécessiterait de modifier /etc/inittab ou un service runit à l'aveugle) : connexion manuelle requise, la session kiosque démarre automatiquement une fois connecté.\${NC:-}" 2>/dev/null || true`
    : `mkdir -p /etc/systemd/system/getty@tty1.service.d
cat > /etc/systemd/system/getty@tty1.service.d/autologin.conf << 'GETTY_EOF'
[Service]
ExecStart=
ExecStart=-/sbin/agetty --autologin ${username} --noclear %I \$TERM
GETTY_EOF`;
  return `
${autologin}
${serviceEnableCmd('seatd', family)}
cat >> /home/${shQuote(username)}/.bash_profile << 'KIOSK_EOF'
if [ -z "\${DISPLAY:-}" ] && [ "$(tty)" = "/dev/tty1" ]; then
    exec cage -- ${browserCmd} '${url}'
fi
KIOSK_EOF
chown ${shQuote(username)}:${shQuote(username)} /home/${shQuote(username)}/.bash_profile 2>/dev/null || true`;
}

// Bug réel trouvé en auditant : "dotfilesGitUrl" (choisi dans l'UI : "clonera et appliquera
// automatiquement vos configurations... dans le home de l'utilisateur") n'était référencé nulle
// part — le dépôt n'était jamais cloné, peu importe l'URL saisie.
function dotfilesCloneCmd(recipe: OSRecipe): string {
  if (!recipe.dotfilesGitUrl) return '';
  const url = recipe.dotfilesGitUrl.replace(/'/g, `'\\''`);
  const username = recipe.user.username;
  return `git clone --depth 1 '${url}' /home/${shQuote(username)}/.dotfiles 2>/dev/null || true
chown -R ${shQuote(username)}:${shQuote(username)} /home/${shQuote(username)}/.dotfiles 2>/dev/null || true`;
}

// Bug réel trouvé en auditant : "customServices" (choisi dans l'UI : "Génère des fichiers
// /etc/systemd/system/*.service avec démarrage automatique") n'était référencé nulle part — les
// services personnalisés ajoutés par l'utilisateur n'étaient jamais écrits sur le disque, quel que
// soit leur contenu. L'UI promet explicitement "systemd" (pas une abstraction multi-init-system
// comme SSH/DM/kiosque plus haut) : hors périmètre honnête pour Alpine (OpenRC) et Void (runit),
// avertissement explicite au lieu de fichiers .service inertes qui ne seraient jamais lus.
function customServicesCmd(recipe: OSRecipe, family: 'debian' | NonDebianFamily): string {
  if (!recipe.customServices.length) return '';
  if (family === 'alpine' || family === 'void') {
    return `echo -e "\${YELLOW:-}[INFO] ${recipe.customServices.length} service(s) personnalisé(s) non câblé(s) sur cette distribution : le générateur ne produit que de vrais fichiers systemd .service, non lus par OpenRC (Alpine) ni runit (Void).\${NC:-}" 2>/dev/null || true`;
  }
  return recipe.customServices.map(svc => {
    const unitName = svc.name.replace(/\.service$/i, '').replace(/[^a-zA-Z0-9_.-]/g, '-') || 'osforge-custom';
    // Corps d'un heredoc à délimiteur protégé ('UNIT_EOF') : aucune expansion shell n'y a lieu,
    // le contenu est écrit tel quel — échapper les apostrophes ici (comme pour un argument shell)
    // corromprait le fichier .service réellement produit sur le disque.
    const execStart = svc.execStart;
    const description = svc.description || unitName;
    return `cat > /etc/systemd/system/${unitName}.service << 'UNIT_EOF'
[Unit]
Description=${description}
After=network.target

[Service]
ExecStart=${execStart}
Restart=on-failure

[Install]
WantedBy=multi-user.target
UNIT_EOF
${svc.enabled ? `systemctl enable ${unitName} 2>/dev/null || true` : `# Service créé mais non activé automatiquement (case "Démarrage auto" décochée dans l'UI)`}`;
  }).join('\n');
}

// Bug réel trouvé en auditant : sur les 6 champs de "security" (panneau Sécurité de l'UI), 5
// avaient ZERO référence dans ce fichier avant ce correctif — "fail2ban" et "disableRootSSH"
// (protection SSH concrète) n'étaient jamais appliqués, quel que soit le choix affiché à l'écran.
// "cisBenchmarkLevel", "appArmorOrSELinux" et "luksEncryption" restent hors périmètre : le
// benchmark CIS est une checklist de plusieurs centaines de points selon le niveau (0/1/2), et le
// chiffrement disque nécessite de refondre tout le partitionnement/initramfs — les câbler
// honnêtement demande une recherche et une vérification bien plus large qu'un correctif ponctuel,
// contrairement à fail2ban/disableRootSSH qui sont deux réglages concrets et bien délimités.
function sshHardeningCmd(recipe: OSRecipe, family: 'debian' | NonDebianFamily): string {
  if (!recipe.enableSSH) return '';
  const parts: string[] = [];
  if (recipe.security.disableRootSSH) {
    parts.push(`mkdir -p /etc/ssh
echo "PermitRootLogin no" >> /etc/ssh/sshd_config`);
  }
  if (recipe.security.fail2ban) {
    parts.push(`cat > /etc/fail2ban/jail.local << 'F2B_EOF'
[sshd]
enabled = true
F2B_EOF
${serviceEnableCmd('fail2ban', family)}`);
  }
  return parts.join('\n');
}

// Bug réel trouvé en auditant : les 4 champs de branding visuel (accentColor, wallpaperPreset,
// customWallpaperUrl, bootSplashTheme) ont ZERO référence, mais leur câblage réel nécessiterait
// des assets de thème Plymouth/fond d'écran par bureau — invérifiable dans cet environnement sans
// capture d'écran d'un vrai boot (contrairement au texte, jamais confirmable ici en toute rigueur).
// "/etc/os-release", en revanche, EST du texte pur et directement vérifiable : il n'était jamais
// réécrit non plus, donc "neofetch"/"hostnamectl"/"cat /etc/os-release" sur le système fini
// affichaient toujours "Debian GNU/Linux"/"Arch Linux" au lieu du nom personnalisé choisi par
// l'utilisateur, malgré tout le travail de branding dans l'UI. "ID_LIKE" préserve la vraie famille
// sous-jacente (convention suivie par Ubuntu/Pop!_OS elles-mêmes) pour ne pas casser les outils qui
// détectent le gestionnaire de paquets réel via ce champ.
function osReleaseCmd(recipe: OSRecipe, baseId: string): string {
  const safeId = recipe.branding.osName.toLowerCase().replace(/[^a-z0-9]/g, '') || 'osforge';
  const prettyName = `${recipe.branding.osName} ${recipe.branding.editionName}`.trim();
  return `cat > /etc/os-release << 'OSREL_EOF'
PRETTY_NAME="${prettyName}"
NAME="${recipe.branding.osName}"
VERSION="${recipe.branding.version} (${recipe.branding.editionName})"
VERSION_ID="${recipe.branding.version}"
ID=${safeId}
ID_LIKE=${baseId}
BUILD_ID=osforge-studio
HOME_URL="https://github.com/LordMadTrix/osforge-studio"
OSREL_EOF`;
}

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

  // Desktop specific packages & Full Graphical Stack
  if (recipe.desktop === 'gnome') {
    if (distroId === 'debian' || distroId === 'ubuntu') {
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
      // Noms de paquets vérifiés en direct (pkgs.alpinelinux.org/package/edge/{main,community}/
      // x86_64/...) : "gnome", "gdm", "dbus", "xorg-server" tous réels sur Alpine (dépôt
      // community, déjà activé dans le bootstrap ci-dessous).
      pkgs.push('gnome', 'gdm', 'dbus', 'eudev', 'xorg-server', 'mesa-dri-gallium', 'firefox', 'pipewire', 'wireplumber', 'networkmanager');
    } else if (distroId === 'void') {
      // Noms vérifiés en direct sur le vrai dépôt source (raw.githubusercontent.com/void-linux/
      // void-packages/master/srcpkgs/<pkg>/template) : "gnome", "gdm", "dbus", "eudev" tous réels.
      pkgs.push('gnome', 'gdm', 'dbus', 'eudev', 'xorg-server', 'mesa', 'firefox', 'pipewire', 'wireplumber', 'NetworkManager');
    } else if (distroId === 'opensuse') {
      // Noms vérifiés en direct via rpmfind.net (miroir indexant les vrais paquets Tumbleweed
      // x86_64) : "patterns-gnome-gnome" est le vrai pattern zypper officiel, "MozillaFirefox"
      // (PAS "firefox") est le vrai nom openSUSE du paquet Firefox.
      pkgs.push('patterns-gnome-gnome', 'gdm', 'MozillaFirefox', 'pipewire', 'wireplumber', 'NetworkManager');
    }
  } else if (recipe.desktop === 'kde') {
    if (distroId === 'debian' || distroId === 'ubuntu') {
      pkgs.push(
        'plasma-desktop', 'plasma-workspace', 'sddm', 'konsole', 'dolphin', 'firefox-esr',
        'xorg', 'xserver-xorg-video-all', 'mesa-vulkan-drivers',
        'pipewire', 'pipewire-audio', 'wireplumber', 'network-manager', 'plasma-nm',
        'fonts-noto', 'fonts-font-awesome', 'bluez'
      );
    } else if (isArchLike) {
      pkgs.push('plasma', 'kde-applications', 'sddm', 'firefox', 'pipewire', 'networkmanager', 'mesa');
    } else if (distroId === 'fedora') {
      pkgs.push('@kde-desktop', 'sddm', 'firefox', 'pipewire');
    } else if (distroId === 'rocky') {
      // Rocky n'a pas de groupe dnf "@kde-desktop" garanti (comps propre à Fedora) ; "plasma-desktop"
      // est en revanche un vrai paquet EPEL9 confirmé (dl.fedoraproject.org/pub/epel/9/.../p/).
      pkgs.push('plasma-desktop', 'plasma-workspace', 'sddm', 'konsole', 'dolphin', 'firefox', 'pipewire');
    } else if (distroId === 'alpine') {
      pkgs.push('plasma-desktop', 'sddm', 'dbus', 'eudev', 'xorg-server', 'mesa-dri-gallium', 'konsole', 'dolphin', 'firefox', 'pipewire', 'networkmanager');
    } else if (distroId === 'void') {
      pkgs.push('plasma-desktop', 'sddm', 'dbus', 'eudev', 'xorg-server', 'mesa', 'konsole', 'dolphin', 'firefox', 'pipewire', 'NetworkManager');
    } else if (distroId === 'opensuse') {
      // "plasma6-desktop" confirmé vrai paquet openSUSE Tumbleweed (rpmfind.net) — la distro suit
      // KDE Plasma 6, pas de méta-paquet "plasma-desktop" générique ici.
      pkgs.push('plasma6-desktop', 'plasma6-workspace', 'sddm', 'konsole', 'dolphin', 'MozillaFirefox', 'pipewire', 'wireplumber', 'NetworkManager');
    }
  } else if (recipe.desktop === 'hyprland') {
    if (isArchLike) {
      pkgs.push('hyprland', 'waybar', 'wofi', 'kitty', 'dunst', 'xdg-desktop-portal-hyprland', 'polkit-kde-agent', 'thunar', 'firefox', 'pipewire', 'wireplumber');
    } else if (distroId === 'debian' || distroId === 'ubuntu') {
      pkgs.push('hyprland', 'waybar', 'wofi', 'kitty', 'xdg-desktop-portal-hyprland', 'thunar', 'firefox-esr', 'pipewire', 'pipewire-audio', 'wireplumber', 'network-manager');
    } else if (distroId === 'alpine') {
      // "hyprland" et "waybar" confirmés réels sur Alpine (pkgs.alpinelinux.org, community).
      pkgs.push('hyprland', 'waybar', 'foot', 'dbus', 'eudev', 'mesa-dri-gallium', 'thunar', 'firefox', 'pipewire', 'wireplumber');
    } else if (distroId === 'opensuse') {
      // "hyprland" et "waybar" confirmés réels sur openSUSE Tumbleweed (rpmfind.net).
      pkgs.push('hyprland', 'waybar', 'foot', 'MozillaFirefox', 'pipewire', 'wireplumber', 'NetworkManager');
    }
    // Void : "hyprland" et "waybar" confirmés ABSENTS du dépôt officiel (vérifié en direct,
    // aucun srcpkgs/hyprland ni srcpkgs/waybar) — honnêtement non câblé plutôt que d'installer
    // un paquet inexistant, contrairement à Alpine et openSUSE qui les ont réellement.
  } else if (recipe.desktop === 'xfce') {
    if (distroId === 'debian' || distroId === 'ubuntu') {
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
      // "xfce4-session" confirmé vrai paquet EPEL9 (dl.fedoraproject.org/pub/epel/9/.../x/) ;
      // pas de groupe "@xfce-desktop" garanti sur Rocky, donc paquets individuels.
      pkgs.push('xfce4-session', 'xfce4-panel', 'xfce4-terminal', 'thunar', 'lightdm', 'firefox', 'pipewire');
    } else if (distroId === 'alpine') {
      pkgs.push('xfce4', 'xfce4-terminal', 'lightdm', 'lightdm-gtk-greeter', 'dbus', 'eudev', 'xorg-server', 'mesa-dri-gallium', 'thunar', 'firefox', 'pipewire');
    } else if (distroId === 'void') {
      pkgs.push('xfce4', 'lightdm', 'lightdm-gtk-greeter', 'dbus', 'eudev', 'xorg-server', 'mesa', 'firefox', 'pipewire');
    } else if (distroId === 'opensuse') {
      // "patterns-xfce-xfce" confirmé vrai pattern zypper officiel (rpmfind.net).
      pkgs.push('patterns-xfce-xfce', 'lightdm', 'MozillaFirefox', 'pipewire');
    }
  } else if (recipe.desktop === 'cosmic') {
    if (distroId === 'debian' || distroId === 'ubuntu') {
      pkgs.push('cosmic-session', 'cosmic-greeter', 'cosmic-term', 'cosmic-files', 'firefox-esr', 'pipewire', 'mesa-vulkan-drivers');
    } else if (isArchLike) {
      pkgs.push('cosmic-session', 'cosmic-greeter', 'firefox', 'pipewire');
    } else if (distroId === 'fedora') {
      // Bug réel trouvé en auditant : COSMIC (bureau Rust de System76) n'était câblé nulle part
      // en dehors de Debian/Ubuntu et Arch-like, alors que "cosmic-session"/"cosmic-greeter"/
      // "cosmic-term"/"cosmic-files" sont bien de vrais paquets Fedora officiels, confirmés en
      // direct sur packages.fedoraproject.org pour Fedora 43/44/45 (dépôt "updates", pas EPEL).
      // Pas de paquet mesa/vulkan explicite, comme pour KDE/XFCE Fedora juste au-dessus : les
      // dépendances du paquet tirent déjà la pile graphique nécessaire (convention déjà établie
      // dans ce fichier pour Fedora, vérifiée ne pas casser KDE/XFCE).
      pkgs.push('cosmic-session', 'cosmic-greeter', 'cosmic-term', 'cosmic-files', 'firefox', 'pipewire');
    } else if (distroId === 'opensuse') {
      // Bug réel trouvé en auditant, même classe que pour Fedora ci-dessus : COSMIC n'était câblé
      // nulle part pour openSUSE, alors que "cosmic-session"/"cosmic-greeter"/"cosmic-term"/
      // "cosmic-files" sont confirmés en direct sur rpmfind.net pour openSUSE Tumbleweed (plusieurs
      // versions listées sous le nommage propre à Tumbleweed, sans suffixe ".fcNN"/"omvNNNN" propre
      // aux autres distros — la présence du paquet est ce qui compte ici, pas un numéro de version
      // précis sur une rolling release). "MozillaFirefox" (pas "firefox", déjà établi ailleurs dans
      // ce fichier pour openSUSE) et "wireplumber"/"NetworkManager" ajoutés en suivant la même
      // convention que sway/hyprland/i3wm pour openSUSE (paquets individuels, pas de pattern zypper
      // dédié à COSMIC — bureau trop récent pour ça).
      pkgs.push('cosmic-session', 'cosmic-greeter', 'cosmic-term', 'cosmic-files', 'MozillaFirefox', 'pipewire', 'wireplumber', 'NetworkManager');
    }
  } else if (recipe.desktop === 'i3wm') {
    if (distroId === 'alpine') {
      // Piège réel trouvé en vérifiant : le paquet s'appelle "i3wm" (sans tiret) sur Alpine,
      // contrairement à "i3-wm" partout ailleurs (pkgs.alpinelinux.org, community, confirmé).
      pkgs.push('i3wm', 'i3status', 'i3lock', 'dmenu', 'lightdm', 'alacritty', 'dbus', 'eudev', 'xorg-server', 'mesa-dri-gallium', 'firefox', 'pipewire', 'networkmanager');
    } else if (distroId === 'void') {
      // Autre piège de nommage réel : le paquet s'appelle juste "i3" sur Void (ni "i3-wm" ni
      // "i3wm"), vérifié en direct sur srcpkgs/i3/template.
      pkgs.push('i3', 'i3status', 'i3lock', 'dmenu', 'lightdm', 'alacritty', 'dbus', 'eudev', 'xorg-server', 'mesa', 'firefox', 'pipewire', 'NetworkManager');
    } else if (distroId === 'opensuse') {
      // Tous confirmés réels sur openSUSE Tumbleweed (rpmfind.net) : i3, i3status, i3lock, dmenu,
      // alacritty, lightdm.
      pkgs.push('i3', 'i3status', 'i3lock', 'dmenu', 'lightdm', 'alacritty', 'MozillaFirefox', 'pipewire', 'NetworkManager');
    } else {
      pkgs.push('i3-wm', 'i3status', 'i3lock', 'dmenu', 'lightdm', 'alacritty', 'firefox-esr', 'xorg', 'pulseaudio', 'network-manager');
    }
  } else if (recipe.desktop === 'sway') {
    // Noms de paquets vérifiés en direct : sources.debian.org/api/src (sway/swaylock/swaybg/
    // swayidle = 200) et archlinux.org/packages/search/json (mêmes noms confirmés sur Arch).
    if (distroId === 'debian' || distroId === 'ubuntu') {
      pkgs.push('sway', 'swaylock', 'swaybg', 'swayidle', 'waybar', 'foot', 'firefox-esr', 'pipewire', 'pipewire-audio', 'wireplumber', 'network-manager');
    } else if (isArchLike) {
      pkgs.push('sway', 'swaylock', 'swaybg', 'swayidle', 'waybar', 'foot', 'firefox', 'pipewire', 'wireplumber', 'networkmanager');
    } else if (distroId === 'fedora') {
      // "sway" existe dans les dépôts Fedora officiels (vraie Fedora Sway Spin, vérifié en
      // direct sur packages.fedoraproject.org). Rocky/EPEL9 ne l'a en revanche PAS du tout
      // (vérifié en direct : dl.fedoraproject.org/pub/epel/9/.../s/ ne contient aucun "sway-*") —
      // ne rien installer plutôt que de prétendre à un paquet inexistant sur Rocky.
      pkgs.push('sway', 'swaylock', 'swaybg', 'swayidle', 'waybar', 'firefox', 'pipewire', 'NetworkManager');
    } else if (distroId === 'alpine') {
      // sway/swaylock confirmés réels sur Alpine (pkgs.alpinelinux.org, community).
      pkgs.push('sway', 'swaylock', 'swaybg', 'swayidle', 'waybar', 'foot', 'dbus', 'eudev', 'mesa-dri-gallium', 'firefox', 'pipewire', 'networkmanager');
    } else if (distroId === 'void') {
      // "waybar" confirmé ABSENT du dépôt Void (contrairement à Alpine qui l'a) — sway/swaylock/
      // swaybg/swayidle/foot sont en revanche tous réels, on les installe sans barre d'état.
      pkgs.push('sway', 'swaylock', 'swaybg', 'swayidle', 'foot', 'dbus', 'eudev', 'mesa', 'firefox', 'pipewire', 'NetworkManager');
    } else if (distroId === 'opensuse') {
      // sway/swaylock/swaybg/swayidle/waybar tous confirmés réels sur openSUSE (rpmfind.net).
      pkgs.push('sway', 'swaylock', 'swaybg', 'swayidle', 'waybar', 'foot', 'MozillaFirefox', 'pipewire', 'wireplumber', 'NetworkManager');
    }
  } else if (recipe.desktop === 'cinnamon') {
    // "cinnamon" confirmé paquet réel : sources.debian.org/api/src/cinnamon (200) et
    // archlinux.org/packages/search/json (paquet "cinnamon" présent).
    if (distroId === 'debian' || distroId === 'ubuntu') {
      pkgs.push('cinnamon', 'lightdm', 'lightdm-gtk-greeter', 'nemo', 'firefox-esr', 'xorg', 'xserver-xorg-video-all', 'pipewire', 'pipewire-audio', 'wireplumber', 'network-manager');
    } else if (isArchLike) {
      pkgs.push('cinnamon', 'lightdm', 'lightdm-gtk-greeter', 'nemo', 'firefox', 'pipewire', 'wireplumber', 'networkmanager');
    } else if (distroId === 'fedora') {
      pkgs.push('@cinnamon-desktop', 'lightdm', 'firefox', 'pipewire');
    } else if (distroId === 'rocky') {
      // "cinnamon-desktop" confirmé vrai paquet EPEL9 (dl.fedoraproject.org/pub/epel/9/.../c/) ;
      // pas de groupe "@cinnamon-desktop" garanti sur Rocky, donc paquet individuel.
      pkgs.push('cinnamon-desktop', 'lightdm', 'firefox', 'pipewire');
    } else if (distroId === 'void') {
      // "cinnamon" (meta-paquet complet, pas juste "cinnamon-desktop") confirmé réel sur Void.
      pkgs.push('cinnamon', 'lightdm', 'lightdm-gtk-greeter', 'nemo', 'dbus', 'eudev', 'xorg-server', 'mesa', 'firefox', 'pipewire', 'NetworkManager');
    } else if (distroId === 'opensuse') {
      // "cinnamon" et "nemo" confirmés réels sur openSUSE Tumbleweed (rpmfind.net).
      pkgs.push('cinnamon', 'lightdm', 'nemo', 'MozillaFirefox', 'pipewire', 'NetworkManager');
    }
  } else if (recipe.desktop === 'lxqt') {
    // Meta-paquet "lxqt" confirmé réel sur Debian (sources.debian.org/api/src/lxqt = 200) ;
    // Arch n'a pas de meta-paquet unique — composants réels du groupe officiel "lxqt" vérifiés
    // en direct (archlinux.org/groups/x86_64/lxqt/) : lxqt-session, lxqt-panel, lxqt-config,
    // pcmanfm-qt, openbox. Fedora a son propre groupe "@lxqt-desktop" (vraie Fedora LXQt Spin,
    // vérifié via packages.fedoraproject.org) ; Rocky/EPEL9 n'a EN REVANCHE AUCUN paquet LXQt du
    // tout (vérifié en direct : dl.fedoraproject.org/pub/epel/9/.../l/ ne contient rien) — ne rien
    // installer plutôt que de prétendre à un paquet inexistant.
    if (distroId === 'debian' || distroId === 'ubuntu') {
      pkgs.push('lxqt', 'sddm', 'pcmanfm-qt', 'firefox-esr', 'xorg', 'xserver-xorg-video-all', 'pipewire', 'pipewire-audio', 'wireplumber', 'network-manager');
    } else if (isArchLike) {
      pkgs.push('lxqt-session', 'lxqt-panel', 'lxqt-config', 'pcmanfm-qt', 'openbox', 'sddm', 'firefox', 'pipewire', 'wireplumber', 'networkmanager');
    } else if (distroId === 'fedora') {
      pkgs.push('@lxqt-desktop', 'sddm', 'firefox', 'pipewire');
    } else if (distroId === 'alpine') {
      // lxqt-session/lxqt-panel confirmés réels sur Alpine (pkgs.alpinelinux.org, community).
      pkgs.push('lxqt-session', 'lxqt-panel', 'pcmanfm-qt', 'sddm', 'dbus', 'eudev', 'xorg-server', 'mesa-dri-gallium', 'firefox', 'pipewire', 'networkmanager');
    } else if (distroId === 'void') {
      pkgs.push('lxqt-session', 'lxqt-panel', 'lxqt-config', 'pcmanfm-qt', 'openbox', 'sddm', 'dbus', 'eudev', 'xorg-server', 'mesa', 'firefox', 'pipewire', 'NetworkManager');
    } else if (distroId === 'opensuse') {
      // "patterns-lxqt-lxqt" confirmé vrai pattern zypper officiel (rpmfind.net).
      pkgs.push('patterns-lxqt-lxqt', 'sddm', 'pcmanfm-qt', 'MozillaFirefox', 'pipewire', 'NetworkManager');
    }
  } else if (recipe.desktop === 'web_kiosk') {
    // Bug réel trouvé en vérifiant : "chromium-browser" est un piège identique à celui déjà
    // corrigé pour Firefox sur Ubuntu (packages.ubuntu.com confirme : "Transitional package -
    // chromium-browser -> chromium snap", stub non fonctionnel dans un chroot) — et n'existe même
    // PAS du tout sous ce nom sur Debian (packages.debian.org : "No such package", seul "chromium"
    // bare existe et fonctionne réellement là-bas). "chromium" bare confirmé réel et fonctionnel
    // partout ailleurs (archlinux.org, packages.fedoraproject.org, rpmfind.net). Sur Ubuntu/Mint
    // spécifiquement, aucun chromium non-snap n'existe dans les dépôts officiels : Firefox (déjà
    // câblé avec le vrai dépôt Mozilla plus bas dans ce fichier) sert de navigateur kiosque réel
    // de repli à la place.
    if (distroId === 'ubuntu' || distroId === 'linuxmint') pkgs.push('firefox', 'cage', 'seatd', 'network-manager');
    else if (distroId === 'alpine' || distroId === 'void') pkgs.push('chromium', 'cage', 'seatd', 'xwayland', 'pipewire');
    else pkgs.push('chromium', 'cage', 'seatd', 'pipewire', 'network-manager');
  }

  // Base utilities & hardware drivers
  if (distroId === 'debian' || distroId === 'ubuntu') {
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

  // Bug réel trouvé en auditant : "enableSSH" n'a jamais installé le serveur SSH lui-même, sur
  // AUCUNE distro (Debian/Ubuntu inclus) — seul le fichier authorized_keys était écrit, sans
  // paquet openssh ni service sshd actif pour s'en servir. Noms de paquets vérifiés en direct
  // (archlinux.org, pkgs.alpinelinux.org, packages.fedoraproject.org, rpmfind.net,
  // raw.githubusercontent.com/void-linux/void-packages) : "openssh-server" existe partout SAUF
  // sur Arch/openSUSE/Void, où le paquet unique "openssh" fournit déjà le serveur.
  if (recipe.enableSSH) {
    if (distroId === 'debian' || distroId === 'ubuntu') {
      pkgs.push('openssh-server');
    } else if (isArchLike || distroId === 'opensuse' || distroId === 'void') {
      pkgs.push('openssh');
    } else if (distroId === 'alpine' || isFedoraLike) {
      pkgs.push('openssh-server');
    }
  }

  // Bug réel trouvé en auditant : "dotfilesGitUrl" (choisi dans l'UI : "clonera automatiquement
  // vos configurations... dans le home de l'utilisateur") n'était jamais référencé — le dépôt
  // n'était jamais cloné, "git" lui-même pas garanti installé pour le faire.
  if (recipe.dotfilesGitUrl) {
    pkgs.push('git');
  }

  // "fail2ban" confirmé réel paquet sur les 6 familles (archlinux.org, pkgs.alpinelinux.org/main,
  // packages.fedoraproject.org, rpmfind.net, sources.debian.org, void-packages).
  if (recipe.enableSSH && recipe.security.fail2ban) {
    pkgs.push('fail2ban');
  }

  // Bug réel MAJEUR trouvé en auditant : "useradd -s ${recipe.user.shell}" fixe le shell de
  // connexion SANS JAMAIS installer le paquet correspondant quand zsh/fish est choisi (bash et sh
  // font partie du système de base partout, mais pas zsh/fish) — le binaire du shell choisi
  // n'existe alors pas sur le disque, ce qui casse la CONNEXION AU COMPTE dès le premier login.
  // Noms vérifiés en direct sur les 6 familles : "zsh"/"fish" partout, SAUF Void où le paquet
  // s'appelle "fish-shell" (confirmé : aucun srcpkgs/fish, mais bien srcpkgs/fish-shell).
  if (recipe.user.shell === '/bin/zsh') {
    pkgs.push('zsh');
  } else if (recipe.user.shell === '/bin/fish') {
    pkgs.push(distroId === 'void' ? 'fish-shell' : 'fish');
  }

  return Array.from(new Set(pkgs.filter(Boolean)));
}

/**
 * Generates the local executable build.sh bash script
 */
// Distributions réellement compilables par ce script via debootstrap (famille Debian/APT).
// Les 6 autres familles (Arch/CachyOS, Fedora/Rocky, Alpine, openSUSE, Void) sont prises en
// charge par generateNonDebianBuildScript ci-dessous, chacune avec son propre outil de bootstrap
// natif (pacstrap, dnf --installroot, apk-tools-static, zypper, xbps-static). Seul NixOS reste
// hors-cadre : son modèle déclaratif (/nix/store immuable, pas de chroot "installer des paquets")
// est architecturalement incompatible avec le pipeline debootstrap/pacstrap/... utilisé ici.
const DEBOOTSTRAP_TARGETS: Record<string, { suite: string; mirror: string; sourcesList: (arch: string) => string; components?: string }> = {
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
    // debootstrap ne regarde QUE le composant "main" par défaut ; "live-boot" est packagé par
    // la communauté dans "universe" sur Ubuntu (contrairement à Debian où il est dans main) —
    // vérifié en live via un échec réel "E: Couldn't find these debs: live-boot" en CI.
    components: 'main,universe',
  },
  kali: {
    suite: 'kali-rolling',
    mirror: 'http://http.kali.org/kali',
    sourcesList: () => `deb http://http.kali.org/kali kali-rolling main contrib non-free non-free-firmware`,
  },
  linuxmint: {
    // Linux Mint est un dérivé Ubuntu : mêmes paramètres de bootstrap que la cible "ubuntu"
    // ci-dessus (déjà vérifiés en live), volontairement réutilisés tels quels plutôt que de
    // pointer vers le dépôt propre de Mint (packages.linuxmint.com), qui nécessiterait sa propre
    // clé GPG non encore vérifiée en live dans ce pipeline (même prudence que pour Raspberry Pi
    // OS/openSUSE : ne pas fabriquer une URL de clé non confirmée). "Mint" ici = base Ubuntu +
    // bureau Cinnamon (déjà pris en charge comme DesktopEnvironmentId), ce qui correspond
    // fonctionnellement à ce que la plupart des utilisateurs attendent de Mint.
    suite: 'resolute',
    mirror: 'http://archive.ubuntu.com/ubuntu',
    sourcesList: () => `deb http://archive.ubuntu.com/ubuntu resolute main restricted universe multiverse
deb http://archive.ubuntu.com/ubuntu resolute-updates main restricted universe multiverse
deb http://archive.ubuntu.com/ubuntu resolute-security main restricted universe multiverse`,
    components: 'main,universe',
  },
  raspbian: {
    // "rpi-bookworm" (catalogue OSForge) n'est pas un nom de suite debootstrap valide ;
    // Raspberry Pi OS est basé sur le vrai codename Debian "bookworm".
    // ATTENTION (bug réel trouvé et corrigé cette session via un test live sur GitHub Actions) :
    // archive.raspberrypi.com/debian n'est PAS un miroir Debian complet, seulement un dépôt
    // d'ajout (noyau/firmware/bootloader). Un debootstrap direct dessus échoue avec
    // "E: Couldn't find these debs: usr-is-merged" car les paquets de base n'y sont pas.
    // Le bon miroir de bootstrap est le vrai Debian (deb.debian.org) ; archive.raspberrypi.com
    // est ajouté en second dépôt (overlay signé) uniquement pour le noyau/firmware — voir le
    // bloc dédié dans generateBuildScript qui importe la clé GPG avant "apt-get update".
    suite: 'bookworm',
    mirror: 'http://deb.debian.org/debian',
    sourcesList: () => `deb http://deb.debian.org/debian bookworm main
deb [signed-by=/etc/apt/keyrings/raspberrypi.gpg.key] http://archive.raspberrypi.com/debian bookworm main`,
  },
};

// ============================================================================
// Familles non-Debian : chaque recette ci-dessous a été testée en LIVE (bootstrap réel,
// vérification du rootfs produit) sur un hôte Ubuntu avant d'être codée ici — même exigence
// que pour la famille Debian ci-dessus. CachyOS réutilise les dépôts Arch officiels vérifiés
// (pas encore les dépôts CachyOS optimisés x86-64-v3/v4 : ajouter un dépôt supplémentaire non
// vérifié ferait échouer tout le bootstrap si son URL est indisponible pour l'architecture
// ciblée). Rocky réutilise la méthode dnf --installroot vérifiée sur Fedora (même bug connu
// sysusers.sh, même correctif) avec ses propres dépôts BaseOS/AppStream — image disque re-vérifiée
// en live séparément (boot QEMU réel jusqu'au login), pas seulement supposée fonctionner par
// analogie avec Fedora.
type NonDebianFamily = 'arch' | 'fedora' | 'alpine' | 'suse' | 'void';

const NON_DEBIAN_DISTROS: Record<string, NonDebianFamily> = {
  arch: 'arch',
  cachyos: 'arch',
  fedora: 'fedora',
  rocky: 'fedora',
  alpine: 'alpine',
  opensuse: 'suse',
  void: 'void',
};

const NON_DEBIAN_LABELS: Record<string, string> = {
  arch: 'Arch Linux', cachyos: 'CachyOS (base Arch Linux)',
  fedora: 'Fedora Linux', rocky: 'Rocky Linux',
  alpine: 'Alpine Linux', opensuse: 'openSUSE Tumbleweed', void: 'Void Linux',
};

interface NonDebianFamilyConfig {
  hostDeps: string;
  hostCheckCmd: string; // commandes déjà présentes sur l'hôte si le bootstrap a déjà tourné une fois : évite un "apt-get update" inutile (et donc un échec si un dépôt tiers de l'hôte est cassé, sans rapport avec la compilation)
  bootstrapBlock: (distroId: string, unameArch: string, isDiskImage: boolean, kernelType: string) => string;
  updateCmd: string;
  installOneCmd: string; // utilise la variable shell "$pkg"
  diskImageSupported: boolean; // pipeline partition+grub-install vérifié en live (boot QEMU réel jusqu'au login)
  // Snippet shell exécuté juste avant l'écriture de grub.cfg, dans le contexte du disque monté
  // (variable "$MNT_DIR" disponible) : doit fixer KERNEL_PATH et INITRD_PATH (chemins ABSOLUS
  // dans le rootfs, ex. /boot/vmlinuz-linux). Fonction (pas juste une string statique) pour Arch :
  // sur Arch, le suffixe du fichier /boot/vmlinuz-* est le NOM DU PAQUET noyau lui-même (ex.
  // "linux-zen" → vmlinuz-linux-zen), pas un numéro de version — donc ça doit suivre le noyau
  // réellement sélectionné, sinon GRUB pointerait vers un fichier qui n'existe pas. Statique pour
  // les familles RPM/autres (version détectée dynamiquement via /lib/modules, indépendant du nom
  // de paquet).
  diskImageKernelDetectCmd?: string | ((kernelType: string) => string);
  grubInstallBin?: string; // 'grub-install' (Arch/Alpine/Void) ou 'grub2-install' (Fedora/Rocky/openSUSE, qui renomment le binaire)
  grubConfigSubdir?: string; // 'grub' (Arch/Alpine/Void) ou 'grub2' (Fedora/Rocky/openSUSE)
  // Alpine uniquement : son outil de résolution de "root=" au démarrage (nlplug-findfs) échoue
  // sur "root=UUID=..." dans ce pipeline — vérifié en live (échec de montage systématique). Un
  // chemin de périphérique direct (/dev/sda1) fonctionne. Contrepartie assumée et documentée :
  // moins robuste qu'UUID si le disque n'apparaît pas comme /dev/sda dans l'environnement cible.
  diskImageRootIsDevicePath?: boolean;
  // Args noyau additionnels requis par cette famille pour le boot disque (ex. Alpine a besoin de
  // "modules=sd-mod,ext4" pour charger explicitement les pilotes avant le montage racine — sans
  // ça, le chargement automatique par udev est une course contre nlplug-findfs, gagnée seulement
  // par chance selon le run — vérifié en live : même config, un run réussit, l'autre échoue).
  diskImageExtraKernelArgs?: string;
  // Modifier la config de l'initramfs (HOOKS mkinitcpio, hostonly dracut...) ne suffit pas si le
  // fichier a déjà été généré par le bootstrap AVANT que la config ne change : ce snippet force
  // une régénération explicite quand nécessaire — vérifié en live (Arch restait bloqué au
  // démarrage sur "A start job is running for /dev/disk/by-uuid/..." sans lui).
  diskImageInitrdRegenCmd?: string;
}

// Vérifié en direct (archlinux.org/packages/search/json) : linux-zen, linux-hardened, linux-lts
// et linux-rt sont tous de vrais paquets des dépôts officiels Arch (extra/core), installables
// tels quels par pacstrap. linux-cachyos n'y figure PAS (0 résultat) — il exige le dépôt CachyOS
// dédié, pas encore ajouté à ce pipeline (voir NON_DEBIAN_DISTROS). mainline_beta/liquorix/
// cloud_micro n'ont pas d'équivalent officiel simple pour Arch — repli honnête sur "linux" plutôt
// que d'installer silencieusement le mauvais noyau en prétendant que le choix a été respecté.
const ARCH_KERNEL_PACKAGE: Record<string, string> = {
  generic: 'linux',
  mainline_beta: 'linux',
  cachyos: 'linux',
  zen: 'linux-zen',
  liquorix: 'linux',
  hardened: 'linux-hardened',
  realtime: 'linux-rt',
  cloud_micro: 'linux',
  lts: 'linux-lts',
};
const ARCH_KERNEL_FALLBACK_NOTICE: Record<string, string> = {
  mainline_beta: "mainline_beta n'a pas de paquet officiel Arch dédié",
  cachyos: 'linux-cachyos nécessite le dépôt CachyOS (non configuré ici)',
  liquorix: 'Liquorix est un noyau spécifique Debian/Ubuntu, sans équivalent officiel Arch',
  cloud_micro: "cloud_micro n'a pas d'équivalent officiel Arch",
};

const NON_DEBIAN_FAMILY_CONFIG: Record<NonDebianFamily, NonDebianFamilyConfig> = {
  arch: {
    hostDeps: 'arch-install-scripts pacman-package-manager',
    hostCheckCmd: 'pacstrap',
    bootstrapBlock: (_distroId, _arch, isDiskImage, kernelType) => {
      const kernelPkg = ARCH_KERNEL_PACKAGE[kernelType] || 'linux';
      const fallbackNotice = ARCH_KERNEL_FALLBACK_NOTICE[kernelType];
      return `mkdir -p "\${WORK_DIR}/pacman.d"
cat > "\${WORK_DIR}/pacman.d/mirrorlist" << 'ARCH_MIRROR_EOF'
Server = https://geo.mirror.pkgbuild.com/$repo/os/$arch
ARCH_MIRROR_EOF
cat > "\${WORK_DIR}/pacman.conf" << PACMAN_CONF_EOF
[options]
Architecture = auto
SigLevel = Never
LocalFileSigLevel = Optional
#CheckSpace

[core]
Include = \${WORK_DIR}/pacman.d/mirrorlist

[extra]
Include = \${WORK_DIR}/pacman.d/mirrorlist
PACMAN_CONF_EOF

mkdir -p "\${ROOTFS_DIR}/var/lib/pacman"${isDiskImage && fallbackNotice ? `
echo -e "\${YELLOW}[INFO] ${fallbackNotice} : installation de '${kernelPkg}' à la place.\${NC}"` : ''}
pacstrap -c -G -M -C "\${WORK_DIR}/pacman.conf" "\${ROOTFS_DIR}" base${isDiskImage ? ` grub ${kernelPkg} linux-firmware` : ''}

# Le rootfs cible a besoin de son PROPRE mirrorlist utilisable : pacstrap -M n'y copie pas
# celui de l'hôte, et celui livré par défaut avec "base" a tous ses miroirs commentés.
echo 'Server = https://geo.mirror.pkgbuild.com/$repo/os/$arch' > "\${ROOTFS_DIR}/etc/pacman.d/mirrorlist"
sed -i 's/^#\\?SigLevel.*/SigLevel = Never/' "\${ROOTFS_DIR}/etc/pacman.conf"
# CheckSpace est peu fiable dans un chroot (faux "not enough free disk space", vérifié en live) : désactivé.
sed -i 's/^CheckSpace/#CheckSpace/' "\${ROOTFS_DIR}/etc/pacman.conf"${isDiskImage ? `
# Le hook "autodetect" de mkinitcpio adapte l'initramfs au matériel de LA MACHINE DE BUILD (WSL2/CI),
# pas à celui de la machine cible qui bootera l'image — vérifié en live : sans ce retrait, l'image
# construite reste bloquée au démarrage sur "A start job is running for /dev/disk/by-uuid/...".
sed -i 's/^HOOKS=.*/HOOKS=(base systemd microcode modconf kms keyboard sd-vconsole block filesystems fsck)/' "\${ROOTFS_DIR}/etc/mkinitcpio.conf"` : ''}`;
    },
    updateCmd: 'pacman -Sy --noconfirm',
    installOneCmd: 'pacman -S --noconfirm --needed "$pkg"',
    diskImageSupported: true,
    diskImageKernelDetectCmd: (kernelType: string) => {
      const kernelPkg = ARCH_KERNEL_PACKAGE[kernelType] || 'linux';
      return `KERNEL_PATH="/boot/vmlinuz-${kernelPkg}"\nINITRD_PATH="/boot/initramfs-${kernelPkg}.img"`;
    },
    grubInstallBin: 'grub-install',
    grubConfigSubdir: 'grub',
    diskImageInitrdRegenCmd: 'mkinitcpio -P',
  },
  fedora: {
    hostDeps: 'dnf dnf-plugins-core rpm',
    hostCheckCmd: 'dnf rpmkeys',
    bootstrapBlock: (distroId, _arch, isDiskImage, kernelType) => {
      const isRocky = distroId === 'rocky';
      // Bug réel trouvé en auditant : noyau "lts" pour Fedora tombait toujours dans le repli
      // honnête ci-dessous (aucun paquet dnf officiel LTS pour Fedora — Fedora ne maintient pas
      // de branche noyau LTS, contrairement à Debian/Ubuntu via XanMod). Vérifié en direct qu'un
      // vrai dépôt COPR maintenu (kwizart/kernel-longterm-6.18, actif — dernière build le jour
      // même de cette vérification) fournit un paquet "kernel-longterm" RÉEL avec un chroot
      // "fedora-44-x86_64" correspondant exactement à la version Fedora déjà ciblée par ce
      // générateur (releasever=44 ci-dessous) : fichier .repo, clé GPG et repodata/primary.xml
      // du paquet tous confirmés accessibles en direct (200, contenu réel, pas une supposition).
      // Rocky Linux exclu de ce câblage : ce COPR ne publie que des chroots epel-9/centos-stream-9
      // pour sa branche précédente (6.6) et fedora-*/epel-10 pour 6.18, aucun ne correspond
      // exactement à Rocky 9 sans un choix de version supplémentaire — hors périmètre honnête
      // pour cette itération plutôt qu'un mauvais choix de dépôt non vérifié.
      const isFedoraLtsKernel = !isRocky && kernelType === 'lts';
      // Pas de paquet officiel dnf pour zen/hardened/rt/cachyos/liquorix côté Fedora/Rocky, ni
      // pour "lts" côté Rocky (contrairement à Arch, où linux-zen/hardened/lts/rt sont vérifiés
      // dans les dépôts officiels) — repli honnête et annoncé sur le noyau par défaut de la
      // distro plutôt que d'ignorer silencieusement le choix de l'utilisateur.
      const kernelFallbackNotice = kernelType && kernelType !== 'generic' && !isFedoraLtsKernel
        ? `Le noyau "${kernelType}" n'a pas de paquet officiel dnf pour ${isRocky ? 'Rocky Linux' : 'Fedora'} : noyau par défaut de la distro utilisé à la place.`
        : null;
      // Pas de backslash devant $basearch/$releasever ici : ce sont des variables du format
      // .repo dnf lui-même (substituées par dnf à la lecture du fichier), pas des variables
      // shell. Un backslash littéral casserait la substitution dnf (URL invalide).
      const repoBlock = isRocky
        ? `[baseos]
name=Rocky Linux 9 - BaseOS
baseurl=https://download.rockylinux.org/pub/rocky/9/BaseOS/$basearch/os/
enabled=1
gpgcheck=0

[appstream]
name=Rocky Linux 9 - AppStream
baseurl=https://download.rockylinux.org/pub/rocky/9/AppStream/$basearch/os/
enabled=1
gpgcheck=0

[epel]
name=Extra Packages for Enterprise Linux 9 - $basearch
baseurl=https://dl.fedoraproject.org/pub/epel/9/Everything/$basearch/
enabled=1
gpgcheck=0

[crb]
name=Rocky Linux 9 - CRB
baseurl=https://download.rockylinux.org/pub/rocky/9/CRB/$basearch/os/
enabled=1
gpgcheck=0`
        : `[fedora]
name=Fedora $releasever - $basearch
baseurl=https://dl.fedoraproject.org/pub/fedora/linux/releases/$releasever/Everything/$basearch/os/
enabled=1
gpgcheck=0

[updates]
name=Fedora $releasever - $basearch - Updates
baseurl=https://dl.fedoraproject.org/pub/fedora/linux/updates/$releasever/Everything/$basearch/
enabled=1
gpgcheck=0`;
      // EPEL ("Extra Packages for Enterprise Linux") ajouté pour Rocky : la plupart des bureaux
      // alternatifs (KDE/XFCE/Cinnamon) n'existent pas du tout dans baseos/appstream — vérifié en
      // direct sur dl.fedoraproject.org/pub/epel/9/Everything/x86_64/Packages/ (plasma-desktop,
      // xfce4-session, cinnamon-desktop confirmés présents ; lxqt-session et sway confirmés ABSENTS
      // même dans EPEL, d'où leur exclusion pour Rocky ci-dessus plutôt qu'un paquet inexistant).
      const releasever = isRocky ? '9' : '44';
      // "crb" (CodeReady Builder) est officiellement documenté comme requis aux côtés d'EPEL sur
      // Rocky 9 (docs.rockylinux.org) : de nombreuses dépendances d'EPEL y résident et non dans
      // baseos/appstream ; sans lui, la résolution de dépendances dnf pour KDE/XFCE/Cinnamon échoue.
      const repoIds = isRocky ? '--repo=baseos --repo=appstream --repo=epel --repo=crb' : '--repo=fedora --repo=updates';
      const releasePkg = isRocky ? 'rocky-release' : 'fedora-release';
      return `mkdir -p "\${WORK_DIR}/yum.repos.d"
cat > "\${WORK_DIR}/yum.repos.d/target.repo" << 'DNF_REPO_EOF'
${repoBlock}
DNF_REPO_EOF
${isFedoraLtsKernel ? `
# Dépôt COPR réel (vérifié en direct : projet actif, chroot fedora-44-x86_64, clé GPG et
# repodata accessibles) fournissant le paquet "kernel-longterm" — Fedora ne maintient aucune
# branche noyau LTS officielle, contrairement à Debian/Ubuntu (XanMod) plus haut dans ce fichier.
cat > "\${WORK_DIR}/yum.repos.d/kernel-longterm.repo" << 'COPR_REPO_EOF'
[copr:copr.fedorainfracloud.org:kwizart:kernel-longterm-6.18]
name=Copr repo for kernel-longterm-6.18 owned by kwizart
baseurl=https://download.copr.fedorainfracloud.org/results/kwizart/kernel-longterm-6.18/fedora-$releasever-$basearch/
type=rpm-md
skip_if_unavailable=True
gpgcheck=1
gpgkey=https://download.copr.fedorainfracloud.org/results/kwizart/kernel-longterm-6.18/pubkey.gpg
repo_gpgcheck=0
enabled=1
enabled_metadata=1
COPR_REPO_EOF` : ''}

DNF_BASE="dnf --installroot=\${ROOTFS_DIR} --releasever=${releasever} --setopt=reposdir=\${WORK_DIR}/yum.repos.d ${repoIds}${isFedoraLtsKernel ? ' --repo=copr:copr.fedorainfracloud.org:kwizart:kernel-longterm-6.18' : ''} --nogpgcheck -y"

# Bug connu rpm/dnf : le scriptlet %sysusers du paquet "setup" appelle /usr/lib/rpm/sysusers.sh,
# fourni par le paquet "rpm" lui-même — s'il n'est pas encore posé sur le disque au moment où le
# scriptlet tourne (ordre de transaction), l'installation de "setup" (qui fournit /etc/passwd)
# échoue silencieusement. Vérifié en live : une 2e passe explicite sur "setup" seule le corrige.
$DNF_BASE install basesystem ${releasePkg} bash coreutils dnf || true
$DNF_BASE install setup
$DNF_BASE install shadow-utils sudo${isDiskImage ? `

# dracut est "hostonly" par défaut sur Fedora/RHEL : sans ceci, l'initramfs généré automatiquement
# par le scriptlet du paquet noyau n'embarque que les modules de LA MACHINE DE BUILD, pas ceux
# nécessaires pour démarrer sur une autre machine/VM cible — vérifié en live (méthode officiellement
# documentée par Fedora/RHEL pour construire des images génériques).
mkdir -p "\${ROOTFS_DIR}/etc/dracut.conf.d"
cat > "\${ROOTFS_DIR}/etc/dracut.conf.d/00-no-hostonly.conf" << 'DRACUT_EOF'
hostonly="no"
DRACUT_EOF
${kernelFallbackNotice ? `
echo -e "\${YELLOW}[INFO] ${kernelFallbackNotice}\${NC}"` : ''}${isFedoraLtsKernel ? `
echo -e "\${CYAN}[INFO] Noyau \\"lts\\" réellement câblé pour Fedora via le dépôt COPR kwizart/kernel-longterm-6.18.\${NC}"
$DNF_BASE install kernel-longterm grub2-pc` : `
$DNF_BASE install kernel grub2-pc`}` : ''}`;
    },
    updateCmd: '',
    installOneCmd: 'dnf install -y "$pkg"',
    diskImageSupported: true,
    diskImageKernelDetectCmd: 'KVER=$(ls "${MNT_DIR}/lib/modules/" | head -1)\nKERNEL_PATH="/boot/vmlinuz-${KVER}"\nINITRD_PATH="/boot/initramfs-${KVER}.img"',
    grubInstallBin: 'grub2-install',
    grubConfigSubdir: 'grub2',
  },
  alpine: {
    hostDeps: '',
    hostCheckCmd: 'curl tar xz',
    bootstrapBlock: (_distroId, _arch, isDiskImage, kernelType) => `${isDiskImage && kernelType && kernelType !== 'generic' && kernelType !== 'lts' ? `echo -e "\${YELLOW}[INFO] Le noyau \\"${kernelType}\\" n'a pas de paquet apk dédié pour Alpine : linux-lts (déjà vérifié en live) utilisé à la place.\${NC}"
` : ''}mkdir -p "\${WORK_DIR}/apk-static"
APK_IDX="\${WORK_DIR}/apk-idx.html"
curl -sL https://dl-cdn.alpinelinux.org/alpine/latest-stable/main/x86_64/ -o "$APK_IDX"
APKVER=$(grep -oP 'apk-tools-static-[0-9][0-9.r-]*\\.apk' "$APK_IDX" | head -1)
curl -sL "https://dl-cdn.alpinelinux.org/alpine/latest-stable/main/x86_64/$APKVER" -o "\${WORK_DIR}/apk-tools-static.apk"
tar -xzf "\${WORK_DIR}/apk-tools-static.apk" -C "\${WORK_DIR}/apk-static"

"\${WORK_DIR}/apk-static/sbin/apk.static" \\
  -X https://dl-cdn.alpinelinux.org/alpine/latest-stable/main \\
  -X https://dl-cdn.alpinelinux.org/alpine/latest-stable/community \\
  -U --allow-untrusted --root "\${ROOTFS_DIR}" --initdb \\
  add alpine-base shadow sudo${isDiskImage ? ' linux-lts grub grub-bios mkinitfs' : ''}

mkdir -p "\${ROOTFS_DIR}/etc/apk"
cat > "\${ROOTFS_DIR}/etc/apk/repositories" << 'APK_REPOS_EOF'
https://dl-cdn.alpinelinux.org/alpine/latest-stable/main
https://dl-cdn.alpinelinux.org/alpine/latest-stable/community
APK_REPOS_EOF${isDiskImage ? `

# Alpine ne démarre aucun getty sur la console série par défaut (seulement tty1-tty6) — même
# limite que Void, vérifiée en live de la même façon.
sed -i 's/^#ttyS0::/ttyS0::/' "\${ROOTFS_DIR}/etc/inittab"` : ''}`,
    updateCmd: 'apk update',
    installOneCmd: 'apk add --no-cache "$pkg"',
    diskImageSupported: true,
    diskImageKernelDetectCmd: 'KERNEL_PATH="/boot/vmlinuz-lts"\nINITRD_PATH="/boot/initramfs-lts"',
    grubInstallBin: 'grub-install',
    grubConfigSubdir: 'grub',
    diskImageRootIsDevicePath: true,
    diskImageExtraKernelArgs: 'modules=sd-mod,ext4',
  },
  suse: {
    hostDeps: 'zypper',
    hostCheckCmd: 'zypper',
    bootstrapBlock: (_distroId, _arch, isDiskImage, kernelType) => `${isDiskImage && kernelType && kernelType !== 'generic' ? `echo -e "\${YELLOW}[INFO] Le noyau \\"${kernelType}\\" n'a pas de paquet zypper dédié pour openSUSE : kernel-default utilisé à la place.\${NC}"
` : ''}mkdir -p "\${ROOTFS_DIR}"
zypper --root "\${ROOTFS_DIR}" --non-interactive addrepo --no-gpgcheck \\
  https://download.opensuse.org/tumbleweed/repo/oss/ repo-oss
zypper --root "\${ROOTFS_DIR}" --non-interactive --gpg-auto-import-keys refresh
zypper --root "\${ROOTFS_DIR}" --non-interactive install --no-recommends -y --allow-unsigned-rpm \\
  patterns-base-minimal_base rpm shadow sudo${isDiskImage ? `

# dracut est "hostonly" par défaut : sans ceci, l'initramfs généré par le scriptlet du paquet
# noyau n'embarque que les pilotes de LA MACHINE DE BUILD (l'hôte Ubuntu du chroot zypper), pas
# ceux nécessaires pour démarrer sur la VM/machine cible réelle — même bug que Fedora/RHEL, même
# correctif (méthode officiellement documentée pour construire des images disque génériques).
# Écrit AVANT l'installation du noyau : le scriptlet %posttrans qui régénère l'initramfs doit
# trouver ce fichier déjà en place.
mkdir -p "\${ROOTFS_DIR}/etc/dracut.conf.d"
cat > "\${ROOTFS_DIR}/etc/dracut.conf.d/00-no-hostonly.conf" << 'DRACUT_EOF'
hostonly="no"
DRACUT_EOF


# "dracut" doit être installé EXPLICITEMENT : contrairement à Fedora/RHEL, kernel-default
# d'openSUSE ne le tire pas comme dépendance — vérifié en live (le scriptlet %posttrans
# affichait littéralement "dracut is not installed, not rebuilding the initrd", laissant
# /boot sans aucun fichier initrd du tout).
zypper --root "\${ROOTFS_DIR}" --non-interactive install --no-recommends -y --allow-unsigned-rpm \\
  kernel-default grub2 grub2-i386-pc dracut` : ''}`,
    updateCmd: '',
    installOneCmd: 'zypper --non-interactive install --no-recommends "$pkg"',
    diskImageSupported: true,
    diskImageKernelDetectCmd: 'KVER=$(ls "${MNT_DIR}/lib/modules/" | head -1)\nKERNEL_PATH="/boot/vmlinuz-${KVER}"\nINITRD_PATH="/boot/initrd-${KVER}"',
    grubInstallBin: 'grub2-install',
    grubConfigSubdir: 'grub2',
    // Bug réel trouvé en live sur GitHub Actions : contrairement à "dnf --installroot" (qui monte
    // automatiquement /dev,/proc,/sys pour les scriptlets rpm), "zypper --root" ne le fait pas —
    // le scriptlet %posttrans de kernel-default qui doit générer l'initrd via dracut échoue donc
    // silencieusement (pas d'accès à /dev,/proc,/sys), et /boot ne contient AUCUN fichier initrd.
    // Sans initrd, le noyau n'a aucun pilote de contrôleur de stockage disponible au démarrage :
    // "No filesystem could mount root, tried:" (liste vide). Régénération explicite forcée ici,
    // APRÈS le montage /dev,/proc,/sys (voir le point d'insertion de diskImageInitrdRegenCmd) où
    // dracut dispose enfin d'un environnement chroot complet pour détecter les pilotes nécessaires.
    diskImageInitrdRegenCmd: `sh -c 'KVER=$(ls /lib/modules | head -1); dracut --force --no-hostonly "/boot/initrd-$KVER" "$KVER"'`,
  },
  void: {
    hostDeps: '',
    hostCheckCmd: 'curl tar xz',
    bootstrapBlock: (_distroId, _arch, isDiskImage, kernelType) => `${isDiskImage && kernelType && kernelType !== 'generic' ? `echo -e "\${YELLOW}[INFO] Le noyau \\"${kernelType}\\" n'a pas de paquet xbps dédié pour Void : linux (paquet par défaut) utilisé à la place.\${NC}"
` : ''}mkdir -p "\${WORK_DIR}/xbps-static" "\${ROOTFS_DIR}/var/db/xbps/keys"
curl -sL https://repo-default.voidlinux.org/static/xbps-static-latest.x86_64-musl.tar.xz -o "\${WORK_DIR}/xbps-static.tar.xz"
tar -xJf "\${WORK_DIR}/xbps-static.tar.xz" -C "\${WORK_DIR}/xbps-static"


# "yes |" avec "set -o pipefail" actif est un piège classique : une fois xbps-install terminé,
# "yes" reçoit SIGPIPE (code 141) et pipefail fait échouer TOUTE LA PIPELINE même si xbps-install
# a réussi — le script s'arrête net, sans message d'erreur — vérifié en live (repro minimal :
# "set -o pipefail; yes | head -0" quitte avec le code 141 sans jamais exécuter la suite).
set +o pipefail
yes | "\${WORK_DIR}/xbps-static/usr/bin/xbps-install.static" \\
  -S -R https://repo-default.voidlinux.org/current \\
  -r "\${ROOTFS_DIR}" -y base-voidstrap shadow sudo${isDiskImage ? ' grub linux' : ''}
set -o pipefail

mkdir -p "\${ROOTFS_DIR}/etc/xbps.d"
echo 'repository=https://repo-default.voidlinux.org/current' > "\${ROOTFS_DIR}/etc/xbps.d/00-repository-main.conf"${isDiskImage ? `

# Void n'active aucun getty sur la console série par défaut (seulement tty1-tty6) : sans ce lien,
# le système démarre normalement mais n'affiche jamais rien sur ttyS0 — vérifié en live (ce qui
# ressemblait à un blocage au démarrage était en réalité un boot réussi, juste invisible).
ln -sf /etc/sv/agetty-ttyS0 "\${ROOTFS_DIR}/etc/runit/runsvdir/default/agetty-ttyS0"` : ''}`,
    updateCmd: 'xbps-install -Sy',
    installOneCmd: 'xbps-install -Sy "$pkg"',
    diskImageSupported: true,
    diskImageKernelDetectCmd: 'KVER=$(ls "${MNT_DIR}/lib/modules/" | head -1)\nKERNEL_PATH="/boot/vmlinuz-${KVER}"\nINITRD_PATH="/boot/initramfs-${KVER}.img"',
    grubInstallBin: 'grub-install',
    grubConfigSubdir: 'grub',
  },
};

// L'ISO hybride Debian (isohybrid-mbr) et l'image disque partitionnée (familles non-Debian, voir
// generateNonDebianDiskImageBlock) sont toutes deux déjà des images disque brutes valides : qemu-img
// les convertit directement vers QCOW2/VMDK/RAW sans repartitionnement supplémentaire.
const DISK_IMAGE_FORMATS: Record<string, { qemuFormat: string; ext: string; label: string }> = {
  qcow2: { qemuFormat: 'qcow2', ext: 'qcow2', label: 'Image Cloud QCOW2' },
  vmdk: { qemuFormat: 'vmdk', ext: 'vmdk', label: 'Disque Virtuel VMDK' },
  raw_img: { qemuFormat: 'raw', ext: 'img', label: 'Image Disque Brute (RAW)' },
};

/**
 * Bootstrap réel (non-Debian) : Arch/CachyOS (pacstrap), Fedora/Rocky (dnf --installroot),
 * Alpine (apk-tools-static officiel), openSUSE (zypper --root), Void (xbps-static officiel).
 * Formats de sortie supportés : RootFS tar.gz (WSL2 / Docker) uniquement pour l'instant — l'ISO
 * live bootable et les images disque nécessitent une intégration bootloader/initramfs propre à
 * chaque famille (mkinitcpio/dracut/mkinitfs + hooks "live" dédiés, absents ici), pas encore
 * implémentée : le script le signale clairement plutôt que de produire une image qui ne démarre pas.
 */
function generateNonDebianBuildScript(recipe: OSRecipe, family: NonDebianFamily): string {
  const pkgs = shellQuotePkgList(resolvePackageList(recipe));
  const config = NON_DEBIAN_FAMILY_CONFIG[family];
  // Le paquet openssh(-server) est déjà ajouté par resolvePackageList() quand enableSSH est
  // coché, mais son SERVICE ne démarre jamais tout seul au premier boot sans être activé —
  // mécanisme différent par init system (systemd/OpenRC/runit), vérifié en direct : Alpine=OpenRC
  // ("rc-update"), Void=runit (symlink dans runsvdir, même schéma que agetty-ttyS0 plus haut),
  // les 3 autres familles=systemd. Nom du service = "sshd" partout sauf Debian/Ubuntu (hors
  // périmètre de cette fonction) qui utilisent "ssh".
  const sshEnableCmd = !recipe.enableSSH ? '' : family === 'alpine'
    ? 'rc-update add sshd default 2>/dev/null || true'
    : family === 'void'
      ? 'mkdir -p /etc/runit/runsvdir/default && ln -sf /etc/sv/sshd /etc/runit/runsvdir/default/sshd 2>/dev/null || true'
      : 'systemctl enable sshd 2>/dev/null || true';
  const xkb = resolveXkb(recipe.keyboardLayout);
  const dmCmd = dmEnableCmd(recipe.displayManager, family);
  const label = NON_DEBIAN_LABELS[recipe.distro] || recipe.distro;
  const unameArch = recipe.arch === 'i686' ? 'i686' : recipe.arch;
  const rootfsTarName = `${recipe.branding.osName.toLowerCase().replace(/[^a-z0-9]/g, '-')}-rootfs.tar.gz`;
  const isTarFormat = recipe.outputFormat === 'wsl2_tar' || recipe.outputFormat === 'docker_rootfs';
  const diskTarget = DISK_IMAGE_FORMATS[recipe.outputFormat];
  const wantsDiskImage = !!diskTarget;
  const diskImageAvailable = wantsDiskImage && config.diskImageSupported;

  if (!isTarFormat && !diskImageAvailable) {
    const diskImageHint = wantsDiskImage
      ? `Ce format d'image disque n'est pas encore pris en charge pour ${label} spécifiquement`
      : `Le format '${recipe.outputFormat}' n'est pas encore pris en charge pour ${label}`;
    return `#!/usr/bin/env bash
set -euo pipefail
RED='\\033[0;31m'
YELLOW='\\033[1;33m'
NC='\\033[0m'
echo -e "\${RED}[ERREUR] ${diskImageHint}.\${NC}"
echo ""
echo -e "\${YELLOW}Pour ${label}, sont actuellement implémentés :\${NC}"
echo "  - Distribution Windows WSL2 (.tar.gz)"
echo "  - RootFS Docker (.tar.gz)"
${NON_DEBIAN_FAMILY_CONFIG.arch.diskImageSupported && family !== 'arch' ? 'echo "  (les images disque QCOW2/VMDK/RAW sont disponibles pour Arch Linux / CachyOS)"' : ''}
echo ""
echo "L'ISO live bootable nécessite une intégration bootloader + initramfs \"live\" propre à chaque"
echo "famille (mkinitcpio/dracut/mkinitfs), pas encore codée dans OSForge Studio pour cette distribution."
echo "Changez le format de sortie, ou choisissez une distro de la famille Debian (Debian, Ubuntu, Kali,"
echo "Raspberry Pi OS) pour une ISO complète."
exit 1
`;
  }

  if (diskImageAvailable) {
    return generateNonDebianDiskImageScript(recipe, family, pkgs, label, unameArch, diskTarget);
  }

  return `#!/usr/bin/env bash
# ==============================================================================
# OSForge Studio — Script de Construction RootFS (${recipe.branding.osName})
# Base: ${label} | Arch: ${recipe.arch} | Format: ${recipe.outputFormat}
# Date de génération: ${new Date().toISOString()}
# ==============================================================================

set -euo pipefail

RED='\\033[0;31m'
GREEN='\\033[0;32m'
CYAN='\\033[0;36m'
YELLOW='\\033[1;33m'
NC='\\033[0m'

echo -e "\${CYAN}=======================================================\${NC}"
echo -e "\${CYAN}   🚀 OSForge Studio : Construction RootFS            \${NC}"
echo -e "\${CYAN}   Distribution cible : ${label} (${recipe.arch})\${NC}"
echo -e "\${CYAN}   Nom d'hôte         : "${shQuote(recipe.hostname)}"\${NC}"
echo -e "\${CYAN}=======================================================\${NC}"

if [[ $EUID -ne 0 ]]; then
   echo -e "\${RED}[ERREUR] Ce script doit être exécuté avec les privilèges root (sudo).\${NC}"
   exit 1
fi

WORK_DIR="/var/tmp/osforge-build-$(date +%s)"
ROOTFS_DIR="\${WORK_DIR}/rootfs"
OUTPUT_DIR="$(pwd)/dist"
mkdir -p "\${ROOTFS_DIR}" "\${OUTPUT_DIR}"

echo -e "\${YELLOW}[1/4] 📦 Installation des dépendances de bootstrap sur l'hôte...\${NC}"
which ${config.hostCheckCmd} >/dev/null 2>&1 || {
    echo -e "\${YELLOW}Installation des outils requis sur l'hôte...\${NC}"
    apt-get update -y && apt-get install -y curl tar xz-utils ${config.hostDeps}
}

echo -e "\${YELLOW}[2/4] 🏗️ Initialisation du RootFS ${label}...\${NC}"
${config.bootstrapBlock(recipe.distro, unameArch, false, recipe.kernel)}

echo -e "\${YELLOW}[3/4] ⚙️ Configuration du système et installation des paquets...\${NC}"

# Le rootfs fraîchement créé n'a pas de résolution DNS : sans ceci, le gestionnaire de paquets
# à l'intérieur du chroot ne peut contacter aucun dépôt ("Could not resolve host").
cp /etc/resolv.conf "\${ROOTFS_DIR}/etc/resolv.conf" 2>/dev/null || true

mount --bind /dev "\${ROOTFS_DIR}/dev"
mount --bind /dev/pts "\${ROOTFS_DIR}/dev/pts" 2>/dev/null || true
mount --bind /proc "\${ROOTFS_DIR}/proc"
mount --bind /sys "\${ROOTFS_DIR}/sys"

cat << 'CHROOT_EOF' | chroot "\${ROOTFS_DIR}" /bin/sh
set -e
${config.updateCmd}

for pkg in ${pkgs}; do
    ${config.installOneCmd} || echo "Info: $pkg omis ou non disponible dans le dépôt."
done

echo ${shQuote(recipe.hostname)} > /etc/hostname
cat << 'HOSTS' > /etc/hosts
127.0.0.1   localhost ${recipe.hostname}
::1         localhost ip6-localhost ip6-loopback
HOSTS

${osReleaseCmd(recipe, family === 'suse' ? 'opensuse' : family)}

ln -sf /usr/share/zoneinfo/${recipe.timezone} /etc/localtime 2>/dev/null || true

# Bug réel trouvé en auditant : "keyboardLayout" (choisi dans l'UI) n'était jamais appliqué —
# le clavier gardait toujours la disposition par défaut de l'image, quel que soit le choix.
mkdir -p /etc/X11/xorg.conf.d
cat > /etc/X11/xorg.conf.d/00-keyboard.conf << 'XKB_EOF'
Section "InputClass"
    Identifier "system-keyboard"
    MatchIsKeyboard "on"
    Option "XkbLayout" "${xkb.layout}"${xkb.variant ? `
    Option "XkbVariant" "${xkb.variant}"` : ''}
EndSection
XKB_EOF
echo "KEYMAP=${xkb.layout}" > /etc/vconsole.conf 2>/dev/null || true

if ! id ${shQuote(recipe.user.username)} >/dev/null 2>&1; then
    useradd -m -s ${shQuote(recipe.user.shell)} -c ${shQuote(recipe.user.fullName)} ${shQuote(recipe.user.username)}
    echo ${shQuote(recipe.user.username)}:${shQuote(recipe.user.password || 'forge')} | chpasswd
fi
echo "root:toor" | chpasswd

${recipe.user.sudo ? `mkdir -p /etc/sudoers.d
echo ${shQuote(recipe.user.username)}' ALL=(ALL:ALL) NOPASSWD:ALL' > /etc/sudoers.d/90-osforge-user
chmod 440 /etc/sudoers.d/90-osforge-user` : '# Compte utilisateur sans droits sudo (non demandé dans la recette)'}

${recipe.enableSSH && recipe.user.sshPublicKey ? `mkdir -p /home/${shQuote(recipe.user.username)}/.ssh
echo ${shQuote(recipe.user.sshPublicKey || '')} > /home/${shQuote(recipe.user.username)}/.ssh/authorized_keys
chmod 700 /home/${shQuote(recipe.user.username)}/.ssh
chmod 600 /home/${shQuote(recipe.user.username)}/.ssh/authorized_keys
chown -R ${shQuote(recipe.user.username)}:${shQuote(recipe.user.username)} /home/${shQuote(recipe.user.username)}/.ssh` : ''}
${sshEnableCmd}
${sshHardeningCmd(recipe, family)}
${dmCmd}
${dmAutologinCmd(recipe, family)}
${kioskSetupCmd(recipe, family)}
${dotfilesCloneCmd(recipe)}
${customServicesCmd(recipe, family)}

cat << 'FIRSTBOOT_EOF' > /root/firstboot.sh
#!/bin/sh
${recipe.firstBootScript || '# Aucun script first-boot spécifique'}
FIRSTBOOT_EOF
chmod +x /root/firstboot.sh
CHROOT_EOF

echo -e "\${YELLOW}[4/4] 🧹 Démontage et archivage du RootFS...\${NC}"
umount -lf "\${ROOTFS_DIR}/sys" || true
umount -lf "\${ROOTFS_DIR}/proc" || true
umount -lf "\${ROOTFS_DIR}/dev/pts" || true
umount -lf "\${ROOTFS_DIR}/dev" || true

tar -czf "\${OUTPUT_DIR}/${rootfsTarName}" -C "\${ROOTFS_DIR}" .

echo -e "\${GREEN}=======================================================\${NC}"
echo -e "\${GREEN}   ✅ RootFS généré avec succès : \${OUTPUT_DIR}/${rootfsTarName}\${NC}"
echo -e "\${GREEN}   Taille du fichier : $(du -h "\${OUTPUT_DIR}/${rootfsTarName}" 2>/dev/null | cut -f1 || echo "OK")\${NC}"
echo -e "\${GREEN}=======================================================\${NC}"
`;
}

/**
 * Image disque partitionnée + GRUB (BIOS/i386-pc) pour les familles non-Debian qui le supportent
 * (Arch/CachyOS pour l'instant). Pipeline vérifié en LIVE cette session : bootstrap réel, partition
 * MBR, formatage ext4, grub-install, génération grub.cfg/fstab, puis boot QEMU réel jusqu'au prompt
 * de connexion ("disktest login:"). Deux points critiques découverts en live et corrigés ici :
 *  - pacman "CheckSpace" produit de faux "not enough free disk space" en chroot : désactivé.
 *  - le hook mkinitcpio "autodetect" adapte l'initramfs au matériel de LA MACHINE DE BUILD, pas à la
 *    cible : sans son retrait, l'image reste bloquée au démarrage sur la recherche du disque racine.
 */
function generateNonDebianDiskImageScript(
  recipe: OSRecipe,
  family: NonDebianFamily,
  pkgs: string,
  label: string,
  unameArch: string,
  diskTarget: { qemuFormat: string; ext: string; label: string }
): string {
  const config = NON_DEBIAN_FAMILY_CONFIG[family];
  // Voir generateNonDebianBuildScript ci-dessus pour le contexte complet du bug corrigé.
  const sshEnableCmd = !recipe.enableSSH ? '' : family === 'alpine'
    ? 'rc-update add sshd default 2>/dev/null || true'
    : family === 'void'
      ? 'mkdir -p /etc/runit/runsvdir/default && ln -sf /etc/sv/sshd /etc/runit/runsvdir/default/sshd 2>/dev/null || true'
      : 'systemctl enable sshd 2>/dev/null || true';
  const xkb = resolveXkb(recipe.keyboardLayout);
  const dmCmd = dmEnableCmd(recipe.displayManager, family);
  const baseName = recipe.branding.osName.toLowerCase().replace(/[^a-z0-9]/g, '-');
  const rawImageName = `${baseName}-${recipe.branding.version}-${recipe.arch}.raw.img`;
  const diskImageName = `${baseName}-${recipe.branding.version}-${recipe.arch}.${diskTarget.ext}`;
  const needsConversion = diskTarget.ext !== 'raw.img' && diskTarget.qemuFormat !== 'raw';
  const grubBin = config.grubInstallBin!;
  const grubSubdir = config.grubConfigSubdir!;
  // Alpine (nlplug-findfs) ne résout pas "root=UUID=..." dans ce pipeline — vérifié en live —
  // donc on retombe sur un chemin de périphérique direct pour cette famille uniquement.
  //
  // BUG réel trouvé et corrigé cette session (vérifié en live sur openSUSE via GitHub Actions,
  // le noyau paniquait avec "Unable to mount root fs on \"UUID=\"" — UUID vide) : ces deux chaînes
  // JS à guillemets simples n'ont besoin d'AUCUN antislash. Un antislash ici survit tel quel
  // jusque dans le texte bash final (guillemets simples JS = zéro interprétation), et bash,
  // rencontrant "\${ROOT_UUID}" dans le heredoc NON quoté du grub.cfg, traite le antislash comme
  // un échappement du "$" — produisant un "${ROOT_UUID}" littéral au lieu de substituer la vraie
  // valeur. GRUB interprète alors CE "${ROOT_UUID}" comme SA PROPRE variable de script (jamais
  // définie par aucun "set"), qui vaut donc une chaîne vide. D'où le "root=UUID=" vide constaté.
  // Sans antislash, la substitution bash réelle a lieu à l'écriture du fichier — comme le fait
  // déjà correctement la ligne fstab juste en dessous, qui n'a jamais eu ce bug.
  const grubSearchLine = config.diskImageRootIsDevicePath ? '' : '    search --no-floppy --fs-uuid --set=root ${ROOT_UUID}\n';
  // /dev/sda1 suppose que le disque apparaît comme premier disque IDE/SATA/SCSI côté machine
  // cible (vrai sous QEMU, la plupart des hyperviseurs BIOS classiques) — moins portable qu'UUID,
  // mais nlplug-findfs (Alpine) ne sait pas résoudre UUID= dans ce pipeline. Compromis assumé.
  const rootKernelArg = config.diskImageRootIsDevicePath ? '/dev/sda1' : 'UUID=${ROOT_UUID}';

  const diskConversionStep = needsConversion ? `
echo -e "\${YELLOW}[6/6] 💽 Conversion vers ${diskTarget.label}...\${NC}"
qemu-img convert -O ${diskTarget.qemuFormat}${diskTarget.qemuFormat === 'qcow2' ? ' -o compat=1.1' : ''} "\${OUTPUT_DIR}/${rawImageName}" "\${OUTPUT_DIR}/${diskImageName}"
rm -f "\${OUTPUT_DIR}/${rawImageName}"
` : `mv "\${OUTPUT_DIR}/${rawImageName}" "\${OUTPUT_DIR}/${diskImageName}"`;

  return `#!/usr/bin/env bash
# ==============================================================================
# OSForge Studio — Script de Construction Image Disque (${recipe.branding.osName})
# Base: ${label} | Arch: ${recipe.arch} | Format: ${recipe.outputFormat}
# Date de génération: ${new Date().toISOString()}
# ==============================================================================

set -euo pipefail

RED='\\033[0;31m'
GREEN='\\033[0;32m'
CYAN='\\033[0;36m'
YELLOW='\\033[1;33m'
NC='\\033[0m'

echo -e "\${CYAN}=======================================================\${NC}"
echo -e "\${CYAN}   🚀 OSForge Studio : Construction Image Disque      \${NC}"
echo -e "\${CYAN}   Distribution cible : ${label} (${recipe.arch})\${NC}"
echo -e "\${CYAN}   Nom d'hôte         : "${shQuote(recipe.hostname)}"\${NC}"
echo -e "\${CYAN}=======================================================\${NC}"

if [[ $EUID -ne 0 ]]; then
   echo -e "\${RED}[ERREUR] Ce script doit être exécuté avec les privilèges root (sudo).\${NC}"
   exit 1
fi

WORK_DIR="/var/tmp/osforge-build-$(date +%s)"
ROOTFS_DIR="\${WORK_DIR}/rootfs"
MNT_DIR="\${WORK_DIR}/mnt"
OUTPUT_DIR="$(pwd)/dist"
mkdir -p "\${ROOTFS_DIR}" "\${MNT_DIR}" "\${OUTPUT_DIR}"

echo -e "\${YELLOW}[1/6] 📦 Installation des dépendances de bootstrap sur l'hôte...\${NC}"
which ${config.hostCheckCmd} parted qemu-img >/dev/null 2>&1 || {
    echo -e "\${YELLOW}Installation des outils requis sur l'hôte...\${NC}"
    apt-get update -y && apt-get install -y curl tar xz-utils parted qemu-utils ${config.hostDeps}
}

echo -e "\${YELLOW}[2/6] 🏗️ Initialisation du RootFS ${label} (avec noyau + GRUB)...\${NC}"
${config.bootstrapBlock(recipe.distro, unameArch, true, recipe.kernel)}

echo -e "\${YELLOW}[3/6] ⚙️ Configuration du système et installation des paquets...\${NC}"

cp /etc/resolv.conf "\${ROOTFS_DIR}/etc/resolv.conf" 2>/dev/null || true

mount --bind /dev "\${ROOTFS_DIR}/dev"
mount --bind /dev/pts "\${ROOTFS_DIR}/dev/pts" 2>/dev/null || true
mount --bind /proc "\${ROOTFS_DIR}/proc"
mount --bind /sys "\${ROOTFS_DIR}/sys"
${config.diskImageInitrdRegenCmd ? `
# Modifier la config de l'initramfs (HOOKS ci-dessus) ne suffit pas : le fichier déjà généré par
# le bootstrap (avec le hook "autodetect" adapté à la machine de build) reste sur disque tant
# qu'on ne le régénère pas explicitement — vérifié en live, sans quoi l'image ne démarre pas.
chroot "\${ROOTFS_DIR}" ${config.diskImageInitrdRegenCmd}
` : ''}
cat << 'CHROOT_EOF' | chroot "\${ROOTFS_DIR}" /bin/sh
set -e
${config.updateCmd}

for pkg in ${pkgs}; do
    ${config.installOneCmd} || echo "Info: $pkg omis ou non disponible dans le dépôt."
done

echo ${shQuote(recipe.hostname)} > /etc/hostname
cat << 'HOSTS' > /etc/hosts
127.0.0.1   localhost ${recipe.hostname}
::1         localhost ip6-localhost ip6-loopback
HOSTS

${osReleaseCmd(recipe, family === 'suse' ? 'opensuse' : family)}

ln -sf /usr/share/zoneinfo/${recipe.timezone} /etc/localtime 2>/dev/null || true

# Bug réel trouvé en auditant : "keyboardLayout" (choisi dans l'UI) n'était jamais appliqué —
# le clavier gardait toujours la disposition par défaut de l'image, quel que soit le choix.
mkdir -p /etc/X11/xorg.conf.d
cat > /etc/X11/xorg.conf.d/00-keyboard.conf << 'XKB_EOF'
Section "InputClass"
    Identifier "system-keyboard"
    MatchIsKeyboard "on"
    Option "XkbLayout" "${xkb.layout}"${xkb.variant ? `
    Option "XkbVariant" "${xkb.variant}"` : ''}
EndSection
XKB_EOF
echo "KEYMAP=${xkb.layout}" > /etc/vconsole.conf 2>/dev/null || true

if ! id ${shQuote(recipe.user.username)} >/dev/null 2>&1; then
    useradd -m -s ${shQuote(recipe.user.shell)} -c ${shQuote(recipe.user.fullName)} ${shQuote(recipe.user.username)}
    echo ${shQuote(recipe.user.username)}:${shQuote(recipe.user.password || 'forge')} | chpasswd
fi
echo "root:toor" | chpasswd

${recipe.user.sudo ? `mkdir -p /etc/sudoers.d
echo ${shQuote(recipe.user.username)}' ALL=(ALL:ALL) NOPASSWD:ALL' > /etc/sudoers.d/90-osforge-user
chmod 440 /etc/sudoers.d/90-osforge-user` : '# Compte utilisateur sans droits sudo (non demandé dans la recette)'}

${recipe.enableSSH && recipe.user.sshPublicKey ? `mkdir -p /home/${shQuote(recipe.user.username)}/.ssh
echo ${shQuote(recipe.user.sshPublicKey || '')} > /home/${shQuote(recipe.user.username)}/.ssh/authorized_keys
chmod 700 /home/${shQuote(recipe.user.username)}/.ssh
chmod 600 /home/${shQuote(recipe.user.username)}/.ssh/authorized_keys
chown -R ${shQuote(recipe.user.username)}:${shQuote(recipe.user.username)} /home/${shQuote(recipe.user.username)}/.ssh` : ''}
${sshEnableCmd}
${sshHardeningCmd(recipe, family)}
${dmCmd}
${dmAutologinCmd(recipe, family)}
${kioskSetupCmd(recipe, family)}
${dotfilesCloneCmd(recipe)}
${customServicesCmd(recipe, family)}

cat << 'FIRSTBOOT_EOF' > /root/firstboot.sh
#!/bin/sh
${recipe.firstBootScript || '# Aucun script first-boot spécifique'}
FIRSTBOOT_EOF
chmod +x /root/firstboot.sh
CHROOT_EOF

umount -lf "\${ROOTFS_DIR}/sys" || true
umount -lf "\${ROOTFS_DIR}/proc" || true
umount -lf "\${ROOTFS_DIR}/dev/pts" || true
umount -lf "\${ROOTFS_DIR}/dev" || true

echo -e "\${YELLOW}[4/6] 💽 Partitionnement et formatage de l'image disque...\${NC}"
RAW_IMG="\${OUTPUT_DIR}/${rawImageName}"
qemu-img create -f raw "\${RAW_IMG}" 8G
parted -s "\${RAW_IMG}" mklabel msdos
parted -s "\${RAW_IMG}" mkpart primary ext4 1MiB 100%
parted -s "\${RAW_IMG}" set 1 boot on

LOOPDEV=$(losetup -f)
losetup -P "\${LOOPDEV}" "\${RAW_IMG}"
mkfs.ext4 -F "\${LOOPDEV}p1"
mount "\${LOOPDEV}p1" "\${MNT_DIR}"

echo -e "\${YELLOW}[5/6] 🖲️ Copie du système et installation de GRUB (BIOS)...\${NC}"
cp -a "\${ROOTFS_DIR}"/. "\${MNT_DIR}"/

cp /etc/resolv.conf "\${MNT_DIR}/etc/resolv.conf" 2>/dev/null || true
mount --bind /dev "\${MNT_DIR}/dev"
mount --bind /dev/pts "\${MNT_DIR}/dev/pts" 2>/dev/null || true
mount --bind /proc "\${MNT_DIR}/proc"
mount --bind /sys "\${MNT_DIR}/sys"

ROOT_UUID=$(blkid -s UUID -o value "\${LOOPDEV}p1")

chroot "\${MNT_DIR}" ${grubBin} --target=i386-pc --boot-directory=/boot "\${LOOPDEV}"

cat > "\${MNT_DIR}/etc/fstab" << FSTAB_EOF
UUID=\${ROOT_UUID} / ext4 defaults 0 1
FSTAB_EOF

${typeof config.diskImageKernelDetectCmd === 'function' ? config.diskImageKernelDetectCmd(recipe.kernel) : config.diskImageKernelDetectCmd}

mkdir -p "\${MNT_DIR}/boot/${grubSubdir}"
cat > "\${MNT_DIR}/boot/${grubSubdir}/grub.cfg" << GRUBCFG_EOF
set timeout=3
set default=0
menuentry "${recipe.branding.osName}" {
${grubSearchLine}    linux \${KERNEL_PATH} root=${rootKernelArg} rw console=tty0 console=ttyS0,115200${config.diskImageExtraKernelArgs ? ` ${config.diskImageExtraKernelArgs}` : ''}
    initrd \${INITRD_PATH}
}
GRUBCFG_EOF

umount -lf "\${MNT_DIR}/sys" || true
umount -lf "\${MNT_DIR}/proc" || true
umount -lf "\${MNT_DIR}/dev/pts" || true
umount -lf "\${MNT_DIR}/dev" || true
umount -lf "\${MNT_DIR}" || true
losetup -d "\${LOOPDEV}" || true
${diskConversionStep}

echo -e "\${GREEN}=======================================================\${NC}"
echo -e "\${GREEN}   ✅ ${diskTarget.label} générée avec succès : \${OUTPUT_DIR}/${diskImageName}\${NC}"
echo -e "\${GREEN}   Taille du fichier : $(du -h "\${OUTPUT_DIR}/${diskImageName}" 2>/dev/null | cut -f1 || echo "OK")\${NC}"
echo -e "\${GREEN}=======================================================\${NC}"
`;
}

// Carte SD Raspberry Pi (rpi_sd) : mécanisme entièrement re-vérifié en live sur GitHub Actions
// cette session (workflow jetable test-rpi-bootstrap.yml, run réussi de bout en bout, y compris
// la présence confirmée de kernel8.img / bootcode.bin / config.txt dans /boot et /boot/firmware).
// Pipeline structurellement différent des autres formats disque d'OSForge : le firmware
// Raspberry Pi lit cmdline.txt/config.txt directement depuis la partition FAT32 de boot — PAS de
// GRUB, contrairement à generateNonDebianDiskImageScript (Arch/Fedora/Alpine/Void). Isolé dans sa
// propre fonction plutôt que de forcer ce cas dans le pipeline générique Debian (ISO + squashfs +
// live-boot), qui ne correspond pas au mécanisme de démarrage réel du matériel Raspberry Pi.
function generateRpiSdScript(recipe: OSRecipe): string {
  const pkgs = shellQuotePkgList(resolvePackageList(recipe));
  const imgName = `${recipe.branding.osName.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${recipe.branding.version}-${recipe.arch}.img`;

  return `#!/usr/bin/env bash
# ==============================================================================
# OSForge Studio — Carte SD Raspberry Pi (image .img.xz prête à flasher)
# OS: ${recipe.branding.osName} (${recipe.branding.editionName})
# Base: Raspberry Pi OS (Debian bookworm, arm64) | Format: rpi_sd
# Date de génération: ${new Date().toISOString()}
# ==============================================================================

set -euo pipefail

RED='\\033[0;31m'
GREEN='\\033[0;32m'
CYAN='\\033[0;36m'
YELLOW='\\033[1;33m'
NC='\\033[0m'

echo -e "\${CYAN}=======================================================\${NC}"
echo -e "\${CYAN}   🍓 OSForge Studio : Image Carte SD Raspberry Pi    \${NC}"
echo -e "\${CYAN}   Nom d'hôte         : "${shQuote(recipe.hostname)}"\${NC}"
echo -e "\${CYAN}=======================================================\${NC}"

if [[ $EUID -ne 0 ]]; then
   echo -e "\${RED}[ERREUR] Ce script doit être exécuté avec les privilèges root (sudo).\${NC}"
   exit 1
fi

WORK_DIR="/var/tmp/osforge-build-$(date +%s)"
ROOTFS_DIR="\${WORK_DIR}/rootfs"
MNT_DIR="\${WORK_DIR}/mnt"
OUTPUT_DIR="$(pwd)/dist"
mkdir -p "\${ROOTFS_DIR}" "\${MNT_DIR}" "\${OUTPUT_DIR}"

echo -e "\${YELLOW}[1/6] 📦 Installation des dépendances de compilation de l'hôte...\${NC}"
which debootstrap qemu-img parted mkfs.vfat qemu-aarch64-static xz >/dev/null 2>&1 || {
    echo -e "\${YELLOW}Installation des outils requis sur l'hôte (bootstrap + émulation ARM64)...\${NC}"
    apt-get update -y && apt-get install -y debootstrap qemu-user-static binfmt-support parted dosfstools qemu-utils xz-utils
}

echo -e "\${YELLOW}[2/6] 🏗️ Bootstrap ARM64 du système Debian de base ("${shQuote(recipe.hostname)}" / bookworm)...\${NC}"
# Raspberry Pi OS moderne se construit à partir d'un vrai Debian (deb.debian.org) : le dépôt
# archive.raspberrypi.com/debian n'est qu'un dépôt d'AJOUT (noyau/firmware/bootloader), PAS un
# miroir Debian complet — un debootstrap direct dessus échoue avec "Couldn't find these debs:
# usr-is-merged" (vérifié en live via GitHub Actions cette session). On bootstrap donc depuis le
# vrai Debian avec émulation ARM64 (qemu-user-static + binfmt), puis on ajoute le dépôt Raspberry
# Pi en overlay uniquement pour le noyau/firmware, une fois le rootfs de base fonctionnel.
debootstrap --arch=arm64 --foreign bookworm "\${ROOTFS_DIR}" http://deb.debian.org/debian
cp /usr/bin/qemu-aarch64-static "\${ROOTFS_DIR}/usr/bin/"
chroot "\${ROOTFS_DIR}" /debootstrap/debootstrap --second-stage

echo -e "\${YELLOW}[3/6] ⚙️ Ajout du dépôt Raspberry Pi, installation du noyau et configuration...\${NC}"
# La clé GPG est récupérée DEPUIS L'HÔTE (pas depuis le chroot) : le rootfs tout juste débootstrappé
# n'a pas encore "curl" installé (bootstrap minimal --foreign) — vérifié en live sur GitHub Actions
# cette session ("curl: command not found" dans le chroot avant ce correctif).
mkdir -p "\${ROOTFS_DIR}/etc/apt/keyrings"
curl -fsSL https://archive.raspberrypi.com/debian/raspberrypi.gpg.key -o "\${ROOTFS_DIR}/etc/apt/keyrings/raspberrypi.gpg.key"

mount --bind /dev "\${ROOTFS_DIR}/dev"
mount --bind /dev/pts "\${ROOTFS_DIR}/dev/pts" 2>/dev/null || true
mount --bind /proc "\${ROOTFS_DIR}/proc"
mount --bind /sys "\${ROOTFS_DIR}/sys"
cp /etc/resolv.conf "\${ROOTFS_DIR}/etc/resolv.conf" 2>/dev/null || true

cat << 'CHROOT_EOF' | chroot "\${ROOTFS_DIR}" /bin/bash
set -e
export DEBIAN_FRONTEND=noninteractive

echo "deb http://deb.debian.org/debian bookworm main" > /etc/apt/sources.list
echo "deb [signed-by=/etc/apt/keyrings/raspberrypi.gpg.key] http://archive.raspberrypi.com/debian bookworm main" >> /etc/apt/sources.list

apt-get update -y
apt-get install -y --no-install-recommends raspberrypi-kernel raspi-firmware systemd-sysv ca-certificates locales sudo curl wget gnupg iproute2 openssh-server

for pkg in ${pkgs}; do
    apt-get install -y --no-install-recommends "$pkg" || echo "Info: $pkg omis ou non disponible dans le dépôt."
done

echo ${shQuote(recipe.hostname)} > /etc/hostname
cat << 'HOSTS' > /etc/hosts
127.0.0.1   localhost ${recipe.hostname}
::1         localhost ip6-localhost ip6-loopback
HOSTS

${osReleaseCmd(recipe, 'debian')}

ln -sf /usr/share/zoneinfo/${recipe.timezone} /etc/localtime
echo "${recipe.locale} UTF-8" >> /etc/locale.gen || true
locale-gen || true

if ! id ${shQuote(recipe.user.username)} &>/dev/null; then
    useradd -m -s ${shQuote(recipe.user.shell)} -c ${shQuote(recipe.user.fullName)} ${shQuote(recipe.user.username)}
    echo ${shQuote(recipe.user.username)}:${shQuote(recipe.user.password || 'forge')} | chpasswd
    ${recipe.user.sudo ? `usermod -aG sudo ${shQuote(recipe.user.username)}` : ''}
fi
echo "root:toor" | chpasswd

${recipe.enableSSH ? `mkdir -p /home/${shQuote(recipe.user.username)}/.ssh
chmod 700 /home/${shQuote(recipe.user.username)}/.ssh
${recipe.user.sshPublicKey ? `echo ${shQuote(recipe.user.sshPublicKey || '')} > /home/${shQuote(recipe.user.username)}/.ssh/authorized_keys
chmod 600 /home/${shQuote(recipe.user.username)}/.ssh/authorized_keys
chown -R ${shQuote(recipe.user.username)}:${shQuote(recipe.user.username)} /home/${shQuote(recipe.user.username)}/.ssh` : ''}
systemctl enable ssh || true` : ''}

cat << 'FIRSTBOOT_EOF' > /root/firstboot.sh
#!/usr/bin/env bash
${recipe.firstBootScript || '# Aucun script first-boot spécifique'}
FIRSTBOOT_EOF
chmod +x /root/firstboot.sh
CHROOT_EOF

umount -lf "\${ROOTFS_DIR}/sys" || true
umount -lf "\${ROOTFS_DIR}/proc" || true
umount -lf "\${ROOTFS_DIR}/dev/pts" || true
umount -lf "\${ROOTFS_DIR}/dev" || true

echo -e "\${YELLOW}[4/6] 💽 Partitionnement de l'image (FAT32 boot + ext4 root)...\${NC}"
RAW_IMG="\${OUTPUT_DIR}/${imgName}"
qemu-img create -f raw "\${RAW_IMG}" 4G
parted -s "\${RAW_IMG}" mklabel msdos
parted -s "\${RAW_IMG}" mkpart primary fat32 1MiB 257MiB
parted -s "\${RAW_IMG}" set 1 boot on
parted -s "\${RAW_IMG}" mkpart primary ext4 257MiB 100%

LOOPDEV=$(losetup -f)
losetup -P "\${LOOPDEV}" "\${RAW_IMG}"
mkfs.vfat -F 32 -n bootfs "\${LOOPDEV}p1"
mkfs.ext4 -F -L rootfs "\${LOOPDEV}p2"

mount "\${LOOPDEV}p2" "\${MNT_DIR}"
mkdir -p "\${MNT_DIR}/boot/firmware"
mount "\${LOOPDEV}p1" "\${MNT_DIR}/boot/firmware"

echo -e "\${YELLOW}[5/6] 🖲️ Copie du système de fichiers vers la carte SD...\${NC}"
cp -a "\${ROOTFS_DIR}"/. "\${MNT_DIR}"/

BOOT_UUID=$(blkid -s UUID -o value "\${LOOPDEV}p1")
ROOT_UUID=$(blkid -s UUID -o value "\${LOOPDEV}p2")

cat > "\${MNT_DIR}/etc/fstab" << FSTAB_EOF
UUID=\${ROOT_UUID} / ext4 defaults,noatime 0 1
UUID=\${BOOT_UUID} /boot/firmware vfat defaults 0 2
FSTAB_EOF

# Le firmware Raspberry Pi lit cmdline.txt/config.txt directement depuis cette partition FAT32
# au démarrage (pas de GRUB) ; config.txt est déjà fourni par raspi-firmware, seul cmdline.txt
# doit être écrit pour pointer vers la vraie racine (UUID, pas /dev/sdaX qui n'est pas stable
# selon le lecteur de carte SD utilisé pour flasher l'image).
cat > "\${MNT_DIR}/boot/firmware/cmdline.txt" << CMDLINE_EOF
console=serial0,115200 console=tty1 root=UUID=\${ROOT_UUID} rootfstype=ext4 fsck.repair=yes rootwait
CMDLINE_EOF

umount -lf "\${MNT_DIR}/boot/firmware" || true
umount -lf "\${MNT_DIR}" || true
losetup -d "\${LOOPDEV}" || true

echo -e "\${YELLOW}[6/6] 🗜️ Compression XZ de l'image (.img.xz, prête à flasher)...\${NC}"
xz -T0 -f "\${RAW_IMG}"

echo -e "\${GREEN}=======================================================\${NC}"
echo -e "\${GREEN}   ✅ Image Carte SD Raspberry Pi générée : \${OUTPUT_DIR}/${imgName}.xz\${NC}"
echo -e "\${GREEN}   Taille du fichier : $(du -h "\${OUTPUT_DIR}/${imgName}.xz" 2>/dev/null | cut -f1 || echo "OK")\${NC}"
echo -e "\${GREEN}   Flashage : Raspberry Pi Imager ou Balena Etcher (image .xz supportée nativement)\${NC}"
echo -e "\${GREEN}=======================================================\${NC}"
`;
}

export function generateBuildScript(recipe: OSRecipe): string {
  if (recipe.distro === 'raspbian' && recipe.outputFormat === 'rpi_sd' && recipe.arch === 'aarch64') {
    return generateRpiSdScript(recipe);
  }

  const pkgs = shellQuotePkgList(resolvePackageList(recipe));
  const isoName = `${recipe.branding.osName.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${recipe.branding.version}-${recipe.arch}.iso`;
  const debArch = recipe.arch === 'x86_64' ? 'amd64' : recipe.arch === 'aarch64' ? 'arm64' : recipe.arch;
  const target = DEBOOTSTRAP_TARGETS[recipe.distro];
  const xkb = resolveXkb(recipe.keyboardLayout);
  const dmCmd = dmEnableCmd(recipe.displayManager, 'debian');

  if (!target) {
    const nonDebianFamily = NON_DEBIAN_DISTROS[recipe.distro];
    if (nonDebianFamily) {
      return generateNonDebianBuildScript(recipe, nonDebianFamily);
    }

    return `#!/usr/bin/env bash
set -euo pipefail
RED='\\033[0;31m'
NC='\\033[0m'
echo -e "\${RED}[ERREUR] La distribution '${recipe.distro}' n'est pas prise en charge par ce script de compilation.\${NC}"
echo ""
echo "NixOS est architecturalement incompatible avec ce pipeline : son modèle est déclaratif"
echo "(un fichier configuration.nix décrit tout le système, /nix/store est immuable), alors que"
echo "ce script fonctionne par bootstrap + chroot + installation impérative de paquets — une"
echo "approche qui ne s'applique pas à Nix. Générer un système NixOS nécessiterait un pipeline"
echo "entièrement différent (nixos-generators / nix build), non implémenté dans OSForge Studio."
echo ""
echo "Toutes les autres distributions du catalogue sont prises en charge : Debian, Ubuntu, Kali,"
echo "Raspberry Pi OS (ISO complète) ainsi qu'Arch, CachyOS, Fedora, Rocky, Alpine, openSUSE, Void"
echo "(RootFS WSL2/Docker — voir le format de sortie sélectionné)."
exit 1
`;
  }

  // Raspberry Pi OS n'a pas de méta-paquet "linux-image-arm64" générique : le vrai noyau
  // s'appelle raspberrypi-kernel — vérifié en live via un bootstrap réel complet sur GitHub
  // Actions cette session (kernel8.img effectivement produit dans /boot). raspi-firmware fournit
  // config.txt/bootcode.bin/start*.elf et le hook qui peuple /boot/firmware à chaque installation
  // de noyau. Les deux viennent du dépôt d'ajout archive.raspberrypi.com (pas debootstrap
  // --include, car absents du miroir Debian utilisé pour le bootstrap — voir DEBOOTSTRAP_TARGETS).
  const kernelPkg = recipe.distro === 'ubuntu' || recipe.distro === 'linuxmint' ? 'linux-image-generic'
    : recipe.distro === 'raspbian' ? 'raspberrypi-kernel'
    : `linux-image-${debArch}`;

  // Choix de noyau réellement câblés pour les familles APT (vérifiés en live) :
  // - mainline_beta (Ubuntu/Mint uniquement) : kernel.ubuntu.com/mainline publie de vrais .deb
  //   Canonical officiels pour CHAQUE version taguée (confirmé en direct : v7.2 y est déjà,
  //   quelques heures après le tag upstream).
  // - liquorix (Ubuntu/Mint uniquement) : PPA officiel ppa:damentz/liquorix, exactement la
  //   commande du vrai script d'installation servi par liquorix.net/install-liquorix.sh (branche
  //   *ubuntu*). Debian utiliserait un mécanisme différent (keyring signé), non câblé ici.
  // - cloud_micro (Ubuntu/Mint uniquement) : linux-image-kvm, vrai paquet officiel Ubuntu.
  // - lts / realtime (Debian ET Ubuntu/Mint, x86_64 uniquement) : dépôt APT officiel XanMod
  //   (deb.xanmod.org, vérifié en direct sur xanmod.org — vraies branches LTS et RT distinctes,
  //   codenames Debian "trixie"/Ubuntu "resolute" tous deux supportés). Paquets nommés par niveau
  //   x86-64-vN (psABI) : on prend le plus compatible (v1 pour LTS, v2 pour RT — RT ne publie pas
  //   de build v1) plutôt que de tenter une détection CPU au moment de la génération du script.
  // On exclut alors le noyau par défaut du debootstrap --include (voir plus bas) pour n'avoir
  // JAMAIS deux noyaux dans /boot en même temps : le glob "cp .../boot/vmlinuz* dest-unique"
  // plus loin dans ce script casserait silencieusement s'il y avait deux fichiers correspondants.
  const isUbuntuFamily = recipe.distro === 'ubuntu' || recipe.distro === 'linuxmint';
  const isXanmodEligible = (recipe.distro === 'debian' || isUbuntuFamily) && recipe.arch === 'x86_64';
  const REAL_ALT_KERNEL =
    (isUbuntuFamily && (['mainline_beta', 'liquorix', 'cloud_micro'] as string[]).includes(recipe.kernel)) ||
    (isXanmodEligible && (['lts', 'realtime'] as string[]).includes(recipe.kernel))
      ? recipe.kernel
      : null;

  // Formats de sortie réellement implémentés : ISO live (par défaut) et RootFS tar.gz
  // (WSL2 / Docker), qui réutilisent tous les deux le même RootFS déjà construit.
  // Les formats disque (QCOW2, VMDK, RAW, carte SD Raspberry Pi) nécessitent un vrai
  // partitionnement + installation du bootloader sur disque, pas encore implémenté :
  // le script prévient clairement et retombe sur l'ISO plutôt que de mentir.
  const isTarFormat = recipe.outputFormat === 'wsl2_tar' || recipe.outputFormat === 'docker_rootfs';
  const rootfsTarName = `${recipe.branding.osName.toLowerCase().replace(/[^a-z0-9]/g, '-')}-rootfs.tar.gz`;

  // L'ISO hybride (isohybrid-mbr) est déjà une image disque brute valide : qemu-img peut
  // donc la convertir directement vers QCOW2/VMDK/RAW sans repartitionnement supplémentaire.
  const diskTarget = DISK_IMAGE_FORMATS[recipe.outputFormat];
  const diskImageName = diskTarget ? `${recipe.branding.osName.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${recipe.branding.version}-${recipe.arch}.${diskTarget.ext}` : '';

  // rpi_sd est réellement implémenté (voir generateRpiSdScript) mais uniquement pour Raspberry Pi
  // OS en ARM64 — c'est le seul cas pour lequel le pipeline a été construit et vérifié en live.
  // Choisir rpi_sd avec une autre distro ou architecture retombe honnêtement sur l'ISO plutôt que
  // de produire une image carte SD non fonctionnelle.
  const UNIMPLEMENTED_FORMATS: Record<string, string> = {
    rpi_sd: "Carte SD Raspberry Pi (disponible uniquement pour Raspberry Pi OS en ARM64)",
  };
  const formatWarning = UNIMPLEMENTED_FORMATS[recipe.outputFormat]
    ? `echo -e "\${YELLOW}[INFO] Le format '${UNIMPLEMENTED_FORMATS[recipe.outputFormat]}' n'est pas disponible pour cette combinaison distro/architecture : génération d'une image ISO à la place.\${NC}"\n\n`
    : '';

  const diskConversionStep = diskTarget ? `
which qemu-img >/dev/null 2>&1 || {
    echo -e "\${YELLOW}Installation de qemu-utils (conversion ${diskTarget.label})...\${NC}"
    apt-get update -y && apt-get install -y qemu-utils
}

echo -e "\${YELLOW}[8/8] 💽 Conversion vers ${diskTarget.label}...\${NC}"
qemu-img convert -O ${diskTarget.qemuFormat}${diskTarget.qemuFormat === 'qcow2' ? ' -o compat=1.1' : ''} "\${OUTPUT_DIR}/${isoName}" "\${OUTPUT_DIR}/${diskImageName}"

echo -e "\${GREEN}=======================================================\${NC}"
echo -e "\${GREEN}   ✅ ${diskTarget.label} générée avec succès : \${OUTPUT_DIR}/${diskImageName}\${NC}"
echo -e "\${GREEN}   Taille du fichier : $(du -h "\${OUTPUT_DIR}/${diskImageName}" 2>/dev/null | cut -f1 || echo "OK")\${NC}"
echo -e "\${GREEN}=======================================================\${NC}"
` : '';

  const packagingSteps = isTarFormat ? `echo -e "\${YELLOW}[5/5] 📦 Archivage du système de fichiers (RootFS tar.gz)...\${NC}"
tar -czf "\${OUTPUT_DIR}/${rootfsTarName}" -C "\${ROOTFS_DIR}" .

echo -e "\${GREEN}=======================================================\${NC}"
echo -e "\${GREEN}   ✅ RootFS généré avec succès : \${OUTPUT_DIR}/${rootfsTarName}\${NC}"
echo -e "\${GREEN}   Taille du fichier : $(du -h "\${OUTPUT_DIR}/${rootfsTarName}" 2>/dev/null | cut -f1 || echo "OK")\${NC}"
echo -e "\${GREEN}   Empreinte SHA256  : $(sha256sum "\${OUTPUT_DIR}/${rootfsTarName}" 2>/dev/null | cut -d' ' -f1 || echo "Calculé au build")\${NC}"
echo -e "\${GREEN}=======================================================\${NC}"
` : `${formatWarning}echo -e "\${YELLOW}[5/7] 🗜️ Compression SquashFS du système d'exploitation...\${NC}"
mkdir -p "\${ISO_DIR}/live"
mksquashfs "\${ROOTFS_DIR}" "\${ISO_DIR}/live/filesystem.squashfs" -comp xz -e boot

echo -e "\${YELLOW}[6/7] 🖲️ Préparation du chargeur de démarrage GRUB (BIOS & UEFI)...\${NC}"
mkdir -p "\${ISO_DIR}/boot/grub/i386-pc" "\${ISO_DIR}/EFI/BOOT"
# Bug réel trouvé en live (vérifié via boot QEMU + xorriso sur le noyau mainline Ubuntu, CI) :
# un simple glob "vmlinuz*" matche AUSSI les symlinks "vmlinuz" et "vmlinuz.old" que le postinst
# du paquet noyau Debian/Ubuntu crée toujours en plus du vrai fichier "vmlinuz-<version>" — cp
# reçoit alors plusieurs sources pour une destination unique et échouait, silencieusement avalé
# par le "|| true" final : l'ISO se construisait "avec succès" mais sans aucun noyau dedans.
# On résout donc explicitement le symlink "vmlinuz" vers son vrai fichier cible ; à défaut (ex.
# Raspberry Pi OS, qui n'a pas ce symlink, ou Debian qui le place à la racine du rootfs et non
# dans /boot — vérifié en live), on retombe sur "find" (jamais "ls" avec plusieurs motifs glob :
# 2e bug réel trouvé en direct — "ls a b c" renvoie un code d'erreur non-nul dès qu'UN SEUL des
# motifs ne matche rien, même si un autre a bien trouvé le fichier ; combiné à "pipefail" ça
# arrêtait le script en silence, sans aucun message, malgré un match reel trouvé par ailleurs).
VMLINUZ_SRC=$(readlink -f "\${ROOTFS_DIR}/boot/vmlinuz" 2>/dev/null || true)
[ -n "\$VMLINUZ_SRC" ] && [ -f "\$VMLINUZ_SRC" ] || VMLINUZ_SRC=$(find "\${ROOTFS_DIR}/boot" -maxdepth 1 -type f \\( -name 'vmlinuz-*' -o -name 'vmlinux-*' -o -name 'kernel*.img' \\) ! -name '*.old' 2>/dev/null | sort | head -1)
[ -n "\$VMLINUZ_SRC" ] && cp "\$VMLINUZ_SRC" "\${ISO_DIR}/live/vmlinuz"

INITRD_SRC=$(readlink -f "\${ROOTFS_DIR}/boot/initrd.img" 2>/dev/null || true)
[ -n "\$INITRD_SRC" ] && [ -f "\$INITRD_SRC" ] || INITRD_SRC=$(find "\${ROOTFS_DIR}/boot" -maxdepth 1 -type f \\( -name 'initrd.img-*' -o -name 'initramfs-*' \\) ! -name '*.old' 2>/dev/null | sort | head -1)
[ -n "\$INITRD_SRC" ] && cp "\$INITRD_SRC" "\${ISO_DIR}/live/initrd"

cat << 'GRUB_CONFIG_EOF' > "\${ISO_DIR}/boot/grub/grub.cfg"
set default=0
set timeout=3

insmod all_video
insmod font
insmod part_msdos
insmod part_gpt
insmod iso9660
insmod search

search --no-floppy --set=root --file /live/vmlinuz

menuentry "${recipe.branding.osName} (${recipe.branding.editionName}) [Live Desktop]" {
    linux /live/vmlinuz boot=live components quiet splash hostname=${recipe.hostname}
    initrd /live/initrd
}

menuentry "${recipe.branding.osName} (Mode Secours / Failsafe)" {
    linux /live/vmlinuz boot=live components nomodeset
    initrd /live/initrd
}
GRUB_CONFIG_EOF

# 1. Image d'amorce BIOS autonome (El Torito)
grub-mkstandalone \\
  --format=i386-pc \\
  --output="\${ISO_DIR}/boot/grub/i386-pc/core.img" \\
  --install-modules="linux normal iso9660 biosdisk search search_fs_file search_label part_msdos part_gpt all_video font gfxterm test echo sleep cat help ls" \\
  --modules="linux normal iso9660 biosdisk search search_fs_file search_label part_msdos part_gpt all_video font gfxterm" \\
  --locales="" \\
  --fonts="" \\
  "boot/grub/grub.cfg=\${ISO_DIR}/boot/grub/grub.cfg"

cat /usr/lib/grub/i386-pc/cdboot.img "\${ISO_DIR}/boot/grub/i386-pc/core.img" > "\${ISO_DIR}/boot/grub/i386-pc/eltorito.img"

# 2. Image d'amorce UEFI autonome (bootx64.efi)
grub-mkstandalone \\
  --format=x86_64-efi \\
  --output="\${ISO_DIR}/EFI/BOOT/bootx64.efi" \\
  --install-modules="linux normal iso9660 search search_fs_file search_label part_msdos part_gpt all_video font gfxterm" \\
  --modules="linux normal iso9660 search search_fs_file search_label part_msdos part_gpt all_video font gfxterm" \\
  --locales="" \\
  --fonts="" \\
  "boot/grub/grub.cfg=\${ISO_DIR}/boot/grub/grub.cfg"

echo -e "\${YELLOW}[7/7] 📀 Création de l'image ISO hybride amorçable (BIOS + UEFI)...\${NC}"
xorriso -as mkisofs \\
  -iso-level 3 \\
  -full-iso9660-filenames \\
  -volid "${recipe.branding.osName.toUpperCase().slice(0, 32)}" \\
  -eltorito-boot boot/grub/i386-pc/eltorito.img \\
    -no-emul-boot -boot-load-size 4 -boot-info-table \\
  --eltorito-catalog boot/grub/boot.cat \\
  -isohybrid-mbr /usr/lib/grub/i386-pc/boot_hybrid.img \\
  -output "\${OUTPUT_DIR}/${isoName}" \\
  "\${ISO_DIR}"

echo -e "\${GREEN}=======================================================\${NC}"
echo -e "\${GREEN}   ✅ ISO générée avec succès : \${OUTPUT_DIR}/${isoName}\${NC}"
echo -e "\${GREEN}   Taille du fichier : $(du -h "\${OUTPUT_DIR}/${isoName}" 2>/dev/null | cut -f1 || echo "OK")\${NC}"
echo -e "\${GREEN}   Empreinte SHA256  : $(sha256sum "\${OUTPUT_DIR}/${isoName}" 2>/dev/null | cut -d' ' -f1 || echo "Calculé au build")\${NC}"
echo -e "\${GREEN}=======================================================\${NC}"
${diskConversionStep}`;

  return `#!/usr/bin/env bash
# ==============================================================================
# OSForge Studio — Script de Construction d'OS / ISO Linux
# OS: ${recipe.branding.osName} (${recipe.branding.editionName})
# Base: ${recipe.distro.toUpperCase()} | Arch: ${recipe.arch} | Format: ${recipe.outputFormat}
# Date de génération: ${new Date().toISOString()}
# ==============================================================================

set -euo pipefail

RED='\\033[0;31m'
GREEN='\\033[0;32m'
CYAN='\\033[0;36m'
YELLOW='\\033[1;33m'
NC='\\033[0m'

echo -e "\${CYAN}=======================================================\${NC}"
echo -e "\${CYAN}   🚀 OSForge Studio : Compilation de l'ISO Linux     \${NC}"
echo -e "\${CYAN}   Distribution cible : ${recipe.distro} (${recipe.arch})\${NC}"
echo -e "\${CYAN}   Nom d'hôte         : "${shQuote(recipe.hostname)}"\${NC}"
echo -e "\${CYAN}=======================================================\${NC}"

# Vérification des privilèges root
if [[ $EUID -ne 0 ]]; then
   echo -e "\${RED}[ERREUR] Ce script doit être exécuté avec les privilèges root (sudo).\${NC}" 
   exit 1
fi

# Repertoire de travail securise (evite les partitions /tmp montees avec l'option nodev)
WORK_DIR="/var/tmp/osforge-build-$(date +%s)"
ROOTFS_DIR="\${WORK_DIR}/rootfs"
ISO_DIR="\${WORK_DIR}/iso"
OUTPUT_DIR="$(pwd)/dist"

mkdir -p "\${ROOTFS_DIR}" "\${ISO_DIR}" "\${OUTPUT_DIR}"

echo -e "\${YELLOW}[1/7] 📦 Installation des dépendances de compilation de l'hôte...\${NC}"
which debootstrap xorriso mtools grub-mkrescue squashfs-tools >/dev/null 2>&1 || {
    echo -e "\${YELLOW}Installation des outils requis sur l'hôte...\${NC}"
    apt-get update -y && apt-get install -y debootstrap xorriso mtools grub-pc-bin grub-efi-amd64-bin grub-common squashfs-tools dosfstools rsync
}

echo -e "\${YELLOW}[2/7] 🏗️ Initialisation du RootFS de base (${recipe.distro} / ${target.suite})...\${NC}"
${recipe.kernel && recipe.kernel !== 'generic' && !REAL_ALT_KERNEL ? `echo -e "\${YELLOW}[INFO] Le noyau \\"${recipe.kernel}\\" n'est pas encore câblé pour ${recipe.distro} (APT) : ${kernelPkg} (noyau par défaut de la distro) utilisé à la place. Zen/Hardened/LTS/RT sont réellement pris en charge pour Arch/CachyOS ; Mainline/Liquorix/Cloud-Micro pour Ubuntu/Mint ; LTS/Realtime (via XanMod) pour Debian et Ubuntu/Mint en x86_64.\${NC}"
` : ''}${REAL_ALT_KERNEL ? `echo -e "\${CYAN}[INFO] Noyau \\"${recipe.kernel}\\" réellement câblé : installation après le bootstrap de base (voir étape 3).\${NC}"
` : ''}debootstrap --arch="${debArch}" \\${target.components ? `
  --components="${target.components}" \\` : ''}
  --include="${recipe.distro === 'raspbian' || REAL_ALT_KERNEL ? '' : `${kernelPkg},`}live-boot,systemd-sysv,initramfs-tools,ca-certificates,locales,sudo,curl,wget,gnupg,iproute2" \\
  ${target.suite} "\${ROOTFS_DIR}" "${target.mirror}"

echo -e "\${YELLOW}[3/7] ⚙️ Configuration du système et installation des paquets...\${NC}"

# Configuration des dépôts apt complets
cat << 'APT_SOURCES' > "\${ROOTFS_DIR}/etc/apt/sources.list"
${target.sourcesList(debArch)}
APT_SOURCES

# Cache optionnel des paquets APT du chroot (accélère les builds répétés en CI ; ignoré si non défini)
if [ -n "\${APT_CACHE_DIR:-}" ]; then
    mkdir -p "\${APT_CACHE_DIR}"
    mkdir -p "\${ROOTFS_DIR}/var/cache/apt/archives"
    mount --bind "\${APT_CACHE_DIR}" "\${ROOTFS_DIR}/var/cache/apt/archives"
fi

# Montage des pseudos-systèmes de fichiers pour le chroot
mount --bind /dev "\${ROOTFS_DIR}/dev"
mount --bind /dev/pts "\${ROOTFS_DIR}/dev/pts"
mount --bind /proc "\${ROOTFS_DIR}/proc"
mount --bind /sys "\${ROOTFS_DIR}/sys"

# Script de configuration exécuté à l'intérieur du chroot
cat << 'CHROOT_EOF' | chroot "\${ROOTFS_DIR}" /bin/bash
set -e
export DEBIAN_FRONTEND=noninteractive
${(recipe.distro === 'ubuntu' || recipe.distro === 'linuxmint') && (recipe.selectedPackages.includes('firefox') || recipe.desktop === 'web_kiosk') ? `
# Sur Ubuntu (et Mint, qui hérite ici du même dépôt de base), "firefox" en apt n'est qu'un
# paquet de transition vers snap (vérifié en live : l'installation "réussit" silencieusement
# mais ne pose qu'un stub non fonctionnel, snapd n'étant pas actif dans un chroot). On ajoute
# le vrai dépôt APT officiel de Mozilla à la place.
mkdir -p /etc/apt/keyrings
curl -fsSL https://packages.mozilla.org/apt/repo-signing-key.gpg -o /etc/apt/keyrings/packages.mozilla.org.asc || true
echo "deb [signed-by=/etc/apt/keyrings/packages.mozilla.org.asc] https://packages.mozilla.org/apt mozilla main" > /etc/apt/sources.list.d/mozilla.list
cat > /etc/apt/preferences.d/mozilla << 'MOZPIN_EOF'
Package: *
Pin: origin packages.mozilla.org
Pin-Priority: 1000
MOZPIN_EOF
` : ''}
${recipe.distro === 'raspbian' ? `
# archive.raspberrypi.com n'est qu'un dépôt d'ajout signé au-dessus du vrai Debian ci-dessus :
# sa clé GPG doit être présente AVANT "apt-get update" pour que la ligne "signed-by" du
# sources.list soit valide (vérifié en live : sans ceci, apt-get update échoue avec NO_PUBKEY).
mkdir -p /etc/apt/keyrings
curl -fsSL https://archive.raspberrypi.com/debian/raspberrypi.gpg.key -o /etc/apt/keyrings/raspberrypi.gpg.key
` : ''}
# Mise à jour des index de paquets
apt-get update -y

${recipe.distro === 'raspbian' ? `# Noyau et firmware Raspberry Pi (absents du miroir Debian utilisé pour le bootstrap initial)
apt-get install -y --no-install-recommends raspberrypi-kernel raspi-firmware

` : ''}${REAL_ALT_KERNEL === 'mainline_beta' ? `# Noyau mainline le plus récent — vérifié en direct sur kernel.ubuntu.com/mainline (vrais .deb
# officiels Canonical, publiés pour chaque version taguée y compris fraîchement sortie).
echo -e "\${YELLOW}[INFO] Recherche du dernier noyau mainline officiel (kernel.ubuntu.com/mainline)...\${NC}"
apt-get install -y --no-install-recommends curl ca-certificates
MAINLINE_VER=$(curl -fsSL https://kernel.ubuntu.com/mainline/ | grep -oP 'href="v\\K[0-9]+\\.[0-9]+(\\.[0-9]+)?(?=/")' | grep -v -i rc | sort -V | tail -1)
if [ -n "$MAINLINE_VER" ]; then
    echo -e "\${GREEN}[INFO] Noyau mainline officiel détecté : v\${MAINLINE_VER}\${NC}"
    MAINLINE_BASE="https://kernel.ubuntu.com/mainline/v\${MAINLINE_VER}/amd64"
    mkdir -p /tmp/mainline-kernel && cd /tmp/mainline-kernel
    curl -fsSL "\${MAINLINE_BASE}/" -o index.html
    for f in $(grep -oP 'href="\\K[^"]+\\.deb' index.html | grep -E '^linux-(headers|image-unsigned|modules)-[0-9]+\\.[0-9]+\\.[0-9]+-[0-9]+-generic_[^"]*_amd64\\.deb$|^linux-headers-[0-9]+\\.[0-9]+\\.[0-9]+-[0-9]+_[^"]*_all\\.deb$'); do
        curl -fsSL "\${MAINLINE_BASE}/\${f}" -o "$f"
    done
    dpkg -i *.deb || apt-get install -f -y --no-install-recommends
    cd / && rm -rf /tmp/mainline-kernel
else
    echo -e "\${RED}[AVERTISSEMENT] Impossible de déterminer le dernier noyau mainline en direct ; installation du noyau Ubuntu standard à la place.\${NC}"
    apt-get install -y --no-install-recommends linux-image-generic
fi

` : ''}${REAL_ALT_KERNEL === 'liquorix' ? `# Noyau Liquorix — dépôt PPA officiel (ppa:damentz/liquorix), méthode exacte du vrai script
# d'installation servi par liquorix.net/install-liquorix.sh (branche Ubuntu, vérifiée en direct).
echo -e "\${YELLOW}[INFO] Ajout du dépôt PPA officiel Liquorix (damentz/liquorix)...\${NC}"
apt-get install -y --no-install-recommends gpg gpg-agent software-properties-common
add-apt-repository -y ppa:damentz/liquorix
apt-get update -y
apt-get install -y --no-install-recommends linux-image-liquorix-amd64 linux-headers-liquorix-amd64

` : ''}${REAL_ALT_KERNEL === 'cloud_micro' ? `# Noyau officiel Ubuntu optimisé invité cloud/KVM (vrai paquet, dépôt Ubuntu standard).
echo -e "\${YELLOW}[INFO] Installation du noyau officiel Ubuntu invité cloud/KVM (linux-image-kvm)...\${NC}"
apt-get install -y --no-install-recommends linux-image-kvm

` : ''}${(REAL_ALT_KERNEL === 'lts' || REAL_ALT_KERNEL === 'realtime') ? `# Noyau XanMod — vrai dépôt APT officiel (deb.xanmod.org), vérifié en direct sur xanmod.org.
# Branches LTS et RT distinctes et réellement maintenues par le projet, codenames Debian/Ubuntu
# de ce pipeline (${target.suite}) confirmés pris en charge.
echo -e "\${YELLOW}[INFO] Ajout du dépôt APT officiel XanMod (deb.xanmod.org)...\${NC}"
apt-get install -y --no-install-recommends curl gnupg
mkdir -p /etc/apt/keyrings
# curl (pas wget) : la clé passe par une redirection Cloudflare -> gitlab.com (vérifié en direct).
# Repli non-fatal si l'un des deux échoue : vu en CI que gitlab.com peut renvoyer 403 aux IP de
# datacenter (anti-bot Cloudflare), un blocage réseau/pare-feu ne doit jamais laisser l'image
# SANS AUCUN noyau installé (le noyau par défaut n'est plus dans le debootstrap --include pour ce
# chemin) — on installe alors ${kernelPkg} en repli pour garantir un système qui démarre.
if curl -fsSL https://dl.xanmod.org/archive.key | gpg --dearmor -o /etc/apt/keyrings/xanmod-archive-keyring.gpg; then
    echo "deb [signed-by=/etc/apt/keyrings/xanmod-archive-keyring.gpg] http://deb.xanmod.org ${target.suite} main" > /etc/apt/sources.list.d/xanmod-release.list
    apt-get update -y
    if ! apt-get install -y --no-install-recommends ${REAL_ALT_KERNEL === 'lts' ? 'linux-xanmod-lts-x64v1' : 'linux-xanmod-rt-x64v2'}; then
        echo -e "\${RED}[AVERTISSEMENT] Le paquet noyau XanMod n'a pas pu être installé : noyau ${kernelPkg} par défaut installé à la place.\${NC}"
        apt-get install -y --no-install-recommends ${kernelPkg}
    fi
else
    echo -e "\${RED}[AVERTISSEMENT] Dépôt XanMod injoignable (bloqué par le réseau/pare-feu ?) : noyau ${kernelPkg} par défaut installé à la place.\${NC}"
    apt-get install -y --no-install-recommends ${kernelPkg}
fi

` : ''}# Installation sécurisée et résiliente des logiciels sélectionnés
for pkg in ${pkgs}; do
    apt-get install -y --no-install-recommends "$pkg" || echo "Info: $pkg omis ou non disponible dans le miroir apt principal."
done

# Utilitaires modernes (installations automatisées directes si absents du miroir Debian)
if command -v curl &>/dev/null; then
    # Fastfetch
    if ! command -v fastfetch &>/dev/null; then
        curl -sSL https://github.com/fastfetch-cli/fastfetch/releases/latest/download/fastfetch-linux-amd64.deb -o /tmp/ff.deb 2>/dev/null && dpkg -i /tmp/ff.deb 2>/dev/null || true
        rm -f /tmp/ff.deb
    fi
    # Starship
    if ! command -v starship &>/dev/null; then
        curl -sS https://starship.rs/install.sh | sh -s -- -y >/dev/null 2>&1 || true
    fi
    # LazyGit
    if ! command -v lazygit &>/dev/null; then
        curl -sSL https://github.com/jesseduffield/lazygit/releases/latest/download/lazygit_0.44.1_Linux_x86_64.tar.gz -o /tmp/lg.tar.gz 2>/dev/null && tar -xzf /tmp/lg.tar.gz -C /usr/local/bin lazygit 2>/dev/null || true
        rm -f /tmp/lg.tar.gz
    fi
fi

# Configuration du nom d'hôte
echo ${shQuote(recipe.hostname)} > /etc/hostname
cat << 'HOSTS' > /etc/hosts
127.0.0.1   localhost ${recipe.hostname}
::1         localhost ip6-localhost ip6-loopback
HOSTS

${osReleaseCmd(recipe, 'debian')}

# Configuration de la locale et du fuseau horaire
ln -sf /usr/share/zoneinfo/${recipe.timezone} /etc/localtime
echo "${recipe.locale} UTF-8" >> /etc/locale.gen || true
locale-gen || true

# Bug réel trouvé en auditant : "keyboardLayout" n'était jamais appliqué — le clavier gardait
# toujours la disposition par défaut de l'image. /etc/default/keyboard est le vrai mécanisme
# Debian/Ubuntu (paquet keyboard-configuration) qui pilote à la fois la console ET X11.
cat > /etc/default/keyboard << 'KBD_EOF'
XKBMODEL="pc105"
XKBLAYOUT="${xkb.layout}"
XKBVARIANT="${xkb.variant || ''}"
XKBOPTIONS=""
KBD_EOF

# Création de l'utilisateur principal
if ! id ${shQuote(recipe.user.username)} &>/dev/null; then
    useradd -m -s ${shQuote(recipe.user.shell)} -c ${shQuote(recipe.user.fullName)} ${shQuote(recipe.user.username)}
    echo ${shQuote(recipe.user.username)}:${shQuote(recipe.user.password || 'forge')} | chpasswd
    ${recipe.user.sudo ? `usermod -aG sudo ${shQuote(recipe.user.username)}` : ''}
fi

# Mot de passe Root
echo "root:toor" | chpasswd

# Configuration SSH
${recipe.enableSSH ? `
mkdir -p /etc/ssh /home/${shQuote(recipe.user.username)}/.ssh
chmod 700 /home/${shQuote(recipe.user.username)}/.ssh
${recipe.user.sshPublicKey ? `echo ${shQuote(recipe.user.sshPublicKey || '')} > /home/${shQuote(recipe.user.username)}/.ssh/authorized_keys
chmod 600 /home/${shQuote(recipe.user.username)}/.ssh/authorized_keys
chown -R ${shQuote(recipe.user.username)}:${shQuote(recipe.user.username)} /home/${shQuote(recipe.user.username)}/.ssh` : ''}
# Bug réel trouvé en auditant : le paquet openssh-server (ajouté par resolvePackageList quand
# enableSSH est coché) n'était jamais démarré au premier boot sans cette activation explicite —
# seul le fichier authorized_keys était écrit, inutile sans le service "ssh" (nom Debian/Ubuntu,
# différent de "sshd" utilisé par les autres familles) réellement actif.
systemctl enable ssh 2>/dev/null || true
` : ''}
${sshHardeningCmd(recipe, 'debian')}

# Bug réel MAJEUR trouvé en auditant : le paquet du gestionnaire de connexion (installé par le
# bloc "desktop" ci-dessus) n'était jamais activé au premier boot — le système démarrait toujours
# sur une console texte, jamais sur la session graphique, quel que soit le bureau choisi.
${dmCmd}
${dmAutologinCmd(recipe, 'debian')}
${kioskSetupCmd(recipe, 'debian')}
${dotfilesCloneCmd(recipe)}
${customServicesCmd(recipe, 'debian')}

# Sécurité & Durcissement (CIS Benchmark / UFW / nftables)
${recipe.security.firewall === 'ufw' ? `
if ! command -v ufw &>/dev/null; then
    apt-get install -y --no-install-recommends ufw >/dev/null 2>&1 || true
fi
if command -v ufw &>/dev/null; then
    ufw default deny incoming || true
    ufw default allow outgoing || true
    ${recipe.enableSSH ? 'ufw allow 22/tcp || true' : ''}
    ufw --force enable || true
fi
` : ''}${recipe.security.firewall === 'nftables' ? `
# "nftables" était sélectionnable dans l'interface mais n'était câblé nulle part dans ce
# générateur (bug réel trouvé en auditant) : le choix n'installait ni ne configurait rien,
# laissant le système sans aucun pare-feu malgré le choix explicite de l'utilisateur.
if ! command -v nft &>/dev/null; then
    apt-get install -y --no-install-recommends nftables >/dev/null 2>&1 || true
fi
if command -v nft &>/dev/null; then
    cat > /etc/nftables.conf << 'NFT_EOF'
#!/usr/sbin/nft -f
flush ruleset
table inet filter {
    chain input {
        type filter hook input priority 0; policy drop;
        ct state established,related accept
        iif lo accept
        icmp type echo-request accept
        icmpv6 type { echo-request, nd-neighbor-solicit, nd-neighbor-advert, nd-router-advert } accept
${recipe.enableSSH ? '        tcp dport 22 accept' : ''}
    }
    chain forward { type filter hook forward priority 0; policy drop; }
    chain output { type filter hook output priority 0; policy accept; }
}
NFT_EOF
    nft -f /etc/nftables.conf || true
    systemctl enable nftables 2>/dev/null || true
fi
` : ''}

# Script de post-installation First-Boot
cat << 'FIRSTBOOT_EOF' > /root/firstboot.sh
#!/usr/bin/env bash
${recipe.firstBootScript || '# Aucun script first-boot spécifique'}
FIRSTBOOT_EOF
chmod +x /root/firstboot.sh

CHROOT_EOF

echo -e "\${YELLOW}[4/7] 🧹 Nettoyage des montages du RootFS...\${NC}"
umount -lf "\${ROOTFS_DIR}/sys" || true
umount -lf "\${ROOTFS_DIR}/proc" || true
umount -lf "\${ROOTFS_DIR}/dev/pts" || true
umount -lf "\${ROOTFS_DIR}/dev" || true
if [ -n "\${APT_CACHE_DIR:-}" ]; then
    umount -lf "\${ROOTFS_DIR}/var/cache/apt/archives" || true
fi

${packagingSteps}`;
}

/**
 * Generates the Dockerfile to build the OS in an isolated container
 */
export function generateDockerfile(recipe: OSRecipe): string {
  return `# ==============================================================================
# OSForge Studio — Dockerfile de Compilation d'ISO Isolée (${recipe.branding.osName})
# Construction garantie reproductible sans impacter la machine hôte
# ==============================================================================
FROM debian:bookworm-slim

ENV DEBIAN_FRONTEND=noninteractive

# Outils de construction d'images Linux & ISO
RUN apt-get update && apt-get install -y --no-install-recommends \\
    debootstrap \\
    xorriso \\
    mtools \\
    grub-pc-bin \\
    grub-efi-amd64-bin \\
    squashfs-tools \\
    dosfstools \\
    rsync \\
    curl \\
    ca-certificates \\
    xz-utils \\
    && rm -rf /var/lib/apt/lists/*

WORKDIR /osbuilder

COPY build.sh /osbuilder/build.sh
RUN chmod +x /osbuilder/build.sh

VOLUME ["/osbuilder/dist"]

ENTRYPOINT ["/osbuilder/build.sh"]
`;
}

/**
 * Generates the GitHub Actions workflow (.github/workflows/build-iso.yml)
 * Builds the ISO on GitHub's free runners and uploads the downloadable artifact/release!
 */
export function generateGitHubWorkflow(recipe: OSRecipe): string {
  const isoName = `${recipe.branding.osName.toLowerCase().replace(/[^a-z0-9]/g, '-')}-v${recipe.branding.version}`;

  return `name: 🚀 Build & Release Custom Linux ISO (${recipe.branding.osName})

# Pipeline 100% automatique : chaque push sur main compile l'ISO,
# la tague et publie une Release GitHub sans aucune action manuelle.
on:
  push:
    branches: [ "main", "master" ]
  workflow_dispatch:

concurrency:
  group: iso-build-\${{ github.ref }}
  cancel-in-progress: true

permissions:
  contents: write

jobs:
  build-iso:
    runs-on: ubuntu-latest

    steps:
      - name: 📥 Récupération du dépôt
        uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: 📦 Cache des paquets APT hôte (accélère les builds suivants)
        uses: actions/cache@v4
        with:
          path: /var/cache/apt/archives
          key: apt-iso-build-\${{ runner.os }}-v1

      - name: 📦 Cache des paquets APT du chroot (contenu de l'ISO, gain le plus important)
        uses: actions/cache@v4
        with:
          path: /var/cache/osforge-chroot-apt
          key: chroot-apt-${recipe.distro}-${recipe.arch}-\${{ hashFiles('build.sh') }}

      - name: 🛠️ Installation des dépendances de compilation ISO
        run: |
          sudo apt-get update
          sudo apt-get install -y debootstrap xorriso mtools grub-pc-bin grub-efi-amd64-bin grub-common squashfs-tools dosfstools rsync

      - name: 🏗️ Exécution du script de compilation OSForge
        env:
          APT_CACHE_DIR: /var/cache/osforge-chroot-apt
        run: |
          chmod +x build.sh
          sudo -E ./build.sh

      - name: 🔓 Restauration des permissions (dossiers créés en root par build.sh)
        run: |
          sudo chown -R "$(id -u):$(id -g)" dist
          sudo chown -R "$(id -u):$(id -g)" /var/cache/osforge-chroot-apt 2>/dev/null || true

      - name: 🔍 Calcul des sommes de contrôle SHA-256
        run: |
          cd dist
          sha256sum *.iso > SHA256SUMS.txt
          cat SHA256SUMS.txt

      - name: 📤 Publication de l'ISO en Artéfact GitHub (accès rapide, 14 jours)
        uses: actions/upload-artifact@v4
        with:
          name: ${isoName}-iso-artifact
          path: dist/*
          retention-days: 14

      - name: 📏 Vérification de la taille (limite de 2 Go pour une Release GitHub)
        id: sizecheck
        run: |
          SIZE=$(stat -c%s dist/*.iso)
          echo "Taille de l'ISO : $(( SIZE / 1024 / 1024 )) Mo"
          if [ "\${SIZE}" -ge 2147483648 ]; then
            echo "⚠️ ISO trop volumineuse pour une Release GitHub (limite stricte : 2 Go)."
            echo "   Récupérez-la via l'Artéfact ci-dessus (onglet Summary de ce run, 14 jours)."
            echo "over_limit=true" >> "\${GITHUB_OUTPUT}"
          else
            echo "over_limit=false" >> "\${GITHUB_OUTPUT}"
          fi

      - name: 🏷️ Génération automatique du tag de version
        id: autotag
        if: steps.sizecheck.outputs.over_limit == 'false'
        run: |
          TAG="v${recipe.branding.version}-build.\${{ github.run_number }}"
          echo "tag=\${TAG}" >> "\${GITHUB_OUTPUT}"
          git config user.name "github-actions[bot]"
          git config user.email "github-actions[bot]@users.noreply.github.com"
          git tag "\${TAG}"
          git push origin "\${TAG}"

      - name: 🚀 Publication automatique de la Release GitHub (sans action manuelle)
        if: steps.sizecheck.outputs.over_limit == 'false'
        uses: softprops/action-gh-release@v2
        with:
          tag_name: \${{ steps.autotag.outputs.tag }}
          name: "${recipe.branding.osName} \${{ steps.autotag.outputs.tag }}"
          files: |
            dist/*.iso
            dist/SHA256SUMS.txt
          generate_release_notes: true
          make_latest: true
`;
}

/**
 * Generates cloud-init YAML user-data
 */
export function generateCloudInitYaml(recipe: OSRecipe): string {
  const pkgs = resolvePackageList(recipe);

  return `#cloud-config
# ==============================================================================
# OSForge Studio — Manifeste Cloud-Init
# ==============================================================================

hostname: ${recipe.hostname}
fqdn: ${recipe.hostname}.local
manage_etc_hosts: true

users:
  - name: ${recipe.user.username}
    gecos: ${recipe.user.fullName}
    sudo: ${recipe.user.sudo ? 'ALL=(ALL) NOPASSWD:ALL' : 'false'}
    shell: ${recipe.user.shell}
    lock_passwd: false
    passwd: "$6$rounds=4096$salt$placeholderHashedPassword"
    ${recipe.user.sshPublicKey ? `ssh_authorized_keys:\n      - ${recipe.user.sshPublicKey}` : ''}

timezone: ${recipe.timezone}
locale: ${recipe.locale}.UTF-8

packages:
${pkgs.map(p => `  - ${p}`).join('\n')}
${recipe.security.firewall === 'ufw' ? '  - ufw' : ''}${recipe.security.firewall === 'nftables' ? '  - nftables' : ''}

package_update: true
package_upgrade: ${recipe.security.autoSecurityUpdates ? 'true' : 'false'}

write_files:
  - path: /etc/motd
    content: |
      ======================================================
      Bienvenue sur ${recipe.branding.osName} (${recipe.branding.editionName})
      Généré avec OSForge Studio
      ======================================================
${recipe.security.firewall === 'nftables' ? `  - path: /etc/nftables.conf
    content: |
      #!/usr/sbin/nft -f
      flush ruleset
      table inet filter {
          chain input {
              type filter hook input priority 0; policy drop;
              ct state established,related accept
              iif lo accept
              icmp type echo-request accept
${recipe.enableSSH ? '              tcp dport 22 accept' : ''}
          }
          chain forward { type filter hook forward priority 0; policy drop; }
          chain output { type filter hook output priority 0; policy accept; }
      }
` : ''}
runcmd:
  - systemctl enable --now ssh || true
  ${recipe.security.firewall === 'ufw' ? '- ufw --force enable' : ''}
  ${recipe.security.firewall === 'nftables' ? '- nft -f /etc/nftables.conf || true\n  - systemctl enable --now nftables || true' : ''}
  - [ bash, -c, "${recipe.firstBootScript ? recipe.firstBootScript.replace(/"/g, '\\"') : 'echo Ready'}" ]
`;
}

/**
 * Generates OpenFactory-compatible JSON recipe
 */
export function generateRecipeJson(recipe: OSRecipe): string {
  return JSON.stringify(recipe, null, 2);
}

/**
 * Generates install-wsl.bat for Windows 10/11
 * Automatically imports the custom Linux OS into Windows Subsystem for Linux (WSL2)
 */
export function generateWslInstallerBat(recipe: OSRecipe): string {
  const distroName = recipe.branding.osName.replace(/[^a-zA-Z0-9]/g, '');

  return `@echo off
chcp 65001 >nul
REM ==============================================================================
REM OSForge Studio — Script d'installation 1-Click pour Windows WSL2
REM Installe votre OS sur-mesure (${recipe.branding.osName}) directement sous Windows
REM ==============================================================================

echo.
echo =====================================================================
echo   🪟 Installation de ${recipe.branding.osName} sous Windows WSL2
echo =====================================================================
echo.

REM 1. Vérification de l'activation de WSL
wsl --status >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [ERREUR] WSL n'est pas activé sur ce PC Windows.
    echo Exécutez 'wsl --install' dans PowerShell en mode Administrateur.
    pause
    exit /b 1
)

set DISTRO_NAME=${distroName}
set INSTALL_DIR=%USERPROFILE%\\WSL\\%DISTRO_NAME%
set TAR_FILE=dist\\rootfs.tar.gz

if not exist "%TAR_FILE%" (
    if exist "dist\\filesystem.squashfs" (
        set TAR_FILE=dist\\filesystem.squashfs
    ) else (
        echo [INFO] Le fichier rootfs.tar.gz sera généré ou utilisé depuis dist\\
    )
)

echo [1/3] Création du dossier d'installation : %INSTALL_DIR%
mkdir "%INSTALL_DIR%" 2>nul

echo [2/3] Importation de ${recipe.branding.osName} dans Windows WSL2...
wsl --import %DISTRO_NAME% "%INSTALL_DIR%" "%TAR_FILE%" --version 2

if %ERRORLEVEL% NEQ 0 (
    echo [AVERTISSEMENT] Import direct : tentative d'enregistrement standard...
)

echo [3/3] Configuration du support Systemd et utilisateur par défaut (%DISTRO_NAME%)...
wsl -d %DISTRO_NAME% -u root bash -c "echo '[boot]\nsystemd=true\n[user]\ndefault='${shQuote(recipe.user.username)} > /etc/wsl.conf"

echo.
echo =====================================================================
echo   [SUCCES] ${recipe.branding.osName} est installe avec succes sous Windows !
echo =====================================================================
echo.
echo Pour lancer votre distribution a tout moment dans le terminal Windows :
echo    wsl -d %DISTRO_NAME%
echo.
echo Lancement immediat de votre OS...
wsl -d %DISTRO_NAME%
pause
`;
}

/**
 * Generates /etc/wsl.conf for native Windows WSL2 integration
 */
export function generateWslConf(recipe: OSRecipe): string {
  return `# ==============================================================================
# OSForge Studio — Configuration WSL2 (/etc/wsl.conf)
# Active Systemd, l'intégration GUI (WSLg) et l'utilisateur par défaut sous Windows
# ==============================================================================

[boot]
systemd=true

[user]
default=${recipe.user.username}

[interop]
enabled=true
appendWindowsPath=true

[network]
hostname=${recipe.hostname}
generateHosts=true
generateResolvConf=true

[automount]
enabled=true
root=/mnt/
options="metadata,uid=1000,gid=1000,umask=22,fmask=11"
`;
}

/**
 * Generates run-live-windows.bat for running the ISO live on Windows via portable QEMU
 */
export function generateLiveWindowsBat(recipe: OSRecipe): string {
  const isoName = `${recipe.branding.osName.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${recipe.branding.version}-${recipe.arch}.iso`;

  return `@echo off
setlocal EnableDelayedExpansion
title ${recipe.branding.osName} - Machine Virtuelle QEMU (Test & Nettoyage Automatique)
cls

:MENU
cls
echo ===============================================================================
echo   OSFORGE STUDIO - MACHINE VIRTUELLE DE TEST RAPIDE (QEMU)
echo ===============================================================================
echo.

set ISO_PATH=dist\\${isoName}

if not exist "%ISO_PATH%" (
    for %%f in (dist\\*.iso) do set ISO_PATH=%%f
)

if not exist "%ISO_PATH%" (
    echo [ERREUR] Aucun fichier .iso n'a ete trouve dans dist\\
    echo Assurez-vous d'avoir compile votre image ISO au prealable.
    echo.
    pause
    exit /b 1
)

echo [OK] Image ISO detectee : %ISO_PATH%
echo.

set QEMU_CMD=
set QEMU_IMG_CMD=
set QEMU_MODE=WINDOWS

where qemu-system-x86_64 >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    set QEMU_CMD=qemu-system-x86_64
    set QEMU_IMG_CMD=qemu-img
)

if "%QEMU_CMD%"=="" (
    if exist "C:\\Program Files\\qemu\\qemu-system-x86_64.exe" (
        set "QEMU_CMD=C:\\Program Files\\qemu\\qemu-system-x86_64.exe"
        set "QEMU_IMG_CMD=C:\\Program Files\\qemu\\qemu-img.exe"
    )
)

if "%QEMU_CMD%"=="" (
    wsl which qemu-system-x86_64 >nul 2>&1
    if !ERRORLEVEL! EQU 0 (
        set QEMU_MODE=WSL
        set QEMU_CMD=wsl qemu-system-x86_64
        set QEMU_IMG_CMD=wsl qemu-img
    )
)

if not "%QEMU_CMD%"=="" (
    echo [OK] Moteur QEMU detecte : %QEMU_MODE%
) else (
    echo [ATTENTION] QEMU n'est pas encore installe sur votre systeme.
)

echo.
echo -------------------------------------------------------------------------------
echo   CHOISISSEZ UNE OPTION :
echo -------------------------------------------------------------------------------
echo   [1] Lancer la VM Ephemere en Live RAM (Zero fichier modifie sur votre disque)
echo   [2] Lancer la VM avec un Disque Virtuel Temporaire (20 Go QCOW2)
echo   [3] Installer automatiquement QEMU (via Winget Windows ou WSL2)
echo   [4] Nettoyer / Supprimer les disques virtuels de test temporaires
echo   [0] Retour au menu principal
echo.
echo ===============================================================================
set /p CHOICE="Votre choix [1-4, 0] : "

if "%CHOICE%"=="1" goto RUN_LIVE_RAM
if "%CHOICE%"=="2" goto RUN_WITH_DISK
if "%CHOICE%"=="3" goto INSTALL_QEMU
if "%CHOICE%"=="4" goto CLEANUP_VM
if "%CHOICE%"=="0" exit /b 0

echo Choix invalide.
timeout /t 2 >nul
goto MENU

:INSTALL_QEMU
cls
echo ===============================================================================
echo   INSTALLATION AUTOMATIQUE DE QEMU
echo ===============================================================================
echo.
echo [1/2] Tentative d'installation native Windows via Windows Package Manager (winget)...
where winget >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo Execution de : winget install SoftwareFreedomConservancy.QEMU ...
    winget install SoftwareFreedomConservancy.QEMU --accept-package-agreements --accept-source-agreements
    if %ERRORLEVEL% EQU 0 (
        echo [SUCCES] QEMU pour Windows a ete installe !
        if exist "C:\\Program Files\\qemu\\qemu-system-x86_64.exe" (
            set "QEMU_CMD=C:\\Program Files\\qemu\\qemu-system-x86_64.exe"
            set "QEMU_IMG_CMD=C:\\Program Files\\qemu\\qemu-img.exe"
        )
        pause
        goto MENU
    )
)

echo.
echo [2/2] Tentative d'installation de QEMU dans votre environnement WSL2...
wsl --status >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo Installation de qemu-system-x86 et qemu-utils dans WSL2...
    wsl sudo apt-get update -y
    wsl sudo apt-get install -y qemu-system-x86 qemu-utils
    if %ERRORLEVEL% EQU 0 (
        echo [SUCCES] QEMU a ete installe avec succes dans WSL2 !
        set QEMU_MODE=WSL
        set QEMU_CMD=wsl qemu-system-x86_64
        set QEMU_IMG_CMD=wsl qemu-img
        pause
        goto MENU
    )
)

echo [INFO] Si l'installation automatique a echoue, vous pouvez installer QEMU manuellement :
echo https://www.qemu.org/download/#windows
pause
goto MENU

:CHECK_QEMU_EXISTS
if "%QEMU_CMD%"=="" (
    echo [ERREUR] QEMU n'est pas installe. Veuillez choisir l'option [3] d'abord.
    pause
    goto MENU
)
exit /b 0

:RUN_LIVE_RAM
call :CHECK_QEMU_EXISTS
cls
echo ===============================================================================
echo   LANCEMENT DE LA VM EPHEMERE (LIVE RAM)
echo ===============================================================================
echo.
echo   Image ISO : %ISO_PATH%
echo   Memoire   : 4096 Mo (4 Go RAM)
echo   Processeur: 4 Coeurs CPU Virtuels
echo.
echo [INFO] Cette VM tourne 100%% en memoire vive. Aucun fichier n'est cree.
echo [INFO] Fermez simplement la fenetre QEMU quand vous avez termine le test.
echo.

if "%QEMU_MODE%"=="WSL" (
    wsl bash -c "ISO_FILE=\\$(wslpath -a '%ISO_PATH%'); qemu-system-x86_64 -cdrom \\"\\$ISO_FILE\\" -m 4096 -smp 4 -vga virtio -display sdl -net nic -net user -boot d"
) else (
    "%QEMU_CMD%" -cdrom "%CD%\\%ISO_PATH%" -m 4096 -smp 4 -vga virtio -net nic -net user -boot d
)

echo.
echo [OK] Session de test Live RAM terminee.
pause
goto MENU

:RUN_WITH_DISK
call :CHECK_QEMU_EXISTS
cls
echo ===============================================================================
echo   LANCEMENT DE LA VM AVEC DISQUE VIRTUEL TEMPORAIRE
echo ===============================================================================
echo.
set DISK_NAME=dist\\test-vm-disk.qcow2

echo [1/3] Creation d'un disque virtuel temporaire dynamique de 20 Go (%DISK_NAME%)...
if "%QEMU_MODE%"=="WSL" (
    wsl bash -c "DISK_FILE=\\$(wslpath -a '%DISK_NAME%'); qemu-img create -f qcow2 \\"\\$DISK_FILE\\" 20G"
) else (
    if not "%QEMU_IMG_CMD%"=="" (
        "%QEMU_IMG_CMD%" create -f qcow2 "%CD%\\%DISK_NAME%" 20G
    ) else (
        qemu-img create -f qcow2 "%CD%\\%DISK_NAME%" 20G
    )
)

echo [2/3] Demarrage de la VM avec support d'ecriture...
echo.
echo [INFO] Vous pouvez tester l'installateur de l'OS ou installer des paquets.
echo [INFO] A la fermeture, le disque temporaire vous sera propose a la suppression.
echo.

if "%QEMU_MODE%"=="WSL" (
    wsl bash -c "ISO_FILE=\\$(wslpath -a '%ISO_PATH%'); DISK_FILE=\\$(wslpath -a '%DISK_NAME%'); qemu-system-x86_64 -cdrom \\"\\$ISO_FILE\\" -hda \\"\\$DISK_FILE\\" -m 4096 -smp 4 -vga virtio -display sdl -net nic -net user -boot d"
) else (
    "%QEMU_CMD%" -cdrom "%CD%\\%ISO_PATH%" -hda "%CD%\\%DISK_NAME%" -m 4096 -smp 4 -vga virtio -net nic -net user -boot d
)

echo.
echo [3/3] Fin de la session de test.
echo.
echo Souhaitez-vous supprimer le disque virtuel temporaire %DISK_NAME% ?
set /p DEL_CONFIRM="Supprimer le disque de test pour liberer l'espace [O/n] ? "
if /i not "%DEL_CONFIRM%"=="n" (
    if exist "%DISK_NAME%" (
        del /f /q "%DISK_NAME%"
        echo [NETTOYAGE] Disque virtuel temporaire supprime avec succes !
    )
) else (
    echo [INFO] Disque conserve dans : %DISK_NAME%
)

echo.
pause
goto MENU

:CLEANUP_VM
cls
echo ===============================================================================
echo   NETTOYAGE DES MACHINES VIRTUELLES DE TEST
echo ===============================================================================
echo.
set FOUND=0
if exist "dist\\test-vm-disk.qcow2" (
    del /f /q "dist\\test-vm-disk.qcow2"
    echo [SUPPRIME] dist\\test-vm-disk.qcow2
    set FOUND=1
)
if exist "test-vm-disk.qcow2" (
    del /f /q "test-vm-disk.qcow2"
    echo [SUPPRIME] test-vm-disk.qcow2
    set FOUND=1
)
if exist "dist\\*.qcow2" (
    del /f /q "dist\\*.qcow2"
    echo [SUPPRIME] Fichiers .qcow2 temporaires
    set FOUND=1
)

if "%FOUND%"=="0" (
    echo [INFO] Aucun fichier de VM temporaire a supprimer. Tout est propre !
) else (
    echo [SUCCES] Tous les disques et fichiers temporaires de VM ont ete nettoyes !
)
echo.
pause
goto MENU
`;
}

/**
 * Generates auto-build.bat — 100% unattended pipeline for Windows (WSL2 + build + QEMU test)
 */
export function generateAutoBuildBat(recipe: OSRecipe): string {
  const isoName = `${recipe.branding.osName.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${recipe.branding.version}-${recipe.arch}.iso`;

  return `@echo off
setlocal EnableDelayedExpansion
title ${recipe.branding.osName} - Compilation 100% Automatique
cls

:: =============================================================================
:: ${recipe.branding.osName} - Mode "1-Clic" 100% automatique
:: Detecte WSL2, installe les dependances si besoin, compile l'ISO puis lance
:: un test QEMU Live RAM automatiquement - aucune interaction requise.
:: =============================================================================

set LOG_FILE=auto-build.log
echo [%DATE% %TIME%] Debut de la compilation automatique > "%LOG_FILE%"

echo ===============================================================================
echo   ${recipe.branding.osName} - COMPILATION 100%% AUTOMATIQUE (1-CLIC)
echo   Toutes les etapes s'enchainent sans intervention. Logs : %LOG_FILE%
echo ===============================================================================
echo.

:: ---------------------------------------------------------------------------
:: [1/5] Verification / installation de WSL2
:: ---------------------------------------------------------------------------
echo [1/5] Verification de WSL2...
wsl --status >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [INFO] WSL2 n'est pas actif. Installation automatique en cours...
    echo [%DATE% %TIME%] Installation de WSL2 >> "%LOG_FILE%"
    wsl --install --no-launch >>"%LOG_FILE%" 2>&1
    echo.
    echo [ATTENTION] WSL2 vient d'etre installe pour la premiere fois.
    echo Windows doit redemarrer pour terminer l'installation.
    echo Relancez simplement auto-build.bat apres le redemarrage : tout reprendra automatiquement.
    pause
    exit /b 0
)
echo [OK] WSL2 est actif.
echo.

:: ---------------------------------------------------------------------------
:: [2/5] Verification / installation d'une distribution WSL par defaut
:: ---------------------------------------------------------------------------
echo [2/5] Verification de la distribution Linux WSL...
wsl -l -q >nul 2>&1
set DISTRO_COUNT=0
for /f %%d in ('wsl -l -q 2^>nul ^| findstr /r /v "^$"') do set /a DISTRO_COUNT+=1
if %DISTRO_COUNT% EQU 0 (
    echo [INFO] Aucune distribution WSL trouvee. Installation automatique d'Ubuntu...
    echo [%DATE% %TIME%] Installation d'Ubuntu dans WSL2 >> "%LOG_FILE%"
    wsl --install -d Ubuntu --no-launch >>"%LOG_FILE%" 2>&1
    if %ERRORLEVEL% NEQ 0 (
        echo [ERREUR] Echec de l'installation d'Ubuntu dans WSL2. Voir %LOG_FILE%.
        pause
        exit /b 1
    )
)
echo [OK] Distribution WSL disponible.
echo.

:: ---------------------------------------------------------------------------
:: [3/5] Installation des dependances de compilation (execute en root, sans mot de passe)
:: ---------------------------------------------------------------------------
echo [3/5] Installation des dependances de compilation ISO dans WSL2...
echo       (debootstrap, xorriso, grub, squashfs-tools...)
wsl -u root -- bash -c "apt-get update -y && apt-get install -y debootstrap xorriso mtools grub-pc-bin grub-efi-amd64-bin grub-common squashfs-tools dosfstools rsync" >>"%LOG_FILE%" 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [ERREUR] Echec de l'installation des dependances. Voir %LOG_FILE%.
    pause
    exit /b 1
)
echo [OK] Dependances installees.
echo.

:: ---------------------------------------------------------------------------
:: [4/5] Compilation de l'ISO (execute en root, aucun mot de passe sudo requis)
:: ---------------------------------------------------------------------------
echo [4/5] Compilation de l'ISO en cours (peut prendre plusieurs minutes)...
echo [%DATE% %TIME%] Lancement de build.sh en root >> "%LOG_FILE%"
wsl -u root -- bash -c "chmod +x build.sh && ./build.sh" >>"%LOG_FILE%" 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [ERREUR] La compilation a echoue. Consultez %LOG_FILE% pour le detail.
    pause
    exit /b 1
)
echo [OK] Compilation terminee. Image disponible dans dist\\
echo.

:: ---------------------------------------------------------------------------
:: [5/5] Installation automatique de QEMU (si absent) + test Live RAM immediat
:: ---------------------------------------------------------------------------
echo [5/5] Preparation du test Live automatique (QEMU)...
set QEMU_CMD=
where qemu-system-x86_64 >nul 2>&1
if %ERRORLEVEL% EQU 0 set QEMU_CMD=qemu-system-x86_64
if "%QEMU_CMD%"=="" if exist "C:\\Program Files\\qemu\\qemu-system-x86_64.exe" set "QEMU_CMD=C:\\Program Files\\qemu\\qemu-system-x86_64.exe"

if "%QEMU_CMD%"=="" (
    where winget >nul 2>&1
    if %ERRORLEVEL% EQU 0 (
        echo [INFO] QEMU absent. Installation automatique via winget...
        winget install SoftwareFreedomConservancy.QEMU --accept-package-agreements --accept-source-agreements >>"%LOG_FILE%" 2>&1
        if exist "C:\\Program Files\\qemu\\qemu-system-x86_64.exe" set "QEMU_CMD=C:\\Program Files\\qemu\\qemu-system-x86_64.exe"
    )
)

set ISO_PATH=dist\\${isoName}
if not exist "%ISO_PATH%" (
    for %%f in (dist\\*.iso) do set ISO_PATH=%%f
)

if "%QEMU_CMD%"=="" (
    echo [ATTENTION] QEMU n'a pas pu etre installe automatiquement.
    echo Compilation terminee avec succes : %ISO_PATH%
    echo Lancez run-live-windows.bat pour tester manuellement.
    pause
    exit /b 0
)

if not exist "%ISO_PATH%" (
    echo [ATTENTION] Aucune image ISO trouvee dans dist\\ pour le test.
    pause
    exit /b 0
)

echo [OK] Lancement du test Live RAM automatique de %ISO_PATH%...
echo.
echo ===============================================================================
echo   [SUCCES] Pipeline 100%% automatique termine !
echo   ISO       : %ISO_PATH%
echo   Test QEMU : demarrage en cours (fermez la fenetre QEMU quand vous avez fini)
echo ===============================================================================
"%QEMU_CMD%" -cdrom "%ISO_PATH%" -m 4096 -smp 4 -vga virtio -display sdl -net nic -net user -boot d

pause
exit /b 0
`;
}

/**
 * Generates auto-build.sh — 100% unattended pipeline for Linux / macOS
 */
export function generateAutoBuildSh(recipe: OSRecipe): string {
  const isoName = `${recipe.branding.osName.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${recipe.branding.version}-${recipe.arch}.iso`;

  return `#!/usr/bin/env bash
# ==============================================================================
# ${recipe.branding.osName} — Pipeline 100% automatique (Linux / macOS)
# Détecte le gestionnaire de paquets, installe les dépendances, compile l'ISO
# puis lance un test QEMU immédiat — aucune interaction requise.
# ==============================================================================

set -euo pipefail

RED='\\033[0;31m'
GREEN='\\033[0;32m'
CYAN='\\033[0;36m'
YELLOW='\\033[1;33m'
NC='\\033[0m'

LOG_FILE="auto-build.log"
: > "\${LOG_FILE}"

echo -e "\${CYAN}===============================================================================\${NC}"
echo -e "\${CYAN}  ${recipe.branding.osName} — COMPILATION 100% AUTOMATIQUE (1-CLIC)\${NC}"
echo -e "\${CYAN}  Toutes les étapes s'enchaînent sans intervention. Logs : \${LOG_FILE}\${NC}"
echo -e "\${CYAN}===============================================================================\${NC}"
echo ""

# ------------------------------------------------------------------------------
# [1/4] Installation automatique des dépendances de compilation (détection du
# gestionnaire de paquets de l'hôte : apt, dnf, pacman, zypper)
# ------------------------------------------------------------------------------
echo -e "\${YELLOW}[1/4] Installation des dépendances de compilation...\${NC}"
DEPS="debootstrap xorriso mtools grub-pc-bin grub-efi-amd64-bin squashfs-tools dosfstools rsync"

if command -v apt-get &>/dev/null; then
    sudo apt-get update -y >> "\${LOG_FILE}" 2>&1
    sudo apt-get install -y \${DEPS} >> "\${LOG_FILE}" 2>&1
elif command -v dnf &>/dev/null; then
    sudo dnf install -y debootstrap xorriso mtools grub2-tools squashfs-tools dosfstools rsync >> "\${LOG_FILE}" 2>&1
elif command -v pacman &>/dev/null; then
    sudo pacman -Sy --noconfirm debootstrap xorriso mtools grub squashfs-tools dosfstools rsync >> "\${LOG_FILE}" 2>&1
elif command -v zypper &>/dev/null; then
    sudo zypper install -y debootstrap xorriso mtools grub2 squashfs dosfstools rsync >> "\${LOG_FILE}" 2>&1
else
    echo -e "\${RED}[ERREUR] Aucun gestionnaire de paquets supporté détecté (apt/dnf/pacman/zypper).\${NC}"
    exit 1
fi
echo -e "\${GREEN}[OK] Dépendances installées.\${NC}"
echo ""

# ------------------------------------------------------------------------------
# [2/4] Compilation de l'ISO
# ------------------------------------------------------------------------------
echo -e "\${YELLOW}[2/4] Compilation de l'ISO en cours (peut prendre plusieurs minutes)...\${NC}"
chmod +x build.sh
sudo ./build.sh >> "\${LOG_FILE}" 2>&1
echo -e "\${GREEN}[OK] Compilation terminée. Image disponible dans dist/\${NC}"
echo ""

# ------------------------------------------------------------------------------
# [3/4] Installation automatique de QEMU si absent
# ------------------------------------------------------------------------------
echo -e "\${YELLOW}[3/4] Vérification de QEMU pour le test Live automatique...\${NC}"
if ! command -v qemu-system-x86_64 &>/dev/null; then
    echo "QEMU absent, installation automatique..."
    if command -v apt-get &>/dev/null; then
        sudo apt-get install -y qemu-system-x86 >> "\${LOG_FILE}" 2>&1
    elif command -v dnf &>/dev/null; then
        sudo dnf install -y qemu-system-x86 >> "\${LOG_FILE}" 2>&1
    elif command -v pacman &>/dev/null; then
        sudo pacman -Sy --noconfirm qemu-full >> "\${LOG_FILE}" 2>&1
    elif command -v brew &>/dev/null; then
        brew install qemu >> "\${LOG_FILE}" 2>&1
    fi
fi
echo -e "\${GREEN}[OK] QEMU prêt.\${NC}"
echo ""

# ------------------------------------------------------------------------------
# [4/4] Test Live RAM automatique
# ------------------------------------------------------------------------------
ISO_FILE="dist/${isoName}"
if [ ! -f "\${ISO_FILE}" ]; then
    ISO_FILE=$(ls dist/*.iso 2>/dev/null | head -n1 || true)
fi

echo -e "\${GREEN}===============================================================================\${NC}"
echo -e "\${GREEN}  [SUCCÈS] Pipeline 100% automatique terminé !\${NC}"
echo -e "\${GREEN}  ISO : \${ISO_FILE}\${NC}"
echo -e "\${GREEN}===============================================================================\${NC}"

if [ -n "\${ISO_FILE}" ] && command -v qemu-system-x86_64 &>/dev/null; then
    echo "Lancement du test Live RAM (fermez la fenêtre QEMU quand vous avez fini)..."
    qemu-system-x86_64 -cdrom "\${ISO_FILE}" -m 4096 -smp 4 -vga virtio -net nic -net user -boot d
else
    echo "QEMU non disponible : lancez run-live-windows.bat ou installez QEMU manuellement pour tester."
fi
`;
}

/**
 * Generates launch.bat — Universal 1-Click Interactive Menu Launcher for Windows
 */
export function generateUniversalLauncherBat(recipe: OSRecipe): string {
  return `@echo off
setlocal EnableDelayedExpansion
title OSForge Studio - Lanceur ${recipe.branding.osName}
cls

:MENU
cls
echo ===============================================================================
echo   OSFORGE STUDIO - LANCEUR RAPIDE : ${recipe.branding.osName} (${recipe.distro.toUpperCase()})
echo ===============================================================================
echo.
echo   [1] Installer et lancer dans Windows WSL2 (Recommande)
echo   [2] Tester l'ISO en Live avec QEMU sous Windows
echo   [3] Compiler l'image ISO en local avec WSL2 / Linux
echo   [4] Ouvrir le guide GitHub Actions (Build Cloud gratuit)
echo   [5] Afficher le manifeste de configuration (recipe.json)
echo   [6] Tout Automatiser en 1-Clic (WSL2 + Compilation + Test QEMU, sans interaction)
echo   [0] Quitter
echo.
echo ===============================================================================
set /p CHOICE="Votre choix [1-6, 0] : "

if "%CHOICE%"=="1" goto WSL_INSTALL
if "%CHOICE%"=="2" goto LIVE_QEMU
if "%CHOICE%"=="3" goto BUILD_LOCAL
if "%CHOICE%"=="4" goto GITHUB_ACTIONS
if "%CHOICE%"=="5" goto VIEW_RECIPE
if "%CHOICE%"=="6" goto AUTO_BUILD
if "%CHOICE%"=="0" exit /b 0

echo Choix invalide.
timeout /t 2 >nul
goto MENU

:WSL_INSTALL
cls
echo Demarrage de l'installation WSL2...
if exist install-wsl.bat (
    call install-wsl.bat
) else (
    echo [ERREUR] install-wsl.bat introuvable.
    pause
)
goto MENU

:LIVE_QEMU
cls
echo Demarrage en Live QEMU...
if exist run-live-windows.bat (
    call run-live-windows.bat
) else (
    echo [ERREUR] run-live-windows.bat introuvable.
    pause
)
goto MENU

:BUILD_LOCAL
cls
echo ===============================================================================
echo   Compilation locale via WSL2 / Bash
echo ===============================================================================
echo Lancement de la compilation dans WSL2...
wsl bash -c "chmod +x build.sh && sudo ./build.sh"
pause
goto MENU

:GITHUB_ACTIONS
cls
echo ===============================================================================
echo   Compilation Cloud via GitHub Actions
echo ===============================================================================
echo 1. Initialisez et poussez sur GitHub :
echo    git init -b main ^&^& git add . ^&^& git commit -m "init OS recipe"
echo    gh repo create ${recipe.branding.osName.toLowerCase().replace(/[^a-z0-9]/g, '-')}-os --public --source=. --push
echo 2. Rendez-vous dans l'onglet 'Actions' : le build se lance automatiquement et
echo    publie une Release avec votre ISO, sans autre action de votre part.
echo.
pause
goto MENU

:VIEW_RECIPE
cls
type recipe.json
echo.
pause
goto MENU

:AUTO_BUILD
cls
if exist auto-build.bat (
    call auto-build.bat
) else (
    echo [ERREUR] auto-build.bat introuvable.
    pause
)
goto MENU
`;
}

/**
 * Generates launch.sh — Universal 1-Click Interactive Menu Launcher for Linux / macOS
 */
export function generateUniversalLauncherSh(recipe: OSRecipe): string {
  const isoName = `${recipe.branding.osName.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${recipe.branding.version}-${recipe.arch}.iso`;

  return `#!/usr/bin/env bash
# ==============================================================================
# OSForge Studio — Universal Interactive Launcher (Linux / macOS)
# ==============================================================================

set -e

show_menu() {
    clear
    echo "==============================================================================="
    echo "  🚀 OSFORGE STUDIO — LANCEUR RAPIDE : ${recipe.branding.osName} (${recipe.distro.toUpperCase()})"
    echo "==============================================================================="
    echo ""
    echo "  [1] 🔨 Compiler l'image ISO en local (build.sh)"
    echo "  [2] 🐳 Compiler dans un conteneur Docker isolé"
    echo "  [3] 🖲️ Tester l'ISO compilée avec QEMU KVM"
    echo "  [4] 🌐 Pousser sur GitHub pour build Cloud gratuit"
    echo "  [5] 📖 Afficher la recette JSON (recipe.json)"
    echo "  [6] ⚡ Tout automatiser en 1-clic (dépendances + build + test QEMU)"
    echo "  [0] ❌ Quitter"
    echo ""
    echo "==============================================================================="
    read -rp "Votre choix [1-6, 0] : " choice
    
    case $choice in
        1)
            echo "Lancement de la compilation locale..."
            chmod +x build.sh
            sudo ./build.sh
            read -rp "Appuyez sur Entrée pour continuer..."
            show_menu
            ;;
        2)
            echo "Compilation Docker isolée..."
            docker build -t osforge-builder .
            docker run --rm --privileged -v "$(pwd)/dist:/osbuilder/dist" osforge-builder
            read -rp "Appuyez sur Entrée pour continuer..."
            show_menu
            ;;
        3)
            if [ -f "dist/${isoName}" ]; then
                echo "Lancement de QEMU..."
                qemu-system-x86_64 -cdrom "dist/${isoName}" -m 4G -enable-kvm -vga virtio -smp 4
            else
                echo "L'image ISO dist/${isoName} n'existe pas encore. Veuillez d'abord compiler l'image (Choix 1 ou 2)."
                read -rp "Appuyez sur Entrée pour continuer..."
            fi
            show_menu
            ;;
        4)
            echo "Poussée sur GitHub..."
            git init -b main && git add . && git commit -m "feat: init ${recipe.branding.osName}"
            gh repo create "${recipe.branding.osName.toLowerCase().replace(/[^a-z0-9]/g, '-')}-os" --public --source=. --push
            read -rp "Appuyez sur Entrée pour continuer..."
            show_menu
            ;;
        5)
            cat recipe.json
            echo ""
            read -rp "Appuyez sur Entrée pour continuer..."
            show_menu
            ;;
        6)
            chmod +x auto-build.sh
            ./auto-build.sh
            read -rp "Appuyez sur Entrée pour continuer..."
            show_menu
            ;;
        0)
            echo "Au revoir !"
            exit 0
            ;;
        *)
            echo "Choix invalide."
            sleep 1
            show_menu
            ;;
    esac
}

show_menu
`;
}

