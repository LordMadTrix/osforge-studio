/**
 * OSForge Studio - Utilitaires de Téléchargement Fiables
 * 
 * Résout définitivement le problème Chromium / Edge où les téléchargements de Blobs
 * se retrouvent renommés en GUID sans extension (ex: f8a9a1b4-0dc2-403d-a63e-5e836203e092)
 * lorsque l'élément <a> n'est pas attaché au DOM actif ou est cliqué de manière asynchrone.
 */

export function triggerFileDownload(blob: Blob, filename: string): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return;
  }

  // 1. Création de l'URL objet du Blob
  const url = window.URL.createObjectURL(blob);
  
  // 2. Création de l'élément ancre
  const link = document.createElement('a');
  link.style.display = 'none';
  link.href = url;
  link.download = filename;
  link.setAttribute('download', filename);
  link.rel = 'noopener noreferrer';
  
  // 3. INDISPENSABLE pour Chromium / Edge / Safari : l'élément DOIT être dans le DOM actif
  document.body.appendChild(link);
  
  // 4. Clic synchrone immédiat dans le même tick
  link.click();
  
  // 5. Nettoyage différé propre de l'ancre et de l'Object URL
  setTimeout(() => {
    if (link.parentNode) {
      link.parentNode.removeChild(link);
    }
    window.URL.revokeObjectURL(url);
  }, 1500);
}
