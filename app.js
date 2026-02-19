/**
 * MACEDO TRANSPORTES - SISTEMA DE FROTA
 * Frontend JavaScript - Integração com Apps Script
 */

// URL do Apps Script
const API_URL = 'https://script.google.com/macros/s/AKfycbyYaquZkyr0Ec0t7WGxnRPEB3UfM6JcVzuHgAzNb78ZRh209MrhA9j9qSnbws8FWt-V/exec';

// Estado da aplicação
let state = {
  veiculosLista: [],
  veiculos: [],
  motoristas: [],
  multas: [],
  abastecimentos: [],
  danos: [],
  trocasOleo: [],
  consumo: [],
  indicadores: {},
  filtroVeiculo: '',
  filtroMotorista: '',
  filtroStatus: '',
  filtroBusca: '',
  filtroMesFim: '',
  activeTab: 'dashboard',
  editingMultaIndex: null
};

// ===== INICIALIZAÇÃO =====
document.addEventListener('DOMContentLoaded', () => {
  initTabs();
  initFilters();
  initForms();
  loadAllData();
  initPWA();
});

// ===== NAVEGAÇÃO POR ABAS =====
function initTabs() {
  const tabs = document.querySelectorAll('.tab-btn');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      // Remove ativo de todas
      tabs.forEach(t => t.classList.remove('ativo'));
      // Adiciona ativo na clicada
      tab.classList.add('ativo');
      // Esconde todas as seções
      document.querySelectorAll('.secao').forEach(s => s.style.display = 'none');
      // Mostra seção correspondente
      state.activeTab = tab.dataset.tab;
      const secao = document.getElementById('sec-' + tab.dataset.tab);
      if (secao) secao.style.display = 'block';

      if (state.activeTab === 'dashboard') {
        renderDashboard();
      }
    });
  });
}

// ===== FILTROS =====
function initFilters() {
  document.getElementById('btnAplicarFiltros').addEventListener('click', applyFilters);
  document.getElementById('btnLimparFiltros').addEventListener('click', clearFilters);
}

function applyFilters() {
  state.filtroVeiculo = document.getElementById('filtroVeiculoGlobal').value;
  state.filtroMotorista = document.getElementById('filtroMotoristaGlobal').value;
  state.filtroStatus = document.getElementById('filtroStatusGlobal').value;
  state.filtroBusca = document.getElementById('filtroBuscaGlobal').value.toLowerCase();
  state.filtroMesInicio = document.getElementById('filtroMesInicio').value;
  state.filtroMesFim = document.getElementById('filtroMesFim').value;

  if (state.activeTab === 'dashboard') {
    loadDashboardData();
  }

  renderAllTables();
  loadIndicadores();
  loadConsumo();
}

function clearFilters() {
  document.getElementById('filtroVeiculoGlobal').value = '';
  document.getElementById('filtroMotoristaGlobal').value = '';
  document.getElementById('filtroStatusGlobal').value = '';
  document.getElementById('filtroBuscaGlobal').value = '';
  document.getElementById('filtroMesInicio').value = '';
  document.getElementById('filtroMesFim').value = '';

  state.filtroVeiculo = '';
  state.filtroMotorista = '';
  state.filtroStatus = '';
  state.filtroBusca = '';
  state.filtroMesInicio = '';
  state.filtroMesFim = '';

  renderAllTables();
  loadIndicadores();
  loadConsumo();
}

// ===== FORMULÁRIOS =====
function initForms() {
  // Multas
  document.getElementById('btnSalvarMulta').addEventListener('click', saveMulta);
  // OCR
  document.getElementById('btnExtrairDados').addEventListener('click', extractOCRData);
  // Abastecimentos
  document.getElementById('btnSalvarAbast').addEventListener('click', saveAbastecimento);
  // Troca de Óleo
  document.getElementById('btnSalvarOleo').addEventListener('click', saveTrocaOleo);
  // Danos
  document.getElementById('btnSalvarDano').addEventListener('click', saveDano);
  // Motoristas
  document.getElementById('btnSalvarMotorista').addEventListener('click', saveMotorista);
  // Veículos
  document.getElementById('btnSalvarVeiculo').addEventListener('click', saveVeiculo);
}

// ===== LOADING =====
function showLoading() {
  document.getElementById('loading').style.display = 'flex';
}

function hideLoading() {
  document.getElementById('loading').style.display = 'none';
}

// ===== CHAMADAS API =====
async function callApi(action, params = {}) {
  const url = new URL(API_URL);
  url.searchParams.append('action', action);
  Object.keys(params).forEach(key => {
    url.searchParams.append(key, params[key]);
  });

  try {
    const response = await fetch(url.toString());
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Erro na API:', error);
    return null;
  }
}

async function postApi(action, data) {
  const url = new URL(API_URL);
  url.searchParams.append('action', action);

  try {
    const response = await fetch(url.toString(), {
      method: 'POST',
      mode: 'no-cors',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });
    return true;
  } catch (error) {
    console.error('Erro na API:', error);
    return false;
  }
}

// ===== CARREGAR DADOS =====
async function loadAllData() {
  showLoading();

  try {
    // Usar iframe para contornar CORS do Apps Script
    await Promise.all([
      loadCombos(),
      loadMultas(),
      loadAbastecimentos(),
      loadDanos(),
      loadMotoristas(),
      loadVeiculos(),
      loadTrocaOleo(),
      loadIndicadores()
    ]);

    // Se estiver na aba dashboard, renderizar
    if (state.activeTab === 'dashboard') {
      renderDashboard();
    }
  } catch (error) {
    console.error('Erro ao carregar dados:', error);
  }

  hideLoading();
}

