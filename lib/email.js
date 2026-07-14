import nodemailer from "nodemailer";
import { getConfig } from "@/lib/db";
import { sql } from "@/lib/sql";

// Limpa número e monta URL do WhatsApp
function whatsappUrl(celular, mensagem) {
  if (!celular || !celular.trim()) return null;
  const num = celular.replace(/\D/g, '');
  if (num.length < 10) return null;
  const numero = num.startsWith('55') ? num : '55' + num;
  return `https://wa.me/${numero}?text=${encodeURIComponent(mensagem)}`;
}

function montarMensagemWhatsapp(r) {
  const dataFmt = `${String(r.dia).padStart(2,"0")}/${String(r.mes+1).padStart(2,"0")}/${r.ano}`;
  const recursos = [
    r.precisaSom && "Som",
    r.precisaProjecao && "Projecao",
    r.precisaFotografia && "Fotografia",
    r.precisaTransmissao && "Transmissao",
    r.qtdMesas > 0 && `${r.qtdMesas} mesa(s)`,
    r.qtdCadeiras > 0 && `${r.qtdCadeiras} cadeira(s)`,
  ].filter(Boolean).join(", ");

  return `*Nova Reserva - AD Louveira*\n\n` +
    `*Sala:* ${r.sala}\n` +
    `*Data:* ${dataFmt}\n` +
    `*Horario:* ${r.horaInicio} - ${r.horaFim}\n` +
    `*Evento:* ${r.evento}\n` +
    `*Solicitante:* ${r.nome}` +
    (recursos ? `\n*Recursos:* ${recursos}` : '') +
    (r.observacao ? `\n*Obs:* ${r.observacao}` : '');
}

function htmlReserva(r, mensagemExtra, whatsUrl) {
  const dataFmt = `${String(r.dia).padStart(2,"0")}/${String(r.mes+1).padStart(2,"0")}/${r.ano}`;
  const recursos = [
    r.precisaSom && "🎤 Som",
    r.precisaProjecao && "📽️ Projeção",
    r.precisaFotografia && "📷 Fotografia",
    r.precisaTransmissao && "📡 Transmissão",
    r.qtdMesas > 0 && `🪑 ${r.qtdMesas} mesa(s)`,
    r.qtdCadeiras > 0 && `💺 ${r.qtdCadeiras} cadeira(s)`,
  ].filter(Boolean).join(" · ");

  const rowData = [
    ["Sala / Nave", r.sala],
    r.tipoEvento === "evento_externo" && ["Tipo", "🏢 Evento Externo"],
    ["Data", dataFmt],
    ["Horário", `${r.horaInicio} – ${r.horaFim}`],
    ["Evento", r.evento],
    ["Solicitante", r.nome],
    recursos && ["Recursos", recursos],
    r.observacao && ["Observação", r.observacao],
    r.recorrencia !== "nenhuma" && ["Recorrência", `${r.recorrencia} (${r.totalDatas} datas)`],
  ].filter(Boolean);

  const trs = rowData.map(([k,v]) =>
    `<tr><td style="padding:8px 0;color:#5C7976;width:120px;font-size:14px;">${k}</td><td style="padding:8px 0;font-weight:700;font-size:14px;">${v}</td></tr>`
  ).join('');

  const btnWhats = whatsUrl ? `
    <div style="text-align:center;margin:20px 0 8px;">
      <a href="${whatsUrl}" target="_blank"
        style="display:inline-flex;align-items:center;gap:10px;background:#25D366;color:#fff;font-family:Arial,sans-serif;font-size:15px;font-weight:700;padding:12px 28px;border-radius:12px;text-decoration:none;">
        <img src="https://upload.wikimedia.org/wikipedia/commons/6/6b/WhatsApp.svg" width="22" height="22" style="vertical-align:middle"/>
        Abrir no WhatsApp
      </a>
      <p style="margin:8px 0 0;font-size:11px;color:#5C7976;">Clique para enviar a mensagem via WhatsApp</p>
    </div>` : '';

  const msg = mensagemExtra ? `<p style="margin:0 0 6px;font-size:13px;color:#5C7976;">${mensagemExtra}</p>` : "";

  return `
    <div style="font-family:Arial,sans-serif;max-width:500px;margin:0 auto;border:1px solid #ddd;border-radius:12px;overflow:hidden;">
      <div style="background:#0E8E89;padding:20px 24px;">
        <h2 style="color:#fff;margin:0;font-size:18px;">🗓️ Nova Reserva Cadastrada</h2>
        <p style="color:rgba(255,255,255,0.85);margin:4px 0 0;font-size:13px;">Assembleia de Deus Louveira</p>
      </div>
      <div style="padding:24px;background:#fff;">
        <table style="width:100%;border-collapse:collapse;">${trs}</table>
        ${btnWhats}
      </div>
      <div style="padding:14px 24px;background:#F4F8F7;border-top:1px solid #ddd;font-size:12px;color:#5C7976;">
        ${msg}<p style="margin:0;text-align:center;">Sistema de Reservas — Assembleia de Deus Louveira</p>
      </div>
    </div>`;
}

