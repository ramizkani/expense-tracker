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

// Theme initialization with SVG Sun/Moon icon + Dynamic Modal Backdrop Status-Bar Sync
const isDark=()=>{
 const t=document.documentElement.getAttribute('data-theme');
 return t?t==='dark':matchMedia('(prefers-color-scheme:dark)').matches;
};
const syncThemeIcon=()=>{
 const d=isDark(),openDlg=document.querySelector('dialog[open]'),dlgOpen=!!openDlg;
 document.body.classList.toggle('dlg-open',dlgOpen);
 const isMob=matchMedia('(max-width:700px)').matches||/Android/i.test(navigator.userAgent);
 const metaCol=(isMob||d)?'#000000':(dlgOpen?'#686c71':'#e9eef5');
 if($('#theme-meta')&&$('#theme-meta').getAttribute('content')!==metaCol)$('#theme-meta').setAttribute('content',metaCol);
 const tst=$('#toast');
 if(tst){const host=openDlg||document.body;if(tst.parentNode!==host)host.appendChild(tst)}
 if(!$('#thb'))return;
 $('#thb').innerHTML=d?IC.sun:IC.moon;
 $('#thb').setAttribute('title',d?'Switch to light mode':'Switch to dark mode');
};
matchMedia('(prefers-color-scheme:dark)').addEventListener('change',syncThemeIcon);
matchMedia('(max-width:700px)').addEventListener('change',syncThemeIcon);
const initTheme=STORE.getItem('ledger.theme');
if(initTheme)document.documentElement.setAttribute('data-theme',initTheme);
const dlgObs=new MutationObserver(syncThemeIcon);
document.querySelectorAll('dialog').forEach(dlg=>{
 dlgObs.observe(dlg,{attributes:true,attributeFilter:['open']});
 dlg.addEventListener('close',syncThemeIcon);
});
syncThemeIcon();
if($('#thb'))$('#thb').onclick=e=>{
 const btn=$('#thb'),next=isDark()?'light':'dark';
 const r=btn.getBoundingClientRect();
 const x=(e&&e.clientX)?e.clientX:(r.left+r.width/2);
 const y=(e&&e.clientY)?e.clientY:(r.top+r.height/2);
 const maxR=Math.hypot(Math.max(x,innerWidth-x),Math.max(y,innerHeight-y));
 const apply=()=>{
  document.documentElement.setAttribute('data-theme',next);
  STORE.setItem('ledger.theme',next);
  syncThemeIcon();
 };
 btn.classList.remove('spin');
 void btn.offsetWidth;
 btn.classList.add('spin');
 setTimeout(()=>btn.classList.remove('spin'),380);
 if(!matchMedia('(prefers-reduced-motion:reduce)').matches){
  const rip=document.createElement('div');
  rip.className='theme-ripple';
  const sz=Math.ceil(maxR*2);
  rip.style.width=sz+'px';
  rip.style.height=sz+'px';
  rip.style.left=x+'px';
  rip.style.top=y+'px';
  rip.style.background=next==='dark'?'radial-gradient(circle, rgba(45,212,191,.22) 0%, rgba(11,16,27,.42) 65%, transparent 100%)':'radial-gradient(circle, rgba(11,122,117,.18) 0%, rgba(233,238,245,.44) 65%, transparent 100%)';
  rip.style.boxShadow=next==='dark'?'inset 0 0 0 2px rgba(45,212,191,.45)':'inset 0 0 0 2px rgba(11,122,117,.38)';
  document.body.appendChild(rip);
  requestAnimationFrame(()=>{
   rip.style.transform='translate3d(-50%,-50%,0) scale3d(1,1,1)';
   rip.style.opacity='0';
  });
  setTimeout(()=>rip.remove(),500);
  if(document.startViewTransition){
   try{
    const vt=document.startViewTransition(apply);
    vt.ready.then(()=>{
     document.documentElement.animate(
      {clipPath:[`circle(0px at ${x}px ${y}px)`,`circle(${maxR}px at ${x}px ${y}px)`]},
      {duration:420,easing:'cubic-bezier(0.22, 1, 0.36, 1)',pseudoElement:'::view-transition-new(root)'}
     );
    }).catch(()=>{});
    return;
   }catch(err){}
  }
 }
 apply();
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
const LDR='ledger.diary.v1',LDRV='ledger.diary.verifier',LDRF='ledger.diary.drafts.v1',LH='ledger.hist.v1',LTK='ledger.tasks.v1';
let DR=null;try{DR=JSON.parse(STORE.getItem(LDR))}catch(e){}
if(!Array.isArray(DR))DR=[];
let TK=null;try{TK=JSON.parse(STORE.getItem(LTK))}catch(e){}
if(!Array.isArray(TK))TK=[];
let DRV={v:'',q:'',r:'',t:'',hint:'',upd:'1970-01-01T00:00:00.000Z'};try{const v=JSON.parse(STORE.getItem(LDRV));if(v&&typeof v==='object')DRV=Object.assign(DRV,v)}catch(e){}
let DR_DRAFTS={};try{const df=JSON.parse(STORE.getItem(LDRF));if(df&&typeof df==='object'&&!Array.isArray(df))DR_DRAFTS=df}catch(e){}
const saveDrDrafts=()=>{try{STORE.setItem(LDRF,JSON.stringify(DR_DRAFTS))}catch(e){}};
let HIST=[];try{const h=JSON.parse(STORE.getItem(LH));if(Array.isArray(h))HIST=h}catch(e){}
const saveHist=()=>{if(HIST.length>150)HIST=HIST.slice(0,150);try{STORE.setItem(LH,JSON.stringify(HIST))}catch(e){}};
const logHist=item=>{HIST.unshift(Object.assign({hid:uid(),ts:new Date().toISOString()},item));saveHist()};
const syncTaskBadge=()=>{
 const active=TK.filter(t=>!t.del),openCnt=active.filter(t=>!t.done).length;
 if($('#tk-cnt')){
  $('#tk-cnt').hidden=!active.length;
  $('#tk-cnt').textContent=openCnt>0?String(openCnt):'✓';
 }
 if($('#tk-sum-pill')){
  const doneCnt=active.length-openCnt;
  $('#tk-sum-pill').textContent=active.length?`${openCnt} open · ${doneCnt} done`:'0 tasks';
  $('#tk-sum-pill').className='dr-cnt-pill'+(active.length&&openCnt===0?' ok':'');
 }
};
const tksave=()=>{syncTaskBadge();try{STORE.setItem(LTK,JSON.stringify(TK))}catch(e){}stamp();schedSync()};
const isVaultRec=r=>String((r&&r.id)||'').startsWith('vlt_');
const vaultRecs=()=>DR.filter(r=>!r.del&&r.cipher&&isVaultRec(r)).sort((a,b)=>b.date.localeCompare(a.date)||String(b.upd||'').localeCompare(String(a.upd||'')));
const syncVaultBadge=()=>{
 const vCnt=vaultRecs().length,totCnt=(drDates?drDates.size:0)+vCnt;
 const cntEl=$('#vl-cnt'),tabCntEl=$('#vl-tab-cnt');
 if(cntEl){
  const hide=!totCnt,txt=String(totCnt);
  if(cntEl.hidden!==hide)cntEl.hidden=hide;
  if(cntEl.textContent!==txt)cntEl.textContent=txt;
 }
 if(tabCntEl){
  const vTxt=String(vCnt);
  if(tabCntEl.textContent!==vTxt)tabCntEl.textContent=vTxt;
 }
};
let drDates=new Set();
const rebuildDrDates=()=>{
 drDates=new Set(DR.filter(x=>!x.del&&x.cipher&&!isVaultRec(x)).map(x=>x.date));
 syncVaultBadge();
};
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
  return `<div class="mday"><div class="mday-h"><b>${dtStr}${dryBadge(g.date)}</b><span>${day.length} ${day.length===1?'entry':'entries'} · <em class="num ${net<0?'out':'in'}" style="font-style:normal;font-weight:600">${net<0?'−':'+'}${fmt(c,Math.abs(net))}</em></span></div>${g.items.map(x=>`<div class="mrow tx-row" data-mrow="${x.id}" tabindex="0" role="button" aria-expanded="false" aria-label="Tap to show edit and delete options"><div class="mrow-l"><b>${esc(x.cat)}</b><span>${esc(x.note||'No notes')}</span></div><div class="mrow-r"><div class="mrow-amt"><b class="amt ${x.type}">${x.type==='in'?'+':'−'}${fmt(c,x.amt)}</b>${av?`<small>Avail: ${fmt(c,av[x.id])}</small>`:''}</div><div class="mrow-ac"><button class="ib" data-e="${x.id}" aria-label="Edit entry" title="Edit">${IC.e}</button><button class="ib d" data-d="${x.id}" aria-label="Delete entry" title="Delete">${IC.d}</button></div></div></div>`).join('')}</div>`;
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
  return `<div class="mday dbt-card" data-dcard="${esc(d.id)}" tabindex="0" role="button" aria-expanded="false" aria-label="Tap to show edit and delete options"><div class="mday-h"><b>${esc(d.who)}</b><span class="st ${sc}">${sl} · ${pc}%</span></div><div class="mrow"><div class="mrow-l"><b><span class="tp ${d.dir==='lent'?'lent':'out'}">${d.dir==='lent'?'They owe me':'I owe them'}</span></b><span style="margin-top:4px">${dt(d.date)} · ${esc(d.note||'No notes')}</span></div><div class="mrow-r"><div class="mrow-amt"><b class="num">${fmt(c,r)} left</b><small>of ${fmt(c,d.amt)} (Paid ${fmt(c,p)})</small></div></div></div><div class="mrow" style="background:var(--bg);padding:8px 14px"><span class="hint">${pays.length} ${pays.length===1?'payment':'payments'} · tap card to edit</span><div class="mrow-ac">${r>0?`<button class="ghost pay" data-dk="pay:${d.id}">Pay</button>`:''}<button class="ib tg" data-dk="xp:${d.id}" aria-expanded="${!!op}">${IC.dn}</button><span class="dbt-ed-ac"><button class="ib" data-dk="edit:${d.id}" aria-label="Edit debt" title="Edit">${IC.e}</button><button class="ib d" data-dk="del:${d.id}" aria-label="Delete debt" title="Delete">${IC.d}</button></span></div></div>${op?`<div style="padding:8px 14px;border-top:1px dashed var(--line);font-size:13px">${pays.map(y=>`<div style="display:flex;justify-content:space-between;align-items:center;padding:4px 0"><span>${dt(y.date)} · ${esc(y.note||'Payment')}</span><span style="display:flex;align-items:center;gap:6px"><b class="num">${fmt(c,y.amt)}</b><button class="ib d" style="width:26px;height:26px" data-dk="dp:${d.id}:${y.id}">${IC.d}</button></span></div>`).join('')||'<div class="hint">No payments yet.</div>'}</div>`:''}</div>`;
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

let lastTab='',lastAppHtml='';
function renderStatus(){
 const p=pendingCount(),on=online();
 if($('#st'))$('#st').className='pill '+(S.busy?'sy':(on&&!S.err&&syncOn())||(!syncOn()&&on)?'':'off');
 if($('#stx'))$('#stx').textContent=statusText(p,on);
}
function render(){
 closeDd();
 renderStatus();
 const appEl=$('#app');
 const openMrow=appEl&&appEl.querySelector('.mrow.tx-row.ro');
 const openMrowId=openMrow?openMrow.dataset.mrow:'';
 const openDcard=appEl&&appEl.querySelector('.mday.dbt-card.ro');
 const openDcardId=openDcard?openDcard.dataset.dcard:'';
 const activeEl=document.activeElement;
 const activeId=(activeEl&&(activeEl.id==='q'||activeEl.id==='dq'))?activeEl.id:'';
 const selStart=activeId?activeEl.selectionStart:null,selEnd=activeId?activeEl.selectionEnd:null;
 const nextHtml=S.tab==='D'?debtsTab():widget(S.tab);
 const tabChanged=lastTab!==''&&lastTab!==S.tab;
 lastTab=S.tab;
 if(appEl&&(lastAppHtml!==nextHtml||!appEl.firstChild)){
  lastAppHtml=nextHtml;
  const curCard=appEl.firstElementChild;
  if(curCard&&curCard.tagName==='SECTION'){
   const tmp=document.createElement('div');
   tmp.innerHTML=nextHtml;
   const nextCard=tmp.firstElementChild;
   const sameKind=nextCard&&(!!curCard.querySelector('#tbl')===!!nextCard.querySelector('#tbl'))&&(!!curCard.querySelector('#dlist')===!!nextCard.querySelector('#dlist'));
   if(nextCard&&sameKind){
    if(curCard.className!==nextCard.className)curCard.className=nextCard.className;
    const cHead=curCard.querySelector('.head'),nHead=nextCard.querySelector('.head');
    if(cHead&&nHead&&cHead.innerHTML!==nHead.innerHTML)cHead.innerHTML=nHead.innerHTML;
    const cLh=curCard.querySelector('.lh'),nLh=nextCard.querySelector('.lh');
    if(cLh&&nLh){
     if(cLh.className!==nLh.className)cLh.className=nLh.className;
     if(cLh.innerHTML!==nLh.innerHTML)cLh.innerHTML=nLh.innerHTML;
    }
    const cTb=curCard.querySelector('.tb'),nTb=nextCard.querySelector('.tb');
    if(cTb&&nTb){
     if(cTb.className!==nTb.className)cTb.className=nTb.className;
     if(!activeId&&cTb.innerHTML!==nTb.innerHTML)cTb.innerHTML=nTb.innerHTML;
    }
    const cTbl=curCard.querySelector('#tbl'),nTbl=nextCard.querySelector('#tbl');
    if(cTbl&&nTbl&&cTbl.innerHTML!==nTbl.innerHTML)cTbl.innerHTML=nTbl.innerHTML;
    const cDl=curCard.querySelector('#dlist'),nDl=nextCard.querySelector('#dlist');
    if(cDl&&nDl&&cDl.innerHTML!==nDl.innerHTML)cDl.innerHTML=nDl.innerHTML;
   }else{
    appEl.innerHTML=nextHtml;
   }
  }else{
   appEl.innerHTML=nextHtml;
  }
  if(openMrowId){
   const row=appEl.querySelector(`.mrow.tx-row[data-mrow="${CSS.escape(openMrowId)}"]`);
   if(row){row.classList.add('ro');row.setAttribute('aria-expanded','true')}
  }
  if(openDcardId){
   const dcard=appEl.querySelector(`.mday.dbt-card[data-dcard="${CSS.escape(openDcardId)}"]`);
   if(dcard){dcard.classList.add('ro');dcard.setAttribute('aria-expanded','true')}
  }
  if(activeId){
   const inp=$('#'+activeId);
   if(inp&&document.activeElement!==inp){inp.focus();try{if(selStart!==null)inp.setSelectionRange(selStart,selEnd)}catch(e){}}
  }
 }
 document.querySelectorAll('.tabs button').forEach(b=>b.classList.toggle('on',b.dataset.t===S.tab));
 document.querySelectorAll('#vms [data-vm]').forEach(b=>b.classList.toggle('on',b.dataset.vm===S.vm));
 const lbl=S.tab==='D'?'Add debt':'Add entry',atx=$('#add-tx');if(atx){atx.textContent='Add';$('#add').setAttribute('aria-label',lbl);$('#add').setAttribute('title',lbl)}else $('#add').textContent='+ '+lbl;
}
let tt;function toast(m,u){const t=$('#toast');if(!t)return;const host=document.querySelector('dialog[open]')||document.body;if(t.parentNode!==host)host.appendChild(t);t.textContent=m;t.style.pointerEvents=u?'auto':'none';t.style.cursor=u?'pointer':'';t.onclick=u?()=>{u();t.classList.remove('show')}:null;t.classList.add('show');clearTimeout(tt);tt=setTimeout(()=>t.classList.remove('show'),u?5000:2600)}

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
const MAIN_TABS=['AED','INR','D'];
function triggerSlide(el,dir){
 if(!el||!dir)return;
 el.classList.remove('slide-r','slide-l');
 void el.offsetWidth;
 const cls=dir>0?'slide-r':'slide-l';
 el.classList.add(cls);
 el.addEventListener('animationend',()=>el.classList.remove('slide-r','slide-l'),{once:true});
}
function switchMainTab(t,dir,skipAnim){
 if(!t||t===S.tab)return;
 const appEl=$('#app');
 const oldIdx=MAIN_TABS.indexOf(S.tab),newIdx=MAIN_TABS.indexOf(t);
 const d=dir||(newIdx>oldIdx?1:-1);
 if(appEl){
  appEl.querySelectorAll('.swipe-adj-card').forEach(n=>n.remove());
 }
 let outClone=null;
 if(!skipAnim&&appEl&&appEl.firstElementChild){
  outClone=appEl.firstElementChild.cloneNode(true);
  outClone.querySelectorAll('[id]').forEach(n=>n.removeAttribute('id'));
  outClone.classList.remove('slide-r','slide-l');
  outClone.classList.add('swipe-adj-card',d>0?'slide-out-l':'slide-out-r');
 }
 S.tab=t;if(t!=='D')S.cur=t;
 render();
 if(!skipAnim&&appEl){
  const inCard=appEl.querySelector(':scope > .card:not(.swipe-adj-card)');
  if(inCard){
   inCard.style.transform='';
   inCard.style.transition='';
   triggerSlide(inCard,d);
  }
  if(outClone){
   appEl.appendChild(outClone);
   outClone.addEventListener('animationend',()=>outClone.remove(),{once:true});
   setTimeout(()=>{if(outClone.parentNode)outClone.remove()},280);
  }
 }
}
document.querySelector('.tabs').onclick=e=>{const b=e.target.closest('[data-t]');if(!b)return;switchMainTab(b.dataset.t)};

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
 const payload=JSON.stringify({version:14,exported_at:new Date().toISOString(),tx:S.tx,cats:CT,debts:DB,tasks:TK,diary:DR,diary_verifier:DRV,hist:HIST,ob:OB},null,2);
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
  if(Array.isArray(j.tasks)){
   const tkIds=new Set(j.tasks.map(t=>t.id));
   const delTk=TK.filter(t=>t.id&&!tkIds.has(t.id)).map(t=>Object.assign({},t,{del:1,upd:tsNow}));
   TK=j.tasks.map(t=>Object.assign({},t,{upd:tsNow})).concat(delTk);
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
  bumpCalc();stamp();persist();syncTaskBadge();$('#bkd').close();render();sync();toast('Backup restored');
 }catch(err){if($('#bke'))$('#bke').textContent='Could not read backup JSON.'}
};

