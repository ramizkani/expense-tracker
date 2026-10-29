// Storage: IndexedDB, loaded into memory at start so the rest of the app can read it synchronously.
const MEM={};let idb=null;
const openDB=()=>new Promise((res,rej)=>{const r=indexedDB.open('ledger-db',1);r.onupgradeneeded=()=>r.result.createObjectStore('kv');r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)});
async function initStore(){
 try{idb=await openDB();await new Promise(res=>{const tx=idb.transaction('kv'),q=tx.objectStore('kv').openCursor();q.onsuccess=e=>{const c=e.target.result;if(c){MEM[c.key]=c.value;c.continue()}};tx.oncomplete=res;tx.onerror=res})}catch(e){idb=null}
 try{if(navigator.storage&&navigator.storage.persist)await navigator.storage.persist()}catch(e){}
}
const STORE={getItem:k=>k in MEM?MEM[k]:null,setItem:(k,v)=>{MEM[k]=v;if(idb)try{idb.transaction('kv','readwrite').objectStore('kv').put(v,k)}catch(e){}}};
(async()=>{
await initStore();

const $=s=>document.querySelector(s);
const LS='ledger.v2';
const CATS={out:['🍔 Food','🚌 Transport','🧾 Bills','🛍️ Shopping','💊 Health','🏠 Rent','🎬 Fun','📦 Other'],in:['💼 Salary','↩️ Refund','🎁 Gift','🔁 Transfer','📦 Other']};
const LC='ledger.cats.v1';
let CT=null;try{CT=JSON.parse(STORE.getItem(LC))}catch(e){}
if(!CT){CT=CATS.out.map(n=>({n,t:'out',a:1}));CATS.in.forEach(n=>{const c=CT.find(x=>x.n===n);c?c.t='both':CT.push({n,t:'in',a:1})})}
const saveC=()=>{try{STORE.setItem(LC,JSON.stringify(CT))}catch(e){}};
const catsFor=ty=>CT.filter(c=>c.t===ty||c.t==='both').map(c=>c.n);
const iso=n=>{const d=new Date();d.setDate(d.getDate()-n);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')};
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const fmt=(c,n)=>(c==='INR'?'₹':'AED ')+Number(n).toLocaleString(c==='INR'?'en-IN':'en-US',{minimumFractionDigits:n%1?2:0,maximumFractionDigits:2});
const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,8);
const mk=k=>{const d=new Date();d.setDate(1);d.setMonth(d.getMonth()-k);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')};
const mname=m=>new Date(m+'-01T00:00').toLocaleDateString('en',{month:'short'});
const mlabel=m=>new Date(m+'-01T00:00').toLocaleDateString('en',{month:'long',year:'numeric'});
const mtot=(t,m,ty)=>t.filter(x=>x.type===ty&&x.date.slice(0,7)===m).reduce((a,x)=>a+x.amt,0);
function chart(t,c){
 const ms=[5,4,3,2,1,0].map(mk),I=ms.map(m=>mtot(t,m,'in')),O=ms.map(m=>mtot(t,m,'out')),mx=Math.max(...I,...O,1);
 const X=i=>20+i*52,Y=v=>12+(1-v/mx)*66,P=a=>a.map((v,i)=>X(i)+','+Y(v).toFixed(1)).join(' '),si=ms.indexOf(S.mo);
 const dots=(a,col)=>ms.map((m,i)=>`<circle data-m="${m}" cx="${X(i)}" cy="${Y(a[i]).toFixed(1)}" r="${i===si?5:3.5}" fill="${col}"><title>${mname(m)}: ${fmt(c,a[i])}</title></circle>`).join('');
 return `<div class="lg"><span><i style="background:var(--in)"></i>Received</span><span><i style="background:var(--out)"></i>Spent</span><span>Last 6 months. Tap a month to open it.</span></div>
 <svg viewBox="0 0 300 108" class="ch" role="img" aria-label="Monthly received and spent, last 6 months">
 ${si>=0?`<rect x="${X(si)-25}" y="4" width="50" height="78" rx="10" fill="var(--acc)" opacity=".16"/>`:''}
 <line x1="8" x2="292" y1="${Y(0)}" y2="${Y(0)}" stroke="var(--line)"/>
 ${ms.map((m,i)=>`<rect data-m="${m}" x="${X(i)-26}" y="0" width="52" height="108" fill="transparent"/>`).join('')}
 <polyline points="${P(I)}" fill="none" stroke="var(--in)" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>
 <polyline points="${P(O)}" fill="none" stroke="var(--out)" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>
 ${dots(I,'var(--in)')}${dots(O,'var(--out)')}
 ${ms.map((m,i)=>`<text x="${X(i)}" y="100" text-anchor="middle" font-size="11" fill="var(--mut)" font-weight="${i===si?700:400}">${mname(m)}</text>`).join('')}
 </svg>`;
}
let S={tx:null,off:false,tab:'AED',cur:'AED',mo:mk(0),q:'',f:'all',pp:10,pg:1,eid:null,dcur:'INR',ds:'open',dq:'',did:null,xp:{},type:'out',cat:'',busy:false};
try{const r=STORE.getItem(LS);if(r)S.tx=JSON.parse(r)}catch(e){}
if(!S.tx)S.tx=[];
const save=()=>{try{STORE.setItem(LS,JSON.stringify(S.tx))}catch(e){}};
const online=()=>!S.off&&navigator.onLine;
const sum=(t,ty)=>t.filter(x=>x.type===ty).reduce((a,x)=>a+x.amt,0);

const SV='<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">';
const IC={e:SV+'<path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>',d:SV+'<path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/></svg>'};
const CH='<svg viewBox="0 0 12 8" width="12" height="8" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M1 1l5 5 5-5"/></svg>';
const CK='<svg viewBox="0 0 16 12" width="14" height="11" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 6l4 4 8-8"/></svg>';
function dd(id,lab,o,val){const on=x=>String(x.v)===String(val),cur=o.find(on)||o[0],dot=x=>x.d?`<i class="dc" style="background:${x.d}"></i>`:'';
 return `<div class="dd" data-dd="${id}"><button type="button" class="ddb" aria-haspopup="listbox" aria-expanded="false" aria-label="${lab}">${dot(cur)}<span>${esc(cur.l)}</span>${CH}</button><div class="ddm" role="listbox">${o.map(x=>`<button type="button" role="option" class="ddo${on(x)?' on':''}" data-v="${x.v}" aria-selected="${on(x)}">${dot(x)}<span class="t"><b>${esc(x.l)}</b>${x.s?`<small>${esc(x.s)}</small>`:''}</span>${x.r?`<em class="${x.rc||''}">${esc(x.r)}</em>`:''}${on(x)?CK:''}</button>`).join('')}</div></div>`}
const closeDd=()=>document.querySelectorAll('.dd.open').forEach(d=>{d.classList.remove('open');d.firstChild.setAttribute('aria-expanded','false')});
document.addEventListener('click',e=>{if(!e.target.closest('.dd'))closeDd()});
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeDd()});
const LO='ledger.ob.v1';let OB={INR:0};try{const o=JSON.parse(STORE.getItem(LO));if(o)OB=o}catch(e){}
const r2=n=>Math.round(n*100)/100;
IC.dn=SV+'<path d="M6 9l6 6 6-6"/></svg>';IC.up=SV+'<path d="M6 15l6-6 6 6"/></svg>';
const paid=d=>r2(d.pays.reduce((a,p)=>a+p.amt,0)),rem=d=>r2(d.amt-paid(d));
const LD='ledger.debts.v2';let DB=null;try{DB=JSON.parse(STORE.getItem(LD))}catch(e){}
if(!DB)DB=[];
const dsave=()=>{try{STORE.setItem(LD,JSON.stringify(DB))}catch(e){}};
function dnet(c){const m={};DB.filter(d=>d.cur===c&&!d.del&&rem(d)>0).forEach(d=>{const k=d.who.trim().toLowerCase();m[k]=m[k]||{who:d.who.trim(),n:0};m[k].n=r2(m[k].n+(d.dir==='lent'?rem(d):-rem(d)))});return Object.values(m).filter(p=>p.n!==0).sort((a,b)=>Math.abs(b.n)-Math.abs(a.n))}
function debts(c){const L=dnet(c),got=r2(L.filter(p=>p.n>0).reduce((a,p)=>a+p.n,0)),ow=r2(-L.filter(p=>p.n<0).reduce((a,p)=>a+p.n,0));
 return `<aside class="dw"><div class="dh"><b>Debts</b><button class="ghost" data-dk="manage:">Manage</button></div><div class="ds"><span class="in">Owed to you<b>${fmt(c,got)}</b></span><span class="out">You owe<b>${fmt(c,ow)}</b></span></div><div class="dl">${L.map(p=>`<div class="dr"><span class="av2">${esc(p.who.slice(0,1).toUpperCase())}</span><span class="t"><b>${esc(p.who)}</b><small class="${p.n>0?'in':'out'}">${p.n>0?'owes you':'you owe'}</small></span><em class="${p.n>0?'in':'out'}">${fmt(c,Math.abs(p.n))}</em></div>`).join('')||'<div class="empty">No debts. All settled.</div>'}</div></aside>`}
const ledger=c=>S.tx.filter(x=>x.cur===c&&!x.del).sort((a,b)=>b.date.localeCompare(a.date)||b.ts-a.ts);
function tbl(c){if(c==='INR')return ltbl(c);
 const q=S.q.toLowerCase(),all=ledger(c).filter(x=>x.date.slice(0,7)===S.mo&&(S.f==='all'||x.type===S.f)&&(!q||(x.cat+' '+x.note).toLowerCase().includes(q)));
 const pages=Math.max(1,Math.ceil(all.length/S.pp));S.pg=Math.max(1,Math.min(S.pg,pages));
 const st=(S.pg-1)*S.pp,rows=all.slice(st,st+S.pp);
 return `<div class="tw"><table class="lt"><colgroup><col style="width:46px"><col style="width:140px"><col><col style="width:92px"><col style="width:112px"><col style="width:96px"></colgroup><thead><tr><th>S.no</th><th>Date</th><th>Category / notes</th><th>Type</th><th class="r">Amount</th><th></th></tr></thead><tbody>${rows.map((x,i)=>{const f=i===0||rows[i-1].date!==x.date,l=i===rows.length-1||rows[i+1].date!==x.date,sp=rows.filter(r=>r.date===x.date).length,day=all.filter(r=>r.date===x.date),net=day.reduce((a,r)=>a+(r.type==='in'?r.amt:-r.amt),0);
 return `<tr class="${f?'f':''} ${l?'':'k'}"><td>${st+i+1}</td>${f?`<td rowspan="${sp}" class="dt"><b>${new Date(x.date+'T00:00').toLocaleDateString('en',{day:'2-digit',month:'short',year:'numeric'})}</b><span class="n">${day.length} ${day.length===1?'entry':'entries'} · ${net<0?'−':'+'}${fmt(c,Math.abs(net))}</span></td>`:''}<td><b>${esc(x.cat)}</b><span class="n">${esc(x.note||'No notes')}</span></td><td><span class="tp ${x.type}">${x.type==='in'?'Received':'Spent'}</span></td><td class="r amt ${x.type}">${x.type==='in'?'+':'\u2212'}${fmt(c,x.amt)}<i class="sd ${x.synced?'':'p'}" title="${x.synced?'Synced':'Waiting to sync'}"></i></td><td class="ac"><button class="ib" data-e="${x.id}" aria-label="Edit entry" title="Edit">${IC.e}</button><button class="ib d" data-d="${x.id}" aria-label="Delete entry" title="Delete">${IC.d}</button></td></tr>`}).join('')||`<tr><td colspan="6" class="empty">No matching entries in ${mlabel(S.mo)}.</td></tr>`}</tbody></table></div>
 <div class="pg"><span>${all.length?st+1:0}\u2013${st+rows.length} of ${all.length}</span><span><button class="ghost" data-p="-1"${S.pg<=1?' disabled':''}>Prev</button> <button class="ghost" data-p="1"${S.pg>=pages?' disabled':''}>Next</button></span></div>`;
}
function ltbl(c){
 const A=S.tx.filter(x=>x.cur===c&&!x.del).sort((a,b)=>a.date.localeCompare(b.date)||a.ts-b.ts);
 let bal=OB[c]||0,bf=null;const av={};
 A.forEach(x=>{if(bf===null&&x.date.slice(0,7)>=S.mo)bf=bal;bal=r2(bal+(x.type==='in'?x.amt:-x.amt));av[x.id]=bal});
 if(bf===null)bf=bal;
 const first=!A.some(x=>x.date.slice(0,7)<S.mo),M=A.filter(x=>x.date.slice(0,7)===S.mo),q=S.q.toLowerCase();
 const all=M.filter(x=>(S.f==='all'||x.type===S.f)&&(!q||(x.cat+' '+x.note).toLowerCase().includes(q))).reverse();
 const pages=Math.max(1,Math.ceil(all.length/S.pp));S.pg=Math.max(1,Math.min(S.pg,pages));
 const st=(S.pg-1)*S.pp,rows=all.slice(st,st+S.pp),tI=r2(M.filter(x=>x.type==='in').reduce((a,x)=>a+x.amt,0)),tO=r2(M.filter(x=>x.type==='out').reduce((a,x)=>a+x.amt,0)),close=M.length?av[M[M.length-1].id]:bf,neg=n=>n<0?' out':'';
 const body=rows.map((x,i)=>{const f=i===0||rows[i-1].date!==x.date,l=i===rows.length-1||rows[i+1].date!==x.date,sp=rows.filter(r=>r.date===x.date).length,day=all.filter(r=>r.date===x.date),net=r2(day.reduce((a,r)=>a+(r.type==='in'?r.amt:-r.amt),0));
  return `<tr class="${f?'f':''} ${l?'':'k'}"><td>${st+i+1}</td>${f?`<td rowspan="${sp}" class="dt"><b>${new Date(x.date+'T00:00').toLocaleDateString('en',{day:'2-digit',month:'short',year:'numeric'})}</b><span class="n">${day.length} ${day.length===1?'entry':'entries'} · ${net<0?'−':'+'}${fmt(c,Math.abs(net))}</span></td>`:''}<td><b>${esc(x.cat)}</b><span class="n">${esc(x.note||'No notes')}</span></td><td class="r amt in">${x.type==='in'?fmt(c,x.amt):'<i class="z">–</i>'}</td><td class="r amt out">${x.type==='out'?fmt(c,x.amt):'<i class="z">–</i>'}</td><td class="r av${neg(av[x.id])}">${fmt(c,av[x.id])}<i class="sd ${x.synced?'':'p'}" title="${x.synced?'Synced':'Waiting to sync'}"></i></td><td class="ac"><button class="ib" data-e="${x.id}" aria-label="Edit entry" title="Edit">${IC.e}</button><button class="ib d" data-d="${x.id}" aria-label="Delete entry" title="Delete">${IC.d}</button></td></tr>`}).join('');
 const bfr=S.pg===pages?`<tr class="bf"><td></td><td colspan="2"><b>${first?'Opening balance':'Brought forward'}</b><span class="n">${first?'Set once. Every entry updates Available.':'Balance before '+mname(S.mo)}</span></td><td></td><td></td><td class="r av${neg(bf)}">${fmt(c,bf)}</td><td class="ac"><button class="ib" data-ob="1" aria-label="Edit opening balance" title="Edit opening balance">${IC.e}</button></td></tr>`:'';
 return `<div class="tw"><table class="lt l"><colgroup><col style="width:46px"><col style="width:136px"><col><col style="width:108px"><col style="width:108px"><col style="width:122px"><col style="width:100px"></colgroup><thead><tr><th>S.no</th><th>Date</th><th>Category</th><th class="r">Received</th><th class="r">Spent</th><th class="r">Available</th><th class="r">Edit options</th></tr></thead><tbody>${body||`<tr><td colspan="7" class="empty">No matching entries in ${mlabel(S.mo)}.</td></tr>`}${bfr}</tbody><tfoot><tr><td></td><td colspan="2">Month total and closing</td><td class="r in">${fmt(c,tI)}</td><td class="r out">${fmt(c,tO)}</td><td class="r av${neg(close)}">${fmt(c,close)}</td><td></td></tr></tfoot></table></div>
 <div class="pg"><span>${all.length?st+1:0}–${st+rows.length} of ${all.length}</span><span><button class="ghost" data-p="-1"${S.pg<=1?' disabled':''}>Prev</button> <button class="ghost" data-p="1"${S.pg>=pages?' disabled':''}>Next</button></span></div>`;
}
const dlab=d=>rem(d)<=0?['Settled','in']:paid(d)>0?['Partial','mid']:['Open','op'];
function dlist(){
 const c=S.dcur,q=S.dq.toLowerCase(),dt=s=>new Date(s+'T00:00').toLocaleDateString('en',{day:'2-digit',month:'short',year:'numeric'});
 const rows=DB.filter(d=>d.cur===c&&!d.del&&(S.ds==='all'||(S.ds==='open'?rem(d)>0:rem(d)<=0))&&(!q||(d.who+' '+d.note).toLowerCase().includes(q))).sort((a,b)=>b.date.localeCompare(a.date)||b.ts-a.ts);
 const body=rows.map((d,i)=>{const r=rem(d),p=paid(d),pc=d.amt?Math.min(100,Math.round(p/d.amt*100)):0,[sl,sc]=dlab(d),op=S.xp[d.id];
  const sub=op?`<tr class="sub"><td></td><td colspan="8"><div class="ph"><div class="pht"><b>Payment history</b><span class="n">${d.pays.length} ${d.pays.length===1?'payment':'payments'}</span></div>${d.pays.slice().sort((a,b)=>b.date.localeCompare(a.date)).map(y=>`<div class="pr"><span>${dt(y.date)}</span><span class="n">${esc(y.note||'Payment')}</span><b>${fmt(c,y.amt)}</b><button class="ib d" data-dk="dp:${d.id}:${y.id}" aria-label="Delete payment" title="Delete payment">${IC.d}</button></div>`).join('')||'<div class="n">No payments yet.</div>'}</div></td></tr>`:'';
  return `<tr class="f"><td>${i+1}</td><td>${dt(d.date)}</td><td><b>${esc(d.who)}</b><span class="n">${esc(d.note||'No notes')}</span></td><td><span class="tp ${d.dir==='lent'?'':'out'}">${d.dir==='lent'?'They owe me':'I owe them'}</span></td><td class="r">${fmt(c,d.amt)}</td><td class="r">${fmt(c,p)}</td><td class="r av">${fmt(c,r)}<span class="pb"><i style="width:${pc}%"></i></span></td><td><span class="st ${sc}">${sl}</span></td><td class="ac">${r>0?`<button class="ghost pay" data-dk="pay:${d.id}">Pay</button>`:''}<button class="ib" data-dk="xp:${d.id}" aria-label="Payment history" title="Payment history">${op?IC.up:IC.dn}</button><button class="ib" data-dk="edit:${d.id}" aria-label="Edit debt" title="Edit">${IC.e}</button><button class="ib d" data-dk="del:${d.id}" aria-label="Delete debt" title="Delete">${IC.d}</button></td></tr>${sub}`}).join('');
 return `<div class="tw"><table class="lt dtb"><colgroup><col style="width:46px"><col style="width:108px"><col><col style="width:112px"><col style="width:92px"><col style="width:92px"><col style="width:120px"><col style="width:84px"><col style="width:176px"></colgroup><thead><tr><th>S.no</th><th>Date</th><th>Person / notes</th><th>Type</th><th class="r">Amount</th><th class="r">Paid</th><th class="r">Remaining</th><th>Status</th><th class="r">Actions</th></tr></thead><tbody>${body||`<tr><td colspan="9" class="empty">No debts here.</td></tr>`}</tbody></table></div>`;
}
function debtsTab(){const c=S.dcur,L=DB.filter(d=>d.cur===c&&!d.del),got=r2(L.filter(d=>d.dir==='lent').reduce((a,d)=>a+rem(d),0)),ow=r2(L.filter(d=>d.dir==='owe').reduce((a,d)=>a+rem(d),0));
 const sg=(k,v,l)=>`<button data-dk="${k}:${v}" class="${(k==='cur'?S.dcur:S.ds)===v?'on':''}">${l}</button>`;
 return `<section class="card wide ${c.toLowerCase()}"><div class="head"><div class="cur"><span>Debts and part-payments</span><span class="code">${c}</span></div><div class="io" style="margin-top:14px;gap:30px"><div class="i">Owed to you<b>${fmt(c,got)}</b></div><div class="o">You owe<b>${fmt(c,ow)}</b></div><div>Net<b>${fmt(c,r2(got-ow))}</b></div></div></div>
 <div class="tb"><div class="seg">${sg('cur','AED','AED')}${sg('cur','INR','INR')}</div><div class="seg">${sg('st','open','Open')}${sg('st','done','Settled')}${sg('st','all','All')}</div><input id="dq" type="search" placeholder="Search person or notes" aria-label="Search debts" value="${esc(S.dq)}"><button class="prim" style="padding:9px 16px" data-dk="add:">+ Add debt</button></div>
 <div id="dlist" style="padding-bottom:10px">${dlist()}</div></section>`}
function widget(c){
 const t=ledger(c);
 const inc=sum(t,'in'),out=sum(t,'out');
 const mt=t.filter(x=>x.date.slice(0,7)===S.mo),ms=[...new Set([mk(0),S.mo,...t.map(x=>x.date.slice(0,7))])].sort().reverse();
 
 return `<section class="card ${c.toLowerCase()}"><div class="head"><div class="hg"><div class="hl"><div class="cur"><span>${c==='AED'?'UAE dirham':'Indian rupee · available'}</span><span class="code">${c}</span></div>
 <div class="bal">${fmt(c,r2((c==='INR'?OB.INR||0:0)+inc-out))}</div>
 <div class="io"><div class="i">Received · ${mname(S.mo)}<b>${fmt(c,mtot(t,S.mo,'in'))}</b></div><div class="o">Spent · ${mname(S.mo)}<b>${fmt(c,mtot(t,S.mo,'out'))}</b></div></div>
 ${chart(t,c)}</div>${debts(c)}</div></div>
 <div class="lh">${dd('mo','Month',ms.map(m=>{const n=t.filter(x=>x.date.slice(0,7)===m).length,net=mtot(t,m,'in')-mtot(t,m,'out');return{v:m,l:mlabel(m),s:n+(n===1?' entry':' entries'),r:(net>=0?'+':'\u2212')+fmt(c,Math.abs(net)),rc:net>=0?'in':'out'}}),S.mo)}<span>${mt.length} ${mt.length===1?'entry':'entries'}</span></div>
 <div class="tb"><input id="q" type="search" placeholder="Search category or notes" aria-label="Search" value="${esc(S.q)}">${dd('ft','Type filter',[{v:'all',l:'All types'},{v:'in',l:'Received',d:'var(--in)'},{v:'out',l:'Spent',d:'var(--out)'}],S.f)}${dd('pp','Rows per page',[10,25,50].map(n=>({v:n,l:n+' rows'})),S.pp)}</div>
 <div id="tbl">${tbl(c)}</div></section>`;
}
function plan(){return `<div class="card doc">
 <h2>How it works</h2>
 <p>Each entry is saved on your device first, so adding never waits for the internet. Pending entries show a hollow dot and are sent to your Google Sheet in one batch when you’re back online.</p>
 <ol><li><b>Create the sheet.</b> New Google Sheet in your personal account. The AED and INR tabs are created automatically, with columns ID, Date, Type, Amount, Category, Note, Synced at.</li>
 <li><b>Add the script.</b> Extensions → Apps Script. Paste the code below as Code.gs and add the page as Index.html.</li>
 <li><b>Deploy.</b> Deploy → New deployment → Web app. Execute as: Me. Who has access: Only myself.</li>
 <li><b>Install on your phone.</b> Open the web app link, then Add to Home Screen for a one-tap launch.</li>
 <li><b>Later.</b> Monthly summary tab, category budgets, CSV export.</li></ol>
 <div class="note"><b>Offline limits.</b> Apps Script pages can’t cache themselves, so open the app once while online. After that, entries added while offline are queued and synced automatically. To open the app cold with no signal, host the same page as an installable app (service worker) that posts to this script. I can build that next.</div>
 <h2>Sheet structure</h2><div class="tw" style="padding:0"><table style="min-width:0"><thead><tr><th>Tab</th><th>Columns</th></tr></thead><tbody><tr><td><b>Transactions</b></td><td>transaction_id, date, currency, type, amount_minor, category_id, notes, created_at, updated_at, deleted_at, version, server_revision, device_id</td></tr><tr><td><b>Categories</b></td><td>category_id, name, permitted_type, currency, active, version, updated_at</td></tr><tr><td><b>Meta</b></td><td>key, value (revision counter, schema version)</td></tr></tbody></table></div><p>One Transactions tab with a currency column keeps sync simple, and the app shows AED and INR separately. The Code.gs below is the simple demo version and will be replaced by the sync API.</p>
 <h2>Code.gs</h2><button class="ghost" id="cp" style="width:max-content">Copy code</button><pre id="code"></pre></div>`;}

function render(){
 const p=S.tx.filter(x=>!x.synced).length,on=online();
 $('#st').className='pill '+(S.busy?'sy':on?'':'off');
 $('#stx').textContent=SYNC_ENABLED?(S.busy?'Syncing…':on?(p?p+' pending':'Online · all synced'):'Offline'+(p?' · '+p+' pending':'')):(on?'Saved on this device':'Offline · saved on this device');
 $('#tg').textContent=S.off?'Go online':'Simulate offline';
 $('#app').innerHTML=S.tab==='p'?plan():S.tab==='D'?debtsTab():widget(S.tab);
 document.querySelectorAll('.tabs button').forEach(b=>b.classList.toggle('on',b.dataset.t===S.tab));
 if(S.tab==='p'){$('#code').textContent=$('#gs').textContent;$('#cp').onclick=async()=>{try{await navigator.clipboard.writeText($('#gs').textContent);toast('Code copied')}catch(e){const r=document.createRange();r.selectNodeContents($('#code'));getSelection().removeAllRanges();getSelection().addRange(r);toast('Selected. Press copy.')}}}
 $('#add').style.display=S.tab==='p'||S.tab==='D'?'none':'';
}
// Demo: simulated push. In the deployed app replace with:
// new Promise((ok,no)=>google.script.run.withSuccessHandler(ok).withFailureHandler(no).saveBatch(rows))
const pushToSheet=rows=>new Promise(r=>setTimeout(r,900));
const SYNC_ENABLED=false;
async function sync(){
 if(!SYNC_ENABLED)return;
 const p=S.tx.filter(x=>!x.synced);
 if(S.busy||!online()||!p.length)return;
 S.busy=true;render();
 try{await pushToSheet(p);p.forEach(x=>x.synced=true);save();toast(p.length+(p.length>1?' entries':' entry')+' synced to Google Sheet')}
 catch(e){toast('Sync failed. Will retry.')}
 S.busy=false;render();
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
$('#add').onclick=()=>{S.eid=null;$('#dh').textContent='New entry';$('#sv').textContent='Save entry';if(S.tab!=='p')S.cur=S.tab;$('#am').value='';$('#nt').value='';$('#dt').value=iso(0);$('#er').textContent='';paint();$('#dlg').showModal();$('#am').focus()};
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
 if(ex)Object.assign(ex,f,{ver:(ex.ver||1)+1});else S.tx.push({id:uid(),ts:Date.now(),ver:1,...f});
 S.tab=S.cur=f.cur;S.pg=1;
 S.mo=date.slice(0,7);save();$('#dlg').close();render();
 toast('Saved on this device');sync();
};
$('#tg').onclick=()=>{S.off=!S.off;render();toast(S.off?'Offline mode on. New entries will queue.':'Back online');sync()};
document.querySelector('.tabs').onclick=e=>{const t=e.target.dataset.t;if(!t)return;S.tab=t;if(t!=='D')S.cur=t;render()};
$('#pl').onclick=()=>{S.tab='p';render()};
function renderCm(){$('#cl').innerHTML=CT.map((c,i)=>`<div class="crow"><input type="text" data-n="${i}" value="${esc(c.n)}" aria-label="Category name"><button class="ib d" data-x="${i}" aria-label="Delete category" title="Delete">${IC.d}</button><div class="seg">${[['out','Spent'],['in','Received'],['both','Both']].map(([v,l])=>`<button data-t="${i}" data-v="${v}" class="${c.t===v?'on':''}">${l}</button>`).join('')}</div></div>`).join('')}
let NT='out';
$('#ct').onclick=e=>{const v=e.target.dataset.v;if(!v)return;NT=v;document.querySelectorAll('#ct button').forEach(b=>b.classList.toggle('on',b.dataset.v===v))};
$('#cl').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;const d=b.dataset;
 if(d.t!==undefined)CT[+d.t].t=d.v;
 else if(d.x!==undefined){if(CT.length<2)return;CT.splice(+d.x,1)}
 else return;
 saveC();renderCm()});
