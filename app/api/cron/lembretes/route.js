import { NextResponse } from "next/server";
import { sql } from "@/lib/sql";
import { ensureSchema, getConfig } from "@/lib/db";

// Rota: GET /api/cron/lembretes
// Executada todo dia às 8h via Vercel Cron (vercel.json)
// Envia lembrete por e-mail para responsáveis com reservas amanhã

export async function GET(request) {
  // Segurança: só aceita chamadas da Vercel (header Authorization)
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ erro: "Não autorizado." }, { status: 401 });
  }

  await ensureSchema();

  const agora = new Date();
  const amanha = new Date(agora);
  amanha.setDate(amanha.getDate() + 1);
  const dia = amanha.getDate();
  const mes = amanha.getMonth(); // 0-indexed
  const ano = amanha.getFullYear();

  const reservas = await sql`
    SELECT * FROM reservas
    WHERE dia = ${dia} AND mes = ${mes} AND ano = ${ano}
    ORDER BY hora_inicio ASC;
  `;

  if (!reservas.length) {
    return NextResponse.json({ ok: true, mensagem: "Nenhuma reserva amanhã." });
  }

  const contatos = await sql`SELECT * FROM contatos_notificacao;`;
  const config = await getConfig();
  const adminEmails = (config.email_admin || "").split(",").map(e => e.trim()).filter(Boolean);

  // Monta HTML do lembrete
  const dataFmt = `${String(dia).padStart(2,"0")}/${String(mes+1).padStart(2,"0")}/${ano}`;
  const DIAS = ["Domingo","Segunda","Terça","Quarta","Quinta","Sexta","Sábado"];
  const diaSemana = DIAS[amanha.getDay()];

  const linhas = reservas.map(r => {
    const recursos = [
      r.precisa_som && "🎤 Som",
      r.precisa_projecao && "📽️ Projeção",
      r.precisa_fotografia && "📷 Fotografia",
      r.precisa_transmissao && "📡 Transmissão",
      r.qtd_mesas > 0 && `🪑 ${r.qtd_mesas} mesa(s)`,
      r.qtd_cadeiras > 0 && `💺 ${r.qtd_cadeiras} cadeira(s)`,
    ].filter(Boolean).join(", ");
    return `<tr style="border-top:1px solid #E2ECEB">
      <td style="padding:8px 10px;font-weight:700">${r.sala_nome}</td>
      <td style="padding:8px 10px">${r.hora_inicio} – ${r.hora_fim}</td>
      <td style="padding:8px 10px">${r.evento}</td>
      <td style="padding:8px 10px;color:#5C7976">${r.nome}</td>
      <td style="padding:8px 10px;font-size:12px;color:#0E8E89">${recursos||"—"}</td>
    </tr>`;
  }).join("");

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;border:1px solid #ddd;border-radius:12px;overflow:hidden">
      <div style="background:#0E8E89;padding:20px 24px">
        <h2 style="color:#fff;margin:0;font-size:18px">⏰ Lembrete de Reservas — Amanhã</h2>
        <p style="color:rgba(255,255,255,.85);margin:4px 0 0;font-size:13px">${diaSemana}, ${dataFmt}</p>
      </div>
      <div style="padding:20px 24px;background:#fff">
        <p style="margin:0 0 16px;font-size:14px;color:#333">Estas reservas estão agendadas para <b>amanhã</b>:</p>
        <table style="width:100%;border-collapse:collapse;font-size:13px">
          <thead style="background:#F4F8F7">
            <tr>
              <th style="padding:8px 10px;text-align:left">Sala</th>
              <th style="padding:8px 10px;text-align:left">Horário</th>
              <th style="padding:8px 10px;text-align:left">Evento</th>
              <th style="padding:8px 10px;text-align:left">Solicitante</th>
              <th style="padding:8px 10px;text-align:left">Recursos</th>
            </tr>
          </thead>
          <tbody>${linhas}</tbody>
        </table>
      </div>
      <div style="padding:14px 24px;background:#F4F8F7;border-top:1px solid #ddd;font-size:12px;color:#5C7976;text-align:center">
        Lembrete automático — Sistema de Reservas · Assembleia de Deus Louveira
      </div>
    </div>`;

  // Envia para admins
  const destinatarios = [...new Set(adminEmails)].filter(Boolean);

  // Adiciona contatos que recebem todas (para lembrete geral)
  contatos.filter(c => c.recebe_todas && c.email).forEach(c => {
    if (!destinatarios.includes(c.email)) destinatarios.push(c.email);
  });

  if (destinatarios.length && process.env.GMAIL_USER && process.env.GMAIL_PASS) {
    const nodemailer = (await import("nodemailer")).default;
    const t = nodemailer.createTransport({ service:"gmail", auth:{ user:process.env.GMAIL_USER, pass:process.env.GMAIL_PASS }});
    await t.sendMail({
      from: `"Reservas AD Louveira" <${process.env.GMAIL_USER}>`,
      to: destinatarios.join(", "),
      subject: `⏰ Lembrete: ${reservas.length} reserva(s) amanhã (${dataFmt})`,
      html
    });
  }

  return NextResponse.json({ ok: true, reservas: reservas.length, enviado_para: destinatarios });
}