async function loadCombos() {
  const data = await callApi('getCombos');
  if (data) {
    state.veiculos = data.veiculos || [];
    state.motoristas = data.motoristas || [];
    populateCombos();
  }
}

function populateCombos() {
  // Veículos - Filtro Global
  const filtroVeiculo = document.getElementById('filtroVeiculoGlobal');
  filtroVeiculo.innerHTML = '<option value="">Todos os veículos</option>';
  state.veiculos.forEach(v => {
    filtroVeiculo.innerHTML += `<option value="${v}">${v}</option>`;
  });

  // Motoristas - Filtro Global
  const filtroMotorista = document.getElementById('filtroMotoristaGlobal');
  filtroMotorista.innerHTML = '<option value="">Todos os motoristas</option>';
  state.motoristas.forEach(m => {
    filtroMotorista.innerHTML += `<option value="${m}">${m}</option>`;
  });

  // Combos nos formulários
  const veiculoSelects = ['multa-veiculo', 'abast-veiculo', 'oleo-veiculo', 'dano-veiculo'];
  veiculoSelects.forEach(id => {
    const select = document.getElementById(id);
    if (select) {
      select.innerHTML = '<option value="">Selecione...</option>';
      state.veiculos.forEach(v => {
        select.innerHTML += `<option value="${v}">${v}</option>`;
      });

      // Auto-preencher motorista ao selecionar veículo
      select.addEventListener('change', (e) => {
        const placa = e.target.value;
        const prefix = id.split('-')[0];
        autoFillMotorista(placa, prefix);
      });
    }
  });

  const motoristaSelects = ['multa-motorista', 'abast-motorista', 'oleo-motorista', 'dano-motorista', 'veic-motorista'];
  motoristaSelects.forEach(id => {
    const select = document.getElementById(id);
    if (select) {
      select.innerHTML = '<option value="">Selecione...</option>';
      state.motoristas.forEach(m => {
        select.innerHTML += `<option value="${m}">${m}</option>`;
      });
    }
  });
}

async function loadMultas() {
  const data = await callApi('getMultas');
  if (data) {
    state.multas = data;
    renderMultas();
    if (state.activeTab === 'dashboard') renderDashboard();
  }
}

async function loadAbastecimentos() {
  const data = await callApi('getAbastecimentos');
  if (data) {
    state.abastecimentos = data;
    renderAbastecimentos();
    if (state.activeTab === 'dashboard') renderDashboard();
  }
}

async function loadDanos() {
  const data = await callApi('getDanos');
  if (data) {
    state.danos = data;
    renderDanos();
  }
}

async function loadMotoristas() {
  const data = await callApi('getMotoristas');
  if (data) {
    renderMotoristas(data);
  }
}

async function loadVeiculos() {
  const data = await callApi('getVeiculos');
  if (data) {
    state.veiculosLista = data;
    renderVeiculos();
  }
}

async function loadTrocaOleo() {
  const data = await callApi('getTrocaOleo');
  if (data) {
    state.trocasOleo = data.trocas || [];
    renderTrocaOleo();
    renderAlertasOleo(data.alertas || []);
  }
}

async function loadIndicadores() {
  const params = {};
  if (state.filtroMesInicio) params.mesInicio = state.filtroMesInicio;
  if (state.filtroMesFim) params.mesFim = state.filtroMesFim;

  const data = await callApi('getIndicadores', params);
  if (data) {
    state.indicadores = data;
    renderIndicadores();
  }
}

async function loadConsumo() {
  const params = {};
  if (state.filtroMesInicio) params.mesInicio = state.filtroMesInicio;
  if (state.filtroMesFim) params.mesFim = state.filtroMesFim;

  const data = await callApi('getConsumo', params);
  if (data) {
    state.consumo = data;
    renderConsumo();
    if (state.activeTab === 'dashboard') renderDashboard();
  }
}

// Função para carregar dados específicos do dashboard
async function loadDashboardData() {
  await Promise.all([
    loadIndicadores(),
    loadConsumo()
  ]);
  renderDashboard();
}

// ===== RENDERIZAÇÃO =====
function renderAllTables() {
  renderMultas();
  renderAbastecimentos();
  renderDanos();
  renderVeiculos();
  renderTrocaOleo();
}

function sortByDate(data) {
  return [...data].sort((a, b) => {
    const dataA = (a.data || '').trim();
    const dataB = (b.data || '').trim();

    // Se ambos vazios, mantém posição
    if (!dataA && !dataB) return 0;
    // Se um vazio, joga para o fim (baixo)
    if (!dataA) return 1;
    if (!dataB) return -1;

    // Converter DD/MM/YYYY para YYYYMMDD para comparação de string
    const d1 = dataA.split('/').reverse().join('');
    const d2 = dataB.split('/').reverse().join('');

    return d2.localeCompare(d1); // Mais recente primeiro
  });
}

