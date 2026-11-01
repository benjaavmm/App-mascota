#!/bin/bash
# Uso: build.sh <reel> <preset> <salida.mp4>
set -e
D=/tmp/claude-0/-home-user-App-mascota/e9ff2a75-450f-526e-bf81-94e9a0483a02/scratchpad/semana1
python3 -I $D/reels.py $1
python3 -I $D/mixw.py $1 $2
rm -rf $D/frames
TOTAL=$(python3 -c "import json;print(round(json.load(open('$D/timing_$1.json'))['total']*30))"); Q=$((TOTAL/3))
cd /home/user/App-mascota
node marketing/reel-canelo/capturas/render.mjs $D 0 $Q > /tmp/claude-0/w1.log 2>&1 &
node marketing/reel-canelo/capturas/render.mjs $D $Q $((2*Q)) > /tmp/claude-0/w2.log 2>&1 &
node marketing/reel-canelo/capturas/render.mjs $D $((2*Q)) > /tmp/claude-0/w3.log 2>&1
wait
cd $D && ffmpeg -loglevel error -y -framerate 30 -i frames/f%05d.jpg -i "audio_$1.wav" -c:v libx264 -preset slow -crf 19 -pix_fmt yuv420p -af "loudnorm=I=-14:TP=-1.5:LRA=11" -c:a aac -b:a 192k -ar 44100 -shortest -movflags +faststart "$3"
ffprobe -v error -show_entries format=duration -of default=nw=1 "$3"
