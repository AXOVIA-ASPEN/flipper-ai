/**
 * Privacy Policy Page
 * Author: ASPEN (Axovia AI)
 * Created: 2026-02-19
 * 
 * Required for GDPR compliance and production launch
 */

import Link from 'next/link';

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="mb-8">
          <Link href="/" className="text-blue-600 hover:text-blue-800 mb-4 inline-block">
            ← Back to Home
          </Link>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Privacy Policy</h1>
          <p className="text-gray-600">Last Updated: February 19, 2026</p>
        </div>

        {/* Content */}
        <div className="bg-white rounded-lg shadow-sm p-8 space-y-8">
          
          {/* Introduction */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">1. Introduction</h2>
            <p className="text-gray-700 leading-relaxed">
              Welcome to Flipper.ai ("we," "our," or "us"). We are committed to protecting your personal 
              information and your right to privacy. This Privacy Policy explains how we collect, use, 
              disclose, and safeguard your information when you use our marketplace flipping application 
              and related services (collectively, the "Service").
            </p>
            <p className="text-gray-700 leading-relaxed mt-4">
              By using the Service, you agree to the collection and use of information in accordance with 
              this policy. If you do not agree with our policies and practices, please do not use our Service.
            </p>
          </section>

          {/* Information We Collect */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">2. Information We Collect</h2>
            
            <h3 className="text-xl font-semibold text-gray-800 mb-3 mt-6">2.1 Information You Provide</h3>
            <p className="text-gray-700 leading-relaxed mb-3">We collect information that you voluntarily provide to us, including:</p>
            <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
              <li><strong>Account Information:</strong> Name, email address, password (encrypted)</li>
              <li><strong>Profile Data:</strong> Optional profile picture, bio, location preferences</li>
              <li><strong>Payment Information:</strong> Processed securely through Stripe (we do not store full credit card numbers)</li>
              <li><strong>Communication Data:</strong> Messages sent through our in-app messaging system</li>
              <li><strong>User Content:</strong> Item listings, notes, photos, and descriptions you create</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-800 mb-3 mt-6">2.2 Automatically Collected Information</h3>
            <p className="text-gray-700 leading-relaxed mb-3">When you use the Service, we automatically collect:</p>
            <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
              <li><strong>Usage Data:</strong> Pages viewed, features used, time spent, click patterns</li>
              <li><strong>Device Information:</strong> Browser type, operating system, device identifiers</li>
              <li><strong>Log Data:</strong> IP address, access times, referring URLs</li>
              <li><strong>Cookies and Tracking:</strong> Session cookies, preference cookies, analytics cookies</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-800 mb-3 mt-6">2.3 Third-Party Data</h3>
            <p className="text-gray-700 leading-relaxed">
              We collect publicly available marketplace data (listings, prices, seller information) from 
              third-party platforms (eBay, Craigslist, Facebook Marketplace, OfferUp, Mercari) to provide 
              you with market insights. We do not collect private messages or non-public information from 
              these platforms.
            </p>
          </section>

          {/* How We Use Your Information */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">3. How We Use Your Information</h2>
            <p className="text-gray-700 leading-relaxed mb-3">We use your information to:</p>
            <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
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

          {/* Data Sharing and Disclosure */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">4. Data Sharing and Disclosure</h2>
            
            <h3 className="text-xl font-semibold text-gray-800 mb-3 mt-6">4.1 Third-Party Service Providers</h3>
            <p className="text-gray-700 leading-relaxed mb-3">We share data with trusted service providers:</p>
            <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
              <li><strong>Payment Processing:</strong> Stripe (PCI-DSS compliant)</li>
              <li><strong>Cloud Hosting:</strong> Vercel, PrismaPostgres</li>
              <li><strong>AI Analysis:</strong> Google Gemini API (for marketplace insights)</li>
              <li><strong>Error Monitoring:</strong> Sentry (for bug tracking and performance)</li>
              <li><strong>Analytics:</strong> Vercel Analytics (aggregated, non-identifiable data)</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-800 mb-3 mt-6">4.2 Legal Requirements</h3>
            <p className="text-gray-700 leading-relaxed">
              We may disclose your information if required by law, subpoena, court order, or government 
              request, or to protect our rights, safety, or property.
            </p>

            <h3 className="text-xl font-semibold text-gray-800 mb-3 mt-6">4.3 Business Transfers</h3>
            <p className="text-gray-700 leading-relaxed">
              In the event of a merger, acquisition, or sale of assets, your information may be transferred 
              to the acquiring entity. We will notify you via email and/or prominent notice on our Service.
            </p>
          </section>

          {/* Data Security */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">5. Data Security</h2>
            <p className="text-gray-700 leading-relaxed mb-3">
              We implement industry-standard security measures to protect your information:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
              <li>HTTPS encryption for all data transmission</li>
              <li>Bcrypt password hashing (never stored in plain text)</li>
              <li>Secure database connections with PrismaPostgres</li>
              <li>Regular security audits and vulnerability scans</li>
              <li>Access controls and authentication via NextAuth.js</li>
            </ul>
            <p className="text-gray-700 leading-relaxed mt-4">
              However, no method of transmission over the Internet is 100% secure. While we strive to 
              protect your information, we cannot guarantee absolute security.
            </p>
          </section>

          {/* Your Privacy Rights */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">6. Your Privacy Rights</h2>
            <p className="text-gray-700 leading-relaxed mb-3">Depending on your location, you may have the following rights:</p>
            <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
              <li><strong>Access:</strong> Request a copy of your personal data</li>
              <li><strong>Correction:</strong> Update or correct inaccurate information</li>
              <li><strong>Deletion:</strong> Request deletion of your account and data (right to be forgotten)</li>
              <li><strong>Portability:</strong> Receive your data in a machine-readable format</li>
              <li><strong>Opt-Out:</strong> Unsubscribe from marketing emails (link in footer of emails)</li>
              <li><strong>Do Not Sell:</strong> We do not sell your personal information to third parties</li>
            </ul>
            <p className="text-gray-700 leading-relaxed mt-4">
              To exercise these rights, email us at <strong>privacy@flipper-ai.com</strong> or use the 
              settings in your account dashboard.
            </p>
          </section>

          {/* Cookies and Tracking */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">7. Cookies and Tracking Technologies</h2>
            <p className="text-gray-700 leading-relaxed mb-3">We use cookies and similar technologies to:</p>
            <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
              <li><strong>Essential Cookies:</strong> Required for authentication and basic functionality</li>
              <li><strong>Preference Cookies:</strong> Remember your settings and preferences</li>
              <li><strong>Analytics Cookies:</strong> Understand how you use the Service (Vercel Analytics)</li>
              <li><strong>Marketing Cookies:</strong> Deliver relevant ads (with your consent)</li>
            </ul>
            <p className="text-gray-700 leading-relaxed mt-4">
              You can control cookies through your browser settings. Disabling essential cookies may limit 
              functionality.
            </p>
          </section>

          {/* Children's Privacy */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">8. Children's Privacy</h2>
            <p className="text-gray-700 leading-relaxed">
              Flipper.ai is not intended for users under 18 years of age. We do not knowingly collect 
              personal information from children. If you believe we have collected data from a child, 
              please contact us immediately at <strong>privacy@flipper-ai.com</strong>.
            </p>
          </section>

          {/* International Data Transfers */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">9. International Data Transfers</h2>
            <p className="text-gray-700 leading-relaxed">
              Your information may be transferred to and maintained on servers located outside your country. 
              By using the Service, you consent to this transfer. We ensure appropriate safeguards are in 
              place to protect your data in accordance with this Privacy Policy.
            </p>
          </section>

          {/* Changes to This Policy */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">10. Changes to This Privacy Policy</h2>
            <p className="text-gray-700 leading-relaxed">
              We may update this Privacy Policy from time to time. Changes will be posted on this page with 
              an updated "Last Updated" date. Significant changes will be communicated via email or 
              in-app notification. Your continued use of the Service after changes indicates acceptance.
            </p>
          </section>

          {/* Contact Us */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">11. Contact Us</h2>
            <p className="text-gray-700 leading-relaxed mb-3">
              If you have questions, concerns, or requests regarding this Privacy Policy:
            </p>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-gray-700"><strong>Email:</strong> privacy@flipper-ai.com</p>
              <p className="text-gray-700"><strong>Support:</strong> support@flipper-ai.com</p>
              <p className="text-gray-700"><strong>Company:</strong> Axovia AI (Flipper.ai)</p>
              <p className="text-gray-700"><strong>Website:</strong> <Link href="/" className="text-blue-600 hover:underline">https://flipper-ai.com</Link></p>
            </div>
          </section>

          {/* GDPR & CCPA Notices */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">12. Regional Privacy Rights</h2>
            
            <h3 className="text-xl font-semibold text-gray-800 mb-3 mt-6">12.1 GDPR (European Users)</h3>
            <p className="text-gray-700 leading-relaxed">
              If you are located in the European Economic Area (EEA), you have additional rights under GDPR:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4 mt-3">
              <li>Right to access your personal data</li>
              <li>Right to rectification of inaccurate data</li>
              <li>Right to erasure ("right to be forgotten")</li>
              <li>Right to restrict processing</li>
              <li>Right to data portability</li>
              <li>Right to object to processing</li>
              <li>Right to withdraw consent at any time</li>
              <li>Right to lodge a complaint with a supervisory authority</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-800 mb-3 mt-6">12.2 CCPA (California Users)</h3>
            <p className="text-gray-700 leading-relaxed">
              California residents have the right to:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4 mt-3">
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
        <div className="mt-8 text-center text-sm text-gray-600">
          <Link href="/terms" className="hover:text-blue-600 underline">Terms of Service</Link>
          {" | "}
          <Link href="/" className="hover:text-blue-600 underline">Back to Home</Link>
        </div>
      </div>
    </div>
  );
}
