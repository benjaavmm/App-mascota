#!/bin/bash
# Uso: build.sh <audio-del-usuario> <salida.mp4>
set -e
D=/tmp/claude-0/-home-user-App-mascota/e9ff2a75-450f-526e-bf81-94e9a0483a02/scratchpad/reel2
python3 -I $D/seg.py "$1" 2>/dev/null
python3 -I $D/make_timeline2.py
python3 -I $D/mix2.py
rm -rf $D/frames
TOTAL=$(python3 -c "import json;print(round(json.load(open('$D/timing2.json'))['total']*30))"); HALF=$((TOTAL/2))
cd /home/user/App-mascota
node marketing/reel-canelo/capturas/render.mjs $D 0 $HALF > /tmp/claude-0/r1.log 2>&1 &
node marketing/reel-canelo/capturas/render.mjs $D $HALF > /tmp/claude-0/r2.log 2>&1
wait
cd $D && ffmpeg -loglevel error -y -framerate 30 -i frames/f%05d.jpg -i audio2.wav -c:v libx264 -preset slow -crf 19 -pix_fmt yuv420p -af "loudnorm=I=-14:TP=-1.5:LRA=11" -c:a aac -b:a 192k -ar 44100 -shortest -movflags +faststart "$2"
ffprobe -v error -show_entries format=duration -of default=nw=1 "$2"
