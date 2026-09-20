/* ==========================================================================
   ENCAIXE — Agendamento público (agendar.html)
   ========================================================================== */

(() => {
  const state = {
    servicoId: null,
    data: Encaixe.todayISO(),
    hora: null,
  };

  const el = {
    listaServicos: document.getElementById('lista-servicos'),
    btnIrHorario: document.getElementById('btn-ir-horario'),
    etapaServico: document.getElementById('etapa-servico'),
    etapaHorario: document.getElementById('etapa-horario'),
    etapaDados: document.getElementById('etapa-dados'),
    etapaSucesso: document.getElementById('etapa-sucesso'),
    listaDias: document.getElementById('lista-dias'),
    listaSlots: document.getElementById('lista-slots'),
    btnIrDados: document.getElementById('btn-ir-dados'),
    btnVoltarServico: document.getElementById('btn-voltar-servico'),
    resumoCard: document.getElementById('resumo-card'),
    cNome: document.getElementById('c-nome'),
    cTelefone: document.getElementById('c-telefone'),
    btnConfirmar: document.getElementById('btn-confirmar'),
    btnVoltarHorario: document.getElementById('btn-voltar-horario'),
    waPreviewFinal: document.getElementById('wa-preview-final'),
    btnNovoAgendamento: document.getElementById('btn-novo-agendamento'),
    steps: document.querySelectorAll('.book-steps span'),
  };

  function setStep(n) {
    el.steps.forEach(s => s.classList.toggle('active', Number(s.dataset.step) <= n));
  }

  function mostrar(etapa) {
    [el.etapaServico, el.etapaHorario, el.etapaDados, el.etapaSucesso].forEach(e => e.classList.add('hidden'));
    etapa.classList.remove('hidden');
  }

  // ------------------------------------------------------------ etapa 1
  function renderServicos() {
    el.listaServicos.innerHTML = Encaixe.SERVICOS.map(s => `
      <div class="service-option" data-id="${s.id}">
        <div>
          <div class="name">${s.nome}</div>
          <div class="meta">${s.duracao} min</div>
        </div>
        <div class="price">R$ ${s.preco}</div>
      </div>
    `).join('');

    el.listaServicos.querySelectorAll('.service-option').forEach(opt => {
      opt.addEventListener('click', () => {
        state.servicoId = opt.dataset.id;
        el.listaServicos.querySelectorAll('.service-option').forEach(o => o.classList.remove('selected'));
        opt.classList.add('selected');
        el.btnIrHorario.disabled = false;
      });
    });
  }

  el.btnIrHorario.addEventListener('click', () => {
    setStep(2);
    mostrar(el.etapaHorario);
    renderDias();
    renderSlots();
  });

  // ------------------------------------------------------------ etapa 2
  function renderDias() {
    const dias = [];
    for (let i = 0; i < 7; i++) dias.push(Encaixe.addDays(Encaixe.todayISO(), i));

    el.listaDias.innerHTML = dias.map(iso => {
      const d = new Date(iso + 'T00:00:00');
      const dow = d.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '');
      const num = d.getDate();
      const selecionado = iso === state.data ? 'selected' : '';
      return `<div class="day-chip ${selecionado}" data-iso="${iso}"><div class="dow">${dow}</div><div class="num">${num}</div></div>`;
    }).join('');

    el.listaDias.querySelectorAll('.day-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        state.data = chip.dataset.iso;
        state.hora = null;
        el.btnIrDados.disabled = true;
        renderDias();
        renderSlots();
      });
    });
  }

  function renderSlots() {
    const servico = Encaixe.servicoById(state.servicoId);
    const disponiveis = Encaixe.slotsDisponiveis(state.data, servico.duracao);

    if (disponiveis.length === 0) {
      el.listaSlots.innerHTML = '<div class="slot-empty">Sem horários livres nesse dia — tente outra data.</div>';
      return;
    }

    el.listaSlots.innerHTML = disponiveis.map(h => {
      const selecionado = h === state.hora ? 'selected' : '';
      return `<button type="button" class="slot-btn ${selecionado}" data-hora="${h}">${h}</button>`;
    }).join('');

    el.listaSlots.querySelectorAll('.slot-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        state.hora = btn.dataset.hora;
        el.listaSlots.querySelectorAll('.slot-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        el.btnIrDados.disabled = false;
      });
    });
  }

  el.btnVoltarServico.addEventListener('click', () => {
    setStep(1);
    mostrar(el.etapaServico);
  });

  el.btnIrDados.addEventListener('click', () => {
    setStep(3);
    mostrar(el.etapaDados);
    renderResumo();
  });

  // ------------------------------------------------------------ etapa 3
  function renderResumo() {
    const servico = Encaixe.servicoById(state.servicoId);
    const dataFormatada = new Date(state.data + 'T00:00:00').toLocaleDateString('pt-BR', {
      weekday: 'long', day: '2-digit', month: 'long',
    });
    el.resumoCard.innerHTML = `
      <div class="summary-row"><span class="k">Serviço</span><span>${servico.nome}</span></div>
      <div class="summary-row"><span class="k">Data</span><span>${dataFormatada}</span></div>
      <div class="summary-row"><span class="k">Horário</span><span>${state.hora}</span></div>
      <div class="summary-row total"><span class="k">Total</span><span>R$ ${servico.preco}</span></div>
    `;
  }

  el.btnVoltarHorario.addEventListener('click', () => {
    setStep(2);
    mostrar(el.etapaHorario);
  });

  el.btnConfirmar.addEventListener('click', () => {
    const nome = el.cNome.value.trim();
    const telefone = el.cTelefone.value.trim();
    if (!nome || !telefone) {
      el.cNome.style.borderColor = nome ? '' : 'var(--danger)';
      el.cTelefone.style.borderColor = telefone ? '' : 'var(--danger)';
      return;
    }

    const servico = Encaixe.servicoById(state.servicoId);
    const appt = Encaixe.add({
      cliente: nome,
      telefone,
      servicoId: servico.id,
      data: state.data,
      hora: state.hora,
      duracao: servico.duracao,
      preco: servico.preco,
    });

    el.waPreviewFinal.textContent = Encaixe.mensagemConfirmacao(appt);
    setStep(3);
    mostrar(el.etapaSucesso);
  });

  el.btnNovoAgendamento.addEventListener('click', () => {
    state.servicoId = null;
    state.hora = null;
    el.cNome.value = '';
    el.cTelefone.value = '';
    el.btnIrHorario.disabled = true;
    setStep(1);
    mostrar(el.etapaServico);
    renderServicos();
  });

  renderServicos();
})();
