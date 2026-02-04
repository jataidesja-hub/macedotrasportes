/*******************************
 🚌 SISTEMA DE GERENCIAMENTO DE FROTA
 Backend - Google Apps Script
 
 IMPORTANTE: Copie este código para o seu Apps Script
 e faça uma nova implantação após a alteração.
*******************************/

// ===== doGet - Handler para requisições GET =====
function doGet(e) {
  const action = e.parameter.action;
  let result;
  
  switch(action) {
    case 'getCombos':
      result = getOpcoesCombos();
      break;
    case 'getMultas':
      result = getDadosMultas();
      break;
    case 'getAbastecimentos':
      result = getDadosAbastecimentos();
      break;
    case 'getDanos':
      result = getDadosDanos();
      break;
    case 'getMotoristas':
      result = getDadosMotoristas();
      break;
    case 'getVeiculos':
      result = getDadosVeiculos();
      break;
    case 'getTrocaOleo':
      result = {
        trocas: getDadosTrocaOleo(),
        alertas: getAlertasTrocaOleo()
      };
      break;
    case 'getIndicadores':
      const filtroMes = {
        mesInicio: e.parameter.mesInicio || null,
        mesFim: e.parameter.mesFim || null
      };
      result = getIndicadores(filtroMes);
      break;
    case 'getConsumo':
      const filtroConsumo = {
        mesInicio: e.parameter.mesInicio || null,
        mesFim: e.parameter.mesFim || null
      };
      result = getConsumoMedioPorVeiculo(filtroConsumo);
      break;
    default:
      // Retorna a página HTML se não houver action
      return HtmlService.createTemplateFromFile('index')
        .evaluate()
        .setTitle('Sistema de Gerenciamento de Frota')
        .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  }
  
  return ContentService.createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

// ===== doPost - Handler para requisições POST =====
function doPost(e) {
  const action = e.parameter.action;
  let dados;
  
  try {
    dados = JSON.parse(e.postData.contents);
  } catch(err) {
    dados = e.parameter;
  }
  
  let result = { success: false };
  
  switch(action) {
    case 'addMulta':
      adicionarMulta(dados);
      result.success = true;
      break;
    case 'addAbastecimento':
      adicionarAbastecimento(dados);
      result.success = true;
      break;
    case 'addDano':
      adicionarDano(dados);
      result.success = true;
      break;
    case 'addMotorista':
      adicionarMotorista(dados);
      result.success = true;
      break;
    case 'addVeiculo':
      adicionarVeiculo(dados);
      result.success = true;
      break;
    case 'addTrocaOleo':
      adicionarTrocaOleo(dados);
      result.success = true;
      break;
    case 'updateDanoStatus':
      atualizarStatusDano(dados.rowIndex, dados.novoStatus);
      result.success = true;
      break;
    case 'updateMultaStatus':
      atualizarStatusMulta(dados.rowIndex, dados.novoStatus);
      result.success = true;
      break;
    case 'updateVeiculoStatus':
      atualizarStatusVeiculo(dados.rowIndex, dados.novoStatus);
      result.success = true;
      break;
  }
  
  return ContentService.createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

// ===== RESTANTE DO CÓDIGO ORIGINAL =====
// (Mantenha todas as outras funções do seu código original abaixo)

function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('🚌 Sistema Frota')
    .addItem('🔧 Criar estrutura (abas + colunas)', 'criarPlanilha')
    .addItem('📊 Abrir painel (barra lateral)', 'abrirPainelSidebar')
    .addToUi();
}

function criarPlanilha() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  ss.rename('Sistema de Gerenciamento de Frota');

  // === MULTAS ===
  let multasSheet = ss.getSheetByName('Multas');
  if (!multasSheet) {
    multasSheet = ss.insertSheet('Multas');
  }
  multasSheet.clear();
  multasSheet.getRange(1, 1, 1, 8).setValues([[
    'Data', 'Veículo', 'Motorista', 'Tipo de Multa',
    'Auto da infração', 'Anexo (link)', 'Valor', 'Status'
  ]]).setFontWeight('bold');
  multasSheet.setFrozenRows(1);
  multasSheet.getRange('A:A').setNumberFormat('dd/MM/yyyy');
  multasSheet.getRange('G:G').setNumberFormat('R$ #,##0.00');

  // === ABASTECIMENTOS ===
  let abastecimentosSheet = ss.getSheetByName('Abastecimentos');
  if (!abastecimentosSheet) {
    abastecimentosSheet = ss.insertSheet('Abastecimentos');
  }
  abastecimentosSheet.clear();
  abastecimentosSheet.getRange(1, 1, 1, 6).setValues([[
    'Data', 'Veículo', 'Motorista', 'Km atual', 'Quantidade (litros)', 'Valor (R$)'
  ]]).setFontWeight('bold');
  abastecimentosSheet.setFrozenRows(1);
  abastecimentosSheet.getRange('A:A').setNumberFormat('dd/MM/yyyy');
  abastecimentosSheet.getRange('D:D').setNumberFormat('#,##0');
  abastecimentosSheet.getRange('E:E').setNumberFormat('#,##0.00');
  abastecimentosSheet.getRange('F:F').setNumberFormat('R$ #,##0.00');

  // === DANOS ===
  let danosSheet = ss.getSheetByName('Danos');
  if (!danosSheet) {
    danosSheet = ss.insertSheet('Danos');
  }
  danosSheet.clear();
  danosSheet.getRange(1, 1, 1, 5).setValues([[
    'Data', 'Veículo', 'Motorista', 'Descrição do dano', 'Status'
  ]]).setFontWeight('bold');
  danosSheet.setFrozenRows(1);
  danosSheet.getRange('A:A').setNumberFormat('dd/MM/yyyy');

  // === VEÍCULOS ===
  let veiculosSheet = ss.getSheetByName('Veículos');
  if (!veiculosSheet) {
    veiculosSheet = ss.insertSheet('Veículos');
  }
  veiculosSheet.clear();
  veiculosSheet.getRange(1, 1, 1, 5).setValues([[
    'Placa', 'Modelo', 'Ano', 'Status', 'Anexo CLRV'
  ]]).setFontWeight('bold');
  veiculosSheet.setFrozenRows(1);
  veiculosSheet.getRange('C:C').setNumberFormat('0000');

  // === MOTORISTAS ===
  let motoristasSheet = ss.getSheetByName('Motoristas');
  if (!motoristasSheet) {
    motoristasSheet = ss.insertSheet('Motoristas');
  }
  motoristasSheet.clear();
  motoristasSheet.getRange(1, 1, 1, 6).setValues([[
    'Nome', 'CPF', 'CNH', 'Categoria', 'Validade CNH', 'Status'
  ]]).setFontWeight('bold');
  motoristasSheet.setFrozenRows(1);
  motoristasSheet.getRange('E:E').setNumberFormat('dd/MM/yyyy');

  // === TROCA DE ÓLEO ===
  let oleoSheet = ss.getSheetByName('TrocaDeOleo');
  if (!oleoSheet) {
    oleoSheet = ss.insertSheet('TrocaDeOleo');
  }
  oleoSheet.clear();
  oleoSheet.getRange(1, 1, 1, 7).setValues([[
    'Data', 'Veículo', 'Motorista', 'Km na Troca', 'Intervalo (Km)', 'Próxima Troca (Km)', 'Observações'
  ]]).setFontWeight('bold');
  oleoSheet.setFrozenRows(1);
  oleoSheet.getRange('A:A').setNumberFormat('dd/MM/yyyy');
  oleoSheet.getRange('D:F').setNumberFormat('#,##0');
}

