import React, { useState, useEffect } from 'react';
import { FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import { getOptimizedImageUrl } from '../utils/config';
import './HeaderCarousel.css';

const HeaderCarousel = ({ images }) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (images && images.length > 1) {
      const interval = setInterval(() => {
        setCurrentIndex((prevIndex) => (prevIndex + 1) % images.length);
      }, 5000); // Change image every 5 seconds

      return () => clearInterval(interval);
    }
  }, [images]);

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

  if (!images || images.length === 0) {
    return null;
  }

  return (
    <div className="header-carousel">
      <div className="carousel-container">
        {images.length > 1 && (
          <button className="carousel-button carousel-button-left" onClick={goToPrevious}>
            <FiChevronLeft />
          </button>
        )}
        
        <div className="carousel-slide">
          <img 
            src={getOptimizedImageUrl(images[currentIndex], 'hero')} 
            alt={`Header ${currentIndex + 1}`}
            className="carousel-image"
            loading="eager"
            fetchPriority="high"
          />
        </div>

        {images.length > 1 && (
          <button className="carousel-button carousel-button-right" onClick={goToNext}>
            <FiChevronRight />
          </button>
        )}

        {images.length > 1 && (
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
        )}
      </div>
    </div>
  );
};

export default HeaderCarousel;

