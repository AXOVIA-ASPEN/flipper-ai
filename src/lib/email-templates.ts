/**
 * Email HTML Templates for Flipper AI
 *
 * Responsive, inline-styled HTML templates for transactional and
 * notification emails. All styles are inlined for maximum email client
 * compatibility.
 */

// ---------------------------------------------------------------------------
// Shared layout helpers
// ---------------------------------------------------------------------------

const BRAND_COLOR = '#2563eb'; // blue-600
const BRAND_COLOR_DARK = '#1d4ed8'; // blue-700
const BG_COLOR = '#f8fafc'; // slate-50
const CARD_COLOR = '#ffffff';
const TEXT_PRIMARY = '#0f172a'; // slate-900
const TEXT_SECONDARY = '#64748b'; // slate-500
const TEXT_MUTED = '#94a3b8'; // slate-400
const BORDER_COLOR = '#e2e8f0'; // slate-200
const SUCCESS_COLOR = '#16a34a'; // green-600
const WARNING_COLOR = '#d97706'; // amber-600
const DANGER_COLOR = '#dc2626'; // red-600

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
  <!--[if mso]>
  <noscript>
    <xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml>
  </noscript>
  <![endif]-->
</head>
<body style="margin:0;padding:0;background-color:${BG_COLOR};font-family:'Segoe UI',Arial,sans-serif;">
  ${preview}
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color:${BG_COLOR};">
    <tr>
      <td align="center" style="padding:40px 20px;">
        <!-- Card -->
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="max-width:600px;width:100%;background-color:${CARD_COLOR};border-radius:12px;border:1px solid ${BORDER_COLOR};overflow:hidden;">
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,${BRAND_COLOR} 0%,${BRAND_COLOR_DARK} 100%);padding:32px 40px;text-align:center;">
              <span style="display:inline-block;font-size:28px;font-weight:800;color:#ffffff;letter-spacing:-0.5px;">
                🐧 Flipper AI
              </span>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:40px;color:${TEXT_PRIMARY};">
              ${content}
            </td>
          </tr>
          <!-- Footer -->
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

// ---------------------------------------------------------------------------
// Welcome Email
// ---------------------------------------------------------------------------

export interface WelcomeEmailOptions {
  name?: string;
  email: string;
  appUrl: string;
  unsubscribeUrl: string;
  settingsUrl: string;
}

export function welcomeEmailHtml(opts: WelcomeEmailOptions): string {
  const displayName = opts.name ? opts.name.split(' ')[0] : 'there';

  const body = `
    <h1 style="margin:0 0 8px 0;font-size:26px;font-weight:700;color:${TEXT_PRIMARY};">Welcome to Flipper AI, ${displayName}! 🎉</h1>
    <p style="margin:0 0 24px 0;font-size:16px;line-height:1.6;color:${TEXT_SECONDARY};">
      You're all set! Flipper AI scans multiple marketplaces in real time and uses AI
      to surface the best resale opportunities — so you can flip smarter, not harder.
    </p>

    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom:28px;">
      ${[
        ['🔍', 'Scan Marketplaces', 'Search eBay, Craigslist, Facebook Marketplace & more simultaneously.'],
        ['🤖', 'AI Price Analysis', 'Our AI identifies undervalued items and estimates resale profit.'],
        ['🔔', 'Instant Alerts', 'Get notified when deals matching your saved searches appear.'],
        ['📊', 'Profit Tracking', 'Track your inventory, ROI, and performance over time.'],
      ]
        .map(
          ([icon, title, desc]) => `
      <tr>
        <td style="padding:12px 0;border-bottom:1px solid ${BORDER_COLOR};">
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
            <tr>
              <td width="48" valign="top" style="font-size:24px;padding-top:4px;">${icon}</td>
              <td valign="top">
                <p style="margin:0 0 2px 0;font-size:15px;font-weight:600;color:${TEXT_PRIMARY};">${title}</p>
                <p style="margin:0;font-size:14px;color:${TEXT_SECONDARY};">${desc}</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>`
        )
        .join('')}
    </table>

    <div style="text-align:center;">
      ${btn('Get Started →', opts.appUrl)}
    </div>

    ${divider()}

    <p style="margin:0;font-size:14px;color:${TEXT_MUTED};text-align:center;">
      Questions? Just reply to this email — we're happy to help!
    </p>
  `
    .replace(/\{\{unsubscribe_url\}\}/g, opts.unsubscribeUrl)
    .replace(/\{\{settings_url\}\}/g, opts.settingsUrl)
    .replace(/\{\{app_url\}\}/g, opts.appUrl);

  return baseLayout(body, `Welcome to Flipper AI! Here's how to get started.`)
    .replace(/\{\{unsubscribe_url\}\}/g, opts.unsubscribeUrl)
    .replace(/\{\{settings_url\}\}/g, opts.settingsUrl)
    .replace(/\{\{app_url\}\}/g, opts.appUrl);
}

export function welcomeEmailText(opts: WelcomeEmailOptions): string {
  const displayName = opts.name ? opts.name.split(' ')[0] : 'there';
  return `Welcome to Flipper AI, ${displayName}!

You're all set. Flipper AI scans multiple marketplaces in real time and uses AI to surface the best resale opportunities.

GET STARTED: ${opts.appUrl}

HOW IT WORKS:
• Scan Marketplaces – Search eBay, Craigslist, Facebook & more simultaneously.
• AI Price Analysis – Our AI identifies undervalued items and estimates resale profit.
• Instant Alerts – Get notified when deals matching your saved searches appear.
• Profit Tracking – Track inventory, ROI, and performance over time.

Questions? Just reply to this email!

---
Unsubscribe: ${opts.unsubscribeUrl}
Email Preferences: ${opts.settingsUrl}
`;
}

// ---------------------------------------------------------------------------
// Daily Digest Email
// ---------------------------------------------------------------------------

export interface DigestOpportunity {
  title: string;
  price: number;
  estimatedResaleValue: number;
  profit: number;
  profitPercent: number;
  marketplace: string;
  url: string;
  imageUrl?: string;
}

export interface DigestEmailOptions {
  name?: string;
  email: string;
  opportunities: DigestOpportunity[];
  totalScanned: number;
  scanDate: string;
  appUrl: string;
  unsubscribeUrl: string;
  settingsUrl: string;
}

