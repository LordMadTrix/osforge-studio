import asyncio
import os
import edge_tts

VOICE = "fr-FR-HenriNeural"  # Voix française masculine très naturelle et claire
OUTPUT_DIR = r"d:\osbuilder\tutorial_assets\audio"

SCRIPTS = [
    {
        "file": "01_intro_accroche.mp3",
        "text": (
            "Vous avez toujours rêvé d'avoir votre propre distribution Linux, avec vos logiciels favoris, "
            "vos personnalisations graphiques, et un installateur clé en main ? "
            "Oubliez les commandes interminables et la compilation manuelle du noyau. Aujourd'hui, je vous montre "
            "comment fabriquer votre propre ISO Linux sur mesure en moins de dix minutes, grâce à OSForge Studio. "
            "C'est 100% gratuit, open source, et réalisable directement depuis votre navigateur web."
        )
    },
    {
        "file": "02_interface_modes.mp3",
        "text": (
            "Rendez-vous sur OSForge Studio. L'interface propose deux modes adaptés à vos besoins. "
            "D'un côté, l'Assistant Débutant, qui vous guide pas à pas avec des questions simples. "
            "De l'autre, le Studio Expert, conçu pour ceux qui veulent un contrôle total : noyau, pare-feu, "
            "chiffrement du disque LUKS, et optimisations gaming. "
            "Dans la barre latérale gauche, vous naviguez facilement entre la distribution de base, l'interface graphique, "
            "vos paquets et les réglages de sécurité."
        )
    },
    {
        "file": "03_configuration_recette.mp3",
        "text": (
            "Pour notre système, choisissons une base Ubuntu 24.04 LTS pour sa grande stabilité. "
            "Côté bureau, nous avons l'embarras du choix : KDE Plasma, GNOME, XFCE, ou encore Hyprland. "
            "Un simple clic sur le bouton Aperçu vous affiche directement la vraie capture d'écran du bureau "
            "en haute résolution avec sa consommation de mémoire RAM. "
            "Ensuite, sélectionnons nos logiciels : outils de développement, stack gaming avec Steam et Proton, "
            "et utilitaires modernes comme Fastfetch et Btop. "
            "Enfin, personnalisons notre identité : nom du système, fond d'écran vectoriel et couleur d'accentuation."
        )
    },
    {
        "file": "04_export_et_compilation.mp3",
        "text": (
            "Notre recette est prête. Cliquons sur le bouton Compiler l'Image. "
            "OSForge Studio génère de vrais scripts bash audités, ainsi que des lanceurs automatiques pour Windows et Linux. "
            "Téléchargez l'archive ZIP et extrayez-la. "
            "Sous Windows, aucune commande n'est requise : faites simplement un double-clic sur auto-build point bat. "
            "Le script s'exécute en mode administrateur dans WSL2, installe les dépendances nécessaires, "
            "et compile l'ISO complète sous vos yeux."
        )
    },
    {
        "file": "05_test_live_qemu.mp3",
        "text": (
            "Dès que la compilation se termine, le lanceur active automatiquement le test Live avec l'émulateur QEMU. "
            "Grâce à l'accélération matérielle Windows Hypervisor Platform, l'ISO démarre en moins de trente secondes "
            "directement dans la mémoire vive, sans toucher à vos disques durs. "
            "Notre fond d'écran personnalisé est bien là, le terminal Fastfetch affiche notre logo, "
            "et tous nos logiciels sont installés et fonctionnels."
        )
    },
    {
        "file": "06_flash_usb_et_outro.mp3",
        "text": (
            "Pour installer votre création sur un vrai PC, vous pouvez flasher l'image sur une clé USB avec Rufus "
            "ou la copier simplement sur une clé Ventoy. "
            "Et si votre ordinateur manque de puissance, OSForge Studio inclut même un workflow GitHub Actions "
            "pour compiler gratuitement votre ISO dans le Cloud ! "
            "Tous les liens sont disponibles dans la description. N'hésitez pas à tester l'outil, "
            "à partager vos créations, et à vous abonner pour d'autres tutoriels. À très bientôt !"
        )
    }
]

async def generate_audio():
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    for item in SCRIPTS:
        filepath = os.path.join(OUTPUT_DIR, item["file"])
        print(f"Génération de {item['file']}...")
        communicate = edge_tts.Communicate(item["text"], VOICE, rate="+3%", pitch="+0Hz")
        await communicate.save(filepath)
        print(f"-> {item['file']} généré avec succès ({os.path.getsize(filepath)} octets)")

if __name__ == "__main__":
    asyncio.run(generate_audio())
