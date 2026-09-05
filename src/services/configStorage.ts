import { OSRecipe } from '../types/os';

export interface SavedProfile {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  recipe: OSRecipe;
}

const AUTOSAVE_STORAGE_KEY = 'osforge_current_recipe_autosave';
const PROFILES_STORAGE_KEY = 'osforge_user_saved_profiles';

/**
 * Sauvegarde automatique continue de la recette en cours dans localStorage
 */
export function saveCurrentAutosave(recipe: OSRecipe): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(AUTOSAVE_STORAGE_KEY, JSON.stringify(recipe));
    }
  } catch (err) {
    console.warn('Erreur lors de l’auto-sauvegarde de la recette:', err);
  }
}

/**
 * Récupère la dernière recette auto-sauvegardée
 */
export function loadCurrentAutosave(): OSRecipe | null {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const data = window.localStorage.getItem(AUTOSAVE_STORAGE_KEY);
      if (data) {
        const parsed = JSON.parse(data);
        if (parsed && typeof parsed === 'object' && parsed.distro) {
          return parsed as OSRecipe;
        }
      }
    }
  } catch (err) {
    console.warn('Erreur lors de la lecture de l’auto-sauvegarde:', err);
  }
  return null;
}

/**
 * Récupère tous les profils de configuration personnalisés enregistrés
 */
export function getUserProfiles(): SavedProfile[] {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const data = window.localStorage.getItem(PROFILES_STORAGE_KEY);
      if (data) {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      }
    }
  } catch (err) {
    console.warn('Erreur lors de la récupération des profils enregistrés:', err);
  }
  return [];
}

/**
 * Enregistre un profil nommé dans le stockage local
 */
export function saveUserProfile(name: string, recipe: OSRecipe, description?: string): SavedProfile {
  const profiles = getUserProfiles();
  const trimmedName = name.trim() || recipe.name || 'Profil sans nom';
  const now = new Date().toISOString();

  // Si un profil porte déjà exactement ce nom, on le met à jour
  const existingIndex = profiles.findIndex(p => p.name.toLowerCase() === trimmedName.toLowerCase());

  let savedProfile: SavedProfile;
  if (existingIndex >= 0) {
    savedProfile = {
      ...profiles[existingIndex],
      description: description ?? profiles[existingIndex].description,
      updatedAt: now,
      recipe: { ...recipe, name: trimmedName },
    };
    profiles[existingIndex] = savedProfile;
  } else {
    savedProfile = {
      id: `profile_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      name: trimmedName,
      description: description || undefined,
      createdAt: now,
      updatedAt: now,
      recipe: { ...recipe, name: trimmedName },
    };
    profiles.unshift(savedProfile);
  }

  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(PROFILES_STORAGE_KEY, JSON.stringify(profiles));
    }
  } catch (err) {
    console.warn('Erreur lors de la sauvegarde du profil:', err);
  }

  return savedProfile;
}

/**
 * Supprime un profil enregistré par son ID
 */
export function deleteUserProfile(id: string): void {
  const profiles = getUserProfiles().filter(p => p.id !== id);
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(PROFILES_STORAGE_KEY, JSON.stringify(profiles));
    }
  } catch (err) {
    console.warn('Erreur lors de la suppression du profil:', err);
  }
}

/**
 * Charge un profil enregistré par son ID
 */
export function loadUserProfile(id: string): OSRecipe | null {
  const profile = getUserProfiles().find(p => p.id === id);
  return profile ? profile.recipe : null;
}

/**
 * Exporte une recette au format JSON téléchargeable
 */
export function exportRecipeToJson(recipe: OSRecipe): string {
  return JSON.stringify(recipe, null, 2);
}

/**
 * Déclenche le téléchargement du fichier JSON dans le navigateur
 */
export function downloadRecipeJsonFile(recipe: OSRecipe, filenameOverride?: string): void {
  const jsonContent = exportRecipeToJson(recipe);
  const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8' });
  const filename = filenameOverride || `${recipe.name.toLowerCase().replace(/[^a-z0-9_-]/g, '_') || 'forge_recipe'}.json`;

  if (typeof window !== 'undefined') {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}

/**
 * Valide et importe une recette depuis une chaîne JSON
 */
export function importRecipeFromJson(jsonStr: string): { success: boolean; recipe?: OSRecipe; error?: string } {
  try {
    const parsed = JSON.parse(jsonStr);

    if (!parsed || typeof parsed !== 'object') {
      return { success: false, error: 'Le fichier ne contient pas un objet JSON valide.' };
    }

    if (!parsed.distro || typeof parsed.distro !== 'string') {
      return { success: false, error: 'La configuration JSON ne spécifie pas de distribution Linux valide.' };
    }

    // Reconstruction propre avec valeurs de repli garanties
    const recipe: OSRecipe = {
      ...parsed,
      id: parsed.id || `imported_${Date.now()}`,
      name: parsed.name || 'Configuration Importée',
      selectedPackages: Array.isArray(parsed.selectedPackages) ? parsed.selectedPackages : [],
      customPackages: Array.isArray(parsed.customPackages) ? parsed.customPackages : [],
      customServices: Array.isArray(parsed.customServices) ? parsed.customServices : [],
    };

    return { success: true, recipe };
  } catch (err: any) {
    return { success: false, error: `Erreur de syntaxe JSON : ${err?.message || 'fichier corrompu'}` };
  }
}