export function digestEmailHtml(opts: DigestEmailOptions): string {
  const displayName = opts.name ? opts.name.split(' ')[0] : 'there';
  const hasOpps = opts.opportunities.length > 0;

  const oppRows = opts.opportunities
    .slice(0, 5)
    .map(
      (opp) => `
    <tr>
      <td style="padding:16px 0;border-bottom:1px solid ${BORDER_COLOR};">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
          <tr>
            <td valign="top" style="padding-right:16px;">
              <p style="margin:0 0 4px 0;font-size:15px;font-weight:600;color:${TEXT_PRIMARY};">
                <a href="${opp.url}" style="color:${TEXT_PRIMARY};text-decoration:none;">${opp.title}</a>
              </p>
              <p style="margin:0 0 8px 0;font-size:13px;color:${TEXT_MUTED};">${opp.marketplace}</p>
              <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td style="background-color:#f0fdf4;border:1px solid #bbf7d0;border-radius:6px;padding:6px 12px;text-align:center;">
                    <p style="margin:0;font-size:12px;color:${SUCCESS_COLOR};font-weight:600;">
                      Est. +$${opp.profit.toFixed(0)} profit (${opp.profitPercent.toFixed(0)}%)
                    </p>
                  </td>
                </tr>
              </table>
            </td>
            <td valign="top" width="100" style="text-align:right;">
              <p style="margin:0;font-size:20px;font-weight:700;color:${TEXT_PRIMARY};">$${opp.price.toFixed(0)}</p>
              <p style="margin:0;font-size:12px;color:${TEXT_MUTED};">listing</p>
              <a href="${opp.url}" style="display:inline-block;margin-top:8px;font-size:12px;font-weight:600;color:${BRAND_COLOR};text-decoration:none;border:1px solid ${BRAND_COLOR};border-radius:6px;padding:4px 10px;">View →</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>`
    )
    .join('');

  const noOppsMsg = `
    <div style="text-align:center;padding:32px 0;">
      <p style="font-size:40px;margin:0 0 12px 0;">😴</p>
      <p style="margin:0;font-size:16px;color:${TEXT_SECONDARY};">No standout deals today — but we scanned ${opts.totalScanned.toLocaleString()} listings!</p>
      <p style="margin:8px 0 0 0;font-size:14px;color:${TEXT_MUTED};">Try adjusting your search criteria for more results.</p>
    </div>`;

  const body = `
    <h1 style="margin:0 0 4px 0;font-size:24px;font-weight:700;color:${TEXT_PRIMARY};">Your Daily Digest 📬</h1>
    <p style="margin:0 0 24px 0;font-size:14px;color:${TEXT_MUTED};">${opts.scanDate} · Hi ${displayName}!</p>

    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom:24px;">
      <tr>
        <td width="50%" style="padding-right:8px;">
          <div style="background-color:#eff6ff;border-radius:8px;padding:16px;text-align:center;">
            <p style="margin:0;font-size:28px;font-weight:700;color:${BRAND_COLOR};">${opts.opportunities.length}</p>
            <p style="margin:4px 0 0 0;font-size:12px;color:${TEXT_SECONDARY};">Top Opportunities</p>
          </div>
        </td>
        <td width="50%" style="padding-left:8px;">
          <div style="background-color:#f0fdf4;border-radius:8px;padding:16px;text-align:center;">
            <p style="margin:0;font-size:28px;font-weight:700;color:${SUCCESS_COLOR};">${opts.totalScanned.toLocaleString()}</p>
            <p style="margin:4px 0 0 0;font-size:12px;color:${TEXT_SECONDARY};">Listings Scanned</p>
          </div>
        </td>
      </tr>
    </table>

    ${hasOpps ? `<h2 style="margin:0 0 4px 0;font-size:18px;font-weight:600;color:${TEXT_PRIMARY};">Today's Best Deals</h2><table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">${oppRows}</table>` : noOppsMsg}

    <div style="text-align:center;margin-top:24px;">
      ${btn('See All Opportunities', opts.appUrl + '/opportunities')}
    </div>

    ${divider()}

    <p style="margin:0;font-size:14px;color:${TEXT_MUTED};text-align:center;">
      You're receiving this daily digest because email notifications are enabled.<br/>
      <a href="${opts.settingsUrl}" style="color:${BRAND_COLOR};text-decoration:none;">Change frequency</a> or
      <a href="${opts.unsubscribeUrl}" style="color:${BRAND_COLOR};text-decoration:none;">unsubscribe</a>.
    </p>
  `;

  return baseLayout(body, `Your daily Flipper AI digest — ${opts.opportunities.length} opportunities found.`)
    .replace(/\{\{unsubscribe_url\}\}/g, opts.unsubscribeUrl)
    .replace(/\{\{settings_url\}\}/g, opts.settingsUrl)
    .replace(/\{\{app_url\}\}/g, opts.appUrl);
}

export function digestEmailText(opts: DigestEmailOptions): string {
  const displayName = opts.name ? opts.name.split(' ')[0] : 'there';
  const lines = [
    `Your Daily Flipper AI Digest — ${opts.scanDate}`,
    `Hi ${displayName}!`,
    '',
    `📊 ${opts.opportunities.length} opportunities found from ${opts.totalScanned.toLocaleString()} listings scanned.`,
    '',
  ];

  if (opts.opportunities.length > 0) {
    lines.push("TODAY'S BEST DEALS:");
    opts.opportunities.slice(0, 5).forEach((opp, i) => {
      lines.push(
        `${i + 1}. ${opp.title} — $${opp.price.toFixed(0)} (Est. +$${opp.profit.toFixed(0)} profit)`
      );
      lines.push(`   ${opp.marketplace} | ${opp.url}`);
    });
  } else {
    lines.push('No standout deals today — try adjusting your search criteria.');
  }

  lines.push('', `View all: ${opts.appUrl}/opportunities`);
  lines.push('', '---', `Unsubscribe: ${opts.unsubscribeUrl}`, `Preferences: ${opts.settingsUrl}`);
  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Price Drop Alert Email
// ---------------------------------------------------------------------------

export interface PriceAlertEmailOptions {
  name?: string;
  email: string;
  listing: {
    title: string;
    originalPrice: number;
    newPrice: number;
    priceDrop: number;
    priceDropPercent: number;
    marketplace: string;
    url: string;
    imageUrl?: string;
  };
  appUrl: string;
  unsubscribeUrl: string;
  settingsUrl: string;
}

export function priceAlertEmailHtml(opts: PriceAlertEmailOptions): string {
  const displayName = opts.name ? opts.name.split(' ')[0] : 'there';
  const { listing } = opts;

  const body = `
    <h1 style="margin:0 0 8px 0;font-size:24px;font-weight:700;color:${TEXT_PRIMARY};">Price Drop Alert! 🔔</h1>
    <p style="margin:0 0 24px 0;font-size:16px;color:${TEXT_SECONDARY};">Hey ${displayName}, an item you're tracking just dropped in price.</p>

    <div style="background-color:#fef9c3;border:1px solid #fde68a;border-radius:10px;padding:24px;margin-bottom:24px;">
      <p style="margin:0 0 8px 0;font-size:18px;font-weight:700;color:${TEXT_PRIMARY};">${listing.title}</p>
      <p style="margin:0 0 16px 0;font-size:13px;color:${TEXT_MUTED};">${listing.marketplace}</p>
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
        <tr>
          <td style="text-align:center;padding:0 12px 0 0;">
            <p style="margin:0;font-size:13px;color:${TEXT_MUTED};">Was</p>
            <p style="margin:4px 0 0 0;font-size:22px;font-weight:700;color:${TEXT_MUTED};text-decoration:line-through;">
              $${listing.originalPrice.toFixed(2)}
            </p>
          </td>
          <td style="text-align:center;font-size:24px;color:${TEXT_MUTED};">→</td>
          <td style="text-align:center;padding:0 0 0 12px;">
            <p style="margin:0;font-size:13px;color:${SUCCESS_COLOR};">Now</p>
            <p style="margin:4px 0 0 0;font-size:28px;font-weight:800;color:${SUCCESS_COLOR};">
              $${listing.newPrice.toFixed(2)}
            </p>
          </td>
          <td style="text-align:center;padding-left:20px;">
            <div style="background-color:${DANGER_COLOR};border-radius:8px;padding:8px 14px;display:inline-block;">
              <p style="margin:0;font-size:14px;font-weight:700;color:#ffffff;">
                −${listing.priceDropPercent.toFixed(0)}%
              </p>
              <p style="margin:0;font-size:11px;color:rgba(255,255,255,0.85);">
                −$${listing.priceDrop.toFixed(2)}
              </p>
            </div>
          </td>
        </tr>
      </table>
    </div>

    <div style="text-align:center;">
      ${btn('View Listing →', listing.url, WARNING_COLOR)}
    </div>

    ${divider()}

    <p style="margin:0;font-size:14px;color:${TEXT_MUTED};text-align:center;">
      You'll receive alerts for all price drops on tracked items.<br/>
      <a href="${opts.settingsUrl}" style="color:${BRAND_COLOR};text-decoration:none;">Manage alerts</a> ·
      <a href="${opts.unsubscribeUrl}" style="color:${BRAND_COLOR};text-decoration:none;">Unsubscribe</a>
    </p>
  `;

  return baseLayout(
    body,
    `Price drop: ${listing.title} is now $${listing.newPrice.toFixed(2)} (−${listing.priceDropPercent.toFixed(0)}%)`
  )
    .replace(/\{\{unsubscribe_url\}\}/g, opts.unsubscribeUrl)
    .replace(/\{\{settings_url\}\}/g, opts.settingsUrl)
    .replace(/\{\{app_url\}\}/g, opts.appUrl);
}

export function priceAlertEmailText(opts: PriceAlertEmailOptions): string {
  const { listing } = opts;
  return `Price Drop Alert! 🔔

${listing.title}
${listing.marketplace}

Was: $${listing.originalPrice.toFixed(2)}
Now: $${listing.newPrice.toFixed(2)} (−${listing.priceDropPercent.toFixed(0)}% / −$${listing.priceDrop.toFixed(2)})

View listing: ${listing.url}

---
Manage alerts: ${opts.settingsUrl}
Unsubscribe: ${opts.unsubscribeUrl}
`;
}

// ---------------------------------------------------------------------------
// Password Reset Email
// ---------------------------------------------------------------------------

export interface PasswordResetEmailOptions {
  name?: string;
  email: string;
  resetUrl: string;
  expiresInMinutes: number;
  appUrl: string;
  unsubscribeUrl: string;
  settingsUrl: string;
}

export function passwordResetEmailHtml(opts: PasswordResetEmailOptions): string {
  const displayName = opts.name ? opts.name.split(' ')[0] : 'there';
  const body = `
    <h1 style="margin:0 0 8px 0;font-size:24px;font-weight:700;color:${TEXT_PRIMARY};">Reset Your Password 🔐</h1>
    <p style="margin:0 0 24px 0;font-size:16px;color:${TEXT_SECONDARY};">
      Hi ${displayName}! We received a request to reset the password for your Flipper AI account.
    </p>

    <div style="background-color:#eff6ff;border:1px solid #bfdbfe;border-radius:10px;padding:24px;margin-bottom:24px;text-align:center;">
      ${btn('Reset Password →', opts.resetUrl)}
      <p style="margin:16px 0 0 0;font-size:13px;color:${TEXT_MUTED};">
        This link expires in ${opts.expiresInMinutes} minutes.
      </p>
    </div>

    <p style="margin:0;font-size:14px;color:${TEXT_SECONDARY};">
      If you didn't request a password reset, you can safely ignore this email.
      Your password will remain unchanged.
    </p>

    ${divider()}

    <p style="margin:0;font-size:13px;color:${TEXT_MUTED};">
      For security, never share this link with anyone. Flipper AI will never ask for your password.
    </p>
  `;

  return baseLayout(body, 'Reset your Flipper AI password')
    .replace(/\{\{unsubscribe_url\}\}/g, opts.unsubscribeUrl)
    .replace(/\{\{settings_url\}\}/g, opts.settingsUrl)
    .replace(/\{\{app_url\}\}/g, opts.appUrl);
}

export function passwordResetEmailText(opts: PasswordResetEmailOptions): string {
  const displayName = opts.name ? opts.name.split(' ')[0] : 'there';
  return `Reset Your Flipper AI Password

Hi ${displayName}! We received a request to reset the password for your Flipper AI account.

Reset your password here: ${opts.resetUrl}

This link expires in ${opts.expiresInMinutes} minutes.

If you didn't request a password reset, you can safely ignore this email.

---
Flipper AI — https://flipper-ai.app
`;
}

// ---------------------------------------------------------------------------
// Password Changed Notification Email
// ---------------------------------------------------------------------------

export function passwordChangedEmailHtml(name?: string): string {
  const displayName = name ? name.split(' ')[0] : 'there';
  const body = `
    <h1 style="margin:0 0 8px 0;font-size:24px;font-weight:700;color:${TEXT_PRIMARY};">Password Changed 🔒</h1>
    <p style="margin:0 0 24px 0;font-size:16px;color:${TEXT_SECONDARY};">
      Hi ${displayName}! Your Flipper AI password was just changed successfully.
    </p>

    <div style="background-color:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:24px;margin-bottom:24px;">
      <p style="margin:0;font-size:14px;color:${TEXT_SECONDARY};">
        If you made this change, you can safely ignore this email — you're all set!
      </p>
    </div>

    <p style="margin:0;font-size:14px;color:${TEXT_SECONDARY};">
      If you did <strong>not</strong> change your password, please contact our support team immediately.
    </p>
  `;

  return baseLayout(body, 'Your Flipper AI password was changed');
}

export function passwordChangedEmailText(): string {
  return `Password Changed

Your Flipper AI password was just changed successfully.

If you made this change, you can safely ignore this email — you're all set!

If you did NOT change your password, please contact our support team immediately.

---
Flipper AI — https://flipper-ai.app
`;
}

// ---------------------------------------------------------------------------
// Scan Summary Email
// ---------------------------------------------------------------------------

export interface ScanSummaryEmailOptions {
  name?: string;
  email: string;
  scanId: string;
  query: string;
  marketplace: string;
  totalResults: number;
  opportunitiesFound: number;
  topOpportunity?: DigestOpportunity;
  duration: number; // seconds
  appUrl: string;
  unsubscribeUrl: string;
  settingsUrl: string;
}

export function scanSummaryEmailHtml(opts: ScanSummaryEmailOptions): string {
  const displayName = opts.name ? opts.name.split(' ')[0] : 'there';
  const hasTop = !!opts.topOpportunity;

  const body = `
    <h1 style="margin:0 0 8px 0;font-size:24px;font-weight:700;color:${TEXT_PRIMARY};">Scan Complete ✅</h1>
    <p style="margin:0 0 24px 0;font-size:16px;color:${TEXT_SECONDARY};">
      Hey ${displayName}! Your scan for <strong>&ldquo;${opts.query}&rdquo;</strong> on ${opts.marketplace} is done.
    </p>

    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom:24px;">
      ${[
        [opts.totalResults.toString(), 'Listings Found'],
        [opts.opportunitiesFound.toString(), 'Opportunities'],
        [`${opts.duration}s`, 'Scan Time'],
      ]
        .map(
          ([val, label]) => `
        <tr><td width="33.3%" style="text-align:center;padding:0 6px;">
          <div style="background-color:${BG_COLOR};border:1px solid ${BORDER_COLOR};border-radius:8px;padding:16px;">
            <p style="margin:0;font-size:26px;font-weight:700;color:${BRAND_COLOR};">${val}</p>
            <p style="margin:4px 0 0 0;font-size:12px;color:${TEXT_MUTED};">${label}</p>
          </div>
        </td></tr>`
        )
        .join('')}
    </table>

    ${
      hasTop
        ? `
    <h2 style="margin:0 0 12px 0;font-size:16px;font-weight:600;color:${TEXT_PRIMARY};">🏆 Top Opportunity</h2>
    <div style="background-color:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:20px;margin-bottom:24px;">
      <p style="margin:0 0 4px 0;font-size:16px;font-weight:600;color:${TEXT_PRIMARY};">${opts.topOpportunity!.title}</p>
      <p style="margin:0 0 12px 0;font-size:13px;color:${TEXT_MUTED};">${opts.topOpportunity!.marketplace}</p>
      <p style="margin:0;font-size:22px;font-weight:700;color:${SUCCESS_COLOR};">
        $${opts.topOpportunity!.price.toFixed(0)}
        <span style="font-size:14px;font-weight:400;color:${TEXT_MUTED};">listing</span>
        <span style="font-size:14px;color:${SUCCESS_COLOR};"> · +$${opts.topOpportunity!.profit.toFixed(0)} est. profit</span>
      </p>
    </div>`
        : ''
    }

    <div style="text-align:center;">
      ${btn('View Scan Results →', opts.appUrl + '/opportunities?scan=' + opts.scanId)}
    </div>
  `;

  return baseLayout(body, `Scan complete: ${opts.opportunitiesFound} opportunities found for "${opts.query}"`)
    .replace(/\{\{unsubscribe_url\}\}/g, opts.unsubscribeUrl)
    .replace(/\{\{settings_url\}\}/g, opts.settingsUrl)
    .replace(/\{\{app_url\}\}/g, opts.appUrl);
}

export function scanSummaryEmailText(opts: ScanSummaryEmailOptions): string {
  const displayName = opts.name ? opts.name.split(' ')[0] : 'there';
  const lines = [
    `Scan Complete — ${opts.query} on ${opts.marketplace}`,
    `Hi ${displayName}!`,
    '',
    `Results: ${opts.totalResults} listings found, ${opts.opportunitiesFound} opportunities`,
    `Scan time: ${opts.duration}s`,
  ];
  if (opts.topOpportunity) {
    lines.push('', `Top opportunity: ${opts.topOpportunity.title} — $${opts.topOpportunity.price.toFixed(0)} (+$${opts.topOpportunity.profit.toFixed(0)} est. profit)`);
  }
  lines.push('', `View results: ${opts.appUrl}/opportunities?scan=${opts.scanId}`);
  lines.push('', '---', `Unsubscribe: ${opts.unsubscribeUrl}`, `Preferences: ${opts.settingsUrl}`);
  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Payment Failed Email
// ---------------------------------------------------------------------------

export interface PaymentFailedEmailOptions {
  name?: string;
  email: string;
  appUrl: string;
  settingsUrl: string;
  unsubscribeUrl: string;
}

export function paymentFailedEmailHtml(opts: PaymentFailedEmailOptions): string {
  const displayName = opts.name ? opts.name.split(' ')[0] : 'there';

  const body = `
    <h1 style="margin:0 0 8px 0;font-size:24px;font-weight:700;color:${TEXT_PRIMARY};">Payment Update Needed 💳</h1>
    <p style="margin:0 0 24px 0;font-size:16px;line-height:1.6;color:${TEXT_SECONDARY};">
      Hey ${displayName}, we had trouble processing your latest payment for Flipper AI.
      Don't worry — your account is still active while we sort this out.
    </p>

    <div style="background:linear-gradient(135deg,#fffbeb 0%,#fef3c7 100%);border:1px solid #fde68a;border-radius:12px;padding:28px;margin-bottom:24px;">
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
        <tr>
          <td width="56" valign="top" style="font-size:32px;padding-right:16px;">⚡</td>
          <td valign="top">
            <p style="margin:0 0 6px 0;font-size:16px;font-weight:700;color:${TEXT_PRIMARY};">Quick fix — takes 30 seconds</p>
            <p style="margin:0;font-size:14px;line-height:1.5;color:${TEXT_SECONDARY};">
              Just update your payment method in Settings and you'll be
              right back to finding profitable flips.
            </p>
          </td>
        </tr>
      </table>
    </div>

    <div style="background:linear-gradient(135deg,#f0fdf4 0%,#dcfce7 100%);border:1px solid #bbf7d0;border-radius:12px;padding:24px;margin-bottom:24px;">
      <p style="margin:0 0 4px 0;font-size:13px;font-weight:600;color:${SUCCESS_COLOR};text-transform:uppercase;letter-spacing:0.5px;">
        While you've been away, Flipper AI has been working for you
      </p>
      <p style="margin:0;font-size:15px;line-height:1.6;color:${TEXT_SECONDARY};">
        Our AI is continuously scanning 5 marketplaces, finding underpriced
        items other sellers miss. The deals are piling up — don't miss out!
      </p>
    </div>

    <div style="text-align:center;margin-bottom:8px;">
      ${btn('Update Payment Method →', opts.settingsUrl, WARNING_COLOR)}
    </div>
    <p style="margin:0;font-size:13px;color:${TEXT_MUTED};text-align:center;">
      Takes less than a minute. Your subscription continues uninterrupted.
    </p>

    ${divider()}

    <div style="background-color:${BG_COLOR};border-radius:10px;padding:20px;margin-bottom:16px;">
      <p style="margin:0 0 4px 0;font-size:14px;font-weight:600;color:${TEXT_PRIMARY};">💡 Why keep your subscription?</p>
      <p style="margin:0;font-size:13px;line-height:1.6;color:${TEXT_SECONDARY};">
        Most Flipper AI users find their subscription pays for itself within
        the first week. One good flip covers months of access — and our AI
        finds dozens of opportunities every day.
      </p>
    </div>

    <p style="margin:0;font-size:13px;color:${TEXT_MUTED};text-align:center;">
      If you believe this is an error, just reply to this email and we'll help.
    </p>
  `;

  return baseLayout(body, 'Action needed: Update your payment method to keep finding profitable flips')
    .replace(/\{\{unsubscribe_url\}\}/g, opts.unsubscribeUrl)
    .replace(/\{\{settings_url\}\}/g, opts.settingsUrl)
    .replace(/\{\{app_url\}\}/g, opts.appUrl);
}

export function paymentFailedEmailText(opts: PaymentFailedEmailOptions): string {
  const displayName = opts.name ? opts.name.split(' ')[0] : 'there';
  return `Payment Update Needed

Hey ${displayName}, we had trouble processing your latest payment for Flipper AI.
Don't worry — your account is still active while we sort this out.

QUICK FIX (takes 30 seconds):
Update your payment method: ${opts.settingsUrl}

WHY KEEP YOUR SUBSCRIPTION?
Most Flipper AI users find their subscription pays for itself within the first week.
One good flip covers months of access — and our AI finds dozens of opportunities every day.

If you believe this is an error, just reply to this email.

---
Unsubscribe: ${opts.unsubscribeUrl}
Email Preferences: ${opts.settingsUrl}
`;
}

// ---------------------------------------------------------------------------
// Flip Lifecycle — Shared Helpers
// ---------------------------------------------------------------------------

const AMBER_COLOR = '#d97706'; // amber-600 — urgency
const TEAL_COLOR = '#0d9488'; // teal-600 — progress

/** Sanitize HTML entities in user-provided content. */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Truncate a string to maxLen characters with ellipsis. */
function truncate(str: string, maxLen: number): string {
  return str.length > maxLen ? str.slice(0, maxLen - 1) + '…' : str;
}

/** Format a relative time string from a Date. */
function relativeTime(date: Date): string {
  const now = Date.now();
  const diffMs = now - date.getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin} minute${diffMin === 1 ? '' : 's'} ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr} hour${diffHr === 1 ? '' : 's'} ago`;
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay} day${diffDay === 1 ? '' : 's'} ago`;
}

/** Map a flippability score (0-100) to a colour for the score badge. */
function scoreColor(score: number): string {
  if (score >= 80) return SUCCESS_COLOR;
  if (score >= 60) return AMBER_COLOR;
  return DANGER_COLOR;
}

// Export helpers for testing
export { escapeHtml, truncate, relativeTime, scoreColor };

// ---------------------------------------------------------------------------
// Opportunity Found Email (amber/urgency)
// ---------------------------------------------------------------------------

export interface OpportunityFoundEmailOptions {
  email: string;
  name?: string;
  platform: string;
  buyPrice: number;
  estimatedProfit: number;
  flippabilityScore: number;
  flippabilityLabel: string;
  itemTitle: string;
  imageUrl?: string;
  eventCreatedAt?: Date;
  opportunityUrl?: string;
  appUrl: string;
  unsubscribeUrl: string;
  settingsUrl: string;
}

export function opportunityFoundEmailHtml(opts: OpportunityFoundEmailOptions): string {
  const displayName = opts.name ? opts.name.split(' ')[0] : 'there';
  const title = escapeHtml(truncate(opts.itemTitle, 100));
  const score = opts.flippabilityScore ?? 0;
  const buyPrice = (opts.buyPrice ?? 0).toFixed(2);
  const profit = (opts.estimatedProfit ?? 0).toFixed(2);
  const timeAgo = opts.eventCreatedAt ? relativeTime(opts.eventCreatedAt) : '';

  const imageBlock = opts.imageUrl
    ? `<img src="${opts.imageUrl}" alt="${title}" style="width:100%;max-height:200px;object-fit:cover;border-radius:8px 8px 0 0;" />`
    : '';

  const body = `
    <h1 style="margin:0 0 8px 0;font-size:24px;font-weight:700;color:${TEXT_PRIMARY};">New Flip Opportunity! 🔥</h1>
    <p style="margin:0 0 24px 0;font-size:16px;color:${TEXT_SECONDARY};">
      Hey ${displayName}, we found a deal worth checking out${timeAgo ? ` — ${timeAgo}` : ''}.
    </p>

    <div style="background-color:#fffbeb;border:1px solid #fde68a;border-radius:10px;overflow:hidden;margin-bottom:24px;">
      ${imageBlock}
      <div style="padding:20px;">
        <p style="margin:0 0 8px 0;font-size:18px;font-weight:700;color:${TEXT_PRIMARY};">${title}</p>
        <p style="margin:0 0 16px 0;font-size:13px;color:${TEXT_MUTED};">${escapeHtml(opts.platform)}</p>

        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
          <tr>
            <td width="33%" style="text-align:center;padding:0 4px;">
              <div style="background-color:#ffffff;border:1px solid ${BORDER_COLOR};border-radius:8px;padding:12px;">
                <p style="margin:0;font-size:20px;font-weight:700;color:${AMBER_COLOR};">$${buyPrice}</p>
                <p style="margin:4px 0 0 0;font-size:11px;color:${TEXT_MUTED};">Buy Price</p>
              </div>
            </td>
            <td width="33%" style="text-align:center;padding:0 4px;">
              <div style="background-color:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:12px;">
                <p style="margin:0;font-size:20px;font-weight:700;color:${SUCCESS_COLOR};">+$${profit}</p>
                <p style="margin:4px 0 0 0;font-size:11px;color:${TEXT_MUTED};">Est. Profit</p>
              </div>
            </td>
            <td width="33%" style="text-align:center;padding:0 4px;">
              <div style="background-color:#ffffff;border:1px solid ${BORDER_COLOR};border-radius:8px;padding:12px;">
                <p style="margin:0;font-size:20px;font-weight:700;color:${scoreColor(score)};">${score}</p>
                <p style="margin:4px 0 0 0;font-size:11px;color:${TEXT_MUTED};">${escapeHtml(opts.flippabilityLabel)}</p>
              </div>
            </td>
          </tr>
        </table>
      </div>
    </div>

    <div style="text-align:center;">
      ${btn('View Opportunity →', opts.opportunityUrl ?? opts.appUrl + '/opportunities', AMBER_COLOR)}
    </div>

    ${divider()}

    <p style="margin:0;font-size:14px;color:${TEXT_MUTED};text-align:center;">
      Act fast — great deals don't last long!<br/>
      <a href="${opts.settingsUrl}" style="color:${BRAND_COLOR};text-decoration:none;">Manage alerts</a> ·
      <a href="${opts.unsubscribeUrl}" style="color:${BRAND_COLOR};text-decoration:none;">Unsubscribe</a>
    </p>
  `;

  return baseLayout(body, `New opportunity: ${opts.itemTitle} for $${buyPrice} — est. +$${profit} profit`)
    .replace(/\{\{unsubscribe_url\}\}/g, opts.unsubscribeUrl)
    .replace(/\{\{settings_url\}\}/g, opts.settingsUrl)
    .replace(/\{\{app_url\}\}/g, opts.appUrl);
}

export function opportunityFoundEmailText(opts: OpportunityFoundEmailOptions): string {
  const title = truncate(opts.itemTitle, 100);
  const buyPrice = (opts.buyPrice ?? 0).toFixed(2);
  const profit = (opts.estimatedProfit ?? 0).toFixed(2);
  const score = opts.flippabilityScore ?? 0;
  const timeAgo = opts.eventCreatedAt ? ` (${relativeTime(opts.eventCreatedAt)})` : '';

  return `New Flip Opportunity! 🔥${timeAgo}

