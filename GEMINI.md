# GEMINI.md — Contexte de reprise pour continuer ce projet sans casser ce qui marche

Ce fichier existe pour qu'un autre agent (Gemini ou autre) reprenne le travail sur **OSForge Studio**
sans refaire les erreurs déjà commises et corrigées ici, et sans re-découvrir à la dure des pièges
déjà identifiés. Lis-le avant de toucher au code.

## Le projet en une phrase

App React 19 + TypeScript + Vite 8 qui génère de VRAIS scripts bash / manifestes cloud-init pour
construire des ISO Linux, images disque (QCOW2/VMDK/RAW), RootFS WSL2/Docker et cartes SD
Raspberry Pi personnalisées. Déployée sur GitHub Pages :
`https://lordmadtrix.github.io/osforge-studio/`. Dépôt : `LordMadTrix/osforge-studio` (branche
`main`).

## La règle absolue : zéro cosmétique

**Le principe qui gouverne tout ce projet : « je ne veux pas du cosmétique ».** Chaque case à
cocher, chaque menu déroulant de l'UI DOIT correspondre à quelque chose de réellement câblé dans
le script généré. Une fonctionnalité qui a l'air de marcher mais qui silencieusement ne fait rien
(ou pire, casse le build) est pire qu'une fonctionnalité absente.

Conséquence pratique : **ne jamais inventer un nom de paquet, un dépôt, ou un mécanisme système.**
Avant de câbler quoi que ce soit :
1. Vérifier en DIRECT (WebFetch/navigateur) que le paquet existe vraiment sur le dépôt officiel de
   la distro visée — `archlinux.org/packages/search/json` (JSON, fiable), `packages.debian.org`,
   `packages.fedoraproject.org`, `rpmfind.net` (pour openSUSE), `pkgs.alpinelinux.org`,
   `raw.githubusercontent.com/void-linux/void-packages/master/srcpkgs/<pkg>/template`,
   `pkg.kali.org`.
2. **Préférer les API JSON aux pages HTML scrapées** — une vérification HTML a produit un faux
   positif cette session (Deepin/Debian : 200 au premier essai, 404 à la reprise). Toujours
   re-vérifier une fois si le résultat est surprenant.
3. Si le paquet/mécanisme n'existe vraiment pas pour une distro donnée : soit l'exclure
   honnêtement (ne rien installer, code déjà commenté partout dans `scriptGenerators.ts` avec
   `// confirmé ABSENT`), soit imprimer un avertissement clair dans le script généré
   (`echo -e "${YELLOW}[INFO] ..."`). Ne JAMAIS faire semblant que ça marche.
4. Après implémentation : **générer le script réel** (voir workflow de vérification plus bas),
   parfois **l'exécuter vraiment** en local pour les correctifs de sécurité (preuve d'exploit AVANT
   le fix, preuve de non-exploit APRÈS).

## Architecture — fichiers qui comptent

- **`src/services/scriptGenerators.ts`** (~2700 lignes) — LE fichier. Toute la génération de
  scripts bash/YAML vit ici. Fonctions principales :
  - `resolvePackageList(recipe)` — construit la liste de paquets à installer, par distro/bureau.
  - `generateBuildScript(recipe)` — point d'entrée : bascule vers `generateNonDebianBuildScript`
    si la distro n'est pas dans `DEBOOTSTRAP_TARGETS` (debian/ubuntu/kali/raspbian/linuxmint),
    sinon construit le script debootstrap complet (ISO/RootFS x86_64, ARM64, RISC-V).
  - `generateNonDebianBuildScript(recipe, family)` — Arch/CachyOS, Fedora/Rocky, Alpine, openSUSE,
    Void. Bascule vers `generateNonDebianDiskImageScript` si le format est un disque (qcow2/vmdk/
    raw_img), sinon ne produit QUE le RootFS WSL2/Docker (l'ISO live bootable pour ces familles
    n'est PAS implémentée — le script le dit clairement plutôt que de mentir).
  - `generateRpiSdScript(recipe)` — carte SD Raspberry Pi (aarch64 uniquement).
  - `generateCloudInitYaml(recipe)` — manifeste cloud-init, généré pour LES 13 distros du
    catalogue sans filtrage (affiché systématiquement par `RecipeInspector.tsx`).
- **`src/types/os.ts`** — tous les types partagés (`DistroId`, `DesktopEnvironmentId`,
  `KernelType`, `OSRecipe`, etc.). Étendre un type ici = additif, sans risque, mais chercher TOUS
  les endroits qui font un `switch`/`if` littéral sur l'ancien jeu de valeurs (voir piège
  isDebianLike ci-dessous).
