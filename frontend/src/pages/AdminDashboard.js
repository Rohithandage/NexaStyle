import React, { useEffect, useState } from 'react';
import api from '../api/api';
import { toast } from 'react-toastify';
import { getImageUrl, getBackendUrl } from '../utils/config';
import './AdminDashboard.css';

const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [categories, setCategories] = useState([]);
  const [orders, setOrders] = useState([]);
  const [pendingReviews, setPendingReviews] = useState([]);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [newSubcategory, setNewSubcategory] = useState({ categoryId: '', name: '', colors: '' });
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [colorSearchTerm, setColorSearchTerm] = useState('');
  const [editingSubcategoryColors, setEditingSubcategoryColors] = useState(null); // { categoryId, subcategoryId, colors }
  const [uploadedImages, setUploadedImages] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [products, setProducts] = useState([]);
  const [showProductForm, setShowProductForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [headerImages, setHeaderImages] = useState([]);
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
    isTrending: false
  });

  useEffect(() => {
    fetchDashboardData();
    fetchCategories();
    fetchOrders();
    fetchPendingReviews();
    if (activeTab === 'images') {
      fetchImages();
    }
    if (activeTab === 'products') {
      fetchProducts();
      fetchImages();
      fetchCategories(); // Refresh categories to get latest subcategory colors
    }
    if (activeTab === 'trending') {
      fetchProducts();
    }
    if (activeTab === 'images') {
      fetchHeaderImages();
    }
  }, [activeTab]);
  
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

  const handleAddHeaderImage = async (imageUrl) => {
    try {
      await api.post(
        '/api/admin/settings/header-images',
        { imageUrl: getImageUrl(imageUrl) },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        }
      );
      toast.success('Image added to header carousel!');
      fetchHeaderImages();
    } catch (error) {
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

  const fetchDashboardData = async () => {
    try {
      const res = await api.get('/api/analytics/dashboard', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      setStats(res.data);
    } catch (error) {
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
    } catch (error) {
      toast.error('Error approving review');
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

  const handleProductFormChange = (e) => {
    const { name, value } = e.target;
    
    // Handle subcategory change - reset colors if subcategory changes
    if (name === 'subcategory') {
      setProductForm({
        ...productForm,
        [name]: value,
        colors: [] // Reset colors when subcategory changes
      });
    } else if (name === 'category') {
      setProductForm({
        ...productForm,
        [name]: value,
        subcategory: '', // Reset subcategory when category changes
        colors: [] // Reset colors when category changes
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

      const productData = {
        ...productForm,
        price: parseFloat(productForm.price),
        discountPrice: productForm.discountPrice ? parseFloat(productForm.discountPrice) : undefined,
        colors: formattedColors,
        sizes: validSizes,
        images: allImages // Include both general images and color-specific images
      };

      if (editingProduct) {
        await api.put(
          `/api/admin/products/${editingProduct._id}`,
          productData,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem('token')}`
            }
          }
        );
        toast.success('Product updated successfully');
      } else {
        await api.post(
          '/api/admin/products',
          productData,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem('token')}`
            }
          }
        );
        toast.success('Product created successfully');
      }
      
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
        isTrending: false
      });
      fetchProducts();
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
      isTrending: product.isTrending || false
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
      fetchProducts();
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
            onClick={() => setActiveTab('trending')}
            className={activeTab === 'trending' ? 'active' : ''}
          >
            Trending
          </button>
        </div>

        {activeTab === 'dashboard' && stats && (
          <div className="dashboard-stats">
            <div className="stat-card">
              <h3>Today</h3>
              <p className="stat-value">{stats.today.visitors}</p>
              <p className="stat-label">Visitors</p>
              <p className="stat-value">{stats.today.orders}</p>
              <p className="stat-label">Orders</p>
              <p className="stat-value">₹{stats.today.revenue}</p>
              <p className="stat-label">Revenue</p>
            </div>
            <div className="stat-card">
              <h3>Last 7 Days</h3>
              <p className="stat-value">{stats.last7Days.orders}</p>
              <p className="stat-label">Orders</p>
              <p className="stat-value">₹{stats.last7Days.revenue}</p>
              <p className="stat-label">Revenue</p>
            </div>
            <div className="stat-card">
              <h3>Last 30 Days</h3>
              <p className="stat-value">{stats.last30Days.orders}</p>
              <p className="stat-label">Orders</p>
              <p className="stat-value">₹{stats.last30Days.revenue}</p>
              <p className="stat-label">Revenue</p>
            </div>
            <div className="stat-card">
              <h3>All Time</h3>
              <p className="stat-value">{stats.allTime.orders}</p>
              <p className="stat-label">Orders</p>
              <p className="stat-value">₹{stats.allTime.revenue}</p>
              <p className="stat-label">Revenue</p>
            </div>
          </div>
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
              {categories.map((category) => (
                <div key={category._id} className="category-card">
                  <h3>{category.name}</h3>
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
                </div>
              ))}
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
                    <th>Payment Status</th>
                    <th>Order Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => (
                    <tr key={order._id}>
                      <td>#{order._id.slice(-8)}</td>
                      <td>{order.user?.name || 'N/A'}</td>
                      <td>₹{order.totalAmount}</td>
                      <td>{order.paymentStatus}</td>
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
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'reviews' && (
          <div className="reviews-management">
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
                    <button
                      onClick={() => handleApproveReview(review._id)}
                      className="approve-btn"
                    >
                      Approve Review
                    </button>
                  </div>
                ))}
              </div>
            )}
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

            <div className="header-image-section">
              <h3>Home Page Header Carousel</h3>
              {headerImages.length > 0 ? (
                <div className="current-header-images">
                  <p>Current header images ({headerImages.length}):</p>
                  <div className="header-images-list">
                    {headerImages.map((img, index) => (
                      <div key={index} className="header-image-item">
                        <img src={img} alt={`Header ${index + 1}`} />
                        <button
                          onClick={() => handleRemoveHeaderImage(img)}
                          className="remove-header-btn"
                          title="Remove from carousel"
                        >
                          × Remove
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="no-header-image">No header images set. Add images below to create a carousel.</p>
              )}
            </div>

            <div className="uploaded-images-section">
              <h3>All Uploaded Images ({uploadedImages.length})</h3>
              {uploadedImages.length > 0 ? (
                <div className="uploaded-images-grid">
                  {uploadedImages.map((image, index) => (
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
                          onClick={() => handleAddHeaderImage(image.url || image)}
                          className="add-header-btn"
                          title="Add to header carousel"
                        >
                          ➕ Add to Header
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
                    isTrending: false
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
                          {categories.map((cat) => (
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
                              <option value="XS">XS</option>
                              <option value="S">S</option>
                              <option value="M">M</option>
                              <option value="L">L</option>
                              <option value="XL">XL</option>
                              <option value="XXL">XXL</option>
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
      </div>
    </div>
  );
};

export default AdminDashboard;


