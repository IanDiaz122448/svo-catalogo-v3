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
    if (err) {
        console.error('❌ Error DB:', err.message);
    } else {
        console.log('✅ Conexión establecida correctamente');
        
        // --- CREACIÓN AUTOMÁTICA DE LA TABLA NOVEDADES ---
        const sqlCrearNovedades = `
        CREATE TABLE IF NOT EXISTS novedades (
            id INT AUTO_INCREMENT PRIMARY KEY,
            tag_type VARCHAR(20) NOT NULL,
            tag_text VARCHAR(50),
            titulo VARCHAR(255) NOT NULL,
            descripcion TEXT NOT NULL,
            link VARCHAR(255) NOT NULL,
            imagen_url VARCHAR(255) NOT NULL,
            fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );`;

        db.query(sqlCrearNovedades, (errTable) => {
            if (errTable) {
                console.error('❌ Error al verificar/crear la tabla novedades:', errTable.message);
            } else {
                console.log('📦 Tabla "novedades" verificada/creada correctamente en la BD.');
            }
        });

        // --- CREACIÓN AUTOMÁTICA DE LA TABLA PROYECTOS ---
        const sqlCrearProyectos = `
        CREATE TABLE IF NOT EXISTS proyectos (
            id INT AUTO_INCREMENT PRIMARY KEY,
            badge VARCHAR(50),
            titulo VARCHAR(255) NOT NULL,
            descripcion TEXT,
            ubicacion VARCHAR(100),
            tag1 VARCHAR(50),
            tag2 VARCHAR(50),
            reciente VARCHAR(50),
            link VARCHAR(255),
            imagen_url VARCHAR(255),
            imagen_url2 VARCHAR(255),
            imagen_url3 VARCHAR(255),
            imagen_url4 VARCHAR(255),
            fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );`;

        db.query(sqlCrearProyectos, (errTable) => {
            if (errTable) {
                console.error('❌ Error al verificar/crear la tabla proyectos:', errTable.message);
            } else {
                console.log('📦 Tabla "proyectos" verificada/creada correctamente en la BD.');
            }
        });
    }
});

// --- 4. RUTAS ---

// Inicio
app.get('/', (req, res) => {
    db.query('SELECT * FROM promociones ORDER BY fecha_creacion DESC', (err, banners) => {
        if (err) banners = [];
        
        db.query('SELECT * FROM novedades ORDER BY id DESC', (err, novedades) => {
            if (err) novedades = [];
            res.render('index', { banners, novedades });
        });
    });
});

app.get('/cotizar', (req, res) => res.render('cotizar'));

// Ruta pública de Proyectos
app.get('/proyectos', (req, res) => {
    db.query('SELECT * FROM proyectos ORDER BY id DESC', (err, proyectos) => {
        const listaProyectos = err ? [] : proyectos;
        res.render('proyectos', { proyectos: listaProyectos });
    });
});

// Ruta del Carrito
app.get('/carrito', (req, res) => {
    res.render('carrito');
});

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

// Panel de Admin
app.get('/admin', (req, res) => {
    db.query('SELECT * FROM productos', (err, productos) => {
        if (err) return res.send("Error al cargar productos");
        
        db.query('SELECT * FROM promociones', (err, promociones) => {
            if (err) return res.send("Error al cargar promociones");
            
            db.query('SELECT * FROM pedidos ORDER BY id DESC', (err, pedidos) => {
                const listaPedidos = err ? [] : pedidos;
                
                db.query('SELECT * FROM novedades ORDER BY id DESC', (err, novedades) => {
                    const listaNovedades = err ? [] : novedades;
                    
                    db.query('SELECT * FROM proyectos ORDER BY id DESC', (err, proyectos) => {
                        const listaProyectos = err ? [] : proyectos;
                        
                        res.render('admin', { 
                            productos: productos, 
                            promociones: promociones, 
                            pedidos: listaPedidos,
                            novedades: listaNovedades,
                            proyectos: listaProyectos
                        });
                    });
                });
            });
        });
    });
});

// --- SECCIÓN DE PRODUCTOS ---

