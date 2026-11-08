// ================================================================
// STATE
// ================================================================
let materials = [];
let photos = [];
let logoData = '';
let orcamentos = JSON.parse(localStorage.getItem('obrasync_orcs') || '[]');
let matBank = JSON.parse(localStorage.getItem('obrasync_mats') || '[]');
let eventos = JSON.parse(localStorage.getItem('obrasync_eventos') || '[]');
let sigCtx = {}, sigDrawing = {}, sigLast = {};
let isLightMode = localStorage.getItem('obrasync_theme') === 'light';
let calDate = new Date();
let orcCounter = parseInt(localStorage.getItem('obrasync_counter') || '0');

// ================================================================
// INIT
// ================================================================
window.addEventListener('obrasync:ready', () => {
  if(isLightMode) document.body.classList.add('light-mode');
  document.getElementById('themeBtn').innerHTML = isLightMode ? '<i class="fas fa-moon"></i>' : '<i class="fas fa-moon"></i>';
  
  const today = new Date().toISOString().split('T')[0];
  document.getElementById('orcDate').value = today;
  document.getElementById('eventoData').value = today;
  
  initSignature('sigCanvas');
  initSignature('sigCanvas2');
  addMaterial(); addMaterial(); addMaterial();
  updateCountBadge();
  renderOrcamentos();
  renderClientes();
  renderMatBank();
  renderCalendar();
  renderTemplateChips();
  updateDashboard();
  updatePixCard();
  
  // Save empresa data on input
  ['empresa','cnpj','empTel','empEmail','empSite','pixKey','pixNome'].forEach(id => {
    const el = document.getElementById(id);
    if(el) {
      const saved = localStorage.getItem('obrasync_emp_' + id);
      if(saved) el.value = saved;
      el.addEventListener('input', () => {
        localStorage.setItem('obrasync_emp_' + id, el.value);
        if(id === 'pixKey' || id === 'pixNome') updatePixCard();
      });
    }
  });
  
  // Restore logo
  const savedLogo = localStorage.getItem('obrasync_logo');
  if(savedLogo) { logoData = savedLogo; showLogoPreview(savedLogo); }

  // Mobile nav hamburger fallback - pagamento select listener
  document.getElementById('pagamento').addEventListener('change', function() {
    document.getElementById('pixCard').style.display = this.value === 'PIX' ? 'block' : 'none';
  });
});

function toggleTheme() {
  isLightMode = !isLightMode;
  document.body.classList.toggle('light-mode', isLightMode);
  localStorage.setItem('obrasync_theme', isLightMode ? 'light' : 'dark');
  document.getElementById('themeBtn').innerHTML = isLightMode ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
}

// ================================================================
// NAVIGATION
// ================================================================
function showPage(id) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
  document.getElementById('page-' + id).classList.add('active');
  const pages = ['novo','orcamentos','clientes','agenda','materiais','dashboard'];
  const idx = pages.indexOf(id);
  const tabs = document.querySelectorAll('.nav-tab');
  if(idx >= 0 && tabs[idx]) tabs[idx].classList.add('active');
  if(id === 'dashboard') updateDashboard();
  if(id === 'orcamentos') renderOrcamentos();
  if(id === 'clientes') renderClientes();
  if(id === 'materiais') renderMatBank();
  if(id === 'agenda') renderCalendar();
}

function scrollToSection(id) {
  document.getElementById(id)?.scrollIntoView({behavior:'smooth',block:'start'});
}

// ================================================================
// NUMERO DO ORÇAMENTO
// ================================================================
function generateOrcNum() {
  orcCounter++;
  localStorage.setItem('obrasync_counter', orcCounter);
  const year = new Date().getFullYear();
  return `ORC-${year}-${String(orcCounter).padStart(3,'0')}`;
}

// ================================================================
// TEMPLATES
// ================================================================
const TEMPLATES = [
  { label:'⚡ Elétrica', icon:'fa-bolt', serviceType:'⚡ Elétrica',
    materials:[{name:'Fio 2,5mm (rolo 50m)',qty:1,unit:'rl',price:85},{name:'Disjuntor 20A',qty:2,unit:'un',price:22},{name:'Tomada 2P+T',qty:4,unit:'un',price:12},{name:'Caixa de passagem',qty:2,unit:'un',price:8}],
    garantia:'12 meses para instalação', serviceDesc:'Instalação/substituição de circuitos elétricos conforme norma NBR 5410.' },
  { label:'🎨 Pintura', icon:'fa-paint-roller', serviceType:'🎨 Pintura',
    materials:[{name:'Tinta Acrílica 18L',qty:2,unit:'lt',price:120},{name:'Massa corrida 25kg',qty:1,unit:'sc',price:45},{name:'Rolo de lã 23cm',qty:3,unit:'un',price:18},{name:'Lixa 120',qty:10,unit:'un',price:3}],
    garantia:'6 meses contra descascamento', serviceDesc:'Pintura interna/externa com preparo de superfície, massa corrida e 2 demãos de tinta acrílica.' },
  { label:'🔧 Hidráulica', icon:'fa-faucet', serviceType:'🔧 Hidráulica',
    materials:[{name:'Tubo PVC 25mm (6m)',qty:3,unit:'br',price:28},{name:'Joelho 90° 25mm',qty:8,unit:'un',price:4},{name:'Registro de pressão',qty:2,unit:'un',price:35},{name:'Teflon rolo',qty:5,unit:'un',price:3}],
    garantia:'6 meses para vazamentos', serviceDesc:'Instalação/reparo de tubulações hidráulicas com materiais de primeira linha.' },
  { label:'🏠 Reforma', icon:'fa-house-damage', serviceType:'🏠 Reforma',
    materials:[{name:'Cimento 50kg',qty:5,unit:'sc',price:35},{name:'Areia lavada m³',qty:1,unit:'m³',price:130},{name:'Tijolo furado',qty:200,unit:'un',price:0.85}],
    garantia:'Conforme acordo', serviceDesc:'Reforma geral incluindo alvenaria, acabamentos e serviços correlatos.' },
  { label:'🔩 Manutenção', icon:'fa-tools', serviceType:'🔩 Manutenção',
    materials:[{name:'Parafusos variados',qty:1,unit:'cx',price:25},{name:'Massa epóxi',qty:1,unit:'un',price:18}],
    garantia:'30 dias', serviceDesc:'Manutenção preventiva e corretiva conforme levantamento.' },
];

function renderTemplateChips() {
  const wrap = document.getElementById('templateChips');
  wrap.innerHTML = TEMPLATES.map((t,i) => `
    <button class="template-chip" onclick="applyTemplate(${i})">
      <i class="fas ${t.icon}"></i> ${t.label}
    </button>
  `).join('');
}

function applyTemplate(i) {
  const t = TEMPLATES[i];
  document.getElementById('serviceType').value = t.serviceType;
  document.getElementById('garantia').value = t.garantia;
  document.getElementById('serviceDesc').value = t.serviceDesc;
  materials = t.materials.map((m,j) => ({id:Date.now()+j,...m,total:m.qty*m.price}));
  renderMaterials();
  updateTotals();
  toast(`Template "${t.label}" aplicado!`, 'success');
  scrollToSection('sec-servico');
}

// ================================================================
// MATERIALS TABLE
// ================================================================
function addMaterial(data={}) {
  const id = Date.now() + Math.random();
  materials.push({id, name:data.name||'', qty:data.qty||1, unit:data.unit||'un', price:data.price||0, total:0});
  renderMaterials();
}

function renderMaterials() {
  const margem = parseFloat(document.getElementById('margemLucro')?.value) || 0;
  const tbody = document.getElementById('materialsBody');
  tbody.innerHTML = materials.map((m,i) => {
    const totalComLucro = m.total * (1 + margem/100);
    return `<tr>
      <td class="autocomplete-wrap">
        <input value="${escHtml(m.name)}" oninput="updateMat(${i},'name',this.value);showAutocomplete(${i},this)" onblur="hideAutocomplete(${i})" placeholder="Nome do material">
        <div class="autocomplete-list" id="ac_${i}"></div>
      </td>
      <td><input type="number" value="${m.qty}" min="0" step="0.01" oninput="updateMat(${i},'qty',this.value)" style="width:60px"></td>
      <td><input value="${escHtml(m.unit)}" oninput="updateMat(${i},'unit',this.value)" style="width:55px"></td>
      <td><input type="number" value="${m.price||''}" min="0" step="0.01" oninput="updateMat(${i},'price',this.value)" placeholder="0,00"></td>
      <td class="total-cell">R$ ${fmt(m.total)}</td>
      <td class="profit-cell" title="Com margem de lucro de ${margem}%">R$ ${fmt(totalComLucro)}</td>
      <td><button class="btn btn-danger btn-sm btn-icon" onclick="removeMat(${i})"><i class="fas fa-trash"></i></button></td>
    </tr>`;
  }).join('');
  updateTotals();
}

