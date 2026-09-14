export const defaults=[
 {id:'wave',x:0,y:0,w:3,h:3},{id:'fft',x:0,y:3,w:3,h:3},{id:'spectrogram',x:0,y:6,w:3,h:3},
 {id:'surface',x:3,y:0,w:6,h:9},{id:'pitch',x:9,y:0,w:3,h:3},{id:'note',x:9,y:3,w:3,h:3},{id:'harmonics',x:9,y:6,w:3,h:3},
 {id:'dynamics',x:0,y:9,w:3,h:4},{id:'input',x:3,y:9,w:3,h:4},{id:'tuning',x:6,y:9,w:3,h:4},{id:'playlist',x:9,y:9,w:3,h:4},
 {id:'speech',x:0,y:13,w:12,h:4},{id:'status',x:8,y:13,w:4,h:4,hidden:true},{id:'phase',x:0,y:17,w:4,h:5,hidden:true}];
export const overlaps=(a,b)=>!a.hidden&&!b.hidden&&a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;
export function place(layout,id,patch){const current=layout.find(x=>x.id===id);if(!current)return layout;const p={...current,...patch};p.w=Math.max(2,Math.min(12,Math.round(p.w)||3));p.h=Math.max(3,Math.min(16,Math.round(p.h)||3));p.x=Math.max(0,Math.min(12-p.w,Math.round(p.x)||0));p.y=Math.max(0,Math.min(100,Math.round(p.y)||0));const placed=[p];for(const item of layout.filter(x=>x.id!==id).sort((a,b)=>a.y-b.y)){const next={...item};while(placed.some(x=>overlaps(x,next)))next.y=Math.max(...placed.filter(x=>overlaps(x,next)).map(x=>x.y+x.h));placed.push(next);}return layout.map(x=>placed.find(p=>p.id===x.id));}
export function loadLayout(){try{const data=JSON.parse(localStorage.getItem('blackmamba-layout-v1'));if(!Array.isArray(data))return defaults;let result=defaults.map(d=>({...d}));for(const d of data)if(result.some(x=>x.id===d.id))result=place(result,d.id,{x:d.x,y:d.y,w:d.w,h:d.h,hidden:!!d.hidden});return result;}catch{return defaults;}}
