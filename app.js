// Storage: Dual IndexedDB + synchronous localStorage write-through so instant page refreshes never miss a save.
const MEM={};let idb=null;
try{for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(k&&k.startsWith('ledger.'))MEM[k]=localStorage.getItem(k)}}catch(e){}
const openDB=()=>new Promise((res,rej)=>{const r=indexedDB.open('ledger-db',1);r.onupgradeneeded=()=>r.result.createObjectStore('kv');r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)});
async function initStore(){
 try{idb=await openDB();await new Promise(res=>{const tx=idb.transaction('kv'),q=tx.objectStore('kv').openCursor();q.onsuccess=e=>{const c=e.target.result;if(c){if(!(c.key in MEM))MEM[c.key]=c.value;c.continue()}};tx.oncomplete=res;tx.onerror=res})}catch(e){idb=null}
 try{if(navigator.storage&&navigator.storage.persist)await navigator.storage.persist()}catch(e){}
}
const STORE={getItem:k=>k in MEM?MEM[k]:null,setItem:(k,v)=>{const s=String(v);MEM[k]=s;try{localStorage.setItem(k,s)}catch(e){}if(idb)try{idb.transaction('kv','readwrite').objectStore('kv').put(s,k)}catch(e){}}};
(async()=>{
await initStore();

const $=s=>document.querySelector(s);
const LS='ledger.v2';
const CATS={out:['🍔 Food','🚌 Transport','🧾 Bills','🛍️ Shopping','💊 Health','🏠 Rent','🎬 Fun','📦 Other'],in:['💼 Salary','↩️ Refund','🎁 Gift','🔁 Transfer','📦 Other']};
const LC='ledger.cats.v1';
let CT=null;try{CT=JSON.parse(STORE.getItem(LC))}catch(e){}
if(!CT){CT=CATS.out.map(n=>({n,t:'out',a:1}));CATS.in.forEach(n=>{const c=CT.find(x=>x.n===n);c?c.t='both':CT.push({n,t:'in',a:1})})}
let calcVer=1;
const bumpCalc=()=>{calcVer++};
const saveC=()=>{bumpCalc();try{STORE.setItem(LC,JSON.stringify(CT))}catch(e){}stamp();schedSync()};
const catsFor=ty=>CT.filter(c=>!c.del&&(c.t===ty||c.t==='both')).map(c=>c.n);
const iso=n=>{const d=new Date();d.setDate(d.getDate()-n);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')};
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const r2=n=>Math.round(n*100)/100;
const fmt=(c,n)=>{const v=r2(Number(n)||0);return (c==='INR'?'₹':'AED ')+v.toLocaleString(c==='INR'?'en-IN':'en-US',{minimumFractionDigits:v%1?2:0,maximumFractionDigits:2})};
const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,8);
const mk=k=>{const d=new Date();d.setDate(1);d.setMonth(d.getMonth()-k);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')};
const mname=m=>new Date(m+'-01T00:00').toLocaleDateString('en',{month:'short'});
const mlabel=m=>new Date(m+'-01T00:00').toLocaleDateString('en',{month:'long',year:'numeric'});
const mtot=(t,m,ty)=>r2(t.filter(x=>x.type===ty&&x.date.slice(0,7)===m).reduce((a,x)=>a+x.amt,0));
const inP=x=>S.pm==='all'||(S.pm==='range'?(x.date>=S.rf&&x.date<=S.rt):x.date.slice(0,7)===S.mo);
const psD=()=>S.pm==='all'?'0000-00-00':S.pm==='range'?S.rf:S.mo+'-01';
const pLab=()=>S.pm==='all'?'all time':S.pm==='range'?S.rf+' to '+S.rt:mlabel(S.mo);
const pShort=()=>S.pm==='all'?'All time':S.pm==='range'?'Range':mname(S.mo);
const ptot=(t,ty)=>r2(t.filter(x=>inP(x)&&x.type===ty).reduce((a,x)=>a+x.amt,0));

function chart(t,c){
 const ms=[5,4,3,2,1,0].map(mk),I=ms.map(m=>mtot(t,m,'in')),O=ms.map(m=>mtot(t,m,'out')),mx=Math.max(...I,...O,1);
 const X=i=>20+i*52,Y=v=>12+(1-v/mx)*66,P=a=>a.map((v,i)=>X(i)+','+Y(v).toFixed(1)).join(' '),si=S.pm==='month'?ms.indexOf(S.mo):-1;
 const dots=(a,col)=>ms.map((m,i)=>`<circle data-m="${m}" cx="${X(i)}" cy="${Y(a[i]).toFixed(1)}" r="${i===si?5:3.5}" fill="${col}"><title>${mname(m)}: ${fmt(c,a[i])}</title></circle>`).join('');
 return `<div class="lg"><span><i style="background:var(--in)"></i>Received</span><span><i style="background:var(--out)"></i>Spent</span><span>Last 6 months · tap month</span></div>
 <svg viewBox="0 0 300 108" class="ch" role="img" aria-label="Monthly received and spent, last 6 months">
 ${si>=0?`<rect x="${X(si)-25}" y="4" width="50" height="78" rx="10" fill="var(--acc)" opacity=".16"/>`:''}
 <line x1="8" x2="292" y1="${Y(0)}" y2="${Y(0)}" stroke="var(--line)"/>
 ${ms.map((m,i)=>`<rect data-m="${m}" x="${X(i)-26}" y="0" width="52" height="108" fill="transparent"/>`).join('')}
 <polyline points="${P(I)}" fill="none" stroke="var(--in)" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>
 <polyline points="${P(O)}" fill="none" stroke="var(--out)" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>
 ${dots(I,'var(--in)')}${dots(O,'var(--out)')}
 ${ms.map((m,i)=>`<text x="${X(i)}" y="100" text-anchor="middle" font-size="11" fill="var(--mut)" font-weight="${i===si?700:400}">${mname(m)}</text>`).join('')}
 </svg>${catStrip(t,c)}`;
}

function catStrip(t,c){
 const sp=t.filter(x=>inP(x)&&x.type==='out');
 if(!sp.length)return '';
 const tot=sp.reduce((a,x)=>a+x.amt,0),by={};
 sp.forEach(x=>{by[x.cat]=(by[x.cat]||0)+x.amt});
 const top=Object.entries(by).sort((a,b)=>b[1]-a[1]).slice(0,5);
 return `<div class="cb"><div class="cb-h"><span>Top spent · ${pShort()}</span><span>Tap category to filter</span></div>
 <div class="cb-bar">${top.map(([k,v],i)=>`<i style="width:${Math.max(4,Math.round(v/tot*100))}%;opacity:${1-i*0.16}"></i>`).join('')}</div>
 <div class="cb-pills">${top.map(([k,v])=>`<button type="button" class="cb-p${S.q===k?' on':''}" data-cf="${esc(k)}"><span>${esc(k)}</span><em>${Math.round(v/tot*100)}%</em></button>`).join('')}</div></div>`;
}

// mini: true and fh: true keep both chart/debts and filter section hidden by default
let S={tx:null,off:false,tab:'AED',cur:'AED',mo:mk(0),q:'',f:'all',pp:10,pg:1,eid:null,dcur:'INR',ds:'open',dq:'',did:null,xp:{},pm:'month',rf:mk(0)+'-01',rt:iso(0),mini:true,fh:true,type:'out',cat:'',busy:false,vm:STORE.getItem('ledger.vm')||'auto'};
try{const r=STORE.getItem(LS);if(r)S.tx=JSON.parse(r)}catch(e){}
if(!S.tx)S.tx=[];
const save=()=>{bumpCalc();try{STORE.setItem(LS,JSON.stringify(S.tx))}catch(e){}stamp();schedSync()};
const online=()=>!S.off&&navigator.onLine;
const sum=(t,ty)=>r2(t.filter(x=>x.type===ty).reduce((a,x)=>a+x.amt,0));

const SV='<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">';
const IC={
 e:SV+'<path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>',
 d:SV+'<path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/></svg>',
 sun:SV+'<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/></svg>',
 moon:SV+'<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>'
};

// Theme initialization with SVG Sun/Moon icon
const isDark=()=>{
 const t=document.documentElement.getAttribute('data-theme');
 return t?t==='dark':matchMedia('(prefers-color-scheme:dark)').matches;
};
const syncThemeIcon=()=>{
 const d=isDark();
 if($('#theme-meta'))$('#theme-meta').setAttribute('content',d?'#0b101b':'#e9eef5');
 if(!$('#thb'))return;
 $('#thb').innerHTML=d?IC.sun:IC.moon;
 $('#thb').setAttribute('title',d?'Switch to light mode':'Switch to dark mode');
};
matchMedia('(prefers-color-scheme:dark)').addEventListener('change',syncThemeIcon);
const initTheme=STORE.getItem('ledger.theme');
if(initTheme)document.documentElement.setAttribute('data-theme',initTheme);
syncThemeIcon();
if($('#thb'))$('#thb').onclick=()=>{
 const next=isDark()?'light':'dark';
 document.documentElement.setAttribute('data-theme',next);
 STORE.setItem('ledger.theme',next);
 syncThemeIcon();
};

const CH='<svg viewBox="0 0 12 8" width="12" height="8" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M1 1l5 5 5-5"/></svg>';
const CK='<svg viewBox="0 0 16 12" width="14" height="11" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 6l4 4 8-8"/></svg>';
function dd(id,lab,o,val){const on=x=>String(x.v)===String(val),cur=o.find(on)||o[0],dot=x=>x.d?`<i class="dc" style="background:${x.d}"></i>`:'';
 return `<div class="dd" data-dd="${id}"><button type="button" class="ddb" aria-haspopup="listbox" aria-expanded="false" aria-label="${lab}">${dot(cur)}<span>${esc(cur.l)}</span>${CH}</button><div class="ddm" role="listbox">${o.map(x=>`<button type="button" role="option" class="ddo${on(x)?' on':''}" data-v="${x.v}" aria-selected="${on(x)}">${dot(x)}<span class="t"><b>${esc(x.l)}</b>${x.s?`<small>${esc(x.s)}</small>`:''}</span>${x.r?`<em class="${x.rc||''}">${esc(x.r)}</em>`:''}${on(x)?CK:''}</button>`).join('')}</div></div>`}
const closeDd=()=>document.querySelectorAll('.dd.open').forEach(d=>{d.classList.remove('open');if(d.firstChild)d.firstChild.setAttribute('aria-expanded','false')});
document.addEventListener('click',e=>{if(!e.target.closest('.dd'))closeDd()});
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeDd()});
const LO='ledger.ob.v1';let OB={INR:0};try{const o=JSON.parse(STORE.getItem(LO));if(o)OB=o}catch(e){}
IC.dn=SV+'<path d="M6 9l6 6 6-6"/></svg>';IC.up=SV+'<path d="M6 15l6-6 6 6"/></svg>';
const paid=d=>r2(d.pays.filter(p=>!p.del).reduce((a,p)=>a+p.amt,0)),rem=d=>r2(d.amt-paid(d));
const LD='ledger.debts.v2';let DB=null;try{DB=JSON.parse(STORE.getItem(LD))}catch(e){}
if(!DB)DB=[];
const dsave=()=>{try{STORE.setItem(LD,JSON.stringify(DB))}catch(e){}stamp();schedSync()};
const LDR='ledger.diary.v1',LDRV='ledger.diary.verifier',LH='ledger.hist.v1';
let DR=null;try{DR=JSON.parse(STORE.getItem(LDR))}catch(e){}
if(!Array.isArray(DR))DR=[];
let DRV={v:'',q:'',r:'',t:'',hint:'',upd:'1970-01-01T00:00:00.000Z'};try{const v=JSON.parse(STORE.getItem(LDRV));if(v&&typeof v==='object')DRV=Object.assign(DRV,v)}catch(e){}
let HIST=[];try{const h=JSON.parse(STORE.getItem(LH));if(Array.isArray(h))HIST=h}catch(e){}
const saveHist=()=>{if(HIST.length>150)HIST=HIST.slice(0,150);try{STORE.setItem(LH,JSON.stringify(HIST))}catch(e){}};
const logHist=item=>{HIST.unshift(Object.assign({hid:uid(),ts:new Date().toISOString()},item));saveHist()};
let drDates=new Set();
const rebuildDrDates=()=>{drDates=new Set(DR.filter(x=>!x.del&&x.cipher).map(x=>x.date))};
rebuildDrDates();
const drsave=()=>{rebuildDrDates();try{STORE.setItem(LDR,JSON.stringify(DR));STORE.setItem(LDRV,JSON.stringify(DRV))}catch(e){}stamp();schedSync()};
const hasDiary=dt=>drDates.has(dt);
const dryBadge=dt=>hasDiary(dt)?`<button type="button" class="dry-tag" data-drd="${dt}" title="Open encrypted diary note for ${dt}">📝 Note</button>`:'';
function dnet(c){const m={};DB.filter(d=>d.cur===c&&!d.del&&rem(d)>0).forEach(d=>{const k=d.who.trim().toLowerCase();m[k]=m[k]||{who:d.who.trim(),n:0};m[k].n=r2(m[k].n+(d.dir==='lent'?rem(d):-rem(d)))});return Object.values(m).filter(p=>p.n!==0).sort((a,b)=>Math.abs(b.n)-Math.abs(a.n))}
function debts(c){const L=dnet(c),got=r2(L.filter(p=>p.n>0).reduce((a,p)=>a+p.n,0)),ow=Math.abs(r2(L.filter(p=>p.n<0).reduce((a,p)=>a+p.n,0)));
 return `<aside class="dw"><div class="dh"><b>Debts</b><button class="ghost" data-dk="manage:">Manage</button></div><div class="ds"><span class="in">Owed to you<b>${fmt(c,got)}</b></span><span class="out">You owe<b>${fmt(c,ow)}</b></span></div><div class="dl">${L.map(p=>`<div class="dr"><span class="av2">${esc(p.who.slice(0,1).toUpperCase())}</span><span class="t"><b>${esc(p.who)}</b><small class="${p.n>0?'in':'out'}">${p.n>0?'owes you':'you owe'}</small></span><em class="${p.n>0?'in':'out'}">${fmt(c,Math.abs(p.n))}</em></div>`).join('')||'<div class="empty">No debts. All settled.</div>'}</div></aside>`}
const ledger=c=>S.tx.filter(x=>x.cur===c&&!x.del).sort((a,b)=>b.date.localeCompare(a.date)||b.ts-a.ts);

function mcards(c,rows,all,av,bfrCard){
 if(!rows.length)return `<div class="mfeed"><div class="empty">No matching entries in ${pLab()}.</div>${bfrCard||''}</div>`;
 const groups=[];
 rows.forEach(x=>{let g=groups[groups.length-1];if(!g||g.date!==x.date){g={date:x.date,items:[]};groups.push(g)}g.items.push(x)});
 return `<div class="mfeed">${groups.map(g=>{
  const day=all.filter(r=>r.date===g.date),net=r2(day.reduce((a,r)=>a+(r.type==='in'?r.amt:-r.amt),0));
  const dtStr=new Date(g.date+'T00:00').toLocaleDateString('en',{day:'2-digit',month:'short',year:'numeric'});
  return `<div class="mday"><div class="mday-h"><b>${dtStr}${dryBadge(g.date)}</b><span>${day.length} ${day.length===1?'entry':'entries'} · <em class="num ${net<0?'out':'in'}" style="font-style:normal;font-weight:600">${net<0?'−':'+'}${fmt(c,Math.abs(net))}</em></span></div>${g.items.map(x=>`<div class="mrow"><div class="mrow-l"><b>${esc(x.cat)}</b><span>${esc(x.note||'No notes')}</span></div><div class="mrow-r"><div class="mrow-amt"><b class="amt ${x.type}">${x.type==='in'?'+':'−'}${fmt(c,x.amt)}</b>${av?`<small>Avail: ${fmt(c,av[x.id])}</small>`:''}</div><div class="mrow-ac"><button class="ib" data-e="${x.id}" aria-label="Edit entry">${IC.e}</button><button class="ib d" data-d="${x.id}" aria-label="Delete entry">${IC.d}</button></div></div></div>`).join('')}</div>`;
 }).join('')}${bfrCard||''}</div>`;
}

function tbl(c){if(c==='INR')return ltbl(c);
 const q=S.q.toLowerCase(),all=ledger(c).filter(x=>inP(x)&&(S.f==='all'||x.type===S.f)&&(!q||(x.cat+' '+x.note).toLowerCase().includes(q)));
 const pages=Math.max(1,Math.ceil(all.length/S.pp));S.pg=Math.max(1,Math.min(S.pg,pages));
 const st=(S.pg-1)*S.pp,rows=all.slice(st,st+S.pp);
 return `<div class="vm-${S.vm}">${mcards(c,rows,all,null,'')}<div class="tw tx-tw"><table class="lt"><colgroup><col style="width:46px"><col style="width:140px"><col><col style="width:92px"><col style="width:112px"><col style="width:128px"></colgroup><thead><tr><th>S.no</th><th>Date</th><th>Category / notes</th><th>Type</th><th class="r">Amount</th><th></th></tr></thead><tbody>${rows.map((x,i)=>{const f=i===0||rows[i-1].date!==x.date,l=i===rows.length-1||rows[i+1].date!==x.date,sp=rows.filter(r=>r.date===x.date).length,day=all.filter(r=>r.date===x.date),net=r2(day.reduce((a,r)=>a+(r.type==='in'?r.amt:-r.amt),0));
 return `<tr class="${f?'f':''} ${l?'':'k'}"><td class="num">${st+i+1}</td>${f?`<td rowspan="${sp}" class="dt"><b>${new Date(x.date+'T00:00').toLocaleDateString('en',{day:'2-digit',month:'short',year:'numeric'})}${dryBadge(x.date)}</b><span class="n num">${day.length} ${day.length===1?'entry':'entries'} · ${net<0?'−':'+'}${fmt(c,Math.abs(net))}</span></td>`:''}<td><b>${esc(x.cat)}</b><span class="n">${esc(x.note||'No notes')}</span></td><td><span class="tp ${x.type}">${x.type==='in'?'Received':'Spent'}</span></td><td class="r amt ${x.type}">${x.type==='in'?'+':'\u2212'}${fmt(c,x.amt)}</td><td class="ac"><div class="aw"><button class="ib tg ra" data-ra="1" aria-label="Show actions" aria-expanded="false">${IC.nx}</button><span class="ax"><button class="ib" data-e="${x.id}" aria-label="Edit entry" title="Edit">${IC.e}</button><button class="ib d" data-d="${x.id}" aria-label="Delete entry" title="Delete">${IC.d}</button></span></div></td></tr>`}).join('')||`<tr><td colspan="6" class="empty">No matching entries in ${pLab()}.</td></tr>`}</tbody></table></div></div>
 <div class="pg"><span class="num">${all.length?st+1:0}\u2013${st+rows.length} of ${all.length}</span><span class="pn">${dd('pp','Rows per page',[10,25,50].map(n=>({v:n,l:n+' rows'})),S.pp)}<button class="ghost" data-p="-1"${S.pg<=1?' disabled':''}>Prev</button><button class="ghost" data-p="1"${S.pg>=pages?' disabled':''}>Next</button></span></div>`;
}

// Memoized chronological INR balance calculation for instant 50k-row filtering
let inrMemo={ver:-1,A:[],av:{}};
function getInrCalc(c){
 if(inrMemo.ver===calcVer)return inrMemo;
 const A=S.tx.filter(x=>x.cur===c&&!x.del).sort((a,b)=>a.date.localeCompare(b.date)||a.ts-b.ts);
 let bal=OB[c]||0;const av={};
 A.forEach(x=>{bal=r2(bal+(x.type==='in'?x.amt:-x.amt));av[x.id]=bal});
 inrMemo={ver:calcVer,A,av};
 return inrMemo;
}

function ltbl(c){
 const {A,av}=getInrCalc(c);
 const pStart=psD();
 let bf=OB[c]||0;
 for(let i=0;i<A.length;i++){if(A[i].date>=pStart)break;bf=av[A[i].id]}
 const first=!A.some(x=>x.date<pStart),M=A.filter(inP),q=S.q.toLowerCase();
 const all=M.filter(x=>(S.f==='all'||x.type===S.f)&&(!q||(x.cat+' '+x.note).toLowerCase().includes(q))).reverse();
 const pages=Math.max(1,Math.ceil(all.length/S.pp));S.pg=Math.max(1,Math.min(S.pg,pages));
 const st=(S.pg-1)*S.pp,rows=all.slice(st,st+S.pp),tI=r2(M.filter(x=>x.type==='in').reduce((a,x)=>a+x.amt,0)),tO=r2(M.filter(x=>x.type==='out').reduce((a,x)=>a+x.amt,0)),close=M.length?av[M[M.length-1].id]:bf,neg=n=>n<0?' out':'';
 const body=rows.map((x,i)=>{const f=i===0||rows[i-1].date!==x.date,l=i===rows.length-1||rows[i+1].date!==x.date,sp=rows.filter(r=>r.date===x.date).length,day=all.filter(r=>r.date===x.date),net=r2(day.reduce((a,r)=>a+(r.type==='in'?r.amt:-r.amt),0));
  return `<tr class="${f?'f':''} ${l?'':'k'}"><td class="num">${st+i+1}</td>${f?`<td rowspan="${sp}" class="dt"><b>${new Date(x.date+'T00:00').toLocaleDateString('en',{day:'2-digit',month:'short',year:'numeric'})}${dryBadge(x.date)}</b><span class="n num">${day.length} ${day.length===1?'entry':'entries'} · ${net<0?'−':'+'}${fmt(c,Math.abs(net))}</span></td>`:''}<td><b>${esc(x.cat)}</b><span class="n">${esc(x.note||'No notes')}</span></td><td class="r amt in">${x.type==='in'?fmt(c,x.amt):'<i class="z">–</i>'}</td><td class="r amt out">${x.type==='out'?fmt(c,x.amt):'<i class="z">–</i>'}</td><td class="r av${neg(av[x.id])}">${fmt(c,av[x.id])}</td><td class="ac"><div class="aw"><button class="ib tg ra" data-ra="1" aria-label="Show actions" aria-expanded="false">${IC.nx}</button><span class="ax"><button class="ib" data-e="${x.id}" aria-label="Edit entry" title="Edit">${IC.e}</button><button class="ib d" data-d="${x.id}" aria-label="Delete entry" title="Delete">${IC.d}</button></span></div></td></tr>`}).join('');
 const bfr=S.pg===pages?`<tr class="bf"><td></td><td colspan="2"><b>${first?'Opening balance':'Brought forward'}</b><span class="n">${first?'Set once. Every entry updates Available.':'Balance before '+(S.pm==='range'?S.rf:mname(S.mo))}</span></td><td></td><td></td><td class="r av${neg(bf)}">${fmt(c,bf)}</td><td class="ac"><button class="ib" data-ob="1" aria-label="Edit opening balance" title="Edit opening balance">${IC.e}</button></td></tr>`:'';
 const bfrCard=S.pg===pages?`<div class="mbf"><div><b>${first?'Opening balance':'Brought forward'}</b><div class="hint">${first?'Set once. Updates Available.':'Balance before '+(S.pm==='range'?S.rf:mname(S.mo))}</div></div><div style="display:flex;align-items:center;gap:8px"><b class="av${neg(bf)}">${fmt(c,bf)}</b><button class="ib" data-ob="1" aria-label="Edit opening balance">${IC.e}</button></div></div>`:'';
 return `<div class="vm-${S.vm}">${mcards(c,rows,all,av,bfrCard)}<div class="tw tx-tw"><table class="lt l"><colgroup><col style="width:46px"><col style="width:136px"><col><col style="width:108px"><col style="width:108px"><col style="width:122px"><col style="width:128px"></colgroup><thead><tr><th>S.no</th><th>Date</th><th>Category</th><th class="r">Received</th><th class="r">Spent</th><th class="r">Available</th><th>Edit options</th></tr></thead><tbody>${body||`<tr><td colspan="7" class="empty">No matching entries in ${pLab()}.</td></tr>`}${bfr}</tbody><tfoot><tr><td></td><td colspan="2">${S.pm==='month'?'Month total and closing':'Total and closing'}</td><td class="r in num">${fmt(c,tI)}</td><td class="r out num">${fmt(c,tO)}</td><td class="r av${neg(close)}">${fmt(c,close)}</td><td></td></tr></tfoot></table></div></div>
 <div class="pg"><span class="num">${all.length?st+1:0}–${st+rows.length} of ${all.length}</span><span class="pn">${dd('pp','Rows per page',[10,25,50].map(n=>({v:n,l:n+' rows'})),S.pp)}<button class="ghost" data-p="-1"${S.pg<=1?' disabled':''}>Prev</button><button class="ghost" data-p="1"${S.pg>=pages?' disabled':''}>Next</button></span></div>`;
}

const dlab=d=>rem(d)<=0?['Settled','in']:paid(d)>0?['Partial','mid']:['Open','op'];
function dlist(){
 const c=S.dcur,q=S.dq.toLowerCase(),dt=s=>new Date(s+'T00:00').toLocaleDateString('en',{day:'2-digit',month:'short',year:'numeric'});
 const rows=DB.filter(d=>d.cur===c&&!d.del&&(S.ds==='all'||(S.ds==='open'?rem(d)>0:rem(d)<=0))&&(!q||(d.who+' '+d.note).toLowerCase().includes(q))).sort((a,b)=>b.date.localeCompare(a.date)||b.ts-a.ts);
 const dc= rows.map((d)=>{
  const r=rem(d),p=paid(d),pc=d.amt?Math.min(100,Math.round(p/d.amt*100)):0,[sl,sc]=dlab(d),op=S.xp[d.id];
  const pays=d.pays.filter(p=>!p.del).sort((a,b)=>b.date.localeCompare(a.date));
  return `<div class="mday"><div class="mday-h"><b>${esc(d.who)}</b><span class="st ${sc}">${sl} · ${pc}%</span></div><div class="mrow"><div class="mrow-l"><b><span class="tp ${d.dir==='lent'?'lent':'out'}">${d.dir==='lent'?'They owe me':'I owe them'}</span></b><span style="margin-top:4px">${dt(d.date)} · ${esc(d.note||'No notes')}</span></div><div class="mrow-r"><div class="mrow-amt"><b class="num">${fmt(c,r)} left</b><small>of ${fmt(c,d.amt)} (Paid ${fmt(c,p)})</small></div></div></div><div class="mrow" style="background:var(--bg);padding:8px 14px"><span class="hint">${pays.length} ${pays.length===1?'payment':'payments'}</span><div class="mrow-ac">${r>0?`<button class="ghost pay" data-dk="pay:${d.id}">Pay</button>`:''}<button class="ib tg" data-dk="xp:${d.id}" aria-expanded="${!!op}">${IC.dn}</button><button class="ib" data-dk="edit:${d.id}">${IC.e}</button><button class="ib d" data-dk="del:${d.id}">${IC.d}</button></div></div>${op?`<div style="padding:8px 14px;border-top:1px dashed var(--line);font-size:13px">${pays.map(y=>`<div style="display:flex;justify-content:space-between;align-items:center;padding:4px 0"><span>${dt(y.date)} · ${esc(y.note||'Payment')}</span><span style="display:flex;align-items:center;gap:6px"><b class="num">${fmt(c,y.amt)}</b><button class="ib d" style="width:26px;height:26px" data-dk="dp:${d.id}:${y.id}">${IC.d}</button></span></div>`).join('')||'<div class="hint">No payments yet.</div>'}</div>`:''}</div>`;
 }).join('');
 const body=rows.map((d,i)=>{const r=rem(d),p=paid(d),pc=d.amt?Math.min(100,Math.round(p/d.amt*100)):0,[sl,sc]=dlab(d),op=S.xp[d.id];
  const sub=`<tr class="sub"><td></td><td colspan="8"><div class="ph"><div class="pht"><b>Payment history</b><span class="n">${d.pays.filter(p=>!p.del).length} ${d.pays.filter(p=>!p.del).length===1?'payment':'payments'}</span></div>${d.pays.filter(p=>!p.del).sort((a,b)=>b.date.localeCompare(a.date)).map(y=>`<div class="pr"><span>${dt(y.date)}</span><span class="n">${esc(y.note||'Payment')}</span><b class="num">${fmt(c,y.amt)}</b><button class="ib d" data-dk="dp:${d.id}:${y.id}" aria-label="Delete payment" title="Delete payment">${IC.d}</button></div>`).join('')||'<div class="n">No payments yet.</div>'}</div></td></tr>`;
  return `<tr class="f${op?' xo':''}"><td class="num">${i+1}</td><td>${dt(d.date)}</td><td><b>${esc(d.who)}</b><span class="n">${esc(d.note||'No notes')}</span></td><td><span class="tp ${d.dir==='lent'?'lent':'out'}">${d.dir==='lent'?'They owe me':'I owe them'}</span></td><td class="r num">${fmt(c,d.amt)}</td><td class="r num">${fmt(c,p)}</td><td class="r av">${fmt(c,r)}<span class="pb"><i style="width:${pc}%"></i></span></td><td><span class="st ${sc}">${sl}</span></td><td class="ac">${r>0?`<button class="ghost pay" data-dk="pay:${d.id}">Pay</button>`:''}<button class="ib tg" data-dk="xp:${d.id}" aria-label="Payment history" title="Payment history" aria-expanded="${!!op}">${IC.dn}</button><button class="ib" data-dk="edit:${d.id}" aria-label="Edit debt" title="Edit">${IC.e}</button><button class="ib d" data-dk="del:${d.id}" aria-label="Delete debt" title="Delete">${IC.d}</button></td></tr>${sub}`}).join('');
 return `<div class="vm-${S.vm}"><div class="mfeed">${dc||'<div class="empty">No debts here.</div>'}</div><div class="tw tx-tw"><table class="lt dtb"><colgroup><col style="width:46px"><col style="width:108px"><col><col style="width:112px"><col style="width:92px"><col style="width:92px"><col style="width:120px"><col style="width:84px"><col style="width:176px"></colgroup><thead><tr><th>S.no</th><th>Date</th><th>Person / notes</th><th>Type</th><th class="r">Amount</th><th class="r">Paid</th><th class="r">Remaining</th><th>Status</th><th class="r">Actions</th></tr></thead><tbody>${body||`<tr><td colspan="9" class="empty">No debts here.</td></tr>`}</tbody></table></div></div>`;
}

function debtsTab(){const c=S.dcur,L=DB.filter(d=>d.cur===c&&!d.del),got=r2(L.filter(d=>d.dir==='lent').reduce((a,d)=>a+rem(d),0)),ow=r2(L.filter(d=>d.dir==='owe').reduce((a,d)=>a+rem(d),0)),net=r2(got-ow);
 const sg=(k,v,l)=>`<button data-dk="${k}:${v}" class="${(k==='cur'?S.dcur:S.ds)===v?'on':''}">${l}</button>`;
 return `<section class="card wide dbt"><div class="head"><div class="cur"><span>Debts &amp; part-payments · violet ledger</span><span class="code">${c} · DEBTS</span></div><div class="bal">${net>=0?'+':'−'}${fmt(c,Math.abs(net))}</div><div class="io"><div class="i">Owed to you<b>${fmt(c,got)}</b></div><div class="o">You owe<b>${fmt(c,ow)}</b></div><div class="net-dbt">Active records<b>${L.filter(d=>rem(d)>0).length} open</b></div></div></div>
 <div class="tb"><div class="seg">${sg('cur','AED','AED')}${sg('cur','INR','INR')}</div><div class="seg">${sg('st','open','Open')}${sg('st','done','Settled')}${sg('st','all','All')}</div><input id="dq" type="search" placeholder="Search person or notes" aria-label="Search debts" value="${esc(S.dq)}"></div>
 <div id="dlist" style="padding-bottom:10px">${dlist()}</div></section>`}

function fCntTxt(c){
 const t=ledger(c),mt=t.filter(inP),q=S.q.toLowerCase(),fl=S.f!=='all'||!!q;
 const m=fl?mt.filter(x=>(S.f==='all'||x.type===S.f)&&(!q||(x.cat+' '+x.note).toLowerCase().includes(q))):mt;
 const cnt=fl?`${m.length} of ${mt.length} ${mt.length===1?'entry':'entries'}`:`${mt.length} ${mt.length===1?'entry':'entries'}`;
 return (S.fh?pLab()+(fl?' (filtered)':'')+' · ':'')+cnt;
}

function widget(c){
 const t=ledger(c);
 const inc=sum(t,'in'),out=sum(t,'out');
 const ms=[...new Set([mk(0),S.mo,...t.map(x=>x.date.slice(0,7))])].sort().reverse();
 const pIn=ptot(t,'in'),pOut=ptot(t,'out'),pNet=r2(pIn-pOut);
 return `<section class="card ${c.toLowerCase()}${S.mini?' mini':''}"><div class="head"><div class="hg"><div class="hl"><div class="cur"><span>${c==='AED'?'UAE dirham':'Indian rupee · available'}</span><span class="cr"><span class="code">${c}</span><button class="ib tg" data-mn="1" aria-expanded="${!S.mini}" aria-label="${S.mini?'Show chart and debts':'Hide chart and debts'}" title="${S.mini?'Show chart and debts':'Hide chart and debts'}">${S.mini?IC.dn:IC.up}</button></span></div>
 <div class="bal">${fmt(c,r2((c==='INR'?OB.INR||0:0)+inc-out))}</div>
 <div class="io"><div class="i">Received · ${pShort()}<b>${fmt(c,pIn)}</b></div><div class="o">Spent · ${pShort()}<b>${fmt(c,pOut)}</b></div><div>Net · ${pShort()}<b>${pNet>=0?'+':'−'}${fmt(c,Math.abs(pNet))}</b></div></div>
 ${chart(t,c)}</div>${debts(c)}</div></div>
 <div class="lh${S.fh?' fh':''}"><div class="lc"><div class="seg pm">${[['month','Month'],['all','All time'],['range','Custom']].map(([v,l])=>`<button data-pm="${v}" class="${S.pm===v?'on':''}">${l}</button>`).join('')}</div>${S.pm==='range'?`<span class="rg"><input id="rf" type="text" readonly data-dp value="${S.rf}" aria-label="From date"><i>to</i><input id="rt" type="text" readonly data-dp value="${S.rt}" aria-label="To date"></span>`:S.pm==='all'?'':dd('mo','Month',ms.map(m=>{const n=t.filter(x=>x.date.slice(0,7)===m).length,net=r2(mtot(t,m,'in')-mtot(t,m,'out'));return{v:m,l:mlabel(m),s:n+(n===1?' entry':' entries'),r:(net>=0?'+':'\u2212')+fmt(c,Math.abs(net)),rc:net>=0?'in':'out'}}),S.mo)}</div><span class="lcnt">${fCntTxt(c)}</span><button class="ib tg vt" data-fl="1" aria-label="${S.fh?'Show filters':'Hide filters'}" aria-expanded="${!S.fh}" title="${S.fh?'Show filters':'Hide filters'}">${S.fh?IC.dn:IC.up}</button></div>
 <div class="tb${S.fh?' hid':''}"><input id="q" type="search" placeholder="Search category or notes" aria-label="Search" value="${esc(S.q)}">${dd('ft','Type filter',[{v:'all',l:'All types'},{v:'in',l:'Received',d:'var(--in)'},{v:'out',l:'Spent',d:'var(--out)'}],S.f)}</div>
 <div id="tbl">${tbl(c)}</div></section>`;
}

function render(){
 closeDd();
 const p=pendingCount(),on=online();
 $('#st').className='pill '+(S.busy?'sy':(on&&!S.err&&syncOn())||(!syncOn()&&on)?'':'off');
 $('#stx').textContent=statusText(p,on);
 $('#app').innerHTML=S.tab==='D'?debtsTab():widget(S.tab);
 document.querySelectorAll('.tabs button').forEach(b=>b.classList.toggle('on',b.dataset.t===S.tab));
 document.querySelectorAll('#vms [data-vm]').forEach(b=>b.classList.toggle('on',b.dataset.vm===S.vm));
 const lbl=S.tab==='D'?'Add debt':'Add entry',atx=$('#add-tx');if(atx){atx.textContent='Add';$('#add').setAttribute('aria-label',lbl);$('#add').setAttribute('title',lbl)}else $('#add').textContent='+ '+lbl;
}
let tt;function toast(m,u){const t=$('#toast');t.textContent=m;t.style.pointerEvents=u?'auto':'none';t.style.cursor=u?'pointer':'';t.onclick=u?()=>{u();t.classList.remove('show')}:null;t.classList.add('show');clearTimeout(tt);tt=setTimeout(()=>t.classList.remove('show'),u?5000:2400)}

function paint(){
 $('#dlg').style.setProperty('--acc',S.cur==='AED'?'var(--aed)':'var(--inr)');
 document.querySelectorAll('#sc button').forEach(b=>b.classList.toggle('on',b.dataset.v===S.cur));
 document.querySelectorAll('#sty button').forEach(b=>b.classList.toggle('on',b.dataset.v===S.type));
 const L=catsFor(S.type);if(S.eid){const x=S.tx.find(t=>t.id===S.eid);if(x&&x.type===S.type&&!L.includes(x.cat))L.push(x.cat)}
 if(!L.includes(S.cat))S.cat=L[0]||'';
 $('#ch').innerHTML=L.map(c=>`<button class="${c===S.cat?'on':''}" data-c="${esc(c)}">${esc(c)}</button>`).join('');
}
function openEdit(id){const x=S.tx.find(t=>t.id===id);if(!x)return;S.eid=id;S.cur=x.cur;S.type=x.type;S.cat=x.cat;$('#dh').textContent='Edit entry';$('#sv').textContent='Save changes';$('#am').value=x.amt;$('#nt').value=x.note||'';$('#dt').value=x.date;$('#er').textContent='';paint();$('#dlg').showModal()}
function del(id){const x=S.tx.find(t=>t.id===id);if(!x)return;x.del=true;x.synced=false;x.ver=(x.ver||1)+1;save();render();sync();
 toast('Entry deleted. Tap to undo.',()=>{x.del=false;x.synced=false;x.ver=(x.ver||1)+1;save();render();sync()})}
$('#add').onclick=()=>{if(S.tab==='D'){openDb();return}S.eid=null;$('#dh').textContent='New entry';$('#sv').textContent='Save entry';S.cur=S.tab;$('#am').value='';$('#nt').value='';$('#dt').value=iso(0);$('#er').textContent='';paint();$('#dlg').showModal();$('#am').focus()};
if($('#vmd'))$('#vmd').onclick=e=>{
 const dock=$('#vmd'),arr=$('#vmt');
 if(e.target.closest('#vmt')){const col=dock.classList.toggle('col');if(arr)arr.setAttribute('aria-expanded',!col);return}
 const b=e.target.closest('[data-vm]');
 if(!b)return;
 if(dock.classList.contains('col')){dock.classList.remove('col');if(arr)arr.setAttribute('aria-expanded','true');return}
 S.vm=b.dataset.vm;STORE.setItem('ledger.vm',S.vm);dock.classList.add('col');if(arr)arr.setAttribute('aria-expanded','false');render();toast('View: '+({auto:'Auto',cards:'Cards',table:'Table'}[S.vm]||S.vm));
};
$('#cx').onclick=()=>$('#dlg').close();
$('#sc').onclick=e=>{if(e.target.dataset.v){S.cur=e.target.dataset.v;paint()}};
$('#sty').onclick=e=>{if(e.target.dataset.v){S.type=e.target.dataset.v;paint()}};
$('#ch').onclick=e=>{if(e.target.dataset.c){S.cat=e.target.dataset.c;paint()}};
$('#sv').onclick=()=>{
 const amt=parseFloat($('#am').value),date=$('#dt').value;
 if(!(amt>0)){$('#er').textContent='Enter an amount greater than 0.';return}
 if(!date){$('#er').textContent='Pick a date.';return}
 if(!S.cat){$('#er').textContent='No category allows this type. Add one in Categories.';return}
 const f={cur:S.cur,date,type:S.type,amt:Math.round(amt*100)/100,cat:S.cat,note:$('#nt').value.trim(),synced:false};
 const ex=S.eid&&S.tx.find(t=>t.id===S.eid);
 if(ex){
  if(ex.cur!==f.cur||ex.date!==f.date||ex.type!==f.type||ex.amt!==f.amt||ex.cat!==f.cat||(ex.note||'')!==f.note){
   logHist({kind:'tx',targetId:ex.id,label:`${f.cat} · ${fmt(f.cur,f.amt)}`,sub:`Was ${fmt(ex.cur,ex.amt)} · ${ex.cat} (${ex.date})`,prev:{cur:ex.cur,date:ex.date,type:ex.type,amt:ex.amt,cat:ex.cat,note:ex.note||''}});
  }
  Object.assign(ex,f,{ver:(ex.ver||1)+1});
 }else S.tx.push({id:uid(),ts:Date.now(),ver:1,...f});
 S.tab=S.cur=f.cur;S.pg=1;
 S.mo=date.slice(0,7);if(S.pm==='range'&&(date<S.rf||date>S.rt))S.pm='month';save();$('#dlg').close();render();
 toast(syncOn()?(online()?'Saved. Syncing…':'Saved offline. Will sync when online.'):'Saved on this device');sync();
};
document.querySelector('.tabs').onclick=e=>{const t=e.target.dataset.t;if(!t)return;S.tab=t;if(t!=='D')S.cur=t;render()};

// Redesigned Compact Category Manager
let CMF='all',NT='out';
const TLAB={out:'Spent',in:'Received',both:'Both'};
const TNEXT={out:'in',in:'both',both:'out'};
function renderCm(){
 const active=CT.filter(c=>!c.del);
 if($('#cm-cnt'))$('#cm-cnt').textContent=active.length+' active';
 if($('#cm-f'))document.querySelectorAll('#cm-f button').forEach(b=>b.classList.toggle('on',b.dataset.f===CMF));
 const shown=CT.map((c,i)=>({c,i})).filter(x=>!x.c.del&&(CMF==='all'||x.c.t===CMF));
 $('#cl').innerHTML=shown.map(({c,i})=>`<div class="crow2"><input type="text" data-n="${i}" value="${esc(c.n)}" aria-label="Category name"><button type="button" class="tp-btn ${c.t}" data-cyc="${i}" title="Tap to switch type">${TLAB[c.t]} ↻</button><button type="button" class="ib d" style="width:30px;height:30px;margin:0" data-x="${i}" aria-label="Delete category" title="Delete">${IC.d}</button></div>`).join('')||'<div class="empty" style="padding:14px">No categories in this filter.</div>';
}
if($('#cm-f'))$('#cm-f').onclick=e=>{const f=e.target.dataset.f;if(!f)return;CMF=f;renderCm()};
if($('#em-bar'))$('#em-bar').onclick=e=>{const b=e.target.closest('[data-em]');if(!b)return;const em=b.dataset.em,inp=$('#cn');inp.value=em+' '+inp.value.replace(/^[\p{Emoji}\u200d\ufe0f]+\s*/u,'');inp.focus()};
$('#ct').onclick=e=>{const v=e.target.dataset.v;if(!v)return;NT=v;document.querySelectorAll('#ct button').forEach(b=>b.classList.toggle('on',b.dataset.v===v))};
$('#cl').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;const d=b.dataset;
 if(d.cyc!==undefined){const c=CT[+d.cyc];c.t=TNEXT[c.t]||'out'}
 else if(d.x!==undefined){if(CT.filter(x=>!x.del).length<2){$('#ce').textContent='Keep at least 2 categories.';return}CT[+d.x].del=1}
 else return;
 saveC();renderCm();paint()});