let dqRaf=0,qRaf=0,drqRaf=0;
$('#app').addEventListener('input',e=>{if(e.target.id==='dq'){S.dq=e.target.value;cancelAnimationFrame(dqRaf);dqRaf=requestAnimationFrame(()=>{if($('#dlist'))$('#dlist').innerHTML=dlist()})}});
$('#app').addEventListener('click',e=>{const b=e.target.closest('[data-dk]');
 if(!b){
  const dc=e.target.closest('[data-dcard]');
  if(dc){
   document.querySelectorAll('#dlist .mday.dbt-card.ro').forEach(r=>{if(r!==dc){r.classList.remove('ro');r.setAttribute('aria-expanded','false')}});
   const o=dc.classList.toggle('ro');
   dc.setAttribute('aria-expanded',o);
  }
  return;
 }
 const[a,i,j]=b.dataset.dk.split(':');
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
$('#app').addEventListener('input',e=>{if(e.target.id==='q'){S.q=e.target.value;S.pg=1;cancelAnimationFrame(qRaf);qRaf=requestAnimationFrame(()=>{if($('#tbl'))$('#tbl').innerHTML=tbl(S.tab);const lc=$('.lcnt');if(lc)lc.textContent=fCntTxt(S.tab)})}});
$('#app').addEventListener('click',e=>{const o=e.target.closest('.ddo'),h=e.target.closest('.ddb');
 if(o){const id=o.closest('.dd').dataset.dd,v=o.dataset.v;closeDd();if(id==='mo')S.mo=v;else if(id==='ft')S.f=v;else if(id==='pp')S.pp=+v;S.pg=1;render();return}
 if(h){const p=h.parentNode,was=p.classList.contains('open');closeDd();if(!was){p.classList.add('open');h.setAttribute('aria-expanded','true')}return}
 const b=e.target.closest&&e.target.closest('[data-m],[data-p],[data-e],[data-d],[data-ob],[data-pm],[data-mn],[data-ra],[data-fl],[data-vm],[data-cf],[data-drd],[data-mrow]');if(!b)return;const d=b.dataset;
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
 else if(d.ob!==undefined)openOb()
 else if(d.mrow){document.querySelectorAll('#tbl .mrow.tx-row.ro').forEach(r=>{if(r!==b){r.classList.remove('ro');r.setAttribute('aria-expanded','false')}});const o=b.classList.toggle('ro');b.setAttribute('aria-expanded',o)}});
IC.pl=SV+'<path d="M15 6l-6 6 6 6"/></svg>';IC.nx=SV+'<path d="M9 6l6 6-6 6"/></svg>';
const cal=document.createElement('div');cal.className='cal';cal.hidden=true;document.body.appendChild(cal);
let CI=null,CY=0,CM=0;
function calDraw(slideDir){const first=new Date(CY,CM,1),lead=(first.getDay()+6)%7,days=new Date(CY,CM+1,0).getDate(),sel=CI.value,today=iso(0);
 let h=`<div class="ch2"><button type="button" class="ib" data-cn="-1" aria-label="Previous month">${IC.pl}</button><b>${first.toLocaleDateString('en',{month:'long',year:'numeric'})}</b><button type="button" class="ib" data-cn="1" aria-label="Next month">${IC.nx}</button></div><div class="cg">${['M','T','W','T','F','S','S'].map(x=>`<i class="wd">${x}</i>`).join('')}${'<i></i>'.repeat(lead)}`;
 for(let d=1;d<=days;d++){const s=CY+'-'+String(CM+1).padStart(2,'0')+'-'+String(d).padStart(2,'0');h+=`<button type="button" class="cd${s===sel?' on':''}${s===today?' td':''}" data-cd="${s}">${d}</button>`}
 cal.innerHTML=h+`</div><div class="cf"><span class="cal-swp-hint">← Swipe month →</span><button type="button" class="ghost" data-cd="${today}">Today</button></div>`;
 if(slideDir)triggerSlide(cal.querySelector('.cg'),slideDir);
}
function calStepMonth(delta){
 if(!delta)return;
 CM+=delta;if(CM<0){CM=11;CY--}if(CM>11){CM=0;CY++}
 calDraw(delta>0?1:-1);
}
function shiftDateInput(inp,delta){
 if(!inp||!delta)return;
 const cur=fixDate(inp.value||iso(0));
 const d=new Date(cur+'T00:00:00');
 d.setDate(d.getDate()+delta);
 const next=ymd(d);
 inp.value=next;
 if(!cal.hidden&&CI===inp){
  const [y,m]=next.split('-').map(Number);CY=y;CM=m-1;calDraw(delta>0?1:-1);
 }
 triggerSlide(inp,delta>0?1:-1);
 inp.dispatchEvent(new Event('change',{bubbles:true}));
}
function calOpen(inp){CI=inp;const [y,m]=(inp.value||iso(0)).split('-').map(Number);CY=y;CM=m-1;const host=inp.closest('dialog')||document.body;host.appendChild(cal);cal.hidden=false;calDraw();
 const r=inp.getBoundingClientRect(),h=cal.offsetHeight,hr=host!==document.body?host.getBoundingClientRect():{left:0,top:0};
 const maxW=host!==document.body?host.clientWidth:innerWidth,maxH=host!==document.body?host.clientHeight:innerHeight;
 let t=(r.bottom-hr.top)+6;if(t+h>maxH-8)t=Math.max(8,(r.top-hr.top)-h-6);
 cal.style.left=Math.min(Math.max(8,r.left-hr.left),Math.max(8,maxW-298))+'px';cal.style.top=t+'px'}
document.addEventListener('click',e=>{
 if(!e.target.closest('.mrow.tx-row'))document.querySelectorAll('#tbl .mrow.tx-row.ro').forEach(r=>{r.classList.remove('ro');r.setAttribute('aria-expanded','false')});
 if(!e.target.closest('.mday.dbt-card'))document.querySelectorAll('#dlist .mday.dbt-card.ro').forEach(r=>{r.classList.remove('ro');r.setAttribute('aria-expanded','false')});
 if(!e.target.closest('.tk-card'))document.querySelectorAll('#tk-list .tk-card.ro').forEach(r=>{r.classList.remove('ro');r.setAttribute('aria-expanded','false')});
 const dp=e.target.closest('[data-dp]');if(dp){if(dp._swipedAt&&performance.now()-dp._swipedAt<150){dp._swipedAt=0;return}calOpen(dp);return}
 if(e.target.closest('.cal')){const n=e.target.closest('[data-cn]'),d=e.target.closest('[data-cd]');
  if(n){calStepMonth(+n.dataset.cn)}
  else if(d){CI.value=d.dataset.cd;cal.hidden=true;CI.dispatchEvent(new Event('change',{bubbles:true}))}
  return}
 cal.hidden=true});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!cal.hidden){e.preventDefault();cal.hidden=true}
 if((e.key==='Enter'||e.key===' ')&&e.target.matches&&e.target.matches('[data-mrow],[data-dcard],[data-tk-card]')){e.preventDefault();e.target.click();return}
 if((e.key==='Enter'||e.key===' ')&&e.target.matches&&e.target.matches('[data-dp]')){e.preventDefault();calOpen(e.target)}});
addEventListener('online',()=>{renderStatus();sync()});addEventListener('offline',renderStatus);

