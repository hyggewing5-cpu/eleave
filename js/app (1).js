/* ---------- helpers ---------- */
const $ = s => document.querySelector(s);
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const THM = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];
const THMF = ['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน','กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม'];
const FYM =['ต.ค.','พ.ย.','ธ.ค.','ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.'];
function fd(s){ if(!s) return '-'; const p=String(s).slice(0,10).split('-').map(Number); return p[2]+' '+THM[p[1]-1]+' '+(p[0]+543); }
function fdt(s){ if(!s) return '-'; const t=String(s); return fd(t)+(t.length>10?' '+t.slice(11,16):''); }
const be = y => y + 543;
const num = n => (Math.round(Number(n||0)*100)/100).toLocaleString('th-TH');
/* token เก็บในเบราว์เซอร์ (ถ้าเก็บไม่ได้ จะเก็บในหน่วยความจำ ต้องล็อกอินใหม่เมื่อรีเฟรช) */
const TOK_KEY='eleave_token';
function tokGet(){ try{ return localStorage.getItem(TOK_KEY)||''; }catch(e){ return window.__tok||''; } }
function tokSet(t){ window.__tok=t||''; try{ t?localStorage.setItem(TOK_KEY,t):localStorage.removeItem(TOK_KEY); }catch(e){} }
const CFG=window.ELEAVE_CONFIG||{};
const API_READ=/^(bootstrap|publicInfo|get[A-Z]\w*|list[A-Z]\w*|preview[A-Z]\w*)$/;
function apiConfigured(){ return !/X{8,}/.test(String(CFG.API_URL||''))&&/^https:\/\/script\.google\.com\/(a\/[^/]+\/)?macros\/s\/[\w-]+\/exec$/.test(String(CFG.API_URL||'').trim()); }
async function callApi(fn,args){
  const ctl=new AbortController(), to=setTimeout(()=>ctl.abort(),(CFG.TIMEOUT_MS||60000));
  try{
    // ใช้ text/plain เพื่อเลี่ยง CORS preflight (Apps Script ไม่รองรับ OPTIONS)
    const res=await fetch(CFG.API_URL,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify({fn,args,token:tokGet()}),signal:ctl.signal,redirect:'follow'});
    const txt=await res.text(); let j;
    try{ j=JSON.parse(txt); }catch(e){ throw new Error('เซิร์ฟเวอร์ตอบกลับผิดรูปแบบ — ตรวจสอบว่า Deploy Web App เป็น "Execute as: Me" และ "Who has access: Anyone" และ URL ใน api-config.js ถูกต้อง'); }
    if(!j.ok) throw new Error(j.error||'เกิดข้อผิดพลาด');
    return j.data;
  }catch(e){
    if(e.name==='AbortError') throw new Error('เซิร์ฟเวอร์ใช้เวลานานเกินไป กรุณาลองใหม่');
    if(e instanceof TypeError){
      console.error('[eLeave] fetch ล้มเหลว',e,'URL:',CFG.API_URL);
      const hint=location.protocol==='file:'?' (เปิดจากไฟล์ในเครื่อง — ให้เปิดผ่านเว็บที่ Deploy บน Netlify)':'';
      throw Object.assign(new Error('เชื่อมต่อเซิร์ฟเวอร์ไม่ได้'+hint+' — ถ้าอินเทอร์เน็ตปกติ ให้ตรวจว่า Web App ตั้ง Who has access = Anyone (ไม่ใช่ "Anyone with Google account") และ URL ใน api-config.js เป็นลิงก์ /exec ที่ Deploy แล้ว (ทดสอบเปิดลิงก์ในหน้าต่างไม่ระบุตัวตน ต้องเห็น JSON โดยไม่ต้องล็อกอิน Google)'),{net:true});
    }
    throw e;
  }finally{ clearTimeout(to); }
}
async function api(fn, ...a){
  if(!apiConfigured()) throw new Error('ยังไม่ได้ตั้งค่า API_URL ในไฟล์ api-config.js');
  let m;
  try{
    try{ return await callApi(fn,a); }
    catch(e){ if(e.net&&API_READ.test(fn)) return await callApi(fn,a); throw e; }   // อ่านข้อมูล: ลองซ้ำ 1 ครั้งเมื่อเครือข่ายสะดุด
  }catch(e){
    m=String((e&&e.message)||e);
    if(m.includes('AUTH_REQUIRED')){ const had=!!tokGet(); tokSet(''); showLogin(had?'เซสชันหมดอายุ กรุณาเข้าสู่ระบบอีกครั้ง':''); throw new Error('เซสชันหมดอายุ'); }
    if(m.includes('MUST_CHANGE_PASSWORD')){ showChangePw(true); throw new Error('ต้องเปลี่ยนรหัสผ่านก่อนใช้งาน'); }
    throw new Error(m);
  }
}
function toast(msg, bad){ const t=$('#toast'); t.textContent=msg; t.className=bad?'bad':''; t.style.display='block'; clearTimeout(toast.t); toast.t=setTimeout(()=>t.style.display='none', bad?6000:3000); }
function statusPill(s){ const c={'อนุมัติ':'ok','รออนุมัติ':'warn','ไม่อนุมัติ':'bad','ยกเลิก':''}[s]||''; return `<span class="pill ${c}">${esc(s)}</span>`; }
function fyOptions(sel){ let h=''; for(let y=S.fyNow+1;y>=S.fyNow-5;y--) h+=`<option value="${y}" ${y==sel?'selected':''}>ปีงบประมาณ ${be(y)}</option>`; return h; }

/* ---------- ปีงบประมาณ / แบรนด์หน่วยงาน ---------- */
const fyRangeText = fy => `1 ต.ค. ${be(fy-1)} – 30 ก.ย. ${be(fy)}`;
function fyInfoHtml(fy){
  if(!fy) return 'ไม่ได้เลือกปีงบประมาณ: ระบบจะนับวันลาสะสมจากวันบรรจุ โดยแต่ละปีงบประมาณเริ่ม 1 ตุลาคม และสิ้นสุด 30 กันยายน';
  return `<div class="fyinfo"><div><span>วันเริ่มต้น</span><b>1 ${THMF[9]} ${be(fy-1)}</b></div><div><span>วันสิ้นสุด</span><b>30 ${THMF[8]} ${be(fy)}</b></div><div><span>ระยะเวลารวม</span><b>12 เดือน</b></div></div>`;
}
let BR={orgName:'eLeave',logo:'',contactLabel:'',contactName:'',contactPosition:'',contactPhone:''};
function contactHtml(b,cls){
  const parts=[];
  if(b.contactName) parts.push(esc(b.contactName));
  if(b.contactPosition) parts.push(esc(b.contactPosition));
  const tel=String(b.contactPhone||'').trim();
  if(tel) parts.push('โทร <a href="tel:'+esc(tel.replace(/[^0-9+]/g,''))+'">'+esc(tel)+'</a>');
  if(!parts.length) return '';
  return `<div class="${cls}"><b>${esc(b.contactLabel||'ผู้พัฒนา/ผู้ติดต่อ')}</b> ${parts.join(' · ')}</div>`;
}
const logoHtml = b => b.logo ? `<img src="${esc(b.logo)}" alt="">` : '<i>🗓</i>';
function applyBrand(b){
  BR=Object.assign(BR,b||{});
  $('#org').textContent=BR.orgName||'eLeave';
  const lg=$('#orgLogo'); if(BR.logo){ lg.src=BR.logo; lg.hidden=false; } else { lg.hidden=true; lg.removeAttribute('src'); }
  const f=$('#foot'); const h=contactHtml(BR,'foot-in'); f.innerHTML=h; f.hidden=!h;
  ORG=BR.orgName||ORG; document.title=ORG+' – eLeave';
}
async function loadBrand(){ try{ BR=Object.assign(BR,await api('publicInfo')); }catch(e){} ORG=BR.orgName||ORG; document.title=ORG+' – เข้าสู่ระบบ'; return BR; }
/** ย่อรูปโลโก้ในเบราว์เซอร์ให้เล็ก (≤ ~250KB) ก่อนอัปโหลด */
function prepLogo(file){
  return new Promise((ok,no)=>{
    if(!/^image\/(png|jpeg)$/.test(file.type)) return no(new Error('โลโก้ต้องเป็นไฟล์ PNG หรือ JPG'));
    const url=URL.createObjectURL(file), img=new Image();
    img.onerror=()=>{ URL.revokeObjectURL(url); no(new Error('อ่านรูปไม่ได้')); };
    img.onload=()=>{
      URL.revokeObjectURL(url);
      const tryMake=(max,type)=>{
        const k=Math.min(1,max/Math.max(img.width,img.height)), c=document.createElement('canvas');
        c.width=Math.max(1,Math.round(img.width*k)); c.height=Math.max(1,Math.round(img.height*k));
        const x=c.getContext('2d'); if(type==='image/jpeg'){ x.fillStyle='#fff'; x.fillRect(0,0,c.width,c.height); }
        x.drawImage(img,0,0,c.width,c.height);
        return c.toDataURL(type,0.88);
      };
      let d=tryMake(360,file.type==='image/jpeg'?'image/jpeg':'image/png');
      if(d.length>330000) d=tryMake(240,'image/jpeg');
      if(d.length>330000) return no(new Error('รูปโลโก้ใหญ่เกินไป กรุณาใช้รูปที่เล็กลง'));
      ok({mime:d.slice(5,d.indexOf(';')),data:d.split(',')[1],preview:d});
    };
    img.src=url;
  });
}
function readFile(f){
  return new Promise((ok,no)=>{
    if(!f) return ok(null);
    if(f.size>5*1024*1024) return no(new Error('ไฟล์ใหญ่เกิน 5MB'));
    const r=new FileReader();
    r.onload=()=>ok({name:f.name,mime:f.type,data:String(r.result).split(',')[1]});
    r.onerror=()=>no(new Error('อ่านไฟล์ไม่ได้'));
    r.readAsDataURL(f);
  });
}
function download(b64, mime, name){
  const bin=atob(b64), u=new Uint8Array(bin.length); for(let i=0;i<bin.length;i++) u[i]=bin.charCodeAt(i);
  const url=URL.createObjectURL(new Blob([u],{type:mime}));
  const a=document.createElement('a'); a.href=url; a.download=name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),10000);
}
function openModal(html){ closeModal(); const m=document.createElement('div'); m.className='modal'; m.id='modal'; m.innerHTML='<div>'+html+'</div>'; m.addEventListener('click',e=>{if(e.target===m)closeModal();}); document.body.appendChild(m); }
function closeModal(){ const m=$('#modal'); if(m) m.remove(); }
const photoCache={};
async function loadPhotos(root){
  for(const img of (root||document).querySelectorAll('img[data-emp]')){
    const id=img.dataset.emp;
    if(!(id in photoCache)) photoCache[id]=api('getPhoto',id).catch(()=>null);
    const u=await photoCache[id]; if(u){ img.src=u; img.style.display=''; }
  }
}
let charts=[]; function killCharts(){ charts.forEach(c=>c.destroy()); charts=[]; }
function btnBusy(b,on){ if(b) b.disabled=on; }

/* ---------- state & routing ---------- */
const S={me:null,isStaff:false,isAdmin:false,types:[],fy:0,fyNow:0,emps:null};
const PAGES=[
  {id:'dashboard',t:'ภาพรวม',staff:true,fn:pDashboard},
  {id:'stats',t:'สถิติ',fn:pStats},
  {id:'leave',t:'ลงบันทึกข้อมูล',fn:pLeave},
  {id:'history',t:'ประวัติการจำหน่าย',fn:pHistory},
  {id:'summary',t:'รายงานสรุปการจำหน่าย',staff:true,fn:pSummary},
  {id:'balance',t:'รายงานยอดคงเหลือ',staff:true,fn:pBalance},
  {id:'employees',t:'ข้อมูลพนักงาน',staff:true,fn:pEmployees},
  {id:'types',t:'ประเภทการจำหน่าย',admin:true,fn:pTypes},
  {id:'settings',t:'ตั้งค่าหน่วยงาน',admin:true,fn:pSettings}
];
function allowed(p){ return (!p.staff||S.isStaff)&&(!p.admin||S.isAdmin); }
function buildNav(cur){ $('#nav').innerHTML=PAGES.filter(allowed).map(p=>`<a class="${p.id===cur?'on':''}" data-p="${p.id}">${p.t}</a>`).join(''); }
$('#nav').addEventListener('click',e=>{ const a=e.target.closest('a[data-p]'); if(a) go(a.dataset.p); });
function go(id){ S.cur=id; route(); }
async function route(){
  const id=S.cur||(S.isStaff?'dashboard':'stats');
  const p=PAGES.find(x=>x.id===id&&allowed(x))||PAGES.find(allowed);
  buildNav(p.id); killCharts();
  $('#view').innerHTML='<div class="spin">กำลังโหลด…</div>';
  try{ await p.fn(); }catch(e){ $('#view').innerHTML=`<div class="info bad">${esc(e.message)}</div>`; }
}
async function getEmps(force){ if(!S.emps||force) S.emps=await api('listEmployees'); return S.emps; }

/* ---------- login / session ---------- */
function showOnly(id){ ['boot','login','app'].forEach(x=>{ const el=$('#'+x); if(el) el.hidden=(x!==id); }); }
let ORG='eLeave';

function pwFormHtml(){
  return `<div class="lg-field"><label for="pw_old">รหัสผ่านเดิม (หรือรหัสผ่านชั่วคราว)</label><div class="lg-input"><input id="pw_old" type="password" autocomplete="current-password"></div></div>
  <div class="lg-field"><label for="pw_new">รหัสผ่านใหม่ (อย่างน้อย 6 ตัวอักษร)</label><div class="lg-input"><input id="pw_new" type="password" autocomplete="new-password"></div></div>
  <div class="lg-field"><label for="pw_new2">ยืนยันรหัสผ่านใหม่</label><div class="lg-input"><input id="pw_new2" type="password" autocomplete="new-password"></div></div>
  <div class="lg-err" id="pw_err" role="alert"></div>`;
}
function bindPwForm(root,btn,done){
  const err=m=>{ const e=root.querySelector('#pw_err'); e.textContent=m; e.classList.toggle('on',!!m); };
  const submit=async()=>{
    err('');
    const o=root.querySelector('#pw_old').value, n=root.querySelector('#pw_new').value, n2=root.querySelector('#pw_new2').value;
    if(!o||!n) return err('กรอกรหัสผ่านให้ครบ');
    if(n.length<6) return err('รหัสผ่านใหม่ต้องยาวอย่างน้อย 6 ตัวอักษร');
    if(n!==n2) return err('รหัสผ่านใหม่ทั้งสองช่องไม่ตรงกัน');
    btn.disabled=true;
    try{ await api('changePassword',o,n); toast('เปลี่ยนรหัสผ่านเรียบร้อย'); done(); }
    catch(e){ err(e.message); btn.disabled=false; }
  };
  btn.onclick=submit;
  root.addEventListener('keydown',e=>{ if(e.key==='Enter') submit(); });
}

async function showLogin(msg){
  closeModal(); killCharts(); S.emps=null;
  showOnly('login');
  const br=await loadBrand(), org=br.orgName;
  $('#login').innerHTML=`
  <section class="lg-brand">
    <div class="lg-logo">${logoHtml(br)}<span>${esc(org)}</span></div>
    <div class="lg-hero">
      <h1>ระบบบันทึกและตรวจสอบ<br>วันลาของพนักงาน</h1>
      <p>เข้าสู่ระบบเพื่อดูยอดวันลาคงเหลือ ยื่นใบลา และติดตามสถานะได้ด้วยตัวเอง ทุกที่ ทุกอุปกรณ์</p>
      <ul class="lg-feats">
        <li><b>✓</b><span>ตรวจสอบยอดวันลาคงเหลือและวันลาสะสมทันที</span></li>
        <li><b>✓</b><span>ยื่นใบลาออนไลน์ แนบเอกสารได้</span></li>
        <li><b>✓</b><span>ดูประวัติการจำหน่ายและสถิติของตัวเอง</span></li>
      </ul>
    </div>
    <div class="lg-foot">eLeave · ระบบบริหารจัดการวันลา</div>
  </section>
  <section class="lg-side"><form class="lg-card" id="lgForm" autocomplete="on" novalidate>
    <h2>เข้าสู่ระบบ</h2>
    <p class="sub">ใช้เลขประจำตัวและรหัสผ่านที่ได้รับจากผู้ดูแลระบบ</p>
    <div class="lg-err" id="lgErr" role="alert"></div>
    <div class="lg-field"><label for="lgId">เลขประจำตัว</label><div class="lg-input"><input id="lgId" name="username" inputmode="text" autocomplete="username" autocapitalize="off" spellcheck="false" placeholder="เช่น 001" autofocus></div></div>
    <div class="lg-field"><label for="lgPw">รหัสผ่าน</label><div class="lg-input"><input id="lgPw" name="password" type="password" autocomplete="current-password" placeholder="รหัสผ่าน"><button type="button" class="eye" id="lgEye" aria-label="แสดงหรือซ่อนรหัสผ่าน">แสดง</button></div></div>
    <button class="lg-go" id="lgGo" type="submit">เข้าสู่ระบบ</button>
    <div class="lg-help">ลืมรหัสผ่านหรือเข้าสู่ระบบไม่ได้?<br>ติดต่อผู้ดูแลระบบเพื่อขอรีเซ็ตรหัสผ่าน</div>
  </form>${contactHtml(br,'lg-contact')}</section>`;
  const err=m=>{ const e=$('#lgErr'); e.textContent=m||''; e.classList.toggle('on',!!m); };
  if(msg) err(msg);
  $('#lgEye').onclick=()=>{ const i=$('#lgPw'); const show=i.type==='password'; i.type=show?'text':'password'; $('#lgEye').textContent=show?'ซ่อน':'แสดง'; };
  $('#lgForm').onsubmit=async ev=>{
    ev.preventDefault(); err('');
    const id=$('#lgId').value.trim(), pw=$('#lgPw').value;
    if(!id||!pw){ err('กรอกเลขประจำตัวและรหัสผ่าน'); return; }
    const b=$('#lgGo'); b.disabled=true; b.textContent='กำลังตรวจสอบ…';
    try{
      const r=await api('login',id,pw);
      tokSet(r.token); init();
    }catch(e){ err(e.message); $('#lgPw').value=''; $('#lgPw').focus(); b.disabled=false; b.textContent='เข้าสู่ระบบ'; }
  };
  setTimeout(()=>{ const i=$('#lgId'); if(i) i.focus(); },50);
}

