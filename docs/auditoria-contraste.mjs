import { chromium } from 'playwright';

// Auditor de contraste WCAG AA.
//
// Dos trampas que hacen que un auditor ingenuo mienta:
//
// 1) Tailwind v4 emite los colores en oklch(). Un parser que solo entienda
//    rgb() los descarta EN SILENCIO, y justo se salta lo que importa. Aca los
//    colores se resuelven pintandolos en un canvas 1x1 y leyendo el pixel:
//    eso acepta cualquier sintaxis que el navegador entienda.
// 2) El fondo casi nunca esta en el elemento del texto. Hay que subir por el
//    arbol hasta el primer ancestro opaco, y si ese fondo es un gradiente,
//    medir contra TODAS sus paradas de color y quedarse con la peor.

const RUTAS = ['/', '/productos', '/ofertas', '/carrito', '/bienvenidos',
               '/contacto', '/nosotros', '/preguntas-frecuentes', '/login', '/registro'];
const VIEWPORTS = [{ width: 1280, height: 900, nombre: 'escritorio' },
                   { width: 390, height: 844, nombre: 'movil' }];

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const hallazgos = [];

for (const vp of VIEWPORTS) {
  const page = await browser.newPage({ viewport: { width: vp.width, height: vp.height } });
  for (const ruta of RUTAS) {
    await page.goto('http://127.0.0.1:3000' + ruta, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2600);

    const datos = await page.evaluate(() => {
      const cv = document.createElement('canvas');
      cv.width = cv.height = 1;
      const ctx = cv.getContext('2d', { willReadFrequently: true });
      const cache = new Map();
      // Resuelve cualquier color CSS a [r,g,b,a] pintandolo.
      const aRGBA = (css) => {
        if (cache.has(css)) return cache.get(css);
        let v = null;
        try {
          ctx.clearRect(0, 0, 1, 1);
          ctx.fillStyle = '#000';
          ctx.fillStyle = css;
          // fillStyle queda en '#000' si el color no es valido; distinguirlo
          // de un negro real pintando dos veces sobre bases distintas seria
          // caro, y aca un falso '#000' solo produce un hallazgo revisable.
          ctx.fillRect(0, 0, 1, 1);
          const d = ctx.getImageData(0, 0, 1, 1).data;
          v = [d[0], d[1], d[2], d[3] / 255];
        } catch { v = null; }
        cache.set(css, v);
        return v;
      };
      // Paradas de color de un gradiente, para medir el peor caso.
      const paradas = (bgImg) => {
        if (!bgImg || bgImg === 'none' || !bgImg.includes('gradient')) return [];
        const m = bgImg.match(/(oklch|oklab|rgba?|hsla?|lab|lch|color)\([^()]*(\([^()]*\))?[^()]*\)|#[0-9a-f]{3,8}\b/gi) || [];
        return m.map(aRGBA).filter(Boolean);
      };

      const out = [];
      for (const el of document.querySelectorAll('body *')) {
        const propio = Array.from(el.childNodes).filter((n) => n.nodeType === 3)
          .map((n) => n.textContent.trim()).join(' ').trim();
        if (!propio) continue;
        const r = el.getBoundingClientRect();
        if (r.width < 1 || r.height < 1) continue;
        if (r.bottom < 0 || r.top > document.documentElement.scrollHeight) continue;
        const cs = getComputedStyle(el);
        if (cs.visibility === 'hidden' || cs.display === 'none') continue;
        // `sr-only` es invisible a proposito: existe solo para el lector de
        // pantalla, que no mira colores. Medirle el contraste da un fallo que
        // no lo es. Se detecta por el recorte, que es lo que la clase hace.
        if (cs.clip === 'rect(0px, 0px, 0px, 0px)' ||
            cs.clipPath === 'inset(50%)' ||
            (r.width <= 1 && r.height <= 1)) continue;
        // La opacidad se hereda: un ancestro al 0 esconde todo lo de adentro.
        let oculto = false, opAcum = 1;
        for (let a = el; a; a = a.parentElement) {
          const o = Number(getComputedStyle(a).opacity);
          if (o === 0) { oculto = true; break; }
          opAcum *= o;
        }
        if (oculto || opAcum < 0.05) continue;

        const fg = aRGBA(cs.color);
        if (!fg) continue;

        const fondos = [];
        for (let a = el; a; a = a.parentElement) {
          const acs = getComputedStyle(a);
          const st = paradas(acs.backgroundImage);
          if (st.length) { fondos.push(...st); break; }
          const bc = aRGBA(acs.backgroundColor);
          if (bc && bc[3] > 0.5) { fondos.push(bc); break; }
        }
        if (!fondos.length) fondos.push([255, 255, 255, 1]);

        out.push({
          texto: propio.slice(0, 60), fg, fondos, opAcum,
          px: parseFloat(cs.fontSize), peso: Number(cs.fontWeight) || 400,
          tag: el.tagName.toLowerCase(),
          clases: (typeof el.className === 'string' ? el.className : '').slice(0, 95),
        });
      }
      return out;
    });

    for (const d of datos) {
      const lum = ([r, g, b]) => {
        const c = [r, g, b].map((v) => { const s = v / 255;
          return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4); });
        return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
      };
      const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m);
        return (x + 0.05) / (y + 0.05); };

      let peor = Infinity, peorBg = null;
      for (const bg of d.fondos) {
        // Alfa del texto y opacidad heredada, ambas mezclan contra el fondo.
        const alfa = d.fg[3] * d.opAcum;
        const efectivo = d.fg.slice(0, 3).map((v, i) => v * alfa + bg[i] * (1 - alfa));
        const cr = ratio(efectivo, bg.slice(0, 3));
        if (cr < peor) { peor = cr; peorBg = bg; }
      }
      const grande = d.px >= 24 || (d.px >= 18.66 && d.peso >= 700);
      const minimo = grande ? 3 : 4.5;
      if (peor < minimo) {
        hallazgos.push({ vp: vp.nombre, ruta, ...d, cr: peor, minimo, peorBg });
      }
    }
  }
  await page.close();
}
await browser.close();

// Deduplica: el mismo componente aparece en 8 rutas y 2 viewports.
const vistos = new Map();
for (const h of hallazgos) {
  const k = h.clases + '|' + h.texto;
  if (!vistos.has(k) || vistos.get(k).cr > h.cr) vistos.set(k, h);
}
const unicos = [...vistos.values()].sort((a, b) => a.cr - b.cr);
console.log(`\n${hallazgos.length} incidencias, ${unicos.length} casos unicos bajo WCAG AA\n`);
for (const h of unicos) {
  const rgb = (c) => `rgb(${c.slice(0,3).map(Math.round).join(',')})`;
  console.log(`${h.cr.toFixed(2)}:1 (min ${h.minimo})  ${h.ruta} [${h.vp}]  <${h.tag}> ${h.px}px/${h.peso}`);
  console.log(`   "${h.texto}"`);
  console.log(`   ${rgb(h.fg)} sobre ${rgb(h.peorBg)}`);
  console.log(`   ${h.clases}\n`);
}
