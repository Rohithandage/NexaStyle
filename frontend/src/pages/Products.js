import React, { useEffect, useState, useMemo } from 'react';
import { useParams, Link, useSearchParams, useNavigate } from 'react-router-dom';
import api from '../api/api';
import { useAuth } from '../hooks/useAuth';
import { toast } from 'react-toastify';
import { getOptimizedImageUrl } from '../utils/config';
import { getProductPriceForCountry, formatPrice } from '../utils/currency';
import './Products.css';

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

const Products = () => {
  const { category } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedSubcategory, setSelectedSubcategory] = useState('');
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalProducts, setTotalProducts] = useState(0);
  const [hasCartItems, setHasCartItems] = useState(false);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [searchMetadata, setSearchMetadata] = useState(null);
  const [offers, setOffers] = useState([]);

  useEffect(() => {
    fetchCategories();
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

  useEffect(() => {
    const searchQuery = searchParams.get('search');
    const subcategoryFromUrl = searchParams.get('subcategory');
    const carouselParam = searchParams.get('carousel');
    
    // If there's a search query, clear subcategory selection
    if (searchQuery && searchQuery.trim()) {
      setSelectedSubcategory('');
    } else if (subcategoryFromUrl) {
      setSelectedSubcategory(subcategoryFromUrl);
    } else {
      setSelectedSubcategory('');
    }
    // Reset to page 1 when subcategory, search, or carousel changes
    setPage(1);
    // Clear products when subcategory, search, or carousel changes to prevent showing stale data
    setProducts([]);
  }, [searchParams, category]);

  useEffect(() => {
    fetchProducts();
  }, [category, selectedSubcategory, page, searchParams]);

  useEffect(() => {
    const carouselParam = searchParams.get('carousel');
    if (carouselParam && carouselParam.trim()) {
      fetchOffers();
    } else {
      setOffers([]);
    }
  }, [searchParams]);

  const fetchCategories = async () => {
    try {
      const res = await api.get('/api/products/categories/all');
      setCategories(res.data);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const params = { page, limit: 12 };
      
      // Get search query and carousel parameter
      const searchQuery = searchParams.get('search');
      const carouselParam = searchParams.get('carousel');
      
      // If there's a carousel parameter, filter by product IDs
      if (carouselParam && carouselParam.trim()) {
        const productIds = carouselParam.split(',').filter(id => id.trim());
        if (productIds.length > 0) {
          params.productIds = productIds.join(',');
        }
      }
      // If there's a search query, don't filter by category/subcategory
      // Search should work across all products
      else if (searchQuery && searchQuery.trim()) {
        params.search = searchQuery.trim();
      } else {
        // Only apply category/subcategory filters when not searching or filtering by carousel
        if (category) params.category = category;
        
        // Always use URL parameter as source of truth for subcategory
        const subcategoryFromUrl = searchParams.get('subcategory');
        if (subcategoryFromUrl && subcategoryFromUrl.trim()) {
          params.subcategory = subcategoryFromUrl.trim();
        } else if (selectedSubcategory && selectedSubcategory.trim()) {
          // Fallback to state if URL doesn't have it
          params.subcategory = selectedSubcategory.trim();
        }
      }

      const res = await api.get('/api/products', { params });
      setProducts(res.data.products || []);
      setTotalPages(res.data.totalPages || 1);
      setTotalProducts(res.data.total || 0);
      
      // Debug logging for alsoInCategories
      if (res.data.debug) {
        console.log('[PRODUCTS API RESPONSE] Debug info:', res.data.debug);
        console.log('[PRODUCTS API RESPONSE] Products from alsoInCategories:', res.data.debug.productsFromAlsoInCategories);
        console.log('[PRODUCTS API RESPONSE] Total products found:', res.data.debug.productsFound);
      }
      
      // Store search metadata for display
      if (res.data.suggestedQuery || res.data.isFallback !== undefined) {
        setSearchMetadata({
          suggestedQuery: res.data.suggestedQuery,
          hasExactMatches: res.data.hasExactMatches,
          isFallback: res.data.isFallback
        });
      } else {
        setSearchMetadata(null);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
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

  const fetchOffers = async () => {
    try {
      // Fetch all active offers including bundle/carousel offers
      const res = await api.get('/api/settings/offers?includeAll=true');
      setOffers(res.data.offers || []);
    } catch (error) {
      console.error('Error fetching offers:', error);
      // Fallback to regular offers endpoint
      try {
        const res = await api.get('/api/settings/offers');
        setOffers(res.data.offers || []);
      } catch (fallbackError) {
        console.error('Error fetching offers (fallback):', fallbackError);
        setOffers([]);
      }
    }
  };

  const currentCategory = categories.find(cat => cat.name === category);
  const subcategories = currentCategory?.subcategories
    ?.filter(sub => sub.isActive)
    ?.sort((a, b) => (a.order || 0) - (b.order || 0)) || [];

  // Color gradients for offer cards
  const offerColors = [
    'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
    'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
    'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
    'linear-gradient(135deg, #30cfd0 0%, #330867 100%)',
    'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
    'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)'
  ];

  const getOfferColor = (index) => {
    return offerColors[index % offerColors.length];
  };

  // Filter to get carousel offers that match the current carousel
  const carouselOffers = useMemo(() => {
    const carouselParam = searchParams.get('carousel');
    if (!carouselParam || !carouselParam.trim() || offers.length === 0) {
      return [];
    }

    const productIdsFromUrl = carouselParam.split(',').map(id => id.trim()).filter(id => id);
    
    return offers.filter(offer => {
      if (!offer.isActive || offer.offerType !== 'carousel') {
        return false;
      }
      
      // Check if the carousel's productIds match the URL productIds
      if (offer.carouselId && offer.carouselId.productIds) {
        const carouselProductIds = Array.isArray(offer.carouselId.productIds) 
          ? offer.carouselId.productIds 
          : [];
        
        const carouselProductIdStrings = carouselProductIds.map(pId => {
          const id = pId._id ? pId._id.toString() : pId.toString();
          return id;
        });
        
        // Check if all productIds from URL are in the carousel
        const allMatch = productIdsFromUrl.every(urlId => 
          carouselProductIdStrings.includes(urlId)
        );
        
        // Also check if the carousel has the same number of products (or more)
        // This ensures we're showing the offer for the correct carousel
        if (allMatch && carouselProductIdStrings.length >= productIdsFromUrl.length) {
          return true;
        }
      }
      
      // Fallback: check if product is in the offer's products array
      if (offer.products && Array.isArray(offer.products)) {
        const offerProductIds = offer.products.map(pId => pId.toString());
        const allMatch = productIdsFromUrl.every(urlId => 
          offerProductIds.includes(urlId)
        );
        return allMatch && offerProductIds.length >= productIdsFromUrl.length;
      }
      
      return false;
    });
  }, [offers, searchParams]);

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
    <div className="products-page">
      <div className="products-container">
        <div className="products-content">
          {/* Carousel Offers Section - Only show when viewing a carousel - Show at top */}
          {carouselOffers.length > 0 && (
            <div className="carousel-offers-section">
              <div className="carousel-offers-container">
                {carouselOffers.map((offer, index) => (
                  <div
                    key={offer._id}
                    className="carousel-offer-card"
                    style={{ background: getOfferColor(index) }}
                  >
                    <div className="carousel-offer-badge">
                      <span className="offer-icon">🎁</span>
                      <span className="carousel-offer-code">{offer.code}</span>
                    </div>
                    <div className="carousel-offer-text">
                      {offer.carouselDisplayText || 'Special Offer'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          <h1>
            {searchParams.get('carousel') ? (
              <>
                {searchParams.get('name') ? decodeURIComponent(searchParams.get('name')) : 'Featured Products'}
              </>
            ) : searchParams.get('search') ? (
              <>
                Search Results for "{searchParams.get('search')}"
              </>
            ) : (
              <>
                {category || 'All Products'}
                {selectedSubcategory && currentCategory && (
                  <span className="subcategory-title">
                    {' - '}
                    {currentCategory.subcategories?.find(sub => sub.slug === selectedSubcategory)?.name || selectedSubcategory}
                  </span>
                )}
              </>
            )}
          </h1>
          {loading ? (
            <div className="loading">Loading products...</div>
          ) : products.length === 0 ? (
            <div className="no-products">
              <p>No products found for "{searchParams.get('search')}"</p>
              {searchMetadata?.suggestedQuery && (
                <div className="search-suggestion">
                  <p>Did you mean: <Link to={`/products?search=${encodeURIComponent(searchMetadata.suggestedQuery)}`} className="suggested-link">{searchMetadata.suggestedQuery}</Link>?</p>
                </div>
              )}
            </div>
          ) : (
            <>
              {searchMetadata?.suggestedQuery && searchMetadata.hasExactMatches === false && (
                <div className="search-suggestion-banner">
                  <p>Did you mean: <Link to={`/products?search=${encodeURIComponent(searchMetadata.suggestedQuery)}`} className="suggested-link">{searchMetadata.suggestedQuery}</Link>?</p>
                </div>
              )}
              {searchMetadata?.isFallback && (
                <div className="search-fallback-banner">
                  <p>Showing popular products related to your search</p>
                </div>
              )}
              <div className="products-grid">
                {products.map((product) => {
                  // Get country-specific pricing
                  const countryPricing = getProductPriceForCountry(product);
                  const productPrice = countryPricing.price;
                  const productDiscountPrice = countryPricing.discountPrice;
                  const discountPercent = productDiscountPrice 
                    ? Math.round(((productPrice - productDiscountPrice) / productPrice) * 100) 
                    : 0;
                  const brandName = product.name.split(' ')[0] || product.category;

                  return (
                    <div key={product._id} className="product-card">
                      <Link to={`/product/${product._id}`} className="product-card-link">
                        <div className="product-image">
                          {product.hasOffer && (
                            <div className="offer-badge">OFFER</div>
                          )}
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
                            {productDiscountPrice ? (
                              <>
                                <span className="current-price">{formatPrice(productDiscountPrice, countryPricing.currency)}</span>
                                <span className="mrp-price">{formatPrice(productPrice, countryPricing.currency)}</span>
                                <span className="discount-percent">({discountPercent}% off)</span>
                              </>
                            ) : (
                              <span className="current-price">{formatPrice(productPrice, countryPricing.currency)}</span>
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
              </div>

              {totalPages > 1 && (
                <div className="pagination">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    Previous
                  </button>
                  <span>Page {page} of {totalPages}</span>
                  <button
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          )}
        </div>
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

export default Products;


