import { NextResponse } from "next/server";
import { sql } from "@/lib/sql";
import { ensureSchema } from "@/lib/db";
import { notificarAdminEmail } from "@/lib/email";
import crypto from "crypto";

const LIMITE_PADRAO = 60;

function paraMinutos(hhmm) {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}
function conflita(iA, fA, iB, fB) {
  return paraMinutos(iA) < paraMinutos(fB) && paraMinutos(fA) > paraMinutos(iB);
}
function gerarDatas(dia, mes, ano, rec, fim) {
  const datas = [];
  const [af, mf, df] = fim.split("-").map(Number);
  const fimDate = new Date(af, mf - 1, df);
  let cur = new Date(ano, mes, dia);
  while (cur <= fimDate) {
    datas.push({ dia: cur.getDate(), mes: cur.getMonth(), ano: cur.getFullYear() });
    if (rec === "semanal") cur.setDate(cur.getDate() + 7);
    else if (rec === "quinzenal") cur.setDate(cur.getDate() + 14);
    else if (rec === "mensal") cur.setMonth(cur.getMonth() + 1);
    else break;
  }
  return datas;
}

export async function GET(request) {
  await ensureSchema();
  const { searchParams } = new URL(request.url);
  const sala = searchParams.get("sala");
  const rows = sala
    ? await sql`SELECT * FROM reservas WHERE sala_nome=${sala} ORDER BY ano,mes,dia,hora_inicio;`
    : await sql`SELECT * FROM reservas ORDER BY ano,mes,dia,hora_inicio;`;
  return NextResponse.json(rows);
}

