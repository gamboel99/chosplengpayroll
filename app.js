
// Chospleng Payroll v2 - client-side app
const STORAGE = 'chospleng_v2';
let state = { users: { hrd: 'hrd123', owner: 'owner123' }, employees: [], attendance: [], payrolls: [] };
const $ = id => document.getElementById(id);
const fmtRp = n => 'Rp ' + Number(n||0).toLocaleString('id-ID');

function load(){ const raw = localStorage.getItem(STORAGE); if(raw) state = JSON.parse(raw); else save(); }
function save(){ localStorage.setItem(STORAGE, JSON.stringify(state)); }

// auth
function login(u,p){
  if(state.users[u] && state.users[u]===p){ localStorage.setItem('chospleng_role', u); return true; } return false;
}
function logout(){ localStorage.removeItem('chospleng_role'); location.reload(); }
function role(){ return localStorage.getItem('chospleng_role'); }
function showNavForRole(){
  const r = role();
  document.getElementById('top-nav').classList.remove('hidden');
  document.getElementById('userRole').innerText = r.toUpperCase();
  document.querySelectorAll('.nav-role').forEach(n=>n.classList.add('hidden'));
  if(r==='hrd') document.getElementById('nav-hrd').classList.remove('hidden');
  if(r==='owner') document.getElementById('nav-owner').classList.remove('hidden');
}

// init UI actions
document.addEventListener('DOMContentLoaded', ()=>{
  load();
  // login
  $('loginForm').onsubmit = e=>{ e.preventDefault(); const u=$('username').value.trim(); const p=$('password').value.trim(); if(login(u,p)){ renderAfterLogin(); } else alert('Login gagal'); };
  $('btnLogout').onclick = logout;
  // nav buttons
  document.querySelectorAll('[data-view]').forEach(b=> b.onclick = ()=> showView(b.dataset.view));
  // HRD actions
  $('saveEmp').onclick = saveEmployee;
  $('newEmp').onclick = ()=>{ ['emp-name','emp-role','emp-start','emp-base','emp-makan','emp-bensin','emp-tax'].forEach(id=>$(id).value=''); };
  $('saveAtt').onclick = saveAttendance;
  $('clearAtt').onclick = ()=>{ ['att-emp','att-date','att-status','att-in'].forEach(id=>$(id).value=''); };
  $('genPayroll').onclick = generatePayroll;
  // initial render if already logged in
  if(role()){ renderAfterLogin(); }
});

function renderAfterLogin(){
  document.getElementById('login-view').classList.add('hidden');
  showNavForRole();
  showView(role()==='hrd' ? 'karyawan' : 'rekap');
  renderEmployeesList();
  populateAttEmp();
  renderPayrolls();
}

// views
function hideAllViews(){ document.querySelectorAll('.view').forEach(v=>v.classList.add('hidden')); }
function showView(name){
  hideAllViews();
  const map = { karyawan:'karyawan-view', absensi:'absensi-view', payroll:'payroll-view', rekap:'rekap-view', sliplist:'sliplist-view' };
  const id = map[name];
  if(id) document.getElementById(id).classList.remove('hidden');
}

// employee CRUD
function saveEmployee(){
  const name = $('emp-name').value.trim(); if(!name) return alert('Nama wajib');
  const id = 'e'+Date.now();
  const emp = { id, name, role: $('emp-role').value, start: $('emp-start').value, base: Number($('emp-base').value||50000), makan: Number($('emp-makan').value||10000), bensin: Number($('emp-bensin').value||10000), tax: Number($('emp-tax').value||0) };
  state.employees.push(emp); save(); renderEmployeesList(); populateAttEmp(); alert('Karyawan tersimpan');
}
function renderEmployeesList(){
  const el = $('list-emp'); el.innerHTML='';
  if(!state.employees.length) return el.innerHTML = '<div class="small">Belum ada karyawan</div>';
  state.employees.forEach(e=>{
    const div = document.createElement('div'); div.className='list-item';
    div.innerHTML = `<div><strong>${e.name}</strong><div class="small">${e.role} • Mulai ${e.start}</div></div>
    <div><button class="ghost" onclick="downloadSampleSlip('${e.id}')">Contoh Slip</button> <button class="ghost" onclick="removeEmp('${e.id}')">Hapus</button></div>`;
    el.appendChild(div);
  });
}
function removeEmp(id){ if(confirm('Hapus karyawan?')){ state.employees = state.employees.filter(x=>x.id!==id); state.attendance = state.attendance.filter(a=>a.empId!==id); save(); renderEmployeesList(); populateAttEmp(); } }

