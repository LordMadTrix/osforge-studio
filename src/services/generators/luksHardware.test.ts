import { describe, it, expect } from 'vitest';
import { resolveCrypttabOptions, generateCryptenrollCommand } from './luksHardware';
import { SecurityConfig } from '../../types/os';

describe('Chantier 45 : Déchiffrement Matériel LUKS2 (TPM 2.0 Auto-Unlock & YubiKey / FIDO2)', () => {
  it('résout les options de crypttab selon la méthode de déverrouillage', () => {
    const secPassphrase = { luksEncryption: true, luksUnlockMethod: 'passphrase' } as unknown as SecurityConfig;
    expect(resolveCrypttabOptions(secPassphrase)).toBe('luks,discard');

    const secTpm2 = { luksEncryption: true, luksUnlockMethod: 'tpm2' } as unknown as SecurityConfig;
    expect(resolveCrypttabOptions(secTpm2)).toBe('luks,discard,tpm2-device=auto');

    const secFido2 = { luksEncryption: true, luksUnlockMethod: 'fido2' } as unknown as SecurityConfig;
    expect(resolveCrypttabOptions(secFido2)).toBe('luks,discard,fido2-device=auto');

    const secTpmHybrid = { luksEncryption: true, luksUnlockMethod: 'tpm2_passphrase' } as unknown as SecurityConfig;
    expect(resolveCrypttabOptions(secTpmHybrid)).toBe('luks,discard,tpm2-device=auto');
  });

  it('génère la commande systemd-cryptenroll pour TPM 2.0', () => {
    const sec = { luksEncryption: true, luksUnlockMethod: 'tpm2' } as unknown as SecurityConfig;
    const cmd = generateCryptenrollCommand(sec, '${LOOPDEV}p1');
    expect(cmd).toContain('systemd-cryptenroll');
    expect(cmd).toContain('--tpm2-device=auto');
    expect(cmd).toContain('${LOOPDEV}p1');
  });

  it('génère la commande systemd-cryptenroll pour FIDO2 / YubiKey', () => {
    const sec = { luksEncryption: true, luksUnlockMethod: 'fido2' } as unknown as SecurityConfig;
    const cmd = generateCryptenrollCommand(sec, '${LOOPDEV}p1');
    expect(cmd).toContain('systemd-cryptenroll');
    expect(cmd).toContain('--fido2-device=auto');
    expect(cmd).toContain('${LOOPDEV}p1');
  });

  it('ne produit rien si le chiffrement LUKS est désactivé', () => {
    const sec = { luksEncryption: false } as unknown as SecurityConfig;
    expect(generateCryptenrollCommand(sec)).toBe('');
  });
});