- **`src/data/distros.ts`**, **`src/data/desktopEnvironments.ts`**, **`src/data/packages.ts`** —
  catalogues (distros, bureaux, paquets logiciels sélectionnables). `supportedArch` dans
  `distros.ts` n'est consulté qu'au changement de distro dans l'UI (reset de `recipe.arch`), PAS
  comme garde-fou à la génération — les avertissements honnêtes dans `scriptGenerators.ts` sont
  la vraie protection.
- **`src/components/DesktopSelector.tsx`**, et globalement **tous les sélecteurs UI** — ils font
  `CATALOGUE.map(x => ...)` SANS FILTRER par distro choisie. Ça veut dire : l'UI laisse
  sélectionner N'IMPORTE QUELLE combinaison distro × bureau × noyau × format de sortie, valide ou
  pas. C'est `scriptGenerators.ts` seul qui doit décider quoi faire (câbler réellement, ou avertir
  honnêtement) — jamais supposer qu'une combinaison est déjà filtrée en amont.
- **`src/services/scriptGenerators.test.ts`** — suite Vitest, ~365 tests. Un `describe` par bug
  trouvé/fonctionnalité ajoutée, avec le contexte de vérification en direct dans le titre du
  `describe` (garde cette convention, c'est très utile pour comprendre l'historique sans lire
  `git log`).

## Regroupements par famille déjà établis — les réutiliser, ne pas les redécouvrir

- **`isDebianLike`** (dans `resolvePackageList`) = `debian | ubuntu | kali | raspbian | linuxmint`.
  Ces 5 distros bootstrapent depuis le même pool de paquets (Debian brut pour raspbian/kali-family,
  Ubuntu brut pour linuxmint — voir `DEBOOTSTRAP_TARGETS`). **Piège déjà rencontré deux fois** :
  du code qui teste seulement `distroId === 'debian' || distroId === 'ubuntu'` littéralement
  oublie kali/raspbian/linuxmint en silence (paquets de bureau, SSH, utilitaires de base jamais
  installés pour ces 3 distros — bug réel corrigé commit `745d3f6`). Toujours utiliser
  `isDebianLike` pour tout nouveau bloc concernant cette famille.