let ST_TAB='cats';
function openSettings(tab){
 ST_TAB=tab||'cats';CMF='all';renderCm();
 if(typeof renderSettingsTab==='function')renderSettingsTab();
 if($('#ce'))$('#ce').textContent='';
 if($('#cm')&&!$('#cm').open)$('#cm').showModal();
}
if($('#st-tabs'))$('#st-tabs').onclick=e=>{const b=e.target.closest('[data-st]');if(!b)return;ST_TAB=b.dataset.st;if(typeof renderSettingsTab==='function')renderSettingsTab()};
$('#cmb').onclick=()=>openSettings('cats');
$('#cc').onclick=()=>$('#cm').close();

function openOb(){$('#obv').value=OB.INR||'';$('#obe').textContent='';$('#obd').showModal();$('#obv').focus()}
$('#obs').onclick=()=>{const v=parseFloat($('#obv').value);if(isNaN(v)){$('#obe').textContent='Enter an amount (0 is fine).';return}OB.INR=r2(v);bumpCalc();try{STORE.setItem(LO,JSON.stringify(OB))}catch(e){}stamp();schedSync();$('#obd').close();render();toast('Opening balance saved')};
$('#obc').onclick=()=>$('#obd').close();
let DD='lent';

function openDb(id){const d=id&&DB.find(x=>x.id===id);S.did=d?d.id:null;DD=d?d.dir:'lent';document.querySelectorAll('#dbs button').forEach(b=>b.classList.toggle('on',b.dataset.v===DD));$('#dbh').textContent=d?'Edit debt':'Add debt';$('#dbw').value=d?d.who:'';$('#dba').value=d?d.amt:'';$('#dbn').value=d?d.note:'';$('#dbt').value=d?d.date:iso(0);$('#dbe').textContent='';$('#dbd').style.setProperty('--acc','var(--dbt)');$('#dbd').showModal();$('#dbw').focus()}
$('#dbs').onclick=e=>{const v=e.target.dataset.v;if(!v)return;DD=v;document.querySelectorAll('#dbs button').forEach(b=>b.classList.toggle('on',b.dataset.v===v))};
$('#dbc').onclick=()=>$('#dbd').close();
$('#dbv').onclick=()=>{const w=$('#dbw').value.trim(),a=parseFloat($('#dba').value),dt=$('#dbt').value,d=S.did&&DB.find(x=>x.id===S.did),nt=$('#dbn').value.trim();
 if(!w){$('#dbe').textContent='Enter a name.';return}
 if(!(a>0)){$('#dbe').textContent='Enter an amount greater than 0.';return}
 if(!dt){$('#dbe').textContent='Pick a date.';return}
 if(d&&a<paid(d)){$('#dbe').textContent='Amount can’t be less than the '+fmt(d.cur,paid(d))+' already paid.';return}
 if(d){
  if(d.who!==w||d.amt!==r2(a)||d.dir!==DD||(d.note||'')!==nt||d.date!==dt){
   logHist({kind:'debt',targetId:d.id,label:`Debt · ${w} (${fmt(d.cur,r2(a))})`,sub:`Was ${d.who} · ${fmt(d.cur,d.amt)} (${d.date})`,prev:{who:d.who,amt:d.amt,dir:d.dir,note:d.note||'',date:d.date}});
  }
  Object.assign(d,{who:w,amt:r2(a),dir:DD,note:nt,date:dt});
 }else DB.push({id:uid(),cur:S.dcur,who:w,amt:r2(a),dir:DD,note:nt,date:dt,ts:Date.now(),pays:[]});
 dsave();$('#dbd').close();render();toast(d?'Debt updated':'Debt saved')};
