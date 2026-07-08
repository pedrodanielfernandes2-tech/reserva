"use client";

import { useEffect, useState, useCallback, useMemo } from "react";

const MESES = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
const DIAS_SEMANA = ["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"];
const DIAS_SEMANA_FULL = ["Domingo","Segunda","Terça","Quarta","Quinta","Sexta","Sábado"];
const VERSICULOS = [
  "O Senhor é o meu pastor; nada me faltará. (Salmos 23:1)",
  "Tudo posso naquele que me fortalece. (Filipenses 4:13)",
  "Entrega o teu caminho ao Senhor; confia nele. (Salmos 37:5)",
  "Porque Deus amou o mundo de tal maneira… (João 3:16)",
  "O Senhor é bom, uma fortaleza no dia da angústia. (Naum 1:7)",
];
const LIMITE_DIAS = 60;

function paraMinutos(hhmm) {
  const [h,m] = hhmm.split(":").map(Number);
  return h*60+m;
}
function hoje() {
  const d = new Date(); d.setHours(0,0,0,0); return d;
}
function toDateInput(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}

export default function Page() {
  const agora = new Date();

  const [secao, setSecao]       = useState("calendario");
  const [salas, setSalas]       = useState([]);
  const [reservas, setReservas] = useState([]);
  const [bloqueios, setBloqueios] = useState([]);
  const [mesAtual, setMesAtual] = useState(agora.getMonth());
  const [anoAtual, setAnoAtual] = useState(agora.getFullYear());
  const [salaAtiva, setSalaAtiva] = useState(null);
  const [modoGrade, setModoGrade] = useState(false);
  const [adminMode, setAdminMode] = useState(false);
  const [versiculo, setVersiculo] = useState("");
  const [carregando, setCarregando] = useState(true);

  // Modal reserva
  const [modalAberto, setModalAberto] = useState(false);
  const [diaSelecionado, setDiaSelecionado] = useState(null);
  const [form, setForm] = useState({ nome:"", sala:"", evento:"", observacao:"", horaInicio:"", horaFim:"", recorrencia:"nenhuma", recorrenciaFim:"" });
  const [erroReserva, setErroReserva] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [sucessoReserva, setSucessoReserva] = useState(null);

  // Modal admin
  const [modalAdmin, setModalAdmin] = useState(false);
  const [senhaAdmin, setSenhaAdmin] = useState("");
  const [erroAdmin, setErroAdmin] = useState("");

  // Cadastro salas
  const [formSala, setFormSala] = useState({ nome:"", tipo:"Sala" });
  const [erroSala, setErroSala] = useState("");

  // Configurações
  const [config, setConfig] = useState({ email_from:"", email_admin:"", limite_dias:"60", email_mensagem:"" });
  const [salvandoConfig, setSalvandoConfig] = useState(false);
  const [sucessoConfig, setSucessoConfig] = useState(false);

  const carregarConfig = useCallback(async () => {
    try {
      const res = await fetch("/api/config");
      const data = await res.json();
      setConfig(data);
    } catch(e) { console.error("Erro ao carregar config:", e); }
  }, []);
  const [erroBloqueio, setErroBloqueio] = useState("");

  // Relatório
  const [dataRelatorio, setDataRelatorio] = useState(toDateInput(agora));
  const [buscaRelatorio, setBuscaRelatorio] = useState("");

  const carregarSalas = useCallback(async () => {
    try {
      const res = await fetch("/api/salas");
      const data = await res.json();
      setSalas(Array.isArray(data) ? data : []);
      if (!salaAtiva && Array.isArray(data) && data.length > 0) setSalaAtiva(data[0].nome);
    } catch(e) { console.error("Erro ao carregar salas:", e); }
  }, [salaAtiva]);

  const carregarReservas = useCallback(async () => {
    try {
      const res = await fetch("/api/reservas");
      const data = await res.json();
      setReservas(Array.isArray(data) ? data : []);
    } catch(e) { console.error("Erro ao carregar reservas:", e); }
  }, []);

  const carregarBloqueios = useCallback(async () => {
    try {
      const res = await fetch("/api/bloqueios");
      const data = await res.json();
      setBloqueios(Array.isArray(data) ? data : []);
    } catch(e) { console.error("Erro ao carregar bloqueios:", e); }
  }, []);

  useEffect(() => {
    setVersiculo(VERSICULOS[Math.floor(Math.random()*VERSICULOS.length)]);
    (async () => {
      try {
        await Promise.all([carregarSalas(), carregarReservas(), carregarBloqueios(), carregarConfig()]);
        const s = await (await fetch("/api/admin/status")).json();
        setAdminMode(Boolean(s.admin));
      } catch(e) {
        console.error("Erro ao carregar dados:", e);
      } finally {
        setCarregando(false);
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const t = setInterval(() => { carregarReservas(); }, 15000);
    return () => clearInterval(t);
  }, [carregarReservas]);

  // ---- RESERVA ----
  function abrirModal(dia) {
    const dataEscolhida = new Date(anoAtual, mesAtual, dia);
    const diffDias = Math.round((dataEscolhida - hoje()) / 86400000);
    if (diffDias > LIMITE_DIAS_EFETIVO) {
      alert(`Só é possível reservar com até ${LIMITE_DIAS_EFETIVO} dias de antecedência.`);
      return;
    }
    setDiaSelecionado(dia);
    setErroReserva("");
    setSucessoReserva(null);
    setForm({ nome:"", sala: salaAtiva || (salas[0]?.nome||""), evento:"", observacao:"", horaInicio:"", horaFim:"", recorrencia:"nenhuma", recorrenciaFim:"" });
    setModalAberto(true);
  }
  function fecharModal() { setModalAberto(false); setSucessoReserva(null); }

  async function enviarReserva(e) {
    e.preventDefault();
    setErroReserva("");
    const { nome, sala, evento, observacao, horaInicio, horaFim, recorrencia, recorrenciaFim } = form;
    if (!nome.trim() || !sala || !evento.trim() || !horaInicio || !horaFim) {
      setErroReserva("Preencha todos os campos obrigatórios."); return;
    }
    if (horaFim <= horaInicio) {
      setErroReserva("O término precisa ser depois do início."); return;
    }
    if (recorrencia !== "nenhuma" && !recorrenciaFim) {
      setErroReserva("Informe a data final da recorrência."); return;
    }
    setEnviando(true);
    try {
      const res = await fetch("/api/reservas", {
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ nome:nome.trim(), sala, evento:evento.trim(), observacao:observacao.trim(), dia:diaSelecionado, mes:mesAtual, ano:anoAtual, horaInicio, horaFim, recorrencia, recorrenciaFim }),
      });
      const data = await res.json();
      if (!res.ok) { setErroReserva(data.erro || "Não foi possível concluir a reserva."); return; }
      await carregarReservas();
      setSucessoReserva({ ...data, nomeSolicitante: nome.trim(), recorrencia, totalCriadas: data.totalCriadas });
    } finally { setEnviando(false); }
  }

  async function excluirReserva(r) {
    let nomeConf = null;
    if (!adminMode) {
      nomeConf = prompt(`Para excluir, confirme o nome do solicitante (${r.nome}):`);
      if (nomeConf === null) return;
    }
    const res = await fetch(`/api/reservas/${r.id}`, {
      method:"DELETE", headers:{"Content-Type":"application/json"},
      body: JSON.stringify({ nome: nomeConf||"" }),
    });
    if (!res.ok) { const d = await res.json().catch(()=>({})); alert(d.erro||"Não foi possível excluir."); return; }
    await carregarReservas();
  }

  // ---- ADMIN ----
  async function loginAdmin(e) {
    e.preventDefault(); setErroAdmin("");
    const res = await fetch("/api/admin/login", { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ senha:senhaAdmin }) });
    if (!res.ok) { setErroAdmin("Senha incorreta."); return; }
    setAdminMode(true); setModalAdmin(false); setSenhaAdmin("");
  }
  async function sairAdmin() { await fetch("/api/admin/logout",{method:"POST"}); setAdminMode(false); }

  // ---- SALAS ----
  async function cadastrarSala(e) {
    e.preventDefault(); setErroSala("");
    if (!formSala.nome.trim()) { setErroSala("Informe um nome."); return; }
    const res = await fetch("/api/salas",{ method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify(formSala) });
    const d = await res.json();
    if (!res.ok) { setErroSala(d.erro||"Erro ao cadastrar."); return; }
    setFormSala({ nome:"", tipo:"Sala" }); await carregarSalas();
  }
  async function excluirSala(s) {
    if (!confirm("Excluir esta sala? As reservas históricas são mantidas.")) return;
    await fetch(`/api/salas/${s.id}`,{method:"DELETE"});
    if (s.nome===salaAtiva) setSalaAtiva(salas.filter(x=>x.id!==s.id)[0]?.nome||null);
    await carregarSalas();
  }

  // ---- BLOQUEIOS ----
  async function cadastrarBloqueio(e) {
    e.preventDefault(); setErroBloqueio("");
    if (!formBloqueio.sala_nome||!formBloqueio.hora_inicio||!formBloqueio.hora_fim) {
      setErroBloqueio("Preencha todos os campos."); return;
    }
    const res = await fetch("/api/bloqueios",{ method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify(formBloqueio) });
    const d = await res.json();
    if (!res.ok) { setErroBloqueio(d.erro||"Erro ao criar bloqueio."); return; }
    setFormBloqueio({ sala_nome:"", dia_semana:"0", hora_inicio:"", hora_fim:"", descricao:"" });
    await carregarBloqueios();
  }
  async function excluirBloqueio(id) {
    await fetch(`/api/bloqueios/${id}`,{method:"DELETE"});
    await carregarBloqueios();
  }

  // ---- DERIVADOS ----
  const corAtiva = salas.find(s=>s.nome===salaAtiva);
  const reservasHoje = reservas.filter(r=>r.dia===agora.getDate()&&r.mes===agora.getMonth()&&r.ano===agora.getFullYear()).length;

  const reservasDaSalaAtiva = reservas.filter(r=>r.sala_nome===salaAtiva);
  const primeiroDia = new Date(anoAtual, mesAtual, 1);
  const ultimoDiaNum = new Date(anoAtual, mesAtual+1, 0).getDate();
  const offset = primeiroDia.getDay();
  const diasDoMes = Array.from({length:ultimoDiaNum},(_,i)=>i+1);

  const proximas = reservasDaSalaAtiva
    .filter(r=>new Date(r.ano,r.mes,r.dia)>=hoje())
    .sort((a,b)=>new Date(a.ano,a.mes,a.dia)-new Date(b.ano,b.mes,b.dia)||a.hora_inicio.localeCompare(b.hora_inicio));

  const [anoRel,mesRel,diaRel] = dataRelatorio.split("-").map(Number);
  const dataRelFmt = `${String(diaRel).padStart(2,"0")}/${String(mesRel).padStart(2,"0")}/${anoRel}`;
  const reservasDoDia = reservas
    .filter(r=>r.dia===diaRel&&r.mes===mesRel-1&&r.ano===anoRel)
    .filter(r=> {
      if (!buscaRelatorio.trim()) return true;
      const q = buscaRelatorio.toLowerCase();
      return r.nome.toLowerCase().includes(q)||r.evento.toLowerCase().includes(q)||r.sala_nome.toLowerCase().includes(q);
    })
    .sort((a,b)=>a.sala_nome.localeCompare(b.sala_nome)||a.hora_inicio.localeCompare(b.hora_inicio));

  const anoBase = agora.getFullYear();
  const anos = [anoBase-1,anoBase,anoBase+1,anoBase+2];

  const LIMITE_DIAS_EFETIVO = parseInt(config.limite_dias || "60", 10);

  if (carregando) return <div style={{padding:40,fontFamily:"Manrope,sans-serif"}}>Carregando…</div>;

  return (
    <>
      <header>
        <div className="logo-area">
          <div className="logo-frame"><img src="/logo.jpg" alt="Logo Assembleia de Deus Louveira"/></div>
          <div className="logo-text">Assembleia de Deus Louveira<small>Comunicação &amp; Mídia</small></div>
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
            {[
              ["calendario","📅","Calendário"],
              ["reservaInfo","🗒️","Reservas do Dia"],
              ["salas","🏛️","Cadastro de Salas"],
              ["config","⚙️","Configurações"],
            ].map(([id,ico,label])=>(
              <button key={id} className={"nav-btn"+(secao===id?" active":"")} onClick={()=>setSecao(id)}>
                <span className="ico">{ico}</span> {label}
              </button>
            ))}
            <div className="admin-box">
              {adminMode
                ? <div className="admin-pill">🔑 Modo Admin ativo <button onClick={sairAdmin}>Sair</button></div>
                : <button className="btn-ghost-admin" onClick={()=>setModalAdmin(true)}>🔒 Entrar como Admin</button>
              }
            </div>
          </div>
          <div className="versiculo-box">
            <strong>Versículo do Dia</strong>
            <span>{versiculo}</span>
          </div>
        </aside>

        <main className="content">
          <div className="cards">
            <div className="card"><div className="label">Reservas Hoje</div><div className="value">{reservasHoje}</div></div>
            <div className="card"><div className="label">Total de Salas</div><div className="value">{salas.length}</div></div>
            <div className="card"><div className="label">Visualizando</div><div className="value small">{modoGrade?"Todas":salaAtiva||"—"}</div></div>
          </div>

          {/* ===== CALENDÁRIO ===== */}
          {secao==="calendario" && (
            <div className="block">
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:10}}>
                <div>
                  <h3>Calendário de Reservas</h3>
                  <p className="block-sub">Clique em um dia para solicitar a Sala ou a Nave.</p>
                </div>
                <button
                  className={"room-tab"+(modoGrade?" active":"")}
                  style={{"--tab-color":"var(--primary)"}}
                  onClick={()=>setModoGrade(g=>!g)}
                >
                  {modoGrade?"📅 Por sala":"🗂️ Ver todas"}
                </button>
              </div>

              {!modoGrade && (
                <div className="room-tabs">
                  {salas.map(s=>(
                    <button key={s.id} className={"room-tab"+(s.nome===salaAtiva?" active":"")} style={{"--tab-color":s.cor}} onClick={()=>setSalaAtiva(s.nome)}>
                      <span className="dot" style={{background:s.cor}}/> {s.nome}
                    </button>
                  ))}
                </div>
              )}

              <div className="cal-controls">
                <select value={mesAtual} onChange={e=>setMesAtual(parseInt(e.target.value,10))}>
                  {MESES.map((m,i)=><option key={m} value={i}>{m}</option>)}
                </select>
                <select value={anoAtual} onChange={e=>setAnoAtual(parseInt(e.target.value,10))}>
                  {anos.map(a=><option key={a} value={a}>{a}</option>)}
                </select>
              </div>

              {/* Modo grade: uma coluna por sala */}
              {modoGrade ? (
                <div style={{overflowX:"auto"}}>
                  <table style={{width:"100%",borderCollapse:"collapse",minWidth:salas.length*120+80}}>
                    <thead>
                      <tr>
                        <th style={{padding:"8px 6px",fontWeight:800,fontSize:12,color:"var(--ink-soft)",textAlign:"left",width:44}}>Dia</th>
                        {salas.map(s=>(
                          <th key={s.id} style={{padding:"8px 6px",fontSize:12,fontWeight:800,color:s.cor,textAlign:"center",minWidth:120}}>
                            {s.nome}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {diasDoMes.map(dia=>{
                        const dataD = new Date(anoAtual,mesAtual,dia);
                        const ehHoje = dia===agora.getDate()&&mesAtual===agora.getMonth()&&anoAtual===agora.getFullYear();
                        const passado = dataD < hoje();
                        const acimaDolimite = Math.round((dataD-hoje())/86400000) > LIMITE_DIAS_EFETIVO;
                        return (
                          <tr key={dia} style={{borderBottom:"1px solid var(--border)",opacity:passado?0.4:1}}>
                            <td style={{padding:"6px 4px",fontWeight:ehHoje?800:500,color:ehHoje?"var(--primary)":"var(--ink)",fontSize:13}}>
                              {String(dia).padStart(2,"0")}<br/><span style={{fontSize:10,color:"var(--ink-soft)"}}>{DIAS_SEMANA[dataD.getDay()]}</span>
                            </td>
                            {salas.map(s=>{
                              const resv = reservas.filter(r=>r.sala_nome===s.nome&&r.dia===dia&&r.mes===mesAtual&&r.ano===anoAtual)
                                .sort((a,b)=>a.hora_inicio.localeCompare(b.hora_inicio));
                              const bloqDia = bloqueios.filter(b=>b.sala_nome===s.nome&&b.dia_semana===dataD.getDay());
                              return (
                                <td key={s.id} style={{padding:"4px 4px",textAlign:"center",verticalAlign:"top"}}
                                  onClick={()=>!passado&&!acimaDolimite&&(setSalaAtiva(s.nome),abrirModal(dia))}
                                >
                                  {bloqDia.map(b=>(
                                    <div key={b.id} style={{background:"#D6483A",color:"#fff",borderRadius:6,padding:"3px 5px",fontSize:9,fontWeight:700,marginBottom:2,cursor:"default",opacity:0.85}}>
                                      🚫 {b.hora_inicio}-{b.hora_fim}
                                    </div>
                                  ))}
                                  {resv.length>0 ? resv.map(r=>(
                                    <div key={r.id} style={{background:s.cor,color:"#fff",borderRadius:6,padding:"3px 5px",fontSize:10,fontWeight:700,marginBottom:2,cursor:"default"}}>
                                      {r.hora_inicio}-{r.hora_fim}
                                    </div>
                                  )) : (
                                    !passado&&!acimaDolimite&&<div style={{color:"var(--ink-soft)",fontSize:10,cursor:"pointer"}}>+ reservar</div>
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                /* Modo normal: calendário mensal por sala */
                <div className="calendar">
                  {DIAS_SEMANA.map(d=><div key={d} className="weekday">{d}</div>)}
                  {Array.from({length:offset}).map((_,i)=><div key={"v"+i} className="day empty"/>)}
                  {diasDoMes.map(dia=>{
                    const dataD = new Date(anoAtual,mesAtual,dia);
                    const ehHoje = dia===agora.getDate()&&mesAtual===agora.getMonth()&&anoAtual===agora.getFullYear();
                    const acimaDolimite = Math.round((dataD-hoje())/86400000) > LIMITE_DIAS_EFETIVO;
                    const resv = reservas.filter(r=>r.dia===dia&&r.mes===mesAtual&&r.ano===anoAtual&&r.sala_nome===salaAtiva)
                      .sort((a,b)=>a.hora_inicio.localeCompare(b.hora_inicio));
                    const bloqDia = bloqueios.filter(b=>b.sala_nome===salaAtiva&&b.dia_semana===dataD.getDay());
                    return (
                      <div key={dia} className={"day"+(ehHoje?" today":"")+(acimaDolimite?" fora-limite":"")}
                        onClick={()=>!acimaDolimite&&abrirModal(dia)}
                        title={acimaDolimite?`Reservas só até ${LIMITE_DIAS_EFETIVO} dias no futuro`:""}
                      >
                        <div className="day-number">{dia}</div>
                        {bloqDia.map(b=>(
                          <div key={b.id} className="reserva-item" style={{background:"#D6483A",opacity:0.85,fontSize:"9.5px"}}>
                            🚫 {b.hora_inicio}-{b.hora_fim} {b.descricao?`· ${b.descricao}`:""}
                          </div>
                        ))}
                        {resv.map(r=>(
                          <div key={r.id} className="reserva-item" style={{background:corAtiva?corAtiva.cor:"var(--primary)"}}>
                            {r.hora_inicio}-{r.hora_fim} · {r.evento}{r.recorrente?" 🔁":""}
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              )}

              <h3 style={{marginTop:26,fontSize:16}}>Próximas reservas — {salaAtiva||"—"}</h3>
              <ul className="lista-reservas">
                {proximas.length===0&&<div className="empty-state">Nenhuma reserva futura para {salaAtiva}. Calendário livre.</div>}
                {proximas.map(r=>{
                  const dFmt = `${String(r.dia).padStart(2,"0")}/${String(r.mes+1).padStart(2,"0")}/${r.ano}`;
                  return (
                    <li key={r.id}>
                      <div className="res-info">
                        <b>{r.evento}{r.recorrente?" 🔁":""}</b>
                        <span>{dFmt} · {r.hora_inicio} às {r.hora_fim} · {r.nome}</span>
                        {r.observacao&&<span style={{fontStyle:"italic",color:"var(--ink-soft)"}}>📝 {r.observacao}</span>}
                      </div>
                      <div className="res-actions"><button onClick={()=>excluirReserva(r)}>Excluir</button></div>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {/* ===== RESERVAS DO DIA ===== */}
          {secao==="reservaInfo"&&(
            <div className="block">
              <div className="reservas-dia-head">
                <div>
                  <h3>Reservas do Dia</h3>
                  <p className="block-sub">Todas as salas juntas — útil para imprimir e deixar na secretaria.</p>
                </div>
                <button className="btn-primary no-print" style={{gridColumn:"auto",width:"auto"}} onClick={()=>window.print()}>🖨️ Imprimir</button>
              </div>

              <div style={{display:"flex",gap:12,flexWrap:"wrap",margin:"16px 0",alignItems:"flex-end"}} className="no-print">
                <div className="form-field" style={{maxWidth:200,margin:0}}>
                  <label>Data</label>
                  <input type="date" value={dataRelatorio} onChange={e=>setDataRelatorio(e.target.value)}/>
                </div>
                <div className="form-field" style={{flex:1,minWidth:180,margin:0}}>
                  <label>Buscar (nome, evento ou sala)</label>
                  <input type="text" placeholder="Ex: João, Coral, Nave…" value={buscaRelatorio} onChange={e=>setBuscaRelatorio(e.target.value)}/>
                </div>
              </div>

              <div className="print-area">
                <h2 className="print-only-title">Reservas — {dataRelFmt}</h2>
                <table className="tabela-reservas-dia">
                  <thead>
                    <tr><th>Sala / Nave</th><th>Horário</th><th>Evento</th><th>Solicitante</th></tr>
                  </thead>
                  <tbody>
                    {reservasDoDia.length===0&&(
                      <tr><td colSpan={4} style={{textAlign:"center",color:"var(--ink-soft)"}}>
                        {buscaRelatorio?"Nenhum resultado para a busca.":"Nenhuma reserva para "+dataRelFmt+"."}
                      </td></tr>
                    )}
                    {reservasDoDia.map(r=>(
                      <tr key={r.id}>
                        <td><span className="sala-tag" style={{background:salas.find(s=>s.nome===r.sala_nome)?.cor||"#999",color:"#fff"}}>{r.sala_nome}</span></td>
                        <td>{r.hora_inicio} – {r.hora_fim}</td>
                        <td>{r.evento}{r.recorrente?" 🔁":""}{r.observacao&&<><br/><small style={{color:"var(--ink-soft)"}}>📝 {r.observacao}</small></>}</td>
                        <td>{r.nome}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ===== CADASTRO DE SALAS ===== */}
          {secao==="salas"&&(
            <div className="block">
              <h3>Cadastro de Salas e Nave</h3>
              <p className="block-sub">Área restrita — apenas administradores.</p>

              {adminMode ? (
                <>
                  <form className="form-grid" style={{marginTop:18}} onSubmit={cadastrarSala}>
                    {erroSala&&<div className="form-error" style={{display:"block"}}>{erroSala}</div>}
                    <div className="form-field"><label>Nome</label>
                      <input type="text" required placeholder="Ex: Sala 3" value={formSala.nome} onChange={e=>setFormSala(f=>({...f,nome:e.target.value}))}/>
                    </div>
                    <div className="form-field"><label>Tipo</label>
                      <select value={formSala.tipo} onChange={e=>setFormSala(f=>({...f,tipo:e.target.value}))}>
                        <option value="Sala">Sala</option>
                        <option value="Nave">Nave</option>
                      </select>
                    </div>
                    <button className="btn-primary">Cadastrar Ambiente</button>
                  </form>

                  <div className="sala-chip-list">
                    {salas.map(s=>(
                      <div className="sala-chip" key={s.id}>
                        <span className="swatch" style={{background:s.cor}}/>
                        <div className="info"><b>{s.nome}</b><span>{s.tipo}</span></div>
                        <button className="btn-danger" style={{padding:"8px 12px",fontSize:12}} onClick={()=>excluirSala(s)}>Excluir</button>
                      </div>
                    ))}
                  </div>

                  {/* Bloqueios fixos */}
                  <h3 style={{marginTop:32,fontSize:17}}>🚫 Horários Bloqueados Fixos</h3>
                  <p className="block-sub">Cultos e eventos regulares que nunca podem ser reservados por cima.</p>

                  <form className="form-grid" style={{marginTop:14}} onSubmit={cadastrarBloqueio}>
                    {erroBloqueio&&<div className="form-error" style={{display:"block"}}>{erroBloqueio}</div>}
                    <div className="form-field"><label>Sala / Nave</label>
                      <select value={formBloqueio.sala_nome} onChange={e=>setFormBloqueio(f=>({...f,sala_nome:e.target.value}))}>
                        <option value="">Selecione…</option>
                        {salas.map(s=><option key={s.id} value={s.nome}>{s.nome}</option>)}
                      </select>
                    </div>
                    <div className="form-field"><label>Dia da semana</label>
                      <select value={formBloqueio.dia_semana} onChange={e=>setFormBloqueio(f=>({...f,dia_semana:e.target.value}))}>
                        {DIAS_SEMANA_FULL.map((d,i)=><option key={i} value={i}>{d}</option>)}
                      </select>
                    </div>
                    <div className="form-field"><label>Início</label>
                      <input type="time" value={formBloqueio.hora_inicio} onChange={e=>setFormBloqueio(f=>({...f,hora_inicio:e.target.value}))}/>
                    </div>
                    <div className="form-field"><label>Término</label>
                      <input type="time" value={formBloqueio.hora_fim} onChange={e=>setFormBloqueio(f=>({...f,hora_fim:e.target.value}))}/>
                    </div>
                    <div className="form-field full"><label>Descrição (ex: Culto dominical)</label>
                      <input type="text" placeholder="Ex: Culto de domingo manhã" value={formBloqueio.descricao} onChange={e=>setFormBloqueio(f=>({...f,descricao:e.target.value}))}/>
                    </div>
                    <button className="btn-primary">Adicionar Bloqueio</button>
                  </form>

                  <div className="sala-chip-list" style={{marginTop:16}}>
                    {bloqueios.length===0&&<div className="empty-state">Nenhum horário bloqueado cadastrado.</div>}
                    {bloqueios.map(b=>(
                      <div className="sala-chip" key={b.id}>
                        <span className="swatch" style={{background:"#D6483A"}}/>
                        <div className="info">
                          <b>{b.sala_nome} · {DIAS_SEMANA_FULL[b.dia_semana]} {b.hora_inicio}-{b.hora_fim}</b>
                          <span>{b.descricao||"Sem descrição"}</span>
                        </div>
                        <button className="btn-danger" style={{padding:"8px 12px",fontSize:12}} onClick={()=>excluirBloqueio(b.id)}>Remover</button>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="locked-box">
                  <span className="ico">🔒</span>
                  <h4>Acesso restrito</h4>
                  <p>Entre como administrador para gerenciar salas e bloqueios.</p>
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      <footer className="app-footer">Assembleia de Deus Louveira · Sistema de Reserva de Ambientes</footer>

          {/* ===== CONFIGURAÇÕES ===== */}
          {secao==="config"&&(
            <div className="block">
              <h3>⚙️ Configurações</h3>
              <p className="block-sub">Ajuste as configurações do sistema. Apenas administradores podem salvar.</p>

              {!adminMode && (
                <div className="locked-box">
                  <span className="ico">🔒</span>
                  <h4>Acesso restrito</h4>
                  <p>Entre como administrador para alterar as configurações.</p>
                </div>
              )}

              {adminMode && (
                <form className="form-grid" style={{marginTop:20}} onSubmit={async e=>{
                  e.preventDefault();
                  setSalvandoConfig(true);
                  setSucessoConfig(false);
                  try {
                    const res = await fetch("/api/config",{
                      method:"POST",
                      headers:{"Content-Type":"application/json"},
                      body: JSON.stringify(config),
                    });
                    if (res.ok) { setSucessoConfig(true); setTimeout(()=>setSucessoConfig(false),3000); }
                  } finally { setSalvandoConfig(false); }
                }}>

                  {sucessoConfig&&(
                    <div style={{gridColumn:"1/-1",background:"#E6F4F1",color:"#075F5C",borderRadius:10,padding:"10px 14px",fontWeight:700,fontSize:13}}>
                      ✅ Configurações salvas com sucesso!
                    </div>
                  )}

                  <h4 style={{gridColumn:"1/-1",margin:"4px 0 0",fontFamily:"Fraunces,serif",color:"var(--primary-dark)"}}>📧 E-mail</h4>

                  <div className="form-field full">
                    <label>Remetente (EMAIL_FROM)</label>
                    <input type="email" placeholder="onboarding@resend.dev"
                      value={config.email_from||""}
                      onChange={e=>setConfig(c=>({...c,email_from:e.target.value}))}/>
                    <small style={{color:"var(--ink-soft)",fontSize:11}}>No plano gratuito do Resend use onboarding@resend.dev. Com domínio próprio verificado, use qualquer endereço.</small>
                  </div>

                  <div className="form-field full">
                    <label>Destinatários (EMAIL_ADMIN)</label>
                    <input type="text" placeholder="admin@igreja.com, secretaria@gmail.com"
                      value={config.email_admin||""}
                      onChange={e=>setConfig(c=>({...c,email_admin:e.target.value}))}/>
                    <small style={{color:"var(--ink-soft)",fontSize:11}}>Separe múltiplos e-mails por vírgula.</small>
                  </div>

                  <div className="form-field full">
                    <label>Mensagem personalizada no e-mail de aviso</label>
                    <input type="text" placeholder="Ex: Para dúvidas, fale com a secretaria pelo WhatsApp."
                      value={config.email_mensagem||""}
                      onChange={e=>setConfig(c=>({...c,email_mensagem:e.target.value}))}/>
                    <small style={{color:"var(--ink-soft)",fontSize:11}}>Aparece no rodapé do e-mail enviado aos administradores.</small>
                  </div>

                  <h4 style={{gridColumn:"1/-1",margin:"8px 0 0",fontFamily:"Fraunces,serif",color:"var(--primary-dark)"}}>⏱️ Reservas</h4>

                  <div className="form-field">
                    <label>Limite de antecedência (dias)</label>
                    <input type="number" min="1" max="365" placeholder="60"
                      value={config.limite_dias||"60"}
                      onChange={e=>setConfig(c=>({...c,limite_dias:e.target.value}))}/>
                    <small style={{color:"var(--ink-soft)",fontSize:11}}>Máximo de dias no futuro que alguém pode reservar.</small>
                  </div>

                  <button className="btn-primary" disabled={salvandoConfig}>
                    {salvandoConfig?"Salvando…":"💾 Salvar Configurações"}
                  </button>
                </form>
              )}
            </div>
          )}

          {/* ===== MODAL RESERVA ===== */}
      <div className={"overlay"+(modalAberto?" show":"")}>
        <div className="modal">
          {!sucessoReserva ? (
            <>
              <div className="modal-head">
                <h3>Nova Solicitação</h3>
                <button onClick={fecharModal}>✕</button>
              </div>
              {diaSelecionado&&(
                <span className="date-badge">
                  {String(diaSelecionado).padStart(2,"0")}/{String(mesAtual+1).padStart(2,"0")}/{anoAtual}
                </span>
              )}
              <form className="form-grid" onSubmit={enviarReserva}>
                {erroReserva&&<div className="form-error" style={{display:"block"}}>{erroReserva}</div>}

                <div className="form-field full"><label>Solicitante *</label>
                  <input type="text" required placeholder="Seu nome completo" value={form.nome} onChange={e=>setForm(f=>({...f,nome:e.target.value}))}/>
                </div>
                <div className="form-field"><label>Data</label>
                  <input type="text" disabled value={`${String(diaSelecionado).padStart(2,"0")}/${String(mesAtual+1).padStart(2,"0")}/${anoAtual}`}/>
                </div>
                <div className="form-field"><label>Sala / Nave *</label>
                  <select value={form.sala} onChange={e=>setForm(f=>({...f,sala:e.target.value}))}>
                    {salas.map(s=><option key={s.id} value={s.nome}>{s.nome} ({s.tipo})</option>)}
                  </select>
                </div>
                <div className="form-field full"><label>Evento *</label>
                  <input type="text" required placeholder="Ex: Ensaio do coral" value={form.evento} onChange={e=>setForm(f=>({...f,evento:e.target.value}))}/>
                </div>
                <div className="form-field"><label>Início *</label>
                  <input type="time" required value={form.horaInicio} onChange={e=>setForm(f=>({...f,horaInicio:e.target.value}))}/>
                </div>
                <div className="form-field"><label>Término *</label>
                  <input type="time" required value={form.horaFim} onChange={e=>setForm(f=>({...f,horaFim:e.target.value}))}/>
                </div>
                <div className="form-field full"><label>Observação (opcional)</label>
                  <input type="text" placeholder="Ex: Precisamos de 30 cadeiras" value={form.observacao} onChange={e=>setForm(f=>({...f,observacao:e.target.value}))}/>
                </div>
                <div className="form-field"><label>Recorrência</label>
                  <select value={form.recorrencia} onChange={e=>setForm(f=>({...f,recorrencia:e.target.value}))}>
                    <option value="nenhuma">Sem recorrência</option>
                    <option value="semanal">Semanal</option>
                    <option value="quinzenal">Quinzenal</option>
                    <option value="mensal">Mensal</option>
                  </select>
                </div>
                {form.recorrencia!=="nenhuma"&&(
                  <div className="form-field"><label>Repetir até *</label>
                    <input type="date"
                      min={toDateInput(new Date(anoAtual,mesAtual,diaSelecionado||1))}
                      max={toDateInput(new Date(agora.getFullYear()+2,11,31))}
                      value={form.recorrenciaFim}
                      onChange={e=>setForm(f=>({...f,recorrenciaFim:e.target.value}))}
                    />
                  </div>
                )}
                <button className="btn-primary" disabled={enviando}>{enviando?"Enviando…":"Enviar Solicitação"}</button>
              </form>
            </>
          ) : (
            /* Tela de confirmação de sucesso */
            <div style={{textAlign:"center",padding:"10px 0 4px"}}>
              <div style={{fontSize:48,marginBottom:12}}>✅</div>
              <h3 style={{color:"var(--primary-dark)",marginBottom:6}}>Reserva confirmada!</h3>
              {sucessoReserva.totalCriadas>1 && (
                <p style={{color:"var(--primary)",fontWeight:700,fontSize:14,margin:"0 0 8px"}}>
                  🔁 {sucessoReserva.totalCriadas} datas criadas ({sucessoReserva.recorrencia})
                </p>
              )}
              <div style={{background:"var(--surface-soft)",borderRadius:12,padding:"14px 16px",margin:"12px 0",textAlign:"left",fontSize:13.5,lineHeight:1.7}}>
                <b>Sala:</b> {sucessoReserva.sala_nome}<br/>
                <b>Evento:</b> {sucessoReserva.evento}<br/>
                <b>Horário:</b> {sucessoReserva.hora_inicio} – {sucessoReserva.hora_fim}<br/>
                <b>Solicitante:</b> {sucessoReserva.nomeSolicitante}<br/>
                {sucessoReserva.observacao&&<><b>Obs:</b> {sucessoReserva.observacao}<br/></>}
              </div>
              <p style={{fontSize:12,color:"var(--ink-soft)"}}>Guarde essas informações — você precisará do nome para excluir a reserva se necessário.</p>
              <button className="btn-primary" style={{marginTop:10}} onClick={fecharModal}>Fechar</button>
            </div>
          )}
        </div>
      </div>

      {/* ===== MODAL ADMIN ===== */}
      <div className={"overlay"+(modalAdmin?" show":"")}>
        <div className="modal" style={{maxWidth:380}}>
          <div className="modal-head"><h3>Acesso Admin</h3><button onClick={()=>setModalAdmin(false)}>✕</button></div>
          <form className="form-grid" style={{marginTop:10}} onSubmit={loginAdmin}>
            {erroAdmin&&<div className="form-error" style={{display:"block"}}>{erroAdmin}</div>}
            <div className="form-field full"><label>Senha de administrador</label>
              <input type="password" required value={senhaAdmin} onChange={e=>setSenhaAdmin(e.target.value)}/>
            </div>
            <button className="btn-primary">Entrar</button>
          </form>
        </div>
      </div>
    </>
  );
}