/* UI */

function abrirPainelSidebar() {
  const html = HtmlService.createTemplateFromFile('index')
    .evaluate()
    .setTitle('Sistema de Gerenciamento de Frota');
  SpreadsheetApp.getUi().showSidebar(html);
}

/* === LEITURA DE DADOS PARA O PAINEL === */

function getDadosMultas() {
  const sh = SpreadsheetApp.getActive().getSheetByName('Multas');
  if (!sh) return [];
  const lastRow = sh.getLastRow();
  if (lastRow < 2) return [];
  const lastCol = sh.getLastColumn();
  const numCols = Math.max(8, lastCol);
  const values = sh.getRange(2, 1, lastRow - 1, numCols).getValues();
  const tz = Session.getScriptTimeZone();

  const resultado = [];
  for (let i = 0; i < values.length; i++) {
    const r = values[i];
    resultado.push({
      data: r[0] ? Utilities.formatDate(new Date(r[0]), tz, 'dd/MM/yyyy') : '',
      veiculo: r[1] || '',
      motorista: r[2] || '',
      tipo: r[3] || '',
      auto: r[4] || '',
      anexo: r[5] || '',
      valor: r[6] || 0,
      status: r[7] || 'Pendente',
      rowIndex: i + 2
    });
  }
  return resultado;
}

