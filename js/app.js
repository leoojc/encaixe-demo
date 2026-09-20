/* ==========================================================================
   ENCAIXE — Painel do dono (app.html)
   ========================================================================== */

(() => {
  let dataSelecionada = Encaixe.todayISO();

  const el = {
    negocioNome: document.getElementById('negocio-nome'),
    dataAtual: document.getElementById('data-atual'),
    btnPrev: document.getElementById('btn-prev'),
    btnNext: document.getElementById('btn-next'),
    statTotal: document.getElementById('stat-total'),
    statOcupacao: document.getElementById('stat-ocupacao'),
    statFaturamento: document.getElementById('stat-faturamento'),
    statCancelados: document.getElementById('stat-cancelados'),
    aiTexto: document.getElementById('ai-texto'),
    btnUsarSugestao: document.getElementById('btn-usar-sugestao'),
    agendaList: document.getElementById('agenda-list'),
    contagemLabel: document.getElementById('contagem-label'),
    modalOverlay: document.getElementById('modal-overlay'),
    modalClose: document.getElementById('modal-close'),
    btnNovoDesktop: document.getElementById('btn-novo-desktop'),
    btnNovoMobile: document.getElementById('btn-novo-mobile'),
    form: document.getElementById('form-agendamento'),
    fCliente: document.getElementById('f-cliente'),
    fTelefone: document.getElementById('f-telefone'),
    fServico: document.getElementById('f-servico'),
    fData: document.getElementById('f-data'),
    fHora: document.getElementById('f-hora'),
    waPreview: document.getElementById('wa-preview'),
  };

  function formatarDataLabel(iso) {
    const d = new Date(iso + 'T00:00:00');
    const hojeISO = Encaixe.todayISO();
    const amanhaISO = Encaixe.addDays(hojeISO, 1);
    const ontemISO = Encaixe.addDays(hojeISO, -1);
    if (iso === hojeISO) return 'Hoje · ' + d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
    if (iso === amanhaISO) return 'Amanhã · ' + d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
    if (iso === ontemISO) return 'Ontem · ' + d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
    return d.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' });
  }

  function formatarMoeda(v) {
    return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
  }

  function statusLabel(s) {
    return { confirmado: 'Confirmado', concluido: 'Concluído', cancelado: 'Cancelado' }[s] || s;
  }

  function render() {
    el.negocioNome.textContent = ' · ' + Encaixe.NEGOCIO.nome;
    el.dataAtual.textContent = formatarDataLabel(dataSelecionada);

    const stats = Encaixe.statsDoDia(dataSelecionada);
    el.statTotal.textContent = stats.totalAgendamentos;
    el.statOcupacao.textContent = stats.taxaOcupacao + '%';
    el.statFaturamento.textContent = formatarMoeda(stats.faturamento);
    el.statCancelados.textContent = stats.cancelados;

    renderSugestaoIA();
    renderAgenda();
  }

  function renderSugestaoIA() {
    const duracaoMedia = 30;
    const sugestao = Encaixe.sugestaoIA(dataSelecionada, duracaoMedia);
    if (!sugestao) {
      el.aiTexto.textContent = 'A agenda desse dia já está fechada — sem horários livres suficientes.';
      el.btnUsarSugestao.classList.add('hidden');
      return;
    }
    el.btnUsarSugestao.classList.remove('hidden');
    el.aiTexto.innerHTML = `<strong style="color:var(--text-primary)">${sugestao}</strong> é o horário que menos deixa furos na agenda — melhor encaixe pra hoje.`;
    el.btnUsarSugestao.onclick = () => abrirModal(sugestao);
  }

  function renderAgenda() {
    const lista = Encaixe.byDate(dataSelecionada);
    el.contagemLabel.textContent = `${lista.length} no total`;

    if (lista.length === 0) {
      el.agendaList.innerHTML = '<div class="agenda-empty">Nenhum agendamento pra esse dia ainda.</div>';
      return;
    }

    el.agendaList.innerHTML = lista.map(a => {
      const servico = Encaixe.servicoById(a.servicoId);
      const podeConcluir = a.status === 'confirmado';
      const podeCancelar = a.status === 'confirmado';
      return `
        <div class="appt-row">
          <div class="appt-time">${a.hora}</div>
          <div class="appt-info">
            <div class="name">${a.cliente}</div>
            <div class="svc">${servico ? servico.nome : ''} · ${a.duracao}min</div>
          </div>
          <div class="appt-badge ${a.status}">${statusLabel(a.status)}</div>
          <div class="appt-actions">
            ${podeConcluir ? `<button class="icon-btn" title="Concluir" data-action="concluir" data-id="${a.id}">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M20 6 9 17l-5-5"/></svg>
            </button>` : ''}
            ${podeCancelar ? `<button class="icon-btn" title="Cancelar" data-action="cancelar" data-id="${a.id}">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
            </button>` : ''}
          </div>
        </div>`;
    }).join('');

    el.agendaList.querySelectorAll('[data-action]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        const acao = btn.dataset.action;
        Encaixe.updateStatus(id, acao === 'concluir' ? 'concluido' : 'cancelado');
        render();
      });
    });
  }

  // ------------------------------------------------------------ navegação
  el.btnPrev.addEventListener('click', () => {
    dataSelecionada = Encaixe.addDays(dataSelecionada, -1);
    render();
  });
  el.btnNext.addEventListener('click', () => {
    dataSelecionada = Encaixe.addDays(dataSelecionada, 1);
    render();
  });

  // ------------------------------------------------------------ modal
  function popularServicos() {
    el.fServico.innerHTML = Encaixe.SERVICOS
      .map(s => `<option value="${s.id}">${s.nome} · ${s.duracao}min · R$ ${s.preco}</option>`)
      .join('');
  }

  function popularHorarios() {
    const servico = Encaixe.servicoById(el.fServico.value);
    const data = el.fData.value || dataSelecionada;
    const disponiveis = Encaixe.slotsDisponiveis(data, servico.duracao);
    if (disponiveis.length === 0) {
      el.fHora.innerHTML = '<option value="">Sem horários livres nesse dia</option>';
    } else {
      el.fHora.innerHTML = disponiveis.map(h => `<option value="${h}">${h}</option>`).join('');
    }
    atualizarPreviaWA();
  }

  function atualizarPreviaWA() {
    const servico = Encaixe.servicoById(el.fServico.value);
    const cliente = el.fCliente.value.trim() || '(nome do cliente)';
    if (!el.fHora.value) {
      el.waPreview.textContent = 'Escolha um horário disponível pra ver a mensagem.';
      return;
    }
    const preview = Encaixe.mensagemConfirmacao({
      cliente, hora: el.fHora.value, data: el.fData.value || dataSelecionada, servicoId: servico.id,
    });
    el.waPreview.textContent = preview;
  }

  function abrirModal(horaSugerida) {
    popularServicos();
    el.fData.value = dataSelecionada;
    el.fCliente.value = '';
    el.fTelefone.value = '';
    popularHorarios();
    if (horaSugerida) {
      // tenta selecionar a sugestão, se ainda estiver disponível
      const existeOpcao = Array.from(el.fHora.options).some(o => o.value === horaSugerida);
      if (existeOpcao) el.fHora.value = horaSugerida;
    }
    atualizarPreviaWA();
    el.modalOverlay.classList.add('open');
  }

  function fecharModal() {
    el.modalOverlay.classList.remove('open');
  }

  el.btnNovoDesktop.addEventListener('click', () => abrirModal());
  el.btnNovoMobile.addEventListener('click', () => abrirModal());
  el.modalClose.addEventListener('click', fecharModal);
  el.modalOverlay.addEventListener('click', (e) => { if (e.target === el.modalOverlay) fecharModal(); });

  el.fServico.addEventListener('change', popularHorarios);
  el.fData.addEventListener('change', popularHorarios);
  el.fHora.addEventListener('change', atualizarPreviaWA);
  el.fCliente.addEventListener('input', atualizarPreviaWA);

  el.form.addEventListener('submit', (e) => {
    e.preventDefault();
    const servico = Encaixe.servicoById(el.fServico.value);
    if (!el.fHora.value) return;

    Encaixe.add({
      cliente: el.fCliente.value.trim(),
      telefone: el.fTelefone.value.trim(),
      servicoId: servico.id,
      data: el.fData.value,
      hora: el.fHora.value,
      duracao: servico.duracao,
      preco: servico.preco,
    });

    fecharModal();
    dataSelecionada = el.fData.value;
    render();
  });

  render();
})();