function openPay(id){const d=DB.find(x=>x.id===id);if(!d)return;S.did=id;$('#pyh').textContent=d.who+' · remaining '+fmt(d.cur,rem(d));$('#pya').value='';$('#pyt').value=iso(0);$('#pyn').value='';$('#pye').textContent='';$('#pyd').style.setProperty('--acc','var(--dbt)');$('#pyd').showModal();$('#pya').focus()}
$('#pyf').onclick=()=>{const d=DB.find(x=>x.id===S.did);if(d)$('#pya').value=rem(d)};
$('#pyc').onclick=()=>$('#pyd').close();
$('#pys').onclick=()=>{const d=DB.find(x=>x.id===S.did),a=parseFloat($('#pya').value),t=$('#pyt').value;if(!d)return;
 if(!(a>0)){$('#pye').textContent='Enter an amount greater than 0.';return}
 if(r2(a)>rem(d)){$('#pye').textContent='That is more than the remaining '+fmt(d.cur,rem(d))+'.';return}
 if(!t){$('#pye').textContent='Pick a date.';return}
 d.pays.push({id:uid(),amt:r2(a),date:t,note:$('#pyn').value.trim()});S.xp[d.id]=1;dsave();$('#pyd').close();render();toast(rem(d)<=0?'Fully paid':'Payment saved. Remaining '+fmt(d.cur,rem(d)))};

