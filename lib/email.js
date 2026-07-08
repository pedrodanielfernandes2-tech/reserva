import nodemailer from "nodemailer";
import { getConfig } from "@/lib/db";

export async function notificarAdminEmail(reserva) {
  let config = {};
  try { config = await getConfig(); } catch(e) {
    console.warn("[email] Não foi possível carregar configurações:", e.message);
  }

  const gmailUser = process.env.GMAIL_USER;
  const gmailPass = process.env.GMAIL_PASS;
  const toRaw     = config.email_admin || process.env.EMAIL_ADMIN || "";
  const mensagemExtra = config.email_mensagem || "";

  if (!gmailUser || !gmailPass || !toRaw) {
    console.warn("[email] Nodemailer não configurado (faltam GMAIL_USER, GMAIL_PASS ou destinatários).");
    return;
  }

  const destinatarios = toRaw.split(",").map(e => e.trim()).filter(Boolean);

  const { sala, nome, evento, observacao, dia, mes, ano, horaInicio, horaFim, recorrencia, totalDatas, precisaSom, precisaProjecao } = reserva;
  const dataFmt = `${String(dia).padStart(2,"0")}/${String(mes+1).padStart(2,"0")}/${ano}`;

  const recursos = [precisaSom?"🎤 Som":null, precisaProjecao?"📽️ Projeção (Telão)":null].filter(Boolean).join(", ");
  const recursosInfo = recursos
    ? `<tr><td style="padding:8px 0;color:#5C7976;width:120px;">Recursos</td><td style="padding:8px 0;font-weight:700;">${recursos}</td></tr>`
    : "";

  const recorrenciaInfo = recorrencia && recorrencia !== "nenhuma"
    ? `<tr><td style="padding:8px 0;color:#5C7976;width:120px;">Recorrência</td><td style="padding:8px 0;font-weight:700;">${recorrencia} (${totalDatas} datas criadas)</td></tr>`
    : "";
  const obsInfo = observacao
    ? `<tr><td style="padding:8px 0;color:#5C7976;">Observação</td><td style="padding:8px 0;">${observacao}</td></tr>`
    : "";
  const msgExtra = mensagemExtra
    ? `<p style="margin:0 0 6px;font-size:13px;color:#5C7976;">${mensagemExtra}</p>`
    : "";

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;border:1px solid #ddd;border-radius:12px;overflow:hidden;">
      <div style="background:#0E8E89;padding:20px 24px;">
        <h2 style="color:#fff;margin:0;font-size:18px;">🗓️ Nova Reserva Cadastrada</h2>
        <p style="color:rgba(255,255,255,0.85);margin:4px 0 0;font-size:13px;">Assembleia de Deus Louveira</p>
      </div>
      <div style="padding:24px;background:#fff;">
        <table style="width:100%;border-collapse:collapse;font-size:14px;">
          <tr><td style="padding:8px 0;color:#5C7976;width:120px;">Sala / Nave</td><td style="padding:8px 0;font-weight:700;">${sala}</td></tr>
          <tr><td style="padding:8px 0;color:#5C7976;">Data</td><td style="padding:8px 0;font-weight:700;">${dataFmt}</td></tr>
          <tr><td style="padding:8px 0;color:#5C7976;">Horário</td><td style="padding:8px 0;font-weight:700;">${horaInicio} – ${horaFim}</td></tr>
          <tr><td style="padding:8px 0;color:#5C7976;">Evento</td><td style="padding:8px 0;font-weight:700;">${evento}</td></tr>
          <tr><td style="padding:8px 0;color:#5C7976;">Solicitante</td><td style="padding:8px 0;font-weight:700;">${nome}</td></tr>
          ${recorrenciaInfo}${obsInfo}${recursosInfo}
        </table>
      </div>
      <div style="padding:14px 24px;background:#F4F8F7;border-top:1px solid #ddd;font-size:12px;color:#5C7976;">
        ${msgExtra}
        <p style="margin:0;text-align:center;">Sistema de Reservas — Assembleia de Deus Louveira</p>
      </div>
    </div>
  `;

  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user: gmailUser, pass: gmailPass },
    });

    await transporter.sendMail({
      from: `"Reservas AD Louveira" <${gmailUser}>`,
      to: destinatarios.join(", "),
      subject: `🗓️ Nova Reserva — ${sala} em ${dataFmt}`,
      html,
    });

    console.log(`[email] Enviado para: ${destinatarios.join(", ")}`);
  } catch(e) {
    console.error("[email] Erro ao enviar via Nodemailer:", e.message);
  }
}
