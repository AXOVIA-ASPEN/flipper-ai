/**
 * @file src/lib/communication-email-templates.ts
 * @author Stephen Boyett
 * @company Axovia
 * @date 2026-04-08
 * @version 1.0
 * @brief Email templates for communication (message) notification emails.
 *
 * @description
 * Provides HTML and plain-text email templates for the three communication
 * notification event types introduced in Story 10.4:
 *   - messageReceivedEmail  — seller replied to a conversation thread
 *   - draftReadyEmail       — AI generated a draft message for user review
 *   - messageSentEmail      — an outbound message was successfully sent
 *
 * All templates follow the same base layout and inline-style conventions as
 * the existing email-templates.ts module so that visual output is consistent
 * across the application.
 */

// ---------------------------------------------------------------------------
// Shared constants (mirror email-templates.ts values)
// ---------------------------------------------------------------------------

const BRAND_COLOR = '#2563eb';
const BRAND_COLOR_DARK = '#1d4ed8';
const BG_COLOR = '#f8fafc';
const CARD_COLOR = '#ffffff';
const TEXT_PRIMARY = '#0f172a';
const TEXT_SECONDARY = '#64748b';
const TEXT_MUTED = '#94a3b8';
const BORDER_COLOR = '#e2e8f0';
const SUCCESS_COLOR = '#16a34a';
const WARNING_COLOR = '#d97706';

// ---------------------------------------------------------------------------
// Layout helpers (duplicated from email-templates.ts to keep modules
// independent — avoids coupling internal helper functions)
// ---------------------------------------------------------------------------

