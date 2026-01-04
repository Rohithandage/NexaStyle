// Backend URL configuration
export const getBackendUrl = () => {
  // Guard window access for SSR/mobile safety
  if (typeof window === 'undefined') {
    return process.env.NODE_ENV === "production" 
      ? "https://nexastyle1.onrender.com"
      : "http://localhost:5000";
  }
  
  // Check if we're in production by checking the current hostname
  const isProduction = 
    process.env.NODE_ENV === "production" || 
    window.location.hostname === "nexastyle.onrender.com" ||
    window.location.hostname === "nexastyle.netlify.app" ||
    window.location.hostname.includes("render.com") ||
    window.location.hostname.includes("netlify.app");
  
  return isProduction
    ? "https://nexastyle1.onrender.com"
    : "http://localhost:5000";
};

// Helper function to get full image URL
export const getImageUrl = (imagePath) => {
  if (!imagePath) return "";
  
  // Handle objects (e.g., carousel items with imageUrl property)
  if (typeof imagePath === 'object') {
    imagePath = imagePath.imageUrl || imagePath.url || imagePath;
  }
  
  // Convert to string if not already
  imagePath = String(imagePath);
  
  // If it's already a full URL (including Cloudinary URLs), return as-is
  if (imagePath.startsWith("http")) {
    // Check if it's a Cloudinary URL - return as-is
    if (imagePath.includes("cloudinary.com") || imagePath.includes("res.cloudinary.com")) {
      return imagePath;
    }
    
    // Check if we're in production - use window.location for runtime detection
    const isProduction = 
      typeof window !== 'undefined' && (
        process.env.NODE_ENV === "production" || 
        window.location.hostname === "nexastyle.onrender.com" ||
        window.location.hostname === "nexastyle.netlify.app" ||
        window.location.hostname.includes("render.com") ||
        window.location.hostname.includes("netlify.app") ||
        window.location.protocol === "https:"
      );
    
    // Replace localhost URLs in production (for old local storage URLs)
    if (isProduction && (imagePath.includes("localhost") || imagePath.includes("127.0.0.1"))) {
      try {
        // Extract the path from the URL (e.g., "/uploads/image.jpg")
        const url = new URL(imagePath);
        const backendUrl = getBackendUrl();
        return `${backendUrl}${url.pathname}${url.search || ''}`;
      } catch (e) {
        // If URL parsing fails, try to extract path manually
        const pathMatch = imagePath.match(/\/uploads\/.+$/);
        if (pathMatch) {
          return `${getBackendUrl()}${pathMatch[0]}`;
        }
        // If we can't parse, but it's localhost in production, try to replace the domain
        if (imagePath.includes("localhost:5000")) {
          return imagePath.replace(/http:\/\/localhost:5000/g, getBackendUrl());
        }
        // Fallback: return as-is if we can't parse it
        return imagePath;
      }
    }
    // Return as-is if it's already a valid production URL
    return imagePath;
  }
  
  // If it's a relative path, prepend the backend URL
  return `${getBackendUrl()}${imagePath}`;
};

// Helper function to get optimized Cloudinary URL with transformations
// width: 'hero' (1200), 'product-list' (400), 'product-detail' (800), 'thumbnail' (150), or number
export const getOptimizedImageUrl = (imagePath, width = 'product-list') => {
  if (!imagePath) return "";
  
  const widthMap = {
    'hero': 1200,
    'product-list': 400,
    'product-detail': 800,
    'thumbnail': 150
  };
  
  const targetWidth = typeof width === 'number' ? width : (widthMap[width] || 400);
  
  // Get base URL first
  const baseUrl = getImageUrl(imagePath);
  
  // If it's a Cloudinary URL, optimize it
  if (baseUrl.includes("cloudinary.com") || baseUrl.includes("res.cloudinary.com")) {
    try {
      // Match Cloudinary URL pattern: res.cloudinary.com/{cloud_name}/image/upload/{existing_transforms}/{path}
      // or res.cloudinary.com/{cloud_name}/image/upload/{path}
      const cloudinaryMatch = baseUrl.match(/res\.cloudinary\.com\/([^\/]+)\/image\/upload\/(.+)/);
      
      if (cloudinaryMatch) {
        const [, cloudName, pathAfterUpload] = cloudinaryMatch;
        
        // Split path by '/' and filter out transformation patterns
        // Transformations are: f_*, q_*, w_*, or comma-separated combinations
        const pathParts = pathAfterUpload.split('/');
        const imagePathParts = pathParts.filter(part => {
          // Skip transformation patterns
          return !part.match(/^(f_|q_|w_)/) && !part.match(/^f_[^,]+(?:,q_[^,]+(?:,w_\d+)?)?$/);
        });
        
        // Join remaining parts and remove file extensions
        let imagePath = imagePathParts.join('/');
        imagePath = imagePath.replace(/\.(png|jpg|jpeg|webp|avif)$/i, '');
        
        // Validate that we have a valid image path (not empty)
        if (!imagePath || imagePath.trim() === '') {
          console.warn('Invalid Cloudinary image path:', baseUrl);
          return baseUrl; // Return original URL if path is invalid
        }
        
        // Build optimized URL
        return `https://res.cloudinary.com/${cloudName}/image/upload/f_auto,q_auto,w_${targetWidth}/${imagePath}`;
      }
    } catch (e) {
      // If parsing fails, return base URL
      console.warn('Failed to optimize Cloudinary URL:', e, baseUrl);
    }
  }
  
  // If not Cloudinary or parsing failed, return base URL
  return baseUrl;
};