function filterData(data) {
  return data.filter(item => {
    // 1. Filtro de Veículo
    if (state.filtroVeiculo && item.veiculo !== state.filtroVeiculo) return false;

    // 2. Filtro de Motorista
    if (state.filtroMotorista && item.motorista !== state.filtroMotorista) return false;

    // 3. Filtro de Status
    if (state.filtroStatus) {
      const statusItem = (item.status || '').toLowerCase();
      const statusFiltro = state.filtroStatus.toLowerCase();

      if (statusFiltro === 'pago') {
        if (statusItem !== 'pago' && statusItem !== 'resolvido') return false;
      } else if (statusItem !== statusFiltro) {
        return false;
      }
    }

    // 4. Filtro de Período (Mês/Ano)
    if (item.data && (state.filtroMesInicio || state.filtroMesFim)) {
      // Assumindo data no formato DD/MM/YYYY
      const partes = item.data.split('/');
      if (partes.length === 3) {
        const dataItemStr = `${partes[2]}-${partes[1]}`; // YYYY-MM

        if (state.filtroMesInicio && dataItemStr < state.filtroMesInicio) return false;
        if (state.filtroMesFim && dataItemStr > state.filtroMesFim) return false;
      }
    }

    // 5. Busca Global (Auto, Tipo, Descrição)
    if (state.filtroBusca) {
      const busca = state.filtroBusca;
      const conteudo = [
        item.auto || '',
        item.tipo || '',
        item.descricao || '',
        item.veiculo || '',
        item.motorista || ''
      ].join(' ').toLowerCase();

      if (!conteudo.includes(busca)) return false;
    }

    return true;
  });
}

