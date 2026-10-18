# Línea de tiempo v2: ritmo según la voz del usuario, pausas para respirar, subtítulos discretos y lupas en vez de zoom.
import json, re, sys
ARGS = json.loads(sys.argv[1]) if len(sys.argv) > 1 else {}
D = "/tmp/claude-0/-home-user-App-mascota/e9ff2a75-450f-526e-bf81-94e9a0483a02/scratchpad/reel2"
segs = {s["i"]: s for s in json.load(open(f"{D}/uservo/segments.json")) if not s.get("skip") and (not ARGS.get("lines") or s["i"] in ARGS["lines"])}
LEAD = ARGS.get("lead", .25); BREATHE = ARGS.get("breathe", .75)
EXTRA = ARGS.get("extra") and {int(k): v for k, v in ARGS["extra"].items()} or {1: .1, 9: 1.3, 12: .4, 13: 1.1}
sh = lambda n: f"shots/{n}.png"
def scene(i, d, v):
    P = {"scale": .78, "phoneTop": 640, "noEnterZoom": True}
    if i == 1: return {"type": "hook", "stampAt": 1.2}
    if i == 2: return {"type": "street"}
    if i == 3: return {"type": "flood"}
    if i == 4: return {"type": "scam", "cutAt": round(LEAD + v * .55, 2)}
    if i == 5:
        sw = round(LEAD + v * .55, 2)
        return {"type": "phone", "bg": "bg-c", **P, "imgs": [{"src": sh("c-publicar-telefono"), "at": 0}, {"src": sh("c-ficha-perdido"), "at": sw}],
                "mags": [{"at": .7, "until": sw, "x": 20, "y": 1300, "w": 740, "h": 120, "scale": 1.18, "top": 1080},
                         {"at": sw + .45, "x": 20, "y": 1430, "w": 740, "h": 150, "scale": 1.18, "top": 1080}],
                "boxes": [{"at": .5, "x": 20, "y": 1310, "w": 740, "h": 100, "until": sw}],
                "circles": [{"at": sw + .3, "x": 390, "y": 1525, "rx": 380, "ry": 70}]}
    if i == 6:
        return {"type": "morning", "cutAt": round(LEAD + v * .5, 2),
                "phone": {"type": "phone", "bg": "bg-c", **P, "img": sh("c-publicar-encontrado"),
                          "boxes": [{"at": .3, "x": 50, "y": 1165, "w": 390, "h": 100}],
                          "mags": [{"at": .6, "x": 20, "y": 1085, "w": 740, "h": 250, "scale": 1.12, "top": 1060}]}}
    if i == 7:
        return {"type": "alert", "cutAt": round(LEAD + v * .58, 2),
                "phone": {"type": "phone", "bg": "bg-c", **P, "img": sh("c-ficha-encontrado"),
                          "circles": [{"at": .3, "x": 390, "y": 1369, "rx": 380, "ry": 70}],
                          "mags": [{"at": .55, "x": 20, "y": 1265, "w": 740, "h": 150, "scale": 1.15, "top": 1080}]}}
    if i == 8:
        sw = round(LEAD + v * .62, 2)
        return {"type": "phone", "bg": "bg-c", **P, "imgs": [{"src": sh("c-chat-advertencia"), "at": 0}, {"src": sh("c-chat-final"), "at": sw}],
                "mags": [{"at": .6, "until": sw, "x": 10, "y": 1180, "w": 760, "h": 210, "scale": 1.12, "top": 1060},
                         {"at": sw + .35, "x": 20, "y": 450, "w": 740, "h": 330, "scale": 1.12, "top": 1000}],
                "boxes": [{"at": .45, "x": 15, "y": 1185, "w": 750, "h": 200, "until": sw}]}
    if i == 9: return {"type": "reunion"}
    if i == 10:
        return {"type": "species", "bg": "bg-c", **P, "bunAt": round(d - 1.0, 2),
                "imgs": [{"src": sh("c-esp-gatos"), "at": 0}, {"src": sh("c-esp-conejos"), "at": round(LEAD + v * .55, 2)}, {"src": sh("c-esp-caballos"), "at": round(LEAD + v * .8, 2)}]}
    if i == 11:
        a, b = round(LEAD + v * .32, 2), round(LEAD + v * .64, 2)
        return {"type": "timeline", "bg": "bg-c", **P, "tlAt": b,
                "imgs": [{"src": sh("postular-lleno"), "at": 0}, {"src": sh("acta"), "at": a}, {"src": sh("c-seguimiento"), "at": b}],
                "mags": [{"at": .4, "until": a, "x": 20, "y": 830, "w": 740, "h": 300, "scale": 1.1, "top": 1000},
                         {"at": a + .3, "until": b, "x": 20, "y": 860, "w": 740, "h": 160, "scale": 1.15, "top": 1080}]}
    if i == 12:
        return {"type": "logo", "bg": "bg-o", "name": "AyudaPatitas", "tag": "Adopción responsable en todo Chile",
                "chips": ["✅ Gratis", "🔒 Seguro", "📲 Sin descargar nada"], "chipsAt": 1.2, "url": "ayudapatitas.cl", "urlAt": .7}
    if i == 13: return {"type": "ending"}
PHONEY = {"phone", "species", "timeline"}
scenes, captions, vo_at = [], [], []
t = 0.0
for i in (ARGS.get("lines") or sorted(segs)):
    v = segs[i]["dur"]; lead = .1 if i == 1 else LEAD
    d = round(lead + v + BREATHE + EXTRA.get(i, 0), 3)
    s = scene(i, d, v); s["dur"] = d
    if s["type"] == "ending": pass
    scenes.append(s); vo_at.append({"file": segs[i]["file"], "at": round(t + lead, 3)})
    words = segs[i]["text"].split(); chunks, cur = [], []
    for w in words:
        cur.append(w)
        if len(cur) >= 5 or (len(cur) >= 2 and re.search(r"[.,:!?…]$", w)): chunks.append(cur); cur = []
    if cur:
        if chunks and len(cur) < 2: chunks[-1] += cur
        else: chunks.append(cur)
    tot = sum(len(" ".join(c)) for c in chunks); a = t + lead
    for c in chunks:
        L = len(" ".join(c)) / tot * v
        pos = "top" if s["type"] in PHONEY else "low"
        if s["type"] in ("morning", "alert"): pos = "top"
        if s["type"] == "logo": pos = "hide"
        captions.append({"start": round(a, 3), "end": round(a + L + (.25 if c is chunks[-1] else 0), 3), "text": " ".join(c), "pos": pos, "hide": pos == "hide"}); a += L
    t += d
total = round(t, 3)
TL = {"duration": total, "scenes": scenes, "captions": captions, "hookTitle": ARGS.get("hookTitle")}
open(f"{D}/timeline.js", "w").write("window.TIMELINE=" + json.dumps(TL, ensure_ascii=False) + ";\n" + open(f"{D}/extra.js").read())
json.dump({"total": total, "vo": vo_at, "starts": [round(sum(x["dur"] for x in scenes[:k]), 3) for k in range(len(scenes))], "types": [x["type"] for x in scenes]}, open(f"{D}/" + ARGS.get("timing", "timing2.json"), "w"))
print(total, len(scenes))
