
// Simple payroll app (client-side, localStorage)
// Rules:
// per day = 70000 (50k base + 10k makan + 10k bensin)
// alfa = -70000
// late 1 hour = -5000, 2 hours = -10000, >=3 hours = -20000
// late without reason = -20000

const STORAGE_KEY = 'chospleng_data_v1';
const USERS = { hrd: 'hrd123', owner: 'owner123' }; // demo
let state = { users: USERS, employees: [], attendance: [], lastPayroll: null };

// helpers
const $ = id => document.getElementById(id);
const fmtRp = n => 'Rp ' + Number(n||0).toLocaleString('id-ID');

function load(){ const raw = localStorage.getItem(STORAGE_KEY); if(raw){ state=JSON.parse(raw);} else { save(); } }
function save(){ localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }

function auth(username,password){
  if(state.users[username] && state.users[username]===password){ localStorage.setItem('chospleng_auth', username); return true; }
  return false;
}
function logout(){ localStorage.removeItem('chospleng_auth'); showView('login'); }

function isAuth(){ return !!localStorage.getItem('chospleng_auth'); }
function currentUser(){ return localStorage.getItem('chospleng_auth'); }

// sample data
function loadSample(){
  state.employees = [
    {id: 'e1', name: 'Rangga', role:'Cook', start:'2024-01-01', base:50000, makan:10000, bensin:10000, tax:0},
    {id: 'e2', name: 'Willy', role:'Kasir / Cookhelper', start:'2024-06-01', base:50000, makan:10000, bensin:10000, tax:0}
  ];
  save(); renderAll(); alert('Sample data dimuat');
}

// UI routing
function showView(view){
  document.querySelectorAll('.view').forEach(v=>v.classList.remove('active'));
  const map = { login: 'view-login', dashboard: 'view-dashboard', karyawan: 'view-karyawan', absensi: 'view-absensi', payroll: 'view-payroll', backup: 'view-backup' };
  if(!isAuth()){ document.getElementById('view-login').classList.add('active'); document.getElementById('page-title').innerText='Login'; return; }
  document.getElementById(map[view]).classList.add('active');
  document.getElementById('page-title').innerText = view.charAt(0).toUpperCase() + view.slice(1);
  renderAll();
}

// render helpers
function renderAll(){
  renderStats(); renderShortList(); renderKaryawanList(); renderAbsensiForm(); renderPayrollList();
}

function renderStats(){
  $('stat-karyawan').innerText = state.employees.length;
  $('stat-absensi').innerText = state.attendance.length;
  $('stat-payroll').innerText = state.lastPayroll ? fmtRp(state.lastPayroll.total||0) : 'Rp 0';
}

function renderShortList(){
  const el = $('short-list'); el.innerHTML = '';
  state.employees.forEach(e=> el.innerHTML += `<div class="row">${e.name} <span class="small">${e.role}</span></div>`);
}

// Karyawan
function renderKaryawanList(){
  const el = $('karyawan-list'); el.innerHTML = '';
  if(!state.employees.length){ el.innerHTML = '<div class="small">Belum ada karyawan</div>'; return; }
  state.employees.forEach(emp=>{
    const div = document.createElement('div'); div.className='row';
    div.innerHTML = `<div><strong>${emp.name}</strong><div class="small">${emp.role} • Mulai ${emp.start}</div></div>
      <div class="row"><button class="ghost" data-id="${emp.id}" onclick="editEmp('${emp.id}')">Edit</button>
      <button class="ghost" onclick="removeEmp('${emp.id}')">Hapus</button></div>`;
    el.appendChild(div);
  });
}