function updateMat(i, field, val) {
  if(!materials[i]) return;
  materials[i][field] = (field==='name'||field==='unit') ? val : parseFloat(val)||0;
  materials[i].total = materials[i].qty * materials[i].price;
  const tEl = document.querySelectorAll('#materialsBody tr')[i];
  if(tEl) {
    const tc = tEl.querySelector('.total-cell');
    const margem = parseFloat(document.getElementById('margemLucro')?.value)||0;
    const pc = tEl.querySelector('.profit-cell');
    if(tc) tc.textContent = 'R$ ' + fmt(materials[i].total);
    if(pc) pc.textContent = 'R$ ' + fmt(materials[i].total*(1+margem/100));
  }
  updateTotals();
}

function removeMat(i) {
  materials.splice(i,1);
  renderMaterials();
}

// ================================================================
// AUTOCOMPLETE
// ================================================================
function showAutocomplete(idx, input) {
  const val = input.value.toLowerCase();
  const list = document.getElementById('ac_'+idx);
  if(!val || val.length < 2) { list.classList.remove('show'); return; }
  const matches = matBank.filter(m => m.name.toLowerCase().includes(val)).slice(0,8);
  if(!matches.length) { list.classList.remove('show'); return; }
  list.innerHTML = matches.map(m => `
    <div class="autocomplete-item" onmousedown="applyAutoMat(${idx},'${escHtml(m.name)}',${m.price},'${escHtml(m.unit)}')">
      <div>
        <div>${m.name}</div>
        <div class="mat-unit">${m.category||''}</div>
      </div>
      <div class="mat-price">R$ ${fmt(m.price)}/${m.unit}</div>
    </div>
  `).join('');
  list.classList.add('show');
}

function hideAutocomplete(idx) {
  setTimeout(() => {
    const list = document.getElementById('ac_'+idx);
    if(list) list.classList.remove('show');
  }, 200);
}

function applyAutoMat(idx, name, price, unit) {
  materials[idx].name = name;
  materials[idx].price = price;
  materials[idx].unit = unit;
  materials[idx].total = materials[idx].qty * price;
  renderMaterials();
}

// ================================================================
// MÃO DE OBRA
// ================================================================
function calcMO() {
  const h = parseFloat(document.getElementById('horas').value)||0;
  const f = parseFloat(document.getElementById('funcionarios').value)||1;
  const v = parseFloat(document.getElementById('valorHora').value)||0;
  if(h>0&&v>0) document.getElementById('totalMO').value = (h*f*v).toFixed(2);
  updateTotals();
}

// ================================================================
// TOTALS + LUCRO
// ================================================================
function updateTotals() {
  const subMat = materials.reduce((a,m) => a+m.total, 0);
  const mo = parseFloat(document.getElementById('totalMO').value)||0;
  const extras = ['transporte','frete','alimentacao','equipamentos','taxas','outros']
    .reduce((a,id) => a+(parseFloat(document.getElementById(id)?.value)||0),0);
  const custo = subMat + mo + extras;
  const margem = parseFloat(document.getElementById('margemLucro').value)||0;
  const lucro = custo * (margem/100);
  const precoComLucro = custo + lucro;
  const desc = parseFloat(document.getElementById('desconto').value)||0;
  const total = precoComLucro * (1 - desc/100);
  const entrada = parseFloat(document.getElementById('entrada').value)||0;

  document.getElementById('subMaterials').textContent = 'R$ '+fmt(subMat);
  document.getElementById('t_materiais').textContent = 'R$ '+fmt(subMat);
  document.getElementById('t_mo').textContent = 'R$ '+fmt(mo);
  document.getElementById('t_extras').textContent = 'R$ '+fmt(extras);
  document.getElementById('t_subtotal').textContent = 'R$ '+fmt(custo);
  document.getElementById('t_lucro').textContent = 'R$ '+fmt(lucro);
  document.getElementById('t_total').textContent = 'R$ '+fmt(total);

  // Lucro meter
  const pct = v => custo>0 ? Math.round(v/custo*100) : 0;
  document.getElementById('s_mat').textContent = pct(subMat)+'%';
  document.getElementById('s_mo').textContent = pct(mo)+'%';
  document.getElementById('s_ext').textContent = pct(extras)+'%';
  document.getElementById('s_saldo').textContent = 'R$ '+fmt(total-entrada);

  const barWidth = Math.min(100, Math.max(0, margem/100*100));
  const bar = document.getElementById('lucroBar');
  if(bar) bar.style.width = barWidth+'%';
  const lc = document.getElementById('lucro_custo');
  const lv = document.getElementById('lucro_val');
  const lp = document.getElementById('lucro_pct');
  if(lc) lc.textContent = 'R$ '+fmt(custo);
  if(lv) lv.textContent = 'R$ '+fmt(lucro);
  if(lp) lp.textContent = margem.toFixed(0)+'%';

  // Re-render material "com lucro" column
  const rows = document.querySelectorAll('#materialsBody tr');
  rows.forEach((row,i) => {
    const pc = row.querySelector('.profit-cell');
    if(pc && materials[i]) pc.textContent = 'R$ '+fmt(materials[i].total*(1+margem/100));
  });
}