// Backup & Restore handlers
const dlFile=(name,type,content)=>{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([content],{type}));a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)};
if($('#bkb'))$('#bkb').onclick=()=>{if($('#bke'))$('#bke').textContent='';if($('#bk-file'))$('#bk-file').value='';if($('#bkd'))$('#bkd').showModal()};
if($('#bkc'))$('#bkc').onclick=()=>$('#bkd').close();
if($('#bk-csv'))$('#bk-csv').onclick=()=>{
 const rows=[['ID','Date','Currency','Type','Amount','Category','Notes']];
 S.tx.filter(x=>!x.del).sort((a,b)=>b.date.localeCompare(a.date)).forEach(x=>{
  rows.push([x.id,x.date,x.cur,x.type==='in'?'Received':'Spent',x.amt,x.cat,x.note||'']);
 });
 const csv=rows.map(r=>r.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n');
 dlFile(`daily-ledger-${iso(0)}.csv`,'text/csv;charset=utf-8',csv);
 toast('CSV exported');
};
if($('#bk-json'))$('#bk-json').onclick=()=>{
 const payload=JSON.stringify({version:13,exported_at:new Date().toISOString(),tx:S.tx,cats:CT,debts:DB,diary:DR,diary_verifier:DRV,hist:HIST,ob:OB},null,2);
 dlFile(`daily-ledger-backup-${iso(0)}.json`,'application/json',payload);
 toast('JSON backup downloaded');
};
if($('#bk-file'))$('#bk-file').onchange=async e=>{
 const f=e.target.files&&e.target.files[0];if(!f)return;
 try{
  const j=JSON.parse(await f.text());
  if(!Array.isArray(j.tx))throw new Error('Invalid backup file');
  const tsNow=now();
  const txIds=new Set(j.tx.map(x=>x.id));
  const delTx=S.tx.filter(x=>x.id&&!txIds.has(x.id)).map(x=>Object.assign({},x,{del:true,upd:tsNow,ver:(x.ver||1)+1,synced:false}));
  S.tx=j.tx.map(x=>Object.assign({},x,{upd:tsNow})).concat(delTx);
  if(Array.isArray(j.cats)){
   j.cats.forEach(c=>{if(!c.id)c.id='c_'+hs(c.n.toLowerCase());c.upd=tsNow});
   const ctIds=new Set(j.cats.map(c=>c.id));
   const delCt=CT.filter(c=>c.id&&!ctIds.has(c.id)).map(c=>Object.assign({},c,{del:1,upd:tsNow}));
   CT=j.cats.concat(delCt);
  }
  if(Array.isArray(j.debts)){
   const dbIds=new Set(j.debts.map(d=>d.id));
   const oldDbMap={};DB.forEach(d=>{if(d.id)oldDbMap[d.id]=d});
   const delDb=DB.filter(d=>d.id&&!dbIds.has(d.id)).map(d=>Object.assign({},d,{del:1,upd:tsNow,pays:(d.pays||[]).map(p=>Object.assign({},p,{del:1,upd:tsNow}))}));
   DB=j.debts.map(d=>{
    const pays=Array.isArray(d.pays)?d.pays:[];
    const pIds=new Set(pays.map(p=>p.id));
    const oldPays=(oldDbMap[d.id]&&oldDbMap[d.id].pays)||[];
    const delPays=oldPays.filter(p=>p.id&&!pIds.has(p.id)).map(p=>Object.assign({},p,{del:1,upd:tsNow}));
    return Object.assign({},d,{upd:tsNow,pays:pays.map(p=>Object.assign({},p,{upd:tsNow})).concat(delPays)});
   }).concat(delDb);
  }
  if(Array.isArray(j.diary)){
   const drIds=new Set(j.diary.map(d=>d.id));
   const delDr=DR.filter(d=>d.id&&!drIds.has(d.id)).map(d=>Object.assign({},d,{del:1,upd:tsNow}));
   DR=j.diary.map(d=>Object.assign({},d,{upd:tsNow})).concat(delDr);
  }
  if(j.diary_verifier&&j.diary_verifier.v){
   DRV=Object.assign({v:'',hint:'',upd:tsNow},j.diary_verifier,{upd:tsNow});
   lockDiary();
  }
  if(Array.isArray(j.hist)){HIST=j.hist;saveHist()}
  if(j.ob)OB=Object.assign({},j.ob,{upd:tsNow});
  Object.keys(LAST).forEach(k=>delete LAST[k]);
  bumpCalc();stamp();persist();$('#bkd').close();render();sync();toast('Backup restored');
 }catch(err){if($('#bke'))$('#bke').textContent='Could not read backup JSON.'}
};

$('#app').addEventListener('input',e=>{if(e.target.id==='dq'){S.dq=e.target.value;$('#dlist').innerHTML=dlist()}});
$('#app').addEventListener('click',e=>{const b=e.target.closest('[data-dk]');if(!b)return;const[a,i,j]=b.dataset.dk.split(':');
 if(a==='manage'){S.dcur=S.tab;S.tab='D';render()}
 else if(a==='cur'){S.dcur=i;render()}else if(a==='st'){S.ds=i;render()}
 else if(a==='add')openDb();else if(a==='edit')openDb(i);else if(a==='pay')openPay(i);
 else if(a==='xp'){S.xp[i]=!S.xp[i];render()}
 else if(a==='del'){const d=DB.find(x=>x.id===i);if(!d)return;d.del=1;dsave();render();toast('Debt deleted. Tap to undo.',()=>{d.del=0;dsave();render()})}
 else if(a==='dp'){const d=DB.find(x=>x.id===i),k=d?d.pays.findIndex(y=>y.id===j):-1;if(k<0)return;const y=d.pays[k];y.del=1;dsave();render();toast('Payment removed. Tap to undo.',()=>{y.del=0;dsave();render()})}});
$('#cl').addEventListener('change',e=>{const el=e.target,d=el.dataset;
 if(d.n!==undefined){const c=CT[+d.n],nn=el.value.trim(),oldN=c.n;
  if(!nn||CT.some((x,j)=>j!==+d.n&&!x.del&&x.n.toLowerCase()===nn.toLowerCase())){el.value=c.n;$('#ce').textContent='Name is empty or already used.';return}
  if(oldN!==nn){
   logHist({kind:'cat',targetId:c.id||oldN,oldName:oldN,newName:nn,label:`Category "${oldN}" → "${nn}"`,sub:`Renamed category`});
   S.tx.forEach(x=>{if(x.cat===oldN){x.cat=nn;x.synced=false;x.ver=(x.ver||1)+1}});
   c.n=nn;save();render();sync();
  }
 }
 saveC();$('#ce').textContent=''});
$('#ca').onclick=()=>{const n=$('#cn').value.trim();
 if(!n){$('#ce').textContent='Enter a category name.';return}
 if(CT.some(x=>!x.del&&x.n.toLowerCase()===n.toLowerCase())){$('#ce').textContent='That category already exists.';return}
 const rv=CT.find(x=>x.del&&x.n.toLowerCase()===n.toLowerCase());if(rv){rv.del=0;rv.t=NT}else CT.push({n,t:NT,a:1});saveC();$('#cn').value='';$('#ce').textContent='';renderCm();paint();toast('Category added')};
$('#app').addEventListener('change',e=>{const i=e.target.id;if(i==='mo')S.mo=e.target.value;else if(i==='ft')S.f=e.target.value;else if(i==='pp')S.pp=+e.target.value;else if(i==='rf')S.rf=e.target.value;else if(i==='rt')S.rt=e.target.value;else return;if(S.rf>S.rt){const z=S.rf;S.rf=S.rt;S.rt=z}S.pg=1;render()});
$('#app').addEventListener('input',e=>{if(e.target.id==='q'){S.q=e.target.value;S.pg=1;$('#tbl').innerHTML=tbl(S.tab);const lc=$('.lcnt');if(lc)lc.textContent=fCntTxt(S.tab)}});
$('#app').addEventListener('click',e=>{const o=e.target.closest('.ddo'),h=e.target.closest('.ddb');
 if(o){const id=o.closest('.dd').dataset.dd,v=o.dataset.v;closeDd();if(id==='mo')S.mo=v;else if(id==='ft')S.f=v;else if(id==='pp')S.pp=+v;S.pg=1;render();return}
 if(h){const p=h.parentNode,was=p.classList.contains('open');closeDd();if(!was){p.classList.add('open');h.setAttribute('aria-expanded','true')}return}
 const b=e.target.closest&&e.target.closest('[data-m],[data-p],[data-e],[data-d],[data-ob],[data-pm],[data-mn],[data-ra],[data-fl],[data-vm],[data-cf],[data-drd]');if(!b)return;const d=b.dataset;
 if(d.drd){openDiary(d.drd);return}
 if(d.m){S.mo=d.m;S.pm='month';S.pg=1;render()}
 else if(d.pm){S.pm=d.pm;S.pg=1;render()}
 else if(d.vm){S.vm=d.vm;STORE.setItem('ledger.vm',S.vm);render()}
 else if(d.cf){S.q=S.q===d.cf?'':d.cf;S.pg=1;render()}
 else if(d.mn!==undefined){S.mini=!S.mini;render()}
 else if(d.fl!==undefined){S.fh=!S.fh;render()}
 else if(d.ra!==undefined){const tr=b.closest('tr');document.querySelectorAll('#tbl tr.ro').forEach(r=>{if(r!==tr){r.classList.remove('ro');const q=r.querySelector('.ra');if(q){q.setAttribute('aria-expanded','false');q.setAttribute('aria-label','Show actions')}}});const o=tr.classList.toggle('ro');b.setAttribute('aria-expanded',o);b.setAttribute('aria-label',o?'Hide actions':'Show actions')}
 else if(d.p){S.pg+=+d.p;$('#tbl').innerHTML=tbl(S.tab)}
 else if(d.e)openEdit(d.e)
 else if(d.d)del(d.d)
 else if(d.ob!==undefined)openOb()});
IC.pl=SV+'<path d="M15 6l-6 6 6 6"/></svg>';IC.nx=SV+'<path d="M9 6l6 6-6 6"/></svg>';
const cal=document.createElement('div');cal.className='cal';cal.hidden=true;document.body.appendChild(cal);
let CI=null,CY=0,CM=0;
function calDraw(){const first=new Date(CY,CM,1),lead=(first.getDay()+6)%7,days=new Date(CY,CM+1,0).getDate(),sel=CI.value,today=iso(0);
 let h=`<div class="ch2"><button type="button" class="ib" data-cn="-1" aria-label="Previous month">${IC.pl}</button><b>${first.toLocaleDateString('en',{month:'long',year:'numeric'})}</b><button type="button" class="ib" data-cn="1" aria-label="Next month">${IC.nx}</button></div><div class="cg">${['M','T','W','T','F','S','S'].map(x=>`<i class="wd">${x}</i>`).join('')}${'<i></i>'.repeat(lead)}`;
 for(let d=1;d<=days;d++){const s=CY+'-'+String(CM+1).padStart(2,'0')+'-'+String(d).padStart(2,'0');h+=`<button type="button" class="cd${s===sel?' on':''}${s===today?' td':''}" data-cd="${s}">${d}</button>`}
 cal.innerHTML=h+`</div><div class="cf"><button type="button" class="ghost" data-cd="${today}">Today</button></div>`}
function calOpen(inp){CI=inp;const [y,m]=(inp.value||iso(0)).split('-').map(Number);CY=y;CM=m-1;(inp.closest('dialog')||document.body).appendChild(cal);cal.hidden=false;calDraw();
 const r=inp.getBoundingClientRect(),h=cal.offsetHeight;let t=r.bottom+6;if(t+h>innerHeight-8)t=Math.max(8,r.top-h-6);cal.style.left=Math.min(Math.max(8,r.left),innerWidth-298)+'px';cal.style.top=t+'px'}
document.addEventListener('click',e=>{const dp=e.target.closest('[data-dp]');if(dp){calOpen(dp);return}
 if(e.target.closest('.cal')){const n=e.target.closest('[data-cn]'),d=e.target.closest('[data-cd]');
  if(n){CM+=+n.dataset.cn;if(CM<0){CM=11;CY--}if(CM>11){CM=0;CY++}calDraw()}
  else if(d){CI.value=d.dataset.cd;cal.hidden=true;CI.dispatchEvent(new Event('change',{bubbles:true}))}
  return}
 cal.hidden=true});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!cal.hidden){e.preventDefault();cal.hidden=true}
 if((e.key==='Enter'||e.key===' ')&&e.target.matches&&e.target.matches('[data-dp]')){e.preventDefault();calOpen(e.target)}});