$('#cmb').onclick=()=>{renderCm();$('#ce').textContent='';$('#cm').showModal()};
$('#cc').onclick=()=>$('#cm').close();
function openOb(){$('#obv').value=OB.INR||'';$('#obe').textContent='';$('#obd').showModal();$('#obv').focus()}
$('#obs').onclick=()=>{const v=parseFloat($('#obv').value);if(isNaN(v)){$('#obe').textContent='Enter an amount (0 is fine).';return}OB.INR=r2(v);try{STORE.setItem(LO,JSON.stringify(OB))}catch(e){}$('#obd').close();render();toast('Opening balance saved')};
$('#obc').onclick=()=>$('#obd').close();
let DD='lent';

function openDb(id){const d=id&&DB.find(x=>x.id===id);S.did=d?d.id:null;DD=d?d.dir:'lent';document.querySelectorAll('#dbs button').forEach(b=>b.classList.toggle('on',b.dataset.v===DD));$('#dbh').textContent=d?'Edit debt':'Add debt';$('#dbw').value=d?d.who:'';$('#dba').value=d?d.amt:'';$('#dbn').value=d?d.note:'';$('#dbt').value=d?d.date:iso(0);$('#dbe').textContent='';$('#dbd').style.setProperty('--acc',S.dcur==='AED'?'var(--aed)':'var(--inr)');$('#dbd').showModal();$('#dbw').focus()}
$('#dbs').onclick=e=>{const v=e.target.dataset.v;if(!v)return;DD=v;document.querySelectorAll('#dbs button').forEach(b=>b.classList.toggle('on',b.dataset.v===v))};
$('#dbc').onclick=()=>$('#dbd').close();
$('#dbv').onclick=()=>{const w=$('#dbw').value.trim(),a=parseFloat($('#dba').value),dt=$('#dbt').value,d=S.did&&DB.find(x=>x.id===S.did);
 if(!w){$('#dbe').textContent='Enter a name.';return}
 if(!(a>0)){$('#dbe').textContent='Enter an amount greater than 0.';return}
 if(!dt){$('#dbe').textContent='Pick a date.';return}
 if(d&&a<paid(d)){$('#dbe').textContent='Amount can’t be less than the '+fmt(d.cur,paid(d))+' already paid.';return}
 if(d)Object.assign(d,{who:w,amt:r2(a),dir:DD,note:$('#dbn').value.trim(),date:dt});else DB.push({id:uid(),cur:S.dcur,who:w,amt:r2(a),dir:DD,note:$('#dbn').value.trim(),date:dt,ts:Date.now(),pays:[]});
 dsave();$('#dbd').close();render();toast(d?'Debt updated':'Debt saved')};