// ---- Zero-Knowledge AES-256-GCM Daily Diary Vault (Wrapped 256-bit Master DEK + Security Question Recovery) ----
const tEnc=new TextEncoder(),tDec=new TextDecoder();
const b64e=buf=>{let s='';const u=new Uint8Array(buf);for(let i=0;i<u.length;i++)s+=String.fromCharCode(u[i]);return btoa(s)};
const b64d=str=>{const b=atob(str),u=new Uint8Array(b.length);for(let i=0;i<b.length;i++)u[i]=b.charCodeAt(i);return u};
const normAns=s=>String(s||'').trim().toLowerCase().replace(/\s+/g,' ');
const normTaskCat=c=>c==='work'?'work':'personal';
const taskCatLabel=c=>c==='work'?'2. Work':'1. Personal';
const fmtTaskDate=s=>{if(!s)return '';const d=new Date(s+'T00:00');return isNaN(d)?s:d.toLocaleDateString('en',{day:'2-digit',month:'short',year:'numeric'})};
const normTasks=(arr,defDt)=>Array.isArray(arr)?arr.map(t=>{
 const done=!!t.done,initDate=fixDate(t.initDate||defDt||iso(0));
 return {id:String(t.id||uid()),text:String(t.text||'').trim(),cat:normTaskCat(t.cat),done,initDate,doneDate:done?fixDate(t.doneDate||defDt||iso(0)):''};
}).filter(t=>t.text):[];
const tasksEqual=(a,b)=>{const x=normTasks(a),y=normTasks(b);if(x.length!==y.length)return false;for(let i=0;i<x.length;i++){if(x[i].text!==y[i].text||x[i].done!==y[i].done||x[i].cat!==y[i].cat||x[i].initDate!==y[i].initDate||x[i].doneDate!==y[i].doneDate)return false}return true};
const normVaultCat=c=>['folder','ip','pin','other'].includes(c)?c:'other';
const vaultCatLabel=c=>({folder:'📂 Folder Tree',ip:'🌐 Platform / IP',pin:'🔑 User ID & PIN',other:'📌 Info Note'}[normVaultCat(c)]);
const vaultCatShort=c=>({folder:'📂 Folder',ip:'🌐 IP / Web',pin:'🔑 ID & PIN',other:'📌 Other'}[normVaultCat(c)]);
let DIARY_KEY=null,DIARY_DEK_B64='',DIARY_CACHE={},DIARY_DRAFTS={},VAULT_CACHE={},VAULT_DRAFT=null,drMode='diary',vlId='',vlEditMode=false,vlCat='folder',vlFCat='all',vlQ='',vlMasked=false,vlqRaf=0,vlDraftJob=0,drTasks=[],drTaskCat='personal',drLastDraftDate='',drDraftJob=0,drExplicitDate=false,drDate=iso(0),drEditMode=false,drChPw=false,drRec=false,drLockTm=null,drBgJob=0;
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
// Instant first-paint decryption (<2ms for drafts + current date + top 20 sidebar dates), followed by non-blocking background chunks for multi-year scale
async function decryptDiaryFast(){
 if(!DIARY_KEY)return;
 const job=++drBgJob,key=DIARY_KEY;
 let latestDraftDt='',latestDraftTs='';
 for(const [dt,cipher] of Object.entries(DR_DRAFTS)){
  if(job!==drBgJob||!DIARY_KEY)return;
  if(dt==='__vault__'){
   if(!VAULT_DRAFT&&cipher){
    try{
     const vd=await decDiaryObj(key,cipher);
     if(vd&&(vd.title||vd.body))VAULT_DRAFT=vd;
    }catch(e){}
   }
   continue;
  }
  if(!DIARY_DRAFTS[dt]&&cipher){
   try{
    const d=await decDiaryObj(key,cipher);
    if(d&&(d.title||d.body||normTasks(d.tasks).length)){
     DIARY_DRAFTS[dt]=d;
     const ts=d.ts||dt;
     if(!latestDraftTs||ts>=latestDraftTs){latestDraftTs=ts;latestDraftDt=dt}
    }
   }catch(e){}
  }else if(DIARY_DRAFTS[dt]){
   const ts=DIARY_DRAFTS[dt].ts||dt;
   if(!latestDraftTs||ts>=latestDraftTs){latestDraftTs=ts;latestDraftDt=dt}
  }
 }
 if(latestDraftDt){
  drLastDraftDate=latestDraftDt;
  if(!drExplicitDate)drDate=latestDraftDt;
 }
 const vList=vaultRecs();
 for(const vr of vList.slice(0,30)){
  if(job!==drBgJob||!DIARY_KEY)return;
  if(!VAULT_CACHE[vr.id]){try{VAULT_CACHE[vr.id]=await decDiaryObj(key,vr.cipher)}catch(e){}}
 }
 const active=DR.filter(r=>!r.del&&r.cipher&&!isVaultRec(r)).sort((a,b)=>b.date.localeCompare(a.date));
 const urgent=active.filter(r=>r.date===drDate).concat(active.filter(r=>r.date!==drDate).slice(0,20));
 for(const r of urgent){
  if(job!==drBgJob||!DIARY_KEY)return;
  if(!DIARY_CACHE[r.date]){try{DIARY_CACHE[r.date]=await decDiaryObj(key,r.cipher)}catch(e){}}
 }
 const rest=vList.slice(30).concat(active.slice(20));
 if(!rest.length)return;
 let i=0;
 const step=async()=>{
  if(job!==drBgJob||!DIARY_KEY)return;
  const end=Math.min(i+50,rest.length);
  for(;i<end;i++){
   const r=rest[i];
   if(isVaultRec(r)){
    if(!VAULT_CACHE[r.id]){try{VAULT_CACHE[r.id]=await decDiaryObj(key,r.cipher)}catch(e){}}
   }else{
    if(!DIARY_CACHE[r.date]){try{DIARY_CACHE[r.date]=await decDiaryObj(key,r.cipher)}catch(e){}}
   }
  }
  if(job!==drBgJob||!DIARY_KEY)return;
  if($('#drd')&&$('#drd').open&&!drChPw&&!drRec){
   if(drMode==='vault')renderVaultSidebar();
   else renderDiarySidebar();
  }
  if(i<rest.length)setTimeout(step,0);
 };
 setTimeout(step,10);
}
function syncDiaryDot(){
 const un=!!DIARY_KEY;
 const dot=$('#dr-dot'),stEl=$('#dr-st'),lkBtn=$('#dr-lk-btn');
 if(dot&&dot.classList.contains('on')!==un)dot.classList.toggle('on',un);
 if(stEl){
  const cls='dr-st '+(un?'un':'lk'),txt=un?'UNLOCKED':'LOCKED';
  if(stEl.className!==cls)stEl.className=cls;
  if(stEl.textContent!==txt)stEl.textContent=txt;
 }
 if(lkBtn&&lkBtn.hidden!==!un)lkBtn.hidden=!un;
}
function updateDraftUiMeta(){
 const hasDraft=!!DIARY_DRAFTS[drDate],rec=DR.find(x=>!x.del&&!isVaultRec(x)&&x.date===drDate&&x.cipher);
 if($('#dr-meta')){
  $('#dr-meta').className='dr-meta'+(hasDraft?' draft':'');
  $('#dr-meta').title=hasDraft?'Unsaved draft in memory':'';
  $('#dr-meta').setAttribute('aria-label',hasDraft?'Unsaved draft in memory':'');
  $('#dr-meta').textContent=hasDraft?'📝':(rec?`Encrypted AES-256-GCM · Updated ${new Date(rec.upd).toLocaleTimeString('en',{hour:'numeric',minute:'2-digit'})}`:'AES-256-GCM · New note');
 }
 if($('#dr-cancel-edit')){
  $('#dr-cancel-edit').hidden=!(rec||hasDraft);
  $('#dr-cancel-edit').textContent=hasDraft?'Discard draft':'Cancel';
 }
}
async function persistDiaryDraftDate(dt){
 if(!DIARY_KEY)return false;
 const d=DIARY_DRAFTS[dt];
 if(!d){
  if(DR_DRAFTS[dt]){delete DR_DRAFTS[dt];saveDrDrafts()}
  return false;
 }
 try{
  DR_DRAFTS[dt]=await encDiaryObj(DIARY_KEY,d);
  saveDrDrafts();
  return true;
 }catch(e){return false}
}
function getUnfinishedPrevTasks(){
 const curSet=new Set(drTasks.map(t=>t.text.toLowerCase()));
 const out=[],seen=new Set();
 const dates=Array.from(new Set([...Object.keys(DIARY_CACHE),...Object.keys(DIARY_DRAFTS)])).filter(dt=>dt<drDate).sort().reverse();
 for(const dt of dates){
  const src=DIARY_DRAFTS[dt]||DIARY_CACHE[dt];
  if(!src||!Array.isArray(src.tasks))continue;
  for(const t of src.tasks){
   const txt=String(t.text||'').trim(),k=txt.toLowerCase();
   if(txt&&!t.done&&!curSet.has(k)&&!seen.has(k)){seen.add(k);out.push({id:uid(),text:txt,done:false})}
  }
 }
 return out;
}
function renderDiaryTasksEditor(){
 document.querySelectorAll('#dr-tcat button').forEach(b=>b.classList.toggle('on',b.dataset.dtc===drTaskCat));
 const tot=drTasks.length,done=drTasks.filter(t=>t.done).length;
 if($('#dr-tprog')){
  $('#dr-tprog').textContent=tot?`${done}/${tot} done`:'0 tasks';
  $('#dr-tprog').className='dr-cnt-pill'+(tot&&done===tot?' ok':'');
 }
 if($('#dr-tcarry')){
  const prev=getUnfinishedPrevTasks();
  $('#dr-tcarry').hidden=!prev.length;
  if(prev.length)$('#dr-tcarry').textContent=`+ Carry over ${prev.length} unfinished`;
 }
 if($('#dr-tlist')){
  $('#dr-tlist').hidden=!tot;
  $('#dr-tlist').innerHTML=drTasks.map(t=>{
   const cat=normTaskCat(t.cat);
   return `<div class="dr-trow${t.done?' done':''}" style="grid-template-columns:auto auto 1fr auto"><button type="button" class="dr-tchk${t.done?' on':''}" data-dt-tog="${esc(t.id)}" aria-label="${t.done?'Mark incomplete':'Mark completed'}" title="${t.done?'Completed':'Tap to mark completed'}">✓</button><button type="button" class="dr-tcat-btn ${cat}" data-dt-cat="${esc(t.id)}" title="Tap to switch category">${taskCatLabel(cat)}</button><input type="text" class="dr-ttxt${t.done?' done':''}" data-dt-edit="${esc(t.id)}" value="${esc(t.text)}" maxlength="140" aria-label="Task text"><button type="button" class="dr-tdel" data-dt-del="${esc(t.id)}" aria-label="Remove task" title="Remove task">×</button></div>`;
  }).join('');
 }
}
function captureDiaryDraft(){
 if(!DIARY_KEY||!$('#dr-form')||$('#dr-form').hidden||!$('#dr-ttl')||!$('#dr-bdy'))return false;
 const title=$('#dr-ttl').value,body=$('#dr-bdy').value,tasks=normTasks(drTasks);
 const cur=DIARY_CACHE[drDate]||{title:'',body:'',tasks:[]};
 const isSame=title.trim()===(cur.title||'').trim()&&body.trim()===(cur.body||'').trim()&&tasksEqual(tasks,cur.tasks);
 const isEmpty=!title.trim()&&!body.trim()&&!tasks.length&&!hasDiary(drDate);
 const hadDraft=!!DIARY_DRAFTS[drDate];
 if(isSame||isEmpty){
  if(hadDraft){
   delete DIARY_DRAFTS[drDate];
   delete DR_DRAFTS[drDate];
   saveDrDrafts();
   updateDraftUiMeta();
   renderDiarySidebar();
  }
  return false;
 }
 DIARY_DRAFTS[drDate]={title,body,tasks,ts:now()};
 drLastDraftDate=drDate;
 updateDraftUiMeta();
 if(!hadDraft)renderDiarySidebar();
 const dt=drDate,job=++drDraftJob;
 setTimeout(()=>{if(job===drDraftJob)persistDiaryDraftDate(dt)},120);
 return true;
}
async function persistVaultDraft(){
 if(!DIARY_KEY)return false;
 if(!VAULT_DRAFT){
  if(DR_DRAFTS.__vault__){delete DR_DRAFTS.__vault__;saveDrDrafts()}
  return false;
 }
 try{
  DR_DRAFTS.__vault__=await encDiaryObj(DIARY_KEY,VAULT_DRAFT);
  saveDrDrafts();
  return true;
 }catch(e){return false}
}
function updateVaultDraftUiMeta(){
 const vList=vaultRecs();
 const rec=(vlId&&vlId!=='__new__')?vList.find(x=>x.id===vlId):null;
 const hasDraft=!!(VAULT_DRAFT&&VAULT_DRAFT.targetId===(rec?rec.id:'__new__'));
 if($('#vl-meta')){
  $('#vl-meta').className='dr-meta'+(hasDraft?' draft':'');
  $('#vl-meta').title=hasDraft?'Unsaved draft in memory':'';
  $('#vl-meta').setAttribute('aria-label',hasDraft?'Unsaved draft in memory':'');
  $('#vl-meta').textContent=hasDraft?'📝':(rec?'AES-256-GCM · Editing':'AES-256-GCM · New record');
 }
 if($('#vl-cancel')){
  $('#vl-cancel').hidden=!(rec||hasDraft||vList.length>0);
  $('#vl-cancel').textContent=hasDraft?'Discard draft':'Cancel';
 }
}
function captureVaultDraft(){
 if(!DIARY_KEY||!$('#vl-form')||$('#vl-form').hidden||!$('#vl-ttl')||!$('#vl-bdy'))return false;
 const title=$('#vl-ttl').value,body=$('#vl-bdy').value,date=fixDate(($('#vl-dt')&&$('#vl-dt').value)||iso(0)),cat=normVaultCat(vlCat);
 const cur=(vlId&&vlId!=='__new__'&&VAULT_CACHE[vlId])?VAULT_CACHE[vlId]:{title:'',body:'',cat:'folder',date:iso(0)};
 const isSame=title.trim()===(cur.title||'').trim()&&body.trim()===(cur.body||'').trim()&&cat===normVaultCat(cur.cat)&&date===(cur.date||iso(0));
 const isEmpty=!title.trim()&&!body.trim();
 const hadDraft=!!VAULT_DRAFT;
 if(isSame||isEmpty){
  if(VAULT_DRAFT){
   VAULT_DRAFT=null;
   delete DR_DRAFTS.__vault__;
   saveDrDrafts();
   updateVaultDraftUiMeta();
   renderVaultSidebar();
  }
  return false;
 }
 VAULT_DRAFT={targetId:vlId||'__new__',date,cat,title,body,ts:now()};
 updateVaultDraftUiMeta();
 if(!hadDraft)renderVaultSidebar();
 const job=++vlDraftJob;
 setTimeout(()=>{if(job===vlDraftJob)persistVaultDraft()},120);
 return true;
}
async function flushDiaryDraft(){
 captureDiaryDraft();
 captureVaultDraft();
 let did=false;
 if(DIARY_DRAFTS[drDate]){
  await persistDiaryDraftDate(drDate);
  did=true;
 }
 if(VAULT_DRAFT){
  await persistVaultDraft();
  did=true;
 }
 return did;
}
function lockDiary(){
 drBgJob++;DIARY_KEY=null;DIARY_DEK_B64='';DIARY_CACHE={};DIARY_DRAFTS={};VAULT_CACHE={};VAULT_DRAFT=null;vlEditMode=false;vlMasked=false;drTasks=[];drEditMode=false;drChPw=false;drRec=false;
 if($('#dr-ttl'))$('#dr-ttl').value='';
 if($('#dr-bdy'))$('#dr-bdy').value='';
 if($('#dr-tinp'))$('#dr-tinp').value='';
 if($('#dr-tlist')){$('#dr-tlist').innerHTML='';$('#dr-tlist').hidden=true}
 if($('#dr-vttl'))$('#dr-vttl').textContent='';
 if($('#dr-vtasks')){$('#dr-vtasks').innerHTML='';$('#dr-vtasks').hidden=true}
 if($('#dr-vbdy'))$('#dr-vbdy').textContent='';
 if($('#dr-list'))$('#dr-list').innerHTML='';
 if($('#dr-sum'))$('#dr-sum').innerHTML='';
 if($('#vl-ttl'))$('#vl-ttl').value='';
 if($('#vl-bdy'))$('#vl-bdy').value='';
 if($('#vl-vttl'))$('#vl-vttl').textContent='';
 if($('#vl-vbdy')){$('#vl-vbdy').textContent='';$('#vl-vbdy').classList.remove('masked')}
 if($('#vl-list'))$('#vl-list').innerHTML='';
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
 const allDates=Array.from(new Set([...drDates,...Object.keys(DIARY_DRAFTS),drDate])).sort();
 const matched=q?allDates.filter(dt=>{const n=DIARY_DRAFTS[dt]||DIARY_CACHE[dt]||{title:'',body:'',tasks:[]};return dt.includes(q)||(n.title||'').toLowerCase().includes(q)||(n.body||'').toLowerCase().includes(q)||normTasks(n.tasks).some(t=>t.text.toLowerCase().includes(q))}):allDates;
 const slice=(!q&&!drShowAll&&matched.length>60)?matched.slice(-60):matched;
 if(slice.length<matched.length&&!slice.includes(drDate))slice.unshift(drDate);
 $('#dr-list').innerHTML=(slice.length<matched.length?`<button type="button" class="ghost" data-dr-more="1" style="font-size:12px;padding:7px;flex:none">Show all ${matched.length} dates</button>`:'')+slice.map(dt=>{
  const draft=DIARY_DRAFTS[dt],n=draft||DIARY_CACHE[dt]||{title:'',body:'',tasks:[]},saved=hasDiary(dt);
  const tks=normTasks(n.tasks),tDone=tks.filter(t=>t.done).length;
  const sm=dayLedgerSummary(dt),fp=[];
  if(tks.length)fp.push(`✓ ${tDone}/${tks.length}`);
  if(sm.AED.out||sm.AED.in)fp.push('AED −'+sm.AED.out);
  if(sm.INR.out||sm.INR.in)fp.push('₹ −'+sm.INR.out);
  const dtStr=new Date(dt+'T00:00').toLocaleDateString('en',{day:'2-digit',month:'short',year:'numeric'});
  const topTag=draft?'📝':(saved?'🔒 AES':'New');
  const ttlTxt=(n.title||'').trim()||(tks.length?tks[0].text:(draft?(n.body||'').trim().slice(0,28)||'Draft…':(saved?'Saved note':'No note yet')));
  return `<button type="button" class="dr-item${dt===drDate?' on':''}" data-dr-item="${dt}"><div class="dr-item-top"><span>${dtStr}</span><span>${topTag}</span></div><b>${esc(ttlTxt)}</b><small>${esc(fp.join(' · ')||'No ledger entries')}</small></button>`;
 }).join('')||'<div class="hint" style="padding:8px">No matching diary notes.</div>';
 requestAnimationFrame(()=>{
  const list=$('#dr-list'),act=list&&list.querySelector('.dr-item.on');
  if(list&&act){
   if(list.scrollWidth>list.clientWidth){
    const left=act.offsetLeft-(list.clientWidth/2)+(act.offsetWidth/2);
    list.scrollTo({left:Math.max(0,left),behavior:'smooth'});
   }else if(list.scrollHeight>list.clientHeight){
    const top=act.offsetTop-(list.clientHeight/2)+(act.offsetHeight/2);
    list.scrollTo({top:Math.max(0,top),behavior:'smooth'});
   }
  }
 });
}
async function renderDiaryDate(keepInputs){
 if($('#dr-dt'))$('#dr-dt').value=drDate;
 const sm=dayLedgerSummary(drDate);
 const dtLabel=new Date(drDate+'T00:00').toLocaleDateString('en',{weekday:'short',day:'2-digit',month:'short',year:'numeric'});
 if($('#dr-sum')){
  $('#dr-sum').innerHTML=`<div class="dr-sum-hd"><span>Spending · ${esc(dtLabel)}</span><span class="dr-cnt-pill">${sm.list.length} ${sm.list.length===1?'entry':'entries'}</span></div>
   <div class="dr-sum-grid">
    <div class="dr-sum-box"><div class="dr-sum-top"><span class="code" style="--acc:var(--aed)">AED</span><span class="hint" style="font-size:11px">Dirham</span></div><div class="dr-sum-kv"><span>Spent</span><b style="color:var(--out)">${fmt('AED',sm.AED.out)}</b></div><div class="dr-sum-kv"><span>In</span><b style="color:var(--in)">+${fmt('AED',sm.AED.in)}</b></div></div>
    <div class="dr-sum-box"><div class="dr-sum-top"><span class="code" style="--acc:var(--inr)">INR</span><span class="hint" style="font-size:11px">Rupee</span></div><div class="dr-sum-kv"><span>Spent</span><b style="color:var(--out)">${fmt('INR',sm.INR.out)}</b></div><div class="dr-sum-kv"><span>In</span><b style="color:var(--in)">+${fmt('INR',sm.INR.in)}</b></div></div>
   </div>
   ${sm.list.length?`<div class="dr-sum-tx">${sm.list.map(x=>`<div class="dr-sum-r"><span><b>${esc(x.cat)}</b>${x.note?' · '+esc(x.note):''}</span><span class="num amt ${x.type}">${x.type==='out'?'−':'+'}${fmt(x.cur,x.amt)}</span></div>`).join('')}</div>`:`<div class="hint" style="font-size:12px">No AED or INR transactions recorded on ${esc(drDate)}.</div>`}`;
 }
 const rec=DR.find(x=>!x.del&&!isVaultRec(x)&&x.date===drDate&&x.cipher);
 if(rec&&DIARY_KEY&&!DIARY_CACHE[drDate]){
  try{DIARY_CACHE[drDate]=await decDiaryObj(DIARY_KEY,rec.cipher)}catch(e){}
 }
 const draft=DIARY_DRAFTS[drDate];
 const savedNote=DIARY_CACHE[drDate]||{title:'',body:'',tasks:[]};
 const n=draft||savedNote;
 const showEdit=!rec||drEditMode||!!draft;
 if($('#dr-view')){
  $('#dr-view').hidden=showEdit;
  if(!keepInputs){$('#dr-view').classList.remove('ro');$('#dr-view').setAttribute('aria-expanded','false')}
 }
 if($('#dr-form'))$('#dr-form').hidden=!showEdit;
 if(!showEdit&&rec){
  const tStr=new Date(rec.upd).toLocaleTimeString('en',{hour:'numeric',minute:'2-digit'});
  if($('#dr-vmeta'))$('#dr-vmeta').textContent=`AES-256-GCM · Saved ${tStr} · Tap card for options`;
  if($('#dr-vttl'))$('#dr-vttl').textContent=savedNote.title||'Daily note';
  const vTasks=normTasks(savedNote.tasks,drDate);
  if($('#dr-vtasks')){
   $('#dr-vtasks').hidden=!vTasks.length;
   if(vTasks.length){
    const vDone=vTasks.filter(t=>t.done).length,pct=Math.round(vDone/vTasks.length*100);
    $('#dr-vtasks').open=true;
    $('#dr-vtasks').innerHTML=`<summary class="dr-vthd"><span>Daily Tasks · Tap to toggle</span><span class="dr-cnt-pill${vDone===vTasks.length?' ok':''}">${vDone}/${vTasks.length} done</span></summary><div class="dr-vtasks-b"><div class="dr-tpbar"><i style="width:${pct}%"></i></div><div class="dr-vtlist">${vTasks.map(t=>{const cat=normTaskCat(t.cat);return `<button type="button" class="dr-vtrow${t.done?' done':''}" data-vt-tog="${esc(t.id)}"><span class="dr-tchk${t.done?' on':''}">✓</span><span><strong class="tk-cat-txt ${cat}" style="margin-right:6px">${taskCatLabel(cat)}</strong>${esc(t.text)}</span></button>`}).join('')}</div></div>`;
   }else $('#dr-vtasks').innerHTML='';
  }
  if($('#dr-vbdy')){
   const hasBody=!!(savedNote.body&&savedNote.body.trim());
   $('#dr-vbdy').hidden=!hasBody&&vTasks.length>0;
   $('#dr-vbdy').textContent=hasBody?savedNote.body:'No additional details written for this date.';
  }
 }
 if(!keepInputs){
  if($('#dr-ttl'))$('#dr-ttl').value=n.title||'';
  if($('#dr-bdy'))$('#dr-bdy').value=n.body||'';
  if($('#dr-tinp'))$('#dr-tinp').value='';
  drTasks=normTasks(n.tasks);
  if($('#dr-tbox'))$('#dr-tbox').open=drTasks.length>0;
  renderDiaryTasksEditor();
 }
 if($('#dr-del'))$('#dr-del').hidden=!rec;
 updateDraftUiMeta();
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
  if(c.del)items.push({mode:'del',kind:'cat',id:c.id||String(idx),ts:c.upd||now(),tag:'Category',title:c.n,sub:`Permitted: ${TLAB[c.t]||c.t}`});
 });
 TK.forEach(t=>{
  if(t.del)items.push({mode:'del',kind:'task',id:t.id,ts:t.upd||new Date(t.ts||Date.now()).toISOString(),tag:'Task',title:`${taskCatLabel(t.cat)} · ${t.text}`,sub:`Init: ${t.initDate}${t.done&&t.doneDate?' · Done: '+t.doneDate:' · Pending'}`});
 });
 DR.forEach(r=>{
  if(r.del&&r.cipher){
   const isV=isVaultRec(r),vc=isV?VAULT_CACHE[r.id]:null;
   items.push({mode:'del',kind:'diary',id:r.id,ts:r.upd||now(),tag:isV?'Info Vault':'Diary Note',title:isV?(vc&&vc.title?`${vaultCatShort(vc.cat)} · ${vc.title}`:`Encrypted Info · ${r.date}`):`Encrypted Note · ${r.date}`,sub:`AES-256-GCM record · ${r.date}`});
  }
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
   const c=CT.find(x=>x.id===id)||CT[+id];if(!c)return;
   c.del=0;c.upd=ts;saveC();renderCm();paint();sync();toast('Category restored');
  }else if(kind==='task'){
   const t=TK.find(x=>x.id===id);if(!t)return;
   t.del=0;t.upd=ts;tksave();if(typeof renderTasksList==='function')renderTasksList();toast('Task restored');
  }else if(kind==='diary'){
   const r=DR.find(x=>x.id===id);if(!r)return;
   r.del=0;r.upd=ts;
   if(DIARY_KEY&&r.cipher){
    try{
     const dec=await decDiaryObj(DIARY_KEY,r.cipher);
     if(isVaultRec(r))VAULT_CACHE[r.id]=dec;
     else DIARY_CACHE[r.date]=dec;
    }catch(err){}
   }
   drsave();render();toast(isVaultRec(r)?'Encrypted vault record restored':'Encrypted diary note restored');
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
  }else if(h.kind==='task'&&h.prev){
   const t=TK.find(x=>x.id===h.targetId);if(!t)return;
   Object.assign(t,h.prev,{upd:ts});
   h.done=1;saveHist();tksave();if(typeof renderTasksList==='function')renderTasksList();toast('Task reverted to previous version');
  }else if(h.kind==='diary'&&h.prevCipher){
   const r=DR.find(x=>x.id===h.targetId);if(!r)return;
   r.cipher=h.prevCipher;r.del=0;r.upd=ts;
   if(DIARY_KEY){
    try{
     const dec=await decDiaryObj(DIARY_KEY,r.cipher);
     if(isVaultRec(r))VAULT_CACHE[r.id]=dec;
     else DIARY_CACHE[r.date]=dec;
    }catch(err){}
   }
   h.done=1;saveHist();drsave();render();toast(isVaultRec(r)?'Vault record reverted to previous version':'Diary note reverted to previous version');
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
 syncVaultBadge();
 const hasV=!!(DRV&&DRV.v),un=!!DIARY_KEY;
 const dlg=$('#drd');
 if(dlg&&dlg.classList.contains('un')!==un)dlg.classList.toggle('un',un);
 const mbar=$('#dr-mbar');
 if(mbar){
  if(mbar.hidden!==!un)mbar.hidden=!un;
  mbar.classList.remove('dragging');
  mbar.style.removeProperty('--mbar-p');
  mbar.classList.toggle('vault-on',drMode==='vault');
  document.querySelectorAll('#dr-mbar [data-drm]').forEach(b=>{
   const isOn=b.dataset.drm===drMode;
   if(b.classList.contains('on')!==isOn)b.classList.toggle('on',isOn);
  });
 }
 const lockEl=$('#dr-lock'),vpEl=$('#dr-vp'),trackEl=$('#dr-track'),workEl=$('#dr-work'),vaultEl=$('#dr-vault');
 if(lockEl&&lockEl.hidden!==un)lockEl.hidden=un;
 if(vpEl&&vpEl.hidden!==!un)vpEl.hidden=!un;
 if(workEl){
  if(workEl.hidden)workEl.hidden=false;
  workEl.setAttribute('aria-hidden',(!un||drMode==='vault')?'true':'false');
 }
 if(vaultEl){
  if(vaultEl.hidden)vaultEl.hidden=false;
  vaultEl.setAttribute('aria-hidden',(!un||drMode!=='vault')?'true':'false');
 }
 if(trackEl){
  trackEl.classList.remove('dragging');
  trackEl.style.transform='';
  trackEl.classList.toggle('vault-on',drMode==='vault');
 }
 if(!un){
  if($('#dr-uer'))$('#dr-uer').textContent='';
  if($('#dr-upw'))$('#dr-upw').placeholder=hasV?'Enter vault password':'Create a password to start';
  if($('#dr-ubtn'))$('#dr-ubtn').textContent=hasV?'Unlock Diary & Vault':'Set password & unlock';
  if($('#dr-uhint')){$('#dr-uhint').hidden=!(hasV&&DRV.hint);$('#dr-uhint').textContent=DRV.hint?'Hint: '+DRV.hint:''}
 }else{
  if(!drDate)drDate=iso(0);
  const vList=vaultRecs();
  if(VAULT_DRAFT&&!vlId){
   vlId=VAULT_DRAFT.targetId||'__new__';
   vlEditMode=true;
  }else if(!vlId||(vlId!=='__new__'&&!vList.some(x=>x.id===vlId))){
   if(vList.length){vlId=vList[0].id;vlEditMode=false}
   else{vlId='__new__';vlEditMode=true}
  }
  renderDiarySidebar();
  renderDiaryDate(false);
  renderVaultSidebar();
  renderVaultMain(false);
 }
}
function openDiary(dt,mode){
 if(dt)drMode='diary';
 else if(mode)drMode=mode==='vault'?'vault':'diary';
 else drMode=drMode==='vault'?'vault':'diary';
 if(drMode==='diary'){
  if(dt){drDate=fixDate(dt);drExplicitDate=true}
  else{
   drExplicitDate=false;
   if(DIARY_KEY&&drLastDraftDate&&DIARY_DRAFTS[drLastDraftDate])drDate=drLastDraftDate;
   else if(!drDate)drDate=iso(0);
  }
  drEditMode=false;
 }else{
  const vList=vaultRecs();
  if(VAULT_DRAFT){vlId=VAULT_DRAFT.targetId||'__new__';vlEditMode=true}
  else if(!vlId||(vlId!=='__new__'&&!vList.some(x=>x.id===vlId))){
   if(vList.length){vlId=vList[0].id;vlEditMode=false}
   else{vlId='__new__';vlEditMode=true}
  }
 }
 renderDiaryModal();
 if($('#drd')&&!$('#drd').open)$('#drd').showModal();
 if(!DIARY_KEY&&$('#dr-upw')){$('#dr-upw').value='';$('#dr-upw').focus()}
}
if($('#drb'))$('#drb').onclick=()=>openDiary(null,drMode);
function switchDiaryMode(nextMode){
 if(!nextMode)return;
 const trackEl=$('#dr-track'),mbar=$('#dr-mbar');
 if(trackEl){trackEl.classList.remove('dragging');trackEl.style.transform=''}
 if(mbar){mbar.classList.remove('dragging');mbar.style.removeProperty('--mbar-p')}
 if(nextMode===drMode){
  if(trackEl)trackEl.classList.toggle('vault-on',drMode==='vault');
  if(mbar)mbar.classList.toggle('vault-on',drMode==='vault');
  return;
 }
 captureDiaryDraft();
 captureVaultDraft();
 if(DIARY_DRAFTS[drDate])persistDiaryDraftDate(drDate);
 if(VAULT_DRAFT)persistVaultDraft();
 drMode=nextMode;
 renderDiaryModal();
}
if($('#dr-mbar'))$('#dr-mbar').onclick=e=>{
 const b=e.target.closest('[data-drm]');
 if(!b||b.dataset.drm===drMode)return;
 switchDiaryMode(b.dataset.drm);
};
if($('#drd'))$('#drd').addEventListener('close',()=>{if(DIARY_KEY)flushDiaryDraft()});
if($('#dr-cx'))$('#dr-cx').onclick=async()=>{
 await flushDiaryDraft();
 $('#drd').close();
};
if($('#dr-lk-btn'))$('#dr-lk-btn').onclick=async()=>{
 await flushDiaryDraft();
 lockDiary();renderDiaryModal();
 if($('#dr-upw'))$('#dr-upw').focus();
 toast('Vault locked');
};
if($('#dr-to-st'))$('#dr-to-st').onclick=async()=>{await flushDiaryDraft();if($('#drd'))$('#drd').close();openSettings('diary')};

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
   drsave();renderDiaryModal();toast('Vault password set & unlocked');
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
    const plain=(isVaultRec(r)?VAULT_CACHE[r.id]:DIARY_CACHE[r.date])||await decDiaryObj(DIARY_KEY,r.cipher);
    r.cipher=await encDiaryObj(newKey,plain);r.upd=ts;
   }
   for(const [dt,d] of Object.entries(DIARY_DRAFTS)){
    DR_DRAFTS[dt]=await encDiaryObj(newKey,d);
   }
   if(VAULT_DRAFT)DR_DRAFTS.__vault__=await encDiaryObj(newKey,VAULT_DRAFT);
   saveDrDrafts();
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
    const plain=(isVaultRec(r)?VAULT_CACHE[r.id]:DIARY_CACHE[r.date])||await decDiaryObj(DIARY_KEY,r.cipher);
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
   DIARY_KEY=key;DIARY_DEK_B64=dekB64;DIARY_CACHE={};DIARY_DRAFTS={};DR_DRAFTS={};saveDrDrafts();
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
 DR_DRAFTS={};saveDrDrafts();
 lockDiary();
 if($('#dr-rwipe'))$('#dr-rwipe').value='';
 drsave();render();renderSettingsTab();
 toast('Diary vault reset. Set a new password above.');
};
if($('#dr-ttl'))$('#dr-ttl').addEventListener('input',captureDiaryDraft);
if($('#dr-bdy'))$('#dr-bdy').addEventListener('input',captureDiaryDraft);
if($('#dr-tcat'))$('#dr-tcat').onclick=e=>{
 const b=e.target.closest('[data-dtc]');if(!b)return;
 drTaskCat=normTaskCat(b.dataset.dtc);
 renderDiaryTasksEditor();
};
const addDiaryTaskFromInput=()=>{
 const inp=$('#dr-tinp');if(!inp)return;
 const txt=inp.value.trim();if(!txt)return;
 drTasks.push({id:uid(),text:txt,cat:drTaskCat,done:false,initDate:drDate,doneDate:''});
 inp.value='';
 if($('#dr-tbox'))$('#dr-tbox').open=true;
 renderDiaryTasksEditor();
 captureDiaryDraft();
 renderDiarySidebar();
 inp.focus();
};
if($('#dr-tbtn'))$('#dr-tbtn').onclick=addDiaryTaskFromInput;
if($('#dr-tinp'))$('#dr-tinp').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();addDiaryTaskFromInput()}});
if($('#dr-tcarry'))$('#dr-tcarry').onclick=e=>{
 e.preventDefault();e.stopPropagation();
 const prev=getUnfinishedPrevTasks();
 if(!prev.length)return;
 drTasks.push(...prev);
 if($('#dr-tbox'))$('#dr-tbox').open=true;
 renderDiaryTasksEditor();
 captureDiaryDraft();
 renderDiarySidebar();
 toast(`Carried over ${prev.length} unfinished ${prev.length===1?'task':'tasks'}`);
};
if($('#dr-tlist')){
 $('#dr-tlist').addEventListener('click',e=>{
  const tog=e.target.closest('[data-dt-tog]'),catBtn=e.target.closest('[data-dt-cat]'),delBtn=e.target.closest('[data-dt-del]');
  if(tog){
   const t=drTasks.find(x=>x.id===tog.dataset.dtTog);
   if(t){t.done=!t.done;t.doneDate=t.done?(t.doneDate||drDate):'';renderDiaryTasksEditor();captureDiaryDraft();renderDiarySidebar()}
  }else if(catBtn){
   const t=drTasks.find(x=>x.id===catBtn.dataset.dtCat);
   if(t){t.cat=t.cat==='work'?'personal':'work';renderDiaryTasksEditor();captureDiaryDraft();renderDiarySidebar()}
  }else if(delBtn){
   drTasks=drTasks.filter(x=>x.id!==delBtn.dataset.dtDel);
   renderDiaryTasksEditor();captureDiaryDraft();renderDiarySidebar();
  }
 });
 $('#dr-tlist').addEventListener('input',e=>{
  const ed=e.target.closest('[data-dt-edit]');
  if(!ed)return;
  const t=drTasks.find(x=>x.id===ed.dataset.dtEdit);
  if(t){t.text=ed.value;captureDiaryDraft();renderDiarySidebar()}
 });
}
if($('#dr-vtasks'))$('#dr-vtasks').addEventListener('click',async e=>{
 const btn=e.target.closest('[data-vt-tog]');
 if(!btn||!DIARY_KEY)return;
 const cur=DIARY_CACHE[drDate];if(!cur||!Array.isArray(cur.tasks))return;
 const t=cur.tasks.find(x=>String(x.id)===btn.dataset.vtTog);
 if(!t)return;
 t.done=!t.done;
 t.doneDate=t.done?(t.doneDate||drDate):'';
 renderDiaryDate(false);
 renderDiarySidebar();
 const cipher=await encDiaryObj(DIARY_KEY,cur);
 const rec=DR.find(x=>!x.del&&!isVaultRec(x)&&x.date===drDate);
 if(rec){rec.cipher=cipher;rec.upd=now();drsave()}
});
const shiftDiaryDate=delta=>{
 const prevDt=drDate;
 captureDiaryDraft();
 if(DIARY_DRAFTS[prevDt])persistDiaryDraftDate(prevDt);
 const d=new Date(drDate+'T00:00:00');
 d.setDate(d.getDate()+delta);
 drDate=ymd(d);
 drExplicitDate=true;
 drEditMode=false;
 renderDiarySidebar();
 renderDiaryDate(false);
 const activePane=$('#dr-view')&&!$('#dr-view').hidden?$('#dr-view'):$('#dr-form');
 triggerSlide(activePane,delta>0?1:-1);
};
if($('#dr-prev'))$('#dr-prev').onclick=()=>shiftDiaryDate(-1);
if($('#dr-next'))$('#dr-next').onclick=()=>shiftDiaryDate(1);
if($('#dr-td'))$('#dr-td').onclick=()=>{const prevDt=drDate;captureDiaryDraft();if(DIARY_DRAFTS[prevDt])persistDiaryDraftDate(prevDt);drDate=iso(0);drExplicitDate=true;drEditMode=false;renderDiarySidebar();renderDiaryDate(false)};
if($('#dr-dt'))$('#dr-dt').onchange=e=>{if(e.target.value){const prevDt=drDate;captureDiaryDraft();if(DIARY_DRAFTS[prevDt])persistDiaryDraftDate(prevDt);drDate=fixDate(e.target.value);drExplicitDate=true;drEditMode=false;renderDiarySidebar();renderDiaryDate(false)}};
if($('#dr-q'))$('#dr-q').oninput=()=>{cancelAnimationFrame(drqRaf);drqRaf=requestAnimationFrame(renderDiarySidebar)};
if($('#dr-list'))$('#dr-list').onclick=e=>{if(e.target.closest('[data-dr-more]')){drShowAll=true;renderDiarySidebar();return}const b=e.target.closest('[data-dr-item]');if(!b)return;const prevDt=drDate;captureDiaryDraft();if(DIARY_DRAFTS[prevDt])persistDiaryDraftDate(prevDt);drDate=b.dataset.drItem;drExplicitDate=true;drEditMode=false;renderDiarySidebar();renderDiaryDate(false)};
if($('#dr-ins'))$('#dr-ins').onclick=()=>{
 if(!drEditMode){drEditMode=true;renderDiaryDate(true)}
 const sm=dayLedgerSummary(drDate);
 const lines=[`--- Spending Summary (${drDate}) ---`];
 if(sm.AED.out||sm.AED.in)lines.push(`AED: Spent ${fmt('AED',sm.AED.out)} | Received ${fmt('AED',sm.AED.in)}`);
 if(sm.INR.out||sm.INR.in)lines.push(`INR: Spent ${fmt('INR',sm.INR.out)} | Received ${fmt('INR',sm.INR.in)}`);
 sm.list.forEach(x=>lines.push(`• ${x.cat}${x.note?' ('+x.note+')':''}: ${x.type==='out'?'−':'+'}${fmt(x.cur,x.amt)}`));
 const b=$('#dr-bdy');
 b.value=(b.value.trim()?b.value.trim()+'\n\n':'')+lines.join('\n');
 captureDiaryDraft();
 b.focus();
};
if($('#dr-view')){
 $('#dr-view').addEventListener('click',e=>{
  if(e.target.closest('summary,[data-vt-tog],#dr-edit,#dr-vdel'))return;
  const sel=window.getSelection&&window.getSelection();
  if(sel&&String(sel).trim().length>0)return;
  const o=$('#dr-view').classList.toggle('ro');
  $('#dr-view').setAttribute('aria-expanded',o);
 });
 $('#dr-view').addEventListener('keydown',e=>{
  if(e.target!==$('#dr-view'))return;
  if(e.key==='Enter'||e.key===' '){
   e.preventDefault();
   const o=$('#dr-view').classList.toggle('ro');
   $('#dr-view').setAttribute('aria-expanded',o);
  }
 });
}
if($('#dr-edit'))$('#dr-edit').onclick=e=>{
 e.stopPropagation();
 drEditMode=true;
 renderDiaryDate(false);
 if($('#dr-bdy'))$('#dr-bdy').focus();
};
if($('#dr-cancel-edit'))$('#dr-cancel-edit').onclick=()=>{
 const hadDraft=!!DIARY_DRAFTS[drDate];
 delete DIARY_DRAFTS[drDate];
 delete DR_DRAFTS[drDate];
 saveDrDrafts();
 drEditMode=false;
 renderDiarySidebar();
 renderDiaryDate(false);
 if(hadDraft)toast('Draft discarded');
};
if($('#dr-sv'))$('#dr-sv').onclick=async()=>{
 if(!DIARY_KEY)return;
 if($('#dr-tinp')&&$('#dr-tinp').value.trim()){
  drTasks.push({id:uid(),text:$('#dr-tinp').value.trim(),cat:drTaskCat,done:false,initDate:drDate,doneDate:''});
  $('#dr-tinp').value='';
 }
 const title=$('#dr-ttl').value.trim(),body=$('#dr-bdy').value.trim(),tasks=normTasks(drTasks,drDate);
 if(!title&&!body&&!tasks.length){toast('Write a headline, note, or task first');return}
 const plain={title:title||(tasks.length?'Daily tasks':'Daily note'),body,tasks};
 const cipher=await encDiaryObj(DIARY_KEY,plain);
 const id='dry_'+drDate,ts=now();
 let rec=DR.find(x=>x.id===id);
 if(rec){
  const prevC=DIARY_CACHE[drDate]||{};
  if(!rec.del&&rec.cipher&&(plain.title!==prevC.title||plain.body!==prevC.body||!tasksEqual(plain.tasks,prevC.tasks))){
   logHist({kind:'diary',targetId:rec.id,date:drDate,label:`Diary Note · ${drDate}`,sub:`Previous encrypted version saved`,prevCipher:rec.cipher});
  }
  Object.assign(rec,{date:drDate,cipher,del:0,upd:ts});
 }else DR.push({id,date:drDate,cipher,del:0,upd:ts});
 DIARY_CACHE[drDate]=plain;
 delete DIARY_DRAFTS[drDate];
 delete DR_DRAFTS[drDate];
 saveDrDrafts();
 drEditMode=false;
 drsave();renderDiarySidebar();renderDiaryDate(false);
 toast(syncOn()?'✓ Encrypted & saved · syncing ciphertext…':'✓ Encrypted & saved on this device');
 requestAnimationFrame(()=>render());
};
const deleteCurrentDiaryNote=()=>{
 const rec=DR.find(x=>!x.del&&!isVaultRec(x)&&x.date===drDate);
 if(!rec)return;
 const backupCipher=rec.cipher,backupCache=DIARY_CACHE[drDate],dt=drDate;
 rec.del=1;rec.upd=now();delete DIARY_CACHE[dt];
 delete DIARY_DRAFTS[dt];delete DR_DRAFTS[dt];saveDrDrafts();
 drEditMode=false;
 drsave();renderDiarySidebar();renderDiaryDate(false);
 requestAnimationFrame(()=>render());
 toast('Diary note deleted. Tap to undo or restore in Settings → History.',()=>{
  rec.del=0;rec.cipher=backupCipher;rec.upd=now();
  if(backupCache&&DIARY_KEY)DIARY_CACHE[dt]=backupCache;
  drEditMode=false;
  drsave();if($('#drd').open){renderDiarySidebar();renderDiaryDate(false)}
  requestAnimationFrame(()=>render());
 });
};
if($('#dr-del'))$('#dr-del').onclick=deleteCurrentDiaryNote;
if($('#dr-vdel'))$('#dr-vdel').onclick=deleteCurrentDiaryNote;