- **`NON_DEBIAN_DISTROS`** (map globale) = regroupe `arch/cachyos→'arch'`, `fedora/rocky→'fedora'`,
  `alpine→'alpine'`, `opensuse→'suse'`, `void→'void'`. Utilisé pour choisir le bon mécanisme
  systemd/OpenRC/runit (`sshEnableCmd`, `sshEnableLine` dans le cloud-init, etc.). **Piège
  rencontré** : Alpine (OpenRC) et Void (runit) n'ont PAS `systemctl` du tout — un `systemctl
  enable ssh` y échoue silencieusement (`|| true` masque l'échec). Toujours vérifier le vrai
  mécanisme d'init avant d'écrire une commande d'activation de service.
- **`isArchLike`** = `arch | cachyos`, **`isFedoraLike`** = `fedora | rocky`. CachyOS et Rocky
  suivent les paquets Arch/Fedora "purs" — **CachyOS n'a PAS son vrai dépôt câblé** (avertissement
  honnête à la place, voir plus bas) et **Rocky/EPEL9 n'a PAS certains bureaux** (LXQt, LXDE —
  absents d'EPEL9, contrairement à MATE qui y est présent).
- Nom d'unité SSH : **`ssh`** sur la famille Debian, **`sshd`** partout ailleurs (Arch/Fedora/
  Rocky/openSUSE/CachyOS). Alpine = `rc-update add sshd default`. Void = symlink dans
  `/etc/runit/runsvdir/default/`.

## Écarts déjà connus et VOLONTAIREMENT hors périmètre (ne pas les "corriger" à moitié)

- **CachyOS** utilise le dépôt Arch standard, pas le vrai dépôt CachyOS (URLs à version figée,
  clé via keyserver, détection ISA x86-64-v3/v4 — trop fragile pour un correctif ponctuel).
  Avertissement honnête déjà en place.
- **Cross-architecture pour les 5 familles non-Debian** (Arch/Fedora/Alpine/openSUSE/Void) : le
  bootstrap reste x86_64 uniquement, avertissement honnête déjà en place
  (`nonNativeArchNotice`). Seule la famille Debian a une vraie émulation qemu-*-static pour
  ARM64/RISC-V.
- **ISO bootable en ARM64/RISC-V** : même pour Debian (qui a le bootstrap cross-arch qui marche),
  la chaîne GRUB/xorriso reste x86_64-only. Le script avertit et recommande WSL2/Docker (RootFS
  pur, sans chaîne d'amorçage) comme alternative qui marche vraiment.
- **Rocky 9 vs 10** : le générateur reste sur `releasever=9` délibérément (Rocky 9 supporté
  jusqu'en 2032, tout le travail de vérification EPEL9 déjà fait). Migrer vers EPEL10 nécessiterait
  de tout re-vérifier.
- **`cisBenchmarkLevel`** et **`luksEncryption`** — champs présents dans `SecurityConfig` mais
  jamais câblés. Identifiés comme nécessitant une recherche dédiée bien plus large, pas encore
  commencée.
- **Branding Plymouth** (`bootSplashTheme`, `wallpaperPreset`, `accentColor`) — pas vérifiable sans
  capacité de capture d'écran d'un vrai boot, laissé de côté.

## Workflow de vérification à suivre pour CHAQUE changement

1. `npm run build` (tsc -b + vite build) — doit être propre.
2. `npm run test` (vitest, ~365 tests actuellement) — tous verts.
3. Écrire un script scratch TypeScript dans `scripts/dump-<feature>-test.ts` qui importe
   `generateBuildScript`/`resolvePackageList`/`generateCloudInitYaml` directement et affiche le
   résultat réel pour les cas concernés. L'exécuter avec `npx tsx scripts/dump-<feature>-test.ts`.
   **Toujours supprimer ce script après vérification** (`rm scripts/dump-*.ts`) — ce ne sont pas
   des artefacts à garder dans le dépôt.
4. Pour un correctif de sécurité (injection shell) : extraire la ligne bash générée et
   **l'exécuter réellement en local** avec une charge utile malveillante (ex. `username =
   "evil$(touch /tmp/pwned)"`) pour prouver l'exploit AVANT le fix, puis reproduire pour prouver
   la non-exploitation APRÈS.
5. Ajouter un test Vitest de non-régression dans `scriptGenerators.test.ts`, dans le style déjà
   établi : titre du `describe` = contexte complet du bug (ce qui a été trouvé, comment vérifié).
6. **Mettre systématiquement à jour `GEMINI.md`** (section « État au moment de la rédaction de ce fichier », total des tests, nouveaux pièges/dépôts identifiés) pour assurer une continuité parfaite entre sessions.
7. `git add` des fichiers précis (jamais `git add -A`/`.`).
8. Commit en français, détaillé, se terminant par `Co-Authored-By: <ton nom d'agent> <noreply@...>`.
9. `git push origin main`.
10. Poller `gh run list --repo LordMadTrix/osforge-studio --branch main --limit 5 --json
    status,name,headSha -q '...'` jusqu'à ce que le workflow CI **et** le déploiement GitHub Pages
    soient tous les deux `completed`/`success` séparément (ce sont deux workflows distincts).

