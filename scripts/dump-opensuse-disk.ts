import { generateBuildScript } from '../src/services/scriptGenerators';
import type { OSRecipe } from '../src/types/os';
import { writeFileSync } from 'node:fs';

const recipe: OSRecipe = {
  distro: 'opensuse',
  arch: 'x86_64',
  hostname: 'diskforge-suse',
  timezone: 'Europe/Paris',
  locale: 'fr_FR',
  outputFormat: 'raw_img',
  branding: { osName: 'DiskForgeSuse', editionName: 'Test Edition', version: '1.0' },
  user: { username: 'forge', fullName: 'Forge User', shell: '/bin/bash', sudo: true, password: 'forge', sshPublicKey: '' },
  enableSSH: true,
  selectedPackages: [],
  customPackages: [],
  security: { firewall: 'none' },
  firstBootScript: '',
} as unknown as OSRecipe;

const script = generateBuildScript(recipe);
writeFileSync('scripts/generated-opensuse-disk.sh', script);
console.log('written scripts/generated-opensuse-disk.sh, length', script.length);
