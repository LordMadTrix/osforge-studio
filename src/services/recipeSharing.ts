import { OSRecipe } from '../types/os';

/**
 * Encodage UTF-8 vers Base64 URL-safe robuste
 */
function utf8ToBase64Url(str: string): string {
  try {
    const utf8Bytes = new TextEncoder().encode(str);
    let binary = '';
    for (let i = 0; i < utf8Bytes.length; i++) {
      binary += String.fromCharCode(utf8Bytes[i]);
    }
    return btoa(binary)
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  } catch {
    // Fallback standard
    return encodeURIComponent(str);
  }
}

/**
 * Décodage Base64 URL-safe vers UTF-8 robuste
 */
function base64UrlToUtf8(base64Url: string): string {
  try {
    let base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) {
      base64 += '=';
    }
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return new TextDecoder().decode(bytes);
  } catch {
    return decodeURIComponent(base64Url);
  }
}

/**
 * Génère une URL de partage avec la recette sérialisée dans le fragment de hachage (#recipe=...)
 */
export function generateShareableUrl(recipe: OSRecipe, baseUrl?: string): string {
  const json = JSON.stringify(recipe);
  const encoded = utf8ToBase64Url(json);
  const origin = baseUrl || (typeof window !== 'undefined' ? `${window.location.origin}${window.location.pathname}` : '');
  return `${origin}#recipe=${encoded}`;
}

/**
 * Tente d'extraire et décoder une recette depuis l'URL actuelle (hash ou paramètre de requête)
 */
export function extractRecipeFromUrl(rawLocation?: string): Partial<OSRecipe> | null {
  if (typeof window === 'undefined' && !rawLocation) return null;
  const urlString = rawLocation || window.location.href;

  try {
    let encodedData: string | null = null;

    // 1. Recherche dans le hash (#recipe=...)
    const hashIndex = urlString.indexOf('#');
    if (hashIndex !== -1) {
      const hash = urlString.slice(hashIndex + 1);
      const params = new URLSearchParams(hash);
      encodedData = params.get('recipe');
      if (!encodedData && hash.startsWith('recipe=')) {
        encodedData = hash.slice('recipe='.length);
      }
    }

    // 2. Recherche dans les query params (?recipe=...)
    if (!encodedData) {
      const url = new URL(urlString, 'http://localhost');
      encodedData = url.searchParams.get('recipe');
    }

    if (!encodedData) return null;

    const decodedJson = base64UrlToUtf8(encodedData);
    const parsed = JSON.parse(decodedJson);

    // Validation minimale pour s'assurer que c'est une recette valide
    if (parsed && typeof parsed === 'object' && parsed.distro) {
      return parsed as Partial<OSRecipe>;
    }
  } catch (err) {
    console.warn('Impossible de charger la recette depuis l’URL:', err);
  }

  return null;
}

/**
 * Copie l'URL de partage dans le presse-papier
 */
export async function copyShareableLink(recipe: OSRecipe): Promise<string> {
  const url = generateShareableUrl(recipe);
  if (typeof navigator !== 'undefined' && navigator.clipboard) {
    await navigator.clipboard.writeText(url);
  }
  return url;
}
