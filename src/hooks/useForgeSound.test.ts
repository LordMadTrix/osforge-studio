import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useForgeSound } from './useForgeSound';

describe('useForgeSound — Jingle audio de démarrage OSForge Studio', () => {
  const originalAudioContext = (globalThis as any).AudioContext;
  const originalWindow = (globalThis as any).window;

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    (globalThis as any).AudioContext = originalAudioContext;
    (globalThis as any).window = originalWindow;
  });

  it('fournit la méthode playStartupJingle', () => {
    const { playStartupJingle } = useForgeSound();
    expect(typeof playStartupJingle).toBe('function');
  });

  it('ne lève pas d’erreur en environnement sans Web Audio API (silent fallback)', () => {
    (globalThis as any).window = {};
    const { playStartupJingle } = useForgeSound();
    expect(() => playStartupJingle()).not.toThrow();
  });

  it('instancie AudioContext et configure les oscillateurs et gains', () => {
    const mockConnect = vi.fn();
    const mockGainSetValueAtTime = vi.fn();
    const mockGainLinearRamp = vi.fn();
    const mockGainExpoRamp = vi.fn();
    const mockFreqSetValueAtTime = vi.fn();
    const mockFreqLinearRamp = vi.fn();
    const mockStart = vi.fn();
    const mockStop = vi.fn();
    const mockClose = vi.fn().mockResolvedValue(undefined);
    const mockResume = vi.fn().mockResolvedValue(undefined);
    let instanceCount = 0;

    class MockAudioContext {
      currentTime = 0;
      state = 'suspended';
      destination = {};
      resume = mockResume;
      close = mockClose;

      constructor() {
        instanceCount++;
      }

      createGain = () => ({
        gain: {
          setValueAtTime: mockGainSetValueAtTime,
          linearRampToValueAtTime: mockGainLinearRamp,
          exponentialRampToValueAtTime: mockGainExpoRamp,
        },
        connect: mockConnect,
      });

      createOscillator = () => ({
        type: 'sine',
        frequency: {
          setValueAtTime: mockFreqSetValueAtTime,
          linearRampToValueAtTime: mockFreqLinearRamp,
        },
        connect: mockConnect,
        start: mockStart,
        stop: mockStop,
      });
    }

    (globalThis as any).window = {
      AudioContext: MockAudioContext,
    };

    const { playStartupJingle } = useForgeSound();
    expect(() => playStartupJingle()).not.toThrow();

    expect(instanceCount).toBe(1);
    expect(mockResume).toHaveBeenCalled();
    expect(mockStart).toHaveBeenCalled();
    expect(mockStop).toHaveBeenCalled();

    // Fast-forward fake timer to trigger close
    vi.advanceTimersByTime(2500);
    expect(mockClose).toHaveBeenCalled();
  });
});