function generateWhatsAppLink(m) {
  const text = `*Informações da Multa - Macedo Transportes*\n\n` +
    `*Data:* ${m.data}\n` +
    `*Veículo:* ${m.veiculo}\n` +
    `*Motorista:* ${m.motorista}\n` +
    `*Tipo:* ${m.tipo}\n` +
    `*Auto:* ${m.auto}\n` +
    `*Valor:* R$ ${formatNumber(m.valor)}\n` +
    `*Status:* ${m.status || 'Pendente'}\n` +
    `*Data Limite:* ${m.dataLimite || '-'}\n` +
    (m.anexo ? `\n*Anexo:* ${m.anexo}` : '');

  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

function renderMultas() {
  const tbody = document.querySelector('#tabelaMultas tbody');
  const filtered = filterData(state.multas);
  const sorted = sortByDate(filtered);

  tbody.innerHTML = sorted.map(m => {
    const statusClass = m.status === 'Pago' ? 'badge-resolvido' : 'badge-pendente';
    const waLink = generateWhatsAppLink(m);

    return `
    <tr>
      <td>${m.data}</td>
      <td>${m.veiculo}</td>
      <td>${m.motorista}</td>
      <td>${m.tipo}</td>
      <td>${m.auto}</td>
      <td>${m.anexo ? `<a href="${m.anexo}" target="_blank" class="link-anexo">Abrir</a>` : '-'}</td>
      <td>R$ ${formatNumber(m.valor)}</td>
      <td><span class="badge ${statusClass}">${m.status || 'Pendente'}</span></td>
      <td>${m.dataLimite || '-'}</td>
      <td>
        <div class="acoes-container" style="display:flex; gap:8px; align-items:center">
          <button class="btn-small btn-edit" title="Editar" onclick="editMulta(${m.rowIndex})">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>
          </button>
          <select class="btn-small btn-status" onchange="updateMultaStatus(${m.rowIndex}, this.value)">
            <option value="Pendente" ${m.status !== 'Pago' ? 'selected' : ''}>Pendente</option>
            <option value="Pago" ${m.status === 'Pago' ? 'selected' : ''}>Pago</option>
          </select>
          <a href="${waLink}" target="_blank" title="Encaminhar WhatsApp" class="btn-wa">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M12.031 6.172c-2.32 0-4.519.903-6.16 2.544-3.399 3.4-3.399 8.929 0 12.329l-1.03 3.093 3.146-1.016a8.618 8.618 0 004.044 1.012h.001c2.32 0 4.519-.903 6.16-2.544 3.399-3.4 3.399-8.929 0-12.329-1.641-1.641-3.84-2.544-6.161-2.544zM16.421 17.512c-.244.688-1.218 1.252-1.681 1.341-.462.089-.915.111-2.911-.702-2.112-.857-3.456-2.991-3.563-3.133-.106-.142-.862-1.144-.862-2.182 0-1.038.543-1.547.734-1.758.192-.212.413-.265.552-.265.138 0 .276 0 .393.006.128.006.297-.048.467.359.17.408.584 1.423.637 1.529.053.106.089.23.018.371-.071.142-.106.23-.212.353-.106.123-.223.275-.318.369-.106.106-.217.222-.094.433.123.212.548.905 1.178 1.464.812.721 1.496.944 1.708 1.05.212.106.337.089.463-.053.127-.142.541-.632.686-.844.144-.212.29-.177.488-.106.198.071 1.264.596 1.482.704s.359.162.413.254c.054.092.054.532-.19 1.22z"/></svg>
          </a>
        </div>
      </td>
    </tr>
  `;
  }).join('');
}

function editMulta(rowIndex) {
  const m = state.multas.find(item => item.rowIndex === rowIndex);
  if (!m) return;

  state.editingMultaIndex = rowIndex;

  // Preencher formulário
  // Data está em DD/MM/YYYY, precisa ser YYYY-MM-DD para input date
  if (m.data) {
    const partes = m.data.split('/');
    document.getElementById('multa-data').value = `${partes[2]}-${partes[1]}-${partes[0]}`;
  }

  document.getElementById('multa-veiculo').value = m.veiculo;
  document.getElementById('multa-motorista').value = m.motorista;
  document.getElementById('multa-tipo').value = m.tipo;
  document.getElementById('multa-auto').value = m.auto;
  document.getElementById('multa-valor').value = m.valor;

  if (m.dataLimite) {
    const partes = m.dataLimite.split('/');
    document.getElementById('multa-datalimite').value = `${partes[2]}-${partes[1]}-${partes[0]}`;
  }

  // Mudar botão
  const btn = document.getElementById('btnSalvarMulta');
  btn.textContent = 'Atualizar multa';
  btn.classList.add('btn-edit-mode');

  // Rolar para o topo do formulário
  document.querySelector('#sec-multas').scrollIntoView({ behavior: 'smooth' });
}

function renderAbastecimentos() {
  const tbody = document.querySelector('#tabelaAbastecimentos tbody');
  const filtered = filterData(state.abastecimentos);
  const sorted = sortByDate(filtered);

  tbody.innerHTML = sorted.map(a => `
    <tr>
      <td>${a.data}</td>
      <td>${a.veiculo}</td>
      <td>${a.motorista}</td>
      <td>${formatNumber(a.km)}</td>
      <td>${formatNumber(a.litros)}</td>
      <td>R$ ${formatNumber(a.valor)}</td>
    </tr>
  `).join('');
}

function renderDanos() {
  const tbody = document.querySelector('#tabelaDanos tbody');
  const filtered = filterData(state.danos);
  const sorted = sortByDate(filtered);

  tbody.innerHTML = sorted.map(d => `
    <tr>
      <td>${d.data}</td>
      <td>${d.veiculo}</td>
      <td>${d.motorista}</td>
      <td>${d.descricao}</td>
      <td><span class="badge badge-${d.status.toLowerCase().replace(' ', '')}">${d.status}</span></td>
      <td>
        <select class="btn-small btn-status" onchange="updateDanoStatus(${d.rowIndex}, this.value)">
          <option value="Pendente" ${d.status === 'Pendente' ? 'selected' : ''}>Pendente</option>
          <option value="Em reparo" ${d.status === 'Em reparo' ? 'selected' : ''}>Em reparo</option>
          <option value="Resolvido" ${d.status === 'Resolvido' ? 'selected' : ''}>Resolvido</option>
        </select>
      </td>
    </tr>
  `).join('');
}

function renderMotoristas(data) {
  const tbody = document.querySelector('#tabelaMotoristas tbody');

  tbody.innerHTML = data.map(m => `
    <tr>
      <td>${m.nome}</td>
      <td>${m.cpf}</td>
      <td>${m.cnh}</td>
      <td>${m.categoria}</td>
      <td>${m.validade}</td>
      <td><span class="badge badge-${m.status.toLowerCase()}">${m.status}</span></td>
    </tr>
  `).join('');
}

function renderVeiculos() {
  const tbody = document.querySelector('#tabelaVeiculos tbody');
  const data = state.veiculosLista || [];

  if (data.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center">Nenhum veículo cadastrado</td></tr>';
    return;
  }

  tbody.innerHTML = data.map(v => {
    const statusText = v.status || 'Ativo';
    const statusClass = statusText.toLowerCase().replace(/ç/g, 'c').replace(/ã/g, 'a');
    return `
    <tr>
      <td>${v.placa || ''}</td>
      <td>${v.modelo || ''}</td>
      <td>${v.ano || ''}</td>
      <td><span class="badge badge-${statusClass}">${statusText}</span></td>
      <td>${v.clrv ? `<a href="${v.clrv}" target="_blank" class="link-anexo">Ver CRLV</a>` : '-'}</td>
      <td>${v.motorista || '-'}</td>
      <td>
        <button class="btn-small btn-edit" onclick="editVeiculo('${v.placa}')">Editar</button>
      </td>
    </tr>
  `;
  }).join('');
}

function renderTrocaOleo() {
  const tbody = document.querySelector('#tabelaOleo tbody');
  const sorted = sortByDate(state.trocasOleo);

  tbody.innerHTML = sorted.map(o => `
    <tr>
      <td>${o.data}</td>
      <td>${o.veiculo}</td>
      <td>${o.motorista}</td>
      <td>${formatNumber(o.kmTroca)}</td>
      <td>${formatNumber(o.intervalo)}</td>
      <td>${formatNumber(o.proximaTroca)}</td>
      <td>${o.obs || '-'}</td>
    </tr>
  `).join('');
}

function renderAlertasOleo(alertas) {
  const container = document.getElementById('alertasOleo');
  const conteudo = document.getElementById('alertasOleoConteudo');

  if (alertas.length === 0) {
    container.style.display = 'none';
    return;
  }

  container.style.display = 'block';
  conteudo.innerHTML = alertas.map(a => `
    <div class="alert-item">
      <strong>${a.veiculo}</strong> - 
      <span class="badge badge-oleo-${a.classe}">${a.status}</span> - 
      Km atual: ${formatNumber(a.kmAtual)} | Próxima: ${formatNumber(a.proximaTroca)} | 
      Restante: ${formatNumber(a.kmRestante)} km
    </div>
  `).join('');
}

function renderIndicadores() {
  const ind = state.indicadores;

  document.getElementById('indMultasValor').textContent = `R$ ${formatNumber(ind.totalMultasMes || 0)}`;
  document.getElementById('indMultasQtd').textContent = `${ind.qtdMultasMes || 0} multas`;

  document.getElementById('indAbastLitros').textContent = `${formatNumber(ind.totalLitrosMes || 0)} L`;
  document.getElementById('indAbastValor').textContent = `R$ ${formatNumber(ind.totalAbastecimentoMes || 0)}`;

  document.getElementById('indDanosPendentes').textContent = ind.danosPendentes || 0;
  document.getElementById('indVeiculosAtivos').textContent = ind.veiculosAtivos || 0;
}

function renderConsumo() {
  const tbody = document.querySelector('#tabelaConsumo tbody');

  tbody.innerHTML = state.consumo.map(c => `
    <tr>
      <td>${c.veiculo}</td>
      <td>${formatNumber(c.kmRodado)}</td>
      <td>${formatNumber(c.litros)}</td>
      <td>${formatNumber(c.consumo)} km/L</td>
    </tr>
  `).join('');
}

// Global charts instances - REMOVIDO PARA PERFORMANCE
let charts = {};

function renderDashboard() {
  const dataMultas = filterData(state.multas);
  const dataAbast = filterData(state.abastecimentos);
  const dataConsumo = state.consumo;

  // 1. Top 5 Abastecimentos (L)
  const rankingAbast = {};
  dataAbast.forEach(a => {
    rankingAbast[a.veiculo] = (rankingAbast[a.veiculo] || 0) + Number(a.litros || 0);
  });
  const topAbast = Object.entries(rankingAbast)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  document.getElementById('listMaisAbastecidos').innerHTML = topAbast.length > 0
    ? topAbast.map((i, idx) => `
      <li class="rank-item">
        <span class="label">${idx + 1}. ${i[0]}</span>
        <span class="value">${formatNumber(i[1])} L</span>
      </li>
    `).join('')
    : '<li class="rank-item">Sem dados no período</li>';

  // 2. Melhores Médias
  const melhoresMedias = [...dataConsumo]
    .filter(c => c.consumo > 0)
    .sort((a, b) => b.consumo - a.consumo)
    .slice(0, 5);

  document.getElementById('listMelhoresMedias').innerHTML = melhoresMedias.length > 0
    ? melhoresMedias.map((m, idx) => `
      <li class="rank-item">
        <span class="label">${idx + 1}. ${m.veiculo}</span>
        <span class="value">${formatNumber(m.consumo)} km/L</span>
      </li>
    `).join('')
    : '<li class="rank-item">Sem dados no período</li>';

  // 3. Multas Mensais (Lista simples)
  const mesesMultas = {};
  dataMultas.forEach(m => {
    if (!m.data) return;
    const partes = m.data.split('/');
    const mes = partes[1] + '/' + partes[2];
    if (!mesesMultas[mes]) mesesMultas[mes] = { Pago: 0, Pendente: 0 };
    mesesMultas[mes][m.status === 'Pago' ? 'Pago' : 'Pendente'] += Number(m.valor || 0);
  });

  const labelsMeses = Object.keys(mesesMultas).sort((a, b) => {
    const [m1, y1] = a.split('/');
    const [m2, y2] = b.split('/');
    return new Date(y2, m2 - 1) - new Date(y1, m1 - 1); // Mais recente primeiro
  }).slice(0, 5);

  document.getElementById('listMultasMensal').innerHTML = labelsMeses.length > 0
    ? labelsMeses.map(l => `
      <li class="rank-item">
        <span class="label">${l}</span>
        <span class="value">
          <span style="color:#e74c3c">P: R$ ${formatNumber(mesesMultas[l].Pendente)}</span> | 
          <span style="color:#2ecc71">Q: R$ ${formatNumber(mesesMultas[l].Pago)}</span>
        </span>
      </li>
    `).join('')
    : '<li class="rank-item">Sem multas no período</li>';

  // 4. Resumo de Gastos
  const totalLitros = dataAbast.reduce((sum, a) => sum + Number(a.litros || 0), 0);
  const totalAbastVal = dataAbast.reduce((sum, a) => sum + Number(a.valor || 0), 0);
  const totalMultasVal = dataMultas.reduce((sum, m) => sum + Number(m.valor || 0), 0);

  const resumoHtml = `
    <li class="rank-item"><span class="label">Total Litros:</span> <span class="value">${formatNumber(totalLitros)} L</span></li>
    <li class="rank-item"><span class="label">Abastecimento:</span> <span class="value">R$ ${formatNumber(totalAbastVal)}</span></li>
    <li class="rank-item"><span class="label">Total Multas:</span> <span class="value">R$ ${formatNumber(totalMultasVal)}</span></li>
    <li class="rank-item"><span class="label">Média R$/L:</span> <span class="value">R$ ${totalLitros > 0 ? formatNumber(totalAbastVal / totalLitros) : '0,00'}</span></li>
  `;
  const resumoEl = document.getElementById('resumoGastos');
  if (resumoEl) resumoEl.innerHTML = resumoHtml;
}

// Removendo função de chart para economizar memória
function renderChart(id, type, data) {
  console.log('Graficos desativados para melhor performance.');
}

// ===== SALVAR DADOS =====
async function saveMulta() {
  const statusEl = document.getElementById('statusMulta');
  const autoInput = document.getElementById('multa-auto');
  const autoValor = autoInput.value.trim().toUpperCase();

  // Verificar duplicidade
  if (autoValor) {
    const jaExiste = state.multas.some(m => m.auto.toUpperCase() === autoValor && m.rowIndex !== state.editingMultaIndex);
    if (jaExiste) {
      statusEl.textContent = 'ERRO: Esta multa já foi lançada!';
      statusEl.className = 'status-msg status-error';
      autoInput.classList.add('input-error');
      return;
    }
  }

  statusEl.textContent = 'Salvando...';
  statusEl.className = 'status-msg status-saving';
  autoInput.classList.remove('input-error');

  const data = {
    data: document.getElementById('multa-data').value,
    veiculo: document.getElementById('multa-veiculo').value,
    motorista: document.getElementById('multa-motorista').value,
    tipo: document.getElementById('multa-tipo').value,
    auto: autoValor,
    valor: document.getElementById('multa-valor').value,
    dataLimite: document.getElementById('multa-datalimite').value,
    anexo: '', // TODO: Upload de arquivo
    rowIndex: state.editingMultaIndex
  };

  const action = state.editingMultaIndex ? 'editMulta' : 'addMulta';
  const result = await postApi(action, data);

  if (result) {
    statusEl.textContent = state.editingMultaIndex ? 'Atualizado com sucesso!' : 'Salvo com sucesso!';
    statusEl.className = 'status-msg status-saved';
    clearForm('multa');
    loadMultas();
    loadIndicadores();
  } else {
    statusEl.textContent = 'Erro ao salvar';
    statusEl.className = 'status-msg status-error';
  }

  setTimeout(() => statusEl.textContent = '', 3000);
}

async function saveAbastecimento() {
  const statusEl = document.getElementById('statusAbast');
  statusEl.textContent = 'Salvando...';
  statusEl.className = 'status-msg status-saving';

  const data = {
    data: document.getElementById('abast-data').value,
    veiculo: document.getElementById('abast-veiculo').value,
    motorista: document.getElementById('abast-motorista').value,
    km: document.getElementById('abast-km').value,
    litros: document.getElementById('abast-litros').value,
    valor: document.getElementById('abast-valor').value
  };

  const result = await postApi('addAbastecimento', data);

  if (result) {
    statusEl.textContent = 'Salvo com sucesso!';
    statusEl.className = 'status-msg status-saved';
    clearForm('abast');
    loadAbastecimentos();
    loadIndicadores();
    loadConsumo();
  } else {
    statusEl.textContent = 'Erro ao salvar';
    statusEl.className = 'status-msg status-error';
  }

  setTimeout(() => statusEl.textContent = '', 3000);
}

async function saveTrocaOleo() {
  const statusEl = document.getElementById('statusOleo');
  statusEl.textContent = 'Salvando...';
  statusEl.className = 'status-msg status-saving';

  const data = {
    data: document.getElementById('oleo-data').value,
    veiculo: document.getElementById('oleo-veiculo').value,
    motorista: document.getElementById('oleo-motorista').value,
    kmTroca: document.getElementById('oleo-kmtroca').value,
    intervalo: document.getElementById('oleo-intervalo').value,
    obs: document.getElementById('oleo-obs').value
  };

  const result = await postApi('addTrocaOleo', data);

  if (result) {
    statusEl.textContent = 'Salvo com sucesso!';
    statusEl.className = 'status-msg status-saved';
    clearForm('oleo');
    loadTrocaOleo();
  } else {
    statusEl.textContent = 'Erro ao salvar';
    statusEl.className = 'status-msg status-error';
  }

  setTimeout(() => statusEl.textContent = '', 3000);
}

async function saveDano() {
  const statusEl = document.getElementById('statusDano');
  statusEl.textContent = 'Salvando...';
  statusEl.className = 'status-msg status-saving';

  const data = {
    data: document.getElementById('dano-data').value,
    veiculo: document.getElementById('dano-veiculo').value,
    motorista: document.getElementById('dano-motorista').value,
    descricao: document.getElementById('dano-descricao').value,
    status: document.getElementById('dano-status').value
  };

  const result = await postApi('addDano', data);

  if (result) {
    statusEl.textContent = 'Salvo com sucesso!';
    statusEl.className = 'status-msg status-saved';
    clearForm('dano');
    loadDanos();
    loadIndicadores();
  } else {
    statusEl.textContent = 'Erro ao salvar';
    statusEl.className = 'status-msg status-error';
  }

  setTimeout(() => statusEl.textContent = '', 3000);
}

async function saveMotorista() {
  const statusEl = document.getElementById('statusMotorista');
  statusEl.textContent = 'Salvando...';
  statusEl.className = 'status-msg status-saving';

  const data = {
    nome: document.getElementById('mot-nome').value,
    cpf: document.getElementById('mot-cpf').value,
    cnh: document.getElementById('mot-cnh').value,
    categoria: document.getElementById('mot-categoria').value,
    validade: document.getElementById('mot-validade').value,
    status: document.getElementById('mot-status').value
  };

  const result = await postApi('addMotorista', data);

  if (result) {
    statusEl.textContent = 'Salvo com sucesso!';
    statusEl.className = 'status-msg status-saved';
    clearForm('mot');
    loadMotoristas();
    loadCombos();
  } else {
    statusEl.textContent = 'Erro ao salvar';
    statusEl.className = 'status-msg status-error';
  }

  setTimeout(() => statusEl.textContent = '', 3000);
}

async function saveVeiculo() {
  const statusEl = document.getElementById('statusVeiculo');
  statusEl.textContent = 'Salvando...';
  statusEl.className = 'status-msg status-saving';

  const data = {
    placa: document.getElementById('veic-placa').value,
    modelo: document.getElementById('veic-modelo').value,
    ano: document.getElementById('veic-ano').value,
    status: document.getElementById('veic-status').value,
    motorista: document.getElementById('veic-motorista').value,
    clrv: '' // TODO: Upload de arquivo
  };

  const result = await postApi('addVeiculo', data);

  if (result) {
    statusEl.textContent = 'Salvo com sucesso!';
    statusEl.className = 'status-msg status-saved';
    clearForm('veic');
    loadVeiculos();
    loadCombos();
  } else {
    statusEl.textContent = 'Erro ao salvar';
    statusEl.className = 'status-msg status-error';
  }

  setTimeout(() => statusEl.textContent = '', 3000);
}

// ===== AÇÕES =====
async function updateMultaStatus(rowIndex, novoStatus) {
  await postApi('updateMultaStatus', { rowIndex, novoStatus });
  loadMultas();
  loadIndicadores();
}

async function updateDanoStatus(rowIndex, novoStatus) {
  await postApi('updateDanoStatus', { rowIndex, novoStatus });
  loadDanos();
  loadIndicadores();
}

function editVeiculo(placa) {
  const veiculo = state.veiculosLista.find(v => v.placa === placa);
  if (veiculo) {
    document.getElementById('veic-placa').value = veiculo.placa;
    document.getElementById('veic-modelo').value = veiculo.modelo;
    document.getElementById('veic-ano').value = veiculo.ano;
    document.getElementById('veic-status').value = veiculo.status;
    document.getElementById('veic-motorista').value = veiculo.motorista || '';
  }

  // Scroll para o formulário
  document.getElementById('sec-veiculos').scrollIntoView({ behavior: 'smooth' });
}

function autoFillMotorista(placa, formPrefix) {
  const veiculo = state.veiculosLista.find(v => v.placa === placa);
  if (veiculo && veiculo.motorista) {
    const selectMotorista = document.getElementById(`${formPrefix}-motorista`);
    if (selectMotorista) {
      selectMotorista.value = veiculo.motorista;
    }
  }
}

// ===== UTILITÁRIOS =====
function formatNumber(num) {
  if (num === null || num === undefined) return '0';
  return Number(num).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function clearForm(prefix) {
  const inputs = document.querySelectorAll(`[id^="${prefix}-"]`);
  inputs.forEach(input => {
    if (input.type === 'select-one') {
      input.selectedIndex = 0;
    } else if (input.type !== 'file') {
      input.value = '';
    }
  });

  if (prefix === 'multa') {
    state.editingMultaIndex = null;
    const btn = document.getElementById('btnSalvarMulta');
    if (btn) {
      btn.textContent = 'Salvar multa';
      btn.classList.remove('btn-edit-mode');
    }
  }
}

// ===== OCR - EXTRAÇÃO DE DADOS DE PDF =====
const VISION_API_KEY = 'AIzaSyDyVTtNJPx7dYP5j5Dz5VFQXq01KZyfB2k';
const VISION_API_URL = `https://vision.googleapis.com/v1/images:annotate?key=${VISION_API_KEY}`;

async function extractOCRData() {
  const fileInput = document.getElementById('multa-pdf-ocr');
  const statusEl = document.getElementById('statusOCR');
  const btn = document.getElementById('btnExtrairDados');

  if (!fileInput.files || fileInput.files.length === 0) {
    statusEl.textContent = 'Selecione um arquivo primeiro';
    statusEl.className = 'status-msg status-error';
    return;
  }

  const file = fileInput.files[0];

  // Verificar tipo de arquivo
  if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
    statusEl.textContent = 'Formato não suportado. Use imagem ou PDF.';
    statusEl.className = 'status-msg status-error';
    return;
  }

  btn.disabled = true;
  statusEl.textContent = 'Processando...';
  statusEl.className = 'status-msg status-saving';

  try {
    // Converter arquivo para base64
    const base64 = await fileToBase64(file);

    // Chamar Vision API
    const response = await fetch(VISION_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        requests: [{
          image: {
            content: base64
          },
          features: [{
            type: 'TEXT_DETECTION',
            maxResults: 1
          }]
        }]
      })
    });

    const data = await response.json();

    if (data.error) {
      throw new Error(data.error.message);
    }

    if (!data.responses || !data.responses[0] || !data.responses[0].textAnnotations) {
      throw new Error('Não foi possível extrair texto do documento');
    }

    const fullText = data.responses[0].textAnnotations[0].description;
    console.log('Texto extraído:', fullText);

    // Parsear os dados do texto
    const dadosExtraidos = parseMultaText(fullText);

    // Verificar se já existe esse auto no sistema
    if (dadosExtraidos.auto) {
      const jaExiste = state.multas.some(m => m.auto.toUpperCase() === dadosExtraidos.auto.toUpperCase());
      if (jaExiste) {
        statusEl.textContent = '⚠️ ATENÇÃO: Multa já cadastrada no sistema!';
        statusEl.className = 'status-msg status-error';
        fillMultaForm(dadosExtraidos);
        btn.disabled = false;
        return;
      }
    }

    // Preencher formulário
    fillMultaForm(dadosExtraidos);

    statusEl.textContent = '✓ Dados extraídos! Verifique e complete o formulário.';
    statusEl.className = 'status-msg status-saved';

  } catch (error) {
    console.error('Erro OCR:', error);
    statusEl.textContent = 'Erro: ' + error.message;
    statusEl.className = 'status-msg status-error';
  }

  btn.disabled = false;
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      // Remover prefixo "data:...;base64,"
      const base64 = reader.result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function parseMultaText(text) {
  const dados = {
    placa: '',
    data: '',
    auto: '',
    valor: '',
    tipo: '',
    dataLimite: ''
  };

  // Normalizar texto
  const textoNorm = text.toUpperCase();
  const linhas = text.split('\n');

  // Extrair PLACA (formato ABC1234 ou ABC1D23)
  const placaMatch = textoNorm.match(/\b([A-Z]{3}[\s-]?[0-9][A-Z0-9][0-9]{2})\b/);
  if (placaMatch) {
    dados.placa = placaMatch[1].replace(/[\s-]/g, '');
  }

  // Extrair DATA (formato DD/MM/YYYY)
  const dataMatch = text.match(/\b(\d{2}\/\d{2}\/\d{4})\b/);
  if (dataMatch) {
    const partes = dataMatch[1].split('/');
    dados.data = `${partes[2]}-${partes[1]}-${partes[0]}`; // Formato YYYY-MM-DD
  }

  // Extrair DATA LIMITE PARA IDENTIFICAÇÃO DO CONDUTOR
  const dataLimiteMatch = text.match(/(?:DATA\s*LIMITE\s*(?:PARA\s*)?IDENTIFICA[ÇC][AÃ]O(?:\s*DO\s*CONDUTOR)?|IDENTIFICA[ÇC][AÃ]O\s*AT[ÉE]).*?(\d{2}\/\d{2}\/\d{4})/is);
  if (dataLimiteMatch) {
    const partes = dataLimiteMatch[1].split('/');
    dados.dataLimite = `${partes[2]}-${partes[1]}-${partes[0]}`;
  }

  // Extrair AUTO DE INFRAÇÃO (geralmente começa com letras e números)
  const autoMatches = [
    textoNorm.match(/IDENTIFICA[ÇC][AÃ]O\s*DO\s*AUTO\s*DE\s*INFRA[ÇC][AÃ]O.*?([A-Z0-9]{8,})/is),
    textoNorm.match(/AUTO\s*(?:DE\s*)?(?:INFRA[ÇC][AÃ]O)?\s*(?:N[°º]?)?\s*:?\s*([A-Z0-9]{6,})/i),
    textoNorm.match(/N[°º]?\s*(?:DO\s*)?AIT\s*:?\s*([A-Z0-9]{6,})/i),
    textoNorm.match(/AIT\s*:?\s*([A-Z0-9]{6,})/i),
    textoNorm.match(/IDENTIFICA[ÇC][AÃ]O\s*DO\s*AUTO[^A-Z0-9]*([A-Z0-9]{6,})/i),
    textoNorm.match(/\b([A-Z]{2}\d{8})\b/i) // Padrão específico MB00121928
  ];

  for (const match of autoMatches) {
    if (match && match[1]) {
      dados.auto = match[1].trim();
      break;
    }
  }

  // Extrair VALOR (R$ XXX,XX ou XXX.XX)
  const valorMatches = [
    text.match(/R\$\s*([\d.,]+)/),
    text.match(/VALOR\s*(?:DA\s*)?(?:MULTA)?\s*:?\s*R?\$?\s*([\d.,]+)/i),
    text.match(/([\d]{1,3}[.,]\d{2})\s*$/m)
  ];

  for (const match of valorMatches) {
    if (match && match[1]) {
      let valor = match[1].replace(/\./g, '').replace(',', '.');
      if (parseFloat(valor) > 0) {
        dados.valor = parseFloat(valor);
        break;
      }
    }
  }

  // Extrair TIPO/DESCRIÇÃO DA INFRAÇÃO
  const tipoMatches = [
    text.match(/DESCRI[CÇ][AÃ]O\s*(?:DA\s*)?(?:INFRA[CÇ][AÃ]O)?\s*:?\s*([^\n]+)/i),
    text.match(/INFRA[CÇ][AÃ]O\s*:?\s*([^\n]+)/i),
    text.match(/TRANSITAR\s+[^\n]+/i),
    text.match(/DIRIGIR\s+[^\n]+/i),
    text.match(/ESTACIONAR\s+[^\n]+/i)
  ];

  for (const match of tipoMatches) {
    if (match) {
      const tipo = (match[1] || match[0]).trim();
      if (tipo.length > 10) {
        dados.tipo = tipo.substring(0, 100); // Limitar tamanho
        break;
      }
    }
  }

  console.log('Dados parseados:', dados);
  return dados;
}

