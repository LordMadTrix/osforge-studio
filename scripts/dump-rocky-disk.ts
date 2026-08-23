import { generateBuildScript } from '../src/services/scriptGenerators';
import type { OSRecipe } from '../src/types/os';
import { writeFileSync } from 'node:fs';

const recipe: OSRecipe = {
  distro: 'rocky',
  arch: 'x86_64',
  hostname: 'diskforge-rocky',
  timezone: 'Europe/Paris',
  locale: 'fr_FR',
  outputFormat: 'raw_img',
  branding: { osName: 'DiskForgeRocky', editionName: 'Test Edition', version: '1.0' },
  user: { username: 'forge', fullName: 'Forge User', shell: '/bin/bash', sudo: true, password: 'forge', sshPublicKey: '' },
  enableSSH: true,
  selectedPackages: [],
  customPackages: [],
  security: { firewall: 'none' },
  firstBootScript: '',
} as unknown as OSRecipe;

const script = generateBuildScript(recipe);
writeFileSync('scripts/generated-rocky-disk.sh', script);
console.log('written scripts/generated-rocky-disk.sh, length', script.length);