addEventListener('online',()=>{render();sync()});addEventListener('offline',render);

// ---- Zero-Knowledge AES-256-GCM Daily Diary Vault (Wrapped 256-bit Master DEK + Security Question Recovery) ----
const tEnc=new TextEncoder(),tDec=new TextDecoder();
const b64e=buf=>{let s='';const u=new Uint8Array(buf);for(let i=0;i<u.length;i++)s+=String.fromCharCode(u[i]);return btoa(s)};
const b64d=str=>{const b=atob(str),u=new Uint8Array(b.length);for(let i=0;i<b.length;i++)u[i]=b.charCodeAt(i);return u};
const normAns=s=>String(s||'').trim().toLowerCase().replace(/\s+/g,' ');
let DIARY_KEY=null,DIARY_DEK_B64='',DIARY_CACHE={},drDate=iso(0),drChPw=false,drRec=false,drLockTm=null,drBgJob=0;
async function deriveDiaryKey(secret,saltBytes){
 const bk=await crypto.subtle.importKey('raw',tEnc.encode(secret),'PBKDF2',false,['deriveKey']);
 return crypto.subtle.deriveKey({name:'PBKDF2',salt:saltBytes,iterations:100000,hash:'SHA-256'},bk,{name:'AES-GCM',length:256},false,['encrypt','decrypt']);
}
async function importRawDek(b64){
 return crypto.subtle.importKey('raw',b64d(b64),{name:'AES-GCM'},false,['encrypt','decrypt']);
}
async function encDiaryObj(key,obj){
 const iv=crypto.getRandomValues(new Uint8Array(12));
 const ct=await crypto.subtle.encrypt({name:'AES-GCM',iv},key,tEnc.encode(JSON.stringify(obj)));
 return b64e(iv)+':'+b64e(ct);
}
async function decDiaryObj(key,cipherStr){
 const i=String(cipherStr||'').indexOf(':');
 if(i<1)throw new Error('bad cipher');
 const iv=b64d(cipherStr.slice(0,i)),ct=b64d(cipherStr.slice(i+1));
 const pt=await crypto.subtle.decrypt({name:'AES-GCM',iv},key,ct);
 return JSON.parse(tDec.decode(pt));
}
async function wrapDekWithSecret(secret,dekB64){
 const salt=crypto.getRandomValues(new Uint8Array(16));
 const kek=await deriveDiaryKey(secret,salt);
 const ct=await encDiaryObj(kek,{check:'DAILY_LEDGER_DIARY_OK',dek:dekB64});
 return b64e(salt)+':'+ct;
}
async function unwrapDekWithSecret(secret,wrappedStr){
 const raw=String(wrappedStr||''),idx=raw.indexOf(':');
 if(idx<1)throw new Error('corrupt verifier');
 const salt=b64d(raw.slice(0,idx)),vCt=raw.slice(idx+1);
 const kek=await deriveDiaryKey(secret,salt);
 const chk=await decDiaryObj(kek,vCt);
 if(!chk||chk.check!=='DAILY_LEDGER_DIARY_OK')throw new Error('mismatch');
 if(chk.dek){
  return {key:await importRawDek(chk.dek),dekB64:chk.dek,legacy:false};
 }
 return {key:kek,dekB64:'',legacy:true};
}
// Instant first-paint decryption (<2ms for current date + top 20 sidebar dates), followed by non-blocking background chunks for multi-year scale
async function decryptDiaryFast(){
 if(!DIARY_KEY)return;
 const job=++drBgJob,key=DIARY_KEY;
 const active=DR.filter(r=>!r.del&&r.cipher).sort((a,b)=>b.date.localeCompare(a.date));
 const urgent=active.filter(r=>r.date===drDate).concat(active.filter(r=>r.date!==drDate).slice(0,20));
 for(const r of urgent){
  if(job!==drBgJob||!DIARY_KEY)return;
  if(!DIARY_CACHE[r.date]){try{DIARY_CACHE[r.date]=await decDiaryObj(key,r.cipher)}catch(e){}}
 }
 const rest=active.slice(20);
 if(!rest.length)return;
 let i=0;
 const step=async()=>{
  if(job!==drBgJob||!DIARY_KEY)return;
  const end=Math.min(i+50,rest.length);
  for(;i<end;i++){
   const r=rest[i];
   if(!DIARY_CACHE[r.date]){try{DIARY_CACHE[r.date]=await decDiaryObj(key,r.cipher)}catch(e){}}
  }
  if(job!==drBgJob||!DIARY_KEY)return;
  if($('#drd')&&$('#drd').open&&!drChPw&&!drRec)renderDiarySidebar();
  if(i<rest.length)setTimeout(step,0);
 };
 setTimeout(step,10);
}
function syncDiaryDot(){
 const un=!!DIARY_KEY;
 if($('#dr-dot'))$('#dr-dot').classList.toggle('on',un);
 if($('#dr-st')){$('#dr-st').className='dr-st '+(un?'un':'lk');$('#dr-st').textContent=un?'UNLOCKED':'LOCKED'}
 if($('#dr-lk-btn'))$('#dr-lk-btn').hidden=!un;
}
async function autoSaveDiaryIfDirty(){
 if(!DIARY_KEY||!$('#dr-ttl')||!$('#dr-bdy'))return false;
 const title=$('#dr-ttl').value.trim(),body=$('#dr-bdy').value.trim();
 const cur=DIARY_CACHE[drDate]||{title:'',body:''};
 if(title===(cur.title||'')&&body===(cur.body||''))return false;
 if(!title&&!body&&!hasDiary(drDate))return false;
 const plain={title:title||'Daily note',body};
 const cipher=await encDiaryObj(DIARY_KEY,plain);
 const id='dry_'+drDate,ts=now();
 let rec=DR.find(x=>x.id===id);
 if(rec){
  if(!rec.del&&rec.cipher)logHist({kind:'diary',targetId:rec.id,date:drDate,label:`Diary Note · ${drDate}`,sub:`Previous encrypted version saved`,prevCipher:rec.cipher});
  Object.assign(rec,{date:drDate,cipher,del:0,upd:ts});
 }else DR.push({id,date:drDate,cipher,del:0,upd:ts});
 DIARY_CACHE[drDate]=plain;
 drsave();render();
 return true;
}
function lockDiary(){
 drBgJob++;DIARY_KEY=null;DIARY_DEK_B64='';DIARY_CACHE={};drChPw=false;drRec=false;
 if($('#dr-ttl'))$('#dr-ttl').value='';
 if($('#dr-bdy'))$('#dr-bdy').value='';
 if($('#dr-list'))$('#dr-list').innerHTML='';
 if($('#dr-sum'))$('#dr-sum').innerHTML='';
 if($('#dr-upw'))$('#dr-upw').value='';
 syncDiaryDot();
}
let dayTxMemo={ver:-1,map:new Map()},drShowAll=false;
function dayLedgerSummary(dt){
 if(dayTxMemo.ver!==calcVer){
  const m=new Map();
  for(let i=0;i<S.tx.length;i++){
   const x=S.tx[i];if(x.del)continue;
   let g=m.get(x.date);
   if(!g){g={list:[],AED:{in:0,out:0},INR:{in:0,out:0}};m.set(x.date,g)}
   g.list.push(x);
   if(g[x.cur])g[x.cur][x.type]=r2(g[x.cur][x.type]+x.amt);
  }
  dayTxMemo={ver:calcVer,map:m};
 }
 return dayTxMemo.map.get(dt)||{list:[],AED:{in:0,out:0},INR:{in:0,out:0}};
}
function renderDiarySidebar(){
 if(!$('#dr-list'))return;
 const q=($('#dr-q')&&$('#dr-q').value||'').trim().toLowerCase();
 const allDates=Array.from(new Set([...drDates,drDate])).sort().reverse();
 const matched=q?allDates.filter(dt=>{const n=DIARY_CACHE[dt]||{title:'',body:''};return dt.includes(q)||(n.title||'').toLowerCase().includes(q)||(n.body||'').toLowerCase().includes(q)}):allDates;
 const slice=(!q&&!drShowAll&&matched.length>60)?matched.slice(0,60):matched;
 if(slice.length<matched.length&&!slice.includes(drDate))slice.unshift(drDate);
 $('#dr-list').innerHTML=slice.map(dt=>{
  const n=DIARY_CACHE[dt]||{title:'',body:''},saved=hasDiary(dt);
  const sm=dayLedgerSummary(dt),fp=[];
  if(sm.AED.out||sm.AED.in)fp.push('AED −'+sm.AED.out);
  if(sm.INR.out||sm.INR.in)fp.push('₹ −'+sm.INR.out);
  const dtStr=new Date(dt+'T00:00').toLocaleDateString('en',{day:'2-digit',month:'short',year:'numeric'});
  return `<button type="button" class="dr-item${dt===drDate?' on':''}" data-dr-item="${dt}"><div class="dr-item-top"><span>${dtStr}</span><span>${saved?'🔒 AES':'New'}</span></div><b>${esc(n.title||(saved?'Saved note':'No note yet'))}</b><small>${esc(fp.join(' · ')||'No ledger entries')}</small></button>`;
 }).join('')+(slice.length<matched.length?`<button type="button" class="ghost" data-dr-more="1" style="font-size:12px;padding:7px">Show all ${matched.length} dates</button>`:'')||'<div class="hint" style="padding:8px">No matching diary notes.</div>';
}
async function renderDiaryDate(keepInputs){
 if($('#dr-dt'))$('#dr-dt').value=drDate;
 const sm=dayLedgerSummary(drDate);
 const dtLabel=new Date(drDate+'T00:00').toLocaleDateString('en',{weekday:'short',day:'2-digit',month:'short',year:'numeric'});
 if($('#dr-sum')){
  $('#dr-sum').innerHTML=`<div class="dr-sum-hd"><span>Auto-linked spending · ${esc(dtLabel)}</span><span>${sm.list.length} ${sm.list.length===1?'entry':'entries'}</span></div>
   <div class="dr-sum-grid">
    <div class="dr-sum-box"><span class="code" style="--acc:var(--aed)">AED</span><div class="num" style="text-align:right"><div style="color:var(--out)">Spent: ${fmt('AED',sm.AED.out)}</div><div style="color:var(--in)">In: +${fmt('AED',sm.AED.in)}</div></div></div>
    <div class="dr-sum-box"><span class="code" style="--acc:var(--inr)">INR</span><div class="num" style="text-align:right"><div style="color:var(--out)">Spent: ${fmt('INR',sm.INR.out)}</div><div style="color:var(--in)">In: +${fmt('INR',sm.INR.in)}</div></div></div>
   </div>
   ${sm.list.length?`<div class="dr-sum-tx">${sm.list.map(x=>`<div class="dr-sum-r"><span><b>${esc(x.cat)}</b>${x.note?' · '+esc(x.note):''}</span><span class="num amt ${x.type}">${x.type==='out'?'−':'+'}${fmt(x.cur,x.amt)}</span></div>`).join('')}</div>`:`<div class="hint" style="font-size:12px">No AED or INR transactions recorded on ${esc(drDate)}.</div>`}`;
 }
 const rec=DR.find(x=>!x.del&&x.date===drDate&&x.cipher);
 if(rec&&DIARY_KEY&&!DIARY_CACHE[drDate]){
  try{DIARY_CACHE[drDate]=await decDiaryObj(DIARY_KEY,rec.cipher)}catch(e){}
 }
 const n=DIARY_CACHE[drDate]||{title:'',body:''};
 if(!keepInputs){
  if($('#dr-ttl'))$('#dr-ttl').value=n.title||'';
  if($('#dr-bdy'))$('#dr-bdy').value=n.body||'';
 }
 if($('#dr-del'))$('#dr-del').hidden=!rec;
 if($('#dr-meta'))$('#dr-meta').textContent=rec?`Encrypted AES-256-GCM · Updated ${new Date(rec.upd).toLocaleTimeString('en',{hour:'numeric',minute:'2-digit'})}`:'AES-256-GCM · Not saved yet';
}
function syncQuestionSelect(selId,inpId,val){
 const sel=$(selId),inp=$(inpId);
 if(!sel||!inp)return;
 if(val!==undefined){
  const hasOpt=Array.from(sel.options).some(o=>o.value===val&&o.value!=='custom'&&o.value!=='');
  if(hasOpt){sel.value=val;inp.value='';inp.hidden=true}
  else if(val){sel.value='custom';inp.value=val;inp.hidden=false}
  else{sel.value=sel.options[0].value;inp.value='';inp.hidden=true}
 }else{
  inp.hidden=(sel.value!=='custom');
 }
}
function getQuestionVal(selId,inpId){
 const sel=$(selId),inp=$(inpId);
 if(!sel)return inp?inp.value.trim():'';
 return sel.value==='custom'?(inp?inp.value.trim():''):sel.value.trim();
}
if($('#dr-cq-sel'))$('#dr-cq-sel').onchange=()=>{syncQuestionSelect('#dr-cq-sel','#dr-cq');if($('#dr-cq')&&!$('#dr-cq').hidden)$('#dr-cq').focus()};

