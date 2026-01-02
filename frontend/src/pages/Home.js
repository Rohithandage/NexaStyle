import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/api';
import { useAuth } from '../hooks/useAuth';
import { toast } from 'react-toastify';
import HeaderCarousel from '../components/HeaderCarousel';
import { getOptimizedImageUrl } from '../utils/config';
import './Home.css';

// Color name to hex mapping
const getColorValue = (colorName) => {
  if (!colorName || typeof colorName !== 'string') {
    return '#cccccc';
  }
  
  const colorMap = {
    'red': '#ff0000', 'blue': '#0000ff', 'green': '#008000', 'yellow': '#ffff00',
    'black': '#000000', 'white': '#ffffff', 'gray': '#808080', 'grey': '#808080',
    'orange': '#ffa500', 'purple': '#800080', 'pink': '#ffc0cb', 'brown': '#a52a2a',
    'navy': '#000080', 'navy blue': '#000080', 'maroon': '#800000', 'teal': '#008080',
    'cyan': '#00ffff', 'lime': '#00ff00', 'magenta': '#ff00ff', 'silver': '#c0c0c0',
    'gold': '#ffd700', 'golden yellow': '#ffd700', 'beige': '#f5f5dc', 'tan': '#d2b48c',
    'olive': '#808000', 'olive green': '#808000', 'coral': '#ff7f50', 'salmon': '#fa8072',
    'turquoise': '#40e0d0', 'violet': '#ee82ee', 'indigo': '#4b0082', 'khaki': '#f0e68c',
    'lavender': '#e6e6fa', 'plum': '#dda0dd', 'crimson': '#dc143c', 'azure': '#f0ffff',
    'ivory': '#fffff0', 'cream': '#fffdd0', 'royal blue': '#4169e1', 'petrol blue': '#008080',
    'steel blue': '#4682b4', 'sky blue light': '#87ceeb', 'grey melange': '#a0a0a0',
    'light yellow': '#ffffe0', 'mustard yellow': '#ffdb58', 'pista': '#90ee90',
    'coffee brown': '#6f4e37', 'flamingo': '#fc8eac', 'slate grey': '#708090',
    'baby pink': '#f4c2c2', 'charcoal melange': '#36454f', 'aqua blue': '#00ffff',
    'parrot green': '#50c878', 'peach': '#ffdab9', 'dark grey': '#a9a9a9', 'dark gray': '#a9a9a9'
  };
  
  const normalized = colorName.toLowerCase().trim();
  if (colorMap[normalized]) {
    return colorMap[normalized];
  }
  for (const [key, value] of Object.entries(colorMap)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return value;
    }
  }
  return '#cccccc';
};

