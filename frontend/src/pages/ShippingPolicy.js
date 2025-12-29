import React from 'react';
import './PrivacyPolicy.css';

const ShippingPolicy = () => {
  return (
    <div className="legal-page">
      <div className="legal-container">
        <h1>Shipping Policy</h1>
        <p className="last-updated">Last Updated: {new Date().toLocaleDateString()}</p>

        <section>
          <h2>Transparent Pricing</h2>
          <p>
            Our international shipping charges vary based on the destination country, package weight, and courier partner.
            The exact shipping cost will be displayed at checkout before order confirmation.
          </p>
        </section>

        <section>
          <h2>Quick Dispatch</h2>
          <p>
            All orders (domestic and international) are dispatched within 48 hours after order confirmation, excluding 
            Sundays and public holidays.
          </p>
        </section>

        <section>
          <h2>Delivery Options</h2>
          <p><strong>Standard Delivery:</strong> 7–15 business days (depending on the delivery location)</p>
          <p><strong>Express Shipping:</strong> 12–24 hours dispatch (additional charges apply)</p>
        </section>

        <section>
          <h2>Disclaimer</h2>
          <p style={{ 
            fontStyle: 'italic', 
            color: '#6c757d',
            borderLeft: '3px solid #ffc107',
            paddingLeft: '1rem',
            marginTop: '1rem'
          }}>
            Delivery timelines are estimated and may vary due to courier delays, customs clearance, weather conditions, 
            or unforeseen circumstances.
          </p>
        </section>

        <section>
          <h2>Contact Us</h2>
          <p>
            If you have any questions about this Shipping Policy, please contact us at:
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

export default ShippingPolicy;