${title}
${opts.platform}

Buy Price: $${buyPrice}
Est. Profit: +$${profit}
Flippability: ${score}/100 (${opts.flippabilityLabel})

View: ${opts.opportunityUrl ?? opts.appUrl + '/opportunities'}

---
Manage alerts: ${opts.settingsUrl}
Unsubscribe: ${opts.unsubscribeUrl}
`;
}

// ---------------------------------------------------------------------------
// Flip Purchased Email (blue/brand — confirmation)
// ---------------------------------------------------------------------------

export interface FlipPurchasedEmailOptions {
  email: string;
  name?: string;
  itemTitle: string;
  purchasePrice: number;
  estimatedProfit: number;
  platform: string;
  eventCreatedAt?: Date;
  opportunityUrl?: string;
  appUrl: string;
  unsubscribeUrl: string;
  settingsUrl: string;
}

export function flipPurchasedEmailHtml(opts: FlipPurchasedEmailOptions): string {
  const displayName = opts.name ? opts.name.split(' ')[0] : 'there';
  const title = escapeHtml(truncate(opts.itemTitle, 100));
  const price = (opts.purchasePrice ?? 0).toFixed(2);
  const profit = (opts.estimatedProfit ?? 0).toFixed(2);
  const timeLabel = opts.eventCreatedAt ? relativeTime(opts.eventCreatedAt) : 'Today';

  const body = `
    <h1 style="margin:0 0 8px 0;font-size:24px;font-weight:700;color:${TEXT_PRIMARY};">Flip Purchased! 🛒</h1>
    <p style="margin:0 0 24px 0;font-size:16px;color:${TEXT_SECONDARY};">
      Hey ${displayName}, your purchase has been recorded — ${timeLabel}.
    </p>

    <div style="background-color:#eff6ff;border:1px solid #bfdbfe;border-radius:10px;padding:24px;margin-bottom:24px;">
      <p style="margin:0 0 8px 0;font-size:18px;font-weight:700;color:${TEXT_PRIMARY};">${title}</p>
      <p style="margin:0 0 16px 0;font-size:13px;color:${TEXT_MUTED};">${escapeHtml(opts.platform)}</p>

      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
        <tr>
          <td width="50%" style="text-align:center;padding:0 4px;">
            <div style="background-color:#ffffff;border:1px solid ${BORDER_COLOR};border-radius:8px;padding:12px;">
              <p style="margin:0;font-size:22px;font-weight:700;color:${BRAND_COLOR};">$${price}</p>
              <p style="margin:4px 0 0 0;font-size:11px;color:${TEXT_MUTED};">Purchase Price</p>
            </div>
          </td>
          <td width="50%" style="text-align:center;padding:0 4px;">
            <div style="background-color:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:12px;">
              <p style="margin:0;font-size:22px;font-weight:700;color:${SUCCESS_COLOR};">+$${profit}</p>
              <p style="margin:4px 0 0 0;font-size:11px;color:${TEXT_MUTED};">Est. Profit</p>
            </div>
          </td>
        </tr>
      </table>
    </div>

    <div style="text-align:center;">
      ${btn('View Flip →', opts.opportunityUrl ?? opts.appUrl + '/opportunities')}
    </div>

    ${divider()}

    <p style="margin:0;font-size:14px;color:${TEXT_MUTED};text-align:center;">
      Next step: list this item for resale to lock in your profit.<br/>
      <a href="${opts.settingsUrl}" style="color:${BRAND_COLOR};text-decoration:none;">Email Preferences</a> ·
      <a href="${opts.unsubscribeUrl}" style="color:${BRAND_COLOR};text-decoration:none;">Unsubscribe</a>
    </p>
  `;

  return baseLayout(body, `Flip purchased: ${opts.itemTitle} for $${price}`)
    .replace(/\{\{unsubscribe_url\}\}/g, opts.unsubscribeUrl)
    .replace(/\{\{settings_url\}\}/g, opts.settingsUrl)
    .replace(/\{\{app_url\}\}/g, opts.appUrl);
}

export function flipPurchasedEmailText(opts: FlipPurchasedEmailOptions): string {
  const title = truncate(opts.itemTitle, 100);
  const price = (opts.purchasePrice ?? 0).toFixed(2);
  const profit = (opts.estimatedProfit ?? 0).toFixed(2);
  const timeLabel = opts.eventCreatedAt ? relativeTime(opts.eventCreatedAt) : 'Today';

  return `Flip Purchased! 🛒 (${timeLabel})