// ---- Encrypted Info Vault (Folder Structure, Platform/IPs, User ID & PIN, Confidential Details) ----
const DEFAULT_TPL_TITLES=['Project Folder Structure','Platform & Web App IPs','User ID & PIN Credentials'];
function syncVaultCatUi(){
 document.querySelectorAll('#vl-cat-seg button').forEach(b=>b.classList.toggle('on',b.dataset.vlc===vlCat));
}
function renderVaultSidebar(){
 syncVaultBadge();
 const vList=vaultRecs();
 const cnts={all:vList.length,folder:0,ip:0,pin:0,other:0};
 vList.forEach(r=>{
  const n=VAULT_CACHE[r.id]||{cat:'other'};
  const c=normVaultCat(n.cat);
  cnts[c]=(cnts[c]||0)+1;
 });
 document.querySelectorAll('#vl-fcat button').forEach(b=>{
  const fc=b.dataset.vlf||b.dataset.vfc||'all';
  b.classList.toggle('on',fc===vlFCat);
  if(fc==='all')b.textContent=cnts.all?`All (${cnts.all})`:'All';
  else if(fc==='folder')b.textContent=cnts.folder?`📂 Folder (${cnts.folder})`:'📂 Folder';
  else if(fc==='ip')b.textContent=cnts.ip?`🌐 IP / Web (${cnts.ip})`:'🌐 IP / Web';
  else if(fc==='pin')b.textContent=cnts.pin?`🔑 ID & PIN (${cnts.pin})`:'🔑 ID & PIN';
  else if(fc==='other')b.textContent=cnts.other?`📌 Other (${cnts.other})`:'📌 Other';
 });
 const listEl=$('#vl-list');
 if(!listEl)return;
 const q=vlQ.trim().toLowerCase();
 const rows=vList.filter(r=>{
  const n=VAULT_CACHE[r.id]||{title:'',body:'',cat:'other',date:r.date};
  const cat=normVaultCat(n.cat);
  if(vlFCat!=='all'&&cat!==vlFCat)return false;
  if(q){
   const hay=((n.title||'')+' '+(n.body||'')+' '+r.date+' '+vaultCatLabel(cat)).toLowerCase();
   if(!hay.includes(q))return false;
  }
  return true;
 });
 let html='';
 if(VAULT_DRAFT&&VAULT_DRAFT.targetId==='__new__'){
  const dCat=normVaultCat(VAULT_DRAFT.cat);
  const dPreview=String(VAULT_DRAFT.body||'').replace(/\s+/g,' ').trim().slice(0,36);
  html+=`<button type="button" class="dr-item${vlId==='__new__'?' on':''}" data-vl-item="__new__"><div class="dr-item-top"><span>${esc(fmtTaskDate(VAULT_DRAFT.date||iso(0)))}</span><span>📝</span></div><b>${esc((VAULT_DRAFT.title||'').trim()||'Unsaved encrypted info')}</b><small>${esc(vaultCatShort(dCat))}${dPreview?' · '+esc(dPreview):''}</small></button>`;
 }
 html+=rows.map(r=>{
  const hasDraft=VAULT_DRAFT&&VAULT_DRAFT.targetId===r.id;
  const n=hasDraft?VAULT_DRAFT:(VAULT_CACHE[r.id]||{title:'Encrypted record',body:'',cat:'other',date:r.date});
  const cat=normVaultCat(n.cat),dtStr=fmtTaskDate(n.date||r.date);
  const preview=String(n.body||'').replace(/\s+/g,' ').trim().slice(0,42);
  return `<button type="button" class="dr-item${r.id===vlId?' on':''}" data-vl-item="${esc(r.id)}"><div class="dr-item-top"><span>${esc(dtStr)}</span><span>${hasDraft?'📝':'🔒 AES'}</span></div><b>${esc((n.title||'').trim()||vaultCatLabel(cat))}</b><small>${esc(vaultCatShort(cat))}${preview?' · '+esc(preview):''}</small></button>`;
 }).join('');
 listEl.innerHTML=html||`<div class="hint" style="padding:10px;text-align:center">${vList.length?'No vault items match this filter.':'No encrypted records yet. Tap "+ New Encrypted Info" above.'}</div>`;
}
async function renderVaultMain(keepInputs){
 const vList=vaultRecs();
 const rec=(vlId&&vlId!=='__new__')?vList.find(x=>x.id===vlId):null;
 if(rec&&DIARY_KEY&&!VAULT_CACHE[rec.id]){
  try{VAULT_CACHE[rec.id]=await decDiaryObj(DIARY_KEY,rec.cipher)}catch(e){}
 }
 const hasDraft=VAULT_DRAFT&&VAULT_DRAFT.targetId===(rec?rec.id:'__new__');
 const saved=rec?(VAULT_CACHE[rec.id]||{title:'',body:'',cat:'folder',date:rec.date}):{title:'',body:'',cat:vlFCat!=='all'?vlFCat:'folder',date:iso(0)};
 const cur=hasDraft?VAULT_DRAFT:saved;
 const showForm=!rec||vlEditMode||!!hasDraft;
 if($('#vl-view')){
  $('#vl-view').hidden=showForm;
  if(!keepInputs){$('#vl-view').classList.remove('ro');$('#vl-view').setAttribute('aria-expanded','false')}
 }
 if($('#vl-form'))$('#vl-form').hidden=!showForm;
 if(!showForm&&rec){
  const cat=normVaultCat(saved.cat),dtStr=fmtTaskDate(saved.date||rec.date);
  if($('#vl-vcat')){$('#vl-vcat').className='vl-cat-pill '+cat;$('#vl-vcat').textContent=vaultCatLabel(cat)}
  if($('#vl-vdt'))$('#vl-vdt').textContent=`${dtStr} · AES-256-GCM · Tap card for options`;
  if($('#vl-vttl'))$('#vl-vttl').textContent=saved.title||vaultCatLabel(cat);
  if($('#vl-vbdy')){
   $('#vl-vbdy').textContent=saved.body||'No details recorded.';
   $('#vl-vbdy').classList.toggle('masked',vlMasked);
  }
  if($('#vl-mask-btn'))$('#vl-mask-btn').textContent=vlMasked?'👁️ Reveal':'👁️ Mask';
 }else{
  if(!keepInputs){
   vlCat=normVaultCat(cur.cat);
   if($('#vl-dt'))$('#vl-dt').value=fixDate(cur.date||iso(0));
   if($('#vl-ttl'))$('#vl-ttl').value=cur.title||'';
   if($('#vl-bdy'))$('#vl-bdy').value=cur.body||'';
   syncVaultCatUi();
  }
  if($('#vl-del'))$('#vl-del').hidden=!rec;
  updateVaultDraftUiMeta();
 }
}
if($('#vl-view')){
 $('#vl-view').addEventListener('click',e=>{
  if(e.target.closest('#vl-mask-btn,#vl-copy-btn,#vl-edit,#vl-vdel'))return;
  const sel=window.getSelection&&window.getSelection();
  if(sel&&String(sel).trim().length>0)return;
  const o=$('#vl-view').classList.toggle('ro');
  $('#vl-view').setAttribute('aria-expanded',o);
 });
 $('#vl-view').addEventListener('keydown',e=>{
  if(e.target!==$('#vl-view'))return;
  if(e.key==='Enter'||e.key===' '){
   e.preventDefault();
   const o=$('#vl-view').classList.toggle('ro');
   $('#vl-view').setAttribute('aria-expanded',o);
  }
 });
}
if($('#vl-new'))$('#vl-new').onclick=()=>{
 captureVaultDraft();
 if(VAULT_DRAFT)persistVaultDraft();
 vlId='__new__';
 vlEditMode=true;
 vlCat=vlFCat!=='all'?vlFCat:'folder';
 if(VAULT_DRAFT&&VAULT_DRAFT.targetId!=='__new__')VAULT_DRAFT=null;
 renderVaultSidebar();
 renderVaultMain(false);
 if($('#vl-ttl'))$('#vl-ttl').focus();
};
if($('#vl-fcat'))$('#vl-fcat').onclick=e=>{
 const b=e.target.closest('[data-vlf],[data-vfc]');if(!b)return;
 vlFCat=b.dataset.vlf||b.dataset.vfc||'all';
 if(vlId==='__new__'&&!VAULT_DRAFT&&vlFCat!=='all'){
  vlCat=normVaultCat(vlFCat);
  syncVaultCatUi();
 }
 renderVaultSidebar();
};
if($('#vl-q'))$('#vl-q').oninput=e=>{
 vlQ=e.target.value||'';
 cancelAnimationFrame(vlqRaf);
 vlqRaf=requestAnimationFrame(renderVaultSidebar);
};
if($('#vl-list'))$('#vl-list').onclick=e=>{
 const b=e.target.closest('[data-vl-item]');if(!b)return;
 const nextId=b.dataset.vlItem;
 captureVaultDraft();
 if(VAULT_DRAFT)persistVaultDraft();
 vlId=nextId;
 vlEditMode=(vlId==='__new__');
 vlMasked=false;
 renderVaultSidebar();
 renderVaultMain(false);
};
if($('#vl-cat-seg'))$('#vl-cat-seg').onclick=e=>{
 const b=e.target.closest('[data-vlc]');if(!b)return;
 vlCat=normVaultCat(b.dataset.vlc);
 syncVaultCatUi();
 captureVaultDraft();
 renderVaultSidebar();
};
if($('#vl-dt'))$('#vl-dt').addEventListener('change',()=>{captureVaultDraft();renderVaultSidebar()});
if($('#vl-ttl'))$('#vl-ttl').addEventListener('input',()=>{captureVaultDraft();renderVaultSidebar()});
if($('#vl-bdy'))$('#vl-bdy').addEventListener('input',()=>captureVaultDraft());
if($('#vl-tpl-bar'))$('#vl-tpl-bar').onclick=e=>{
 const insBtn=e.target.closest('[data-vins]');
 const tplBtn=e.target.closest('[data-vtpl]');
 const ta=$('#vl-bdy'),ttl=$('#vl-ttl');
 if(!ta)return;
 const insAtCursor=txt=>{
  const s=ta.selectionStart||0,end=ta.selectionEnd||0,v=ta.value;
  ta.value=v.slice(0,s)+txt+v.slice(end);
  ta.selectionStart=ta.selectionEnd=s+txt.length;
  ta.focus();
  captureVaultDraft();
  renderVaultSidebar();
 };
 if(insBtn)return insAtCursor(insBtn.dataset.vins);
 if(!tplBtn)return;
 const tp=tplBtn.dataset.vtpl;
 if(tp==='branch')return insAtCursor('├── ');
 if(tp==='last')return insAtCursor('└── ');
 if(tp==='pipe')return insAtCursor('│   ');
 let snippet='',defTitle='';
 if(tp==='folder'){
  vlCat='folder';syncVaultCatUi();
  defTitle='Project Folder Structure';
  snippet=`project-root/\n├── src/\n│   ├── components/\n│   ├── services/\n│   └── app.js\n├── public/\n│   └── index.html\n├── .env\n└── README.md`;
 }else if(tp==='ip'){
  vlCat='ip';syncVaultCatUi();
  defTitle='Platform & Web App IPs';
  snippet=`Platform / Host : \nWeb App URL     : https://\nServer IP       : \nPort / SSH      : \nEnvironment     : Production\nNotes           : `;
 }else if(tp==='pin'){
  vlCat='pin';syncVaultCatUi();
  defTitle='User ID & PIN Credentials';
  snippet=`Platform / App  : \nUser ID / Login : \nPIN / Passcode  : \nAccount / Ref   : \nRecovery Notes  : `;
 }
 if(defTitle&&ttl&&(!ttl.value.trim()||DEFAULT_TPL_TITLES.includes(ttl.value.trim()))){
  ttl.value=defTitle;
 }
 if(snippet){
  ta.value=(ta.value.trim()?ta.value.replace(/\s+$/,'')+'\n\n':'')+snippet;
  ta.focus();
  captureVaultDraft();
  renderVaultSidebar();
 }
};
if($('#vl-mask-btn'))$('#vl-mask-btn').onclick=e=>{
 e.stopPropagation();
 vlMasked=!vlMasked;
 if($('#vl-vbdy'))$('#vl-vbdy').classList.toggle('masked',vlMasked);
 $('#vl-mask-btn').textContent=vlMasked?'👁️ Reveal':'👁️ Mask';
};
if($('#vl-copy-btn'))$('#vl-copy-btn').onclick=async e=>{
 e.stopPropagation();
 const rec=vaultRecs().find(x=>x.id===vlId);
 const saved=rec&&VAULT_CACHE[rec.id];
 const txt=saved?(saved.body||saved.title||''):($('#vl-vbdy')&&$('#vl-vbdy').textContent||'');
 if(!txt)return;
 try{
  await navigator.clipboard.writeText(txt);
  toast('✓ Copied details to clipboard');
 }catch(e){
  const ta=document.createElement('textarea');
  ta.value=txt;document.body.appendChild(ta);ta.select();
  try{document.execCommand('copy');toast('✓ Copied details to clipboard')}catch(err){}
  ta.remove();
 }
};
if($('#vl-edit'))$('#vl-edit').onclick=e=>{
 e.stopPropagation();
 vlEditMode=true;
 renderVaultMain(false);
 if($('#vl-bdy'))$('#vl-bdy').focus();
};
if($('#vl-cancel'))$('#vl-cancel').onclick=()=>{
 const hadDraft=!!(VAULT_DRAFT&&VAULT_DRAFT.targetId===(vlId||'__new__'));
 if(hadDraft){
  VAULT_DRAFT=null;
  delete DR_DRAFTS.__vault__;
  saveDrDrafts();
 }
 const vList=vaultRecs();
 if(vlId==='__new__'&&vList.length)vlId=vList[0].id;
 vlEditMode=false;
 renderVaultSidebar();
 renderVaultMain(false);
 if(hadDraft)toast('Vault draft discarded');
};
if($('#vl-sv'))$('#vl-sv').onclick=async()=>{
 if(!DIARY_KEY)return;
 const date=fixDate(($('#vl-dt')&&$('#vl-dt').value)||iso(0));
 const cat=normVaultCat(vlCat);
 const title=($('#vl-ttl')&&$('#vl-ttl').value||'').trim();
 const body=($('#vl-bdy')&&$('#vl-bdy').value||'').replace(/\s+$/,'');
 if(!title&&!body){toast('Enter a title or details to encrypt');if($('#vl-ttl'))$('#vl-ttl').focus();return}
 const plain={kind:'vault',cat,title:title||vaultCatLabel(cat),body,date};
 const cipher=await encDiaryObj(DIARY_KEY,plain);
 const ts=now();
 let rec=(vlId&&vlId!=='__new__')?DR.find(x=>x.id===vlId):null;
 if(rec){
  const prevC=VAULT_CACHE[rec.id]||{};
  if(!rec.del&&rec.cipher&&(plain.title!==prevC.title||plain.body!==prevC.body||plain.cat!==prevC.cat||plain.date!==prevC.date)){
   logHist({kind:'diary',targetId:rec.id,date,label:`Vault · ${plain.title}`,sub:`${vaultCatShort(cat)} · ${date}`,prevCipher:rec.cipher});
  }
  Object.assign(rec,{date,cipher,del:0,upd:ts});
 }else{
  const newId='vlt_'+uid();
  rec={id:newId,date,cipher,del:0,upd:ts};
  DR.push(rec);
  vlId=newId;
 }
 VAULT_CACHE[rec.id]=plain;
 if(VAULT_DRAFT){VAULT_DRAFT=null;delete DR_DRAFTS.__vault__;saveDrDrafts()}
 vlEditMode=false;
 vlMasked=false;
 drsave();
 renderVaultSidebar();
 await renderVaultMain(false);
 toast(syncOn()?'✓ Encrypted & saved to Vault · syncing…':'✓ Encrypted & saved to Info Vault');
};
const deleteCurrentVaultItem=()=>{
 const rec=(vlId&&vlId!=='__new__')?DR.find(x=>!x.del&&x.id===vlId):null;
 if(!rec)return;
 const backupCipher=rec.cipher,backupCache=VAULT_CACHE[rec.id],delId=rec.id;
 rec.del=1;rec.upd=now();
 delete VAULT_CACHE[delId];
 if(VAULT_DRAFT&&VAULT_DRAFT.targetId===delId){VAULT_DRAFT=null;delete DR_DRAFTS.__vault__;saveDrDrafts()}
 const remList=vaultRecs();
 vlId=remList.length?remList[0].id:'__new__';
 vlEditMode=!remList.length;
 drsave();
 renderVaultSidebar();
 renderVaultMain(false);
 toast('Vault record deleted. Tap to undo or restore in History.',()=>{
  rec.del=0;rec.cipher=backupCipher;rec.upd=now();
  if(backupCache&&DIARY_KEY)VAULT_CACHE[delId]=backupCache;
  vlId=delId;vlEditMode=false;
  drsave();
  if($('#drd')&&$('#drd').open){renderVaultSidebar();renderVaultMain(false)}
 });
};
if($('#vl-del'))$('#vl-del').onclick=deleteCurrentVaultItem;
if($('#vl-vdel'))$('#vl-vdel').onclick=deleteCurrentVaultItem;

