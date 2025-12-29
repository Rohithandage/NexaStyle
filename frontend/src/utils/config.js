// Backend URL configuration
export const getBackendUrl = () => {
  // Check if we're in production by checking the current hostname
  const isProduction = 
    process.env.NODE_ENV === "production" || 
    window.location.hostname === "nexastyle.onrender.com" ||
    window.location.hostname.includes("render.com");
  
  return isProduction
    ? "https://nexastyle1.onrender.com"
    : "http://localhost:5000";
};

// Helper function to get full image URL
export const getImageUrl = (imagePath) => {
  if (!imagePath) return "";
  
  // Check if we're in production - use window.location for runtime detection
  const isProduction = 
    typeof window !== 'undefined' && (
      process.env.NODE_ENV === "production" || 
      window.location.hostname === "nexastyle.onrender.com" ||
      window.location.hostname.includes("render.com") ||
      window.location.protocol === "https:"
    );
  
  // If it's already a full URL
  if (imagePath.startsWith("http")) {
    // ALWAYS replace localhost URLs in production (more aggressive check)
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

