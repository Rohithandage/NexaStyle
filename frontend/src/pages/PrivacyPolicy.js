import React from 'react';
import './PrivacyPolicy.css';

const PrivacyPolicy = () => {
  return (
    <div className="legal-page">
      <div className="legal-container">
        <h1>Privacy Policy</h1>
        <p className="last-updated">Last Updated: {new Date().toLocaleDateString()}</p>

        <section>
          <h2>1. Introduction</h2>
          <p>
            Welcome to NexaStyle. We respect your privacy and are committed to protecting your personal data. 
            This privacy policy will inform you about how we look after your personal data when you visit our 
            website and tell you about your privacy rights and how the law protects you.
          </p>
        </section>

        <section>
          <h2>2. Information We Collect</h2>
          <p>We may collect, use, store and transfer different kinds of personal data about you:</p>
          <ul>
            <li><strong>Identity Data:</strong> Name, username, date of birth</li>
            <li><strong>Contact Data:</strong> Billing address, delivery address, email address, telephone numbers</li>
            <li><strong>Financial Data:</strong> Payment card details</li>
            <li><strong>Transaction Data:</strong> Details about payments and products you have purchased</li>
            <li><strong>Technical Data:</strong> Internet protocol (IP) address, browser type, time zone setting</li>
            <li><strong>Profile Data:</strong> Username, purchases, orders, preferences, feedback</li>
            <li><strong>Usage Data:</strong> Information about how you use our website</li>
          </ul>
        </section>

        <section>
          <h2>3. How We Use Your Information</h2>
          <p>We use your personal data in the following ways:</p>
          <ul>
            <li>To process and deliver your orders</li>
            <li>To manage payments, fees, and charges</li>
            <li>To manage our relationship with you</li>
            <li>To improve our website and services</li>
            <li>To send you marketing communications (with your consent)</li>
            <li>To comply with legal obligations</li>
          </ul>
        </section>

        <section>
          <h2>4. Data Security</h2>
          <p>
            We have put in place appropriate security measures to prevent your personal data from being accidentally 
            lost, used or accessed in an unauthorized way, altered or disclosed. We use encryption and secure 
            payment gateways to protect your information.
          </p>
        </section>

        <section>
          <h2>5. Your Rights</h2>
          <p>You have the right to:</p>
          <ul>
            <li>Request access to your personal data</li>
            <li>Request correction of your personal data</li>
            <li>Request erasure of your personal data</li>
            <li>Object to processing of your personal data</li>
            <li>Request restriction of processing your personal data</li>
            <li>Request transfer of your personal data</li>
            <li>Withdraw consent at any time</li>
          </ul>
        </section>

        <section>
          <h2>6. Cookies</h2>
          <p>
            Our website uses cookies to distinguish you from other users of our website. This helps us to provide 
            you with a good experience when you browse our website and also allows us to improve our site.
          </p>
        </section>

        <section>
          <h2>7. Contact Us</h2>
          <p>
            If you have any questions about this privacy policy or our privacy practices, please contact us at:
          </p>
          <p>
            <strong>Email:</strong> nexastyle1@gmail.com<br />
            <strong>Phone:</strong> 9130079926
          </p>
        </section>
      </div>
    </div>
  );
};

export default PrivacyPolicy;