let HIF='all';
function buildHistoryItems(){
 const items=[];
 S.tx.forEach(x=>{
  if(x.del)items.push({mode:'del',kind:'tx',id:x.id,ts:x.upd||new Date(x.ts||Date.now()).toISOString(),tag:'Transaction',title:`${x.cat} · ${x.type==='out'?'−':'+'}${fmt(x.cur,x.amt)}`,sub:`${x.date}${x.note?' · '+x.note:''}`});
 });
 DB.forEach(d=>{
  if(d.del)items.push({mode:'del',kind:'debt',id:d.id,ts:d.upd||new Date(d.ts||Date.now()).toISOString(),tag:'Debt',title:`${d.who} · ${fmt(d.cur,d.amt)}`,sub:`${d.dir==='lent'?'They owe me':'I owe them'} · ${d.date}${d.note?' · '+d.note:''}`});
  else (d.pays||[]).forEach(p=>{
   if(p.del)items.push({mode:'del',kind:'pay',id:p.id,did:d.id,ts:p.upd||d.upd||now(),tag:'Payment',title:`${d.who} · ${fmt(d.cur,p.amt)}`,sub:`Part-payment on ${p.date}${p.note?' · '+p.note:''}`});
  });
 });
 CT.forEach((c,idx)=>{
  if(c.del)items.push({mode:'del',kind:'cat',id:String(idx),ts:c.upd||now(),tag:'Category',title:c.n,sub:`Permitted: ${TLAB[c.t]||c.t}`});
 });
 DR.forEach(r=>{
  if(r.del&&r.cipher)items.push({mode:'del',kind:'diary',id:r.id,ts:r.upd||now(),tag:'Diary Note',title:`Encrypted Note · ${r.date}`,sub:`AES-256-GCM record`});
 });
 HIST.forEach(h=>{
  if(!h.done)items.push({mode:'edit',kind:h.kind,id:h.hid,ts:h.ts||now(),tag:'Edited',title:h.label||'Modified record',sub:h.sub||''});
 });
 return items.sort((a,b)=>String(b.ts).localeCompare(String(a.ts)));
}
function renderHistoryPane(){
 if(!$('#hi-list'))return;
 document.querySelectorAll('#hi-f button').forEach(b=>b.classList.toggle('on',b.dataset.hf===HIF));
 const all=buildHistoryItems();
 const filtered=HIF==='all'?all:all.filter(x=>x.mode===HIF);
 if($('#cm-cnt')&&ST_TAB==='hist'){$('#cm-cnt').hidden=false;$('#cm-cnt').textContent=filtered.length+(filtered.length===1?' item':' items')}
 $('#hi-list').innerHTML=filtered.slice(0,100).map(it=>{
  const tStr=it.ts?new Date(it.ts).toLocaleString('en',{day:'2-digit',month:'short',hour:'numeric',minute:'2-digit'}):'';
  return `<div class="hi-row"><div class="hi-l"><div class="hi-top"><span class="hi-tag ${it.mode}">${it.mode==='del'?'Deleted':'Edited'}</span><span class="hint" style="font-size:11.5px">${esc(it.tag)}${tStr?' · '+esc(tStr):''}</span></div><b>${esc(it.title)}</b><small>${esc(it.sub)}</small></div><button type="button" class="ghost" style="padding:6px 12px;font-size:12px;border-color:var(--acc);color:var(--acc)" data-hact="${it.mode}:${it.kind}:${esc(it.id)}:${esc(it.did||'')}">${it.mode==='del'?'Restore':'Revert'}</button></div>`;
 }).join('')||`<div class="empty" style="padding:18px">No ${HIF==='del'?'deleted items':HIF==='edit'?'recent edits':'deleted or edited items'} found.</div>`;
}
if($('#hi-f'))$('#hi-f').onclick=e=>{const b=e.target.closest('[data-hf]');if(!b)return;HIF=b.dataset.hf;renderHistoryPane()};
if($('#hi-list'))$('#hi-list').onclick=async e=>{
 const b=e.target.closest('[data-hact]');if(!b)return;
 const [mode,kind,id,did]=b.dataset.hact.split(':');
 const ts=now();
 if(mode==='del'){
  if(kind==='tx'){
   const x=S.tx.find(t=>t.id===id);if(!x)return;
   x.del=false;x.upd=ts;x.ver=(x.ver||1)+1;x.synced=false;save();render();sync();toast('Transaction restored');
  }else if(kind==='debt'){
   const d=DB.find(x=>x.id===id);if(!d)return;
   d.del=0;d.upd=ts;dsave();render();sync();toast('Debt restored');
  }else if(kind==='pay'){
   const d=DB.find(x=>x.id===did);if(!d)return;
   const p=(d.pays||[]).find(y=>y.id===id);if(!p)return;
   p.del=0;p.upd=ts;dsave();render();sync();toast('Payment restored');
  }else if(kind==='cat'){
   const c=CT[+id];if(!c)return;
   c.del=0;c.upd=ts;saveC();renderCm();paint();sync();toast('Category restored');
  }else if(kind==='diary'){
   const r=DR.find(x=>x.id===id);if(!r)return;
   r.del=0;r.upd=ts;
   if(DIARY_KEY&&r.cipher){try{DIARY_CACHE[r.date]=await decDiaryObj(DIARY_KEY,r.cipher)}catch(err){}}
   drsave();render();toast('Encrypted diary note restored');
  }
 }else if(mode==='edit'){
  const h=HIST.find(x=>x.hid===id);if(!h)return;
  if(h.kind==='tx'&&h.prev){
   const x=S.tx.find(t=>t.id===h.targetId);if(!x)return;
   Object.assign(x,h.prev,{upd:ts,ver:(x.ver||1)+1,synced:false});
   h.done=1;saveHist();save();render();sync();toast('Transaction reverted to previous version');
  }else if(h.kind==='debt'&&h.prev){
   const d=DB.find(x=>x.id===h.targetId);if(!d)return;
   Object.assign(d,h.prev,{upd:ts});
   h.done=1;saveHist();dsave();render();sync();toast('Debt reverted to previous version');
  }else if(h.kind==='cat'&&h.oldName&&h.newName){
   const c=CT.find(x=>x.id===h.targetId||x.n===h.newName);if(!c)return;
   S.tx.forEach(x=>{if(x.cat===c.n){x.cat=h.oldName;x.synced=false;x.ver=(x.ver||1)+1}});
   c.n=h.oldName;c.upd=ts;h.done=1;saveHist();saveC();save();renderCm();render();sync();toast('Category name reverted');
  }else if(h.kind==='diary'&&h.prevCipher){
   const r=DR.find(x=>x.id===h.targetId);if(!r)return;
   r.cipher=h.prevCipher;r.del=0;r.upd=ts;
   if(DIARY_KEY){try{DIARY_CACHE[r.date]=await decDiaryObj(DIARY_KEY,r.cipher)}catch(err){}}
   h.done=1;saveHist();drsave();render();toast('Diary note reverted to previous version');
  }
 }
 renderHistoryPane();
};

function renderSettingsTab(){
 syncDiaryDot();
 document.querySelectorAll('#st-tabs button').forEach(b=>b.classList.toggle('on',b.dataset.st===ST_TAB));
 if($('#st-pane-cats'))$('#st-pane-cats').hidden=(ST_TAB!=='cats');
 if($('#st-pane-diary'))$('#st-pane-diary').hidden=(ST_TAB!=='diary');
 if($('#st-pane-hist'))$('#st-pane-hist').hidden=(ST_TAB!=='hist');
 if($('#cm-cnt'))$('#cm-cnt').hidden=(ST_TAB==='diary');
 if(ST_TAB==='cats'){renderCm();return}
 if(ST_TAB==='hist'){renderHistoryPane();return}
 const hasV=!!(DRV&&DRV.v),un=!!DIARY_KEY,nCnt=drDates.size,hasQA=!!(DRV.q&&DRV.r);
 if($('#st-dr-title'))$('#st-dr-title').textContent=hasV?'AES-256-GCM Diary Vault':'Diary Vault Not Set Up';
 if($('#st-dr-sub'))$('#st-dr-sub').textContent=hasV?`${nCnt} encrypted ${nCnt===1?'note':'notes'} · ${hasQA?'Security question active':'No security answer saved'}`:'Set a password below to encrypt your daily diary';
 if($('#st-dr-badge')){$('#st-dr-badge').className='dr-st '+(un?'un':'lk');$('#st-dr-badge').textContent=!hasV?'NEW':(un?'UNLOCKED':'LOCKED')}
 if($('#st-enc-hd'))$('#st-enc-hd').textContent=hasV?'Update Password & Recovery Question':'Create Password & Recovery Question';
 if($('#st-cur-wrap'))$('#st-cur-wrap').hidden=!hasV||un;
 if($('#st-np-lbl'))$('#st-np-lbl').textContent=hasV?'New password (optional)':'Set password / PIN';
 if($('#st-cur-pw'))$('#st-cur-pw').value='';
 if($('#st-np1'))$('#st-np1').value='';
 if($('#st-np2'))$('#st-np2').value='';
 syncQuestionSelect('#dr-cq-sel','#dr-cq',DRV.q||'');
 if($('#dr-ca'))$('#dr-ca').value='';
 if($('#dr-chn'))$('#dr-chn').value=DRV.hint||'';
 if($('#dr-cer'))$('#dr-cer').textContent='';
 if($('#dr-rer'))$('#dr-rer').textContent='';
 if($('#dr-rter'))$('#dr-rter').textContent='';
 if($('#dr-acc-try')){$('#dr-acc-try').hidden=!hasV;$('#dr-acc-try').open=false}
 if($('#dr-acc-other')){$('#dr-acc-other').hidden=!hasV;$('#dr-acc-other').open=false}
 if($('#dr-qa-box'))$('#dr-qa-box').hidden=!hasQA;
 if($('#dr-no-qa'))$('#dr-no-qa').hidden=hasQA;
 if($('#dr-rq-txt'))$('#dr-rq-txt').textContent=DRV.q||'Not configured yet';
}

function renderDiaryModal(){
 syncDiaryDot();
 const hasV=!!(DRV&&DRV.v),un=!!DIARY_KEY;
 if($('#drd'))$('#drd').classList.toggle('un',un);
 if($('#dr-lock'))$('#dr-lock').hidden=un;
 if($('#dr-work'))$('#dr-work').hidden=!un;
 if(!un){
  if($('#dr-uer'))$('#dr-uer').textContent='';
  if($('#dr-upw'))$('#dr-upw').placeholder=hasV?'Enter password':'Create a password to start';
  if($('#dr-ubtn'))$('#dr-ubtn').textContent=hasV?'Unlock diary':'Set password & open diary';
  if($('#dr-uhint')){$('#dr-uhint').hidden=!(hasV&&DRV.hint);$('#dr-uhint').textContent=DRV.hint?'Hint: '+DRV.hint:''}
 }else{
  renderDiarySidebar();
  renderDiaryDate(false);
 }
}
function openDiary(dt){
 if(dt)drDate=fixDate(dt);
 else if(!drDate)drDate=iso(0);
 renderDiaryModal();
 if($('#drd')&&!$('#drd').open)$('#drd').showModal();
 if(!DIARY_KEY&&$('#dr-upw')){$('#dr-upw').value='';$('#dr-upw').focus()}
}
if($('#drb'))$('#drb').onclick=()=>openDiary();
if($('#dr-cx'))$('#dr-cx').onclick=async()=>{await autoSaveDiaryIfDirty();$('#drd').close()};
if($('#dr-lk-btn'))$('#dr-lk-btn').onclick=async()=>{
 const saved=await autoSaveDiaryIfDirty();
 lockDiary();renderDiaryModal();
 if($('#dr-upw'))$('#dr-upw').focus();
 toast(saved?'Draft encrypted & diary locked':'Diary vault locked');
};
if($('#dr-to-st'))$('#dr-to-st').onclick=async()=>{await autoSaveDiaryIfDirty();if($('#drd'))$('#drd').close();openSettings('diary')};

