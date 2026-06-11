let DATA = {};
let filteredData = [];

const SHEET_URL = 'https://script.google.com/macros/s/AKfycbydN6y-nw8GxG1R0L2SNWm1sHJQD1EhZnURVkrlXkBAqj6425QhqILj_T1WxR7nb6B4IQ/exec'; 

async function loadData() {
  try {
    const res = await fetch(SHEET_URL, {
      method: 'GET',
      redirect: 'follow',
    });
    const text = await res.text();
    DATA = JSON.parse(text);
    filteredData = [...DATA.mantenimientos];
  } catch (err) {
    return loadDataJSONP();
  }
}

function log(msg) {
  console.log(msg);
  // También lo muestra en la tabla para verlo sin abrir DevTools
  document.getElementById('table-body').innerHTML =
    `<tr><td colspan="14" style="padding:1rem;font-family:monospace;font-size:12px">${msg}</td></tr>`;
}

function loadDataJSONP() {
  return new Promise((resolve, reject) => {
    log('📡 Iniciando JSONP...');

    const callbackName = 'sheetCallback_' + Date.now();
    const script = document.createElement('script');

    window[callbackName] = function(data) {
      log('✅ Datos recibidos: ' + (data?.mantenimientos?.length ?? 0) + ' registros');
      DATA = data;
      filteredData = [...DATA.mantenimientos];
      delete window[callbackName];
      document.body.removeChild(script);
      resolve();
    };

    script.onerror = (e) => {
      log('❌ Error en script tag: ' + JSON.stringify(e));
      reject(new Error('JSONP falló'));
    };

    const url = SHEET_URL + '?callback=' + callbackName;
    log('🔗 URL: ' + url);
    script.src = url;
    document.body.appendChild(script);

    // Timeout: si en 10s no responde, muestra error
    setTimeout(() => {
      if (window[callbackName]) {
        log('⏱️ Timeout: no hubo respuesta en 10 segundos');
        reject(new Error('Timeout'));
      }
    }, 10000);
  });
}

function loadDataJSONP() {
  return new Promise((resolve, reject) => {
    const callbackName = 'sheetCallback_' + Date.now();
    const script = document.createElement('script');

    window[callbackName] = function(data) {
      DATA = data;
      filteredData = [...DATA.mantenimientos];
      delete window[callbackName];
      document.body.removeChild(script);
      resolve();
    };

    script.onerror = () => reject(new Error('JSONP falló'));
    script.src = SHEET_URL + '?callback=' + callbackName;
    document.body.appendChild(script);
  });
}

async function loadData() {
  return loadDataJSONP();
}
async function handleLogin() {
  const user = document.getElementById('username').value.trim();
  const pass = document.getElementById('password').value;
  const err = document.getElementById('login-error');

  if (user === 'admin' && pass === '1234') {
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('dashboard-screen').style.display = 'block';

    // Muestra un loading mientras carga
    document.getElementById('table-body').innerHTML =
      '<tr><td colspan="14" style="text-align:center;padding:2rem">Cargando datos...</td></tr>';

    await loadData(); 

    renderKPIs(DATA.mantenimientos);
    renderTable(DATA.mantenimientos);
  } else {
    err.style.display = 'block';
    document.getElementById('password').value = '';
  }
}

function handleLogout() {
  document.getElementById('login-screen').style.display = 'flex';
  document.getElementById('dashboard-screen').style.display = 'none';
  document.getElementById('username').value = '';
  document.getElementById('password').value = '';
  document.getElementById('login-error').style.display = 'none';
  document.getElementById('search-input').value = '';
  document.getElementById('filter-estado').value = '';
  document.getElementById('filter-prioridad').value = '';
}

document.getElementById('password').addEventListener('keydown', e => {
  if (e.key === 'Enter') handleLogin();
});
document.getElementById('username').addEventListener('keydown', e => {
  if (e.key === 'Enter') document.getElementById('password').focus();
});

