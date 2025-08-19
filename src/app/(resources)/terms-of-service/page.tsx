import React from 'react'

export const metadata = {
  title: 'Terms of Service',
  description: 'Terms governing the use of this application.',
}

export default function TermsOfService() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <header className="mb-10">
        <h1 className="text-3xl font-bold tracking-tight">Terms of Service</h1>
        <p className="text-sm text-muted-foreground mt-2">Last updated: <span className="font-medium">August 19, 2025</span></p>
      </header>

      <section className="space-y-4 mb-8" id="acceptance">
        <h2 className="text-xl font-semibold">1. Acceptance of Terms</h2>
        <p>
          By accessing or using this website and related services (the &quot;Service&quot;), you agree to be bound by these Terms of Service (&quot;Terms&quot;).
          If you do not agree to these Terms, do not use the Service.
        </p>
      </section>

      <section className="space-y-4 mb-8" id="eligibility">
        <h2 className="text-xl font-semibold">2. Eligibility</h2>
        <p>
          You must be at least 13 years old (or the minimum legal age in your jurisdiction) to use the Service.
          By using the Service, you represent and warrant that you meet these requirements.
        </p>
      </section>

      <section className="space-y-4 mb-8" id="accounts">
        <h2 className="text-xl font-semibold">3. Accounts and Security</h2>
        <ul className="list-disc pl-6 space-y-2">
          <li>You are responsible for safeguarding your account credentials and for all activities under your account.</li>
          <li>You must promptly notify us of any unauthorized use of your account.</li>
          <li>We may suspend or terminate accounts that violate these Terms.</li>
        </ul>
      </section>

      <section className="space-y-4 mb-8" id="use-of-service">
        <h2 className="text-xl font-semibold">4. Acceptable Use</h2>
        <p>When using the Service, you agree NOT to:</p>
        <ul className="list-disc pl-6 space-y-2">
          <li>Violate any applicable law or regulation.</li>
          <li>Infringe the rights of others, including privacy, intellectual property, or publicity rights.</li>
          <li>Upload or transmit malware, spam, or harmful code.</li>
          <li>Attempt to reverse engineer, disrupt, or interfere with the Service’s integrity or performance.</li>
        </ul>
      </section>

      <section className="space-y-4 mb-8" id="content">
        <h2 className="text-xl font-semibold">5. User Content</h2>
        <ul className="list-disc pl-6 space-y-2">
          <li>You retain ownership of content you submit to the Service.</li>
          <li>By submitting content, you grant us a non-exclusive, worldwide, royalty-free license to host, store, and display it solely to operate and improve the Service.</li>
          <li>You are responsible for ensuring your content complies with these Terms and applicable laws.</li>
        </ul>
      </section>

      <section className="space-y-4 mb-8" id="intellectual-property">
        <h2 className="text-xl font-semibold">6. Intellectual Property</h2>
        <p>
          The Service and its original content, features, and functionality are owned by the Service provider and are protected by international
          copyright, trademark, patent, trade secret, and other intellectual property laws.
        </p>
      </section>

      <section className="space-y-4 mb-8" id="third-parties">
        <h2 className="text-xl font-semibold">7. Third-Party Services</h2>
        <p>
          The Service may integrate with or link to third-party services. We are not responsible for the content, policies, or practices of third parties,
          and your use of those services is governed by their terms.
        </p>
      </section>

      <section className="space-y-4 mb-8" id="fees">
        <h2 className="text-xl font-semibold">8. Fees and Payments</h2>
        <p>
          If any paid features are offered, you agree to pay all applicable fees. Prices, billing cycles, and refund policies will be disclosed at purchase time.
        </p>
      </section>

      <section className="space-y-4 mb-8" id="privacy">
        <h2 className="text-xl font-semibold">9. Privacy</h2>
        <p>
          Your use of the Service is also governed by our Privacy Policy. Please review it to understand how we collect, use, and share information.
        </p>
      </section>

      <section className="space-y-4 mb-8" id="termination">
        <h2 className="text-xl font-semibold">10. Termination</h2>
        <p>
          We may suspend or terminate your access to the Service at any time, with or without cause or notice. Upon termination, your right to use the
          Service will cease immediately. Certain provisions of these Terms will survive termination.
        </p>
      </section>

      <section className="space-y-4 mb-8" id="disclaimer">
        <h2 className="text-xl font-semibold">11. Disclaimers</h2>
        <p className="text-sm text-muted-foreground">
          THE SERVICE IS PROVIDED “AS IS” AND “AS AVAILABLE” WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO
          IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT. WE DO NOT WARRANT THAT THE SERVICE WILL BE
          UNINTERRUPTED, SECURE, OR ERROR-FREE.
        </p>
      </section>

      <section className="space-y-4 mb-8" id="liability">
        <h2 className="text-xl font-semibold">12. Limitation of Liability</h2>
        <p className="text-sm text-muted-foreground">
          TO THE MAXIMUM EXTENT PERMITTED BY LAW, IN NO EVENT SHALL WE BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES,
          OR ANY LOSS OF PROFITS OR REVENUES, WHETHER INCURRED DIRECTLY OR INDIRECTLY, OR ANY LOSS OF DATA, USE, GOODWILL, OR OTHER INTANGIBLE LOSSES,
          RESULTING FROM YOUR ACCESS TO OR USE OF THE SERVICE.
        </p>
      </section>

      <section className="space-y-4 mb-8" id="indemnification">
        <h2 className="text-xl font-semibold">13. Indemnification</h2>
        <p>
          You agree to defend, indemnify, and hold harmless the Service provider and its affiliates from and against any claims, liabilities, damages,
          losses, and expenses arising out of or in any way connected with your use of the Service or violation of these Terms.
        </p>
      </section>

      <section className="space-y-4 mb-8" id="governing-law">
        <h2 className="text-xl font-semibold">14. Governing Law</h2>
        <p>
          These Terms are governed by the laws of your applicable jurisdiction without regard to its conflict of law provisions.
        </p>
      </section>

      <section className="space-y-4 mb-8" id="changes">
        <h2 className="text-xl font-semibold">15. Changes to Terms</h2>
        <p>
          We may update these Terms from time to time. Changes are effective when posted on this page. Your continued use of the Service after changes
          become effective constitutes acceptance of the revised Terms.
        </p>
      </section>

      <section className="space-y-2" id="contact">
        <h2 className="text-xl font-semibold">16. Contact</h2>
        <p>
          Questions about these Terms? Contact us at <a className="text-blue-600 hover:underline" href="mailto:support@example.com">support@example.com</a>.
        </p>
      </section>
    </main>
  )
}