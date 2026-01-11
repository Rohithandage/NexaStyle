import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { FiShoppingCart, FiUser, FiChevronDown, FiSearch } from 'react-icons/fi';
import api from '../api/api';
import { getImageUrl } from '../utils/config';
import { getUserCurrency, getCurrencySymbol, getUserCountry, isCountrySupported, updateCurrencySymbolCache } from '../utils/currency';
import './Navbar.css';

const Navbar = () => {
  const { user, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [cartCount, setCartCount] = useState(0);
  const [categories, setCategories] = useState([]);
  const [hoveredCategory, setHoveredCategory] = useState(null);
  const [touchedCategory, setTouchedCategory] = useState(null);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [logo, setLogo] = useState(null);
  const [selectedCurrency, setSelectedCurrency] = useState(() => {
    return localStorage.getItem('selectedCurrency') || getUserCurrency();
  });
  const [showCurrencyMenu, setShowCurrencyMenu] = useState(false);
  const [isUserCountrySupported, setIsUserCountrySupported] = useState(false);
  const [currencies, setCurrencies] = useState([]);

  // Get country flag for currency code
  const getCountryFlagForCurrencyCode = (countryCode) => {
    const codeToFlag = {
      'US': '🇺🇸', 'GB': '🇬🇧', 'CA': '🇨🇦', 'EU': '🇪🇺', 'IN': '🇮🇳',
      'CN': '🇨🇳', 'AU': '🇦🇺', 'DE': '🇩🇪', 'FR': '🇫🇷', 'IT': '🇮🇹',
      'ES': '🇪🇸', 'BR': '🇧🇷', 'MX': '🇲🇽', 'JP': '🇯🇵', 'KR': '🇰🇷',
      'RU': '🇷🇺', 'NL': '🇳🇱', 'SE': '🇸🇪', 'NO': '🇳🇴', 'DK': '🇩🇰',
      'FI': '🇫🇮', 'PL': '🇵🇱', 'TR': '🇹🇷', 'SA': '🇸🇦', 'AE': '🇦🇪',
      'SG': '🇸🇬', 'MY': '🇲🇾', 'TH': '🇹🇭', 'ID': '🇮🇩', 'PH': '🇵🇭',
      'VN': '🇻🇳', 'NZ': '🇳🇿', 'ZA': '🇿🇦', 'EG': '🇪🇬', 'NG': '🇳🇬',
      'KE': '🇰🇪', 'AR': '🇦🇷', 'CL': '🇨🇱', 'CO': '🇨🇴', 'PE': '🇵🇪',
      'PT': '🇵🇹', 'GR': '🇬🇷', 'IE': '🇮🇪', 'CH': '🇨🇭', 'AT': '🇦🇹',
      'BE': '🇧🇪', 'CZ': '🇨🇿', 'HU': '🇭🇺', 'RO': '🇷🇴', 'BG': '🇧🇬'
    };
    // Return flag if found, otherwise return empty string (no icon) instead of globe
    return codeToFlag[countryCode] || '';
  };

  // Get country flag for currency (backward compatibility)
  const getCountryFlagForCurrency = (currency) => {
    // Try to find from currencies list first
    const currencyItem = currencies.find(c => c.currency === currency);
    if (currencyItem && currencyItem.countryCode) {
      return getCountryFlagForCurrencyCode(currencyItem.countryCode);
    }
    
    // Fallback to old mapping
    const currencyToFlag = {
      'USD': '🇺🇸',
      'GBP': '🇬🇧',
      'CAD': '🇨🇦',
      'EUR': '🇪🇺',
      'INR': '🇮🇳'
    };
    return currencyToFlag[currency] || '🌍';
  };

  useEffect(() => {
    fetchCategories();
    fetchLogo();
    if (isAuthenticated) {
      fetchCartCount();
    }
    fetchCurrencies();
    // Check if user's country is supported or if currency is manually selected
    const manuallySelectedCurrency = localStorage.getItem('selectedCurrency');
    if (manuallySelectedCurrency) {
      // If currency is manually selected, show flag (all selectable currencies are from supported countries)
      setIsUserCountrySupported(true);
    } else {
      // Check if detected country is supported
      const userCountry = getUserCountry();
      setIsUserCountrySupported(isCountrySupported(userCountry.country));
    }
  }, []);

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
  }, [isAuthenticated]);

  // Sync search input with URL search parameter
  useEffect(() => {
    const urlSearchQuery = searchParams.get('search');
    if (urlSearchQuery && location.pathname === '/products') {
      setSearchQuery(urlSearchQuery);
    } else if (location.pathname !== '/products' || !urlSearchQuery) {
      // Clear search input when not on products page or when search param is removed
      setSearchQuery('');
    }
  }, [searchParams, location.pathname]);

  React.useEffect(() => {
    if (isAuthenticated) {
      fetchCartCount();
    } else {
      setCartCount(0);
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

  // Refetch currencies when window gains focus (to catch admin changes)
  React.useEffect(() => {
    const handleFocus = () => {
      fetchCurrencies();
    };

    window.addEventListener('focus', handleFocus);
    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  // Sync selected currency when currencies change
  React.useEffect(() => {
    if (currencies.length > 0 && selectedCurrency) {
      const isActive = currencies.some(c => c.currency === selectedCurrency);
      if (!isActive) {
        // Selected currency is no longer active, switch to first active currency
        const firstActiveCurrency = currencies[0].currency;
        localStorage.setItem('selectedCurrency', firstActiveCurrency);
        setSelectedCurrency(firstActiveCurrency);
        setIsUserCountrySupported(true);
      }
    }
  }, [currencies, selectedCurrency]);

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
      } else {
        console.error('Error fetching cart:', error);
      }
    }
  }, [isAuthenticated]);

  const fetchCurrencies = async () => {
    try {
      const res = await api.get('/api/settings/currencies');
      if (res.data && res.data.currencies) {
        setCurrencies(res.data.currencies);
        // Update currency symbol cache with fetched currencies
        updateCurrencySymbolCache(res.data.currencies);
        // Validate selected currency is still active
        const selectedCurrency = localStorage.getItem('selectedCurrency');
        if (selectedCurrency) {
          const isActive = res.data.currencies.some(c => c.currency === selectedCurrency);
          if (!isActive && res.data.currencies.length > 0) {
            // If selected currency is inactive, switch to first active currency
            const firstActiveCurrency = res.data.currencies[0].currency;
            localStorage.setItem('selectedCurrency', firstActiveCurrency);
            setSelectedCurrency(firstActiveCurrency);
            // Update supported country status
            setIsUserCountrySupported(true);
          } else if (!isActive) {
            // No active currencies available, clear selection
            localStorage.removeItem('selectedCurrency');
            setSelectedCurrency(getUserCurrency());
            setIsUserCountrySupported(false);
          }
        } else if (res.data.currencies.length > 0) {
          // If no currency is selected but active currencies exist, set first one
          const firstActiveCurrency = res.data.currencies[0].currency;
          localStorage.setItem('selectedCurrency', firstActiveCurrency);
          setSelectedCurrency(firstActiveCurrency);
          setIsUserCountrySupported(true);
        }
      }
    } catch (error) {
      console.error('Error fetching currencies:', error);
    }
  };

  // Check if selected currency is active
  const isSelectedCurrencyActive = () => {
    if (!selectedCurrency || currencies.length === 0) return false;
    return currencies.some(c => c.currency === selectedCurrency);
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const handleSearch = (e) => {
    e.preventDefault();
    const trimmedQuery = searchQuery.trim();
    if (trimmedQuery) {
      // Navigate to base products page with search query, clearing any category filters
      navigate(`/products?search=${encodeURIComponent(trimmedQuery)}`);
    } else {
      // If search is empty, navigate to products page without search param
      navigate('/products');
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
      if (!event.target.closest('.currency-menu-wrapper')) {
        setShowCurrencyMenu(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, []);

  const handleCurrencyChange = (currency) => {
    localStorage.setItem('selectedCurrency', currency);
    // Mark that the user manually selected a country/currency
    localStorage.setItem('userCountryManual', 'true');
    setSelectedCurrency(currency);
    setShowCurrencyMenu(false);
    
    // Determine the country and country code for the selected currency
    // Prefer a fixed mapping so that changing DB labels doesn't break logic
    const currencyToCountry = {
      'USD': 'United States',
      'GBP': 'United Kingdom',
      'CAD': 'Canada',
      'EUR': 'Europe',
      'INR': 'India',
      'CNY': 'China'
    };
    const currencyToCountryCode = {
      'USD': 'US',
      'GBP': 'GB',
      'CAD': 'CA',
      'EUR': 'EU',
      'INR': 'IN',
      'CNY': 'CN'
    };
    const currencyItem = currencies.find(c => c.currency === currency);
    const country = currencyToCountry[currency] || (currencyItem ? currencyItem.country : 'United States');
    // Get country code from currency item if available, otherwise use mapping
    const countryCode = currencyItem?.countryCode || currencyToCountryCode[currency] || 'US';
    
    localStorage.setItem('userCountry', country);
    localStorage.setItem('userCountryCode', countryCode);
    
    // Update supported country status (all selectable currencies are from supported countries)
    setIsUserCountrySupported(true);
    
    // Trigger a custom event to notify other components
    window.dispatchEvent(new Event('currencyChanged'));
    // Reload the page to update all prices
    window.location.reload();
  };

  // Render currency options dynamically
  const renderCurrencyOptions = () => {
    if (currencies.length === 0) {
      return null;
    }
    
    return currencies.map((currencyItem) => {
      const flag = getCountryFlagForCurrencyCode(currencyItem.countryCode);
      return (
        <button
          key={currencyItem._id}
          className={`currency-option ${selectedCurrency === currencyItem.currency ? 'active' : ''}`}
          onClick={() => handleCurrencyChange(currencyItem.currency)}
        >
          <span className="currency-option-flag">
            {flag || currencyItem.countryCode}
          </span>
          <div className="currency-option-content">
            <span className="currency-option-symbol">{currencyItem.currencySymbol}</span>
            <span className="currency-option-text">
              {currencyItem.currency} - {currencyItem.country}
            </span>
          </div>
        </button>
      );
    });
  };

  const isAuthRoute = location.pathname === '/login' || location.pathname === '/register';
  const isHomeRoute = location.pathname === '/';
  const showNavbarCurrencyForGuest = !isAuthenticated && !isAuthRoute && !isHomeRoute;
  const showFloatingCurrencyForGuest = !isAuthenticated && (isAuthRoute || isHomeRoute) && currencies.length > 0;

  return (
    <>
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
              {/* Currency Selector */}
              <div className="currency-menu-wrapper">
                <button 
                  className="currency-selector-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowCurrencyMenu(!showCurrencyMenu);
                  }}
                  aria-label="Select currency"
                  title="Select Currency"
                >
                  {isUserCountrySupported && isSelectedCurrencyActive() && (
                    <span className="currency-flag-display">{getCountryFlagForCurrency(selectedCurrency)}</span>
                  )}
                  <FiChevronDown className={`currency-chevron ${showCurrencyMenu ? 'rotated' : ''}`} />
                </button>
                {showCurrencyMenu && (
                  <div className="currency-dropdown" onClick={(e) => e.stopPropagation()}>
                    <div className="currency-dropdown-header">Select Currency</div>
                    <div className="currency-dropdown-divider"></div>
                    {renderCurrencyOptions()}
                  </div>
                )}
              </div>
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
                {showNavbarCurrencyForGuest && (
                  /* Currency Selector for non-authenticated users on mobile (hide on auth & home pages) */
                  <div className="currency-menu-wrapper mobile-only">
                    <button 
                      className="currency-selector-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowCurrencyMenu(!showCurrencyMenu);
                      }}
                      aria-label="Select currency"
                      title="Select Currency"
                    >
                      {isUserCountrySupported && isSelectedCurrencyActive() && (
                        <span className="currency-flag-display">{getCountryFlagForCurrency(selectedCurrency)}</span>
                      )}
                      <FiChevronDown className={`currency-chevron ${showCurrencyMenu ? 'rotated' : ''}`} />
                    </button>
                    {showCurrencyMenu && (
                      <div className="currency-dropdown" onClick={(e) => e.stopPropagation()}>
                        <div className="currency-dropdown-header">Select Currency</div>
                        <div className="currency-dropdown-divider"></div>
                        {renderCurrencyOptions()}
                      </div>
                    )}
                  </div>
                )}
              </div>
              {showNavbarCurrencyForGuest && (
                /* Currency Selector for desktop non-authenticated users (hide on auth & home pages) */
                <div className="currency-menu-wrapper mobile-hide">
                  <button 
                    className="currency-selector-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowCurrencyMenu(!showCurrencyMenu);
                    }}
                    aria-label="Select currency"
                    title="Select Currency"
                  >
                    {isUserCountrySupported && isSelectedCurrencyActive() && (
                      <span className="currency-flag-display">{getCountryFlagForCurrency(selectedCurrency)}</span>
                    )}
                    <FiChevronDown className={`currency-chevron ${showCurrencyMenu ? 'rotated' : ''}`} />
                  </button>
                  {showCurrencyMenu && (
                    <div className="currency-dropdown" onClick={(e) => e.stopPropagation()}>
                      <div className="currency-dropdown-header">Select Currency</div>
                      <div className="currency-dropdown-divider"></div>
                      {renderCurrencyOptions()}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </nav>

    {/* Floating currency selector on auth pages (login/register) and home page when user is not authenticated */}
    {showFloatingCurrencyForGuest && (
      <div className="auth-currency-floating currency-menu-wrapper">
        <button 
          className="currency-selector-btn"
          onClick={(e) => {
            e.stopPropagation();
            setShowCurrencyMenu(!showCurrencyMenu);
          }}
          aria-label="Select currency"
          title="Select Currency"
        >
          {isUserCountrySupported && isSelectedCurrencyActive() && (
            <span className="currency-flag-display">
              {getCountryFlagForCurrency(selectedCurrency)}
            </span>
          )}
          <FiChevronDown className={`currency-chevron ${showCurrencyMenu ? 'rotated' : ''}`} />
        </button>
        {showCurrencyMenu && (
          <div className="currency-dropdown" onClick={(e) => e.stopPropagation()}>
            <div className="currency-dropdown-header">Select Currency</div>
            <div className="currency-dropdown-divider"></div>
            {renderCurrencyOptions()}
          </div>
        )}
      </div>
    )}
  </>
  );
};

export default Navbar;