function renderKPIs(data) {
  const d = data ?? DATA.mantenimientos;

  document.getElementById('kpi-total').textContent = d.length;
  document.getElementById('kpi-excluidos').textContent = d.filter(x => x['revision'] && x['revision'] !== '').length;
  document.getElementById('kpi-blacklist').textContent = d.filter(x => 
    x['blacklist'] === 'Si' || x['blacklist'] === 'Sí'
  ).length;
  document.getElementById('kpi-swap').textContent = d.filter(x => 
    x['swap'] && x['swap'] !== 'No' && x['swap'] !== ''
  ).length;
}

function variacionBadge(v) {
  if (!v) return '—';
  if (v === 'No Cambió') return '<span class="badge completado">' + v + '</span>';
  if (v.includes('Subió')) return '<span class="badge en-proceso">' + v + '</span>';
  if (v.includes('Bajó')) return '<span class="badge pendiente">' + v + '</span>';
  return '<span style="font-size:12px">' + v + '</span>';
}

function renderTable(data) {
  const tbody = document.getElementById('table-body');
  const noRes = document.getElementById('no-results');
  const count = document.getElementById('table-count');
  const footer = document.getElementById('footer-info');

  count.textContent = data.length + ' registro' + (data.length !== 1 ? 's' : '');
  footer.textContent = data.length === DATA.mantenimientos.length
    ? 'Mostrando todos los registros'
    : 'Filtrando: ' + data.length + ' de ' + DATA.mantenimientos.length + ' registros';

  if (data.length === 0) {
    tbody.innerHTML = '';
    noRes.style.display = 'block';
    return;
  }
  noRes.style.display = 'none';

  tbody.innerHTML = data.map(item => `
    <tr>
      <td>
        <span
          onclick="openDetalle('${item['Site Id']}')"
          style="font-family:'DM Mono',monospace;font-size:12px;font-weight:600;color:var(--accent);cursor:pointer;text-decoration:underline;text-underline-offset:3px"
        >${item['Site Id'] || ''}</span>
      </td>
      <td>${item['Site Name'] || ''}</td>
      <td>${item['FLM'] || ''}</td>
      <td style="font-family:'DM Mono',monospace;font-size:12px;text-align:center">${item['MES_PROGRA'] || ''}</td>
      <td><span class="prioridad-badge media">${item['tipo anterior'] || ''}</span></td>
      <td><span class="prioridad-badge baja">${item['tipo'] || ''}</span></td>
      <td style="font-family:'DM Mono',monospace;font-size:12px;text-align:center">${item['frecuencia'] ?? ''}</td>
      <td>${variacionBadge(item['variacion'])}</td>
      <td>${item['blacklist'] === 'Sí' ? '<span class="badge vencido">Sí</span>' : '<span class="badge completado">No</span>'}</td>
      <td style="font-size:12px;color:var(--text-muted)">${item['swap'] || '—'}</td>
      <td style="font-family:'DM Mono',monospace;font-size:12px;color:var(--text-muted)">${item['ultimo_mp'] || '—'}</td>
      <td style="font-family:'DM Mono',monospace;font-size:12px">${item['ultimo_mc'] || '—'}</td>
      <td style="font-family:'DM Mono',monospace;font-size:12px;text-align:center;font-weight:600">${item['cantidad_mc'] ?? ''}</td>
      <td>${item['revision'] ? '<span class="badge vencido">Excluir</span>' : '<span class="badge completado">OK</span>'}</td>
    </tr>
  `).join('');
}

function filterTable() {
  const search = document.getElementById('search-input').value.toLowerCase();
  const estado = document.getElementById('filter-estado').value;
  const prioridad = document.getElementById('filter-prioridad').value;
  const revision = document.getElementById('filter-revision').value;

  filteredData = DATA.mantenimientos.filter(item => {
    const matchSearch = !search ||
      (item['Site Id'] || '').toLowerCase().includes(search) ||
      (item['Site Name'] || '').toLowerCase().includes(search) ||
      (item['FLM'] || '').toLowerCase().includes(search);
    const matchEstado = !estado || item['FLM'] === estado;
    const matchPrioridad = !prioridad || item['tipo'] === prioridad;
     const matchRevision = !revision ||
      (revision === 'excluir' && item['revision']) ||
      (revision === 'ok' && !item['revision']);
    return matchSearch && matchEstado && matchPrioridad && matchRevision;
  });

  renderTable(filteredData);
  renderKPIs(filteredData);
}

