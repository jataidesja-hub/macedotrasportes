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
  filtroMesInicio: '',
  filtroMesFim: ''
};

// ===== INICIALIZAÇÃO =====
document.addEventListener('DOMContentLoaded', () => {
  initTabs();
  initFilters();
  initForms();
  loadAllData();
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
      const secao = document.getElementById('sec-' + tab.dataset.tab);
      if (secao) secao.style.display = 'block';
    });
  });
}

// ===== FILTROS =====
function initFilters() {
  document.getElementById('btnAplicarFiltros').addEventListener('click', applyFilters);
  document.getElementById('btnLimparFiltros').addEventListener('click', clearFilters);
  document.getElementById('btnAplicarMeses').addEventListener('click', applyMonthFilter);
}

function applyFilters() {
  state.filtroVeiculo = document.getElementById('filtroVeiculoGlobal').value;
  state.filtroMotorista = document.getElementById('filtroMotoristaGlobal').value;
  renderAllTables();
}

function clearFilters() {
  document.getElementById('filtroVeiculoGlobal').value = '';
  document.getElementById('filtroMotoristaGlobal').value = '';
  state.filtroVeiculo = '';
  state.filtroMotorista = '';
  renderAllTables();
}

function applyMonthFilter() {
  state.filtroMesInicio = document.getElementById('filtroMesInicio').value;
  state.filtroMesFim = document.getElementById('filtroMesFim').value;
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
    }
  });

  const motoristaSelects = ['multa-motorista', 'abast-motorista', 'oleo-motorista', 'dano-motorista'];
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
  }
}

async function loadAbastecimentos() {
  const data = await callApi('getAbastecimentos');
  if (data) {
    state.abastecimentos = data;
    renderAbastecimentos();
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
  }
}

// ===== RENDERIZAÇÃO =====
function renderAllTables() {
  renderMultas();
  renderAbastecimentos();
  renderDanos();
  renderVeiculos();
}

function filterData(data) {
  return data.filter(item => {
    if (state.filtroVeiculo && item.veiculo !== state.filtroVeiculo) return false;
    if (state.filtroMotorista && item.motorista !== state.filtroMotorista) return false;
    return true;
  });
}

function renderMultas() {
  const tbody = document.querySelector('#tabelaMultas tbody');
  const filtered = filterData(state.multas);

  tbody.innerHTML = filtered.map(m => {
    const statusClass = m.status === 'Pago' ? 'badge-resolvido' : 'badge-pendente';
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
      <td>
        <select class="btn-small btn-status" onchange="updateMultaStatus(${m.rowIndex}, this.value)">
          <option value="Pendente" ${m.status !== 'Pago' ? 'selected' : ''}>Pendente</option>
          <option value="Pago" ${m.status === 'Pago' ? 'selected' : ''}>Pago</option>
        </select>
      </td>
    </tr>
  `;
  }).join('');
}

function renderAbastecimentos() {
  const tbody = document.querySelector('#tabelaAbastecimentos tbody');
  const filtered = filterData(state.abastecimentos);

  tbody.innerHTML = filtered.map(a => `
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

  tbody.innerHTML = filtered.map(d => `
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
      <td>
        <button class="btn-small btn-edit" onclick="editVeiculo('${v.placa}')">Editar</button>
      </td>
    </tr>
  `;
  }).join('');
}

function renderTrocaOleo() {
  const tbody = document.querySelector('#tabelaOleo tbody');

  tbody.innerHTML = state.trocasOleo.map(o => `
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

// ===== SALVAR DADOS =====
async function saveMulta() {
  const statusEl = document.getElementById('statusMulta');
  statusEl.textContent = 'Salvando...';
  statusEl.className = 'status-msg status-saving';

  const data = {
    data: document.getElementById('multa-data').value,
    veiculo: document.getElementById('multa-veiculo').value,
    motorista: document.getElementById('multa-motorista').value,
    tipo: document.getElementById('multa-tipo').value,
    auto: document.getElementById('multa-auto').value,
    valor: document.getElementById('multa-valor').value,
    anexo: '' // TODO: Upload de arquivo
  };

  const result = await postApi('addMulta', data);

  if (result) {
    statusEl.textContent = 'Salvo com sucesso!';
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
  document.getElementById('veic-placa').value = placa;
  // Scroll para o formulário
  document.getElementById('sec-veiculos').scrollIntoView({ behavior: 'smooth' });
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
    tipo: ''
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

  // Extrair AUTO DE INFRAÇÃO (geralmente começa com letras e números)
  const autoMatches = [
    textoNorm.match(/AUTO\s*(?:DE\s*)?(?:INFRA[ÇC][AÃ]O)?\s*(?:N[°º]?)?\s*:?\s*([A-Z0-9]{6,})/i),
    textoNorm.match(/N[°º]?\s*(?:DO\s*)?AIT\s*:?\s*([A-Z0-9]{6,})/i),
    textoNorm.match(/AIT\s*:?\s*([A-Z0-9]{6,})/i),
    textoNorm.match(/IDENTIFICA[ÇC][AÃ]O\s*DO\s*AUTO[^A-Z0-9]*([A-Z0-9]{6,})/i)
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
}

