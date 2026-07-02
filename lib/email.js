export async function notificarAdminEmail(reserva) {
  const apiKey = process.env.RESEND_API_KEY;
  const from   = process.env.EMAIL_FROM;
  const to     = process.env.EMAIL_ADMIN;

  if (!apiKey || !from || !to) {
    console.warn("[email] Resend não configurado — aviso não enviado.");
    return;
  }

  const { sala, nome, evento, observacao, dia, mes, ano, horaInicio, horaFim, recorrencia, totalDatas } = reserva;
  const dataFmt = `${String(dia).padStart(2,"0")}/${String(mes+1).padStart(2,"0")}/${ano}`;
  const destinatarios = to.split(",").map(e => e.trim()).filter(Boolean);

  const recorrenciaInfo = recorrencia && recorrencia !== "nenhuma"
    ? `<tr><td style="padding:8px 0;color:#5C7976;width:110px;">Recorrência</td><td style="padding:8px 0;font-weight:700;">${recorrencia} (${totalDatas} datas criadas)</td></tr>`
    : "";
  const obsInfo = observacao
    ? `<tr><td style="padding:8px 0;color:#5C7976;">Observação</td><td style="padding:8px 0;">${observacao}</td></tr>`
    : "";

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;border:1px solid #ddd;border-radius:12px;overflow:hidden;">
      <div style="background:#0E8E89;padding:20px 24px;">
        <h2 style="color:#fff;margin:0;font-size:18px;">🗓️ Nova Reserva Cadastrada</h2>
        <p style="color:rgba(255,255,255,0.85);margin:4px 0 0;font-size:13px;">Assembleia de Deus Louveira</p>
      </div>
      <div style="padding:24px;background:#fff;">
        <table style="width:100%;border-collapse:collapse;font-size:14px;">
          <tr><td style="padding:8px 0;color:#5C7976;width:110px;">Sala / Nave</td><td style="padding:8px 0;font-weight:700;">${sala}</td></tr>
          <tr><td style="padding:8px 0;color:#5C7976;">Data</td><td style="padding:8px 0;font-weight:700;">${dataFmt}</td></tr>
          <tr><td style="padding:8px 0;color:#5C7976;">Horário</td><td style="padding:8px 0;font-weight:700;">${horaInicio} – ${horaFim}</td></tr>
          <tr><td style="padding:8px 0;color:#5C7976;">Evento</td><td style="padding:8px 0;font-weight:700;">${evento}</td></tr>
          <tr><td style="padding:8px 0;color:#5C7976;">Solicitante</td><td style="padding:8px 0;font-weight:700;">${nome}</td></tr>
          ${recorrenciaInfo}${obsInfo}
        </table>
      </div>
      <div style="padding:14px 24px;background:#F4F8F7;border-top:1px solid #ddd;text-align:center;font-size:12px;color:#5C7976;">
        Sistema de Reservas — Assembleia de Deus Louveira
      </div>
    </div>
  `;

  try {
    const resposta = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: destinatarios, subject: `🗓️ Nova Reserva — ${sala} em ${dataFmt}`, html }),
    });
    if (!resposta.ok) {
      const d = await resposta.text();
      console.error("[email] Falha Resend:", resposta.status, d);
    }
  } catch (e) {
    console.error("[email] Erro:", e);
  }
}
