import { describe, it, expect, beforeEach } from 'vitest';
import {
  saveCurrentAutosave,
  loadCurrentAutosave,
  saveUserProfile,
  getUserProfiles,
  deleteUserProfile,
  loadUserProfile,
  exportRecipeToJson,
  importRecipeFromJson,
} from './configStorage';
import { OSRecipe } from '../types/os';

// Mock simple de localStorage pour l'environnement de test Vitest
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(globalThis, 'window', {
  value: {
    localStorage: localStorageMock,
  },
  writable: true,
});

const mockRecipe: OSRecipe = {
  id: 'test-recipe-1',
  name: 'Test OS',
  description: 'Recipe de test',
  distro: 'debian',
  distroVersion: '13',
  distroSuite: 'trixie',
  arch: 'x86_64',
  outputFormat: 'iso_hybrid',
  desktop: 'kde',
  displayManager: 'sddm',
  kernel: 'xanmod',
  selectedPackages: ['docker', 'git'],
  customPackages: ['htop'],
  branding: {
    osName: 'TestOS',
    editionName: 'Standard',
    version: '1.0',
    accentColor: '#38bdf8',
    wallpaperPreset: 'minimal',
    bootSplashTheme: 'minimal',
  },
  user: {
    username: 'tester',
    fullName: 'Test User',
    sudo: true,
    autologin: true,
    shell: '/bin/bash',
  },
  hostname: 'test-node',
  timezone: 'Europe/Paris',
  locale: 'fr_FR',
  keyboardLayout: 'fr',
  enableSSH: true,
  security: {
    cisBenchmarkLevel: 1,
    firewall: 'ufw',
    appArmorOrSELinux: true,
    fail2ban: true,
    enableCrowdSec: true,
    luksEncryption: false,
    disableRootSSH: true,
    autoSecurityUpdates: true,
  },
  customServices: [],
  firstBootScript: '#!/bin/sh\necho "test"',
};

describe('configStorage (Gestionnaire de Profils & Sauvegarde)', () => {
  beforeEach(() => {
    localStorageMock.clear();
  });

  describe('Autosave continu (saveCurrentAutosave & loadCurrentAutosave)', () => {
    it('sauvegarde et recharge la recette courante depuis localStorage', () => {
      expect(loadCurrentAutosave()).toBeNull();
      saveCurrentAutosave(mockRecipe);
      const loaded = loadCurrentAutosave();
      expect(loaded).not.toBeNull();
      expect(loaded?.name).toBe('Test OS');
      expect(loaded?.distro).toBe('debian');
      expect(loaded?.security.enableCrowdSec).toBe(true);
    });
  });

  describe('Profils Utilisateur Nommés', () => {
    it('enregistre, liste, charge et supprime un profil utilisateur', () => {
      expect(getUserProfiles()).toEqual([]);

      const saved = saveUserProfile('Mon Profil Gaming', mockRecipe, 'Profil optimisé');
      expect(saved.name).toBe('Mon Profil Gaming');
      expect(saved.description).toBe('Profil optimisé');
      expect(saved.recipe.distro).toBe('debian');

      const profiles = getUserProfiles();
      expect(profiles.length).toBe(1);
      expect(profiles[0].id).toBe(saved.id);

      const loadedRecipe = loadUserProfile(saved.id);
      expect(loadedRecipe).not.toBeNull();
      expect(loadedRecipe?.distro).toBe('debian');

      deleteUserProfile(saved.id);
      expect(getUserProfiles()).toEqual([]);
      expect(loadUserProfile(saved.id)).toBeNull();
    });

    it('met à jour un profil existant s’il porte le même nom', () => {
      saveUserProfile('Mon Profil', mockRecipe);
      expect(getUserProfiles().length).toBe(1);

      const updatedRecipe = { ...mockRecipe, hostname: 'updated-node' };
      saveUserProfile('Mon Profil', updatedRecipe, 'Description mise à jour');
      const profiles = getUserProfiles();
      expect(profiles.length).toBe(1);
      expect(profiles[0].recipe.hostname).toBe('updated-node');
      expect(profiles[0].description).toBe('Description mise à jour');
    });
  });

  describe('Export & Import JSON universels', () => {
    it('exporte une recette en chaîne JSON valide', () => {
      const json = exportRecipeToJson(mockRecipe);
      expect(typeof json).toBe('string');
      const parsed = JSON.parse(json);
      expect(parsed.id).toBe(mockRecipe.id);
      expect(parsed.distro).toBe('debian');
    });

    it('importe avec succès une recette depuis une chaîne JSON', () => {
      const json = exportRecipeToJson(mockRecipe);
      const res = importRecipeFromJson(json);
      expect(res.success).toBe(true);
      expect(res.recipe?.distro).toBe('debian');
      expect(res.recipe?.security.enableCrowdSec).toBe(true);
    });

    it('rejette une chaîne JSON malformée ou sans distribution', () => {
      const invalidJson = '{ "broken": json';
      const res1 = importRecipeFromJson(invalidJson);
      expect(res1.success).toBe(false);
      expect(res1.error).toBeDefined();

      const missingDistro = JSON.stringify({ name: 'Sans distro' });
      const res2 = importRecipeFromJson(missingDistro);
      expect(res2.success).toBe(false);
      expect(res2.error).toContain('distribution');
    });
  });
});
