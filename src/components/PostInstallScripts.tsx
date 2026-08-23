import React, { useState } from 'react';
import { OSRecipe, CustomService } from '../types/os';
import { ContextTip } from './ContextTip';
import { InfoTooltip } from './InfoTooltip';
import { Terminal, Plus, Trash2, GitBranch, Server } from 'lucide-react';

interface PostInstallScriptsProps {
  recipe: OSRecipe;
  onChange: (updated: Partial<OSRecipe>) => void;
  lang: 'fr' | 'en';
  onOpenTips?: () => void;
}

export const PostInstallScripts: React.FC<PostInstallScriptsProps> = ({ recipe, onChange, lang, onOpenTips }) => {
  const [newServiceName, setNewServiceName] = useState('');
  const [newServiceDesc, setNewServiceDesc] = useState('');
  const [newServiceExec, setNewServiceExec] = useState('');

  const handleAddService = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newServiceName.trim() || !newServiceExec.trim()) return;

    const newService: CustomService = {
      name: newServiceName.trim().endsWith('.service') ? newServiceName.trim() : `${newServiceName.trim()}.service`,
      description: newServiceDesc.trim() || 'Service personnalisé OSForge',
      execStart: newServiceExec.trim(),
      enabled: true,
    };

    onChange({ customServices: [...recipe.customServices, newService] });
    setNewServiceName('');
    setNewServiceDesc('');
    setNewServiceExec('');
  };

  const removeService = (index: number) => {
    const updated = recipe.customServices.filter((_, i) => i !== index);
    onChange({ customServices: updated });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
      {/* Contextual Pro Tip */}
      <ContextTip category="scripts" lang={lang} onOpenAllTips={onOpenTips} />

      {/* 1. First Boot Hook Script */}
      <div className="glass-panel" style={{ padding: '18px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <h3 style={{ fontSize: '0.98rem', fontWeight: 700, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Terminal size={16} color="var(--cyan)" />
            {lang === 'fr' ? 'Script Bash au Premier Démarrage (First-Boot Hook)' : 'First-Boot Hook Bash Script'}
            <InfoTooltip
              text={lang === 'fr'
                ? 'S’exécute une seule fois avec privilèges root au boot initial puis s’auto-désactive.'
                : 'Runs once with root privileges on the initial boot then deactivates itself.'}
            />
          </h3>
          <span className="badge badge-cyan" style={{ fontSize: '0.66rem' }}>
            /root/firstboot.sh
          </span>
        </div>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '10px' }}>
          {lang === 'fr'
            ? 'Ce script s’exécutera automatiquement avec les privilèges root lors du tout premier démarrage de la machine.'
            : 'This bash script will run automatically with root privileges on the first system boot.'}
        </p>

        <textarea
          className="textarea-custom font-mono"
          rows={5}
          value={recipe.firstBootScript}
          onChange={(e) => onChange({ firstBootScript: e.target.value })}
          placeholder={`# Exemple de script first-boot :\necho "Initialisation terminée" > /var/log/osforge-init.log\ncurl -fsSL https://get.docker.com | sh\nsystemctl enable --now docker`}
          style={{ fontSize: '0.82rem' }}
        />
      </div>

      {/* 2. Dotfiles Git Repo Injection */}
      <div className="glass-panel" style={{ padding: '18px' }}>
        <h3 style={{ fontSize: '0.98rem', fontWeight: 700, color: '#f8fafc', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <GitBranch size={16} color="var(--violet)" />
          {lang === 'fr' ? 'Clonage Automatique de Dotfiles Git' : 'Automatic Git Dotfiles Injection'}
          <InfoTooltip
            text={lang === 'fr'
              ? 'Clonera et appliquera automatiquement vos configurations de terminal et éditeurs dans ~.'
              : 'Automatically clones your terminal and editor configurations into the user home.'}
          />
        </h3>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '10px' }}>
          {lang === 'fr'
            ? 'Renseignez l’URL d’un dépôt Git public de dotfiles (.bashrc, .zshrc, configs Neovim, Hyprland, etc.) à cloner dans le home de l’utilisateur.'
            : 'Provide a public Git repository with dotfiles to automatically clone into the user home directory.'}
        </p>

        <input
          type="text"
          className="input-text font-mono"
          placeholder="https://github.com/votre-pseudo/dotfiles.git"
          value={recipe.dotfilesGitUrl || ''}
          onChange={(e) => onChange({ dotfilesGitUrl: e.target.value })}
        />
      </div>

      {/* 3. Custom Systemd Units Generator */}
      <div className="glass-panel" style={{ padding: '18px' }}>
        <h3 style={{ fontSize: '0.98rem', fontWeight: 700, color: '#f8fafc', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Server size={16} color="var(--emerald)" />
          {lang === 'fr' ? 'Créateur de Services Systemd Dédiés' : 'Custom Systemd Services Generator'}
          <InfoTooltip
            text={lang === 'fr'
              ? 'Génère des fichiers /etc/systemd/system/*.service avec démarrage automatique.'
              : 'Generates managed /etc/systemd/system/*.service units enabled on boot.'}
          />
        </h3>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '12px' }}>
          {lang === 'fr'
            ? 'Créez des démons d’arrière-plan gérés par systemctl (ex: serveur web embarqué, script de télémétrie, bot).'
            : 'Create background daemons managed by systemd.'}
        </p>

        {/* Add Service Form */}
        <form onSubmit={handleAddService} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr)) 90px', gap: '8px', marginBottom: '14px' }}>
          <input
            type="text"
            className="input-text font-mono"
            placeholder="nom-service (ex: mybot)"
            value={newServiceName}
            onChange={(e) => setNewServiceName(e.target.value)}
          />
          <input
            type="text"
            className="input-text"
            placeholder="Description (ex: Bot télémétrie)"
            value={newServiceDesc}
            onChange={(e) => setNewServiceDesc(e.target.value)}
          />
          <input
            type="text"
            className="input-text font-mono"
            placeholder="ExecStart (ex: /usr/bin/python3 /app/bot.py)"
            value={newServiceExec}
            onChange={(e) => setNewServiceExec(e.target.value)}
          />
          <button type="submit" className="btn btn-secondary">
            <Plus size={14} />
            {lang === 'fr' ? 'Créer' : 'Add'}
          </button>
        </form>

        {/* List of Custom Services */}
        {recipe.customServices.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {recipe.customServices.map((srv, idx) => (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '8px 12px',
                  background: 'rgba(10, 15, 28, 0.4)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '6px',
                }}
              >
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.84rem', color: 'var(--emerald)', fontFamily: 'var(--font-mono)' }}>
                    {srv.name}
                  </div>
                  <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                    {srv.description} — <code style={{ color: '#cbd5e1' }}>{srv.execStart}</code>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => removeService(idx)}
                  className="btn btn-secondary"
                  style={{ padding: '3px 6px', color: '#f87171' }}
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
