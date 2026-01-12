import React, { useEffect, useState, useMemo } from 'react';
import api from '../api/api';
import { toast } from 'react-toastify';
import { getImageUrl, getBackendUrl } from '../utils/config';
import { getCurrencyForCountry, formatPrice, getCurrencySymbol } from '../utils/currency';
import './AdminDashboard.css';

const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [categories, setCategories] = useState([]);
  const [orders, setOrders] = useState([]);
  const [pendingReviews, setPendingReviews] = useState([]);
  const [allReviews, setAllReviews] = useState([]);
  const [reviewsEnabled, setReviewsEnabled] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [newSubcategory, setNewSubcategory] = useState({ categoryId: '', name: '', colors: '' });
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [colorSearchTerm, setColorSearchTerm] = useState('');
  const [editingSubcategoryColors, setEditingSubcategoryColors] = useState(null); // { categoryId, subcategoryId, colors }
  const [expandedCategories, setExpandedCategories] = useState({}); // Track which categories are expanded
  const [uploadedImages, setUploadedImages] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [products, setProducts] = useState([]);
  const [showProductForm, setShowProductForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [headerImages, setHeaderImages] = useState([]);
  const [carouselItems, setCarouselItems] = useState([]);
  const [editingCarouselItem, setEditingCarouselItem] = useState(null);
  const [showCarouselItemForm, setShowCarouselItemForm] = useState(false);
  const [selectedProductsForCarousel, setSelectedProductsForCarousel] = useState([]);
  const [selectedCountriesForCarouselItem, setSelectedCountriesForCarouselItem] = useState([]);
  const [logo, setLogo] = useState(null);
  const [productForm, setProductForm] = useState({
    name: '',
    description: '',
    price: '',
    discountPrice: '',
    category: '',
    subcategory: '',
    images: [],
    sizes: [],
    colors: [],
    getPrintName: '',
    isTrending: false,
    pricingByCountry: [],
    alsoInCategories: []
  });
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [selectedOrderAddress, setSelectedOrderAddress] = useState(null);
  const [notes, setNotes] = useState('');
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [originalNotes, setOriginalNotes] = useState('');
  const [codCharges, setCodCharges] = useState(0);
  const [isEditingCodCharges, setIsEditingCodCharges] = useState(false);
  const [originalCodCharges, setOriginalCodCharges] = useState(0);
  const [allProducts, setAllProducts] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedSubcategory, setSelectedSubcategory] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [offers, setOffers] = useState([]);
  const [showOfferForm, setShowOfferForm] = useState(false);
  const [editingOffer, setEditingOffer] = useState(null);
  const [countryCurrencies, setCountryCurrencies] = useState([]);
  const [showCountryCurrencyForm, setShowCountryCurrencyForm] = useState(false);
  const [editingCountryCurrency, setEditingCountryCurrency] = useState(null);
  const [countryCurrencyForm, setCountryCurrencyForm] = useState({
    country: '',
    countryCode: '',
    currency: '',
    currencySymbol: '',
    isActive: true,
    order: 0
  });
  const [offerForm, setOfferForm] = useState({
    code: '',
    offerType: 'coupon',
    discount: '',
    discountType: 'percentage',
    description: '',
    couponDisplayText: '',
    isActive: true,
    showOnHomePage: true,
    // Bundle offer fields
    category: '',
    subcategories: [],
    products: [],
    bundlePrice: '',
    bundleQuantity: '',
    bundleDisplayText: '',
    // Carousel offer fields
    carouselId: '',
    carouselDisplayText: '',
    // Country-specific pricing
    pricingByCountry: [],
    discountByCountry: []
  });
  const [selectedCategoryForOffer, setSelectedCategoryForOffer] = useState('');
  const [selectedSubcategoriesForOffer, setSelectedSubcategoriesForOffer] = useState([]);
  const [selectedProductsForOffer, setSelectedProductsForOffer] = useState([]);

  useEffect(() => {
    fetchDashboardData();
    fetchCategories();
    fetchOrders();
    fetchPendingReviews();
    if (activeTab === 'reviews') {
      fetchAllReviews();
      fetchReviewsEnabled();
    }
    if (activeTab === 'images') {
      fetchImages();
      fetchProducts(); // Fetch products to filter out product images
      fetchHeaderImages();
      fetchCarouselItems();
      fetchLogo();
      fetchCountryCurrencies(); // Fetch country currencies for carousel country selection
    }
    if (activeTab === 'products') {
      fetchProducts();
      fetchImages();
      fetchCategories(); // Refresh categories to get latest subcategory colors
      fetchCountryCurrencies(); // Fetch country currencies for product pricing
    }
    if (activeTab === 'trending') {
      fetchProducts();
    }
    if (activeTab === 'notes') {
      fetchNotes();
    }
    if (activeTab === 'cod') {
      fetchCodCharges();
    }
    if (activeTab === 'allProducts') {
      fetchAllProducts();
      fetchCategories();
    }
    if (activeTab === 'offers') {
      fetchOffers();
      fetchAllProducts();
      fetchCategories();
      fetchCountryCurrencies(); // Fetch country currencies for offer pricing
    }
    if (activeTab === 'country-currency') {
      fetchCountryCurrencies();
    }
  }, [activeTab]);

  // Auto-refresh dashboard data every 30 seconds when on dashboard tab
  useEffect(() => {
    if (activeTab === 'dashboard') {
      const interval = setInterval(() => {
        fetchDashboardData();
      }, 30000); // Refresh every 30 seconds

      return () => clearInterval(interval);
    }
  }, [activeTab]);

  // Fetch products and categories when offer form is opened
  useEffect(() => {
    if (showOfferForm && (offerForm.offerType === 'bundle' || offerForm.offerType === 'carousel')) {
      if (allProducts.length === 0) {
        fetchAllProducts();
      }
      if (categories.length === 0) {
        fetchCategories();
      }
      if (offerForm.offerType === 'carousel' && carouselItems.length === 0) {
        fetchCarouselItems();
      }
    }
  }, [showOfferForm, offerForm.offerType]);

  // Fetch products and country currencies when carousel item form is opened
  useEffect(() => {
    if (showCarouselItemForm) {
      if (allProducts.length === 0) {
        fetchAllProducts();
      }
      // Fetch country currencies for country selection
      if (countryCurrencies.length === 0) {
        fetchCountryCurrencies();
      }
    }
  }, [showCarouselItemForm]);

  // Auto-select products when subcategories change or products are loaded
  useEffect(() => {
    if (showOfferForm && offerForm.offerType === 'bundle' && selectedSubcategoriesForOffer.length > 0 && allProducts.length > 0) {
      // Filter products from any category that match the selected subcategories
      const productsFromSubcategories = allProducts.filter(p => {
        return selectedSubcategoriesForOffer.includes(p.subcategory);
      });
      const productIds = productsFromSubcategories.map(p => p._id);
      // Only update if the selection has changed (avoid infinite loop)
      const currentIds = selectedProductsForOffer.map(id => id.toString()).sort();
      const newIds = productIds.map(id => id.toString()).sort();
      if (JSON.stringify(currentIds) !== JSON.stringify(newIds)) {
        setSelectedProductsForOffer(productIds);
      }
    } else if (showOfferForm && offerForm.offerType === 'bundle' && selectedSubcategoriesForOffer.length === 0) {
      // Clear products if no subcategories selected
      setSelectedProductsForOffer([]);
    }
  }, [selectedSubcategoriesForOffer, allProducts.length]);

  // Auto-populate products when carousel is selected
  useEffect(() => {
    if (showOfferForm && offerForm.offerType === 'carousel' && offerForm.carouselId && carouselItems.length > 0) {
      const selectedCarousel = carouselItems.find(item => item._id === offerForm.carouselId);
      if (selectedCarousel && selectedCarousel.productIds) {
        // Extract product IDs from carousel item
        let productIds = selectedCarousel.productIds || [];
        if (productIds.length > 0 && typeof productIds[0] === 'object' && productIds[0]._id) {
          productIds = productIds.map(p => p._id || p);
        }
        // Convert to strings for comparison
        const productIdStrings = productIds.map(id => id.toString());
        setSelectedProductsForOffer(productIdStrings);
      } else {
        setSelectedProductsForOffer([]);
      }
    } else if (showOfferForm && offerForm.offerType === 'carousel' && !offerForm.carouselId) {
      setSelectedProductsForOffer([]);
    }
  }, [showOfferForm, offerForm.offerType, offerForm.carouselId, carouselItems]);
  
  // Refresh categories when product form opens
  useEffect(() => {
    if (showProductForm) {
      fetchCategories();
    }
  }, [showProductForm]);

  const fetchHeaderImages = async () => {
    try {
      const res = await api.get('/api/admin/settings/header-images', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      setHeaderImages(res.data.headerImages || []);
    } catch (error) {
      console.error('Error fetching header images:', error);
    }
  };

  const fetchCarouselItems = async () => {
    try {
      const res = await api.get('/api/admin/carousel-items/all', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      const items = res.data.carouselItems || [];
      console.log('Fetched carousel items for offer:', items.length, items);
      setCarouselItems(items);
    } catch (error) {
      console.error('Error fetching carousel items:', error);
      toast.error('Error loading carousel items');
    }
  };

  const fetchLogo = async () => {
    try {
      const res = await api.get('/api/admin/settings/logo', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      setLogo(res.data.logo || null);
    } catch (error) {
      console.error('Error fetching logo:', error);
    }
  };

  const handleSetLogo = async (imageUrl) => {
    try {
      await api.post(
        '/api/admin/settings/logo',
        { logoUrl: imageUrl },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          }
        }
      );
      toast.success('Logo updated successfully!');
      fetchLogo();
    } catch (error) {
      console.error('Error setting logo:', error);
      const errorMessage = error.response?.data?.message || 'Error setting logo';
      toast.error(errorMessage);
    }
  };

  const handleRemoveLogo = async () => {
    try {
      await api.delete('/api/admin/settings/logo', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      toast.success('Logo removed successfully!');
      setLogo(null);
    } catch (error) {
      console.error('Error removing logo:', error);
      const errorMessage = error.response?.data?.message || 'Error removing logo';
      toast.error(errorMessage);
    }
  };

  // Validate carousel image dimensions (16:9 aspect ratio, ideally 1920x1080)
  const validateCarouselImage = (imageUrl) => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      
      // Try with CORS first, fallback without if needed
      img.crossOrigin = 'anonymous';
      
      img.onload = () => {
        const width = img.naturalWidth;
        const height = img.naturalHeight;
        
        // If dimensions are 0, image might not have loaded properly
        if (width === 0 || height === 0) {
          reject({ message: 'Could not determine image dimensions. Please ensure the image is accessible.' });
          return;
        }
        
        const aspectRatio = width / height;
        const targetAspectRatio = 16 / 9; // 1.777...
        const aspectRatioTolerance = 0.05; // Allow 5% tolerance (1.69 to 1.87)
        
        // Check aspect ratio (must be close to 16:9)
        if (Math.abs(aspectRatio - targetAspectRatio) > aspectRatioTolerance) {
          const currentRatio = `${Math.round(width / aspectRatio)}:${Math.round(height / aspectRatio)}`;
          reject({
            message: `❌ Image aspect ratio must be 16:9. Current: ${width}×${height}px (${currentRatio})`,
            width,
            height,
            aspectRatio
          });
          return;
        }
        
        // Check minimum size (should be at least 1200x675)
        if (width < 1200 || height < 675) {
          reject({
            message: `❌ Image too small. Minimum: 1200×675px. Current: ${width}×${height}px`,
            width,
            height
          });
          return;
        }
        
        // Warn if not optimal size (1920x1080 recommended)
        if (width !== 1920 || height !== 1080) {
          toast.warning(`ℹ️ Recommended size: 1920×1080px. Current: ${width}×${height}px`, {
            autoClose: 5000
          });
        } else {
          toast.success(`✅ Perfect size! 1920×1080px (16:9)`, {
            autoClose: 3000
          });
        }
        
        resolve({ width, height, aspectRatio });
      };
      
      img.onerror = (error) => {
        // If CORS fails, try without CORS
        if (img.crossOrigin === 'anonymous') {
          const img2 = new Image();
          img2.onload = img.onload;
          img2.onerror = () => {
            reject({ message: 'Failed to load image for validation. Please check the image URL is accessible.' });
          };
          img2.src = imageUrl;
        } else {
          reject({ message: 'Failed to load image for validation. Please check the image URL is accessible.' });
        }
      };
      
      img.src = imageUrl;
    });
  };

  const handleAddHeaderImage = async (imageUrl) => {
    try {
      const fullImageUrl = getImageUrl(imageUrl);
      
      // Validate image dimensions before adding
      try {
        await validateCarouselImage(fullImageUrl);
      } catch (validationError) {
        toast.error(validationError.message || 'Image validation failed');
        return;
      }
      
      await api.post(
        '/api/admin/settings/header-images',
        { imageUrl: fullImageUrl },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        }
      );
      toast.success('Image added to header carousel!');
      fetchHeaderImages();
    } catch (error) {
      if (error.message && error.message.includes('aspect ratio') || error.message && error.message.includes('too small')) {
        // Validation error already shown
        return;
      }
      toast.error('Error adding header image');
    }
  };

  const handleRemoveHeaderImage = async (imageUrl) => {
    try {
      // Normalize the URL to match what's stored in the database
      const normalizedUrl = getImageUrl(imageUrl);
      
      await api.delete(
        '/api/admin/settings/header-images',
        {
          data: { imageUrl: normalizedUrl },
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          }
        }
      );
      toast.success('Image removed from header carousel!');
      fetchHeaderImages();
    } catch (error) {
      console.error('Error removing header image:', error);
      const errorMessage = error.response?.data?.message || 'Error removing header image';
      toast.error(errorMessage);
    }
  };

  const handleCreateCarouselItem = async (imageUrl) => {
    try {
      const fullImageUrl = getImageUrl(imageUrl);
      
      // Validate image dimensions before adding
      try {
        await validateCarouselImage(fullImageUrl);
      } catch (validationError) {
        toast.error(validationError.message || 'Image validation failed');
        return;
      }
      
      setEditingCarouselItem(null);
      setSelectedProductsForCarousel([]);
      setSelectedCountriesForCarouselItem([]);
      setShowCarouselItemForm(true);
      // Store the image URL temporarily
      setEditingCarouselItem({ imageUrl: fullImageUrl, name: '', buttonText: 'Shop Now', productIds: [], countries: [] });
    } catch (error) {
      if (error.message && error.message.includes('aspect ratio') || error.message && error.message.includes('too small')) {
        return;
      }
      toast.error('Error preparing carousel item');
    }
  };

  const handleSaveCarouselItem = async () => {
    try {
      if (!editingCarouselItem || !editingCarouselItem.imageUrl) {
        toast.error('Image URL is required');
        return;
      }

      const carouselItemData = {
        imageUrl: editingCarouselItem.imageUrl,
        name: editingCarouselItem.name || 'Carousel Item',
        buttonText: editingCarouselItem.buttonText || 'Shop Now',
        productIds: selectedProductsForCarousel,
        order: editingCarouselItem.order || carouselItems.length,
        countries: selectedCountriesForCarouselItem
      };

      if (editingCarouselItem._id) {
        // Update existing
        await api.put(
          `/api/admin/carousel-items/${editingCarouselItem._id}`,
          carouselItemData,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem('token')}`
            }
          }
        );
        toast.success('Carousel item updated successfully!');
      } else {
        // Create new
        await api.post(
          '/api/admin/carousel-items',
          carouselItemData,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem('token')}`
            }
          }
        );
        toast.success('Carousel item created successfully!');
      }

      setShowCarouselItemForm(false);
      setEditingCarouselItem(null);
      setSelectedProductsForCarousel([]);
      fetchCarouselItems();
      fetchHeaderImages();
    } catch (error) {
      console.error('Error saving carousel item:', error);
      toast.error('Error saving carousel item');
    }
  };

  const handleEditCarouselItem = (item) => {
    setEditingCarouselItem({
      ...item,
      buttonText: item.buttonText || 'Shop Now' // Ensure buttonText is set
    });
    // Handle both cases: array of strings (IDs) or array of objects with _id
    let productIds = item.productIds || [];
    if (productIds.length > 0 && typeof productIds[0] === 'object' && productIds[0]._id) {
      productIds = productIds.map(p => p._id || p);
    }
    setSelectedProductsForCarousel(productIds);
    setSelectedCountriesForCarouselItem(Array.isArray(item.countries) ? item.countries : []);
    setShowCarouselItemForm(true);
  };

  const handleDeleteCarouselItem = async (itemId) => {
    if (!window.confirm('Are you sure you want to delete this carousel item?')) {
      return;
    }

    try {
      await api.delete(
        `/api/admin/carousel-items/${itemId}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        }
      );
      toast.success('Carousel item deleted successfully!');
      fetchCarouselItems();
      fetchHeaderImages();
    } catch (error) {
      console.error('Error deleting carousel item:', error);
      toast.error('Error deleting carousel item');
    }
  };

  const fetchDashboardData = async () => {
    try {
      const res = await api.get('/api/analytics/dashboard', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      console.log('Dashboard data received:', res.data); // Debug log
      console.log('Countries count:', res.data.countries?.length || 0);
      setStats(res.data);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      toast.error('Error loading dashboard data');
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await api.get('/api/admin/categories', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      setCategories(res.data);
    } catch (error) {
      toast.error('Error loading categories');
    }
  };

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

  // Get available colors list
  const getAvailableColors = () => {
    return [
      'Black', 'White', 'Olive Green', 'Navy Blue', 'Maroon', 'Golden Yellow', 
      'Royal Blue', 'Red', 'Lavender', 'Petrol Blue', 'Steel Blue', 'Beige', 
      'Sky Blue Light', 'Grey Melange', 'Light Yellow', 'Mustard Yellow', 
      'Pista', 'Purple', 'Coffee Brown', 'Flamingo', 'Orange', 'Slate Grey', 
      'Baby Pink', 'Charcoal Melange', 'Aqua Blue', 'Parrot Green', 'Peach',
      // Additional common colors
      'Blue', 'Green', 'Yellow', 'Gray', 'Grey', 'Pink', 'Brown', 'Teal', 'Cyan',
      'Lime', 'Magenta', 'Silver', 'Gold', 'Tan', 'Coral', 'Salmon', 'Turquoise', 
      'Violet', 'Indigo', 'Khaki', 'Plum', 'Crimson', 'Azure', 'Ivory', 'Cream', 
      'Charcoal', 'Mint', 'Rose', 'Amber', 'Emerald', 'Ruby', 'Sapphire', 'Bronze', 'Copper'
    ];
  };

  // Helper function to get contrast color for text
  const getContrastColor = (colorName) => {
    const colorValue = getColorValue(colorName);
    
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
    const normalized = colorName.toLowerCase();
    return darkColors.some(dc => normalized.includes(dc)) ? '#fff' : '#000';
  };

  const fetchOrders = async () => {
    try {
      const res = await api.get('/api/admin/orders', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      setOrders(res.data);
    } catch (error) {
      toast.error('Error loading orders');
    }
  };

  const fetchPendingReviews = async () => {
    try {
      const res = await api.get('/api/reviews/admin/pending', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      setPendingReviews(res.data);
    } catch (error) {
      console.error('Error loading reviews:', error);
    }
  };

  const fetchAllReviews = async () => {
    try {
      const res = await api.get('/api/reviews/admin/all', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      const reviews = res.data || [];
      // Ensure isDisabled field exists for all reviews
      const reviewsWithDefaults = reviews.map(review => ({
        ...review,
        isDisabled: review.isDisabled === true
      }));
      console.log('Fetched reviews:', reviewsWithDefaults);
      setAllReviews(reviewsWithDefaults);
    } catch (error) {
      console.error('Error loading all reviews:', error);
      toast.error('Error loading reviews');
      setAllReviews([]);
    }
  };

  const fetchReviewsEnabled = async () => {
    try {
      const res = await api.get('/api/admin/settings/reviews-enabled');
      setReviewsEnabled(res.data.reviewsEnabled !== false); // Default to true
    } catch (error) {
      console.error('Error loading reviews enabled setting:', error);
      setReviewsEnabled(true); // Default to enabled
    }
  };

  const handleToggleReviewsEnabled = async () => {
    try {
      const newValue = !reviewsEnabled;
      await api.post(
        '/api/admin/settings/reviews-enabled',
        { reviewsEnabled: newValue },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        }
      );
      setReviewsEnabled(newValue);
      toast.success(`Reviews ${newValue ? 'enabled' : 'disabled'} successfully`);
    } catch (error) {
      console.error('Error toggling reviews enabled:', error);
      toast.error('Error updating reviews setting');
    }
  };

  const handleAddSubcategory = async (e) => {
    e.preventDefault();
    try {
      const colors = newSubcategory.colors
        ? newSubcategory.colors.split(',').map(c => c.trim()).filter(c => c !== '')
        : [];
      
      await api.post(
        `/api/admin/categories/${newSubcategory.categoryId}/subcategories`,
        { 
          name: newSubcategory.name,
          colors: colors
        },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        }
      );
      toast.success('Subcategory added successfully');
      setNewSubcategory({ categoryId: '', name: '', colors: '' });
      fetchCategories();
    } catch (error) {
      toast.error('Error adding subcategory');
    }
  };

  const handleUpdateSubcategory = async (categoryId, subcategoryId, updates) => {
    try {
      await api.put(
        `/api/admin/categories/${categoryId}/subcategories/${subcategoryId}`,
        updates,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        }
      );
      toast.success('Subcategory updated');
      fetchCategories();
    } catch (error) {
      toast.error('Error updating subcategory');
    }
  };

  const handleToggleCategory = async (categoryId, currentStatus) => {
    try {
      await api.put(
        `/api/admin/categories/${categoryId}`,
        { isActive: !currentStatus },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        }
      );
      toast.success(`Category ${!currentStatus ? 'enabled' : 'disabled'} successfully`);
      fetchCategories();
    } catch (error) {
      toast.error('Error updating category status');
    }
  };

  const handleDeleteSubcategory = async (categoryId, subcategoryId) => {
    if (!window.confirm('Are you sure you want to delete this subcategory?')) return;
    try {
      await api.delete(
        `/api/admin/categories/${categoryId}/subcategories/${subcategoryId}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        }
      );
      toast.success('Subcategory deleted');
      fetchCategories();
    } catch (error) {
      toast.error('Error deleting subcategory');
    }
  };

  const handleUpdateOrderStatus = async (orderId, status) => {
    try {
      await api.put(
        `/api/admin/orders/${orderId}/status`,
        { orderStatus: status },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        }
      );
      toast.success('Order status updated');
      fetchOrders();
    } catch (error) {
      toast.error('Error updating order status');
    }
  };

  const handleApproveReview = async (reviewId) => {
    try {
      await api.put(
        `/api/reviews/approve/${reviewId}`,
        {},
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        }
      );
      toast.success('Review approved');
      fetchPendingReviews();
      fetchAllReviews();
    } catch (error) {
      toast.error('Error approving review');
    }
  };

  const handleToggleReview = async (reviewId) => {
    try {
      await api.put(
        `/api/reviews/toggle/${reviewId}`,
        {},
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        }
      );
      toast.success('Review status updated');
      fetchAllReviews();
      fetchPendingReviews();
    } catch (error) {
      toast.error('Error updating review');
    }
  };

  const handleAddDemoReviews = async () => {
    if (!window.confirm('This will add 3-5 demo reviews to all active products. Each review will have a different user name and comment. Continue?')) {
      return;
    }

    try {
      const res = await api.post(
        '/api/admin/reviews/add-demo',
        {},
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        }
      );
      toast.success(res.data.message || `Successfully added ${res.data.totalReviewsCreated} demo reviews!`);
      fetchAllReviews();
      fetchPendingReviews();
    } catch (error) {
      console.error('Error adding demo reviews:', error);
      toast.error(error.response?.data?.message || 'Error adding demo reviews');
    }
  };

  const handleDeleteReview = async (reviewId) => {
    if (!window.confirm('Are you sure you want to delete this review? This action cannot be undone.')) {
      return;
    }

    try {
      await api.delete(
        `/api/reviews/${reviewId}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        }
      );
      toast.success('Review deleted successfully');
      fetchAllReviews();
      fetchPendingReviews();
    } catch (error) {
      console.error('Error deleting review:', error);
      toast.error(error.response?.data?.message || 'Error deleting review');
    }
  };

  const handleDeleteAllDemoReviews = async () => {
    if (!window.confirm('Are you sure you want to delete ALL demo reviews? This will remove all reviews from demo users. This action cannot be undone.')) {
      return;
    }

    try {
      const res = await api.delete(
        '/api/admin/reviews/demo',
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        }
      );
      toast.success(res.data.message || `Successfully deleted ${res.data.deletedCount} demo reviews!`);
      fetchAllReviews();
      fetchPendingReviews();
    } catch (error) {
      console.error('Error deleting demo reviews:', error);
      toast.error(error.response?.data?.message || 'Error deleting demo reviews');
    }
  };

  const fetchImages = async () => {
    try {
      const res = await api.get('/api/upload/all', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      setUploadedImages(res.data.images || []);
    } catch (error) {
      toast.error('Error loading images');
    }
  };

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    // Validate file sizes
    const maxSize = 5 * 1024 * 1024; // 5MB
    const oversizedFiles = files.filter(file => file.size > maxSize);
    if (oversizedFiles.length > 0) {
      toast.error(`Some files exceed 5MB limit: ${oversizedFiles.map(f => f.name).join(', ')}`);
      e.target.value = ''; // Reset file input
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      if (files.length === 1) {
        formData.append('image', files[0]);
        const res = await api.post('/api/upload/single', formData, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
            // Don't set Content-Type - axios will set it automatically with boundary
          }
        });
        if (res.data.success) {
          toast.success('Image uploaded successfully');
        } else {
          throw new Error(res.data.message || 'Upload failed');
        }
      } else {
        files.forEach(file => {
          formData.append('images', file);
        });
        const res = await api.post('/api/upload/multiple', formData, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
            // Don't set Content-Type - axios will set it automatically with boundary
          }
        });
        if (res.data.success) {
          toast.success(`${files.length} images uploaded successfully`);
        } else {
          throw new Error(res.data.message || 'Upload failed');
        }
      }
      fetchImages();
      // Reset file input
      e.target.value = '';
    } catch (error) {
      console.error('Image upload error:', error);
      const errorMessage = error.response?.data?.message || error.response?.data?.error || error.message || 'Error uploading images';
      toast.error(errorMessage);
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteImage = async (imageData) => {
    if (!window.confirm('Are you sure you want to delete this image?')) return;
    try {
      // Use publicId if available, otherwise use filename or URL
      const identifier = imageData.publicId || imageData.filename || imageData.url || imageData;
      
      // Encode the identifier if it's a URL or contains special characters
      const encodedIdentifier = encodeURIComponent(identifier);
      
      await api.delete(`/api/upload/${encodedIdentifier}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      toast.success('Image deleted successfully');
      fetchImages();
    } catch (error) {
      console.error('Error deleting image:', error);
      const errorMessage = error.response?.data?.message || 'Error deleting image';
      toast.error(errorMessage);
    }
  };

  const copyImageUrl = (url) => {
    // If it's already a full URL (Cloudinary), use as-is, otherwise prepend backend URL
    const fullUrl = url.startsWith('http') ? url : `${getBackendUrl()}${url}`;
    navigator.clipboard.writeText(fullUrl);
    toast.success('Image URL copied to clipboard!');
  };

  const fetchProducts = async () => {
    try {
      const res = await api.get('/api/admin/products', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      setProducts(res.data);
    } catch (error) {
      toast.error('Error loading products');
    }
  };

  const fetchAllProducts = async () => {
    try {
      const res = await api.get('/api/admin/products', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      setAllProducts(res.data);
    } catch (error) {
      toast.error('Error loading all products');
    }
  };

  const handleProductFormChange = (e) => {
    const { name, value } = e.target;
    
    // Handle subcategory change - reset colors if subcategory changes
    if (name === 'subcategory') {
      // When subcategory changes, remove only entries that match the old subcategory
      // Keep entries for other subcategories
      const oldSubcategory = productForm.subcategory;
      const newAlsoInCategories = productForm.alsoInCategories?.filter(item => 
        item.subcategory !== oldSubcategory
      ) || [];
      
      setProductForm({
        ...productForm,
        [name]: value,
        colors: [], // Reset colors when subcategory changes
        alsoInCategories: newAlsoInCategories // Only remove entries for the old subcategory
      });
    } else if (name === 'category') {
      // When category changes, remove all alsoInCategories entries for the old category
      const oldCategory = productForm.category;
      const newAlsoInCategories = productForm.alsoInCategories?.filter(item => 
        item.category !== oldCategory
      ) || [];
      
      setProductForm({
        ...productForm,
        [name]: value,
        subcategory: '', // Reset subcategory when category changes
        colors: [], // Reset colors when category changes
        alsoInCategories: newAlsoInCategories // Only remove entries for the old category
      });
    } else {
      setProductForm({
        ...productForm,
        [name]: value
      });
    }
    
    // Refresh categories to get latest subcategory colors
    if (name === 'category' || name === 'subcategory') {
      fetchCategories();
    }
  };

  const handleAddImageToProduct = (imageUrl) => {
    // If it's already a full URL (Cloudinary), use it as-is, otherwise prepend backend URL
    const fullUrl = imageUrl.startsWith('http') ? imageUrl : `${getBackendUrl()}${imageUrl}`;
    if (!productForm.images.includes(fullUrl)) {
      setProductForm({
        ...productForm,
        images: [...productForm.images, fullUrl]
      });
      toast.success('Image added to product');
    } else {
      toast.info('Image already added');
    }
  };

  const handleRemoveImageFromProduct = (imageUrl) => {
    setProductForm({
      ...productForm,
      images: productForm.images.filter(img => img !== imageUrl)
    });
  };

  const handleDownloadImage = async (imageUrl) => {
    try {
      const fullUrl = getImageUrl(imageUrl);
      // Fetch the image as a blob
      const response = await fetch(fullUrl);
      const blob = await response.blob();
      
      // Create a temporary URL for the blob
      const url = window.URL.createObjectURL(blob);
      
      // Create a temporary anchor element and trigger download
      const link = document.createElement('a');
      link.href = url;
      
      // Extract filename from URL or use a default name
      const urlParts = fullUrl.split('/');
      const filename = urlParts[urlParts.length - 1].split('?')[0] || 'product-image';
      link.download = filename;
      
      // Append to body, click, and remove
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up the blob URL
      window.URL.revokeObjectURL(url);
      
      toast.success('Image downloaded successfully');
    } catch (error) {
      console.error('Error downloading image:', error);
      toast.error('Error downloading image');
    }
  };

  const handleUploadProductImage = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    setUploading(true);
    try {
      const formData = new FormData();
      if (files.length === 1) {
        formData.append('image', files[0]);
        const res = await api.post('/api/upload/single', formData, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'multipart/form-data'
          }
        });
        // Cloudinary returns full URLs, so use as-is if it's already a full URL
        const fullUrl = res.data.imageUrl.startsWith('http') 
          ? res.data.imageUrl 
          : `${getBackendUrl()}${res.data.imageUrl}`;
        if (!productForm.images.includes(fullUrl)) {
          setProductForm({
            ...productForm,
            images: [...productForm.images, fullUrl]
          });
          toast.success('Image uploaded and added to product');
        }
      } else {
        files.forEach(file => {
          formData.append('images', file);
        });
        const res = await api.post('/api/upload/multiple', formData, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'multipart/form-data'
          }
        });
        const newImages = res.data.images.map(img => getImageUrl(img.url));
        const uniqueNewImages = newImages.filter(img => !productForm.images.includes(img));
        setProductForm({
          ...productForm,
          images: [...productForm.images, ...uniqueNewImages]
        });
        toast.success(`${uniqueNewImages.length} images uploaded and added to product`);
      }
      fetchImages();
      // Reset file input
      e.target.value = '';
    } catch (error) {
      toast.error('Error uploading images');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmitProduct = async (e) => {
    e.preventDefault();
    try {
      // Convert colors to proper format (handle both old string format and new object format)
      const formattedColors = productForm.colors.map(c => {
        if (typeof c === 'string') {
          return { color: c, images: [] };
        }
        return { color: c.color, images: c.images || [] };
      });

      // Collect all images from colors and general images
      const allImages = [
        ...productForm.images,
        ...formattedColors.flatMap(c => c.images || [])
      ];

      // Filter out invalid sizes (empty size or missing price)
      const validSizes = productForm.sizes.filter(sizeItem => 
        sizeItem.size && sizeItem.size.trim() !== '' && 
        sizeItem.price !== '' && sizeItem.price !== null && sizeItem.price !== undefined
      );

      // Filter out invalid country pricing entries
      const validCountryPricing = (productForm.pricingByCountry || []).filter(
        countryPricing => 
          countryPricing.country && 
          countryPricing.currency && 
          countryPricing.price !== '' && 
          countryPricing.price !== null && 
          countryPricing.price !== undefined
      ).map(countryPricing => ({
        ...countryPricing,
        price: parseFloat(countryPricing.price),
        discountPrice: countryPricing.discountPrice ? parseFloat(countryPricing.discountPrice) : undefined,
        sizes: (countryPricing.sizes || []).filter(sizeItem => 
          sizeItem.size && sizeItem.price !== '' && sizeItem.price !== null && sizeItem.price !== undefined
        ).map(sizeItem => ({
          ...sizeItem,
          price: parseFloat(sizeItem.price),
          discountPrice: sizeItem.discountPrice ? parseFloat(sizeItem.discountPrice) : undefined
        }))
      }));

      const productData = {
        ...productForm,
        price: parseFloat(productForm.price),
        discountPrice: productForm.discountPrice ? parseFloat(productForm.discountPrice) : undefined,
        colors: formattedColors,
        sizes: validSizes,
        images: allImages, // Include both general images and color-specific images
        pricingByCountry: validCountryPricing,
        alsoInCategories: productForm.alsoInCategories || []
      };

      let savedProduct;
      if (editingProduct) {
        const response = await api.put(
          `/api/admin/products/${editingProduct._id}`,
          productData,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem('token')}`
            }
          }
        );
        savedProduct = response.data;
        toast.success('Product updated successfully');
      } else {
        const response = await api.post(
          '/api/admin/products',
          productData,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem('token')}`
            }
          }
        );
        savedProduct = response.data;
        toast.success('Product created successfully');
      }
      
      // Close form and refresh products list
      setShowProductForm(false);
      setEditingProduct(null);
      setProductForm({
        name: '',
        description: '',
        price: '',
        discountPrice: '',
        category: '',
        subcategory: '',
        images: [],
        sizes: [],
        colors: [],
        getPrintName: '',
        isTrending: false,
        pricingByCountry: [],
        alsoInCategories: []
      });
      fetchProducts();
      
      // Log the saved product data for debugging
      if (savedProduct && savedProduct.alsoInCategories) {
        console.log('[PRODUCT SAVED] alsoInCategories:', JSON.stringify(savedProduct.alsoInCategories, null, 2));
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.response?.data?.error || error.message || 'Error saving product';
      toast.error(errorMessage);
      console.error('Error saving product:', error);
    }
  };

  const handleEditProduct = (product) => {
    setEditingProduct(product);
    
    // Handle both old format (array of strings) and new format (array of objects)
    let sizes = product.sizes || [];
    if (sizes.length > 0 && typeof sizes[0] === 'string') {
      // Convert old format to new format
      sizes = sizes.map(size => ({ 
        size, 
        price: product.price, 
        discountPrice: product.discountPrice, 
        stock: product.stock || 0 
      }));
    }
    
    // Handle colors - separate general images from color-specific images
    let colors = product.colors || [];
    let generalImages = product.images || [];
    
    if (colors.length > 0 && typeof colors[0] === 'string') {
      // Old format - convert to new format
      colors = colors.map(color => ({ color, images: [] }));
    } else if (colors.length > 0 && colors[0].images) {
      // New format with color-specific images - filter out color images from general images
      const colorImageUrls = colors.flatMap(c => c.images || []).map(img => 
        img.startsWith('http') ? img : getImageUrl(img)
      );
      generalImages = generalImages.filter(img => {
        const imgUrl = getImageUrl(img);
        return !colorImageUrls.includes(imgUrl);
      });
    }
    
    setProductForm({
      name: product.name,
      description: product.description,
      price: product.price,
      discountPrice: product.discountPrice || '',
      category: product.category,
      subcategory: product.subcategory,
      images: generalImages,
      sizes: sizes,
      colors: colors,
      getPrintName: product.getPrintName || '',
      isTrending: product.isTrending || false,
      pricingByCountry: product.pricingByCountry || [],
      alsoInCategories: product.alsoInCategories || []
    });
    setShowProductForm(true);
  };

  const handleDeleteProduct = async (productId) => {
    if (!window.confirm('Are you sure you want to delete this product?')) return;
    try {
      await api.delete(`/api/admin/products/${productId}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      toast.success('Product deleted successfully');
      // Refresh both product lists so changes are visible in all tabs
      fetchProducts();
      fetchAllProducts();
    } catch (error) {
      toast.error('Error deleting product');
    }
  };

  const handleToggleTrending = async (productId, isTrending) => {
    try {
      await api.put(
        `/api/admin/products/${productId}`,
        { isTrending },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        }
      );
      toast.success(isTrending ? 'Product marked as trending' : 'Product removed from trending');
      fetchProducts();
    } catch (error) {
      toast.error('Error updating trending status');
    }
  };

  // Helper function to get country flag emoji from country code
  const getCountryFlag = (countryCode) => {
    if (!countryCode || countryCode === 'XX' || countryCode === 'LOC') {
      return '🌍';
    }
    // Convert country code to flag emoji
    const codePoints = countryCode
      .toUpperCase()
      .split('')
      .map(char => 127397 + char.charCodeAt());
    return String.fromCodePoint(...codePoints);
  };

  // Notes Management
  const fetchNotes = async () => {
    try {
      const res = await api.get('/api/admin/settings/notes', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      // Ensure notes is always a string
      const notesValue = (res.data.notes !== null && res.data.notes !== undefined) ? String(res.data.notes) : '';
      setNotes(notesValue);
      setOriginalNotes(notesValue);
      setIsEditingNotes(false);
    } catch (error) {
      console.error('Error fetching notes:', error);
      toast.error('Error loading notes');
    }
  };

  const saveNotes = async () => {
    try {
      // Ensure notes is always a string, even if empty
      const notesToSave = notes !== null && notes !== undefined ? String(notes) : '';
      
      await api.post(
        '/api/admin/settings/notes',
        { notes: notesToSave },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        }
      );
      setOriginalNotes(notesToSave);
      setNotes(notesToSave);
      setIsEditingNotes(false);
      toast.success('Notes saved successfully!');
    } catch (error) {
      console.error('Error saving notes:', error);
      const errorMessage = error.response?.data?.message || error.response?.data?.error || 'Error saving notes';
      toast.error(errorMessage);
    }
  };

  const handleEditNotes = () => {
    setIsEditingNotes(true);
  };

  const handleCancelNotes = () => {
    setNotes(originalNotes);
    setIsEditingNotes(false);
  };

  // COD Charges Management
  const fetchCodCharges = async () => {
    try {
      const res = await api.get('/api/admin/settings/cod-charges', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      const charges = parseFloat(res.data.codCharges) || 0;
      setCodCharges(charges);
      setOriginalCodCharges(charges);
      setIsEditingCodCharges(false);
    } catch (error) {
      console.error('Error fetching COD charges:', error);
      toast.error('Error loading COD charges');
    }
  };

  const saveCodCharges = async () => {
    try {
      const chargesToSave = parseFloat(codCharges) || 0;
      
      if (chargesToSave < 0) {
        toast.error('COD charges cannot be negative');
        return;
      }
      
      await api.post(
        '/api/admin/settings/cod-charges',
        { codCharges: chargesToSave },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        }
      );
      setOriginalCodCharges(chargesToSave);
      setCodCharges(chargesToSave);
      setIsEditingCodCharges(false);
      toast.success('COD charges saved successfully!');
    } catch (error) {
      console.error('Error saving COD charges:', error);
      const errorMessage = error.response?.data?.message || error.response?.data?.error || 'Error saving COD charges';
      toast.error(errorMessage);
    }
  };

  const handleEditCodCharges = () => {
    setIsEditingCodCharges(true);
  };

  const handleCancelCodCharges = () => {
    setCodCharges(originalCodCharges);
    setIsEditingCodCharges(false);
  };

  // Country Currency Management
  const fetchCountryCurrencies = async () => {
    try {
      const res = await api.get('/api/admin/country-currencies', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      setCountryCurrencies(res.data || []);
    } catch (error) {
      console.error('Error fetching country currencies:', error);
      toast.error('Error loading country currencies');
    }
  };

  const handleCreateCountryCurrency = () => {
    setCountryCurrencyForm({
      country: '',
      countryCode: '',
      currency: '',
      currencySymbol: '',
      isActive: true,
      order: 0
    });
    setEditingCountryCurrency(null);
    setShowCountryCurrencyForm(true);
  };

  const handleEditCountryCurrency = (countryCurrency) => {
    setCountryCurrencyForm({
      country: countryCurrency.country || '',
      countryCode: countryCurrency.countryCode || '',
      currency: countryCurrency.currency || '',
      currencySymbol: countryCurrency.currencySymbol || '',
      isActive: countryCurrency.isActive !== undefined ? countryCurrency.isActive : true,
      order: countryCurrency.order || 0
    });
    setEditingCountryCurrency(countryCurrency);
    setShowCountryCurrencyForm(true);
  };

  const handleSaveCountryCurrency = async () => {
    try {
      if (!countryCurrencyForm.country || !countryCurrencyForm.countryCode || !countryCurrencyForm.currency || !countryCurrencyForm.currencySymbol) {
        toast.error('Please fill in all required fields');
        return;
      }

      const countryCurrencyData = {
        country: countryCurrencyForm.country.trim(),
        countryCode: countryCurrencyForm.countryCode.trim().toUpperCase(),
        currency: countryCurrencyForm.currency.trim().toUpperCase(),
        currencySymbol: countryCurrencyForm.currencySymbol.trim(),
        isActive: countryCurrencyForm.isActive,
        order: parseInt(countryCurrencyForm.order) || 0
      };

      if (editingCountryCurrency) {
        await api.put(
          `/api/admin/country-currencies/${editingCountryCurrency._id}`,
          countryCurrencyData,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem('token')}`
            }
          }
        );
        toast.success('Country Currency updated successfully!');
      } else {
        await api.post(
          '/api/admin/country-currencies',
          countryCurrencyData,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem('token')}`
            }
          }
        );
        toast.success('Country Currency created successfully!');
      }

      setShowCountryCurrencyForm(false);
      setEditingCountryCurrency(null);
      fetchCountryCurrencies();
    } catch (error) {
      console.error('Error saving country currency:', error);
      const errorMessage = error.response?.data?.message || error.response?.data?.error || 'Error saving country currency';
      toast.error(errorMessage);
    }
  };

  const handleDeleteCountryCurrency = async (id) => {
    if (!window.confirm('Are you sure you want to delete this country currency?')) {
      return;
    }

    try {
      await api.delete(`/api/admin/country-currencies/${id}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      toast.success('Country Currency deleted successfully!');
      fetchCountryCurrencies();
    } catch (error) {
      console.error('Error deleting country currency:', error);
      const errorMessage = error.response?.data?.message || error.response?.data?.error || 'Error deleting country currency';
      toast.error(errorMessage);
    }
  };

  const handleToggleCountryCurrency = async (countryCurrency) => {
    try {
      const updatedData = {
        ...countryCurrency,
        isActive: !countryCurrency.isActive
      };
      
      await api.put(
        `/api/admin/country-currencies/${countryCurrency._id}`,
        {
          country: updatedData.country,
          countryCode: updatedData.countryCode,
          currency: updatedData.currency,
          currencySymbol: updatedData.currencySymbol,
          isActive: updatedData.isActive,
          order: updatedData.order || 0
        },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        }
      );
      toast.success(`Country Currency ${updatedData.isActive ? 'enabled' : 'disabled'} successfully!`);
      fetchCountryCurrencies();
    } catch (error) {
      console.error('Error toggling country currency:', error);
      const errorMessage = error.response?.data?.message || error.response?.data?.error || 'Error updating country currency';
      toast.error(errorMessage);
    }
  };

  const initializeDefaultCountries = async () => {
    // Default countries from navbar currency selector
    const defaultCountries = [
      { country: 'United States', countryCode: 'US', currency: 'USD', currencySymbol: '$', order: 1 },
      { country: 'United Kingdom', countryCode: 'GB', currency: 'GBP', currencySymbol: '£', order: 2 },
      { country: 'Canada', countryCode: 'CA', currency: 'CAD', currencySymbol: 'C$', order: 3 },
      { country: 'Europe', countryCode: 'EU', currency: 'EUR', currencySymbol: '€', order: 4 },
      { country: 'India', countryCode: 'IN', currency: 'INR', currencySymbol: '₹', order: 5 }
    ];

    try {
      // Check which countries already exist
      const existingCurrencies = countryCurrencies.map(cc => cc.currency.toUpperCase());
      
      // Create missing countries
      for (const defaultCountry of defaultCountries) {
        if (!existingCurrencies.includes(defaultCountry.currency.toUpperCase())) {
          try {
            await api.post(
              '/api/admin/country-currencies',
              {
                ...defaultCountry,
                isActive: true
              },
              {
                headers: {
                  Authorization: `Bearer ${localStorage.getItem('token')}`
                }
              }
            );
          } catch (error) {
            // If country already exists (race condition), ignore
            if (error.response?.status !== 400 && error.response?.status !== 409) {
              console.error(`Error creating ${defaultCountry.country}:`, error);
            }
          }
        }
      }
      
      // Refresh the list
      fetchCountryCurrencies();
    } catch (error) {
      console.error('Error initializing default countries:', error);
    }
  };

  // Offers Management
  const fetchOffers = async () => {
    try {
      const res = await api.get('/api/admin/offers', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      setOffers(res.data || []);
    } catch (error) {
      console.error('Error fetching offers:', error);
      toast.error('Error loading offers');
    }
  };

  const handleCreateOffer = () => {
    setOfferForm({
      code: '',
      offerType: 'coupon',
      discount: '',
      discountType: 'percentage',
      description: '',
      couponDisplayText: '',
      isActive: true,
      showOnHomePage: true,
      category: '',
      subcategories: [],
      products: [],
      bundlePrice: '',
      bundleQuantity: '',
      bundleDisplayText: '',
      pricingByCountry: [],
      discountByCountry: []
    });
    setSelectedCategoryForOffer('');
    setSelectedSubcategoriesForOffer([]);
    setSelectedProductsForOffer([]);
    setEditingOffer(null);
    setShowOfferForm(true);
  };

  const handleEditOffer = async (offer) => {
    try {
      const offerType = offer.offerType || 'coupon';
      
      setOfferForm({
        code: offer.code || '',
        offerType: offerType,
        discount: offer.discount !== undefined ? offer.discount : '',
        discountType: offer.discountType || 'percentage',
        description: offer.description || '',
        couponDisplayText: offer.couponDisplayText || '',
        isActive: offer.isActive !== undefined ? offer.isActive : true,
        showOnHomePage: offer.showOnHomePage !== undefined ? offer.showOnHomePage : (offerType === 'coupon'),
        category: offer.category || '',
        subcategories: offer.subcategories || [],
        products: offer.products ? (Array.isArray(offer.products) ? offer.products.map(p => p._id || p) : []) : [],
        bundlePrice: offer.bundlePrice !== undefined ? offer.bundlePrice : '',
        bundleQuantity: offer.bundleQuantity !== undefined ? offer.bundleQuantity : '',
        bundleDisplayText: offer.bundleDisplayText || '',
        carouselId: offer.carouselId ? (offer.carouselId._id || offer.carouselId) : '',
        carouselDisplayText: offer.carouselDisplayText || '',
        pricingByCountry: offer.pricingByCountry || [],
        discountByCountry: offer.discountByCountry || []
      });
      
      // Only handle bundle-specific setup if it's a bundle offer
      if (offerType === 'bundle') {
        const category = offer.category || '';
        const subcategories = offer.subcategories || [];
        setSelectedCategoryForOffer(category);
        setSelectedSubcategoriesForOffer(subcategories);
        
        // Ensure products are loaded before auto-selecting
        if (allProducts.length === 0) {
          await fetchAllProducts();
        }
        
        // Auto-select products from subcategories when editing (will be handled by useEffect)
        setSelectedProductsForOffer([]); // Reset first, useEffect will populate
      } else if (offerType === 'carousel') {
        // For carousel offers, products will be auto-populated by the useEffect
        // Just ensure carousel items are loaded
        if (carouselItems.length === 0) {
          fetchCarouselItems();
        }
      } else {
        // Reset bundle-related state for coupon offers
        setSelectedCategoryForOffer('');
        setSelectedSubcategoriesForOffer([]);
        setSelectedProductsForOffer([]);
      }
      
      setEditingOffer(offer);
      setShowOfferForm(true);
      
      // Scroll to form after a brief delay to ensure it's rendered
      setTimeout(() => {
        const formSection = document.querySelector('.offer-form-section');
        if (formSection) {
          formSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
    } catch (error) {
      console.error('Error setting up edit offer:', error);
      toast.error('Error loading offer for editing');
    }
  };

  const handleSaveOffer = async () => {
    try {
      if (!offerForm.code) {
        toast.error('Please enter an offer code');
        return;
      }

      // Validate coupon offer
      if (offerForm.offerType === 'coupon') {
        if (!offerForm.discount) {
          toast.error('Please enter a discount value');
          return;
        }
        if (offerForm.discountType === 'percentage' && (offerForm.discount < 0 || offerForm.discount > 100)) {
          toast.error('Percentage discount must be between 0 and 100');
          return;
        }
        if (offerForm.discountType === 'fixed' && offerForm.discount < 0) {
          toast.error('Fixed discount cannot be negative');
          return;
        }
      }

      // Validate bundle offer
      if (offerForm.offerType === 'bundle') {
        if (selectedSubcategoriesForOffer.length === 0) {
          toast.error('Please select at least one subcategory from Men or Women categories for the bundle');
          return;
        }
        if (!offerForm.bundleQuantity || offerForm.bundleQuantity < 1) {
          toast.error('Please enter the number of products required for the bundle (minimum 1)');
          return;
        }
        if (!offerForm.bundlePrice || offerForm.bundlePrice < 0) {
          toast.error('Please enter a valid bundle price');
          return;
        }
        if (selectedProductsForOffer.length === 0) {
          toast.error('No products found in selected subcategories. Please add products first.');
          return;
        }
        if (parseInt(offerForm.bundleQuantity) > selectedProductsForOffer.length) {
          toast.error(`Bundle quantity (${offerForm.bundleQuantity}) cannot be greater than available products (${selectedProductsForOffer.length})`);
          return;
        }
      }

      // Validate carousel offer
      if (offerForm.offerType === 'carousel') {
        if (!offerForm.carouselId) {
          toast.error('Please select a carousel');
          return;
        }
        if (!offerForm.bundleQuantity || offerForm.bundleQuantity < 1) {
          toast.error('Please enter the number of products required for the offer (minimum 1)');
          return;
        }
        if (!offerForm.bundlePrice || offerForm.bundlePrice < 0) {
          toast.error('Please enter a valid offer price');
          return;
        }
        if (selectedProductsForOffer.length === 0) {
          toast.error('No products found in selected carousel. Please add products to the carousel first.');
          return;
        }
        if (parseInt(offerForm.bundleQuantity) > selectedProductsForOffer.length) {
          toast.error(`Offer quantity (${offerForm.bundleQuantity}) cannot be greater than available products (${selectedProductsForOffer.length})`);
          return;
        }
      }

      const offerData = {
        ...offerForm,
        category: offerForm.offerType === 'bundle' ? (selectedCategoryForOffer || undefined) : undefined,
        subcategories: offerForm.offerType === 'bundle' ? selectedSubcategoriesForOffer : undefined,
        products: (offerForm.offerType === 'bundle' || offerForm.offerType === 'carousel') ? selectedProductsForOffer : undefined,
        bundlePrice: (offerForm.offerType === 'bundle' || offerForm.offerType === 'carousel') ? parseFloat(offerForm.bundlePrice) : undefined,
        bundleQuantity: (offerForm.offerType === 'bundle' || offerForm.offerType === 'carousel') ? parseInt(offerForm.bundleQuantity) : undefined,
        bundleDisplayText: offerForm.offerType === 'bundle' ? offerForm.bundleDisplayText : undefined,
        carouselId: offerForm.offerType === 'carousel' ? offerForm.carouselId : undefined,
        carouselDisplayText: offerForm.offerType === 'carousel' ? offerForm.carouselDisplayText : undefined,
        discount: offerForm.offerType === 'coupon' ? parseFloat(offerForm.discount) : undefined,
        pricingByCountry: (offerForm.offerType === 'bundle' || offerForm.offerType === 'carousel') && offerForm.pricingByCountry && offerForm.pricingByCountry.length > 0
          ? offerForm.pricingByCountry
              .filter(p => p.country && p.currency && p.bundlePrice && p.bundlePrice !== '' && !isNaN(parseFloat(p.bundlePrice)))
              .map(p => ({
                country: p.country,
                currency: p.currency,
                bundlePrice: parseFloat(p.bundlePrice)
              }))
          : (offerForm.offerType === 'bundle' || offerForm.offerType === 'carousel') ? [] : undefined,
        discountByCountry: offerForm.offerType === 'coupon' && offerForm.discountByCountry && offerForm.discountByCountry.length > 0
          ? offerForm.discountByCountry
              .filter(d => d.country && d.currency && d.discount && d.discount !== '' && !isNaN(parseFloat(d.discount)))
              .map(d => ({
                country: d.country,
                currency: d.currency,
                discount: parseFloat(d.discount),
                discountType: d.discountType || 'percentage'
              }))
          : offerForm.offerType === 'coupon' ? [] : undefined
      };

      if (editingOffer) {
        await api.put(
          `/api/admin/offers/${editingOffer._id}`,
          offerData,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem('token')}`
            }
          }
        );
        toast.success('Offer updated successfully!');
      } else {
        await api.post(
          '/api/admin/offers',
          offerData,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem('token')}`
            }
          }
        );
        toast.success('Offer created successfully!');
      }

      setShowOfferForm(false);
      setEditingOffer(null);
      fetchOffers();
    } catch (error) {
      console.error('Error saving offer:', error);
      const errorMessage = error.response?.data?.message || 'Error saving offer';
      toast.error(errorMessage);
    }
  };

  const handleDeleteOffer = async (offerId) => {
    if (!window.confirm('Are you sure you want to delete this offer?')) {
      return;
    }

    try {
      await api.delete(`/api/admin/offers/${offerId}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      toast.success('Offer deleted successfully!');
      fetchOffers();
    } catch (error) {
      console.error('Error deleting offer:', error);
      toast.error('Error deleting offer');
    }
  };

  // Helper function to normalize image URLs for comparison
  const normalizeImageUrl = (url) => {
    if (!url) return '';
    
    // Handle objects (e.g., carousel items with imageUrl property)
    let imageUrl = url;
    if (typeof url === 'object') {
      imageUrl = url.imageUrl || url.url || url;
    }
    
    // Convert to string
    imageUrl = String(imageUrl);
    
    // Get the full URL using getImageUrl to ensure consistent format
    const fullUrl = getImageUrl(imageUrl);
    if (!fullUrl) return '';
    
    // Remove query parameters and fragments, convert to lowercase
    // Also remove protocol and www for more robust comparison
    let normalized = fullUrl.split('?')[0].split('#')[0].toLowerCase();
    // Remove http:// or https://
    normalized = normalized.replace(/^https?:\/\//, '');
    // Remove www.
    normalized = normalized.replace(/^www\./, '');
    return normalized;
  };

  // Filter uploaded images to only show carousel and logo images (exclude product images)
  // Also show images that are not used in products (so they can be selected for carousel)
  const filteredUploadedImages = useMemo(() => {
    if (!uploadedImages || uploadedImages.length === 0) return [];
    
    // Get all product images to exclude them
    const productImageUrls = new Set();
    products.forEach(product => {
      if (product.images && Array.isArray(product.images)) {
        product.images.forEach(img => {
          const imgUrl = typeof img === 'string' ? img : (img.url || img);
          if (imgUrl) {
            productImageUrls.add(normalizeImageUrl(imgUrl));
          }
        });
      }
      // Also check color-specific images
      if (product.colors && Array.isArray(product.colors)) {
        product.colors.forEach(colorItem => {
          if (typeof colorItem === 'object' && colorItem.images && Array.isArray(colorItem.images)) {
            colorItem.images.forEach(img => {
              const imgUrl = typeof img === 'string' ? img : (img.url || img);
              if (imgUrl) {
                productImageUrls.add(normalizeImageUrl(imgUrl));
              }
            });
          }
        });
      }
    });
    
    // Filter: Show all images that are NOT product images
    // This includes: carousel images, logo, and newly uploaded images (not yet used in products)
    return uploadedImages.filter(image => {
      const imageUrl = image.url || image;
      const normalizedImageUrl = normalizeImageUrl(imageUrl);
      
      // Exclude if it's a product image, include everything else
      return !productImageUrls.has(normalizedImageUrl);
    });
  }, [uploadedImages, products]);

  return (
    <div className="admin-dashboard">
      <div className="admin-container">
        <h1>Admin Dashboard</h1>
        <div className="admin-tabs">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={activeTab === 'dashboard' ? 'active' : ''}
          >
            Dashboard
          </button>
          <button
            onClick={() => setActiveTab('categories')}
            className={activeTab === 'categories' ? 'active' : ''}
          >
            Categories
          </button>
          <button
            onClick={() => setActiveTab('orders')}
            className={activeTab === 'orders' ? 'active' : ''}
          >
            Orders
          </button>
          <button
            onClick={() => setActiveTab('reviews')}
            className={activeTab === 'reviews' ? 'active' : ''}
          >
            Reviews
          </button>
          <button
            onClick={() => setActiveTab('images')}
            className={activeTab === 'images' ? 'active' : ''}
          >
            Images
          </button>
          <button
            onClick={() => setActiveTab('products')}
            className={activeTab === 'products' ? 'active' : ''}
          >
            Products
          </button>
          <button
            onClick={() => setActiveTab('allProducts')}
            className={activeTab === 'allProducts' ? 'active' : ''}
          >
            All Products
          </button>
          <button
            onClick={() => setActiveTab('trending')}
            className={activeTab === 'trending' ? 'active' : ''}
          >
            Trending
          </button>
          <button
            onClick={() => setActiveTab('notes')}
            className={activeTab === 'notes' ? 'active' : ''}
          >
            Notes
          </button>
          <button
            onClick={() => setActiveTab('cod')}
            className={activeTab === 'cod' ? 'active' : ''}
          >
            COD Settings
          </button>
          <button
            onClick={() => setActiveTab('country-currency')}
            className={activeTab === 'country-currency' ? 'active' : ''}
          >
            Country & Currency
          </button>
          <button
            onClick={() => setActiveTab('offers')}
            className={activeTab === 'offers' ? 'active' : ''}
          >
            Offers
          </button>
        </div>

        {activeTab === 'dashboard' && stats && (
          <>
            <div className="analytics-section">
              <div className="analytics-header">
                <h2 className="analytics-title">Analytics</h2>
                <button 
                  onClick={fetchDashboardData} 
                  className="refresh-btn"
                  title="Refresh dashboard data"
                >
                  🔄 Refresh
                </button>
              </div>
              <div className="dashboard-stats-scrollable">
                <div className="stat-card">
                  <h3>Today</h3>
                  <p className="stat-value">{stats.today.visitors}</p>
                  <p className="stat-label">Visitors</p>
                  <p className="stat-value">{stats.today.orders}</p>
                  <p className="stat-label">Orders</p>
                  <p className="stat-value revenue-online">₹{stats.today.onlineRevenue || 0}</p>
                  <p className="stat-label">Online Revenue</p>
                  <p className="stat-value revenue-cod">₹{stats.today.codRevenue || 0}</p>
                  <p className="stat-label">COD Revenue</p>
                  <p className="stat-value revenue-total">₹{stats.today.revenue}</p>
                  <p className="stat-label">Total Revenue</p>
                </div>
                <div className="stat-card">
                  <h3>Last 7 Days</h3>
                  <p className="stat-value">{stats.last7Days.orders}</p>
                  <p className="stat-label">Orders</p>
                  <p className="stat-value revenue-online">₹{stats.last7Days.onlineRevenue || 0}</p>
                  <p className="stat-label">Online Revenue</p>
                  <p className="stat-value revenue-cod">₹{stats.last7Days.codRevenue || 0}</p>
                  <p className="stat-label">COD Revenue</p>
                  <p className="stat-value revenue-total">₹{stats.last7Days.revenue}</p>
                  <p className="stat-label">Total Revenue</p>
                </div>
                <div className="stat-card">
                  <h3>Last 30 Days</h3>
                  <p className="stat-value">{stats.last30Days.orders}</p>
                  <p className="stat-label">Orders</p>
                  <p className="stat-value revenue-online">₹{stats.last30Days.onlineRevenue || 0}</p>
                  <p className="stat-label">Online Revenue</p>
                  <p className="stat-value revenue-cod">₹{stats.last30Days.codRevenue || 0}</p>
                  <p className="stat-label">COD Revenue</p>
                  <p className="stat-value revenue-total">₹{stats.last30Days.revenue}</p>
                  <p className="stat-label">Total Revenue</p>
                </div>
                <div className="stat-card">
                  <h3>All Time</h3>
                  <p className="stat-value">{stats.allTime.orders}</p>
                  <p className="stat-label">Orders</p>
                  <p className="stat-value revenue-online">₹{stats.allTime.onlineRevenue || 0}</p>
                  <p className="stat-label">Online Revenue</p>
                  <p className="stat-value revenue-cod">₹{stats.allTime.codRevenue || 0}</p>
                  <p className="stat-label">COD Revenue</p>
                  <p className="stat-value revenue-total">₹{stats.allTime.revenue}</p>
                  <p className="stat-label">Total Revenue</p>
                </div>
              </div>
            </div>

            <div className="countries-section">
              <h2 className="countries-title">Country-wise Analytics</h2>
              {stats.countries && stats.countries.length > 0 ? (
                <div className="countries-container">
                  <div className="countries-list">
                    {stats.countries.map((country, index) => (
                      <div key={index} className="country-item">
                        <div className="country-info">
                          <span className="country-flag">{getCountryFlag(country.countryCode)}</span>
                          <div className="country-details">
                            <span className="country-name">{country.country}</span>
                            <span className="country-code">{country.countryCode}</span>
                          </div>
                        </div>
                        <div className="country-stats">
                          <div className="country-stat-item">
                            <span className="stat-value-small">{country.views !== undefined ? country.views : (country.count || 0)}</span>
                            <span className="stat-label-small">Views</span>
                          </div>
                          <div className="country-stat-item">
                            <span className="stat-value-small">{country.orders || 0}</span>
                            <span className="stat-label-small">Orders</span>
                          </div>
                          <div className="country-stat-item revenue-stat">
                            <span className="stat-value-small revenue-value">
                              {(() => {
                                const revenue = country.revenue || 0;
                                const currencySymbol = country.currencySymbol || getCurrencySymbol(country.currency || 'USD');
                                const formattedPrice = parseFloat(revenue).toLocaleString('en-US', { 
                                  minimumFractionDigits: 2, 
                                  maximumFractionDigits: 2 
                                });
                                return `${currencySymbol}${formattedPrice}`;
                              })()}
                            </span>
                            <span className="stat-label-small">Revenue</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="no-countries-message">
                  <p>🌍 No country data available yet.</p>
                  <p style={{ marginTop: '0.5rem', fontSize: '0.9rem', color: '#94a3b8' }}>
                    Country information will appear as new visitors access the site. 
                    {stats.today.visitors > 0 && (
                      <span> You have {stats.today.visitors} visitors today - new visitors will be tracked with country data.</span>
                    )}
                  </p>
                </div>
              )}
            </div>
          </>
        )}

        {activeTab === 'categories' && (
          <div className="categories-management">
            <div className="add-subcategory-form">
              <h2>Add Subcategory</h2>
              <form onSubmit={handleAddSubcategory}>
                <select
                  value={newSubcategory.categoryId}
                  onChange={(e) =>
                    setNewSubcategory({ ...newSubcategory, categoryId: e.target.value })
                  }
                  required
                >
                  <option value="">Select Category</option>
                  {categories.map((cat) => (
                    <option key={cat._id} value={cat._id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  placeholder="Subcategory Name"
                  value={newSubcategory.name}
                  onChange={(e) =>
                    setNewSubcategory({ ...newSubcategory, name: e.target.value })
                  }
                  required
                />
                <div className="colors-input-wrapper">
                  <input
                    type="text"
                    placeholder="Colors (comma separated: Red, Blue, Green)"
                    value={newSubcategory.colors}
                    onChange={(e) =>
                      setNewSubcategory({ ...newSubcategory, colors: e.target.value })
                    }
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setShowColorPicker(true);
                      setColorSearchTerm('');
                    }}
                    className="add-colors-btn"
                  >
                    + Add Colors
                  </button>
                </div>
                <button type="submit">Add Subcategory</button>
              </form>
            </div>
            
            {/* Color Picker Modal */}
            {showColorPicker && (
              <div className="color-picker-modal" onClick={() => {
                setShowColorPicker(false);
                setEditingSubcategoryColors(null);
              }}>
                <div className="color-picker-content" onClick={(e) => e.stopPropagation()}>
                  <div className="color-picker-header">
                    <h3>Select Colors</h3>
                    <button
                      type="button"
                      onClick={() => {
                        setShowColorPicker(false);
                        setEditingSubcategoryColors(null);
                      }}
                      className="close-color-picker"
                    >
                      ×
                    </button>
                  </div>
                  <div className="color-search">
                    <input
                      type="text"
                      placeholder="Search colors..."
                      value={colorSearchTerm}
                      onChange={(e) => setColorSearchTerm(e.target.value)}
                      className="color-search-input"
                    />
                  </div>
                  <div className="color-picker-grid">
                    {getAvailableColors()
                      .filter(color => 
                        color.toLowerCase().includes(colorSearchTerm.toLowerCase())
                      )
                      .map((color) => {
                        // Determine which colors list to use
                        const currentColors = editingSubcategoryColors
                          ? editingSubcategoryColors.colors.split(',').map(c => c.trim()).filter(c => c !== '')
                          : newSubcategory.colors.split(',').map(c => c.trim()).filter(c => c !== '');
                        const isSelected = currentColors.includes(color);
                        
                        return (
                          <div
                            key={color}
                            className={`color-picker-item ${isSelected ? 'selected' : ''}`}
                            onClick={() => {
                              if (editingSubcategoryColors) {
                                // Editing existing subcategory
                                const updatedColors = isSelected
                                  ? currentColors.filter(c => c !== color)
                                  : [...currentColors, color];
                                
                                setEditingSubcategoryColors({
                                  ...editingSubcategoryColors,
                                  colors: updatedColors.join(', ')
                                });
                                
                                // Update immediately
                                handleUpdateSubcategory(
                                  editingSubcategoryColors.categoryId,
                                  editingSubcategoryColors.subcategoryId,
                                  { colors: updatedColors }
                                );
                              } else {
                                // Adding new subcategory
                                if (isSelected) {
                                  setNewSubcategory({
                                    ...newSubcategory,
                                    colors: currentColors.filter(c => c !== color).join(', ')
                                  });
                                } else {
                                  setNewSubcategory({
                                    ...newSubcategory,
                                    colors: [...currentColors, color].join(', ')
                                  });
                                }
                              }
                            }}
                            style={{
                              backgroundColor: getColorValue(color),
                              color: getContrastColor(color)
                            }}
                          >
                            {color}
                          </div>
                        );
                      })}
                  </div>
                  <div className="color-picker-footer">
                    <button
                      type="button"
                      onClick={() => {
                        setShowColorPicker(false);
                        setEditingSubcategoryColors(null);
                      }}
                      className="done-colors-btn"
                    >
                      Done
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className="categories-list">
              {categories.map((category) => {
                const isExpanded = expandedCategories[category._id] || false;
                return (
                  <div key={category._id} className="category-card">
                    <div 
                      className="category-header"
                      onClick={() => setExpandedCategories(prev => ({
                        ...prev,
                        [category._id]: !prev[category._id]
                      }))}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <h3>{category.name}</h3>
                        {category.name === 'Kids' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleCategory(category._id, category.isActive !== false);
                            }}
                            className={category.isActive !== false ? "disable-btn" : "enable-btn"}
                            style={{ 
                              padding: '0.5rem 1rem',
                              fontSize: '0.875rem',
                              borderRadius: '6px',
                              border: 'none',
                              cursor: 'pointer',
                              fontWeight: '600'
                            }}
                            title={category.isActive !== false ? 'Disable Kids Category' : 'Enable Kids Category'}
                          >
                            {category.isActive !== false ? '⏸️ Disable' : '▶️ Enable'}
                          </button>
                        )}
                        {category.name === 'Kids' && (
                          <span style={{ 
                            fontSize: '0.875rem',
                            padding: '0.25rem 0.75rem',
                            borderRadius: '4px',
                            backgroundColor: category.isActive !== false ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                            color: category.isActive !== false ? '#22c55e' : '#ef4444',
                            fontWeight: '600'
                          }}>
                            {category.isActive !== false ? 'Active' : 'Inactive'}
                          </span>
                        )}
                      </div>
                      <span className="category-toggle-icon">
                        {isExpanded ? '▼' : '▶'}
                      </span>
                    </div>
                    {isExpanded && (
                      <div className="subcategories-list">
                        {category.subcategories.map((sub) => (
                      <div key={sub._id} className="subcategory-item">
                        <div className="subcategory-name-input">
                          <input
                            type="text"
                            value={sub.name}
                            onChange={(e) =>
                              handleUpdateSubcategory(category._id, sub._id, {
                                name: e.target.value
                              })
                            }
                            onBlur={(e) =>
                              handleUpdateSubcategory(category._id, sub._id, {
                                name: e.target.value
                              })
                            }
                            placeholder="Subcategory Name"
                          />
                        </div>
                        <div className="subcategory-colors-input">
                          <div className="colors-input-wrapper">
                            <input
                              type="text"
                              value={(sub.colors || []).join(', ')}
                              onChange={(e) => {
                                const colors = e.target.value.split(',').map(c => c.trim()).filter(c => c !== '');
                                handleUpdateSubcategory(category._id, sub._id, {
                                  colors: colors
                                });
                              }}
                              onBlur={(e) => {
                                const colors = e.target.value.split(',').map(c => c.trim()).filter(c => c !== '');
                                handleUpdateSubcategory(category._id, sub._id, {
                                  colors: colors
                                });
                              }}
                              placeholder="Colors (comma separated)"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                setEditingSubcategoryColors({
                                  categoryId: category._id,
                                  subcategoryId: sub._id,
                                  colors: (sub.colors || []).join(', ')
                                });
                                setShowColorPicker(true);
                                setColorSearchTerm('');
                              }}
                              className="add-colors-btn-small"
                              title="Open color picker"
                            >
                              🎨
                            </button>
                          </div>
                        </div>
                        <label className="subcategory-active-checkbox">
                          <input
                            type="checkbox"
                            checked={sub.isActive}
                            onChange={(e) =>
                              handleUpdateSubcategory(category._id, sub._id, {
                                isActive: e.target.checked
                              })
                            }
                          />
                          Active
                        </label>
                        <button
                          onClick={() =>
                            handleDeleteSubcategory(category._id, sub._id)
                          }
                          className="delete-btn"
                        >
                          Delete
                        </button>
                        </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === 'orders' && (
          <div className="orders-management">
            <h2>All Orders</h2>
            <div className="orders-table">
              <table>
                <thead>
                  <tr>
                    <th>Order ID</th>
                    <th>Customer</th>
                    <th>Amount</th>
                    <th>Product Name</th>
                    <th>GetPrint Name</th>
                    <th>Color</th>
                    <th>Size</th>
                    <th>Address</th>
                    <th>Payment Status</th>
                    <th>COD</th>
                    <th>Order Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => {
                    // Helper function to get currency for an order based on shipping address country
                    const getOrderCurrency = () => {
                      if (order.shippingAddress?.country) {
                        return getCurrencyForCountry(order.shippingAddress.country);
                      }
                      // Default to INR if no country is specified (for backward compatibility)
                      return 'INR';
                    };
                    // Extract product names from order items
                    const productNames = order.items
                      ?.map(item => {
                        // Use item.name (stored when order created) or product.name if populated
                        if (item.name) {
                          return item.name;
                        }
                        const product = item.product;
                        if (product && typeof product === 'object' && product.name) {
                          return product.name;
                        }
                        return null;
                      })
                      .filter(name => name !== null) || [];
                    
                    // Get unique product names
                    const uniqueProductNames = [...new Set(productNames)];
                    
                    // Extract getPrintNames from order items
                    const getPrintNames = order.items
                      ?.map(item => {
                        // Handle both populated and non-populated product references
                        const product = item.product;
                        if (product && typeof product === 'object' && product.getPrintName) {
                          return product.getPrintName;
                        }
                        return null;
                      })
                      .filter(name => name !== null) || [];
                    
                    // Get unique getPrintNames
                    const uniqueGetPrintNames = [...new Set(getPrintNames)];
                    
                    // Extract colors from order items
                    const colors = order.items
                      ?.map(item => item.color)
                      .filter(color => color && color.trim() !== '') || [];
                    const uniqueColors = [...new Set(colors)];
                    
                    // Extract sizes from order items
                    const sizes = order.items
                      ?.map(item => item.size)
                      .filter(size => size && size.trim() !== '') || [];
                    const uniqueSizes = [...new Set(sizes)];
                    
                    const handleOpenAddress = () => {
                      setSelectedOrderAddress(order.shippingAddress);
                      setShowAddressModal(true);
                    };
                    
                    return (
                      <tr key={order._id}>
                        <td>#{order._id.slice(-8)}</td>
                        <td>{order.user?.name || 'N/A'}</td>
                        <td>{formatPrice(order.totalAmount, getOrderCurrency())}</td>
                        <td>
                          {uniqueProductNames.length > 0 
                            ? uniqueProductNames.join(', ') 
                            : 'N/A'}
                        </td>
                        <td>
                          {uniqueGetPrintNames.length > 0 
                            ? uniqueGetPrintNames.join(', ') 
                            : 'N/A'}
                        </td>
                        <td>
                          {uniqueColors.length > 0 
                            ? uniqueColors.join(', ') 
                            : 'N/A'}
                        </td>
                        <td>
                          {uniqueSizes.length > 0 
                            ? uniqueSizes.join(', ') 
                            : 'N/A'}
                        </td>
                        <td>
                          {order.shippingAddress ? (
                            <button 
                              onClick={handleOpenAddress}
                              className="view-address-btn"
                            >
                              Open
                            </button>
                          ) : (
                            'N/A'
                          )}
                        </td>
                        <td>{order.paymentStatus}</td>
                        <td>
                          <span className={order.paymentMethod === 'cod' ? 'cod-badge cod-yes' : 'cod-badge cod-no'}>
                            {order.paymentMethod === 'cod' ? 'Yes' : 'No'}
                          </span>
                        </td>
                        <td>
                          <select
                            value={order.orderStatus}
                            onChange={(e) =>
                              handleUpdateOrderStatus(order._id, e.target.value)
                            }
                          >
                            <option value="pending">Pending</option>
                            <option value="processing">Processing</option>
                            <option value="shipped">Shipped</option>
                            <option value="delivered">Delivered</option>
                            <option value="cancelled">Cancelled</option>
                          </select>
                        </td>
                        <td>
                          <button
                            onClick={() => handleUpdateOrderStatus(order._id, order.orderStatus)}
                          >
                            Update
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            
            {/* Address Modal */}
            {showAddressModal && (
              <div className="address-modal-overlay" onClick={() => setShowAddressModal(false)}>
                <div className="address-modal-content" onClick={(e) => e.stopPropagation()}>
                  <div className="address-modal-header">
                    <h3>Shipping Address</h3>
                    <button 
                      className="address-modal-close"
                      onClick={() => setShowAddressModal(false)}
                    >
                      ×
                    </button>
                  </div>
                  <div className="address-modal-body">
                    {selectedOrderAddress ? (
                      (() => {
                        const addr = selectedOrderAddress;
                        const hasNewFormat = addr.firstName !== undefined || addr.lastName !== undefined || addr.streetAddress !== undefined || addr.townCity !== undefined || addr.postcode !== undefined;
                        
                        if (hasNewFormat) {
                          // New format
                          return (
                            <div className="address-details">
                              <div className="address-field">
                                <label>First Name:</label>
                                <span>{addr.firstName || 'N/A'}</span>
                              </div>
                              <div className="address-field">
                                <label>Last Name:</label>
                                <span>{addr.lastName || 'N/A'}</span>
                              </div>
                              <div className="address-field">
                                <label>Street Address:</label>
                                <span>{addr.streetAddress || 'N/A'}</span>
                              </div>
                              <div className="address-field">
                                <label>State:</label>
                                <span>{addr.state || 'N/A'}</span>
                              </div>
                              <div className="address-field">
                                <label>Town/City:</label>
                                <span>{addr.townCity || 'N/A'}</span>
                              </div>
                              <div className="address-field">
                                <label>Country:</label>
                                <span>{addr.country || (addr.state ? 'India' : 'N/A')}</span>
                              </div>
                              <div className="address-field">
                                <label>Postcode/Zip:</label>
                                <span>{addr.postcode || 'N/A'}</span>
                              </div>
                              <div className="address-field">
                                <label>Phone:</label>
                                <span>{addr.phone || 'N/A'}</span>
                              </div>
                            </div>
                          );
                        } else {
                          // Old format
                          const nameParts = addr.name ? addr.name.trim().split(' ') : [];
                          return (
                            <div className="address-details">
                              <div className="address-field">
                                <label>First Name:</label>
                                <span>{nameParts.length > 0 ? nameParts[0] : 'N/A'}</span>
                              </div>
                              <div className="address-field">
                                <label>Last Name:</label>
                                <span>{nameParts.length > 1 ? nameParts.slice(1).join(' ') : 'N/A'}</span>
                              </div>
                              <div className="address-field">
                                <label>Street Address:</label>
                                <span>{addr.address || 'N/A'}</span>
                              </div>
                              <div className="address-field">
                                <label>State:</label>
                                <span>{addr.state || 'N/A'}</span>
                              </div>
                              <div className="address-field">
                                <label>Town/City:</label>
                                <span>{addr.city || 'N/A'}</span>
                              </div>
                              <div className="address-field">
                                <label>Country:</label>
                                <span>{addr.country || (addr.state ? 'India' : 'N/A')}</span>
                              </div>
                              <div className="address-field">
                                <label>Postcode/Zip:</label>
                                <span>{addr.pincode || 'N/A'}</span>
                              </div>
                              <div className="address-field">
                                <label>Phone:</label>
                                <span>{addr.phone || 'N/A'}</span>
                              </div>
                            </div>
                          );
                        }
                      })()
                    ) : (
                      <p>No address available</p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'reviews' && (
          <div className="reviews-management">
            <div style={{ 
              marginBottom: '2rem', 
              padding: '1.5rem', 
              background: '#f8f9fa', 
              borderRadius: '12px',
              border: '2px solid #e2e8f0'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <div>
                  <h2 style={{ margin: 0, marginBottom: '0.5rem' }}>Reviews Settings</h2>
                  <p style={{ margin: 0, color: '#666', fontSize: '0.9rem' }}>
                    {reviewsEnabled 
                      ? 'Reviews are currently enabled and visible on the frontend' 
                      : 'Reviews are currently disabled and hidden from the frontend'}
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
                  <button
                    onClick={handleAddDemoReviews}
                    className="approve-btn"
                    style={{ minWidth: '180px', fontSize: '1rem' }}
                    title="Add 3-5 demo reviews to all active products"
                  >
                    ➕ Add Demo Reviews
                  </button>
                  <button
                    onClick={handleDeleteAllDemoReviews}
                    className="delete-btn"
                    style={{ minWidth: '200px', fontSize: '1rem' }}
                    title="Delete all reviews from demo users"
                  >
                    🗑️ Delete All Demo Reviews
                  </button>
                  <button
                    onClick={handleToggleReviewsEnabled}
                    className={reviewsEnabled ? "disable-btn" : "enable-btn"}
                    style={{ minWidth: '160px', fontSize: '1rem' }}
                  >
                    {reviewsEnabled ? 'Disable Reviews' : 'Enable Reviews'}
                  </button>
                </div>
              </div>
            </div>

            <div style={{ marginBottom: '2rem' }}>
              <h2>Pending Reviews</h2>
              {pendingReviews.length === 0 ? (
                <p>No pending reviews</p>
              ) : (
                <div className="reviews-list">
                  {pendingReviews.map((review) => (
                    <div key={review._id} className="review-card">
                      <div className="review-header">
                        <div>
                          <h4>{review.user?.name}</h4>
                          <p>{review.product?.name}</p>
                        </div>
                        <div className="review-rating">
                          {'⭐'.repeat(review.rating)}
                        </div>
                      </div>
                      <p className="review-comment">{review.comment}</p>
                      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                        <button
                          onClick={() => handleApproveReview(review._id)}
                          className="approve-btn"
                        >
                          Approve Review
                        </button>
                        <button
                          onClick={() => handleToggleReview(review._id)}
                          className={(review.isDisabled === true) ? "enable-btn" : "disable-btn"}
                          style={{ minWidth: '140px' }}
                        >
                          {(review.isDisabled === true) ? 'Enable Review' : 'Disable Review'}
                        </button>
                        <button
                          onClick={() => handleDeleteReview(review._id)}
                          className="delete-btn"
                          style={{ minWidth: '100px' }}
                        >
                          🗑️ Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ marginTop: '3rem' }}>
              <h2>All Reviews ({allReviews.length})</h2>
              {allReviews.length === 0 ? (
                <p style={{ padding: '1rem', background: '#f8f9fa', borderRadius: '8px' }}>No reviews found. Reviews will appear here once they are created.</p>
              ) : (
                <div className="reviews-list">
                  {allReviews.map((review) => (
                    <div key={review._id} className="review-card" style={{
                      opacity: (review.isDisabled === true) ? 0.6 : 1,
                      borderLeft: (review.isDisabled === true) ? '4px solid #dc3545' : '4px solid #28a745'
                    }}>
                      <div className="review-header">
                        <div>
                          <h4>{review.user?.name}</h4>
                          <p>{review.product?.name}</p>
                          <p style={{ fontSize: '0.85rem', color: '#666' }}>
                            {new Date(review.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="review-rating">
                          {'⭐'.repeat(review.rating)}
                        </div>
                      </div>
                      <p className="review-comment">{review.comment}</p>
                      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                        {!review.isApproved && (
                          <button
                            onClick={() => handleApproveReview(review._id)}
                            className="approve-btn"
                          >
                            Approve
                          </button>
                        )}
                        <button
                          onClick={() => handleToggleReview(review._id)}
                          className={(review.isDisabled === true) ? "enable-btn" : "disable-btn"}
                          style={{ minWidth: '140px' }}
                        >
                          {(review.isDisabled === true) ? 'Enable Review' : 'Disable Review'}
                        </button>
                        <button
                          onClick={() => handleDeleteReview(review._id)}
                          className="delete-btn"
                          style={{ minWidth: '100px' }}
                        >
                          🗑️ Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'images' && (
          <div className="images-management">
            <h2>Image Upload Dashboard</h2>
            
            <div className="upload-section">
              <h3>Upload Images</h3>
              <div className="upload-area">
                <input
                  type="file"
                  id="image-upload"
                  multiple
                  accept="image/*"
                  onChange={handleImageUpload}
                  style={{ display: 'none' }}
                />
                <label htmlFor="image-upload" className="upload-button">
                  {uploading ? 'Uploading...' : 'Choose Images to Upload'}
                </label>
                <p className="upload-hint">You can select multiple images at once (Max 5MB per image)</p>
              </div>
            </div>

            <div className="logo-section">
              <h3>Website Logo</h3>
              <div className="logo-info">
                <p><strong>📐 Recommended Size:</strong></p>
                <ul>
                  <li><strong>Optimal:</strong> 200-300 pixels wide (transparent background recommended)</li>
                  <li><strong>Format:</strong> PNG (with transparency) or JPG</li>
                  <li><strong>Max File Size:</strong> 5MB</li>
                </ul>
                <p className="size-warning">💡 The logo will appear in the navigation bar. Use a transparent PNG for best results.</p>
              </div>
              {logo ? (
                <div className="current-logo">
                  <p>Current logo:</p>
                  <div className="logo-preview">
                    <img src={getImageUrl(logo)} alt="Current Logo" className="logo-preview-img" />
                    <div className="logo-actions">
                      <button
                        onClick={handleRemoveLogo}
                        className="remove-logo-btn"
                        title="Remove logo"
                      >
                        × Remove Logo
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="no-logo">No logo set. Select an image below to set as logo.</p>
              )}
            </div>

            <div className="header-image-section">
              <h3>Home Page Header Carousel</h3>
              <div className="carousel-size-info">
                <p><strong>📐 Required Image Size:</strong></p>
                <ul>
                  <li><strong>Optimal:</strong> 1920 × 1080 pixels (16:9 aspect ratio)</li>
                  <li><strong>Minimum:</strong> 1200 × 675 pixels (16:9 aspect ratio)</li>
                  <li><strong>Format:</strong> JPG or PNG</li>
                  <li><strong>Max File Size:</strong> 5MB per image</li>
                </ul>
                <p className="size-warning">⚠️ Images that don't match 16:9 aspect ratio will be rejected</p>
              </div>
              {carouselItems.length > 0 ? (
                <div className="current-header-images">
                  <p>Current carousel items ({carouselItems.length}):</p>
                  <div className="header-images-list">
                    {carouselItems.map((item) => (
                      <div key={item._id} className="header-image-item">
                        <img 
                          src={getImageUrl(item.imageUrl)} 
                          alt={item.name || 'Carousel Item'}
                          onError={(e) => {
                            console.error('Failed to load carousel image:', item.imageUrl);
                            e.target.style.display = 'none';
                            // Show a placeholder or error message
                            const parent = e.target.parentElement;
                            if (parent && !parent.querySelector('.image-error')) {
                              const errorDiv = document.createElement('div');
                              errorDiv.className = 'image-error';
                              errorDiv.textContent = 'Image not found';
                              errorDiv.style.cssText = 'padding: 10px; background: #ffebee; color: #c62828; text-align: center;';
                              parent.insertBefore(errorDiv, e.target.nextSibling);
                            }
                          }}
                        />
                        <div className="carousel-item-info">
                          <p><strong>{item.name || 'Unnamed'}</strong></p>
                          <p>Button Text: <strong>{item.buttonText || 'Shop Now'}</strong></p>
                          <p>{item.productIds?.length || 0} product(s) selected</p>
                        {Array.isArray(item.countries) && item.countries.length > 0 && (
                          <p style={{ fontSize: '11px', color: '#555', marginTop: '4px' }}>
                            Visible in: <strong>{item.countries.join(', ')}</strong>
                          </p>
                        )}
                          {item.imageUrl && (
                            <p style={{ fontSize: '11px', color: '#666', wordBreak: 'break-all' }}>
                              URL: {item.imageUrl.substring(0, 50)}...
                            </p>
                          )}
                        </div>
                        <div className="carousel-item-actions">
                          <button
                            onClick={() => handleEditCarouselItem(item)}
                            className="edit-carousel-btn"
                            title="Edit carousel item"
                          >
                            ✏️ Edit
                          </button>
                          <button
                            onClick={() => handleDeleteCarouselItem(item._id)}
                            className="remove-header-btn"
                            title="Delete carousel item"
                          >
                            × Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="no-header-image">No carousel items set. Add images below to create carousel items.</p>
              )}
            </div>

            <div className="uploaded-images-section">
              <h3>All Uploaded Images ({filteredUploadedImages.length})</h3>
              {filteredUploadedImages.length > 0 ? (
                <div className="uploaded-images-grid">
                  {filteredUploadedImages.map((image, index) => (
                    <div key={index} className="uploaded-image-item">
                      <img 
                        src={getImageUrl(image.url || image)} 
                        alt={image.filename || `Image ${index + 1}`}
                        onError={(e) => {
                          console.error('Image load error:', image);
                          e.target.style.display = 'none';
                        }}
                      />
                      <div className="image-actions">
                        <button
                          onClick={() => copyImageUrl(image.url || image)}
                          className="copy-url-btn"
                          title="Copy image URL"
                        >
                          📋 Copy URL
                        </button>
                        <button
                          onClick={() => handleSetLogo(image.url || image)}
                          className="set-logo-btn"
                          title="Set as website logo"
                        >
                          🎨 Set as Logo
                        </button>
                        <button
                          onClick={() => handleCreateCarouselItem(image.url || image)}
                          className="add-header-btn"
                          title="Add to header carousel"
                        >
                          ➕ Add to Carousel
                        </button>
                        <button
                          onClick={() => handleDeleteImage(image)}
                          className="delete-image-btn"
                          title="Delete image"
                        >
                          🗑️ Delete
                        </button>
                      </div>
                      <p className="image-filename">{image.filename || 'Image'}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="no-images-message">No images uploaded yet. Upload images above to get started.</p>
              )}
            </div>

          </div>
        )}

        {activeTab === 'products' && (
          <div className="products-management">
            <div className="products-header">
              <h2>Products Management</h2>
              <button
                onClick={() => {
                  setShowProductForm(true);
                  setEditingProduct(null);
                  setProductForm({
                    name: '',
                    description: '',
                    price: '',
                    discountPrice: '',
                    category: '',
                    subcategory: '',
                    images: [],
                    sizes: [],
                    colors: [],
                    getPrintName: '',
                    isTrending: false,
                    pricingByCountry: [],
                    alsoInCategories: []
                  });
                }}
                className="add-product-btn"
              >
                + Add New Product
              </button>
            </div>

            {showProductForm && (
              <div className="product-form-modal">
                <div className="product-form-content">
                  <button
                    type="button"
                    className="product-form-close"
                    onClick={() => {
                      setShowProductForm(false);
                      setEditingProduct(null);
                    }}
                    aria-label="Close"
                  >
                    ×
                  </button>
                  <h3>{editingProduct ? 'Edit Product' : 'Add New Product'}</h3>
                  <form onSubmit={handleSubmitProduct}>
                    <div className="form-row">
                      <div className="form-group">
                        <label>Product Name *</label>
                        <input
                          type="text"
                          name="name"
                          value={productForm.name}
                          onChange={handleProductFormChange}
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label>Price (₹) *</label>
                        <input
                          type="number"
                          name="price"
                          value={productForm.price}
                          onChange={handleProductFormChange}
                          required
                          min="0"
                          step="0.01"
                        />
                      </div>
                    </div>

                    <div className="form-row">
                      <div className="form-group">
                        <label>Discount Price (₹)</label>
                        <input
                          type="number"
                          name="discountPrice"
                          value={productForm.discountPrice}
                          onChange={handleProductFormChange}
                          min="0"
                          step="0.01"
                        />
                      </div>
                      <div className="form-group">
                        <label>GetPrint Name *</label>
                        <input
                          type="text"
                          name="getPrintName"
                          value={productForm.getPrintName}
                          onChange={handleProductFormChange}
                          required
                          placeholder="Enter GetPrint Name"
                        />
                      </div>
                    </div>

                    <div className="form-row">
                      <div className="form-group">
                        <label>Category *</label>
                        <select
                          name="category"
                          value={productForm.category}
                          onChange={handleProductFormChange}
                          required
                        >
                          <option value="">Select Category</option>
                          {categories
                            .filter(cat => cat.isActive !== false) // Only show active categories in product form
                            .map((cat) => (
                            <option key={cat._id} value={cat.name}>
                              {cat.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="form-group">
                        <label>Subcategory *</label>
                        <select
                          name="subcategory"
                          value={productForm.subcategory}
                          onChange={handleProductFormChange}
                          required
                        >
                          <option value="">Select Subcategory</option>
                          {categories
                            .find(cat => cat.name === productForm.category)
                            ?.subcategories?.filter(sub => sub.isActive)
                            .map((sub) => (
                              <option key={sub._id} value={sub.slug}>
                                {sub.name}
                              </option>
                            ))}
                        </select>
                      </div>
                    </div>

                    {/* Checkbox to show product in opposite gender's subcategory if it exists */}
                    {productForm.category && productForm.subcategory && (() => {
                      // Check for Men -> Women
                      if (productForm.category === 'Men') {
                        const womenCategory = categories.find(cat => cat.name === 'Women');
                        const selectedSubcategorySlug = productForm.subcategory;
                        const womenSubcategory = womenCategory?.subcategories?.find(
                          sub => sub.slug === selectedSubcategorySlug && sub.isActive
                        );
                        const isChecked = productForm.alsoInCategories?.some(
                          item => {
                            const matches = item.category === 'Women' && item.subcategory === selectedSubcategorySlug;
                            if (matches) {
                              console.log('[CHECKBOX] Match found:', { item, selectedSubcategorySlug });
                            }
                            return matches;
                          }
                        ) || false;
                        
                        return womenSubcategory ? (
                          <div className="form-group" style={{ marginTop: '0.5rem', marginBottom: '1rem' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                              <input
                                type="checkbox"
                                checked={isChecked || false}
                                onChange={(e) => {
                                  const currentAlsoIn = productForm.alsoInCategories || [];
                                  if (e.target.checked) {
                                    // Add to alsoInCategories if not already present
                                    if (!isChecked) {
                                      setProductForm({
                                        ...productForm,
                                        alsoInCategories: [
                                          ...currentAlsoIn,
                                          { category: 'Women', subcategory: selectedSubcategorySlug }
                                        ]
                                      });
                                    }
                                  } else {
                                    // Remove from alsoInCategories
                                    setProductForm({
                                      ...productForm,
                                      alsoInCategories: currentAlsoIn.filter(
                                        item => !(item.category === 'Women' && item.subcategory === selectedSubcategorySlug)
                                      )
                                    });
                                  }
                                }}
                              />
                              <span>Also show this product in <strong>Women</strong> → <strong>{womenSubcategory.name}</strong> subcategory</span>
                            </label>
                          </div>
                        ) : null;
                      }
                      // Check for Women -> Men
                      else if (productForm.category === 'Women') {
                        const menCategory = categories.find(cat => cat.name === 'Men');
                        const selectedSubcategorySlug = productForm.subcategory;
                        const menSubcategory = menCategory?.subcategories?.find(
                          sub => sub.slug === selectedSubcategorySlug && sub.isActive
                        );
                        const isChecked = productForm.alsoInCategories?.some(
                          item => {
                            const matches = item.category === 'Men' && item.subcategory === selectedSubcategorySlug;
                            if (matches) {
                              console.log('[CHECKBOX Women->Men] Match found:', { item, selectedSubcategorySlug, alsoInCategories: productForm.alsoInCategories });
                            }
                            return matches;
                          }
                        ) || false;
                        
                        return menSubcategory ? (
                          <div className="form-group" style={{ marginTop: '0.5rem', marginBottom: '1rem' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                              <input
                                type="checkbox"
                                checked={isChecked || false}
                                onChange={(e) => {
                                  const currentAlsoIn = productForm.alsoInCategories || [];
                                  if (e.target.checked) {
                                    // Add to alsoInCategories if not already present
                                    if (!isChecked) {
                                      setProductForm({
                                        ...productForm,
                                        alsoInCategories: [
                                          ...currentAlsoIn,
                                          { category: 'Men', subcategory: selectedSubcategorySlug }
                                        ]
                                      });
                                    }
                                  } else {
                                    // Remove from alsoInCategories
                                    setProductForm({
                                      ...productForm,
                                      alsoInCategories: currentAlsoIn.filter(
                                        item => !(item.category === 'Men' && item.subcategory === selectedSubcategorySlug)
                                      )
                                    });
                                  }
                                }}
                              />
                              <span>Also show this product in <strong>Men</strong> → <strong>{menSubcategory.name}</strong> subcategory</span>
                            </label>
                          </div>
                        ) : null;
                      }
                      return null;
                    })()}

                    <div className="form-group">
                      <label>Description *</label>
                      <textarea
                        name="description"
                        value={productForm.description}
                        onChange={handleProductFormChange}
                        required
                        rows="4"
                      />
                    </div>

                    <div className="form-group">
                      <label>Product Sizes</label>
                      <div className="sizes-container">
                        {productForm.sizes.map((sizeItem, index) => (
                          <div key={index} className="size-item-row">
                            <select
                              value={sizeItem.size || ''}
                              onChange={(e) => {
                                const newSizes = [...productForm.sizes];
                                newSizes[index] = { ...newSizes[index], size: e.target.value };
                                setProductForm({ ...productForm, sizes: newSizes });
                              }}
                              className="size-select"
                            >
                              <option value="">Select Size</option>
                              {productForm.category === 'Kids' ? (
                                <>
                                  <option value="0-1 yr(20)">0-1 yr(20)</option>
                                  <option value="1-2 yr(22)">1-2 yr(22)</option>
                                  <option value="2-3 yr(24)">2-3 yr(24)</option>
                                  <option value="3-4 yr(26)">3-4 yr(26)</option>
                                  <option value="5-6 yr(28)">5-6 yr(28)</option>
                                  <option value="7-8 yr(30)">7-8 yr(30)</option>
                                  <option value="9-10 yr(32)">9-10 yr(32)</option>
                                  <option value="11-12 yr(34)">11-12 yr(34)</option>
                                </>
                              ) : (
                                <>
                                  <option value="XS">XS</option>
                                  <option value="S">S</option>
                                  <option value="M">M</option>
                                  <option value="L">L</option>
                                  <option value="XL">XL</option>
                                  <option value="2XL">2XL</option>
                                  <option value="3XL">3XL</option>
                                  <option value="4XL">4XL</option>
                                  <option value="5XL">5XL</option>
                                  <option value="6XL">6XL</option>
                                  <option value="7XL">7XL</option>
                                </>
                              )}
                            </select>
                            <input
                              type="number"
                              placeholder="Price"
                              value={sizeItem.price || ''}
                              onChange={(e) => {
                                const newSizes = [...productForm.sizes];
                                newSizes[index] = { ...newSizes[index], price: parseFloat(e.target.value) || '' };
                                setProductForm({ ...productForm, sizes: newSizes });
                              }}
                              className="size-price"
                              min="0"
                              step="0.01"
                            />
                            <input
                              type="number"
                              placeholder="Discount Price (optional)"
                              value={sizeItem.discountPrice || ''}
                              onChange={(e) => {
                                const newSizes = [...productForm.sizes];
                                newSizes[index] = { ...newSizes[index], discountPrice: parseFloat(e.target.value) || '' };
                                setProductForm({ ...productForm, sizes: newSizes });
                              }}
                              className="size-discount-price"
                              min="0"
                              step="0.01"
                            />
                            <input
                              type="number"
                              placeholder="Stock"
                              value={sizeItem.stock || ''}
                              onChange={(e) => {
                                const newSizes = [...productForm.sizes];
                                newSizes[index] = { ...newSizes[index], stock: parseInt(e.target.value) || 0 };
                                setProductForm({ ...productForm, sizes: newSizes });
                              }}
                              className="size-stock"
                              min="0"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                const newSizes = productForm.sizes.filter((_, i) => i !== index);
                                setProductForm({ ...productForm, sizes: newSizes });
                              }}
                              className="remove-size-btn"
                            >
                              ×
                            </button>
                          </div>
                        ))}
                        <button
                          type="button"
                          onClick={() => {
                            setProductForm({
                              ...productForm,
                              sizes: [...productForm.sizes, { size: '', price: '', discountPrice: '', stock: 0 }]
                            });
                          }}
                          className="add-size-btn"
                        >
                          + Add Size
                        </button>
                      </div>
                    </div>

                    {/* Product Colors - Show when subcategory is selected */}
                    {productForm.category && productForm.subcategory && (() => {
                      const selectedCategory = categories.find(cat => cat.name === productForm.category);
                      const selectedSubcategory = selectedCategory?.subcategories?.find(
                        sub => sub.slug === productForm.subcategory
                      );
                      const subcategoryColors = selectedSubcategory?.colors || [];
                      
                      return subcategoryColors.length > 0 ? (
                        <div className="form-group">
                          <label>Product Colors (from {selectedSubcategory?.name})</label>
                          <div className="colors-container">
                            <div className="subcategory-colors-section">
                              <p className="colors-hint">
                                <strong>Available colors from "{selectedSubcategory?.name}" subcategory ({subcategoryColors.length} colors):</strong>
                              </p>
                              <div className="color-options">
                                {subcategoryColors
                                  .filter(color => color && color.trim() !== '')
                                  .map((color, index) => {
                                    // Check if this color is already selected
                                    const isSelected = productForm.colors.some(c => {
                                      const cName = typeof c === 'string' ? c : (c?.color || '');
                                      return cName === color;
                                    });
                                    
                                    // Get images for this color if selected
                                    const colorItem = productForm.colors.find(c => {
                                      const cName = typeof c === 'string' ? c : (c?.color || '');
                                      return cName === color;
                                    });
                                    const colorImages = colorItem && typeof colorItem === 'object' ? (colorItem.images || []) : [];
                                    
                                    return (
                                      <div key={index} className="color-option-with-upload">
                                        <label className="color-option">
                                          <input
                                            type="checkbox"
                                            checked={isSelected}
                                            onChange={(e) => {
                                              if (e.target.checked) {
                                                // Add color if not already selected
                                                if (!isSelected) {
                                                  setProductForm({
                                                    ...productForm,
                                                    colors: [...productForm.colors, { color: color, images: [] }]
                                                  });
                                                }
                                              } else {
                                                // Remove color
                                                setProductForm({
                                                  ...productForm,
                                                  colors: productForm.colors.filter(c => {
                                                    const cName = typeof c === 'string' ? c : (c?.color || '');
                                                    return cName !== color;
                                                  })
                                                });
                                              }
                                            }}
                                          />
                                          <span 
                                            className="color-label"
                                            style={{ 
                                              backgroundColor: getColorValue(color),
                                              color: getContrastColor(color)
                                            }}
                                          >
                                            {color}
                                          </span>
                                        </label>
                                        
                                        {/* Upload button - only show if color is selected */}
                                        {isSelected && (
                                          <div className="color-upload-section">
                                            <input
                                              type="file"
                                              id={`color-image-${color}-${index}`}
                                              multiple
                                              accept="image/*"
                                              onChange={async (e) => {
                                                const files = Array.from(e.target.files);
                                                if (files.length === 0) return;

                                                setUploading(true);
                                                try {
                                                  const formData = new FormData();
                                                  if (files.length === 1) {
                                                    formData.append('image', files[0]);
                                                    const res = await api.post('/api/upload/single', formData, {
                                                      headers: {
                                                        Authorization: `Bearer ${localStorage.getItem('token')}`,
                                                        'Content-Type': 'multipart/form-data'
                                                      }
                                                    });
                                                    const imageUrl = getImageUrl(res.data.imageUrl);
                                                    
                                                    // Find the color in the colors array and add image
                                                    const updatedColors = productForm.colors.map(c => {
                                                      const cName = typeof c === 'string' ? c : (c?.color || '');
                                                      if (cName === color) {
                                                        if (typeof c === 'object') {
                                                          return { ...c, images: [...(c.images || []), imageUrl] };
                                                        } else {
                                                          return { color: color, images: [imageUrl] };
                                                        }
                                                      }
                                                      return c;
                                                    });
                                                    
                                                    setProductForm({
                                                      ...productForm,
                                                      colors: updatedColors
                                                    });
                                                    toast.success('Image uploaded for ' + color);
                                                  } else {
                                                    files.forEach(file => {
                                                      formData.append('images', file);
                                                    });
                                                    const res = await api.post('/api/upload/multiple', formData, {
                                                      headers: {
                                                        Authorization: `Bearer ${localStorage.getItem('token')}`,
                                                        'Content-Type': 'multipart/form-data'
                                                      }
                                                    });
                                                    const newImages = res.data.images.map(img => getImageUrl(img.url));
                                                    
                                                    // Find the color in the colors array and add images
                                                    const updatedColors = productForm.colors.map(c => {
                                                      const cName = typeof c === 'string' ? c : (c?.color || '');
                                                      if (cName === color) {
                                                        if (typeof c === 'object') {
                                                          return { ...c, images: [...(c.images || []), ...newImages] };
                                                        } else {
                                                          return { color: color, images: newImages };
                                                        }
                                                      }
                                                      return c;
                                                    });
                                                    
                                                    setProductForm({
                                                      ...productForm,
                                                      colors: updatedColors
                                                    });
                                                    toast.success(`${newImages.length} images uploaded for ${color}`);
                                                  }
                                                  fetchImages();
                                                  e.target.value = '';
                                                } catch (error) {
                                                  toast.error('Error uploading images');
                                                } finally {
                                                  setUploading(false);
                                                }
                                              }}
                                              disabled={uploading}
                                              style={{ display: 'none' }}
                                            />
                                            <label 
                                              htmlFor={`color-image-${color}-${index}`} 
                                              className="color-upload-button-small"
                                            >
                                              {uploading ? 'Uploading...' : '📷 Upload'}
                                            </label>
                                          </div>
                                        )}
                                        
                                        {/* Show uploaded images preview - below the row */}
                                        {isSelected && colorImages.length > 0 && (
                                          <div className="color-images-preview-small" style={{ width: '100%', marginTop: '0.5rem' }}>
                                            {colorImages.map((img, imgIndex) => (
                                              <div key={imgIndex} className="color-image-preview-small">
                                                <img 
                                                  src={getImageUrl(img)} 
                                                  alt={`${color} ${imgIndex + 1}`}
                                                />
                                                <button
                                                  type="button"
                                                  onClick={() => handleDownloadImage(img)}
                                                  className="download-image-btn-small"
                                                  title="Download image"
                                                >
                                                  ⬇️
                                                </button>
                                                <button
                                                  type="button"
                                                  onClick={() => {
                                                    const updatedColors = productForm.colors.map(c => {
                                                      const cName = typeof c === 'string' ? c : (c?.color || '');
                                                      if (cName === color && typeof c === 'object') {
                                                        return { ...c, images: c.images.filter((_, i) => i !== imgIndex) };
                                                      }
                                                      return c;
                                                    });
                                                    setProductForm({
                                                      ...productForm,
                                                      colors: updatedColors
                                                    });
                                                  }}
                                                  className="remove-image-btn-small"
                                                  title="Remove image"
                                                >
                                                  ×
                                                </button>
                                              </div>
                                            ))}
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : null;
                    })()}

                    <div className="form-group">
                      <label>Country-Specific Pricing (Optional)</label>
                      <p style={{ fontSize: '0.85rem', color: '#666', marginBottom: '0.75rem' }}>
                        Set different prices and currencies for different countries. If not set, default price will be used.
                      </p>
                      <div className="country-pricing-container">
                        {(productForm.pricingByCountry || []).map((countryPricing, countryIndex) => (
                          <div key={countryIndex} className="country-pricing-item" style={{ 
                            border: '1px solid #e2e8f0', 
                            borderRadius: '8px', 
                            padding: '1rem', 
                            marginBottom: '1rem',
                            backgroundColor: '#f8f9fa'
                          }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                              <h4 style={{ margin: 0, fontSize: '1rem' }}>Country Pricing #{countryIndex + 1}</h4>
                              <button
                                type="button"
                                onClick={() => {
                                  const newPricing = productForm.pricingByCountry.filter((_, i) => i !== countryIndex);
                                  setProductForm({ ...productForm, pricingByCountry: newPricing });
                                }}
                                style={{
                                  background: '#ef4444',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: '4px',
                                  padding: '0.4rem 0.8rem',
                                  cursor: 'pointer',
                                  fontSize: '0.85rem'
                                }}
                              >
                                Remove
                              </button>
                            </div>
                            <div className="form-row">
                              <div className="form-group">
                                <label>Country *</label>
                                <select
                                  value={countryPricing.country || ''}
                                  onChange={(e) => {
                                    const newPricing = [...productForm.pricingByCountry];
                                    const selectedCountry = e.target.value;
                                    // Find the matching country currency to auto-set currency
                                    const matchingCurrency = countryCurrencies.find(cc => cc.country === selectedCountry);
                                    newPricing[countryIndex] = { 
                                      ...newPricing[countryIndex], 
                                      country: selectedCountry,
                                      currency: matchingCurrency ? matchingCurrency.currency : newPricing[countryIndex].currency
                                    };
                                    setProductForm({ ...productForm, pricingByCountry: newPricing });
                                  }}
                                  required
                                >
                                  <option value="">Select Country</option>
                                  {countryCurrencies
                                    .sort((a, b) => (a.order || 0) - (b.order || 0) || a.country.localeCompare(b.country))
                                    .map((cc) => (
                                      <option key={cc._id} value={cc.country}>
                                        {cc.country} ({cc.countryCode}){!cc.isActive ? ' (Inactive)' : ''}
                                      </option>
                                    ))}
                                </select>
                              </div>
                              <div className="form-group">
                                <label>Currency *</label>
                                <select
                                  value={countryPricing.currency || ''}
                                  onChange={(e) => {
                                    const newPricing = [...productForm.pricingByCountry];
                                    newPricing[countryIndex] = { ...newPricing[countryIndex], currency: e.target.value };
                                    setProductForm({ ...productForm, pricingByCountry: newPricing });
                                  }}
                                  required
                                >
                                  <option value="">Select Currency</option>
                                  {countryCurrencies
                                    .sort((a, b) => (a.order || 0) - (b.order || 0) || a.currency.localeCompare(b.currency))
                                    .map((cc) => (
                                      <option key={cc._id} value={cc.currency}>
                                        {cc.currency} ({cc.currencySymbol}) - {cc.country}{!cc.isActive ? ' (Inactive)' : ''}
                                      </option>
                                    ))}
                                </select>
                              </div>
                            </div>
                            <div className="form-row">
                              <div className="form-group">
                                <label>Price *</label>
                                <input
                                  type="number"
                                  value={countryPricing.price || ''}
                                  onChange={(e) => {
                                    const newPricing = [...productForm.pricingByCountry];
                                    newPricing[countryIndex] = { ...newPricing[countryIndex], price: e.target.value };
                                    setProductForm({ ...productForm, pricingByCountry: newPricing });
                                  }}
                                  required
                                  min="0"
                                  step="0.01"
                                  placeholder="Enter price"
                                />
                              </div>
                              <div className="form-group">
                                <label>Discount Price (Optional)</label>
                                <input
                                  type="number"
                                  value={countryPricing.discountPrice || ''}
                                  onChange={(e) => {
                                    const newPricing = [...productForm.pricingByCountry];
                                    newPricing[countryIndex] = { ...newPricing[countryIndex], discountPrice: e.target.value };
                                    setProductForm({ ...productForm, pricingByCountry: newPricing });
                                  }}
                                  min="0"
                                  step="0.01"
                                  placeholder="Enter discount price"
                                />
                              </div>
                            </div>
                            <div className="form-group" style={{ marginTop: '0.75rem' }}>
                              <label>Size-Specific Prices (Optional)</label>
                              <div className="sizes-container">
                                {(countryPricing.sizes || []).map((sizeItem, sizeIndex) => (
                                  <div key={sizeIndex} className="size-item-row">
                                    <select
                                      value={sizeItem.size || ''}
                                      onChange={(e) => {
                                        const newPricing = [...productForm.pricingByCountry];
                                        const newSizes = [...(newPricing[countryIndex].sizes || [])];
                                        newSizes[sizeIndex] = { ...newSizes[sizeIndex], size: e.target.value };
                                        newPricing[countryIndex] = { ...newPricing[countryIndex], sizes: newSizes };
                                        setProductForm({ ...productForm, pricingByCountry: newPricing });
                                      }}
                                      className="size-select"
                                    >
                                      <option value="">Select Size</option>
                                      {productForm.category === 'Kids' ? (
                                        <>
                                          <option value="0-1 yr(20)">0-1 yr(20)</option>
                                          <option value="1-2 yr(22)">1-2 yr(22)</option>
                                          <option value="2-3 yr(24)">2-3 yr(24)</option>
                                          <option value="3-4 yr(26)">3-4 yr(26)</option>
                                          <option value="5-6 yr(28)">5-6 yr(28)</option>
                                          <option value="7-8 yr(30)">7-8 yr(30)</option>
                                          <option value="9-10 yr(32)">9-10 yr(32)</option>
                                          <option value="11-12 yr(34)">11-12 yr(34)</option>
                                        </>
                                      ) : (
                                        <>
                                          <option value="XS">XS</option>
                                          <option value="S">S</option>
                                          <option value="M">M</option>
                                          <option value="L">L</option>
                                          <option value="XL">XL</option>
                                          <option value="2XL">2XL</option>
                                          <option value="3XL">3XL</option>
                                          <option value="4XL">4XL</option>
                                          <option value="5XL">5XL</option>
                                          <option value="6XL">6XL</option>
                                          <option value="7XL">7XL</option>
                                        </>
                                      )}
                                    </select>
                                    <input
                                      type="number"
                                      placeholder="Price"
                                      value={sizeItem.price || ''}
                                      onChange={(e) => {
                                        const newPricing = [...productForm.pricingByCountry];
                                        const newSizes = [...(newPricing[countryIndex].sizes || [])];
                                        newSizes[sizeIndex] = { ...newSizes[sizeIndex], price: parseFloat(e.target.value) || '' };
                                        newPricing[countryIndex] = { ...newPricing[countryIndex], sizes: newSizes };
                                        setProductForm({ ...productForm, pricingByCountry: newPricing });
                                      }}
                                      className="size-price"
                                      min="0"
                                      step="0.01"
                                    />
                                    <input
                                      type="number"
                                      placeholder="Discount Price"
                                      value={sizeItem.discountPrice || ''}
                                      onChange={(e) => {
                                        const newPricing = [...productForm.pricingByCountry];
                                        const newSizes = [...(newPricing[countryIndex].sizes || [])];
                                        newSizes[sizeIndex] = { ...newSizes[sizeIndex], discountPrice: parseFloat(e.target.value) || '' };
                                        newPricing[countryIndex] = { ...newPricing[countryIndex], sizes: newSizes };
                                        setProductForm({ ...productForm, pricingByCountry: newPricing });
                                      }}
                                      className="size-discount-price"
                                      min="0"
                                      step="0.01"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const newPricing = [...productForm.pricingByCountry];
                                        const newSizes = (newPricing[countryIndex].sizes || []).filter((_, i) => i !== sizeIndex);
                                        newPricing[countryIndex] = { ...newPricing[countryIndex], sizes: newSizes };
                                        setProductForm({ ...productForm, pricingByCountry: newPricing });
                                      }}
                                      className="remove-size-btn"
                                    >
                                      ×
                                    </button>
                                  </div>
                                ))}
                                <button
                                  type="button"
                                  onClick={() => {
                                    const newPricing = [...productForm.pricingByCountry];
                                    const newSizes = [...(newPricing[countryIndex].sizes || []), { size: '', price: '', discountPrice: '' }];
                                    newPricing[countryIndex] = { ...newPricing[countryIndex], sizes: newSizes };
                                    setProductForm({ ...productForm, pricingByCountry: newPricing });
                                  }}
                                  className="add-size-btn"
                                  style={{ marginTop: '0.5rem' }}
                                >
                                  + Add Size for this Country
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                        <button
                          type="button"
                          onClick={() => {
                            setProductForm({
                              ...productForm,
                              pricingByCountry: [...(productForm.pricingByCountry || []), {
                                country: '',
                                currency: '',
                                price: '',
                                discountPrice: '',
                                sizes: []
                              }]
                            });
                          }}
                          style={{
                            background: '#667eea',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            padding: '0.75rem 1.5rem',
                            cursor: 'pointer',
                            fontSize: '0.95rem',
                            fontWeight: '600',
                            marginTop: '0.5rem'
                          }}
                        >
                          + Add Country Pricing
                        </button>
                      </div>
                    </div>

                    <div className="form-group">
                      <label>
                        <input
                          type="checkbox"
                          name="isTrending"
                          checked={productForm.isTrending}
                          onChange={(e) => setProductForm({ ...productForm, isTrending: e.target.checked })}
                        />
                        Mark as Trending Product
                      </label>
                    </div>


                    <div className="form-actions">
                      <button type="submit" className="save-btn">
                        {editingProduct ? 'Update Product' : 'Create Product'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowProductForm(false);
                          setEditingProduct(null);
                        }}
                        className="cancel-btn"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            <div className="products-list">
              <h3>All Products ({products.length})</h3>
              {products.length === 0 ? (
                <p>No products yet. Add your first product!</p>
              ) : (
                <div className="products-grid-admin">
                  {products.map((product) => (
                    <div key={product._id} className="product-card-admin">
                      <div className="product-image-admin">
                        {product.images && product.images[0] ? (
                          <img
                            src={getImageUrl(product.images[0])}
                            alt={product.name}
                          />
                        ) : (
                          <div className="placeholder-image">No Image</div>
                        )}
                      </div>
                      <div className="product-info-admin">
                        <h4>{product.name}</h4>
                        <p className="product-category">{product.category} - {product.subcategory}</p>
                        <p className="product-price-admin">
                          ₹{product.discountPrice || product.price}
                          {product.discountPrice && (
                            <span className="original-price">₹{product.price}</span>
                          )}
                        </p>
                        <p className="product-getprint-name">GetPrint Name: {product.getPrintName || 'N/A'}</p>
                      </div>
                      <div className="product-actions-admin">
                        <button
                          onClick={() => handleEditProduct(product)}
                          className="edit-btn"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteProduct(product._id)}
                          className="delete-btn"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'allProducts' && (
          <div className="all-products-management">
            <h2>All Products by Category</h2>
            <p className="all-products-description">
              Browse all products organized by category (Men, Women, Kids) and subcategory.
            </p>
            
            <div className="search-bar-section">
              <div className="search-bar-container">
                <input
                  type="text"
                  placeholder="Search products by name, description, or GetPrint name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="search-input"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="clear-search-btn"
                    title="Clear search"
                  >
                    ×
                  </button>
                )}
              </div>
            </div>
            
            <div className="category-filter-section">
              <div className="category-buttons">
                <button
                  onClick={() => {
                    setSelectedCategory(null);
                    setSelectedSubcategory(null);
                  }}
                  className={selectedCategory === null ? 'active' : ''}
                >
                  All Categories
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat._id}
                    onClick={() => {
                      setSelectedCategory(cat.name);
                      setSelectedSubcategory(null);
                    }}
                    className={selectedCategory === cat.name ? 'active' : ''}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
              
              {selectedCategory && (() => {
                const selectedCat = categories.find(cat => cat.name === selectedCategory);
                const subcategories = selectedCat?.subcategories?.filter(sub => sub.isActive) || [];
                
                if (subcategories.length > 0) {
                  return (
                    <div className="subcategory-filter-section">
                      <h4 className="subcategory-filter-title">Subcategories:</h4>
                      <div className="subcategory-buttons">
                        <button
                          onClick={() => setSelectedSubcategory(null)}
                          className={selectedSubcategory === null ? 'active' : ''}
                        >
                          All Subcategories
                        </button>
                        {subcategories.map((sub) => (
                          <button
                            key={sub._id}
                            onClick={() => setSelectedSubcategory(sub.slug)}
                            className={selectedSubcategory === sub.slug ? 'active' : ''}
                          >
                            {sub.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                }
                return null;
              })()}
            </div>

            <div className="products-by-category">
              {(() => {
                // Filter products by selected category and subcategory
                // Include products where category/subcategory matches OR appears in alsoInCategories
                let filteredProducts = allProducts;
                if (selectedCategory) {
                  filteredProducts = allProducts.filter(p => {
                    // Check primary category
                    if (p.category === selectedCategory) {
                      return true;
                    }
                    // Check alsoInCategories
                    if (p.alsoInCategories && Array.isArray(p.alsoInCategories)) {
                      return p.alsoInCategories.some(item => item.category === selectedCategory);
                    }
                    return false;
                  });
                }
                if (selectedSubcategory) {
                  filteredProducts = filteredProducts.filter(p => {
                    // Check primary subcategory
                    const primaryMatch = p.subcategory === selectedSubcategory || 
                      p.subcategory.toLowerCase() === selectedSubcategory.toLowerCase();
                    if (primaryMatch && (!selectedCategory || p.category === selectedCategory)) {
                      return true;
                    }
                    // Check alsoInCategories
                    if (p.alsoInCategories && Array.isArray(p.alsoInCategories)) {
                      return p.alsoInCategories.some(item => {
                        const subcategoryMatch = item.subcategory === selectedSubcategory ||
                          item.subcategory?.toLowerCase() === selectedSubcategory.toLowerCase();
                        const categoryMatch = !selectedCategory || item.category === selectedCategory;
                        return subcategoryMatch && categoryMatch;
                      });
                    }
                    return false;
                  });
                }
                
                // Filter by search term
                if (searchTerm.trim()) {
                  const searchLower = searchTerm.toLowerCase().trim();
                  filteredProducts = filteredProducts.filter(p => 
                    p.name?.toLowerCase().includes(searchLower) ||
                    p.description?.toLowerCase().includes(searchLower) ||
                    p.getPrintName?.toLowerCase().includes(searchLower) ||
                    p.category?.toLowerCase().includes(searchLower) ||
                    p.subcategory?.toLowerCase().includes(searchLower)
                  );
                }

                // Group products by category and subcategory
                const groupedProducts = {};
                filteredProducts.forEach(product => {
                  const category = product.category;
                  const subcategory = product.subcategory;
                  
                  if (!groupedProducts[category]) {
                    groupedProducts[category] = {};
                  }
                  if (!groupedProducts[category][subcategory]) {
                    groupedProducts[category][subcategory] = [];
                  }
                  groupedProducts[category][subcategory].push(product);
                });

                // Get categories to display
                const categoriesToShow = selectedCategory 
                  ? [selectedCategory] 
                  : ['Men', 'Women', 'Kids'];

                if (filteredProducts.length === 0) {
                  return (
                    <div className="no-products-message">
                      <p>No products found{
                        searchTerm 
                          ? ` matching "${searchTerm}"`
                          : selectedCategory 
                            ? selectedSubcategory 
                              ? ` in ${selectedCategory} - ${categories.find(cat => cat.name === selectedCategory)?.subcategories?.find(sub => sub.slug === selectedSubcategory)?.name || selectedSubcategory}`
                              : ` in ${selectedCategory}`
                            : ''
                      }.</p>
                    </div>
                  );
                }

                return categoriesToShow.map(categoryName => {
                  const categoryProducts = groupedProducts[categoryName] || {};
                  let subcategories = Object.keys(categoryProducts);
                  
                  // If a subcategory is selected, only show that subcategory
                  if (selectedSubcategory) {
                    subcategories = subcategories.filter(sub => 
                      sub === selectedSubcategory || sub.toLowerCase() === selectedSubcategory.toLowerCase()
                    );
                  }
                  
                  if (subcategories.length === 0) {
                    return null;
                  }

                  // Get the category object to map subcategory slugs to names
                  const categoryObj = categories.find(cat => cat.name === categoryName);

                  return (
                    <div key={categoryName} className="category-section">
                      <h3 className="category-title">{categoryName}</h3>
                      {subcategories.map(subcategorySlug => {
                        const products = categoryProducts[subcategorySlug];
                        // Find the subcategory name from the category object
                        const subcategoryObj = categoryObj?.subcategories?.find(
                          sub => sub.slug === subcategorySlug || sub.slug.toLowerCase() === subcategorySlug.toLowerCase()
                        );
                        const subcategoryName = subcategoryObj?.name || subcategorySlug;
                        
                        return (
                          <div key={subcategorySlug} className="subcategory-section">
                            <h4 className="subcategory-title">{subcategoryName}</h4>
                            <div className="products-grid-category">
                              {products.map(product => (
                                <div key={product._id} className="product-card-category">
                                  <div className="product-image-category">
                                    {product.images && product.images[0] ? (
                                      <img
                                        src={getImageUrl(product.images[0])}
                                        alt={product.name}
                                      />
                                    ) : (
                                      <div className="placeholder-image">No Image</div>
                                    )}
                                  </div>
                                  <div className="product-info-category">
                                    <h5>{product.name}</h5>
                                    <p className="product-price-category">
                                      ₹{product.discountPrice || product.price}
                                      {product.discountPrice && (
                                        <span className="original-price">₹{product.price}</span>
                                      )}
                                    </p>
                                    <p className="product-getprint-category">
                                      GetPrint: {product.getPrintName || 'N/A'}
                                    </p>
                                  </div>
                                  <div className="product-actions-category">
                                    <button
                                      onClick={() => {
                                        handleEditProduct(product);
                                        // Switch to the main Products tab so the edit form is visible
                                        setActiveTab('products');
                                      }}
                                      className="edit-btn-small"
                                    >
                                      Edit
                                    </button>
                                    <button
                                      onClick={() => handleDeleteProduct(product._id)}
                                      className="delete-btn-small"
                                    >
                                      Delete
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        )}

        {activeTab === 'trending' && (
          <div className="trending-management">
            <h2>Trending Products Management</h2>
            <p className="trending-description">
              Select products to feature in the "Now Trending" section on the home page.
            </p>
            
            <div className="trending-products-list">
              <h3>All Products</h3>
              {products.length === 0 ? (
                <p>No products available. Create products first.</p>
              ) : (
                <div className="trending-products-grid">
                  {products.map((product) => (
                    <div key={product._id} className="trending-product-card">
                      <div className="trending-product-image">
                        {product.images && product.images[0] ? (
                          <img
                            src={getImageUrl(product.images[0])}
                            alt={product.name}
                          />
                        ) : (
                          <div className="placeholder-image">No Image</div>
                        )}
                      </div>
                      <div className="trending-product-info">
                        <h4>{product.name}</h4>
                        <p className="trending-product-category">{product.category} - {product.subcategory}</p>
                        <p className="trending-product-price">₹{product.discountPrice || product.price}</p>
                      </div>
                      <div className="trending-product-toggle">
                        <label className="trending-toggle-label">
                          <input
                            type="checkbox"
                            checked={product.isTrending || false}
                            onChange={() => handleToggleTrending(product._id, !product.isTrending)}
                          />
                          <span className={product.isTrending ? 'trending-active' : ''}>
                            {product.isTrending ? '🔥 Trending' : 'Mark as Trending'}
                          </span>
                        </label>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'notes' && (
          <div className="notes-management">
            <h2>Notes</h2>
            <p className="notes-description">
              Write and save your notes here. Use this space for reminders, ideas, or any information you want to keep track of.
            </p>
            
            <div className="notes-section">
              <div className="notes-header">
                <h3>My Notes</h3>
                <div className="notes-actions">
                  {!isEditingNotes ? (
                    <button
                      onClick={handleEditNotes}
                      className="edit-notes-btn"
                    >
                      ✏️ Edit
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={saveNotes}
                        className="save-notes-btn"
                      >
                        💾 Save
                      </button>
                      <button
                        onClick={handleCancelNotes}
                        className="cancel-notes-btn"
                      >
                        ❌ Cancel
                      </button>
                    </>
                  )}
                </div>
              </div>
              
              <textarea
                className="notes-textarea"
                value={notes || ''}
                onChange={(e) => setNotes(e.target.value || '')}
                disabled={!isEditingNotes}
                placeholder="Write your notes here..."
                rows={20}
              />
              
              {notes && !isEditingNotes && (
                <div className="notes-info">
                  <p>Last saved: {originalNotes === notes ? 'Just now' : 'Unsaved changes'}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'country-currency' && (
          <div className="country-currency-management">
            <div className="country-currency-header">
              <h2>Country & Currency Management</h2>
              <div className="country-currency-header-actions">
                <button onClick={initializeDefaultCountries} className="initialize-countries-btn">
                  🔄 Initialize Navbar Countries
                </button>
                <button onClick={handleCreateCountryCurrency} className="create-country-currency-btn">
                  + Add Country & Currency
                </button>
              </div>
            </div>

            {showCountryCurrencyForm && (
              <div className="country-currency-form-section">
                <h3>{editingCountryCurrency ? 'Edit Country & Currency' : 'Add New Country & Currency'}</h3>
                <div className="country-currency-form">
                  <div className="form-group">
                    <label>Country Name *</label>
                    <input
                      type="text"
                      value={countryCurrencyForm.country}
                      onChange={(e) => setCountryCurrencyForm({ ...countryCurrencyForm, country: e.target.value })}
                      placeholder="e.g., India, USA, United Kingdom"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Country Code *</label>
                    <input
                      type="text"
                      value={countryCurrencyForm.countryCode}
                      onChange={(e) => setCountryCurrencyForm({ ...countryCurrencyForm, countryCode: e.target.value.toUpperCase() })}
                      placeholder="e.g., IN, US, GB"
                      maxLength="3"
                      required
                    />
                    <small>2-3 letter country code (ISO format)</small>
                  </div>
                  <div className="form-group">
                    <label>Currency Code *</label>
                    <input
                      type="text"
                      value={countryCurrencyForm.currency}
                      onChange={(e) => setCountryCurrencyForm({ ...countryCurrencyForm, currency: e.target.value.toUpperCase() })}
                      placeholder="e.g., INR, USD, GBP"
                      maxLength="3"
                      required
                    />
                    <small>3 letter currency code (ISO format)</small>
                  </div>
                  <div className="form-group">
                    <label>Currency Symbol *</label>
                    <input
                      type="text"
                      value={countryCurrencyForm.currencySymbol}
                      onChange={(e) => setCountryCurrencyForm({ ...countryCurrencyForm, currencySymbol: e.target.value })}
                      placeholder="e.g., ₹, $, £, €"
                      maxLength="5"
                      required
                    />
                    <small>The symbol to display for this currency</small>
                  </div>
                  <div className="form-group">
                    <label>Display Order</label>
                    <input
                      type="number"
                      value={countryCurrencyForm.order}
                      onChange={(e) => setCountryCurrencyForm({ ...countryCurrencyForm, order: parseInt(e.target.value) || 0 })}
                      placeholder="0"
                      min="0"
                    />
                    <small>Lower numbers appear first in lists</small>
                  </div>
                  <div className="form-group">
                    <label>
                      <input
                        type="checkbox"
                        checked={countryCurrencyForm.isActive}
                        onChange={(e) => setCountryCurrencyForm({ ...countryCurrencyForm, isActive: e.target.checked })}
                      />
                      Active
                    </label>
                  </div>
                  <div className="form-actions">
                    <button onClick={handleSaveCountryCurrency} className="save-btn">
                      {editingCountryCurrency ? 'Update' : 'Create'}
                    </button>
                    <button
                      onClick={() => {
                        setShowCountryCurrencyForm(false);
                        setEditingCountryCurrency(null);
                      }}
                      className="cancel-btn"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className="country-currency-list">
              <h3>All Countries & Currencies ({countryCurrencies.length})</h3>
              {countryCurrencies.length === 0 ? (
                <p className="no-country-currencies">No country currencies added yet. Add your first country currency!</p>
              ) : (
                <div className="country-currency-table">
                  <table>
                    <thead>
                      <tr>
                        <th>Country</th>
                        <th>Country Code</th>
                        <th>Currency</th>
                        <th>Currency Symbol</th>
                        <th>Order</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {countryCurrencies.map((cc) => (
                        <tr key={cc._id} className={!cc.isActive ? 'inactive' : ''}>
                          <td>{cc.country}</td>
                          <td>{cc.countryCode}</td>
                          <td>{cc.currency}</td>
                          <td>{cc.currencySymbol}</td>
                          <td>{cc.order}</td>
                          <td>
                            {cc.isActive ? (
                              <span className="status-active">Active</span>
                            ) : (
                              <span className="status-inactive">Inactive</span>
                            )}
                          </td>
                          <td>
                            <button
                              onClick={() => handleToggleCountryCurrency(cc)}
                              className={`toggle-btn ${cc.isActive ? 'disable-btn' : 'enable-btn'}`}
                              title={cc.isActive ? 'Disable' : 'Enable'}
                            >
                              {cc.isActive ? '⏸️ Disable' : '▶️ Enable'}
                            </button>
                            <button
                              onClick={() => handleEditCountryCurrency(cc)}
                              className="edit-btn"
                            >
                              ✏️ Edit
                            </button>
                            <button
                              onClick={() => handleDeleteCountryCurrency(cc._id)}
                              className="delete-btn"
                            >
                              🗑️ Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'cod' && (
          <div className="cod-management">
            <h2>COD (Cash on Delivery) Settings</h2>
            <p className="cod-description">
              Configure the extra charges that will be applied when customers select Cash on Delivery as their payment method during checkout.
            </p>
            
            <div className="cod-section">
              <div className="cod-header">
                <h3>COD Charges</h3>
                <div className="cod-actions">
                  {!isEditingCodCharges ? (
                    <button
                      onClick={handleEditCodCharges}
                      className="edit-cod-btn"
                    >
                      ✏️ Edit
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={saveCodCharges}
                        className="save-cod-btn"
                      >
                        💾 Save
                      </button>
                      <button
                        onClick={handleCancelCodCharges}
                        className="cancel-cod-btn"
                      >
                        ❌ Cancel
                      </button>
                    </>
                  )}
                </div>
              </div>
              
              <div className="cod-input-section">
                <label htmlFor="cod-charges-input">Extra Charges (₹)</label>
                <div className="cod-input-wrapper">
                  <span className="currency-symbol">₹</span>
                  <input
                    id="cod-charges-input"
                    type="number"
                    min="0"
                    step="0.01"
                    className="cod-input"
                    value={codCharges}
                    onChange={(e) => setCodCharges(parseFloat(e.target.value) || 0)}
                    disabled={!isEditingCodCharges}
                    placeholder="Enter COD charges"
                  />
                </div>
                <p className="cod-info">
                  This amount will be added to the order total when customers select COD as their payment method.
                </p>
              </div>
              
              {!isEditingCodCharges && (
                <div className="cod-display">
                  <p><strong>Current COD Charges:</strong> ₹{codCharges.toFixed(2)}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'offers' && (
          <div className="offers-management">
            <div className="offers-header">
              <h2>Discount Offers Management</h2>
              <button onClick={handleCreateOffer} className="create-offer-btn">
                + Create New Offer
              </button>
            </div>

            {showOfferForm && (
              <div className="offer-form-section">
                <h3>{editingOffer ? 'Edit Offer' : 'Create New Offer'}</h3>
                <div className="offer-form">
                  <div className="form-group">
                    <label>Offer Type *</label>
                    <select
                      value={offerForm.offerType}
                      onChange={(e) => {
                        const newType = e.target.value;
                        setOfferForm({ 
                          ...offerForm, 
                          offerType: newType,
                          showOnHomePage: (newType === 'bundle' || newType === 'carousel') ? false : true
                        });
                      }}
                    >
                      <option value="coupon">Coupon Offer</option>
                      <option value="bundle">Bundle Offer</option>
                      <option value="carousel">Carousel Offer</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Offer Code *</label>
                    <input
                      type="text"
                      value={offerForm.code}
                      onChange={(e) => setOfferForm({ ...offerForm, code: e.target.value.toUpperCase() })}
                      placeholder="e.g., SAVE20 or BUNDLE1"
                      maxLength={20}
                    />
                  </div>

                  {offerForm.offerType === 'coupon' && (
                    <>
                      <div className="form-group">
                        <label>Discount Type *</label>
                        <select
                          value={offerForm.discountType}
                          onChange={(e) => setOfferForm({ ...offerForm, discountType: e.target.value })}
                        >
                          <option value="percentage">Percentage (%)</option>
                          <option value="fixed">Fixed Amount (₹)</option>
                        </select>
                      </div>
                      <div className="form-group">
                        <label>
                          Discount {offerForm.discountType === 'percentage' ? '(%)' : '(₹)'} *
                        </label>
                        <input
                          type="number"
                          value={offerForm.discount}
                          onChange={(e) => setOfferForm({ ...offerForm, discount: e.target.value })}
                          placeholder={offerForm.discountType === 'percentage' ? '0-100' : 'Amount'}
                          min="0"
                          max={offerForm.discountType === 'percentage' ? '100' : undefined}
                          step={offerForm.discountType === 'percentage' ? '1' : '0.01'}
                        />
                      </div>
                      <div className="form-group">
                        <label>Coupon Display Text (Optional)</label>
                        <input
                          type="text"
                          value={offerForm.couponDisplayText}
                          onChange={(e) => setOfferForm({ ...offerForm, couponDisplayText: e.target.value })}
                          placeholder="e.g., Get 20% OFF on all products"
                          maxLength={100}
                        />
                        <small>
                          Custom text to display on the coupon offer card. If left empty, will show: "{offerForm.discountType === 'percentage' ? `${offerForm.discount || 'X'}% OFF` : `₹${offerForm.discount || '0'} OFF`}"
                        </small>
                      </div>
                    </>
                  )}

                  {offerForm.offerType === 'carousel' && (
                    <>
                      <div className="form-group">
                        <label>Select Carousel *</label>
                        <select
                          value={offerForm.carouselId || ''}
                          onChange={(e) => {
                            setOfferForm({ ...offerForm, carouselId: e.target.value });
                          }}
                        >
                          <option value="">-- Select a Carousel --</option>
                          {(() => {
                            console.log('Rendering carousel dropdown. Total carouselItems:', carouselItems?.length || 0);
                            console.log('Carousel items data:', carouselItems);
                            
                            if (!carouselItems || carouselItems.length === 0) {
                              return <option value="" disabled>No carousels available. Please create carousel items first.</option>;
                            }
                            
                            const filteredItems = carouselItems.filter(item => {
                              // Check if item is active and has products
                              const isActive = item.isActive !== false; // Default to true if not set
                              const hasProducts = item.productIds && Array.isArray(item.productIds) && item.productIds.length > 0;
                              console.log(`Carousel item "${item.name}": isActive=${isActive}, hasProducts=${hasProducts}, productIds=`, item.productIds);
                              return isActive && hasProducts;
                            });
                            
                            console.log('Filtered carousel items:', filteredItems.length);
                            
                            if (filteredItems.length === 0) {
                              return <option value="" disabled>No carousels with products found. Please add products to carousel items first.</option>;
                            }
                            
                            return filteredItems.map((item) => {
                              const productCount = item.productIds && Array.isArray(item.productIds) ? item.productIds.length : 0;
                              return (
                                <option key={item._id} value={item._id}>
                                  {item.name || 'Unnamed Carousel'} ({productCount} products)
                                </option>
                              );
                            });
                          })()}
                        </select>
                        <small>Select a carousel by its name. Products linked to this carousel will be included in the offer.</small>
                      </div>
                      {offerForm.carouselId && (
                        <div className="form-group">
                          <label>Products in Offer (Auto-selected from Carousel)</label>
                          <div style={{ 
                            padding: '10px', 
                            backgroundColor: '#f5f5f5', 
                            borderRadius: '4px',
                            maxHeight: '200px',
                            overflowY: 'auto'
                          }}>
                            {selectedProductsForOffer.length > 0 ? (
                              <div>
                                <strong>{selectedProductsForOffer.length} product(s)</strong> will be included in this offer
                                <ul style={{ marginTop: '10px', paddingLeft: '20px' }}>
                                  {allProducts
                                    .filter(p => selectedProductsForOffer.includes(p._id))
                                    .map(product => (
                                      <li key={product._id} style={{ marginBottom: '5px' }}>
                                        {product.name}
                                      </li>
                                    ))}
                                </ul>
                              </div>
                            ) : (
                              <p style={{ color: '#999' }}>No products found in selected carousel</p>
                            )}
                          </div>
                        </div>
                      )}
                      <div className="form-group">
                        <label>Number of Products Required *</label>
                        <input
                          type="number"
                          value={offerForm.bundleQuantity || ''}
                          onChange={(e) => setOfferForm({ ...offerForm, bundleQuantity: e.target.value })}
                          placeholder="e.g., 3"
                          min="1"
                          step="1"
                        />
                        <small>
                          How many products the customer needs to select to get the offer price
                        </small>
                      </div>
                      <div className="form-group">
                        <label>Offer Price (₹) *</label>
                        <input
                          type="number"
                          value={offerForm.bundlePrice || ''}
                          onChange={(e) => setOfferForm({ ...offerForm, bundlePrice: e.target.value })}
                          placeholder="Enter offer price"
                          min="0"
                          step="0.01"
                        />
                        <small>
                          Total price for {offerForm.bundleQuantity || 'X'} product(s) in this offer
                          {offerForm.bundleQuantity && offerForm.bundlePrice && (
                            <span style={{ display: 'block', marginTop: '4px', fontWeight: 'bold', color: '#4CAF50' }}>
                              Example: {offerForm.bundleQuantity} products at ₹{offerForm.bundlePrice}
                            </span>
                          )}
                        </small>
                      </div>
                      <div className="form-group">
                        <label>Carousel Offer Display Text (Optional)</label>
                        <input
                          type="text"
                          value={offerForm.carouselDisplayText || ''}
                          onChange={(e) => setOfferForm({ ...offerForm, carouselDisplayText: e.target.value })}
                          placeholder="e.g., Special Collection Offer"
                          maxLength={100}
                        />
                        <small>
                          Custom text to display on the offer card. If left empty, will show: "{offerForm.bundleQuantity || 'X'} products at ₹{offerForm.bundlePrice || '0'}"
                        </small>
                      </div>
                    </>
                  )}

                  {offerForm.offerType === 'bundle' && (
                    <>
                      <div className="form-group">
                        <label>Select Subcategories from Men & Women *</label>
                        <div style={{ maxHeight: '300px', overflowY: 'auto', border: '1px solid #ddd', padding: '15px', borderRadius: '4px', backgroundColor: '#f9f9f9' }}>
                          {(() => {
                            const menCategory = categories.find(cat => cat.name === 'Men');
                            const womenCategory = categories.find(cat => cat.name === 'Women');
                            const kidsCategory = categories.find(cat => cat.name === 'Kids');
                            const menSubcategories = menCategory?.subcategories?.filter(sub => sub.isActive) || [];
                            const womenSubcategories = womenCategory?.subcategories?.filter(sub => sub.isActive) || [];
                            const kidsSubcategories = kidsCategory?.subcategories?.filter(sub => sub.isActive) || [];
                            
                            if (menSubcategories.length === 0 && womenSubcategories.length === 0 && kidsSubcategories.length === 0) {
                              return (
                                <div style={{ padding: '10px', color: '#666', fontStyle: 'italic' }}>
                                  No active subcategories found. Please add subcategories first.
                                </div>
                              );
                            }
                            
                            return (
                              <div>
                                {menSubcategories.length > 0 && (
                                  <div style={{ marginBottom: '20px' }}>
                                    <h4 style={{ marginBottom: '10px', color: '#333', fontSize: '14px', fontWeight: 'bold' }}>Men Subcategories</h4>
                                    {menSubcategories.map(sub => (
                                      <label key={`men-${sub._id}`} style={{ display: 'block', marginBottom: '8px', paddingLeft: '5px' }}>
                                        <input
                                          type="checkbox"
                                          checked={selectedSubcategoriesForOffer.includes(sub.slug)}
                                          onChange={(e) => {
                                            if (e.target.checked) {
                                              const newSubcategories = [...selectedSubcategoriesForOffer, sub.slug];
                                              setSelectedSubcategoriesForOffer(newSubcategories);
                                              
                                              // Auto-select all products from selected subcategories (from any category)
                                              const productsFromSubcategories = allProducts.filter(p => {
                                                return newSubcategories.includes(p.subcategory);
                                              });
                                              setSelectedProductsForOffer(productsFromSubcategories.map(p => p._id));
                                            } else {
                                              const newSubcategories = selectedSubcategoriesForOffer.filter(s => s !== sub.slug);
                                              setSelectedSubcategoriesForOffer(newSubcategories);
                                              
                                              // Update products to only include products from remaining subcategories
                                              if (newSubcategories.length > 0) {
                                                const productsFromSubcategories = allProducts.filter(p => {
                                                  return newSubcategories.includes(p.subcategory);
                                                });
                                                setSelectedProductsForOffer(productsFromSubcategories.map(p => p._id));
                                              } else {
                                                setSelectedProductsForOffer([]);
                                              }
                                            }
                                          }}
                                        />
                                        <span style={{ marginLeft: '8px' }}>{sub.name}</span>
                                      </label>
                                    ))}
                                  </div>
                                )}
                                {womenSubcategories.length > 0 && (
                                  <div style={{ marginBottom: '20px' }}>
                                    <h4 style={{ marginBottom: '10px', color: '#333', fontSize: '14px', fontWeight: 'bold' }}>Women Subcategories</h4>
                                    {womenSubcategories.map(sub => (
                                      <label key={`women-${sub._id}`} style={{ display: 'block', marginBottom: '8px', paddingLeft: '5px' }}>
                                        <input
                                          type="checkbox"
                                          checked={selectedSubcategoriesForOffer.includes(sub.slug)}
                                          onChange={(e) => {
                                            if (e.target.checked) {
                                              const newSubcategories = [...selectedSubcategoriesForOffer, sub.slug];
                                              setSelectedSubcategoriesForOffer(newSubcategories);
                                              
                                              // Auto-select all products from selected subcategories (from any category)
                                              const productsFromSubcategories = allProducts.filter(p => {
                                                return newSubcategories.includes(p.subcategory);
                                              });
                                              setSelectedProductsForOffer(productsFromSubcategories.map(p => p._id));
                                            } else {
                                              const newSubcategories = selectedSubcategoriesForOffer.filter(s => s !== sub.slug);
                                              setSelectedSubcategoriesForOffer(newSubcategories);
                                              
                                              // Update products to only include products from remaining subcategories
                                              if (newSubcategories.length > 0) {
                                                const productsFromSubcategories = allProducts.filter(p => {
                                                  return newSubcategories.includes(p.subcategory);
                                                });
                                                setSelectedProductsForOffer(productsFromSubcategories.map(p => p._id));
                                              } else {
                                                setSelectedProductsForOffer([]);
                                              }
                                            }
                                          }}
                                        />
                                        <span style={{ marginLeft: '8px' }}>{sub.name}</span>
                                      </label>
                                    ))}
                                  </div>
                                )}
                                {kidsSubcategories.length > 0 && (
                                  <div>
                                    <h4 style={{ marginBottom: '10px', color: '#333', fontSize: '14px', fontWeight: 'bold' }}>Kids Subcategories</h4>
                                    {kidsSubcategories.map(sub => (
                                      <label key={`kids-${sub._id}`} style={{ display: 'block', marginBottom: '8px', paddingLeft: '5px' }}>
                                        <input
                                          type="checkbox"
                                          checked={selectedSubcategoriesForOffer.includes(sub.slug)}
                                          onChange={(e) => {
                                            if (e.target.checked) {
                                              const newSubcategories = [...selectedSubcategoriesForOffer, sub.slug];
                                              setSelectedSubcategoriesForOffer(newSubcategories);
                                              
                                              // Auto-select all products from selected subcategories (from any category)
                                              const productsFromSubcategories = allProducts.filter(p => {
                                                return newSubcategories.includes(p.subcategory);
                                              });
                                              setSelectedProductsForOffer(productsFromSubcategories.map(p => p._id));
                                            } else {
                                              const newSubcategories = selectedSubcategoriesForOffer.filter(s => s !== sub.slug);
                                              setSelectedSubcategoriesForOffer(newSubcategories);
                                              
                                              // Update products to only include products from remaining subcategories
                                              if (newSubcategories.length > 0) {
                                                const productsFromSubcategories = allProducts.filter(p => {
                                                  return newSubcategories.includes(p.subcategory);
                                                });
                                                setSelectedProductsForOffer(productsFromSubcategories.map(p => p._id));
                                              } else {
                                                setSelectedProductsForOffer([]);
                                              }
                                            }
                                          }}
                                        />
                                        <span style={{ marginLeft: '8px' }}>{sub.name}</span>
                                      </label>
                                    ))}
                                  </div>
                                )}
                              </div>
                            );
                          })()}
                        </div>
                        <small>You can select subcategories from Men, Women, and Kids categories. All products from selected subcategories will be included in the bundle.</small>
                      </div>
                      {selectedSubcategoriesForOffer.length > 0 && (
                        <div className="form-group">
                          <label>Products in Bundle (Auto-selected)</label>
                          <div style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid #ddd', padding: '10px', borderRadius: '4px', backgroundColor: '#f5f5f5' }}>
                            {allProducts.length === 0 ? (
                              <div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>
                                Loading products...
                              </div>
                            ) : (
                              (() => {
                                const filteredProducts = allProducts.filter(p => {
                                  return selectedSubcategoriesForOffer.includes(p.subcategory);
                                });
                                
                                if (filteredProducts.length === 0) {
                                  return (
                                    <div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>
                                      No products found in selected subcategories. Please add products first.
                                    </div>
                                  );
                                }
                                
                                return (
                                  <div>
                                    {filteredProducts.map(product => (
                                      <div key={product._id} style={{ padding: '8px', marginBottom: '4px', border: '1px solid #eee', borderRadius: '4px', backgroundColor: 'white' }}>
                                        <span>
                                          {product.name} - ₹{product.price}
                                          {product.subcategory && ` (${product.subcategory})`}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                );
                              })()
                            )}
                          </div>
                          <small>
                            <strong>{selectedProductsForOffer.length} product(s)</strong> will be included in this bundle
                          </small>
                        </div>
                      )}
                      <div className="form-group">
                        <label>Number of Products in Bundle *</label>
                        <input
                          type="number"
                          value={offerForm.bundleQuantity}
                          onChange={(e) => setOfferForm({ ...offerForm, bundleQuantity: e.target.value })}
                          placeholder="e.g., 3"
                          min="1"
                          step="1"
                        />
                        <small>
                          How many products the customer needs to select to get the bundle price
                        </small>
                      </div>
                      <div className="form-group">
                        <label>Bundle Price (₹) *</label>
                        <input
                          type="number"
                          value={offerForm.bundlePrice}
                          onChange={(e) => setOfferForm({ ...offerForm, bundlePrice: e.target.value })}
                          placeholder="Enter bundle price"
                          min="0"
                          step="0.01"
                        />
                        <small>
                          Total price for {offerForm.bundleQuantity || 'X'} product(s) in this bundle
                          {offerForm.bundleQuantity && offerForm.bundlePrice && (
                            <span style={{ display: 'block', marginTop: '4px', fontWeight: 'bold', color: '#4CAF50' }}>
                              Example: {offerForm.bundleQuantity} products at ₹{offerForm.bundlePrice}
                            </span>
                          )}
                        </small>
                      </div>
                      <div className="form-group">
                        <label>Bundle Display Text (Optional)</label>
                        <input
                          type="text"
                          value={offerForm.bundleDisplayText}
                          onChange={(e) => setOfferForm({ ...offerForm, bundleDisplayText: e.target.value })}
                          placeholder="e.g., 2 hip hop tshirts at 1299"
                          maxLength={100}
                        />
                        <small>
                          Custom text to display on the offer card. If left empty, will show: "{offerForm.bundleQuantity || 'X'} products at ₹{offerForm.bundlePrice || '0'}"
                        </small>
                      </div>
                    </>
                  )}

                  {/* Country-Specific Pricing for Bundle/Carousel Offers */}
                  {(offerForm.offerType === 'bundle' || offerForm.offerType === 'carousel') && (
                    <div className="form-group">
                      <label>Country-Specific Pricing (Optional)</label>
                      <small style={{ display: 'block', marginBottom: '10px', color: '#666' }}>
                        Set different bundle prices for different countries. If not set, the default bundle price will be used.
                      </small>
                      {(offerForm.pricingByCountry || []).map((pricing, index) => (
                        <div key={index} style={{ marginBottom: '15px', padding: '15px', border: '1px solid #ddd', borderRadius: '4px', backgroundColor: '#f9f9f9' }}>
                          <div style={{ display: 'flex', gap: '10px', marginBottom: '10px', flexWrap: 'wrap' }}>
                            <div style={{ flex: 1, minWidth: '150px' }}>
                              <label>Country *</label>
                              <select
                                value={pricing.country || ''}
                                onChange={(e) => {
                                  const updated = [...(offerForm.pricingByCountry || [])];
                                  const selectedCountry = e.target.value;
                                  // Find the matching country currency to auto-set currency
                                  const matchingCurrency = countryCurrencies.find(cc => cc.country === selectedCountry);
                                  updated[index] = { 
                                    ...updated[index], 
                                    country: selectedCountry,
                                    currency: matchingCurrency ? matchingCurrency.currency : updated[index].currency
                                  };
                                  setOfferForm({ ...offerForm, pricingByCountry: updated });
                                }}
                              >
                                <option value="">Select Country</option>
                                {countryCurrencies
                                  .sort((a, b) => (a.order || 0) - (b.order || 0) || a.country.localeCompare(b.country))
                                  .map((cc) => (
                                    <option key={cc._id} value={cc.country}>
                                      {cc.country} ({cc.countryCode}){!cc.isActive ? ' (Inactive)' : ''}
                                    </option>
                                  ))}
                              </select>
                            </div>
                            <div style={{ flex: 1, minWidth: '150px' }}>
                              <label>Currency *</label>
                              <select
                                value={pricing.currency || ''}
                                onChange={(e) => {
                                  const updated = [...(offerForm.pricingByCountry || [])];
                                  updated[index] = { ...updated[index], currency: e.target.value };
                                  setOfferForm({ ...offerForm, pricingByCountry: updated });
                                }}
                              >
                                <option value="">Select Currency</option>
                                {countryCurrencies
                                  .sort((a, b) => (a.order || 0) - (b.order || 0) || a.currency.localeCompare(b.currency))
                                  .map((cc) => (
                                    <option key={cc._id} value={cc.currency}>
                                      {cc.currency} ({cc.currencySymbol}) - {cc.country}{!cc.isActive ? ' (Inactive)' : ''}
                                    </option>
                                  ))}
                              </select>
                            </div>
                            <div style={{ flex: 1, minWidth: '150px' }}>
                              <label>Bundle Price *</label>
                              <input
                                type="number"
                                value={pricing.bundlePrice || ''}
                                onChange={(e) => {
                                  const updated = [...(offerForm.pricingByCountry || [])];
                                  updated[index] = { ...updated[index], bundlePrice: e.target.value };
                                  setOfferForm({ ...offerForm, pricingByCountry: updated });
                                }}
                                placeholder="Price"
                                min="0"
                                step="0.01"
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                const updated = (offerForm.pricingByCountry || []).filter((_, i) => i !== index);
                                setOfferForm({ ...offerForm, pricingByCountry: updated });
                              }}
                              style={{ padding: '8px 12px', backgroundColor: '#f44336', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', alignSelf: 'flex-end' }}
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => {
                          setOfferForm({
                            ...offerForm,
                            pricingByCountry: [...(offerForm.pricingByCountry || []), { country: '', currency: '', bundlePrice: '' }]
                          });
                        }}
                        style={{ padding: '8px 16px', backgroundColor: '#4CAF50', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                      >
                        + Add Country Pricing
                      </button>
                    </div>
                  )}

                  {/* Country-Specific Discount for Coupon Offers */}
                  {offerForm.offerType === 'coupon' && (
                    <div className="form-group">
                      <label>Country-Specific Discount (Optional)</label>
                      <small style={{ display: 'block', marginBottom: '10px', color: '#666' }}>
                        Set different discount values for different countries. If not set, the default discount will be used.
                      </small>
                      {(offerForm.discountByCountry || []).map((discount, index) => (
                        <div key={index} style={{ marginBottom: '15px', padding: '15px', border: '1px solid #ddd', borderRadius: '4px', backgroundColor: '#f9f9f9' }}>
                          <div style={{ display: 'flex', gap: '10px', marginBottom: '10px', flexWrap: 'wrap' }}>
                            <div style={{ flex: 1, minWidth: '150px' }}>
                              <label>Country *</label>
                              <select
                                value={discount.country || ''}
                                onChange={(e) => {
                                  const updated = [...(offerForm.discountByCountry || [])];
                                  const selectedCountry = e.target.value;
                                  // Find the matching country currency to auto-set currency
                                  const matchingCurrency = countryCurrencies.find(cc => cc.country === selectedCountry);
                                  updated[index] = { 
                                    ...updated[index], 
                                    country: selectedCountry,
                                    currency: matchingCurrency ? matchingCurrency.currency : updated[index].currency
                                  };
                                  setOfferForm({ ...offerForm, discountByCountry: updated });
                                }}
                              >
                                <option value="">Select Country</option>
                                {countryCurrencies
                                  .sort((a, b) => (a.order || 0) - (b.order || 0) || a.country.localeCompare(b.country))
                                  .map((cc) => (
                                    <option key={cc._id} value={cc.country}>
                                      {cc.country} ({cc.countryCode}){!cc.isActive ? ' (Inactive)' : ''}
                                    </option>
                                  ))}
                              </select>
                            </div>
                            <div style={{ flex: 1, minWidth: '150px' }}>
                              <label>Currency *</label>
                              <select
                                value={discount.currency || ''}
                                onChange={(e) => {
                                  const updated = [...(offerForm.discountByCountry || [])];
                                  updated[index] = { ...updated[index], currency: e.target.value };
                                  setOfferForm({ ...offerForm, discountByCountry: updated });
                                }}
                              >
                                <option value="">Select Currency</option>
                                {countryCurrencies
                                  .sort((a, b) => (a.order || 0) - (b.order || 0) || a.currency.localeCompare(b.currency))
                                  .map((cc) => (
                                    <option key={cc._id} value={cc.currency}>
                                      {cc.currency} ({cc.currencySymbol}) - {cc.country}{!cc.isActive ? ' (Inactive)' : ''}
                                    </option>
                                  ))}
                              </select>
                            </div>
                            <div style={{ flex: 1, minWidth: '120px' }}>
                              <label>Discount Type *</label>
                              <select
                                value={discount.discountType || 'percentage'}
                                onChange={(e) => {
                                  const updated = [...(offerForm.discountByCountry || [])];
                                  updated[index] = { ...updated[index], discountType: e.target.value };
                                  setOfferForm({ ...offerForm, discountByCountry: updated });
                                }}
                              >
                                <option value="percentage">Percentage (%)</option>
                                <option value="fixed">Fixed Amount</option>
                              </select>
                            </div>
                            <div style={{ flex: 1, minWidth: '120px' }}>
                              <label>Discount *</label>
                              <input
                                type="number"
                                value={discount.discount || ''}
                                onChange={(e) => {
                                  const updated = [...(offerForm.discountByCountry || [])];
                                  updated[index] = { ...updated[index], discount: e.target.value };
                                  setOfferForm({ ...offerForm, discountByCountry: updated });
                                }}
                                placeholder={discount.discountType === 'percentage' ? '0-100' : 'Amount'}
                                min="0"
                                max={discount.discountType === 'percentage' ? '100' : undefined}
                                step={discount.discountType === 'percentage' ? '1' : '0.01'}
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                const updated = (offerForm.discountByCountry || []).filter((_, i) => i !== index);
                                setOfferForm({ ...offerForm, discountByCountry: updated });
                              }}
                              style={{ padding: '8px 12px', backgroundColor: '#f44336', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', alignSelf: 'flex-end' }}
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => {
                          setOfferForm({
                            ...offerForm,
                            discountByCountry: [...(offerForm.discountByCountry || []), { country: '', currency: '', discount: '', discountType: 'percentage' }]
                          });
                        }}
                        style={{ padding: '8px 16px', backgroundColor: '#4CAF50', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                      >
                        + Add Country Discount
                      </button>
                    </div>
                  )}

                  <div className="form-group">
                    <label>Description</label>
                    <textarea
                      value={offerForm.description}
                      onChange={(e) => setOfferForm({ ...offerForm, description: e.target.value })}
                      placeholder="Optional description for the offer"
                      rows="3"
                    />
                  </div>
                  <div className="form-group">
                    <label>
                      <input
                        type="checkbox"
                        checked={offerForm.isActive}
                        onChange={(e) => setOfferForm({ ...offerForm, isActive: e.target.checked })}
                      />
                      Active
                    </label>
                  </div>
                  {offerForm.offerType === 'bundle' && (
                    <div className="form-group">
                      <label>
                        <input
                          type="checkbox"
                          checked={offerForm.showOnHomePage}
                          onChange={(e) => setOfferForm({ ...offerForm, showOnHomePage: e.target.checked })}
                        />
                        Show on Home Page (Bundle offers are hidden by default)
                      </label>
                    </div>
                  )}
                  <div className="form-actions">
                    <button onClick={handleSaveOffer} className="save-btn">
                      {editingOffer ? 'Update Offer' : 'Create Offer'}
                    </button>
                    <button
                      onClick={() => {
                        setShowOfferForm(false);
                        setEditingOffer(null);
                      }}
                      className="cancel-btn"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className="offers-list">
              <h3>All Offers ({offers.length})</h3>
              {offers.length === 0 ? (
                <p className="no-offers">No offers created yet. Create your first offer!</p>
              ) : (
                <div className="offers-grid">
                  {offers.map((offer) => (
                    <div key={offer._id} className={`offer-card ${!offer.isActive ? 'inactive' : ''}`}>
                      <div className="offer-card-header">
                        <div className="offer-code">{offer.code}</div>
                        <div className="offer-status">
                          {offer.isActive ? (
                            <span className="status-active">Active</span>
                          ) : (
                            <span className="status-inactive">Inactive</span>
                          )}
                        </div>
                      </div>
                      <div className="offer-type-badge" style={{ 
                        marginBottom: '8px', 
                        padding: '4px 8px', 
                        borderRadius: '4px', 
                        fontSize: '12px',
                        display: 'inline-block',
                        background: offer.offerType === 'bundle' ? '#4CAF50' : '#2196F3',
                        color: 'white'
                      }}>
                        {offer.offerType === 'bundle' ? '📦 Bundle' : '🎟️ Coupon'}
                      </div>
                      {offer.offerType === 'coupon' ? (
                        <div className="offer-discount">
                          <span className="discount-value">
                            {offer.couponDisplayText || 
                             (offer.discountType === 'percentage' 
                               ? `${offer.discount}% OFF` 
                               : `₹${offer.discount} OFF`)}
                          </span>
                        </div>
                      ) : (
                        <div className="offer-discount">
                          <span className="discount-value">
                            {offer.bundleDisplayText || `${offer.bundleQuantity || 'X'} products at ₹${offer.bundlePrice || '0'}`}
                          </span>
                          <div style={{ fontSize: '12px', marginTop: '4px', color: '#666' }}>
                            {offer.category} - {offer.products?.length || 0} available product(s)
                            {offer.subcategories?.length > 0 && ` (${offer.subcategories.length} subcategory${offer.subcategories.length > 1 ? 'ies' : 'y'})`}
                          </div>
                        </div>
                      )}
                      {offer.description && (
                        <div className="offer-description">{offer.description}</div>
                      )}
                      {offer.offerType === 'bundle' && (
                        <div style={{ fontSize: '11px', color: '#999', marginTop: '4px' }}>
                          {offer.showOnHomePage ? 'Shown on Home' : 'Hidden from Home'}
                        </div>
                      )}
                      <div className="offer-actions">
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleEditOffer(offer);
                          }}
                          className="edit-btn"
                          type="button"
                        >
                          ✏️ Edit
                        </button>
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleDeleteOffer(offer._id);
                          }}
                          className="delete-btn"
                          type="button"
                        >
                          🗑️ Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Carousel Item Form Modal */}
        {showCarouselItemForm && (
          <div className="address-modal-overlay" onClick={() => {
            setShowCarouselItemForm(false);
            setEditingCarouselItem(null);
            setSelectedProductsForCarousel([]);
          }}>
            <div className="address-modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '800px', maxHeight: '90vh', overflowY: 'auto' }}>
              <div className="address-modal-header">
                <h3>{editingCarouselItem?._id ? 'Edit Carousel Item' : 'Create Carousel Item'}</h3>
                <button onClick={() => {
                  setShowCarouselItemForm(false);
                  setEditingCarouselItem(null);
                  setSelectedProductsForCarousel([]);
                }}>×</button>
              </div>
              <div style={{ padding: '20px' }}>
                {editingCarouselItem?.imageUrl && (
                  <div style={{ marginBottom: '20px', textAlign: 'center' }}>
                    <img 
                      src={editingCarouselItem.imageUrl} 
                      alt="Carousel preview" 
                      style={{ maxWidth: '100%', maxHeight: '200px', objectFit: 'contain' }}
                    />
                  </div>
                )}
                <div className="form-group">
                  <label>Carousel Item Name *</label>
                  <input
                    type="text"
                    value={editingCarouselItem?.name || ''}
                    onChange={(e) => setEditingCarouselItem({ ...editingCarouselItem, name: e.target.value })}
                    placeholder="e.g., Summer Collection, New Arrivals"
                    maxLength={100}
                  />
                  <small>This name will be used to identify this carousel item</small>
                </div>
                <div className="form-group">
                  <label>Button Text</label>
                  <input
                    type="text"
                    value={editingCarouselItem?.buttonText || ''}
                    onChange={(e) => {
                      setEditingCarouselItem({ ...editingCarouselItem, buttonText: e.target.value });
                    }}
                    placeholder="e.g., Shop Now, Explore, View Collection (default: Shop Now)"
                    maxLength={50}
                  />
                  <small>Text to display on the button overlay on the carousel image. Leave empty for default "Shop Now".</small>
                </div>
                <div className="form-group">
                  <label>Select Products</label>
                  <p style={{ fontSize: '12px', color: '#666', marginBottom: '10px' }}>
                    Select products that will be shown when users click on this carousel image
                  </p>
                  {allProducts.length === 0 ? (
                    <p>Loading products...</p>
                  ) : (
                    <div style={{ maxHeight: '300px', overflowY: 'auto', border: '1px solid #ddd', padding: '10px', borderRadius: '4px' }}>
                      <div style={{ marginBottom: '10px' }}>
                        <input
                          type="text"
                          placeholder="Search products..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          style={{ width: '100%', padding: '8px', marginBottom: '10px' }}
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const allProductIds = allProducts
                              .filter(p => !searchTerm || p.name.toLowerCase().includes(searchTerm.toLowerCase()))
                              .map(p => p._id);
                            setSelectedProductsForCarousel(allProductIds);
                          }}
                          style={{ marginRight: '10px', padding: '5px 10px', fontSize: '12px' }}
                        >
                          Select All (Filtered)
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedProductsForCarousel([])}
                          style={{ padding: '5px 10px', fontSize: '12px' }}
                        >
                          Clear All
                        </button>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '10px' }}>
                        {allProducts
                          .filter(p => !searchTerm || p.name.toLowerCase().includes(searchTerm.toLowerCase()))
                          .map((product) => (
                            <label
                              key={product._id}
                              style={{
                                display: 'flex',
                                flexDirection: 'column',
                                padding: '8px',
                                border: selectedProductsForCarousel.includes(product._id) ? '2px solid #4CAF50' : '1px solid #ddd',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                backgroundColor: selectedProductsForCarousel.includes(product._id) ? '#f0f8f0' : 'white'
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', marginBottom: '4px' }}>
                                <input
                                  type="checkbox"
                                  checked={selectedProductsForCarousel.includes(product._id)}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setSelectedProductsForCarousel([...selectedProductsForCarousel, product._id]);
                                    } else {
                                      setSelectedProductsForCarousel(selectedProductsForCarousel.filter(id => id !== product._id));
                                    }
                                  }}
                                  style={{ marginRight: '8px' }}
                                />
                                <span style={{ fontSize: '12px', flex: 1, fontWeight: '500' }}>{product.name}</span>
                              </div>
                              {selectedProductsForCarousel.includes(product._id) && (
                                <div style={{ marginLeft: '24px', fontSize: '11px', color: '#666' }}>
                                  <span style={{ color: '#4CAF50', fontWeight: '600' }}>
                                    ₹{product.discountPrice || product.price}
                                  </span>
                                  {product.discountPrice && (
                                    <span style={{ textDecoration: 'line-through', color: '#999', marginLeft: '6px' }}>
                                      ₹{product.price}
                                    </span>
                                  )}
                                </div>
                              )}
                            </label>
                          ))}
                      </div>
                      <p style={{ marginTop: '10px', fontSize: '12px', color: '#666' }}>
                        {selectedProductsForCarousel.length} product(s) selected
                      </p>
                    </div>
                  )}
                </div>
                <div className="form-group">
                  <label>Show Carousel Item For Countries</label>
                  <p style={{ fontSize: '12px', color: '#666', marginBottom: '10px' }}>
                    Select the countries where this carousel image should be visible. If you don't select anything, it will be shown for all countries.
                  </p>
                  {countryCurrencies.length === 0 ? (
                    <p style={{ fontSize: '12px', color: '#999' }}>
                      {countryCurrencies.length === 0 ? 'Loading countries...' : 'No countries configured yet. Go to "Country &amp; Currency" tab to add countries.'}
                    </p>
                  ) : (
                    <div style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid #ddd', padding: '10px', borderRadius: '4px' }}>
                      <div style={{ marginBottom: '10px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        <button
                          type="button"
                          onClick={() => {
                            const activeCountries = countryCurrencies.filter(cc => cc.isActive !== false).map(c => c.countryCode);
                            setSelectedCountriesForCarouselItem(activeCountries);
                          }}
                          style={{ padding: '5px 10px', fontSize: '12px' }}
                        >
                          Select All Active
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedCountriesForCarouselItem([])}
                          style={{ padding: '5px 10px', fontSize: '12px' }}
                        >
                          Clear All (Show For All)
                        </button>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '8px' }}>
                        {countryCurrencies.filter(cc => cc.isActive !== false).map((cc) => (
                          <label
                            key={cc._id}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              padding: '6px 8px',
                              border: selectedCountriesForCarouselItem.includes(cc.countryCode)
                                ? '2px solid #4CAF50'
                                : '1px solid #ddd',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              backgroundColor: selectedCountriesForCarouselItem.includes(cc.countryCode)
                                ? '#f0f8f0'
                                : 'white',
                              fontSize: '12px'
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={selectedCountriesForCarouselItem.includes(cc.countryCode)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedCountriesForCarouselItem([
                                    ...selectedCountriesForCarouselItem,
                                    cc.countryCode
                                  ]);
                                } else {
                                  setSelectedCountriesForCarouselItem(
                                    selectedCountriesForCarouselItem.filter(code => code !== cc.countryCode)
                                  );
                                }
                              }}
                              style={{ marginRight: '8px' }}
                            />
                            <span style={{ flex: 1 }}>
                              {cc.country} ({cc.countryCode}) - {cc.currency}
                            </span>
                          </label>
                        ))}
                      </div>
                      <p style={{ marginTop: '10px', fontSize: '12px', color: '#666' }}>
                        {selectedCountriesForCarouselItem.length > 0
                          ? `${selectedCountriesForCarouselItem.length} country(ies) selected`
                          : 'No country selected: this carousel item will be shown for all countries.'}
                      </p>
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                  <button
                    onClick={handleSaveCarouselItem}
                    className="save-notes-btn"
                    style={{ flex: 1 }}
                  >
                    💾 Save
                  </button>
                  <button
                    onClick={() => {
                      setShowCarouselItemForm(false);
                      setEditingCarouselItem(null);
                      setSelectedProductsForCarousel([]);
                    }}
                    className="cancel-notes-btn"
                    style={{ flex: 1 }}
                  >
                    ❌ Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;


