// Chospleng Payroll v4 - Absensi Bulanan & Rekap
const STORAGE = 'chospleng_v4';
let state = { users: { hrd: 'hrd123', owner: 'owner123' }, employees: [], attendance: [], payrolls: [] };
const $ = id => document.getElementById(id);
const fmtRp = n => 'Rp ' + Number(n||0).toLocaleString('id-ID');

function load(){ const raw = localStorage.getItem(STORAGE); if(raw) state = JSON.parse(raw); else save(); }
function save(){ localStorage.setItem(STORAGE, JSON.stringify(state)); }

// auth helpers
function login(u,p){ if(state.users[u] && state.users[u]===p){ localStorage.setItem('chospleng_role', u); return true; } return false; }
function logout(){ localStorage.removeItem('chospleng_role'); location.reload(); }
function role(){ return localStorage.getItem('chospleng_role'); }
function showNavForRole(){ const r=role(); document.getElementById('top-nav').classList.remove('hidden'); document.getElementById('userRole').innerText = r? r.toUpperCase():''; document.querySelectorAll('.nav-role').forEach(n=>n.classList.add('hidden')); if(r==='hrd') document.getElementById('nav-hrd').classList.remove('hidden'); if(r==='owner') document.getElementById('nav-owner').classList.remove('hidden'); }

document.addEventListener('DOMContentLoaded', ()=>{ load(); $('loginForm').onsubmit = e=>{ e.preventDefault(); const u=$('username').value.trim(); const p=$('password').value.trim(); if(login(u,p)){ renderAfterLogin(); } else alert('Login gagal'); }; $('btnLogout').onclick = logout; document.querySelectorAll('[data-view]').forEach(b=> b.onclick = ()=> showView(b.dataset.view)); $('saveEmp').onclick = saveEmployee; $('newEmp').onclick = clearEmpForm; $('loadGrid').onclick = loadMonthlyGrid; $('saveGrid').onclick = saveGridData; $('genPayroll').onclick = generatePayroll; if(role()) renderAfterLogin(); });

function renderAfterLogin(){ $('login-view').classList.add('hidden'); showNavForRole(); showView(role()==='hrd' ? 'karyawan' : 'rekap'); renderEmployeesList(); populateAttEmp(); renderPayrolls(); }

function hideAllViews(){ document.querySelectorAll('.view').forEach(v=>v.classList.add('hidden')); }
function showView(name){ hideAllViews(); const map={ karyawan:'karyawan-view', absensi:'absensi-view', payroll:'payroll-view', rekap:'rekap-view', sliplist:'sliplist-view'}; const id = map[name]; if(id) $(id).classList.remove('hidden'); }

// employees
function clearEmpForm(){ ['emp-name','emp-role','emp-start','emp-end','emp-base','emp-makan','emp-bensin','emp-tax'].forEach(id=>$(id).value=''); $('calcPreview').innerHTML=''; }
function saveEmployee(){ const name=$('emp-name').value.trim(); if(!name) return alert('Nama wajib'); const start=$('emp-start').value; const end=$('emp-end').value; if(!start||!end) return alert('Isi periode mulai dan selesai'); if(new Date(end) < new Date(start)) return alert('Tanggal akhir harus setelah tanggal mulai'); const id='e'+Date.now(); const emp = { id, name, role:$('emp-role').value, start, end, base:Number($('emp-base').value||50000), makan:Number($('emp-makan').value||10000), bensin:Number($('emp-bensin').value||10000), tax:Number($('emp-tax').value||0) }; state.employees.push(emp); save(); renderEmployeesList(); populateAttEmp(); renderPreview(emp); alert('Karyawan tersimpan'); }
function renderEmployeesList(){ const el=$('list-emp'); el.innerHTML=''; if(!state.employees.length) return el.innerHTML='<div class="small">Belum ada karyawan</div>'; state.employees.forEach(e=>{ const div=document.createElement('div'); div.className='list-item'; div.innerHTML = `<div><strong>${e.name}</strong><div class="small">${e.role} • Periode: ${e.start} → ${e.end}</div></div><div><button class="ghost" onclick="downloadSampleSlip('${e.id}')">Contoh Slip</button> <button class="ghost" onclick="removeEmp('${e.id}')">Hapus</button></div>`; el.appendChild(div); }); }
function removeEmp(id){ if(confirm('Hapus karyawan?')){ state.employees = state.employees.filter(x=>x.id!==id); state.attendance = state.attendance.filter(a=>a.empId!==id); save(); renderEmployeesList(); populateAttEmp(); } }
function renderPreview(emp){ const start=new Date(emp.start); const end=new Date(emp.end); const diff = Math.floor((end-start)/(1000*60*60*24))+1; const daily = (emp.base||0)+(emp.makan||0)+(emp.bensin||0); const gross = daily*diff; const html = `<div><strong>Preview Perhitungan</strong><div class="small">Periode: ${emp.start} → ${emp.end} (${diff} hari)</div><table class="slip-table"><tr><td>Gaji per hari</td><td>${fmtRp(daily)}</td></tr><tr><td>Jumlah hari</td><td>${diff}</td></tr><tr><td>Gaji Kotor</td><td>${fmtRp(gross)}</td></tr></table></div>`; $('calcPreview').innerHTML = html; }