function openPay(id){const d=DB.find(x=>x.id===id);if(!d)return;S.did=id;$('#pyh').textContent=d.who+' · remaining '+fmt(d.cur,rem(d));$('#pya').value='';$('#pyt').value=iso(0);$('#pyn').value='';$('#pye').textContent='';$('#pyd').style.setProperty('--acc',d.cur==='AED'?'var(--aed)':'var(--inr)');$('#pyd').showModal();$('#pya').focus()}
$('#pyf').onclick=()=>{const d=DB.find(x=>x.id===S.did);if(d)$('#pya').value=rem(d)};
$('#pyc').onclick=()=>$('#pyd').close();
$('#pys').onclick=()=>{const d=DB.find(x=>x.id===S.did),a=parseFloat($('#pya').value),t=$('#pyt').value;if(!d)return;
 if(!(a>0)){$('#pye').textContent='Enter an amount greater than 0.';return}
 if(r2(a)>rem(d)){$('#pye').textContent='That is more than the remaining '+fmt(d.cur,rem(d))+'.';return}
 if(!t){$('#pye').textContent='Pick a date.';return}
 d.pays.push({id:uid(),amt:r2(a),date:t,note:$('#pyn').value.trim()});S.xp[d.id]=1;dsave();$('#pyd').close();render();toast(rem(d)<=0?'Fully paid':'Payment saved. Remaining '+fmt(d.cur,rem(d)))};