/** บังคับเปลี่ยนรหัสผ่าน (เข้าครั้งแรก / หลังแอดมินรีเซ็ต) */
async function showChangePw(force){
  if(!force){
    openModal(`<h3>เปลี่ยนรหัสผ่าน</h3>${pwFormHtml()}<div style="display:flex;gap:10px"><button id="pw_go">บันทึก</button><button class="sec" type="button" data-close>ปิด</button></div>`);
    bindPwForm($('#modal'),$('#pw_go'),closeModal);
    return;
  }
  closeModal(); showOnly('login');
  const br=await loadBrand(), org=br.orgName;
  $('#login').innerHTML=`
  <section class="lg-brand"><div class="lg-logo">${logoHtml(br)}<span>${esc(org)}</span></div>
    <div class="lg-hero"><h1>ตั้งรหัสผ่านใหม่</h1><p>เพื่อความปลอดภัย กรุณาเปลี่ยนรหัสผ่านชั่วคราวเป็นรหัสผ่านของคุณเองก่อนเริ่มใช้งาน</p></div>
    <div class="lg-foot">eLeave · ระบบบริหารจัดการวันลา</div></section>
  <section class="lg-side"><div class="lg-card" id="pwCard"><h2>เปลี่ยนรหัสผ่าน</h2><p class="sub">ใช้รหัสผ่านชั่วคราวที่ได้รับเป็นรหัสผ่านเดิม</p>${pwFormHtml()}
    <button class="lg-go" id="pw_go" type="button">บันทึกและเข้าใช้งาน</button>
    <div class="lg-help"><a href="#" id="pw_out">ออกจากระบบ</a></div></div>${contactHtml(br,'lg-contact')}</section>`;
  bindPwForm($('#pwCard'),$('#pw_go'),()=>init());
  $('#pw_out').onclick=ev=>{ ev.preventDefault(); doLogout(); };
}

async function doLogout(){
  try{ await api('logout'); }catch(e){}
  tokSet(''); S.cur=null; showLogin();
}
$('#btnOut').onclick=doLogout;
$('#btnPw').onclick=()=>showChangePw(false);

async function init(){
  showOnly('boot');
  if(!apiConfigured()){ showOnly('app'); $('#nav').innerHTML=''; $('#view').innerHTML='<div class="card"><h2>ยังไม่ได้ตั้งค่าการเชื่อมต่อ</h2><p>เปิดไฟล์ <b>api-config.js</b> แล้วใส่ <b>API_URL</b> เป็น URL ของ Google Apps Script Web App (ลงท้ายด้วย <code>/exec</code>) จากนั้น Deploy ใหม่</p></div>'; return; }
  try{
    const b=await api('bootstrap');
    if(b.mustChange){ showChangePw(true); return; }
    Object.assign(S,{me:b.me,isStaff:b.isStaff,isAdmin:b.isAdmin,types:b.types,fyNow:b.fyNow,fy:b.fyNow,statuses:b.statuses,categories:b.categories||[],specialGroups:Array.isArray(b.specialGroups)?b.specialGroups:['ราชการ','ศึกษา','ราชการหน่วยสนาม'],oldBackend:!Array.isArray(b.specialGroups),emps:null,cur:null});
    applyBrand(b.brand||{orgName:b.orgName});
    $('#who').innerHTML=`${esc(b.me.Name)}<br><small>${esc(b.me.Position||'')} · ${b.isAdmin?'ผู้ดูแลระบบ':b.isStaff?'ผู้บันทึกวันลา':'พนักงาน'}</small>`;
    $('#btnOut').hidden=!b.viaToken; $('#btnPw').hidden=!b.viaToken;
    const ph=$('#myPhoto'); ph.dataset.emp=b.me.EmpID; ph.style.display='none'; loadPhotos(document.querySelector('header'));
    showOnly('app');
    route();
  }catch(e){
    if(!$('#login').hidden||/เซสชัน|เปลี่ยนรหัสผ่าน/.test(e.message)) return;   // หน้า login/เปลี่ยนรหัสถูกแสดงแล้ว
    showOnly('app'); $('#view').innerHTML=`<div class="info bad">${esc(e.message)}</div>`;
  }
}
init();

/* ---------- Dashboard ---------- */
async function pDashboard(){
  const fyHtml=`<div class="toolbar"><div><label>ปีงบประมาณ</label><select id="fy">${fyOptions(S.fy)}</select></div></div>`;
  const d=await api('getDashboard',S.fy);
  const card=(title,o,range)=>`<div class="card stat"><div class="l">${title}${range?` <span class="muted">(${range})</span>`:''}</div><div class="n">${o.total}</div>
    <div class="sub"><span class="pill warn">รออนุมัติ ${o['รออนุมัติ']}</span><span class="pill ok">อนุมัติ ${o['อนุมัติ']}</span><span class="pill bad">ไม่อนุมัติ ${o['ไม่อนุมัติ']}</span><span class="pill">ยกเลิก ${o['ยกเลิก']}</span></div></div>`;
  $('#view').innerHTML=`<h2>ภาพรวมองค์กร</h2>${fyHtml}
  <div class="grid g4">
    ${card('คำขอลาสัปดาห์นี้',d.week,fd(d.weekRange[0])+' – '+fd(d.weekRange[1]))}
    ${card('คำขอลาเดือนนี้',d.month)}
    ${card('คำขอลาทั้งปีงบประมาณ '+be(d.fy),d.year)}
    <div class="card stat"><div class="l">รออนุมัติทั้งหมด</div><div class="n">${d.pendingAll}</div><div class="sub"><span class="pill">ลาอยู่วันนี้ ${d.onLeaveToday} คน</span></div></div>
  </div>
  ${(d.special||[]).length?`<div class="card"><h3>กลุ่มพิเศษ (แยกจากการจำหน่ายทั่วไป)</h3><div class="grid g4">${d.special.map(g=>`<div class="card stat"><div class="l">${esc(g.group)}</div><div class="n">${num(g.days)}</div><div class="sub"><span class="pill">${g.requests} รายการ · วัน</span></div></div>`).join('')}</div></div>`:''}
  <div class="grid g2">
    <div class="card"><h3>สัดส่วนวันลาแยกตามแผนก</h3><canvas id="deptChart"></canvas>${Object.keys(d.byDept).length?'':'<div class="empty">ยังไม่มีข้อมูล</div>'}</div>
    <div class="card"><h3>ประวัติการอนุมัติล่าสุด</h3><div class="scroll"><table><thead><tr><th>พนักงาน</th><th>ประเภท</th><th>ช่วงวันที่</th><th>วัน</th><th>สถานะ</th></tr></thead><tbody>
    ${d.latest.map(r=>`<tr><td>${esc(r.EmpName)}</td><td>${tdot(r.TypeID,r.TypeName)}${esc(r.TypeName)}</td><td>${fd(r.StartDate)} – ${fd(r.EndDate)}</td><td>${num(r.Days)}</td><td>${statusPill(r.Status)}</td></tr>`).join('')||'<tr><td colspan="5" class="empty">ยังไม่มีรายการ</td></tr>'}
    </tbody></table></div></div>
  </div>`;
  $('#fy').onchange=e=>{S.fy=Number(e.target.value);route();};
  const labels=Object.keys(d.byDept);
  if(labels.length){
    charts.push(new Chart($('#deptChart'),{type:'doughnut',data:{labels,datasets:[{data:labels.map(k=>d.byDept[k]),backgroundColor:['#2b6cb0','#2f9e8f','#d69e2e','#c05621','#805ad5','#d53f8c','#4a5568','#38a169']}]},
      options:{plugins:{legend:{position:'bottom'},tooltip:{callbacks:{label:c=>c.label+': '+c.raw+' วัน'}}}}}));
  }
}

/* ---------- Leave form ---------- */
async function pLeave(){
  const emps=S.isStaff?(await getEmps()).filter(e=>e.Active):[];
  if(!S.types.length){
    $('#view').innerHTML='<h2>ลงบันทึกข้อมูล</h2><div class="info bad">ยังไม่มีประเภทการจำหน่ายที่เปิดใช้งาน — '+(S.isAdmin?'ไปที่เมนู <b>ประเภทการจำหน่าย</b> เพื่อเพิ่ม/เปิดใช้งาน':'กรุณาแจ้งผู้ดูแลระบบ')+'</div>';
    return;
  }
  const today=new Date().toISOString().slice(0,10);
  $('#view').innerHTML=`<h2>ลงบันทึกข้อมูล</h2>${S.isStaff?'<div class="imp-tabs"><button type="button" class="on" data-t="one">บันทึกทีละใบ</button><button type="button" data-t="imp">นำเข้าจาก Excel</button></div>':''}<div id="tab_one"><div class="card"><div class="form">
    ${S.isStaff?`<div class="full"><label>พนักงาน</label><select id="f_emp">${emps.map(e=>`<option value="${esc(e.EmpID)}" ${e.EmpID==S.me.EmpID?'selected':''}>${esc(e.EmpID)} · ${esc(e.Name)} (${esc(e.Department||'-')})</option>`).join('')}</select></div>`:`<div class="full"><label>ผู้ลา</label><input value="${esc(S.me.Name)}" disabled></div>`}
    <div><label>ประเภทการจำหน่าย</label><select id="f_type">${typeOptions(S.isStaff?emps.find(e=>e.EmpID==S.me.EmpID)||emps[0]:S.me)}</select></div>
    <div><label>วันที่เริ่มลา</label><input type="date" id="f_s" value="${today}"></div>
    <div><label>วันที่สิ้นสุด</label><input type="date" id="f_e" value="${today}"></div>
    ${S.isStaff?`<div><label>จำนวนวัน (แก้ไขได้ เช่น ลาครึ่งวัน 0.5)</label><input type="number" step="0.5" min="0" id="f_days"></div>
    <div><label>สถานะ</label><select id="f_status">${S.statuses.map(s=>`<option ${s==='อนุมัติ'?'selected':''}>${s}</option>`).join('')}</select></div>`:''}
    <div class="full" id="preview"></div>
    <div class="full"><label>เหตุผลการลา</label><textarea id="f_reason"></textarea></div>
    <div class="full"><label>ช่องทางติดต่อระหว่างลา</label><input id="f_contact" placeholder="เบอร์โทร / LINE / ที่อยู่"></div>
    <div class="full"><label>แนบเอกสาร (JPG, PNG, PDF ไม่เกิน 5MB) เช่น ใบรับรองแพทย์ หรือใบลาที่อนุมัติแล้ว</label><input type="file" id="f_file" accept=".jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf"></div>
    <div class="full"><button id="f_go">บันทึก</button></div>
  </div></div></div><div id="tab_imp" hidden></div>`;
  if(S.isStaff){
    impStyle(); let impInit=false;
    $('#view').querySelector('.imp-tabs').addEventListener('click',ev=>{
      const b=ev.target.closest('button[data-t]'); if(!b) return;
      document.querySelectorAll('.imp-tabs button').forEach(x=>x.classList.toggle('on',x===b));
      $('#tab_one').hidden=b.dataset.t!=='one'; $('#tab_imp').hidden=b.dataset.t!=='imp';
      if(b.dataset.t==='imp'&&!impInit){ impInit=true; impPanel($('#tab_imp')); }
    });
  }
  let timer; let lastCalc=0;
  const read=()=>({EmpID:S.isStaff?$('#f_emp').value:S.me.EmpID,TypeID:$('#f_type').value,StartDate:$('#f_s').value,EndDate:$('#f_e').value,Days:S.isStaff?$('#f_days').value:''});
  async function preview(){
    const p=read(); if(!p.StartDate||!p.EndDate) return;
    const my=++lastCalc;
    try{
      const r=await api('previewLeave',p); if(my!==lastCalc) return;
      if(S.isStaff && document.activeElement!==$('#f_days')) $('#f_days').value=r.days||'';
      let h='';
      if(r.balance){
        const b=r.balance;
        h=`<div class="info${r.warning?' bad':''}"><b>${esc(b.Name)}</b> · ปีงบประมาณ ${be(r.fy)}${b.Annual&&r.tenure?` · อายุราชการ ${esc(r.tenure)}`:''}<br>
        จำนวนวันทำการที่ลา: <b>${num(r.days)}</b> วัน (ไม่นับเสาร์-อาทิตย์/วันหยุด)<br>
        สิทธิ์ ${num(b.quota)}${b.carry?` + ยกมา ${num(b.carry)}`:''} = <b>${num(b.total)}</b> วัน · ใช้ไป ${num(b.used)} · คงเหลือ <b>${num(b.remaining)}</b> วัน
        → หลังลาครั้งนี้เหลือ <b>${num(r.after)}</b> วัน${b.maxTotal?` <span class="muted">(เพดานสะสม ${num(b.maxTotal)} วัน)</span>`:''}${r.warning?`<br>⚠ ${esc(r.warning)}`:''}</div>`;
      }else if(r.special) h=`<div class="info">กลุ่ม <b>${esc(r.special)}</b> · จำนวน <b>${num(r.days)}</b> วันทำการ — แยกประเภทต่างหาก ไม่หักยอดคงเหลือและไม่รวมในสรุปการจำหน่ายทั่วไป</div>`;
      else if(r.warning) h=`<div class="info bad">${esc(r.warning)}</div>`;
      $('#preview').innerHTML=h;
    }catch(e){ $('#preview').innerHTML=`<div class="info bad">${esc(e.message)}</div>`; }
  }
  const trig=()=>{clearTimeout(timer);timer=setTimeout(preview,300);};
  const curEmp=()=>S.isStaff?emps.find(e=>String(e.EmpID)===String($('#f_emp').value)):S.me;
  if($('#f_emp')) $('#f_emp').addEventListener('change',()=>{ const old=$('#f_type').value; $('#f_type').innerHTML=typeOptions(curEmp()); if([...$('#f_type').options].some(o=>o.value===old)) $('#f_type').value=old; });
  ['f_emp','f_type','f_s','f_e'].forEach(id=>{const el=$('#'+id); if(el) el.addEventListener('change',()=>{ if($('#f_days')&&id!=='f_days') $('#f_days').value=''; trig(); });});
  if($('#f_days')) $('#f_days').addEventListener('input',trig);
  $('#f_s').addEventListener('change',()=>{ if($('#f_e').value<$('#f_s').value) $('#f_e').value=$('#f_s').value; });
  preview();
  $('#f_go').onclick=async ev=>{
    const b=ev.target; btnBusy(b,true);
    try{
      const file=await readFile($('#f_file').files[0]);
      const p=Object.assign(read(),{Reason:$('#f_reason').value,Contact:$('#f_contact').value,file});
      if(S.isStaff) p.Status=$('#f_status').value;
      const r=await api('submitLeave',p);
      toast('ลงบันทึกข้อมูลเรียบร้อย ('+num(r.days)+' วัน)'); go('history');
    }catch(e){ toast(e.message,true); }
    btnBusy(b,false);
  };
}

/* ---------- นำเข้าใบลาจาก Excel / CSV (ผู้ดูแล/ผู้บันทึก) ---------- */
// ไลบรารีอ่าน .xlsx โหลดเมื่อเลือกไฟล์ Excel เท่านั้น (ปักเวอร์ชัน; CSP อนุญาต cdn.jsdelivr.net อยู่แล้วเช่นเดียวกับ Chart.js) ไฟล์ .csv ไม่ต้องใช้ไลบรารี
const XLSX_URL='https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';
const IMP_MAX=2000, IMP_TEMPLATE='eleave-import-template.xlsx';
const IMP_COLS={
  EmpID:['empid','รหัส','รหัสพนักงาน','เลขประจำตัว','เลขประจำตัวพนักงาน'],
  TypeID:['typeid','ประเภท','ประเภทการลา','ประเภทการจำหน่าย','รหัสประเภท'],
  StartDate:['startdate','วันที่เริ่ม','วันที่เริ่มลา','เริ่มลา','ตั้งแต่วันที่'],
  EndDate:['enddate','วันที่สิ้นสุด','ถึงวันที่','สิ้นสุด'],
  Days:['days','จำนวนวัน'], Status:['status','สถานะ'], Reason:['reason','เหตุผล','เหตุผลการลา'],
  Contact:['contact','ช่องทางติดต่อ','ติดต่อ'], Note:['note','หมายเหตุ']};
