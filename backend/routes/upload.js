const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cloudinary = require('cloudinary').v2;
const { auth, admin } = require('../middleware/auth');
const { Readable } = require('stream');

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'df5r3j9cc',
  api_key: process.env.CLOUDINARY_API_KEY || '481492652749781',
  api_secret: process.env.CLOUDINARY_API_SECRET || '1V3u4ARwQDCIFmqS0Rc_wNjsoOE'
});

// Create uploads directory if it doesn't exist (for fallback)
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for memory storage (to upload directly to Cloudinary)
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!'));
  }
};

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: fileFilter
});

// Helper function to upload to Cloudinary
const uploadToCloudinary = (buffer, folder = 'nexastyle') => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: folder,
        resource_type: 'image',
        transformation: [
          { quality: 'auto' },
          { fetch_format: 'auto' }
        ]
      },
      (error, result) => {
        if (error) {
          reject(error);
        } else {
          resolve(result);
        }
      }
    );
    Readable.from(buffer).pipe(uploadStream);
  });
};

// Upload single image
router.post('/single', auth, admin, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }
    
    // Upload to Cloudinary
    const result = await uploadToCloudinary(req.file.buffer, 'nexastyle');
    
    res.json({ 
      success: true, 
      imageUrl: result.secure_url,
      publicId: result.public_id,
      filename: result.original_filename || req.file.originalname
    });
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    res.status(500).json({ message: 'Upload failed', error: error.message });
  }
});

// Upload multiple images
router.post('/multiple', auth, admin, upload.array('images', 10), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: 'No files uploaded' });
    }
    
    // Upload all files to Cloudinary
    const uploadPromises = req.files.map(file => 
      uploadToCloudinary(file.buffer, 'nexastyle').then(result => ({
        url: result.secure_url,
        publicId: result.public_id,
        filename: result.original_filename || file.originalname
      }))
    );
    
    const imageUrls = await Promise.all(uploadPromises);
    res.json({ success: true, images: imageUrls });
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    res.status(500).json({ message: 'Upload failed', error: error.message });
  }
});

// Get all uploaded images
router.get('/all', auth, admin, async (req, res) => {
  try {
    // Try to fetch images from Cloudinary using Admin API
    try {
      const result = await cloudinary.api.resources({
        type: 'upload',
        prefix: 'nexastyle/',
        max_results: 500,
        resource_type: 'image'
      });
      
      const images = result.resources.map(resource => ({
        filename: resource.public_id.split('/').pop() || resource.public_id,
        url: resource.secure_url,
        publicId: resource.public_id,
        uploadDate: resource.created_at || new Date().toISOString()
      }));
      
      // Sort by upload date (newest first)
      images.sort((a, b) => new Date(b.uploadDate) - new Date(a.uploadDate));
      
      res.json({ success: true, images });
    } catch (cloudinaryError) {
      console.error('Cloudinary API error:', cloudinaryError);
      
      // Fallback: return empty array if Cloudinary API fails
      // This allows the admin to still upload new images
      console.log('Falling back to empty images list');
      res.json({ success: true, images: [] });
    }
  } catch (error) {
    console.error('Error fetching images:', error);
    // Return empty array instead of error to prevent breaking the admin dashboard
    res.json({ success: true, images: [] });
  }
});

// Delete image
router.delete('/:filename', auth, admin, async (req, res) => {
  try {
    const filename = req.params.filename;
    
    // Try to delete from Cloudinary
    // The filename might be a public_id or a URL
    let publicId = filename;
    
    // If it's a URL, extract the public_id
    if (filename.includes('cloudinary.com')) {
      const urlParts = filename.split('/');
      const uploadIndex = urlParts.findIndex(part => part === 'upload');
      if (uploadIndex !== -1 && urlParts[uploadIndex + 2]) {
        // Extract public_id from URL
        const versionAndId = urlParts[uploadIndex + 2];
        publicId = versionAndId.split('.')[0];
        // Remove version prefix if present
        if (publicId.includes('v')) {
          publicId = publicId.split('v')[1];
        }
      }
    } else if (!filename.includes('/')) {
      // If it's just a filename, prepend the folder
      publicId = `nexastyle/${filename}`;
    }
    
    try {
      const result = await cloudinary.uploader.destroy(publicId);
      if (result.result === 'ok' || result.result === 'not found') {
        res.json({ success: true, message: 'Image deleted successfully' });
      } else {
        res.status(404).json({ message: 'Image not found in Cloudinary' });
      }
    } catch (cloudinaryError) {
      // Fallback: try to delete from local storage if it exists
      const filePath = path.join(uploadsDir, filename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        res.json({ success: true, message: 'Image deleted successfully (local)' });
      } else {
        res.status(404).json({ message: 'Image not found' });
      }
    }
  } catch (error) {
    res.status(500).json({ message: 'Error deleting image', error: error.message });
  }
});

module.exports = router;

