// Escenas de la semana 1 (reels solo con texto y música). Todo depende del tiempo t.
window.EXTRA_SCENES = function (BASE) {
  const baseKinetic = BASE.kinetic;
  if (!document.getElementById('wk-css')) { const st = document.createElement('style'); st.id = 'wk-css'; st.textContent = '.word{margin:0 .05em}'; document.head.append(st); }
  const pill = (txt, bg, color, size = 46) =>
    `<span style="display:inline-block;background:${bg};color:${color};font-weight:900;font-size:${size}px;padding:14px 34px;border-radius:999px;letter-spacing:1px;box-shadow:0 12px 26px rgba(0,0,0,.18)">${txt}</span>`;
  return {
    // Texto animado: corrige que el zoom se acumulaba cuadro a cuadro y hace aparecer
    // el resaltado de una línea junto con su primera palabra.
    kinetic(s, t, root) {
      root.style.transform = '';
      baseKinetic(s, t, root);
      root.querySelectorAll('.hl,.hl-w').forEach((h) => { const w = h.querySelector('.word'); h.style.opacity = w ? w.style.opacity : 1; });
    },
    // Paso numerado: número + emoji + título + explicación.
    step(s, t, root) {
      if (!root.dataset.init) {
        const dark = s.bg === 'bg-o' || s.bg === 'bg-t' || s.bg === 'bg-d';
        root.className = 'layer center ' + (s.bg || 'bg-c');
        root.innerHTML =
          `<div id="lbl" style="position:absolute;top:300px;left:0;right:0;text-align:center">${pill(s.label || `PASO ${s.n}`, dark ? '#fff' : '#ea580c', dark ? '#c2410c' : '#fff')}</div>` +
          `<div id="emo" style="font-size:${s.emojiSize || 300}px;line-height:1;filter:drop-shadow(0 26px 30px rgba(0,0,0,.18))">${s.emoji}</div>` +
          `<div id="ttl" class="big" style="font-size:${s.titleSize || 96}px;margin-top:60px;color:${dark ? '#fff' : '#1c1917'}">${s.title.map((l) => `<div>${words(l)}</div>`).join('')}</div>` +
          (s.sub ? `<div id="sub" style="font-size:52px;font-weight:700;line-height:1.3;margin-top:44px;max-width:860px;color:${dark ? '#ffedd5' : '#57534e'}">${s.sub}</div>` : '');
        root.dataset.init = 1;
      }
      const l = root.querySelector('#lbl'); const pl = prog(t, 0, .35);
      l.style.opacity = clamp(pl * 2); l.style.transform = `translateY(${(1 - easeOut(pl)) * -60}px)`;
      const e = root.querySelector('#emo'); const pe = prog(t, .1, .5);
      e.style.opacity = clamp(pe * 3); e.style.transform = `scale(${back(pe)}) rotate(${Math.sin(t * 5) * 5}deg) translateY(${Math.sin(t * 3.2) * 10}px)`;
      popWords(root.querySelector('#ttl'), t, .3, .07);
      const sb = root.querySelector('#sub'); if (sb) { const p = prog(t, s.subAt ?? .9, .45); sb.style.opacity = p; sb.style.transform = `translateY(${(1 - easeOut(p)) * 40}px)`; }
      root.style.transform = `scale(${1 + t * .01})`;
    },
    // Señal de alerta: chat con un mensaje sospechoso + explicación.
    flag(s, t, root) {
      if (!root.dataset.init) {
        root.className = 'layer bg-d';
        root.innerHTML =
          `<div id="lbl" style="position:absolute;top:290px;left:0;right:0;text-align:center">${pill('🚩 SEÑAL ' + s.n, '#dc2626', '#fff', 54)}</div>` +
          `<div id="panel" style="position:absolute;left:70px;right:70px;top:430px;height:540px;border-radius:48px;overflow:hidden;background:#efe7dd;box-shadow:0 40px 80px rgba(0,0,0,.5)">` +
          `<div style="height:150px;background:#075e54;color:#fff;display:flex;align-items:center;gap:24px;padding:0 40px;font-size:42px;font-weight:800"><div style="width:90px;height:90px;border-radius:50%;background:#d6d3d1;display:flex;align-items:center;justify-content:center;font-size:52px">👤</div><div>${s.who || 'Número desconocido'}<div id="st" style="font-size:28px;font-weight:600;opacity:.85">escribiendo…</div></div></div>` +
          `<div id="typing" style="position:absolute;left:40px;top:200px;background:#fff;border-radius:34px;padding:22px 30px;font-size:60px;line-height:.6;letter-spacing:6px;color:#a8a29e">•••</div>` +
          `<div id="bub" class="bubble in" style="left:40px;top:200px;max-width:880px;font-size:44px">${s.msg}<div style="font-size:24px;color:#78716c;text-align:right;margin-top:8px">${s.time || '22:41'}</div></div>` +
          `</div>` +
          `<div id="why" style="position:absolute;left:70px;right:70px;top:1020px;background:#fde047;border-radius:40px;padding:36px 44px;box-shadow:0 30px 60px rgba(0,0,0,.4)"><div class="big" style="font-size:66px;letter-spacing:-1.5px;color:#1c1917">${s.why}</div>${s.whySub ? `<div style="font-size:40px;font-weight:700;color:#44403c;margin-top:16px;line-height:1.25">${s.whySub}</div>` : ''}</div>`;
        root.dataset.init = 1;
      }
      const l = root.querySelector('#lbl'); const pl = prog(t, 0, .3);
      l.style.opacity = clamp(pl * 2); l.style.transform = `scale(${back(pl)}) rotate(-2deg)`;
      const pn = root.querySelector('#panel'); const pp = prog(t, .05, .45);
      pn.style.opacity = clamp(pp * 2); pn.style.transform = `translateY(${(1 - easeOut(pp)) * 140}px)`;
      const typeEnd = s.typeEnd ?? .9;
      root.querySelector('#typing').style.opacity = t > .35 && t < typeEnd ? 1 : 0;
      root.querySelector('#st').textContent = t < typeEnd ? 'escribiendo…' : 'en línea';
      const b = root.querySelector('#bub'); const pb = prog(t, typeEnd, .3);
      b.style.opacity = clamp(pb * 2); b.style.transformOrigin = '0 100%'; b.style.transform = `scale(${lerp(.8, 1, back(pb))})`;
      const w = root.querySelector('#why'); const pw = prog(t, s.whyAt ?? 1.7, .35);
      w.style.opacity = clamp(pw * 2); w.style.transform = `scale(${lerp(1.25, 1, easeOut(pw))}) rotate(${lerp(-4, -1, easeOut(pw))}deg)`;
      const a = Math.max(0, 1 - (t - (s.whyAt ?? 1.7)) / .3) * (t >= (s.whyAt ?? 1.7) ? 12 : 0);
      root.style.transform = `translate(${Math.sin(t * 90) * a}px,${Math.cos(t * 70) * a}px)`;
    },
    // Cuadrícula de especies que aparecen una a una.
    grid(s, t, root) {
      if (!root.dataset.init) {
        root.className = 'layer ' + (s.bg || 'bg-c');
        root.innerHTML =
          `<div id="ttl" class="big" style="position:absolute;top:300px;left:60px;right:60px;text-align:center;font-size:${s.titleSize || 92}px">${s.title.map((l) => `<div>${words(l)}</div>`).join('')}</div>` +
          `<div style="position:absolute;left:70px;right:70px;top:${s.gridTop || 640}px;display:grid;grid-template-columns:repeat(3,1fr);gap:30px">` +
          s.items.map((it) => `<div class="gi" style="background:#fff;border-radius:40px;padding:34px 10px 28px;text-align:center;box-shadow:0 18px 40px rgba(67,20,7,.14)"><div style="font-size:150px;line-height:1">${it[0]}</div><div style="font-size:42px;font-weight:900;margin-top:16px;color:#c2410c">${it[1]}</div></div>`).join('') +
          `</div>`;
        root.dataset.init = 1;
      }
      popWords(root.querySelector('#ttl'), t, .05, .07);
      root.querySelectorAll('.gi').forEach((g, i) => {
        const p = prog(t, (s.itemsAt ?? .5) + i * (s.stagger ?? .2), .35);
        g.style.opacity = clamp(p * 2); g.style.transform = `scale(${back(p)}) rotate(${(1 - easeOut(p)) * (i % 2 ? 8 : -8)}deg)`;
      });
    },
  };
};