// ---- Home Screen Tasks Manager (1. Personal & 2. Work · Initiated & Completed Dates) ----
let tkCat='personal',tkSt='open',tkEditId=null,tkFCat='all',tkFSt='all',tkQ='',tkqRaf=0;
function syncTaskFormUi(){
 document.querySelectorAll('#tk-cat-seg button').forEach(b=>b.classList.toggle('on',b.dataset.tkc===tkCat));
 document.querySelectorAll('#tk-st-seg button').forEach(b=>b.classList.toggle('on',b.dataset.tks===tkSt));
 if($('#tk-form'))$('#tk-form').classList.toggle('editing',!!tkEditId);
 if($('#tk-cdt-wrap'))$('#tk-cdt-wrap').classList.toggle('done-active',tkSt==='done');
 if($('#tk-cdt')){
  $('#tk-cdt').placeholder=tkSt==='done'?'Pick date':'Auto on ✓';
 }
 if($('#tk-sv'))$('#tk-sv').textContent=tkEditId?'Save':'+ Add';
 if($('#tk-cancel'))$('#tk-cancel').hidden=!tkEditId;
}
function resetTaskForm(){
 tkEditId=null;
 tkCat=tkFCat==='work'?'work':'personal';
 tkSt='open';
 if($('#tk-txt'))$('#tk-txt').value='';
 if($('#tk-idt'))$('#tk-idt').value=iso(0);
 if($('#tk-cdt'))$('#tk-cdt').value='';
 if($('#tk-er'))$('#tk-er').textContent='';
 syncTaskFormUi();
}
function renderTasksList(){
 syncTaskBadge();
 const active=TK.filter(t=>!t.del);
 const pCnt=active.filter(t=>normTaskCat(t.cat)==='personal').length;
 const wCnt=active.filter(t=>normTaskCat(t.cat)==='work').length;
 document.querySelectorAll('#tk-fcat button').forEach(b=>{
  const c=b.dataset.tfc;
  b.classList.toggle('on',c===tkFCat);
  if(c==='all')b.textContent=`All (${active.length})`;
  else if(c==='personal')b.textContent=`1. Personal (${pCnt})`;
  else if(c==='work')b.textContent=`2. Work (${wCnt})`;
 });
 document.querySelectorAll('#tk-fst button').forEach(b=>{
  b.classList.toggle('on',b.dataset.tfs===tkFSt);
 });
 const listEl=$('#tk-list');
 if(!listEl)return;
 const openCard=listEl.querySelector('.tk-card.ro');
 const openId=openCard?openCard.dataset.tkCard:'';
 const q=tkQ.trim().toLowerCase();
 const rows=active.filter(t=>{
  if(tkFCat!=='all'&&normTaskCat(t.cat)!==tkFCat)return false;
  if(tkFSt==='open'&&t.done)return false;
  if(tkFSt==='done'&&!t.done)return false;
  if(q){
   const hay=(t.text+' '+taskCatLabel(t.cat)+' '+(t.initDate||'')+' '+(t.doneDate||'')).toLowerCase();
   if(!hay.includes(q))return false;
  }
  return true;
 }).sort((a,b)=>{
  if(a.done!==b.done)return a.done?1:-1;
  const da=a.done?(a.doneDate||a.initDate||''):(a.initDate||'');
  const db=b.done?(b.doneDate||b.initDate||''):(b.initDate||'');
  return db.localeCompare(da)||(b.ts||0)-(a.ts||0);
 });
 if(!rows.length){
  listEl.innerHTML=`<div class="empty" style="padding:20px;border:1px dashed var(--line);border-radius:14px">${active.length?'No tasks match this filter.':'No tasks yet. Add a 1. Personal or 2. Work task above.'}</div>`;
  return;
 }
 listEl.innerHTML=rows.map(t=>{
  const cat=normTaskCat(t.cat),iDt=t.initDate||iso(0),cDt=t.done?(t.doneDate||iDt):'';
  const isRo=openId===t.id;
  return `<div class="tk-card${t.done?' done':''}${isRo?' ro':''}" data-tk-card="${esc(t.id)}" tabindex="0" role="button" aria-expanded="${isRo?'true':'false'}" aria-label="Tap to show edit and delete options"><div class="tk-card-l"><button type="button" class="tk-chk${t.done?' on':''}" data-tk-tog="${esc(t.id)}" aria-label="${t.done?'Mark task pending':'Mark task completed'}" title="${t.done?'Completed · tap to mark pending':'Pending · tap to complete'}">✓</button><div class="tk-info"><div class="tk-ttl">${esc(t.text)}</div><div class="tk-meta"><span class="tk-cat-txt ${cat}">${taskCatLabel(cat)}</span><span class="tk-sep">·</span><span>Initiated <b>${esc(fmtTaskDate(iDt))}</b></span><span class="tk-sep">·</span>${t.done?`<span class="tk-dt-done">✓ Completed <b>${esc(fmtTaskDate(cDt))}</b></span>`:`<span class="tk-dt-open">Pending</span>`}</div></div></div><div class="tk-ac"><button type="button" class="ib" data-tk-ed="${esc(t.id)}" aria-label="Edit task" title="Edit">${IC.e}</button><button type="button" class="ib d" data-tk-del="${esc(t.id)}" aria-label="Delete task" title="Delete">${IC.d}</button></div></div>`;
 }).join('');
}
function openTasks(){
 resetTaskForm();
 renderTasksList();
 if($('#tkd')&&!$('#tkd').open)$('#tkd').showModal();
 if($('#tk-txt'))$('#tk-txt').focus();
}
if($('#tkb'))$('#tkb').onclick=()=>openTasks();
if($('#tk-cx'))$('#tk-cx').onclick=()=>$('#tkd').close();
if($('#tk-cat-seg'))$('#tk-cat-seg').onclick=e=>{
 const b=e.target.closest('[data-tkc]');if(!b)return;
 tkCat=normTaskCat(b.dataset.tkc);
 syncTaskFormUi();
};
if($('#tk-st-seg'))$('#tk-st-seg').onclick=e=>{
 const b=e.target.closest('[data-tks]');if(!b)return;
 tkSt=b.dataset.tks==='done'?'done':'open';
 if(tkSt==='done'&&$('#tk-cdt')&&!$('#tk-cdt').value){
  const iVal=($('#tk-idt')&&$('#tk-idt').value)||iso(0);
  $('#tk-cdt').value=iso(0)>=iVal?iso(0):iVal;
 }else if(tkSt==='open'&&$('#tk-cdt')){
  $('#tk-cdt').value='';
 }
 if($('#tk-er'))$('#tk-er').textContent='';
 syncTaskFormUi();
};
if($('#tk-idt'))$('#tk-idt').addEventListener('change',e=>{
 const iVal=fixDate(e.target.value||iso(0));
 if($('#tk-cdt')&&$('#tk-cdt').value&&$('#tk-cdt').value<iVal){
  $('#tk-cdt').value=iVal;
 }
 if($('#tk-er'))$('#tk-er').textContent='';
});
if($('#tk-cdt'))$('#tk-cdt').addEventListener('change',e=>{
 if(e.target.value){
  tkSt='done';
  const iVal=($('#tk-idt')&&$('#tk-idt').value)||iso(0);
  if(e.target.value<iVal&&$('#tk-idt'))$('#tk-idt').value=e.target.value;
  if($('#tk-er'))$('#tk-er').textContent='';
  syncTaskFormUi();
 }
});
if($('#tk-cancel'))$('#tk-cancel').onclick=()=>resetTaskForm();
const saveTaskFromForm=()=>{
 const txt=($('#tk-txt')&&$('#tk-txt').value||'').trim();
 if(!txt){if($('#tk-er'))$('#tk-er').textContent='Enter a task description.';if($('#tk-txt'))$('#tk-txt').focus();return}
 const initDate=fixDate(($('#tk-idt')&&$('#tk-idt').value)||iso(0));
 const rawDoneDate=($('#tk-cdt')&&$('#tk-cdt').value||'').trim();
 const isDone=tkSt==='done'||!!rawDoneDate;
 const doneDate=isDone?fixDate(rawDoneDate||(iso(0)>=initDate?iso(0):initDate)):'';
 if(isDone&&doneDate<initDate){
  if($('#tk-er'))$('#tk-er').textContent='Completed date cannot be earlier than initiated date.';
  return;
 }
 const ts=now();
 const ex=tkEditId&&TK.find(x=>x.id===tkEditId);
 if(ex){
  if(ex.text!==txt||ex.cat!==tkCat||ex.done!==isDone||ex.initDate!==initDate||(ex.doneDate||'')!==doneDate){
   logHist({kind:'task',targetId:ex.id,label:`Task · ${txt}`,sub:`${taskCatLabel(ex.cat)} · Init ${ex.initDate}${ex.done&&ex.doneDate?' · Done '+ex.doneDate:''}`,prev:{text:ex.text,cat:ex.cat,done:ex.done,initDate:ex.initDate,doneDate:ex.doneDate||''}});
  }
  Object.assign(ex,{text:txt,cat:tkCat,done:isDone,initDate,doneDate,upd:ts});
  tksave();resetTaskForm();renderTasksList();
  toast('Task updated');
 }else{
  TK.push({id:uid(),text:txt,cat:tkCat,done:isDone,initDate,doneDate,ts:Date.now(),upd:ts,del:0});
  tksave();resetTaskForm();renderTasksList();
  toast(isDone?`✓ Task added & completed (${fmtTaskDate(doneDate)})`:`Task added to ${taskCatLabel(tkCat)}`);
 }
};
if($('#tk-sv'))$('#tk-sv').onclick=saveTaskFromForm;
if($('#tk-txt'))$('#tk-txt').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();saveTaskFromForm()}});
if($('#tk-fcat'))$('#tk-fcat').onclick=e=>{const b=e.target.closest('[data-tfc]');if(!b)return;tkFCat=b.dataset.tfc;if(!tkEditId&&tkFCat!=='all'){tkCat=tkFCat;syncTaskFormUi()}renderTasksList()};
if($('#tk-fst'))$('#tk-fst').onclick=e=>{const b=e.target.closest('[data-tfs]');if(!b)return;tkFSt=b.dataset.tfs;renderTasksList()};
if($('#tk-q'))$('#tk-q').oninput=e=>{tkQ=e.target.value||'';cancelAnimationFrame(tkqRaf);tkqRaf=requestAnimationFrame(renderTasksList)};
if($('#tk-list'))$('#tk-list').addEventListener('click',e=>{
 const tog=e.target.closest('[data-tk-tog]'),ed=e.target.closest('[data-tk-ed]'),delBtn=e.target.closest('[data-tk-del]'),card=e.target.closest('[data-tk-card]');
 if(tog){
  const t=TK.find(x=>x.id===tog.dataset.tkTog);if(!t)return;
  const prev={text:t.text,cat:t.cat,done:t.done,initDate:t.initDate,doneDate:t.doneDate||''};
  t.done=!t.done;
  const today=iso(0);
  t.doneDate=t.done?(today>=t.initDate?today:t.initDate):'';
  t.upd=now();
  logHist({kind:'task',targetId:t.id,label:`Task · ${t.text}`,sub:t.done?`Marked completed (${t.doneDate})`:`Marked pending`,prev});
  tksave();renderTasksList();
  toast(t.done?`✓ Completed on ${fmtTaskDate(t.doneDate)}`:'Task marked pending');
  return;
 }
 if(ed){
  const t=TK.find(x=>x.id===ed.dataset.tkEd);if(!t)return;
  tkEditId=t.id;
  tkCat=normTaskCat(t.cat);
  tkSt=t.done?'done':'open';
  if($('#tk-txt'))$('#tk-txt').value=t.text;
  if($('#tk-idt'))$('#tk-idt').value=t.initDate||iso(0);
  if($('#tk-cdt'))$('#tk-cdt').value=t.done?(t.doneDate||iso(0)):'';
  if($('#tk-er'))$('#tk-er').textContent='';
  syncTaskFormUi();
  if($('#tk-form'))$('#tk-form').scrollIntoView({behavior:'smooth',block:'nearest'});
  if($('#tk-txt'))$('#tk-txt').focus();
  return;
 }
 if(delBtn){
  const t=TK.find(x=>x.id===delBtn.dataset.tkDel);if(!t)return;
  t.del=1;t.upd=now();
  if(tkEditId===t.id)resetTaskForm();
  tksave();renderTasksList();
  toast('Task deleted. Tap to undo.',()=>{
   t.del=0;t.upd=now();tksave();renderTasksList();
  });
  return;
 }
 if(card){
  document.querySelectorAll('#tk-list .tk-card.ro').forEach(r=>{if(r!==card){r.classList.remove('ro');r.setAttribute('aria-expanded','false')}});
  const o=card.classList.toggle('ro');
  card.setAttribute('aria-expanded',o);
 }
});

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
 TK.forEach(t=>{if(!t.id)t.id=uid();t.cat=normTaskCat(t.cat);t.initDate=fixDate(t.initDate||iso(0));t.done=!!t.done;t.doneDate=t.done?fixDate(t.doneDate||t.initDate):'';if(!t.upd)t.upd=t.ts?new Date(t.ts).toISOString():now()});
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
 Object.keys(TB).forEach(t=>TB[t].all().forEach(r=>{const k=t+r.id,h=LAST[k]!==undefined?LAST[k]:cf(t,r);if((SNAP[t]||{})[r.id]!==h)o.push({t,r,h})}));
 const obH=LAST.OB!==undefined?LAST.OB:obHash();
 if((SNAP.Settings||{}).opening_INR!==obH&&OB.upd>EPOCH)o.push({t:'Settings',id:'opening_INR',h:obH});
 const drH=LAST.DRV!==undefined?LAST.DRV:drvHash();
 if(DRV.v&&(SNAP.Settings||{}).diary_verifier!==drH&&DRV.upd>EPOCH)o.push({t:'Settings',id:'diary_verifier',h:drH});
 return o;
}
const pendingCount=()=>dirty().length;
const opOf=d=>({table:d.t,rec:d.t==='Settings'?(d.id==='diary_verifier'?{id:'diary_verifier',value:drvVal(),updated_at:DRV.upd}:{id:'opening_INR',value:String(Math.round((OB.INR||0)*100)),updated_at:OB.upd}):TB[d.t].out(d.r)});
const saveSnap=()=>STORE.setItem('ledger.snap',JSON.stringify(SNAP));
const persist=()=>{STORE.setItem(LS,JSON.stringify(S.tx));STORE.setItem(LC,JSON.stringify(CT));STORE.setItem(LD,JSON.stringify(DB));STORE.setItem(LTK,JSON.stringify(TK));STORE.setItem(LDR,JSON.stringify(DR));STORE.setItem(LDRV,JSON.stringify(DRV));STORE.setItem(LO,JSON.stringify(OB));saveSnap()};
let ORPHAN_PAYS=[];
function applyRemote(data){
 let changed=false,diaryChanged=false;
 ['Categories','Transactions','Debts','DebtPayments','Diary'].forEach(t=>{
  const K=TB[t];
  (data[t]||[]).forEach(r=>{
   const inc=K.inn(r);Object.keys(inc).forEach(k=>{if(inc[k]===undefined)delete inc[k]});const loc=K.all().find(x=>x.id===inc.id);
   if(loc){
    const prevH=LAST[t+loc.id]||cf(t,loc);
    const localEdited=(SNAP[t]||{})[loc.id]!==prevH;
    if(localEdited&&String(loc.upd)>inc.upd)return;
    if(t==='Categories'&&loc.n&&inc.n&&loc.n!==inc.n){
     const oldName=loc.n;
     S.tx.forEach(x=>{if(x.cat===oldName)x.cat=inc.n});
     changed=true;
    }
    const prevCipher=t==='Diary'?loc.cipher:'';
    Object.assign(loc,inc);
    const h=cf(t,loc);
    if(prevH!==h){
     changed=true;
     if(t==='Diary'&&prevCipher!==loc.cipher){
      if(isVaultRec(loc))delete VAULT_CACHE[loc.id];
      else delete DIARY_CACHE[loc.date];
      diaryChanged=true;
     }
    }
    snapSet(t,inc.id,h);LAST[t+inc.id]=h;
   }else{
    if(K.add(inc)===false){
     if(t==='DebtPayments'&&!ORPHAN_PAYS.some(p=>p.id===r.id))ORPHAN_PAYS.push(r);
     return;
    }
    changed=true;
    if(t==='Diary')diaryChanged=true;
    const cur=K.all().find(x=>x.id===inc.id),h=cf(t,cur);
    snapSet(t,inc.id,h);LAST[t+inc.id]=h;
   }
  });
  if(t==='Debts'&&ORPHAN_PAYS.length){
   const PK=TB.DebtPayments;
   ORPHAN_PAYS=ORPHAN_PAYS.filter(r=>{
    const inc=PK.inn(r);Object.keys(inc).forEach(k=>{if(inc[k]===undefined)delete inc[k]});
    const loc=PK.all().find(x=>x.id===inc.id);
    if(loc){
     const prevH=LAST['DebtPayments'+loc.id]||cf('DebtPayments',loc);
     Object.assign(loc,inc);
     const h=cf('DebtPayments',loc);
     if(prevH!==h)changed=true;
     snapSet('DebtPayments',inc.id,h);LAST['DebtPayments'+inc.id]=h;
    }else if(PK.add(inc)===false){
     return true;
    }else{
     changed=true;
     const cur=PK.all().find(x=>x.id===inc.id),h=cf('DebtPayments',cur);
     snapSet('DebtPayments',inc.id,h);LAST['DebtPayments'+inc.id]=h;
    }
    return false;
   });
  }
 });
 (data.Settings||[]).forEach(r=>{
  if(r.id==='opening_INR'){
   const prevOb=obHash();
   const edited=(SNAP.Settings||{}).opening_INR!==prevOb&&OB.upd>EPOCH;
   if(edited&&OB.upd>String(r.updated_at))return;
   const nextInr=Number(r.value)/100;
   if(r2(OB.INR||0)!==r2(nextInr))changed=true;
   OB.INR=nextInr;OB.upd=String(r.updated_at);snapSet('Settings','opening_INR',obHash());LAST.OB=obHash();
  }else if(r.id==='diary_verifier'){
   const prevDrv=drvHash();
   const edited=DRV.v&&(SNAP.Settings||{}).diary_verifier!==prevDrv&&DRV.upd>EPOCH;
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
 if(changed){
  rebuildDrDates();
  bumpCalc();
 }
 if(DIARY_KEY&&diaryChanged)decryptDiaryFast().then(()=>{
  if($('#drd')&&$('#drd').open){
   if(drMode==='vault'){renderVaultSidebar();renderVaultMain(true)}
   else{renderDiarySidebar();renderDiaryDate(true)}
  }
 });
 return changed;
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
 clearTimeout(st);
 if(!syncOn()||!online())return;
 if(S.busy){again=true;return}
 S.busy=true;S.err='';renderStatus();
 let remoteChanged=false;
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
   if(applyRemote(j.data||{}))remoteChanged=true;
   since=Number(j.next_since||j.rev)||since;
   STORE.setItem('ledger.rev',String(since));
   if(!j.has_more)break;
  }
  STORE.setItem('ledger.last',now());
  persist();
 }catch(e){S.err=friendly(e);try{saveSnap()}catch(x){}}
 S.busy=false;
 if(remoteChanged)render();
 else renderStatus();
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
  if(DIARY_KEY)flushDiaryDraft();
  clearTimeout(drLockTm);
  drLockTm=setTimeout(async()=>{if(document.hidden&&DIARY_KEY){await flushDiaryDraft();lockDiary();if($('#drd')&&$('#drd').open)renderDiaryModal()}},60000);
 }else{
  clearTimeout(drLockTm);
  sync();
 }
});
setInterval(()=>{if(!document.hidden)sync()},60000);
// ---- Universal 120Hz WhatsApp-Style Continuous Touch & Pointer Gesture Engine (v45) ----
function bindSwipeSurface(el,onGesture){
 if(!el)return;
 let sx=0,sy=0,st=0,t0=null,pDown=false,tActive=false;
 el.addEventListener('touchstart',e=>{
  if(e.touches.length!==1)return;
  tActive=true;
  sx=e.touches[0].clientX;sy=e.touches[0].clientY;st=performance.now();t0=e.target;
 },{passive:true});
 el.addEventListener('touchend',e=>{
  if(!st||!e.changedTouches.length)return;
  const dx=e.changedTouches[0].clientX-sx,dy=e.changedTouches[0].clientY-sy,dt=performance.now()-st;
  st=0;
  onGesture(dx,dy,dt,t0);
  setTimeout(()=>{tActive=false},80);
 },{passive:true});
 el.addEventListener('pointerdown',e=>{
  if(tActive||e.pointerType==='touch'||e.button!==0)return;
  pDown=true;sx=e.clientX;sy=e.clientY;st=performance.now();t0=e.target;
 });
 el.addEventListener('pointerup',e=>{
  if(!pDown||tActive||e.pointerType==='touch')return;
  pDown=false;
  const dx=e.clientX-sx,dy=e.clientY-sy,dt=performance.now()-st;
  st=0;
  onGesture(dx,dy,dt,t0);
 });
}
const isHorizSwipe=(dx,dy,dt,minX=44)=>dt<700&&Math.abs(dx)>=minX&&Math.abs(dx)>Math.abs(dy)*1.4;
const isVertPullDown=(dx,dy,dt,minY=60)=>dt<700&&dy>=minY&&Math.abs(dy)>Math.abs(dx)*1.35;