$('#app').addEventListener('input',e=>{if(e.target.id==='dq'){S.dq=e.target.value;$('#dlist').innerHTML=dlist()}});
$('#app').addEventListener('click',e=>{const b=e.target.closest('[data-dk]');if(!b)return;const[a,i,j]=b.dataset.dk.split(':');
 if(a==='manage'){S.dcur=S.tab;S.tab='D';render()}
 else if(a==='cur'){S.dcur=i;render()}else if(a==='st'){S.ds=i;render()}
 else if(a==='add')openDb();else if(a==='edit')openDb(i);else if(a==='pay')openPay(i);
 else if(a==='xp'){S.xp[i]=!S.xp[i];render()}
 else if(a==='del'){const d=DB.find(x=>x.id===i);if(!d)return;d.del=1;dsave();render();toast('Debt deleted. Tap to undo.',()=>{d.del=0;dsave();render()})}
 else if(a==='dp'){const d=DB.find(x=>x.id===i),k=d?d.pays.findIndex(y=>y.id===j):-1;if(k<0)return;const[y]=d.pays.splice(k,1);dsave();render();toast('Payment removed. Tap to undo.',()=>{d.pays.push(y);dsave();render()})}});
$('#cl').addEventListener('change',e=>{const el=e.target,d=el.dataset;
 if(d.n!==undefined){const c=CT[+d.n],nn=el.value.trim();
  if(!nn||CT.some((x,j)=>j!==+d.n&&x.n.toLowerCase()===nn.toLowerCase())){el.value=c.n;$('#ce').textContent='Name is empty or already used.';return}
  S.tx.forEach(x=>{if(x.cat===c.n){x.cat=nn;x.synced=false;x.ver=(x.ver||1)+1}});c.n=nn;save();render();sync()}
 saveC();$('#ce').textContent=''});
