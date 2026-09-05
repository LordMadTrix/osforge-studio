/**
 * OSForge Studio - Utilitaires de Téléchargement Fiables
 * 
 * Résout définitivement le problème Chromium / Edge où les téléchargements de Blobs
 * se retrouvent renommés en GUID sans extension (ex: 67add85e-d84d-420f-b07c-4183ec66668c) :
 * 
 * 1. Priorité à la File System Access API (window.showSaveFilePicker) native dans Chrome/Edge :
 *    Ouvre la boîte de dialogue native Windows avec le nom exact "OSForge-Studio-Windows-Portable.zip"
 *    et écrit directement le fichier sans passer par les heuristiques de renommage du gestionnaire de téléchargement.
 * 
 * 2. Fallback universel HTML5 avec objet File, attachement au DOM et révocation différée (60s)
 *    pour éviter que Chrome ne perde les métadonnées en cours de transfert.
 */

export async function triggerFileDownload(blob: Blob, filename: string): Promise<void> {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return;
  }

  // 1. File System Access API native (Chrome / Edge 86+ sur Windows / Mac / Linux)
  const win = window as unknown as {
    showSaveFilePicker?: (options: {
      suggestedName?: string;
      types?: Array<{
        description: string;
        accept: Record<string, string[]>;
      }>;
    }) => Promise<{
      createWritable: () => Promise<{
        write: (data: Blob) => Promise<void>;
        close: () => Promise<void>;
      }>;
    }>;
  };

  if (typeof win.showSaveFilePicker === 'function') {
    try {
      const ext = filename.endsWith('.zip') ? '.zip' : filename.endsWith('.sh') ? '.sh' : '.txt';
      const mimeType = blob.type || (ext === '.zip' ? 'application/zip' : 'text/plain');

      const handle = await win.showSaveFilePicker({
        suggestedName: filename,
        types: [{
          description: ext === '.zip' ? 'Archive ZIP (*.zip)' : 'Fichier',
          accept: {
            [mimeType]: [ext]
          }
        }]
      });

      const writable = await handle.createWritable();
      await writable.write(blob);
      await writable.close();
      return;
    } catch (err: unknown) {
      // L'utilisateur a cliqué sur "Annuler" dans la fenêtre de sélection
      if (err instanceof Error && err.name === 'AbortError') {
        return;
      }
      // En cas de restriction de sécurité ou d'iframe, on bascule silencieusement sur l'ancre HTML5
    }
  }

  // 2. Fallback universel par ancre HTML5
  const file = new File([blob], filename, { type: blob.type || 'application/zip' });
  const url = window.URL.createObjectURL(file);
  
  const link = document.createElement('a');
  link.style.display = 'none';
  link.href = url;
  link.download = filename;
  link.setAttribute('download', filename);
  link.rel = 'noopener noreferrer';
  
  document.body.appendChild(link);
  link.click();
  
  // Délai de révocation prolongé à 60s pour éviter toute perte de métadonnées pendant l'écriture disque
  setTimeout(() => {
    if (link.parentNode) {
      link.parentNode.removeChild(link);
    }
    window.URL.revokeObjectURL(url);
  }, 60000);
}