${title}
${opts.platform}

Purchase Price: $${price}
Est. Profit: +$${profit}

View: ${opts.opportunityUrl ?? opts.appUrl + '/opportunities'}

---
Email Preferences: ${opts.settingsUrl}
Unsubscribe: ${opts.unsubscribeUrl}
`;
}

// ---------------------------------------------------------------------------
// Flip Listed Email (teal/progress — in transit)
// ---------------------------------------------------------------------------

export interface FlipListedEmailOptions {
  email: string;
  name?: string;
  itemTitle: string;
  destinationPlatform: string;
  listingUrl?: string;
  eventCreatedAt?: Date;
  opportunityUrl?: string;
  appUrl: string;
  unsubscribeUrl: string;
  settingsUrl: string;
}

export function flipListedEmailHtml(opts: FlipListedEmailOptions): string {
  const displayName = opts.name ? opts.name.split(' ')[0] : 'there';
  const title = escapeHtml(truncate(opts.itemTitle, 100));
  const timeLabel = opts.eventCreatedAt ? relativeTime(opts.eventCreatedAt) : 'Just now';

  const listingLink = opts.listingUrl
    ? `<p style="margin:12px 0 0 0;font-size:14px;"><a href="${opts.listingUrl}" style="color:${TEAL_COLOR};text-decoration:none;font-weight:600;">View Resale Listing →</a></p>`
    : '';

  const body = `
    <h1 style="margin:0 0 8px 0;font-size:24px;font-weight:700;color:${TEXT_PRIMARY};">Flip Listed! 📦</h1>
    <p style="margin:0 0 24px 0;font-size:16px;color:${TEXT_SECONDARY};">
      Hey ${displayName}, your item is now listed for resale — ${timeLabel}.
    </p>

    <div style="background-color:#f0fdfa;border:1px solid #99f6e4;border-radius:10px;padding:24px;margin-bottom:24px;">
      <p style="margin:0 0 8px 0;font-size:18px;font-weight:700;color:${TEXT_PRIMARY};">${title}</p>
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-top:12px;">
        <tr>
          <td width="48" valign="top" style="font-size:28px;">🏪</td>
          <td valign="top">
            <p style="margin:0;font-size:14px;font-weight:600;color:${TEXT_PRIMARY};">Listed on ${escapeHtml(opts.destinationPlatform)}</p>
            <p style="margin:4px 0 0 0;font-size:13px;color:${TEXT_SECONDARY};">Your item is live and visible to buyers.</p>
            ${listingLink}
          </td>
        </tr>
      </table>
    </div>

    <div style="text-align:center;">
      ${btn('Track Your Flips →', opts.opportunityUrl ?? opts.appUrl + '/opportunities', TEAL_COLOR)}
    </div>

    ${divider()}

    <p style="margin:0;font-size:14px;color:${TEXT_MUTED};text-align:center;">
      You'll be notified when this item sells.<br/>
      <a href="${opts.settingsUrl}" style="color:${BRAND_COLOR};text-decoration:none;">Email Preferences</a> ·
      <a href="${opts.unsubscribeUrl}" style="color:${BRAND_COLOR};text-decoration:none;">Unsubscribe</a>
    </p>
  `;

  return baseLayout(body, `Item listed: ${opts.itemTitle} on ${opts.destinationPlatform}`)
    .replace(/\{\{unsubscribe_url\}\}/g, opts.unsubscribeUrl)
    .replace(/\{\{settings_url\}\}/g, opts.settingsUrl)
    .replace(/\{\{app_url\}\}/g, opts.appUrl);
}

export function flipListedEmailText(opts: FlipListedEmailOptions): string {
  const title = truncate(opts.itemTitle, 100);
  const timeLabel = opts.eventCreatedAt ? relativeTime(opts.eventCreatedAt) : 'Just now';

  const lines = [
    `Flip Listed! 📦 (${timeLabel})`,
    '',
    title,
    `Listed on: ${opts.destinationPlatform}`,
  ];
  if (opts.listingUrl) lines.push(`Resale listing: ${opts.listingUrl}`);
  lines.push(
    '',
    `Track your flips: ${opts.opportunityUrl ?? opts.appUrl + '/opportunities'}`,
    '',
    '---',
    `Email Preferences: ${opts.settingsUrl}`,
    `Unsubscribe: ${opts.unsubscribeUrl}`
  );
  return lines.join('\n') + '\n';
}

// ---------------------------------------------------------------------------
// Flip Sold Email (green/celebration — achievement)
// ---------------------------------------------------------------------------

export interface FlipSoldEmailOptions {
  email: string;
  name?: string;
  itemTitle: string;
  salePrice: number;
  actualProfit: number;
  roiPercent: number;
  daysToFlip?: number;
  platform: string;
  purchasePrice: number;
  eventCreatedAt?: Date;
  opportunityUrl?: string;
  appUrl: string;
  unsubscribeUrl: string;
  settingsUrl: string;
}

export function flipSoldEmailHtml(opts: FlipSoldEmailOptions): string {
  const displayName = opts.name ? opts.name.split(' ')[0] : 'there';
  const title = escapeHtml(truncate(opts.itemTitle, 100));
  const salePrice = (opts.salePrice ?? 0).toFixed(2);
  const profit = (opts.actualProfit ?? 0).toFixed(2);
  const roi = (opts.roiPercent ?? 0).toFixed(0);
  const purchasePrice = (opts.purchasePrice ?? 0).toFixed(2);
  const daysLabel = opts.daysToFlip != null ? `${opts.daysToFlip} day${opts.daysToFlip === 1 ? '' : 's'}` : null;

  const body = `
    <h1 style="margin:0 0 8px 0;font-size:24px;font-weight:700;color:${TEXT_PRIMARY};">Flip Sold! 🎉</h1>
    <p style="margin:0 0 24px 0;font-size:16px;color:${TEXT_SECONDARY};">
      Congratulations ${displayName}! You just locked in a profit.
    </p>

    <div style="background-color:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:24px;margin-bottom:24px;">
      <p style="margin:0 0 8px 0;font-size:18px;font-weight:700;color:${TEXT_PRIMARY};">${title}</p>
      <p style="margin:0 0 16px 0;font-size:13px;color:${TEXT_MUTED};">Sold on ${escapeHtml(opts.platform)}</p>

      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom:16px;">
        <tr>
          <td style="text-align:center;padding:16px;background-color:#dcfce7;border-radius:8px;">
            <p style="margin:0;font-size:36px;font-weight:800;color:${SUCCESS_COLOR};">+$${profit}</p>
            <p style="margin:4px 0 0 0;font-size:14px;color:${TEXT_SECONDARY};">Actual Profit</p>
          </td>
        </tr>
      </table>

      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
        <tr>
          <td width="${daysLabel ? '33%' : '50%'}" style="text-align:center;padding:0 4px;">
            <div style="background-color:#ffffff;border:1px solid ${BORDER_COLOR};border-radius:8px;padding:10px;">
              <p style="margin:0;font-size:18px;font-weight:700;color:${TEXT_PRIMARY};">$${salePrice}</p>
              <p style="margin:2px 0 0 0;font-size:11px;color:${TEXT_MUTED};">Sale Price</p>
            </div>
          </td>
          <td width="${daysLabel ? '33%' : '50%'}" style="text-align:center;padding:0 4px;">
            <div style="background-color:#ffffff;border:1px solid ${BORDER_COLOR};border-radius:8px;padding:10px;">
              <p style="margin:0;font-size:18px;font-weight:700;color:${SUCCESS_COLOR};">${roi}%</p>
              <p style="margin:2px 0 0 0;font-size:11px;color:${TEXT_MUTED};">ROI</p>
            </div>
          </td>
          ${
            daysLabel
              ? `<td width="33%" style="text-align:center;padding:0 4px;">
              <div style="background-color:#ffffff;border:1px solid ${BORDER_COLOR};border-radius:8px;padding:10px;">
                <p style="margin:0;font-size:18px;font-weight:700;color:${BRAND_COLOR};">${daysLabel}</p>
                <p style="margin:2px 0 0 0;font-size:11px;color:${TEXT_MUTED};">Time to Flip</p>
              </div>
            </td>`
              : ''
          }
        </tr>
      </table>

      <p style="margin:16px 0 0 0;font-size:13px;color:${TEXT_MUTED};text-align:center;">Bought for $${purchasePrice}</p>
    </div>

    <div style="text-align:center;">
      ${btn('View Your Stats →', opts.appUrl + '/dashboard', SUCCESS_COLOR)}
    </div>

    ${divider()}

    <p style="margin:0;font-size:14px;color:${TEXT_MUTED};text-align:center;">
      Keep the momentum going — check your dashboard for more opportunities!<br/>
      <a href="${opts.settingsUrl}" style="color:${BRAND_COLOR};text-decoration:none;">Email Preferences</a> ·
      <a href="${opts.unsubscribeUrl}" style="color:${BRAND_COLOR};text-decoration:none;">Unsubscribe</a>
    </p>
  `;

  return baseLayout(body, `Flip sold: ${opts.itemTitle} — +$${profit} profit (${roi}% ROI)`)
    .replace(/\{\{unsubscribe_url\}\}/g, opts.unsubscribeUrl)
    .replace(/\{\{settings_url\}\}/g, opts.settingsUrl)
    .replace(/\{\{app_url\}\}/g, opts.appUrl);
}

export function flipSoldEmailText(opts: FlipSoldEmailOptions): string {
  const title = truncate(opts.itemTitle, 100);
  const salePrice = (opts.salePrice ?? 0).toFixed(2);
  const profit = (opts.actualProfit ?? 0).toFixed(2);
  const roi = (opts.roiPercent ?? 0).toFixed(0);
  const purchasePrice = (opts.purchasePrice ?? 0).toFixed(2);
  const daysLabel = opts.daysToFlip != null ? `Time to Flip: ${opts.daysToFlip} day${opts.daysToFlip === 1 ? '' : 's'}` : '';

  return `Flip Sold! 🎉

