import { useEffect, useState } from 'react';
import { fetchLiveDistroVersions, fetchLiveDesktopVersions, LiveVersionItem } from '../services/liveVersions';

interface LiveVersionsState {
  distros: Record<string, LiveVersionItem>;
  desktops: Record<string, LiveVersionItem>;
}

// Cache mémorisé au niveau module (pas par instance de hook) : DistroSelector.tsx et
// DesktopSelector.tsx sont montés simultanément sur la page Studio, donc deux hooks indépendants
// déclenchaient chacun leur propre fetch au montage. Bug réel trouvé en direct dans le navigateur :
// ça doublait les appels vers l'API GitHub non authentifiée (limite 60 requêtes/heure/IP,
// partagée avec KernelUpdateChecker) et provoquait un vrai "HTTP 403" de rate-limit, avec les
// cartes Hyprland/Sway/i3/Cinnamon/LXQt/COSMIC repliées silencieusement sur leur badge statique
// au lieu d'afficher la donnée live pourtant récupérée avec succès juste avant. Un seul fetch
// réel par chargement de page, quel que soit le nombre de composants qui appellent le hook.
let cachedPromise: Promise<LiveVersionsState> | null = null;

function getSharedLiveVersions(): Promise<LiveVersionsState> {
  if (!cachedPromise) {
    cachedPromise = Promise.all([fetchLiveDistroVersions(), fetchLiveDesktopVersions()]).then(([d, e]) => ({
      distros: Object.fromEntries(d.map(item => [item.id, item])),
      desktops: Object.fromEntries(e.map(item => [item.id, item])),
    }));
  }
  return cachedPromise;
}

export function useLiveVersions() {
  const [state, setState] = useState<LiveVersionsState>({ distros: {}, desktops: {} });
  const [status, setStatus] = useState<'loading' | 'done'>('loading');

  useEffect(() => {
    let cancelled = false;
    getSharedLiveVersions().then(result => {
      if (cancelled) return;
      setState(result);
      setStatus('done');
    });
    return () => { cancelled = true; };
  }, []);

  return { distros: state.distros, desktops: state.desktops, status };
}
