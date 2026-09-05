import React, { useState } from 'react';
import { OSRecipe } from '../types/os';
import {
  getUserProfiles,
  saveUserProfile,
  deleteUserProfile,
  downloadRecipeJsonFile,
  importRecipeFromJson,
  SavedProfile,
} from '../services/configStorage';
import {
  Save,
  Download,
  Upload,
  Trash2,
  CheckCircle2,
  X,
  FileJson,
  RotateCcw,
  Clock,
  Layers,
  AlertCircle,
} from 'lucide-react';

interface SavedProfilesModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentRecipe: OSRecipe;
  onLoadRecipe: (recipe: OSRecipe) => void;
  lang?: 'fr' | 'en';
}

const SavedProfilesModalContent: React.FC<Omit<SavedProfilesModalProps, 'isOpen'>> = ({
  onClose,
  currentRecipe,
  onLoadRecipe,
  lang = 'fr',
}) => {
  const isFr = lang === 'fr';

  const [profiles, setProfiles] = useState<SavedProfile[]>(() => getUserProfiles());
  const [profileName, setProfileName] = useState(
    () => currentRecipe.branding?.osName || currentRecipe.name || 'Mon Profil Personnalisé'
  );
  const [profileDesc, setProfileDesc] = useState(() => currentRecipe.description || '');
  const [notification, setNotification] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const refreshList = () => {
    setProfiles(getUserProfiles());
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileName.trim()) {
      setNotification({
        msg: isFr ? 'Veuillez saisir un nom pour ce profil.' : 'Please enter a profile name.',
        type: 'error',
      });
      return;
    }

    try {
      saveUserProfile(profileName.trim(), currentRecipe, profileDesc.trim());
      setNotification({
        msg: isFr ? `Profil "${profileName}" sauvegardé avec succès !` : `Profile "${profileName}" saved successfully!`,
        type: 'success',
      });
      refreshList();
    } catch {
      setNotification({
        msg: isFr ? 'Erreur lors de la sauvegarde locale.' : 'Error while saving locally.',
        type: 'error',
      });
    }
  };

  const handleLoad = (id: string) => {
    const p = getUserProfiles().find(item => item.id === id);
    if (!p) return;
    if (window.confirm(isFr ? `Charger le profil "${p.name}" ? Vos réglages actuels non sauvegardés seront remplacés.` : `Load profile "${p.name}"? Current unsaved settings will be replaced.`)) {
      onLoadRecipe(p.recipe);
      setNotification({
        msg: isFr ? `Profil "${p.name}" chargé !` : `Profile "${p.name}" loaded!`,
        type: 'success',
      });
      setTimeout(() => {
        onClose();
      }, 600);
    }
  };

  const handleDelete = (id: string, name: string) => {
    if (window.confirm(isFr ? `Supprimer définitivement le profil "${name}" ?` : `Permanently delete profile "${name}"?`)) {
      deleteUserProfile(id);
      refreshList();
      setNotification({
        msg: isFr ? `Profil supprimé.` : `Profile deleted.`,
        type: 'success',
      });
    }
  };

  const handleExportJson = () => {
    downloadRecipeJsonFile(currentRecipe);
    setNotification({
      msg: isFr ? 'Fichier de configuration JSON téléchargé.' : 'JSON configuration file downloaded.',
      type: 'success',
    });
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const res = importRecipeFromJson(content);
      if (res.success && res.recipe) {
        onLoadRecipe(res.recipe);
        setNotification({
          msg: isFr ? 'Configuration importée avec succès !' : 'Configuration imported successfully!',
          type: 'success',
        });
        setTimeout(() => {
          onClose();
        }, 800);
      } else {
        setNotification({
          msg: isFr ? `Erreur d'import : ${res.error || 'fichier JSON invalide'}` : `Import error: ${res.error || 'invalid JSON file'}`,
          type: 'error',
        });
      }
    };
    reader.readAsText(file);
    // Reset file input value
    e.target.value = '';
  };

  return (
    <div className="modal-overlay" style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(5, 10, 20, 0.85)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '20px',
    }}>
      <div className="modal-content" style={{
        background: 'linear-gradient(145deg, #0b1120, #0d1729)',
        border: '1px solid rgba(56, 189, 248, 0.3)',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8)',
        borderRadius: '16px',
        width: '100%',
        maxWidth: '820px',
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          padding: '16px 22px',
          borderBottom: '1px solid rgba(148, 163, 184, 0.15)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              background: 'rgba(56, 189, 248, 0.15)',
              border: '1px solid #38bdf8',
              borderRadius: '8px',
              padding: '8px',
              color: '#38bdf8',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <Save size={18} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#f8fafc' }}>
                {isFr ? 'Gestionnaire de Profils & Sauvegardes' : 'Profiles & Backup Manager'}
              </h3>
              <p style={{ margin: 0, fontSize: '0.76rem', color: '#94a3b8' }}>
                {isFr
                  ? 'Sauvegardez vos configurations personnalisées localement ou exportez/importez en JSON'
                  : 'Save your custom configurations locally or export/import via JSON'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '6px',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Notifications */}
        {notification && (
          <div style={{
            margin: '12px 22px 0 22px',
            padding: '10px 14px',
            borderRadius: '8px',
            background: notification.type === 'success' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
            border: notification.type === 'success' ? '1px solid #10b981' : '1px solid #ef4444',
            color: notification.type === 'success' ? '#6ee7b7' : '#fca5a5',
            fontSize: '0.82rem',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}>
            {notification.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
            <span>{notification.msg}</span>
          </div>
        )}

        {/* Corps de la modale */}
        <div style={{ padding: '20px 22px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '20px' }}>

          {/* Section 1 : Sauvegarder la configuration courante */}
          <div style={{
            background: 'rgba(15, 23, 42, 0.6)',
            border: '1px solid rgba(56, 189, 248, 0.2)',
            borderRadius: '12px',
            padding: '16px',
          }}>
            <h4 style={{ margin: '0 0 12px 0', fontSize: '0.92rem', color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Save size={16} />
              {isFr ? 'Enregistrer la configuration actuelle' : 'Save current configuration'}
            </h4>
            <form onSubmit={handleSave} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '10px', alignItems: 'flex-end' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.74rem', color: '#94a3b8', marginBottom: '4px' }}>
                  {isFr ? 'Nom du profil *' : 'Profile name *'}
                </label>
                <input
                  type="text"
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                  placeholder="ex. Gaming ROG Custom 2026"
                  style={{
                    width: '100%',
                    background: 'rgba(10, 15, 29, 0.8)',
                    border: '1px solid rgba(148, 163, 184, 0.3)',
                    color: '#f8fafc',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    fontSize: '0.82rem',
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.74rem', color: '#94a3b8', marginBottom: '4px' }}>
                  {isFr ? 'Description (optionnelle)' : 'Description (optional)'}
                </label>
                <input
                  type="text"
                  value={profileDesc}
                  onChange={(e) => setProfileDesc(e.target.value)}
                  placeholder="ex. Optimisé Btrfs + Audio Pro + Steam"
                  style={{
                    width: '100%',
                    background: 'rgba(10, 15, 29, 0.8)',
                    border: '1px solid rgba(148, 163, 184, 0.3)',
                    color: '#f8fafc',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    fontSize: '0.82rem',
                  }}
                />
              </div>
              <button
                type="submit"
                style={{
                  background: 'linear-gradient(135deg, #0284c7, #0369a1)',
                  border: 'none',
                  color: '#fff',
                  fontWeight: 600,
                  fontSize: '0.82rem',
                  padding: '9px 16px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  whiteSpace: 'nowrap',
                }}
              >
                <Save size={15} />
                {isFr ? 'Sauvegarder' : 'Save'}
              </button>
            </form>
          </div>

          {/* Section 2 : Liste des profils enregistrés */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <h4 style={{ margin: 0, fontSize: '0.92rem', color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Layers size={16} color="#38bdf8" />
                {isFr ? 'Profils enregistrés sur ce navigateur' : 'Saved profiles in this browser'} ({profiles.length})
              </h4>
            </div>

            {profiles.length === 0 ? (
              <div style={{
                background: 'rgba(15, 23, 42, 0.4)',
                border: '1px dashed rgba(148, 163, 184, 0.2)',
                borderRadius: '10px',
                padding: '24px',
                textAlign: 'center',
                color: '#64748b',
                fontSize: '0.82rem',
              }}>
                {isFr
                  ? 'Aucun profil sauvegardé pour le moment. Enregistrez votre premier profil ci-dessus ou importez un fichier JSON.'
                  : 'No saved profiles yet. Save your first profile above or import a JSON file.'}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {profiles.map((p) => (
                  <div
                    key={p.id}
                    style={{
                      background: 'rgba(15, 23, 42, 0.7)',
                      border: '1px solid rgba(148, 163, 184, 0.15)',
                      borderRadius: '10px',
                      padding: '12px 16px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '12px',
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
                        <span style={{ fontWeight: 700, fontSize: '0.88rem', color: '#f1f5f9' }}>{p.name}</span>
                        <span style={{
                          fontSize: '0.68rem',
                          background: 'rgba(56, 189, 248, 0.15)',
                          color: '#38bdf8',
                          padding: '1px 6px',
                          borderRadius: '4px',
                          fontWeight: 600,
                          textTransform: 'uppercase',
                        }}>
                          {p.recipe.distro} • {p.recipe.desktop}
                        </span>
                      </div>
                      {p.description && (
                        <p style={{ margin: '0 0 4px 0', fontSize: '0.76rem', color: '#94a3b8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {p.description}
                        </p>
                      )}
                      <div style={{ fontSize: '0.7rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Clock size={11} />
                        {new Date(p.updatedAt).toLocaleString(isFr ? 'fr-FR' : 'en-US')}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <button
                        type="button"
                        onClick={() => handleLoad(p.id)}
                        style={{
                          background: 'rgba(16, 185, 129, 0.2)',
                          border: '1px solid rgba(16, 185, 129, 0.4)',
                          color: '#6ee7b7',
                          padding: '6px 12px',
                          borderRadius: '6px',
                          fontSize: '0.78rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '5px',
                        }}
                      >
                        <RotateCcw size={14} />
                        {isFr ? 'Charger' : 'Load'}
                      </button>

                      <button
                        type="button"
                        onClick={() => downloadRecipeJsonFile(p.recipe, `${p.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}.json`)}
                        title={isFr ? 'Exporter ce profil en JSON' : 'Export this profile as JSON'}
                        style={{
                          background: 'rgba(30, 41, 59, 0.8)',
                          border: '1px solid rgba(148, 163, 184, 0.25)',
                          color: '#94a3b8',
                          padding: '6px 8px',
                          borderRadius: '6px',
                          cursor: 'pointer',
                        }}
                      >
                        <Download size={14} />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDelete(p.id, p.name)}
                        title={isFr ? 'Supprimer' : 'Delete'}
                        style={{
                          background: 'rgba(239, 68, 68, 0.15)',
                          border: '1px solid rgba(239, 68, 68, 0.3)',
                          color: '#f87171',
                          padding: '6px 8px',
                          borderRadius: '6px',
                          cursor: 'pointer',
                        }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section 3 : Export et Import JSON universels */}
          <div style={{
            background: 'rgba(15, 23, 42, 0.6)',
            border: '1px solid rgba(148, 163, 184, 0.2)',
            borderRadius: '12px',
            padding: '14px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FileJson size={20} color="#38bdf8" />
              <div>
                <div style={{ fontSize: '0.84rem', fontWeight: 600, color: '#f8fafc' }}>
                  {isFr ? 'Sauvegarde Portable & Fichier JSON' : 'Portable Backup & JSON File'}
                </div>
                <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                  {isFr ? 'Partagez ou restaurez vos recettes sur n’importe quelle machine' : 'Share or restore recipes across any workstation'}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <button
                type="button"
                onClick={handleExportJson}
                style={{
                  background: 'rgba(56, 189, 248, 0.15)',
                  border: '1px solid #38bdf8',
                  color: '#38bdf8',
                  padding: '7px 14px',
                  borderRadius: '6px',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <Download size={14} />
                {isFr ? 'Télécharger JSON' : 'Export JSON'}
              </button>

              <label style={{
                background: 'rgba(139, 92, 246, 0.15)',
                border: '1px solid #8b5cf6',
                color: '#c4b5fd',
                padding: '7px 14px',
                borderRadius: '6px',
                fontSize: '0.78rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}>
                <Upload size={14} />
                {isFr ? 'Importer un JSON' : 'Import JSON'}
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImportFile}
                  style={{ display: 'none' }}
                />
              </label>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: '12px 22px',
          borderTop: '1px solid rgba(148, 163, 184, 0.15)',
          background: 'rgba(10, 15, 29, 0.6)',
          display: 'flex',
          justifyContent: 'flex-end',
        }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'rgba(30, 41, 59, 0.8)',
              border: '1px solid rgba(148, 163, 184, 0.3)',
              color: '#e2e8f0',
              padding: '7px 16px',
              borderRadius: '6px',
              fontSize: '0.82rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {isFr ? 'Fermer' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};

export const SavedProfilesModal: React.FC<SavedProfilesModalProps> = ({ isOpen, ...props }) => {
  if (!isOpen) return null;
  return <SavedProfilesModalContent {...props} />;
};

