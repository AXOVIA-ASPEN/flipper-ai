/**
 * @file app/privacy/page.tsx
 * @author Stephen Boyett
 * @company Axovia AI
 * @date 2026-04-26
 * @version 2.0
 * @brief Privacy Policy page rebuilt on the canonical dark-glassmorphism design system.
 *
 * @description
 * Static legal page (publicly accessible, no auth) covering data collection, use, sharing,
 * security, user privacy rights, cookies, GDPR/CCPA notices, and contact information. Required
 * for GDPR compliance and production launch. Migration is purely visual: drops the light-mode
 * grey page wrapper (background comes from the layout's `.fp-bg-mesh`/`.fp-bg-grid`),
 * collapses the content shell to `.fp-glass`, recolors all typography to canonical `#e2e8f0`
 * (primary) / `#94a3b8` (secondary) / `#c4b5fd` (purple link accent), and inserts
 * `<hr className="fp-divider" />` between adjacent `<section>` blocks per ADR-14.9-B and
 * pre-mortem P-5 (count = sections - 1). Body copy is preserved verbatim — no editorial
 * changes to the legal text.
 */

import Link from 'next/link';

const TEXT_PRIMARY = '#e2e8f0';
const TEXT_SECONDARY = '#94a3b8';
const PURPLE_ACCENT = '#c4b5fd';

const H1_STYLE = { fontSize: 32, fontWeight: 700, color: TEXT_PRIMARY, marginBottom: 8 } as const;
const H2_STYLE = { fontSize: 24, fontWeight: 600, color: TEXT_PRIMARY, marginBottom: 16 } as const;
const H3_STYLE = { fontSize: 18, fontWeight: 600, color: TEXT_PRIMARY, marginTop: 24, marginBottom: 12 } as const;
const BODY_STYLE = { color: TEXT_PRIMARY, lineHeight: 1.7 } as const;
const LIST_STYLE = { color: TEXT_PRIMARY, listStyle: 'disc inside', marginLeft: 16, display: 'flex', flexDirection: 'column' as const, gap: 8, lineHeight: 1.6 };
const SUB_COPY = { color: TEXT_SECONDARY } as const;
const LINK_STYLE = { color: PURPLE_ACCENT, textDecoration: 'underline' } as const;