function getDadosAbastecimentos() {
  const sh = SpreadsheetApp.getActive().getSheetByName('Abastecimentos');
  if (!sh) return [];
  const lastRow = sh.getLastRow();
  if (lastRow < 2) return [];
  const values = sh.getRange(2, 1, lastRow - 1, 6).getValues();
  const tz = Session.getScriptTimeZone();

  return values.map(r => ({
    data: r[0] ? Utilities.formatDate(new Date(r[0]), tz, 'dd/MM/yyyy') : '',
    veiculo: r[1] || '',
    motorista: r[2] || '',
    km: r[3] || 0,
    litros: r[4] || 0,
    valor: r[5] || 0
  }));
}

function getDadosDanos() {
  const sh = SpreadsheetApp.getActive().getSheetByName('Danos');
  if (!sh) return [];
  const lastRow = sh.getLastRow();
  if (lastRow < 2) return [];
  const values = sh.getRange(2, 1, lastRow - 1, 5).getValues();
  const tz = Session.getScriptTimeZone();

  const resultado = [];
  for (let i = 0; i < values.length; i++) {
    const r = values[i];
    resultado.push({
      data: r[0] ? Utilities.formatDate(new Date(r[0]), tz, 'dd/MM/yyyy') : '',
      veiculo: r[1] || '',
      motorista: r[2] || '',
      descricao: r[3] || '',
      status: r[4] || '',
      rowIndex: i + 2
    });
  }
  return resultado;
}

function getDadosVeiculos() {
  const sh = SpreadsheetApp.getActive().getSheetByName('Veículos');
  if (!sh) return [];
  const lastRow = sh.getLastRow();
  if (lastRow < 2) return [];
  const values = sh.getRange(2, 1, lastRow - 1, 5).getValues();

  const resultado = [];
  for (let i = 0; i < values.length; i++) {
    const r = values[i];
    resultado.push({
      placa: r[0] || '',
      modelo: r[1] || '',
      ano: r[2] || '',
      status: r[3] || '',
      clrv: r[4] || '',
      rowIndex: i + 2
    });
  }
  return resultado;
}

function getDadosMotoristas() {
  const sh = SpreadsheetApp.getActive().getSheetByName('Motoristas');
  if (!sh) return [];
  const lastRow = sh.getLastRow();
  if (lastRow < 2) return [];
  const values = sh.getRange(2, 1, lastRow - 1, 6).getValues();
  const tz = Session.getScriptTimeZone();

  return values.map(r => ({
    nome: r[0] || '',
    cpf: r[1] || '',
    cnh: r[2] || '',
    categoria: r[3] || '',
    validade: r[4] ? Utilities.formatDate(new Date(r[4]), tz, 'dd/MM/yyyy') : '',
    status: r[5] || ''
  }));
}