function fillMultaForm(dados) {
  // Data
  if (dados.data) {
    document.getElementById('multa-data').value = dados.data;
  }

  // Veículo (tentar selecionar)
  if (dados.placa) {
    const selectVeiculo = document.getElementById('multa-veiculo');
    const placaUpper = dados.placa.toUpperCase();

    for (let i = 0; i < selectVeiculo.options.length; i++) {
      if (selectVeiculo.options[i].value.toUpperCase().includes(placaUpper)) {
        selectVeiculo.selectedIndex = i;
        break;
      }
    }
  }

  // Auto de infração
  if (dados.auto) {
    document.getElementById('multa-auto').value = dados.auto;
  }

  // Tipo de multa
  if (dados.tipo) {
    document.getElementById('multa-tipo').value = dados.tipo;
  }

  // Valor
  if (dados.valor) {
    document.getElementById('multa-valor').value = dados.valor;
  }

  // Data Limite Condutor
  if (dados.dataLimite) {
    document.getElementById('multa-datalimite').value = dados.dataLimite;
  }
}

// ===== PWA - INSTALAÇÃO E SERVICE WORKER =====
let deferredPrompt;

function initPWA() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js')
        .then(reg => console.log('SW registrado!', reg))
        .catch(err => console.log('Erro SW:', err));
    });
  }

  const btnInstall = document.getElementById('btnPWAInstallNow');
  const btnClose = document.getElementById('btnPWACloseBanner');
  const banner = document.getElementById('pwa-install-banner');

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    if (!sessionStorage.getItem('pwa-banner-closed')) {
      if (banner) {
        banner.style.display = 'flex';
      }
    }
  });

  if (btnInstall) {
    btnInstall.addEventListener('click', async () => {
      if (!deferredPrompt) return;
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      console.log(`Usuário escolheu: ${outcome}`);
      deferredPrompt = null;
      if (banner) banner.style.display = 'none';
    });
  }

  if (btnClose) {
    btnClose.addEventListener('click', () => {
      if (banner) banner.style.display = 'none';
      sessionStorage.setItem('pwa-banner-closed', 'true');
    });
  }

  window.addEventListener('appinstalled', (evt) => {
    console.log('App instalado com sucesso!');
    if (banner) banner.style.display = 'none';
  });
}