const IMP_REQ=['EmpID','TypeID','StartDate','EndDate'];
const impNorm=s=>String(s==null?'':s).toLowerCase().replace(/[\s_\-.*()]/g,'');
function impStyle(){
  if($('#imp-css')) return;
  const st=document.createElement('style'); st.id='imp-css';
  st.textContent=`.imp-tabs{display:flex;gap:6px;margin:0 0 12px;border-bottom:1px solid #d9e1ec}
.imp-tabs button{background:none;color:#4a5568;border:0;border-bottom:3px solid transparent;border-radius:0;padding:8px 14px;font-weight:600;cursor:pointer;box-shadow:none}
.imp-tabs button.on{color:#1f4e79;border-bottom-color:#2b6cb0}
.imp-drop{border:2px dashed #b8c7dc;border-radius:12px;padding:16px;background:#f8fafd;margin:12px 0}
.imp-sum{display:flex;flex-wrap:wrap;gap:10px;margin:12px 0}
.imp-sum div{background:#f4f7fb;border:1px solid #d9e1ec;border-radius:10px;padding:8px 14px;min-width:104px}
.imp-sum b{display:block;font-size:22px;line-height:1.3}.imp-sum span{font-size:12px;color:#5a6b80}
.imp-sum .g b{color:#2f855a}.imp-sum .w b{color:#b7791f}.imp-sum .e b{color:#c53030}
tr.imp-error td{background:#fff5f5}tr.imp-warn td{background:#fffaf0}
.imp-m{font-size:12.5px;line-height:1.45;margin-top:3px}.imp-m.e{color:#c53030}.imp-m.w{color:#975a16}.imp-m.i{color:#718096}
.imp-bar{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:10px 0}`;
  document.head.appendChild(st);
}
function loadXlsx(){
  if(window.XLSX) return Promise.resolve(window.XLSX);
  if(loadXlsx.p) return loadXlsx.p;
  return loadXlsx.p=new Promise((ok,no)=>{
    const s=document.createElement('script'); s.src=XLSX_URL; s.crossOrigin='anonymous';
    s.onload=()=>window.XLSX?ok(window.XLSX):(loadXlsx.p=null,no(new Error('โหลดตัวอ่านไฟล์ Excel ไม่สำเร็จ')));
    s.onerror=()=>{ loadXlsx.p=null; no(new Error('โหลดตัวอ่านไฟล์ Excel ไม่ได้ (ตรวจอินเทอร์เน็ต) — ลองบันทึกไฟล์เป็น CSV UTF-8 แล้วนำเข้าแทน')); };
    document.head.appendChild(s);
  });
}
function parseCsv(t){
  t=t.replace(/^﻿/,'');
  const head=t.split(/\r?\n/).slice(0,8).join('\n'), cnt=c=>head.split(c).length, d=[',',';','\t'].sort((a,b)=>cnt(b)-cnt(a))[0];   // เลือกตัวคั่นจากหลายบรรทัดแรก (เผื่อมีชื่อรายงานอยู่เหนือหัวตาราง)
  const rows=[]; let row=[],cur='',q=false;
  for(let i=0;i<t.length;i++){
    const c=t[i];
    if(q){ if(c==='"'){ if(t[i+1]==='"'){cur+='"';i++;} else q=false; } else cur+=c; }
    else if(c==='"') q=true;
    else if(c===d){ row.push(cur); cur=''; }
    else if(c==='\n'||c==='\r'){ if(c==='\r'&&t[i+1]==='\n') i++; row.push(cur); rows.push(row); row=[]; cur=''; }
    else cur+=c;
  }
  if(cur!==''||row.length){ row.push(cur); rows.push(row); }
  return rows;
}
/** ตารางดิบ (แถว×คอลัมน์) → {rows:[{row,EmpID,TypeID,...}]} หรือ null ถ้าไม่พบหัวตาราง ; row = เลขแถวใน Excel */
function impExtract(aoa){
  let hi=-1, map={};
  for(let i=0;i<Math.min(aoa.length,15)&&hi<0;i++){
    const m={};
    (aoa[i]||[]).forEach((c,j)=>{ const n=impNorm(c); if(!n) return; for(const k in IMP_COLS) if(m[k]===undefined&&IMP_COLS[k].some(a=>impNorm(a)===n)) m[k]=j; });
    if(IMP_REQ.every(k=>m[k]!==undefined)){ hi=i; map=m; }
  }
  if(hi<0) return null;
  const rows=[];
  for(let i=hi+1;i<aoa.length;i++){
    const a=aoa[i]||[], o={row:i+1}; let any=false;
    for(const k in map){ let v=a[map[k]]; if(v==null) v=''; if(typeof v==='string'){ v=v.trim(); if(k==='EmpID'&&v) v=v.split(/\s+/)[0]; } if(v!=='') any=true; o[k]=v; }
    if(any) rows.push(o);
  }
  return {rows};
}
async function impReadFile(f){
  const name=f.name.toLowerCase();
  if(f.size>8*1024*1024) throw new Error('ไฟล์ใหญ่เกิน 8MB');
  if(/\.(csv|txt)$/.test(name)){
    const buf=await f.arrayBuffer(); let t;
    try{ t=new TextDecoder('utf-8',{fatal:true}).decode(buf); }catch(e){ t=new TextDecoder('windows-874').decode(buf); }   // CSV จาก Excel ไทยแบบเก่าเป็น Windows-874
    return impExtract(parseCsv(t));
  }
  if(!/\.(xlsx|xlsm|xls)$/.test(name)) throw new Error('รองรับเฉพาะไฟล์ .xlsx หรือ .csv');
  const X=await loadXlsx(), wb=X.read(await f.arrayBuffer(),{type:'array'});
  const pref=n=>/นำเข้า|import/i.test(n)?0:1;
  for(const sn of wb.SheetNames.slice().sort((a,b)=>pref(a)-pref(b))){
    const r=impExtract(X.utils.sheet_to_json(wb.Sheets[sn],{header:1,raw:true,defval:''}));   // raw: วันที่ใน Excel มาเป็นเลขลำดับวัน (เซิร์ฟเวอร์แปลงเอง)
    if(r) return r;
  }
  return null;
}
const csvCell=v=>{ v=String(v==null?'':v); if(/^[=+\-@\t\r]/.test(v)) v="'"+v; return /[",\n\r]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v; };
function saveText(text,name,mime){
  const url=URL.createObjectURL(new Blob(['﻿'+text],{type:mime||'text/csv;charset=utf-8'}));
  const a=document.createElement('a'); a.href=url; a.download=name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(url),10000);
}
/* ---------- ไฟล์ต้นแบบพร้อมรายชื่อพนักงาน (สร้างบนเบราว์เซอร์ด้วย JSZip: ช่อง EmpID/ประเภท/สถานะเลือกจากรายการได้) ---------- */
const JSZIP_URL='https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js';
function loadJSZip(){
  if(window.JSZip) return Promise.resolve(window.JSZip);
  if(loadJSZip.p) return loadJSZip.p;
  return loadJSZip.p=new Promise((ok,no)=>{
    const s=document.createElement('script'); s.src=JSZIP_URL; s.crossOrigin='anonymous';
    s.onload=()=>window.JSZip?ok(window.JSZip):(loadJSZip.p=null,no(new Error('โหลดตัวสร้างไฟล์ Excel ไม่สำเร็จ')));
    s.onerror=()=>{ loadJSZip.p=null; no(new Error('โหลดตัวสร้างไฟล์ Excel ไม่ได้ (ตรวจอินเทอร์เน็ต) — ใช้ปุ่ม "ไฟล์ต้นแบบเปล่า" แทนได้')); };
    document.head.appendChild(s);
  });
}
function impTemplateZip(JSZip,emps,types){
  const X=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g,'');
  const col=n=>{ let s=''; for(n++;n>0;n=Math.floor((n-1)/26)) s=String.fromCharCode(65+(n-1)%26)+s; return s; };
  const cell=(r,c,v,st)=>'<c r="'+col(c)+r+'"'+(st?' s="'+st+'"':'')+' t="inlineStr"><is><t xml:space="preserve">'+X(v)+'</t></is></c>';
  const row=(r,cells)=>'<row r="'+r+'">'+cells+'</row>';
  const NS='xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"';
  const sheet=(o)=>'<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet '+NS+'><sheetViews><sheetView workbookViewId="0"'+(o.sel?' tabSelected="1"':'')+'>'+
    (o.freeze?'<pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/><selection pane="bottomLeft" activeCell="A2" sqref="A2"/>':'')+'</sheetView></sheetViews><sheetFormatPr defaultRowHeight="15"/>'+
    '<cols>'+o.cols.map((w,i)=>'<col min="'+(i+1)+'" max="'+(i+1)+'" width="'+w[0]+'" customWidth="1"'+(w[1]?' style="'+w[1]+'"':'')+'/>').join('')+'</cols>'+
    '<sheetData>'+o.rows+'</sheetData>'+(o.dv||'')+'</worksheet>';
  // ---- ข้อมูลอ้างอิง ----
  const idKey=e=>String(e.EmpID), act=emps.filter(e=>e.Active!==false).slice().sort((a,b)=>idKey(a).localeCompare(idKey(b),'th',{numeric:true}));
  const nEmp=Math.max(act.length+1,2), nTyp=Math.max(types.length+1,2), LAST=2001;
  // ---- ชีต 1: นำเข้า ----
  const heads=[['EmpID',1],['TypeID',1],['StartDate',1],['EndDate',1],['Days',2],['Status',2],['Reason',2],['Contact',2],['Note',2]];
  const s1=sheet({sel:true,freeze:true,
    cols:[[38,3],[34,0],[14,3],[14,3],[9,0],[14,0],[30,0],[18,0],[24,0]],
    rows:row(1,heads.map((h,i)=>cell(1,i,h[0],h[1])).join('')),
    dv:'<dataValidations count="3">'+
      '<dataValidation type="list" errorStyle="warning" allowBlank="1" showInputMessage="1" showErrorMessage="1" errorTitle="ไม่พบในรายชื่อ" error="ค่านี้ไม่ตรงกับรายชื่อพนักงาน (ยังพิมพ์รหัสเองได้ แต่ระบบจะตรวจอีกครั้งตอนนำเข้า)" promptTitle="EmpID" prompt="เลือกจากรายการ หรือพิมพ์เฉพาะรหัสพนักงาน" sqref="A2:A'+LAST+'"><formula1>'+X("'พนักงาน'!$E$2:$E$"+nEmp)+'</formula1></dataValidation>'+
      '<dataValidation type="list" errorStyle="warning" allowBlank="1" showInputMessage="1" showErrorMessage="1" errorTitle="ไม่พบประเภทการลา" error="ค่านี้ไม่ตรงกับรายการประเภทการลา (พิมพ์รหัสประเภทเองได้ ระบบจะตรวจอีกครั้งตอนนำเข้า)" promptTitle="TypeID" prompt="เลือกชื่อประเภทการลาจากรายการ หรือพิมพ์รหัสประเภท" sqref="B2:B'+LAST+'"><formula1>'+X("'รหัสประเภทลา'!$B$2:$B$"+nTyp)+'</formula1></dataValidation>'+
      '<dataValidation type="list" allowBlank="1" showErrorMessage="1" errorTitle="สถานะไม่ถูกต้อง" error="เลือกจากรายการ หรือเว้นว่าง (ว่าง = อนุมัติ)" sqref="F2:F'+LAST+'"><formula1>"อนุมัติ,รออนุมัติ,ไม่อนุมัติ,ยกเลิก"</formula1></dataValidation></dataValidations>'});
  // ---- ชีต 2: พนักงาน ----
  const eh=['EmpID','ชื่อ-สกุล','สังกัด','ประเภทบุคลากร','ตัวเลือกในรายการ (รหัส | ชื่อ)'];
  const s2=sheet({freeze:true,cols:[[14,3],[34,0],[26,0],[26,0],[48,0]],
    rows:row(1,eh.map((h,i)=>cell(1,i,h,i==4?2:1)).join(''))+act.map((e,k)=>row(k+2,
      cell(k+2,0,e.EmpID,3)+cell(k+2,1,e.Name,0)+cell(k+2,2,e.Department||'',0)+cell(k+2,3,e.Category||'',0)+cell(k+2,4,e.EmpID+' | '+e.Name,0))).join('')});
  // ---- ชีต 3: รหัสประเภทลา ----
  const th=['TypeID','ชื่อประเภทการลา','กลุ่ม','หมายเหตุ'];
  const s3=sheet({freeze:true,cols:[[14,3],[46,0],[24,0],[60,0]],
    rows:row(1,th.map((h,i)=>cell(1,i,h,1)).join(''))+types.map((t,k)=>row(k+2,
      cell(k+2,0,t.TypeID,3)+cell(k+2,1,t.Name,0)+cell(k+2,2,t.Group?t.Group+' (แยกต่างหาก)':'การจำหน่ายทั่วไป',0)+
      cell(k+2,3,t.Annual?'ลาพักผ่อน: ระบบเลือกรหัสตามอายุราชการของพนักงานให้เอง':'',0))).join('')});
  // ---- ชีต 4: คำอธิบาย ----
  const help=[['วิธีใช้ไฟล์นำเข้าการลา (พร้อมรายชื่อพนักงานจริง ณ วันที่ดาวน์โหลด)',''],
    ['ขั้นที่ 1','ชีต "นำเข้า": 1 แถว = 1 ใบลา (สูงสุด 2,000 แถวต่อครั้ง) แถวที่ 1 คือหัวตาราง ห้ามแก้ชื่อ'],
    ['ขั้นที่ 2','คอลัมน์ EmpID: คลิกช่อง แล้วเลือกจากรายการ (แสดง "รหัส | ชื่อ") ระบบนำเข้าใช้เฉพาะรหัสด้านหน้า หรือพิมพ์/วางเฉพาะรหัสก็ได้'],
    ['ขั้นที่ 3','คอลัมน์ TypeID: เลือกชื่อประเภทการลาจากรายการ หรือพิมพ์รหัสประเภท (ดูชีต "รหัสประเภทลา")'],
    ['ขั้นที่ 4','StartDate / EndDate: พิมพ์แบบ 15/01/2569 (พ.ศ. หรือ ค.ศ. ก็ได้) · Days ว่าง = ระบบนับวันทำการให้ · Status ว่าง = อนุมัติ'],
    ['ขั้นที่ 5','เข้าเว็บ eLeave เมนู "ลงบันทึกข้อมูล" แท็บ "นำเข้าจาก Excel" แล้วเลือกไฟล์นี้ ระบบตรวจให้ก่อน ยังไม่บันทึกจนกว่าจะกด "ยืนยันนำเข้า"'],
    ['หมายเหตุ','รายชื่อในชีต "พนักงาน" เป็นภาพ ณ วันที่ดาวน์โหลด ถ้ามีพนักงานใหม่ให้ดาวน์โหลดไฟล์ต้นแบบใหม่ · แก้/ลบชีตอื่นไม่ได้ ถ้าลบชีต "พนักงาน" หรือ "รหัสประเภทลา" รายการเลือกจะใช้ไม่ได้']];
  const s4=sheet({cols:[[14,0],[120,4]],rows:help.map((h,k)=>row(k+1,cell(k+1,0,h[0],k?2:0)+(h[1]?cell(k+1,1,h[1],4):''))).join('')});
  const styles='<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet '+NS+'>'+
    '<fonts count="3"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font><font><b/><sz val="11"/><color rgb="FF1F3A5F"/><name val="Calibri"/></font></fonts>'+
    '<fills count="4"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF1F4E79"/><bgColor indexed="64"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFBDD7EE"/><bgColor indexed="64"/></patternFill></fill></fills>'+
    '<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>'+
    '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>'+
    '<cellXfs count="5"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>'+
    '<xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/>'+
    '<xf numFmtId="0" fontId="2" fillId="3" borderId="0" xfId="0" applyFont="1" applyFill="1"/>'+
    '<xf numFmtId="49" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>'+
    '<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf></cellXfs>'+
    '<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>';
  const names=['นำเข้า','พนักงาน','รหัสประเภทลา','คำอธิบาย'], sheets=[s1,s2,s3,s4];
  const R='http://schemas.openxmlformats.org/officeDocument/2006/relationships';
  const z=new JSZip();
  z.file('[Content_Types].xml','<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>'+
    sheets.map((_,i)=>'<Override PartName="/xl/worksheets/sheet'+(i+1)+'.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>').join('')+
    '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>');
  z.file('_rels/.rels','<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="'+R+'/officeDocument" Target="xl/workbook.xml"/></Relationships>');
  z.file('xl/workbook.xml','<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook '+NS+' xmlns:r="'+R+'"><bookViews><workbookView activeTab="0"/></bookViews><sheets>'+
    names.map((n,i)=>'<sheet name="'+X(n)+'" sheetId="'+(i+1)+'" r:id="rId'+(i+1)+'"/>').join('')+'</sheets></workbook>');
  z.file('xl/_rels/workbook.xml.rels','<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'+
    sheets.map((_,i)=>'<Relationship Id="rId'+(i+1)+'" Type="'+R+'/worksheet" Target="worksheets/sheet'+(i+1)+'.xml"/>').join('')+
    '<Relationship Id="rId'+(sheets.length+1)+'" Type="'+R+'/styles" Target="styles.xml"/></Relationships>');
  z.file('xl/styles.xml',styles);
  sheets.forEach((s,i)=>z.file('xl/worksheets/sheet'+(i+1)+'.xml',s));
  return z;
}

