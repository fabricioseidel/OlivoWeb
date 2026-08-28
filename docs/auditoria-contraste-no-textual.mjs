import { chromium } from 'playwright';

// WCAG 1.4.11 (AA): lo que hace falta para IDENTIFICAR un control necesita
// 3:1 contra lo que tiene al lado. Para un campo de formulario eso es su
// borde contra el fondo de la pagina -- salvo que el propio relleno del campo
// ya se distinga, que es la otra forma de cumplir. Se miden las dos.
const RUTAS = ['/contacto', '/login', '/registro', '/carrito', '/productos'];

const lum = ([r,g,b]) => { const c=[r,g,b].map(v=>{const s=v/255;
  return s<=0.03928?s/12.92:Math.pow((s+0.055)/1.055,2.4);});
  return 0.2126*c[0]+0.7152*c[1]+0.0722*c[2]; };
const ratio = (a,b) => { const [x,y]=[lum(a),lum(b)].sort((m,n)=>n-m); return (x+0.05)/(y+0.05); };

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
const hallazgos = [];
for (const ruta of RUTAS) {
  await p.goto('http://127.0.0.1:3000' + ruta, { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(2600);
  const datos = await p.evaluate(() => {
    const cv=document.createElement('canvas'); cv.width=cv.height=1;
    const ctx=cv.getContext('2d',{willReadFrequently:true});
    const rgba=(css)=>{try{ctx.clearRect(0,0,1,1);ctx.fillStyle='#000';ctx.fillStyle=css;
      ctx.fillRect(0,0,1,1);const d=ctx.getImageData(0,0,1,1).data;return [d[0],d[1],d[2],d[3]/255];}catch{return null;}};
    const out=[];
    for (const el of document.querySelectorAll('input:not([type=hidden]),select,textarea')) {
      const r=el.getBoundingClientRect(); if(r.width<1||r.height<1) continue;
      const cs=getComputedStyle(el);
      if(cs.visibility==='hidden'||cs.display==='none') continue;
      let fondoPagina=[255,255,255,1];
      for(let a=el.parentElement;a;a=a.parentElement){
        const c=rgba(getComputedStyle(a).backgroundColor);
        if(c&&c[3]>0.5){fondoPagina=c;break;}
      }
      out.push({
        borde: rgba(cs.borderTopColor), anchoBorde: parseFloat(cs.borderTopWidth),
        relleno: rgba(cs.backgroundColor), fondoPagina,
        tipo: el.type||el.tagName.toLowerCase(),
        etiqueta: (el.getAttribute('aria-label')||el.placeholder||el.name||'').slice(0,30),
        clases: (typeof el.className==='string'?el.className:'').replace(/\s+/g,' ').slice(0,60),
      });
    }
    return out;
  });
  for (const d of datos) {
    if (!d.borde || !d.relleno) continue;
    const crBorde = d.anchoBorde > 0 ? ratio(d.borde, d.fondoPagina) : 0;
    const crRelleno = ratio(d.relleno, d.fondoPagina);
    // Cumple si CUALQUIERA de las dos vias llega a 3:1.
    if (Math.max(crBorde, crRelleno) < 3) {
      hallazgos.push({ ruta, ...d, crBorde, crRelleno });
    }
  }
}
await b.close();
const vistos=new Map();
for(const h of hallazgos){const k=h.clases+'|'+h.tipo; if(!vistos.has(k))vistos.set(k,h);}
const u=[...vistos.values()];
console.log(`\n${hallazgos.length} campos bajo 3:1 (WCAG 1.4.11), ${u.length} patrones unicos\n`);
const rgbTxt=(c)=>`rgb(${c.slice(0,3).map(Math.round).join(',')})`;
for(const h of u){
  console.log(`${h.ruta} <${h.tipo}> "${h.etiqueta}"`);
  console.log(`   borde ${rgbTxt(h.borde)} ${h.anchoBorde}px -> ${h.crBorde.toFixed(2)}:1 | relleno ${rgbTxt(h.relleno)} -> ${h.crRelleno.toFixed(2)}:1  (fondo ${rgbTxt(h.fondoPagina)})`);
  console.log(`   ${h.clases}\n`);
}