// 1. Date Picker Popup Calendar (.cal) horizontal swipe -> previous/next month
bindSwipeSurface(cal,(dx,dy,dt)=>{
 if(cal.hidden||!isHorizSwipe(dx,dy,dt,32))return;
 calStepMonth(dx<0?1:-1);
});

// 2. Date Picker Inputs ([data-dp]) horizontal swipe -> +/- 1 day
document.addEventListener('touchstart',e=>{
 const dp=e.target&&e.target.closest&&e.target.closest('[data-dp]');
 if(!dp||e.touches.length!==1)return;
 dp._swipedAt=0;
 dp._sx=e.touches[0].clientX;dp._sy=e.touches[0].clientY;dp._st=performance.now();
},{passive:true});
document.addEventListener('touchend',e=>{
 const dp=e.target&&e.target.closest&&e.target.closest('[data-dp]');
 if(!dp||!dp._st||!e.changedTouches.length)return;
 const dx=e.changedTouches[0].clientX-dp._sx,dy=e.changedTouches[0].clientY-dp._sy,dt=performance.now()-dp._st;
 dp._st=0;
 if(isHorizSwipe(dx,dy,dt,26)){
  dp._swipedAt=performance.now();
  shiftDateInput(dp,dx<0?1:-1);
 }else dp._swipedAt=0;
},{passive:true});
document.addEventListener('pointerdown',e=>{
 if(e.pointerType==='touch'||e.button!==0)return;
 const dp=e.target&&e.target.closest&&e.target.closest('[data-dp]');
 if(!dp)return;
 dp._swipedAt=0;
 dp._sx=e.clientX;dp._sy=e.clientY;dp._st=performance.now();
});
document.addEventListener('pointerup',e=>{
 if(e.pointerType==='touch')return;
 const dp=e.target&&e.target.closest&&e.target.closest('[data-dp]');
 if(!dp||!dp._st)return;
 const dx=e.clientX-dp._sx,dy=e.clientY-dp._sy,dt=performance.now()-dp._st;
 dp._st=0;
 if(isHorizSwipe(dx,dy,dt,26)){
  dp._swipedAt=performance.now();
  shiftDateInput(dp,dx<0?1:-1);
 }else dp._swipedAt=0;
});