// attendance monthly grid
function populateAttEmp(){ const sel=$('att-emp'); if(!sel) return; sel.innerHTML='<option value="">-- pilih --</option>'; state.employees.forEach(e=> sel.innerHTML += `<option value="${e.id}">${e.name}</option>`); }

function loadMonthlyGrid(){ const empId = $('att-emp').value; const month = $('att-month').value; if(!empId || !month) return alert('Pilih karyawan dan bulan'); const [y,m] = month.split('-'); const year=Number(y), mon=Number(m)-1; const days = new Date(year, mon+1, 0).getDate(); const container = $('grid-container'); container.innerHTML = ''; const grid = document.createElement('div'); grid.className='calendar'; for(let d=1; d<=days; d++){ const date = new Date(year, mon, d); const iso = date.toISOString().slice(0,10); // find existing record
  const rec = state.attendance.find(a=>a.empId===empId && a.date===iso) || { status:'', in:'' };
  const day = document.createElement('div'); day.className='day clickable'; day.dataset.date = iso; day.innerHTML = `<div class='date'>${d}</div><div class='status'>${rec.status||'Belum'}</div><div class='timein'>${rec.in||''}</div>`;
  day.onclick = ()=> openDayEditor(empId, iso, day);
  grid.appendChild(day); }
  container.appendChild(grid); computeMonthlySummary(empId, month);
}

function openDayEditor(empId, iso, dayEl){ // simple prompt editor
  const existing = state.attendance.find(a=>a.empId===empId && a.date===iso);
  const status = prompt('Status (masuk / alfa / izin / sakit)', existing? existing.status : 'masuk') || 'masuk';
  let timeIn = '';
  if(status==='masuk'){ timeIn = prompt('Jam datang (HH:MM) — isi 24h, contoh 08:05', existing? existing.in : '08:00') || ''; }
  // save record
  if(existing){ existing.status = status; existing.in = timeIn; } else { state.attendance.push({ id:'a'+Date.now()+Math.random().toString(36).slice(2,6), empId, date:iso, status, in:timeIn }); }
  save(); // update UI cell
  dayEl.querySelector('.status').innerText = status; dayEl.querySelector('.timein').innerText = timeIn;
  // recompute summary
  const month = iso.slice(0,7); computeMonthlySummary(empId, month);
}

function saveGridData(){ alert('Grid disimpan otomatis ke localStorage saat diubah. Tidak ada aksi tambahan.'); }