function getDadosTrocaOleo() {
  const sh = SpreadsheetApp.getActive().getSheetByName('TrocaDeOleo');
  if (!sh) return [];
  const lastRow = sh.getLastRow();
  if (lastRow < 2) return [];
  const values = sh.getRange(2, 1, lastRow - 1, 7).getValues();
  const tz = Session.getScriptTimeZone();

  return values.map((r, i) => ({
    data: r[0] ? Utilities.formatDate(new Date(r[0]), tz, 'dd/MM/yyyy') : '',
    veiculo: r[1] || '',
    motorista: r[2] || '',
    kmTroca: Number(r[3]) || 0,
    intervalo: Number(r[4]) || 0,
    proximaTroca: Number(r[5]) || 0,
    obs: r[6] || '',
    rowIndex: i + 2
  })).reverse();
}

// === LÓGICA DE ALERTAS E STATUS DE ÓLEO ===

function getAlertasTrocaOleo() {
  const ss = SpreadsheetApp.getActive();
  const shAbast = ss.getSheetByName('Abastecimentos');
  const shOleo = ss.getSheetByName('TrocaDeOleo');
  
  const mapKmAtual = {};
  if (shAbast && shAbast.getLastRow() >= 2) {
    const vals = shAbast.getRange(2, 1, shAbast.getLastRow() - 1, 6).getValues(); 
    vals.forEach(r => {
      const v = (r[1] || '').toString().trim();
      const k = Number(r[3]) || 0;
      if (v && k > 0) {
        if (!mapKmAtual[v] || k > mapKmAtual[v]) {
          mapKmAtual[v] = k;
        }
      }
    });
  }

  const mapUltimaTroca = {};
  if (shOleo && shOleo.getLastRow() >= 2) {
    const vals = shOleo.getRange(2, 1, shOleo.getLastRow() - 1, 7).getValues();
    vals.forEach(r => {
      const v = (r[1] || '').toString().trim();
      const prox = Number(r[5]) || 0;
      const data = r[0] ? new Date(r[0]) : null;
      
      if (v) {
        if (!mapUltimaTroca[v]) {
          mapUltimaTroca[v] = { prox, data };
        } else {
          if (data && mapUltimaTroca[v].data && data > mapUltimaTroca[v].data) {
             mapUltimaTroca[v] = { prox, data };
          }
        }
      }
    });
  }

  const alertas = [];
  const WARNING_THRESHOLD = 3000; 

  Object.keys(mapUltimaTroca).forEach(veic => {
    const info = mapUltimaTroca[veic];
    const kmAtual = mapKmAtual[veic] || 0;
    const kmRestante = info.prox - kmAtual;

    if (kmAtual > 0) {
      let status = 'OK';
      let classe = 'ok';
      
      if (kmRestante < 0) {
        status = 'VENCIDO';
        classe = 'erro';
      } else if (kmRestante <= WARNING_THRESHOLD) {
        status = 'PRÓXIMO';
        classe = 'atencao';
      }

      if (status !== 'OK') {
        alertas.push({
          veiculo: veic,
          kmAtual: kmAtual,
          proximaTroca: info.prox,
          kmRestante: kmRestante,
          status: status,
          classe: classe
        });
      }
    }
  });

  return alertas.sort((a,b) => a.kmRestante - b.kmRestante);
}

/* === LISTAS PARA COMBOS (VEÍCULO / MOTORISTA) === */

function getOpcoesCombos() {
  const ss = SpreadsheetApp.getActive();

  const shV = ss.getSheetByName('Veículos');
  let veiculos = [];
  if (shV) {
    const lr = shV.getLastRow();
    if (lr >= 2) {
      const vals = shV.getRange(2, 1, lr - 1, 1).getValues();
      veiculos = vals.map(r => (r[0] || '').toString().trim())
                     .filter(v => v);
    }
  }
  veiculos = Array.from(new Set(veiculos)).sort();

  const shM = ss.getSheetByName('Motoristas');
  let motoristas = [];
  if (shM) {
    const lr = shM.getLastRow();
    if (lr >= 2) {
      const vals = shM.getRange(2, 1, lr - 1, 1).getValues();
      motoristas = vals.map(r => (r[0] || '').toString().trim())
                       .filter(v => v);
    }
  }
  motoristas = Array.from(new Set(motoristas)).sort();

  return { veiculos, motoristas };
}

