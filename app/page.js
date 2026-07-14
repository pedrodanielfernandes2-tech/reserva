"use client";
import { useEffect, useState, useCallback, useRef } from "react";

const MESES=["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
const DIAS_SEMANA=["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"];
const DIAS_SEMANA_FULL=["Domingo","Segunda","Terça","Quarta","Quinta","Sexta","Sábado"];
const VERSICULOS=["O Senhor é o meu pastor; nada me faltará. (Salmos 23:1)","Tudo posso naquele que me fortalece. (Filipenses 4:13)","Entrega o teu caminho ao Senhor; confia nele. (Salmos 37:5)","Porque Deus amou o mundo de tal maneira… (João 3:16)","O Senhor é bom, uma fortaleza no dia da angústia. (Naum 1:7)"];

function hoje(){ const d=new Date(); d.setHours(0,0,0,0); return d; }
function toDateInput(d){ return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; }
function pad(n){ return String(n).padStart(2,"0"); }

const FORM_VAZIO={ nome:"",sala:"",evento:"",observacao:"",horaInicio:"",horaFim:"",recorrencia:"nenhuma",recorrenciaFim:"",precisaSom:false,precisaProjecao:false,precisaFotografia:false,precisaTransmissao:false,qtdMesas:0,qtdCadeiras:0 };

export default function Page(){
  const agora=new Date();

  const [secao,setSecao]=useState("calendario");
  const [secaoConfig,setSecaoConfig]=useState("email");
  const [artesAberto,setArtesAberto]=useState(false);
  const [secaoArtes,setSecaoArtes]=useState(null);
  const [artesUser,setArtesUser]=useState(null);
  const iframeRef = useRef(null);

  const [salas,setSalas]=useState([]);
  const [reservas,setReservas]=useState([]);
  const [bloqueios,setBloqueios]=useState([]);
  const [eventosIgreja,setEventosIgreja]=useState([]);
  const [contatos,setContatos]=useState([]);

  const [mesAtual,setMesAtual]=useState(agora.getMonth());
  const [anoAtual,setAnoAtual]=useState(agora.getFullYear());
  const [salaAtiva,setSalaAtiva]=useState(null);
  const [modoGrade,setModoGrade]=useState(false);

  const [adminMode,setAdminMode]=useState(false);
  const [versiculo,setVersiculo]=useState("");
  const [carregando,setCarregando]=useState(true);

  const [modalAberto,setModalAberto]=useState(false);
  const [diaSelecionado,setDiaSelecionado]=useState(null);
  const [form,setForm]=useState(FORM_VAZIO);
  const [erroReserva,setErroReserva]=useState("");
  const [enviando,setEnviando]=useState(false);
  const [sucessoReserva,setSucessoReserva]=useState(null);

  const [modalAdmin,setModalAdmin]=useState(false);
  const [senhaAdmin,setSenhaAdmin]=useState("");
  const [erroAdmin,setErroAdmin]=useState("");
  const [modalExcluir,setModalExcluir]=useState(null); // reserva a excluir

  const [formSala,setFormSala]=useState({nome:"",tipo:"Sala",capacidade:0});
  const [erroSala,setErroSala]=useState("");

  const [formBloqueio,setFormBloqueio]=useState({sala_nome:"",dia_semana:"0",hora_inicio:"",hora_fim:"",descricao:""});
  const [erroBloqueio,setErroBloqueio]=useState("");

  const [config,setConfig]=useState({email_admin:"",limite_dias:"60",email_mensagem:"",antecedencia_horas:"0"});
  const [salvandoConfig,setSalvandoConfig]=useState(false);
  const [sucessoConfig,setSucessoConfig]=useState(false);

  // ✅ MUDANÇA 1: adicionado celular:""
  const [formContato,setFormContato]=useState({nome:"",email:"",celular:"",recebe_todas:true,recebe_som:false,recebe_projecao:false,recebe_fotografia:false,recebe_mesa_cadeira:false});
  const [erroContato,setErroContato]=useState("");

  const [dataRelatorio,setDataRelatorio]=useState(toDateInput(agora));
  const [buscaRelatorio,setBuscaRelatorio]=useState("");

  const [pdfImportando,setPdfImportando]=useState(false);
  const [pdfErro,setPdfErro]=useState("");
  const [eventosPreview,setEventosPreview]=useState(null);
  const [salvandoEventos,setSalvandoEventos]=useState(false);

  const carregarSalas=useCallback(async()=>{try{const r=await fetch("/api/salas");const d=await r.json();setSalas(Array.isArray(d)?d:[]);setSalaAtiva(p=>p||(Array.isArray(d)&&d[0]?d[0].nome:null));}catch(e){}});
  const carregarReservas=useCallback(async()=>{try{const r=await fetch("/api/reservas");const d=await r.json();setReservas(Array.isArray(d)?d:[]);}catch(e){}});
  const carregarBloqueios=useCallback(async()=>{try{const r=await fetch("/api/bloqueios");const d=await r.json();setBloqueios(Array.isArray(d)?d:[]);}catch(e){}});
  const carregarEventos=useCallback(async()=>{try{const r=await fetch("/api/eventos-igreja");const d=await r.json();setEventosIgreja(Array.isArray(d)?d:[]);}catch(e){}});
  const carregarContatos=useCallback(async()=>{try{const r=await fetch("/api/contatos");const d=await r.json();setContatos(Array.isArray(d)?d:[]);}catch(e){}});
  const carregarConfig=useCallback(async()=>{try{const r=await fetch("/api/config");const d=await r.json();if(d&&typeof d==="object")setConfig(prev=>({...prev,...d}));}catch(e){}});

  useEffect(()=>{
    function onMsg(e){
      if(!e.data||!e.data.type) return;
      if(e.data.type==="adl_login") setArtesUser({nome:e.data.nome,isAdmin:Boolean(e.data.isAdmin)});
      if(e.data.type==="adl_logout") setArtesUser(null);
    }
    window.addEventListener("message",onMsg);
    return ()=>window.removeEventListener("message",onMsg);
  },[]);

  function irParaArtes(tab){
    setArtesAberto(true);
    setSecaoArtes(tab);
    setSecao(null);
    setTimeout(()=>{
      if(iframeRef.current?.contentWindow){
        iframeRef.current.contentWindow.postMessage({type:"adl_goto",tab},"/");
      }
    },300);
  }

  useEffect(()=>{
    setVersiculo(VERSICULOS[Math.floor(Math.random()*VERSICULOS.length)]);
    (async()=>{
      try{await Promise.all([carregarSalas(),carregarReservas(),carregarBloqueios(),carregarEventos(),carregarContatos(),carregarConfig()]);
        const s=await(await fetch("/api/admin/status")).json();setAdminMode(Boolean(s.admin));
      }catch(e){}finally{setCarregando(false);}
    })();
  },[]); // eslint-disable-line
  useEffect(()=>{const t=setInterval(carregarReservas,15000);return()=>clearInterval(t);},[]);

  const LIMITE=parseInt(config.limite_dias||"60",10);
  const ANTECEDENCIA_H=parseInt(config.antecedencia_horas||"0",10);

  function abrirModal(dia){
    const d=new Date(anoAtual,mesAtual,dia);
    if(Math.round((d-hoje())/86400000)>LIMITE){alert(`Só é possível reservar com até ${LIMITE} dias de antecedência.`);return;}
    if(ANTECEDENCIA_H>0){
      const diffH=(d-new Date())/3600000;
      if(diffH<ANTECEDENCIA_H){
        alert(`Reserva não permitida\n\nAs reservas devem ser realizadas com, no mínimo, ${ANTECEDENCIA_H} hora${ANTECEDENCIA_H>1?"s":""} de antecedência em relação à data desejada.`);
        return;
      }
    }
    setDiaSelecionado(dia);setErroReserva("");setSucessoReserva(null);
    setForm({...FORM_VAZIO,sala:salaAtiva||(salas[0]?.nome||"")});
    setModalAberto(true);
  }
  function fecharModal(){setModalAberto(false);setSucessoReserva(null);}

  async function enviarReserva(e){
    e.preventDefault();setErroReserva("");
    const{nome,sala,evento,observacao,horaInicio,horaFim,recorrencia,recorrenciaFim,precisaSom,precisaProjecao,precisaFotografia,precisaTransmissao,qtdMesas,qtdCadeiras}=form;
    const tipoEvento=sala.toLowerCase().includes("evento externo")?"evento_externo":"regular";
    if(!nome.trim()||!sala||!evento.trim()||!horaInicio||!horaFim){setErroReserva("Preencha todos os campos obrigatórios.");return;}
    if(horaFim<=horaInicio){setErroReserva("O término precisa ser depois do início.");return;}
    if(recorrencia!=="nenhuma"&&!recorrenciaFim){setErroReserva("Informe a data final da recorrência.");return;}
    setEnviando(true);
    try{
      const res=await fetch("/api/reservas",{method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({nome:nome.trim(),sala,evento:evento.trim(),observacao:observacao.trim(),dia:diaSelecionado,mes:mesAtual,ano:anoAtual,horaInicio,horaFim,recorrencia,recorrenciaFim,tipoEvento,precisaSom,precisaProjecao,precisaFotografia,precisaTransmissao,qtdMesas:parseInt(qtdMesas)||0,qtdCadeiras:parseInt(qtdCadeiras)||0})});
      const data=await res.json();
      if(!res.ok){setErroReserva(data.erro||"Não foi possível concluir a reserva.");return;}
      await carregarReservas();setSucessoReserva({...data,nomeSolicitante:nome.trim()});
    }finally{setEnviando(false);}
  }

  function pedirExclusao(r){ if(adminMode){ setModalExcluir(r); } else { excluirReserva(r,false); } }

  async function excluirReserva(r,semConfirmar=false){
    let nomeConf=null;
    if(!semConfirmar&&!adminMode){
      nomeConf=prompt(`Confirme o nome do solicitante (${r.nome}):`);
      if(nomeConf===null)return;
    }
    const res=await fetch(`/api/reservas/${r.id}`,{method:"DELETE",headers:{"Content-Type":"application/json"},body:JSON.stringify({nome:nomeConf||""})});
    if(!res.ok){const d=await res.json().catch(()=>({}));alert(d.erro||"Não foi possível excluir.");return;}
    setModalExcluir(null);
    await carregarReservas();
  }

  async function loginAdmin(e){e.preventDefault();setErroAdmin("");
    const res=await fetch("/api/admin/login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({senha:senhaAdmin})});
    if(!res.ok){setErroAdmin("Senha incorreta.");return;}
    setAdminMode(true);setModalAdmin(false);setSenhaAdmin("");
  }
  async function sairAdmin(){await fetch("/api/admin/logout",{method:"POST"});setAdminMode(false);}

  async function cadastrarSala(){setErroSala("");if(!formSala.nome.trim()){setErroSala("Informe um nome.");return;}
    const res=await fetch("/api/salas",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(formSala)});
    const d=await res.json();if(!res.ok){setErroSala(d.erro||"Erro.");return;}
    setFormSala({nome:"",tipo:"Sala",capacidade:0});await carregarSalas();
  }
  async function excluirSala(s){if(!confirm("Excluir esta sala?"))return;await fetch(`/api/salas/${s.id}`,{method:"DELETE"});if(s.nome===salaAtiva)setSalaAtiva(salas.filter(x=>x.id!==s.id)[0]?.nome||null);await carregarSalas();}

  async function cadastrarBloqueio(){setErroBloqueio("");if(!formBloqueio.sala_nome||!formBloqueio.hora_inicio||!formBloqueio.hora_fim){setErroBloqueio("Preencha todos os campos.");return;}
    const res=await fetch("/api/bloqueios",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(formBloqueio)});
    const d=await res.json();if(!res.ok){setErroBloqueio(d.erro||"Erro.");return;}
    setFormBloqueio({sala_nome:"",dia_semana:"0",hora_inicio:"",hora_fim:"",descricao:""});await carregarBloqueios();
  }
  async function excluirBloqueio(id){await fetch(`/api/bloqueios/${id}`,{method:"DELETE"});await carregarBloqueios();}

  async function excluirEventoIgreja(id){await fetch(`/api/eventos-igreja/${id}`,{method:"DELETE"});await carregarEventos();}

  async function importarPDF(e){
    const file=e.target.files?.[0];if(!file)return;
    setPdfErro("");setPdfImportando(true);setEventosPreview(null);
    try{
      const b64=await new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(r.result.split(",")[1]);r.onerror=rej;r.readAsDataURL(file);});
      const resp=await fetch("/api/eventos-igreja/importar",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({pdfBase64:b64,ano:anoAtual})});
      const data=await resp.json();
      if(!resp.ok){setPdfErro(data.erro||"Erro ao processar PDF.");return;}
      setEventosPreview(data.eventos);
    }catch(err){setPdfErro("Erro ao ler o arquivo: "+err.message);}
    finally{setPdfImportando(false);e.target.value="";}
  }
  async function confirmarImportacao(){if(!eventosPreview?.length)return;setSalvandoEventos(true);
    try{const r=await fetch("/api/eventos-igreja",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(eventosPreview)});if(r.ok){setEventosPreview(null);await carregarEventos();}}
    finally{setSalvandoEventos(false);}
  }

  // ✅ MUDANÇA 2: reset inclui celular:""
  async function cadastrarContato(){setErroContato("");
    if(!formContato.nome.trim()||!formContato.email.trim()){setErroContato("Nome e e-mail são obrigatórios.");return;}
    const res=await fetch("/api/contatos",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(formContato)});
    const d=await res.json();if(!res.ok){setErroContato(d.erro||"Erro.");return;}
    setFormContato({nome:"",email:"",celular:"",recebe_todas:true,recebe_som:false,recebe_projecao:false,recebe_fotografia:false,recebe_mesa_cadeira:false});
    await carregarContatos();
  }
  async function excluirContato(id){await fetch(`/api/contatos/${id}`,{method:"DELETE"});await carregarContatos();}

  async function salvarConfig(){setSalvandoConfig(true);setSucessoConfig(false);
    try{const r=await fetch("/api/config",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(config)});if(r.ok){setSucessoConfig(true);setTimeout(()=>setSucessoConfig(false),3000);}}
    finally{setSalvandoConfig(false);}
  }

  const corAtiva=salas.find(s=>s.nome===salaAtiva);
  const isEventoExterno=form.sala.toLowerCase().includes("evento externo");
  const proximas=reservas.filter(r=>r.sala_nome===salaAtiva&&new Date(r.ano,r.mes,r.dia)>=hoje())
    .sort((a,b)=>new Date(a.ano,a.mes,a.dia)-new Date(b.ano,b.mes,b.dia)||a.hora_inicio.localeCompare(b.hora_inicio));
  const primeiroDia=new Date(anoAtual,mesAtual,1);
  const ultimoDiaNum=new Date(anoAtual,mesAtual+1,0).getDate();
  const offset=primeiroDia.getDay();
  const diasDoMes=Array.from({length:ultimoDiaNum},(_,i)=>i+1);
  const anos=[agora.getFullYear()-1,agora.getFullYear(),agora.getFullYear()+1,agora.getFullYear()+2];
  const [anoRel,mesRel,diaRel]=dataRelatorio.split("-").map(Number);
  const dataRelFmt=`${pad(diaRel)}/${pad(mesRel)}/${anoRel}`;
  const reservasDoDia=reservas
    .filter(r=>r.dia===diaRel&&r.mes===mesRel-1&&r.ano===anoRel)
    .filter(r=>!buscaRelatorio.trim()||[r.nome,r.evento,r.sala_nome].some(x=>x.toLowerCase().includes(buscaRelatorio.toLowerCase())))
    .sort((a,b)=>a.sala_nome.localeCompare(b.sala_nome)||a.hora_inicio.localeCompare(b.hora_inicio));
  const salaTipo=salas.find(s=>s.nome===form.sala)?.tipo;
  function getEvDia(dia,mes,ano){return eventosIgreja.filter(e=>e.dia===dia&&e.mes===mes&&e.ano===ano);}

  function Lixeira({onClick}){return<button type="button" onClick={onClick} title="Excluir" style={{background:"none",border:"none",cursor:"pointer",padding:"2px 4px",color:"#D6483A",fontSize:14,lineHeight:1,flexShrink:0}}>🗑️</button>;}
  function Badge({c,label}){return c?<span style={{fontSize:11,background:"#E8F6F5",color:"#075F5C",padding:"2px 6px",borderRadius:6,fontWeight:700}}>{label}</span>:null;}

  function HistoricoLista(){
    const [logs,setLogs]=useState([]);
    const [carregando,setCarregando]=useState(true);
    useEffect(()=>{
      fetch("/api/audit-log").then(r=>r.json()).then(d=>{setLogs(Array.isArray(d)?d:[]);setCarregando(false);}).catch(()=>setCarregando(false));
    },[]);
    if(carregando)return<div style={{padding:20,color:"var(--ink-soft)"}}>Carregando histórico…</div>;
    if(!logs.length)return<div className="empty-state">Nenhuma alteração registrada ainda.</div>;
    return(
      <div style={{maxHeight:400,overflowY:"auto",border:"1px solid var(--border)",borderRadius:12}}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
          <thead style={{position:"sticky",top:0,background:"var(--surface-soft)"}}>
            <tr>
              <th style={{padding:"8px 10px",textAlign:"left"}}>Ação</th>
              <th style={{padding:"8px 10px",textAlign:"left"}}>Reserva</th>
              <th style={{padding:"8px 10px",textAlign:"left"}}>Data/Hora</th>
              <th style={{padding:"8px 10px",textAlign:"left"}}>Executado por</th>
              <th style={{padding:"8px 10px",textAlign:"left"}}>Quando</th>
            </tr>
          </thead>
          <tbody>
            {logs.map(l=>{
              const dataRes=`${pad(l.dia)}/${pad(l.mes+1)}/${l.ano}`;
              const quando=new Date(l.executado_em).toLocaleString("pt-BR",{day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit"});
              return(
                <tr key={l.id} style={{borderTop:"1px solid var(--border)"}}>
                  <td style={{padding:"8px 10px"}}><span style={{background:"#FCE9E6",color:"#D6483A",borderRadius:6,padding:"2px 8px",fontWeight:700,fontSize:12}}>🗑️ Excluída</span></td>
                  <td style={{padding:"8px 10px"}}>
                    <div style={{fontWeight:700}}>{l.evento}</div>
                    <div style={{fontSize:11,color:"var(--ink-soft)"}}>{l.sala_nome} · {l.hora_inicio}–{l.hora_fim} · {l.nome_solicitante}</div>
                  </td>
                  <td style={{padding:"8px 10px",fontSize:12}}>{dataRes}</td>
                  <td style={{padding:"8px 10px",fontSize:12}}>{l.executado_por}</td>
                  <td style={{padding:"8px 10px",fontSize:11,color:"var(--ink-soft)"}}>{quando}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  }

  if(carregando)return<div style={{padding:40,fontFamily:"Manrope,sans-serif"}}>Carregando…</div>;

  return(
    <>
      <header>
        <div className="logo-area">
          <div className="logo-frame"><img src="/logo.jpg" alt="Logo"/></div>
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
            <button className={"nav-btn"+(artesAberto?" active":"")} onClick={()=>{ setArtesAberto(a=>!a); if(!artesAberto){ irParaArtes("formulario"); } }}>
              <span className="ico">🎨</span> Solicitação de Artes
              <span style={{marginLeft:"auto",fontSize:10,opacity:.65}}>{artesAberto?"▲":"▼"}</span>
            </button>
            {artesAberto&&(
              <div style={{paddingLeft:14,display:"flex",flexDirection:"column",gap:2,marginTop:2}}>
                {[["formulario","📝","Nova Solicitação"],["historico","📋","Histórico"]].map(([id,ico,label])=>(
                  <button key={id} style={{background:secaoArtes===id?"var(--surface-soft)":"none",border:"none",textAlign:"left",padding:"8px 10px",borderRadius:8,fontWeight:secaoArtes===id?700:500,fontSize:13,cursor:"pointer",color:"var(--ink)",display:"flex",alignItems:"center",gap:7}} onClick={()=>irParaArtes(id)}>
                    <span>{ico}</span> {label}
                  </button>
                ))}
                {!artesUser?(
                  <button style={{background:"none",border:"none",textAlign:"left",padding:"8px 10px",borderRadius:8,fontWeight:500,fontSize:13,cursor:"pointer",color:"var(--ink)",display:"flex",alignItems:"center",gap:7}}
                    onClick={()=>{setArtesAberto(true);setSecao(null);setTimeout(()=>{if(iframeRef.current?.contentWindow){iframeRef.current.contentWindow.postMessage({type:"adl_open_login"},"*");}},600);}}>
                    <span>👤</span> Acesso à Equipe
                  </button>
                ):(
                  <>
                    <div style={{fontSize:11,color:"var(--primary-dark)",padding:"6px 10px 2px",fontWeight:800,letterSpacing:".4px",background:"var(--surface-soft)",borderRadius:8,margin:"2px 0"}}>
                      👋 {artesUser.nome.split(" ")[0]}
                    </div>
                    {[["g-solic","📋","Solicitações"],["g-audit","🕓","Auditoria"],["g-users","👥","Usuários"],["g-email","⚙️","Configuração"]].map(([id,ico,label])=>(
                      <button key={id} style={{background:secaoArtes===id?"var(--surface-soft)":"none",border:"none",textAlign:"left",padding:"8px 10px",borderRadius:8,fontWeight:secaoArtes===id?700:500,fontSize:13,cursor:"pointer",color:"var(--ink)",display:"flex",alignItems:"center",gap:7}} onClick={()=>irParaArtes(id)}>
                        <span>{ico}</span> {label}
                      </button>
                    ))}
                    <button style={{border:"none",textAlign:"left",padding:"6px 10px",borderRadius:8,fontSize:12,cursor:"pointer",color:"#D6483A",background:"none",display:"flex",alignItems:"center",gap:7}}
                      onClick={()=>{if(iframeRef.current?.contentWindow)iframeRef.current.contentWindow.postMessage({type:"adl_goto",tab:"logout"},"*");}}>
                      <span>🚪</span> Sair da Equipe
                    </button>
                  </>
                )}
              </div>
            )}
            <div style={{borderTop:"1px dashed var(--border)",margin:"6px 0 4px"}}/>
            {[["calendario","📅","Calendário"],["reservaInfo","🗒️","Reservas do Dia"],["dashboard","📊","Dashboard"]].map(([id,ico,label])=>(
              <button key={id} className={"nav-btn"+(secao===id&&!artesAberto?" active":"")} onClick={()=>{ setSecao(id); setArtesAberto(false); setSecaoArtes(null); }}>
                <span className="ico">{ico}</span> {label}
              </button>
            ))}
            <button className={"nav-btn"+(secao==="config"&&!artesAberto?" active":"")} onClick={()=>{ setSecao("config"); setArtesAberto(false); setSecaoArtes(null); }}>
              <span className="ico">⚙️</span> Configurações
            </button>
            {secao==="config"&&!artesAberto&&(
              <div style={{paddingLeft:14,display:"flex",flexDirection:"column",gap:2,marginTop:2}}>
                {[["email","📧","E-mail"],["reservas","⏱️","Reservas"],["ambientes","🏛️","Ambientes"],["bloqueios","🚫","Bloqueios"],["calendario","📅","Importar Calendário"],["historico","🕓","Histórico"]].map(([id,ico,label])=>(
                  <button key={id} style={{background:secaoConfig===id?"var(--surface-soft)":"none",border:"none",textAlign:"left",padding:"8px 10px",borderRadius:8,fontWeight:secaoConfig===id?700:500,fontSize:13,cursor:"pointer",color:"var(--ink)",display:"flex",alignItems:"center",gap:7}} onClick={()=>setSecaoConfig(id)}>
                    <span>{ico}</span> {label}
                  </button>
                ))}
              </div>
            )}
            <div className="admin-box">
              {adminMode
                ?<div className="admin-pill">🔑 Modo Admin ativo <button onClick={sairAdmin}>Sair</button></div>
                :<button className="btn-ghost-admin" onClick={()=>setModalAdmin(true)}>🔒 Entrar como Admin</button>}
            </div>
          </div>
          <div className="versiculo-box"><strong>Versículo do Dia</strong><span>{versiculo}</span></div>
        </aside>

        <main className="content" style={artesAberto?{padding:0,overflow:"hidden"}:{}}>
          {artesAberto&&secaoArtes&&(
            <div style={{width:"100%",height:"calc(100vh - 86px)",display:"flex",flexDirection:"column"}}>
              <iframe ref={iframeRef} src={`/artes.html${secaoArtes==="formulario"||secaoArtes.startsWith("g-")||secaoArtes==="equipe"?"":secaoArtes==="historico"?"?tab=historico":""}`} key="artes-frame" style={{width:"100%",flex:1,border:"none",display:"block"}} title="Solicitação de Artes"/>
            </div>
          )}

          {/* CALENDÁRIO */}
          {secao==="calendario"&&!artesAberto&&(
            <div className="block" style={{marginTop:0}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:10}}>
                <div><h3>Calendário de Reservas</h3><p className="block-sub">Clique em um dia para solicitar.</p></div>
                <button className={"room-tab"+(modoGrade?" active":"")} style={{"--tab-color":"var(--primary)"}} onClick={()=>setModoGrade(g=>!g)}>{modoGrade?"📅 Por sala":"🗂️ Ver todas"}</button>
              </div>
              <div style={{display:"flex",gap:14,flexWrap:"wrap",margin:"10px 0 4px",fontSize:11,alignItems:"center",color:"var(--ink-soft)"}}>
                <span style={{display:"flex",alignItems:"center",gap:4}}><span style={{width:9,height:9,borderRadius:2,background:"#D6483A",display:"inline-block"}}/>Evento Sede</span>
                <span style={{display:"flex",alignItems:"center",gap:4}}><span style={{width:9,height:9,borderRadius:2,background:"#E0A23B",display:"inline-block"}}/>Congregação</span>
                <span style={{display:"flex",alignItems:"center",gap:4}}><span style={{width:9,height:9,borderRadius:2,background:"#888",display:"inline-block"}}/>Bloqueio</span>
              </div>
              {!modoGrade&&(
                <div className="room-tabs">
                  {salas.map(s=>(
                    <button key={s.id} className={"room-tab"+(s.nome===salaAtiva?" active":"")} style={{"--tab-color":s.cor}} onClick={()=>setSalaAtiva(s.nome)}>
                      <span className="dot" style={{background:s.cor}}/> {s.nome}
                      {s.capacidade>0&&<span style={{fontSize:10,opacity:.75,fontWeight:600}}>· {s.capacidade} pessoas</span>}
                    </button>
                  ))}
                </div>
              )}
              <div className="cal-controls">
                <select value={mesAtual} onChange={e=>setMesAtual(parseInt(e.target.value,10))}>{MESES.map((m,i)=><option key={m} value={i}>{m}</option>)}</select>
                <select value={anoAtual} onChange={e=>setAnoAtual(parseInt(e.target.value,10))}>{anos.map(a=><option key={a} value={a}>{a}</option>)}</select>
              </div>
              {modoGrade?(
                <div style={{overflowX:"auto"}}>
                  <table style={{width:"100%",borderCollapse:"collapse",minWidth:salas.length*120+80}}>
                    <thead><tr>
                      <th style={{padding:"8px 6px",fontWeight:800,fontSize:12,color:"var(--ink-soft)",textAlign:"left",width:44}}>Dia</th>
                      {salas.map(s=><th key={s.id} style={{padding:"8px 6px",fontSize:12,fontWeight:800,color:s.cor,textAlign:"center",minWidth:120}}>{s.nome}</th>)}
                    </tr></thead>
                    <tbody>
                      {diasDoMes.map(dia=>{
                        const dataD=new Date(anoAtual,mesAtual,dia);
                        const ehHoje=dia===agora.getDate()&&mesAtual===agora.getMonth()&&anoAtual===agora.getFullYear();
                        const passado=dataD<hoje();
                        const acima=Math.round((dataD-hoje())/86400000)>LIMITE;
                        const evsDia=getEvDia(dia,mesAtual,anoAtual);
                        return(
                          <tr key={dia} style={{borderBottom:"1px solid var(--border)",opacity:passado?0.4:1}}>
                            <td style={{padding:"6px 4px",fontWeight:ehHoje?800:500,color:ehHoje?"var(--primary)":"var(--ink)",fontSize:13}}>
                              {pad(dia)}<br/><span style={{fontSize:10,color:"var(--ink-soft)"}}>{DIAS_SEMANA[dataD.getDay()]}</span>
                              {salas.some(s=>s.tipo==="Nave")&&evsDia.filter(e=>e.tipo==="congregacao").map(e=><div key={e.id} style={{background:"#E0A23B",color:"#fff",borderRadius:4,padding:"1px 4px",fontSize:9,marginTop:2}}>🟡 {e.congregacao||e.nome}</div>)}
                            </td>
                            {salas.map(s=>{
                              const resv=reservas.filter(r=>r.sala_nome===s.nome&&r.dia===dia&&r.mes===mesAtual&&r.ano===anoAtual).sort((a,b)=>a.hora_inicio.localeCompare(b.hora_inicio));
                              const bloqDia=bloqueios.filter(b=>b.sala_nome===s.nome&&b.dia_semana===dataD.getDay());
                              // Eventos da sede só bloqueiam/aparecem na Nave
                              const ehNave=s.tipo==="Nave";
                              const evsSede=ehNave?evsDia.filter(e=>e.tipo==="sede"):[];
                              return(
                                <td key={s.id} style={{padding:"4px",textAlign:"center",verticalAlign:"top"}} onClick={()=>!passado&&!acima&&(setSalaAtiva(s.nome),abrirModal(dia))}>
                                  {evsSede.map(e=><div key={e.id} style={{background:"#D6483A",color:"#fff",borderRadius:4,padding:"2px 4px",fontSize:9,fontWeight:700,marginBottom:2}}>🔴 {e.hora_inicio}-{e.hora_fim}</div>)}
                                  {bloqDia.map(b=><div key={b.id} style={{background:"#888",color:"#fff",borderRadius:4,padding:"2px 4px",fontSize:9,marginBottom:2}}>🚫 {b.hora_inicio}–{b.hora_fim}{b.descricao?` – ${b.descricao}`:""}</div>)}
                                  {resv.map(r=>(
                                    <div key={r.id} style={{background:s.cor,color:"#fff",borderRadius:6,padding:"3px 5px",fontSize:10,fontWeight:700,marginBottom:2,display:"flex",alignItems:"center",justifyContent:"space-between",gap:2}}>
                                      <span>{r.hora_inicio}-{r.hora_fim}</span>
                                      {adminMode&&<Lixeira onClick={e=>{e.stopPropagation();pedirExclusao(r);}}/>}
                                    </div>
                                  ))}
                                  {!passado&&!acima&&resv.length===0&&evsSede.length===0&&<div style={{color:"var(--ink-soft)",fontSize:10,cursor:"pointer"}}>+ reservar</div>}
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ):(
                <div className="calendar">
                  {DIAS_SEMANA.map(d=><div key={d} className="weekday">{d}</div>)}
                  {Array.from({length:offset}).map((_,i)=><div key={"v"+i} className="day empty"/>)}
                  {diasDoMes.map(dia=>{
                    const dataD=new Date(anoAtual,mesAtual,dia);
                    const ehHoje=dia===agora.getDate()&&mesAtual===agora.getMonth()&&anoAtual===agora.getFullYear();
                    const acima=Math.round((dataD-hoje())/86400000)>LIMITE;
                    const resv=reservas.filter(r=>r.dia===dia&&r.mes===mesAtual&&r.ano===anoAtual&&r.sala_nome===salaAtiva).sort((a,b)=>a.hora_inicio.localeCompare(b.hora_inicio));
                    const bloqDia=bloqueios.filter(b=>b.sala_nome===salaAtiva&&b.dia_semana===dataD.getDay());
                    const evsDia=getEvDia(dia,mesAtual,anoAtual);
                    // Eventos da sede/congregação só aparecem na Nave
                    const isNaveAtiva=corAtiva?.tipo==="Nave";
                    const evsSede=isNaveAtiva?evsDia.filter(e=>e.tipo==="sede"):[];
                    const evsCong=isNaveAtiva?evsDia.filter(e=>e.tipo==="congregacao"):[];
                    return(
                      <div key={dia} className={"day"+(ehHoje?" today":"")+(acima?" fora-limite":"")} onClick={()=>!acima&&abrirModal(dia)} title={acima?`Reservas só até ${LIMITE} dias no futuro`:""}>
                        <div className="day-number">{dia}</div>
                        {evsSede.map(e=><div key={e.id} className="reserva-item" style={{background:"#D6483A",fontSize:"9px"}}>🔴 {e.nome}</div>)}
                        {evsCong.map(e=><div key={e.id} className="reserva-item" style={{background:"#E0A23B",fontSize:"9px"}}>🟡 {e.congregacao||e.nome}</div>)}
                        {bloqDia.map(b=><div key={b.id} className="reserva-item" style={{background:"#888",fontSize:"9px"}}>🚫 {b.hora_inicio}–{b.hora_fim}{b.descricao?` – ${b.descricao}`:""}</div>)}
                        {resv.map(r=>(
                          <div key={r.id} className="reserva-item" style={{background:corAtiva?corAtiva.cor:"var(--primary)",display:"flex",alignItems:"center",justifyContent:"space-between",gap:2}}>
                            <span style={{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",flex:1}}>{r.hora_inicio}-{r.hora_fim} · {r.evento}</span>
                            {adminMode&&<Lixeira onClick={e=>{e.stopPropagation();pedirExclusao(r);}}/>}
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              )}
              <h3 style={{marginTop:26,fontSize:16}}>Próximas reservas — {salaAtiva||"—"}</h3>
              <ul className="lista-reservas">
                {proximas.length===0&&<div className="empty-state">Nenhuma reserva futura. Calendário livre.</div>}
                {proximas.map(r=>{
                  const dFmt=`${pad(r.dia)}/${pad(r.mes+1)}/${r.ano}`;
                  const recursos=[r.precisa_som&&"🎤 Som",r.precisa_projecao&&"📽️ Projeção",r.precisa_fotografia&&"📷 Foto",r.qtd_mesas>0&&`🪑 ${r.qtd_mesas} mesa(s)`,r.qtd_cadeiras>0&&`💺 ${r.qtd_cadeiras} cadeira(s)`].filter(Boolean).join(" · ");
                  return(
                    <li key={r.id}>
                      <div className="res-info">
                        <b>{r.evento}{r.recorrente?" 🔁":""}{r.tipo_evento==="evento_externo"?" 🏢":""}</b>
                        <span>{dFmt} · {r.hora_inicio} às {r.hora_fim} · {r.nome}</span>
                        {r.observacao&&<span style={{fontStyle:"italic",color:"var(--ink-soft)"}}>📝 {r.observacao}</span>}
                        {recursos&&<span style={{color:"var(--primary-dark)",fontSize:12,fontWeight:600}}>{recursos}</span>}
                      </div>
                      <div className="res-actions" style={{display:"flex",gap:6,alignItems:"center"}}>
                        {adminMode&&<button type="button" onClick={()=>pedirExclusao(r)} style={{background:"#FCE9E6",border:"none",cursor:"pointer",borderRadius:8,padding:"6px 10px",fontSize:16}} title="Excluir (admin)">🗑️</button>}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {/* DASHBOARD */}
          {secao==="dashboard"&&!artesAberto&&(()=>{
            const agora2=new Date();
            const mesAtualNum=agora2.getMonth();
            const anoAtualNum=agora2.getFullYear();

            // Stats gerais
            const resMes=reservas.filter(r=>r.mes===mesAtualNum&&r.ano===anoAtualNum);
            const resAno=reservas.filter(r=>r.ano===anoAtualNum);
            const proximas7=reservas.filter(r=>{const d=new Date(r.ano,r.mes,r.dia);const diff=(d-hoje())/86400000;return diff>=0&&diff<=7;});

            // Sala mais reservada (este ano)
            const porSala={};resAno.forEach(r=>{porSala[r.sala_nome]=(porSala[r.sala_nome]||0)+1;});
            const topSala=Object.entries(porSala).sort((a,b)=>b[1]-a[1])[0];

            // Dia da semana mais ocupado
            const porDia=[0,0,0,0,0,0,0];
            resAno.forEach(r=>{const d=new Date(r.ano,r.mes,r.dia);porDia[d.getDay()]++;});
            const topDiaIdx=porDia.indexOf(Math.max(...porDia));
            const DIAS_FULL=["Domingo","Segunda","Terça","Quarta","Quinta","Sexta","Sábado"];

            // Recursos mais solicitados
            const recursos={som:0,projecao:0,fotografia:0,transmissao:0};
            resAno.forEach(r=>{
              if(r.precisa_som)recursos.som++;
              if(r.precisa_projecao)recursos.projecao++;
              if(r.precisa_fotografia)recursos.fotografia++;
              if(r.precisa_transmissao)recursos.transmissao++;
            });

            // Últimos 6 meses
            const meses6=Array.from({length:6},(_,i)=>{
              const d=new Date(anoAtualNum,mesAtualNum-5+i,1);
              return {mes:d.getMonth(),ano:d.getFullYear(),label:["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"][d.getMonth()]};
            });
            const maxMes=Math.max(...meses6.map(m=>reservas.filter(r=>r.mes===m.mes&&r.ano===m.ano).length),1);

            const Card=({ico,valor,label,cor})=>(
              <div style={{background:"var(--surface-soft)",borderRadius:14,padding:"16px 18px",display:"flex",flexDirection:"column",gap:4,borderLeft:`4px solid ${cor||"var(--primary)"}`}}>
                <div style={{fontSize:22}}>{ico}</div>
                <div style={{fontSize:28,fontWeight:800,color:"var(--ink)",fontFamily:"Fraunces,serif"}}>{valor}</div>
                <div style={{fontSize:12,color:"var(--ink-soft)",fontWeight:600}}>{label}</div>
              </div>
            );

            return(
              <div className="block" style={{marginTop:0}}>
                <h3>📊 Dashboard</h3>
                <p className="block-sub">Visão geral do sistema de reservas — {anoAtualNum}</p>

                {/* Cards */}
                <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(150px,1fr))",gap:12,margin:"18px 0 24px"}}>
                  <Card ico="📅" valor={resMes.length} label={`Reservas em ${["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"][mesAtualNum]}`} cor="var(--primary)"/>
                  <Card ico="📆" valor={resAno.length} label={`Total em ${anoAtualNum}`} cor="#7C5CBF"/>
                  <Card ico="⏳" valor={proximas7.length} label="Próximos 7 dias" cor="#E0A23B"/>
                  <Card ico="🏛️" valor={salas.length} label="Ambientes cadastrados" cor="#27856A"/>
                  {topSala&&<Card ico="🏆" valor={topSala[0]} label={`Mais reservada (${topSala[1]}x)`} cor="#D6483A"/>}
                  <Card ico="📅" valor={DIAS_FULL[topDiaIdx]} label="Dia mais movimentado" cor="#2B8FE0"/>
                </div>

                {/* Gráfico de barras — últimos 6 meses */}
                <h4 style={{fontFamily:"Fraunces,serif",color:"var(--primary-dark)",fontSize:15,margin:"0 0 12px"}}>Reservas nos últimos 6 meses</h4>
                <div style={{display:"flex",alignItems:"flex-end",gap:10,height:120,marginBottom:24,padding:"0 4px"}}>
                  {meses6.map((m,i)=>{
                    const qt=reservas.filter(r=>r.mes===m.mes&&r.ano===m.ano).length;
                    const h=Math.max((qt/maxMes)*100,4);
                    return(
                      <div key={i} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:4}}>
                        <span style={{fontSize:11,fontWeight:700,color:"var(--ink)"}}>{qt}</span>
                        <div style={{width:"100%",height:`${h}px`,background:"var(--primary)",borderRadius:"6px 6px 0 0",opacity:.85,transition:"height .3s"}}/>
                        <span style={{fontSize:10,color:"var(--ink-soft)",fontWeight:600}}>{m.label}</span>
                      </div>
                    );
                  })}
                </div>

                {/* Recursos mais solicitados */}
                <h4 style={{fontFamily:"Fraunces,serif",color:"var(--primary-dark)",fontSize:15,margin:"0 0 12px"}}>Recursos mais solicitados (este ano)</h4>
                <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:24}}>
                  {[["🎤 Som",recursos.som,"#0E8E89"],["📽️ Projeção",recursos.projecao,"#7C5CBF"],["📷 Fotografia",recursos.fotografia,"#E0A23B"],["📡 Transmissão",recursos.transmissao,"#2B8FE0"]].map(([label,val,cor])=>{
                    const pct=resAno.length>0?Math.round((val/resAno.length)*100):0;
                    return(
                      <div key={label} style={{display:"flex",alignItems:"center",gap:10}}>
                        <span style={{fontSize:13,fontWeight:700,minWidth:120}}>{label}</span>
                        <div style={{flex:1,background:"var(--surface-soft)",borderRadius:99,height:10,overflow:"hidden"}}>
                          <div style={{width:`${pct}%`,height:"100%",background:cor,borderRadius:99,transition:"width .4s"}}/>
                        </div>
                        <span style={{fontSize:12,color:"var(--ink-soft)",minWidth:50,textAlign:"right"}}>{val}x ({pct}%)</span>
                      </div>
                    );
                  })}
                </div>

                {/* Distribuição por sala */}
                <h4 style={{fontFamily:"Fraunces,serif",color:"var(--primary-dark)",fontSize:15,margin:"0 0 12px"}}>Reservas por sala (este ano)</h4>
                <div style={{display:"flex",flexDirection:"column",gap:6}}>
                  {salas.map(s=>{
                    const qt=resAno.filter(r=>r.sala_nome===s.nome).length;
                    const pct=resAno.length>0?Math.round((qt/resAno.length)*100):0;
                    return(
                      <div key={s.id} style={{display:"flex",alignItems:"center",gap:10}}>
                        <span style={{fontSize:13,fontWeight:600,minWidth:120,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{s.nome}</span>
                        <div style={{flex:1,background:"var(--surface-soft)",borderRadius:99,height:10,overflow:"hidden"}}>
                          <div style={{width:`${pct}%`,height:"100%",background:s.cor,borderRadius:99,transition:"width .4s"}}/>
                        </div>
                        <span style={{fontSize:12,color:"var(--ink-soft)",minWidth:50,textAlign:"right"}}>{qt}x ({pct}%)</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}

          {/* RESERVAS DO DIA */}
          {secao==="reservaInfo"&&!artesAberto&&(
            <div className="block" style={{marginTop:0}}>
              <div className="reservas-dia-head">
                <div><h3>Reservas do Dia</h3><p className="block-sub">Todas as salas juntas.</p></div>
                <button className="btn-primary no-print" style={{gridColumn:"auto",width:"auto"}} onClick={()=>window.print()}>🖨️ Imprimir</button>
              </div>
              <div style={{display:"flex",gap:12,flexWrap:"wrap",margin:"16px 0",alignItems:"flex-end"}} className="no-print">
                <div className="form-field" style={{maxWidth:200,margin:0}}><label>Data</label><input type="date" value={dataRelatorio} onChange={e=>setDataRelatorio(e.target.value)}/></div>
                <div className="form-field" style={{flex:1,minWidth:180,margin:0}}><label>Buscar</label><input type="text" placeholder="Nome, evento ou sala…" value={buscaRelatorio} onChange={e=>setBuscaRelatorio(e.target.value)}/></div>
              </div>
              <div className="print-area">
                <h2 className="print-only-title">Reservas — {dataRelFmt}</h2>
                <table className="tabela-reservas-dia">
                  <thead><tr><th>Sala</th><th>Horário</th><th>Evento</th><th>Solicitante</th></tr></thead>
                  <tbody>
                    {reservasDoDia.length===0&&<tr><td colSpan={4} style={{textAlign:"center",color:"var(--ink-soft)"}}>Nenhuma reserva para {dataRelFmt}.</td></tr>}
                    {reservasDoDia.map(r=>{
                      const recursos=[r.precisa_som&&"🎤",r.precisa_projecao&&"📽️",r.precisa_fotografia&&"📷",r.qtd_mesas>0&&`🪑${r.qtd_mesas}`,r.qtd_cadeiras>0&&`💺${r.qtd_cadeiras}`].filter(Boolean).join(" ");
                      return(
                        <tr key={r.id}>
                          <td><span className="sala-tag" style={{background:salas.find(s=>s.nome===r.sala_nome)?.cor||"#999",color:"#fff"}}>{r.sala_nome}</span></td>
                          <td>{r.hora_inicio} – {r.hora_fim}</td>
                          <td>{r.evento}{r.recorrente?" 🔁":""} {recursos}{r.observacao&&<><br/><small style={{color:"var(--ink-soft)"}}>📝 {r.observacao}</small></>}</td>
                          <td>{r.nome}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* CONFIGURAÇÕES */}
          {secao==="config"&&!artesAberto&&(
            <div className="block" style={{marginTop:0}}>
              <h3>⚙️ Configurações</h3>
              {!adminMode?(
                <div className="locked-box"><span className="ico">🔒</span><h4>Acesso restrito</h4><p>Entre como administrador para alterar as configurações.</p></div>
              ):(
                <div style={{maxWidth:720}}>
                  {sucessoConfig&&<div style={{background:"#E6F4F1",color:"#075F5C",borderRadius:10,padding:"12px 16px",fontWeight:700,fontSize:13,marginBottom:18}}>✅ Configurações salvas com sucesso!</div>}

                  {secaoConfig==="reservas"&&(
                    <div>
                      <h4 style={{fontFamily:"Fraunces,serif",color:"var(--primary-dark)",fontSize:16,margin:"0 0 16px"}}>⏱️ Parâmetros de Reserva</h4>
                      <div className="form-grid">
                        <div className="form-field">
                          <label>Limite de antecedência máxima (dias)</label>
                          <input type="number" min="1" max="365" value={config.limite_dias||"60"} onChange={e=>setConfig(c=>({...c,limite_dias:e.target.value}))}/>
                          <small style={{color:"var(--ink-soft)",fontSize:11}}>Máximo de dias no futuro que alguém pode reservar.</small>
                        </div>
                        <div className="form-field">
                          <label>Antecedência mínima obrigatória (horas)</label>
                          <input type="number" min="0" max="720" value={config.antecedencia_horas||"0"} onChange={e=>setConfig(c=>({...c,antecedencia_horas:e.target.value}))}/>
                          <small style={{color:"var(--ink-soft)",fontSize:11}}>Mínimo de horas antes do evento. 0 = sem restrição.</small>
                        </div>
                        <button className="btn-primary" style={{alignSelf:"flex-end"}} disabled={salvandoConfig} onClick={salvarConfig}>{salvandoConfig?"Salvando…":"💾 Salvar Configurações"}</button>
                      </div>
                      <div style={{marginTop:24,background:"var(--surface-soft)",borderRadius:12,padding:"14px 16px",fontSize:13,color:"var(--ink-soft)",lineHeight:1.7}}>
                        <b style={{color:"var(--ink)",display:"block",marginBottom:6}}>📌 Como funcionam os parâmetros:</b>
                        <b>Antecedência máxima:</b> impede reservas muito antecipadas.<br/>
                        <b>Antecedência mínima:</b> impede reservas de última hora. Ex: 24h = só reserva com 24h de antecedência.
                      </div>
                    </div>
                  )}

                  {secaoConfig==="email"&&(
                    <div>
                      <h4 style={{fontFamily:"Fraunces,serif",color:"var(--primary-dark)",fontSize:16,margin:"0 0 16px"}}>📧 E-mail Geral</h4>
                      <div className="form-grid">
                        <div className="form-field full">
                          <label>Remetente</label>
                          <div style={{padding:"11px 13px",background:"var(--surface-soft)",borderRadius:11,fontSize:13.5,color:"var(--ink-soft)",border:"1.5px solid var(--border)"}}>📨 Conta Gmail configurada na Vercel (GMAIL_USER)</div>
                        </div>
                        <div className="form-field full">
                          <label>Destinatários (recebem todas as notificações)</label>
                          <input type="text" placeholder="admin@igreja.com, secretaria@gmail.com" value={config.email_admin||""} onChange={e=>setConfig(c=>({...c,email_admin:e.target.value}))}/>
                          <small style={{color:"var(--ink-soft)",fontSize:11}}>Separe por vírgula. Recebem TODAS as notificações.</small>
                        </div>
                        <div className="form-field full">
                          <label>Mensagem personalizada no rodapé</label>
                          <input type="text" placeholder="Ex: Dúvidas? Fale com a secretaria." value={config.email_mensagem||""} onChange={e=>setConfig(c=>({...c,email_mensagem:e.target.value}))}/>
                        </div>
                      </div>
                      <div className="form-grid" style={{marginTop:8}}>
                        <button className="btn-primary" style={{alignSelf:"flex-end"}} disabled={salvandoConfig} onClick={salvarConfig}>{salvandoConfig?"Salvando…":"💾 Salvar"}</button>
                      </div>

                      <h4 style={{fontFamily:"Fraunces,serif",color:"var(--primary-dark)",fontSize:16,margin:"28px 0 6px"}}>📋 Contatos por Recurso</h4>
                      <p className="block-sub" style={{marginBottom:14}}>Responsáveis que recebem aviso apenas quando um recurso específico for solicitado.</p>
                      {erroContato&&<div className="form-error" style={{display:"block",marginBottom:10}}>{erroContato}</div>}
                      <div className="form-grid">
                        <div className="form-field"><label>Nome</label><input type="text" placeholder="Ex: Responsável de Som" value={formContato.nome} onChange={e=>setFormContato(f=>({...f,nome:e.target.value}))}/></div>
                        <div className="form-field"><label>E-mail</label><input type="email" placeholder="som@igreja.com" value={formContato.email} onChange={e=>setFormContato(f=>({...f,email:e.target.value}))}/></div>
                        {/* ✅ MUDANÇA 3: campo WhatsApp */}
                        <div className="form-field">
                          <label>WhatsApp (opcional)</label>
                          <input type="tel" placeholder="(11) 99999-9999" value={formContato.celular||""} onChange={e=>setFormContato(f=>({...f,celular:e.target.value}))}/>
                          <small style={{color:"var(--ink-soft)",fontSize:11}}>Receberá um botão "Abrir no WhatsApp" no e-mail.</small>
                        </div>
                        <div className="form-field full">
                          <label>Notificar quando solicitado:</label>
                          <div style={{display:"flex",flexWrap:"wrap",gap:12,marginTop:6}}>
                            {[["recebe_todas","Todas as reservas"],["recebe_som","🎤 Som"],["recebe_projecao","📽️ Projeção"],["recebe_fotografia","📷 Fotografia"],["recebe_mesa_cadeira","🪑 Mesa / Cadeira"]].map(([key,label])=>(
                              <label key={key} style={{display:"flex",alignItems:"center",gap:6,fontSize:13,fontWeight:600,cursor:"pointer"}}>
                                <input type="checkbox" checked={Boolean(formContato[key])} onChange={e=>setFormContato(f=>({...f,[key]:e.target.checked}))} style={{width:16,height:16,accentColor:"var(--primary)"}}/>
                                {label}
                              </label>
                            ))}
                          </div>
                        </div>
                        <button type="button" className="btn-primary" onClick={cadastrarContato}>+ Adicionar Contato</button>
                      </div>

                      <div style={{marginTop:16}}>
                        {contatos.length===0?<div className="empty-state">Nenhum contato cadastrado.</div>:(
                          <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
                            <thead><tr style={{background:"var(--surface-soft)"}}>
                              <th style={{padding:"8px 10px",textAlign:"left"}}>Nome</th>
                              <th style={{padding:"8px 10px",textAlign:"left"}}>E-mail</th>
                              {/* ✅ MUDANÇA 4: coluna WhatsApp na tabela */}
                              <th style={{padding:"8px 10px",textAlign:"left"}}>WhatsApp</th>
                              <th style={{padding:"8px 10px",textAlign:"left"}}>Notifica quando</th>
                              <th style={{padding:"8px 4px"}}></th>
                            </tr></thead>
                            <tbody>
                              {contatos.map(c=>{
                                const quando=[c.recebe_todas&&"Todas",c.recebe_som&&"Som",c.recebe_projecao&&"Projeção",c.recebe_fotografia&&"Foto",c.recebe_mesa_cadeira&&"Mesa/Cadeira"].filter(Boolean).join(", ");
                                return(
                                  <tr key={c.id} style={{borderTop:"1px solid var(--border)"}}>
                                    <td style={{padding:"8px 10px",fontWeight:600}}>{c.nome}</td>
                                    <td style={{padding:"8px 10px",color:"var(--ink-soft)"}}>{c.email}</td>
                                    <td style={{padding:"8px 10px"}}>
                                      {c.celular
                                        ?<a href={`https://wa.me/55${c.celular.replace(/\D/g,"")}`} target="_blank" rel="noreferrer" style={{color:"#25D366",fontWeight:700,textDecoration:"none"}}>📱 {c.celular}</a>
                                        :<span style={{color:"var(--ink-soft)"}}>—</span>}
                                    </td>
                                    <td style={{padding:"8px 10px"}}>{quando||"—"}</td>
                                    <td style={{padding:"8px 4px"}}><Lixeira onClick={()=>excluirContato(c.id)}/></td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        )}
                      </div>
                    </div>
                  )}

                  {secaoConfig==="ambientes"&&(
                    <div>
                      <h4 style={{fontFamily:"Fraunces,serif",color:"var(--primary-dark)",fontSize:16,margin:"0 0 12px"}}>🏛️ Salas e Nave</h4>
                      {erroSala&&<div className="form-error" style={{display:"block",marginBottom:10}}>{erroSala}</div>}
                      <div className="form-grid">
                        <div className="form-field"><label>Nome</label><input type="text" placeholder="Ex: Sala 3" value={formSala.nome} onChange={e=>setFormSala(f=>({...f,nome:e.target.value}))}/></div>
                        <div className="form-field"><label>Tipo</label>
                          <select value={formSala.tipo} onChange={e=>setFormSala(f=>({...f,tipo:e.target.value}))}>
                            <option value="Sala">Sala</option><option value="Nave">Nave</option>
                          </select>
                        </div>
                        <div className="form-field">
                          <label>Capacidade (pessoas)</label>
                          <input type="number" min="0" placeholder="Ex: 50" value={formSala.capacidade||0} onChange={e=>setFormSala(f=>({...f,capacidade:parseInt(e.target.value)||0}))}/>
                          <small style={{color:"var(--ink-soft)",fontSize:11}}>0 = sem limite definido</small>
                        </div>
                        <button type="button" className="btn-primary" style={{alignSelf:"flex-end"}} onClick={cadastrarSala}>+ Cadastrar Ambiente</button>
                      </div>
                      <div className="sala-chip-list" style={{marginTop:14}}>
                        {salas.map(s=>(
                          <div className="sala-chip" key={s.id}>
                            <span className="swatch" style={{background:s.cor}}/>
                            <div className="info">
                              <b>{s.nome}</b>
                              <span>{s.tipo}{s.capacidade>0?` · 👥 ${s.capacidade} pessoas`:""}</span>
                            </div>
                            <button type="button" className="btn-danger" style={{padding:"8px 12px",fontSize:12}} onClick={()=>excluirSala(s)}>Excluir</button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {secaoConfig==="bloqueios"&&(
                    <div>
                      <h4 style={{fontFamily:"Fraunces,serif",color:"var(--primary-dark)",fontSize:16,margin:"0 0 6px"}}>🚫 Horários Bloqueados Fixos</h4>
                      <p className="block-sub" style={{marginBottom:14}}>Bloqueios recorrentes por dia da semana. A descrição aparece no calendário ao lado do horário.</p>
                      {erroBloqueio&&<div className="form-error" style={{display:"block",marginBottom:10}}>{erroBloqueio}</div>}
                      <div className="form-grid">
                        <div className="form-field"><label>Sala / Nave</label>
                          <select value={formBloqueio.sala_nome} onChange={e=>setFormBloqueio(f=>({...f,sala_nome:e.target.value}))}>
                            <option value="">Selecione…</option>{salas.map(s=><option key={s.id} value={s.nome}>{s.nome}</option>)}
                          </select>
                        </div>
                        <div className="form-field"><label>Dia da semana</label>
                          <select value={formBloqueio.dia_semana} onChange={e=>setFormBloqueio(f=>({...f,dia_semana:e.target.value}))}>
                            {DIAS_SEMANA_FULL.map((d,i)=><option key={i} value={i}>{d}</option>)}
                          </select>
                        </div>
                        <div className="form-field"><label>Início</label><input type="time" value={formBloqueio.hora_inicio} onChange={e=>setFormBloqueio(f=>({...f,hora_inicio:e.target.value}))}/></div>
                        <div className="form-field"><label>Término</label><input type="time" value={formBloqueio.hora_fim} onChange={e=>setFormBloqueio(f=>({...f,hora_fim:e.target.value}))}/></div>
                        <div className="form-field full"><label>Descrição (aparece no calendário)</label><input type="text" placeholder="Ex: Culto de domingo manhã / EBD" value={formBloqueio.descricao} onChange={e=>setFormBloqueio(f=>({...f,descricao:e.target.value}))}/></div>
                        <button type="button" className="btn-primary" onClick={cadastrarBloqueio}>+ Adicionar Bloqueio</button>
                      </div>
                      <div className="sala-chip-list" style={{marginTop:14}}>
                        {bloqueios.length===0&&<div className="empty-state">Nenhum horário bloqueado cadastrado.</div>}
                        {bloqueios.map(b=>(
                          <div className="sala-chip" key={b.id}>
                            <span className="swatch" style={{background:"#D6483A"}}/>
                            <div className="info"><b>{b.sala_nome} · {DIAS_SEMANA_FULL[b.dia_semana]} {b.hora_inicio}–{b.hora_fim}</b><span>{b.descricao||"Sem descrição"}</span></div>
                            <button type="button" className="btn-danger" style={{padding:"8px 12px",fontSize:12}} onClick={()=>excluirBloqueio(b.id)}>Remover</button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {secaoConfig==="historico"&&(
                    <div>
                      <h4 style={{fontFamily:"Fraunces,serif",color:"var(--primary-dark)",fontSize:16,margin:"0 0 6px"}}>🕓 Histórico de Alterações</h4>
                      <p className="block-sub" style={{marginBottom:14}}>Registro de todas as reservas que foram excluídas do sistema.</p>
                      <HistoricoLista/>
                    </div>
                  )}

                  {secaoConfig==="calendario"&&(
                    <div>
                      <h4 style={{fontFamily:"Fraunces,serif",color:"var(--primary-dark)",fontSize:16,margin:"0 0 6px"}}>📅 Importar Calendário da Igreja</h4>
                      <p className="block-sub" style={{marginBottom:14}}>🔴 Sede bloqueia reservas · 🟡 Congregação é informativo.</p>
                      {pdfErro&&<div className="form-error" style={{display:"block",marginBottom:12}}>{pdfErro}</div>}
                      <div style={{display:"flex",gap:12,alignItems:"center",marginBottom:16,flexWrap:"wrap"}}>
                        <label style={{display:"inline-flex",alignItems:"center",gap:8,padding:"10px 16px",background:"var(--primary)",color:"#fff",borderRadius:11,fontWeight:700,fontSize:13.5,cursor:"pointer"}}>
                          {pdfImportando?"⏳ Processando…":"📄 Importar PDF"}
                          <input type="file" accept=".pdf" style={{display:"none"}} disabled={pdfImportando} onChange={importarPDF}/>
                        </label>
                        <small style={{color:"var(--ink-soft)",fontSize:12}}>Requer ANTHROPIC_API_KEY na Vercel.</small>
                      </div>
                      {eventosPreview&&(
                        <div style={{marginBottom:20}}>
                          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10,flexWrap:"wrap",gap:10}}>
                            <b style={{color:"var(--primary-dark)"}}>✅ {eventosPreview.length} eventos extraídos — revise antes de salvar:</b>
                            <div style={{display:"flex",gap:8}}>
                              <button type="button" onClick={()=>setEventosPreview(null)} style={{background:"var(--surface-soft)",border:"none",padding:"8px 14px",borderRadius:9,fontWeight:700,cursor:"pointer",fontSize:13}}>Cancelar</button>
                              <button type="button" className="btn-primary" style={{padding:"8px 18px"}} disabled={salvandoEventos} onClick={confirmarImportacao}>{salvandoEventos?"Salvando…":"💾 Confirmar e Salvar"}</button>
                            </div>
                          </div>
                          <div style={{maxHeight:320,overflowY:"auto",border:"1px solid var(--border)",borderRadius:12}}>
                            <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
                              <thead style={{position:"sticky",top:0,background:"var(--surface-soft)"}}>
                                <tr><th style={{padding:"8px 10px",textAlign:"left"}}>Evento</th><th style={{padding:"8px 10px",textAlign:"left"}}>Data</th><th style={{padding:"8px 10px",textAlign:"left"}}>Tipo</th><th style={{padding:"8px 10px",textAlign:"left"}}>Congregação</th><th style={{padding:"8px 4px"}}></th></tr>
                              </thead>
                              <tbody>
                                {eventosPreview.map((ev,i)=>(
                                  <tr key={i} style={{borderTop:"1px solid var(--border)",background:ev.tipo==="sede"?"#FFF5F5":"#FFFBF0"}}>
                                    <td style={{padding:"7px 10px"}}>{ev.tipo==="sede"?"🔴":"🟡"} {ev.nome}</td>
                                    <td style={{padding:"7px 10px"}}>{pad(ev.dia)}/{pad(ev.mes+1)}/{ev.ano}</td>
                                    <td style={{padding:"7px 10px"}}>
                                      <select value={ev.tipo} onChange={e=>{const arr=[...eventosPreview];arr[i]={...arr[i],tipo:e.target.value};setEventosPreview(arr);}} style={{padding:"3px 6px",fontSize:12,borderRadius:6,border:"1px solid var(--border)"}}>
                                        <option value="sede">Sede</option><option value="congregacao">Congregação</option>
                                      </select>
                                    </td>
                                    <td style={{padding:"7px 10px"}}><input type="text" value={ev.congregacao||""} onChange={e=>{const arr=[...eventosPreview];arr[i]={...arr[i],congregacao:e.target.value};setEventosPreview(arr);}} style={{width:90,padding:"3px 6px",fontSize:12,borderRadius:6,border:"1px solid var(--border)"}} placeholder="—"/></td>
                                    <td style={{padding:"7px 4px"}}><Lixeira onClick={()=>setEventosPreview(eventosPreview.filter((_,j)=>j!==i))}/></td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                      <h5 style={{margin:"16px 0 8px",color:"var(--ink-soft)",fontSize:13,fontWeight:700}}>Eventos já importados ({eventosIgreja.length})</h5>
                      {eventosIgreja.length===0?<div className="empty-state">Nenhum evento importado ainda.</div>:(
                        <div style={{maxHeight:260,overflowY:"auto",border:"1px solid var(--border)",borderRadius:12}}>
                          <table style={{width:"100%",borderCollapse:"collapse",fontSize:12.5}}>
                            <thead style={{position:"sticky",top:0,background:"var(--surface-soft)"}}>
                              <tr><th style={{padding:"7px 10px",textAlign:"left"}}>Evento</th><th style={{padding:"7px 10px",textAlign:"left"}}>Data</th><th style={{padding:"7px 10px",textAlign:"left"}}>Tipo</th><th style={{padding:"7px 4px"}}></th></tr>
                            </thead>
                            <tbody>
                              {eventosIgreja.map(ev=>(
                                <tr key={ev.id} style={{borderTop:"1px solid var(--border)"}}>
                                  <td style={{padding:"6px 10px"}}>{ev.tipo==="sede"?"🔴":"🟡"} {ev.nome}</td>
                                  <td style={{padding:"6px 10px"}}>{pad(ev.dia)}/{pad(ev.mes+1)}/{ev.ano}</td>
                                  <td style={{padding:"6px 10px"}}>{ev.tipo==="sede"?"Sede":`Congregação: ${ev.congregacao||"?"}`}</td>
                                  <td style={{padding:"6px 4px"}}><Lixeira onClick={()=>excluirEventoIgreja(ev.id)}/></td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      <footer className="app-footer">Assembleia de Deus Louveira · Sistema de Reserva de Ambientes</footer>

      {/* MODAL RESERVA */}
      <div className={"overlay"+(modalAberto?" show":"")}>
        <div className="modal">
          {!sucessoReserva?(
            <>
              <div className="modal-head"><h3>Nova Solicitação</h3><button onClick={fecharModal}>✕</button></div>
              {diaSelecionado&&<span className="date-badge">{pad(diaSelecionado)}/{pad(mesAtual+1)}/{anoAtual}</span>}
              {diaSelecionado&&(()=>{
                const salaCor=salas.find(s=>s.nome===form.sala)?.cor||"var(--primary)";
                const dataD=new Date(anoAtual,mesAtual,diaSelecionado);
                const diaSem=dataD.getDay();
                const reservasDia=reservas.filter(r=>r.sala_nome===form.sala&&r.dia===diaSelecionado&&r.mes===mesAtual&&r.ano===anoAtual).sort((a,b)=>a.hora_inicio.localeCompare(b.hora_inicio));
                const bloqDia=bloqueios.filter(b=>b.sala_nome===form.sala&&b.dia_semana===diaSem).sort((a,b)=>a.hora_inicio.localeCompare(b.hora_inicio));
                // Eventos de sede só aparecem se a sala selecionada for Nave
                const salaEhNave=salas.find(s=>s.nome===form.sala)?.tipo==="Nave";
                const evSede=salaEhNave?eventosIgreja.filter(e=>e.tipo==="sede"&&e.dia===diaSelecionado&&e.mes===mesAtual&&e.ano===anoAtual).sort((a,b)=>a.hora_inicio.localeCompare(b.hora_inicio)):[];
                const total=reservasDia.length+bloqDia.length+evSede.length;
                return(
                  <div style={{background:"var(--surface-soft)",borderRadius:12,padding:"12px 14px",margin:"10px 0 4px",fontSize:13}}>
                    <div style={{fontWeight:700,color:"var(--ink)",marginBottom:total>0?8:0,display:"flex",alignItems:"center",gap:6}}>
                      📋 {form.sala||"Sala"} — {pad(diaSelecionado)}/{pad(mesAtual+1)}/{anoAtual}
                    </div>
                    {total===0?(
                      <div style={{color:"#27856A",fontWeight:600,fontSize:12.5,display:"flex",alignItems:"center",gap:5}}>✅ Nenhum horário ocupado — dia totalmente livre!</div>
                    ):(
                      <div style={{display:"flex",flexDirection:"column",gap:5}}>
                        {evSede.map(e=>(
                          <div key={e.id} style={{display:"flex",alignItems:"center",gap:8,background:"#FCE9E6",borderRadius:8,padding:"6px 10px"}}>
                            <span style={{fontSize:11}}>🔴</span>
                            <span style={{fontWeight:700,color:"#9C2C20",fontSize:12,minWidth:90}}>{e.hora_inicio} – {e.hora_fim}</span>
                            <span style={{color:"#9C2C20",fontSize:12}}>{e.nome}</span>
                            <span style={{marginLeft:"auto",fontSize:10,color:"#9C2C20",fontWeight:600,whiteSpace:"nowrap"}}>Evento da Igreja</span>
                          </div>
                        ))}
                        {bloqDia.map(b=>(
                          <div key={b.id} style={{display:"flex",alignItems:"center",gap:8,background:"#F0F0F0",borderRadius:8,padding:"6px 10px"}}>
                            <span style={{fontSize:11}}>🚫</span>
                            <span style={{fontWeight:700,color:"#555",fontSize:12,minWidth:90}}>{b.hora_inicio} – {b.hora_fim}</span>
                            <span style={{color:"#555",fontSize:12}}>{b.descricao||"Horário bloqueado"}</span>
                            <span style={{marginLeft:"auto",fontSize:10,color:"#777",fontWeight:600,whiteSpace:"nowrap"}}>Bloqueio fixo</span>
                          </div>
                        ))}
                        {reservasDia.map(r=>(
                          <div key={r.id} style={{display:"flex",alignItems:"center",gap:8,background:salaCor+"22",borderRadius:8,padding:"6px 10px"}}>
                            <span style={{fontSize:11}}>📌</span>
                            <span style={{fontWeight:700,color:salaCor,fontSize:12,minWidth:90}}>{r.hora_inicio} – {r.hora_fim}</span>
                            <span style={{color:"var(--ink)",fontSize:12,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{r.evento}</span>
                            <span style={{marginLeft:"auto",fontSize:10,color:"var(--ink-soft)",fontWeight:600,whiteSpace:"nowrap"}}>{r.nome}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })()}
              <form className="form-grid" onSubmit={enviarReserva}>
                {erroReserva&&<div className="form-error" style={{display:"block"}}>{erroReserva}</div>}
                <div className="form-field full"><label>Solicitante *</label><input type="text" required placeholder="Seu nome completo" value={form.nome} onChange={e=>setForm(f=>({...f,nome:e.target.value}))}/></div>
                <div className="form-field"><label>Data</label><input type="text" disabled value={`${pad(diaSelecionado)}/${pad(mesAtual+1)}/${anoAtual}`}/></div>
                <div className="form-field"><label>Sala / Nave *</label>
                  <select value={form.sala} onChange={e=>setForm(f=>({...f,sala:e.target.value}))}>
                    {salas.map(s=><option key={s.id} value={s.nome}>{s.nome} ({s.tipo})</option>)}
                  </select>
                </div>
                <div className="form-field full"><label>Evento *</label><input type="text" required placeholder="Ex: Ensaio do coral" value={form.evento} onChange={e=>setForm(f=>({...f,evento:e.target.value}))}/></div>
                <div className="form-field"><label>Início *</label><input type="time" required value={form.horaInicio} onChange={e=>setForm(f=>({...f,horaInicio:e.target.value}))}/></div>
                <div className="form-field"><label>Término *</label><input type="time" required value={form.horaFim} onChange={e=>setForm(f=>({...f,horaFim:e.target.value}))}/></div>
                <div className="form-field full"><label>Observação (opcional)</label><input type="text" placeholder="Detalhes adicionais" value={form.observacao} onChange={e=>setForm(f=>({...f,observacao:e.target.value}))}/></div>
                {salaTipo==="Nave"&&(
                  <div className="form-field full" style={{background:"var(--surface-soft)",borderRadius:12,padding:"12px 14px"}}>
                    <label style={{marginBottom:8,display:"block"}}>🏛️ Recursos da Nave — Irei precisar de:</label>
                    <div style={{display:"flex",gap:16,flexWrap:"wrap"}}>
                      {[["precisaSom","🎤 Som"],["precisaProjecao","📽️ Projeção (Telão)"],["precisaFotografia","📷 Fotografia"],["precisaTransmissao","📡 Transmissão"]].map(([key,label])=>(
                        <label key={key} style={{display:"flex",alignItems:"center",gap:7,fontWeight:600,fontSize:14,cursor:"pointer"}}>
                          <input type="checkbox" checked={Boolean(form[key])} onChange={e=>setForm(f=>({...f,[key]:e.target.checked}))} style={{width:18,height:18,accentColor:"var(--primary)",cursor:"pointer"}}/>
                          {label}
                        </label>
                      ))}
                    </div>
                  </div>
                )}
                {isEventoExterno&&(
                  <div className="form-field full" style={{background:"#FFF8F0",borderRadius:12,padding:"12px 14px",border:"1.5px solid #E0A23B"}}>
                    <label style={{marginBottom:8,display:"block"}}>🏢 Recursos do Evento Externo — Irei precisar de:</label>
                    <div style={{display:"flex",gap:16,flexWrap:"wrap",marginBottom:12}}>
                      {[["precisaSom","🎤 Som"],["precisaFotografia","📷 Fotografia"]].map(([key,label])=>(
                        <label key={key} style={{display:"flex",alignItems:"center",gap:7,fontWeight:600,fontSize:14,cursor:"pointer"}}>
                          <input type="checkbox" checked={Boolean(form[key])} onChange={e=>setForm(f=>({...f,[key]:e.target.checked}))} style={{width:18,height:18,accentColor:"#E0A23B",cursor:"pointer"}}/>
                          {label}
                        </label>
                      ))}
                      <label style={{display:"flex",alignItems:"center",gap:7,fontWeight:600,fontSize:14,cursor:"pointer"}}>
                        <input type="checkbox" checked={form.qtdMesas>0} onChange={e=>setForm(f=>({...f,qtdMesas:e.target.checked?1:0,qtdCadeiras:e.target.checked?(f.qtdCadeiras||0):0}))} style={{width:18,height:18,accentColor:"#E0A23B",cursor:"pointer"}}/>
                        🪑 Mesas
                      </label>
                      <label style={{display:"flex",alignItems:"center",gap:7,fontWeight:600,fontSize:14,cursor:"pointer"}}>
                        <input type="checkbox" checked={form.qtdCadeiras>0} onChange={e=>setForm(f=>({...f,qtdCadeiras:e.target.checked?1:0}))} style={{width:18,height:18,accentColor:"#E0A23B",cursor:"pointer"}}/>
                        💺 Cadeiras
                      </label>
                    </div>
                    {form.qtdMesas>0&&(
                      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginTop:8}}>
                        <div className="form-field" style={{margin:0}}><label>Quantidade de Mesas</label><input type="number" min="1" value={form.qtdMesas} onChange={e=>setForm(f=>({...f,qtdMesas:parseInt(e.target.value)||0}))}/></div>
                        <div className="form-field" style={{margin:0}}><label>Cadeiras por Mesa</label><input type="number" min="0" value={form.qtdCadeiras} onChange={e=>setForm(f=>({...f,qtdCadeiras:parseInt(e.target.value)||0}))}/></div>
                      </div>
                    )}
                    {form.qtdCadeiras>0&&form.qtdMesas===0&&(
                      <div className="form-field" style={{margin:"8px 0 0"}}><label>Quantidade de Cadeiras</label><input type="number" min="1" value={form.qtdCadeiras} onChange={e=>setForm(f=>({...f,qtdCadeiras:parseInt(e.target.value)||0}))}/></div>
                    )}
                  </div>
                )}
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
                    <input type="date" min={toDateInput(new Date(anoAtual,mesAtual,diaSelecionado||1))} max={toDateInput(new Date(agora.getFullYear()+2,11,31))} value={form.recorrenciaFim} onChange={e=>setForm(f=>({...f,recorrenciaFim:e.target.value}))}/>
                  </div>
                )}
                <button className="btn-primary" disabled={enviando}>{enviando?"Enviando…":"Enviar Solicitação"}</button>
              </form>
            </>
          ):(
            <div style={{textAlign:"center",padding:"10px 0 4px"}}>
              <div style={{fontSize:48,marginBottom:12}}>✅</div>
              <h3 style={{color:"var(--primary-dark)",marginBottom:6}}>Reserva confirmada!</h3>
              {sucessoReserva.totalCriadas>1&&<p style={{color:"var(--primary)",fontWeight:700,fontSize:14,margin:"0 0 8px"}}>🔁 {sucessoReserva.totalCriadas} datas criadas ({sucessoReserva.recorrencia})</p>}
              <div style={{background:"var(--surface-soft)",borderRadius:12,padding:"14px 16px",margin:"12px 0",textAlign:"left",fontSize:13.5,lineHeight:1.8}}>
                <b>Sala:</b> {sucessoReserva.sala_nome}<br/>
                {sucessoReserva.tipo_evento==="evento_externo"&&<><b>Tipo:</b> 🏢 Evento Externo<br/></>}
                <b>Evento:</b> {sucessoReserva.evento}<br/>
                <b>Horário:</b> {sucessoReserva.hora_inicio} – {sucessoReserva.hora_fim}<br/>
                <b>Solicitante:</b> {sucessoReserva.nomeSolicitante}<br/>
                {sucessoReserva.observacao&&<><b>Obs:</b> {sucessoReserva.observacao}<br/></>}
                {[sucessoReserva.precisa_som&&"🎤 Som",sucessoReserva.precisa_projecao&&"📽️ Projeção",sucessoReserva.precisa_fotografia&&"📷 Fotografia",sucessoReserva.qtd_mesas>0&&`🪑 ${sucessoReserva.qtd_mesas} mesa(s)`,sucessoReserva.qtd_cadeiras>0&&`💺 ${sucessoReserva.qtd_cadeiras} cadeira(s)`].filter(Boolean).length>0&&(
                  <><b>Recursos:</b> {[sucessoReserva.precisa_som&&"🎤 Som",sucessoReserva.precisa_projecao&&"📽️ Projeção",sucessoReserva.precisa_fotografia&&"📷 Fotografia",sucessoReserva.qtd_mesas>0&&`🪑 ${sucessoReserva.qtd_mesas} mesa(s)`,sucessoReserva.qtd_cadeiras>0&&`💺 ${sucessoReserva.qtd_cadeiras} cadeira(s)`].filter(Boolean).join(" · ")}<br/></>
                )}
              </div>

              {/* Botões WhatsApp para responsáveis pelos recursos solicitados */}
              {(()=>{
                const recursos={
                  som:Boolean(sucessoReserva.precisa_som),
                  projecao:Boolean(sucessoReserva.precisa_projecao),
                  fotografia:Boolean(sucessoReserva.precisa_fotografia),
                  mesa_cadeira:(sucessoReserva.qtd_mesas>0||sucessoReserva.qtd_cadeiras>0),
                };
                const dataFmt=`${pad(sucessoReserva.dia||diaSelecionado)}/${pad(mesAtual+1)}/${anoAtual}`;
                const msg=`*Nova Reserva - AD Louveira*\n\n*Sala:* ${sucessoReserva.sala_nome}\n*Data:* ${dataFmt}\n*Horario:* ${sucessoReserva.hora_inicio} - ${sucessoReserva.hora_fim}\n*Evento:* ${sucessoReserva.evento}\n*Solicitante:* ${sucessoReserva.nomeSolicitante}`;
                const relevantes=contatos.filter(c=>{
                  if(!c.celular) return false;
                  if(c.recebe_todas) return true;
                  if(recursos.som&&c.recebe_som) return true;
                  if(recursos.projecao&&c.recebe_projecao) return true;
                  if(recursos.fotografia&&c.recebe_fotografia) return true;
                  if(recursos.mesa_cadeira&&c.recebe_mesa_cadeira) return true;
                  return false;
                });
                if(!relevantes.length) return null;
                return(
                  <div style={{margin:"12px 0"}}>
                    <p style={{fontSize:12,color:"var(--ink-soft)",marginBottom:8,fontWeight:600}}>📲 Avisar responsáveis pelo WhatsApp:</p>
                    <div style={{display:"flex",flexDirection:"column",gap:8}}>
                      {relevantes.map(c=>{
                        const num=c.celular.replace(/\D/g,"");
                        const numero=num.startsWith("55")?num:"55"+num;
                        const url=`https://wa.me/${numero}?text=${encodeURIComponent(msg)}`;
                        return(
                          <a key={c.id} href={url} target="_blank" rel="noreferrer"
                            style={{display:"flex",alignItems:"center",gap:10,background:"#25D366",color:"#fff",padding:"10px 16px",borderRadius:10,textDecoration:"none",fontWeight:700,fontSize:13.5}}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                            Avisar {c.nome}
                          </a>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              <p style={{fontSize:12,color:"var(--ink-soft)"}}>Guarde essas informações para cancelar a reserva se necessário.</p>
              <button className="btn-primary" style={{marginTop:10}} onClick={fecharModal}>Fechar</button>
            </div>
          )}
        </div>
      </div>

      {/* MODAL CONFIRMAR EXCLUSÃO */}
      {modalExcluir&&(
        <div className="overlay show">
          <div className="modal" style={{maxWidth:420}}>
            <div className="modal-head">
              <h3 style={{color:"#D6483A"}}>🗑️ Excluir Reserva</h3>
              <button onClick={()=>setModalExcluir(null)}>✕</button>
            </div>
            <p style={{margin:"14px 0 18px",fontSize:14,color:"var(--ink)",lineHeight:1.7}}>
              Deseja realmente excluir esta reserva?
            </p>
            <div style={{background:"#FFF5F5",border:"1.5px solid #F5C6C6",borderRadius:12,padding:"14px 16px",fontSize:13.5,lineHeight:1.9,marginBottom:20}}>
              <div><b>Sala:</b> {modalExcluir.sala_nome}</div>
              <div><b>Data:</b> {pad(modalExcluir.dia)}/{pad(modalExcluir.mes+1)}/{modalExcluir.ano}</div>
              <div><b>Horário:</b> {modalExcluir.hora_inicio} – {modalExcluir.hora_fim}</div>
              <div><b>Evento:</b> {modalExcluir.evento}</div>
              <div><b>Solicitante:</b> {modalExcluir.nome}</div>
            </div>
            <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
              <button onClick={()=>setModalExcluir(null)}
                style={{padding:"10px 20px",borderRadius:10,border:"1.5px solid var(--border)",background:"var(--surface-soft)",fontWeight:700,fontSize:14,cursor:"pointer"}}>
                Cancelar
              </button>
              <button onClick={()=>excluirReserva(modalExcluir,true)}
                style={{padding:"10px 24px",borderRadius:10,border:"none",background:"#D6483A",color:"#fff",fontWeight:700,fontSize:14,cursor:"pointer"}}>
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL ADMIN */}
      <div className={"overlay"+(modalAdmin?" show":"")}>
        <div className="modal" style={{maxWidth:380}}>
          <div className="modal-head"><h3>Acesso Admin</h3><button onClick={()=>setModalAdmin(false)}>✕</button></div>
          <form className="form-grid" style={{marginTop:10}} onSubmit={loginAdmin}>
            {erroAdmin&&<div className="form-error" style={{display:"block"}}>{erroAdmin}</div>}
            <div className="form-field full"><label>Senha de administrador</label><input type="password" required value={senhaAdmin} onChange={e=>setSenhaAdmin(e.target.value)}/></div>
            <button className="btn-primary">Entrar</button>
          </form>
        </div>
      </div>
    </>
  );
}