function editEmp(id){
  const e = state.employees.find(x=>x.id===id);
  const form = modalForm('Edit Karyawan', `
    <label>Nama</label><input id="m_name" value="${e.name}" />
    <label>Jabatan</label><input id="m_role" value="${e.role}" />
    <label>Tanggal Mulai</label><input id="m_start" type="date" value="${e.start}" />
    <label>Gaji Pokok (per hari)</label><input id="m_base" type="number" value="${e.base}" />
    <label>Uang Makan</label><input id="m_makan" type="number" value="${e.makan}" />
    <label>Uang Bensin</label><input id="m_bensin" type="number" value="${e.bensin}" />
    <label>Pajak (%)</label><input id="m_tax" type="number" value="${e.tax||0}" />
  `, ()=>{
    e.name = $('m_name').value; e.role=$('m_role').value; e.start=$('m_start').value; e.base=Number($('m_base').value); e.makan=Number($('m_makan').value); e.bensin=Number($('m_bensin').value); e.tax=Number($('m_tax').value);
    save(); closeModal(); renderAll();
  });
}

// remove emp
function removeEmp(id){ if(confirm('Hapus karyawan ini?')){ state.employees = state.employees.filter(e=>e.id!==id); state.attendance = state.attendance.filter(a=>a.empId!==id); save(); renderAll(); } }

// add employee
function addEmployee(){
  modalForm('Tambah Karyawan', `
    <label>Nama</label><input id="m_name" />
    <label>Jabatan</label><input id="m_role" />
    <label>Tanggal Mulai</label><input id="m_start" type="date" />
    <label>Gaji Pokok (per hari)</label><input id="m_base" type="number" value="50000" />
    <label>Uang Makan</label><input id="m_makan" type="number" value="10000" />
    <label>Uang Bensin</label><input id="m_bensin" type="number" value="10000" />
    <label>Pajak (%)</label><input id="m_tax" type="number" value="0" />
  `, ()=>{
    const id = 'e'+Date.now();
    state.employees.push({ id, name:$('m_name').value, role:$('m_role').value, start:$('m_start').value, base:Number($('m_base').value), makan:Number($('m_makan').value), bensin:Number($('m_bensin').value), tax:Number($('m_tax').value) });
    save(); closeModal(); renderAll();
  });
}

// Absensi
function renderAbsensiForm(){
  const sel = $('absensi-emp'); sel.innerHTML=''; state.employees.forEach(e=> sel.innerHTML += `<option value="${e.id}">${e.name}</option>`);
  const list = $('absensi-list'); list.innerHTML='';
  const rows = state.attendance.slice().sort((a,b)=>b.date.localeCompare(a.date));
  if(!rows.length){ list.innerHTML = '<div class="small">Belum ada data absensi</div>'; return; }
  rows.forEach(r=>{
    const emp = state.employees.find(x=>x.id===r.empId) || {name:'-'}
    const div = document.createElement('div'); div.className='row'; div.innerHTML = `<div><strong>${emp.name}</strong> <div class="small">${r.date} • ${r.status} • Jam: ${r.in||'-'}</div></div>
      <div><button class="ghost" onclick='removeAbs("${r.id}")'>Hapus</button></div>`;
    list.appendChild(div);
  });
}

function removeAbs(id){ if(confirm('Hapus absensi?')){ state.attendance = state.attendance.filter(a=>a.id!==id); save(); renderAll(); } }

function addAbsensiFromForm(e){
  e.preventDefault();
  const empId = $('absensi-emp').value; const date = $('absensi-date').value; const status = $('absensi-status').value; const timeIn = $('absensi-in').value || null;
  if(!empId||!date){ alert('Pilih karyawan & tanggal'); return; }
  const id = 'a'+Date.now();
  state.attendance.push({ id, empId, date, status, in: timeIn });
  save(); renderAll(); $('absensiForm').reset();
}

