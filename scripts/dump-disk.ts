import { generateBuildScript } from '../src/services/scriptGenerators';
import type { OSRecipe, DistroId } from '../src/types/os';
import { writeFileSync } from 'node:fs';

const distro = process.argv[2] as DistroId;
if (!distro) {
  console.error('Usage: tsx scripts/dump-disk.ts <distro>');
  process.exit(1);
}

const recipe: OSRecipe = {
  distro,
  arch: 'x86_64',
  hostname: `diskforge-${distro}`,
  timezone: 'Europe/Paris',
  locale: 'fr_FR',
  outputFormat: 'raw_img',
  branding: { osName: `DiskForge${distro}`, editionName: 'Test Edition', version: '1.0' },
  user: { username: 'forge', fullName: 'Forge User', shell: '/bin/bash', sudo: true, password: 'forge', sshPublicKey: '' },
  enableSSH: true,
  selectedPackages: [],
  customPackages: [],
  security: { firewall: 'none' },
  firstBootScript: '',
} as unknown as OSRecipe;

const script = generateBuildScript(recipe);
writeFileSync(`scripts/generated-${distro}-disk.sh`, script);
console.log(`written scripts/generated-${distro}-disk.sh, length`, script.length);
