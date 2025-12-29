import React from 'react';
import './PrivacyPolicy.css';

const ReturnPolicy = () => {
  return (
    <div className="legal-page">
      <div className="legal-container">
        <h1>Return Policy</h1>
        <p className="last-updated">Last Updated: {new Date().toLocaleDateString()}</p>

        <section>
          <h2>No Return Policy</h2>
          <div style={{
            background: '#fff3cd',
            border: '2px solid #ffc107',
            borderRadius: '8px',
            padding: '1.5rem',
            marginBottom: '2rem'
          }}>
            <p style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#856404', margin: 0 }}>
              ⚠️ We do not accept any order returns. No return product.
            </p>
          </div>
          <p>
            <strong>All sales are final.</strong> Once an order has been placed and confirmed, we cannot accept 
            returns, exchanges, or refunds for any reason.
          </p>
          <p>
            Please review your order carefully before completing your purchase. We encourage you to:
          </p>
          <ul>
            <li>Read product descriptions thoroughly</li>
            <li>Check product images and specifications</li>
            <li>Verify size, color, and quantity before placing your order</li>
            <li>Contact us with any questions before making a purchase</li>
          </ul>
        </section>

        <section>
          <h2>Defective or Damaged Items</h2>
          <p>
            If you receive a defective or damaged item, please contact us immediately at 
            <strong> nexastyle1@gmail.com</strong> or call us at <strong>9130079926</strong> within 48 hours of 
            receiving your order. We will review your case and may provide a replacement or resolution on a 
            case-by-case basis.
          </p>
        </section>

        <section>
          <h2>Wrong Items Received</h2>
          <p>
            If you receive the wrong item due to our error, please contact us immediately at 
            <strong> nexastyle1@gmail.com</strong> or call us at <strong>9130079926</strong> within 48 hours of 
            receiving your order. We will work to resolve the issue promptly.
          </p>
        </section>

        <section>
          <h2>Contact Us</h2>
          <p>
            If you have any questions about this Return Policy, please contact us at:
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

export default ReturnPolicy;

