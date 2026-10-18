# Reel de lanzamiento: "Canelo se perdió (y casi estafan a su familia)"

Video final: `docs/reel-canelo.mp4` (1080×1920, 30 fps, 54 s, con la voz de Benjamín, música original y subtítulos).
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

## Versión 2 (con voz propia)
- `fineseg.py` y `cutlines.py` cortan la grabación en sus 13 frases (en los puntos más silenciosos) y las verifican con Whisper small.
- `frases-voz.json` tiene el texto final de cada frase (subtítulos) y su duración.
- `make_timeline2.py` arma escenas al ritmo de la voz, con pausas para respirar, subtítulos discretos y lupas; `mix2.py` mezcla voz, música y efectos.

## Versiones cortas (anuncios de 19-23 s, una idea cada una)
Hechas con la misma grabación, sin pausas largas y con un gancho escrito en el primer segundo:
- `docs/reel-corto-estafas.mp4`: frases 1, 4, 5, 8 y 12 → `build_short.sh '{"lines":[1,4,5,8,12],"lead":0.1,"breathe":0.28,"hookTitle":{"text":"Casi estafan a su familia 😱","until":1.8},"timing":"timing_estafas.json"}' estafas salida.mp4`
- `docs/reel-corto-perdidos.mp4`: frases 2, 3, 6, 7, 9, 12 y 13 → mismo comando con `"lines":[2,3,6,7,9,12,13]` y el gancho "¿Se perdió tu mascota? 🐾".
