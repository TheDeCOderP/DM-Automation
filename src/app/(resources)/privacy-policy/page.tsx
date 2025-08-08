import Head from 'next/head';

export default function PrivacyPolicy() {
  return (
    <>
      <Head>
        <title>Privacy Policy — DM Automation</title>
        <meta
          name="description"
          content="Privacy Policy for DM Automation — how we collect, use, retain and protect user data."
        />
      </Head>

      <main className="min-h-screen bg-white text-slate-800 py-12">
        <div className="max-w-3xl mx-auto px-6 lg:px-8 prose prose-slate">
          <h1>Privacy Policy</h1>

          <p>
            Effective date: <strong>August 8, 2025</strong>
          </p>

          <p>
            Welcome to <a href="https://dm-automation.prabisha.com/">DM Automation</a> (&quot;we&quot;, &quot;us&quot;, &quot;our&quot;). This Privacy Policy explains what information we collect, how we use and store it, and your rights related to that information. By using our service you agree to the collection and use of information in accordance with this policy.
          </p>

          <h2>1. Information we collect</h2>

          <h3>1.1 Generic account and usage data</h3>
          <p>
            When you create an account or use our services we collect basic information required to operate the service and provide features. This may include:
          </p>
          <ul>
            <li>Name or display name</li>
            <li>Email address</li>
            <li>IP address and device information</li>
            <li>Usage and analytics data (features used, timestamps, errors)</li>
            <li>Content you create, scheduling information and any media you upload</li>
          </ul>

          <h3>1.2 Social media account data</h3>
          <p>
            If you choose to connect your social media accounts (for example: Facebook, Instagram, LinkedIn, Twitter/X), we will collect and store data necessary to perform actions on your behalf and keep records. This includes:
          </p>
          <ul>
            <li>Provider user ID (the ID for your account on the social platform)</li>
            <li>Access token and refresh token (or equivalent credentials)</li>
            <li>Basic profile information returned by the provider (where provided and permitted)</li>
          </ul>

          <h2>2. Why we collect this data</h2>
          <p>We use collected information for the following purposes:</p>
          <ul>
            <li>To provide, operate, and maintain DM Automation features.</li>
            <li>To post and schedule content to connected social accounts on your behalf.</li>
            <li>To store history and audit trails of posts and actions taken through our app.</li>
            <li>To diagnose problems, improve the service, and provide customer support.</li>
            <li>To comply with legal obligations and protect our rights.</li>
          </ul>

          <h2>3. Retention and disconnecting social accounts</h2>
          <p>
            <strong>Important:</strong> Even if you disconnect a social account from DM Automation, we may retain that account&apos;s record and associated identifiers (including tokens) in our database. This is due to database constraints and because we maintain a history of posts and actions made through our application for auditing, billing, analytics and troubleshooting purposes.
          </p>
          <p>
            When you disconnect an account we will:
          </p>
          <ul>
            <li>Stop using the credentials to perform actions on your behalf as soon as technically possible.</li>
            <li>Record the disconnection event in our logs and retain associated metadata and records of posts created through the app.</li>
            <li>Where feasible and permitted by the social provider, we will attempt to remove stored tokens from active use; however the record that the account existed and the history of actions will remain in our systems.</li>
          </ul>

          <h2>4. Security</h2>
          <p>
            We take reasonable administrative, technical, and physical measures designed to protect the information we collect. Access tokens and refresh tokens are stored encrypted at rest and access is limited to authorized systems and personnel that require it to perform their job.
          </p>
          <p>
            No method of transmission over the internet or electronic storage is 100% secure — while we strive to use commercially acceptable means to protect your data, we cannot guarantee its absolute security.
          </p>

          <h2>5. Sharing and disclosures</h2>
          <p>
            We do not sell your personal information. We may share information with third parties only as described below:
          </p>
          <ul>
            <li>With service providers who perform services on our behalf (hosting, analytics, email delivery, payment processors). They have access to the data needed to perform their services and are contractually required to protect it.</li>
            <li>When required by law or to respond to valid legal processes.</li>
            <li>To protect the rights, property, or safety of DM Automation, our users, or the public.</li>
          </ul>

          <h2>6. Cookies and similar technologies</h2>
          <p>
            We use cookies and similar technologies to provide, secure, and analyze our services. You can control cookie preferences through your browser settings; however disabling cookies may affect how our services function.
          </p>

          <h2>7. Your rights and choices</h2>
          <p>
            Depending on your jurisdiction, you may have rights regarding your personal information, such as the right to access, correct, or delete your data, or to restrict or object to certain processing.
          </p>
          <p>
            Please note: because we retain disconnected social account records for historical and technical reasons, a request to &quot;disconnect&quot; will stop active use of tokens but may not remove every record from our database. If you request deletion of your entire account, we will respond to that request in accordance with applicable law — however certain records (for example, transactional logs or records required to comply with legal obligations) may need to be retained for a limited period.
          </p>

          <h2>8. International transfers</h2>
          <p>
            DM Automation operates in multiple jurisdictions. Data we collect may be transferred to — and processed in — countries other than your country of residence. Where required by law, we will take steps to ensure an adequate level of protection for your data.
          </p>

          <h2>9. Third-party links and services</h2>
          <p>
            Our service integrates with third-party platforms (social providers). Their privacy policies and practices are separate from ours — we encourage you to review those policies before connecting your accounts.
          </p>

          <h2>10. Children</h2>
          <p>
            Our services are not directed to children under 13 (or higher minimum age required by local law). We do not knowingly collect personal data from children. If you believe we have collected such data, please contact us to request removal.
          </p>

          <h2>11. Changes to this policy</h2>
          <p>
            We may update this Privacy Policy from time to time. When we do, we will revise the &quot;Effective date&quot; at the top of the policy. Material changes will be communicated by email or through prominent notices on our site when required by law.
          </p>

          <h2>12. Contact us</h2>
          <p>
            If you have questions about this Privacy Policy or want to exercise your rights, contact us at:
          </p>
          <address>
            DM Automation
            <br />
            Website: <a href="https://dm-automation.prabisha.com/">dm-automation.prabisha.com</a>
            <br />
            Email: <strong>privacy@prabisha.com</strong>
          </address>

          <p>
            Thank you for using DM Automation. We take your privacy seriously and are committed to protecting your information.
          </p>
        </div>
      </main>
    </>
  );
}
