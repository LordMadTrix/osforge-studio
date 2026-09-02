import React, { useState } from 'react';
import { OSRecipe } from '../types/os';
import {
  WIZARD_INTENTS,
  WIZARD_DESKTOP_CHOICES,
  WIZARD_SOFTWARE_PACKS,
  WIZARD_FORMAT_CHOICES,
  WizardIntent,
  applyWizardIntentToRecipe,
} from '../data/wizardSteps';
import {
  Gamepad2,
  Code2,
  Laptop,
  ShieldCheck,
  Server,
  Zap,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Sparkles,
  Sliders,
  Check,
  Globe,
  Film,
  Code,
  Tv,
  Activity,
  Disc,
  AppWindow,
  HardDrive,
  Cpu,
  User,
  Lock,
  Eye,
  EyeOff,
  Image as ImageIcon,
  Rocket,
} from 'lucide-react';

interface WizardModeProps {
  recipe: OSRecipe;
  onUpdateRecipe: (updated: Partial<OSRecipe>) => void;
  onStartBuild: () => void;
  onSwitchToExpert: () => void;
  onOpenScreenshots?: (targetId?: string) => void;
  onOpenAudit?: () => void;
  lang: 'fr' | 'en';
}

const INTENT_ICONS: Record<string, React.FC<{ size?: number; color?: string }>> = {
  Gamepad2: (props) => <Gamepad2 {...props} />,
  Code2: (props) => <Code2 {...props} />,
  Laptop: (props) => <Laptop {...props} />,
  ShieldCheck: (props) => <ShieldCheck {...props} />,
  Server: (props) => <Server {...props} />,
  Zap: (props) => <Zap {...props} />,
};

const PACK_ICONS: Record<string, React.FC<{ size?: number; color?: string }>> = {
  Globe: (props) => <Globe {...props} />,
  Film: (props) => <Film {...props} />,
  Gamepad2: (props) => <Gamepad2 {...props} />,
  Code: (props) => <Code {...props} />,
  Tv: (props) => <Tv {...props} />,
  Activity: (props) => <Activity {...props} />,
};

const FORMAT_ICONS: Record<string, React.FC<{ size?: number; color?: string }>> = {
  Disc: (props) => <Disc {...props} />,
  AppWindow: (props) => <AppWindow {...props} />,
  HardDrive: (props) => <HardDrive {...props} />,
  Cpu: (props) => <Cpu {...props} />,
};

