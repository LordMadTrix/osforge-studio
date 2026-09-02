import { OSRecipe } from '../types/os';
import { DISTROS } from '../data/distros';
import { DESKTOPS } from '../data/desktopEnvironments';
import { SOFTWARE_PACKAGES } from '../data/packages';

export interface ResourceEstimate {
  estimatedIsoMB: number;
  estimatedInstalledDiskGB: number;
  minRamMB: number;
  recommendedRamMB: number;
  summaryTextFr: string;
  summaryTextEn: string;
}

/**
 * Calcule l'estimation de taille d'image et les prérequis RAM en fonction de la recette
 */
export function calculateResourceEstimate(recipe: OSRecipe): ResourceEstimate {
  const distro = DISTROS.find(d => d.id === recipe.distro) || DISTROS[0];
  const desktop = DESKTOPS.find(de => de.id === recipe.desktop) || DESKTOPS[0];

  // 1. Calcul de la taille de base (RootFS compressé SquashFS)
  let isoMB = distro.baseIsoSizeMB || 650;

  // Bureau GUI
  if (desktop.id !== 'none') {
    // Le SquashFS compresse le bureau d'environ un ratio 2.2 à 2.8
    isoMB += Math.round((desktop.diskUsageMB || 800) / 2.5);
  }

  // Paquets logiciels additionnels
  const selectedPkgs = SOFTWARE_PACKAGES.filter(p => recipe.selectedPackages.includes(p.id));
  const packagesRawMB = selectedPkgs.reduce((acc, p) => acc + (p.sizeMB || 50), 0);
  isoMB += Math.round(packagesRawMB / 2.2);

  // Stacks additionnelles
  if (recipe.enableLocalAiStack) {
    // Binaire Ollama + runtime + modèle de départ
    const modelMultiplier = recipe.localAiModel?.includes('llama3') ? 1200 : 450;
    isoMB += 250 + modelMultiplier;
  }

  if (recipe.enableHomelabStack) {
    // Docker Engine + compose + images de base
    isoMB += 350;
  }

  if (recipe.enableGamingOptimizations || recipe.enableSteamConsoleMode) {
    // Vulkan drivers, MangoHud, Gamescope
    isoMB += 450;
  }

  if (recipe.enableCalamaresInstaller) {
    isoMB += 120;
  }

  // 2. Calcul de l'espace disque installé recommandé (non compressé)
  let diskGB = 2.0; // Système de base minimal
  if (desktop.id !== 'none') {
    diskGB += (desktop.diskUsageMB || 800) / 1024 * 1.5;
  }
  diskGB += packagesRawMB / 1024;
  if (recipe.enableLocalAiStack) diskGB += 3.5;
  if (recipe.enableHomelabStack) diskGB += 4.0;
  if (recipe.enableGamingOptimizations || recipe.enableSteamConsoleMode) diskGB += 5.0;

  // 3. Calcul de la RAM minimale et recommandée
  let minRamMB = distro.baseRamMB || 512;
  if (desktop.id !== 'none') {
    minRamMB += desktop.ramUsageMB || 384;
  }

  if (recipe.enableHomelabStack) minRamMB += 512;
  if (recipe.enableLocalAiStack) minRamMB += 1024;
  if (recipe.enableGamingOptimizations || recipe.enableSteamConsoleMode) minRamMB += 2048;

  // RAM recommandée avec marge de confort
  let recRamMB = Math.max(minRamMB * 2, 2048);
  if (recipe.enableLocalAiStack || recipe.enableGamingOptimizations || recipe.enableSteamConsoleMode) {
    recRamMB = Math.max(recRamMB, 8192);
  }

  const roundedIsoMB = Math.round(isoMB);
  const roundedDiskGB = parseFloat(diskGB.toFixed(1));

  return {
    estimatedIsoMB: roundedIsoMB,
    estimatedInstalledDiskGB: roundedDiskGB,
    minRamMB,
    recommendedRamMB: recRamMB,
    summaryTextFr: `ISO: ~${(roundedIsoMB / 1024).toFixed(1)} Go | Disque: ~${roundedDiskGB} Go | RAM: ${Math.round(recRamMB / 1024)} Go rec.`,
    summaryTextEn: `ISO: ~${(roundedIsoMB / 1024).toFixed(1)} GB | Disk: ~${roundedDiskGB} GB | RAM: ${Math.round(recRamMB / 1024)} GB rec.`,
  };
}