// attendance
function populateAttEmp(){
  const sel = $('att-emp'); if(!sel) return;
  sel.innerHTML = '<option value="">-- pilih --</option>';
  state.employees.forEach(e=> sel.innerHTML += `<option value="${e.id}">${e.name}</option>`);
}
function saveAttendance(){
  const empId = $('att-emp').value; const date = $('att-date').value;
  if(!empId||!date) return alert('Pilih karyawan & tanggal');
  const id = 'a'+Date.now();
  const rec = { id, empId, date, status: $('att-status').value, in: $('att-in').value };
  state.attendance.push(rec); save(); renderAttendanceList(); alert('Absensi disimpan');
}
function renderAttendanceList(){
  const el = $('list-att'); el.innerHTML='';
  if(!state.attendance.length) return el.innerHTML = '<div class="small">Belum ada absensi</div>';
  state.attendance.slice().sort((a,b)=>b.date.localeCompare(a.date)).forEach(r=>{
    const emp = state.employees.find(x=>x.id===r.empId) || {name:'-'}
    const div = document.createElement('div'); div.className='list-item';
    div.innerHTML = `<div><strong>${emp.name}</strong><div class="small">${r.date} • ${r.status} • ${r.in||'-'}</div></div><div><button class="ghost" onclick="removeAtt('${r.id}')">Hapus</button></div>`;
    el.appendChild(div);
  });
}
function removeAtt(id){ if(confirm('Hapus absensi?')){ state.attendance = state.attendance.filter(a=>a.id!==id); save(); renderAttendanceList(); } }

