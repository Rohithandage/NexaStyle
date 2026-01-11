import React, { useState, useEffect, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  FiInstagram,
  FiMail,
  FiHome,
  FiShoppingCart
} from 'react-icons/fi';
import { 
  HiUser,
  HiUserGroup,
  HiEmojiHappy
} from 'react-icons/hi';
import { 
  IoManOutline,
  IoWomanOutline
} from 'react-icons/io5';
import { useAuth } from '../hooks/useAuth';
import api from '../api/api';
import './Footer.css';

const Footer = () => {
  const currentYear = new Date().getFullYear();
  const location = useLocation();
  const { isAuthenticated } = useAuth();
  const [cartCount, setCartCount] = useState(0);
  const [isHeaderVisible, setIsHeaderVisible] = useState(() => {
    // On mobile, navbar is visible initially, so bottom nav should be hidden
    // On desktop, always hide bottom nav (it's not shown anyway)
    return window.innerWidth <= 768;
  });
  
  const isActive = (path) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.includes(path);
  };

  // Detect if header/navbar is visible using Intersection Observer
  useEffect(() => {
    const checkHeaderVisibility = () => {
      // Only run on mobile (max-width: 768px)
      if (window.innerWidth > 768) {
        setIsHeaderVisible(true);
        return null;
      }

      const navbar = document.querySelector('.navbar');
      if (!navbar) {
        // If navbar doesn't exist, show bottom nav by default
        setIsHeaderVisible(false);
        return null;
      }

      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            // If navbar is intersecting (visible), set isHeaderVisible to true (will hide bottom nav)
            // If navbar is not intersecting (scrolled out of view), set isHeaderVisible to false (will show bottom nav)
            setIsHeaderVisible(entry.isIntersecting);
          });
        },
        {
          threshold: 0, // Trigger when any part of navbar enters/leaves viewport
          rootMargin: '0px'
        }
      );

      observer.observe(navbar);

      return () => {
        observer.disconnect();
      };
    };

    // Initial check
    const cleanup = checkHeaderVisibility();

    // Handle window resize
    const handleResize = () => {
      if (cleanup) cleanup();
      checkHeaderVisibility();
    };

    window.addEventListener('resize', handleResize);

    return () => {
      if (cleanup) cleanup();
      window.removeEventListener('resize', handleResize);
    };
  }, [location.pathname]); // Re-run when route changes

  const fetchCartCount = useCallback(async () => {
    // Only fetch cart if user is authenticated
    if (!isAuthenticated) {
      setCartCount(0);
      return;
    }
    
    try {
      const res = await api.get('/api/cart', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (res.data) {
        const count = res.data.items?.reduce((sum, item) => sum + item.quantity, 0) || 0;
        setCartCount(count);
      }
    } catch (error) {
      // Silently handle 401 errors (user not authenticated)
      if (error.response?.status === 401) {
        setCartCount(0);
      }
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchCartCount();
    } else {
      setCartCount(0);
    }
  }, [isAuthenticated, fetchCartCount]);

  // Listen for cart update events
  useEffect(() => {
    const handleCartUpdate = () => {
      if (isAuthenticated) {
        fetchCartCount();
      }
    };

    window.addEventListener('cartUpdated', handleCartUpdate);
    return () => {
      window.removeEventListener('cartUpdated', handleCartUpdate);
    };
  }, [isAuthenticated, fetchCartCount]);

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
                <li>
                  <Link to="/contact-us">Contact Us</Link>
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
      
      {/* Mobile Bottom Navigation - Fixed at Bottom */}
      <div className={`mobile-bottom-nav ${!isHeaderVisible ? 'visible' : 'hidden'}`}>
        <Link 
          to="/" 
          className={`mobile-nav-item ${isActive('/') && location.pathname === '/' ? 'active' : ''}`} 
          aria-label="Home"
        >
          <FiHome />
          <span>Home</span>
        </Link>
        <Link 
          to="/products/Men" 
          className={`mobile-nav-item ${isActive('/products/Men') ? 'active' : ''}`} 
          aria-label="Men"
        >
          <IoManOutline className="category-icon" />
          <span>Men</span>
        </Link>
        <Link 
          to="/products/Women" 
          className={`mobile-nav-item ${isActive('/products/Women') ? 'active' : ''}`} 
          aria-label="Women"
        >
          <IoWomanOutline className="category-icon" />
          <span>Women</span>
        </Link>
        <Link 
          to="/products/Kids" 
          className={`mobile-nav-item ${isActive('/products/Kids') ? 'active' : ''}`} 
          aria-label="Kids"
        >
          <HiEmojiHappy className="category-icon" />
          <span>Kids</span>
        </Link>
        <Link 
          to="/cart" 
          className={`mobile-nav-item ${isActive('/cart') ? 'active' : ''}`} 
          aria-label="Cart"
        >
          <div className="mobile-cart-icon-wrapper">
            <FiShoppingCart />
            {cartCount > 0 && (
              <span className="mobile-cart-badge">{cartCount}</span>
            )}
          </div>
          <span>Cart</span>
        </Link>
      </div>
    </footer>
  );
};

export default Footer;

