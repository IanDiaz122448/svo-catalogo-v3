const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

// Configuración con las variables que ya pusiste en Render
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'catalogo_itsz', // Así se llamará la carpeta en tu cuenta de Cloudinary
    allowed_formats: ['jpg', 'png', 'jpeg'],
  },
});

const uploadCloud = multer({ storage });

module.exports = uploadCloud;