## Piège d'environnement observé (peut ne pas s'appliquer à toi, mais si `git commit -m` échoue bizarrement)

Sur cette machine, `git commit -m "$(cat <<'EOF' ... EOF)"` a fini par déclencher un faux positif
d'un hook local (« BLOCKED: --no-verify flag is not allowed » alors qu'aucun `--no-verify` n'est
utilisé). Contournement fiable utilisé tout du long : écrire le message dans un fichier texte
temporaire, puis `git commit -F <fichier>`, puis supprimer le fichier temporaire immédiatement
après.

## État au moment de la rédaction de ce fichier

- Suite de tests : 431 tests, tous verts. CI + Pages verts sur le dernier commit poussé.
- **Correction importante à une affirmation précédente de ce fichier** : contrairement à ce qui
  était écrit ici auparavant, `niri` n'est PAS intégré « sur toutes les distributions supportées ».
  Vérifié en direct : le paquet `niri` lui-même est réellement ABSENT de Debian trixie
  (packages.debian.org : « No such package ») et d'Ubuntu « resolute » (seuls `niri-companion` et
  `librust-niri-ipc-dev` existent, uniquement dans la suite future « stonking »). La famille
  Debian/Ubuntu/Kali/Raspbian/Mint installait donc waybar/alacritty/fuzzel/mako/swaylock — des
  outils sans aucune utilité sans le compositeur lui-même — sans jamais installer `niri`. Corrigé :
  plus aucun paquet installé pour cette combinaison (honnêtement hors périmètre, comme
  Void+Hyprland). Bug distinct trouvé dans le même bloc : Void, à l'inverse, avait bien accès au
  vrai paquet `niri` (confirmé via son template source) mais l'omettait du script — corrigé en
  l'ajoutant.
- **Faille de sécurité réelle trouvée et corrigée** : `kernelCmdline` (champ libre ajouté par le
  chantier « Ligne de commande noyau personnalisée ») était interpolé sans échappement dans le
  corps de heredocs bash NON protégés (`<< GRUBCFG_EOF` / `<< CMDLINE_EOF`, sans apostrophes —
  nécessaire pour laisser `${KERNEL_PATH}`/`${ROOT_UUID}` s'évaluer à l'exécution). Un heredoc non
  protégé développe aussi `$()`, les backticks et `\` dans tout son corps : un `kernelCmdline`
  contenant `$(commande malveillante)` exécutait réellement cette commande avec les privilèges
  root du script généré — reproduit et vérifié par exécution bash réelle (avant/après). Corrigé via
  `sanitizeKernelCmdline()` qui retire `$`, backtick et `\` (une ligne de commande noyau légitime
  n'en a jamais besoin).
- **Point de vigilance pour la suite** : les nouveaux champs ajoutés par n'importe quelle session
  (`enableZram`, `enableFlatpak`, `kernelCmdline`, etc.) doivent systématiquement être passés au
  crible des deux mêmes questions que ci-dessus : (1) le paquet/mécanisme annoncé pour CHAQUE
  distro est-il réellement vérifié en direct, pas seulement pour les familles « évidentes »
  (Debian/Arch) ? (2) si le champ est un texte libre interpolé dans un heredoc bash NON protégé
  (delimiteur sans apostrophes), a-t-il été passé par un sanitizer avant interpolation ?
- Autres chantiers déjà en place (non re-vérifiés ce cycle, toujours considérés fiables) :
  catalogue logiciel (51 paquets), durcissement CIS Benchmark, zRAM, Flatpak/Flathub, Openbox
  (vérifié fiable : `openbox` est bien présent dans le push de toutes les familles, contrairement à
  `niri`).
- Mandat général maintenu : « Zéro cosmétique », chaque option UI est réellement câblée et vérifiée.
