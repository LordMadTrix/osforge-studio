import React, { useState, useEffect } from 'react';
import {
  X,
  Cpu,
  HardDrive,
  Monitor,
  Battery,
  Activity,
  Sparkles,
  CheckCircle2,
  Download,
  Copy,
  Check,
  Terminal,
  ArrowRight,
  ShieldAlert
} from 'lucide-react';
import { OSRecipe } from '../types/os';
import { triggerFileDownload } from '../utils/downloadHelper';
import {
  detectHardwareProfile,
  analyzeAndRecommend,
  generateHardwareAuditScript,
  DetectedHardware,
  AuditRecommendation
} from '../services/hardwareAuditor';
import {
  resolveHardwareDrivers,
  TargetHardwareProfile,
  DEFAULT_HARDWARE_PROFILE
} from '../services/hardwareDriverResolver';

interface HardwareAuditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyRecipe: (updates: Partial<OSRecipe>) => void;
  lang: 'fr' | 'en';
  currentRecipe: OSRecipe;
}

export const HardwareAuditModal: React.FC<HardwareAuditModalProps> = ({
  isOpen,
  onClose,
  onApplyRecipe,
  lang,
  currentRecipe,
}) => {
  const [hardware, setHardware] = useState<DetectedHardware | null>(null);
  const [recommendation, setRecommendation] = useState<AuditRecommendation | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'diagnosis' | 'drivers' | 'cli'>('diagnosis');
  const [cliPlatform, setCliPlatform] = useState<'bash' | 'bat'>('bash');
  const [copiedCli, setCopiedCli] = useState<boolean>(false);
  const [applied, setApplied] = useState<boolean>(false);
  const [driverProfile, setDriverProfile] = useState<TargetHardwareProfile>(DEFAULT_HARDWARE_PROFILE);
  const [driversInjectedNotes, setDriversInjectedNotes] = useState<string[]>([]);

  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    const runAudit = async () => {
      setLoading(true);
      setApplied(false);
      try {
        const detected = await detectHardwareProfile();
        if (!isMounted) return;
        setHardware(detected);
        const reco = analyzeAndRecommend(detected, currentRecipe);
        setRecommendation(reco);
      } catch (err) {
        console.error('Erreur audit matériel:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    runAudit();

    return () => {
      isMounted = false;
    };
  }, [isOpen, currentRecipe]);

  if (!isOpen) return null;

  const handleApply = () => {
    if (!recommendation) return;
    onApplyRecipe(recommendation.suggestedRecipeChanges);
    setApplied(true);
    setTimeout(() => {
      onClose();
    }, 1200);
  };

  const handleApplyDrivers = () => {
    const res = resolveHardwareDrivers(currentRecipe, driverProfile);
    onApplyRecipe(res.updatedRecipe);
    setDriversInjectedNotes(lang === 'fr' ? res.explanationsFr : res.explanationsEn);
    setApplied(true);
    setTimeout(() => {
      setApplied(false);
    }, 2500);
  };

  const cliScript = generateHardwareAuditScript(cliPlatform);

  const handleCopyCli = async () => {
    try {
      await navigator.clipboard.writeText(cliScript);
      setCopiedCli(true);
      setTimeout(() => setCopiedCli(false), 2000);
    } catch {
      // ignore
    }
  };

  const handleDownloadCli = () => {
    const filename = cliPlatform === 'bash' ? 'audit-hardware.sh' : 'audit-hardware.bat';
    const mimeType = cliPlatform === 'bash' ? 'text/x-shellscript;charset=utf-8' : 'application/x-bat;charset=utf-8';
    const content = cliPlatform === 'bat'
      ? cliScript.replace(/\r?\n/g, '\r\n')
      : cliScript.replace(/\r\n/g, '\n');
    const blob = new Blob([content], { type: mimeType });
    triggerFileDownload(blob, filename);
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 1060, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
      <div
        className="glass-panel"
        style={{
          width: '100%',
          maxWidth: '920px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          borderRadius: '16px',
          border: '1px solid rgba(16, 185, 129, 0.35)',
          boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.8), 0 0 35px rgba(16, 185, 129, 0.15)',
          overflow: 'hidden',
          background: 'rgba(12, 16, 25, 0.97)',
        }}
      >
        {/* Modal Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '16px 24px',
          borderBottom: '1px solid var(--border-subtle)',
          background: 'rgba(16, 185, 129, 0.05)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.25), rgba(56, 189, 248, 0.25))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.25rem',
              border: '1px solid rgba(16, 185, 129, 0.4)',
            }}>
              🎯
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#ffffff', margin: 0 }}>
                  {lang === 'fr' ? 'Audit Matériel & Conseiller de Distribution' : 'Hardware Audit & Distro Advisor'}
                </h2>
                <span className="badge badge-emerald" style={{ fontSize: '0.65rem' }}>
                  {lang === 'fr' ? 'Sonde Réelle' : 'Real Probe'}
                </span>
              </div>
              <p style={{ fontSize: '0.74rem', color: 'var(--text-muted)', margin: 0, marginTop: '2px' }}>
                {lang === 'fr'
                  ? 'Analyse instantanée des capacités matérielles de votre machine et recommandation de l’OS optimal'
                  : 'Real-time hardware analysis and personalized recommendation for the ideal Linux distro'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.06)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Tab Switcher */}
        <div style={{
          display: 'flex',
          gap: '8px',
          padding: '10px 24px',
          background: 'rgba(0, 0, 0, 0.25)',
          borderBottom: '1px solid var(--border-subtle)',
        }}>
          <button
            onClick={() => setActiveTab('diagnosis')}
            className={`btn ${activeTab === 'diagnosis' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '6px 14px', fontSize: '0.78rem' }}
          >
            <Activity size={14} />
            <span>{lang === 'fr' ? 'Diagnostic & Recommandation' : 'Diagnosis & Recommendation'}</span>
          </button>
          <button
            onClick={() => setActiveTab('drivers')}
            className={`btn ${activeTab === 'drivers' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '6px 14px', fontSize: '0.78rem' }}
          >
            <Sparkles size={14} />
            <span>{lang === 'fr' ? 'Pilotes & Matériel Cible' : 'Target Hardware & Drivers'}</span>
          </button>
          <button
            onClick={() => setActiveTab('cli')}
            className={`btn ${activeTab === 'cli' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '6px 14px', fontSize: '0.78rem' }}
          >
            <Terminal size={14} />
            <span>{lang === 'fr' ? 'Script d’Audit Machine Cible (CLI)' : 'Target Machine Audit Script (CLI)'}</span>
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1 }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
              <div style={{ fontSize: '2rem', marginBottom: '10px', animation: 'spin 1.5s linear infinite' }}>⚙️</div>
              <p>{lang === 'fr' ? 'Sonde du matériel en cours via les API WebGL et système...' : 'Probing hardware via WebGL and system APIs...'}</p>
            </div>
          ) : activeTab === 'diagnosis' && hardware && recommendation ? (
            <div>
              {/* Hardware Spec Cards */}
              <h4 style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)', marginBottom: '10px' }}>
                {lang === 'fr' ? 'Composants Matériels Détectés sur cet Appareil' : 'Detected Hardware Specs on this Device'}
              </h4>

              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: '10px',
                marginBottom: '20px',
              }}>
                {/* CPU */}
                <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid var(--border-subtle)', borderRadius: '10px', padding: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#38bdf8', marginBottom: '4px' }}>
                    <Cpu size={16} />
                    <span style={{ fontSize: '0.75rem', fontWeight: 700 }}>Processeur</span>
                  </div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#f1f5f9' }}>
                    {hardware.cpuCores} {lang === 'fr' ? 'Cœurs / Threads' : 'Cores / Threads'}
                  </div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                    Architecture {hardware.arch}
                  </div>
                </div>

                {/* RAM */}
                <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid var(--border-subtle)', borderRadius: '10px', padding: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#a855f7', marginBottom: '4px' }}>
                    <HardDrive size={16} />
                    <span style={{ fontSize: '0.75rem', fontWeight: 700 }}>Mémoire Vive</span>
                  </div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#f1f5f9' }}>
                    ~{hardware.ramGb} Go RAM
                  </div>
                  <div style={{ fontSize: '0.68rem', color: hardware.ramGb <= 4 ? '#f59e0b' : '#10b981', marginTop: '2px' }}>
                    {hardware.ramGb <= 4 ? (lang === 'fr' ? 'Faible (optimisation ZRAM)' : 'Low (ZRAM needed)') : (lang === 'fr' ? 'Confortable' : 'Comfortable')}
                  </div>
                </div>

                {/* GPU */}
                <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid var(--border-subtle)', borderRadius: '10px', padding: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#10b981', marginBottom: '4px' }}>
                    <Activity size={16} />
                    <span style={{ fontSize: '0.75rem', fontWeight: 700 }}>Carte Graphique</span>
                  </div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#f1f5f9', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={hardware.gpuRenderer}>
                    {hardware.gpuRenderer.split('/')[0] || hardware.gpuVendor}
                  </div>
                  <div style={{ fontSize: '0.68rem', color: hardware.isDedicatedGpu ? '#10b981' : 'var(--text-muted)', marginTop: '2px' }}>
                    {hardware.isDedicatedGpu ? (lang === 'fr' ? 'GPU Dédié Haute Performance' : 'Dedicated High-Perf GPU') : (lang === 'fr' ? 'GPU Intégré' : 'Integrated GPU')}
                  </div>
                </div>

                {/* Device Type & Battery */}
                <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid var(--border-subtle)', borderRadius: '10px', padding: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#fbbf24', marginBottom: '4px' }}>
                    {hardware.hasBattery ? <Battery size={16} /> : <Monitor size={16} />}
                    <span style={{ fontSize: '0.75rem', fontWeight: 700 }}>Type d'Appareil</span>
                  </div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#f1f5f9' }}>
                    {hardware.hasBattery ? (lang === 'fr' ? 'PC Portable (Laptop)' : 'Laptop (Battery)') : (lang === 'fr' ? 'Station Fixe' : 'Desktop PC')}
                  </div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                    {hardware.screenWidth}x{hardware.screenHeight} ({hardware.pixelRatio}x)
                  </div>
                </div>
              </div>

              {/* Recommendation Card */}
              <div style={{
                background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.12), rgba(56, 189, 248, 0.08))',
                border: '1px solid rgba(16, 185, 129, 0.4)',
                borderRadius: '12px',
                padding: '18px',
                marginBottom: '16px',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px', marginBottom: '10px' }}>
                  <div>
                    <span className="badge badge-emerald" style={{ fontSize: '0.7rem', padding: '3px 8px', marginBottom: '6px', display: 'inline-block' }}>
                      ⭐ {lang === 'fr' ? `Score de Correspondance : ${recommendation.matchScore}%` : `Match Score: ${recommendation.matchScore}%`}
                    </span>
                    <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#ffffff', margin: 0 }}>
                      {lang === 'fr' ? recommendation.titleFr : recommendation.titleEn}
                    </h3>
                  </div>

                  <button
                    onClick={handleApply}
                    disabled={applied}
                    className="btn btn-primary"
                    style={{
                      padding: '8px 18px',
                      fontSize: '0.85rem',
                      fontWeight: 700,
                      background: applied ? '#10b981' : undefined,
                    }}
                  >
                    {applied ? (
                      <>
                        <Check size={16} />
                        <span>{lang === 'fr' ? 'Recette Appliquée !' : 'Recipe Applied!'}</span>
                      </>
                    ) : (
                      <>
                        <Sparkles size={16} />
                        <span>{lang === 'fr' ? 'Appliquer cette Recette (1-Clic)' : 'Apply This Recipe (1-Click)'}</span>
                        <ArrowRight size={14} />
                      </>
                    )}
                  </button>
                </div>

                <p style={{ fontSize: '0.8rem', color: 'var(--text-main)', lineHeight: 1.5, marginBottom: '14px' }}>
                  {lang === 'fr' ? recommendation.summaryFr : recommendation.summaryEn}
                </p>

                {/* Key Points */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '8px' }}>
                  {(lang === 'fr' ? recommendation.keyPointsFr : recommendation.keyPointsEn).map((point, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '0.76rem', color: 'var(--text-main)' }}>
                      <CheckCircle2 size={14} color="#10b981" style={{ flexShrink: 0, marginTop: '2px' }} />
                      <span>{point}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : activeTab === 'drivers' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{
                padding: '14px 18px',
                borderRadius: '10px',
                background: 'rgba(56, 189, 248, 0.08)',
                border: '1px solid rgba(56, 189, 248, 0.25)',
                fontSize: '0.8rem',
                color: '#e2e8f0',
              }}>
                <span style={{ fontWeight: 700, color: '#38bdf8' }}>
                  {lang === 'fr' ? 'Configuration automatique des pilotes' : 'Automated Driver Configuration'} :
                </span>{' '}
                {lang === 'fr'
                  ? `Sélectionnez les composants de votre machine cible. OSForge Studio injecte automatiquement les paquets réels compatibles avec votre distribution (${currentRecipe.distro.toUpperCase()}) pour éviter tout écran noir.`
                  : `Select your target device components. OSForge Studio injects verified packages tailored for ${currentRecipe.distro.toUpperCase()} to prevent black screens.`}
              </div>

              {/* Formulaire Matériel Cible */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
                {/* CPU */}
                <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid var(--border-subtle)', borderRadius: '10px', padding: '12px' }}>
                  <label style={{ fontSize: '0.76rem', fontWeight: 700, color: '#f1f5f9', display: 'block', marginBottom: '6px' }}>
                    Processeur (Microcode CPU)
                  </label>
                  <select
                    className="select"
                    style={{ width: '100%', fontSize: '0.78rem', padding: '6px 10px' }}
                    value={driverProfile.cpu}
                    onChange={e => setDriverProfile({ ...driverProfile, cpu: e.target.value as any })}
                  >
                    <option value="generic">Générique / Standard</option>
                    <option value="intel">Intel Core / Xeon / Celeron</option>
                    <option value="amd">AMD Ryzen / Threadripper / EPYC</option>
                  </select>
                </div>

                {/* GPU */}
                <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid var(--border-subtle)', borderRadius: '10px', padding: '12px' }}>
                  <label style={{ fontSize: '0.76rem', fontWeight: 700, color: '#f1f5f9', display: 'block', marginBottom: '6px' }}>
                    Carte Graphique (GPU)
                  </label>
                  <select
                    className="select"
                    style={{ width: '100%', fontSize: '0.78rem', padding: '6px 10px' }}
                    value={driverProfile.gpu}
                    onChange={e => setDriverProfile({ ...driverProfile, gpu: e.target.value as any })}
                  >
                    <option value="vm_virtual">Machine Virtuelle / Standard</option>
                    <option value="nvidia_proprietary">Nvidia Propriétaire (CUDA / DKMS)</option>
                    <option value="amd_radeon">AMD Radeon RX / Vega / RDNA (Vulkan RADV)</option>
                    <option value="intel_arc">Intel Arc / Iris Xe (VA-API QuickSync)</option>
                  </select>
                </div>

                {/* Wi-Fi */}
                <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid var(--border-subtle)', borderRadius: '10px', padding: '12px' }}>
                  <label style={{ fontSize: '0.76rem', fontWeight: 700, color: '#f1f5f9', display: 'block', marginBottom: '6px' }}>
                    Puce Wi-Fi & Bluetooth
                  </label>
                  <select
                    className="select"
                    style={{ width: '100%', fontSize: '0.78rem', padding: '6px 10px' }}
                    value={driverProfile.wifi}
                    onChange={e => setDriverProfile({ ...driverProfile, wifi: e.target.value as any })}
                  >
                    <option value="generic_all">Firmwares Libres Génériques</option>
                    <option value="intel_wifi">Intel Wireless (Wi-Fi 6E/7 iwlwifi)</option>
                    <option value="realtek_wifi">Realtek RTL8xxx (Wi-Fi / Bluetooth)</option>
                    <option value="broadcom_wifi">Broadcom BCM43xx (STA DKMS)</option>
                  </select>
                </div>

                {/* Type d'Appareil */}
                <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid var(--border-subtle)', borderRadius: '10px', padding: '12px' }}>
                  <label style={{ fontSize: '0.76rem', fontWeight: 700, color: '#f1f5f9', display: 'block', marginBottom: '6px' }}>
                    Type d'Appareil (Alimentation)
                  </label>
                  <select
                    className="select"
                    style={{ width: '100%', fontSize: '0.78rem', padding: '6px 10px' }}
                    value={driverProfile.formFactor}
                    onChange={e => setDriverProfile({ ...driverProfile, formFactor: e.target.value as any })}
                  >
                    <option value="desktop">PC Fixe / Station de Travail</option>
                    <option value="laptop">PC Portable (TLP + Powertop)</option>
                    <option value="handheld_deck">Console Portable (Steam Deck / Ally)</option>
                  </select>
                </div>
              </div>

              {/* Toggles matériel */}
              <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.78rem', color: '#f1f5f9', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={driverProfile.installTpm2}
                    onChange={e => setDriverProfile({ ...driverProfile, installTpm2: e.target.checked })}
                  />
                  <span>Intégrer les outils de sécurité matérielle TPM 2.0 (tpm2-tools)</span>
                </label>
              </div>

              {/* Bouton d'application */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '6px' }}>
                <button
                  onClick={handleApplyDrivers}
                  className="btn btn-primary"
                  style={{
                    padding: '8px 18px',
                    fontSize: '0.84rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    background: applied ? '#10b981' : undefined,
                  }}
                >
                  {applied ? <Check size={16} /> : <Sparkles size={16} />}
                  <span>{applied ? (lang === 'fr' ? 'Pilotes injectés !' : 'Drivers injected!') : (lang === 'fr' ? 'Injecter les pilotes recommandés' : 'Inject recommended drivers')}</span>
                </button>
              </div>

              {/* Notes d'injection */}
              {driversInjectedNotes.length > 0 && (
                <div style={{
                  padding: '12px 16px',
                  borderRadius: '8px',
                  background: 'rgba(16, 185, 129, 0.08)',
                  border: '1px solid rgba(16, 185, 129, 0.25)',
                  fontSize: '0.74rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                }}>
                  <span style={{ fontWeight: 700, color: '#34d399' }}>Modifications appliquées à la recette :</span>
                  {driversInjectedNotes.map((note, idx) => (
                    <div key={idx} style={{ color: '#cbd5e1' }}>• {note}</div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            /* CLI Audit Script View */
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: 0 }}>
                  {lang === 'fr'
                    ? 'Si vous construisez un OS pour une autre machine physique, téléchargez et exécutez ce script directement sur la machine cible pour sonder son matériel réel.'
                    : 'If building for another physical machine, download and run this script directly on the target machine to probe its hardware.'}
                </p>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => setCliPlatform('bash')}
                    className={`btn ${cliPlatform === 'bash' ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ padding: '4px 10px', fontSize: '0.74rem' }}
                  >
                    Linux (Bash)
                  </button>
                  <button
                    onClick={() => setCliPlatform('bat')}
                    className={`btn ${cliPlatform === 'bat' ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ padding: '4px 10px', fontSize: '0.74rem' }}
                  >
                    Windows (Batch)
                  </button>
                </div>
              </div>

              <div style={{ position: 'relative' }}>
                <pre style={{
                  background: '#090d16',
                  padding: '14px',
                  borderRadius: '10px',
                  border: '1px solid var(--border-subtle)',
                  fontFamily: 'monospace',
                  fontSize: '0.74rem',
                  color: '#e2e8f0',
                  maxHeight: '340px',
                  overflowY: 'auto',
                }}>
                  {cliScript}
                </pre>

                <div style={{ position: 'absolute', top: '10px', right: '10px', display: 'flex', gap: '6px' }}>
                  <button
                    onClick={handleCopyCli}
                    className="btn btn-secondary"
                    style={{ padding: '5px 9px', fontSize: '0.74rem' }}
                    title={lang === 'fr' ? 'Copier le script' : 'Copy script'}
                  >
                    {copiedCli ? <Check size={14} color="#10b981" /> : <Copy size={14} />}
                    <span>{copiedCli ? (lang === 'fr' ? 'Copié !' : 'Copied!') : (lang === 'fr' ? 'Copier' : 'Copy')}</span>
                  </button>
                  <button
                    onClick={handleDownloadCli}
                    className="btn btn-primary"
                    style={{ padding: '5px 9px', fontSize: '0.74rem' }}
                    title={lang === 'fr' ? 'Télécharger le script' : 'Download script'}
                  >
                    <Download size={14} />
                    <span>{lang === 'fr' ? 'Télécharger' : 'Download'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer info banner */}
        <div style={{
          padding: '12px 24px',
          borderTop: '1px solid var(--border-subtle)',
          background: 'rgba(0, 0, 0, 0.25)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '0.72rem',
          color: 'var(--text-muted)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <ShieldAlert size={14} color="#38bdf8" />
            <span>
              {lang === 'fr'
                ? 'Les sondes de cet audit respectent votre vie privée et sont exécutées localement dans votre navigateur sans téléverser aucune donnée.'
                : 'Probes in this audit run strictly locally in your browser without uploading any data.'}
            </span>
          </div>
          <button onClick={onClose} className="btn btn-secondary" style={{ padding: '5px 14px', fontSize: '0.76rem' }}>
            {lang === 'fr' ? 'Fermer' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};
