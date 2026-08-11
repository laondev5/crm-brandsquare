import "server-only";
import nodemailer from "nodemailer";

/**
 * With no SMTP host configured the invite is logged instead of sent, so the
 * flow stays testable in development without wiring up a mail provider.
 */
function transport() {
  if (!process.env.SMTP_HOST) return null;
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === "true",
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD }
      : undefined,
  });
}

export async function sendInvite(opts: {
  to: string;
  name: string;
  tempPassword: string;
  link: string;
}) {
  const subject = "Your Brandsquare CRM account";
  const text = [
    `Hi ${opts.name},`,
    ``,
    `An account has been created for you on the Brandsquare CRM.`,
    ``,
    `Email:              ${opts.to}`,
    `Temporary password: ${opts.tempPassword}`,
    ``,
    `Set your own password here — the link works once and expires in 48 hours:`,
    opts.link,
    ``,
    `If you weren't expecting this, you can ignore it.`,
  ].join("\n");

  // A full document (not a bare fragment) plus an explicit target/rel on the
  // button avoids two real-world failure modes seen in stricter/custom email
  // viewers: quirks-mode parsing of unwrapped HTML, and viewers that render
  // messages in a sandboxed iframe and only allow navigation from links that
  // declare target="_blank". A plain visible URL is included as a fallback
  // in case a viewer still swallows the styled button's click.
  const html = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${escapeHtml(subject)}</title>
  </head>
  <body style="margin:0;padding:0;background:#F7F7F9">
  <div style="font-family:Arial,Helvetica,sans-serif;color:#2c2c33;max-width:520px;margin:0 auto;padding:24px 20px">
    <p>Hi ${escapeHtml(opts.name)},</p>
    <p>An account has been created for you on the Brandsquare CRM.</p>
    <table cellpadding="0" cellspacing="0" style="background:#F7F7F9;border-radius:8px;padding:16px;margin:18px 0">
      <tr><td style="padding:4px 0"><strong>Email</strong></td><td style="padding:4px 0 4px 16px">${escapeHtml(opts.to)}</td></tr>
      <tr><td style="padding:4px 0"><strong>Temporary password</strong></td><td style="padding:4px 0 4px 16px"><code>${escapeHtml(opts.tempPassword)}</code></td></tr>
    </table>
    <p>
      <a href="${opts.link}" target="_blank" rel="noopener noreferrer"
         style="display:inline-block;background:#F86E06;color:#fff;text-decoration:none;
         font-weight:bold;padding:13px 26px;border-radius:8px">Set your password</a>
    </p>
    <p style="color:#7A7A7A;font-size:13px">
      If the button above doesn't respond, use this link instead:<br>
      <a href="${opts.link}" target="_blank" rel="noopener noreferrer" style="color:#F86E06;word-break:break-all">${escapeHtml(opts.link)}</a>
    </p>
    <p style="color:#7A7A7A;font-size:13px">
      The link works once and expires in 48 hours. If you weren't expecting this, ignore this email.
    </p>
  </div>
  </body>
</html>`;

  const t = transport();
  if (!t) {
    console.log("\n--- INVITE (no SMTP configured, not sent) ---");
    console.log(text);
    console.log("--------------------------------------------\n");
    return { sent: false as const };
  }

  await t.sendMail({
    from: process.env.MAIL_FROM || "Brandsquare <no-reply@localhost>",
    to: opts.to,
    subject,
    text,
    html,
  });
  return { sent: true as const };
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));
}
