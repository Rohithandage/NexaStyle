import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import { getOptimizedImageUrl } from '../utils/config';
import './HeaderCarousel.css';

const HeaderCarousel = ({ images }) => {
  const navigate = useNavigate();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showCarousel, setShowCarousel] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  // Helper function to extract image URL from string or object
  const getImageUrl = (item) => {
    if (!item) {
      console.warn('HeaderCarousel: getImageUrl called with null/undefined item');
      return '';
    }
    if (typeof item === 'string') return item;
    const url = item.imageUrl || item.url || '';
    if (!url) {
      console.warn('HeaderCarousel: No imageUrl found in item:', item);
    }
    return url;
  };

  // Debug: Log images prop
  useEffect(() => {
    console.log('HeaderCarousel received images:', images);
    console.log('Images length:', images?.length);
    if (images && images.length > 0) {
      console.log('First image object:', images[0]);
      console.log('First image buttonText:', images[0]?.buttonText);
      const firstUrl = getImageUrl(images[0]);
      console.log('First image URL:', firstUrl);
      if (!firstUrl) {
        console.error('ERROR: First image has no valid URL!');
      }
      // Log all images' buttonText
      images.forEach((img, idx) => {
        console.log(`Image ${idx} buttonText:`, img?.buttonText || 'Not set');
      });
    } else {
      console.warn('HeaderCarousel: No images received or empty array');
    }
  }, [images]);


  // Mark component as mounted immediately to reserve space
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Defer carousel loading until after first paint
  useEffect(() => {
    // Reset showCarousel when images change
    setShowCarousel(false);
    
    if (images && images.length > 1 && isMounted) {
      // Use requestIdleCallback if available, otherwise setTimeout
      const loadCarousel = () => {
        console.log('Setting showCarousel to true for', images.length, 'images');
        setShowCarousel(true);
      };

      // Use a shorter timeout to ensure carousel loads quickly
      if (typeof window !== 'undefined' && window.requestIdleCallback) {
        const id = window.requestIdleCallback(loadCarousel, { timeout: 100 });
        return () => window.cancelIdleCallback(id);
      } else {
        // Fallback for browsers without requestIdleCallback - very short delay
        const timer = setTimeout(loadCarousel, 10);
        return () => clearTimeout(timer);
      }
    } else {
      // Single image, no carousel needed
      setShowCarousel(false);
    }
  }, [images, isMounted]);

  // Carousel auto-advance (only when carousel is shown)
  useEffect(() => {
    if (showCarousel && images && images.length > 1) {
      const interval = setInterval(() => {
        setCurrentIndex((prevIndex) => (prevIndex + 1) % images.length);
      }, 5000); // Change image every 5 seconds

      return () => clearInterval(interval);
    }
  }, [showCarousel, images]);

  const goToPrevious = () => {
    setCurrentIndex((prevIndex) => 
      prevIndex === 0 ? images.length - 1 : prevIndex - 1
    );
  };

  const goToNext = () => {
    setCurrentIndex((prevIndex) => 
      (prevIndex + 1) % images.length
    );
  };

  const goToSlide = (index) => {
    setCurrentIndex(index);
  };

  // Check if item has products
  const hasProducts = (item) => {
    if (!item || !item.productIds) return false;
    const ids = Array.isArray(item.productIds) ? item.productIds : [];
    if (ids.length === 0) return false;
    // Handle both cases: array of strings (IDs) or array of objects with _id
    if (ids.length > 0 && typeof ids[0] === 'object' && ids[0]._id) {
      return ids.length > 0;
    }
    return ids.length > 0;
  };

  // Get product IDs from item
  const getProductIds = (item) => {
    if (!item || !item.productIds) return [];
    let productIds = item.productIds || [];
    
    // If productIds is an array of objects, extract _id
    if (productIds.length > 0 && typeof productIds[0] === 'object' && productIds[0]._id) {
      productIds = productIds.map(p => p._id || p);
    }
    
    // Convert all to strings
    return productIds.map(id => id.toString()).filter(id => id);
  };

  // Handle carousel image click
  const handleImageClick = (item) => {
    if (!item) return;
    
    const productIds = getProductIds(item);
    
    if (productIds.length > 0) {
      // Navigate to products page with product IDs filter and carousel name
      const productIdsParam = productIds.join(',');
      const carouselName = item.name || 'Featured Products';
      // Encode the name to handle special characters
      const encodedName = encodeURIComponent(carouselName);
      navigate(`/products?carousel=${productIdsParam}&name=${encodedName}`);
    }
  };

  // Always render container to reserve space, even when no images
  // This prevents layout shift when images load
  if (!images || images.length === 0) {
    return (
      <div className="header-carousel">
        <div className="hero-wrapper">
          {/* Reserve space with placeholder */}
        </div>
      </div>
    );
  }

  const firstImage = getImageUrl(images[0]);
  const hasMultipleImages = images.length > 1;
  
  // Debug: Log rendering info
  console.log('HeaderCarousel rendering:', {
    imagesCount: images.length,
    hasMultipleImages,
    showCarousel,
    firstImageUrl: firstImage,
    isMounted
  });

  return (
    <div className="header-carousel">
      {/* STEP 1: Render first image immediately as normal img - NOT in carousel */}
      {/* Hide when carousel is active (only for multiple images) */}
      <div 
        className={`hero-wrapper ${showCarousel && hasMultipleImages ? 'hero-hidden' : ''} ${hasProducts(images[0]) ? 'clickable-wrapper' : ''}`}
        style={{ position: 'relative', zIndex: showCarousel && hasMultipleImages ? 1 : 2 }}
        onClick={() => hasProducts(images[0]) && handleImageClick(images[0])}
      >
        <img
          src={getOptimizedImageUrl(firstImage, 1200)}
          srcSet={`
            ${getOptimizedImageUrl(firstImage, 768)} 768w,
            ${getOptimizedImageUrl(firstImage, 1024)} 1024w,
            ${getOptimizedImageUrl(firstImage, 1200)} 1200w
          `}
          sizes="(max-width: 768px) 100vw, (max-width: 1024px) 100vw, 1200px"
          alt={images[0]?.name || "NexaStyle Hero"}
          className={`hero-image ${!hasProducts(images[0]) ? 'no-click' : 'clickable'}`}
          loading="eager"
          fetchpriority="high"
          decoding="async"
          width="1200"
          height="675"
          onError={(e) => {
            console.error('Failed to load hero image:', firstImage);
            // Don't hide the image - show a placeholder instead
            e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="1200" height="675"%3E%3Crect width="100%25" height="100%25" fill="%23f0f0f0"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%23999"%3EImage not found%3C/text%3E%3C/svg%3E';
          }}
        />
        {hasProducts(images[0]) && (
          <div className="carousel-cta-overlay">
            <button 
              className="carousel-cta-button"
              onClick={(e) => {
                e.stopPropagation();
                handleImageClick(images[0]);
              }}
            >
              {(images[0] && images[0].buttonText) ? images[0].buttonText : 'Shop Now'}
            </button>
          </div>
        )}
      </div>

      {/* STEP 2: Load carousel AFTER first paint (non-blocking) */}
      {hasMultipleImages && (
        <div 
          className={`carousel-container ${showCarousel ? 'carousel-visible' : 'carousel-hidden'}`}
          style={{
            opacity: showCarousel ? 1 : 0,
            visibility: showCarousel ? 'visible' : 'hidden',
            pointerEvents: showCarousel ? 'auto' : 'none',
            zIndex: showCarousel ? 10 : 1,
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%'
          }}
        >
          {console.log('Carousel container rendering:', { showCarousel, hasMultipleImages, currentIndex })}
          <button 
            className="carousel-button carousel-button-left" 
            onClick={(e) => {
              e.stopPropagation();
              goToPrevious();
            }}
            disabled={!showCarousel}
            aria-label="Previous image"
          >
            <FiChevronLeft />
          </button>
          
          <div 
            className={`carousel-slide ${hasProducts(images[currentIndex]) ? 'clickable-wrapper' : ''}`}
            onClick={() => hasProducts(images[currentIndex]) && handleImageClick(images[currentIndex])}
          >
            {images[currentIndex] && (
              <>
                <img 
                  src={getOptimizedImageUrl(getImageUrl(images[currentIndex]), 1200)} 
                  srcSet={`
                    ${getOptimizedImageUrl(getImageUrl(images[currentIndex]), 768)} 768w,
                    ${getOptimizedImageUrl(getImageUrl(images[currentIndex]), 1024)} 1024w,
                    ${getOptimizedImageUrl(getImageUrl(images[currentIndex]), 1200)} 1200w
                  `}
                  sizes="(max-width: 768px) 100vw, (max-width: 1024px) 100vw, 1200px"
                  alt={images[currentIndex]?.name || `Header ${currentIndex + 1}`}
                  className={`carousel-image ${!hasProducts(images[currentIndex]) ? 'no-click' : 'clickable'}`}
                  loading="eager"
                  decoding="async"
                  width="1200"
                  height="675"
                  onLoad={() => {
                    console.log('Carousel image loaded successfully:', getImageUrl(images[currentIndex]));
                  }}
                  onError={(e) => {
                    const imageUrl = getImageUrl(images[currentIndex]);
                    console.error('Failed to load carousel image:', imageUrl);
                    // Show placeholder instead of hiding
                    e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="1200" height="675"%3E%3Crect width="100%25" height="100%25" fill="%23f0f0f0"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%23999"%3EImage not found%3C/text%3E%3C/svg%3E';
                    // Skip to next image if current one fails to load (only if multiple images)
                    if (images.length > 1) {
                      setTimeout(() => {
                        setCurrentIndex((prevIndex) => (prevIndex + 1) % images.length);
                      }, 2000);
                    }
                  }}
                />
                {hasProducts(images[currentIndex]) && (
                  <div className="carousel-cta-overlay">
                    <button 
                      className="carousel-cta-button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleImageClick(images[currentIndex]);
                      }}
                    >
                      {(() => {
                        const currentItem = images[currentIndex];
                        const buttonText = currentItem?.buttonText || 'Shop Now';
                        console.log(`Carousel button for index ${currentIndex}:`, {
                          name: currentItem?.name,
                          buttonText: buttonText,
                          hasButtonText: !!currentItem?.buttonText
                        });
                        return buttonText;
                      })()}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>

          <button 
            className="carousel-button carousel-button-right" 
            onClick={(e) => {
              e.stopPropagation();
              goToNext();
            }}
            disabled={!showCarousel}
            aria-label="Next image"
          >
            <FiChevronRight />
          </button>

          <div className="carousel-dots">
            {images.map((_, index) => (
              <button
                key={index}
                className={`carousel-dot ${index === currentIndex ? 'active' : ''}`}
                onClick={(e) => {
                  e.stopPropagation();
                  goToSlide(index);
                }}
                aria-label={`Go to slide ${index + 1}`}
                disabled={!showCarousel}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default HeaderCarousel;