async function enviar(destinatarios, assunto, html) {
  const gmailUser = process.env.GMAIL_USER;
  const gmailPass = process.env.GMAIL_PASS;
  const unicos = [...new Set(destinatarios.filter(Boolean))];
  if (!gmailUser || !gmailPass || !unicos.length) return;
  try {
    const t = nodemailer.createTransport({ service: "gmail", auth: { user: gmailUser, pass: gmailPass } });
    await t.sendMail({ from: `"Reservas AD Louveira" <${gmailUser}>`, to: unicos.join(", "), subject: assunto, html });
    console.log(`[email] → ${unicos.join(", ")}`);
  } catch(e) { console.error("[email] Erro:", e.message); }
}

export async function notificarAdminEmail(reserva) {
  let config = {};
  try { config = await getConfig(); } catch(e) {}

  const mensagemExtra = config.email_mensagem || "";
  const adminEmails = (config.email_admin || "").split(",").map(e => e.trim()).filter(Boolean);
  const assunto = `🗓️ Nova Reserva — ${reserva.sala} em ${String(reserva.dia).padStart(2,"0")}/${String(reserva.mes+1).padStart(2,"0")}/${reserva.ano}`;

  const recursos = {
    som: Boolean(reserva.precisaSom),
    projecao: Boolean(reserva.precisaProjecao),
    fotografia: Boolean(reserva.precisaFotografia),
    mesa_cadeira: (reserva.qtdMesas > 0 || reserva.qtdCadeiras > 0),
  };

  // Busca contatos relevantes
  let contatosDB = [];
  try { contatosDB = await sql`SELECT * FROM contatos_notificacao;`; } catch(e) {}

  const contatosFiltrados = contatosDB.filter(c => {
    if (c.recebe_todas) return true;
    if (recursos.som && c.recebe_som) return true;
    if (recursos.projecao && c.recebe_projecao) return true;
    if (recursos.fotografia && c.recebe_fotografia) return true;
    if (recursos.mesa_cadeira && c.recebe_mesa_cadeira) return true;
    return false;
  });

  const msgWpp = montarMensagemWhatsapp(reserva);

  // Envia e-mail individual para cada contato (com botão WhatsApp personalizado)
  for (const c of contatosFiltrados) {
    const url = whatsappUrl(c.celular, msgWpp);
    await enviar([c.email], assunto, htmlReserva(reserva, mensagemExtra, url));
  }

  // Envia e-mail geral para admins (sem botão WhatsApp)
  if (adminEmails.length > 0) {
    // Remove emails que já receberam individualmente para não duplicar
    const emailsContatos = new Set(contatosFiltrados.map(c => c.email));
    const adminsExclusivos = adminEmails.filter(e => !emailsContatos.has(e));
    if (adminsExclusivos.length > 0) {
      await enviar(adminsExclusivos, assunto, htmlReserva(reserva, mensagemExtra, null));
    }
  }
}