export default function PrivacyPolicyPage() {
  return (
    <div style={{ minHeight: '100vh', color: TEXT_PRIMARY }}>
      <div style={{ maxWidth: 1024, margin: '0 auto', padding: '48px 16px' }}>
        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <Link
            href="/"
            style={{ color: PURPLE_ACCENT, marginBottom: 16, display: 'inline-block', textDecoration: 'none' }}
            className="hover:underline"
          >
            ← Back to Home
          </Link>
          <h1 style={H1_STYLE}>Privacy Policy</h1>
          <p style={SUB_COPY}>Last Updated: February 19, 2026</p>
        </div>

        {/* Content */}
        <div className="fp-glass" style={{ padding: 32, display: 'flex', flexDirection: 'column', gap: 32 }}>

          {/* Section 1 — Introduction */}
          <section>
            <h2 style={H2_STYLE}>1. Introduction</h2>
            <p style={BODY_STYLE}>
              Welcome to Flipper.ai (&ldquo;we,&rdquo; &ldquo;our,&rdquo; or &ldquo;us&rdquo;). We are committed to protecting your personal
              information and your right to privacy. This Privacy Policy explains how we collect, use,
              disclose, and safeguard your information when you use our marketplace flipping application
              and related services (collectively, the &ldquo;Service&rdquo;).
            </p>
            <p style={{ ...BODY_STYLE, marginTop: 16 }}>
              By using the Service, you agree to the collection and use of information in accordance with
              this policy. If you do not agree with our policies and practices, please do not use our Service.
            </p>
          </section>

          <hr className="fp-divider" />

          {/* Section 2 — Information We Collect */}
          <section>
            <h2 style={H2_STYLE}>2. Information We Collect</h2>

            <h3 style={H3_STYLE}>2.1 Information You Provide</h3>
            <p style={{ ...BODY_STYLE, marginBottom: 12 }}>We collect information that you voluntarily provide to us, including:</p>
            <ul style={LIST_STYLE}>
              <li><strong>Account Information:</strong> Name, email address, password (encrypted)</li>
              <li><strong>Profile Data:</strong> Optional profile picture, bio, location preferences</li>
              <li><strong>Payment Information:</strong> Processed securely through Stripe (we do not store full credit card numbers)</li>
              <li><strong>Communication Data:</strong> Messages sent through our in-app messaging system</li>
              <li><strong>User Content:</strong> Item listings, notes, photos, and descriptions you create</li>
            </ul>

            <h3 style={H3_STYLE}>2.2 Automatically Collected Information</h3>
            <p style={{ ...BODY_STYLE, marginBottom: 12 }}>When you use the Service, we automatically collect:</p>
            <ul style={LIST_STYLE}>
              <li><strong>Usage Data:</strong> Pages viewed, features used, time spent, click patterns</li>
              <li><strong>Device Information:</strong> Browser type, operating system, device identifiers</li>
              <li><strong>Log Data:</strong> IP address, access times, referring URLs</li>
              <li><strong>Cookies and Tracking:</strong> Session cookies, preference cookies, analytics cookies</li>
            </ul>

            <h3 style={H3_STYLE}>2.3 Third-Party Data</h3>
            <p style={BODY_STYLE}>
              We collect publicly available marketplace data (listings, prices, seller information) from
              third-party platforms (eBay, Craigslist, Facebook Marketplace, OfferUp, Mercari) to provide
              you with market insights. We do not collect private messages or non-public information from
              these platforms.
            </p>
          </section>

          <hr className="fp-divider" />

          {/* Section 3 — How We Use Your Information */}
          <section>
            <h2 style={H2_STYLE}>3. How We Use Your Information</h2>
            <p style={{ ...BODY_STYLE, marginBottom: 12 }}>We use your information to:</p>
            <ul style={LIST_STYLE}>
              <li>Provide, operate, and maintain the Service</li>
              <li>Process your transactions and manage your account</li>
              <li>Analyze marketplace data and provide AI-powered insights</li>
              <li>Send you notifications about opportunities, price drops, and account activity</li>
              <li>Respond to your inquiries and provide customer support</li>
              <li>Improve and personalize your experience</li>
              <li>Detect, prevent, and address technical issues and security threats</li>
              <li>Comply with legal obligations and enforce our Terms of Service</li>
              <li>Send marketing communications (with your consent, opt-out available)</li>
            </ul>
          </section>

          <hr className="fp-divider" />

          {/* Section 4 — Data Sharing and Disclosure */}
          <section>
            <h2 style={H2_STYLE}>4. Data Sharing and Disclosure</h2>

            <h3 style={H3_STYLE}>4.1 Third-Party Service Providers</h3>
            <p style={{ ...BODY_STYLE, marginBottom: 12 }}>We share data with trusted service providers:</p>
            <ul style={LIST_STYLE}>
              <li><strong>Payment Processing:</strong> Stripe (PCI-DSS compliant)</li>
              <li><strong>Cloud Hosting:</strong> Google Cloud (Firebase Hosting, Cloud Run), PostgreSQL</li>
              <li><strong>AI Analysis:</strong> Google Gemini API (for marketplace insights)</li>
              <li><strong>Error Monitoring:</strong> Sentry (for bug tracking and performance)</li>
              <li><strong>Analytics:</strong> Firebase Analytics (aggregated, non-identifiable data)</li>
              <li>
                <strong>Google Calendar:</strong> When you connect Google Calendar, Flipper AI writes, updates, and deletes calendar events on your behalf using the <code>calendar.events</code> scope. No calendar data is read or stored by Flipper AI — we only create/modify events for your scheduled buy/sell meetups. You can revoke access at any time via Settings → Integrations → Disconnect, or directly through your{' '}
                <a href="https://myaccount.google.com/permissions" style={LINK_STYLE} target="_blank" rel="noopener noreferrer">Google Account permissions page</a>. Revoking access removes your tokens from our database immediately.
              </li>
            </ul>

            <h3 style={H3_STYLE}>4.2 Legal Requirements</h3>
            <p style={BODY_STYLE}>
              We may disclose your information if required by law, subpoena, court order, or government
              request, or to protect our rights, safety, or property.
            </p>

            <h3 style={H3_STYLE}>4.3 Business Transfers</h3>
            <p style={BODY_STYLE}>
              In the event of a merger, acquisition, or sale of assets, your information may be transferred
              to the acquiring entity. We will notify you via email and/or prominent notice on our Service.
            </p>
          </section>

          <hr className="fp-divider" />

          {/* Section 5 — Data Security */}
          <section>
            <h2 style={H2_STYLE}>5. Data Security</h2>
            <p style={{ ...BODY_STYLE, marginBottom: 12 }}>
              We implement industry-standard security measures to protect your information:
            </p>
            <ul style={LIST_STYLE}>
              <li>HTTPS encryption for all data transmission</li>
              <li>Bcrypt password hashing (never stored in plain text)</li>
              <li>Secure database connections with PrismaPostgres</li>
              <li>Regular security audits and vulnerability scans</li>
              <li>Access controls and authentication via Firebase Auth</li>
            </ul>
            <p style={{ ...BODY_STYLE, marginTop: 16 }}>
              However, no method of transmission over the Internet is 100% secure. While we strive to
              protect your information, we cannot guarantee absolute security.
            </p>
          </section>

          <hr className="fp-divider" />

          {/* Section 6 — Your Privacy Rights */}
          <section>
            <h2 style={H2_STYLE}>6. Your Privacy Rights</h2>
            <p style={{ ...BODY_STYLE, marginBottom: 12 }}>Depending on your location, you may have the following rights:</p>
            <ul style={LIST_STYLE}>
              <li><strong>Access:</strong> Request a copy of your personal data</li>
              <li><strong>Correction:</strong> Update or correct inaccurate information</li>
              <li><strong>Deletion:</strong> Request deletion of your account and data (right to be forgotten)</li>
              <li><strong>Portability:</strong> Receive your data in a machine-readable format</li>
              <li><strong>Opt-Out:</strong> Unsubscribe from marketing emails (link in footer of emails)</li>
              <li><strong>Do Not Sell:</strong> We do not sell your personal information to third parties</li>
            </ul>
            <p style={{ ...BODY_STYLE, marginTop: 16 }}>
              To exercise these rights, email us at <strong>privacy@flipper-ai.com</strong> or use the
              settings in your account dashboard.
            </p>
          </section>

          <hr className="fp-divider" />

          {/* Section 7 — Cookies and Tracking */}
          <section>
            <h2 style={H2_STYLE}>7. Cookies and Tracking Technologies</h2>
            <p style={{ ...BODY_STYLE, marginBottom: 12 }}>We use cookies and similar technologies to:</p>
            <ul style={LIST_STYLE}>
              <li><strong>Essential Cookies:</strong> Required for authentication and basic functionality</li>
              <li><strong>Preference Cookies:</strong> Remember your settings and preferences</li>
              <li><strong>Analytics Cookies:</strong> Understand how you use the Service (Firebase Analytics)</li>
              <li><strong>Marketing Cookies:</strong> Deliver relevant ads (with your consent)</li>
            </ul>
            <p style={{ ...BODY_STYLE, marginTop: 16 }}>
              You can control cookies through your browser settings. Disabling essential cookies may limit
              functionality.
            </p>
          </section>

          <hr className="fp-divider" />

          {/* Section 8 — Children's Privacy */}
          <section>
            <h2 style={H2_STYLE}>8. Children&rsquo;s Privacy</h2>
            <p style={BODY_STYLE}>
              Flipper.ai is not intended for users under 18 years of age. We do not knowingly collect
              personal information from children. If you believe we have collected data from a child,
              please contact us immediately at <strong>privacy@flipper-ai.com</strong>.
            </p>
          </section>

          <hr className="fp-divider" />

          {/* Section 9 — International Data Transfers */}
          <section>
            <h2 style={H2_STYLE}>9. International Data Transfers</h2>
            <p style={BODY_STYLE}>
              Your information may be transferred to and maintained on servers located outside your country.
              By using the Service, you consent to this transfer. We ensure appropriate safeguards are in
              place to protect your data in accordance with this Privacy Policy.
            </p>
          </section>

          <hr className="fp-divider" />

          {/* Section 10 — Changes to This Policy */}
          <section>
            <h2 style={H2_STYLE}>10. Changes to This Privacy Policy</h2>
            <p style={BODY_STYLE}>
              We may update this Privacy Policy from time to time. Changes will be posted on this page with
              an updated &ldquo;Last Updated&rdquo; date. Significant changes will be communicated via email or
              in-app notification. Your continued use of the Service after changes indicates acceptance.
            </p>
          </section>

          <hr className="fp-divider" />

          {/* Section 11 — Contact Us */}
          <section data-testid="legal-content-card">
            <h2 style={H2_STYLE}>11. Contact Us</h2>
            <p style={{ ...BODY_STYLE, marginBottom: 12 }}>
              If you have questions, concerns, or requests regarding this Privacy Policy:
            </p>
            <div className="fp-glass-sm" style={{ padding: 16 }}>
              <p style={BODY_STYLE}><strong>Email:</strong> privacy@flipper-ai.com</p>
              <p style={BODY_STYLE}><strong>Support:</strong> support@flipper-ai.com</p>
              <p style={BODY_STYLE}><strong>Company:</strong> Axovia AI (Flipper.ai)</p>
              <p style={BODY_STYLE}>
                <strong>Website:</strong>{' '}
                <Link href="/" style={LINK_STYLE} className="hover:underline">https://flipper-ai.com</Link>
              </p>
            </div>
          </section>

          <hr className="fp-divider" />

          {/* Section 12 — Regional Privacy Rights */}
          <section>
            <h2 style={H2_STYLE}>12. Regional Privacy Rights</h2>

            <h3 style={H3_STYLE}>12.1 GDPR (European Users)</h3>
            <p style={BODY_STYLE}>
              If you are located in the European Economic Area (EEA), you have additional rights under GDPR:
            </p>
            <ul style={{ ...LIST_STYLE, marginTop: 12 }}>
              <li>Right to access your personal data</li>
              <li>Right to rectification of inaccurate data</li>
              <li>Right to erasure (&ldquo;right to be forgotten&rdquo;)</li>
              <li>Right to restrict processing</li>
              <li>Right to data portability</li>
              <li>Right to object to processing</li>
              <li>Right to withdraw consent at any time</li>
              <li>Right to lodge a complaint with a supervisory authority</li>
            </ul>

            <h3 style={H3_STYLE}>12.2 CCPA (California Users)</h3>
            <p style={BODY_STYLE}>
              California residents have the right to:
            </p>
            <ul style={{ ...LIST_STYLE, marginTop: 12 }}>
              <li>Know what personal information is collected</li>
              <li>Know whether personal information is sold or disclosed</li>
              <li>Say no to the sale of personal information (we do not sell data)</li>
              <li>Access your personal information</li>
              <li>Request deletion of your personal information</li>
              <li>Not be discriminated against for exercising these rights</li>
            </ul>
          </section>

        </div>

        {/* Footer Links */}
        <div style={{ marginTop: 32, textAlign: 'center', fontSize: 13, color: TEXT_SECONDARY }}>
          <Link href="/terms" style={LINK_STYLE} className="hover:underline">Terms of Service</Link>
          {' | '}
          <Link href="/" style={LINK_STYLE} className="hover:underline">Back to Home</Link>
        </div>
      </div>
    </div>
  );
}
