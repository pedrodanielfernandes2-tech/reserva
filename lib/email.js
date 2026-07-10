import nodemailer from "nodemailer";
import { getConfig } from "@/lib/db";
import { sql } from "@/lib/sql";

async function enviar(destinatarios, assunto, html) {
  const gmailUser = process.env.GMAIL_USER;
  const gmailPass = process.env.GMAIL_PASS;

  if (!gmailUser || !gmailPass || !destinatarios.length) {
    console.warn("[email] Não configurado ou sem destinatários.");
    return;
  }

  const unicos = [...new Set(destinatarios.filter(Boolean))];
  if (!unicos.length) return;

  try {
    const t = nodemailer.createTransport({ service: "gmail", auth: { user: gmailUser, pass: gmailPass } });
    await t.sendMail({ from: `"Reservas AD Louveira" <${gmailUser}>`, to: unicos.join(", "), subject: assunto, html });
    console.log(`[email] Enviado para: ${unicos.join(", ")}`);
  } catch (e) {
    console.error("[email] Erro:", e.message);
  }
}

function htmlReserva(r, mensagemExtra) {
  const dataFmt = `${String(r.dia).padStart(2,"0")}/${String(r.mes+1).padStart(2,"0")}/${r.ano}`;
  const recursos = [
    r.precisaSom && "🎤 Som",
    r.precisaProjecao && "📽️ Projeção",
    r.precisaFotografia && "📷 Fotografia",
    r.precisaTransmissao && "📡 Transmissão",
    r.qtdMesas > 0 && `🪑 ${r.qtdMesas} mesa(s)`,
    r.qtdCadeiras > 0 && `💺 ${r.qtdCadeiras} cadeira(s)`,
  ].filter(Boolean).join(" · ");

  const rows = [
    ["Sala / Nave", r.sala],
    ["Tipo", r.tipoEvento === "evento_externo" ? "Evento Externo" : "Regular"],
    ["Data", dataFmt],
    ["Horário", `${r.horaInicio} – ${r.horaFim}`],
    ["Evento", r.evento],
    ["Solicitante", r.nome],
    recursos && ["Recursos", recursos],
    r.observacao && ["Observação", r.observacao],
    r.recorrencia !== "nenhuma" && ["Recorrência", `${r.recorrencia} (${r.totalDatas} datas)`],
  ].filter(Boolean);

  const trs = rows.map(([k, v]) =>
    `<tr><td style="padding:8px 0;color:#5C7976;width:120px;">${k}</td><td style="padding:8px 0;font-weight:700;">${v}</td></tr>`
  ).join("");

  const msg = mensagemExtra
    ? `<p style="margin:0 0 6px;font-size:13px;color:#5C7976;">${mensagemExtra}</p>` : "";

  return `
    <div style="font-family:Arial,sans-serif;max-width:500px;margin:0 auto;border:1px solid #ddd;border-radius:12px;overflow:hidden;">
      <div style="background:#0E8E89;padding:20px 24px;">
        <h2 style="color:#fff;margin:0;font-size:18px;">🗓️ Nova Reserva Cadastrada</h2>
        <p style="color:rgba(255,255,255,0.85);margin:4px 0 0;font-size:13px;">Assembleia de Deus Louveira</p>
      </div>
      <div style="padding:24px;background:#fff;">
        <table style="width:100%;border-collapse:collapse;font-size:14px;">${trs}</table>
      </div>
      <div style="padding:14px 24px;background:#F4F8F7;border-top:1px solid #ddd;font-size:12px;color:#5C7976;">
        ${msg}<p style="margin:0;text-align:center;">Sistema de Reservas — Assembleia de Deus Louveira</p>
      </div>
    </div>`;
}

export async function notificarAdminEmail(reserva) {
  let config = {};
  try { config = await getConfig(); } catch(e) {}

  const mensagemExtra = config.email_mensagem || "";
  const html = htmlReserva(reserva, mensagemExtra);
  const assunto = `🗓️ Nova Reserva — ${reserva.sala} em ${String(reserva.dia).padStart(2,"0")}/${String(reserva.mes+1).padStart(2,"0")}/${reserva.ano}`;

  // E-mail admin geral
  const adminEmails = (config.email_admin || "").split(",").map(e => e.trim()).filter(Boolean);

  // Contatos específicos por recurso
  let contatosDB = [];
  try { contatosDB = await sql`SELECT * FROM contatos_notificacao;`; } catch(e) {}

  const recursos = {
    som: Boolean(reserva.precisaSom),
    projecao: Boolean(reserva.precisaProjecao),
    fotografia: Boolean(reserva.precisaFotografia),
    mesa_cadeira: (reserva.qtdMesas > 0 || reserva.qtdCadeiras > 0),
  };

  const contatosFiltrados = contatosDB
    .filter(c => {
      if (c.recebe_todas) return true;
      if (recursos.som && c.recebe_som) return true;
      if (recursos.projecao && c.recebe_projecao) return true;
      if (recursos.fotografia && c.recebe_fotografia) return true;
      if (recursos.mesa_cadeira && c.recebe_mesa_cadeira) return true;
      return false;
    })
    .map(c => c.email);

  const todos = [...new Set([...adminEmails, ...contatosFiltrados])];
  await enviar(todos, assunto, html);
}
