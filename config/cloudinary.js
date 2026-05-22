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
    allowed_formats: ['jpg', 'png', 'jpeg', 'webp'], // Añadimos webp por si las dudas
    // --- AQUÍ ENTRA LA OPTIMIZACIÓN EN LA NUBE ---
    transformation: [
      { width: 1000, crop: "limit" }, // Si la cámara del cel toma una foto enorme, la limita a un tamaño web sano
      { quality: "auto" },            // Reduce los Megabytes de exceso de forma inteligente sin perder nitidez
      { fetch_format: "auto" }        // Entrega la imagen en el formato más ligero según el navegador
    ]
  },
});

const uploadCloud = multer({ 
  storage: storage,
  limits: { fileSize: 6 * 1024 * 1024 } // Límite de 6MB por archivo para proteger el buffer de Render
});

module.exports = uploadCloud;