function fmt(n) { return Number(n).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2}); }
function escHtml(s) { return String(s).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

// ================================================================
// AREA CALCULATOR
// ================================================================
function calcArea() {
  const l = parseFloat(document.getElementById('largura').value)||0;
  const a = parseFloat(document.getElementById('altura').value)||0;
  const area = l*a;
  document.getElementById('areaResult').textContent = fmt(area)+' m²';
}
function addAreaToDesc() {
  const l = parseFloat(document.getElementById('largura').value)||0;
  const a = parseFloat(document.getElementById('altura').value)||0;
  const area = (l*a).toFixed(2);
  const desc = document.getElementById('serviceDesc');
  desc.value += (desc.value ? '\n' : '') + `Área: ${l}m × ${a}m = ${area}m²`;
  toast('Área adicionada à descrição!', 'success');
}

// ================================================================
// LOGO
// ================================================================
function loadLogo(event) {
  const file = event.target.files[0];
  if(!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    logoData = e.target.result;
    localStorage.setItem('obrasync_logo', logoData);
    showLogoPreview(logoData);
    toast('Logo carregada!', 'success');
  };
  reader.readAsDataURL(file);
}
function showLogoPreview(src) {
  document.getElementById('logoImg').src = src;
  document.getElementById('logoImg').style.display = 'block';
  document.getElementById('logoPlaceholder').style.display = 'none';
}

// ================================================================
// PIX
// ================================================================
function updatePixCard() {
  const key = document.getElementById('pixKey')?.value||'';
  const nome = document.getElementById('pixNome')?.value||'';
  const pCard = document.getElementById('pixCard');
  if(!pCard) return;
  if(key && document.getElementById('pagamento').value === 'PIX') {
    pCard.style.display = 'block';
    document.getElementById('pixKeyDisplay').textContent = key;
    renderPixQR(key, nome);
  } else if(key) {
    document.getElementById('pixKeyDisplay').textContent = key;
  }
}

function renderPixQR(key, nome) {
  const canvas = document.getElementById('pixQrCanvas');
  if(!canvas) return;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#fff';
  ctx.fillRect(0,0,80,80);
  // Simple QR-like pattern (visual placeholder)
  ctx.fillStyle = '#000';
  const sz = 4, cols = 20;
  for(let i=0;i<cols;i++) for(let j=0;j<cols;j++) {
    const v = (key.charCodeAt((i*cols+j)%key.length)||0) + i*j;
    if((v*7+i*3+j*5)%3===0) ctx.fillRect(i*sz,j*sz,sz,sz);
  }
  // QR corners
  [[0,0],[0,14],[14,0]].forEach(([x,y]) => {
    ctx.fillStyle = '#000';
    ctx.fillRect(x,y,12,12);
    ctx.fillStyle = '#fff';
    ctx.fillRect(x+2,y+2,8,8);
    ctx.fillStyle = '#000';
    ctx.fillRect(x+4,y+4,4,4);
  });
}

// ================================================================
// FORM DATA
// ================================================================
function getFormData() {
  const subMat = materials.reduce((a,m) => a+m.total,0);
  const mo = parseFloat(document.getElementById('totalMO').value)||0;
  const extras = ['transporte','frete','alimentacao','equipamentos','taxas','outros']
    .reduce((a,id) => a+(parseFloat(document.getElementById(id)?.value)||0),0);
  const custo = subMat+mo+extras;
  const margem = parseFloat(document.getElementById('margemLucro').value)||0;
  const lucro = custo*(margem/100);
  const precoComLucro = custo+lucro;
  const desc = parseFloat(document.getElementById('desconto').value)||0;
  const total = precoComLucro*(1-desc/100);
  return {
    id: Date.now(),
    orcNum: '',  // will be set on save
    clientName: document.getElementById('clientName').value,
    clientPhone: document.getElementById('clientPhone').value,
    clientEmail: document.getElementById('clientEmail').value,
    clientAddress: document.getElementById('clientAddress').value,
    date: document.getElementById('orcDate').value,
    serviceType: document.getElementById('serviceType').value,
    serviceDesc: document.getElementById('serviceDesc').value,
    serviceObs: document.getElementById('serviceObs').value,
    prazo: document.getElementById('prazo').value,
    garantia: document.getElementById('garantia').value,
    validade: document.getElementById('validade').value,
    status: document.getElementById('statusType').value,
    materials: [...materials],
    mo, extras, subMat, custo, margem, lucro,
    subtotal: precoComLucro, desc, total,
    entrada: parseFloat(document.getElementById('entrada').value)||0,
    parcelas: document.getElementById('parcelas').value,
    pagamento: document.getElementById('pagamento').value,
    empresa: document.getElementById('empresa').value,
    cnpj: document.getElementById('cnpj').value,
    empTel: document.getElementById('empTel').value,
    empEmail: document.getElementById('empEmail').value,
    empSite: document.getElementById('empSite').value,
    pixKey: document.getElementById('pixKey').value,
    pixNome: document.getElementById('pixNome').value,
    logoData: logoData,
    photos: [...photos],
  };
}

let _editingId = null;

function saveOrcamento() {
  const data = getFormData();
  if(!data.clientName) { toast('Informe o nome do cliente!','error'); return; }
  if(!data.serviceType) { toast('Selecione o tipo de serviço!','error'); return; }
  
  if(_editingId) {
    const idx = orcamentos.findIndex(o => o.id === _editingId);
    if(idx >= 0) { data.id = _editingId; data.orcNum = orcamentos[idx].orcNum; orcamentos[idx] = data; }
    else orcamentos.push(data);
  } else {
    data.orcNum = generateOrcNum();
    orcamentos.push(data);
  }
  localStorage.setItem('obrasync_orcs', JSON.stringify(orcamentos));
  updateCountBadge();
  toast('Orçamento salvo! '+data.orcNum, 'success');
  return data;
}

function saveAndGenerate() {
  const saved = saveOrcamento();
  if(saved) generatePDF(saved);
}

function updateCountBadge() {
  document.getElementById('countBadge').textContent = orcamentos.length;
}

// ================================================================
// PDF GENERATION (jsPDF text-based — vetorial, não imagem)
// ================================================================
function generatePDF(d) {
  if(!d) d = getFormData();
  if(!d.clientName) { toast('Informe o nome do cliente!','error'); return; }
  toast('Gerando PDF...','info');

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF('p','mm','a4');
  const W = 210, ml = 15, mr = 195, cw = mr-ml;
  let y = 15;

  const blue = [59,130,246], gold = [245,158,11], dark = [26,31,48];
  const gray = [100,116,139], lightGray = [241,245,249], black = [15,23,42];

  function checkPage(need=10) {
    if(y+need > 280) { doc.addPage(); y = 15; }
  }

  // ---- HEADER ----
  doc.setFillColor(...blue);
  doc.rect(0,0,W,38,'F');

  // Logo
  let logoX = ml;
  if(d.logoData) {
    try {
      const fmt2 = d.logoData.includes('png') ? 'PNG' : 'JPEG';
      doc.addImage(d.logoData, fmt2, ml, 4, 30, 30);
      logoX = ml + 34;
    } catch(e) {}
  }

  // Company name
  doc.setFont('helvetica','bold');
  doc.setFontSize(20);
  doc.setTextColor(255,255,255);
  doc.text(d.empresa || 'SUA EMPRESA', logoX, 17);

  if(d.cnpj) {
    doc.setFont('helvetica','normal');
    doc.setFontSize(8);
    doc.setTextColor(200,220,255);
    doc.text('CNPJ: '+d.cnpj, logoX, 23);
  }
  const contacts = [d.empTel, d.empEmail, d.empSite].filter(Boolean).join(' | ');
  if(contacts) {
    doc.setFont('helvetica','normal');
    doc.setFontSize(8);
    doc.setTextColor(200,220,255);
    doc.text(contacts, logoX, 28);
  }

  // ORC badge
  doc.setFillColor(255,255,255);
  doc.roundedRect(145, 6, 50, 26, 3, 3, 'F');
  doc.setFont('helvetica','bold');
  doc.setFontSize(8);
  doc.setTextColor(...blue);
  doc.text('ORÇAMENTO', 170, 13, {align:'center'});
  doc.setFontSize(13);
  doc.setTextColor(...dark);
  doc.text(d.orcNum || '#'+String(d.id).slice(-6), 170, 21, {align:'center'});
  doc.setFont('helvetica','normal');
  doc.setFontSize(8);
  doc.setTextColor(...gray);
  const dtStr = d.date ? new Date(d.date+'T12:00').toLocaleDateString('pt-BR') : new Date().toLocaleDateString('pt-BR');
  doc.text(dtStr, 170, 28, {align:'center'});

  y = 46;

  // ---- CLIENTE + SERVICO ----
  const colW = (cw-5)/2;
  // Box cliente
  doc.setFillColor(...lightGray);
  doc.roundedRect(ml, y, colW, 40, 3, 3, 'F');
  doc.setDrawColor(59,130,246); doc.setLineWidth(0.8);
  doc.line(ml, y+2, ml, y+38);
  doc.setFont('helvetica','bold'); doc.setFontSize(7); doc.setTextColor(...gray);
  doc.text('DADOS DO CLIENTE', ml+4, y+7);
  doc.setFont('helvetica','bold'); doc.setFontSize(10); doc.setTextColor(...black);
  doc.text(d.clientName, ml+4, y+14);
  doc.setFont('helvetica','normal'); doc.setFontSize(8); doc.setTextColor(...gray);
  let cy = y+20;
  if(d.clientPhone) { doc.text('Tel: '+d.clientPhone, ml+4, cy); cy+=5; }
  if(d.clientEmail) { doc.text('E: '+d.clientEmail, ml+4, cy); cy+=5; }
  if(d.clientAddress) { const lines = doc.splitTextToSize(d.clientAddress, colW-8); doc.text(lines, ml+4, cy); }

  // Box serviço
  const col2x = ml+colW+5;
  doc.setFillColor(...lightGray);
  doc.roundedRect(col2x, y, colW, 40, 3, 3, 'F');
  doc.setDrawColor(...gold); doc.setLineWidth(0.8);
  doc.line(col2x, y+2, col2x, y+38);
  doc.setFont('helvetica','bold'); doc.setFontSize(7); doc.setTextColor(...gray);
  doc.text('SERVIÇO', col2x+4, y+7);
  doc.setFont('helvetica','bold'); doc.setFontSize(10); doc.setTextColor(...black);
  const svcType = d.serviceType.replace(/[^\w\s\/áéíóúãõâêîôûàèìòùçÁÉÍÓÚÃÕÂÊÎÔÛÀÈÌÒÙÇ\-]/g,'').trim();
  doc.text(svcType, col2x+4, y+14);
  doc.setFont('helvetica','normal'); doc.setFontSize(8); doc.setTextColor(...gray);
  let sy = y+20;
  const statusTxt = {analise:'Em Análise',aprovado:'Aprovado',andamento:'Em Andamento',finalizado:'Finalizado',cancelado:'Cancelado'}[d.status]||d.status;
  doc.text('Status: '+statusTxt, col2x+4, sy); sy+=5;
  if(d.prazo) { doc.text('Prazo: '+d.prazo, col2x+4, sy); sy+=5; }
  if(d.garantia) { doc.text('Garantia: '+d.garantia, col2x+4, sy); sy+=5; }
  if(d.validade) { doc.text('Validade: '+d.validade, col2x+4, sy); }

  y += 46;

  // ---- DESCRIÇÃO ----
  if(d.serviceDesc) {
    checkPage(20);
    doc.setFont('helvetica','bold'); doc.setFontSize(8); doc.setTextColor(...gray);
    doc.text('DESCRIÇÃO DO SERVIÇO', ml, y);
    y += 5;
    doc.setFillColor(255,251,235);
    doc.setDrawColor(245,158,11); doc.setLineWidth(0.5);
    const lines = doc.splitTextToSize(d.serviceDesc, cw-8);
    const bh = Math.max(12, lines.length*4+6);
    doc.roundedRect(ml, y, cw, bh, 2, 2, 'FD');
    doc.setFont('helvetica','normal'); doc.setFontSize(8); doc.setTextColor(40,40,40);
    doc.text(lines, ml+4, y+5);
    y += bh + 6;
  }

  // ---- MATERIAIS ----
  const mats = (d.materials||[]).filter(m=>m.name);
  if(mats.length) {
    checkPage(20);
    doc.setFont('helvetica','bold'); doc.setFontSize(8); doc.setTextColor(...gray);
    doc.text('MATERIAIS', ml, y); y += 4;
    doc.setFillColor(241,245,249);
    doc.rect(ml, y, cw, 7, 'F');
    doc.setFont('helvetica','bold'); doc.setFontSize(7.5); doc.setTextColor(50,50,80);
    doc.text('Material', ml+2, y+5);
    doc.text('Qtd', ml+90, y+5);
    doc.text('Unid', ml+105, y+5);
    doc.text('Valor Unit.', ml+120, y+5);
    doc.text('Total', ml+150, y+5);
    doc.text('c/ Lucro', ml+165, y+5);
    y += 8;
    mats.forEach((m,i) => {
      checkPage(7);
      if(i%2===0) { doc.setFillColor(250,252,255); doc.rect(ml,y-1,cw,7,'F'); }
      doc.setFont('helvetica','normal'); doc.setFontSize(8); doc.setTextColor(...black);
      doc.text(doc.splitTextToSize(m.name,86)[0], ml+2, y+4);
      doc.text(String(m.qty), ml+90, y+4);
      doc.text(m.unit||'un', ml+105, y+4);
      doc.text('R$ '+fmt(m.price), ml+120, y+4);
      doc.setFont('helvetica','bold'); doc.setTextColor(...blue);
      doc.text('R$ '+fmt(m.total), ml+150, y+4);
      const totalLucro = m.total*(1+(d.margem||0)/100);
      doc.setTextColor(16,185,129);
      doc.text('R$ '+fmt(totalLucro), ml+165, y+4);
      y += 7;
    });
    // subtotal
    doc.setDrawColor(...lightGray); doc.setLineWidth(0.3);
    doc.line(ml, y, mr, y); y += 4;
    doc.setFont('helvetica','bold'); doc.setFontSize(8); doc.setTextColor(...gray);
    doc.text('Subtotal materiais: R$ '+fmt(d.subMat), mr, y, {align:'right'});
    y += 7;
  }

  // ---- RESUMO FINANCEIRO ----
  checkPage(50);
  doc.setFont('helvetica','bold'); doc.setFontSize(8); doc.setTextColor(...gray);
  doc.text('RESUMO FINANCEIRO', ml, y); y += 4;
  doc.setFillColor(248,250,252);
  const finH = 8 + (d.mo?7:0) + (d.extras?7:0) + (d.desc?7:0) + 7 + 9;
  doc.roundedRect(ml, y, cw, finH+4, 3, 3, 'F');
  let fy = y+7;
  const finLine = (label, val, bold=false, color=gray) => {
    doc.setFont('helvetica', bold?'bold':'normal'); doc.setFontSize(8.5);
    doc.setTextColor(...gray); doc.text(label, ml+4, fy);
    doc.setTextColor(...color); doc.text(val, mr-4, fy, {align:'right'});
    fy += 7;
  };
  finLine('Subtotal materiais', 'R$ '+fmt(d.subMat));
  if(d.mo) finLine('Mão de obra', 'R$ '+fmt(d.mo));
  if(d.extras) finLine('Custos extras', 'R$ '+fmt(d.extras));
  finLine('Custo total', 'R$ '+fmt(d.custo||0));
  if(d.margem) {
    doc.setFont('helvetica','normal'); doc.setFontSize(8.5);
    doc.setTextColor(16,185,129); doc.text('Lucro ('+d.margem+'%)', ml+4, fy);
    doc.setTextColor(16,185,129); doc.text('+ R$ '+fmt(d.lucro||0), mr-4, fy, {align:'right'});
    fy += 7;
  }
  if(d.desc) finLine('Desconto ('+d.desc+'%)', '- R$ '+fmt((d.subtotal||0)-(d.total||0)), false, [239,68,68]);
  // Total line
  doc.setDrawColor(220,230,250); doc.line(ml+3, fy, mr-3, fy); fy += 5;
  doc.setFillColor(...blue);
  doc.roundedRect(ml+3, fy-3, cw-6, 11, 2, 2, 'F');
  doc.setFont('helvetica','bold'); doc.setFontSize(11); doc.setTextColor(255,255,255);
  doc.text('TOTAL FINAL', ml+8, fy+5);
  doc.text('R$ '+fmt(d.total), mr-7, fy+5, {align:'right'});
  fy += 14;
  if(d.entrada>0) {
    doc.setFont('helvetica','normal'); doc.setFontSize(8); doc.setTextColor(...gray);
    doc.text('Entrada: R$ '+fmt(d.entrada)+'  |  Saldo: R$ '+fmt((d.total||0)-(d.entrada||0)), ml+4, fy);
    fy += 6;
  }
  doc.setFont('helvetica','normal'); doc.setFontSize(8); doc.setTextColor(...gray);
  doc.text('Pagamento: '+d.pagamento+' — '+d.parcelas, ml+4, fy);
  y = fy + 8;

  // ---- PIX ----
  if(d.pixKey) {
    checkPage(18);
    doc.setFillColor(240,253,244);
    doc.setDrawColor(16,185,129); doc.setLineWidth(0.5);
    doc.roundedRect(ml, y, cw, 16, 2, 2, 'FD');
    doc.setFont('helvetica','bold'); doc.setFontSize(8); doc.setTextColor(16,185,129);
    doc.text('💳 PAGUE VIA PIX', ml+4, y+6);
    doc.setFont('helvetica','normal'); doc.setFontSize(8); doc.setTextColor(40,80,40);
    doc.text('Chave: '+d.pixKey + (d.pixNome?' | '+d.pixNome:''), ml+4, y+12);
    y += 20;
  }

  // ---- OBS ----
  if(d.serviceObs) {
    checkPage(18);
    doc.setFillColor(240,253,244);
    doc.setDrawColor(16,185,129); doc.setLineWidth(0.5);
    const lines = doc.splitTextToSize(d.serviceObs, cw-8);
    const bh2 = Math.max(12, lines.length*4+6);
    doc.roundedRect(ml, y, cw, bh2, 2, 2, 'FD');
    doc.setFont('helvetica','bold'); doc.setFontSize(7.5); doc.setTextColor(16,185,129);
    doc.text('OBSERVAÇÕES / CONDIÇÕES', ml+4, y+5);
    doc.setFont('helvetica','normal'); doc.setFontSize(8); doc.setTextColor(40,80,40);
    doc.text(lines, ml+4, y+10);
    y += bh2 + 6;
  }

  // ---- FOTOS ----
  const photosList = d.photos||photos;
  if(photosList.length) {
    checkPage(15);
    doc.setFont('helvetica','bold'); doc.setFontSize(8); doc.setTextColor(...gray);
    doc.text('FOTOS DA OBRA', ml, y); y += 5;
    const pw = (cw-10)/3, ph = pw*0.75;
    let px = ml;
    photosList.slice(0,9).forEach((src,i) => {
      if(i>0&&i%3===0) { y += ph+4; checkPage(ph+4); px = ml; }
      try {
        const fmtImg = src.includes('png')?'PNG':'JPEG';
        doc.addImage(src, fmtImg, px, y, pw, ph);
        doc.setDrawColor(220,230,250); doc.setLineWidth(0.3);
        doc.rect(px, y, pw, ph);
      } catch(e) {}
      px += pw+5;
    });
    y += ph + 8;
  }

  // ---- ASSINATURAS ----
  const sigCanvas1 = document.getElementById('sigCanvas');
  const sigCanvas2 = document.getElementById('sigCanvas2');
  const hasSig1 = !isBlankCanvas(sigCanvas1);
  const hasSig2 = !isBlankCanvas(sigCanvas2);

  if(hasSig1||hasSig2) {
    checkPage(40);
    doc.setDrawColor(220,230,250); doc.line(ml,y,mr,y); y+=8;
    doc.setFont('helvetica','bold'); doc.setFontSize(8); doc.setTextColor(...gray);
    doc.text('ASSINATURAS', ml, y); y+=5;
    
    const sw = (cw-10)/2;
    if(hasSig1) {
      const s1 = sigCanvas1.toDataURL('image/png');
      try { doc.addImage(s1,'PNG',ml,y,sw,25); } catch(e){}
      doc.setDrawColor(200,210,230); doc.line(ml,y+27,ml+sw,y+27);
      doc.setFont('helvetica','normal'); doc.setFontSize(7.5); doc.setTextColor(...gray);
      doc.text(d.clientName+' — Contratante', ml+sw/2, y+32, {align:'center'});
    }
    if(hasSig2) {
      const s2 = sigCanvas2.toDataURL('image/png');
      const x2 = ml+sw+10;
      try { doc.addImage(s2,'PNG',x2,y,sw,25); } catch(e){}
      doc.setDrawColor(200,210,230); doc.line(x2,y+27,x2+sw,y+27);
      doc.setFont('helvetica','normal'); doc.setFontSize(7.5); doc.setTextColor(...gray);
      doc.text((d.empresa||'Prestador(a)')+' — Contratado(a)', x2+sw/2, y+32, {align:'center'});
    }
    y += 40;
  }

  // ---- FOOTER ----
  const pageCount = doc.internal.getNumberOfPages();
  for(let p=1;p<=pageCount;p++) {
    doc.setPage(p);
    doc.setFillColor(245,248,255);
    doc.rect(0,284,W,13,'F');
    doc.setFont('helvetica','normal'); doc.setFontSize(7); doc.setTextColor(...gray);
    const val = d.validade||'15 dias';
    doc.text(`Orçamento ${d.orcNum||''} • Válido por ${val} • Gerado pelo ObraSync`, W/2, 290, {align:'center'});
    doc.text(`Página ${p} de ${pageCount}`, mr, 290, {align:'right'});
  }

  doc.save(`orcamento-${(d.orcNum||d.id).toString().replace(/[^a-z0-9\-]/gi,'_')}-${d.clientName.replace(/\s+/g,'-')}.pdf`);
  toast('PDF gerado com sucesso!', 'success');
}

function isBlankCanvas(canvas) {
  if(!canvas) return true;
  const data = canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data;
  for(let i=0;i<data.length;i+=4) if(data[i+3]>0) return false;
  return true;
}

// ================================================================
// SIGNATURES
// ================================================================
function initSignature(canvasId) {
  const canvas = document.getElementById(canvasId);
  if(!canvas) return;
  const ctx = canvas.getContext('2d');
  sigCtx[canvasId] = ctx;
  ctx.strokeStyle = '#1a1f30';
  ctx.lineWidth = 2.5;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const getPos = e => {
    const r = canvas.getBoundingClientRect();
    const t = e.touches?e.touches[0]:e;
    return {x:(t.clientX-r.left)*(canvas.width/r.width),y:(t.clientY-r.top)*(canvas.height/r.height)};
  };

  const draw = pos => {
    if(!sigDrawing[canvasId]) return;
    ctx.beginPath();
    ctx.moveTo(sigLast[canvasId].x, sigLast[canvasId].y);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    sigLast[canvasId] = pos;
  };

  canvas.addEventListener('mousedown', e => { sigDrawing[canvasId]=true; sigLast[canvasId]=getPos(e); });
  canvas.addEventListener('touchstart', e => { e.preventDefault(); sigDrawing[canvasId]=true; sigLast[canvasId]=getPos(e); }, {passive:false});
  canvas.addEventListener('mousemove', e => draw(getPos(e)));
  canvas.addEventListener('touchmove', e => { e.preventDefault(); draw(getPos(e)); }, {passive:false});
  canvas.addEventListener('mouseup', () => sigDrawing[canvasId]=false);
  canvas.addEventListener('touchend', () => sigDrawing[canvasId]=false);
}

function clearSignature(canvasId) {
  const c = document.getElementById(canvasId);
  sigCtx[canvasId]?.clearRect(0,0,c.width,c.height);
}

// ================================================================
// PHOTOS
// ================================================================
function addPhotos(event) {
  const files = Array.from(event.target.files);
  files.forEach(file => {
    const reader = new FileReader();
    reader.onload = e => { photos.push(e.target.result); renderPhotos(); };
    reader.readAsDataURL(file);
  });
}

function renderPhotos() {
  const grid = document.getElementById('photoGrid');
  grid.innerHTML = photos.map((src,i) => `
    <div class="photo-thumb">
      <img src="${src}" alt="Foto ${i+1}" loading="lazy">
      <button class="del-photo" onclick="removePhoto(${i})"><i class="fas fa-times"></i></button>
    </div>
  `).join('');
}

function removePhoto(i) { photos.splice(i,1); renderPhotos(); }

// ================================================================
// WHATSAPP
// ================================================================
function sendWhatsApp() {
  const d = getFormData();
  if(!d.clientPhone) { toast('Informe o telefone do cliente!','error'); return; }
  const matsList = d.materials.filter(m=>m.name).map(m=>`• ${m.name}: ${m.qty}${m.unit} = R$ ${fmt(m.total)}`).join('\n');
  const msg = `*ORÇAMENTO ${d.orcNum||''} — ${d.empresa||'Prestador de Serviços'}*\n\n`+
    `👤 *Cliente:* ${d.clientName}\n📍 *Endereço:* ${d.clientAddress||'—'}\n`+
    `🔧 *Serviço:* ${d.serviceType}\n📅 *Data:* ${d.date?new Date(d.date+'T12:00').toLocaleDateString('pt-BR'):''}\n\n`+
    (matsList?`📦 *Materiais:*\n${matsList}\n\n`:'')+
    `💵 *Mão de obra:* R$ ${fmt(d.mo)}\n`+
    (d.extras?`🚚 *Extras:* R$ ${fmt(d.extras)}\n`:'')+
    (d.margem?`📈 *Lucro (${d.margem}%):* R$ ${fmt(d.lucro)}\n`:'')+
    (d.desc>0?`🏷️ *Desconto:* ${d.desc}%\n`:'')+
    `\n✅ *TOTAL: R$ ${fmt(d.total)}*\n`+
    `💳 *Pagamento:* ${d.pagamento} — ${d.parcelas}\n`+
    (d.pixKey?`💰 *PIX:* ${d.pixKey}\n`:'')+
    (d.prazo?`⏱️ *Prazo:* ${d.prazo}\n`:'')+
    (d.garantia?`🔰 *Garantia:* ${d.garantia}\n`:'')+
    (d.validade?`📆 *Válido por:* ${d.validade}\n`:'')+
    `\n_Gerado pelo ObraSync_`;
  window.open(`https://wa.me/55${d.clientPhone.replace(/\D/g,'')}?text=${encodeURIComponent(msg)}`,'_blank');
}

// ================================================================
// CONTRACT
// ================================================================
function generateContract() {
  const d = getFormData();
  if(!d.clientName) { toast('Preencha os dados do cliente!','error'); return; }
  document.getElementById('contractContent').innerHTML = `
<strong>CONTRATO DE PRESTAÇÃO DE SERVIÇOS</strong><br><br>
<strong>CONTRATANTE:</strong> ${d.clientName}, domiciliado(a) em ${d.clientAddress||'[endereço]'}.<br><br>
<strong>CONTRATADO(A):</strong> ${d.empresa||'[Empresa]'}, CNPJ/CPF ${d.cnpj||'[nº]'}, doravante PRESTADOR(A).<br><br>
<strong>OBJETO:</strong> ${d.serviceType} — ${d.serviceDesc||'conforme acordado'}.<br><br>
<strong>PRAZO:</strong> ${d.prazo||'a combinar'}, a contar da data de assinatura ou início dos serviços.<br><br>
<strong>VALOR:</strong> R$ ${fmt(d.total)}, via ${d.pagamento}, modalidade: ${d.parcelas}.${d.entrada>0?' Entrada de R$ '+fmt(d.entrada)+' no ato.':''}<br><br>
<strong>GARANTIA:</strong> ${d.garantia||'Conforme legislação vigente.'}<br><br>
<strong>RESCISÃO:</strong> Com 48h de aviso prévio, ficando a parte rescindente responsável pelos custos incorridos.<br><br>
<strong>FORO:</strong> Comarca de domicílio do contratante.<br><br>
Data: ${new Date().toLocaleDateString('pt-BR')}<br><br>
_____________________________ &nbsp;&nbsp;&nbsp; _____________________________<br>
${d.clientName} — Contratante &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; ${d.empresa||'Prestador(a)'} — Contratado(a)`;
  document.getElementById('contractModal').classList.add('show');
}

function copyContract() {
  navigator.clipboard.writeText(document.getElementById('contractContent').innerText)
    .then(() => toast('Contrato copiado!','success'));
}

function closeModal(id) { document.getElementById(id).classList.remove('show'); }

// ================================================================
// CLEAR FORM
// ================================================================
function clearForm() {
  if(!confirm('Limpar todos os dados?')) return;
  _editingId = null;
  const fields = ['clientName','clientPhone','clientEmail','clientAddress','serviceDesc','serviceObs',
    'prazo','garantia','validade','totalMO','horas','funcionarios','valorHora',
    'transporte','frete','alimentacao','equipamentos','taxas','outros','desconto','entrada'];
  fields.forEach(id => {
    const el = document.getElementById(id);
    if(el) el.value = id==='funcionarios'?'1':id==='desconto'?'0':id==='validade'?'15 dias':'';
  });
  document.getElementById('serviceType').value='';
  document.getElementById('statusType').value='analise';
  document.getElementById('parcelas').value='À vista';
  document.getElementById('pagamento').value='Dinheiro';
  document.getElementById('margemLucro').value='20';
  materials=[];photos=[];
  renderPhotos();
  clearSignature('sigCanvas'); clearSignature('sigCanvas2');
  addMaterial();addMaterial();addMaterial();
  updateTotals();
  document.getElementById('orcDate').value=new Date().toISOString().split('T')[0];
  toast('Formulário limpo!','success');
}

// ================================================================
// RENDER ORCAMENTOS
// ================================================================
function renderOrcamentos(filter='', statusF='') {
  const list = document.getElementById('orcamentosList');
  const fl = filter.toLowerCase();
  const filtered = [...orcamentos].reverse().filter(o =>
    (!fl || (o.clientName||'').toLowerCase().includes(fl) ||
     (o.serviceType||'').toLowerCase().includes(fl) ||
     (o.status||'').toLowerCase().includes(fl) ||
     (o.orcNum||'').toLowerCase().includes(fl)) &&
    (!statusF || o.status === statusF)
  );

  if(!filtered.length) {
    list.innerHTML = `<div class="empty"><i class="fas fa-file-invoice-dollar"></i><h3>Nenhum orçamento encontrado</h3><p>Crie seu primeiro orçamento</p></div>`;
    return;
  }

  const sm = {analise:{label:'Em Análise',cls:'badge-blue'},aprovado:{label:'Aprovado',cls:'badge-green'},andamento:{label:'Em Andamento',cls:'badge-gold'},finalizado:{label:'Finalizado',cls:'badge-green'},cancelado:{label:'Cancelado',cls:'badge-red'}};
  list.innerHTML = filtered.map(o => {
    const st = sm[o.status]||{label:o.status,cls:'badge-blue'};
    const lucroStr = o.lucro ? `<span style="color:var(--green)"><i class="fas fa-chart-line" style="font-size:.7rem"></i> Lucro: R$ ${fmt(o.lucro)}</span>` : '';
    return `<div class="orca-item">
      <div class="orca-info">
        <div class="orca-num">${o.orcNum||('#'+String(o.id).slice(-6))}</div>
        <div class="orca-name"><i class="fas fa-user" style="color:var(--accent);font-size:.8rem;margin-right:5px"></i>${o.clientName}</div>
        <div class="orca-meta">
          <span>${o.serviceType||'—'}</span>
          <span>${o.date?new Date(o.date+'T12:00').toLocaleDateString('pt-BR'):'—'}</span>
          <span style="color:var(--accent);font-weight:600">R$ ${fmt(o.total)}</span>
          ${lucroStr}
        </div>
      </div>
      <div class="orca-actions" style="display:flex;align-items:center;gap:.5rem;flex-wrap:wrap">
        <span class="badge ${st.cls}">${st.label}</span>
        <button class="btn btn-secondary btn-sm" onclick="loadOrcamento(${o.id})"><i class="fas fa-edit"></i></button>
        <button class="btn btn-gold btn-sm" onclick="generatePDF(orcamentos.find(x=>x.id===${o.id}))"><i class="fas fa-file-pdf"></i></button>
        <button class="btn btn-danger btn-sm btn-icon" onclick="deleteOrcamento(${o.id})"><i class="fas fa-trash"></i></button>
      </div>
    </div>`;
  }).join('');
}

function filterOrcamentos(val, status='') {
  const sf = document.getElementById('filterStatus')?.value||status;
  renderOrcamentos(val, sf);
}

function loadOrcamento(id) {
  const o = orcamentos.find(x => x.id===id);
  if(!o) return;
  _editingId = id;
  const setVal = (el, v) => { const e = document.getElementById(el); if(e) e.value = v||''; };
  setVal('clientName',o.clientName); setVal('clientPhone',o.clientPhone); setVal('clientEmail',o.clientEmail);
  setVal('clientAddress',o.clientAddress); setVal('orcDate',o.date); setVal('serviceType',o.serviceType||'');
  setVal('serviceDesc',o.serviceDesc); setVal('serviceObs',o.serviceObs);
  setVal('prazo',o.prazo); setVal('garantia',o.garantia); setVal('validade',o.validade||'15 dias');
  setVal('statusType',o.status||'analise'); setVal('totalMO',o.mo); setVal('desconto',o.desc||0);
  setVal('margemLucro',o.margem||20); setVal('entrada',o.entrada);
  document.getElementById('parcelas').value = o.parcelas||'À vista';
  document.getElementById('pagamento').value = o.pagamento||'Dinheiro';
  materials = (o.materials||[]).map(m=>({...m}));
  photos = o.photos||[];
  if(o.logoData) { logoData=o.logoData; showLogoPreview(logoData); }
  renderMaterials();
  renderPhotos();
  updateTotals();
  showPage('novo');
  toast('Orçamento '+o.orcNum+' carregado!','success');
}

function deleteOrcamento(id) {
  if(!confirm('Excluir este orçamento?')) return;
  orcamentos = orcamentos.filter(o => o.id!==id);
  localStorage.setItem('obrasync_orcs', JSON.stringify(orcamentos));
  updateCountBadge();
  renderOrcamentos();
  toast('Excluído.','success');
}

// ================================================================
// CLIENTES
// ================================================================
function renderClientes(filter='') {
  const list = document.getElementById('clientesList');
  const unique = {};
  orcamentos.forEach(o => {
    if(!o.clientName) return;
    if(!unique[o.clientName]) unique[o.clientName] = [];
    unique[o.clientName].push(o);
  });
  const names = Object.keys(unique).filter(n => !filter||n.toLowerCase().includes(filter.toLowerCase()));
  if(!names.length) {
    list.innerHTML = `<div class="empty"><i class="fas fa-users"></i><h3>Nenhum cliente</h3><p>Os clientes aparecem ao salvar orçamentos</p></div>`;
    return;
  }
  list.innerHTML = names.map(name => {
    const orcs = unique[name];
    const total = orcs.reduce((a,o)=>a+(o.total||0),0);
    const lucroTotal = orcs.reduce((a,o)=>a+(o.lucro||0),0);
    const aprovados = orcs.filter(o=>o.status==='aprovado'||o.status==='finalizado').length;
    return `<div class="orca-item">
      <div style="width:42px;height:42px;border-radius:50%;background:var(--accent-g);color:var(--accent);display:flex;align-items:center;justify-content:center;font-weight:800;font-size:1rem;font-family:var(--font-display);flex-shrink:0">${name.charAt(0).toUpperCase()}</div>
      <div class="orca-info">
        <div class="orca-name">${name}</div>
        <div class="orca-meta">
          <span>${orcs[0].clientPhone||'—'}</span>
          <span>${orcs.length} orçamento(s)</span>
          <span style="color:var(--accent);font-weight:600">Faturado: R$ ${fmt(total)}</span>
          ${lucroTotal>0?`<span style="color:var(--green);font-weight:600">Lucro: R$ ${fmt(lucroTotal)}</span>`:''}
          <span>${aprovados} aprovado(s)</span>
        </div>
      </div>
      <div style="display:flex;gap:.5rem">
        <button class="whatsapp-btn btn-sm" onclick="window.open('https://wa.me/55${(orcs[0].clientPhone||'').replace(/\D/g,'')}','_blank')"><i class="fab fa-whatsapp"></i></button>
      </div>
    </div>`;
  }).join('');
}

function filterClientes(v) { renderClientes(v); }

// ================================================================
// MATERIAL BANK
// ================================================================
function renderMatBank(filter='') {
  const list = document.getElementById('matBankList');
  const fl = filter.toLowerCase();
  const items = matBank.filter(m => !fl || m.name.toLowerCase().includes(fl) || (m.category||'').toLowerCase().includes(fl));
  if(!items.length) {
    list.innerHTML = `<div class="empty"><i class="fas fa-boxes"></i><h3>Nenhum material no banco</h3><p>Adicione materiais para usar o autocomplete</p></div>`;
    return;
  }
  // Group by category
  const cats = {};
  items.forEach(m => { const c=m.category||'Outros'; if(!cats[c])cats[c]=[]; cats[c].push(m); });
  list.innerHTML = Object.entries(cats).map(([cat,ms]) => `
    <div style="font-size:.72rem;color:var(--text3);text-transform:uppercase;font-weight:700;letter-spacing:.08em;margin:.75rem 0 .4rem">${cat}</div>
    ${ms.map(m=>`
    <div class="mat-bank-item">
      <div class="mat-info">
        <div class="mat-name">${m.name}</div>
        <div class="mat-price-info">R$ ${fmt(m.price)} / ${m.unit}</div>
      </div>
      <div style="display:flex;gap:.5rem">
        <button class="btn btn-sm btn-secondary" onclick="editMaterialBank(${m.id})"><i class="fas fa-edit"></i></button>
        <button class="btn btn-sm btn-danger" onclick="deleteMatBank(${m.id})"><i class="fas fa-trash"></i></button>
      </div>
    </div>`).join('')}
  `).join('');
}

function filterMatBank(v) { renderMatBank(v); }

function openAddMaterial(id=null) {
  const edit = id ? matBank.find(m=>m.id===id) : null;
  document.getElementById('addMatTitle').textContent = edit ? 'Editar Material' : 'Novo Material';
  document.getElementById('editMatId').value = id||'';
  document.getElementById('matName').value = edit?.name||'';
  document.getElementById('matUnit').value = edit?.unit||'un';
  document.getElementById('matPrice').value = edit?.price||'';
  document.getElementById('matCat').value = edit?.category||'Outros';
  document.getElementById('addMaterialModal').classList.add('show');
}

function editMaterialBank(id) { openAddMaterial(id); }

function saveMaterialToBank() {
  const name = document.getElementById('matName').value.trim();
  const price = parseFloat(document.getElementById('matPrice').value)||0;
  if(!name) { toast('Informe o nome do material!','error'); return; }
  const editId = document.getElementById('editMatId').value;
  const mat = { id:editId?parseInt(editId):Date.now(), name, unit:document.getElementById('matUnit').value||'un', price, category:document.getElementById('matCat').value };
  if(editId) { const idx=matBank.findIndex(m=>m.id===parseInt(editId)); if(idx>=0) matBank[idx]=mat; else matBank.push(mat); }
  else matBank.push(mat);
  localStorage.setItem('obrasync_mats', JSON.stringify(matBank));
  closeModal('addMaterialModal');
  renderMatBank();
  toast('Material salvo!','success');
}

function deleteMatBank(id) {
  if(!confirm('Remover este material?')) return;
  matBank = matBank.filter(m=>m.id!==id);
  localStorage.setItem('obrasync_mats', JSON.stringify(matBank));
  renderMatBank();
  toast('Removido.','success');
}

function openMatBank() {
  renderMatBankModal('');
  document.getElementById('matBankModal').classList.add('show');
}

function renderMatBankModal(filter='') {
  const fl = filter.toLowerCase();
  const items = matBank.filter(m=>!fl||m.name.toLowerCase().includes(fl));
  const list = document.getElementById('matBankModalList');
  if(!items.length) { list.innerHTML = `<div style="color:var(--text3);padding:1rem;text-align:center">Nenhum material. <a href="#" onclick="closeModal('matBankModal');showPage('materiais')" style="color:var(--accent)">Adicione no banco</a></div>`; return; }
  list.innerHTML = items.map(m=>`
    <div class="mat-bank-item" onclick="addMatFromBank(${m.id})" style="cursor:pointer">
      <div class="mat-info">
        <div class="mat-name">${m.name}</div>
        <div class="mat-price-info">R$ ${fmt(m.price)} / ${m.unit} — ${m.category||''}</div>
      </div>
      <button class="btn btn-sm btn-green"><i class="fas fa-plus"></i> Adicionar</button>
    </div>`).join('');
}

function addMatFromBank(id) {
  const m = matBank.find(x=>x.id===id);
  if(!m) return;
  materials.push({id:Date.now(),name:m.name,qty:1,unit:m.unit,price:m.price,total:m.price});
  renderMaterials();
  closeModal('matBankModal');
  toast(m.name+' adicionado!','success');
}

// ================================================================
// CALENDAR / AGENDA
// ================================================================
function renderCalendar() {
  const title = document.getElementById('calTitle');
  const grid = document.getElementById('calGrid');
  const lista = document.getElementById('eventosList');
  if(!title||!grid) return;

  const year = calDate.getFullYear(), month = calDate.getMonth();
  const months = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
  title.textContent = months[month]+' '+year;

  const first = new Date(year,month,1).getDay();
  const daysInMonth = new Date(year,month+1,0).getDate();
  const today = new Date();

  let html = '';
  for(let i=0;i<first;i++) {
    const d = new Date(year,month,-(first-i-1));
    html += `<div class="cal-day other-month">${d.getDate()}</div>`;
  }
  for(let d=1;d<=daysInMonth;d++) {
    const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const isToday = today.getFullYear()===year&&today.getMonth()===month&&today.getDate()===d;
    const hasEv = eventos.some(e=>e.date===dateStr);
    html += `<div class="cal-day${isToday?' today':''}${hasEv?' has-event':''}" onclick="filterEventos('${dateStr}')">${d}</div>`;
  }
  grid.innerHTML = html;

  // Events list for current month
  const monthEvts = eventos.filter(e => {
    const ed = new Date(e.date+'T12:00');
    return ed.getFullYear()===year && ed.getMonth()===month;
  }).sort((a,b)=>a.date.localeCompare(b.date));

  if(!monthEvts.length) {
    lista.innerHTML = `<div class="empty" style="padding:1.5rem"><i class="fas fa-calendar-times"></i><div style="font-size:.85rem">Nenhum evento este mês</div></div>`;
  } else {
    const tipoIcons = {visita:'🔍',obra:'🔨',entrega:'✅',reuniao:'🤝',outro:'📌'};
    lista.innerHTML = monthEvts.map(e => `
    <div style="padding:.75rem;background:var(--bg3);border-radius:var(--radius-xs);margin-bottom:.5rem;border:1px solid var(--border);display:flex;justify-content:space-between;align-items:center;gap:.5rem">
      <div>
        <div style="font-weight:600;font-size:.875rem">${tipoIcons[e.tipo]||'📌'} ${e.titulo}</div>
        <div style="font-size:.75rem;color:var(--text2);margin-top:2px">${new Date(e.date+'T12:00').toLocaleDateString('pt-BR')} ${e.hora||''}</div>
        ${e.obs?`<div style="font-size:.72rem;color:var(--text3);margin-top:2px">${e.obs}</div>`:''}
      </div>
      <button class="btn btn-danger btn-sm btn-icon" onclick="deleteEvento(${e.id})"><i class="fas fa-trash"></i></button>
    </div>`).join('');
  }
}

function filterEventos(dateStr) {
  const evts = eventos.filter(e=>e.date===dateStr);
  if(!evts.length) { toast('Sem eventos neste dia','info'); return; }
  const tipoIcons = {visita:'🔍',obra:'🔨',entrega:'✅',reuniao:'🤝',outro:'📌'};
  const lista = document.getElementById('eventosList');
  lista.innerHTML = `<div style="font-size:.8rem;color:var(--accent);font-weight:600;margin-bottom:.5rem">${new Date(dateStr+'T12:00').toLocaleDateString('pt-BR')}</div>` +
    evts.map(e=>`<div style="padding:.75rem;background:var(--bg3);border-radius:var(--radius-xs);margin-bottom:.5rem;border:1px solid var(--border)">
      <div style="font-weight:600">${tipoIcons[e.tipo]||'📌'} ${e.titulo}</div>
      ${e.hora?`<div style="font-size:.75rem;color:var(--text2)">${e.hora}</div>`:''}
      ${e.obs?`<div style="font-size:.72rem;color:var(--text3)">${e.obs}</div>`:''}
    </div>`).join('');
}

function changeMonth(dir) { calDate.setMonth(calDate.getMonth()+dir); renderCalendar(); }

function openAddEvento() {
  document.getElementById('eventoData').value = new Date().toISOString().split('T')[0];
  document.getElementById('eventoTitulo').value='';
  document.getElementById('eventoObs').value='';
  document.getElementById('addEventoModal').classList.add('show');
}

function saveEvento() {
  const titulo = document.getElementById('eventoTitulo').value.trim();
  if(!titulo) { toast('Informe o título!','error'); return; }
  eventos.push({
    id:Date.now(), titulo,
    date:document.getElementById('eventoData').value,
    hora:document.getElementById('eventoHora').value,
    tipo:document.getElementById('eventoTipo').value,
    obs:document.getElementById('eventoObs').value
  });
  localStorage.setItem('obrasync_eventos', JSON.stringify(eventos));
  closeModal('addEventoModal');
  renderCalendar();
  toast('Evento salvo!','success');
}

function deleteEvento(id) {
  eventos = eventos.filter(e=>e.id!==id);
  localStorage.setItem('obrasync_eventos', JSON.stringify(eventos));
  renderCalendar();
  toast('Evento removido.','success');
}

// ================================================================
// DASHBOARD
// ================================================================
function updateDashboard() {
  const total = orcamentos.length;
  const fat = orcamentos.reduce((a,o)=>a+(o.total||0),0);
  const lucroTotal = orcamentos.reduce((a,o)=>a+(o.lucro||0),0);
  const aprov = orcamentos.filter(o=>o.status==='aprovado'||o.status==='finalizado').length;
  const cancel = orcamentos.filter(o=>o.status==='cancelado').length;
  const clients = new Set(orcamentos.map(o=>o.clientName).filter(Boolean)).size;

  document.getElementById('dash_total').textContent = total;
  document.getElementById('dash_faturamento').textContent = 'R$ '+fmt(fat);
  document.getElementById('dash_lucro_total').textContent = 'R$ '+fmt(lucroTotal);
  document.getElementById('dash_aprov').textContent = aprov;
  document.getElementById('dash_cancel').textContent = cancel;
  document.getElementById('dash_clientes').textContent = clients;

  const margemMedia = fat>0 ? (lucroTotal/fat*100).toFixed(1) : '0';
  const fatSub = document.getElementById('dash_fat_sub');
  const lucSub = document.getElementById('dash_lucro_sub');
  if(fatSub) fatSub.textContent = aprov+' aprovados';
  if(lucSub) lucSub.textContent = 'Margem média: '+margemMedia+'%';

  // Services chart
  const svc = {};
  orcamentos.forEach(o => { if(o.serviceType) svc[o.serviceType]=(svc[o.serviceType]||0)+1; });
  const sorted = Object.entries(svc).sort((a,b)=>b[1]-a[1]).slice(0,6);
  const max = sorted[0]?.[1]||1;
  const colors = ['var(--accent)','var(--gold)','var(--green)','var(--purple)','var(--cyan)','#f472b6'];
  document.getElementById('dash_services').innerHTML = sorted.length ?
    sorted.map(([k,v],i)=>`<div class="chart-bar">
      <div class="chart-bar-label">${k.replace(/^[^\w\s]/,'').trim()}</div>
      <div class="chart-bar-track"><div class="chart-bar-fill" style="width:${Math.round(v/max*100)}%;background:${colors[i%colors.length]}"></div></div>
      <div class="chart-bar-val" style="color:${colors[i%colors.length]}">${v}x</div>
    </div>`).join('') : '<div style="color:var(--text3);font-size:.85rem">Nenhum dado ainda</div>';

  // Monthly chart
  const monthly = {};
  orcamentos.forEach(o => {
    if(!o.date) return;
    const key = o.date.slice(0,7);
    if(!monthly[key]) monthly[key] = {fat:0,lucro:0,count:0};
    monthly[key].fat += o.total||0;
    monthly[key].lucro += o.lucro||0;
    monthly[key].count++;
  });
  const sortedM = Object.entries(monthly).sort((a,b)=>a[0].localeCompare(b[0])).slice(-6);
  const maxFat = Math.max(...sortedM.map(([,v])=>v.fat),1);
  const months = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
  document.getElementById('dash_mensal').innerHTML = sortedM.length ?
    sortedM.map(([k,v]) => {
      const [yr,mo] = k.split('-');
      return `<div class="chart-bar">
        <div class="chart-bar-label">${months[parseInt(mo)-1]} ${yr}</div>
        <div class="chart-bar-track"><div class="chart-bar-fill" style="width:${Math.round(v.fat/maxFat*100)}%;background:var(--accent)"></div></div>
        <div class="chart-bar-val" style="color:var(--accent)">R$ ${v.fat>=1000?(v.fat/1000).toFixed(1)+'k':Math.round(v.fat)}</div>
      </div>`;
    }).join('') : '<div style="color:var(--text3);font-size:.85rem">Nenhum dado ainda</div>';

  // Recent
  document.getElementById('dash_recent').innerHTML = [...orcamentos].reverse().slice(0,6).map(o=>`
    <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid var(--border)">
      <div>
        <div style="font-size:.875rem;font-weight:600">${o.orcNum||''} — ${o.clientName}</div>
        <div style="font-size:.75rem;color:var(--text3)">${o.serviceType||'—'} ${o.date?'· '+new Date(o.date+'T12:00').toLocaleDateString('pt-BR'):''}</div>
      </div>
      <div style="text-align:right">
        <div style="font-size:.9rem;color:var(--accent);font-weight:700">R$ ${fmt(o.total)}</div>
        ${o.lucro?`<div style="font-size:.72rem;color:var(--green)">Lucro: R$ ${fmt(o.lucro)}</div>`:''}
      </div>
    </div>`).join('')||'<div style="color:var(--text3);font-size:.85rem">Nenhum orçamento ainda</div>';
}

// ================================================================
// EXPORT / IMPORT
// ================================================================
function exportData() {
  const data = {
    version:2, exportDate:new Date().toISOString(),
    orcamentos, matBank, eventos,
    orcCounter
  };
  const blob = new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `obrasync-backup-${new Date().toISOString().slice(0,10)}.json`;
  a.click();
  toast('Backup exportado!','success');
}

function importData(event) {
  const file = event.target.files[0];
  if(!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const data = JSON.parse(e.target.result);
      if(data.orcamentos) { orcamentos = data.orcamentos; localStorage.setItem('obrasync_orcs',JSON.stringify(orcamentos)); }
      if(data.matBank) { matBank = data.matBank; localStorage.setItem('obrasync_mats',JSON.stringify(matBank)); }
      if(data.eventos) { eventos = data.eventos; localStorage.setItem('obrasync_eventos',JSON.stringify(eventos)); }
      if(data.orcCounter) { orcCounter = data.orcCounter; localStorage.setItem('obrasync_counter',orcCounter); }
      updateCountBadge(); renderOrcamentos(); renderMatBank(); renderCalendar();
      toast('Dados importados com sucesso!','success');
    } catch(err) { toast('Arquivo inválido!','error'); }
  };
  reader.readAsText(file);
}