function downloadExcel() {
  const keys = ['Site Id','Site Name','FLM','MES_PROGRA','tipo anterior','tipo','frecuencia ','variacion','blacklist','swap','ultimo_mp','ultimo_mc','cantidad_mc','revision'];

  const ws = XLSX.utils.json_to_sheet(filteredData.map(item => {
    const row = {};
    keys.forEach(k => row[k] = item[k] ?? '');
    return row;
  }));

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Mantenimientos');
  XLSX.writeFile(wb, 'mantenimientos.xlsx');
}

function openDetalle(siteId) {
  const item = DATA.mantenimientos.find(x => x['Site Id'] === siteId);
  if (!item) return;

  document.getElementById('detalle-title').textContent = item['Site Id'] + ' · ' + item['Site Name'];
  document.getElementById('detalle-subtitle').textContent = 'FLM: ' + item['FLM'] + ' · Mes programado: ' + item['MES_PROGRA'];

  document.getElementById('detalle-grid').innerHTML = `
    <div class="detalle-card">
      <h3>Identificación</h3>
      <div class="detalle-row"><span class="detalle-label">Site Id</span><span class="detalle-value" style="font-family:'DM Mono',monospace;color:var(--accent)">${item['Site Id']}</span></div>
      <div class="detalle-row"><span class="detalle-label">Site Name</span><span class="detalle-value">${item['Site Name']}</span></div>
      <div class="detalle-row"><span class="detalle-label">FLM</span><span class="detalle-value">${item['FLM']}</span></div>
      <div class="detalle-row"><span class="detalle-label">Mes programado</span><span class="detalle-value">${item['MES_PROGRA']}</span></div>
    </div>

    <div class="detalle-card">
      <h3>Tipo y Frecuencia</h3>
      <div class="detalle-row"><span class="detalle-label">Tipo anterior</span><span class="detalle-value">${item['tipo anterior']}</span></div>
      <div class="detalle-row"><span class="detalle-label">Tipo actual</span><span class="detalle-value">${item['tipo']}</span></div>
      <div class="detalle-row"><span class="detalle-label">Frecuencia</span><span class="detalle-value">${item['frecuencia ']}</span></div>
      <div class="detalle-row"><span class="detalle-label">Variación</span><span class="detalle-value">${variacionBadge(item['variacion'])}</span></div>
    </div>

    <div class="detalle-card">
      <h3>Estado y Alertas</h3>
      <div class="detalle-row"><span class="detalle-label">Blacklist</span><span class="detalle-value">${item['blacklist'] === 'Sí' ? '<span class="badge vencido">Sí</span>' : '<span class="badge completado">No</span>'}</span></div>
      <div class="detalle-row"><span class="detalle-label">Swap</span><span class="detalle-value">${item['swap'] || '—'}</span></div>
      <div class="detalle-row"><span class="detalle-label">Revisión</span><span class="detalle-value">${item['revision'] ? '<span class="badge vencido">Excluir</span>' : '<span class="badge completado">OK</span>'}</span></div>
    </div>

    <div class="detalle-card">
      <h3>Mantenimientos</h3>
      <div class="detalle-row"><span class="detalle-label">Último MP</span><span class="detalle-value" style="font-family:'DM Mono',monospace">${item['ultimo_mp'] || '—'}</span></div>
      <div class="detalle-row"><span class="detalle-label">Último MC</span><span class="detalle-value" style="font-family:'DM Mono',monospace">${item['ultimo_mc'] || '—'}</span></div>
      <div class="detalle-row"><span class="detalle-label">Cantidad MC</span><span class="detalle-value" style="font-family:'DM Mono',monospace">${item['cantidad_mc'] ?? '—'}</span></div>
      ${item._comentario ? `<div class="detalle-row"><span class="detalle-label">Comentario</span><span class="detalle-value" style="color:var(--accent)">${item._comentario}</span></div>` : ''}
    </div>
  `;

  // Navegar a la vista
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById('view-detalle').classList.add('active');
}

// Boton salir de la vista de detalles
function switchView(view) {
  if (view === 'dashboard') {
    document.getElementById('view-detalle').classList.remove('active');
    document.getElementById('detalle-grid').innerHTML = '';
  }
}