${title}
Sold on ${opts.platform}

Sale Price: $${salePrice}
Purchase Price: $${purchasePrice}
Actual Profit: +$${profit}
ROI: ${roi}%${daysLabel ? '\n' + daysLabel : ''}

Dashboard: ${opts.appUrl}/dashboard

---
Email Preferences: ${opts.settingsUrl}
Unsubscribe: ${opts.unsubscribeUrl}
`;
}

// ---------------------------------------------------------------------------
// Story 10.5: URL validation helper
// ---------------------------------------------------------------------------

/** Known marketplace domains — URLs from scraped data are validated against this list. */
const ALLOWED_PLATFORM_DOMAINS = [
  'ebay.com',
  'mercari.com',
  'facebook.com',
  'offerup.com',
  'craigslist.org',
];

/**
 * Validate an external URL from scraped data against the platform whitelist.
 * Returns the validated URL, or the internal app fallback if not trusted.
 */
export function validateExternalUrl(url: string | undefined | null, fallbackUrl: string): string {
  if (!url) return fallbackUrl;
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();
    const trusted = ALLOWED_PLATFORM_DOMAINS.some(
      (domain) => host === domain || host.endsWith('.' + domain)
    );
    return trusted ? url : fallbackUrl;
  } catch {
    return fallbackUrl;
  }
}

// ---------------------------------------------------------------------------
// Story 10.5: Review Received Email
// ---------------------------------------------------------------------------

export interface ReviewReceivedEmailOptions {
  email: string;
  name?: string;
  platform: string;
  rating: number; // 1-5
  reviewText: string;
  reviewerName?: string;
  reviewUrl: string;
  appUrl: string;
  unsubscribeUrl: string;
  settingsUrl: string;
}

export function reviewReceivedEmailHtml(opts: ReviewReceivedEmailOptions): string {
  const displayName = opts.name ? opts.name.split(' ')[0] : undefined;
  const greeting = displayName ? `<p style="margin:0 0 16px 0;font-size:16px;color:${TEXT_SECONDARY};">Hi ${escapeHtml(displayName)},</p>` : '';
  const rating = Math.max(1, Math.min(5, Math.round(opts.rating)));
  const stars = Array.from({ length: 5 }, (_, i) =>
    `<span style="color:${WARNING_COLOR};font-size:20px;">${i < rating ? '&#9733;' : '&#9734;'}</span>`
  ).join('');
  const reviewer = escapeHtml(opts.reviewerName ?? 'A buyer');
  const reviewPreview = escapeHtml(opts.reviewText.slice(0, 200));
  const validatedReviewUrl = validateExternalUrl(opts.reviewUrl, `${opts.appUrl}/opportunities`);

  const body = `
    ${greeting}
    <h1 style="margin:0 0 8px 0;font-size:24px;font-weight:700;color:${TEXT_PRIMARY};">New Review Received</h1>
    <p style="margin:0 0 16px 0;font-size:14px;color:${TEXT_MUTED};">On: ${escapeHtml(opts.platform)}</p>

    <div style="background-color:#f0f9ff;border:1px solid #bae6fd;border-radius:10px;padding:20px;margin-bottom:24px;">
      <p style="margin:0 0 8px 0;font-size:13px;color:${TEXT_MUTED};">Rating</p>
      <div>${stars}</div>
      <p style="margin:12px 0 4px 0;font-size:13px;color:${TEXT_MUTED};">From: ${reviewer}</p>
      <p style="margin:0;font-size:14px;font-style:italic;line-height:1.6;color:${TEXT_PRIMARY};">&ldquo;${reviewPreview}&rdquo;</p>
    </div>

    <div style="text-align:center;">
      ${btn('View Review', validatedReviewUrl, BRAND_COLOR)}
    </div>
  `;

  const preview = `New ${rating}★ review on ${opts.platform}`;
  return baseLayout(body, preview)
    .replace(/\{\{unsubscribe_url\}\}/g, opts.unsubscribeUrl)
    .replace(/\{\{settings_url\}\}/g, opts.settingsUrl)
    .replace(/\{\{app_url\}\}/g, opts.appUrl);
}

export function reviewReceivedEmailText(opts: ReviewReceivedEmailOptions): string {
  const displayName = opts.name ? opts.name.split(' ')[0] : null;
  const rating = Math.max(1, Math.min(5, Math.round(opts.rating)));
  const reviewer = opts.reviewerName ?? 'A buyer';
  const reviewPreview = opts.reviewText.slice(0, 200);
  const validatedReviewUrl = validateExternalUrl(opts.reviewUrl, `${opts.appUrl}/opportunities`);

  const lines: string[] = [`New Review Received — ${opts.platform}`];
  if (displayName) lines.push(`Hi ${displayName},`);
  lines.push('', `Rating: ${rating}/5 stars`, `From: ${reviewer}`, '', `"${reviewPreview}"`, '', `View Review: ${validatedReviewUrl}`);
  lines.push('', '---', `Unsubscribe: ${opts.unsubscribeUrl}`, `Preferences: ${opts.settingsUrl}`);
  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Story 10.5: Flip Gone Cold Email
// ---------------------------------------------------------------------------

export interface FlipGoneColdEmailOptions {
  email: string;
  name?: string;
  listingTitle: string;
  hoursSinceLastResponse: number;
  sellerName?: string;
  coldReason: 'user_not_replied' | 'seller_not_replied';
  threadUrl: string;
  appUrl: string;
  unsubscribeUrl: string;
  settingsUrl: string;
}

export function flipGoneColdEmailHtml(opts: FlipGoneColdEmailOptions): string {
  const displayName = opts.name ? opts.name.split(' ')[0] : undefined;
  const greeting = displayName ? `<p style="margin:0 0 16px 0;font-size:16px;color:${TEXT_SECONDARY};">Hi ${escapeHtml(displayName)},</p>` : '';
  const title = escapeHtml(opts.listingTitle);
  const sellerDisplay = escapeHtml(opts.sellerName ?? 'the seller');
  const headline = opts.coldReason === 'user_not_replied'
    ? "You haven't responded"
    : "Seller hasn't responded";
  const subtext = opts.coldReason === 'user_not_replied'
    ? `${sellerDisplay} is waiting for your reply on this flip.`
    : `You sent a message and ${sellerDisplay} hasn't responded yet.`;

  const body = `
    ${greeting}
    <h1 style="margin:0 0 8px 0;font-size:24px;font-weight:700;color:${WARNING_COLOR};">${headline}</h1>
    <p style="margin:0 0 20px 0;font-size:15px;line-height:1.6;color:${TEXT_SECONDARY};">${subtext}</p>

    <div style="background-color:#fffbeb;border:1px solid #fde68a;border-radius:10px;padding:20px;margin-bottom:24px;">
      <p style="margin:0 0 8px 0;font-size:16px;font-weight:600;color:${TEXT_PRIMARY};">${title}</p>
      <p style="margin:0;font-size:13px;color:${TEXT_MUTED};">
        <span style="background-color:${WARNING_COLOR};color:#fff;padding:2px 8px;border-radius:12px;font-size:12px;font-weight:600;">${opts.hoursSinceLastResponse}h since last response</span>
      </p>
      <p style="margin:12px 0 0 0;font-size:14px;color:${TEXT_SECONDARY};">From: ${sellerDisplay}</p>
    </div>

    <div style="text-align:center;">
      ${btn('View Conversation', opts.threadUrl, WARNING_COLOR)}
    </div>
  `;

  const preview = opts.coldReason === 'user_not_replied'
    ? `No response for ${opts.hoursSinceLastResponse}h on ${title}`
    : `Seller hasn't responded for ${opts.hoursSinceLastResponse}h on ${title}`;

  return baseLayout(body, preview)
    .replace(/\{\{unsubscribe_url\}\}/g, opts.unsubscribeUrl)
    .replace(/\{\{settings_url\}\}/g, opts.settingsUrl)
    .replace(/\{\{app_url\}\}/g, opts.appUrl);
}

