import React from 'react';
import { Link } from 'react-router-dom';
import { 
  FiInstagram,
  FiMail
} from 'react-icons/fi';
import './Footer.css';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="footer">
      <div className="footer-container">
        <div className="footer-content">
          {/* About Us Section */}
          <div className="footer-section">
            <h3 className="footer-title">About NexaStyle</h3>
            <p className="footer-description">
              Your one-stop destination for the latest fashion trends and premium quality clothing. 
              We bring you the best in style, comfort, and affordability.
            </p>
            <div className="social-links">
              <a 
                href="https://www.instagram.com/nexa_style/?hl=en" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="social-link"
                aria-label="Instagram"
              >
                <FiInstagram />
              </a>
              <a 
                href="mailto:nexastyle1@gmail.com" 
                className="social-link"
                aria-label="Gmail"
              >
                <FiMail />
              </a>
            </div>
          </div>

          {/* Quick Links and Legal Section - Side by Side */}
          <div className="footer-links-group">
            <div className="footer-section">
              <h3 className="footer-title">Quick Links</h3>
              <ul className="footer-links">
                <li>
                  <Link to="/">Home</Link>
                </li>
                <li>
                  <Link to="/products">All Products</Link>
                </li>
                <li>
                  <Link to="/cart">Shopping Cart</Link>
                </li>
                <li>
                  <Link to="/orders">My Orders</Link>
                </li>
              </ul>
            </div>

            <div className="footer-section">
              <h3 className="footer-title">Legal</h3>
              <ul className="footer-links">
                <li>
                  <Link to="/privacy-policy">Privacy Policy</Link>
                </li>
                <li>
                  <Link to="/terms-conditions">Terms & Conditions</Link>
                </li>
                <li>
                  <Link to="/return-policy">Return Policy</Link>
                </li>
                <li>
                  <Link to="/shipping-policy">Shipping Policy</Link>
                </li>
              </ul>
            </div>
          </div>

          {/* Contact Us Section */}
          <div className="footer-section">
            <h3 className="footer-title">Contact Us</h3>
            <ul className="footer-contact">
              <li>
                <FiMail className="contact-icon" />
                <a href="mailto:nexastyle1@gmail.com">nexastyle1@gmail.com</a>
              </li>
            </ul>
          </div>
        </div>

        {/* Footer Bottom */}
        <div className="footer-bottom">
          <div className="footer-bottom-content">
            <p>&copy; {currentYear} NexaStyle. All rights reserved.</p>
            <div className="footer-bottom-links">
              <Link to="/privacy-policy">Privacy</Link>
              <span className="separator">|</span>
              <Link to="/terms-conditions">Terms</Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

