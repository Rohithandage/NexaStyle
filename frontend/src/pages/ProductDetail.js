import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/api';
import { useAuth } from '../hooks/useAuth';
import { toast } from 'react-toastify';
import Reviews from '../components/Reviews';
import { getOptimizedImageUrl } from '../utils/config';
import './ProductDetail.css';

// Color name to hex mapping
const getColorValue = (colorName) => {
  // Handle null, undefined, or empty values
  if (!colorName || typeof colorName !== 'string') {
    return '#cccccc'; // Default gray color
  }
  
  const colorMap = {
    'red': '#ff0000',
    'blue': '#0000ff',
    'green': '#008000',
    'yellow': '#ffff00',
    'black': '#000000',
    'white': '#ffffff',
    'gray': '#808080',
    'grey': '#808080',
    'orange': '#ffa500',
    'purple': '#800080',
    'pink': '#ffc0cb',
    'brown': '#a52a2a',
    'navy': '#000080',
    'navy blue': '#000080',
    'maroon': '#800000',
    'teal': '#008080',
    'cyan': '#00ffff',
    'lime': '#00ff00',
    'magenta': '#ff00ff',
    'silver': '#c0c0c0',
    'gold': '#ffd700',
    'golden yellow': '#ffd700',
    'beige': '#f5f5dc',
    'tan': '#d2b48c',
    'olive': '#808000',
    'olive green': '#808000',
    'coral': '#ff7f50',
    'salmon': '#fa8072',
    'turquoise': '#40e0d0',
    'violet': '#ee82ee',
    'indigo': '#4b0082',
    'khaki': '#f0e68c',
    'lavender': '#e6e6fa',
    'plum': '#dda0dd',
    'crimson': '#dc143c',
    'azure': '#f0ffff',
    'ivory': '#fffff0',
    'cream': '#fffdd0',
    'royal blue': '#4169e1',
    'petrol blue': '#008080',
    'steel blue': '#4682b4',
    'sky blue light': '#87ceeb',
    'grey melange': '#a0a0a0',
    'light yellow': '#ffffe0',
    'mustard yellow': '#ffdb58',
    'pista': '#90ee90',
    'coffee brown': '#6f4e37',
    'flamingo': '#fc8eac',
    'slate grey': '#708090',
    'baby pink': '#f4c2c2',
    'charcoal melange': '#36454f',
    'aqua blue': '#00ffff',
    'parrot green': '#50c878',
    'peach': '#ffdab9'
  };
  
  const normalized = colorName.toLowerCase().trim();
  // Try exact match first
  if (colorMap[normalized]) {
    return colorMap[normalized];
  }
  // Try partial match for compound colors
  for (const [key, value] of Object.entries(colorMap)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return value;
    }
  }
  return colorName; // Return original if not found
};

const getContrastColor = (colorValue) => {
  // If it's a hex color, calculate brightness
  if (colorValue.startsWith('#')) {
    const hex = colorValue.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    return brightness > 128 ? '#000' : '#fff';
  }
  
  // For color names, use predefined dark colors
  const darkColors = ['black', 'navy', 'darkblue', 'darkgreen', 'maroon', 'purple', 'darkred', 'brown'];
  const normalized = colorValue.toLowerCase();
  return darkColors.some(dc => normalized.includes(dc)) ? '#fff' : '#000';
};

const ProductDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [product, setProduct] = useState(null);
  const [selectedSize, setSelectedSize] = useState('');
  const [selectedColor, setSelectedColor] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [isImageZoomed, setIsImageZoomed] = useState(false);
  const [hasCartItems, setHasCartItems] = useState(false);
  const [offers, setOffers] = useState([]);
  const [dismissedOffers, setDismissedOffers] = useState([]);
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [couponError, setCouponError] = useState('');

  useEffect(() => {
    fetchProduct();
    fetchOffers();
    checkAppliedCoupon();
    if (isAuthenticated) {
      checkCartItems();
    }
    // Listen for cart updates
    const handleCartUpdate = () => {
      if (isAuthenticated) {
        checkCartItems();
      }
    };
    // Listen for coupon updates
    const handleCouponUpdate = () => {
      checkAppliedCoupon();
    };
    window.addEventListener('cartUpdated', handleCartUpdate);
    window.addEventListener('couponApplied', handleCouponUpdate);
    window.addEventListener('storage', handleCouponUpdate);
    return () => {
      window.removeEventListener('cartUpdated', handleCartUpdate);
      window.removeEventListener('couponApplied', handleCouponUpdate);
      window.removeEventListener('storage', handleCouponUpdate);
    };
  }, [id, isAuthenticated]);

  useEffect(() => {
    // Update images when color changes
    if (product && selectedColor) {
      // Find color-specific images
      const colorObj = product.colors?.find(c => {
        const colorName = typeof c === 'string' ? c : c.color;
        return colorName === selectedColor;
      });
      
      if (colorObj && typeof colorObj === 'object' && colorObj.images && colorObj.images.length > 0) {
        // Use color-specific images
        setSelectedImageIndex(0);
      } else {
        // Use general images
        setSelectedImageIndex(0);
      }
    }
  }, [selectedColor, product]);

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

  const fetchProduct = async () => {
    try {
      const res = await api.get(`/api/products/${id}`);
      const productData = res.data;
      
      // Handle both old format (array of strings) and new format (array of objects)
      if (productData.sizes && productData.sizes.length > 0) {
        const firstSize = typeof productData.sizes[0] === 'string' 
          ? productData.sizes[0] 
          : productData.sizes[0].size;
        setSelectedSize(firstSize);
      }
      
      if (productData.colors && productData.colors.length > 0) {
        const firstColor = typeof productData.colors[0] === 'string' 
          ? productData.colors[0] 
          : productData.colors[0].color;
        setSelectedColor(firstColor);
      }
      
      setProduct(productData);
      setSelectedImageIndex(0);
    } catch (error) {
      toast.error('Error loading product');
    } finally {
      setLoading(false);
    }
  };

  const fetchOffers = async () => {
    try {
      const res = await api.get('/api/settings/offers');
      setOffers(res.data.offers || []);
      checkAppliedCoupon();
    } catch (error) {
      console.error('Error fetching offers:', error);
    }
  };

  const checkAppliedCoupon = () => {
    const pendingCouponCode = localStorage.getItem('pendingCouponCode');
    if (pendingCouponCode && offers.length > 0) {
      const coupon = offers.find(
        offer => offer.isActive && offer.code.toUpperCase() === pendingCouponCode.toUpperCase()
      );
      if (coupon) {
        setAppliedCoupon(coupon);
        setCouponCode(coupon.code);
      } else {
        setAppliedCoupon(null);
        setCouponCode('');
      }
    } else if (!pendingCouponCode) {
      setAppliedCoupon(null);
      setCouponCode('');
    }
  };

  const handleDismissOffer = (offerId) => {
    setDismissedOffers([...dismissedOffers, offerId]);
  };

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

  const visibleOffers = offers.filter(
    offer => offer.isActive && !dismissedOffers.includes(offer._id)
  );

  const handleApplyCoupon = (code = null) => {
    setCouponError('');
    const codeToApply = code || couponCode.trim();
    
    if (!codeToApply) {
      setCouponError('Please enter a coupon code');
      return;
    }

    const coupon = offers.find(
      offer => offer.isActive && offer.code.toUpperCase() === codeToApply.toUpperCase()
    );

    if (coupon) {
      // Check if already applied - toggle it off
      if (appliedCoupon && appliedCoupon.code.toUpperCase() === coupon.code.toUpperCase()) {
        // Remove the coupon
        setAppliedCoupon(null);
        setCouponCode('');
        localStorage.removeItem('pendingCouponCode');
        window.dispatchEvent(new Event('couponApplied'));
        toast.info(`Coupon ${coupon.code} removed`);
        return;
      }
      
      // Apply the coupon
      setAppliedCoupon(coupon);
      setCouponCode(coupon.code);
      // Store in localStorage so it syncs across all pages
      localStorage.setItem('pendingCouponCode', coupon.code);
      window.dispatchEvent(new Event('couponApplied'));
      // Show minimal toast
      toast.success(`Coupon ${coupon.code} applied!`);
    } else {
      setCouponError('Invalid coupon code');
      toast.error('Invalid coupon code');
    }
  };

  const handleApplyOffer = (offer) => {
    handleApplyCoupon(offer.code);
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode('');
    setCouponError('');
    localStorage.removeItem('pendingCouponCode');
    window.dispatchEvent(new Event('couponApplied'));
    toast.info('Coupon removed');
  };

  // Calculate price with coupon discount
  const calculatePriceWithCoupon = (basePrice) => {
    if (!appliedCoupon) return basePrice;

    if (appliedCoupon.discountType === 'percentage') {
      const discount = (basePrice * appliedCoupon.discount) / 100;
      return Math.max(0, basePrice - discount);
    } else {
      return Math.max(0, basePrice - appliedCoupon.discount);
    }
  };

  const handleAddToCart = async () => {
    if (!isAuthenticated) {
      toast.info('Please login to add items to cart');
      navigate('/login');
      return;
    }

    if (!selectedSize || !selectedColor) {
      toast.error('Please select size and color');
      return;
    }

    try {
      await api.post(
        '/api/cart/add',
        {
          productId: id,
          quantity,
          size: selectedSize,
          color: selectedColor
        },
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
      toast.error('Error adding to cart');
    }
  };

  if (loading) {
    return <div className="loading">Loading product...</div>;
  }

  if (!product) {
    return <div className="error">Product not found</div>;
  }

  return (
    <div className="product-detail">
      <div className="product-detail-container">
        <div className="product-images">
          {(() => {
            // Collect all images: general product images + all color-specific images
            // Keep original image paths (not optimized URLs) for flexibility
            let allImages = [...(product.images || [])];
            
            // Add all color-specific images from all colors
            if (product.colors && product.colors.length > 0) {
              product.colors.forEach(colorItem => {
                if (typeof colorItem === 'object' && colorItem.images && colorItem.images.length > 0) {
                  colorItem.images.forEach(img => {
                    // Check if image already exists
                    if (!allImages.includes(img)) {
                      allImages.push(img);
                    }
                  });
                }
              });
            }
            
            // When color is selected, prioritize that color's images at the start
            let imagesToShow = [...allImages];
            if (selectedColor && product.colors) {
              const colorObj = product.colors.find(c => {
                const colorName = typeof c === 'string' ? c : c.color;
                return colorName === selectedColor;
              });
              
              if (colorObj && typeof colorObj === 'object' && colorObj.images && colorObj.images.length > 0) {
                // Get color-specific images
                const colorImages = colorObj.images;
                // Put color images first, then other images
                const otherImages = allImages.filter(img => !colorImages.includes(img));
                imagesToShow = [...colorImages, ...otherImages];
              }
            }
            
            return imagesToShow.length > 0 ? (
              <>
                <div 
                  className={`main-image ${isImageZoomed ? 'zoomed' : ''}`}
                  onClick={() => setIsImageZoomed(!isImageZoomed)}
                >
                  <img 
                    src={getOptimizedImageUrl(imagesToShow[selectedImageIndex] || imagesToShow[0], 'product-detail')} 
                    alt={`${product.name} - Image ${selectedImageIndex + 1}`}
                    loading="eager"
                    decoding="async"
                    width="800"
                    height="600"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200"%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em"%3ENo Image%3C/text%3E%3C/svg%3E';
                    }}
                  />
                </div>
                {imagesToShow.length > 1 && (
                  <div className="image-thumbnails">
                    {imagesToShow.map((image, index) => (
                      <div
                        key={index}
                        className={`thumbnail ${selectedImageIndex === index ? 'active' : ''}`}
                        onClick={() => {
                          setSelectedImageIndex(index);
                          setIsImageZoomed(false); // Reset zoom when changing image
                        }}
                      >
                        <img 
                          src={getOptimizedImageUrl(image, 'thumbnail')} 
                          alt={`${product.name} thumbnail ${index + 1}`}
                          loading="lazy"
                          decoding="async"
                          width="150"
                          height="150"
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200"%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em"%3ENo Image%3C/text%3E%3C/svg%3E';
                          }}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="placeholder-image">No Image</div>
            );
          })()}
        </div>

        <div className="product-info">
          <h1>{product.name}</h1>
          <div className="product-rating">
            ⭐ {product.rating?.toFixed(1) || 0} ({product.numReviews || 0} reviews)
          </div>
          <div className="product-options">
            <label>Price (₹):</label>
            <div className="product-price-section">
              {(() => {
                // Always use the original product price for strikethrough
                const originalPrice = product.price;
                
                // Get discount price - check size-specific first, then product-level
                let displayDiscountPrice = product.discountPrice;
                let currentPrice = product.price;
                
                if (product.sizes && product.sizes.length > 0 && selectedSize) {
                  const selectedSizeObj = product.sizes.find(s => {
                    const size = typeof s === 'string' ? s : s.size;
                    return size === selectedSize;
                  });
                  
                  if (selectedSizeObj && typeof selectedSizeObj === 'object') {
                    currentPrice = selectedSizeObj.price;
                    // Use size-specific discount price if available, otherwise fall back to product discount price
                    displayDiscountPrice = selectedSizeObj.discountPrice || product.discountPrice;
                  }
                }
                
                // Apply coupon discount if available
                let finalPrice = displayDiscountPrice && displayDiscountPrice > 0 ? displayDiscountPrice : currentPrice;
                if (appliedCoupon) {
                  finalPrice = calculatePriceWithCoupon(finalPrice);
                }
                
                // Always show both original price (with strikethrough) and discount price when discount exists
                if (displayDiscountPrice && displayDiscountPrice > 0) {
                  const discountPercent = displayDiscountPrice < originalPrice 
                    ? Math.round(((originalPrice - displayDiscountPrice) / originalPrice) * 100) 
                    : 0;
                  
                  return (
                    <>
                      <span className="discount-price">₹{finalPrice.toFixed(2)}</span>
                      <span className="original-price">₹{originalPrice}</span>
                      {discountPercent > 0 && (
                        <span className="discount-percent">
                          {discountPercent}% OFF
                        </span>
                      )}
                      {appliedCoupon && (
                        <span className="coupon-applied-badge">
                          + {appliedCoupon.discountType === 'percentage' ? `${appliedCoupon.discount}%` : `₹${appliedCoupon.discount}`} OFF (Coupon)
                        </span>
                      )}
                    </>
                  );
                } else {
                  return (
                    <>
                      <span className="price">₹{finalPrice.toFixed(2)}</span>
                      {appliedCoupon && (
                        <span className="coupon-applied-badge">
                          {appliedCoupon.discountType === 'percentage' ? `${appliedCoupon.discount}%` : `₹${appliedCoupon.discount}`} OFF (Coupon)
                        </span>
                      )}
                    </>
                  );
                }
              })()}
            </div>
          </div>

          <div className="product-description-section">
            <label>Description:</label>
            <p className="product-description">{product.description}</p>
          </div>

          {product.sizes && product.sizes.length > 0 && (
            <div className="product-options">
              <label>Size:</label>
              <div className="options-group">
                {product.sizes.map((sizeItem, index) => {
                  // Handle both old format (string) and new format (object)
                  const size = typeof sizeItem === 'string' ? sizeItem : sizeItem.size;
                  const sizePrice = typeof sizeItem === 'object' ? (sizeItem.discountPrice || sizeItem.price) : null;
                  const sizeStock = typeof sizeItem === 'object' ? sizeItem.stock : null;
                  
                  return (
                    <button
                      key={index}
                      onClick={() => setSelectedSize(size)}
                      className={selectedSize === size ? 'active' : ''}
                      disabled={sizeStock !== null && sizeStock === 0}
                      title={sizePrice ? `₹${sizePrice}` : ''}
                    >
                      {size}
                      {sizePrice && (
                        <span className="size-price-badge">₹{sizePrice}</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {product.colors && product.colors.length > 0 && (
            <div className="product-options">
              <label>Color:</label>
              <div className="options-group color-options">
                {product.colors
                  .map((colorItem) => {
                    const color = typeof colorItem === 'string' ? colorItem : (colorItem?.color || '');
                    return color;
                  })
                  .filter(color => color && color.trim() !== '') // Filter out empty colors
                  .map((color, index) => {
                    const colorValue = getColorValue(color);
                    
                    return (
                      <button
                        key={color || index}
                        onClick={() => {
                          setSelectedColor(color);
                          setSelectedImageIndex(0); // Reset to first image when color changes
                        }}
                        className={`color-option-circle ${selectedColor === color ? 'active' : ''}`}
                        style={{ 
                          backgroundColor: colorValue,
                          borderColor: selectedColor === color ? '#FF8C00' : '#ddd'
                        }}
                        title={color}
                      >
                      </button>
                    );
                  })}
              </div>
            </div>
          )}

          <div className="product-quantity">
            <label>Quantity:</label>
            <div className="quantity-controls">
              <button onClick={() => setQuantity(Math.max(1, quantity - 1))}>-</button>
              <span>{quantity}</span>
              <button onClick={() => setQuantity(quantity + 1)}>+</button>
            </div>
          </div>

          {/* Offers Section */}
          {visibleOffers.length > 0 && (
            <div className="offers-section-product">
              <h3>🎉 Special Offers</h3>
              <div className="offers-container-product">
                {visibleOffers.map((offer, index) => {
                  const isApplied = appliedCoupon && appliedCoupon.code.toUpperCase() === offer.code.toUpperCase();
                  return (
                    <div
                      key={offer._id}
                      className={`offer-card-product ${isApplied ? 'applied' : ''}`}
                      style={{ background: getOfferColor(index) }}
                    >
                      <div className="offer-content-product">
                        <div className="offer-code-product">{offer.code}</div>
                        <div className="offer-discount-product">
                          {offer.discountType === 'percentage' ? (
                            <span>{offer.discount}% OFF</span>
                          ) : (
                            <span>₹{offer.discount} OFF</span>
                          )}
                        </div>
                        {offer.description && (
                          <div className="offer-description-product">{offer.description}</div>
                        )}
                      <button
                        className={`offer-apply-btn-product ${isApplied ? 'applied' : ''}`}
                        onClick={() => handleApplyOffer(offer)}
                      >
                        {isApplied ? 'Remove' : 'Apply'}
                      </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <button
            onClick={handleAddToCart}
            className="add-to-cart-btn"
            disabled={(() => {
              // Check stock based on selected size if sizes exist
              if (product.sizes && product.sizes.length > 0 && selectedSize) {
                const selectedSizeObj = product.sizes.find(s => {
                  const size = typeof s === 'string' ? s : s.size;
                  return size === selectedSize;
                });
                
                if (selectedSizeObj && typeof selectedSizeObj === 'object') {
                  return selectedSizeObj.stock === 0;
                }
              }
              // If no sizes or size stock info, allow adding to cart
              return false;
            })()}
          >
            Add to Cart
          </button>
        </div>
      </div>

      <Reviews productId={id} />
      
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

export default ProductDetail;


