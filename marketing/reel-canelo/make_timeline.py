import json, re
D = "/tmp/claude-0/-home-user-App-mascota/e9ff2a75-450f-526e-bf81-94e9a0483a02/scratchpad/reel2"
vo = json.load(open(f"{D}/vo/vo.json"))
dur = {v["i"]: v["dur"] for v in vo}
PAD = 0.22
S = lambda i, extra=0.0: round(dur[i] + PAD + extra, 3)
d = {i: S(i) for i in dur}
d[1] = S(1, .15); d[9] = S(9, .9); d[13] = S(13, .7); d[12] = S(12, .2)
sh = lambda n: f"shots/{n}.png"
scenes = [
  {"type": "hook", "dur": d[1], "stampAt": 1.05},
  {"type": "street", "dur": d[2]},
  {"type": "flood", "dur": d[3]},
  {"type": "scam", "dur": d[4], "cutAt": round(dur[4] * 0.56, 2)},
  {"type": "phone", "dur": d[5], "bg": "bg-c",
   "imgs": [{"src": sh("c-publicar-telefono"), "at": 0}, {"src": sh("c-ficha-perdido"), "at": round(d[5] * .55, 2)}],
   "zooms": [{"at": .35, "fx": 390, "fy": 1360, "scale": 1.45, "ty": 1050, "outAt": round(d[5] * .55 - .3, 2)},
             {"at": round(d[5] * .55 + .15, 2), "fx": 390, "fy": 1525, "scale": 1.3, "ty": 1150}],
   "boxes": [{"at": .5, "x": 20, "y": 1310, "w": 740, "h": 100, "until": round(d[5] * .55, 2)}],
   "circles": [{"at": round(d[5] * .55 + .45, 2), "x": 390, "y": 1525, "rx": 380, "ry": 70}]},
  {"type": "morning", "dur": d[6], "cutAt": round(d[6] * .5, 2),
   "phone": {"type": "phone", "bg": "bg-c", "img": sh("c-publicar-encontrado"),
             "boxes": [{"at": .3, "x": 50, "y": 1165, "w": 390, "h": 100}],
             "zooms": [{"at": .2, "fx": 390, "fy": 1210, "scale": 1.3, "ty": 1050}]}},
  {"type": "alert", "dur": d[7], "cutAt": round(d[7] * .58, 2),
   "phone": {"type": "phone", "bg": "bg-c", "img": sh("c-ficha-encontrado"),
             "circles": [{"at": .25, "x": 390, "y": 1369, "rx": 380, "ry": 70}],
             "zooms": [{"at": .1, "fx": 390, "fy": 1100, "scale": 1.2, "ty": 1000}]}},
  {"type": "phone", "dur": d[8], "bg": "bg-c",
   "imgs": [{"src": sh("c-chat-advertencia"), "at": 0}, {"src": sh("c-chat-final"), "at": round(d[8] * .62, 2)}],
   "zooms": [{"at": .25, "fx": 390, "fy": 1290, "scale": 1.5, "ty": 1050, "outAt": round(d[8] * .62 - .3, 2)},
             {"at": round(d[8] * .62 + .1, 2), "fx": 390, "fy": 690, "scale": 1.4, "ty": 1050}],
   "boxes": [{"at": .55, "x": 15, "y": 1185, "w": 750, "h": 200, "until": round(d[8] * .62, 2)},
             {"at": round(d[8] * .62 + .45, 2), "x": 50, "y": 640, "w": 690, "h": 115}]},
  {"type": "reunion", "dur": d[9]},
  {"type": "species", "dur": d[10], "bg": "bg-c", "bunAt": round(d[10] - .75, 2),
   "imgs": [{"src": sh("c-esp-gatos"), "at": 0}, {"src": sh("c-esp-conejos"), "at": round(dur[10] * .55, 2)}, {"src": sh("c-esp-caballos"), "at": round(dur[10] * .78, 2)}],
   "zooms": [{"at": .1, "fx": 390, "fy": 700, "scale": 1.12, "ty": 1050}]},
  {"type": "timeline", "dur": d[11], "bg": "bg-c", "tlAt": round(d[11] * .62, 2),
   "imgs": [{"src": sh("postular-lleno"), "at": 0}, {"src": sh("acta"), "at": round(d[11] * .3, 2)}, {"src": sh("c-seguimiento"), "at": round(d[11] * .62, 2)}],
   "zooms": [{"at": .05, "fx": 390, "fy": 1050, "scale": 1.15, "ty": 1050, "outAt": round(d[11] * .3 - .2, 2)},
             {"at": round(d[11] * .3, 2), "fx": 390, "fy": 950, "scale": 1.35, "ty": 1050, "outAt": round(d[11] * .62 - .2, 2)}]},
  {"type": "logo", "dur": d[12], "bg": "bg-o", "name": "AyudaPatitas", "tag": "Adopción responsable en todo Chile",
   "chips": ["✅ Gratis", "🔒 Seguro", "📲 Sin descargar nada"], "chipsAt": 1.0, "url": "ayudapatitas.cl", "urlAt": .55},
  {"type": "ending", "dur": d[13]},
]
for s in scenes:
    if s["type"] == "ending": pass
captions = []
t = 0.0
PHONEY = {"phone", "species", "timeline"}
for i, s in enumerate(scenes, start=1):
    text = vo[i - 1]["text"].replace("...", "…").replace("Ayuda Patitas", "AyudaPatitas").replace("ayuda patitas, punto ce ele", "ayudapatitas.cl")
    # trozos de 3-6 palabras, cortando en puntuación cuando se puede
    words = text.split()
    chunks, cur = [], []
    for w in words:
        cur.append(w)
        if len(cur) >= 6 or (len(cur) >= 3 and re.search(r"[.,:!?…]$", w)):
            chunks.append(cur); cur = []
    if cur:
        if chunks and len(cur) < 2: chunks[-1] += cur
        else: chunks.append(cur)
    total = sum(len(" ".join(c)) for c in chunks); a = t + 0.02; span = dur[i]
    pos = "top" if (s["type"] in PHONEY or (s["type"] in ("morning", "alert") and False)) else "low"
    for c in chunks:
        L = len(" ".join(c)) / total * span
        cap = {"start": round(a, 3), "end": round(a + L, 3), "text": " ".join(c), "pos": pos}
        if s["type"] in ("morning",) and a - t >= s["cutAt"]: cap["pos"] = "top"
        if s["type"] in ("alert",) and a - t >= s["cutAt"]: cap["pos"] = "top"
        captions.append(cap); a += L
    t += s["dur"]
# los subtítulos de la escena final van arriba (el celular está al centro)
total = round(sum(s["dur"] for s in scenes), 3)
starts = []; acc = 0
for s in scenes: starts.append(round(acc, 3)); acc += s["dur"]
TL = {"duration": total, "scenes": scenes, "captions": captions, "voStarts": starts}
open(f"{D}/timeline.js", "w").write("window.TIMELINE=" + json.dumps(TL, ensure_ascii=False) + ";\n" + open(f"{D}/extra.js").read())
json.dump({"starts": starts, "total": total}, open(f"{D}/timing.json", "w"))
print(total, starts)
