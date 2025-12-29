// Backend URL configuration
export const getBackendUrl = () => {
  return process.env.NODE_ENV === "production"
    ? "https://nexastyle1.onrender.com"
    : "http://localhost:5000";
};

// Helper function to get full image URL
export const getImageUrl = (imagePath) => {
  if (!imagePath) return "";
  
  // If it's already a full URL
  if (imagePath.startsWith("http")) {
    // In production, replace localhost URLs with production backend URL
    if (process.env.NODE_ENV === "production" && imagePath.includes("localhost")) {
      try {
        // Extract the path from the URL (e.g., "/uploads/image.jpg")
        const url = new URL(imagePath);
        return `${getBackendUrl()}${url.pathname}`;
      } catch (e) {
        // If URL parsing fails, try to extract path manually
        const pathMatch = imagePath.match(/\/uploads\/.+$/);
        if (pathMatch) {
          return `${getBackendUrl()}${pathMatch[0]}`;
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

