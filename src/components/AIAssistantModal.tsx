import React, { useState } from 'react';
import { OSRecipe } from '../types/os';
import { analyzePromptToRecipe, AIAnalysisResult } from '../services/aiAssistant';
import { Wand2, X, Sparkles, Lightbulb, CheckCircle2 } from 'lucide-react';

interface AIAssistantModalProps {
  currentRecipe: OSRecipe;
  isOpen: boolean;
  onClose: () => void;
  onApplyRecipe: (updated: Partial<OSRecipe>) => void;
  lang: 'fr' | 'en';
}

export const AIAssistantModal: React.FC<AIAssistantModalProps> = ({
  currentRecipe,
  isOpen,
  onClose,
  onApplyRecipe,
  lang,
}) => {
  const [prompt, setPrompt] = useState<string>('');
  const [analysis, setAnalysis] = useState<AIAnalysisResult | null>(null);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);

  const samplePrompts = [
    'Station de dev moderne avec Hyprland, Docker, Neovim, Rust et Node.js',
    'Distribution cybersécurité avec Wireshark, Metasploit, Nmap et noyau durci',
    'Borne tactile Kiosk ultra-légère sous Alpine Linux avec Chromium plein écran',
    'Console de jeu de salon et Steam avec KDE Plasma et noyau basse latence',
    'Micro-serveur Homelab headless avec Kubernetes K3s, Docker et console Cockpit',
  ];

  const handleGenerate = (customText?: string) => {
    const textToAnalyze = customText || prompt;
    if (!textToAnalyze.trim()) return;

    setIsGenerating(true);
    setTimeout(() => {
      const result = analyzePromptToRecipe(textToAnalyze, currentRecipe);
      setAnalysis(result);
      setIsGenerating(false);
    }, 400);
  };

  const handleApply = () => {
    if (analysis) {
      onApplyRecipe(analysis.recipe);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '800px' }}>
        {/* Header */}
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '30px',
              height: '30px',
              borderRadius: '6px',
              background: 'rgba(45, 212, 191, 0.15)',
              border: '1px solid rgba(45, 212, 191, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--violet)',
            }}>
              <Wand2 size={16} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)' }}>
                {lang === 'fr' ? 'Architecte IA — Génération par Prompt' : 'AI OS Architect — Prompt to Distro'}
              </h3>
              <p style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                {lang === 'fr'
                  ? 'Décrivez vos besoins en langage naturel et l’IA composera la recette d’OS idéale.'
                  : 'Describe your requirements in natural language and the AI will craft the optimal OS recipe.'}
              </p>
            </div>
          </div>

          <button onClick={onClose} className="btn btn-secondary" style={{ padding: '5px' }}>
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Prompt input */}
          <div>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px', fontWeight: 600 }}>
              {lang === 'fr' ? 'Que souhaitez-vous construire ?' : 'What kind of OS do you want to build?'}
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                className="input-text"
                placeholder={lang === 'fr' ? 'ex: Un OS ultra-léger pour serveur Docker avec sécurité CIS...' : 'ex: Lightweight server for Docker with CIS hardening...'}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
                style={{ fontSize: '0.88rem' }}
                autoFocus
              />
              <button
                onClick={() => handleGenerate()}
                className="btn btn-ai"
                style={{ padding: '0 18px', fontSize: '0.82rem' }}
                disabled={isGenerating || !prompt.trim()}
              >
                <Sparkles size={14} />
                <span>{isGenerating ? (lang === 'fr' ? 'Analyse...' : 'Analyzing...') : (lang === 'fr' ? 'Générer' : 'Generate')}</span>
              </button>
            </div>
          </div>

          {/* Quick Idea Chips */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.76rem', color: 'var(--text-muted)', marginBottom: '6px' }}>
              <Lightbulb size={13} color="#f59e0b" />
              <span>{lang === 'fr' ? 'Suggestions rapides :' : 'Quick inspirations:'}</span>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
              {samplePrompts.map((p, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setPrompt(p);
                    handleGenerate(p);
                  }}
                  style={{
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid var(--border-subtle)',
                    color: '#cbd5e1',
                    padding: '4px 8px',
                    borderRadius: '5px',
                    fontSize: '0.72rem',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'var(--violet)';
                    e.currentTarget.style.color = '#f1f5f9';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'var(--border-subtle)';
                    e.currentTarget.style.color = '#cbd5e1';
                  }}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* AI Analysis Result Display */}
          {analysis && (
            <div style={{
              background: 'rgba(26, 22, 19, 0.65)',
              border: '1px solid rgba(45, 212, 191, 0.3)',
              borderRadius: '8px',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h4 style={{ fontSize: '0.94rem', fontWeight: 700, color: '#c084fc', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Sparkles size={15} />
                  {lang === 'fr' ? 'Configuration Recommandée' : 'AI Recommended Recipe'}
                </h4>
                <span className="badge badge-violet" style={{ fontSize: '0.66rem' }}>
                  Confiance : {(analysis.confidence * 100).toFixed(0)}%
                </span>
              </div>

              {/* Tags */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                {analysis.suggestedTags.map((t, idx) => (
                  <span key={idx} className="badge badge-cyan" style={{ fontSize: '0.66rem' }}>
                    ✓ {t}
                  </span>
                ))}
              </div>

              {/* AI Reasoning */}
              <div style={{
                background: 'rgba(10, 15, 28, 0.5)',
                borderRadius: '6px',
                padding: '10px 12px',
                fontSize: '0.8rem',
                color: 'var(--text-main)',
                lineHeight: '1.45',
                whiteSpace: 'pre-line',
                border: '1px solid var(--border-subtle)',
              }}>
                {analysis.reasoning}
              </div>

              {/* Quick Summary Grid */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                gap: '8px',
                fontSize: '0.75rem',
              }}>
                <div style={{ padding: '6px 8px', background: 'rgba(0,0,0,0.25)', borderRadius: '5px' }}>
                  <span style={{ color: 'var(--text-dim)' }}>Distribution :</span>
                  <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{analysis.recipe.distro}</div>
                </div>
                <div style={{ padding: '6px 8px', background: 'rgba(0,0,0,0.25)', borderRadius: '5px' }}>
                  <span style={{ color: 'var(--text-dim)' }}>Bureau :</span>
                  <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{analysis.recipe.desktop}</div>
                </div>
                <div style={{ padding: '6px 8px', background: 'rgba(0,0,0,0.25)', borderRadius: '5px' }}>
                  <span style={{ color: 'var(--text-dim)' }}>Noyau :</span>
                  <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{analysis.recipe.kernel}</div>
                </div>
                <div style={{ padding: '6px 8px', background: 'rgba(0,0,0,0.25)', borderRadius: '5px' }}>
                  <span style={{ color: 'var(--text-dim)' }}>Paquets :</span>
                  <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{analysis.recipe.selectedPackages?.length || 0} logiciels</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '12px 20px',
          borderTop: '1px solid var(--border-subtle)',
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '8px',
        }}>
          <button onClick={onClose} className="btn btn-secondary" style={{ padding: '5px 12px', fontSize: '0.8rem' }}>
            {lang === 'fr' ? 'Annuler' : 'Cancel'}
          </button>
          {analysis && (
            <button onClick={handleApply} className="btn btn-ai" style={{ padding: '5px 14px', fontSize: '0.8rem' }}>
              <CheckCircle2 size={14} />
              <span>{lang === 'fr' ? 'Appliquer cette Recette' : 'Apply this Recipe'}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