function impPanel(box){
  const typeRows=S.types.map(t=>`<tr><td><b>${esc(t.TypeID)}</b></td><td>${esc(t.Name)}</td><td>${esc(t.Group?t.Group+' (แยกต่างหาก)':'การจำหน่ายทั่วไป')}</td></tr>`).join('');
  box.innerHTML=`<div class="card">
    <h3 style="margin-top:0">นำเข้าข้อมูลการลาจาก Excel / CSV</h3>
    <div class="info">1 แถว = 1 ใบลา · คอลัมน์ที่ต้องมี: <b>EmpID, TypeID, StartDate, EndDate</b> · ไม่บังคับ: Days, Status, Reason, Contact, Note<br>
    วันที่ใช้ พ.ศ. หรือ ค.ศ. ก็ได้ (เช่น 15/01/2569) · <b>Days</b> ว่าง = ระบบนับวันทำการให้ (ไม่นับเสาร์-อาทิตย์/วันหยุด) · <b>Status</b> ว่าง = <b>อนุมัติ</b><br>
    ระบบตรวจก่อนบันทึกทุกครั้ง: แถวที่ไม่ผ่านจะไม่ถูกนำเข้า · เกินสิทธิ์วันลา = <b>เตือนแต่ยังนำเข้า</b> · ไม่ส่งแจ้งเตือนอีเมล/LINE/Telegram<br>
    ยอดวันลาที่ใช้ไปก่อนเริ่มใช้ระบบ (ไม่มีวันที่) ไม่ต้องนำเข้า — กรอกที่เมนู <b>ข้อมูลพนักงาน</b></div>
    <div class="imp-bar"><button type="button" class="sm" id="im_tpl2">ดาวน์โหลดไฟล์ต้นแบบพร้อมรายชื่อพนักงาน (เลือกจากรายการ)</button> <button type="button" class="sec sm" id="im_tpl">ไฟล์ต้นแบบเปล่า (.xlsx)</button></div>
    <details><summary class="muted" style="cursor:pointer">รหัสประเภทการลาที่ใช้ในคอลัมน์ TypeID (${S.types.length} รายการ)</summary>
      <div class="scroll"><table><thead><tr><th>TypeID</th><th>ชื่อ</th><th>กลุ่ม</th></tr></thead><tbody>${typeRows}</tbody></table></div>
      <div class="muted" style="font-size:12.5px;margin-top:6px">ใส่ชื่อประเภทแทนรหัสก็ได้ · ลาพักผ่อน: ใส่รหัสใดก็ได้ ระบบเลือกรหัสตามอายุราชการของพนักงานให้เอง</div></details>
    <div class="imp-drop"><label>เลือกไฟล์ (.xlsx หรือ .csv ไม่เกิน ${IMP_MAX} แถว)</label><input type="file" id="im_file" accept=".xlsx,.xls,.xlsm,.csv,.txt"></div>
    <div id="im_out"></div></div>`;
  const out=box.querySelector('#im_out'); let rows=null, fname='';
  box.querySelector('#im_tpl').onclick=async ev=>{
    btnBusy(ev.target,true);
    try{
      const r=await fetch(IMP_TEMPLATE,{cache:'no-cache'});
      if(!r.ok||/text\/html/.test(r.headers.get('content-type')||'')) throw new Error('ไม่พบไฟล์ต้นแบบบนเว็บ — วางไฟล์ '+IMP_TEMPLATE+' ไว้โฟลเดอร์เดียวกับ index.html แล้ว Deploy ใหม่');
      const url=URL.createObjectURL(await r.blob()), a=document.createElement('a'); a.href=url; a.download=IMP_TEMPLATE; document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(url),10000);
    }catch(e){ toast(e.message,true); }
    btnBusy(ev.target,false);
  };
  box.querySelector('#im_tpl2').onclick=async ev=>{
    btnBusy(ev.target,true);
    try{
      const [Z,emps]=await Promise.all([loadJSZip(),api('listEmployees')]);
      const blob=await impTemplateZip(Z,emps,S.types).generateAsync({type:'blob',mimeType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',compression:'DEFLATE'});
      const url=URL.createObjectURL(blob), a=document.createElement('a'); a.href=url; a.download='eleave-import-with-employees.xlsx'; document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(url),10000);
      toast('ดาวน์โหลดแล้ว: ชีต "นำเข้า" เลือก EmpID/ประเภท/สถานะจากรายการได้');
    }catch(e){ toast(e.message,true); }
    btnBusy(ev.target,false);
  };
  const bad=m=>{ out.innerHTML=`<div class="info bad">${esc(m)}</div>`; };
  box.querySelector('#im_file').addEventListener('change',async ev=>{
    const f=ev.target.files[0]; rows=null; if(!f){ out.innerHTML=''; return; }
    fname=f.name; out.innerHTML='<div class="spin">กำลังอ่านไฟล์…</div>';
    try{
      const r=await impReadFile(f);
      if(!r) return bad('ไม่พบหัวตารางที่ต้องมี ('+IMP_REQ.join(', ')+') — ใช้ไฟล์ต้นแบบ หรือตรวจชื่อหัวคอลัมน์ให้ตรง');
      if(!r.rows.length) return bad('ไม่พบแถวข้อมูลใต้หัวตาราง');
      if(r.rows.length>IMP_MAX) return bad('ไฟล์มี '+r.rows.length+' แถว นำเข้าได้ครั้งละไม่เกิน '+IMP_MAX+' แถว กรุณาแบ่งไฟล์');
      rows=r.rows; out.innerHTML='<div class="spin">กำลังตรวจสอบ '+rows.length+' แถว…</div>';
      show(await api('importLeaves',{rows,dryRun:true,fileName:fname}),false);
    }catch(e){ bad(e.message); }
  });
  function msgs(r){
    return r.errors.map(m=>`<div class="imp-m e">✕ ${esc(m)}</div>`).join('')+r.warnings.map(m=>`<div class="imp-m w">⚠ ${esc(m)}</div>`).join('')+r.info.map(m=>`<div class="imp-m i">${esc(m)}</div>`).join('');
  }
  function show(d,done){
    const s=d.summary, res=d.results;
    const pill=r=>done?(r.level==='error'?'<span class="pill bad">ข้าม</span>':`<span class="pill ok">นำเข้าแล้ว</span>${r.id?`<div class="imp-m i">${esc(r.id)}</div>`:''}`)
      :(r.level==='error'?'<span class="pill bad">ไม่ผ่าน</span>':r.level==='warn'?'<span class="pill warn">ผ่าน (มีคำเตือน)</span>':'<span class="pill ok">ผ่าน</span>');
    const line=r=>`<tr class="imp-${r.level}" data-l="${r.level}"><td class="r">${r.row}</td><td>${esc(r.emp||'-')}</td><td>${esc(r.type||'-')}</td><td>${r.start?fd(r.start)+(r.start===r.end?'':' – '+fd(r.end)):'-'}</td><td class="r">${r.days?num(r.days):'-'}</td><td>${r.status?statusPill(r.status):'-'}</td><td>${pill(r)}${msgs(r)}</td></tr>`;
    out.innerHTML=`${done?`<div class="info"><b>นำเข้าสำเร็จ ${s.written} รายการ</b> (${s.people} คน · ${num(s.days)} วัน) · รหัสใบลาขึ้นต้นด้วย <b>LVI</b> (${esc(d.firstId)} – ${esc(d.lastId)})${s.error?`<br>แถวที่ไม่ผ่าน ${s.error} แถวไม่ได้ถูกนำเข้า — แก้ในไฟล์แล้วนำเข้าเฉพาะแถวเหล่านั้นอีกครั้งได้`:''}</div>`:''}
      <div class="imp-sum"><div><b>${s.total}</b><span>แถวทั้งหมด</span></div><div class="g"><b>${s.ok}</b><span>ผ่าน</span></div><div class="w"><b>${s.warn}</b><span>ผ่านแต่มีคำเตือน</span></div><div class="e"><b>${s.error}</b><span>ไม่ผ่าน</span></div>
      <div><b>${s.people}</b><span>คน (ที่นำเข้าได้)</span></div><div><b>${num(s.days)}</b><span>วัน (ที่นำเข้าได้)</span></div></div>
      <div class="imp-bar">${done?`<button type="button" id="im_hist">ไปที่ประวัติการจำหน่าย</button><button type="button" class="sec" id="im_again">นำเข้าไฟล์อื่น</button>`
        :`<button type="button" id="im_go" ${s.importable?'':'disabled'}>ยืนยันนำเข้า ${s.importable} รายการ</button>`}
        <button type="button" class="sec" id="im_csv">ดาวน์โหลดผลตรวจ (CSV)</button>
        <select id="im_filter"><option value="">แสดงทั้งหมด</option><option value="issue">เฉพาะแถวที่มีปัญหา</option><option value="error">เฉพาะที่ไม่ผ่าน</option></select></div>
      ${!done&&s.error?`<div class="info bad">มี ${s.error} แถวที่ไม่ผ่าน จะถูกข้ามและไม่นำเข้า ที่เหลือนำเข้าได้ตามปกติ</div>`:''}
      ${!done&&s.warn?`<div class="info">คำเตือน (เช่น เกินสิทธิ์วันลา) ไม่ขวางการนำเข้า — ตรวจให้แน่ใจก่อนกดยืนยัน</div>`:''}
      <div class="scroll"><table><thead><tr><th class="r">แถว</th><th>พนักงาน</th><th>ประเภท</th><th>ช่วงวันที่</th><th class="r">วัน</th><th>สถานะ</th><th>ผลตรวจ</th></tr></thead><tbody id="im_body">${res.map(line).join('')}</tbody></table></div>`;
    out.querySelector('#im_filter').onchange=e=>{
      const v=e.target.value; out.querySelectorAll('#im_body tr').forEach(tr=>{ const l=tr.dataset.l; tr.hidden=v==='error'?l!=='error':v==='issue'?l==='ok':false; });
    };
    out.querySelector('#im_csv').onclick=()=>{
      const head=['แถวในไฟล์','ผล','พนักงาน','ประเภท','วันที่เริ่ม','วันที่สิ้นสุด','วัน','สถานะ','ข้อผิดพลาด','คำเตือน','รหัสใบลา'];
      const lv={ok:'ผ่าน',warn:'ผ่าน (มีคำเตือน)',error:'ไม่ผ่าน'};
      saveText([head].concat(res.map(r=>[r.row,done&&r.level!=='error'?'นำเข้าแล้ว':lv[r.level],r.emp,r.type,r.start,r.end,r.days||'',r.status,r.errors.join(' | '),r.warnings.join(' | '),r.id])).map(r=>r.map(csvCell).join(',')).join('\r\n'),'ผลนำเข้าการลา_'+new Date().toISOString().slice(0,10)+'.csv');
    };
    if(done){
      out.querySelector('#im_hist').onclick=()=>go('history');
      out.querySelector('#im_again').onclick=()=>{ out.innerHTML=''; box.querySelector('#im_file').value=''; rows=null; };
      return;
    }
    const go1=out.querySelector('#im_go');
    go1.onclick=async()=>{
      if(!rows||!confirm('ยืนยันนำเข้า '+s.importable+' รายการ'+(s.warn?' (มีคำเตือน '+s.warn+' รายการ)':'')+'?\n\nเมื่อนำเข้าแล้ว หากต้องการแก้ไขต้องเปลี่ยนสถานะเป็น "ยกเลิก" หรือลบแถวในชีต LeaveRequests ทีละรายการ')) return;
      btnBusy(go1,true); go1.textContent='กำลังนำเข้า…';
      try{ const r=await api('importLeaves',{rows,dryRun:false,fileName:fname}); rows=null; S.emps=null; toast('นำเข้า '+r.summary.written+' รายการเรียบร้อย'); show(r,true); }
      catch(e){ btnBusy(go1,false); go1.textContent='ยืนยันนำเข้า '+s.importable+' รายการ'; toast(e.message+(/นานเกินไป|เชื่อมต่อ/.test(e.message)?' — ตรวจ "ประวัติการจำหน่าย" ก่อนลองใหม่ เพราะรายการอาจถูกบันทึกไปแล้ว':''),true); }
    };
  }
}

/* ---------- History ---------- */
async function pHistory(){
  const emps=S.isStaff?await getEmps():[];
  $('#view').innerHTML=`<h2>ประวัติการจำหน่าย</h2><div class="toolbar">
    <div><label>ปีงบประมาณ</label><select id="h_fy">${fyOptions(S.fy)}</select></div>
    <div><label>สถานะ</label><select id="h_st"><option value="">ทั้งหมด</option>${S.statuses.map(s=>`<option>${s}</option>`).join('')}</select></div>
    ${S.isStaff?`<div><label>พนักงาน</label><select id="h_emp"><option value="">ทั้งหมด</option>${emps.map(e=>`<option value="${esc(e.EmpID)}">${esc(e.Name)}</option>`).join('')}</select></div>`:''}
    </div><div class="card scroll" id="h_tbl"><div class="spin">กำลังโหลด…</div></div>`;
  async function load(){
    S.fy=Number($('#h_fy').value);
    const rows=await api('listRequests',{fy:S.fy,status:$('#h_st').value,empId:S.isStaff?$('#h_emp').value:''});
    $('#h_tbl').innerHTML=`<table><thead><tr><th>วันที่บันทึก</th>${S.isStaff?'<th>พนักงาน</th>':''}<th>ประเภท</th><th>ช่วงวันที่</th><th>วัน</th><th>เหตุผล</th><th>สถานะ</th><th>เอกสาร</th><th></th></tr></thead><tbody>
    ${rows.map(r=>`<tr><td>${fdt(r.CreatedAt)}</td>${S.isStaff?`<td>${esc(r.EmpName)}<br><small class="muted">${esc(r.Department||'')}</small></td>`:''}
      <td>${tdot(r.TypeID,r.TypeName)}${esc(r.TypeName)}</td><td>${fd(r.StartDate)} – ${fd(r.EndDate)}</td><td>${num(r.Days)}</td>
      <td>${esc(r.Reason||'')}${r.Note?`<br><small class="muted">หมายเหตุ: ${esc(r.Note)}</small>`:''}</td>
      <td>${S.isStaff?`<select data-st="${esc(r.RequestID)}">${S.statuses.map(s=>`<option ${s===r.Status?'selected':''}>${s}</option>`).join('')}</select>`:statusPill(r.Status)}</td>
      <td>${r.HasDoc?`<button class="sm sec" data-doc="${esc(r.RequestID)}">ดาวน์โหลด</button>`:'<span class="muted">-</span>'}
        ${S.isStaff?`<button class="sm sec" data-att="${esc(r.RequestID)}">${r.HasDoc?'เปลี่ยน':'แนบ'}</button>`:''}</td>
      <td>${!S.isStaff&&r.mine&&r.Status==='รออนุมัติ'?`<button class="sm sec" data-cancel="${esc(r.RequestID)}">ยกเลิก</button>`:''}</td></tr>`).join('')||`<tr><td colspan="9" class="empty">ไม่พบรายการ</td></tr>`}
    </tbody></table>`;
    enableSelect($('#h_tbl'),rows,'req',{file:'leave_history_selected',title:'ประวัติการจำหน่าย'});
    $('#h_tbl').querySelectorAll('[data-st]').forEach(sel=>sel.onchange=async()=>{
      const note=sel.value==='ไม่อนุมัติ'?prompt('เหตุผลที่ไม่อนุมัติ (ไม่บังคับ)')||'':'';
      sel.disabled=true;
      try{ await api('updateStatus',sel.dataset.st,sel.value,note); toast('อัปเดตสถานะแล้ว'); }catch(e){ toast(e.message,true); }
      load();
    });
    $('#h_tbl').querySelectorAll('[data-doc]').forEach(b=>b.onclick=async()=>{
      btnBusy(b,true); try{ const f=await api('getAttachment',b.dataset.doc); download(f.data,f.mime,f.name); }catch(e){ toast(e.message,true); } btnBusy(b,false);
    });
    $('#h_tbl').querySelectorAll('[data-att]').forEach(b=>b.onclick=()=>{
      const inp=document.createElement('input'); inp.type='file'; inp.accept='.jpg,.jpeg,.png,.pdf';
      inp.onchange=async()=>{ btnBusy(b,true); try{ const f=await readFile(inp.files[0]); await api('attachDoc',b.dataset.att,f); toast('แนบเอกสารแล้ว'); load(); }catch(e){ toast(e.message,true); btnBusy(b,false);} };
      inp.click();
    });
    $('#h_tbl').querySelectorAll('[data-cancel]').forEach(b=>b.onclick=async()=>{
      if(!confirm('ยืนยันยกเลิกคำขอลานี้?')) return;
      try{ await api('updateStatus',b.dataset.cancel,'ยกเลิก',''); toast('ยกเลิกแล้ว'); load(); }catch(e){ toast(e.message,true); }
    });
  }
  ['h_fy','h_st','h_emp'].forEach(id=>{const el=$('#'+id); if(el) el.onchange=load;});
  load();
}

