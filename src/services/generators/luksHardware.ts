import { SecurityConfig } from '../../types/os';

/**
 * Détermine les options /etc/crypttab en fonction de la méthode de déverrouillage choisie
 */
export function resolveCrypttabOptions(security: SecurityConfig): string {
  const method = security.luksUnlockMethod || 'passphrase';
  switch (method) {
    case 'tpm2':
      return 'luks,discard,tpm2-device=auto';
    case 'fido2':
      return 'luks,discard,fido2-device=auto';
    case 'tpm2_passphrase':
      return 'luks,discard,tpm2-device=auto';
    case 'passphrase':
    default:
      return 'luks,discard';
  }
}

/**
 * Génère la commande chroot pour enregistrer la clé matérielle TPM 2.0 ou FIDO2 (systemd-cryptenroll)
 */
export function generateCryptenrollCommand(security: SecurityConfig, devPath = '${LOOPDEV}p1'): string {
  if (!security.luksEncryption) return '';
  const method = security.luksUnlockMethod || 'passphrase';
  if (method === 'passphrase') return '';

  let enrollArgs = '';
  if (method === 'tpm2' || method === 'tpm2_passphrase') {
    enrollArgs = '--tpm2-device=auto';
  } else if (method === 'fido2') {
    enrollArgs = '--fido2-device=auto';
  }

  return `
# ==============================================================================
# 🔐 Enrôlement Matériel LUKS2 (systemd-cryptenroll : ${method})
# ==============================================================================
echo -e "\${BLUE}[SECURITY] Enrôlement du déchiffrement matériel ${method}...\${NC}"
if command -v systemd-cryptenroll &>/dev/null; then
    echo -n \${LUKS_PASSWORD} | systemd-cryptenroll --unlock-key-file=- ${enrollArgs} ${devPath} 2>/dev/null || \\
    echo -e "\${YELLOW}[INFO] Inscription matérielle ${method} différée au premier démarrage physique (périphérique non émulé durant le build).\${NC}"
fi
`;
}