// Payroll generation
function computePayrollForPeriod(month){ // month format yyyy-mm
  const emps = state.employees;
  const att = state.attendance.filter(a=>a.date.startsWith(month));
  const perEmp = emps.map(e=>{
    const entries = att.filter(a=>a.empId===e.id);
    let hadir=0, alfa=0, lateCount=0, lateAmount=0, otherPot=0;
    entries.forEach(r=>{
      if(r.status==='masuk'){ hadir++; // check lateness
        if(r.in){ // compute hours late from 08:00
          const planned = 8*60; const parts = r.in.split(':'); const minutes = Number(parts[0])*60 + Number(parts[1]);
          const diffMin = minutes - planned;
          if(diffMin>0){
            const hours = Math.floor(diffMin/60);
            // determine potongan
            if(hours<=1) lateAmount += 5000;
            else if(hours===2) lateAmount += 10000;
            else lateAmount += 20000;
            lateCount++;
          }
        }
      } else if(r.status==='alfa'){ alfa++; }
    });
    const daily = (e.base||0) + (e.makan||0) + (e.bensin||0);
    const gross = daily * hadir;
    const potAlfa = alfa * daily;
    const potLate = lateAmount;
    const totalPot = potAlfa + potLate + otherPot;
    const taxNom = Math.round(((e.tax||0)/100) * gross);
    const net = gross - totalPot - taxNom;
    return { emp: e, hadir, alfa, lateCount, gross, potAlfa, potLate, otherPot, taxNom, net };
  });
  const total = perEmp.reduce((s,p)=>s+(p.net||0),0);
  const payload = { month, generatedAt: new Date().toISOString(), perEmp, total };
  state.lastPayroll = { month, total };
  save();
  return payload;
}

// render payroll result
function renderPayrollList(){
  const el = $('payroll-result'); el.innerHTML='';
  if(!state.employees.length){ el.innerHTML='<div class="small">Tambah karyawan dulu</div>'; return; }
  const html = `<div class="small">Pilih periode lalu tekan Generate.</div>`;
  el.innerHTML = html;
}

// PDF slip
async function genSlip(pay, item){
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({unit:'mm',format:'a4'});
  doc.setFontSize(12);
  // header
  const logo = new Image();
  logo.src = 'assets/logo.png';
  await new Promise(r=>logo.onload=r);
  doc.addImage(logo, 'PNG', 15, 10, 25, 25);
  doc.setFontSize(16); doc.text('PT. CHOSPLENG INDONESIA', 50, 18);
  doc.setFontSize(12); doc.text('Slip Gaji Karyawan', 50, 26);
  doc.setFontSize(10); doc.text('Periode: ' + pay.month, 160, 18, {align:'right'});
  // employee info
  doc.setLineWidth(0.2); doc.line(15,40,195,40);
  doc.setFontSize(11);
  doc.text(`Nama: ${item.emp.name}`, 15,48);
  doc.text(`Jabatan: ${item.emp.role}`, 15,55);
  doc.text(`Masa Kerja (mulai): ${item.emp.start}`, 15,62);
  // income table
  doc.setFontSize(10);
  doc.text('Rincian Penghasilan:', 15,72);
  doc.autoTable({ startY:76, head:[['Keterangan','Jumlah (Rp)']], body:[[ 'Gaji Kotor', item.gross ], ['Potongan (Total)', item.potAlfa + item.potLate + item.otherPot ], ['Pajak', item.taxNom ]], theme:'grid', styles:{fontSize:10} });
  const finalY = doc.lastAutoTable.finalY || 110;
  doc.setFontSize(12); doc.text('Gaji Bersih Diterima: ' + fmtRp(item.net), 15, finalY+12);
  doc.setFontSize(9); doc.text('Dicetak otomatis oleh sistem.', 15, finalY+22);
  doc.save(`slip_${item.emp.name}_${pay.month}.pdf`);
}

// modal helpers
function modalForm(title, inner, onSave){
  const root = document.getElementById('modal-root');
  root.innerHTML = `<div class="modal"><div class="card"><h3>${title}</h3><div>${inner}</div><div style="display:flex;gap:8px;margin-top:12px"><button id="m_save" class="primary">Simpan</button><button id="m_close" class="ghost">Batal</button></div></div></div>`;
  document.getElementById('m_close').onclick = closeModal;
  document.getElementById('m_save').onclick = onSave;
  return root;
}
function closeModal(){ document.getElementById('modal-root').innerHTML=''; }