/* === FUNÇÃO AUXILIAR: data dentro do período === */

function dataDentroPeriodo(data, anoIni, mesIni, anoFim, mesFim) {
  if (!(data instanceof Date)) return false;
  if (anoIni == null || mesIni == null) {
    return true;
  }
  const ym = data.getFullYear() * 12 + data.getMonth();
  const ini = anoIni * 12 + mesIni;
  const fim = (anoFim != null && mesFim != null) ? (anoFim * 12 + mesFim) : ini;
  return ym >= ini && ym <= fim;
}

/* === INDICADORES DO TOPO === */

function getIndicadores(filtroMes) {
  const ss = SpreadsheetApp.getActive();

  let anoIni = null, mesIni = null, anoFim = null, mesFim = null;
  if (filtroMes) {
    if (filtroMes.mesInicio) {
      const p = filtroMes.mesInicio.split('-');
      if (p.length === 2) {
        anoIni = parseInt(p[0], 10);
        mesIni = parseInt(p[1], 10) - 1;
      }
    }
    if (filtroMes.mesFim) {
      const p2 = filtroMes.mesFim.split('-');
      if (p2.length === 2) {
        anoFim = parseInt(p2[0], 10);
        mesFim = parseInt(p2[1], 10) - 1;
      }
    }
    if (!filtroMes.mesInicio && filtroMes.mes) {
      const p3 = filtroMes.mes.split('-');
      if (p3.length === 2) {
        anoIni = parseInt(p3[0], 10);
        mesIni = parseInt(p3[1], 10) - 1;
      }
    }
  }

  let totalMultasMes = 0;
  let qtdMultasMes = 0;
  let totalLitrosMes = 0;
  let totalAbastecimentoMes = 0;
  let danosPendentes = 0;
  let veiculosAtivos = 0;

  const shMultas = ss.getSheetByName('Multas');
  if (shMultas) {
    const lr = shMultas.getLastRow();
    if (lr >= 2) {
      const vals = shMultas.getRange(2, 1, lr - 1, 7).getValues();
      vals.forEach(r => {
        const data = r[0];
        const valor = Number(r[6]) || 0;
        if (dataDentroPeriodo(data, anoIni, mesIni, anoFim, mesFim)) {
          totalMultasMes += valor;
          qtdMultasMes++;
        }
      });
    }
  }

  const shAbast = ss.getSheetByName('Abastecimentos');
  if (shAbast) {
    const lr = shAbast.getLastRow();
    if (lr >= 2) {
      const vals = shAbast.getRange(2, 1, lr - 1, 6).getValues();
      vals.forEach(r => {
        const data = r[0];
        const litros = Number(r[4]) || 0;
        const valor = Number(r[5]) || 0;
        if (dataDentroPeriodo(data, anoIni, mesIni, anoFim, mesFim)) {
          totalLitrosMes += litros;
          totalAbastecimentoMes += valor;
        }
      });
    }
  }

  const shDanos = ss.getSheetByName('Danos');
  if (shDanos) {
    const lr = shDanos.getLastRow();
    if (lr >= 2) {
      const vals = shDanos.getRange(2, 5, lr - 1, 1).getValues();
      vals.forEach(r => {
        const status = (r[0] || '').toString().toLowerCase();
        if (status === 'pendente') danosPendentes++;
      });
    }
  }

  const shVeic = ss.getSheetByName('Veículos');
  if (shVeic) {
    const lr = shVeic.getLastRow();
    if (lr >= 2) {
      const vals = shVeic.getRange(2, 4, lr - 1, 1).getValues();
      vals.forEach(r => {
        const status = (r[0] || '').toString().toLowerCase();
        if (status === 'ativo') veiculosAtivos++;
      });
    }
  }

  let mesAno;
  if (anoIni == null || mesIni == null) {
    mesAno = 'Acumulado geral';
  } else {
    const inicioStr = (mesIni + 1).toString().padStart(2, '0') + '/' + anoIni;
    if (anoFim != null && mesFim != null) {
      const fimStr = (mesFim + 1).toString().padStart(2, '0') + '/' + anoFim;
      mesAno = inicioStr + ' a ' + fimStr;
    } else {
      mesAno = inicioStr;
    }
  }

  return {
    totalMultasMes,
    qtdMultasMes,
    totalLitrosMes,
    totalAbastecimentoMes,
    danosPendentes,
    veiculosAtivos,
    mesAno
  };
}

