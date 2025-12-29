import React from 'react';
import './PrivacyPolicy.css';

const TermsConditions = () => {
  return (
    <div className="legal-page">
      <div className="legal-container">
        <h1>Terms & Conditions</h1>
        <p className="last-updated">Last Updated: {new Date().toLocaleDateString()}</p>

        <section>
          <h2>1. Agreement to Terms</h2>
          <p>
            By accessing and using NexaStyle, you accept and agree to be bound by the terms and provision 
            of this agreement. If you do not agree to these Terms & Conditions, please do not use our website.
          </p>
        </section>

        <section>
          <h2>2. Use License</h2>
          <p>
            Permission is granted to temporarily download one copy of the materials on NexaStyle's website 
            for personal, non-commercial transitory viewing only. This is the grant of a license, not a transfer 
            of title, and under this license you may not:
          </p>
          <ul>
            <li>Modify or copy the materials</li>
            <li>Use the materials for any commercial purpose or for any public display</li>
            <li>Attempt to reverse engineer any software contained on the website</li>
            <li>Remove any copyright or other proprietary notations from the materials</li>
          </ul>
        </section>

        <section>
          <h2>3. Products and Pricing</h2>
          <p>
            We strive to provide accurate product descriptions and pricing. However, we do not warrant that 
            product descriptions or other content on this site is accurate, complete, reliable, current, or 
            error-free. Prices are subject to change without notice.
          </p>
        </section>

        <section>
          <h2>4. Orders and Payment</h2>
          <p>
            When you place an order, you are offering to purchase a product subject to these Terms & Conditions. 
            All orders are subject to acceptance and availability. We reserve the right to refuse or cancel any 
            order for any reason.
          </p>
          <p>
            Payment must be received by us before we can process your order. We accept major credit cards and 
            other payment methods as indicated on our website.
          </p>
        </section>

        <section>
          <h2>5. Shipping and Delivery</h2>
          <p>
            We will arrange for shipment of products to you. Shipping costs and delivery times will be displayed 
            at checkout. We are not responsible for delays caused by shipping carriers or customs.
          </p>
        </section>

        <section>
          <h2>6. Returns and Refunds</h2>
          <div style={{
            background: '#fff3cd',
            border: '2px solid #ffc107',
            borderRadius: '8px',
            padding: '1.5rem',
            marginBottom: '1.5rem'
          }}>
            <p style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#856404', margin: 0, marginBottom: '0.5rem' }}>
              ⚠️ No Return Product Accepted - No Refund Will Be Given
            </p>
            <p style={{ fontSize: '1rem', color: '#856404', margin: 0 }}>
              We do not accept any order returns. All sales are final. No refunds will be given under any circumstances.
            </p>
          </div>
          <p>
            <strong>No Return Policy:</strong> Once an order has been placed and confirmed, we cannot accept returns, 
            exchanges, or refunds for any reason. No return products are accepted, and no refunds will be given. 
            Please review your order carefully before completing your purchase.
          </p>
          <p>
            <strong>No Refund Policy:</strong> All payments are final. We do not provide refunds for any orders, 
            regardless of the reason. This includes but is not limited to: change of mind, wrong size selection, 
            color preferences, or any other customer-related issues.
          </p>
          <p>
            <strong>Exceptions:</strong> If you receive a defective or damaged item, or if you receive the wrong item 
            due to our error, please contact us immediately at <strong>nexastyle1@gmail.com</strong> or call us at 
            <strong> 9130079926</strong> within 48 hours of receiving your order. We will review your case and may 
            provide a replacement or resolution on a case-by-case basis. However, refunds will still not be provided.
          </p>
          <p>
            For more details, please refer to our <a href="/return-policy">Return Policy</a>.
          </p>
        </section>

        <section>
          <h2>7. User Accounts</h2>
          <p>
            When you create an account with us, you must provide accurate, complete, and current information. 
            You are responsible for safeguarding your account password and for all activities that occur under 
            your account.
          </p>
        </section>

        <section>
          <h2>8. Prohibited Uses</h2>
          <p>You may not use our website:</p>
          <ul>
            <li>In any way that violates any applicable law or regulation</li>
            <li>To transmit any malicious code or viruses</li>
            <li>To impersonate or attempt to impersonate the company</li>
            <li>In any way that infringes upon the rights of others</li>
            <li>To engage in any other conduct that restricts or inhibits anyone's use of the website</li>
          </ul>
        </section>

        <section>
          <h2>9. Intellectual Property</h2>
          <p>
            The website and its original content, features, and functionality are owned by NexaStyle and are 
            protected by international copyright, trademark, patent, trade secret, and other intellectual 
            property laws.
          </p>
        </section>

        <section>
          <h2>10. Limitation of Liability</h2>
          <p>
            In no event shall NexaStyle, nor its directors, employees, partners, agents, suppliers, or affiliates, 
            be liable for any indirect, incidental, special, consequential, or punitive damages resulting from 
            your use of the website.
          </p>
        </section>

        <section>
          <h2>11. Changes to Terms</h2>
          <p>
            We reserve the right to modify these Terms & Conditions at any time. We will notify users of any 
            changes by posting the new Terms & Conditions on this page and updating the "Last Updated" date.
          </p>
        </section>

        <section>
          <h2>12. Contact Information</h2>
          <p>
            If you have any questions about these Terms & Conditions, please contact us at:
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

export default TermsConditions;

