# Semana 1: guiones de los 4 reels (solo texto + música). Uso: python3 reels.py <nombre>
import json, sys
D = "/tmp/claude-0/-home-user-App-mascota/e9ff2a75-450f-526e-bf81-94e9a0483a02/scratchpad/semana1"
sh = lambda n: f"shots/{n}.png"
P = {"scale": .95, "phoneTop": 470, "titleTop": 270, "titleSize": 70}
# Línea resaltada completa (no palabra por palabra).
HL = lambda text, cls="hl-w": "<span class='" + cls + "'>" + " ".join(f"<span class='word'>{w}</span>" for w in text.split()) + "</span>"
END = lambda chips: {"type": "logo", "bg": "bg-o", "name": "AyudaPatitas", "tag": "Adopción responsable en Chile", "chips": chips, "chipsAt": .9, "url": "ayudapatitas.cl", "urlAt": 1.5, "dur": 3.4}

REELS = {
  "encontraste": [
    {"type": "kinetic", "bg": "bg-o", "emoji": "🐕", "emojiSize": 230, "lines": [{"text": "¿Encontraste un perrito", "size": 104}, {"html": HL("en la calle?"), "size": 104}], "lineStarts": [.05, .5], "sub": "Haz esto 👇", "subAt": 1.1, "dur": 2.7},
    {"type": "step", "n": 1, "emoji": "🏷️", "title": ["Revisa si tiene", "placa o collar"], "sub": "Muchas veces trae el teléfono de su familia.", "dur": 3.3},
    {"type": "step", "n": 2, "bg": "bg-t", "emoji": "🔎", "title": ["Pide que lean", "su microchip"], "sub": "En una veterinaria o en tu municipalidad.", "dur": 3.3},
    {"type": "phone", "bg": "bg-c", **P, "title": "PASO 3 · Publícalo gratis en AyudaPatitas", "img": sh("c-publicar-encontrado"),
     "circles": [{"at": .7, "x": 250, "y": 1195, "rx": 215, "ry": 62}],
     "callouts": [{"at": 1.3, "x": 70, "y": 1560, "text": "Encontré una mascota", "icon": "📍", "rot": -3}], "dur": 3.6},
    {"type": "step", "n": 4, "emoji": "📸", "title": ["Antes de entregarlo,", "pide pruebas"], "titleSize": 90, "sub": "Fotos antiguas, su carnet de vacunas o que responda a su nombre.", "dur": 3.8},
    {"type": "kinetic", "bg": "bg-o", "emoji": "📌", "emojiSize": 200, "lines": [{"text": "Guárdalo:", "size": 110}, {"text": "puede servirte mañana", "size": 92}], "lineStarts": [.05, .4], "sub": "Y compártelo con tu comuna 🧡", "subAt": 1.1, "dur": 2.8},
    END(["✅ Gratis", "🐾 Perdidos y encontrados"]),
  ],
  "estafas": [
    {"type": "kinetic", "bg": "bg-d", "emoji": "🚩", "emojiSize": 220, "lines": [{"text": "Perdiste a tu mascota", "size": 96}, {"text": "y te escribe", "size": 96}, {"html": HL("un desconocido…", "hl"), "size": 96}], "lineStarts": [.05, .5, .8], "sub": "Ojo con estas 3 señales 👇", "subAt": 1.4, "dur": 3.2},
    {"type": "flag", "n": 1, "msg": "Hola, tengo a tu perrito 🐶 Deposítame $50.000 y te lo llevo hoy mismo.", "why": "Te pide plata ANTES de que veas a tu mascota", "typeEnd": .8, "whyAt": 1.8, "dur": 4.2},
    {"type": "flag", "n": 2, "msg": "Te llegó un código por SMS. Mándamelo para confirmar que eres el dueño.", "why": "Te pide un código", "whySub": "Así roban cuentas de WhatsApp. Nunca lo compartas.", "typeEnd": .8, "whyAt": 1.8, "dur": 4.4},
    {"type": "flag", "n": 3, "msg": "No puedo mandar más fotos ni hacer videollamada. Apúrate o se lo doy a otra persona.", "why": "No te deja verlo y te apura", "typeEnd": .8, "whyAt": 1.9, "dur": 4.2},
    {"type": "phone", "bg": "bg-c", **P, "title": "En AyudaPatitas el chat te advierte 🛡️", "img": sh("c-chat-advertencia"),
     "boxes": [{"at": .7, "x": 18, "y": 1168, "w": 744, "h": 236}],
     "mags": [{"at": 1.3, "x": 18, "y": 1168, "w": 744, "h": 236, "scale": 1.25, "top": 1250}], "dur": 4.0},
    {"type": "kinetic", "bg": "bg-o", "emoji": "🙅", "emojiSize": 210, "lines": [{"text": "Nunca pagues", "size": 116}, {"html": HL("antes de verlo"), "size": 116}], "lineStarts": [.05, .45], "sub": "Comparte esto con quien perdió a su mascota", "subAt": 1.1, "dur": 3.0},
    END(["✅ Gratis", "🛡️ Chat seguro"]),
  ],
  "especies": [
    {"type": "kinetic", "bg": "bg-t", "emoji": "🐰", "emojiSize": 240, "lines": [{"text": "¿Sabías que también", "size": 100}, {"text": "puedes adoptar…", "size": 100}], "lineStarts": [.05, .5], "sub": "…mucho más que perros y gatos? 👀", "subAt": 1.2, "dur": 3.0},
    {"type": "grid", "bg": "bg-c", "title": ["Todas las especies", "domésticas 🧡"], "titleSize": 88,
     "items": [["🐶", "Perros"], ["🐱", "Gatos"], ["🐰", "Conejos"], ["🐹", "Hámsters"], ["🐦", "Aves"], ["🐴", "Caballos"], ["🐔", "Gallinas"], ["🐐", "Cabras"], ["🐷", "Cerditos"]],
     "itemsAt": .5, "stagger": .18, "dur": 4.4},
    {"type": "phone", "bg": "bg-c", **P, "title": "Conejos rescatados 🐰", "img": sh("c-esp-conejos"), "dur": 2.8},
    {"type": "phone", "bg": "bg-c", **P, "title": "¡Y hasta caballos! 🐴", "img": sh("c-esp-caballos"), "noEnter": True, "dur": 2.8},
    {"type": "step", "label": "IMPORTANTE", "bg": "bg-d", "emoji": "🦊🚫", "emojiSize": 220, "title": ["La fauna silvestre", "no se adopta"], "titleSize": 92, "sub": "Se protege. En AyudaPatitas solo hay animales domésticos.", "dur": 3.6},
    END(["✅ Gratis", "🐾 Todas las especies"]),
  ],
  "funciona": [
    {"type": "kinetic", "bg": "bg-o", "emoji": "📲", "emojiSize": 220, "lines": [{"text": "Así funciona", "size": 118}, {"html": HL("AyudaPatitas"), "size": 118}], "lineStarts": [.05, .45], "sub": "en 20 segundos ⏱️", "subAt": 1.0, "dur": 2.5},
    {"type": "phone", "bg": "bg-c", **P, "title": "1 · Busca por especie y comuna", "img": sh("listado"), "dur": 3.0},
    {"type": "phone", "bg": "bg-c", **P, "title": "2 · Conoce su historia", "img": sh("ficha-luna"), "noEnter": True, "scroll": [{"at": 0, "y": 0}, {"at": 1.0, "y": 380, "dur": 1.2}], "dur": 3.0},
    {"type": "phone", "bg": "bg-c", **P, "title": "3 · Postula con un cuestionario", "img": sh("postular-lleno"), "noEnter": True, "dur": 3.0},
    {"type": "phone", "bg": "bg-c", **P, "title": "4 · Conversa por un chat seguro", "img": sh("chat-amable"), "noEnter": True, "dur": 3.0},
    {"type": "phone", "bg": "bg-c", **P, "title": "5 · Seguimiento después de adoptar", "img": sh("c-seguimiento"), "noEnter": True, "dur": 3.0},
    END(["✅ Gratis", "📲 Sin descargar nada"]),
  ],
}

name = sys.argv[1]
scenes = REELS[name]
total = round(sum(s["dur"] for s in scenes), 3)
open(f"{D}/timeline.js", "w").write("window.TIMELINE=" + json.dumps({"duration": total, "scenes": scenes, "captions": []}, ensure_ascii=False) + ";\n" + open(f"{D}/extra-week.js").read())
starts = [round(sum(x["dur"] for x in scenes[:k]), 3) for k in range(len(scenes))]
json.dump({"total": total, "starts": starts, "scenes": scenes}, open(f"{D}/timing_{name}.json", "w"), ensure_ascii=False)
print(name, total)