/* === CONSUMO MÉDIO POR VEÍCULO (km/L) === */

function getConsumoMedioPorVeiculo(filtroMes) {
  const shAbast = SpreadsheetApp.getActive().getSheetByName('Abastecimentos');
  if (!shAbast) return [];

  const lr = shAbast.getLastRow();
  if (lr < 2) return [];

  const values = shAbast.getRange(2, 1, lr - 1, 6).getValues();

  let anoIni = null, mesIni = null, anoFim = null, mesFim = null;
  if (filtroMes) {
    if (filtroMes.mesInicio) {
      const p = filtroMes.mesInicio.split('-');
      if (p.length === 2) {
        anoIni = parseInt(p[0], 10);
        mesIni = parseInt(p[1], 10) - 1;
      }
    }
    if (filtroMes.mesFim) {
      const p2 = filtroMes.mesFim.split('-');
      if (p2.length === 2) {
        anoFim = parseInt(p2[0], 10);
        mesFim = parseInt(p2[1], 10) - 1;
      }
    }
    if (!filtroMes.mesInicio && filtroMes.mes) {
      const p3 = filtroMes.mes.split('-');
      if (p3.length === 2) {
        anoIni = parseInt(p3[0], 10);
        mesIni = parseInt(p3[1], 10) - 1;
      }
    }
  }

  const grupos = {};

  values.forEach(r => {
    const data = r[0];
    const veiculo = (r[1] || '').toString().trim();
    const km = Number(r[3]) || 0;
    const litros = Number(r[4]) || 0;

    if (!veiculo || km <= 0 || litros <= 0) return;
    if (!dataDentroPeriodo(data, anoIni, mesIni, anoFim, mesFim)) return;

    if (!grupos[veiculo]) {
      grupos[veiculo] = {
        minKm: km,
        maxKm: km,
        litros: 0
      };
    } else {
      if (km < grupos[veiculo].minKm) grupos[veiculo].minKm = km;
      if (km > grupos[veiculo].maxKm) grupos[veiculo].maxKm = km;
    }
    grupos[veiculo].litros += litros;
  });

  const resultado = [];
  Object.keys(grupos).forEach(veic => {
    const g = grupos[veic];
    const kmRodado = g.maxKm - g.minKm;
    let consumo = 0;
    if (kmRodado > 0 && g.litros > 0) {
      consumo = kmRodado / g.litros;
    }
    resultado.push({
      veiculo: veic,
      kmRodado: kmRodado,
      litros: g.litros,
      consumo: consumo
    });
  });

  resultado.sort((a, b) => (b.consumo || 0) - (a.consumo || 0));
  return resultado;
}

/* === AUXILIAR: DATA LOCAL === */
function parseDateLocal(dateString) {
  if (!dateString) return new Date();
  const partes = dateString.split('-');
  if (partes.length !== 3) return new Date(dateString);
  
  const ano = parseInt(partes[0], 10);
  const mes = parseInt(partes[1], 10) - 1;
  const dia = parseInt(partes[2], 10);
  
  return new Date(ano, mes, dia, 12, 0, 0);
}

/* === INSERIR DADOS === */

