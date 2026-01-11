import React from 'react';
import { FiMail } from 'react-icons/fi';
import './ContactUs.css';

const ContactUs = () => {
  return (
    <div className="legal-page">
      <div className="legal-container">
        <h1>Contact Us</h1>
        <p className="last-updated">We'd love to hear from you!</p>

        <section>
          <h2>Get in Touch</h2>
          <p>
            Have a question, concern, or feedback? We're here to help! Reach out to us through 
            any of the following methods and we'll get back to you as soon as possible.
          </p>
        </section>

        <section>
          <h2>Email Us</h2>
          <div className="contact-info">
            <div className="contact-item">
              <FiMail className="contact-icon" />
              <div className="contact-details">
                <p className="contact-label">Email Address</p>
                <a href="mailto:nexastyle1@gmail.com" className="contact-link">
                  nexastyle1@gmail.com
                </a>
              </div>
            </div>
          </div>
        </section>

        <section>
          <h2>Response Time</h2>
          <p>
            We typically respond to all inquiries within 24-48 hours during business days. 
            For urgent matters, please mention "URGENT" in your email subject line.
          </p>
        </section>

        <section>
          <h2>What Can We Help You With?</h2>
          <ul>
            <li>Product inquiries and availability</li>
            <li>Order status and tracking</li>
            <li>Returns and exchanges</li>
            <li>Shipping and delivery questions</li>
            <li>Payment and billing issues</li>
            <li>General feedback and suggestions</li>
          </ul>
        </section>
      </div>
    </div>
  );
};

export default ContactUs;