function baseLayout(content: string, previewText?: string): string {
  const preview = previewText
    ? `<div style="display:none;max-height:0;overflow:hidden;">${previewText}</div>`
    : /* istanbul ignore next */ '';
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1.0" />
  <title>Flipper AI</title>
</head>
<body style="margin:0;padding:0;background-color:${BG_COLOR};font-family:'Segoe UI',Arial,sans-serif;">
  ${preview}
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color:${BG_COLOR};">
    <tr>
      <td align="center" style="padding:40px 20px;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="max-width:600px;width:100%;background-color:${CARD_COLOR};border-radius:12px;border:1px solid ${BORDER_COLOR};overflow:hidden;">
          <tr>
            <td style="background:linear-gradient(135deg,${BRAND_COLOR} 0%,${BRAND_COLOR_DARK} 100%);padding:32px 40px;text-align:center;">
              <span style="display:inline-block;font-size:28px;font-weight:800;color:#ffffff;letter-spacing:-0.5px;">
                🐧 Flipper AI
              </span>
            </td>
          </tr>
          <tr>
            <td style="padding:40px;color:${TEXT_PRIMARY};">
              ${content}
            </td>
          </tr>
          <tr>
            <td style="background-color:${BG_COLOR};padding:24px 40px;border-top:1px solid ${BORDER_COLOR};text-align:center;">
              <p style="margin:0 0 8px 0;font-size:12px;color:${TEXT_MUTED};">
                You're receiving this email because you signed up for Flipper AI.
              </p>
              <p style="margin:0;font-size:12px;color:${TEXT_MUTED};">
                <a href="{{unsubscribe_url}}" style="color:${BRAND_COLOR};text-decoration:none;">Unsubscribe</a>
                &nbsp;·&nbsp;
                <a href="{{settings_url}}" style="color:${BRAND_COLOR};text-decoration:none;">Email Preferences</a>
                &nbsp;·&nbsp;
                <a href="{{app_url}}" style="color:${BRAND_COLOR};text-decoration:none;">Open App</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function btn(text: string, href: string, color = BRAND_COLOR): string {
  return `<a href="${href}" style="display:inline-block;background-color:${color};color:#ffffff;font-size:15px;font-weight:600;padding:12px 28px;border-radius:8px;text-decoration:none;margin-top:16px;">${text}</a>`;
}

function divider(): string {
  return `<hr style="border:none;border-top:1px solid ${BORDER_COLOR};margin:28px 0;" />`;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function resolveFooter(html: string, opts: { unsubscribeUrl: string; settingsUrl: string; appUrl: string }): string {
  return html
    .replace(/\{\{unsubscribe_url\}\}/g, opts.unsubscribeUrl)
    .replace(/\{\{settings_url\}\}/g, opts.settingsUrl)
    .replace(/\{\{app_url\}\}/g, opts.appUrl);
}

// ---------------------------------------------------------------------------
// Message Received Email  (AC1 — FR-NOTIFY-02)
// ---------------------------------------------------------------------------

export interface MessageReceivedEmailOptions {
  email: string;
  sellerName: string;
  messagePreview: string;
  listingTitle: string;
  threadUrl: string;
  appUrl: string;
  unsubscribeUrl: string;
  settingsUrl: string;
}

export function messageReceivedEmailHtml(opts: MessageReceivedEmailOptions): string {
  const sellerNameSafe = escapeHtml(opts.sellerName);
  const listingTitleSafe = escapeHtml(opts.listingTitle);
  const messagePreviewSafe = escapeHtml(opts.messagePreview);
  const body = `
    <h1 style="margin:0 0 8px 0;font-size:24px;font-weight:700;color:${TEXT_PRIMARY};">New Message from Seller 💬</h1>
    <p style="margin:0 0 24px 0;font-size:16px;line-height:1.6;color:${TEXT_SECONDARY};">
      <strong>${sellerNameSafe}</strong> replied to your inquiry about <strong>${listingTitleSafe}</strong>.
    </p>

    <div style="background-color:${BG_COLOR};border:1px solid ${BORDER_COLOR};border-left:4px solid ${BRAND_COLOR};border-radius:8px;padding:20px;margin-bottom:24px;">
      <p style="margin:0 0 6px 0;font-size:12px;font-weight:600;color:${TEXT_MUTED};text-transform:uppercase;letter-spacing:0.5px;">
        Message Preview
      </p>
      <p style="margin:0;font-size:15px;line-height:1.6;color:${TEXT_PRIMARY};">
        &ldquo;${messagePreviewSafe}&rdquo;
      </p>
    </div>

    <div style="text-align:center;">
      ${btn('View & Reply →', opts.threadUrl)}
    </div>

    ${divider()}

    <p style="margin:0;font-size:14px;color:${TEXT_MUTED};text-align:center;">
      Respond quickly to improve your chances of closing this flip!<br/>
      <a href="${opts.settingsUrl}" style="color:${BRAND_COLOR};text-decoration:none;">Manage notifications</a> ·
      <a href="${opts.unsubscribeUrl}" style="color:${BRAND_COLOR};text-decoration:none;">Unsubscribe</a>
    </p>
  `;

  return resolveFooter(
    baseLayout(body, `${sellerNameSafe} replied: "${messagePreviewSafe.slice(0, 60)}"`),
    opts
  );
}

export function messageReceivedEmailText(opts: MessageReceivedEmailOptions): string {
  return `New Message from Seller

${opts.sellerName} replied to your inquiry about "${opts.listingTitle}".

"${opts.messagePreview}"

View & Reply: ${opts.threadUrl}

---
Manage notifications: ${opts.settingsUrl}
Unsubscribe: ${opts.unsubscribeUrl}
`;
}

// ---------------------------------------------------------------------------
// Draft Ready Email  (AC2 — FR-NOTIFY-03)
// ---------------------------------------------------------------------------

export interface DraftReadyEmailOptions {
  email: string;
  listingTitle: string;
  draftPreview: string;
  reviewUrl: string;
  appUrl: string;
  unsubscribeUrl: string;
  settingsUrl: string;
}

export function draftReadyEmailHtml(opts: DraftReadyEmailOptions): string {
  const listingTitleSafe = escapeHtml(opts.listingTitle);
  const draftPreviewSafe = escapeHtml(opts.draftPreview);
  const body = `
    <h1 style="margin:0 0 8px 0;font-size:24px;font-weight:700;color:${TEXT_PRIMARY};">AI Draft Ready for Review ✍️</h1>
    <p style="margin:0 0 24px 0;font-size:16px;line-height:1.6;color:${TEXT_SECONDARY};">
      Flipper AI has drafted a message for <strong>${listingTitleSafe}</strong>. Review and send it when you're ready.
    </p>

    <div style="background-color:#eff6ff;border:1px solid #bfdbfe;border-left:4px solid ${BRAND_COLOR};border-radius:8px;padding:20px;margin-bottom:24px;">
      <p style="margin:0 0 6px 0;font-size:12px;font-weight:600;color:${BRAND_COLOR};text-transform:uppercase;letter-spacing:0.5px;">
        Draft Preview
      </p>
      <p style="margin:0;font-size:15px;line-height:1.6;color:${TEXT_PRIMARY};">
        &ldquo;${draftPreviewSafe}&rdquo;
      </p>
    </div>

    <div style="text-align:center;">
      ${btn('Review & Approve →', opts.reviewUrl, WARNING_COLOR)}
    </div>

    ${divider()}

    <p style="margin:0;font-size:14px;color:${TEXT_MUTED};text-align:center;">
      Always review AI-generated messages before sending.<br/>
      <a href="${opts.settingsUrl}" style="color:${BRAND_COLOR};text-decoration:none;">Manage notifications</a> ·
      <a href="${opts.unsubscribeUrl}" style="color:${BRAND_COLOR};text-decoration:none;">Unsubscribe</a>
    </p>
  `;

  return resolveFooter(
    baseLayout(body, `AI draft ready for "${listingTitleSafe}" — review before sending`),
    opts
  );
}

export function draftReadyEmailText(opts: DraftReadyEmailOptions): string {
  return `AI Draft Ready for Review

Flipper AI has drafted a message for "${opts.listingTitle}".

Draft:
"${opts.draftPreview}"

Review & Approve: ${opts.reviewUrl}

Always review AI-generated messages before sending.

---
Manage notifications: ${opts.settingsUrl}
Unsubscribe: ${opts.unsubscribeUrl}
`;
}

// ---------------------------------------------------------------------------
// Message Sent Email  (AC3 — FR-NOTIFY-04)
// ---------------------------------------------------------------------------

export interface MessageSentEmailOptions {
  email: string;
  listingTitle: string;
  messagePreview: string;
  deliveryStatus: string;
  threadUrl: string;
  appUrl: string;
  unsubscribeUrl: string;
  settingsUrl: string;
}

export function messageSentEmailHtml(opts: MessageSentEmailOptions): string {
  const listingTitleSafe = escapeHtml(opts.listingTitle);
  const messagePreviewSafe = escapeHtml(opts.messagePreview);
  const deliveryStatusSafe = escapeHtml(opts.deliveryStatus);
  const body = `
    <h1 style="margin:0 0 8px 0;font-size:24px;font-weight:700;color:${TEXT_PRIMARY};">Message Sent ✅</h1>
    <p style="margin:0 0 24px 0;font-size:16px;line-height:1.6;color:${TEXT_SECONDARY};">
      Your message about <strong>${listingTitleSafe}</strong> was sent successfully.
    </p>

    <div style="background-color:#f0fdf4;border:1px solid #bbf7d0;border-left:4px solid ${SUCCESS_COLOR};border-radius:8px;padding:20px;margin-bottom:16px;">
      <p style="margin:0 0 6px 0;font-size:12px;font-weight:600;color:${SUCCESS_COLOR};text-transform:uppercase;letter-spacing:0.5px;">
        Sent Message
      </p>
      <p style="margin:0;font-size:15px;line-height:1.6;color:${TEXT_PRIMARY};">
        &ldquo;${messagePreviewSafe}&rdquo;
      </p>
    </div>

    <p style="margin:0 0 24px 0;font-size:14px;color:${TEXT_SECONDARY};">
      Delivery status: <strong style="color:${SUCCESS_COLOR};">${deliveryStatusSafe}</strong>
    </p>

    <div style="text-align:center;">
      ${btn('View Thread →', opts.threadUrl)}
    </div>

    ${divider()}

    <p style="margin:0;font-size:14px;color:${TEXT_MUTED};text-align:center;">
      <a href="${opts.settingsUrl}" style="color:${BRAND_COLOR};text-decoration:none;">Manage notifications</a> ·
      <a href="${opts.unsubscribeUrl}" style="color:${BRAND_COLOR};text-decoration:none;">Unsubscribe</a>
    </p>
  `;

  return resolveFooter(
    baseLayout(body, `Message sent for "${listingTitleSafe}" — delivery status: ${deliveryStatusSafe}`),
    opts
  );
}

export function messageSentEmailText(opts: MessageSentEmailOptions): string {
  return `Message Sent

Your message about "${opts.listingTitle}" was sent successfully.

"${opts.messagePreview}"

Delivery status: ${opts.deliveryStatus}

View Thread: ${opts.threadUrl}

---
Manage notifications: ${opts.settingsUrl}
Unsubscribe: ${opts.unsubscribeUrl}
`;
}