export async function POST(request) {
  await ensureSchema();
  const body = await request.json();

  const sala            = (body.sala || "").trim();
  const nome            = (body.nome || "").trim();
  const evento          = (body.evento || "").trim();
  const observacao      = (body.observacao || "").trim();
  const dia             = parseInt(body.dia, 10);
  const mes             = parseInt(body.mes, 10);
  const ano             = parseInt(body.ano, 10);
  const horaInicio      = body.horaInicio;
  const horaFim         = body.horaFim;
  const recorrencia     = body.recorrencia || "nenhuma";
  const recorrenciaFim  = body.recorrenciaFim || "";
  const precisaSom      = Boolean(body.precisaSom);
  const precisaProjecao = Boolean(body.precisaProjecao);
  const precisaFotografia = Boolean(body.precisaFotografia);
  const precisaTransmissao = Boolean(body.precisaTransmissao);
  const tipoEvento      = body.tipoEvento || "regular";
  const qtdMesas        = parseInt(body.qtdMesas || 0, 10);
  const qtdCadeiras     = parseInt(body.qtdCadeiras || 0, 10);

  if (!sala || !nome || !evento || !horaInicio || !horaFim || isNaN(dia)) {
    return NextResponse.json({ erro: "Preencha todos os campos obrigatórios." }, { status: 400 });
  }
  if (horaFim <= horaInicio) {
    return NextResponse.json({ erro: "O horário de término precisa ser depois do início." }, { status: 400 });
  }
  if (recorrencia !== "nenhuma" && !recorrenciaFim) {
    return NextResponse.json({ erro: "Informe a data final da recorrência." }, { status: 400 });
  }

  // Limite de antecedência
  const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
  const dataReserva = new Date(ano, mes, dia);
  let limiteAtual = LIMITE_PADRAO;
  let antecedenciaHoras = 0;
  try {
    const { getConfig } = await import("@/lib/db");
    const cfg = await getConfig();
    limiteAtual = parseInt(cfg.limite_dias || LIMITE_PADRAO, 10);
    antecedenciaHoras = parseInt(cfg.antecedencia_horas || "0", 10);
  } catch(e) {}

  if (Math.round((dataReserva - hoje) / 86400000) > limiteAtual) {
    return NextResponse.json({ erro: `Reservas podem ser feitas com no máximo ${limiteAtual} dias de antecedência.` }, { status: 400 });
  }

  // Antecedência mínima em horas
  if (antecedenciaHoras > 0) {
    const agora = new Date();
    const dataHoraEvento = new Date(ano, mes, dia, parseInt(horaInicio.split(":")[0]), parseInt(horaInicio.split(":")[1]));
    const diffHoras = (dataHoraEvento - agora) / 3600000;
    if (diffHoras < antecedenciaHoras) {
      return NextResponse.json({
        erro: `Reserva não permitida. As reservas devem ser realizadas com, no mínimo, ${antecedenciaHoras} hora${antecedenciaHoras > 1 ? "s" : ""} de antecedência em relação à data e horário desejados.`,
        tipo: "antecedencia_insuficiente"
      }, { status: 400 });
    }
  }

  // Bloqueios fixos
  const diaSemana = dataReserva.getDay();
  const bloqueios = await sql`SELECT * FROM bloqueios WHERE sala_nome=${sala} AND dia_semana=${diaSemana};`;
  for (const b of bloqueios) {
    if (conflita(horaInicio, horaFim, b.hora_inicio, b.hora_fim)) {
      return NextResponse.json({ erro: `Horário bloqueado para ${sala}: ${b.descricao || b.hora_inicio + "-" + b.hora_fim}.` }, { status: 409 });
    }
  }

  // ✅ Eventos da Sede — só bloqueia reservas na Nave
  const salaInfo = await sql`SELECT tipo FROM salas WHERE nome = ${sala} LIMIT 1;`;
  if (salaInfo[0]?.tipo === 'Nave') {
    const eventosSede = await sql`SELECT * FROM eventos_igreja WHERE tipo='sede' AND dia=${dia} AND mes=${mes} AND ano=${ano};`;
    for (const ev of eventosSede) {
      if (conflita(horaInicio, horaFim, ev.hora_inicio, ev.hora_fim)) {
        return NextResponse.json({ erro: `Conflita com evento da igreja: "${ev.nome}" (${ev.hora_inicio}–${ev.hora_fim}).` }, { status: 409 });
      }
    }
  }

  // Gerar datas (recorrência)
  const datas = recorrencia === "nenhuma"
    ? [{ dia, mes, ano }]
    : gerarDatas(dia, mes, ano, recorrencia, recorrenciaFim);

  if (!datas.length) return NextResponse.json({ erro: "Nenhuma data gerada." }, { status: 400 });
  if (datas.length > 104) return NextResponse.json({ erro: "Recorrência muito longa (máx. 2 anos)." }, { status: 400 });

  // Verificar conflitos em todas as datas
  const conflitos = [];
  for (const d of datas) {
    const ex = await sql`SELECT hora_inicio,hora_fim FROM reservas WHERE sala_nome=${sala} AND dia=${d.dia} AND mes=${d.mes} AND ano=${d.ano};`;
    for (const e of ex) {
      if (conflita(horaInicio, horaFim, e.hora_inicio, e.hora_fim)) {
        conflitos.push(`${String(d.dia).padStart(2,"0")}/${String(d.mes+1).padStart(2,"0")}/${d.ano}`);
        break;
      }
    }
  }
  if (conflitos.length) {
    return NextResponse.json({ erro: `Conflito nas datas: ${conflitos.slice(0,5).join(", ")}${conflitos.length>5?" e outras.":"."}` }, { status: 409 });
  }

  // Inserir reservas
  const ids = [];
  for (const d of datas) {
    const id = crypto.randomUUID(); ids.push(id);
    await sql`
      INSERT INTO reservas (id,sala_nome,nome,evento,observacao,dia,mes,ano,hora_inicio,hora_fim,
        recorrente,recorrencia,recorrencia_fim,precisa_som,precisa_projecao,precisa_fotografia,precisa_transmissao,
        tipo_evento,qtd_mesas,qtd_cadeiras)
      VALUES (${id},${sala},${nome},${evento},${observacao},${d.dia},${d.mes},${d.ano},
        ${horaInicio},${horaFim},${recorrencia!=="nenhuma"},${recorrencia},${recorrenciaFim},
        ${precisaSom},${precisaProjecao},${precisaFotografia},${precisaTransmissao},${tipoEvento},${qtdMesas},${qtdCadeiras});
    `;
  }

  await notificarAdminEmail({ sala, nome, evento, observacao, dia, mes, ano, horaInicio, horaFim,
    recorrencia, totalDatas: datas.length, precisaSom, precisaProjecao, precisaFotografia, precisaTransmissao,
    tipoEvento, qtdMesas, qtdCadeiras });

  const primeiras = await sql`SELECT * FROM reservas WHERE id=${ids[0]};`;
  return NextResponse.json({ ...primeiras[0], totalCriadas: datas.length }, { status: 201 });
}