function computeMonthlySummary(empId, month){ // month format yyyy-mm
  const emp = state.employees.find(e=>e.id===empId); if(!emp) return;
  const yearMonth = month;
  const daysInMonth = new Date(Number(yearMonth.split('-')[0]), Number(yearMonth.split('-')[1]), 0).getDate();
  const records = state.attendance.filter(a=> a.empId===empId && a.date.startsWith(yearMonth));
  let hadir=0, alfa=0, izin=0, sakit=0, lateMinutes=0, potLate=0;
  // iterate each day of month to account default as alfa if no record? We'll treat missing as 'Belum' (no action)
  records.forEach(r=>{
    if(r.status==='masuk'){ hadir++; if(r.in){ const parts=r.in.split(':'); if(parts.length===2){ const minutes = Number(parts[0])*60 + Number(parts[1]); const planned = 8*60; if(minutes>planned){ const diff = minutes - planned; lateMinutes += diff; const hours = Math.ceil(diff/60); if(hours===1) potLate += 5000; else if(hours===2) potLate += 10000; else potLate += 20000; } } } }
    else if(r.status==='alfa') alfa++;
    else if(r.status==='izin') izin++;
    else if(r.status==='sakit') sakit++;
  });
  const daily = (emp.base||0)+(emp.makan||0)+(emp.bensin||0);
  const gross = daily * (new Date(Number(yearMonth.split('-')[0]), Number(yearMonth.split('-')[1]), 0).getDate()); // use full month days for gross potential
  const potAlfa = alfa * daily;
  const totalPot = potAlfa + potLate;
  const taxNom = Math.round(((emp.tax||0)/100) * gross);
  const net = gross - totalPot - taxNom;
  const summaryEl = $('absensi-summary');
  summaryEl.innerHTML = `<h4>Rekap Bulanan: ${yearMonth}</h4>
    <div class="small">Karyawan: <strong>${emp.name}</strong> • Jabatan: ${emp.role}</div>
    <table class="slip-table"><tr><td>Hari Masuk</td><td>${hadir}</td></tr><tr><td>Alpha</td><td>${alfa}</td></tr><tr><td>Izin</td><td>${izin}</td></tr><tr><td>Sakit</td><td>${sakit}</td></tr><tr><td>Total Keterlambatan (menit)</td><td>${lateMinutes} menit</td></tr><tr><td>Potongan Telat</td><td>${fmtRp(potLate)}</td></tr><tr><td>Potongan Alpha</td><td>${fmtRp(potAlfa)}</td></tr><tr><th>Total Potongan</th><th>${fmtRp(totalPot)}</th></tr></table>`;
}

// payroll generation similar to v3 but uses attendance in month
function generatePayroll(){ const period = $('pay-period').value; if(!period) return alert('Pilih periode'); const payload = { id:'p'+Date.now(), period, generatedAt:new Date().toISOString(), perEmp:[] }; state.employees.forEach(e=>{ const [y,m] = period.split('-'); const monthStart = new Date(Number(y), Number(m)-1, 1); const monthEnd = new Date(Number(y), Number(m), 0); const days = monthEnd.getDate(); // attendance for employee in month
  const records = state.attendance.filter(a=> a.empId===e.id && a.date.startsWith(period));
  let hadir=0, alfa=0, potLate=0;
  records.forEach(r=>{ if(r.status==='masuk'){ hadir++; if(r.in){ const parts=r.in.split(':'); if(parts.length===2){ const minutes = Number(parts[0])*60 + Number(parts[1]); const planned = 8*60; if(minutes>planned){ const diff = minutes-planned; const hours = Math.ceil(diff/60); if(hours===1) potLate+=5000; else if(hours===2) potLate+=10000; else potLate+=20000; } } } } else if(r.status==='alfa'){ alfa++; } });
  const daily = (e.base||0)+(e.makan||0)+(e.bensin||0);
  const gross = daily * days; const potAlfa = alfa * daily; const totalPot = potAlfa + potLate; const taxNom = Math.round(((e.tax||0)/100)*gross); const net = gross - totalPot - taxNom;
  payload.perEmp.push({ emp:e, days, hadir, alfa, potLate, gross, potAlfa, totalPot, taxNom, net }); }); state.payrolls.push(payload); save(); renderPayrollResult(payload); renderPayrolls(); }

function renderPayrollResult(data){ const el=$('pay-res'); el.innerHTML=`<h4>Hasil Payroll — Periode ${data.period}</h4>`; const table=document.createElement('table'); table.className='slip-table'; table.innerHTML=`<thead><tr><th>Nama</th><th>Hari</th><th>Hadir</th><th>Gross</th><th>Potongan</th><th>Net</th><th>Aksi</th></tr></thead>`; const tbody=document.createElement('tbody'); data.perEmp.forEach(p=>{ const tr=document.createElement('tr'); tr.innerHTML=`<td>${p.emp.name}</td><td>${p.days}</td><td>${p.hadir}</td><td>${fmtRp(p.gross)}</td><td>${fmtRp(p.totalPot)}</td><td>${fmtRp(p.net)}</td><td><button class="ghost" onclick='openSlip("${data.id}","${p.emp.id}")'>Slip</button></td>`; tbody.appendChild(tr); }); table.appendChild(tbody); el.appendChild(table); }

