# Reel de lanzamiento: "Canelo se perdió (y casi estafan a su familia)"

Video final: `docs/reel-canelo.mp4` (1080×1920, 30 fps, 42 s, voz + música original + subtítulos).
Portada: `docs/portada-reel-canelo.jpg`. Texto del post: `caption-instagram.txt`.

## Cómo se hizo
1. **Guion**: investigación de competencia en Chile y de patrones de reels, 3 guiones y un jurado (`script.json`).
2. **Pantallas reales**: datos de demostración locales (mascotas ilustradas, nunca fotos reales) y recorrido con Playwright
   (`capturas/seed-demo.mjs`, `capturas/flow-demo.mjs`, `capturas/flow-canelo.mjs`).
3. **Voz**: voz neuronal Piper `es_MX-claude-high` con sherpa-onnx (`vo.py`), verificada con Whisper.
4. **Música**: sintetizada desde cero (`music.py`), sin derechos de terceros.
5. **Animación**: `engine.html` + `extra.js`, renderizado cuadro a cuadro (`capturas/render.mjs`) y armado con ffmpeg;
   `make_timeline.py` sincroniza escenas y subtítulos con la voz, `mix.py` mezcla voz, música y efectos.

Los scripts usan rutas de trabajo temporales; sirven como base para la "Parte 2".