export const WizardMode: React.FC<WizardModeProps> = ({
  recipe,
  onUpdateRecipe,
  onStartBuild,
  onSwitchToExpert,
  onOpenScreenshots,
  onOpenAudit,
  lang,
}) => {
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [selectedIntentId, setSelectedIntentId] = useState<string>('gaming');
  const [showPassword, setShowPassword] = useState<boolean>(false);

  const steps = [
    { num: 1, title: lang === 'fr' ? 'Objectif & Usage' : 'Goal & Usage' },
    { num: 2, title: lang === 'fr' ? 'Bureau & Style' : 'Desktop & Style' },
    { num: 3, title: lang === 'fr' ? 'Logiciels' : 'Software Packs' },
    { num: 4, title: lang === 'fr' ? 'Session & Identité' : 'User & Identity' },
    { num: 5, title: lang === 'fr' ? 'Format & Build' : 'Format & Build' },
  ];

  const handleSelectIntent = (intent: WizardIntent) => {
    setSelectedIntentId(intent.id);
    const updated = applyWizardIntentToRecipe(intent, recipe);
    onUpdateRecipe(updated);
  };

  const handleToggleSoftwarePack = (packageIds: string[]) => {
    const allIncluded = packageIds.every((pkg) => recipe.selectedPackages.includes(pkg));
    let nextSelected: string[];
    if (allIncluded) {
      nextSelected = recipe.selectedPackages.filter((p) => !packageIds.includes(p));
    } else {
      nextSelected = Array.from(new Set([...recipe.selectedPackages, ...packageIds]));
    }
    onUpdateRecipe({ selectedPackages: nextSelected });
  };

  const isPackSelected = (packageIds: string[]) => {
    return packageIds.every((pkg) => recipe.selectedPackages.includes(pkg));
  };

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Top Banner Guide */}
      <div
        className="glass-panel"
        style={{
          padding: '16px 22px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '14px',
          border: '1px solid var(--border-active)',
          background: 'linear-gradient(135deg, rgba(249, 115, 22, 0.08) 0%, rgba(26, 22, 19, 0.8) 100%)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              background: 'rgba(249, 115, 22, 0.16)',
              border: '1px solid rgba(249, 115, 22, 0.35)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--cyan)',
            }}
          >
            <Sparkles size={20} />
          </div>
          <div>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
              {lang === 'fr' ? 'Assistant de Création Pas-à-Pas' : 'Step-by-Step Creation Wizard'}
            </h2>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: 0 }}>
              {lang === 'fr'
                ? 'Concevez votre système Linux parfait en 5 questions simples, sans jargon technique.'
                : 'Build your perfect custom Linux system in 5 easy steps without technical jargon.'}
            </p>
          </div>
        </div>

        <button
          onClick={onSwitchToExpert}
          className="btn btn-secondary"
          style={{ fontSize: '0.8rem', padding: '6px 14px', display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <Sliders size={14} />
          <span>{lang === 'fr' ? 'Passer en Mode Expert (Studio)' : 'Switch to Expert Studio'}</span>
        </button>
      </div>

      {/* Step Progression Bar */}
      <div
        className="glass-panel"
        style={{
          padding: '14px 20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '8px',
          overflowX: 'auto',
        }}
      >
        {steps.map((s) => {
          const isActive = s.num === currentStep;
          const isDone = s.num < currentStep;

          return (
            <button
              key={s.num}
              onClick={() => setCurrentStep(s.num)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: isActive
                  ? 'rgba(249, 115, 22, 0.15)'
                  : isDone
                  ? 'rgba(16, 185, 129, 0.1)'
                  : 'transparent',
                border: isActive
                  ? '1px solid var(--cyan)'
                  : isDone
                  ? '1px solid rgba(16, 185, 129, 0.3)'
                  : '1px solid transparent',
                borderRadius: '6px',
                padding: '6px 12px',
                cursor: 'pointer',
                color: isActive ? 'var(--cyan)' : isDone ? '#10b981' : 'var(--text-dim)',
                fontSize: '0.82rem',
                fontWeight: isActive ? 700 : 500,
                transition: 'all 0.15s ease',
                whiteSpace: 'nowrap',
              }}
            >
              <span
                style={{
                  width: '20px',
                  height: '20px',
                  borderRadius: '50%',
                  background: isActive ? 'var(--cyan)' : isDone ? '#10b981' : 'rgba(255, 255, 255, 0.08)',
                  color: isActive || isDone ? '#000000' : 'var(--text-dim)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.72rem',
                  fontWeight: 800,
                }}
              >
                {isDone ? '✓' : s.num}
              </span>
              <span>{s.title}</span>
            </button>
          );
        })}
      </div>

      {/* Step Content Container */}
      <div className="glass-panel" style={{ padding: '24px 28px', minHeight: '440px' }}>
        {/* ===================================================================== */}
        {/* STEP 1: Objectif & Usage */}
        {/* ===================================================================== */}
        {currentStep === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            <div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '4px' }}>
                {lang === 'fr' ? '1. Quel est votre objectif principal ?' : '1. What is your main objective?'}
              </h3>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                {lang === 'fr'
                  ? 'Choisissez le profil qui correspond le mieux à votre utilisation. Nous préconfigurerons les meilleurs composants pour vous.'
                  : 'Select the profile matching your use case. We will preconfigure the best components for you.'}
              </p>
            </div>

            {onOpenAudit && (
              <div style={{
                background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.12), rgba(56, 189, 248, 0.08))',
                border: '1px solid rgba(16, 185, 129, 0.35)',
                borderRadius: '10px',
                padding: '12px 16px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '12px',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ fontSize: '1.4rem' }}>🎯</div>
                  <div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#f1f5f9' }}>
                      {lang === 'fr' ? 'Vous hésitez ? Laissez l’Audit Matériel choisir pour vous' : 'Not sure? Let the Hardware Audit decide for you'}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                      {lang === 'fr' ? 'Sonde instantanée de votre CPU, RAM et GPU pour recommander la distribution parfaite.' : 'Instant probe of your CPU, RAM, and GPU to recommend the ideal distro.'}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onOpenAudit}
                  className="btn btn-primary"
                  style={{ padding: '6px 14px', fontSize: '0.78rem', fontWeight: 700 }}
                >
                  <span>{lang === 'fr' ? 'Lancer l’Audit Matériel' : 'Run Hardware Audit'}</span>
                  <ArrowRight size={14} />
                </button>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '14px' }}>
              {WIZARD_INTENTS.map((intent) => {
                const Icon = INTENT_ICONS[intent.icon] || Sparkles;
                const isSelected = selectedIntentId === intent.id;

                return (
                  <div
                    key={intent.id}
                    onClick={() => handleSelectIntent(intent)}
                    style={{
                      padding: '16px 18px',
                      borderRadius: '8px',
                      background: isSelected ? 'rgba(249, 115, 22, 0.12)' : 'rgba(26, 22, 19, 0.6)',
                      border: isSelected ? '2px solid var(--cyan)' : '1px solid var(--border-subtle)',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      gap: '10px',
                      transition: 'all 0.15s ease',
                      boxShadow: isSelected ? '0 0 16px rgba(249, 115, 22, 0.2)' : 'none',
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div
                            style={{
                              width: '32px',
                              height: '32px',
                              borderRadius: '6px',
                              background: isSelected ? 'var(--cyan)' : 'rgba(255, 255, 255, 0.06)',
                              color: isSelected ? '#000000' : 'var(--cyan)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <Icon size={18} />
                          </div>
                          <span style={{ fontSize: '0.94rem', fontWeight: 700, color: 'var(--text-main)' }}>
                            {intent.title}
                          </span>
                        </div>
                        <span className="badge badge-cyan" style={{ fontSize: '0.64rem' }}>
                          {intent.badge}
                        </span>
                      </div>

                      <p style={{ fontSize: '0.78rem', color: 'var(--cyan)', fontWeight: 500, marginBottom: '6px' }}>
                        {intent.subtitle}
                      </p>
                      <p style={{ fontSize: '0.76rem', color: 'var(--text-muted)', lineHeight: '1.35', margin: 0 }}>
                        {intent.description}
                      </p>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '8px', borderTop: '1px solid rgba(255, 255, 255, 0.05)' }}>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>
                        Base : <strong style={{ color: '#f1f5f9' }}>{intent.recommendedDistro.toUpperCase()}</strong>
                      </span>
                      {isSelected && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.72rem', color: 'var(--cyan)', fontWeight: 700 }}>
                          <CheckCircle2 size={13} /> {lang === 'fr' ? 'Sélectionné' : 'Selected'}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ===================================================================== */}
        {/* STEP 2: Bureau & Style */}
        {/* ===================================================================== */}
        {currentStep === 2 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            <div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '4px' }}>
                {lang === 'fr' ? '2. Choisissez l’apparence et le style de bureau' : '2. Choose Desktop Environment & Style'}
              </h3>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                {lang === 'fr'
                  ? 'L’environnement de bureau définit l’interface graphique, la disposition du menu et la consommation de mémoire vive (RAM).'
                  : 'The desktop environment sets your user interface layout, visual style, and RAM footprint.'}
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(310px, 1fr))', gap: '14px' }}>
              {WIZARD_DESKTOP_CHOICES.map((de) => {
                const isSelected = recipe.desktop === de.id;

                return (
                  <div
                    key={de.id}
                    onClick={() => onUpdateRecipe({ desktop: de.id })}
                    style={{
                      padding: '16px 18px',
                      borderRadius: '8px',
                      background: isSelected ? 'rgba(249, 115, 22, 0.12)' : 'rgba(26, 22, 19, 0.6)',
                      border: isSelected ? '2px solid var(--cyan)' : '1px solid var(--border-subtle)',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      gap: '10px',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                        <span style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-main)' }}>
                          {de.name}
                        </span>
                        <span
                          style={{
                            fontSize: '0.66rem',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            background: 'rgba(16, 185, 129, 0.12)',
                            color: '#10b981',
                            fontWeight: 600,
                          }}
                        >
                          {de.ramUsage}
                        </span>
                      </div>

                      <p style={{ fontSize: '0.78rem', color: 'var(--cyan)', fontWeight: 500, marginBottom: '6px' }}>
                        {de.tagline}
                      </p>
                      <p style={{ fontSize: '0.76rem', color: 'var(--text-muted)', lineHeight: '1.35', margin: 0 }}>
                        {de.description}
                      </p>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '8px', borderTop: '1px solid rgba(255, 255, 255, 0.05)' }}>
                      {de.id !== 'none' && onOpenScreenshots ? (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenScreenshots(de.id);
                          }}
                          className="btn btn-secondary"
                          style={{ padding: '3px 8px', fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                        >
                          <ImageIcon size={11} /> {lang === 'fr' ? 'Aperçu' : 'Preview'}
                        </button>
                      ) : <span />}

                      {isSelected ? (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.72rem', color: 'var(--cyan)', fontWeight: 700 }}>
                          <CheckCircle2 size={13} /> {lang === 'fr' ? 'Sélectionné' : 'Selected'}
                        </span>
                      ) : (
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>
                          {lang === 'fr' ? 'Cliquer pour choisir' : 'Click to select'}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ===================================================================== */}
        {/* STEP 3: Logiciels */}
        {/* ===================================================================== */}
        {currentStep === 3 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
              <div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '4px' }}>
                  {lang === 'fr' ? '3. Choisissez vos packs logiciels essentiels' : '3. Select Essential Software Packs'}
                </h3>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: 0 }}>
                  {lang === 'fr'
                    ? 'Activez en un clic les suites d’applications prêtes à l’emploi pour votre quotidien.'
                    : 'Toggle application bundles with one click to suit your workflow.'}
                </p>
              </div>

              <span className="badge badge-cyan" style={{ fontSize: '0.76rem', padding: '4px 8px' }}>
                {recipe.selectedPackages.length} {lang === 'fr' ? 'paquets inclus' : 'packages included'}
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(310px, 1fr))', gap: '14px' }}>
              {WIZARD_SOFTWARE_PACKS.map((pack) => {
                const Icon = PACK_ICONS[pack.icon] || Activity;
                const active = isPackSelected(pack.packageIds);

                return (
                  <div
                    key={pack.id}
                    onClick={() => handleToggleSoftwarePack(pack.packageIds)}
                    style={{
                      padding: '16px 18px',
                      borderRadius: '8px',
                      background: active ? 'rgba(249, 115, 22, 0.12)' : 'rgba(26, 22, 19, 0.6)',
                      border: active ? '2px solid var(--cyan)' : '1px solid var(--border-subtle)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '14px',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div
                        style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '8px',
                          background: active ? 'var(--cyan)' : 'rgba(255, 255, 255, 0.06)',
                          color: active ? '#000000' : 'var(--cyan)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Icon size={18} />
                      </div>
                      <div>
                        <div style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '2px' }}>
                          {pack.title}
                        </div>
                        <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                          {pack.description}
                        </div>
                      </div>
                    </div>

                    <div
                      style={{
                        width: '22px',
                        height: '22px',
                        borderRadius: '6px',
                        border: active ? '1px solid var(--cyan)' : '1px solid var(--border-subtle)',
                        background: active ? 'var(--cyan)' : 'transparent',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#000000',
                      }}
                    >
                      {active && <Check size={14} strokeWidth={3} />}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ===================================================================== */}
        {/* STEP 4: Session & Identité */}
        {/* ===================================================================== */}
        {currentStep === 4 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '680px' }}>
            <div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '4px' }}>
                {lang === 'fr' ? '4. Personnalisez votre identité et session' : '4. User Account & Identity'}
              </h3>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                {lang === 'fr'
                  ? 'Donnez un nom à votre système et configurez le compte utilisateur administrateur.'
                  : 'Name your custom operating system and configure the administrator user account.'}
              </p>
            </div>

            {/* Nom de l'OS */}
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '6px' }}>
                {lang === 'fr' ? 'Nom de votre Distribution OS' : 'OS Distribution Name'}
              </label>
              <input
                type="text"
                className="input"
                value={recipe.branding.osName}
                onChange={(e) => onUpdateRecipe({
                  branding: { ...recipe.branding, osName: e.target.value }
                })}
                placeholder="ex. MyCustomOS, ForgeOS..."
                style={{ width: '100%', fontSize: '0.9rem', padding: '8px 12px' }}
              />
            </div>

            {/* Utilisateur & Mot de passe */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '6px' }}>
                  <User size={13} color="var(--cyan)" />
                  {lang === 'fr' ? 'Nom d’utilisateur' : 'Username'}
                </label>
                <input
                  type="text"
                  className="input"
                  value={recipe.user.username}
                  onChange={(e) => onUpdateRecipe({
                    user: { ...recipe.user, username: e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, '') }
                  })}
                  style={{ width: '100%', fontSize: '0.88rem', padding: '8px 12px' }}
                />
              </div>

              <div>
                <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '6px' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Lock size={13} color="var(--cyan)" />
                    {lang === 'fr' ? 'Mot de passe' : 'Password'}
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', padding: 0 }}
                  >
                    {showPassword ? <EyeOff size={13} /> : <Eye size={13} />}
                  </button>
                </label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="input"
                  value={recipe.user.password || ''}
                  onChange={(e) => onUpdateRecipe({
                    user: { ...recipe.user, password: e.target.value }
                  })}
                  style={{ width: '100%', fontSize: '0.88rem', padding: '8px 12px' }}
                />
              </div>
            </div>

            {/* Clavier et Connexion Automatique */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', alignItems: 'center' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '6px' }}>
                  {lang === 'fr' ? 'Disposition du Clavier' : 'Keyboard Layout'}
                </label>
                <select
                  className="select"
                  value={recipe.keyboardLayout}
                  onChange={(e) => onUpdateRecipe({ keyboardLayout: e.target.value })}
                  style={{ width: '100%', fontSize: '0.88rem', padding: '8px 12px' }}
                >
                  <option value="fr">Français (AZERTY FR)</option>
                  <option value="us">English / US (QWERTY)</option>
                  <option value="ca-fr">Canadien Français (CA-FR)</option>
                  <option value="be">Belge (BE)</option>
                  <option value="ch-fr">Suisse Romand (CH-FR)</option>
                  <option value="de">Allemand (QWERTZ DE)</option>
                  <option value="es">Espagnol (ES)</option>
                </select>
              </div>

              <div style={{ paddingTop: '22px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={recipe.user.autologin}
                    onChange={(e) => onUpdateRecipe({
                      user: { ...recipe.user, autologin: e.target.checked }
                    })}
                    style={{ accentColor: 'var(--cyan)', width: '16px', height: '16px' }}
                  />
                  <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-main)' }}>
                    {lang === 'fr' ? 'Connexion automatique au démarrage' : 'Autologin at startup'}
                  </span>
                </label>
              </div>
            </div>
          </div>
        )}

        {/* ===================================================================== */}
        {/* STEP 5: Format & Lancement du Build */}
        {/* ===================================================================== */}
        {currentStep === 5 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
            <div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '4px' }}>
                {lang === 'fr' ? '5. Support de destination & Lancement' : '5. Destination Format & Build'}
              </h3>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                {lang === 'fr'
                  ? 'Choisissez où vous souhaitez installer ou utiliser votre OS, puis lancez la compilation.'
                  : 'Select where you plan to use or install your OS, then start building.'}
              </p>
            </div>

            {/* Formats Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '12px' }}>
              {WIZARD_FORMAT_CHOICES.map((fmt) => {
                const Icon = FORMAT_ICONS[fmt.icon] || Disc;
                const isSelected = recipe.outputFormat === fmt.id;

                return (
                  <div
                    key={fmt.id}
                    onClick={() => onUpdateRecipe({ outputFormat: fmt.id })}
                    style={{
                      padding: '14px 16px',
                      borderRadius: '8px',
                      background: isSelected ? 'rgba(249, 115, 22, 0.12)' : 'rgba(26, 22, 19, 0.6)',
                      border: isSelected ? '2px solid var(--cyan)' : '1px solid var(--border-subtle)',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      gap: '8px',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                        <div
                          style={{
                            width: '28px',
                            height: '28px',
                            borderRadius: '6px',
                            background: isSelected ? 'var(--cyan)' : 'rgba(255, 255, 255, 0.06)',
                            color: isSelected ? '#000000' : 'var(--cyan)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <Icon size={16} />
                        </div>
                        <span style={{ fontSize: '0.86rem', fontWeight: 700, color: 'var(--text-main)' }}>
                          {fmt.title}
                        </span>
                      </div>
                      <p style={{ fontSize: '0.74rem', color: 'var(--text-muted)', margin: 0, lineHeight: '1.3' }}>
                        {fmt.subtitle}
                      </p>
                    </div>

                    <div style={{ paddingTop: '6px', borderTop: '1px solid rgba(255, 255, 255, 0.05)', display: 'flex', justifyContent: 'flex-end' }}>
                      {isSelected && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '0.7rem', color: 'var(--cyan)', fontWeight: 700 }}>
                          <CheckCircle2 size={12} /> {lang === 'fr' ? 'Choisi' : 'Selected'}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Final OS Summary Card */}
            <div
              style={{
                padding: '18px 22px',
                borderRadius: '8px',
                background: 'rgba(249, 115, 22, 0.06)',
                border: '1px solid rgba(249, 115, 22, 0.25)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '16px',
              }}
            >
              <div>
                <div style={{ fontSize: '0.74rem', color: 'var(--cyan)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '2px' }}>
                  {lang === 'fr' ? 'Récapitulatif de votre Système' : 'Your System Summary'}
                </div>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-main)' }}>
                  {recipe.branding.osName} ({recipe.distro.toUpperCase()} • {recipe.desktop.toUpperCase()})
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                  Utilisateur : <strong style={{ color: '#f1f5f9' }}>{recipe.user.username}</strong> • {recipe.selectedPackages.length} paquets inclus • Format : <strong style={{ color: '#f1f5f9' }}>{recipe.outputFormat}</strong>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <button
                  onClick={onStartBuild}
                  className="btn btn-primary"
                  style={{ fontSize: '0.92rem', padding: '10px 22px', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 0 16px rgba(249, 115, 22, 0.4)' }}
                >
                  <Rocket size={16} />
                  <span>{lang === 'fr' ? 'Compiler mon OS (1-Clic)' : 'Build My OS (1-Click)'}</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Wizard Footer Navigation */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0' }}>
        <button
          onClick={() => setCurrentStep((prev) => Math.max(1, prev - 1))}
          disabled={currentStep === 1}
          className="btn btn-secondary"
          style={{ fontSize: '0.84rem', padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <ArrowLeft size={14} />
          <span>{lang === 'fr' ? 'Étape précédente' : 'Previous Step'}</span>
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {currentStep < 5 ? (
            <button
              onClick={() => setCurrentStep((prev) => Math.min(5, prev + 1))}
              className="btn btn-primary"
              style={{ fontSize: '0.86rem', padding: '8px 20px', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <span>{lang === 'fr' ? 'Étape suivante' : 'Next Step'}</span>
              <ArrowRight size={14} />
            </button>
          ) : (
            <button
              onClick={onStartBuild}
              className="btn btn-primary"
              style={{ fontSize: '0.86rem', padding: '8px 22px', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Rocket size={15} />
              <span>{lang === 'fr' ? 'Lancer la compilation' : 'Start Build'}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
