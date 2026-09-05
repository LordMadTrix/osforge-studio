import asyncio
import edge_tts

VOICE = "fr-FR-HenriNeural"
TEXT = (
    "Tu veux créer ta propre distribution Linux personnalisée sans taper une seule ligne de commande ? "
    "Découvre OSForge Studio, un outil 100% gratuit dans ton navigateur ! "
    "Choisis ta distribution : Ubuntu, Arch ou Debian. "
    "Sélectionne ton bureau avec aperçu haute définition : KDE Plasma ou Hyprland. "
    "Active la stack gaming avec Steam, Proton et MangoHUD. "
    "Clique sur Compiler, double-clique sur auto-build sous Windows, et ton ISO démarre directement en Live dans QEMU ! "
    "Le lien est dans la description, teste-le dès maintenant !"
)

async def main():
    communicate = edge_tts.Communicate(TEXT, VOICE, rate="+8%", pitch="+0Hz")
    await communicate.save(r"D:\osbuilder\tutorial_assets\shorts_voice.mp3")
    print("Shorts audio generated!")

if __name__ == "__main__":
    asyncio.run(main())
