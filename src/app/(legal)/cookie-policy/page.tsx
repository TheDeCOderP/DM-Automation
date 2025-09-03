import React from 'react'

export default function CookiePolicyPage() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-12 text-gray-800">
      <h1 className="text-3xl font-bold mb-6">Cookie Policy</h1>

      <p className="mb-4">
        This Cookie Policy explains how <strong>DMA (Digital Marketing Automation by Prabisha Consulting)</strong> 
        uses cookies and similar technologies to recognize you when you visit our website 
        (<a href="https://dma.prabisha.com" className="text-blue-600 underline">dma.prabisha.com</a>). 
        It explains what these technologies are, why we use them, and the choices you have regarding their use.
      </p>

      <h2 className="text-xl font-semibold mt-8 mb-3">What Are Cookies?</h2>
      <p className="mb-4">
        Cookies are small text files that are placed on your device when you visit a website. 
        They help us improve your browsing experience by remembering your preferences, 
        enabling essential site functionality, and helping us understand how our platform is being used.
      </p>

      <h2 className="text-xl font-semibold mt-8 mb-3">How We Use Cookies</h2>
      <p className="mb-4">We use cookies for the following purposes:</p>
      <ul className="list-disc list-inside space-y-2 mb-4">
        <li><strong>Essential Cookies:</strong> Required for core functionality such as secure login and navigation.</li>
        <li><strong>Performance & Analytics Cookies:</strong> Help us analyze user activity so we can improve our services.</li>
        <li><strong>Functionality Cookies:</strong> Remember your preferences and settings to provide a personalized experience.</li>
        <li><strong>Marketing Cookies:</strong> Used to deliver relevant ads and track the effectiveness of our campaigns.</li>
      </ul>

      <h2 className="text-xl font-semibold mt-8 mb-3">Third-Party Cookies</h2>
      <p className="mb-4">
        Some cookies may be placed by trusted third-party services we use for analytics, 
        advertising, or integrations. These third parties may collect information about your 
        online activities over time and across different websites.
      </p>

      <h2 className="text-xl font-semibold mt-8 mb-3">Your Choices</h2>
      <p className="mb-4">
        You can control and manage cookies in your browser settings. You can choose to block or 
        delete cookies, but please note that some parts of our website may not function properly 
        if you disable essential cookies.
      </p>

      <h2 className="text-xl font-semibold mt-8 mb-3">Updates to This Policy</h2>
      <p className="mb-4">
        We may update this Cookie Policy from time to time to reflect changes in technology, 
        law, or our business practices. We encourage you to review this page periodically to 
        stay informed about how we use cookies.
      </p>

      <h2 className="text-xl font-semibold mt-8 mb-3">Contact Us</h2>
      <p>
        If you have any questions about our use of cookies, please contact us at{" "}
        <a href="mailto:info@prabisha.com" className="text-blue-600 underline">
          info@prabisha.com
        </a>.
      </p>
    </div>
  )
}
