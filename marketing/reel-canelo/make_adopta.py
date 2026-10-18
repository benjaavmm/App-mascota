# Corto 3 "Adopta": corta la voz en 4 frases y arma la línea de tiempo.
import json, numpy as np, soundfile as sf
D = "/tmp/claude-0/-home-user-App-mascota/e9ff2a75-450f-526e-bf81-94e9a0483a02/scratchpad/reel2"
a, sr = sf.read(f"{D}/vo3/clean.wav")
w = int(sr*.01); e = np.convolve(np.array([np.sqrt(np.mean(a[i*w:(i+1)*w]**2)) for i in range(len(a)//w)]), np.ones(5)/5, mode="same")
dip = lambda lo, hi: (int(lo*100) + int(np.argmin(e[int(lo*100):int(hi*100)]))) / 100
cuts = [2.1, dip(4.45, 4.97), dip(8.02, 8.37), dip(9.6, 11.0), 12.6]
TEXT = ["¿Quieres adoptar y no sabes dónde?", "Perros, gatos, conejos y otras especies,", "gratis y con seguimiento.", "Entra a ayudapatitas.cl"]
clips = []
for k in range(4):
    c = a[int(cuts[k]*sr):int(cuts[k+1]*sr)]
    ce = np.array([np.sqrt(np.mean(c[i:i+w]**2)) for i in range(0, len(c)-w, w)]); idx = np.where(ce > ce.max()*.06)[0]
    c = c[max(0, idx[0]-6)*w:min(len(c), (idx[-1]+12)*w)]
    f = f"{D}/vo3/a{k+1}.wav"; sf.write(f, c, sr); clips.append((f, len(c)/sr))
sh = lambda n: f"shots/{n}.png"
LEAD, BR = .1, .28
P = {"scale": .78, "phoneTop": 640}
d = [round(LEAD + clips[k][1] + BR + x, 3) for k, x in enumerate([0, .2, .3, .9])]
v = [c[1] for c in clips]
scenes = [
  {"type": "kinetic", "bg": "bg-o", "emoji": "🐶🐱🐰", "emojiSize": 170, "lines": [{"text": "¿Quieres adoptar", "size": 118}, {"text": "y no sabes dónde?", "size": 118}], "lineStarts": [.05, .45], "dur": d[0]},
  {"type": "species", "bg": "bg-c", **P, "bunAt": round(d[1] - .9, 2), "dur": d[1],
   "imgs": [{"src": sh("c-esp-gatos"), "at": 0}, {"src": sh("c-esp-conejos"), "at": round(LEAD + v[1]*.4, 2)}, {"src": sh("c-esp-caballos"), "at": round(LEAD + v[1]*.75, 2)}]},
  {"type": "timeline", "bg": "bg-c", **P, "tlAt": .35, "dur": d[2], "imgs": [{"src": sh("c-seguimiento"), "at": 0}],
   "callouts": [{"at": .15, "x": 120, "y": 470, "text": "Gratis", "icon": "✅", "rot": -4}]},
  {"type": "logo", "bg": "bg-o", "name": "AyudaPatitas", "tag": "Adopción responsable en todo Chile", "chips": ["✅ Gratis", "🐾 Todas las especies", "📲 Sin descargar nada"], "chipsAt": .9, "url": "ayudapatitas.cl", "urlAt": .35, "dur": d[3]},
]
caps, t = [], 0.0
pos = ["hide", "top", "top", "hide"]
for k, s in enumerate(scenes):
    words = TEXT[k].split(); half = (len(words) + 1) // 2
    chunks = [words] if len(words) <= 5 else [words[:half], words[half:]]
    a0 = t + LEAD; tot = sum(len(" ".join(c)) for c in chunks)
    for c in chunks:
        L = len(" ".join(c)) / tot * v[k]
        caps.append({"start": round(a0, 3), "end": round(a0 + L + .2, 3), "text": " ".join(c), "pos": pos[k], "hide": pos[k] == "hide"}); a0 += L
    t += s["dur"]
total = round(t, 3)
open(f"{D}/timeline.js", "w").write("window.TIMELINE=" + json.dumps({"duration": total, "scenes": scenes, "captions": caps}, ensure_ascii=False) + ";\n" + open(f"{D}/extra.js").read())
starts = [round(sum(x["dur"] for x in scenes[:k]), 3) for k in range(len(scenes))]
json.dump({"total": total, "starts": starts, "types": [s["type"] for s in scenes], "vo": [{"file": clips[k][0], "at": round(starts[k] + LEAD, 3)} for k in range(4)]}, open(f"{D}/timing_adopta.json", "w"))
print(total, [round(x, 2) for x in cuts], [round(x, 2) for x in v])
