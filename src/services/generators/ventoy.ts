import { OSRecipe } from '../../types/os';
import { sanitizeGrubTitle } from './helpers';

export function generateVentoyJson(recipe: OSRecipe): string {
  const osName = sanitizeGrubTitle(recipe.branding.osName || 'Custom Linux');
  const edition = sanitizeGrubTitle(recipe.branding.editionName || 'Edition');
  const isoNamePattern = `*${recipe.branding.osName.toLowerCase().replace(/[^a-z0-9]/g, '-')}*.iso`;

  const ventoyConfig = {
    control: [
      {
        VTOY_DEFAULT_SEARCH_ROOT: '/ISO',
        VTOY_MENU_TIMEOUT: 5,
        VTOY_DEFAULT_IMAGE: `/ISO/${recipe.branding.osName.toLowerCase()}-live.iso`,
        VTOY_SECONDARY_BOOT_MENU: '1',
      },
    ],
    theme: {
      file: '/ventoy/theme/theme.txt',
      gfxmode: '1920x1080',
      ventoy_color: recipe.branding.accentColor || '#3b82f6',
      ventoy_left: '5%',
      ventoy_top: '80%',
      ventoy_color_title: '#ffffff',
      title: `${osName} (${edition}) — Clé Multi-Boot Ventoy`,
    },
    auto_install: [
      {
        image: `/ISO/${isoNamePattern}`,
        template: [
          '/ventoy/script/preseed.cfg',
          '/ventoy/script/autoinst.xml',
          '/ventoy/script/user-data',
        ],
        autosel: 1,
      },
    ],
    injection: [
      {
        image: `/ISO/${isoNamePattern}`,
        archive: '/ventoy/injection/osforge-custom-drivers.tar.gz',
      },
    ],
    menu_alias: [
      {
        image: `/ISO/${isoNamePattern}`,
        alias: `⚡ Démarrer ${osName} ${edition} (Mode Ultra-Rapide Live)`,
      },
    ],
  };

  return JSON.stringify(ventoyConfig, null, 2);
}
