import { OSRecipe, BuildStepLog } from '../types/os';

export interface BuildSimulationUpdate {
  logs: BuildStepLog[];
  progressPercent: number;
  currentStage: string;
  isComplete: boolean;
  sha256: string;
  isoSizeMB: number;
}

export function calculateEstimatedSizeAndRam(recipe: OSRecipe) {
  let isoMB = 450; // base minimal
  let ramMB = 220;

  if (recipe.distro === 'alpine') {
    isoMB = 110;
    ramMB = 64;
  } else if (recipe.distro === 'ubuntu') {
    isoMB = 890;
    ramMB = 420;
  } else if (recipe.distro === 'fedora') {
    isoMB = 980;
    ramMB = 480;
  } else if (recipe.distro === 'arch') {
    isoMB = 680;
    ramMB = 290;
  }

  // Desktop impact
  if (recipe.desktop === 'gnome') {
    isoMB += 750;
    ramMB += 650;
  } else if (recipe.desktop === 'kde') {
    isoMB += 680;
    ramMB += 550;
  } else if (recipe.desktop === 'hyprland') {
    isoMB += 280;
    ramMB += 220;
  } else if (recipe.desktop === 'xfce') {
    isoMB += 340;
    ramMB += 280;
  } else if (recipe.desktop === 'web_kiosk') {
    isoMB += 210;
    ramMB += 180;
  }

  // Packages impact
  const totalPackagesCount = recipe.selectedPackages.length + recipe.customPackages.length;
  isoMB += totalPackagesCount * 38;
  ramMB += Math.round(totalPackagesCount * 8.5);

  return {
    isoSizeMB: Math.round(isoMB),
    ramMB: Math.round(ramMB),
  };
}
