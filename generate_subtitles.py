import os

SUBTITLES = [
    # Chapitre 1 : Accroche & Démo (0.00s -> 25.82s)
    (0.0, 4.2, "Vous avez toujours rêvé d'avoir votre propre distribution Linux ?"),
    (4.2, 8.5, "Avec vos logiciels favoris, vos personnalisations et un installateur clé en main ?"),
    (8.5, 12.8, "Oubliez les commandes interminables et la compilation manuelle du noyau."),
    (12.8, 17.5, "Aujourd'hui, fabriquez votre ISO Linux sur mesure en moins de dix minutes..."),
    (17.5, 21.5, "grâce à OSForge Studio : 100% gratuit et open source..."),
    (21.5, 25.82, "réalisable directement depuis votre navigateur web !"),

    # Chapitre 2 : Prise en main & Deux modes (25.82s -> 54.21s)
    (25.82, 30.0, "Rendez-vous sur OSForge Studio. L'interface propose deux modes adaptés."),
    (30.0, 34.5, "D'un côté, l'Assistant Débutant, qui vous guide pas à pas avec des questions simples."),
    (34.5, 39.5, "De l'autre, le Studio Expert, conçu pour ceux qui veulent un contrôle total :"),
    (39.5, 44.5, "noyau, pare-feu, chiffrement du disque LUKS et optimisations gaming."),
    (44.5, 49.5, "Dans la barre latérale gauche, vous naviguez facilement entre la distribution de base,"),
    (49.5, 54.21, "l'interface graphique, vos paquets et les réglages de sécurité."),

    # Chapitre 3 : Choix de la Recette (54.21s -> 89.40s)
    (54.21, 58.5, "Pour notre système, choisissons une base Ubuntu 24.04 LTS pour sa stabilité."),
    (58.5, 63.5, "Côté bureau, nous avons l'embarras du choix : KDE Plasma, GNOME, XFCE ou Hyprland."),
    (63.5, 68.5, "Un simple clic sur le bouton Aperçu vous affiche la vraie capture d'écran en haute résolution"),
    (68.5, 72.5, "avec sa consommation réelle de mémoire RAM."),
    (72.5, 77.5, "Ensuite, sélectionnons nos logiciels : stack gaming avec Steam et Proton,"),
    (77.5, 82.5, "outils de développement, et utilitaires modernes comme Fastfetch et Btop."),
    (82.5, 89.40, "Enfin, personnalisons notre identité : nom du système, fond d'écran vectoriel et couleur d'accentuation."),

    # Chapitre 4 : Export & Compilation (89.40s -> 117.17s)
    (89.40, 93.5, "Notre recette est prête. Cliquons sur le bouton Compiler l'Image."),
    (93.5, 98.5, "OSForge Studio génère de vrais scripts bash audités et des lanceurs automatiques."),
    (98.5, 102.5, "Téléchargez l'archive ZIP et extrayez-la."),
    (102.5, 107.5, "Sous Windows, aucune commande n'est requise : double-cliquez simplement sur auto-build.bat."),
    (107.5, 112.5, "Le script s'exécute en mode administrateur dans WSL2, installe les dépendances,"),
    (112.5, 117.17, "et compile l'ISO complète sous vos yeux."),

    # Chapitre 5 : Test Live QEMU (117.17s -> 139.92s)
    (117.17, 122.0, "Dès que la compilation se termine, le lanceur active automatiquement le test Live QEMU."),
    (122.0, 127.5, "Grâce à l'accélération matérielle WHPX, l'ISO démarre en moins de trente secondes"),
    (127.5, 132.5, "directement dans la mémoire vive, sans toucher à vos disques durs."),
    (132.5, 136.5, "Notre fond d'écran personnalisé est bien là, le terminal Fastfetch affiche notre logo,"),
    (136.5, 139.92, "et tous nos logiciels sont installés et fonctionnels."),

    # Chapitre 6 : Flash USB & Outro (139.92s -> 165.86s)
    (139.92, 144.5, "Pour installer votre création sur un vrai PC, flashez l'image sur une clé USB avec Rufus"),
    (144.5, 149.0, "ou copiez-la simplement sur une clé Ventoy."),
    (149.0, 154.5, "Et si votre PC manque de puissance, OSForge Studio inclut même un workflow GitHub Actions"),
    (154.5, 159.0, "pour compiler gratuitement votre ISO dans le Cloud !"),
    (159.0, 162.5, "Tous les liens sont disponibles dans la description. Testez l'outil,"),
    (162.5, 165.86, "partagez vos créations et abonnez-vous pour d'autres tutoriels. À très bientôt !")
]

def format_time_srt(seconds):
    hrs = int(seconds // 3600)
    mins = int((seconds % 3600) // 60)
    secs = int(seconds % 60)
    millis = int(round((seconds - int(seconds)) * 1000))
    if millis >= 1000:
        secs += 1
        millis = 0
    return f"{hrs:02d}:{mins:02d}:{secs:02d},{millis:03d}"

def format_time_vtt(seconds):
    hrs = int(seconds // 3600)
    mins = int((seconds % 3600) // 60)
    secs = int(seconds % 60)
    millis = int(round((seconds - int(seconds)) * 1000))
    if millis >= 1000:
        secs += 1
        millis = 0
    return f"{hrs:02d}:{mins:02d}:{secs:02d}.{millis:03d}"

def generate_subtitles():
    srt_path = r"D:\osbuilder\tutorial_assets\sous_titres_tutoriel.srt"
    vtt_path = r"D:\osbuilder\tutorial_assets\sous_titres_tutoriel.vtt"

    with open(srt_path, "w", encoding="utf-8") as fsrt:
        for idx, (start, end, text) in enumerate(SUBTITLES, start=1):
            fsrt.write(f"{idx}\n")
            fsrt.write(f"{format_time_srt(start)} --> {format_time_srt(end)}\n")
            fsrt.write(f"{text}\n\n")

    with open(vtt_path, "w", encoding="utf-8") as fvtt:
        fvtt.write("WEBVTT - Tutoriel OSForge Studio\n\n")
        for idx, (start, end, text) in enumerate(SUBTITLES, start=1):
            fvtt.write(f"{idx}\n")
            fvtt.write(f"{format_time_vtt(start)} --> {format_time_vtt(end)}\n")
            fvtt.write(f"{text}\n\n")

    print(f"Sous-titres générés avec succès :\n- {srt_path}\n- {vtt_path}")

if __name__ == "__main__":
    generate_subtitles()
