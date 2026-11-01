# Semana 1 de contenido (reels con texto y música + carruseles)

Resultado en `docs/semana-1/` (calendario y textos en `docs/semana-1/PUBLICACIONES.md`).

- `reels.py`: guiones de los 4 reels (escenas, textos y duración). `python3 reels.py <reel>` escribe `timeline.js`.
- `extra-week.js`: escenas nuevas (`step`, `flag`, `grid`) sobre `engine.html`, y una corrección del texto animado
  (`kinetic`), cuyo zoom se acumulaba cuadro a cuadro.
- `music2.py`: música original sintetizada con 4 estilos (`alegre`, `tension`, `tierno`, `ritmo`); `mixw.py` agrega efectos según las escenas.
- `build.sh <reel> <estilo> <salida.mp4>`: mezcla el audio, renderiza con Playwright (3 procesos) y arma el MP4 con ffmpeg (−14 LUFS).
- `preview.sh <reel>`: hoja de contacto con el último cuadro de cada escena, para revisar antes de renderizar.
- `carrusel.html` + `carrusel.mjs`: diapositivas de carrusel (1080×1350), post y fondos de historias (1080×1920).

Como en `marketing/reel-canelo`, los scripts usan una carpeta de trabajo temporal (con las capturas de la app en `shots/`).
