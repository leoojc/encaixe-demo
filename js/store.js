/* ==========================================================================
   ENCAIXE — Camada de dados (localStorage)
   Simula um backend real para fins de demonstração.
   ========================================================================== */

const Encaixe = (() => {
  const STORAGE_KEY = 'encaixe_agendamentos_v1';

  const NEGOCIO = {
    nome: 'Barbearia Vintage',
    horaAbertura: '09:00',
    horaFechamento: '19:00',
    almocoInicio: '12:00',
    almocoFim: '13:00',
    intervaloSlot: 30, // minutos
  };

  const SERVICOS = [
    { id: 'corte', nome: 'Corte masculino', duracao: 30, preco: 45 },
    { id: 'barba', nome: 'Barba', duracao: 20, preco: 25 },
    { id: 'combo', nome: 'Corte + Barba', duracao: 45, preco: 65 },
    { id: 'coloracao', nome: 'Coloração', duracao: 90, preco: 120 },
  ];

  function pad(n) { return String(n).padStart(2, '0'); }

  function toISODate(d) {
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }

  function todayISO() { return toISODate(new Date()); }

  function addDays(iso, n) {
    const d = new Date(iso + 'T00:00:00');
    d.setDate(d.getDate() + n);
    return toISODate(d);
  }

  function timeToMinutes(t) {
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
  }

  function minutesToTime(min) {
    const h = Math.floor(min / 60);
    const m = min % 60;
    return `${pad(h)}:${pad(m)}`;
  }

  function servicoById(id) {
    return SERVICOS.find(s => s.id === id);
  }

  function uid() {
    return 'a' + Math.random().toString(36).slice(2, 9);
  }

  function seed() {
    const t = todayISO();
    const amanha = addDays(t, 1);
    return [
      { id: uid(), cliente: 'Marcos Andrade', telefone: '81999990001', servicoId: 'combo', data: t, hora: '09:00', duracao: 45, preco: 65, status: 'concluido' },
      { id: uid(), cliente: 'Felipe Souza', telefone: '81999990002', servicoId: 'corte', data: t, hora: '10:00', duracao: 30, preco: 45, status: 'concluido' },
      { id: uid(), cliente: 'Rafael Lima', telefone: '81999990003', servicoId: 'barba', data: t, hora: '11:00', duracao: 20, preco: 25, status: 'confirmado' },
      { id: uid(), cliente: 'Diego Martins', telefone: '81999990004', servicoId: 'corte', data: t, hora: '14:00', duracao: 30, preco: 45, status: 'confirmado' },
      { id: uid(), cliente: 'Bruno Alves', telefone: '81999990005', servicoId: 'combo', data: t, hora: '16:30', duracao: 45, preco: 65, status: 'confirmado' },
      { id: uid(), cliente: 'Carlos Eduardo', telefone: '81999990006', servicoId: 'corte', data: t, hora: '17:30', duracao: 30, preco: 45, status: 'cancelado' },
      { id: uid(), cliente: 'Igor Peixoto', telefone: '81999990007', servicoId: 'coloracao', data: amanha, hora: '09:30', duracao: 90, preco: 120, status: 'confirmado' },
      { id: uid(), cliente: 'Thiago Nunes', telefone: '81999990008', servicoId: 'corte', data: amanha, hora: '15:00', duracao: 30, preco: 45, status: 'confirmado' },
    ];
  }

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        const initial = seed();
        localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
        return initial;
      }
      return JSON.parse(raw);
    } catch (e) {
      return seed();
    }
  }

  function save(list) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  }

  function all() { return load(); }

  function byDate(dateISO) {
    return load()
      .filter(a => a.data === dateISO)
      .sort((a, b) => timeToMinutes(a.hora) - timeToMinutes(b.hora));
  }

  function add(appt) {
    const list = load();
    const novo = { id: uid(), status: 'confirmado', ...appt };
    list.push(novo);
    save(list);
    return novo;
  }

  function updateStatus(id, status) {
    const list = load();
    const item = list.find(a => a.id === id);
    if (item) item.status = status;
    save(list);
  }

  function remove(id) {
    save(load().filter(a => a.id !== id));
  }

  function reset() {
    localStorage.removeItem(STORAGE_KEY);
    return load();
  }

  // ---------------------------------------------------------- disponibilidade
  function ocupados(dateISO) {
    return byDate(dateISO).filter(a => a.status !== 'cancelado');
  }

  function slotsDoDia(dateISO) {
    const inicio = timeToMinutes(NEGOCIO.horaAbertura);
    const fim = timeToMinutes(NEGOCIO.horaFechamento);
    const almocoIni = timeToMinutes(NEGOCIO.almocoInicio);
    const almocoFim = timeToMinutes(NEGOCIO.almocoFim);
    const passo = NEGOCIO.intervaloSlot;
    const slots = [];
    for (let m = inicio; m < fim; m += passo) {
      if (m >= almocoIni && m < almocoFim) continue;
      slots.push(m);
    }
    return slots;
  }

  function slotLivre(dateISO, minutoInicio, duracao, ignorarId = null) {
    const fimNovo = minutoInicio + duracao;
    const fechamento = timeToMinutes(NEGOCIO.horaFechamento);
    if (fimNovo > fechamento) return false;

    const existentes = ocupados(dateISO).filter(a => a.id !== ignorarId);
    for (const a of existentes) {
      const ini = timeToMinutes(a.hora);
      const fim = ini + a.duracao;
      if (minutoInicio < fim && fimNovo > ini) return false;
    }
    return true;
  }

  function slotsDisponiveis(dateISO, duracao) {
    return slotsDoDia(dateISO)
      .filter(m => slotLivre(dateISO, m, duracao))
      .map(minutesToTime);
  }

  // ------------------------------------------------- sugestão "inteligente"
  // Heurística: entre os horários livres, escolhe o que melhor evita
  // deixar "furos" pequenos e isolados na agenda (maximiza o espaço contínuo
  // remanescente nos dois lados do novo agendamento).
  function sugestaoIA(dateISO, duracao) {
    const livres = slotsDoDia(dateISO).filter(m => slotLivre(dateISO, m, duracao));
    if (livres.length === 0) return null;

    const ocupadosOrdenados = ocupados(dateISO)
      .map(a => ({ ini: timeToMinutes(a.hora), fim: timeToMinutes(a.hora) + a.duracao }))
      .sort((a, b) => a.ini - b.ini);

    function espacoAntes(min) {
      let melhor = 0;
      for (const o of ocupadosOrdenados) {
        if (o.fim <= min) melhor = Math.max(melhor, min - o.fim);
      }
      return melhor === 0 ? 999 : melhor;
    }
    function espacoDepois(min, fim) {
      let melhor = 999;
      for (const o of ocupadosOrdenados) {
        if (o.ini >= fim) melhor = Math.min(melhor, o.ini - fim);
      }
      return melhor;
    }

    let melhorSlot = livres[0];
    let melhorPontuacao = -Infinity;

    for (const m of livres) {
      const fim = m + duracao;
      const antes = espacoAntes(m);
      const depois = espacoDepois(m, fim);
      // Penaliza furos pequenos isolados (< 20min) que sobram de cada lado
      const penalidade = (antes < 20 ? 40 : 0) + (depois < 20 ? 40 : 0);
      const pontuacao = -penalidade - Math.abs(antes - depois) * 0.1;
      if (pontuacao > melhorPontuacao) {
        melhorPontuacao = pontuacao;
        melhorSlot = m;
      }
    }

    return minutesToTime(melhorSlot);
  }

  // ------------------------------------------------------------- estatísticas
  function statsDoDia(dateISO) {
    const doDia = byDate(dateISO);
    const confirmados = doDia.filter(a => a.status !== 'cancelado');
    const concluidos = doDia.filter(a => a.status === 'concluido');
    const cancelados = doDia.filter(a => a.status === 'cancelado');

    const minutosOcupados = confirmados.reduce((sum, a) => sum + a.duracao, 0);
    const minutosTotais = timeToMinutes(NEGOCIO.horaFechamento) - timeToMinutes(NEGOCIO.horaAbertura)
      - (timeToMinutes(NEGOCIO.almocoFim) - timeToMinutes(NEGOCIO.almocoInicio));
    const ocupacao = minutosTotais > 0 ? Math.round((minutosOcupados / minutosTotais) * 100) : 0;

    const faturamento = [...confirmados].reduce((sum, a) => sum + (a.preco || 0), 0);

    return {
      totalAgendamentos: doDia.filter(a => a.status !== 'cancelado').length,
      taxaOcupacao: ocupacao,
      cancelados: cancelados.length,
      concluidos: concluidos.length,
      faturamento,
    };
  }

  // --------------------------------------------------------- mensagem WhatsApp
  function mensagemConfirmacao(appt) {
    const servico = servicoById(appt.servicoId);
    const dataFormatada = new Date(appt.data + 'T00:00:00').toLocaleDateString('pt-BR', {
      weekday: 'long', day: '2-digit', month: 'long',
    });
    return `Olá, ${appt.cliente}! 👋\n` +
      `Seu horário na ${NEGOCIO.nome} está confirmado:\n\n` +
      `🗓️ ${dataFormatada}\n` +
      `⏰ ${appt.hora}\n` +
      `💈 ${servico ? servico.nome : ''}\n\n` +
      `Qualquer imprevisto, é só responder essa mensagem. Te esperamos!`;
  }

  return {
    NEGOCIO, SERVICOS,
    todayISO, addDays, timeToMinutes, minutesToTime,
    servicoById, all, byDate, add, updateStatus, remove, reset,
    slotsDisponiveis, sugestaoIA, statsDoDia, mensagemConfirmacao,
  };
})();