async function tryUnlockDiary(){
 const pw=$('#dr-upw').value;
 if(!pw){$('#dr-uer').textContent='Enter your password.';return}
 const hasV=!!(DRV&&DRV.v),tok=(STORE.getItem('ledger.api.token')||'').trim();
 if(!hasV){
  try{
   const rawDek=crypto.getRandomValues(new Uint8Array(32));
   const dekB64=b64e(rawDek),key=await importRawDek(dekB64);
   const pwWrap=await wrapDekWithSecret(pw,dekB64);
   const tokWrap=tok?await wrapDekWithSecret(tok,dekB64):'';
   DRV={v:pwWrap,q:'',r:'',t:tokWrap,hint:'',upd:now()};
   DIARY_KEY=key;DIARY_DEK_B64=dekB64;
   $('#dr-upw').value='';$('#dr-uer').textContent='';
   drsave();renderDiaryModal();toast('Diary password set & unlocked');
  }catch(e){$('#dr-uer').textContent='Could not initialize Web Crypto vault.'}
  return;
 }
 try{
  const res=await unwrapDekWithSecret(pw,DRV.v);
  DIARY_KEY=res.key;DIARY_DEK_B64=res.dekB64;
  $('#dr-upw').value='';$('#dr-uer').textContent='';
  await decryptDiaryFast();
  if(res.legacy){
   const rawDek=crypto.getRandomValues(new Uint8Array(32));
   const dekB64=b64e(rawDek),newKey=await importRawDek(dekB64),ts=now();
   for(const r of DR){
    if(r.del||!r.cipher)continue;
    const plain=DIARY_CACHE[r.date]||await decDiaryObj(DIARY_KEY,r.cipher);
    r.cipher=await encDiaryObj(newKey,plain);r.upd=ts;
   }
   DRV.v=await wrapDekWithSecret(pw,dekB64);
   if(tok)DRV.t=await wrapDekWithSecret(tok,dekB64);
   DRV.upd=ts;DIARY_KEY=newKey;DIARY_DEK_B64=dekB64;drsave();
  }else if(tok&&!DRV.t&&DIARY_DEK_B64){
   DRV.t=await wrapDekWithSecret(tok,DIARY_DEK_B64);DRV.upd=now();drsave();
  }
  renderDiaryModal();
 }catch(e){
  $('#dr-uer').textContent='Incorrect password. Use Settings → Diary Vault to recover or reset.';
 }
}
if($('#dr-ubtn'))$('#dr-ubtn').onclick=tryUnlockDiary;
if($('#dr-upw'))$('#dr-upw').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();tryUnlockDiary()}});

if($('#dr-csv'))$('#dr-csv').onclick=async()=>{
 const hasV=!!(DRV&&DRV.v),curPw=($('#st-cur-pw')&&$('#st-cur-pw').value)||'';
 const p1=($('#st-np1')&&$('#st-np1').value)||'',p2=($('#st-np2')&&$('#st-np2').value)||'';
 const sq=getQuestionVal('#dr-cq-sel','#dr-cq'),sa=normAns($('#dr-ca')&&$('#dr-ca').value),hn=($('#dr-chn')&&$('#dr-chn').value||'').trim();
 const tok=(STORE.getItem('ledger.api.token')||'').trim(),ts=now();
 if(!hasV){
  if(!p1){$('#dr-cer').textContent='Enter a password or PIN to create your vault.';return}
  if(p1!==p2){$('#dr-cer').textContent='Passwords do not match.';return}
  if(sa&&!sq){$('#dr-cer').textContent='Select or enter a security question.';return}
  try{
   const rawDek=crypto.getRandomValues(new Uint8Array(32));
   const dekB64=b64e(rawDek),key=await importRawDek(dekB64);
   const pwWrap=await wrapDekWithSecret(p1,dekB64);
   const qaWrap=sa?await wrapDekWithSecret(sa,dekB64):'';
   const tokWrap=tok?await wrapDekWithSecret(tok,dekB64):'';
   DRV={v:pwWrap,q:sq,r:qaWrap,t:tokWrap,hint:hn,upd:ts};
   DIARY_KEY=key;DIARY_DEK_B64=dekB64;
   drsave();renderSettingsTab();toast('Diary encryption configured & unlocked');
  }catch(e){$('#dr-cer').textContent='Could not initialize vault.'}
  return;
 }
 if(p1&&p1!==p2){$('#dr-cer').textContent='New passwords do not match.';return}
 if(sa&&!sq){$('#dr-cer').textContent='Select or enter a security question for your answer.';return}
 try{
  let key=DIARY_KEY,dekB64=DIARY_DEK_B64;
  if(!key){
   if(!curPw){$('#dr-cer').textContent='Enter your current password (or use Forgot Password below).';return}
   const res=await unwrapDekWithSecret(curPw,DRV.v);
   key=res.key;dekB64=res.dekB64;
   DIARY_KEY=key;DIARY_DEK_B64=dekB64;
   await decryptDiaryFast();
  }
  if(!dekB64){
   const effPw=p1||curPw;
   if(!effPw){$('#dr-cer').textContent='Enter a password above to upgrade your vault.';return}
   const rawDek=crypto.getRandomValues(new Uint8Array(32));
   dekB64=b64e(rawDek);key=await importRawDek(dekB64);
   for(const r of DR){
    if(r.del||!r.cipher)continue;
    const plain=DIARY_CACHE[r.date]||await decDiaryObj(DIARY_KEY,r.cipher);
    r.cipher=await encDiaryObj(key,plain);r.upd=ts;
   }
   DRV.v=await wrapDekWithSecret(effPw,dekB64);
  }
  const newPwWrap=p1?await wrapDekWithSecret(p1,dekB64):DRV.v;
  const newQaWrap=sa?await wrapDekWithSecret(sa,dekB64):(DRV.r||'');
  const newTokWrap=tok?await wrapDekWithSecret(tok,dekB64):(DRV.t||'');
  DRV={v:newPwWrap,q:sq||DRV.q||'',r:newQaWrap,t:newTokWrap,hint:hn,upd:ts};
  DIARY_KEY=key;DIARY_DEK_B64=dekB64;
  drsave();renderSettingsTab();toast('Diary encryption settings saved');
 }catch(e){
  $('#dr-cer').textContent='Incorrect current password.';
 }
};

if($('#dr-rsv'))$('#dr-rsv').onclick=async()=>{
 const ans=normAns($('#dr-ra')&&$('#dr-ra').value),p1=($('#dr-rp1')&&$('#dr-rp1').value)||'';
 if(!ans){$('#dr-rer').textContent='Enter your security answer.';return}
 try{
  const res=await unwrapDekWithSecret(ans,DRV.r);
  if(!res.dekB64)throw new Error('no dek');
  if(p1){
   const newPwWrap=await wrapDekWithSecret(p1,res.dekB64);
   DRV=Object.assign({},DRV,{v:newPwWrap,upd:now()});
   drsave();
  }
  DIARY_KEY=res.key;DIARY_DEK_B64=res.dekB64;
  if($('#dr-ra'))$('#dr-ra').value='';if($('#dr-rp1'))$('#dr-rp1').value='';$('#dr-rer').textContent='';
  await decryptDiaryFast();
  renderSettingsTab();toast(p1?'Password reset & diary unlocked!':'Diary unlocked via security answer!');
 }catch(e){
  $('#dr-rer').textContent='Incorrect security answer.';
 }
};
if($('#dr-rtbtn'))$('#dr-rtbtn').onclick=async()=>{
 const tok=($('#dr-rtok')&&$('#dr-rtok').value||'').trim(),np=($('#dr-rtp')&&$('#dr-rtp').value)||'';
 const savedTok=(STORE.getItem('ledger.api.token')||'').trim();
 if(!tok){$('#dr-rter').textContent='Enter your Google Sheet Sync Token.';return}
 if(!np){$('#dr-rter').textContent='Enter a new vault password.';return}
 try{
  if(DRV.t){
   const res=await unwrapDekWithSecret(tok,DRV.t);
   if(!res.dekB64)throw new Error('bad token');
   DRV.v=await wrapDekWithSecret(np,res.dekB64);DRV.upd=now();
   DIARY_KEY=res.key;DIARY_DEK_B64=res.dekB64;
   $('#dr-rtok').value='';$('#dr-rtp').value='';$('#dr-rter').textContent='';
   await decryptDiaryFast();drsave();renderSettingsTab();
   toast('Vault recovered & password updated!');
   return;
  }
  if(savedTok&&tok===savedTok){
   const rawDek=crypto.getRandomValues(new Uint8Array(32));
   const dekB64=b64e(rawDek),key=await importRawDek(dekB64),ts=now();
   DR.forEach(r=>{if(!r.del){r.del=1;r.upd=ts}});
   DRV={v:await wrapDekWithSecret(np,dekB64),q:DRV.q||'',r:'',t:await wrapDekWithSecret(tok,dekB64),hint:'',upd:ts};
   DIARY_KEY=key;DIARY_DEK_B64=dekB64;DIARY_CACHE={};
   $('#dr-rtok').value='';$('#dr-rtp').value='';$('#dr-rter').textContent='';
   drsave();render();renderSettingsTab();
   toast('Sync Token verified · New vault password set');
   return;
  }
  $('#dr-rter').textContent='Sync Token does not match this vault.';
 }catch(e){
  $('#dr-rter').textContent='Invalid Sync Token for this vault.';
 }
};
if($('#dr-rwbtn'))$('#dr-rwbtn').onclick=()=>{
 const v=($('#dr-rwipe')&&$('#dr-rwipe').value||'').trim().toUpperCase();
 if(v!=='RESET'){if($('#dr-rter'))$('#dr-rter').textContent='Type RESET in the box to confirm.';return}
 const ts=now();
 DR.forEach(r=>{if(!r.del){r.del=1;r.upd=ts}});
 DRV={v:'',q:'',r:'',t:'',hint:'',upd:ts};
 lockDiary();
 if($('#dr-rwipe'))$('#dr-rwipe').value='';
 drsave();render();renderSettingsTab();
 toast('Diary vault reset. Set a new password above.');
};
const shiftDiaryDate=async delta=>{
 await autoSaveDiaryIfDirty();
 const d=new Date(drDate+'T00:00:00');
 d.setDate(d.getDate()+delta);
 drDate=ymd(d);
 renderDiarySidebar();
 renderDiaryDate(false);
};
if($('#dr-prev'))$('#dr-prev').onclick=()=>shiftDiaryDate(-1);
if($('#dr-next'))$('#dr-next').onclick=()=>shiftDiaryDate(1);
if($('#dr-td'))$('#dr-td').onclick=async()=>{await autoSaveDiaryIfDirty();drDate=iso(0);renderDiarySidebar();renderDiaryDate(false)};
if($('#dr-dt'))$('#dr-dt').onchange=async e=>{if(e.target.value){await autoSaveDiaryIfDirty();drDate=fixDate(e.target.value);renderDiarySidebar();renderDiaryDate(false)}};
if($('#dr-q'))$('#dr-q').oninput=()=>renderDiarySidebar();
if($('#dr-list'))$('#dr-list').onclick=async e=>{if(e.target.closest('[data-dr-more]')){drShowAll=true;renderDiarySidebar();return}const b=e.target.closest('[data-dr-item]');if(!b)return;await autoSaveDiaryIfDirty();drDate=b.dataset.drItem;renderDiarySidebar();renderDiaryDate(false)};
if($('#dr-ins'))$('#dr-ins').onclick=()=>{
 const sm=dayLedgerSummary(drDate);
 const lines=[`--- Spending Summary (${drDate}) ---`];
 if(sm.AED.out||sm.AED.in)lines.push(`AED: Spent ${fmt('AED',sm.AED.out)} | Received ${fmt('AED',sm.AED.in)}`);
 if(sm.INR.out||sm.INR.in)lines.push(`INR: Spent ${fmt('INR',sm.INR.out)} | Received ${fmt('INR',sm.INR.in)}`);
 sm.list.forEach(x=>lines.push(`• ${x.cat}${x.note?' ('+x.note+')':''}: ${x.type==='out'?'−':'+'}${fmt(x.cur,x.amt)}`));
 const b=$('#dr-bdy');
 b.value=(b.value.trim()?b.value.trim()+'\n\n':'')+lines.join('\n');
 b.focus();
};
if($('#dr-sv'))$('#dr-sv').onclick=async()=>{
 if(!DIARY_KEY)return;
 const title=$('#dr-ttl').value.trim(),body=$('#dr-bdy').value.trim();
 if(!title&&!body){toast('Write a headline or note first');return}
 const plain={title:title||'Daily note',body};
 const cipher=await encDiaryObj(DIARY_KEY,plain);
 const id='dry_'+drDate,ts=now();
 let rec=DR.find(x=>x.id===id);
 if(rec){
  if(!rec.del&&rec.cipher&&(plain.title!==(DIARY_CACHE[drDate]||{}).title||plain.body!==(DIARY_CACHE[drDate]||{}).body)){
   logHist({kind:'diary',targetId:rec.id,date:drDate,label:`Diary Note · ${drDate}`,sub:`Previous encrypted version saved`,prevCipher:rec.cipher});
  }
  Object.assign(rec,{date:drDate,cipher,del:0,upd:ts});
 }else DR.push({id,date:drDate,cipher,del:0,upd:ts});
 DIARY_CACHE[drDate]=plain;
 drsave();render();renderDiarySidebar();renderDiaryDate(true);
 toast(syncOn()?'Encrypted & saved · syncing ciphertext…':'Encrypted & saved on this device');
};
if($('#dr-del'))$('#dr-del').onclick=()=>{
 const rec=DR.find(x=>!x.del&&x.date===drDate);
 if(!rec)return;
 const backupCipher=rec.cipher,backupCache=DIARY_CACHE[drDate],dt=drDate;
 rec.del=1;rec.upd=now();delete DIARY_CACHE[dt];
 drsave();render();renderDiarySidebar();renderDiaryDate(false);
 toast('Diary note deleted. Tap to undo or restore in Settings → History.',()=>{
  rec.del=0;rec.cipher=backupCipher;rec.upd=now();
  if(backupCache&&DIARY_KEY)DIARY_CACHE[dt]=backupCache;
  drsave();render();if($('#drd').open){renderDiarySidebar();renderDiaryDate(false)}
 });
};

