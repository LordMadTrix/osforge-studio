import { generateBuildScript } from '../src/services/scriptGenerators';
import type { OSRecipe } from '../src/types/os';
import { writeFileSync } from 'node:fs';

const recipe: OSRecipe = {
  distro: 'raspbian',
  arch: 'aarch64',
  hostname: 'diskforge-rpi',
  timezone: 'Europe/Paris',
  locale: 'fr_FR',
  outputFormat: 'rpi_sd',
  branding: { osName: 'DiskForgeRPi', editionName: 'Test Edition', version: '1.0' },
  user: { username: 'forge', fullName: 'Forge User', shell: '/bin/bash', sudo: true, password: 'forge', sshPublicKey: '' },
  enableSSH: true,
  selectedPackages: ['git', 'htop'],
  customPackages: [],
  security: { firewall: 'none' },
  firstBootScript: '',
} as unknown as OSRecipe;

const script = generateBuildScript(recipe);
writeFileSync('scripts/generated-rpi-sd.sh', script);
console.log('written scripts/generated-rpi-sd.sh, length', script.length);
