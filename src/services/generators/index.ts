import { OSRecipe } from '../../types/os';
import { DEBOOTSTRAP_TARGETS, NON_DEBIAN_DISTROS } from './types';
import { generateDebianBuildScript } from './debian';
import { generateNonDebianBuildScript } from './nonDebian';
import { generateRpiSdScript } from './rpi';

export function generateBuildScript(recipe: OSRecipe): string {
  if (recipe.distro === 'raspbian' && recipe.outputFormat === 'rpi_sd' && recipe.arch === 'aarch64') {
    return generateRpiSdScript(recipe);
  }

  const target = DEBOOTSTRAP_TARGETS[recipe.distro];
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

  return generateDebianBuildScript(recipe);
}

export * from './types';
export * from './helpers';
export * from './packages';
export * from './debian';
export * from './nonDebian';
export * from './rpi';
export * from './cloudInit';
export * from './iac';
export * from './launchers';
export * from './ipxe';
export * from './ventoy';
export * from './branding';
export * from './usbFlash';
