/* public.html — แดชบอร์ดสรุปยอดกำลังพลประจำวัน (อ่านอย่างเดียว ไม่ต้องเข้าสู่ระบบ)
   ดึงภาพนิ่งที่ Apps Script สร้างทุกเช้า ~06:00 ผ่าน GET ?action=public&k=<รหัสลับ> */
(function(){
  'use strict';
  var CFG=window.ELEAVE_CONFIG||{}, q=new URLSearchParams(location.search), KEY=q.get('k')||'';
  var app=document.getElementById('app');
  if(q.get('embed')==='1') document.body.classList.add('embed');
  var MONTHS=['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน','กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม'];
  var DAYS=['อาทิตย์','จันทร์','อังคาร','พุธ','พฤหัสบดี','ศุกร์','เสาร์'];
  function esc(s){ return String(s==null?'':s).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];}); }
  function n(x){ return Number(x||0).toLocaleString('th-TH'); }
  function thDate(iso){ var p=iso.split('-'); return 'วัน'+DAYS[new Date(+p[0],+p[1]-1,+p[2],12).getDay()]+'ที่ '+(+p[2])+' '+MONTHS[+p[1]-1]+' '+(+p[0]+543); }
  function hm(iso){ return iso.slice(11,16); }
  function state(t,m){ app.innerHTML='<div class="state"><h2>'+esc(t)+'</h2><p>'+esc(m||'')+'</p></div>'; }

  function bars(list,key,val){
    var max=Math.max.apply(null,list.map(function(x){return x[val];}).concat([1]));
    return list.map(function(x){ return '<div class="hb"><span>'+esc(x[key])+'</span><span class="t"><i style="width:'+Math.max(x[val]/max*100,x[val]?3:0)+'%"></i></span><span class="v">'+n(x[val])+'</span></div>'; }).join('');
  }
  function tbl(list,first){
    var t={total:0,leave:0,special:0,present:0};
    list.forEach(function(x){ for(var k in t) t[k]+=x[k]; });
    return '<div style="overflow-x:auto"><table><thead><tr><th>'+first+'</th><th>กำลังพล</th><th>ปฏิบัติงาน</th><th>จำหน่าย</th><th>กลุ่มพิเศษ</th></tr></thead><tbody>'+
      list.map(function(x){ return '<tr><td>'+esc(x.name)+'</td><td>'+n(x.total)+'</td><td class="g">'+n(x.present)+'</td><td class="a">'+n(x.leave)+'</td><td class="p">'+n(x.special)+'</td></tr>'; }).join('')+
      '</tbody><tfoot><tr><td>รวม</td><td>'+n(t.total)+'</td><td class="g">'+n(t.present)+'</td><td class="a">'+n(t.leave)+'</td><td class="p">'+n(t.special)+'</td></tr></tfoot></table></div>';
  }
  function render(d,logo){
    var spTotal=d.away-d.leave; if(spTotal<0) spTotal=0;
    var pct=function(v){ return d.total?v/d.total*100:0; };
    var h='<header class="hero"><div class="wrap"><div class="brand">'+(logo?'<img src="'+esc(logo)+'" alt="">':'')+'<span>'+esc(d.org)+'</span></div>'+
      '<h1>สรุปยอดกำลังพลประจำวัน</h1><div class="date">'+esc(thDate(d.date))+'</div>'+
      '<span class="asof">ข้อมูล ณ เวลา '+esc(hm(d.generatedAt))+' น.</span></div></header><main class="wrap">';
    if(d.isOff) h+='<div class="banner">'+(d.holiday?'วันหยุด: '+esc(d.holiday):'วันหยุดสุดสัปดาห์')+' — ยอดด้านล่างคือผู้ที่มีรายการจำหน่ายครอบคลุมวันนี้</div>';
    h+='<div class="kpis">'+
      '<div class="kpi"><div class="l">กำลังพลทั้งหมด</div><div class="n">'+n(d.total)+'</div><div class="s">คน</div></div>'+
      '<div class="kpi ok"><div class="l">ปฏิบัติงาน</div><div class="n">'+n(d.present)+'</div><div class="s">'+Math.round(pct(d.present))+'% ของกำลังพล</div></div>'+
      '<div class="kpi warn"><div class="l">การจำหน่ายทั่วไป</div><div class="n">'+n(d.leave)+'</div><div class="s">ลา ฯลฯ</div></div>'+
      '<div class="kpi sp"><div class="l">กลุ่มพิเศษ</div><div class="n">'+n(spTotal)+'</div><div class="s">ราชการ / ศึกษา / หน่วยสนาม</div></div></div>'+
      '<div class="card"><h2>สัดส่วนกำลังพลวันนี้</h2><div class="stack" role="img" aria-label="สัดส่วนกำลังพล">'+
      '<i style="width:'+pct(d.present)+'%;background:#2f9e6b"></i><i style="width:'+pct(d.leave)+'%;background:#d69e2e"></i><i style="width:'+pct(spTotal)+'%;background:#805ad5"></i></div>'+
      '<div class="legend"><span><b style="background:#2f9e6b"></b>ปฏิบัติงาน '+n(d.present)+'</span><span><b style="background:#d69e2e"></b>จำหน่ายทั่วไป '+n(d.leave)+'</span><span><b style="background:#805ad5"></b>กลุ่มพิเศษ '+n(spTotal)+'</span></div></div>';
    h+='<div class="grid2"><div class="card"><h2>แยกตามประเภทการจำหน่าย</h2>'+(d.byType.length?bars(d.byType,'name','people'):'<div class="note">ไม่มีผู้จำหน่ายในวันนี้</div>')+'</div>'+
      '<div class="card"><h2>กลุ่มพิเศษ <small>แยกจากการจำหน่ายทั่วไป</small></h2><div class="tiles">'+
      d.special.map(function(x){ return '<div class="tile"><div class="n">'+n(x.people)+'</div><div class="l">'+esc(x.group)+'</div></div>'; }).join('')+'</div></div></div>';
    h+='<div class="card"><h2>แยกตามประเภทบุคลากร</h2>'+tbl(d.byCategory,'ประเภท')+'</div>';
    h+='<div class="card"><h2>แยกตามสังกัด</h2>'+tbl(d.byDept,'สังกัด')+'</div>';
    if(d.showNames&&d.names&&d.names.length){
      h+='<div class="card"><h2>รายชื่อผู้ไม่อยู่ปฏิบัติงานวันนี้ <small>'+n(d.names.length)+' รายการ'+(d.namesCut?' (แสดงบางส่วน)':'')+'</small></h2><ul class="names">'+
        d.names.map(function(x){ return '<li>'+esc(x.n)+' <small>· '+esc(x.t)+(x.d?' · '+esc(x.d):'')+'</small></li>'; }).join('')+'</ul></div>';
    }
    h+='<div class="note">'+(d.showNames?'':'แสดงเฉพาะยอดรวม ไม่ระบุชื่อและเหตุผล · ')+'ปฏิบัติงาน = กำลังพลทั้งหมด − ผู้ที่มีรายการจำหน่ายที่อนุมัติแล้วครอบคลุมวันนี้ (นับเฉพาะรายการที่อนุมัติ)</div></main>'+
      '<footer>ปรับปรุงอัตโนมัติทุกเช้า · เปิดหน้านี้ใหม่เพื่อรีเฟรช</footer>';
    app.innerHTML=h;
    document.title='สรุปยอดกำลังพลประจำวัน · '+d.org;
  }
  function brandLogo(){
    return fetch(CFG.API_URL,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify({fn:'publicInfo',args:[]})})
      .then(function(r){return r.json();}).then(function(j){ return j&&j.ok&&j.data&&j.data.logo||''; }).catch(function(){return '';});
  }
  var logoP=null;
  function load(){
    if(!CFG.API_URL||/วาง|YOUR|\.\.\.\//.test(CFG.API_URL)){ state('ยังไม่ได้ตั้งค่า','ผู้ดูแลต้องใส่ API_URL ในไฟล์ api-config.js'); return; }
    if(!KEY){ state('ลิงก์ไม่ครบถ้วน','กรุณาใช้ลิงก์ที่ได้รับจากผู้ดูแลระบบ'); return; }
    logoP=logoP||brandLogo();
    fetch(CFG.API_URL+'?action=public&k='+encodeURIComponent(KEY),{redirect:'follow'})
      .then(function(r){return r.json();})
      .then(function(j){
        if(!j.ok){ state('ไม่สามารถแสดงข้อมูลได้',j.error||''); return; }
        logoP.then(function(l){ render(j.data,l); });
      })
      .catch(function(){ if(!app.querySelector('.hero')) state('เชื่อมต่อไม่ได้','กรุณาลองใหม่อีกครั้ง'); });
  }
  load();
  setInterval(load,10*60*1000);   // รีเฟรชทุก 10 นาที (ข้อมูลเปลี่ยนวันละครั้ง)
})();
