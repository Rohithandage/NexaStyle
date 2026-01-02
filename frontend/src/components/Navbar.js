import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { FiShoppingCart, FiUser, FiChevronDown, FiSearch } from 'react-icons/fi';
import api from '../api/api';
import { getImageUrl } from '../utils/config';
import './Navbar.css';

const Navbar = () => {
  const { user, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [cartCount, setCartCount] = useState(0);
  const [categories, setCategories] = useState([]);
  const [hoveredCategory, setHoveredCategory] = useState(null);
  const [touchedCategory, setTouchedCategory] = useState(null);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [logo, setLogo] = useState(null);

  useEffect(() => {
    fetchCategories();
    fetchLogo();
  }, []);

  React.useEffect(() => {
    if (isAuthenticated) {
      fetchCartCount();
    }
  }, [isAuthenticated]);

  // Listen for cart updates
  React.useEffect(() => {
    const handleCartUpdate = () => {
      if (isAuthenticated) {
        fetchCartCount();
      }
    };

    // Listen for custom cart update event
    window.addEventListener('cartUpdated', handleCartUpdate);
    // Also refresh when window gains focus
    window.addEventListener('focus', handleCartUpdate);

    return () => {
      window.removeEventListener('cartUpdated', handleCartUpdate);
      window.removeEventListener('focus', handleCartUpdate);
    };
  }, [isAuthenticated]);

  const fetchCategories = async () => {
    try {
      const res = await api.get('/api/products/categories/all');
      setCategories(res.data || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchLogo = async () => {
    try {
      const res = await api.get('/api/settings/logo');
      setLogo(res.data.logo || null);
    } catch (error) {
      // Fail silently if logo can't be fetched
      console.error('Error fetching logo:', error);
    }
  };

  const fetchCartCount = async () => {
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
      console.error('Error fetching cart:', error);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/products?search=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery('');
    }
  };

  // Close dropdown when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('.navbar-category-wrapper')) {
        setTouchedCategory(null);
      }
      if (!event.target.closest('.profile-menu-wrapper')) {
        setShowProfileMenu(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, []);

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <Link to="/" className="navbar-logo">
          {logo ? (
            <img 
              src={getImageUrl(logo)} 
              alt="NexaStyle Logo" 
              className="navbar-logo-img"
              width="200"
              height="60"
              loading="eager"
              decoding="async"
              onError={(e) => {
                // Fallback to logo.svg if the uploaded logo fails to load
                e.target.src = '/logo.svg';
              }}
            />
          ) : (
            <img 
              src="/logo.svg" 
              alt="NexaStyle Logo" 
              className="navbar-logo-img"
              width="200"
              height="60"
              loading="eager"
              decoding="async"
            />
          )}
        </Link>
        <div className="navbar-menu">
          <Link to="/" className="navbar-link">
            Home
          </Link>
          {categories.map((category) => {
            const hasSubcategories = category.subcategories && category.subcategories.filter(sub => sub.isActive).length > 0;
            const isActive = hoveredCategory === category._id || touchedCategory === category._id;
            
            return (
              <div
                key={category._id}
                className="navbar-category-wrapper"
                onMouseEnter={() => hasSubcategories && setHoveredCategory(category._id)}
                onMouseLeave={() => setHoveredCategory(null)}
                onClick={(e) => {
                  if (hasSubcategories) {
                    e.preventDefault();
                    e.stopPropagation();
                    // Toggle subcategories on click/touch
                    if (touchedCategory === category._id) {
                      setTouchedCategory(null);
                      setHoveredCategory(null);
                    } else {
                      setTouchedCategory(category._id);
                      setHoveredCategory(category._id);
                    }
                  }
                }}
              >
                {hasSubcategories ? (
                  <span className="navbar-link category-link-with-dropdown">
                    {category.name}
                    <FiChevronDown className={`chevron-down-icon ${isActive ? 'rotated' : ''}`} />
                  </span>
                ) : (
                  <Link
                    to={`/products/${category.name}`}
                    className="navbar-link"
                  >
                    {category.name}
                  </Link>
                )}
                {hasSubcategories && isActive && (
                  <div 
                    className="subcategory-dropdown"
                    onMouseEnter={() => setHoveredCategory(category._id)}
                    onMouseLeave={() => setHoveredCategory(null)}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Link
                      to={`/products/${category.name}`}
                      className="subcategory-link subcategory-all"
                      onMouseEnter={(e) => {
                        e.currentTarget.classList.add('touched');
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.classList.remove('touched');
                      }}
                      onTouchStart={(e) => {
                        e.currentTarget.classList.add('touched');
                      }}
                      onTouchEnd={(e) => {
                        const target = e.currentTarget;
                        setTimeout(() => {
                          if (target) {
                            target.classList.remove('touched');
                          }
                        }, 300);
                      }}
                      onClick={() => {
                        setHoveredCategory(null);
                        setTouchedCategory(null);
                      }}
                    >
                      All {category.name}
                    </Link>
                    {category.subcategories
                      .filter(sub => sub.isActive)
                      .map((subcategory) => (
                        <Link
                          key={subcategory._id}
                          to={`/products/${category.name}?subcategory=${subcategory.slug}`}
                          className="subcategory-link"
                          onMouseEnter={(e) => {
                            e.currentTarget.classList.add('touched');
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.classList.remove('touched');
                          }}
                          onTouchStart={(e) => {
                            e.currentTarget.classList.add('touched');
                          }}
                          onTouchEnd={(e) => {
                            const target = e.currentTarget;
                            setTimeout(() => {
                              if (target) {
                                target.classList.remove('touched');
                              }
                            }, 300);
                          }}
                          onClick={() => {
                            setHoveredCategory(null);
                            setTouchedCategory(null);
                          }}
                        >
                          {subcategory.name}
                        </Link>
                      ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <form className="navbar-search-desktop" onSubmit={handleSearch}>
          <input
            type="text"
            placeholder="Search products..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="navbar-search-input"
          />
          <button type="submit" className="navbar-search-button" aria-label="Search">
            <FiSearch />
          </button>
        </form>

        <div className="navbar-icons">
          {isAuthenticated ? (
            <>
              <div className="profile-menu-wrapper">
                <button 
                  className="navbar-icon profile-icon-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowProfileMenu(!showProfileMenu);
                  }}
                  aria-label="Profile menu"
                >
                  <FiUser />
                </button>
                {showProfileMenu && (
                  <div className="profile-dropdown" onClick={(e) => e.stopPropagation()}>
                    <div className="profile-dropdown-header">
                      <div className="profile-name">{user?.name || 'User'}</div>
                      <div className="profile-email">{user?.email}</div>
                    </div>
                    <div className="profile-dropdown-divider"></div>
                    <Link 
                      to="/orders" 
                      className="profile-dropdown-item"
                      onClick={() => setShowProfileMenu(false)}
                    >
                      My Orders
                    </Link>
                    {user?.role === 'admin' && (
                      <Link 
                        to="/admin" 
                        className="profile-dropdown-item"
                        onClick={() => setShowProfileMenu(false)}
                      >
                        Admin Dashboard
                      </Link>
                    )}
                    <button 
                      className="profile-dropdown-item profile-dropdown-logout"
                      onClick={() => {
                        setShowProfileMenu(false);
                        handleLogout();
                      }}
                    >
                      Logout
                    </button>
                  </div>
                )}
              </div>
              <form className="navbar-search-mobile" onSubmit={handleSearch}>
                <input
                  type="text"
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="navbar-search-input"
                />
                <button type="submit" className="navbar-search-button" aria-label="Search">
                  <FiSearch />
                </button>
              </form>
              <Link to="/cart" className="navbar-icon">
                <FiShoppingCart />
                {/* Always reserve space for badge to prevent CLS */}
                <span className={`cart-badge ${cartCount > 0 ? 'visible' : 'hidden'}`}>
                  {cartCount > 0 ? cartCount : ''}
                </span>
              </Link>
            </>
          ) : (
            <>
              <Link to="/login" className="navbar-link navbar-login-link mobile-hide">Login</Link>
              <Link to="/register" className="navbar-button mobile-hide">Sign Up</Link>
              <div className="navbar-mobile-auth-row">
                <form className="navbar-search-mobile mobile-only" onSubmit={handleSearch}>
                  <input
                    type="text"
                    placeholder="Search..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="navbar-search-input"
                  />
                  <button type="submit" className="navbar-search-button" aria-label="Search">
                    <FiSearch />
                  </button>
                </form>
                <Link to="/login" className="navbar-link navbar-login-link mobile-only">Login</Link>
                <Link to="/register" className="navbar-button mobile-only">Sign Up</Link>
              </div>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;


