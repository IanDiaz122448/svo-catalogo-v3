const express = require('express');
const mysql = require('mysql2');
const path = require('path');
const multer = require('multer'); 
require('dotenv').config(); // Carga las variables del archivo .env

const app = express();

// --- 1. CONFIGURACIÓN DE ALMACENAMIENTO DE IMÁGENES ---
const storage = multer.diskStorage({
    destination: path.join(__dirname, 'public/img'),
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});
const upload = multer({ storage });

// --- 2. CONFIGURACIÓN DEL SERVIDOR ---
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// --- 3. CONEXIÓN A LA BASE DE DATOS (Dinámica) ---
const db = mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',      
    password: process.env.DB_PASSWORD || '122448', 
    database: process.env.DB_NAME || 'svo_catalogo',
    port: process.env.DB_PORT || 3306
});

db.connect((err) => {
    if (err) console.error('❌ Error DB:', err.message);
    else console.log('✅ Conexión establecida correctamente');
});

// --- 4. RUTAS ---

// Inicio y Cotizar
app.get('/', (req, res) => res.render('index'));
app.get('/cotizar', (req, res) => res.render('cotizar'));

// Catálogo (Muestra los productos)
app.get('/catalogo', (req, res) => {
    db.query('SELECT * FROM productos', (err, rows) => {
        if (err) {
            console.error('❌ Error en consulta:', err.message);
            return res.render('catalogo', { productos: [] });
        }
        res.render('catalogo', { productos: rows });
    });
});

// Panel de Admin
app.get('/admin', (req, res) => res.render('admin'));

// RUTA PARA RECIBIR EL FORMULARIO Y LAS 2 FOTOS
app.post('/admin/subir', upload.fields([{ name: 'imagen1' }, { name: 'imagen2' }]), (req, res) => {
    
    // Validación de seguridad para evitar errores de destructuring
    if (!req.body) return res.status(400).send("No se recibieron datos.");

    const { marca, titulo, subtitulo, modelo, caracteristicas } = req.body;
    
    const img1 = req.files['imagen1'] ? req.files['imagen1'][0].filename : null;
    const img2 = req.files['imagen2'] ? req.files['imagen2'][0].filename : null;

    const query = `INSERT INTO productos 
                   (marca, titulo, subtitulo, modelo, caracteristicas, imagen1, imagen2) 
                   VALUES (?, ?, ?, ?, ?, ?, ?)`;
    
    db.query(query, [marca, titulo, subtitulo, modelo, caracteristicas, img1, img2], (err, result) => {
        if (err) {
            console.error('❌ Error al insertar:', err.message);
            return res.status(500).send("Error al guardar en la base de datos.");
        }
        console.log('🚀 Producto publicado con éxito');
        res.redirect('/catalogo');
    });
});

// --- 5. PUERTO DINÁMICO PARA RENDER ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Servidor activo en el puerto ${PORT}`);
});