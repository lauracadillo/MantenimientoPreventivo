let DATA = {};
let filteredData = [];

const SHEET_URL = 'https://script.google.com/macros/s/AKfycbwjtLY_uTutp4ff-1VbLmKqjusVvEBrQ4EJvswq8Qbd2AU7l7IZPNz8Kk8EhsoIFKusYQ/exec'; 

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
  document.getElementById('filter-flm').value = '';
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
    <tr class="${item['Priorizacion'] ? 'fila-priorizada' : ''}">
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
  const estado = document.getElementById('filter-flm').value;
  const prioridad = document.getElementById('filter-prioridad').value;
  const revision = document.getElementById('filter-revision').value;
  const mes = Number(document.getElementById('filter-mes').value);

  filteredData = DATA.mantenimientos.filter(item => {
    const matchSearch = !search ||
      (item['Site Id'] || '').toLowerCase().includes(search) ||
      (item['Site Name'] || '').toLowerCase().includes(search) ||
      (item['MES_PROGRA'] || '').toLowerCase().includes(search) ||
      (item['FLM'] || '').toLowerCase().includes(search);
    const matchEstado = !estado || item['FLM'] === estado;
    const matchPrioridad = !prioridad || item['tipo'] === prioridad;
     const matchRevision = !revision ||
      (revision === 'excluir' && item['revision']) ||
      (revision === 'ok' && !item['revision']);
    const matchMes = !mes || item['MES_PROGRA'] === mes;
    
    return matchSearch && matchEstado && matchPrioridad && matchRevision && matchMes;
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
  document.getElementById('btn-volver').style.display = 'block';
  document.getElementById('detalle-grid').innerHTML = `

    <div class="detalle-card">
      <h3>Cambio de tipo y Frecuencia</h3>
      <div class="detalle-row"><span class="detalle-label">¿Cambió de tipo?</span><span class="detalle-value">${variacionBadge(item['variacion'])}</span></div>
      <div class="detalle-row"><span class="detalle-label">Tipo anterior</span><span class="detalle-value">${item['tipo anterior']}</span></div>
      <div class="detalle-row"><span class="detalle-label">Tipo actual</span><span class="detalle-value">${item['tipo']}</span></div>
      <div class="detalle-row"><span class="detalle-label">Frecuencia</span><span class="detalle-value">${item['frecuencia ']}</span></div>
    </div>

    <div class="detalle-card">
      <h3>Estado y Alertas</h3>
      <div class="detalle-row"><span class="detalle-label">Blacklist</span><span class="detalle-value">${item['blacklist'] === 'Sí' ? '<span class="badge vencido">Sí</span>' : '<span class="badge completado">No</span>'}</span></div>
      <div class="detalle-row"><span class="detalle-label">Swap</span><span class="detalle-value">${item['swap'] || '—'}</span></div>
      <div class="detalle-row"><span class="detalle-label">Revisión</span><span class="detalle-value">${item['revision'] ? '<span class="badge vencido">Excluir</span>' : '<span class="badge completado">OK</span>'}</span></div>
      <div class="detalle-row"><span class="detalle-label">Priorización Grobert</span><span class="detalle-value">${item['Priorizacion'] || '—'}</span></div>

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

function switchView(view) {
  if (view === 'dashboard') {
    document.getElementById('view-detalle').classList.remove('active');
    document.getElementById('detalle-grid').innerHTML = '';
    document.getElementById('detalle-title').textContent = '';
    document.getElementById('detalle-subtitle').textContent = '';
  }
}

function switchTab(tab) {
  // Tabs del header
  document.querySelectorAll('.topbar-tab').forEach(t => t.classList.remove('active'));
  document.querySelector(`.topbar-tab[onclick="switchTab('${tab}')"]`).classList.add('active');

  // Ocultar todas las vistas de tab
  document.querySelectorAll('.tab-view').forEach(v => v.style.display = 'none');

  // Ocultar/mostrar secciones de la vista principal
  const isMain = tab === 'Plan 2026';
  document.getElementById('top-page-header').style.display = isMain ? '' : 'none';
  document.querySelector('.kpi-grid').style.display = isMain ? '' : 'none';
  document.querySelector('.table-card').style.display = isMain ? '' : 'none';
  document.getElementById('view-detalle').style.display = isMain ? '' : 'none';

  if (tab === 'costos') {
    document.getElementById('view-costos').style.display = 'block';
    
    renderCostos();
  }
  if (tab === 'reprogramar') {
    document.getElementById('view-reprogramar').style.display = 'block';
  }
}

function renderCostos() {
  if (!DATA.costos || !DATA.mantenimientos) return;

  const costosMap = {};
  DATA.costos.forEach(item => {
    costosMap[item['llave zona']] = Number(item['Costo 2026']) || 0;
  });

  const trimestres = {
    'T3': [7, 8, 9],
    'T4': [10, 11, 12]
  };

  const zonas = [...new Set(DATA.mantenimientos.map(x => x['Zona']))].sort();
  const fmt = n => 'S/ ' + Math.abs(n).toLocaleString();

  function construirTabla(filtrarRevision) {
    const datos = filtrarRevision
      ? DATA.mantenimientos.filter(x => !x['revision'])
      : DATA.mantenimientos;

    const resumen = zonas.map(zona => {
      const fila = { zona };
      let totalZona = 0;
      Object.entries(trimestres).forEach(([trim, meses]) => {
        const sites = datos.filter(x =>
          x['Zona'] === zona && meses.includes(Number(x['MES_PROGRA']))
        );
        const suma = sites.reduce((s, x) => s + (costosMap[x['llave zona']] || 0), 0);
        fila[trim] = suma;
        totalZona += suma;
      });
      fila.total = totalZona;
      return fila;
    });

    const totalesTrim = {};
    let totalGeneral = 0;
    Object.keys(trimestres).forEach(trim => {
      totalesTrim[trim] = resumen.reduce((s, r) => s + r[trim], 0);
      totalGeneral += totalesTrim[trim];
    });

    return `
      <table>
        <thead>
          <tr>
            <th>Zona</th>
            ${Object.keys(trimestres).map(t => `<th>${t}</th>`).join('')}
            <th>Total general</th>
          </tr>
        </thead>
        <tbody>
          ${resumen.map(r => `
            <tr>
              <td style="font-weight:500">${r.zona}</td>
              ${Object.keys(trimestres).map(t => `<td style="font-family:'DM Mono',monospace">${fmt(r[t])}</td>`).join('')}
              <td style="font-family:'DM Mono',monospace;font-weight:600">${fmt(r.total)}</td>
            </tr>
          `).join('')}
          <tr style="border-top:2px solid var(--border);font-weight:700">
            <td>Total general</td>
            ${Object.keys(trimestres).map(t => `<td style="font-family:'DM Mono',monospace">${fmt(totalesTrim[t])}</td>`).join('')}
            <td style="font-family:'DM Mono',monospace">${fmt(totalGeneral)}</td>
          </tr>
        </tbody>
      </table>
    `;
  }

  // Vista normal
  document.getElementById('costos-trimestral').innerHTML = `
    <div style="margin-bottom:8px">
      <button id="btn-toggle-revision" class="btn-secondary" style="font-size:12px;padding:4px 10px">
        Ver excluyendo sitios con revisión
      </button>
    </div>
    <div id="tabla-costos-wrapper">${construirTabla(false)}</div>
  `;

  let mostrandoFiltrado = false;
  document.getElementById('btn-toggle-revision').addEventListener('click', () => {
    mostrandoFiltrado = !mostrandoFiltrado;
    document.getElementById('tabla-costos-wrapper').innerHTML = construirTabla(mostrandoFiltrado);
    document.getElementById('btn-toggle-revision').textContent = mostrandoFiltrado
      ? 'Ver tabla original'
      : 'Ver excluyendo sitios con revisión';
  });

  // Tabla de costos por tipo
  const tbody = document.getElementById('costos-body');
  let totalGeneralCostos = 0;
  const filas = DATA.costos.map(item => {
    const costo = Number(item['Costo 2026']) || 0;
    totalGeneralCostos += costo;
    return `
      <tr>
        <td><span class="prioridad-badge baja">${item['llave zona'] ?? '—'}</span></td>
        <td style="font-family:'DM Mono',monospace;font-weight:600">S/ ${costo.toLocaleString()}</td>
      </tr>
    `;
  }).join('');

  tbody.innerHTML = filas + `
    <tr style="border-top:2px solid var(--border);font-weight:600">
      <td style="text-align:right;font-size:13px">Total</td>
      <td style="font-family:'DM Mono',monospace">S/ ${totalGeneralCostos.toLocaleString()}</td>
    </tr>
  `;
}

function autocompleteSite() {
  const id = document.getElementById('repro-siteid').value.trim();
  const item = DATA.mantenimientos?.find(x => x['Site Id'] === id);
  document.getElementById('repro-sitename').value = item?.['Site Name'] ?? '';
  document.getElementById('repro-flm').value = item?.['FLM'] ?? '';
  document.getElementById('repro-mes-actual').value = item?.['MES_PROGRA'] ?? '';
}

function submitReprogramacion() {
  const siteId = document.getElementById('repro-siteid').value.trim();
  const mesNuevo = document.getElementById('repro-mes-nuevo').value;
  const motivo = document.getElementById('repro-motivo').value.trim();
  const errEl = document.getElementById('repro-error');
  const okEl = document.getElementById('repro-success');

  errEl.style.display = 'none';
  okEl.style.display = 'none';

  if (!siteId || !mesNuevo || !motivo) {
    errEl.textContent = 'Por favor completa todos los campos.';
    errEl.style.display = 'block';
    return;
  }

  const item = DATA.mantenimientos?.find(x => x['Site Id'] === siteId);
  if (!item) {
    errEl.textContent = 'Site ID no encontrado.';
    errEl.style.display = 'block';
    return;
  }

  // Aquí puedes conectar con tu backend/Google Sheets
  console.log('Reprogramación solicitada:', { siteId, mesNuevo, motivo });

  okEl.textContent = `Solicitud enviada: ${siteId} reprogramado a ${mesNuevo}.`;
  okEl.style.display = 'block';

  // Limpiar
  document.getElementById('repro-siteid').value = '';
  document.getElementById('repro-sitename').value = '';
  document.getElementById('repro-flm').value = '';
  document.getElementById('repro-mes-actual').value = '';
  document.getElementById('repro-mes-nuevo').value = '';
  document.getElementById('repro-motivo').value = '';
}

