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
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }
    
    // Validate file type
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(req.file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(req.file.mimetype);
    
    if (!mimetype || !extname) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid file type. Only image files (JPEG, PNG, GIF, WebP) are allowed.' 
      });
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
    res.status(500).json({ 
      success: false,
      message: 'Upload failed', 
      error: error.message || 'Unknown error occurred'
    });
  }
});

// Upload multiple images
router.post('/multiple', auth, admin, upload.array('images', 10), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ success: false, message: 'No files uploaded' });
    }
    
    // Validate file types
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const invalidFiles = req.files.filter(file => {
      const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
      const mimetype = allowedTypes.test(file.mimetype);
      return !mimetype || !extname;
    });
    
    if (invalidFiles.length > 0) {
      return res.status(400).json({ 
        success: false,
        message: `Invalid file types. Only image files (JPEG, PNG, GIF, WebP) are allowed. Invalid files: ${invalidFiles.map(f => f.originalname).join(', ')}` 
      });
    }
    
    // Upload all files to Cloudinary
    const uploadPromises = req.files.map(file => 
      uploadToCloudinary(file.buffer, 'nexastyle').then(result => ({
        url: result.secure_url,
        publicId: result.public_id,
        filename: result.original_filename || file.originalname
      })).catch(error => {
        console.error(`Error uploading ${file.originalname}:`, error);
        throw { file: file.originalname, error: error.message };
      })
    );
    
    const results = await Promise.allSettled(uploadPromises);
    
    // Separate successful and failed uploads
    const successful = [];
    const failed = [];
    
    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        successful.push(result.value);
      } else {
        failed.push({
          filename: req.files[index].originalname,
          error: result.reason?.error || result.reason?.message || 'Unknown error'
        });
      }
    });
    
    if (successful.length === 0) {
      return res.status(500).json({ 
        success: false,
        message: 'All uploads failed', 
        failed 
      });
    }
    
    res.json({ 
      success: true, 
      images: successful,
      failed: failed.length > 0 ? failed : undefined,
      message: failed.length > 0 
        ? `${successful.length} uploaded successfully, ${failed.length} failed`
        : 'All images uploaded successfully'
    });
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Upload failed', 
      error: error.message || 'Unknown error occurred'
    });
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
router.delete('/:identifier', auth, admin, async (req, res) => {
  try {
    // Decode the identifier (it might be URL-encoded)
    let identifier = decodeURIComponent(req.params.identifier);
    
    // Try to delete from Cloudinary
    // The identifier might be a public_id, filename, or a full URL
    let publicId = identifier;
    
    // If it's a full Cloudinary URL, extract the public_id
    if (identifier.includes('cloudinary.com') || identifier.includes('res.cloudinary.com')) {
      try {
        // Cloudinary URL format: https://res.cloudinary.com/{cloud_name}/image/upload/{version}/{public_id}.{format}
        // or: https://res.cloudinary.com/{cloud_name}/image/upload/{public_id}.{format}
        const urlParts = identifier.split('/');
        const uploadIndex = urlParts.findIndex(part => part === 'upload');
        
        if (uploadIndex !== -1) {
          // Get the part after 'upload'
          const afterUpload = urlParts.slice(uploadIndex + 1);
          
          // Find the part that contains the public_id (usually after version if present)
          let idPart = '';
          for (let i = 0; i < afterUpload.length; i++) {
            const part = afterUpload[i];
            // Skip version numbers (v1234567890)
            if (part.startsWith('v') && /^v\d+$/.test(part)) {
              continue;
            }
            // This should be the public_id (might have file extension)
            idPart = part;
            break;
          }
          
          if (idPart) {
            // Remove file extension
            publicId = idPart.split('.')[0];
            // Ensure it includes the folder prefix if not already present
            if (!publicId.startsWith('nexastyle/')) {
              publicId = `nexastyle/${publicId}`;
            }
          }
        }
      } catch (urlError) {
        console.error('Error parsing Cloudinary URL:', urlError);
        // Fall through to try using identifier as-is
      }
    } else if (!identifier.includes('/')) {
      // If it's just a filename/ID without path, prepend the folder
      publicId = `nexastyle/${identifier}`;
    } else if (!identifier.startsWith('nexastyle/')) {
      // If it has a path but doesn't start with nexastyle/, add it
      publicId = `nexastyle/${identifier}`;
    }
    
    console.log('Attempting to delete from Cloudinary with publicId:', publicId);
    
    try {
      const result = await cloudinary.uploader.destroy(publicId);
      console.log('Cloudinary delete result:', result);
      
      if (result.result === 'ok' || result.result === 'not found') {
        res.json({ success: true, message: 'Image deleted successfully' });
      } else {
        // Try without the folder prefix
        if (publicId.startsWith('nexastyle/')) {
          const altPublicId = publicId.replace('nexastyle/', '');
          console.log('Trying alternative publicId:', altPublicId);
          const altResult = await cloudinary.uploader.destroy(altPublicId);
          if (altResult.result === 'ok' || altResult.result === 'not found') {
            return res.json({ success: true, message: 'Image deleted successfully' });
          }
        }
        res.status(404).json({ message: 'Image not found in Cloudinary', result: result.result });
      }
    } catch (cloudinaryError) {
      console.error('Cloudinary delete error:', cloudinaryError);
      
      // Fallback: try to delete from local storage if it exists
      const filePath = path.join(uploadsDir, identifier);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        res.json({ success: true, message: 'Image deleted successfully (local)' });
      } else {
        res.status(404).json({ 
          message: 'Image not found', 
          error: cloudinaryError.message,
          attemptedPublicId: publicId
        });
      }
    }
  } catch (error) {
    console.error('Error deleting image:', error);
    res.status(500).json({ message: 'Error deleting image', error: error.message });
  }
});

module.exports = router;

