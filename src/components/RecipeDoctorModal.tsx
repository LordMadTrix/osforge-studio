import React, { useState } from 'react';
import { OSRecipe } from '../types/os';
import { auditRecipe, applyRecipeFix, RecipeDiagnostic } from '../services/recipeDoctor';
import {
  Activity,
  AlertOctagon,
  AlertTriangle,
  Info,
  CheckCircle2,
  Wrench,
  ShieldCheck,
  X,
  Sparkles,
} from 'lucide-react';

interface RecipeDoctorModalProps {
  recipe: OSRecipe;
  onChangeRecipe: (recipe: OSRecipe) => void;
  onClose: () => void;
  lang: 'fr' | 'en';
}

export const RecipeDoctorModal: React.FC<RecipeDoctorModalProps> = ({
  recipe,
  onChangeRecipe,
  onClose,
  lang,
}) => {
  const [activeTab, setActiveTab] = useState<'all' | 'error' | 'warning' | 'info'>('all');
  const report = auditRecipe(recipe);

  const filteredDiagnostics = report.diagnostics.filter((d) => {
    if (activeTab === 'all') return true;
    return d.severity === activeTab;
  });

  const handleFix = (diagId: string) => {
    const updated = applyRecipeFix(recipe, diagId);
    onChangeRecipe(updated);
  };

  const handleFixAll = () => {
    let current = recipe;
    for (const diag of report.diagnostics) {
      if (diag.autoFix) {
        current = diag.autoFix(current);
      }
    }
    onChangeRecipe(current);
  };

  const fixableCount = report.diagnostics.filter((d) => Boolean(d.autoFix)).length;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(8px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '840px',
          maxHeight: '90vh',
          background: '#12151c',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          borderRadius: '16px',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.03) 0%, transparent 100%)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(2, 132, 199, 0.3)',
              }}
            >
              <Activity size={22} color="#ffffff" />
            </div>
            <div>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#f8fafc', margin: 0 }}>
                {lang === 'fr' ? 'Recipe Doctor — Diagnostic de Recette' : 'Recipe Doctor — Configuration Diagnostics'}
              </h2>
              <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: '3px 0 0 0' }}>
                {lang === 'fr'
                  ? 'Audit d\'intégrité technique, compatibilité matérielle et durcissement de sécurité en temps réel'
                  : 'Real-time technical integrity audit, hardware compatibility and security hardening'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: 'none',
              borderRadius: '8px',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#94a3b8',
              transition: 'all 0.15s ease',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Score & Summary Banner */}
        <div
          style={{
            padding: '16px 24px',
            background: 'rgba(0, 0, 0, 0.25)',
            borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '16px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            {/* Global Health Score */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                style={{
                  fontSize: '1.8rem',
                  fontWeight: 800,
                  color: report.score >= 80 ? '#10b981' : report.score >= 50 ? '#f59e0b' : '#ef4444',
                }}
              >
                {report.score}/100
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '0.72rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {lang === 'fr' ? 'Indice de Santé' : 'Health Score'}
                </span>
                <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#e2e8f0' }}>
                  {report.passed
                    ? (lang === 'fr' ? '✅ Recette Prête' : '✅ Recipe Ready')
                    : (lang === 'fr' ? '⚠️ Incohérences Détectées' : '⚠️ Issues Detected')}
                </span>
              </div>
            </div>

            <div style={{ height: '32px', width: '1px', background: 'rgba(255, 255, 255, 0.1)' }} />

            {/* Security Hardening Index */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShieldCheck size={20} color="#38bdf8" />
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '0.72rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {lang === 'fr' ? 'Durcissement ANSSI/CIS' : 'Security Hardening'}
                </span>
                <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#38bdf8' }}>
                  {report.securityScore}%
                </span>
              </div>
            </div>
          </div>

          {/* Quick Fix All Button */}
          {fixableCount > 0 && (
            <button
              onClick={handleFixAll}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 16px',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                color: '#ffffff',
                border: 'none',
                fontWeight: 600,
                fontSize: '0.8rem',
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(2, 132, 199, 0.25)',
                transition: 'all 0.15s ease',
              }}
            >
              <Sparkles size={15} />
              <span>
                {lang === 'fr'
                  ? `Résoudre Tout Automatiquement (${fixableCount})`
                  : `Auto-Fix All (${fixableCount})`}
              </span>
            </button>
          )}
        </div>

        {/* Filter Tabs */}
        <div
          style={{
            padding: '12px 24px 0 24px',
            display: 'flex',
            gap: '8px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
          }}
        >
          <button
            onClick={() => setActiveTab('all')}
            style={{
              padding: '6px 14px',
              fontSize: '0.78rem',
              fontWeight: activeTab === 'all' ? 700 : 500,
              color: activeTab === 'all' ? '#0284c7' : '#94a3b8',
              borderBottom: activeTab === 'all' ? '2px solid #0284c7' : '2px solid transparent',
              background: 'transparent',
              borderTop: 'none',
              borderLeft: 'none',
              borderRight: 'none',
              cursor: 'pointer',
            }}
          >
            {lang === 'fr' ? 'Tous les diagnostics' : 'All diagnostics'} ({report.diagnostics.length})
          </button>

          <button
            onClick={() => setActiveTab('error')}
            style={{
              padding: '6px 14px',
              fontSize: '0.78rem',
              fontWeight: activeTab === 'error' ? 700 : 500,
              color: activeTab === 'error' ? '#ef4444' : '#94a3b8',
              borderBottom: activeTab === 'error' ? '2px solid #ef4444' : '2px solid transparent',
              background: 'transparent',
              borderTop: 'none',
              borderLeft: 'none',
              borderRight: 'none',
              cursor: 'pointer',
            }}
          >
            {lang === 'fr' ? 'Erreurs Bloquantes' : 'Critical Errors'} ({report.errorCount})
          </button>

          <button
            onClick={() => setActiveTab('warning')}
            style={{
              padding: '6px 14px',
              fontSize: '0.78rem',
              fontWeight: activeTab === 'warning' ? 700 : 500,
              color: activeTab === 'warning' ? '#f59e0b' : '#94a3b8',
              borderBottom: activeTab === 'warning' ? '2px solid #f59e0b' : '2px solid transparent',
              background: 'transparent',
              borderTop: 'none',
              borderLeft: 'none',
              borderRight: 'none',
              cursor: 'pointer',
            }}
          >
            {lang === 'fr' ? 'Avertissements' : 'Warnings'} ({report.warningCount})
          </button>

          <button
            onClick={() => setActiveTab('info')}
            style={{
              padding: '6px 14px',
              fontSize: '0.78rem',
              fontWeight: activeTab === 'info' ? 700 : 500,
              color: activeTab === 'info' ? '#38bdf8' : '#94a3b8',
              borderBottom: activeTab === 'info' ? '2px solid #38bdf8' : '2px solid transparent',
              background: 'transparent',
              borderTop: 'none',
              borderLeft: 'none',
              borderRight: 'none',
              cursor: 'pointer',
            }}
          >
            {lang === 'fr' ? 'Conseils & Optimisations' : 'Tips & Optimizations'} ({report.infoCount})
          </button>
        </div>

        {/* Diagnostic Items List */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '20px 24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
          {filteredDiagnostics.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: '40px 20px',
                color: '#94a3b8',
              }}
            >
              <CheckCircle2 size={42} color="#10b981" style={{ margin: '0 auto 12px auto' }} />
              <h3 style={{ color: '#f8fafc', fontSize: '1rem', fontWeight: 600, margin: '0 0 6px 0' }}>
                {lang === 'fr' ? 'Aucun problème détecté dans cette catégorie' : 'No issues detected in this category'}
              </h3>
              <p style={{ fontSize: '0.8rem', margin: 0 }}>
                {lang === 'fr'
                  ? 'Votre recette d\'OS est parfaitement saine, cohérente et prête pour la compilation.'
                  : 'Your OS recipe is consistent, healthy and ready for compilation.'}
              </p>
            </div>
          ) : (
            filteredDiagnostics.map((diag) => (
              <DiagnosticCard
                key={diag.id}
                diagnostic={diag}
                onFix={handleFix}
                lang={lang}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
};

interface DiagnosticCardProps {
  diagnostic: RecipeDiagnostic;
  onFix: (id: string) => void;
  lang: 'fr' | 'en';
}

const DiagnosticCard: React.FC<DiagnosticCardProps> = ({ diagnostic, onFix, lang }) => {
  const isError = diagnostic.severity === 'error';
  const isWarning = diagnostic.severity === 'warning';
  const isInfo = diagnostic.severity === 'info';

  const borderColor = isError
    ? 'rgba(239, 68, 68, 0.3)'
    : isWarning
      ? 'rgba(245, 158, 11, 0.3)'
      : 'rgba(56, 189, 248, 0.3)';

  const bgColor = isError
    ? 'rgba(239, 68, 68, 0.05)'
    : isWarning
      ? 'rgba(245, 158, 11, 0.05)'
      : 'rgba(56, 189, 248, 0.05)';

  const iconColor = isError ? '#ef4444' : isWarning ? '#f59e0b' : '#38bdf8';

  return (
    <div
      style={{
        border: `1px solid ${borderColor}`,
        background: bgColor,
        borderRadius: '10px',
        padding: '14px 18px',
        display: 'flex',
        gap: '14px',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
      }}
    >
      <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', flex: 1 }}>
        <div style={{ marginTop: '2px' }}>
          {isError && <AlertOctagon size={18} color={iconColor} />}
          {isWarning && <AlertTriangle size={18} color={iconColor} />}
          {isInfo && <Info size={18} color={iconColor} />}
        </div>

        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <h4 style={{ margin: 0, fontSize: '0.88rem', fontWeight: 600, color: '#f8fafc' }}>
              {diagnostic.title}
            </h4>
            <span
              style={{
                fontSize: '0.62rem',
                textTransform: 'uppercase',
                padding: '2px 6px',
                borderRadius: '4px',
                fontWeight: 700,
                letterSpacing: '0.04em',
                background: isError
                  ? 'rgba(239, 68, 68, 0.2)'
                  : isWarning
                    ? 'rgba(245, 158, 11, 0.2)'
                    : 'rgba(56, 189, 248, 0.2)',
                color: iconColor,
              }}
            >
              {diagnostic.category}
            </span>
          </div>

          <p style={{ margin: '6px 0 0 0', fontSize: '0.78rem', color: '#94a3b8', lineHeight: 1.4 }}>
            {diagnostic.message}
          </p>
        </div>
      </div>

      {diagnostic.autoFix && (
        <button
          onClick={() => onFix(diagnostic.id)}
          style={{
            marginLeft: '12px',
            padding: '6px 12px',
            borderRadius: '6px',
            background: 'rgba(255, 255, 255, 0.08)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            color: '#f8fafc',
            fontSize: '0.74rem',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--cyan)';
            e.currentTarget.style.color = '#000000';
            e.currentTarget.style.borderColor = 'var(--cyan)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
            e.currentTarget.style.color = '#f8fafc';
            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.15)';
          }}
        >
          <Wrench size={13} />
          <span>{diagnostic.fixLabel || (lang === 'fr' ? 'Corriger' : 'Fix')}</span>
        </button>
      )}
    </div>
  );
};