/* ---------- Balance report ---------- */
async function pBalance(){
  const emps=await getEmps();
  const depts=[...new Set(emps.map(e=>e.Department).filter(Boolean))];
  $('#view').innerHTML=`<h2>รายงานยอดวันลาคงเหลือ</h2><div class="toolbar">
    <div><label>ปีงบประมาณ</label><select id="b_fy">${fyOptions(S.fy)}</select></div>
    <div><label>แผนก</label><select id="b_dept"><option value="">ทั้งหมด</option>${depts.map(d=>`<option>${esc(d)}</option>`).join('')}</select></div>
    <div><label>ประเภทบุคลากร</label><select id="b_cat"><option value="">ทั้งหมด</option>${(S.categories||[]).concat(['ไม่ระบุ']).map(c=>`<option>${esc(c)}</option>`).join('')}</select></div>
    <div><label>พนักงาน</label><select id="b_emp"><option value="">ทั้งหมด</option>${emps.filter(e=>e.Active).map(e=>`<option value="${esc(e.EmpID)}">${esc(e.Name)}</option>`).join('')}</select></div>
    <div><label>ประเภทการจำหน่าย</label><select id="b_type"><option value="">ทั้งหมด</option>${generalTypes().map(t=>`<option value="${esc(t.TypeID)}">${esc(t.Name)}</option>`).join('')}</select></div>
    <div style="min-width:auto"><button class="sec" id="b_csv">ส่งออก CSV</button></div>
    </div><div class="card scroll" id="b_tbl"><div class="spin">กำลังโหลด…</div></div>`;
  let data=[];
  async function load(){
    S.fy=Number($('#b_fy').value);
    $('#b_tbl').innerHTML='<div class="spin">กำลังโหลด…</div>';
    const r=await api('getBalanceReport',{fy:S.fy,dept:$('#b_dept').value,category:$('#b_cat').value,empId:$('#b_emp').value,typeId:$('#b_type').value});
    data=r.rows;
    $('#b_tbl').innerHTML=`<table><thead><tr><th>รหัส</th><th>พนักงาน</th><th>แผนก</th><th>ประเภทบุคลากร</th><th>อายุราชการ</th><th>ประเภท</th><th>สิทธิ์ปีนี้</th><th>ยกมา</th><th>รวมสิทธิ์</th><th>เพดานสะสม</th><th>ใช้ไป</th><th>คงเหลือ</th></tr></thead><tbody>
    ${data.map(x=>`<tr class="${x.remaining<0?'neg':''}"><td>${esc(x.EmpID)}</td><td>${esc(x.Name)}</td><td>${esc(x.Department||'')}</td><td>${esc(x.Category||'')}</td><td>${esc(x.maxTotal?x.Tenure||'':'')}</td><td>${esc(x.Type)}</td><td>${num(x.quota)}</td><td>${num(x.carry)}</td><td>${num(x.total)}</td><td>${x.maxTotal?num(x.maxTotal):''}</td><td>${num(x.used)}</td><td>${num(x.remaining)}</td></tr>`).join('')||'<tr><td colspan="12" class="empty">ไม่พบข้อมูล</td></tr>'}
    </tbody></table>`;
  }
  ['b_fy','b_dept','b_cat','b_emp','b_type'].forEach(id=>$('#'+id).onchange=()=>load().catch(e=>toast(e.message,true)));
  $('#b_csv').onclick=()=>{
    const head=['รหัส','พนักงาน','แผนก','ประเภทบุคลากร','อายุราชการ','ประเภท','สิทธิ์ปีนี้','ยกมา','รวมสิทธิ์','เพดานสะสม','ใช้ไป','คงเหลือ'];
    const q=v=>'"'+String(v==null?'':v).replace(/"/g,'""')+'"';
    const csv='﻿'+[head].concat(data.map(x=>[x.EmpID,x.Name,x.Department,x.Category,x.maxTotal?x.Tenure:'',x.Type,x.quota,x.carry,x.total,x.maxTotal||'',x.used,x.remaining])).map(r=>r.map(q).join(',')).join('\n');
    download(btoa(unescape(encodeURIComponent(csv))),'text/csv','balance_'+be(S.fy)+'.csv');
  };
  await load();
}

/* ---------- Statistics ---------- */
/* ---------- สีประเภทการจำหน่าย ---------- */
const TC={annual:'#2b6cb0',personal:'#dd6b20',sick:'#e53e3e',maternity:'#d53f8c',ordination:'#805ad5',official:'#319795',study:'#d69e2e',field:'#38a169'};
const TXTRA=['#8b5e34','#0ea5e9','#6b7280','#a3a322','#be185d','#0f766e'];
const TID={ANNUAL:'annual',PERSONAL:'personal',SICK:'sick',MATERNITY:'maternity',ORDINATION:'ordination',OFFICIAL:'official',STUDY:'study',FIELD:'field'};
const TNAME={};
const TRULES=[[/หน่วยสนาม/,'field'],[/ศึกษา|อบรม|ดูงาน/,'study'],[/พักผ่อน/,'annual'],[/กิจ/,'personal'],[/ป่วย/,'sick'],[/คลอด/,'maternity'],[/บวช|อุปสมบท/,'ordination'],[/ราชการ/,'official']];
/* กลุ่มพิเศษ (ราชการ/ศึกษา/ราชการหน่วยสนาม): แยกจากการจำหน่ายทั่วไป ไม่รวมในสรุป/ยอดคงเหลือ */
const generalTypes=()=>S.types.filter(t=>!t.Group);
function typeOptions(emp){
  const opt=t=>`<option value="${esc(t.TypeID)}">${esc(t.Name)}</option>`;
  // ลาพักผ่อนมีหลายรหัสตามอายุราชการ: แสดงเฉพาะรหัสที่ตรงกับอายุราชการของพนักงานคนนั้น
  const gen=generalTypes().filter(t=>!(t.Annual&&emp&&emp.AnnualTypeId&&t.TypeID!==emp.AnnualTypeId)), sp=(S.specialGroups||[]).map(g=>[g,S.types.filter(t=>t.Group===g)]).filter(x=>x[1].length);
  if(!sp.length) return gen.map(opt).join('');
  return (gen.length?`<optgroup label="การจำหน่ายทั่วไป">${gen.map(opt).join('')}</optgroup>`:'')+sp.map(x=>`<optgroup label="${esc(x[0])} (แยกต่างหาก)">${x[1].map(opt).join('')}</optgroup>`).join('');
}
/* การ์ดผู้ดูแล: ลิงก์แดชบอร์ดสรุปยอดประจำวัน (สาธารณะ) ที่หน้ารายงานสรุปรายวัน */
async function pubAdminCard(box){
  const draw=(st)=>{
    const url=location.origin+location.pathname.replace(/[^/]*$/,'')+'public.html?k='+st.key, embed='<iframe src="'+url+'&embed=1" width="100%" height="900" style="border:0" loading="lazy" title="สรุปยอดกำลังพลประจำวัน"></iframe>';
    const sn=st.snapshot;
    box.innerHTML=`<h3>ลิงก์แดชบอร์ดสรุปยอดประจำวัน (สาธารณะ)</h3>
      <div class="muted" style="margin:-4px 0 10px">หน้าอ่านอย่างเดียวสำหรับแปะบนเว็บไซต์ แสดงยอดกำลังพลของวันนี้ที่สรุปไว้ทุกเช้าราว 06:00 น. ไม่ต้องเข้าสู่ระบบ</div>
      <div class="toolbar" style="margin-bottom:8px">
        <label style="display:flex;gap:8px;align-items:center;margin:0"><input type="checkbox" id="pb_on" style="width:auto" ${st.enabled?'checked':''}> <b>เปิดเผยลิงก์สาธารณะ</b></label>
        <span class="pill ${st.enabled?'ok':'warn'}">${st.enabled?'เปิดอยู่ — ใครมีลิงก์ก็ดูได้':'ปิดอยู่ — ลิงก์ยังเปิดไม่ได้'}</span>
      </div>
      <div class="full" style="margin-bottom:8px"><label>ลิงก์</label><div style="display:flex;gap:8px;flex-wrap:wrap"><input id="pb_url" value="${esc(url)}" readonly style="flex:1;min-width:240px"><button type="button" class="sm" data-copy="${esc(url)}">คัดลอก</button><a href="${esc(url)}" target="_blank" rel="noopener"><button type="button" class="sm sec">เปิดดู</button></a></div></div>
      <div class="full" style="margin-bottom:8px"><label>โค้ดฝังในเว็บไซต์ (iframe)</label><div style="display:flex;gap:8px;flex-wrap:wrap"><input value="${esc(embed)}" readonly style="flex:1;min-width:240px"><button type="button" class="sm" data-copy="${esc(embed)}">คัดลอก</button></div></div>
      <label style="display:flex;gap:8px;align-items:flex-start;margin:10px 0"><input type="checkbox" id="pb_names" style="width:auto;margin-top:4px" ${st.showNames?'checked':''}><span>แสดงรายชื่อผู้ที่ไม่อยู่ปฏิบัติงานในหน้าสาธารณะ<br><small class="muted">ค่าเริ่มต้น = ปิด (แสดงเฉพาะยอดรวม) ไม่แสดงเหตุผลการลา/เบอร์ติดต่อ แนะนำให้ปิดไว้เพื่อความเป็นส่วนตัวของกำลังพล</small></span></label>
      <div class="muted" style="font-size:13px;margin-bottom:10px">${sn?`ภาพนิ่งล่าสุด: ${fd(sn.date)} เวลา ${esc(String(sn.generatedAt).slice(11,16))} น. · ไม่อยู่ปฏิบัติงาน ${num(sn.away)} จาก ${num(sn.total)} คน`:'ยังไม่มีภาพนิ่ง'}
        <br>ตั้งเวลาอัตโนมัติ 06:00 น.: ${st.trigger===true?'<span class="pill ok">ติดตั้งแล้ว</span>':st.trigger===false?'<span class="pill warn">ยังไม่ได้ติดตั้ง</span> — ใน Apps Script เลือกฟังก์ชัน <b>installPublicTrigger</b> แล้วกด Run หนึ่งครั้ง (ระหว่างนี้ระบบสร้างข้อมูลให้เองเมื่อมีคนเปิดลิงก์ครั้งแรกหลัง 06:00 น.)':'<span class="muted">ตรวจสอบไม่ได้ (ต้อง Deploy appsscript.json ที่มีสิทธิ์ scriptapp แล้วรัน installPublicTrigger)</span>'}</div>
      <div style="display:flex;gap:8px;flex-wrap:wrap"><button type="button" class="sm" id="pb_refresh">อัปเดตข้อมูลตอนนี้</button><button type="button" class="sm sec" id="pb_rotate">เปลี่ยนรหัสลิงก์ (ลิงก์เดิมใช้ไม่ได้)</button></div>`;
    const save=async(p,msg)=>{ try{ draw(await api('savePublicAdmin',p)); toast(msg||'บันทึกแล้ว'); }catch(e){ toast(e.message,true); } };
    $('#pb_on').onchange=e=>save({enabled:e.target.checked},e.target.checked?'เปิดเผยลิงก์แล้ว':'ปิดลิงก์แล้ว');
    $('#pb_names').onchange=e=>{ if(e.target.checked&&!confirm('ยืนยันแสดงรายชื่อผู้ที่ไม่อยู่ปฏิบัติงานให้ทุกคนที่มีลิงก์เห็นหรือไม่?')){ e.target.checked=false; return; } save({showNames:e.target.checked}); };
    $('#pb_refresh').onclick=()=>save({},'อัปเดตข้อมูลแล้ว');
    $('#pb_rotate').onclick=()=>{ if(confirm('เปลี่ยนรหัสลิงก์? ลิงก์เดิมที่แปะไว้จะใช้ไม่ได้ ต้องนำลิงก์ใหม่ไปแปะแทน')) save({rotate:true},'เปลี่ยนรหัสลิงก์แล้ว'); };
  };
  try{ draw(await api('getPublicAdmin')); }catch(e){ box.innerHTML='<div class="info bad">'+esc(e.message)+'</div>'; }
}
/* การ์ดสรุปกลุ่มพิเศษ ใช้ในรายงานสรุป (r.special = [{group,requests,people,days,rows}]) */
function specialHtml(r,showRows){
  const sp=r.special||[]; if(!sp.length) return '';
  const rows=sp.reduce((a,g)=>a.concat((g.rows||[]).map(x=>Object.assign({},x,{_g:g.group}))),[]);
  return `<div class="card"><h3>กลุ่มพิเศษ (แยกจากการจำหน่ายทั่วไป — ไม่รวมในตัวเลขสรุปด้านบน)</h3>
    <div class="scroll"><table><thead><tr><th>กลุ่ม</th><th class="r">รายการ</th><th class="r">คน</th><th class="r">วัน</th></tr></thead><tbody>
    ${sp.map(g=>`<tr><td><b>${esc(g.group)}</b></td><td class="r">${g.requests}</td><td class="r">${g.people}</td><td class="r"><b>${num(g.days)}</b></td></tr>`).join('')}</tbody></table></div>
    ${showRows&&rows.length?`<div class="scroll" style="margin-top:12px"><table><thead><tr><th>กลุ่ม</th><th>พนักงาน</th><th>แผนก</th><th>ประเภทบุคลากร</th><th>ช่วงวันที่</th><th class="r">วัน</th><th>สถานะ</th></tr></thead><tbody>
    ${rows.slice(0,200).map(x=>`<tr><td>${esc(x._g)}</td><td>${esc(x.Name)}</td><td>${esc(x.Department)}</td><td>${esc(x.Category||'')}</td><td>${fd(x.StartDate)}${x.StartDate===x.EndDate?'':' – '+fd(x.EndDate)}</td><td class="r">${num(x.Days)}</td><td>${statusPill(x.Status)}</td></tr>`).join('')}</tbody></table></div>`:''}</div>`;
}
function typeColor(id,name){
  id=String(id||'').toUpperCase(); if(name) TNAME[id]=name; name=TNAME[id]||'';
  if(TID[id]) return TC[TID[id]];
  for(const [re,k] of TRULES) if(re.test(name)) return TC[k];
  let h=0; for(const ch of id) h=(h*31+ch.charCodeAt(0))>>>0; return TXTRA[h%TXTRA.length];
}
const tdot=(id,name)=>`<i class="tdot" style="background:${typeColor(id,name)}"></i>`;

/* ---------- ติ๊กเลือกรายการ + สรุป/ส่งออก/พิมพ์เฉพาะที่เลือก ---------- */
function enableSelect(card,items,kind,opt){
  opt=opt||{};
  const tbl=card&&card.querySelector('table'); if(!tbl||!items.length) return;
  const rows=[...tbl.tBodies[0].rows].filter(r=>!r.querySelector('td.empty'));
  if(!rows.length) return;
  const th=document.createElement('th'); th.className='ckc noprint'; th.innerHTML='<input type="checkbox" class="ck" title="เลือกทั้งหมด" aria-label="เลือกทั้งหมด">';
  tbl.tHead.rows[0].insertBefore(th,tbl.tHead.rows[0].firstChild);
  rows.forEach((r,i)=>{ const td=document.createElement('td'); td.className='ckc noprint'; td.innerHTML=`<input type="checkbox" class="ck" data-i="${i}" aria-label="เลือกแถว ${i+1}">`; r.insertBefore(td,r.firstChild); });
  if(tbl.tFoot&&tbl.tFoot.rows[0]){ const td=document.createElement('td'); td.className='noprint'; tbl.tFoot.rows[0].insertBefore(td,tbl.tFoot.rows[0].firstChild); }
  const bar=document.createElement('div'); bar.className='selbar noprint'; bar.hidden=true;
  const sc=tbl.closest('.scroll'); (sc===card?tbl.parentNode:sc.parentNode).insertBefore(bar,sc===card?tbl:sc);
  const all=th.querySelector('input'), boxes=[...tbl.querySelectorAll('tbody input.ck')];
  const nameOf=x=>x.EmpName||x.Name||'';
  const picked=()=>boxes.filter(b=>b.checked).map(b=>items[+b.dataset.i]).filter(Boolean);
  const agg=sel=>{
    if(kind==='person'){ const m={}; sel.forEach(e=>(opt.typeCols||[]).forEach(c=>{ if(e.byType[c.TypeID]) m[c.TypeID]=(m[c.TypeID]||0)+e.byType[c.TypeID]; }));
      return {n:sel.length,unit:'คน',days:sel.reduce((a,e)=>a+e.days,0),reqs:sel.reduce((a,e)=>a+e.requests,0),chips:(opt.typeCols||[]).filter(c=>m[c.TypeID]).map(c=>[c.TypeID,c.Name,m[c.TypeID]])}; }
    const m={},nm={}; sel.forEach(x=>{ const k=x.TypeID||x.TypeName; m[k]=(m[k]||0)+Number(x.Days||0); nm[k]=x.TypeName; });
    return {n:sel.length,unit:'รายการ',days:sel.reduce((a,x)=>a+Number(x.Days||0),0),reqs:sel.length,people:new Set(sel.map(x=>x.EmpID||nameOf(x))).size,chips:Object.keys(m).map(k=>[k,nm[k],m[k]])};
  };
  const q=v=>'"'+String(v==null?'':v).replace(/"/g,'""')+'"';
  const head=()=>kind==='person'?['รหัส','ชื่อ','แผนก','ประเภทบุคลากร','ใบลา'].concat((opt.typeCols||[]).map(c=>c.Name),['รวม (วัน)']):['รหัส','ชื่อ','แผนก','ประเภทบุคลากร','ประเภทการจำหน่าย','วันที่เริ่ม','วันที่สิ้นสุด','วันลา','สถานะ','เหตุผล'];
  const line=x=>kind==='person'?[x.EmpID,x.Name,x.Department,x.Category||'',x.requests].concat((opt.typeCols||[]).map(c=>x.byType[c.TypeID]||0),[x.days]):[x.EmpID,nameOf(x),x.Department,x.Category||'',x.TypeName,fdNum(x.StartDate),fdNum(x.EndDate),x.Days,x.Status,x.Reason||''];
  function refresh(){
    const sel=picked(); boxes.forEach(b=>b.closest('tr').classList.toggle('picked',b.checked));
    all.checked=sel.length===boxes.length; all.indeterminate=sel.length>0&&sel.length<boxes.length;
    if(!sel.length){ bar.hidden=true; return; }
    const a=agg(sel); bar.hidden=false;
    bar.innerHTML=`<b>เลือก ${a.n} ${a.unit}</b><span>รวม <b>${num(a.days)}</b> วัน${kind==='person'?` · ${a.reqs} ใบลา`:` · ${a.people} คน`}</span>
      <span class="chips">${a.chips.map(c=>`<span class="pill" style="background:${typeColor(c[0],c[1])}22;color:${typeColor(c[0],c[1])}">${esc(c[1])} ${num(c[2])}</span>`).join('')}</span><span class="sp"></span>
      <button class="sm sec" data-a="csv" type="button">CSV ที่เลือก</button><button class="sm sec" data-a="print" type="button">พิมพ์ที่เลือก</button><button class="sm sec" data-a="clr" type="button">ล้าง</button>`;
  }
  all.onchange=()=>{ boxes.forEach(b=>b.checked=all.checked); refresh(); };
  tbl.tBodies[0].addEventListener('change',e=>{ if(e.target.classList.contains('ck')) refresh(); });
  bar.onclick=e=>{
    const a=e.target.dataset.a; if(!a) return; const sel=picked();
    if(a==='clr'){ boxes.forEach(b=>b.checked=false); refresh(); }
    if(a==='csv') download(btoa(unescape(encodeURIComponent('﻿'+[head()].concat(sel.map(line)).map(r=>r.map(q).join(',')).join('\n')))),'text/csv',(opt.file||'selected')+'.csv');
    if(a==='print'){
      const A=agg(sel); let box=$('#selprint'); if(!box){ box=document.createElement('div'); box.id='selprint'; document.body.appendChild(box); }
      const hd=head(), numCol=kind==='person'?i=>i>=4:i=>i===7;
      box.innerHTML=`<div style="display:flex;align-items:center;gap:12px;margin-bottom:10px">${BR.logo?`<img src="${esc(BR.logo)}" style="height:46px" alt="">`:''}<div><b style="font-size:17px">${esc(BR.orgName)}</b><br>${esc(opt.title||'รายงานสรุปการจำหน่าย')} (เฉพาะรายการที่เลือก)</div></div>
        <div style="margin-bottom:8px">เลือก ${A.n} ${A.unit} · รวม ${num(A.days)} วัน · ${A.chips.map(c=>esc(c[1])+' '+num(c[2])).join(' · ')}</div>
        <table><thead><tr><th>#</th>${hd.map((h,i)=>`<th class="${numCol(i)?'r':''}">${esc(h)}</th>`).join('')}</tr></thead><tbody>${sel.map((x,n)=>`<tr><td>${n+1}</td>${line(x).map((v,i)=>`<td class="${numCol(i)?'r':''}">${esc(v)}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
      document.body.classList.add('print-sel');
      const done=()=>{ document.body.classList.remove('print-sel'); window.removeEventListener('afterprint',done); };
      window.addEventListener('afterprint',done); window.print(); setTimeout(done,1500);
    }
  };
}

async function pStats(){
  const emps=S.isStaff?await getEmps():[];
  let empId=S.me.EmpID;
  $('#view').innerHTML=`<h2>สถิติ</h2><div class="toolbar">
    <div><label>ปีงบประมาณ</label><select id="s_fy">${fyOptions(S.fy)}</select></div>
    ${S.isStaff?`<div><label>พนักงาน</label><select id="s_emp">${emps.filter(e=>e.Active).map(e=>`<option value="${esc(e.EmpID)}" ${e.EmpID==empId?'selected':''}>${esc(e.Name)}</option>`).join('')}</select></div>`:''}
    </div><div id="s_body"><div class="spin">กำลังโหลด…</div></div>`;
  async function load(){
    killCharts();
    S.fy=Number($('#s_fy').value); if($('#s_emp')) empId=$('#s_emp').value;
    const d=await api('getStatistics',empId,S.fy);
    const e=d.emp;
    $('#s_body').innerHTML=`<div class="card" style="display:flex;gap:14px;align-items:center;flex-wrap:wrap">
      <img class="avatar" style="width:64px;height:64px;display:none" data-emp="${esc(e.EmpID)}" alt="">
      <div><b style="font-size:17px">${esc(e.Name)}</b><br><span class="muted">รหัส ${esc(e.EmpID)} · ${esc(e.Position||'-')} · ${esc(e.Department||'-')}</span><br>
      <span class="muted">บรรจุ ${fd(e.StartDate)}${d.tenure?` · อายุงาน ${esc(d.tenure)}`:''}</span></div>
      <div style="margin-left:auto;text-align:right"><div class="muted">ลาแล้วปีงบฯ ${be(d.fy)}</div><b style="font-size:22px">${num(d.totalDays)} วัน</b> <span class="muted">(${d.totalRequests} ครั้ง)</span></div></div>
    <div class="muted" style="margin:-6px 0 12px">ปีงบประมาณ ${be(d.fy)} : ${fyRangeText(d.fy)} (12 เดือน)</div>
    <div class="grid g4">${d.balances.map(b=>{
      const pct=b.total>0?Math.min(100,Math.round(b.used/b.total*100)):(b.used>0?100:0);
      const tc=typeColor(b.TypeID,b.Name);
      return `<div class="card" style="border-left:5px solid ${tc}"><div class="l muted">${tdot(b.TypeID,b.Name)}${esc(b.Name)}</div><div style="font-size:26px;font-weight:700;color:${b.remaining<0?'var(--bad)':'var(--pri)'}">${num(b.remaining)} <small class="muted" style="font-size:13px;font-weight:400">วันคงเหลือ</small></div>
      <div class="bar ${b.remaining<0?'over':''}"><i style="width:${pct}%;${b.remaining<0?'':'background:'+tc}"></i></div>
      <small class="muted">ใช้ ${num(b.used)} / ${num(b.total)}${b.carry?` (รวมยกมา ${num(b.carry)})`:''}${b.maxTotal?` · เพดานสะสม ${num(b.maxTotal)} วัน`:''}</small></div>`;}).join('')}</div>
    ${(d.special||[]).some(g=>g.requests)?`<div class="card"><h3>กลุ่มพิเศษ (แยกจากการจำหน่ายทั่วไป) ปีงบประมาณ ${be(d.fy)}</h3><div class="scroll"><table><thead><tr><th>กลุ่ม</th><th class="r">รายการ</th><th class="r">วัน</th></tr></thead><tbody>${d.special.map(g=>`<tr><td><b>${esc(g.group)}</b></td><td class="r">${g.requests}</td><td class="r">${num(g.days)}</td></tr>`).join('')}</tbody></table></div></div>`:''}
    ${d.nextCarry?`<div class="info" style="margin-bottom:16px">ยอดลาพักผ่อนที่จะยกไปปีงบประมาณ ${be(d.nextCarry.fy)}: <b>${num(d.nextCarry.carry)} วัน</b> <span class="muted">(เพดานสะสมรวมไม่เกิน ${num(d.nextCarry.maxTotal)} วัน ตามอายุราชการ)</span>${d.nextCarry.cut>0?` · ส่วนเกินเพดาน ${num(d.nextCarry.cut)} วัน ไม่ยกไป`:''}</div>`:''}
    <div class="card"><h3>วันลาแต่ละเดือน แยกตามประเภท (ปีงบประมาณ ${be(d.fy)})</h3><canvas id="mChart"></canvas></div>`;
    loadPhotos($('#s_body'));
    const mbt=d.monthsByType||{}, nameBy={}; d.balances.forEach(b=>nameBy[b.TypeID]=b.Name);
    const ids=Object.keys(nameBy); Object.keys(mbt).forEach(k=>{ if(!ids.includes(k)) ids.push(k); });
    const ds=ids.map(id=>({label:nameBy[id]||id,data:mbt[id]||FYM.map(()=>0),backgroundColor:typeColor(id,nameBy[id]),borderColor:'#fff',borderWidth:1,stack:'d'}));
    charts.push(new Chart($('#mChart'),{type:'bar',data:{labels:FYM,datasets:ds},options:{plugins:{legend:{display:true,position:'bottom'},tooltip:{callbacks:{footer:items=>{const t=items.reduce((a,i)=>a+i.parsed.y,0);return t?'รวม '+t+' วัน':'';}}}},scales:{x:{stacked:true},y:{stacked:true,beginAtZero:true,ticks:{precision:0}}}}}));
  }
  $('#s_fy').onchange=()=>load().catch(e=>toast(e.message,true));
  if($('#s_emp')) $('#s_emp').onchange=()=>load().catch(e=>toast(e.message,true));
  await load();
}

/* ---------- Employees ---------- */
async function pEmployees(){
  const emps=await getEmps(true);
  $('#view').innerHTML=`<h2>ข้อมูลพนักงาน</h2>${S.isAdmin?'<div class="toolbar"><button id="e_new">+ เพิ่มพนักงาน</button></div>':''}
  <div class="card scroll"><table><thead><tr><th></th><th>รหัส</th><th>ยศ ชื่อ-สกุล</th><th>ตำแหน่ง</th><th>แผนก</th><th>ประเภทบุคลากร</th><th>วันบรรจุ</th><th>อายุงาน</th><th>สิทธิ์</th><th>สถานะ</th>${S.isAdmin?'<th></th>':''}</tr></thead><tbody>
  ${emps.map(e=>{
    return `<tr><td><img class="avatar" data-emp="${esc(e.EmpID)}" style="display:${e.HasPhoto?'':'none'}" alt=""></td><td>${esc(e.EmpID)}</td><td>${esc(e.Name)}<br><small class="muted">${esc(e.Email||'')}</small></td><td>${esc(e.Position||'')}</td><td>${esc(e.Department||'')}</td><td>${esc(e.Category||'')}</td>
    <td>${fd(e.StartDate)}</td><td>${esc(e.Tenure||'-')}</td><td>${e.Role==='admin'?'ผู้ดูแล':e.Role==='recorder'?'ผู้บันทึก':'พนักงาน'}</td><td>${e.Active?'<span class="pill ok">ใช้งาน</span>':'<span class="pill">ปิด</span>'}${e.HasPassword?'':'<br><span class="pill warn" title="ยังเข้าสู่ระบบด้วยรหัสผ่านไม่ได้">ยังไม่มีรหัสผ่าน</span>'}</td>
    ${S.isAdmin?`<td><button class="sm sec" data-edit="${esc(e.EmpID)}">แก้ไข</button></td>`:''}</tr>`;}).join('')}
  </tbody></table></div>`;
  loadPhotos($('#view'));
  const form=(e,isNew)=>{
    e=e||{Role:'employee',Active:true};
    // ปีงบประมาณ (ค.ศ.) ของค่าที่บันทึกไว้ ถ้าเป็นปี พ.ศ. ให้แปลงเป็น ค.ศ.
    let curFY=Number(e.OpeningFY)||''; if(curFY>2400) curFY-=543;
    if(isNew&&curFY==='') curFY=S.fyNow;
    const fys=new Set(); for(let y=S.fyNow+1;y>=S.fyNow-15;y--) fys.add(y); if(curFY) fys.add(curFY);
    const fyOpts=`<option value="">— ไม่ระบุ (นับสะสมจากวันบรรจุ) —</option>`+[...fys].sort((a,b)=>b-a).map(y=>`<option value="${y}" ${y===curFY?'selected':''}>ปีงบประมาณ ${be(y)} (${fyRangeText(y)})</option>`).join('');
    const f=(id,label,val,type,extra)=>`<div><label>${label}</label><input id="m_${id}" type="${type||'text'}" value="${esc(val==null?'':val)}" ${extra||''}></div>`;
    openModal(`<h3>${isNew?'เพิ่มพนักงาน':'แก้ไขพนักงาน'}</h3><div class="form">
      ${f('EmpID','เลขประจำตัว',e.EmpID,'text',isNew?'':'disabled')}${f('Rank','ยศ/คำนำหน้า',e.Rank)}${f('FirstName','ชื่อ',e.FirstName)}${f('LastName','นามสกุล',e.LastName)}
      ${f('Position','ตำแหน่ง',e.Position)}${f('Department','แผนก/สังกัด',e.Department)}${f('StartDate','วันบรรจุทำงาน (ใช้คำนวณวันลาพักผ่อน)',e.StartDate,'date')}${f('Email','อีเมล (ไม่บังคับ ใช้รับแจ้งเตือน)',e.Email,'email')}
      <div class="full info" id="m_tenure"></div>
      <div><label>ประเภทบุคลากร</label><select id="m_Category"><option value="">— ไม่ระบุ —</option>${[...new Set([...(S.categories||[]),e.Category].filter(Boolean))].map(c=>`<option ${c===e.Category?'selected':''}>${esc(c)}</option>`).join('')}</select></div>
      <div><label>สิทธิ์ใช้งาน</label><select id="m_Role">${[['employee','พนักงาน'],['recorder','ผู้บันทึกวันลา'],['admin','ผู้ดูแลระบบ']].map(r=>`<option value="${r[0]}" ${r[0]===e.Role?'selected':''}>${r[1]}</option>`).join('')}</select></div>
      <div><label>สถานะ</label><select id="m_Active"><option value="1" ${e.Active?'selected':''}>ใช้งาน</option><option value="0" ${!e.Active?'selected':''}>ปิดใช้งาน</option></select></div>
      <div class="sect">ปีงบประมาณที่ใช้ตัดวันลา และวันลาที่ใช้ไปแล้ว</div>
      <div class="full"><label>ปีงบประมาณที่เริ่มตัดวันลา (1 ต.ค. – 30 ก.ย.)</label><select id="m_OpeningFY">${fyOpts}</select></div>
      <div class="full info" id="m_fyinfo"></div>
      ${f('OpeningUsedAnnual','ลาพักผ่อนปีงบก่อนหน้า (วัน)',e.OpeningUsedAnnual,'number','min="0" step="0.5"')}
      ${f('OpeningUsedPersonal','ลากิจ ที่ใช้ไปแล้วในปีงบประมาณนี้ (วัน)',e.OpeningUsedPersonal,'number','min="0" step="0.5"')}
      ${f('OpeningCarry','รวมยอดคงเหลือปีก่อนหน้า (วัน)',e.OpeningCarry,'number','min="0" step="0.5"')}
      ${f('OpeningAnnual','ลาพักผ่อนประจำปีนี้ (วัน) — เว้นว่าง = สิทธิ์มาตรฐาน 10 วัน',e.OpeningAnnual,'number','min="0" step="0.5" placeholder="10"')}
      <div class="full"><label>รวมปีปัจจุบัน ทั้งสิ้น (รวม) (วัน) = ยอดคงเหลือปีก่อนหน้า + ประจำปีนี้ <span class="muted" id="m_totnote"></span></label><input id="m_Total" disabled></div>
      <div class="full info opn-prev" id="m_prev"></div>
      <div class="full muted" style="font-size:13px;margin-top:-6px">เมื่อสิ้นปีงบประมาณ วันลาพักผ่อนที่เหลือจะยกไปปีถัดไปอัตโนมัติ โดยสะสมรวมกับสิทธิ์ปีนั้นไม่เกิน 20 วัน (ทำงานครบ 6 เดือนขึ้นไป) หรือไม่เกิน 30 วัน (ทำงานครบ 10 ปีขึ้นไป) พนักงานดูยอดของตนเองได้ที่เมนูสถิติการลา</div>
      ${f('LineUserId','LINE userId (แจ้งเตือน)',e.LineUserId)}${f('TelegramChatId','Telegram chat_id (แจ้งเตือน)',e.TelegramChatId)}
      <div class="full"><label>รูปถ่าย (JPG/PNG)</label><input type="file" id="m_photo" accept="image/jpeg,image/png"></div>
      <div class="full info">${isNew?'ระบบจะสร้าง <b>รหัสผ่านชั่วคราว</b> ให้หลังบันทึก (แสดงครั้งเดียว) พนักงานต้องเปลี่ยนรหัสผ่านเมื่อเข้าครั้งแรก'
        :`<label style="display:flex;gap:8px;align-items:center;margin:0;color:inherit"><input type="checkbox" id="m_reset" style="width:auto"> รีเซ็ตรหัสผ่าน (สร้างรหัสผ่านชั่วคราวใหม่ ${e.HasPassword?'':'— ยังไม่เคยตั้งรหัสผ่าน'})</label>`}</div>
      <div class="full" style="display:flex;gap:10px"><button id="m_save">บันทึก</button><button class="sec" data-close>ปิด</button></div></div>`);
    /* ปีงบประมาณ + พรีวิวยอดคงเหลือ/ยอดยกไปปีหน้า */
    const g0=id=>$('#m_'+id).value;
    /* อายุราชการ + ประเภทลาพักผ่อนที่ใช้ คำนวณจากวันบรรจุทันที (นับวันบรรจุเป็นวันแรก) */
    const showTenure=()=>{
      const v=g0('StartDate'), box=$('#m_tenure'); if(!v){ box.innerHTML='<span class="muted">กรอกวันบรรจุทำงาน ระบบจะคำนวณอายุราชการและเลือกประเภทลาพักผ่อน (ไม่เกิน/มากกว่า 10 ปี) ให้อัตโนมัติ</span>'; return; }
      const st=new Date(v+'T12:00:00'), t=new Date(); const ref=new Date(t.getFullYear(),t.getMonth(),t.getDate()+1,12);
      if(isNaN(st)||st>ref){ box.innerHTML='<span class="muted">วันบรรจุไม่ถูกต้อง หรือยังไม่ถึงกำหนด</span>'; return; }
      let y=ref.getFullYear()-st.getFullYear(), m=ref.getMonth()-st.getMonth(), d=ref.getDate()-st.getDate();
      if(d<0){ m--; d+=new Date(ref.getFullYear(),ref.getMonth(),0).getDate(); } if(m<0){ y--; m+=12; }
      const fyEnd=new Date(S.fyNow,8,30,12); let fm=(fyEnd.getFullYear()-st.getFullYear())*12+fyEnd.getMonth()-st.getMonth(); if(fyEnd.getDate()<st.getDate()) fm--;
      const long=Math.floor(fm/12)>=10, an=S.types.filter(x=>x.Annual).sort((a,b)=>a.AnnualQuota-b.AnnualQuota);
      const pick=an.length>=2?(long?an[an.length-1]:an[0]):an[0];
      box.innerHTML=`อายุราชการ: <b>${y} ปี ${m} เดือน ${d} วัน</b>${pick?` · ปีงบประมาณ ${be(S.fyNow)} ใช้ <b>${esc(pick.Name)}</b>`:''}`;
    };
    showTenure(); $('#m_StartDate').addEventListener('input',showTenure); $('#m_StartDate').addEventListener('change',showTenure);
    const OPN=['OpeningCarry','OpeningAnnual','OpeningUsedAnnual','OpeningUsedPersonal'];
    let capNow=0;
    const thisYr=()=>g0('OpeningAnnual')===''?10:(Number(g0('OpeningAnnual'))||0);
    const showTotal=()=>{ const t=(Number(g0('OpeningCarry'))||0)+thisYr(); $('#m_Total').value=g0('OpeningFY')?t:''; const over=capNow>0&&t>capNow+1e-9; $('#m_totnote').innerHTML=capNow?`· เพดานตามอายุราชการ ${capNow} วัน${over?' <b style="color:var(--bad)">— เกินเพดาน กรุณาลดจำนวนวัน</b>':''}`:''; return over; };
    let tmr=0, seq=0;
    const renderPrev=(r,typedCarry)=>{
      const a=r.rows.find(x=>x.Annual), an=r.next.find(x=>x.Annual), p=r.rows.find(x=>x.TypeID==='PERSONAL'); let h='';
      capNow=r.cap||0; showTotal();
      if(r.tenure) h+=`<div class="muted">อายุราชการ ${esc(r.tenure)} · เพดานสะสมรวม ${num(r.cap)} วัน</div>`;
      if(a){
        const out=an?an.carry:0, cut=Math.max(0,Math.max(a.remaining,0)-out);
        h+=`<div><b>${esc(a.Name)}</b> ปีงบประมาณ ${be(r.fy)}: สิทธิ์ปีนี้ ${num(a.quota)} + ยกมา ${num(a.carry)} = ${num(a.total)} วัน · ใช้ไป ${num(a.used)} · <b>คงเหลือ ${num(a.remaining)} วัน</b><br>
          ยกไปปีงบประมาณ ${be(r.fy+1)}: <b>${num(out)} วัน</b> <span class="muted">(เพดานสะสมรวม ${num((an||a).maxTotal)} วัน)</span>${cut>0?` <span class="pill warn">ส่วนเกินเพดาน ${num(cut)} วัน ไม่ยกไป</span>`:''}
          ${typedCarry>a.carry+1e-9?`<br><span class="pill bad">สะสมยกมาที่กรอก ${num(typedCarry)} วัน เกินเพดาน ระบบนับให้ ${num(a.carry)} วัน</span>`:''}
          ${a.remaining<0?'<br><span class="pill bad">ใช้เกินสิทธิ์</span>':''}</div>`;
      }
      if(p) h+=`<div><b>${esc(p.Name)}</b> ปีงบประมาณ ${be(r.fy)}: โควต้า ${num(p.quota)} วัน · ใช้ไป ${num(p.used)} · <b>คงเหลือ ${num(p.remaining)} วัน</b>${p.remaining<0?' <span class="pill bad">ใช้เกินสิทธิ์</span>':''}</div>`;
      $('#m_prev').innerHTML=h||'<span class="muted">ยังไม่มีประเภทลาพักผ่อน/ลากิจในระบบ</span>';
    };
    const refresh=()=>{
      const fy=g0('OpeningFY'); showTotal();
      $('#m_fyinfo').innerHTML=fyInfoHtml(Number(fy)||0);
      OPN.forEach(k=>{ $('#m_'+k).disabled=!fy; });
      if(!fy){ $('#m_prev').innerHTML='<span class="muted">เลือกปีงบประมาณเพื่อกรอกวันลาที่ใช้ไปแล้วและวันสะสมยกมา</span>'; return; }
      clearTimeout(tmr);
      tmr=setTimeout(async()=>{
        const my=++seq;
        try{
          const r=await api('previewOpening',{EmpID:isNew?g0('EmpID').trim():e.EmpID,StartDate:g0('StartDate'),OpeningFY:fy,OpeningCarry:g0('OpeningCarry'),OpeningAnnual:g0('OpeningAnnual'),OpeningUsedAnnual:g0('OpeningUsedAnnual'),OpeningUsedPersonal:g0('OpeningUsedPersonal')});
          if(my===seq) renderPrev(r,Number(g0('OpeningCarry'))||0);
        }catch(err){ if(my===seq) $('#m_prev').innerHTML=`<span class="muted">${esc(err.message)}</span>`; }
      },300);
    };
    ['OpeningFY','StartDate',...OPN].forEach(k=>{ const el=$('#m_'+k); el.addEventListener('input',()=>{showTotal();refresh();}); el.addEventListener('change',()=>{showTotal();refresh();}); });
    refresh();
    $('#m_save').onclick=async ev=>{
      btnBusy(ev.target,true);
      try{
        const g=id=>$('#m_'+id).value;
        if(g('OpeningFY')&&showTotal()) throw new Error('วันลาพักผ่อนสะสมยกมา + ประจำปีนี้ เกินเพดานตามอายุราชการ ('+capNow+' วัน)');
        const p={isNew:isNew,EmpID:isNew?g('EmpID').trim():e.EmpID,Rank:g('Rank'),FirstName:g('FirstName'),LastName:g('LastName'),Position:g('Position'),Department:g('Department'),
          StartDate:g('StartDate'),Email:g('Email').trim(),Role:g('Role'),Category:g('Category'),Active:g('Active')==='1',OpeningFY:g('OpeningFY'),OpeningCarry:g('OpeningFY')?g('OpeningCarry'):'',OpeningAnnual:g('OpeningFY')?g('OpeningAnnual'):'',OpeningUsedAnnual:g('OpeningFY')?g('OpeningUsedAnnual'):'',OpeningUsedPersonal:g('OpeningFY')?g('OpeningUsedPersonal'):'',LineUserId:g('LineUserId'),TelegramChatId:g('TelegramChatId')};
        p.photo=await readFile($('#m_photo').files[0]);
        p.GenTemp=!isNew&&!!($('#m_reset')&&$('#m_reset').checked);
        const r=await api('saveEmployee',p); delete photoCache[p.EmpID];
        if(r.tempPassword){
          closeModal();
          openModal(`<h3>รหัสผ่านชั่วคราว</h3><p>เลขประจำตัว <b>${esc(p.EmpID)}</b></p>
            <div class="info" style="font-size:22px;letter-spacing:2px;text-align:center;font-weight:700;user-select:all">${esc(r.tempPassword)}</div>
            <p class="muted">แจ้งพนักงานด้วยตัวเอง รหัสนี้แสดงครั้งเดียวและดูย้อนหลังไม่ได้ (ถ้าลืม ให้รีเซ็ตใหม่) ระบบจะบังคับให้เปลี่ยนรหัสผ่านเมื่อเข้าสู่ระบบครั้งแรก</p>
            <div style="display:flex;gap:10px"><button type="button" data-copy="${esc(r.tempPassword)}">คัดลอก</button><button class="sec" type="button" data-done>ปิด</button></div>`);
        }else{ closeModal(); toast('บันทึกแล้ว'); route(); }
      }catch(err){ toast(err.message,true); btnBusy(ev.target,false); }
    };
  };
  if($('#e_new')) $('#e_new').onclick=()=>form(null,true);
  document.querySelectorAll('[data-edit]').forEach(b=>b.onclick=()=>form(emps.find(x=>x.EmpID===b.dataset.edit),false));
}

/* ---------- รายงานสรุปการจำหน่าย: รายวัน / รายสัปดาห์ / รายเดือน ---------- */
const DOWF=['อาทิตย์','จันทร์','อังคาร','พุธ','พฤหัสบดี','ศุกร์','เสาร์'];
const DOWS=['อา.','จ.','อ.','พ.','พฤ.','ศ.','ส.'];
const isoP=s=>String(s).slice(0,10).split('-').map(Number);
const isoAdd=(s,n)=>{ const [y,m,d]=isoP(s); return new Date(Date.UTC(y,m-1,d+n)).toISOString().slice(0,10); };
const isoAddM=(s,n)=>{ const [y,m]=isoP(s); return new Date(Date.UTC(y,m-1+n,1)).toISOString().slice(0,10); };
const fdLong=s=>{ const [y,m,d]=isoP(s); return `วัน${DOWF[new Date(Date.UTC(y,m-1,d)).getUTCDay()]}ที่ ${d} ${THMF[m-1]} ${y+543}`; };
const fdNum=s=>{ const [y,m,d]=isoP(s); return `${String(d).padStart(2,'0')}/${String(m).padStart(2,'0')}/${y+543}`; };
function periodTitle(r){
  if(r.mode==='year') return `ปีงบประมาณ ${r.fy+543} (${fyRangeText(r.fy)})`;
  if(r.mode==='day') return fdLong(r.from);
  const a=isoP(r.from), b=isoP(r.to);
  if(r.mode==='month') return `เดือน${THMF[a[1]-1]} ${a[0]+543}`;
  return a[0]===b[0]&&a[1]===b[1] ? `สัปดาห์ที่ ${a[2]} – ${b[2]} ${THMF[b[1]-1]} ${b[0]+543}`
    : `สัปดาห์ที่ ${a[2]} ${THMF[a[1]-1]}${a[0]!==b[0]?' '+(a[0]+543):''} – ${b[2]} ${THMF[b[1]-1]} ${b[0]+543}`;
}
const MODE_NAME={day:'รายวัน',week:'รายสัปดาห์',month:'รายเดือน',year:'รายปีงบประมาณ'};
const ymLabel=ym=>{ const [y,m]=isoP(ym+'-01'); return `${THM[m-1]} ${String(y+543).slice(2)}`; };
const ymFull=ym=>{ const [y,m]=isoP(ym+'-01'); return `${THMF[m-1]} ${y+543}`; };

async function pSummary(){
  const st=S.sum=S.sum||{mode:'day',date:'',dept:'',pending:false};
  if(!st.fy) st.fy=S.fyNow;
  st.category=st.category||'';
  $('#view').innerHTML=`<h2>รายงานสรุปการจำหน่าย</h2>
  <div class="toolbar">
    <div style="min-width:auto"><label>มุมมอง</label><div class="seg" id="u_mode">${Object.keys(MODE_NAME).map(m=>`<button type="button" data-m="${m}">${MODE_NAME[m]}</button>`).join('')}</div></div>
    <div style="min-width:auto"><label>ช่วงเวลา</label><div style="display:flex;gap:6px"><button class="sec" id="u_prev" type="button" aria-label="ก่อนหน้า">‹ ก่อนหน้า</button><button class="sec" id="u_today" type="button">วันนี้</button><button class="sec" id="u_next" type="button" aria-label="ถัดไป">ถัดไป ›</button></div></div>
    <div id="u_dwrap"><label id="u_dl">วันที่</label><input id="u_date"></div>
    <div id="u_fwrap" hidden><label>ปีงบประมาณ</label><select id="u_fy"></select></div>
    <div><label>แผนก</label><select id="u_dept"><option value="">ทั้งหมด</option></select></div>
    <div><label>ประเภทบุคลากร</label><select id="u_cat"><option value="">ทั้งหมด</option>${(S.categories||[]).concat(['ไม่ระบุ']).map(c=>`<option ${c===st.category?'selected':''}>${esc(c)}</option>`).join('')}</select></div>
    <div><label>สถานะที่นับ</label><select id="u_st"><option value="0">อนุมัติแล้ว</option><option value="1">อนุมัติ + รออนุมัติ</option></select></div>
    <div style="min-width:auto;display:flex;gap:6px;flex-wrap:wrap"><button class="sec" id="u_csv" type="button">ส่งออก CSV</button><button class="sec" id="u_csv2" type="button" hidden>CSV รายใบลา</button><button class="sec" id="u_print" type="button">พิมพ์</button></div>
  </div><div id="u_body"><div class="spin">กำลังโหลด…</div></div>`;
  let last=null, seq=0;
  const syncCtl=()=>{
    document.querySelectorAll('#u_mode button').forEach(b=>b.classList.toggle('on',b.dataset.m===st.mode));
    const inp=$('#u_date'); const month=st.mode==='month', year=st.mode==='year';
    inp.type=month?'month':'date'; inp.value=st.date?(month?st.date.slice(0,7):st.date):'';
    $('#u_dwrap').hidden=year; $('#u_fwrap').hidden=!year; $('#u_csv2').hidden=!year;
    if(year){
      let h=''; const lo=Math.min(S.fyNow-10,st.fy);
      for(let y=Math.max(S.fyNow+1,st.fy);y>=lo;y--) h+=`<option value="${y}" ${y===st.fy?'selected':''}>ปีงบประมาณ ${be(y)} (${fyRangeText(y)})</option>`;
      $('#u_fy').innerHTML=h;
    }
    $('#u_dl').textContent=month?'เดือน':st.mode==='week'?'วันใดก็ได้ในสัปดาห์':'วันที่';
    $('#u_today').textContent=st.mode==='day'?'วันนี้':st.mode==='week'?'สัปดาห์นี้':st.mode==='month'?'เดือนนี้':'ปีงบประมาณนี้';
    $('#u_st').value=st.pending?'1':'0'; $('#u_cat').value=st.category;
  };
  const bar=(label,val,max,right,col)=>`<div class="hb"><span>${col?`<i class="tdot" style="background:${col}"></i>`:''}${esc(label)}</span><span class="t"><i style="width:${max>0?Math.max(val/max*100,val>0?3:0):0}%${col?';background:'+col:''}"></i></span><span class="v">${right}</span></div>`;
  function render(r){
    const s=r.summary, pct=s.totalEmployees?Math.round(s.people/s.totalEmployees*100):0, isDay=r.mode==='day';
    const sc=s.statusCount;
    const strip=isDay
      ? `<div class="wk">${r.series.map(d=>`<button type="button" data-d="${d.date}" class="${d.date===r.date?'on':''} ${d.off?'off':''}" title="${esc(d.holiday||'')}"><small>${DOWS[d.dow]}</small><b>${d.count}</b><small>${isoP(d.date)[2]} ${THM[isoP(d.date)[1]-1]}</small></button>`).join('')}</div>`
      : (()=>{ const mx=Math.max(1,...r.series.map(d=>d.count));
          return `<div class="bars">${r.series.map(d=>`<button type="button" data-d="${d.date}" class="${d.count?'':'z'} ${d.off?'off':''}" title="${esc(fdLong(d.date)+' : '+d.count+' คน'+(d.holiday?' ('+d.holiday+')':''))}"><em>${d.count||''}</em><i style="height:${d.count/mx*100}%"></i><span>${isoP(d.date)[2]}</span></button>`).join('')}</div>`; })();
    const maxT=Math.max(0,...r.byType.map(x=>x.days)), maxD=Math.max(0,...r.byDept.map(x=>x.days)), maxC=Math.max(0,...(r.byCategory||[]).map(x=>x.days));
    $('#u_body').innerHTML=`
    <div class="print-only">${BR.logo?`<img src="${esc(BR.logo)}" alt="">`:''}<div><b style="font-size:17px">${esc(BR.orgName)}</b><br>รายงานสรุปการจำหน่าย${MODE_NAME[r.mode]}${st.dept?' · '+esc(st.dept):''}${st.category?' · '+esc(st.category):''}</div></div>
    <div class="rtitle"><h3>${esc(periodTitle(r))}</h3><span class="muted">นับสถานะ: ${st.pending?'อนุมัติ + รออนุมัติ':'อนุมัติแล้ว'} · แผนก: ${esc(st.dept||'ทั้งหมด')} · ประเภทบุคลากร: ${esc(st.category||'ทั้งหมด')}</span></div>
    ${isDay&&r.isOff?`<div class="info" style="margin-bottom:14px">${r.holiday?'วันหยุด: '+esc(r.holiday):'วันเสาร์-อาทิตย์'} — ไม่นับเป็นวันทำการ (วันลาในช่วงนี้จึงแสดงเป็น 0 วัน)</div>`:''}
    <div class="grid g4">
      <div class="card stat"><div class="l">พนักงานที่ลา</div><div class="n">${s.people}</div><div class="sub"><span class="pill">จากทั้งหมด ${s.totalEmployees} คน (${pct}%)</span></div></div>
      <div class="card stat"><div class="l">จำนวนใบลา</div><div class="n">${s.requests}</div><div class="sub"><span class="pill ok">อนุมัติ ${sc['อนุมัติ']||0}</span>${st.pending?`<span class="pill warn">รออนุมัติ ${sc['รออนุมัติ']||0}</span>`:''}</div></div>
      <div class="card stat"><div class="l">วันลารวม (วันทำการ)</div><div class="n">${num(s.days)}</div><div class="sub"><span class="pill">${s.people?'เฉลี่ย '+num(s.days/s.people)+' วัน/คน':'-'}</span></div></div>
      ${isDay
        ? `<div class="card stat"><div class="l">มาปฏิบัติงาน</div><div class="n">${s.totalEmployees-s.people}</div><div class="sub"><span class="pill">${r.isOff?'วันหยุด':'คน'}</span></div></div>`
        : `<div class="card stat"><div class="l">วันที่มีคนลามากสุด</div><div class="n" style="font-size:22px;line-height:1.7">${s.peak?fd(s.peak.date):'-'}</div><div class="sub"><span class="pill">${s.peak?s.peak.count+' คน':'ไม่มีผู้ลา'}</span></div></div>`}
    </div>
    ${!st.pending&&s.pending>0?`<div class="info noprint" style="margin-bottom:16px">มีใบลา <b>รออนุมัติ ${s.pending} ใบ</b> ในช่วงนี้ที่ยังไม่นับ — เลือก "อนุมัติ + รออนุมัติ" เพื่อรวม</div>`:''}
    <div class="card"><h3>${isDay?'จำนวนคนที่ลา สัปดาห์นี้ (จันทร์–อาทิตย์)':'จำนวนคนที่ลาในแต่ละวัน'} <span class="muted noprint" style="font-weight:400;font-size:13px">· คลิกเพื่อดูรายวัน</span></h3>${strip}</div>
    <div class="grid g2">
      <div class="card"><h3>แยกตามประเภทการจำหน่าย</h3>${r.byType.map(x=>bar(x.name,x.days,maxT,`${num(x.days)} วัน · ${x.people} คน`,typeColor(x.TypeID||x.name,x.name))).join('')||'<div class="empty">ไม่มีข้อมูล</div>'}</div>
      <div class="card"><h3>แยกตามแผนก</h3>${r.byDept.map(x=>bar(x.dept,x.days,maxD,`${x.people}/${x.total} คน · ${num(x.days)} วัน`)).join('')||'<div class="empty">ไม่มีข้อมูล</div>'}</div>
      <div class="card"><h3>แยกตามประเภทบุคลากร</h3>${(r.byCategory||[]).map(x=>bar(x.category,x.days,maxC,`${x.people}/${x.total} คน · ${num(x.days)} วัน`)).join('')||'<div class="empty">ไม่มีข้อมูล</div>'}</div>
    </div>
    ${!isDay&&r.top.length?`<div class="card"><h3>ผู้ลามากสุด (10 อันดับ)</h3><div class="scroll"><table><thead><tr><th>#</th><th>พนักงาน</th><th>แผนก</th><th>ประเภทบุคลากร</th><th>ใบลา</th><th>วันลา</th></tr></thead><tbody>${r.top.map((t,i)=>`<tr><td>${i+1}</td><td>${esc(t.Name)}</td><td>${esc(t.Department)}</td><td>${esc(t.Category||'')}</td><td>${t.requests}</td><td>${num(t.days)}</td></tr>`).join('')}</tbody></table></div></div>`:''}
    ${isDay&&S.isAdmin?'<div class="card noprint" id="u_pub"><div class="spin">กำลังโหลด…</div></div>':''}
    ${specialHtml(r,true)}
    <div class="card" id="u_list"><h3>รายการลา${isDay?'ในวันนี้':'ในช่วงนี้'} (${r.rows.length} รายการ) <span class="muted noprint" style="font-weight:400;font-size:13px">· ติ๊กเลือกเพื่อสรุป</span></h3><div class="scroll"><table><thead><tr><th>#</th><th>พนักงาน</th><th>แผนก</th><th>ประเภทบุคลากร</th><th>ประเภท</th><th>ช่วงวันที่ลา</th><th>วันลา${isDay?'วันนี้':'ในช่วงนี้'}</th><th>เหตุผล / ติดต่อ</th><th>สถานะ</th></tr></thead><tbody>
    ${r.rows.map((x,i)=>`<tr><td>${i+1}</td><td>${esc(x.Name)}<br><small class="muted">${esc(x.Position)}</small></td><td>${esc(x.Department)}</td><td>${esc(x.Category||'')}</td><td>${x.TypeID?tdot(x.TypeID,x.TypeName):''}${esc(x.TypeName)}</td>
      <td>${fd(x.StartDate)}${x.StartDate===x.EndDate?'':' – '+fd(x.EndDate)}</td><td>${num(x.Days)}${x.DaysTotal!==x.Days?`<br><small class="muted">(ทั้งใบ ${num(x.DaysTotal)})</small>`:''}</td>
      <td>${esc(x.Reason)}${x.Contact?`<br><small class="muted">ติดต่อ: ${esc(x.Contact)}</small>`:''}</td><td>${statusPill(x.Status)}</td></tr>`).join('')||`<tr><td colspan="9" class="empty">${isDay?'ไม่มีผู้ลาในวันนี้':'ไม่มีผู้ลาในช่วงนี้'}</td></tr>`}
    </tbody></table></div></div>`;
    $('#u_body').querySelectorAll('[data-d]').forEach(b=>b.onclick=()=>{ st.mode='day'; st.date=b.dataset.d; syncCtl(); load(); });
    if($('#u_pub')) pubAdminCard($('#u_pub'));
    enableSelect($('#u_list'),r.rows,'req',{file:'leave_summary_selected',title:'รายงานสรุปการจำหน่าย'+MODE_NAME[r.mode]});
  }
  /* ----- มุมมองรายปีงบประมาณ ----- */
  function renderYear(r){
    const s=r.summary, p=r.prev, sc=s.statusCount, pct=s.totalEmployees?Math.round(s.people/s.totalEmployees*100):0;
    const delta=(a,b)=>b>0?Math.round((a-b)/b*100):null;
    const dd=delta(s.days,p.days);
    const dPill=dd==null?(s.days>0?`<span class="pill">ปีก่อนไม่มีข้อมูล</span>`:''):`<span class="pill ${dd>0?'warn':dd<0?'ok':''}">${dd>0?'▲':dd<0?'▼':'='} ${Math.abs(dd)}% เทียบปีงบฯ ${be(p.fy)} (${num(p.days)} วัน)</span>`;
    const mx=Math.max(1,...r.months.map(m=>Math.max(m.days,m.prevDays)));
    const chart=`<div class="ybars">${r.months.map(m=>`<button type="button" data-ym="${m.ym}" title="${esc(ymFull(m.ym)+' : '+num(m.days)+' วัน ('+m.people+' คน) · ปีก่อน '+num(m.prevDays)+' วัน')}"><em>${m.days?num(m.days):''}</em><span class="pair"><i class="p" style="height:${m.prevDays/mx*100}%"></i><i style="height:${m.days/mx*100}%"></i></span><span>${ymLabel(m.ym)}</span></button>`).join('')}</div>
      <div class="lgd"><span><i></i>ปีงบประมาณ ${be(r.fy)}</span><span><i class="p"></i>ปีงบประมาณ ${be(p.fy)}</span></div>`;
    const tot=r.months.reduce((a,m)=>({days:a.days+m.days,req:a.req+m.requests,prev:a.prev+m.prevDays}),{days:0,req:0,prev:0});
    const mrow=m=>{ const d=m.prevDays>0?Math.round((m.days-m.prevDays)/m.prevDays*100):null; return `<tr><td>${esc(ymFull(m.ym))}</td><td class="r">${m.people}</td><td class="r">${m.requests}</td><td class="r">${num(m.days)}</td><td class="r muted">${num(m.prevDays)}</td><td class="r">${d==null?'-':(d>0?'+':'')+d+'%'}</td></tr>`; };
    const maxT=Math.max(0,...r.byType.map(x=>x.days)), maxD=Math.max(0,...r.byDept.map(x=>x.days)), maxC=Math.max(0,...(r.byCategory||[]).map(x=>x.days));
    const bar=(label,val,max,right,col)=>`<div class="hb"><span>${col?`<i class="tdot" style="background:${col}"></i>`:''}${esc(label)}</span><span class="t"><i style="width:${max>0?Math.max(val/max*100,val>0?3:0):0}%${col?';background:'+col:''}"></i></span><span class="v">${right}</span></div>`;
    const emps=r.byEmp.filter(e=>e.days>0);
    const colTot=c=>emps.reduce((a,e)=>a+(e.byType[c.TypeID]||0),0);
    const LIM=300, shown=r.rows.slice(0,LIM);
    $('#u_body').innerHTML=`
    <div class="print-only">${BR.logo?`<img src="${esc(BR.logo)}" alt="">`:''}<div><b style="font-size:17px">${esc(BR.orgName)}</b><br>รายงานสรุปการจำหน่ายรายปีงบประมาณ ${be(r.fy)}${st.dept?' · '+esc(st.dept):''}${st.category?' · '+esc(st.category):''}</div></div>
    <div class="rtitle"><h3>${esc(periodTitle(r))}</h3><span class="muted">นับสถานะ: ${st.pending?'อนุมัติ + รออนุมัติ':'อนุมัติแล้ว'} · แผนก: ${esc(st.dept||'ทั้งหมด')} · ประเภทบุคลากร: ${esc(st.category||'ทั้งหมด')}</span></div>
    <div class="grid g4">
      <div class="card stat"><div class="l">พนักงานที่ลา</div><div class="n">${s.people}</div><div class="sub"><span class="pill">จากทั้งหมด ${s.totalEmployees} คน (${pct}%)</span><span class="pill">ไม่เคยลา ${s.withoutLeave} คน</span></div></div>
      <div class="card stat"><div class="l">จำนวนใบลา</div><div class="n">${s.requests}</div><div class="sub"><span class="pill ok">อนุมัติ ${sc['อนุมัติ']||0}</span>${st.pending?`<span class="pill warn">รออนุมัติ ${sc['รออนุมัติ']||0}</span>`:''}</div></div>
      <div class="card stat"><div class="l">วันลารวม (วันทำการ)</div><div class="n">${num(s.days)}</div><div class="sub">${dPill}<span class="pill">${s.people?'เฉลี่ย '+num(s.days/s.people)+' วัน/คน':'-'}</span></div></div>
      <div class="card stat"><div class="l">เดือนที่ลามากสุด</div><div class="n" style="font-size:22px;line-height:1.7">${s.peak?esc(ymFull(s.peak.ym)):'-'}</div><div class="sub"><span class="pill">${s.peak?num(s.peak.days)+' วัน':'ไม่มีผู้ลา'}</span></div></div>
    </div>
    ${!st.pending&&s.pending>0?`<div class="info noprint" style="margin-bottom:12px">มีใบลา <b>รออนุมัติ ${s.pending} ใบ</b> ในปีงบประมาณนี้ที่ยังไม่นับ — เลือก "อนุมัติ + รออนุมัติ" เพื่อรวม</div>`:''}
    ${r.opening.people>0?`<div class="info" style="margin-bottom:12px">ยังไม่รวมวันลาที่กรอกไว้ก่อนเริ่มใช้ระบบ (ไม่มีวันที่ลา): ลาพักผ่อน <b>${num(r.opening.annual)}</b> วัน · ลากิจ <b>${num(r.opening.personal)}</b> วัน ของ ${r.opening.people} คน — ยอดนี้นับรวมในรายงานยอดคงเหลือแล้ว</div>`:''}
    <div class="card"><h3>วันลารายเดือน (ต.ค. – ก.ย.) เทียบปีงบประมาณก่อน <span class="muted noprint" style="font-weight:400;font-size:13px">· คลิกเดือนเพื่อดูรายละเอียด</span></h3>${chart}</div>
    <div class="card"><h3>สรุปรายเดือน</h3><div class="scroll"><table><thead><tr><th>เดือน</th><th class="r">คนที่ลา</th><th class="r">ใบลา</th><th class="r">วันลา</th><th class="r">ปีก่อน (วัน)</th><th class="r">เปลี่ยนแปลง</th></tr></thead><tbody>${r.months.map(mrow).join('')}</tbody>
      <tfoot><tr><td>รวมปีงบประมาณ ${be(r.fy)}</td><td class="r">${s.people}</td><td class="r">${s.requests}</td><td class="r">${num(s.days)}</td><td class="r">${num(p.days)}</td><td class="r">${dd==null?'-':(dd>0?'+':'')+dd+'%'}</td></tr></tfoot></table></div>
      <div class="muted" style="font-size:12px;margin-top:8px">ใบลาที่คร่อมเดือนหรือคร่อมปีงบประมาณ ถัววันลาตามสัดส่วนวันทำการที่ตกในแต่ละช่วง · จำนวนใบลารายเดือนนับใบที่มีวันลาในเดือนนั้น</div></div>
    <div class="grid g2">
      <div class="card"><h3>แยกตามประเภทการจำหน่าย</h3>${r.byType.map(x=>bar(x.name,x.days,maxT,`${num(x.days)} วัน · ${x.people} คน`,typeColor(x.TypeID||x.name,x.name))).join('')||'<div class="empty">ไม่มีข้อมูล</div>'}</div>
      <div class="card"><h3>แยกตามแผนก</h3>${r.byDept.map(x=>bar(x.dept,x.days,maxD,`${x.people}/${x.total} คน · ${num(x.days)} วัน`)).join('')||'<div class="empty">ไม่มีข้อมูล</div>'}</div>
      <div class="card"><h3>แยกตามประเภทบุคลากร</h3>${(r.byCategory||[]).map(x=>bar(x.category,x.days,maxC,`${x.people}/${x.total} คน · ${num(x.days)} วัน`)).join('')||'<div class="empty">ไม่มีข้อมูล</div>'}</div>
    </div>
    <div class="card" id="u_people"><h3>สรุปรายบุคคล (${emps.length} คน) <span class="muted noprint" style="font-weight:400;font-size:13px">· ติ๊กเลือกเพื่อสรุป</span></h3><div class="scroll"><table><thead><tr><th>#</th><th>พนักงาน</th><th>แผนก</th><th>ประเภทบุคลากร</th><th class="r">ใบลา</th>${r.typeCols.map(c=>`<th class="r">${esc(c.Name)}</th>`).join('')}<th class="r">รวม (วัน)</th></tr></thead><tbody>
      ${emps.map((e,i)=>`<tr><td>${i+1}</td><td>${esc(e.Name)}</td><td>${esc(e.Department)}</td><td>${esc(e.Category||'')}</td><td class="r">${e.requests}</td>${r.typeCols.map(c=>`<td class="r">${e.byType[c.TypeID]?num(e.byType[c.TypeID]):'<span class="muted">-</span>'}</td>`).join('')}<td class="r"><b>${num(e.days)}</b></td></tr>`).join('')||`<tr><td colspan="${6+r.typeCols.length}" class="empty">ไม่มีผู้ลาในปีงบประมาณนี้</td></tr>`}
      </tbody>${emps.length?`<tfoot><tr><td></td><td>รวม</td><td></td><td></td><td class="r">${s.requests}</td>${r.typeCols.map(c=>`<td class="r">${num(colTot(c))}</td>`).join('')}<td class="r">${num(s.days)}</td></tr></tfoot>`:''}</table></div>
      ${s.withoutLeave>0?`<div class="muted" style="font-size:12px;margin-top:8px">ไม่มีการลาในปีงบประมาณนี้ ${s.withoutLeave} คน (ไม่แสดงในตาราง)</div>`:''}</div>
    ${specialHtml(r,true)}
    <div class="card" id="u_list"><h3>รายการลาทั้งหมด (${r.rows.length} รายการ) <span class="muted noprint" style="font-weight:400;font-size:13px">· ติ๊กเลือกเพื่อสรุป</span></h3><div class="scroll"><table><thead><tr><th>#</th><th>พนักงาน</th><th>แผนก</th><th>ประเภทบุคลากร</th><th>ประเภท</th><th>ช่วงวันที่ลา</th><th class="r">วันลาในปีนี้</th><th>สถานะ</th></tr></thead><tbody>
      ${shown.map((x,i)=>`<tr><td>${i+1}</td><td>${esc(x.Name)}</td><td>${esc(x.Department)}</td><td>${esc(x.Category||'')}</td><td>${x.TypeID?tdot(x.TypeID,x.TypeName):''}${esc(x.TypeName)}</td><td>${fd(x.StartDate)}${x.StartDate===x.EndDate?'':' – '+fd(x.EndDate)}</td><td class="r">${num(x.Days)}${x.DaysTotal!==x.Days?`<br><small class="muted">(ทั้งใบ ${num(x.DaysTotal)})</small>`:''}</td><td>${statusPill(x.Status)}</td></tr>`).join('')||'<tr><td colspan="8" class="empty">ไม่มีรายการลา</td></tr>'}
      </tbody></table></div>${r.rows.length>LIM?`<div class="muted" style="font-size:12px;margin-top:8px">แสดง ${LIM} รายการแรก — ส่งออก "CSV รายใบลา" เพื่อดูทั้งหมด</div>`:''}</div>`;
    $('#u_body').querySelectorAll('[data-ym]').forEach(b=>b.onclick=()=>{ st.mode='month'; st.date=b.dataset.ym+'-01'; syncCtl(); load(); });
    enableSelect($('#u_people'),emps,'person',{typeCols:r.typeCols,file:'leave_fy_people_selected',title:'สรุปการลารายบุคคล ปีงบประมาณ '+be(r.fy)});
    enableSelect($('#u_list'),shown,'req',{file:'leave_fy_requests_selected',title:'รายการลา ปีงบประมาณ '+be(r.fy)});
  }
  async function load(){
    const my=++seq; $('#u_body').style.opacity='.55';
    try{
      const year=st.mode==='year';
      const r=year?await api('getFiscalSummary',{fy:st.fy,dept:st.dept,category:st.category,includePending:st.pending})
                  :await api('getLeaveSummary',{mode:st.mode,date:st.date,dept:st.dept,category:st.category,includePending:st.pending});
      if(my!==seq) return;
      if(year){ r.mode='year'; st.fy=r.fy; } else st.date=r.date;
      last=r;
      const sel=$('#u_dept'); if(sel.options.length<=1||r.depts.length+1!==sel.options.length){ sel.innerHTML='<option value="">ทั้งหมด</option>'+r.depts.map(d=>`<option ${d===st.dept?'selected':''}>${esc(d)}</option>`).join(''); }
      sel.value=st.dept; syncCtl(); year?renderYear(r):render(r);
    }catch(e){ if(my===seq) $('#u_body').innerHTML=`<div class="info bad">${esc(e.message)}</div>`; }
    $('#u_body').style.opacity='';
  }
  const move=n=>{
    if(st.mode==='year'){ st.fy+=n; syncCtl(); load(); return; }
    if(!st.date) return;
    const from=last?last.from:st.date;
    st.date=st.mode==='day'?isoAdd(st.date,n):st.mode==='week'?isoAdd(st.date,7*n):isoAddM(from,n);
    syncCtl(); load();
  };
  document.querySelectorAll('#u_mode button').forEach(b=>b.onclick=()=>{ st.mode=b.dataset.m; syncCtl(); load(); });
  $('#u_prev').onclick=()=>move(-1); $('#u_next').onclick=()=>move(1);
  $('#u_today').onclick=()=>{ if(st.mode==='year'){ st.fy=S.fyNow; syncCtl(); } else st.date=''; load(); };
  $('#u_fy').onchange=e=>{ st.fy=Number(e.target.value); load(); };
  $('#u_date').onchange=e=>{ const v=e.target.value; if(!v) return; st.date=st.mode==='month'?v+'-01':v; load(); };
  $('#u_dept').onchange=e=>{ st.dept=e.target.value; load(); };
  $('#u_cat').onchange=e=>{ st.category=e.target.value; load(); };
  $('#u_st').onchange=e=>{ st.pending=e.target.value==='1'; load(); };
  $('#u_print').onclick=()=>window.print();
  const csvOut=(rows,name)=>{
    const q=v=>'"'+String(v==null?'':v).replace(/"/g,'""')+'"';
    download(btoa(unescape(encodeURIComponent('﻿'+rows.map(r=>r.map(q).join(',')).join('\n')))),'text/csv',name);
  };
  $('#u_csv2').onclick=()=>{
    if(!last||last.mode!=='year') return;
    const per=periodTitle(last);
    csvOut([['ปีงบประมาณ','รหัส','ชื่อ','แผนก','ประเภทบุคลากร','ประเภทการจำหน่าย','วันที่เริ่ม','วันที่สิ้นสุด','วันลาในปีงบประมาณ','วันลาทั้งใบ','สถานะ']]
      .concat(last.rows.map(x=>[per,x.EmpID,x.Name,x.Department,x.Category,x.TypeName,fdNum(x.StartDate),fdNum(x.EndDate),x.Days,x.DaysTotal,x.Status])),`leave_fy${last.fy+543}_requests.csv`);
  };
  $('#u_csv').onclick=()=>{
    if(!last) return;
    if(last.mode==='year'){      // สรุปรายบุคคล แยกตามประเภทการจำหน่าย
      const per=periodTitle(last), emps=last.byEmp.filter(e=>e.days>0);
      csvOut([['ปีงบประมาณ','รหัส','ชื่อ','แผนก','ประเภทบุคลากร','ใบลา'].concat(last.typeCols.map(c=>c.Name),['รวม (วัน)'])]
        .concat(emps.map(e=>[per,e.EmpID,e.Name,e.Department,e.Category,e.requests].concat(last.typeCols.map(c=>e.byType[c.TypeID]||0),[e.days]))),`leave_fy${last.fy+543}_summary.csv`);
      return;
    }
    const q=v=>'"'+String(v==null?'':v).replace(/"/g,'""')+'"';
    const head=['ช่วงรายงาน','รหัส','ชื่อ','แผนก','ประเภทบุคลากร','ตำแหน่ง','ประเภทการจำหน่าย','วันที่เริ่ม','วันที่สิ้นสุด','วันลาในช่วง','วันลาทั้งใบ','สถานะ','เหตุผล','ช่องทางติดต่อ'];
    const per=periodTitle(last);
    const csv='﻿'+[head].concat(last.rows.map(x=>[per,x.EmpID,x.Name,x.Department,x.Category,x.Position,x.TypeName,fdNum(x.StartDate),fdNum(x.EndDate),x.Days,x.DaysTotal,x.Status,x.Reason,x.Contact])).map(r=>r.map(q).join(',')).join('\n');
    download(btoa(unescape(encodeURIComponent(csv))),'text/csv',`leave_${last.mode}_${last.from}.csv`);
  };
  syncCtl(); await load();
}

/* ---------- Org settings (โลโก้ / ผู้ติดต่อ) ---------- */
async function pSettings(){
  const s=await api('getSettings');
  let logo=null, removeLogo=false;           // logo = ไฟล์ใหม่ที่เลือก (ยังไม่บันทึก)
  $('#view').innerHTML=`<h2>ตั้งค่าหน่วยงาน</h2>
  <div class="card"><h3>ข้อมูลหน่วยงานและโลโก้</h3><div class="form">
    <div class="full"><label>ชื่อหน่วยงาน</label><input id="o_name" value="${esc(s.orgName)}" maxlength="120"></div>
    <div class="full"><label>โลโก้หน่วยงาน (PNG/JPG แสดงหน้าชื่อหน่วยงานที่หัวเว็บและหน้าเข้าสู่ระบบ — ระบบย่อรูปให้อัตโนมัติ)</label>
      <div style="display:flex;gap:14px;align-items:center;flex-wrap:wrap">
        <img class="logo-prev" id="o_prev" alt="" ${s.logo?`src="${esc(s.logo)}"`:'hidden'}>
        <span class="muted" id="o_none" ${s.logo?'hidden':''}>ยังไม่มีโลโก้</span>
        <input type="file" id="o_file" accept="image/png,image/jpeg" style="max-width:300px">
        <button type="button" class="sec sm" id="o_rm" ${s.logo?'':'hidden'}>ลบโลโก้</button>
      </div></div>
  </div></div>
  <div class="card"><h3>ผู้ติดต่อ / ผู้พัฒนา (แสดงมุมล่างขวาของทุกหน้า)</h3><div class="form">
    <div><label>หัวข้อ</label><input id="o_label" value="${esc(s.contactLabel||'ผู้พัฒนา/ผู้ติดต่อ')}" maxlength="40" placeholder="เช่น ผู้พัฒนาระบบ"></div>
    <div><label>ชื่อ</label><input id="o_cname" value="${esc(s.contactName)}" maxlength="100"></div>
    <div><label>ตำแหน่ง</label><input id="o_cpos" value="${esc(s.contactPosition)}" maxlength="100"></div>
    <div><label>หมายเลขโทรศัพท์</label><input id="o_cphone" type="tel" value="${esc(s.contactPhone)}" maxlength="40" placeholder="เช่น 081-234-5678"></div>
    <div class="full"><label>ตัวอย่างที่จะแสดง</label><div class="info" id="o_pv" style="text-align:right"></div></div>
    <div class="full"><button id="o_save">บันทึก</button></div>
  </div></div>`;
  const cur=()=>({orgName:$('#o_name').value,contactLabel:$('#o_label').value,contactName:$('#o_cname').value,contactPosition:$('#o_cpos').value,contactPhone:$('#o_cphone').value});
  const pv=()=>{ $('#o_pv').innerHTML=contactHtml(cur(),'')||'<span class="muted">(ยังไม่ได้กรอก — จะไม่แสดงที่มุมล่างขวา)</span>'; };
  ['o_label','o_cname','o_cpos','o_cphone'].forEach(id=>$('#'+id).addEventListener('input',pv)); pv();
  $('#o_file').onchange=async e=>{
    const f=e.target.files[0]; if(!f) return;
    try{ logo=await prepLogo(f); removeLogo=false; $('#o_prev').src=logo.preview; $('#o_prev').hidden=false; $('#o_none').hidden=true; $('#o_rm').hidden=false; }
    catch(err){ toast(err.message,true); e.target.value=''; logo=null; }
  };
  $('#o_rm').onclick=()=>{ logo=null; removeLogo=true; $('#o_file').value=''; $('#o_prev').hidden=true; $('#o_prev').removeAttribute('src'); $('#o_none').hidden=false; $('#o_rm').hidden=true; };
  $('#o_save').onclick=async ev=>{
    btnBusy(ev.target,true);
    try{
      const p=cur(); if(logo) p.logo={mime:logo.mime,data:logo.data}; else if(removeLogo) p.removeLogo=true;
      const b=await api('saveSettings',p); applyBrand(Object.assign({logo:''},b)); toast('บันทึกการตั้งค่าแล้ว'); logo=null; removeLogo=false;
    }catch(err){ toast(err.message,true); }
    btnBusy(ev.target,false);
  };
}

/* ---------- Leave types ---------- */
async function pTypes(){
  const rows=await api('listTypes');
  $('#view').innerHTML=`<h2>ประเภทการจำหน่าย</h2>${S.oldBackend?'<div class="info bad" style="margin-bottom:12px"><b>Apps Script ยังเป็นเวอร์ชันเก่า</b> — การแยกกลุ่มราชการ/ศึกษา/ราชการหน่วยสนามจะยังไม่ทำงาน: วาง code.gs ล่าสุด แล้ว Deploy > Manage deployments > Edit > New version</div>':''}<div class="toolbar"><button id="t_new">+ เพิ่มประเภท</button></div>
  <div class="card scroll"><table><thead><tr><th>รหัส</th><th>ชื่อ</th><th>รายละเอียด</th><th>กลุ่ม</th><th>โควต้า/ปี (วัน)</th><th>สถานะ</th><th></th></tr></thead><tbody>
  ${rows.map(t=>`<tr><td>${esc(t.TypeID)}</td><td>${esc(t.Name)}</td><td>${esc(t.Description||'')}</td><td>${t.Group?`<span class="pill warn">${esc(t.Group)}</span>`:'<span class="muted">ทั่วไป</span>'}</td><td>${num(t.AnnualQuota)}</td><td>${t.Active?'<span class="pill ok">เปิดใช้งาน</span>':'<span class="pill">ปิด</span>'}</td><td><button class="sm sec" data-edit="${esc(t.TypeID)}">แก้ไข</button></td></tr>`).join('')}
  </tbody></table></div><div class="info">ลาพักผ่อนประจำปีแยกตามอายุราชการ: <b>รหัส 1</b> = อายุราชการไม่ถึง 10 ปี (เพดานสะสม = โควต้าของรหัสนี้ เช่น 20 วัน) และ <b>รหัส 2</b> = อายุราชการ 10 ปีขึ้นไป (เช่น 30 วัน) ระบบเลือกประเภทให้ตามอายุราชการของพนักงานแต่ละคนอัตโนมัติ สิทธิ์ต่อปี 10 วัน (ทำงาน ≥ 6 เดือน) ยกยอดข้ามปีงบประมาณอัตโนมัติ ประเภทอื่นรีเซ็ตทุกปีงบประมาณ</div>`;
  const form=(t,isNew)=>{
    t=t||{Active:true,AnnualQuota:0};
    openModal(`<h3>${isNew?'เพิ่มประเภท':'แก้ไขประเภท'}</h3><div class="form">
      <div><label>รหัส (ภาษาอังกฤษ)</label><input id="y_id" value="${esc(t.TypeID||'')}" ${isNew?'':'disabled'}></div>
      <div><label>ชื่อประเภท</label><input id="y_name" value="${esc(t.Name||'')}"></div>
      <div class="full"><label>รายละเอียด/นโยบาย</label><textarea id="y_desc">${esc(t.Description||'')}</textarea></div>
      <div><label>กลุ่ม (แยกจากการจำหน่ายทั่วไป)</label><select id="y_g"><option value="">ทั่วไป</option>${(S.specialGroups||[]).map(g=>`<option ${g===t.Group?'selected':''}>${esc(g)}</option>`).join('')}</select></div>
      <div><label>โควต้าวันลาต่อปี</label><input type="number" min="0" step="0.5" id="y_q" value="${esc(t.AnnualQuota)}"></div>
      <div><label>สถานะ</label><select id="y_a"><option value="1" ${t.Active?'selected':''}>เปิดใช้งาน</option><option value="0" ${!t.Active?'selected':''}>ปิดใช้งาน</option></select></div>
      <div class="full" style="display:flex;gap:10px"><button id="y_save">บันทึก</button><button class="sec" data-close>ปิด</button></div></div>`);
    $('#y_save').onclick=async ev=>{
      btnBusy(ev.target,true);
      try{
        await api('saveType',{isNew:isNew,TypeID:isNew?$('#y_id').value.trim():t.TypeID,Name:$('#y_name').value.trim(),Description:$('#y_desc').value,AnnualQuota:$('#y_q').value,Group:$('#y_g').value,Active:$('#y_a').value==='1'});
        const b=await api('bootstrap'); S.types=b.types; closeModal(); toast('บันทึกแล้ว'); route();
      }catch(err){ toast(err.message,true); btnBusy(ev.target,false); }
    };
  };
  $('#t_new').onclick=()=>form(null,true);
  document.querySelectorAll('[data-edit]').forEach(b=>b.onclick=()=>form(rows.find(x=>x.TypeID===b.dataset.edit),false));
}
/* ---------- ตัวจัดการคลิกกลาง (ไม่ใช้ inline handler เพื่อให้ CSP เข้มงวดได้) ---------- */
document.addEventListener('click',e=>{
  const dn=e.target.closest('[data-done]'); if(dn){ closeModal(); route(); return; }
  const c=e.target.closest('[data-close]'); if(c){ closeModal(); return; }
  const k=e.target.closest('[data-copy]'); if(k){ try{ navigator.clipboard.writeText(k.dataset.copy); toast('คัดลอกแล้ว'); }catch(x){ toast('คัดลอกไม่สำเร็จ',true); } }
});
/* ความสูงหัวเว็บ → ใช้กำหนดตำแหน่งแถบเมนูแบบ sticky ให้พอดีทุกขนาดจอ */
(function(){ const h=document.querySelector('header'); if(!h) return; const set=()=>document.documentElement.style.setProperty('--hh',h.offsetHeight+'px'); set(); window.addEventListener('resize',set); if(window.ResizeObserver) new ResizeObserver(set).observe(h); })();

