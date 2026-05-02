/**
 * @file app/terms/page.tsx
 * @author Stephen Boyett
 * @company Axovia AI
 * @date 2026-04-26
 * @version 2.0
 * @brief Terms of Service page rebuilt on the canonical dark-glassmorphism design system.
 *
 * @description
 * Static legal page (publicly accessible, no auth) covering eligibility, account terms,
 * acceptable use, service features, subscription billing, IP rights, disclaimers, liability
 * caps, indemnification, dispute resolution, governing law, and contact information. Required
 * for legal compliance and production launch. Migration is purely visual: drops the light-mode
 * grey page wrapper (background comes from the layout's `.fp-bg-mesh`/`.fp-bg-grid`), collapses
 * the content shell to `.fp-glass`, recolors all typography to canonical `#e2e8f0` (primary) /
 * `#94a3b8` (secondary) / `#c4b5fd` (purple link accent), and inserts
 * `<hr className="fp-divider" />` between adjacent `<section>` blocks per ADR-14.9-B and
 * pre-mortem P-5 (count = sections - 1). Disclaimer / liability call-out boxes collapse from
 * solid yellow/red backgrounds to canonical `.fp-alert-warn` / `.fp-alert-danger`. Body copy
 * is preserved verbatim — no editorial changes to the legal text.
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

export default function TermsOfServicePage() {
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
          <h1 style={H1_STYLE}>Terms of Service</h1>
          <p style={SUB_COPY}>Last Updated: February 19, 2026</p>
        </div>

        {/* Content */}
        <div className="fp-glass" style={{ padding: 32, display: 'flex', flexDirection: 'column', gap: 32 }}>

          {/* 1 — Agreement to Terms */}
          <section>
            <h2 style={H2_STYLE}>1. Agreement to Terms</h2>
            <p style={BODY_STYLE}>
              These Terms of Service (&ldquo;Terms&rdquo;) constitute a legally binding agreement between you and
              Axovia AI (&ldquo;Flipper.ai,&rdquo; &ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;our&rdquo;) regarding your use of the Flipper.ai
              marketplace flipping application and related services (collectively, the &ldquo;Service&rdquo;).
            </p>
            <p style={{ ...BODY_STYLE, marginTop: 16 }}>
              By accessing or using the Service, you agree to be bound by these Terms. If you do not
              agree to these Terms, do not use the Service.
            </p>
          </section>

          <hr className="fp-divider" />

          {/* 2 — Eligibility */}
          <section>
            <h2 style={H2_STYLE}>2. Eligibility</h2>
            <p style={{ ...BODY_STYLE, marginBottom: 12 }}>To use the Service, you must:</p>
            <ul style={LIST_STYLE}>
              <li>Be at least 18 years of age</li>
              <li>Have the legal capacity to enter into binding contracts</li>
              <li>Not be prohibited from using the Service under applicable laws</li>
              <li>Provide accurate and complete registration information</li>
              <li>Maintain the security of your account credentials</li>
            </ul>
            <p style={{ ...BODY_STYLE, marginTop: 16 }}>
              By creating an account, you represent and warrant that you meet these requirements.
            </p>
          </section>

          <hr className="fp-divider" />

          {/* 3 — User Accounts */}
          <section>
            <h2 style={H2_STYLE}>3. User Accounts</h2>

            <h3 style={H3_STYLE}>3.1 Account Creation</h3>
            <p style={BODY_STYLE}>
              You must create an account to use certain features of the Service. You are responsible for:
            </p>
            <ul style={{ ...LIST_STYLE, marginTop: 12 }}>
              <li>Maintaining the confidentiality of your password</li>
              <li>All activities that occur under your account</li>
              <li>Notifying us immediately of any unauthorized access</li>
              <li>Ensuring your account information is accurate and up-to-date</li>
            </ul>

            <h3 style={H3_STYLE}>3.2 Account Termination</h3>
            <p style={BODY_STYLE}>
              We reserve the right to suspend or terminate your account at any time, with or without
              notice, for violations of these Terms, fraudulent activity, or any other reason at our
              sole discretion. You may delete your account at any time through account settings.
            </p>
          </section>

          <hr className="fp-divider" />

          {/* 4 — Acceptable Use */}
          <section>
            <h2 style={H2_STYLE}>4. Acceptable Use Policy</h2>

            <h3 style={H3_STYLE}>4.1 Permitted Uses</h3>
            <p style={BODY_STYLE}>You may use the Service to:</p>
            <ul style={{ ...LIST_STYLE, marginTop: 12 }}>
              <li>Search for marketplace items and analyze flipping opportunities</li>
              <li>Track items from discovery to resale</li>
              <li>Communicate with sellers through integrated messaging</li>
              <li>Generate optimized resale listings</li>
              <li>Manage your flipping business workflow</li>
            </ul>

            <h3 style={H3_STYLE}>4.2 Prohibited Activities</h3>
            <p style={BODY_STYLE}>You agree NOT to:</p>
            <ul style={{ ...LIST_STYLE, marginTop: 12 }}>
              <li>Violate any laws, regulations, or third-party rights</li>
              <li>Use the Service for any illegal or fraudulent purpose</li>
              <li>Scrape, harvest, or collect data from third-party marketplaces beyond our permitted scope</li>
              <li>Engage in price manipulation, bid rigging, or anticompetitive behavior</li>
              <li>Impersonate others or provide false information</li>
              <li>Transmit viruses, malware, or harmful code</li>
              <li>Reverse engineer, decompile, or disassemble the Service</li>
              <li>Resell or redistribute access to the Service without authorization</li>
              <li>Attempt to gain unauthorized access to our systems or user accounts</li>
              <li>Use automated bots or scripts to abuse the Service (except our provided features)</li>
              <li>Harass, threaten, or abuse other users</li>
            </ul>
          </section>

          <hr className="fp-divider" />

          {/* 5 — Service Features */}
          <section>
            <h2 style={H2_STYLE}>5. Service Features and Limitations</h2>

            <h3 style={H3_STYLE}>5.1 AI-Powered Analysis</h3>
            <p style={BODY_STYLE}>
              Our AI analysis tools (pricing estimates, demand predictions, listing generation) are
              provided for informational purposes only. We do not guarantee accuracy, profitability,
              or success in any transaction. You are solely responsible for your business decisions.
            </p>

            <h3 style={H3_STYLE}>5.2 Third-Party Marketplace Data</h3>
            <p style={BODY_STYLE}>
              We aggregate publicly available data from third-party marketplaces (eBay, Craigslist,
              Facebook Marketplace, OfferUp, Mercari). We are not affiliated with these platforms.
              You must comply with each platform&rsquo;s terms of service when conducting transactions.
            </p>

            <h3 style={H3_STYLE}>5.3 Service Availability</h3>
            <p style={BODY_STYLE}>
              We strive for 99% uptime but do not guarantee uninterrupted service. We may suspend
              the Service for maintenance, updates, or emergencies. We are not liable for any
              downtime or data loss.
            </p>
          </section>

          <hr className="fp-divider" />

          {/* 6 — Subscription and Payment */}
          <section>
            <h2 style={H2_STYLE}>6. Subscription and Payment Terms</h2>

            <h3 style={H3_STYLE}>6.1 Pricing Plans</h3>
            <p style={{ ...BODY_STYLE, marginBottom: 12 }}>We offer the following plans:</p>
            <ul style={LIST_STYLE}>
              <li><strong>Free Plan:</strong> Limited features (5 scans/month, basic tracking)</li>
              <li><strong>Pro Plan:</strong> $15/month (unlimited scans, AI analysis, full features)</li>
              <li><strong>Team Plan:</strong> $40/month (multi-user access, advanced analytics)</li>
            </ul>

            <h3 style={H3_STYLE}>6.2 Payment Processing</h3>
            <p style={BODY_STYLE}>
              Payments are processed securely through Stripe. By subscribing, you authorize us to charge
              your payment method on a recurring basis. All fees are non-refundable unless required by law.
            </p>

            <h3 style={H3_STYLE}>6.3 Cancellation</h3>
            <p style={BODY_STYLE}>
              You may cancel your subscription at any time through account settings. Cancellation takes
              effect at the end of your current billing period. No partial refunds are provided.
            </p>

            <h3 style={H3_STYLE}>6.4 Price Changes</h3>
            <p style={BODY_STYLE}>
              We reserve the right to change pricing at any time. You will receive 30 days&rsquo; notice of
              any price increases. Continued use after the notice period constitutes acceptance.
            </p>
          </section>

          <hr className="fp-divider" />

          {/* 7 — Intellectual Property */}
          <section>
            <h2 style={H2_STYLE}>7. Intellectual Property Rights</h2>

            <h3 style={H3_STYLE}>7.1 Our IP</h3>
            <p style={BODY_STYLE}>
              All content, features, and functionality of the Service (including but not limited to
              software, design, text, graphics, logos, AI models) are owned by Axovia AI and protected
              by copyright, trademark, and other intellectual property laws. You may not copy, modify,
              distribute, or create derivative works without our written permission.
            </p>

            <h3 style={H3_STYLE}>7.2 Your Content</h3>
            <p style={BODY_STYLE}>
              You retain ownership of any content you create or upload (listings, notes, photos).
              By using the Service, you grant us a worldwide, non-exclusive, royalty-free license to
              use, store, display, and process your content solely to provide the Service.
            </p>

            <h3 style={H3_STYLE}>7.3 Feedback</h3>
            <p style={BODY_STYLE}>
              Any feedback, suggestions, or ideas you provide to us become our property. We may use
              them without compensation or attribution.
            </p>
          </section>

          <hr className="fp-divider" />

          {/* 8 — Disclaimers */}
          <section>
            <h2 style={H2_STYLE}>8. Disclaimers</h2>
            <div className="fp-alert-warn" style={{ padding: 16, marginTop: 16, marginBottom: 16 }}>
              <p style={{ ...BODY_STYLE, fontWeight: 600 }}>
                THE SERVICE IS PROVIDED &ldquo;AS IS&rdquo; AND &ldquo;AS AVAILABLE&rdquo; WITHOUT WARRANTIES OF ANY KIND,
                EXPRESS OR IMPLIED.
              </p>
            </div>
            <p style={{ ...BODY_STYLE, marginBottom: 12 }}>We disclaim all warranties, including but not limited to:</p>
            <ul style={LIST_STYLE}>
              <li>Merchantability, fitness for a particular purpose, and non-infringement</li>
              <li>Accuracy, reliability, or completeness of any content or data</li>
              <li>Uninterrupted, secure, or error-free operation</li>
              <li>Results, profits, or success from using the Service</li>
            </ul>
            <p style={{ ...BODY_STYLE, marginTop: 16 }}>
              We are not responsible for third-party marketplace data, user-generated content, or
              external websites linked from the Service.
            </p>
          </section>

          <hr className="fp-divider" />

          {/* 9 — Limitation of Liability */}
          <section>
            <h2 style={H2_STYLE}>9. Limitation of Liability</h2>
            <div className="fp-alert-danger" style={{ padding: 16, marginTop: 16, marginBottom: 16 }}>
              <p style={{ ...BODY_STYLE, fontWeight: 600 }}>
                TO THE MAXIMUM EXTENT PERMITTED BY LAW, AXOVIA AI SHALL NOT BE LIABLE FOR ANY INDIRECT,
                INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS,
                REVENUE, DATA, OR USE.
              </p>
            </div>
            <p style={BODY_STYLE}>
              Our total liability for any claim arising from your use of the Service is limited to the
              amount you paid us in the 12 months preceding the claim, or $100, whichever is greater.
            </p>
            <p style={{ ...BODY_STYLE, marginTop: 16 }}>
              Some jurisdictions do not allow the exclusion or limitation of liability, so the above
              may not apply to you.
            </p>
          </section>

          <hr className="fp-divider" />

          {/* 10 — Indemnification */}
          <section>
            <h2 style={H2_STYLE}>10. Indemnification</h2>
            <p style={BODY_STYLE}>
              You agree to indemnify, defend, and hold harmless Axovia AI, its affiliates, officers,
              directors, employees, and agents from any claims, damages, losses, liabilities, and
              expenses (including legal fees) arising from:
            </p>
            <ul style={{ ...LIST_STYLE, marginTop: 12 }}>
              <li>Your use or misuse of the Service</li>
              <li>Your violation of these Terms</li>
              <li>Your violation of any third-party rights</li>
              <li>Your content or conduct</li>
            </ul>
          </section>

          <hr className="fp-divider" />

          {/* 11 — Dispute Resolution */}
          <section>
            <h2 style={H2_STYLE}>11. Dispute Resolution</h2>

            <h3 style={H3_STYLE}>11.1 Informal Resolution</h3>
            <p style={BODY_STYLE}>
              Before filing any legal claim, you agree to contact us at <strong>support@flipper-ai.com</strong>
              and attempt to resolve the issue informally for at least 30 days.
            </p>

            <h3 style={H3_STYLE}>11.2 Arbitration Agreement</h3>
            <p style={BODY_STYLE}>
              If informal resolution fails, you agree that any dispute will be resolved through binding
              arbitration conducted by the American Arbitration Association (AAA) under its Commercial
              Arbitration Rules. The arbitration will be conducted in English, and the decision will be
              final and binding.
            </p>

            <h3 style={H3_STYLE}>11.3 Class Action Waiver</h3>
            <p style={BODY_STYLE}>
              You agree to resolve disputes individually and waive the right to participate in class
              actions, class arbitrations, or representative proceedings.
            </p>

            <h3 style={H3_STYLE}>11.4 Exceptions</h3>
            <p style={BODY_STYLE}>
              Either party may seek injunctive relief in court for intellectual property infringement
              or unauthorized access.
            </p>
          </section>

          <hr className="fp-divider" />

          {/* 12 — Governing Law */}
          <section>
            <h2 style={H2_STYLE}>12. Governing Law</h2>
            <p style={BODY_STYLE}>
              These Terms are governed by the laws of the State of Delaware, United States, without
              regard to conflict of law principles. Any legal action must be brought in the state or
              federal courts located in Delaware.
            </p>
          </section>

          <hr className="fp-divider" />

          {/* 13 — Changes to Terms */}
          <section>
            <h2 style={H2_STYLE}>13. Changes to These Terms</h2>
            <p style={BODY_STYLE}>
              We may update these Terms at any time. Material changes will be notified via email or
              in-app notification. Your continued use of the Service after changes constitutes acceptance.
              If you do not agree, you must stop using the Service.
            </p>
          </section>

          <hr className="fp-divider" />

          {/* 14 — Miscellaneous */}
          <section>
            <h2 style={H2_STYLE}>14. Miscellaneous</h2>

            <h3 style={H3_STYLE}>14.1 Entire Agreement</h3>
            <p style={BODY_STYLE}>
              These Terms, along with our Privacy Policy, constitute the entire agreement between you
              and Axovia AI.
            </p>

            <h3 style={H3_STYLE}>14.2 Severability</h3>
            <p style={BODY_STYLE}>
              If any provision of these Terms is found invalid or unenforceable, the remaining provisions
              remain in full force and effect.
            </p>

            <h3 style={H3_STYLE}>14.3 Waiver</h3>
            <p style={BODY_STYLE}>
              Our failure to enforce any right or provision does not constitute a waiver of that right.
            </p>

            <h3 style={H3_STYLE}>14.4 Assignment</h3>
            <p style={BODY_STYLE}>
              You may not assign or transfer these Terms without our written consent. We may assign
              these Terms to any affiliate or successor.
            </p>

            <h3 style={H3_STYLE}>14.5 No Agency</h3>
            <p style={BODY_STYLE}>
              Nothing in these Terms creates a partnership, joint venture, agency, or employment
              relationship.
            </p>
          </section>

          <hr className="fp-divider" />

          {/* 15 — Contact Us */}
          <section data-testid="legal-content-card">
            <h2 style={H2_STYLE}>15. Contact Information</h2>
            <p style={{ ...BODY_STYLE, marginBottom: 12 }}>
              If you have questions or concerns about these Terms:
            </p>
            <div className="fp-glass-sm" style={{ padding: 16 }}>
              <p style={BODY_STYLE}><strong>Email:</strong> support@flipper-ai.com</p>
              <p style={BODY_STYLE}><strong>Legal:</strong> legal@flipper-ai.com</p>
              <p style={BODY_STYLE}><strong>Company:</strong> Axovia AI (Flipper.ai)</p>
              <p style={BODY_STYLE}>
                <strong>Website:</strong>{' '}
                <Link href="/" style={LINK_STYLE} className="hover:underline">https://flipper-ai.com</Link>
              </p>
            </div>
          </section>

        </div>

        {/* Footer Links */}
        <div style={{ marginTop: 32, textAlign: 'center', fontSize: 13, color: TEXT_SECONDARY }}>
          <Link href="/privacy" style={LINK_STYLE} className="hover:underline">Privacy Policy</Link>
          {' | '}
          <Link href="/" style={LINK_STYLE} className="hover:underline">Back to Home</Link>
        </div>
      </div>
    </div>
  );
}
