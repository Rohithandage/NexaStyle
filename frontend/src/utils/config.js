// Backend URL configuration
export const getBackendUrl = () => {
  return process.env.NODE_ENV === "production"
    ? "https://nexastyle1.onrender.com"
    : "http://localhost:5000";
};

// Helper function to get full image URL
export const getImageUrl = (imagePath) => {
  if (!imagePath) return "";
  if (imagePath.startsWith("http")) return imagePath;
  return `${getBackendUrl()}${imagePath}`;
};

