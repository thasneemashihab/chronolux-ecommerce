const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

// Validate credentials exist
if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
  console.error('❌ Cloudinary credentials missing in .env file');
  console.error('Required: CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET');
} else {
  console.log('✅ Cloudinary credentials loaded');
}

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Product image storage
const productStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'chronolux/products',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    transformation: [{ width: 800, height: 800, crop: 'limit' }]
  }
});

// Category image storage
const categoryStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'chronolux/categories',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    transformation: [{ width: 600, height: 600, crop: 'limit' }]
  }
});

const uploadProduct = multer({ storage: productStorage });
const uploadCategory = multer({ storage: categoryStorage });

module.exports = { uploadProduct, uploadCategory, cloudinary };