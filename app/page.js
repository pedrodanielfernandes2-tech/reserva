"use client";

import { useEffect, useState, useCallback } from "react";

const MESES = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
const DIAS_SEMANA = ["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"];
const VERSICULOS = [
  "O Senhor é o meu pastor; nada me faltará. (Salmos 23:1)",
  "Tudo posso naquele que me fortalece. (Filipenses 4:13)",
  "Entrega o teu caminho ao Senhor; confia nele. (Salmos 37:5)",
  "Porque Deus amou o mundo de tal maneira… (João 3:16)",
  "O Senhor é bom, uma fortaleza no dia da angústia. (Naum 1:7)",
];

function paraMinutos(hhmm) {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

export default function Page() {
  const hoje = new Date();

  const [secao, setSecao] = useState("calendario");
  const [salas, setSalas] = useState([]);
  const [reservas, setReservas] = useState([]);
  const [mesAtual, setMesAtual] = useState(hoje.getMonth());
  const [anoAtual, setAnoAtual] = useState(hoje.getFullYear());
  const [salaAtiva, setSalaAtiva] = useState(null);
  const [adminMode, setAdminMode] = useState(false);
  const [versiculo, setVersiculo] = useState("");
  const [carregando, setCarregando] = useState(true);

  const [modalReservaAberto, setModalReservaAberto] = useState(false);
  const [diaSelecionado, setDiaSelecionado] = useState(null);
  const [formReserva, setFormReserva] = useState({ nome: "", sala: "", evento: "", horaInicio: "", horaFim: "" });
  const [erroReserva, setErroReserva] = useState("");
  const [enviandoReserva, setEnviandoReserva] = useState(false);

  const [modalAdminAberto, setModalAdminAberto] = useState(false);
  const [senhaAdmin, setSenhaAdmin] = useState("");
  const [erroAdmin, setErroAdmin] = useState("");

  const [formSala, setFormSala] = useState({ nome: "", tipo: "Sala" });
  const [erroSala, setErroSala] = useState("");

  const [dataRelatorio, setDataRelatorio] = useState(() => {
    const d = new Date();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${d.getFullYear()}-${mm}-${dd}`;
  });

  const carregarSalas = useCallback(async () => {
    const res = await fetch("/api/salas");
    const data = await res.json();
    setSalas(data);
    if (!salaAtiva && data.length > 0) setSalaAtiva(data[0].nome);
  }, [salaAtiva]);

  const carregarReservas = useCallback(async () => {
    const res = await fetch("/api/reservas");
    const data = await res.json();
    setReservas(data);
  }, []);

  useEffect(() => {
    setVersiculo(VERSICULOS[Math.floor(Math.random() * VERSICULOS.length)]);

    (async () => {
      await Promise.all([carregarSalas(), carregarReservas()]);
      const statusRes = await fetch("/api/admin/status");
      const status = await statusRes.json();
      setAdminMode(Boolean(status.admin));
      setCarregando(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Mantém a lista de reservas razoavelmente atualizada entre vários usuários
  useEffect(() => {
    const t = setInterval(() => { carregarReservas(); }, 15000);
    return () => clearInterval(t);
  }, [carregarReservas]);

  function abrirModalReserva(dia) {
    setDiaSelecionado(dia);
    setErroReserva("");
    setFormReserva({ nome: "", sala: salaAtiva || (salas[0] && salas[0].nome) || "", evento: "", horaInicio: "", horaFim: "" });
    setModalReservaAberto(true);
  }
  function fecharModalReserva() {
    setModalReservaAberto(false);
  }

  async function enviarReserva(e) {
    e.preventDefault();
    setErroReserva("");

    const { nome, sala, evento, horaInicio, horaFim } = formReserva;
    if (!nome.trim() || !sala || !evento.trim() || !horaInicio || !horaFim) {
      setErroReserva("Preencha todos os campos.");
      return;
    }
    if (horaFim <= horaInicio) {
      setErroReserva("O horário de término precisa ser depois do horário de início.");
      return;
    }

    setEnviandoReserva(true);
    try {
      const res = await fetch("/api/reservas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome: nome.trim(), sala, evento: evento.trim(),
          dia: diaSelecionado, mes: mesAtual, ano: anoAtual,
          horaInicio, horaFim,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setErroReserva(data.erro || "Não foi possível concluir a reserva.");
        return;
      }

      await carregarReservas();
      fecharModalReserva();
    } finally {
      setEnviandoReserva(false);
    }
  }

  async function excluirReserva(reserva) {
    let nomeConfirmado = null;
    if (!adminMode) {
      nomeConfirmado = prompt(
        `Para excluir, digite o nome do solicitante exatamente como foi cadastrado (${reserva.nome}):`
      );
      if (nomeConfirmado === null) return;
    }

    const res = await fetch(`/api/reservas/${reserva.id}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nome: nomeConfirmado || "" }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(data.erro || "Não foi possível excluir esta reserva.");
      return;
    }
    await carregarReservas();
  }

  async function enviarLoginAdmin(e) {
    e.preventDefault();
    setErroAdmin("");
    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ senha: senhaAdmin }),
    });
    if (!res.ok) {
      setErroAdmin("Senha incorreta.");
      return;
    }
    setAdminMode(true);
    setModalAdminAberto(false);
    setSenhaAdmin("");
  }

  async function sairAdmin() {
    await fetch("/api/admin/logout", { method: "POST" });
    setAdminMode(false);
  }

  async function cadastrarSala(e) {
    e.preventDefault();
    setErroSala("");
    if (!formSala.nome.trim()) {
      setErroSala("Informe um nome para a sala.");
      return;
    }
    const res = await fetch("/api/salas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formSala),
    });
    const data = await res.json();
    if (!res.ok) {
      setErroSala(data.erro || "Não foi possível cadastrar a sala.");
      return;
    }
    setFormSala({ nome: "", tipo: "Sala" });
    await carregarSalas();
  }

  async function excluirSala(sala) {
    if (!confirm("Excluir esta sala também manterá o histórico de reservas já feitas para ela, mas ela não aparecerá mais para novas solicitações. Continuar?")) return;
    const res = await fetch(`/api/salas/${sala.id}`, { method: "DELETE" });
    if (!res.ok) {
      alert("Não foi possível excluir esta sala.");
      return;
    }
    if (sala.nome === salaAtiva) {
      const restantes = salas.filter((s) => s.id !== sala.id);
      setSalaAtiva(restantes[0] ? restantes[0].nome : null);
    }
    await carregarSalas();
  }

  // ---------- Derivados para renderização ----------

  const corAtiva = salas.find((s) => s.nome === salaAtiva);
  const reservasHoje = reservas.filter(
    (r) => r.dia === hoje.getDate() && r.mes === hoje.getMonth() && r.ano === hoje.getFullYear()
  ).length;

  const reservasDaSalaAtiva = reservas.filter((r) => r.sala_nome === salaAtiva);
  const proximas = reservasDaSalaAtiva
    .filter((r) => new Date(r.ano, r.mes, r.dia) >= new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate()))
    .sort((a, b) => new Date(a.ano, a.mes, a.dia) - new Date(b.ano, b.mes, b.dia) || a.hora_inicio.localeCompare(b.hora_inicio));

  const primeiroDia = new Date(anoAtual, mesAtual, 1);
  const ultimoDiaNum = new Date(anoAtual, mesAtual + 1, 0).getDate();
  const offset = primeiroDia.getDay();
  const celulasVazias = Array.from({ length: offset });
  const diasDoMes = Array.from({ length: ultimoDiaNum }, (_, i) => i + 1);

  const anoBase = new Date().getFullYear();
  const anosDisponiveis = [anoBase - 1, anoBase, anoBase + 1, anoBase + 2];

  const [anoRel, mesRel, diaRel] = dataRelatorio.split("-").map(Number);
  const reservasDoDiaTodasSalas = reservas
    .filter((r) => r.dia === diaRel && r.mes === mesRel - 1 && r.ano === anoRel)
    .sort((a, b) => a.sala_nome.localeCompare(b.sala_nome) || a.hora_inicio.localeCompare(b.hora_inicio));

  const dataRelatorioFormatada = `${String(diaRel).padStart(2, "0")}/${String(mesRel).padStart(2, "0")}/${anoRel}`;

  if (carregando) {
    return <div style={{ padding: 40, fontFamily: "Manrope, sans-serif" }}>Carregando…</div>;
  }

  return (
    <>
      <header>
        <div className="logo-area">
          <div className="logo-frame">
            <img src="/logo.jpg" alt="Logo Assembleia de Deus Louveira" />
          </div>
          <div className="logo-text">
            Assembleia de Deus Louveira
            <small>Comunicação &amp; Mídia</small>
          </div>
        </div>
        <div className="header-title">
          <h1>Reserva de Salas &amp; Nave</h1>
          <p>Escolha o dia, informe o evento e garanta seu horário</p>
        </div>
      </header>

      <div className="layout">
        <aside className="sidebar">
          <div className="sidebar-top">
            <div className="sidebar-eyebrow">Menu</div>
            <button className={"nav-btn" + (secao === "calendario" ? " active" : "")} onClick={() => setSecao("calendario")}>
              <span className="ico">📅</span> Calendário
            </button>
            <button className={"nav-btn" + (secao === "reservaInfo" ? " active" : "")} onClick={() => setSecao("reservaInfo")}>
              <span className="ico">🗒️</span> Reservas do Dia
            </button>
            <button className={"nav-btn" + (secao === "salas" ? " active" : "")} onClick={() => setSecao("salas")}>
              <span className="ico">🏛️</span> Cadastro de Salas
            </button>

            <div className="admin-box">
              {adminMode ? (
                <div className="admin-pill">
                  🔑 Modo Admin ativo <button onClick={sairAdmin}>Sair</button>
                </div>
              ) : (
                <button className="btn-ghost-admin" onClick={() => setModalAdminAberto(true)}>
                  🔒 Entrar como Admin
                </button>
              )}
            </div>
          </div>

          <div className="versiculo-box">
            <strong>Versículo do Dia</strong>
            <span>{versiculo}</span>
          </div>
        </aside>

        <main className="content">
          <div className="cards">
            <div className="card">
              <div className="label">Reservas Hoje</div>
              <div className="value">{reservasHoje}</div>
            </div>
            <div className="card">
              <div className="label">Total de Salas</div>
              <div className="value">{salas.length}</div>
            </div>
            <div className="card">
              <div className="label">Visualizando</div>
              <div className="value small">{salaAtiva || "Nenhuma"}</div>
            </div>
          </div>

          {secao === "calendario" && (
            <div className="block">
              <h3>Calendário de Reservas</h3>
              <p className="block-sub">Clique em um dia livre para solicitar a Sala ou a Nave.</p>

              <div className="room-tabs">
                {salas.map((s) => (
                  <button
                    key={s.id}
                    className={"room-tab" + (s.nome === salaAtiva ? " active" : "")}
                    style={{ "--tab-color": s.cor }}
                    onClick={() => setSalaAtiva(s.nome)}
                  >
                    <span className="dot" style={{ background: s.cor }} /> {s.nome}
                  </button>
                ))}
              </div>

              <div className="cal-controls">
                <select value={mesAtual} onChange={(e) => setMesAtual(parseInt(e.target.value, 10))}>
                  {MESES.map((m, i) => (
                    <option key={m} value={i}>{m}</option>
                  ))}
                </select>
                <select value={anoAtual} onChange={(e) => setAnoAtual(parseInt(e.target.value, 10))}>
                  {anosDisponiveis.map((a) => (
                    <option key={a} value={a}>{a}</option>
                  ))}
                </select>
              </div>

              <div className="calendar">
                {DIAS_SEMANA.map((d) => (
                  <div key={d} className="weekday">{d}</div>
                ))}

                {celulasVazias.map((_, i) => (
                  <div key={"vazio-" + i} className="day empty" />
                ))}

                {diasDoMes.map((dia) => {
                  const ehHoje = dia === hoje.getDate() && mesAtual === hoje.getMonth() && anoAtual === hoje.getFullYear();
                  const reservasDoDia = reservas
                    .filter((r) => r.dia === dia && r.mes === mesAtual && r.ano === anoAtual && r.sala_nome === salaAtiva)
                    .sort((a, b) => a.hora_inicio.localeCompare(b.hora_inicio));

                  return (
                    <div key={dia} className={"day" + (ehHoje ? " today" : "")} onClick={() => abrirModalReserva(dia)}>
                      <div className="day-number">{dia}</div>
                      {reservasDoDia.map((r) => (
                        <div key={r.id} className="reserva-item" style={{ background: corAtiva ? corAtiva.cor : "var(--primary)" }}>
                          {r.hora_inicio}-{r.hora_fim} · {r.evento}
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>

              <h3 style={{ marginTop: 26, fontSize: 16 }}>Próximas reservas — {salaAtiva || "—"}</h3>
              <ul className="lista-reservas">
                {proximas.length === 0 && (
                  <div className="empty-state">
                    Nenhuma reserva futura para {salaAtiva || "esta sala"}. O calendário está livre.
                  </div>
                )}
                {proximas.map((r) => {
                  const dataFmt = String(r.dia).padStart(2, "0") + "/" + String(r.mes + 1).padStart(2, "0") + "/" + r.ano;
                  return (
                    <li key={r.id}>
                      <div className="res-info">
                        <b>{r.evento}</b>
                        <span>{dataFmt} · {r.hora_inicio} às {r.hora_fim} · Solicitado por {r.nome}</span>
                      </div>
                      <div className="res-actions">
                        <button onClick={() => excluirReserva(r)}>Excluir</button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {secao === "reservaInfo" && (
            <div className="block">
              <div className="reservas-dia-head">
                <div>
                  <h3>Reservas do Dia</h3>
                  <p className="block-sub">Todas as salas e a Nave juntas, numa única lista — útil para imprimir e deixar na secretaria ou na entrada.</p>
                </div>
                <button className="btn-primary no-print" style={{ gridColumn: "auto", width: "auto" }} onClick={() => window.print()}>
                  🖨️ Imprimir
                </button>
              </div>

              <div className="form-field no-print" style={{ maxWidth: 220, marginTop: 16 }}>
                <label>Data</label>
                <input type="date" value={dataRelatorio} onChange={(e) => setDataRelatorio(e.target.value)} />
              </div>

              <div className="print-area">
                <h2 className="print-only-title">Reservas — {dataRelatorioFormatada}</h2>
                <table className="tabela-reservas-dia">
                  <thead>
                    <tr>
                      <th>Sala / Nave</th>
                      <th>Horário</th>
                      <th>Evento</th>
                      <th>Solicitante</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reservasDoDiaTodasSalas.length === 0 && (
                      <tr>
                        <td colSpan={4} style={{ textAlign: "center", color: "var(--ink-soft)" }}>
                          Nenhuma reserva para {dataRelatorioFormatada}.
                        </td>
                      </tr>
                    )}
                    {reservasDoDiaTodasSalas.map((r) => (
                      <tr key={r.id}>
                        <td><span className="sala-tag">{r.sala_nome}</span></td>
                        <td>{r.hora_inicio} – {r.hora_fim}</td>
                        <td>{r.evento}</td>
                        <td>{r.nome}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <p className="block-sub no-print" style={{ marginTop: 16 }}>
                Lembrete: reservas são feitas clicando num dia no <b>Calendário</b>. Para excluir, é preciso confirmar
                o nome do solicitante (ou estar em Modo Admin).
              </p>
            </div>
          )}

          {secao === "salas" && (
            <div className="block">
              <h3>Cadastro de Salas e Nave</h3>
              <p className="block-sub">Área restrita — apenas administradores podem cadastrar ou remover ambientes.</p>

              {adminMode ? (
                <>
                  <form className="form-grid" style={{ marginTop: 18 }} onSubmit={cadastrarSala}>
                    {erroSala && <div className="form-error" style={{ display: "block" }}>{erroSala}</div>}
                    <div className="form-field">
                      <label>Nome</label>
                      <input
                        type="text" required placeholder="Ex: Sala 3"
                        value={formSala.nome}
                        onChange={(e) => setFormSala((f) => ({ ...f, nome: e.target.value }))}
                      />
                    </div>
                    <div className="form-field">
                      <label>Tipo</label>
                      <select value={formSala.tipo} onChange={(e) => setFormSala((f) => ({ ...f, tipo: e.target.value }))}>
                        <option value="Sala">Sala</option>
                        <option value="Nave">Nave</option>
                      </select>
                    </div>
                    <button className="btn-primary">Cadastrar Ambiente</button>
                  </form>

                  <div className="sala-chip-list">
                    {salas.map((s) => (
                      <div className="sala-chip" key={s.id}>
                        <span className="swatch" style={{ background: s.cor }} />
                        <div className="info">
                          <b>{s.nome}</b>
                          <span>{s.tipo}</span>
                        </div>
                        <button className="btn-danger" style={{ padding: "8px 12px", fontSize: 12 }} onClick={() => excluirSala(s)}>
                          Excluir
                        </button>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="locked-box">
                  <span className="ico">🔒</span>
                  <h4>Acesso restrito</h4>
                  <p>Entre como administrador para cadastrar ou remover salas e a Nave.</p>
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      <footer className="app-footer">Assembleia de Deus Louveira · Sistema de Reserva de Ambientes</footer>

      {/* MODAL RESERVA */}
      <div className={"overlay" + (modalReservaAberto ? " show" : "")}>
        <div className="modal">
          <div className="modal-head">
            <h3>Nova Solicitação</h3>
            <button onClick={fecharModalReserva}>✕</button>
          </div>
          {diaSelecionado && (
            <span className="date-badge">
              {String(diaSelecionado).padStart(2, "0")}/{String(mesAtual + 1).padStart(2, "0")}/{anoAtual}
            </span>
          )}

          <form className="form-grid" onSubmit={enviarReserva}>
            {erroReserva && <div className="form-error" style={{ display: "block" }}>{erroReserva}</div>}

            <div className="form-field full">
              <label>Solicitante</label>
              <input
                type="text" required placeholder="Seu nome completo"
                value={formReserva.nome}
                onChange={(e) => setFormReserva((f) => ({ ...f, nome: e.target.value }))}
              />
            </div>

            <div className="form-field">
              <label>Data da solicitação</label>
              <input type="text" disabled value={hoje.toLocaleDateString("pt-BR")} />
            </div>

            <div className="form-field">
              <label>Sala / Nave</label>
              <select value={formReserva.sala} onChange={(e) => setFormReserva((f) => ({ ...f, sala: e.target.value }))}>
                {salas.map((s) => (
                  <option key={s.id} value={s.nome}>{s.nome} ({s.tipo})</option>
                ))}
              </select>
            </div>

            <div className="form-field full">
              <label>Evento</label>
              <input
                type="text" required placeholder="Ex: Ensaio do coral"
                value={formReserva.evento}
                onChange={(e) => setFormReserva((f) => ({ ...f, evento: e.target.value }))}
              />
            </div>

            <div className="form-field">
              <label>Início</label>
              <input
                type="time" required
                value={formReserva.horaInicio}
                onChange={(e) => setFormReserva((f) => ({ ...f, horaInicio: e.target.value }))}
              />
            </div>

            <div className="form-field">
              <label>Término</label>
              <input
                type="time" required
                value={formReserva.horaFim}
                onChange={(e) => setFormReserva((f) => ({ ...f, horaFim: e.target.value }))}
              />
            </div>

            <button className="btn-primary" disabled={enviandoReserva}>
              {enviandoReserva ? "Enviando…" : "Enviar Solicitação"}
            </button>
          </form>
        </div>
      </div>

      {/* MODAL ADMIN */}
      <div className={"overlay" + (modalAdminAberto ? " show" : "")}>
        <div className="modal" style={{ maxWidth: 380 }}>
          <div className="modal-head">
            <h3>Acesso Admin</h3>
            <button onClick={() => setModalAdminAberto(false)}>✕</button>
          </div>
          <form className="form-grid" style={{ marginTop: 10 }} onSubmit={enviarLoginAdmin}>
            {erroAdmin && <div className="form-error" style={{ display: "block" }}>{erroAdmin}</div>}
            <div className="form-field full">
              <label>Senha de administrador</label>
              <input type="password" required value={senhaAdmin} onChange={(e) => setSenhaAdmin(e.target.value)} />
            </div>
            <button className="btn-primary">Entrar</button>
          </form>
        </div>
      </div>
    </>
  );
}