export function flipGoneColdEmailText(opts: FlipGoneColdEmailOptions): string {
  const displayName = opts.name ? opts.name.split(' ')[0] : null;
  const sellerDisplay = opts.sellerName ?? 'the seller';
  const headline = opts.coldReason === 'user_not_replied'
    ? "You haven't responded"
    : "Seller hasn't responded";

  const lines: string[] = [headline];
  if (displayName) lines.push(`Hi ${displayName},`);
  lines.push(
    '',
    `Listing: ${opts.listingTitle}`,
    `Hours since last response: ${opts.hoursSinceLastResponse}h`,
    `From: ${sellerDisplay}`,
    '',
    `View Conversation: ${opts.threadUrl}`
  );
  lines.push('', '---', `Unsubscribe: ${opts.unsubscribeUrl}`, `Preferences: ${opts.settingsUrl}`);
  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Story 10.5: Flip Turned Hot Email
// ---------------------------------------------------------------------------

export interface FlipTurnedHotEmailOptions {
  email: string;
  name?: string;
  listingTitle: string;
  unreadCount: number;
  latestMessagePreview: string;
  sellerName?: string;
  threadUrl: string;
  appUrl: string;
  unsubscribeUrl: string;
  settingsUrl: string;
}

export function flipTurnedHotEmailHtml(opts: FlipTurnedHotEmailOptions): string {
  const displayName = opts.name ? opts.name.split(' ')[0] : undefined;
  const greeting = displayName ? `<p style="margin:0 0 16px 0;font-size:16px;color:${TEXT_SECONDARY};">Hi ${escapeHtml(displayName)},</p>` : '';
  const title = escapeHtml(opts.listingTitle);
  const preview = escapeHtml(opts.latestMessagePreview.slice(0, 200));
  const sellerDisplay = escapeHtml(opts.sellerName ?? 'the seller');

  const body = `
    ${greeting}
    <h1 style="margin:0 0 8px 0;font-size:24px;font-weight:700;color:${DANGER_COLOR};">Flip Is Hot! 🔥</h1>
    <p style="margin:0 0 20px 0;font-size:15px;line-height:1.6;color:${TEXT_SECONDARY};">
      ${sellerDisplay} has sent multiple messages and is ready to talk.
    </p>

    <div style="background-color:#fff1f2;border:1px solid #fecdd3;border-radius:10px;padding:20px;margin-bottom:24px;">
      <p style="margin:0 0 8px 0;font-size:16px;font-weight:600;color:${TEXT_PRIMARY};">${title}</p>
      <p style="margin:0 0 12px 0;font-size:13px;">
        <span style="background-color:${DANGER_COLOR};color:#fff;padding:2px 8px;border-radius:12px;font-size:12px;font-weight:600;">${opts.unreadCount} unread messages</span>
      </p>
      <p style="margin:0;font-size:14px;font-style:italic;line-height:1.6;color:${TEXT_PRIMARY};">&ldquo;${preview}&rdquo;</p>
    </div>

    <div style="text-align:center;">
      ${btn('Review &amp; Respond', opts.threadUrl, DANGER_COLOR)}
    </div>
  `;

  const previewText = `${opts.unreadCount} unread messages on ${opts.listingTitle}`;
  return baseLayout(body, previewText)
    .replace(/\{\{unsubscribe_url\}\}/g, opts.unsubscribeUrl)
    .replace(/\{\{settings_url\}\}/g, opts.settingsUrl)
    .replace(/\{\{app_url\}\}/g, opts.appUrl);
}

export function flipTurnedHotEmailText(opts: FlipTurnedHotEmailOptions): string {
  const displayName = opts.name ? opts.name.split(' ')[0] : null;
  const sellerDisplay = opts.sellerName ?? 'the seller';
  const msgPreview = opts.latestMessagePreview.slice(0, 200);

  const lines: string[] = ['Flip Is Hot!'];
  if (displayName) lines.push(`Hi ${displayName},`);
  lines.push(
    '',
    `Listing: ${opts.listingTitle}`,
    `Unread messages from ${sellerDisplay}: ${opts.unreadCount}`,
    '',
    `Latest message: "${msgPreview}"`,
    '',
    `Review & Respond: ${opts.threadUrl}`
  );
  lines.push('', '---', `Unsubscribe: ${opts.unsubscribeUrl}`, `Preferences: ${opts.settingsUrl}`);
  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Story 10.5: Price Change Alert Email
// ---------------------------------------------------------------------------

export interface PriceChangeAlertEmailOptions {
  email: string;
  name?: string;
  listingTitle: string;
  platform: string;
  oldPrice: number;
  newPrice: number;
  changePercent: number;
  direction: 'increase' | 'decrease';
  updatedProfitMargin?: number;
  listingUrl: string;
  appUrl: string;
  unsubscribeUrl: string;
  settingsUrl: string;
}

export function priceChangeAlertEmailHtml(opts: PriceChangeAlertEmailOptions): string {
  const displayName = opts.name ? opts.name.split(' ')[0] : undefined;
  const greeting = displayName ? `<p style="margin:0 0 16px 0;font-size:16px;color:${TEXT_SECONDARY};">Hi ${escapeHtml(displayName)},</p>` : '';
  const title = escapeHtml(opts.listingTitle);
  const changeColor = opts.direction === 'decrease' ? SUCCESS_COLOR : DANGER_COLOR;
  const changeLabel = opts.direction === 'decrease' ? '↓ Price Decrease' : '↑ Price Increase';
  const changePct = Math.abs(opts.changePercent).toFixed(1);
  const profitLine = opts.updatedProfitMargin != null
    ? `<p style="margin:12px 0 0 0;font-size:14px;color:${TEXT_SECONDARY};">Updated profit margin: <strong style="color:${SUCCESS_COLOR};">$${opts.updatedProfitMargin.toFixed(2)}</strong></p>`
    : '';
  const bgColor = opts.direction === 'decrease' ? '#f0fdf4' : '#fff1f2';
  const borderColor = opts.direction === 'decrease' ? '#bbf7d0' : '#fecdd3';

  const body = `
    ${greeting}
    <h1 style="margin:0 0 8px 0;font-size:24px;font-weight:700;color:${TEXT_PRIMARY};">Listing Price Changed</h1>
    <p style="margin:0 0 20px 0;font-size:14px;color:${TEXT_MUTED};">On: ${escapeHtml(opts.platform)}</p>

    <div style="background-color:${bgColor};border:1px solid ${borderColor};border-radius:10px;padding:20px;margin-bottom:24px;">
      <p style="margin:0 0 12px 0;font-size:16px;font-weight:600;color:${TEXT_PRIMARY};">${title}</p>
      <p style="margin:0 0 8px 0;font-size:22px;font-weight:700;color:${TEXT_PRIMARY};">
        <span style="color:${TEXT_MUTED};text-decoration:line-through;font-size:16px;">$${opts.oldPrice.toFixed(2)}</span>
        &nbsp;→&nbsp;
        <span style="color:${changeColor};">$${opts.newPrice.toFixed(2)}</span>
      </p>
      <p style="margin:0;">
        <span style="background-color:${changeColor};color:#fff;padding:2px 10px;border-radius:12px;font-size:13px;font-weight:600;">${changeLabel} ${changePct}%</span>
      </p>
      ${profitLine}
    </div>

    <div style="text-align:center;">
      ${btn('View Listing', opts.listingUrl, BRAND_COLOR)}
    </div>
  `;

  const previewText = `Price ${opts.direction} on ${title}: $${opts.oldPrice.toFixed(2)} → $${opts.newPrice.toFixed(2)}`;
  return baseLayout(body, previewText)
    .replace(/\{\{unsubscribe_url\}\}/g, opts.unsubscribeUrl)
    .replace(/\{\{settings_url\}\}/g, opts.settingsUrl)
    .replace(/\{\{app_url\}\}/g, opts.appUrl);
}

export function priceChangeAlertEmailText(opts: PriceChangeAlertEmailOptions): string {
  const displayName = opts.name ? opts.name.split(' ')[0] : null;
  const changePct = Math.abs(opts.changePercent).toFixed(1);
  const direction = opts.direction === 'decrease' ? 'decreased' : 'increased';

  const lines: string[] = ['Listing Price Changed'];
  if (displayName) lines.push(`Hi ${displayName},`);
  lines.push(
    '',
    `Listing: ${opts.listingTitle}`,
    `Platform: ${opts.platform}`,
    `Price ${direction}: $${opts.oldPrice.toFixed(2)} → $${opts.newPrice.toFixed(2)} (${changePct}%)`,
  );
  if (opts.updatedProfitMargin != null) {
    lines.push(`Updated profit margin: $${opts.updatedProfitMargin.toFixed(2)}`);
  }
  lines.push('', `View Listing: ${opts.listingUrl}`);
  lines.push('', '---', `Unsubscribe: ${opts.unsubscribeUrl}`, `Preferences: ${opts.settingsUrl}`);
  return lines.join('\n');
}