$('#ca').onclick=()=>{const n=$('#cn').value.trim();
 if(!n){$('#ce').textContent='Enter a category name.';return}
 if(CT.some(x=>x.n.toLowerCase()===n.toLowerCase())){$('#ce').textContent='That category already exists.';return}
 CT.push({n,t:NT,a:1});saveC();$('#cn').value='';$('#ce').textContent='';renderCm();toast('Category added')};
$('#app').addEventListener('change',e=>{const i=e.target.id;if(i==='mo')S.mo=e.target.value;else if(i==='ft')S.f=e.target.value;else if(i==='pp')S.pp=+e.target.value;else return;S.pg=1;render()});
$('#app').addEventListener('input',e=>{if(e.target.id==='q'){S.q=e.target.value;S.pg=1;$('#tbl').innerHTML=tbl(S.tab)}});
$('#app').addEventListener('click',e=>{const o=e.target.closest('.ddo'),h=e.target.closest('.ddb');
 if(o){const id=o.closest('.dd').dataset.dd,v=o.dataset.v;if(id==='mo')S.mo=v;else if(id==='ft')S.f=v;else if(id==='pp')S.pp=+v;S.pg=1;render();return}
 if(h){const p=h.parentNode,was=p.classList.contains('open');closeDd();if(!was){p.classList.add('open');h.setAttribute('aria-expanded','true')}return}
 const b=e.target.closest&&e.target.closest('[data-m],[data-p],[data-e],[data-d],[data-ob]');if(!b)return;const d=b.dataset;
 if(d.m){S.mo=d.m;S.pg=1;render()}else if(d.p){S.pg+=+d.p;$('#tbl').innerHTML=tbl(S.tab)}else if(d.e)openEdit(d.e);else if(d.d)del(d.d);else if(d.ob!==undefined)openOb()});
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
  else if(d){CI.value=d.dataset.cd;cal.hidden=true}
  return}
 cal.hidden=true});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!cal.hidden){e.preventDefault();cal.hidden=true}
 if((e.key==='Enter'||e.key===' ')&&e.target.matches&&e.target.matches('[data-dp]')){e.preventDefault();calOpen(e.target)}});
addEventListener('online',()=>{render();sync()});addEventListener('offline',render);
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