// 3. Main Ledger Windows (#app: AED <-> INR <-> Debts) WhatsApp-Style Continuous Interactive Pager
(()=>{
 const appEl=$('#app');
 if(!appEl)return;
 let sx=0,sy=0,st=0,axis=null,active=false,tTouch=false,adjCard=null,adjTab='',adjDir=0;
 const canStartMainSwipe=t0=>{
  if(!t0||!t0.closest)return true;
  if(t0.closest('input,textarea,select,[data-dp],.cal'))return false;
  const tw=t0.closest('.tw');
  if(tw&&tw.scrollWidth>tw.clientWidth+6)return false;
  return true;
 };
 const ensureAdjCard=dir=>{
  const idx=MAIN_TABS.indexOf(S.tab);
  const nextIdx=idx+dir;
  const nextTab=(nextIdx>=0&&nextIdx<MAIN_TABS.length)?MAIN_TABS[nextIdx]:'';
  if(nextTab===adjTab&&adjDir===dir)return;
  if(adjCard){adjCard.remove();adjCard=null}
  adjTab=nextTab;adjDir=dir;
  if(!nextTab)return;
  const tmp=document.createElement('div');
  tmp.innerHTML=nextTab==='D'?debtsTab():widget(nextTab);
  adjCard=tmp.firstElementChild;
  if(adjCard){
   adjCard.querySelectorAll('[id]').forEach(n=>n.removeAttribute('id'));
   adjCard.classList.add('swipe-adj-card');
   adjCard.style.left=(dir>0?'100%':'-100%');
   appEl.appendChild(adjCard);
  }
 };
 const onStart=(x,y,t0)=>{
  if(!canStartMainSwipe(t0))return;
  appEl.querySelectorAll('.swipe-adj-card').forEach(n=>n.remove());
  sx=x;sy=y;st=performance.now();axis=null;active=true;adjCard=null;adjTab='';adjDir=0;
 };
 const onMove=(x,y)=>{
  if(!active)return;
  const dx=x-sx,dy=y-sy;
  if(!axis){
   if(Math.abs(dy)>10&&Math.abs(dy)>=Math.abs(dx)*0.8){axis='v';active=false;return}
   if(Math.abs(dx)>12&&Math.abs(dx)>Math.abs(dy)*1.45){axis='h'}
   else return;
  }
  if(axis!=='h')return;
  const curCard=appEl.querySelector(':scope > .card:not(.swipe-adj-card)');
  if(!curCard)return;
  const dir=dx<0?1:-1;
  ensureAdjCard(dir);
  const effDx=adjTab?dx:dx*0.22;
  curCard.style.transition='none';
  curCard.style.transform=`translate3d(${effDx}px,0,0)`;
  if(adjCard){
   adjCard.style.transition='none';
   adjCard.style.transform=`translate3d(${effDx}px,0,0)`;
  }
 };
 const onEnd=(x,y)=>{
  if(!active)return;
  active=false;
  const dx=x-sx,dy=y-sy,dt=Math.max(1,performance.now()-st);
  const curCard=appEl.querySelector(':scope > .card:not(.swipe-adj-card)');
  if(axis!=='h'){
   if(isHorizSwipe(dx,dy,dt,48)){
    const idx=MAIN_TABS.indexOf(S.tab),nextIdx=dx<0?idx+1:idx-1;
    if(nextIdx>=0&&nextIdx<MAIN_TABS.length)switchMainTab(MAIN_TABS[nextIdx],dx<0?1:-1,false);
   }
   return;
  }
  const w=appEl.clientWidth||window.innerWidth||360;
  const vel=Math.abs(dx)/dt;
  const commit=!!adjTab&&(Math.abs(dx)>=Math.min(76,w*0.22)||(Math.abs(dx)>=42&&vel>=0.35));
  if(commit&&curCard){
   const targetX=adjDir>0?-w:w;
   const targetTab=adjTab,targetDir=adjDir;
   const movAdj=adjCard;adjCard=null;
   document.querySelectorAll('.tabs button').forEach(b=>b.classList.toggle('on',b.dataset.t===targetTab));
   curCard.style.transition='transform .22s cubic-bezier(.22,1,.36,1)';
   curCard.style.transform=`translate3d(${targetX}px,0,0)`;
   if(movAdj){
    movAdj.style.transition='transform .22s cubic-bezier(.22,1,.36,1)';
    movAdj.style.transform=`translate3d(${targetX}px,0,0)`;
   }
   setTimeout(()=>{
    if(curCard){curCard.style.transition='';curCard.style.transform=''}
    if(movAdj&&movAdj.parentNode)movAdj.remove();
    switchMainTab(targetTab,targetDir,true);
   },220);
  }else{
   if(curCard){
    curCard.style.transition='transform .18s cubic-bezier(.22,1,.36,1)';
    curCard.style.transform='translate3d(0,0,0)';
    setTimeout(()=>{if(curCard){curCard.style.transition='';curCard.style.transform=''}},185);
   }
   if(adjCard){
    const oldAdj=adjCard;adjCard=null;
    oldAdj.style.transition='transform .18s cubic-bezier(.22,1,.36,1)';
    oldAdj.style.transform='translate3d(0,0,0)';
    setTimeout(()=>{if(oldAdj.parentNode)oldAdj.remove()},185);
   }
  }
 };
 appEl.addEventListener('touchstart',e=>{if(e.touches.length===1){tTouch=true;onStart(e.touches[0].clientX,e.touches[0].clientY,e.target)}},{passive:true});
 appEl.addEventListener('touchmove',e=>{if(e.touches.length===1)onMove(e.touches[0].clientX,e.touches[0].clientY)},{passive:true});
 appEl.addEventListener('touchend',e=>{if(e.changedTouches.length)onEnd(e.changedTouches[0].clientX,e.changedTouches[0].clientY);setTimeout(()=>{tTouch=false},80)},{passive:true});
 appEl.addEventListener('pointerdown',e=>{if(!tTouch&&e.pointerType!=='touch'&&e.button===0)onStart(e.clientX,e.clientY,e.target)});
 appEl.addEventListener('pointermove',e=>{if(!tTouch&&e.pointerType!=='touch')onMove(e.clientX,e.clientY)});
 appEl.addEventListener('pointerup',e=>{if(!tTouch&&e.pointerType!=='touch')onEnd(e.clientX,e.clientY)});
})();

