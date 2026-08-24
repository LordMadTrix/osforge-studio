import { generateBuildScript } from '../src/services/scriptGenerators';
import type { OSRecipe } from '../src/types/os';
import { writeFileSync } from 'node:fs';

const recipe: OSRecipe = {
  distro: 'alpine',
  arch: 'x86_64',
  hostname: 'osforge-demo',
  timezone: 'Europe/Paris',
  locale: 'fr_FR',
  outputFormat: 'raw_img',
  branding: { osName: 'OSForgeDemo', editionName: 'Demo', version: '1.0' },
  user: { username: 'forge', fullName: 'Forge User', shell: '/bin/sh', sudo: true, password: 'forge', sshPublicKey: '' },
  enableSSH: false,
  selectedPackages: [],
  customPackages: [],
  security: { firewall: 'none' },
  firstBootScript: '',
} as unknown as OSRecipe;

const script = generateBuildScript(recipe);
writeFileSync('scripts/generated-demo.sh', script);
console.log('written scripts/generated-demo.sh, length', script.length);
