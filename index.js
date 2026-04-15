const express = require('express');
const mysql = require('mysql2');
const path = require('path');
require('dotenv').config(); 

// --- IMPORTACIÓN DE CLOUDINARY ---
const upload = require('./config/cloudinary'); 

const app = express();

// --- 2. CONFIGURACIÓN DEL SERVIDOR ---
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// --- 3. CONEXIÓN A LA BASE DE DATOS ---
const db = mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',      
    password: process.env.DB_PASSWORD || '122448', 
    database: process.env.DB_NAME || 'svo_catalogo',
    port: process.env.DB_PORT || 3306,
    ssl: { rejectUnauthorized: false }
});

db.connect((err) => {
    if (err) console.error('❌ Error DB:', err.message);
    else console.log('✅ Conexión establecida correctamente');
});

// --- 4. RUTAS ---

// Inicio (Ahora carga los banners de promociones)
app.get('/', (req, res) => {
    db.query('SELECT * FROM promociones ORDER BY fecha_creacion DESC', (err, rows) => {
        if (err) {
            console.error('❌ Error al cargar promociones:', err.message);
            return res.render('index', { banners: [] });
        }
        res.render('index', { banners: rows });
    });
});

app.get('/cotizar', (req, res) => res.render('cotizar'));

// Catálogo
app.get('/catalogo', (req, res) => {
    db.query('SELECT * FROM productos', (err, rows) => {
        if (err) {
            console.error('❌ Error en consulta:', err.message);
            return res.render('catalogo', { productos: [] });
        }
        res.render('catalogo', { productos: rows });
    });
});

// Panel de Admin (Muestra productos y promociones)
app.get('/admin', (req, res) => {
    db.query('SELECT * FROM productos', (err, productos) => {
        if (err) return res.send("Error al cargar productos");
        
        db.query('SELECT * FROM promociones', (err, promociones) => {
            if (err) return res.send("Error al cargar promociones");
            res.render('admin', { productos: productos, promociones: promociones });
        });
    });
});

// --- SECCIÓN DE PRODUCTOS ---

app.post('/admin/subir', upload.fields([{ name: 'imagen1' }, { name: 'imagen2' }]), (req, res) => {
    if (!req.body) return res.status(400).send("No se recibieron datos.");
    const { marca, titulo, subtitulo, modelo, caracteristicas } = req.body;
    const img1 = req.files['imagen1'] ? req.files['imagen1'][0].path : null;
    const img2 = req.files['imagen2'] ? req.files['imagen2'][0].path : null;

    const query = `INSERT INTO productos 
                   (marca, titulo, subtitulo, modelo, caracteristicas, imagen1, imagen2) 
                   VALUES (?, ?, ?, ?, ?, ?, ?)`;
    
    db.query(query, [marca, titulo, subtitulo, modelo, caracteristicas, img1, img2], (err, result) => {
        if (err) {
            console.error('❌ Error al insertar:', err.message);
            return res.status(500).send("Error al guardar en la base de datos.");
        }
        res.redirect('/catalogo');
    });
});

app.get('/admin/eliminar/:id', (req, res) => {
    const { id } = req.params;
    db.query('DELETE FROM productos WHERE id = ?', [id], (err, result) => {
        if (err) return res.status(500).send("Error al eliminar");
        res.redirect('/admin');
    });
});

app.get('/admin/editar/:id', (req, res) => {
    const { id } = req.params;
    db.query('SELECT * FROM productos WHERE id = ?', [id], (err, rows) => {
        if (err || rows.length === 0) return res.status(404).send("Producto no encontrado");
        res.render('editar', { producto: rows[0] });
    });
});

app.post('/admin/actualizar/:id', upload.fields([{ name: 'imagen1' }, { name: 'imagen2' }]), (req, res) => {
    const { id } = req.params;
    const { marca, titulo, subtitulo, modelo, caracteristicas } = req.body;
    
    const img1 = req.files['imagen1'] ? req.files['imagen1'][0].path : req.body.old_img1;
    const img2 = req.files['imagen2'] ? req.files['imagen2'][0].path : req.body.old_img2;

    const query = `UPDATE productos SET 
                   marca=?, titulo=?, subtitulo=?, modelo=?, caracteristicas=?, imagen1=?, imagen2=? 
                   WHERE id=?`;
    
    db.query(query, [marca, titulo, subtitulo, modelo, caracteristicas, img1, img2, id], (err, result) => {
        if (err) return res.status(500).send("Error al actualizar");
        res.redirect('/admin');
    });
});

// --- NUEVA SECCIÓN: PROMOCIONES ---

// Subir banner de promoción
app.post('/admin/promocion', upload.single('banner'), (req, res) => {
    const { titulo, link } = req.body;
    const imagen_url = req.file ? req.file.path : null;

    if (!imagen_url) return res.status(400).send("Debe subir una imagen para la promoción.");

    const query = 'INSERT INTO promociones (titulo, imagen_url, enlace_whatsapp) VALUES (?, ?, ?)';
    db.query(query, [titulo, imagen_url, link], (err, result) => {
        if (err) {
            console.error('❌ Error al guardar promo:', err.message);
            return res.status(500).send("Error en la base de datos.");
        }
        res.redirect('/admin');
    });
});

// Eliminar banner de promoción
app.get('/admin/eliminar-promocion/:id', (req, res) => {
    const { id } = req.params;
    db.query('DELETE FROM promociones WHERE id = ?', [id], (err, result) => {
        if (err) return res.status(500).send("Error al eliminar promoción");
        res.redirect('/admin');
    });
});

// --- 5. PUERTO DINÁMICO PARA RENDER ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Servidor activo en el puerto ${PORT}`);
});