import { Resend } from "resend";

let _resend: Resend | null | undefined;

export function getResend(): Resend | null {
  if (_resend !== undefined) return _resend;
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    _resend = null;
    return null;
  }
  _resend = new Resend(key);
  return _resend;
}

function getFromAddress(): string {
  return process.env.RESEND_FROM ?? "guides@saaspocalypse.dev";
}

export async function sendGuideMagicLink(args: {
  email: string;
  reportName: string;
  magicLink: string;
}): Promise<void> {
  const resend = getResend();
  if (!resend) {
    console.log(
      `[email] RESEND_API_KEY missing — would send to ${args.email}: ${args.magicLink}`,
    );
    return;
  }

  const subject = `Your ${args.reportName} build guide is ready`;
  const text = `Your saaspocalypse build guide for ${args.reportName} is ready.

Open it here:
${args.magicLink}

This link is yours forever. Save the email.

— the robot
`;

  const html = `<!doctype html>
<html>
  <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background:#f4f1e8; color:#0a0a0a; padding: 32px;">
    <div style="max-width: 560px; margin: 0 auto; background:#ffffff; border: 2.5px solid #0a0a0a; box-shadow: 5px 5px 0 0 #0a0a0a; padding: 28px;">
      <div style="font-size: 11px; letter-spacing: 0.1em; text-transform: uppercase; background:#0a0a0a; color:#c6ff00; padding: 4px 10px; display: inline-block; font-weight: 700;">SAASPOCALYPSE</div>
      <h1 style="font-size: 22px; margin: 18px 0 6px; letter-spacing: -0.02em;">Your build guide is ready.</h1>
      <p style="margin: 0 0 18px; line-height: 1.5;">Full step-by-step guide for <strong>${escapeHtml(args.reportName)}</strong>, with copy-paste LLM prompts for Claude / Cursor / Copilot.</p>
      <p style="margin: 0 0 18px;">
        <a href="${args.magicLink}" style="display:inline-block; background:#c6ff00; color:#0a0a0a; text-decoration:none; font-weight:700; padding: 14px 22px; border: 2.5px solid #0a0a0a; box-shadow: 4px 4px 0 0 #0a0a0a;">→ open your build guide</a>
      </p>
      <p style="margin: 0; font-size: 12px; opacity: 0.7; line-height: 1.5;">This link is yours forever. Bookmark it, or keep this email.</p>
    </div>
    <p style="max-width: 560px; margin: 16px auto 0; font-size: 11px; color: #666; text-align: center;">— a robot, from saaspocalypse</p>
  </body>
</html>`;

  await resend.emails.send({
    from: getFromAddress(),
    to: args.email,
    subject,
    text,
    html,
  });
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