// payroll generation
function generatePayroll(){
  const period = $('pay-period').value; if(!period) return alert('Pilih periode');
  // period is yyyy-mm
  const data = computePayroll(period);
  state.payrolls.push(data); save(); renderPayrollResult(data);
}
function computePayroll(period){
  const emps = state.employees;
  const att = state.attendance.filter(a=>a.date.startsWith(period));
  const perEmp = emps.map(e=>{
    const entries = att.filter(a=>a.empId===e.id);
    let hadir=0, alfa=0, potLate=0;
    entries.forEach(r=>{
      if(r.status==='masuk'){ hadir++; if(r.in){ const parts=r.in.split(':'); const minutes = Number(parts[0])*60+Number(parts[1]); const planned=8*60; const diff = minutes-planned; if(diff>0){ const hours = Math.ceil(diff/60); if(hours===1) potLate+=5000; else if(hours===2) potLate+=10000; else potLate+=20000; } } }
      else if(r.status==='alfa') alfa++;
    });
    const daily = (e.base||0) + (e.makan||0) + (e.bensin||0);
    const gross = daily * hadir;
    const potAlfa = alfa * daily;
    const totalPot = potAlfa + potLate;
    const taxNom = Math.round(((e.tax||0)/100) * gross);
    const net = gross - totalPot - taxNom;
    return { emp: e, hadir, alfa, potLate, gross, potAlfa, totalPot, taxNom, net };
  });
  const total = perEmp.reduce((s,p)=>s+(p.net||0),0);
  const payload = { id: 'p'+Date.now(), period, generatedAt: new Date().toISOString(), perEmp, total };
  return payload;
}
function renderPayrollResult(data){
  const el = $('pay-res'); el.innerHTML = `<h4>Hasil Payroll — Periode ${data.period}</h4>`;
  const table = document.createElement('table'); table.className='slip-table'; table.innerHTML = `<thead><tr><th>Nama</th><th>Hadir</th><th>Gross</th><th>Potongan</th><th>Pajak</th><th>Net</th><th>Aksi</th></tr></thead>`;
  const tbody = document.createElement('tbody');
  data.perEmp.forEach(p=>{
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${p.emp.name}</td><td>${p.hadir}</td><td>${fmtRp(p.gross)}</td><td>${fmtRp(p.totalPot)}</td><td>${fmtRp(p.taxNom)}</td><td>${fmtRp(p.net)}</td>
      <td><button class="ghost" onclick='openSlip("${data.id}","${p.emp.id}")'>Slip</button></td>`;
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  el.appendChild(table);
  // also render for owner in rekap list
  renderPayrolls();
}

// store and show payrolls
function renderPayrolls(){
  const el = $('rekap-list'); if(!el) return;
  el.innerHTML='';
  if(!state.payrolls.length) return el.innerHTML='<div class="small">Belum ada payroll</div>';
  state.payrolls.slice().reverse().forEach(p=>{
    const div = document.createElement('div'); div.className='list-item';
    div.innerHTML = `<div><strong>Periode: ${p.period}</strong><div class="small">Total: ${fmtRp(p.total)}</div></div><div><button class="ghost" onclick='viewPayroll("${p.id}")'>Lihat</button></div>`;
    el.appendChild(div);
  });
  // slip list for owner
  const sl = $('slip-list'); if(sl){ sl.innerHTML=''; state.payrolls.forEach(p=>{ p.perEmp.forEach(pe=>{ const d = document.createElement('div'); d.className='list-item'; d.innerHTML = `<div>${pe.emp.name} • ${p.period} • ${fmtRp(pe.net)}</div><div><button class="ghost" onclick='openSlip("${p.id}","${pe.emp.id}")'>Buka Slip</button></div>`; sl.appendChild(d); }); }); }
}

function viewPayroll(id){ const p = state.payrolls.find(x=>x.id===id); if(!p) return alert('Data tidak ditemukan'); // simple view
  const html = `<h4>Periode ${p.period}</h4><table class="slip-table"><thead><tr><th>Nama</th><th>Hadir</th><th>Gross</th><th>Potongan</th><th>Net</th></tr></thead><tbody>`+ p.perEmp.map(pe=>`<tr><td>${pe.emp.name}</td><td>${pe.hadir}</td><td>${fmtRp(pe.gross)}</td><td>${fmtRp(pe.totalPot)}</td><td>${fmtRp(pe.net)}</td></tr>`).join('') + '</tbody></table>'; showModal('Rekap Payroll', html); }

// slip modal + barcode + pdf + print
function openSlip(payId, empId){
  const p = state.payrolls.find(x=>x.id===payId); if(!p) return alert('payroll not found');
  const pe = p.perEmp.find(x=>x.emp.id===empId); if(!pe) return alert('employee not found');
  const slipHtml = buildSlipHtml(p, pe);
  showModal('Slip Gaji', slipHtml + `<div style="display:flex;gap:8px;margin-top:12px"><button class="primary" onclick="downloadSlip('${p.id}','${pe.emp.id}')">Download PDF</button><button class="ghost" onclick="printSlip()">Cetak</button></div>`);
  // generate barcode in modal
  setTimeout(()=>{ const code = p.id + '|' + pe.emp.id + '|' + p.period; const svg = document.getElementById('barcode'); if(svg) JsBarcode(svg, code, {format:'CODE128', width:2, height:40, displayValue:false}); }, 120);
}

function buildSlipHtml(p, pe){
  const e = pe.emp;
  const periodLabel = p.period;
  return `<div class="slip-like"><div class="slip-header"><div><img src="assets/logo.png" style="width:60px"/><div class="small">PT. Chospleng Indonesia</div></div><div style="text-align:right"><div class="slip-title">Slip Gaji</div><div class="small">Periode: ${periodLabel}</div></div></div><hr/>
    <div style="display:flex;justify-content:space-between;margin-top:8px"><div><strong>Nama:</strong> ${e.name}<br/><strong>Jabatan:</strong> ${e.role}</div><div><strong>Masa Kerja:</strong> ${e.start}<br/><strong>Tanggal Cetak:</strong> ${new Date().toLocaleDateString()}</div></div>
    <table class="slip-table"><thead><tr><th>Keterangan</th><th>Jumlah (Rp)</th></tr></thead><tbody>
    <tr><td>Gaji Pokok (${pe.hadir} hari)</td><td>${fmtRp(pe.gross)}</td></tr>
    <tr><td>Potongan (Alpha)</td><td>${fmtRp(pe.potAlfa)}</td></tr>
    <tr><td>Potongan (Telat)</td><td>${fmtRp(pe.potLate)}</td></tr>
    <tr><td>Pajak</td><td>${fmtRp(pe.taxNom)}</td></tr>
    <tr><th>Total Bersih</th><th>${fmtRp(pe.net)}</th></tr>
    </tbody></table>
    <div style="display:flex;justify-content:space-between;align-items:center;margin-top:12px"><div style="width:60%"><div class="small">Disetujui oleh:</div><div style="margin-top:28px"><strong>HRD</strong><br/><span class="small">PT. Chospleng Indonesia</span></div></div><div style="text-align:right"><svg id="barcode"></svg><div class="small">Kode unik: ${p.id}|${pe.emp.id}</div></div></div></div>`;
}

function showModal(title, html){
  const m = $('modal'); m.classList.remove('hidden'); m.innerHTML = `<div class="card"><div style="display:flex;justify-content:space-between;align-items:center"><h3>${title}</h3><button class="link" onclick="closeModal()">Tutup</button></div><div>${html}</div></div>`;
}
function closeModal(){ $('modal').classList.add('hidden'); $('modal').innerHTML=''; }

// download PDF -> capture slip HTML, render barcode to canvas then add to PDF
async function downloadSlip(payId, empId){
  const p = state.payrolls.find(x=>x.id===payId); const pe = p.perEmp.find(x=>x.emp.id===empId);
  // build slip html in hidden element to measure
  const container = document.createElement('div'); container.style.position='fixed'; container.style.left='-9999px'; container.innerHTML = buildSlipHtml(p, pe); document.body.appendChild(container);
  // render barcode to canvas
  const svg = container.querySelector('#barcode');
  const code = p.id + '|' + pe.emp.id + '|' + p.period;
  JsBarcode(svg, code, {format:'CODE128', width:2, height:40, displayValue:false});
  // create canvas from svg
  const xml = new XMLSerializer().serializeToString(svg);
  const svg64 = btoa(xml);
  const b64Start = 'data:image/svg+xml;base64,';
  const image64 = b64Start + svg64;
  // use jsPDF to create PDF
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({unit:'pt', format:'a4'});
  // add header text
  doc.setFontSize(14); doc.text('PT. CHOSPLENG INDONESIA', 40, 40);
  doc.setFontSize(11); doc.text('Slip Gaji - Periode: ' + p.period, 40, 60);
  // add logo
  const logoImg = new Image(); logoImg.src = 'assets/logo.png';
  await new Promise(r=> logoImg.onload = r);
  doc.addImage(logoImg, 'PNG', 420, 20, 120, 40);
  // add table using autoTable
  const rows = [
    ['Nama', pe.emp.name],
    ['Jabatan', pe.emp.role],
    ['Masa Kerja', pe.emp.start],
    ['Gaji Kotor', fmtRp(pe.gross)],
    ['Potongan (Alpha + Telat)', fmtRp(pe.totalPot)],
    ['Pajak', fmtRp(pe.taxNom)],
    ['Gaji Bersih', fmtRp(pe.net)]
  ];
  doc.autoTable({ startY: 90, head: [['Keterangan','Nilai']], body: rows, theme:'grid', styles:{fontSize:10} });
  // add barcode image
  const img = new Image(); img.src = image64;
  await new Promise(r=> img.onload = r);
  doc.addImage(img, 'PNG', 420, 260, 150, 50);
  // save
  doc.save(`slip_${pe.emp.name}_${p.period}.pdf`);
  container.remove();
}

// print slip (open print for modal content)
function printSlip(){
  const modal = $('modal'); if(!modal) return;
  const wnd = window.open('', '_blank');
  wnd.document.write(`<html><head><title>Slip</title><link rel="stylesheet" href="styles.css"></head><body>${modal.querySelector('.card').innerHTML}</body></html>`);
  wnd.document.close();
  wnd.focus();
  setTimeout(()=>{ wnd.print(); wnd.close(); }, 500);
}
