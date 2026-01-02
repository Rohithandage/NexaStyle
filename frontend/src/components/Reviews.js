import React, { useEffect, useState } from 'react';
import api from '../api/api';
import { useAuth } from '../hooks/useAuth';
import { toast } from 'react-toastify';
import './Reviews.css';

const Reviews = ({ productId }) => {
  const { isAuthenticated, user } = useAuth();
  const [reviews, setReviews] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [showAllReviews, setShowAllReviews] = useState(false);

  useEffect(() => {
    fetchReviews();
    setShowAllReviews(false); // Reset to show only top 2 when product changes
  }, [productId]);

  const fetchReviews = async () => {
    try {
      const res = await api.get(`/api/reviews/product/${productId}`);
      setReviews(res.data);
    } catch (error) {
      console.error('Error fetching reviews:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isAuthenticated) {
      toast.info('Please login to submit a review');
      return;
    }

    if (!rating || !comment.trim()) {
      toast.error('Please provide both rating and comment');
      return;
    }

    try {
      const response = await api.post(
        '/api/reviews',
        { productId, rating, comment: comment.trim() },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        }
      );
      
      // Add the new review to the list immediately
      const newReview = response.data;
      if (newReview.user) {
        setReviews(prevReviews => [newReview, ...prevReviews]);
      }
      
      toast.success('Review submitted successfully!');
      setShowForm(false);
      setComment('');
      setRating(5);
      
      // Also fetch reviews to ensure we have the latest data
      fetchReviews();
    } catch (error) {
      console.error('Error submitting review:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Error submitting review';
      toast.error(errorMessage);
    }
  };

  return (
    <div className="reviews-section">
      <h2>Customer Reviews</h2>
      
      {isAuthenticated && !showForm && (
        <button onClick={() => setShowForm(true)} className="add-review-btn">
          Write a Review
        </button>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} className="review-form">
          <div className="rating-input">
            <label>Rating:</label>
            <div className="stars">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  className={star <= rating ? 'active' : ''}
                >
                  ⭐
                </button>
              ))}
            </div>
          </div>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Write your review..."
            required
            rows="4"
          />
          <div className="review-form-actions">
            <button type="submit">Submit Review</button>
            <button type="button" onClick={() => setShowForm(false)}>
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="reviews-list">
        {reviews.length === 0 ? (
          <p>No reviews yet. Be the first to review!</p>
        ) : (
          <>
            {(() => {
              // Sort reviews by rating (highest first), then by date (newest first)
              const sortedReviews = [...reviews].sort((a, b) => {
                if (b.rating !== a.rating) {
                  return b.rating - a.rating; // Higher rating first
                }
                return new Date(b.createdAt) - new Date(a.createdAt); // Newer first if same rating
              });

              // Show only top 2 reviews initially, or all if showAllReviews is true
              const reviewsToShow = showAllReviews ? sortedReviews : sortedReviews.slice(0, 2);
              const hasMoreReviews = sortedReviews.length > 2;

              return (
                <>
                  {reviewsToShow.map((review) => (
                    <div key={review._id} className="review-item">
                      <div className="review-header">
                        <div className="reviewer-info">
                          {review.user?.avatar ? (
                            <img 
                              src={review.user.avatar} 
                              alt={review.user.name}
                              width="40"
                              height="40"
                              style={{
                                width: "40px",
                                height: "40px",
                                borderRadius: "50%",
                                objectFit: "cover"
                              }}
                              loading="lazy"
                              decoding="async"
                            />
                          ) : (
                            <div className="avatar-placeholder">
                              {review.user?.name?.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <span>{review.user?.name || 'Anonymous'}</span>
                        </div>
                        <div className="review-rating">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <span key={star} className={star <= review.rating ? 'star-filled' : 'star-empty'}>
                              ⭐
                            </span>
                          ))}
                        </div>
                      </div>
                      <p className="review-comment">{review.comment}</p>
                      <span className="review-date">
                        {new Date(review.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  ))}
                  
                  {!showAllReviews && hasMoreReviews && (
                    <button 
                      onClick={() => setShowAllReviews(true)} 
                      className="view-more-reviews-btn"
                    >
                      View More Reviews ({sortedReviews.length - 2} more)
                    </button>
                  )}
                  
                  {showAllReviews && hasMoreReviews && (
                    <button 
                      onClick={() => setShowAllReviews(false)} 
                      className="view-less-reviews-btn"
                    >
                      Show Less
                    </button>
                  )}
                </>
              );
            })()}
          </>
        )}
      </div>
    </div>
  );
};

export default Reviews;


