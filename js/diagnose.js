(function(){
  const out=document.getElementById('out'), cfg=window.ELEAVE_CONFIG||{}, url=String(cfg.API_URL||'').trim();
  const csp=[]; document.addEventListener('securitypolicyviolation',e=>csp.push(e.violatedDirective+' → '+e.blockedURI));
  const add=(cls,title,detail)=>{ const d=document.createElement('div'); d.className='row '+cls; d.innerHTML='<b>'+(cls==='ok'?'✔ ':cls==='bad'?'✘ ':'⚠ ')+title+'</b>'+(detail?'<small>'+detail+'</small>':''); out.appendChild(d); return cls!=='bad'; };
  const esc=s=>String(s).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));
  async function run(){
    out.innerHTML='';
    add('ok','เปิดหน้านี้จาก: '+location.origin);
    if(location.protocol==='file:') add('warn','เปิดจากไฟล์ในเครื่อง','ให้เปิดจากเว็บที่ Deploy บน Netlify (https://...)');
    if(!url||/X{8,}/.test(url)) return add('bad','ยังไม่ได้ใส่ API_URL ใน api-config.js','ค่าปัจจุบัน: '+esc(url||'(ว่าง)'));
    if(!/^https:\/\/script\.google\.com\/(a\/[^/]+\/)?macros\/s\/[\w-]+\/exec$/.test(url)){
      add('bad','รูปแบบ URL ไม่ถูกต้อง','ต้องเป็น https://script.google.com/macros/s/…/exec (ไม่ใช่ /dev และไม่ใช่ลิงก์สเปรดชีต) — ค่าปัจจุบัน: '+esc(url));
      return;
    }
    add('ok','รูปแบบ URL ถูกต้อง',esc(url));
    // 1) GET
    let getOk=false;
    try{
      const r=await fetch(url,{method:'GET',redirect:'follow'}); const t=await r.text();
      try{ const j=JSON.parse(t); getOk=!!(j&&j.ok); add(getOk?'ok':'bad','GET ตอบกลับเป็น JSON',esc(t.slice(0,160))); }
      catch(e){ add('bad','GET ได้หน้า HTML ไม่ใช่ JSON (HTTP '+r.status+')','มักแปลว่าสิทธิ์ไม่ใช่ Anyone, ยังไม่ได้ Deploy เวอร์ชันใหม่ หรือ code.gs ยังเป็นเวอร์ชันเก่า — ต้นหน้า: '+esc(t.replace(/\s+/g,' ').slice(0,140))); }
    }catch(e){
      add('bad','GET ถูกบล็อก/เข้าถึงไม่ได้ ('+esc(e.message)+')','สาเหตุที่พบบ่อยที่สุด: Who has access ไม่ใช่ "Anyone" ทำให้ Google เด้งไปหน้าล็อกอิน (เบราว์เซอร์รายงานเป็น CORS/เครือข่าย) ให้ Deploy > Manage deployments > Edit > Version: New version, Execute as: Me, Who has access: Anyone');
      // เช็คว่าถึงเครือข่ายหรือไม่
      try{ await fetch(url,{mode:'no-cors'}); add('warn','ติดต่อ script.google.com ได้ (opaque)','เครือข่ายปกติ → ปัญหาอยู่ที่สิทธิ์/การ Deploy ไม่ใช่อินเทอร์เน็ต'); }
      catch(e2){ add('bad','ติดต่อ script.google.com ไม่ได้เลย','เครือข่าย/ไฟร์วอลล์/แอดบล็อกเกอร์/VPN อาจบล็อก ลองเครือข่ายอื่นหรือปิดส่วนขยาย'); }
    }
    // 2) POST (เหมือนที่แอปใช้)
    try{
      const r=await fetch(url,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify({fn:'publicInfo',args:[],token:''})});
      const t=await r.text(); const j=JSON.parse(t);
      add(j.ok?'ok':'bad','POST publicInfo '+(j.ok?'สำเร็จ — ระบบพร้อมใช้งาน':'ตอบ error'),esc(t.slice(0,160)));
      if(!j.ok&&/ไม่รู้จักคำสั่ง/.test(t)) add('warn','code.gs ที่ Deploy อยู่เป็นเวอร์ชันเก่า','วาง code.gs ใหม่แล้ว Deploy เป็น New version');
    }catch(e){
      add('bad','POST ไม่สำเร็จ ('+esc(e.message)+')',getOk?'GET ผ่านแต่ POST ไม่ผ่าน: ตรวจว่า code.gs มีฟังก์ชัน doPost และ Deploy เป็นเวอร์ชันล่าสุดแล้ว':'ดูข้อ GET ด้านบน');
    }
    if(csp.length) add('bad','ถูกบล็อกโดย CSP ของ netlify.toml',esc(csp.join(' | '))+' — เพิ่มโดเมนที่ถูกบล็อกใน connect-src');
    else add('ok','ไม่พบการบล็อกจาก CSP');
  }
  document.getElementById('go').onclick=function(){ this.disabled=true; run().finally(()=>{ this.disabled=false; this.textContent='ตรวจสอบอีกครั้ง'; }); };
})();