function adicionarMulta(dados) {
  const sh = SpreadsheetApp.getActive().getSheetByName('Multas');
  if (!sh) return;
  const data = parseDateLocal(dados.data);
  const valor = dados.valor ? Number(dados.valor) : 0;
  sh.appendRow([
    data,
    dados.veiculo,
    dados.motorista,
    dados.tipo,
    dados.auto,
    dados.anexo || '',
    valor,
    'Pendente'
  ]);
}

function adicionarAbastecimento(dados) {
  const sh = SpreadsheetApp.getActive().getSheetByName('Abastecimentos');
  if (!sh) return;
  const data = parseDateLocal(dados.data);
  const km = dados.km ? Number(dados.km) : 0;
  const litros = dados.litros ? Number(dados.litros) : 0;
  const valor = dados.valor ? Number(dados.valor) : 0;
  sh.appendRow([data, dados.veiculo, dados.motorista, km, litros, valor]);
}

function adicionarDano(dados) {
  const sh = SpreadsheetApp.getActive().getSheetByName('Danos');
  if (!sh) return;
  const data = parseDateLocal(dados.data);
  sh.appendRow([
    data,
    dados.veiculo,
    dados.motorista,
    dados.descricao,
    dados.status
  ]);
}

function adicionarVeiculo(dados) {
  const sh = SpreadsheetApp.getActive().getSheetByName('Veículos');
  if (!sh) return;
  
  const lastRow = sh.getLastRow();
  let rowIndex = 0;
  
  if (lastRow >= 2) {
    const placas = sh.getRange(2, 1, lastRow - 1, 1).getValues().flat();
    const pBusca = String(dados.placa).trim().toUpperCase();
    const idx = placas.findIndex(p => String(p).trim().toUpperCase() === pBusca);
    if (idx >= 0) {
      rowIndex = idx + 2;
    }
  }

  if (rowIndex > 0) {
    sh.getRange(rowIndex, 2).setValue(dados.modelo);
    sh.getRange(rowIndex, 3).setValue(dados.ano);
    sh.getRange(rowIndex, 4).setValue(dados.status);
    if (dados.clrv) {
       sh.getRange(rowIndex, 5).setValue(dados.clrv);
    }
  } else {
    sh.appendRow([
      dados.placa,
      dados.modelo,
      dados.ano,
      dados.status,
      dados.clrv || ''
    ]);
  }
}

function adicionarMotorista(dados) {
  const sh = SpreadsheetApp.getActive().getSheetByName('Motoristas');
  if (!sh) return;
  const validade = dados.validade ? parseDateLocal(dados.validade) : '';
  sh.appendRow([
    dados.nome,
    dados.cpf,
    dados.cnh,
    dados.categoria,
    validade,
    dados.status
  ]);
}

function adicionarTrocaOleo(dados) {
  const sh = SpreadsheetApp.getActive().getSheetByName('TrocaDeOleo');
  if (!sh) return;
  const data = parseDateLocal(dados.data);
  const kmTroca = Number(dados.kmTroca) || 0;
  const intervalo = Number(dados.intervalo) || 0;
  const proxima = kmTroca + intervalo;
  
  sh.appendRow([
    data,
    dados.veiculo,
    dados.motorista,
    kmTroca,
    intervalo,
    proxima,
    dados.obs || ''
  ]);
}

/* === ATUALIZAÇÃO DE STATUS (DANOS / VEÍCULOS) === */

function atualizarStatusDano(rowIndex, novoStatus) {
  const sh = SpreadsheetApp.getActive().getSheetByName('Danos');
  if (!sh || !rowIndex) return;
  sh.getRange(rowIndex, 5).setValue(novoStatus);
}

function atualizarStatusMulta(rowIndex, novoStatus) {
  const sh = SpreadsheetApp.getActive().getSheetByName('Multas');
  if (!sh || !rowIndex) return;
  sh.getRange(rowIndex, 8).setValue(novoStatus);
}

function atualizarStatusVeiculo(rowIndex, novoStatus) {
  const sh = SpreadsheetApp.getActive().getSheetByName('Veículos');
  if (!sh || !rowIndex) return;
  sh.getRange(rowIndex, 4).setValue(novoStatus);
}
