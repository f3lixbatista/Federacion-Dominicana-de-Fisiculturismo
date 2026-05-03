const express = require('express');
const path = require('path');
require('dotenv').config();
// supabaseClient.js

console.log("URL de Supabase:", process.env.SUPABASE_URL); // Añade esta línea para ver qué imprime


const app = express();
const port = process.env.PORT || 3000;

// Configuración de Vistas y Estáticos
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));

// Middlewares para leer datos de formularios y JSON
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// --- RUTAS WEB ---
// Nota: Deberás actualizar los archivos dentro de ./router para que usen Supabase en lugar de Mongoose
app.use('/', require('./router/rutasBat'));
app.use('/categorias', require('./router/Categoria'));
app.use('/atletas', require('./router/Atletas'));
app.use('/inscripcion', require('./router/Inscripcion'));
app.use('/estadisticas', require('./router/Estadisticas'));

// Middleware para manejar error 404
app.use((req, res, next) => {
    res.status(404).render("404", {
        titulo: "404",
        descripcion: "No existe este sitio Web"
    });
});

// Encendido del servidor
app.listen(port, () => {
    console.log(`🚀 Servidor listo en: http://localhost:${port}`);
});
