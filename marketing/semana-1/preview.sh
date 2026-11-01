#!/bin/bash
# Uso: preview.sh <reel> → hoja de contacto con el último cuadro de cada escena
set -e
D=/tmp/claude-0/-home-user-App-mascota/e9ff2a75-450f-526e-bf81-94e9a0483a02/scratchpad/semana1
python3 -I $D/reels.py $1 >/dev/null
rm -f $D/still-*.jpg
T=$(python3 -c "import json;d=json.load(open('$D/timing_$1.json'));print(' '.join(str(round(s+x['dur']-.25,2)) for s,x in zip(d['starts'],d['scenes'])))")
cd /home/user/App-mascota && node marketing/reel-canelo/capturas/stills.mjs $D $T
python3 -I - "$D" "$1" $T <<'PY'
import sys
from PIL import Image
d,name,ts=sys.argv[1],sys.argv[2],sys.argv[3:]
w,h=270,480; sheet=Image.new("RGB",(w*len(ts),h),"white")
for i,t in enumerate(ts): sheet.paste(Image.open(f"{d}/still-{t}.jpg").resize((w,h)),(i*w,0))
sheet.save(f"{d}/prev-{name}.jpg",quality=82)
PY
