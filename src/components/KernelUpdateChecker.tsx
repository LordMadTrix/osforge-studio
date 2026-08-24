import React, { useEffect, useState } from 'react';
import { RefreshCw, Rss } from 'lucide-react';

interface KernelUpdateCheckerProps {
  lang: 'fr' | 'en';
}

interface KernelTagInfo {
  label: string;
  version: string;
  date: string | null;
}

// Interroge la vraie API GitHub du dépôt officiel torvalds/linux — pas une liste statique codée
// en dur comme le reste du catalogue de versions de l'app (UPSTREAM_FEED dans versionChecker.ts
// est entièrement fictif). kernel.org/releases.json aurait été la source la plus naturelle, mais
// elle n'envoie aucun header CORS (vérifié en live : "Failed to fetch" systématique depuis un
// navigateur, alors que curl côté serveur fonctionne très bien) — inutilisable en direct depuis
// un site statique. L'API GitHub, elle, envoie "Access-Control-Allow-Origin: *" (vérifié en live)
// et référence les mêmes tags de version que le vrai dépôt du noyau.
export const KernelUpdateChecker: React.FC<KernelUpdateCheckerProps> = ({ lang }) => {
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [tags, setTags] = useState<KernelTagInfo[]>([]);
  const [checkedAt, setCheckedAt] = useState<Date | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  const checkNow = async () => {
    setStatus('loading');
    setErrorMsg('');
    try {
      const res = await fetch('https://api.github.com/repos/torvalds/linux/tags?per_page=30');
      if (res.status === 403) throw new Error(
        lang === 'fr'
          ? "Limite de requêtes GitHub atteinte pour votre connexion (60/heure sans authentification) : réessayez dans quelques minutes."
          : 'GitHub API rate limit reached for your connection (60/hour unauthenticated): try again in a few minutes.'
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const allTags: { name: string; commit: { url: string } }[] = await res.json();

      const latestRc = allTags.find(t => /-rc\d+$/.test(t.name));
      const latestStable = allTags.find(t => /^v\d+\.\d+(\.\d+)?$/.test(t.name));
      const picked = [latestStable, latestRc].filter(Boolean) as { name: string; commit: { url: string } }[];

      const withDates: KernelTagInfo[] = await Promise.all(
        picked.map(async (t) => {
          let date: string | null = null;
          try {
            const commitRes = await fetch(t.commit.url);
            if (commitRes.ok) {
              const commitData = await commitRes.json();
              date = commitData?.commit?.committer?.date?.slice(0, 10) || null;
            }
          } catch {
            // pas bloquant : on affiche juste la version sans date si cet appel échoue
          }
          return {
            label: t === latestStable
              ? (lang === 'fr' ? 'Stable (dernier tag)' : 'Stable (latest tag)')
              : (lang === 'fr' ? 'Release candidate (beta)' : 'Release candidate (beta)'),
            version: t.name,
            date,
          };
        })
      );

      setTags(withDates);
      setCheckedAt(new Date());
      setStatus('done');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
      setStatus('error');
    }
  };

  useEffect(() => { checkNow(); }, []);

  return (
    <div
      style={{
        padding: '12px 14px',
        marginBottom: '12px',
        background: 'var(--bg-accent-subtle)',
        border: '1px solid var(--border-active)',
        borderRadius: 'var(--radius-md)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', fontWeight: 700, color: 'var(--cyan)' }}>
          <Rss size={14} />
          {lang === 'fr' ? 'DERNIÈRE MINUTE — dépôt officiel du noyau en direct' : 'BREAKING — live from the official kernel repo'}
        </div>
        <button
          className="btn btn-secondary"
          onClick={checkNow}
          disabled={status === 'loading'}
          style={{ padding: '3px 9px', fontSize: '0.72rem' }}
        >
          <RefreshCw size={11} className={status === 'loading' ? 'spin' : ''} />
          {lang === 'fr' ? 'Revérifier' : 'Recheck'}
        </button>
      </div>

      {status === 'loading' && (
        <p style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginTop: '8px' }}>
          {lang === 'fr' ? 'Interrogation de github.com/torvalds/linux…' : 'Querying github.com/torvalds/linux…'}
        </p>
      )}

      {status === 'error' && (
        <p style={{ fontSize: '0.76rem', color: 'var(--rose)', marginTop: '8px' }}>
          {lang === 'fr' ? `Échec de la vérification : ${errorMsg}` : `Check failed: ${errorMsg}`}
        </p>
      )}

      {status === 'done' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '8px' }}>
          {tags.map(t => (
            <div key={t.label} style={{ display: 'flex', alignItems: 'baseline', gap: '8px', fontSize: '0.8rem' }}>
              <span style={{ color: 'var(--text-muted)', minWidth: '190px' }}>{t.label}</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--text-main)' }}>
                {t.version}
              </span>
              {t.date && (
                <span style={{ color: 'var(--text-dim)', fontSize: '0.72rem' }}>({t.date})</span>
              )}
            </div>
          ))}
          {tags.length === 0 && (
            <p style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
              {lang === 'fr' ? 'Aucun tag correspondant trouvé.' : 'No matching tag found.'}
            </p>
          )}
          {checkedAt && (
            <p style={{ fontSize: '0.68rem', color: 'var(--text-dim)', marginTop: '4px' }}>
              {lang === 'fr' ? 'Vérifié à ' : 'Checked at '}
              {checkedAt.toLocaleTimeString(lang === 'fr' ? 'fr-FR' : 'en-US')}
              {' — '}
              {lang === 'fr' ? 'source : github.com/torvalds/linux' : 'source: github.com/torvalds/linux'}
            </p>
          )}
        </div>
      )}
    </div>
  );
};
