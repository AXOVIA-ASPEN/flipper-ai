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
