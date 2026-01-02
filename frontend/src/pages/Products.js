import React, { useEffect, useState } from 'react';
import { useParams, Link, useSearchParams, useNavigate } from 'react-router-dom';
import api from '../api/api';
import { useAuth } from '../hooks/useAuth';
import { toast } from 'react-toastify';
import { getOptimizedImageUrl } from '../utils/config';
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
    
    // If there's a search query, clear subcategory selection
    if (searchQuery && searchQuery.trim()) {
      setSelectedSubcategory('');
    } else if (subcategoryFromUrl) {
      setSelectedSubcategory(subcategoryFromUrl);
    } else {
      setSelectedSubcategory('');
    }
    // Reset to page 1 when subcategory or search changes
    setPage(1);
    // Clear products when subcategory or search changes to prevent showing stale data
    setProducts([]);
  }, [searchParams, category]);

  useEffect(() => {
    fetchProducts();
  }, [category, selectedSubcategory, page, searchParams]);

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
      
      // Get search query first
      const searchQuery = searchParams.get('search');
      
      // If there's a search query, don't filter by category/subcategory
      // Search should work across all products
      if (searchQuery && searchQuery.trim()) {
        params.search = searchQuery.trim();
      } else {
        // Only apply category/subcategory filters when not searching
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

  const currentCategory = categories.find(cat => cat.name === category);
  const subcategories = currentCategory?.subcategories?.filter(sub => sub.isActive) || [];

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
        <div className="products-sidebar">
          <h2>Categories</h2>
          <div className="category-list">
            <Link to="/products" className={!category ? 'active' : ''}>
              All Products
            </Link>
            {categories.map((cat) => (
              <Link
                key={cat._id}
                to={`/products/${cat.name}`}
                className={category === cat.name ? 'active' : ''}
              >
                {cat.name}
              </Link>
            ))}
          </div>

          {subcategories.length > 0 && (
            <>
              <h3>Subcategories</h3>
              <div className="subcategory-list">
                <button
                  onClick={() => {
                    setSelectedSubcategory('');
                    const newSearchParams = new URLSearchParams(searchParams);
                    newSearchParams.delete('subcategory');
                    setSearchParams(newSearchParams);
                    setPage(1);
                  }}
                  className={!selectedSubcategory ? 'active' : ''}
                >
                  All
                </button>
                {subcategories.map((sub) => (
                  <button
                    key={sub._id}
                    onClick={() => {
                      setSelectedSubcategory(sub.slug);
                      const newSearchParams = new URLSearchParams(searchParams);
                      newSearchParams.set('subcategory', sub.slug);
                      setSearchParams(newSearchParams);
                      setPage(1);
                    }}
                    className={selectedSubcategory === sub.slug ? 'active' : ''}
                  >
                    {sub.name}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Mobile Category Filter */}
        <div className="mobile-category-filter">
          <button 
            className="mobile-filter-toggle"
            onClick={() => setShowMobileFilters(!showMobileFilters)}
          >
            <span>📂</span> {category || 'All Categories'}
            <span className="filter-arrow">{showMobileFilters ? '▲' : '▼'}</span>
          </button>
          
          {showMobileFilters && (
            <div className="mobile-filter-content">
              <div className="mobile-category-section">
                <h3>Categories</h3>
                <div className="mobile-category-list">
                  <Link 
                    to="/products" 
                    className={`mobile-category-item ${!category ? 'active' : ''}`}
                    onClick={() => setShowMobileFilters(false)}
                  >
                    All Products
                  </Link>
                  {categories.map((cat) => (
                    <Link
                      key={cat._id}
                      to={`/products/${cat.name}`}
                      className={`mobile-category-item ${category === cat.name ? 'active' : ''}`}
                      onClick={() => setShowMobileFilters(false)}
                    >
                      {cat.name}
                    </Link>
                  ))}
                </div>
              </div>

              {subcategories.length > 0 && (
                <div className="mobile-subcategory-section">
                  <h3>Subcategories</h3>
                  <div className="mobile-subcategory-list">
                    <button
                      onClick={() => {
                        setSelectedSubcategory('');
                        const newSearchParams = new URLSearchParams(searchParams);
                        newSearchParams.delete('subcategory');
                        setSearchParams(newSearchParams);
                        setPage(1);
                        setShowMobileFilters(false);
                      }}
                      className={`mobile-subcategory-item ${!selectedSubcategory ? 'active' : ''}`}
                    >
                      All
                    </button>
                    {subcategories.map((sub) => (
                      <button
                        key={sub._id}
                        onClick={() => {
                          setSelectedSubcategory(sub.slug);
                          const newSearchParams = new URLSearchParams(searchParams);
                          newSearchParams.set('subcategory', sub.slug);
                          setSearchParams(newSearchParams);
                          setPage(1);
                          setShowMobileFilters(false);
                        }}
                        className={`mobile-subcategory-item ${selectedSubcategory === sub.slug ? 'active' : ''}`}
                      >
                        {sub.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="products-content">
          <h1>
            {searchParams.get('search') ? (
              <>
                Search Results for "{searchParams.get('search')}"
                {!loading && (
                  <span className="search-results-count">
                    {' '}({totalProducts} {totalProducts === 1 ? 'product' : 'products'} found)
                  </span>
                )}
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
                                <span className="mrp-price">₹{product.price.toLocaleString('en-IN')}</span>
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


