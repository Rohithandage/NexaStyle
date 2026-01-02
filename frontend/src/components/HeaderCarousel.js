import React, { useState, useEffect } from 'react';
import { FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import { getOptimizedImageUrl } from '../utils/config';
import './HeaderCarousel.css';

const HeaderCarousel = ({ images }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showCarousel, setShowCarousel] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  // Mark component as mounted immediately to reserve space
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Defer carousel loading until after first paint
  useEffect(() => {
    if (images && images.length > 1 && isMounted) {
      // Use requestIdleCallback if available, otherwise setTimeout
      const loadCarousel = () => {
        setShowCarousel(true);
      };

      if (typeof window !== 'undefined' && window.requestIdleCallback) {
        const id = window.requestIdleCallback(loadCarousel, { timeout: 2000 });
        return () => window.cancelIdleCallback(id);
      } else {
        // Fallback for browsers without requestIdleCallback
        const timer = setTimeout(loadCarousel, 100);
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

  // Helper function to extract image URL from string or object
  const getImageUrl = (item) => {
    if (!item) return '';
    if (typeof item === 'string') return item;
    return item.imageUrl || item.url || '';
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

  return (
    <div className="header-carousel">
      {/* STEP 1: Render first image immediately as normal img - NOT in carousel */}
      {/* Hide when carousel is active (only for multiple images) */}
      <div className={`hero-wrapper ${showCarousel && hasMultipleImages ? 'hero-hidden' : ''}`}>
        <img
          src={getOptimizedImageUrl(firstImage, 1200)}
          srcSet={`
            ${getOptimizedImageUrl(firstImage, 768)} 768w,
            ${getOptimizedImageUrl(firstImage, 1024)} 1024w,
            ${getOptimizedImageUrl(firstImage, 1200)} 1200w
          `}
          sizes="(max-width: 768px) 100vw, (max-width: 1024px) 100vw, 1200px"
          alt="NexaStyle Hero"
          className="hero-image"
          loading="eager"
          fetchPriority="high"
          decoding="async"
          width="1200"
          height="675"
        />
      </div>

      {/* STEP 2: Load carousel AFTER first paint (non-blocking) */}
      {showCarousel && hasMultipleImages && (
        <div className="carousel-container">
          <button className="carousel-button carousel-button-left" onClick={goToPrevious}>
            <FiChevronLeft />
          </button>
          
          <div className="carousel-slide">
            <img 
              src={getOptimizedImageUrl(getImageUrl(images[currentIndex]), 1200)} 
              srcSet={`
                ${getOptimizedImageUrl(getImageUrl(images[currentIndex]), 768)} 768w,
                ${getOptimizedImageUrl(getImageUrl(images[currentIndex]), 1024)} 1024w,
                ${getOptimizedImageUrl(getImageUrl(images[currentIndex]), 1200)} 1200w
              `}
              sizes="(max-width: 768px) 100vw, (max-width: 1024px) 100vw, 1200px"
              alt={images[currentIndex]?.name || `Header ${currentIndex + 1}`}
              className="carousel-image"
              loading="lazy"
              decoding="async"
              width="1200"
              height="675"
            />
          </div>

          <button className="carousel-button carousel-button-right" onClick={goToNext}>
            <FiChevronRight />
          </button>

          <div className="carousel-dots">
            {images.map((_, index) => (
              <button
                key={index}
                className={`carousel-dot ${index === currentIndex ? 'active' : ''}`}
                onClick={() => goToSlide(index)}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default HeaderCarousel;

