import nodemailer from 'nodemailer';

type PasswordResetEmailInput = {
  to: string;
  resetUrl: string;
};

type PasswordResetEmailResult =
  | { sent: true; provider: 'smtp' }
  | { sent: false; provider: 'none' | 'smtp'; reason: string };

export function isPasswordResetEmailConfigured(): boolean {
  return Boolean(
    process.env.SMTP_HOST &&
    process.env.SMTP_USER &&
    process.env.SMTP_PASS
  );
}

export async function sendPasswordResetEmail({
  to,
  resetUrl,
}: PasswordResetEmailInput): Promise<PasswordResetEmailResult> {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT ?? '587');
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM ?? `"Solara Plural" <${user}>`;

  if (!host || !user || !pass) {
    return {
      sent: false,
      provider: 'none',
      reason: 'SMTP_HOST, SMTP_USER, and SMTP_PASS are not configured.',
    };
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });

  try {
    await transporter.sendMail({
      from,
      to,
      subject: 'Reset your Solara Plural password',
      text: [
        'Someone requested a password reset for your Solara Plural account.',
        '',
        'Use the link below to set a new password. This link expires in 30 minutes.',
        '',
        resetUrl,
        '',
        'If you did not request this, you can safely ignore this email.',
        'Your password will not change until you click the link above.',
      ].join('\n'),
      html: `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0f0f13;font-family:system-ui,-apple-system,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f0f13;padding:40px 20px;">
    <tr><td align="center">
      <table width="100%" style="max-width:520px;background:#1a1a24;border-radius:16px;padding:40px;border:1px solid rgba(255,255,255,0.08);">
        <tr><td style="text-align:center;padding-bottom:32px;">
          <div style="display:inline-block;width:56px;height:56px;border-radius:50%;background:rgba(255,180,50,0.15);line-height:56px;font-size:28px;margin-bottom:16px;">&#9728;&#65039;</div>
          <h1 style="margin:0;font-size:22px;font-weight:700;color:#f0e6d3;">Solara Plural</h1>
        </td></tr>
        <tr><td>
          <h2 style="margin:0 0 12px;font-size:18px;font-weight:600;color:#f0e6d3;">Reset your password</h2>
          <p style="margin:0 0 24px;font-size:14px;color:#a09080;line-height:1.6;">
            Someone requested a password reset for your account. Click the button below to set a new password.
            This link expires in <strong style="color:#f0e6d3;">30 minutes</strong>.
          </p>
          <div style="text-align:center;margin-bottom:28px;">
            <a href="${resetUrl}" style="display:inline-block;background:#f5a623;color:#0f0f13;font-weight:700;font-size:15px;padding:14px 32px;border-radius:10px;text-decoration:none;">
              Reset password
            </a>
          </div>
          <p style="margin:0;font-size:12px;color:#6b5a4a;line-height:1.6;border-top:1px solid rgba(255,255,255,0.06);padding-top:20px;">
            If you did not request this reset, you can safely ignore this email — your password will not change.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
    });

    return { sent: true, provider: 'smtp' };
  } catch (error) {
    return {
      sent: false,
      provider: 'smtp',
      reason: error instanceof Error ? error.message : 'Unknown error.',
    };
  }
}
