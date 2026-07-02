import { NextResponse } from "next/server";
import { sql } from "@/lib/sql";
import { ensureSchema } from "@/lib/db";
import { notificarAdminEmail } from "@/lib/email";
import crypto from "crypto";

const LIMITE_ANTECEDENCIA_DIAS = 60;

function paraMinutos(hhmm) {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

function conflita(inicioA, fimA, inicioB, fimB) {
  return paraMinutos(inicioA) < paraMinutos(fimB) && paraMinutos(fimA) > paraMinutos(inicioB);
}

function gerarDatasRecorrentes(dia, mes, ano, recorrencia, recorrenciaFim) {
  const datas = [];
  const [anoFim, mesFim, diaFim] = recorrenciaFim.split("-").map(Number);
  const fim = new Date(anoFim, mesFim - 1, diaFim);
  let atual = new Date(ano, mes, dia);
  while (atual <= fim) {
    datas.push({ dia: atual.getDate(), mes: atual.getMonth(), ano: atual.getFullYear() });
    if (recorrencia === "semanal") atual.setDate(atual.getDate() + 7);
    else if (recorrencia === "quinzenal") atual.setDate(atual.getDate() + 14);
    else if (recorrencia === "mensal") atual.setMonth(atual.getMonth() + 1);
    else break;
  }
  return datas;
}

export async function GET(request) {
  await ensureSchema();
  const { searchParams } = new URL(request.url);
  const sala = searchParams.get("sala");
  const rows = sala
    ? await sql`SELECT * FROM reservas WHERE sala_nome = ${sala} ORDER BY ano, mes, dia, hora_inicio;`
    : await sql`SELECT * FROM reservas ORDER BY ano, mes, dia, hora_inicio;`;
  return NextResponse.json(rows);
}

export async function POST(request) {
  await ensureSchema();

  const body = await request.json();
  const sala           = (body.sala || "").trim();
  const nome           = (body.nome || "").trim();
  const evento         = (body.evento || "").trim();
  const observacao     = (body.observacao || "").trim();
  const dia            = parseInt(body.dia, 10);
  const mes            = parseInt(body.mes, 10);
  const ano            = parseInt(body.ano, 10);
  const horaInicio     = body.horaInicio;
  const horaFim        = body.horaFim;
  const recorrencia    = body.recorrencia || "nenhuma";
  const recorrenciaFim = body.recorrenciaFim || "";

  if (!sala || !nome || !evento || !horaInicio || !horaFim || isNaN(dia)) {
    return NextResponse.json({ erro: "Preencha todos os campos obrigatórios." }, { status: 400 });
  }
  if (horaFim <= horaInicio) {
    return NextResponse.json({ erro: "O horário de término precisa ser depois do início." }, { status: 400 });
  }
  if (recorrencia !== "nenhuma" && !recorrenciaFim) {
    return NextResponse.json({ erro: "Informe a data final da recorrência." }, { status: 400 });
  }

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const dataReserva = new Date(ano, mes, dia);
  const diffDias = Math.round((dataReserva - hoje) / 86400000);
  if (diffDias > LIMITE_ANTECEDENCIA_DIAS) {
    return NextResponse.json(
      { erro: `Reservas podem ser feitas com no máximo ${LIMITE_ANTECEDENCIA_DIAS} dias de antecedência.` },
      { status: 400 }
    );
  }

  const diaSemana = dataReserva.getDay();
  const bloqueios = await sql`SELECT * FROM bloqueios WHERE sala_nome = ${sala} AND dia_semana = ${diaSemana};`;
  for (const b of bloqueios) {
    if (conflita(horaInicio, horaFim, b.hora_inicio, b.hora_fim)) {
      return NextResponse.json(
        { erro: `Este horário está bloqueado para ${sala} (${b.descricao || "horário reservado"}).` },
        { status: 409 }
      );
    }
  }

  const datas = recorrencia === "nenhuma"
    ? [{ dia, mes, ano }]
    : gerarDatasRecorrentes(dia, mes, ano, recorrencia, recorrenciaFim);

  if (datas.length === 0) {
    return NextResponse.json({ erro: "Nenhuma data gerada para a recorrência informada." }, { status: 400 });
  }
  if (datas.length > 104) {
    return NextResponse.json({ erro: "Recorrência muito longa. Máximo de 2 anos." }, { status: 400 });
  }

  const conflitos = [];
  for (const d of datas) {
    const existentes = await sql`
      SELECT hora_inicio, hora_fim FROM reservas
      WHERE sala_nome = ${sala} AND dia = ${d.dia} AND mes = ${d.mes} AND ano = ${d.ano};
    `;
    for (const ex of existentes) {
      if (conflita(horaInicio, horaFim, ex.hora_inicio, ex.hora_fim)) {
        conflitos.push(`${String(d.dia).padStart(2,"0")}/${String(d.mes+1).padStart(2,"0")}/${d.ano}`);
        break;
      }
    }
  }

  if (conflitos.length > 0) {
    return NextResponse.json(
      { erro: `Conflito de horário nas datas: ${conflitos.slice(0,5).join(", ")}${conflitos.length > 5 ? " e outras." : "."}` },
      { status: 409 }
    );
  }

  const ids = [];
  for (const d of datas) {
    const id = crypto.randomUUID();
    ids.push(id);
    await sql`
      INSERT INTO reservas (id, sala_nome, nome, evento, observacao, dia, mes, ano, hora_inicio, hora_fim, recorrente, recorrencia, recorrencia_fim)
      VALUES (${id}, ${sala}, ${nome}, ${evento}, ${observacao}, ${d.dia}, ${d.mes}, ${d.ano}, ${horaInicio}, ${horaFim}, ${recorrencia !== "nenhuma"}, ${recorrencia}, ${recorrenciaFim});
    `;
  }

  await notificarAdminEmail({ sala, nome, evento, observacao, dia, mes, ano, horaInicio, horaFim, recorrencia, totalDatas: datas.length });

  const primeiras = await sql`SELECT * FROM reservas WHERE id = ${ids[0]};`;
  return NextResponse.json({ ...primeiras[0], totalCriadas: datas.length }, { status: 201 });
}