// ---- Sync with the Google Sheet ----
const DEV=(()=>{let d=STORE.getItem('ledger.device');if(!d){d='d_'+uid();STORE.setItem('ledger.device',d)}return d})();
const API=()=>({url:STORE.getItem('ledger.api.url')||'',token:STORE.getItem('ledger.api.token')||''});
const syncOn=()=>{const a=API();return !!(a.url&&a.token)};
const now=()=>new Date().toISOString();
const hs=s=>{let h=5381;for(let i=0;i<s.length;i++)h=((h<<5)+h+s.charCodeAt(i))|0;return (h>>>0).toString(36)};
const TB={
 Transactions:{all:()=>S.tx,
  out:x=>({id:x.id,date:x.date,currency:x.cur,type:x.type,amount_minor:Math.round(x.amt*100),category:x.cat,notes:x.note||'',created_at:new Date(x.ts||Date.now()).toISOString(),updated_at:x.upd,deleted_at:x.del?x.upd:'',device_id:DEV}),
  inn:r=>({id:r.id,cur:r.currency,date:fixDate(r.date),type:r.type,amt:Number(r.amount_minor)/100,cat:(r.category!==undefined&&r.category!=='')?r.category:(r.category_id||undefined),note:r.notes,ts:Date.parse(r.created_at)||Date.now(),upd:String(r.updated_at),del:!!r.deleted_at}),
  add:o=>S.tx.push(o)},
 Categories:{all:()=>CT,
  out:c=>({id:c.id,name:c.n,permitted_type:c.t,updated_at:c.upd,deleted_at:c.del?c.upd:''}),
  inn:r=>({id:r.id,n:r.name,t:r.permitted_type,a:1,upd:String(r.updated_at),del:!!r.deleted_at}),
  add:o=>CT.push(o)},
 Debts:{all:()=>DB,
  out:d=>({id:d.id,date:d.date,currency:d.cur,person:d.who,direction:d.dir,amount_minor:Math.round(d.amt*100),notes:d.note||'',updated_at:d.upd,deleted_at:d.del?d.upd:''}),
  inn:r=>({id:r.id,date:fixDate(r.date),cur:r.currency,who:r.person,dir:r.direction,amt:Number(r.amount_minor)/100,note:r.notes,upd:String(r.updated_at),del:!!r.deleted_at}),
  add:o=>DB.push(Object.assign(o,{pays:[],ts:Date.now()}))},
 DebtPayments:{all:()=>DB.flatMap(d=>d.pays.map(p=>{p.did=d.id;return p})),
  out:p=>({id:p.id,debt_id:p.did,date:p.date,amount_minor:Math.round(p.amt*100),notes:p.note||'',updated_at:p.upd,deleted_at:p.del?p.upd:''}),
  inn:r=>({id:r.id,did:r.debt_id,date:fixDate(r.date),amt:Number(r.amount_minor)/100,note:r.notes,upd:String(r.updated_at),del:!!r.deleted_at}),
  add:o=>{const d=DB.find(x=>x.id===o.did);if(d){d.pays.push(o);return true}return false}},
 Diary:{all:()=>DR,
  out:d=>({id:d.id,date:d.date,cipher:d.cipher||'',updated_at:d.upd,deleted_at:d.del?d.upd:''}),
  inn:r=>({id:r.id,date:fixDate(r.date),cipher:String(r.cipher||''),upd:String(r.updated_at),del:!!r.deleted_at}),
  add:o=>DR.push(o)}
};
const ymd=d=>d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
const fixDate=v=>{const t=String(v);if(/^\d{4}-\d\d-\d\d$/.test(t))return t;const d=new Date(t);return isNaN(d)?t:ymd(d)};
const SKIP=['updated_at','deleted_at','created_at','device_id'];
const cf=(t,r)=>hs(Object.entries(TB[t].out(r)).filter(([k])=>!SKIP.includes(k)).map(e=>e[1]).join('|')+'|'+(r.del?1:0));
let SNAP={};try{SNAP=JSON.parse(STORE.getItem('ledger.snap'))||{}}catch(e){}
const LAST={};
const snapSet=(t,id,h)=>{(SNAP[t]=SNAP[t]||{})[id]=h};
const obHash=()=>String(r2(OB.INR||0));
const drvVal=()=>JSON.stringify({v:DRV.v||'',q:DRV.q||'',r:DRV.r||'',t:DRV.t||'',hint:DRV.hint||''});
const drvHash=()=>DRV.v?hs(drvVal()):'';
const EPOCH='1970-01-01T00:00:00.000Z';
function stamp(init){
 CT.forEach(c=>{if(!c.id)c.id='c_'+hs(c.n.toLowerCase())});
 S.tx.forEach(x=>{x.date=fixDate(x.date);if(!x.cat)x.cat='📦 Other'});
 DB.forEach(d=>{d.date=fixDate(d.date);d.pays.forEach(p=>{p.date=fixDate(p.date)})});
 DR.forEach(d=>{d.date=fixDate(d.date);if(!d.id)d.id='dry_'+d.date});
 rebuildDrDates();
 Object.keys(TB).forEach(t=>TB[t].all().forEach(r=>{const k=t+r.id,h=cf(t,r);
  if(!r.upd)r.upd=r.ts?new Date(r.ts).toISOString():now();
  else if(!init&&LAST[k]!==undefined&&LAST[k]!==h)r.upd=now();
  LAST[k]=h}));
 if(!OB.upd)OB.upd=EPOCH;
 else if(!init&&LAST.OB!==undefined&&LAST.OB!==obHash())OB.upd=now();
 LAST.OB=obHash();
 if(!DRV.upd)DRV.upd=EPOCH;
 else if(!init&&LAST.DRV!==undefined&&LAST.DRV!==drvHash())DRV.upd=now();
 LAST.DRV=drvHash();
}
function dirty(){
 const o=[];
 Object.keys(TB).forEach(t=>TB[t].all().forEach(r=>{const h=cf(t,r);if((SNAP[t]||{})[r.id]!==h)o.push({t,r,h})}));
 if((SNAP.Settings||{}).opening_INR!==obHash()&&OB.upd>EPOCH)o.push({t:'Settings',id:'opening_INR',h:obHash()});
 if(DRV.v&&(SNAP.Settings||{}).diary_verifier!==drvHash()&&DRV.upd>EPOCH)o.push({t:'Settings',id:'diary_verifier',h:drvHash()});
 return o;
}
const pendingCount=()=>dirty().length;
const opOf=d=>({table:d.t,rec:d.t==='Settings'?(d.id==='diary_verifier'?{id:'diary_verifier',value:drvVal(),updated_at:DRV.upd}:{id:'opening_INR',value:String(Math.round((OB.INR||0)*100)),updated_at:OB.upd}):TB[d.t].out(d.r)});
const saveSnap=()=>STORE.setItem('ledger.snap',JSON.stringify(SNAP));
const persist=()=>{STORE.setItem(LS,JSON.stringify(S.tx));STORE.setItem(LC,JSON.stringify(CT));STORE.setItem(LD,JSON.stringify(DB));STORE.setItem(LDR,JSON.stringify(DR));STORE.setItem(LDRV,JSON.stringify(DRV));STORE.setItem(LO,JSON.stringify(OB));saveSnap()};
let ORPHAN_PAYS=[];
function applyRemote(data){
 ['Categories','Transactions','Debts','DebtPayments','Diary'].forEach(t=>{
  const K=TB[t];
  (data[t]||[]).forEach(r=>{
   const inc=K.inn(r);Object.keys(inc).forEach(k=>{if(inc[k]===undefined)delete inc[k]});const loc=K.all().find(x=>x.id===inc.id);
   if(loc){
    const localEdited=(SNAP[t]||{})[loc.id]!==cf(t,loc);
    if(localEdited&&String(loc.upd)>inc.upd)return;
    if(t==='Categories'&&loc.n&&inc.n&&loc.n!==inc.n){
     const oldName=loc.n;
     S.tx.forEach(x=>{if(x.cat===oldName)x.cat=inc.n});
    }
    Object.assign(loc,inc);
   }else if(K.add(inc)===false){
    if(t==='DebtPayments'&&!ORPHAN_PAYS.some(p=>p.id===r.id))ORPHAN_PAYS.push(r);
    return;
   }
   const cur=K.all().find(x=>x.id===inc.id),h=cf(t,cur);
   snapSet(t,inc.id,h);LAST[t+inc.id]=h;
  });
  if(t==='Debts'&&ORPHAN_PAYS.length){
   const PK=TB.DebtPayments;
   ORPHAN_PAYS=ORPHAN_PAYS.filter(r=>{
    const inc=PK.inn(r);Object.keys(inc).forEach(k=>{if(inc[k]===undefined)delete inc[k]});
    const loc=PK.all().find(x=>x.id===inc.id);
    if(loc)Object.assign(loc,inc);
    else if(PK.add(inc)===false)return true;
    const cur=PK.all().find(x=>x.id===inc.id),h=cf('DebtPayments',cur);
    snapSet('DebtPayments',inc.id,h);LAST['DebtPayments'+inc.id]=h;
    return false;
   });
  }
 });
 (data.Settings||[]).forEach(r=>{
  if(r.id==='opening_INR'){
   const edited=(SNAP.Settings||{}).opening_INR!==obHash()&&OB.upd>EPOCH;
   if(edited&&OB.upd>String(r.updated_at))return;
   OB.INR=Number(r.value)/100;OB.upd=String(r.updated_at);snapSet('Settings','opening_INR',obHash());LAST.OB=obHash();
  }else if(r.id==='diary_verifier'){
   const edited=DRV.v&&(SNAP.Settings||{}).diary_verifier!==drvHash()&&DRV.upd>EPOCH;
   if(edited&&DRV.upd>String(r.updated_at))return;
   try{
    const parsed=JSON.parse(r.value);
    if(parsed&&parsed.v)DRV={v:parsed.v,q:parsed.q||'',r:parsed.r||'',t:parsed.t||'',hint:parsed.hint||'',upd:String(r.updated_at)};
   }catch(e){
    if(r.value)DRV={v:String(r.value),q:'',r:'',hint:'',upd:String(r.updated_at)};
   }
   snapSet('Settings','diary_verifier',drvHash());LAST.DRV=drvHash();
  }
 });
 rebuildDrDates();
 if(DIARY_KEY&&(data.Diary||[]).length)decryptDiaryFast().then(()=>{if($('#drd')&&$('#drd').open)renderDiaryModal()});
 bumpCalc();
}
async function call(body){
 const a=API();
 const r=await fetch(a.url,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify(Object.assign({token:a.token},body))});
 if(!r.ok)throw new Error('HTTP '+r.status);
 const j=await r.json();
 if(!j.ok)throw new Error(j.error||'error');
 if((j.api||0)<3)throw new Error('outdated');
 return j;
}
const friendly=e=>e.message==='outdated'?'your Apps Script is an old version. In Apps Script use Deploy, Manage deployments, pencil, New version':e.message==='unauthorized'?'wrong token':e instanceof TypeError?'cannot reach the server':e.message;
let st=null,again=false;
const schedSync=()=>{clearTimeout(st);st=setTimeout(()=>sync(),1200)};
async function sync(){
 if(!syncOn()||!online())return;
 if(S.busy){again=true;return}
 S.busy=true;S.err='';render();
 try{
  stamp();
  const ds=dirty(),ops=ds.map(opOf);
  for(let i=0;i<ops.length;i+=100){
   const res=await call({action:'push',ops:ops.slice(i,i+100)});
   (res.results||[]).forEach((x,j)=>{const d=ds[i+j];if(x&&(x.status==='ok'||x.status==='stale'))snapSet(d.t,d.t==='Settings'?(d.id||'opening_INR'):d.r.id,d.h);else S.err='the server rejected '+d.t+' changes. Update the Apps Script to the newest version'});
  }
  let since=Number(STORE.getItem('ledger.rev'))||0;
  let guard=0;
  while(guard++<20){
   const j=await call({action:'pull',since,limit:2500});
   applyRemote(j.data||{});
   since=Number(j.next_since||j.rev)||since;
   STORE.setItem('ledger.rev',String(since));
   if(!j.has_more)break;
  }
  STORE.setItem('ledger.last',now());
  persist();
 }catch(e){S.err=friendly(e);try{saveSnap()}catch(x){}}
 S.busy=false;render();
 if(again){again=false;setTimeout(()=>sync(),300)}
}
function statusText(p,on){
 if(!syncOn())return on?'Saved on this device · sync off':'Offline · saved on this device';
 if(S.busy)return 'Syncing…';
 if(S.err)return 'Sync issue: '+S.err;
 if(!on)return 'Offline'+(p?' · '+p+' pending':'');
 const l=STORE.getItem('ledger.last');
 return p?p+' pending':'All synced'+(l?' · '+new Date(l).toLocaleTimeString('en',{hour:'numeric',minute:'2-digit'}):'');
}
function openSy(){
 const a=API(),l=STORE.getItem('ledger.last');
 $('#syu').value=a.url;$('#syt').value=a.token;$('#sye').textContent='';
 $('#syi').textContent='This device: '+DEV+(l?'. Last sync: '+new Date(l).toLocaleString():'');
 $('#syd').showModal();
}
$('#pl').onclick=openSy;
$('#st').onclick=()=>{if(!syncOn())openSy();else sync()};
$('#syc').onclick=()=>$('#syd').close();
const syIn=()=>({u:$('#syu').value.trim(),t:$('#syt').value.trim()});
const syOk=(u,t)=>{if(!/^https?:\/\/.+\/exec$/.test(u)){$('#sye').textContent='Paste the full web app link, ending in /exec.';return false}if(!t){$('#sye').textContent='Enter your token.';return false}return true};
$('#sys').onclick=()=>{const {u,t}=syIn();if(!syOk(u,t))return;STORE.setItem('ledger.api.url',u);STORE.setItem('ledger.api.token',t);$('#syd').close();toast('Sync connected. Syncing…');sync()};
$('#syx').onclick=async()=>{const {u,t}=syIn();$('#sye').style.color='';if(!syOk(u,t))return;$('#sye').textContent='Testing…';
 try{const r=await fetch(u+(u.includes('?')?'&':'?')+'token='+encodeURIComponent(t));const j=await r.json();$('#sye').style.color=(j.ok&&(j.api||0)>=3)?'var(--in)':'';$('#sye').textContent=!j.ok?'The server answered: '+j.error+'. Check the token.':(j.api||0)<3?'Connected, but your Apps Script is an old version. In Apps Script use Deploy, Manage deployments, pencil, New version.':'Connection works.'}
 catch(e){$('#sye').textContent='Cannot reach the server. Check the link and your internet.'}};
document.addEventListener('visibilitychange',()=>{
 if(document.hidden){
  clearTimeout(drLockTm);
  drLockTm=setTimeout(()=>{if(document.hidden&&DIARY_KEY){lockDiary();if($('#drd')&&$('#drd').open)renderDiaryModal()}},60000);
 }else{
  clearTimeout(drLockTm);
  sync();
 }
});
setInterval(()=>{if(!document.hidden)sync()},60000);
stamp(true);
syncDiaryDot();
render();sync();
if(!idb)toast('Storage is unavailable in this browser mode. Entries will not be kept.');
if('serviceWorker' in navigator){
 const had=!!navigator.serviceWorker.controller;let rl=false;
 navigator.serviceWorker.addEventListener('controllerchange',()=>{if(!had||rl)return;rl=true;location.reload()});
 navigator.serviceWorker.register('./sw.js').then(reg=>{
  const ask=w=>toast('Update ready. Tap to refresh.',()=>w.postMessage('skip'));
  if(reg.waiting&&navigator.serviceWorker.controller)ask(reg.waiting);
  reg.addEventListener('updatefound',()=>{const w=reg.installing;w.addEventListener('statechange',()=>{if(w.state==='installed'&&navigator.serviceWorker.controller)ask(w)})});
 }).catch(()=>{});
}
})();