app.post('/admin/subir', upload.fields([{ name: 'imagen1' }, { name: 'imagen2' }]), (req, res) => {
    if (!req.body) return res.status(400).send("No se recibieron datos.");
    const { marca, titulo, subtitulo, modelo, caracteristicas, precio, stock } = req.body;
    const img1 = req.files['imagen1'] ? req.files['imagen1'][0].path : null;
    const img2 = req.files['imagen2'] ? req.files['imagen2'][0].path : null;

    const query = `INSERT INTO productos 
                    (marca, titulo, subtitulo, modelo, caracteristicas, precio, stock, imagen1, imagen2) 
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    
    db.query(query, [marca, titulo, subtitulo, modelo, caracteristicas, precio, stock, img1, img2], (err, result) => {
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
    const { marca, titulo, subtitulo, modelo, caracteristicas, precio, stock } = req.body;
    
    const img1 = req.files['imagen1'] ? req.files['imagen1'][0].path : req.body.old_img1;
    const img2 = req.files['imagen2'] ? req.files['imagen2'][0].path : req.body.old_img2;

    const query = `UPDATE productos SET 
                    marca=?, titulo=?, subtitulo=?, modelo=?, caracteristicas=?, precio=?, stock=?, imagen1=?, imagen2=? 
                    WHERE id=?`;
    
    db.query(query, [marca, titulo, subtitulo, modelo, caracteristicas, precio, stock, img1, img2, id], (err, result) => {
        if (err) return res.status(500).send("Error al actualizar");
        res.redirect('/admin');
    });
});

// --- SECCIÓN: PEDIDOS TIENDA EN LÍNEA ---

app.post('/api/pedidos/nuevo', (req, res) => {
    const { nombre, telefono, productos, total } = req.body;

    if (!nombre || !telefono || !productos) {
        return res.status(400).json({ success: false, message: "Faltan datos requeridos." });
    }

    const productosString = typeof productos === 'string' ? productos : JSON.stringify(productos);
    const query = `INSERT INTO pedidos (cliente_nombre, cliente_telefono, resumen_productos, total, estado) VALUES (?, ?, ?, ?, 'pendiente')`;

    db.query(query, [nombre, telefono, productosString, total || 0], (err, result) => {
        if (err) {
            console.error('❌ Error al insertar pedido:', err.message);
            return res.status(500).json({ success: false, message: "Error interno en el servidor." });
        }
        res.json({ success: true, message: "Pedido registrado con éxito.", pedidoId: result.insertId });
    });
});

app.get('/admin/eliminar-pedido/:id', (req, res) => {
    const { id } = req.params;
    db.query('DELETE FROM pedidos WHERE id = ?', [id], (err, result) => {
        if (err) return res.status(500).send("Error al eliminar el pedido");
        res.redirect('/admin');
    });
});

app.get('/admin/pedido-estado/:id', (req, res) => {
    const { id } = req.params;
    
    db.query('SELECT estado FROM pedidos WHERE id = ?', [id], (err, rows) => {
        if (err || rows.length === 0) return res.status(404).send("Pedido no encontrado");
        
        let nuevoEstado = 'pendiente';
        if (rows[0].estado === 'pendiente') nuevoEstado = 'proceso';
        else if (rows[0].estado === 'proceso') nuevoEstado = 'completado';
        
        db.query('UPDATE pedidos SET estado = ? WHERE id = ?', [nuevoEstado, id], (err, result) => {
            if (err) return res.status(500).send("Error al actualizar estado");
            res.redirect('/admin');
        });
    });
});

// --- SECCIÓN DE PROMOCIONES ---

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

app.get('/admin/eliminar-promocion/:id', (req, res) => {
    const { id } = req.params;
    db.query('DELETE FROM promociones WHERE id = ?', [id], (err, result) => {
        if (err) return res.status(500).send("Error al eliminar promoción");
        res.redirect('/admin');
    });
});

// --- SECCIÓN DE NOVEDADES ---

app.post('/admin/novedad', upload.single('imagen_novedad'), (req, res) => {
    const { tag_type, tag_text, titulo, descripcion, link } = req.body;
    const imagen_url = req.file ? req.file.path : null;

    if (!imagen_url) return res.status(400).send("Debe subir una imagen para la novedad.");

    const textoEtiqueta = tag_type === 'Live' ? 'Live' : tag_text;

    const query = 'INSERT INTO novedades (tag_type, tag_text, titulo, descripcion, link, imagen_url) VALUES (?, ?, ?, ?, ?, ?)';
    db.query(query, [tag_type, textoEtiqueta, titulo, descripcion, link, imagen_url], (err, result) => {
        if (err) {
            console.error('❌ Error al guardar novedad:', err.message);
            return res.status(500).send("Error al guardar novedad en la base de datos.");
        }
        res.redirect('/admin');
    });
});

app.get('/admin/eliminar-novedad/:id', (req, res) => {
    const { id } = req.params;
    db.query('DELETE FROM novedades WHERE id = ?', [id], (err, result) => {
        if (err) return res.status(500).send("Error al eliminar la novedad.");
        res.redirect('/admin');
    });
});

// =============================================
// --- SECCIÓN DE PROYECTOS ---
// =============================================

// Subir un proyecto (Permite hasta 4 fotos)
app.post('/admin/proyecto', upload.array('imagenes_proyecto', 4), (req, res) => {
    const { badge, titulo, descripcion, ubicacion, tag1, tag2 } = req.body;

    // Extraer las rutas de los archivos recibidos en req.files
    const imagenes = req.files ? req.files.map(file => file.path) : [];
    const img1 = imagenes[0] || null;
    const img2 = imagenes[1] || null;
    const img3 = imagenes[2] || null;
    const img4 = imagenes[3] || null;

    const query = `
        INSERT INTO proyectos (badge, titulo, descripcion, ubicacion, tag1, tag2, imagen_url, imagen_url2, imagen_url3, imagen_url4) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    db.query(query, [badge, titulo, descripcion, ubicacion, tag1, tag2, img1, img2, img3, img4], (err, result) => {
        if (err) {
            console.error("Error en MySQL:", err);
            return res.send("Error al guardar el proyecto en la base de datos.");
        }
        res.redirect('/admin');
    });
});

// Eliminar un proyecto
app.get('/admin/eliminar-proyecto/:id', (req, res) => {
    const { id } = req.params;
    db.query('DELETE FROM proyectos WHERE id = ?', [id], (err, result) => {
        if (err) {
            console.error("Error al eliminar el proyecto:", err);
            return res.status(500).send("Error al eliminar el proyecto.");
        }
        res.redirect('/admin');
    });
});

// --- 5. PUERTO DINÁMICO PARA RENDER ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Servidor activo en el puerto ${PORT}`);
});