function renderPayrolls(){ const el=$('rekap-list'); if(!el) return; el.innerHTML=''; if(!state.payrolls.length) return el.innerHTML='<div class="small">Belum ada payroll</div>'; state.payrolls.slice().reverse().forEach(p=>{ const div=document.createElement('div'); div.className='list-item'; div.innerHTML=`<div><strong>Periode: ${p.period}</strong><div class="small">Total karyawan: ${p.perEmp.length} • Total: ${fmtRp(p.perEmp.reduce((s,x)=>s+(x.net||0),0))}</div></div><div><button class="ghost" onclick='viewPayroll("${p.id}")'>Lihat</button></div>`; el.appendChild(div); }); const sl=$('slip-list'); if(sl){ sl.innerHTML=''; state.payrolls.forEach(p=>{ p.perEmp.forEach(pe=>{ const d=document.createElement('div'); d.className='list-item'; d.innerHTML=`<div>${pe.emp.name} • ${p.period} • ${fmtRp(pe.net)}</div><div><button class="ghost" onclick='openSlip("${p.id}","${pe.emp.id}")'>Buka Slip</button></div>`; sl.appendChild(d); }); }); } }

function viewPayroll(id){ const p=state.payrolls.find(x=>x.id===id); if(!p) return alert('Data tidak ditemukan'); const html=`<h4>Periode ${p.period}</h4><table class="slip-table"><thead><tr><th>Nama</th><th>Hari</th><th>Hadir</th><th>Gross</th><th>Potongan</th><th>Net</th></tr></thead><tbody>`+ p.perEmp.map(pe=>`<tr><td>${pe.emp.name}</td><td>${pe.days}</td><td>${pe.hadir}</td><td>${fmtRp(pe.gross)}</td><td>${fmtRp(pe.totalPot)}</td><td>${fmtRp(pe.net)}</td></tr>`).join('') + '</tbody></table>'; showModal('Rekap Payroll', html); }

// slip modal + barcode + pdf + print
function openSlip(payId, empId){ const p=state.payrolls.find(x=>x.id===payId); if(!p) return alert('payroll not found'); const pe = p.perEmp.find(x=>x.emp.id===empId); if(!pe) return alert('employee not found'); const slipHtml = buildSlipHtml(p, pe); showModal('Slip Gaji', slipHtml + `<div style="display:flex;gap:8px;margin-top:12px"><button class="primary" id="dlPdf">Download Slip (PDF)</button><button class="ghost" id="printBtn">Cetak</button></div>`); setTimeout(()=>{ const code = p.id + '|' + pe.emp.id + '|' + p.period; const svg = document.getElementById('barcode'); if(svg) JsBarcode(svg, code, {format:'CODE128', width:1.3, height:40, displayValue:false, margin:0}); document.getElementById('dlPdf').onclick = ()=> downloadSlip(p.id, pe.emp.id); document.getElementById('printBtn').onclick = ()=> printSlip(); }, 200); }

function buildSlipHtml(p, pe){ const e = pe.emp; const periodLabel = p.period; return `<div class="slip-like"><div class="slip-header"><div style="display:flex;align-items:center;gap:12px"><img src="assets/logo.png" style="width:60px"/><div><div style="font-weight:700">PT. CHOSPLENG INDONESIA</div><div class="small">Oriental Food</div></div></div><div style="text-align:right"><div class="slip-title">Slip Gaji</div><div class="small">Periode: ${periodLabel}</div></div></div><hr/> <div style="display:flex;justify-content:space-between;margin-top:8px;gap:12px"><div><strong>Nama:</strong> ${e.name}<br/><strong>Jabatan:</strong> ${e.role}</div><div style="text-align:right"><strong>Masa Kerja:</strong> ${e.start} → ${e.end}<br/><strong>Tanggal Cetak:</strong> ${new Date().toLocaleDateString()}</div></div> <table class="slip-table"><thead><tr><th>Keterangan</th><th>Jumlah (Rp)</th></tr></thead><tbody> <tr><td>Gaji Pokok (${pe.days} hari)</td><td>${fmtRp(pe.gross)}</td></tr> <tr><td>Hari Masuk</td><td>${pe.hadir}</td></tr> <tr><td>Potongan (Alpha)</td><td>${fmtRp(pe.potAlfa)}</td></tr> <tr><td>Potongan (Telat)</td><td>${fmtRp(pe.potLate)}</td></tr> <tr><td>Pajak</td><td>${fmtRp(pe.taxNom)}</td></tr> <tr><th>Total Bersih</th><th>${fmtRp(pe.net)}</th></tr> </tbody></table> <div style="display:flex;justify-content:space-between;align-items:center;margin-top:12px;gap:12px"><div style="width:60%"><div class="small">Disetujui oleh:</div><div style="display:flex;gap:30px;margin-top:30px"><div style="text-align:center"><strong>HRD</strong><div class="small">(TTD)</div></div><div style="text-align:center"><strong>Pemilik</strong><div class="small">(TTD)</div></div></div></div><div style="text-align:right"><svg id="barcode"></svg><div class="small">Kode unik: ${p.id}|${pe.emp.id}</div></div></div></div>`; }

