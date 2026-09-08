import { describe, it, expect } from 'vitest';
import { OFFICIAL_RELEASES_CATALOG, getOfficialReleasesByDistro } from './officialReleases';
import { DISTROS } from './distros';

describe('Official Releases Catalog (Zéro Cosmétique)', () => {
  it('covers all 21 distributions defined in the distros catalog', () => {
    const catalogDistroIds = OFFICIAL_RELEASES_CATALOG.map(d => d.distroId);
    DISTROS.forEach(distro => {
      expect(catalogDistroIds).toContain(distro.id);
    });
  });

  it('contains at least one official unmodified release per distribution', () => {
    OFFICIAL_RELEASES_CATALOG.forEach(distro => {
      expect(distro.releases.length).toBeGreaterThan(0);
      expect(distro.officialWebsite).toMatch(/^https?:\/\//);
      expect(distro.officialDownloadPortal).toMatch(/^https?:\/\//);
      expect(distro.verificationGuideFr.length).toBeGreaterThan(10);
      expect(distro.verificationGuideEn.length).toBeGreaterThan(10);
    });
  });

  it('provides genuine, valid download URLs and CLI commands for every release', () => {
    OFFICIAL_RELEASES_CATALOG.forEach(distro => {
      distro.releases.forEach(release => {
        expect(release.downloadUrl).toMatch(/^https?:\/\//);
        expect(release.name.length).toBeGreaterThan(3);
        expect(release.version.length).toBeGreaterThan(0);
        expect(release.approxSize.length).toBeGreaterThan(0);
        expect(release.descriptionFr.length).toBeGreaterThan(5);
        expect(release.descriptionEn.length).toBeGreaterThan(5);
        expect(release.curlCommand).toMatch(/^(curl|wget)/);
        if (release.torrentUrl) {
          expect(release.torrentUrl).toMatch(/^https?:\/\//);
        }
        if (release.checksumUrl) {
          expect(release.checksumUrl).toMatch(/^https?:\/\//);
        }
      });
    });
  });

  it('retrieves official metadata via getOfficialReleasesByDistro helper', () => {
    const debian = getOfficialReleasesByDistro('debian');
    expect(debian).toBeDefined();
    expect(debian?.name).toBe('Debian GNU/Linux');
    expect(debian?.releases.some(r => r.id.includes('netinst'))).toBe(true);

    const arch = getOfficialReleasesByDistro('arch');
    expect(arch).toBeDefined();
    expect(arch?.releases[0].downloadUrl).toContain('pkgbuild.com');

    const ubuntu = getOfficialReleasesByDistro('ubuntu');
    expect(ubuntu).toBeDefined();
    expect(ubuntu?.releases.some(r => r.version.includes('24.04'))).toBe(true);
  });
});