// ================================================================
// TOAST
// ================================================================
function toast(msg, type='success') {
  const c = document.getElementById('toastContainer');
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  const icons = {success:'fa-check-circle',error:'fa-exclamation-circle',info:'fa-info-circle'};
  t.innerHTML = `<i class="fas ${icons[type]||'fa-info-circle'}"></i> ${msg}`;
  c.appendChild(t);
  setTimeout(() => { t.style.opacity='0'; t.style.transition='opacity .3s'; setTimeout(()=>t.remove(),300); }, 3000);
}

// ================================================================
// SEED DEFAULT MATERIALS (if empty)
// ================================================================
function seedDefaultMats() {
  if(matBank.length > 0) return;
  const defaults = [
    {id:1,name:'Cimento CP-II 50kg',unit:'sc',price:35.90,category:'Cimento / Argamassa'},
    {id:2,name:'Areia lavada',unit:'m³',price:130,category:'Areia / Brita'},
    {id:3,name:'Brita 1',unit:'m³',price:150,category:'Areia / Brita'},
    {id:4,name:'Tinta acrílica 18L',unit:'lt',price:119.90,category:'Tinta / Textura'},
    {id:5,name:'Massa corrida 25kg',unit:'sc',price:44.90,category:'Tinta / Textura'},
    {id:6,name:'Fio 2,5mm 100m',unit:'rl',price:89.90,category:'Elétrica'},
    {id:7,name:'Fio 4mm 100m',unit:'rl',price:139.90,category:'Elétrica'},
    {id:8,name:'Disjuntor 20A',unit:'un',price:22.50,category:'Elétrica'},
    {id:9,name:'Tomada 2P+T',unit:'un',price:11.90,category:'Elétrica'},
    {id:10,name:'Interruptor simples',unit:'un',price:9.90,category:'Elétrica'},
    {id:11,name:'Tubo PVC 25mm (6m)',unit:'br',price:27.90,category:'Hidráulica'},
    {id:12,name:'Joelho 90° 25mm',unit:'un',price:3.90,category:'Hidráulica'},
    {id:13,name:'Registro de pressão 1/2"',unit:'un',price:35.90,category:'Hidráulica'},
    {id:14,name:'Tijolo furado 9x19x19',unit:'un',price:0.85,category:'Alvenaria'},
    {id:15,name:'Rolo de lã 23cm',unit:'un',price:17.90,category:'Tinta / Textura'},
  ];
  matBank = defaults;
  localStorage.setItem('obrasync_mats', JSON.stringify(matBank));
}
seedDefaultMats();
