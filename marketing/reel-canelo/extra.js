// Escenas ilustradas de la historia de Canelo (CSS + emoji). Todo depende del tiempo t.
window.EXTRA_SCENES = function (BASE) {
  const night = 'linear-gradient(180deg,#0b1026 0%,#1e1b4b 55%,#312e81 100%)';
  const gold = 'linear-gradient(180deg,#fde68a 0%,#fdba74 55%,#fb923c 100%)';
  const morning = 'linear-gradient(180deg,#e0f2fe 0%,#fef3c7 60%,#fde68a 100%)';
  const label = (txt) => `<div style="position:absolute;top:240px;left:60px;background:rgba(0,0,0,.45);color:#fff;font-weight:800;font-size:28px;padding:10px 22px;border-radius:999px;z-index:20">${txt}</div>`;
  const dog = (id, size, extra = '') => `<div id="${id}" style="position:absolute;font-size:${size}px;line-height:1;filter:drop-shadow(0 18px 18px rgba(0,0,0,.35));${extra}">🐕</div>`;

  // Celular sobre la mesa de la cocina con pantalla de bloqueo (inicio y final del loop)
  function table(day) {
    return `<div style="position:absolute;inset:0;background:${day ? 'repeating-linear-gradient(90deg,#d6a46c 0 120px,#cf9a60 120px 240px)' : 'repeating-linear-gradient(90deg,#5b3b22 0 120px,#553620 120px 240px)'}"></div>
    <div style="position:absolute;inset:0;background:radial-gradient(circle at 50% 45%,${day ? 'rgba(255,240,200,.35)' : 'rgba(255,190,120,.18)'} 0,rgba(0,0,0,${day ? '.05' : '.55'}) 75%)"></div>
    <div id="lphone" style="position:absolute;left:250px;top:330px;width:580px;height:1180px;border-radius:80px;background:#0c0a09;padding:18px;box-shadow:0 50px 90px rgba(0,0,0,.55);transform:rotate(-5deg)">
      <div style="position:relative;width:100%;height:100%;border-radius:64px;overflow:hidden;background:url(${day ? 'shots/canelo-2.jpg' : 'shots/canelo-1.jpg'}) center/cover">
        <div style="position:absolute;inset:0;background:linear-gradient(180deg,rgba(0,0,0,${day ? '.15' : '.55'}),rgba(0,0,0,.1) 40%,rgba(0,0,0,${day ? '.2' : '.5'}))"></div>
        <div style="position:absolute;top:120px;left:0;right:0;text-align:center;color:#fff"><div style="font-size:150px;font-weight:300;letter-spacing:-4px;line-height:1">${day ? '10:12' : '23:47'}</div><div style="font-size:34px;font-weight:700;opacity:.9">${day ? 'domingo 26 de octubre' : 'sábado 25 de octubre'}</div></div>
      </div></div>`;
  }
  function notifCard(id, title, body, app = 'Mensajes') {
    return `<div id="${id}" class="notif" style="left:200px;right:110px;top:640px;padding:26px 30px;gap:22px;border-radius:40px"><div style="width:96px;height:96px;border-radius:24px;background:${app === 'Mensajes' ? '#22c55e' : '#ea580c'};display:flex;align-items:center;justify-content:center;font-size:56px;flex-shrink:0">${app === 'Mensajes' ? '💬' : '<img src="icon-512.png" style="width:96px;height:96px;border-radius:24px">'}</div><div style="flex:1"><div class="app">${app} · ahora</div><div class="t" style="font-size:36px">${title}</div><div class="b" style="font-size:31px">${body}</div></div></div>`;
  }
  const stamp = (id, top, txt = 'ESTAFA') => `<div id="${id}" class="stamp" style="left:50%;top:${top}px;z-index:30">${txt}</div>`;
  function animStamp(root, id, t, at) { const st = root.querySelector('#' + id); if (!st) return; const p = prog(t, at, .22); st.style.opacity = p > 0 ? 1 : 0; st.style.transform = `translateX(-50%) rotate(-12deg) scale(${lerp(2.4, 1, easeOut(p))})`; }
  function shake(root, t, at, amp = 16) { const a = Math.max(0, 1 - (t - at) / .35) * (t >= at ? amp : 0); root.style.transform = `translate(${Math.sin(t * 95) * a}px,${Math.cos(t * 80) * a}px)`; }

  return {
    hook(s, t, root) {
      if (!root.dataset.init) {
        root.className = 'layer';
        root.innerHTML = table(false) + notifCard('n1', 'Número desconocido', 'Tengo a su perro. Deposíteme la recompensa primero y se lo llevo.') + stamp('st', 700) + label('Recreación · historia ilustrada');
        root.dataset.init = 1;
      }
      const n = root.querySelector('#n1'); const p = prog(t, 0, .3);
      n.style.opacity = clamp(p * 3); n.style.transform = `translateY(${(1 - back(p)) * -160}px)`;
      root.querySelector('#lphone').style.transform = `rotate(-5deg) translateX(${t < .45 ? Math.sin(t * 120) * 7 : 0}px)`;
      animStamp(root, 'st', t, s.stampAt ?? 1.1); shake(root, t, s.stampAt ?? 1.1);
      if (!root.style.transform || root.style.transform === 'translate(0px, 0px)') root.style.transform = `scale(${1 + t * .02})`;
    },
    street(s, t, root) {
      if (!root.dataset.init) {
        root.className = 'layer';
        root.innerHTML = `<div style="position:absolute;inset:0;background:${night}"></div>
          <div style="position:absolute;top:340px;right:150px;width:130px;height:130px;border-radius:50%;background:#fef9c3;box-shadow:0 0 80px #fde68a"></div>
          ${Array.from({ length: 18 }, (_, i) => `<div style="position:absolute;left:${(i * 137) % 1040}px;top:${300 + (i * 89) % 420}px;width:6px;height:6px;border-radius:50%;background:#fff;opacity:.7"></div>`).join('')}
          <div style="position:absolute;left:0;right:0;bottom:0;height:900px;background:#1f2937"></div>
          <div style="position:absolute;left:0;right:0;top:1020px;height:16px;background:#374151"></div>
          <div style="position:absolute;left:40px;top:700px;width:420px;height:330px;background:#334155;border-radius:10px"><div style="position:absolute;left:40px;top:-110px;width:0;height:0;border-left:170px solid transparent;border-right:170px solid transparent;border-bottom:110px solid #475569"></div><div style="position:absolute;left:150px;top:150px;width:110px;height:180px;background:#fbbf24;opacity:.85"></div></div>
          <div id="gate" style="position:absolute;left:470px;top:820px;width:200px;height:210px;transform-origin:0 50%;background:repeating-linear-gradient(90deg,#9ca3af 0 10px,transparent 10px 36px);border-top:10px solid #9ca3af;border-bottom:10px solid #9ca3af"></div>
          <div style="position:absolute;left:860px;top:560px;width:18px;height:480px;background:#4b5563"></div>
          <div style="position:absolute;left:800px;top:540px;width:140px;height:40px;border-radius:20px;background:#6b7280"></div>
          <div id="cone" style="position:absolute;left:690px;top:570px;width:0;height:0;border-left:180px solid transparent;border-right:180px solid transparent;border-bottom:520px solid rgba(253,230,138,.22)"></div>
          ${dog('d', 230)}
          <div id="pins" style="position:absolute;width:300px;height:120px;font-size:70px">${['📍', '📍', '📍'].map(p => `<span class="pin" style="position:absolute">${p}</span>`).join('')}</div>
          <div id="tag" class="chip" style="position:absolute;top:420px;left:50%;font-size:46px">🐕 Canelo · quiltro · Maipú</div>
          <div id="vhs" style="position:absolute;inset:0;background:repeating-linear-gradient(0deg,rgba(255,255,255,.08) 0 3px,transparent 3px 7px);mix-blend-mode:screen;z-index:40"><div style="position:absolute;top:300px;left:60px;color:#fff;font-size:60px;font-weight:900;text-shadow:3px 0 #f0f,-3px 0 #0ff">◀◀ ANOCHE</div></div>`;
        root.dataset.init = 1;
      }
      const vhs = root.querySelector('#vhs'); vhs.style.opacity = t < .45 ? 1 : 0;
      root.style.filter = t < .45 ? `hue-rotate(${Math.sin(t * 40) * 30}deg) contrast(1.3)` : 'none';
      const g = root.querySelector('#gate'); g.style.transform = `perspective(600px) rotateY(${-55 * easeOut(prog(t, .3, .4))}deg)`;
      const run = easeInOut(prog(t, .45, 1.0)); const x = lerp(470, 660, run), bounce = Math.abs(Math.sin(t * 16)) * 30 * (run < 1 ? 1 : 0);
      const d = root.querySelector('#d'); const look = t > 1.55 ? (Math.floor((t - 1.55) / .35) % 2 ? -1 : 1) : -1;
      d.style.left = x + 'px'; d.style.top = (800 - bounce) + 'px'; d.style.transform = `scaleX(${look})`;
      const pins = root.querySelector('#pins'); pins.style.left = (x - 20) + 'px'; pins.style.top = '700px'; pins.style.opacity = t > 1.5 ? 1 : 0;
      pins.querySelectorAll('.pin').forEach((p, i) => { const a = t * 5 + i * 2.1; p.style.left = (110 + Math.cos(a) * 110) + 'px'; p.style.top = (30 + Math.sin(a) * 26) + 'px'; });
      const tag = root.querySelector('#tag'); const tp = prog(t, .7, .35); tag.style.opacity = clamp(tp * 2); tag.style.transform = `translateX(-50%) scale(${back(tp)})`;
    },
    flood(s, t, root) {
      const msgs = ['¿Alguien tiene gásfiter? 🔧', 'Vendo coche de guagua, impecable', '😂😂😂', 'Se perdió otro perrito en la villa 😢', '¿Hay feria mañana?', 'Ojo con los portones abiertos', 'Buenas noches vecinos 🌙', 'Info al interno 👀', 'Hoy cortan el agua', '¿Quién ganó el partido?'];
      if (!root.dataset.init) {
        root.className = 'layer';
        root.innerHTML = `<div style="position:absolute;inset:0;background:#e5ddd5"></div>
          <div id="col" style="position:absolute;left:0;right:0;top:0">
            <div class="bubble in" style="position:relative;margin:520px 0 0 70px;width:760px;padding:22px"><div style="font-size:30px;color:#0f766e;font-weight:800">Familia Soto</div><div style="margin-top:12px;border-radius:24px;overflow:hidden;background:#fff7ed;border:4px solid #ea580c"><div style="background:#ea580c;color:#fff;font-weight:900;font-size:58px;text-align:center;padding:14px">SE BUSCA</div><div style="display:flex;align-items:center;gap:20px;padding:20px"><div style="font-size:140px">🐕</div><div style="font-size:40px;font-weight:900">CANELO<div style="font-size:30px;font-weight:700;color:#57534e">Maipú · collar rojo</div></div></div><div style="padding:0 20px 20px;font-size:36px;font-weight:800">Llamar al <span id="num" style="background:#fde047;padding:2px 8px;border-radius:8px">+56 9 •••• ••••</span></div></div></div>
            ${msgs.map((m, i) => `<div class="bubble in fm" style="position:relative;margin:26px 0 0 70px;display:inline-block;max-width:760px"><div style="font-size:28px;color:${['#7c3aed', '#db2777', '#2563eb', '#059669'][i % 4]};font-weight:800">Vecino ${i + 2}</div>${m}</div>`).join('<br>')}
          </div>
          <div style="position:absolute;top:0;left:0;right:0;height:230px;background:#075e54;color:#fff;display:flex;align-items:flex-end;padding:0 50px 34px;gap:24px;z-index:5"><div style="width:96px;height:96px;border-radius:50%;background:#ccfbf1;display:flex;align-items:center;justify-content:center;font-size:54px">🏘️</div><div style="font-size:46px;font-weight:800">Vecinos Maipú<div style="font-size:30px;font-weight:600;opacity:.85">248 participantes</div></div></div>
          ${label('Recreación')}`;
        root.dataset.init = 1;
      }
      const col = root.querySelector('#col'); const sc = Math.max(0, t - .7) ** 1.6 * 900;
      col.style.transform = `translateY(${-sc}px)`;
      root.querySelectorAll('.fm').forEach((m, i) => { const p = prog(t, .6 + i * .12, .2); m.style.opacity = clamp(p * 2); });
      const n = root.querySelector('#num'); n.style.boxShadow = t > .2 && t < .9 ? `0 0 0 ${6 + Math.sin(t * 20) * 4}px rgba(234,88,12,.6)` : 'none';
    },
    scam(s, t, root) {
      const cut = s.cutAt;
      if (!root.dataset.init) {
        root.className = 'layer';
        root.innerHTML = `<div id="a" style="position:absolute;inset:0;background:radial-gradient(circle at 50% 40%,#3f3f46,#09090b)">
            <div class="bubble in" style="left:90px;top:640px;font-size:48px;max-width:880px;padding:34px 40px"><div style="font-size:30px;color:#dc2626;font-weight:900">Número desconocido</div>Tengo a su perro. Deposíteme la recompensa primero y se lo llevo.</div>
            ${stamp('st', 980)}</div>
          <div id="b" style="position:absolute;inset:0;background:${night}">
            <div style="position:absolute;left:0;right:0;bottom:0;height:820px;background:#1f2937"></div>
            <div style="position:absolute;left:760px;top:520px;width:18px;height:560px;background:#4b5563"></div>
            <div style="position:absolute;left:600px;top:540px;width:0;height:0;border-left:170px solid transparent;border-right:170px solid transparent;border-bottom:540px solid rgba(253,230,138,.22)"></div>
            ${dog('d2', 260, 'left:560px;top:820px')}
            <div id="q" style="position:absolute;left:820px;top:700px;font-size:110px">🤨</div>
            <div id="alone" class="chip" style="position:absolute;left:120px;top:560px;font-size:44px">Spóiler: no me tenía 🙃</div>
            ${label('Recreación')}</div>`;
        root.dataset.init = 1;
      }
      const a = root.querySelector('#a'), b = root.querySelector('#b');
      a.style.display = t < cut ? 'block' : 'none'; b.style.display = t >= cut ? 'block' : 'none';
      const bub = a.querySelector('.bubble'); const p = prog(t, 0, .3); bub.style.transform = `scale(${lerp(.8, 1, back(p))})`; bub.style.opacity = clamp(p * 3);
      animStamp(a, 'st', t, .45); shake(a, t, .45, 12);
      const q = root.querySelector('#q'); const qp = prog(t, cut + .15, .3); q.style.transform = `scale(${back(qp)}) rotate(${Math.sin(t * 8) * 8}deg)`; q.style.opacity = qp > 0 ? 1 : 0;
      const al = root.querySelector('#alone'); const ap = prog(t, cut + .05, .3); al.style.opacity = clamp(ap * 2); al.style.transform = `scale(${back(ap)}) rotate(-3deg)`;
      root.querySelector('#d2').style.transform = `scaleX(-1) translateY(${Math.sin(t * 6) * 6}px)`;
    },
    morning(s, t, root) {
      const cut = s.cutAt;
      if (!root.dataset.init) {
        root.className = 'layer';
        root.innerHTML = `<div id="ill" style="position:absolute;inset:0;background:${morning}">
            <div style="position:absolute;left:200px;top:420px;width:680px;height:900px;background:#fef3c7;border:14px solid #d97706;border-radius:20px 20px 0 0"><div style="position:absolute;left:180px;top:150px;width:320px;height:750px;background:#92400e;border-radius:160px 160px 0 0"></div><div style="position:absolute;right:60px;top:430px;width:30px;height:30px;border-radius:50%;background:#fde68a"></div></div>
            <div style="position:absolute;left:0;right:0;top:1320px;bottom:0;background:#a8a29e"></div>
            <div style="position:absolute;left:250px;top:1290px;width:580px;height:90px;border-radius:24px;background:repeating-linear-gradient(90deg,#b45309 0 30px,#92400e 30px 60px)"></div>
            ${dog('d3', 240, 'left:380px;top:1100px')}
            <div id="zz" style="position:absolute;left:640px;top:1020px;font-size:90px">💤</div>
            <div style="position:absolute;left:220px;top:1250px;font-size:110px">🥣</div>
            <div id="hand" style="position:absolute;font-size:170px">🤚</div>
            <div id="rosa" class="chip" style="position:absolute;left:50%;top:480px;font-size:46px">☀️ Doña Rosa · a la mañana</div>
            ${label('Recreación')}</div>`;
        root.dataset.init = 1;
      }
      const ill = root.querySelector('#ill'); ill.style.display = t < cut ? 'block' : 'none';
      root.querySelector('#zz').style.transform = `translateY(${-Math.abs(Math.sin(t * 3)) * 40}px)`; root.querySelector('#zz').style.opacity = .5 + .5 * Math.abs(Math.sin(t * 3));
      const hp = prog(t, .4, .5); const h = root.querySelector('#hand'); h.style.left = lerp(1100, 470, easeOut(hp)) + 'px'; h.style.top = (980 + Math.sin(t * 14) * (hp >= 1 ? 18 : 0)) + 'px'; h.style.transform = 'rotate(-30deg)';
      const r = root.querySelector('#rosa'); const rp = prog(t, .15, .35); r.style.opacity = clamp(rp * 2); r.style.transform = `translateX(-50%) scale(${back(rp)})`;
      if (t >= cut) BASE.phone(s.phone, t - cut, root.querySelector('#phonelayer') || (() => { const n = document.createElement('div'); n.id = 'phonelayer'; n.className = 'layer'; root.appendChild(n); return n; })());
      const pl = root.querySelector('#phonelayer'); if (pl) pl.style.display = t >= cut ? 'block' : 'none';
    },
    alert(s, t, root) {
      const cut = s.cutAt;
      if (!root.dataset.init) {
        root.className = 'layer';
        root.innerHTML = `<div id="lock">${table(false)}${notifCard('n2', 'Posible coincidencia para Canelo', 'Publicaron una mascota encontrada con características parecidas en tu región.', 'AyudaPatitas')}</div>`;
        root.dataset.init = 1;
      }
      const lock = root.querySelector('#lock'); lock.style.display = t < cut ? 'block' : 'none';
      const n = root.querySelector('#n2'); const p = prog(t, .15, .35); n.style.opacity = clamp(p * 3); n.style.transform = `translateY(${(1 - back(p)) * -180}px) scale(${lerp(1, 1.08, easeInOut(prog(t, .7, .4)))})`;
      lock.style.transform = `scale(${lerp(1, 1.12, easeInOut(prog(t, .6, .6)))})`; lock.style.transformOrigin = '50% 40%';
      if (t >= cut) BASE.phone(s.phone, t - cut, root.querySelector('#pl2') || (() => { const x = document.createElement('div'); x.id = 'pl2'; x.className = 'layer'; root.appendChild(x); return x; })());
      const pl = root.querySelector('#pl2'); if (pl) pl.style.display = t >= cut ? 'block' : 'none';
    },
    reunion(s, t, root) {
      if (!root.dataset.init) {
        root.className = 'layer';
        root.innerHTML = `<div style="position:absolute;inset:0;background:${gold}"></div>
          <div style="position:absolute;top:360px;left:140px;width:200px;height:200px;border-radius:50%;background:#fff7ed;box-shadow:0 0 120px #fff7ed"></div>
          <div style="position:absolute;left:0;right:0;bottom:0;height:820px;background:#d6d3d1"></div>
          <div style="position:absolute;left:40px;top:760px;width:420px;height:340px;background:#fdba74;border-radius:10px"><div style="position:absolute;left:150px;top:150px;width:110px;height:190px;background:#9a3412"></div></div>
          <div id="gate2" style="position:absolute;left:470px;top:880px;width:200px;height:220px;transform-origin:0 50%;background:repeating-linear-gradient(90deg,#78716c 0 10px,transparent 10px 36px);border-top:10px solid #78716c;border-bottom:10px solid #78716c"></div>
          <div id="kid" style="position:absolute;left:560px;top:880px;font-size:260px;line-height:1">🧒</div>
          ${dog('d4', 220)}
          <div id="heart" style="position:absolute;left:600px;top:700px;font-size:130px">🧡</div>
          <div id="conf" style="position:absolute;inset:0;pointer-events:none">${Array.from({ length: 22 }, (_, i) => `<span class="cf" style="position:absolute;font-size:${50 + (i % 4) * 14}px">🐾</span>`).join('')}</div>`;
        root.dataset.init = 1;
      }
      root.querySelector('#gate2').style.transform = `perspective(600px) rotateY(${-60 * easeOut(prog(t, 0, .4))}deg)`;
      const j = easeOut(prog(t, .15, .6)); const d = root.querySelector('#d4');
      d.style.left = lerp(200, 520, j) + 'px'; d.style.top = (880 - Math.sin(j * Math.PI) * 220) + 'px'; d.style.transform = `rotate(${lerp(-10, 20, j)}deg)`;
      const kid = root.querySelector('#kid'); kid.style.transform = `rotate(${lerp(0, -14, easeOut(prog(t, .6, .3)))}deg)`;
      const hp = prog(t, .75, .4); const h = root.querySelector('#heart'); h.style.opacity = hp > 0 ? 1 : 0; h.style.transform = `translateY(${-hp * 120}px) scale(${back(hp)})`;
      root.querySelectorAll('.cf').forEach((c, i) => { const st = .5 + (i % 7) * .07; const p = Math.max(0, t - st); c.style.left = ((i * 97) % 1000 + Math.sin(p * 3 + i) * 30) + 'px'; c.style.top = (200 + p * 520 * (0.7 + (i % 3) * .2)) + 'px'; c.style.opacity = t > st ? 1 : 0; c.style.transform = `rotate(${p * 120 + i * 20}deg)`; });
      root.style.transform = `scale(${1 + t * .03})`;
    },
    species(s, t, root) {
      BASE.phone(s, t, root);
      if (!root.querySelector('#bun')) { const b = document.createElement('div'); b.id = 'bun'; b.style.cssText = 'position:absolute;font-size:180px;z-index:20'; b.textContent = '🐰'; root.appendChild(b); }
      const b = root.querySelector('#bun'); const p = prog(t, s.bunAt, .6);
      b.style.opacity = p > 0 ? 1 : 0; b.style.left = lerp(560, 780, p) + 'px'; b.style.top = (1100 - Math.sin(p * Math.PI) * 420 + p * 120) + 'px'; b.style.transform = `rotate(${p * 25}deg) scale(${lerp(.5, 1, easeOut(p))})`;
    },
    timeline(s, t, root) {
      BASE.phone(s, t, root);
      if (!root.querySelector('#tl')) { const d = document.createElement('div'); d.id = 'tl'; d.style.cssText = 'position:absolute;left:60px;right:60px;top:1440px;display:flex;justify-content:space-between;z-index:20'; d.innerHTML = ['1 semana', '1 mes', '3 meses', '6 meses'].map((x, i) => `<span class="chip tlc" style="font-size:36px;padding:16px 26px">${i === 0 ? '✅ ' : ''}${x}</span>`).join(''); root.appendChild(d); }
      const tl = root.querySelector('#tl'); tl.style.display = t >= s.tlAt ? 'flex' : 'none';
      tl.querySelectorAll('.tlc').forEach((c, i) => { const p = prog(t, s.tlAt + i * .12, .3); c.style.opacity = clamp(p * 2); c.style.transform = `scale(${back(p)})`; if (i === 0) { c.style.background = t > s.tlAt + .6 ? '#22c55e' : '#fff'; c.style.color = t > s.tlAt + .6 ? '#fff' : '#c2410c'; } });
    },
    ending(s, t, root) {
      if (!root.dataset.init) {
        root.className = 'layer';
        root.innerHTML = `<div id="day">${table(true)}</div><div id="nightL" style="position:absolute;inset:0">${table(false)}</div>
          ${dog('d5', 230, 'left:60px;top:1400px;z-index:10')}<div id="zz5" style="position:absolute;left:250px;top:1330px;font-size:80px;z-index:10">💤</div>
          <div id="plane" style="position:absolute;font-size:150px;z-index:12">✈️</div>
          <div id="share" class="chip" style="position:absolute;left:50%;top:330px;font-size:46px;z-index:12">📤 Mándaselo a tu amigo de los perritos perdidos</div>`;
        root.dataset.init = 1;
      }
      const nl = root.querySelector('#nightL'); nl.style.opacity = clamp((t - (s.dur - .55)) / .45);
      const pp = prog(t, .6, 1.4); const pl = root.querySelector('#plane'); pl.style.opacity = pp > 0 && pp < 1 ? 1 : 0; pl.style.left = lerp(200, 980, pp) + 'px'; pl.style.top = (1250 - Math.sin(pp * Math.PI) * 500 + pp * 300) + 'px'; pl.style.transform = `rotate(${lerp(-20, 30, pp)}deg)`;
      const sh = root.querySelector('#share'); const sp = prog(t, .2, .35); sh.style.opacity = clamp(sp * 2) * (1 - clamp((t - (s.dur - .6)) / .3)); sh.style.transform = `translateX(-50%) scale(${back(sp)})`; sh.style.whiteSpace = 'normal'; sh.style.width = '820px'; sh.style.textAlign = 'center'; sh.style.justifyContent = 'center';
      const z = root.querySelector('#zz5'); z.style.opacity = t > s.dur - 1.6 ? 0 : .5 + .5 * Math.abs(Math.sin(t * 3));
      root.querySelector('#d5').style.transform = t > s.dur - 1.6 ? 'scaleX(-1) translateY(-10px)' : 'none';
      root.querySelector('#d5').style.opacity = 1 - clamp((t - (s.dur - .55)) / .45);
    },
  };
};
