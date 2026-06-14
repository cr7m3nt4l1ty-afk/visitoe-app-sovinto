let purposeChart, hostChart;

function formatDateTime(dt) { return dt ? new Date(dt).toLocaleString('ru-RU') : ''; }
function escapeHtml(str) { if (!str) return ''; return str.replace(/[&<>]/g, m => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;' }[m])); }

// Заглавная буква после каждого пробела (включая дефис)
function capitalizeWords(str) {
  if (!str) return '';
  return str.replace(/(^|\s|-)(\S)/g, (_, sep, ch) => sep + ch.toUpperCase());
}

function capitalizeInput(e) {
  let input = e.target;
  let start = input.selectionStart;
  let end = input.selectionEnd;
  let value = input.value;
  let newValue = capitalizeWords(value);
  if (newValue !== value) {
    input.value = newValue;
    input.setSelectionRange(start, end);
  }
}
document.querySelectorAll('input[name="full_name"], input[name="company"], input[name="purpose"], input[name="host_employee"]').forEach(f => f.addEventListener('input', capitalizeInput));

function updateFullPhone() {
  const code = document.getElementById('countryCode').value;
  const digits = document.getElementById('phoneDigits').value.replace(/\D/g, '').slice(0,10);
  const full = code + digits;
  document.getElementById('fullPhone').value = full;
  document.getElementById('phoneDigits').value = digits;
}
document.getElementById('phoneDigits')?.addEventListener('input', (e) => {
  e.target.value = e.target.value.replace(/\D/g, '').slice(0,10);
  updateFullPhone();
});
document.getElementById('countryCode')?.addEventListener('change', updateFullPhone);
updateFullPhone();

async function loadVisitors() {
  const p = new URLSearchParams();
  const df = document.getElementById('filterDateFrom').value; if (df) p.append('dateFrom', df);
  const dt = document.getElementById('filterDateTo').value; if (dt) p.append('dateTo', dt);
  const s = document.getElementById('filterSearch').value; if (s) p.append('search', s);
  const res = await fetch('/api/visitors?' + p.toString());
  const visitors = await res.json();
  const tbody = document.getElementById('visitorsTableBody');
  tbody.innerHTML = '';
  visitors.forEach(v => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${v.id}</td>
      <td><strong>${escapeHtml(capitalizeWords(v.full_name))}</strong></td>
      <td>${escapeHtml(capitalizeWords(v.company)) || '-'}</td>
      <td>${escapeHtml(capitalizeWords(v.purpose))}</td>
      <td>${escapeHtml(capitalizeWords(v.host_employee))}</td>
      <td>${formatDateTime(v.check_in_time)}</td>
      <td>${formatDateTime(v.check_out_time) || '—'}</td>
      <td>
        ${!v.check_out_time ? `<button class="btn btn-sm btn-outline-warning me-1 checkout-btn" data-id="${v.id}">Выход</button>` : ''}
        <button class="btn btn-sm btn-outline-primary edit-btn" data-id="${v.id}" data-name="${escapeHtml(v.full_name)}" data-company="${escapeHtml(v.company)||''}" data-purpose="${escapeHtml(v.purpose)}" data-host="${escapeHtml(v.host_employee)}" data-phone="${escapeHtml(v.contact_phone)||''}" data-notes="${escapeHtml(v.notes)||''}">✎</button>
        <button class="btn btn-sm btn-outline-danger delete-btn" data-id="${v.id}">✖</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
  attachButtons();
}
function attachButtons() {
  document.querySelectorAll('.checkout-btn').forEach(btn => btn.onclick = async () => {
    await fetch('/api/visitors/'+btn.dataset.id+'/checkout',{method:'PUT'});
    loadVisitors();
  });
  document.querySelectorAll('.edit-btn').forEach(btn => btn.onclick = async () => {
    const id=btn.dataset.id;
    let newName = prompt('ФИО:', btn.dataset.name); if (!newName) return; newName = capitalizeWords(newName);
    let newCompany = prompt('Организация:', btn.dataset.company); if (newCompany) newCompany = capitalizeWords(newCompany);
    let newPurpose = prompt('Цель:', btn.dataset.purpose); if (newPurpose) newPurpose = capitalizeWords(newPurpose);
    let newHost = prompt('Принимающий:', btn.dataset.host); if (newHost) newHost = capitalizeWords(newHost);
    const newPhone = prompt('Телефон (полный номер с кодом):', btn.dataset.phone);
    const newNotes = prompt('Примечания:', btn.dataset.notes);
    await fetch(`/api/visitors/${id}`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({full_name:newName,company:newCompany,purpose:newPurpose,host_employee:newHost,contact_phone:newPhone,notes:newNotes})});
    loadVisitors();
  });
  document.querySelectorAll('.delete-btn').forEach(btn => btn.onclick = async () => { if(confirm('Удалить запись?')) { await fetch('/api/visitors/'+btn.dataset.id,{method:'DELETE'}); loadVisitors(); } });
}

document.getElementById('visitorForm').addEventListener('submit', async e => {
  e.preventDefault();
  const form = e.target;
  let full_name = capitalizeWords(form.full_name.value.trim());
  let company = capitalizeWords(form.company.value.trim());
  let purpose = capitalizeWords(form.purpose.value.trim());
  let host_employee = capitalizeWords(form.host_employee.value.trim());
  const contact_phone = document.getElementById('fullPhone').value;
  const notes = form.notes.value;

  if (!full_name || !company || !purpose || !host_employee || !contact_phone) {
    document.getElementById('regMessage').innerHTML = '<div class="alert alert-danger">❌ Заполните все поля, кроме примечаний</div>';
    return;
  }

  const data = { full_name, company, purpose, host_employee, contact_phone, notes };
  const res = await fetch('/api/visitors',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});
  const result = await res.json();
  const msg = document.getElementById('regMessage');
  if(res.ok){ msg.innerHTML=`<div class="alert alert-success">✅ Зарегистрирован ID: ${result.id}</div>`; form.reset(); document.getElementById('phoneDigits').value=''; updateFullPhone(); setTimeout(()=>msg.innerHTML='',3000); loadVisitors(); }
  else msg.innerHTML=`<div class="alert alert-danger">❌ ${result.error||'Ошибка'}</div>`;
});

document.getElementById('applyFilter').addEventListener('click', loadVisitors);
document.getElementById('resetFilter').addEventListener('click', () => {
  document.getElementById('filterDateFrom').value = '';
  document.getElementById('filterDateTo').value = '';
  document.getElementById('filterSearch').value = '';
  loadVisitors();
});

document.getElementById('generateReport').addEventListener('click',async()=>{
  const p=new URLSearchParams();
  const df=document.getElementById('reportDateFrom').value; if(df)p.append('dateFrom',df);
  const dt=document.getElementById('reportDateTo').value; if(dt)p.append('dateTo',dt);
  const res=await fetch('/api/reports?'+p.toString());
  const r=await res.json();
  let html=`<div class="alert alert-info">📊 Всего: ${r.totalVisitors}</div><div class="row"><div class="col-md-6"><h6>По целям:</h6><ul class="list-group">`;
  r.byPurpose.forEach(x=>html+=`<li class="list-group-item d-flex justify-content-between">${escapeHtml(x.purpose)}<span class="badge bg-primary">${x.count}</span></li>`);
  html+=`</ul></div><div class="col-md-6"><h6>По принимающим:</h6><ul class="list-group">`;
  r.byHost.forEach(x=>html+=`<li class="list-group-item d-flex justify-content-between">${escapeHtml(x.host_employee)}<span class="badge bg-secondary">${x.count}</span></li>`);
  html+=`</ul></div></div>`;
  document.getElementById('reportOutput').innerHTML=html;
  if(purposeChart)purposeChart.destroy(); if(hostChart)hostChart.destroy();
  purposeChart=new Chart(document.getElementById('purposeChart'),{type:'bar',data:{labels:r.byPurpose.map(x=>x.purpose),datasets:[{label:'Количество',data:r.byPurpose.map(x=>x.count),backgroundColor:'#4f46e5'}]}});
  hostChart=new Chart(document.getElementById('hostChart'),{type:'pie',data:{labels:r.byHost.map(x=>x.host_employee),datasets:[{data:r.byHost.map(x=>x.count),backgroundColor:['#f97316','#10b981','#3b82f6','#8b5cf6','#ec489a']}]}});
});

document.getElementById('downloadCSV').addEventListener('click',()=>{
  const p=new URLSearchParams();
  const df=document.getElementById('reportDateFrom').value; if(df)p.append('dateFrom',df);
  const dt=document.getElementById('reportDateTo').value; if(dt)p.append('dateTo',dt);
  window.location.href='/api/reports/csv?'+p.toString();
});

function showPanel(panelId){
  document.querySelectorAll('.tab-panel').forEach(p=>p.style.display='none');
  document.getElementById(panelId+'Panel').style.display='block';
  document.querySelectorAll('.nav-link-custom').forEach(l=>l.classList.remove('active'));
  document.querySelector(`[data-tab="${panelId}"]`).classList.add('active');
}
document.querySelectorAll('.nav-link-custom').forEach(link=>{
  link.addEventListener('click',e=>{ e.preventDefault(); showPanel(link.dataset.tab); });
});
showPanel('registration');

let darkMode = localStorage.getItem('darkMode') === 'true';
function applyTheme() {
  if (darkMode) {
    document.body.classList.add('dark');
    document.getElementById('sideThemeIcon')?.classList.remove('fa-moon');
    document.getElementById('sideThemeIcon')?.classList.add('fa-sun');
  } else {
    document.body.classList.remove('dark');
    document.getElementById('sideThemeIcon')?.classList.remove('fa-sun');
    document.getElementById('sideThemeIcon')?.classList.add('fa-moon');
  }
}
document.getElementById('themeToggleSide').addEventListener('click', () => {
  darkMode = !darkMode;
  localStorage.setItem('darkMode', darkMode);
  applyTheme();
});
applyTheme();
loadVisitors();
setInterval(()=>{ document.getElementById('currentDateTime').innerText = new Date().toLocaleString(); },1000);