function showModal(title, html){ const m=$('modal'); m.classList.remove('hidden'); m.innerHTML = `<div class="card"><div style="display:flex;justify-content:space-between;align-items:center"><h3>${title}</h3><button class="link" onclick="closeModal()">Tutup</button></div><div>${html}</div></div>`; }
function closeModal(){ $('modal').classList.add('hidden'); $('modal').innerHTML=''; }

async function downloadSlip(payId, empId){ const p=state.payrolls.find(x=>x.id===payId); const pe = p.perEmp.find(x=>x.emp.id===empId); const container = document.createElement('div'); container.style.position='fixed'; container.style.left='-9999px'; container.innerHTML = buildSlipHtml(p, pe); document.body.appendChild(container); const svg = container.querySelector('#barcode'); const code = p.id + '|' + pe.emp.id + '|' + p.period; JsBarcode(svg, code, {format:'CODE128', width:1.3, height:40, displayValue:false, margin:0}); const xml = new XMLSerializer().serializeToString(svg); const svg64 = btoa(xml); const img64 = 'data:image/svg+xml;base64,' + svg64; const { jsPDF } = window.jspdf; const doc = new jsPDF({unit:'pt', format:'a4'}); doc.setFontSize(14); doc.text('PT. CHOSPLENG INDONESIA', 40, 40); doc.setFontSize(11); doc.text('Slip Gaji - Periode: ' + p.period, 40, 60); const logo = new Image(); logo.src='assets/logo.png'; await new Promise(r=> logo.onload = r); doc.addImage(logo, 'PNG', 420, 20, 120, 40); const rows = [ ['Nama', pe.emp.name], ['Jabatan', pe.emp.role], ['Periode', `${pe.emp.start} → ${pe.emp.end}`], ['Gaji Kotor', fmtRp(pe.gross)], ['Potongan (Alpha + Telat)', fmtRp(pe.totalPot)], ['Pajak', fmtRp(pe.taxNom)], ['Gaji Bersih', fmtRp(pe.net)] ]; doc.autoTable({ startY: 90, head:[['Keterangan','Nilai']], body: rows, theme:'grid', styles:{fontSize:10} }); const img = new Image(); img.src = img64; await new Promise(r=> img.onload = r); doc.addImage(img, 'PNG', 420, doc.lastAutoTable.finalY + 20, 140, 36); doc.save(`slip_${pe.emp.name}_${p.period}.pdf`); container.remove(); }

function printSlip(){ const modal = $('modal'); if(!modal) return; const inner = modal.querySelector('.card').innerHTML; const wnd = window.open('', '_blank'); wnd.document.write(`<html><head><title>Slip</title><link rel="stylesheet" href="styles.css"></head><body>${inner}</body></html>`); wnd.document.close(); wnd.focus(); setTimeout(()=>{ wnd.print(); wnd.close(); }, 600); }

// helper to ensure demo data exists (optional)
function ensureSample(){ if(state.employees.length===0){ state.employees.push({id:'e1',name:'Rangga',role:'Cook',start:'2024-01-01',end:'2025-12-31',base:50000,makan:10000,bensin:10000,tax:0}); state.employees.push({id:'e2',name:'Willy',role:'Kasir / Cookhelper',start:'2024-06-01',end:'2025-12-31',base:50000,makan:10000,bensin:10000,tax:0}); save(); } }
ensureSample();