// Export JSON/CSV
function exportJSON(){ const blob = new Blob([JSON.stringify(state,null,2)],{type:'application/json'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='chospleng-backup.json'; a.click(); }
function importJSON(file){ const reader=new FileReader(); reader.onload=e=>{ try{ state = JSON.parse(e.target.result); save(); renderAll(); alert('Data berhasil diimport'); }catch(err){ alert('File tidak valid'); } } ; reader.readAsText(file); }
function exportCSVLastPayroll(){
  const last = state.lastPayroll;
  if(!last){ alert('Belum generate payroll'); return; }
  const payload = computePayrollForPeriod(last.month);
  const rows = [['Nama','Role','Hadir','Gross','Potongan','Pajak','Net']];
  payload.perEmp.forEach(p=> rows.push([p.emp.name,p.emp.role,p.hadir,p.gross,p.potAlfa + p.potLate + p.otherPot,p.taxNom,p.net]));
  const csv = rows.map(r=> r.map(c=>`"${String(c).replace(/"/g,'""')}"`).join(',')).join('\n');
  const blob = new Blob([csv],{type:'text/csv'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='payroll_'+last.month+'.csv'; a.click();
}

// events
document.addEventListener('DOMContentLoaded', ()=>{
  load();
  // wire nav
  document.querySelectorAll('.nav-btn').forEach(b=> b.onclick = ()=> showView(b.dataset.view || b.textContent.toLowerCase()));
  document.getElementById('menu-toggle').onclick = ()=> document.querySelector('.sidebar').classList.toggle('open');
  document.getElementById('btnAddKaryawan').onclick = addEmployee;
  document.getElementById('btnImportSample').onclick = ()=>{ loadSample(); };
  document.getElementById('btnAddAbsensi').onclick = addAbsensiFromForm;
  document.getElementById('btnGeneratePayroll').onclick = ()=>{
    const month = $('payroll-period').value;
    if(!month){ alert('Pilih periode'); return; }
    const pay = computePayrollForPeriod(month);
    state.lastPayroll = { month: pay.month, total: pay.total };
    save();
    // render result table
    const out = document.getElementById('payroll-result'); out.innerHTML = '<h4>Hasil Payroll</h4>';
    const table = document.createElement('table'); table.style.width='100%'; table.innerHTML = '<thead><tr><th>Nama</th><th>Hadir</th><th>Gross</th><th>Potongan</th><th>Pajak</th><th>Net</th><th>Aksi</th></tr></thead>';
    const tbody = document.createElement('tbody');
    pay.perEmp.forEach(p=>{
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${p.emp.name}</td><td>${p.hadir}</td><td>${fmtRp(p.gross)}</td><td>${fmtRp(p.potAlfa + p.potLate + p.otherPot)}</td><td>${fmtRp(p.taxNom)}</td><td>${fmtRp(p.net)}</td><td><button class="ghost" onclick='genSlip(${JSON.stringify(JSON.stringify(pay))}, ${JSON.stringify(JSON.stringify(p))})'>Cetak Slip</button></td>`;
      tbody.appendChild(tr);
    });
    table.appendChild(tbody); out.appendChild(table);
  };

  // login
  document.getElementById('loginForm').onsubmit = (e)=>{
    e.preventDefault();
    const u = $('username').value, p = $('password').value;
    if(auth(u,p)){ alert('Login berhasil: '+u); showView('dashboard'); renderAll(); } else alert('Login gagal');
  };
  document.getElementById('fillDemo').onclick = ()=>{ $('username').value='hrd'; $('password').value='hrd123'; };

  // backup buttons
  document.getElementById('btnExportJSON').onclick = exportJSON;
  document.getElementById('btnImportJSON').onclick = ()=> $('fileInput').click();
  document.getElementById('fileInput').onchange = (e)=> importJSON(e.target.files[0]);
  document.getElementById('btnExportCSV').onclick = exportCSVLastPayroll;

  // logout
  document.getElementById('logoutBtn').onclick = ()=>{ logout(); };

  // initial view
  if(isAuth()) showView('dashboard'); else showView('login');
});