// 4. Full-Screen Diary & Vault (#drd):
// - Swipe .dr-hd down to close
// - Swipe .dr-dbar left/right for +/- 1 day (isolated so checking previous days NEVER switches to Info Vault)
// - WhatsApp-style continuous 120Hz pager between Daily Diary <-> Info Vault (ignoring .dr-side, #dr-list, .dr-dbar, .dr-sum, and form controls)
(()=>{
 const dlg=$('#drd');
 if(!dlg)return;
 let sx=0,sy=0,st=0,t0=null,axis=null,modeDrag=false,tTouch=false;
 const isBlockedForModeSwipe=el=>{
  if(!el||!el.closest)return true;
  // Never swipe between Diary and Vault when interacting with previous days list (.dr-side / #dr-list), date picker bar (.dr-dbar), spending summary (.dr-sum), or form controls
  if(el.closest('.dr-side,#dr-list,#vl-list,.vl-fcat,.dr-dbar,.dr-dnav,.dr-sum,input,textarea,select,button,label,summary,[data-dp],.cal,.vl-cat-seg,.vl-tpl-bar,pre.vl-pre,details.dr-tbox,details.dr-vtasks'))return true;
  return false;
 };
 const onStart=(x,y,target)=>{
  if(!dlg.open)return;
  sx=x;sy=y;st=performance.now();t0=target;axis=null;
  modeDrag=!!DIARY_KEY&&!isBlockedForModeSwipe(target);
 };
 const onMove=(x,y)=>{
  if(!st||!modeDrag||!DIARY_KEY)return;
  const dx=x-sx,dy=y-sy;
  if(!axis){
   // If user moves vertically first (scrolling notes), immediately lock to vertical scroll only
   if(Math.abs(dy)>9&&Math.abs(dy)>=Math.abs(dx)*0.65){axis='v';modeDrag=false;return}
   // Require deliberate flat horizontal movement before engaging the Diary <-> Vault pager
   if(Math.abs(dx)>14&&Math.abs(dx)>Math.abs(dy)*1.75){axis='h'}
   else return;
  }
  if(axis!=='h')return;
  const vpEl=$('#dr-vp'),trackEl=$('#dr-track'),mbar=$('#dr-mbar');
  if(!vpEl||!trackEl)return;
  const vpW=vpEl.clientWidth||window.innerWidth||360;
  const basePx=drMode==='vault'?-vpW:0;
  let effDx=dx;
  if((drMode==='diary'&&dx>0)||(drMode==='vault'&&dx<0)){
   effDx=dx*0.18;
  }else{
   effDx=Math.max(-vpW,Math.min(vpW,dx));
  }
  const tx=basePx+effDx;
  trackEl.classList.add('dragging');
  trackEl.style.transform=`translate3d(${tx}px,0,0)`;
  if(mbar){
   const prog=Math.max(0,Math.min(1,-tx/vpW));
   mbar.classList.add('dragging');
   mbar.style.setProperty('--mbar-p',prog.toFixed(3));
  }
 };
 const onEnd=(x,y)=>{
  if(!st)return;
  const dx=x-sx,dy=y-sy,dt=Math.max(1,performance.now()-st);
  st=0;
  const trackEl=$('#dr-track'),mbar=$('#dr-mbar'),vpEl=$('#dr-vp');
  if(trackEl)trackEl.classList.remove('dragging');
  if(mbar)mbar.classList.remove('dragging');
  // Header pull-down to close
  if(t0&&t0.closest&&t0.closest('.dr-hd')&&isVertPullDown(dx,dy,dt,56)){
   if(trackEl)trackEl.style.transform='';
   if(mbar)mbar.style.removeProperty('--mbar-p');
   if($('#dr-cx'))$('#dr-cx').click();
   return;
  }
  // Date bar swipe -> step +/- 1 day (never switches to Vault)
  if(DIARY_KEY&&drMode==='diary'&&t0&&t0.closest&&t0.closest('.dr-dbar')&&!t0.closest('[data-dp]')&&isHorizSwipe(dx,dy,dt,38)){
   shiftDiaryDate(dx<0?1:-1);
   return;
  }
  if(!DIARY_KEY||!modeDrag)return;
  const vpW=(vpEl&&vpEl.clientWidth)||window.innerWidth||360;
  const vel=Math.abs(dx)/dt;
  const validSwipe=axis==='h'||(axis===null&&dt<650&&Math.abs(dx)>=56&&Math.abs(dx)>Math.abs(dy)*1.85);
  const commit=validSwipe&&(Math.abs(dx)>=Math.min(92,vpW*0.24)||(Math.abs(dx)>=52&&vel>=0.45&&Math.abs(dx)>Math.abs(dy)*2.0));
  if(commit){
   if(dx<0&&drMode==='diary'){switchDiaryMode('vault');return}
   if(dx>0&&drMode==='vault'){switchDiaryMode('diary');return}
  }
  switchDiaryMode(drMode);
 };
 dlg.addEventListener('touchstart',e=>{if(e.touches.length===1){tTouch=true;onStart(e.touches[0].clientX,e.touches[0].clientY,e.target)}},{passive:true});
 dlg.addEventListener('touchmove',e=>{if(e.touches.length===1)onMove(e.touches[0].clientX,e.touches[0].clientY)},{passive:true});
 dlg.addEventListener('touchend',e=>{if(e.changedTouches.length)onEnd(e.changedTouches[0].clientX,e.changedTouches[0].clientY);setTimeout(()=>{tTouch=false},80)},{passive:true});
 dlg.addEventListener('pointerdown',e=>{if(!tTouch&&e.pointerType!=='touch'&&e.button===0)onStart(e.clientX,e.clientY,e.target)});
 dlg.addEventListener('pointermove',e=>{if(!tTouch&&e.pointerType!=='touch')onMove(e.clientX,e.clientY)});
 dlg.addEventListener('pointerup',e=>{if(!tTouch&&e.pointerType!=='touch')onEnd(e.clientX,e.clientY)});
})();

// 5. Full-Screen Tasks (#tkd): swipe header down to close, swipe body left/right to cycle All <-> 1. Personal <-> 2. Work
const TK_CATS=['all','personal','work'];
bindSwipeSurface($('#tkd'),(dx,dy,dt,t0)=>{
 if(!$('#tkd')||!$('#tkd').open)return;
 if(t0&&t0.closest&&t0.closest('.tk-hd')&&isVertPullDown(dx,dy,dt,56)){
  if($('#tk-cx'))$('#tk-cx').click();
  return;
 }
 if(!isHorizSwipe(dx,dy,dt,46))return;
 if(t0&&t0.closest&&t0.closest('input,textarea,select,[data-dp],.cal'))return;
 const idx=TK_CATS.indexOf(tkFCat);
 const nextIdx=dx<0?idx+1:idx-1;
 if(nextIdx>=0&&nextIdx<TK_CATS.length){
  tkFCat=TK_CATS[nextIdx];
  renderTasksList();
  triggerSlide($('#tk-list'),dx<0?1:-1);
 }
});

stamp(true);
syncDiaryDot();
syncTaskBadge();
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