const Home = () => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [trendingProducts, setTrendingProducts] = useState([]);
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [headerImages, setHeaderImages] = useState([]);
  const [showAllTrending, setShowAllTrending] = useState(false);
  const [showAllFeatured, setShowAllFeatured] = useState(false);
  const [hasCartItems, setHasCartItems] = useState(false);

  useEffect(() => {
    fetchTrendingProducts();
    fetchFeaturedProducts();
    fetchHeaderImages();
    trackVisitor();
    if (isAuthenticated) {
      checkCartItems();
    }
    // Listen for cart updates
    const handleCartUpdate = () => {
      if (isAuthenticated) {
        checkCartItems();
      }
    };
    window.addEventListener('cartUpdated', handleCartUpdate);
    return () => {
      window.removeEventListener('cartUpdated', handleCartUpdate);
    };
  }, [isAuthenticated]);

  const fetchHeaderImages = async () => {
    try {
      const res = await api.get('/api/settings/header-images');
      setHeaderImages(res.data.headerImages || []);
    } catch (error) {
      console.error('Error fetching header images:', error);
    }
  };

  const trackVisitor = async () => {
    try {
      // Try to get country from browser's timezone (more accurate than locale)
      let clientCountryCode = null;
      
      try {
        // Method 1: Use timezone to infer country (most accurate)
        const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        console.log('Browser timezone:', timezone);
        
        // Timezone to country mapping (common timezones)
        const timezoneToCountry = {
          // India
          'Asia/Kolkata': 'IN', 'Asia/Calcutta': 'IN',
          // United States
          'America/New_York': 'US', 'America/Chicago': 'US', 'America/Denver': 'US',
          'America/Los_Angeles': 'US', 'America/Phoenix': 'US', 'America/Anchorage': 'US',
          'America/Detroit': 'US', 'America/Indianapolis': 'US', 'America/Louisville': 'US',
          // Other countries
          'Europe/London': 'GB', 'Europe/Paris': 'FR', 'Europe/Berlin': 'DE',
          'Asia/Tokyo': 'JP', 'Asia/Shanghai': 'CN', 'Asia/Dubai': 'AE',
          'Australia/Sydney': 'AU', 'America/Toronto': 'CA', 'America/Mexico_City': 'MX',
          'America/Sao_Paulo': 'BR', 'Europe/Moscow': 'RU', 'Asia/Singapore': 'SG',
          'Asia/Bangkok': 'TH', 'Asia/Jakarta': 'ID', 'Asia/Manila': 'PH',
          'Asia/Kuala_Lumpur': 'MY', 'Asia/Ho_Chi_Minh': 'VN', 'Asia/Dhaka': 'BD',
          'Asia/Karachi': 'PK', 'Asia/Colombo': 'LK', 'Asia/Kathmandu': 'NP'
        };
        
        if (timezone && timezoneToCountry[timezone]) {
          clientCountryCode = timezoneToCountry[timezone];
          console.log('✅ Country detected from timezone:', clientCountryCode);
        } else {
          // Try to extract from timezone string (fallback)
          if (timezone.includes('Asia/Kolkata') || timezone.includes('Asia/Calcutta')) {
            clientCountryCode = 'IN';
          } else if (timezone.startsWith('America/')) {
            // Most America timezones are US, but could be Canada/Mexico
            // We'll use locale as additional check
            const locale = navigator.language || navigator.userLanguage;
            if (locale && locale.includes('en-CA')) {
              clientCountryCode = 'CA';
            } else if (locale && locale.includes('es-MX')) {
              clientCountryCode = 'MX';
            } else {
              clientCountryCode = 'US'; // Default for America timezones
            }
          } else if (timezone.startsWith('Europe/')) {
            // Try to get more specific from locale
            const locale = navigator.language || navigator.userLanguage;
            if (locale) {
              const parts = locale.split('-');
              if (parts.length > 1) {
                clientCountryCode = parts[parts.length - 1].toUpperCase();
              }
            }
          } else if (timezone.startsWith('Asia/')) {
            // For Asia, try locale first, then timezone
            const locale = navigator.language || navigator.userLanguage;
            if (locale) {
              const parts = locale.split('-');
              if (parts.length > 1) {
                const code = parts[parts.length - 1].toUpperCase();
                // Only use if it's an Asian country code
                const asianCodes = ['IN', 'CN', 'JP', 'KR', 'SG', 'MY', 'TH', 'ID', 'PH', 'VN', 'BD', 'PK', 'LK', 'NP', 'MM', 'KH', 'LA'];
                if (asianCodes.includes(code)) {
                  clientCountryCode = code;
                }
              }
            }
          }
        }
        
        // Method 2: Fallback to locale if timezone method didn't work
        if (!clientCountryCode) {
          const locale = navigator.language || navigator.userLanguage;
          console.log('Browser locale:', locale);
          if (locale) {
            const parts = locale.split('-');
            if (parts.length > 1) {
              clientCountryCode = parts[parts.length - 1].toUpperCase();
              console.log('Using country code from locale:', clientCountryCode);
            }
          }
        }
        
        console.log('🌍 Final detected client country code:', clientCountryCode);
      } catch (e) {
        console.log('Error getting client country:', e);
      }

      const response = await api.post('/api/analytics/track-visitor', { 
        page: 'home',
        clientCountryCode: clientCountryCode || null // Send as hint to backend
      });
      console.log('✅ Visitor tracked successfully:', response.data);
      console.log('Country in response:', response.data?.country, 'Code:', response.data?.countryCode);
      
      // If backend returned Unknown/Local and we have client country code, log it
      if (response.data && (response.data.country === 'Unknown' || response.data.country === 'Local') && clientCountryCode) {
        console.warn('⚠️ Client country code available:', clientCountryCode, 'but backend returned:', response.data.country);
      }
    } catch (error) {
      console.error('❌ Error tracking visitor:', error.response?.data || error.message);
      if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response data:', error.response.data);
      }
      // Don't show error to user, just log it
    }
  };

  const fetchTrendingProducts = async () => {
    try {
      const res = await api.get('/api/products?trending=true&limit=8');
      setTrendingProducts(res.data.products || []);
    } catch (error) {
      console.error('Error fetching trending products:', error);
    }
  };

  const fetchFeaturedProducts = async () => {
    try {
      const res = await api.get('/api/products?limit=8');
      setFeaturedProducts(res.data.products || []);
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  const checkCartItems = async () => {
    try {
      const res = await api.get('/api/cart', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      setHasCartItems(res.data && res.data.items && res.data.items.length > 0);
    } catch (error) {
      // If error (e.g., not authenticated), hide button
      setHasCartItems(false);
    }
  };

  const handleAddToCart = async (e, product) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!isAuthenticated) {
      toast.info('Please login to add items to cart');
      navigate('/login');
      return;
    }

    // Get default size and color if available
    let defaultSize = null;
    let defaultColor = null;

    if (product.sizes && product.sizes.length > 0) {
      const firstSize = typeof product.sizes[0] === 'string' 
        ? product.sizes[0] 
        : product.sizes[0].size;
      defaultSize = firstSize;
    }

    if (product.colors && product.colors.length > 0) {
      // Filter out empty colors and get first valid color
      const validColors = product.colors
        .map((colorItem) => {
          const color = typeof colorItem === 'string' ? colorItem : (colorItem?.color || '');
          return color;
        })
        .filter(color => color && color.trim() !== '');
      
      if (validColors.length > 0) {
        defaultColor = validColors[0];
      }
    }

    // Build request payload
    const payload = {
      productId: product._id,
      quantity: 1
    };

    if (defaultSize) {
      payload.size = defaultSize;
    }

    if (defaultColor) {
      payload.color = defaultColor;
    }

    try {
      await api.post(
        '/api/cart/add',
        payload,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        }
      );
      toast.success('Product added to cart!');
      // Dispatch event to update cart count in navbar
      window.dispatchEvent(new Event('cartUpdated'));
      // Check cart items to show View Cart button
      checkCartItems();
    } catch (error) {
      if (error.response?.status === 401) {
        toast.info('Please login to add items to cart');
        navigate('/login');
      } else if (error.response?.status === 400) {
        // If backend requires size/color, navigate to product detail page
        toast.info('Please select size and color on product page');
        navigate(`/product/${product._id}`);
      } else {
        toast.error('Error adding to cart');
      }
    }
  };

  return (
    <div className="home-page-wrapper">
      {/* Always render carousel container to reserve space, even when loading */}
      <HeaderCarousel images={headerImages} />
      <div className="home">
        <section className="trending-section">
        <h2>Now Trending</h2>
        <div className="products-grid">
        {trendingProducts.length === 0 ? (
            <p className="no-products-message">No trending products at the moment</p>
        ) : (
          <>
              {(showAllTrending ? trendingProducts : trendingProducts.slice(0, 4)).map((product) => {
              const discountPercent = product.discountPrice 
                ? Math.round(((product.price - product.discountPrice) / product.price) * 100) 
                : 0;
              const brandName = product.name.split(' ')[0] || product.category;

              return (
                <div key={product._id} className="product-card">
                  <Link to={`/product/${product._id}`} className="product-card-link">
                    <div className="product-image">
                      {product.images && product.images[0] ? (
                        <img 
                          src={getOptimizedImageUrl(product.images[0], 'product-list')} 
                          alt={product.name}
                          loading="lazy"
                          decoding="async"
                          width="400"
                          height="400"
                          style={{
                            width: "100%",
                            aspectRatio: "1 / 1",
                            objectFit: "cover",
                            backgroundColor: "#f2f2f2"
                          }}
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200"%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em"%3ENo Image%3C/text%3E%3C/svg%3E';
                          }}
                        />
                      ) : (
                        <div className="placeholder-image">No Image</div>
                      )}
                    </div>
                    {product.colors && product.colors.length > 0 && (
                      <div className="color-swatches">
                        {product.colors
                          .map((colorItem) => {
                            const color = typeof colorItem === 'string' ? colorItem : (colorItem?.color || '');
                            return color;
                          })
                          .filter(color => color && color.trim() !== '')
                          .slice(0, 6)
                          .map((color, index) => {
                            const colorValue = getColorValue(color);
                            return (
                              <span 
                                key={color || index} 
                                className="color-swatch"
                                style={{ backgroundColor: colorValue }}
                                title={color}
                              />
                            );
                          })}
                      </div>
                    )}
                    <div className="product-info">
                      <h3 className="product-name">{product.name}</h3>
                      <div className="product-price-section">
                        {product.discountPrice ? (
                          <>
                            <span className="current-price">₹{product.discountPrice.toLocaleString('en-IN')}</span>
                            <span className="mrp-price">
                              ₹{product.price.toLocaleString('en-IN')}
                            </span>
                            <span className="discount-percent">({discountPercent}% off)</span>
                          </>
                        ) : (
                          <span className="current-price">₹{product.price.toLocaleString('en-IN')}</span>
                        )}
                      </div>
                      <div className="free-delivery-text">Free Delivery</div>
                      <button 
                        className="add-to-cart-btn-card"
                        onClick={(e) => handleAddToCart(e, product)}
                      >
                        Add to cart
                      </button>
                    </div>
                  </Link>
                </div>
              );
              })}
            {trendingProducts.length > 4 && !showAllTrending && (
              <div style={{ textAlign: 'center', marginTop: '2rem', gridColumn: '1 / -1' }}>
                <button
                  onClick={() => setShowAllTrending(true)}
                  className="more-products-btn"
                >
                  More
                </button>
              </div>
            )}
          </>
        )}
        </div>
      </section>

      <section className="featured-section">
        <h2>Featured Products</h2>
        <div className="products-grid">
        {featuredProducts.length === 0 ? (
            <p className="no-products-message">No featured products at the moment</p>
        ) : (
          <>
              {(showAllFeatured ? featuredProducts : featuredProducts.slice(0, 4)).map((product) => {
            const discountPercent = product.discountPrice 
              ? Math.round(((product.price - product.discountPrice) / product.price) * 100) 
              : 0;
            const brandName = product.name.split(' ')[0] || product.category;

            return (
              <div key={product._id} className="product-card">
                <Link to={`/product/${product._id}`} className="product-card-link">
                  <div className="product-image">
                    {product.images && product.images[0] ? (
                      <img 
                        src={getOptimizedImageUrl(product.images[0], 'product-list')} 
                        alt={product.name}
                        loading="lazy"
                        decoding="async"
                        width="400"
                        height="400"
                        style={{
                          width: "100%",
                          aspectRatio: "1 / 1",
                          objectFit: "cover",
                          backgroundColor: "#f2f2f2"
                        }}
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200"%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em"%3ENo Image%3C/text%3E%3C/svg%3E';
                        }}
                      />
                    ) : (
                      <div className="placeholder-image">No Image</div>
                    )}
                  </div>
                  {product.colors && product.colors.length > 0 && (
                    <div className="color-swatches">
                      {product.colors
                        .map((colorItem) => {
                          const color = typeof colorItem === 'string' ? colorItem : (colorItem?.color || '');
                          return color;
                        })
                        .filter(color => color && color.trim() !== '')
                        .slice(0, 6)
                        .map((color, index) => {
                          const colorValue = getColorValue(color);
                          return (
                            <span 
                              key={color || index} 
                              className="color-swatch"
                              style={{ backgroundColor: colorValue }}
                              title={color}
                            />
                          );
                        })}
                    </div>
                  )}
                  <div className="product-info">
                    <h3 className="product-name">{product.name}</h3>
                    <div className="product-price-section">
                      {product.discountPrice ? (
                        <>
                          <span className="current-price">₹{product.discountPrice.toLocaleString('en-IN')}</span>
                          <span className="mrp-price">
                            ₹{product.price.toLocaleString('en-IN')}
                          </span>
                          <span className="discount-percent">({discountPercent}% off)</span>
                        </>
                      ) : (
                        <span className="current-price">₹{product.price.toLocaleString('en-IN')}</span>
                      )}
                    </div>
                    <div className="free-delivery-text">Free Delivery</div>
                    <button 
                      className="add-to-cart-btn-card"
                      onClick={(e) => handleAddToCart(e, product)}
                    >
                      Add to cart
                    </button>
                  </div>
                </Link>
              </div>
            );
          })}
            {featuredProducts.length > 4 && !showAllFeatured && (
              <div style={{ textAlign: 'center', marginTop: '2rem', gridColumn: '1 / -1' }}>
                <button
                  onClick={() => setShowAllFeatured(true)}
                  className="more-products-btn"
                >
                  More
                </button>
              </div>
            )}
          </>
        )}
        </div>
      </section>
      </div>
      {hasCartItems && (
        <div className="fixed-view-cart-container">
          <button
            className="fixed-view-cart-btn"
            onClick={() => navigate('/cart')}
          >
            View Cart
          </button>
        </div>
      )}
    </div>
  );
};

export default Home;


