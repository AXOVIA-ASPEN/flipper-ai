/**
 * Terms of Service Page
 * Author: ASPEN (Axovia AI)
 * Created: 2026-02-19
 * 
 * Required for legal compliance and production launch
 */

import Link from 'next/link';

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="mb-8">
          <Link href="/" className="text-blue-600 hover:text-blue-800 mb-4 inline-block">
            ← Back to Home
          </Link>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Terms of Service</h1>
          <p className="text-gray-600">Last Updated: February 19, 2026</p>
        </div>

        {/* Content */}
        <div className="bg-white rounded-lg shadow-sm p-8 space-y-8">
          
          {/* Introduction */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">1. Agreement to Terms</h2>
            <p className="text-gray-700 leading-relaxed">
              These Terms of Service ("Terms") constitute a legally binding agreement between you and 
              Axovia AI ("Flipper.ai," "we," "us," or "our") regarding your use of the Flipper.ai 
              marketplace flipping application and related services (collectively, the "Service").
            </p>
            <p className="text-gray-700 leading-relaxed mt-4">
              By accessing or using the Service, you agree to be bound by these Terms. If you do not 
              agree to these Terms, do not use the Service.
            </p>
          </section>

          {/* Eligibility */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">2. Eligibility</h2>
            <p className="text-gray-700 leading-relaxed mb-3">To use the Service, you must:</p>
            <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
              <li>Be at least 18 years of age</li>
              <li>Have the legal capacity to enter into binding contracts</li>
              <li>Not be prohibited from using the Service under applicable laws</li>
              <li>Provide accurate and complete registration information</li>
              <li>Maintain the security of your account credentials</li>
            </ul>
            <p className="text-gray-700 leading-relaxed mt-4">
              By creating an account, you represent and warrant that you meet these requirements.
            </p>
          </section>

          {/* User Accounts */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">3. User Accounts</h2>
            
            <h3 className="text-xl font-semibold text-gray-800 mb-3 mt-6">3.1 Account Creation</h3>
            <p className="text-gray-700 leading-relaxed">
              You must create an account to use certain features of the Service. You are responsible for:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4 mt-3">
              <li>Maintaining the confidentiality of your password</li>
              <li>All activities that occur under your account</li>
              <li>Notifying us immediately of any unauthorized access</li>
              <li>Ensuring your account information is accurate and up-to-date</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-800 mb-3 mt-6">3.2 Account Termination</h3>
            <p className="text-gray-700 leading-relaxed">
              We reserve the right to suspend or terminate your account at any time, with or without 
              notice, for violations of these Terms, fraudulent activity, or any other reason at our 
              sole discretion. You may delete your account at any time through account settings.
            </p>
          </section>

          {/* Acceptable Use */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">4. Acceptable Use Policy</h2>
            
            <h3 className="text-xl font-semibold text-gray-800 mb-3 mt-6">4.1 Permitted Uses</h3>
            <p className="text-gray-700 leading-relaxed">You may use the Service to:</p>
            <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4 mt-3">
              <li>Search for marketplace items and analyze flipping opportunities</li>
              <li>Track items from discovery to resale</li>
              <li>Communicate with sellers through integrated messaging</li>
              <li>Generate optimized resale listings</li>
              <li>Manage your flipping business workflow</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-800 mb-3 mt-6">4.2 Prohibited Activities</h3>
            <p className="text-gray-700 leading-relaxed">You agree NOT to:</p>
            <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4 mt-3">
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

          {/* Service Features */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">5. Service Features and Limitations</h2>
            
            <h3 className="text-xl font-semibold text-gray-800 mb-3 mt-6">5.1 AI-Powered Analysis</h3>
            <p className="text-gray-700 leading-relaxed">
              Our AI analysis tools (pricing estimates, demand predictions, listing generation) are 
              provided for informational purposes only. We do not guarantee accuracy, profitability, 
              or success in any transaction. You are solely responsible for your business decisions.
            </p>

            <h3 className="text-xl font-semibold text-gray-800 mb-3 mt-6">5.2 Third-Party Marketplace Data</h3>
            <p className="text-gray-700 leading-relaxed">
              We aggregate publicly available data from third-party marketplaces (eBay, Craigslist, 
              Facebook Marketplace, OfferUp, Mercari). We are not affiliated with these platforms. 
              You must comply with each platform's terms of service when conducting transactions.
            </p>

            <h3 className="text-xl font-semibold text-gray-800 mb-3 mt-6">5.3 Service Availability</h3>
            <p className="text-gray-700 leading-relaxed">
              We strive for 99% uptime but do not guarantee uninterrupted service. We may suspend 
              the Service for maintenance, updates, or emergencies. We are not liable for any 
              downtime or data loss.
            </p>
          </section>

          {/* Subscription and Payment */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">6. Subscription and Payment Terms</h2>
            
            <h3 className="text-xl font-semibold text-gray-800 mb-3 mt-6">6.1 Pricing Plans</h3>
            <p className="text-gray-700 leading-relaxed mb-3">We offer the following plans:</p>
            <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
              <li><strong>Free Plan:</strong> Limited features (5 scans/month, basic tracking)</li>
              <li><strong>Pro Plan:</strong> $15/month (unlimited scans, AI analysis, full features)</li>
              <li><strong>Team Plan:</strong> $40/month (multi-user access, advanced analytics)</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-800 mb-3 mt-6">6.2 Payment Processing</h3>
            <p className="text-gray-700 leading-relaxed">
              Payments are processed securely through Stripe. By subscribing, you authorize us to charge 
              your payment method on a recurring basis. All fees are non-refundable unless required by law.
            </p>

            <h3 className="text-xl font-semibold text-gray-800 mb-3 mt-6">6.3 Cancellation</h3>
            <p className="text-gray-700 leading-relaxed">
              You may cancel your subscription at any time through account settings. Cancellation takes 
              effect at the end of your current billing period. No partial refunds are provided.
            </p>

            <h3 className="text-xl font-semibold text-gray-800 mb-3 mt-6">6.4 Price Changes</h3>
            <p className="text-gray-700 leading-relaxed">
              We reserve the right to change pricing at any time. You will receive 30 days' notice of 
              any price increases. Continued use after the notice period constitutes acceptance.
            </p>
          </section>

          {/* Intellectual Property */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">7. Intellectual Property Rights</h2>
            
            <h3 className="text-xl font-semibold text-gray-800 mb-3 mt-6">7.1 Our IP</h3>
            <p className="text-gray-700 leading-relaxed">
              All content, features, and functionality of the Service (including but not limited to 
              software, design, text, graphics, logos, AI models) are owned by Axovia AI and protected 
              by copyright, trademark, and other intellectual property laws. You may not copy, modify, 
              distribute, or create derivative works without our written permission.
            </p>

            <h3 className="text-xl font-semibold text-gray-800 mb-3 mt-6">7.2 Your Content</h3>
            <p className="text-gray-700 leading-relaxed">
              You retain ownership of any content you create or upload (listings, notes, photos). 
              By using the Service, you grant us a worldwide, non-exclusive, royalty-free license to 
              use, store, display, and process your content solely to provide the Service.
            </p>

            <h3 className="text-xl font-semibold text-gray-800 mb-3 mt-6">7.3 Feedback</h3>
            <p className="text-gray-700 leading-relaxed">
              Any feedback, suggestions, or ideas you provide to us become our property. We may use 
              them without compensation or attribution.
            </p>
          </section>

          {/* Disclaimers */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">8. Disclaimers</h2>
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 my-4">
              <p className="text-gray-700 leading-relaxed font-semibold">
                THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, 
                EXPRESS OR IMPLIED.
              </p>
            </div>
            <p className="text-gray-700 leading-relaxed mb-3">We disclaim all warranties, including but not limited to:</p>
            <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
              <li>Merchantability, fitness for a particular purpose, and non-infringement</li>
              <li>Accuracy, reliability, or completeness of any content or data</li>
              <li>Uninterrupted, secure, or error-free operation</li>
              <li>Results, profits, or success from using the Service</li>
            </ul>
            <p className="text-gray-700 leading-relaxed mt-4">
              We are not responsible for third-party marketplace data, user-generated content, or 
              external websites linked from the Service.
            </p>
          </section>

          {/* Limitation of Liability */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">9. Limitation of Liability</h2>
            <div className="bg-red-50 border-l-4 border-red-400 p-4 my-4">
              <p className="text-gray-700 leading-relaxed font-semibold">
                TO THE MAXIMUM EXTENT PERMITTED BY LAW, AXOVIA AI SHALL NOT BE LIABLE FOR ANY INDIRECT, 
                INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS, 
                REVENUE, DATA, OR USE.
              </p>
            </div>
            <p className="text-gray-700 leading-relaxed">
              Our total liability for any claim arising from your use of the Service is limited to the 
              amount you paid us in the 12 months preceding the claim, or $100, whichever is greater.
            </p>
            <p className="text-gray-700 leading-relaxed mt-4">
              Some jurisdictions do not allow the exclusion or limitation of liability, so the above 
              may not apply to you.
            </p>
          </section>

          {/* Indemnification */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">10. Indemnification</h2>
            <p className="text-gray-700 leading-relaxed">
              You agree to indemnify, defend, and hold harmless Axovia AI, its affiliates, officers, 
              directors, employees, and agents from any claims, damages, losses, liabilities, and 
              expenses (including legal fees) arising from:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4 mt-3">
              <li>Your use or misuse of the Service</li>
              <li>Your violation of these Terms</li>
              <li>Your violation of any third-party rights</li>
              <li>Your content or conduct</li>
            </ul>
          </section>

          {/* Dispute Resolution */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">11. Dispute Resolution</h2>
            
            <h3 className="text-xl font-semibold text-gray-800 mb-3 mt-6">11.1 Informal Resolution</h3>
            <p className="text-gray-700 leading-relaxed">
              Before filing any legal claim, you agree to contact us at <strong>support@flipper-ai.com</strong> 
              and attempt to resolve the issue informally for at least 30 days.
            </p>

            <h3 className="text-xl font-semibold text-gray-800 mb-3 mt-6">11.2 Arbitration Agreement</h3>
            <p className="text-gray-700 leading-relaxed">
              If informal resolution fails, you agree that any dispute will be resolved through binding 
              arbitration conducted by the American Arbitration Association (AAA) under its Commercial 
              Arbitration Rules. The arbitration will be conducted in English, and the decision will be 
              final and binding.
            </p>

            <h3 className="text-xl font-semibold text-gray-800 mb-3 mt-6">11.3 Class Action Waiver</h3>
            <p className="text-gray-700 leading-relaxed">
              You agree to resolve disputes individually and waive the right to participate in class 
              actions, class arbitrations, or representative proceedings.
            </p>

            <h3 className="text-xl font-semibold text-gray-800 mb-3 mt-6">11.4 Exceptions</h3>
            <p className="text-gray-700 leading-relaxed">
              Either party may seek injunctive relief in court for intellectual property infringement 
              or unauthorized access.
            </p>
          </section>

          {/* Governing Law */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">12. Governing Law</h2>
            <p className="text-gray-700 leading-relaxed">
              These Terms are governed by the laws of the State of Delaware, United States, without 
              regard to conflict of law principles. Any legal action must be brought in the state or 
              federal courts located in Delaware.
            </p>
          </section>

          {/* Changes to Terms */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">13. Changes to These Terms</h2>
            <p className="text-gray-700 leading-relaxed">
              We may update these Terms at any time. Material changes will be notified via email or 
              in-app notification. Your continued use of the Service after changes constitutes acceptance. 
              If you do not agree, you must stop using the Service.
            </p>
          </section>

          {/* Miscellaneous */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">14. Miscellaneous</h2>
            
            <h3 className="text-xl font-semibold text-gray-800 mb-3 mt-6">14.1 Entire Agreement</h3>
            <p className="text-gray-700 leading-relaxed">
              These Terms, along with our Privacy Policy, constitute the entire agreement between you 
              and Axovia AI.
            </p>

            <h3 className="text-xl font-semibold text-gray-800 mb-3 mt-6">14.2 Severability</h3>
            <p className="text-gray-700 leading-relaxed">
              If any provision of these Terms is found invalid or unenforceable, the remaining provisions 
              remain in full force and effect.
            </p>

            <h3 className="text-xl font-semibold text-gray-800 mb-3 mt-6">14.3 Waiver</h3>
            <p className="text-gray-700 leading-relaxed">
              Our failure to enforce any right or provision does not constitute a waiver of that right.
            </p>

            <h3 className="text-xl font-semibold text-gray-800 mb-3 mt-6">14.4 Assignment</h3>
            <p className="text-gray-700 leading-relaxed">
              You may not assign or transfer these Terms without our written consent. We may assign 
              these Terms to any affiliate or successor.
            </p>

            <h3 className="text-xl font-semibold text-gray-800 mb-3 mt-6">14.5 No Agency</h3>
            <p className="text-gray-700 leading-relaxed">
              Nothing in these Terms creates a partnership, joint venture, agency, or employment 
              relationship.
            </p>
          </section>

          {/* Contact Us */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">15. Contact Information</h2>
            <p className="text-gray-700 leading-relaxed mb-3">
              If you have questions or concerns about these Terms:
            </p>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-gray-700"><strong>Email:</strong> support@flipper-ai.com</p>
              <p className="text-gray-700"><strong>Legal:</strong> legal@flipper-ai.com</p>
              <p className="text-gray-700"><strong>Company:</strong> Axovia AI (Flipper.ai)</p>
              <p className="text-gray-700"><strong>Website:</strong> <Link href="/" className="text-blue-600 hover:underline">https://flipper-ai.com</Link></p>
            </div>
          </section>

        </div>

        {/* Footer Links */}
        <div className="mt-8 text-center text-sm text-gray-600">
          <Link href="/privacy" className="hover:text-blue-600 underline">Privacy Policy</Link>
          {" | "}
          <Link href="/" className="hover:text-blue-600 underline">Back to Home</Link>
        </div>
      </div>
    </div>
  );
}
